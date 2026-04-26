import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchSubTickets, clearSubTickets, deleteTicket, updateTicket } from '@/redux/slices/ticketSlice';
import { CreateSubTicketDialog } from './CreateSubTicketDialog';
import { Loader2, ArrowUpRight, GitBranch, Clock, CheckCircle2, Trash2, XCircle, RotateCcw, User, Calendar, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { Ticket } from '@/types/ticket';

interface SubTicketsListProps {
  parentTicketId: string;
  parentTicketNumber: string;
  isSubTicket?: boolean;
  userType?: string;
}

export function SubTicketsList({ parentTicketId, parentTicketNumber, isSubTicket, userType }: SubTicketsListProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { subTickets, subTicketsLoading } = useAppSelector((state) => state.tickets);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    if (!isSubTicket && parentTicketId) {
      dispatch(fetchSubTickets({ parentId: parentTicketId, params: { limit: 500 } }));
    }
    return () => { dispatch(clearSubTickets()); };
  }, [dispatch, parentTicketId, isSubTicket]);

  const handleRefresh = () => {
    dispatch(fetchSubTickets({ parentId: parentTicketId, params: { limit: 500 } }));
  };

  const handleDelete = async (e: React.MouseEvent, subTicketId: string) => {
    e.stopPropagation();
    try {
      await dispatch(deleteTicket(subTicketId)).unwrap();
      toast.success('Sub-ticket deleted');
      handleRefresh();
    } catch {
      toast.error('Failed to delete sub-ticket');
    }
  };

  const handleReject = async (e: React.MouseEvent, subTicketId: string) => {
    e.stopPropagation();
    try {
      await dispatch(updateTicket({ id: subTicketId, data: { status: 'closed' } })).unwrap();
      toast.success('Sub-ticket closed');
      handleRefresh();
    } catch {
      toast.error('Failed to close sub-ticket');
    }
  };

  const handleReopen = async (e: React.MouseEvent, subTicketId: string) => {
    e.stopPropagation();
    try {
      await dispatch(updateTicket({ id: subTicketId, data: { status: 'reopened' } })).unwrap();
      toast.success('Sub-ticket reopened');
      handleRefresh();
    } catch {
      toast.error('Failed to reopen sub-ticket');
    }
  };

  if (isSubTicket) return null;

  const isCustomer = userType === 'customer';

  // Stats
  const total = subTickets.length;
  const completed = subTickets.filter(t => ['resolved', 'closed', 'delivered'].includes(t.status)).length;
  const inProgress = subTickets.filter(t => t.status === 'in_progress').length;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    new: { bg: 'bg-accent-orange-400', text: 'text-accent-orange-600', label: 'New' },
    assigned: { bg: 'bg-brand-400', text: 'text-brand-500', label: 'Assigned' },
    in_progress: { bg: 'bg-yellow-500', text: 'text-yellow-600', label: 'In Progress' },
    customer_pending: { bg: 'bg-purple-500', text: 'text-purple-600', label: 'Customer Pending' },
    resolved: { bg: 'bg-green-500', text: 'text-green-600', label: 'Resolved' },
    tested: { bg: 'bg-cyan-600', text: 'text-cyan-700', label: 'Tested' },
    delivered: { bg: 'bg-teal-500', text: 'text-teal-600', label: 'Delivered' },
    closed: { bg: 'bg-surface-container-highest', text: 'text-on-surface-variant', label: 'Closed' },
    reopened: { bg: 'bg-brand-400', text: 'text-brand-500', label: 'Reopened' },
    not_related: { bg: 'bg-slate-500', text: 'text-slate-600', label: 'Not Related' },
  };

  const allStatuses = Object.keys(statusConfig);
  const filteredSubTickets = statusFilter ? subTickets.filter(t => t.status === statusFilter) : subTickets;

  const priorityConfig: Record<string, { dot: string }> = {
    critical: { dot: 'bg-error' },
    high: { dot: 'bg-accent-orange-500' },
    medium: { dot: 'bg-yellow-500' },
    low: { dot: 'bg-green-500' },
  };

  function formatDateTime(dateStr: string): string {
    const date = new Date(dateStr);
    const datePart = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timePart = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return `${datePart}, ${timePart}`;
  }

  return (
    <section>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-[0.75rem] bg-primary-fixed">
            <GitBranch className="h-4 w-4 text-brand-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-on-surface">Sub-Tickets</h3>
            {total > 0 && (
              <p className="text-xs text-on-surface-variant">{completed}/{total} completed</p>
            )}
          </div>
        </div>
        <CreateSubTicketDialog
          parentTicketId={parentTicketId}
          parentTicketNumber={parentTicketNumber}
          isCustomer={isCustomer}
          onSuccess={handleRefresh}
        />
      </div>

      {/* Progress Bar (when there are sub-tickets) */}
      {total > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-on-surface-variant">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                {completed} done
              </span>
              <span className="flex items-center gap-1.5 text-on-surface-variant">
                <Clock className="h-3 w-3 text-yellow-500" />
                {inProgress} active
              </span>
            </div>
            <span className="text-xs font-semibold text-on-surface">{progressPercent}%</span>
          </div>
          <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-green-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Status Filter Pills */}
      {total > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          <button
            onClick={() => setStatusFilter(null)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              statusFilter === null
                ? 'bg-brand-500 text-white'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            All <span className="ml-1 opacity-70">{total}</span>
          </button>
          {allStatuses.map(s => {
            const cfg = statusConfig[s];
            const count = subTickets.filter(t => t.status === s).length;
            const isActive = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(isActive ? null : s)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  isActive
                    ? `${cfg.bg} text-white`
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white/70' : cfg.bg}`} />
                {cfg.label}
                <span className="opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Content */}
      {subTicketsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : subTickets.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-[1rem] py-12 text-center">
          <div className="w-12 h-12 rounded-[1rem] bg-surface-container-high mx-auto mb-4 flex items-center justify-center">
            <GitBranch className="h-6 w-6 text-on-surface-variant/40" />
          </div>
          <p className="text-on-surface font-semibold text-sm mb-1">No sub-tickets yet</p>
          <p className="text-xs text-on-surface-variant mb-5 max-w-[250px] mx-auto">
            Break this ticket into smaller, trackable tasks
          </p>
          <CreateSubTicketDialog
            parentTicketId={parentTicketId}
            parentTicketNumber={parentTicketNumber}
            isCustomer={isCustomer}
            onSuccess={handleRefresh}
          />
        </div>
      ) : filteredSubTickets.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-on-surface-variant">No sub-tickets match the selected status.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {[...filteredSubTickets]
            .sort((a, b) => {
              const isDoneA = ['resolved', 'closed', 'delivered'].includes(a.status);
              const isDoneB = ['resolved', 'closed', 'delivered'].includes(b.status);
              if (isDoneA === isDoneB) return 0;
              return isDoneA ? 1 : -1;
            })
            .map((subTicket: Ticket, index: number) => {
            const status = statusConfig[subTicket.status] || statusConfig.new;
            const priority = priorityConfig[subTicket.priority] || priorityConfig.medium;
            const isDone = ['resolved', 'closed', 'delivered'].includes(subTicket.status);

            return (
              <div
                key={subTicket._id}
                onClick={() => navigate(`/tickets/view/${subTicket._id}`)}
                className="group flex items-center gap-4 px-4 py-3.5 rounded-[0.75rem] hover:bg-surface-container-lowest cursor-pointer transition-all"
              >
                {/* Left: Status indicator line */}
                <div className="flex flex-col items-center gap-1 self-stretch">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isDone ? 'bg-green-500' : status.bg} ring-2 ring-surface/80`} />
                  {index < filteredSubTickets.length - 1 && (
                    <div className="w-px flex-1 bg-surface-container-high" />
                  )}
                </div>

                {/* Middle: Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className={`text-sm font-semibold truncate ${isDone ? 'text-on-surface-variant line-through decoration-on-surface-variant/30' : 'text-on-surface'}`}>
                      {subTicket.subject}
                    </h4>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-on-surface-variant">
                    <span className="font-mono font-medium">{subTicket.ticketNumber}</span>
                    <span className="text-on-surface-variant/30">·</span>
                    <div className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`} />
                      <span className="capitalize">{subTicket.priority}</span>
                    </div>
                    {/* Department */}
                    {subTicket.department && typeof subTicket.department === 'object' && (subTicket.department as any).name && (
                      <>
                        <span className="text-on-surface-variant/30">·</span>
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 flex-shrink-0" />
                          <span>{(subTicket.department as any).name}</span>
                        </div>
                      </>
                    )}
                    {/* Assignee */}
                    {(() => {
                      const assignee = subTicket.acceptedBy ?? subTicket.assignedBy;
                      if (!assignee) return null;
                      const name = typeof assignee === 'object'
                        ? `${(assignee as any).firstName} ${(assignee as any).lastName}`
                        : null;
                      if (!name) return null;
                      return (
                        <>
                          <span className="text-on-surface-variant/30">·</span>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 flex-shrink-0" />
                            <span>{name}</span>
                          </div>
                        </>
                      );
                    })()}
                    {/* Start Date */}
                    {subTicket.startDate && (
                      <>
                        <span className="text-on-surface-variant/30">·</span>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 flex-shrink-0" />
                          <span>{new Date(subTicket.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      </>
                    )}
                    <span className="text-on-surface-variant/30">·</span>
                    <span>{formatDateTime(subTicket.updatedAt || subTicket.createdAt)}</span>
                  </div>
                </div>

                {/* Right: Status + Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[11px] font-semibold ${status.text}`}>
                    {status.label}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isCustomer && subTicket.status === 'resolved' && (
                      <button
                        onClick={(e) => handleReopen(e, subTicket._id)}
                        title="Reopen"
                        className="p-1 rounded-md text-brand-500 hover:bg-brand-50 transition-colors"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {!isCustomer && !['closed', 'resolved'].includes(subTicket.status) && (
                      <button
                        onClick={(e) => handleReject(e, subTicket._id)}
                        title="Reject"
                        className="p-1 rounded-md text-error hover:bg-error/10 transition-colors"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {!isCustomer && (
                      <button
                        onClick={(e) => handleDelete(e, subTicket._id)}
                        title="Delete"
                        className="p-1 rounded-md text-error hover:bg-error/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <ArrowUpRight className="h-3.5 w-3.5 text-on-surface-variant/30" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
