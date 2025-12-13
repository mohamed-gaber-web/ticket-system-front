import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Ticket as TicketIcon, Eye, CheckCircle, GitBranch, Layers } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import type { Ticket, Customer, Category, Consultant } from '@/types/ticket';
import { useAppSelector, useAppDispatch } from '@/redux/hooks/hooks';
import { acceptTicket } from '@/redux/slices/ticketSlice';

const MySwal = withReactContent(Swal);

interface TicketTableProps {
  tickets: Ticket[];
  onDelete: (id: string) => void;
  loading: boolean;
}

export default function TicketTable({ tickets, onDelete, loading }: TicketTableProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { userType, user } = useAppSelector((state) => state.auth);
  const { loading: ticketLoading } = useAppSelector((state) => state.tickets);
  const isConsultant = userType === 'consultant';

  const handleDelete = (ticket: Ticket) => {
    MySwal.fire({
      title: 'Are you sure?',
      html: `
        <div class="text-left">
          <p class="mb-2">You are about to delete:</p>
          <p class="font-semibold text-lg">${ticket.ticketNumber}</p>
          <p class="text-sm text-gray-600">${ticket.subject}</p>
          <p class="mt-3 text-red-600">This action cannot be undone!</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      focusCancel: true,
    }).then((result) => {
      if (result.isConfirmed) {
        onDelete(ticket._id);
      }
    });
  };

  const handleAccept = async (ticket: Ticket) => {
    MySwal.fire({
      title: 'Accept this ticket?',
      html: `
        <div class="text-left">
          <p class="mb-2">You are about to accept:</p>
          <p class="font-semibold text-lg">${ticket.ticketNumber}</p>
          <p class="text-sm text-gray-600">${ticket.subject}</p>
          <p class="mt-3 text-blue-600">This ticket will be assigned to you.</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3B82F6',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, accept it!',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      focusCancel: true,
    }).then((result) => {
      if (result.isConfirmed) {
        dispatch(acceptTicket(ticket._id));
      }
    });
  };

  const getAcceptedByName = (acceptedBy: string | Consultant | undefined) => {
    if (!acceptedBy) return null;
    if (typeof acceptedBy === 'string') return 'Consultant';
    return `${acceptedBy.firstName} ${acceptedBy.lastName}`;
  };

  const isAcceptedByCurrentUser = (ticket: Ticket) => {
    if (!ticket.acceptedBy || !user) return false;
    const acceptedById = typeof ticket.acceptedBy === 'string' ? ticket.acceptedBy : ticket.acceptedBy._id;
    return acceptedById === user._id;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityStyles = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-green-100 text-green-800 border-green-200',
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold border ${
          priorityStyles[priority as keyof typeof priorityStyles] || priorityStyles.medium
        }`}
      >
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      new: 'bg-blue-100 text-blue-800 border-blue-200',
      assigned: 'bg-purple-100 text-purple-800 border-purple-200',
      in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      resolved: 'bg-green-100 text-green-800 border-green-200',
      closed: 'bg-gray-100 text-gray-800 border-gray-200',
      reopened: 'bg-red-100 text-red-800 border-red-200',
    };

    const displayStatus = status.replace('_', ' ');

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold border ${
          statusStyles[status as keyof typeof statusStyles] || statusStyles.new
        }`}
      >
        {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getCustomerName = (customer: string | Customer) => {
    if (typeof customer === 'string') return customer;
    return customer.companyName;
  };

  const getCategoryName = (category: string | Category) => {
    if (typeof category === 'string') return category;
    return category.name;
  };

  const getParentTicketNumber = (parentTicket: string | Ticket | undefined) => {
    if (!parentTicket) return null;
    if (typeof parentTicket === 'string') return parentTicket;
    return parentTicket.ticketNumber;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center py-12">
        <TicketIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-600 text-lg">No tickets found</p>
        <p className="text-gray-500 text-sm mt-2">Create your first ticket to get started</p>
        <Button onClick={() => navigate('/tickets/create')} className="mt-4">
          Create Ticket
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white shadow-sm overflow-hidden w-full">
      <div className="w-full overflow-x-auto">
        <Table className="w-full">
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold min-w-[140px]">Ticket #</TableHead>
              <TableHead className="font-semibold min-w-[200px]">Subject</TableHead>
              <TableHead className="font-semibold min-w-[100px]">Priority</TableHead>
              <TableHead className="font-semibold min-w-[120px]">Status</TableHead>
              <TableHead className="text-right font-semibold min-w-[200px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
        <TableBody>
          {tickets.map((ticket) => {
            const isSubTicket = ticket.isSubTicket;

            return (
              <TableRow
                key={ticket._id}
                className={`hover:bg-gray-50 transition-colors ${
                  isSubTicket ? 'bg-blue-50/30' : ''
                }`}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    {isSubTicket && <GitBranch className="h-3 w-3 text-indigo-500 flex-shrink-0" />}
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center text-white font-semibold text-xs flex-shrink-0 ${
                      isSubTicket
                        ? 'bg-gradient-to-br from-indigo-500 to-purple-500'
                        : 'bg-gradient-to-br from-blue-500 to-purple-600'
                    }`}>
                      {isSubTicket ? <GitBranch className="h-4 w-4" /> : <span>{ticket.ticketNumber.split('-')[0]}</span>}
                    </div>
                    <span className="font-semibold text-gray-900 text-sm whitespace-nowrap">
                      {ticket.ticketNumber}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className={`font-medium text-sm ${isSubTicket ? 'text-indigo-900' : 'text-gray-900'}`}>
                      {ticket.subject}
                    </p>
                    {isSubTicket && (
                      <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200">
                        <GitBranch className="h-3 w-3" />
                        Sub-ticket
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    {/* Accept button - only for consultants on new main tickets that haven't been accepted */}
                    {isConsultant && !isSubTicket && ticket.status === 'new' && !ticket.acceptedBy && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAccept(ticket)}
                        disabled={ticketLoading}
                        className="text-green-600 hover:text-green-700 hover:border-green-300 whitespace-nowrap"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Accept
                      </Button>
                    )}

                    {/* Show "Accepted" badge if ticket is accepted */}
                    {isConsultant && !isSubTicket && ticket.acceptedBy && (
                      <div className="px-3 py-1 rounded-full text-xs font-semibold border bg-green-50 text-green-700 border-green-200 whitespace-nowrap">
                        {isAcceptedByCurrentUser(ticket) ? 'Accepted by You' : `Accepted by ${getAcceptedByName(ticket.acceptedBy)}`}
                      </div>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/tickets/view/${ticket._id}`)}
                      className="text-blue-600 hover:text-blue-700 hover:border-blue-300 whitespace-nowrap"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/tickets/edit/${ticket._id}`)}
                      className="whitespace-nowrap"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:border-red-300 whitespace-nowrap"
                      onClick={() => handleDelete(ticket)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        </Table>
      </div>
    </div>
  );
}
