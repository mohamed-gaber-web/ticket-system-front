import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { authApi } from '@/api/authApi';
import { getAvatarUrl, AVATAR_ACCEPT, AVATAR_MAX_SIZE } from '@/lib/avatar';
import { cn } from '@/lib/utils';

interface ProfilePictureUploadProps {
  /** Current profile picture file id (stored on `user.profilePicture`). */
  value?: string | null;
  /** Called with the new file id after a successful upload, or null on remove. */
  onChange: (fileId: string | null) => void | Promise<void>;
  /** Name used to derive the initials fallback. */
  name?: string;
  /** Avatar diameter in pixels. Default 96. */
  size?: number;
  /** Extra classes for the initials fallback (e.g. bg/text colors). */
  fallbackClassName?: string;
  /** Hide the upload/remove controls and render the avatar read-only. */
  readOnly?: boolean;
  disabled?: boolean;
  className?: string;
}

const getInitials = (name?: string) =>
  (name || '')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

/**
 * Avatar with built-in profile-picture upload.
 *
 * Picks an image, validates it client-side, uploads it to GridFS via the
 * avatar endpoint, then hands the resulting file id back through `onChange`.
 * The caller decides what to do with the id (set form state, or persist it
 * immediately via updateProfile / update user).
 */
export function ProfilePictureUpload({
  value,
  onChange,
  name,
  size = 96,
  fallbackClassName,
  readOnly = false,
  disabled = false,
  className,
}: ProfilePictureUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  // Local object-URL preview shown immediately after picking, so the new image
  // appears without waiting for the parent to round-trip the saved file id.
  const [preview, setPreview] = useState<string | null>(null);

  // Drop the local preview once the parent reflects the new value.
  useEffect(() => {
    setPreview(null);
  }, [value]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const interactive = !readOnly && !disabled;
  const imageSrc = preview || getAvatarUrl(value);

  const handlePick = () => {
    if (!interactive || uploading) return;
    inputRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so picking the same file again still fires onChange.
    e.target.value = '';
    if (!file) return;

    if (!AVATAR_ACCEPT.split(',').includes(file.type)) {
      toast.error('Please choose a JPEG, PNG, GIF, or WebP image.');
      return;
    }
    if (file.size > AVATAR_MAX_SIZE) {
      toast.error('Image is too large. Maximum size is 5MB.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);
    try {
      const res = await authApi.uploadAvatar(file);
      await onChange(res.data.fileId);
    } catch (error: any) {
      setPreview(null);
      URL.revokeObjectURL(objectUrl);
      toast.error(
        error?.response?.data?.message || 'Failed to upload profile picture.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!interactive || uploading) return;
    try {
      await onChange(null);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || 'Failed to remove profile picture.'
      );
    }
  };

  return (
    <div
      className={cn('relative flex-shrink-0', className)}
      style={{ width: size, height: size }}
    >
      <Avatar className="h-full w-full" style={{ width: size, height: size }}>
        {imageSrc && <AvatarImage src={imageSrc} alt={name || 'Profile picture'} className="object-cover" />}
        <AvatarFallback
          className={cn('font-bold', fallbackClassName)}
          style={{ fontSize: Math.max(14, size / 3) }}
        >
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>

      {uploading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
          <Loader2 className="h-5 w-5 animate-spin text-white" />
        </div>
      )}

      {interactive && (
        <>
          <button
            type="button"
            onClick={handlePick}
            disabled={uploading}
            aria-label={imageSrc ? 'Change profile picture' : 'Upload profile picture'}
            className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-ambient ring-2 ring-surface-container-lowest transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            <Camera className="h-4 w-4" />
          </button>

          {imageSrc && !uploading && (
            <button
              type="button"
              onClick={handleRemove}
              aria-label="Remove profile picture"
              className="absolute top-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-error text-white shadow-ambient ring-2 ring-surface-container-lowest transition-colors hover:bg-error/90"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}

          <input
            ref={inputRef}
            type="file"
            accept={AVATAR_ACCEPT}
            onChange={handleFile}
            className="hidden"
          />
        </>
      )}
    </div>
  );
}

export default ProfilePictureUpload;
