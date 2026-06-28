// Helpers for working with user profile pictures.
//
// Avatars are stored in GridFS on the backend and served publicly from
// `/api/avatars/:id`, so they can be used directly in an <img> tag without an
// auth header. `profilePicture` on a user is the GridFS file id.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/**
 * Build the public URL for a profile picture.
 * @param fileId - The GridFS file id stored on `user.profilePicture`.
 * @returns The absolute image URL, or undefined when there is no picture.
 */
export const getAvatarUrl = (fileId?: string | null): string | undefined =>
  fileId ? `${API_BASE_URL}/api/avatars/${fileId}` : undefined;

/** Allowed image MIME types for profile pictures (mirrors the backend). */
export const AVATAR_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp';

/** Maximum profile picture size in bytes (mirrors the backend, 5MB). */
export const AVATAR_MAX_SIZE = 5 * 1024 * 1024;
