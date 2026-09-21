import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as teleSalesApi from '@/api/teleSalesApi';
import type { EmailInboxFilter, EmailInboxResponse, EmailInboxRow } from '@/types/teleSales.types';
import { Button } from '@/components/ui/button';
import { EmailStatusBadge } from '@/components/tele-sales/LeadEmailThread';
import { toast } from 'sonner';
import {
  Mail, RefreshCw, Search, Inbox, Hourglass, Clock, ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Loader2, Paperclip,
} from 'lucide-react';

const FILTERS: { value: EmailInboxFilter; label: string; hint: string }[] = [
  { value: 'all', label: 'All conversations', hint: 'Every lead you have emailed or heard from' },
  { value: 'unread', label: 'Unread replies', hint: 'Leads whose reply nobody has opened yet' },
  { value: 'awaiting_agent', label: 'Needs my reply', hint: 'The lead wrote last — your turn' },
  { value: 'awaiting_lead', label: 'Waiting for lead', hint: 'You wrote last — waiting on them' },
  { value: 'mine', label: 'My emails', hint: 'Conversations I have written in' },
];

const relative = (d?: string | null) => {
  if (!d) return '';
  const mins = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');

/**
 * Email management: every lead conversation in one place — who is waiting on
 * whom, unread replies, and a jump into the lead's thread to answer.
 */
export default function EmailManagement() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<EmailInboxFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<EmailInboxResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await teleSalesApi.getEmailInbox({ filter, search: search || undefined, page, limit: 25 }));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [filter, search, page]);

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const sync = async () => {
    setSyncing(true);
    try {
      const r = await teleSalesApi.syncLeadInbox();
      if (r.data?.filed) toast.success(r.message); else toast.info(r.message);
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not check the mailbox');
    } finally {
      setSyncing(false);
    }
  };

  const totals = data?.totals;
  const rows: EmailInboxRow[] = data?.data ?? [];

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Mail className="w-5 h-5" /></span>
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Email Management</h1>
            <p className="text-sm text-on-surface-variant">All email conversations with leads — replies arrive here automatically.</p>
          </div>
        </div>
        <Button variant="outline" onClick={sync} disabled={syncing} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} /> {syncing ? 'Checking mailbox…' : 'Check for replies'}
        </Button>
      </div>

      {/* Totals */}
      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Tile label="Conversations" value={totals.conversations} icon={<Mail className="w-4 h-4" />} onClick={() => { setFilter('all'); setPage(1); }} active={filter === 'all'} />
          <Tile label="Unread replies" value={totals.unread} icon={<Inbox className="w-4 h-4" />} tone="orange" onClick={() => { setFilter('unread'); setPage(1); }} active={filter === 'unread'} />
          <Tile label="Needs my reply" value={totals.awaitingAgent} icon={<Hourglass className="w-4 h-4" />} tone="yellow" onClick={() => { setFilter('awaiting_agent'); setPage(1); }} active={filter === 'awaiting_agent'} />
          <Tile label="Waiting for lead" value={totals.awaitingLead} icon={<Clock className="w-4 h-4" />} tone="blue" onClick={() => { setFilter('awaiting_lead'); setPage(1); }} active={filter === 'awaiting_lead'} />
        </div>
      )}

      {/* Filters */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-surface-container rounded-lg p-1 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              title={f.hint}
              onClick={() => { setFilter(f.value); setPage(1); }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${filter === f.value ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search company, contact or email…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Conversations */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
        {loading && !data ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-on-surface-variant" /></div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-on-surface-variant">
            <Mail className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm font-medium">No conversations here</p>
            <p className="text-xs mt-1">{FILTERS.find((f) => f.value === filter)?.hint}</p>
          </div>
        ) : (
          <div className={`divide-y divide-outline-variant/15 ${loading ? 'opacity-60' : ''}`}>
            {rows.map((row) => {
              const lead = row.lead;
              if (!lead) return null;
              const last = row.last;
              const lastInbound = last.direction === 'inbound';
              return (
                <button
                  key={lead._id}
                  type="button"
                  onClick={() => navigate(`/tele-sales/leads/${lead._id}?tab=emails`)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-4 hover:bg-surface-container-low transition-colors ${row.unread > 0 ? 'bg-orange-50/40 dark:bg-orange-950/10' : ''}`}
                >
                  <span className={`mt-0.5 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${row.unread > 0 ? 'bg-orange-100 text-orange-800' : 'bg-surface-container text-on-surface-variant'}`}>
                    {(lead.companyName || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm text-on-surface truncate ${row.unread > 0 ? 'font-bold' : 'font-semibold'}`}>{lead.companyName}</span>
                      {lead.contactPersonName && <span className="text-xs text-on-surface-variant truncate">· {lead.contactPersonName}</span>}
                      {row.unread > 0 && <span className="px-1.5 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-bold">{row.unread} new</span>}
                      <span className="ml-auto text-[11px] text-on-surface-variant whitespace-nowrap" title={fmt(row.lastAt)}>{relative(row.lastAt)}</span>
                    </div>
                    <p className="text-sm text-on-surface mt-0.5 truncate">
                      <span className={`inline-flex items-center gap-1 mr-1.5 text-[11px] font-semibold ${lastInbound ? 'text-orange-700' : 'text-primary'}`}>
                        {lastInbound ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                        {lastInbound ? (last.fromName || last.from || 'Lead') : (last.sentByName || 'You')}
                      </span>
                      {last.subject}
                      {last.bodyPreview && <span className="text-on-surface-variant"> — {last.bodyPreview}</span>}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[11px] text-on-surface-variant">
                      <EmailStatusBadge email={last} />
                      <span className="inline-flex items-center gap-1"><ArrowUpRight className="w-3 h-3" /> {row.sent} sent</span>
                      <span className="inline-flex items-center gap-1"><ArrowDownLeft className="w-3 h-3" /> {row.received} received</span>
                      {row.agents.filter(Boolean).length > 0 && <span>· {row.agents.filter(Boolean).join(', ')}</span>}
                      {last.direction === 'inbound' && <Paperclip className="w-3 h-3 opacity-0" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {data && data.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant/20 text-xs text-on-surface-variant">
            <span>Page {data.page} of {data.pages} · {data.total} conversations</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon-sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Tile({ label, value, icon, tone = 'neutral', onClick, active }: {
  label: string; value: number; icon: React.ReactNode; tone?: 'neutral' | 'orange' | 'yellow' | 'blue'; onClick: () => void; active: boolean;
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-surface-container-lowest text-on-surface',
    orange: 'bg-orange-50 dark:bg-orange-950/20 text-orange-800 dark:text-orange-300',
    yellow: 'bg-yellow-50 dark:bg-yellow-950/20 text-yellow-800 dark:text-yellow-300',
    blue: 'bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300',
  };
  return (
    <button type="button" onClick={onClick} className={`rounded-2xl p-4 text-left transition-all ${tones[tone]} ${active ? 'ring-2 ring-primary/40' : 'ring-1 ring-outline-variant/20 hover:ring-primary/30'}`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">{label}</p>
        <span className="opacity-70">{icon}</span>
      </div>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </button>
  );
}
