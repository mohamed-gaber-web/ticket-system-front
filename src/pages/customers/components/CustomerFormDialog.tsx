import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Building2, Mail, MapPin, Database, Plus, Users } from 'lucide-react';
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

interface CustomerFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCustomerData | UpdateCustomerData) => Promise<void>;
  customer?: Customer | null;
  loading: boolean;
}

export default function CustomerFormDialog({
  isOpen,
  onClose,
  onSubmit,
  customer,
  loading,
}: CustomerFormDialogProps) {
  const dispatch = useAppDispatch();
  const { erpTypes } = useAppSelector((state) => state.erpTypes);
  const { versionNumbers } = useAppSelector((state) => state.versionNumbers);
  const { consultants } = useAppSelector((state) => state.consultants);

  const isEditMode = !!customer;

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
        erpType: typeof customer.erpType === 'string' ? customer.erpType : customer.erpType?._id || '',
        versionNumber: typeof customer.versionNumber === 'string' ? customer.versionNumber : customer.versionNumber?._id || '',
        consultants: consultantIds,
      });
    } else {
      setFormData({
        companyName: '',
        contactPerson: '',
        email: '',
        password: '',
        phone: '',
        address: '',
        city: '',
        country: '',
        status: 'active',
        erpType: '',
        versionNumber: '',
        consultants: [],
      });
    }
    setErrors({});
  }, [customer, isEditMode, isOpen]);

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
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {isEditMode ? 'Edit Customer' : 'Create New Customer'}
            </DialogTitle>
            <DialogDescription>
              {isEditMode ? 'Update customer information below' : 'Fill in the details to add a new customer'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Company Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="Enter company name"
                    className={errors.companyName ? 'border-red-500' : ''}
                  />
                  {errors.companyName && (
                    <p className="text-red-500 text-sm">{errors.companyName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Contact Person <span className="text-red-500">*</span>
                  </label>
                  <Input
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleChange}
                    placeholder="Enter contact person name"
                    className={errors.contactPerson ? 'border-red-500' : ''}
                  />
                  {errors.contactPerson && (
                    <p className="text-red-500 text-sm">{errors.contactPerson}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-600" />
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter email address"
                    className={errors.email ? 'border-red-500' : ''}
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1234567890"
                    className={errors.phone ? 'border-red-500' : ''}
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-sm">{errors.phone}</p>
                  )}
                </div>

                {!isEditMode && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter password (min. 8 characters)"
                      className={errors.password ? 'border-red-500' : ''}
                    />
                    {errors.password && (
                      <p className="text-red-500 text-sm">{errors.password}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* System Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-green-600" />
                System Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">ERP Type</label>
                  <div className="flex gap-2">
                    <select
                      name="erpType"
                      value={formData.erpType}
                      onChange={handleChange}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select ERP Type</option>
                      {erpTypes
                        .filter((erp) => erp.isActive)
                        .map((erp) => (
                          <option key={erp._id} value={erp._id}>
                            {erp.name}
                          </option>
                        ))}
                    </select>
                    <Button
                      type="button"
                      onClick={() => setShowErpTypeDialog(true)}
                      variant="outline"
                      size="sm"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Version Number</label>
                  <div className="flex gap-2">
                    <select
                      name="versionNumber"
                      value={formData.versionNumber}
                      onChange={handleChange}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Version Number</option>
                      {versionNumbers
                        .filter((version) => version.isActive)
                        .map((version) => (
                          <option key={version._id} value={version._id}>
                            {version.name}
                          </option>
                        ))}
                    </select>
                    <Button
                      type="button"
                      onClick={() => setShowVersionDialog(true)}
                      variant="outline"
                      size="sm"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Consultant Assignment */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-600" />
                Assign Consultants
              </h3>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Select Consultants</label>
                <select
                  multiple
                  size={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={formData.consultants}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                    setFormData(prev => ({ ...prev, consultants: selected }));
                  }}
                >
                  {consultants
                    .filter(c => c.status === 'active')
                    .map((consultant) => (
                      <option key={consultant._id} value={consultant._id}>
                        {consultant.fullName || `${consultant.firstName} ${consultant.lastName}`}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-gray-500">Hold Ctrl (or Cmd) to select multiple consultants</p>
                {formData.consultants.length > 0 && (
                  <p className="text-sm text-orange-600 font-medium">
                    {formData.consultants.length} consultant{formData.consultants.length > 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-purple-600" />
                Address Information
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Street Address</label>
                  <Input
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Enter street address"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">City</label>
                    <Input
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="Enter city"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Country</label>
                    <Input
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      placeholder="Enter country"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Status (Edit Mode Only) */}
            {isEditMode && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditMode ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>{isEditMode ? 'Update Customer' : 'Create Customer'}</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
              <label className="text-sm font-semibold text-gray-700">ERP Type Name</label>
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
              <label className="text-sm font-semibold text-gray-700">Version Number</label>
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
    </>
  );
}
