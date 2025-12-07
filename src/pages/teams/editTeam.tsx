import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchTeamById, updateTeam, clearCurrentTeam } from '@/redux/slices/teamSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save } from 'lucide-react';
import type { UpdateTeamData } from '@/types/team.types';

export default function EditTeam() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentTeam, loading } = useAppSelector((state) => state.teams);

  const [formData, setFormData] = useState<UpdateTeamData>({
    teamName: '',
    department: '',
    specialization: '',
    status: 'active',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (id) {
      dispatch(fetchTeamById(id));
    }

    return () => {
      dispatch(clearCurrentTeam());
    };
  }, [id, dispatch]);

  useEffect(() => {
    if (currentTeam) {
      setFormData({
        teamName: currentTeam.teamName,
        department: currentTeam.department,
        specialization: currentTeam.specialization || '',
        status: 'active',
      });
    }
  }, [currentTeam]);

  const handleChange = (field: keyof UpdateTeamData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.teamName && !formData.teamName.trim()) {
      newErrors.teamName = 'Team name cannot be empty';
    } else if (formData.teamName && formData.teamName.length > 100) {
      newErrors.teamName = 'Team name cannot exceed 100 characters';
    }

    if (formData.department && !formData.department.trim()) {
      newErrors.department = 'Department cannot be empty';
    } else if (formData.department && formData.department.length > 100) {
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

    if (!validateForm() || !id) {
      return;
    }

    const submitData = { ...formData };
    if (!submitData.specialization) delete submitData.specialization;

    const result = await dispatch(updateTeam({ id, data: submitData }));

    if (updateTeam.fulfilled.match(result)) {
      navigate('/teams');
    }
  };

  if (loading && !currentTeam) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  if (!currentTeam) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Team not found</p>
          <Button onClick={() => navigate('/teams')} className="mt-4">
            Back to Teams
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/teams')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Team</h1>
          <p className="text-gray-600 mt-1">Update team information</p>
        </div>
      </div>

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
                  Team Name <span className="text-gray-400 text-xs">(max 100 chars)</span>
                </label>
                <Input
                  value={formData.teamName}
                  onChange={(e) => handleChange('teamName', e.target.value)}
                  maxLength={100}
                  className={errors.teamName ? 'border-red-500' : ''}
                />
                {errors.teamName && <p className="text-red-500 text-sm mt-1">{errors.teamName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department <span className="text-gray-400 text-xs">(max 100 chars)</span>
                </label>
                <Input
                  value={formData.department}
                  onChange={(e) => handleChange('department', e.target.value)}
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
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Update Team
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
