import type { ReactNode, SelectHTMLAttributes } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { clearFilters, setFilter, setMetric, setMonth, setView } from '@/redux/slices/socialSlice';
import {
  CONTENT_TYPES,
  CONTENT_TYPE_LABELS,
  METRICS,
  PLATFORMS,
  PLATFORM_COLORS,
  PLATFORM_LABELS,
  monthLabel,
} from '@/lib/socialPulse';
import type { Platform, SocialFilters } from '@/types/social.types';

// Building blocks shared by the Social Pulse screens, in the app's MD3 tokens.

export type Tone = 'neutral' | 'accent' | 'ok' | 'warn' | 'bad';

const TONE_CLS: Record<Tone, string> = {
  neutral: 'bg-surface-container-high text-on-surface-variant',
  accent: 'bg-primary/10 text-primary',
  ok: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  warn: 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  bad: 'bg-error/10 text-error',
};

export const GOOD_TEXT = 'text-emerald-700 dark:text-emerald-300';
export const BAD_TEXT = 'text-error';

export function Pill({ tone = 'neutral', children, className, title }: { tone?: Tone; children: ReactNode; className?: string; title?: string }) {
  return (
    <span
      title={title}
      className={cn('inline-flex max-w-full items-center gap-1 truncate rounded-full px-2 py-0.5 text-[11px] font-bold leading-5', TONE_CLS[tone], className)}
    >
      {children}
    </span>
  );
}

export function PlatformDot({ platform, className }: { platform: Platform | null | undefined; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block h-2.5 w-2.5 shrink-0 rounded-full', className)}
      style={{ background: platform ? PLATFORM_COLORS[platform] : 'var(--muted-foreground)' }}
    />
  );
}

export function PlatformPill({ platform }: { platform: Platform | null | undefined }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-surface-container-high px-2 py-0.5 text-xs font-semibold text-on-surface">
      <PlatformDot platform={platform} />
      {platform ? PLATFORM_LABELS[platform] : '—'}
    </span>
  );
}

/** Native select in the app's field style. */
export function NativeSelect({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
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

export function Field({ label, htmlFor, children, hint, className }: { label: string; htmlFor: string; children: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <label htmlFor={htmlFor} className="text-xs font-semibold text-on-surface-variant">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] leading-snug text-on-surface-variant">{hint}</p>}
    </div>
  );
}

/** Horizontal scroll box for wide tables — the page itself never scrolls sideways. */
export function TableBox({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('min-w-0 overflow-x-auto rounded-[1rem] bg-surface-container-lowest', className)}>{children}</div>;
}

export const TH = 'whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-on-surface-variant';
export const TD = 'px-3 py-2.5 align-top';
export const TD_NUM = 'px-3 py-2.5 text-right align-top tabular-nums whitespace-nowrap';

// ── View bar: cumulative vs gained in a month ────────────────────────────────

export function ViewBar() {
  const dispatch = useAppDispatch();
  const { view, month } = useAppSelector((s) => s.social.ui);
  const months = useAppSelector((s) => s.social.meta?.months ?? []);
  const options = [...months].reverse();

  return (
    <section aria-label="How numbers are shown" className="space-y-2 rounded-[1rem] bg-primary px-4 py-3 text-primary-foreground">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold">Show numbers as:</span>
        <div role="radiogroup" aria-label="Show numbers as" className="inline-flex rounded-[0.75rem] bg-primary-foreground/15 p-1">
          {(
            [
              ['cumulative', 'Cumulative total'],
              ['month', 'Gained in month'],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={view === v}
              onClick={() => dispatch(setView(v))}
              className={cn(
                'rounded-[0.5rem] px-3 py-1.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/70',
                view === v ? 'bg-primary-foreground text-primary shadow-sm' : 'text-primary-foreground/90 hover:bg-primary-foreground/10',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {view === 'month' && (
          <div className="relative">
            <label htmlFor="sp-month" className="sr-only">
              Month
            </label>
            <select
              id="sp-month"
              value={month}
              onChange={(e) => dispatch(setMonth(e.target.value))}
              disabled={options.length === 0}
              className="h-9 cursor-pointer appearance-none rounded-[0.5rem] border-none bg-primary-foreground pl-3 pr-8 text-sm font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              {options.length === 0 && <option value="">No pulls yet</option>}
              {options.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" aria-hidden="true" />
          </div>
        )}
      </div>
      <p className="text-xs text-primary-foreground/85">
        {view === 'month'
          ? `Only what was gained in ${monthLabel(month)}, for every post pulled that month (old and new).`
          : 'The latest cumulative number for each post, from its most recent pull.'}
      </p>
    </section>
  );
}

// ── Filters ──────────────────────────────────────────────────────────────────

export function FilterBar() {
  const dispatch = useAppDispatch();
  const filters = useAppSelector((s) => s.social.ui.filters);
  const meta = useAppSelector((s) => s.social.meta);
  const set = (key: keyof SocialFilters) => (value: string) => dispatch(setFilter({ key, value }));
  const active = Object.values(filters).some(Boolean);

  return (
    <section aria-label="Filters" className="grid grid-cols-2 gap-3 rounded-[1rem] bg-surface-container-lowest p-3 sm:grid-cols-3 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto] lg:items-end">
      <Field label="Platform" htmlFor="sp-f-platform">
        <NativeSelect id="sp-f-platform" value={filters.platform} onChange={(e) => set('platform')(e.target.value)}>
          <option value="">All platforms</option>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {PLATFORM_LABELS[p]}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Content type" htmlFor="sp-f-type">
        <NativeSelect id="sp-f-type" value={filters.type} onChange={(e) => set('type')(e.target.value)}>
          <option value="">All types</option>
          {CONTENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {CONTENT_TYPE_LABELS[t]}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Category / series" htmlFor="sp-f-category">
        <NativeSelect id="sp-f-category" value={filters.category} onChange={(e) => set('category')(e.target.value)}>
          <option value="">All categories</option>
          {(meta?.usedCategories ?? []).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          {meta?.hasUncategorised && <option value="—">— No category</option>}
        </NativeSelect>
      </Field>
      <Field label="Published from" htmlFor="sp-f-from">
        <input
          id="sp-f-from"
          type="date"
          value={filters.from}
          max={filters.to || undefined}
          onChange={(e) => set('from')(e.target.value)}
          className="h-10 w-full min-w-0 rounded-[0.5rem] bg-surface-container-high px-3 text-sm text-on-surface outline-none focus-visible:ring-[2px] focus-visible:ring-primary/40"
        />
      </Field>
      <Field label="Published to" htmlFor="sp-f-to">
        <input
          id="sp-f-to"
          type="date"
          value={filters.to}
          min={filters.from || undefined}
          onChange={(e) => set('to')(e.target.value)}
          className="h-10 w-full min-w-0 rounded-[0.5rem] bg-surface-container-high px-3 text-sm text-on-surface outline-none focus-visible:ring-[2px] focus-visible:ring-primary/40"
        />
      </Field>
      <div className="flex items-end">
        <Button type="button" variant="ghost" disabled={!active} onClick={() => dispatch(clearFilters())}>
          <X /> Clear filters
        </Button>
      </div>
    </section>
  );
}

// ── Metric switcher ──────────────────────────────────────────────────────────

export function MetricSwitcher() {
  const dispatch = useAppDispatch();
  const metric = useAppSelector((s) => s.social.ui.metric);
  return (
    <div role="radiogroup" aria-label="Metric" className="flex flex-wrap gap-1.5">
      {METRICS.map((m) => (
        <button
          key={m.key}
          type="button"
          role="radio"
          aria-checked={metric === m.key}
          onClick={() => dispatch(setMetric(m.key))}
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-semibold outline-none transition-colors focus-visible:ring-[2px] focus-visible:ring-primary/40',
            metric === m.key ? 'bg-primary text-primary-foreground' : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface',
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

// ── Horizontal bar list ──────────────────────────────────────────────────────

export interface BarItem {
  key: string;
  label: string;
  value: number;
  display: string;
  sub?: string;
  /** Dot before the label (platform colour). */
  dot?: string;
  /** Bar colour; default primary, the first bar is orange when highlightFirst. */
  color?: string;
  href?: string;
}

export function BarList({ items, highlightFirst = true, empty }: { items: BarItem[]; highlightFirst?: boolean; empty: string }) {
  if (items.length === 0) return <p className="py-2 text-sm text-on-surface-variant">{empty}</p>;
  const max = Math.max(...items.map((i) => Math.abs(i.value)), 0) || 1;
  const orangeFirst = highlightFirst && items.length >= 2;
  return (
    <ul className="space-y-2.5">
      {items.map((it, i) => (
        <li key={it.key} className="min-w-0">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-1.5">
              {it.dot && <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: it.dot }} />}
              <span dir="auto" className="truncate text-on-surface" title={it.label}>
                {it.label}
              </span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-on-surface">{it.display}</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-container-high" aria-hidden="true">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${Math.max(2, (Math.abs(it.value) / max) * 100)}%`,
                  background: orangeFirst && i === 0 ? 'var(--color-accent-orange-500)' : it.color ?? 'var(--color-primary)',
                }}
              />
            </span>
            {it.sub && <span className="shrink-0 text-[11px] tabular-nums text-on-surface-variant">{it.sub}</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}
