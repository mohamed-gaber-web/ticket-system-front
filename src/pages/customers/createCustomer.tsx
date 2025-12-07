import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { createCustomer } from '@/redux/slices/customerSlice';
import CustomerForm from './components/CustomerForm';
import { ArrowLeft } from 'lucide-react';
import type { CreateCustomerData } from '@/types/customer.types';
import { Button } from '@/components/ui/button';

export default function CreateCustomer() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { loading } = useAppSelector((state) => state.customers);

  const handleSubmit = async (data: CreateCustomerData) => {
    const result = await dispatch(createCustomer(data));
    if (createCustomer.fulfilled.match(result)) {
      navigate('/customers');
    }
  };

  return (
    <div className="p-6 w-full space-y-6">
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
        onSubmit={handleSubmit}
        isLoading={loading}
        isEditMode={false}
      />
    </div>
  );
}
