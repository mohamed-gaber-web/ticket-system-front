import { motion, useReducedMotion } from 'framer-motion';
import { Tag, Layers, Flag, Building2, FileText } from 'lucide-react';

export interface ReviewRow {
  icon: 'subject' | 'category' | 'serviceType' | 'priority' | 'customer';
  label: string;
  value: string;
}

const ICONS = {
  subject: FileText,
  category: Tag,
  serviceType: Layers,
  priority: Flag,
  customer: Building2,
} as const;

interface ReviewCardProps {
  subject: string;
  description: string;
  rows: ReviewRow[];
}

/** A compact, read-only summary of the ticket about to be created. */
export function ReviewCard({ subject, description, rows }: ReviewCardProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-4 shadow-sm"
    >
      <h4 className="text-sm font-semibold text-on-surface">{subject || 'Untitled ticket'}</h4>
      <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">{description}</p>
      <dl className="mt-3 grid grid-cols-1 gap-2 border-t border-outline-variant/20 pt-3">
        {rows.map((row) => {
          const Icon = ICONS[row.icon];
          return (
            <div key={row.label} className="flex items-center gap-2 text-xs">
              <Icon className="h-3.5 w-3.5 shrink-0 text-on-surface-variant" />
              <dt className="w-24 shrink-0 text-on-surface-variant">{row.label}</dt>
              <dd className="min-w-0 flex-1 truncate font-medium text-on-surface">{row.value || '—'}</dd>
            </div>
          );
        })}
      </dl>
    </motion.div>
  );
}
