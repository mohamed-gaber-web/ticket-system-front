/**
 * Ends the sign-in when the browser is closed.
 *
 * Auth keys stay in localStorage (so every tab shares one session), but each
 * open tab registers itself in a small localStorage registry and removes
 * itself on `pagehide`. When a page loads:
 *   - this tab already ran (refresh / navigation) → its sessionStorage marker
 *     survives, keep the session;
 *   - another tab of the app is still open → keep the session;
 *   - otherwise the browser (or every app tab) was closed → clear the session.
 *
 * Imported for its side effect as the FIRST import in main.tsx, so it runs
 * before the auth slice reads the stored token.
 */

const TABS_KEY = 'openTabs';
const TAB_MARKER = 'tabAlive';
const HEARTBEAT_MS = 20_000;
// Background tabs get their timers throttled (Chrome: ~once a minute), and a
// crashed tab never fires pagehide — so an entry is only trusted while fresh.
const STALE_MS = 3 * 60_000;

const SESSION_KEYS = ['token', 'refreshToken', 'userType', 'user', 'lastActivity'];

type Registry = Record<string, number>;

const readTabs = (): Registry => {
  try {
    const parsed = JSON.parse(localStorage.getItem(TABS_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeTabs = (tabs: Registry) => {
  try {
    localStorage.setItem(TABS_KEY, JSON.stringify(tabs));
  } catch {
    /* storage unavailable — nothing to track */
  }
};

const pruned = (tabs: Registry, now: number): Registry =>
  Object.fromEntries(Object.entries(tabs).filter(([, seen]) => now - seen < STALE_MS));

const tabId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const init = () => {
  const now = Date.now();
  const continuing = sessionStorage.getItem(TAB_MARKER) === '1';
  const others = pruned(readTabs(), now);

  if (!continuing && Object.keys(others).length === 0) {
    SESSION_KEYS.forEach((k) => localStorage.removeItem(k));
  }

  sessionStorage.setItem(TAB_MARKER, '1');

  const touch = () => writeTabs({ ...pruned(readTabs(), Date.now()), [tabId]: Date.now() });
  const leave = () => {
    const tabs = readTabs();
    delete tabs[tabId];
    writeTabs(tabs);
  };

  touch();
  setInterval(touch, HEARTBEAT_MS);
  window.addEventListener('pagehide', leave);
  // Back/forward cache restores the page without reloading it.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) touch();
  });
};

try {
  init();
} catch {
  /* storage blocked — fall back to the normal persistent session */
}

export {};
