import { useState, useRef, useEffect, useCallback } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  variant?: 'form' | 'filter';
  label?: string;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  className,
  variant = 'form',
  label,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find((o) => o.value === value);
  const displayText = selectedOption?.label || placeholder;
  const listboxId = useRef(`listbox-${Math.random().toString(36).slice(2, 9)}`).current;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Set highlighted index when opening
  useEffect(() => {
    if (open) {
      const selectedIdx = options.findIndex((o) => o.value === value);
      setHighlightedIndex(selectedIdx >= 0 ? selectedIdx : 0);
    }
  }, [open, options, value]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (open && highlightedIndex >= 0) {
          onChange(options[highlightedIndex].value);
          setOpen(false);
          triggerRef.current?.focus();
        } else {
          setOpen(true);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!open) {
          setOpen(true);
        } else {
          setHighlightedIndex((prev) => Math.min(prev + 1, options.length - 1));
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!open) {
          setOpen(true);
        } else {
          setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        }
        break;
      case 'Home':
        e.preventDefault();
        if (open) setHighlightedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        if (open) setHighlightedIndex(options.length - 1);
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        break;
      case 'Tab':
        setOpen(false);
        break;
    }
  }, [disabled, open, highlightedIndex, options, onChange]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const triggerProps = {
    ref: triggerRef,
    type: 'button' as const,
    role: 'combobox' as const,
    'aria-expanded': open,
    'aria-haspopup': 'listbox' as const,
    'aria-controls': open ? listboxId : undefined,
    'aria-label': label || placeholder,
    disabled,
    onKeyDown: handleKeyDown,
    onClick: () => !disabled && setOpen(!open),
  };

  if (variant === 'filter') {
    const isActive = Boolean(value);
    return (
      <div className={cn('relative', className)} ref={ref}>
        <button
          {...triggerProps}
          className={cn(
            'flex items-center justify-between gap-2 w-full px-4 py-2.5 rounded-[1rem] text-sm font-semibold transition-all cursor-pointer',
            isActive
              ? 'bg-primary text-white'
              : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <span className="truncate">{label ? `${label}: ${displayText}` : displayText}</span>
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 transition-transform duration-200',
              open && 'rotate-180',
              isActive ? 'text-white/70' : 'text-on-surface-variant'
            )}
            aria-hidden="true"
          />
        </button>
        {open && (
          <DropdownPanel
            listboxId={listboxId}
            options={options}
            value={value}
            highlightedIndex={highlightedIndex}
            onSelect={handleSelect}
            onHighlight={setHighlightedIndex}
          />
        )}
      </div>
    );
  }

  // Form variant
  return (
    <div className={cn('relative', className)} ref={ref}>
      <button
        {...triggerProps}
        className={cn(
          'flex items-center justify-between w-full h-10 px-3 rounded-[0.5rem] bg-surface-container-high text-sm transition-all text-left',
          open && 'ring-[2px] ring-primary/40',
          !selectedOption && 'text-on-surface-variant/50',
          selectedOption && 'text-on-surface',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-on-surface-variant shrink-0 ml-2 transition-transform duration-200',
            open && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>
      {open && (
        <DropdownPanel
          listboxId={listboxId}
          options={options}
          value={value}
          highlightedIndex={highlightedIndex}
          onSelect={handleSelect}
          onHighlight={setHighlightedIndex}
        />
      )}
    </div>
  );
}

// ─── MultiSelect ────────────────────────────────────────────────────────────

interface MultiSelectProps {
  values: string[];
  onChange: (values: string[]) => void;
  options: SelectOption[];
  label?: string;
  className?: string;
}

export function MultiSelect({ values, onChange, options, label, className }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isActive = values.length > 0;

  const displayText =
    values.length === 0
      ? 'All'
      : values.length === 1
        ? (options.find((o) => o.value === values[0])?.label ?? '1 selected')
        : `${values.length} selected`;

  const handleToggle = (value: string) => {
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);
  };

  return (
    <div className={cn('relative', className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center justify-between gap-2 w-full px-4 py-2.5 rounded-[1rem] text-sm font-semibold transition-all cursor-pointer',
          isActive
            ? 'bg-primary text-white'
            : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
        )}
      >
        <span className="truncate flex items-center gap-1.5">
          {label ? `${label}: ${displayText}` : displayText}
          {values.length > 1 && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-white/25 text-[10px] font-bold leading-none">
              {values.length}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 transition-transform duration-200',
            open && 'rotate-180',
            isActive ? 'text-white/70' : 'text-on-surface-variant'
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          ref={listRef}
          className="absolute top-full left-0 mt-1.5 min-w-[200px] max-h-[260px] overflow-y-auto py-1 rounded-[0.75rem] glass shadow-ambient z-50 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {values.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full text-left px-3.5 py-2 text-xs font-semibold text-primary hover:bg-surface-container-highest transition-colors border-b border-border/40 mb-1"
            >
              Clear selection ({values.length})
            </button>
          )}
          {options.filter((o) => o.value !== '').map((option) => {
            const isSelected = values.includes(option.value);
            return (
              <div
                key={option.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleToggle(option.value)}
                className={cn(
                  'flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors cursor-pointer',
                  isSelected
                    ? 'text-primary font-semibold bg-primary-fixed/30'
                    : 'text-on-surface font-medium hover:bg-surface-container-highest'
                )}
              >
                <div
                  className={cn(
                    'h-4 w-4 rounded-[4px] border-2 flex items-center justify-center shrink-0 transition-colors',
                    isSelected ? 'bg-primary border-primary' : 'border-input bg-transparent'
                  )}
                >
                  {isSelected && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                </div>
                <span className="truncate">{option.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Single-select DropdownPanel (used by CustomSelect) ─────────────────────

function DropdownPanel({
  listboxId,
  options,
  value,
  highlightedIndex,
  onSelect,
  onHighlight,
}: {
  listboxId: string;
  options: SelectOption[];
  value: string;
  highlightedIndex: number;
  onSelect: (value: string) => void;
  onHighlight: (index: number) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current && highlightedIndex >= 0) {
      const items = listRef.current.querySelectorAll('[role="option"]');
      items[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  return (
    <div
      ref={listRef}
      id={listboxId}
      role="listbox"
      aria-label="Options"
      className="absolute top-full left-0 right-0 mt-1.5 min-w-[180px] max-h-[240px] overflow-y-auto py-1 rounded-[0.75rem] glass shadow-ambient z-50 animate-in fade-in slide-in-from-top-1 duration-150"
    >
      {options.map((option, index) => {
        const isSelected = option.value === value;
        const isHighlighted = index === highlightedIndex;
        return (
          <div
            key={option.value}
            role="option"
            aria-selected={isSelected}
            data-highlighted={isHighlighted}
            onClick={() => onSelect(option.value)}
            onMouseEnter={() => onHighlight(index)}
            className={cn(
              'w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm transition-colors cursor-pointer',
              isSelected
                ? 'text-primary font-semibold bg-primary-fixed/40'
                : 'text-on-surface font-medium',
              isHighlighted && !isSelected && 'bg-surface-container-highest',
            )}
          >
            <span className="truncate">{option.label}</span>
            {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />}
          </div>
        );
      })}
    </div>
  );
}
