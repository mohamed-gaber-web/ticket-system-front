import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchTicketById, clearCurrentTicket, updateTicket } from '@/redux/slices/ticketSlice';
import { submitFeedback } from '@/api/ticketApi';
import { fetchCurrentAssignment } from '@/redux/slices/assignmentSlice';
import { AssignConsultantsDialog } from '@/components/consultantAssignment/AssignConsultantsDialog';
import { fetchTicketAttachments } from '@/redux/slices/attachmentSlice';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SubTicketsList } from '@/components/subTickets/SubTicketsList';
import { ConsultantAssignmentsList } from '@/components/consultantAssignment/ConsultantAssignmentsList';
import FileUpload from '@/components/attachments/FileUpload';
import AttachmentList from '@/components/attachments/AttachmentList';
import { TicketComments } from '@/components/comments';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  CheckCircle2,
  FileSpreadsheet,
  FileText as FileCsv,
  XCircle,
  Star,
  MessageSquare,
} from 'lucide-react';

const PRIORITY_DOT: Record<string, string> = {
  critical: 'bg-error', high: 'bg-accent-orange-500', medium: 'bg-yellow-500', low: 'bg-green-500',
};
const PRIORITY_TEXT: Record<string, string> = {
  critical: 'text-error', high: 'text-accent-orange-600', medium: 'text-yellow-600', low: 'text-green-600',
};
const STATUS_STYLE: Record<string, string> = {
  new: 'bg-accent-orange-400 text-white',
  assigned: 'bg-brand-400 text-white',
  in_progress: 'bg-yellow-500 text-white',
  resolved: 'bg-green-500 text-white',
  closed: 'bg-surface-container-highest text-on-surface-variant',
};

export default function ViewTicket() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentTicket, loading } = useAppSelector((state) => state.tickets);
  const { currentAssignment } = useAppSelector((state) => state.assignments);
  const { user, userType } = useAppSelector((state) => state.auth);

  const isCustomer = userType === 'customer';
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'attachments'>('details');
  const [resolving, setResolving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackHover, setFeedbackHover] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const handleSubmitFeedback = async () => {
    if (!currentTicket || feedbackRating === 0) return;
    setSubmittingFeedback(true);
    try {
      await submitFeedback(currentTicket._id, {
        customerRating: feedbackRating,
        customerFeedback: feedbackText.trim() || undefined,
      });
      setFeedbackSubmitted(true);
      if (id) dispatch(fetchTicketById(id));
    } finally {
      setSubmittingFeedback(false);
    }
  };

  useEffect(() => {
    if (id) {
      dispatch(fetchTicketById(id));
      dispatch(fetchCurrentAssignment(id));
    }
    return () => { dispatch(clearCurrentTicket()); };
  }, [dispatch, id]);

  const handleRefreshAssignment = () => { if (id) dispatch(fetchCurrentAssignment(id)); };
  const handleUploadSuccess = () => { if (id) dispatch(fetchTicketAttachments({ ticketId: id })); };

  const handleResolve = async () => {
    if (!currentTicket) return;
    setResolving(true);
    try {
      // updateTicket.fulfilled already sets currentTicket in Redux — no re-fetch needed
      await dispatch(updateTicket({ id: currentTicket._id, data: { status: 'resolved' } })).unwrap();
    } finally {
      setResolving(false);
    }
  };

  const handleClose = async () => {
    if (!currentTicket) return;
    setClosing(true);
    try {
      // updateTicket.fulfilled already sets currentTicket in Redux — no re-fetch needed
      await dispatch(updateTicket({ id: currentTicket._id, data: { status: 'closed' } })).unwrap();
    } finally {
      setClosing(false);
    }
  };

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

  // priorityDot, priorityText, statusStyle moved to module-level constants above

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

  const firstConsultant = (() => {
    const list = currentAssignment?.assignedToConsultants ?? [];
    return list.length > 0 && typeof list[0].consultant !== 'string' ? list[0].consultant : null;
  })();

  const fmtDate = (date?: string) =>
    date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  // Columns in exact order — aoa_to_sheet guarantees this order in the file
  const exportHeaders = [
    'Ticket Number', 'Subject', 'Customer', 'Assignee', 'Company',
    'Priority', 'Status', 'Created Date', 'End Date',
    'Category', 'Source', 'Customer Email',
  ];
  const exportValues = [
    currentTicket.ticketNumber,
    currentTicket.subject,
    customer?.companyName ?? '',
    firstConsultant ? `${firstConsultant.firstName} ${firstConsultant.lastName}` : '',
    customer?.companyName ?? '',
    currentTicket.priority,
    displayStatus,
    fmtDate(currentTicket.createdAt),
    fmtDate(currentTicket.endDate),
    category?.name ?? '',
    source?.name ?? '',
    customer?.email ?? '',
  ];

  const handleExportExcel = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([exportHeaders, exportValues]);
    worksheet['!cols'] = exportHeaders.map((h, i) => ({
      wch: Math.max(h.length, String(exportValues[i] ?? '').length) + 2,
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ticket');
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `ticket-${currentTicket.ticketNumber}.xlsx`);
  };

  const handleExportCSV = () => {
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [
      exportHeaders.map(escape).join(','),
      exportValues.map((v) => escape(String(v ?? ''))).join(','),
    ].join('\n');
    saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `ticket-${currentTicket.ticketNumber}.csv`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(13);
    doc.text(`Ticket ${currentTicket.ticketNumber}`, 14, 15);
    autoTable(doc, {
      head: [exportHeaders],
      body: [exportValues.map((v) => String(v ?? ''))],
      startY: 22,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [0, 58, 143] },
    });
    doc.save(`ticket-${currentTicket.ticketNumber}.pdf`);
  };

  return (
    <div className="p-8 space-y-0 w-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-6">
        <button onClick={() => navigate('/tickets')} className="hover:text-brand-500 transition-colors font-medium" aria-label="Back to tickets list">
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
              <span className={`px-3 py-1 rounded-[0.5rem] text-xs font-bold uppercase tracking-[0.05em] ${STATUS_STYLE[currentTicket.status] || STATUS_STYLE.new}`}>
                {displayStatus}
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[currentTicket.priority] || PRIORITY_DOT.medium}`} />
                <span className={`text-xs font-bold uppercase tracking-[0.05em] ${PRIORITY_TEXT[currentTicket.priority] || PRIORITY_TEXT.medium}`}>
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
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {!isCustomer && currentAssignment && (
              <AssignConsultantsDialog
                assignmentId={currentAssignment._id}
                currentConsultants={currentAssignment.assignedToConsultants?.map(
                  (ca) => typeof ca.consultant === 'string' ? ca.consultant : ca.consultant._id
                )}
                onSuccess={handleRefreshAssignment}
              />
            )}
            {!isCustomer && currentTicket.status !== 'resolved' && currentTicket.status !== 'closed' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResolve}
                disabled={resolving}
                className="gap-1.5 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {resolving ? 'Resolving...' : 'Resolve'}
              </Button>
            )}
            {isCustomer && currentTicket.status === 'resolved' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={closing}
                className="gap-1.5 text-on-surface-variant border-border hover:bg-surface-container-highest"
              >
                <XCircle className="h-3.5 w-3.5" />
                {closing ? 'Closing...' : 'Close Ticket'}
              </Button>
            )}
            <div className="flex items-center rounded-[0.5rem] border border-border overflow-hidden">
              <Button variant="ghost" size="sm" onClick={handleExportExcel} className="gap-1.5 rounded-none border-0 border-r border-border h-8 px-3 text-xs">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                XLS
              </Button>
              <Button variant="ghost" size="sm" onClick={handleExportCSV} className="gap-1.5 rounded-none border-0 border-r border-border h-8 px-3 text-xs">
                <FileCsv className="h-3.5 w-3.5" />
                CSV
              </Button>
              <Button variant="ghost" size="sm" onClick={handleExportPDF} className="gap-1.5 rounded-none border-0 h-8 px-3 text-xs">
                <FileText className="h-3.5 w-3.5" />
                PDF
              </Button>
            </div>
            {!isCustomer && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/tickets/edit/${currentTicket._id}`)}
                className="gap-1.5"
              >
                <Edit className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}
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
      <div
        className="flex items-center gap-1 mb-8 bg-surface-container-low rounded-[1rem] p-1.5 w-fit"
        role="tablist"
        aria-label="Ticket sections"
      >
        {(['details', 'comments', 'attachments'] as const).map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls={`tabpanel-${tab}`}
            id={`tab-${tab}`}
            onClick={() => setActiveTab(tab)}
            onKeyDown={(e) => {
              const tabs = ['details', 'comments', 'attachments'] as const;
              const currentIndex = tabs.indexOf(tab);
              if (e.key === 'ArrowRight') {
                e.preventDefault();
                const next = tabs[(currentIndex + 1) % tabs.length];
                setActiveTab(next);
                document.getElementById(`tab-${next}`)?.focus();
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                const prev = tabs[(currentIndex - 1 + tabs.length) % tabs.length];
                setActiveTab(prev);
                document.getElementById(`tab-${prev}`)?.focus();
              }
            }}
            tabIndex={activeTab === tab ? 0 : -1}
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
        <div id="tabpanel-details" role="tabpanel" aria-labelledby="tab-details" className="grid grid-cols-1 xl:grid-cols-3 gap-8">
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

            {/* Feedback */}
            {['resolved', 'closed'].includes(currentTicket.status) && (
              <FeedbackSection
                existingRating={currentTicket.customerRating}
                existingFeedback={currentTicket.customerFeedback}
                isCustomer={isCustomer}
                alreadySubmitted={feedbackSubmitted}
                rating={feedbackRating}
                hover={feedbackHover}
                text={feedbackText}
                submitting={submittingFeedback}
                onRating={setFeedbackRating}
                onHover={setFeedbackHover}
                onText={setFeedbackText}
                onSubmit={handleSubmitFeedback}
              />
            )}

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
                  SLA due {new Date(currentTicket.slaDueDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'comments' && (
        <div id="tabpanel-comments" role="tabpanel" aria-labelledby="tab-comments" className="max-w-4xl">
          <TicketComments ticketId={currentTicket._id} />
        </div>
      )}

      {activeTab === 'attachments' && (
        <div id="tabpanel-attachments" role="tabpanel" aria-labelledby="tab-attachments" className="max-w-4xl space-y-6">
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

interface FeedbackSectionProps {
  existingRating?: number;
  existingFeedback?: string;
  isCustomer: boolean;
  alreadySubmitted: boolean;
  rating: number;
  hover: number;
  text: string;
  submitting: boolean;
  onRating: (v: number) => void;
  onHover: (v: number) => void;
  onText: (v: string) => void;
  onSubmit: () => void;
}

function FeedbackSection({
  existingRating, existingFeedback, isCustomer, alreadySubmitted,
  rating, hover, text, submitting, onRating, onHover, onText, onSubmit,
}: FeedbackSectionProps) {
  const hasExisting = existingRating !== undefined && existingRating !== null;
  const showForm = isCustomer && !hasExisting && !alreadySubmitted;
  const displayRating = hasExisting ? existingRating : (alreadySubmitted ? rating : null);

  const starLabel = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Star className="h-4 w-4 text-on-surface-variant" />
        <h3 className="label-technical">Customer Feedback</h3>
      </div>

      <div className="bg-surface-container-lowest rounded-[1rem] p-6 space-y-4">
        {/* Already submitted or has existing rating — read-only display */}
        {(hasExisting || alreadySubmitted) && displayRating !== null && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`h-5 w-5 ${s <= displayRating ? 'fill-accent-orange-400 text-accent-orange-400' : 'text-on-surface-variant/30'}`}
                  />
                ))}
              </div>
              <span className="text-sm font-semibold text-on-surface">{starLabel[displayRating]}</span>
              <span className="text-xs text-on-surface-variant">({displayRating}/5)</span>
            </div>
            {(existingFeedback || (alreadySubmitted && text)) && (
              <div className="flex items-start gap-2 text-sm text-on-surface-variant bg-surface-container-low rounded-[0.75rem] px-4 py-3">
                <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <p className="leading-relaxed">{existingFeedback || text}</p>
              </div>
            )}
            {alreadySubmitted && !hasExisting && (
              <p className="text-xs text-green-600 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Thank you for your feedback!
              </p>
            )}
          </div>
        )}

        {/* No feedback yet — non-customer */}
        {!hasExisting && !alreadySubmitted && !isCustomer && (
          <p className="text-sm text-on-surface-variant italic">No feedback submitted yet.</p>
        )}

        {/* Interactive form for customer */}
        {showForm && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-on-surface-variant mb-3">How satisfied are you with the resolution?</p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onRating(s)}
                    onMouseEnter={() => onHover(s)}
                    onMouseLeave={() => onHover(0)}
                    className="p-0.5 transition-transform hover:scale-110 focus:outline-none"
                    aria-label={`Rate ${s} out of 5`}
                  >
                    <Star
                      className={`h-7 w-7 transition-colors ${
                        s <= (hover || rating)
                          ? 'fill-accent-orange-400 text-accent-orange-400'
                          : 'text-on-surface-variant/30'
                      }`}
                    />
                  </button>
                ))}
                {(hover || rating) > 0 && (
                  <span className="ml-2 text-sm font-semibold text-accent-orange-600">
                    {starLabel[hover || rating]}
                  </span>
                )}
              </div>
            </div>

            <div>
              <textarea
                value={text}
                onChange={(e) => onText(e.target.value)}
                placeholder="Share more details about your experience (optional)"
                rows={3}
                className="w-full text-sm bg-surface-container-low border border-border rounded-[0.75rem] px-4 py-3 text-on-surface placeholder:text-on-surface-variant/50 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition"
              />
            </div>

            <Button
              size="sm"
              onClick={onSubmit}
              disabled={rating === 0 || submitting}
              className="gap-1.5"
            >
              <Star className="h-3.5 w-3.5" />
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
