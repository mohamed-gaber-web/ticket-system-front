import { useState, useRef, useEffect } from 'react';
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
import { Edit, Trash2, Ticket as TicketIcon, Eye, CheckCircle, GitBranch, MoreVertical } from 'lucide-react';
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


export default function TicketTable({ tickets, onDelete, loading }: TicketTableProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { userType, user } = useAppSelector((state) => state.auth);
  const { loading: ticketLoading } = useAppSelector((state) => state.tickets);
  const { consultants } = useAppSelector((state) => state.consultants);
  const isConsultant = userType === 'consultant';
  const isCustomer = userType === 'customer';

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuToggle = (ticketId: string, btn: HTMLElement) => {
    if (openMenuId === ticketId) {
      setOpenMenuId(null);
    } else {
      const rect = btn.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
      setOpenMenuId(ticketId);
    }
  };

  const handleDelete = (ticket: Ticket) => {
    MySwal.fire({
      title: `Delete ${ticket.ticketNumber}?`,
      html: `
        <div class="text-left">
          <p class="text-sm" style="color: #434653">${ticket.subject}</p>
          <p class="mt-3" style="color: #BA1A1A">This action cannot be undone.</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#BA1A1A',
      cancelButtonColor: '#434653',
      confirmButtonText: 'Delete ticket',
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
      title: `Accept ${ticket.ticketNumber}?`,
      html: `
        <div class="text-left">
          <p class="text-sm" style="color: #434653">${ticket.subject}</p>
          <p class="mt-3" style="color: #003A8F">This ticket will be assigned to you.</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#003A8F',
      cancelButtonColor: '#434653',
      confirmButtonText: 'Accept ticket',
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
      customer_pending: 'bg-purple-500 text-white',
      resolved: 'bg-green-500 text-white',
      closed: 'bg-surface-container-highest text-on-surface-variant',
      delivered: 'bg-teal-500 text-white',
    };

    const displayStatus = status.replace(/_/g, ' ');

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

  const subTicketsMap = new Map<string, Ticket[]>();
  tickets.forEach((ticket) => {
    if (ticket.isSubTicket && ticket.parentTicket) {
      const parentId = typeof ticket.parentTicket === 'string'
        ? ticket.parentTicket
        : (ticket.parentTicket as Ticket)._id;
      if (!subTicketsMap.has(parentId)) subTicketsMap.set(parentId, []);
      subTicketsMap.get(parentId)!.push(ticket);
    }
  });

  const organizeTickets = () => {
    const mainTickets = tickets.filter((t) => !t.isSubTicket);

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
    <div className="rounded-[1rem] bg-surface-container-lowest overflow-hidden w-full [&_td]:py-5">
      <div className="w-full overflow-x-auto">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[100px]">Ticket #</TableHead>
              <TableHead className="min-w-[200px]">Subject</TableHead>
              <TableHead className="min-w-[140px]">Customer</TableHead>
              <TableHead className="min-w-[140px]">Assignee</TableHead>
              <TableHead className="min-w-[140px]">Company</TableHead>
              {isConsultant && <TableHead className="min-w-[120px]">Category</TableHead>}
              {isConsultant && <TableHead className="min-w-[120px]">Module</TableHead>}
              <TableHead className="min-w-[100px]">Priority</TableHead>
              <TableHead className="min-w-[120px]">Status</TableHead>
              <TableHead className="min-w-[120px]">Created Date</TableHead>
              <TableHead className="min-w-[120px]">Assigned Date</TableHead>
              <TableHead className="min-w-[120px]">Delivery Date</TableHead>
              <TableHead className="min-w-[120px]">Last Updated</TableHead>
              <TableHead className="min-w-[120px]">Resolved Date</TableHead>
              <TableHead className="min-w-[120px]">Closed Date</TableHead>
              <TableHead className="min-w-[100px]">Sub Tickets</TableHead>
              <TableHead className="min-w-[160px]">Customer Email</TableHead>
              {!isCustomer && <TableHead className="text-right min-w-[80px]">Actions</TableHead>}
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
                      {isCustomer ? (
                        <button
                          onClick={() => navigate(`/tickets/view/${ticket._id}`)}
                          className="font-semibold text-brand-600 text-sm whitespace-nowrap hover:underline"
                        >
                          #{ticket.ticketNumber}
                        </button>
                      ) : (
                        <span className="font-semibold text-on-surface text-sm whitespace-nowrap">
                          #{ticket.ticketNumber}
                        </span>
                      )}
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
                  {/* Customer (contact person) */}
                  <TableCell>
                    {ticket.customer && typeof ticket.customer === 'object' ? (
                      <span className="text-sm font-medium text-on-surface">
                        {ticket.customer.contactPerson || <span className="text-on-surface-variant/40">&mdash;</span>}
                      </span>
                    ) : (
                      <span className="text-on-surface-variant/40">&mdash;</span>
                    )}
                  </TableCell>
                  {/* Assignee */}
                  <TableCell>
                    {isConsultant && !isSubTicket && ticket.status === 'new' && !ticket.acceptedBy ? (
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
                    ) : ticket.acceptedBy ? (
                      <span className="text-sm font-medium text-on-surface">
                        {isConsultant && isAcceptedByCurrentUser(ticket) ? 'You' : getAcceptedByName(ticket.acceptedBy)}
                      </span>
                    ) : (
                      <span className="text-on-surface-variant/40">&mdash;</span>
                    )}
                  </TableCell>
                  {/* Company */}
                  <TableCell>
                    {ticket.customer && typeof ticket.customer === 'object' ? (
                      <span className="text-sm text-on-surface">{ticket.customer.companyName}</span>
                    ) : (
                      <span className="text-on-surface-variant/40">&mdash;</span>
                    )}
                  </TableCell>
                  {/* Category */}
                  {isConsultant && (
                    <TableCell>
                      {ticket.category && typeof ticket.category === 'object' ? (
                        <span className="text-sm text-on-surface">{ticket.category.name}</span>
                      ) : (
                        <span className="text-on-surface-variant/40">&mdash;</span>
                      )}
                    </TableCell>
                  )}
                  {/* Environment */}
                  {isConsultant && (
                    <TableCell>
                      {ticket.environment && typeof ticket.environment === 'object' ? (
                        <span className="text-sm text-on-surface">{ticket.environment.name}</span>
                      ) : (
                        <span className="text-on-surface-variant/40">&mdash;</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell>{getPriorityDisplay(ticket.priority)}</TableCell>
                  <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                  {/* Created Date */}
                  <TableCell>
                    {ticket.createdAt ? (
                      <span className="text-sm text-on-surface">
                        {new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    ) : (
                      <span className="text-on-surface-variant/40">&mdash;</span>
                    )}
                  </TableCell>
                  {/* Assigned Date */}
                  <TableCell>
                    {ticket.acceptedAt ? (
                      <span className="text-sm text-on-surface">
                        {new Date(ticket.acceptedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    ) : (
                      <span className="text-on-surface-variant/40">&mdash;</span>
                    )}
                  </TableCell>
                  {/* Delivery Date (deliveryEstimationDate) */}
                  <TableCell>
                    {ticket.deliveryEstimationDate ? (
                      <span className="text-sm text-on-surface">
                        {new Date(ticket.deliveryEstimationDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    ) : (
                      <span className="text-on-surface-variant/40">&mdash;</span>
                    )}
                  </TableCell>
                  {/* Last Updated */}
                  <TableCell>
                    {ticket.updatedAt ? (
                      <span className="text-sm text-on-surface">
                        {new Date(ticket.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    ) : (
                      <span className="text-on-surface-variant/40">&mdash;</span>
                    )}
                  </TableCell>
                  {/* Resolved Date */}
                  <TableCell>
                    {ticket.resolvedAt ? (
                      <span className="text-sm text-on-surface">
                        {new Date(ticket.resolvedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    ) : (
                      <span className="text-on-surface-variant/40">&mdash;</span>
                    )}
                  </TableCell>
                  {/* Closed Date */}
                  <TableCell>
                    {ticket.closedAt ? (
                      <span className="text-sm text-on-surface">
                        {new Date(ticket.closedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    ) : (
                      <span className="text-on-surface-variant/40">&mdash;</span>
                    )}
                  </TableCell>
                  {/* Sub Tickets — only shown on main tickets */}
                  <TableCell>
                    {!isSubTicket ? (
                      (() => {
                        const count = subTicketsMap.get(ticket._id)?.length ?? 0;
                        return count > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 text-xs font-semibold">
                            <GitBranch className="w-3 h-3" />
                            {count}
                          </span>
                        ) : (
                          <span className="text-on-surface-variant/40">&mdash;</span>
                        );
                      })()
                    ) : (
                      <span className="text-on-surface-variant/40">&mdash;</span>
                    )}
                  </TableCell>
                  {/* Customer Email */}
                  <TableCell>
                    {ticket.customer && typeof ticket.customer === 'object' && ticket.customer.email ? (
                      <span className="text-sm text-on-surface">{ticket.customer.email}</span>
                    ) : (
                      <span className="text-on-surface-variant/40">&mdash;</span>
                    )}
                  </TableCell>
                  {!isCustomer && <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <div ref={openMenuId === ticket._id ? menuRef : undefined}>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={(e) => handleMenuToggle(ticket._id, e.currentTarget)}
                          className="text-on-surface-variant hover:text-on-surface"
                          aria-label={`Actions for ticket ${ticket.ticketNumber}`}
                          aria-expanded={openMenuId === ticket._id}
                          aria-haspopup="menu"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </TableCell>}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Fixed-position action menu — not clipped by overflow containers */}
      {openMenuId && (
        <div
          ref={menuRef}
          role="menu"
          className="fixed w-40 rounded-[0.75rem] glass shadow-ambient py-1.5 z-[9999]"
          style={{ top: menuPos.top, right: menuPos.right }}
        >
          <button
            role="menuitem"
            onClick={() => { navigate(`/tickets/view/${openMenuId}`); setOpenMenuId(null); }}
            className="flex items-center gap-2.5 w-full px-3.5 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-highest transition-colors"
          >
            <Eye className="w-4 h-4 text-on-surface-variant" />
            View
          </button>
          <button
            role="menuitem"
            onClick={() => { navigate(`/tickets/edit/${openMenuId}`); setOpenMenuId(null); }}
            className="flex items-center gap-2.5 w-full px-3.5 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-highest transition-colors"
          >
            <Edit className="w-4 h-4 text-on-surface-variant" />
            Edit
          </button>
          <button
            role="menuitem"
            onClick={() => {
              const ticket = tickets.find((t) => t._id === openMenuId);
              if (ticket) handleDelete(ticket);
              setOpenMenuId(null);
            }}
            className="flex items-center gap-2.5 w-full px-3.5 py-2 text-sm font-medium text-error hover:bg-error/5 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
