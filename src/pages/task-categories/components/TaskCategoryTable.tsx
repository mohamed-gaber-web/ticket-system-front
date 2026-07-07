import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/redux/hooks/hooks';
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
import type { TaskCategory } from '@/types/taskCategory';

const MySwal = withReactContent(Swal);

interface TaskCategoryTableProps {
  taskCategories: TaskCategory[];
  onDelete: (id: string) => void;
  loading: boolean;
}

export default function TaskCategoryTable({ taskCategories, onDelete, loading }: TaskCategoryTableProps) {
  const navigate = useNavigate();
  const isAdmin = useAppSelector((state) => state.auth.consultantRole) === 'admin';

  const handleDelete = (category: TaskCategory) => {
    MySwal.fire({
      title: 'Are you sure?',
      html: `
        <div class="text-left">
          <p class="mb-2">You are about to delete:</p>
          <p class="font-semibold text-lg">${category.name}</p>
          <p class="text-sm text-on-surface-variant">${category.description ?? ''}</p>
          <p class="mt-3 text-error">This action cannot be undone!</p>
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (taskCategories.length === 0) {
    return (
      <div className="text-center py-12">
        <FolderOpen className="mx-auto h-12 w-12 text-on-surface-variant mb-4" />
        <p className="text-on-surface-variant text-lg">No task categories found</p>
        <p className="text-on-surface-variant text-sm mt-2">Create your first task category to get started</p>
        <Button onClick={() => navigate('/task-categories/create')} className="mt-4">
          Create Task Category
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-surface-container-lowest shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-surface-container-low">
            <TableHead className="font-semibold">Category Name</TableHead>
            <TableHead className="font-semibold">Description</TableHead>
            <TableHead className="font-semibold">Created At</TableHead>
            {isAdmin && <TableHead className="text-right font-semibold">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {taskCategories.map((category) => (
            <TableRow key={category._id} className="hover:bg-surface-container-low transition-colors">
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-brand-500 to-accent-orange-500 flex items-center justify-center text-white font-semibold">
                    {category.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-on-surface">{category.name}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <p className="text-on-surface-variant">{category.description}</p>
              </TableCell>
              <TableCell className="text-on-surface-variant">{formatDate(category.createdAt)}</TableCell>
              {isAdmin && (
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/task-categories/edit/${category._id}`)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-error hover:text-error hover:border-error/30"
                      onClick={() => handleDelete(category)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
