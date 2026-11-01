// Amounts are decimal strings ("1234.5") or integer minor units (123450n).
// Never a JavaScript number: 0.1 + 0.2 is not 0.3, and nothing above 2^53 is
// exact.

const AMOUNT = /^(-?)(\d+)(?:\.(\d+))?$/;

export function isAmount(value: string): boolean {
  return AMOUNT.test(value);
}

function split(value: string): { negative: boolean; int: string; frac: string } {
  const m = AMOUNT.exec(value);
  if (!m) throw new RangeError(`Not an amount: "${value}"`);
  return { negative: m[1] === '-', int: m[2], frac: m[3] ?? '' };
}

/** "12.5" at 2 decimals is 1250n. Throws rather than round away a non-zero digit. */
export function toMinor(value: string, decimals: number): bigint {
  const { negative, int, frac } = split(value);
  if (/[1-9]/.test(frac.slice(decimals))) {
    throw new RangeError(`"${value}" has more than ${decimals} decimal places`);
  }
  const minor = BigInt(int + frac.slice(0, decimals).padEnd(decimals, '0'));
  return negative ? -minor : minor;
}

/** 1250n at 2 decimals is "12.50". */
export function fromMinor(minor: bigint, decimals: number): string {
  const negative = minor < 0n;
  let digits = (negative ? -minor : minor).toString();
  if (decimals > 0) {
    digits = digits.padStart(decimals + 1, '0');
    digits = `${digits.slice(0, -decimals)}.${digits.slice(-decimals)}`;
  }
  return negative ? `-${digits}` : digits;
}

/** -1, 0 or 1. "12.5" and "12.50" are equal. */
export function compareAmounts(a: string, b: string): -1 | 0 | 1 {
  const places = Math.max(split(a).frac.length, split(b).frac.length);
  const x = toMinor(a, places);
  const y = toMinor(b, places);
  return x < y ? -1 : x > y ? 1 : 0;
}

/** Drops leading zeros and a negative zero: "007.50" is "7.50", "-0" is "0". */
export function normalizeAmount(value: string): string {
  const { negative, int, frac } = split(value);
  const whole = int.replace(/^0+(?=\d)/, '');
  const body = frac ? `${whole}.${frac}` : whole;
  return negative && /[1-9]/.test(body) ? `-${body}` : body;
}
