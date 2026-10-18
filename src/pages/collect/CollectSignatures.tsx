import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { collectChanged, openDrawer, setCollectUi, type CollectUi } from '@/redux/slices/collectSlice';
import { getContract, getSignatures, setChequeStatus } from '@/api/collectApi';
import {
  CHEQUE_KIND_LABELS,
  CHEQUE_STATUSES,
  CHEQUE_STATUS_LABELS,
  SIGNATURE_LABELS,
  addDays,
  apiError,
  days,
  fmtDate,
  compact,
  diffDays,
  money,
} from '@/lib/collect';
import { CollectLayout } from '@/components/collect/CollectLayout';
import { Chip, EmptyState, ErrorState, KPI_GRID, Kpi, Loading, Panel, Seg, Select, TableBox, TD, TDN, TH } from '@/components/collect/CollectUi';
import { ChequeDialog, FollowUpDialog } from '@/components/collect/CollectDialogs';
import type { Cheque, ContractDetail, SignaturesData } from '@/types/collect.types';

// Grow Path Collect — signatures & cheques (§9.7): unsigned contracts and their
// follow-ups, contracts missing a guarantee cheque, and every cheque.

type ChequeFilter = CollectUi['chequeFilter'];

export default function CollectSignatures() {
  const dispatch = useAppDispatch();
  const { ui, dataVersion } = useAppSelector((s) => s.collect);
  const [data, setData] = useState<SignaturesData | null>(null);
  const [today, setToday] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [chq, setChq] = useState<{ open: boolean; cheque: Cheque | null; contractId?: string; kind?: 'guarantee' | 'payment' }>({ open: false, cheque: null });
  const [follow, setFollow] = useState<ContractDetail | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await getSignatures();
      setData(res.data);
      setToday(res.today);
    } catch (e) {
      setError(apiError(e, 'Could not load data'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, dataVersion]);

  const changed = () => void dispatch(collectChanged());

  const chequeStatus = async (q: Cheque, status: Cheque['status']) => {
    try {
      const res = await setChequeStatus(q.id, status);
      if (res.returned) toast.warning(res.message ?? 'Cheque returned');
      else toast.success(res.message ?? 'Done');
      changed();
    } catch (e) {
      toast.error(apiError(e, 'Could not update the cheque'));
    }
  };

  const openFollowUp = async (id: string) => {
    try {
      setFollow(await getContract(id));
    } catch (e) {
      toast.error(apiError(e, 'Could not load the contract'));
    }
  };

  const cheques = useMemo(() => {
    const list = data?.cheques ?? [];
    const in30 = today ? addDays(today, 30) : '';
    const f: Record<ChequeFilter, (q: Cheque) => boolean> = {
      open: (q) => q.status === 'held' || q.status === 'deposited',
      due30: (q) => (q.status === 'held' || q.status === 'deposited') && !!q.dueDate && q.dueDate <= in30,
      guarantee: (q) => q.kind === 'guarantee' && q.status === 'held',
      returned: (q) => q.status === 'returned',
      closed: (q) => q.status === 'cleared' || q.status === 'released',
      all: () => true,
    };
    return list.filter(f[ui.chequeFilter]).sort((a, b) => String(a.dueDate ?? '9999').localeCompare(String(b.dueDate ?? '9999')));
  }, [data, ui.chequeFilter, today]);

  const k = data?.kpis;

  return (
    <CollectLayout>
      {error && !data ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : !data || !k ? (
        <Loading rows={6} />
      ) : (
        <>
          <div className={KPI_GRID}>
            <Kpi label="Contracts not fully signed" value={k.unsignedCount} sub={`Worth ${compact(k.unsignedValue)} EGP`} />
            <Kpi label="Follow-ups due today or late" value={k.followUpsDue} tone={k.followUpsDue ? 'crit' : undefined} />
            <Kpi label="Guarantee cheques in safe" value={compact(k.guaranteeValue)} sub={`${k.guaranteeCount} cheques · EGP`} />
            <Kpi label="Payment cheques due in 30 days" value={k.paymentDue30} tone={k.paymentDue30 ? 'warn' : undefined} />
            <Kpi label="Returned cheques" value={k.returned} tone={k.returned ? 'crit' : undefined} />
          </div>

          <Panel title="Contract signature follow-up" hint="Contracts not yet signed or whose original hasn’t been received, ordered by follow-up date.">
            {data.followups.length === 0 ? (
              <EmptyState title="All contracts are signed and originals received" />
            ) : (
              <TableBox>
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant/40">
                      <th className={TH}>Contract</th>
                      <th className={TH}>Status</th>
                      <th className={TH}>Sent</th>
                      <th className={TH}>Next follow-up</th>
                      <th className={TH}>Last note</th>
                      <th className={TH}>
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30">
                    {data.followups.map((f) => {
                      const late = f.followUpDate ? diffDays(today, f.followUpDate) : null;
                      return (
                        <tr key={f.id}>
                          <td className={cn(TD, 'min-w-[13rem]')}>
                            <p className="font-semibold text-on-surface">
                              {f.name} {f.version && <Chip tone="info">v{f.version}</Chip>}
                            </p>
                            <p className="text-xs text-on-surface-variant">
                              <span>{f.no}</span> · {f.customer.name}
                            </p>
                          </td>
                          <td className={TD}>
                            <Chip tone={f.signatureStatus === 'review' ? 'warn' : f.signatureStatus === 'signed' ? 'info' : 'neutral'}>{SIGNATURE_LABELS[f.signatureStatus]}</Chip>
                          </td>
                          <td className={cn(TD, 'whitespace-nowrap')}>
                            {fmtDate(f.sentAt)}
                            {f.sinceSent != null && <p className="text-xs text-on-surface-variant">{days(f.sinceSent)} ago</p>}
                          </td>
                          <td className={cn(TD, 'whitespace-nowrap', late != null && late > 0 && 'font-semibold text-error')}>
                            {fmtDate(f.followUpDate)}
                            {late != null && late > 0 && <p className="text-xs">{days(late)} late</p>}
                            {late === 0 && <p className="text-xs text-amber-700 dark:text-amber-300">Today</p>}
                          </td>
                          <td className={cn(TD, 'max-w-[18rem] text-xs text-on-surface-variant')}>{f.lastNote || '—'}</td>
                          <td className={cn(TD, 'whitespace-nowrap text-end')}>
                            <Button size="sm" variant="outline" onClick={() => void openFollowUp(f.id)}>
                              Follow up
                            </Button>{' '}
                            <Button size="sm" variant="ghost" onClick={() => dispatch(openDrawer(f.id))}>
                              Open
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TableBox>
            )}
          </Panel>

          {data.missingGuarantee.length > 0 && (
            <Panel title="Contracts that need a guarantee cheque">
              <ul className="divide-y divide-outline-variant/30">
                {data.missingGuarantee.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-2 py-2">
                    <button type="button" className="min-w-0 flex-1 text-start" onClick={() => dispatch(openDrawer(c.id))}>
                      <p className="font-semibold text-on-surface hover:underline">{c.name}</p>
                      <p className="text-xs text-on-surface-variant">
                        <span>{c.no}</span> · {c.customer.name} · {money(c.value, c.currency)}
                      </p>
                    </button>
                    <Button size="sm" onClick={() => setChq({ open: true, cheque: null, contractId: c.id, kind: 'guarantee' })}>
                      Record guarantee cheque
                    </Button>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel
            title="Cheques"
            action={
              <Button size="sm" onClick={() => setChq({ open: true, cheque: null })}>
                <Plus /> New cheque
              </Button>
            }
          >
            <Seg<ChequeFilter>
              label="Cheque view"
              value={ui.chequeFilter}
              onChange={(v) => dispatch(setCollectUi({ chequeFilter: v }))}
              options={[
                { value: 'open', label: 'Open' },
                { value: 'due30', label: 'Due in 30 days' },
                { value: 'guarantee', label: 'Guarantee cheques' },
                { value: 'returned', label: 'Returned' },
                { value: 'closed', label: 'Closed' },
                { value: 'all', label: 'All' },
              ]}
            />
            {cheques.length === 0 ? (
              <EmptyState title="No cheques in this view" />
            ) : (
              <TableBox>
                <table className="w-full min-w-[860px] text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant/40">
                      <th className={TH}>Cheque</th>
                      <th className={TH}>Customer / contract</th>
                      <th className={TH}>Type</th>
                      <th className={TH}>Amount</th>
                      <th className={TH}>Due</th>
                      <th className={TH}>Status</th>
                      <th className={TH}>
                        <span className="sr-only">Edit</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30">
                    {cheques.map((q) => {
                      const d = q.dueDate ? diffDays(q.dueDate, today) : null;
                      return (
                        <tr key={q.id}>
                          <td className={TD}>
                            <p className="font-semibold tabular-nums text-on-surface">
                              {q.number}
                            </p>
                            <p className="text-xs text-on-surface-variant">{q.bank || '—'}</p>
                          </td>
                          <td className={cn(TD, 'min-w-[12rem]')}>
                            <p className="text-on-surface">{q.customer.name}</p>
                            <button type="button" className="text-start text-xs text-primary hover:underline" onClick={() => dispatch(openDrawer(q.contract.id))}>
                              <span>{q.contract.no}</span> · {q.contract.name}
                            </button>
                          </td>
                          <td className={TD}>
                            <Chip tone={q.kind === 'guarantee' ? 'info' : 'neutral'}>{CHEQUE_KIND_LABELS[q.kind]}</Chip>
                          </td>
                          <td className={TDN}>{money(q.amount, q.currency)}</td>
                          <td className={cn(TD, 'whitespace-nowrap')}>
                            {fmtDate(q.dueDate)}
                            {d != null && (q.status === 'held' || q.status === 'deposited') && (
                              <p className={cn('text-xs', d < 0 ? 'text-error' : d <= 7 ? 'text-amber-700 dark:text-amber-300' : 'text-on-surface-variant')}>
                                {d < 0 ? `Due ${days(-d)} ago` : d === 0 ? 'Due today' : `In ${days(d)}`}
                              </p>
                            )}
                          </td>
                          <td className={TD}>
                            <Select aria-label="Cheque status" className="w-36" value={q.status} onChange={(e) => void chequeStatus(q, e.target.value as Cheque['status'])}>
                              {CHEQUE_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {CHEQUE_STATUS_LABELS[s]}
                                </option>
                              ))}
                            </Select>
                          </td>
                          <td className={cn(TD, 'text-end')}>
                            <Button size="sm" variant="ghost" onClick={() => setChq({ open: true, cheque: q })}>
                              Edit
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TableBox>
            )}
          </Panel>
        </>
      )}

      <ChequeDialog
        open={chq.open}
        cheque={chq.cheque}
        contractId={chq.contractId}
        kind={chq.kind}
        today={today}
        onClose={() => setChq({ open: false, cheque: null })}
        onDone={changed}
      />
      <FollowUpDialog contract={follow} open={!!follow} today={today} onClose={() => setFollow(null)} onDone={changed} />
    </CollectLayout>
  );
}
