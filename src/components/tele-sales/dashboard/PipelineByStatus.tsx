import type { ReactNode } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  Clock3,
  FilePen,
  FileText,
  Handshake,
  MessageCircle,
  PhoneCall,
  PhoneOff,
  TrendingUp,
  Workflow,
  XCircle,
} from 'lucide-react';
import { LEAD_STATUSES, LEAD_STATUS_WORKFLOW, STATUS_COLORS, STEPS } from '@/config/leadStatusWorkflow';
import type { LeadStatus, TeleSalesDashboardData } from '@/types/teleSales.types';
import { Panel, Skeleton } from './DashboardUi';

const ICON = 'h-3.5 w-3.5 shrink-0';
const STATUS_ICONS: Record<LeadStatus, ReactNode> = {
  'No Action': <CircleDashed className={ICON} />,
  'New Lead': <PhoneCall className={ICON} />,
  'No Answer': <PhoneOff className={ICON} />,
  'Call Back Later': <Clock3 className={ICON} />,
  'Wrong Number': <AlertTriangle className={ICON} />,
  'Interested': <TrendingUp className={ICON} />,
  'Follow-up': <MessageCircle className={ICON} />,
  'Meeting Scheduled': <CalendarClock className={ICON} />,
  'Under Preparation': <FilePen className={ICON} />,
  'Proposal Sent': <FileText className={ICON} />,
  'Negotiation': <Handshake className={ICON} />,
  'Closed Won': <CheckCircle2 className={ICON} />,
  'Closed Lost': <XCircle className={ICON} />,
};

// Every status grouped into the pipeline step it belongs to (the step numbers
// PipelineStepper uses), so the whole workflow shows — including empty steps.
const PIPELINE_STAGES = STEPS.map((label, step) => ({
  label,
  statuses: LEAD_STATUSES.filter((status) => LEAD_STATUS_WORKFLOW[status].step === step),
}));

/** Every record by status right now (follows the team / agent filter, not the period). */
export function PipelineByStatus({ byStatus }: { byStatus: TeleSalesDashboardData['snapshot']['byStatus'] }) {
  const countOf = (s: LeadStatus) => byStatus.find((r) => r.status === s)?.count ?? 0;
  const stageTotal = (statuses: LeadStatus[]) => statuses.reduce((sum, s) => sum + countOf(s), 0);
  const total = byStatus.reduce((n, r) => n + r.count, 0);
  const max = Math.max(1, ...PIPELINE_STAGES.map((s) => stageTotal(s.statuses)));

  return (
    <Panel
      title="Pipeline by status"
      icon={<Workflow className="h-4 w-4 text-primary" aria-hidden="true" />}
      action={<span className="text-[11px] text-on-surface-variant">{total.toLocaleString('en-US')} records right now (Data, Leads and Opportunities)</span>}
    >
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,150px),1fr))] gap-3">
        {PIPELINE_STAGES.map(({ label, statuses }) => {
          const stage = stageTotal(statuses);
          const pct = stage > 0 ? Math.max((stage / max) * 100, 6) : 0;
          return (
            <div key={label} className="flex min-w-0 flex-col gap-2 rounded-xl border border-outline-variant/10 bg-surface-container/40 p-3">
              <div>
                <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant" title={label}>
                  {label}
                </p>
                <p className="text-lg font-bold leading-tight tabular-nums text-on-surface">{stage.toLocaleString('en-US')}</p>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-outline-variant/15" aria-hidden="true">
                <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} />
              </div>
              <ul className="space-y-1">
                {statuses.map((status) => (
                  <li
                    key={status}
                    className={`flex items-center justify-between gap-1 rounded-lg px-2 py-1 text-[11px] font-medium ${STATUS_COLORS[status] ?? 'bg-surface-container-high text-on-surface-variant'}`}
                  >
                    <span className="flex min-w-0 items-center gap-1">
                      <span aria-hidden="true">{STATUS_ICONS[status]}</span>
                      <span className="truncate">{status}</span>
                    </span>
                    <span className="tabular-nums">{countOf(status).toLocaleString('en-US')}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

export function PipelineByStatusSkeleton() {
  return (
    <Panel title="Pipeline by status">
      <Skeleton className="h-40" />
    </Panel>
  );
}
