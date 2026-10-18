import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { collectChanged } from '@/redux/slices/collectSlice';
import { deleteContractType, getContractTypes } from '@/api/collectApi';
import { ANCHOR_LABELS, BILLING_LABELS, apiError } from '@/lib/collect';
import { Chip, ConfirmButton, EmptyState, ErrorState, Loading, Panel, TableBox, TD, TDN, TH, TypeDot } from '@/components/collect/CollectUi';
import { ReadOnlyNote } from './ReadOnlyNote';
import { TypeEditorDialog } from './TypeEditorDialog';
import type { ContractType } from '@/types/collect.types';

const billingSummary = (t: ContractType) => {
  if (t.billingMode === 'phases') return t.phases.map((p) => `${p.pct}% ${ANCHOR_LABELS[p.anchor]}${p.offset ? ` ${p.offset > 0 ? '+' : ''}${p.offset}d` : ''}`).join(' · ');
  if (t.billingMode === 'recurring') return `Every ${t.periodMonths} months — ${t.payInAdvance ? 'in advance' : 'at period end'}`;
  return `One payment every ${t.periodMonths} months`;
};

/** Settings › Contract types */
export function TypesSettings() {
  const dispatch = useAppDispatch();
  const canAdmin = useAppSelector((s) => !!s.collect.meta?.canAdmin);
  const [types, setTypes] = useState<ContractType[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ContractType | null | 'new'>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setTypes(await getContractTypes());
    } catch (e) {
      setError(apiError(e, 'Could not load the contract types'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const changed = () => {
    void load();
    void dispatch(collectChanged());
  };

  const remove = async (t: ContractType) => {
    try {
      await deleteContractType(t.id);
      toast.success('Contract type deleted');
      changed();
    } catch (e) {
      toast.error(apiError(e, 'Could not delete the contract type'));
    }
  };

  return (
    <Panel
      title="Contract types"
      hint="The type decides how installments are generated, its payment terms and the default scope of work."
      action={
        canAdmin ? (
          <Button onClick={() => setEditing('new')}>
            <Plus /> New type
          </Button>
        ) : undefined
      }
    >
      {!canAdmin && <ReadOnlyNote />}
      {error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : !types ? (
        <Loading />
      ) : types.length === 0 ? (
        <EmptyState title="No contract types" />
      ) : (
        <TableBox>
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-outline-variant/40">
              <tr>
                <th className={TH}>Type</th>
                <th className={TH}>Billing</th>
                <th className={TH}>Installments</th>
                <th className={TH}>Renewal</th>
                <th className={TH}>Guarantee cheque</th>
                <th className={TH}>Contracts</th>
                {canAdmin && (
                  <th className={TH}>
                    <span className="sr-only">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {types.map((t) => (
                <tr key={t.id}>
                  <td className={TD}>
                    <span className="inline-flex items-center gap-2 font-semibold text-on-surface">
                      <TypeDot color={t.color} /> {t.name}
                    </span>
                    {!t.active && <Chip className="ms-2">Inactive</Chip>}
                  </td>
                  <td className={TD}>{BILLING_LABELS[t.billingMode]}</td>
                  <td className={`${TD} max-w-[18rem] text-xs text-on-surface-variant`}>{billingSummary(t)}</td>
                  <td className={TD}>{t.renewable ? <Chip tone="info">+{t.renewalUpliftPct}%</Chip> : '—'}</td>
                  <td className={TD}>{t.needsGuarantee ? <Chip tone="warn">Required</Chip> : '—'}</td>
                  <td className={TDN}>{t.contractCount ?? 0}</td>
                  {canAdmin && (
                    <td className={TD}>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => setEditing(t)}>
                          <Pencil /> Edit
                        </Button>
                        <span title={t.contractCount ? 'A type used by contracts can’t be deleted' : undefined}>
                          <ConfirmButton onConfirm={() => remove(t)} disabled={!!t.contractCount} />
                        </span>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </TableBox>
      )}
      <TypeEditorDialog open={editing !== null} type={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={changed} />
    </Panel>
  );
}
