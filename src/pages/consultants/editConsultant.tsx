import { useState, useEffect } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchConsultantById, updateConsultant, clearCurrentConsultant } from '@/redux/slices/consultantSlice';
import { fetchDepartments } from '@/redux/slices/departmentSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomSelect } from '@/components/ui/custom-select';
import { ProfilePictureUpload } from '@/components/ui/profile-picture-upload';
import { ArrowLeft, Save } from 'lucide-react';
import type { UpdateConsultantData, ConsultantRole, ConsultantStatus } from '@/types/consultant.types';

export default function EditConsultant() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentConsultant, loading } = useAppSelector((state) => state.consultants);
  const { departments } = useAppSelector((state) => state.departments);
  const isAdmin = useAppSelector((state) => state.auth.consultantRole) === 'admin';

  if (!isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  const [formData, setFormData] = useState<UpdateConsultantData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    role: 'consultant',
    department: undefined,
    status: 'active',
    monthlyTargetHours: null,
    profilePicture: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    dispatch(fetchDepartments({ isActive: true, limit: 999 } as any));
    if (id) dispatch(fetchConsultantById(id));
    return () => { dispatch(clearCurrentConsultant()); };
  }, [id]);

  useEffect(() => {
    if (currentConsultant) {
      setFormData({
        firstName: currentConsultant.firstName,
        lastName: currentConsultant.lastName,
        email: currentConsultant.email,
        phone: currentConsultant.phone || '',
        position: currentConsultant.position || '',
        role: currentConsultant.role,
        department: typeof currentConsultant.department === 'object' && currentConsultant.department
          ? (currentConsultant.department as any)._id
          : (currentConsultant.department as string | undefined),
        status: currentConsultant.status,
        monthlyTargetHours: currentConsultant.monthlyTargetHours ?? null,
        profilePicture: currentConsultant.profilePicture ?? null,
      });
    }
  }, [currentConsultant]);

  const handleChange = (field: keyof UpdateConsultantData, value: string) => {
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !id) {
      return;
    }

    const result = await dispatch(updateConsultant({ id, data: formData }));

    if (updateConsultant.fulfilled.match(result)) {
      navigate('/consultants');
    }
  };

  if (loading && !currentConsultant) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
        </div>
      </div>
    );
  }

  if (!currentConsultant) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-on-surface-variant">Consultant not found</p>
          <Button onClick={() => navigate('/consultants')} className="mt-4">
            Back to Consultants
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <Button variant="outline" size="sm" onClick={() => navigate('/consultants')} className="w-fit">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>
      <div>
        <h1 className="display-sm text-on-surface">Edit Consultant</h1>
        <p className="text-on-surface-variant mt-1">Update consultant information</p>
      </div>

      <div className="form-card">
        <h2 className="form-section-title">Consultant Information</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Picture */}
          <div className="flex flex-col items-center gap-2">
            <ProfilePictureUpload
              value={formData.profilePicture}
              onChange={(fileId) => setFormData((prev) => ({ ...prev, profilePicture: fileId }))}
              name={`${formData.firstName ?? ''} ${formData.lastName ?? ''}`.trim() || 'Consultant'}
              fallbackClassName="bg-brand-100 text-brand-700"
            />
            <p className="text-xs text-on-surface-variant">Profile picture (optional)</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="form-label">First Name</label>
              <Input
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                className={errors.firstName ? 'border-error' : ''}
              />
              {errors.firstName && <p className="text-error text-sm mt-1">{errors.firstName}</p>}
            </div>

            <div>
              <label className="form-label">Last Name</label>
              <Input
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                className={errors.lastName ? 'border-error' : ''}
              />
              {errors.lastName && <p className="text-error text-sm mt-1">{errors.lastName}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="form-label">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
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
                className={errors.phone ? 'border-error' : ''}
              />
              {errors.phone && <p className="text-error text-sm mt-1">{errors.phone}</p>}
            </div>
          </div>

          <div>
            <label className="form-label">Position</label>
            <Input
              value={formData.position}
              onChange={(e) => handleChange('position', e.target.value)}
              placeholder="e.g. Senior ERP Consultant"
            />
          </div>

          <div>
            <label className="form-label">Monthly Target Hours</label>
            <Input
              type="number"
              min={0}
              step={1}
              value={formData.monthlyTargetHours ?? ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  monthlyTargetHours: e.target.value ? Number(e.target.value) : null,
                }))
              }
              placeholder="e.g. 160"
            />
            <p className="text-xs text-on-surface-variant mt-1">
              Expected number of working hours per month for this consultant.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="form-label">Role</label>
              <CustomSelect
                value={formData.role || 'consultant'}
                onChange={(val) => handleChange('role', val as ConsultantRole)}
                options={[
                  { value: 'consultant', label: 'Consultant' },
                  { value: 'admin', label: 'Admin' },
                ]}
              />
            </div>

            <div>
              <label className="form-label">Department</label>
              <CustomSelect
                value={formData.department ?? ''}
                onChange={(val) => setFormData((prev) => ({ ...prev, department: val || undefined }))}
                options={[
                  { value: '', label: 'None' },
                  ...departments.map((d) => ({ value: d._id, label: d.name })),
                ]}
              />
            </div>

            <div>
              <label className="form-label">Status</label>
              <CustomSelect
                value={formData.status || 'active'}
                onChange={(val) => handleChange('status', val as ConsultantStatus)}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'on_leave', label: 'On Leave' },
                ]}
              />
            </div>
          </div>

          <div className="pt-6 border-t border-surface-container-high">
            <div className="flex gap-3 mt-6">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Update Consultant
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/consultants')} disabled={loading}>
              Cancel
            </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
