import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FileSignature, Loader2, Plus, Search, Settings2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createProposal, getProposals } from '@/api/proposalApi';
import { getLeads } from '@/api/teleSalesApi';
import { formatUsd } from '@/lib/proposalMath';
import { useAccess } from '@/redux/hooks/useAccess';
import type { Lead } from '@/types/teleSales.types';
import { personName, type ProposalStatus, type ProposalSummary } from '@/types/proposal.types';
import ProposalStatusBadge from '@/components/proposals/ProposalStatusBadge';
import { NativeSelect } from '@/components/proposals/builderUi';

const STATUSES: ProposalStatus[] = ['Draft', 'Pending approval', 'Approved', 'Sent', 'Accepted', 'Rejected'];
const PAGE_SIZE = 20;
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const apiError = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

/** Pick an opportunity to start a proposal from (proposals are always built from one). */
function NewProposalDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await getLeads({ salesType: 'Opportunity', search: q || undefined, limit: 20 });
        setRows(res.data ?? []);
      } catch (e) {
        toast.error(apiError(e, 'Could not load opportunities'));
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [open, q]);

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
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New proposal</DialogTitle>
          <DialogDescription>Choose the opportunity. Client, entities, interests and users are read from it.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search company, contact or phone" className="pl-9" />
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
              No opportunity found. Convert a lead to an Opportunity in Tele-sales first.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ProposalsList() {
  const { canManageProposals } = useAccess();
  const [rows, setRows] = useState<ProposalSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<ProposalStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProposals({ q: q || undefined, status, page, limit: PAGE_SIZE });
      setRows(res.data);
      setTotal(res.total);
    } catch (e) {
      toast.error(apiError(e, 'Could not load proposals'));
    } finally {
      setLoading(false);
    }
  }, [q, status, page]);

  useEffect(() => {
    const t = window.setTimeout(load, 250);
    return () => window.clearTimeout(t);
  }, [load]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display-sm text-on-surface">Proposals</h1>
          <p className="mt-1 text-on-surface-variant">Business proposals built from opportunities — scope, pricing, terms and a branded PDF.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageProposals && (
            <Button asChild variant="outline">
              <Link to="/proposals/price-list">
                <Settings2 /> Price list
              </Link>
            </Button>
          )}
          <Button onClick={() => setCreating(true)}>
            <Plus /> New proposal
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-[1rem] bg-surface-container-lowest p-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search number or client"
            className="pl-9"
          />
        </div>
        <NativeSelect
          className="md:w-56"
          value={status}
          ariaLabel="Filter by status"
          onChange={(v) => {
            setStatus(v as ProposalStatus | '');
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="overflow-hidden rounded-[1rem] bg-surface-container-lowest">
        {loading && !rows.length ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-container-low" />
            ))}
          </div>
        ) : !rows.length ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="rounded-full bg-surface-container-high p-4 text-on-surface-variant">
              <FileSignature className="h-6 w-6" />
            </span>
            <p className="font-semibold text-on-surface">{q || status ? 'No proposal matches these filters' : 'No proposals yet'}</p>
            <p className="max-w-sm text-sm text-on-surface-variant">Start one from an opportunity with “New proposal”, or from the Proposals tab of an opportunity.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-outline-variant/30 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  <th className="px-4 py-3">Proposal</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Prepared by</th>
                  <th className="px-4 py-3 text-right">Grand total</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {rows.map((p) => (
                  <tr key={p._id} className="transition-colors hover:bg-surface-container-low">
                    <td className="px-4 py-3">
                      <Link to={`/proposals/${p._id}`} className="font-semibold text-primary hover:underline">
                        {p.number}
                      </Link>
                      <span className="block text-xs text-on-surface-variant">Version {p.version}</span>
                    </td>
                    <td className="px-4 py-3 text-on-surface">{p.client}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{fmtDate(p.presentedDate)}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{personName(p.preparedBy)}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-on-surface">{formatUsd(p.totals?.grand ?? 0)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <ProposalStatusBadge status={p.status} />
                        {p.needsApproval && p.status !== 'Pending approval' && (
                          <span title="Discount needs approval" className="text-amber-600">
                            <ShieldAlert className="h-4 w-4" />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-between gap-2 border-t border-outline-variant/30 px-4 py-3 text-sm">
            <span className="text-on-surface-variant">
              {total} proposals · page {page} of {pages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((n) => n + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <NewProposalDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
