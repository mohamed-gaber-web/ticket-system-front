import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Ticket,
  Users,
  CheckCircle2,
  Activity,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks/hooks";
import { fetchTickets } from "@/redux/slices/ticketSlice";
import { fetchCustomers } from "@/redux/slices/customerSlice";

interface StatItemProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconColor: string;
}

const StatItem = ({ label, value, icon: Icon, iconColor }: StatItemProps) => (
  <div className="flex items-center gap-3 min-w-0">
    <div className={`p-2 rounded-[0.5rem] ${iconColor}/10 shrink-0`}>
      <Icon className={`h-4 w-4 ${iconColor}`} />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-on-surface-variant font-medium truncate">{label}</p>
      <p className="text-xl font-bold text-on-surface tabular-nums">{value}</p>
    </div>
  </div>
);

const Dashboard = () => {
  const dispatch = useAppDispatch();
  const { tickets, total: totalTickets, loading: ticketsLoading } = useAppSelector((state) => state.tickets);
  const { total: totalCustomers, loading: customersLoading } = useAppSelector((state) => state.customers);

  useEffect(() => {
    dispatch(fetchTickets());
    dispatch(fetchCustomers());
  }, [dispatch]);

  const ticketStats = useMemo(() => {
    const closedTickets = tickets.filter(
      (ticket) => ticket.status === "closed" || ticket.status === "resolved"
    ).length;

    const inProgressTickets = tickets.filter(
      (ticket) => ticket.status === "in_progress"
    ).length;

    const newTickets = tickets.filter(
      (ticket) => ticket.status === "new"
    ).length;

    const assignedTickets = tickets.filter(
      (ticket) => ticket.status === "assigned"
    ).length;

    return {
      total: totalTickets,
      closed: closedTickets,
      inProgress: inProgressTickets,
      new: newTickets,
      assigned: assignedTickets,
    };
  }, [tickets, totalTickets]);

  const responseMetrics = useMemo(() => {
    const resolvedTickets = tickets.filter(
      (ticket) => ticket.resolvedAt && ticket.createdAt
    );

    if (resolvedTickets.length === 0) {
      return {
        avgResponseTime: "N/A",
        avgResolutionTime: "N/A",
        totalResolved: 0,
      };
    }

    const ticketsWithResponse = tickets.filter(
      (ticket) => ticket.firstResponseAt && ticket.createdAt
    );

    let avgResponseMs = 0;
    if (ticketsWithResponse.length > 0) {
      const totalResponseTime = ticketsWithResponse.reduce((sum, ticket) => {
        const created = new Date(ticket.createdAt).getTime();
        const responded = new Date(ticket.firstResponseAt!).getTime();
        return sum + (responded - created);
      }, 0);
      avgResponseMs = totalResponseTime / ticketsWithResponse.length;
    }

    const totalResolutionTime = resolvedTickets.reduce((sum, ticket) => {
      const created = new Date(ticket.createdAt).getTime();
      const resolved = new Date(ticket.resolvedAt!).getTime();
      return sum + (resolved - created);
    }, 0);

    const avgResolutionMs = totalResolutionTime / resolvedTickets.length;

    const avgResponseHours = (avgResponseMs / (1000 * 60 * 60)).toFixed(1);
    const avgResolutionHours = (avgResolutionMs / (1000 * 60 * 60)).toFixed(1);

    return {
      avgResponseTime: avgResponseHours + " hrs",
      avgResolutionTime: avgResolutionHours + " hrs",
      totalResolved: resolvedTickets.length,
    };
  }, [tickets]);

  const recentlyClosedTickets = useMemo(() => {
    return tickets
      .filter((ticket) => ticket.status === "closed" || ticket.status === "resolved")
      .sort((a, b) => {
        const dateA = new Date(a.resolvedAt || a.closedAt || a.updatedAt).getTime();
        const dateB = new Date(b.resolvedAt || b.closedAt || b.updatedAt).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [tickets]);

  return (
    <div className="min-h-screen bg-surface p-8 w-full max-w-full overflow-x-hidden">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="display-sm text-on-surface">Dashboard</h1>
          <p className="text-on-surface-variant mt-1">
            Monitor your ticketing system performance
          </p>
        </div>

        {/* Stats Strip — dense, scannable KPIs */}
        <Card>
          <CardContent className="py-5">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-x-6 gap-y-4 divide-x-0 lg:divide-x lg:divide-outline-variant/30">
              <StatItem label="Total" value={ticketsLoading ? "..." : ticketStats.total} icon={Ticket} iconColor="text-brand-500" />
              <div className="lg:pl-6"><StatItem label="New" value={ticketsLoading ? "..." : ticketStats.new} icon={AlertTriangle} iconColor="text-yellow-600" /></div>
              <div className="lg:pl-6"><StatItem label="Assigned" value={ticketsLoading ? "..." : ticketStats.assigned} icon={Ticket} iconColor="text-accent-orange-500" /></div>
              <div className="lg:pl-6"><StatItem label="In Progress" value={ticketsLoading ? "..." : ticketStats.inProgress} icon={Activity} iconColor="text-brand-400" /></div>
              <div className="lg:pl-6"><StatItem label="Closed" value={ticketsLoading ? "..." : ticketStats.closed} icon={CheckCircle2} iconColor="text-green-600" /></div>
              <div className="lg:pl-6"><StatItem label="Customers" value={customersLoading ? "..." : totalCustomers} icon={Users} iconColor="text-brand-700" /></div>
              <div className="lg:pl-6"><StatItem label="Resolved" value={ticketsLoading ? "..." : responseMetrics.totalResolved} icon={TrendingUp} iconColor="text-green-600" /></div>
            </div>
          </CardContent>
        </Card>

        {/* Main content — asymmetric 2/3 + 1/3 */}
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr] mt-6">

          {/* Primary column */}
          <div className="space-y-6">
            {/* Recent Activities — the main working list */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-brand-500" />
                  <CardTitle>Recent Activities</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-0.5">
                  {ticketsLoading ? (
                    <div className="text-center py-8 text-on-surface-variant text-sm">Loading...</div>
                  ) : tickets.length === 0 ? (
                    <div className="text-center py-8 text-on-surface-variant text-sm">No recent activities</div>
                  ) : (
                    tickets.slice(0, 8).map((ticket) => {
                      const getStatusIcon = () => {
                        switch (ticket.status) {
                          case "closed":
                          case "resolved":
                            return { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-500/10" };
                          case "in_progress":
                            return { icon: Activity, color: "text-brand-500", bg: "bg-primary-fixed" };
                          case "assigned":
                            return { icon: Ticket, color: "text-accent-orange-500", bg: "bg-accent-orange-100" };
                          default:
                            return { icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-500/10" };
                        }
                      };

                      const { icon: StatusIcon, color, bg } = getStatusIcon();
                      const timeAgo = new Date(ticket.createdAt).toLocaleDateString();

                      return (
                        <div
                          key={ticket._id}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-[0.5rem] hover:bg-surface-container-highest transition-colors"
                        >
                          <div className={`p-1.5 rounded-[0.5rem] shrink-0 ${bg}`}>
                            <StatusIcon className={`h-3.5 w-3.5 ${color}`} />
                          </div>
                          <p className="text-sm font-medium text-on-surface truncate flex-1 min-w-0">{ticket.subject}</p>
                          <span className="text-xs text-on-surface-variant font-mono shrink-0">{ticket.ticketNumber}</span>
                          <span className="text-xs text-on-surface-variant shrink-0 hidden sm:block">{timeAgo}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recently Closed */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <CardTitle>Recently Closed</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-0.5">
                  {ticketsLoading ? (
                    <div className="text-center py-6 text-on-surface-variant text-sm">Loading...</div>
                  ) : recentlyClosedTickets.length === 0 ? (
                    <div className="text-center py-6 text-on-surface-variant text-sm">No closed tickets yet</div>
                  ) : (
                    recentlyClosedTickets.map((ticket) => {
                      const closedDate = new Date(
                        ticket.resolvedAt || ticket.closedAt || ticket.updatedAt
                      ).toLocaleDateString();

                      return (
                        <div
                          key={ticket._id}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-[0.5rem] hover:bg-surface-container-highest transition-colors"
                        >
                          <div className="p-1.5 rounded-[0.5rem] bg-green-500/10 shrink-0">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                          </div>
                          <p className="text-sm font-medium text-on-surface truncate flex-1 min-w-0">{ticket.subject}</p>
                          <span className="text-xs text-on-surface-variant font-mono shrink-0">{ticket.ticketNumber}</span>
                          <span className="text-xs text-on-surface-variant shrink-0 hidden sm:block">{closedDate}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary column — performance sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-on-surface-variant font-medium mb-1">Avg Response Time</p>
                    <p className="text-2xl font-bold text-on-surface tabular-nums">
                      {ticketsLoading ? "..." : responseMetrics.avgResponseTime}
                    </p>
                  </div>
                  <div className="h-px bg-outline-variant/30" />
                  <div>
                    <p className="text-xs text-on-surface-variant font-medium mb-1">Avg Resolution Time</p>
                    <p className="text-2xl font-bold text-on-surface tabular-nums">
                      {ticketsLoading ? "..." : responseMetrics.avgResolutionTime}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
    </div>
  );
};

export default Dashboard;
