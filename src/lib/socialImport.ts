import type { ImportRow, MetricField } from '../types/social.types';

// Marketing › Social Pulse — reading platform exports (SOCIAL_PULSE_SPEC.md
// §5.2–§5.5): header-row detection, column auto-mapping and value parsers.
// Pure (no DOM, no '@/' runtime imports) so `npm test` can run it under Node.
// The server re-validates every row and does the matching/classification.

export type ImportField =
  | 'title'
  | 'link'
  | 'externalId'
  | 'date'
  | 'platform'
  | 'type'
  | 'category'
  | MetricField;

/** Field → synonyms (normalised). Matching order matters: fields map in this order. */
export const IMPORT_SYNONYMS: [ImportField, string[]][] = [
  ['title', ['title', 'post title', 'video title', 'content', 'caption', 'description', 'message', 'post', 'عنوان المنشور', 'العنوان', 'المنشور']],
  ['link', ['permalink', 'post link', 'post url', 'video link', 'link', 'url', 'الرابط']],
  ['externalId', ['post id', 'video id', 'content id', 'media id', 'id']],
  ['date', ['publish time', 'created date', 'post time', 'video publish time', 'date posted', 'published', 'publish date', 'created', 'date', 'تاريخ النشر', 'التاريخ']],
  ['platform', ['platform', 'network', 'channel', 'المنصة']],
  ['type', ['post type', 'content type', 'media type', 'media product type', 'type', 'نوع المحتوى', 'النوع']],
  ['category', ['category', 'series', 'custom labels', 'label', 'التصنيف', 'السلسلة']],
  ['reach', ['reach', 'accounts reached', 'unique impressions', 'post reach', 'الوصول']],
  ['impressions', ['impressions', 'post impressions', 'مرات الظهور', 'الظهور']],
  ['views', ['views', 'video views', 'total views', 'plays', 'views (excluding off-site video views)', '3-second video views', 'المشاهدات']],
  ['likes', ['reactions', 'likes', 'total likes', 'الإعجابات']],
  ['comments', ['comments', 'comments added', 'total comments', 'التعليقات']],
  ['shares', ['shares', 'reposts', 'total shares', 'المشاركات']],
  ['saves', ['saves', 'saved', 'الحفظ']],
  ['clicks', ['link clicks', 'clicks', 'total clicks', 'النقرات']],
  ['followers', ['follows', 'followers gained', 'new followers', 'subscribers', 'subscribers gained', 'متابعون جدد']],
  ['leads', ['leads', 'messaging conversations started', 'results']],
  ['spend', ['amount spent', 'amount spent (egp)', 'spend', 'cost', 'الإنفاق']],
];

export const IMPORT_FIELDS: ImportField[] = IMPORT_SYNONYMS.map(([f]) => f);

export const IMPORT_FIELD_LABELS: Record<ImportField, string> = {
  title: 'Title',
  link: 'Link',
  externalId: 'Post ID',
  date: 'Publish date',
  platform: 'Platform',
  type: 'Post type',
  category: 'Category',
  reach: 'Reach',
  impressions: 'Impressions',
  views: 'Views',
  likes: 'Reactions / likes',
  comments: 'Comments',
  shares: 'Shares',
  saves: 'Saves',
  clicks: 'Link clicks',
  followers: 'Follows',
  leads: 'Leads',
  spend: 'Amount spent',
};

const METRIC_KEYS: MetricField[] = ['reach', 'impressions', 'views', 'likes', 'comments', 'shares', 'saves', 'clicks', 'followers', 'leads', 'spend'];

export type ColumnMapping = Record<ImportField, number>;

export const norm = (s: unknown) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

const ALL_SYNONYMS = new Set(IMPORT_SYNONYMS.flatMap(([, s]) => s));

/** The best header row among the first 15 (score = cells equal to a known synonym). */
export const detectHeaderRow = (rows: unknown[][]): { index: number; score: number } => {
  let best = { index: -1, score: 0 };
  rows.slice(0, 15).forEach((row, index) => {
    const score = (row ?? []).filter((c) => ALL_SYNONYMS.has(norm(c))).length;
    if (score > best.score) best = { index, score };
  });
  return best;
};

export const HEADER_NOT_FOUND =
  "Couldn't find a header row with known column names on this sheet. Try another sheet or use the template.";

/** Exact synonym first (in order), then "starts with" for synonyms of 5+ characters; a column serves one field. */
export const autoMap = (headers: unknown[]): ColumnMapping => {
  const normed = headers.map(norm);
  const used = new Set<number>();
  const mapping = {} as ColumnMapping;
  for (const [field, synonyms] of IMPORT_SYNONYMS) {
    let col = -1;
    for (const syn of synonyms) {
      col = normed.findIndex((h, i) => !used.has(i) && h === syn);
      if (col >= 0) break;
    }
    if (col < 0) {
      for (const syn of synonyms) {
        if (syn.length < 5) continue;
        col = normed.findIndex((h, i) => !used.has(i) && h !== '' && h.startsWith(syn));
        if (col >= 0) break;
      }
    }
    if (col >= 0) used.add(col);
    mapping[field] = col;
  }
  return mapping;
};

export const mappedCount = (m: ColumnMapping) => IMPORT_FIELDS.filter((f) => (m[f] ?? -1) >= 0).length;

/** The text hashed into the saved-mapping key. */
export const headerSignatureText = (headers: unknown[]) => headers.map(norm).join('|');

/** SHA-1 hex of the header signature (Web Crypto; also in Node ≥ 19). */
export const headerSignature = async (headers: unknown[]) => {
  const bytes = new TextEncoder().encode(headerSignatureText(headers));
  const digest = await crypto.subtle.digest('SHA-1', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

// ── Value parsers (§5.5) ─────────────────────────────────────────────────────

export const parseNumber = (v: unknown): number | null => {
  if (v === '' || v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).replace(/[,\s%٬]/g, '');
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : null;
};

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (y: number, m: number, d: number) =>
  m >= 1 && m <= 12 && d >= 1 && d <= 31 ? `${y}-${pad(m)}-${pad(d)}` : '';

/** 'YYYY-MM-DD' or '' — Date objects, ISO, M/D/Y (D/M/Y when the first part > 12) and Excel serials. */
export const parseDate = (v: unknown): string => {
  if (v == null || v === '') return '';
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return '';
    return new Date(v.getTime() - v.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  }
  if (typeof v === 'number') {
    // An Excel day serial that wasn't typed as a date (1955–2119).
    if (v > 20000 && v < 80000) return new Date(Math.round((v - 25569) * 86_400_000)).toISOString().slice(0, 10);
    return '';
  }
  const s = String(v).trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return ymd(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(s);
  if (m) {
    let a = +m[1];
    let b = +m[2];
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    if (a > 12) [a, b] = [b, a];
    return ymd(y, a, b);
  }
  const t = Date.parse(s);
  if (Number.isNaN(t)) return '';
  const d = new Date(t);
  return ymd(d.getFullYear(), d.getMonth() + 1, d.getDate());
};

/** Collapse whitespace; longer than 90 characters → 88 + "…". The server adds "<Platform> post <date>" when empty. */
export const cleanTitle = (v: unknown) => {
  const t = String(v ?? '').replace(/\s+/g, ' ').trim();
  return t.length > 90 ? `${t.slice(0, 88)}…` : t;
};

const cell = (row: unknown[], col: number) => (col >= 0 ? row[col] : '');
const text = (v: unknown) => (v instanceof Date ? parseDate(v) : String(v ?? '').trim());

/** Data rows after the header (any non-empty cell) → the rows the server classifies. */
export const buildImportRows = (sheetRows: unknown[][], headerIndex: number, mapping: ColumnMapping): ImportRow[] => {
  const out: ImportRow[] = [];
  sheetRows.slice(headerIndex + 1).forEach((row, i) => {
    if (!row || !row.some((c) => String(c ?? '').trim() !== '')) return;
    const metrics: ImportRow['metrics'] = {};
    for (const k of METRIC_KEYS) metrics[k] = parseNumber(cell(row, mapping[k] ?? -1));
    out.push({
      rowIndex: headerIndex + 1 + i,
      title: cleanTitle(cell(row, mapping.title)),
      link: text(cell(row, mapping.link)),
      externalId: text(cell(row, mapping.externalId)),
      date: parseDate(cell(row, mapping.date)),
      platformRaw: text(cell(row, mapping.platform)),
      typeRaw: text(cell(row, mapping.type)),
      category: text(cell(row, mapping.category)),
      metrics,
    });
  });
  return out;
};

// ── Template (§5.8) ──────────────────────────────────────────────────────────

export const TEMPLATE_FILE_NAME = 'GrowPath-Social-Import-Template.xlsx';
export const TEMPLATE_COLUMNS = [
  'Title',
  'Link',
  'Post ID',
  'Publish date',
  'Platform',
  'Post type',
  'Category',
  'Reach',
  'Impressions',
  'Views',
  'Reactions',
  'Comments',
  'Shares',
  'Saves',
  'Link clicks',
  'Follows',
  'Leads',
  'Amount spent',
];
export const TEMPLATE_EXAMPLE = [
  'Mr. Dynamics — Create a Purchase Order in one minute',
  'https://www.facebook.com/growpath/posts/123456',
  '123456',
  '2026-10-03',
  'Facebook',
  'Reel',
  'Mr. Dynamics',
  18400,
  24100,
  15200,
  620,
  84,
  71,
  140,
  210,
  96,
  4,
  '',
];
