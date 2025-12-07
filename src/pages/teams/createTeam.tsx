import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { createTeam } from '@/redux/slices/teamSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save } from 'lucide-react';
import type { CreateTeamData } from '@/types/team.types';

export default function CreateTeam() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { loading } = useAppSelector((state) => state.teams);

  const [formData, setFormData] = useState<CreateTeamData>({
    teamName: '',
    department: '',
    specialization: '',
    status: 'active',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});


  const handleChange = (field: keyof CreateTeamData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.teamName.trim()) {
      newErrors.teamName = 'Team name is required';
    } else if (formData.teamName.length > 100) {
      newErrors.teamName = 'Team name cannot exceed 100 characters';
    }

    if (!formData.department.trim()) {
      newErrors.department = 'Department is required';
    } else if (formData.department.length > 100) {
      newErrors.department = 'Department cannot exceed 100 characters';
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
    if (!submitData.specialization) delete submitData.specialization;

    const result = await dispatch(createTeam(submitData));

    if (createTeam.fulfilled.match(result)) {
      navigate('/teams');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/teams')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Team</h1>
          <p className="text-gray-600 mt-1">Add a new team to the system</p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Team Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Team Name & Department */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team Name <span className="text-red-500">*</span> <span className="text-gray-400 text-xs">(max 100 chars)</span>
                </label>
                <Input
                  value={formData.teamName}
                  onChange={(e) => handleChange('teamName', e.target.value)}
                  placeholder="Enter team name"
                  maxLength={100}
                  className={errors.teamName ? 'border-red-500' : ''}
                />
                {errors.teamName && <p className="text-red-500 text-sm mt-1">{errors.teamName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department <span className="text-red-500">*</span> <span className="text-gray-400 text-xs">(max 100 chars)</span>
                </label>
                <Input
                  value={formData.department}
                  onChange={(e) => handleChange('department', e.target.value)}
                  placeholder="e.g., Customer Support, Technical"
                  maxLength={100}
                  className={errors.department ? 'border-red-500' : ''}
                />
                {errors.department && <p className="text-red-500 text-sm mt-1">{errors.department}</p>}
              </div>
            </div>

            {/* Specialization */}
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
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6 border-t">
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Create Team
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/teams')} disabled={loading}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
