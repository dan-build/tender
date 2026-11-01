import { glyphsOf } from '../src/Glyphs';
import { numberLocale } from '../src/locale';

const en = numberLocale('en-US');
const keys = (shown: string, anchor: 'left' | 'place') => glyphsOf(shown, en, anchor).map((g) => g.key);

describe('glyph keys', () => {
  it('keeps a comma the same comma as the number grows, so it slides', () => {
    expect(keys('1,234', 'left')).toContain('g3');
    expect(keys('12,345', 'left')).toContain('g3');
    expect(keys('1,234,567', 'left')).toEqual(['i0', 'g6', 'i1', 'i2', 'i3', 'g3', 'i4', 'i5', 'i6']);
  });

  it('keys typed digits from the left, so earlier digits hold while new ones arrive', () => {
    expect(keys('99', 'left')).toEqual(['i0', 'i1']);
    expect(keys('999', 'left')).toEqual(['i0', 'i1', 'i2']);
  });

  it('keys displayed digits by place, so the units roll and the thousands hold', () => {
    expect(keys('2,500.00', 'place')).toEqual(['p3', 'g3', 'p2', 'p1', 'p0', 'dec', 'f0', 'f1']);
    expect(keys('-5', 'place')).toEqual(['sign', 'p0']);
  });

  it('follows the locale’s separators', () => {
    const de = numberLocale('de-DE');
    expect(glyphsOf('1.234,5', de, 'left').map((g) => g.key)).toEqual(['i0', 'g3', 'i1', 'i2', 'i3', 'dec', 'f0']);
  });
});
