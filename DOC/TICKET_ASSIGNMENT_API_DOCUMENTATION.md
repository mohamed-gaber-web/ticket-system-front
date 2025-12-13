# Ticket Assignment Module - API Documentation for Frontend Integration

## Base URL
```
/api/ticket-assignments
```

## Authentication
All endpoints require authentication via Bearer Token or Cookie Authentication.

---

## Data Types & Models

### TicketAssignment Object

```typescript
interface TicketAssignment {
  _id: string;                           // MongoDB ObjectId
  ticket: string | Ticket;               // Reference to Ticket ID (required)
  assignedToTeam: string | Team;         // Reference to Team ID (required)
  assignedByConsultant: string | Consultant; // Reference to Consultant ID (required)
  assignmentNotes: string;               // Optional notes
  assignedAt: string;                    // ISO 8601 date string (auto-set)
  acceptedAt: string | null;             // ISO 8601 date string (set when accepted)
  acceptedBy: string | TeamMember | null; // Reference to TeamMember ID
  isCurrent: boolean;                    // Is this the current assignment (default: true)
  createdAt: string;                     // ISO 8601 date string
  updatedAt: string;                     // ISO 8601 date string
}
```

### Ticket Object (Referenced)

```typescript
interface Ticket {
  _id: string;
  ticketNumber: string;
  subject: string;
  description?: string;
  status: string;
  priority: string;
  customer?: string;
}
```

### Team Object (Referenced)

```typescript
interface Team {
  _id: string;
  teamName: string;
  department: string;
  specialization?: string;
}
```

### Consultant Object (Referenced)

```typescript
interface Consultant {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}
```

### TeamMember Object (Referenced)

```typescript
interface TeamMember {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  team: string;
  fullName: string;
}
```

### API Response Format

#### Success Response
```typescript
interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}
```

#### List Response (Paginated)
```typescript
interface ListResponse<T> {
  success: true;
  count: number;      // Number of items in current page
  total: number;      // Total number of items
  page: number;       // Current page number
  pages: number;      // Total number of pages
  data: T[];
}
```

#### Error Response
```typescript
interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
  errors?: string[];  // For validation errors
}
```

---

## API Endpoints

### 1. Get All Ticket Assignments

**Endpoint:** `GET /api/ticket-assignments`

**Description:** Retrieve a paginated list of ticket assignments with filtering capabilities.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 10 | Items per page |
| ticket | string | - | Filter by ticket ID |
| assignedToTeam | string | - | Filter by team ID |
| assignedByConsultant | string | - | Filter by consultant ID |
| acceptedBy | string | - | Filter by team member ID |
| isCurrent | boolean | - | Filter by current status ("true" or "false") |

**Example Request:**
```javascript
GET /api/ticket-assignments?page=1&limit=10&isCurrent=true&assignedToTeam=60d5ec49f1b2c72b8c8e4f1a
```

**Success Response:** `200 OK`
```json
{
  "success": true,
  "count": 10,
  "total": 45,
  "page": 1,
  "pages": 5,
  "data": [
    {
      "_id": "60d5ec49f1b2c72b8c8e4f2a",
      "ticket": {
        "_id": "60d5ec49f1b2c72b8c8e4f1a",
        "ticketNumber": "TKT-2025-0001",
        "subject": "Login issue",
        "status": "assigned",
        "priority": "high"
      },
      "assignedToTeam": {
        "_id": "60d5ec49f1b2c72b8c8e4f1b",
        "teamName": "Support Team A",
        "department": "Customer Support"
      },
      "assignedByConsultant": {
        "_id": "60d5ec49f1b2c72b8c8e4f1c",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      },
      "acceptedBy": {
        "_id": "60d5ec49f1b2c72b8c8e4f1d",
        "firstName": "Jane",
        "lastName": "Smith",
        "email": "jane@example.com"
      },
      "assignmentNotes": "Urgent issue, requires immediate attention",
      "assignedAt": "2025-01-15T10:30:00.000Z",
      "acceptedAt": "2025-01-15T11:00:00.000Z",
      "isCurrent": true,
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T11:00:00.000Z"
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `500 Internal Server Error` - Server error

---

### 2. Get Ticket Assignment by ID

**Endpoint:** `GET /api/ticket-assignments/:id`

**Description:** Retrieve detailed information about a specific ticket assignment.

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | TicketAssignment MongoDB ObjectId |

**Example Request:**
```javascript
GET /api/ticket-assignments/60d5ec49f1b2c72b8c8e4f2a
```

**Success Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "_id": "60d5ec49f1b2c72b8c8e4f2a",
    "ticket": {
      "_id": "60d5ec49f1b2c72b8c8e4f1a",
      "ticketNumber": "TKT-2025-0001",
      "subject": "Login issue",
      "description": "User cannot log in to the system",
      "status": "in_progress",
      "priority": "high",
      "customer": "60d5ec49f1b2c72b8c8e4f1e"
    },
    "assignedToTeam": {
      "_id": "60d5ec49f1b2c72b8c8e4f1b",
      "teamName": "Support Team A",
      "department": "Customer Support",
      "specialization": "Technical Support"
    },
    "assignedByConsultant": {
      "_id": "60d5ec49f1b2c72b8c8e4f1c",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+1234567890"
    },
    "acceptedBy": {
      "_id": "60d5ec49f1b2c72b8c8e4f1d",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane@example.com",
      "phone": "+1234567891",
      "team": "60d5ec49f1b2c72b8c8e4f1b"
    },
    "assignmentNotes": "Urgent issue, requires immediate attention",
    "assignedAt": "2025-01-15T10:30:00.000Z",
    "acceptedAt": "2025-01-15T11:00:00.000Z",
    "isCurrent": true,
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T11:00:00.000Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Assignment not found
- `500 Internal Server Error` - Server error

---

### 3. Get Current Assignment for Ticket

**Endpoint:** `GET /api/ticket-assignments/ticket/:ticketId/current`

**Description:** Retrieve the current active assignment for a specific ticket.

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| ticketId | string | Yes | Ticket MongoDB ObjectId |

**Example Request:**
```javascript
GET /api/ticket-assignments/ticket/60d5ec49f1b2c72b8c8e4f1a/current
```

**Success Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "_id": "60d5ec49f1b2c72b8c8e4f2a",
    "ticket": "60d5ec49f1b2c72b8c8e4f1a",
    "assignedToTeam": {
      "_id": "60d5ec49f1b2c72b8c8e4f1b",
      "teamName": "Support Team A"
    },
    "assignedByConsultant": {
      "_id": "60d5ec49f1b2c72b8c8e4f1c",
      "firstName": "John",
      "lastName": "Doe"
    },
    "acceptedBy": {
      "_id": "60d5ec49f1b2c72b8c8e4f1d",
      "firstName": "Jane",
      "lastName": "Smith"
    },
    "assignmentNotes": "Urgent issue",
    "assignedAt": "2025-01-15T10:30:00.000Z",
    "acceptedAt": "2025-01-15T11:00:00.000Z",
    "isCurrent": true,
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T11:00:00.000Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Ticket not found or no current assignment
- `500 Internal Server Error` - Server error

---

### 4. Get Assignment History for Ticket

**Endpoint:** `GET /api/ticket-assignments/ticket/:ticketId/history`

**Description:** Retrieve the complete assignment history for a ticket, showing all past and current assignments.

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| ticketId | string | Yes | Ticket MongoDB ObjectId |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 10 | Items per page |

**Example Request:**
```javascript
GET /api/ticket-assignments/ticket/60d5ec49f1b2c72b8c8e4f1a/history?page=1&limit=10
```

**Success Response:** `200 OK`
```json
{
  "success": true,
  "count": 3,
  "total": 3,
  "page": 1,
  "pages": 1,
  "ticket": {
    "id": "60d5ec49f1b2c72b8c8e4f1a",
    "ticketNumber": "TKT-2025-0001",
    "subject": "Login issue"
  },
  "data": [
    {
      "_id": "60d5ec49f1b2c72b8c8e4f2c",
      "ticket": "60d5ec49f1b2c72b8c8e4f1a",
      "assignedToTeam": {
        "_id": "60d5ec49f1b2c72b8c8e4f1b",
        "teamName": "Support Team A",
        "department": "Customer Support"
      },
      "assignedByConsultant": {
        "_id": "60d5ec49f1b2c72b8c8e4f1c",
        "firstName": "John",
        "lastName": "Doe"
      },
      "acceptedBy": {
        "_id": "60d5ec49f1b2c72b8c8e4f1d",
        "firstName": "Jane",
        "lastName": "Smith"
      },
      "assignmentNotes": "Reassigned after escalation",
      "assignedAt": "2025-01-15T14:30:00.000Z",
      "acceptedAt": "2025-01-15T15:00:00.000Z",
      "isCurrent": true
    },
    {
      "_id": "60d5ec49f1b2c72b8c8e4f2b",
      "ticket": "60d5ec49f1b2c72b8c8e4f1a",
      "assignedToTeam": {
        "_id": "60d5ec49f1b2c72b8c8e4f2d",
        "teamName": "Support Team B",
        "department": "Technical Support"
      },
      "assignedByConsultant": {
        "_id": "60d5ec49f1b2c72b8c8e4f1c",
        "firstName": "John",
        "lastName": "Doe"
      },
      "acceptedBy": null,
      "assignmentNotes": "Initial assignment",
      "assignedAt": "2025-01-15T10:30:00.000Z",
      "acceptedAt": null,
      "isCurrent": false
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Ticket not found
- `500 Internal Server Error` - Server error

---

### 5. Create Ticket Assignment

**Endpoint:** `POST /api/ticket-assignments`

**Description:** Create a new ticket assignment. Automatically marks previous assignments as not current and updates ticket status.

**Request Body:**

```typescript
interface CreateTicketAssignmentRequest {
  ticket: string;                    // Required, Ticket ID
  assignedToTeam: string;            // Required, Team ID
  assignedByConsultant: string;      // Required, Consultant ID
  assignmentNotes?: string;          // Optional notes
}
```

**Example Request:**
```javascript
POST /api/ticket-assignments
Content-Type: application/json

{
  "ticket": "60d5ec49f1b2c72b8c8e4f1a",
  "assignedToTeam": "60d5ec49f1b2c72b8c8e4f1b",
  "assignedByConsultant": "60d5ec49f1b2c72b8c8e4f1c",
  "assignmentNotes": "Urgent issue, requires immediate attention"
}
```

**Success Response:** `201 Created`
```json
{
  "success": true,
  "message": "Ticket assignment created successfully",
  "data": {
    "_id": "60d5ec49f1b2c72b8c8e4f2a",
    "ticket": {
      "_id": "60d5ec49f1b2c72b8c8e4f1a",
      "ticketNumber": "TKT-2025-0001",
      "subject": "Login issue",
      "status": "assigned",
      "priority": "high"
    },
    "assignedToTeam": {
      "_id": "60d5ec49f1b2c72b8c8e4f1b",
      "teamName": "Support Team A",
      "department": "Customer Support"
    },
    "assignedByConsultant": {
      "_id": "60d5ec49f1b2c72b8c8e4f1c",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    "assignmentNotes": "Urgent issue, requires immediate attention",
    "assignedAt": "2025-01-15T10:30:00.000Z",
    "acceptedAt": null,
    "acceptedBy": null,
    "isCurrent": true,
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Validation error
  ```json
  {
    "success": false,
    "message": "Validation error",
    "errors": ["Ticket is required", "Team is required"]
  }
  ```
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Ticket, team, or consultant not found
- `500 Internal Server Error` - Server error

**Business Rules:**
- Automatically marks all previous assignments for the ticket as `isCurrent: false`
- If ticket status is "new", it will be updated to "assigned"
- The ticket's `assignedTeam` and `assignedBy` fields are updated
- New assignment is automatically set as `isCurrent: true`

---

### 6. Update Ticket Assignment

**Endpoint:** `PUT /api/ticket-assignments/:id`

**Description:** Update an existing ticket assignment. Only assignment notes can be updated.

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | TicketAssignment MongoDB ObjectId |

**Request Body:**

```typescript
interface UpdateTicketAssignmentRequest {
  assignmentNotes: string;  // Assignment notes
}
```

**Example Request:**
```javascript
PUT /api/ticket-assignments/60d5ec49f1b2c72b8c8e4f2a
Content-Type: application/json

{
  "assignmentNotes": "Updated notes: Customer reported additional issues"
}
```

**Success Response:** `200 OK`
```json
{
  "success": true,
  "message": "Ticket assignment updated successfully",
  "data": {
    "_id": "60d5ec49f1b2c72b8c8e4f2a",
    "ticket": {
      "_id": "60d5ec49f1b2c72b8c8e4f1a",
      "ticketNumber": "TKT-2025-0001",
      "subject": "Login issue",
      "status": "in_progress",
      "priority": "high"
    },
    "assignedToTeam": {
      "_id": "60d5ec49f1b2c72b8c8e4f1b",
      "teamName": "Support Team A",
      "department": "Customer Support"
    },
    "assignedByConsultant": {
      "_id": "60d5ec49f1b2c72b8c8e4f1c",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    "acceptedBy": {
      "_id": "60d5ec49f1b2c72b8c8e4f1d",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane@example.com"
    },
    "assignmentNotes": "Updated notes: Customer reported additional issues",
    "assignedAt": "2025-01-15T10:30:00.000Z",
    "acceptedAt": "2025-01-15T11:00:00.000Z",
    "isCurrent": true,
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T12:30:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Assignment not found
- `500 Internal Server Error` - Server error

**Note:** To change the team or consultant, use the reassign endpoint instead.

---

### 7. Accept Ticket Assignment

**Endpoint:** `PATCH /api/ticket-assignments/:id/accept`

**Description:** Accept a ticket assignment by a team member. Updates ticket status to "in_progress".

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | TicketAssignment MongoDB ObjectId |

**Request Body:**

```typescript
interface AcceptAssignmentRequest {
  teamMemberId: string;  // Required, TeamMember ID
}
```

**Example Request:**
```javascript
PATCH /api/ticket-assignments/60d5ec49f1b2c72b8c8e4f2a/accept
Content-Type: application/json

{
  "teamMemberId": "60d5ec49f1b2c72b8c8e4f1d"
}
```

**Success Response:** `200 OK`
```json
{
  "success": true,
  "message": "Ticket assignment accepted successfully",
  "data": {
    "_id": "60d5ec49f1b2c72b8c8e4f2a",
    "ticket": {
      "_id": "60d5ec49f1b2c72b8c8e4f1a",
      "ticketNumber": "TKT-2025-0001",
      "subject": "Login issue",
      "status": "in_progress",
      "priority": "high"
    },
    "assignedToTeam": {
      "_id": "60d5ec49f1b2c72b8c8e4f1b",
      "teamName": "Support Team A",
      "department": "Customer Support"
    },
    "assignedByConsultant": {
      "_id": "60d5ec49f1b2c72b8c8e4f1c",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    "acceptedBy": {
      "_id": "60d5ec49f1b2c72b8c8e4f1d",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane@example.com"
    },
    "assignmentNotes": "Urgent issue, requires immediate attention",
    "assignedAt": "2025-01-15T10:30:00.000Z",
    "acceptedAt": "2025-01-15T11:00:00.000Z",
    "isCurrent": true,
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T11:00:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Team member ID is required
  ```json
  {
    "success": false,
    "message": "Team member ID is required"
  }
  ```
- `400 Bad Request` - Team member does not belong to the assigned team
  ```json
  {
    "success": false,
    "message": "Team member does not belong to the assigned team"
  }
  ```
- `400 Bad Request` - Assignment already accepted
  ```json
  {
    "success": false,
    "message": "Assignment already accepted"
  }
  ```
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Assignment or team member not found
- `500 Internal Server Error` - Server error

**Business Rules:**
- Team member must belong to the assigned team
- Assignment can only be accepted once
- Ticket status is automatically updated to "in_progress"
- Sets `acceptedBy` and `acceptedAt` fields

---

### 8. Reassign Ticket

**Endpoint:** `POST /api/ticket-assignments/:id/reassign`

**Description:** Reassign a ticket to a different team. Creates a new assignment and marks the current one as not current.

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Current TicketAssignment MongoDB ObjectId |

**Request Body:**

```typescript
interface ReassignTicketRequest {
  assignedToTeam: string;            // Required, new Team ID
  assignedByConsultant: string;      // Required, Consultant ID
  assignmentNotes?: string;          // Optional notes
}
```

**Example Request:**
```javascript
POST /api/ticket-assignments/60d5ec49f1b2c72b8c8e4f2a/reassign
Content-Type: application/json

{
  "assignedToTeam": "60d5ec49f1b2c72b8c8e4f2d",
  "assignedByConsultant": "60d5ec49f1b2c72b8c8e4f1c",
  "assignmentNotes": "Escalated to technical team"
}
```

**Success Response:** `201 Created`
```json
{
  "success": true,
  "message": "Ticket reassigned successfully",
  "data": {
    "_id": "60d5ec49f1b2c72b8c8e4f2e",
    "ticket": {
      "_id": "60d5ec49f1b2c72b8c8e4f1a",
      "ticketNumber": "TKT-2025-0001",
      "subject": "Login issue",
      "status": "assigned",
      "priority": "high"
    },
    "assignedToTeam": {
      "_id": "60d5ec49f1b2c72b8c8e4f2d",
      "teamName": "Technical Support Team",
      "department": "Engineering"
    },
    "assignedByConsultant": {
      "_id": "60d5ec49f1b2c72b8c8e4f1c",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    "assignmentNotes": "Escalated to technical team",
    "assignedAt": "2025-01-15T14:30:00.000Z",
    "acceptedAt": null,
    "acceptedBy": null,
    "isCurrent": true,
    "createdAt": "2025-01-15T14:30:00.000Z",
    "updatedAt": "2025-01-15T14:30:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Assignment, team, or consultant not found
- `500 Internal Server Error` - Server error

**Business Rules:**
- Marks current assignment as `isCurrent: false`
- Creates new assignment with `isCurrent: true`
- Ticket status is updated to "assigned"
- Ticket's `assignedTeam` and `assignedBy` fields are updated
- Previous assignment remains in history

---

### 9. Delete Ticket Assignment

**Endpoint:** `DELETE /api/ticket-assignments/:id`

**Description:** Delete a ticket assignment record.

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | TicketAssignment MongoDB ObjectId |

**Example Request:**
```javascript
DELETE /api/ticket-assignments/60d5ec49f1b2c72b8c8e4f2a
```

**Success Response:** `200 OK`
```json
{
  "success": true,
  "message": "Ticket assignment deleted successfully",
  "data": {}
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Assignment not found
- `500 Internal Server Error` - Server error

**Warning:** Deleting assignments may affect ticket history and reporting. Use with caution.

---

### 10. Get Ticket Assignment Statistics

**Endpoint:** `GET /api/ticket-assignments/stats`

**Description:** Retrieve comprehensive statistics about ticket assignments including totals, breakdowns by team and consultant.

**Example Request:**
```javascript
GET /api/ticket-assignments/stats
```

**Success Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "total": 150,
    "current": 45,
    "accepted": 120,
    "pendingAcceptance": 12,
    "byTeam": [
      {
        "_id": "60d5ec49f1b2c72b8c8e4f1b",
        "teamName": "Support Team A",
        "count": 25
      },
      {
        "_id": "60d5ec49f1b2c72b8c8e4f2d",
        "teamName": "Technical Support Team",
        "count": 20
      }
    ],
    "byConsultant": [
      {
        "_id": "60d5ec49f1b2c72b8c8e4f1c",
        "consultantName": "John Doe",
        "count": 80
      },
      {
        "_id": "60d5ec49f1b2c72b8c8e4f2f",
        "consultantName": "Mary Johnson",
        "count": 70
      }
    ]
  }
}
```

**Response Fields:**
- `total`: Total number of all assignments
- `current`: Number of current assignments (isCurrent = true)
- `accepted`: Number of assignments that have been accepted
- `pendingAcceptance`: Number of current assignments not yet accepted
- `byTeam`: Assignment count grouped by team (current only)
- `byConsultant`: Assignment count grouped by consultant (all time)

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `500 Internal Server Error` - Server error

---

### 11. Get Assignments by Team

**Endpoint:** `GET /api/ticket-assignments/team/:teamId`

**Description:** Retrieve all assignments for a specific team with pagination.

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| teamId | string | Yes | Team MongoDB ObjectId |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 10 | Items per page |
| isCurrent | boolean | - | Filter by current status ("true" or "false") |

**Example Request:**
```javascript
GET /api/ticket-assignments/team/60d5ec49f1b2c72b8c8e4f1b?page=1&limit=10&isCurrent=true
```

**Success Response:** `200 OK`
```json
{
  "success": true,
  "count": 10,
  "total": 25,
  "page": 1,
  "pages": 3,
  "team": {
    "id": "60d5ec49f1b2c72b8c8e4f1b",
    "name": "Support Team A"
  },
  "data": [
    {
      "_id": "60d5ec49f1b2c72b8c8e4f2a",
      "ticket": {
        "_id": "60d5ec49f1b2c72b8c8e4f1a",
        "ticketNumber": "TKT-2025-0001",
        "subject": "Login issue",
        "status": "in_progress",
        "priority": "high"
      },
      "assignedToTeam": "60d5ec49f1b2c72b8c8e4f1b",
      "assignedByConsultant": {
        "_id": "60d5ec49f1b2c72b8c8e4f1c",
        "firstName": "John",
        "lastName": "Doe"
      },
      "acceptedBy": {
        "_id": "60d5ec49f1b2c72b8c8e4f1d",
        "firstName": "Jane",
        "lastName": "Smith"
      },
      "assignmentNotes": "Urgent issue",
      "assignedAt": "2025-01-15T10:30:00.000Z",
      "acceptedAt": "2025-01-15T11:00:00.000Z",
      "isCurrent": true
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Team not found
- `500 Internal Server Error` - Server error

---

### 12. Get Assignments by Team Member

**Endpoint:** `GET /api/ticket-assignments/team-member/:memberId`

**Description:** Retrieve all assignments accepted by a specific team member with pagination.

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| memberId | string | Yes | TeamMember MongoDB ObjectId |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 10 | Items per page |
| isCurrent | boolean | - | Filter by current status ("true" or "false") |

**Example Request:**
```javascript
GET /api/ticket-assignments/team-member/60d5ec49f1b2c72b8c8e4f1d?page=1&limit=10&isCurrent=true
```

**Success Response:** `200 OK`
```json
{
  "success": true,
  "count": 8,
  "total": 8,
  "page": 1,
  "pages": 1,
  "teamMember": {
    "id": "60d5ec49f1b2c72b8c8e4f1d",
    "name": "Jane Smith"
  },
  "data": [
    {
      "_id": "60d5ec49f1b2c72b8c8e4f2a",
      "ticket": {
        "_id": "60d5ec49f1b2c72b8c8e4f1a",
        "ticketNumber": "TKT-2025-0001",
        "subject": "Login issue",
        "status": "in_progress",
        "priority": "high"
      },
      "assignedToTeam": {
        "_id": "60d5ec49f1b2c72b8c8e4f1b",
        "teamName": "Support Team A"
      },
      "assignedByConsultant": {
        "_id": "60d5ec49f1b2c72b8c8e4f1c",
        "firstName": "John",
        "lastName": "Doe"
      },
      "acceptedBy": "60d5ec49f1b2c72b8c8e4f1d",
      "assignmentNotes": "Urgent issue",
      "assignedAt": "2025-01-15T10:30:00.000Z",
      "acceptedAt": "2025-01-15T11:00:00.000Z",
      "isCurrent": true
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Team member not found
- `500 Internal Server Error` - Server error

---

## Field Validation Summary

### TicketAssignment Model Constraints

| Field | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| ticket | ObjectId | Yes | - | Must be valid Ticket ID |
| assignedToTeam | ObjectId | Yes | - | Must be valid Team ID |
| assignedByConsultant | ObjectId | Yes | - | Must be valid Consultant ID |
| assignmentNotes | String | No | - | Trimmed |
| assignedAt | Date | No | Date.now | Auto-generated |
| acceptedAt | Date | No | null | Set when accepted |
| acceptedBy | ObjectId | No | null | Must be valid TeamMember ID |
| isCurrent | Boolean | No | true | Auto-managed |

---

## Assignment Lifecycle

### 1. Initial Assignment
```
Status: New Assignment Created
- isCurrent: true
- acceptedBy: null
- acceptedAt: null
- Ticket status: "assigned"
```

### 2. Assignment Accepted
```
Status: Assignment Accepted
- isCurrent: true
- acceptedBy: TeamMember ID
- acceptedAt: timestamp
- Ticket status: "in_progress"
```

### 3. Reassignment
```
Status: New Assignment Created, Previous Marked Historical
Old Assignment:
- isCurrent: false (unchanged acceptedBy/acceptedAt)

New Assignment:
- isCurrent: true
- acceptedBy: null
- acceptedAt: null
- Ticket status: "assigned"
```

---

## Common Error Codes

| Status Code | Meaning | Common Causes |
|-------------|---------|---------------|
| 400 | Bad Request | Validation errors, already accepted, wrong team member |
| 401 | Unauthorized | Missing or invalid authentication token |
| 404 | Not Found | Assignment, ticket, team, consultant, or team member not found |
| 500 | Internal Server Error | Database errors, unexpected server errors |

---

## Frontend Implementation Checklist

### Required Features

- [ ] **Assignment List Page**
  - [ ] Display paginated assignments
  - [ ] Filter by ticket, team, consultant, team member
  - [ ] Filter by current/historical assignments
  - [ ] Show assignment status (accepted/pending)
  - [ ] Display ticket details
  - [ ] Display assigned team and consultant

- [ ] **Assignment Detail Page**
  - [ ] Display full assignment information
  - [ ] Show ticket details
  - [ ] Show team and consultant details
  - [ ] Show acceptance information if accepted
  - [ ] Display assignment notes
  - [ ] Accept button (if not accepted and user is team member)
  - [ ] Reassign button
  - [ ] Edit notes button

- [ ] **Create Assignment Form**
  - [ ] Ticket selector (dropdown)
  - [ ] Team selector (dropdown)
  - [ ] Consultant selector (dropdown)
  - [ ] Assignment notes textarea
  - [ ] Form validation
  - [ ] Success/error notifications

- [ ] **Accept Assignment Action**
  - [ ] Confirmation dialog
  - [ ] Team member selector (if multiple members)
  - [ ] Success notification
  - [ ] Auto-refresh assignment details

- [ ] **Reassign Ticket Form**
  - [ ] New team selector (dropdown)
  - [ ] Consultant selector (dropdown)
  - [ ] Reassignment notes textarea
  - [ ] Confirmation dialog
  - [ ] Success/error notifications

- [ ] **Assignment History View**
  - [ ] Display all assignments for a ticket
  - [ ] Show timeline/chronological order
  - [ ] Highlight current assignment
  - [ ] Show acceptance status
  - [ ] Display notes for each assignment

- [ ] **Team Dashboard**
  - [ ] Show all current assignments for team
  - [ ] Filter by accepted/pending
  - [ ] Show pending acceptance count
  - [ ] Quick accept action

- [ ] **Team Member Dashboard**
  - [ ] Show all assignments accepted by member
  - [ ] Filter by current/historical
  - [ ] Show workload statistics
  - [ ] Link to ticket details

- [ ] **Statistics Dashboard**
  - [ ] Total assignments count
  - [ ] Current assignments count
  - [ ] Accepted assignments count
  - [ ] Pending acceptance count
  - [ ] Assignments by team (chart)
  - [ ] Assignments by consultant (chart)

### Recommended UI Components

1. **Data Table Component** - For assignment lists
2. **Form Components** - Select dropdowns, textarea with validation
3. **Modal/Dialog** - For create, accept, reassign, and delete confirmations
4. **Pagination Component** - For all list views
5. **Filter Panel** - For status and entity filters
6. **Timeline Component** - For assignment history
7. **Cards** - For displaying assignment details
8. **Charts** - For statistics (pie/bar charts)
9. **Badge/Tag** - For status indicators (current, accepted, pending)
10. **Toast/Notification** - For success/error messages
11. **Loading States** - Spinners/skeletons during API calls

### State Management Recommendations

```typescript
// Example state structure
interface AssignmentState {
  assignments: TicketAssignment[];
  currentAssignment: TicketAssignment | null;
  history: TicketAssignment[];
  stats: AssignmentStats | null;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    ticket?: string;
    assignedToTeam?: string;
    assignedByConsultant?: string;
    acceptedBy?: string;
    isCurrent?: boolean;
  };
}

interface AssignmentStats {
  total: number;
  current: number;
  accepted: number;
  pendingAcceptance: number;
  byTeam: Array<{ _id: string; teamName: string; count: number }>;
  byConsultant: Array<{ _id: string; consultantName: string; count: number }>;
}
```

### API Integration Tips

1. **Error Handling**: Always check `success` field in response
2. **Loading States**: Show loading indicators during API calls
3. **Pagination**: Track current page and update on navigation
4. **Real-time Updates**: Consider polling for assignment status updates
5. **Optimistic Updates**: Update UI immediately, rollback on error
6. **Authentication**: Include auth token in all requests
7. **Toast Notifications**: Show user-friendly messages from API responses
8. **Confirmation Dialogs**: Always confirm destructive actions
9. **Validation**: Validate forms before submission

### Sample API Client Functions

```typescript
// TypeScript/JavaScript example

class TicketAssignmentAPI {
  baseURL = '/api/ticket-assignments';

  async getAllAssignments(params: QueryParams): Promise<ListResponse<TicketAssignment>> {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${this.baseURL}?${queryString}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }

  async getAssignmentById(id: string): Promise<SuccessResponse<TicketAssignment>> {
    const response = await fetch(`${this.baseURL}/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }

  async getCurrentAssignment(ticketId: string): Promise<SuccessResponse<TicketAssignment>> {
    const response = await fetch(`${this.baseURL}/ticket/${ticketId}/current`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }

  async getAssignmentHistory(ticketId: string, params?: QueryParams): Promise<ListResponse<TicketAssignment>> {
    const queryString = params ? new URLSearchParams(params).toString() : '';
    const response = await fetch(`${this.baseURL}/ticket/${ticketId}/history?${queryString}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }

  async createAssignment(data: CreateTicketAssignmentRequest): Promise<SuccessResponse<TicketAssignment>> {
    const response = await fetch(this.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return response.json();
  }

  async updateAssignment(id: string, data: UpdateTicketAssignmentRequest): Promise<SuccessResponse<TicketAssignment>> {
    const response = await fetch(`${this.baseURL}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return response.json();
  }

  async acceptAssignment(id: string, teamMemberId: string): Promise<SuccessResponse<TicketAssignment>> {
    const response = await fetch(`${this.baseURL}/${id}/accept`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ teamMemberId })
    });
    return response.json();
  }

  async reassignTicket(id: string, data: ReassignTicketRequest): Promise<SuccessResponse<TicketAssignment>> {
    const response = await fetch(`${this.baseURL}/${id}/reassign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return response.json();
  }

  async deleteAssignment(id: string): Promise<SuccessResponse<{}>> {
    const response = await fetch(`${this.baseURL}/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }

  async getStats(): Promise<SuccessResponse<AssignmentStats>> {
    const response = await fetch(`${this.baseURL}/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }

  async getAssignmentsByTeam(teamId: string, params?: QueryParams): Promise<ListResponse<TicketAssignment>> {
    const queryString = params ? new URLSearchParams(params).toString() : '';
    const response = await fetch(`${this.baseURL}/team/${teamId}?${queryString}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }

  async getAssignmentsByTeamMember(memberId: string, params?: QueryParams): Promise<ListResponse<TicketAssignment>> {
    const queryString = params ? new URLSearchParams(params).toString() : '';
    const response = await fetch(`${this.baseURL}/team-member/${memberId}?${queryString}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }
}
```

---

## Testing Scenarios

### Create Assignment
1. ✓ Create assignment with all fields
2. ✓ Create assignment with required fields only
3. ✗ Create assignment without ticket (should fail)
4. ✗ Create assignment with invalid ticket ID (should fail)
5. ✗ Create assignment with invalid team ID (should fail)
6. ✓ Verify previous assignments marked as not current
7. ✓ Verify ticket status updated to "assigned"

### Accept Assignment
1. ✓ Accept assignment by team member
2. ✗ Accept assignment by non-team member (should fail)
3. ✗ Accept already accepted assignment (should fail)
4. ✓ Verify ticket status updated to "in_progress"
5. ✓ Verify acceptedAt timestamp set

### Reassign Ticket
1. ✓ Reassign to different team
2. ✓ Reassign with new notes
3. ✗ Reassign with invalid team ID (should fail)
4. ✓ Verify old assignment marked as not current
5. ✓ Verify new assignment created as current
6. ✓ Verify ticket status updated to "assigned"

### Get Operations
1. ✓ Get all assignments with pagination
2. ✓ Filter by ticket
3. ✓ Filter by team
4. ✓ Filter by isCurrent
5. ✓ Get current assignment for ticket
6. ✓ Get assignment history
7. ✓ Get assignments by team
8. ✓ Get assignments by team member
9. ✓ Get statistics

---

## Best Practices

### 1. Assignment Workflow
- Always create assignments through the API (don't manually set ticket assignments)
- Use reassign endpoint instead of creating new assignments manually
- Check current assignment before creating new ones
- Validate team member belongs to assigned team before accepting

### 2. Status Management
- Current assignment: `isCurrent: true`, only one per ticket
- Historical assignments: `isCurrent: false`, preserved for audit trail
- Accepted assignments: `acceptedBy` is set, `acceptedAt` has timestamp
- Pending assignments: `acceptedBy` is null, `isCurrent: true`

### 3. UI/UX Recommendations
- Show acceptance status prominently (badge/indicator)
- Display assignment timeline for better context
- Highlight pending assignments requiring action
- Show team workload before assigning
- Confirm before reassigning (affects current assignee)
- Display assignment history on ticket detail page

### 4. Performance
- Use pagination for large assignment lists
- Cache team and consultant data
- Implement real-time updates for assignment status
- Index queries on frequently filtered fields

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- ObjectIds are 24-character hexadecimal strings
- String fields are automatically trimmed
- Only one assignment can have `isCurrent: true` per ticket
- Accepting an assignment updates the ticket status to "in_progress"
- Reassigning creates a new assignment and marks the old one as historical
- Assignment history is preserved and cannot be edited (except notes)
- Team member must belong to the assigned team to accept
