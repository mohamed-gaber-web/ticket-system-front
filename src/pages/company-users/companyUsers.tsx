import { useEffect, useState } from 'react';
import { UserPlus, Search, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchCompanyUsers, removeCompanyUser } from '@/redux/slices/companyUserSlice';
import type { Customer } from '@/types/customer.types';
import CompanyUserTable from './components/CompanyUserTable';
import CompanyUserFormDialog from './components/CompanyUserFormDialog';

export default function CompanyUsersPage() {
  const dispatch = useAppDispatch();
  const { companyUsers, loading, total } = useAppSelector((state) => state.companyUsers);
  const { user } = useAppSelector((state) => state.auth);

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Customer | null>(null);

  useEffect(() => {
    dispatch(fetchCompanyUsers({ search }));
  }, [dispatch, search]);

  const handleEdit = (user: Customer) => {
    setEditingUser(user);
    setDialogOpen(true);
  };

  const handleDeactivate = (user: Customer) => {
    if (window.confirm(`Deactivate ${user.contactPerson}? They will no longer be able to log in.`)) {
      dispatch(removeCompanyUser(user._id));
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingUser(null);
    dispatch(fetchCompanyUsers({ search }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Company Users</h1>
            <p className="text-sm text-muted-foreground">
              {total} user{total !== 1 ? 's' : ''} in your company
            </p>
          </div>
        </div>
        <Button onClick={() => { setEditingUser(null); setDialogOpen(true); }} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          </div>
        ) : (
          <CompanyUserTable
            users={companyUsers}
            onEdit={handleEdit}
            onDeactivate={handleDeactivate}
            currentUserId={(user as any)?._id || ''}
          />
        )}
      </div>

      <CompanyUserFormDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        editingUser={editingUser}
      />
    </motion.div>
  );
}
