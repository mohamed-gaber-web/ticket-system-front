import { useEffect, useRef, useState, type ReactNode, type SelectHTMLAttributes } from 'react';
import { AlertTriangle, ChevronDown, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { Tone } from '@/types/collect.types';
import { TONE_TEXT } from '@/lib/collect';

// Building blocks shared by every Grow Path Collect screen, in
// the app's MD3 tokens with the semantic tones of the spec (ok / crit / info /
// warn / neutral). Numbers are always tabular.

const TONE_CLS: Record<Tone, string> = {
  ok: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  crit: 'bg-error/10 text-error',
  info: 'bg-primary/10 text-primary',
  warn: 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  neutral: 'bg-surface-container-high text-on-surface-variant',
};

export function Chip({ tone = 'neutral', children, className, title, dot }: { tone?: Tone; children: ReactNode; className?: string; title?: string; dot?: string }) {
  return (
    <span
      title={title}
      className={cn('inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-bold leading-5', TONE_CLS[tone], className)}
    >
      {dot && <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ background: dot }} />}
      {children}
    </span>
  );
}

export function TypeDot({ color }: { color?: string }) {
  return <span aria-hidden="true" className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color ?? 'var(--muted-foreground)' }} />;
}

export function Panel({ title, action, children, className, hint }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; hint?: ReactNode }) {
  return (
    <section className={cn('min-w-0 space-y-3 rounded-[1rem] bg-surface-container-lowest p-4', className)}>
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="gpc-h text-[15px] font-semibold text-on-surface">{title}</h2>}
          {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
        </div>
      )}
      {hint && <p className="-mt-1 text-xs text-on-surface-variant">{hint}</p>}
      {children}
    </section>
  );
}

export function Kpi({ label, value, sub, tone, onClick }: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'min-w-0 rounded-[1rem] bg-surface-container-lowest p-4 text-start',
        tone === 'crit' && 'ring-1 ring-error/40',
        onClick && 'outline-none transition-colors hover:bg-surface-container-low focus-visible:ring-[2px] focus-visible:ring-primary/40',
      )}
    >
      <p className="text-xs font-semibold text-on-surface-variant">{label}</p>
      <p className={cn('mt-1 text-[22px] font-bold leading-tight tabular-nums', tone ? TONE_TEXT[tone] : 'text-on-surface')}>{value}</p>
      {sub && <p className="mt-0.5 truncate text-[11.5px] tabular-nums text-on-surface-variant">{sub}</p>}
    </Tag>
  );
}

export const KPI_GRID = 'grid grid-cols-[repeat(auto-fit,minmax(min(100%,170px),1fr))] gap-3';

/** Segmented control (radiogroup). */
export function Seg<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; count?: number }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex max-w-full flex-wrap gap-1 rounded-[0.75rem] bg-surface-container-high p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-[0.5rem] px-3 py-1.5 text-[13px] font-semibold outline-none transition-colors focus-visible:ring-[2px] focus-visible:ring-primary/40',
            value === o.value ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface',
          )}
        >
          {o.label}
          {o.count != null && <span className="rounded-full bg-surface-container-highest px-1.5 text-[11px] tabular-nums">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, htmlFor, children, hint, className, required }: { label: string; htmlFor?: string; children: ReactNode; hint?: ReactNode; className?: string; required?: boolean }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <label htmlFor={htmlFor} className="text-xs font-semibold text-on-surface-variant">
        {label}
        {required && <span className="ms-0.5 text-error">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] leading-snug text-on-surface-variant">{hint}</p>}
    </div>
  );
}

export const INPUT =
  'h-10 w-full min-w-0 rounded-[0.5rem] border-none bg-surface-container-high px-3 text-sm text-on-surface outline-none transition-all focus-visible:ring-[2px] focus-visible:ring-primary/40 disabled:opacity-60';
export const TEXTAREA =
  'w-full min-w-0 rounded-[0.5rem] border-none bg-surface-container-high px-3 py-2 text-sm leading-relaxed text-on-surface outline-none focus-visible:ring-[2px] focus-visible:ring-primary/40 disabled:opacity-60';

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn('relative min-w-0', className)}>
      <select {...props} className={cn(INPUT, 'cursor-pointer appearance-none pl-3 pr-8')}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" aria-hidden="true" />
    </div>
  );
}

/** Two-click destructive button: the first click arms it ("Click to confirm", 3 s). */
export function ConfirmButton({
  onConfirm,
  label = 'Delete',
  confirmLabel = 'Click to confirm',
  size = 'sm',
  variant = 'ghost',
  disabled,
  icon = true,
  title,
}: {
  onConfirm: () => Promise<unknown> | void;
  label?: string;
  confirmLabel?: string;
  size?: 'sm' | 'default';
  variant?: 'ghost' | 'outline';
  disabled?: boolean;
  icon?: boolean;
  title?: string;
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
      timer.current = window.setTimeout(() => mounted.current && setArmed(false), 3000);
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
      variant={armed ? 'destructive' : variant}
      onClick={click}
      disabled={disabled || busy}
      title={title}
      className={cn(!armed && 'text-error hover:bg-error/10')}
    >
      {busy ? <Loader2 className="animate-spin" /> : icon ? <Trash2 /> : null}
      <span aria-live="polite">{armed ? confirmLabel : label}</span>
    </Button>
  );
}

/** Modal on the app's Dialog with a scrolling body and a footer bar. */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide,
  xwide,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  xwide?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className={cn(
          'gpc flex max-h-[92vh] w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden p-0',
          xwide ? 'max-w-5xl' : wide ? 'max-w-3xl' : 'max-w-lg',
        )}
      >
        <div className="border-b border-outline-variant/40 pb-3 pl-5 pr-12 pt-5">
          <DialogTitle className="gpc-h text-[17px] font-semibold text-on-surface">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="mt-1 text-xs">{description}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only">{typeof title === 'string' ? title : ''}</DialogDescription>
          )}
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap items-center gap-2 border-t border-outline-variant/40 px-5 py-3">{footer}</div>}
      </DialogContent>
    </Dialog>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <p className="font-semibold text-on-surface">{title}</p>
      {hint && <p className="max-w-md text-sm text-on-surface-variant">{hint}</p>}
      {action}
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

export function Loading({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-[0.75rem] bg-surface-container-low" />
      ))}
    </div>
  );
}

export function Warning({ children }: { children: ReactNode }) {
  return (
    <p role="note" className="flex items-start gap-2 rounded-[0.75rem] bg-amber-50 px-3 py-2 text-[13px] text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

/** Thin collected-share bar under the "Collected" column. */
export function Progress({ value, max, color }: { value: number; max: number; color?: string }) {
  const w = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <span className="mt-1 block h-1 w-full overflow-hidden rounded-full bg-surface-container-high" aria-hidden="true">
      <span className="block h-full rounded-full" style={{ width: `${w}%`, background: color ?? 'var(--color-primary)' }} />
    </span>
  );
}

/** Wide tables scroll inside their own box, never the page. */
export function TableBox({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('min-w-0 overflow-x-auto rounded-[0.75rem]', className)}>{children}</div>;
}

export const TH = 'whitespace-nowrap px-3 py-2.5 text-start text-[11.5px] font-bold text-on-surface-variant';
export const TD = 'px-3 py-2.5 align-top';
export const TDN = 'px-3 py-2.5 align-top tabular-nums whitespace-nowrap';
