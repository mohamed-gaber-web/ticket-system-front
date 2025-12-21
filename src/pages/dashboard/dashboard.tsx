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
  change: number;
  icon: React.ElementType;
  gradient: string;
  delay?: number;
}

const StatCard = ({ title, value, icon: Icon, gradient, delay = 0 }: Omit<StatCardProps, 'change'>) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
    >
      <Card className="relative overflow-hidden hover:shadow-2xl transition-all duration-300 border-0 group">
        <div className={`absolute inset-0 ${gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} />
        <div className={`absolute top-0 right-0 w-32 h-32 ${gradient} opacity-5 blur-3xl group-hover:opacity-20 transition-opacity duration-300`} />
        <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </CardTitle>
          <motion.div
            className={`p-3 rounded-xl ${gradient} shadow-lg`}
            whileHover={{ rotate: 360, scale: 1.1 }}
            transition={{ duration: 0.5 }}
          >
            <Icon className="h-5 w-5 text-white" />
          </motion.div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-3xl font-bold bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
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

  // Calculate ticket statistics from real data
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

  // Calculate response time metrics
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

    // Calculate average first response time
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

    // Calculate average resolution time
    const totalResolutionTime = resolvedTickets.reduce((sum, ticket) => {
      const created = new Date(ticket.createdAt).getTime();
      const resolved = new Date(ticket.resolvedAt!).getTime();
      return sum + (resolved - created);
    }, 0);

    const avgResolutionMs = totalResolutionTime / resolvedTickets.length;

    // Convert to hours
    const avgResponseHours = (avgResponseMs / (1000 * 60 * 60)).toFixed(1);
    const avgResolutionHours = (avgResolutionMs / (1000 * 60 * 60)).toFixed(1);

    return {
      avgResponseTime: avgResponseHours + " hrs",
      avgResolutionTime: avgResolutionHours + " hrs",
      totalResolved: resolvedTickets.length,
    };
  }, [tickets]);

  // Get recently closed tickets
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

  const stats = [
    {
      title: "Total Tickets",
      value: ticketsLoading ? "..." : ticketStats.total,
      icon: Ticket,
      gradient: "bg-gradient-to-br from-blue-500 to-blue-600",
    },
    {
      title: "Open Tickets",
      value: ticketsLoading ? "..." : ticketStats.open,
      icon: AlertTriangle,
      gradient: "bg-gradient-to-br from-orange-500 to-orange-600",
    },
    {
      title: "Closed Tickets",
      value: ticketsLoading ? "..." : ticketStats.closed,
      icon: CheckCircle2,
      gradient: "bg-gradient-to-br from-green-500 to-green-600",
    },
    {
      title: "Active Customers",
      value: customersLoading ? "..." : totalCustomers,
      icon: Users,
      gradient: "bg-gradient-to-br from-purple-500 to-purple-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-6 w-full max-w-full overflow-x-hidden">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 blur-3xl -z-10" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 p-6 rounded-2xl bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-800/50 shadow-xl">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg"
                >
                  <Sparkles className="h-6 w-6 text-white" />
                </motion.div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Dashboard
                </h1>
              </div>
              <p className="text-muted-foreground text-lg ml-14">
                Monitor your ticketing system performance in real-time
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
                <Activity className="h-4 w-4 text-green-600 dark:text-green-400 animate-pulse" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">Live Updates</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
                <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Analytics</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Section */}
        <div className="space-y-6 mt-8">
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
            <div className="h-1 w-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
              Status Overview
            </h2>
            <div className="h-1 flex-1 bg-gradient-to-r from-purple-500 to-transparent rounded-full" />
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
            className="lg:col-span-2"
          >
            <Card className="border-0 shadow-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 text-white overflow-hidden relative group">
              <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)] pointer-events-none" />
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500" />
              <CardHeader className="relative z-10">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-xl font-bold">Ticket Status Breakdown</CardTitle>
                  <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                    <Ticket className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="grid grid-cols-3 gap-6">
                  <motion.div
                    className="text-center p-4 rounded-xl bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all duration-300"
                    whileHover={{ y: -5 }}
                  >
                    <p className="text-sm opacity-90 mb-2 font-medium">In Progress</p>
                    <p className="text-3xl font-bold">{ticketsLoading ? "..." : ticketStats.inProgress}</p>
                  </motion.div>
                  <motion.div
                    className="text-center p-4 rounded-xl bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all duration-300"
                    whileHover={{ y: -5 }}
                  >
                    <p className="text-sm opacity-90 mb-2 font-medium">Assigned</p>
                    <p className="text-3xl font-bold">{ticketsLoading ? "..." : ticketStats.assigned}</p>
                  </motion.div>
                  <motion.div
                    className="text-center p-4 rounded-xl bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all duration-300"
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
            <Card className="border-0 shadow-2xl hover:shadow-3xl transition-all duration-300 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
              <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <CardTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Recent Activities
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {ticketsLoading ? (
                    <div className="text-center text-muted-foreground">Loading...</div>
                  ) : tickets.length === 0 ? (
                    <div className="text-center text-muted-foreground">No recent activities</div>
                  ) : (
                    tickets.slice(0, 5).map((ticket, index) => {
                      const getStatusIcon = () => {
                        switch (ticket.status) {
                          case "closed":
                          case "resolved":
                            return { icon: CheckCircle2, color: "text-green-600" };
                          case "in_progress":
                            return { icon: Activity, color: "text-blue-600" };
                          case "assigned":
                            return { icon: Ticket, color: "text-orange-600" };
                          default:
                            return { icon: AlertTriangle, color: "text-yellow-600" };
                        }
                      };

                      const { icon: Icon, color } = getStatusIcon();
                      const timeAgo = new Date(ticket.createdAt).toLocaleDateString();

                      return (
                        <motion.div
                          key={ticket._id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: 0.6 + index * 0.1 }}
                          whileHover={{ x: 5, transition: { duration: 0.2 } }}
                          className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all duration-300 bg-white dark:bg-gray-800"
                        >
                          <div className={`p-2 rounded-lg shadow-sm ${color.replace('text-', 'bg-').replace('600', '100')} dark:${color.replace('text-', 'bg-').replace('600', '900')}`}>
                            <Icon className={`h-4 w-4 ${color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{ticket.subject}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <span className="font-mono">{ticket.ticketNumber}</span>
                              <span>•</span>
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
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
              Performance Metrics
            </h2>
            <div className="h-1 flex-1 bg-gradient-to-r from-emerald-500 to-transparent rounded-full" />
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
          >
            <Card className="border-0 shadow-2xl bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 text-white overflow-hidden relative group">
              <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500" />
              <CardHeader className="relative z-10">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-xl font-bold">Response & Resolution Time</CardTitle>
                  <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="space-y-5">
                  <motion.div
                    className="p-4 rounded-xl bg-white/10 backdrop-blur-sm"
                    whileHover={{ scale: 1.05 }}
                  >
                    <p className="text-sm opacity-90 mb-2 font-medium">Average Response Time</p>
                    <p className="text-4xl font-bold">
                      {ticketsLoading ? "..." : responseMetrics.avgResponseTime}
                    </p>
                  </motion.div>
                  <motion.div
                    className="p-4 rounded-xl bg-white/10 backdrop-blur-sm"
                    whileHover={{ scale: 1.05 }}
                  >
                    <p className="text-sm opacity-90 mb-2 font-medium">Average Resolution Time</p>
                    <p className="text-4xl font-bold">
                      {ticketsLoading ? "..." : responseMetrics.avgResolutionTime}
                    </p>
                  </motion.div>
                  <div className="flex items-center gap-2 pt-3 border-t border-white/30">
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
            <Card className="border-0 shadow-2xl hover:shadow-3xl transition-all duration-300 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
              <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <CardTitle className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    Recently Closed Tickets
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {ticketsLoading ? (
                    <div className="text-center text-muted-foreground">Loading...</div>
                  ) : recentlyClosedTickets.length === 0 ? (
                    <div className="text-center text-muted-foreground">No closed tickets yet</div>
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
                          className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 hover:shadow-md transition-all duration-300 bg-white dark:bg-gray-800"
                        >
                          <div className="p-2 rounded-lg shadow-sm bg-green-100 dark:bg-green-900/50">
                            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{ticket.subject}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <span className="font-mono">{ticket.ticketNumber}</span>
                              <span>•</span>
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