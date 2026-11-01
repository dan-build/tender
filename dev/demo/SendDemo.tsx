import { Avatar, Check, Stage, States, Window, type Act } from '../kit';
import { Amount, MoneyInput, compareAmounts, formatAmount } from '../../src';
import './send.css';

// Sending money, told with the real components. Beats: an amount is typed
// past the balance; the amount turns and the line under it says why; it's
// corrected to 320.50; Continue becomes "Send $320.50", the amount said back
// on the button that commits it; Send settles on Sent, and a beat later the
// balance rolls down by exactly that. Plays once; the still is the payoff.
//
// What makes it read:
// - The amount is centered by its digits, the $ hanging outside, so it
//   doesn't drift right as it grows.
// - The message lane is there from the first frame: the balance and the
//   error swap in it, so nothing below moves when the error arrives.
// - The button never resizes. Each state is a centered group in one cell,
//   and the groups crossfade, so every label sits on the button's center.
//
// Real strings: the recipient, the amount, the balance or the error, the
// button.

type Step = 'edit' | 'review' | 'sending' | 'sent';
type S = { amount: string; focus: boolean; step: Step; balance: string };

const BALANCE = '2500.00';
const initial: S = { amount: '', focus: true, step: 'edit', balance: BALANCE };
const poster: S = { amount: '320.50', focus: false, step: 'sent', balance: '2179.50' };

async function script(a: Act<S>) {
  await a.wait(800);
  a.mark('type');
  await a.type('amount', '3200', { interval: 150 });
  await a.wait(1600);
  a.mark('fix');
  // Backspace once, then the cents: a.type would clear the field and start over
  for (const [amount, pause] of [['320', 420], ['320.', 160], ['320.5', 160], ['320.50', 160]] as const) {
    a.put({ amount });
    await a.wait(pause);
  }
  await a.wait(700);
  a.mark('continue');
  await a.click({ at: 'cta', x: 0.5, y: 0.5 });
  a.put({ step: 'review', focus: false });
  await a.wait(1400);
  a.mark('send');
  await a.click({ at: 'cta', x: 0.5, y: 0.5 });
  a.put({ step: 'sending' });
  await a.wait(900);
  a.put({ step: 'sent' });
  await a.wait(380);
  a.put({ balance: '2179.50' });
  await a.move({ at: 'cta', x: 1.12, y: 0.9 });
  await a.wait(2600);
}

export default function SendDemo() {
  return (
    <Stage
      width={640}
      height={400}
      compact={{ below: 640, width: 358, height: 380 }}
      initial={initial}
      poster={poster}
      script={script}
      play="once"
      cursor={{ at: { wide: { x: 452, y: 372 }, compact: { x: 300, y: 356 } } }}
      className="tn"
    >
      {(s) => {
        const amount = s.amount.replace(/\.$/, '');
        const over = amount !== '' && compareAmounts(amount, BALANCE) > 0;
        const ready = s.amount !== '' && !over;
        return (
          <div className="tn-mask">
          <Window chrome="card" url="northwind.co/send" className="tn-win">
            <div className="tn-body">
              <div className="tn-to">
                <Avatar name="Maya Chen" size={22} />
                <span>Maya Chen</span>
              </div>

              <MoneyInput
                className={s.focus ? 'tn-amount is-focus' : 'tn-amount'}
                value={s.amount || null}
                currency="USD"
                locale="en-US"
                max={BALANCE}
                align="center"
                tabIndex={-1}
                readOnly
              />

              <div className="tn-lane">
                <States
                  value={over ? 'error' : 'hint'}
                  states={{
                    hint: (
                      <span className="tn-msg">
                        Balance <Amount value={s.balance} currency="USD" locale="en-US" />
                      </span>
                    ),
                    error: <span className="tn-msg tn-msg--error">More than your $2,500.00 balance</span>,
                  }}
                />
              </div>

              <span
                className="tn-cta"
                data-target="cta"
                data-cursor="pointer"
                data-idle={!ready && s.step === 'edit' ? '' : undefined}
                data-done={s.step === 'sent' || undefined}
              >
                <span className="tn-layer" data-on={s.step === 'edit' || undefined}>
                  Continue
                </span>
                <span className="tn-layer" data-on={s.step === 'review' || undefined}>
                  Send {s.amount ? formatAmount(amount, { currency: 'USD', locale: 'en-US' }) : ''}
                </span>
                {/* Each state is its own centered group, so "Sent" sits as centered
                    as "Sending" did; the two crossfade in place */}
                <span className="tn-layer" data-on={s.step === 'sending' || undefined}>
                  <Check on={false} pending={s.step === 'sending'} size={15} />
                  Sending
                </span>
                <span className="tn-layer" data-on={s.step === 'sent' || undefined}>
                  <Check on={s.step === 'sent'} size={15} />
                  Sent
                </span>
              </span>
            </div>
          </Window>
          </div>
        );
      }}
    </Stage>
  );
}
