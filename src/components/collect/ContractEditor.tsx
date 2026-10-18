import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { collectChanged, openDrawer, openEditor } from '@/redux/slices/collectSlice';
import { createContract, getCollectCustomers, getContract, getNextContractNo, updateContract } from '@/api/collectApi';
import { CURRENCIES, apiError, money, n0 } from '@/lib/collect';
import { billingSummary, generateInstallments, type DraftInstallment } from '@/lib/collectCalc';
import { Field, INPUT, Loading, Modal, Select, TEXTAREA, TableBox, TD, TH, Warning } from '@/components/collect/CollectUi';
import { ContractPdfDialog } from '@/components/collect/ContractPdfDialog';
import type { ContractDetail, Currency, Customer } from '@/types/collect.types';

// Grow Path Collect — the contract editor (§9.5): contract fields, the
// installment schedule (generated from the type, or edited by hand) and the
// scope / special terms. A new contract opens its PDF preview after saving.

interface Row extends Omit<DraftInstallment, 'amount'> {
  key: string;
  amount: string;
  paid: number;
}

interface Form {
  no: string;
  customer: string;
  type: string;
  name: string;
  value: string;
  currency: Currency;
  startDate: string;
  endDate: string;
  deliveryDate: string;
  scope: string;
  notes: string;
}

const EMPTY: Form = { no: '', customer: '', type: '', name: '', value: '', currency: 'EGP', startDate: '', endDate: '', deliveryDate: '', scope: '', notes: '' };

let rowSeq = 0;
const toRows = (list: DraftInstallment[]): Row[] => list.map((i) => ({ ...i, key: `r${++rowSeq}`, amount: String(i.amount), paid: 0 }));

export function ContractEditor() {
  const dispatch = useAppDispatch();
  const editorId = useAppSelector((s) => s.collect.ui.editorId);
  const types = useAppSelector((s) => s.collect.meta?.types ?? []);
  const isNew = editorId === 'new';
  const open = !!editorId;

  const [form, setForm] = useState<Form>(EMPTY);
  const [rows, setRows] = useState<Row[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pdfFor, setPdfFor] = useState<string | null>(null);
  const [original, setOriginal] = useState<ContractDetail | null>(null);

  const hasPayments = rows.some((r) => r.paid > 0);
  const type = types.find((t) => t.id === form.type) ?? null;

  useEffect(() => {
    if (!open) return;
    let live = true;
    setLoading(true);
    (async () => {
      try {
        const list = await getCollectCustomers(true);
        if (!live) return;
        setCustomers(list);
        if (isNew) {
          const no = await getNextContractNo();
          if (!live) return;
          setOriginal(null);
          setForm({ ...EMPTY, no });
          setRows([]);
        } else if (editorId) {
          const d = await getContract(editorId);
          if (!live) return;
          setOriginal(d);
          setForm({
            no: d.no,
            customer: d.customer.id,
            type: d.typeId,
            name: d.name,
            value: String(d.value),
            currency: d.currency,
            startDate: d.startDate,
            endDate: d.endDate ?? '',
            deliveryDate: d.deliveryDate ?? '',
            scope: d.scope,
            notes: d.notes,
          });
          setRows(d.installments.map((i) => ({ _id: i.id, key: i.id, name: i.name, dueDate: i.dueDate, amount: String(i.amount), paid: i.paid })));
        }
      } catch (e) {
        toast.error(apiError(e, 'تعذر تحميل العقد'));
        dispatch(openEditor(null));
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [open, isNew, editorId, dispatch]);

  const close = () => dispatch(openEditor(null));
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const regenerate = (f: Form = form, t = type) => {
    if (!t || hasPayments) return;
    setRows(toRows(generateInstallments({ value: Number(f.value) || 0, startDate: f.startDate, endDate: f.endDate, deliveryDate: f.deliveryDate }, t)));
  };

  const changeType = (id: string) => {
    const t = types.find((x) => x.id === id) ?? null;
    const prevType = types.find((x) => x.id === form.type);
    const next = { ...form, type: id };
    // Prefill the scope from the type while it is still the previous type's default (or empty).
    if (t && (!form.scope.trim() || form.scope === prevType?.defaultScope)) next.scope = t.defaultScope;
    setForm(next);
    if (!hasPayments && next.startDate && Number(next.value) > 0) regenerate(next, t);
  };

  const changeCustomer = (id: string) => {
    const c = customers.find((x) => x.id === id);
    setForm((f) => ({ ...f, customer: id, currency: hasPayments ? f.currency : c?.currency ?? f.currency }));
  };

  const sum = rows.reduce((a, r) => a + (Number(r.amount) || 0), 0);
  const value = Number(form.value) || 0;
  const diff = Math.round((value - sum) * 100) / 100;

  const missing = useMemo(() => {
    if (!form.customer) return 'اختر العميل';
    if (!form.type) return 'اختر نوع العقد';
    if (!form.name.trim()) return 'اكتب اسم العقد';
    if (!(value > 0)) return 'اكتب قيمة العقد';
    if (!form.startDate) return 'اختر تاريخ البداية';
    if (form.endDate && form.endDate < form.startDate) return 'تاريخ النهاية قبل تاريخ البداية';
    if (rows.some((r) => !r.name.trim() || !r.dueDate || !(Number(r.amount) >= 0))) return 'أكمل بيانات الدفعات';
    return null;
  }, [form, value, rows]);

  const save = async () => {
    if (missing) return;
    setSaving(true);
    const body = {
      ...form,
      value,
      installments: rows.map((r) => ({ ...(r._id ? { _id: r._id } : {}), name: r.name, dueDate: r.dueDate, amount: Number(r.amount) || 0 })),
    };
    try {
      const res = isNew ? await createContract(body) : await updateContract(editorId!, body);
      toast.success(res.message ?? 'تم الحفظ');
      void dispatch(collectChanged());
      dispatch(openEditor(null));
      dispatch(openDrawer(res.data.id));
      if (isNew) setPdfFor(res.data.id);
    } catch (e) {
      toast.error(apiError(e, 'تعذر حفظ العقد'));
    } finally {
      setSaving(false);
    }
  };

  const currencyLocked = hasPayments && !!original;

  return (
    <>
      <Modal
        open={open}
        onClose={close}
        xwide
        title={isNew ? 'عقد جديد' : `تعديل العقد ${form.no}`}
        footer={
          <>
            <Button onClick={() => void save()} disabled={saving || loading || !!missing} title={missing ?? undefined}>
              {saving && <Loader2 className="animate-spin" />} {isNew ? 'إنشاء العقد' : 'حفظ التعديلات'}
            </Button>
            <Button variant="ghost" onClick={close}>
              إلغاء
            </Button>
            {missing && !loading && <span className="text-xs text-on-surface-variant">{missing}</span>}
          </>
        }
      >
        {loading ? (
          <Loading rows={5} />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="رقم العقد" htmlFor="ce-no">
                <input id="ce-no" dir="ltr" className={`${INPUT} text-end`} value={form.no} onChange={(e) => set('no', e.target.value)} />
              </Field>
              <Field label="العميل" htmlFor="ce-customer" required>
                <Select id="ce-customer" value={form.customer} onChange={(e) => changeCustomer(e.target.value)}>
                  <option value="">اختر العميل</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="نوع العقد" htmlFor="ce-type" required>
                <Select id="ce-type" value={form.type} onChange={(e) => changeType(e.target.value)}>
                  <option value="">اختر النوع</option>
                  {types
                    .filter((t) => t.active || t.id === form.type)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </Select>
              </Field>
              <Field label="اسم العقد" htmlFor="ce-name" required className="sm:col-span-2 lg:col-span-3">
                <input id="ce-name" className={INPUT} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="مثال: تنفيذ D365 F&O — المالية" />
              </Field>
              <Field label="القيمة الإجمالية" htmlFor="ce-value" required>
                <input id="ce-value" type="number" min={0} step="any" className={INPUT} value={form.value} onChange={(e) => set('value', e.target.value)} />
              </Field>
              <Field label="العملة" htmlFor="ce-cur" hint={currencyLocked ? 'لا يمكن تغيير العملة بعد تسجيل تحصيلات' : undefined}>
                <Select id="ce-cur" value={form.currency} disabled={currencyLocked} onChange={(e) => set('currency', e.target.value as Currency)}>
                  {CURRENCIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
              <Field label="تاريخ البداية" htmlFor="ce-start" required>
                <input id="ce-start" type="date" className={INPUT} value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
              </Field>
              <Field label="تاريخ النهاية" htmlFor="ce-end" hint={type?.billingMode === 'recurring' && !form.endDate ? 'بدون تاريخ = 12 شهرًا' : undefined}>
                <input id="ce-end" type="date" className={INPUT} value={form.endDate} min={form.startDate || undefined} onChange={(e) => set('endDate', e.target.value)} />
              </Field>
              {type?.billingMode === 'phases' && (
                <Field label="تاريخ التسليم المتوقع" htmlFor="ce-delivery">
                  <input id="ce-delivery" type="date" className={INPUT} value={form.deliveryDate} onChange={(e) => set('deliveryDate', e.target.value)} />
                </Field>
              )}
            </div>
            {type && <p className="text-xs text-on-surface-variant">طريقة الفوترة: {billingSummary(type)}</p>}

            <section className="space-y-2 rounded-[0.75rem] bg-surface-container-low p-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="gpc-h me-auto text-sm font-semibold text-on-surface">الدفعات</h3>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!type || hasPayments || !form.startDate || !(value > 0)}
                  title={hasPayments ? 'يوجد تحصيلات مسجلة' : undefined}
                  onClick={() => regenerate()}
                >
                  <RefreshCw /> توليد الدفعات من نوع العقد
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRows((r) => [...r, { key: `r${++rowSeq}`, name: `دفعة ${r.length + 1}`, dueDate: form.startDate, amount: String(Math.max(0, diff)), paid: 0 }])}
                >
                  <Plus /> دفعة يدوية
                </Button>
              </div>
              <p className={cn('text-xs font-semibold tabular-nums', Math.abs(diff) > 0.5 ? 'text-error' : 'text-emerald-700 dark:text-emerald-300')}>
                مجموع الدفعات {money(sum, form.currency)} من {money(value, form.currency)}
                {Math.abs(diff) > 0.5 ? ` · فرق ${n0(diff)}` : ' ✓'}
              </p>
              {rows.length === 0 ? (
                <p className="py-3 text-center text-sm text-on-surface-variant">لا توجد دفعات بعد — اختر النوع والقيمة والتاريخ ثم «توليد الدفعات»، أو احفظ وسيتم توليدها تلقائيًا.</p>
              ) : (
                <TableBox>
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="border-b border-outline-variant/40">
                        <th className={TH}>البيان</th>
                        <th className={TH}>تاريخ الاستحقاق</th>
                        <th className={TH}>المبلغ</th>
                        <th className={TH}>
                          <span className="sr-only">حذف</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, idx) => {
                        const upd = (patch: Partial<Row>) => setRows((list) => list.map((x, k) => (k === idx ? { ...x, ...patch } : x)));
                        return (
                          <tr key={r.key}>
                            <td className="px-1 py-1">
                              <input aria-label="البيان" className={INPUT} value={r.name} onChange={(e) => upd({ name: e.target.value })} />
                            </td>
                            <td className="w-44 px-1 py-1">
                              <input aria-label="تاريخ الاستحقاق" type="date" className={INPUT} value={r.dueDate} onChange={(e) => upd({ dueDate: e.target.value })} />
                            </td>
                            <td className="w-40 px-1 py-1">
                              <input aria-label="المبلغ" type="number" min={0} step="any" className={INPUT} value={r.amount} onChange={(e) => upd({ amount: e.target.value })} />
                            </td>
                            <td className={cn(TD, 'w-10 px-1')}>
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                aria-label="حذف الدفعة"
                                title={r.paid > 0 ? 'عليها تحصيلات مسجلة' : 'حذف الدفعة'}
                                disabled={r.paid > 0}
                                onClick={() => setRows((list) => list.filter((_, k) => k !== idx))}
                              >
                                <Trash2 className="text-error" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </TableBox>
              )}
              {hasPayments && <Warning>بعض الدفعات عليها تحصيلات: لا يمكن حذفها أو إعادة توليد الجدول.</Warning>}
            </section>

            <div className="grid gap-3 lg:grid-cols-2">
              <Field label="نطاق العمل والمخرجات" htmlFor="ce-scope" hint="سطر لكل بند — يُطبع في بند «موضوع العقد ونطاق العمل»">
                <textarea id="ce-scope" rows={6} className={TEXTAREA} value={form.scope} onChange={(e) => set('scope', e.target.value)} />
              </Field>
              <Field label="شروط خاصة بهذا العقد" htmlFor="ce-notes" hint="تُطبع كبند مستقل">
                <textarea id="ce-notes" rows={6} className={TEXTAREA} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
              </Field>
            </div>
          </>
        )}
      </Modal>
      <ContractPdfDialog contractId={pdfFor} open={!!pdfFor} onClose={() => setPdfFor(null)} />
    </>
  );
}
