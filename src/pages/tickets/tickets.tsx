import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchTickets, deleteTicket } from '@/redux/slices/ticketSlice';
import { fetchConsultants } from '@/redux/slices/consultantSlice';
import { fetchCustomers } from '@/redux/slices/customerSlice';
import { fetchCompanies } from '@/redux/slices/companySlice';
import { fetchDepartments } from '@/redux/slices/departmentSlice';
import { fetchServiceTypes } from '@/redux/slices/serviceTypeSlice';
import { fetchCategories } from '@/redux/slices/categorySlice';
import { fetchCustomizedSolutions } from '@/redux/slices/customizedSolutionSlice';
import TicketTable from './components/TicketTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MultiSelect } from '@/components/ui/custom-select';
import { fetchSources } from '@/redux/slices/sourceSlice';
import { fetchModules } from '@/redux/slices/moduleSlice';
import { Plus, Search, Download, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, FileText, FileSpreadsheet, SlidersHorizontal, Calendar, X, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Ticket, Category, Consultant as TicketConsultant } from '@/types/ticket';
import { getTickets } from '@/api/ticketApi';

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

export default function Tickets() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const { tickets, loading, total, page, pages } = useAppSelector((state) => state.tickets);
  const { user, userType, customerRole } = useAppSelector((state) => state.auth);
  const isConsultant = userType === 'consultant';
  const { sources } = useAppSelector((state) => state.sources);
  const { consultants } = useAppSelector((state) => state.consultants);
  const { customers } = useAppSelector((state) => state.customers);
  const { companies } = useAppSelector((state) => state.companies);
  const { departments } = useAppSelector((state) => state.departments);
  const { serviceTypes } = useAppSelector((state) => state.serviceTypes);
  const { modules } = useAppSelector((state) => state.modules);
  const { categories } = useAppSelector((state) => state.categories);
  const { customizedSolutions } = useAppSelector((state) => state.customizedSolutions);

  // Returns the scoping params based on customer role:
  // - company_admin → filter by companyName (sees all company tickets)
  // - company_user  → filter by customer ID (sees only own tickets)
  const getCustomerScopeParams = () => {
    if (userType !== 'customer') return {};
    if (customerRole === 'company_admin') {
      const companyName = (user as any)?.companyName;
      return companyName ? { companyName } : {};
    }
    return user?._id ? { customer: user._id } : {};
  };

  // --- URL param helpers ---
  const sp = (key: string, def = '') => searchParams.get(key) ?? def;
  const spArray = (key: string): string[] => {
    const val = searchParams.get(key);
    return val ? val.split(',').filter(Boolean) : [];
  };

  const searchTerm        = sp('q');
  const statusFilter      = spArray('status');
  const priorityFilter    = spArray('priority');
  const sourceFilter      = spArray('source');
  const itemsPerPage      = Number(sp('limit', String(PAGE_SIZE_OPTIONS[0])));
  const departmentFilter  = spArray('department');
  const assignedByFilter  = spArray('consultant');
  const serviceTypeFilter = spArray('serviceType');
  const customerFilter    = spArray('customer');
  const companyFilter     = spArray('company');
  const moduleFilter           = spArray('module');
  const categoryFilter         = spArray('category');
  const serviceTypeNameFilter       = sp('serviceTypeName');
  const categoryNamesFilter         = spArray('categoryNames');
  const excludeServiceTypeNames     = spArray('excludeServiceTypeNames');
  const excludeCategoryNames        = spArray('excludeCategoryNames');
  const featureFilter          = spArray('feature');
  const weekFilter             = spArray('week');
  const createdDateFrom    = sp('createdFrom');
  const createdDateTo      = sp('createdTo');
  const closedDateFrom     = sp('closedFrom');
  const closedDateTo       = sp('closedTo');
  const resolvedDateFrom   = sp('resolvedFrom');
  const resolvedDateTo     = sp('resolvedTo');
  const deliveryDateFrom   = sp('deliveryFrom');
  const deliveryDateTo     = sp('deliveryTo');
  const acceptedDateFrom   = sp('acceptedFrom');
  const acceptedDateTo     = sp('acceptedTo');
  const updatedDateFrom    = sp('updatedFrom');
  const updatedDateTo      = sp('updatedTo');
  const currentPage        = Math.max(1, Number(sp('page', '1')));

  // Local buffer for the search input — committed to URL on Enter / Search button
  const [searchInput, setSearchInput] = useState(searchTerm);

  // Sync local input if URL param is cleared externally (e.g. "Clear all")
  useEffect(() => {
    setSearchInput(searchTerm);
  }, [searchTerm]);

  // Update one or more URL filter params (supports both string and string[])
  const updateFilters = useCallback((updates: Record<string, string | string[]>, resetPage = true) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(updates)) {
        if (Array.isArray(value)) {
          if (value.length > 0) next.set(key, value.join(','));
          else next.delete(key);
        } else {
          if (value) next.set(key, value);
          else next.delete(key);
        }
      }
      if (resetPage) next.set('page', '1');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const activeAdvancedFilterCount = [
    departmentFilter.length > 0,
    assignedByFilter.length > 0,
    serviceTypeFilter.length > 0,
    customerFilter.length > 0,
    companyFilter.length > 0,
    moduleFilter.length > 0,
    categoryFilter.length > 0,
    featureFilter.length > 0,
    weekFilter.length > 0,
    Boolean(createdDateFrom),
    Boolean(createdDateTo),
    Boolean(closedDateFrom),
    Boolean(closedDateTo),
    Boolean(resolvedDateFrom),
    Boolean(resolvedDateTo),
    Boolean(deliveryDateFrom),
    Boolean(deliveryDateTo),
    Boolean(acceptedDateFrom),
    Boolean(acceptedDateTo),
    Boolean(updatedDateFrom),
    Boolean(updatedDateTo),
  ].filter(Boolean).length;

  // Auto-expand advanced panel if filters are present (e.g. on back-navigation)
  const [showAdvanced, setShowAdvanced] = useState(() => activeAdvancedFilterCount > 0);

  const isCustomer = userType === 'customer';

  // Supporting data — fetch once on mount (restricted calls skipped for customers)
  useEffect(() => {
    if (!isCustomer) {
      dispatch(fetchConsultants({ limit: 1000 }));
      dispatch(fetchCustomers({ limit: 1000 }));
      dispatch(fetchCompanies({ limit: 1000 }));
      dispatch(fetchDepartments({ limit: 1000 }));
      dispatch(fetchServiceTypes({ limit: 1000 }));
      dispatch(fetchModules({ limit: 1000 }));
    }
    dispatch(fetchSources({ isActive: true, limit: 1000 }));
    dispatch(fetchCategories({ limit: 9999 }));
    dispatch(fetchCustomizedSolutions({ limit: 9999 }));
  }, [isCustomer]);

  const resolveExcludeServiceTypeIds = () => {
    if (!excludeServiceTypeNames.length || !serviceTypes?.length) return [];
    return serviceTypes
      .filter(s => excludeServiceTypeNames.some(n => s.name.toLowerCase() === n.toLowerCase()))
      .map(s => s._id);
  };

  const resolveExcludeCategoryIds = () => {
    if (!excludeCategoryNames.length || !categories?.length) return [];
    return categories
      .filter(c => excludeCategoryNames.some(n => c.name.toLowerCase() === n.toLowerCase()))
      .map(c => c._id);
  };

  // Resolve serviceTypeName param to service type IDs (used by sidebar shortcut links)
  const resolveServiceTypeIds = () => {
    const ids = [...serviceTypeFilter];
    if (serviceTypeNameFilter && serviceTypes?.length) {
      const matched = serviceTypes
        .filter(s => s.name.toLowerCase() === serviceTypeNameFilter.toLowerCase())
        .map(s => s._id);
      matched.forEach(id => { if (!ids.includes(id)) ids.push(id); });
    }
    return ids;
  };

  // Resolve categoryNames param (comma-separated names) to category IDs (used by sidebar shortcut links)
  const resolveCategoryIds = () => {
    const ids = [...categoryFilter];
    if (categoryNamesFilter.length && categories?.length) {
      categoryNamesFilter.forEach(name => {
        const match = categories.find(c => c.name.toLowerCase() === name.toLowerCase());
        if (match && !ids.includes(match._id)) ids.push(match._id);
      });
    }
    return ids;
  };

  // Fetch tickets whenever URL params, user identity, or loaded categories change
  useEffect(() => {
    const params: any = { page: currentPage, limit: itemsPerPage };
    if (searchTerm)              params.search             = searchTerm;
    if (statusFilter.length)     params.status             = statusFilter.join(',');
    if (priorityFilter.length)   params.priority           = priorityFilter.join(',');
    if (sourceFilter.length)     params.source             = sourceFilter.join(',');
    if (departmentFilter.length) params.department         = departmentFilter.join(',');
    if (assignedByFilter.length) params.assignedConsultant = assignedByFilter.join(',');
    const resolvedServiceTypes = resolveServiceTypeIds();
    if (resolvedServiceTypes.length) params.serviceType    = resolvedServiceTypes.join(',');
    if (customerFilter.length)   params.customer           = customerFilter.join(',');
    if (companyFilter.length)    params.companyName        = companyFilter.join(',');
    if (moduleFilter.length)     params.scope              = moduleFilter.join(',');
    const resolvedCategories = resolveCategoryIds();
    if (resolvedCategories.length) params.category         = resolvedCategories.join(',');
    const excludedST = resolveExcludeServiceTypeIds();
    if (excludedST.length)       params.excludeServiceType = excludedST.join(',');
    const excludedCat = resolveExcludeCategoryIds();
    if (excludedCat.length)      params.excludeCategory    = excludedCat.join(',');
    if (featureFilter.length)    params.feature            = featureFilter.join(',');
    if (weekFilter.length)       params.scheduledWeek      = weekFilter.join(',');
    if (createdDateFrom)         params.createdDateFrom    = createdDateFrom;
    if (createdDateTo)           params.createdDateTo      = createdDateTo;
    if (closedDateFrom)          params.closedDateFrom     = closedDateFrom;
    if (closedDateTo)            params.closedDateTo       = closedDateTo;
    if (resolvedDateFrom)        params.resolvedDateFrom   = resolvedDateFrom;
    if (resolvedDateTo)          params.resolvedDateTo     = resolvedDateTo;
    if (deliveryDateFrom)        params.deliveryDateFrom   = deliveryDateFrom;
    if (deliveryDateTo)          params.deliveryDateTo     = deliveryDateTo;
    if (acceptedDateFrom)        params.acceptedDateFrom   = acceptedDateFrom;
    if (acceptedDateTo)          params.acceptedDateTo     = acceptedDateTo;
    if (updatedDateFrom)         params.updatedDateFrom    = updatedDateFrom;
    if (updatedDateTo)           params.updatedDateTo      = updatedDateTo;
    Object.assign(params, getCustomerScopeParams());
    dispatch(fetchTickets(params));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString(), user?._id, serviceTypes, categories]);

  const buildCurrentParams = (pageNum: number) => {
    const params: any = { page: pageNum, limit: itemsPerPage, includeSubTickets: true };
    if (searchTerm)              params.search             = searchTerm;
    if (statusFilter.length)     params.status             = statusFilter.join(',');
    if (priorityFilter.length)   params.priority           = priorityFilter.join(',');
    if (sourceFilter.length)     params.source             = sourceFilter.join(',');
    if (departmentFilter.length) params.department         = departmentFilter.join(',');
    if (assignedByFilter.length) params.assignedConsultant = assignedByFilter.join(',');
    const resolvedST = resolveServiceTypeIds();
    if (resolvedST.length)       params.serviceType        = resolvedST.join(',');
    if (customerFilter.length)   params.customer           = customerFilter.join(',');
    if (companyFilter.length)    params.companyName        = companyFilter.join(',');
    if (moduleFilter.length)     params.scope              = moduleFilter.join(',');
    const resolvedCats = resolveCategoryIds();
    if (resolvedCats.length)     params.category           = resolvedCats.join(',');
    const excST = resolveExcludeServiceTypeIds();
    if (excST.length)            params.excludeServiceType = excST.join(',');
    const excCat = resolveExcludeCategoryIds();
    if (excCat.length)           params.excludeCategory    = excCat.join(',');
    if (featureFilter.length)    params.feature            = featureFilter.join(',');
    if (weekFilter.length)       params.scheduledWeek      = weekFilter.join(',');
    if (createdDateFrom)         params.createdDateFrom    = createdDateFrom;
    if (createdDateTo)           params.createdDateTo      = createdDateTo;
    if (closedDateFrom)          params.closedDateFrom     = closedDateFrom;
    if (closedDateTo)            params.closedDateTo       = closedDateTo;
    if (resolvedDateFrom)        params.resolvedDateFrom   = resolvedDateFrom;
    if (resolvedDateTo)          params.resolvedDateTo     = resolvedDateTo;
    if (deliveryDateFrom)        params.deliveryDateFrom   = deliveryDateFrom;
    if (deliveryDateTo)          params.deliveryDateTo     = deliveryDateTo;
    if (acceptedDateFrom)        params.acceptedDateFrom   = acceptedDateFrom;
    if (acceptedDateTo)          params.acceptedDateTo     = acceptedDateTo;
    if (updatedDateFrom)         params.updatedDateFrom    = updatedDateFrom;
    if (updatedDateTo)           params.updatedDateTo      = updatedDateTo;
    Object.assign(params, getCustomerScopeParams());
    return params;
  };

  const handleSearch = () => {
    updateFilters({ q: searchInput });
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('page', String(newPage));
      return next;
    }, { replace: true });
  };

  const handleDelete = async (id: string) => {
    try {
      await dispatch(deleteTicket(id)).unwrap();
      toast.success('Ticket deleted successfully!');
      const remainingOnPage = tickets.length - 1;
      if (remainingOnPage === 0 && currentPage > 1) {
        // Changing page triggers re-fetch via the URL params effect
        setSearchParams(prev => {
          const next = new URLSearchParams(prev);
          next.set('page', String(currentPage - 1));
          return next;
        }, { replace: true });
      } else {
        dispatch(fetchTickets(buildCurrentParams(currentPage)));
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete ticket');
    }
  };

  const handleResetAdvanced = () => {
    setSearchParams(new URLSearchParams(), { replace: true });
    setSearchInput('');
  };

  const totalActiveFilters = [
    statusFilter.length > 0,
    priorityFilter.length > 0,
    sourceFilter.length > 0,
    departmentFilter.length > 0,
    assignedByFilter.length > 0,
    serviceTypeFilter.length > 0,
    customerFilter.length > 0,
    companyFilter.length > 0,
    moduleFilter.length > 0,
    categoryFilter.length > 0,
    featureFilter.length > 0,
    weekFilter.length > 0,
    Boolean(createdDateFrom),
    Boolean(createdDateTo),
    Boolean(closedDateFrom),
    Boolean(closedDateTo),
    Boolean(resolvedDateFrom),
    Boolean(resolvedDateTo),
    Boolean(deliveryDateFrom),
    Boolean(deliveryDateTo),
    Boolean(acceptedDateFrom),
    Boolean(acceptedDateTo),
    Boolean(updatedDateFrom),
    Boolean(updatedDateTo),
  ].filter(Boolean).length;

  const EXPORT_HEADERS = [
    'Sub Tickets', 'Ticket #', 'Parent Ticket #', 'Status', 'Subject',
    'Company', 'Created By', 'Assignee', 'Assigned By', 'Category',
    'Service Type', 'Priority', 'Priority #', 'Duration (hrs)', 'Week', 'Module',
    'Created Date', 'Assigned Date', 'Delivery Date',
    'Last Updated', 'Resolved Date', 'Closed Date',
    'Customer Name', 'Type',
  ];

  const fmtDate = (date?: string) =>
    date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  const getExportValues = (ticket: Ticket): string[] => {
    const customerObj = typeof ticket.customer === 'object' && ticket.customer ? ticket.customer as any : null;
    const categoryObj = typeof ticket.category === 'object' && ticket.category ? (ticket.category as Category) : null;
    const serviceTypeObj = typeof ticket.serviceType === 'object' && ticket.serviceType ? ticket.serviceType as any : null;
    const assigneeObj = typeof ticket.acceptedBy === 'object' && ticket.acceptedBy ? (ticket.acceptedBy as TicketConsultant) : null;
    const assignedByObj = typeof ticket.assignedBy === 'object' && ticket.assignedBy ? (ticket.assignedBy as TicketConsultant) : null;
    const createdByObj = typeof ticket.createdByConsultant === 'object' && ticket.createdByConsultant ? (ticket.createdByConsultant as TicketConsultant) : null;
    const parentObj = typeof ticket.parentTicket === 'object' && ticket.parentTicket ? (ticket.parentTicket as Ticket) : null;
    const scopeNames = Array.isArray(ticket.scope)
      ? (ticket.scope as any[]).filter((s) => s && typeof s === 'object').map((s) => s.name).join(', ')
      : '';
    return [
      ticket.isSubTicket ? '' : String((ticket.subTickets as any[])?.length ?? 0),
      ticket.ticketNumber,
      parentObj?.ticketNumber ?? '',
      ticket.status.replace(/_/g, ' '),
      ticket.subject,
      customerObj?.companyName ?? '',
      createdByObj ? `${createdByObj.firstName} ${createdByObj.lastName}` : '',
      assigneeObj ? `${assigneeObj.firstName} ${assigneeObj.lastName}` : '',
      assignedByObj ? `${assignedByObj.firstName} ${assignedByObj.lastName}` : '',
      categoryObj?.name ?? '',
      serviceTypeObj?.name ?? '',
      ticket.priority,
      ticket.priorityNumber != null ? String(ticket.priorityNumber) : '',
      ticket.durationHours != null ? String(ticket.durationHours) : '',
      ticket.scheduledWeek != null ? String(ticket.scheduledWeek) : '',
      scopeNames,
      fmtDate(ticket.createdAt),
      fmtDate(ticket.acceptedAt),
      fmtDate(ticket.deliveryEstimationDate),
      fmtDate(ticket.updatedAt),
      fmtDate(ticket.resolvedAt),
      fmtDate(ticket.closedAt),
      customerObj?.contactPerson ?? '',
      ticket.isSubTicket ? 'Sub-ticket' : 'Main Ticket',
    ];
  };

  const orderTicketsForExport = (allTickets: Ticket[]): Ticket[] => {
    const mains = allTickets.filter((t) => !t.isSubTicket);
    const subMap = new Map<string, Ticket[]>();
    allTickets.filter((t) => t.isSubTicket).forEach((t) => {
      const parentId = typeof t.parentTicket === 'object' && t.parentTicket ? (t.parentTicket as Ticket)._id : String(t.parentTicket ?? '');
      if (!subMap.has(parentId)) subMap.set(parentId, []);
      subMap.get(parentId)!.push(t);
    });
    const ordered: Ticket[] = [];
    mains.forEach((m) => {
      ordered.push(m);
      (subMap.get(m._id) ?? []).forEach((s) => ordered.push(s));
    });
    return ordered;
  };

  const buildExportParams = () => {
    const params: any = { limit: 9999, includeSubTickets: true };
    if (searchTerm)              params.search             = searchTerm;
    if (statusFilter.length)     params.status             = statusFilter.join(',');
    if (priorityFilter.length)   params.priority           = priorityFilter.join(',');
    if (sourceFilter.length)     params.source             = sourceFilter.join(',');
    if (departmentFilter.length) params.department         = departmentFilter.join(',');
    if (assignedByFilter.length) params.assignedConsultant = assignedByFilter.join(',');
    const resolvedST = resolveServiceTypeIds();
    if (resolvedST.length)       params.serviceType        = resolvedST.join(',');
    if (customerFilter.length)   params.customer           = customerFilter.join(',');
    if (companyFilter.length)    params.companyName        = companyFilter.join(',');
    if (moduleFilter.length)     params.scope              = moduleFilter.join(',');
    const resolvedCats = resolveCategoryIds();
    if (resolvedCats.length)     params.category           = resolvedCats.join(',');
    const excST = resolveExcludeServiceTypeIds();
    if (excST.length)            params.excludeServiceType = excST.join(',');
    const excCat = resolveExcludeCategoryIds();
    if (excCat.length)           params.excludeCategory    = excCat.join(',');
    if (featureFilter.length)    params.feature            = featureFilter.join(',');
    if (weekFilter.length)       params.scheduledWeek      = weekFilter.join(',');
    if (createdDateFrom)         params.createdDateFrom    = createdDateFrom;
    if (createdDateTo)           params.createdDateTo      = createdDateTo;
    if (closedDateFrom)          params.closedDateFrom     = closedDateFrom;
    if (closedDateTo)            params.closedDateTo       = closedDateTo;
    if (resolvedDateFrom)        params.resolvedDateFrom   = resolvedDateFrom;
    if (resolvedDateTo)          params.resolvedDateTo     = resolvedDateTo;
    if (deliveryDateFrom)        params.deliveryDateFrom   = deliveryDateFrom;
    if (deliveryDateTo)          params.deliveryDateTo     = deliveryDateTo;
    if (acceptedDateFrom)        params.acceptedDateFrom   = acceptedDateFrom;
    if (acceptedDateTo)          params.acceptedDateTo     = acceptedDateTo;
    if (updatedDateFrom)         params.updatedDateFrom    = updatedDateFrom;
    if (updatedDateTo)           params.updatedDateTo      = updatedDateTo;
    Object.assign(params, getCustomerScopeParams());
    return params;
  };

  const handleExportCSV = async () => {
    try {
      toast.info('Preparing CSV export…');
      const res = await getTickets(buildExportParams());
      const data = orderTicketsForExport(res.data);
      const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
      const rows = [
        EXPORT_HEADERS.map(escape).join(','),
        ...data.map((t) => getExportValues(t).map(escape).join(',')),
      ];
      saveAs(new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' }), `tickets-export-${new Date().toISOString().split('T')[0]}.csv`);
    } catch {
      toast.error('Failed to export CSV');
    }
  };

  const handleExportExcel = async () => {
    try {
      toast.info('Preparing Excel export…');
      const res = await getTickets(buildExportParams());
      const data = orderTicketsForExport(res.data);
      const rows = data.map((t) => getExportValues(t));
      const worksheet = XLSX.utils.aoa_to_sheet([EXPORT_HEADERS, ...rows]);
      worksheet['!cols'] = EXPORT_HEADERS.map((h, i) => ({
        wch: Math.max(h.length, ...rows.map((r) => String(r[i] ?? '').length)) + 2,
      }));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Tickets');
      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `tickets-export-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch {
      toast.error('Failed to export Excel');
    }
  };

  const handleExportPDF = async () => {
    try {
      toast.info('Preparing PDF export…');
      const res = await getTickets(buildExportParams());
      const data = orderTicketsForExport(res.data);
      const doc = new jsPDF('landscape');
      doc.setFontSize(16);
      doc.text('Tickets Report', 14, 18);
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleString()}  |  Total: ${data.length}`, 14, 25);
      autoTable(doc, {
        head: [EXPORT_HEADERS],
        body: data.map((t) => getExportValues(t)),
        startY: 30,
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [0, 58, 143], fontSize: 7 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
      });
      doc.save(`tickets-report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch {
      toast.error('Failed to export PDF');
    }
  };

  const getPageNumbers = () => {
    const pageNumbers: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    const end = Math.min(pages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);

    for (let i = start; i <= end; i++) {
      pageNumbers.push(i);
    }
    return pageNumbers;
  };

  const startItem = (page - 1) * itemsPerPage + 1;
  const endItem = Math.min(page * itemsPerPage, total);

  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) {
        setShowActionsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="display-sm text-on-surface">
            {serviceTypeNameFilter
              ? `${serviceTypeNameFilter} Tickets`
              : categoryNamesFilter.length
              ? 'Meeting Tickets'
              : 'Tickets'}
          </h1>
          <p className="text-on-surface-variant mt-1">Manage your support tickets</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Actions Menu */}
          <div className="relative" ref={actionsMenuRef}>
            <button
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="p-2.5 rounded-[0.75rem] text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
              aria-label="More actions"
              aria-expanded={showActionsMenu}
              aria-haspopup="menu"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            {showActionsMenu && (
              <div className="absolute right-0 mt-1.5 w-48 rounded-[0.75rem] glass shadow-ambient py-1.5 z-50" role="menu">
                <p className="px-3.5 py-1.5 text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Export as</p>
                <button
                  role="menuitem"
                  onClick={() => { handleExportCSV(); setShowActionsMenu(false); }}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container-highest transition-colors"
                >
                  <Download className="h-4 w-4 text-on-surface-variant" />
                  CSV
                </button>
                <button
                  role="menuitem"
                  onClick={() => { handleExportExcel(); setShowActionsMenu(false); }}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container-highest transition-colors"
                >
                  <FileSpreadsheet className="h-4 w-4 text-on-surface-variant" />
                  Excel
                </button>
                <button
                  role="menuitem"
                  onClick={() => { handleExportPDF(); setShowActionsMenu(false); }}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container-highest transition-colors"
                >
                  <FileText className="h-4 w-4 text-on-surface-variant" />
                  PDF
                </button>
              </div>
            )}
          </div>
          <Button onClick={() => navigate('/tickets/create')} className="gap-2">
            <Plus className="h-4 w-4" />
            New Ticket
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-surface-container-lowest rounded-[1rem]">
        {/* Top Bar: Search + Quick Filters */}
        <div className="p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" aria-hidden="true" />
            <Input
              type="search"
              placeholder="Search by subject, ticket number..."
              aria-label="Search tickets"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>

          <MultiSelect
            values={statusFilter}
            onChange={(v) => updateFilters({ status: v })}
            label="Status"
            className="min-w-[160px]"
            options={[
              { value: 'new', label: 'New' },
              { value: 'assigned', label: 'Assigned' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'customer_pending', label: 'Customer Pending' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'tested', label: 'Tested' },
              { value: 'closed', label: 'Closed' },
              { value: 'not_related', label: 'Not Related' },
            ]}
          />

          <MultiSelect
            values={priorityFilter}
            onChange={(v) => updateFilters({ priority: v })}
            label="Priority"
            className="min-w-[160px]"
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'critical', label: 'Critical' },
            ]}
          />

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-2 px-4 py-2 rounded-[0.75rem] text-sm font-semibold transition-all ${
              showAdvanced || activeAdvancedFilterCount > 0
                ? 'bg-brand-50 text-brand-600 ring-1 ring-brand-200'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeAdvancedFilterCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-brand-500 text-white text-[10px] font-bold leading-none">
                {activeAdvancedFilterCount}
              </span>
            )}
            {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {totalActiveFilters > 0 && (
            <button
              onClick={handleResetAdvanced}
              className="flex items-center gap-1.5 px-3 py-2 rounded-[0.75rem] text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Clear all
            </button>
          )}
        </div>

        {/* Advanced Filters Panel */}
        {showAdvanced && (
          <div className="px-4 pb-4 space-y-4">
            <div className="bg-surface-container-low rounded-[0.75rem] p-4 space-y-4">
              {/* Dropdowns Row */}
              <div>
                <p className="text-xs font-medium text-on-surface-variant mb-3">Filter by</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  <MultiSelect
                    values={sourceFilter}
                    onChange={(v) => updateFilters({ source: v })}
                    label="Source"
                    options={sources?.filter(s => s.isActive).map((s) => ({ value: s._id, label: s.name })) || []}
                  />
                  <MultiSelect
                    values={departmentFilter}
                    onChange={(v) => updateFilters({ department: v })}
                    label="Department"
                    options={departments?.filter(d => d.isActive).map((d) => ({ value: d._id, label: d.name })) || []}
                  />
                  <MultiSelect
                    values={assignedByFilter}
                    onChange={(v) => updateFilters({ consultant: v })}
                    label="Assigned To"
                    options={consultants?.map((c) => ({ value: c._id, label: `${c.firstName} ${c.lastName}` })) || []}
                  />
                  <MultiSelect
                    values={serviceTypeFilter}
                    onChange={(v) => updateFilters({ serviceType: v })}
                    label="Service Type"
                    options={serviceTypes?.filter(s => s.isActive).map((st) => ({ value: st._id, label: st.name })) || []}
                  />
                  <MultiSelect
                    values={customerFilter}
                    onChange={(v) => updateFilters({ customer: v })}
                    label="Customer"
                    options={customers?.map((c) => ({ value: c._id, label: c.contactPerson })) || []}
                  />
                  <MultiSelect
                    values={companyFilter}
                    onChange={(v) => updateFilters({ company: v })}
                    label="Company"
                    options={companies?.map((c) => ({ value: c.name, label: c.name })) ?? []}
                  />
                  <MultiSelect
                    values={moduleFilter}
                    onChange={(v) => updateFilters({ module: v })}
                    label="Module"
                    options={modules?.map((m) => ({ value: m._id, label: m.name })) ?? []}
                  />
                  <MultiSelect
                    values={categoryFilter}
                    onChange={(v) => updateFilters({ category: v })}
                    label="Category"
                    options={categories?.map((c) => ({ value: c._id, label: c.name })) ?? []}
                  />
                  <MultiSelect
                    values={featureFilter}
                    onChange={(v) => updateFilters({ feature: v })}
                    label="Customized Solution"
                    options={customizedSolutions?.map((f) => ({ value: f._id, label: f.name })) ?? []}
                  />
                  {isConsultant && (
                    <MultiSelect
                      values={weekFilter}
                      onChange={(v) => updateFilters({ week: v })}
                      label="Scheduled Week"
                      options={Array.from({ length: 52 }, (_, i) => ({ value: String(i + 1), label: `Week ${i + 1}` }))}
                    />
                  )}
                </div>
              </div>

              {/* Date Filters */}
              <div>
                <p className="text-xs font-medium text-on-surface-variant mb-3 flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" />
                  Date range
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                  {/* Created */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide">Created</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs text-on-surface-variant">From</label>
                        <Input type="date" value={createdDateFrom} onChange={(e) => updateFilters({ createdFrom: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-on-surface-variant">To</label>
                        <Input type="date" value={createdDateTo} onChange={(e) => updateFilters({ createdTo: e.target.value })} />
                      </div>
                    </div>
                  </div>
                  {/* Last Updated */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide">Last Updated</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs text-on-surface-variant">From</label>
                        <Input type="date" value={updatedDateFrom} onChange={(e) => updateFilters({ updatedFrom: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-on-surface-variant">To</label>
                        <Input type="date" value={updatedDateTo} onChange={(e) => updateFilters({ updatedTo: e.target.value })} />
                      </div>
                    </div>
                  </div>
                  {/* Resolved */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide">Resolved</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs text-on-surface-variant">From</label>
                        <Input type="date" value={resolvedDateFrom} onChange={(e) => updateFilters({ resolvedFrom: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-on-surface-variant">To</label>
                        <Input type="date" value={resolvedDateTo} onChange={(e) => updateFilters({ resolvedTo: e.target.value })} />
                      </div>
                    </div>
                  </div>
                  {/* Closed */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide">Closed</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs text-on-surface-variant">From</label>
                        <Input type="date" value={closedDateFrom} onChange={(e) => updateFilters({ closedFrom: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-on-surface-variant">To</label>
                        <Input type="date" value={closedDateTo} onChange={(e) => updateFilters({ closedTo: e.target.value })} />
                      </div>
                    </div>
                  </div>
                  {/* Delivery */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide">Delivery Date</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs text-on-surface-variant">From</label>
                        <Input type="date" value={deliveryDateFrom} onChange={(e) => updateFilters({ deliveryFrom: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-on-surface-variant">To</label>
                        <Input type="date" value={deliveryDateTo} onChange={(e) => updateFilters({ deliveryTo: e.target.value })} />
                      </div>
                    </div>
                  </div>
                  {/* Accepted */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide">Accepted Date</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs text-on-surface-variant">From</label>
                        <Input type="date" value={acceptedDateFrom} onChange={(e) => updateFilters({ acceptedFrom: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-on-surface-variant">To</label>
                        <Input type="date" value={acceptedDateTo} onChange={(e) => updateFilters({ acceptedTo: e.target.value })} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Summary Bar */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-on-surface-variant">
              <span className="font-semibold text-on-surface">{total.toLocaleString()}</span> tickets
              {totalActiveFilters > 0 && (
                <span> · <span className="font-medium">{totalActiveFilters} filter{totalActiveFilters > 1 ? 's' : ''}</span> active</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Ticket Table */}
      <TicketTable tickets={tickets} onDelete={handleDelete} loading={loading} />

      {/* Pagination */}
      {total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <p className="text-sm text-on-surface-variant">
              Showing <span className="font-semibold text-on-surface">{startItem}-{endItem}</span> of{' '}
              <span className="font-semibold text-on-surface">{total.toLocaleString()}</span> results
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-on-surface-variant">Per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => updateFilters({ limit: e.target.value })}
                className="h-7 px-2 pr-6 rounded-[0.5rem] text-xs font-semibold bg-surface-container-lowest border border-border text-on-surface focus:outline-none focus:ring-2 focus:ring-brand-500/30 cursor-pointer appearance-none"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
              className="p-2 rounded-[0.75rem] bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {getPageNumbers().map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                aria-label={`Page ${pageNum}`}
                aria-current={pageNum === page ? 'page' : undefined}
                className={`min-w-[36px] h-9 rounded-[0.75rem] text-sm font-semibold transition-colors ${
                  pageNum === page
                    ? 'bg-primary-fixed text-on-primary-fixed'
                    : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= pages}
              aria-label="Next page"
              className="p-2 rounded-[0.75rem] bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
