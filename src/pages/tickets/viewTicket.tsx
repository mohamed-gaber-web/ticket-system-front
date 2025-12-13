import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchTicketById, clearCurrentTicket } from '@/redux/slices/ticketSlice';
import { fetchCurrentAssignment } from '@/redux/slices/assignmentSlice';
import { fetchTicketAttachments } from '@/redux/slices/attachmentSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SubTicketsList } from '@/components/subTickets/SubTicketsList';
import { ConsultantAssignmentsList } from '@/components/consultantAssignment/ConsultantAssignmentsList';
import FileUpload from '@/components/attachments/FileUpload';
import AttachmentList from '@/components/attachments/AttachmentList';
import { ArrowLeft, Loader2, Paperclip } from 'lucide-react';

export default function ViewTicket() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentTicket, loading } = useAppSelector((state) => state.tickets);
  const { currentAssignment } = useAppSelector((state) => state.assignments);
  const { user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (id) {
      dispatch(fetchTicketById(id));
      dispatch(fetchCurrentAssignment(id));
    }

    return () => {
      dispatch(clearCurrentTicket());
    };
  }, [dispatch, id]);

  const handleRefreshAssignment = () => {
    if (id) {
      dispatch(fetchCurrentAssignment(id));
    }
  };

  const handleUploadSuccess = () => {
    if (id) {
      dispatch(fetchTicketAttachments({ ticketId: id }));
    }
  };

  if (loading || !currentTicket) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'assigned':
        return 'bg-purple-100 text-purple-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      case 'reopened':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const customer = typeof currentTicket.customer === 'string'
    ? null
    : currentTicket.customer;

  const category = typeof currentTicket.category === 'string'
    ? null
    : currentTicket.category;

  const parentTicket = currentTicket.parentTicket && typeof currentTicket.parentTicket !== 'string'
    ? currentTicket.parentTicket
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-full px-6 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="gap-2 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{currentTicket.ticketNumber}</h1>
              {parentTicket && (
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">SUB-TICKET</Badge>
                  <button
                    onClick={() => navigate(`/tickets/view/${parentTicket._id}`)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Parent: {parentTicket.ticketNumber}
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Badge className={getStatusColor(currentTicket.status)}>
                {currentTicket.status.replace('_', ' ').toUpperCase()}
              </Badge>
              <Badge variant={getPriorityColor(currentTicket.priority)}>
                {currentTicket.priority.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-full px-6 py-6 space-y-6">
        <Card className="shadow-md">
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="text-xl">Ticket Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">{currentTicket.subject}</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{currentTicket.description}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4 border-t">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Customer</p>
                <p className="text-sm font-semibold">
                  {customer ? customer.companyName : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Category</p>
                <p className="text-sm font-semibold">
                  {category ? category.name : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Created</p>
                <p className="text-sm font-semibold">
                  {new Date(currentTicket.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Last Updated</p>
                <p className="text-sm font-semibold">
                  {new Date(currentTicket.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>

            {(currentTicket.startDate || currentTicket.endDate || currentTicket.estimatedTime) && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-4 border-t">
                {currentTicket.startDate && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Start Date</p>
                    <p className="text-sm font-semibold">
                      {new Date(currentTicket.startDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {currentTicket.endDate && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">End Date</p>
                    <p className="text-sm font-semibold">
                      {new Date(currentTicket.endDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {currentTicket.estimatedTime !== undefined && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Estimated Time</p>
                    <p className="text-sm font-semibold">
                      {currentTicket.estimatedTime} hours
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {currentAssignment && currentAssignment.assignedToConsultants && (
          <ConsultantAssignmentsList
            assignmentId={currentAssignment._id}
            consultantAssignments={currentAssignment.assignedToConsultants}
            currentUserId={user?._id}
            onUpdate={handleRefreshAssignment}
          />
        )}

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between bg-gray-50 border-b">
            <CardTitle className="text-xl">
              <div className="flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                Attachments
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {/* Upload Section */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Upload New Attachment</h4>
              <FileUpload ticketId={currentTicket._id} onUploadSuccess={handleUploadSuccess} />
            </div>

            {/* Divider */}
            <div className="border-t my-6" />

            {/* Attachments List */}
            <div>
              <AttachmentList ticketId={currentTicket._id} />
            </div>
          </CardContent>
        </Card>

        <SubTicketsList
          parentTicketId={currentTicket._id}
          parentTicketNumber={currentTicket.ticketNumber}
          isSubTicket={currentTicket.isSubTicket}
        />
      </div>
    </div>
  );
}
