import { normalizeAmount } from './math';
import { currencyDecimals, numberLocale, type NumberLocale } from './locale';

// Turns whatever someone pasted ("$1,234.50", "1.234,50 €", "2.5k", "USD 40")
// into an amount, or says why it can't. When a paste reads two ways, like
// "1.234" (one thousand, or one point two three four), it reports both
// readings instead of picking one.

export type ParseIssue = 'empty' | 'invalid' | 'negative' | 'too-precise' | 'ambiguous';

export type ParseResult =
  | { ok: true; value: string }
  | { ok: false; issue: ParseIssue; candidates: string[] };

export interface ParseOptions {
  /** BCP 47 locale the text was most likely written in. Defaults to the runtime's. */
  locale?: string;
  /** ISO 4217 code, used for its decimal places when `decimals` isn't given. */
  currency?: string;
  /** Most decimal places allowed. Defaults to the currency's, or 2. */
  decimals?: number;
  allowNegative?: boolean;
}

export function parseAmount(text: string, options: ParseOptions = {}): ParseResult {
  const decimals = options.decimals ?? (options.currency ? currencyDecimals(options.currency) : 2);
  return parseWith(text, numberLocale(options.locale), decimals, options.allowNegative ?? false);
}

// Spaces of every width, apostrophes and underscores only ever group digits.
const SPACER = /[\s\u00a0\u202f\u2009'\u2019_]/g;
const MULTIPLIERS: Record<string, number> = { k: 3, m: 6, b: 9 };

/** Arabic-Indic, Persian, Devanagari and full-width digits become 0-9. */
export function normalizeDigits(text: string): string {
  return text
    .replace(/[\u0660-\u0669\u06f0-\u06f9\u0966-\u096f\uff10-\uff19]/g, (c) => {
      const code = c.charCodeAt(0);
      const zero = code >= 0xff10 ? 0xff10 : code >= 0x0966 ? 0x0966 : code >= 0x06f0 ? 0x06f0 : 0x0660;
      return String(code - zero);
    })
    .replace(/\u066b/g, '.')
    .replace(/\u066c/g, ',');
}

function fail(issue: ParseIssue, candidates: string[] = []): ParseResult {
  return { ok: false, issue, candidates };
}

export function parseWith(
  input: string,
  nl: NumberLocale,
  decimals: number,
  allowNegative: boolean,
): ParseResult {
  let text = normalizeDigits(input).trim();
  if (text === '') return fail('empty');
  if (!/\d/.test(text)) return fail('invalid');

  let negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }

  // The number runs from its first digit (or a separator right before one, as
  // in ".5") to its last digit. Around it: currency symbols, codes, a sign.
  const start = text.search(/[.,]?\d/);
  let end = text.length;
  while (!/\d/.test(text[end - 1])) end--;
  const lead = text.slice(0, start);
  const core = text.slice(start, end);
  let trail = text.slice(end);

  if (/[-\u2212]/.test(lead) || /^\s*[-\u2212]/.test(trail)) negative = true;
  let shift = 0;
  const multiplier = /^\s*([kmb])(?![a-z])/i.exec(trail);
  if (multiplier) {
    shift = MULTIPLIERS[multiplier[1].toLowerCase()];
    trail = trail.slice(multiplier[0].length);
  }
  if (/[^\d.,\s\u00a0\u202f\u2009'\u2019_]/.test(core)) return fail('invalid');

  const marks = core.replace(SPACER, ' ');
  const dots = marks.split('.').length - 1;
  const commas = marks.split(',').length - 1;

  const read = (decimal: '.' | ',' | null): ParseResult => {
    const at = decimal ? marks.lastIndexOf(decimal) : -1;
    const intPart = at < 0 ? marks : marks.slice(0, at);
    const fracPart = at < 0 ? '' : marks.slice(at + 1);
    if (/\D/.test(fracPart)) return fail('invalid');
    const groups = intPart.split(/[ .,]/);
    if (groups.length > 1 && !validGroups(groups)) return fail('invalid');
    return finish(groups.join(''), fracPart, shift, decimals, negative, allowNegative);
  };

  if (dots > 0 && commas > 0) {
    const decimal = marks.lastIndexOf('.') > marks.lastIndexOf(',') ? '.' : ',';
    if ((decimal === '.' ? dots : commas) > 1) return fail('invalid');
    return read(decimal);
  }
  if (dots + commas !== 1) return read(null);

  // One separator. "12.5" and "1,5" can only be decimals, "1,234" could be either.
  const sep = dots ? '.' : ',';
  const at = marks.indexOf(sep);
  const head = marks.slice(0, at).replace(/ /g, '');
  const tail = marks.slice(at + 1);
  const grouped = marks.includes(' ');
  if (tail.length !== 3 || grouped || head.length > 3 || /^0*$/.test(head)) return read(sep);
  if (sep === nl.group) return read(null);
  if (sep === nl.decimal && decimals >= 3) return read(sep);

  const candidates = [read(null), read(sep)]
    .filter((r): r is { ok: true; value: string } => r.ok)
    .map((r) => r.value);
  return fail('ambiguous', candidates);
}

// "1,234,567" and "12,34,567" group; "1,23,4" and "12345,678" don't.
function validGroups(groups: string[]): boolean {
  const [first, ...rest] = groups;
  if (first.length < 1 || first.length > 3) return false;
  return rest.every((g, i) => (i === rest.length - 1 ? g.length === 3 : g.length === 2 || g.length === 3));
}

function finish(
  int: string,
  frac: string,
  shift: number,
  decimals: number,
  negative: boolean,
  allowNegative: boolean,
): ParseResult {
  if (shift > 0) {
    const digits = int + frac.padEnd(shift, '0');
    const point = int.length + shift;
    int = digits.slice(0, point);
    frac = digits.slice(point);
  }
  while (frac.length > decimals && frac.endsWith('0')) frac = frac.slice(0, -1);
  if (frac.length > decimals) return fail('too-precise');

  const value = normalizeAmount(`${negative ? '-' : ''}${int || '0'}${frac ? `.${frac}` : ''}`);
  if (value.startsWith('-') && !allowNegative) return fail('negative');
  return { ok: true, value };
}
