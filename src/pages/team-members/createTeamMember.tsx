import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { createTeamMember } from '@/redux/slices/teamMemberSlice';
import { fetchActiveTeams } from '@/redux/slices/teamSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomSelect } from '@/components/ui/custom-select';
import { ArrowLeft, Save } from 'lucide-react';
import type { CreateTeamMemberData, TeamMemberRole, TeamMemberStatus } from '@/types/teamMember.types';

export default function CreateTeamMember() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { loading } = useAppSelector((state) => state.teamMembers);
  const { teams } = useAppSelector((state) => state.teams);

  const [formData, setFormData] = useState<CreateTeamMemberData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    role: 'member',
    status: 'active',
    team: '',
    specialization: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    dispatch(fetchActiveTeams({ limit: 100 }));
  }, []);

  const handleChange = (field: keyof CreateTeamMemberData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
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

    if (!validateForm()) {
      return;
    }

    const submitData = { ...formData };
    if (!submitData.team) delete submitData.team;
    if (!submitData.specialization) delete submitData.specialization;

    const result = await dispatch(createTeamMember(submitData));

    if (createTeamMember.fulfilled.match(result)) {
      navigate('/team-members');
    }
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/team-members')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="display-sm text-on-surface">Create New Team Member</h1>
          <p className="text-on-surface-variant mt-1">Add a new team member to the system</p>
        </div>
      </div>

      {/* Form */}
      <div className="form-card">
        <h2 className="form-section-title">Team Member Information</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="form-label">
                First Name <span className="text-error">*</span>
              </label>
              <Input
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                placeholder="Enter first name"
                className={errors.firstName ? 'border-error' : ''}
              />
              {errors.firstName && <p className="text-error text-sm mt-1">{errors.firstName}</p>}
            </div>

            <div>
              <label className="form-label">
                Last Name <span className="text-error">*</span>
              </label>
              <Input
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="Enter last name"
                className={errors.lastName ? 'border-error' : ''}
              />
              {errors.lastName && <p className="text-error text-sm mt-1">{errors.lastName}</p>}
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="form-label">
                Email <span className="text-error">*</span>
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="member@example.com"
                className={errors.email ? 'border-error' : ''}
              />
              {errors.email && <p className="text-error text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="form-label">Phone</label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+1234567890"
                className={errors.phone ? 'border-error' : ''}
              />
              {errors.phone && <p className="text-error text-sm mt-1">{errors.phone}</p>}
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="form-label">
              Password <span className="text-error">*</span>
            </label>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              placeholder="Enter password (min 8 characters)"
              className={errors.password ? 'border-error' : ''}
            />
            {errors.password && <p className="text-error text-sm mt-1">{errors.password}</p>}
          </div>

          {/* Team Assignment & Role */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="form-label">Team</label>
              <CustomSelect
                value={formData.team || ''}
                onChange={(val) => handleChange('team', val)}
                placeholder="No Team (Unassigned)"
                options={[
                  { value: '', label: 'No Team (Unassigned)' },
                  ...teams.map((team) => ({ value: team._id, label: team.teamName })),
                ]}
              />
            </div>

            <div>
              <label className="form-label">
                Role <span className="text-error">*</span>
              </label>
              <CustomSelect
                value={formData.role}
                onChange={(val) => handleChange('role', val as TeamMemberRole)}
                options={[
                  { value: 'member', label: 'Member' },
                  { value: 'team_lead', label: 'Team Lead' },
                ]}
              />
            </div>
          </div>

          {/* Specialization & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="form-label">
                Specialization <span className="text-on-surface-variant text-xs">(max 150 chars)</span>
              </label>
              <Input
                value={formData.specialization}
                onChange={(e) => handleChange('specialization', e.target.value)}
                placeholder="e.g., Technical Support, Customer Service"
                maxLength={150}
                className={errors.specialization ? 'border-error' : ''}
              />
              {errors.specialization && <p className="text-error text-sm mt-1">{errors.specialization}</p>}
            </div>

            <div>
              <label className="form-label">
                Status <span className="text-error">*</span>
              </label>
              <CustomSelect
                value={formData.status || 'active'}
                onChange={(val) => handleChange('status', val as TeamMemberStatus)}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'on_leave', label: 'On Leave' },
                ]}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Create Team Member
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/team-members')} disabled={loading}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
