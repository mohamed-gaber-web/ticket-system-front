import type { ProposalStatus } from '@/types/proposal.types';
import { ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

const TONE: Record<ProposalStatus, string> = {
  Draft: 'bg-surface-container-high text-on-surface-variant',
  'Pending approval': 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  Approved: 'bg-primary/10 text-primary',
  Sent: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
  Accepted: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  Rejected: 'bg-error/10 text-error',
};

/** Admin hint on list rows waiting in Pending approval. */
export function NeedsYourApproval({ overLimit }: { overLimit?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-amber-700 dark:text-amber-300">
      <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" /> Needs your approval{overLimit ? ' · discount above limit' : ''}
    </span>
  );
}

export default function ProposalStatusBadge({ status, className }: { status: ProposalStatus; className?: string }) {
  return (
    <span className={cn('inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold', TONE[status] ?? TONE.Draft, className)}>
      {status}
    </span>
  );
}
