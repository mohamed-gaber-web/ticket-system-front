# Comment Module - Usage Guide

## Overview
This document explains how to integrate and use the comment module in your ticketing system.

## Files Created

### 1. Types (`src/types/comment.types.ts`)
- `TicketComment`: Main comment interface
- `CommentBy`: Comment author information
- `CommentsResponse`: API response for list of comments
- `CommentResponse`: API response for single comment
- `CreateCommentPayload`: Payload for creating comments
- `UpdateCommentPayload`: Payload for updating comments
- `CommentQueryParams`: Query parameters for filtering comments

### 2. API Service (`src/api/commentApi.ts`)
API functions for all comment operations:
- `getTicketComments()` - Get all comments for a ticket
- `getPublicComments()` - Get only public comments
- `getInternalComments()` - Get only internal comments
- `createComment()` - Create a new comment
- `updateComment()` - Update an existing comment
- `deleteComment()` - Delete a comment
- `getCommentById()` - Get single comment by ID
- `getCommentsByUserType()` - Get comments by user type
- `getAllComments()` - Get all comments with filters

### 3. Redux Slice (`src/redux/slices/commentSlice.ts`)
State management with async thunks:
- `fetchTicketComments` - Fetch all comments for a ticket
- `fetchPublicComments` - Fetch public comments only
- `fetchInternalComments` - Fetch internal comments only
- `createComment` - Create a comment
- `updateComment` - Update a comment
- `deleteComment` - Delete a comment
- `fetchCommentById` - Fetch single comment

### 4. Components

#### `CommentItem` (`src/components/comments/CommentItem.tsx`)
Displays a single comment with:
- Author name and type badge
- Internal note badge (for staff)
- Timestamp with "edited" indicator
- Edit and delete buttons (for comment owner)
- Inline editing functionality

#### `CommentList` (`src/components/comments/CommentList.tsx`)
Displays a list of comments with:
- Loading state
- Empty state
- Maps through comments and renders CommentItem

#### `AddComment` (`src/components/comments/AddComment.tsx`)
Form for adding new comments with:
- Textarea with character counter (5000 max)
- Internal note checkbox (staff only)
- Form validation
- Submit button with loading state

#### `TicketComments` (`src/components/comments/TicketComments.tsx`)
Main container component with:
- Complete comment system for a ticket
- Toggle between all comments and internal-only (staff)
- Comment counters (public/internal)
- Refresh functionality
- Integration with Redux store

## Integration Steps

### Step 1: Add TicketComments to Your Ticket Detail Page

```tsx
// Example: src/pages/tickets/TicketDetail.tsx
import React from 'react';
import { useParams } from 'react-router-dom';
import { TicketComments } from '@/components/comments';

const TicketDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Your existing ticket details */}
      <div className="ticket-header">
        {/* Ticket information */}
      </div>

      {/* Add the comment module */}
      <TicketComments ticketId={id!} />

      {/* Other sections like attachments, sub-tickets, etc. */}
    </div>
  );
};

export default TicketDetail;
```

### Step 2: Standalone Usage (Custom Implementation)

If you need more control, you can use individual components:

```tsx
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CommentList, AddComment } from '@/components/comments';
import {
  fetchTicketComments,
  createComment,
  updateComment,
  deleteComment,
} from '@/redux/slices/commentSlice';
import type { AppDispatch, RootState } from '@/redux/store';

const CustomCommentsSection: React.FC<{ ticketId: string }> = ({ ticketId }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, userType } = useSelector((state: RootState) => state.auth);
  const { comments, loading } = useSelector((state: RootState) => state.comments);

  useEffect(() => {
    dispatch(fetchTicketComments({ ticketId }));
  }, [ticketId]);

  const handleAddComment = async (commentText: string, isInternal: boolean) => {
    await dispatch(
      createComment({
        ticket: ticketId,
        commentText,
        commentByUserId: user?._id || '',
        commentByUserType: userType || 'customer',
        isInternal,
      })
    ).unwrap();
  };

  const handleUpdateComment = async (
    commentId: string,
    commentText: string,
    isInternal: boolean
  ) => {
    await dispatch(
      updateComment({ commentId, data: { commentText, isInternal } })
    ).unwrap();
  };

  const handleDeleteComment = async (commentId: string) => {
    await dispatch(deleteComment(commentId)).unwrap();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Comments</h2>

      <AddComment
        ticketId={ticketId}
        userId={user?._id || ''}
        userType={userType || 'customer'}
        onSubmit={handleAddComment}
        loading={loading}
      />

      <CommentList
        comments={comments}
        loading={loading}
        currentUserType={userType || 'customer'}
        currentUserId={user?._id || ''}
        onUpdate={handleUpdateComment}
        onDelete={handleDeleteComment}
      />
    </div>
  );
};

export default CustomCommentsSection;
```

## Features

### 1. User Type Based Access Control
- **Customers**: Can only see public comments
- **Consultants/Team Members**: Can see all comments (public + internal)

### 2. Internal Notes
- Staff can mark comments as "Internal" using a checkbox
- Internal comments are highlighted with amber background
- Internal notes are never visible to customers

### 3. Comment Management
- **Create**: Add new comments with text validation
- **Edit**: Inline editing for own comments
- **Delete**: Delete own comments with confirmation
- **Real-time Updates**: Refresh button to fetch latest comments

### 4. Visual Indicators
- User type badges (Customer, Consultant, Team Member)
- Internal note badge (amber color)
- Character counter (5000 max)
- Timestamp with relative time (e.g., "2 hours ago")
- "edited" indicator if comment was modified

### 5. Filter Options (Staff Only)
- Toggle to show internal comments only
- Counter badges showing public vs internal comment counts

## Styling Notes

The components use:
- Tailwind CSS for styling
- shadcn/ui components (Card, Button, Badge, etc.)
- Lucide React for icons
- Consistent spacing and colors with your existing design system

## API Backend Requirements

Ensure your backend has these endpoints running:
- `GET /api/ticket-comments/ticket/:ticketId` - Get all comments
- `GET /api/ticket-comments/ticket/:ticketId/public` - Get public comments
- `GET /api/ticket-comments/ticket/:ticketId/internal` - Get internal comments
- `POST /api/ticket-comments` - Create comment
- `PUT /api/ticket-comments/:id` - Update comment
- `DELETE /api/ticket-comments/:id` - Delete comment

See `FRONTEND_TICKET_COMMENTS_GUIDE.md` for complete API documentation.

## Error Handling

All Redux actions include error handling with toast notifications:
- Success: Green toast notification
- Error: Red toast notification with error message
- Form validation errors displayed inline

## Performance Considerations

1. **Component Cleanup**: The TicketComments component clears comments from Redux when unmounting to prevent stale data
2. **Optimized Re-renders**: Comments are memoized and only re-render when data changes
3. **Pagination Support**: The API supports pagination (already implemented in Redux slice)

## Future Enhancements

Potential improvements you can add:
1. **Real-time Updates**: Implement WebSocket or polling for live comment updates
2. **Pagination UI**: Add pagination controls to handle many comments
3. **Rich Text Editor**: Replace textarea with a rich text editor
4. **File Attachments**: Allow attaching files to comments
5. **Mentions**: Add @mention functionality for users
6. **Reactions**: Add emoji reactions to comments
7. **Search/Filter**: Search within comments
8. **Comment Threading**: Add reply functionality for nested comments

## Troubleshooting

### Comments Not Loading
1. Check Redux store is configured correctly
2. Verify API endpoint is accessible
3. Check authentication token is valid
4. Inspect browser console for errors

### Cannot Create Comments
1. Verify user is authenticated
2. Check user ID and user type are available in Redux state
3. Ensure textarea has content
4. Check API endpoint permissions

### Internal Comments Visible to Customers
1. Verify you're using `fetchPublicComments` for customer view
2. Check `isInternal` flag is being set correctly
3. Verify backend is filtering correctly

## Summary

The comment module is now fully integrated into your ticketing system. Simply import `TicketComments` and pass a `ticketId` prop to get a complete commenting system with all features:

```tsx
import { TicketComments } from '@/components/comments';

// In your component
<TicketComments ticketId={ticketId} />
```

That's it! The component handles everything else automatically.
