import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import * as taskEmailApi from '@/api/taskEmailApi';
import { downloadFile } from '@/api/teleSalesApi';
import { apiErrorMessage } from '@/lib/emailInbox';
import { LeadEmailThread } from '@/components/tele-sales/LeadEmailThread';
import GmailCompose from '@/components/tele-sales/GmailCompose';
import type { EmailAttachment, LeadEmailThreadSummary, SendLeadEmailData } from '@/types/teleSales.types';
import type { TaskEmail } from '@/types/taskEmail.types';

interface TaskEmailsTabProps {
  taskId: string;
  taskNumber?: string;
  taskName?: string;
  /** Tell the page how many messages there are / how many are unread (tab label). */
  onCountChange?: (total: number, unread: number) => void;
}

/**
 * The task's email conversation — the same thread and compose window the
 * ticket and lead pages use, sending through /api/task-emails. Every subject is
 * tagged with the task number server-side, so replies are filed back here.
 */
export function TaskEmailsTab({ taskId, taskNumber, taskName, onCountChange }: TaskEmailsTabProps) {
  const [emails, setEmails] = useState<TaskEmail[]>([]);
  const [summary, setSummary] = useState<LeadEmailThreadSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<TaskEmail | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await taskEmailApi.getTaskEmails(taskId);
      setEmails(r.data);
      setSummary(r.summary ?? null);
      onCountChange?.(r.data.length, r.summary?.unread ?? 0);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to load emails'));
    } finally {
      setLoading(false);
    }
  }, [taskId, onCountChange]);

  useEffect(() => { load(); }, [load]);

  // "Check for replies": pull the shared mailbox now, then reload the thread.
  const sync = async () => {
    setSyncing(true);
    try {
      const r = await taskEmailApi.syncTaskInbox();
      await load();
      if (r.data?.filed) toast.success(r.message); else toast.info(r.message);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not check the mailbox'));
    } finally {
      setSyncing(false);
    }
  };

  const markRead = async (email: TaskEmail) => {
    try {
      const r = await taskEmailApi.markTaskEmailRead(taskId, email._id);
      const unread = Math.max(0, (summary?.unread ?? 1) - 1);
      setEmails((prev) => prev.map((e) => (e._id === email._id ? { ...e, ...r.data } : e)));
      setSummary((s) => (s ? { ...s, unread } : s));
      onCountChange?.(emails.length, unread);
    } catch { /* not critical */ }
  };

  const remove = async (emailId: string) => {
    const r = await Swal.fire({
      title: 'Remove from history?',
      text: 'The message stays delivered — this only clears the record here.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Remove',
    });
    if (!r.isConfirmed) return;
    try {
      await taskEmailApi.deleteTaskEmail(taskId, emailId);
      toast.success('Removed');
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed'));
    }
  };

  const download = async (att: EmailAttachment) => {
    try {
      const blob = await downloadFile(att.fileId);
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = att.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error('Failed to download file');
    }
  };

  // New messages and replies both go through the task endpoints.
  const submit = (payload: SendLeadEmailData) =>
    replyTo
      ? taskEmailApi.replyTaskEmail(taskId, replyTo._id, payload)
      : taskEmailApi.sendTaskEmail(taskId, payload);

  const openCompose = () => { setReplyTo(null); setComposeOpen(true); };
  const openReply = (email: TaskEmail) => { setReplyTo(email); setComposeOpen(true); };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <>
      <LeadEmailThread<TaskEmail>
        emails={emails}
        summary={summary}
        syncing={syncing}
        onCompose={openCompose}
        onReply={openReply}
        onRefresh={sync}
        onDelete={remove}
        onMarkRead={markRead}
        onDownload={download}
        canWrite
        contactNoun="recipient"
      />
      <GmailCompose
        open={composeOpen}
        onClose={() => { setComposeOpen(false); setReplyTo(null); }}
        defaultTo={[]}
        defaultSubject={taskName ?? ''}
        submit={submit}
        senderKind="tasks"
        contextLabel={[taskNumber, taskName].filter(Boolean).join(' · ')}
        replyTo={replyTo}
        onSent={() => load()}
      />
    </>
  );
}
