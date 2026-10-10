import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';
import { preparePdfText } from '@/utils/pdfText';
import { rolesLabel, rolesOf } from '@/lib/access';
import { EMPLOYEE_STATUS_OPTIONS } from '@/lib/hr';
import { employeeTeamNames } from '@/components/employees/employeeFormModel';
import type { Consultant } from '@/types/consultant.types';

/**
 * Export of the HR › Employees directory — the columns the table shows. The
 * confidential HR file (salary, national ID, bank…) is deliberately left out:
 * an exported file leaves the system's access checks behind.
 */
export const EMPLOYEE_EXPORT_HEADERS = [
  'Code',
  'Full Name',
  'Email',
  'Job Title',
  'Mobile',
  'Roles',
  'Departments',
  'Teams',
  'Status',
  'Target Hours / Month',
  'Last Login',
];

const deptName = (d: unknown) => (d && typeof d === 'object' ? (d as { name?: string }).name ?? '' : '');
const statusLabel = (s: string) => EMPLOYEE_STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s ?? '';
const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

export const employeeExportRow = (c: Consultant): string[] => [
  c.employeeCode ?? '',
  c.fullName || `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim(),
  c.email ?? '',
  c.position ?? '',
  c.phone ?? '',
  rolesLabel(rolesOf(c)),
  [...new Set([c.department, ...(c.departments ?? [])].map(deptName).filter(Boolean))].join(', '),
  employeeTeamNames(c).join(', '),
  statusLabel(c.status),
  c.monthlyTargetHours != null ? String(c.monthlyTargetHours) : '',
  fmtDate(c.lastLogin),
];

const stamp = () => new Date().toISOString().split('T')[0];

export const exportEmployeesExcel = (employees: Consultant[]) => {
  const rows = employees.map(employeeExportRow);
  const sheet = XLSX.utils.aoa_to_sheet([EMPLOYEE_EXPORT_HEADERS, ...rows]);
  sheet['!cols'] = EMPLOYEE_EXPORT_HEADERS.map((h, i) => ({
    wch: Math.min(50, Math.max(h.length, ...rows.map((r) => r[i].length)) + 2),
  }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Employees');
  const buffer = XLSX.write(book, { bookType: 'xlsx', type: 'array' });
  saveAs(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `employees-${stamp()}.xlsx`,
  );
};

/** Returns false when the report has Arabic but the Arabic font failed to load. */
export const exportEmployeesPdf = async (employees: Consultant[], filtersLine?: string): Promise<boolean> => {
  const body = employees.map(employeeExportRow);
  const doc = new jsPDF('landscape');
  const pdf = await preparePdfText(doc, body);
  doc.setFontSize(16);
  pdf.write('Employees', 14, 18);
  doc.setFontSize(9);
  pdf.write(
    `Generated: ${new Date().toLocaleString()}  |  Total: ${employees.length}${filtersLine ? `  |  ${filtersLine}` : ''}`,
    14,
    25,
  );
  autoTable(doc, {
    head: pdf.rows([EMPLOYEE_EXPORT_HEADERS]),
    body: pdf.rows(body),
    startY: 30,
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [0, 58, 143], fontSize: 7 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    didParseCell: pdf.styleArabicCells,
  });
  doc.save(`employees-${stamp()}.pdf`);
  return !pdf.fontMissing;
};
