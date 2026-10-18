import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  addPayment,
  addSignatureFollowUp,
  createCheque,
  deleteCheque,
  getContract,
  getContracts,
  moveSignature,
  renewContract,
  updateCheque,
} from '@/api/collectApi';
import {
  CHEQUE_KIND_LABELS,
  CHEQUE_STATUSES,
  CHEQUE_STATUS_LABELS,
  CURRENCIES,
  PAY_METHODS,
  SIGNATURE_LABELS,
  addDays,
  apiError,
  arDate,
  money,
} from '@/lib/collect';
import { ConfirmButton, Field, INPUT, Modal, Select, TEXTAREA, Warning } from '@/components/collect/CollectUi';
import type {
  Cheque,
  ChequeInput,
  ContractDetail,
  ContractSummary,
  Installment,
  SignatureStatus,
} from '@/types/collect.types';

// The small action dialogs of Grow Path Collect: record a payment, renew a
// contract, move the signature state, log a follow-up, add/edit a cheque.
// Each calls the API, toasts the server's message and hands back the result.

// ── تسجيل تحصيل ──────────────────────────────────────────────────────────────

export interface PaymentTarget {
  contractId: string;
  contractNo: string;
  customerName: string;
  currency: string;
  installmentId: string;
  installmentName: string;
  remaining: number;
}

export function PaymentDialog({ target, today, onClose, onDone }: { target: PaymentTarget | null; today: string; onClose: () => void; onDone: (d: ContractDetail) => void }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [method, setMethod] = useState(PAY_METHODS[0]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!target) return;
    setAmount(String(Math.round(target.remaining * 100) / 100));
    setDate(today);
    setMethod(PAY_METHODS[0]);
  }, [target, today]);

  const n = Number(amount);
  const invalid = !(n > 0) ? 'المبلغ لازم يكون أكبر من صفر' : target && n > target.remaining + 0.5 ? 'المبلغ أكبر من المتبقي' : null;

  const save = async () => {
    if (!target || invalid) return;
    setBusy(true);
    try {
      const res = await addPayment(target.contractId, target.installmentId, { amount: n, date, method });
      toast.success(res.message ?? 'تم تسجيل التحصيل');
      onDone(res.data);
      onClose();
    } catch (e) {
      toast.error(apiError(e, 'تعذر تسجيل التحصيل'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title="تسجيل تحصيل"
      description={target ? `${target.contractNo} · ${target.customerName} · ${target.installmentName}` : undefined}
      footer={
        <>
          <Button onClick={() => void save()} disabled={busy || !!invalid}>
            {busy && <Loader2 className="animate-spin" />} حفظ التحصيل
          </Button>
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
        </>
      }
    >
      {target && (
        <p className="text-sm text-on-surface-variant">
          المتبقي على الدفعة: <b className="text-on-surface tabular-nums">{money(target.remaining, target.currency)}</b>
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="المبلغ" htmlFor="pay-amount" required hint={invalid ?? 'يمكن تسجيل تحصيل جزئي'}>
          <input id="pay-amount" type="number" min={0} step="any" inputMode="decimal" className={INPUT} value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={!!invalid} />
        </Field>
        <Field label="التاريخ" htmlFor="pay-date">
          <input id="pay-date" type="date" className={INPUT} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="طريقة السداد" htmlFor="pay-method">
          <Select id="pay-method" value={method} onChange={(e) => setMethod(e.target.value)}>
            {PAY_METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}

// ── تجديد العقد ──────────────────────────────────────────────────────────────

export function RenewDialog({ contract, open, onClose, onDone }: { contract: ContractDetail; open: boolean; onClose: () => void; onDone: (d: ContractDetail) => void }) {
  const def = contract.renewal;
  const [uplift, setUplift] = useState(String(def?.upliftPct ?? 0));
  const [start, setStart] = useState(def?.startDate ?? '');
  const [end, setEnd] = useState(def?.endDate ?? '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !def) return;
    setUplift(String(def.upliftPct));
    setStart(def.startDate);
    setEnd(def.endDate);
  }, [open, def]);

  const newValue = Math.round(contract.value * (1 + (Number(uplift) || 0) / 100));

  const save = async () => {
    setBusy(true);
    try {
      const res = await renewContract(contract.id, { upliftPct: Number(uplift) || 0, startDate: start, endDate: end });
      toast.success(res.message ?? 'تم التجديد');
      onDone(res.data);
      onClose();
    } catch (e) {
      toast.error(apiError(e, 'تعذر تجديد العقد'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="تجديد العقد"
      description={`${contract.no} · ${contract.name}`}
      footer={
        <>
          <Button onClick={() => void save()} disabled={busy || !start || !end || end < start}>
            {busy && <Loader2 className="animate-spin" />} إنشاء عقد التجديد
          </Button>
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="نسبة الزيادة %" htmlFor="ren-up">
          <input id="ren-up" type="number" min={0} step="any" className={INPUT} value={uplift} onChange={(e) => setUplift(e.target.value)} />
        </Field>
        <Field label="بداية الفترة الجديدة" htmlFor="ren-start">
          <input id="ren-start" type="date" className={INPUT} value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="نهاية الفترة الجديدة" htmlFor="ren-end">
          <input id="ren-end" type="date" className={INPUT} value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
        </Field>
      </div>
      <p className="text-sm text-on-surface">
        قيمة العقد الجديد: <b className="tabular-nums">{money(newValue, contract.currency)}</b>{' '}
        <span className="text-on-surface-variant">(الحالي {money(contract.value, contract.currency)})</span>
      </p>
      <p className="text-xs text-on-surface-variant">
        سيُنشأ عقد جديد برقم جديد ودفعات جديدة، ويبدأ التوقيع كمسودة. {contract.customized && 'تُنسخ البنود المخصصة للعقد الجديد كإصدار 1. '}
        يصبح العقد الحالي «تم تجديده».
      </p>
      {contract.remaining > 0.5 && <Warning>يوجد متبقي {money(contract.remaining, contract.currency)} على العقد الحالي ولن يتأثر بالتجديد.</Warning>}
    </Modal>
  );
}

// ── التوقيع: انتقال الحالة / متابعة ──────────────────────────────────────────

export function SignatureDialog({
  contract,
  to,
  today,
  onClose,
  onDone,
}: {
  contract: ContractDetail;
  to: SignatureStatus | null;
  today: string;
  onClose: () => void;
  onDone: (d: ContractDetail) => void;
}) {
  const [date, setDate] = useState(today);
  const [follow, setFollow] = useState(addDays(today, 7));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const needsFollow = to !== 'original' && to !== 'draft';

  useEffect(() => {
    if (!to) return;
    setDate(today);
    setFollow(addDays(today, 7));
    setNote('');
  }, [to, today]);

  const save = async () => {
    if (!to) return;
    setBusy(true);
    try {
      const res = await moveSignature(contract.id, { status: to, date, followUpDate: needsFollow ? follow || null : null, note });
      toast.success(res.message ?? 'تم التحديث');
      onDone(res.data);
      onClose();
    } catch (e) {
      toast.error(apiError(e, 'تعذر تحديث حالة التوقيع'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={!!to}
      onClose={onClose}
      title={to ? SIGNATURE_LABELS[to] : ''}
      description={`${contract.no} · ${contract.name}`}
      footer={
        <>
          <Button onClick={() => void save()} disabled={busy || !date}>
            {busy && <Loader2 className="animate-spin" />} حفظ
          </Button>
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
        </>
      }
    >
      {to === 'draft' && <Warning>سيتم مسح تواريخ الإرسال والتوقيع واستلام الأصل.</Warning>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="التاريخ" htmlFor="sig-date">
          <input id="sig-date" type="date" className={INPUT} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        {needsFollow && (
          <Field label="المتابعة القادمة" htmlFor="sig-follow">
            <input id="sig-follow" type="date" className={INPUT} value={follow} onChange={(e) => setFollow(e.target.value)} />
          </Field>
        )}
      </div>
      <Field label="ملاحظة" htmlFor="sig-note">
        <textarea id="sig-note" rows={3} className={TEXTAREA} value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثال: عن طريق البريد" />
      </Field>
    </Modal>
  );
}

export function FollowUpDialog({ contract, open, today, onClose, onDone }: { contract: ContractDetail | null; open: boolean; today: string; onClose: () => void; onDone: (d: ContractDetail) => void }) {
  const [note, setNote] = useState('');
  const [follow, setFollow] = useState(addDays(today, 7));
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setNote('');
    setFollow(addDays(today, 7));
  }, [open, today]);

  const save = async () => {
    if (!contract || !note.trim()) return;
    setBusy(true);
    try {
      const res = await addSignatureFollowUp(contract.id, { note, followUpDate: follow || null });
      toast.success(res.message ?? 'تم تسجيل المتابعة');
      onDone(res.data);
      onClose();
    } catch (e) {
      toast.error(apiError(e, 'تعذر تسجيل المتابعة'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open && !!contract}
      onClose={onClose}
      title="تسجيل متابعة"
      description={contract ? `${contract.no} · ${contract.customer.name}` : undefined}
      footer={
        <>
          <Button onClick={() => void save()} disabled={busy || !note.trim()}>
            {busy && <Loader2 className="animate-spin" />} حفظ المتابعة
          </Button>
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
        </>
      }
    >
      <Field label="ملاحظة المتابعة" htmlFor="fu-note" required>
        <textarea id="fu-note" rows={3} className={TEXTAREA} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <Field label="المتابعة القادمة" htmlFor="fu-date">
        <input id="fu-date" type="date" className={INPUT} value={follow} onChange={(e) => setFollow(e.target.value)} />
      </Field>
    </Modal>
  );
}

// ── الشيكات ──────────────────────────────────────────────────────────────────

const emptyCheque = (contractId = '', kind: ChequeInput['kind'] = 'payment', currency: ChequeInput['currency'] = 'EGP', today = ''): ChequeInput => ({
  contract: contractId,
  kind,
  number: '',
  bank: '',
  amount: '',
  currency,
  dueDate: '',
  receivedDate: today,
  status: 'held',
  installmentId: '',
  notes: '',
});

/**
 * Add or edit a cheque. `contractId` fixes the contract (from the drawer);
 * without it the user picks one. `kind` presets the type (guarantee button).
 */
export function ChequeDialog({
  open,
  cheque,
  contractId,
  kind,
  today,
  onClose,
  onDone,
}: {
  open: boolean;
  cheque: Cheque | null;
  contractId?: string;
  kind?: ChequeInput['kind'];
  today: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState<ChequeInput>(emptyCheque());
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (cheque) {
      setForm({
        contract: cheque.contract.id,
        kind: cheque.kind,
        number: cheque.number,
        bank: cheque.bank,
        amount: String(cheque.amount),
        currency: cheque.currency,
        dueDate: cheque.dueDate ?? '',
        receivedDate: cheque.receivedDate ?? '',
        status: cheque.status,
        installmentId: cheque.installmentId ?? '',
        notes: cheque.notes,
      });
    } else {
      setForm(emptyCheque(contractId ?? '', kind ?? 'payment', 'EGP', today));
    }
    if (!contractId && !cheque) {
      getContracts({ status: 'all' })
        .then((r) => setContracts(r.data.filter((c) => c.status !== 'cancelled')))
        .catch(() => setContracts([]));
    }
  }, [open, cheque, contractId, kind, today]);

  // Installments (and currency) of the chosen contract.
  useEffect(() => {
    if (!open || !form.contract) {
      setInstallments([]);
      return;
    }
    let live = true;
    getContract(form.contract)
      .then((d) => {
        if (!live) return;
        setInstallments(d.installments);
        if (!cheque) setForm((f) => ({ ...f, currency: d.currency }));
      })
      .catch(() => live && setInstallments([]));
    return () => {
      live = false;
    };
  }, [open, form.contract, cheque]);

  const set = <K extends keyof ChequeInput>(k: K, v: ChequeInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const missing = !form.contract ? 'اختر العقد' : !form.number.trim() ? 'اكتب رقم الشيك' : !(Number(form.amount) > 0) ? 'اكتب مبلغ الشيك' : null;
  const contractOptions = useMemo(() => [...contracts].sort((a, b) => a.no.localeCompare(b.no)), [contracts]);

  const save = async () => {
    if (missing) return;
    setBusy(true);
    try {
      const res = cheque ? await updateCheque(cheque.id, form) : await createCheque(form);
      toast.success(res.message ?? 'تم حفظ الشيك');
      onDone();
      onClose();
    } catch (e) {
      toast.error(apiError(e, 'تعذر حفظ الشيك'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!cheque) return;
    try {
      await deleteCheque(cheque.id);
      toast.success('تم حذف الشيك');
      onDone();
      onClose();
    } catch (e) {
      toast.error(apiError(e, 'تعذر حذف الشيك'));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={cheque ? `شيك ${cheque.number}` : form.kind === 'guarantee' ? 'تسجيل شيك ضمان' : 'شيك جديد'}
      footer={
        <>
          <Button onClick={() => void save()} disabled={busy || !!missing} title={missing ?? undefined}>
            {busy && <Loader2 className="animate-spin" />} حفظ
          </Button>
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <span className="flex-1" />
          {cheque && <ConfirmButton onConfirm={remove} label="حذف الشيك" />}
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {!contractId && !cheque && (
          <Field label="العقد" htmlFor="cq-contract" required className="sm:col-span-2">
            <Select id="cq-contract" value={form.contract} onChange={(e) => set('contract', e.target.value)}>
              <option value="">اختر العقد</option>
              {contractOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.no} — {c.customer.name} — {c.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="النوع" htmlFor="cq-kind">
          <Select id="cq-kind" value={form.kind} onChange={(e) => set('kind', e.target.value as ChequeInput['kind'])}>
            {(['payment', 'guarantee'] as const).map((k) => (
              <option key={k} value={k}>
                {CHEQUE_KIND_LABELS[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="رقم الشيك" htmlFor="cq-no" required>
          <input id="cq-no" dir="ltr" className={`${INPUT} text-end`} value={form.number} onChange={(e) => set('number', e.target.value)} />
        </Field>
        <Field label="البنك" htmlFor="cq-bank">
          <input id="cq-bank" className={INPUT} value={form.bank} onChange={(e) => set('bank', e.target.value)} />
        </Field>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Field label="المبلغ" htmlFor="cq-amount" required>
            <input id="cq-amount" type="number" min={0} step="any" className={INPUT} value={form.amount} onChange={(e) => set('amount', e.target.value)} />
          </Field>
          <Field label="العملة" htmlFor="cq-cur">
            <Select id="cq-cur" value={form.currency} onChange={(e) => set('currency', e.target.value as ChequeInput['currency'])}>
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="تاريخ الاستحقاق" htmlFor="cq-due">
          <input id="cq-due" type="date" className={INPUT} value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
        </Field>
        <Field label="تاريخ الاستلام" htmlFor="cq-rec">
          <input id="cq-rec" type="date" className={INPUT} value={form.receivedDate} onChange={(e) => set('receivedDate', e.target.value)} />
        </Field>
        <Field label="الحالة" htmlFor="cq-status">
          <Select id="cq-status" value={form.status} onChange={(e) => set('status', e.target.value as ChequeInput['status'])}>
            {CHEQUE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CHEQUE_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>
        {form.kind === 'payment' && (
          <Field label="مقابل دفعة" htmlFor="cq-inst" hint="عند تحصيل الشيك يُسجَّل تلقائيًا على هذه الدفعة">
            <Select id="cq-inst" value={form.installmentId} onChange={(e) => set('installmentId', e.target.value)}>
              <option value="">— بدون —</option>
              {installments.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} — {arDate(i.dueDate)} — متبقي {money(i.remaining, form.currency)}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="ملاحظات" htmlFor="cq-notes" className="sm:col-span-2">
          <textarea id="cq-notes" rows={2} className={TEXTAREA} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
