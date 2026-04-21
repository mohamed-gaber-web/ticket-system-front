import { useState, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { assignConsultants, reassignConsultants, createAssignment } from '@/redux/slices/assignmentSlice';
import { fetchConsultants } from '@/redux/slices/consultantSlice';
import { Button } from '@/components/ui/button';
import { UserPlus, RefreshCw, CheckCircle2, Loader2, Check, ChevronDown } from 'lucide-react';
import type { Consultant } from '@/types/consultant.types';

interface AssignConsultantsDialogProps {
  assignmentId?: string;
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
  const containerRef = useRef<HTMLDivElement>(null);

  const dispatch = useAppDispatch();
  const { consultants, loading: consultantsLoading } = useAppSelector((state) => state.consultants);
  const { loading } = useAppSelector((state) => state.assignments);

  const isReassign = mode === 'reassign';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = () => {
    setSelectedConsultants(isReassign ? [...currentConsultants] : []);
    setNotes('');
    dispatch(fetchConsultants({ limit: 500 }));
    setOpen(true);
  };

  const handleToggle = (consultantId: string) => {
    setSelectedConsultants((prev) =>
      prev.includes(consultantId)
        ? prev.filter((id) => id !== consultantId)
        : [...prev, consultantId]
    );
  };

  const handleSubmit = async () => {
    if (selectedConsultants.length === 0) return;
    try {
      let resolvedAssignmentId = assignmentId;
      if (!resolvedAssignmentId) {
        if (!ticketId || !assignedByConsultantId) return;
        const created = await dispatch(
          createAssignment({ ticket: ticketId, assignedByConsultant: assignedByConsultantId })
        ).unwrap();
        resolvedAssignmentId = (created as any)._id as string;
      }

      if (isReassign) {
        await dispatch(
          reassignConsultants({ assignmentId: resolvedAssignmentId!, consultants: selectedConsultants, notes: notes.trim() || undefined })
        ).unwrap();
      } else {
        await dispatch(
          assignConsultants({ assignmentId: resolvedAssignmentId!, consultants: selectedConsultants })
        ).unwrap();
      }

      setOpen(false);
      onSuccess?.();
    } catch {
      // Error toast already shown by the slice
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        className={`flex items-center gap-2 h-8 px-3 rounded-[0.5rem] border text-sm font-medium transition-colors ${
          isReassign
            ? 'border-amber-200 text-amber-600 hover:bg-amber-50 hover:text-amber-700'
            : 'border-border text-on-surface hover:bg-surface-container-high'
        }`}
      >
        {isReassign
          ? <RefreshCw className="h-3.5 w-3.5" />
          : <UserPlus className="h-3.5 w-3.5" />
        }
        {isReassign ? 'Re-assign' : 'Assign Consultant'}
        <ChevronDown className="h-3.5 w-3.5 text-on-surface-variant" />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-80 rounded-[0.75rem] bg-surface-container-lowest border border-border shadow-ambient z-50 flex flex-col">
          {/* Header */}
          <div className="px-4 pt-4 pb-3 border-b border-border">
            <p className="text-sm font-semibold text-on-surface flex items-center gap-2">
              {isReassign
                ? <><RefreshCw className="h-3.5 w-3.5 text-amber-500" /> Re-assign Consultants</>
                : <><UserPlus className="h-3.5 w-3.5 text-primary" /> Assign Consultants</>
              }
            </p>
            <p className="text-xs text-on-surface-variant mt-1">
              {isReassign
                ? 'Select new consultants to replace the current assignment.'
                : 'Select one or more consultants to assign.'}
            </p>
          </div>

          {/* Consultant list */}
          <div className="max-h-[280px] overflow-y-auto p-2 space-y-1">
            {consultantsLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-on-surface-variant">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading…</span>
              </div>
            ) : consultants.length === 0 ? (
              <div className="text-center py-8 text-sm text-on-surface-variant">No consultants available</div>
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
                    onKeyDown={(e) => {
                      if (!isDisabled && (e.key === ' ' || e.key === 'Enter')) {
                        e.preventDefault();
                        handleToggle(consultant._id);
                      }
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-[0.625rem] border transition-colors select-none ${
                      isDisabled
                        ? 'opacity-50 cursor-not-allowed bg-surface-container-low border-transparent'
                        : isSelected
                          ? 'bg-primary/5 border-primary/20 cursor-pointer'
                          : 'bg-transparent border-transparent hover:bg-surface-container-high cursor-pointer'
                    }`}
                  >
                    <div className={`h-4 w-4 rounded-[4px] border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected ? 'bg-primary border-primary' : 'border-input bg-transparent'
                    }`}>
                      {isSelected && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium text-on-surface truncate">
                          {consultant.firstName} {consultant.lastName}
                        </span>
                        {isCurrentlyAssigned && (
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                            isReassign ? 'bg-amber-100 text-amber-700' : 'bg-primary/10 text-primary'
                          }`}>
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            {isReassign ? 'Current' : 'Assigned'}
                          </span>
                        )}
                      </div>
                      {consultant.position && (
                        <p className="text-[11px] text-primary font-medium truncate">{consultant.position}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Notes — reassign only */}
          {isReassign && (
            <div className="px-3 pb-2">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reason for re-assignment (optional)"
                rows={2}
                className="w-full text-xs bg-surface-container-low border border-border rounded-[0.625rem] px-3 py-2 text-on-surface placeholder:text-on-surface-variant/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition"
              />
            </div>
          )}

          {/* Footer */}
          <div className="px-3 pb-3 flex items-center justify-between gap-2 border-t border-border pt-3">
            <span className="text-xs text-on-surface-variant">
              {selectedConsultants.length > 0
                ? `${selectedConsultants.length} selected`
                : 'None selected'}
            </span>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={loading || selectedConsultants.length === 0}
                onClick={handleSubmit}
                className={isReassign ? 'bg-amber-500 hover:bg-amber-600 text-white border-0' : ''}
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isReassign ? (
                  <><RefreshCw className="h-3.5 w-3.5 mr-1" /> Re-assign</>
                ) : (
                  <><UserPlus className="h-3.5 w-3.5 mr-1" /> Assign</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
