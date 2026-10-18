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
  if (t.billingMode === 'phases') return t.phases.map((p) => `${p.pct}% ${ANCHOR_LABELS[p.anchor]}${p.offset ? ` ${p.offset > 0 ? '+' : ''}${p.offset} يوم` : ''}`).join(' · ');
  if (t.billingMode === 'recurring') return `كل ${t.periodMonths} شهور — ${t.payInAdvance ? 'مقدمًا' : 'في نهاية الفترة'}`;
  return `دفعة واحدة كل ${t.periodMonths} شهرًا`;
};

/** الإعدادات › أنواع العقود */
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
      setError(apiError(e, 'تعذر تحميل أنواع العقود'));
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
      toast.success('تم حذف نوع العقد');
      changed();
    } catch (e) {
      toast.error(apiError(e, 'تعذر حذف نوع العقد'));
    }
  };

  return (
    <Panel
      title="أنواع العقود"
      hint="النوع يحدد طريقة توليد الدفعات وشروط السداد ونطاق العمل الافتراضي."
      action={
        canAdmin ? (
          <Button onClick={() => setEditing('new')}>
            <Plus /> نوع جديد
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
        <EmptyState title="لا توجد أنواع عقود" />
      ) : (
        <TableBox>
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-outline-variant/40">
              <tr>
                <th className={TH}>النوع</th>
                <th className={TH}>طريقة الفوترة</th>
                <th className={TH}>الدفعات</th>
                <th className={TH}>التجديد</th>
                <th className={TH}>شيك ضمان</th>
                <th className={TH}>العقود</th>
                {canAdmin && (
                  <th className={TH}>
                    <span className="sr-only">إجراءات</span>
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
                    {!t.active && <Chip className="ms-2">غير نشط</Chip>}
                  </td>
                  <td className={TD}>{BILLING_LABELS[t.billingMode]}</td>
                  <td className={`${TD} max-w-[18rem] text-xs text-on-surface-variant`}>{billingSummary(t)}</td>
                  <td className={TD}>{t.renewable ? <Chip tone="info">+{t.renewalUpliftPct}%</Chip> : '—'}</td>
                  <td className={TD}>{t.needsGuarantee ? <Chip tone="warn">مطلوب</Chip> : '—'}</td>
                  <td className={TDN}>{t.contractCount ?? 0}</td>
                  {canAdmin && (
                    <td className={TD}>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => setEditing(t)}>
                          <Pencil /> تعديل
                        </Button>
                        <span title={t.contractCount ? 'لا يمكن حذف نوع مستخدم في عقود' : undefined}>
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
