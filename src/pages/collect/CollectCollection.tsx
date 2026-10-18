import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { collectChanged, openDrawer, setCollectUi } from '@/redux/slices/collectSlice';
import { getCollection } from '@/api/collectApi';
import { apiError, arDate, money, n0 } from '@/lib/collect';
import { CollectLayout } from '@/components/collect/CollectLayout';
import { Chip, EmptyState, ErrorState, INPUT, Loading, Panel, Seg, TableBox, TD, TDN, TH } from '@/components/collect/CollectUi';
import { PaymentDialog, type PaymentTarget } from '@/components/collect/CollectDialogs';
import type { CollectionFilter, CollectionResult } from '@/types/collect.types';

// Grow Path Collect — التحصيل (§5, §9.6): installments to collect, with
// "تسجيل تحصيل". `?customer=` narrows to one customer (from the analysis).

const FILTERS: { value: CollectionFilter; label: string }[] = [
  { value: 'overdue', label: 'المتأخر' },
  { value: 'month', label: 'هذا الشهر' },
  { value: 'next30', label: 'القادم 30 يوم' },
  { value: 'next90', label: 'القادم 90 يوم' },
  { value: 'paid', label: 'المسدد' },
  { value: 'all', label: 'الكل' },
];

export default function CollectCollection() {
  const dispatch = useAppDispatch();
  const { ui, dataVersion, meta } = useAppSelector((s) => s.collect);
  const [params, setParams] = useSearchParams();
  const customer = params.get('customer') ?? '';
  const [res, setRes] = useState<CollectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [pay, setPay] = useState<PaymentTarget | null>(null);
  const filter = ui.collectionFilter;

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(q), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRes(await getCollection({ filter, q: search, customer }));
    } catch (e) {
      setError(apiError(e, 'تعذر تحميل التحصيل'));
    } finally {
      setLoading(false);
    }
  }, [filter, search, customer]);

  useEffect(() => {
    void load();
  }, [load, dataVersion]);

  const customerName = customer && res?.data[0]?.customer.id === customer ? res.data[0].customer.name : null;

  return (
    <CollectLayout>
      <Panel>
        <div className="flex flex-wrap items-center gap-2">
          <Seg<CollectionFilter>
            label="عرض"
            value={filter}
            onChange={(v) => dispatch(setCollectUi({ collectionFilter: v }))}
            options={FILTERS.map((f) => ({ ...f, count: res?.counts[f.value] }))}
          />
          <div className="relative min-w-0 flex-1 basis-52">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" aria-hidden="true" />
            <input className={cn(INPUT, 'pr-9')} value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالعميل أو رقم العقد أو الاسم" aria-label="بحث" />
          </div>
        </div>
        {customer && (
          <div className="flex items-center gap-2 text-sm">
            <Chip tone="info">العميل: {customerName ?? 'محدد'}</Chip>
            <Button size="sm" variant="ghost" onClick={() => setParams({})}>
              <X /> كل العملاء
            </Button>
          </div>
        )}
      </Panel>

      {error && !res ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : !res ? (
        <Loading rows={6} />
      ) : res.data.length === 0 ? (
        <Panel>
          <EmptyState title={filter === 'overdue' ? 'لا توجد دفعات متأخرة 🎉' : 'لا توجد دفعات في هذا العرض'} />
        </Panel>
      ) : (
        <Panel className={cn('p-0', loading && 'opacity-60')}>
          <TableBox>
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="border-b border-outline-variant/40">
                  <th className={TH}>العميل / العقد</th>
                  <th className={TH}>الدفعة</th>
                  <th className={TH}>الاستحقاق</th>
                  <th className={TH}>القيمة</th>
                  <th className={TH}>المحصل</th>
                  <th className={TH}>المتبقي</th>
                  <th className={TH}>الحالة</th>
                  <th className={TH}>
                    <span className="sr-only">إجراء</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {res.data.map((r) => (
                  <tr key={r.installmentId} className="hover:bg-surface-container-low/60">
                    <td className={cn(TD, 'min-w-[13rem]')}>
                      <p className="font-semibold text-on-surface">{r.customer.name}</p>
                      <button type="button" onClick={() => dispatch(openDrawer(r.contractId))} className="text-start text-xs text-primary hover:underline">
                        <span dir="ltr" className="ltr">{r.contractNo}</span> · {r.contractName}
                      </button>
                    </td>
                    <td className={cn(TD, 'max-w-[16rem]')}>{r.name}</td>
                    <td className={cn(TD, 'whitespace-nowrap')}>{arDate(r.dueDate)}</td>
                    <td className={TDN}>{money(r.amount, r.currency)}</td>
                    <td className={TDN}>{r.paid > 0 ? money(r.paid, r.currency) : '—'}</td>
                    <td className={cn(TDN, 'font-bold', r.late > 0 && r.remaining > 0.5 ? 'text-error' : 'text-on-surface')}>{money(r.remaining, r.currency)}</td>
                    <td className={TD}>
                      <Chip tone={r.status.tone}>{r.status.label}</Chip>
                    </td>
                    <td className={cn(TD, 'text-end')}>
                      {r.remaining > 0.5 && (
                        <Button
                          size="sm"
                          onClick={() =>
                            setPay({
                              contractId: r.contractId,
                              contractNo: r.contractNo,
                              customerName: r.customer.name,
                              currency: r.currency,
                              installmentId: r.installmentId,
                              installmentName: r.name,
                              remaining: r.remaining,
                            })
                          }
                        >
                          تسجيل تحصيل
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              {filter !== 'paid' && (
                <tfoot>
                  <tr className="border-t-2 border-outline-variant/60 font-bold">
                    <td className={TD} colSpan={5}>
                      إجمالي المتبقي ({res.data.length} دفعة) — بالجنيه المصري
                    </td>
                    <td className={TDN}>{n0(res.totalRemainingEGP)}</td>
                    <td className={TD} colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </TableBox>
        </Panel>
      )}

      <PaymentDialog target={pay} today={meta?.today ?? ''} onClose={() => setPay(null)} onDone={() => void dispatch(collectChanged())} />
    </CollectLayout>
  );
}
