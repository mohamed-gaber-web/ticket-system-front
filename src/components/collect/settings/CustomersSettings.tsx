import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppDispatch } from '@/redux/hooks/hooks';
import { collectChanged } from '@/redux/slices/collectSlice';
import { createCollectCustomer, getCollectCustomers, removeCollectCustomer, updateCollectCustomer } from '@/api/collectApi';
import { CURRENCIES, CURRENCY_LABELS, apiError } from '@/lib/collect';
import { ConfirmButton, EmptyState, ErrorState, Field, INPUT, Loading, Modal, Panel, Select, TableBox, TD, TDN, TH } from '@/components/collect/CollectUi';
import type { Currency, Customer, CustomerInput } from '@/types/collect.types';

const blank = (): CustomerInput => ({
  name: '',
  contactName: '',
  email: '',
  country: 'مصر',
  currency: 'EGP',
  accountManager: '',
  legalForm: '',
  cr: '',
  crOffice: '',
  taxNo: '',
  address: '',
  signer: '',
  signerTitle: '',
});

const inputOf = (c: Customer): CustomerInput => ({
  name: c.name,
  contactName: c.contactName ?? '',
  email: c.email ?? '',
  country: c.country ?? '',
  currency: c.currency ?? 'EGP',
  accountManager: c.accountManager ?? '',
  legalForm: c.legalForm ?? '',
  cr: c.cr ?? '',
  crOffice: c.crOffice ?? '',
  taxNo: c.taxNo ?? '',
  address: c.address ?? '',
  signer: c.signer ?? '',
  signerTitle: c.signerTitle ?? '',
});

const FIELDS: { key: keyof CustomerInput; label: string; ltr?: boolean; wide?: boolean }[] = [
  { key: 'contactName', label: 'جهة الاتصال' },
  { key: 'email', label: 'البريد الإلكتروني', ltr: true },
  { key: 'country', label: 'الدولة' },
  { key: 'accountManager', label: 'مدير الحساب' },
  { key: 'legalForm', label: 'الشكل القانوني' },
  { key: 'cr', label: 'رقم السجل التجاري', ltr: true },
  { key: 'crOffice', label: 'مكتب السجل التجاري' },
  { key: 'taxNo', label: 'الرقم الضريبي', ltr: true },
  { key: 'signer', label: 'اسم الموقّع' },
  { key: 'signerTitle', label: 'صفة الموقّع' },
  { key: 'address', label: 'العنوان', wide: true },
];

function CustomerDialog({ open, customer, onClose, onSaved }: { open: boolean; customer: Customer | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<CustomerInput>(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setF(customer ? inputOf(customer) : blank());
  }, [open, customer]);

  const set = <K extends keyof CustomerInput>(k: K, v: CustomerInput[K]) => setF((x) => ({ ...x, [k]: v }));

  const save = async () => {
    if (!f.name.trim()) {
      toast.error('اكتب اسم العميل');
      return;
    }
    setSaving(true);
    try {
      if (customer) await updateCollectCustomer(customer.id, f);
      else await createCollectCustomer(f);
      toast.success('تم حفظ العميل');
      onSaved();
      onClose();
    } catch (e) {
      toast.error(apiError(e, 'تعذر حفظ العميل'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={customer ? `تعديل العميل — ${customer.name}` : 'عميل جديد'}
      description="البيانات القانونية تُطبع في قسم الأطراف بالعقد."
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
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="اسم العميل" htmlFor="cu-name" required hint="لو الشركة موجودة في نظام التذاكر بنفس الاسم تُضاف لقائمة التحصيل">
          <input id="cu-name" className={INPUT} value={f.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="العملة" htmlFor="cu-cur">
          <Select id="cu-cur" value={f.currency} onChange={(e) => set('currency', e.target.value as Currency)}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c} — {CURRENCY_LABELS[c]}
              </option>
            ))}
          </Select>
        </Field>
        {FIELDS.map((x) => (
          <Field key={x.key} label={x.label} htmlFor={`cu-${x.key}`} className={x.wide ? 'sm:col-span-2' : undefined}>
            <input id={`cu-${x.key}`} dir={x.ltr ? 'ltr' : undefined} className={INPUT} value={f[x.key]} onChange={(e) => set(x.key, e.target.value as never)} />
          </Field>
        ))}
      </div>
    </Modal>
  );
}

/** الإعدادات › العملاء — open to every module user. */
export function CustomersSettings() {
  const dispatch = useAppDispatch();
  const [rows, setRows] = useState<Customer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Customer | null | 'new'>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setRows(await getCollectCustomers());
    } catch (e) {
      setError(apiError(e, 'تعذر تحميل العملاء'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const changed = () => {
    void load();
    void dispatch(collectChanged());
  };

  const remove = async (c: Customer) => {
    try {
      await removeCollectCustomer(c.id);
      toast.success('تم حذف العميل من قائمة التحصيل');
      changed();
    } catch (e) {
      toast.error(apiError(e, 'تعذر حذف العميل'));
    }
  };

  return (
    <Panel
      title="العملاء"
      hint="العملاء هم قائمة الشركات في نظام التذاكر؛ الحذف هنا يزيل العميل من التحصيل فقط ولا يحذف الشركة."
      action={
        <Button onClick={() => setEditing('new')}>
          <Plus /> عميل جديد
        </Button>
      }
    >
      {error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : !rows ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState title="لا يوجد عملاء بعد" hint="أضف عميلًا، أو اختر شركة عند إنشاء عقد جديد." />
      ) : (
        <TableBox>
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-outline-variant/40">
              <tr>
                <th className={TH}>العميل</th>
                <th className={TH}>الدولة</th>
                <th className={TH}>العملة</th>
                <th className={TH}>جهة الاتصال</th>
                <th className={TH}>البريد</th>
                <th className={TH}>مدير الحساب</th>
                <th className={TH}>العقود</th>
                <th className={TH}>
                  <span className="sr-only">إجراءات</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className={`${TD} font-semibold text-on-surface`}>{c.name}</td>
                  <td className={TD}>{c.country || '—'}</td>
                  <td className={TD}>{c.currency}</td>
                  <td className={TD}>{c.contactName || '—'}</td>
                  <td className={TD}>
                    {c.email ? <span dir="ltr">{c.email}</span> : <span className="text-amber-700 dark:text-amber-300">(بدون بريد)</span>}
                  </td>
                  <td className={TD}>{c.accountManager || '—'}</td>
                  <td className={TDN}>{c.contractCount ?? 0}</td>
                  <td className={TD}>
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => setEditing(c)}>
                        <Pencil /> تعديل
                      </Button>
                      <span title={c.contractCount ? 'لا يمكن حذف عميل له عقود' : undefined}>
                        <ConfirmButton onConfirm={() => remove(c)} disabled={!!c.contractCount} />
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableBox>
      )}
      <CustomerDialog open={editing !== null} customer={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={changed} />
    </Panel>
  );
}
