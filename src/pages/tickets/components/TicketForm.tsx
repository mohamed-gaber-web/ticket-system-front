import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Ticket, CreateTicketData, UpdateTicketData } from '@/types/ticket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomSelect } from '@/components/ui/custom-select';
import { MultiSelect } from '@/components/ui/multi-select';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchCustomers } from '@/redux/slices/customerSlice';
import { fetchCategories } from '@/redux/slices/categorySlice';
import { fetchEnvironments } from '@/redux/slices/environmentSlice';
import { fetchCustomizedSolutions } from '@/redux/slices/customizedSolutionSlice';
import { fetchDepartments } from '@/redux/slices/departmentSlice';
import { fetchServiceTypes } from '@/redux/slices/serviceTypeSlice';
import { fetchModules } from '@/redux/slices/moduleSlice';
import { fetchSources } from '@/redux/slices/sourceSlice';
import { UserPlus, Upload, X, File, Image as ImageIcon, Mail, Plus } from 'lucide-react';
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
  const { customizedSolutions } = useAppSelector((state) => state.customizedSolutions);
  const { departments } = useAppSelector((state) => state.departments);
  const { serviceTypes } = useAppSelector((state) => state.serviceTypes);
  const { modules } = useAppSelector((state) => state.modules);
  const { sources } = useAppSelector((state) => state.sources);
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
          environment: '',
          feature: '',
          department: '',
          serviceType: '',
          scope: [],
          source: '',
        }
      : {
          ticketNumber: generateTicketNumber(),
          customer: customerId,
          subject: '',
          description: '',
          category: '',
          priority: 'medium',
          startDate: '',
          environment: '',
          feature: '',
          department: '',
          serviceType: '',
          scope: [],
          source: '',
        }
  );

  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [notifyEmails, setNotifyEmails] = useState<string[]>([]);
  const [notifyEmailInput, setNotifyEmailInput] = useState('');
  const [notifyEmailError, setNotifyEmailError] = useState<string | null>(null);

  // Memoize dropdown options — avoids recreating arrays on every render
  const customerOptions = useMemo(() => [
    { value: '', label: customersLoading ? 'Loading customers...' : 'Select a customer' },
    ...customers.map((c) => ({ value: c._id, label: `${c.companyName} - ${c.email}` })),
  ], [customers, customersLoading]);

  const categoryOptions = useMemo(() => [
    { value: '', label: categoriesLoading ? 'Loading categories...' : 'Select a category' },
    ...categories.map((c) => ({ value: c._id, label: c.name })),
  ], [categories, categoriesLoading]);

  const environmentOptions = useMemo(() => [
    { value: '', label: '-- Select Environment --' },
    ...(environments?.filter(e => e.isActive).map(e => ({ value: e._id, label: e.name })) ?? []),
  ], [environments]);

  const customizedSolutionOptions = useMemo(() => [
    { value: '', label: '-- Select Customized Solution --' },
    ...(customizedSolutions?.filter(f => f.isActive).map(f => ({ value: f._id, label: f.name })) ?? []),
  ], [customizedSolutions]);

  const departmentOptions = useMemo(() => [
    { value: '', label: '-- Select Department --' },
    ...(departments?.filter(d => d.isActive).map(d => ({ value: d._id, label: d.name })) ?? []),
  ], [departments]);

  const serviceTypeOptions = useMemo(() => [
    { value: '', label: '-- Select Service Type --' },
    ...(serviceTypes?.filter(st => st.isActive).map(st => ({ value: st._id, label: st.name })) ?? []),
  ], [serviceTypes]);

  const moduleItems = useMemo(
    () => modules?.filter(m => m.isActive).map(m => ({ _id: m._id, name: m.name })) ?? [],
    [modules]
  );

  const sourceOptions = useMemo(() => [
    { value: '', label: '-- Select Source --' },
    ...(sources?.filter(s => s.isActive).map(s => ({ value: s._id, label: s.name })) ?? []),
  ], [sources]);

  useEffect(() => {
    // Fetch categories
    dispatch(fetchCategories());
    // Fetch customers if user is a consultant
    if (isConsultant) {
      dispatch(fetchCustomers());
    }
    // Fetch all reference data for the new properties
    dispatch(fetchEnvironments({ isActive: true }));
    dispatch(fetchCustomizedSolutions({ isActive: true }));
    dispatch(fetchDepartments({ isActive: true }));
    dispatch(fetchServiceTypes({ isActive: true }));
    dispatch(fetchModules({ isActive: true }));
    dispatch(fetchSources({ isActive: true }));
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

      // Extract IDs from a scope array (each item may be a string or object)
      const extractScopeIds = (field: typeof initialData.scope): string[] => {
        if (!field) return [];
        if (Array.isArray(field)) {
          return field.map(s => (typeof s === 'string' ? s : s._id)).filter(Boolean);
        }
        return [];
      };

      if (isEdit) {
        setFormData({
          subject: initialData.subject,
          description: initialData.description,
          category: categoryId,
          priority: initialData.priority,
          status: initialData.status,
          startDate: initialData.startDate || '',
          environment: extractId(initialData.environment),
          feature: extractId(initialData.feature),
          department: extractId(initialData.department),
          serviceType: extractId(initialData.serviceType),
          scope: extractScopeIds(initialData.scope),
          source: extractId(initialData.source),
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
          environment: extractId(initialData.environment),
          feature: extractId(initialData.feature),
          department: extractId(initialData.department),
          serviceType: extractId(initialData.serviceType),
          scope: extractScopeIds(initialData.scope),
          source: extractId(initialData.source),
        });
      }
    }
  }, [initialData, isEdit, customerId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
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
    if (fileType.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-brand-500" />;
    return <File className="h-5 w-5 text-on-surface-variant" />;
  };

  const addNotifyEmail = () => {
    const email = notifyEmailInput.trim().toLowerCase();
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!email) return;
    if (!emailRegex.test(email)) {
      setNotifyEmailError('Invalid email address');
      return;
    }
    if (notifyEmails.includes(email)) {
      setNotifyEmailError('Email already added');
      return;
    }
    setNotifyEmails([...notifyEmails, email]);
    setNotifyEmailInput('');
    setNotifyEmailError(null);
  };

  const removeNotifyEmail = (email: string) => {
    setNotifyEmails(notifyEmails.filter((e) => e !== email));
  };

  const handleNotifyEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addNotifyEmail();
    }
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
    }

    // Clean up empty optional fields before submitting
    const cleanedData = Object.fromEntries(
      Object.entries(formData).filter(([_, value]) =>
        value !== '' && value !== undefined && !(Array.isArray(value) && value.length === 0)
      )
    );

    const finalData = isEdit
      ? cleanedData
      : { ...cleanedData, notifyEmails };

    onSubmit(finalData as CreateTicketData | UpdateTicketData, attachments);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 form-card">
      {/* BASIC INFORMATION SECTION */}
      <div className="space-y-4">
        <h3 className="form-section-title">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer Selection - Only for Consultants */}
          {isConsultant && !isEdit && (
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="form-label">Customer *</label>
                <Link
                  to="/customers/create"
                  onClick={() => sessionStorage.setItem('customerCreateReferrer', 'ticket-create')}
                  className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1"
                >
                  <UserPlus className="h-4 w-4" />
                  Add New Customer
                </Link>
              </div>
              <CustomSelect
                value={(formData as CreateTicketData).customer || ''}
                onChange={(val) => setFormData({ ...formData, customer: val } as CreateTicketData)}
                placeholder={customersLoading ? 'Loading customers...' : 'Select a customer'}
                disabled={customersLoading}
                options={customerOptions}
              />
            </div>
          )}

          <div className="md:col-span-2">
            <label className="form-label">Subject *</label>
            <Input
              name="subject"
              value={formData.subject || ''}
              onChange={handleChange}
              placeholder="Brief description of the issue"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="form-label">Description *</label>
            <textarea
              name="description"
              value={formData.description || ''}
              onChange={handleChange}
              placeholder="Detailed description of the ticket"
              required
              rows={4}
              className="form-select min-h-[120px] h-auto py-2.5"
            />
          </div>

        </div>
      </div>

      {/* CATEGORIZATION SECTION */}
      <div className="space-y-4">
        <h3 className="form-section-title">Categorization</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Service Type</label>
            <CustomSelect
              value={formData.serviceType || ''}
              onChange={(val) => setFormData({ ...formData, serviceType: val })}
              placeholder="-- Select Service Type --"
              options={serviceTypeOptions}
            />
          </div>

          <div>
            <label className="form-label">Category *</label>
            <CustomSelect
              value={formData.category || ''}
              onChange={(val) => setFormData({ ...formData, category: val })}
              placeholder={categoriesLoading ? 'Loading categories...' : 'Select a category'}
              disabled={categoriesLoading}
              options={categoryOptions}
            />
          </div>

          <div>
            <label className="form-label">Module</label>
            <MultiSelect
              items={moduleItems}
              value={(formData.scope as string[]) ?? []}
              onChange={(val) => setFormData({ ...formData, scope: val })}
              placeholder="-- Select Modules --"
              searchPlaceholder="Search modules..."
            />
          </div>

          <div>
            <label className="form-label">Customized Solution</label>
            <CustomSelect
              value={formData.feature || ''}
              onChange={(val) => setFormData({ ...formData, feature: val })}
              placeholder="-- Select Customized Solution --"
              options={customizedSolutionOptions}
            />
          </div>

          <div>
            <label className="form-label">Priority *</label>
            <CustomSelect
              value={formData.priority || 'medium'}
              onChange={(val) => setFormData({ ...formData, priority: val as 'low' | 'medium' | 'high' | 'critical' })}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'critical', label: 'Critical' },
              ]}
            />
          </div>

          {isEdit && (
            <div>
              <label className="form-label">Status *</label>
              <CustomSelect
                value={(formData as UpdateTicketData).status || 'new'}
                onChange={(val) => setFormData({ ...formData, status: val } as UpdateTicketData)}
                options={[
                  { value: 'new', label: 'New' },
                  { value: 'assigned', label: 'Assigned' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'customer_pending', label: 'Customer Pending' },
                  { value: 'resolved', label: 'Resolved' },
                  { value: 'tested', label: 'Tested' },
                  { value: 'closed', label: 'Closed' },
                  { value: 'delivered', label: 'Delivered' },
                ]}
              />
            </div>
          )}

          <div>
            <label className="form-label">Environment</label>
            <CustomSelect
              value={formData.environment || ''}
              onChange={(val) => setFormData({ ...formData, environment: val })}
              placeholder="-- Select Environment --"
              options={environmentOptions}
            />
          </div>

          <div>
            <label className="form-label">Department</label>
            <CustomSelect
              value={formData.department || ''}
              onChange={(val) => setFormData({ ...formData, department: val })}
              placeholder="-- Select Department --"
              options={departmentOptions}
            />
          </div>

          <div>
            <label className="form-label">Source</label>
            <CustomSelect
              value={formData.source || ''}
              onChange={(val) => setFormData({ ...formData, source: val })}
              placeholder="-- Select Source --"
              options={sourceOptions}
            />
          </div>
        </div>
      </div>

      {/* TIMELINE & PLANNING SECTION - Only for Consultants */}
      {isConsultant && (
        <div className="space-y-4">
          <h3 className="form-section-title">Timeline & Planning</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Start Date</label>
              <Input
                type="date"
                name="startDate"
                value={formData.startDate || ''}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATION EMAILS SECTION - Create mode only */}
      {!isEdit && (
        <div className="space-y-4">
          <h3 className="form-section-title">Notification Emails</h3>
          <p className="text-sm text-on-surface-variant -mt-2">
            Add extra email addresses to be notified when this ticket is created.
          </p>
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant pointer-events-none" />
                <Input
                  type="email"
                  value={notifyEmailInput}
                  onChange={(e) => { setNotifyEmailInput(e.target.value); setNotifyEmailError(null); }}
                  onKeyDown={handleNotifyEmailKeyDown}
                  placeholder="email@example.com"
                  className="pl-9"
                />
              </div>
              <Button type="button" variant="outline" onClick={addNotifyEmail} className="shrink-0">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            {notifyEmailError && (
              <p className="text-sm text-error">{notifyEmailError}</p>
            )}

            {notifyEmails.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {notifyEmails.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-surface-container border border-outline-variant"
                  >
                    <Mail className="h-3.5 w-3.5 text-on-surface-variant" />
                    {email}
                    <button
                      type="button"
                      onClick={() => removeNotifyEmail(email)}
                      className="ml-0.5 text-on-surface-variant hover:text-error transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ATTACHMENTS SECTION */}
      <div className="space-y-4">
        <h3 className="form-section-title">Attachments</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain"
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
            <span className="text-xs text-on-surface-variant">
              Images & Documents (PDF, Word, Excel, PowerPoint, TXT) · Max 10MB
            </span>
          </div>

          {attachmentError && (
            <div className="text-sm text-error bg-error/5 rounded-md p-2">
              {attachmentError}
            </div>
          )}

          {attachments.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-on-surface">
                Selected Files ({attachments.length})
              </p>
              <div className="space-y-2">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-surface-container-low rounded-[0.75rem]"
                  >
                    {getFileIcon(file.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-on-surface truncate">{file.name}</p>
                      <p className="text-xs text-on-surface-variant">{formatFileSize(file.size)}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttachment(index)}
                    >
                      <X className="h-4 w-4 text-error" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-4 mt-2">
        <Button type="submit">
          {isEdit ? 'Update Ticket' : 'Create Ticket'}
        </Button>
      </div>
    </form>
  );
}
