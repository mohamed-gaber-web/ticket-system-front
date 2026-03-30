import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { AppDispatch, RootState } from '@/redux/store';
import {
  fetchAssignmentsByTeamMember,
  fetchAssignmentsByTeam,
  acceptAssignment,
} from '@/redux/slices/assignmentSlice';
import { updateTicket } from '@/redux/slices/ticketSlice';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, Ticket as TicketIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TeamMemberDashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { assignments, loading, error } = useSelector((state: RootState) => state.assignments);
  const { user, userType } = useSelector((state: RootState) => state.auth);

  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted'>('all');

  useEffect(() => {
    // Prefer team-based fetch so member sees team assignments before accepting
    type TeamField = string | { _id?: string; teamName?: string } | undefined;
    const memberId = user?._id;
    const teamField = (user as { team?: TeamField } | null | undefined)?.team;
    const teamId =
      userType === 'team_member'
        ? typeof teamField === 'string'
          ? teamField
          : teamField?._id
        : undefined;

    if (teamId) {
      console.log('🔍 Fetching assignments for team:', teamId, 'member:', memberId);
      dispatch(
        fetchAssignmentsByTeam({
          teamId,
          params: { isCurrent: true },
        })
      );
    } else if (memberId) {
      console.log('🔍 No team found; fallback to member assignments:', memberId);
      dispatch(
        fetchAssignmentsByTeamMember({
          memberId,
          params: { isCurrent: true },
        })
      );
    } else {
      console.warn('⚠️ No user ID found - cannot fetch assignments');
    }
  }, [dispatch, user, userType]);

  const handleAccept = async (assignmentId: string) => {
    if (!user?._id) return;

    try {
      await dispatch(
        acceptAssignment({
          assignmentId,
          teamMemberId: user._id,
        })
      ).unwrap();

      // Refresh the assignments list
      dispatch(
        fetchAssignmentsByTeamMember({
          memberId: user._id,
          params: { isCurrent: true },
        })
      );
    } catch (error) {
      console.error('Failed to accept assignment:', error);
    }
  };

  const filteredAssignments = assignments.filter((assignment) => {
    if (filter === 'pending') return !assignment.acceptedBy;
    if (filter === 'accepted') return assignment.acceptedBy;
    return true;
  });

  const pendingCount = assignments.filter((a) => !a.acceptedBy).length;
  const acceptedCount = assignments.filter((a) => a.acceptedBy).length;

  const getTeamContext = () => {
    type TeamField = string | { _id?: string; teamName?: string } | undefined;
    const memberId = user?._id;
    const teamField = (user as { team?: TeamField } | null | undefined)?.team;
    const teamId =
      userType === 'team_member'
        ? typeof teamField === 'string'
          ? teamField
          : teamField?._id
        : undefined;
    return { memberId, teamId };
  };

  const refreshAssignments = () => {
    const { memberId, teamId } = getTeamContext();
    if (teamId) {
      dispatch(fetchAssignmentsByTeam({ teamId, params: { isCurrent: true } }));
    } else if (memberId) {
      dispatch(fetchAssignmentsByTeamMember({ memberId, params: { isCurrent: true } }));
    }
  };

  const handleMarkResolved = async (ticketId?: string) => {
    if (!ticketId) return;
    try {
      await dispatch(updateTicket({ id: ticketId, data: { status: 'resolved' } })).unwrap();
      refreshAssignments();
    } catch (err) {
      console.error('Failed to mark ticket resolved:', err);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const priorityStyles = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-green-100 text-green-800 border-green-200',
    };

    return (
      <Badge
        variant="outline"
        className={priorityStyles[priority as keyof typeof priorityStyles] || priorityStyles.medium}
      >
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      new: 'bg-brand-100 text-brand-800',
      assigned: 'bg-accent-orange-100 text-purple-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-surface-container text-on-surface',
    };

    const displayStatus = status.replace('_', ' ');

    return (
      <Badge className={statusStyles[status as keyof typeof statusStyles] || statusStyles.new}>
        {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">My Assignments</h1>
        <p className="text-on-surface-variant">View and manage your ticket assignments</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-on-surface-variant">Total Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignments.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-on-surface-variant">Pending Acceptance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-on-surface-variant">Accepted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{acceptedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          All ({assignments.length})
        </Button>
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          onClick={() => setFilter('pending')}
        >
          <Clock className="w-4 h-4 mr-2" />
          Pending ({pendingCount})
        </Button>
        <Button
          variant={filter === 'accepted' ? 'default' : 'outline'}
          onClick={() => setFilter('accepted')}
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Accepted ({acceptedCount})
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <p className="font-semibold">Error loading assignments:</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Assignments Table */}
      <div className="rounded-[1rem] border bg-surface-container-lowest shadow-sm">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-500 text-lg mb-2">Failed to load assignments</div>
            <p className="text-on-surface-variant text-sm">Please check the console for more details</p>
            <Button
              onClick={() => {
                if (user?._id) {
                  dispatch(
                    fetchAssignmentsByTeamMember({
                      memberId: user._id,
                      params: { isCurrent: true },
                    })
                  );
                }
              }}
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="text-center py-12">
            <TicketIcon className="mx-auto h-12 w-12 text-on-surface-variant/60 mb-4" />
            <p className="text-on-surface-variant text-lg">No assignments found</p>
            <p className="text-on-surface-variant text-sm mt-2">
              {filter === 'pending'
                ? 'You have no pending assignments'
                : filter === 'accepted'
                ? 'You have not accepted any assignments yet'
                : 'You have no current assignments'}
            </p>
            <p className="text-on-surface-variant/60 text-xs mt-4">
              Assignments will appear here when a consultant assigns tickets to your team
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-surface-container-low">
                <TableHead className="font-semibold">Ticket #</TableHead>
                <TableHead className="font-semibold">Subject</TableHead>
                <TableHead className="font-semibold">Priority</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Assigned At</TableHead>
                <TableHead className="font-semibold">Notes</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssignments.map((assignment) => {
                  const ticket = assignment.ticket;
                  const ticketNumber = ticket?.ticketNumber ?? 'N/A';
                  const ticketId = ticket?._id;
                  return (
                <TableRow
                  key={assignment._id}
                  className="hover:bg-surface-container-highest transition-colors cursor-pointer"
                  onClick={() => ticketId && navigate(`/tickets/${ticketId}`)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-orange-500 flex items-center justify-center text-white font-semibold text-xs">
                        {ticketNumber.split('-')[0]}
                      </div>
                      <span>{ticketNumber}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{ticket?.subject ?? 'No subject'}</p>
                    <p className="text-xs text-on-surface-variant mt-1">
                      Assigned by:{' '}
                      {`${assignment.assignedByConsultant?.firstName ?? ''} ${assignment.assignedByConsultant?.lastName ?? ''}`.trim() ||
                        'Unknown'}
                    </p>
                  </TableCell>
                  <TableCell>{ticket ? getPriorityBadge(ticket.priority) : '-'}</TableCell>
                  <TableCell>{ticket ? getStatusBadge(ticket.status) : '-'}</TableCell>
                  <TableCell className="text-on-surface-variant">
                    {new Date(assignment.assignedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="truncate text-sm text-on-surface-variant">
                      {assignment.assignmentNotes || '-'}
                    </p>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    {assignment.acceptedBy ? (
                      <div className="flex items-center justify-end gap-2">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Accepted
                        </Badge>
                        {assignment.ticket?.status !== 'resolved' && (
                          <Button size="sm" variant="outline" onClick={() => handleMarkResolved(ticketId)}>
                            Mark Resolved
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleAccept(assignment._id)}
                      >
                        Accept
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
