import { useState, useRef, useEffect } from 'react';
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
  label?: string; // For filter variant: shows "Label: Value"
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
  const ref = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);
  const displayText = selectedOption?.label || placeholder;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) {
      document.addEventListener('keydown', handler);
      return () => document.removeEventListener('keydown', handler);
    }
  }, [open]);

  if (variant === 'filter') {
    const isActive = Boolean(value);
    return (
      <div className={cn('relative', className)} ref={ref}>
        <button
          type="button"
          onClick={() => !disabled && setOpen(!open)}
          disabled={disabled}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-[1rem] text-sm font-semibold transition-all cursor-pointer',
            isActive
              ? 'bg-primary text-white'
              : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <span>{label ? `${label}: ${displayText}` : displayText}</span>
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 transition-transform duration-200',
              open && 'rotate-180',
              isActive ? 'text-white/70' : 'text-on-surface-variant'
            )}
          />
        </button>
        {open && <DropdownPanel options={options} value={value} onChange={onChange} onClose={() => setOpen(false)} />}
      </div>
    );
  }

  // Form variant
  return (
    <div className={cn('relative', className)} ref={ref}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
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
        />
      </button>
      {open && <DropdownPanel options={options} value={value} onChange={onChange} onClose={() => setOpen(false)} />}
    </div>
  );
}

function DropdownPanel({
  options,
  value,
  onChange,
  onClose,
}: {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll selected item into view on open
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.querySelector('[data-selected="true"]');
      if (selected) {
        selected.scrollIntoView({ block: 'nearest' });
      }
    }
  }, []);

  return (
    <div
      ref={listRef}
      className="absolute top-full left-0 right-0 mt-1.5 min-w-[180px] max-h-[240px] overflow-y-auto py-1 rounded-[0.75rem] glass shadow-ambient z-50 animate-in fade-in slide-in-from-top-1 duration-150"
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            data-selected={isSelected}
            onClick={() => {
              onChange(option.value);
              onClose();
            }}
            className={cn(
              'w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm transition-colors',
              isSelected
                ? 'text-primary font-semibold bg-primary-fixed/40'
                : 'text-on-surface hover:bg-surface-container-highest font-medium'
            )}
          >
            <span className="truncate">{option.label}</span>
            {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}
