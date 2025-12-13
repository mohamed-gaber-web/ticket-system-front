# User Guide: Sub-Tickets & Multi-Consultant Assignment

## Overview
This guide explains how to:
1. **Create sub-tickets** from a parent ticket
2. **Assign multiple consultants** to a ticket
3. **Manage consultant assignments** and track their progress

---

## 🎫 How to Add Sub-Tickets (Sub-Tasks)

### Step 1: Navigate to the Parent Ticket
1. Go to the **Tickets** page from the sidebar
2. Click on any ticket to view its details
3. You'll be redirected to `/tickets/view/:id`

### Step 2: Create a Sub-Ticket
1. Scroll down to the **"Sub-Tickets"** section on the ticket details page
2. Click the **"Create Sub-Ticket"** button (with a plus icon)
3. A dialog will open

### Step 3: Fill in Sub-Ticket Details
In the dialog, enter:
- **Subject** (required) - Brief title of the sub-ticket
- **Description** (required) - Detailed description of the sub-task
- **Priority** (optional) - Select: Low, Medium, High, or Critical
  - Defaults to Medium if not selected

**Note:** The sub-ticket automatically inherits:
- ✅ Customer from parent ticket
- ✅ SLA from parent ticket

### Step 4: Submit
Click **"Create Sub-Ticket"** button to create the sub-ticket

### Step 5: View Sub-Tickets
After creation, the sub-ticket appears in the list showing:
- Ticket number (e.g., TKT-2025-00123)
- Status badge (New, In Progress, Resolved, etc.)
- Priority badge
- Subject
- Description (truncated)
- Creation date

### Step 6: Access Sub-Ticket Details
Click on any sub-ticket in the list to view its full details

---

## 🎯 Example: Creating Sub-Tickets

### Use Case: Complex Website Issue

**Parent Ticket:**
```
TKT-2025-00100
Subject: Website Performance Issues
Description: Customer reports slow loading times across the entire website
```

**Sub-Tickets to Create:**

1. **Sub-Ticket 1:**
   - Subject: Database Query Optimization
   - Description: Analyze and optimize slow database queries
   - Priority: High

2. **Sub-Ticket 2:**
   - Subject: Frontend Caching Implementation
   - Description: Implement browser caching for static assets
   - Priority: Medium

3. **Sub-Ticket 3:**
   - Subject: API Response Time Analysis
   - Description: Profile and improve API endpoint response times
   - Priority: High

---

## 👥 How to Assign Multiple Consultants to a Ticket

### Prerequisites
- The ticket must already have an **assignment** created
- You must be viewing a ticket with an active assignment

### Step 1: Navigate to Ticket Details
1. Go to **Tickets** from sidebar
2. Click on the ticket you want to assign consultants to
3. Go to `/tickets/view/:id`

### Step 2: Find the Assigned Consultants Section
Scroll down to find the **"Assigned Consultants"** card

### Step 3: Assign Consultants
1. Click the **"Assign Consultants"** button (with UserPlus icon)
2. A dialog opens showing all available consultants

### Step 4: Select Consultants
1. Check the boxes next to consultants you want to assign
2. You can select multiple consultants at once
3. Consultants already assigned will be disabled and marked as "Already assigned"

### Step 5: Confirm Assignment
Click **"Assign X Consultant(s)"** button at the bottom
- The number shows how many consultants you've selected
- The button is disabled if no consultants are selected

### Step 6: View Assigned Consultants
After assignment, each consultant appears in the list with:
- 👤 Name and email
- ⏳ Status: **Pending** (gray badge)
- 📅 Assignment timestamp
- 🗑️ Remove button

---

## ✅ How Consultants Accept/Decline Assignments

### For Consultants:

When you're assigned to a ticket:

### Step 1: View Assignment
1. Go to the ticket details page
2. Scroll to **"Assigned Consultants"** section
3. Find your name in the list

### Step 2: Respond to Assignment
If status is **⏳ Pending**, you'll see:
- Text area for optional notes
- **Accept** button (green with checkmark)
- **Decline** button (red with X)

### Step 3: Accept Assignment
1. Optionally add notes like: "Will start working on this tomorrow"
2. Click **"Accept"** button
3. Status changes to **✅ Accepted** (green badge)
4. Timestamp shows when you accepted

### Step 4: Work on the Ticket
After accepting, you'll see:
- **Mark Complete** button
- Text area for completion notes

### Step 5: Complete Work
1. Add notes about what you did (optional)
   - Example: "Fixed the database query performance issue"
2. Click **"Mark Complete"**
3. Status changes to **✅✅ Completed** (blue badge)
4. Completion timestamp is recorded

### Step 6: Decline Assignment (Alternative)
If you can't work on it:
1. Add notes explaining why (optional)
2. Click **"Decline"** button
3. Status changes to **❌ Declined** (red badge)

---

## 📊 Status Workflow

### Consultant Assignment Statuses:

```
⏳ Pending
    ↓
    ├─→ ✅ Accepted → ✅✅ Completed
    └─→ ❌ Declined
```

**Status Meanings:**
- **⏳ Pending**: Waiting for consultant to respond
- **✅ Accepted**: Consultant is working on it
- **❌ Declined**: Consultant declined the assignment
- **✅✅ Completed**: Consultant finished their work

---

## 🎯 Example: Multi-Consultant Assignment

### Use Case: Complex System Migration

**Ticket:** TKT-2025-00150 - "System Migration Project"

**Step 1: Assign Multiple Consultants**
Assign these consultants with different expertise:
- Alice (Backend Developer)
- Bob (Database Administrator)
- Charlie (Frontend Developer)

**Step 2: Consultants Respond**

**Alice's Response:**
- Status: ✅ Accepted
- Notes: "Will handle API migration first"

**Bob's Response:**
- Status: ✅ Accepted
- Notes: "Starting with database schema updates"

**Charlie's Response:**
- Status: ❌ Declined
- Notes: "Currently overloaded with other projects"

**Step 3: Work Progress**

**Bob completes his work:**
- Status: ✅✅ Completed
- Notes: "Database migrated successfully. Performance improved by 40%"

**Alice continues working:**
- Status: ✅ Accepted (still in progress)

---

## 🔧 Admin/Manager Actions

### Removing a Consultant
1. Find the consultant in the **"Assigned Consultants"** list
2. Click the **trash icon** (🗑️) button
3. Confirm the removal
4. The consultant is removed from the assignment

### Adding More Consultants Later
1. Click **"Assign Consultants"** button again
2. Select additional consultants
3. They'll be added to the existing list

---

## 📱 UI Components Reference

### Sub-Tickets Section
```
┌────────────────────────────────────────┐
│ 📋 Sub-Tickets (3)    [+ Create]      │
├────────────────────────────────────────┤
│ ▶ TKT-2025-00101 - Database Opt.      │
│   🔵 In Progress │ 🔥 High            │
│   Due: 2 hours                         │
├────────────────────────────────────────┤
│ ▶ TKT-2025-00102 - Frontend Caching   │
│   ✅ Resolved │ 🟡 Medium             │
│   Completed: 3 hours ago               │
└────────────────────────────────────────┘
```

### Assigned Consultants Section
```
┌────────────────────────────────────────┐
│ 👥 Assigned Consultants (3) [+ Assign]│
├────────────────────────────────────────┤
│ 👤 Alice Johnson                       │
│ alice@company.com                      │
│ ✅ Accepted (10:30 AM)                │
│ 💬 "Working on backend API migration" │
│ [Mark Complete] [Remove]               │
├────────────────────────────────────────┤
│ 👤 Bob Wilson                          │
│ bob@company.com                        │
│ ✅✅ Completed (3:00 PM)              │
│ 💬 "Database migrated successfully"   │
├────────────────────────────────────────┤
│ 👤 Charlie Davis                       │
│ charlie@company.com                    │
│ ⏳ Pending                             │
│ [Accept] [Decline]                     │
└────────────────────────────────────────┘
```

---

## ⚠️ Important Notes

### Sub-Tickets:
- ❌ Cannot create sub-tickets from another sub-ticket (only 1 level deep)
- ✅ Sub-tickets can have different priority than parent
- ✅ Sub-tickets can be assigned to different teams
- ✅ Each sub-ticket has independent status tracking
- ✅ Parent ticket badge appears on sub-ticket details page

### Multi-Consultant Assignment:
- ✅ Can assign unlimited consultants to one ticket
- ✅ Each consultant has their own status
- ✅ Consultants can add personal notes
- ✅ Only the assigned consultant can update their status
- ✅ Can remove consultants at any time
- ❌ Cannot assign the same consultant twice

---

## 🚀 Quick Start Checklist

### To Create Sub-Tickets:
- [ ] Open a parent ticket
- [ ] Scroll to "Sub-Tickets" section
- [ ] Click "Create Sub-Ticket"
- [ ] Fill in subject, description, and priority
- [ ] Click "Create Sub-Ticket"

### To Assign Multiple Consultants:
- [ ] Open a ticket with an assignment
- [ ] Find "Assigned Consultants" section
- [ ] Click "Assign Consultants"
- [ ] Select consultants from the list
- [ ] Click "Assign X Consultant(s)"

### As a Consultant:
- [ ] View ticket details
- [ ] Find your name in "Assigned Consultants"
- [ ] Add notes (optional)
- [ ] Click "Accept" or "Decline"
- [ ] If accepted, click "Mark Complete" when done

---

## 📞 Support

If you encounter any issues:
1. Check that you have proper permissions
2. Ensure the ticket has an active assignment
3. Refresh the page and try again
4. Contact your system administrator

---

## 🎉 Summary

You now know how to:
✅ Create sub-tickets to break down complex issues
✅ Assign multiple consultants to collaborate on tickets
✅ Accept, decline, and complete consultant assignments
✅ Track progress of multiple consultants on one ticket
✅ Remove consultants from assignments
✅ Add personal notes to track your work

These features help teams work more efficiently on complex tickets!

---

**Last Updated:** December 11, 2025
**Feature Status:** ✅ Fully Implemented and Ready to Use
