import { useNavigate, Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { createCustomer } from '@/redux/slices/customerSlice';
import CustomerForm from './components/CustomerForm';
import { ArrowLeft } from 'lucide-react';
import type { CreateCustomerData, UpdateCustomerData } from '@/types/customer.types';
import { Button } from '@/components/ui/button';

export default function CreateCustomer() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { loading } = useAppSelector((state) => state.customers);
  const isAdmin = useAppSelector((state) => state.auth.consultantRole) === 'admin';

  if (!isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  const handleSubmit = async (data: CreateCustomerData | UpdateCustomerData): Promise<void> => {
    const result = await dispatch(createCustomer(data as CreateCustomerData));
    if (createCustomer.fulfilled.match(result)) {
      const referrer = sessionStorage.getItem('customerCreateReferrer');
      if (referrer === 'ticket-create') {
        sessionStorage.removeItem('customerCreateReferrer');
        navigate('/tickets/create');
      } else {
        navigate('/customers');
      }
    }
  };

  return (
    <div className="p-8 w-full space-y-8">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      {/* Form */}
      <CustomerForm
        onSubmit={handleSubmit}
        isLoading={loading}
        isEditMode={false}
      />
    </div>
  );
}
