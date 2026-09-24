import {
  LayoutDashboard,
  Users,
  Ticket,
  UserCog,
  BarChart2,
  GaugeCircle,
  CalendarDays,
  // UsersRound, // Hidden - not in use
  // UserCheck, // Hidden - not in use
  Clock,
  // BarChart3,    // Hidden - Reports not in use
  // FileBarChart, // Hidden - Consultant Reports not in use
  FolderKanban,
  ListChecks,
  Server,
  Sparkles,
  Package,
  Target,
  Wrench,
  Database,
  Hash,
  Building2,
  Layers,
  Globe,
  Factory,
  Star,
  Briefcase,
  Building,
  CalendarClock,
  PhoneCall,
  UserPlus,
  CheckSquare,
  SquareKanban,
  CalendarHeart,
  Plane,
  ClipboardCheck,
  Wallet,
  Contact,
} from "lucide-react";
import type { Access } from "@/redux/hooks/useAccess";
import type { ModuleKey } from "@/types/auth.types";

const MODULES_GROUP = {
  name: "Modules",
  icon: Layers,
  isGroup: true as const,
  children: [
    { name: "Categories", path: "/categories", icon: FolderKanban },
    { name: "Environments", path: "/environments", icon: Server },
    { name: "Customized Solutions", path: "/customized-solutions", icon: Sparkles },
    { name: "Departments", path: "/departments", icon: Building2 },
    { name: "Product Types", path: "/product-types", icon: Package },
    { name: "Service Types", path: "/service-types", icon: Wrench },
    { name: "Modules", path: "/modules", icon: Target },
    { name: "ERP Types", path: "/erp-types", icon: Database },
    { name: "Version Numbers", path: "/version-numbers", icon: Hash },
    { name: "Sources", path: "/sources", icon: Globe },
    { name: "Companies", path: "/companies", icon: Building },
  ],
};

// TeleSales setup lookups — admin-managed lists that feed the lead form
// (Industry Sector, and future lead setup fields). Shown as a collapsible
// "Modules" tab inside every TeleSales sidebar variant.
const TELE_SALES_MODULES_GROUP = {
  name: "Modules",
  icon: Layers,
  isGroup: true as const,
  children: [
    { name: "Industry Sectors", path: "/industry-sectors", icon: Factory },
    { name: "Countries", path: "/countries", icon: Globe },
    { name: "Business Classifications", path: "/business-classifications", icon: Briefcase },
  ],
};

// Consultant/Admin: plain /tickets — all tickets visible, no exclusions
const SERVICES_GROUP = {
  name: "Services",
  icon: Ticket,
  isGroup: true as const,
  children: [
    { name: "Tickets", path: "/tickets", icon: Ticket },
    { name: "Projects", path: "/projects", icon: FolderKanban },
    { name: "Meetings/Visit report", path: "/meetings", icon: CalendarDays },
  ],
};

// Customer: /tickets excludes project & meeting tickets
const SERVICES_GROUP_CUSTOMER = {
  name: "Services",
  icon: Ticket,
  isGroup: true as const,
  children: [
    { name: "Tickets", path: "/tickets?excludeServiceTypeNames=Project&excludeCategoryNames=Online Meeting,On Site Meeting", icon: Ticket },
    { name: "Projects", path: "/projects", icon: FolderKanban },
    { name: "Meetings/Visit report", path: "/meetings", icon: CalendarDays },
  ],
};

// Customer links — built dynamically based on role
const buildCustomerLinks = (customerRole?: string | null) => {
  const links: any[] = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    SERVICES_GROUP_CUSTOMER,
  ];
  if (customerRole === "company_admin") {
    links.push({ name: "Manage Users", path: "/company-users", icon: Users });
  }
  return links;
};


// ── Employee navigation ───────────────────────────────────────────────────────
//
// Every entry is tagged with the MODULE that opens it and, optionally, the
// minimum ROLE that may see it. The sidebar is then just a filter over this
// list against useAccess() — there is no per-role link set to keep in sync,
// and granting someone a module in their profile shows the matching group
// without touching this file. Children are filtered the same way, so a group
// can hold manager-only items.

type NavRank = "manager" | "admin";

export interface NavLink {
  name: string;
  path?: string;
  icon: any;
  isGroup?: true;
  isSubGroup?: true;
  children?: NavLink[];
  /** Minimum rank to see this link (undefined = anyone with the module). */
  minRole?: NavRank;
  /** Extra module this one link needs, inside a group others can open too. */
  module?: ModuleKey;
}

interface NavEntry {
  /** The module that unlocks this entry; "any" = every employee. */
  module: ModuleKey | "any";
  minRole?: NavRank;
  /** Also shown, without the module, to anyone of at least this rank. */
  orMinRole?: NavRank;
  link: NavLink;
}

const TICKETING_GROUP: NavLink = {
  name: "Ticketing",
  icon: Ticket,
  isGroup: true,
  children: [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    {
      name: "Customers",
      icon: Users,
      isSubGroup: true,
      children: [
        { name: "Customers", path: "/customers", icon: Users },
        { name: "Customer Summary", path: "/customers/summary", icon: BarChart2 },
      ],
    },
    { ...SERVICES_GROUP, isGroup: undefined, isSubGroup: true },
    {
      name: "Employees",
      icon: UserCog,
      isSubGroup: true,
      children: [
        { name: "My Tasks", path: "/profile?view=tasks", icon: ListChecks },
        { name: "My Evaluation", path: "/consultants/evaluation/me", icon: GaugeCircle },
        { name: "Evaluations", path: "/consultants/evaluations", icon: BarChart2, minRole: "admin" },
        { name: "Weekly Report", path: "/consultant-reports/weekly", icon: CalendarDays, minRole: "admin" },
        { name: "Weekly Hours", path: "/consultants/weekly-hours", icon: CalendarClock },
      ],
    },
  ],
};

const TICKETING_CONFIG_GROUP: NavLink = {
  name: "Ticketing Setup",
  icon: Layers,
  isGroup: true,
  children: [
    ...MODULES_GROUP.children,
    { name: "Working Hours", path: "/working-hours", icon: CalendarClock },
  ],
};

const TELE_SALES_GROUP: NavLink = {
  name: "TeleSales",
  icon: PhoneCall,
  isGroup: true,
  children: [
    { name: "Dashboard", path: "/tele-sales", icon: LayoutDashboard },
    { name: "Leads", path: "/tele-sales/leads", icon: PhoneCall },
    { name: "Opportunities", path: "/tele-sales/opportunities", icon: Star },
    { name: "Recent Calls", path: "/tele-sales/calls/recent", icon: Clock },
    { name: "Agents", path: "/tele-sales/agents", icon: UserPlus, minRole: "manager" },
    {
      name: "Modules",
      icon: Layers,
      isSubGroup: true,
      children: TELE_SALES_MODULES_GROUP.children,
    },
  ],
};

const TASKS_GROUP: NavLink = {
  name: "Tasks",
  icon: CheckSquare,
  isGroup: true,
  children: [
    { name: "Dashboard", path: "/tasks/dashboard", icon: LayoutDashboard },
    { name: "All Tasks", path: "/tasks", icon: ListChecks },
    { name: "Create Task", path: "/tasks/create", icon: CheckSquare },
    { name: "Task Categories", path: "/task-categories", icon: FolderKanban, minRole: "manager" },
  ],
};

const DEVELOPMENT_GROUP: NavLink = {
  name: "Development",
  icon: SquareKanban,
  isGroup: true,
  children: [
    { name: "Boards", path: "/development", icon: SquareKanban },
  ],
};

// HR module — the employee directory (with the confidential HR file for HR and
// admins) plus leave approvals and balances. Managers keep seeing it for the
// people they run, whether or not they hold the HR module.
const HR_GROUP: NavLink = {
  name: "HR",
  icon: Contact,
  isGroup: true,
  children: [
    { name: "Employees", path: "/hr/employees", icon: UserCog },
    { name: "Teams", path: "/hr/teams", icon: Globe, module: "hr" },
    { name: "Approvals", path: "/employee-requests/approvals", icon: ClipboardCheck, minRole: "manager" },
    { name: "Balances", path: "/employee-requests/balances", icon: Wallet },
  ],
};

const MY_REQUESTS_GROUP: NavLink = {
  name: "My Requests",
  icon: CalendarHeart,
  isGroup: true,
  children: [
    { name: "My Requests", path: "/employee-requests", icon: Plane },
    { name: "My Balance", path: "/employee-requests/balances", icon: Wallet },
  ],
};

const EMPLOYEE_NAV: NavEntry[] = [
  { module: "tickets", link: TICKETING_GROUP },
  { module: "telesales", link: TELE_SALES_GROUP },
  { module: "tasks", link: TASKS_GROUP },
  { module: "development", link: DEVELOPMENT_GROUP },
  { module: "hr", orMinRole: "manager", link: HR_GROUP },
  { module: "admin", link: TICKETING_CONFIG_GROUP },
  { module: "any", link: MY_REQUESTS_GROUP },
];

const rankOk = (minRole: NavRank | undefined, access: Access) => {
  if (!minRole) return true;
  if (minRole === "admin") return access.isAdmin;
  return access.isManagerOrAdmin;
};

/** Drop links the caller may not see, recursing into groups; drop empty groups. */
const pruneLink = (link: NavLink, access: Access): NavLink | null => {
  if (!rankOk(link.minRole, access)) return null;
  if (link.module && !access.hasModule(link.module)) return null;
  if (!link.children) return link;
  const children = link.children
    .map((c) => pruneLink(c, access))
    .filter((c): c is NavLink => c !== null);
  if (!children.length) return null;
  return { ...link, children };
};

export const buildEmployeeLinks = (access: Access): NavLink[] => {
  const seen = new Set<string>();
  const out: NavLink[] = [];
  for (const entry of EMPLOYEE_NAV) {
    const byRank = entry.orMinRole !== undefined && rankOk(entry.orMinRole, access);
    if (entry.module !== "any" && !access.hasModule(entry.module) && !byRank) continue;
    if (!rankOk(entry.minRole, access)) continue;
    const link = pruneLink(entry.link, access);
    if (!link) continue;
    // Two groups may legitimately offer the same page (Balances for a manager
    // under both Employees and My Requests); the first one wins.
    if (link.children) {
      link.children = link.children.filter((c) => {
        if (!c.path) return true;
        if (seen.has(c.path)) return false;
        seen.add(c.path);
        return true;
      });
      if (!link.children.length) continue;
    }
    out.push(link);
  }
  return out;
};

/** The sidebar for the current user: customers get theirs, employees are filtered by module and rank. */
// Typed loosely on purpose: the sidebar components model links as a
// discriminated union that NavLink (a single shape) satisfies at runtime.
export const getRouterLinks = (access: Access, customerRole?: string | null): any[] => {
  if (access.isCustomer) return buildCustomerLinks(customerRole);
  if (access.isEmployee) return buildEmployeeLinks(access);
  return [];
};
