import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchConsultantById, updateConsultant, clearCurrentConsultant } from '@/redux/slices/consultantSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save } from 'lucide-react';
import type { UpdateConsultantData, ConsultantRole, ConsultantStatus } from '@/types/consultant.types';

export default function EditConsultant() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentConsultant, loading } = useAppSelector((state) => state.consultants);

  const [formData, setFormData] = useState<UpdateConsultantData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'consultant',
    status: 'active',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (id) {
      dispatch(fetchConsultantById(id));
    }

    return () => {
      dispatch(clearCurrentConsultant());
    };
  }, [id, dispatch]);

  useEffect(() => {
    if (currentConsultant) {
      setFormData({
        firstName: currentConsultant.firstName,
        lastName: currentConsultant.lastName,
        email: currentConsultant.email,
        phone: currentConsultant.phone || '',
        role: currentConsultant.role,
        status: currentConsultant.status,
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
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  if (!currentConsultant) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Consultant not found</p>
          <Button onClick={() => navigate('/consultants')} className="mt-4">
            Back to Consultants
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/consultants')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Consultant</h1>
          <p className="text-gray-600 mt-1">Update consultant information</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Consultant Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => handleChange('role', e.target.value as ConsultantRole)}
                  className="w-full h-11 px-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="consultant">Consultant</option>
                  <option value="senior_consultant">Senior Consultant</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value as ConsultantStatus)}
                  className="w-full h-11 px-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="on_leave">On Leave</option>
                </select>
              </div>
            </div>

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
                    Update Consultant
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/consultants')} disabled={loading}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
