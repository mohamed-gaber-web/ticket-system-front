import api from './axiosConfig';
import type { EmailSenderInfo, LeadEmailResponse, SendLeadEmailData } from '@/types/teleSales.types';
import type { TaskEmailsResponse, TaskEmailInboxFilter, TaskEmailInboxResponse } from '@/types/taskEmail.types';

// Email conversations per task — /api/task-emails (tasks module). Same shapes as
// the ticket endpoints, so the shared composer (GmailCompose) and thread view work as-is.

/** Who task email can go out from: the support mailbox, and the employee's own. */
export const getTaskEmailSender = (): Promise<{ success: boolean; data: EmailSenderInfo }> =>
  api.get('/task-emails/sender').then((r) => r.data);

export const getTaskEmails = (taskId: string): Promise<TaskEmailsResponse> =>
  api.get(`/task-emails/task/${taskId}`).then((r) => r.data);

export const sendTaskEmail = (taskId: string, data: SendLeadEmailData): Promise<LeadEmailResponse> =>
  api.post(`/task-emails/task/${taskId}`, data).then((r) => r.data);

export const replyTaskEmail = (taskId: string, emailId: string, data: SendLeadEmailData): Promise<LeadEmailResponse> =>
  api.post(`/task-emails/task/${taskId}/${emailId}/reply`, data).then((r) => r.data);

export const markTaskEmailRead = (taskId: string, emailId: string) =>
  api.patch(`/task-emails/task/${taskId}/${emailId}/read`).then((r) => r.data);

export const deleteTaskEmail = (taskId: string, emailId: string) =>
  api.delete(`/task-emails/task/${taskId}/${emailId}`).then((r) => r.data);

export const syncTaskInbox = (): Promise<{ success: boolean; message: string; data: { processed: number; filed: number } }> =>
  api.post('/task-emails/sync').then((r) => r.data);

export const getTaskEmailInbox = (params: {
  filter?: TaskEmailInboxFilter;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<TaskEmailInboxResponse> => api.get('/task-emails/inbox', { params }).then((r) => r.data);
