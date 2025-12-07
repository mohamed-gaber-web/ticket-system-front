# Team Module - API Documentation for Frontend Integration

## Base URL
```
/api/teams
```

## Authentication
All endpoints require authentication via Bearer Token or Cookie Authentication.

---

## Data Types & Models

### Team Object

```typescript
interface Team {
  _id: string;                    // MongoDB ObjectId
  teamName: string;               // Required, unique, max 100 chars
  department: string;             // Optional, max 100 chars
  teamLead: string | TeamMember;  // Reference to TeamMember ID
  specialization: string;         // Optional, max 150 chars
  status: "active" | "inactive";  // Default: "active"
  createdAt: string;              // ISO 8601 date string
  updatedAt: string;              // ISO 8601 date string

  // Virtual fields (populated when requested)
  members?: TeamMember[];         // Array of team members
  assignedTickets?: Ticket[];     // Array of tickets assigned to team
  workload?: number;              // Count of active tickets
}
```

### TeamMember Object (Referenced)

```typescript
interface TeamMember {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  phoneNumber?: string;
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

### 1. Get All Teams

**Endpoint:** `GET /api/teams`

**Description:** Retrieve a paginated list of teams with filtering, sorting, and search capabilities.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 10 | Items per page |
| status | string | - | Filter by status: "active" or "inactive" |
| department | string | - | Filter by department (case-insensitive) |
| specialization | string | - | Filter by specialization |
| search | string | - | Search in teamName, department, or specialization |
| sortBy | string | "createdAt" | Field to sort by |
| sortOrder | string | "desc" | Sort order: "asc" or "desc" |

**Example Request:**
```javascript
GET /api/teams?page=1&limit=10&status=active&search=support&sortBy=teamName&sortOrder=asc
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
      "_id": "60d5ec49f1b2c72b8c8e4f1a",
      "teamName": "Support Team A",
      "department": "Customer Support",
      "teamLead": {
        "_id": "60d5ec49f1b2c72b8c8e4f1b",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "role": "Team Lead"
      },
      "specialization": "Technical Support",
      "status": "active",
      "members": [...],
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `500 Internal Server Error` - Server error

---

### 2. Get Team by ID

**Endpoint:** `GET /api/teams/:id`

**Description:** Retrieve detailed information about a specific team, including populated team lead, members, assigned tickets, and workload.

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Team MongoDB ObjectId |

**Example Request:**
```javascript
GET /api/teams/60d5ec49f1b2c72b8c8e4f1a
```

**Success Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "_id": "60d5ec49f1b2c72b8c8e4f1a",
    "teamName": "Support Team A",
    "department": "Customer Support",
    "teamLead": {
      "_id": "60d5ec49f1b2c72b8c8e4f1b",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "role": "Team Lead",
      "phoneNumber": "+1234567890"
    },
    "specialization": "Technical Support",
    "status": "active",
    "members": [
      {
        "_id": "60d5ec49f1b2c72b8c8e4f1c",
        "firstName": "Jane",
        "lastName": "Smith",
        "email": "jane@example.com",
        "role": "Support Agent",
        "status": "active",
        "phoneNumber": "+1234567891"
      }
    ],
    "assignedTickets": [
      {
        "_id": "60d5ec49f1b2c72b8c8e4f2a",
        "ticketNumber": "TKT-2025-0001",
        "subject": "Login issue",
        "status": "in_progress",
        "priority": "high",
        "createdAt": "2025-01-15T10:30:00.000Z"
      }
    ],
    "workload": 12,
    "createdAt": "2025-01-10T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Team not found
- `500 Internal Server Error` - Server error

---

### 3. Create Team

**Endpoint:** `POST /api/teams`

**Description:** Create a new team.

**Request Body:**

```typescript
interface CreateTeamRequest {
  teamName: string;        // Required, unique, max 100 chars
  department: string;      // Required, max 100 chars
  teamLead?: string;       // Optional, TeamMember ID
  specialization?: string; // Optional, max 150 chars
  status?: "active" | "inactive"; // Optional, default: "active"
}
```

**Example Request:**
```javascript
POST /api/teams
Content-Type: application/json

{
  "teamName": "Support Team A",
  "department": "Customer Support",
  "teamLead": "60d5ec49f1b2c72b8c8e4f1b",
  "specialization": "Technical Support",
  "status": "active"
}
```

**Success Response:** `201 Created`
```json
{
  "success": true,
  "message": "Team created successfully",
  "data": {
    "_id": "60d5ec49f1b2c72b8c8e4f1a",
    "teamName": "Support Team A",
    "department": "Customer Support",
    "teamLead": {
      "_id": "60d5ec49f1b2c72b8c8e4f1b",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "role": "Team Lead"
    },
    "specialization": "Technical Support",
    "status": "active",
    "members": [],
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
    "errors": ["Team name is required", "Team name cannot exceed 100 characters"]
  }
  ```
- `400 Bad Request` - Team name already exists
  ```json
  {
    "success": false,
    "message": "Team name already exists"
  }
  ```
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Team lead not found
- `500 Internal Server Error` - Server error

**Validation Rules:**
- `teamName`: Required, unique, max 100 characters, trimmed
- `department`: Required, max 100 characters, trimmed
- `teamLead`: Optional, must be valid TeamMember ID
- `specialization`: Optional, max 150 characters, trimmed
- `status`: Optional, must be "active" or "inactive"

---

### 4. Update Team

**Endpoint:** `PUT /api/teams/:id`

**Description:** Update an existing team. All fields are optional.

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Team MongoDB ObjectId |

**Request Body:**

```typescript
interface UpdateTeamRequest {
  teamName?: string;        // Optional, unique, max 100 chars
  department?: string;      // Optional, max 100 chars
  teamLead?: string;        // Optional, TeamMember ID
  specialization?: string;  // Optional, max 150 chars
  status?: "active" | "inactive"; // Optional
}
```

**Example Request:**
```javascript
PUT /api/teams/60d5ec49f1b2c72b8c8e4f1a
Content-Type: application/json

{
  "teamName": "Support Team A - Updated",
  "status": "inactive"
}
```

**Success Response:** `200 OK`
```json
{
  "success": true,
  "message": "Team updated successfully",
  "data": {
    "_id": "60d5ec49f1b2c72b8c8e4f1a",
    "teamName": "Support Team A - Updated",
    "department": "Customer Support",
    "teamLead": {
      "_id": "60d5ec49f1b2c72b8c8e4f1b",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "role": "Team Lead"
    },
    "specialization": "Technical Support",
    "status": "inactive",
    "members": [...],
    "createdAt": "2025-01-10T10:30:00.000Z",
    "updatedAt": "2025-01-15T11:45:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Validation error
- `400 Bad Request` - Team name already exists
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Team not found or team lead not found
- `500 Internal Server Error` - Server error

---

### 5. Delete Team

**Endpoint:** `DELETE /api/teams/:id`

**Description:** Delete a team. Teams with active members or active tickets cannot be deleted.

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Team MongoDB ObjectId |

**Example Request:**
```javascript
DELETE /api/teams/60d5ec49f1b2c72b8c8e4f1a
```

**Success Response:** `200 OK`
```json
{
  "success": true,
  "message": "Team deleted successfully",
  "data": {}
}
```

**Error Responses:**
- `400 Bad Request` - Team has active members
  ```json
  {
    "success": false,
    "message": "Cannot delete team with 5 active member(s). Please reassign or deactivate team members first."
  }
  ```
- `400 Bad Request` - Team has active tickets
  ```json
  {
    "success": false,
    "message": "Cannot delete team with 12 active ticket(s). Please reassign tickets first."
  }
  ```
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Team not found
- `500 Internal Server Error` - Server error

**Business Rules:**
- Cannot delete a team with active members
- Cannot delete a team with active tickets (statuses: new, assigned, in_progress, reopened)
- Must first reassign or deactivate members and tickets

---

### 6. Get Team Members

**Endpoint:** `GET /api/teams/:id/members`

**Description:** Retrieve all members of a specific team with pagination.

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Team MongoDB ObjectId |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 50 | Items per page |
| status | string | - | Filter by member status |

**Example Request:**
```javascript
GET /api/teams/60d5ec49f1b2c72b8c8e4f1a/members?page=1&limit=50&status=active
```

**Success Response:** `200 OK`
```json
{
  "success": true,
  "count": 8,
  "total": 8,
  "page": 1,
  "pages": 1,
  "data": [
    {
      "_id": "60d5ec49f1b2c72b8c8e4f1c",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane@example.com",
      "role": "Support Agent",
      "status": "active",
      "team": "60d5ec49f1b2c72b8c8e4f1a",
      "createdAt": "2025-01-12T10:30:00.000Z",
      "updatedAt": "2025-01-12T10:30:00.000Z"
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Team not found
- `500 Internal Server Error` - Server error

**Note:** Password and refreshToken fields are excluded from the response.

---

### 7. Get Team Workload

**Endpoint:** `GET /api/teams/:id/workload`

**Description:** Retrieve team workload statistics including ticket counts by status.

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Team MongoDB ObjectId |

**Example Request:**
```javascript
GET /api/teams/60d5ec49f1b2c72b8c8e4f1a/workload
```

**Success Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "teamId": "60d5ec49f1b2c72b8c8e4f1a",
    "teamName": "Support Team A",
    "activeTickets": 27,
    "statusBreakdown": {
      "new": 8,
      "assigned": 12,
      "in_progress": 15,
      "resolved": 8,
      "closed": 2
    }
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Team not found
- `500 Internal Server Error` - Server error

**Notes:**
- `activeTickets`: Count of tickets with status "assigned" or "in_progress"
- `statusBreakdown`: All tickets assigned to the team, grouped by status

---

### 8. Get Teams by Department

**Endpoint:** `GET /api/teams/department/:department`

**Description:** Retrieve all teams in a specific department with pagination.

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| department | string | Yes | Department name (case-insensitive) |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 10 | Items per page |

**Example Request:**
```javascript
GET /api/teams/department/Customer%20Support?page=1&limit=10
```

**Success Response:** `200 OK`
```json
{
  "success": true,
  "count": 5,
  "total": 5,
  "page": 1,
  "pages": 1,
  "data": [
    {
      "_id": "60d5ec49f1b2c72b8c8e4f1a",
      "teamName": "Support Team A",
      "department": "Customer Support",
      "teamLead": {...},
      "specialization": "Technical Support",
      "status": "active",
      "members": [...],
      "createdAt": "2025-01-10T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `500 Internal Server Error` - Server error

**Notes:**
- Search is case-insensitive
- Results are sorted by team name (ascending)

---

### 9. Get Active Teams

**Endpoint:** `GET /api/teams/status/active`

**Description:** Retrieve all teams with status "active" with pagination.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 50 | Items per page |

**Example Request:**
```javascript
GET /api/teams/status/active?page=1&limit=50
```

**Success Response:** `200 OK`
```json
{
  "success": true,
  "count": 15,
  "total": 15,
  "page": 1,
  "pages": 1,
  "data": [
    {
      "_id": "60d5ec49f1b2c72b8c8e4f1a",
      "teamName": "Support Team A",
      "department": "Customer Support",
      "teamLead": {...},
      "specialization": "Technical Support",
      "status": "active",
      "members": [...], // Only active members are populated
      "createdAt": "2025-01-10T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `500 Internal Server Error` - Server error

**Notes:**
- Only active teams are returned
- Only active members are populated in the response
- Results are sorted by team name (ascending)

---

## Field Validation Summary

### Team Model Constraints

| Field | Type | Required | Unique | Max Length | Default | Enum |
|-------|------|----------|--------|------------|---------|------|
| teamName | String | Yes | Yes | 100 | - | - |
| department | String | No | No | 100 | - | - |
| teamLead | ObjectId | No | No | - | - | - |
| specialization | String | No | No | 150 | "" | - |
| status | String | No | No | - | "active" | ["active", "inactive"] |

---

## Common Error Codes

| Status Code | Meaning | Common Causes |
|-------------|---------|---------------|
| 400 | Bad Request | Validation errors, duplicate team name, business rule violations |
| 401 | Unauthorized | Missing or invalid authentication token |
| 404 | Not Found | Team or team lead not found |
| 409 | Conflict | Duplicate team name (in Swagger docs) |
| 500 | Internal Server Error | Database errors, unexpected server errors |

---

## Frontend Implementation Checklist

### Required Features

- [ ] **Team List Page**
  - [ ] Display paginated teams
  - [ ] Search functionality (teamName, department, specialization)
  - [ ] Filter by status (active/inactive)
  - [ ] Filter by department
  - [ ] Sort by multiple fields
  - [ ] Show team lead information
  - [ ] Show member count

- [ ] **Team Detail Page**
  - [ ] Display all team information
  - [ ] Show team lead with contact details
  - [ ] List all team members
  - [ ] Display assigned tickets (last 10)
  - [ ] Show workload statistics
  - [ ] Edit team button
  - [ ] Delete team button (with confirmation)

- [ ] **Create Team Form**
  - [ ] Team name input (required, max 100 chars)
  - [ ] Department input (required, max 100 chars)
  - [ ] Team lead selector (dropdown of TeamMembers)
  - [ ] Specialization input (optional, max 150 chars)
  - [ ] Status selector (active/inactive)
  - [ ] Form validation
  - [ ] Success/error notifications

- [ ] **Edit Team Form**
  - [ ] Pre-populate existing values
  - [ ] Same fields as create form
  - [ ] Form validation
  - [ ] Success/error notifications

- [ ] **Delete Team**
  - [ ] Confirmation dialog
  - [ ] Display warning if team has active members
  - [ ] Display warning if team has active tickets
  - [ ] Handle error messages
  - [ ] Success notification

- [ ] **Team Members View**
  - [ ] Display paginated team members
  - [ ] Filter by member status
  - [ ] Show member details
  - [ ] Link to member profile

- [ ] **Team Workload Dashboard**
  - [ ] Display active ticket count
  - [ ] Show ticket status breakdown chart
  - [ ] Team name and ID
  - [ ] Visual representation (charts/graphs)

### Recommended UI Components

1. **Data Table Component** - For team list and member list
2. **Form Components** - Input, Select, Textarea with validation
3. **Modal/Dialog** - For create, edit, and delete confirmations
4. **Pagination Component** - For list views
5. **Search Bar** - With debounce functionality
6. **Filter Panel** - For status and department filters
7. **Cards** - For displaying team details
8. **Charts** - For workload visualization (pie/bar chart)
9. **Toast/Notification** - For success/error messages
10. **Loading States** - Spinners/skeletons during API calls

### State Management Recommendations

```typescript
// Example state structure
interface TeamState {
  teams: Team[];
  currentTeam: Team | null;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    status?: "active" | "inactive";
    department?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  };
}
```

### API Integration Tips

1. **Error Handling**: Always check `success` field in response
2. **Loading States**: Show loading indicators during API calls
3. **Debouncing**: Implement debounce for search inputs (300-500ms)
4. **Pagination**: Track current page and update on navigation
5. **Caching**: Consider caching team list to reduce API calls
6. **Optimistic Updates**: Update UI immediately, rollback on error
7. **Authentication**: Include auth token in all requests
8. **Toast Notifications**: Show user-friendly messages from API responses

### Sample API Client Functions

```typescript
// TypeScript/JavaScript example

class TeamAPI {
  baseURL = '/api/teams';

  async getAllTeams(params: QueryParams): Promise<ListResponse<Team>> {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${this.baseURL}?${queryString}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }

  async getTeamById(id: string): Promise<SuccessResponse<Team>> {
    const response = await fetch(`${this.baseURL}/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }

  async createTeam(data: CreateTeamRequest): Promise<SuccessResponse<Team>> {
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

  async updateTeam(id: string, data: UpdateTeamRequest): Promise<SuccessResponse<Team>> {
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

  async deleteTeam(id: string): Promise<SuccessResponse<{}>> {
    const response = await fetch(`${this.baseURL}/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }

  async getTeamMembers(id: string, params?: QueryParams): Promise<ListResponse<TeamMember>> {
    const queryString = params ? new URLSearchParams(params).toString() : '';
    const response = await fetch(`${this.baseURL}/${id}/members?${queryString}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }

  async getTeamWorkload(id: string): Promise<SuccessResponse<WorkloadData>> {
    const response = await fetch(`${this.baseURL}/${id}/workload`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }

  async getTeamsByDepartment(department: string, params?: QueryParams): Promise<ListResponse<Team>> {
    const queryString = params ? new URLSearchParams(params).toString() : '';
    const response = await fetch(`${this.baseURL}/department/${department}?${queryString}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }

  async getActiveTeams(params?: QueryParams): Promise<ListResponse<Team>> {
    const queryString = params ? new URLSearchParams(params).toString() : '';
    const response = await fetch(`${this.baseURL}/status/active?${queryString}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }
}
```

---

## Testing Scenarios

### Create Team
1. ✓ Create team with all fields
2. ✓ Create team with required fields only
3. ✗ Create team without teamName (should fail)
4. ✗ Create team with duplicate name (should fail)
5. ✗ Create team with invalid team lead ID (should fail)
6. ✗ Create team with teamName > 100 chars (should fail)

### Update Team
1. ✓ Update single field
2. ✓ Update multiple fields
3. ✓ Update to duplicate name (should fail)
4. ✓ Update with invalid team lead ID (should fail)

### Delete Team
1. ✓ Delete team with no members or tickets
2. ✗ Delete team with active members (should fail)
3. ✗ Delete team with active tickets (should fail)

### Filters & Search
1. ✓ Filter by status
2. ✓ Filter by department
3. ✓ Search by team name
4. ✓ Combine filters and search
5. ✓ Sort by different fields
6. ✓ Pagination navigation

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- ObjectIds are 24-character hexadecimal strings
- String fields are automatically trimmed
- Team lead must be an existing TeamMember
- Virtual fields (members, assignedTickets) are populated automatically
- Password and refreshToken fields are never returned in API responses
