import type { ReactNode } from 'react';
import { Banknote, FileSignature, Lock, ShieldCheck, StickyNote, User, UserSearch, Briefcase } from 'lucide-react';
import type { Consultant, EmployeeRef } from '@/types/consultant.types';
import {
  CONTRACT_TYPE_OPTIONS,
  GENDER_OPTIONS,
  HIRING_SOURCE_OPTIONS,
  INTERVIEW_RESULT_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  SALARY_PAYMENT_OPTIONS,
  addMonths,
  employeeViewPath,
  formatDate,
  formatMoney,
  optionLabel,
  toDateInput,
} from '@/lib/hr';
import { Link } from 'react-router-dom';

const Item = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="min-w-0">
    <dt className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">{label}</dt>
    <dd className="text-sm text-on-surface mt-0.5 break-words">{children || '—'}</dd>
  </div>
);

const Card = ({ title, icon: Icon, children }: { title: string; icon: typeof User; children: ReactNode }) => (
  <div className="bg-surface-container-lowest rounded-[1rem] p-5">
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4 text-primary" />
      <h3 className="text-sm font-bold text-on-surface">{title}</h3>
    </div>
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</dl>
  </div>
);

const months = (n?: number | null) => (n == null ? '—' : `${n} month${n === 1 ? '' : 's'}`);

/**
 * Read-only view of the confidential HR file. Render it only when the API sent
 * `hr` — that alone means the viewer is an admin or HR.
 */
export function EmployeeHrFilePanel({ employee }: { employee: Consultant }) {
  const hr = employee.hr;
  if (!hr) return null;

  const manager = hr.directManager && typeof hr.directManager === 'object' ? (hr.directManager as EmployeeRef) : null;
  const hire = toDateInput(hr.hireDate);
  const probationEnds = hire && hr.probationPeriodMonths ? addMonths(hire, hr.probationPeriodMonths) : '';

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-on-surface">HR File</h2>
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide rounded-full bg-amber-100 text-amber-800 px-2 py-0.5">
          <Lock className="w-3 h-3" />
          HR only
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <Card title="Personal Details" icon={User}>
          <div className="col-span-2">
            <Item label="Full Name (4 parts)">{hr.fullLegalName}</Item>
          </div>
          <Item label="National ID">{hr.nationalId}</Item>
          <Item label="Date of Birth">{hr.dateOfBirth ? formatDate(hr.dateOfBirth) : null}</Item>
          <Item label="Gender">{hr.gender ? optionLabel(GENDER_OPTIONS, hr.gender) : null}</Item>
          <Item label="Marital Status">{hr.maritalStatus ? optionLabel(MARITAL_STATUS_OPTIONS, hr.maritalStatus) : null}</Item>
          <div className="col-span-2">
            <Item label="Address">{hr.address}</Item>
          </div>
        </Card>

        <Card title="Job & Placement" icon={Briefcase}>
          <Item label="Employee Code">{employee.employeeCode}</Item>
          <Item label="Job Title">{employee.position}</Item>
          <Item label="Department">
            {employee.department && typeof employee.department === 'object' ? employee.department.name : null}
          </Item>
          <Item label="Section">{hr.section}</Item>
          {(employee.role === 'sales' || employee.role === 'sales_manager') && (
            <Item label="Tele-sales Team">
              {employee.teleSalesTeam && typeof employee.teleSalesTeam === 'object'
                ? employee.teleSalesTeam.name
                : employee.role === 'sales'
                  ? <span className="text-amber-700 font-medium">No team — sees no leads</span>
                  : 'All teams'}
            </Item>
          )}
          <Item label="Direct Manager">
            {manager ? (
              <Link to={employeeViewPath(manager._id)} className="text-primary hover:underline">
                {manager.firstName} {manager.lastName}
              </Link>
            ) : null}
          </Item>
          <Item label="Hire Date">{hr.hireDate ? formatDate(hr.hireDate) : null}</Item>
        </Card>

        <Card title="Recruitment" icon={UserSearch}>
          <Item label="Hiring Source">{hr.hiringSource ? optionLabel(HIRING_SOURCE_OPTIONS, hr.hiringSource) : null}</Item>
          <Item label="Recruiter">{hr.recruiterName}</Item>
          <Item label="Application Date">{hr.applicationDate ? formatDate(hr.applicationDate) : null}</Item>
          <Item label="Interview Date">{hr.interviewDate ? formatDate(hr.interviewDate) : null}</Item>
          <Item label="Interview Result">{hr.interviewResult ? optionLabel(INTERVIEW_RESULT_OPTIONS, hr.interviewResult) : null}</Item>
        </Card>

        <Card title="Contract" icon={FileSignature}>
          <Item label="Contract Type">{hr.contractType ? optionLabel(CONTRACT_TYPE_OPTIONS, hr.contractType) : null}</Item>
          <Item label="Duration">{hr.contractDurationMonths != null ? months(hr.contractDurationMonths) : null}</Item>
          <Item label="Probation">
            {hr.probationPeriodMonths != null
              ? `${months(hr.probationPeriodMonths)}${probationEnds ? ` (ends ${formatDate(probationEnds)})` : ''}`
              : null}
          </Item>
          <Item label="Contract End Date">{hr.contractEndDate ? formatDate(hr.contractEndDate) : null}</Item>
        </Card>

        <Card title="Payroll" icon={Banknote}>
          <Item label="Basic Salary">{hr.basicSalary != null ? formatMoney(hr.basicSalary) : null}</Item>
          <Item label="Gross Salary">{hr.grossSalary != null ? formatMoney(hr.grossSalary) : null}</Item>
          <Item label="Net Salary">{hr.netSalary != null ? formatMoney(hr.netSalary) : null}</Item>
          <Item label="Payment Method">{hr.salaryPaymentMethod ? optionLabel(SALARY_PAYMENT_OPTIONS, hr.salaryPaymentMethod) : null}</Item>
          <Item label="Bank">{hr.bankName}</Item>
          <Item label="Account / IBAN">{hr.bankAccount}</Item>
        </Card>

        <Card title="Social Insurance" icon={ShieldCheck}>
          <Item label="Insurance Wage">{formatMoney(hr.insuranceWage ?? 0)}</Item>
          <Item label="Employee Share">{hr.employeeInsuranceShare != null ? formatMoney(hr.employeeInsuranceShare) : null}</Item>
          <Item label="Employer Share">{hr.employerInsuranceShare != null ? formatMoney(hr.employerInsuranceShare) : null}</Item>
        </Card>
      </div>

      {hr.notes && (
        <div className="bg-surface-container-lowest rounded-[1rem] p-5">
          <div className="flex items-center gap-2 mb-2">
            <StickyNote className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-on-surface">Notes</h3>
          </div>
          <p className="text-sm text-on-surface whitespace-pre-wrap">{hr.notes}</p>
        </div>
      )}
    </section>
  );
}
