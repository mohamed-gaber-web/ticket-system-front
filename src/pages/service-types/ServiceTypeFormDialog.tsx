import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import type { ServiceType, CreateServiceTypeDto, UpdateServiceTypeDto } from '@/types/serviceType.types';

interface ServiceTypeFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateServiceTypeDto | UpdateServiceTypeDto) => void;
  serviceType?: ServiceType | null;
  loading: boolean;
}

export default function ServiceTypeFormDialog({
  isOpen,
  onClose,
  onSubmit,
  serviceType,
  loading,
}: ServiceTypeFormDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    isActive: true,
  });

  const [errors, setErrors] = useState({
    name: '',
  });

  useEffect(() => {
    if (serviceType) {
      setFormData({
        name: serviceType.name,
        isActive: serviceType.isActive,
      });
    } else {
      setFormData({
        name: '',
        isActive: true,
      });
    }
    setErrors({ name: '' });
  }, [serviceType, isOpen]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {serviceType ? 'Edit Service Type' : 'Create Service Type'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter service type name (e.g., Installation)"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Active Status */}
          <div className="flex items-center">
            <input
              id="isActive"
              name="isActive"
              type="checkbox"
              checked={formData.isActive}
              onChange={handleCheckboxChange}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="ml-2 text-sm font-medium text-gray-700">
              Active
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : serviceType ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
