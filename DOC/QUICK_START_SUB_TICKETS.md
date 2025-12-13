# Quick Start: How to Add Sub-Tickets

## ✅ Simple 4-Step Process

### 1️⃣ Go to Tickets Page
- Click **"Tickets"** in the left sidebar

### 2️⃣ View a Ticket
Choose one of these options:
- **Click on the ticket number** (TKT-001, TKT-002, etc.) - it's a blue clickable link
- **OR** Click the **"View"** button (eye icon) in the Actions column

### 3️⃣ Scroll to Bottom
- Scroll down to the **"Sub-Tickets"** section

### 4️⃣ Click "Create Sub-Ticket"
- Click the **"+ Create Sub-Ticket"** button (top-right of the Sub-Tickets card)
- Fill in:
  - **Subject** (required)
  - **Description** (required)
  - **Priority** (Low/Medium/High/Critical)
- Click **"Create Sub-Ticket"**

---

## 📸 Visual Guide

```
┌─────────────────────────────────────────────────────────┐
│ TICKETS PAGE                                            │
├─────────────────────────────────────────────────────────┤
│ Ticket #      Subject           Actions                 │
│ ──────────────────────────────────────────────────────  │
│ TKT-001       Login Bug    [👁️ View][✏️ Edit][🗑️ Delete]│ ← Click View or TKT-001
│ TKT-002       UI Issue     [👁️ View][✏️ Edit][🗑️ Delete]│
│                                                          │
└─────────────────────────────────────────────────────────┘

                        ↓ After clicking View ↓

┌─────────────────────────────────────────────────────────┐
│ TICKET DETAILS PAGE                                     │
├─────────────────────────────────────────────────────────┤
│ [← Back]                                                │
│                                                          │
│ TKT-001                           [NEW] [MEDIUM]        │
│                                                          │
│ ┌── Ticket Details ───────────────────────────────────┐│
│ │ Subject: Login Bug                                  ││
│ │ Description: Users cannot login...                  ││
│ └─────────────────────────────────────────────────────┘│
│                                                          │
│ ┌── Consultant Assignments ────────────────────────────┐│
│ │ John Doe - Accepted                                 ││
│ └─────────────────────────────────────────────────────┘│
│                                                          │
│ ┌── Sub-Tickets (0) ────────── [+ Create Sub-Ticket] ─┐│ ← CLICK HERE!
│ │                                                      ││
│ │ No sub-tickets yet. Create one to break down        ││
│ │ this ticket into smaller tasks.                     ││
│ └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Points

✅ **NEW: Ticket numbers are now clickable!** Just click TKT-001 to view the ticket
✅ **NEW: "View" button added** to the actions column for easy access
✅ The "Create Sub-Ticket" button appears at the **bottom** of the ticket details page
✅ You must **view** a ticket first (not edit) to see the sub-tickets section
✅ Sub-tickets automatically inherit customer and SLA from the parent ticket
✅ Sub-tickets cannot have their own sub-tickets (only one level deep)

---

## ❓ Still Can't Find It?

Make sure you're:
1. ✅ On the **ticket DETAILS page** (not the tickets list)
2. ✅ Scrolled **all the way to the bottom**
3. ✅ Viewing a **parent ticket** (not already a sub-ticket)

**Parent Ticket:** Shows "Sub-Tickets" section at bottom ✅
**Sub-Ticket:** Shows "SUB-TICKET" badge below ticket number ⚠️ (cannot create sub-tickets)
