import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BellRing, Handshake, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STAGE_META, STAGE_ORDER } from '@/lib/leadStages';
import { formatMoney, type TeleSalesDashboardData } from '@/types/teleSales.types';
import { InfoPopover, Skeleton } from './DashboardUi';

/** How a lead's value is worked out — was a block on the page, now behind the (i) next to Pipeline Value. */
function AmountExplainer({ ownTeamsOnly }: { ownTeamsOnly: boolean }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-semibold text-on-surface">How the amount is calculated</p>
      <p>
        Each lead has one value (shown on the lead page under <span className="font-medium text-on-surface">Lead Value</span>). It is
        the latest of:
      </p>
      <ol className="list-decimal space-y-0.5 pl-4">
        <li>
          <span className="font-medium text-on-surface">Potential Value</span> typed on Edit Lead (an estimate)
        </li>
        <li>
          <span className="font-medium text-on-surface">Quoted Value</span> entered when the status moves to Proposal Sent
        </li>
        <li>
          <span className="font-medium text-on-surface">Revised Value</span> entered at Negotiation
        </li>
        <li>
          <span className="font-medium text-on-surface">Final Deal Value</span> entered at Closed Won
        </li>
      </ol>
      <p>
        <span className="font-medium text-on-surface">Pipeline Value</span> adds the values of every open Lead and Opportunity (not
        Closed Won / Closed Lost) right now. <span className="font-medium text-on-surface">Won value</span> adds the deals Closed Won
        in the period.
      </p>
      <p>All in US dollars, only for the records you can see{ownTeamsOnly ? ' (your teams)' : ''} and the team / agent filter.</p>
    </div>
  );
}

function Tile({
  label,
  value,
  icon,
  tone,
  extra,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone?: 'bad';
  extra?: ReactNode;
}) {
  return (
    <div className={cn('flex min-w-0 items-start gap-3 rounded-xl bg-surface-container-low p-3', tone === 'bad' && 'ring-1 ring-error/40')}>
      <span
        className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', tone === 'bad' ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary')}
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
          <span className="truncate">{label}</span>
          {extra}
        </div>
        <p className={cn('truncate text-xl font-extrabold leading-tight tabular-nums', tone === 'bad' ? 'text-error' : 'text-on-surface')}>{value}</p>
      </div>
    </div>
  );
}

/** "Right now" figures — not bound to the period, but they follow the team / agent filter. */
export function SnapshotStrip({ snapshot, ownTeamsOnly }: { snapshot: TeleSalesDashboardData['snapshot']; ownTeamsOnly: boolean }) {
  const overdue = snapshot.followUpsOverdue;
  return (
    <section aria-label="Right now" className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-3 shadow-sm">
      <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">Right now</p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,190px),1fr))] gap-3">
        <Tile
          label="Pipeline value"
          value={formatMoney(snapshot.pipelineValue)}
          icon={<Wallet className="h-4 w-4" />}
          extra={
            <InfoPopover label="How the amount is calculated">
              <AmountExplainer ownTeamsOnly={ownTeamsOnly} />
            </InfoPopover>
          }
        />
        <Tile label="Open opportunities" value={snapshot.openOpportunities.toLocaleString('en-US')} icon={<Handshake className="h-4 w-4" />} />
        <Tile
          label="Overdue follow-ups"
          value={overdue.toLocaleString('en-US')}
          icon={<BellRing className="h-4 w-4" />}
          tone={overdue > 0 ? 'bad' : undefined}
        />
        <nav aria-label="Pipeline stages" className="grid min-w-0 grid-cols-3 gap-2">
          {STAGE_ORDER.map((s) => (
            <Link
              key={s}
              to={STAGE_META[s].path}
              className="min-w-0 rounded-xl bg-surface-container-low px-2 py-2 transition-colors hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <p className="truncate text-[11px] font-semibold text-on-surface-variant">{STAGE_META[s].plural}</p>
              <p className="truncate text-base font-extrabold tabular-nums text-on-surface">{(snapshot.byStage?.[s] ?? 0).toLocaleString('en-US')}</p>
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}

export function SnapshotStripSkeleton() {
  return <Skeleton className="h-[104px] rounded-2xl" />;
}
