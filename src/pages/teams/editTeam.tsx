import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchTeamById, updateTeam, clearCurrentTeam } from '@/redux/slices/teamSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
        </div>
      </div>
    );
  }

  if (!currentTeam) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-on-surface-variant">Team not found</p>
          <Button onClick={() => navigate('/teams')} className="mt-4">
            Back to Teams
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/teams')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="display-sm text-on-surface">Edit Team</h1>
          <p className="text-on-surface-variant mt-1">Update team information</p>
        </div>
      </div>

      <div className="form-card">
        <h2 className="form-section-title">Team Information</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Team Name & Department */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="form-label">
                Team Name <span className="text-on-surface-variant text-xs">(max 100 chars)</span>
              </label>
              <Input
                value={formData.teamName}
                onChange={(e) => handleChange('teamName', e.target.value)}
                maxLength={100}
                className={errors.teamName ? 'border-error' : ''}
              />
              {errors.teamName && <p className="text-error text-sm mt-1">{errors.teamName}</p>}
            </div>

            <div>
              <label className="form-label">
                Department <span className="text-on-surface-variant text-xs">(max 100 chars)</span>
              </label>
              <Input
                value={formData.department}
                onChange={(e) => handleChange('department', e.target.value)}
                maxLength={100}
                className={errors.department ? 'border-error' : ''}
              />
              {errors.department && <p className="text-error text-sm mt-1">{errors.department}</p>}
            </div>
          </div>

          {/* Specialization */}
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
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6">
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
      </div>
    </div>
  );
}
