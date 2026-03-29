import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import type { Scope, CreateScopeData, UpdateScopeData } from '@/types/scope.types';

interface ScopeFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateScopeData | UpdateScopeData) => void;
  scope?: Scope | null;
  loading: boolean;
}

export default function ScopeFormDialog({
  isOpen,
  onClose,
  onSubmit,
  scope,
  loading,
}: ScopeFormDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    isActive: true,
  });

  const [errors, setErrors] = useState({
    name: '',
  });

  useEffect(() => {
    if (scope) {
      setFormData({
        name: scope.name,
        isActive: scope.isActive,
      });
    } else {
      setFormData({
        name: '',
        isActive: true,
      });
    }
    setErrors({ name: '' });
  }, [scope, isOpen]);

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
        {/* Header */}
        <div className="flex items-center justify-between p-6">
          <h2 className="text-xl font-semibold text-on-surface">
            {scope ? 'Edit Scope' : 'Create Scope'}
          </h2>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
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
              placeholder="Enter scope name (e.g., User Management)"
              className={errors.name ? 'ring-[2px] ring-error/30' : ''}
            />
            {errors.name && <p className="form-error">{errors.name}</p>}
          </div>

          {/* Active Status */}
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

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : scope ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
