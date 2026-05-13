import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchConsultantById, updateConsultant, clearCurrentConsultant } from '@/redux/slices/consultantSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomSelect } from '@/components/ui/custom-select';
import { ArrowLeft, Save, Ticket as TicketIcon, Mail, Phone, Calendar, Clock, Zap, CheckCircle2, ArchiveX, AlertTriangle, Timer, ChevronLeft, ChevronRight, Pencil, X, Check } from 'lucide-react';
import type { UpdateConsultantData, ConsultantRole, ConsultantStatus } from '@/types/consultant.types';
import type { Ticket } from '@/types/ticket';
import * as ticketApi from '@/api/ticketApi';
import * as consultantApi from '@/api/consultantApi';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const TICKET_LIMIT = 10;

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
  new: 'bg-accent-orange-400 text-white',
  assigned: 'bg-brand-400 text-white',
  in_progress: 'bg-yellow-500 text-white',
  resolved: 'bg-green-500 text-white',
  closed: 'bg-surface-container-highest text-on-surface-variant',
};
const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-accent-orange-100 text-purple-800',
  consultant: 'bg-surface-container-high text-on-surface',
};
const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-red-100 text-red-800',
  on_leave: 'bg-yellow-100 text-yellow-800',
};

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const formatLabel = (s: string) =>
  s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const getInitials = (first: string, last: string) =>
  `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();

export default function ViewConsultant() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentConsultant, loading } = useAppSelector((state) => state.consultants);
  const isAdmin = useAppSelector((state) => state.auth.consultantRole) === 'admin';

  const [formData, setFormData] = useState<UpdateConsultantData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    role: 'consultant',
    status: 'active',
    monthlyTargetHours: null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [assignedTickets, setAssignedTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketPage, setTicketPage] = useState(1);
  const [ticketTotal, setTicketTotal] = useState(0);
  const [ticketPages, setTicketPages] = useState(1);
  const [totalAllTimeHours, setTotalAllTimeHours] = useState<number | null>(null);

  const [dashboardStats, setDashboardStats] = useState({
    inProgress: 0,
    resolved: 0,
    closed: 0,
    critical: 0,
    statsLoading: true,
  });

  const [monthlyHoursData, setMonthlyHoursData] = useState<{ totalHours: number; ticketCount: number }>({ totalHours: 0, ticketCount: 0 });
  const [monthlyHoursLoading, setMonthlyHoursLoading] = useState(true);
  const [hoursMonth, setHoursMonth] = useState<{ year: number; month: number }>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [targetEditMode, setTargetEditMode] = useState(false);
  const [targetEditValue, setTargetEditValue] = useState<string>('');
  const [targetSaving, setTargetSaving] = useState(false);

  useEffect(() => {
    if (id) dispatch(fetchConsultantById(id));
    return () => { dispatch(clearCurrentConsultant()); };
  }, [id, dispatch]);

  useEffect(() => {
    if (currentConsultant) {
      setFormData({
        firstName: currentConsultant.firstName,
        lastName: currentConsultant.lastName,
        email: currentConsultant.email,
        phone: currentConsultant.phone || '',
        position: currentConsultant.position || '',
        role: currentConsultant.role,
        status: currentConsultant.status,
        monthlyTargetHours: currentConsultant.monthlyTargetHours ?? null,
      });
    }
  }, [currentConsultant]);

  useEffect(() => {
    if (!id) return;
    loadTickets(1);
    consultantApi.getConsultantTotalHours(id)
      .then((res) => setTotalAllTimeHours(res.data.totalHours))
      .catch(() => setTotalAllTimeHours(0));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const fetchDashboardStats = async () => {
      try {
        const [inProgressRes, resolvedRes, closedRes, criticalRes] = await Promise.all([
          ticketApi.getTickets({ acceptedBy: id, status: 'in_progress', limit: 1 }),
          ticketApi.getTickets({ acceptedBy: id, status: 'resolved', limit: 1 }),
          ticketApi.getTickets({ acceptedBy: id, status: 'closed', limit: 1 }),
          ticketApi.getTickets({ acceptedBy: id, priority: 'critical', limit: 1 }),
        ]);
        setDashboardStats({
          inProgress: inProgressRes.total,
          resolved: resolvedRes.total,
          closed: closedRes.total,
          critical: criticalRes.total,
          statsLoading: false,
        });
      } catch {
        setDashboardStats((prev) => ({ ...prev, statsLoading: false }));
      }
    };
    fetchDashboardStats();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setMonthlyHoursLoading(true);
    consultantApi.getConsultantMonthlyHours(id, hoursMonth.year, hoursMonth.month)
      .then((res) => setMonthlyHoursData({ totalHours: res.data.totalHours, ticketCount: res.data.ticketCount }))
      .catch(() => {})
      .finally(() => setMonthlyHoursLoading(false));
  }, [id, hoursMonth]);

  const loadTickets = async (page: number) => {
    if (!id) return;
    setTicketsLoading(true);
    try {
      const res = await ticketApi.getTickets({ acceptedBy: id, page, limit: TICKET_LIMIT });
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

  const handleChange = (field: keyof UpdateConsultantData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (formData.firstName && !formData.firstName.trim()) newErrors.firstName = 'First name cannot be empty';
    if (formData.lastName && !formData.lastName.trim()) newErrors.lastName = 'Last name cannot be empty';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (formData.phone && !/^\d{10,15}$/.test(formData.phone.replace(/[\s\-]/g, ''))) newErrors.phone = 'Phone must be 10–15 digits';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !id) return;
    const result = await dispatch(updateConsultant({ id, data: formData }));
    if (updateConsultant.fulfilled.match(result)) {
      toast.success('Consultant updated successfully');
    }
  };

  const handleSaveTarget = async () => {
    if (!id) return;
    setTargetSaving(true);
    const value = targetEditValue === '' ? null : Number(targetEditValue);
    const result = await dispatch(updateConsultant({ id, data: { ...formData, monthlyTargetHours: value } }));
    if (updateConsultant.fulfilled.match(result)) {
      toast.success('Monthly target updated');
      setTargetEditMode(false);
    }
    setTargetSaving(false);
  };

  if (loading && !currentConsultant) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (!currentConsultant) {
    return (
      <div className="p-8 text-center py-12">
        <p className="text-on-surface-variant">Consultant not found</p>
        <Button onClick={() => navigate('/consultants')} className="mt-4">Back to Consultants</Button>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/consultants')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="display-sm text-on-surface">Consultant Profile</h1>
          <p className="text-on-surface-variant mt-1">View and manage consultant details</p>
        </div>
      </div>

      {/* Profile Summary Card */}
      <div className="bg-surface-container-lowest rounded-[1rem] p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        {/* Avatar */}
        <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
          <span className="text-2xl font-bold text-brand-700">
            {getInitials(currentConsultant.firstName, currentConsultant.lastName)}
          </span>
        </div>

        {/* Name + Meta */}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-on-surface">{currentConsultant.fullName}</h2>
          <p className="text-sm text-on-surface-variant mt-0.5">
            {currentConsultant.position || <span className="italic">No position set</span>}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={cn('px-2.5 py-0.5 rounded-md text-xs font-semibold', ROLE_BADGE[currentConsultant.role])}>
              {formatLabel(currentConsultant.role)}
            </span>
            <span className={cn('px-2.5 py-0.5 rounded-md text-xs font-semibold', STATUS_BADGE[currentConsultant.status])}>
              {formatLabel(currentConsultant.status)}
            </span>
          </div>
        </div>

        {/* Contact Info */}
        <div className="flex flex-col gap-2 text-sm text-on-surface-variant">
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{currentConsultant.email}</span>
          </div>
          {currentConsultant.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{currentConsultant.phone}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Joined {fmtDate(currentConsultant.createdAt)}</span>
          </div>
          {currentConsultant.lastLogin && (
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Last login {fmtDate(currentConsultant.lastLogin)}</span>
            </div>
          )}
        </div>

        {/* Ticket Count + Hours */}
        <div className="flex flex-col items-center px-6 border-l border-surface-container-high self-stretch justify-center min-w-[130px] gap-2">
          <div className="text-center">
            <span className="text-3xl font-bold text-on-surface">{ticketTotal}</span>
            <p className="text-xs text-on-surface-variant mt-0.5">Assigned Tickets</p>
          </div>
          <div className="w-full border-t border-surface-container-high pt-2 flex flex-col items-center gap-1">
            <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wide">
              {new Date(hoursMonth.year, hoursMonth.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </p>
            {monthlyHoursLoading ? (
              <div className="h-5 w-16 bg-surface-container-high rounded-full animate-pulse" />
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                <Timer className="w-3 h-3" />
                {monthlyHoursData.totalHours}h
                {currentConsultant.monthlyTargetHours != null && (
                  <span className="font-normal text-on-surface-variant">
                    {' '}/ {currentConsultant.monthlyTargetHours}h
                  </span>
                )}
              </span>
            )}
            {totalAllTimeHours !== null ? (
              <span className="text-xs text-on-surface-variant">{totalAllTimeHours}h total</span>
            ) : (
              <div className="h-3.5 w-12 bg-surface-container-high rounded animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* Mini Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-6 gap-4 auto-rows-fr">
        {/* Total Assigned */}
        <div className="bg-surface-container-lowest rounded-[1rem] p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
            <TicketIcon className="w-5 h-5 text-brand-600" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-on-surface leading-none">{ticketTotal}</p>
            <p className="text-xs text-on-surface-variant mt-1 truncate">Total Assigned</p>
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-surface-container-lowest rounded-[1rem] p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-yellow-600" />
          </div>
          <div className="min-w-0">
            {dashboardStats.statsLoading ? (
              <div className="h-7 w-8 bg-surface-container-high rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-on-surface leading-none">{dashboardStats.inProgress}</p>
            )}
            <p className="text-xs text-on-surface-variant mt-1 truncate">In Progress</p>
          </div>
        </div>

        {/* Resolved */}
        <div className="bg-surface-container-lowest rounded-[1rem] p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <div className="min-w-0">
            {dashboardStats.statsLoading ? (
              <div className="h-7 w-8 bg-surface-container-high rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-on-surface leading-none">{dashboardStats.resolved}</p>
            )}
            <p className="text-xs text-on-surface-variant mt-1 truncate">Resolved</p>
          </div>
        </div>

        {/* Closed */}
        <div className="bg-surface-container-lowest rounded-[1rem] p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center flex-shrink-0">
            <ArchiveX className="w-5 h-5 text-on-surface-variant" />
          </div>
          <div className="min-w-0">
            {dashboardStats.statsLoading ? (
              <div className="h-7 w-8 bg-surface-container-high rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-on-surface leading-none">{dashboardStats.closed}</p>
            )}
            <p className="text-xs text-on-surface-variant mt-1 truncate">Closed</p>
          </div>
        </div>

        {/* Monthly Actual vs Target Hours */}
        <div className="col-span-2 sm:col-span-4 xl:col-span-2 bg-surface-container-lowest rounded-[1rem] p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Timer className="w-5 h-5 text-brand-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                {monthlyHoursLoading ? (
                  <div className="h-7 w-12 bg-surface-container-high rounded animate-pulse" />
                ) : (
                  <span className="text-2xl font-bold text-on-surface leading-none">
                    {monthlyHoursData.totalHours}h
                  </span>
                )}
                {!targetEditMode && (
                  <span className="flex items-center gap-1">
                    <span className="text-sm text-on-surface-variant">
                      {currentConsultant.monthlyTargetHours != null
                        ? `/ ${currentConsultant.monthlyTargetHours}h target`
                        : 'no target set'}
                    </span>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setTargetEditValue(currentConsultant.monthlyTargetHours?.toString() ?? '');
                          setTargetEditMode(true);
                        }}
                        className="w-5 h-5 flex items-center justify-center rounded hover:bg-surface-container-high transition-colors"
                        title="Set monthly target"
                      >
                        <Pencil className="w-3 h-3 text-on-surface-variant" />
                      </button>
                    )}
                  </span>
                )}
              </div>
              {targetEditMode && (
                <div className="flex items-center gap-1.5 mt-1">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    autoFocus
                    value={targetEditValue}
                    onChange={(e) => setTargetEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTarget();
                      if (e.key === 'Escape') setTargetEditMode(false);
                    }}
                    placeholder="e.g. 160"
                    className="w-24 h-7 px-2 text-sm rounded border border-surface-container-high bg-surface-container focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <span className="text-xs text-on-surface-variant">h / month</span>
                  <button
                    onClick={handleSaveTarget}
                    disabled={targetSaving}
                    className="w-6 h-6 flex items-center justify-center rounded bg-brand-500 hover:bg-brand-600 text-white transition-colors disabled:opacity-50"
                    title="Save"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setTargetEditMode(false)}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-surface-container-high transition-colors"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5 text-on-surface-variant" />
                  </button>
                </div>
              )}
              {!monthlyHoursLoading && !targetEditMode && currentConsultant.monthlyTargetHours != null && (
                <div className="mt-1.5 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      monthlyHoursData.totalHours >= currentConsultant.monthlyTargetHours
                        ? 'bg-green-500'
                        : 'bg-brand-500',
                    )}
                    style={{
                      width: `${Math.min(100, (monthlyHoursData.totalHours / currentConsultant.monthlyTargetHours) * 100)}%`,
                    }}
                  />
                </div>
              )}
              <p className="text-xs text-on-surface-variant mt-1">
                Actual Hours — {new Date(hoursMonth.year, hoursMonth.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                {' '}·{' '}{monthlyHoursData.ticketCount} ticket{monthlyHoursData.ticketCount !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={() => setHoursMonth((prev) => {
                  const d = new Date(prev.year, prev.month - 1, 1);
                  return { year: d.getFullYear(), month: d.getMonth() };
                })}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-surface-container-high transition-colors"
                title="Previous month"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-on-surface-variant" />
              </button>
              <button
                onClick={() => setHoursMonth((prev) => {
                  const d = new Date(prev.year, prev.month + 1, 1);
                  return { year: d.getFullYear(), month: d.getMonth() };
                })}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-surface-container-high transition-colors"
                title="Next month"
              >
                <ChevronRight className="w-3.5 h-3.5 text-on-surface-variant" />
              </button>
            </div>
          </div>
        </div>

        {/* Critical Priority */}
        <div className="col-span-2 sm:col-span-4 xl:col-span-1 bg-surface-container-lowest rounded-[1rem] p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-error" />
          </div>
          <div className="min-w-0">
            {dashboardStats.statsLoading ? (
              <div className="h-7 w-8 bg-surface-container-high rounded animate-pulse" />
            ) : (
              <p className={cn('text-2xl font-bold leading-none', dashboardStats.critical > 0 ? 'text-error' : 'text-on-surface')}>
                {dashboardStats.critical}
              </p>
            )}
            <p className="text-xs text-on-surface-variant mt-1 truncate">Critical Priority</p>
          </div>
        </div>
      </div>

      {/* Main Content: Edit Form + Assigned Tickets */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

        {/* Edit Profile Form — admin only */}
        {isAdmin && <div className="xl:col-span-2 bg-surface-container-lowest rounded-[1rem] p-6">
          <h3 className="text-base font-semibold text-on-surface mb-5">Edit Profile</h3>
          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">First Name</label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  className={errors.firstName ? 'border-error' : ''}
                />
                {errors.firstName && <p className="text-error text-xs mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <label className="form-label">Last Name</label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  className={errors.lastName ? 'border-error' : ''}
                />
                {errors.lastName && <p className="text-error text-xs mt-1">{errors.lastName}</p>}
              </div>
            </div>

            <div>
              <label className="form-label">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={errors.email ? 'border-error' : ''}
              />
              {errors.email && <p className="text-error text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="form-label">Phone</label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="e.g. 01012345678"
                className={errors.phone ? 'border-error' : ''}
              />
              {errors.phone && <p className="text-error text-xs mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="form-label">Position</label>
              <Input
                value={formData.position}
                onChange={(e) => handleChange('position', e.target.value)}
                placeholder="e.g. Senior Support Engineer"
              />
            </div>

            <div>
              <label className="form-label">Monthly Target Hours</label>
              <Input
                type="number"
                min={0}
                step={1}
                value={formData.monthlyTargetHours ?? ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    monthlyTargetHours: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                placeholder="e.g. 160"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Role</label>
                <CustomSelect
                  value={formData.role || 'consultant'}
                  onChange={(val) => handleChange('role', val as ConsultantRole)}
                  options={[
                    { value: 'consultant', label: 'Consultant' },
                    { value: 'admin', label: 'Admin' },
                  ]}
                />
              </div>
              <div>
                <label className="form-label">Status</label>
                <CustomSelect
                  value={formData.status || 'active'}
                  onChange={(val) => handleChange('status', val as ConsultantStatus)}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                    { value: 'on_leave', label: 'On Leave' },
                  ]}
                />
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
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
        <div className={`${isAdmin ? 'xl:col-span-3' : 'xl:col-span-5'} bg-surface-container-lowest rounded-[1rem] overflow-hidden flex flex-col`}>
          <div className="px-6 py-4 border-b border-surface-container-high flex items-center gap-2 flex-wrap">
            <TicketIcon className="w-4 h-4 text-on-surface-variant" />
            <h3 className="text-base font-semibold text-on-surface">Assigned Tickets</h3>
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold">
              {ticketTotal}
            </span>
            <div className="ml-auto flex items-center gap-3 flex-wrap justify-end">
              {/* Monthly hours */}
              <span className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant">
                <Timer className="w-3.5 h-3.5 text-brand-500" />
                {monthlyHoursLoading ? (
                  <span className="inline-block h-3 w-10 bg-surface-container-high rounded animate-pulse" />
                ) : (
                  <span className="font-semibold text-on-surface">
                    {monthlyHoursData.totalHours}h
                  </span>
                )}
                <span>
                  {new Date(hoursMonth.year, hoursMonth.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
                {currentConsultant.monthlyTargetHours != null && !monthlyHoursLoading && (
                  <span className={cn(
                    'font-medium',
                    monthlyHoursData.totalHours >= currentConsultant.monthlyTargetHours
                      ? 'text-green-600'
                      : 'text-on-surface-variant',
                  )}>
                    / {currentConsultant.monthlyTargetHours}h target
                  </span>
                )}
              </span>
              {/* Separator */}
              <span className="text-surface-container-high">|</span>
              {/* All-time hours */}
              {totalAllTimeHours !== null ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600">
                  <Timer className="w-3.5 h-3.5" />
                  {totalAllTimeHours}h total
                </span>
              ) : (
                <div className="h-4 w-16 bg-surface-container-high rounded animate-pulse" />
              )}
            </div>
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
                      <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Internal Delivery</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Hours</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Delayed</th>
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
                          className="hover:bg-surface-container-low cursor-pointer transition-colors"
                          onClick={() => navigate(`/tickets/view/${ticket._id}`)}
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm font-semibold text-brand-600">#{ticket.ticketNumber}</span>
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
                              {ticket.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm text-on-surface-variant">
                              {ticket.internalDeliveryDate ? fmtDate(ticket.internalDeliveryDate) : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm text-on-surface-variant">
                              {ticket.durationHours != null ? `${ticket.durationHours}h` : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {(() => {
                              if (!ticket.internalDeliveryDate) return <span className="text-sm text-on-surface-variant/50">—</span>;
                              const deliveryDate = new Date(ticket.internalDeliveryDate);
                              const compareDate = ticket.resolvedAt || ticket.closedAt
                                ? new Date(ticket.resolvedAt || ticket.closedAt!)
                                : new Date();
                              const delayed = Math.max(0, Math.floor((compareDate.getTime() - deliveryDate.getTime()) / 86400000));
                              return delayed > 0 ? (
                                <span className="text-sm font-semibold text-error">+{delayed}d</span>
                              ) : (
                                <span className="text-sm font-semibold text-green-600">On time</span>
                              );
                            })()}
                          </td>
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
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={ticketPage <= 1}
                      onClick={() => loadTickets(ticketPage - 1)}
                    >
                      Prev
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={ticketPage >= ticketPages}
                      onClick={() => loadTickets(ticketPage + 1)}
                    >
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
