import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchSubTickets, clearSubTickets } from '@/redux/slices/ticketSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreateSubTicketDialog } from './CreateSubTicketDialog';
import { Loader2, ExternalLink, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Ticket } from '@/types/ticket';

interface SubTicketsListProps {
  parentTicketId: string;
  parentTicketNumber: string;
  isSubTicket?: boolean;
}

export function SubTicketsList({ parentTicketId, parentTicketNumber, isSubTicket }: SubTicketsListProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { subTickets, subTicketsLoading } = useAppSelector((state) => state.tickets);

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'assigned':
        return 'bg-purple-100 text-purple-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      case 'reopened':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Don't show sub-tickets section if this ticket is already a sub-ticket
  if (isSubTicket) {
    return null;
  }

  return (
    <Card className="shadow-md">
      <CardHeader className="flex flex-row items-center justify-between bg-gray-50 border-b">
        <CardTitle className="text-xl">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Sub-Tickets ({subTickets.length})
          </div>
        </CardTitle>
        <CreateSubTicketDialog
          parentTicketId={parentTicketId}
          parentTicketNumber={parentTicketNumber}
          onSuccess={handleRefresh}
        />
      </CardHeader>
      <CardContent className="p-6">
        {subTicketsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : subTickets.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No sub-tickets yet</p>
            <p className="text-sm">Create one to break down this ticket into smaller tasks.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {subTickets.map((subTicket: Ticket) => (
              <div
                key={subTicket._id}
                className="border rounded-lg p-5 hover:shadow-md transition-all bg-white hover:bg-gray-50 cursor-pointer group"
                onClick={() => navigate(`/tickets/view/${subTicket._id}`)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="font-mono text-base font-semibold text-blue-600">
                        {subTicket.ticketNumber}
                      </span>
                      <Badge className={getStatusColor(subTicket.status)}>
                        {subTicket.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge variant={getPriorityColor(subTicket.priority)}>
                        {subTicket.priority.toUpperCase()}
                      </Badge>
                    </div>
                    <h4 className="font-semibold text-lg mb-2 text-gray-900">{subTicket.subject}</h4>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">{subTicket.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Created {new Date(subTicket.createdAt).toLocaleDateString()}</span>
                      {subTicket.updatedAt && (
                        <span>Updated {new Date(subTicket.updatedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <ExternalLink className="h-5 w-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
