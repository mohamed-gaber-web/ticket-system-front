import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

// Server origin WITHOUT the trailing /api. Prefer an explicit VITE_SOCKET_URL,
// then the existing VITE_API_BASE_URL (already the bare server origin), and
// finally derive it from VITE_API_URL by stripping the /api suffix.
const SOCKET_URL =
  (import.meta.env.VITE_SOCKET_URL as string | undefined) ||
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  ((import.meta.env.VITE_API_URL as string | undefined) ?? "").replace(/\/api\/?$/, "");

/**
 * Open (or reuse) the authenticated socket connection. The JWT is sent in the
 * handshake auth payload and verified server-side before any room is joined.
 */
export const connectSocket = (token: string): Socket => {
  if (socket?.connected) return socket;
  if (socket) socket.disconnect();
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket"],
  });
  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = (): void => {
  socket?.disconnect();
  socket = null;
};
