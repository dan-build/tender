import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { Amount, MoneyInput } from '../src';

describe('<MoneyInput>', () => {
  it('reports the amount as a string and in minor units', () => {
    const onChange = vi.fn();
    render(<MoneyInput currency="USD" locale="en-US" onChange={onChange} />);
    const input = screen.getByLabelText('Amount') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '1234.5' } });
    expect(input.value).toBe('1,234.5');
    expect(onChange).toHaveBeenLastCalledWith('1234.5', { minor: 123450n, decimals: 2, over: false });
  });

  it('shows the currency symbol where the locale puts it', () => {
    const { container, rerender } = render(<MoneyInput currency="USD" locale="en-US" />);
    expect(container.querySelector('[data-part="prefix"]')?.textContent).toBe('$');
    rerender(<MoneyInput currency="EUR" locale="de-DE" />);
    expect(container.querySelector('[data-part="suffix"]')?.textContent).toBe(' €');
  });

  it('flags an amount over max without changing it', () => {
    const onChange = vi.fn();
    const { container } = render(<MoneyInput currency="USD" max="100" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '150' } });
    expect(onChange).toHaveBeenLastCalledWith('150', expect.objectContaining({ over: true }));
    expect(container.querySelector('[data-tender]')?.hasAttribute('data-over')).toBe(true);
  });

  it('submits the plain amount, not the formatted text', () => {
    const { container } = render(<MoneyInput name="amount" currency="EUR" locale="de-DE" defaultValue="1234.5" />);
    expect((screen.getByLabelText('Amount') as HTMLInputElement).value).toBe('1.234,5');
    expect((container.querySelector('input[type="hidden"]') as HTMLInputElement).value).toBe('1234.5');
  });

  it('follows a controlled value without clobbering what is being typed', () => {
    function Controlled() {
      const [v, setV] = useState<string | null>('5');
      return (
        <>
          <MoneyInput value={v} onChange={setV} currency="USD" locale="en-US" />
          <button onClick={() => setV('2000')}>max</button>
        </>
      );
    }
    render(<Controlled />);
    const input = screen.getByLabelText('Amount') as HTMLInputElement;
    expect(input.value).toBe('5');
    // The parent holds "5" while the field shows the point just typed.
    fireEvent.change(input, { target: { value: '5.' } });
    expect(input.value).toBe('5.');
    act(() => screen.getByText('max').click());
    expect(input.value).toBe('2,000');
  });

  it('reports a refused edit through onIssue', () => {
    const onIssue = vi.fn();
    render(<MoneyInput currency="USD" locale="en-US" onIssue={onIssue} defaultValue="9" />);
    const input = screen.getByLabelText('Amount');
    fireEvent.change(input, { target: { value: '1.234' } });
    expect(onIssue).toHaveBeenLastCalledWith({ issue: 'ambiguous', candidates: ['1234'] });
    expect((input as HTMLInputElement).value).toBe('9');
  });
});

describe('<Amount>', () => {
  it('reads as one formatted string to assistive tech', () => {
    const { container } = render(<Amount value="1234.5" currency="USD" locale="en-US" />);
    expect(container.textContent).toContain('$1,234.50');
    expect(container.querySelectorAll('[data-k]').length).toBe(8);
  });
});

describe('<MoneyInput> controlled mid-typing', () => {
  it('shows a trailing point held by the parent', () => {
    render(<MoneyInput value="320." currency="USD" locale="en-US" />);
    expect((screen.getByLabelText('Amount') as HTMLInputElement).value).toBe('320.');
  });
});

describe('<MoneyInput> onChange', () => {
  it('reports a trailing zero but not a bare point', () => {
    const onChange = vi.fn();
    render(<MoneyInput currency="USD" locale="en-US" defaultValue="12.5" onChange={onChange} />);
    const input = screen.getByLabelText('Amount');
    fireEvent.change(input, { target: { value: '12.50' } });
    expect(onChange).toHaveBeenLastCalledWith('12.50', expect.objectContaining({ minor: 1250n }));
    onChange.mockClear();
    render(<MoneyInput currency="USD" locale="en-US" defaultValue="12" onChange={onChange} aria-label="Second" />);
    fireEvent.change(screen.getByLabelText('Second'), { target: { value: '12.' } });
    expect(onChange).not.toHaveBeenCalled();
  });
});
