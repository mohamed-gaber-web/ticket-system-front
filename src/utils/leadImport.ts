import * as XLSX from 'xlsx';
import type { ImportLeadRow } from '@/types/teleSales.types';
import { normalizeEgyptPhone } from '@/types/teleSales.types';

/** Lead fields a spreadsheet column can be mapped to. */
export type ImportFieldKey =
  | 'contactPersonName'
  | 'companyName'
  | 'phone' // generic phone column — first→primary, second→secondary, rest→other
  | 'phonePrimary'
  | 'phoneSecondary'
  | 'phoneOther'
  | 'email'
  | 'jobTitle'
  | 'department'
  | 'industry'
  // Spec fields
  | 'salesType'
  | 'entityType'
  | 'businessClassification'
  | 'industrySector'
  | 'country'
  | 'fullAddress'
  | 'website'
  | 'dataSource';

export const FIELD_LABELS: Record<ImportFieldKey, string> = {
  contactPersonName: 'Contact Person',
  companyName: 'Company',
  phone: 'Phone',
  phonePrimary: 'Phone (Primary)',
  phoneSecondary: 'Phone (Secondary)',
  phoneOther: 'Phone (Other)',
  email: 'Email',
  jobTitle: 'Job Title',
  department: 'Department',
  industry: 'Industry',
  // Spec fields
  salesType: 'Sales Type',
  entityType: 'Entity Type',
  businessClassification: 'Business Classification',
  industrySector: 'Industry Sector',
  country: 'Country',
  fullAddress: 'Full Address',
  website: 'Website',
  dataSource: 'Data Source',
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
  // Spec fields — checked first so they win over the more generic legacy rules.
  if (h.includes('data source') || h.includes('source file') || h.includes('originating') || h === 'source')
    return 'dataSource';
  if (h.includes('sales type') || h.includes('opportunity') || h === 'salestype') return 'salesType';
  if (h.includes('entity') || h.includes('venue type') || h.includes('establishment')) return 'entityType';
  if (h.includes('classif') || h.includes('activity') || h.includes('activit')) return 'businessClassification';
  if (h.includes('sector')) return 'industrySector';
  if (h.includes('country')) return 'country';
  if (h.includes('website') || h.includes('web') || h.includes('url') || h.includes('site')) return 'website';
  if (h.includes('full address') || h.includes('street') || h.includes('address')) return 'fullAddress';
  // Legacy rules.
  // "Company Size" is no longer a lead field — ignore it explicitly so it doesn't
  // fall through to the generic "company" rule below and land in Company Name.
  if (h.includes('size')) return null;
  // Phone columns — distinguish primary / secondary / other, else generic.
  {
    const phoneish =
      h.includes('mobile') || h.includes('phone') || h.includes('tel') || h.includes('whatsapp') || h.includes('cell');
    if (phoneish && h.includes('primary')) return 'phonePrimary';
    if (phoneish && (h.includes('secondary') || h.includes('alt') || h.includes('2'))) return 'phoneSecondary';
    if ((phoneish && h.includes('other')) || h.includes('hotline') || h.includes('toll')) return 'phoneOther';
    if (phoneish) return 'phone';
  }
  if (h.includes('email') || h.includes('e-mail')) return 'email';
  if (h.includes('depart')) return 'department'; // handles the "Departemnt" typo too
  if (h.includes('industry')) return 'industry';
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
  // Generic phone columns (no explicit primary/secondary/other header): the
  // first feeds Primary, the second Secondary, and any extras collapse to Other.
  const genericPhoneCols = mapping.map((m, i) => (m === 'phone' ? i : -1)).filter((i) => i >= 0);
  const firstCol = (field: ImportFieldKey) => mapping.indexOf(field);

  const cell = (row: string[], idx: number) => (idx >= 0 ? (row[idx] ?? '').trim() : '');

  const dataRows = matrix.slice(headerIdx + 1);
  const rows: ImportLeadRow[] = [];
  let skippedEmpty = 0;

  for (const row of dataRows) {
    const contactPersonName = cell(row, firstCol('contactPersonName'));

    // Resolve the three structured phone fields from explicit and generic columns.
    const generics = genericPhoneCols.map((idx) => cell(row, idx)).filter(Boolean);
    const phonePrimaryRaw = cell(row, firstCol('phonePrimary')) || generics[0] || '';
    const phoneSecondary = cell(row, firstCol('phoneSecondary')) || generics[1] || '';
    const phoneOther = cell(row, firstCol('phoneOther')) || generics.slice(2).join(', ');
    const phonePrimary = phonePrimaryRaw ? normalizeEgyptPhone(phonePrimaryRaw) : '';

    // A row needs at least a contact name to be meaningful; otherwise skip it.
    if (!contactPersonName) {
      skippedEmpty += 1;
      continue;
    }

    rows.push({
      contactPersonName,
      companyName: cell(row, firstCol('companyName')) || undefined,
      email: cell(row, firstCol('email')) || undefined,
      jobTitle: cell(row, firstCol('jobTitle')) || undefined,
      industry: cell(row, firstCol('industry')) || undefined,
      department: cell(row, firstCol('department')) || undefined,
      // Structured phones (spec fields 8-10)
      phonePrimary: phonePrimary || undefined,
      phoneSecondary: phoneSecondary || undefined,
      phoneOther: phoneOther || undefined,
      // Spec fields
      salesType: cell(row, firstCol('salesType')) || undefined,
      entityType: cell(row, firstCol('entityType')) || undefined,
      businessClassification: cell(row, firstCol('businessClassification')) || undefined,
      industrySector: cell(row, firstCol('industrySector')) || undefined,
      country: cell(row, firstCol('country')) || undefined,
      fullAddress: cell(row, firstCol('fullAddress')) || undefined,
      website: cell(row, firstCol('website')) || undefined,
      dataSource: cell(row, firstCol('dataSource')) || undefined,
    });
  }

  return { rows, headers, mapping, totalDataRows: dataRows.length, skippedEmpty };
}
