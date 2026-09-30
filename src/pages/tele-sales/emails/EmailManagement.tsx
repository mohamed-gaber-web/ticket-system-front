import * as teleSalesApi from '@/api/teleSalesApi';
import type { EmailInboxFilter, EmailInboxRow } from '@/types/teleSales.types';
import { EmailInboxView, type InboxFilter } from '@/components/email/EmailInboxView';
import { initialsOf } from '@/lib/emailInbox';

const FILTERS: InboxFilter<EmailInboxFilter>[] = [
  { value: 'all', label: 'All conversations', hint: 'Every lead you have emailed or heard from' },
  { value: 'unread', label: 'Unread replies', hint: 'Leads whose reply nobody has opened yet' },
  { value: 'awaiting_agent', label: 'Needs my reply', hint: 'The lead wrote last — your turn' },
  { value: 'awaiting_lead', label: 'Waiting for lead', hint: 'You wrote last — waiting on them' },
  { value: 'mine', label: 'My emails', hint: 'Conversations I have written in' },
];

const TILE_FILTERS = { all: 'all', unread: 'unread', awaitingAgent: 'awaiting_agent', awaitingContact: 'awaiting_lead' } as const;

const viewOf = (row: EmailInboxRow) =>
  row.lead
    ? {
        key: row.lead._id,
        title: row.lead.companyName,
        subtitle: row.lead.contactPersonName,
        avatar: initialsOf(row.lead.companyName),
        href: `/tele-sales/leads/${row.lead._id}?tab=emails`,
      }
    : null;

/**
 * Email management: every lead conversation in one place — who is waiting on
 * whom, unread replies, and a jump into the lead's thread to answer.
 */
export default function EmailManagement() {
  return (
    <EmailInboxView<EmailInboxRow, EmailInboxFilter>
      title="Email Management"
      description="All email conversations with leads — replies arrive here automatically."
      searchPlaceholder="Search company, contact or email…"
      contactNoun="lead"
      filters={FILTERS}
      tileFilters={TILE_FILTERS}
      load={teleSalesApi.getEmailInbox}
      sync={teleSalesApi.syncLeadInbox}
      viewOf={viewOf}
    />
  );
}
