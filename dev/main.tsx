import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MoneyInput, formatAmount, type MoneyIssue } from '../src';
import { CopyButton } from './CopyButton';
import SendDemo from './demo/SendDemo';
import './page.css';

const LOCALES = [
  { label: 'USD', props: { locale: 'en-US', currency: 'USD', max: '2500' } },
  { label: 'EUR', props: { locale: 'de-DE', currency: 'EUR' } },
  { label: 'INR', props: { locale: 'en-IN', currency: 'INR' } },
  { label: 'JPY', props: { locale: 'ja-JP', currency: 'JPY' } },
  { label: 'ETH', props: { locale: 'en-US', decimals: 18, prefix: 'Ξ' } },
] as const;

type Option = (typeof LOCALES)[number];

function Message({ issue, option, onPick }: { issue: MoneyIssue | null; option: Option; onPick: (v: string) => void }) {
  const currency = 'currency' in option.props ? option.props.currency : undefined;
  if (!issue) return <span>Paste $1,234.50, 1.234,50 €, 2.5k or 1.234</span>;
  if (issue.issue === 'ambiguous') {
    return (
      <span className="msg-error">
        That reads two ways.{' '}
        {issue.candidates.map((c) => (
          <button key={c} className="pick" onClick={() => onPick(c)}>
            {formatAmount(c, { locale: option.props.locale, currency })}
          </button>
        ))}
      </span>
    );
  }
  const text = { 'too-precise': 'Too many decimal places', negative: 'Amounts can’t be negative', invalid: 'That isn’t an amount', empty: '' }[issue.issue];
  return <span className="msg-error">{text}</span>;
}

// Money apps step the figure down as it grows, so it never leaves the column.
function sizeFor(value: string | null): string {
  const length = value?.length ?? 1;
  if (length <= 7) return 'var(--amount-xl)';
  if (length <= 10) return 'var(--amount-l)';
  if (length <= 14) return 'var(--amount-m)';
  return 'var(--amount-s)';
}

function Try() {
  const [option, setOption] = useState<Option>(LOCALES[0]);
  const [value, setValue] = useState<string | null>(null);
  const [minor, setMinor] = useState<bigint | null>(null);
  const [issue, setIssue] = useState<MoneyIssue | null>(null);

  return (
    <section className="try">
      <div className="switch" role="tablist">
        {LOCALES.map((o) => (
          <button
            key={o.label}
            role="tab"
            aria-selected={o === option}
            onClick={() => {
              setOption(o);
              setValue(null);
              setMinor(null);
              setIssue(null);
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
      <MoneyInput
        key={option.label}
        {...option.props}
        className="try-amount"
        style={{ fontSize: sizeFor(value) }}
        align="center"
        autoFocus
        value={value}
        onChange={(v, c) => {
          setValue(v);
          setMinor(c.minor);
        }}
        onIssue={setIssue}
      />
      <div className="try-msg">
        <Message
          issue={issue}
          option={option}
          onPick={(v) => {
            setValue(v);
            setIssue(null);
          }}
        />
      </div>
      <code className="try-out" aria-live="polite">
        {value === null ? '\u00a0' : `value "${value}"   minor ${minor}n`}
      </code>
    </section>
  );
}

function App() {
  const [run, setRun] = useState(0);
  return (
    <main className="page">
      <header className="intro">
        <div className="name">Tender</div>
        <p>A money input that can’t get the amount wrong. Integer math, honest pastes, and digits that roll.</p>
      </header>

      <figure className="hero">
        <SendDemo key={run} />
        <button className="replay" onClick={() => setRun((n) => n + 1)}>
          Replay
        </button>
      </figure>

      <Try />

      <footer className="install">
        <div className="command">
          <code>npm install @dan-build/tender</code>
          <CopyButton text="npm install @dan-build/tender" label="Copy install command" />
        </div>
      </footer>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
