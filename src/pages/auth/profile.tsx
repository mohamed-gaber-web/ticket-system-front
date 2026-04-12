import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { getProfile, updateProfile } from '@/redux/slices/authSlice';
import { updateConsultant } from '@/redux/slices/consultantSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Save, Mail, Phone, Calendar, Clock, Ticket as TicketIcon, Building2, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as ticketApi from '@/api/ticketApi';
import type { Ticket } from '@/types/ticket';
import { useNavigate } from 'react-router-dom';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TICKET_LIMIT = 10;

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const formatLabel = (s: string) =>
  s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

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
  new: 'bg-accent-orange-400 text-white',
  assigned: 'bg-brand-400 text-white',
  in_progress: 'bg-yellow-500 text-white',
  resolved: 'bg-green-500 text-white',
  closed: 'bg-surface-container-highest text-on-surface-variant',
};
const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-emerald-100 text-emerald-800',
  user: 'bg-surface-container-high text-on-surface',
  senior_consultant: 'bg-brand-100 text-brand-800',
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
  const { user, userType, isLoading } = useAppSelector((state) => state.auth);

  const u = user as any;
  const isConsultant = userType === 'consultant';
  const isTeleSales = userType === 'tele_sales';

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
    // Only load tickets for ticket-system users
    if (!isTeleSales) {
      loadTickets(1, userType ?? undefined);
    }
  }, [user, userType]);

  const loadTickets = async (page: number, role = userType) => {
    if (!u?._id) return;
    setTicketsLoading(true);
    try {
      const params = role === 'consultant'
        ? { acceptedBy: u._id, page, limit: TICKET_LIMIT }
        : { customer: u._id, page, limit: TICKET_LIMIT };
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
    if (!validateConsultant() || !u?._id) return;
    const result = await dispatch(
      updateConsultant({ id: u._id, data: consultantForm })
    );
    if (updateConsultant.fulfilled.match(result)) {
      toast.success('Profile updated successfully');
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
  // CONSULTANT PROFILE
  // ─────────────────────────────────────────────────────────────────────────
  if (isConsultant) {
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
        </div>

        {/* Two-column: Edit Form + Assigned Tickets */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

          {/* Edit Profile Form */}
          <div className="xl:col-span-2 bg-surface-container-lowest rounded-[1rem] p-6">
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
          </div>

          {/* Assigned Tickets */}
          <div className="xl:col-span-3 bg-surface-container-lowest rounded-[1rem] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-surface-container-high flex items-center gap-2">
              <TicketIcon className="w-4 h-4 text-on-surface-variant" />
              <h3 className="text-base font-semibold text-on-surface">Assigned Tickets</h3>
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
