import { useEffect, useRef, useState, type ReactNode, type SelectHTMLAttributes } from 'react';
import { AlertTriangle, ChevronDown, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ChipTone } from '@/lib/vault';

// Small building blocks shared by every Credentials Vault screen, in the app's
// MD3 tokens (light + dark). Status colours (ok/warn/bad) are for chips only.

const TONE_CLS: Record<ChipTone, string> = {
  neutral: 'bg-surface-container-high text-on-surface-variant',
  accent: 'bg-primary/10 text-primary',
  ok: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  warn: 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  bad: 'bg-error/10 text-error',
};

export function Chip({ tone = 'neutral', children, className, title }: { tone?: ChipTone; children: ReactNode; className?: string; title?: string }) {
  return (
    <span
      title={title}
      className={cn('inline-flex max-w-full items-center gap-1 truncate rounded-full px-2 py-0.5 text-[11px] font-bold leading-5', TONE_CLS[tone], className)}
    >
      {children}
    </span>
  );
}

/** URLs, usernames, passwords and emails: always LTR, monospace. */
export function MonoText({ children, className, title }: { children: ReactNode; className?: string; title?: string }) {
  return (
    <span dir="ltr" title={title} className={cn('font-mono text-[13px] break-all text-on-surface', className)}>
      {children}
    </span>
  );
}

/** Label (+ red * when required), the control, and a muted help line under it. */
export function FieldWithHelp({
  id,
  label,
  required,
  help,
  className,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  /** Rendered with id `${id}-help`; point the control's aria-describedby at it. */
  help?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <label htmlFor={id} className="text-xs font-semibold text-on-surface-variant">
        {label}
        {required && (
          <span className="ml-0.5 text-error" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {children}
      {help && (
        <p id={`${id}-help`} className="text-[11px] leading-snug text-on-surface-variant">
          {help}
        </p>
      )}
    </div>
  );
}

/** Native select in the app's field style (supports <optgroup>). */
export function VaultSelect({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn('relative min-w-0', className)}>
      <select
        {...props}
        className="h-10 w-full min-w-0 cursor-pointer appearance-none rounded-[0.5rem] border-none bg-surface-container-high pl-3 pr-8 text-sm text-on-surface outline-none transition-all focus-visible:ring-[2px] focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" aria-hidden="true" />
    </div>
  );
}

/**
 * Two-step delete: the first click arms it ("Confirm delete") for 4 s, the
 * second runs `onConfirm`. No window.confirm.
 */
export function ConfirmButton({
  onConfirm,
  label = 'Delete',
  confirmLabel = 'Confirm delete',
  size = 'sm',
  disabled,
  ariaLabel,
}: {
  onConfirm: () => Promise<unknown> | void;
  label?: string;
  confirmLabel?: string;
  size?: 'sm' | 'default';
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef<number | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  const click = async () => {
    if (!armed) {
      setArmed(true);
      timer.current = window.setTimeout(() => setArmed(false), 4000);
      return;
    }
    if (timer.current) window.clearTimeout(timer.current);
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      if (mounted.current) {
        setBusy(false);
        setArmed(false);
      }
    }
  };

  return (
    <Button
      type="button"
      size={size}
      variant={armed ? 'destructive' : 'ghost'}
      onClick={click}
      disabled={disabled || busy}
      aria-label={armed ? confirmLabel : ariaLabel ?? label}
      className={cn(!armed && 'text-error hover:bg-error/10')}
    >
      {busy ? <Loader2 className="animate-spin" /> : <Trash2 />}
      <span aria-live="polite">{armed ? confirmLabel : label}</span>
    </Button>
  );
}

/** Inline warning box listing missing required fields / server validation. */
export function MissingBox({ labels, message }: { labels: string[]; message?: string | null }) {
  if (!labels.length && !message) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl bg-error/10 px-3 py-2.5 text-sm text-error">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="space-y-0.5">
        {labels.length > 0 && <p className="font-semibold">Missing required fields: {labels.join(', ')}</p>}
        {message && (!labels.length || !/^missing/i.test(message)) && <p>{message}</p>}
      </div>
    </div>
  );
}

export function Panel({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('min-w-0 space-y-3 rounded-[1rem] bg-surface-container-lowest p-4', className)}>
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-sm font-bold text-on-surface">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function LoadingRows({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-lg bg-surface-container-low" />
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      {icon && <span className="rounded-full bg-surface-container-high p-3 text-on-surface-variant">{icon}</span>}
      <p className="font-semibold text-on-surface">{title}</p>
      {hint && <p className="max-w-sm text-sm text-on-surface-variant">{hint}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-xl bg-error/10 px-4 py-8 text-center">
      <AlertTriangle className="h-6 w-6 text-error" aria-hidden="true" />
      <p className="text-sm font-semibold text-error">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw /> Try again
        </Button>
      )}
    </div>
  );
}
