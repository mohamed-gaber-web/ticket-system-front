import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, FolderOpen } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import type { Category } from '@/types/category';

const MySwal = withReactContent(Swal);

interface CategoryTableProps {
  categories: Category[];
  onDelete: (id: string) => void;
  loading: boolean;
}

export default function CategoryTable({ categories, onDelete, loading }: CategoryTableProps) {
  const navigate = useNavigate();

  const handleDelete = (category: Category) => {
    MySwal.fire({
      title: 'Are you sure?',
      html: `
        <div class="text-left">
          <p class="mb-2">You are about to delete:</p>
          <p class="font-semibold text-lg">${category.name}</p>
          <p class="text-sm text-gray-600">${category.description}</p>
          <p class="mt-3 text-red-600">This action cannot be undone!</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      focusCancel: true,
    }).then((result) => {
      if (result.isConfirmed) {
        onDelete(category._id);
      }
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="text-center py-12">
        <FolderOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-600 text-lg">No categories found</p>
        <p className="text-gray-500 text-sm mt-2">Create your first category to get started</p>
        <Button onClick={() => navigate('/categories/create')} className="mt-4">
          Create Category
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="font-semibold">Category Name</TableHead>
            <TableHead className="font-semibold">Description</TableHead>
            <TableHead className="font-semibold">Created At</TableHead>
            <TableHead className="text-right font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <TableRow key={category._id} className="hover:bg-gray-50 transition-colors">
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                    {category.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{category.name}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <p className="text-gray-600">{category.description}</p>
              </TableCell>
              <TableCell className="text-gray-600">{formatDate(category.createdAt)}</TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/categories/edit/${category._id}`)}
                    className="hover:bg-green-50 hover:text-green-600"
                    title="Edit Category"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(category)}
                    className="hover:bg-red-50 hover:text-red-600"
                    title="Delete Category"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
