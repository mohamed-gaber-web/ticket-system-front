import { useEffect } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchCustomerById, updateCustomer, clearCurrentCustomer } from '@/redux/slices/customerSlice';
import CustomerForm from './components/CustomerForm';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UpdateCustomerData } from '@/types/customer.types';

export default function EditCustomer() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { currentCustomer, loading } = useAppSelector((state) => state.customers);
  const isAdmin = useAppSelector((state) => state.auth.consultantRole) === 'admin';

  if (!isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  useEffect(() => {
    if (id) {
      dispatch(fetchCustomerById(id));
    }

    return () => {
      dispatch(clearCurrentCustomer());
    };
  }, [id, dispatch]);

  const handleSubmit = async (data: UpdateCustomerData) => {
    if (id) {
      const result = await dispatch(updateCustomer({ id, data }));
      if (updateCustomer.fulfilled.match(result)) {
        navigate('/customers');
      }
    }
  };

  if (loading && !currentCustomer) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-brand-600 mx-auto mb-4" />
          <p className="text-on-surface-variant">Loading customer data...</p>
        </div>
      </div>
    );
  }

  if (!currentCustomer && !loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-on-surface mb-2">Customer Not Found</h2>
          <p className="text-on-surface-variant mb-6">The customer you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/customers')}>
            Back to Customers
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate('/customers')}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Customers
      </Button>

      {/* Form */}
      <CustomerForm
        customer={currentCustomer}
        onSubmit={handleSubmit}
        isLoading={loading}
        isEditMode={true}
      />
    </div>
  );
}
