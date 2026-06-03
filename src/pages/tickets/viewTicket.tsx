import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchTicketById, clearCurrentTicket, updateTicket, deleteTicket, changeTicketStatus } from '@/redux/slices/ticketSlice';
import { toast } from 'sonner';
import { submitFeedback } from '@/api/ticketApi';
import { fetchCurrentAssignment } from '@/redux/slices/assignmentSlice';
import { fetchConsultants } from '@/redux/slices/consultantSlice';
import { AssignConsultantsDialog } from '@/components/consultantAssignment/AssignConsultantsDialog';
import { fetchTicketAttachments } from '@/redux/slices/attachmentSlice';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SubTicketsList } from '@/components/subTickets/SubTicketsList';
import FileUpload from '@/components/attachments/FileUpload';
import AttachmentList from '@/components/attachments/AttachmentList';
import { TicketComments } from '@/components/comments';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TicketIntelligencePanel } from '@/components/ai/TicketIntelligencePanel';
import {
  ArrowLeft,
  Loader2,
  Paperclip,
  Calendar,
  Clock,
  Tag,
  FileText,
  Building2,
  UserCheck,
  Server,
  Sparkles,
  Package,
  Target,
  Wrench,
  Layers,
  Edit,
  ChevronRight,
  ChevronDown,
  Globe,
  CheckCircle2,
  FileSpreadsheet,
  FileText as FileCsv,
  XCircle,
  Star,
  MessageSquare,
  Trash2,
  Download,
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
  customer_pending: 'bg-purple-500 text-white',
  resolved: 'bg-green-500 text-white',
  tested: 'bg-cyan-600 text-white',
  closed: 'bg-surface-container-highest text-on-surface-variant',
  delivered: 'bg-teal-500 text-white',
  not_related: 'bg-slate-500 text-white',
};

const ALL_STATUSES: { value: 'new' | 'assigned' | 'in_progress' | 'customer_pending' | 'resolved' | 'tested' | 'delivered' | 'closed' | 'not_related'; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'customer_pending', label: 'Customer Pending' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'tested', label: 'Tested' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'closed', label: 'Closed' },
  { value: 'not_related', label: 'Not Related' },
];

export default function ViewTicket() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentTicket, loading, subTickets } = useAppSelector((state) => state.tickets);
  const { currentAssignment } = useAppSelector((state) => state.assignments);
  const { user, userType } = useAppSelector((state) => state.auth);
  const { total } = useAppSelector((state) => state.attachments);
  const { consultants } = useAppSelector((state) => state.consultants);

  const isCustomer = userType === 'customer';
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'attachments'>('details');
  const [closing, setClosing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackHover, setFeedbackHover] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) setShowExportMenu(false);
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) setShowStatusMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
      if (!isCustomer) {
        dispatch(fetchConsultants({ limit: 500 }));
      }
    }
    return () => { dispatch(clearCurrentTicket()); };
  }, [dispatch, id, isCustomer]);

  const handleRefreshAssignment = () => {
    if (id) {
      dispatch(fetchCurrentAssignment(id));
      dispatch(fetchTicketById(id));
    }
  };
  const handleUploadSuccess = () => { if (id) dispatch(fetchTicketAttachments({ ticketId: id })); };

  const hasOpenSubTickets = subTickets.length > 0 && subTickets.some(
    (t) => t.status !== 'closed' && t.status !== 'resolved'
  );

  const handleClose = async () => {
    if (!currentTicket) return;
    if (hasOpenSubTickets) {
      toast.error('Cannot close ticket — all sub-tickets must be closed first');
      return;
    }
    setClosing(true);
    try {
      await dispatch(updateTicket({ id: currentTicket._id, data: { status: 'closed' } })).unwrap();
    } finally {
      setClosing(false);
    }
  };

  const handleDelete = async () => {
    if (!currentTicket) return;
    setDeleting(true);
    try {
      await dispatch(deleteTicket(currentTicket._id)).unwrap();
      toast.success('Sub-ticket deleted');
      navigate(-1);
    } catch {
      toast.error('Failed to delete sub-ticket');
      setDeleting(false);
    }
  };

  const handleStatusChange = async (newStatus: 'new' | 'assigned' | 'in_progress' | 'customer_pending' | 'resolved' | 'tested' | 'delivered' | 'closed' | 'reopened' | 'not_related') => {
    if (!currentTicket || newStatus === currentTicket.status) return;
    if (newStatus === 'closed' && hasOpenSubTickets) {
      setShowStatusMenu(false);
      toast.error('Cannot close ticket — all sub-tickets must be closed first');
      return;
    }
    setShowStatusMenu(false);
    setUpdatingStatus(true);
    try {
      await dispatch(changeTicketStatus({ id: currentTicket._id, status: newStatus })).unwrap();
      toast.success(`Status updated to ${newStatus.replace(/_/g, ' ')}`);
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatus(false);
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
  const createdByConsultant = currentTicket.createdByConsultant && typeof currentTicket.createdByConsultant !== 'string'
    ? currentTicket.createdByConsultant : null;
  const category = typeof currentTicket.category === 'string' ? null : currentTicket.category;
  const parentTicket = currentTicket.parentTicket && typeof currentTicket.parentTicket !== 'string' ? currentTicket.parentTicket : null;
  const environment = currentTicket.environment && typeof currentTicket.environment !== 'string' ? currentTicket.environment : null;
  const feature = currentTicket.feature && typeof currentTicket.feature !== 'string' ? currentTicket.feature : null;
  const department = currentTicket.department && typeof currentTicket.department !== 'string' ? currentTicket.department : null;
  const productType = currentTicket.productType && typeof currentTicket.productType !== 'string' ? currentTicket.productType : null;
  const serviceType = currentTicket.serviceType && typeof currentTicket.serviceType !== 'string' ? currentTicket.serviceType : null;
  const scopes = Array.isArray(currentTicket.scope)
    ? (currentTicket.scope as any[]).filter((s) => s && typeof s !== 'string')
    : [];
  const source = currentTicket.source && typeof currentTicket.source !== 'string' ? currentTicket.source : null;
  const assignedByConsultant = (() => {
    if (currentAssignment?.assignedByConsultant && typeof currentAssignment.assignedByConsultant !== 'string')
      return currentAssignment.assignedByConsultant;
    if (currentTicket.acceptedBy && typeof currentTicket.acceptedBy !== 'string')
      return currentTicket.acceptedBy;
    return null;
  })();

  const displayStatus = currentTicket.status.replace('_', ' ');

  const assignedConsultants = (currentAssignment?.assignedToConsultants ?? []).map((item) => {
    const raw = item.consultant;
    if (raw && typeof raw !== 'string') return raw;
    if (typeof raw === 'string') return consultants.find((c) => c._id === raw) ?? null;
    return null;
  }).filter(Boolean) as typeof consultants;

  const firstConsultant = assignedConsultants[0] ?? null;

  // Resolve an actor reference (populated Consultant object or a bare id) to a name.
  const resolveActor = (ref?: string | { firstName: string; lastName: string }): { firstName: string; lastName: string } | null => {
    if (!ref) return null;
    if (typeof ref !== 'string') return ref;
    const found = consultants.find((c) => c._id === ref);
    return found ? { firstName: found.firstName, lastName: found.lastName } : null;
  };

  // Derive last-updated / resolved / closed actors. Prefer dedicated fields; fall back
  // to the status history (latest change overall, latest 'resolved', latest 'closed').
  const sortedHistory = [...(currentTicket.statusHistory ?? [])].sort(
    (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
  );
  const latestHistory = sortedHistory[0] ?? null;
  const resolvedHistory = sortedHistory.find((h) => h.status === 'resolved') ?? null;
  const closedHistory = sortedHistory.find((h) => h.status === 'closed') ?? null;

  const updatedByActor = resolveActor(currentTicket.updatedBy) ?? resolveActor(latestHistory?.changedBy);
  const resolvedByActor = resolveActor(currentTicket.resolvedBy) ?? resolveActor(resolvedHistory?.changedBy);
  const closedByActor = resolveActor(currentTicket.closedBy) ?? resolveActor(closedHistory?.changedBy);

  const showUpdatedBy = !!updatedByActor;
  const showResolvedBy = !!currentTicket.resolvedAt;
  const showClosedBy = !!currentTicket.closedAt;
  const hasLifecycleTail = showUpdatedBy || showResolvedBy || showClosedBy;

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
                {currentTicket.priorityNumber != null && (
                  <span className="ml-1 px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant text-xs font-semibold">
                    #{currentTicket.priorityNumber}
                  </span>
                )}
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
              {assignedConsultants.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>Assigned to <span className="font-medium text-on-surface">{assignedConsultants.map((c) => `${c.firstName} ${c.lastName}`).join(', ')}</span></span>
                </div>
              )}
              {category && (
                <div className="flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" />
                  <span>{category.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {!isCustomer && <TicketAssignButton
              currentAssignment={currentAssignment}
              acceptedBy={currentTicket.acceptedBy}
              ticketId={currentTicket._id}
              userId={user?._id}
              onSuccess={handleRefreshAssignment}
            />}
            {/* Status dropdown — non-customers only */}
            {!isCustomer && (
              <div className="relative" ref={statusMenuRef}>
                <button
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                  disabled={updatingStatus}
                  className="flex items-center gap-2 h-8 px-3 rounded-[0.5rem] border border-border bg-surface-container-lowest text-sm font-medium text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updatingStatus
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin text-on-surface-variant" />
                    : <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_STYLE[currentTicket.status]?.split(' ')[0]}`} />
                  }
                  <span className="capitalize">{displayStatus}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-on-surface-variant" />
                </button>
                {showStatusMenu && (
                  <div className="absolute right-0 top-full mt-1.5 w-48 rounded-[0.75rem] bg-surface-container-lowest border border-border shadow-ambient py-1.5 z-50">
                    <p className="px-3.5 py-1.5 text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Change Status</p>
                    {ALL_STATUSES.map(s => (
                      <button
                        key={s.value}
                        onClick={() => handleStatusChange(s.value)}
                        className={`flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm font-medium transition-colors ${
                          s.value === currentTicket.status
                            ? 'text-on-surface-variant bg-surface-container-high cursor-default'
                            : 'text-on-surface hover:bg-surface-container-high'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_STYLE[s.value]?.split(' ')[0]}`} />
                        {s.label}
                        {s.value === currentTicket.status && (
                          <CheckCircle2 className="h-3.5 w-3.5 ml-auto text-on-surface-variant" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Customer: close ticket after delivery */}
            {isCustomer && currentTicket.status === 'delivered' && (
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
            {/* Sub-ticket delete */}
            {!isCustomer && currentTicket.isSubTicket && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                className="gap-1.5 text-error border-error/30 hover:bg-error/5 hover:text-error"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            )}
            <div className="relative" ref={exportMenuRef}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                Export
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
              {showExportMenu && (
                <div className="absolute right-0 mt-1.5 w-44 rounded-[0.75rem] glass shadow-ambient py-1.5 z-50">
                  <p className="px-3.5 py-1.5 text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Export as</p>
                  <button
                    onClick={() => { handleExportExcel(); setShowExportMenu(false); }}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container-highest transition-colors"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-on-surface-variant" />
                    Excel
                  </button>
                  <button
                    onClick={() => { handleExportCSV(); setShowExportMenu(false); }}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container-highest transition-colors"
                  >
                    <FileCsv className="h-4 w-4 text-on-surface-variant" />
                    CSV
                  </button>
                  <button
                    onClick={() => { handleExportPDF(); setShowExportMenu(false); }}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container-highest transition-colors"
                  >
                    <FileText className="h-4 w-4 text-on-surface-variant" />
                    PDF
                  </button>
                </div>
              )}
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
            {tab === 'attachments' ? (
              <span className="flex items-center gap-1.5">
                Attachments
                {total > 0 && (
                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === 'attachments' ? 'bg-brand-500 text-white' : 'bg-surface-container-high text-on-surface-variant'
                  }`}>
                    {total}
                  </span>
                )}
              </span>
            ) : tab}
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
            {['resolved', 'closed', 'delivered'].includes(currentTicket.status) && (
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
            {/* Lifecycle */}
            <div className="bg-surface-container-lowest rounded-[1rem] p-6">
              <h3 className="label-technical mb-5 flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                Lifecycle
              </h3>
              <div className="space-y-0">
                {/* Created by */}
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-brand-500 mt-1 shrink-0" />
                    <div className="w-px flex-1 bg-surface-container-high mt-1" />
                  </div>
                  <div className="pb-5 min-w-0">
                    <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Created by</p>
                    <p className="text-sm font-semibold text-on-surface truncate mt-0.5">
                      {(() => {
                        // Sub-tickets are always created by a consultant
                        if (currentTicket.isSubTicket) {
                          if (createdByConsultant) return `${createdByConsultant.firstName} ${createdByConsultant.lastName}`;
                          const ab = currentTicket.assignedBy;
                          if (ab && typeof ab !== 'string') return `${ab.firstName} ${ab.lastName}`;
                          return 'Consultant';
                        }
                        const cbt = currentTicket.createdByType;
                        if (cbt === 'consultant') {
                          return createdByConsultant
                            ? `${createdByConsultant.firstName} ${createdByConsultant.lastName}`
                            : 'Consultant';
                        }
                        if (cbt === 'customer') {
                          return customer?.contactPerson || customer?.companyName || '—';
                        }
                        // Legacy tickets without createdByType
                        if (customer) return customer.contactPerson || customer.companyName;
                        const cb = currentTicket.assignedBy;
                        if (cb && typeof cb !== 'string') return `${cb.firstName} ${cb.lastName}`;
                        return '—';
                      })()}
                    </p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {new Date(currentTicket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {' · '}
                      {new Date(currentTicket.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* Assigned by */}
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${assignedByConsultant ? 'bg-accent-orange-500' : 'bg-surface-container-high border border-surface-container-highest'}`} />
                    {firstConsultant && <div className="w-px flex-1 bg-surface-container-high mt-1" />}
                  </div>
                  <div className={`min-w-0 ${firstConsultant ? 'pb-5' : ''}`}>
                    <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Assigned by</p>
                    {assignedByConsultant ? (
                      <>
                        <p className="text-sm font-semibold text-on-surface truncate mt-0.5">
                          {assignedByConsultant.firstName} {assignedByConsultant.lastName}
                        </p>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          {(() => {
                            const d = currentAssignment?.assignedAt || currentTicket.acceptedAt;
                            return d ? (
                              <>
                                {new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                {' · '}
                                {new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </>
                            ) : '—';
                          })()}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-on-surface-variant mt-0.5 italic">Not yet assigned</p>
                    )}
                  </div>
                </div>

                {/* Assigned to */}
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${assignedConsultants.length > 0 ? 'bg-green-500' : 'bg-surface-container-high border border-surface-container-highest'}`} />
                    {hasLifecycleTail && <div className="w-px flex-1 bg-surface-container-high mt-1" />}
                  </div>
                  <div className={`min-w-0 ${hasLifecycleTail ? 'pb-5' : ''}`}>
                    <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Assigned to</p>
                    {assignedConsultants.length > 0 ? (
                      <div className="mt-1 space-y-1">
                        {assignedConsultants.map((c) => (
                          <div key={c._id} className="flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-green-500 shrink-0" />
                            <p className="text-sm font-semibold text-on-surface truncate">{c.firstName} {c.lastName}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-on-surface-variant mt-0.5 italic">Not yet assigned</p>
                    )}
                  </div>
                </div>

                {/* Last updated by */}
                {showUpdatedBy && (
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-brand-400 mt-1 shrink-0" />
                      {(showResolvedBy || showClosedBy) && <div className="w-px flex-1 bg-surface-container-high mt-1" />}
                    </div>
                    <div className={`min-w-0 ${showResolvedBy || showClosedBy ? 'pb-5' : ''}`}>
                      <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Last updated by</p>
                      <p className="text-sm font-semibold text-on-surface truncate mt-0.5">
                        {updatedByActor!.firstName} {updatedByActor!.lastName}
                      </p>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        {new Date(currentTicket.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' · '}
                        {new Date(currentTicket.updatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )}

                {/* Resolved by */}
                {showResolvedBy && (
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-1 shrink-0" />
                      {showClosedBy && <div className="w-px flex-1 bg-surface-container-high mt-1" />}
                    </div>
                    <div className={`min-w-0 ${showClosedBy ? 'pb-5' : ''}`}>
                      <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Resolved by</p>
                      <p className="text-sm font-semibold text-on-surface truncate mt-0.5">
                        {resolvedByActor ? `${resolvedByActor.firstName} ${resolvedByActor.lastName}` : '—'}
                      </p>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        {new Date(currentTicket.resolvedAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' · '}
                        {new Date(currentTicket.resolvedAt!).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )}

                {/* Closed by */}
                {showClosedBy && (
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-surface-container-highest border border-surface-container-highest mt-1 shrink-0" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Closed by</p>
                      <p className="text-sm font-semibold text-on-surface truncate mt-0.5">
                        {closedByActor ? `${closedByActor.firstName} ${closedByActor.lastName}` : '—'}
                      </p>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        {new Date(currentTicket.closedAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' · '}
                        {new Date(currentTicket.closedAt!).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Timeline */}
            <div className="bg-surface-container-lowest rounded-[1rem] p-6">
              <h3 className="label-technical mb-5 flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                Timeline
              </h3>
              <div className="space-y-5">
                <TimelineEntry label="Created" date={currentTicket.createdAt} color="brand" />
                <TimelineEntry label="Last Updated" date={currentTicket.updatedAt} color="green" />
                {currentAssignment?.updatedAt && currentAssignment.updatedAt !== currentAssignment.createdAt && (
                  <TimelineEntry label="Assignment Updated" date={currentAssignment.updatedAt} color="blue" />
                )}
                {currentAssignment?.assignedAt && (
                  <TimelineEntry label="Assigned At" date={currentAssignment.assignedAt} color="orange" />
                )}
                {currentTicket.acceptedAt && <TimelineEntry label="Accepted" date={currentTicket.acceptedAt} color="blue" />}
                {currentTicket.startDate && <TimelineEntry label="Start Date" date={currentTicket.startDate} color="orange" />}
                {currentTicket.estimationStartDate && <TimelineEntry label="Estimation Start" date={currentTicket.estimationStartDate} color="blue" />}
                {currentTicket.deliveryEstimationDate && <TimelineEntry label="Delivery Date" date={currentTicket.deliveryEstimationDate} color="red" />}
                {currentTicket.resolvedAt && <TimelineEntry label="Resolved" date={currentTicket.resolvedAt} color="green" />}
                {currentTicket.closedAt && <TimelineEntry label="Closed" date={currentTicket.closedAt} color="gray" />}
              </div>
            </div>

            {/* Properties */}
            {(environment || feature || department || productType || serviceType || scopes.length > 0 || source) && (
              <div className="bg-surface-container-lowest rounded-[1rem] p-6">
                <h3 className="label-technical mb-5 flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5" />
                  Properties
                </h3>
                <div className="space-y-4">
                  {environment && <PropertyRow icon={Server} label="Environment" value={environment.name} />}
                  {feature && <PropertyRow icon={Sparkles} label="Customized Solution" value={feature.name} />}
                  {department && <PropertyRow icon={Building2} label="Department" value={department.name} />}
                  {productType && <PropertyRow icon={Package} label="Product" value={productType.name} />}
                  {serviceType && <PropertyRow icon={Wrench} label="Service" value={serviceType.name} />}
                  {scopes.length > 0 && (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-on-surface-variant shrink-0">
                        <Target className="h-3.5 w-3.5" />
                        <span className="text-xs">Module</span>
                      </div>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {scopes.map((s: any) => (
                          <span
                            key={s._id}
                            className="text-xs font-semibold bg-surface-container px-2 py-0.5 rounded-md text-on-surface"
                          >
                            {s.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
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

            {/* AI Insights Panel — consultants and team members only */}
            {!isCustomer && <TicketIntelligencePanel ticket={currentTicket} />}
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

// Stable component — never conditionally rendered, so no mount/unmount during assignment updates
function TicketAssignButton({
  currentAssignment,
  acceptedBy,
  ticketId,
  userId,
  onSuccess,
}: {
  currentAssignment: any;
  acceptedBy: any;
  ticketId: string;
  userId?: string;
  onSuccess: () => void;
}) {
  const formalIds: string[] = (currentAssignment?.assignedToConsultants ?? []).map(
    (ca: any) => typeof ca.consultant === 'string' ? ca.consultant : ca.consultant._id
  );
  const acceptedById = acceptedBy
    ? typeof acceptedBy === 'string' ? acceptedBy : acceptedBy._id
    : null;
  const assignedIds = [...new Set([...formalIds, ...(acceptedById ? [acceptedById] : [])])];
  const hasConsultants = assignedIds.length > 0;

  const assignedBy = currentAssignment?.assignedByConsultant;
  const assignedByName = assignedBy && typeof assignedBy !== 'string'
    ? `${assignedBy.firstName} ${assignedBy.lastName}`
    : undefined;

  return (
    <AssignConsultantsDialog
      assignmentId={currentAssignment?._id}
      ticketId={ticketId}
      assignedByConsultantId={userId}
      assignedByName={assignedByName}
      currentConsultants={assignedIds}
      mode={hasConsultants ? 'reassign' : 'assign'}
      onSuccess={onSuccess}
    />
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
