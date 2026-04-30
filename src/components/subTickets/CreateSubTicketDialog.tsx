import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { createSubTicket } from '@/redux/slices/ticketSlice';
import { uploadAttachment } from '@/redux/slices/attachmentSlice';
import { fetchConsultants } from '@/redux/slices/consultantSlice';
import { fetchDepartments } from '@/redux/slices/departmentSlice';
import { createAssignment, assignConsultants } from '@/redux/slices/assignmentSlice';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, UserCheck, Mail, X, Paperclip, Upload, File, ImageIcon, Layers, Building } from 'lucide-react';
import { ConsultantSelect } from '@/components/ui/consultant-select';
import { CustomSelect } from '@/components/ui/custom-select';
import { validateFile, formatFileSize } from '@/api/attachmentApi';
import { getModules } from '@/api/moduleApi';
import type { Module } from '@/types/module.types';
import type { CreateSubTicketData } from '@/types/ticket';

interface CreateSubTicketDialogProps {
  parentTicketId: string;
  parentTicketNumber: string;
  isCustomer?: boolean;
  onSuccess?: () => void;
}

export function CreateSubTicketDialog({
  parentTicketId,
  parentTicketNumber,
  isCustomer = false,
  onSuccess
}: CreateSubTicketDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<CreateSubTicketData>({
    subject: '',
    description: '',
    priority: 'medium',
  });
  const [selectedConsultants, setSelectedConsultants] = useState<string[]>([]);
  const [notifyEmails, setNotifyEmails] = useState<string[]>([]);
  const [notifyEmailInput, setNotifyEmailInput] = useState('');
  const [notifyEmailError, setNotifyEmailError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const dispatch = useAppDispatch();
  const { loading } = useAppSelector((state) => state.tickets);
  const { user, userType } = useAppSelector((state) => state.auth);
  const { consultants, loading: consultantsLoading } = useAppSelector((state) => state.consultants);
  const { departments } = useAppSelector((state) => state.departments);
  const [modules, setModules] = useState<Module[]>([]);

  useEffect(() => {
    if (open) {
      dispatch(fetchConsultants({ limit: 500 }));
      dispatch(fetchDepartments({ limit: 9999 }));
      getModules({ limit: 9999 }).then((res) => setModules(res.data)).catch(() => {});
    }
  }, [dispatch, open]);

  const addNotifyEmail = () => {
    const email = notifyEmailInput.trim().toLowerCase();
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!email) return;
    if (!emailRegex.test(email)) { setNotifyEmailError('Invalid email address'); return; }
    if (notifyEmails.includes(email)) { setNotifyEmailError('Email already added'); return; }
    setNotifyEmails([...notifyEmails, email]);
    setNotifyEmailInput('');
    setNotifyEmailError(null);
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
    if (errors.length > 0) setAttachmentError(errors.join('; '));
    if (newFiles.length > 0) setAttachments((prev) => [...prev, ...newFiles]);
    e.target.value = '';
  };

  const removeAttachmentFile = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (fileType: string) =>
    fileType.startsWith('image/')
      ? <ImageIcon className="h-4 w-4 text-brand-500" />
      : <File className="h-4 w-4 text-on-surface-variant" />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const dataToSend: CreateSubTicketData = {
      ...formData,
      notifyEmails,
      ...(user && userType !== 'customer' ? { assignedBy: user._id } : {}),
    };

    const result = await dispatch(createSubTicket({
      parentId: parentTicketId,
      data: dataToSend
    }));

    if (createSubTicket.fulfilled.match(result)) {
      const subTicket = result.payload;

      if (selectedConsultants.length > 0 && subTicket && user) {
        const assignmentResult = await dispatch(createAssignment({
          ticket: subTicket._id,
          assignedByConsultant: user._id,
          assignmentNotes: `Sub-ticket created from ${parentTicketNumber}`,
        }));

        if (createAssignment.fulfilled.match(assignmentResult)) {
          const assignment = assignmentResult.payload;
          await dispatch(assignConsultants({
            assignmentId: assignment._id,
            consultants: selectedConsultants,
          }));
        }
      }

      // Upload attachments after the sub-ticket is created
      if (attachments.length > 0 && subTicket && user) {
        setUploading(true);
        await Promise.all(
          attachments.map((file) =>
            dispatch(uploadAttachment({
              ticketId: subTicket._id,
              file,
              uploadedByUserId: user._id,
              uploadedByUserType: (userType as 'customer' | 'consultant' | 'team_member') ?? 'consultant',
            }))
          )
        );
        setUploading(false);
      }

      setOpen(false);
      setFormData({ subject: '', description: '', priority: 'medium', scope: [], department: undefined });
      setSelectedConsultants([]);
      setNotifyEmails([]);
      setNotifyEmailInput('');
      setAttachments([]);
      setAttachmentError(null);
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Create Sub-Ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] flex flex-col max-h-[90vh]">
        <DialogHeader className="shrink-0">
          <DialogTitle>Create Sub-Ticket</DialogTitle>
          <DialogDescription>
            Create a sub-ticket for {parentTicketNumber}. Inherits customer and SLA from parent.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="grid gap-4 py-4 overflow-y-auto flex-1 pr-1">
            <div className="grid gap-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Enter sub-ticket subject"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter sub-ticket description"
                rows={4}
                required
              />
            </div>

            {!isCustomer && (
              <div className="pt-2">
                <div className="h-px bg-surface-container-high -mx-2 mb-4" />
                <div className="flex items-center gap-2 mb-3">
                  <UserCheck className="h-5 w-5 text-on-surface-variant" />
                  <Label htmlFor="consultant" className="text-base font-semibold">Assign to Consultant (Optional)</Label>
                </div>
                <p className="text-sm text-on-surface-variant mb-3">
                  Select a consultant to assign to this sub-ticket. You can also assign them later.
                </p>
                <ConsultantSelect
                  multiple
                  value={selectedConsultants}
                  onChange={setSelectedConsultants}
                  consultants={consultants}
                  loading={consultantsLoading}
                  placeholder="Search and select consultants…"
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <CustomSelect
                value={formData.priority || 'medium'}
                onChange={(value) => setFormData({ ...formData, priority: value as any })}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                  { value: 'critical', label: 'Critical' },
                ]}
              />
            </div>

            {/* Module (scope) — multi-select */}
            <div className="grid gap-2">
              <Label className="flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-on-surface-variant" />
                Module
              </Label>
              <div className="flex flex-wrap gap-1.5 min-h-[2.5rem] p-2 rounded-[0.5rem] border border-border bg-surface focus-within:border-brand-500 transition-colors">
                {(formData.scope ?? []).map((id) => {
                  const mod = modules.find((m) => m._id === id);
                  return mod ? (
                    <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 text-xs font-medium">
                      {mod.name}
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, scope: (formData.scope ?? []).filter((s) => s !== id) })}
                        className="text-brand-400 hover:text-brand-700 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ) : null;
                })}
                <select
                  className="flex-1 min-w-[120px] bg-transparent text-sm text-on-surface outline-none"
                  value=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val && !(formData.scope ?? []).includes(val)) {
                      setFormData({ ...formData, scope: [...(formData.scope ?? []), val] });
                    }
                  }}
                >
                  <option value="">{(formData.scope ?? []).length === 0 ? 'Select modules...' : 'Add more...'}</option>
                  {modules.filter((m) => !(formData.scope ?? []).includes(m._id)).map((m) => (
                    <option key={m._id} value={m._id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Department */}
            <div className="grid gap-2">
              <Label className="flex items-center gap-1.5">
                <Building className="h-4 w-4 text-on-surface-variant" />
                Department
              </Label>
              <CustomSelect
                value={formData.department || ''}
                onChange={(value) => setFormData({ ...formData, department: value || undefined })}
                options={[
                  { value: '', label: 'Select department...' },
                  ...departments.map((d) => ({ value: d._id, label: d.name })),
                ]}
              />
            </div>

            <div className="pt-2">
              <div className="h-px bg-surface-container-high -mx-2 mb-4" />
              <div className="flex items-center gap-2 mb-1">
                <Mail className="h-5 w-5 text-on-surface-variant" />
                <Label className="text-base font-semibold">Notification Emails</Label>
              </div>
              <p className="text-sm text-on-surface-variant mb-3">
                Add extra email addresses to notify when this sub-ticket is created.
              </p>
              <div className="flex gap-2 mb-2">
                <div className="flex-1 relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant pointer-events-none" />
                  <Input
                    type="email"
                    value={notifyEmailInput}
                    onChange={(e) => { setNotifyEmailInput(e.target.value); setNotifyEmailError(null); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNotifyEmail(); } }}
                    placeholder="email@example.com"
                    className="pl-9"
                  />
                </div>
                <button
                  type="button"
                  onClick={addNotifyEmail}
                  className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-md border border-outline text-sm hover:bg-surface-container transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>
              {notifyEmailError && <p className="text-sm text-error mb-2">{notifyEmailError}</p>}
              {notifyEmails.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {notifyEmails.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-surface-container border border-outline-variant"
                    >
                      <Mail className="h-3.5 w-3.5 text-on-surface-variant" />
                      {email}
                      <button
                        type="button"
                        onClick={() => setNotifyEmails(notifyEmails.filter((e) => e !== email))}
                        className="ml-0.5 text-on-surface-variant hover:text-error transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            {/* Attachments */}
            <div className="pt-2">
              <div className="h-px bg-surface-container-high -mx-2 mb-4" />
              <div className="flex items-center gap-2 mb-1">
                <Paperclip className="h-5 w-5 text-on-surface-variant" />
                <Label className="text-base font-semibold">Attachments</Label>
              </div>
              <p className="text-sm text-on-surface-variant mb-3">
                Images &amp; documents (PDF, Word, Excel, PowerPoint, TXT) · Max 10MB each
              </p>

              <input
                type="file"
                id="sub-ticket-attachment-upload"
                accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => document.getElementById('sub-ticket-attachment-upload')?.click()}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-outline text-sm hover:bg-surface-container transition-colors"
              >
                <Upload className="h-4 w-4" />
                Choose Files
              </button>

              {attachmentError && (
                <p className="text-sm text-error mt-2">{attachmentError}</p>
              )}

              {attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">
                    Selected ({attachments.length})
                  </p>
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 px-3 py-2 rounded-[0.75rem] bg-surface-container-low"
                    >
                      {getFileIcon(file.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-on-surface truncate">{file.name}</p>
                        <p className="text-xs text-on-surface-variant">{formatFileSize(file.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachmentFile(index)}
                        className="p-1 rounded-md text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="shrink-0 pt-4 border-t border-outline-variant/10">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || uploading}>
              {uploading ? 'Uploading...' : loading ? 'Creating...' : 'Create Sub-Ticket'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
