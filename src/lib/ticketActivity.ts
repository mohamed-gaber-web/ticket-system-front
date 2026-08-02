/**
 * Date-range filtering for the dashboards.
 *
 * A range must measure each status by when a ticket *reached* that status, not by
 * when it was created: a ticket created 30/6 and resolved 5/7 is work done in a
 * 1/7–10/7 range, and filtering it out on createdAt hides that work entirely.
 */

export interface DatedTicket {
  status: string;
  createdAt: string;
  updatedAt?: string;
  acceptedAt?: string;
  resolvedAt?: string;
  deliveredAt?: string;
  closedAt?: string;
}

/** When a ticket reached the status it is in now. */
export function activityDate(t: DatedTicket): string {
  switch (t.status) {
    case 'new':       return t.createdAt;
    case 'assigned':  return t.acceptedAt  || t.updatedAt || t.createdAt;
    case 'resolved':  return t.resolvedAt  || t.updatedAt || t.createdAt;
    case 'delivered': return t.deliveredAt || t.updatedAt || t.createdAt;
    case 'closed':    return t.closedAt || t.resolvedAt || t.updatedAt || t.createdAt;
    // in_progress, customer_pending, tested, not_related and reopened have no stamp
    // of their own; updatedAt is when the ticket last moved, the closest proxy.
    default:          return t.updatedAt || t.createdAt;
  }
}

export const activityMs = (t: DatedTicket) => new Date(activityDate(t)).getTime();

/** Names the date each status is measured by, shown on the cards while a range is on. */
export const DATE_BASIS: Record<string, string> = {
  new:              'by created date',
  assigned:         'by accepted date',
  in_progress:      'by last update',
  customer_pending: 'by last update',
  resolved:         'by resolved date',
  tested:           'by last update',
  delivered:        'by delivered date',
  closed:           'by closed date',
  not_related:      'by last update',
};

export interface DateRange {
  active: boolean;
  fromMs: number;
  toMs: number;
}

/** Builds a range from two yyyy-mm-dd inputs, inclusive of both whole days. */
export function buildRange(dateFrom: string, dateTo: string): DateRange {
  return {
    active: Boolean(dateFrom || dateTo),
    fromMs: dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : -Infinity,
    toMs:   dateTo ? new Date(dateTo + 'T23:59:59.999').getTime() : Infinity,
  };
}

/** An inactive range admits everything, including tickets with the date missing. */
export function isInRange(range: DateRange, date?: string): boolean {
  if (!range.active) return true;
  if (!date) return false;
  const ms = new Date(date).getTime();
  return ms >= range.fromMs && ms <= range.toMs;
}

/** A single calendar month [1st 00:00 … last day 23:59:59.999], both inclusive. */
export function monthRange(year: number, monthIndex: number): DateRange {
  return {
    active: true,
    fromMs: new Date(year, monthIndex, 1, 0, 0, 0, 0).getTime(),
    toMs: new Date(year, monthIndex + 1, 0, 23, 59, 59, 999).getTime(),
  };
}

/** Year-to-date: Jan 1 of `year` … end of `monthIndex` (inclusive). */
export function ytdRange(year: number, monthIndex: number): DateRange {
  return {
    active: true,
    fromMs: new Date(year, 0, 1, 0, 0, 0, 0).getTime(),
    toMs: new Date(year, monthIndex + 1, 0, 23, 59, 59, 999).getTime(),
  };
}
