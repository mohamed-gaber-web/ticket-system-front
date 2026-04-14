import { useState, useRef, useEffect, useMemo } from 'react';
import { Check, X, Search, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MultiSelectItem {
  _id: string;
  name: string;
}

interface MultiSelectProps {
  items: MultiSelectItem[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  loading?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
}

export function MultiSelect({
  items,
  value,
  onChange,
  placeholder = 'Select items...',
  loading = false,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No items found',
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => items.filter((item) => item.name.toLowerCase().includes(search.toLowerCase())),
    [items, search]
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
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  const remove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== id));
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const selectedItems = items.filter((item) => value.includes(item._id));

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
          {selectedItems.length === 0 ? (
            <span className="text-on-surface-variant">
              {loading ? 'Loading...' : placeholder}
            </span>
          ) : (
            selectedItems.map((item) => (
              <span
                key={item._id}
                className="inline-flex items-center gap-1 bg-brand-50 border border-brand-200 text-brand-700 rounded-full px-2 py-0.5 text-xs font-medium select-none"
              >
                {item.name}
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(e) => remove(e, item._id)}
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
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-surface-container-low rounded-lg outline-none placeholder:text-on-surface-variant"
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-52 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-sm text-on-surface-variant">
                {emptyMessage}
              </div>
            ) : (
              filtered.map((item) => {
                const selected = value.includes(item._id);
                return (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => toggle(item._id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-[0.5rem] text-left transition-colors',
                      'hover:bg-surface-container-low',
                      selected && 'bg-brand-50'
                    )}
                  >
                    <span className="flex-1 text-sm text-on-surface">{item.name}</span>
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
          {value.length > 0 && (
            <div className="px-3 py-2 border-t border-surface-container-high flex items-center justify-between">
              <span className="text-xs text-on-surface-variant">
                {value.length} item{value.length > 1 ? 's' : ''} selected
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
