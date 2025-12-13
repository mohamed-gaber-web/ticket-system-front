# Quick Reference: Sub-Tickets & Multi-Consultant Assignment

## 🎯 Quick Access

### Where to Find These Features
**Location:** Ticket Details Page (`/tickets/view/:id`)

---

## 📋 Sub-Tickets (Sub-Tasks)

### How to Add a Sub-Ticket:

1. **Open any ticket** → Scroll down to "Sub-Tickets" section
2. **Click** `[+ Create Sub-Ticket]` button
3. **Fill the form:**
   - Subject: `"Database Optimization"` (required)
   - Description: `"Optimize slow queries..."` (required)
   - Priority: `High/Medium/Low/Critical`
4. **Click** `[Create Sub-Ticket]`

**That's it!** The sub-ticket is created and appears in the list.

### What You'll See:
```
Sub-Tickets (3)                    [+ Create Sub-Ticket]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▶ TKT-2025-00123 - Database Optimization
  🔵 In Progress  │  🔥 High  │  👥 DB Team
  Created: 30 minutes ago

▶ TKT-2025-00124 - Frontend Caching
  ✅ Resolved  │  🟡 Medium  │  👥 FE Team
  Completed: 2 hours ago
```

---

## 👥 Multi-Consultant Assignment

### How to Assign Multiple Consultants:

1. **Open a ticket** → Scroll to "Assigned Consultants" section
2. **Click** `[+ Assign Consultants]` button
3. **Select consultants** (check multiple boxes):
   - ☑️ Alice Johnson (Backend)
   - ☑️ Bob Wilson (Database)
   - ☑️ Charlie Davis (Frontend)
4. **Click** `[Assign 3 Consultant(s)]`

**Done!** All selected consultants are now assigned.

### What You'll See:
```
Assigned Consultants (3)              [+ Assign Consultants]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─────────────────────────────────────────────┐
│ 👤 Alice Johnson (Backend Expert)          │
│ alice@company.com                           │
│ Status: ✅ Accepted (10:30 AM)             │
│ 💬 "Working on API migration"               │
│ [Mark Complete] [Remove]                    │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 👤 Bob Wilson (Database Expert)            │
│ bob@company.com                             │
│ Status: ✅✅ Completed (3:00 PM)           │
│ 💬 "Database migrated successfully"         │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 👤 Charlie Davis (Frontend Expert)         │
│ charlie@company.com                         │
│ Status: ⏳ Pending                          │
│ [Accept] [Decline]                          │
└─────────────────────────────────────────────┘
```

---

## ✅ Consultant Actions

### When You're Assigned to a Ticket:

**If Status is ⏳ Pending:**
1. Add notes (optional): `"I'll start tomorrow"`
2. Click **[Accept]** or **[Decline]**

**If Status is ✅ Accepted:**
1. Do your work...
2. Add completion notes: `"Fixed the bug in module X"`
3. Click **[Mark Complete]**

**If Status is ✅✅ Completed:**
- Nothing to do! Your work is done.

---

## 📊 Status Reference

### Sub-Ticket Statuses:
- 🔵 **New** - Just created
- 🟣 **Assigned** - Assigned to team
- 🟡 **In Progress** - Being worked on
- 🟢 **Resolved** - Issue fixed
- ⚫ **Closed** - Ticket closed
- 🔴 **Reopened** - Reopened after closed

### Consultant Statuses:
- ⏳ **Pending** - Waiting for response
- ✅ **Accepted** - Working on it
- ❌ **Declined** - Refused to work
- ✅✅ **Completed** - Work finished

---

## 🔑 Key Points

### Sub-Tickets:
- ✅ Create from parent ticket details page
- ✅ Inherits customer & SLA automatically
- ✅ Can set different priority
- ❌ Cannot create sub-sub-tickets

### Multi-Consultant:
- ✅ Assign unlimited consultants
- ✅ Each has independent status
- ✅ Can add/remove anytime
- ✅ Each can add their own notes

---

## 🎬 Common Workflows

### Workflow 1: Break Down Complex Ticket
```
Main Ticket: "Website Issues"
    ↓
Create Sub-Tickets:
    ├─ "Fix Database Performance"
    ├─ "Optimize Images"
    └─ "Update Cache Strategy"
```

### Workflow 2: Team Collaboration
```
Ticket: "System Migration"
    ↓
Assign Consultants:
    ├─ Backend Dev (API migration)
    ├─ DBA (Database migration)
    └─ Frontend Dev (UI updates)
    ↓
Each works independently:
    ├─ Backend: ✅ Accepted → ✅✅ Completed
    ├─ DBA: ✅ Accepted → ✅✅ Completed
    └─ Frontend: ⏳ Pending → ❌ Declined
```

---

## 💡 Pro Tips

1. **Use Sub-Tickets for:**
   - Breaking down large tasks
   - Assigning different teams
   - Tracking independent work streams

2. **Use Multi-Consultant for:**
   - Complex issues needing multiple skills
   - Team collaboration on one task
   - Tracking who does what

3. **Best Practices:**
   - Add clear notes when accepting/completing
   - Use descriptive sub-ticket subjects
   - Update status promptly
   - Remove consultants if they decline

---

## 🎯 Where to Find Everything

All features are on the **Ticket Details Page**:

**URL Pattern:** `/tickets/view/:id`

**Page Layout:**
```
┌─────────────────────────────────────┐
│ ← Back                              │
│                                     │
│ TKT-2025-00100                      │
│ [Status Badge] [Priority Badge]     │
├─────────────────────────────────────┤
│                                     │
│ 📄 Ticket Details                   │
│ - Subject                           │
│ - Description                       │
│ - Customer, Category, etc.          │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ 👥 Assigned Consultants (3)         │← Click "+ Assign Consultants"
│ - Alice (Accepted)                  │
│ - Bob (Completed)                   │
│ - Charlie (Pending)                 │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ 📋 Sub-Tickets (2)                  │← Click "+ Create Sub-Ticket"
│ - Database Optimization             │
│ - Frontend Caching                  │
│                                     │
└─────────────────────────────────────┘
```

---

**Need More Details?** Check [USER_GUIDE_SUB_TICKETS_AND_CONSULTANTS.md](USER_GUIDE_SUB_TICKETS_AND_CONSULTANTS.md)

**Implementation Details?** Check [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)

---

**Quick Reference Version:** 1.0
**Last Updated:** December 11, 2025
