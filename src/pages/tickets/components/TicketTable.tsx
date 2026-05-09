import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Ticket as TicketIcon, Eye, CheckCircle, GitBranch, MoreVertical, ChevronRight, ChevronDown, Timer, ChevronsUpDown, ChevronUp } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import type { Ticket, Consultant } from '@/types/ticket';
import type { ServiceType } from '@/types/serviceType.types';
import { useAppSelector, useAppDispatch } from '@/redux/hooks/hooks';
import { acceptTicket, fetchSubTickets } from '@/redux/slices/ticketSlice';

const MySwal = withReactContent(Swal);

interface TicketTableProps {
  tickets: Ticket[];
  onDelete: (id: string) => void;
  loading: boolean;
  hideCustomerColumns?: boolean;
}


const PRIORITY_ORDER: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
type SortKey = 'ticketNumber' | 'status' | 'priority' | 'priorityNumber' | 'createdAt' | 'acceptedAt' | 'deliveryEstimationDate' | 'updatedAt' | 'resolvedAt' | 'closedAt' | 'scheduledWeek';
type SortDir = 'asc' | 'desc';

export default function TicketTable({ tickets, onDelete, loading }: TicketTableProps) {
  const dispatch = useAppDispatch();
  const { userType, user } = useAppSelector((state) => state.auth);
  const { loading: ticketLoading } = useAppSelector((state) => state.tickets);
  const { consultants } = useAppSelector((state) => state.consultants);
  const { customers } = useAppSelector((state) => state.customers);
  const isConsultant = userType === 'consultant';
  const isCustomer = userType === 'customer';
  const { serviceTypes } = useAppSelector((state) => state.serviceTypes);

  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: SortKey) => {
    setSortDir((d) => sortKey === key ? (d === 'asc' ? 'desc' : 'asc') : 'asc');
    setSortKey(key);
  };

  const sortedTickets = useMemo(() => {
    if (!sortKey) return tickets;
    return [...tickets].sort((a, b) => {
      let valA: any = sortKey === 'priority' ? PRIORITY_ORDER[a.priority] ?? 0 : (a as any)[sortKey];
      let valB: any = sortKey === 'priority' ? PRIORITY_ORDER[b.priority] ?? 0 : (b as any)[sortKey];
      if (valA == null && valB == null) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;
      const cmp = typeof valA === 'string' && typeof valB === 'string'
        ? valA.localeCompare(valB)
        : valA < valB ? -1 : valA > valB ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [tickets, sortKey, sortDir]);

  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const [subTicketsByParent, setSubTicketsByParent] = useState<Map<string, Ticket[]>>(new Map());
  const [loadingSubTickets, setLoadingSubTickets] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const topDummyRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef(false);

  // Keep top mirror scrollbar width in sync with table scroll width.
  // Depends on `tickets` so it re-runs after the early loading/empty returns
  // are cleared and the table div is actually mounted.
  useEffect(() => {
    const table = tableScrollRef.current;
    const dummy = topDummyRef.current;
    if (!table || !dummy) return;
    const update = () => { dummy.style.width = `${table.scrollWidth}px`; };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(table);
    return () => ro.disconnect();
  }, [tickets]);

  const onTopScroll = () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    if (tableScrollRef.current && topScrollRef.current)
      tableScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    syncingRef.current = false;
  };

  const onTableScroll = () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    if (tableScrollRef.current && topScrollRef.current)
      topScrollRef.current.scrollLeft = tableScrollRef.current.scrollLeft;
    syncingRef.current = false;
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleParent = async (parentId: string) => {
    if (expandedParents.has(parentId)) {
      setExpandedParents((prev) => {
        const next = new Set(prev);
        next.delete(parentId);
        return next;
      });
      return;
    }

    setExpandedParents((prev) => new Set(prev).add(parentId));

    if (!subTicketsByParent.has(parentId)) {
      setLoadingSubTickets((prev) => new Set(prev).add(parentId));
      try {
        const result = await dispatch(fetchSubTickets({ parentId, params: { limit: 500 } })).unwrap();
        setSubTicketsByParent((prev) => new Map(prev).set(parentId, result.data));
      } catch {
        // fail silently — expand row but show nothing
      } finally {
        setLoadingSubTickets((prev) => {
          const next = new Set(prev);
          next.delete(parentId);
          return next;
        });
      }
    }
  };

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

  const getConsultantName = (person: string | Consultant | undefined): string | null => {
    if (!person) return null;
    if (typeof person === 'object') return `${person.firstName} ${person.lastName}`;
    const found = consultants.find(c => c._id === person);
    return found ? `${found.firstName} ${found.lastName}` : 'Unknown';
  };

  const isAcceptedByCurrentUser = (ticket: Ticket) => {
    if (!ticket.acceptedBy || !user) return false;
    const acceptedById = typeof ticket.acceptedBy === 'string' ? ticket.acceptedBy : ticket.acceptedBy._id;
    return acceptedById === user._id;
  };

  const resolveCustomer = (customer: Ticket['customer']) => {
    if (!customer) return null;
    if (typeof customer === 'object') return customer;
    return customers.find((c) => c._id === customer) ?? null;
  };

  const getServiceTypeName = (st: Ticket['serviceType']): string | null => {
    if (!st) return null;
    if (typeof st === 'object') return (st as ServiceType).name;
    return serviceTypes?.find((s) => s._id === st)?.name ?? null;
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
      tested: 'bg-cyan-600 text-white',
      closed: 'bg-surface-container-highest text-on-surface-variant',
      delivered: 'bg-teal-500 text-white',
      not_related: 'bg-slate-500 text-white',
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

  const getSubTicketCount = (ticket: Ticket): number =>
    (ticket.subTickets as unknown as { _id: string }[])?.length ?? 0;

  // Map sub-ticket ID → parent ticket for field inheritance
  const subToParent = new Map<string, Ticket>();
  sortedTickets.forEach((ticket) => {
    if (expandedParents.has(ticket._id)) {
      const subs = subTicketsByParent.get(ticket._id) || [];
      subs.forEach((sub) => subToParent.set(sub._id, ticket));
    }
  });

  const organizeTickets = () => {
    const organized: Ticket[] = [];
    sortedTickets.forEach((ticket) => {
      organized.push(ticket);
      if (expandedParents.has(ticket._id)) {
        const subs = subTicketsByParent.get(ticket._id) || [];
        organized.push(...subs);
      }
    });
    return organized;
  };

  const organizedTickets = organizeTickets();

  const getEffectiveCustomer = (ticket: Ticket) => {
    if (ticket.isSubTicket) {
      const parent = subToParent.get(ticket._id);
      if (parent) return resolveCustomer(parent.customer);
    }
    return resolveCustomer(ticket.customer);
  };

  const getEffectiveScope = (ticket: Ticket): any[] => {
    if (ticket.isSubTicket) {
      const parent = subToParent.get(ticket._id);
      if (parent && Array.isArray(parent.scope) && (parent.scope as any[]).length > 0) {
        return parent.scope as any[];
      }
    }
    return Array.isArray(ticket.scope) && (ticket.scope as any[]).length > 0 ? ticket.scope as any[] : [];
  };

  const getEffectiveAcceptedAt = (ticket: Ticket): string | null => {
    if (ticket.acceptedAt) return ticket.acceptedAt as string;
    if (ticket.isSubTicket) {
      const parent = subToParent.get(ticket._id);
      return (parent?.acceptedAt as string) ?? null;
    }
    return null;
  };

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
        <Button onClick={() => window.location.href = '/tickets/create'} className="mt-6">
          Create Ticket
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-[1rem] bg-surface-container-lowest w-full [&_td]:py-5">
      {/* Top mirror scrollbar — synced with the table container below */}
      <div
        ref={topScrollRef}
        onScroll={onTopScroll}
        className="overflow-x-scroll overflow-y-hidden w-full"
        style={{ height: 16 }}
      >
        <div ref={topDummyRef} style={{ height: 1 }} />
      </div>

      {/* Single scroll container — both axes. Neutralise Table's own overflow-x-auto so
          the scrollbar always appears at the bottom of the visible area, not all rows. */}
      <div
        ref={tableScrollRef}
        onScroll={onTableScroll}
        className="w-full overflow-auto max-h-[calc(100vh-280px)] [&_[data-slot=table-container]]:overflow-visible"
      >
        <Table className="w-full">
          <TableHeader className="sticky top-0 z-20">
            <TableRow>
              {(() => {
                const SH = ({ col, label, className }: { col: SortKey; label: string; className?: string }) => (
                  <TableHead
                    className={`cursor-pointer select-none group ${className ?? ''}`}
                    onClick={() => handleSort(col)}
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      {sortKey === col
                        ? <ChevronUp className={`h-3.5 w-3.5 text-brand-500 transition-transform ${sortDir === 'desc' ? 'rotate-180' : ''}`} />
                        : <ChevronsUpDown className="h-3.5 w-3.5 text-on-surface-variant/40 group-hover:text-on-surface-variant transition-colors" />
                      }
                    </div>
                  </TableHead>
                );
                return (
                  <>
                    <TableHead className="min-w-[80px]">Sub Tickets</TableHead>
                    <SH col="ticketNumber" label="Ticket #" className="min-w-[100px]" />
                    <SH col="status" label="Status" className="min-w-[120px]" />
                    <TableHead className="min-w-[200px]">Subject</TableHead>
                    <TableHead className="min-w-[140px]">Company</TableHead>
                    <TableHead className="min-w-[140px]">Created By</TableHead>
                    <TableHead className="min-w-[140px]">Assignee</TableHead>
                    {isConsultant && <TableHead className="min-w-[120px]">Category</TableHead>}
                    <TableHead className="min-w-[130px]">Service Type</TableHead>
                    <SH col="priority" label="Priority" className="min-w-[100px]" />
                    <SH col="priorityNumber" label="Priority #" className="min-w-[90px]" />
                    {isConsultant && <TableHead className="min-w-[100px]">Duration</TableHead>}
                    {isConsultant && <SH col="scheduledWeek" label="Week" className="min-w-[80px]" />}
                    {isConsultant && <TableHead className="min-w-[120px]">Module</TableHead>}
                    <SH col="createdAt" label="Created Date" className="min-w-[120px]" />
                    <SH col="acceptedAt" label="Assigned Date" className="min-w-[120px]" />
                    <SH col="deliveryEstimationDate" label="Delivery Date" className="min-w-[120px]" />
                    <SH col="updatedAt" label="Last Updated" className="min-w-[120px]" />
                    <SH col="resolvedAt" label="Resolved Date" className="min-w-[120px]" />
                    <SH col="closedAt" label="Closed Date" className="min-w-[120px]" />
                    <TableHead className="min-w-[140px]">Customer Name</TableHead>
                    {!isCustomer && (
                      <TableHead className="text-right min-w-[60px] sticky right-0 z-[21] bg-surface-container-low shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.08)]">
                        Actions
                      </TableHead>
                    )}
                  </>
                );
              })()}
            </TableRow>
          </TableHeader>
          <TableBody>
            {organizedTickets.map((ticket) => {
              const isSubTicket = ticket.isSubTicket;

              return (
                <TableRow
                  key={ticket._id}
                  className={isSubTicket ? 'bg-primary-fixed/20' : ''}
                >
                  {/* Sub Tickets — clickable badge on main tickets */}
                  <TableCell>
                    {!isSubTicket ? (
                      (() => {
                        const count = getSubTicketCount(ticket);
                        const isExpanded = expandedParents.has(ticket._id);
                        return count > 0 ? (
                          <button
                            type="button"
                            onClick={() => toggleParent(ticket._id)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                              isExpanded
                                ? 'bg-primary text-white'
                                : 'bg-brand-100 text-brand-700 hover:bg-primary hover:text-white'
                            }`}
                          >
                            <GitBranch className="w-3 h-3" />
                            {count}
                          </button>
                        ) : (
                          <span className="text-on-surface-variant/40">&mdash;</span>
                        );
                      })()
                    ) : (
                      <span className="text-on-surface-variant/40">&mdash;</span>
                    )}
                  </TableCell>
                  {/* Ticket # */}
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {!isSubTicket && getSubTicketCount(ticket) > 0 ? (
                        <button
                          type="button"
                          onClick={() => toggleParent(ticket._id)}
                          className="p-0.5 rounded hover:bg-surface-container-high transition-colors flex-shrink-0"
                          aria-label={expandedParents.has(ticket._id) ? 'Collapse sub-tickets' : 'Expand sub-tickets'}
                        >
                          {loadingSubTickets.has(ticket._id)
                            ? <span className="h-4 w-4 block animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                            : expandedParents.has(ticket._id)
                              ? <ChevronDown className="h-4 w-4 text-primary" />
                              : <ChevronRight className="h-4 w-4 text-on-surface-variant" />
                          }
                        </button>
                      ) : !isSubTicket ? (
                        <span className="w-5 flex-shrink-0" />
                      ) : (
                        <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                          <div className="w-3 border-t-2 border-l-2 border-outline-variant h-3 rounded-tl-sm" />
                          <GitBranch className="h-3 w-3 text-brand-400" />
                        </div>
                      )}
                      <a
                        href={`/tickets/view/${ticket._id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-brand-600 text-sm whitespace-nowrap hover:underline cursor-pointer"
                      >
                        #{ticket.ticketNumber}
                      </a>
                    </div>
                  </TableCell>
                  {/* Status */}
                  <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                  {/* Subject */}
                  <TableCell>
                    <div>
                      <p className={`font-medium text-sm ${isSubTicket ? 'text-brand-500' : 'text-on-surface'}`}>
                        {ticket.subject}
                      </p>
                      {isSubTicket && (
                        <span className="inline-flex items-center gap-1 mt-0.5 text-xs text-brand-400">
                          <GitBranch className="h-3 w-3" />
                          Sub-ticket
                        </span>
                      )}
                    </div>
                  </TableCell>
                  {/* Company */}
                  <TableCell>
                    {(() => {
                      const c = getEffectiveCustomer(ticket);
                      return c?.companyName
                        ? <span className="text-sm text-on-surface">{c.companyName}</span>
                        : <span className="text-on-surface-variant/40">&mdash;</span>;
                    })()}
                  </TableCell>
                  {/* Created By */}
                  <TableCell>
                    {(() => {
                      const name = getConsultantName(ticket.createdByConsultant as any);
                      return name
                        ? <span className="text-sm text-on-surface">{name}</span>
                        : <span className="text-on-surface-variant/40">&mdash;</span>;
                    })()}
                  </TableCell>
                  {/* Assignee */}
                  <TableCell>
                    {(() => {
                      const assignee = ticket.acceptedBy ?? ticket.assignedBy;
                      const showAcceptBtn = isConsultant && !isSubTicket && ticket.status === 'new' && !assignee;
                      if (showAcceptBtn) {
                        return (
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
                        );
                      }
                      if (assignee) {
                        const isSelf = isConsultant && isAcceptedByCurrentUser(ticket);
                        return (
                          <span className="text-sm font-medium text-on-surface">
                            {isSelf ? 'You' : getConsultantName(assignee)}
                          </span>
                        );
                      }
                      return <span className="text-on-surface-variant/40">&mdash;</span>;
                    })()}
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
                  {/* Service Type */}
                  <TableCell>
                    {(() => {
                      const stName = getServiceTypeName(ticket.serviceType);
                      return stName
                        ? <span className="text-sm text-on-surface">{stName}</span>
                        : <span className="text-on-surface-variant/40">&mdash;</span>;
                    })()}
                  </TableCell>
                  {/* Priority */}
                  <TableCell>{getPriorityDisplay(ticket.priority)}</TableCell>
                  {/* Priority # */}
                  <TableCell>
                    {ticket.priorityNumber != null
                      ? <span className="text-sm font-semibold text-on-surface">{ticket.priorityNumber}</span>
                      : <span className="text-on-surface-variant/40">&mdash;</span>}
                  </TableCell>
                  {/* Duration */}
                  {isConsultant && (
                    <TableCell>
                      {ticket.durationHours != null ? (
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-on-surface">
                          <Timer className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                          {ticket.durationHours}h
                        </span>
                      ) : (
                        <span className="text-on-surface-variant/40">&mdash;</span>
                      )}
                    </TableCell>
                  )}
                  {/* Scheduled Week */}
                  {isConsultant && (
                    <TableCell>
                      {ticket.scheduledWeek != null ? (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-xs font-bold">
                          W{ticket.scheduledWeek}
                        </span>
                      ) : (
                        <span className="text-on-surface-variant/40">&mdash;</span>
                      )}
                    </TableCell>
                  )}
                  {/* Module (scope — multi-value) */}
                  {isConsultant && (
                    <TableCell>
                      {(() => {
                        const scope = getEffectiveScope(ticket);
                        return scope.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {scope.map((s, i) =>
                              s && typeof s === 'object' ? (
                                <span
                                  key={s._id ?? i}
                                  className="inline-block px-2 py-0.5 rounded-md text-xs font-medium bg-surface-container text-on-surface"
                                >
                                  {s.name}
                                </span>
                              ) : null
                            )}
                          </div>
                        ) : (
                          <span className="text-on-surface-variant/40">&mdash;</span>
                        );
                      })()}
                    </TableCell>
                  )}
                  {/* Created Date */}
                  <TableCell>
                    {ticket.createdAt ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm text-on-surface">
                          {new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="text-xs text-on-surface-variant">
                          {new Date(ticket.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ) : (
                      <span className="text-on-surface-variant/40">&mdash;</span>
                    )}
                  </TableCell>
                  {/* Assigned Date */}
                  <TableCell>
                    {(() => {
                      const at = getEffectiveAcceptedAt(ticket);
                      return at ? (
                        <span className="text-sm text-on-surface">
                          {new Date(at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      ) : (
                        <span className="text-on-surface-variant/40">&mdash;</span>
                      );
                    })()}
                  </TableCell>
                  {/* Delivery Date */}
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
                  {/* Customer Name */}
                  <TableCell>
                    {(() => {
                      const c = getEffectiveCustomer(ticket);
                      return c?.contactPerson
                        ? <span className="text-sm font-medium text-on-surface">{c.contactPerson}</span>
                        : <span className="text-on-surface-variant/40">&mdash;</span>;
                    })()}
                  </TableCell>
                  {!isCustomer && (
                    <TableCell className={`sticky right-0 z-10 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.08)] ${isSubTicket ? 'bg-primary-fixed/20' : 'bg-surface-container-lowest'}`}>
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
                    </TableCell>
                  )}
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
            onClick={() => { window.open(`/tickets/view/${openMenuId}`, '_blank'); setOpenMenuId(null); }}
            className="flex items-center gap-2.5 w-full px-3.5 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-highest transition-colors"
          >
            <Eye className="w-4 h-4 text-on-surface-variant" />
            View
          </button>
          <button
            role="menuitem"
            onClick={() => { window.open(`/tickets/edit/${openMenuId}`, '_blank'); setOpenMenuId(null); }}
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
