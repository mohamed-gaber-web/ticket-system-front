import { toDateInput } from '@/lib/hr';
import type { EmployeeRole, ModuleKey } from '@/types/auth.types';
import type { Consultant, ConsultantStatus, EmployeeHrFile, UpdateConsultantData } from '@/types/consultant.types';

// ── Form model ────────────────────────────────────────────────────────────────
// Every HR input is kept as a string while editing ("" = empty) and converted
// once, on submit, into the typed payload the API expects.

export const HR_TEXT_KEYS = [
  'fullLegalName', 'nationalId', 'dateOfBirth', 'gender', 'maritalStatus', 'address',
  'hiringSource', 'recruiterName', 'applicationDate', 'interviewDate', 'interviewResult',
  'section', 'directManager', 'hireDate',
  'contractType', 'contractEndDate',
  'salaryPaymentMethod', 'bankName', 'bankAccount',
  'medicalStartDate', 'medicalEndDate', 'notes',
] as const;
export const HR_NUMBER_KEYS = [
  'contractDurationMonths', 'probationPeriodMonths',
  'basicSalary', 'grossSalary', 'netSalary',
  'insuranceWage', 'employeeInsuranceShare', 'employerInsuranceShare',
] as const;
/** Yes/no answers, kept as 'yes' | 'no' | '' ('' = not answered yet). */
export const HR_BOOL_KEYS = ['hasSocialInsurance', 'hasMedicalInsurance', 'hasCompanyLine', 'hasLaptop', 'uberSubscriber'] as const;
/** Shown as checkboxes: unchecked means "no", never "not answered". */
const CHECKBOX_KEYS = new Set<string>(['hasCompanyLine', 'hasLaptop', 'uberSubscriber']);
const HR_DATE_KEYS = new Set(['dateOfBirth', 'applicationDate', 'interviewDate', 'hireDate', 'contractEndDate', 'medicalStartDate', 'medicalEndDate']);

export type HrKey = (typeof HR_TEXT_KEYS)[number] | (typeof HR_NUMBER_KEYS)[number] | (typeof HR_BOOL_KEYS)[number];
export type HrValues = Record<HrKey, string>;

export interface EmployeeFormValues {
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  password: string;
  role: EmployeeRole;
  department?: string | null;
  teleSalesTeam?: string | null;
  modules: ModuleKey[];
  status: ConsultantStatus;
  monthlyTargetHours: string;
  profilePicture: string | null;
  hr: HrValues;
}

const emptyHr = (): HrValues =>
  Object.fromEntries([...HR_TEXT_KEYS, ...HR_NUMBER_KEYS, ...HR_BOOL_KEYS].map((k) => [k, ''])) as HrValues;

export const emptyEmployeeForm = (role: EmployeeRole): EmployeeFormValues => ({
  employeeCode: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  position: '',
  password: '',
  role,
  department: undefined,
  teleSalesTeam: null,
  modules: [],
  status: 'active',
  monthlyTargetHours: '',
  profilePicture: null,
  hr: emptyHr(),
});

const refId = (v: unknown): string =>
  v && typeof v === 'object' ? String((v as { _id: string })._id) : v ? String(v) : '';

/** An employee from the API → form values. */
export const employeeToForm = (c: Consultant): EmployeeFormValues => {
  const hr = emptyHr();
  const file = (c.hr ?? {}) as Record<string, unknown>;
  for (const k of HR_TEXT_KEYS) {
    const v = file[k];
    hr[k] = k === 'directManager' ? refId(v) : HR_DATE_KEYS.has(k) ? toDateInput(v as string) : v == null ? '' : String(v);
  }
  for (const k of HR_NUMBER_KEYS) {
    const v = file[k];
    hr[k] = v == null ? '' : String(v);
  }
  for (const k of HR_BOOL_KEYS) {
    const v = file[k];
    hr[k] = v === true ? 'yes' : v === false ? 'no' : '';
  }
  // Files saved before the insurance switch existed: insured if amounts were recorded
  if (!hr.hasSocialInsurance && (Number(hr.insuranceWage) > 0 || hr.employeeInsuranceShare || hr.employerInsuranceShare)) {
    hr.hasSocialInsurance = 'yes';
  }
  return {
    employeeCode: c.employeeCode ?? '',
    firstName: c.firstName ?? '',
    lastName: c.lastName ?? '',
    email: c.email ?? '',
    phone: c.phone ?? '',
    position: c.position ?? '',
    password: '',
    role: c.role,
    department: refId(c.department) || undefined,
    teleSalesTeam: refId(c.teleSalesTeam) || null,
    modules: c.modules ?? [],
    status: c.status,
    monthlyTargetHours: c.monthlyTargetHours == null ? '' : String(c.monthlyTargetHours),
    profilePicture: c.profilePicture ?? null,
    hr,
  };
};

const num = (v: string): number | null => (v.trim() === '' ? null : Number(v));

/**
 * Form values → API payload. The HR file and employee code are only sent when
 * the caller may write them (the API ignores them otherwise anyway).
 */
export const formToPayload = (v: EmployeeFormValues, withHr: boolean): UpdateConsultantData => {
  const payload: UpdateConsultantData = {
    firstName: v.firstName.trim(),
    lastName: v.lastName.trim(),
    email: v.email.trim(),
    phone: v.phone.trim(),
    position: v.position.trim(),
    role: v.role,
    department: v.department ?? null,
    teleSalesTeam: v.teleSalesTeam ?? null,
    modules: v.modules,
    status: v.status,
    monthlyTargetHours: num(v.monthlyTargetHours),
    profilePicture: v.profilePicture,
  };
  if (withHr) {
    const hr: Record<string, string | number | boolean | null> = {};
    for (const k of HR_TEXT_KEYS) hr[k] = v.hr[k].trim() === '' ? null : v.hr[k].trim();
    for (const k of HR_NUMBER_KEYS) hr[k] = num(v.hr[k]);
    const bools: Record<string, boolean | null> = {};
    for (const k of HR_BOOL_KEYS) {
      const a = v.hr[k];
      bools[k] = a === 'yes' ? true : a === 'no' || CHECKBOX_KEYS.has(k) ? false : null;
    }
    // Dates only mean something while covered (the API clears them on "no" too)
    if (!bools.hasMedicalInsurance) {
      hr.medicalStartDate = null;
      hr.medicalEndDate = null;
    }
    Object.assign(hr, bools);
    payload.employeeCode = v.employeeCode.trim();
    payload.hr = hr as EmployeeHrFile;
  }
  return payload;
};
