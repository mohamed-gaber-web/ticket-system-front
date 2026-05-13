import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { createConsultant } from '@/redux/slices/consultantSlice';
import { fetchDepartments } from '@/redux/slices/departmentSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomSelect } from '@/components/ui/custom-select';
import { ArrowLeft, Save } from 'lucide-react';
import type { CreateConsultantData, ConsultantRole } from '@/types/consultant.types';

export default function CreateConsultant() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { loading } = useAppSelector((state) => state.consultants);
  const { departments } = useAppSelector((state) => state.departments);
  const isAdmin = useAppSelector((state) => state.auth.consultantRole) === 'admin';

  useEffect(() => {
    dispatch(fetchDepartments({ isActive: true, limit: 999 } as any));
  }, []);

  if (!isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  const [formData, setFormData] = useState<CreateConsultantData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    position: '',
    role: 'consultant',
    department: undefined,
    status: 'active',
    monthlyTargetHours: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof CreateConsultantData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const result = await dispatch(createConsultant(formData));

    if (createConsultant.fulfilled.match(result)) {
      navigate('/consultants');
    }
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/consultants')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="display-sm text-on-surface">Create New Consultant</h1>
          <p className="text-on-surface-variant mt-1">Add a new consultant to the system</p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Consultant Information</CardTitle>
        </CardHeader>
        <CardContent>
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
                  className={errors.firstName ? 'border-red-500' : ''}
                />
                {errors.firstName && (
                  <p className="text-error text-sm mt-1">{errors.firstName}</p>
                )}
              </div>

              <div>
                <label className="form-label">
                  Last Name <span className="text-error">*</span>
                </label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  placeholder="Enter last name"
                  className={errors.lastName ? 'border-red-500' : ''}
                />
                {errors.lastName && (
                  <p className="text-error text-sm mt-1">{errors.lastName}</p>
                )}
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
                  placeholder="consultant@example.com"
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-error text-sm mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="form-label">
                  Phone
                </label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+1234567890"
                  className={errors.phone ? 'border-red-500' : ''}
                />
                {errors.phone && (
                  <p className="text-error text-sm mt-1">{errors.phone}</p>
                )}
              </div>
            </div>

            {/* Position */}
            <div>
              <label className="form-label">Position</label>
              <Input
                value={formData.position}
                onChange={(e) => handleChange('position', e.target.value)}
                placeholder="e.g. Senior Support Engineer"
              />
            </div>

            {/* Role & Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">Role</label>
                <CustomSelect
                  value={formData.role}
                  onChange={(val) => setFormData((prev) => ({ ...prev, role: val as ConsultantRole }))}
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
                  value={formData.status}
                  onChange={(val) => setFormData((prev) => ({ ...prev, status: val as any }))}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                    { value: 'on_leave', label: 'On Leave' },
                  ]}
                />
              </div>
            </div>

            {/* Monthly Target Hours */}
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
                className={errors.password ? 'border-red-500' : ''}
              />
              {errors.password && (
                <p className="text-error text-sm mt-1">{errors.password}</p>
              )}
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
                    Create Consultant
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/consultants')}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
