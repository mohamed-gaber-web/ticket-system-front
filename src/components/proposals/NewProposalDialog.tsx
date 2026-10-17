import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createProposal } from '@/api/proposalApi';
import { getLeads } from '@/api/teleSalesApi';
import type { Lead } from '@/types/teleSales.types';
import { cn } from '@/lib/utils';
import ExistingCustomerStart from './ExistingCustomerStart';

const PICKER_PAGE_SIZE = 50;
const apiError = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

type Source = 'opportunities' | 'customers';
const TABS: [Source, string][] = [
  ['opportunities', 'Opportunities'],
  ['customers', 'Existing customers'],
];

/** Opportunities tab: every opportunity the caller may see, a page at a time ("Load more"). */
function OpportunityPicker({ active }: { active: boolean }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);

  const loadPage = useCallback(async (nextPage: number, search: string) => {
    setLoading(true);
    try {
      const res = await getLeads({ salesType: 'Opportunity', search: search || undefined, page: nextPage, limit: PICKER_PAGE_SIZE });
      setRows((prev) => (nextPage === 1 ? res.data ?? [] : [...prev, ...(res.data ?? [])]));
      setTotal(res.total ?? 0);
      setPage(nextPage);
    } catch (e) {
      toast.error(apiError(e, 'Could not load opportunities'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    const t = window.setTimeout(() => loadPage(1, q), 250);
    return () => window.clearTimeout(t);
  }, [active, q, loadPage]);

  const start = async (lead: Lead) => {
    setCreating(lead._id);
    try {
      const res = await createProposal(lead._id);
      toast.success(`Proposal ${res.data.number} created`);
      navigate(`/proposals/${res.data._id}`);
    } catch (e) {
      toast.error(apiError(e, 'Could not create the proposal'));
    } finally {
      setCreating(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search company, contact or phone"
          aria-label="Search opportunities"
          className="pl-9"
        />
      </div>
      <div className="max-h-80 space-y-1.5 overflow-y-auto">
        {loading && !rows.length ? (
          <p className="flex items-center gap-2 p-3 text-sm text-on-surface-variant">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : rows.length ? (
          rows.map((l) => (
            <button
              key={l._id}
              type="button"
              disabled={Boolean(creating)}
              onClick={() => start(l)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-3 text-left transition-colors hover:border-primary disabled:opacity-60"
            >
              <span className="min-w-0">
                <b className="block truncate text-sm text-on-surface">{l.companyName || l.contactPersonName}</b>
                <small className="block truncate text-xs text-on-surface-variant">
                  {[l.contactPersonName, l.country, l.status].filter(Boolean).join(' · ')}
                </small>
              </span>
              {creating === l._id ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <Plus className="h-4 w-4 shrink-0 text-primary" />}
            </button>
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-outline-variant/60 p-4 text-center text-sm text-on-surface-variant">
            No opportunity found. Convert a lead to an Opportunity in Tele-sales, or start from an existing customer.
          </p>
        )}
        {rows.length > 0 && rows.length < total && (
          <Button type="button" variant="outline" className="w-full" disabled={loading} onClick={() => loadPage(page + 1, q)}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Load more
          </Button>
        )}
      </div>
      {total > 0 && (
        <p className="text-xs text-on-surface-variant">
          Showing {rows.length} of {total} opportunit{total === 1 ? 'y' : 'ies'}
        </p>
      )}
    </div>
  );
}

/** "New proposal": start from an opportunity, or from an existing customer's company + contact. */
export default function NewProposalDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [source, setSource] = useState<Source>('opportunities');

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New proposal</DialogTitle>
          <DialogDescription>
            {source === 'opportunities'
              ? 'Choose the opportunity. Client, entities, interests and users are read from it.'
              : "Choose the customer's company and contact, then one of their open opportunities or a new one."}
          </DialogDescription>
        </DialogHeader>
        <div role="tablist" aria-label="Start from" className="flex border-b border-outline-variant/30">
          {TABS.map(([k, label]) => (
            <button
              key={k}
              id={`new-proposal-tab-${k}`}
              type="button"
              role="tab"
              aria-selected={source === k}
              aria-controls={`new-proposal-panel-${k}`}
              onClick={() => setSource(k)}
              className={cn(
                'border-b-[3px] px-3 py-2 text-sm font-semibold transition-colors',
                source === k ? 'border-accent-orange-500 text-on-surface' : 'border-transparent text-on-surface-variant hover:text-on-surface',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {open &&
          TABS.map(([k]) => (
            <div key={k} id={`new-proposal-panel-${k}`} role="tabpanel" aria-labelledby={`new-proposal-tab-${k}`} hidden={source !== k}>
              {k === 'opportunities' ? <OpportunityPicker active={source === k} /> : <ExistingCustomerStart active={source === k} />}
            </div>
          ))}
      </DialogContent>
    </Dialog>
  );
}
