import { useEffect, useState } from 'react';
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
import { TicketComments } from '@/components/comments';
import {
  ArrowLeft,
  Loader2,
  Paperclip,
  Calendar,
  Clock,
  Tag,
  FileText,
  Users,
  Activity,
  Building2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function ViewTicket() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentTicket, loading } = useAppSelector((state) => state.tickets);
  const { currentAssignment } = useAppSelector((state) => state.assignments);
  const { user, userType } = useAppSelector((state) => state.auth);

  const [showDetails, setShowDetails] = useState(true);
  const [showAttachments, setShowAttachments] = useState(true);

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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading ticket details...</p>
        </div>
      </div>
    );
  }

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'critical':
        return { variant: 'destructive' as const, icon: '🔴', color: 'text-red-600' };
      case 'high':
        return { variant: 'default' as const, icon: '🟠', color: 'text-orange-600' };
      case 'medium':
        return { variant: 'secondary' as const, icon: '🟡', color: 'text-yellow-600' };
      case 'low':
        return { variant: 'outline' as const, icon: '🟢', color: 'text-green-600' };
      default:
        return { variant: 'outline' as const, icon: '⚪', color: 'text-gray-600' };
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'new':
        return { className: 'bg-blue-500 text-white', label: 'New', icon: Activity };
      case 'assigned':
        return { className: 'bg-purple-500 text-white', label: 'Assigned', icon: Users };
      case 'in_progress':
        return { className: 'bg-amber-500 text-white', label: 'In Progress', icon: Clock };
      case 'resolved':
        return { className: 'bg-green-500 text-white', label: 'Resolved', icon: Activity };
      case 'closed':
        return { className: 'bg-gray-500 text-white', label: 'Closed', icon: Activity };
      default:
        return { className: 'bg-gray-500 text-white', label: status, icon: Activity };
    }
  };

  const customer = typeof currentTicket.customer === 'string' ? null : currentTicket.customer;
  const category = typeof currentTicket.category === 'string' ? null : currentTicket.category;
  const parentTicket =
    currentTicket.parentTicket && typeof currentTicket.parentTicket !== 'string'
      ? currentTicket.parentTicket
      : null;

  const priorityConfig = getPriorityConfig(currentTicket.priority);
  const statusConfig = getStatusConfig(currentTicket.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header Section */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="gap-2 mb-3 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tickets
          </Button>

          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            {/* Left Side - Ticket Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                  {currentTicket.ticketNumber}
                </h1>
                {parentTicket && (
                  <Badge variant="outline" className="text-xs bg-indigo-50 border-indigo-200">
                    Sub-ticket
                  </Badge>
                )}
              </div>

              {parentTicket && (
                <button
                  onClick={() => navigate(`/tickets/view/${parentTicket._id}`)}
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 mb-3"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Parent: {parentTicket.ticketNumber}
                </button>
              )}

              <h2 className="text-lg font-semibold text-gray-800 mb-2">{currentTicket.subject}</h2>

              {/* Quick Info Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-xs">
                  <Building2 className="h-3.5 w-3.5 text-gray-600" />
                  <span className="font-medium text-gray-700">
                    {customer ? customer.companyName : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-xs">
                  <Tag className="h-3.5 w-3.5 text-gray-600" />
                  <span className="font-medium text-gray-700">
                    {category ? category.name : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-xs">
                  <Calendar className="h-3.5 w-3.5 text-gray-600" />
                  <span className="font-medium text-gray-700">
                    {new Date(currentTicket.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Side - Status & Priority */}
            <div className="flex flex-col gap-2">
              <Badge className={`${statusConfig.className} px-4 py-2 text-sm font-semibold`}>
                <StatusIcon className="h-4 w-4 mr-2" />
                {statusConfig.label}
              </Badge>
              <Badge
                variant={priorityConfig.variant}
                className="px-4 py-2 text-sm font-semibold justify-center"
              >
                <span className="mr-2">{priorityConfig.icon}</span>
                {currentTicket.priority.toUpperCase()} PRIORITY
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description Card */}
            <Card className="shadow-lg border-0 overflow-hidden p-0">
              <CardHeader
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white cursor-pointer p-4 m-0"
                onClick={() => setShowDetails(!showDetails)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2 m-0">
                    <FileText className="h-5 w-5" />
                    Description
                  </CardTitle>
                  {showDetails ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </div>
              </CardHeader>
              {showDetails && (
                <CardContent className="p-4">
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm">
                    {currentTicket.description}
                  </p>
                </CardContent>
              )}
            </Card>

            {/* Assignments */}
            {currentAssignment && currentAssignment.assignedToConsultants && (
              <ConsultantAssignmentsList
                assignmentId={currentAssignment._id}
                consultantAssignments={currentAssignment.assignedToConsultants}
                currentUserId={user?._id}
                onUpdate={handleRefreshAssignment}
              />
            )}

            {/* Sub-tickets */}
            <SubTicketsList
              parentTicketId={currentTicket._id}
              parentTicketNumber={currentTicket.ticketNumber}
              isSubTicket={currentTicket.isSubTicket}
              userType={userType}
            />

            {/* Comments */}
            <TicketComments ticketId={currentTicket._id} />
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Timeline Info */}
            <Card className="shadow-lg border-0 overflow-hidden p-0">
              <CardHeader className="bg-gradient-to-r from-slate-600 to-slate-700 text-white p-3 m-0">
                <CardTitle className="text-base font-semibold flex items-center gap-2 m-0">
                  <Clock className="h-4 w-4" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-3">
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Created</p>
                      <p className="text-xs font-semibold text-gray-900">
                        {new Date(currentTicket.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <Activity className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Last Updated</p>
                      <p className="text-xs font-semibold text-gray-900">
                        {new Date(currentTicket.updatedAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  {currentTicket.startDate && (
                    <div className="flex items-start gap-2.5">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                        <Calendar className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Start Date</p>
                        <p className="text-xs font-semibold text-gray-900">
                          {new Date(currentTicket.startDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {currentTicket.endDate && (
                    <div className="flex items-start gap-2.5">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                        <Calendar className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Due Date</p>
                        <p className="text-xs font-semibold text-gray-900">
                          {new Date(currentTicket.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {currentTicket.estimatedTime !== undefined && (
                    <div className="flex items-start gap-2.5">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                        <Clock className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Estimated Time</p>
                        <p className="text-xs font-semibold text-gray-900">
                          {currentTicket.estimatedTime} hours
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Attachments Card */}
            <Card className="shadow-lg border-0 overflow-hidden p-0">
              <CardHeader
                className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white cursor-pointer p-3 m-0"
                onClick={() => setShowAttachments(!showAttachments)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2 m-0">
                    <Paperclip className="h-4 w-4" />
                    Attachments
                  </CardTitle>
                  {showAttachments ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </CardHeader>
              {showAttachments && (
                <CardContent className="p-3 space-y-3">
                  <div>
                    <FileUpload ticketId={currentTicket._id} onUploadSuccess={handleUploadSuccess} />
                  </div>
                  <div className="border-t pt-4">
                    <AttachmentList ticketId={currentTicket._id} />
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
