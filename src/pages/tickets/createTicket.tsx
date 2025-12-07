import { useAppDispatch } from '@/redux/hooks/hooks';
import { createTicket } from '@/redux/slices/ticketSlice';
import { useNavigate } from 'react-router-dom';
import TicketForm from './components/TicketForm';
import type { CreateTicketData } from '@/types/ticket';

export default function CreateTicket() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (data: CreateTicketData) => {
    try {
      await dispatch(createTicket(data)).unwrap();
      navigate('/tickets');
    } catch (error) {
      console.error('Failed to create ticket:', error);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-md font-bold mb-6">Create New Ticket</h1>
      <TicketForm onSubmit={handleSubmit} />
    </div>
  );
}
