import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/redux/store';
import { compareEmails, compareTickets, onDay, planWeek, viewTicket, type TicketView } from '@/lib/myHome';
import type { CallListItem, HomeEmail, HomeFollowUp, HomeTask } from '@/types/myHome.types';

// Every list, count and badge of the page is derived here from the raw data +
// UI state, so an optimistic change anywhere shows up everywhere at once.

const selectData = (s: RootState) => s.myHome.data;
export const selectUi = (s: RootState) => s.myHome.ui;
const selectSearch = (s: RootState) => s.myHome.ui.search.trim().toLowerCase();

const has = (q: string, ...fields: (string | null | undefined)[]) => !q || fields.some((f) => f?.toLowerCase().includes(q));

export const selectTickets = createSelector([selectData], (d): TicketView[] =>
  d ? d.tickets.map((t) => viewTicket(t, d.today, d.timezone)).sort(compareTickets) : []
);

const selectSearchedTickets = createSelector([selectTickets, selectSearch], (tickets, q) =>
  tickets.filter((t) => has(q, t.code, t.title, t.clientName, t.module, t.category))
);

/** The tickets panel: tab → day → chip (chip counts are taken before the chip filter). */
export const selectTicketPanel = createSelector([selectSearchedTickets, selectUi, selectData], (tickets, ui, d) => {
  const { tab, filter, day } = ui.tickets;
  const today = d?.today ?? '';
  const inTab = tickets.filter((t) => t.kind === tab);
  const inDay = day ? inTab.filter((t) => onDay(t, day, today)) : inTab;
  const counts = {
    open: inDay.filter((t) => t.open).length,
    overdue: inDay.filter((t) => t.isOverdue).length,
    waiting: inDay.filter((t) => t.board === 'waiting').length,
    all: inDay.length,
  };
  const rows = inDay.filter((t) =>
    filter === 'open' ? t.open : filter === 'overdue' ? t.isOverdue : filter === 'waiting' ? t.board === 'waiting' : true
  );
  const tabCounts = {
    client: tickets.filter((t) => t.kind === 'client' && t.open).length,
    internal: tickets.filter((t) => t.kind === 'internal' && t.open).length,
  };
  return { rows, counts, tabCounts };
});

export const selectWeek = createSelector([selectData, selectTickets], (d, tickets) => {
  if (!d) return null;
  const days = planWeek(d.week.days, tickets, d.today);
  return {
    days,
    plannedTotal: Math.round(days.reduce((s, x) => s + x.plannedHours, 0) * 10) / 10,
    capacityTotal: days.reduce((s, x) => s + x.capacity, 0),
  };
});

export interface EmailView extends HomeEmail {
  late: boolean;
}

const selectEmailsSorted = createSelector([selectData], (d): HomeEmail[] => (d ? [...d.emails].sort(compareEmails) : []));

export const selectEmailPanel = createSelector([selectEmailsSorted, selectSearch, selectUi], (emails, q, ui) => {
  const searched = emails.filter((e) => has(q, e.fromName, e.company, e.subject, e.ticketCode));
  const counts = {
    needs: searched.filter((e) => !e.repliedAt).length,
    replied: searched.filter((e) => !!e.repliedAt).length,
    all: searched.length,
  };
  const tab = ui.emails.tab;
  const rows = searched.filter((e) => (tab === 'needs' ? !e.repliedAt : tab === 'replied' ? !!e.repliedAt : true));
  return { rows, counts };
});

const selectTasksAll = createSelector([selectData], (d): HomeTask[] => d?.tasks ?? []);

export const selectTaskPanel = createSelector([selectTasksAll, selectSearch, selectUi], (tasks, q, ui) => {
  const searched = tasks.filter((t) => has(q, t.title, t.sourceLabel, t.code));
  const byDue = (a: HomeTask, b: HomeTask) =>
    (a.dueDate ? new Date(a.dueDate).getTime() : Infinity) - (b.dueDate ? new Date(b.dueDate).getTime() : Infinity);
  const open = searched.filter((t) => !t.done).sort(byDue);
  const done = searched.filter((t) => t.done);
  return { rows: ui.tasks.tab === 'open' ? open : done, counts: { open: open.length, done: done.length } };
});

export const selectTelesales = createSelector([selectData, selectSearch], (d, q) => {
  const ts = d?.telesales;
  if (!ts) return null;
  const callList: CallListItem[] = ts.callList.filter((c) => has(q, c.company, c.contactName));
  const match = (f: HomeFollowUp) => has(q, f.company, f.contactName, f.note);
  return {
    ...ts,
    callList,
    followUps: {
      overdue: ts.followUps.overdue.filter(match),
      today: ts.followUps.today.filter(match),
      upcoming: ts.followUps.upcoming.filter(match),
    },
  };
});

/** Hero tiles + nav badges — always from the live lists (never the server's first-paint numbers). */
export const selectCounts = createSelector([selectData, selectTickets], (d, tickets) => {
  if (!d) return null;
  const open = tickets.filter((t) => t.open);
  const unreplied = d.emails.filter((e) => !e.repliedAt);
  const nowMs = Date.now();
  const late = unreplied.filter((e) => nowMs - new Date(e.receivedAt).getTime() >= d.config.emailSlaHours * 3600000).length;
  const tasksDueToday = d.tasks.filter(
    (t) => !t.done && t.dueDate && new Intl.DateTimeFormat('en-CA', { timeZone: d.timezone }).format(new Date(t.dueDate)) === d.today
  ).length;
  const ts = d.telesales;
  const followUpsDue = ts ? [...ts.followUps.overdue, ...ts.followUps.today].filter((f) => !f.done).length : 0;
  return {
    overdue: open.filter((t) => t.isOverdue).length,
    dueToday: open.filter((t) => t.isDueToday).length + tasksDueToday,
    emailsToReply: unreplied.length,
    emailsLate: late,
    followUpsDue,
    openTasks: d.tasks.filter((t) => !t.done).length,
    openTickets: open.length,
    callsLeft: ts ? ts.callList.filter((c) => !c.todayCall).length : 0,
  };
});

/** "START WITH": the open client ticket with the nearest SLA, else the most overdue critical/high one. */
export const selectStartWith = createSelector([selectTickets], (tickets) => {
  const open = tickets.filter((t) => t.open);
  const sla = open
    .filter((t) => t.kind === 'client' && t.slaDueAt)
    .sort((a, b) => new Date(a.slaDueAt!).getTime() - new Date(b.slaDueAt!).getTime())[0];
  return (
    sla ??
    open
      .filter((t) => t.isOverdue && (t.priority === 'critical' || t.priority === 'high'))
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())[0] ??
    null
  );
});
