import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchTeamMembers, deleteTeamMember } from '@/redux/slices/teamMemberSlice';
import { fetchActiveTeams } from '@/redux/slices/teamSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, RefreshCw, Edit, Trash2 } from 'lucide-react';
import { CustomSelect } from '@/components/ui/custom-select';
import { cn } from '@/lib/utils';
import Swal from 'sweetalert2';

export default function TeamMembers() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { teamMembers, loading, total } = useAppSelector((state) => state.teamMembers);
  const { teams } = useAppSelector((state) => state.teams);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');

  useEffect(() => {
    loadTeamMembers();
    dispatch(fetchActiveTeams({ limit: 100 }));
  }, []);

  const loadTeamMembers = () => {
    const params: any = {};
    if (searchTerm) params.search = searchTerm;
    if (statusFilter) params.status = statusFilter;
    if (roleFilter) params.role = roleFilter;
    if (teamFilter) params.team = teamFilter;
    dispatch(fetchTeamMembers(params));
  };

  const handleSearch = () => {
    loadTeamMembers();
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
      await dispatch(deleteTeamMember(id));
      loadTeamMembers();
    }
  };

  const handleRefresh = () => {
    setSearchTerm('');
    setStatusFilter('');
    setRoleFilter('');
    setTeamFilter('');
    dispatch(fetchTeamMembers({}));
  };

  const STATUS_STYLES = {
    active: 'bg-green-100 text-green-800 border-green-200',
    inactive: 'bg-red-100 text-red-800 border-red-200',
    on_leave: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  };

  const ROLE_STYLES = {
    team_lead: 'bg-accent-orange-100 text-purple-800 border-accent-orange-200',
    senior_member: 'bg-brand-100 text-brand-800 border-brand-200',
    member: 'bg-surface-container-high text-on-surface border-surface-container-high',
    support_agent: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  };

  const formatRole = (role: string) => {
    return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const getTeamName = (team: any) => {
    if (!team) return 'N/A';
    if (typeof team === 'string') return 'Assigned';
    return team.teamName || 'N/A';
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="display-sm text-on-surface">Team Members</h1>
          <p className="text-on-surface-variant mt-1">Manage team member accounts and assignments</p>
        </div>
        <Button onClick={() => navigate('/team-members/create')}>
          <Plus className="w-4 h-4 mr-2" />
          Add Team Member
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-surface-container-lowest rounded-[1rem] p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
              { value: 'team_lead', label: 'Team Lead' },
              { value: 'member', label: 'Member' },
            ]}
          />
          <CustomSelect
            variant="filter"
            value={teamFilter}
            onChange={setTeamFilter}
            label="Team"
            options={[
              { value: '', label: 'All' },
              ...teams.map((team) => ({
                value: team._id,
                label: team.teamName,
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
        ) : teamMembers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-on-surface-variant">No team members found</p>
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
                      Team
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
                  {teamMembers.map((member) => (
                    <tr key={member._id} className="hover:bg-surface-container-low">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-on-surface">
                          {member.fullName || `${member.firstName} ${member.lastName}`}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-on-surface-variant">{member.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-on-surface-variant">
                          {member.phone || member.phoneNumber || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-on-surface-variant">{getTeamName(member.team)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={cn(
                            'px-2 py-1 text-xs font-medium rounded-md border',
                            ROLE_STYLES[member.role as keyof typeof ROLE_STYLES] || 'bg-surface-container-high text-on-surface border-surface-container-high'
                          )}
                        >
                          {formatRole(String(member.role))}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={cn(
                            'px-2 py-1 text-xs font-medium rounded-md border',
                            STATUS_STYLES[member.status as keyof typeof STATUS_STYLES] || 'bg-surface-container-high text-on-surface border-surface-container-high'
                          )}
                        >
                          {formatStatus(String(member.status))}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/team-members/edit/${member._id}`)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-error hover:text-error hover:border-red-300"
                            onClick={() => handleDelete(member._id, member.fullName || `${member.firstName} ${member.lastName}`)}
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
                Showing {teamMembers.length} of {total} team members
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
