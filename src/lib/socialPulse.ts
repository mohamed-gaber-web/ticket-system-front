import type { ContentType, MetricField, MetricKey, MetricValues, Platform, Sums } from '@/types/social.types';

// Marketing › Social Pulse — vocabulary, the metric catalogue and formatting.
// Mirrors the backend's src/utils/socialConfig.js + socialLogic.js — change both.

export const PLATFORMS: Platform[] = ['facebook', 'linkedin', 'instagram', 'tiktok', 'youtube', 'x'];

export const PLATFORM_LABELS: Record<Platform, string> = {
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  x: 'X',
};

/** Brand-ish dot colours; readable on light and dark surfaces. */
export const PLATFORM_COLORS: Record<Platform, string> = {
  facebook: '#2F6FEB',
  linkedin: '#0FA3B1',
  instagram: '#D9468F',
  tiktok: '#8B5CF6',
  youtube: '#E5484D',
  x: '#8A94A6',
};

export const CONTENT_TYPES: ContentType[] = ['reel', 'video', 'image', 'carousel', 'text', 'live', 'story'];

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  reel: 'Reel / short video',
  video: 'Long video',
  image: 'Image / design',
  carousel: 'Carousel',
  text: 'Text / article',
  live: 'Live',
  story: 'Story',
};

export const METRIC_FIELDS: MetricField[] = [
  'reach',
  'impressions',
  'views',
  'likes',
  'comments',
  'shares',
  'saves',
  'clicks',
  'followers',
  'leads',
  'spend',
];

export const METRIC_FIELD_LABELS: Record<MetricField, string> = {
  reach: 'Reach',
  impressions: 'Impressions',
  views: 'Views',
  likes: 'Likes / reactions',
  comments: 'Comments',
  shares: 'Shares',
  saves: 'Saves',
  clicks: 'Link clicks',
  followers: 'New followers',
  leads: 'Leads',
  spend: 'Spend (EGP)',
};

/** Compare colours, one per selected post (max 4). */
export const COMPARE_COLORS = ['#1F6FE0', '#F0831E', '#0FA3B1', '#8B5CF6'];
export const MAX_COMPARE = 4;

export const emptyValues = (): MetricValues =>
  Object.fromEntries(METRIC_FIELDS.map((k) => [k, null])) as MetricValues;

const num = (v: number | null | undefined) => Number(v) || 0;

export const engagement = (v: Partial<MetricValues> | null | undefined) =>
  v ? num(v.likes) + num(v.comments) + num(v.shares) + num(v.saves) : 0;

const ratio = (a: number, b: number) => (b > 0 ? a / b : null);

/** aggregate() of one post's values, for single-post displays. */
export const sumsOf = (v: Partial<MetricValues> | null | undefined): Sums => {
  const s = { count: v ? 1 : 0, eng: engagement(v) } as Sums;
  for (const k of METRIC_FIELDS) s[k] = num(v?.[k]);
  return s;
};

export type MetricFormat = 'number' | 'percent' | 'money';

export interface MetricDef {
  key: MetricKey;
  label: string;
  format: MetricFormat;
  lowerIsBetter?: boolean;
  get: (a: Sums) => number | null;
}

export const METRICS: MetricDef[] = [
  { key: 'reach', label: 'Reach', format: 'number', get: (a) => a.reach },
  { key: 'impressions', label: 'Impressions', format: 'number', get: (a) => a.impressions },
  { key: 'views', label: 'Views', format: 'number', get: (a) => a.views },
  { key: 'engagement', label: 'Engagement', format: 'number', get: (a) => a.eng },
  { key: 'er', label: 'Engagement rate', format: 'percent', get: (a) => ratio(a.eng, a.reach) },
  { key: 'clicks', label: 'Clicks', format: 'number', get: (a) => a.clicks },
  { key: 'ctr', label: 'CTR', format: 'percent', get: (a) => ratio(a.clicks, a.impressions) },
  { key: 'followers', label: 'New followers', format: 'number', get: (a) => a.followers },
  { key: 'leads', label: 'Leads', format: 'number', get: (a) => a.leads },
  {
    key: 'cpl',
    label: 'Cost per lead',
    format: 'money',
    lowerIsBetter: true,
    get: (a) => (a.spend > 0 && a.leads > 0 ? a.spend / a.leads : null),
  },
];

export const metricDef = (key: MetricKey) => METRICS.find((m) => m.key === key) ?? METRICS[0];
export const isMetricKey = (v: unknown): v is MetricKey => METRICS.some((m) => m.key === v);

// ── Formatting (§3.1) ────────────────────────────────────────────────────────

const plainFmt = new Intl.NumberFormat('en', { maximumFractionDigits: 1 });
const compactFmt = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

export const fmtNumber = (v: number | null | undefined) =>
  v == null || !Number.isFinite(v) ? '—' : Math.abs(v) >= 10_000 ? compactFmt.format(v) : plainFmt.format(v);

export const fmtPercent = (v: number | null | undefined) =>
  v == null || !Number.isFinite(v) ? '—' : `${(v * 100).toFixed(v < 0.1 ? 2 : 1)}%`;

export const fmtMoney = (v: number | null | undefined) =>
  v == null || !Number.isFinite(v) ? '—' : `EGP ${new Intl.NumberFormat('en').format(Math.round(v))}`;

export const fmtMetric = (format: MetricFormat, v: number | null | undefined) =>
  format === 'percent' ? fmtPercent(v) : format === 'money' ? fmtMoney(v) : fmtNumber(v);

/** "October 2026" */
export const monthLabel = (m?: string | null) => {
  if (!m) return '—';
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, (mo || 1) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

/** "Oct 26" */
export const monthShort = (m: string) => {
  const [y, mo] = m.split('-').map(Number);
  return `${new Date(y, (mo || 1) - 1, 1).toLocaleDateString('en-US', { month: 'short' })} ${String(y).slice(2)}`;
};

/** "12 Oct 2026" */
export const fmtDay = (d?: string | null) => {
  if (!d) return '—';
  const [y, m, day] = d.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, day || 1).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const monthOf = (date?: string | null) => String(date ?? '').slice(0, 7);

export const categoryLabel = (c: string) => (c ? c : '—');

export const apiError = (e: unknown, fallback: string): string =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;
