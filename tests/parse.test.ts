import { parseAmount } from '../src/parse';

const ok = (value: string) => ({ ok: true, value });

describe('parseAmount', () => {
  it.each([
    ['$1,234.50', 'en-US', 'USD', '1234.50'],
    ['1.234,50 €', 'de-DE', 'EUR', '1234.50'],
    ['1,234.50', 'de-DE', 'EUR', '1234.50'],
    ['1.234,50', 'en-US', 'USD', '1234.50'],
    ['1 234,5', 'fr-FR', 'EUR', '1234.5'],
    ["1'234.50", 'de-CH', 'CHF', '1234.50'],
    ['1’234.50', 'de-CH', 'CHF', '1234.50'],
    ['12,34,567.89', 'en-IN', 'INR', '1234567.89'],
    ['USD 40', 'en-US', 'USD', '40'],
    ['US$ 40.00', 'en-US', 'USD', '40.00'],
    ['R$ 1.000,00', 'pt-BR', 'BRL', '1000.00'],
    ['¥12,000', 'ja-JP', 'JPY', '12000'],
    ['2.5k', 'en-US', 'USD', '2500'],
    ['1.25M', 'en-US', 'USD', '1250000'],
    ['$3b', 'en-US', 'USD', '3000000000'],
    ['.5', 'en-US', 'USD', '0.5'],
    ['0,250', 'en-US', 'KWD', '0.250'],
    ['12.', 'en-US', 'USD', '12'],
    ['1.500', 'de-DE', 'EUR', '1500'],
    ['1,500', 'en-US', 'USD', '1500'],
    ['١٢٣٫٤٥', 'ar-EG', 'EGP', '123.45'],
    ['１２３', 'ja-JP', 'JPY', '123'],
    ['  0042.10  ', 'en-US', 'USD', '42.10'],
    ['1.50000', 'en-US', 'USD', '1.50'],
  ])('%s in %s', (text, locale, currency, value) => {
    expect(parseAmount(text, { locale, currency })).toEqual(ok(value));
  });

  it('asks instead of guessing when a separator reads two ways', () => {
    expect(parseAmount('1.234', { locale: 'en-US', currency: 'USD' })).toEqual({
      ok: false,
      issue: 'ambiguous',
      candidates: ['1234'],
    });
    expect(parseAmount('1,234', { locale: 'de-DE', currency: 'EUR' })).toMatchObject({
      issue: 'ambiguous',
      candidates: ['1234'],
    });
    // With 3 decimals both readings fit, so both are offered.
    expect(parseAmount('1.234', { locale: 'fr-FR', decimals: 3 })).toMatchObject({
      issue: 'ambiguous',
      candidates: ['1234', '1.234'],
    });
  });

  it('reads the locale’s own convention without asking', () => {
    expect(parseAmount('1,234', { locale: 'en-US', currency: 'USD' })).toEqual(ok('1234'));
    expect(parseAmount('1.234', { locale: 'en-US', decimals: 18 })).toEqual(ok('1.234'));
  });

  it('never rounds', () => {
    expect(parseAmount('1.0051', { locale: 'en-US', currency: 'USD' })).toMatchObject({ issue: 'too-precise' });
    // Three places in a two-place currency could also be a European 1,005.
    expect(parseAmount('1.005', { locale: 'en-US', currency: 'USD' })).toMatchObject({
      issue: 'ambiguous',
      candidates: ['1005'],
    });
    expect(parseAmount('12.5', { locale: 'ja-JP', currency: 'JPY' })).toMatchObject({ issue: 'too-precise' });
    expect(parseAmount('0.000000000000000001', { decimals: 18 })).toEqual(ok('0.000000000000000001'));
  });

  it('rejects what isn’t one amount', () => {
    for (const text of ['abc', '1,2,3', '12$34', '1.2.3', '1,234.5.6', '12345,678,9']) {
      expect(parseAmount(text, { locale: 'en-US' })).toMatchObject({ ok: false });
    }
    expect(parseAmount('   ')).toMatchObject({ issue: 'empty' });
  });

  it('handles negatives only when allowed', () => {
    expect(parseAmount('-$5.00', { locale: 'en-US' })).toMatchObject({ issue: 'negative' });
    expect(parseAmount('($5.00)', { locale: 'en-US', allowNegative: true })).toEqual(ok('-5.00'));
    expect(parseAmount('−5', { allowNegative: true })).toEqual(ok('-5'));
  });

  it('keeps every digit of a huge amount', () => {
    expect(parseAmount('$98,765,432,109,876,543.21', { locale: 'en-US' })).toEqual(ok('98765432109876543.21'));
  });
});
