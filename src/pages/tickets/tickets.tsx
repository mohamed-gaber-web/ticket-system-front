import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchTickets, deleteTicket } from '@/redux/slices/ticketSlice';
import { fetchConsultants } from '@/redux/slices/consultantSlice';
import { fetchCustomers } from '@/redux/slices/customerSlice';
import { fetchDepartments } from '@/redux/slices/departmentSlice';
import { fetchServiceTypes } from '@/redux/slices/serviceTypeSlice';
import TicketTable from './components/TicketTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomSelect } from '@/components/ui/custom-select';
import { fetchSources } from '@/redux/slices/sourceSlice';
import { Plus, SlidersHorizontal, Download, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, RotateCcw, FileText, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Ticket, Category, Consultant as TicketConsultant } from '@/types/ticket';

const ITEMS_PER_PAGE = 15;

export default function Tickets() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { tickets, loading, total, page, pages } = useAppSelector((state) => state.tickets);
  const { user, userType } = useAppSelector((state) => state.auth);
  const { sources } = useAppSelector((state) => state.sources);
  const { consultants } = useAppSelector((state) => state.consultants);
  const { customers } = useAppSelector((state) => state.customers);
  const { departments } = useAppSelector((state) => state.departments);
  const { serviceTypes } = useAppSelector((state) => state.serviceTypes);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [, setCurrentPage] = useState(1);

  // Advanced filters
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [assignedByFilter, setAssignedByFilter] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [createdDateFrom, setCreatedDateFrom] = useState('');
  const [createdDateTo, setCreatedDateTo] = useState('');
  const [closedDateFrom, setClosedDateFrom] = useState('');
  const [closedDateTo, setClosedDateTo] = useState('');

  useEffect(() => {
    dispatch(fetchTickets({ page: 1, limit: ITEMS_PER_PAGE }));
    dispatch(fetchConsultants());
    dispatch(fetchSources({ isActive: true }));
    dispatch(fetchCustomers());
    dispatch(fetchDepartments());
    dispatch(fetchServiceTypes());
  }, []);

  // Re-fetch when any filter changes
  useEffect(() => {
    const params: any = {
      page: 1,
      limit: ITEMS_PER_PAGE,
    };
    if (searchTerm) params.search = searchTerm;
    if (statusFilter) params.status = statusFilter;
    if (priorityFilter) params.priority = priorityFilter;
    if (sourceFilter) params.source = sourceFilter;
    if (departmentFilter) params.department = departmentFilter;
    if (assignedByFilter) params.acceptedBy = assignedByFilter;
    if (serviceTypeFilter) params.serviceType = serviceTypeFilter;
    if (customerFilter) params.customer = customerFilter;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (createdDateFrom) params.createdDateFrom = createdDateFrom;
    if (createdDateTo) params.createdDateTo = createdDateTo;
    if (closedDateFrom) params.closedDateFrom = closedDateFrom;
    if (closedDateTo) params.closedDateTo = closedDateTo;

    if (userType === 'customer' && user?._id) {
      params.customer = user._id;
    }

    setCurrentPage(1);
    dispatch(fetchTickets(params));
  }, [statusFilter, priorityFilter, sourceFilter, departmentFilter, assignedByFilter, serviceTypeFilter, customerFilter, startDate, endDate, createdDateFrom, createdDateTo, closedDateFrom, closedDateTo]);

  const getFilterParams = (pageNum: number) => {
    const params: any = {
      page: pageNum,
      limit: ITEMS_PER_PAGE,
    };
    if (searchTerm) params.search = searchTerm;
    if (statusFilter) params.status = statusFilter;
    if (priorityFilter) params.priority = priorityFilter;
    if (sourceFilter) params.source = sourceFilter;
    if (departmentFilter) params.department = departmentFilter;
    if (assignedByFilter) params.acceptedBy = assignedByFilter;
    if (serviceTypeFilter) params.serviceType = serviceTypeFilter;
    if (customerFilter) params.customer = customerFilter;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (createdDateFrom) params.createdDateFrom = createdDateFrom;
    if (createdDateTo) params.createdDateTo = createdDateTo;
    if (closedDateFrom) params.closedDateFrom = closedDateFrom;
    if (closedDateTo) params.closedDateTo = closedDateTo;

    if (userType === 'customer' && user?._id) {
      params.customer = user._id;
    }

    return params;
  };

  const handleSearch = () => {
    setCurrentPage(1);
    dispatch(fetchTickets(getFilterParams(1)));
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    dispatch(fetchTickets(getFilterParams(newPage)));
  };

  const handleDelete = async (id: string) => {
    try {
      await dispatch(deleteTicket(id)).unwrap();
      toast.success('Ticket deleted successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete ticket');
    }
  };

  const handleResetAdvanced = () => {
    setDepartmentFilter('');
    setAssignedByFilter('');
    setServiceTypeFilter('');
    setCustomerFilter('');
    setStartDate('');
    setEndDate('');
    setCreatedDateFrom('');
    setCreatedDateTo('');
    setClosedDateFrom('');
    setClosedDateTo('');
    setSearchTerm('');
    setStatusFilter('');
    setPriorityFilter('');
    setSourceFilter('');
    setCurrentPage(1);
    dispatch(fetchTickets({ page: 1, limit: ITEMS_PER_PAGE }));
  };

  const activeAdvancedFilterCount = [
    departmentFilter, assignedByFilter, serviceTypeFilter, customerFilter,
    startDate, endDate, createdDateFrom, createdDateTo, closedDateFrom, closedDateTo,
  ].filter(Boolean).length;

  const handleExportCSV = () => {
    const headers = ['Ticket #', 'Subject', 'Priority', 'Status', 'Accepted At', 'Last Updated', 'Closed At'];
    const csvRows = [headers.join(',')];

    tickets.forEach((ticket) => {
      const row = [
        ticket.ticketNumber,
        `"${ticket.subject.replace(/"/g, '""')}"`,
        ticket.priority,
        ticket.status.replace('_', ' '),
        ticket.acceptedAt ? new Date(ticket.acceptedAt).toLocaleString() : '',
        new Date(ticket.updatedAt).toLocaleString(),
        ticket.closedAt ? new Date(ticket.closedAt).toLocaleString() : '',
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tickets-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getTicketRowData = (ticket: Ticket) => {
    const customerName = typeof ticket.customer === 'object' && ticket.customer
      ? (ticket.customer as any).companyName
      : '';
    const categoryName = typeof ticket.category === 'object' && ticket.category
      ? (ticket.category as Category).name
      : '';
    const acceptedByName = typeof ticket.acceptedBy === 'object' && ticket.acceptedBy
      ? `${(ticket.acceptedBy as TicketConsultant).firstName} ${(ticket.acceptedBy as TicketConsultant).lastName}`
      : '';
    const departmentName = typeof ticket.department === 'object' && ticket.department
      ? (ticket.department as any).name
      : '';
    const serviceTypeName = typeof ticket.serviceType === 'object' && ticket.serviceType
      ? (ticket.serviceType as any).name
      : '';

    return {
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      customerName,
      categoryName,
      priority: ticket.priority,
      status: ticket.status.replace('_', ' '),
      acceptedByName,
      departmentName,
      serviceTypeName,
      startDate: ticket.startDate ? new Date(ticket.startDate).toLocaleDateString() : '',
      endDate: ticket.endDate ? new Date(ticket.endDate).toLocaleDateString() : '',
      createdAt: new Date(ticket.createdAt).toLocaleString(),
      closedAt: ticket.closedAt ? new Date(ticket.closedAt).toLocaleString() : '',
    };
  };

  const handleExportExcel = () => {
    const excelData = tickets.map((ticket) => {
      const row = getTicketRowData(ticket);
      return {
        'Ticket #': row.ticketNumber,
        'Subject': row.subject,
        'Customer': row.customerName,
        'Category': row.categoryName,
        'Priority': row.priority,
        'Status': row.status,
        'Accepted By': row.acceptedByName,
        'Department': row.departmentName,
        'Service Type': row.serviceTypeName,
        'Start Date': row.startDate,
        'Due Date': row.endDate,
        'Created At': row.createdAt,
        'Closed At': row.closedAt,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Auto-size columns
    const colWidths = Object.keys(excelData[0] || {}).map((key) => ({
      wch: Math.max(key.length, ...excelData.map((row) => String((row as any)[key] || '').length)),
    }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tickets');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, `tickets-export-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('landscape');

    doc.setFontSize(18);
    doc.text('Tickets Report', 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 29);
    doc.text(`Total tickets: ${tickets.length}`, 14, 35);

    const tableData = tickets.map((ticket) => {
      const row = getTicketRowData(ticket);
      return [
        row.ticketNumber,
        row.subject.length > 30 ? row.subject.substring(0, 30) + '...' : row.subject,
        row.customerName,
        row.priority,
        row.status,
        row.acceptedByName,
        row.departmentName,
        row.startDate,
        row.endDate,
        row.createdAt,
        row.closedAt,
      ];
    });

    autoTable(doc, {
      head: [['Ticket #', 'Subject', 'Customer', 'Priority', 'Status', 'Accepted By', 'Department', 'Start Date', 'Due Date', 'Created At', 'Closed At']],
      body: tableData,
      startY: 40,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [0, 58, 143], fontSize: 7 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });

    doc.save(`tickets-report-${new Date().toISOString().split('T')[0]}.pdf`);
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

  const startItem = (page - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(page * ITEMS_PER_PAGE, total);

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="display-sm text-on-surface">Tickets</h1>
          <p className="text-on-surface-variant mt-1">Manage your support tickets</p>
        </div>
        <Button onClick={() => navigate('/tickets/create')} size="lg" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Ticket
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface-container-lowest rounded-[1rem] p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[280px]">
            <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
            <Input
              type="search"
              placeholder="Filter by subject, agent or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>

          {/* Priority Filter Dropdown */}
          <CustomSelect
            variant="filter"
            value={priorityFilter}
            onChange={setPriorityFilter}
            label="Priority"
            options={[
              { value: '', label: 'All' },
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'critical', label: 'Critical' },
            ]}
          />

          {/* Status Filter Dropdown */}
          <CustomSelect
            variant="filter"
            value={statusFilter}
            onChange={setStatusFilter}
            label="Status"
            options={[
              { value: '', label: 'All' },
              { value: 'new', label: 'New' },
              { value: 'assigned', label: 'Assigned' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'closed', label: 'Closed' },
            ]}
          />

          {/* Source Filter Dropdown */}
          <CustomSelect
            variant="filter"
            value={sourceFilter}
            onChange={setSourceFilter}
            label="Source"
            options={[
              { value: '', label: 'All' },
              ...(sources?.filter(s => s.isActive).map((source) => ({ value: source._id, label: source.name })) || []),
            ]}
          />

          {/* Export Buttons */}
          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="gap-2 font-semibold"
          >
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button
            onClick={handleExportExcel}
            variant="outline"
            className="gap-2 font-semibold"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
          <Button
            onClick={handleExportPDF}
            variant="outline"
            className="gap-2 font-semibold"
          >
            <FileText className="h-4 w-4" />
            PDF
          </Button>
        </div>

        {/* Advanced Filters Toggle */}
        <div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
          >
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Advanced Filters
            {activeAdvancedFilterCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary-gradient text-white text-xs font-bold">
                {activeAdvancedFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvanced && (
          <div className="border-t border-outline-variant pt-4 space-y-4">
            {/* Row 1: Department, Assigned To, Service Type, Customer */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <CustomSelect
                variant="filter"
                value={departmentFilter}
                onChange={setDepartmentFilter}
                label="Department"
                options={[
                  { value: '', label: 'All' },
                  ...(departments?.filter(d => d.isActive).map((dept) => ({ value: dept._id, label: dept.name })) || []),
                ]}
              />

              <CustomSelect
                variant="filter"
                value={assignedByFilter}
                onChange={setAssignedByFilter}
                label="Assigned To"
                options={[
                  { value: '', label: 'All' },
                  ...(consultants?.map((c) => ({ value: c._id, label: `${c.firstName} ${c.lastName}` })) || []),
                ]}
              />

              <CustomSelect
                variant="filter"
                value={serviceTypeFilter}
                onChange={setServiceTypeFilter}
                label="Service Type"
                options={[
                  { value: '', label: 'All' },
                  ...(serviceTypes?.filter(s => s.isActive).map((st) => ({ value: st._id, label: st.name })) || []),
                ]}
              />

              <CustomSelect
                variant="filter"
                value={customerFilter}
                onChange={setCustomerFilter}
                label="Customer"
                options={[
                  { value: '', label: 'All' },
                  ...(customers?.map((c) => ({ value: c._id, label: c.companyName })) || []),
                ]}
              />
            </div>

            {/* Row 2: Start Date, Due Date (End Date) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="form-label">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Due Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Created From</label>
                <Input
                  type="date"
                  value={createdDateFrom}
                  onChange={(e) => setCreatedDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Created To</label>
                <Input
                  type="date"
                  value={createdDateTo}
                  onChange={(e) => setCreatedDateTo(e.target.value)}
                />
              </div>
            </div>

            {/* Row 3: Closed Date Range + Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="form-label">Closed From</label>
                <Input
                  type="date"
                  value={closedDateFrom}
                  onChange={(e) => setClosedDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Closed To</label>
                <Input
                  type="date"
                  value={closedDateTo}
                  onChange={(e) => setClosedDateTo(e.target.value)}
                />
              </div>
              <div className="md:col-span-2 flex items-end">
                <Button onClick={handleResetAdvanced} variant="outline" className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Reset All
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ticket Table */}
      <TicketTable tickets={tickets} onDelete={handleDelete} loading={loading} />

      {/* Pagination */}
      {total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-on-surface-variant">
            Showing <span className="font-semibold text-on-surface">{startItem}-{endItem}</span> of{' '}
            <span className="font-semibold text-on-surface">{total.toLocaleString()}</span> results
          </p>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="p-2 rounded-[0.75rem] bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {getPageNumbers().map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                className={`min-w-[36px] h-9 rounded-[0.75rem] text-sm font-semibold transition-colors ${
                  pageNum === page
                    ? 'bg-primary-gradient text-white'
                    : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-high'
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= pages}
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
