import * as taskEmailApi from '@/api/taskEmailApi';
import type { TaskEmailInboxFilter, TaskEmailInboxRow } from '@/types/taskEmail.types';
import { EmailInboxView, type InboxFilter } from '@/components/email/EmailInboxView';
import { initialsOf } from '@/lib/emailInbox';

const FILTERS: InboxFilter<TaskEmailInboxFilter>[] = [
  { value: 'all', label: 'All conversations', hint: 'Every task with an email conversation' },
  { value: 'unread', label: 'Unread replies', hint: 'Replies nobody has opened yet' },
  { value: 'awaiting_agent', label: 'Needs my reply', hint: 'They wrote last — your turn' },
  { value: 'awaiting_customer', label: 'Waiting for reply', hint: 'We wrote last — waiting on them' },
  { value: 'mine', label: 'My emails', hint: 'Conversations I have written in' },
];

const TILE_FILTERS = { all: 'all', unread: 'unread', awaitingAgent: 'awaiting_agent', awaitingContact: 'awaiting_customer' } as const;

const STATUS_LABEL: Record<string, string> = { pending: 'Pending', in_progress: 'In progress', done: 'Done' };

const viewOf = (row: TaskEmailInboxRow) => {
  const t = row.task;
  if (!t) return null;
  const assignee = t.assignedTo ? [t.assignedTo.firstName, t.assignedTo.lastName].filter(Boolean).join(' ') : '';
  return {
    key: t._id,
    tag: t.taskNumber,
    title: t.name,
    subtitle: [assignee, t.status ? STATUS_LABEL[t.status] ?? t.status : ''].filter(Boolean).join(' · '),
    avatar: initialsOf(assignee || t.name),
    href: `/tasks/${t._id}?tab=emails`,
  };
};

/**
 * Task email management: every task's email conversation in one place — the
 * tasks twin of the Ticket Emails page. Replies arrive here automatically.
 */
export default function TaskEmails() {
  return (
    <EmailInboxView<TaskEmailInboxRow, TaskEmailInboxFilter>
      title="Task Emails"
      description="All email conversations about tasks — send from a task's Emails tab; replies arrive here automatically."
      searchPlaceholder="Search task # or name…"
      contactNoun="recipient"
      filters={FILTERS}
      tileFilters={TILE_FILTERS}
      load={taskEmailApi.getTaskEmailInbox}
      sync={taskEmailApi.syncTaskInbox}
      viewOf={viewOf}
    />
  );
}
