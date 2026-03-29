import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchTickets, deleteTicket } from '@/redux/slices/ticketSlice';
import { fetchConsultants } from '@/redux/slices/consultantSlice';
import TicketTable from './components/TicketTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomSelect } from '@/components/ui/custom-select';
import { fetchSources } from '@/redux/slices/sourceSlice';
import { Plus, SlidersHorizontal, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const ITEMS_PER_PAGE = 15;

export default function Tickets() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { tickets, loading, total, page, pages } = useAppSelector((state) => state.tickets);
  const { user, userType } = useAppSelector((state) => state.auth);
  const { sources } = useAppSelector((state) => state.sources);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadTickets();
    dispatch(fetchConsultants());
    dispatch(fetchSources({ isActive: true }));
  }, []);

  const loadTickets = useCallback((pageNum?: number) => {
    const params: any = {
      page: pageNum || currentPage,
      limit: ITEMS_PER_PAGE,
    };
    if (searchTerm) params.search = searchTerm;
    if (statusFilter) params.status = statusFilter;
    if (priorityFilter) params.priority = priorityFilter;
    if (sourceFilter) params.source = sourceFilter;

    if (userType === 'customer' && user?._id) {
      params.customer = user._id;
    }

    dispatch(fetchTickets(params));
  }, [searchTerm, statusFilter, priorityFilter, sourceFilter, currentPage, userType, user]);

  useEffect(() => {
    setCurrentPage(1);
    loadTickets(1);
  }, [statusFilter, priorityFilter, sourceFilter]);

  const handleSearch = () => {
    setCurrentPage(1);
    loadTickets(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    loadTickets(newPage);
  };

  const handleDelete = async (id: string) => {
    try {
      await dispatch(deleteTicket(id)).unwrap();
      toast.success('Ticket deleted successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete ticket');
    }
  };

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
      <div className="bg-surface-container-lowest rounded-[1rem] p-4">
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

          {/* Export CSV Button */}
          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="gap-2 font-semibold"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
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
