# Ticket Assignment Workflow Diagram

## Complete Flow Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     TICKET ASSIGNMENT WORKFLOW                       │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐
│   CONSULTANT     │        │       TEAM       │        │   TEAM MEMBER    │
│                  │        │                  │        │                  │
└────────┬─────────┘        └────────┬─────────┘        └────────┬─────────┘
         │                           │                           │
         │                           │                           │
    Step 1: Create Ticket            │                           │
         │                           │                           │
    ┌────▼────┐                      │                           │
    │ Ticket  │                      │                           │
    │ Status: │                      │                           │
    │  "new"  │                      │                           │
    └────┬────┘                      │                           │
         │                           │                           │
    Step 2: Assign to Team           │                           │
         │                           │                           │
         │  POST /ticket-assignments │                           │
         │  {                        │                           │
         │    ticket: ticketId,      │                           │
         │    assignedToTeam: teamId,│                           │
         │    assignedByConsultant   │                           │
         │  }                        │                           │
         ▼                           │                           │
    ┌────────┐                       │                           │
    │ Ticket │◄──────────────────────┘                           │
    │ Status:│         Notification                              │
    │"assigned"                                                  │
    └────────┘                       │                           │
         │                           │                           │
         │                           │                           │
         │              Step 3: Team sees assignment             │
         │                           │                           │
         │                      ┌────▼────┐                      │
         │                      │ Team    │                      │
         │                      │Dashboard│                      │
         │                      └────┬────┘                      │
         │                           │                           │
         │                           │   GET /team/:teamId       │
         │                           └──────────────────────┐    │
         │                                                  │    │
         │                                            ┌─────▼────▼──┐
         │                                            │  Assignment │
         │                                            │   List      │
         │                                            │  (Pending)  │
         │                                            └─────┬───────┘
         │                                                  │
         │                           Step 4: Member accepts │
         │                                                  │
         │                                  PATCH /:id/accept
         │                                  {               │
         │                                    teamMemberId  │
         │                                  }               │
         │                                                  ▼
         │                           ┌──────────────────────────┐
         │                           │      Assignment          │
         │                           │      acceptedBy: member  │
         │                           │      acceptedAt: now     │
         │                           └──────────┬───────────────┘
         │                                      │
         │                                      │
    ┌────▼─────┐                               │
    │ Ticket   │◄──────────────────────────────┘
    │ Status:  │          Automatic Update
    │"in_progress"
    └──────────┘
         │
         │
    Step 5: Member works on ticket
         │
         └────► Member updates ticket status
                (resolved, closed, etc.)
```

---

## Database State Transitions

### State 1: New Ticket Created
```json
{
  "_id": "ticket123",
  "ticketNumber": "TKT-2025-0001",
  "status": "new",
  "assignedTeam": null,
  "assignedBy": null
}
```

### State 2: Consultant Assigns to Team
```json
// Ticket Updated
{
  "_id": "ticket123",
  "status": "assigned",
  "assignedTeam": "team456",
  "assignedBy": "consultant789"
}

// New Assignment Created
{
  "_id": "assignment001",
  "ticket": "ticket123",
  "assignedToTeam": "team456",
  "assignedByConsultant": "consultant789",
  "assignmentNotes": "Urgent issue",
  "assignedAt": "2025-01-15T10:30:00Z",
  "acceptedBy": null,
  "acceptedAt": null,
  "isCurrent": true
}
```

### State 3: Team Member Accepts Assignment
```json
// Assignment Updated
{
  "_id": "assignment001",
  "ticket": "ticket123",
  "assignedToTeam": "team456",
  "assignedByConsultant": "consultant789",
  "acceptedBy": "member999",
  "acceptedAt": "2025-01-15T11:00:00Z",
  "isCurrent": true
}

// Ticket Updated
{
  "_id": "ticket123",
  "status": "in_progress",
  "assignedTeam": "team456"
}
```

---

## Component Interaction Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND COMPONENTS                           │
└─────────────────────────────────────────────────────────────────┘

Consultant View:
┌──────────────────┐
│  TicketTable     │
│  ┌────────────┐  │
│  │ [Assign]   │──┼──► Opens Dialog
│  └────────────┘  │
└──────────────────┘
        │
        ▼
┌──────────────────┐
│ AssignTicketDialog
│  ┌────────────┐  │
│  │Select Team │  │
│  │Add Notes   │  │
│  │[Assign]    │──┼──► dispatch(createAssignment)
│  └────────────┘  │
└──────────────────┘
        │
        ▼
┌──────────────────┐
│  Redux Store     │
│  assignmentSlice │
│                  │
│  - assignments[] │
│  - loading       │
│  - error         │
└──────────────────┘
        │
        ▼
┌──────────────────┐
│  API Layer       │
│  assignmentApi   │
│                  │
│  POST /assignments
└──────────────────┘
        │
        ▼
┌──────────────────┐
│  Backend API     │
│  (/api/...)      │
└──────────────────┘


Team Member View:
┌──────────────────┐
│TeamMemberDashboard
│  ┌────────────┐  │
│  │ Pending(5) │  │
│  │ Accepted(3)│  │
│  └────────────┘  │
│                  │
│  ┌──────────────────────────────┐
│  │ Ticket │ Status │ [Accept]  │
│  │ TKT-001│ pending│   Button  │──► dispatch(acceptAssignment)
│  └──────────────────────────────┘
└──────────────────┘
```

---

## API Call Sequence

### Sequence 1: Consultant Assigns Ticket

```
Client (Consultant)          Redux Store           API Server          Database
      │                           │                     │                  │
      │ Click "Assign"            │                     │                  │
      ├──────────────────────────►│                     │                  │
      │                           │                     │                  │
      │ dispatch(createAssignment)│                     │                  │
      │                           │                     │                  │
      │                           │ POST /assignments   │                  │
      │                           ├────────────────────►│                  │
      │                           │                     │                  │
      │                           │                     │ Create Assignment│
      │                           │                     ├─────────────────►│
      │                           │                     │                  │
      │                           │                     │ Update Ticket    │
      │                           │                     ├─────────────────►│
      │                           │                     │                  │
      │                           │      Response       │◄─────────────────┤
      │                           │◄────────────────────┤                  │
      │                           │                     │                  │
      │      Update State         │                     │                  │
      │◄──────────────────────────┤                     │                  │
      │                           │                     │                  │
      │   Show Success Toast      │                     │                  │
      │                           │                     │                  │
```

### Sequence 2: Team Member Accepts Assignment

```
Client (Team Member)       Redux Store           API Server          Database
      │                           │                     │                  │
      │ Click "Accept"            │                     │                  │
      ├──────────────────────────►│                     │                  │
      │                           │                     │                  │
      │ dispatch(acceptAssignment)│                     │                  │
      │                           │                     │                  │
      │                           │ PATCH /:id/accept   │                  │
      │                           ├────────────────────►│                  │
      │                           │                     │                  │
      │                           │                     │ Validate Member  │
      │                           │                     ├─────────────────►│
      │                           │                     │                  │
      │                           │                     │ Update Assignment│
      │                           │                     ├─────────────────►│
      │                           │                     │                  │
      │                           │                     │ Update Ticket    │
      │                           │                     ├─────────────────►│
      │                           │                     │                  │
      │                           │      Response       │◄─────────────────┤
      │                           │◄────────────────────┤                  │
      │                           │                     │                  │
      │      Update State         │                     │                  │
      │◄──────────────────────────┤                     │                  │
      │                           │                     │                  │
      │   Show Success Toast      │                     │                  │
      │                           │                     │                  │
```

---

## Redux State Management

### State Structure
```typescript
{
  assignment: {
    assignments: [
      {
        _id: "assignment001",
        ticket: { ticketNumber: "TKT-001", subject: "Login issue", ... },
        assignedToTeam: { teamName: "Support Team A", ... },
        assignedByConsultant: { firstName: "John", ... },
        acceptedBy: { firstName: "Jane", ... } | null,
        assignedAt: "2025-01-15T10:30:00Z",
        acceptedAt: "2025-01-15T11:00:00Z" | null,
        isCurrent: true
      }
    ],
    currentAssignment: { ... } | null,
    stats: {
      total: 150,
      current: 45,
      accepted: 120,
      pendingAcceptance: 12,
      byTeam: [...],
      byConsultant: [...]
    },
    ticketHistory: [...],
    loading: false,
    error: null,
    total: 45,
    page: 1,
    pages: 5
  }
}
```

### Actions Flow
```
User Action                Redux Action                API Call
    │                           │                          │
    ├─ Assign Ticket ──────────►├─ createAssignment ─────►├─ POST /assignments
    │                           │                          │
    ├─ Accept Assignment ──────►├─ acceptAssignment ─────►├─ PATCH /:id/accept
    │                           │                          │
    ├─ View My Tickets ────────►├─ fetchByTeamMember ────►├─ GET /team-member/:id
    │                           │                          │
    ├─ View Team Dashboard ────►├─ fetchByTeam ──────────►├─ GET /team/:teamId
    │                           │                          │
    └─ View History ───────────►└─ fetchTicketHistory ───►└─ GET /ticket/:id/history
```

---

## User Interface Views

### 1. Consultant - Ticket Table with Assign Button
```
┌────────────────────────────────────────────────────────────────┐
│ Tickets                                              [+ Create] │
├────────────────────────────────────────────────────────────────┤
│ Ticket #    Subject         Status      Actions                │
├────────────────────────────────────────────────────────────────┤
│ TKT-001     Login issue     new         [Edit] [Assign] [Del] │
│ TKT-002     Bug fix         assigned    [Edit] [View]   [Del] │
│ TKT-003     Feature req     new         [Edit] [Assign] [Del] │
└────────────────────────────────────────────────────────────────┘
```

### 2. Assign Ticket Dialog
```
┌─────────────────────────────────────────┐
│ Assign Ticket to Team            [X]    │
├─────────────────────────────────────────┤
│                                         │
│ Select Team *                           │
│ ┌─────────────────────────────────────┐ │
│ │ Support Team A              ▼       │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Assignment Notes                        │
│ ┌─────────────────────────────────────┐ │
│ │ Urgent issue, requires immediate    │ │
│ │ attention...                        │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│              [Cancel]  [Assign Ticket]  │
└─────────────────────────────────────────┘
```

### 3. Team Member Dashboard
```
┌────────────────────────────────────────────────────────────────┐
│ My Assignments                                                  │
├────────────────────────────────────────────────────────────────┤
│ [All (8)]  [⏱ Pending (5)]  [✓ Accepted (3)]                  │
├────────────────────────────────────────────────────────────────┤
│ Ticket    Subject         Priority  Status      Actions        │
├────────────────────────────────────────────────────────────────┤
│ TKT-001   Login issue     High      assigned    [Accept]       │
│ TKT-002   Bug fix         Medium    assigned    [Accept]       │
│ TKT-005   Feature         Low       in_progress [✓ Accepted]   │
└────────────────────────────────────────────────────────────────┘
```

### 4. Team Dashboard
```
┌────────────────────────────────────────────────────────────────┐
│ Team Dashboard - Support Team A                                │
├────────────────────────────────────────────────────────────────┤
│ Statistics                                                      │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│ │ Total: 25    │ │ Pending: 12  │ │ Accepted: 13 │           │
│ └──────────────┘ └──────────────┘ └──────────────┘           │
├────────────────────────────────────────────────────────────────┤
│ Ticket    Subject         Accepted By       Status             │
├────────────────────────────────────────────────────────────────┤
│ TKT-001   Login issue     Jane Smith        in_progress        │
│ TKT-002   Bug fix         Not accepted      assigned           │
│ TKT-003   Feature         John Doe          in_progress        │
└────────────────────────────────────────────────────────────────┘
```

---

## Error Handling

### Common Error Scenarios

1. **Assignment to non-existent team**
   - API returns: 404 Not Found
   - UI shows: "Team not found. Please select a valid team."

2. **Team member accepts assignment for wrong team**
   - API returns: 400 Bad Request
   - UI shows: "You cannot accept this assignment. It's not assigned to your team."

3. **Already accepted assignment**
   - API returns: 400 Bad Request
   - UI shows: "This assignment has already been accepted."

4. **Network failure**
   - Redux catches error
   - UI shows: "Failed to connect. Please check your internet connection."

---

## Performance Considerations

1. **Pagination**: All list endpoints support pagination
   - Default: 10 items per page
   - Can be adjusted: `?page=2&limit=20`

2. **Filtering**: Reduce data transfer
   - Filter by team: `?assignedToTeam=teamId`
   - Filter by current: `?isCurrent=true`

3. **Caching**: Redux stores assignments
   - Avoids repeated API calls
   - Invalidate on create/update/accept

4. **Real-time Updates**: Consider implementing
   - WebSocket for instant notifications
   - Polling every 30 seconds for updates

---

## Security Considerations

1. **Authorization Checks**
   - Consultants can only assign tickets
   - Team members can only accept assignments for their team
   - Backend validates team membership

2. **Data Validation**
   - All IDs are validated as MongoDB ObjectIds
   - Required fields are checked
   - Team membership is verified before acceptance

3. **Authentication**
   - All endpoints require valid auth token
   - Token is sent in Authorization header
   - JWT token contains user role and ID
