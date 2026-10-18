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

// Grow Path Collect — formatting, Arabic labels and date helpers shared by
// every Collect screen. Pure (type-only imports) so `npm test` can run it.
// Dates are "YYYY-MM-DD" strings, maths in whole UTC days (like the backend's
// utils/collect/dates.js).

export const CURRENCIES: Currency[] = ['EGP', 'SAR', 'USD'];
export const CURRENCY_LABELS: Record<Currency, string> = { EGP: 'ج.م', SAR: 'ر.س', USD: '$' };
export const CURRENCY_NAMES: Record<Currency, string> = { EGP: 'جنيه مصري', SAR: 'ريال سعودي', USD: 'دولار أمريكي' };

export const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
export const AR_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const n0f = new Intl.NumberFormat('en', { maximumFractionDigits: 0 });
export const n0 = (v: number | null | undefined) => n0f.format(Math.round(Number(v) || 0));

/** "1,250,000 ج.م" */
export const money = (v: number | null | undefined, cur: Currency | string = 'EGP') =>
  `${n0(v)} ${CURRENCY_LABELS[cur as Currency] ?? cur}`;

/** "1.25 م", "350 ألف", "900" — chart axes and tight tiles. */
export const compact = (v: number | null | undefined) => {
  const n = Number(v) || 0;
  const a = Math.abs(n);
  const trim = (x: number) => String(Math.round(x * 100) / 100);
  if (a >= 1e9) return `${trim(n / 1e9)} مليار`;
  if (a >= 1e6) return `${trim(n / 1e6)} م`;
  if (a >= 1e3) return `${trim(n / 1e3)} ألف`;
  return n0(n);
};

export const pct = (v: number | null | undefined, digits = 0) =>
  v == null || !Number.isFinite(v) ? '—' : `${(v * 100).toFixed(digits)}%`;

// ── Dates ────────────────────────────────────────────────────────────────────

const toDays = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
};
const fromDays = (n: number) => new Date(n * 86_400_000).toISOString().slice(0, 10);

export const addDays = (s: string, n: number) => fromDays(toDays(s) + n);
/** a − b in whole days. */
export const diffDays = (a: string, b: string) => toDays(a) - toDays(b);
export const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

/** "11 أكتوبر 2026" */
export const arDate = (s?: string | null) => {
  if (!isDate(s)) return '—';
  const [y, m, d] = s.split('-').map(Number);
  return `${d} ${AR_MONTHS[m - 1]} ${y}`;
};
/** "11 أكتوبر" */
export const arDateShort = (s?: string | null) => {
  if (!isDate(s)) return '—';
  const [, m, d] = s.split('-').map(Number);
  return `${d} ${AR_MONTHS[m - 1]}`;
};
/** "أكتوبر 2026" from "2026-10" or a date */
export const arMonth = (s: string) => {
  const [y, m] = s.split('-').map(Number);
  return `${AR_MONTHS[m - 1]} ${y}`;
};
export const weekdayOf = (s: string) => AR_DAYS[new Date(`${s}T00:00:00Z`).getUTCDay()];

/** "منذ 3 يوم" / "بعد 5 يوم" / "اليوم" relative to today. */
export const relDays = (date: string, today: string) => {
  const d = diffDays(date, today);
  if (d === 0) return 'اليوم';
  return d > 0 ? `بعد ${d} يوم` : `منذ ${-d} يوم`;
};

// ── Labels ───────────────────────────────────────────────────────────────────

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  active: 'ساري',
  closed: 'مكتمل',
  renewed: 'تم تجديده',
  cancelled: 'ملغي',
};

export const BILLING_LABELS: Record<BillingMode, string> = {
  phases: 'مراحل (نسب مرتبطة بالتنفيذ)',
  recurring: 'دوري (كل عدد من الشهور)',
  renewal: 'تجديد (دفعة واحدة للفترة)',
};

export const ANCHOR_LABELS: Record<PhaseAnchor, string> = {
  start: 'بداية العقد',
  delivery: 'التسليم',
  end: 'نهاية العقد',
};

export const SIGNATURE_LABELS: Record<SignatureStatus, string> = {
  draft: 'مسودة',
  sent: 'أُرسل للعميل',
  review: 'العميل يراجع / طلب تعديلات',
  signed: 'وقّع العميل — الأصل لم يُستلم',
  original: 'موقّع والأصل مستلم',
};
export const SIGNATURE_STEPS: SignatureStatus[] = ['draft', 'sent', 'review', 'signed', 'original'];
export const SIGNATURE_SHORT: Record<SignatureStatus, string> = {
  draft: 'مسودة',
  sent: 'أُرسل',
  review: 'مراجعة',
  signed: 'موقّع',
  original: 'الأصل مستلم',
};

/** The buttons of the signature panel per state (§8). */
export const SIGNATURE_ACTIONS: Record<SignatureStatus, { to: SignatureStatus | 'edit'; label: string }[]> = {
  draft: [{ to: 'sent', label: 'تم إرسال العقد للعميل' }],
  sent: [
    { to: 'signed', label: 'وقّع العميل' },
    { to: 'review', label: 'العميل طلب تعديلات' },
  ],
  review: [
    { to: 'signed', label: 'وقّع العميل' },
    { to: 'edit', label: 'تعديل بنود العقد' },
    { to: 'sent', label: 'أُرسلت نسخة معدّلة' },
  ],
  signed: [{ to: 'original', label: 'استلمنا النسخة الأصلية' }],
  original: [{ to: 'draft', label: 'إعادة فتح حالة التوقيع' }],
};

export const CHEQUE_KIND_LABELS: Record<ChequeKind, string> = { guarantee: 'شيك ضمان', payment: 'شيك سداد' };
export const CHEQUE_STATUS_LABELS: Record<ChequeStatus, string> = {
  held: 'في الخزنة',
  deposited: 'تم الإيداع',
  cleared: 'تم التحصيل',
  returned: 'مرتجع',
  released: 'أُعيد للعميل',
};
export const CHEQUE_STATUSES: ChequeStatus[] = ['held', 'deposited', 'cleared', 'returned', 'released'];

export const TRIGGER_LABELS: Record<Trigger, string> = {
  due: 'قبل الاستحقاق',
  overdue: 'بعد التأخير',
  renewal: 'قبل انتهاء العقد',
  sign: 'بعد إرسال العقد',
  cheque: 'قبل تاريخ الشيك',
};
export const RECIPIENT_LABELS: Record<Recipient, string> = { client: 'العميل', internal: 'داخلي', both: 'العميل + داخلي' };
export const PAY_METHODS = ['تحويل بنكي', 'شيك', 'إنستاباي', 'سداد', 'نقدي'];

export const PLACEHOLDERS = [
  'العميل',
  'جهة_الاتصال',
  'مدير_الحساب',
  'الشركة',
  'رقم_العقد',
  'العقد',
  'قيمة_العقد',
  'تاريخ_البداية',
  'تاريخ_الانتهاء',
  'القسط',
  'المبلغ',
  'المتبقي',
  'تاريخ_الاستحقاق',
  'أيام_التأخير',
  'الأيام_المتبقية',
  'رقم_الشيك',
  'البنك',
  'قيمة_الشيك',
  'تاريخ_الشيك',
  'تاريخ_الإرسال',
  'أيام_منذ_الإرسال',
];
export const DOC_PLACEHOLDERS = ['الطرف_الأول', 'القانون_الحاكم', 'جهة_النزاع', 'كل_شهور', 'نسبة_الزيادة'];

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

