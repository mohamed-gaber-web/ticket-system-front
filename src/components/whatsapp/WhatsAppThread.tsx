import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { toast } from 'sonner';
import { AlertCircle, Check, CheckCheck, Clock, Loader2, Paperclip, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as whatsappApi from '@/api/whatsappApi';
import { uploadFile } from '@/api/teleSalesApi';
import { apiErrorMessage } from '@/lib/emailInbox';
import { useWhatsAppSocket } from '@/hooks/useWhatsAppSocket';
import { WhatsAppMedia } from '@/components/whatsapp/WhatsAppMedia';
import type { WhatsAppMessage, WhatsAppMessageStatus } from '@/types/whatsapp.types';

interface WhatsAppThreadProps {
  /** Digits with country code ("2010…"). */
  phone: string;
  /** Tag messages sent from a lead / ticket page. */
  leadId?: string;
  ticketId?: string;
  /** Admin reading another employee's chat: no composer, nothing marked read. */
  employeeId?: string;
  readOnly?: boolean;
  className?: string;
}

const MAX_FILE_BYTES = 16 * 1024 * 1024;

const TICKS: Record<WhatsAppMessageStatus, React.ReactNode> = {
  pending: <Clock className="w-3 h-3" />,
  sent: <Check className="w-3.5 h-3.5" />,
  delivered: <CheckCheck className="w-3.5 h-3.5" />,
  read: <CheckCheck className="w-3.5 h-3.5 text-sky-500" />,
  failed: <AlertCircle className="w-3.5 h-3.5 text-error" />,
  received: null,
};

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const dayOf = (iso: string) => new Date(iso).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

/** One WhatsApp conversation (the employee's number ↔ `phone`), live over the socket. */
export function WhatsAppThread({ phone, leadId, ticketId, employeeId, readOnly = false, className = '' }: WhatsAppThreadProps) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const ownChat = !employeeId;

  const markRead = useCallback(() => {
    if (ownChat) void whatsappApi.markWhatsAppChatRead(phone).catch(() => undefined);
  }, [ownChat, phone]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMessages([]);
    whatsappApi
      .getWhatsAppMessages(phone, { employee: employeeId })
      .then((r) => {
        if (cancelled) return;
        setMessages(r.data);
        setHasMore(r.hasMore);
        markRead();
      })
      .catch((err) => !cancelled && toast.error(apiErrorMessage(err, 'Could not load the chat')))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [phone, employeeId, markRead]);

  useEffect(() => {
    if (!loadingMore) bottomRef.current?.scrollIntoView({ block: 'end' });
    // Only follow new messages at the bottom, not when older ones are prepended.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  useWhatsAppSocket({
    onMessage: (m) => {
      if (!ownChat || m.phone !== phone) return;
      setMessages((prev) => (prev.some((p) => p._id === m._id) ? prev.map((p) => (p._id === m._id ? m : p)) : [...prev, m]));
      if (m.direction === 'inbound') markRead();
    },
    onAck: (a) => {
      if (!ownChat || a.phone !== phone) return;
      setMessages((prev) => prev.map((p) => (p._id === a._id ? { ...p, status: a.status } : p)));
    },
  });

  const loadEarlier = async () => {
    if (!messages.length) return;
    setLoadingMore(true);
    try {
      const r = await whatsappApi.getWhatsAppMessages(phone, { before: messages[0].sentAt, employee: employeeId });
      setMessages((prev) => [...r.data, ...prev]);
      setHasMore(r.hasMore);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not load earlier messages'));
    } finally {
      setLoadingMore(false);
    }
  };

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_FILE_BYTES) {
      toast.error('Files over 16 MB cannot be sent on WhatsApp.');
      return;
    }
    setFile(f);
  };

  const send = async () => {
    const body = text.trim();
    if ((!body && !file) || sending) return;
    setSending(true);
    try {
      let attachment = null;
      if (file) {
        const up = await uploadFile(file);
        attachment = { fileId: up.data.fileId, fileName: up.data.fileName };
      }
      const r = await whatsappApi.sendWhatsApp({ phone, text: body, attachment, leadId, ticketId });
      setMessages((prev) => (prev.some((p) => p._id === r.data._id) ? prev : [...prev, r.data]));
      setText('');
      setFile(null);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'WhatsApp message was not sent'));
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className={`flex flex-col min-h-0 bg-[#efeae2] dark:bg-surface-container-low rounded-2xl overflow-hidden ${className}`}>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-1.5">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-600/20 border-t-green-600" />
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="flex justify-center pb-2">
                <Button variant="outline" size="sm" onClick={loadEarlier} disabled={loadingMore}>
                  {loadingMore ? 'Loading…' : 'Load earlier messages'}
                </Button>
              </div>
            )}
            {messages.length === 0 && (
              <p className="text-center text-sm text-on-surface-variant py-12">No messages yet with +{phone}. Say hello 👋</p>
            )}
            {messages.map((m, i) => {
              const out = m.direction === 'outbound';
              const newDay = i === 0 || dayOf(messages[i - 1].sentAt) !== dayOf(m.sentAt);
              return (
                <div key={m._id}>
                  {newDay && (
                    <div className="flex justify-center my-2">
                      <span className="text-[11px] bg-white/80 dark:bg-surface-container-high text-on-surface-variant rounded-lg px-2.5 py-1 shadow-sm">{dayOf(m.sentAt)}</span>
                    </div>
                  )}
                  <div className={`flex ${out ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] rounded-xl px-3 py-1.5 shadow-sm text-sm text-on-surface ${
                        out ? 'bg-[#d9fdd3] dark:bg-green-900/40 rounded-tr-sm' : 'bg-white dark:bg-surface-container-high rounded-tl-sm'
                      }`}
                    >
                      {m.media?.kind && (
                        <div className="py-1">
                          <WhatsAppMedia message={m} />
                        </div>
                      )}
                      {m.body && (
                        <p dir="auto" className="whitespace-pre-wrap break-words">
                          {m.body}
                        </p>
                      )}
                      <div className="flex items-center justify-end gap-1 text-[10px] text-on-surface-variant/80 mt-0.5">
                        {out && !m.fromSystem && <span title="Sent from the phone">📱</span>}
                        <span>{timeOf(m.sentAt)}</span>
                        {out && TICKS[m.status]}
                      </div>
                      {m.status === 'failed' && m.error && <p className="text-[11px] text-error">{m.error}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {!readOnly && ownChat && (
        <div className="border-t border-black/5 bg-surface-container-lowest px-3 py-2 space-y-2">
          {file && (
            <div className="flex items-center gap-2 text-xs bg-surface-container-high rounded-lg px-2.5 py-1.5 w-fit max-w-full">
              <Paperclip className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{file.name}</span>
              <button type="button" onClick={() => setFile(null)} aria-label="Remove attachment">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <input ref={fileRef} type="file" className="hidden" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />
            <Button variant="ghost" size="icon" onClick={() => fileRef.current?.click()} disabled={sending} aria-label="Attach a file">
              <Paperclip className="w-5 h-5" />
            </Button>
            <textarea
              dir="auto"
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type a message"
              className="flex-1 resize-none max-h-32 min-h-10 rounded-xl ghost-border bg-surface-container-low px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-600/30"
            />
            <Button
              size="icon"
              onClick={send}
              disabled={sending || (!text.trim() && !file)}
              className="bg-green-600 hover:bg-green-700 bg-none text-white"
              aria-label="Send"
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
