import { useState, useRef, useEffect, useMemo } from 'react';
import { Check, X, Search, ChevronDown } from 'lucide-react';
import type { Consultant } from '@/types/consultant.types';
import { cn } from '@/lib/utils';

type ConsultantSelectProps = {
  consultants: Consultant[];
  loading?: boolean;
  placeholder?: string;
} & (
  | { multiple: true; value: string[]; onChange: (value: string[]) => void }
  | { multiple?: false; value: string; onChange: (value: string) => void }
);

function getInitials(c: Consultant) {
  return `${c.firstName[0] ?? ''}${c.lastName[0] ?? ''}`.toUpperCase();
}

const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-rose-500',
];

function avatarColor(id: string) {
  return AVATAR_COLORS[id.charCodeAt(id.length - 1) % AVATAR_COLORS.length];
}

export function ConsultantSelect({
  consultants,
  loading,
  placeholder = 'Select consultant...',
  ...props
}: ConsultantSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const isMultiple = props.multiple === true;
  const selectedIds: string[] = isMultiple
    ? (props.value as string[])
    : props.value
    ? [props.value as string]
    : [];

  const filtered = useMemo(
    () =>
      consultants.filter((c) =>
        `${c.firstName} ${c.lastName} ${c.email}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [consultants, search]
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (id: string) => {
    if (isMultiple) {
      const current = props.value as string[];
      const cb = props.onChange as (v: string[]) => void;
      cb(current.includes(id) ? current.filter((v) => v !== id) : [...current, id]);
    } else {
      const cb = props.onChange as (v: string) => void;
      cb((props.value as string) === id ? '' : id);
      setOpen(false);
      setSearch('');
    }
  };

  const remove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (isMultiple) {
      const cb = props.onChange as (v: string[]) => void;
      cb((props.value as string[]).filter((v) => v !== id));
    } else {
      (props.onChange as (v: string) => void)('');
    }
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMultiple) {
      (props.onChange as (v: string[]) => void)([]);
    }
  };

  const selectedConsultants = consultants.filter((c) => selectedIds.includes(c._id));

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => !loading && setOpen((v) => !v)}
        className={cn(
          'w-full min-h-11 px-3 py-2 flex items-center gap-2 rounded-[0.625rem] border',
          'bg-surface text-left text-sm transition-all duration-150',
          'border-input hover:border-brand-400',
          open
            ? 'border-brand-500 ring-2 ring-brand-500/20'
            : 'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
          loading && 'opacity-60 cursor-not-allowed'
        )}
      >
        <div className="flex-1 flex flex-wrap gap-1.5 items-center min-h-[28px]">
          {selectedConsultants.length === 0 ? (
            <span className="text-on-surface-variant">
              {loading ? 'Loading consultants…' : placeholder}
            </span>
          ) : (
            selectedConsultants.map((c) => (
              <span
                key={c._id}
                className="inline-flex items-center gap-1 bg-brand-50 border border-brand-200 text-brand-700 rounded-full pl-1 pr-1.5 py-0.5 text-xs font-medium select-none"
              >
                <span
                  className={cn(
                    'w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0',
                    avatarColor(c._id)
                  )}
                >
                  {getInitials(c)}
                </span>
                {c.firstName} {c.lastName}
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(e) => remove(e, c._id)}
                  className="ml-0.5 rounded-full hover:text-red-600 transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </span>
              </span>
            ))
          )}
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-on-surface-variant shrink-0 transition-transform duration-150',
            open && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown */}
      {open && !loading && (
        <div className="absolute z-50 top-[calc(100%+4px)] left-0 w-full rounded-[0.75rem] border border-surface-container-high bg-surface shadow-lg overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-surface-container-high">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant pointer-events-none" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-surface-container-low rounded-lg outline-none placeholder:text-on-surface-variant"
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-52 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-sm text-on-surface-variant">
                No consultants found
              </div>
            ) : (
              filtered.map((c) => {
                const selected = selectedIds.includes(c._id);
                return (
                  <button
                    key={c._id}
                    type="button"
                    onClick={() => toggle(c._id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-[0.5rem] text-left transition-colors',
                      'hover:bg-surface-container-low',
                      selected && 'bg-brand-50'
                    )}
                  >
                    {/* Avatar */}
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0',
                        avatarColor(c._id)
                      )}
                    >
                      {getInitials(c)}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-on-surface truncate">
                        {c.firstName} {c.lastName}
                      </p>
                      {c.position && (
                        <p className="text-xs text-brand-500 truncate font-medium">{c.position}</p>
                      )}
                      <p className="text-xs text-on-surface-variant truncate">{c.email}</p>
                    </div>
                    {/* Checkmark */}
                    <div
                      className={cn(
                        'w-4 h-4 shrink-0 rounded flex items-center justify-center transition-colors',
                        selected
                          ? 'bg-brand-600 border-brand-600 border'
                          : 'border border-surface-container-high'
                      )}
                    >
                      {selected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {isMultiple && selectedIds.length > 0 && (
            <div className="px-3 py-2 border-t border-surface-container-high flex items-center justify-between">
              <span className="text-xs text-on-surface-variant">
                {selectedIds.length} consultant{selectedIds.length > 1 ? 's' : ''} selected
              </span>
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-error hover:text-error/70 transition-colors font-medium"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
