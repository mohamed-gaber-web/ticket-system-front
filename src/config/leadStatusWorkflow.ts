// Lead status workflow — frontend mirror of the backend's single source of
// truth (Back-end/.../src/config/leadStatusWorkflow.js). Ported from
// growpath_lead_status_simulation.html. Keep the two in sync by hand — there's
// no shared package between the two repos.
import type { Lead } from '@/types/teleSales.types';

export type LeadStatus =
  | 'New Lead'
  | 'No Answer'
  | 'Call Back Later'
  | 'Wrong Number'
  | 'Interested'
  | 'Follow-up'
  | 'Meeting Scheduled'
  | 'Proposal Sent'
  | 'Negotiation'
  | 'Closed Won'
  | 'Closed Lost';

export type StatusFieldType = 'select' | 'datetime' | 'auto' | 'text' | 'textarea' | 'toggle' | 'money' | 'chips' | 'attach';

export interface StatusFieldDef {
  k: string;
  label: string;
  ar: string;
  type: StatusFieldType;
  req?: boolean;
  reqIf?: (values: Record<string, any>, lead?: Lead | null) => boolean;
  showIf?: (values: Record<string, any>, lead?: Lead | null) => boolean;
  opts?: string[];
  hint?: string;
  /** Options come from a live list instead of `opts` — currently only 'agents'. */
  dynamic?: 'agents';
  /** Default value generator, used to pre-fill the field when the status is picked. */
  def?: () => string;
  /** Preview shown for `type: 'auto'` fields — mirrors what the server will compute. */
  val?: (lead?: Lead | null) => string;
}

export interface StatusTaskResult {
  title: string;
  due: string;
  kind: 'call' | 'follow' | 'meet' | 'deal';
}

export interface StatusWorkflowEntry {
  ar: string;
  color: string;
  bg: string;
  step: number;
  desc: string;
  fields: StatusFieldDef[];
  task?: (values: Record<string, any>) => StatusTaskResult | null;
  call?: boolean;
  fu?: boolean;
  mail?: boolean;
  att?: boolean;
}

const isoLocal = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const hoursFromNow = (h: number) => isoLocal(new Date(Date.now() + h * 3600e3));

export const LEAD_STATUSES: LeadStatus[] = [
  'New Lead', 'No Answer', 'Call Back Later', 'Wrong Number', 'Interested',
  'Follow-up', 'Meeting Scheduled', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost',
];

export const STEPS = ['New Lead', 'Contact Attempts', 'Qualified', 'Meeting', 'Proposal', 'Negotiation', 'Closed'];

export const STATUS_COLORS: Record<LeadStatus, string> = {
  'New Lead': 'bg-blue-100 text-blue-700',
  'No Answer': 'bg-gray-100 text-gray-600',
  'Call Back Later': 'bg-yellow-50 text-yellow-600',
  'Wrong Number': 'bg-gray-50 text-gray-400',
  'Interested': 'bg-green-100 text-green-700',
  'Follow-up': 'bg-yellow-100 text-yellow-700',
  'Meeting Scheduled': 'bg-purple-100 text-purple-700',
  'Proposal Sent': 'bg-indigo-100 text-indigo-700',
  'Negotiation': 'bg-orange-100 text-orange-700',
  'Closed Won': 'bg-emerald-100 text-emerald-700',
  'Closed Lost': 'bg-red-100 text-red-700',
};

const MODULES = ['D365 Finance & Operations', 'Business Central', 'Power Platform', 'MASAR Mobile App', 'Support / SLA', 'Licenses only'];

export const LEAD_STATUS_WORKFLOW: Record<LeadStatus, StatusWorkflowEntry> = {
  'New Lead': {
    ar: 'عميل محتمل جديد', color: '#1d4ed8', bg: '#e0edff', step: 0,
    desc: 'Assign an owner and set the first-contact SLA deadline.',
    fields: [
      {
        k: 'owner', label: 'Lead Owner / Assigned To', ar: 'المسؤول عن المتابعة', type: 'select', req: true, dynamic: 'agents',
        hint: 'Auto-assigned by round-robin rules, can be overridden manually.',
      },
      {
        k: 'sla', label: 'First Contact Deadline', ar: 'أقصى موعد لأول تواصل (SLA)', type: 'datetime', req: true,
        def: () => hoursFromNow(24), hint: 'Defaults to 24 hours from lead creation.',
      },
    ],
    task: (v) => ({ title: 'First contact — SLA', due: v.sla, kind: 'call' }),
  },

  'No Answer': {
    ar: 'لا يوجد رد', color: '#b45309', bg: '#fef3c7', step: 1,
    desc: 'Log a failed contact attempt and schedule the next one.',
    fields: [
      {
        k: 'attempt', label: 'Attempt Number', ar: 'رقم المحاولة', type: 'auto', req: true,
        val: (lead) => `Attempt #${(lead?.callAttempts || 0) + 1}`, hint: 'Increments automatically on every logged attempt.',
      },
      { k: 'channel', label: 'Call Channel', ar: 'قناة الاتصال', type: 'select', req: true, opts: ['Phone Call', 'WhatsApp', 'Email'] },
      { k: 'next', label: 'Next Attempt Date & Time', ar: 'موعد المحاولة القادمة', type: 'datetime', req: true, def: () => hoursFromNow(24) },
      { k: 'reminder', label: 'Create auto reminder in agent calendar', ar: 'تذكير تلقائي في تقويم الموظف', type: 'toggle' },
    ],
    task: (v) => (v.reminder ? { title: `Retry contact — ${v.channel}`, due: v.next, kind: 'call' } : null),
    call: true,
  },

  'Call Back Later': {
    ar: 'طلب الاتصال لاحقاً', color: '#7c3aed', bg: '#f3e8ff', step: 1,
    desc: 'Customer answered and asked to be called at a specific time.',
    fields: [
      { k: 'cb', label: 'Callback Date & Time', ar: 'موعد الاتصال المطلوب من العميل', type: 'datetime', req: true, def: () => hoursFromNow(48) },
      {
        k: 'reason', label: 'Reason for Delay', ar: 'سبب التأجيل', type: 'select', req: true,
        opts: ['Busy right now', 'In a meeting', 'Prefers evening contact', 'Travelling / abroad', 'Other'],
      },
      {
        k: 'reasonOther', label: 'Reason details', ar: 'تفاصيل السبب', type: 'text',
        reqIf: (v) => v.reason === 'Other', showIf: (v) => v.reason === 'Other',
      },
    ],
    task: (v) => ({ title: 'Callback requested by customer', due: v.cb, kind: 'call' }),
    call: true,
  },

  'Wrong Number': {
    ar: 'رقم خاطئ', color: '#dc2626', bg: '#fee2e2', step: 1,
    desc: 'Contact data is invalid — record the action taken.',
    fields: [
      { k: 'action', label: 'Action Taken', ar: 'الإجراء المتخذ', type: 'select', req: true, opts: ['Request correct number from source', 'Mark as invalid'] },
      {
        k: 'notes', label: 'Notes', ar: 'ملاحظات', type: 'textarea',
        reqIf: (v) => v.action === 'Request correct number from source',
        hint: 'Record the corrected number here if available.',
      },
    ],
    call: true,
  },

  'Interested': {
    ar: 'مهتم', color: '#16a34a', bg: '#dcfce7', step: 2,
    desc: 'Qualified interest confirmed — captured for the Interested queue.',
    fields: [
      { k: 'level', label: 'Interest Level', ar: 'درجة الاهتمام', type: 'select', req: true, opts: ['High', 'Medium', 'Low'] },
      { k: 'modules', label: 'Interested In', ar: 'المنتجات محل الاهتمام', type: 'chips', req: true, opts: MODULES },
      { k: 'dm', label: 'Decision Maker Reached', ar: 'تم الوصول لصاحب القرار', type: 'select', req: true, opts: ['Yes', 'No — needs escalation'] },
      { k: 'nextStep', label: 'Next Step Date', ar: 'تاريخ الخطوة القادمة', type: 'datetime', req: true, def: () => hoursFromNow(48) },
    ],
    task: (v) => ({ title: 'Next step with interested lead', due: v.nextStep, kind: 'follow' }),
  },

  'Follow-up': {
    ar: 'متابعة', color: '#0891b2', bg: '#cffafe', step: 2,
    desc: 'A successful follow-up call — document the outcome and next step.',
    fields: [
      {
        k: 'topic', label: 'Follow-up Topic', ar: 'موضوع المتابعة', type: 'select', req: true,
        opts: ['Discuss the proposal', 'Answer technical questions', 'Follow the decision', 'Requirement gathering', 'Post-meeting follow-up'],
      },
      { k: 'nextDate', label: 'Next Follow-up Date', ar: 'تاريخ المتابعة القادمة', type: 'datetime', req: true, def: () => hoursFromNow(72) },
      {
        k: 'summary', label: 'Summary of Today’s Talk', ar: 'ملخص مكالمة اليوم', type: 'textarea', req: true,
        hint: 'Key points, objections raised, and discovered needs.',
      },
    ],
    task: (v) => ({ title: `Follow-up — ${v.topic}`, due: v.nextDate, kind: 'follow' }),
    fu: true,
  },

  'Meeting Scheduled': {
    ar: 'اجتماع مجدول', color: '#1d4ed8', bg: '#e0edff', step: 3,
    desc: 'Book a meeting with the customer. Multiple rounds are supported on the same lead.',
    fields: [
      {
        k: 'round', label: 'Meeting Round', ar: 'جولة الاجتماع', type: 'auto', req: true,
        val: (lead) => `Meeting #${(lead?.meetingsCount || 0) + 1}`, hint: 'Meetings are numbered automatically per lead.',
      },
      { k: 'mTime', label: 'Meeting Date & Time', ar: 'موعد الاجتماع', type: 'datetime', req: true, def: () => hoursFromNow(96) },
      { k: 'mType', label: 'Meeting Type', ar: 'نوع الاجتماع', type: 'select', req: true, opts: ['Online (Teams)', 'On-site Visit', 'At Grow Path office'] },
      { k: 'attClient', label: 'Attendees — Client Side', ar: 'الحضور من طرف العميل', type: 'text', req: true, hint: 'Names and job titles.' },
      { k: 'attCompany', label: 'Attendees — Grow Path', ar: 'الحضور من طرف الشركة', type: 'text', req: true },
      { k: 'agenda', label: 'Meeting Agenda & Objective', ar: 'جدول الأعمال والهدف', type: 'textarea', req: true },
      {
        k: 'extraReason', label: 'Reason for Additional Meeting', ar: 'سبب طلب اجتماع إضافي', type: 'select',
        opts: [
          'Detailed demo for a specific module', 'New decision makers joining', 'Discuss commercial revisions',
          'Discovery / requirement workshop', 'Technical review with IT team', 'Customer requested another session',
        ],
        reqIf: (_v, lead) => (lead?.meetingsCount || 0) > 0, showIf: (_v, lead) => (lead?.meetingsCount || 0) > 0,
      },
      {
        k: 'prevOutcome', label: 'Previous Meeting Outcome', ar: 'مخرجات الاجتماع السابق', type: 'textarea',
        reqIf: (_v, lead) => (lead?.meetingsCount || 0) > 0, showIf: (_v, lead) => (lead?.meetingsCount || 0) > 0,
        hint: 'What was agreed and which open points this meeting addresses.',
      },
    ],
    task: (v) => ({ title: `Customer meeting — ${v.mType}`, due: v.mTime, kind: 'meet' }),
    fu: true,
  },

  'Proposal Sent': {
    ar: 'تم إرسال العرض', color: '#0891b2', bg: '#cffafe', step: 4,
    desc: 'Technical and commercial proposal delivered, awaiting the customer decision.',
    fields: [
      { k: 'file', label: 'Proposal File / Link', ar: 'ملف العرض أو الرابط', type: 'attach', req: true },
      { k: 'value', label: 'Quoted Value', ar: 'القيمة المالية للعرض', type: 'money', req: true },
      { k: 'due', label: 'Decision Due Date', ar: 'الموعد المتوقع لرد العميل', type: 'datetime', req: true, def: () => hoursFromNow(168) },
    ],
    task: (v) => ({ title: 'Chase proposal decision', due: v.due, kind: 'follow' }),
    mail: true,
    att: true,
  },

  'Negotiation': {
    ar: 'تفاوض', color: '#b45309', bg: '#fef3c7', step: 5,
    desc: 'Negotiating terms before closing the deal.',
    fields: [
      {
        k: 'points', label: 'Negotiation Points', ar: 'النقاط الجاري التفاوض عليها', type: 'chips', req: true,
        opts: ['Price', 'Scope', 'Payment Terms', 'SLA', 'Implementation timeline', 'Number of licenses'],
      },
      { k: 'revised', label: 'Revised Value', ar: 'القيمة المالية المعدلة', type: 'money' },
      { k: 'closeDate', label: 'Expected Closing Date', ar: 'التاريخ المتوقع للإغلاق', type: 'datetime', req: true, def: () => hoursFromNow(240) },
    ],
    task: (v) => ({ title: 'Expected deal closing', due: v.closeDate, kind: 'deal' }),
    fu: true,
  },

  'Closed Won': {
    ar: 'صفقة ناجحة', color: '#16a34a', bg: '#dcfce7', step: 6,
    desc: 'Contract signed and project handed over to delivery.',
    fields: [
      { k: 'final', label: 'Final Deal Value', ar: 'قيمة العقد النهائية', type: 'money', req: true },
      { k: 'contract', label: 'Contract / PO Attachment', ar: 'العقد الموقع أو أمر الشراء', type: 'attach', req: true },
      {
        k: 'winReason', label: 'Win Reason', ar: 'سبب اختيار العميل لنا', type: 'select', req: true,
        opts: ['Product Features', 'Price', 'Relationship', 'Expertise in same industry', 'Response speed'],
      },
      {
        k: 'handover', label: 'Handover To', ar: 'مسؤول التنفيذ المستلم', type: 'select', req: true,
        opts: ['Project Manager — Implementation', 'Operations Team', 'Account Manager'],
      },
    ],
    task: (v) => ({ title: `Project handover to ${v.handover}`, due: hoursFromNow(48), kind: 'deal' }),
    att: true,
  },

  'Closed Lost': {
    ar: 'صفقة خاسرة', color: '#dc2626', bg: '#fee2e2', step: 6,
    desc: 'Lead closed — capture the loss reason for future learning.',
    fields: [
      {
        k: 'lossReason', label: 'Loss Reason', ar: 'السبب الرئيسي للخسارة', type: 'select', req: true,
        opts: ['Competitor', 'Budget', 'Technical Fit', 'Delayed Response', 'Project postponed'],
      },
      {
        k: 'competitor', label: 'Competitor Name', ar: 'اسم المنافس الفائز', type: 'text',
        reqIf: (v) => v.lossReason === 'Competitor', showIf: (v) => v.lossReason === 'Competitor',
      },
      { k: 'lessons', label: 'Lessons Learned / Feedback', ar: 'الدروس المستفادة', type: 'textarea', req: true },
    ],
  },
};

// Allowed transitions from each status. Self-transitions (e.g. "No Answer" →
// "No Answer") are intentional — they represent another logged attempt.
export const NEXT: Record<LeadStatus, LeadStatus[]> = {
  'New Lead': ['No Answer', 'Call Back Later', 'Wrong Number', 'Interested', 'Follow-up', 'Meeting Scheduled', 'Closed Lost'],
  'No Answer': ['No Answer', 'Call Back Later', 'Wrong Number', 'Interested', 'Follow-up', 'Meeting Scheduled', 'Closed Lost'],
  'Call Back Later': ['No Answer', 'Call Back Later', 'Interested', 'Follow-up', 'Meeting Scheduled', 'Closed Lost'],
  'Wrong Number': ['New Lead', 'Follow-up', 'Closed Lost'],
  'Interested': ['Follow-up', 'Meeting Scheduled', 'Proposal Sent', 'No Answer', 'Call Back Later', 'Closed Lost'],
  'Follow-up': ['Follow-up', 'Meeting Scheduled', 'Proposal Sent', 'No Answer', 'Call Back Later', 'Closed Lost'],
  'Meeting Scheduled': ['Meeting Scheduled', 'Follow-up', 'Proposal Sent', 'No Answer', 'Closed Lost'],
  'Proposal Sent': ['Negotiation', 'Meeting Scheduled', 'Follow-up', 'Closed Won', 'Closed Lost'],
  'Negotiation': ['Meeting Scheduled', 'Proposal Sent', 'Follow-up', 'Closed Won', 'Closed Lost'],
  'Closed Won': [],
  'Closed Lost': ['New Lead'],
};

export const isTransitionAllowed = (from: LeadStatus, to: LeadStatus) => (NEXT[from] || []).includes(to);

const isFieldVisible = (field: StatusFieldDef, values: Record<string, any>, lead?: Lead | null) =>
  !field.showIf || field.showIf(values, lead);
const isFieldRequired = (field: StatusFieldDef, values: Record<string, any>, lead?: Lead | null) =>
  !!field.req || (field.reqIf ? field.reqIf(values, lead) : false);

const isFieldFilled = (field: StatusFieldDef, values: Record<string, any>) => {
  const raw = values ? values[field.k] : undefined;
  switch (field.type) {
    case 'auto':
      return true;
    case 'toggle':
      return true;
    case 'chips':
      return Array.isArray(raw) && raw.length > 0;
    case 'attach':
      if (raw == null) return false;
      if (typeof raw === 'string') return raw.trim().length > 0;
      return !!raw.fileId;
    case 'money':
      return Number(raw) > 0;
    default:
      return raw != null && String(raw).trim().length > 0;
  }
};

export interface StatusFieldError {
  field: string;
  label: string;
  message: string;
}

/** Client-side mirror of the backend's validateStatusFields — instant inline
 * feedback in the modal. The server call is the authoritative check. */
export const validateStatusFields = (
  statusKey: LeadStatus,
  values: Record<string, any>,
  lead?: Lead | null
): { valid: boolean; errors: StatusFieldError[] } => {
  const config = LEAD_STATUS_WORKFLOW[statusKey];
  if (!config) return { valid: false, errors: [{ field: '', label: '', message: `Unknown status "${statusKey}"` }] };

  const errors: StatusFieldError[] = [];
  config.fields.forEach((field) => {
    if (!isFieldVisible(field, values, lead)) return;
    if (!isFieldRequired(field, values, lead)) return;
    if (!isFieldFilled(field, values)) {
      errors.push({ field: field.k, label: field.label, message: `${field.label} is required` });
    }
  });
  return { valid: errors.length === 0, errors };
};
