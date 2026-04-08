import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { createCompanyUser, updateCompanyUser } from '@/redux/slices/companyUserSlice';
import type { Customer, CreateCompanyUserData, UpdateCompanyUserData } from '@/types/customer.types';

interface Props {
  open: boolean;
  onClose: () => void;
  editingUser?: Customer | null;
}

const empty = {
  contactPerson: '',
  email: '',
  password: '',
  phone: '',
  address: '',
  city: '',
  country: '',
  status: 'active' as string,
};

export default function CompanyUserFormDialog({ open, onClose, editingUser }: Props) {
  const dispatch = useAppDispatch();
  const { loading } = useAppSelector((state) => state.companyUsers);
  const isEdit = !!editingUser;
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingUser) {
      setForm({
        contactPerson: editingUser.contactPerson || '',
        email: editingUser.email || '',
        password: '',
        phone: editingUser.phone || '',
        address: editingUser.address || '',
        city: editingUser.city || '',
        country: editingUser.country || '',
        status: editingUser.status || 'active',
      });
    } else {
      setForm(empty);
    }
    setError('');
  }, [editingUser, open]);

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.contactPerson.trim()) { setError('Contact person is required'); return; }
    if (!isEdit && !form.email.trim()) { setError('Email is required'); return; }
    if (!isEdit && form.password.length < 8) { setError('Password must be at least 8 characters'); return; }

    if (isEdit && editingUser) {
      const data: UpdateCompanyUserData = {
        contactPerson: form.contactPerson,
        phone: form.phone,
        address: form.address,
        city: form.city,
        country: form.country,
        status: form.status as UpdateCompanyUserData['status'],
      };
      const result = await dispatch(updateCompanyUser({ id: editingUser._id, data }));
      if (updateCompanyUser.fulfilled.match(result)) onClose();
    } else {
      const data: CreateCompanyUserData = {
        contactPerson: form.contactPerson,
        email: form.email,
        password: form.password,
        phone: form.phone,
        address: form.address,
        city: form.city,
        country: form.country,
      };
      const result = await dispatch(createCompanyUser(data));
      if (createCompanyUser.fulfilled.match(result)) onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] backdrop-blur-sm bg-surface/95 border border-outline-variant/30 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {isEdit ? 'Edit User' : 'Add Company User'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="contactPerson">Contact Person <span className="text-destructive">*</span></Label>
            <Input
              id="contactPerson"
              value={form.contactPerson}
              onChange={(e) => set('contactPerson', e.target.value)}
              placeholder="Full name"
            />
          </div>

          {!isEdit && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="user@company.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  placeholder="Min. 8 characters"
                />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+1234567890" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Cairo" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="country">Country</Label>
            <Input id="country" value={form.country} onChange={(e) => set('country', e.target.value)} placeholder="Egypt" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Street address" />
          </div>

          {isEdit && (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(val) => set('status', val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
