import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { updateConsultantStatus, removeConsultant } from '@/redux/slices/assignmentSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AssignConsultantsDialog } from './AssignConsultantsDialog';
import { Check, X, Trash2, UserCheck } from 'lucide-react';
import { useState } from 'react';
import type { ConsultantAssignment } from '@/types/assignment.types';

interface ConsultantAssignmentsListProps {
  assignmentId: string;
  consultantAssignments: ConsultantAssignment[];
  currentUserId?: string;
  onUpdate?: () => void;
}

export function ConsultantAssignmentsList({
  assignmentId,
  consultantAssignments,
  currentUserId,
  onUpdate
}: ConsultantAssignmentsListProps) {
  const dispatch = useAppDispatch();
  const { loading } = useAppSelector((state) => state.assignments);
  const [notes, setNotes] = useState<{ [key: string]: string }>({});

  const handleStatusUpdate = async (
    consultantId: string,
    status: 'accepted' | 'declined' | 'completed',
    consultantNotes?: string
  ) => {
    const result = await dispatch(updateConsultantStatus({
      assignmentId,
      consultantId,
      status,
      notes: consultantNotes
    }));

    if (updateConsultantStatus.fulfilled.match(result)) {
      setNotes((prev) => ({ ...prev, [consultantId]: '' }));
      onUpdate?.();
    }
  };

  const handleRemove = async (consultantId: string) => {
    if (confirm('Are you sure you want to remove this consultant from the assignment?')) {
      const result = await dispatch(removeConsultant({ assignmentId, consultantId }));
      if (removeConsultant.fulfilled.match(result)) {
        onUpdate?.();
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { className: string; label: string }> = {
      pending: { className: 'bg-surface-container-high text-on-surface-variant', label: 'Pending' },
      accepted: { className: 'bg-green-500/10 text-green-700', label: 'Accepted' },
      declined: { className: 'bg-error/10 text-error', label: 'Declined' },
      completed: { className: 'bg-primary-fixed text-on-primary-fixed', label: 'Completed' },
    };
    const config = configs[status] || configs.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const currentConsultantIds = consultantAssignments.map((ca) =>
    typeof ca.consultant === 'string' ? ca.consultant : ca.consultant._id
  );

  return (
    <Card className="overflow-hidden p-0">
      <CardHeader className="flex flex-row items-center justify-between bg-surface-container px-6 py-4 m-0">
        <CardTitle className="text-base font-semibold m-0">
          <div className="flex items-center gap-2 text-on-surface">
            <UserCheck className="h-5 w-5 text-on-surface-variant" />
            Assigned Consultants ({consultantAssignments.length})
          </div>
        </CardTitle>
        <AssignConsultantsDialog
          assignmentId={assignmentId}
          currentConsultants={currentConsultantIds}
          onSuccess={onUpdate}
        />
      </CardHeader>
      <CardContent className="p-5">
        {consultantAssignments.length === 0 ? (
          <div className="text-center py-12">
            <UserCheck className="h-12 w-12 mx-auto mb-4 text-on-surface-variant/30" />
            <p className="text-on-surface font-medium mb-1">No consultants assigned yet</p>
            <p className="text-sm text-on-surface-variant">Click "Assign Consultants" to add consultants to this ticket.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {consultantAssignments.map((assignment) => {
              const consultant = typeof assignment.consultant === 'string'
                ? null
                : assignment.consultant;
              const consultantId = typeof assignment.consultant === 'string'
                ? assignment.consultant
                : assignment.consultant._id;
              const isCurrentUser = currentUserId === consultantId;

              return (
                <div key={consultantId} className="rounded-[0.75rem] p-5 bg-surface-container-low hover:bg-surface-container-high transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <h4 className="font-semibold text-on-surface">
                          {consultant
                            ? `${consultant.firstName} ${consultant.lastName}`
                            : 'Consultant'}
                        </h4>
                        {isCurrentUser && (
                          <Badge className="bg-primary-fixed text-on-primary-fixed">
                            You
                          </Badge>
                        )}
                        {getStatusBadge(assignment.status)}
                      </div>
                      {consultant && (
                        <p className="text-sm text-on-surface-variant mb-2">{consultant.email}</p>
                      )}
                      <div className="flex flex-wrap gap-3 text-xs text-on-surface-variant">
                        <span>Assigned: {new Date(assignment.assignedAt).toLocaleDateString()}</span>
                        {assignment.acceptedAt && (
                          <span>· Accepted: {new Date(assignment.acceptedAt).toLocaleDateString()}</span>
                        )}
                        {assignment.completedAt && (
                          <span>· Completed: {new Date(assignment.completedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => handleRemove(consultantId)}
                      disabled={loading}
                      className="text-on-surface-variant hover:text-error"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {assignment.notes && (
                    <div className="mb-3 p-3 bg-primary-fixed/50 rounded-[0.5rem]">
                      <p className="label-technical text-[10px] mb-1">Notes</p>
                      <p className="text-sm text-on-surface">{assignment.notes}</p>
                    </div>
                  )}

                  {isCurrentUser && assignment.status === 'pending' && (
                    <div className="space-y-3 mt-4 pt-4">
                      <div className="h-px bg-surface-container-high -mx-5" />
                      <p className="label-technical text-[10px]">Action Required</p>
                      <Textarea
                        placeholder="Add notes (optional)"
                        value={notes[consultantId] || ''}
                        onChange={(e) =>
                          setNotes((prev) => ({ ...prev, [consultantId]: e.target.value }))
                        }
                        rows={2}
                        className="resize-none"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            handleStatusUpdate(consultantId, 'accepted', notes[consultantId])
                          }
                          disabled={loading}
                          className="gap-1.5 bg-gradient-to-br from-green-500 to-green-600 text-white"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            handleStatusUpdate(consultantId, 'declined', notes[consultantId])
                          }
                          disabled={loading}
                          className="gap-1.5"
                        >
                          <X className="h-3.5 w-3.5" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  )}

                  {isCurrentUser && assignment.status === 'accepted' && (
                    <div className="space-y-3 mt-4 pt-4">
                      <div className="h-px bg-surface-container-high -mx-5" />
                      <p className="label-technical text-[10px]">Mark as Complete</p>
                      <Textarea
                        placeholder="Add completion notes (optional)"
                        value={notes[consultantId] || ''}
                        onChange={(e) =>
                          setNotes((prev) => ({ ...prev, [consultantId]: e.target.value }))
                        }
                        rows={2}
                        className="resize-none"
                      />
                      <Button
                        size="sm"
                        onClick={() =>
                          handleStatusUpdate(consultantId, 'completed', notes[consultantId])
                        }
                        disabled={loading}
                        className="gap-1.5"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Mark Complete
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
