import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/redux/store';
import { createAssignment } from '@/redux/slices/assignmentSlice';
import { fetchTeams } from '@/redux/slices/teamSlice';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AssignTicketDialogProps {
  open: boolean;
  onClose: () => void;
  ticketId: string;
  consultantId: string;
}

export function AssignTicketDialog({
  open,
  onClose,
  ticketId,
  consultantId,
}: AssignTicketDialogProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { teams, loading: teamsLoading } = useSelector((state: RootState) => state.teams);
  const { loading: assignmentLoading } = useSelector((state: RootState) => state.assignments);

  const [selectedTeam, setSelectedTeam] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open && teams.length === 0) {
      dispatch(fetchTeams({}));
    }
  }, [open, teams.length, dispatch]);

  const handleAssign = async () => {
    if (!selectedTeam) return;

    try {
      await dispatch(
        createAssignment({
          ticket: ticketId,
          assignedToTeam: selectedTeam,
          assignedByConsultant: consultantId,
          assignmentNotes: notes,
        })
      ).unwrap();

      onClose();
      setSelectedTeam('');
      setNotes('');
    } catch (error) {
      console.error('Failed to assign ticket:', error);
    }
  };

  const handleClose = () => {
    setSelectedTeam('');
    setNotes('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Ticket to Team</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="team">Select Team *</Label>
            <Select value={selectedTeam} onValueChange={setSelectedTeam} disabled={teamsLoading}>
              <SelectTrigger>
                <SelectValue placeholder={teamsLoading ? "Loading teams..." : "Choose a team"} />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team._id} value={team._id}>
                    {team.teamName} ({team.department})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Assignment Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes for the team..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={assignmentLoading}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={!selectedTeam || assignmentLoading}>
            {assignmentLoading ? 'Assigning...' : 'Assign Ticket'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
