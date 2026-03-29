import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchTicketById, updateTicket } from '@/redux/slices/ticketSlice';
import { uploadAttachment } from '@/redux/slices/attachmentSlice';
import { useNavigate, useParams } from 'react-router-dom';
import TicketForm from './components/TicketForm';
import type { UpdateTicketData } from '@/types/ticket';
import { toast } from 'sonner';

export default function EditTicket() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { currentTicket, loading } = useAppSelector((state) => state.tickets);
  const { user, userType } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (id) {
      dispatch(fetchTicketById(id));
    }
  }, [dispatch, id]);

  const handleSubmit = async (data: UpdateTicketData, attachments?: File[]) => {
    if (id) {
      try {
        // Step 1: Update the ticket
        await dispatch(updateTicket({ id, data })).unwrap();

        // Step 2: Upload new attachments if any
        if (attachments && attachments.length > 0 && user) {
          toast.info(`Uploading ${attachments.length} attachment(s)...`);

          const uploadPromises = attachments.map((file) =>
            dispatch(
              uploadAttachment({
                ticketId: id,
                file,
                uploadedByUserId: user._id,
                uploadedByUserType: userType as 'customer' | 'consultant' | 'team_member',
              })
            )
          );

          await Promise.all(uploadPromises);
        }

        navigate('/tickets');
      } catch (error) {
        console.error('Failed to update ticket:', error);
      }
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!currentTicket) {
    return <div className="p-8">Ticket not found</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-md font-bold mb-6">Edit Ticket</h1>
      <TicketForm initialData={currentTicket} onSubmit={handleSubmit} isEdit={true} />
    </div>
  );
}
