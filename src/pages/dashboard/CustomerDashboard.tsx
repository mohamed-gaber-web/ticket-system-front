import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Ticket,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Users,
  ShieldCheck,
  User,
  ArrowRight,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppSelector } from '@/redux/hooks/hooks';
import { getMyStats, type CustomerDashboardStats } from '@/api/customerApi';

const STATUS_COLORS: Record<string, string> = {
  new: '#6366f1',
  assigned: '#8b5cf6',
  in_progress: '#f59e0b',
  customer_pending: '#f97316',
  resolved: '#10b981',
  delivered: '#059669',
  closed: '#6b7280',
  reopened: '#ef4444',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.35 } }),
};

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const { user, customerRole } = useAppSelector((state) => state.auth);
  const [stats, setStats] = useState<CustomerDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyStats()
      .then((res) => setStats(res.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const contactPerson = (user as any)?.contactPerson || 'there';
  const companyName = (user as any)?.companyName || '';

  const statCards = [
    {
      label: 'Total Tickets',
      value: stats?.totalTickets ?? 0,
      icon: Ticket,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Open Tickets',
      value: stats?.openTickets ?? 0,
      icon: AlertCircle,
      color: 'text-amber-600',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Resolved',
      value: stats?.resolvedTickets ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'SLA Breached',
      value: stats?.slaBreached ?? 0,
      icon: XCircle,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
  ];

  const statusChartData = stats
    ? Object.entries(stats.ticketsByStatus).map(([name, value]) => ({ name, value }))
    : [];

  const priorityChartData = stats
    ? Object.entries(stats.ticketsByPriority).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Welcome back, {contactPerson}
          </h1>
          <div className="flex items-center gap-2 mt-1.5">
            {companyName && (
              <span className="text-sm text-muted-foreground">{companyName}</span>
            )}
            {customerRole === 'company_admin' ? (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 gap-1 text-xs">
                <ShieldCheck className="h-3 w-3" /> Company Admin
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground gap-1 text-xs">
                <User className="h-3 w-3" /> Company User
              </Badge>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/tickets/create')} className="gap-2">
          <Ticket className="h-3.5 w-3.5" />
          New Ticket
        </Button>
      </motion.div>

      {/* Stat Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-surface-container-lowest border border-outline-variant/20 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, i) => (
            <motion.div
              key={card.label}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5 flex flex-col gap-3"
            >
              <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{card.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Charts row */}
      {!loading && stats && statusChartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Status chart */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5"
          >
            <h2 className="text-sm font-semibold mb-4">Tickets by Status</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} paddingAngle={2}>
                  {statusChartData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, String(name).replace(/_/g, ' ')]} />
                <Legend formatter={(value) => String(value).replace(/_/g, ' ')} />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Priority chart */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5"
          >
            <h2 className="text-sm font-semibold mb-4">Tickets by Priority</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={priorityChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} paddingAngle={2}>
                  {priorityChartData.map((entry) => (
                    <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      )}

      {/* Bottom row */}
      <div className={`grid grid-cols-1 gap-4 ${customerRole === 'company_admin' ? 'lg:grid-cols-3' : ''}`}>
        {/* Recent Tickets */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={`rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5 ${customerRole === 'company_admin' ? 'lg:col-span-2' : ''}`}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Recent Tickets</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/tickets')} className="gap-1 text-xs h-7">
              View all <ArrowRight className="h-3 w-3" />
            </Button>
          </div>

          {!stats?.recentTickets?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">No tickets yet.</p>
          ) : (
            <div className="space-y-2">
              {stats.recentTickets.map((ticket) => (
                <div
                  key={ticket._id}
                  className="flex items-center justify-between py-2 border-b border-outline-variant/10 last:border-0 cursor-pointer hover:bg-surface-container-lowest/60 rounded px-1 -mx-1"
                  onClick={() => navigate(`/tickets/view/${ticket._id}`)}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-muted-foreground">{ticket.ticketNumber}</p>
                    <p className="text-sm font-medium truncate">{ticket.subject}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <Badge
                      variant="outline"
                      className={`text-xs capitalize ${
                        ticket.priority === 'critical' ? 'text-destructive border-destructive/30' :
                        ticket.priority === 'high' ? 'text-orange-600 border-orange-500/30' :
                        ticket.priority === 'medium' ? 'text-amber-600 border-amber-500/30' :
                        'text-muted-foreground'
                      }`}
                    >
                      {ticket.priority}
                    </Badge>
                    <Badge variant="outline" className="text-xs capitalize text-muted-foreground">
                      {ticket.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Company Users card — company_admin only */}
        {customerRole === 'company_admin' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-sm font-semibold">Company Users</h2>
              </div>
              {stats?.companyUsers ? (
                <div className="space-y-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold">{stats.companyUsers.total}</span>
                    <span className="text-sm text-muted-foreground">total users</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="text-sm text-muted-foreground">
                      {stats.companyUsers.active} active
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No data</p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/company-users')}
              className="gap-2 mt-4 w-full"
            >
              <Users className="h-3.5 w-3.5" />
              Manage Users
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
