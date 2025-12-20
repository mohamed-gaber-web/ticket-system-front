import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchCustomers, deleteCustomer, createCustomer, updateCustomer } from '@/redux/slices/customerSlice';
import { fetchErpTypes } from '@/redux/slices/erpTypeSlice';
import { fetchVersionNumbers } from '@/redux/slices/versionNumberSlice';
import CustomerTable from './components/CustomerTable';
import CustomerFormDialog from './components/CustomerFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, RefreshCw } from 'lucide-react';
import type { Customer, CreateCustomerData, UpdateCustomerData } from '@/types/customer.types';

export default function Customers() {
  const dispatch = useAppDispatch();
  const { customers, loading, total } = useAppSelector((state) => state.customers);
  const { userType } = useAppSelector((state) => state.auth);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    loadCustomers();
    dispatch(fetchErpTypes({}));
    dispatch(fetchVersionNumbers({}));
  }, []);

  const loadCustomers = () => {
    const params: any = {};
    if (searchTerm) params.search = searchTerm;
    if (statusFilter) params.status = statusFilter;
    dispatch(fetchCustomers(params));
  };

  const handleSearch = () => {
    loadCustomers();
  };

  const handleDelete = (id: string) => {
    dispatch(deleteCustomer(id));
  };

  const handleRefresh = () => {
    setSearchTerm('');
    setStatusFilter('');
    dispatch(fetchCustomers({}));
  };

  const handleCreate = () => {
    setEditingCustomer(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsDialogOpen(true);
  };

  const handleFormSubmit = async (data: CreateCustomerData | UpdateCustomerData) => {
    try {
      if (editingCustomer) {
        await dispatch(updateCustomer({ id: editingCustomer._id, data: data as UpdateCustomerData })).unwrap();
      } else {
        await dispatch(createCustomer(data as CreateCustomerData)).unwrap();
      }
      setIsDialogOpen(false);
      setEditingCustomer(null);
      loadCustomers();
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCustomer(null);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600 mt-1">Manage your customer accounts</p>
        </div>
        {userType === 'consultant' && (
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Search by company name, email, or contact person..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSearch} className="flex-1">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-4 text-sm text-gray-600">
          Showing <span className="font-semibold">{customers.length}</span> of{' '}
          <span className="font-semibold">{total}</span> customers
        </div>
      </div>

      {/* Customer Table */}
      <CustomerTable customers={customers} onEdit={handleEdit} onDelete={handleDelete} isLoading={loading} />

      {/* Form Dialog */}
      <CustomerFormDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleFormSubmit}
        customer={editingCustomer}
        loading={loading}
      />
    </div>
  );
}
