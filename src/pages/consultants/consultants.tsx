import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchConsultants, deleteConsultant } from '@/redux/slices/consultantSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, RefreshCw, Edit, Trash2 } from 'lucide-react';
import { CustomSelect } from '@/components/ui/custom-select';
import { cn } from '@/lib/utils';
import Swal from 'sweetalert2';

export default function Consultants() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { consultants, loading, total } = useAppSelector((state) => state.consultants);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => {
    loadConsultants();
  }, []);

  const loadConsultants = () => {
    const params: any = {};
    if (searchTerm) params.search = searchTerm;
    if (statusFilter) params.status = statusFilter;
    if (roleFilter) params.role = roleFilter;
    dispatch(fetchConsultants(params));
  };

  const handleSearch = () => {
    loadConsultants();
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
      loadConsultants();
    }
  };

  const handleRefresh = () => {
    setSearchTerm('');
    setStatusFilter('');
    setRoleFilter('');
    dispatch(fetchConsultants({}));
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
        <Button onClick={() => navigate('/consultants/create')}>
          <Plus className="w-4 h-4 mr-2" />
          Add Consultant
        </Button>
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
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                      Actions
                    </th>
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
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/consultants/edit/${consultant._id}`)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-error hover:text-error hover:border-red-300"
                            onClick={() => handleDelete(consultant._id, consultant.fullName)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-surface-container-low px-6 py-3">
              <p className="text-sm text-on-surface">
                Showing {consultants.length} of {total} consultants
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
