import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchTeamMemberById, updateTeamMember, clearCurrentTeamMember } from '@/redux/slices/teamMemberSlice';
import { fetchActiveTeams } from '@/redux/slices/teamSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save } from 'lucide-react';
import type { UpdateTeamMemberData, TeamMemberRole, TeamMemberStatus } from '@/types/teamMember.types';

export default function EditTeamMember() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentTeamMember, loading } = useAppSelector((state) => state.teamMembers);
  const { teams } = useAppSelector((state) => state.teams);

  const [formData, setFormData] = useState<UpdateTeamMemberData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'member',
    status: 'active',
    team: '',
    specialization: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (id) {
      dispatch(fetchTeamMemberById(id));
    }
    dispatch(fetchActiveTeams({ limit: 100 }));

    return () => {
      dispatch(clearCurrentTeamMember());
    };
  }, [id, dispatch]);

  useEffect(() => {
    if (currentTeamMember) {
      const teamId = typeof currentTeamMember.team === 'string' ? currentTeamMember.team : currentTeamMember.team?._id || '';
      setFormData({
        firstName: currentTeamMember.firstName,
        lastName: currentTeamMember.lastName,
        email: currentTeamMember.email,
        phone: currentTeamMember.phone || currentTeamMember.phoneNumber || '',
        role: String(currentTeamMember.role),
        status: String(currentTeamMember.status),
        team: teamId,
        specialization: currentTeamMember.specialization || '',
      });
    }
  }, [currentTeamMember]);

  const handleChange = (field: keyof UpdateTeamMemberData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.firstName && !formData.firstName.trim()) {
      newErrors.firstName = 'First name cannot be empty';
    }

    if (formData.lastName && !formData.lastName.trim()) {
      newErrors.lastName = 'Last name cannot be empty';
    }

    if (formData.email && !formData.email.trim()) {
      newErrors.email = 'Email cannot be empty';
    } else if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (formData.phone && !/^\d{10,15}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Phone must be 10-15 digits';
    }

    if (formData.specialization && formData.specialization.length > 150) {
      newErrors.specialization = 'Specialization cannot exceed 150 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !id) {
      return;
    }

    const submitData = { ...formData };
    if (!submitData.team) delete submitData.team;
    if (!submitData.specialization) delete submitData.specialization;

    const result = await dispatch(updateTeamMember({ id, data: submitData }));

    if (updateTeamMember.fulfilled.match(result)) {
      navigate('/team-members');
    }
  };

  if (loading && !currentTeamMember) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  if (!currentTeamMember) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Team member not found</p>
          <Button onClick={() => navigate('/team-members')} className="mt-4">
            Back to Team Members
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/team-members')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Team Member</h1>
          <p className="text-gray-600 mt-1">Update team member information</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Member Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  className={errors.firstName ? 'border-red-500' : ''}
                />
                {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  className={errors.lastName ? 'border-red-500' : ''}
                />
                {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className={errors.phone ? 'border-red-500' : ''}
                />
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
              </div>
            </div>

            {/* Team Assignment & Role */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Team</label>
                <select
                  value={formData.team}
                  onChange={(e) => handleChange('team', e.target.value)}
                  className="w-full h-10 px-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="">No Team (Unassigned)</option>
                  {teams.map((team) => (
                    <option key={team._id} value={team._id}>
                      {team.teamName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => handleChange('role', e.target.value as TeamMemberRole)}
                  className="w-full h-10 px-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="member">Member</option>
                  <option value="team_lead">Team Lead</option>
                </select>
              </div>
            </div>

            {/* Specialization & Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specialization <span className="text-gray-400 text-xs">(max 150 chars)</span>
                </label>
                <Input
                  value={formData.specialization}
                  onChange={(e) => handleChange('specialization', e.target.value)}
                  placeholder="e.g., Technical Support, Customer Service"
                  maxLength={150}
                  className={errors.specialization ? 'border-red-500' : ''}
                />
                {errors.specialization && <p className="text-red-500 text-sm mt-1">{errors.specialization}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value as TeamMemberStatus)}
                  className="w-full h-10 px-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="on_leave">On Leave</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6 border-t">
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Update Team Member
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/team-members')} disabled={loading}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
