import React from 'react';
import CommentItem from './CommentItem';
import { Loader2 } from 'lucide-react';
import type { TicketComment } from '@/types/comment.types';
import type { UserType } from '@/types/auth.types';

interface CommentListProps {
  comments: TicketComment[];
  loading: boolean;
  currentUserType: UserType;
  currentUserId: string;
  isAdmin?: boolean;
  onUpdate?: (commentId: string, commentText: string, isInternal: boolean) => void;
  onDelete?: (commentId: string) => void;
}

const CommentList: React.FC<CommentListProps> = ({
  comments,
  loading,
  currentUserType,
  currentUserId,
  isAdmin = false,
  onUpdate,
  onDelete,
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-on-surface-variant/60" />
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-on-surface-variant">No comments yet. Be the first to comment!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <CommentItem
          key={comment._id}
          comment={comment}
          currentUserType={currentUserType}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

export default CommentList;
