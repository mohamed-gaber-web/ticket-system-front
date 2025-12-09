# Troubleshooting Guide

## Issues Fixed

### ✅ Issue 1: "Cannot destructure property 'loading' of 'useSelector(...)' as it is undefined"

**Problem**: The Redux state selector was using the wrong key.

**Root Cause**:
- Store registers the slice as `assignments` (plural)
- Components were using `state.assignment` (singular)

**Solution Applied**:
```typescript
// ❌ WRONG
const { loading } = useSelector((state: RootState) => state.assignment);

// ✅ CORRECT
const { loading } = useSelector((state: RootState) => state.assignments);
```

**Files Fixed**:
1. ✅ [src/components/assignment/AssignTicketDialog.tsx](src/components/assignment/AssignTicketDialog.tsx) - Line 39
2. ✅ [src/pages/team-member/TeamMemberDashboard.tsx](src/pages/team-member/TeamMemberDashboard.tsx) - Line 25

---

## Redux Store Configuration

**File**: [src/redux/store.ts](src/redux/store.ts)

```typescript
export const store = configureStore({
  reducer: {
    customers: customerReducer,
    auth: authReducer,
    tickets: ticketReducer,
    categories: categoryReducer,
    consultants: consultantReducer,
    assignments: assignmentReducer,  // ← Note: plural "assignments"
    teams: teamReducer,
    teamMembers: teamMemberReducer,
  },
});
```

### How to Access State:

```typescript
// Correct selectors
const { assignments, loading } = useSelector((state: RootState) => state.assignments);
const { user } = useSelector((state: RootState) => state.auth);
const { teams } = useSelector((state: RootState) => state.teams);
const { tickets } = useSelector((state: RootState) => state.tickets);
const { customers } = useSelector((state: RootState) => state.customers);
const { categories } = useSelector((state: RootState) => state.categories);
const { consultants } = useSelector((state: RootState) => state.consultants);
const { teamMembers } = useSelector((state: RootState) => state.teamMembers);
```

---

## Common Issues & Solutions

### Issue: "Cannot find module '@/components/ui/xxx'"

**Cause**: Missing UI component

**Solutions**:
- ✅ Badge component created
- ✅ Dialog component created
- ✅ Label component created
- ✅ Textarea component created
- ✅ Select component created

All UI components are now available in `src/components/ui/`

---

### Issue: "Module not found: Can't resolve '@radix-ui/react-xxx'"

**Cause**: Missing Radix UI packages

**Solution**: Already installed
```bash
npm install @radix-ui/react-dialog @radix-ui/react-label @radix-ui/react-select
```

---

### Issue: Teams dropdown is empty

**Cause**: Teams not loaded

**Solution**: Dialog automatically fetches teams when opened
```typescript
useEffect(() => {
  if (open && teams.length === 0) {
    dispatch(fetchTeams({}));
  }
}, [open, teams.length, dispatch]);
```

---

### Issue: "user is undefined"

**Cause**: User not logged in or auth state not initialized

**Solution**: Check if user exists before accessing
```typescript
{user && (
  <AssignTicketDialog
    consultantId={user._id}
    // ...
  />
)}
```

---

### Issue: API calls returning 401 Unauthorized

**Causes**:
1. Not logged in
2. Token expired
3. Token not being sent

**Solutions**:
1. Login first
2. Refresh token if expired
3. Check axios config includes auth token

---

### Issue: Ticket status not updating

**Cause**: Need to refresh ticket list after assignment

**Solution**: Already handled in Redux reducers
```typescript
.addCase(createAssignment.fulfilled, (state, action) => {
  state.loading = false;
  state.assignments.unshift(action.payload);
  // Ticket status updates automatically via backend
})
```

---

### Issue: Cannot accept assignment - "Team member does not belong to assigned team"

**Cause**: Backend validates team membership

**Solution**: Make sure:
1. User is a team member (not consultant)
2. User belongs to the team the ticket is assigned to
3. Correct team member ID is being sent

---

### Issue: Assignment already accepted error

**Cause**: Trying to accept an already accepted assignment

**Solution**: UI already handles this
```typescript
{assignment.acceptedBy ? (
  <Badge>Accepted</Badge>
) : (
  <Button onClick={() => handleAccept(assignment._id)}>
    Accept
  </Button>
)}
```

---

## Debugging Tips

### 1. Check Redux State in DevTools

Install Redux DevTools extension and check:
```
State > assignments > assignments (array of assignments)
State > assignments > loading (boolean)
State > assignments > error (string | null)
```

### 2. Check Network Tab

Monitor API calls:
- POST `/api/ticket-assignments` - Create assignment
- PATCH `/api/ticket-assignments/:id/accept` - Accept assignment
- GET `/api/ticket-assignments/team-member/:id` - Get member assignments

### 3. Check Console for Errors

Common errors:
- Undefined state properties
- API errors
- Validation errors

### 4. Verify User Role

Team members and consultants have different permissions:
```typescript
// Check user role
console.log('User:', user);
console.log('User ID:', user._id);
console.log('User Role:', user.role);
```

---

## Testing Checklist

### Before Testing:
- [ ] Backend server is running
- [ ] Database is connected
- [ ] User is logged in
- [ ] Teams exist in database
- [ ] Team members are assigned to teams

### Test Assignment Creation:
- [ ] Consultant can see "Assign" button
- [ ] Dialog opens when clicked
- [ ] Teams load in dropdown
- [ ] Can select team
- [ ] Can add notes
- [ ] Assignment created successfully
- [ ] Toast notification appears
- [ ] Ticket status changes to "assigned"

### Test Assignment Acceptance:
- [ ] Team member can navigate to `/my-assignments`
- [ ] Sees assigned tickets
- [ ] Can filter by Pending/Accepted
- [ ] Can accept pending assignments
- [ ] Toast notification appears
- [ ] Ticket moves to Accepted tab
- [ ] Ticket status changes to "in_progress"

---

## Environment Variables

Make sure your `.env` file includes:
```env
VITE_API_BASE_URL=http://localhost:5000/api
# or whatever your backend URL is
```

---

## Quick Fixes

### Clear Build Cache
```bash
npm run clean
npm install
npm run dev
```

### Clear Browser Cache
- Open DevTools (F12)
- Right-click refresh button
- Select "Empty Cache and Hard Reload"

### Restart Dev Server
```bash
# Stop server (Ctrl+C)
npm run dev
```

---

## Still Having Issues?

1. **Check Backend Logs**: Look for API errors
2. **Check Browser Console**: Look for JavaScript errors
3. **Check Redux DevTools**: Verify state structure
4. **Check Network Tab**: Verify API calls are made
5. **Verify Data**: Check if teams/users exist in database

---

## Contact & Support

If issues persist:
1. Check the implementation guides in the root folder
2. Review API documentation: `TICKET_ASSIGNMENT_API_DOCUMENTATION.md`
3. Check workflow diagrams: `WORKFLOW_DIAGRAM.md`

---

## Known Limitations

1. **Real-time Updates**: No WebSocket integration (requires page refresh)
2. **Notifications**: No push notifications (only toast messages)
3. **Assignment History**: Not displayed on ticket detail page (future enhancement)
4. **Reassignment UI**: No UI for reassignment (API exists, UI pending)

---

## Success Indicators

Everything is working correctly when:
- ✅ No console errors
- ✅ Teams load in dropdown
- ✅ Assignment created successfully
- ✅ Toast notifications appear
- ✅ Ticket status updates
- ✅ Assignments visible in team member dashboard
- ✅ Accept button works
- ✅ Statistics update correctly
