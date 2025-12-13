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
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-gray-100">⏳ Pending</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-green-100 text-green-800">✅ Accepted</Badge>;
      case 'declined':
        return <Badge variant="outline" className="bg-red-100 text-red-800">❌ Declined</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">✅✅ Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const currentConsultantIds = consultantAssignments.map((ca) =>
    typeof ca.consultant === 'string' ? ca.consultant : ca.consultant._id
  );

  return (
    <Card className="shadow-md">
      <CardHeader className="flex flex-row items-center justify-between bg-gray-50 border-b">
        <CardTitle className="text-xl">
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Assigned Consultants ({consultantAssignments.length})
          </div>
        </CardTitle>
        <AssignConsultantsDialog
          assignmentId={assignmentId}
          currentConsultants={currentConsultantIds}
          onSuccess={onUpdate}
        />
      </CardHeader>
      <CardContent className="p-6">
        {consultantAssignments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <UserCheck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No consultants assigned yet</p>
            <p className="text-sm">Click "Assign Consultants" to add consultants to this ticket.</p>
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
                <div key={consultantId} className="border rounded-lg p-5 bg-white hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-lg">
                          {consultant
                            ? `${consultant.firstName} ${consultant.lastName}`
                            : 'Consultant'}
                        </h4>
                        {isCurrentUser && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            You
                          </Badge>
                        )}
                        {getStatusBadge(assignment.status)}
                      </div>
                      {consultant && (
                        <p className="text-sm text-gray-600 mb-2">{consultant.email}</p>
                      )}
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        <span>📅 Assigned: {new Date(assignment.assignedAt).toLocaleDateString()}</span>
                        {assignment.acceptedAt && (
                          <span>✅ Accepted: {new Date(assignment.acceptedAt).toLocaleDateString()}</span>
                        )}
                        {assignment.completedAt && (
                          <span>🎯 Completed: {new Date(assignment.completedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemove(consultantId)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {assignment.notes && (
                    <div className="mb-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm font-semibold text-blue-900 mb-1">💬 Notes:</p>
                      <p className="text-sm text-blue-800">{assignment.notes}</p>
                    </div>
                  )}

                  {isCurrentUser && assignment.status === 'pending' && (
                    <div className="space-y-3 mt-4 pt-4 border-t">
                      <p className="text-sm font-medium text-gray-700">Action Required:</p>
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
                          className="gap-2 bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4" />
                          Accept Assignment
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            handleStatusUpdate(consultantId, 'declined', notes[consultantId])
                          }
                          disabled={loading}
                          className="gap-2"
                        >
                          <X className="h-4 w-4" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  )}

                  {isCurrentUser && assignment.status === 'accepted' && (
                    <div className="space-y-3 mt-4 pt-4 border-t">
                      <p className="text-sm font-medium text-gray-700">Mark as Complete:</p>
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
                        className="gap-2 bg-blue-600 hover:bg-blue-700"
                      >
                        <Check className="h-4 w-4" />
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
