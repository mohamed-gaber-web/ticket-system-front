# Consultant Report - Front-End Implementation Plan

## Table of Contents
- [Overview](#overview)
- [Available Backend APIs](#available-backend-apis)
- [Report Dashboard Design](#report-dashboard-design)
- [Component Structure](#component-structure)
- [Technical Implementation](#technical-implementation)
- [Development Phases](#development-phases)
- [Tech Stack Recommendations](#tech-stack-recommendations)

---

## Overview

This document outlines the complete front-end implementation plan for building comprehensive consultant reports in the Ticketing System. The reports will provide insights into consultant performance, assignment statistics, and overall system analytics.

### Key Features
- Real-time consultant statistics dashboard
- Detailed consultant list with advanced filtering
- Individual consultant performance reports
- Assignment analytics and trends
- Export functionality (CSV, Excel, PDF)
- Responsive and accessible design

---

## Available Backend APIs

### 1. Consultant Management Endpoints

#### Get All Consultants
```
GET /api/consultants
```

**Query Parameters:**
- `page` (integer, default: 1) - Page number
- `limit` (integer, default: 10) - Items per page
- `status` (enum: active, inactive, on_leave) - Filter by status
- `role` (enum: consultant, senior_consultant, admin) - Filter by role
- `search` (string) - Search by firstName, lastName, or email

**Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 50,
  "page": 1,
  "pages": 5,
  "data": [
    {
      "_id": "string",
      "firstName": "string",
      "lastName": "string",
      "email": "string",
      "phone": "string",
      "role": "consultant|senior_consultant|admin",
      "status": "active|inactive|on_leave",
      "fullName": "string",
      "lastLogin": "date",
      "createdAt": "date",
      "updatedAt": "date"
    }
  ]
}
```

---

#### Get Consultant Statistics
```
GET /api/consultants/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 50,
    "active": 45,
    "inactive": 3,
    "onLeave": 2,
    "byRole": [
      {
        "_id": "consultant",
        "count": 30
      },
      {
        "_id": "senior_consultant",
        "count": 15
      },
      {
        "_id": "admin",
        "count": 5
      }
    ]
  }
}
```

---

#### Get Consultant by ID
```
GET /api/consultants/:id
```

**Response:**
Single consultant object with populated `assignments` field containing tickets assigned by this consultant.

---

### 2. Ticket Assignment Endpoints

#### Get All Ticket Assignments
```
GET /api/ticket-assignments
```

**Query Parameters:**
- `ticket` - Filter by ticket ID
- `assignedToTeam` - Filter by team ID
- `assignedByConsultant` - Filter by consultant ID
- `acceptedBy` - Filter by team member who accepted
- `isCurrent` (true/false) - Filter current/previous assignments
- `page` (integer, default: 1)
- `limit` (integer, default: 10)

**Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 100,
  "page": 1,
  "pages": 10,
  "data": [
    {
      "_id": "string",
      "ticket": {
        "_id": "string",
        "ticketNumber": "TKT-YYYY-XXXXX",
        "subject": "string",
        "status": "string",
        "priority": "string"
      },
      "assignedToTeam": {
        "_id": "string",
        "teamName": "string",
        "department": "string"
      },
      "assignedByConsultant": {
        "_id": "string",
        "firstName": "string",
        "lastName": "string",
        "email": "string"
      },
      "acceptedBy": {
        "_id": "string",
        "firstName": "string",
        "lastName": "string",
        "email": "string"
      },
      "assignmentNotes": "string",
      "assignedAt": "date",
      "acceptedAt": "date",
      "isCurrent": "boolean",
      "createdAt": "date",
      "updatedAt": "date"
    }
  ]
}
```

---

#### Get Assignment Statistics
```
GET /api/ticket-assignments/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 250,
    "current": 150,
    "accepted": 120,
    "pendingAcceptance": 30,
    "byTeam": [
      {
        "_id": "team_id",
        "teamName": "Support Team A",
        "count": 45
      }
    ],
    "byConsultant": [
      {
        "_id": "consultant_id",
        "consultantName": "Jane Smith",
        "count": 50
      }
    ]
  }
}
```

---

#### Get Assignment History for Ticket
```
GET /api/ticket-assignments/ticket/:ticketId/history
```

Shows all assignments made by consultants for a specific ticket.

---

## Report Dashboard Design

### 1. Summary Statistics Dashboard

**Purpose:** Central hub showing key consultant metrics

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│                 Consultant Dashboard                         │
├─────────────┬─────────────┬─────────────┬─────────────────┐
│   Total     │   Active    │  Inactive   │   On Leave      │
│    50       │     45      │      3      │       2         │
└─────────────┴─────────────┴─────────────┴─────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Consultants by Role                                          │
│ ██████████████████████ Consultants (30) - 60%              │
│ ███████████ Senior Consultants (15) - 30%                   │
│ ████ Admins (5) - 10%                                       │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Assignment Overview                                          │
│ Total Assignments: 250                                       │
│ Current: 150 | Accepted: 120 | Pending: 30                 │
└──────────────────────────────────────────────────────────────┘
```

**Data Source:**
- `GET /api/consultants/stats`
- `GET /api/ticket-assignments/stats`

**Components:**
- StatCard (reusable)
- RoleDistributionChart (Pie/Donut chart)
- AssignmentOverviewCard

---

### 2. Consultant List Report

**Purpose:** Detailed table of all consultants with filtering

**Features:**
- Advanced filtering panel
- Sortable columns
- Pagination
- Export buttons
- Bulk actions (optional)

**Filter Panel:**
```
┌──────────────────────────────────────────────────────────────┐
│ Filters:                                                     │
│ [Status: All ▼] [Role: All ▼] [Search: ___________] [Apply] │
└──────────────────────────────────────────────────────────────┘
```

**Data Table:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Full Name      │ Email           │ Phone      │ Role    │ Status │ Actions  │
├─────────────────────────────────────────────────────────────────────────────┤
│ John Doe       │ john@email.com  │ 1234567890 │ Admin   │ Active │ [View]   │
│ Jane Smith     │ jane@email.com  │ 0987654321 │ Senior  │ Active │ [View]   │
│ Bob Johnson    │ bob@email.com   │ 5551234567 │ Consult │ Leave  │ [View]   │
└─────────────────────────────────────────────────────────────────────────────┘
                        [< Prev] Page 1 of 5 [Next >]
                    [Export CSV] [Export Excel] [Export PDF]
```

**Data Source:**
- `GET /api/consultants?page=X&limit=Y&status=Z&role=W&search=Q`

**Components:**
- FilterPanel
- ConsultantTable
- PaginationControls
- ExportButtons

---

### 3. Individual Consultant Performance Report

**Purpose:** Detailed view of single consultant's activity

**Layout:**
```
┌──────────────────────────────────────────────────────────────┐
│ John Doe                                                     │
│ john.doe@email.com | Senior Consultant | Active             │
│ Last Login: 2025-12-05 10:30 AM                            │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Performance Metrics                                          │
│ Total Assignments: 85                                        │
│ Current Active: 15                                           │
│ Avg Acceptance Time: 2.5 hours                             │
│ Most Assigned Team: Support Team A (35 tickets)            │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Assignment Trend (Last 30 Days)                             │
│     ^                                                        │
│   10│      ╱╲                                               │
│    8│     ╱  ╲    ╱╲                                        │
│    6│    ╱    ╲  ╱  ╲                                       │
│    4│   ╱      ╲╱    ╲                                      │
│     └────────────────────>                                  │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Assignment History                                           │
│ ● TKT-2025-00123 → Support Team A (Accepted) - Dec 5       │
│ ● TKT-2025-00122 → Support Team B (Pending) - Dec 5        │
│ ● TKT-2025-00121 → Support Team A (Accepted) - Dec 4       │
└──────────────────────────────────────────────────────────────┘
```

**Data Source:**
- `GET /api/consultants/:id`
- `GET /api/ticket-assignments?assignedByConsultant=:id`

**Components:**
- ConsultantProfileCard
- PerformanceMetrics
- AssignmentTrendChart
- AssignmentTimeline

---

### 4. Assignment Analytics Report

**Purpose:** Cross-consultant analysis of assignment patterns

**Layout:**
```
┌──────────────────────────────────────────────────────────────┐
│ Top Consultants by Assignments                              │
│                                                              │
│ Jane Smith     ████████████████████████ 85                 │
│ John Doe       ██████████████████ 70                        │
│ Bob Johnson    ████████████ 55                              │
│ Alice Williams █████████ 45                                 │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Acceptance Rate by Consultant                               │
│ Consultant      │ Accepted │ Pending │ Rate                 │
│ Jane Smith      │    80    │    5    │ 94%  ████████████   │
│ John Doe        │    65    │    5    │ 93%  ████████████   │
│ Bob Johnson     │    50    │   10    │ 83%  ██████████     │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Assignment Distribution Matrix (Consultant vs Team)         │
│               │ Team A │ Team B │ Team C │ Total           │
│ Jane Smith    │   35   │   25   │   25   │  85             │
│ John Doe      │   30   │   20   │   20   │  70             │
│ Bob Johnson   │   25   │   15   │   15   │  55             │
└──────────────────────────────────────────────────────────────┘
```

**Data Source:**
- `GET /api/ticket-assignments/stats`
- `GET /api/consultants`

**Components:**
- TopConsultantsChart (Horizontal Bar)
- AcceptanceRateTable
- AssignmentMatrixTable
- ComparisonChart

---

## Component Structure

### Project Directory Structure
```
src/
├── pages/
│   ├── ConsultantReports/
│   │   ├── index.jsx                      # Main dashboard
│   │   ├── ConsultantListReport.jsx       # List view
│   │   ├── ConsultantDetailReport.jsx     # Individual consultant
│   │   └── AssignmentAnalytics.jsx        # Analytics view
│
├── components/
│   ├── reports/
│   │   ├── StatCard.jsx                   # Reusable stat card
│   │   ├── ConsultantTable.jsx            # Data table
│   │   ├── FilterPanel.jsx                # Filter controls
│   │   ├── ConsultantProfileCard.jsx      # Profile display
│   │   ├── AssignmentTimeline.jsx         # Timeline component
│   │   ├── PerformanceMetrics.jsx         # Metrics display
│   │   ├── ExportButton.jsx               # Export functionality
│   │   └── charts/
│   │       ├── RoleDistributionChart.jsx  # Pie chart
│   │       ├── AssignmentTrendChart.jsx   # Line chart
│   │       ├── TopConsultantsChart.jsx    # Bar chart
│   │       └── AssignmentMatrix.jsx       # Heat map
│
├── services/
│   ├── api/
│   │   ├── consultantService.js           # Consultant API calls
│   │   ├── assignmentService.js           # Assignment API calls
│   │   └── index.js                       # API client setup
│
├── hooks/
│   ├── useConsultants.js                  # Consultant data hook
│   ├── useConsultantStats.js              # Stats hook
│   ├── useAssignmentStats.js              # Assignment stats hook
│   └── useExport.js                       # Export functionality hook
│
├── utils/
│   ├── reportExporter.js                  # CSV/Excel/PDF export
│   ├── dateFormatter.js                   # Date formatting
│   ├── chartHelpers.js                    # Chart data transformers
│   └── constants.js                       # Status colors, etc.
│
└── styles/
    └── reports.css                        # Report-specific styles
```

---

## Technical Implementation

### Step 1: API Service Layer

Create services to interact with backend APIs.

**File: `src/services/api/consultantService.js`**
```javascript
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const consultantService = {
  // Get all consultants with pagination and filters
  getConsultants: async (params = {}) => {
    const { page = 1, limit = 10, status, role, search } = params;
    const queryParams = new URLSearchParams({
      page,
      limit,
      ...(status && { status }),
      ...(role && { role }),
      ...(search && { search }),
    });

    const response = await axios.get(
      `${API_BASE_URL}/consultants?${queryParams}`
    );
    return response.data;
  },

  // Get consultant statistics
  getConsultantStats: async () => {
    const response = await axios.get(`${API_BASE_URL}/consultants/stats`);
    return response.data;
  },

  // Get single consultant by ID
  getConsultantById: async (id) => {
    const response = await axios.get(`${API_BASE_URL}/consultants/${id}`);
    return response.data;
  },
};
```

**File: `src/services/api/assignmentService.js`**
```javascript
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const assignmentService = {
  // Get all assignments with filters
  getAssignments: async (params = {}) => {
    const { page = 1, limit = 10, assignedByConsultant, ticket, assignedToTeam, isCurrent } = params;
    const queryParams = new URLSearchParams({
      page,
      limit,
      ...(assignedByConsultant && { assignedByConsultant }),
      ...(ticket && { ticket }),
      ...(assignedToTeam && { assignedToTeam }),
      ...(isCurrent !== undefined && { isCurrent }),
    });

    const response = await axios.get(
      `${API_BASE_URL}/ticket-assignments?${queryParams}`
    );
    return response.data;
  },

  // Get assignment statistics
  getAssignmentStats: async () => {
    const response = await axios.get(`${API_BASE_URL}/ticket-assignments/stats`);
    return response.data;
  },

  // Get assignment history for specific ticket
  getTicketHistory: async (ticketId) => {
    const response = await axios.get(
      `${API_BASE_URL}/ticket-assignments/ticket/${ticketId}/history`
    );
    return response.data;
  },
};
```

---

### Step 2: Custom Hooks

Create reusable hooks for data fetching with React Query.

**File: `src/hooks/useConsultants.js`**
```javascript
import { useQuery } from '@tanstack/react-query';
import { consultantService } from '../services/api/consultantService';

export const useConsultants = (params) => {
  return useQuery({
    queryKey: ['consultants', params],
    queryFn: () => consultantService.getConsultants(params),
    keepPreviousData: true,
  });
};

export const useConsultantStats = () => {
  return useQuery({
    queryKey: ['consultantStats'],
    queryFn: () => consultantService.getConsultantStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useConsultantById = (id) => {
  return useQuery({
    queryKey: ['consultant', id],
    queryFn: () => consultantService.getConsultantById(id),
    enabled: !!id,
  });
};
```

**File: `src/hooks/useAssignmentStats.js`**
```javascript
import { useQuery } from '@tanstack/react-query';
import { assignmentService } from '../services/api/assignmentService';

export const useAssignmentStats = () => {
  return useQuery({
    queryKey: ['assignmentStats'],
    queryFn: () => assignmentService.getAssignmentStats(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useAssignments = (params) => {
  return useQuery({
    queryKey: ['assignments', params],
    queryFn: () => assignmentService.getAssignments(params),
    keepPreviousData: true,
  });
};
```

---

### Step 3: Core Components

#### StatCard Component

**File: `src/components/reports/StatCard.jsx`**
```javascript
import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

const StatCard = ({ title, value, subtitle, icon, color = 'primary' }) => {
  return (
    <Card sx={{ minWidth: 200 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="overline">
              {title}
            </Typography>
            <Typography variant="h4" component="div" color={color}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="textSecondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {icon && (
            <Box color={`${color}.main`} fontSize={40}>
              {icon}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatCard;
```

---

#### ConsultantTable Component

**File: `src/components/reports/ConsultantTable.jsx`**
```javascript
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  TablePagination,
} from '@mui/material';
import { Visibility } from '@mui/icons-material';
import { format } from 'date-fns';

const STATUS_COLORS = {
  active: 'success',
  inactive: 'error',
  on_leave: 'warning',
};

const ROLE_COLORS = {
  admin: 'error',
  senior_consultant: 'warning',
  consultant: 'info',
};

const ConsultantTable = ({
  consultants,
  page,
  rowsPerPage,
  totalCount,
  onPageChange,
  onRowsPerPageChange,
  onViewConsultant,
}) => {
  return (
    <Paper>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Full Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last Login</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {consultants.map((consultant) => (
              <TableRow key={consultant._id} hover>
                <TableCell>{consultant.fullName}</TableCell>
                <TableCell>{consultant.email}</TableCell>
                <TableCell>{consultant.phone || 'N/A'}</TableCell>
                <TableCell>
                  <Chip
                    label={consultant.role.replace('_', ' ')}
                    color={ROLE_COLORS[consultant.role]}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={consultant.status.replace('_', ' ')}
                    color={STATUS_COLORS[consultant.status]}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {consultant.lastLogin
                    ? format(new Date(consultant.lastLogin), 'MMM dd, yyyy HH:mm')
                    : 'Never'}
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => onViewConsultant(consultant._id)}
                  >
                    <Visibility />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={totalCount}
        page={page}
        onPageChange={onPageChange}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={onRowsPerPageChange}
        rowsPerPageOptions={[10, 25, 50, 100]}
      />
    </Paper>
  );
};

export default ConsultantTable;
```

---

#### FilterPanel Component

**File: `src/components/reports/FilterPanel.jsx`**
```javascript
import React, { useState } from 'react';
import {
  Box,
  TextField,
  MenuItem,
  Button,
  Paper,
  Grid,
} from '@mui/material';
import { Search, Clear } from '@mui/icons-material';

const FilterPanel = ({ onFilterChange, onClearFilters }) => {
  const [filters, setFilters] = useState({
    status: '',
    role: '',
    search: '',
  });

  const handleChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleApply = () => {
    onFilterChange(filters);
  };

  const handleClear = () => {
    setFilters({ status: '', role: '', search: '' });
    onClearFilters();
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={3}>
          <TextField
            fullWidth
            select
            label="Status"
            value={filters.status}
            onChange={(e) => handleChange('status', e.target.value)}
            size="small"
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
            <MenuItem value="on_leave">On Leave</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            fullWidth
            select
            label="Role"
            value={filters.role}
            onChange={(e) => handleChange('role', e.target.value)}
            size="small"
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="consultant">Consultant</MenuItem>
            <MenuItem value="senior_consultant">Senior Consultant</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Search by name or email"
            value={filters.search}
            onChange={(e) => handleChange('search', e.target.value)}
            size="small"
            placeholder="Type to search..."
          />
        </Grid>
        <Grid item xs={12} sm={2}>
          <Box display="flex" gap={1}>
            <Button
              variant="contained"
              startIcon={<Search />}
              onClick={handleApply}
              fullWidth
            >
              Apply
            </Button>
            <Button
              variant="outlined"
              startIcon={<Clear />}
              onClick={handleClear}
            >
              Clear
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default FilterPanel;
```

---

### Step 4: Dashboard Page

**File: `src/pages/ConsultantReports/index.jsx`**
```javascript
import React from 'react';
import { Container, Grid, Typography, Box, CircularProgress } from '@mui/material';
import { People, CheckCircle, Cancel, BeachAccess } from '@mui/icons-material';
import StatCard from '../../components/reports/StatCard';
import RoleDistributionChart from '../../components/reports/charts/RoleDistributionChart';
import { useConsultantStats, useAssignmentStats } from '../../hooks/useConsultants';

const ConsultantDashboard = () => {
  const { data: consultantStats, isLoading: loadingConsultants } = useConsultantStats();
  const { data: assignmentStats, isLoading: loadingAssignments } = useAssignmentStats();

  if (loadingConsultants || loadingAssignments) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Consultant Dashboard
      </Typography>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Consultants"
            value={consultantStats?.data?.total || 0}
            icon={<People />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active"
            value={consultantStats?.data?.active || 0}
            icon={<CheckCircle />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Inactive"
            value={consultantStats?.data?.inactive || 0}
            icon={<Cancel />}
            color="error"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="On Leave"
            value={consultantStats?.data?.onLeave || 0}
            icon={<BeachAccess />}
            color="warning"
          />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <RoleDistributionChart data={consultantStats?.data?.byRole || []} />
        </Grid>
        <Grid item xs={12} md={6}>
          <Box>
            <Typography variant="h6" gutterBottom>
              Assignment Overview
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <StatCard
                  title="Total Assignments"
                  value={assignmentStats?.data?.total || 0}
                />
              </Grid>
              <Grid item xs={6}>
                <StatCard
                  title="Current"
                  value={assignmentStats?.data?.current || 0}
                  color="info"
                />
              </Grid>
              <Grid item xs={6}>
                <StatCard
                  title="Accepted"
                  value={assignmentStats?.data?.accepted || 0}
                  color="success"
                />
              </Grid>
              <Grid item xs={6}>
                <StatCard
                  title="Pending"
                  value={assignmentStats?.data?.pendingAcceptance || 0}
                  color="warning"
                />
              </Grid>
            </Grid>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ConsultantDashboard;
```

---

### Step 5: Export Functionality

**File: `src/utils/reportExporter.js`**
```javascript
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const exportToCSV = (data, filename = 'consultants.csv') => {
  const csvData = data.map((item) => ({
    'Full Name': item.fullName,
    'Email': item.email,
    'Phone': item.phone || 'N/A',
    'Role': item.role,
    'Status': item.status,
    'Last Login': item.lastLogin ? new Date(item.lastLogin).toLocaleString() : 'Never',
    'Created At': new Date(item.createdAt).toLocaleString(),
  }));

  const worksheet = XLSX.utils.json_to_sheet(csvData);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, filename);
};

export const exportToExcel = (data, filename = 'consultants.xlsx') => {
  const excelData = data.map((item) => ({
    'Full Name': item.fullName,
    'Email': item.email,
    'Phone': item.phone || 'N/A',
    'Role': item.role,
    'Status': item.status,
    'Last Login': item.lastLogin ? new Date(item.lastLogin).toLocaleString() : 'Never',
    'Created At': new Date(item.createdAt).toLocaleString(),
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Consultants');
  XLSX.writeFile(workbook, filename);
};

export const exportToPDF = (data, filename = 'consultants.pdf') => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('Consultant Report', 14, 22);
  doc.setFontSize(11);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

  const tableData = data.map((item) => [
    item.fullName,
    item.email,
    item.phone || 'N/A',
    item.role,
    item.status,
    item.lastLogin ? new Date(item.lastLogin).toLocaleDateString() : 'Never',
  ]);

  doc.autoTable({
    head: [['Full Name', 'Email', 'Phone', 'Role', 'Status', 'Last Login']],
    body: tableData,
    startY: 35,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 128, 185] },
  });

  doc.save(filename);
};
```

---

## Development Phases

### Phase 1: Foundation (Week 1)
**Goal:** Basic infrastructure and simple reports

**Tasks:**
- [ ] Setup React project with routing
- [ ] Install dependencies (MUI, React Query, Chart libraries)
- [ ] Create API service layer
- [ ] Build custom hooks for data fetching
- [ ] Create basic dashboard layout
- [ ] Implement StatCard component
- [ ] Build consultant list table with pagination
- [ ] Add basic filtering (status, role)

**Deliverables:**
- Working dashboard with statistics
- Consultant list with pagination
- Basic filtering functionality

---

### Phase 2: Advanced Features (Week 2)
**Goal:** Detailed views and analytics

**Tasks:**
- [ ] Build individual consultant detail page
- [ ] Implement assignment history timeline
- [ ] Add performance metrics calculation
- [ ] Create charts (pie, bar, line)
- [ ] Build assignment analytics page
- [ ] Add advanced search functionality
- [ ] Implement date range filters
- [ ] Add loading and error states

**Deliverables:**
- Consultant detail view with assignments
- Performance charts and metrics
- Assignment analytics dashboard

---

### Phase 3: Export & Polish (Week 3)
**Goal:** Export functionality and UI refinements

**Tasks:**
- [ ] Implement CSV export
- [ ] Implement Excel export
- [ ] Implement PDF export
- [ ] Add print-friendly views
- [ ] Optimize performance (memoization, lazy loading)
- [ ] Improve responsive design
- [ ] Add tooltips and help text
- [ ] Error handling improvements

**Deliverables:**
- Full export functionality
- Responsive design
- Polished UI/UX

---

### Phase 4: Enhancements (Week 4)
**Goal:** Advanced features and optimizations

**Tasks:**
- [ ] Add real-time updates (optional)
- [ ] Implement URL query params for filters
- [ ] Add shareable report links
- [ ] Accessibility improvements (ARIA labels, keyboard nav)
- [ ] Add custom date range selectors
- [ ] Performance optimization
- [ ] User preferences (save filters, table columns)
- [ ] Documentation

**Deliverables:**
- Real-time updates (if implemented)
- Shareable URLs
- Accessibility compliant
- Performance optimized

---

## Tech Stack Recommendations

### Core Technologies
| Category | Recommended | Alternative |
|----------|-------------|-------------|
| **Framework** | React 18+ | Vue.js, Angular |
| **State Management** | React Query + Context | Redux Toolkit, Zustand |
| **UI Library** | Material-UI (MUI) | Ant Design, Chakra UI |
| **Charts** | Recharts | Chart.js, Victory, Nivo |
| **Tables** | MUI DataGrid | TanStack Table, AG Grid |
| **Forms** | React Hook Form | Formik |
| **HTTP Client** | Axios | Fetch API |
| **Date Handling** | date-fns | Day.js, Moment.js |
| **Export** | SheetJS (xlsx) | Papa Parse (CSV) |
| **PDF Generation** | jsPDF | pdfmake, react-pdf |
| **Routing** | React Router v6 | Next.js (if SSR needed) |

---

### NPM Packages

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.0",
    "@mui/material": "^5.11.0",
    "@mui/icons-material": "^5.11.0",
    "@emotion/react": "^11.10.0",
    "@emotion/styled": "^11.10.0",
    "@tanstack/react-query": "^4.24.0",
    "axios": "^1.3.0",
    "recharts": "^2.5.0",
    "date-fns": "^2.29.0",
    "xlsx": "^0.18.5",
    "file-saver": "^2.0.5",
    "jspdf": "^2.5.1",
    "jspdf-autotable": "^3.5.31",
    "react-hook-form": "^7.43.0"
  },
  "devDependencies": {
    "vite": "^4.1.0",
    "@vitejs/plugin-react": "^3.1.0"
  }
}
```

---

## Best Practices

### Performance Optimization
1. **Use React.memo** for expensive components
2. **Implement useMemo** for computed values
3. **Use virtualization** for large tables (react-window)
4. **Lazy load** routes and heavy components
5. **Debounce** search inputs
6. **Paginate** large datasets
7. **Cache API responses** with React Query

### Accessibility
1. **Use semantic HTML** (proper heading hierarchy)
2. **Add ARIA labels** to interactive elements
3. **Ensure keyboard navigation** works
4. **Test with screen readers**
5. **Maintain color contrast** ratios (WCAG AA)
6. **Add focus indicators**

### Error Handling
1. **Display user-friendly error messages**
2. **Add retry buttons** for failed requests
3. **Show loading skeletons** during data fetch
4. **Handle empty states** gracefully
5. **Log errors** to monitoring service
6. **Add error boundaries** for React components

### Testing Strategy
1. **Unit tests** for utilities and helpers
2. **Component tests** with React Testing Library
3. **Integration tests** for API services
4. **E2E tests** for critical user flows
5. **Accessibility tests** with axe-core

---

## Summary Checklist

### Setup
- [ ] Initialize React project
- [ ] Install all dependencies
- [ ] Setup API client and base URL
- [ ] Configure routing
- [ ] Setup React Query provider

### Components
- [ ] Build StatCard component
- [ ] Build ConsultantTable component
- [ ] Build FilterPanel component
- [ ] Build ConsultantProfileCard component
- [ ] Build AssignmentTimeline component
- [ ] Build chart components (Pie, Bar, Line)
- [ ] Build ExportButton component

### Pages
- [ ] Create Dashboard page
- [ ] Create Consultant List page
- [ ] Create Consultant Detail page
- [ ] Create Assignment Analytics page

### Features
- [ ] Implement pagination
- [ ] Add filtering (status, role, search)
- [ ] Add sorting functionality
- [ ] Add export to CSV
- [ ] Add export to Excel
- [ ] Add export to PDF
- [ ] Add print view
- [ ] Implement loading states
- [ ] Implement error handling
- [ ] Add responsive design

### Testing & Deployment
- [ ] Write unit tests
- [ ] Write component tests
- [ ] Test accessibility
- [ ] Test on different browsers
- [ ] Test on mobile devices
- [ ] Deploy to staging
- [ ] User acceptance testing
- [ ] Deploy to production

---

## API Endpoint Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/consultants` | GET | Get all consultants (filtered, paginated) |
| `/api/consultants/stats` | GET | Get consultant statistics |
| `/api/consultants/:id` | GET | Get single consultant with assignments |
| `/api/ticket-assignments` | GET | Get all assignments (filtered) |
| `/api/ticket-assignments/stats` | GET | Get assignment statistics |
| `/api/ticket-assignments/ticket/:ticketId/history` | GET | Get assignment history |

---

## Contact & Support

For questions or issues with this implementation plan:
- Review the backend API documentation
- Check the Consultant model: `src/models/Consltant.js`
- Review controllers: `src/controllers/consultantController.js`
- Review routes: `src/routes/consultantRoutes.js`

---

**Document Version:** 1.0
**Last Updated:** 2025-12-06
**Author:** Development Team
