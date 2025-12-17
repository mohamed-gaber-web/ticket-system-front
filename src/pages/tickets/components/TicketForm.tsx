import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Ticket, CreateTicketData, UpdateTicketData } from '@/types/ticket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchCustomers } from '@/redux/slices/customerSlice';
import { fetchCategories } from '@/redux/slices/categorySlice';
import { fetchEnvironments } from '@/redux/slices/environmentSlice';
import { fetchFeatures } from '@/redux/slices/featureSlice';
import { fetchDepartments } from '@/redux/slices/departmentSlice';
import { fetchProductTypes } from '@/redux/slices/productTypeSlice';
import { fetchServiceTypes } from '@/redux/slices/serviceTypeSlice';
import { fetchScopes } from '@/redux/slices/scopeSlice';
import { UserPlus, Upload, X, File, Image as ImageIcon, Video } from 'lucide-react';
import { validateFile, formatFileSize } from '@/api/attachmentApi';

interface Props {
  initialData?: Ticket;
  onSubmit: (data: CreateTicketData | UpdateTicketData, attachments?: File[]) => void;
  isEdit?: boolean;
}

// Generate a unique ticket number
const generateTicketNumber = () => {
  const prefix = 'TKT';
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${timestamp}-${random}`;
};

export default function TicketForm({ initialData, onSubmit, isEdit = false }: Props) {
  const dispatch = useAppDispatch();
  const { categories, loading: categoriesLoading } = useAppSelector((state) => state.categories);
  const { customers, loading: customersLoading } = useAppSelector((state) => state.customers);
  const { environments } = useAppSelector((state) => state.environments);
  const { features } = useAppSelector((state) => state.features);
  const { departments } = useAppSelector((state) => state.departments);
  const { productTypes } = useAppSelector((state) => state.productTypes);
  const { serviceTypes } = useAppSelector((state) => state.serviceTypes);
  const { scopes } = useAppSelector((state) => state.scopes);
  const { user, userType } = useAppSelector((state) => state.auth);

  // Get customer ID - if consultant, leave empty for selection; if customer, use their ID
  const isConsultant = userType === 'consultant';
  const customerId = isConsultant ? '' : (user?._id || '');

  const [formData, setFormData] = useState<CreateTicketData | UpdateTicketData>(
    isEdit
      ? {
          subject: '',
          description: '',
          category: '',
          priority: 'medium',
          status: 'new',
          startDate: '',
          endDate: '',
          estimatedTime: undefined,
          environment: '',
          feature: '',
          department: '',
          productType: '',
          serviceType: '',
          scope: '',
        }
      : {
          ticketNumber: generateTicketNumber(),
          customer: customerId,
          subject: '',
          description: '',
          category: '',
          priority: 'medium',
          startDate: '',
          endDate: '',
          estimatedTime: undefined,
          environment: '',
          feature: '',
          department: '',
          productType: '',
          serviceType: '',
          scope: '',
        }
  );

  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch categories
    dispatch(fetchCategories());
    // Fetch customers if user is a consultant
    if (isConsultant) {
      dispatch(fetchCustomers());
    }
    // Fetch all reference data for the new properties
    dispatch(fetchEnvironments({ isActive: true }));
    dispatch(fetchFeatures({ isActive: true }));
    dispatch(fetchDepartments({ isActive: true }));
    dispatch(fetchProductTypes({ isActive: true }));
    dispatch(fetchServiceTypes({ isActive: true }));
    dispatch(fetchScopes({ isActive: true }));
  }, [dispatch, isConsultant]);

  // Update customer ID when user is loaded
  useEffect(() => {
    if (customerId && !isEdit) {
      setFormData((prev) => ({
        ...prev,
        customer: customerId,
      } as CreateTicketData));
    }
  }, [customerId, isEdit]);

  useEffect(() => {
    if (initialData) {
      const categoryId = typeof initialData.category === 'string'
        ? initialData.category
        : initialData.category?._id || '';

      // Helper function to extract ID from string or object
      const extractId = (field: string | { _id: string } | undefined): string => {
        if (!field) return '';
        return typeof field === 'string' ? field : field._id || '';
      };

      if (isEdit) {
        setFormData({
          subject: initialData.subject,
          description: initialData.description,
          category: categoryId,
          priority: initialData.priority,
          status: initialData.status,
          startDate: initialData.startDate || '',
          endDate: initialData.endDate || '',
          estimatedTime: initialData.estimatedTime,
          environment: extractId(initialData.environment),
          feature: extractId(initialData.feature),
          department: extractId(initialData.department),
          productType: extractId(initialData.productType),
          serviceType: extractId(initialData.serviceType),
          scope: extractId(initialData.scope),
        });
      } else {
        setFormData({
          ticketNumber: initialData.ticketNumber || generateTicketNumber(),
          customer: customerId,
          subject: initialData.subject,
          description: initialData.description,
          category: categoryId,
          priority: initialData.priority,
          startDate: initialData.startDate || '',
          endDate: initialData.endDate || '',
          estimatedTime: initialData.estimatedTime,
          environment: extractId(initialData.environment),
          feature: extractId(initialData.feature),
          department: extractId(initialData.department),
          productType: extractId(initialData.productType),
          serviceType: extractId(initialData.serviceType),
          scope: extractId(initialData.scope),
        });
      }
    }
  }, [initialData, isEdit, customerId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setAttachmentError(null);
    const newFiles: File[] = [];
    const errors: string[] = [];

    Array.from(files).forEach((file) => {
      const validation = validateFile(file);
      if (validation.valid) {
        newFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    });

    if (errors.length > 0) {
      setAttachmentError(errors.join('; '));
    }

    if (newFiles.length > 0) {
      setAttachments([...attachments, ...newFiles]);
    }

    // Reset input
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-blue-500" />;
    if (fileType.startsWith('video/')) return <Video className="h-5 w-5 text-purple-500" />;
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation for create mode
    if (!isEdit) {
      const createData = formData as CreateTicketData;
      if (!createData.customer) {
        alert('Customer information is missing. Please refresh the page and try again.');
        return;
      }
      console.log('Submitting ticket with data:', createData);
    }

    // Clean up empty optional fields before submitting
    const cleanedData = Object.fromEntries(
      Object.entries(formData).filter(([_, value]) => value !== '' && value !== undefined)
    );

    onSubmit(cleanedData as CreateTicketData | UpdateTicketData, attachments);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6 bg-white rounded-lg shadow">
      {/* BASIC INFORMATION SECTION */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer Selection - Only for Consultants */}
          {isConsultant && !isEdit && (
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Customer *</label>
                <Link
                  to="/customers/create"
                  onClick={() => sessionStorage.setItem('customerCreateReferrer', 'ticket-create')}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <UserPlus className="h-4 w-4" />
                  Add New Customer
                </Link>
              </div>
              <select
                name="customer"
                value={(formData as CreateTicketData).customer || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={customersLoading}
              >
                <option value="">
                  {customersLoading ? 'Loading customers...' : 'Select a customer'}
                </option>
                {customers.map((customer) => (
                  <option key={customer._id} value={customer._id}>
                    {customer.companyName} - {customer.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">Subject *</label>
            <Input
              name="subject"
              value={formData.subject || ''}
              onChange={handleChange}
              placeholder="Brief description of the issue"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">Description *</label>
            <textarea
              name="description"
              value={formData.description || ''}
              onChange={handleChange}
              placeholder="Detailed description of the ticket"
              required
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Attachments Upload */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">Attachments</label>
            <div className="space-y-3">
              {/* Upload Button */}
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*,video/*,application/pdf"
                  onChange={handleFileChange}
                  multiple
                  className="hidden"
                  id="attachment-upload"
                />
                <label htmlFor="attachment-upload">
                  <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => document.getElementById('attachment-upload')?.click()}
                    asChild
                  >
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Choose Files
                    </span>
                  </Button>
                </label>
                <span className="text-xs text-gray-500">
                  Images (5MB), Videos (50MB), PDF (10MB)
                </span>
              </div>

              {/* Error Message */}
              {attachmentError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
                  {attachmentError}
                </div>
              )}

              {/* Attached Files List */}
              {attachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    Selected Files ({attachments.length})
                  </p>
                  <div className="space-y-2">
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border"
                      >
                        {getFileIcon(file.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(index)}
                        >
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CATEGORIZATION SECTION */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Categorization</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Category *</label>
            <select
              name="category"
              value={formData.category || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={categoriesLoading}
            >
              <option value="">
                {categoriesLoading ? 'Loading categories...' : 'Select a category'}
              </option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Priority *</label>
            <select
              name="priority"
              value={formData.priority || 'medium'}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {isEdit && (
            <div>
              <label className="block text-sm font-medium mb-2">Status *</label>
              <select
                name="status"
                value={(formData as UpdateTicketData).status || 'new'}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="new">New</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          )}

          {/* NEW OPTIONAL FIELDS */}
          <div>
            <label className="block text-sm font-medium mb-2">Environment</label>
            <select
              name="environment"
              value={formData.environment || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Environment --</option>
              {environments?.filter(env => env.isActive).map((env) => (
                <option key={env._id} value={env._id}>
                  {env.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Feature</label>
            <select
              name="feature"
              value={formData.feature || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Feature --</option>
              {features?.filter(f => f.isActive).map((feature) => (
                <option key={feature._id} value={feature._id}>
                  {feature.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Department</label>
            <select
              name="department"
              value={formData.department || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Department --</option>
              {departments?.filter(d => d.isActive).map((dept) => (
                <option key={dept._id} value={dept._id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Product Type</label>
            <select
              name="productType"
              value={formData.productType || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Product Type --</option>
              {productTypes?.filter(pt => pt.isActive).map((type) => (
                <option key={type._id} value={type._id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Service Type</label>
            <select
              name="serviceType"
              value={formData.serviceType || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Service Type --</option>
              {serviceTypes?.filter(st => st.isActive).map((type) => (
                <option key={type._id} value={type._id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Scope</label>
            <select
              name="scope"
              value={formData.scope || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Scope --</option>
              {scopes?.filter(s => s.isActive).map((scope) => (
                <option key={scope._id} value={scope._id}>
                  {scope.name}
                </option>
              ))}
            </select>
          </div>
          {/* END NEW FIELDS */}
        </div>
      </div>

      {/* TIMELINE & PLANNING SECTION - Only for Consultants */}
      {isConsultant && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Timeline & Planning</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Start Date</label>
              <Input
                type="date"
                name="startDate"
                value={formData.startDate || ''}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">End Date</label>
              <Input
                type="date"
                name="endDate"
                value={formData.endDate || ''}
                onChange={handleChange}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Estimated Time (hours)</label>
              <Input
                type="number"
                name="estimatedTime"
                value={formData.estimatedTime || ''}
                onChange={handleChange}
                placeholder="Enter estimated time in hours"
                min="0"
                step="0.5"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4 border-t">
        <Button type="submit" className="bg-blue-500 text-white hover:bg-blue-600 font-semibold">
          {isEdit ? 'Update Ticket' : 'Create Ticket'}
        </Button>
      </div>
    </form>
  );
}
