# Changelog

## 0.1.0

First release.

- `<MoneyInput>`: amounts as decimal strings and integer minor units, grouping by locale as you type, either "." or "," as the decimal point, honest paste parsing (ambiguous pastes are reported, never guessed), `max`, `align="center"` with the symbol hanging outside the digits, and a hidden form value.
- `<Amount>`: a formatted amount whose changed digits roll by place value, last digit first.
- `parseAmount`, `formatAmount`, `toMinor`, `fromMinor`, `compareAmounts`, `normalizeAmount`, `isAmount`, `numberLocale`, `currencyDecimals`, `currencyAffixes`.
- Motion: 150ms on keystrokes, an expressive roll for display, interruptible slides, and an opacity-only fade under `prefers-reduced-motion`.
