import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { LeadEmail, LeadEmailThreadSummary, EmailAttachment } from '@/types/teleSales.types';
import {
  Mail, Send, Reply, RefreshCw, Trash2, Paperclip, Download, File as FileIcon, Image as ImageIcon,
  AlertCircle, Check, CheckCheck, Inbox, Clock, ArrowDownLeft, ArrowUpRight, Hourglass, MailOpen,
} from 'lucide-react';

const formatDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
const formatFileSize = (n?: number) => {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};
const relative = (d?: string | null) => {
  if (!d) return '';
  const mins = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

/** Status badge for one message, phrased from the agent's point of view. */
export function EmailStatusBadge({ email, compact = false }: { email: Pick<LeadEmail, 'direction' | 'status'>; compact?: boolean }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    'outbound:sent': { label: 'Sent · awaiting reply', cls: 'bg-blue-100 text-blue-800', icon: <Check className="w-3 h-3" /> },
    'outbound:replied': { label: 'Replied by lead', cls: 'bg-green-100 text-green-800', icon: <CheckCheck className="w-3 h-3" /> },
    'outbound:failed': { label: 'Failed', cls: 'bg-error/10 text-error', icon: <AlertCircle className="w-3 h-3" /> },
    'inbound:received': { label: 'New reply', cls: 'bg-orange-100 text-orange-800', icon: <Inbox className="w-3 h-3" /> },
    'inbound:read': { label: 'Read · needs answer', cls: 'bg-yellow-100 text-yellow-800', icon: <MailOpen className="w-3 h-3" /> },
    'inbound:replied': { label: 'Answered', cls: 'bg-green-100 text-green-800', icon: <CheckCheck className="w-3 h-3" /> },
  };
  // Records from before inbound support have no direction stored — they were all sent by us.
  const m = map[`${email.direction ?? 'outbound'}:${email.status}`] ?? { label: email.status, cls: 'bg-surface-container text-on-surface-variant', icon: null };
  const label = compact ? m.label.split(' · ')[0] : m.label;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${m.cls}`}>
      {m.icon}{label}
    </span>
  );
}

interface LeadEmailThreadProps {
  emails: LeadEmail[];
  summary: LeadEmailThreadSummary | null;
  syncing: boolean;
  onCompose: () => void;
  onReply: (email: LeadEmail) => void;
  onRefresh: () => void;
  onDelete: (emailId: string) => void;
  onMarkRead: (email: LeadEmail) => void;
  onDownload: (att: EmailAttachment) => void;
  canWrite: boolean;
}

/**
 * The lead's email conversation, oldest first, with the exchange status at
 * the top: what we sent, what came back, and who owes the next reply.
 */
export function LeadEmailThread({
  emails, summary, syncing, onCompose, onReply, onRefresh, onDelete, onMarkRead, onDownload, canWrite,
}: LeadEmailThreadProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(emails.length ? [emails[emails.length - 1]._id] : []));

  const toggle = (email: LeadEmail) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(email._id)) next.delete(email._id);
      else next.add(email._id);
      return next;
    });
    if (email.direction === 'inbound' && email.status === 'received') onMarkRead(email);
  };

  return (
    <div className="space-y-4">
      {/* Status header */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Mail className="w-4 h-4" /></span>
            <div>
              <p className="text-sm font-bold text-on-surface">Email management</p>
              <p className="text-xs text-on-surface-variant">
                Replies from the lead land here automatically (mailbox is checked every 2 minutes).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={syncing} className="gap-1.5">
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} /> {syncing ? 'Checking…' : 'Check for replies'}
            </Button>
            {canWrite && (
              <Button size="sm" onClick={onCompose} className="gap-1.5">
                <Send className="w-3.5 h-3.5" /> Compose
              </Button>
            )}
          </div>
        </div>

        {summary && (
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-outline-variant/15">
            <Stat icon={<ArrowUpRight className="w-3.5 h-3.5" />} label="Sent" value={summary.sent} />
            <Stat icon={<ArrowDownLeft className="w-3.5 h-3.5" />} label="Received" value={summary.received} />
            {summary.unread > 0 && <Stat icon={<Inbox className="w-3.5 h-3.5" />} label="Unread" value={summary.unread} tone="orange" />}
            {summary.failed > 0 && <Stat icon={<AlertCircle className="w-3.5 h-3.5" />} label="Failed" value={summary.failed} tone="error" />}
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold">
              {summary.awaitingAgent ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-100 text-orange-800"><Hourglass className="w-3.5 h-3.5" /> Lead is waiting for your reply · {relative(summary.lastInboundAt)}</span>
              ) : summary.awaitingLead ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800"><Clock className="w-3.5 h-3.5" /> Waiting for the lead · sent {relative(summary.lastOutboundAt)}</span>
              ) : summary.sent + summary.received > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-800"><CheckCheck className="w-3.5 h-3.5" /> Up to date</span>
              ) : null}
            </span>
          </div>
        )}
      </div>

      {emails.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-on-surface-variant bg-surface-container-lowest rounded-2xl border border-outline-variant/20">
          <Mail className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-sm font-medium">No emails yet</p>
          <p className="text-xs mt-1">Click "Compose" to write the first message — the lead's replies will show up here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {emails.map((email) => {
            const inbound = email.direction === 'inbound';
            const isOpen = expanded.has(email._id);
            const unread = inbound && email.status === 'received';
            const who = inbound ? (email.fromName || email.from || 'Lead') : (email.sentByName || 'Agent');
            const when = inbound ? email.receivedAt ?? email.createdAt : email.sentAt ?? email.createdAt;
            return (
              <div key={email._id} className={`flex ${inbound ? 'justify-start' : 'justify-end'}`}>
                <div className={`w-full md:w-[85%] rounded-2xl border overflow-hidden ${
                  inbound
                    ? `bg-surface-container-lowest border-outline-variant/30 ${unread ? 'ring-2 ring-orange-300/60' : ''}`
                    : 'bg-primary/5 border-primary/20'
                }`}>
                  <button type="button" onClick={() => toggle(email)} className="w-full text-left p-4">
                    <div className="flex items-start gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                        inbound ? 'bg-orange-100 text-orange-800' : 'bg-primary text-on-primary'
                      }`}>
                        {who.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm text-on-surface truncate ${unread ? 'font-bold' : 'font-semibold'}`}>{email.subject}</span>
                          <EmailStatusBadge email={email} />
                          {email.attachments.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs text-on-surface-variant"><Paperclip className="w-3 h-3" /> {email.attachments.length}</span>
                          )}
                        </div>
                        <p className="text-xs text-on-surface-variant mt-1 truncate">
                          {inbound ? <><span className="font-medium text-on-surface">{who}</span>{email.from && ` <${email.from}>`} → you</> : <>{who} → {email.to.join(', ')}</>}
                          {email.cc.length > 0 && ` · Cc ${email.cc.join(', ')}`}
                        </p>
                        {!isOpen && email.bodyPreview && <p className="text-xs text-on-surface-variant/80 mt-1 truncate">{email.bodyPreview}</p>}
                        <p className="text-[11px] text-on-surface-variant/70 mt-1">
                          {formatDateTime(when)} · {relative(when)}
                          {email.readAt && inbound && <> · read {relative(email.readAt)}</>}
                          {email.repliedAt && <> · {inbound ? 'answered' : 'reply received'} {relative(email.repliedAt)}</>}
                        </p>
                      </div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-outline-variant/20 px-4 py-4 space-y-3">
                      {email.status === 'failed' && email.errorMessage && (
                        <p className="text-xs text-error bg-error/5 rounded-xl px-3 py-2">{email.errorMessage}</p>
                      )}
                      {/* Body is sanitised server-side before it is stored. */}
                      <div className="email-body-content text-sm text-on-surface" dangerouslySetInnerHTML={{ __html: email.body || '<p><em>(no message body)</em></p>' }} />
                      {email.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-outline-variant/20">
                          {email.attachments.map((att) => (
                            <button
                              key={att.fileId}
                              onClick={() => onDownload(att)}
                              className="inline-flex items-center gap-2 rounded-xl border border-outline-variant/40 px-3 py-2 text-xs text-on-surface hover:bg-surface-container transition-colors"
                            >
                              {att.fileType?.startsWith('image/') ? <ImageIcon className="w-3.5 h-3.5 text-brand-500" /> : <FileIcon className="w-3.5 h-3.5 text-on-surface-variant" />}
                              <span className="truncate max-w-[200px]">{att.fileName}</span>
                              <span className="text-on-surface-variant">{formatFileSize(att.fileSize)}</span>
                              <Download className="w-3.5 h-3.5 text-on-surface-variant" />
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20">
                        <div className="flex gap-2">
                          {canWrite && (
                            <Button size="sm" variant={inbound && email.status !== 'replied' ? 'default' : 'outline'} onClick={() => onReply(email)} className="gap-1.5">
                              <Reply className="w-3.5 h-3.5" /> Reply
                            </Button>
                          )}
                        </div>
                        <button onClick={() => onDelete(email._id)} className="p-1.5 rounded-lg hover:bg-error/10 text-on-surface-variant hover:text-error" title="Remove from history">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value, tone = 'neutral' }: { icon: React.ReactNode; label: string; value: number; tone?: 'neutral' | 'orange' | 'error' }) {
  const cls = tone === 'orange' ? 'bg-orange-100 text-orange-800' : tone === 'error' ? 'bg-error/10 text-error' : 'bg-surface-container text-on-surface';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>
      {icon}{label} <span className="font-bold">{value}</span>
    </span>
  );
}
