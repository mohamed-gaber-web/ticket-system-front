import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, Info, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Small building blocks shared by the tele-sales dashboard sections, in the
// app's MD3 surface tokens (light + dark).

export function Panel({
  title,
  icon,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn('min-w-0 rounded-2xl border border-outline-variant/20 bg-surface-container-lowest shadow-sm', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/10 px-4 py-3">
        <h2 className="flex min-w-0 items-center gap-2 text-sm font-bold text-on-surface">
          {icon}
          <span className="truncate">{title}</span>
        </h2>
        {action}
      </div>
      <div className={cn('p-4', bodyClassName)}>{children}</div>
    </section>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-surface-container-high', className)} aria-hidden="true" />;
}

export function EmptyNote({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      {icon && (
        <span className="rounded-full bg-surface-container-high p-2.5 text-on-surface-variant" aria-hidden="true">
          {icon}
        </span>
      )}
      <p className="text-sm font-semibold text-on-surface">{title}</p>
      {hint && <p className="max-w-sm text-xs text-on-surface-variant">{hint}</p>}
    </div>
  );
}

export function ErrorBlock({ message, onRetry, compact }: { message: string; onRetry: () => void; compact?: boolean }) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-center gap-3 rounded-xl bg-error/10 text-error',
        compact ? 'flex-wrap justify-between px-3 py-2 text-sm' : 'flex-col px-4 py-10 text-center',
      )}
    >
      <span className={cn('flex items-center gap-2', !compact && 'flex-col')}>
        <AlertTriangle className={compact ? 'h-4 w-4 shrink-0' : 'h-6 w-6'} aria-hidden="true" />
        <span className="font-semibold">{message}</span>
      </span>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw /> Retry
      </Button>
    </div>
  );
}

/**
 * An (i) button that opens a small explanatory panel. Opens on click, closes on
 * Esc, outside click, scroll/resize or a second click; focus returns to the
 * button on Esc. The panel is placed under the button and kept on screen.
 */
export function InfoPopover({ label, children }: { label: string; children: ReactNode }) {
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const open = pos !== null;

  const toggle = () => {
    if (open || !btnRef.current) {
      setPos(null);
      return;
    }
    const r = btnRef.current.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const width = Math.min(352, vw - 32);
    setPos({ top: r.bottom + 8, left: Math.min(Math.max(16, r.left), vw - width - 16), width });
  };

  useEffect(() => {
    if (!open) return;
    const close = () => setPos(null);
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        btnRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    const onScroll = (e: Event) => {
      if (!wrapRef.current?.contains(e.target as Node)) close();
    };
    window.addEventListener('resize', close);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  return (
    <span ref={wrapRef} className="inline-flex">
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={toggle}
        className="grid h-6 w-6 place-items-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {pos && (
        <div
          id={panelId}
          role="dialog"
          aria-label={label}
          style={{ top: pos.top, left: pos.left, width: pos.width }}
          className="fixed z-50 max-h-[70vh] overflow-y-auto rounded-xl bg-surface-container-lowest p-4 text-left text-xs font-normal normal-case tracking-normal text-on-surface-variant shadow-xl ring-1 ring-outline-variant/40"
        >
          {children}
        </div>
      )}
    </span>
  );
}
