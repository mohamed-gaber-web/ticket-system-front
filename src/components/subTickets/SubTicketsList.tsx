import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchSubTickets, clearSubTickets } from '@/redux/slices/ticketSlice';
import { CreateSubTicketDialog } from './CreateSubTicketDialog';
import { Loader2, ArrowUpRight, GitBranch, Clock, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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

  useEffect(() => {
    if (!isSubTicket && parentTicketId) {
      dispatch(fetchSubTickets({ parentId: parentTicketId }));
    }
    return () => { dispatch(clearSubTickets()); };
  }, [dispatch, parentTicketId, isSubTicket]);

  const handleRefresh = () => {
    dispatch(fetchSubTickets({ parentId: parentTicketId }));
  };

  if (isSubTicket) return null;
  if (userType === 'customer') return null;

  // Stats
  const total = subTickets.length;
  const completed = subTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
  const inProgress = subTickets.filter(t => t.status === 'in_progress').length;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    new: { bg: 'bg-accent-orange-400', text: 'text-accent-orange-600', label: 'New' },
    assigned: { bg: 'bg-brand-400', text: 'text-brand-500', label: 'Assigned' },
    in_progress: { bg: 'bg-yellow-500', text: 'text-yellow-600', label: 'In Progress' },
    customer_pending: { bg: 'bg-purple-500', text: 'text-purple-600', label: 'Customer Pending' },
    resolved: { bg: 'bg-green-500', text: 'text-green-600', label: 'Resolved' },
    closed: { bg: 'bg-surface-container-highest', text: 'text-on-surface-variant', label: 'Closed' },
  };

  const priorityConfig: Record<string, { dot: string }> = {
    critical: { dot: 'bg-error' },
    high: { dot: 'bg-accent-orange-500' },
    medium: { dot: 'bg-yellow-500' },
    low: { dot: 'bg-green-500' },
  };

  function getRelativeTime(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
            onSuccess={handleRefresh}
          />
        </div>
      ) : (
        <div className="space-y-1">
          {subTickets.map((subTicket: Ticket, index: number) => {
            const status = statusConfig[subTicket.status] || statusConfig.new;
            const priority = priorityConfig[subTicket.priority] || priorityConfig.medium;
            const isDone = subTicket.status === 'resolved' || subTicket.status === 'closed';

            return (
              <div
                key={subTicket._id}
                onClick={() => navigate(`/tickets/view/${subTicket._id}`)}
                className="group flex items-center gap-4 px-4 py-3.5 rounded-[0.75rem] hover:bg-surface-container-lowest cursor-pointer transition-all"
              >
                {/* Left: Status indicator line */}
                <div className="flex flex-col items-center gap-1 self-stretch">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isDone ? 'bg-green-500' : status.bg} ring-2 ring-surface/80`} />
                  {index < subTickets.length - 1 && (
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
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <span className="font-mono font-medium">{subTicket.ticketNumber}</span>
                    <span className="text-on-surface-variant/30">·</span>
                    <div className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`} />
                      <span className="capitalize">{subTicket.priority}</span>
                    </div>
                    <span className="text-on-surface-variant/30">·</span>
                    <span>{getRelativeTime(subTicket.updatedAt || subTicket.createdAt)}</span>
                  </div>
                </div>

                {/* Right: Status + Arrow */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-[11px] font-semibold ${status.text}`}>
                    {status.label}
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-on-surface-variant/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
