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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, UserCheck } from 'lucide-react';
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
    estimatedTime: undefined,
  });
  const [selectedConsultant, setSelectedConsultant] = useState<string>('');

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

      // If a consultant is selected (and not "none"), create assignment and assign them
      if (selectedConsultant && selectedConsultant !== 'none' && subTicket && user) {
        // First create the assignment
        const assignmentResult = await dispatch(createAssignment({
          ticket: subTicket._id,
          assignedToTeam: '', // Empty team for now
          assignedByConsultant: user._id,
          assignmentNotes: `Sub-ticket created from ${parentTicketNumber}`,
        }));

        // Then assign consultant if assignment was successful
        if (createAssignment.fulfilled.match(assignmentResult)) {
          const assignment = assignmentResult.payload;
          await dispatch(assignConsultants({
            assignmentId: assignment._id,
            consultants: [selectedConsultant]
          }));
        }
      }

      setOpen(false);
      setFormData({
        subject: '',
        description: '',
        priority: 'medium',
        estimatedTime: undefined,
      });
      setSelectedConsultant('');
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white border-0">
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
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="estimatedTime">Estimated Time (hours)</Label>
              <Input
                id="estimatedTime"
                type="number"
                value={formData.estimatedTime || ''}
                onChange={(e) => setFormData({ ...formData, estimatedTime: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="Enter estimated time in hours"
                min="0"
                step="0.5"
              />
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <UserCheck className="h-5 w-5 text-gray-600" />
                <Label htmlFor="consultant" className="text-base font-semibold">Assign to Consultant (Optional)</Label>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Select a consultant to assign to this sub-ticket. You can also assign them later.
              </p>
              {consultantsLoading ? (
                <div className="text-sm text-gray-500 py-4">Loading consultants...</div>
              ) : (
                <Select
                  value={selectedConsultant}
                  onValueChange={setSelectedConsultant}
                >
                  <SelectTrigger id="consultant">
                    <SelectValue placeholder="Select a consultant (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- No consultant --</SelectItem>
                    {consultants.map((consultant) => (
                      <SelectItem key={consultant._id} value={consultant._id}>
                        {consultant.firstName} {consultant.lastName} - {consultant.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
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
