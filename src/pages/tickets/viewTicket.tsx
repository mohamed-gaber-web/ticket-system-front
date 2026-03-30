import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchTicketById, clearCurrentTicket } from '@/redux/slices/ticketSlice';
import { fetchCurrentAssignment } from '@/redux/slices/assignmentSlice';
import { fetchTicketAttachments } from '@/redux/slices/attachmentSlice';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Building2,
  Server,
  Sparkles,
  Package,
  Target,
  Wrench,
  Layers,
  Edit,
  ChevronRight,
  Globe,
} from 'lucide-react';

export default function ViewTicket() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentTicket, loading } = useAppSelector((state) => state.tickets);
  const { currentAssignment } = useAppSelector((state) => state.assignments);
  const { user, userType } = useAppSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'attachments'>('details');

  useEffect(() => {
    if (id) {
      dispatch(fetchTicketById(id));
      dispatch(fetchCurrentAssignment(id));
    }
    return () => { dispatch(clearCurrentTicket()); };
  }, [dispatch, id]);

  const handleRefreshAssignment = () => { if (id) dispatch(fetchCurrentAssignment(id)); };
  const handleUploadSuccess = () => { if (id) dispatch(fetchTicketAttachments({ ticketId: id })); };

  if (loading || !currentTicket) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-brand-500 mx-auto mb-4" />
          <p className="text-on-surface-variant text-sm">Loading ticket...</p>
        </div>
      </div>
    );
  }

  const priorityDot: Record<string, string> = {
    critical: 'bg-error', high: 'bg-accent-orange-500', medium: 'bg-yellow-500', low: 'bg-green-500',
  };
  const priorityText: Record<string, string> = {
    critical: 'text-error', high: 'text-accent-orange-600', medium: 'text-yellow-600', low: 'text-green-600',
  };
  const statusStyle: Record<string, string> = {
    new: 'bg-accent-orange-400 text-white',
    assigned: 'bg-brand-400 text-white',
    in_progress: 'bg-yellow-500 text-white',
    resolved: 'bg-green-500 text-white',
    closed: 'bg-surface-container-highest text-on-surface-variant',
  };

  const customer = typeof currentTicket.customer === 'string' ? null : currentTicket.customer;
  const category = typeof currentTicket.category === 'string' ? null : currentTicket.category;
  const parentTicket = currentTicket.parentTicket && typeof currentTicket.parentTicket !== 'string' ? currentTicket.parentTicket : null;
  const environment = currentTicket.environment && typeof currentTicket.environment !== 'string' ? currentTicket.environment : null;
  const feature = currentTicket.feature && typeof currentTicket.feature !== 'string' ? currentTicket.feature : null;
  const department = currentTicket.department && typeof currentTicket.department !== 'string' ? currentTicket.department : null;
  const productType = currentTicket.productType && typeof currentTicket.productType !== 'string' ? currentTicket.productType : null;
  const serviceType = currentTicket.serviceType && typeof currentTicket.serviceType !== 'string' ? currentTicket.serviceType : null;
  const scope = currentTicket.scope && typeof currentTicket.scope !== 'string' ? currentTicket.scope : null;
  const source = currentTicket.source && typeof currentTicket.source !== 'string' ? currentTicket.source : null;

  const displayStatus = currentTicket.status.replace('_', ' ');

  return (
    <div className="p-8 space-y-0 w-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-6">
        <button onClick={() => navigate('/tickets')} className="hover:text-brand-500 transition-colors font-medium">
          Tickets
        </button>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-on-surface font-semibold">{currentTicket.ticketNumber}</span>
        {parentTicket && (
          <>
            <span className="text-on-surface-variant/40 mx-1">·</span>
            <button
              onClick={() => navigate(`/tickets/view/${parentTicket._id}`)}
              className="text-brand-500 hover:text-brand-600 font-medium"
            >
              Parent: {parentTicket.ticketNumber}
            </button>
          </>
        )}
      </div>

      {/* Hero Header */}
      <div className="bg-surface-container-lowest rounded-[1.5rem] p-8 mb-8">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
          {/* Left: Ticket Identity */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <span className="text-on-surface-variant font-mono text-sm font-semibold">
                #{currentTicket.ticketNumber}
              </span>
              <span className={`px-3 py-1 rounded-[0.5rem] text-xs font-bold uppercase tracking-[0.05em] ${statusStyle[currentTicket.status] || statusStyle.new}`}>
                {displayStatus}
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${priorityDot[currentTicket.priority] || priorityDot.medium}`} />
                <span className={`text-xs font-bold uppercase tracking-[0.05em] ${priorityText[currentTicket.priority] || priorityText.medium}`}>
                  {currentTicket.priority}
                </span>
              </div>
              {parentTicket && (
                <Badge className="bg-primary-fixed text-on-primary-fixed text-xs">Sub-ticket</Badge>
              )}
            </div>

            <h1 className="text-2xl lg:text-3xl font-bold text-on-surface tracking-tight leading-tight mb-4">
              {currentTicket.subject}
            </h1>

            {/* Meta Row */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-on-surface-variant">
              {customer && (
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="font-medium">{customer.companyName}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>{new Date(currentTicket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              {category && (
                <div className="flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" />
                  <span>{category.name}</span>
                </div>
              )}
              {currentTicket.estimatedTime !== undefined && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{currentTicket.estimatedTime}h estimated</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/tickets/edit/${currentTicket._id}`)}
              className="gap-1.5"
            >
              <Edit className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="gap-1.5 text-on-surface-variant"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 mb-8 bg-surface-container-low rounded-[1rem] p-1.5 w-fit">
        {(['details', 'comments', 'attachments'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-[0.75rem] text-sm font-semibold transition-all capitalize ${
              activeTab === tab
                ? 'bg-surface-container-lowest text-on-surface shadow-ambient'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Column */}
          <div className="xl:col-span-2 space-y-8">
            {/* Description */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-4 w-4 text-on-surface-variant" />
                <h3 className="label-technical">Description</h3>
              </div>
              <div className="bg-surface-container-lowest rounded-[1rem] p-6">
                <p className="text-on-surface whitespace-pre-wrap leading-relaxed text-[15px]">
                  {currentTicket.description}
                </p>
              </div>
            </section>

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
              userType={userType || undefined}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Timeline */}
            <div className="bg-surface-container-lowest rounded-[1rem] p-6">
              <h3 className="label-technical mb-5 flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                Timeline
              </h3>
              <div className="space-y-5">
                <TimelineEntry label="Created" date={currentTicket.createdAt} color="brand" />
                <TimelineEntry label="Last Updated" date={currentTicket.updatedAt} color="green" />
                {currentTicket.acceptedAt && <TimelineEntry label="Accepted" date={currentTicket.acceptedAt} color="blue" />}
                {currentTicket.startDate && <TimelineEntry label="Start Date" date={currentTicket.startDate} color="orange" />}
                {currentTicket.endDate && <TimelineEntry label="Due Date" date={currentTicket.endDate} color="red" />}
                {currentTicket.resolvedAt && <TimelineEntry label="Resolved" date={currentTicket.resolvedAt} color="green" />}
                {currentTicket.closedAt && <TimelineEntry label="Closed" date={currentTicket.closedAt} color="gray" />}
              </div>
            </div>

            {/* Properties */}
            {(environment || feature || department || productType || serviceType || scope || source) && (
              <div className="bg-surface-container-lowest rounded-[1rem] p-6">
                <h3 className="label-technical mb-5 flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5" />
                  Properties
                </h3>
                <div className="space-y-4">
                  {environment && <PropertyRow icon={Server} label="Environment" value={environment.name} />}
                  {feature && <PropertyRow icon={Sparkles} label="Feature" value={feature.name} />}
                  {department && <PropertyRow icon={Building2} label="Department" value={department.name} />}
                  {productType && <PropertyRow icon={Package} label="Product" value={productType.name} />}
                  {serviceType && <PropertyRow icon={Wrench} label="Service" value={serviceType.name} />}
                  {scope && <PropertyRow icon={Target} label="Scope" value={scope.name} />}
                  {source && <PropertyRow icon={Globe} label="Source" value={source.name} />}
                </div>
              </div>
            )}

            {/* SLA Info */}
            {currentTicket.slaDueDate && (
              <div className={`rounded-[1rem] p-5 ${currentTicket.isSlaBreached ? 'bg-error/5' : 'bg-green-500/5'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${currentTicket.isSlaBreached ? 'bg-error animate-pulse' : 'bg-green-500'}`} />
                  <span className={`text-xs font-bold uppercase tracking-[0.05em] ${currentTicket.isSlaBreached ? 'text-error' : 'text-green-600'}`}>
                    {currentTicket.isSlaBreached ? 'SLA Breached' : 'SLA On Track'}
                  </span>
                </div>
                <p className="text-sm text-on-surface font-medium">
                  Due: {new Date(currentTicket.slaDueDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'comments' && (
        <div className="max-w-4xl">
          <TicketComments ticketId={currentTicket._id} />
        </div>
      )}

      {activeTab === 'attachments' && (
        <div className="max-w-4xl space-y-6">
          <div className="bg-surface-container-lowest rounded-[1rem] p-6">
            <h3 className="label-technical mb-4 flex items-center gap-2">
              <Paperclip className="h-3.5 w-3.5" />
              Upload
            </h3>
            <FileUpload ticketId={currentTicket._id} onUploadSuccess={handleUploadSuccess} />
          </div>
          <div className="bg-surface-container-lowest rounded-[1rem] p-6">
            <AttachmentList ticketId={currentTicket._id} />
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineEntry({ label, date, color }: { label: string; date: string; color: string }) {
  const colorMap: Record<string, string> = {
    brand: 'bg-brand-500', green: 'bg-green-500', blue: 'bg-brand-400',
    orange: 'bg-accent-orange-500', red: 'bg-error', gray: 'bg-surface-container-highest',
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`w-1.5 h-1.5 rounded-full ${colorMap[color] || colorMap.gray} shrink-0`} />
      <div className="flex-1 flex items-baseline justify-between gap-2">
        <span className="text-xs text-on-surface-variant">{label}</span>
        <span className="text-xs font-semibold text-on-surface tabular-nums">
          {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          {' '}
          <span className="text-on-surface-variant font-normal">
            {new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </span>
      </div>
    </div>
  );
}

function PropertyRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-on-surface-variant">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-sm font-semibold text-on-surface truncate text-right">{value}</span>
    </div>
  );
}
