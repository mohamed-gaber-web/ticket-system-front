import { useState, useEffect } from 'react';
import type { TaskCategory, CreateTaskCategoryData, UpdateTaskCategoryData } from '@/types/taskCategory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  initialData?: TaskCategory;
  onSubmit: (data: CreateTaskCategoryData | UpdateTaskCategoryData) => void;
  isEdit?: boolean;
}

export default function TaskCategoryForm({ initialData, onSubmit, isEdit = false }: Props) {
  const [formData, setFormData] = useState<CreateTaskCategoryData | UpdateTaskCategoryData>({
    name: '',
    description: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        description: initialData.description ?? '',
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name?.trim()) {
      alert('Please enter a category name');
      return;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="form-card space-y-4 p-6">
      <div className="space-y-4">
        <div>
          <label className="form-label">Category Name *</label>
          <Input
            name="name"
            value={formData.name || ''}
            onChange={handleChange}
            placeholder="Enter category name"
            required
          />
        </div>

        <div>
          <label className="form-label">Description</label>
          <textarea
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            placeholder="Enter category description (optional)"
            className="form-select min-h-[120px] h-auto py-2.5"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit">
          {isEdit ? 'Update Task Category' : 'Create Task Category'}
        </Button>
      </div>
    </form>
  );
}
