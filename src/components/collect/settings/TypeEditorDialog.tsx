import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { createContractType, updateContractType } from '@/api/collectApi';
import { ANCHOR_LABELS, BILLING_LABELS, apiError } from '@/lib/collect';
import { Field, INPUT, Modal, Select, TableBox, TD, TEXTAREA, TH } from '@/components/collect/CollectUi';
import type { BillingMode, ContractType, Phase, PhaseAnchor } from '@/types/collect.types';

const PHASES_SUM = 'مجموع نسب المراحل لازم يساوي 100%';

type Draft = Omit<ContractType, 'id' | 'key' | 'contractCount'>;

const blank = (): Draft => ({
  name: '',
  color: '#17694D',
  billingMode: 'phases',
  phases: [{ name: 'دفعة مقدمة', pct: 100, anchor: 'start', offset: 0 }],
  periodMonths: 3,
  payInAdvance: true,
  renewable: false,
  renewalUpliftPct: 0,
  needsGuarantee: false,
  defaultScope: '',
  paymentTerms: '',
  active: true,
});

const fromType = (t: ContractType): Draft => ({
  name: t.name,
  color: t.color,
  billingMode: t.billingMode,
  phases: t.phases.map((p) => ({ ...p })),
  periodMonths: t.periodMonths,
  payInAdvance: t.payInAdvance,
  renewable: t.renewable,
  renewalUpliftPct: t.renewalUpliftPct,
  needsGuarantee: t.needsGuarantee,
  defaultScope: t.defaultScope,
  paymentTerms: t.paymentTerms,
  active: t.active,
});

/** Create / edit a contract type (§9.9 أنواع العقود). `type` null = new. */
export function TypeEditorDialog({ open, type, onClose, onSaved }: { open: boolean; type: ContractType | null; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState<Draft>(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setD(type ? fromType(type) : blank());
  }, [open, type]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const setPhase = (i: number, p: Partial<Phase>) => set('phases', d.phases.map((x, k) => (k === i ? { ...x, ...p } : x)));
  const total = d.phases.reduce((a, p) => a + (Number(p.pct) || 0), 0);
  const sumOk = Math.abs(total - 100) < 0.001;

  const save = async () => {
    if (!d.name.trim()) return toast.error('اكتب اسم نوع العقد');
    if (d.billingMode === 'phases' && (!d.phases.length || !sumOk)) return toast.error(PHASES_SUM);
    setSaving(true);
    try {
      const body = { ...d, phases: d.billingMode === 'phases' ? d.phases : [] };
      if (type) await updateContractType(type.id, body);
      else await createContractType(body);
      toast.success('تم حفظ نوع العقد');
      onSaved();
      onClose();
    } catch (e) {
      toast.error(apiError(e, 'تعذر حفظ نوع العقد'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={type ? `تعديل نوع العقد — ${type.name}` : 'نوع عقد جديد'}
      footer={
        <>
          <Button onClick={() => void save()} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />} حفظ
          </Button>
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <Field label="اسم النوع" htmlFor="te-name" required>
          <input id="te-name" className={INPUT} value={d.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="اللون" htmlFor="te-color">
          <input id="te-color" type="color" className="h-10 w-16 cursor-pointer rounded-[0.5rem] bg-surface-container-high p-1" value={d.color} onChange={(e) => set('color', e.target.value)} />
        </Field>
        <Field label="طريقة الفوترة" htmlFor="te-mode">
          <Select id="te-mode" value={d.billingMode} onChange={(e) => set('billingMode', e.target.value as BillingMode)}>
            {(Object.keys(BILLING_LABELS) as BillingMode[]).map((m) => (
              <option key={m} value={m}>
                {BILLING_LABELS[m]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {d.billingMode === 'phases' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-on-surface">المراحل</h3>
            <span className={cn('text-sm font-bold tabular-nums', sumOk ? 'text-emerald-700 dark:text-emerald-300' : 'text-error')}>
              المجموع {Math.round(total * 100) / 100}%
            </span>
          </div>
          <TableBox className="bg-surface-container-low">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-outline-variant/40">
                  <th className={TH}>المرحلة</th>
                  <th className={TH}>النسبة %</th>
                  <th className={TH}>مرتبطة بـ</th>
                  <th className={TH}>+ أيام</th>
                  <th className={TH}>
                    <span className="sr-only">حذف</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {d.phases.map((p, i) => (
                  <tr key={i}>
                    <td className={TD}>
                      <input aria-label={`اسم المرحلة ${i + 1}`} className={INPUT} value={p.name} onChange={(e) => setPhase(i, { name: e.target.value })} />
                    </td>
                    <td className={cn(TD, 'w-24')}>
                      <input aria-label="النسبة" type="number" min={0} max={100} step="any" className={INPUT} value={p.pct} onChange={(e) => setPhase(i, { pct: Number(e.target.value) })} />
                    </td>
                    <td className={cn(TD, 'w-36')}>
                      <Select aria-label="مرتبطة بـ" value={p.anchor} onChange={(e) => setPhase(i, { anchor: e.target.value as PhaseAnchor })}>
                        {(Object.keys(ANCHOR_LABELS) as PhaseAnchor[]).map((a) => (
                          <option key={a} value={a}>
                            {ANCHOR_LABELS[a]}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className={cn(TD, 'w-24')}>
                      <input aria-label="أيام" type="number" className={INPUT} value={p.offset} onChange={(e) => setPhase(i, { offset: Math.round(Number(e.target.value)) })} />
                    </td>
                    <td className={TD}>
                      <Button type="button" size="icon-sm" variant="ghost" aria-label="حذف المرحلة" onClick={() => set('phases', d.phases.filter((_, k) => k !== i))}>
                        <Trash2 className="text-error" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableBox>
          {!sumOk && <p className="text-xs font-semibold text-error">{PHASES_SUM}</p>}
          <Button type="button" size="sm" variant="outline" onClick={() => set('phases', [...d.phases, { name: 'مرحلة جديدة', pct: 0, anchor: 'start', offset: 0 }])}>
            <Plus /> إضافة مرحلة
          </Button>
        </div>
      )}

      {d.billingMode !== 'phases' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="كل (شهور)" htmlFor="te-period">
            <input id="te-period" type="number" min={1} max={60} className={INPUT} value={d.periodMonths} onChange={(e) => set('periodMonths', Number(e.target.value))} />
          </Field>
          {d.billingMode === 'recurring' && (
            <Field label="موعد الاستحقاق" htmlFor="te-adv">
              <Select id="te-adv" value={d.payInAdvance ? 'start' : 'end'} onChange={(e) => set('payInAdvance', e.target.value === 'start')}>
                <option value="start">مقدمًا في بداية كل فترة</option>
                <option value="end">في نهاية كل فترة</option>
              </Select>
            </Field>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" className="accent-primary" checked={d.renewable} onChange={(e) => set('renewable', e.target.checked)} />
          قابل للتجديد (يظهر في تذكيرات التجديد وزر «تجديد العقد»)
        </label>
        {d.renewable && (
          <Field label="نسبة الزيادة عند التجديد %" htmlFor="te-uplift">
            <input id="te-uplift" type="number" min={0} step="any" className={INPUT} value={d.renewalUpliftPct} onChange={(e) => set('renewalUpliftPct', Number(e.target.value))} />
          </Field>
        )}
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" className="accent-primary" checked={d.needsGuarantee} onChange={(e) => set('needsGuarantee', e.target.checked)} />
          يتطلب شيك ضمان
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" className="accent-primary" checked={d.active} onChange={(e) => set('active', e.target.checked)} />
          نشط (يظهر عند إنشاء العقود)
        </label>
      </div>

      <Field label="نطاق العمل الافتراضي" htmlFor="te-scope" hint="سطر لكل بند — يُنسخ في العقد الجديد ويمكن تعديله">
        <textarea id="te-scope" rows={5} className={TEXTAREA} value={d.defaultScope} onChange={(e) => set('defaultScope', e.target.value)} />
      </Field>
      <Field label="شروط السداد الخاصة بالنوع" htmlFor="te-terms" hint="سطر لكل شرط — يمكن استخدام {{كل_شهور}} و {{نسبة_الزيادة}}">
        <textarea id="te-terms" rows={4} className={TEXTAREA} value={d.paymentTerms} onChange={(e) => set('paymentTerms', e.target.value)} />
      </Field>
    </Modal>
  );
}
