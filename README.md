# Tender

A money input for React that can't get the amount wrong.

- **Integer math, never floats.** Values are decimal strings (`"1234.5"`) or minor units (`123450n`). `0.1 + 0.2` is `0.30`, and amounts past 2^53 or at 18 decimals keep every digit.
- **Pastes that land, or ask.** `$1,234.50`, `1.234,50 €`, `12,34,567`, `USD 40` and `2.5k` all parse. `1.234` in a two-decimal currency reads two ways, so Tender reports both instead of picking one.
- **Grouping by locale, drawn as you type.** Commas, points, spaces and apostrophes in the right places, with Indian grouping and Spanish's ungrouped thousands. Typing `.` or `,` always means the decimal point.
- **Digits that roll.** Only the digits that changed move; separators slide as the number grows. A real `<input>` sits on top, so the caret, selection, autofill, IME and screen readers behave natively.

No dependencies beyond React. About 7 KB min+gzip.

```bash
npm install @dan-build/tender
```

```tsx
import { MoneyInput } from '@dan-build/tender';

<MoneyInput
  currency="USD"
  max={balance}
  onChange={(value, { minor, over }) => setAmount(value)}
/>
```

## `<MoneyInput>`

| Prop | Type | Default | |
|---|---|---|---|
| `value` / `defaultValue` | `string \| null` | | A decimal string such as `"1234.5"`. |
| `onChange` | `(value, { minor, decimals, over }) => void` | | Fires when the value string changes. Typing a bare point (`12` to `12.`) doesn't. |
| `onIssue` | `({ issue, candidates } \| null) => void` | | An edit was refused: `ambiguous`, `too-precise`, `negative` or `invalid`. |
| `currency` | ISO 4217 code | | Sets the symbol and decimal places. |
| `locale` | BCP 47 tag | runtime's | Separators and symbol placement. |
| `decimals` | `number` | currency's, or 2 | 18 for ETH, 6 for USDC. |
| `prefix` / `suffix` | `ReactNode` | currency symbol | `null` hides it. |
| `max` | `string` | | Marks the field `data-over` and `aria-invalid` above it. The amount is kept. |
| `placeholder` | `string` | `"0"` | An amount, shown dimmed while empty. |
| `animate` | `boolean` | `true` | Typing answers in 150ms; under `prefers-reduced-motion` characters only fade. |
| `name` | `string` | | Submits the plain amount (`1234.5`), not the formatted text. |

`className` and `style` go on the root `<label>`. Every other prop goes to the `<input>`. The root carries `data-empty`, `data-over` and `data-issue` for styling.

## `<Amount>`

A formatted amount for reading: a balance, a total, the figure on a confirm screen. When the value changes, the digits roll by place value.

```tsx
<Amount value="1234.5" currency="EUR" locale="de-DE" />   // 1.234,50 €
```

## Notes

- **Server rendering.** Both components render on the server. Pass `locale` explicitly when you do: without it the server formats in its locale and the browser in the visitor's, and React reports a hydration mismatch.
- **iOS zoom.** iOS zooms into any input under 16px. Keep the field at 16px or larger on phones.
- **Accessibility.** The field is a real text input with an accessible name (`aria-label`, "Amount" by default). It sets `aria-invalid` when over `max` or after a refused paste. Point `aria-describedby` at the message you show.
- **Negative amounts** aren't typed into the input. `parseAmount` reads them with `allowNegative`, and `<Amount>` displays them.

## Functions

```ts
parseAmount('1.234,50 €', { locale: 'de-DE', currency: 'EUR' }) // { ok: true, value: '1234.50' }
parseAmount('1.234', { locale: 'en-US', currency: 'USD' })      // { ok: false, issue: 'ambiguous', candidates: ['1234'] }
formatAmount('1234.5', { locale: 'en-IN', currency: 'INR' })     // '₹1,234.50'
toMinor('12.5', 2)       // 1250n, and throws rather than round '1.005'
fromMinor(1250n, 2)      // '12.50'
compareAmounts('12.5', '12.50') // 0
```

## Development

```bash
npm run dev     # playground at localhost:5174
npm run check   # typecheck, lint, test, build
```

MIT
