import type {
  BillingMode,
  ChequeKind,
  ChequeStatus,
  ContractStatus,
  Currency,
  PhaseAnchor,
  Recipient,
  SignatureStatus,
  Tone,
  Trigger,
} from '../types/collect.types';

// Grow Path Collect — formatting, labels and date helpers shared by every
// Collect screen. Pure (type-only imports) so `npm test` can run it.
// Dates are "YYYY-MM-DD" strings, maths in whole UTC days (like the backend's
// utils/collect/dates.js).

export const CURRENCIES: Currency[] = ['EGP', 'SAR', 'USD'];
export const CURRENCY_LABELS: Record<Currency, string> = { EGP: 'EGP', SAR: 'SAR', USD: 'USD' };
export const CURRENCY_NAMES: Record<Currency, string> = { EGP: 'Egyptian Pounds', SAR: 'Saudi Riyals', USD: 'US Dollars' };

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const n0f = new Intl.NumberFormat('en', { maximumFractionDigits: 0 });
export const n0 = (v: number | null | undefined) => n0f.format(Math.round(Number(v) || 0));

/** "1,250,000 EGP" */
export const money = (v: number | null | undefined, cur: Currency | string = 'EGP') =>
  `${n0(v)} ${CURRENCY_LABELS[cur as Currency] ?? cur}`;

/** "1.25M", "350K", "900" — chart axes and tight tiles. */
export const compact = (v: number | null | undefined) => {
  const n = Number(v) || 0;
  const a = Math.abs(n);
  const trim = (x: number) => String(Math.round(x * 100) / 100);
  if (a >= 1e9) return `${trim(n / 1e9)}B`;
  if (a >= 1e6) return `${trim(n / 1e6)}M`;
  if (a >= 1e3) return `${trim(n / 1e3)}K`;
  return n0(n);
};

export const pct = (v: number | null | undefined, digits = 0) =>
  v == null || !Number.isFinite(v) ? '—' : `${(v * 100).toFixed(digits)}%`;

// ── Dates ────────────────────────────────────────────────────────────────────

const toDays = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
};
const fromDays = (n: number) => (Number.isFinite(n) ? new Date(n * 86_400_000).toISOString().slice(0, 10) : '');

export const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
/** '' when `s` isn't a date yet (e.g. "today" before the data has loaded). */
export const addDays = (s: string, n: number) => (isDate(s) ? fromDays(toDays(s) + n) : '');
/** a − b in whole days (0 when either isn't a date). */
export const diffDays = (a: string, b: string) => (isDate(a) && isDate(b) ? toDays(a) - toDays(b) : 0);

/** "11 October 2026" */
export const fmtDate = (s?: string | null) => {
  if (!isDate(s)) return '—';
  const [y, m, d] = s.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};
/** "11 Oct" */
export const fmtDateShort = (s?: string | null) => {
  if (!isDate(s)) return '—';
  const [, m, d] = s.split('-').map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]}`;
};
/** "October 2026" from "2026-10" or a date */
export const fmtMonth = (s: string) => {
  const [y, m] = s.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};
export const weekdayOf = (s: string) => DAYS[new Date(`${s}T00:00:00Z`).getUTCDay()];

/** "N day(s)" */
export const days = (n: number) => `${n} ${Math.abs(n) === 1 ? 'day' : 'days'}`;

/** "today" / "in 5 days" / "3 days ago" relative to today. */
export const relDays = (date: string, today: string) => {
  const d = diffDays(date, today);
  if (d === 0) return 'today';
  return d > 0 ? `in ${days(d)}` : `${days(-d)} ago`;
};

// ── Labels ───────────────────────────────────────────────────────────────────

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  active: 'Active',
  closed: 'Completed',
  renewed: 'Renewed',
  cancelled: 'Cancelled',
};

export const BILLING_LABELS: Record<BillingMode, string> = {
  phases: 'Phases (percentages tied to delivery)',
  recurring: 'Recurring (every N months)',
  renewal: 'Renewal (one payment per period)',
};

export const ANCHOR_LABELS: Record<PhaseAnchor, string> = {
  start: 'Contract start',
  delivery: 'Delivery',
  end: 'Contract end',
};

export const SIGNATURE_LABELS: Record<SignatureStatus, string> = {
  draft: 'Draft',
  sent: 'Sent to customer',
  review: 'Customer reviewing / requested changes',
  signed: 'Customer signed — original not received',
  original: 'Signed, original received',
};
export const SIGNATURE_STEPS: SignatureStatus[] = ['draft', 'sent', 'review', 'signed', 'original'];
export const SIGNATURE_SHORT: Record<SignatureStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  review: 'Review',
  signed: 'Signed',
  original: 'Original',
};

/** The buttons of the signature panel per state (§8). */
export const SIGNATURE_ACTIONS: Record<SignatureStatus, { to: SignatureStatus | 'edit'; label: string }[]> = {
  draft: [{ to: 'sent', label: 'Contract sent to customer' }],
  sent: [
    { to: 'signed', label: 'Customer signed' },
    { to: 'review', label: 'Customer requested changes' },
  ],
  review: [
    { to: 'signed', label: 'Customer signed' },
    { to: 'edit', label: 'Edit contract clauses' },
    { to: 'sent', label: 'Revised copy sent' },
  ],
  signed: [{ to: 'original', label: 'Original copy received' }],
  original: [{ to: 'draft', label: 'Reopen signature status' }],
};

export const CHEQUE_KIND_LABELS: Record<ChequeKind, string> = { guarantee: 'Guarantee cheque', payment: 'Payment cheque' };
export const CHEQUE_STATUS_LABELS: Record<ChequeStatus, string> = {
  held: 'In safe',
  deposited: 'Deposited',
  cleared: 'Cleared',
  returned: 'Returned',
  released: 'Returned to customer',
};
export const CHEQUE_STATUSES: ChequeStatus[] = ['held', 'deposited', 'cleared', 'returned', 'released'];

export const TRIGGER_LABELS: Record<Trigger, string> = {
  due: 'Before due date',
  overdue: 'After due date',
  renewal: 'Before contract end',
  sign: 'After contract sent',
  cheque: 'Before cheque date',
};
export const RECIPIENT_LABELS: Record<Recipient, string> = { client: 'Customer', internal: 'Internal', both: 'Customer + internal' };
export const PAY_METHODS = ['Bank transfer', 'Cheque', 'InstaPay', 'SADAD', 'Cash'];

export const PLACEHOLDERS = [
  'customer',
  'contact',
  'account_manager',
  'company',
  'contract_no',
  'contract',
  'contract_value',
  'start_date',
  'end_date',
  'installment',
  'amount',
  'remaining',
  'due_date',
  'days_late',
  'days_left',
  'cheque_no',
  'bank',
  'cheque_amount',
  'cheque_date',
  'sent_date',
  'days_since_sent',
];
export const DOC_PLACEHOLDERS = ['first_party', 'governing_law', 'dispute_venue', 'period_months', 'uplift_pct'];

export const apiError = (e: unknown, fallback: string): string =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

/** Text colour per tone (KPI values, amounts). */
export const TONE_TEXT: Record<Tone, string> = {
  ok: 'text-emerald-700 dark:text-emerald-300',
  crit: 'text-error',
  info: 'text-primary',
  warn: 'text-amber-700 dark:text-amber-300',
  neutral: 'text-on-surface-variant',
};
