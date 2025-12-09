# Ticket Assignment Implementation Guide

## Overview
This guide will help you implement the complete ticket assignment workflow:
1. **Consultants** assign tickets to teams
2. **Team Members** view assigned tickets and accept them
3. **Team Members** work on tickets and update their status

## Current Status

### ✅ Already Implemented
- Redux slice for assignments ([assignmentSlice.ts](src/redux/slices/assignmentSlice.ts))
- Basic API functions for:
  - `getAssignments()` - Fetch all assignments
  - `getAssignmentStats()` - Get assignment statistics
  - `getTicketHistory()` - Get assignment history for a ticket
- TypeScript types for assignments

### ❌ Missing Implementation
You need to add these API functions and Redux thunks:

## Step-by-Step Implementation Plan

---

## Phase 1: Complete the API Layer

### File: [src/api/assignmentApi.ts](src/api/assignmentApi.ts)

Add the following API functions to the existing `assignmentApi` object:

```typescript
// 1. Create Assignment (Consultant assigns ticket to team)
createAssignment: async (data: {
  ticket: string;
  assignedToTeam: string;
  assignedByConsultant: string;
  assignmentNotes?: string;
}): Promise<AssignmentResponse> => {
  const response = await api.post<AssignmentResponse>('/ticket-assignments', data);
  return response.data;
},

// 2. Accept Assignment (Team member accepts the ticket)
acceptAssignment: async (assignmentId: string, teamMemberId: string): Promise<AssignmentResponse> => {
  const response = await api.patch<AssignmentResponse>(
    `/ticket-assignments/${assignmentId}/accept`,
    { teamMemberId }
  );
  return response.data;
},

// 3. Get Current Assignment for a Ticket
getCurrentAssignment: async (ticketId: string): Promise<AssignmentResponse> => {
  const response = await api.get<AssignmentResponse>(
    `/ticket-assignments/ticket/${ticketId}/current`
  );
  return response.data;
},

// 4. Get Assignments by Team (for team dashboard)
getAssignmentsByTeam: async (teamId: string, params?: AssignmentQueryParams): Promise<AssignmentListResponse> => {
  const response = await api.get<AssignmentListResponse>(
    `/ticket-assignments/team/${teamId}`,
    { params }
  );
  return response.data;
},

// 5. Get Assignments by Team Member (for member dashboard)
getAssignmentsByTeamMember: async (memberId: string, params?: AssignmentQueryParams): Promise<AssignmentListResponse> => {
  const response = await api.get<AssignmentListResponse>(
    `/ticket-assignments/team-member/${memberId}`,
    { params }
  );
  return response.data;
},

// 6. Reassign Ticket (if needed)
reassignTicket: async (assignmentId: string, data: {
  assignedToTeam: string;
  assignedByConsultant: string;
  assignmentNotes?: string;
}): Promise<AssignmentResponse> => {
  const response = await api.post<AssignmentResponse>(
    `/ticket-assignments/${assignmentId}/reassign`,
    data
  );
  return response.data;
},

// 7. Update Assignment Notes
updateAssignment: async (assignmentId: string, assignmentNotes: string): Promise<AssignmentResponse> => {
  const response = await api.put<AssignmentResponse>(
    `/ticket-assignments/${assignmentId}`,
    { assignmentNotes }
  );
  return response.data;
},
```

### Add Type Definitions

Add to [src/types/assignment.types.ts](src/types/assignment.types.ts):

```typescript
export interface AssignmentResponse {
  success: boolean;
  message?: string;
  data: TicketAssignment;
}

export interface CreateAssignmentData {
  ticket: string;
  assignedToTeam: string;
  assignedByConsultant: string;
  assignmentNotes?: string;
}

export interface ReassignTicketData {
  assignedToTeam: string;
  assignedByConsultant: string;
  assignmentNotes?: string;
}
```

---

## Phase 2: Add Redux Thunks

### File: [src/redux/slices/assignmentSlice.ts](src/redux/slices/assignmentSlice.ts)

Add these async thunks to your slice:

```typescript
// 1. Create Assignment
export const createAssignment = createAsyncThunk(
  'assignment/createAssignment',
  async (data: CreateAssignmentData, { rejectWithValue }) => {
    try {
      const response = await assignmentApi.createAssignment(data);
      toast.success('Ticket assigned successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to assign ticket';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// 2. Accept Assignment
export const acceptAssignment = createAsyncThunk(
  'assignment/acceptAssignment',
  async ({ assignmentId, teamMemberId }: { assignmentId: string; teamMemberId: string }, { rejectWithValue }) => {
    try {
      const response = await assignmentApi.acceptAssignment(assignmentId, teamMemberId);
      toast.success('Assignment accepted successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to accept assignment';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// 3. Get Current Assignment
export const fetchCurrentAssignment = createAsyncThunk(
  'assignment/fetchCurrentAssignment',
  async (ticketId: string, { rejectWithValue }) => {
    try {
      const response = await assignmentApi.getCurrentAssignment(ticketId);
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch current assignment';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// 4. Get Assignments by Team
export const fetchAssignmentsByTeam = createAsyncThunk(
  'assignment/fetchAssignmentsByTeam',
  async ({ teamId, params }: { teamId: string; params?: AssignmentQueryParams }, { rejectWithValue }) => {
    try {
      const response = await assignmentApi.getAssignmentsByTeam(teamId, params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch team assignments';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// 5. Get Assignments by Team Member
export const fetchAssignmentsByTeamMember = createAsyncThunk(
  'assignment/fetchAssignmentsByTeamMember',
  async ({ memberId, params }: { memberId: string; params?: AssignmentQueryParams }, { rejectWithValue }) => {
    try {
      const response = await assignmentApi.getAssignmentsByTeamMember(memberId, params);
      return response;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch member assignments';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// 6. Reassign Ticket
export const reassignTicket = createAsyncThunk(
  'assignment/reassignTicket',
  async ({ assignmentId, data }: { assignmentId: string; data: ReassignTicketData }, { rejectWithValue }) => {
    try {
      const response = await assignmentApi.reassignTicket(assignmentId, data);
      toast.success('Ticket reassigned successfully!');
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to reassign ticket';
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);
```

### Update State Interface

Add to the `AssignmentState` interface:

```typescript
interface AssignmentState {
  assignments: TicketAssignment[];
  currentAssignment: TicketAssignment | null;  // Add this
  stats: AssignmentStats | null;
  ticketHistory: TicketAssignment[];
  loading: boolean;
  statsLoading: boolean;
  historyLoading: boolean;
  error: string | null;
  total: number;
  page: number;
  pages: number;
}
```

Update `initialState`:

```typescript
const initialState: AssignmentState = {
  assignments: [],
  currentAssignment: null,  // Add this
  stats: null,
  ticketHistory: [],
  loading: false,
  statsLoading: false,
  historyLoading: false,
  error: null,
  total: 0,
  page: 1,
  pages: 1,
};
```

### Add Extra Reducers

Add these to the `extraReducers` builder:

```typescript
// Create Assignment
.addCase(createAssignment.pending, (state) => {
  state.loading = true;
  state.error = null;
})
.addCase(createAssignment.fulfilled, (state, action) => {
  state.loading = false;
  state.assignments.unshift(action.payload);
  state.total += 1;
})
.addCase(createAssignment.rejected, (state, action) => {
  state.loading = false;
  state.error = action.payload as string;
})

// Accept Assignment
.addCase(acceptAssignment.pending, (state) => {
  state.loading = true;
  state.error = null;
})
.addCase(acceptAssignment.fulfilled, (state, action) => {
  state.loading = false;
  const index = state.assignments.findIndex(a => a._id === action.payload._id);
  if (index !== -1) {
    state.assignments[index] = action.payload;
  }
  if (state.currentAssignment && state.currentAssignment._id === action.payload._id) {
    state.currentAssignment = action.payload;
  }
})
.addCase(acceptAssignment.rejected, (state, action) => {
  state.loading = false;
  state.error = action.payload as string;
})

// Fetch Current Assignment
.addCase(fetchCurrentAssignment.pending, (state) => {
  state.loading = true;
  state.error = null;
})
.addCase(fetchCurrentAssignment.fulfilled, (state, action) => {
  state.loading = false;
  state.currentAssignment = action.payload;
})
.addCase(fetchCurrentAssignment.rejected, (state, action) => {
  state.loading = false;
  state.error = action.payload as string;
})

// Fetch Assignments by Team
.addCase(fetchAssignmentsByTeam.pending, (state) => {
  state.loading = true;
  state.error = null;
})
.addCase(fetchAssignmentsByTeam.fulfilled, (state, action) => {
  state.loading = false;
  state.assignments = action.payload.data;
  state.total = action.payload.total;
  state.page = action.payload.page;
  state.pages = action.payload.pages;
})
.addCase(fetchAssignmentsByTeam.rejected, (state, action) => {
  state.loading = false;
  state.error = action.payload as string;
})

// Fetch Assignments by Team Member
.addCase(fetchAssignmentsByTeamMember.pending, (state) => {
  state.loading = true;
  state.error = null;
})
.addCase(fetchAssignmentsByTeamMember.fulfilled, (state, action) => {
  state.loading = false;
  state.assignments = action.payload.data;
  state.total = action.payload.total;
  state.page = action.payload.page;
  state.pages = action.payload.pages;
})
.addCase(fetchAssignmentsByTeamMember.rejected, (state, action) => {
  state.loading = false;
  state.error = action.payload as string;
})

// Reassign Ticket
.addCase(reassignTicket.pending, (state) => {
  state.loading = true;
  state.error = null;
})
.addCase(reassignTicket.fulfilled, (state, action) => {
  state.loading = false;
  state.assignments.unshift(action.payload);
})
.addCase(reassignTicket.rejected, (state, action) => {
  state.loading = false;
  state.error = action.payload as string;
})
```

---

## Phase 3: Create UI Components

### 1. Assign Ticket Dialog Component

Create: `src/components/assignment/AssignTicketDialog.tsx`

```typescript
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/redux/store';
import { createAssignment } from '@/redux/slices/assignmentSlice';
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
  teams: Array<{ _id: string; teamName: string }>;
}

export function AssignTicketDialog({
  open,
  onClose,
  ticketId,
  consultantId,
  teams,
}: AssignTicketDialogProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [selectedTeam, setSelectedTeam] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAssign = async () => {
    if (!selectedTeam) return;

    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Ticket to Team</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="team">Select Team *</Label>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team._id} value={team._id}>
                    {team.teamName}
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
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={!selectedTeam || loading}>
            {loading ? 'Assigning...' : 'Assign Ticket'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 2. Team Member Dashboard Component

Create: `src/pages/team-member/TeamMemberDashboard.tsx`

```typescript
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/redux/store';
import {
  fetchAssignmentsByTeamMember,
  acceptAssignment,
} from '@/redux/slices/assignmentSlice';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock } from 'lucide-react';

export default function TeamMemberDashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const { assignments, loading } = useSelector((state: RootState) => state.assignment);
  const { user } = useSelector((state: RootState) => state.auth);

  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted'>('all');

  useEffect(() => {
    if (user?._id) {
      dispatch(
        fetchAssignmentsByTeamMember({
          memberId: user._id,
          params: { isCurrent: true },
        })
      );
    }
  }, [dispatch, user]);

  const handleAccept = async (assignmentId: string) => {
    if (!user?._id) return;

    try {
      await dispatch(
        acceptAssignment({
          assignmentId,
          teamMemberId: user._id,
        })
      ).unwrap();
    } catch (error) {
      console.error('Failed to accept assignment:', error);
    }
  };

  const filteredAssignments = assignments.filter((assignment) => {
    if (filter === 'pending') return !assignment.acceptedBy;
    if (filter === 'accepted') return assignment.acceptedBy;
    return true;
  });

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">My Assignments</h1>
        <p className="text-gray-600">View and manage your ticket assignments</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          All ({assignments.length})
        </Button>
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          onClick={() => setFilter('pending')}
        >
          <Clock className="w-4 h-4 mr-2" />
          Pending ({assignments.filter((a) => !a.acceptedBy).length})
        </Button>
        <Button
          variant={filter === 'accepted' ? 'default' : 'outline'}
          onClick={() => setFilter('accepted')}
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Accepted ({assignments.filter((a) => a.acceptedBy).length})
        </Button>
      </div>

      {/* Assignments Table */}
      <div className="rounded-lg border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned At</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </TableCell>
              </TableRow>
            ) : filteredAssignments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No assignments found
                </TableCell>
              </TableRow>
            ) : (
              filteredAssignments.map((assignment) => (
                <TableRow key={assignment._id}>
                  <TableCell className="font-medium">
                    {assignment.ticket.ticketNumber}
                  </TableCell>
                  <TableCell>{assignment.ticket.subject}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        assignment.ticket.priority === 'critical'
                          ? 'destructive'
                          : 'default'
                      }
                    >
                      {assignment.ticket.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge>{assignment.ticket.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(assignment.assignedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {assignment.assignmentNotes || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {assignment.acceptedBy ? (
                      <Badge variant="outline" className="bg-green-50">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Accepted
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleAccept(assignment._id)}
                      >
                        Accept
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

### 3. Add "Assign" Button to Ticket Table

Update [src/pages/tickets/components/TicketTable.tsx](src/pages/tickets/components/TicketTable.tsx):

Add this button to the Actions column:

```typescript
import { UserPlus } from 'lucide-react';

// Inside the component
const [assignDialogOpen, setAssignDialogOpen] = useState(false);
const [selectedTicketId, setSelectedTicketId] = useState<string>('');

// In the Actions column TableCell:
<Button
  size="sm"
  variant="outline"
  onClick={() => {
    setSelectedTicketId(ticket._id);
    setAssignDialogOpen(true);
  }}
>
  <UserPlus className="w-4 h-4 mr-1" />
  Assign
</Button>

// Add the dialog outside the table:
<AssignTicketDialog
  open={assignDialogOpen}
  onClose={() => setAssignDialogOpen(false)}
  ticketId={selectedTicketId}
  consultantId={user._id} // Get from auth state
  teams={teams} // Fetch from team state
/>
```

---

## Phase 4: Update Ticket Detail Page

Update the ticket detail page to show:
1. Current assignment information
2. Assignment history
3. Assign/Reassign buttons

```typescript
// Fetch current assignment when ticket is loaded
useEffect(() => {
  if (ticketId) {
    dispatch(fetchCurrentAssignment(ticketId));
    dispatch(fetchTicketHistory(ticketId));
  }
}, [ticketId, dispatch]);

// Display current assignment info
const { currentAssignment, ticketHistory } = useSelector(
  (state: RootState) => state.assignment
);
```

---

## Phase 5: Create Team Dashboard

Create: `src/pages/team/TeamDashboard.tsx`

Show all tickets assigned to the team with filters for:
- Pending acceptance
- Accepted tickets
- Show which team member accepted each ticket

---

## API Endpoints Summary

All endpoints are available at `/api/ticket-assignments`:

| Method | Endpoint | Purpose | Used By |
|--------|----------|---------|---------|
| POST | `/` | Create assignment | Consultant |
| GET | `/` | Get all assignments | Admin |
| GET | `/:id` | Get assignment by ID | All |
| GET | `/ticket/:ticketId/current` | Get current assignment | Ticket detail page |
| GET | `/ticket/:ticketId/history` | Get assignment history | Ticket detail page |
| GET | `/team/:teamId` | Get team assignments | Team dashboard |
| GET | `/team-member/:memberId` | Get member assignments | Member dashboard |
| PATCH | `/:id/accept` | Accept assignment | Team member |
| POST | `/:id/reassign` | Reassign ticket | Consultant |
| PUT | `/:id` | Update notes | Consultant |
| GET | `/stats` | Get statistics | Dashboard |

---

## Testing Checklist

### Consultant Flow
- [ ] Open ticket list
- [ ] Click "Assign" button on a ticket
- [ ] Select a team from dropdown
- [ ] Add assignment notes
- [ ] Click "Assign Ticket"
- [ ] Verify ticket status changes to "assigned"
- [ ] Verify assignment appears in ticket detail

### Team Member Flow
- [ ] Login as team member
- [ ] Navigate to "My Assignments"
- [ ] See list of tickets assigned to their team
- [ ] Click "Accept" on a pending ticket
- [ ] Verify ticket status changes to "in_progress"
- [ ] Verify ticket appears in "Accepted" tab
- [ ] Click on ticket to work on it

### Team Dashboard Flow
- [ ] View all tickets assigned to team
- [ ] Filter by pending/accepted
- [ ] See which member accepted each ticket
- [ ] View assignment statistics

---

## Next Steps

1. **Phase 1**: Add missing API functions to `assignmentApi.ts`
2. **Phase 2**: Add Redux thunks to `assignmentSlice.ts`
3. **Phase 3**: Create UI components (AssignTicketDialog, TeamMemberDashboard)
4. **Phase 4**: Update TicketTable with Assign button
5. **Phase 5**: Create Team Dashboard
6. **Phase 6**: Test the complete workflow

---

## Notes

- All timestamps are in ISO 8601 format
- Authentication is required for all endpoints
- Only one assignment can be current (`isCurrent: true`) per ticket
- Team members can only accept assignments for their own team
- Accepting an assignment automatically updates ticket status to "in_progress"

---

## Quick Reference

### Key Redux Selectors
```typescript
const { assignments, loading, currentAssignment } = useSelector(
  (state: RootState) => state.assignment
);
```

### Key Redux Actions
```typescript
dispatch(createAssignment(data))           // Assign ticket
dispatch(acceptAssignment({ assignmentId, teamMemberId }))  // Accept ticket
dispatch(fetchCurrentAssignment(ticketId))  // Get current assignment
dispatch(fetchAssignmentsByTeamMember({ memberId, params }))  // Get member's tickets
```
