import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchTickets, deleteTicket } from '@/redux/slices/ticketSlice';
import { fetchServiceTypes } from '@/redux/slices/serviceTypeSlice';
import { fetchConsultants } from '@/redux/slices/consultantSlice';
import { fetchCustomers } from '@/redux/slices/customerSlice';
import { fetchCompanies } from '@/redux/slices/companySlice';
import { fetchCategories } from '@/redux/slices/categorySlice';
import { fetchDepartments } from '@/redux/slices/departmentSlice';
import { fetchModules } from '@/redux/slices/moduleSlice';
import { fetchSources } from '@/redux/slices/sourceSlice';
import { fetchCustomizedSolutions } from '@/redux/slices/customizedSolutionSlice';
import TicketTable from '@/pages/tickets/components/TicketTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MultiSelect } from '@/components/ui/custom-select';
import {
  ChevronLeft, ChevronRight, CalendarDays,
  Search, SlidersHorizontal, ChevronDown, ChevronUp, Calendar, X,
  Download, FileSpreadsheet, FileText, MoreVertical, Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Ticket, Category, Consultant as TicketConsultant } from '@/types/ticket';
import { getTickets } from '@/api/ticketApi';

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];
const MEETING_CATEGORY_NAMES = ['Online Meeting', 'On Site Meeting'];

export default function MeetingTickets() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const { tickets, loading, total, page, pages } = useAppSelector((s) => s.tickets);
  const { user, userType, customerRole } = useAppSelector((s) => s.auth);
  const { sources }      = useAppSelector((s) => s.sources);
  const { consultants }  = useAppSelector((s) => s.consultants);
  const { customers }    = useAppSelector((s) => s.customers);
  const { companies }    = useAppSelector((s) => s.companies);
  const { departments }  = useAppSelector((s) => s.departments);
  const { modules }      = useAppSelector((s) => s.modules);
  const { categories }   = useAppSelector((s) => s.categories);
  const { customizedSolutions } = useAppSelector((s) => s.customizedSolutions);
  const { serviceTypes } = useAppSelector((s) => s.serviceTypes);

  const isConsultant = userType === 'consultant';
  const isCustomer   = userType === 'customer';

  const meetingCategoryIds = (categories ?? [])
    .filter((c) => MEETING_CATEGORY_NAMES.some((n) => c.name.toLowerCase() === n.toLowerCase()))
    .map((c) => c._id);
  const meetingCategoryIdsKey = meetingCategoryIds.join(',');

  // ── URL param helpers ──────────────────────────────────────────────────────
  const sp      = (key: string, def = '') => searchParams.get(key) ?? def;
  const spArray = (key: string): string[] => {
    const v = searchParams.get(key);
    return v ? v.split(',').filter(Boolean) : [];
  };

  const searchTerm       = sp('q');
  const statusFilter     = spArray('status');
  const priorityFilter   = spArray('priority');
  const sourceFilter     = spArray('source');
  const departmentFilter = spArray('department');
  const consultantFilter = spArray('consultant');
  const customerFilter   = spArray('customer');
  const companyFilter    = spArray('company');
  const moduleFilter     = spArray('module');
  const featureFilter    = spArray('feature');
  const weekFilter       = spArray('week');
  const itemsPerPage     = Number(sp('limit', String(PAGE_SIZE_OPTIONS[0])));
  const currentPage      = Math.max(1, Number(sp('page', '1')));
  const createdDateFrom  = sp('createdFrom');
  const createdDateTo    = sp('createdTo');
  const updatedDateFrom  = sp('updatedFrom');
  const updatedDateTo    = sp('updatedTo');
  const resolvedDateFrom = sp('resolvedFrom');
  const resolvedDateTo   = sp('resolvedTo');
  const closedDateFrom   = sp('closedFrom');
  const closedDateTo     = sp('closedTo');
  const deliveryDateFrom = sp('deliveryFrom');
  const deliveryDateTo   = sp('deliveryTo');
  const acceptedDateFrom = sp('acceptedFrom');
  const acceptedDateTo   = sp('acceptedTo');

  const [searchInput, setSearchInput] = useState(searchTerm);
  useEffect(() => { setSearchInput(searchTerm); }, [searchTerm]);

  const updateFilters = useCallback((updates: Record<string, string | string[]>, resetPage = true) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(updates)) {
        if (Array.isArray(value)) { value.length ? next.set(key, value.join(',')) : next.delete(key); }
        else { value ? next.set(key, value) : next.delete(key); }
      }
      if (resetPage) next.set('page', '1');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const activeAdvancedCount = [
    departmentFilter.length > 0, consultantFilter.length > 0,
    customerFilter.length > 0, companyFilter.length > 0,
    moduleFilter.length > 0, featureFilter.length > 0,
    weekFilter.length > 0,
    Boolean(createdDateFrom), Boolean(createdDateTo),
    Boolean(updatedDateFrom), Boolean(updatedDateTo),
    Boolean(resolvedDateFrom), Boolean(resolvedDateTo),
    Boolean(closedDateFrom), Boolean(closedDateTo),
    Boolean(deliveryDateFrom), Boolean(deliveryDateTo),
    Boolean(acceptedDateFrom), Boolean(acceptedDateTo),
  ].filter(Boolean).length;

  const [showAdvanced, setShowAdvanced] = useState(() => activeAdvancedCount > 0);

  const getCustomerScopeParams = () => {
    if (userType !== 'customer') return {};
    if (customerRole === 'company_admin') {
      const n = (user as any)?.companyName;
      return n ? { companyName: n } : {};
    }
    return user?._id ? { customer: user._id } : {};
  };

  // ── Load supporting data ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isCustomer) {
      dispatch(fetchServiceTypes({ limit: 1000 }));
      dispatch(fetchConsultants({ limit: 1000 }));
      dispatch(fetchCustomers({ limit: 1000 }));
      dispatch(fetchCompanies({ limit: 1000 }));
      dispatch(fetchDepartments({ limit: 1000 }));
      dispatch(fetchModules({ limit: 1000 }));
      dispatch(fetchSources({ isActive: true, limit: 1000 }));
    }
    dispatch(fetchCategories({ limit: 9999 }));
    dispatch(fetchCustomizedSolutions({ limit: 9999 }));
  }, [isCustomer]);

  // ── Build params ───────────────────────────────────────────────────────────
  const buildParams = useCallback((p: number, extra: Record<string, any> = {}) => {
    if (!meetingCategoryIdsKey) return null;
    const params: any = { page: p, limit: itemsPerPage, category: meetingCategoryIdsKey, ...extra };
    if (searchTerm)              params.search             = searchTerm;
    if (statusFilter.length)     params.status             = statusFilter.join(',');
    if (priorityFilter.length)   params.priority           = priorityFilter.join(',');
    if (sourceFilter.length)     params.source             = sourceFilter.join(',');
    if (departmentFilter.length) params.department         = departmentFilter.join(',');
    if (consultantFilter.length) params.assignedConsultant = consultantFilter.join(',');
    if (customerFilter.length)   params.customer           = customerFilter.join(',');
    if (companyFilter.length)    params.companyName        = companyFilter.join(',');
    if (moduleFilter.length)     params.scope              = moduleFilter.join(',');
    if (featureFilter.length)    params.feature            = featureFilter.join(',');
    if (weekFilter.length)       params.scheduledWeek      = weekFilter.join(',');
    if (createdDateFrom)         params.createdDateFrom    = createdDateFrom;
    if (createdDateTo)           params.createdDateTo      = createdDateTo;
    if (updatedDateFrom)         params.updatedDateFrom    = updatedDateFrom;
    if (updatedDateTo)           params.updatedDateTo      = updatedDateTo;
    if (resolvedDateFrom)        params.resolvedDateFrom   = resolvedDateFrom;
    if (resolvedDateTo)          params.resolvedDateTo     = resolvedDateTo;
    if (closedDateFrom)          params.closedDateFrom     = closedDateFrom;
    if (closedDateTo)            params.closedDateTo       = closedDateTo;
    if (deliveryDateFrom)        params.deliveryDateFrom   = deliveryDateFrom;
    if (deliveryDateTo)          params.deliveryDateTo     = deliveryDateTo;
    if (acceptedDateFrom)        params.acceptedDateFrom   = acceptedDateFrom;
    if (acceptedDateTo)          params.acceptedDateTo     = acceptedDateTo;
    Object.assign(params, getCustomerScopeParams());
    return params;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString(), meetingCategoryIdsKey, user?._id]);

  // ── Fetch on filter/page/category change ──────────────────────────────────
  useEffect(() => {
    const params = buildParams(currentPage);
    if (!params) return;
    dispatch(fetchTickets(params));
  }, [buildParams, currentPage]);

  const handleDelete = async (id: string) => {
    try {
      await dispatch(deleteTicket(id)).unwrap();
      toast.success('Ticket deleted successfully!');
      const params = buildParams(currentPage);
      if (params) dispatch(fetchTickets(params));
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete ticket');
    }
  };

  const handlePageChange = (p: number) => {
    setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('page', String(p)); return n; }, { replace: true });
  };

  const handleReset = () => { setSearchParams(new URLSearchParams(), { replace: true }); setSearchInput(''); };

  const totalActiveFilters = [
    statusFilter.length > 0, priorityFilter.length > 0, sourceFilter.length > 0,
    ...Array(activeAdvancedCount).fill(true),
  ].filter(Boolean).length;

  // ── Pagination ─────────────────────────────────────────────────────────────
  const startItem = (page - 1) * itemsPerPage + 1;
  const endItem   = Math.min(page * itemsPerPage, total);
  const getPageNumbers = () => {
    const maxV = 5;
    let start = Math.max(1, page - Math.floor(maxV / 2));
    const end = Math.min(pages, start + maxV - 1);
    start = Math.max(1, end - maxV + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  // ── Export ─────────────────────────────────────────────────────────────────
  const EXPORT_HEADERS = [
    'Sub Tickets', 'Ticket #', 'Parent Ticket #', 'Status', 'Subject',
    'Company', 'Created By', 'Assignee', 'Assigned By', 'Category',
    'Service Type', 'Priority', 'Priority #', 'Duration (hrs)', 'Week', 'Module',
    'Created Date', 'Assigned Date', 'Delivery Date',
    'Last Updated', 'Resolved Date', 'Closed Date', 'Customer Name', 'Type',
  ];
  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  const getExportRow = (t: Ticket): string[] => {
    const cust      = typeof t.customer === 'object' && t.customer ? t.customer as any : null;
    const cat       = typeof t.category === 'object' && t.category ? t.category as Category : null;
    const st        = typeof t.serviceType === 'object' && t.serviceType ? t.serviceType as any : null;
    const assignee  = typeof t.acceptedBy === 'object' && t.acceptedBy ? t.acceptedBy as TicketConsultant : null;
    const assignedBy = typeof t.assignedBy === 'object' && t.assignedBy ? t.assignedBy as TicketConsultant : null;
    const createdByRaw = t.createdByConsultant ?? (t.isSubTicket ? t.assignedBy : undefined);
    const createdBy  = typeof createdByRaw === 'object' && createdByRaw ? createdByRaw as TicketConsultant : null;
    const parent     = typeof t.parentTicket === 'object' && t.parentTicket ? t.parentTicket as Ticket : null;
    const scope      = Array.isArray(t.scope) ? (t.scope as any[]).filter(s => s && typeof s === 'object').map(s => s.name).join(', ') : '';
    return [
      t.isSubTicket ? '' : String((t.subTickets as any[])?.length ?? 0),
      t.ticketNumber, parent?.ticketNumber ?? '',
      t.status.replace(/_/g, ' '), t.subject,
      cust?.companyName ?? '',
      createdBy ? `${createdBy.firstName} ${createdBy.lastName}` : '',
      assignee ? `${assignee.firstName} ${assignee.lastName}` : '',
      assignedBy ? `${assignedBy.firstName} ${assignedBy.lastName}` : '',
      cat?.name ?? '', st?.name ?? '', t.priority,
      t.priorityNumber != null ? String(t.priorityNumber) : '',
      t.durationHours != null ? String(t.durationHours) : '',
      t.scheduledWeek != null ? String(t.scheduledWeek) : '',
      scope, fmtDate(t.createdAt), fmtDate(t.acceptedAt),
      fmtDate(t.deliveryEstimationDate), fmtDate(t.updatedAt),
      fmtDate(t.resolvedAt), fmtDate(t.closedAt),
      cust?.contactPerson ?? '', t.isSubTicket ? 'Sub-ticket' : 'Main Ticket',
    ];
  };
  const orderForExport = (all: Ticket[]) => {
    const mains = all.filter(t => !t.isSubTicket);
    const subMap = new Map<string, Ticket[]>();
    all.filter(t => t.isSubTicket).forEach(t => {
      const pid = typeof t.parentTicket === 'object' && t.parentTicket ? (t.parentTicket as Ticket)._id : String(t.parentTicket ?? '');
      if (!subMap.has(pid)) subMap.set(pid, []);
      subMap.get(pid)!.push(t);
    });
    const out: Ticket[] = [];
    mains.forEach(m => { out.push(m); (subMap.get(m._id) ?? []).forEach(s => out.push(s)); });
    return out;
  };
  const buildExportParams = () => {
    const p = buildParams(1, { limit: 9999, includeSubTickets: true });
    if (p) { p.page = undefined; p.limit = 9999; }
    return p;
  };
  const today = new Date().toISOString().split('T')[0];
  const handleExportCSV = async () => {
    try {
      toast.info('Preparing CSV export…');
      const p = buildExportParams(); if (!p) return;
      const res = await getTickets(p);
      const data = orderForExport(res.data);
      const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
      saveAs(new Blob([[EXPORT_HEADERS.map(esc).join(','), ...data.map(t => getExportRow(t).map(esc).join(','))].join('\n')], { type: 'text/csv;charset=utf-8;' }), `meeting-tickets-${today}.csv`);
    } catch { toast.error('Failed to export CSV'); }
  };
  const handleExportExcel = async () => {
    try {
      toast.info('Preparing Excel export…');
      const p = buildExportParams(); if (!p) return;
      const res = await getTickets(p);
      const rows = orderForExport(res.data).map(t => getExportRow(t));
      const ws = XLSX.utils.aoa_to_sheet([EXPORT_HEADERS, ...rows]);
      ws['!cols'] = EXPORT_HEADERS.map((h, i) => ({ wch: Math.max(h.length, ...rows.map(r => String(r[i] ?? '').length)) + 2 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Meeting Tickets');
      saveAs(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `meeting-tickets-${today}.xlsx`);
    } catch { toast.error('Failed to export Excel'); }
  };
  const handleExportPDF = async () => {
    try {
      toast.info('Preparing PDF export…');
      const p = buildExportParams(); if (!p) return;
      const res = await getTickets(p);
      const data = orderForExport(res.data);
      const doc = new jsPDF('landscape');
      doc.setFontSize(16); doc.text('Meeting Tickets Report', 14, 18);
      doc.setFontSize(9); doc.text(`Generated: ${new Date().toLocaleString()}  |  Total: ${data.length}`, 14, 25);
      autoTable(doc, { head: [EXPORT_HEADERS], body: data.map(t => getExportRow(t)), startY: 30, styles: { fontSize: 7, cellPadding: 2 }, headStyles: { fillColor: [0, 58, 143], fontSize: 7 }, alternateRowStyles: { fillColor: [245, 247, 250] } });
      doc.save(`meeting-tickets-${today}.pdf`);
    } catch { toast.error('Failed to export PDF'); }
  };

  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) setShowActionsMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="p-8 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
            <CalendarDays className="h-5 w-5 text-brand-600" />
          </div>
          <div>
            <h1 className="display-sm text-on-surface">Meeting Tickets</h1>
            <p className="text-on-surface-variant mt-0.5">
              Tickets in <span className="font-semibold">Online Meeting</span> &amp; <span className="font-semibold">On Site Meeting</span> categories
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative" ref={actionsMenuRef}>
            <button onClick={() => setShowActionsMenu(v => !v)}
              className="p-2.5 rounded-[0.75rem] text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
              aria-label="More actions">
              <MoreVertical className="h-5 w-5" />
            </button>
            {showActionsMenu && (
              <div className="absolute right-0 mt-1.5 w-48 rounded-[0.75rem] glass shadow-ambient py-1.5 z-50">
                <p className="px-3.5 py-1.5 text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Export as</p>
                <button onClick={() => { handleExportCSV(); setShowActionsMenu(false); }} className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container-highest transition-colors">
                  <Download className="h-4 w-4 text-on-surface-variant" /> CSV
                </button>
                <button onClick={() => { handleExportExcel(); setShowActionsMenu(false); }} className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container-highest transition-colors">
                  <FileSpreadsheet className="h-4 w-4 text-on-surface-variant" /> Excel
                </button>
                <button onClick={() => { handleExportPDF(); setShowActionsMenu(false); }} className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container-highest transition-colors">
                  <FileText className="h-4 w-4 text-on-surface-variant" /> PDF
                </button>
              </div>
            )}
          </div>
          <Button onClick={() => navigate('/tickets/create')} className="gap-2">
            <Plus className="h-4 w-4" /> New Ticket
          </Button>
        </div>
      </div>

      {/* Filter Card */}
      <div className="bg-surface-container-lowest rounded-[1rem]">
        <div className="p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
            <Input type="search" placeholder="Search by subject, ticket number..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && updateFilters({ q: searchInput })}
              className="pl-10" />
          </div>

          <MultiSelect values={statusFilter} onChange={(v) => updateFilters({ status: v })} label="Status" className="min-w-[160px]"
            options={[
              { value: 'new', label: 'New' }, { value: 'assigned', label: 'Assigned' },
              { value: 'in_progress', label: 'In Progress' }, { value: 'customer_pending', label: 'Customer Pending' },
              { value: 'resolved', label: 'Resolved' }, { value: 'tested', label: 'Tested' },
              { value: 'delivered', label: 'Delivered' }, { value: 'closed', label: 'Closed' },
              { value: 'not_related', label: 'Not Related' },
            ]} />

          <MultiSelect values={priorityFilter} onChange={(v) => updateFilters({ priority: v })} label="Priority" className="min-w-[140px]"
            options={[
              { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' }, { value: 'critical', label: 'Critical' },
            ]} />

          <button onClick={() => setShowAdvanced(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-[0.75rem] text-sm font-semibold transition-all ${
              showAdvanced || activeAdvancedCount > 0
                ? 'bg-brand-50 text-brand-600 ring-1 ring-brand-200'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}>
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeAdvancedCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-brand-500 text-white text-[10px] font-bold leading-none">
                {activeAdvancedCount}
              </span>
            )}
            {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {totalActiveFilters > 0 && (
            <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-2 rounded-[0.75rem] text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors">
              <X className="h-3.5 w-3.5" /> Clear all
            </button>
          )}
        </div>

        {showAdvanced && (
          <div className="px-4 pb-4">
            <div className="bg-surface-container-low rounded-[0.75rem] p-4 space-y-4">
              <div>
                <p className="text-xs font-medium text-on-surface-variant mb-3">Filter by</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  <MultiSelect values={sourceFilter} onChange={(v) => updateFilters({ source: v })} label="Source"
                    options={sources?.filter(s => s.isActive).map(s => ({ value: s._id, label: s.name })) || []} />
                  <MultiSelect values={departmentFilter} onChange={(v) => updateFilters({ department: v })} label="Department"
                    options={departments?.filter(d => d.isActive).map(d => ({ value: d._id, label: d.name })) || []} />
                  <MultiSelect values={consultantFilter} onChange={(v) => updateFilters({ consultant: v })} label="Assigned To"
                    options={consultants?.map(c => ({ value: c._id, label: `${c.firstName} ${c.lastName}` })) || []} />
                  <MultiSelect values={customerFilter} onChange={(v) => updateFilters({ customer: v })} label="Customer"
                    options={customers?.map(c => ({ value: c._id, label: c.contactPerson })) || []} />
                  <MultiSelect values={companyFilter} onChange={(v) => updateFilters({ company: v })} label="Company"
                    options={companies?.map(c => ({ value: c.name, label: c.name })) ?? []} />
                  <MultiSelect values={moduleFilter} onChange={(v) => updateFilters({ module: v })} label="Module"
                    options={modules?.map(m => ({ value: m._id, label: m.name })) ?? []} />
                  <MultiSelect values={featureFilter} onChange={(v) => updateFilters({ feature: v })} label="Customized Solution"
                    options={customizedSolutions?.map(f => ({ value: f._id, label: f.name })) ?? []} />
                  {isConsultant && (
                    <MultiSelect values={weekFilter} onChange={(v) => updateFilters({ week: v })} label="Scheduled Week"
                      options={Array.from({ length: 52 }, (_, i) => ({ value: String(i + 1), label: `Week ${i + 1}` }))} />
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-on-surface-variant mb-3 flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" /> Date range
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                  {[
                    { label: 'Created',       from: createdDateFrom,  to: createdDateTo,  fk: 'createdFrom',  tk: 'createdTo'  },
                    { label: 'Last Updated',  from: updatedDateFrom,  to: updatedDateTo,  fk: 'updatedFrom',  tk: 'updatedTo'  },
                    { label: 'Resolved',      from: resolvedDateFrom, to: resolvedDateTo, fk: 'resolvedFrom', tk: 'resolvedTo' },
                    { label: 'Closed',        from: closedDateFrom,   to: closedDateTo,   fk: 'closedFrom',   tk: 'closedTo'   },
                    { label: 'Delivery Date', from: deliveryDateFrom, to: deliveryDateTo, fk: 'deliveryFrom', tk: 'deliveryTo' },
                    { label: 'Accepted Date', from: acceptedDateFrom, to: acceptedDateTo, fk: 'acceptedFrom', tk: 'acceptedTo' },
                  ].map(({ label, from, to, fk, tk }) => (
                    <div key={label} className="space-y-2">
                      <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide">{label}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-xs text-on-surface-variant">From</label>
                          <Input type="date" value={from} onChange={(e) => updateFilters({ [fk]: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-on-surface-variant">To</label>
                          <Input type="date" value={to} onChange={(e) => updateFilters({ [tk]: e.target.value })} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="px-4 pb-3">
          <p className="text-xs text-on-surface-variant">
            <span className="font-semibold text-on-surface">{total.toLocaleString()}</span> tickets
            {totalActiveFilters > 0 && <span> · <span className="font-medium">{totalActiveFilters} filter{totalActiveFilters > 1 ? 's' : ''}</span> active</span>}
          </p>
        </div>
      </div>

      {/* Table */}
      <TicketTable tickets={tickets} onDelete={handleDelete} loading={loading} />

      {/* Pagination */}
      {total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <p className="text-sm text-on-surface-variant">
              Showing <span className="font-semibold text-on-surface">{startItem}–{endItem}</span> of{' '}
              <span className="font-semibold text-on-surface">{total.toLocaleString()}</span> results
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-on-surface-variant">Per page:</span>
              <select value={itemsPerPage} onChange={(e) => updateFilters({ limit: e.target.value })}
                className="h-7 px-2 pr-6 rounded-[0.5rem] text-xs font-semibold bg-surface-container-lowest border border-border text-on-surface focus:outline-none focus:ring-2 focus:ring-brand-500/30 cursor-pointer appearance-none">
                {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => handlePageChange(page - 1)} disabled={page <= 1}
              className="p-2 rounded-[0.75rem] bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            {getPageNumbers().map(n => (
              <button key={n} onClick={() => handlePageChange(n)} aria-current={n === page ? 'page' : undefined}
                className={`min-w-[36px] h-9 rounded-[0.75rem] text-sm font-semibold transition-colors ${n === page ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high'}`}>
                {n}
              </button>
            ))}
            <button onClick={() => handlePageChange(page + 1)} disabled={page >= pages}
              className="p-2 rounded-[0.75rem] bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
