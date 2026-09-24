import type { Ticket } from '@/types/ticket';

/**
 * "Pending on customer" columns for ticket exports.
 *
 * While a ticket is `customer_pending` it is waiting on one customer user
 * (`pendingOn`, defaulting to the ticket's customer — the same fallback the
 * "Waiting on …" line in the UI uses). Any other status leaves both columns
 * empty: the backend clears `pendingOn` as soon as the status moves on.
 */
export const PENDING_EXPORT_HEADERS = ['Pending On (Customer)', 'Pending Since'];

type Person = { contactPerson?: string; companyName?: string; email?: string };
const asPerson = (value: unknown): Person | null =>
  value && typeof value === 'object' ? (value as Person) : null;

const DAY = 86_400_000;

export const pendingExportValues = (ticket: Pick<Ticket, 'status' | 'pendingOn' | 'pendingSince' | 'customer'>): [string, string] => {
  if (ticket.status !== 'customer_pending') return ['', ''];

  const person = asPerson(ticket.pendingOn) ?? asPerson(ticket.customer);
  const name = person?.contactPerson || person?.companyName || person?.email || 'Customer';
  const email = person?.email && person.email !== name ? ` (${person.email})` : '';

  let since = '';
  if (ticket.pendingSince) {
    const date = new Date(ticket.pendingSince);
    const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / DAY));
    since = `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (${days} day${days === 1 ? '' : 's'})`;
  }
  return [`${name}${email}`, since];
};
