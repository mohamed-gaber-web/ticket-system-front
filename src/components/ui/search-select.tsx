import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchSelectOption {
  value: string;
  label: string;
  /** Secondary line under the label (e.g. email, date range). */
  sub?: string;
}

interface SearchSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchSelectOption[];
  placeholder?: string;
  /** Shown above the control. */
  label?: string;
  /** Leading icon inside the trigger. */
  icon?: React.ReactNode;
  /** Text of the built-in "any" option; omit to hide it. */
  allLabel?: string;
  disabled?: boolean;
  className?: string;
  /** Options above this count get the search box (default 6). */
  searchThreshold?: number;
}

/**
 * Single-select with a built-in search box for long lists (customers, staff,
 * weeks…). Keyboard: ↑/↓ to move, Enter to pick, Esc to close.
 */
export function SearchSelect({
  value, onChange, options, placeholder = 'Select…', label, icon, allLabel, disabled = false, className, searchThreshold = 6,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value);
  const showSearch = options.length > searchThreshold;

  const items = useMemo<SearchSelectOption[]>(() => {
    const s = q.trim().toLowerCase();
    const base = s ? options.filter((o) => `${o.label} ${o.sub ?? ''}`.toLowerCase().includes(s)) : options;
    const head = allLabel && !s ? [{ value: '', label: allLabel }] : [];
    return [...head, ...base.slice(0, 200)];
  }, [options, q, allLabel]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => { if (open) { setQ(''); setHi(Math.max(0, items.findIndex((o) => o.value === value))); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setHi(0); }, [q]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${hi}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [hi]);

  const pick = (v: string) => { onChange(v); setOpen(false); };

  const onKey = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setOpen(true); return; }
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(items.length - 1, h + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (items[hi]) pick(items[hi].value); }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
  };

  return (
    <div ref={ref} className={cn('relative', className)} onKeyDown={onKey}>
      {label && <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-1">{label}</label>}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 rounded-lg border bg-surface text-sm text-left transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60',
          selected ? 'border-primary/50 text-on-surface' : 'border-outline-variant text-on-surface-variant/70',
          selected && 'bg-primary/5'
        )}
      >
        {icon && <span className="shrink-0 text-on-surface-variant">{icon}</span>}
        <span className="flex-1 truncate">{selected ? selected.label : placeholder}</span>
        {selected && !disabled && (
          <span
            role="button"
            aria-label="Clear"
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            className="p-0.5 rounded hover:bg-surface-container text-on-surface-variant"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        )}
        <ChevronDown className={cn('w-4 h-4 shrink-0 text-on-surface-variant transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[14rem] rounded-lg border border-outline-variant bg-surface-container-lowest shadow-lg">
          {showSearch && (
            <div className="p-2 border-b border-outline-variant/20 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Type to search…"
                className="w-full pl-8 pr-3 py-1.5 rounded-md border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          )}
          <ul ref={listRef} role="listbox" className="max-h-64 overflow-y-auto py-1">
            {items.length === 0 && <li className="px-3 py-2 text-xs text-on-surface-variant">No matches</li>}
            {items.map((o, i) => {
              const active = o.value === value;
              return (
                <li key={o.value || '__all'} data-idx={i}>
                  <button
                    type="button"
                    onMouseEnter={() => setHi(i)}
                    onClick={() => pick(o.value)}
                    className={cn(
                      'w-full flex items-center gap-2 text-left px-3 py-1.5 text-sm',
                      i === hi ? 'bg-surface-container-low' : '',
                      active ? 'font-semibold text-primary' : 'text-on-surface'
                    )}
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block truncate">{o.label}</span>
                      {o.sub && <span className="block text-[11px] text-on-surface-variant truncate">{o.sub}</span>}
                    </span>
                    {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
