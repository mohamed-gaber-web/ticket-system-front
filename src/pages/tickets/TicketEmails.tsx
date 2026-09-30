import * as ticketEmailApi from '@/api/ticketEmailApi';
import type { TicketEmailInboxFilter, TicketEmailInboxRow } from '@/types/ticketEmail.types';
import { EmailInboxView, type InboxFilter } from '@/components/email/EmailInboxView';
import { initialsOf } from '@/lib/emailInbox';

const FILTERS: InboxFilter<TicketEmailInboxFilter>[] = [
  { value: 'all', label: 'All conversations', hint: 'Every ticket with an email conversation' },
  { value: 'unread', label: 'Unread replies', hint: 'Customer replies nobody has opened yet' },
  { value: 'awaiting_agent', label: 'Needs my reply', hint: 'The customer wrote last — your turn' },
  { value: 'awaiting_customer', label: 'Waiting for customer', hint: 'We wrote last — waiting on them' },
  { value: 'mine', label: 'My emails', hint: 'Conversations I have written in' },
];

const TILE_FILTERS = { all: 'all', unread: 'unread', awaitingAgent: 'awaiting_agent', awaitingContact: 'awaiting_customer' } as const;

const viewOf = (row: TicketEmailInboxRow) => {
  const t = row.ticket;
  if (!t) return null;
  const company = t.customer?.companyName || t.customer?.contactPerson;
  return {
    key: t._id,
    tag: t.ticketNumber,
    title: t.subject,
    subtitle: [company, t.status?.replace(/_/g, ' ')].filter(Boolean).join(' · '),
    avatar: initialsOf(company || t.subject),
    href: `/tickets/view/${t._id}?tab=emails`,
  };
};

/**
 * Ticket email management: every customer email conversation in one place —
 * the ticketing twin of the tele-sales Email Management page.
 */
export default function TicketEmails() {
  return (
    <EmailInboxView<TicketEmailInboxRow, TicketEmailInboxFilter>
      title="Ticket Emails"
      description="All email conversations with customers about their tickets — replies arrive here automatically."
      searchPlaceholder="Search ticket #, subject, company or email…"
      contactNoun="customer"
      filters={FILTERS}
      tileFilters={TILE_FILTERS}
      load={ticketEmailApi.getTicketEmailInbox}
      sync={ticketEmailApi.syncTicketInbox}
      viewOf={viewOf}
    />
  );
}
