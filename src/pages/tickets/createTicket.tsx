import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { createTicket } from '@/redux/slices/ticketSlice';
import { uploadAttachment } from '@/redux/slices/attachmentSlice';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TicketForm from './components/TicketForm';
import type { CreateTicketData, UpdateTicketData } from '@/types/ticket';
import { toast } from 'sonner';
import { TICKET_LIST_PATH, TICKET_TYPE_LABELS, isTicketType } from '@/lib/ticketTypes';

export default function CreateTicket() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, userType } = useAppSelector((state) => state.auth);
  // ?type=internal|rnd — opened from that list; customers always raise Customer tickets
  const [searchParams] = useSearchParams();
  const typeParam = searchParams.get('type');
  const defaultType = userType === 'employee' && isTicketType(typeParam) ? typeParam : 'customer';

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

        // Back to the list of the type just created
        const created = data as CreateTicketData;
        navigate(TICKET_LIST_PATH[created.ticketType ?? 'customer']);
      } catch {
        // Error is handled by Redux slice / toast
      }
    })();
  };

  return (
    <div className="p-8">
      <h1 className="display-sm text-on-surface mb-6">
        {defaultType === 'customer' ? 'New Ticket' : `New ${TICKET_TYPE_LABELS[defaultType]} Ticket`}
      </h1>
      {/* key: switching ?type= while on the page restarts the form with that type */}
      <TicketForm key={defaultType} onSubmit={handleSubmit} defaultType={defaultType} />
    </div>
  );
}
