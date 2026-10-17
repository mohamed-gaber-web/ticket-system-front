import { useState } from 'react';
import { BadgeCheck, BellRing, Loader2, ShieldAlert, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { personName, type Proposal } from '@/types/proposal.types';

const REASON_MAX = 1000;
const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

/** Admin's "Reject" — the reason is required and sent to the author. */
export function RejectProposalDialog({
  open,
  onClose,
  onReject,
}: {
  open: boolean;
  onClose: () => void;
  /** Resolves once the API answered; the dialog closes on success. */
  onReject: (reason: string) => Promise<boolean>;
}) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const trimmed = reason.trim();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmed) return;
    setSaving(true);
    const ok = await onReject(trimmed);
    setSaving(false);
    if (ok) {
      setReason('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="glass sm:max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Reject proposal</DialogTitle>
            <DialogDescription>It goes back to Draft. The author is notified and sees your reason on the proposal.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="proposal-reject-reason">
              Reason <span className="text-error">*</span>
            </Label>
            <Textarea
              id="proposal-reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              maxLength={REASON_MAX}
              required
              aria-required="true"
              aria-describedby="proposal-reject-count"
              placeholder="What needs to change before it can be approved"
              autoFocus
            />
            <p id="proposal-reject-count" className="text-right text-xs text-on-surface-variant">
              {reason.length}/{REASON_MAX}
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={saving || !trimmed}>
              {saving ? <Loader2 className="animate-spin" /> : <XCircle />} Reject
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The approval banner under the builder header (every proposal needs an admin's
 * approval before its PDF / email):
 * - Draft: the last rejection, if any.
 * - Pending approval: "waiting" + Send reminder for the author; Approve / Reject
 *   (with the discount-over-limit note) for an admin.
 */
export function ProposalApprovalBanner({
  proposal,
  canApprove,
  canEdit,
  overLimit,
  maxDiscount,
  busy,
  onRemind,
  onApprove,
  onReject,
}: {
  proposal: Proposal;
  canApprove: boolean;
  canEdit: boolean;
  overLimit: boolean;
  maxDiscount: number;
  busy: boolean;
  onRemind: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  if (proposal.status === 'Draft' && proposal.rejection?.reason) {
    const by = personName(proposal.rejection.by);
    return (
      <div role="status" className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:bg-red-500/10 dark:text-red-200">
        <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="min-w-0 break-words">
          <b>
            Rejected by {by === '—' ? 'an admin' : by}
            {proposal.rejection.at ? ` on ${fmtDate(proposal.rejection.at)}` : ''}:
          </b>{' '}
          {proposal.rejection.reason}
        </p>
      </div>
    );
  }

  if (proposal.status !== 'Pending approval') return null;

  const discountNote = overLimit ? ` The discount is above the ${maxDiscount}% limit.` : '';
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200"
    >
      <ShieldAlert className="h-4 w-4 shrink-0" />
      <p className="min-w-0 flex-1">
        {canApprove
          ? `This proposal is waiting for your approval. Check it, then approve it or send it back with a reason.${discountNote}`
          : `Waiting for an admin's approval. The PDF and email unlock once it is approved.${discountNote}`}
      </p>
      <div className="flex flex-wrap gap-2">
        {canApprove ? (
          <>
            <Button type="button" size="sm" onClick={onApprove} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <BadgeCheck />} Approve
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onReject} disabled={busy}>
              <XCircle /> Reject
            </Button>
          </>
        ) : (
          canEdit && (
            <Button type="button" size="sm" variant="outline" onClick={onRemind} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <BellRing />} Send reminder
            </Button>
          )
        )}
      </div>
    </div>
  );
}
