import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { CopyPlus, FileSignature, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createProposal, deleteProposal, getOpportunityProposals } from '@/api/proposalApi';
import { formatUsd } from '@/lib/proposalMath';
import { personName, type ProposalSummary } from '@/types/proposal.types';
import { useAccess } from '@/redux/hooks/useAccess';
import ProposalStatusBadge, { NeedsYourApproval } from './ProposalStatusBadge';

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const apiError = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

/**
 * The Proposals tab of an opportunity (PROPOSAL_BUILDER_SPEC.md §5.1): its
 * versions, "Create proposal", and "New version" per row.
 */
export default function LeadProposalsTab({
  leadId,
  isOpportunity,
  canCreate,
  onCount,
}: {
  leadId: string;
  isOpportunity: boolean;
  canCreate: boolean;
  onCount?: (n: number) => void;
}) {
  const navigate = useNavigate();
  const { isAdmin } = useAccess();
  const [rows, setRows] = useState<ProposalSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getOpportunityProposals(leadId);
      setRows(res.data);
      onCount?.(res.data.length);
    } catch (e) {
      toast.error(apiError(e, 'Could not load proposals'));
    } finally {
      setLoading(false);
    }
  }, [leadId, onCount]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (fromProposalId?: string) => {
    setBusy(fromProposalId ?? 'new');
    try {
      const res = await createProposal(leadId, fromProposalId);
      toast.success(`Proposal ${res.data.number} created`);
      navigate(`/proposals/${res.data._id}`);
    } catch (e) {
      toast.error(apiError(e, 'Could not create the proposal'));
    } finally {
      setBusy(null);
    }
  };

  // Only draft proposals the caller authored (or manages) can be deleted — the
  // API decides and sends `permissions.delete`.
  const remove = async (p: ProposalSummary) => {
    const confirmed = await Swal.fire({
      title: `Delete proposal ${p.number}?`,
      text: 'This permanently deletes this draft proposal. This cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#ef4444',
    });
    if (!confirmed.isConfirmed) return;
    setRemoving(p._id);
    try {
      await deleteProposal(p._id);
      toast.success(`Deleted ${p.number}`);
      setRows((cur) => {
        const next = cur.filter((r) => r._id !== p._id);
        onCount?.(next.length);
        return next;
      });
    } catch (e) {
      toast.error(apiError(e, 'Could not delete the proposal'));
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileSignature className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-on-surface">Proposals</h3>
        </div>
        {isOpportunity && canCreate && (
          <Button size="sm" onClick={() => create()} disabled={Boolean(busy)}>
            {busy === 'new' ? <Loader2 className="animate-spin" /> : <Plus />} Create proposal
          </Button>
        )}
      </div>

      {!isOpportunity && (
        <p className="rounded-xl bg-surface-container-low p-3 text-sm text-on-surface-variant">
          Proposals are built from opportunities. Convert this lead to an Opportunity first.
        </p>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-container-low" />
          ))}
        </div>
      ) : rows.length ? (
        <ul className="divide-y divide-outline-variant/20">
          {rows.map((p) => (
            <li key={p._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <Link to={`/proposals/${p._id}`} className="font-semibold text-primary hover:underline">
                  {p.number}
                </Link>
                <p className="text-xs text-on-surface-variant">
                  {fmtDate(p.presentedDate)} · {personName(p.preparedBy)} · <b className="text-on-surface">{formatUsd(p.totals?.grand ?? 0)}</b>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ProposalStatusBadge status={p.status} />
                {isAdmin && p.status === 'Pending approval' && <NeedsYourApproval overLimit={p.discountOverLimit} />}
                {canCreate && isOpportunity && (
                  <Button variant="outline" size="sm" onClick={() => create(p._id)} disabled={Boolean(busy)} title="Copy this proposal into a new version">
                    {busy === p._id ? <Loader2 className="animate-spin" /> : <CopyPlus />} New version
                  </Button>
                )}
                {(p.permissions?.delete || isAdmin) && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-on-surface-variant hover:text-error"
                    aria-label={`Delete proposal ${p.number}`}
                    title="Delete this proposal"
                    disabled={removing === p._id}
                    onClick={() => remove(p)}
                  >
                    {removing === p._id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        isOpportunity && <p className="text-sm text-on-surface-variant">No proposal yet.{canCreate ? ' Create the first one from this opportunity.' : ''}</p>
      )}
    </div>
  );
}
