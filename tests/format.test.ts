import { formatAmount, groupDigits } from '../src/format';
import { numberLocale } from '../src/locale';

describe('formatting', () => {
  it('groups by locale', () => {
    expect(groupDigits('1234567', numberLocale('en-US'))).toBe('1,234,567');
    expect(groupDigits('1234567', numberLocale('de-DE'))).toBe('1.234.567');
    expect(groupDigits('1234567', numberLocale('en-IN'))).toBe('12,34,567');
    expect(groupDigits('1234', numberLocale('es-ES'))).toBe('1234');
    expect(groupDigits('12345', numberLocale('es-ES'))).toBe('12.345');
    expect(groupDigits('123', numberLocale('en-US'))).toBe('123');
  });

  it('places the symbol and pads to the currency', () => {
    expect(formatAmount('1234.5', { locale: 'en-US', currency: 'USD' })).toBe('$1,234.50');
    expect(formatAmount('1234.5', { locale: 'de-DE', currency: 'EUR' })).toBe('1.234,50 €');
    expect(formatAmount('1234', { locale: 'ja-JP', currency: 'JPY' })).toBe('￥1,234');
    expect(formatAmount('-5', { locale: 'en-US', currency: 'USD' })).toBe('-$5.00');
  });

  it('matches Intl where Intl is exact, and stays exact past it', () => {
    for (const locale of ['en-US', 'de-DE', 'fr-FR', 'en-IN', 'de-CH', 'pt-BR']) {
      const intl = new Intl.NumberFormat(locale, { minimumFractionDigits: 2 }).format(1234567.5);
      expect(formatAmount('1234567.5', { locale, decimals: 2 })).toBe(intl);
    }
    expect(formatAmount('12345678901234567890.12', { locale: 'en-US' })).toBe('12,345,678,901,234,567,890.12');
  });
});
