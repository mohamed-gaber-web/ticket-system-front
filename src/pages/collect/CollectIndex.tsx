import { Navigate } from 'react-router-dom';
import { COLLECT_BASE, LAST_TAB_KEY } from '@/components/collect/CollectLayout';

const TABS = /^(analytics|backlog|collection|signatures|reminders|settings\/[a-z]+)$/;

/** `/hr/collect` opens the last tab used (localStorage), else the analysis. */
export default function CollectIndex() {
  let last = 'analytics';
  try {
    const saved = localStorage.getItem(LAST_TAB_KEY);
    if (saved && TABS.test(saved)) last = saved;
  } catch {
    /* storage blocked */
  }
  return <Navigate to={`${COLLECT_BASE}/${last}`} replace />;
}
