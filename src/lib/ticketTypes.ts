import type { Customer, Ticket, TicketRequester, TicketType } from '@/types/ticket';

/**
 * Ticket kinds — Customer / Internal / R&D. Mirrors the backend's
 * `src/utils/ticketTypes.js`. A ticket without `ticketType` (older documents)
 * is a Customer ticket. R&D is visible only to admins + the R&D department
 * (see `useTicketSettings().canSeeRnd`).
 */
export const TICKET_TYPES: TicketType[] = ['customer', 'internal', 'rnd'];

export const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  customer: 'Customer',
  internal: 'Internal',
  rnd: 'R&D',
};

/** Badge classes per type — light + dark. */
export const TICKET_TYPE_BADGE: Record<TicketType, string> = {
  customer: 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200',
  internal: 'bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300',
  rnd: 'bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300',
};

/** List page per type. */
export const TICKET_LIST_PATH: Record<TicketType, string> = {
  customer: '/tickets',
  internal: '/tickets/internal',
  rnd: '/tickets/rnd',
};

/** Dashboard per type. */
export const TICKET_DASHBOARD_PATH: Record<TicketType, string> = {
  customer: '/dashboard',
  internal: '/dashboard/internal',
  rnd: '/dashboard/rnd',
};

/** Page titles per type. */
export const TICKET_LIST_TITLE: Record<TicketType, string> = {
  customer: 'Tickets',
  internal: 'Internal Tickets',
  rnd: 'R&D Tickets',
};

export const TICKET_LIST_SUBTITLE: Record<TicketType, string> = {
  customer: 'Manage your support tickets',
  internal: 'Work requested by our own team',
  rnd: 'Research & development work',
};

export const isTicketType = (v: unknown): v is TicketType =>
  typeof v === 'string' && (TICKET_TYPES as string[]).includes(v);

/** The ticket's type; missing = "customer". */
export const ticketTypeOf = (t: Pick<Ticket, 'ticketType'> | null | undefined): TicketType =>
  isTicketType(t?.ticketType) ? t.ticketType : 'customer';

export const isCustomerTicket = (t: Pick<Ticket, 'ticketType'> | null | undefined): boolean =>
  ticketTypeOf(t) === 'customer';

/** Create-ticket link that pre-selects the type. */
export const createTicketPath = (type: TicketType): string =>
  type === 'customer' ? '/tickets/create' : `/tickets/create?type=${type}`;

/** The populated requester, or null. */
export const requesterOf = (t: Pick<Ticket, 'requestedBy'>): TicketRequester | null =>
  t.requestedBy && typeof t.requestedBy === 'object' ? t.requestedBy : null;

/** The requester's display name ('' when not populated). */
export const requesterName = (t: Pick<Ticket, 'requestedBy'>): string => {
  const r = requesterOf(t);
  if (!r) return '';
  return r.fullName || `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim();
};

/** The populated customer, or null (Internal / R&D tickets have none). */
export const customerOf = (t: Pick<Ticket, 'customer'>): Customer | null =>
  t.customer && typeof t.customer === 'object' ? t.customer : null;

/**
 * Who the ticket is for, in one line: the customer's company, else the requester's
 * name, else the type label ("Internal" / "R&D").
 */
export const ticketPartyName = (t: Pick<Ticket, 'customer' | 'requestedBy' | 'ticketType'>): string => {
  const c = customerOf(t);
  if (c?.companyName) return c.companyName;
  const name = requesterName(t);
  if (name) return name;
  return isCustomerTicket(t) ? '' : TICKET_TYPE_LABELS[ticketTypeOf(t)];
};
