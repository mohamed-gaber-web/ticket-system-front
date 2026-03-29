import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import type { VersionNumber, CreateVersionNumberDto, UpdateVersionNumberDto } from '@/types/versionNumber.types';

interface VersionNumberFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateVersionNumberDto | UpdateVersionNumberDto) => void;
  versionNumber?: VersionNumber | null;
  loading: boolean;
}

export default function VersionNumberFormDialog({
  isOpen,
  onClose,
  onSubmit,
  versionNumber,
  loading,
}: VersionNumberFormDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    isActive: true,
  });

  const [errors, setErrors] = useState({
    name: '',
  });

  useEffect(() => {
    if (versionNumber) {
      setFormData({
        name: versionNumber.name,
        isActive: versionNumber.isActive,
      });
    } else {
      setFormData({
        name: '',
        isActive: true,
      });
    }
    setErrors({ name: '' });
  }, [versionNumber, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, isActive: e.target.checked }));
  };

  const validate = () => {
    const newErrors = { name: '' };
    let isValid = true;

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="form-dialog-overlay">
      <div className="form-dialog-content max-w-md">
        <div className="flex items-center justify-between p-6">
          <h2 className="text-xl font-semibold text-on-surface">
            {versionNumber ? 'Edit Version Number' : 'Create Version Number'}
          </h2>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="name" className="form-label">
              Name <span className="text-error">*</span>
            </label>
            <Input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter version number (e.g., 10.0.0, R12.2.10)"
              className={errors.name ? 'ring-[2px] ring-error/30' : ''}
            />
            {errors.name && <p className="form-error">{errors.name}</p>}
            <p className="text-xs text-on-surface-variant mt-1">
              Examples: 10.0.0, 9.5.2, R12.2.10, 2025.12.0
            </p>
          </div>

          <div className="flex items-center">
            <input
              id="isActive"
              name="isActive"
              type="checkbox"
              checked={formData.isActive}
              onChange={handleCheckboxChange}
              className="form-checkbox"
            />
            <label htmlFor="isActive" className="ml-2.5 text-sm font-medium text-on-surface cursor-pointer">
              Active
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : versionNumber ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
