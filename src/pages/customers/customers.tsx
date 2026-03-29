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
import { CustomSelect } from '@/components/ui/custom-select';
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
        setIsDialogOpen(false);
        setEditingCustomer(null);
        loadCustomers();
      } else {
        await dispatch(createCustomer(data as CreateCustomerData)).unwrap();
        setIsDialogOpen(false);
        setEditingCustomer(null);
        loadCustomers();
      }
    } catch (error: any) {
      console.error('Error submitting form:', error);

      // Close modal on error
      setIsDialogOpen(false);
      setEditingCustomer(null);

      // For create operations, reload after delay since customer might have been created
      // Don't reload immediately to avoid clearing the current customer list
      if (!editingCustomer) {
        setTimeout(() => {
          loadCustomers();
        }, 2000);
      }
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCustomer(null);
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="display-sm text-on-surface">Customers</h1>
          <p className="text-on-surface-variant mt-1">Manage your customer accounts</p>
        </div>
        {userType === 'consultant' && (
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-surface-container-lowest rounded-[1rem] p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
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

          <CustomSelect
            variant="filter"
            value={statusFilter}
            onChange={setStatusFilter}
            label="Status"
            options={[
              { value: '', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'suspended', label: 'Suspended' },
            ]}
          />

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
        <div className="mt-4 text-sm text-on-surface-variant">
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
