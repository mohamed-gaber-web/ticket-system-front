# How to Add a Sub-Ticket (Step-by-Step Guide)

## Step 1: Go to Tickets List
1. Click on "Tickets" in the sidebar navigation
2. You'll see a list of all tickets

## Step 2: Open a Ticket (You Have 2 Options)
**Option 1:** Click on the **blue ticket number** (e.g., TKT-001) - it's clickable!
**Option 2:** Click the **"View"** button (with eye icon) in the Actions column

This will take you to the ticket details page (URL: `/tickets/view/{ticket-id}`)

## Step 3: Find the Sub-Tickets Section
1. **Scroll down** on the ticket details page
2. You'll see these sections in order:
   - ✅ **Ticket Details** (at the top - shows subject, description, customer, etc.)
   - ✅ **Consultant Assignments** (middle section - shows assigned consultants)
   - ✅ **Sub-Tickets** (bottom section - **THIS IS WHERE THE BUTTON IS**)

## Step 4: Click "Create Sub-Ticket" Button
1. In the **Sub-Tickets** section header, you'll see:
   ```
   Sub-Tickets (0)          [+ Create Sub-Ticket]
   ```
2. Click the **[+ Create Sub-Ticket]** button on the right side

## Step 5: Fill in the Sub-Ticket Form
A dialog will pop up with these fields:
- **Subject** (required) - Enter a brief title
- **Description** (required) - Enter detailed description
- **Priority** (dropdown) - Select: Low, Medium, High, or Critical

## Step 6: Submit
1. Click the blue **"Create Sub-Ticket"** button at the bottom of the dialog
2. The dialog will close
3. Your new sub-ticket will appear in the list below

## Important Notes:
- ⚠️ **The button is NOT on the ticket creation page** - it's only on the ticket DETAILS page
- ⚠️ You must first CREATE a ticket, then OPEN it to see the sub-ticket button
- ⚠️ Sub-tickets can only be created from PARENT tickets (not from other sub-tickets)
- ℹ️ Sub-tickets automatically inherit the customer and SLA from the parent ticket

## Quick Navigation Path:
```
Tickets List → Click on a Ticket → Scroll to Bottom → Click "Create Sub-Ticket"
```

## Visual Layout:

```
┌────────────────────────────────────────────────────┐
│ [← Back]                                           │
│                                                    │
│ TKT-001                          [NEW] [MEDIUM]   │
│ ─────────────────────────────────────────────────│
│                                                    │
│ ┌─ Ticket Details ──────────────────────────┐   │
│ │ Subject: Fix login bug                    │   │
│ │ Description: Users can't login...         │   │
│ │ Customer: ABC Company                     │   │
│ └──────────────────────────────────────────┘   │
│                                                    │
│ ┌─ Consultant Assignments ──────────────────┐   │
│ │ John Doe - Accepted                       │   │
│ └──────────────────────────────────────────┘   │
│                                                    │
│ ┌─ Sub-Tickets (0) ──────── [+ Create Sub-Ticket]│  ← BUTTON HERE!
│ │                                           │   │
│ │ No sub-tickets yet. Create one to         │   │
│ │ break down this ticket into smaller       │   │
│ │ tasks.                                    │   │
│ └──────────────────────────────────────────┘   │
└────────────────────────────────────────────────────┘
```

## Troubleshooting:

### "I don't see the Sub-Tickets section at all"
- Make sure you're on the **ticket details page** (not the ticket list or create ticket page)
- Check that you scrolled all the way to the bottom of the page
- Refresh the page (F5 or Ctrl+R)

### "I don't see the Create Sub-Ticket button"
- Check if you're viewing a sub-ticket (sub-tickets can't have their own sub-tickets)
- Look for a badge that says "SUB-TICKET" below the ticket number - if you see this, you're viewing a sub-ticket
- Only parent tickets can have sub-tickets created from them

### "The button is grayed out or doesn't work"
- Check browser console for errors (F12 → Console tab)
- Verify you're logged in as a consultant
- Make sure the API is running on the backend
