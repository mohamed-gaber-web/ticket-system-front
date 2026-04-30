import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Pencil, Trash2, X, Check, ZoomIn, FileText, FileSpreadsheet, Archive, Paperclip, Download } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import type { TicketComment, CommentImage } from '@/types/comment.types';
import type { UserType } from '@/types/auth.types';

const MySwal = withReactContent(Swal);

interface CommentItemProps {
  comment: TicketComment;
  currentUserType: UserType;
  currentUserId: string;
  isAdmin?: boolean;
  onUpdate?: (commentId: string, commentText: string, isInternal: boolean) => void;
  onDelete?: (commentId: string) => void;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  currentUserType,
  currentUserId,
  isAdmin = false,
  onUpdate,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(comment.commentText);
  const [lightboxImage, setLightboxImage] = useState<CommentImage | null>(null);

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

  const handleDelete = async () => {
    const result = await MySwal.fire({
      title: 'Delete Comment?',
      html: `
        <div class="text-left">
          <p class="mb-2">Are you sure you want to delete this comment?</p>
          <p style="color: #BA1A1A">This action cannot be undone!</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#BA1A1A',
      cancelButtonColor: '#434653',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      focusCancel: true,
    });

    if (result.isConfirmed) {
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

          {(isOwnComment || isAdmin) && (
            <div className="flex items-center gap-1">
              {!isEditing ? (
                <>
                  {isOwnComment && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setIsEditing(true)}
                      className="text-on-surface-variant hover:text-brand-500"
                      title="Edit comment"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={handleDelete}
                      className="text-on-surface-variant hover:text-error"
                      title="Delete comment"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
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

        {!isEditing && comment.images && comment.images.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {comment.images.map((img, i) => {
              const isImage = !img.fileType || img.fileType.startsWith('image/');
              if (isImage) {
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setLightboxImage(img)}
                    className="relative group block rounded-lg overflow-hidden border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    title={img.fileName}
                  >
                    <img src={img.url} alt={img.fileName} className="h-20 w-20 object-cover transition-opacity group-hover:opacity-75" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                      <ZoomIn className="h-5 w-5 text-white drop-shadow" />
                    </div>
                  </button>
                );
              }
              const Icon =
                img.fileType === 'application/pdf' ? FileText :
                img.fileType?.includes('excel') || img.fileType?.includes('spreadsheet') ? FileSpreadsheet :
                img.fileType?.includes('zip') ? Archive : Paperclip;
              const iconColor =
                img.fileType === 'application/pdf' ? 'text-red-500' :
                img.fileType?.includes('excel') || img.fileType?.includes('spreadsheet') ? 'text-emerald-600' :
                img.fileType?.includes('zip') ? 'text-amber-500' : 'text-on-surface-variant';
              return (
                <a
                  key={i}
                  href={img.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={img.fileName}
                  className="flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-lg border border-outline-variant/30 bg-surface-container-low hover:bg-surface-container-high transition-colors group max-w-[220px]"
                  title={img.fileName}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
                  <span className="text-xs font-medium text-on-surface truncate flex-1">{img.fileName}</span>
                  <Download className="h-3.5 w-3.5 text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </a>
              );
            })}
          </div>
        )}

        {/* Lightbox */}
        <Dialog open={!!lightboxImage} onOpenChange={(open) => !open && setLightboxImage(null)}>
          <DialogContent className="max-w-4xl w-full p-2 bg-black/90 border-none">
            {lightboxImage && (
              <img
                src={lightboxImage.url}
                alt={lightboxImage.fileName}
                className="w-full max-h-[80vh] object-contain rounded"
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
};

export default CommentItem;
