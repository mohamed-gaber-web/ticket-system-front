import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { assignConsultants, reassignConsultants, createAssignment } from '@/redux/slices/assignmentSlice';
import { fetchConsultants } from '@/redux/slices/consultantSlice';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { UserPlus, RefreshCw, CheckCircle2, Loader2, Check } from 'lucide-react';
import type { Consultant } from '@/types/consultant.types';

interface AssignConsultantsDialogProps {
  /** Provide when an assignment record already exists */
  assignmentId?: string;
  /** Provide when no assignment exists yet — will create one first */
  ticketId?: string;
  assignedByConsultantId?: string;
  currentConsultants?: string[];
  mode?: 'assign' | 'reassign';
  onSuccess?: () => void;
}

export function AssignConsultantsDialog({
  assignmentId,
  ticketId,
  assignedByConsultantId,
  currentConsultants = [],
  mode = 'assign',
  onSuccess,
}: AssignConsultantsDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedConsultants, setSelectedConsultants] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const dispatch = useAppDispatch();
  const { consultants, loading: consultantsLoading } = useAppSelector((state) => state.consultants);
  const { loading } = useAppSelector((state) => state.assignments);

  const isReassign = mode === 'reassign';

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setSelectedConsultants([]);
      setNotes('');
      dispatch(fetchConsultants());
    }
    setOpen(nextOpen);
  };

  const handleToggle = (consultantId: string) => {
    setSelectedConsultants((prev) =>
      prev.includes(consultantId)
        ? prev.filter((id) => id !== consultantId)
        : [...prev, consultantId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedConsultants.length === 0) return;

    let resolvedAssignmentId = assignmentId;

    // No assignment record yet — create one first
    if (!resolvedAssignmentId) {
      if (!ticketId || !assignedByConsultantId) return;
      const createResult = await dispatch(
        createAssignment({ ticket: ticketId, assignedByConsultant: assignedByConsultantId })
      );
      if (!createAssignment.fulfilled.match(createResult)) return;
      resolvedAssignmentId = (createResult.payload as any)._id as string;
    }

    const thunk = isReassign
      ? reassignConsultants({ assignmentId: resolvedAssignmentId, consultants: selectedConsultants, notes: notes.trim() || undefined })
      : assignConsultants({ assignmentId: resolvedAssignmentId, consultants: selectedConsultants });

    const result = await dispatch(thunk as any);

    const action = isReassign ? reassignConsultants : assignConsultants;
    if ((action as any).fulfilled.match(result)) {
      setOpen(false);
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {isReassign ? (
          <Button size="sm" variant="outline" className="gap-2 text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700">
            <RefreshCw className="h-3.5 w-3.5" />
            Re-assign
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Assign Consultant
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isReassign ? (
              <>
                <RefreshCw className="h-4 w-4 text-amber-500" />
                Re-assign Consultants
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 text-primary" />
                Assign Consultants
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isReassign
              ? 'Select new consultants to replace the current assignment. An email notification will be sent to each newly assigned consultant.'
              : 'Select one or more consultants to assign to this ticket.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Consultant list */}
          <div className="max-h-[340px] overflow-y-auto space-y-2 py-1 pr-1">
            {consultantsLoading ? (
              <div className="flex items-center justify-center py-10 gap-2 text-on-surface-variant">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading consultants…</span>
              </div>
            ) : consultants.length === 0 ? (
              <div className="text-center py-10 text-sm text-on-surface-variant">No consultants available</div>
            ) : (
              consultants.map((consultant: Consultant) => {
                const isCurrentlyAssigned = currentConsultants.includes(consultant._id);
                const isSelected = selectedConsultants.includes(consultant._id);
                const isDisabled = !isReassign && isCurrentlyAssigned;

                return (
                  <div
                    key={consultant._id}
                    role="checkbox"
                    aria-checked={isSelected}
                    aria-disabled={isDisabled}
                    tabIndex={isDisabled ? -1 : 0}
                    onClick={() => !isDisabled && handleToggle(consultant._id)}
                    onKeyDown={(e) => { if (!isDisabled && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); handleToggle(consultant._id); } }}
                    className={`flex items-center gap-3 p-3 rounded-[0.75rem] border transition-colors select-none ${
                      isDisabled
                        ? 'opacity-50 cursor-not-allowed bg-surface-container-low border-outline-variant/30'
                        : 'cursor-pointer ' + (isSelected
                            ? 'bg-primary/5 border-primary/30'
                            : 'bg-surface-container-lowest border-outline-variant/30 hover:bg-surface-container-low')
                    }`}
                  >
                    {/* Visual-only checkbox — avoids Radix Checkbox's useComposedRefs setState ref callback
                        which triggers "Maximum update depth exceeded" in React 19 during commit phase */}
                    <div className={`h-4 w-4 rounded-[4px] border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-primary border-primary'
                        : 'border-input bg-transparent'
                    } ${isDisabled ? '' : ''}`}>
                      {isSelected && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                    </div>

                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-on-surface">
                          {consultant.firstName} {consultant.lastName}
                        </span>
                        {isCurrentlyAssigned && (
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full ${
                            isReassign
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-primary/10 text-primary'
                          }`}>
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            {isReassign ? 'Currently assigned' : 'Assigned'}
                          </span>
                        )}
                      </div>
                      {consultant.position && (
                        <div className="text-xs text-primary font-medium">{consultant.position}</div>
                      )}
                      <div className="text-xs text-on-surface-variant">{consultant.email}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Notes field — reassign only */}
          {isReassign && (
            <div className="space-y-1.5">
              <label className="form-label">Reason for re-assignment (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Consultant unavailable, escalation…"
                rows={2}
                className="w-full text-sm bg-surface-container-low border border-border rounded-[0.75rem] px-4 py-2.5 text-on-surface placeholder:text-on-surface-variant/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition"
              />
            </div>
          )}

          {/* Summary badge */}
          {selectedConsultants.length > 0 && (
            <div className={`text-xs font-medium px-3 py-2 rounded-[0.5rem] ${
              isReassign
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-primary/5 text-primary border border-primary/20'
            }`}>
              {isReassign
                ? `${selectedConsultants.length} consultant(s) will replace the current assignment — emails will be sent`
                : `${selectedConsultants.length} consultant(s) will be added to this ticket`}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || selectedConsultants.length === 0}
              className={isReassign ? 'bg-amber-500 hover:bg-amber-600 text-white border-0' : ''}
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  {isReassign ? 'Re-assigning…' : 'Assigning…'}
                </>
              ) : isReassign ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Re-assign {selectedConsultants.length > 0 ? `(${selectedConsultants.length})` : ''}
                </>
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                  Assign {selectedConsultants.length > 0 ? `(${selectedConsultants.length})` : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
