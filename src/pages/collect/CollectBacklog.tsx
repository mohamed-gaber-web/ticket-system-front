import { useCallback, useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { openDrawer, openEditor, setCollectUi } from '@/redux/slices/collectSlice';
import { getContracts } from '@/api/collectApi';
import { CONTRACT_STATUS_LABELS, apiError, arDate, money, n0 } from '@/lib/collect';
import { CollectLayout } from '@/components/collect/CollectLayout';
import { Chip, EmptyState, ErrorState, INPUT, Loading, Panel, Progress, Seg, Select, TableBox, TD, TDN, TH, TypeDot } from '@/components/collect/CollectUi';
import type { ContractStatus, ContractSummary, Tone, Totals } from '@/types/collect.types';

// Grow Path Collect — الـBacklog (العقود) (§9.3). Row click opens the drawer.

const STATUS_TONE: Record<ContractStatus, Tone> = { active: 'ok', closed: 'neutral', renewed: 'info', cancelled: 'crit' };

export default function CollectBacklog() {
  const dispatch = useAppDispatch();
  const { meta, ui, dataVersion } = useAppSelector((s) => s.collect);
  const [rows, setRows] = useState<ContractSummary[] | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const types = meta?.types ?? [];
  const typeOf = (k: string) => types.find((t) => t.key === k);

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(q), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await getContracts({ status: ui.backlogStatus, type: ui.type, q: search });
      setRows(res.data);
      setTotals(res.totals);
    } catch (e) {
      setError(apiError(e, 'تعذر تحميل العقود'));
    }
  }, [ui.backlogStatus, ui.type, search]);

  useEffect(() => {
    void load();
  }, [load, dataVersion]);

  return (
    <CollectLayout>
      <Panel>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => dispatch(openEditor('new'))}>
            <Plus /> عقد جديد
          </Button>
          <div className="relative min-w-0 flex-1 basis-52">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" aria-hidden="true" />
            <input className={cn(INPUT, 'pr-9')} value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالعميل أو رقم العقد أو الاسم" aria-label="بحث" />
          </div>
          <Select aria-label="نوع العقد" className="w-44" value={ui.type} onChange={(e) => dispatch(setCollectUi({ type: e.target.value }))}>
            <option value="all">كل الأنواع</option>
            {types.map((t) => (
              <option key={t.key} value={t.key}>
                {t.name}
              </option>
            ))}
          </Select>
          <Seg
            label="حالة العقود"
            value={ui.backlogStatus}
            onChange={(v) => dispatch(setCollectUi({ backlogStatus: v }))}
            options={[
              { value: 'active', label: 'السارية' },
              { value: 'ended', label: 'المنتهية' },
              { value: 'all', label: 'الكل' },
            ]}
          />
        </div>
      </Panel>

      {error && !rows ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : !rows ? (
        <Loading rows={6} />
      ) : rows.length === 0 ? (
        <Panel>
          <EmptyState
            title="لا توجد عقود"
            hint="أضف أول عقد، أو استورد بياناتك من الإعدادات › البيانات."
            action={
              <Button className="mt-2" onClick={() => dispatch(openEditor('new'))}>
                <Plus /> عقد جديد
              </Button>
            }
          />
        </Panel>
      ) : (
        <Panel className="p-0">
          <TableBox>
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="border-b border-outline-variant/40">
                  <th className={TH}>العقد</th>
                  <th className={TH}>العميل</th>
                  <th className={TH}>النوع</th>
                  <th className={TH}>المدة</th>
                  <th className={TH}>القيمة</th>
                  <th className={TH}>المحصل</th>
                  <th className={TH}>المتبقي</th>
                  <th className={TH}>متأخر</th>
                  <th className={TH}>الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {rows.map((r) => {
                  const t = typeOf(r.typeKey);
                  return (
                    <tr
                      key={r.id}
                      tabIndex={0}
                      onClick={() => dispatch(openDrawer(r.id))}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), dispatch(openDrawer(r.id)))}
                      className="cursor-pointer outline-none hover:bg-surface-container-low focus-visible:bg-surface-container-low"
                    >
                      <td className={cn(TD, 'min-w-[14rem]')}>
                        <p className="font-semibold text-on-surface">{r.name}</p>
                        <p className="text-xs text-on-surface-variant">
                          <span dir="ltr" className="ltr">{r.no}</span> · {r.instCount} دفعات
                        </p>
                      </td>
                      <td className={TD}>{r.customer.name}</td>
                      <td className={TD}>
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                          <TypeDot color={t?.color} />
                          {t?.name ?? r.typeKey}
                        </span>
                      </td>
                      <td className={cn(TD, 'whitespace-nowrap text-xs text-on-surface-variant')}>
                        {arDate(r.startDate)}
                        <br />
                        {arDate(r.endDate)}
                      </td>
                      <td className={TDN}>{money(r.value, r.currency)}</td>
                      <td className={cn(TDN, 'min-w-[8rem]')}>
                        {money(r.collected, r.currency)}
                        <Progress value={r.collected} max={r.value} color={t?.color} />
                      </td>
                      <td className={cn(TDN, 'font-bold text-on-surface')}>{money(r.remaining, r.currency)}</td>
                      <td className={cn(TDN, r.overdue > 0.5 ? 'font-semibold text-error' : 'text-on-surface-variant')}>{r.overdue > 0.5 ? money(r.overdue, r.currency) : '—'}</td>
                      <td className={TD}>
                        <div className="flex max-w-[16rem] flex-wrap gap-1">
                          <Chip tone={STATUS_TONE[r.status]}>{CONTRACT_STATUS_LABELS[r.status]}</Chip>
                          {r.customized && <Chip tone="info">بنود مخصصة</Chip>}
                          {r.unsigned && <Chip tone="warn">{r.signatureStatus === 'signed' ? 'الأصل لم يُستلم' : 'غير موقّع'}</Chip>}
                          {r.needsGuarantee && <Chip tone="crit">بدون شيك ضمان</Chip>}
                          {r.renewInDays != null && r.renewInDays >= 0 && r.renewInDays <= 90 && <Chip tone="warn">تجديد خلال {r.renewInDays} يوم</Chip>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {totals && (
                <tfoot>
                  <tr className="border-t-2 border-outline-variant/60 font-bold">
                    <td className={TD} colSpan={4}>
                      الإجمالي ({rows.length} عقد) — بالجنيه المصري
                    </td>
                    <td className={TDN}>{n0(totals.value)}</td>
                    <td className={TDN}>{n0(totals.collected)}</td>
                    <td className={TDN}>{n0(totals.remaining)}</td>
                    <td className={cn(TDN, totals.overdue > 0.5 && 'text-error')}>{n0(totals.overdue)}</td>
                    <td className={TD} />
                  </tr>
                </tfoot>
              )}
            </table>
          </TableBox>
        </Panel>
      )}
    </CollectLayout>
  );
}
