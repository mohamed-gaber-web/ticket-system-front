import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  Ticket,
  Users,
  CheckCircle2,
  Activity,
  AlertTriangle,
  Clock,
  TrendingUp,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks/hooks";
import { fetchTickets } from "@/redux/slices/ticketSlice";
import { fetchCustomers } from "@/redux/slices/customerSlice";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  gradient: string;
  iconBg: string;
  delay?: number;
}

const StatCard = ({ title, value, icon: Icon, iconBg, delay = 0 }: StatCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Card className="relative overflow-hidden hover:shadow-ambient transition-all duration-300 group">
        <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
          <CardTitle className="label-technical">
            {title}
          </CardTitle>
          <motion.div
            className={`p-3 rounded-[1rem] ${iconBg}`}
            whileHover={{ rotate: 360, scale: 1.1 }}
            transition={{ duration: 0.5 }}
          >
            <Icon className="h-5 w-5 text-white" />
          </motion.div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="display-sm text-on-surface">
            {value}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const Dashboard = () => {
  const dispatch = useAppDispatch();
  const { tickets, total: totalTickets, loading: ticketsLoading } = useAppSelector((state) => state.tickets);
  const { total: totalCustomers, loading: customersLoading } = useAppSelector((state) => state.customers);

  useEffect(() => {
    dispatch(fetchTickets());
    dispatch(fetchCustomers());
  }, [dispatch]);

  const ticketStats = useMemo(() => {
    const openTickets = tickets.filter(
      (ticket) => ticket.status === "new" || ticket.status === "assigned"
    ).length;

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
      open: openTickets,
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

  const stats: StatCardProps[] = [
    {
      title: "Total Tickets",
      value: ticketsLoading ? "..." : ticketStats.total,
      icon: Ticket,
      gradient: "",
      iconBg: "bg-primary-gradient",
    },
    {
      title: "Open Tickets",
      value: ticketsLoading ? "..." : ticketStats.open,
      icon: AlertTriangle,
      gradient: "",
      iconBg: "bg-gradient-to-br from-accent-orange-500 to-accent-orange-600",
    },
    {
      title: "Closed Tickets",
      value: ticketsLoading ? "..." : ticketStats.closed,
      icon: CheckCircle2,
      gradient: "",
      iconBg: "bg-gradient-to-br from-green-500 to-green-600",
    },
    {
      title: "Active Customers",
      value: customersLoading ? "..." : totalCustomers,
      icon: Users,
      gradient: "",
      iconBg: "bg-gradient-to-br from-purple-500 to-purple-600",
    },
  ];

  return (
    <div className="min-h-screen bg-surface p-8 w-full max-w-full overflow-x-hidden">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 p-8 rounded-[1rem] bg-surface-container-lowest">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="p-2.5 rounded-[1rem] bg-primary-gradient"
                >
                  <Sparkles className="h-6 w-6 text-white" />
                </motion.div>
                <h1 className="display-md text-on-surface">
                  Dashboard
                </h1>
              </div>
              <p className="text-on-surface-variant text-lg ml-14">
                Monitor your ticketing system performance in real-time
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-[1rem] bg-green-500/10">
                <Activity className="h-4 w-4 text-green-600 animate-pulse" />
                <span className="text-sm font-semibold text-green-700">Live Updates</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-[1rem] bg-primary-fixed">
                <BarChart3 className="h-4 w-4 text-brand-500" />
                <span className="text-sm font-semibold text-on-primary-fixed">Analytics</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Section */}
        <div className="space-y-8 mt-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <StatCard key={stat.title} {...stat} delay={index * 0.1} />
            ))}
          </div>
        </div>

        {/* Ticket Status & Activities Section */}
        <div className="space-y-6 mt-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex items-center gap-3"
          >
            <div className="h-1 w-12 bg-primary-gradient rounded-full" />
            <h2 className="text-2xl font-bold text-on-surface">
              Status Overview
            </h2>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
            className="lg:col-span-2"
          >
            <Card className="shadow-ambient bg-primary-gradient text-white overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all duration-500" />
              <CardHeader className="relative z-10">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-xl font-bold">Ticket Status Breakdown</CardTitle>
                  <div className="p-2 rounded-[0.75rem] bg-white/15 backdrop-blur-sm">
                    <Ticket className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="grid grid-cols-3 gap-6">
                  <motion.div
                    className="text-center p-4 rounded-[1rem] bg-white/10 backdrop-blur-sm hover:bg-white/15 transition-all duration-300"
                    whileHover={{ y: -5 }}
                  >
                    <p className="text-sm opacity-90 mb-2 font-medium">In Progress</p>
                    <p className="text-3xl font-bold">{ticketsLoading ? "..." : ticketStats.inProgress}</p>
                  </motion.div>
                  <motion.div
                    className="text-center p-4 rounded-[1rem] bg-white/10 backdrop-blur-sm hover:bg-white/15 transition-all duration-300"
                    whileHover={{ y: -5 }}
                  >
                    <p className="text-sm opacity-90 mb-2 font-medium">Assigned</p>
                    <p className="text-3xl font-bold">{ticketsLoading ? "..." : ticketStats.assigned}</p>
                  </motion.div>
                  <motion.div
                    className="text-center p-4 rounded-[1rem] bg-white/10 backdrop-blur-sm hover:bg-white/15 transition-all duration-300"
                    whileHover={{ y: -5 }}
                  >
                    <p className="text-sm opacity-90 mb-2 font-medium">New</p>
                    <p className="text-3xl font-bold">{ticketsLoading ? "..." : ticketStats.new}</p>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
          >
            <Card className="shadow-ambient transition-all duration-300">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-brand-500" />
                  <CardTitle className="text-xl font-bold text-on-surface">
                    Recent Activities
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {ticketsLoading ? (
                    <div className="text-center text-on-surface-variant">Loading...</div>
                  ) : tickets.length === 0 ? (
                    <div className="text-center text-on-surface-variant">No recent activities</div>
                  ) : (
                    tickets.slice(0, 5).map((ticket, index) => {
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

                      const { icon: Icon, color, bg } = getStatusIcon();
                      const timeAgo = new Date(ticket.createdAt).toLocaleDateString();

                      return (
                        <motion.div
                          key={ticket._id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: 0.6 + index * 0.1 }}
                          whileHover={{ x: 5, transition: { duration: 0.2 } }}
                          className="flex items-start gap-3 p-3 rounded-[0.75rem] hover:bg-surface-container-highest transition-all duration-300"
                        >
                          <div className={`p-2 rounded-[0.75rem] ${bg}`}>
                            <Icon className={`h-4 w-4 ${color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-on-surface truncate">{ticket.subject}</p>
                            <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-1">
                              <span className="font-mono">{ticket.ticketNumber}</span>
                              <span>·</span>
                              <span>{timeAgo}</span>
                            </p>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
          </div>
        </div>

        {/* Performance Metrics Section */}
        <div className="space-y-6 mt-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex items-center gap-3"
          >
            <div className="h-1 w-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" />
            <h2 className="text-2xl font-bold text-on-surface">
              Performance Metrics
            </h2>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
          >
            <Card className="shadow-ambient bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 text-white overflow-hidden relative group">
              <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all duration-500" />
              <CardHeader className="relative z-10">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-xl font-bold">Response & Resolution Time</CardTitle>
                  <div className="p-2 rounded-[0.75rem] bg-white/15 backdrop-blur-sm">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="space-y-5">
                  <motion.div
                    className="p-4 rounded-[1rem] bg-white/10 backdrop-blur-sm"
                    whileHover={{ scale: 1.03 }}
                  >
                    <p className="text-sm opacity-90 mb-2 font-medium">Average Response Time</p>
                    <p className="text-4xl font-bold tracking-tight">
                      {ticketsLoading ? "..." : responseMetrics.avgResponseTime}
                    </p>
                  </motion.div>
                  <motion.div
                    className="p-4 rounded-[1rem] bg-white/10 backdrop-blur-sm"
                    whileHover={{ scale: 1.03 }}
                  >
                    <p className="text-sm opacity-90 mb-2 font-medium">Average Resolution Time</p>
                    <p className="text-4xl font-bold tracking-tight">
                      {ticketsLoading ? "..." : responseMetrics.avgResolutionTime}
                    </p>
                  </motion.div>
                  <div className="flex items-center gap-2 pt-3">
                    <TrendingUp className="h-5 w-5" />
                    <span className="text-sm font-semibold">
                      {responseMetrics.totalResolved} tickets resolved
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
          >
            <Card className="shadow-ambient transition-all duration-300">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-xl font-bold text-on-surface">
                    Recently Closed Tickets
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {ticketsLoading ? (
                    <div className="text-center text-on-surface-variant">Loading...</div>
                  ) : recentlyClosedTickets.length === 0 ? (
                    <div className="text-center text-on-surface-variant">No closed tickets yet</div>
                  ) : (
                    recentlyClosedTickets.map((ticket, index) => {
                      const closedDate = new Date(
                        ticket.resolvedAt || ticket.closedAt || ticket.updatedAt
                      ).toLocaleDateString();

                      return (
                        <motion.div
                          key={ticket._id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: 0.8 + index * 0.1 }}
                          whileHover={{ x: 5, transition: { duration: 0.2 } }}
                          className="flex items-start gap-3 p-3 rounded-[0.75rem] hover:bg-surface-container-highest transition-all duration-300"
                        >
                          <div className="p-2 rounded-[0.75rem] bg-green-500/10">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-on-surface truncate">{ticket.subject}</p>
                            <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-1">
                              <span className="font-mono">{ticket.ticketNumber}</span>
                              <span>·</span>
                              <span>Closed on {closedDate}</span>
                            </p>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
          </div>
        </div>

        {/* Bottom Spacing */}
        <div className="pb-8" />
    </div>
  );
};

export default Dashboard;
