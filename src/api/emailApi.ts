import api from './axiosConfig';

export interface SendCommentEmailPayload {
  ticketId: string;
  ticketNumber: string;
  commentText: string;
  recipients: string[];
  senderName: string;
}

export const sendCommentEmail = (payload: SendCommentEmailPayload) =>
  api.post('/emails/send-comment', payload);

export interface SendTicketCreatedEmailPayload {
  ticketId: string;
  ticketNumber: string;
  subject: string;
  description: string;
  priority: string;
  recipients: string[];
  senderName: string;
}

export const sendTicketCreatedEmail = (payload: SendTicketCreatedEmailPayload) =>
  api.post('/emails/send-ticket-created', payload);

export interface SendTaskAssignedEmailPayload {
  taskId: string;
  taskName: string;
  description?: string;
  departmentName: string;
  startDate?: string;
  endDate?: string;
  scheduledWeek?: number;
  weekRange?: string;
  duration?: number;
  status: string;
  recipients: string[];
  senderName: string;
}

export const sendTaskAssignedEmail = (payload: SendTaskAssignedEmailPayload) =>
  api.post('/emails/send-task-assigned', payload);
