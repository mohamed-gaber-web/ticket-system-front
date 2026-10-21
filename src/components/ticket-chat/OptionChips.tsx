import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChipOption {
  value: string;
  label: string;
}

interface OptionChipsProps {
  /** Group label, tied to the radiogroup for screen readers. */
  label: string;
  options: ChipOption[];
  value: string;
  onChange: (value: string) => void;
  /** When true, the AI-suggested option carries a subtle highlight even before selection. */
  suggested?: string;
}

/**
 * A single-choice set of tap/keyboard chips (an accessible radiogroup).
 * Arrow keys move between chips; Space/Enter selects; a staggered entrance.
 */
export function OptionChips({ label, options, value, onChange, suggested }: OptionChipsProps) {
  const reduce = useReducedMotion();
  const labelId = `chips-${label.replace(/\s+/g, '-').toLowerCase()}`;

  const move = (dir: 1 | -1, from: number) => {
    const next = (from + dir + options.length) % options.length;
    onChange(options[next].value);
    document.getElementById(`${labelId}-opt-${next}`)?.focus();
  };

  return (
    <div role="radiogroup" aria-labelledby={labelId} className="space-y-1.5">
      <p id={labelId} className="text-xs font-semibold text-on-surface-variant">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt, i) => {
          const selected = opt.value === value;
          const isSuggested = suggested && opt.value === suggested && !value;
          return (
            <motion.button
              key={opt.value}
              id={`${labelId}-opt-${i}`}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected || (!value && i === 0) ? 0 : -1}
              onClick={() => onChange(opt.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  move(1, i);
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  move(-1, i);
                }
              }}
              initial={reduce ? false : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28, delay: reduce ? 0 : i * 0.03 }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                selected
                  ? 'border-transparent bg-primary text-primary-foreground shadow-sm'
                  : isSuggested
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-outline-variant/50 bg-surface-container text-on-surface hover:bg-surface-container-high'
              )}
            >
              {selected && <Check className="h-3 w-3" />}
              {opt.label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
