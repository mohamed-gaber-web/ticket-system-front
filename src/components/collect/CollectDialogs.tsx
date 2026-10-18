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
  fmtDate,
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

// ── Record payment ──────────────────────────────────────────────────────────────

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
  const invalid = !(n > 0) ? 'The amount must be greater than zero' : target && n > target.remaining + 0.5 ? 'The amount is more than what is left' : null;

  const save = async () => {
    if (!target || invalid) return;
    setBusy(true);
    try {
      const res = await addPayment(target.contractId, target.installmentId, { amount: n, date, method });
      toast.success(res.message ?? 'Payment recorded');
      onDone(res.data);
      onClose();
    } catch (e) {
      toast.error(apiError(e, 'Could not record the payment'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title="Record payment"
      description={target ? `${target.contractNo} · ${target.customerName} · ${target.installmentName}` : undefined}
      footer={
        <>
          <Button onClick={() => void save()} disabled={busy || !!invalid}>
            {busy && <Loader2 className="animate-spin" />} Save payment
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      {target && (
        <p className="text-sm text-on-surface-variant">
          Left on this installment: <b className="text-on-surface tabular-nums">{money(target.remaining, target.currency)}</b>
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Amount" htmlFor="pay-amount" required hint={invalid ?? 'Partial payments are allowed'}>
          <input id="pay-amount" type="number" min={0} step="any" inputMode="decimal" className={INPUT} value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={!!invalid} />
        </Field>
        <Field label="Date" htmlFor="pay-date">
          <input id="pay-date" type="date" className={INPUT} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Payment method" htmlFor="pay-method">
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

// ── Renew contract ──────────────────────────────────────────────────────────────

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
      toast.success(res.message ?? 'Contract renewed');
      onDone(res.data);
      onClose();
    } catch (e) {
      toast.error(apiError(e, 'Could not renew the contract'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Renew contract"
      description={`${contract.no} · ${contract.name}`}
      footer={
        <>
          <Button onClick={() => void save()} disabled={busy || !start || !end || end < start}>
            {busy && <Loader2 className="animate-spin" />} Create renewal contract
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Uplift %" htmlFor="ren-up">
          <input id="ren-up" type="number" min={0} step="any" className={INPUT} value={uplift} onChange={(e) => setUplift(e.target.value)} />
        </Field>
        <Field label="New period start" htmlFor="ren-start">
          <input id="ren-start" type="date" className={INPUT} value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="New period end" htmlFor="ren-end">
          <input id="ren-end" type="date" className={INPUT} value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
        </Field>
      </div>
      <p className="text-sm text-on-surface">
        New contract value: <b className="tabular-nums">{money(newValue, contract.currency)}</b>{' '}
        <span className="text-on-surface-variant">(current {money(contract.value, contract.currency)})</span>
      </p>
      <p className="text-xs text-on-surface-variant">
        A new contract is created with a new number and a new schedule; its signature starts as a draft. {contract.customized && 'The customized clauses are copied to the new contract as version 1. '}
        The current contract becomes “Renewed”.
      </p>
      {contract.remaining > 0.5 && <Warning>{money(contract.remaining, contract.currency)} is still outstanding on the current contract; renewal does not change it.</Warning>}
    </Modal>
  );
}

// ── Signature: status move / follow-up ──────────────────────────────────────────

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
      toast.success(res.message ?? 'Updated');
      onDone(res.data);
      onClose();
    } catch (e) {
      toast.error(apiError(e, 'Could not update the signature status'));
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
            {busy && <Loader2 className="animate-spin" />} Save
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      {to === 'draft' && <Warning>The sent, signed and original-received dates will be cleared.</Warning>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Date" htmlFor="sig-date">
          <input id="sig-date" type="date" className={INPUT} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        {needsFollow && (
          <Field label="Next follow-up" htmlFor="sig-follow">
            <input id="sig-follow" type="date" className={INPUT} value={follow} onChange={(e) => setFollow(e.target.value)} />
          </Field>
        )}
      </div>
      <Field label="Note" htmlFor="sig-note">
        <textarea id="sig-note" rows={3} className={TEXTAREA} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. by e-mail" />
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
      toast.success(res.message ?? 'Follow-up logged');
      onDone(res.data);
      onClose();
    } catch (e) {
      toast.error(apiError(e, 'Could not log the follow-up'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open && !!contract}
      onClose={onClose}
      title="Log follow-up"
      description={contract ? `${contract.no} · ${contract.customer.name}` : undefined}
      footer={
        <>
          <Button onClick={() => void save()} disabled={busy || !note.trim()}>
            {busy && <Loader2 className="animate-spin" />} Save follow-up
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <Field label="Follow-up note" htmlFor="fu-note" required>
        <textarea id="fu-note" rows={3} className={TEXTAREA} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <Field label="Next follow-up" htmlFor="fu-date">
        <input id="fu-date" type="date" className={INPUT} value={follow} onChange={(e) => setFollow(e.target.value)} />
      </Field>
    </Modal>
  );
}

// ── Cheques ──────────────────────────────────────────────────────────────────

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
  const missing = !form.contract ? 'Choose the contract' : !form.number.trim() ? 'Enter the cheque number' : !(Number(form.amount) > 0) ? 'Enter the cheque amount' : null;
  const contractOptions = useMemo(() => [...contracts].sort((a, b) => a.no.localeCompare(b.no)), [contracts]);

  const save = async () => {
    if (missing) return;
    setBusy(true);
    try {
      const res = cheque ? await updateCheque(cheque.id, form) : await createCheque(form);
      toast.success(res.message ?? 'Cheque saved');
      onDone();
      onClose();
    } catch (e) {
      toast.error(apiError(e, 'Could not save the cheque'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!cheque) return;
    try {
      await deleteCheque(cheque.id);
      toast.success('Cheque deleted');
      onDone();
      onClose();
    } catch (e) {
      toast.error(apiError(e, 'Could not delete the cheque'));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={cheque ? `Cheque ${cheque.number}` : form.kind === 'guarantee' ? 'Record guarantee cheque' : 'New cheque'}
      footer={
        <>
          <Button onClick={() => void save()} disabled={busy || !!missing} title={missing ?? undefined}>
            {busy && <Loader2 className="animate-spin" />} Save
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <span className="flex-1" />
          {cheque && <ConfirmButton onConfirm={remove} label="Delete cheque" />}
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {!contractId && !cheque && (
          <Field label="Contract" htmlFor="cq-contract" required className="sm:col-span-2">
            <Select id="cq-contract" value={form.contract} onChange={(e) => set('contract', e.target.value)}>
              <option value="">Choose the contract</option>
              {contractOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.no} — {c.customer.name} — {c.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Type" htmlFor="cq-kind">
          <Select id="cq-kind" value={form.kind} onChange={(e) => set('kind', e.target.value as ChequeInput['kind'])}>
            {(['payment', 'guarantee'] as const).map((k) => (
              <option key={k} value={k}>
                {CHEQUE_KIND_LABELS[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Cheque number" htmlFor="cq-no" required>
          <input id="cq-no" className={INPUT} value={form.number} onChange={(e) => set('number', e.target.value)} />
        </Field>
        <Field label="Bank" htmlFor="cq-bank">
          <input id="cq-bank" className={INPUT} value={form.bank} onChange={(e) => set('bank', e.target.value)} />
        </Field>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Field label="Amount" htmlFor="cq-amount" required>
            <input id="cq-amount" type="number" min={0} step="any" className={INPUT} value={form.amount} onChange={(e) => set('amount', e.target.value)} />
          </Field>
          <Field label="Currency" htmlFor="cq-cur">
            <Select id="cq-cur" value={form.currency} onChange={(e) => set('currency', e.target.value as ChequeInput['currency'])}>
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Due date" htmlFor="cq-due">
          <input id="cq-due" type="date" className={INPUT} value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
        </Field>
        <Field label="Received date" htmlFor="cq-rec">
          <input id="cq-rec" type="date" className={INPUT} value={form.receivedDate} onChange={(e) => set('receivedDate', e.target.value)} />
        </Field>
        <Field label="Status" htmlFor="cq-status">
          <Select id="cq-status" value={form.status} onChange={(e) => set('status', e.target.value as ChequeInput['status'])}>
            {CHEQUE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CHEQUE_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>
        {form.kind === 'payment' && (
          <Field label="For installment" htmlFor="cq-inst" hint="When the cheque clears, it is recorded on this installment automatically">
            <Select id="cq-inst" value={form.installmentId} onChange={(e) => set('installmentId', e.target.value)}>
              <option value="">— None —</option>
              {installments.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} — {fmtDate(i.dueDate)} — {money(i.remaining, form.currency)} left
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Notes" htmlFor="cq-notes" className="sm:col-span-2">
          <textarea id="cq-notes" rows={2} className={TEXTAREA} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
