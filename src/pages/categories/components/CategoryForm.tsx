import { useState, useEffect } from 'react';
import type { Category, CreateCategoryData, UpdateCategoryData } from '@/types/category';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  initialData?: Category;
  onSubmit: (data: CreateCategoryData | UpdateCategoryData) => void;
  isEdit?: boolean;
}

export default function CategoryForm({ initialData, onSubmit, isEdit = false }: Props) {
  const [formData, setFormData] = useState<CreateCategoryData | UpdateCategoryData>({
    name: '',
    description: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        description: initialData.description,
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form data
    if (!formData.name || !formData.description) {
      console.error('Form validation failed:', formData);
      alert('Please fill in all required fields');
      return;
    }

    console.log('Submitting category form:', formData);
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="form-card space-y-4 p-6">
      <div className="space-y-4">
        <div>
          <label className="form-label">Category Name</label>
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
            placeholder="Enter category description"
            required
            className="form-select min-h-[120px] h-auto py-2.5"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit">
          {isEdit ? 'Update Category' : 'Create Category'}
        </Button>
      </div>
    </form>
  );
}
