import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { useIsomorphicLayoutEffect } from './layout-effect';
import { compareAmounts, toMinor } from './math';
import { applyInput, displayOf, editOf, valueOf } from './edit';
import { Glyphs, glyphsOf } from './Glyphs';
import { currencyAffixes, currencyDecimals, numberLocale } from './locale';
import type { ParseIssue } from './parse';

// A real <input> sits on top of the drawn number with its text made
// invisible, so typing, selection, the caret, autofill, IME and screen
// readers all behave natively. The visible digits underneath are drawn by
// <Glyphs>, in the same font with tabular figures, so every character sits
// exactly where the input's own would. Kerning is off on both layers for the
// same reason: separate spans can't kern against each other, so the input
// mustn't either. With tabular figures there is almost nothing to kern.

export interface MoneyChange {
  /** The amount in minor units: "12.5" at 2 decimals is 1250n. */
  minor: bigint | null;
  decimals: number;
  /** Above `max`. The amount is kept; showing it is up to you. */
  over: boolean;
}

export interface MoneyIssue {
  issue: ParseIssue;
  /** For "ambiguous": every reading of the paste that would fit. */
  candidates: string[];
}

type NativeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue' | 'onChange' | 'type' | 'prefix' | 'placeholder' | 'max' | 'className' | 'style'
>;

export interface MoneyInputProps extends NativeInputProps {
  /** A decimal string ("1234.5") or null for empty. Pass it to control the input. A trailing point ("12.") shows as typed. */
  value?: string | null;
  defaultValue?: string | null;
  /** Fires when the value string changes ("12" to "12.5", and "12.5" to "12.50"); not for "12" to "12.". */
  onChange?: (value: string | null, change: MoneyChange) => void;
  /** Called when an edit was refused, and with null once one lands. */
  onIssue?: (issue: MoneyIssue | null) => void;
  /** ISO 4217 code. Sets the symbol and the decimal places. */
  currency?: string;
  /** BCP 47 locale for separators and symbol placement. Defaults to the runtime's. */
  locale?: string;
  /** Decimal places allowed. Defaults to the currency's, or 2. Use 18 for ETH, 6 for USDC. */
  decimals?: number;
  /** Replaces the currency symbol before the number. null shows nothing. */
  prefix?: ReactNode;
  /** Replaces the currency symbol after the number. null shows nothing. */
  suffix?: ReactNode;
  /** Upper bound, such as the available balance, as a decimal string. */
  max?: string;
  /** Shown dimmed while empty, as an amount. Defaults to "0". */
  placeholder?: string;
  /** Roll digits and slide separators. Under prefers-reduced-motion, characters only fade. */
  animate?: boolean;
  /**
   * "center" centers the digits alone and hangs the symbol outside them, so a
   * big amount sits on the axis by its figures, not by "$" plus figures.
   */
  align?: 'start' | 'center';
  className?: string;
  style?: CSSProperties;
}

const FIELD: CSSProperties = {
  position: 'relative',
  display: 'inline-block',
  // Room for the caret at the end, so the input never scrolls its text
  // away from the glyphs under it.
  paddingInlineEnd: 2,
  fontKerning: 'none',
  fontVariantNumeric: 'tabular-nums',
};

const INPUT: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  margin: 0,
  padding: 0,
  border: 0,
  outline: 'none',
  background: 'transparent',
  font: 'inherit',
  letterSpacing: 'inherit',
  WebkitTextFillColor: 'transparent',
  // color stays as inherited so the caret keeps the text colour.
};

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  {
    value,
    defaultValue,
    onChange,
    onIssue,
    currency,
    locale,
    decimals: decimalsProp,
    prefix,
    suffix,
    max,
    placeholder = '0',
    animate = true,
    align = 'start',
    className,
    style,
    name,
    'aria-label': ariaLabel = 'Amount',
    ...rest
  },
  ref,
) {
  const nl = numberLocale(locale);
  const decimals = decimalsProp ?? (currency ? currencyDecimals(currency) : 2);
  const affixes = useMemo(
    () => (currency ? currencyAffixes(currency, locale) : { prefix: '', suffix: '' }),
    [currency, locale],
  );

  const [state, setState] = useState(() => ({ edit: editOf(value ?? defaultValue), caret: null as number | null }));
  const [issue, setIssue] = useState<MoneyIssue | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => input.current as HTMLInputElement);

  // Controlled: follow the prop unless it's the amount already being typed
  // ("12." and "12.50" stay as typed while the parent holds "12" and "12.5").
  const current = valueOf(state.edit);
  const incoming = value == null ? value : valueOf(editOf(value));
  const follows =
    incoming === undefined ||
    (incoming === null ? current === null : current !== null && compareAmounts(current, incoming) === 0);
  const edit = follows ? state.edit : editOf(value);

  const shown = displayOf(edit, nl);
  const amount = valueOf(edit);
  const over = amount !== null && max !== undefined && compareAmounts(amount, max) > 0;

  useIsomorphicLayoutEffect(() => {
    const el = input.current;
    if (!el || state.caret === null || el.ownerDocument.activeElement !== el) return;
    el.setSelectionRange(state.caret, state.caret);
    el.scrollLeft = 0;
  }, [state]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const el = event.currentTarget;
    const inputType = (event.nativeEvent as InputEvent).inputType ?? '';
    const result = applyInput(edit, el.value, el.selectionEnd, inputType, { locale: nl, decimals });
    setState({ edit: result.edit, caret: result.caret });

    const nextIssue = result.issue ? { issue: result.issue, candidates: result.candidates } : null;
    if (nextIssue || issue) {
      setIssue(nextIssue);
      onIssue?.(nextIssue);
    }

    const next = valueOf(result.edit);
    // "12.5" to "12.50" reports too: same amount, but what the field shows changed.
    if (next !== amount) {
      onChange?.(next, {
        minor: next === null ? null : toMinor(next, decimals),
        decimals,
        over: next !== null && max !== undefined && compareAmounts(next, max) > 0,
      });
    }
  };

  const before = prefix === undefined ? affixes.prefix : prefix;
  const after = suffix === undefined ? affixes.suffix : suffix;
  const empty = shown === '';
  const glyphs = glyphsOf(empty ? displayOf(editOf(placeholder), nl) : shown, nl, 'left');
  const centered = align === 'center';
  const affix = (part: 'prefix' | 'suffix', content: ReactNode) =>
    content ? (
      <span
        data-part={part}
        style={centered ? { position: 'absolute', top: 0, [part === 'prefix' ? 'right' : 'left']: '100%' } : undefined}
      >
        {content}
      </span>
    ) : null;

  return (
    <label
      className={className}
      data-tender=""
      data-empty={empty ? '' : undefined}
      data-over={over ? '' : undefined}
      data-issue={issue?.issue}
      style={{
        display: centered ? 'flex' : 'inline-flex',
        justifyContent: centered ? 'center' : undefined,
        alignItems: 'baseline',
        cursor: 'text',
        whiteSpace: 'pre',
        unicodeBidi: 'isolate',
        ...style,
      }}
    >
      {centered ? null : affix('prefix', before)}
      <span data-part="field" style={FIELD}>
        {centered ? affix('prefix', before) : null}
        <Glyphs glyphs={glyphs} animate={animate} dim={empty} />
        <input
          {...rest}
          ref={input}
          type="text"
          inputMode={decimals > 0 ? 'decimal' : 'numeric'}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label={ariaLabel}
          aria-invalid={over || issue !== null || undefined}
          value={shown}
          onChange={handleChange}
          style={INPUT}
        />
        {centered ? affix('suffix', after) : null}
      </span>
      {centered ? null : affix('suffix', after)}
      {name ? <input type="hidden" name={name} value={amount ?? ''} /> : null}
    </label>
  );
});
