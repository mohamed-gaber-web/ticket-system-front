import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomSelect } from '@/components/ui/custom-select';
import { Loader2, Building2, User, Mail, Phone, MapPin, Lock, Database, Plus, Users } from 'lucide-react';
import { ConsultantSelect } from '@/components/ui/consultant-select';
import type { CreateCustomerData, Customer, UpdateCustomerData } from '@/types/customer.types';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchErpTypes, createErpType } from '@/redux/slices/erpTypeSlice';
import { fetchVersionNumbers, createVersionNumber } from '@/redux/slices/versionNumberSlice';
import { fetchConsultants } from '@/redux/slices/consultantSlice';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CustomerFormProps {
  customer?: Customer | null;
  onSubmit: (data: CreateCustomerData | UpdateCustomerData) => Promise<void>;
  isLoading: boolean;
  isEditMode?: boolean;
}

export default function CustomerForm({ customer, onSubmit, isLoading, isEditMode = false }: CustomerFormProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { erpTypes } = useAppSelector((state) => state.erpTypes);
  const { versionNumbers } = useAppSelector((state) => state.versionNumbers);
  const { consultants } = useAppSelector((state) => state.consultants);

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
    erpType: '',
    versionNumber: '',
    consultants: [] as string[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showErpTypeDialog, setShowErpTypeDialog] = useState(false);
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [newErpTypeName, setNewErpTypeName] = useState('');
  const [newVersionName, setNewVersionName] = useState('');
  const [isCreatingErpType, setIsCreatingErpType] = useState(false);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);

  useEffect(() => {
    dispatch(fetchErpTypes({ isActive: true }));
    dispatch(fetchVersionNumbers({ isActive: true }));
    dispatch(fetchConsultants({ status: 'active' }));
  }, [dispatch]);

  useEffect(() => {
    if (customer && isEditMode) {
      const consultantIds = Array.isArray(customer.consultants)
        ? customer.consultants.map((c: any) => typeof c === 'string' ? c : c._id)
        : [];

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
        erpType: (typeof customer.erpType === 'string' ? customer.erpType : customer.erpType?._id) || '',
        versionNumber: (typeof customer.versionNumber === 'string' ? customer.versionNumber : customer.versionNumber?._id) || '',
        consultants: consultantIds,
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

  const handleCreateErpType = async () => {
    if (!newErpTypeName.trim()) return;

    setIsCreatingErpType(true);
    try {
      const result = await dispatch(createErpType({ name: newErpTypeName, isActive: true })).unwrap();
      setFormData((prev) => ({ ...prev, erpType: result._id }));
      setNewErpTypeName('');
      setShowErpTypeDialog(false);
      dispatch(fetchErpTypes({ isActive: true }));
    } catch (error) {
      console.error('Failed to create ERP type:', error);
    } finally {
      setIsCreatingErpType(false);
    }
  };

  const handleCreateVersionNumber = async () => {
    if (!newVersionName.trim()) return;

    setIsCreatingVersion(true);
    try {
      const result = await dispatch(createVersionNumber({ name: newVersionName, isActive: true })).unwrap();
      setFormData((prev) => ({ ...prev, versionNumber: result._id }));
      setNewVersionName('');
      setShowVersionDialog(false);
      dispatch(fetchVersionNumbers({ isActive: true }));
    } catch (error) {
      console.error('Failed to create version number:', error);
    } finally {
      setIsCreatingVersion(false);
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
      if (formData.erpType) submitData.erpType = formData.erpType;
      if (formData.versionNumber) submitData.versionNumber = formData.versionNumber;
      if (formData.consultants.length > 0) submitData.consultants = formData.consultants;

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
      if (formData.erpType) submitData.erpType = formData.erpType;
      if (formData.versionNumber) submitData.versionNumber = formData.versionNumber;
      if (formData.consultants.length > 0) submitData.consultants = formData.consultants;

      await onSubmit(submitData);
    }
  };

  return (
    <div className="form-card">
      <div className="border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-[1rem] py-8 px-8">
        <h2 className="text-3xl font-bold flex items-center gap-3">
          <Building2 className="w-8 h-8" />
          {isEditMode ? 'Edit Customer' : 'Create New Customer'}
        </h2>
        <p className="text-blue-100 mt-2 text-sm">
          {isEditMode ? 'Update customer information below' : 'Fill in the details to add a new customer'}
        </p>
      </div>
      <div className="p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-6">
            <div className="form-section-title flex items-center gap-3">
              <div className="p-2 bg-brand-100 rounded-lg">
                <Building2 className="w-5 h-5 text-brand-600" />
              </div>
              Company Information
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="form-label flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-brand-600" />
                  Company Name <span className="text-error">*</span>
                </label>
                <Input
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="Enter company name"
                  className={`h-11 ${errors.companyName ? 'ring-[2px] ring-error/30' : ''}`}
                />
                {errors.companyName && (
                  <p className="text-error text-sm font-medium flex items-center gap-1">
                    {errors.companyName}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="form-label flex items-center gap-2">
                  <User className="w-4 h-4 text-brand-600" />
                  Contact Person <span className="text-error">*</span>
                </label>
                <Input
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleChange}
                  placeholder="Enter contact person name"
                  className={`h-11 ${errors.contactPerson ? 'ring-[2px] ring-error/30' : ''}`}
                />
                {errors.contactPerson && (
                  <p className="text-error text-sm font-medium flex items-center gap-1">
                    {errors.contactPerson}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="form-section-title flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Mail className="w-5 h-5 text-indigo-600" />
              </div>
              Contact Information
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="form-label flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-600" />
                  Email <span className="text-error">*</span>
                </label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter email address"
                  className={`h-11 ${errors.email ? 'ring-[2px] ring-error/30' : ''}`}
                />
                {errors.email && (
                  <p className="text-error text-sm font-medium flex items-center gap-1">
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="form-label flex items-center gap-2">
                  <Phone className="w-4 h-4 text-indigo-600" />
                  Phone <span className="text-error">*</span>
                </label>
                <Input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1234567890"
                  className={`h-11 ${errors.phone ? 'ring-[2px] ring-error/30' : ''}`}
                />
                {errors.phone && (
                  <p className="text-error text-sm font-medium flex items-center gap-1">
                    {errors.phone}
                  </p>
                )}
              </div>
            </div>

            {!isEditMode && (
              <div className="space-y-2">
                <label className="form-label flex items-center gap-2">
                  <Lock className="w-4 h-4 text-indigo-600" />
                  Password <span className="text-error">*</span>
                </label>
                <Input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter password (min. 8 characters)"
                  className={`h-11 ${errors.password ? 'ring-[2px] ring-error/30' : ''}`}
                />
                {errors.password && (
                  <p className="text-error text-sm font-medium flex items-center gap-1">
                    {errors.password}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="form-section-title flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Database className="w-5 h-5 text-green-600" />
              </div>
              System Information
              <span className="text-sm text-on-surface-variant font-normal">(Optional)</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="form-label flex items-center gap-2">
                  <Database className="w-4 h-4 text-green-600" />
                  ERP Type
                </label>
                <div className="flex gap-2">
                  <CustomSelect
                    value={formData.erpType}
                    onChange={(val) => setFormData((prev) => ({ ...prev, erpType: val }))}
                    placeholder="Select ERP Type"
                    className="flex-1"
                    options={[
                      { value: '', label: 'Select ERP Type' },
                      ...erpTypes
                        .filter((erp) => erp.isActive)
                        .map((erp) => ({ value: erp._id, label: erp.name })),
                    ]}
                  />
                  <Button
                    type="button"
                    onClick={() => setShowErpTypeDialog(true)}
                    variant="outline"
                    className="h-11 px-4"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="form-label flex items-center gap-2">
                  <Database className="w-4 h-4 text-green-600" />
                  Version Number
                </label>
                <div className="flex gap-2">
                  <CustomSelect
                    value={formData.versionNumber}
                    onChange={(val) => setFormData((prev) => ({ ...prev, versionNumber: val }))}
                    placeholder="Select Version Number"
                    className="flex-1"
                    options={[
                      { value: '', label: 'Select Version Number' },
                      ...versionNumbers
                        .filter((version) => version.isActive)
                        .map((version) => ({ value: version._id, label: version.name })),
                    ]}
                  />
                  <Button
                    type="button"
                    onClick={() => setShowVersionDialog(true)}
                    variant="outline"
                    className="h-11 px-4"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Consultant Assignment Section */}
          <div className="space-y-6">
            <div className="form-section-title flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Users className="w-5 h-5 text-orange-600" />
              </div>
              Assign Consultants
              <span className="text-sm text-on-surface-variant font-normal">(Optional)</span>
            </div>

            <div className="space-y-2">
              <label className="form-label flex items-center gap-2">
                <Users className="w-4 h-4 text-orange-600" />
                Select Consultants to work with this customer
              </label>
              <ConsultantSelect
                multiple
                value={formData.consultants}
                onChange={(vals) => setFormData((prev) => ({ ...prev, consultants: vals }))}
                consultants={consultants.filter((c) => c.status === 'active')}
                placeholder="Search and select consultants…"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="form-section-title flex items-center gap-3">
              <div className="p-2 bg-accent-orange-100 rounded-lg">
                <MapPin className="w-5 h-5 text-accent-orange-600" />
              </div>
              Address Information
              <span className="text-sm text-on-surface-variant font-normal">(Optional)</span>
            </div>

            <div className="space-y-2">
              <label className="form-label flex items-center gap-2">
                <MapPin className="w-4 h-4 text-accent-orange-600" />
                Street Address
              </label>
              <Input
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Enter street address"
                className="h-11"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="form-label">City</label>
                <Input
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Enter city"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <label className="form-label">Country</label>
                <Input
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="Enter country"
                  className="h-11"
                />
              </div>
            </div>
          </div>

          {isEditMode && (
            <div className="space-y-2">
              <label className="form-label">Status</label>
              <CustomSelect
                value={formData.status}
                onChange={(val) => setFormData((prev) => ({ ...prev, status: val as 'active' | 'inactive' | 'suspended' }))}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'suspended', label: 'Suspended' },
                ]}
              />
            </div>
          )}

          <div className="flex gap-4 justify-end pt-6">
            <div className="h-px bg-surface-container-high w-full absolute left-0" style={{ marginTop: '-1.5rem' }} />
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/customers')}
              disabled={isLoading}
              className="h-11 px-8"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="h-11 px-8"
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
      </div>

      {/* ERP Type Dialog */}
      <Dialog open={showErpTypeDialog} onOpenChange={setShowErpTypeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New ERP Type</DialogTitle>
            <DialogDescription>
              Create a new ERP type to add to your customer profile.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="form-label">ERP Type Name</label>
              <Input
                value={newErpTypeName}
                onChange={(e) => setNewErpTypeName(e.target.value)}
                placeholder="Enter ERP type name"
                onKeyPress={(e) => e.key === 'Enter' && handleCreateErpType()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowErpTypeDialog(false);
                setNewErpTypeName('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateErpType}
              disabled={isCreatingErpType || !newErpTypeName.trim()}
            >
              {isCreatingErpType ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version Number Dialog */}
      <Dialog open={showVersionDialog} onOpenChange={setShowVersionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Version Number</DialogTitle>
            <DialogDescription>
              Create a new version number to add to your customer profile.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="form-label">Version Number</label>
              <Input
                value={newVersionName}
                onChange={(e) => setNewVersionName(e.target.value)}
                placeholder="Enter version number"
                onKeyPress={(e) => e.key === 'Enter' && handleCreateVersionNumber()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowVersionDialog(false);
                setNewVersionName('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateVersionNumber}
              disabled={isCreatingVersion || !newVersionName.trim()}
            >
              {isCreatingVersion ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
