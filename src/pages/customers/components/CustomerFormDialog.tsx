import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomSelect } from '@/components/ui/custom-select';
import { Loader2, Building2, Mail, MapPin, Database, Plus, Users } from 'lucide-react';
import { ConsultantSelect } from '@/components/ui/consultant-select';
import { MultiSelect } from '@/components/ui/multi-select';
import type { CreateCustomerData, Customer, UpdateCustomerData } from '@/types/customer.types';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchErpTypes, createErpType } from '@/redux/slices/erpTypeSlice';
import { fetchVersionNumbers, createVersionNumber } from '@/redux/slices/versionNumberSlice';
import { fetchConsultants } from '@/redux/slices/consultantSlice';
import { fetchCompanies } from '@/redux/slices/companySlice';
import { fetchProductTypes } from '@/redux/slices/productTypeSlice';
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
  const { companies } = useAppSelector((state) => state.companies);
  const { productTypes } = useAppSelector((state) => state.productTypes);

  const isEditMode = !!customer;

  const [formData, setFormData] = useState({
    company: '',
    contactPerson: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    status: 'active' as 'active' | 'inactive' | 'suspended' | 'pending',
    erpType: '',
    versionNumber: '',
    consultants: [] as string[],
    productTypes: [] as string[],
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
    dispatch(fetchConsultants({ status: 'active', limit: 500 }));
    dispatch(fetchCompanies({ isActive: true }));
    dispatch(fetchProductTypes({ isActive: true }));
  }, [dispatch]);

  useEffect(() => {
    if (customer && isEditMode) {
      const consultantIds = Array.isArray(customer.consultants)
        ? customer.consultants.map((c: any) => typeof c === 'string' ? c : c._id)
        : [];

      const productTypeIds = Array.isArray(customer.productTypes)
        ? customer.productTypes.map((pt: any) => typeof pt === 'string' ? pt : pt._id)
        : [];

      setFormData({
        company: (typeof customer.company === 'string' ? customer.company : customer.company?._id) || '',
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
        productTypes: productTypeIds,
      });
    } else {
      setFormData({
        company: '',
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
        productTypes: [],
      });
    }
    setErrors({});
  }, [customer, isEditMode, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.company) {
      newErrors.company = 'Company is required';
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

    const selectedCompany = companies.find((c) => c._id === formData.company);
    const companyName = selectedCompany?.name || '';

    if (isEditMode) {
      const submitData: UpdateCustomerData = {
        company: formData.company,
        companyName,
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
      submitData.productTypes = formData.productTypes;

      await onSubmit(submitData);
    } else {
      const submitData: CreateCustomerData = {
        company: formData.company,
        companyName,
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
      submitData.productTypes = formData.productTypes;

      await onSubmit(submitData);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="form-dialog-content max-w-2xl max-h-[90vh] overflow-y-auto">
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
              <h3 className="form-section-title flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand-600" />
                Company Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="form-label">
                    Company <span className="text-error">*</span>
                  </label>
                  <CustomSelect
                    value={formData.company}
                    onChange={(val) => {
                      setFormData((prev) => ({ ...prev, company: val }));
                      if (errors.company) setErrors((prev) => ({ ...prev, company: '' }));
                    }}
                    placeholder="Select a company"
                    className={errors.company ? 'ring-[2px] ring-error/30' : ''}
                    options={[
                      { value: '', label: 'Select a company' },
                      ...companies
                        .filter((c) => c.isActive)
                        .map((c) => ({ value: c._id, label: c.name })),
                    ]}
                  />
                  {errors.company && (
                    <p className="text-error text-sm">{errors.company}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="form-label">
                    Contact Person <span className="text-error">*</span>
                  </label>
                  <Input
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleChange}
                    placeholder="Enter contact person name"
                    className={errors.contactPerson ? 'ring-[2px] ring-error/30' : ''}
                  />
                  {errors.contactPerson && (
                    <p className="text-error text-sm">{errors.contactPerson}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="form-section-title flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-600" />
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="form-label">
                    Email <span className="text-error">*</span>
                  </label>
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter email address"
                    className={errors.email ? 'ring-[2px] ring-error/30' : ''}
                  />
                  {errors.email && (
                    <p className="text-error text-sm">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="form-label">
                    Phone <span className="text-error">*</span>
                  </label>
                  <Input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1234567890"
                    className={errors.phone ? 'ring-[2px] ring-error/30' : ''}
                  />
                  {errors.phone && (
                    <p className="text-error text-sm">{errors.phone}</p>
                  )}
                </div>

                {!isEditMode && (
                  <div className="space-y-2">
                    <label className="form-label">
                      Password <span className="text-error">*</span>
                    </label>
                    <Input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter password (min. 8 characters)"
                      className={errors.password ? 'ring-[2px] ring-error/30' : ''}
                    />
                    {errors.password && (
                      <p className="text-error text-sm">{errors.password}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* System Information */}
            <div className="space-y-4">
              <h3 className="form-section-title flex items-center gap-2">
                <Database className="w-5 h-5 text-green-600" />
                System Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="form-label">ERP Type</label>
                  <CustomSelect
                      value={formData.erpType}
                      onChange={(val) => setFormData((prev) => ({ ...prev, erpType: val }))}
                      placeholder="Select ERP Type"
                      options={[
                        { value: '', label: 'Select ERP Type' },
                        ...erpTypes
                          .filter((erp) => erp.isActive)
                          .map((erp) => ({ value: erp._id, label: erp.name })),
                      ]}
                    />
                </div>

                <div className="space-y-2">
                  <label className="form-label">Version Number</label>
                  <CustomSelect
                      value={formData.versionNumber}
                      onChange={(val) => setFormData((prev) => ({ ...prev, versionNumber: val }))}
                      placeholder="Select Version Number"
                      options={[
                        { value: '', label: 'Select Version Number' },
                        ...versionNumbers
                          .filter((version) => version.isActive)
                          .map((version) => ({ value: version._id, label: version.name })),
                      ]}
                    />
                </div>

                <div className="space-y-2">
                  <label className="form-label">Product Types</label>
                  <MultiSelect
                    items={productTypes.filter((pt) => pt.isActive)}
                    value={formData.productTypes}
                    onChange={(vals) => setFormData((prev) => ({ ...prev, productTypes: vals }))}
                    placeholder="Select product types..."
                    searchPlaceholder="Search product types..."
                    emptyMessage="No product types found"
                  />
                </div>

              </div>
            </div>

            {/* Consultant Assignment */}
            <div className="space-y-4">
              <h3 className="form-section-title flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-600" />
                Assign Consultants
              </h3>
              <div className="space-y-2">
                <label className="form-label">Select Consultants</label>
                <ConsultantSelect
                  multiple
                  value={formData.consultants}
                  onChange={(vals) => setFormData((prev) => ({ ...prev, consultants: vals }))}
                  consultants={consultants.filter((c) => c.status === 'active')}
                  placeholder="Search and select consultants…"
                />
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h3 className="form-section-title flex items-center gap-2">
                <MapPin className="w-5 h-5 text-accent-orange-600" />
                Address Information
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="form-label">Street Address</label>
                  <Input
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Enter street address"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="form-label">City</label>
                    <Input
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="Enter city"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="form-label">Country</label>
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
                <label className="form-label">Status</label>
                <CustomSelect
                  value={formData.status}
                  onChange={(val) => setFormData((prev) => ({ ...prev, status: val as 'active' | 'inactive' | 'suspended' | 'pending' }))}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                    { value: 'suspended', label: 'Suspended' },
                  ]}
                />
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
    </>
  );
}
