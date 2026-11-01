import { normalizeAmount } from './math';
import { groupDigits } from './format';
import type { NumberLocale } from './locale';
import { normalizeDigits, parseWith, type ParseIssue } from './parse';

// The editing model behind <MoneyInput>, kept free of React so it can be
// tested keystroke by keystroke.
//
// The field holds an "edit": digits with an optional "." and fraction, exactly
// as typed so far ("", "12", "12.", "12.0"). What's shown is the edit in the
// locale's separators ("1,234.0"). After each input event the browser hands
// back the shown text with the change applied; applyInput works out what
// changed, rebuilds the edit, and says where the caret goes.

export interface EditOptions {
  locale: NumberLocale;
  decimals: number;
}

export interface EditResult {
  edit: string;
  /** Caret position in the shown text. */
  caret: number;
  issue: ParseIssue | null;
  candidates: string[];
}

export function displayOf(edit: string, nl: NumberLocale): string {
  if (edit === '') return '';
  const dot = edit.indexOf('.');
  if (dot < 0) return groupDigits(edit, nl);
  return groupDigits(edit.slice(0, dot), nl) + nl.decimal + edit.slice(dot + 1);
}

/** The amount an edit stands for: "12." is "12", "" is null. */
export function valueOf(edit: string): string | null {
  if (edit === '') return null;
  return edit.endsWith('.') ? edit.slice(0, -1) : edit;
}

/** A trailing point is kept, so a parent can hold "320." mid-typing. */
export function editOf(value: string | null | undefined): string {
  if (!value) return '';
  const point = value.endsWith('.');
  const body = normalizeAmount(point ? value.slice(0, -1) : value).replace('-', '');
  return point ? `${body}.` : body;
}

function commonPrefix(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

function commonSuffix(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[a.length - 1 - i] === b[b.length - 1 - i]) i++;
  return i;
}

// The characters that carry meaning, with the decimal as ".": "1,234.5" is "1234.5".
function significant(shown: string, nl: NumberLocale): string {
  let out = '';
  for (const ch of shown) {
    if (ch >= '0' && ch <= '9') out += ch;
    else if (ch === nl.decimal) out += '.';
  }
  return out;
}

/** Where the caret goes in the shown text, after `count` significant characters. */
function caretAfter(edit: string, count: number, nl: NumberLocale): number {
  const shown = displayOf(edit, nl);
  if (count <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < shown.length; i++) {
    if (shown[i] !== nl.group && ++seen === count) return i + 1;
  }
  return shown.length;
}

export function applyInput(
  prev: string,
  raw: string,
  caret: number | null,
  inputType: string,
  { locale: nl, decimals }: EditOptions,
): EditResult {
  const before = displayOf(prev, nl);

  // The change replaced before[p, before.length - s) with raw[p, raw.length - s).
  // The caret sits at the end of what was inserted, which settles where the
  // change was when the same digit repeats ("1,111" plus a "1").
  let s = commonSuffix(before, raw);
  if (caret !== null) s = Math.min(s, raw.length - caret);
  const p = Math.min(commonPrefix(before, raw), before.length - s, raw.length - s);
  const removed = before.slice(p, before.length - s);
  const inserted = raw.slice(p, raw.length - s);
  let head = before.slice(0, p);
  let tail = before.slice(before.length - s);

  const reject = (issue: ParseIssue | null): EditResult => ({ edit: prev, caret: p, issue, candidates: [] });

  // A paste that replaces the whole field goes through the full parser, so
  // "$1,234.50" and "1.234,50 €" both land, and "1.234" asks.
  const whole = !/\d/.test(head) && !/\d/.test(tail);
  if (whole && (inserted.length > 1 || inputType === 'insertFromPaste' || inputType === 'insertFromDrop')) {
    const parsed = parseWith(inserted, nl, decimals, false);
    if (!parsed.ok) {
      if (parsed.issue === 'empty') return reject(null);
      return { ...reject(parsed.issue), candidates: parsed.candidates };
    }
    const edit = editOf(parsed.value);
    return { edit, caret: displayOf(edit, nl).length, issue: null, candidates: [] };
  }

  // Deleting a group separator deletes the digit beside it instead, since the
  // separator would only come straight back.
  if (inserted === '' && removed !== '' && significant(removed, nl) === '') {
    if (inputType === 'deleteContentForward') {
      const at = tail.search(/\d/);
      if (at >= 0) tail = tail.slice(0, at) + tail.slice(at + 1);
    } else {
      const at = head.search(/\d\D*$/);
      if (at >= 0) head = head.slice(0, at);
    }
  }

  // Typed text keeps its digits. A typed "." or "," is the decimal point in
  // any locale: grouping is never typed, it's drawn.
  let added = '';
  for (const ch of normalizeDigits(inserted)) {
    if (ch >= '0' && ch <= '9') added += ch;
    else if ((ch === '.' || ch === ',' || ch === nl.decimal) && inserted.length === 1) added += '.';
  }
  if (inserted !== '' && added === '') return reject(null);

  const left = significant(head, nl) + added;
  let edit = left + significant(tail, nl);
  let at = left.length;

  const dots = edit.split('.').length - 1;
  if (dots > 1 || (dots === 1 && decimals === 0)) return reject(null);
  if (dots === 1 && edit.length - edit.indexOf('.') - 1 > decimals) return reject('too-precise');

  if (edit.startsWith('.')) {
    edit = `0${edit}`;
    at++;
  }
  while (edit.length > 1 && edit[0] === '0' && edit[1] !== '.') {
    edit = edit.slice(1);
    if (at > 0) at--;
  }

  return { edit, caret: caretAfter(edit, at, nl), issue: null, candidates: [] };
}
