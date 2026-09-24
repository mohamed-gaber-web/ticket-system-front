import { cn } from '@/lib/utils';
import { PRIORITY_LABELS, type CardPriority } from '@/types/development.types';

const STYLES: Record<CardPriority, string> = {
  low: 'bg-surface-container-high text-on-surface-variant',
  medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  high: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  urgent: 'bg-accent-orange-100 text-accent-orange-700 dark:bg-accent-orange-900/40 dark:text-accent-orange-200',
};

export function PriorityBadge({ priority, className }: { priority: CardPriority; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        STYLES[priority] ?? STYLES.medium,
        className,
      )}
    >
      {PRIORITY_LABELS[priority] ?? priority}
    </span>
  );
}
