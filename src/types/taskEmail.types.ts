import type { ThreadEmail, LeadEmailThreadSummary } from '@/types/teleSales.types';
import type { InboxResponse, InboxRowBase } from '@/components/email/EmailInboxView';

/** A message in a task's email conversation (same stored fields as a ticket email). */
export type TaskEmail = ThreadEmail & { task: string };

export interface TaskEmailsResponse {
  success: boolean;
  total: number;
  data: TaskEmail[];
  summary: LeadEmailThreadSummary;
}

/** One row of the Task Emails page: a task's whole conversation. */
export interface TaskEmailInboxRow extends InboxRowBase {
  task: {
    _id: string;
    taskNumber: string;
    name: string;
    status?: string;
    assignedTo?: { _id: string; firstName?: string; lastName?: string } | null;
  } | null;
}

export type TaskEmailInboxFilter = 'all' | 'unread' | 'awaiting_agent' | 'awaiting_customer' | 'mine';

export type TaskEmailInboxResponse = InboxResponse<TaskEmailInboxRow>;
