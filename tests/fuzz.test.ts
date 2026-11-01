import { applyInput, displayOf, valueOf, type EditOptions } from '../src/edit';
import { numberLocale } from '../src/locale';
import { toMinor } from '../src/math';
import { parseWith } from '../src/parse';

// Random editing against the invariants the input promises. Seeded, so a
// failure replays exactly.

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

const PASTES = ['$1,234.50', '1.234,50 €', '2.5k', '1.234', '0.001', 'abc', '  42 ', '١٢٣٫٤', '99999999999999999999.99', '-5', '(3)', '1 234,5', ''];
const CONFIGS: [string, number][] = [['en-US', 2], ['de-DE', 2], ['en-IN', 2], ['ja-JP', 0], ['en-US', 18]];

describe('fuzz: random edits keep every invariant', () => {
  it.each(CONFIGS)('%s with %i decimals', (locale, decimals) => {
    const opts: EditOptions = { locale: numberLocale(locale), decimals };
    const random = rng(locale.length * 7919 + decimals);
    const pick = <T,>(xs: readonly T[]) => xs[Math.floor(random() * xs.length)];
    let edit = '';
    let caret = 0;

    for (let step = 0; step < 4000; step++) {
      const shown = displayOf(edit, opts.locale);
      caret = Math.min(caret, shown.length);
      const op = random();
      let raw: string;
      let end: number;
      let type: string;
      if (op < 0.5) {
        const ch = pick(['0', '1', '5', '9', '.', ',', 'x', ' ']);
        raw = shown.slice(0, caret) + ch + shown.slice(caret);
        end = caret + 1;
        type = 'insertText';
      } else if (op < 0.7 && caret > 0) {
        raw = shown.slice(0, caret - 1) + shown.slice(caret);
        end = caret - 1;
        type = 'deleteContentBackward';
      } else if (op < 0.8 && caret < shown.length) {
        raw = shown.slice(0, caret) + shown.slice(caret + 1);
        end = caret;
        type = 'deleteContentForward';
      } else if (op < 0.9) {
        const text = pick(PASTES);
        raw = text;
        end = text.length;
        type = 'insertFromPaste';
      } else {
        caret = Math.floor(random() * (shown.length + 1));
        continue;
      }

      const r = applyInput(edit, raw, end, type, opts);
      edit = r.edit;
      caret = r.caret;
      const next = displayOf(edit, opts.locale);
      const ctx = `step ${step} ${type} raw=${JSON.stringify(raw)} -> ${JSON.stringify(edit)}`;

      expect(edit, ctx).toMatch(/^(\d+(\.\d*)?)?$/);
      expect(edit, ctx).not.toMatch(/^0\d/);
      const frac = edit.includes('.') ? edit.split('.')[1].length : 0;
      expect(frac, ctx).toBeLessThanOrEqual(decimals);
      expect(caret, ctx).toBeGreaterThanOrEqual(0);
      expect(caret, ctx).toBeLessThanOrEqual(next.length);

      const value = valueOf(edit);
      if (value !== null) {
        // What's shown reads back as exactly the value, in the same locale.
        const back = parseWith(next, opts.locale, decimals, false);
        expect(back, ctx).toEqual({ ok: true, value });
        expect(() => toMinor(value, decimals), ctx).not.toThrow();
      }
    }
  });
});
