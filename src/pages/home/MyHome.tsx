import { useEffect, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchMyHome } from '@/redux/slices/myHomeSlice';
import { selectCounts } from './selectors';
import SectionNav, { type NavItem } from './components/SectionNav';
import { FocusHero, ProfileCard } from './components/HeroProfile';
import KpiTiles from './components/KpiTiles';
import EmailsPanel from './components/EmailsPanel';
import TasksPanel from './components/TasksPanel';
import WeekPlanner from './components/WeekPlanner';
import TicketsPanel from './components/TicketsPanel';
import TelesalesPanel from './components/TelesalesPanel';
import { ActivityPanel, ModulesPanel, PerformancePanel } from './components/InsightPanels';
import { GrowthPanel, LeavePanel } from './components/LeaveGrowth';
import { EditProfileModal, EmailDrawer, GoalModal, LeaveRequestModal, LogTimeModal, TicketDrawer, Toast } from './components/Overlays';
import './myHome.css';

function Skeleton() {
  const block = (h: number, extra?: React.CSSProperties) => <div className="mh-skel" style={{ height: h, ...extra }} />;
  return (
    <div className="mh-wrap" aria-busy="true" aria-label="Loading your home page">
      <div className="mh-grid mh-grid-hero">
        {block(250, { borderRadius: 20 })}
        {block(250)}
      </div>
      <div className="mh-grid mh-grid-kpi">
        {block(130)}
        {block(130)}
        {block(130)}
        {block(130)}
      </div>
      <div className="mh-grid mh-grid-2-1">
        {block(320)}
        {block(320)}
      </div>
      <div className="mh-grid">{block(180)}</div>
      <div className="mh-grid">{block(360)}</div>
    </div>
  );
}

/** The signed-in employee's landing page (MY_HOME_FEATURE_SPEC.md). */
export default function MyHome() {
  const dispatch = useAppDispatch();
  const { data, loading, error } = useAppSelector((s) => s.myHome);
  const counts = useAppSelector(selectCounts);

  useEffect(() => {
    dispatch(fetchMyHome());
  }, [dispatch]);

  useEffect(() => {
    document.title = 'My Home';
  }, []);

  // Ticket sections only for people who work tickets (or still hold some).
  const showsTickets = !!data && (data.profile.hasTickets || data.tickets.length > 0);

  const nav: NavItem[] = useMemo(() => {
    if (!data || !counts) return [];
    const items: NavItem[] = [
      { id: 'top', label: 'Home' },
      { id: 'emails', label: 'Emails', badge: counts.emailsToReply, hot: true },
      { id: 'tasks', label: 'Tasks', badge: counts.openTasks },
    ];
    if (showsTickets) items.push({ id: 'work', label: 'Tickets', badge: counts.openTickets });
    if (data.profile.isTelesales) items.push({ id: 'telesales', label: 'Tele-sales', badge: counts.callsLeft });
    if (showsTickets) items.push({ id: 'week', label: 'Timesheet' });
    items.push(
      { id: 'performance', label: 'Performance' },
      { id: 'leave', label: 'Leave' },
      { id: 'growth', label: 'Growth' }
    );
    return items;
  }, [data, counts, showsTickets]);

  return (
    <div className="mh">
      {!data && loading && <Skeleton />}
      {!data && !loading && error && (
        <div className="mh-wrap">
          <div className="mh-card" role="alert" style={{ marginTop: 24, textAlign: 'center' }}>
            <h1 className="mh-h2">Couldn&apos;t load your home page</h1>
            <p className="mh-sub" style={{ margin: '6px 0 14px' }}>
              {error}
            </p>
            <button type="button" className="mh-btn primary" onClick={() => dispatch(fetchMyHome())}>
              <RefreshCw size={15} aria-hidden="true" /> Retry
            </button>
          </div>
        </div>
      )}
      {data && (
        <>
          <SectionNav items={nav} />
          <div className="mh-wrap">
            <div className="mh-grid mh-grid-hero">
              <FocusHero data={data} />
              <ProfileCard data={data} />
            </div>
            <KpiTiles data={data} />
            <div className="mh-grid mh-grid-2-1">
              <EmailsPanel data={data} />
              <TasksPanel data={data} />
            </div>
            {showsTickets && (
              <>
                <div className="mh-grid">
                  <WeekPlanner />
                </div>
                <div className="mh-grid">
                  <TicketsPanel />
                </div>
              </>
            )}
            {data.profile.isTelesales && (
              <div className="mh-grid">
                <TelesalesPanel />
              </div>
            )}
            <div className="mh-grid mh-grid-3">
              <ModulesPanel data={data} />
              <PerformancePanel data={data} />
              <ActivityPanel data={data} />
            </div>
            <div className="mh-grid mh-grid-2">
              <LeavePanel data={data} />
              <GrowthPanel data={data} />
            </div>
          </div>
          <TicketDrawer />
          <EmailDrawer data={data} />
          <LogTimeModal />
          <LeaveRequestModal data={data} />
          <GoalModal />
          <EditProfileModal data={data} />
        </>
      )}
      <Toast />
    </div>
  );
}
