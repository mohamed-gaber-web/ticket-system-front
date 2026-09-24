import type { ConsultantStatus } from '@/types/consultant.types';

/**
 * HR vocabulary — option lists for the employee file. The values mirror
 * HR_ENUMS in the backend's src/models/Consltant.js; keep the two in step.
 */

type Option = { value: string; label: string };

// ── Routes — the employee directory lives under the HR module ────────────────
export const EMPLOYEES_PATH = '/hr/employees';
export const EMPLOYEE_CREATE_PATH = '/hr/employees/create';
export const employeeEditPath = (id: string) => `/hr/employees/edit/${id}`;
export const employeeViewPath = (id: string) => `/hr/employees/view/${id}`;

export const GENDER_OPTIONS: Option[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

export const MARITAL_STATUS_OPTIONS: Option[] = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widowed' },
];

export const HIRING_SOURCE_OPTIONS: Option[] = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'job_board', label: 'Job board' },
  { value: 'referral', label: 'Employee referral' },
  { value: 'company_website', label: 'Company website' },
  { value: 'recruitment_agency', label: 'Recruitment agency' },
  { value: 'university', label: 'University / internship program' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'other', label: 'Other' },
];

export const INTERVIEW_RESULT_OPTIONS: Option[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'passed', label: 'Passed' },
  { value: 'failed', label: 'Failed' },
  { value: 'on_hold', label: 'On hold' },
];

export const CONTRACT_TYPE_OPTIONS: Option[] = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'fixed_term', label: 'Fixed-term' },
  { value: 'temporary', label: 'Temporary' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'internship', label: 'Internship' },
];

export const SALARY_PAYMENT_OPTIONS: Option[] = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'mobile_wallet', label: 'Mobile wallet' },
];

export const EMPLOYEE_STATUS_OPTIONS: { value: ConsultantStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'resigned', label: 'Resigned' },
  { value: 'terminated', label: 'Terminated' },
];

/**
 * Egyptian social-insurance split of the insurance wage (Law 148/2019):
 * 11% employee, 18.75% employer. Used only to pre-fill the two share fields;
 * HR can overwrite them.
 */
export const INSURANCE_RATES = { employee: 0.11, employer: 0.1875 } as const;

/** Label for a stored option value, or the value itself / an em dash. */
export const optionLabel = (options: Option[], value?: string | null): string =>
  value ? options.find((o) => o.value === value)?.label ?? value : '—';

/** ISO date string → yyyy-mm-dd for <input type="date">. */
export const toDateInput = (value?: string | null): string => (value ? String(value).slice(0, 10) : '');

/** yyyy-mm-dd + n months → yyyy-mm-dd (day clamped to the target month). */
export const addMonths = (date: string, months: number): string => {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return '';
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
};

export const formatMoney = (value?: number | null): string =>
  value === null || value === undefined ? '—' : value.toLocaleString('en-US', { maximumFractionDigits: 2 });

export const formatDate = (value?: string | null): string =>
  value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ── HR documents ──────────────────────────────────────────────────────────────
// Values mirror EMPLOYEE_DOCUMENT_TYPES in the backend's src/models/EmployeeDocument.js.

export type EmployeeDocumentType =
  | 'national_id'
  | 'birth_certificate'
  | 'graduation_certificate'
  | 'criminal_record'
  | 'military_status'
  | 'insurance_record'
  | 'cv'
  | 'personal_photo'
  | 'other';

export interface DocumentTypeDef {
  value: EmployeeDocumentType;
  label: string;
  /** The Arabic name HR uses for it. */
  labelAr: string;
  /** Part of the standard hiring file — flagged when missing. */
  required?: boolean;
  /** Offer an expiry date (ID cards, certificates that lapse). */
  expires?: boolean;
}

export const DOCUMENT_TYPES: DocumentTypeDef[] = [
  { value: 'national_id', label: 'National ID', labelAr: 'بطاقة الرقم القومي', required: true, expires: true },
  { value: 'birth_certificate', label: 'Birth Certificate', labelAr: 'شهادة الميلاد', required: true },
  { value: 'graduation_certificate', label: 'Graduation Certificate', labelAr: 'شهادة التخرج', required: true },
  { value: 'criminal_record', label: 'Criminal Record Certificate', labelAr: 'فيش وتشبيه', required: true, expires: true },
  { value: 'military_status', label: 'Military Status Certificate', labelAr: 'شهادة الموقف من التجنيد' },
  { value: 'insurance_record', label: 'Social Insurance Record', labelAr: 'برنت التأمينات' },
  { value: 'cv', label: 'CV', labelAr: 'السيرة الذاتية' },
  { value: 'personal_photo', label: 'Personal Photos', labelAr: 'صور شخصية' },
  { value: 'other', label: 'Other Documents', labelAr: 'مستندات أخرى' },
];

/** Upload limits — keep in step with employeeDocumentController.js. */
export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
export const DOCUMENT_MAX_FILES = 10;
export const DOCUMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx';
const DOCUMENT_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

/** Why a file cannot be uploaded, or null when it can. */
export const documentFileProblem = (file: File): string | null => {
  if (!DOCUMENT_MIME.has(file.type)) return `${file.name}: only PDF, images and Word files are allowed`;
  if (file.size > DOCUMENT_MAX_BYTES) return `${file.name}: larger than 10 MB`;
  return null;
};

export const formatBytes = (bytes?: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};
