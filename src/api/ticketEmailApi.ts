import api from './axiosConfig';
import type { LeadEmailResponse, SendLeadEmailData } from '@/types/teleSales.types';
import type {
  TicketEmailsResponse,
  TicketEmailInboxFilter,
  TicketEmailInboxResponse,
} from '@/types/ticketEmail.types';

// Email conversations with the customer, per ticket (staff only) — /api/ticket-emails.
// Send / reply answer the same shape as the lead endpoints, so the shared
// compose window (GmailCompose) takes these through its `submit` prop.

export const getTicketEmails = (ticketId: string): Promise<TicketEmailsResponse> =>
  api.get(`/ticket-emails/ticket/${ticketId}`).then((r) => r.data);

export const sendTicketEmail = (ticketId: string, data: SendLeadEmailData): Promise<LeadEmailResponse> =>
  api.post(`/ticket-emails/ticket/${ticketId}`, data).then((r) => r.data);

export const replyTicketEmail = (ticketId: string, emailId: string, data: SendLeadEmailData): Promise<LeadEmailResponse> =>
  api.post(`/ticket-emails/ticket/${ticketId}/${emailId}/reply`, data).then((r) => r.data);

export const markTicketEmailRead = (ticketId: string, emailId: string) =>
  api.patch(`/ticket-emails/ticket/${ticketId}/${emailId}/read`).then((r) => r.data);

export const deleteTicketEmail = (ticketId: string, emailId: string) =>
  api.delete(`/ticket-emails/ticket/${ticketId}/${emailId}`).then((r) => r.data);

export const syncTicketInbox = (): Promise<{ success: boolean; message: string; data: { processed: number; filed: number } }> =>
  api.post('/ticket-emails/sync').then((r) => r.data);

export const getTicketEmailInbox = (params: {
  filter?: TicketEmailInboxFilter;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<TicketEmailInboxResponse> => api.get('/ticket-emails/inbox', { params }).then((r) => r.data);
