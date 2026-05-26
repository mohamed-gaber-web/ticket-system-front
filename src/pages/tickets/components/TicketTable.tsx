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
import { Edit, Trash2, Ticket as TicketIcon, Eye, CheckCircle, GitBranch, MoreVertical, ChevronRight, ChevronDown, Timer, ChevronsUpDown, ChevronUp, Pencil, CalendarDays, ChevronUp as Inc, ChevronDown as Dec, Check, X } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import type { Ticket, Consultant, Category, UpdateTicketData } from '@/types/ticket';
import type { ServiceType } from '@/types/serviceType.types';
import { useAppSelector, useAppDispatch } from '@/redux/hooks/hooks';
import { acceptTicket, fetchSubTickets, updateTicket } from '@/redux/slices/ticketSlice';

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
type InlineEditField = 'subject' | 'description' | 'status' | 'priority' | 'priorityNumber' | 'durationHours' | 'deliveryEstimationDate' | 'category' | 'serviceType' | 'scope';

const STATUS_OPTIONS: { value: Ticket['status']; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'customer_pending', label: 'Customer Pending' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'tested', label: 'Tested' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'not_related', label: 'Not Related' },
];

const PRIORITY_OPTIONS: { value: Ticket['priority']; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export default function TicketTable({ tickets, onDelete, loading }: TicketTableProps) {
  const dispatch = useAppDispatch();
  const { userType, user } = useAppSelector((state) => state.auth);
  const { loading: ticketLoading } = useAppSelector((state) => state.tickets);
  const { consultants } = useAppSelector((state) => state.consultants);
  const { customers } = useAppSelector((state) => state.customers);
  const isConsultant = userType === 'consultant';
  const isCustomer = userType === 'customer';
  const { serviceTypes } = useAppSelector((state) => state.serviceTypes);
  const { categories } = useAppSelector((state) => state.categories);
  const { modules } = useAppSelector((state) => state.modules);

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
  const [weekEditId, setWeekEditId] = useState<string | null>(null);
  const [weekEditValue, setWeekEditValue] = useState<string>('');
  const [weekSavingId, setWeekSavingId] = useState<string | null>(null);
  const [weekPopPos, setWeekPopPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const weekInputRef = useRef<HTMLInputElement>(null);
  const weekPopRef = useRef<HTMLDivElement>(null);
  const [activeEdit, setActiveEdit] = useState<{ ticketId: string; field: InlineEditField; value: string | string[] } | null>(null);
  const [editSaving, setEditSaving] = useState<{ ticketId: string; field: InlineEditField } | null>(null);
  const [editPopPos, setEditPopPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [editSearch, setEditSearch] = useState('');
  const editPopRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
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
      if (weekPopRef.current && !weekPopRef.current.contains(e.target as Node)) {
        setWeekEditId(null);
      }
      if (editPopRef.current && !editPopRef.current.contains(e.target as Node)) {
        setActiveEdit(null);
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

  const startWeekEdit = (ticket: Ticket, btn: HTMLElement) => {
    const rect = btn.getBoundingClientRect();
    setWeekPopPos({ top: rect.bottom + 6, left: rect.left });
    setWeekEditId(ticket._id);
    setWeekEditValue(ticket.scheduledWeek != null ? String(ticket.scheduledWeek) : '');
    setTimeout(() => { weekInputRef.current?.focus(); weekInputRef.current?.select(); }, 0);
  };

  const cancelWeekEdit = () => {
    setWeekEditId(null);
    setWeekEditValue('');
  };

  const saveWeekEdit = async () => {
    if (!weekEditId) return;
    const ticketId = weekEditId;
    const raw = weekEditValue.trim();
    const parsed = raw === '' ? null : parseInt(raw, 10);
    if (raw !== '' && (isNaN(parsed!) || parsed! < 1 || parsed! > 53)) {
      cancelWeekEdit();
      return;
    }
    setWeekEditId(null);
    setWeekSavingId(ticketId);
    try {
      await dispatch(updateTicket({ id: ticketId, data: { scheduledWeek: parsed ?? undefined } })).unwrap();
    } catch {
      // error toast handled by slice
    } finally {
      setWeekSavingId(null);
    }
  };

  const stepWeek = (delta: number) => {
    const current = parseInt(weekEditValue, 10);
    const next = isNaN(current) ? (delta > 0 ? 1 : 53) : Math.min(53, Math.max(1, current + delta));
    setWeekEditValue(String(next));
  };

  const isSavingField = (ticketId: string, field: InlineEditField) =>
    editSaving?.ticketId === ticketId && editSaving?.field === field;

  const startEdit = (ticket: Ticket, field: InlineEditField, btn: HTMLElement) => {
    const rect = btn.getBoundingClientRect();
    setEditSearch('');
    setEditPopPos({ top: rect.bottom + 6, left: rect.left });

    let initialValue: string | string[] = '';
    switch (field) {
      case 'subject': initialValue = ticket.subject ?? ''; break;
      case 'description': initialValue = ticket.description ?? ''; break;
      case 'status': initialValue = ticket.status; break;
      case 'priority': initialValue = ticket.priority; break;
      case 'priorityNumber': initialValue = ticket.priorityNumber != null ? String(ticket.priorityNumber) : ''; break;
      case 'durationHours': initialValue = ticket.durationHours != null ? String(ticket.durationHours) : ''; break;
      case 'deliveryEstimationDate':
        initialValue = ticket.deliveryEstimationDate ? ticket.deliveryEstimationDate.slice(0, 10) : '';
        break;
      case 'category':
        initialValue = ticket.category
          ? typeof ticket.category === 'object' ? (ticket.category as Category)._id : ticket.category as string
          : '';
        break;
      case 'serviceType':
        initialValue = ticket.serviceType
          ? typeof ticket.serviceType === 'object' ? (ticket.serviceType as ServiceType)._id : ticket.serviceType as string
          : '';
        break;
      case 'scope': {
        const s = Array.isArray(ticket.scope) ? ticket.scope as any[] : [];
        initialValue = s.map((m: any) => (typeof m === 'object' ? m._id : m));
        break;
      }
    }
    setActiveEdit({ ticketId: ticket._id, field, value: initialValue });
    setTimeout(() => {
      if (field === 'subject' || field === 'description') editTextareaRef.current?.focus();
      else if (field === 'priorityNumber' || field === 'durationHours' || field === 'deliveryEstimationDate') editInputRef.current?.focus();
    }, 30);
  };

  const selectSave = async (ticketId: string, field: InlineEditField, value: string) => {
    setActiveEdit(null);
    setEditSaving({ ticketId, field });
    const data: UpdateTicketData = {};
    if (field === 'status') data.status = value as any;
    else if (field === 'priority') data.priority = value as any;
    else if (field === 'category') data.category = value || undefined;
    else if (field === 'serviceType') data.serviceType = value || undefined;
    try {
      await dispatch(updateTicket({ id: ticketId, data })).unwrap();
    } catch { /* error toast handled by slice */ }
    finally { setEditSaving(null); }
  };

  const saveEdit = async () => {
    if (!activeEdit) return;
    const { ticketId, field, value } = activeEdit;
    const data: UpdateTicketData = {};

    switch (field) {
      case 'subject': {
        const v = (value as string).trim();
        if (!v) { setActiveEdit(null); return; }
        data.subject = v;
        break;
      }
      case 'description': {
        const v = (value as string).trim();
        if (!v) { setActiveEdit(null); return; }
        data.description = v;
        break;
      }
      case 'priorityNumber': {
        const v = (value as string).trim();
        const parsed = v === '' ? null : parseInt(v, 10);
        if (v !== '' && (isNaN(parsed!) || parsed! < 1)) { setActiveEdit(null); return; }
        data.priorityNumber = parsed;
        break;
      }
      case 'durationHours': {
        const v = (value as string).trim();
        const parsed = v === '' ? undefined : parseFloat(v);
        if (parsed !== undefined && (isNaN(parsed) || parsed < 0)) { setActiveEdit(null); return; }
        data.durationHours = parsed;
        break;
      }
      case 'deliveryEstimationDate':
        data.deliveryEstimationDate = (value as string) || undefined;
        break;
      case 'scope':
        data.scope = value as string[];
        break;
      default:
        setActiveEdit(null);
        return;
    }

    setActiveEdit(null);
    setEditSaving({ ticketId, field });
    try {
      await dispatch(updateTicket({ id: ticketId, data })).unwrap();
    } catch { /* error toast handled by slice */ }
    finally { setEditSaving(null); }
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
                  <TableCell>
                    {!isCustomer ? (
                      isSavingField(ticket._id, 'status') ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container text-on-surface-variant text-xs font-semibold opacity-60 select-none">
                          <span className="h-3 w-3 rounded-full border-2 border-brand-400 border-t-transparent animate-spin shrink-0" />
                          Saving
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => startEdit(ticket, 'status', e.currentTarget)}
                          title="Click to change status"
                          className="rounded-lg hover:ring-2 hover:ring-brand-400/30 transition-all cursor-pointer"
                        >
                          {getStatusBadge(ticket.status)}
                        </button>
                      )
                    ) : getStatusBadge(ticket.status)}
                  </TableCell>
                  {/* Subject + Description */}
                  <TableCell>
                    <div className="flex flex-col gap-1 min-w-0">
                      {/* Subject row */}
                      <div className="flex items-start gap-1.5 group/subj">
                        <p className={`font-medium text-sm leading-snug ${isSubTicket ? 'text-brand-500' : 'text-on-surface'}`}>
                          {ticket.subject}
                          {isSubTicket && (
                            <span className="inline-flex items-center gap-1 ml-1.5 text-xs text-brand-400">
                              <GitBranch className="h-3 w-3" />
                              Sub-ticket
                            </span>
                          )}
                        </p>
                        {!isCustomer && (
                          isSavingField(ticket._id, 'subject') ? (
                            <span className="h-3.5 w-3.5 rounded-full border-2 border-brand-400 border-t-transparent animate-spin shrink-0 mt-0.5" />
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => startEdit(ticket, 'subject', e.currentTarget)}
                              className="opacity-0 group-hover/subj:opacity-60 hover:!opacity-100 p-0.5 rounded hover:bg-surface-container-high transition-all shrink-0 mt-0.5"
                              title="Edit subject"
                            >
                              <Pencil className="h-3 w-3 text-on-surface-variant" />
                            </button>
                          )
                        )}
                      </div>
                      {/* Description row */}
                      <div className="flex items-start gap-1.5 group/desc">
                        {ticket.description ? (
                          <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2 flex-1 min-w-0">
                            {ticket.description}
                          </p>
                        ) : (
                          !isCustomer && <span className="text-xs text-on-surface-variant/30 italic">No description</span>
                        )}
                        {!isCustomer && (
                          isSavingField(ticket._id, 'description') ? (
                            <span className="h-3 w-3 rounded-full border-2 border-brand-400 border-t-transparent animate-spin shrink-0 mt-0.5" />
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => startEdit(ticket, 'description', e.currentTarget)}
                              className="opacity-0 group-hover/desc:opacity-60 hover:!opacity-100 p-0.5 rounded hover:bg-surface-container-high transition-all shrink-0 mt-0.5"
                              title="Edit description"
                            >
                              <Pencil className="h-3 w-3 text-on-surface-variant" />
                            </button>
                          )
                        )}
                      </div>
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
                      // For sub-tickets the backend may not populate createdByConsultant;
                      // fall back to assignedBy since the creator is always the assignedBy on sub-tickets.
                      const person = ticket.createdByConsultant ?? (ticket.isSubTicket ? ticket.assignedBy : undefined);
                      const name = getConsultantName(person as any);
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
                      <div className="flex items-center gap-1.5 group/cat">
                        {ticket.category && typeof ticket.category === 'object' ? (
                          <span className="text-sm text-on-surface">{ticket.category.name}</span>
                        ) : (
                          <span className="text-on-surface-variant/40">&mdash;</span>
                        )}
                        {isSavingField(ticket._id, 'category') ? (
                          <span className="h-3.5 w-3.5 rounded-full border-2 border-brand-400 border-t-transparent animate-spin shrink-0" />
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => startEdit(ticket, 'category', e.currentTarget)}
                            className="opacity-0 group-hover/cat:opacity-60 hover:!opacity-100 p-0.5 rounded hover:bg-surface-container-high transition-all shrink-0"
                            title="Edit category"
                          >
                            <Pencil className="h-3 w-3 text-on-surface-variant" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  )}
                  {/* Service Type */}
                  <TableCell>
                    <div className="flex items-center gap-1.5 group/st">
                      {(() => {
                        const stName = getServiceTypeName(ticket.serviceType);
                        return stName
                          ? <span className="text-sm text-on-surface">{stName}</span>
                          : <span className="text-on-surface-variant/40">&mdash;</span>;
                      })()}
                      {!isCustomer && (
                        isSavingField(ticket._id, 'serviceType') ? (
                          <span className="h-3.5 w-3.5 rounded-full border-2 border-brand-400 border-t-transparent animate-spin shrink-0" />
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => startEdit(ticket, 'serviceType', e.currentTarget)}
                            className="opacity-0 group-hover/st:opacity-60 hover:!opacity-100 p-0.5 rounded hover:bg-surface-container-high transition-all shrink-0"
                            title="Edit service type"
                          >
                            <Pencil className="h-3 w-3 text-on-surface-variant" />
                          </button>
                        )
                      )}
                    </div>
                  </TableCell>
                  {/* Priority */}
                  <TableCell>
                    {!isCustomer ? (
                      isSavingField(ticket._id, 'priority') ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant opacity-60">
                          <span className="h-3 w-3 rounded-full border-2 border-brand-400 border-t-transparent animate-spin shrink-0" />
                          Saving
                        </span>
                      ) : (
                        <div className="flex items-center gap-1 group/pri">
                          <button
                            type="button"
                            onClick={(e) => startEdit(ticket, 'priority', e.currentTarget)}
                            title="Click to change priority"
                            className="rounded-lg hover:ring-2 hover:ring-brand-400/30 transition-all cursor-pointer"
                          >
                            {getPriorityDisplay(ticket.priority)}
                          </button>
                          <Pencil className="h-3 w-3 text-on-surface-variant opacity-0 group-hover/pri:opacity-50 transition-opacity shrink-0" />
                        </div>
                      )
                    ) : getPriorityDisplay(ticket.priority)}
                  </TableCell>
                  {/* Priority # */}
                  <TableCell>
                    {!isCustomer ? (
                      isSavingField(ticket._id, 'priorityNumber') ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-50 text-brand-600 text-xs font-semibold opacity-60 select-none">
                          <span className="h-3 w-3 rounded-full border-2 border-brand-400 border-t-transparent animate-spin shrink-0" />
                          Saving
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => startEdit(ticket, 'priorityNumber', e.currentTarget)}
                          title="Click to set priority number"
                          className={`group/pn inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer border
                            ${activeEdit?.ticketId === ticket._id && activeEdit?.field === 'priorityNumber'
                              ? 'bg-brand-100 border-brand-400 text-brand-700 ring-2 ring-brand-400/30'
                              : ticket.priorityNumber != null
                                ? 'bg-brand-50 border-brand-200 text-brand-700 hover:bg-brand-100 hover:border-brand-400'
                                : 'bg-transparent border-dashed border-outline-variant/50 text-on-surface-variant/50 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50'
                            }`}
                        >
                          {ticket.priorityNumber != null ? <span>#{ticket.priorityNumber}</span> : <span>Set #</span>}
                          <Pencil className="h-2.5 w-2.5 shrink-0 opacity-0 group-hover/pn:opacity-60 transition-opacity ml-0.5" />
                        </button>
                      )
                    ) : (
                      ticket.priorityNumber != null
                        ? <span className="text-sm font-semibold text-on-surface">{ticket.priorityNumber}</span>
                        : <span className="text-on-surface-variant/40">&mdash;</span>
                    )}
                  </TableCell>
                  {/* Duration */}
                  {isConsultant && (
                    <TableCell>
                      {isSavingField(ticket._id, 'durationHours') ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-50 text-brand-600 text-xs font-semibold opacity-60 select-none">
                          <span className="h-3 w-3 rounded-full border-2 border-brand-400 border-t-transparent animate-spin shrink-0" />
                          Saving
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => startEdit(ticket, 'durationHours', e.currentTarget)}
                          title="Click to set duration"
                          className={`group/dur inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer border
                            ${activeEdit?.ticketId === ticket._id && activeEdit?.field === 'durationHours'
                              ? 'bg-brand-100 border-brand-400 text-brand-700 ring-2 ring-brand-400/30'
                              : ticket.durationHours != null
                                ? 'bg-brand-50 border-brand-200 text-brand-700 hover:bg-brand-100 hover:border-brand-400'
                                : 'bg-transparent border-dashed border-outline-variant/50 text-on-surface-variant/50 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50'
                            }`}
                        >
                          <Timer className="h-3 w-3 shrink-0 opacity-70" />
                          {ticket.durationHours != null ? <span>{ticket.durationHours}h</span> : <span>Set duration</span>}
                          <Pencil className="h-2.5 w-2.5 shrink-0 opacity-0 group-hover/dur:opacity-60 transition-opacity ml-0.5" />
                        </button>
                      )}
                    </TableCell>
                  )}
                  {/* Scheduled Week */}
                  {isConsultant && (
                    <TableCell>
                      {weekSavingId === ticket._id ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-50 text-brand-600 text-xs font-semibold opacity-60 select-none">
                          <span className="h-3 w-3 rounded-full border-2 border-brand-400 border-t-transparent animate-spin shrink-0" />
                          Saving
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => startWeekEdit(ticket, e.currentTarget)}
                          title="Click to set scheduled week"
                          className={`group/week inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer border
                            ${weekEditId === ticket._id
                              ? 'bg-brand-100 border-brand-400 text-brand-700 ring-2 ring-brand-400/30'
                              : ticket.scheduledWeek != null
                                ? 'bg-brand-50 border-brand-200 text-brand-700 hover:bg-brand-100 hover:border-brand-400'
                                : 'bg-transparent border-dashed border-outline-variant/50 text-on-surface-variant/50 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50'
                            }`}
                        >
                          <CalendarDays className="h-3 w-3 shrink-0 opacity-70" />
                          {ticket.scheduledWeek != null
                            ? <span>W{ticket.scheduledWeek}</span>
                            : <span>Set week</span>
                          }
                          <Pencil className="h-2.5 w-2.5 shrink-0 opacity-0 group-hover/week:opacity-60 transition-opacity ml-0.5" />
                        </button>
                      )}
                    </TableCell>
                  )}
                  {/* Module (scope — multi-value) */}
                  {isConsultant && (
                    <TableCell>
                      <div className="flex flex-wrap items-start gap-1 group/scope">
                        {(() => {
                          const scope = getEffectiveScope(ticket);
                          return scope.length > 0 ? (
                            scope.map((s, i) =>
                              s && typeof s === 'object' ? (
                                <span
                                  key={s._id ?? i}
                                  className="inline-block px-2 py-0.5 rounded-md text-xs font-medium bg-surface-container text-on-surface"
                                >
                                  {s.name}
                                </span>
                              ) : null
                            )
                          ) : (
                            <span className="text-on-surface-variant/40">&mdash;</span>
                          );
                        })()}
                        {!isSubTicket && (
                          isSavingField(ticket._id, 'scope') ? (
                            <span className="h-3.5 w-3.5 rounded-full border-2 border-brand-400 border-t-transparent animate-spin shrink-0 mt-0.5" />
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => startEdit(ticket, 'scope', e.currentTarget)}
                              className="opacity-0 group-hover/scope:opacity-60 hover:!opacity-100 p-0.5 rounded hover:bg-surface-container-high transition-all shrink-0 mt-0.5"
                              title="Edit modules"
                            >
                              <Pencil className="h-3 w-3 text-on-surface-variant" />
                            </button>
                          )
                        )}
                      </div>
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
                    <div className="flex items-center gap-1.5 group/dd">
                      {ticket.deliveryEstimationDate ? (
                        <span className="text-sm text-on-surface">
                          {new Date(ticket.deliveryEstimationDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      ) : (
                        <span className="text-on-surface-variant/40">&mdash;</span>
                      )}
                      {!isCustomer && (
                        isSavingField(ticket._id, 'deliveryEstimationDate') ? (
                          <span className="h-3.5 w-3.5 rounded-full border-2 border-brand-400 border-t-transparent animate-spin shrink-0" />
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => startEdit(ticket, 'deliveryEstimationDate', e.currentTarget)}
                            className="opacity-0 group-hover/dd:opacity-60 hover:!opacity-100 p-0.5 rounded hover:bg-surface-container-high transition-all shrink-0"
                            title="Edit delivery date"
                          >
                            <Pencil className="h-3 w-3 text-on-surface-variant" />
                          </button>
                        )
                      )}
                    </div>
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

      {/* Floating week editor popover */}
      {weekEditId && (
        <div
          ref={weekPopRef}
          className="fixed z-[9999] w-52 rounded-2xl glass shadow-ambient border border-outline-variant/30 overflow-hidden"
          style={{ top: weekPopPos.top, left: weekPopPos.left }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 pt-3.5 pb-2 border-b border-outline-variant/20">
            <CalendarDays className="h-3.5 w-3.5 text-brand-500 shrink-0" />
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Scheduled Week</span>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-2 px-4 py-3">
            <button
              type="button"
              onClick={() => stepWeek(-1)}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-outline-variant hover:bg-surface-container-high hover:border-brand-400 transition-colors text-on-surface-variant hover:text-brand-600"
              aria-label="Previous week"
            >
              <Dec className="h-4 w-4" />
            </button>

            <div className="flex-1 relative">
              <input
                ref={weekInputRef}
                type="number"
                min={1}
                max={53}
                value={weekEditValue}
                onChange={(e) => setWeekEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveWeekEdit();
                  if (e.key === 'Escape') cancelWeekEdit();
                  if (e.key === 'ArrowUp') { e.preventDefault(); stepWeek(1); }
                  if (e.key === 'ArrowDown') { e.preventDefault(); stepWeek(-1); }
                }}
                placeholder="—"
                className="w-full text-center text-lg font-bold text-brand-700 bg-brand-50 border border-brand-200 rounded-xl px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              {weekEditValue && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-brand-500 bg-surface px-1 rounded">
                  W{weekEditValue}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => stepWeek(1)}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-outline-variant hover:bg-surface-container-high hover:border-brand-400 transition-colors text-on-surface-variant hover:text-brand-600"
              aria-label="Next week"
            >
              <Inc className="h-4 w-4" />
            </button>
          </div>

          {/* Week range hint */}
          <p className="text-center text-[10px] text-on-surface-variant/50 -mt-1 pb-2">
            {weekEditValue ? `Week ${weekEditValue} of 53` : 'Enter 1 – 53 or leave blank to clear'}
          </p>

          {/* Actions */}
          <div className="flex gap-2 px-4 pb-3.5">
            <button
              type="button"
              onClick={cancelWeekEdit}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </button>
            <button
              type="button"
              onClick={saveWeekEdit}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition-colors"
            >
              <Check className="h-3.5 w-3.5" />
              Save
            </button>
          </div>
        </div>
      )}

      {/* Generic inline field editor popover */}
      {activeEdit && (
        <div
          ref={editPopRef}
          className="fixed z-[9999] rounded-2xl glass shadow-ambient border border-outline-variant/30 overflow-hidden"
          style={{
            top: editPopPos.top,
            left: editPopPos.left,
            width: activeEdit.field === 'subject' || activeEdit.field === 'description' ? 320
              : activeEdit.field === 'scope' ? 280
              : activeEdit.field === 'status' ? 220
              : activeEdit.field === 'category' || activeEdit.field === 'serviceType' ? 240
              : activeEdit.field === 'priorityNumber' || activeEdit.field === 'durationHours' ? 240
              : 208,
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 pt-3.5 pb-2 border-b border-outline-variant/20">
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
              {activeEdit.field === 'subject' ? 'Subject'
                : activeEdit.field === 'description' ? 'Description'
                : activeEdit.field === 'status' ? 'Status'
                : activeEdit.field === 'priority' ? 'Priority'
                : activeEdit.field === 'priorityNumber' ? 'Priority #'
                : activeEdit.field === 'durationHours' ? 'Duration (hours)'
                : activeEdit.field === 'deliveryEstimationDate' ? 'Delivery Date'
                : activeEdit.field === 'category' ? 'Category'
                : activeEdit.field === 'serviceType' ? 'Service Type'
                : 'Modules'}
            </span>
          </div>

          {/* Subject / Description — textarea */}
          {(activeEdit.field === 'subject' || activeEdit.field === 'description') && (
            <div className="p-3 space-y-2.5">
              <textarea
                ref={editTextareaRef}
                value={activeEdit.value as string}
                onChange={(e) => setActiveEdit((prev) => prev ? { ...prev, value: e.target.value } : null)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setActiveEdit(null);
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveEdit();
                }}
                rows={activeEdit.field === 'description' ? 5 : 3}
                className="w-full text-sm text-on-surface bg-surface-container border border-outline-variant rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400 resize-none"
                placeholder={activeEdit.field === 'description' ? 'Enter description…' : 'Enter subject…'}
              />
              <p className="text-[10px] text-on-surface-variant/50 -mt-1">Ctrl+Enter to save</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setActiveEdit(null)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors">
                  <X className="h-3.5 w-3.5" />Cancel
                </button>
                <button type="button" onClick={saveEdit}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition-colors">
                  <Check className="h-3.5 w-3.5" />Save
                </button>
              </div>
            </div>
          )}

          {/* Status — click-to-save list */}
          {activeEdit.field === 'status' && (
            <div className="py-1.5 max-h-72 overflow-y-auto">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => selectSave(activeEdit.ticketId, 'status', opt.value)}
                  className={`flex items-center gap-2 w-full px-3.5 py-2 text-sm hover:bg-surface-container-highest transition-colors ${activeEdit.value === opt.value ? 'bg-surface-container-high' : ''}`}
                >
                  {getStatusBadge(opt.value)}
                  {activeEdit.value === opt.value && <Check className="h-3 w-3 ml-auto text-brand-500 shrink-0" />}
                </button>
              ))}
            </div>
          )}

          {/* Priority — click-to-save list */}
          {activeEdit.field === 'priority' && (() => {
            const dotColors: Record<string, string> = { critical: 'bg-error', high: 'bg-accent-orange-500', medium: 'bg-yellow-500', low: 'bg-green-500' };
            const textColors: Record<string, string> = { critical: 'text-error', high: 'text-accent-orange-600', medium: 'text-yellow-600', low: 'text-green-600' };
            return (
              <div className="py-1.5">
                {PRIORITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => selectSave(activeEdit.ticketId, 'priority', opt.value)}
                    className={`flex items-center gap-2.5 w-full px-3.5 py-2.5 hover:bg-surface-container-highest transition-colors ${activeEdit.value === opt.value ? 'bg-surface-container-high' : ''}`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColors[opt.value] ?? 'bg-yellow-500'}`} />
                    <span className={`text-xs font-bold tracking-[0.05em] uppercase ${textColors[opt.value] ?? 'text-yellow-600'}`}>{opt.label}</span>
                    {activeEdit.value === opt.value && <Check className="h-3 w-3 ml-auto text-brand-500 shrink-0" />}
                  </button>
                ))}
              </div>
            );
          })()}

          {/* Priority # — number stepper */}
          {activeEdit.field === 'priorityNumber' && (
            <div className="p-3 space-y-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <button type="button"
                  onClick={() => setActiveEdit((prev) => {
                    if (!prev) return null;
                    const v = parseInt(prev.value as string, 10);
                    return { ...prev, value: String(isNaN(v) ? 1 : Math.max(1, v - 1)) };
                  })}
                  className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-surface-container border border-outline-variant hover:bg-surface-container-high hover:border-brand-400 transition-colors text-on-surface-variant hover:text-brand-600">
                  <Dec className="h-4 w-4" />
                </button>
                <input
                  ref={editInputRef}
                  type="number"
                  min={1}
                  value={activeEdit.value as string}
                  onChange={(e) => setActiveEdit((prev) => prev ? { ...prev, value: e.target.value } : null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit();
                    if (e.key === 'Escape') setActiveEdit(null);
                    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveEdit((prev) => { if (!prev) return null; const v = parseInt(prev.value as string, 10); return { ...prev, value: String(isNaN(v) ? 1 : v + 1) }; }); }
                    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveEdit((prev) => { if (!prev) return null; const v = parseInt(prev.value as string, 10); return { ...prev, value: String(isNaN(v) ? 1 : Math.max(1, v - 1)) }; }); }
                  }}
                  placeholder="—"
                  className="min-w-0 flex-1 text-center text-lg font-bold text-brand-700 bg-brand-50 border border-brand-200 rounded-xl px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <button type="button"
                  onClick={() => setActiveEdit((prev) => {
                    if (!prev) return null;
                    const v = parseInt(prev.value as string, 10);
                    return { ...prev, value: String(isNaN(v) ? 1 : v + 1) };
                  })}
                  className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-surface-container border border-outline-variant hover:bg-surface-container-high hover:border-brand-400 transition-colors text-on-surface-variant hover:text-brand-600">
                  <Inc className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setActiveEdit(null)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors">
                  <X className="h-3.5 w-3.5" />Cancel
                </button>
                <button type="button" onClick={saveEdit}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition-colors">
                  <Check className="h-3.5 w-3.5" />Save
                </button>
              </div>
            </div>
          )}

          {/* Duration — number stepper */}
          {activeEdit.field === 'durationHours' && (
            <div className="p-3 space-y-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <button type="button"
                  onClick={() => setActiveEdit((prev) => {
                    if (!prev) return null;
                    const v = parseFloat(prev.value as string);
                    return { ...prev, value: String(isNaN(v) ? 0.5 : Math.max(0.5, parseFloat((v - 0.5).toFixed(1)))) };
                  })}
                  className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-surface-container border border-outline-variant hover:bg-surface-container-high hover:border-brand-400 transition-colors text-on-surface-variant hover:text-brand-600">
                  <Dec className="h-4 w-4" />
                </button>
                <div className="flex-1 min-w-0 relative">
                  <input
                    ref={editInputRef}
                    type="number"
                    min={0}
                    step={0.5}
                    value={activeEdit.value as string}
                    onChange={(e) => setActiveEdit((prev) => prev ? { ...prev, value: e.target.value } : null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit();
                      if (e.key === 'Escape') setActiveEdit(null);
                    }}
                    placeholder="—"
                    className="w-full min-w-0 text-center text-lg font-bold text-brand-700 bg-brand-50 border border-brand-200 rounded-xl px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  {activeEdit.value && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-brand-500 bg-surface px-1 rounded">
                      {activeEdit.value}h
                    </span>
                  )}
                </div>
                <button type="button"
                  onClick={() => setActiveEdit((prev) => {
                    if (!prev) return null;
                    const v = parseFloat(prev.value as string);
                    return { ...prev, value: String(isNaN(v) ? 0.5 : parseFloat((v + 0.5).toFixed(1))) };
                  })}
                  className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-surface-container border border-outline-variant hover:bg-surface-container-high hover:border-brand-400 transition-colors text-on-surface-variant hover:text-brand-600">
                  <Inc className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setActiveEdit(null)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors">
                  <X className="h-3.5 w-3.5" />Cancel
                </button>
                <button type="button" onClick={saveEdit}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition-colors">
                  <Check className="h-3.5 w-3.5" />Save
                </button>
              </div>
            </div>
          )}

          {/* Delivery Date */}
          {activeEdit.field === 'deliveryEstimationDate' && (
            <div className="p-3 space-y-2.5">
              <input
                ref={editInputRef}
                type="date"
                value={activeEdit.value as string}
                onChange={(e) => setActiveEdit((prev) => prev ? { ...prev, value: e.target.value } : null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEdit();
                  if (e.key === 'Escape') setActiveEdit(null);
                }}
                className="w-full text-sm text-on-surface bg-surface-container border border-outline-variant rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setActiveEdit(null)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors">
                  <X className="h-3.5 w-3.5" />Cancel
                </button>
                <button type="button" onClick={saveEdit}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition-colors">
                  <Check className="h-3.5 w-3.5" />Save
                </button>
              </div>
            </div>
          )}

          {/* Category — searchable click-to-save list */}
          {activeEdit.field === 'category' && (
            <>
              <div className="px-3 pt-2 pb-1.5">
                <input
                  type="text"
                  value={editSearch}
                  onChange={(e) => setEditSearch(e.target.value)}
                  placeholder="Search categories…"
                  className="w-full text-xs bg-surface-container border border-outline-variant rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500/40"
                />
              </div>
              <div className="max-h-52 overflow-y-auto py-1">
                <button type="button"
                  onClick={() => selectSave(activeEdit.ticketId, 'category', '')}
                  className={`flex items-center gap-2 w-full px-3.5 py-2 text-xs hover:bg-surface-container-highest transition-colors ${!activeEdit.value ? 'bg-surface-container-high' : ''}`}>
                  <span className="text-on-surface-variant italic">None</span>
                  {!activeEdit.value && <Check className="h-3 w-3 ml-auto text-brand-500 shrink-0" />}
                </button>
                {(categories ?? [])
                  .filter((c) => !editSearch || c.name.toLowerCase().includes(editSearch.toLowerCase()))
                  .map((cat) => (
                    <button key={cat._id} type="button"
                      onClick={() => selectSave(activeEdit.ticketId, 'category', cat._id)}
                      className={`flex items-center gap-2 w-full px-3.5 py-2 text-xs text-on-surface hover:bg-surface-container-highest transition-colors ${activeEdit.value === cat._id ? 'bg-surface-container-high' : ''}`}>
                      <span>{cat.name}</span>
                      {activeEdit.value === cat._id && <Check className="h-3 w-3 ml-auto text-brand-500 shrink-0" />}
                    </button>
                  ))
                }
              </div>
            </>
          )}

          {/* Service Type — searchable click-to-save list */}
          {activeEdit.field === 'serviceType' && (
            <>
              <div className="px-3 pt-2 pb-1.5">
                <input
                  type="text"
                  value={editSearch}
                  onChange={(e) => setEditSearch(e.target.value)}
                  placeholder="Search service types…"
                  className="w-full text-xs bg-surface-container border border-outline-variant rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500/40"
                />
              </div>
              <div className="max-h-52 overflow-y-auto py-1">
                <button type="button"
                  onClick={() => selectSave(activeEdit.ticketId, 'serviceType', '')}
                  className={`flex items-center gap-2 w-full px-3.5 py-2 text-xs hover:bg-surface-container-highest transition-colors ${!activeEdit.value ? 'bg-surface-container-high' : ''}`}>
                  <span className="text-on-surface-variant italic">None</span>
                  {!activeEdit.value && <Check className="h-3 w-3 ml-auto text-brand-500 shrink-0" />}
                </button>
                {(serviceTypes ?? [])
                  .filter((s) => !editSearch || s.name.toLowerCase().includes(editSearch.toLowerCase()))
                  .map((st) => (
                    <button key={st._id} type="button"
                      onClick={() => selectSave(activeEdit.ticketId, 'serviceType', st._id)}
                      className={`flex items-center gap-2 w-full px-3.5 py-2 text-xs text-on-surface hover:bg-surface-container-highest transition-colors ${activeEdit.value === st._id ? 'bg-surface-container-high' : ''}`}>
                      <span>{st.name}</span>
                      {activeEdit.value === st._id && <Check className="h-3 w-3 ml-auto text-brand-500 shrink-0" />}
                    </button>
                  ))
                }
              </div>
            </>
          )}

          {/* Scope/Modules — searchable multi-select */}
          {activeEdit.field === 'scope' && (
            <>
              <div className="px-3 pt-2 pb-1.5">
                <input
                  type="text"
                  value={editSearch}
                  onChange={(e) => setEditSearch(e.target.value)}
                  placeholder="Search modules…"
                  className="w-full text-xs bg-surface-container border border-outline-variant rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500/40"
                />
              </div>
              <div className="max-h-52 overflow-y-auto py-1">
                {(modules ?? [])
                  .filter((m) => !editSearch || m.name.toLowerCase().includes(editSearch.toLowerCase()))
                  .map((mod) => {
                    const selected = (activeEdit.value as string[]).includes(mod._id);
                    return (
                      <button key={mod._id} type="button"
                        onClick={() => setActiveEdit((prev) => {
                          if (!prev) return null;
                          const curr = prev.value as string[];
                          return { ...prev, value: selected ? curr.filter((id) => id !== mod._id) : [...curr, mod._id] };
                        })}
                        className={`flex items-center gap-2.5 w-full px-3.5 py-2 text-xs hover:bg-surface-container-highest transition-colors ${selected ? 'bg-brand-50 text-brand-700' : 'text-on-surface'}`}>
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${selected ? 'bg-brand-600 border-brand-600' : 'border-outline-variant'}`}>
                          {selected && <Check className="h-2.5 w-2.5 text-white" />}
                        </div>
                        {mod.name}
                      </button>
                    );
                  })
                }
              </div>
              <div className="flex gap-2 px-3 py-2.5 border-t border-outline-variant/20">
                <button type="button" onClick={() => setActiveEdit(null)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors">
                  <X className="h-3.5 w-3.5" />Cancel
                </button>
                <button type="button" onClick={saveEdit}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition-colors">
                  <Check className="h-3.5 w-3.5" />Save
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
