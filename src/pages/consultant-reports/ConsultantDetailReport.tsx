import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, User, Calendar, Activity } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../redux/hooks/hooks';
import { fetchConsultantById, clearCurrentConsultant } from '../../redux/slices/consultantSlice';
import { fetchAssignments } from '../../redux/slices/assignmentSlice';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/utils';

export default function ConsultantDetailReport() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { currentConsultant, loading } = useAppSelector((state) => state.consultants);
  const { assignments, loading: assignmentsLoading } = useAppSelector(
    (state) => state.assignments
  );

  useEffect(() => {
    if (id) {
      dispatch(fetchConsultantById(id));
      dispatch(fetchAssignments({ assignedByConsultant: id, limit: 50 }));
    }

    return () => {
      dispatch(clearCurrentConsultant());
    };
  }, [id, dispatch]);

  if (loading || !currentConsultant) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
        </div>
      </div>
    );
  }

  const STATUS_STYLES = {
    active: 'bg-green-100 text-green-800 border-green-200',
    inactive: 'bg-red-100 text-red-800 border-red-200',
    on_leave: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  };

  const ROLE_STYLES = {
    admin: 'bg-accent-orange-100 text-purple-800 border-accent-orange-200',
    senior_consultant: 'bg-brand-100 text-brand-800 border-brand-200',
    consultant: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRole = (role: string) => {
    return role.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const currentAssignments = assignments.filter((a) => a.isCurrent);
  const acceptedAssignments = assignments.filter((a) => a.acceptedAt);
  const pendingAssignments = assignments.filter((a) => !a.acceptedAt && a.isCurrent);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/consultant-reports/list')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to List
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">Consultant Performance Report</h1>
          <p className="text-gray-600 mt-1">Detailed performance metrics and assignment history</p>
        </div>
      </div>

      {/* Consultant Profile Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-6">
              <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center">
                <User className="w-10 h-10 text-brand-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{currentConsultant.fullName}</h2>
                <div className="flex items-center gap-3 mt-2">
                  <span
                    className={cn(
                      'px-3 py-1 text-sm font-medium rounded-md border',
                      ROLE_STYLES[currentConsultant.role]
                    )}
                  >
                    {formatRole(currentConsultant.role)}
                  </span>
                  <span
                    className={cn(
                      'px-3 py-1 text-sm font-medium rounded-md border',
                      STATUS_STYLES[currentConsultant.status]
                    )}
                  >
                    {formatStatus(currentConsultant.status)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm">{currentConsultant.email}</span>
                  </div>
                  {currentConsultant.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span className="text-sm">{currentConsultant.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">Last Login: {formatDate(currentConsultant.lastLogin)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Activity className="w-4 h-4" />
                    <span className="text-sm">Joined: {formatDate(currentConsultant.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-600 uppercase">Total Assignments</p>
            <h3 className="text-3xl font-bold text-brand-600 mt-2">{assignments.length}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-600 uppercase">Current Active</p>
            <h3 className="text-3xl font-bold text-accent-orange-600 mt-2">{currentAssignments.length}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-600 uppercase">Accepted</p>
            <h3 className="text-3xl font-bold text-green-600 mt-2">{acceptedAssignments.length}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-600 uppercase">Pending</p>
            <h3 className="text-3xl font-bold text-yellow-600 mt-2">{pendingAssignments.length}</h3>
          </CardContent>
        </Card>
      </div>

      {/* Assignment History */}
      <Card>
        <CardHeader>
          <CardTitle>Assignment History</CardTitle>
        </CardHeader>
        <CardContent>
          {assignmentsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600" />
            </div>
          ) : assignments.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No assignments found</p>
          ) : (
            <div className="space-y-4">
              {assignments.slice(0, 10).map((assignment) => (
                <div
                  key={assignment._id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div
                    className={cn(
                      'w-3 h-3 rounded-full mt-1.5',
                      assignment.acceptedAt ? 'bg-green-500' : 'bg-yellow-500'
                    )}
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {assignment.ticket.ticketNumber} - {assignment.ticket.subject}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Assigned to: {assignment.assignedToTeam.teamName}
                        </p>
                        {assignment.assignmentNotes && (
                          <p className="text-sm text-gray-500 mt-1">
                            Notes: {assignment.assignmentNotes}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span
                          className={cn(
                            'px-2 py-1 text-xs font-medium rounded-md border',
                            assignment.acceptedAt
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                          )}
                        >
                          {assignment.acceptedAt ? 'Accepted' : 'Pending'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      <span>Assigned: {formatDate(assignment.assignedAt)}</span>
                      {assignment.acceptedAt && (
                        <span>Accepted: {formatDate(assignment.acceptedAt)}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
