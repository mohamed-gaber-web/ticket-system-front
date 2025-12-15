import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchTickets, deleteTicket } from '@/redux/slices/ticketSlice';
import TicketTable from './components/TicketTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function Tickets() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { tickets, loading, total } = useAppSelector((state) => state.tickets);
  const { user, userType } = useAppSelector((state) => state.auth);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = () => {
    const params: any = {};
    if (searchTerm) params.search = searchTerm;
    if (statusFilter) params.status = statusFilter;
    if (priorityFilter) params.priority = priorityFilter;

    // If user is a customer, filter by their customer ID
    if (userType === 'customer' && user?._id) {
      params.customer = user._id;
    }

    dispatch(fetchTickets(params));
  };

  const handleSearch = () => {
    loadTickets();
  };

  const handleDelete = async (id: string) => {
    try {
      await dispatch(deleteTicket(id)).unwrap();
      toast.success('Ticket deleted successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete ticket');
    }
  };

  const handleRefresh = () => {
    setSearchTerm('');
    setStatusFilter('');
    setPriorityFilter('');

    const params: any = {};
    // If user is a customer, filter by their customer ID even on refresh
    if (userType === 'customer' && user?._id) {
      params.customer = user._id;
    }

    dispatch(fetchTickets(params));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tickets</h1>
          <p className="text-gray-600 mt-1">Manage your support tickets</p>
        </div>
        <Button onClick={() => navigate('/tickets/create')} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Ticket
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Search by ticket number, subject, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="new">New</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSearch} className="flex-1">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-4 text-sm text-gray-600">
          Showing <span className="font-semibold">{tickets.length}</span> of{' '}
          <span className="font-semibold">{total}</span> tickets
        </div>
      </div>

      {/* Ticket Table */}
      <TicketTable tickets={tickets} onDelete={handleDelete} loading={loading} />
    </div>
  );
}
