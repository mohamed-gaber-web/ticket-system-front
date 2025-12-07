import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchTicketById, updateTicket } from '@/redux/slices/ticketSlice';
import { useNavigate, useParams } from 'react-router-dom';
import TicketForm from './components/TicketForm';
import type { UpdateTicketData } from '@/types/ticket';

export default function EditTicket() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { currentTicket, loading } = useAppSelector((state) => state.tickets);

  useEffect(() => {
    if (id) {
      dispatch(fetchTicketById(id));
    }
  }, [dispatch, id]);

  const handleSubmit = async (data: UpdateTicketData) => {
    if (id) {
      try {
        await dispatch(updateTicket({ id, data })).unwrap();
        navigate('/tickets');
      } catch (error) {
        console.error('Failed to update ticket:', error);
      }
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!currentTicket) {
    return <div className="p-6">Ticket not found</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-md font-bold mb-6">Edit Ticket</h1>
      <TicketForm initialData={currentTicket} onSubmit={handleSubmit} isEdit={true} />
    </div>
  );
}
