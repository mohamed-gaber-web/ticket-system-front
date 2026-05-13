import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { getProfile, updateProfile } from '@/redux/slices/authSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Save, Mail, Phone, Calendar, Clock, Ticket as TicketIcon, Building2, MapPin, GitBranch, Zap, CheckCircle2, ArchiveX, AlertTriangle, FlaskConical, PackageCheck, Ban, Users, Timer, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as ticketApi from '@/api/ticketApi';
import type { Ticket } from '@/types/ticket';
import { useNavigate, useSearchParams } from 'react-router-dom';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TICKET_LIMIT = 10;
const TERMINAL_STATUSES = new Set(['resolved', 'closed', 'delivered', 'tested', 'not_related']);

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const formatLabel = (s: string | null | undefined) =>
  String(s ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

const PRIORITY_DOT: Record<string, string> = {
  critical: 'bg-error',
  high: 'bg-accent-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
};
const PRIORITY_TEXT: Record<string, string> = {
  critical: 'text-error',
  high: 'text-accent-orange-600',
  medium: 'text-yellow-600',
  low: 'text-green-600',
};
const STATUS_TICKET: Record<string, string> = {
  new:              'bg-accent-orange-400 text-white',
  assigned:         'bg-brand-400 text-white',
  in_progress:      'bg-yellow-500 text-white',
  customer_pending: 'bg-purple-500 text-white',
  resolved:         'bg-green-500 text-white',
  tested:           'bg-cyan-600 text-white',
  delivered:        'bg-teal-500 text-white',
  closed:           'bg-surface-container-highest text-on-surface-variant',
  not_related:      'bg-slate-500 text-white',
};
const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-emerald-100 text-emerald-800',
  user: 'bg-surface-container-high text-on-surface',
  consultant: 'bg-surface-container-high text-on-surface',
};
const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-red-100 text-red-800',
  on_leave: 'bg-yellow-100 text-yellow-800',
};

// ─── Component ───────────────────────────────────────────────────────────────

const ProfilePage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isTasksView = searchParams.get('view') === 'tasks';
  const { user, userType, isLoading, consultantDepartment, consultantRole } = useAppSelector((state) => state.auth);

  const u = user as any;
  const isConsultant = userType === 'consultant';
  const isTeleSales = userType === 'tele_sales';
  const TASK_DEPTS = ['sales', 'marketing', 'administration'];
  const isTasksDeptConsultant = isConsultant && consultantRole !== 'admin' && TASK_DEPTS.includes(consultantDepartment ?? '');

  // ── Consultant / TeleSales form state ──
  const [consultantForm, setConsultantForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
  });
  const [consultantErrors, setConsultantErrors] = useState<Record<string, string>>({});

  // ── Customer form state ──
  const [customerForm, setCustomerForm] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    address: '',
    city: '',
    country: '',
  });

  // ── Tickets (consultant: assigned / customer: submitted) — NOT used for tele_sales ──
  const [assignedTickets, setAssignedTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketPage, setTicketPage] = useState(1);
  const [ticketTotal, setTicketTotal] = useState(0);
  const [ticketPages, setTicketPages] = useState(1);
  const [taskWeekFilter, setTaskWeekFilter] = useState<string>('');
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('');

  const [dashboardStats, setDashboardStats] = useState({
    assigned: 0,
    inProgress: 0,
    customerPending: 0,
    resolved: 0,
    tested: 0,
    delivered: 0,
    closed: 0,
    notRelated: 0,
    critical: 0,
    statsLoading: true,
  });

  const [monthlyHoursData, setMonthlyHoursData] = useState<{ totalHours: number; ticketCount: number }>({ totalHours: 0, ticketCount: 0 });
  const [monthlyHoursLoading, setMonthlyHoursLoading] = useState(true);
  const [hoursMonth, setHoursMonth] = useState<{ year: number; month: number }>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const [customerStats, setCustomerStats] = useState({
    open: 0,
    assigned: 0,
    inProgress: 0,
    customerPending: 0,
    resolved: 0,
    tested: 0,
    delivered: 0,
    closed: 0,
    notRelated: 0,
    statsLoading: true,
  });

  useEffect(() => {
    dispatch(getProfile());
  }, [dispatch]);

  useEffect(() => {
    if (!user) return;
    if (isConsultant || isTeleSales) {
      setConsultantForm({
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        email: u.email || '',
        phone: u.phone || '',
        position: u.position || '',
      });
    } else {
      setCustomerForm({
        companyName: u.companyName || '',
        contactPerson: u.contactPerson || '',
        phone: u.phone || '',
        address: u.address || '',
        city: u.city || '',
        country: u.country || '',
      });
    }
    // Only load tickets for ticket-system users (not tele_sales or tasks-dept consultants)
    if (!isTeleSales && !isTasksDeptConsultant) {
      loadTickets(1, userType ?? undefined);
    }
  }, [user, userType, isTasksView, taskWeekFilter, taskStatusFilter]);

  useEffect(() => {
    if (isConsultant || !u?._id || userType !== 'customer') return;
    const fetchCustomerStats = async () => {
      try {
        const [openRes, assignedRes, inProgressRes, customerPendingRes, resolvedRes, testedRes, deliveredRes, closedRes, notRelatedRes] = await Promise.all([
          ticketApi.getTickets({ customer: u._id, status: 'new', limit: 1 }),
          ticketApi.getTickets({ customer: u._id, status: 'assigned', limit: 1 }),
          ticketApi.getTickets({ customer: u._id, status: 'in_progress', limit: 1 }),
          ticketApi.getTickets({ customer: u._id, status: 'customer_pending', limit: 1 }),
          ticketApi.getTickets({ customer: u._id, status: 'resolved', limit: 1 }),
          ticketApi.getTickets({ customer: u._id, status: 'tested', limit: 1 }),
          ticketApi.getTickets({ customer: u._id, status: 'delivered', limit: 1 }),
          ticketApi.getTickets({ customer: u._id, status: 'closed', limit: 1 }),
          ticketApi.getTickets({ customer: u._id, status: 'not_related', limit: 1 }),
        ]);
        setCustomerStats({
          open: openRes.total,
          assigned: assignedRes.total,
          inProgress: inProgressRes.total,
          customerPending: customerPendingRes.total,
          resolved: resolvedRes.total,
          tested: testedRes.total,
          delivered: deliveredRes.total,
          closed: closedRes.total,
          notRelated: notRelatedRes.total,
          statsLoading: false,
        });
      } catch {
        setCustomerStats((prev) => ({ ...prev, statsLoading: false }));
      }
    };
    fetchCustomerStats();
  }, [user, userType]);

  useEffect(() => {
    if (!isConsultant || !u?._id || isTasksDeptConsultant) return;
    const fetchDashboardStats = async () => {
      try {
        const [assignedRes, inProgressRes, customerPendingRes, resolvedRes, testedRes, deliveredRes, closedRes, notRelatedRes, criticalRes] = await Promise.all([
          ticketApi.getTickets({ assignedConsultant: u._id, status: 'assigned', limit: 1 }),
          ticketApi.getTickets({ assignedConsultant: u._id, status: 'in_progress', limit: 1 }),
          ticketApi.getTickets({ assignedConsultant: u._id, status: 'customer_pending', limit: 1 }),
          ticketApi.getTickets({ assignedConsultant: u._id, status: 'resolved', limit: 1 }),
          ticketApi.getTickets({ assignedConsultant: u._id, status: 'tested', limit: 1 }),
          ticketApi.getTickets({ assignedConsultant: u._id, status: 'delivered', limit: 1 }),
          ticketApi.getTickets({ assignedConsultant: u._id, status: 'closed', limit: 1 }),
          ticketApi.getTickets({ assignedConsultant: u._id, status: 'not_related', limit: 1 }),
          ticketApi.getTickets({ assignedConsultant: u._id, priority: 'critical', limit: 1 }),
        ]);
        setDashboardStats({
          assigned: assignedRes.total,
          inProgress: inProgressRes.total,
          customerPending: customerPendingRes.total,
          resolved: resolvedRes.total,
          tested: testedRes.total,
          delivered: deliveredRes.total,
          closed: closedRes.total,
          notRelated: notRelatedRes.total,
          critical: criticalRes.total,
          statsLoading: false,
        });
      } catch {
        setDashboardStats((prev) => ({ ...prev, statsLoading: false }));
      }
    };
    fetchDashboardStats();
  }, [user, isConsultant]);

  useEffect(() => {
    if (!isConsultant || !u?._id || isTasksDeptConsultant) return;
    setMonthlyHoursLoading(true);
    ticketApi.getTickets({
      assignedConsultant: u._id,
      limit: 9999,
    }).then((res) => {
      const totalHours = res.data.reduce((sum: number, t: any) => {
        const h = parseFloat(t.durationHours);
        return isNaN(h) ? sum : sum + h;
      }, 0);
      setMonthlyHoursData({ totalHours: Math.round(totalHours * 10) / 10, ticketCount: res.data.length });
    }).catch(() => {})
      .finally(() => setMonthlyHoursLoading(false));
  }, [u?._id, isConsultant]);

  const loadTickets = async (
    page: number,
    role = userType,
    weekFilter = taskWeekFilter,
    statusFilter = taskStatusFilter,
  ) => {
    if (!u?._id) return;
    setTicketsLoading(true);
    try {
      const params: Record<string, any> = role === 'customer'
        ? { customer: u._id, page, limit: TICKET_LIMIT }
        : { assignedConsultant: u._id, page, limit: TICKET_LIMIT };
      if (isTasksView && weekFilter) {
        params.scheduledWeek = weekFilter;
      }
      if (isTasksView) {
        params.status = statusFilter || 'new,assigned,in_progress,customer_pending,tested';
      }
      const res = await ticketApi.getTickets(params);
      setAssignedTickets(res.data);
      setTicketTotal(res.total);
      setTicketPages(res.pages);
      setTicketPage(page);
    } catch {
      // silent
    } finally {
      setTicketsLoading(false);
    }
  };

  // ── Consultant / TeleSales form handlers ──
  const handleConsultantChange = (field: string, value: string) => {
    setConsultantForm((prev) => ({ ...prev, [field]: value }));
    if (consultantErrors[field]) setConsultantErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validateConsultant = (): boolean => {
    const errs: Record<string, string> = {};
    if (!consultantForm.firstName.trim()) errs.firstName = 'First name is required';
    if (!consultantForm.lastName.trim()) errs.lastName = 'Last name is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(consultantForm.email)) errs.email = 'Invalid email format';
    if (consultantForm.phone && !/^\d{10,15}$/.test(consultantForm.phone.replace(/[\s\-]/g, '')))
      errs.phone = 'Phone must be 10–15 digits';
    setConsultantErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleConsultantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateConsultant()) return;
    try {
      await dispatch(updateProfile({
        firstName: consultantForm.firstName,
        lastName: consultantForm.lastName,
        phone: consultantForm.phone,
        position: consultantForm.position,
      } as any)).unwrap();
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error || 'Failed to update profile');
    }
  };

  const handleTeleSalesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateConsultant()) return;
    try {
      await dispatch(updateProfile({
        firstName: consultantForm.firstName,
        lastName: consultantForm.lastName,
        phone: consultantForm.phone,
      } as any)).unwrap();
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error || 'Failed to update profile');
    }
  };

  // ── Customer form handlers ──
  const handleCustomerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCustomerForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dispatch(updateProfile(customerForm)).unwrap();
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      toast.error(error || 'Failed to update profile');
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  // ── Display name ──
  const displayName = (isConsultant || isTeleSales)
    ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email
    : u.contactPerson || u.companyName || u.email;

  // ─────────────────────────────────────────────────────────────────────────
  // TELE SALES PROFILE — no ticket anything
  // ─────────────────────────────────────────────────────────────────────────
  if (isTeleSales) {
    return (
      <div className="p-8 space-y-6">
        <div>
          <h1 className="display-sm text-on-surface">My Profile</h1>
          <p className="text-on-surface-variant mt-1">View and manage your account information</p>
        </div>

        {/* Profile Summary Card */}
        <div className="bg-surface-container-lowest rounded-[1rem] p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-emerald-700">{getInitials(displayName)}</span>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-on-surface">{displayName}</h2>
            <p className="text-sm text-on-surface-variant mt-0.5">TeleSales Agent</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {u.role && (
                <span className={cn('px-2.5 py-0.5 rounded-md text-xs font-semibold', ROLE_BADGE[u.role] ?? ROLE_BADGE.user)}>
                  {formatLabel(u.role)}
                </span>
              )}
              {u.status && (
                <span className={cn('px-2.5 py-0.5 rounded-md text-xs font-semibold', STATUS_BADGE[u.status] ?? STATUS_BADGE.active)}>
                  {formatLabel(u.status)}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 text-sm text-on-surface-variant">
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{u.email}</span>
            </div>
            {u.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{u.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Joined {fmtDate(u.createdAt)}</span>
            </div>
            {u.lastLogin && (
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Last login {fmtDate(u.lastLogin)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Edit Form — full width, no ticket column */}
        <div className="max-w-xl bg-surface-container-lowest rounded-[1rem] p-6">
          <h3 className="text-base font-semibold text-on-surface mb-5">Edit Profile</h3>
          <form onSubmit={handleTeleSalesSubmit} className="space-y-4">

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">First Name</label>
                <Input
                  value={consultantForm.firstName}
                  onChange={(e) => handleConsultantChange('firstName', e.target.value)}
                  className={consultantErrors.firstName ? 'border-error' : ''}
                />
                {consultantErrors.firstName && (
                  <p className="text-error text-xs mt-1">{consultantErrors.firstName}</p>
                )}
              </div>
              <div>
                <label className="form-label">Last Name</label>
                <Input
                  value={consultantForm.lastName}
                  onChange={(e) => handleConsultantChange('lastName', e.target.value)}
                  className={consultantErrors.lastName ? 'border-error' : ''}
                />
                {consultantErrors.lastName && (
                  <p className="text-error text-xs mt-1">{consultantErrors.lastName}</p>
                )}
              </div>
            </div>

            <div>
              <label className="form-label">Email</label>
              <Input value={consultantForm.email} disabled className="opacity-60" />
              <p className="text-xs text-on-surface-variant mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="form-label">Phone</label>
              <Input
                type="tel"
                value={consultantForm.phone}
                onChange={(e) => handleConsultantChange('phone', e.target.value)}
                placeholder="e.g. 01012345678"
                className={consultantErrors.phone ? 'border-error' : ''}
              />
              {consultantErrors.phone && (
                <p className="text-error text-xs mt-1">{consultantErrors.phone}</p>
              )}
            </div>

            {/* Role & Status — read-only */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Role</label>
                <div className="mt-1 px-3 py-2 rounded-[0.75rem] bg-surface-container-low text-sm text-on-surface-variant border border-surface-container-high">
                  {u.role ? formatLabel(u.role) : '—'}
                </div>
              </div>
              <div>
                <label className="form-label">Status</label>
                <div className="mt-1 px-3 py-2 rounded-[0.75rem] bg-surface-container-low text-sm text-on-surface-variant border border-surface-container-high">
                  {u.status ? formatLabel(u.status) : '—'}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TASKS-DEPT CONSULTANT PROFILE — no tickets, no dashboard stats
  // ─────────────────────────────────────────────────────────────────────────
  if (isTasksDeptConsultant) {
    return (
      <div className="p-8 space-y-6">
        <div>
          <h1 className="display-sm text-on-surface">My Profile</h1>
          <p className="text-on-surface-variant mt-1">View and manage your account information</p>
        </div>

        {/* Profile Summary Card */}
        <div className="bg-surface-container-lowest rounded-[1rem] p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-brand-700">{getInitials(displayName)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-on-surface">{displayName}</h2>
            <p className="text-sm text-on-surface-variant mt-0.5">
              {u.position || <span className="italic">No position set</span>}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {u.role && (
                <span className={cn('px-2.5 py-0.5 rounded-md text-xs font-semibold', ROLE_BADGE[u.role] ?? ROLE_BADGE.consultant)}>
                  {formatLabel(u.role)}
                </span>
              )}
              {u.department && (
                <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-100 text-indigo-800">
                  {formatLabel(u.department)}
                </span>
              )}
              {u.status && (
                <span className={cn('px-2.5 py-0.5 rounded-md text-xs font-semibold', STATUS_BADGE[u.status] ?? STATUS_BADGE.active)}>
                  {formatLabel(u.status)}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 text-sm text-on-surface-variant">
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{u.email}</span>
            </div>
            {u.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{u.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Joined {fmtDate(u.createdAt)}</span>
            </div>
            {u.lastLogin && (
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Last login {fmtDate(u.lastLogin)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Edit Profile Form — full width */}
        <div className="max-w-2xl bg-surface-container-lowest rounded-[1rem] p-6">
          <h3 className="text-base font-semibold text-on-surface mb-5">Edit Profile</h3>
          <form onSubmit={handleConsultantSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">First Name</label>
                <Input
                  value={consultantForm.firstName}
                  onChange={(e) => handleConsultantChange('firstName', e.target.value)}
                  className={consultantErrors.firstName ? 'border-error' : ''}
                />
                {consultantErrors.firstName && <p className="text-error text-xs mt-1">{consultantErrors.firstName}</p>}
              </div>
              <div>
                <label className="form-label">Last Name</label>
                <Input
                  value={consultantForm.lastName}
                  onChange={(e) => handleConsultantChange('lastName', e.target.value)}
                  className={consultantErrors.lastName ? 'border-error' : ''}
                />
                {consultantErrors.lastName && <p className="text-error text-xs mt-1">{consultantErrors.lastName}</p>}
              </div>
            </div>
            <div>
              <label className="form-label">Email</label>
              <Input value={consultantForm.email} disabled className="opacity-60" />
              <p className="text-xs text-on-surface-variant mt-1">Email cannot be changed</p>
            </div>
            <div>
              <label className="form-label">Phone</label>
              <Input
                type="tel"
                value={consultantForm.phone}
                onChange={(e) => handleConsultantChange('phone', e.target.value)}
                placeholder="e.g. 01012345678"
                className={consultantErrors.phone ? 'border-error' : ''}
              />
              {consultantErrors.phone && <p className="text-error text-xs mt-1">{consultantErrors.phone}</p>}
            </div>
            <div>
              <label className="form-label">Position</label>
              <Input
                value={consultantForm.position}
                onChange={(e) => handleConsultantChange('position', e.target.value)}
                placeholder="e.g. Sales Executive"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Role</label>
                <div className="mt-1 px-3 py-2 rounded-[0.75rem] bg-surface-container-low text-sm text-on-surface-variant border border-surface-container-high">
                  {u.role ? formatLabel(u.role) : '—'}
                </div>
              </div>
              <div>
                <label className="form-label">Status</label>
                <div className="mt-1 px-3 py-2 rounded-[0.75rem] bg-surface-container-low text-sm text-on-surface-variant border border-surface-container-high">
                  {u.status ? formatLabel(u.status) : '—'}
                </div>
              </div>
            </div>
            <div className="pt-2">
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Updating...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" />Save Changes</>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CONSULTANT PROFILE
  // ─────────────────────────────────────────────────────────────────────────
  if (isConsultant) {
    return (
      <div className="p-8 space-y-6">
        <div>
          <h1 className="display-sm text-on-surface">{isTasksView ? 'My Tasks' : 'My Profile'}</h1>
          <p className="text-on-surface-variant mt-1">{isTasksView ? 'Your assigned tickets and workload overview' : 'View and manage your account information'}</p>
        </div>

        {/* Profile Summary Card */}
        <div className="bg-surface-container-lowest rounded-[1rem] p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-brand-700">{getInitials(displayName)}</span>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-on-surface">{displayName}</h2>
            <p className="text-sm text-on-surface-variant mt-0.5">
              {u.position || <span className="italic">No position set</span>}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {u.role && (
                <span className={cn('px-2.5 py-0.5 rounded-md text-xs font-semibold', ROLE_BADGE[u.role] ?? ROLE_BADGE.consultant)}>
                  {formatLabel(u.role)}
                </span>
              )}
              {u.status && (
                <span className={cn('px-2.5 py-0.5 rounded-md text-xs font-semibold', STATUS_BADGE[u.status] ?? STATUS_BADGE.active)}>
                  {formatLabel(u.status)}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 text-sm text-on-surface-variant">
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{u.email}</span>
            </div>
            {u.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{u.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Joined {fmtDate(u.createdAt)}</span>
            </div>
            {u.lastLogin && (
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Last login {fmtDate(u.lastLogin)}</span>
              </div>
            )}
          </div>

          {/* Ticket count */}
          <div className="flex flex-col items-center px-6 border-l border-surface-container-high self-stretch justify-center min-w-[90px]">
            <span className="text-3xl font-bold text-on-surface">{ticketTotal}</span>
            <span className="text-xs text-on-surface-variant mt-1 text-center">Assigned Tickets</span>
          </div>

          {/* Monthly hours vs target */}
          <div className="flex flex-col px-6 border-l border-surface-container-high self-stretch justify-center min-w-[160px] gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wide">
                {new Date(hoursMonth.year, hoursMonth.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </p>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => setHoursMonth((prev) => { const d = new Date(prev.year, prev.month - 1, 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-surface-container-high transition-colors"
                  title="Previous month"
                >
                  <ChevronLeft className="w-3 h-3 text-on-surface-variant" />
                </button>
                <button
                  onClick={() => setHoursMonth((prev) => { const d = new Date(prev.year, prev.month + 1, 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-surface-container-high transition-colors"
                  title="Next month"
                >
                  <ChevronRight className="w-3 h-3 text-on-surface-variant" />
                </button>
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <Timer className="w-4 h-4 text-brand-500 flex-shrink-0 self-center" />
              {monthlyHoursLoading ? (
                <div className="h-7 w-10 bg-surface-container-high rounded animate-pulse" />
              ) : (
                <span className="text-2xl font-bold text-on-surface leading-none">
                  {monthlyHoursData.totalHours}h
                </span>
              )}
              {u.monthlyTargetHours != null && (
                <span className="text-sm text-on-surface-variant">/ {u.monthlyTargetHours}h target</span>
              )}
            </div>
            {u.monthlyTargetHours != null && !monthlyHoursLoading && (
              <div className="h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    monthlyHoursData.totalHours >= u.monthlyTargetHours ? 'bg-green-500' : 'bg-brand-500',
                  )}
                  style={{ width: `${Math.min(100, (monthlyHoursData.totalHours / u.monthlyTargetHours) * 100)}%` }}
                />
              </div>
            )}
            <p className="text-xs text-on-surface-variant">
              {monthlyHoursData.ticketCount} ticket{monthlyHoursData.ticketCount !== 1 ? 's' : ''} this month
            </p>
          </div>
        </div>

        {/* Mini Dashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
          {[
            { label: 'Total Assigned',   value: ticketTotal,                    icon: TicketIcon,    iconBg: 'bg-brand-100',              iconColor: 'text-brand-600',         valueColor: 'text-on-surface',  always: true },
            { label: 'Assigned',         value: dashboardStats.assigned,         icon: Users,         iconBg: 'bg-accent-orange-100',      iconColor: 'text-accent-orange-600', valueColor: 'text-on-surface',  always: false },
            { label: 'In Progress',      value: dashboardStats.inProgress,       icon: Zap,           iconBg: 'bg-yellow-100',             iconColor: 'text-yellow-600',        valueColor: 'text-on-surface',  always: false },
            { label: 'Cust. Pending',    value: dashboardStats.customerPending,  icon: Clock,         iconBg: 'bg-purple-100',             iconColor: 'text-purple-600',        valueColor: 'text-on-surface',  always: false },
            { label: 'Resolved',         value: dashboardStats.resolved,         icon: CheckCircle2,  iconBg: 'bg-green-100',              iconColor: 'text-green-600',         valueColor: 'text-on-surface',  always: false },
            { label: 'Tested',           value: dashboardStats.tested,           icon: FlaskConical,  iconBg: 'bg-cyan-100',               iconColor: 'text-cyan-600',          valueColor: 'text-on-surface',  always: false },
            { label: 'Delivered',        value: dashboardStats.delivered,        icon: PackageCheck,  iconBg: 'bg-teal-100',               iconColor: 'text-teal-600',          valueColor: 'text-on-surface',  always: false },
            { label: 'Closed',           value: dashboardStats.closed,           icon: ArchiveX,      iconBg: 'bg-surface-container-high', iconColor: 'text-on-surface-variant',valueColor: 'text-on-surface',  always: false },
            { label: 'Not Related',      value: dashboardStats.notRelated,       icon: Ban,           iconBg: 'bg-slate-100',              iconColor: 'text-slate-500',         valueColor: 'text-on-surface',  always: false },
            { label: 'Critical Priority',value: dashboardStats.critical,         icon: AlertTriangle, iconBg: 'bg-red-100',                iconColor: 'text-error',             valueColor: dashboardStats.critical > 0 ? 'text-error' : 'text-on-surface', always: false },
          ].map(({ label, value, icon: Icon, iconBg, iconColor, valueColor, always }) => (
            <div key={label} className="bg-surface-container-lowest rounded-[1rem] p-4 flex items-center gap-4">
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', iconBg)}>
                <Icon className={cn('w-5 h-5', iconColor)} />
              </div>
              <div className="min-w-0">
                {!always && dashboardStats.statsLoading ? (
                  <div className="h-7 w-8 bg-surface-container-high rounded animate-pulse" />
                ) : (
                  <p className={cn('text-2xl font-bold leading-none', valueColor)}>{value}</p>
                )}
                <p className="text-xs text-on-surface-variant mt-1 truncate">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Two-column: Edit Form + Assigned Tickets */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

          {/* Edit Profile Form — hidden in tasks view */}
          {!isTasksView && <div className="xl:col-span-2 bg-surface-container-lowest rounded-[1rem] p-6">
            <h3 className="text-base font-semibold text-on-surface mb-5">Edit Profile</h3>
            <form onSubmit={handleConsultantSubmit} className="space-y-4">

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">First Name</label>
                  <Input
                    value={consultantForm.firstName}
                    onChange={(e) => handleConsultantChange('firstName', e.target.value)}
                    className={consultantErrors.firstName ? 'border-error' : ''}
                  />
                  {consultantErrors.firstName && (
                    <p className="text-error text-xs mt-1">{consultantErrors.firstName}</p>
                  )}
                </div>
                <div>
                  <label className="form-label">Last Name</label>
                  <Input
                    value={consultantForm.lastName}
                    onChange={(e) => handleConsultantChange('lastName', e.target.value)}
                    className={consultantErrors.lastName ? 'border-error' : ''}
                  />
                  {consultantErrors.lastName && (
                    <p className="text-error text-xs mt-1">{consultantErrors.lastName}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="form-label">Email</label>
                <Input
                  type="email"
                  value={consultantForm.email}
                  onChange={(e) => handleConsultantChange('email', e.target.value)}
                  className={consultantErrors.email ? 'border-error' : ''}
                />
                {consultantErrors.email && (
                  <p className="text-error text-xs mt-1">{consultantErrors.email}</p>
                )}
              </div>

              <div>
                <label className="form-label">Phone</label>
                <Input
                  type="tel"
                  value={consultantForm.phone}
                  onChange={(e) => handleConsultantChange('phone', e.target.value)}
                  placeholder="e.g. 01012345678"
                  className={consultantErrors.phone ? 'border-error' : ''}
                />
                {consultantErrors.phone && (
                  <p className="text-error text-xs mt-1">{consultantErrors.phone}</p>
                )}
              </div>

              <div>
                <label className="form-label">Position</label>
                <Input
                  value={consultantForm.position}
                  onChange={(e) => handleConsultantChange('position', e.target.value)}
                  placeholder="e.g. Senior Support Engineer"
                />
              </div>

              {/* Role & Status — read-only on self-profile */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Role</label>
                  <div className="mt-1 px-3 py-2 rounded-[0.75rem] bg-surface-container-low text-sm text-on-surface-variant border border-surface-container-high">
                    {u.role ? formatLabel(u.role) : '—'}
                  </div>
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <div className="mt-1 px-3 py-2 rounded-[0.75rem] bg-surface-container-low text-sm text-on-surface-variant border border-surface-container-high">
                    {u.status ? formatLabel(u.status) : '—'}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>}

          {/* Assigned Tickets */}
          <div className={cn('bg-surface-container-lowest rounded-[1rem] overflow-hidden flex flex-col', isTasksView ? 'xl:col-span-5' : 'xl:col-span-3')}>
            <div className="px-6 py-4 border-b border-surface-container-high flex items-center gap-2 flex-wrap">
              <TicketIcon className="w-4 h-4 text-on-surface-variant" />
              <h3 className="text-base font-semibold text-on-surface">Assigned Tickets</h3>
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold">
                {ticketTotal}
              </span>
              {isTasksView && (
                <div className="ml-auto flex items-center gap-3 flex-wrap">
                  {/* Status filter */}
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-medium text-on-surface-variant">Status</label>
                    <select
                      value={taskStatusFilter}
                      onChange={(e) => {
                        setTaskStatusFilter(e.target.value);
                        loadTickets(1, userType ?? undefined, taskWeekFilter, e.target.value);
                      }}
                      className="h-7 rounded-md border border-border bg-surface-container-low text-sm text-on-surface px-2 pr-6 appearance-none focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                      <option value="">All active</option>
                      <option value="new">New</option>
                      <option value="assigned">Assigned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="customer_pending">Customer Pending</option>
                      <option value="tested">Tested</option>
                    </select>
                  </div>
                  {/* Week filter */}
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-medium text-on-surface-variant">Week</label>
                    <select
                      value={taskWeekFilter}
                      onChange={(e) => {
                        setTaskWeekFilter(e.target.value);
                        loadTickets(1, userType ?? undefined, e.target.value, taskStatusFilter);
                      }}
                      className="h-7 rounded-md border border-border bg-surface-container-low text-sm text-on-surface px-2 pr-6 appearance-none focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                      <option value="">All weeks</option>
                      {Array.from({ length: 52 }, (_, i) => (
                        <option key={i + 1} value={String(i + 1)}>Week {i + 1}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {ticketsLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-7 w-7 border-2 border-primary/20 border-t-primary" />
              </div>
            ) : assignedTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 py-16">
                <TicketIcon className="h-10 w-10 text-on-surface-variant/30 mb-3" />
                <p className="text-on-surface-variant text-sm">No tickets assigned yet</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full">
                    <thead className="bg-surface-container-low">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Ticket #</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Subject</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Customer</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Priority</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Status</th>
                        {isTasksView && <>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Delivery Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Internal Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Week</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Duration</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Delayed</th>
                        </>}
                        <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-high">
                      {assignedTickets.map((ticket) => {
                        const customer = typeof ticket.customer === 'object' && ticket.customer
                          ? (ticket.customer as any)
                          : null;
                        return (
                          <tr
                            key={ticket._id}
                            className={cn(
                              'cursor-pointer transition-colors',
                              ticket.isSubTicket
                                ? 'bg-primary-fixed/20 hover:bg-primary-fixed/30'
                                : 'hover:bg-surface-container-low'
                            )}
                            onClick={() => window.open(`/tickets/view/${ticket._id}`, '_blank')}
                          >
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                {ticket.isSubTicket && (
                                  <GitBranch className="w-3 h-3 text-brand-400 flex-shrink-0" />
                                )}
                                <span className={cn(
                                  'text-sm font-semibold',
                                  ticket.isSubTicket ? 'text-brand-400' : 'text-brand-600'
                                )}>
                                  #{ticket.ticketNumber}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 max-w-[180px]">
                              <p className="text-sm font-medium text-on-surface truncate">{ticket.subject}</p>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm text-on-surface-variant">{customer?.companyName || '—'}</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className={cn('w-2 h-2 rounded-full flex-shrink-0', PRIORITY_DOT[ticket.priority] ?? PRIORITY_DOT.medium)} />
                                <span className={cn('text-xs font-bold uppercase tracking-wide', PRIORITY_TEXT[ticket.priority] ?? PRIORITY_TEXT.medium)}>
                                  {ticket.priority}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={cn('inline-block px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide', STATUS_TICKET[ticket.status] ?? STATUS_TICKET.new)}>
                                {ticket.status.replace(/_/g, ' ')}
                              </span>
                            </td>
                            {isTasksView && (() => {
                              const delivery = ticket.deliveryEstimationDate ? new Date(ticket.deliveryEstimationDate) : null;
                              const rawEnd = ticket.resolvedAt ? new Date(ticket.resolvedAt)
                                : ticket.closedAt ? new Date(ticket.closedAt)
                                : TERMINAL_STATUSES.has(ticket.status) ? null : new Date();
                              const delayedDays = delivery && rawEnd
                                ? Math.max(0, Math.floor((rawEnd.getTime() - delivery.getTime()) / 86400000))
                                : null;
                              return <>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className="text-sm text-on-surface-variant">
                                    {delivery ? fmtDate(ticket.deliveryEstimationDate) : <span className="text-on-surface-variant/40">—</span>}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  {ticket.internalDeliveryDate ? (
                                    <span className="text-sm text-on-surface-variant">{fmtDate(ticket.internalDeliveryDate)}</span>
                                  ) : (
                                    <span className="text-on-surface-variant/40 text-sm">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  {ticket.scheduledWeek != null ? (
                                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-xs font-bold">
                                      W{ticket.scheduledWeek}
                                    </span>
                                  ) : (
                                    <span className="text-on-surface-variant/40 text-sm">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  {ticket.durationHours != null ? (
                                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-on-surface">
                                      <Timer className="w-3.5 h-3.5 text-brand-500" />
                                      {ticket.durationHours}h
                                    </span>
                                  ) : (
                                    <span className="text-on-surface-variant/40 text-sm">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  {delayedDays === null
                                    ? <span className="text-on-surface-variant/40 text-sm">—</span>
                                    : delayedDays > 0
                                      ? <span className="text-sm font-semibold text-error">+{delayedDays}d</span>
                                      : <span className="text-sm font-semibold text-green-600">On time</span>
                                  }
                                </td>
                              </>;
                            })()}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm text-on-surface-variant">{fmtDate(ticket.createdAt)}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {ticketPages > 1 && (
                  <div className="px-4 py-3 border-t border-surface-container-high flex items-center justify-between">
                    <p className="text-xs text-on-surface-variant">
                      Page <span className="font-semibold">{ticketPage}</span> of{' '}
                      <span className="font-semibold">{ticketPages}</span>
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" variant="outline" disabled={ticketPage <= 1} onClick={() => loadTickets(ticketPage - 1, userType ?? undefined)}>
                        Prev
                      </Button>
                      <Button size="sm" variant="outline" disabled={ticketPage >= ticketPages} onClick={() => loadTickets(ticketPage + 1, userType ?? undefined)}>
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CUSTOMER / DEFAULT PROFILE
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="display-sm text-on-surface">My Profile</h1>
        <p className="text-on-surface-variant mt-1">View and manage your account information</p>
      </div>

      {/* Profile Summary Card */}
      <div className="bg-surface-container-lowest rounded-[1rem] p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center flex-shrink-0">
          <span className="text-2xl font-bold text-on-surface-variant">{getInitials(displayName)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-on-surface">{displayName}</h2>
          {u.companyName && (
            <div className="flex items-center gap-1.5 mt-1 text-sm text-on-surface-variant">
              <Building2 className="w-3.5 h-3.5" />
              {u.companyName}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 text-sm text-on-surface-variant">
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{u.email}</span>
          </div>
          {u.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{u.phone}</span>
            </div>
          )}
          {(u.city || u.country) && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{[u.city, u.country].filter(Boolean).join(', ')}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Joined {fmtDate(u.createdAt)}</span>
          </div>
        </div>
        {/* Ticket count */}
        <div className="flex flex-col items-center px-6 border-l border-surface-container-high self-stretch justify-center min-w-[90px]">
          <span className="text-3xl font-bold text-on-surface">{ticketTotal}</span>
          <span className="text-xs text-on-surface-variant mt-1 text-center">My Tickets</span>
        </div>
      </div>

      {/* Mini Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        {[
          { label: 'Total Tickets',  value: ticketTotal,                   icon: TicketIcon,    iconBg: 'bg-brand-100',              iconColor: 'text-brand-600',          always: true },
          { label: 'New',            value: customerStats.open,            icon: AlertTriangle, iconBg: 'bg-accent-orange-100',      iconColor: 'text-accent-orange-600',  always: false },
          { label: 'Assigned',       value: customerStats.assigned,        icon: Users,         iconBg: 'bg-brand-50',               iconColor: 'text-brand-500',          always: false },
          { label: 'In Progress',    value: customerStats.inProgress,      icon: Zap,           iconBg: 'bg-yellow-100',             iconColor: 'text-yellow-600',         always: false },
          { label: 'Cust. Pending',  value: customerStats.customerPending, icon: Clock,         iconBg: 'bg-purple-100',             iconColor: 'text-purple-600',         always: false },
          { label: 'Resolved',       value: customerStats.resolved,        icon: CheckCircle2,  iconBg: 'bg-green-100',              iconColor: 'text-green-600',          always: false },
          { label: 'Tested',         value: customerStats.tested,          icon: FlaskConical,  iconBg: 'bg-cyan-100',               iconColor: 'text-cyan-600',           always: false },
          { label: 'Delivered',      value: customerStats.delivered,       icon: PackageCheck,  iconBg: 'bg-teal-100',               iconColor: 'text-teal-600',           always: false },
          { label: 'Closed',         value: customerStats.closed,          icon: ArchiveX,      iconBg: 'bg-surface-container-high', iconColor: 'text-on-surface-variant', always: false },
          { label: 'Not Related',    value: customerStats.notRelated,      icon: Ban,           iconBg: 'bg-slate-100',              iconColor: 'text-slate-500',          always: false },
        ].map(({ label, value, icon: Icon, iconBg, iconColor, always }) => (
          <div key={label} className="bg-surface-container-lowest rounded-[1rem] p-4 flex items-center gap-4">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', iconBg)}>
              <Icon className={cn('w-5 h-5', iconColor)} />
            </div>
            <div className="min-w-0">
              {!always && customerStats.statsLoading ? (
                <div className="h-7 w-8 bg-surface-container-high rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold text-on-surface leading-none">{value}</p>
              )}
              <p className="text-xs text-on-surface-variant mt-1 truncate">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Two-column: Edit Form + Tickets */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

        {/* Edit Profile Form */}
        <div className="xl:col-span-2 bg-surface-container-lowest rounded-[1rem] p-6">
          <h3 className="text-base font-semibold text-on-surface mb-5">Edit Profile</h3>
          <form onSubmit={handleCustomerSubmit} className="space-y-4">

            <div>
              <label className="form-label">Email</label>
              <Input value={u.email} disabled className="opacity-60" />
              <p className="text-xs text-on-surface-variant mt-1">Email cannot be changed</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Company Name</label>
                <Input name="companyName" value={customerForm.companyName} onChange={handleCustomerChange} />
              </div>
              <div>
                <label className="form-label">Contact Person</label>
                <Input name="contactPerson" value={customerForm.contactPerson} onChange={handleCustomerChange} />
              </div>
            </div>

            <div>
              <label className="form-label">Phone</label>
              <Input name="phone" type="tel" value={customerForm.phone} onChange={handleCustomerChange} />
            </div>

            <div>
              <label className="form-label">Address</label>
              <Input name="address" value={customerForm.address} onChange={handleCustomerChange} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">City</label>
                <Input name="city" value={customerForm.city} onChange={handleCustomerChange} />
              </div>
              <div>
                <label className="form-label">Country</label>
                <Input name="country" value={customerForm.country} onChange={handleCustomerChange} />
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* My Tickets */}
        <div className="xl:col-span-3 bg-surface-container-lowest rounded-[1rem] overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-surface-container-high flex items-center gap-2">
            <TicketIcon className="w-4 h-4 text-on-surface-variant" />
            <h3 className="text-base font-semibold text-on-surface">My Tickets</h3>
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold">
              {ticketTotal}
            </span>
          </div>

          {ticketsLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-7 w-7 border-2 border-primary/20 border-t-primary" />
            </div>
          ) : assignedTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-16">
              <TicketIcon className="h-10 w-10 text-on-surface-variant/30 mb-3" />
              <p className="text-on-surface-variant text-sm">No tickets yet</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto flex-1">
                <table className="w-full">
                  <thead className="bg-surface-container-low">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Ticket #</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Subject</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Priority</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-high">
                    {assignedTickets.map((ticket) => (
                      <tr
                        key={ticket._id}
                        className="hover:bg-surface-container-low cursor-pointer transition-colors"
                        onClick={() => navigate(`/tickets/view/${ticket._id}`)}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm font-semibold text-brand-600">#{ticket.ticketNumber}</span>
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <p className="text-sm font-medium text-on-surface truncate">{ticket.subject}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className={cn('w-2 h-2 rounded-full flex-shrink-0', PRIORITY_DOT[ticket.priority] ?? PRIORITY_DOT.medium)} />
                            <span className={cn('text-xs font-bold uppercase tracking-wide', PRIORITY_TEXT[ticket.priority] ?? PRIORITY_TEXT.medium)}>
                              {ticket.priority}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={cn('inline-block px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide', STATUS_TICKET[ticket.status] ?? STATUS_TICKET.new)}>
                            {ticket.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-on-surface-variant">{fmtDate(ticket.createdAt)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {ticketPages > 1 && (
                <div className="px-4 py-3 border-t border-surface-container-high flex items-center justify-between">
                  <p className="text-xs text-on-surface-variant">
                    Page <span className="font-semibold">{ticketPage}</span> of{' '}
                    <span className="font-semibold">{ticketPages}</span>
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="outline" disabled={ticketPage <= 1} onClick={() => loadTickets(ticketPage - 1, userType ?? undefined)}>
                      Prev
                    </Button>
                    <Button size="sm" variant="outline" disabled={ticketPage >= ticketPages} onClick={() => loadTickets(ticketPage + 1, userType ?? undefined)}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
