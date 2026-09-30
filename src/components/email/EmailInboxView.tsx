import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { EmailInboxRow } from '@/types/teleSales.types';
import { Button } from '@/components/ui/button';
import { EmailStatusBadge } from '@/components/tele-sales/LeadEmailThread';
import { toast } from 'sonner';
import { apiErrorMessage } from '@/lib/emailInbox';
import {
  Mail, RefreshCw, Search, Inbox, Hourglass, Clock, ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Loader2,
} from 'lucide-react';

/** The conversation fields every email inbox row carries, whatever it hangs off. */
export type InboxRowBase = Omit<EmailInboxRow, 'lead'>;

export interface InboxResponse<Row extends InboxRowBase> {
  success: boolean;
  total: number;
  page: number;
  pages: number;
  totals: { conversations: number; unread: number; awaitingAgent: number; awaitingLead: number };
  data: Row[];
}

export interface InboxFilter<F extends string> {
  value: F;
  label: string;
  hint: string;
}

/** What one row shows and where clicking it goes. */
export interface InboxRowView {
  key: string;
  title: string;
  subtitle?: string;
  /** Small monospace tag before the title (a ticket number). */
  tag?: string;
  avatar: string;
  href: string;
}

interface EmailInboxViewProps<Row extends InboxRowBase, F extends string> {
  title: string;
  description: string;
  searchPlaceholder: string;
  /** Who is on the other end — 'lead' or 'customer'. */
  contactNoun: string;
  filters: InboxFilter<F>[];
  /** The filter values behind the four total tiles. */
  tileFilters: { all: F; unread: F; awaitingAgent: F; awaitingContact: F };
  load: (params: { filter: F; search?: string; page: number; limit: number }) => Promise<InboxResponse<Row>>;
  sync: () => Promise<{ message: string; data?: { filed?: number } }>;
  /** null skips a row whose parent record has gone. */
  viewOf: (row: Row) => InboxRowView | null;
}

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
 * Email management: every conversation in one place — who is waiting on whom,
 * unread replies, and a jump into the record's thread to answer. Shared by the
 * tele-sales (leads) and ticketing (tickets) inboxes; each page only says how
 * to load its rows and what a row shows.
 */
export function EmailInboxView<Row extends InboxRowBase, F extends string>({
  title, description, searchPlaceholder, contactNoun, filters, tileFilters, load: loadPage, sync: syncMailbox, viewOf,
}: EmailInboxViewProps<Row, F>) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<F>(tileFilters.all);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<InboxResponse<Row> | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const Contact = contactNoun.charAt(0).toUpperCase() + contactNoun.slice(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await loadPage({ filter, search: search || undefined, page, limit: 25 }));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to load conversations'));
    } finally {
      setLoading(false);
    }
  }, [loadPage, filter, search, page]);

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const sync = async () => {
    setSyncing(true);
    try {
      const r = await syncMailbox();
      if (r.data?.filed) toast.success(r.message); else toast.info(r.message);
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not check the mailbox'));
    } finally {
      setSyncing(false);
    }
  };

  const pick = (f: F) => { setFilter(f); setPage(1); };
  const totals = data?.totals;
  const rows: Row[] = data?.data ?? [];

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Mail className="w-5 h-5" /></span>
          <div>
            <h1 className="text-2xl font-bold text-on-surface">{title}</h1>
            <p className="text-sm text-on-surface-variant">{description}</p>
          </div>
        </div>
        <Button variant="outline" onClick={sync} disabled={syncing} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} /> {syncing ? 'Checking mailbox…' : 'Check for replies'}
        </Button>
      </div>

      {/* Totals */}
      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Tile label="Conversations" value={totals.conversations} icon={<Mail className="w-4 h-4" />} onClick={() => pick(tileFilters.all)} active={filter === tileFilters.all} />
          <Tile label="Unread replies" value={totals.unread} icon={<Inbox className="w-4 h-4" />} tone="orange" onClick={() => pick(tileFilters.unread)} active={filter === tileFilters.unread} />
          <Tile label="Needs my reply" value={totals.awaitingAgent} icon={<Hourglass className="w-4 h-4" />} tone="yellow" onClick={() => pick(tileFilters.awaitingAgent)} active={filter === tileFilters.awaitingAgent} />
          <Tile label={`Waiting for ${contactNoun}`} value={totals.awaitingLead} icon={<Clock className="w-4 h-4" />} tone="blue" onClick={() => pick(tileFilters.awaitingContact)} active={filter === tileFilters.awaitingContact} />
        </div>
      )}

      {/* Filters */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-surface-container rounded-lg p-1 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              title={f.hint}
              onClick={() => pick(f.value)}
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
            placeholder={searchPlaceholder}
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
            <p className="text-xs mt-1">{filters.find((f) => f.value === filter)?.hint}</p>
          </div>
        ) : (
          <div className={`divide-y divide-outline-variant/15 ${loading ? 'opacity-60' : ''}`}>
            {rows.map((row) => {
              const view = viewOf(row);
              if (!view) return null;
              const last = row.last;
              const lastInbound = last.direction === 'inbound';
              return (
                <button
                  key={view.key}
                  type="button"
                  onClick={() => navigate(view.href)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-4 hover:bg-surface-container-low transition-colors ${row.unread > 0 ? 'bg-orange-50/40 dark:bg-orange-950/10' : ''}`}
                >
                  <span className={`mt-0.5 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${row.unread > 0 ? 'bg-orange-100 text-orange-800' : 'bg-surface-container text-on-surface-variant'}`}>
                    {view.avatar}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {view.tag && <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant">{view.tag}</span>}
                      <span className={`text-sm text-on-surface truncate ${row.unread > 0 ? 'font-bold' : 'font-semibold'}`}>{view.title}</span>
                      {view.subtitle && <span className="text-xs text-on-surface-variant truncate">· {view.subtitle}</span>}
                      {row.unread > 0 && <span className="px-1.5 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-bold">{row.unread} new</span>}
                      <span className="ml-auto text-[11px] text-on-surface-variant whitespace-nowrap" title={fmt(row.lastAt)}>{relative(row.lastAt)}</span>
                    </div>
                    <p className="text-sm text-on-surface mt-0.5 truncate">
                      <span className={`inline-flex items-center gap-1 mr-1.5 text-[11px] font-semibold ${lastInbound ? 'text-orange-700' : 'text-primary'}`}>
                        {lastInbound ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                        {lastInbound ? (last.fromName || last.from || Contact) : (last.sentByName || 'You')}
                      </span>
                      {last.subject}
                      {last.bodyPreview && <span className="text-on-surface-variant"> — {last.bodyPreview}</span>}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[11px] text-on-surface-variant">
                      <EmailStatusBadge email={last} contactNoun={contactNoun} />
                      <span className="inline-flex items-center gap-1"><ArrowUpRight className="w-3 h-3" /> {row.sent} sent</span>
                      <span className="inline-flex items-center gap-1"><ArrowDownLeft className="w-3 h-3" /> {row.received} received</span>
                      {row.agents.filter(Boolean).length > 0 && <span>· {row.agents.filter(Boolean).join(', ')}</span>}
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
