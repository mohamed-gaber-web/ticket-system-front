import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchTicketById, updateTicket } from '@/redux/slices/ticketSlice';
import { uploadAttachment } from '@/redux/slices/attachmentSlice';
import { useNavigate, useParams } from 'react-router-dom';
import TicketForm from './components/TicketForm';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
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
        await dispatch(updateTicket({ id, data })).unwrap();

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
      } catch {
        // Error is handled by Redux slice / toast
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-brand-500 mx-auto mb-4" />
          <p className="text-on-surface-variant text-sm">Loading ticket...</p>
        </div>
      </div>
    );
  }

  if (!currentTicket) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <p className="text-on-surface text-lg font-semibold">Ticket not found</p>
          <p className="text-on-surface-variant text-sm mt-2">This ticket may have been deleted or you don't have access.</p>
          <Button variant="outline" onClick={() => navigate('/tickets')} className="mt-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to tickets
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="display-sm text-on-surface mb-6">Edit Ticket</h1>
      <TicketForm initialData={currentTicket} onSubmit={handleSubmit} isEdit={true} />
    </div>
  );
}
