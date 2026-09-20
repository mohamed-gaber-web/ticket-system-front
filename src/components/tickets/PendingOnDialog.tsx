import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getPendingCandidates, type PendingCandidate } from '@/api/ticketApi';
import { Hourglass, Loader2, Mail, Check, Search } from 'lucide-react';

interface PendingOnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
  /** Pre-selected person (current pendingOn or the ticket's customer). */
  initialId?: string | null;
  saving?: boolean;
  /** Called with the chosen customer-user id. */
  onConfirm: (pendingOn: string) => void;
}

/**
 * Asked when a ticket is moved to "Customer Pending": which customer user is
 * the ticket waiting on? Lists everyone in the ticket's company, with the
 * ticket's own customer first and selected by default.
 */
export function PendingOnDialog({ open, onOpenChange, ticketId, initialId, saving = false, onConfirm }: PendingOnDialogProps) {
  const [people, setPeople] = useState<PendingCandidate[]>([]);
  const [ticketCustomer, setTicketCustomer] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string>('');
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setQ('');
    getPendingCandidates(ticketId)
      .then((res) => {
        if (cancelled) return;
        setPeople(res.data);
        setTicketCustomer(res.ticketCustomer);
        setSelected(initialId && res.data.some((p) => p._id === initialId) ? initialId : res.ticketCustomer);
      })
      .catch(() => { if (!cancelled) setPeople([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, ticketId, initialId]);

  const filtered = people.filter((p) => {
    const s = q.trim().toLowerCase();
    return !s || `${p.contactPerson} ${p.email} ${p.companyName}`.toLowerCase().includes(s);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hourglass className="w-5 h-5 text-purple-600" />
            Who is this ticket waiting on?
          </DialogTitle>
          <p className="text-xs text-on-surface-variant mt-1">
            The ticket will be marked <span className="font-semibold">Customer Pending</span> and everyone will see whose reply we're waiting for.
          </p>
        </DialogHeader>

        {people.length > 5 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-outline-variant bg-surface text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        )}

        <div className="max-h-72 overflow-y-auto -mx-1 px-1 space-y-1">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-on-surface-variant" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-on-surface-variant text-center py-8">No customer users found for this company.</p>
          ) : filtered.map((p) => {
            const active = p._id === selected;
            return (
              <button
                key={p._id}
                type="button"
                onClick={() => setSelected(p._id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors ${
                  active ? 'border-primary bg-primary/5' : 'border-outline-variant/40 hover:bg-surface-container-low'
                }`}
              >
                <span className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  active ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'
                }`}>
                  {(p.contactPerson || p.email || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-on-surface truncate">
                    {p.contactPerson || p.email}
                    {p._id === ticketCustomer && <span className="ml-2 text-[10px] font-bold uppercase text-primary">Ticket owner</span>}
                  </span>
                  <span className="block text-xs text-on-surface-variant truncate flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {p.email}
                    {p.role && <span className="opacity-70">· {p.role.replace('_', ' ')}</span>}
                  </span>
                </span>
                {active && <Check className="w-4 h-4 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button type="button" onClick={() => selected && onConfirm(selected)} disabled={saving || !selected}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Hourglass className="w-4 h-4 mr-2" />}
            Mark as pending
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Small "Waiting on …" line shown wherever a customer_pending ticket appears. */
export function PendingOnLine({ ticket, compact = false }: {
  ticket: { status: string; pendingOn?: any; pendingSince?: string | null; pendingBy?: any; customer?: any };
  compact?: boolean;
}) {
  if (ticket.status !== 'customer_pending') return null;
  const person = ticket.pendingOn && typeof ticket.pendingOn === 'object' ? ticket.pendingOn
    : ticket.customer && typeof ticket.customer === 'object' ? ticket.customer : null;
  const name = person?.contactPerson || person?.email || person?.companyName || 'customer';
  const by = ticket.pendingBy && typeof ticket.pendingBy === 'object' ? `${ticket.pendingBy.firstName ?? ''} ${ticket.pendingBy.lastName ?? ''}`.trim() : '';
  const since = ticket.pendingSince
    ? new Date(ticket.pendingSince).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;
  const days = ticket.pendingSince ? Math.floor((Date.now() - new Date(ticket.pendingSince).getTime()) / 86_400_000) : null;

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-purple-700 dark:text-purple-300" title={`Waiting on ${name}${person?.email ? ` (${person.email})` : ''}${since ? ` since ${since}` : ''}${by ? ` · set by ${by}` : ''}`}>
        <Hourglass className="w-3 h-3 shrink-0" />
        <span className="truncate max-w-[10rem] font-medium">{name}</span>
        {days != null && days > 0 && <span className="opacity-70">· {days}d</span>}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-purple-200 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-900 px-3 py-2 text-sm">
      <Hourglass className="w-4 h-4 text-purple-600 shrink-0" />
      <span className="text-purple-900 dark:text-purple-200">
        Waiting on <span className="font-bold">{name}</span>
        {person?.email && <span className="opacity-80"> · {person.email}</span>}
        {since && <span className="opacity-80"> · since {since}{days != null && days > 0 ? ` (${days} day${days === 1 ? '' : 's'})` : ''}</span>}
        {by && <span className="opacity-80"> · set by {by}</span>}
      </span>
    </div>
  );
}
