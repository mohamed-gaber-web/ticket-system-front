import type { ReactNode } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Small shared pieces of the Proposal Builder rail, in the app's design system
// (MD3 surfaces, deep-blue primary, orange accent).

export const fieldCls =
  'h-9 w-full min-w-0 rounded-[0.5rem] bg-surface-container-high border-none px-3 text-sm text-on-surface outline-none transition-all focus-visible:ring-[2px] focus-visible:ring-primary/40 placeholder:text-on-surface-variant/60';
export const textareaCls =
  'w-full rounded-[0.5rem] bg-surface-container-high border-none px-3 py-2 text-sm leading-relaxed text-on-surface outline-none transition-all focus-visible:ring-[2px] focus-visible:ring-primary/40 resize-y placeholder:text-on-surface-variant/60';

export function RailSection({ title, hint, action, children }: { title: string; hint?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-primary">{title}</h3>
        {action}
      </div>
      {hint && <p className="text-xs text-on-surface-variant leading-relaxed">{hint}</p>}
      {children}
    </section>
  );
}

export function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={cn('flex min-w-0 flex-col gap-1', className)}>
      <span className="text-xs font-medium text-on-surface-variant">{label}</span>
      {children}
    </label>
  );
}

export function NativeSelect({
  value,
  onChange,
  children,
  className,
  ariaLabel,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div className={cn('relative min-w-0', className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        disabled={disabled}
        className={cn(fieldCls, 'appearance-none cursor-pointer pr-8 disabled:cursor-not-allowed disabled:opacity-60')}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
    </div>
  );
}

/** Number input that keeps the field editable while typing (empty → 0 on blur only). */
export function NumberInput({
  value,
  onChange,
  min = 0,
  max,
  step = 'any',
  ariaLabel,
  className,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number | 'any';
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={Number.isFinite(value) ? value : 0}
      min={min}
      max={max}
      step={step}
      aria-label={ariaLabel}
      disabled={disabled}
      onChange={(e) => {
        const n = e.target.value === '' ? 0 : Number(e.target.value);
        if (!Number.isNaN(n)) onChange(max != null ? Math.min(max, Math.max(min, n)) : Math.max(min, n));
      }}
      className={cn(fieldCls, 'tabular-nums', className)}
    />
  );
}

export function RemoveButton({ onClick, label, disabled }: { onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-on-surface-variant transition-colors hover:bg-error/10 hover:text-error disabled:pointer-events-none disabled:opacity-40"
    >
      <X className="h-4 w-4" />
    </button>
  );
}

export function Chip({ on, onClick, children, disabled }: { on: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      disabled={disabled}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        on
          ? 'border-primary bg-primary text-on-primary'
          : 'border-outline-variant/50 bg-surface-container-low text-on-surface-variant hover:border-accent-orange-500 hover:text-on-surface',
      )}
    >
      {children}
    </button>
  );
}

export function Pill({ tone, children }: { tone: 'ok' | 'warn' | 'info' | 'bad'; children: ReactNode }) {
  const cls = {
    ok: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    warn: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    info: 'bg-primary/10 text-primary',
    bad: 'bg-error/10 text-error',
  }[tone];
  return <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold', cls)}>{children}</span>;
}

export function Box({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('space-y-2 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-3', className)}>{children}</div>;
}
