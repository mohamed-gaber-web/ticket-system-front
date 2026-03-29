import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { createTicket } from '@/redux/slices/ticketSlice';
import { uploadAttachment } from '@/redux/slices/attachmentSlice';
import { useNavigate } from 'react-router-dom';
import TicketForm from './components/TicketForm';
import type { CreateTicketData, UpdateTicketData } from '@/types/ticket';
import { toast } from 'sonner';

export default function CreateTicket() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, userType } = useAppSelector((state) => state.auth);

  const handleSubmit = (data: CreateTicketData | UpdateTicketData, attachments?: File[]) => {
    (async () => {
      try {
        // Step 1: Create the ticket
        const result = await dispatch(createTicket(data as CreateTicketData)).unwrap();
        const ticketId = result._id;

        // Step 2: Upload attachments if any
        if (attachments && attachments.length > 0 && user) {
          toast.info(`Uploading ${attachments.length} attachment(s)...`);

          const uploadPromises = attachments.map((file) =>
            dispatch(
              uploadAttachment({
                ticketId,
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
        console.error('Failed to create ticket:', error);
      }
    })();
  };

  return (
    <div className="p-8">
      <h1 className="text-md font-bold mb-6">Create New Ticket</h1>
      <TicketForm onSubmit={handleSubmit} />
    </div>
  );
}
