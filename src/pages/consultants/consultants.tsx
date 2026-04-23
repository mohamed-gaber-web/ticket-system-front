import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchConsultants, deleteConsultant, adminResetConsultantPassword } from '@/redux/slices/consultantSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, RefreshCw, Edit, Trash2, ChevronLeft, ChevronRight, KeyRound } from 'lucide-react';
import { CustomSelect } from '@/components/ui/custom-select';
import { cn } from '@/lib/utils';
import Swal from 'sweetalert2';
import AdminChangePasswordDialog from '@/components/admin/AdminChangePasswordDialog';

const PAGE_SIZE = 10;

export default function Consultants() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { consultants, loading, total, pages } = useAppSelector((state) => state.consultants);
  const { consultantRole } = useAppSelector((state) => state.auth);
  const isAdmin = consultantRole === 'admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [passwordTarget, setPasswordTarget] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    loadConsultants(1);
  }, []);

  const loadConsultants = (page = currentPage) => {
    const params: any = { page, limit: PAGE_SIZE };
    if (searchTerm) params.search = searchTerm;
    if (statusFilter) params.status = statusFilter;
    if (roleFilter) params.role = roleFilter;
    setCurrentPage(page);
    dispatch(fetchConsultants(params));
  };

  const handleSearch = () => {
    loadConsultants(1);
  };

  const handleDelete = async (id: string, name: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete ${name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
    });

    if (result.isConfirmed) {
      await dispatch(deleteConsultant(id));
      loadConsultants(1);
    }
  };

  const handleRefresh = () => {
    setSearchTerm('');
    setStatusFilter('');
    setRoleFilter('');
    setCurrentPage(1);
    dispatch(fetchConsultants({ page: 1, limit: PAGE_SIZE }));
  };

  const STATUS_STYLES = {
    active: 'bg-green-100 text-green-800 border-green-200',
    inactive: 'bg-red-100 text-red-800 border-red-200',
    on_leave: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  };

  const ROLE_STYLES = {
    admin: 'bg-accent-orange-100 text-purple-800 border-accent-orange-200',
    senior_consultant: 'bg-brand-100 text-brand-800 border-brand-200',
    consultant: 'bg-surface-container-high text-on-surface border-surface-container-high',
  };

  const formatRole = (role: string) => {
    return role.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="display-sm text-on-surface">Consultants</h1>
          <p className="text-on-surface-variant mt-1">Manage consultant accounts and permissions</p>
        </div>
        {isAdmin && (
          <Button onClick={() => navigate('/consultants/create')}>
            <Plus className="w-4 h-4 mr-2" />
            Add Consultant
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-surface-container-lowest rounded-[1rem] p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <CustomSelect
            variant="filter"
            value={statusFilter}
            onChange={setStatusFilter}
            label="Status"
            options={[
              { value: '', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'on_leave', label: 'On Leave' },
            ]}
          />
          <CustomSelect
            variant="filter"
            value={roleFilter}
            onChange={setRoleFilter}
            label="Role"
            options={[
              { value: '', label: 'All' },
              { value: 'consultant', label: 'Consultant' },
              { value: 'senior_consultant', label: 'Senior Consultant' },
              { value: 'admin', label: 'Admin' },
            ]}
          />
        </div>
        <div className="flex gap-2 mt-4">
          <Button onClick={handleSearch} size="sm">
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>
          <Button onClick={handleRefresh} size="sm" variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-[1rem] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
          </div>
        ) : consultants.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-on-surface-variant">No consultants found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-container-low">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                      Full Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                      Position
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                      Status
                    </th>
                    {isAdmin && (
                      <th className="px-6 py-3 text-center text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high">
                  {consultants.map((consultant) => (
                    <tr key={consultant._id} className="hover:bg-surface-container-low">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-on-surface">
                          {consultant.fullName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-on-surface-variant">{consultant.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-on-surface-variant">
                          {consultant.position || <span className="text-on-surface-variant/40">&mdash;</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-on-surface-variant">
                          {consultant.phone || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={cn(
                            'px-2 py-1 text-xs font-medium rounded-md border',
                            ROLE_STYLES[consultant.role as keyof typeof ROLE_STYLES]
                          )}
                        >
                          {formatRole(consultant.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={cn(
                            'px-2 py-1 text-xs font-medium rounded-md border',
                            STATUS_STYLES[consultant.status as keyof typeof STATUS_STYLES]
                          )}
                        >
                          {formatStatus(consultant.status)}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Edit"
                              onClick={() => navigate(`/consultants/edit/${consultant._id}`)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Change Password"
                              className="text-brand-600 hover:text-brand-700"
                              onClick={() => setPasswordTarget({ id: consultant._id, name: consultant.fullName })}
                            >
                              <KeyRound className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Delete"
                              className="text-error hover:text-error/80"
                              onClick={() => handleDelete(consultant._id, consultant.fullName)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-surface-container-low px-6 py-3 flex items-center justify-between">
              <p className="text-sm text-on-surface-variant">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, total)} of {total} consultants
              </p>
              {pages > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage <= 1}
                    onClick={() => loadConsultants(currentPage - 1)}
                    className="w-8 h-8 p-0"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {Array.from({ length: pages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === pages || Math.abs(p - currentPage) <= 1)
                    .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === '...' ? (
                        <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-sm text-on-surface-variant">
                          …
                        </span>
                      ) : (
                        <Button
                          key={item}
                          size="sm"
                          variant={item === currentPage ? 'default' : 'outline'}
                          onClick={() => loadConsultants(item as number)}
                          className="w-8 h-8 p-0"
                        >
                          {item}
                        </Button>
                      )
                    )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage >= pages}
                    onClick={() => loadConsultants(currentPage + 1)}
                    className="w-8 h-8 p-0"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <AdminChangePasswordDialog
        open={!!passwordTarget}
        onOpenChange={(open) => { if (!open) setPasswordTarget(null); }}
        targetName={passwordTarget?.name ?? ''}
        loading={loading}
        onSubmit={async (newPassword) => {
          if (!passwordTarget) return;
          await dispatch(adminResetConsultantPassword({ id: passwordTarget.id, newPassword }));
        }}
      />
    </div>
  );
}
