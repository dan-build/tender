import { compareAmounts, fromMinor, normalizeAmount, toMinor } from '../src/math';

describe('toMinor / fromMinor', () => {
  it('converts without floats', () => {
    expect(toMinor('0.1', 2) + toMinor('0.2', 2)).toBe(30n);
    expect(fromMinor(30n, 2)).toBe('0.30');
  });

  it('round-trips past 2^53 and at 18 decimals', () => {
    const big = '90071992547409931234.56';
    expect(fromMinor(toMinor(big, 2), 2)).toBe(big);
    const wei = '1.000000000000000001';
    expect(toMinor(wei, 18)).toBe(1000000000000000001n);
    expect(fromMinor(1000000000000000001n, 18)).toBe(wei);
  });

  it('pads and handles zero decimals and negatives', () => {
    expect(toMinor('12.5', 2)).toBe(1250n);
    expect(toMinor('12', 0)).toBe(12n);
    expect(fromMinor(5n, 2)).toBe('0.05');
    expect(fromMinor(-1250n, 2)).toBe('-12.50');
    expect(toMinor('-0.01', 2)).toBe(-1n);
  });

  it('refuses to round away a digit', () => {
    expect(() => toMinor('1.005', 2)).toThrow(RangeError);
    expect(toMinor('1.500', 2)).toBe(150n);
    expect(() => toMinor('1e5', 2)).toThrow(RangeError);
  });
});

describe('compareAmounts / normalizeAmount', () => {
  it('compares across precisions', () => {
    expect(compareAmounts('12.5', '12.50')).toBe(0);
    expect(compareAmounts('12.49', '12.5')).toBe(-1);
    expect(compareAmounts('100', '99.99')).toBe(1);
    expect(compareAmounts('-1', '0')).toBe(-1);
  });

  it('normalizes', () => {
    expect(normalizeAmount('007.50')).toBe('7.50');
    expect(normalizeAmount('-0.00')).toBe('0.00');
    expect(normalizeAmount('0')).toBe('0');
  });
});
