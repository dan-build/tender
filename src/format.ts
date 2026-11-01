import { isAmount } from './math';
import { currencyAffixes, currencyDecimals, numberLocale, type NumberLocale } from './locale';

// Formatting is done by hand from the locale's separators rather than by
// Intl.NumberFormat.format, which goes through a float for number input and
// loses digits past 2^53 or 15 significant places.

export function groupDigits(int: string, nl: NumberLocale): string {
  if (int.length < nl.minGrouped) return int;
  let out = int.slice(-nl.primary);
  let rest = int.slice(0, -nl.primary);
  while (rest.length > 0) {
    out = `${rest.slice(-nl.secondary)}${nl.group}${out}`;
    rest = rest.slice(0, -nl.secondary);
  }
  return out;
}

/** The number alone, in the locale's separators. `pad` fills the fraction to that many places. */
export function formatDigits(value: string, nl: NumberLocale, pad?: number): string {
  if (!isAmount(value)) throw new RangeError(`Not an amount: "${value}"`);
  const negative = value.startsWith('-');
  const [int, frac = ''] = value.replace('-', '').split('.');
  const fraction = pad === undefined ? frac : frac.padEnd(pad, '0');
  const body = groupDigits(int, nl) + (fraction ? nl.decimal + fraction : '');
  return negative ? `-${body}` : body;
}

export interface FormatOptions {
  locale?: string;
  /** ISO 4217 code. Adds its symbol and pads to its decimal places. */
  currency?: string;
  /** Pads the fraction to this many places. Defaults to the currency's. */
  decimals?: number;
}

/** "1234.5" is "$1,234.50" in en-US with USD, "1.234,50 €" in de-DE with EUR. */
export function formatAmount(value: string, options: FormatOptions = {}): string {
  const nl = numberLocale(options.locale);
  const pad = options.decimals ?? (options.currency ? currencyDecimals(options.currency) : undefined);
  const digits = formatDigits(value, nl, pad);
  if (!options.currency) return digits;
  const { prefix, suffix } = currencyAffixes(options.currency, options.locale);
  const negative = digits.startsWith('-');
  return `${negative ? '-' : ''}${prefix}${negative ? digits.slice(1) : digits}${suffix}`;
}
