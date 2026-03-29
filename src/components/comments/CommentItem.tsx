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

  const getAuthorName = () => {
    const author = comment.commentBy;

    if (!author) return 'Unknown User';
    if (author.firstName && author.lastName) return `${author.firstName} ${author.lastName}`;
    if (author.firstName) return author.firstName;
    if (author.companyName) return author.companyName;
    if (author.contactPerson) return author.contactPerson;
    return author.email?.split('@')[0] || 'Unknown User';
  };

  const getUserTypeBadgeVariant = (userType: UserType) => {
    switch (userType) {
      case 'customer': return 'default';
      case 'consultant': return 'secondary';
      case 'team_member': return 'outline';
      default: return 'default';
    }
  };

  const handleSaveEdit = () => {
    if (!editedText.trim()) return;
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
    <Card className={`p-4 ${comment.isInternal && canSeeInternal ? 'bg-yellow-500/5' : ''}`}>
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-on-surface">{getAuthorName()}</span>
              <Badge variant={getUserTypeBadgeVariant(comment.commentByUserType)}>
                {comment.commentByUserType.replace('_', ' ')}
              </Badge>
              {comment.isInternal && canSeeInternal && (
                <Badge className="bg-yellow-500/15 text-yellow-700">
                  Internal Note
                </Badge>
              )}
            </div>
            <span className="text-xs text-on-surface-variant">
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
                    size="icon-sm"
                    onClick={() => setIsEditing(true)}
                    className="text-on-surface-variant hover:text-brand-500"
                    title="Edit comment"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleDelete}
                    className="text-on-surface-variant hover:text-error"
                    title="Delete comment"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleSaveEdit}
                    className="text-green-600 hover:text-green-700"
                    title="Save changes"
                    disabled={!editedText.trim()}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleCancelEdit}
                    className="text-on-surface-variant hover:text-on-surface"
                    title="Cancel editing"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="text-on-surface text-sm">
          {isEditing ? (
            <Textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="min-h-[80px]"
              autoFocus
            />
          ) : (
            <p className="whitespace-pre-wrap break-words leading-relaxed">{comment.commentText}</p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default CommentItem;
