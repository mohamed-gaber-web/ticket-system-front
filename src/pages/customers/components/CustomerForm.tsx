import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Building2, User, Mail, Phone, MapPin, Lock } from 'lucide-react';
import type { CreateCustomerData, Customer, UpdateCustomerData } from '@/types/customer.types';

interface CustomerFormProps {
  customer?: Customer | null;
  onSubmit: (data: CreateCustomerData | UpdateCustomerData) => Promise<void>;
  isLoading: boolean;
  isEditMode?: boolean;
}

export default function CustomerForm({ customer, onSubmit, isLoading, isEditMode = false }: CustomerFormProps) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    status: 'active' as 'active' | 'inactive' | 'suspended',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (customer && isEditMode) {
      setFormData({
        companyName: customer.companyName || '',
        contactPerson: customer.contactPerson || '',
        email: customer.email || '',
        password: '',
        phone: customer.phone || '',
        address: customer.address || '',
        city: customer.city || '',
        country: customer.country || '',
        status: customer.status || 'active',
      });
    }
  }, [customer, isEditMode]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    } else if (formData.companyName.length < 2) {
      newErrors.companyName = 'Company name must be at least 2 characters';
    }

    if (!formData.contactPerson.trim()) {
      newErrors.contactPerson = 'Contact person is required';
    } else if (formData.contactPerson.length < 2) {
      newErrors.contactPerson = 'Contact person must be at least 2 characters';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!isEditMode) {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      }
    }

    const phoneRegex = /^[\d\s\-+()]+$/;
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!phoneRegex.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format';
    } else if (formData.phone.replace(/[\s\-+()]/g, '').length < 10) {
      newErrors.phone = 'Phone number must be at least 10 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (isEditMode) {
      const submitData: UpdateCustomerData = {
        companyName: formData.companyName,
        contactPerson: formData.contactPerson,
        email: formData.email,
        phone: formData.phone,
        status: formData.status,
      };

      if (formData.address) submitData.address = formData.address;
      if (formData.city) submitData.city = formData.city;
      if (formData.country) submitData.country = formData.country;

      await onSubmit(submitData);
    } else {
      const submitData: CreateCustomerData = {
        companyName: formData.companyName,
        contactPerson: formData.contactPerson,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
      };

      if (formData.address) submitData.address = formData.address;
      if (formData.city) submitData.city = formData.city;
      if (formData.country) submitData.country = formData.country;

      console.log('=== SUBMIT DATA DEBUG ===');
      console.log('Form password:', formData.password);
      console.log('Submit data:', JSON.stringify(submitData, null, 2));
      console.log('Password in submitData:', submitData.password);
      console.log('Password length:', submitData.password?.length);
      console.log('========================');

      await onSubmit(submitData);
    }
  };

  return (
    <Card className="w-full border-none shadow-xl bg-gradient-to-br from-white via-white to-blue-50/30">
      <CardHeader className="border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg py-8">
        <CardTitle className="text-3xl font-bold flex items-center gap-3">
          <Building2 className="w-8 h-8" />
          {isEditMode ? 'Edit Customer' : 'Create New Customer'}
        </CardTitle>
        <p className="text-blue-100 mt-2 text-sm">
          {isEditMode ? 'Update customer information below' : 'Fill in the details to add a new customer'}
        </p>
      </CardHeader>
      <CardContent className="p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b-2 border-blue-600">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Company Information</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  Company Name <span className="text-red-500">*</span>
                </label>
                <Input
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="Enter company name"
                  className={`h-11 border-2 transition-all ${errors.companyName ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'}`}
                />
                {errors.companyName && (
                  <p className="text-red-500 text-sm font-medium flex items-center gap-1">
                    {errors.companyName}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <User className="w-4 h-4 text-blue-600" />
                  Contact Person <span className="text-red-500">*</span>
                </label>
                <Input
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleChange}
                  placeholder="Enter contact person name"
                  className={`h-11 border-2 transition-all ${errors.contactPerson ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'}`}
                />
                {errors.contactPerson && (
                  <p className="text-red-500 text-sm font-medium flex items-center gap-1">
                    {errors.contactPerson}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b-2 border-indigo-600">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Mail className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Contact Information</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Mail className="w-4 h-4 text-indigo-600" />
                  Email <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter email address"
                  className={`h-11 border-2 transition-all ${errors.email ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-indigo-500'}`}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm font-medium flex items-center gap-1">
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Phone className="w-4 h-4 text-indigo-600" />
                  Phone <span className="text-red-500">*</span>
                </label>
                <Input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1234567890"
                  className={`h-11 border-2 transition-all ${errors.phone ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-indigo-500'}`}
                />
                {errors.phone && (
                  <p className="text-red-500 text-sm font-medium flex items-center gap-1">
                    {errors.phone}
                  </p>
                )}
              </div>
            </div>

            {!isEditMode && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Lock className="w-4 h-4 text-indigo-600" />
                  Password <span className="text-red-500">*</span>
                </label>
                <Input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter password (min. 8 characters)"
                  className={`h-11 border-2 transition-all ${errors.password ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-indigo-500'}`}
                />
                {errors.password && (
                  <p className="text-red-500 text-sm font-medium flex items-center gap-1">
                    {errors.password}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b-2 border-purple-600">
              <div className="p-2 bg-purple-100 rounded-lg">
                <MapPin className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Address Information</h3>
              <span className="text-sm text-gray-500 font-normal">(Optional)</span>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <MapPin className="w-4 h-4 text-purple-600" />
                Street Address
              </label>
              <Input
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Enter street address"
                className="h-11 border-2 border-gray-200 focus:border-purple-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">City</label>
                <Input
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Enter city"
                  className="h-11 border-2 border-gray-200 focus:border-purple-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Country</label>
                <Input
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="Enter country"
                  className="h-11 border-2 border-gray-200 focus:border-purple-500 transition-all"
                />
              </div>
            </div>
          </div>

          {isEditMode && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full h-11 px-4 border-2 border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          )}

          <div className="flex gap-4 justify-end pt-6 border-t-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/customers')}
              disabled={isLoading}
              className="h-11 px-8 border-2 hover:bg-gray-100"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="h-11 px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>{isEditMode ? 'Update Customer' : 'Create Customer'}</>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
