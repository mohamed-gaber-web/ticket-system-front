// Client-side mirror of the My Home rules (backend src/utils/myHomeRules.js), so
// badges, hero tiles and the week plan recompute instantly after any action.
import type { BoardStatus, HomeEmail, HomePriority, HomeTicket, WeekDay } from '@/types/myHome.types';

const BOARD_OF_STATUS: Record<string, BoardStatus> = {
  new: 'todo',
  assigned: 'todo',
  reopened: 'todo',
  in_progress: 'in_progress',
  customer_pending: 'waiting',
  on_hold: 'waiting',
  resolved: 'done',
  tested: 'done',
  delivered: 'done',
  closed: 'done',
  not_related: 'done',
  cancelled: 'done',
};
export const boardOf = (status: string): BoardStatus => BOARD_OF_STATUS[status] ?? 'todo';

export const STATUS_LABEL: Record<string, string> = {
  new: 'New',
  assigned: 'Assigned',
  reopened: 'Reopened',
  in_progress: 'In progress',
  customer_pending: 'Waiting on client',
  on_hold: 'On hold',
  resolved: 'Resolved',
  tested: 'Tested',
  delivered: 'Delivered',
  closed: 'Closed',
  not_related: 'Not related',
  cancelled: 'Cancelled',
};

export const BOARD_LABEL: Record<BoardStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  waiting: 'Waiting',
  done: 'Done',
};

export const PRIORITY_LABEL: Record<HomePriority, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};
const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

/** "YYYY-MM-DD" of `date` on the `timeZone` calendar. */
export const dayKey = (date: string | Date, timeZone: string): string => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(new Date(date))
      .map((p) => [p.type, p.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
};

export const keyToDate = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
};

export const addDaysKey = (key: string, n: number) => {
  const d = keyToDate(key);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export interface TicketView extends HomeTicket {
  open: boolean;
  dueKey: string | null;
}

/** Recomputes the date flags from the current status (they change when a ticket is closed or reopened). */
export const viewTicket = (t: HomeTicket, todayKey: string, tz: string): TicketView => {
  const open = t.board !== 'done';
  const dueKey = t.dueDate ? dayKey(t.dueDate, tz) : null;
  return {
    ...t,
    open,
    dueKey,
    isOverdue: open && !!dueKey && dueKey < todayKey,
    isDueToday: open && dueKey === todayKey,
  };
};

export const compareTickets = (a: TicketView, b: TicketView) => {
  if (a.open !== b.open) return a.open ? -1 : 1;
  if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
  const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
  const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
  if (da !== db) return da - db;
  return (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
};

export const remaining = (t: { estimateHours: number; loggedHours: number }) =>
  Math.max(0, (t.estimateHours || 0) - (t.loggedHours || 0));

/** Planned hours per day: remaining hours of open tickets due that day; today also carries the overdue ones. */
export const planWeek = (days: WeekDay[], tickets: TicketView[], todayKey: string) => {
  const out = days.map((d) => ({ ...d, dueCount: 0, plannedHours: 0 }));
  const byKey = new Map(out.map((d) => [d.date, d]));
  for (const t of tickets) {
    if (!t.open || !t.dueKey) continue;
    const day = byKey.get(t.isOverdue ? todayKey : t.dueKey);
    if (!day) continue;
    day.dueCount += 1;
    day.plannedHours += remaining(t);
  }
  for (const d of out) {
    d.plannedHours = Math.round(d.plannedHours * 10) / 10;
    d.isOver = d.plannedHours > d.capacity;
  }
  return out;
};

/** Does the ticket belong to the selected planner day? (today also includes overdue) */
export const onDay = (t: TicketView, day: string, todayKey: string) =>
  t.open && (t.dueKey === day || (day === todayKey && t.isOverdue));

export type EmailAge = 'fresh' | 'waiting' | 'late' | 'replied';

export const emailAge = (e: HomeEmail, nowMs: number, warn: number, sla: number): { bucket: EmailAge; hours: number } => {
  const hours = Math.max(0, Math.floor((nowMs - new Date(e.receivedAt).getTime()) / 3600000));
  if (e.repliedAt) return { bucket: 'replied', hours };
  if (hours >= sla) return { bucket: 'late', hours };
  if (hours >= warn) return { bucket: 'waiting', hours };
  return { bucket: 'fresh', hours };
};

export const ageLabel = (hours: number) => {
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h`;
  const d = Math.floor(hours / 24);
  const h = hours % 24;
  return h ? `${d}d ${h}h` : `${d}d`;
};

export const compareEmails = (a: HomeEmail, b: HomeEmail) => {
  if (!!a.repliedAt !== !!b.repliedAt) return a.repliedAt ? 1 : -1;
  return new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime();
};

const SHORT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
export const shortDate = (d: string | Date | null | undefined) => (d ? SHORT.format(new Date(d)) : '—');
export const shortKey = (key: string) => SHORT.format(keyToDate(key));
export const longDate = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const relativeTime = (d: string | Date, nowMs = Date.now()) => {
  const mins = Math.round((nowMs - new Date(d).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
};

export const greetingFor = (hour: number) => (hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening');

export const hourIn = (timeZone: string) =>
  Number(new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', hourCycle: 'h23' }).format(new Date()));

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?';

export const firstNameOf = (name: string) => name.trim().split(/\s+/)[0] ?? '';

/** Plain text from the textarea → minimal HTML the mail endpoints accept. */
export const textToHtml = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p>`)
    .join('');

/** Email bodies arrive as sanitised HTML; the drawer shows them as text. */
export const htmlToText = (html: string) => {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
  doc.querySelectorAll('p,div,li,tr').forEach((el) => el.append('\n'));
  return (doc.body.textContent ?? '').replace(/\n{3,}/g, '\n\n').trim();
};

/** Working days (Sun–Thu) between two "YYYY-MM-DD" keys, inclusive. */
export const workingDaysBetween = (from: string, to: string) => {
  if (!from || !to || from > to) return 0;
  let n = 0;
  for (let k = from; k <= to; k = addDaysKey(k, 1)) {
    const wd = keyToDate(k).getUTCDay();
    if (wd !== 5 && wd !== 6) n++;
  }
  return n;
};

/** Smooth-scroll to a My Home section and keep its anchor in the URL. */
/** The element that actually scrolls the page — the layout's <main>, not the window. */
export const scrollParentOf = (el: HTMLElement | null): HTMLElement | null => {
  for (let node = el?.parentElement ?? null; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll') return node;
  }
  return null;
};

export const scrollToSection = (id: string) => {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const scroller = scrollParentOf(el);
  if (scroller) {
    // Scroll only the page's own container. scrollIntoView would also scroll
    // every ancestor — for the last sections, which can't reach the top, that
    // shoves the whole app shell (sidebar included) up and leaves a blank gap.
    const nav = scroller.querySelector<HTMLElement>('.mh-nav');
    const offset = (nav?.offsetHeight ?? 0) + 16;
    const top = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - offset;
    scroller.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
  } else {
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }
  history.replaceState(null, '', `#${id}`);
};
