import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import type {
  IndustrySector,
  CreateIndustrySectorData,
  UpdateIndustrySectorData,
} from '@/types/industrySector.types';

interface IndustrySectorFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateIndustrySectorData | UpdateIndustrySectorData) => void;
  sector?: IndustrySector | null;
  loading: boolean;
}

export default function IndustrySectorFormDialog({
  isOpen,
  onClose,
  onSubmit,
  sector,
  loading,
}: IndustrySectorFormDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true,
  });

  const [errors, setErrors] = useState({
    name: '',
  });

  useEffect(() => {
    if (sector) {
      setFormData({
        name: sector.name,
        description: sector.description || '',
        isActive: sector.isActive,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        isActive: true,
      });
    }
    setErrors({ name: '' });
  }, [sector, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
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
      onSubmit({
        name: formData.name.trim(),
        description: formData.description.trim(),
        isActive: formData.isActive,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="form-dialog-overlay">
      <div className="form-dialog-content max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6">
          <h2 className="text-xl font-semibold text-on-surface">
            {sector ? 'Edit Industry Sector' : 'Create Industry Sector'}
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
              placeholder="e.g. Hospitality"
              className={errors.name ? 'ring-[2px] ring-error/30' : ''}
            />
            {errors.name && <p className="form-error">{errors.name}</p>}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="form-label">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Optional description"
              rows={4}
              className="form-select h-auto"
            />
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
            <label
              htmlFor="isActive"
              className="ml-2.5 text-sm font-medium text-on-surface cursor-pointer"
            >
              Active
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : sector ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
