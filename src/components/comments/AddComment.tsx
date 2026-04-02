import React, { useState, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Send, Loader2, Mail, X, Plus } from 'lucide-react';
import type { UserType } from '@/types/auth.types';

interface AddCommentProps {
  ticketId: string;
  userId: string;
  userType: UserType;
  onSubmit: (commentText: string, isInternal: boolean, emails: string[]) => Promise<void>;
  loading?: boolean;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AddComment: React.FC<AddCommentProps> = ({
  userType,
  onSubmit,
  loading = false,
}) => {
  const [commentText, setCommentText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showEmailSection, setShowEmailSection] = useState(false);
  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  const isStaff = userType === 'consultant' || userType === 'team_member';

  const addEmail = (raw: string) => {
    const value = raw.trim().toLowerCase();
    if (!value) return;
    if (!EMAIL_REGEX.test(value)) {
      setEmailError('Invalid email address');
      return;
    }
    if (emails.includes(value)) {
      setEmailError('Email already added');
      return;
    }
    setEmails((prev) => [...prev, value]);
    setEmailInput('');
    setEmailError(null);
  };

  const handleEmailKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmail(emailInput);
    } else if (e.key === 'Backspace' && !emailInput && emails.length > 0) {
      setEmails((prev) => prev.slice(0, -1));
    }
  };

  const removeEmail = (email: string) => {
    setEmails((prev) => prev.filter((e) => e !== email));
  };

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

    // Add any pending email in the input
    const pendingEmail = emailInput.trim().toLowerCase();
    let finalEmails = [...emails];
    if (pendingEmail) {
      if (!EMAIL_REGEX.test(pendingEmail)) {
        setEmailError('Invalid email address');
        emailInputRef.current?.focus();
        return;
      }
      if (!finalEmails.includes(pendingEmail)) {
        finalEmails = [...finalEmails, pendingEmail];
        setEmails(finalEmails);
        setEmailInput('');
      }
    }

    try {
      setError(null);
      await onSubmit(commentText.trim(), isInternal, finalEmails);
      setCommentText('');
      setIsInternal(false);
      setEmails([]);
      setEmailInput('');
      setShowEmailSection(false);
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

        {/* External Email Recipients */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowEmailSection((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-medium text-brand-500 hover:text-brand-600 transition-colors"
          >
            <Mail className="h-3.5 w-3.5" />
            {showEmailSection ? 'Hide' : 'Send to external emails'}
            {emails.length > 0 && !showEmailSection && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-brand-500/10 text-brand-600 text-[10px] font-semibold">
                {emails.length}
              </span>
            )}
          </button>

          {showEmailSection && (
            <div className="rounded-[0.75rem] border border-border bg-surface-container-low p-3 space-y-2">
              <p className="text-xs text-on-surface-variant">
                This comment will also be sent to the following email addresses.
              </p>

              {/* Tags + Input */}
              <div
                className="flex flex-wrap gap-1.5 min-h-[2.25rem] p-2 rounded-[0.5rem] border border-border bg-surface focus-within:border-brand-500 transition-colors cursor-text"
                onClick={() => emailInputRef.current?.focus()}
              >
                {emails.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 text-xs font-medium"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeEmail(email); }}
                      className="text-brand-400 hover:text-brand-700 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  ref={emailInputRef}
                  type="text"
                  value={emailInput}
                  onChange={(e) => { setEmailInput(e.target.value); setEmailError(null); }}
                  onKeyDown={handleEmailKeyDown}
                  onBlur={() => { if (emailInput.trim()) addEmail(emailInput); }}
                  placeholder={emails.length === 0 ? 'Type email and press Enter...' : ''}
                  disabled={loading}
                  className="flex-1 min-w-[160px] bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/50"
                />
              </div>

              {emailError && (
                <p className="text-xs text-error">{emailError}</p>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => addEmail(emailInput)}
                  disabled={!emailInput.trim() || loading}
                  className="inline-flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </button>
                {emails.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setEmails([])}
                    className="text-xs text-on-surface-variant hover:text-error transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>
          )}
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
                {emails.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">
                    +{emails.length} email{emails.length > 1 ? 's' : ''}
                  </span>
                )}
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default AddComment;
