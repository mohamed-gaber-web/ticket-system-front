import * as XLSX from 'xlsx';
import type { CampaignContactInput } from '@/types/marketing.types';

/**
 * Read an email-campaign contact list (xlsx / xls / csv). The first row is the
 * header; columns are matched by name (English or Arabic), so the order does
 * not matter. Only an email column is required.
 */
const HEADERS: Record<keyof CampaignContactInput, string[]> = {
  email: ['email', 'e-mail', 'email address', 'mail', 'البريد', 'البريد الالكتروني', 'البريد الإلكتروني', 'ايميل', 'إيميل'],
  name: ['name', 'contact', 'contact name', 'contact person', 'full name', 'client name', 'الاسم', 'اسم العميل', 'جهة الاتصال'],
  companyName: ['company', 'company name', 'organization', 'organisation', 'account', 'الشركة', 'اسم الشركة'],
  phone: ['phone', 'mobile', 'phone number', 'mobile number', 'tel', 'telephone', 'الهاتف', 'الموبايل', 'رقم الهاتف', 'رقم الموبايل'],
  jobTitle: ['job title', 'title', 'position', 'role', 'المسمى الوظيفي', 'الوظيفة'],
  country: ['country', 'الدولة', 'البلد'],
};

const norm = (s: string) => s.toLowerCase().replace(/[_\s]+/g, ' ').trim();

const classify = (header: string): keyof CampaignContactInput | null => {
  const h = norm(header);
  for (const [key, names] of Object.entries(HEADERS) as [keyof CampaignContactInput, string[]][]) {
    if (names.includes(h)) return key;
  }
  return null;
};

export interface ParsedCampaignFile {
  contacts: CampaignContactInput[];
  /** Rows without an email address, skipped before upload. */
  skipped: number;
}

export async function parseCampaignFile(file: File): Promise<ParsedCampaignFile> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new Error('The file has no sheet');
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '', raw: false, blankrows: false });
  if (rows.length < 2) throw new Error('The file has no data rows');

  const columns = rows[0].map((h) => classify(String(h ?? '')));
  if (!columns.includes('email')) throw new Error('No "Email" column found in the first row');

  const contacts: CampaignContactInput[] = [];
  let skipped = 0;
  for (const row of rows.slice(1)) {
    const contact: Partial<CampaignContactInput> = {};
    columns.forEach((key, i) => {
      const value = String(row[i] ?? '').trim();
      if (key && value && !contact[key]) contact[key] = value;
    });
    if (contact.email) contacts.push(contact as CampaignContactInput);
    else skipped += 1;
  }
  return { contacts, skipped };
}
