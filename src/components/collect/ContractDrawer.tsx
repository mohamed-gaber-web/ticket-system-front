import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Check, FileText, Pencil, Plus, RefreshCw, ScrollText, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { collectChanged, openDrawer, openEditor } from '@/redux/slices/collectSlice';
import { deleteContract, deletePayment, getContract, setChequeStatus, setContractStatus } from '@/api/collectApi';
import {
  CHEQUE_KIND_LABELS,
  CHEQUE_STATUSES,
  CHEQUE_STATUS_LABELS,
  CONTRACT_STATUS_LABELS,
  SIGNATURE_ACTIONS,
  SIGNATURE_LABELS,
  SIGNATURE_SHORT,
  SIGNATURE_STEPS,
  TRIGGER_LABELS,
  apiError,
  arDate,
  diffDays,
  money,
  relDays,
} from '@/lib/collect';
import { Chip, ConfirmButton, ErrorState, Loading, Select, TypeDot, Warning } from '@/components/collect/CollectUi';
import { ChequeDialog, FollowUpDialog, PaymentDialog, RenewDialog, SignatureDialog, type PaymentTarget } from '@/components/collect/CollectDialogs';
import { ClauseEditorDialog } from '@/components/collect/ClauseEditorDialog';
import { ContractPdfDialog } from '@/components/collect/ContractPdfDialog';
import type { Cheque, ContractDetail, ContractStatus, SignatureStatus, Tone } from '@/types/collect.types';

// Grow Path Collect — the contract drawer (§9.4): header + mini stats,
// actions, signature tracking, cheques, the installment schedule with its
// payments, sent reminders and notes. Opened from any screen through
// `openDrawer(id)`; slides in from the inline-end side (left in RTL).

const STATUS_TONE: Record<ContractStatus, Tone> = { active: 'ok', closed: 'neutral', renewed: 'info', cancelled: 'crit' };

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-2 rounded-[0.75rem] bg-surface-container-low p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="gpc-h text-sm font-semibold text-on-surface">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'crit' }) {
  return (
    <div className="min-w-0 rounded-[0.75rem] bg-surface-container-low p-2.5">
      <p className="text-[11px] font-semibold text-on-surface-variant">{label}</p>
      <p className={cn('truncate text-[15px] font-bold tabular-nums', tone === 'crit' ? 'text-error' : 'text-on-surface')}>{value}</p>
    </div>
  );
}

function SignaturePanel({ c, today, onMove, onFollow, onEditClauses }: { c: ContractDetail; today: string; onMove: (s: SignatureStatus) => void; onFollow: () => void; onEditClauses: () => void }) {
  const s = c.signature;
  const step = SIGNATURE_STEPS.indexOf(s.status);
  const late = s.followUpDate ? diffDays(today, s.followUpDate) : null;
  return (
    <Section title="التوقيع">
      <ol className="grid grid-cols-5 gap-1" aria-label="مراحل التوقيع">
        {SIGNATURE_STEPS.map((st, i) => (
          <li key={st} className="min-w-0 text-center">
            <span
              className={cn(
                'block h-1.5 rounded-full',
                i < step || s.status === 'original' ? 'bg-emerald-600 dark:bg-emerald-400' : i === step ? 'bg-primary' : 'bg-surface-container-highest',
              )}
            />
            <span className={cn('mt-1 block truncate text-[10.5px]', i === step ? 'font-bold text-on-surface' : 'text-on-surface-variant')}>{SIGNATURE_SHORT[st]}</span>
          </li>
        ))}
      </ol>
      <p className="text-sm font-semibold text-on-surface">{SIGNATURE_LABELS[s.status]}</p>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-on-surface-variant sm:grid-cols-4">
        <div>
          <dt>أُرسل</dt>
          <dd className="text-on-surface">{arDate(s.sentAt)}</dd>
        </div>
        <div>
          <dt>وقّع العميل</dt>
          <dd className="text-on-surface">{arDate(s.signedAt)}</dd>
        </div>
        <div>
          <dt>استلام الأصل</dt>
          <dd className="text-on-surface">{arDate(s.originalAt)}</dd>
        </div>
        <div>
          <dt>المتابعة القادمة</dt>
          <dd className={cn(late != null && late > 0 ? 'font-bold text-error' : 'text-on-surface')}>
            {arDate(s.followUpDate)}
            {late != null && late > 0 && ` · متأخرة ${late} يوم`}
          </dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2">
        {SIGNATURE_ACTIONS[s.status].map((a) => (
          <Button key={a.to} size="sm" variant={a.to === 'edit' ? 'outline' : 'default'} onClick={() => (a.to === 'edit' ? onEditClauses() : onMove(a.to as SignatureStatus))}>
            {a.label}
          </Button>
        ))}
        {s.status !== 'original' && (
          <Button size="sm" variant="outline" onClick={onFollow}>
            تسجيل متابعة
          </Button>
        )}
      </div>
      {s.log.length > 0 && (
        <ul className="space-y-1 border-t border-outline-variant/40 pt-2 text-xs">
          {[...s.log]
            .reverse()
            .slice(0, 8)
            .map((l, i) => (
              <li key={i} className="flex gap-2">
                <span className="shrink-0 tabular-nums text-on-surface-variant">{arDate(l.date)}</span>
                <span className="text-on-surface">{l.text}</span>
              </li>
            ))}
        </ul>
      )}
    </Section>
  );
}

export function ContractDrawer() {
  const dispatch = useAppDispatch();
  const id = useAppSelector((s) => s.collect.ui.drawerId);
  const dataVersion = useAppSelector((s) => s.collect.dataVersion);
  const [c, setC] = useState<ContractDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pay, setPay] = useState<PaymentTarget | null>(null);
  const [sigTo, setSigTo] = useState<SignatureStatus | null>(null);
  const [follow, setFollow] = useState(false);
  const [renew, setRenew] = useState(false);
  const [clauses, setClauses] = useState(false);
  const [pdf, setPdf] = useState(false);
  const [cheque, setCheque] = useState<{ open: boolean; cheque: Cheque | null; kind?: 'guarantee' | 'payment' }>({ open: false, cheque: null });
  const panelRef = useRef<HTMLDivElement>(null);
  // Set when the drawer itself just loaded the fresh contract and then bumped
  // dataVersion: the reload that bump would trigger is skipped once.
  const skipReload = useRef(false);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      setC(await getContract(id));
    } catch (e) {
      setError(apiError(e, 'تعذر تحميل العقد'));
    }
  }, [id]);

  useEffect(() => {
    if (!id) {
      setC(null);
      return;
    }
    if (c && c.id !== id) setC(null);
    if (skipReload.current && c?.id === id) {
      skipReload.current = false;
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on id / external writes only
  }, [id, dataVersion]);

  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[role="dialog"][data-state="open"]')) dispatch(openDrawer(null));
    };
    window.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [id, dispatch]);

  if (!id) return null;

  const close = () => dispatch(openDrawer(null));
  /** A write returned the fresh contract: show it and refresh everything else. */
  const updated = (d: ContractDetail) => {
    setC(d);
    if (d.id !== id) dispatch(openDrawer(d.id));
    else skipReload.current = true;
    void dispatch(collectChanged());
  };
  const today = c?.today ?? '';

  const status = async (s: ContractStatus) => {
    try {
      const res = await setContractStatus(c!.id, s);
      toast.success(res.message ?? 'تم');
      updated(res.data);
    } catch (e) {
      toast.error(apiError(e, 'تعذر تغيير الحالة'));
    }
  };

  const removePayment = async (instId: string, payId: string) => {
    try {
      const res = await deletePayment(c!.id, instId, payId);
      toast.success(res.message ?? 'تم حذف التحصيل');
      updated(res.data);
    } catch (e) {
      toast.error(apiError(e, 'تعذر حذف التحصيل'));
    }
  };

  const remove = async () => {
    try {
      const res = await deleteContract(c!.id);
      toast.success(res.message ?? 'تم الحذف');
      close();
      void dispatch(collectChanged());
    } catch (e) {
      toast.error(apiError(e, 'تعذر حذف العقد'));
    }
  };

  const chequeStatus = async (q: Cheque, s: Cheque['status']) => {
    try {
      const res = await setChequeStatus(q.id, s);
      if (res.returned) toast.warning(res.message ?? 'شيك مرتجع');
      else toast.success(res.message ?? 'تم');
      await load();
      skipReload.current = true;
      void dispatch(collectChanged());
    } catch (e) {
      toast.error(apiError(e, 'تعذر تحديث الشيك'));
    }
  };

  const daysToEnd = c?.endDate ? diffDays(c.endDate, today) : null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={close} aria-hidden="true" />
      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={c ? `العقد ${c.no}` : 'العقد'}
        dir="rtl"
        className="gpc fixed inset-y-0 left-0 z-50 flex w-full max-w-[640px] flex-col bg-surface-container-lowest shadow-2xl outline-none"
      >
        {!c ? (
          <div className="p-5">{error ? <ErrorState message={error} onRetry={() => void load()} /> : <Loading rows={6} />}</div>
        ) : (
          <>
            <header className="space-y-2 border-b border-outline-variant/40 p-4">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p dir="ltr" className="text-end text-xs font-semibold tabular-nums text-on-surface-variant">
                    {c.no}
                  </p>
                  <h2 className="gpc-h text-[17px] font-semibold leading-snug text-on-surface">{c.name}</h2>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-on-surface-variant">
                    <span className="font-semibold text-on-surface">{c.customer.name}</span>·
                    <span className="inline-flex items-center gap-1">
                      <TypeDot color={c.type?.color} />
                      {c.type?.name}
                    </span>
                    · {arDate(c.startDate)} – {arDate(c.endDate)}
                    {c.deliveryDate && ` · التسليم ${arDate(c.deliveryDate)}`}
                  </p>
                </div>
                <Button size="icon-sm" variant="ghost" aria-label="إغلاق" onClick={close}>
                  <X />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Chip tone={STATUS_TONE[c.status]}>{CONTRACT_STATUS_LABELS[c.status]}</Chip>
                {c.status === 'active' && daysToEnd != null && (
                  <Chip tone={daysToEnd < 0 ? 'crit' : daysToEnd <= 90 ? 'warn' : 'neutral'}>
                    {daysToEnd < 0 ? `انتهى منذ ${-daysToEnd} يوم` : `ينتهي بعد ${daysToEnd} يوم`}
                  </Chip>
                )}
                {c.customized && <Chip tone="info">بنود مخصصة · إصدار {c.customized.version}</Chip>}
                {c.unsigned && <Chip tone="warn">{c.signatureStatus === 'signed' ? 'الأصل لم يُستلم' : 'غير موقّع'}</Chip>}
                {c.needsGuarantee && <Chip tone="crit">بدون شيك ضمان</Chip>}
              </div>
            </header>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="القيمة" value={money(c.value, c.currency)} />
                <Stat label="المحصل" value={money(c.collected, c.currency)} />
                <Stat label="المتبقي" value={money(c.remaining, c.currency)} />
                <Stat label="متأخر" value={money(c.overdue, c.currency)} tone={c.overdue > 0.5 ? 'crit' : undefined} />
              </div>
              {Math.abs(c.instSum - c.value) > 0.5 && (
                <Warning>
                  مجموع الدفعات ({money(c.instSum, c.currency)}) لا يساوي قيمة العقد ({money(c.value, c.currency)}).
                </Warning>
              )}

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setPdf(true)}>
                  <FileText /> PDF العقد للطباعة
                </Button>
                <Button variant="outline" onClick={() => setClauses(true)}>
                  <ScrollText /> {c.customized ? 'تعديل بنود هذا العقد' : 'تخصيص بنود هذا العقد'}
                </Button>
                <Button variant="outline" onClick={() => dispatch(openEditor(c.id))}>
                  <Pencil /> تعديل العقد والدفعات
                </Button>
                {c.renewal && c.status === 'active' && (
                  <Button variant="outline" onClick={() => setRenew(true)}>
                    <RefreshCw /> تجديد العقد
                  </Button>
                )}
                {c.status === 'active' ? (
                  <Button variant="outline" onClick={() => void status('closed')}>
                    <Check /> إغلاق كمكتمل
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => void status('active')}>
                    إعادة تفعيل
                  </Button>
                )}
              </div>

              <SignaturePanel c={c} today={today} onMove={setSigTo} onFollow={() => setFollow(true)} onEditClauses={() => setClauses(true)} />

              <Section
                title="الشيكات"
                action={
                  <Button size="sm" variant="outline" onClick={() => setCheque({ open: true, cheque: null, kind: c.needsGuarantee ? 'guarantee' : 'payment' })}>
                    <Plus /> شيك
                  </Button>
                }
              >
                {c.needsGuarantee && <Warning>هذا العقد يتطلب شيك ضمان ولم يُسجَّل شيك ضمان في الخزنة.</Warning>}
                {c.cheques.length === 0 ? (
                  <p className="text-xs text-on-surface-variant">لا توجد شيكات.</p>
                ) : (
                  <ul className="divide-y divide-outline-variant/30">
                    {c.cheques.map((q) => (
                      <li key={q.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-on-surface">
                            {CHEQUE_KIND_LABELS[q.kind]} <span dir="ltr" className="ltr tabular-nums">{q.number}</span>
                            {q.bank && <span className="font-normal text-on-surface-variant"> · {q.bank}</span>}
                          </p>
                          <p className="text-xs tabular-nums text-on-surface-variant">
                            {money(q.amount, q.currency)} · {q.dueDate ? `${arDate(q.dueDate)} (${relDays(q.dueDate, today)})` : 'بدون تاريخ'}
                          </p>
                        </div>
                        <Select aria-label="حالة الشيك" className="w-36" value={q.status} onChange={(e) => void chequeStatus(q, e.target.value as Cheque['status'])}>
                          {CHEQUE_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {CHEQUE_STATUS_LABELS[s]}
                            </option>
                          ))}
                        </Select>
                        <Button size="sm" variant="ghost" onClick={() => setCheque({ open: true, cheque: q })}>
                          تعديل
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="جدول الدفعات">
                <ul className="space-y-2">
                  {c.installments.map((i) => (
                    <li key={i.id} className="rounded-[0.6rem] bg-surface-container-lowest p-2.5">
                      <div className="flex flex-wrap items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-on-surface">{i.name}</p>
                          <p className="text-xs tabular-nums text-on-surface-variant">
                            {arDate(i.dueDate)} · {money(i.amount, c.currency)}
                            {i.paid > 0 && ` · محصل ${money(i.paid, c.currency)}`}
                            {i.remaining > 0.5 && i.paid > 0 && ` · متبقي ${money(i.remaining, c.currency)}`}
                          </p>
                        </div>
                        <Chip tone={i.status.tone}>{i.status.label}</Chip>
                        {i.remaining > 0.5 && c.status !== 'cancelled' && (
                          <Button
                            size="sm"
                            onClick={() =>
                              setPay({
                                contractId: c.id,
                                contractNo: c.no,
                                customerName: c.customer.name,
                                currency: c.currency,
                                installmentId: i.id,
                                installmentName: i.name,
                                remaining: i.remaining,
                              })
                            }
                          >
                            تحصيل
                          </Button>
                        )}
                      </div>
                      {i.payments.length > 0 && (
                        <ul className="mt-1.5 space-y-1 border-t border-outline-variant/30 pt-1.5">
                          {i.payments.map((p) => (
                            <li key={p.id} className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="tabular-nums text-on-surface-variant">{arDate(p.date)}</span>
                              <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">{money(p.amount, c.currency)}</span>
                              <span className="text-on-surface-variant">{p.method}</span>
                              <span className="flex-1" />
                              <ConfirmButton onConfirm={() => removePayment(i.id, p.id)} label="حذف" icon={false} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </Section>

              <Section title="تذكيرات مُرسلة">
                {c.reminderLog.length === 0 ? (
                  <p className="text-xs text-on-surface-variant">لم تُرسل تذكيرات لهذا العقد.</p>
                ) : (
                  <ul className="space-y-1.5 text-xs">
                    {c.reminderLog.map((l) => (
                      <li key={l.id} className="space-y-0.5">
                        <p className="text-on-surface">
                          <span className="tabular-nums text-on-surface-variant">{arDate(l.sentAt.slice(0, 10))}</span> · {l.subject}
                        </p>
                        <p className="text-on-surface-variant">
                          {TRIGGER_LABELS[l.trigger] ?? l.trigger} · إلى: {l.to} · {l.channel === 'smtp' ? 'إرسال تلقائي' : 'يدوي'}
                          {l.error && <span className="text-error"> · {l.error}</span>}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="ملاحظات">
                {c.notes.trim() ? <p className="pre text-sm text-on-surface">{c.notes}</p> : <p className="text-xs text-on-surface-variant">لا توجد شروط خاصة لهذا العقد.</p>}
              </Section>
            </div>

            <footer className="flex flex-wrap items-center gap-2 border-t border-outline-variant/40 p-3">
              {c.status !== 'cancelled' && <ConfirmButton onConfirm={() => status('cancelled')} label="إلغاء العقد" icon={false} variant="outline" />}
              <span className="flex-1" />
              <ConfirmButton
                onConfirm={remove}
                label="حذف نهائي"
                disabled={c.hasPayments}
                title={c.hasPayments ? 'العقد عليه تحصيلات — يمكنك إلغاؤه بدلًا من الحذف' : undefined}
              />
            </footer>

            <PaymentDialog target={pay} today={today} onClose={() => setPay(null)} onDone={updated} />
            <SignatureDialog contract={c} to={sigTo} today={today} onClose={() => setSigTo(null)} onDone={updated} />
            <FollowUpDialog contract={c} open={follow} today={today} onClose={() => setFollow(false)} onDone={updated} />
            <RenewDialog contract={c} open={renew} onClose={() => setRenew(false)} onDone={updated} />
            <ChequeDialog
              open={cheque.open}
              cheque={cheque.cheque}
              contractId={c.id}
              kind={cheque.kind}
              today={today}
              onClose={() => setCheque({ open: false, cheque: null })}
              onDone={() => {
                void load();
                void dispatch(collectChanged());
              }}
            />
            <ClauseEditorDialog
              contract={c}
              open={clauses}
              onClose={() => setClauses(false)}
              onSaved={(d, openPdf) => {
                setClauses(false);
                updated(d);
                if (openPdf) setPdf(true);
              }}
            />
            <ContractPdfDialog contractId={c.id} open={pdf} onClose={() => setPdf(false)} />
          </>
        )}
      </aside>
    </>
  );
}
