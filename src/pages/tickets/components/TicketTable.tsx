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
import { Edit, Trash2, Eye, Ticket as TicketIcon } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import type { Ticket, Customer, Category } from '@/types/ticket';

const MySwal = withReactContent(Swal);

interface TicketTableProps {
  tickets: Ticket[];
  onDelete: (id: string) => void;
  loading: boolean;
}

export default function TicketTable({ tickets, onDelete, loading }: TicketTableProps) {
  const navigate = useNavigate();

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
    <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="font-semibold">Ticket #</TableHead>
            <TableHead className="font-semibold">Subject</TableHead>
            <TableHead className="font-semibold">Customer</TableHead>
            <TableHead className="font-semibold">Category</TableHead>
            <TableHead className="font-semibold">Priority</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Created At</TableHead>
            <TableHead className="text-right font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow key={ticket._id} className="hover:bg-gray-50 transition-colors">
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xs">
                    {ticket.ticketNumber.split('-')[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{ticket.ticketNumber}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <p className="font-medium text-gray-900">{ticket.subject}</p>
                <p className="text-xs text-gray-500 mt-1 line-clamp-1">{ticket.description}</p>
              </TableCell>
              <TableCell>
                <p className="text-gray-900">{getCustomerName(ticket.customer)}</p>
              </TableCell>
              <TableCell>
                <p className="text-gray-900">{getCategoryName(ticket.category)}</p>
              </TableCell>
              <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
              <TableCell>{getStatusBadge(ticket.status)}</TableCell>
              <TableCell className="text-gray-600">{formatDate(ticket.createdAt)}</TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/tickets/view/${ticket._id}`)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/tickets/edit/${ticket._id}`)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700 hover:border-red-300"
                    onClick={() => handleDelete(ticket)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
