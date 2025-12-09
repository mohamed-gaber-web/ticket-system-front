# Sign In Guide

## ✅ Team Member Sign In Added!

The signin page now supports **three user types**:
1. **Customer**
2. **Consultant**
3. **Team Member** ← NEW!

---

## 🔐 How to Sign In

### Step 1: Navigate to Sign In Page
Go to: `http://localhost:5173/signin` (or your app URL)

### Step 2: Select User Type
Click on one of the three buttons:
- **Customer** - For customers who create tickets
- **Consultant** - For consultants who assign tickets
- **Team Member** - For team members who accept and work on tickets

### Step 3: Enter Credentials
- **Email**: Your registered email address
- **Password**: Your password

### Step 4: Click "Sign In"

---

## 👥 User Types & Access

### Customer
**Can access:**
- Create tickets
- View own tickets
- Update ticket status

**Cannot access:**
- Assign tickets
- Team member dashboard

---

### Consultant
**Can access:**
- View all tickets
- **Assign tickets to teams** ✅
- View customer information
- Create/edit tickets

**Access the assignment feature:**
1. Go to `/tickets`
2. Click **"Assign"** button on any ticket
3. Select a team
4. Add notes (optional)
5. Click **"Assign Ticket"**

---

### Team Member ⭐ NEW!
**Can access:**
- **My Assignments Dashboard** at `/my-assignments` ✅
- View tickets assigned to their team
- **Accept pending assignments** ✅
- Work on accepted tickets
- Update ticket status

**How to use:**
1. Sign in as **Team Member**
2. Navigate to `/my-assignments`
3. View your assigned tickets
4. Filter by: All / Pending / Accepted
5. Click **"Accept"** on pending tickets
6. Click on any row to view ticket details

---

## 🧪 Testing the Complete Workflow

### Test Scenario: Assign & Accept Ticket

#### Part 1: Consultant Assigns Ticket
1. **Sign in as Consultant**
   - User Type: Consultant
   - Email: `consultant@example.com`
   - Password: Your consultant password

2. **Navigate to Tickets**
   - Go to `/tickets`

3. **Assign a Ticket**
   - Find a ticket with status "new"
   - Click the purple **"Assign"** button
   - Select a team from dropdown
   - Add notes: "Urgent issue"
   - Click **"Assign Ticket"**

4. **Verify**
   - ✅ Toast: "Ticket assigned successfully!"
   - ✅ Ticket status changes to "assigned"

#### Part 2: Team Member Accepts Ticket
1. **Sign Out** (if needed)

2. **Sign in as Team Member**
   - User Type: **Team Member**
   - Email: `teammember@example.com` (member of the assigned team)
   - Password: Your team member password

3. **Navigate to My Assignments**
   - Go to `/my-assignments`
   - OR click "My Assignments" in the navigation

4. **View Assigned Tickets**
   - See dashboard with statistics
   - See the ticket assigned in Part 1

5. **Accept the Ticket**
   - Click the **"Pending"** tab
   - Find the ticket
   - Click **"Accept"** button

6. **Verify**
   - ✅ Toast: "Assignment accepted successfully!"
   - ✅ Ticket moves to "Accepted" tab
   - ✅ Ticket status changes to "in_progress"

---

## 📋 Sample Test Accounts

You'll need to create these in your backend database:

### Consultant Account
```json
{
  "email": "consultant@example.com",
  "password": "password123",
  "role": "consultant",
  "firstName": "John",
  "lastName": "Doe"
}
```

### Team Account
```json
{
  "_id": "team001",
  "teamName": "Support Team A",
  "department": "Customer Support"
}
```

### Team Member Account
```json
{
  "email": "teammember@example.com",
  "password": "password123",
  "role": "team_member",
  "firstName": "Jane",
  "lastName": "Smith",
  "team": "team001"  // Must belong to a team!
}
```

**Important**: Team member must have a `team` field that references a valid team ID!

---

## 🔑 Authentication Flow

### Frontend
```
1. User selects user type (customer/consultant/team_member)
2. User enters email and password
3. Frontend sends POST request to backend:
   {
     "email": "user@example.com",
     "password": "password123",
     "userType": "team_member"
   }
4. Backend validates and returns JWT token
5. Frontend stores token and user info in Redux
6. User is redirected to dashboard
```

### Backend Endpoints
- **Sign In**: `POST /api/auth/signin`
- **Request Body**:
  ```json
  {
    "email": "string",
    "password": "string",
    "userType": "customer" | "consultant" | "team_member"
  }
  ```

---

## ⚠️ Common Issues

### Issue 1: "Invalid credentials"
**Cause**: Wrong email, password, or user type

**Solution**:
- Verify email and password are correct
- Make sure you selected the correct user type
- Check if user exists in database with the correct role

---

### Issue 2: "Team member not found"
**Cause**: User doesn't have team_member role in database

**Solution**:
- Check database: User must have `role: "team_member"`
- User must have a valid `team` field referencing a team ID

---

### Issue 3: Cannot see "My Assignments"
**Cause**: Not signed in as team member

**Solution**:
1. Sign out
2. Sign in again
3. Select **"Team Member"** user type
4. Navigate to `/my-assignments`

---

### Issue 4: No tickets in "My Assignments"
**Cause**: No tickets assigned to your team yet

**Solution**:
1. Sign in as consultant
2. Assign some tickets to your team
3. Sign back in as team member
4. Refresh `/my-assignments`

---

## 🎯 Features Available by User Type

| Feature | Customer | Consultant | Team Member |
|---------|----------|------------|-------------|
| View own tickets | ✅ | ✅ | ✅ |
| Create tickets | ✅ | ✅ | ❌ |
| **Assign tickets** | ❌ | ✅ | ❌ |
| View all tickets | ❌ | ✅ | ❌ |
| **My Assignments dashboard** | ❌ | ❌ | ✅ |
| **Accept assignments** | ❌ | ❌ | ✅ |
| Update ticket status | ✅ | ✅ | ✅ |

---

## 🚀 Quick Start

### 1. Start Backend Server
```bash
cd backend
npm start
```

### 2. Start Frontend Server
```bash
cd front-end/my-react-ts-app
npm run dev
```

### 3. Create Test Accounts
- Create a consultant account in database
- Create a team in database
- Create a team member account linked to that team

### 4. Test the Flow
1. Sign in as **Consultant** → Assign ticket
2. Sign in as **Team Member** → Accept ticket
3. Verify status changes at each step

---

## 📚 Related Documentation

- **[IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md)** - Feature overview
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues
- **[WORKFLOW_DIAGRAM.md](WORKFLOW_DIAGRAM.md)** - Visual workflow
- **[QUICK_START.md](QUICK_START.md)** - Quick reference

---

## ✅ Success!

You can now sign in as a **Team Member** and test the complete ticket assignment workflow!

**What to do next:**
1. Go to `/signin`
2. Click **"Team Member"** button
3. Enter your team member credentials
4. Navigate to `/my-assignments`
5. Accept pending tickets and start working! 🎉
