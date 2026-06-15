import * as XLSX from 'xlsx';
import type { ImportLeadRow } from '@/types/teleSales.types';

/** Lead fields a spreadsheet column can be mapped to. */
export type ImportFieldKey =
  | 'contactPersonName'
  | 'companyName'
  | 'phone'
  | 'email'
  | 'jobTitle'
  | 'department'
  | 'address'
  | 'industry'
  | 'companySize';

export const FIELD_LABELS: Record<ImportFieldKey, string> = {
  contactPersonName: 'Contact Person',
  companyName: 'Company',
  phone: 'Phone',
  email: 'Email',
  jobTitle: 'Job Title',
  department: 'Department',
  address: 'Address',
  industry: 'Industry',
  companySize: 'Company Size',
};

export interface ParsedImport {
  rows: ImportLeadRow[];
  /** Column headers detected from the file. */
  headers: string[];
  /** Auto-detected mapping: header text → field key (or null when ignored). */
  mapping: (ImportFieldKey | null)[];
  /** Rows after the header row, before filtering out empties. */
  totalDataRows: number;
  /** Rows skipped because they had no contact name. */
  skippedEmpty: number;
}

/**
 * Best-effort classification of a column header to a lead field.
 * Order matters — more specific checks come first (e.g. "Company Size"
 * before "Company", "Client Mobile Number" before "Client Name").
 */
export function classifyHeader(raw: string): ImportFieldKey | null {
  const h = (raw ?? '').toLowerCase().trim();
  if (!h) return null;
  if (h.includes('size')) return 'companySize';
  if (h.includes('mobile') || h.includes('phone') || h.includes('tel') || h.includes('whatsapp') || h.includes('cell'))
    return 'phone';
  if (h.includes('email') || h.includes('e-mail')) return 'email';
  if (h.includes('depart')) return 'department'; // handles the "Departemnt" typo too
  if (h.includes('address')) return 'address';
  if (h.includes('industry') || h.includes('sector')) return 'industry';
  if (h.includes('title') || h.includes('position') || h.includes('job')) return 'jobTitle';
  if (h.includes('company') || h.includes('organi')) return 'companyName';
  if (h.includes('contact') || h.includes('client') || h.includes('customer') || h.includes('person') || h === 'name')
    return 'contactPersonName';
  return null;
}

const isSeparatorCell = (c: string) => /^:?-{2,}:?$/.test(c.trim());

/** Parse a GitHub-flavoured markdown table into a 2D array of cell strings. */
function parseMarkdownTable(text: string): string[][] {
  const rows: string[][] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.includes('|')) continue;
    // Strip the outer pipes, then split.
    const inner = trimmed.replace(/^\|/, '').replace(/\|$/, '');
    const cells = inner.split('|').map((c) => c.trim());
    // Skip separator rows like | --- | --- |
    if (cells.length > 0 && cells.every((c) => c === '' || isSeparatorCell(c))) {
      if (cells.some(isSeparatorCell)) continue; // pure separator
    }
    rows.push(cells);
  }
  return rows;
}

/** Read any supported file into a 2D array of cell strings. */
async function fileToMatrix(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.md') || name.endsWith('.markdown') || name.endsWith('.txt')) {
    const text = await file.text();
    return parseMarkdownTable(text);
  }
  // xlsx / xls / csv
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '', raw: false, blankrows: false });
}

/**
 * Find the header row: the first row whose cells classify to at least two
 * distinct known fields. Falls back to the first non-empty row.
 */
function findHeaderRow(matrix: string[][]): number {
  for (let i = 0; i < matrix.length; i++) {
    const fields = new Set(matrix[i].map((c) => classifyHeader(c)).filter(Boolean));
    if (fields.size >= 2) return i;
  }
  return matrix.findIndex((r) => r.some((c) => c.trim() !== ''));
}

/**
 * Parse an uploaded file (Excel, CSV or markdown table) into importable lead
 * rows, auto-mapping columns to lead fields by their header text.
 */
export async function parseLeadsFile(file: File): Promise<ParsedImport> {
  const matrix = await fileToMatrix(file);
  if (matrix.length === 0) {
    return { rows: [], headers: [], mapping: [], totalDataRows: 0, skippedEmpty: 0 };
  }

  const headerIdx = Math.max(0, findHeaderRow(matrix));
  const headers = matrix[headerIdx].map((c) => (c ?? '').trim());
  const mapping = headers.map((h) => classifyHeader(h));
  const phoneCols = mapping.map((m, i) => (m === 'phone' ? i : -1)).filter((i) => i >= 0);
  const firstCol = (field: ImportFieldKey) => mapping.indexOf(field);

  const cell = (row: string[], idx: number) => (idx >= 0 ? (row[idx] ?? '').trim() : '');

  const dataRows = matrix.slice(headerIdx + 1);
  const rows: ImportLeadRow[] = [];
  let skippedEmpty = 0;

  for (const row of dataRows) {
    const contactPersonName = cell(row, firstCol('contactPersonName'));
    const phones = phoneCols
      .map((idx, i) => ({ number: cell(row, idx), label: i === 0 ? 'Primary' : 'Secondary' }))
      .filter((p) => p.number);

    // A row needs at least a name to be meaningful; otherwise treat as empty.
    if (!contactPersonName && phones.length === 0) {
      skippedEmpty += 1;
      continue;
    }
    if (!contactPersonName) {
      skippedEmpty += 1;
      continue;
    }

    rows.push({
      contactPersonName,
      companyName: cell(row, firstCol('companyName')) || undefined,
      phones,
      email: cell(row, firstCol('email')) || undefined,
      jobTitle: cell(row, firstCol('jobTitle')) || undefined,
      industry: cell(row, firstCol('industry')) || undefined,
      companySize: cell(row, firstCol('companySize')) || undefined,
      address: cell(row, firstCol('address')) || undefined,
      department: cell(row, firstCol('department')) || undefined,
    });
  }

  return { rows, headers, mapping, totalDataRows: dataRows.length, skippedEmpty };
}
