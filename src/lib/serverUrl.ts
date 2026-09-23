/**
 * URLs for things served straight off the API server — file downloads, avatars,
 * image `src` attributes — rather than fetched through the axios client.
 *
 * The default is a **relative** URL, which is what both environments expect:
 * in development the Vite proxy forwards `/api` to the backend, and in
 * production `vercel.json` rewrites `/api/*` to Railway. A relative URL is
 * therefore same-origin in both, needs no CORS, and carries no protocol.
 *
 * `VITE_API_BASE_URL` overrides it for a deployment that has no such rewrite.
 * It must be a bare origin (no trailing `/api`).
 *
 * These call sites used to fall back to `http://localhost:5000`, which is only
 * ever right on a developer's machine: the production build inlined it, so from
 * https://ts.growpath.net every attachment download became a blocked
 * mixed-content request to the *user's own* computer and failed with
 * "Failed to download file".
 */
const API_ORIGIN = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '').replace(/\/+$/, '');

/**
 * @param path a server path such as `/api/files/<id>` (as stored in
 *             `attachment.filePath`), with or without the leading slash.
 */
export const serverUrl = (path: string): string =>
  `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
