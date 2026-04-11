import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, User, Mail, Phone, MapPin, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchCustomerById } from '@/redux/slices/customerSlice';
import { setCustomerRole } from '@/redux/slices/customerSlice';
import type { CustomerRole } from '@/types/customer.types';

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  inactive: 'bg-muted text-muted-foreground border-border',
  suspended: 'bg-destructive/10 text-destructive border-destructive/30',
  pending: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
};

export default function ViewCustomer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { currentCustomer, loading } = useAppSelector((state) => state.customers);
  const { userType } = useAppSelector((state) => state.auth);
  const isSystemAdmin = userType === 'consultant';

  useEffect(() => {
    if (id) dispatch(fetchCustomerById(id));
  }, [dispatch, id]);

  const handleRoleChange = (role: CustomerRole) => {
    if (!id) return;
    dispatch(setCustomerRole({ id, data: { role } }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-60">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (!currentCustomer) {
    return (
      <div className="p-8 text-center text-muted-foreground">Customer not found.</div>
    );
  }

  const c = currentCustomer;
  const companyName = typeof c.company === 'object' ? c.company?.name : c.companyName;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6 space-y-6 max-w-4xl mx-auto"
    >
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">{c.contactPerson}</h1>
          <p className="text-sm text-muted-foreground">{c.email}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline" className={`capitalize ${statusColors[c.status] || ''}`}>
            {c.status}
          </Badge>
          {c.role === 'company_admin' ? (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 gap-1">
              <ShieldCheck className="h-3 w-3" /> Admin
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground gap-1">
              <User className="h-3 w-3" /> User
            </Badge>
          )}
        </div>
      </div>

      {/* Info Card */}
      <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-start gap-3">
          <Mail className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Email</p>
            <p className="text-sm font-medium">{c.email}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Phone className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Phone</p>
            <p className="text-sm font-medium">{c.phone || '—'}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Company</p>
            <p className="text-sm font-medium">{companyName || '—'}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Location</p>
            <p className="text-sm font-medium">
              {[c.city, c.country].filter(Boolean).join(', ') || '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Role Management — system admin only */}
      {isSystemAdmin && (
        <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Role Management</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Assign this customer as a Company Admin to allow them to manage other users in their company.
          </p>
          <Select
            defaultValue={c.role || 'company_user'}
            onValueChange={(val) => handleRoleChange(val as CustomerRole)}
          >
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="company_user">
                <span className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5" /> Company User
                </span>
              </SelectItem>
              <SelectItem value="company_admin">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5" /> Company Admin
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </motion.div>
  );
}
