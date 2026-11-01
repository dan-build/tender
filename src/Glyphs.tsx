import { useRef, type CSSProperties } from 'react';
import { useIsomorphicLayoutEffect } from './layout-effect';
import type { NumberLocale } from './locale';

// Draws a formatted number one character per span, keyed so React keeps the
// same span for the same place. After each render it compares where every
// span was and what it held: a span that moved slides from its old spot (a
// comma shifting over as the number grows), one whose digit changed rolls,
// and a new one rises in. Animations use transforms only, so the layout is
// final the moment React commits and the caret of the input above it lines
// up throughout.

export interface Glyph {
  key: string;
  ch: string;
}

/**
 * Keys a shown number for animation. Group separators and the fraction are
 * keyed by place, so a comma with three digits after it stays the same comma
 * as the number grows. Integer digits are keyed from the left when typing
 * (new digits arrive at the end) and by place value when displaying (the
 * units digit rolls, the rest hold still).
 */
export function glyphsOf(shown: string, nl: NumberLocale, anchor: 'left' | 'place'): Glyph[] {
  const out: Glyph[] = [];
  let i = 0;
  if (shown.startsWith('-')) {
    out.push({ key: 'sign', ch: '-' });
    i = 1;
  }
  const dot = shown.indexOf(nl.decimal, i);
  const intEnd = dot < 0 ? shown.length : dot;
  let total = 0;
  for (let j = i; j < intEnd; j++) if (shown[j] !== nl.group) total++;

  let seen = 0;
  for (; i < intEnd; i++) {
    const ch = shown[i];
    if (ch === nl.group) {
      out.push({ key: `g${total - seen}`, ch });
    } else {
      out.push({ key: anchor === 'left' ? `i${seen}` : `p${total - seen - 1}`, ch });
      seen++;
    }
  }
  if (dot >= 0) {
    out.push({ key: 'dec', ch: nl.decimal });
    for (let j = dot + 1; j < shown.length; j++) out.push({ key: `f${j - dot - 1}`, ch: shown[j] });
  }
  return out;
}

// Two profiles, by how often they're seen. Typing is a keystroke: it answers
// at once, mostly in opacity, with a slide short enough never to trail the
// caret. Display (a balance, a total) changes rarely and explains something,
// so it gets a real roll, a soft blur and a stagger.
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
const EASE_IN_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)';

export type GlyphMotion = 'type' | 'display';

const PROFILES = {
  type: { duration: 150, rise: '0.12em', blur: 0, slide: EASE_OUT },
  display: { duration: 320, rise: '0.4em', blur: 2, slide: EASE_IN_OUT },
};

function reducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Where a glyph is drawn right now relative to its layout box, so a slide
// that is interrupted continues from there instead of jumping back.
function currentOffset(el: HTMLElement): number {
  const transform = getComputedStyle(el).transform;
  if (!transform || transform === 'none') return 0;
  const m = /matrix(?:3d)?\(([^)]+)\)/.exec(transform);
  if (!m) return 0;
  const values = m[1].split(',').map(Number);
  return values.length === 16 ? values[12] : values[4];
}

export interface GlyphsProps {
  glyphs: Glyph[];
  animate: boolean;
  motion?: GlyphMotion;
  /** Milliseconds between digits that change together, last digit first. */
  stagger?: number;
  style?: CSSProperties;
  dim?: boolean;
}

export function Glyphs({ glyphs, animate, motion = 'type', stagger = 0, style, dim }: GlyphsProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const last = useRef<Map<string, { x: number; ch: string }> | null>(null);

  useIsomorphicLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const prev = last.current;
    const next = new Map<string, { x: number; ch: string }>();
    const on = animate && prev !== null;
    const reduced = reducedMotion();
    const p = PROFILES[motion];
    const blur = (px: number) => (px ? `blur(${px}px)` : 'none');
    const rolls: { el: HTMLElement; dx: number; up: boolean }[] = [];

    for (const el of Array.from(root.children) as HTMLElement[]) {
      const key = el.dataset.k ?? '';
      const ch = el.textContent ?? '';
      const x = el.offsetLeft;
      next.set(key, { x, ch });
      if (!on || typeof el.animate !== 'function') continue;

      const was = prev.get(key);
      if (was && was.ch === ch && was.x === x) continue;
      const dx = was ? was.x - x + currentOffset(el) : 0;
      el.getAnimations?.().forEach((a) => a.cancel());

      if (reduced) {
        // No movement: a changed or new character only fades up.
        if (!was || was.ch !== ch) el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120, easing: 'ease' });
      } else if (!was) {
        el.animate(
          [
            { transform: `translateY(${p.rise})`, opacity: 0, filter: blur(p.blur) },
            { transform: 'none', opacity: 1, filter: 'none' },
          ],
          { duration: p.duration, easing: EASE_OUT },
        );
      } else if (was.ch !== ch) {
        rolls.push({ el, dx, up: ch > was.ch });
      } else {
        el.animate([{ transform: `translateX(${dx}px)` }, { transform: 'none' }], {
          duration: p.duration,
          easing: p.slide,
        });
      }
    }

    // Changed digits roll like a counter: up when the digit grew, down when
    // it shrank, the last digit first and the rest a beat behind.
    rolls.reverse().forEach(({ el, dx, up }, i) => {
      const dy = up ? p.rise : `-${p.rise}`;
      el.animate(
        [
          { transform: `translate(${dx}px, ${dy})`, opacity: 0, filter: blur(p.blur) },
          { transform: 'none', opacity: 1, filter: 'none' },
        ],
        { duration: p.duration, easing: EASE_OUT, delay: i * stagger, fill: 'backwards' },
      );
    });
    last.current = next;
  });

  return (
    <span
      ref={ref}
      aria-hidden
      data-part="glyphs"
      style={{ whiteSpace: 'pre', opacity: dim ? 0.35 : undefined, transition: 'opacity 150ms ease', ...style }}
    >
      {glyphs.map((g) => (
        <span key={g.key} data-k={g.key} style={{ display: 'inline-block' }}>
          {g.ch}
        </span>
      ))}
    </span>
  );
}
