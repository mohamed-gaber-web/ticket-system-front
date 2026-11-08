import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { Building2, LogOut, MessageCircle, MessageSquarePlus, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import * as whatsappApi from '@/api/whatsappApi';
import { apiErrorMessage } from '@/lib/emailInbox';
import { chatTitle, isValidWhatsAppNumber, toWhatsAppNumber } from '@/lib/whatsapp';
import { useWhatsAppSession } from '@/hooks/useWhatsAppSession';
import { useWhatsAppSocket } from '@/hooks/useWhatsAppSocket';
import { WhatsAppConnectCard } from '@/components/whatsapp/WhatsAppConnectCard';
import { WhatsAppThread } from '@/components/whatsapp/WhatsAppThread';
import type { WhatsAppChat, WhatsAppMessage } from '@/types/whatsapp.types';

const timeLabel = (iso: string) => {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { day: 'numeric', month: 'short' });
};

const previewOf = (last: WhatsAppChat['last']) =>
  last.body || (last.mediaKind ? `📎 ${last.mediaKind[0].toUpperCase()}${last.mediaKind.slice(1)}` : '');

/** Chat row built from a live message, for a number not yet in the list. */
const chatFromMessage = (m: WhatsAppMessage): WhatsAppChat => ({
  phone: m.phone,
  unread: 0,
  pushName: m.pushName ?? null,
  lead: null,
  customer: null,
  last: { _id: m._id, body: m.body, direction: m.direction, status: m.status, sentAt: m.sentAt, mediaKind: m.media?.kind ?? null },
});

/**
 * WhatsApp Web inside the system: the employee's own linked number, every chat
 * by mobile number, live. `?phone=2010…` opens a chat directly.
 */
export default function WhatsAppInbox() {
  const { session, loading, busy, connect, logout } = useWhatsAppSession();
  const [params, setParams] = useSearchParams();
  const active = params.get('phone') ?? '';
  const [chats, setChats] = useState<WhatsAppChat[]>([]);
  const [search, setSearch] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [showNew, setShowNew] = useState(false);
  const connected = session?.status === 'connected';

  const loadChats = useCallback(async (q: string) => {
    try {
      const r = await whatsappApi.getWhatsAppChats({ search: q || undefined });
      setChats(r.data);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not load chats'));
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void loadChats(search), 250);
    return () => clearTimeout(t);
  }, [loadChats, search, connected]);

  useWhatsAppSocket({
    onMessage: (m) => {
      setChats((prev) => {
        const existing = prev.find((c) => c.phone === m.phone);
        const row = existing ?? chatFromMessage(m);
        const unread = m.direction === 'inbound' && m.phone !== active ? row.unread + 1 : row.unread;
        const updated: WhatsAppChat = {
          ...row,
          unread,
          pushName: row.pushName ?? m.pushName ?? null,
          last: { _id: m._id, body: m.body, direction: m.direction, status: m.status, sentAt: m.sentAt, mediaKind: m.media?.kind ?? null },
        };
        return [updated, ...prev.filter((c) => c.phone !== m.phone)];
      });
    },
    onAck: (a) =>
      setChats((prev) => prev.map((c) => (c.last._id === a._id ? { ...c, last: { ...c.last, status: a.status } } : c))),
  });

  const open = (phone: string) => {
    setParams({ phone });
    setChats((prev) => prev.map((c) => (c.phone === phone ? { ...c, unread: 0 } : c)));
  };

  const startChat = () => {
    const number = toWhatsAppNumber(newNumber);
    if (!isValidWhatsAppNumber(number)) {
      toast.error('Enter a valid mobile number, e.g. +20 100 123 4567 or 0100 123 4567');
      return;
    }
    setNewNumber('');
    setShowNew(false);
    open(number);
  };

  const confirmLogout = async () => {
    const r = await Swal.fire({
      title: 'Disconnect WhatsApp?',
      text: 'Your number will be unlinked from the system. Your chat history stays here.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Disconnect',
    });
    if (r.isConfirmed) await logout();
  };

  const activeChat = useMemo(() => chats.find((c) => c.phone === active), [chats, active]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-600/20 border-t-green-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center">
            <MessageCircle className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-on-surface">WhatsApp</h1>
            <p className="text-sm text-on-surface-variant">
              {connected
                ? <>Connected as <b>{session?.name || 'you'}</b>{session?.phone ? ` · +${session.phone}` : ''}</>
                : 'Chat with customers from your own WhatsApp number.'}
            </p>
          </div>
        </div>
        {connected && (
          <Button variant="outline" onClick={confirmLogout} disabled={busy} className="gap-2">
            <LogOut className="w-4 h-4" /> Disconnect
          </Button>
        )}
      </div>

      {!connected && <WhatsAppConnectCard session={session} busy={busy} onConnect={connect} />}

      {(connected || chats.length > 0) && (
        <div className="grid md:grid-cols-[340px_1fr] gap-4 h-[calc(100vh-220px)] min-h-[480px]">
          {/* Chat list */}
          <div className={`flex flex-col min-h-0 bg-surface-container-lowest ghost-border rounded-2xl overflow-hidden ${active ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-3 space-y-2 border-b border-black/5">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or number" className="pl-9" />
                </div>
                {connected && (
                  <Button variant="outline" size="icon" onClick={() => setShowNew((v) => !v)} aria-label="New chat" title="New chat">
                    <MessageSquarePlus className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {showNew && (
                <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); startChat(); }}>
                  <Input autoFocus value={newNumber} onChange={(e) => setNewNumber(e.target.value)} placeholder="Mobile number, e.g. +966 5…" />
                  <Button type="submit" className="bg-green-600 hover:bg-green-700 bg-none text-white">Chat</Button>
                </form>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {chats.length === 0 && (
                <p className="text-center text-sm text-on-surface-variant py-10 px-4">
                  {search ? 'No chats match your search.' : 'No chats yet. New messages to your number will appear here.'}
                </p>
              )}
              {chats.map((c) => (
                <button
                  key={c.phone}
                  type="button"
                  onClick={() => open(c.phone)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-surface-container-low transition-colors border-b border-black/5 ${
                    c.phone === active ? 'bg-green-500/10' : ''
                  }`}
                >
                  <span className="w-10 h-10 rounded-full bg-green-500/15 text-green-700 flex items-center justify-center shrink-0">
                    {c.lead || c.customer ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-on-surface truncate">{chatTitle(c)}</span>
                      <span className={`text-[11px] shrink-0 ${c.unread ? 'text-green-600 font-semibold' : 'text-on-surface-variant'}`}>{timeLabel(c.last.sentAt)}</span>
                    </span>
                    <span className="flex items-center justify-between gap-2 mt-0.5">
                      <span dir="auto" className="text-xs text-on-surface-variant truncate">
                        {c.last.direction === 'outbound' ? 'You: ' : ''}{previewOf(c.last)}
                      </span>
                      {c.unread > 0 && (
                        <span className="min-w-5 h-5 px-1.5 rounded-full bg-green-600 text-white text-[11px] font-semibold flex items-center justify-center shrink-0">{c.unread}</span>
                      )}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Conversation */}
          <div className={`flex-col min-h-0 bg-surface-container-lowest ghost-border rounded-2xl overflow-hidden ${active ? 'flex' : 'hidden md:flex'}`}>
            {active ? (
              <>
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-black/5">
                  <div className="min-w-0">
                    <button type="button" className="md:hidden text-xs text-primary mb-1" onClick={() => setParams({})}>← Chats</button>
                    <p className="text-sm font-bold text-on-surface truncate">{activeChat ? chatTitle(activeChat) : `+${active}`}</p>
                    <p className="text-xs text-on-surface-variant">+{active}{activeChat?.pushName ? ` · ${activeChat.pushName}` : ''}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {activeChat?.lead && (
                      <Link to={`/tele-sales/leads/${activeChat.lead._id}`} className="text-xs text-primary hover:underline">Open lead</Link>
                    )}
                    {activeChat?.customer && (
                      <Link to={`/customers/view/${activeChat.customer._id}`} className="text-xs text-primary hover:underline">Open customer</Link>
                    )}
                  </div>
                </div>
                <WhatsAppThread key={active} phone={active} readOnly={!connected} className="flex-1 rounded-none" />
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant gap-2">
                <MessageCircle className="w-10 h-10 opacity-30" />
                <p className="text-sm">Select a chat or start a new one by mobile number.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
