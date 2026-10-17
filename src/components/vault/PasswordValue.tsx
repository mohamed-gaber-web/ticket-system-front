import { Copy, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRevealedPassword } from '@/hooks/useRevealedPassword';
import { copyText } from '@/lib/vault';
import { MonoText } from './VaultUi';

/** Masked password + Show/Hide + Copy. The plaintext lives only in this component. */
export function PasswordValue({ entryId, platform }: { entryId: string; platform: string }) {
  const { password, busy, toggle, copy } = useRevealedPassword(entryId);
  const shown = password !== null;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      <MonoText className="min-w-0 flex-1">{shown ? password : '••••••••••'}</MonoText>
      <span className="sr-only" aria-live="polite">
        {shown ? `Password for ${platform} shown; it hides again in 30 seconds.` : ''}
      </span>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={toggle}
        disabled={busy === 'reveal'}
        aria-pressed={shown}
        aria-label={shown ? `Hide password for ${platform}` : `Show password for ${platform}`}
      >
        {busy === 'reveal' ? <Loader2 className="animate-spin" /> : shown ? <EyeOff /> : <Eye />}
        {shown ? 'Hide' : 'Show'}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={copy} disabled={busy === 'copy'} aria-label={`Copy password for ${platform}`}>
        {busy === 'copy' ? <Loader2 className="animate-spin" /> : <Copy />}
        Copy
      </Button>
    </div>
  );
}

/** Copy button for a plain value (URL, username). */
export function CopyButton({ value, label }: { value: string; label: string }) {
  return (
    <Button type="button" size="sm" variant="ghost" onClick={() => void copyText(value, `${label} copied`)} aria-label={`Copy ${label.toLowerCase()}`}>
      <Copy /> Copy
    </Button>
  );
}
