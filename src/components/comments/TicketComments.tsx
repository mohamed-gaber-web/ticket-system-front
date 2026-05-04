import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Lock, Unlock, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import CommentList from './CommentList';
import AddComment from './AddComment';
import {
  fetchTicketComments,
  fetchPublicComments,
  createComment,
  updateComment,
  deleteComment,
  clearComments,
} from '@/redux/slices/commentSlice';
import { sendCommentEmail } from '@/api/emailApi';
import { uploadFile } from '@/api/attachmentApi';
import type { AppDispatch, RootState } from '@/redux/store';
import type { UserType } from '@/types/auth.types';
import type { CommentImage } from '@/types/comment.types';
import type { Consultant } from '@/types/consultant.types';

interface TicketCommentsProps {
  ticketId: string;
}

const TicketComments: React.FC<TicketCommentsProps> = ({ ticketId }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [showInternalOnly, setShowInternalOnly] = useState(false);

  const { user, userType } = useSelector((state: RootState) => state.auth);
  const { comments, loading, total } = useSelector((state: RootState) => state.comments);
  const { currentTicket } = useSelector((state: RootState) => state.tickets);
  const { currentAssignment } = useSelector((state: RootState) => state.assignments);

  const isStaff = userType === 'consultant' || userType === 'team_member';
  const isCustomer = userType === 'customer';
  const isAdmin = (user as any)?.role === 'admin';

  useEffect(() => {
    loadComments();

    return () => {
      dispatch(clearComments());
    };
  }, [ticketId, showInternalOnly]);

  const loadComments = async () => {
    try {
      if (isCustomer) {
        await dispatch(fetchPublicComments({ ticketId })).unwrap();
      } else if (showInternalOnly) {
        await dispatch(fetchTicketComments({ ticketId, params: { isInternal: true } })).unwrap();
      } else {
        await dispatch(fetchTicketComments({ ticketId, params: { includeInternal: true } })).unwrap();
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load comments');
    }
  };

  const handleAddComment = async (commentText: string, isInternal: boolean, emails: string[], imageFiles: File[]) => {
    if (!user?._id || !userType) return;

    let images: CommentImage[] = [];
    if (imageFiles.length > 0) {
      try {
        const uploads = await Promise.all(imageFiles.map((f) => uploadFile(f, ticketId)));
        images = uploads.map((u) => ({
          url: u.url,
          fileName: u.fileName,
          fileSize: u.fileSize,
          fileType: u.fileType,
          fileId: u.fileId,
        }));
      } catch {
        toast.error('Failed to upload images. Comment not posted.');
        return;
      }
    }

    await dispatch(
      createComment({
        ticket: ticketId,
        commentText,
        commentByUserId: user._id,
        commentByUserType: userType,
        isInternal,
        images,
      })
    ).unwrap();

    const senderName =
      (user as any).firstName
        ? `${(user as any).firstName} ${(user as any).lastName ?? ''}`.trim()
        : (user as any).companyName ?? (user as any).contactPerson ?? 'Support Team';

    // Derive assigned consultant emails (used for both internal notes and customer comments)
    const assignedConsultantEmails: string[] = currentAssignment
      ? (currentAssignment.assignedToConsultants ?? [])
          .map((ca: any) => {
            const c: Consultant | null = ca.consultant && typeof ca.consultant !== 'string' ? ca.consultant : null;
            return c?.email ?? null;
          })
          .filter((email: string | null): email is string => !!email && email !== (user as any).email)
      : [];

    // Auto-notify assigned consultants on internal notes or customer comments
    const autoRecipients =
      (isInternal || isCustomer) && assignedConsultantEmails.length > 0
        ? assignedConsultantEmails
        : [];

    const allRecipients = [...new Set([...emails, ...autoRecipients])];

    if (allRecipients.length > 0) {
      try {
        await sendCommentEmail({
          ticketId,
          ticketNumber: currentTicket?.ticketNumber ?? ticketId,
          commentText,
          recipients: allRecipients,
          senderName,
        });
        if (isCustomer && !isInternal) {
          toast.success(`Consultants notified of your comment`);
        } else if (isInternal && autoRecipients.length > 0) {
          toast.success(`Internal note emailed to ${autoRecipients.length} consultant${autoRecipients.length > 1 ? 's' : ''}`);
        } else {
          toast.success(`Comment emailed to ${emails.length} recipient${emails.length > 1 ? 's' : ''}`);
        }
      } catch {
        toast.error('Comment posted but failed to send emails');
      }
    }
  };

  const handleUpdateComment = async (
    commentId: string,
    commentText: string,
    isInternal: boolean
  ) => {
    await dispatch(
      updateComment({
        commentId,
        data: { commentText, isInternal },
      })
    ).unwrap();
  };

  const handleDeleteComment = async (commentId: string) => {
    await dispatch(deleteComment(commentId)).unwrap();
  };

  const publicCommentsCount = comments.filter((c) => !c.isInternal).length;
  const internalCommentsCount = comments.filter((c) => c.isInternal).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-on-surface-variant" />
              <CardTitle className="text-lg text-on-surface">
                Comments
              </CardTitle>
              <Badge className="ml-1">
                {total}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              {isStaff && (
                <div className="flex items-center gap-2 mr-2">
                  <Button
                    variant={showInternalOnly ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setShowInternalOnly(!showInternalOnly)}
                    className="gap-2"
                  >
                    {showInternalOnly ? (
                      <>
                        <Lock className="h-3.5 w-3.5" />
                        Internal ({internalCommentsCount})
                      </>
                    ) : (
                      <>
                        <Unlock className="h-3.5 w-3.5" />
                        All
                      </>
                    )}
                  </Button>
                  {!showInternalOnly && (
                    <div className="text-xs text-on-surface-variant">
                      <span className="text-brand-500 font-semibold">{publicCommentsCount}</span> Public
                      {' · '}
                      <span className="text-yellow-600 font-semibold">{internalCommentsCount}</span> Internal
                    </div>
                  )}
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={loadComments}
                disabled={loading}
                className="gap-1.5 text-on-surface-variant"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <AddComment
            ticketId={ticketId}
            userId={user?._id || ''}
            userType={userType as UserType}
            onSubmit={handleAddComment}
            loading={loading}
          />

          <div className="h-px bg-surface-container-high" />

          <CommentList
            comments={comments}
            loading={loading}
            currentUserType={userType as UserType}
            currentUserId={user?._id || ''}
            isAdmin={isAdmin}
            onUpdate={handleUpdateComment}
            onDelete={handleDeleteComment}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default TicketComments;
