import type { CSSProperties, ReactNode } from 'react';
import { formatAmount, formatDigits } from './format';
import { Glyphs, glyphsOf } from './Glyphs';
import { currencyAffixes, currencyDecimals, numberLocale } from './locale';

// A formatted amount for reading, not typing: a balance, a total, the figure
// on a confirm screen. When the value changes, only the digits that changed
// roll, keyed by place value so the units digit rolls and the thousands hold.

export interface AmountProps {
  /** A decimal string, such as "1234.5". */
  value: string;
  currency?: string;
  locale?: string;
  /** Pads the fraction to this many places. Defaults to the currency's. */
  decimals?: number;
  prefix?: ReactNode;
  suffix?: ReactNode;
  animate?: boolean;
  className?: string;
  style?: CSSProperties;
}

const HIDDEN: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
};

export function Amount({
  value,
  currency,
  locale,
  decimals,
  prefix,
  suffix,
  animate = true,
  className,
  style,
}: AmountProps) {
  const nl = numberLocale(locale);
  const pad = decimals ?? (currency ? currencyDecimals(currency) : undefined);
  const affixes = currency ? currencyAffixes(currency, locale) : { prefix: '', suffix: '' };
  const before = prefix === undefined ? affixes.prefix : prefix;
  const after = suffix === undefined ? affixes.suffix : suffix;

  return (
    <span
      className={className}
      data-tender-amount=""
      style={{
        position: 'relative',
        whiteSpace: 'pre',
        unicodeBidi: 'isolate',
        fontKerning: 'none',
        fontVariantNumeric: 'tabular-nums',
        ...style,
      }}
    >
      <span style={HIDDEN}>{formatAmount(value, { locale, currency, decimals })}</span>
      <span aria-hidden>
        {before ? <span data-part="prefix">{before}</span> : null}
        <Glyphs glyphs={glyphsOf(formatDigits(value, nl, pad), nl, 'place')} animate={animate} motion="display" stagger={40} />
        {after ? <span data-part="suffix">{after}</span> : null}
      </span>
    </span>
  );
}
