// Everything locale-specific comes from Intl, read once per locale and cached.
// Digits are always Latin (0-9): the input is for typing, and every keyboard
// has those.

export interface NumberLocale {
  /** The decimal separator: "." or ",". */
  decimal: string;
  /** The grouping separator: ",", ".", a space, or an apostrophe. */
  group: string;
  /** Size of the rightmost group: 3 almost everywhere. */
  primary: number;
  /** Size of the groups to its left: 3, or 2 in Indian grouping (12,34,567). */
  secondary: number;
  /** Fewest integer digits that get grouped: 4 in most locales, 5 in some (es, pl). */
  minGrouped: number;
}

const locales = new Map<string, NumberLocale>();

export function numberLocale(locale?: string): NumberLocale {
  const key = locale ?? '';
  const cached = locales.get(key);
  if (cached) return cached;

  const fmt = new Intl.NumberFormat(locale, { numberingSystem: 'latn' });
  const parts = fmt.formatToParts(123456789.5);
  const sizes = parts.filter((p) => p.type === 'integer').map((p) => p.value.length);
  const primary = sizes.length > 1 ? sizes[sizes.length - 1] : 3;
  const secondary = sizes.length > 2 ? sizes[sizes.length - 2] : primary;
  const groupsFour = fmt.formatToParts(1234).some((p) => p.type === 'group');

  const result: NumberLocale = {
    decimal: parts.find((p) => p.type === 'decimal')?.value ?? '.',
    group: parts.find((p) => p.type === 'group')?.value ?? ',',
    primary,
    secondary,
    minGrouped: groupsFour ? primary + 1 : primary + 2,
  };
  locales.set(key, result);
  return result;
}

const decimalsCache = new Map<string, number>();

/** Minor-unit digits for an ISO 4217 code: 2 for USD, 0 for JPY, 3 for KWD. */
export function currencyDecimals(currency: string): number {
  const cached = decimalsCache.get(currency);
  if (cached !== undefined) return cached;
  const digits =
    new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
      .maximumFractionDigits ?? 2;
  decimalsCache.set(currency, digits);
  return digits;
}

export interface Affixes {
  prefix: string;
  suffix: string;
}

const affixCache = new Map<string, Affixes>();

/** What sits around the number: "$" before it in en-US, " €" after it in de-DE. */
export function currencyAffixes(currency: string, locale?: string): Affixes {
  const key = `${currency}|${locale ?? ''}`;
  const cached = affixCache.get(key);
  if (cached) return cached;

  const parts = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
  }).formatToParts(1);
  const numeric = (t: string) => t === 'integer' || t === 'decimal' || t === 'fraction' || t === 'group';
  const first = parts.findIndex((p) => numeric(p.type));
  let last = first;
  parts.forEach((p, i) => {
    if (numeric(p.type)) last = i;
  });

  const result = {
    prefix: parts.slice(0, first).map((p) => p.value).join(''),
    suffix: parts.slice(last + 1).map((p) => p.value).join(''),
  };
  affixCache.set(key, result);
  return result;
}
