import { LEAD_STATUS_WORKFLOW } from '@/config/leadStatusWorkflow';
import type { LeadStatus } from '@/types/teleSales.types';

/**
 * A lead status as a coloured label — the same colours the Calls and Status
 * History tabs use, taken from the workflow config so every screen agrees.
 */
export function LeadStatusBadge({ status, size = 'md' }: { status: LeadStatus; size?: 'sm' | 'md' }) {
  const cfg = LEAD_STATUS_WORKFLOW[status];
  const sizing = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full ${sizing}`}
      style={{ background: cfg?.bg ?? '#f3f4f6', color: cfg?.color ?? '#4b5563' }}
      title={cfg?.desc}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg?.color ?? '#4b5563' }} aria-hidden />
      {status}
    </span>
  );
}
