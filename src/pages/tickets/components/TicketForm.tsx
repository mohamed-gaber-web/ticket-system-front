import { useState, useEffect } from 'react';
import type { Ticket, CreateTicketData, UpdateTicketData } from '@/types/ticket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchCategories } from '@/redux/slices/categorySlice';

interface Props {
  initialData?: Ticket;
  onSubmit: (data: CreateTicketData | UpdateTicketData) => void;
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
  const { user } = useAppSelector((state) => state.auth);

  // Get customer ID from logged-in user
  const customerId = user?._id || '';

  const [formData, setFormData] = useState<CreateTicketData | UpdateTicketData>(
    isEdit
      ? {
          subject: '',
          description: '',
          category: '',
          priority: 'medium',
          status: 'new',
        }
      : {
          ticketNumber: generateTicketNumber(),
          customer: customerId,
          subject: '',
          description: '',
          category: '',
          priority: 'medium',
        }
  );

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

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

      if (isEdit) {
        setFormData({
          subject: initialData.subject,
          description: initialData.description,
          category: categoryId,
          priority: initialData.priority,
          status: initialData.status,
        });
      } else {
        setFormData({
          ticketNumber: initialData.ticketNumber || generateTicketNumber(),
          customer: customerId,
          subject: initialData.subject,
          description: initialData.description,
          category: categoryId,
          priority: initialData.priority,
        });
      }
    }
  }, [initialData, isEdit, customerId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 bg-white rounded-lg shadow">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Category</label>
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

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-2">Subject</label>
          <Input
            name="subject"
            value={formData.subject || ''}
            onChange={handleChange}
            placeholder="Ticket Subject"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            placeholder="Ticket Description"
            required
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Priority</label>
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
            <label className="block text-sm font-medium mb-2">Status</label>
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
              <option value="reopened">Reopened</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button type="submit" className="bg-blue-500 text-white hover:bg-blue-600 font-semibold">
          {isEdit ? 'Update Ticket' : 'Create Ticket'}
        </Button>
      </div>
    </form>
  );
}
