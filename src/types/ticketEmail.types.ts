import type { ThreadEmail, LeadEmailThreadSummary } from '@/types/teleSales.types';
import type { InboxResponse, InboxRowBase } from '@/components/email/EmailInboxView';

/**
 * A message in a ticket's email conversation with the customer. The backend
 * stores it with the same fields as a lead email (shared emailMessageFields).
 */
export type TicketEmail = ThreadEmail & { ticket: string };

export interface TicketEmailsResponse {
  success: boolean;
  total: number;
  data: TicketEmail[];
  summary: LeadEmailThreadSummary;
}

/** One row of the ticket Email Management page: a ticket's whole conversation. */
export interface TicketEmailInboxRow extends InboxRowBase {
  ticket: {
    _id: string;
    ticketNumber: string;
    subject: string;
    status?: string;
    priority?: string;
    customer?: { _id: string; companyName?: string; contactPerson?: string; email?: string };
  } | null;
}

export type TicketEmailInboxFilter = 'all' | 'unread' | 'awaiting_agent' | 'awaiting_customer' | 'mine';

export type TicketEmailInboxResponse = InboxResponse<TicketEmailInboxRow>;
