import { addDaysKey, dayKey, keyToDate } from '@/lib/myHome';
import { formatMoney, type DashboardKpiKey } from '@/types/teleSales.types';

/**
 * Pure helpers for the tele-sales dashboard: period presets on the Cairo
 * calendar (weeks start Sunday, like the API's trend), the URL ⇄ filter mapping
 * and the "vs previous period" comparison.
 */

export const DASHBOARD_TZ = 'Africa/Cairo';
/** The API refuses longer ranges (400). */
export const MAX_RANGE_DAYS = 366;

export type PeriodPreset = 'today' | 'week' | 'month' | 'lastMonth' | 'quarter' | 'year' | 'custom';

export const PERIOD_PRESETS: { key: PeriodPreset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: 'lastMonth', label: 'Last month' },
  { key: 'quarter', label: 'This quarter' },
  { key: 'year', label: 'This year' },
  { key: 'custom', label: 'Custom' },
];

const PRESET_KEYS = new Set<string>(PERIOD_PRESETS.map((p) => p.key));
const isPreset = (v: string | null): v is PeriodPreset => !!v && PRESET_KEYS.has(v);

/** Today on the Cairo calendar, YYYY-MM-DD. */
export const cairoToday = (now: Date = new Date()): string => dayKey(now, DASHBOARD_TZ);

/** A real calendar day written as YYYY-MM-DD. */
export const isDayKey = (v: string | null | undefined): v is string =>
  !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && keyToDate(v).toISOString().slice(0, 10) === v;

const pad = (n: number) => String(n).padStart(2, '0');
const monthStart = (y: number, m: number) => `${y}-${pad(m)}-01`; // m = 1..12

/** [from, to] of a preset, both inclusive Cairo days. "This …" periods run to today. */
export function presetRange(preset: Exclude<PeriodPreset, 'custom'>, today: string = cairoToday()): { from: string; to: string } {
  const [y, m] = today.split('-').map(Number);
  switch (preset) {
    case 'today':
      return { from: today, to: today };
    case 'week':
      return { from: addDaysKey(today, -keyToDate(today).getUTCDay()), to: today };
    case 'month':
      return { from: monthStart(y, m), to: today };
    case 'lastMonth': {
      const first = m === 1 ? monthStart(y - 1, 12) : monthStart(y, m - 1);
      return { from: first, to: addDaysKey(monthStart(y, m), -1) };
    }
    case 'quarter':
      return { from: monthStart(y, Math.floor((m - 1) / 3) * 3 + 1), to: today };
    case 'year':
      return { from: monthStart(y, 1), to: today };
  }
}

/** Inclusive number of days in [from, to]. */
export const rangeDays = (from: string, to: string): number =>
  Math.round((keyToDate(to).getTime() - keyToDate(from).getTime()) / 86_400_000) + 1;

export interface DashboardFilterState {
  preset: PeriodPreset;
  from: string;
  to: string;
  team: string;
  agent: string;
  /** Why a custom range cannot be loaded, or null. */
  rangeError: string | null;
}

/**
 * Reads the filters from the URL. `period=<preset>` keeps a bookmark rolling
 * ("this week" stays this week); otherwise `from`/`to` are a fixed range. No
 * period at all → this month to date (the API's default).
 */
export function readDashboardFilters(sp: URLSearchParams, today: string = cairoToday()): DashboardFilterState {
  const team = sp.get('team') ?? '';
  const agent = sp.get('agent') ?? '';
  const period = sp.get('period');
  const from = sp.get('from');
  const to = sp.get('to');

  if (isPreset(period) && period !== 'custom') {
    return { preset: period, ...presetRange(period, today), team, agent, rangeError: null };
  }
  if (isDayKey(from) && isDayKey(to)) {
    let rangeError: string | null = null;
    if (from > to) rangeError = 'The start date is after the end date.';
    else if (rangeDays(from, to) > MAX_RANGE_DAYS) rangeError = `Pick at most ${MAX_RANGE_DAYS} days.`;
    return { preset: 'custom', from, to, team, agent, rangeError };
  }
  return { preset: 'month', ...presetRange('month', today), team, agent, rangeError: null };
}

/** "1 Oct 2026" from YYYY-MM-DD. */
export const fmtDay = (key: string, withYear = true): string =>
  keyToDate(key).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  });

/** "1 – 17 Oct 2026" style range label. */
export const fmtRange = (from: string, to: string): string =>
  from === to ? fmtDay(from) : `${fmtDay(from, from.slice(0, 4) !== to.slice(0, 4))} – ${fmtDay(to)}`;

/** A follow-up / activity time on the Cairo clock. */
export const fmtCairo = (iso: string, opts: Intl.DateTimeFormatOptions): string =>
  new Date(iso).toLocaleString('en-GB', { ...opts, timeZone: DASHBOARD_TZ });

// ── KPI formatting + comparison ──────────────────────────────────────────────

export type KpiFormat = 'count' | 'money' | 'percent' | 'days';

export const formatKpi = (v: number | null, format: KpiFormat): string => {
  if (v == null || Number.isNaN(v)) return '—';
  switch (format) {
    case 'money':
      return formatMoney(v);
    case 'percent':
      return `${Math.round(v * 10) / 10}%`;
    case 'days':
      return `${v.toFixed(1)} d`;
    default:
      return Math.round(v).toLocaleString('en-US');
  }
};

/** Whether "up" is good, bad, or neither for a figure. */
export type KpiPolarity = 'higher' | 'lower' | 'neutral';

export interface KpiDelta {
  direction: 'up' | 'down' | 'flat';
  /** "12%" / "3.5 pts", or null when there is nothing to compare with. */
  text: string | null;
  tone: 'good' | 'bad' | 'neutral';
}

/**
 * Change vs the previous period. Percentages (win rate) compare in points; every
 * other figure in % of the previous value. No previous value (0 or null) → no
 * percentage and neutral styling.
 */
export function kpiDelta(value: number | null, previous: number | null, format: KpiFormat, polarity: KpiPolarity): KpiDelta {
  if (value == null || previous == null) return { direction: 'flat', text: null, tone: 'neutral' };
  const diff = value - previous;
  const direction = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
  let text: string | null;
  if (format === 'percent') {
    text = `${Math.abs(Math.round(diff * 10) / 10)} pts`;
  } else if (previous === 0) {
    text = null;
  } else {
    const pct = Math.abs((diff / Math.abs(previous)) * 100);
    text = `${pct >= 10 ? Math.round(pct) : Math.round(pct * 10) / 10}%`;
  }
  if (text === null || direction === 'flat' || polarity === 'neutral') {
    return { direction: text === null ? 'flat' : direction, text, tone: 'neutral' };
  }
  const better = polarity === 'higher' ? diff > 0 : diff < 0;
  return { direction, text, tone: better ? 'good' : 'bad' };
}

export interface KpiDef {
  key: DashboardKpiKey;
  label: string;
  format: KpiFormat;
  polarity: KpiPolarity;
  hint?: string;
}

/** The period KPI cards, in display order. */
export const KPI_DEFS: KpiDef[] = [
  { key: 'newRecords', label: 'New records', format: 'count', polarity: 'higher', hint: 'Records created in the period' },
  { key: 'calls', label: 'Calls', format: 'count', polarity: 'higher', hint: 'Calls logged in the period' },
  { key: 'callsAnswered', label: 'Calls answered', format: 'count', polarity: 'higher', hint: 'Calls with outcome "answered"' },
  { key: 'followUpsDone', label: 'Follow-ups done', format: 'count', polarity: 'higher', hint: 'Follow-ups marked Done' },
  { key: 'convertedToLead', label: 'Converted to Lead', format: 'count', polarity: 'higher', hint: 'Data records converted to Leads' },
  { key: 'convertedToOpportunity', label: 'Converted to Opportunity', format: 'count', polarity: 'higher', hint: 'Leads converted to Opportunities' },
  { key: 'proposalsSent', label: 'Proposals sent', format: 'count', polarity: 'higher', hint: 'Leads moved to Proposal Sent' },
  { key: 'won', label: 'Closed Won', format: 'count', polarity: 'higher', hint: 'Deals won (still Closed Won)' },
  { key: 'wonValue', label: 'Won value', format: 'money', polarity: 'higher', hint: 'Value of the deals won' },
  { key: 'lost', label: 'Closed Lost', format: 'count', polarity: 'neutral', hint: 'Deals lost (still Closed Lost)' },
  { key: 'winRate', label: 'Win rate', format: 'percent', polarity: 'higher', hint: 'Won ÷ (won + lost)' },
  { key: 'avgDealSize', label: 'Avg deal size', format: 'money', polarity: 'higher', hint: 'Won value ÷ deals won' },
  { key: 'avgDaysToClose', label: 'Avg days to close', format: 'days', polarity: 'lower', hint: 'Record created → Closed Won' },
];
