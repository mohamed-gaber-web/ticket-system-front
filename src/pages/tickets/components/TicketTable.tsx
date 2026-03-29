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
import { Edit, Trash2, Ticket as TicketIcon, Eye, CheckCircle, GitBranch } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import type { Ticket, Consultant, Category } from '@/types/ticket';
import { useAppSelector, useAppDispatch } from '@/redux/hooks/hooks';
import { acceptTicket } from '@/redux/slices/ticketSlice';

const MySwal = withReactContent(Swal);

interface TicketTableProps {
  tickets: Ticket[];
  onDelete: (id: string) => void;
  loading: boolean;
}

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} mins ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function TicketTable({ tickets, onDelete, loading }: TicketTableProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { userType, user } = useAppSelector((state) => state.auth);
  const { loading: ticketLoading } = useAppSelector((state) => state.tickets);
  const { consultants } = useAppSelector((state) => state.consultants);
  const isConsultant = userType === 'consultant';

  const handleDelete = (ticket: Ticket) => {
    MySwal.fire({
      title: 'Are you sure?',
      html: `
        <div class="text-left">
          <p class="mb-2">You are about to delete:</p>
          <p class="font-semibold text-lg">${ticket.ticketNumber}</p>
          <p class="text-sm" style="color: #434653">${ticket.subject}</p>
          <p class="mt-3" style="color: #BA1A1A">This action cannot be undone!</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#BA1A1A',
      cancelButtonColor: '#434653',
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
          <p class="text-sm" style="color: #434653">${ticket.subject}</p>
          <p class="mt-3" style="color: #003A8F">This ticket will be assigned to you.</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#003A8F',
      cancelButtonColor: '#434653',
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

    if (typeof acceptedBy === 'string') {
      const consultant = consultants.find(c => c._id === acceptedBy);
      if (consultant) {
        return `${consultant.firstName} ${consultant.lastName}`;
      }
      return 'Unknown Consultant';
    }

    return `${acceptedBy.firstName} ${acceptedBy.lastName}`;
  };

  const isAcceptedByCurrentUser = (ticket: Ticket) => {
    if (!ticket.acceptedBy || !user) return false;
    const acceptedById = typeof ticket.acceptedBy === 'string' ? ticket.acceptedBy : ticket.acceptedBy._id;
    return acceptedById === user._id;
  };

  const getCategoryName = (category: string | Category | undefined): string | null => {
    if (!category) return null;
    if (typeof category === 'string') return null;
    return category.name;
  };

  const getPriorityDisplay = (priority: string) => {
    const dotColors: Record<string, string> = {
      critical: 'bg-error',
      high: 'bg-accent-orange-500',
      medium: 'bg-yellow-500',
      low: 'bg-green-500',
    };

    const textColors: Record<string, string> = {
      critical: 'text-error',
      high: 'text-accent-orange-600',
      medium: 'text-yellow-600',
      low: 'text-green-600',
    };

    return (
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${dotColors[priority] || dotColors.medium}`} />
        <span className={`text-xs font-bold tracking-[0.05em] uppercase ${textColors[priority] || textColors.medium}`}>
          {priority}
        </span>
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      new: 'bg-accent-orange-400 text-white',
      assigned: 'bg-brand-400 text-white',
      in_progress: 'bg-yellow-500 text-white',
      resolved: 'bg-green-500 text-white',
      closed: 'bg-surface-container-highest text-on-surface-variant',
    };

    const displayStatus = status.replace('_', ' ');

    return (
      <span
        className={`inline-block px-3 py-1 rounded-[0.5rem] text-xs font-bold uppercase tracking-[0.05em] ${
          statusStyles[status] || statusStyles.new
        }`}
      >
        {displayStatus}
      </span>
    );
  };

  const organizeTickets = () => {
    const mainTickets: Ticket[] = [];
    const subTicketsMap = new Map<string, Ticket[]>();

    tickets.forEach((ticket) => {
      if (ticket.isSubTicket && ticket.parentTicket) {
        const parentId = typeof ticket.parentTicket === 'string'
          ? ticket.parentTicket
          : ticket.parentTicket._id;

        if (!subTicketsMap.has(parentId)) {
          subTicketsMap.set(parentId, []);
        }
        subTicketsMap.get(parentId)?.push(ticket);
      } else {
        mainTickets.push(ticket);
      }
    });

    const organized: Ticket[] = [];
    mainTickets.forEach((mainTicket) => {
      organized.push(mainTicket);
      const subTickets = subTicketsMap.get(mainTicket._id) || [];
      organized.push(...subTickets);
    });

    return organized;
  };

  const organizedTickets = organizeTickets();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary/20 border-t-primary"></div>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center py-16">
        <TicketIcon className="mx-auto h-12 w-12 text-on-surface-variant/40 mb-4" />
        <p className="text-on-surface text-lg font-semibold">No tickets found</p>
        <p className="text-on-surface-variant text-sm mt-2">Create your first ticket to get started</p>
        <Button onClick={() => navigate('/tickets/create')} className="mt-6">
          Create Ticket
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-[1rem] bg-surface-container-lowest overflow-hidden w-full">
      <div className="w-full overflow-x-auto">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[100px]">Ticket #</TableHead>
              <TableHead className="min-w-[200px]">Subject</TableHead>
              <TableHead className="min-w-[100px]">Priority</TableHead>
              <TableHead className="min-w-[120px]">Status</TableHead>
              <TableHead className="min-w-[120px]">Accepted At</TableHead>
              <TableHead className="min-w-[120px]">Last Updated</TableHead>
              <TableHead className="min-w-[120px]">Closed At</TableHead>
              <TableHead className="text-right min-w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {organizedTickets.map((ticket) => {
              const isSubTicket = ticket.isSubTicket;
              const categoryName = getCategoryName(ticket.category);

              return (
                <TableRow
                  key={ticket._id}
                  className={isSubTicket ? 'bg-primary-fixed/20' : ''}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {isSubTicket && (
                        <div className="flex items-center gap-1 ml-2">
                          <div className="w-4 border-t-2 border-l-2 border-outline-variant h-3 rounded-tl-md"></div>
                          <GitBranch className="h-3 w-3 text-brand-400 flex-shrink-0" />
                        </div>
                      )}
                      <span className="font-semibold text-on-surface text-sm whitespace-nowrap">
                        #{ticket.ticketNumber}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className={`font-medium text-sm ${isSubTicket ? 'text-brand-500' : 'text-on-surface'}`}>
                        {ticket.subject}
                      </p>
                      {categoryName && (
                        <p className="text-xs text-on-surface-variant mt-0.5">{categoryName}</p>
                      )}
                      {isSubTicket && !categoryName && (
                        <span className="inline-flex items-center gap-1 mt-0.5 text-xs text-brand-400">
                          <GitBranch className="h-3 w-3" />
                          Sub-ticket
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getPriorityDisplay(ticket.priority)}</TableCell>
                  <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                  <TableCell>
                    {ticket.acceptedAt ? (
                      <span className="text-sm text-on-surface">
                        {new Date(ticket.acceptedAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </span>
                    ) : (
                      <span className="text-on-surface-variant/40">&mdash;</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-on-surface-variant">
                      {getRelativeTime(ticket.updatedAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {ticket.closedAt ? (
                      <span className="text-sm text-on-surface">
                        {new Date(ticket.closedAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </span>
                    ) : (
                      <span className="text-on-surface-variant/40">&mdash;</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {isConsultant && !isSubTicket && ticket.status === 'new' && !ticket.acceptedBy && (
                        <Button
                          size="sm"
                          variant="tertiary"
                          onClick={() => handleAccept(ticket)}
                          disabled={ticketLoading}
                          className="text-green-600 hover:text-green-700 whitespace-nowrap h-8 text-xs"
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />
                          Accept
                        </Button>
                      )}

                      {isConsultant && !isSubTicket && ticket.acceptedBy && (
                        <div className="px-2.5 py-0.5 rounded-[0.5rem] text-xs font-semibold bg-primary-fixed text-on-primary-fixed whitespace-nowrap">
                          {isAcceptedByCurrentUser(ticket) ? 'You' : getAcceptedByName(ticket.acceptedBy)}
                        </div>
                      )}

                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => navigate(`/tickets/view/${ticket._id}`)}
                        className="text-on-surface-variant hover:text-brand-500"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => navigate(`/tickets/edit/${ticket._id}`)}
                        className="text-on-surface-variant hover:text-on-surface"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="text-on-surface-variant hover:text-error"
                        onClick={() => handleDelete(ticket)}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
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
