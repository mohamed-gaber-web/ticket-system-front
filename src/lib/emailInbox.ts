/** Helpers shared by the email inbox pages and the ticket Emails tab. */

/** Initials for a conversation's avatar. */
export const initialsOf = (name?: string) =>
  (name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

/** The API's message off an axios error, or a readable fallback. */
export const apiErrorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;
