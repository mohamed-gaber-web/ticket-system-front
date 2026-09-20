import {
  addDays, addMonths, addWeeks, differenceInMinutes, endOfDay, endOfWeek, format, isSameDay,
  startOfDay, startOfMonth, startOfWeek,
} from 'date-fns';
import type { Meeting, MeetingStatus, MeetingType, MeetingPerson } from '@/types/meeting.types';

// The app's working week runs Saturday → Friday (same as the scheduled-week numbering).
export const WEEK_STARTS_ON = 6 as const;

export type CalendarView = 'month' | 'week' | 'day' | 'agenda' | 'cards';

export const VIEWS: { value: CalendarView; label: string; key: string }[] = [
  { value: 'month', label: 'Month', key: 'M' },
  { value: 'week', label: 'Week', key: 'W' },
  { value: 'day', label: 'Day', key: 'D' },
  { value: 'agenda', label: 'Agenda', key: 'A' },
  { value: 'cards', label: 'Cards', key: 'C' },
];

// ── Meeting swatches (identity chosen by the organiser) ─────────────────────
// Solid fills carry white text in both themes; the light tint is for month chips.
export const MEETING_COLORS: Record<string, { label: string; solid: string; tint: string; text: string }> = {
  blue: { label: 'Blue', solid: '#2563eb', tint: 'rgba(37,99,235,0.14)', text: '#1d4ed8' },
  green: { label: 'Green', solid: '#16a34a', tint: 'rgba(22,163,74,0.14)', text: '#15803d' },
  purple: { label: 'Purple', solid: '#7c3aed', tint: 'rgba(124,58,237,0.14)', text: '#6d28d9' },
  orange: { label: 'Orange', solid: '#ea580c', tint: 'rgba(234,88,12,0.14)', text: '#c2410c' },
  teal: { label: 'Teal', solid: '#0d9488', tint: 'rgba(13,148,136,0.14)', text: '#0f766e' },
  pink: { label: 'Pink', solid: '#db2777', tint: 'rgba(219,39,119,0.14)', text: '#be185d' },
  red: { label: 'Red', solid: '#dc2626', tint: 'rgba(220,38,38,0.14)', text: '#b91c1c' },
  gray: { label: 'Gray', solid: '#64748b', tint: 'rgba(100,116,139,0.16)', text: '#475569' },
};
export const colorOf = (m: Pick<Meeting, 'color'>) => MEETING_COLORS[m.color] ?? MEETING_COLORS.blue;

export const TYPE_META: Record<MeetingType, { label: string; short: string }> = {
  online: { label: 'Online meeting', short: 'Online' },
  on_site: { label: 'On-site visit', short: 'On-site' },
  call: { label: 'Phone call', short: 'Call' },
};

export const STATUS_META: Record<MeetingStatus, { label: string; pill: string }> = {
  scheduled: { label: 'Scheduled', pill: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Completed', pill: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', pill: 'bg-gray-200 text-gray-700' },
  no_show: { label: 'No-show', pill: 'bg-orange-100 text-orange-800' },
};

export const REMINDER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'No reminder' },
  { value: '10', label: '10 minutes before' },
  { value: '30', label: '30 minutes before' },
  { value: '60', label: '1 hour before' },
  { value: '120', label: '2 hours before' },
  { value: '1440', label: '1 day before' },
];

// ── Names ───────────────────────────────────────────────────────────────────
export const personName = (p?: MeetingPerson | string | null) =>
  p && typeof p === 'object' ? `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() : '';
export const personId = (p?: MeetingPerson | string | null) => (p && typeof p === 'object' ? p._id : p ?? '');
export const withName = (m: Meeting) => m.customer?.companyName ?? m.lead?.companyName ?? null;

// ── Dates ───────────────────────────────────────────────────────────────────
export const toLocalDateInput = (d: Date) => format(d, 'yyyy-MM-dd');
export const toLocalTimeInput = (d: Date) => format(d, 'HH:mm');
export const fromLocalInputs = (date: string, time: string) => new Date(`${date}T${time || '00:00'}:00`);

export const fmtTime = (d: string | Date) => format(new Date(d), 'h:mm a');
export const fmtDayLong = (d: string | Date) => format(new Date(d), 'EEEE, MMM d, yyyy');
export const fmtRange = (m: Pick<Meeting, 'startAt' | 'endAt' | 'allDay'>) => {
  const s = new Date(m.startAt);
  const e = new Date(m.endAt);
  if (m.allDay) return isSameDay(s, e) ? `${format(s, 'EEE, MMM d')} · All day` : `${format(s, 'MMM d')} – ${format(e, 'MMM d')} · All day`;
  if (isSameDay(s, e)) return `${format(s, 'EEE, MMM d')} · ${fmtTime(s)} – ${fmtTime(e)}`;
  return `${format(s, 'MMM d, h:mm a')} – ${format(e, 'MMM d, h:mm a')}`;
};
export const durationLabel = (m: Pick<Meeting, 'startAt' | 'endAt'>) => {
  const mins = differenceInMinutes(new Date(m.endAt), new Date(m.startAt));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const r = mins % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
};

/** The range of dates a view renders, plus the API window to fetch. */
export const visibleRange = (view: CalendarView, anchor: Date): { start: Date; end: Date } => {
  switch (view) {
    case 'month': {
      const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: WEEK_STARTS_ON });
      // Always six rows so the grid height is stable while paging.
      return { start, end: endOfDay(addDays(start, 41)) };
    }
    case 'week':
      return { start: startOfWeek(anchor, { weekStartsOn: WEEK_STARTS_ON }), end: endOfWeek(anchor, { weekStartsOn: WEEK_STARTS_ON }) };
    case 'day':
      return { start: startOfDay(anchor), end: endOfDay(anchor) };
    case 'agenda':
    case 'cards':
      return { start: startOfDay(anchor), end: endOfDay(addDays(anchor, 29)) };
  }
};

export const stepAnchor = (view: CalendarView, anchor: Date, dir: 1 | -1): Date => {
  switch (view) {
    case 'month': return addMonths(anchor, dir);
    case 'week': return addWeeks(anchor, dir);
    case 'day': return addDays(anchor, dir);
    case 'agenda':
    case 'cards': return addDays(anchor, 30 * dir);
  }
};

export const rangeTitle = (view: CalendarView, anchor: Date): string => {
  const { start, end } = visibleRange(view, anchor);
  switch (view) {
    case 'month': return format(anchor, 'MMMM yyyy');
    case 'week':
      return start.getMonth() === end.getMonth()
        ? `${format(start, 'MMM d')} – ${format(end, 'd, yyyy')}`
        : `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
    case 'day': return format(anchor, 'EEEE, MMMM d, yyyy');
    case 'agenda':
    case 'cards': return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
  }
};

/**
 * Slot proposed by the "Book meeting" buttons: the next half-hour from now,
 * one hour long. Late in the evening that would cross midnight (and the end
 * date would jump to tomorrow, which confuses "today → today" bookings), so
 * it rolls over to tomorrow 09:00 instead.
 */
export const defaultSlot = (): { start: Date; end: Date; allDay: boolean } => {
  const start = new Date();
  start.setMinutes(start.getMinutes() < 30 ? 30 : 60, 0, 0);
  let end = new Date(start.getTime() + 3_600_000);
  if (end.getDate() !== start.getDate()) {
    start.setDate(start.getDate() + 1);
    start.setHours(9, 0, 0, 0);
    end = new Date(start.getTime() + 3_600_000);
  }
  return { start, end, allDay: false };
};

export const daysBetween = (start: Date, end: Date): Date[] => {
  const out: Date[] = [];
  for (let d = startOfDay(start); d <= end; d = addDays(d, 1)) out.push(d);
  return out;
};

/** Does the meeting touch this calendar day? */
export const occursOn = (m: Pick<Meeting, 'startAt' | 'endAt'>, day: Date) =>
  new Date(m.startAt) <= endOfDay(day) && new Date(m.endAt) >= startOfDay(day);

/** Timed meetings spanning more than one day render like all-day bars. */
export const isBarEvent = (m: Pick<Meeting, 'startAt' | 'endAt' | 'allDay'>) =>
  m.allDay || !isSameDay(new Date(m.startAt), new Date(m.endAt));

// ── Time-grid layout ────────────────────────────────────────────────────────
export interface Positioned<T> {
  item: T;
  top: number; // minutes from midnight
  height: number; // minutes
  col: number;
  cols: number;
}

/**
 * Lays out overlapping timed events into side-by-side columns (like Google
 * Calendar). Events are clipped to the given day.
 */
export function layoutDay<T extends Pick<Meeting, 'startAt' | 'endAt'>>(events: T[], day: Date): Positioned<T>[] {
  const dayStart = startOfDay(day).getTime();
  const items = events
    .map((item) => {
      const s = Math.max(new Date(item.startAt).getTime(), dayStart);
      const e = Math.min(new Date(item.endAt).getTime(), dayStart + 86_400_000);
      const top = (s - dayStart) / 60_000;
      const height = Math.max(20, (e - s) / 60_000);
      return { item, top, height, col: 0, cols: 1 };
    })
    .sort((a, b) => a.top - b.top || b.height - a.height);

  // Sweep: build clusters of mutually overlapping events, assign greedy columns.
  let cluster: Positioned<T>[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const cols = Math.max(1, ...cluster.map((c) => c.col + 1));
    cluster.forEach((c) => { c.cols = cols; });
    cluster = [];
  };
  for (const ev of items) {
    if (cluster.length && ev.top >= clusterEnd) flush();
    const colEnds: number[] = [];
    cluster.forEach((c) => { colEnds[c.col] = Math.max(colEnds[c.col] ?? 0, c.top + c.height); });
    let col = 0;
    while ((colEnds[col] ?? 0) > ev.top) col++;
    ev.col = col;
    cluster.push(ev);
    clusterEnd = Math.max(clusterEnd, ev.top + ev.height);
  }
  flush();
  return items;
}
