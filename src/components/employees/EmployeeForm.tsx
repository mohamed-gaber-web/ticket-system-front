import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Banknote,
  Briefcase,
  Calculator,
  FileSignature,
  FolderOpen,
  IdCard,
  KeyRound,
  Lock,
  Save,
  ShieldCheck,
  StickyNote,
  User,
  UserSearch,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CustomSelect } from '@/components/ui/custom-select';
import { ConsultantSelect } from '@/components/ui/consultant-select';
import { ProfilePictureUpload } from '@/components/ui/profile-picture-upload';
import { EmployeeAccessFields } from '@/components/employees/EmployeeAccessFields';
import { EmployeeDocuments, type StagedDocumentUpload } from '@/components/employees/EmployeeDocuments';
import { useAccess } from '@/redux/hooks/useAccess';
import { getConsultants } from '@/api/consultantApi';
import { cn } from '@/lib/utils';
import { holdsPrivilegedModule } from '@/lib/access';
import {
  CONTRACT_TYPE_OPTIONS,
  EMPLOYEE_STATUS_OPTIONS,
  GENDER_OPTIONS,
  HIRING_SOURCE_OPTIONS,
  INSURANCE_RATES,
  INTERVIEW_RESULT_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  SALARY_PAYMENT_OPTIONS,
  addMonths,
  formatDate,
} from '@/lib/hr';
import type { Consultant, ConsultantStatus, CreateConsultantData, UpdateConsultantData } from '@/types/consultant.types';
import {
  HR_NUMBER_KEYS,
  formToPayload,
  type EmployeeFormValues,
  type HrKey,
} from '@/components/employees/employeeFormModel';

// ── Sections ──────────────────────────────────────────────────────────────────

interface SectionDef {
  id: string;
  title: string;
  description: string;
  icon: typeof User;
  /** Part of the confidential HR file — admins and HR only. */
  confidential?: boolean;
}

const SECTIONS: SectionDef[] = [
  { id: 'basic', title: 'Basic Information', description: 'Name, contact and employee code', icon: IdCard },
  { id: 'personal', title: 'Personal Details', description: 'Identity and family data', icon: User, confidential: true },
  { id: 'job', title: 'Job & Placement', description: 'Title, department, reporting line and status', icon: Briefcase },
  { id: 'recruitment', title: 'Recruitment', description: 'How and when this person was hired', icon: UserSearch, confidential: true },
  { id: 'contract', title: 'Contract', description: 'Contract type, duration and probation', icon: FileSignature, confidential: true },
  { id: 'payroll', title: 'Payroll', description: 'Salary and how it is paid', icon: Banknote, confidential: true },
  { id: 'insurance', title: 'Social Insurance', description: 'Insurance wage and contribution shares', icon: ShieldCheck, confidential: true },
  { id: 'documents', title: 'Documents', description: 'National ID, certificates and other scanned papers', icon: FolderOpen, confidential: true },
  { id: 'access', title: 'System Access', description: 'Role, modules and login', icon: KeyRound },
  { id: 'notes', title: 'Notes', description: 'Anything else HR should know', icon: StickyNote, confidential: true },
];

function Section({ def, children }: { def: SectionDef; children: ReactNode }) {
  const Icon = def.icon;
  return (
    <section id={`section-${def.id}`} className="form-card scroll-mt-6">
      <header className="flex items-start justify-between gap-3 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-on-surface">{def.title}</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">{def.description}</p>
          </div>
        </div>
        {def.confidential && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 shrink-0">
            <Lock className="w-3 h-3" />
            HR only
          </span>
        )}
      </header>
      {children}
    </section>
  );
}

function Field({
  label,
  required,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label className="form-label">
        {label}
        {required && <span className="required">*</span>}
      </label>
      {children}
      {error ? <p className="form-error">{error}</p> : hint ? <p className="text-xs text-on-surface-variant mt-1">{hint}</p> : null}
    </div>
  );
}

const Grid = ({ children }: { children: ReactNode }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-5">{children}</div>
);

// ── The form ──────────────────────────────────────────────────────────────────

interface Props {
  mode: 'create' | 'edit';
  initialValues: EmployeeFormValues;
  departments: { _id: string; name: string }[];
  submitting: boolean;
  /** The record being edited — excluded from the direct-manager picker. */
  employeeId?: string;
  /**
   * Create mode receives the password too, plus the documents chosen on the
   * form (to upload once the employee exists). In edit mode documents upload
   * immediately, so the list is always empty.
   */
  onSubmit: (payload: CreateConsultantData | UpdateConsultantData, documents: StagedDocumentUpload[]) => void;
  onCancel: () => void;
}

/**
 * The employee create/edit form, organised into sections that follow the HR
 * employee sheet. Admins and HR see and edit the whole file; managers only see
 * the sections that are not confidential (basic, job, system access).
 *
 * `initialValues` is read once — mount the form after the record has loaded
 * (or give it a `key`) rather than feeding it new values later.
 */
export function EmployeeForm({ mode, initialValues, departments, submitting, employeeId, onSubmit, onCancel }: Props) {
  const access = useAccess();
  const withHr = access.isHr;
  const [values, setValues] = useState<EmployeeFormValues>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeSection, setActiveSection] = useState('basic');
  const [stagedDocuments, setStagedDocuments] = useState<StagedDocumentUpload[]>([]);
  // Same rule as the API: only an admin edits the file of an admin or of
  // someone holding HR/admin access
  const canEditDocuments =
    withHr && (access.isAdmin || !holdsPrivilegedModule(initialValues.role, initialValues.modules));
  const [people, setPeople] = useState<Consultant[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  // Derived fields follow their inputs until the user types into them
  const [endDateTouched, setEndDateTouched] = useState(Boolean(initialValues.hr.contractEndDate));
  const [sharesTouched, setSharesTouched] = useState(
    Boolean(initialValues.hr.employeeInsuranceShare || initialValues.hr.employerInsuranceShare),
  );

  const sections = useMemo(() => SECTIONS.filter((s) => withHr || !s.confidential), [withHr]);

  // Candidates for "direct manager"
  useEffect(() => {
    if (!withHr) return;
    setPeopleLoading(true);
    getConsultants({ limit: 1000, status: 'active' })
      .then((res) => setPeople(res.data.filter((p) => p._id !== employeeId)))
      .catch(() => setPeople([]))
      .finally(() => setPeopleLoading(false));
  }, [withHr, employeeId]);

  // Highlight the section in view in the side navigation
  useEffect(() => {
    const els = sections
      .map((s) => document.getElementById(`section-${s.id}`))
      .filter((el): el is HTMLElement => el !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.id.replace('section-', ''));
      },
      { rootMargin: '-10% 0px -70% 0px' },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  const set = <K extends keyof EmployeeFormValues>(key: K, value: EmployeeFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key as string]) setErrors((prev) => ({ ...prev, [key as string]: '' }));
  };

  const setHr = (key: HrKey, value: string) => {
    setValues((prev) => {
      const hr = { ...prev.hr, [key]: value };
      if (!endDateTouched && (key === 'hireDate' || key === 'contractDurationMonths')) {
        const months = Number(hr.contractDurationMonths);
        hr.contractEndDate = hr.hireDate && months > 0 ? addMonths(hr.hireDate, months) : hr.contractEndDate;
      }
      if (!sharesTouched && key === 'insuranceWage') {
        const wage = Number(value);
        hr.employeeInsuranceShare = value && wage >= 0 ? (wage * INSURANCE_RATES.employee).toFixed(2) : '';
        hr.employerInsuranceShare = value && wage >= 0 ? (wage * INSURANCE_RATES.employer).toFixed(2) : '';
      }
      return { ...prev, hr };
    });
    if (errors[`hr.${key}`]) setErrors((prev) => ({ ...prev, [`hr.${key}`]: '' }));
  };

  const recalcShares = () => {
    const wage = Number(values.hr.insuranceWage) || 0;
    setValues((prev) => ({
      ...prev,
      hr: {
        ...prev.hr,
        employeeInsuranceShare: (wage * INSURANCE_RATES.employee).toFixed(2),
        employerInsuranceShare: (wage * INSURANCE_RATES.employer).toFixed(2),
      },
    }));
    setSharesTouched(false);
  };

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!values.firstName.trim()) e.firstName = 'First name is required';
    if (!values.lastName.trim()) e.lastName = 'Last name is required';
    if (!values.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) e.email = 'Invalid email format';
    if (mode === 'create') {
      if (!values.password) e.password = 'Password is required';
      else if (values.password.length < 8) e.password = 'Password must be at least 8 characters';
    }
    if (values.phone && !/^\+?\d{10,15}$/.test(values.phone.replace(/[\s-]/g, ''))) e.phone = 'Mobile must be 10-15 digits';
    // Without a team a sales employee would see no leads at all
    if (values.role === 'sales' && !values.teleSalesTeam) e.teleSalesTeam = 'Choose the tele-sales team this employee works in';
    if (withHr) {
      const hr = values.hr;
      if (hr.nationalId && !/^[A-Za-z0-9]{5,20}$/.test(hr.nationalId)) e['hr.nationalId'] = 'Letters and digits only (14 digits for an Egyptian ID)';
      if (hr.hireDate && hr.contractEndDate && hr.contractEndDate < hr.hireDate) e['hr.contractEndDate'] = 'Contract end date is before the hire date';
      if (hr.applicationDate && hr.interviewDate && hr.interviewDate < hr.applicationDate) e['hr.interviewDate'] = 'Interview date is before the application date';
      for (const k of HR_NUMBER_KEYS) {
        if (hr[k] !== '' && (Number.isNaN(Number(hr[k])) || Number(hr[k]) < 0)) e[`hr.${k}`] = 'Must be a positive number';
      }
      if (hr.grossSalary && hr.netSalary && Number(hr.netSalary) > Number(hr.grossSalary)) e['hr.netSalary'] = 'Net salary cannot exceed gross salary';
    }
    return e;
  };

  // Which section a field error lives in, to scroll to the first one
  const SECTION_OF: Record<string, string> = {
    firstName: 'basic', lastName: 'basic', email: 'basic', phone: 'basic', password: 'access', teleSalesTeam: 'access',
    'hr.nationalId': 'personal', 'hr.interviewDate': 'recruitment', 'hr.contractEndDate': 'contract',
    'hr.contractDurationMonths': 'contract', 'hr.probationPeriodMonths': 'contract',
    'hr.basicSalary': 'payroll', 'hr.grossSalary': 'payroll', 'hr.netSalary': 'payroll',
    'hr.insuranceWage': 'insurance', 'hr.employeeInsuranceShare': 'insurance', 'hr.employerInsuranceShare': 'insurance',
  };

  const scrollTo = (id: string) => document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    const first = Object.keys(e)[0];
    if (first) {
      scrollTo(SECTION_OF[first] ?? 'basic');
      return;
    }
    const payload = formToPayload(values, withHr);
    onSubmit(mode === 'create' ? ({ ...payload, password: values.password } as CreateConsultantData) : payload, stagedDocuments);
  };

  const errorCount = (sectionId: string) =>
    Object.entries(errors).filter(([k, v]) => v && (SECTION_OF[k] ?? 'basic') === sectionId).length;

  const hr = values.hr;
  const probationEnds =
    hr.hireDate && Number(hr.probationPeriodMonths) > 0 ? addMonths(hr.hireDate, Number(hr.probationPeriodMonths)) : '';
  const showBank = hr.salaryPaymentMethod === '' || hr.salaryPaymentMethod === 'bank_transfer' || hr.salaryPaymentMethod === 'cheque';

  const text = (key: HrKey, placeholder?: string, type = 'text') => (
    <Input
      type={type}
      value={hr[key]}
      onChange={(e) => setHr(key, e.target.value)}
      placeholder={placeholder}
      className={errors[`hr.${key}`] ? 'ring-2 ring-error/60' : ''}
    />
  );
  const numberInput = (key: HrKey, placeholder?: string, onEdit?: () => void) => (
    <Input
      type="number"
      min={0}
      step="any"
      inputMode="decimal"
      value={hr[key]}
      onChange={(e) => {
        onEdit?.();
        setHr(key, e.target.value);
      }}
      placeholder={placeholder}
      className={errors[`hr.${key}`] ? 'ring-2 ring-error/60' : ''}
    />
  );
  const select = (key: HrKey, options: { value: string; label: string }[], placeholder = 'Select...') => (
    <CustomSelect
      value={hr[key]}
      onChange={(val) => setHr(key, val)}
      options={[{ value: '', label: '— Not set —' }, ...options]}
      placeholder={placeholder}
    />
  );

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-6 items-start">
      {/* Section navigation */}
      <nav className="hidden lg:block sticky top-6 bg-surface-container-lowest rounded-[1rem] p-2" aria-label="Form sections">
        {sections.map((s) => {
          const Icon = s.icon;
          const count = errorCount(s.id);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => scrollTo(s.id)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors',
                activeSection === s.id
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 truncate">{s.title}</span>
              {count > 0 && (
                <span className="text-[10px] font-bold rounded-full bg-error text-white w-4 h-4 flex items-center justify-center">{count}</span>
              )}
              {!count && s.confidential && <Lock className="w-3 h-3 opacity-50" />}
            </button>
          );
        })}
      </nav>

      <div className="space-y-6 min-w-0">
        {/* Basic information */}
        <Section def={SECTIONS[0]}>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex flex-col items-center gap-2 md:w-40 shrink-0">
              <ProfilePictureUpload
                value={values.profilePicture}
                onChange={(fileId) => set('profilePicture', fileId)}
                name={`${values.firstName} ${values.lastName}`.trim() || 'New Employee'}
                fallbackClassName="bg-brand-100 text-brand-700"
              />
              <p className="text-xs text-on-surface-variant">Profile picture</p>
            </div>
            <div className="flex-1 min-w-0">
              <Grid>
                {withHr && (
                  <Field label="Employee Code" hint="Unique HR reference, e.g. EMP-0001">
                    <Input value={values.employeeCode} onChange={(e) => set('employeeCode', e.target.value)} placeholder="EMP-0001" />
                  </Field>
                )}
                <Field label="First Name" required error={errors.firstName}>
                  <Input value={values.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="First name" />
                </Field>
                <Field label="Last Name" required error={errors.lastName}>
                  <Input value={values.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="Last name" />
                </Field>
                <Field label="Email" required error={errors.email}>
                  <Input type="email" value={values.email} onChange={(e) => set('email', e.target.value)} placeholder="name@company.com" />
                </Field>
                <Field label="Mobile Number" error={errors.phone}>
                  <Input type="tel" value={values.phone} onChange={(e) => set('phone', e.target.value)} placeholder="01XXXXXXXXX" />
                </Field>
              </Grid>
            </div>
          </div>
        </Section>

        {/* Personal details */}
        {withHr && (
          <Section def={SECTIONS[1]}>
            <Grid>
              <Field label="Full Name (4 parts)" className="md:col-span-2" hint="As written on the national ID">
                {text('fullLegalName', 'First, father, grandfather and family name')}
              </Field>
              <Field label="National ID" error={errors['hr.nationalId']} hint="14 digits">
                {text('nationalId', '2XXXXXXXXXXXXX')}
              </Field>
              <Field label="Date of Birth">{text('dateOfBirth', undefined, 'date')}</Field>
              <Field label="Gender">{select('gender', GENDER_OPTIONS)}</Field>
              <Field label="Marital Status">{select('maritalStatus', MARITAL_STATUS_OPTIONS)}</Field>
              <Field label="Address" className="md:col-span-2 xl:col-span-3">
                {text('address', 'Street, area, city')}
              </Field>
            </Grid>
          </Section>
        )}

        {/* Job & placement */}
        <Section def={SECTIONS[2]}>
          <Grid>
            <Field label="Job Title">
              <Input value={values.position} onChange={(e) => set('position', e.target.value)} placeholder="e.g. Senior ERP Consultant" />
            </Field>
            {withHr && <Field label="Section">{text('section', 'e.g. Finance applications')}</Field>}
            {withHr && (
              <Field label="Direct Manager">
                <ConsultantSelect
                  consultants={people}
                  loading={peopleLoading}
                  value={hr.directManager}
                  onChange={(id) => setHr('directManager', id)}
                  placeholder="Select direct manager..."
                />
              </Field>
            )}
            {withHr && <Field label="Hire Date">{text('hireDate', undefined, 'date')}</Field>}
            <Field label="Employee Status" hint={values.status !== 'active' ? 'Only active employees can log in.' : undefined}>
              <CustomSelect
                value={values.status}
                onChange={(val) => set('status', val as ConsultantStatus)}
                options={EMPLOYEE_STATUS_OPTIONS}
              />
            </Field>
            <Field label="Monthly Target Hours" hint="Expected working hours per month">
              <Input
                type="number"
                min={0}
                step={1}
                value={values.monthlyTargetHours}
                onChange={(e) => set('monthlyTargetHours', e.target.value)}
                placeholder="e.g. 160"
              />
            </Field>
          </Grid>
          <p className="text-xs text-on-surface-variant mt-4">
            Department is set under <button type="button" className="text-primary font-semibold hover:underline" onClick={() => scrollTo('access')}>System Access</button> together with the role.
          </p>
        </Section>

        {/* Recruitment */}
        {withHr && (
          <Section def={SECTIONS[3]}>
            <Grid>
              <Field label="Hiring Source">{select('hiringSource', HIRING_SOURCE_OPTIONS)}</Field>
              <Field label="Recruiter Name">{text('recruiterName', 'Who handled the hiring')}</Field>
              <Field label="Application Date">{text('applicationDate', undefined, 'date')}</Field>
              <Field label="Interview Date" error={errors['hr.interviewDate']}>{text('interviewDate', undefined, 'date')}</Field>
              <Field label="Interview Result">{select('interviewResult', INTERVIEW_RESULT_OPTIONS)}</Field>
            </Grid>
          </Section>
        )}

        {/* Contract */}
        {withHr && (
          <Section def={SECTIONS[4]}>
            <Grid>
              <Field label="Contract Type">{select('contractType', CONTRACT_TYPE_OPTIONS)}</Field>
              <Field label="Contract Duration (months)" error={errors['hr.contractDurationMonths']}>
                {numberInput('contractDurationMonths', 'e.g. 12')}
              </Field>
              <Field
                label="Probation Period (months)"
                error={errors['hr.probationPeriodMonths']}
                hint={probationEnds ? `Probation ends ${formatDate(probationEnds)}` : 'Up to 3 months under Egyptian labour law'}
              >
                {numberInput('probationPeriodMonths', 'e.g. 3')}
              </Field>
              <Field
                label="Contract End Date"
                error={errors['hr.contractEndDate']}
                hint={!endDateTouched ? 'Calculated from hire date + duration; you can change it.' : undefined}
              >
                <Input
                  type="date"
                  value={hr.contractEndDate}
                  onChange={(e) => {
                    setEndDateTouched(true);
                    setHr('contractEndDate', e.target.value);
                  }}
                />
              </Field>
            </Grid>
            {!hr.hireDate && (
              <p className="text-xs text-on-surface-variant mt-4">Set the hire date under Job & Placement to calculate the end date automatically.</p>
            )}
          </Section>
        )}

        {/* Payroll */}
        {withHr && (
          <Section def={SECTIONS[5]}>
            <Grid>
              <Field label="Basic Salary" error={errors['hr.basicSalary']}>{numberInput('basicSalary', '0.00')}</Field>
              <Field label="Gross Salary" error={errors['hr.grossSalary']}>{numberInput('grossSalary', '0.00')}</Field>
              <Field label="Net Salary" error={errors['hr.netSalary']}>{numberInput('netSalary', '0.00')}</Field>
              <Field label="Salary Payment Method">{select('salaryPaymentMethod', SALARY_PAYMENT_OPTIONS)}</Field>
              {showBank && <Field label="Bank">{text('bankName', 'e.g. CIB, NBE, Banque Misr')}</Field>}
              {showBank && <Field label="Account Number / IBAN">{text('bankAccount', 'EG00 0000 0000 ...')}</Field>}
            </Grid>
          </Section>
        )}

        {/* Social insurance */}
        {withHr && (
          <Section def={SECTIONS[6]}>
            <Grid>
              <Field label="Insurance Wage" error={errors['hr.insuranceWage']}>{numberInput('insuranceWage', '0.00')}</Field>
              <Field
                label="Employee Share"
                error={errors['hr.employeeInsuranceShare']}
                hint={`${INSURANCE_RATES.employee * 100}% of the insurance wage by default`}
              >
                {numberInput('employeeInsuranceShare', '0.00', () => setSharesTouched(true))}
              </Field>
              <Field
                label="Employer Share"
                error={errors['hr.employerInsuranceShare']}
                hint={`${INSURANCE_RATES.employer * 100}% of the insurance wage by default`}
              >
                {numberInput('employerInsuranceShare', '0.00', () => setSharesTouched(true))}
              </Field>
            </Grid>
            <Button type="button" variant="outline" size="sm" className="mt-4" onClick={recalcShares} disabled={!hr.insuranceWage}>
              <Calculator className="w-4 h-4 mr-2" />
              Recalculate shares
            </Button>
          </Section>
        )}

        {/* Documents */}
        {withHr && (
          <Section def={SECTIONS[7]}>
            {mode === 'edit' && (
              <p className="text-xs text-on-surface-variant mb-4">Documents are saved as soon as they are uploaded — no need to press Save.</p>
            )}
            <EmployeeDocuments
              employeeId={mode === 'edit' ? employeeId : undefined}
              canEdit={canEditDocuments}
              staged={stagedDocuments}
              onStagedChange={setStagedDocuments}
            />
          </Section>
        )}

        {/* System access */}
        <Section def={SECTIONS[8]}>
          <div className="space-y-6">
            <EmployeeAccessFields
              value={{
                role: values.role,
                department: values.department,
                teleSalesTeam: values.teleSalesTeam,
                modules: values.modules,
              }}
              onChange={(next) => {
                setValues((prev) => ({ ...prev, ...next, modules: next.modules ?? [] }));
                if (errors.teleSalesTeam) setErrors((prev) => ({ ...prev, teleSalesTeam: '' }));
              }}
              departments={departments}
              teamError={errors.teleSalesTeam}
            />
            {mode === 'create' && (
              <Grid>
                <Field label="Password" required error={errors.password} hint="At least 8 characters. The employee logs in with their email.">
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={values.password}
                    onChange={(e) => set('password', e.target.value)}
                    placeholder="Initial password"
                  />
                </Field>
              </Grid>
            )}
          </div>
        </Section>

        {/* Notes */}
        {withHr && (
          <Section def={SECTIONS[9]}>
            <Textarea
              rows={4}
              value={hr.notes}
              onChange={(e) => setHr('notes', e.target.value)}
              placeholder="Internal HR notes"
              maxLength={2000}
            />
          </Section>
        )}

        {/* Actions */}
        <div className="sticky bottom-0 z-10 -mx-1 px-1">
          <div className="bg-surface-container-lowest/95 backdrop-blur rounded-[1rem] shadow-lg px-6 py-4 flex items-center justify-between gap-3">
            <p className="text-xs text-on-surface-variant hidden sm:block">
              {withHr ? 'Fields marked HR only are hidden from everyone except admins and HR.' : 'Fields marked * are required.'}
            </p>
            <div className="flex gap-3 ml-auto">
              <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {mode === 'create' ? 'Create Employee' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
