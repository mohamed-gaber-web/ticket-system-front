import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { assignConsultants } from '@/redux/slices/assignmentSlice';
import { fetchConsultants } from '@/redux/slices/consultantSlice';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { UserPlus } from 'lucide-react';
import type { Consultant } from '@/types/consultant.types';

interface AssignConsultantsDialogProps {
  assignmentId: string;
  currentConsultants?: string[];
  onSuccess?: () => void;
}

export function AssignConsultantsDialog({
  assignmentId,
  currentConsultants = [],
  onSuccess
}: AssignConsultantsDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedConsultants, setSelectedConsultants] = useState<string[]>([]);

  const dispatch = useAppDispatch();
  const { consultants, loading: consultantsLoading } = useAppSelector((state) => state.consultants);
  const { loading } = useAppSelector((state) => state.assignments);

  useEffect(() => {
    if (open) {
      dispatch(fetchConsultants());
    }
  }, [dispatch, open]);

  const handleToggleConsultant = (consultantId: string) => {
    setSelectedConsultants((prev) =>
      prev.includes(consultantId)
        ? prev.filter((id) => id !== consultantId)
        : [...prev, consultantId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedConsultants.length === 0) {
      return;
    }

    const result = await dispatch(assignConsultants({
      assignmentId,
      consultants: selectedConsultants
    }));

    if (assignConsultants.fulfilled.match(result)) {
      setOpen(false);
      setSelectedConsultants([]);
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <UserPlus className="h-4 w-4" />
          Assign Consultants
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign Consultants</DialogTitle>
          <DialogDescription>
            Select one or more consultants to assign to this ticket.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="max-h-[400px] overflow-y-auto py-4">
            {consultantsLoading ? (
              <div className="text-center py-8 text-gray-500">Loading consultants...</div>
            ) : consultants.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No consultants available</div>
            ) : (
              <div className="space-y-3">
                {consultants.map((consultant: Consultant) => {
                  const isAlreadyAssigned = currentConsultants.includes(consultant._id);
                  return (
                    <div
                      key={consultant._id}
                      className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <Checkbox
                        id={consultant._id}
                        checked={selectedConsultants.includes(consultant._id)}
                        onCheckedChange={() => handleToggleConsultant(consultant._id)}
                        disabled={isAlreadyAssigned}
                      />
                      <Label
                        htmlFor={consultant._id}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="font-medium">
                          {consultant.firstName} {consultant.lastName}
                        </div>
                        {consultant.position && (
                          <div className="text-xs text-brand-500 font-medium">{consultant.position}</div>
                        )}
                        <div className="text-sm text-gray-500">{consultant.email}</div>
                        {isAlreadyAssigned && (
                          <div className="text-xs text-brand-600 mt-1">Already assigned</div>
                        )}
                      </Label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || selectedConsultants.length === 0}
            >
              {loading ? 'Assigning...' : `Assign ${selectedConsultants.length} Consultant(s)`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
