import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  Ticket,
  Users,
  TrendingUp,
  Clock,
  CheckCircle2,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  UserCheck,
  UsersRound,
  BarChart3,
} from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ElementType;
  gradient: string;
  delay?: number;
}

const StatCard = ({ title, value, change, icon: Icon, gradient, delay = 0 }: StatCardProps) => {
  const isPositive = change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300 border-0">
        <div className={`absolute inset-0 ${gradient} opacity-5`} />
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className={`p-2 rounded-lg ${gradient}`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold">{value}</div>
              <div className={`flex items-center text-xs mt-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? (
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 mr-1" />
                )}
                <span>{Math.abs(change)}% from last month</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const Dashboard = () => {
  const stats = [
    {
      title: "Total Tickets",
      value: "1,234",
      change: 12.5,
      icon: Ticket,
      gradient: "bg-gradient-to-br from-blue-500 to-blue-600",
    },
    {
      title: "Open Tickets",
      value: "187",
      change: -8.3,
      icon: AlertTriangle,
      gradient: "bg-gradient-to-br from-orange-500 to-orange-600",
    },
    {
      title: "Resolved Today",
      value: "45",
      change: 15.2,
      icon: CheckCircle2,
      gradient: "bg-gradient-to-br from-green-500 to-green-600",
    },
    {
      title: "Active Customers",
      value: "328",
      change: 6.8,
      icon: Users,
      gradient: "bg-gradient-to-br from-purple-500 to-purple-600",
    },
  ];

  const recentActivity = [
    { id: 1, action: "New ticket created - Email Server Down", time: "2 minutes ago", icon: Ticket, color: "text-blue-600" },
    { id: 2, action: "Ticket #TKT-2024-001 resolved", time: "15 minutes ago", icon: CheckCircle2, color: "text-green-600" },
    { id: 3, action: "New customer registered - Acme Corp", time: "1 hour ago", icon: Users, color: "text-purple-600" },
    { id: 4, action: "SLA breach alert - Ticket #TKT-2024-045", time: "3 hours ago", icon: AlertTriangle, color: "text-red-600" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Ticketing System Dashboard
              </h1>
              <p className="text-muted-foreground mt-2">
                Welcome back! Here's what's happening with your support system today.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500 animate-pulse" />
              <span className="text-sm text-muted-foreground">Live</span>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <StatCard key={stat.title} {...stat} delay={index * 0.1} />
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="lg:col-span-2"
          >
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-bold">SLA Compliance Overview</CardTitle>
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="relative w-48 h-48 mx-auto">
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-blue-600 rounded-full opacity-20 animate-pulse" />
                      <div className="absolute inset-4 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center">
                        <div>
                          <CheckCircle2 className="h-12 w-12 mx-auto text-green-600 mb-2" />
                          <p className="text-3xl font-bold">94.2%</p>
                          <p className="text-sm text-muted-foreground">Compliance</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-muted-foreground">
                      Your team is meeting SLA targets 94.2% of the time
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.6 + index * 0.1 }}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-800 ${activity.color}`}>
                        <activity.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Ticket Status</CardTitle>
                  <Ticket className="h-5 w-5 text-white/80" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>In Progress</span>
                    <span className="font-semibold">142</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Assigned</span>
                    <span className="font-semibold">45</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>New</span>
                    <span className="font-semibold">28</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Team Performance</CardTitle>
                  <UsersRound className="h-5 w-5 text-white/80" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Technical Support</span>
                    <span className="font-semibold">48 tickets</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Network Team</span>
                    <span className="font-semibold">35 tickets</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Database Team</span>
                    <span className="font-semibold">22 tickets</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
          >
            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Quick Stats</CardTitle>
                  <BarChart3 className="h-5 w-5 text-white/80" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Avg. Resolution Time</span>
                    <span className="font-semibold">2.5 hrs</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Customer Satisfaction</span>
                    <span className="font-semibold">4.8/5.0</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>SLA Breaches</span>
                    <span className="font-semibold">12</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;