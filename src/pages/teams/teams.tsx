import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchTeams, deleteTeam } from '@/redux/slices/teamSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, RefreshCw, Edit, Trash2, Users } from 'lucide-react';
import { CustomSelect } from '@/components/ui/custom-select';
import { cn } from '@/lib/utils';
import Swal from 'sweetalert2';

export default function Teams() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { teams, loading, total } = useAppSelector((state) => state.teams);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = () => {
    const params: any = {};
    if (searchTerm) params.search = searchTerm;
    if (statusFilter) params.status = statusFilter;
    if (departmentFilter) params.department = departmentFilter;
    dispatch(fetchTeams(params));
  };

  const handleSearch = () => {
    loadTeams();
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
      await dispatch(deleteTeam(id));
      loadTeams();
    }
  };

  const handleRefresh = () => {
    setSearchTerm('');
    setStatusFilter('');
    setDepartmentFilter('');
    dispatch(fetchTeams({}));
  };

  const STATUS_STYLES = {
    active: 'bg-green-100 text-green-800 border-green-200',
    inactive: 'bg-red-100 text-red-800 border-red-200',
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Get unique departments from teams
  const uniqueDepartments = Array.from(new Set(teams.map((team) => team.department).filter(Boolean)));

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="display-sm text-on-surface">Teams</h1>
          <p className="text-on-surface-variant mt-1">Manage teams and their specializations</p>
        </div>
        <Button onClick={() => navigate('/teams/create')}>
          <Plus className="w-4 h-4 mr-2" />
          Add Team
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-surface-container-lowest rounded-[1rem] p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <Input
              placeholder="Search by team name or specialization..."
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
            ]}
          />
          <CustomSelect
            variant="filter"
            value={departmentFilter}
            onChange={setDepartmentFilter}
            label="Department"
            options={[
              { value: '', label: 'All' },
              ...uniqueDepartments.map((dept) => ({
                value: dept,
                label: dept,
              })),
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
        ) : teams.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-on-surface-variant">No teams found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-container-low">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                      Team Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                      Specialization
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                      Members
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
                  {teams.map((team) => (
                    <tr key={team._id} className="hover:bg-surface-container-low">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-on-surface">{team.teamName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-on-surface-variant">{team.department || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-on-surface-variant">{team.specialization || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-on-surface-variant">
                          <Users className="w-4 h-4 mr-1" />
                          {team.members?.length || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={cn(
                            'px-2 py-1 text-xs font-medium rounded-md border',
                            STATUS_STYLES[team.status as keyof typeof STATUS_STYLES] ||
                              'bg-surface-container-high text-on-surface border-surface-container-high'
                          )}
                        >
                          {formatStatus(team.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => navigate(`/teams/edit/${team._id}`)}>
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-error hover:text-error hover:border-red-300"
                            onClick={() => handleDelete(team._id, team.teamName)}
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
                Showing {teams.length} of {total} teams
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
