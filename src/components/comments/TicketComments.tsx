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
import type { AppDispatch, RootState } from '@/redux/store';
import type { UserType } from '@/types/auth.types';

interface TicketCommentsProps {
  ticketId: string;
}

const TicketComments: React.FC<TicketCommentsProps> = ({ ticketId }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [showInternalOnly, setShowInternalOnly] = useState(false);

  const { user, userType } = useSelector((state: RootState) => state.auth);
  const { comments, loading, total } = useSelector((state: RootState) => state.comments);

  const isStaff = userType === 'consultant' || userType === 'team_member';
  const isCustomer = userType === 'customer';

  useEffect(() => {
    loadComments();

    return () => {
      dispatch(clearComments());
    };
  }, [ticketId, showInternalOnly]);

  const loadComments = async () => {
    try {
      console.log('🔄 Loading comments for ticket:', ticketId);
      console.log('User type:', userType);

      if (isCustomer) {
        console.log('📥 Fetching public comments only');
        await dispatch(fetchPublicComments({ ticketId })).unwrap();
      } else if (showInternalOnly) {
        console.log('📥 Fetching internal comments only');
        await dispatch(fetchTicketComments({ ticketId, params: { isInternal: true } })).unwrap();
      } else {
        console.log('📥 Fetching all comments');
        await dispatch(fetchTicketComments({ ticketId, params: { includeInternal: true } })).unwrap();
      }

      console.log('✅ Comments loaded successfully');
    } catch (error: any) {
      console.error('❌ Error loading comments:', error);
      console.error('Full error object:', error);
      toast.error(error?.message || 'Failed to load comments');
    }
  };

  const handleAddComment = async (commentText: string, isInternal: boolean) => {
    if (!user?._id || !userType) return;

    await dispatch(
      createComment({
        ticket: ticketId,
        commentText,
        commentByUserId: user._id,
        commentByUserType: userType,
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
      updateComment({
        commentId,
        data: { commentText, isInternal },
      })
    ).unwrap();
  };

  const handleDeleteComment = async (commentId: string) => {
    // Confirmation is handled in CommentItem component
    await dispatch(deleteComment(commentId)).unwrap();
  };

  const publicCommentsCount = comments.filter((c) => !c.isInternal).length;
  const internalCommentsCount = comments.filter((c) => c.isInternal).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              <CardTitle className="text-xl">
                Comments
                <Badge variant="secondary" className="ml-2">
                  {total}
                </Badge>
              </CardTitle>
            </div>

            <div className="flex items-center gap-2">
              {isStaff && (
                <div className="flex items-center gap-2 mr-4">
                  <Button
                    variant={showInternalOnly ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setShowInternalOnly(!showInternalOnly)}
                    className="gap-2"
                  >
                    {showInternalOnly ? (
                      <>
                        <Lock className="h-4 w-4" />
                        Internal Only ({internalCommentsCount})
                      </>
                    ) : (
                      <>
                        <Unlock className="h-4 w-4" />
                        All Comments
                      </>
                    )}
                  </Button>
                  {!showInternalOnly && (
                    <div className="text-sm text-gray-600">
                      <span className="text-blue-600 font-medium">{publicCommentsCount}</span> Public
                      {' | '}
                      <span className="text-amber-600 font-medium">{internalCommentsCount}</span> Internal
                    </div>
                  )}
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={loadComments}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
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

          <div className="border-t pt-4">
            <CommentList
              comments={comments}
              loading={loading}
              currentUserType={userType as UserType}
              currentUserId={user?._id || ''}
              onUpdate={handleUpdateComment}
              onDelete={handleDeleteComment}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TicketComments;
