import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { createSubTicket } from '@/redux/slices/ticketSlice';
import { fetchConsultants } from '@/redux/slices/consultantSlice';
import { createAssignment, assignConsultants } from '@/redux/slices/assignmentSlice';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, UserCheck } from 'lucide-react';
import { ConsultantSelect } from '@/components/ui/consultant-select';
import { CustomSelect } from '@/components/ui/custom-select';
import type { CreateSubTicketData } from '@/types/ticket';

interface CreateSubTicketDialogProps {
  parentTicketId: string;
  parentTicketNumber: string;
  onSuccess?: () => void;
}

export function CreateSubTicketDialog({
  parentTicketId,
  parentTicketNumber,
  onSuccess
}: CreateSubTicketDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<CreateSubTicketData>({
    subject: '',
    description: '',
    priority: 'medium',
  });
  const [selectedConsultants, setSelectedConsultants] = useState<string[]>([]);

  const dispatch = useAppDispatch();
  const { loading } = useAppSelector((state) => state.tickets);
  const { user } = useAppSelector((state) => state.auth);
  const { consultants, loading: consultantsLoading } = useAppSelector((state) => state.consultants);

  useEffect(() => {
    if (open) {
      dispatch(fetchConsultants());
    }
  }, [dispatch, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const dataToSend: CreateSubTicketData = {
      ...formData,
      assignedBy: user?._id,
    };

    const result = await dispatch(createSubTicket({
      parentId: parentTicketId,
      data: dataToSend
    }));

    if (createSubTicket.fulfilled.match(result)) {
      const subTicket = result.payload;

      if (selectedConsultants.length > 0 && subTicket && user) {
        const assignmentResult = await dispatch(createAssignment({
          ticket: subTicket._id,
          assignedByConsultant: user._id,
          assignmentNotes: `Sub-ticket created from ${parentTicketNumber}`,
        }));

        if (createAssignment.fulfilled.match(assignmentResult)) {
          const assignment = assignmentResult.payload;
          await dispatch(assignConsultants({
            assignmentId: assignment._id,
            consultants: selectedConsultants,
          }));
        }
      }

      setOpen(false);
      setFormData({
        subject: '',
        description: '',
        priority: 'medium',
      });
      setSelectedConsultants([]);
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Create Sub-Ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Sub-Ticket</DialogTitle>
          <DialogDescription>
            Create a sub-ticket for {parentTicketNumber}. Inherits customer and SLA from parent.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Enter sub-ticket subject"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter sub-ticket description"
                rows={4}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <CustomSelect
                value={formData.priority || 'medium'}
                onChange={(value) => setFormData({ ...formData, priority: value as any })}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                  { value: 'critical', label: 'Critical' },
                ]}
              />
            </div>


            <div className="pt-4">
              <div className="h-px bg-surface-container-high -mx-2 mb-4" />
              <div className="flex items-center gap-2 mb-3">
                <UserCheck className="h-5 w-5 text-on-surface-variant" />
                <Label htmlFor="consultant" className="text-base font-semibold">Assign to Consultant (Optional)</Label>
              </div>
              <p className="text-sm text-on-surface-variant mb-3">
                Select a consultant to assign to this sub-ticket. You can also assign them later.
              </p>
              <ConsultantSelect
                multiple
                value={selectedConsultants}
                onChange={setSelectedConsultants}
                consultants={consultants}
                loading={consultantsLoading}
                placeholder="Search and select consultants…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Sub-Ticket'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
