// GET /api/me/home — the signed-in employee's My Home page (backend src/utils/myHome.js).

export type BoardStatus = 'todo' | 'in_progress' | 'waiting' | 'done';
export type HomePriority = 'critical' | 'high' | 'medium' | 'low';

export interface HomeProfile {
  id: string;
  name: string;
  firstName: string;
  jobTitle: string;
  team: string;
  employeeCode: string;
  manager: { id: string; name: string } | null;
  joinedAt: string | null;
  office: string;
  skills: string[];
  availability: 'available' | 'busy' | 'away' | 'on_leave';
  initials: string;
  profilePicture: string | null;
  email: string;
  phone: string;
  isTelesales: boolean;
  hasTickets: boolean;
  hasTasks: boolean;
}

export interface StartWith {
  ticketId: string;
  code: string;
  title: string;
  clientName: string;
  slaText: string | null;
}

export interface HomeTicket {
  id: string;
  code: string;
  kind: 'client' | 'internal';
  ticketType: 'customer' | 'internal' | 'rnd';
  title: string;
  description: string;
  clientName: string;
  contactName: string;
  category: string;
  module: string;
  priority: HomePriority;
  status: string;
  board: BoardStatus;
  dueDate: string | null;
  isOverdue: boolean;
  isDueToday: boolean;
  estimateHours: number;
  hasExplicitEstimate: boolean;
  loggedHours: number;
  slaDueAt: string | null;
  slaText: string | null;
}

export interface HomeEmail {
  id: string;
  source: 'ticket' | 'lead';
  refId: string;
  fromName: string;
  fromEmail: string;
  company: string;
  subject: string;
  snippet: string;
  body: string;
  receivedAt: string;
  ageHours: number;
  isRead: boolean;
  repliedAt: string | null;
  ticketCode: string | null;
}

export interface HomeTask {
  id: string;
  kind: 'todo' | 'task';
  code?: string;
  title: string;
  dueDate: string | null;
  priority: HomePriority;
  done: boolean;
  status?: string;
  sourceLabel: string;
}

export interface CallListItem {
  leadId: string;
  company: string;
  contactName: string;
  contactTitle: string;
  phoneMasked: string;
  stage: string;
  salesType: string;
  lastContactAt: string | null;
  nextCallAt: string | null;
  todayCall: { id: string; outcome: CallOutcome | 'logged' } | null;
}

export type CallOutcome = 'answered' | 'no_answer' | 'callback';

export interface HomeFollowUp {
  id: string;
  leadId: string;
  company: string;
  contactName?: string;
  action: string;
  note: string;
  dueAt: string;
  done: boolean;
}

export interface TelesalesBlock {
  kpis: {
    callsToday: number;
    callTarget: number;
    connected: number;
    connectPct: number;
    meetingsWeek: number;
    meetingsTarget: number;
    followUpsOverdue: number;
  };
  funnel: { stage: string; count: number }[];
  callList: CallListItem[];
  followUps: { overdue: HomeFollowUp[]; today: HomeFollowUp[]; upcoming: HomeFollowUp[] };
}

export interface WeekDay {
  date: string;
  label: string;
  dueCount: number;
  plannedHours: number;
  capacity: number;
  isToday: boolean;
  isOver: boolean;
}

export interface LeaveBalance {
  type: 'vacation' | 'excuse';
  label: string;
  total: number | null;
  used: number;
  left: number | null;
  unit: 'days' | 'hours';
}

export interface LeaveRequestRow {
  id: string;
  type: 'vacation' | 'excuse';
  from: string | null;
  to: string | null;
  days: number | null;
  hours: number | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reason: string;
}

export interface GrowthGoal {
  id: string;
  title: string;
  type: 'certification' | 'course' | 'skill';
  targetLabel: string;
  targetDate: string | null;
  pct: number;
  steps: { id: string; text: string; done: boolean }[];
}

export interface MyHomeData {
  generatedAt: string;
  timezone: string;
  today: string;
  weekNumber: number;
  config: { emailWarnHours: number; emailSlaHours: number; utilizationTarget: number; dailyCapacity: number };
  profile: HomeProfile;
  focus: {
    overdue: number;
    dueToday: number;
    emailsToReply: number;
    emailsLate: number;
    followUpsDue: number;
    startWith: StartWith | null;
  };
  kpis: {
    hours: { logged: number; target: number; pct: number; paceText: string };
    utilization: { billable: number; internal: number; pct: number; target: number };
    rating: { ytd: number | null; outOf: number; deltaVsPrev: number | null };
    leave: { daysLeft: number; next: { from: string; to: string; status: string } | null };
  };
  week: { days: WeekDay[]; plannedTotal: number; capacityTotal: number; holidays: { date: string; description: string }[] };
  tickets: HomeTicket[];
  emails: HomeEmail[];
  tasks: HomeTask[];
  telesales: TelesalesBlock | null;
  modules: { name: string; closed: number; open: number }[];
  performance: {
    trend: { label: string; value: number | null }[];
    criteria: { label: string; score: number; weight: number }[];
    latestClientComment: { text: string; clientName: string; ticketCode: string; score: number | null } | null;
  };
  activity: { id: string; type: string; text: string; createdAt: string; isRead: boolean; ticketId: string | null; leadId: string | null }[];
  leave: { balances: LeaveBalance[]; requests: LeaveRequestRow[] };
  goals: GrowthGoal[];
}
