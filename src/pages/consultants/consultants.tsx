import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchConsultants, deleteConsultant } from '@/redux/slices/consultantSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, RefreshCw, Edit, Trash2 } from 'lucide-react';
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
    admin: 'bg-purple-100 text-purple-800 border-purple-200',
    senior_consultant: 'bg-blue-100 text-blue-800 border-blue-200',
    consultant: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const formatRole = (role: string) => {
    return role.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Consultants</h1>
          <p className="text-gray-600 mt-1">Manage consultant accounts and permissions</p>
        </div>
        <Button onClick={() => navigate('/consultants/create')}>
          <Plus className="w-4 h-4 mr-2" />
          Add Consultant
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 px-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="on_leave">On Leave</option>
            </select>
          </div>
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full h-10 px-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Roles</option>
              <option value="consultant">Consultant</option>
              <option value="senior_consultant">Senior Consultant</option>
              <option value="admin">Admin</option>
            </select>
          </div>
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
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : consultants.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No consultants found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Full Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {consultants.map((consultant) => (
                    <tr key={consultant._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {consultant.fullName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{consultant.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
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
                            className="text-red-600 hover:text-red-700 hover:border-red-300"
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
            <div className="bg-gray-50 px-6 py-3 border-t">
              <p className="text-sm text-gray-700">
                Showing {consultants.length} of {total} consultants
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
