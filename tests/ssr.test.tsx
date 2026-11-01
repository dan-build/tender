// @vitest-environment node
import { renderToString } from 'react-dom/server';
import { Amount, MoneyInput } from '../src';

describe('server rendering', () => {
  it('renders both components to HTML without a DOM', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const html = renderToString(
      <>
        <MoneyInput currency="EUR" locale="de-DE" defaultValue="1234.5" name="amount" />
        <Amount value="1234.5" currency="USD" locale="en-US" />
      </>,
    );
    expect(html).toContain('value="1.234,5"');
    expect(html).toContain('value="1234.5"');
    expect(html).toContain('$1,234.50');
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });
});
