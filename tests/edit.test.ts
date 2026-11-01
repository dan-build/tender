import { applyInput, displayOf, type EditOptions } from '../src/edit';
import { numberLocale } from '../src/locale';

const usd: EditOptions = { locale: numberLocale('en-US'), decimals: 2 };
const eur: EditOptions = { locale: numberLocale('de-DE'), decimals: 2 };
const jpy: EditOptions = { locale: numberLocale('ja-JP'), decimals: 0 };

// A tiny field: the shown text, a caret, and the edit behind them.
function field(opts: EditOptions, edit = '') {
  let state = { edit, caret: displayOf(edit, opts.locale).length, issue: null as string | null };
  const shown = () => displayOf(state.edit, opts.locale);
  const commit = (raw: string, caret: number, inputType: string) => {
    const r = applyInput(state.edit, raw, caret, inputType, opts);
    state = { edit: r.edit, caret: r.caret, issue: r.issue };
  };
  return {
    type(text: string) {
      for (const ch of text) {
        const s = shown();
        commit(s.slice(0, state.caret) + ch + s.slice(state.caret), state.caret + 1, 'insertText');
      }
      return this;
    },
    backspace() {
      const s = shown();
      commit(s.slice(0, state.caret - 1) + s.slice(state.caret), state.caret - 1, 'deleteContentBackward');
      return this;
    },
    del() {
      const s = shown();
      commit(s.slice(0, state.caret) + s.slice(state.caret + 1), state.caret, 'deleteContentForward');
      return this;
    },
    paste(text: string) {
      const s = shown();
      commit(text, text.length, 'insertFromPaste');
      void s;
      return this;
    },
    at(caret: number) {
      state.caret = caret;
      return this;
    },
    get shown() {
      return shown();
    },
    get state() {
      return state;
    },
  };
}

describe('typing', () => {
  it('groups as you type and keeps the caret at the end', () => {
    const f = field(usd).type('1234567');
    expect(f.shown).toBe('1,234,567');
    expect(f.state.caret).toBe(9);
  });

  it('accepts either "." or "," as the decimal point', () => {
    expect(field(usd).type('1234,5').shown).toBe('1,234.5');
    expect(field(eur).type('1234.5').shown).toBe('1.234,5');
    expect(field(eur).type('1234,56').shown).toBe('1.234,56');
  });

  it('keeps a trailing point and zeros while typing', () => {
    expect(field(usd).type('12.').shown).toBe('12.');
    expect(field(usd).type('12.0').shown).toBe('12.0');
  });

  it('refuses a third decimal, a second point, and letters', () => {
    const f = field(usd).type('1.23');
    f.type('4');
    expect(f.shown).toBe('1.23');
    expect(f.state.issue).toBe('too-precise');
    f.type('.');
    expect(f.shown).toBe('1.23');
    expect(field(usd).type('1a2').shown).toBe('12');
    expect(field(jpy).type('12.5').shown).toBe('125');
  });

  it('drops leading zeros and fills a bare point', () => {
    expect(field(usd).type('0005').shown).toBe('5');
    expect(field(usd).type('.5').shown).toBe('0.5');
    expect(field(usd).type('0.05').shown).toBe('0.05');
  });

  it('inserts in the middle and keeps the caret beside the new digit', () => {
    const f = field(usd, '1234');
    f.at(1).type('9');
    expect(f.shown).toBe('19,234');
    expect(f.state.caret).toBe(2);
  });

  it('finds the right spot among repeated digits', () => {
    const f = field(usd, '1111');
    f.at(2).type('1');
    expect(f.shown).toBe('11,111');
    // Two digits before the caret, so it lands after the second.
    expect(f.state.caret).toBe(2);
  });
});

describe('deleting', () => {
  it('regroups and keeps the caret in place', () => {
    const f = field(usd, '1234567').backspace();
    expect(f.shown).toBe('123,456');
    expect(f.state.caret).toBe(7);
  });

  it('backspace over a comma deletes the digit before it', () => {
    const f = field(usd, '1234').at(2).backspace();
    expect(f.shown).toBe('234');
    expect(f.state.caret).toBe(0);
  });

  it('forward delete over a comma deletes the digit after it', () => {
    const f = field(usd, '1234').at(1).del();
    expect(f.shown).toBe('134');
    expect(f.state.caret).toBe(1);
  });

  it('removing the point joins the halves', () => {
    expect(field(usd, '0.5').at(2).backspace().shown).toBe('5');
  });
});

describe('pasting', () => {
  it('parses a whole-field paste', () => {
    expect(field(usd).paste('$1,234.50').shown).toBe('1,234.50');
    expect(field(eur).paste('1.234,50 €').shown).toBe('1.234,50');
    expect(field(usd).paste('2.5k').shown).toBe('2,500');
  });

  it('reports an ambiguous paste and leaves the field alone', () => {
    const f = field(usd, '9');
    const r = applyInput('9', '1.234', 5, 'insertFromPaste', usd);
    expect(r).toMatchObject({ edit: '9', issue: 'ambiguous', candidates: ['1234'] });
    void f;
  });

  it('keeps only digits from a paste into the middle', () => {
    const r = applyInput('12', '1$3,4002', 7, 'insertFromPaste', usd);
    expect(displayOf(r.edit, usd.locale)).toBe('134,002');
  });
});
