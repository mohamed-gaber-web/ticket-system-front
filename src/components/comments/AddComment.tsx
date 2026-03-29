import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Send, Loader2 } from 'lucide-react';
import type { UserType } from '@/types/auth.types';

interface AddCommentProps {
  ticketId: string;
  userId: string;
  userType: UserType;
  onSubmit: (commentText: string, isInternal: boolean) => Promise<void>;
  loading?: boolean;
}

const AddComment: React.FC<AddCommentProps> = ({
  userType,
  onSubmit,
  loading = false,
}) => {
  const [commentText, setCommentText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isStaff = userType === 'consultant' || userType === 'team_member';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!commentText.trim()) {
      setError('Please enter a comment');
      return;
    }

    if (commentText.length > 5000) {
      setError('Comment is too long (max 5000 characters)');
      return;
    }

    try {
      setError(null);
      await onSubmit(commentText.trim(), isInternal);
      setCommentText('');
      setIsInternal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to add comment');
    }
  };

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Textarea
            placeholder="Add a comment..."
            value={commentText}
            onChange={(e) => {
              setCommentText(e.target.value);
              if (error) setError(null);
            }}
            disabled={loading}
            className="min-h-[100px] resize-none"
            maxLength={5000}
          />
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-on-surface-variant">
              {commentText.length} / 5000 characters
            </p>
          </div>
        </div>

        {isStaff && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isInternal"
              checked={isInternal}
              onCheckedChange={(checked) => setIsInternal(checked as boolean)}
              disabled={loading}
            />
            <Label
              htmlFor="isInternal"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Internal note (not visible to customers)
            </Label>
          </div>
        )}

        {error && (
          <div className="text-sm text-error bg-error/5 rounded-[0.5rem] p-2">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={loading || !commentText.trim()}
            className="min-w-[120px]"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Posting...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Post Comment
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default AddComment;
