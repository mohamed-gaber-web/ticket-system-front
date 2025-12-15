import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Trash2, X, Check } from 'lucide-react';
import type { TicketComment } from '@/types/comment.types';
import type { UserType } from '@/types/auth.types';

interface CommentItemProps {
  comment: TicketComment;
  currentUserType: UserType;
  currentUserId: string;
  onUpdate?: (commentId: string, commentText: string, isInternal: boolean) => void;
  onDelete?: (commentId: string) => void;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  currentUserType,
  currentUserId,
  onUpdate,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(comment.commentText);

  const isOwnComment = comment.commentByUserId === currentUserId;
  const canSeeInternal = currentUserType !== 'customer';

  // Debug logging for edit/delete buttons visibility
  console.log('🔍 Comment Item Debug:', {
    commentId: comment._id,
    commentByUserId: comment.commentByUserId,
    currentUserId: currentUserId,
    isOwnComment: isOwnComment,
    bothDefined: Boolean(comment.commentByUserId && currentUserId),
    typesMatch: typeof comment.commentByUserId === typeof currentUserId,
  });

  const getAuthorName = () => {
    const author = comment.commentBy;

    if (!author) {
      return 'Unknown User';
    }

    // For consultants and team members - use firstName + lastName
    if (author.firstName && author.lastName) {
      return `${author.firstName} ${author.lastName}`;
    }

    // For consultants/team members with only firstName
    if (author.firstName) {
      return author.firstName;
    }

    // For customers - use companyName or contactPerson
    if (author.companyName) {
      return author.companyName;
    }

    if (author.contactPerson) {
      return author.contactPerson;
    }

    // Fallback to email username
    return author.email?.split('@')[0] || 'Unknown User';
  };

  const getUserTypeBadgeVariant = (userType: UserType) => {
    switch (userType) {
      case 'customer':
        return 'default';
      case 'consultant':
        return 'secondary';
      case 'team_member':
        return 'outline';
      default:
        return 'default';
    }
  };

  const handleSaveEdit = () => {
    if (!editedText.trim()) {
      return; // Don't allow empty comments
    }

    if (onUpdate && editedText.trim() !== comment.commentText) {
      onUpdate(comment._id, editedText.trim(), comment.isInternal);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedText(comment.commentText);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this comment? This action cannot be undone.')) {
      onDelete?.(comment._id);
    }
  };

  return (
    <Card className={`p-4 ${comment.isInternal && canSeeInternal ? 'border-amber-200 bg-amber-50/50' : ''}`}>
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900">{getAuthorName()}</span>
              <Badge variant={getUserTypeBadgeVariant(comment.commentByUserType)}>
                {comment.commentByUserType.replace('_', ' ')}
              </Badge>
              {comment.isInternal && canSeeInternal && (
                <Badge variant="destructive" className="bg-amber-500 hover:bg-amber-600">
                  Internal Note
                </Badge>
              )}
            </div>
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              {comment.updatedAt !== comment.createdAt && ' (edited)'}
            </span>
          </div>

          {isOwnComment && (
            <div className="flex items-center gap-1">
              {!isEditing ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    title="Edit comment"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Delete comment"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSaveEdit}
                    className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                    title="Save changes"
                    disabled={!editedText.trim()}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    className="h-8 w-8 p-0 text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                    title="Cancel editing"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="text-gray-700">
          {isEditing ? (
            <Textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="min-h-[80px]"
              autoFocus
            />
          ) : (
            <p className="whitespace-pre-wrap break-words">{comment.commentText}</p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default CommentItem;
