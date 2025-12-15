import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchSubTickets, clearSubTickets } from '@/redux/slices/ticketSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreateSubTicketDialog } from './CreateSubTicketDialog';
import { Loader2, ExternalLink, Users, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [showSubTickets, setShowSubTickets] = useState(true);

  useEffect(() => {
    if (!isSubTicket && parentTicketId) {
      dispatch(fetchSubTickets({ parentId: parentTicketId }));
    }

    return () => {
      dispatch(clearSubTickets());
    };
  }, [dispatch, parentTicketId, isSubTicket]);

  const handleRefresh = () => {
    dispatch(fetchSubTickets({ parentId: parentTicketId }));
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'critical':
        return { variant: 'destructive' as const, icon: '🔴' };
      case 'high':
        return { variant: 'default' as const, icon: '🟠' };
      case 'medium':
        return { variant: 'secondary' as const, icon: '🟡' };
      case 'low':
        return { variant: 'outline' as const, icon: '🟢' };
      default:
        return { variant: 'outline' as const, icon: '⚪' };
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'new':
        return { className: 'bg-blue-500 text-white', label: 'New' };
      case 'assigned':
        return { className: 'bg-purple-500 text-white', label: 'Assigned' };
      case 'in_progress':
        return { className: 'bg-amber-500 text-white', label: 'In Progress' };
      case 'resolved':
        return { className: 'bg-green-500 text-white', label: 'Resolved' };
      case 'closed':
        return { className: 'bg-gray-500 text-white', label: 'Closed' };
      default:
        return { className: 'bg-gray-500 text-white', label: status };
    }
  };

  // Don't show sub-tickets section if this ticket is already a sub-ticket
  if (isSubTicket) {
    return null;
  }

  // Don't show sub-tickets section for customers
  if (userType === 'customer') {
    return null;
  }

  return (
    <Card className="shadow-lg border-0 overflow-hidden p-0">
      <CardHeader
        className="bg-gradient-to-r from-violet-600 to-purple-600 text-white cursor-pointer p-4 m-0"
        onClick={() => setShowSubTickets(!showSubTickets)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2 m-0">
              <Users className="h-5 w-5" />
              Sub-Tickets
              <Badge variant="secondary" className="ml-2 bg-white/20 text-white border-white/30">
                {subTickets.length}
              </Badge>
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <CreateSubTicketDialog
              parentTicketId={parentTicketId}
              parentTicketNumber={parentTicketNumber}
              onSuccess={handleRefresh}
              userType={userType}
            />
            {showSubTickets ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </div>
        </div>
      </CardHeader>
      {showSubTickets && (
        <CardContent className="p-4">
          {subTicketsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
            </div>
          ) : subTickets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-base font-medium mb-1">No sub-tickets yet</p>
              <p className="text-sm">Break down this ticket into smaller tasks.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {subTickets.map((subTicket: Ticket) => {
                const statusConfig = getStatusConfig(subTicket.status);
                const priorityConfig = getPriorityConfig(subTicket.priority);

                return (
                  <div
                    key={subTicket._id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-violet-300 transition-all bg-white hover:bg-gradient-to-r hover:from-violet-50 hover:to-purple-50 cursor-pointer group"
                    onClick={() => navigate(`/tickets/view/${subTicket._id}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="font-mono text-sm font-semibold text-violet-600">
                            {subTicket.ticketNumber}
                          </span>
                          <Badge className={`${statusConfig.className} text-xs px-2 py-0.5`}>
                            {statusConfig.label}
                          </Badge>
                          <Badge variant={priorityConfig.variant} className="text-xs px-2 py-0.5">
                            {priorityConfig.icon} {subTicket.priority.toUpperCase()}
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-base mb-1.5 text-gray-900 line-clamp-1">
                          {subTicket.subject}
                        </h4>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {subTicket.description}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>Created {new Date(subTicket.createdAt).toLocaleDateString()}</span>
                          {subTicket.updatedAt && (
                            <span>• Updated {new Date(subTicket.updatedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <ExternalLink className="h-5 w-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
