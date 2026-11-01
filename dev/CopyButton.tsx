import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

// A copy button whose icon swaps to a tick. Both icons stay mounted in one
// cell and cross-fade (scale 0.25, 4px blur, 300ms), and the tick draws its
// stroke in as it arrives. The tick only shows once the clipboard write has
// succeeded, and returns to the copy icon after a moment.

const RESET_MS = 1600;

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), RESET_MS);
  };

  return (
    <button type="button" className="copy" onClick={copy} aria-label={copied ? 'Copied' : label} data-copied={copied || undefined}>
      <span className="copy-icon" data-on={!copied || undefined}>
        <Copy size={14} strokeWidth={1.5} aria-hidden />
      </span>
      <span className="copy-icon copy-check" data-on={copied || undefined}>
        <Check size={14} strokeWidth={1.75} aria-hidden />
      </span>
      <span className="visually-hidden" aria-live="polite">
        {copied ? 'Copied' : ''}
      </span>
    </button>
  );
}
