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
    <form onSubmit={handleSubmit} className="space-y-4 p-6 bg-white rounded-lg shadow">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Category Name</label>
          <Input
            name="name"
            value={formData.name || ''}
            onChange={handleChange}
            placeholder="Enter category name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            placeholder="Enter category description"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" className="bg-blue-500 text-white hover:bg-blue-600 font-semibold">
          {isEdit ? 'Update Category' : 'Create Category'}
        </Button>
      </div>
    </form>
  );
}
