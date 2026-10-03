import {
  LayoutDashboard,
  Mail,
  Users,
  Ticket,
  UserCog,
  BarChart2,
  GaugeCircle,
  CalendarDays,
  // UsersRound, // Hidden - not in use
  UserCheck,
  Clock,
  // BarChart3,    // Hidden - Reports not in use
  FileBarChart,
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
  FileText,
  MessageSquareText,
  Contact,
  Home,
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

// Product catalog — the products, collateral and templates behind the lead page's
// Sales Assistant. Every tele-sales role can browse; admins manage.
const PRODUCT_CATALOG_GROUP = {
  name: "Product Catalog",
  icon: Sparkles,
  isGroup: true as const,
  children: [
    { name: "Products", path: "/tele-sales/products", icon: Package },
    { name: "Sales Documents", path: "/tele-sales/documents", icon: FileText },
    { name: "Templates", path: "/tele-sales/templates", icon: MessageSquareText },
    { name: "Company Profile", path: "/tele-sales/company-profile", icon: Building },
  ],
};

// Consultant/Admin: /tickets is every customer's tickets except our own
// company's, which have their own "Internal" page.
const SERVICES_GROUP = {
  name: "Services",
  icon: Ticket,
  isGroup: true as const,
  children: [
    { name: "Tickets", path: "/tickets", icon: Ticket },
    { name: "Internal", path: "/tickets/internal", icon: Home },
    { name: "Internal Dashboard", path: "/dashboard/internal", icon: LayoutDashboard },
    { name: "Emails", path: "/tickets/emails", icon: Mail },
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

// Meeting Book — shared calendar for booking and tracking meetings with
// customers and leads. Staff can book; customers see their own meetings.
const MEETING_BOOK_LINK = { name: "Meeting Book", path: "/calendar", icon: CalendarDays };

// Customer links — built dynamically based on role
const buildCustomerLinks = (customerRole?: string | null) => {
  const links: any[] = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    SERVICES_GROUP_CUSTOMER,
    MEETING_BOOK_LINK,
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
  /** Also shown, without `module`, to anyone of at least this rank. */
  orMinRole?: NavRank;
}

interface NavEntry {
  /** The module that unlocks this entry; "any" = every employee. */
  module: ModuleKey | "any";
  minRole?: NavRank;
  /** Also shown, without the module, to anyone of at least this rank. */
  orMinRole?: NavRank;
  link: NavLink;
}

// Lookups and configuration of the ticketing module (categories, SLA, working
// hours…). A sub-menu of Ticketing, shown only to holders of the admin module.
const TICKETING_CONFIG_GROUP: NavLink = {
  name: "Ticketing Setup",
  icon: Layers,
  isSubGroup: true,
  module: "admin",
  children: [
    ...MODULES_GROUP.children,
    { name: "Working Hours", path: "/working-hours", icon: CalendarClock },
  ],
};

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
        {
          name: "Reports",
          icon: FileBarChart,
          isSubGroup: true,
          children: [
            { name: "Weekly Report", path: "/consultant-reports/weekly", icon: CalendarDays, minRole: "admin" },
            { name: "Weekly Hours", path: "/consultants/weekly-hours", icon: CalendarClock },
          ],
        },
      ],
    },
    { ...SERVICES_GROUP, isGroup: undefined, isSubGroup: true },
    TICKETING_CONFIG_GROUP,
  ],
};

// Work performance of the ticketing staff — tasks and evaluations. Lives
// in the HR menu but stays a ticketing feature: only the tickets module sees it.
const PERFORMANCE_GROUP: NavLink = {
  name: "Performance",
  icon: GaugeCircle,
  isSubGroup: true,
  module: "tickets",
  children: [
    { name: "My Tasks", path: "/profile?view=tasks", icon: ListChecks },
    { name: "My Evaluation", path: "/consultants/evaluation/me", icon: GaugeCircle },
    { name: "Evaluations", path: "/consultants/evaluations", icon: BarChart2, minRole: "admin" },
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
    { name: "Email Management", path: "/tele-sales/emails", icon: Mail },
    { name: "Agents", path: "/tele-sales/agents", icon: UserPlus, minRole: "manager" },
    { ...PRODUCT_CATALOG_GROUP, isGroup: undefined, isSubGroup: true },
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
    { name: "My Tasks", path: "/tasks/my", icon: UserCheck },
    { name: "All Tasks", path: "/tasks", icon: ListChecks },
    { name: "Create Task", path: "/tasks/create", icon: CheckSquare },
    { name: "Task Categories", path: "/task-categories", icon: FolderKanban, minRole: "manager" },
    { name: "Reports", path: "/tasks/reports", icon: BarChart2 },
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

// HR menu — the employee directory (with the confidential HR file for HR and
// admins), teams, leave approvals and balances, plus ticketing Performance.
// Every link says who sees it; the group shows when any link survives, so a
// consultant without the HR module still finds Performance here. Managers keep
// the directory and balances for the people they run.
const HR_GROUP: NavLink = {
  name: "HR",
  icon: Contact,
  isGroup: true,
  children: [
    { name: "Employees", path: "/hr/employees", icon: UserCog, module: "hr", orMinRole: "manager" },
    { name: "Teams", path: "/hr/teams", icon: Globe, module: "hr" },
    { name: "Approvals", path: "/employee-requests/approvals", icon: ClipboardCheck, minRole: "manager" },
    { name: "Balances", path: "/employee-requests/balances", icon: Wallet, module: "hr", orMinRole: "manager" },
    PERFORMANCE_GROUP,
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
  { module: "any", link: MEETING_BOOK_LINK },
  { module: "tickets", link: TICKETING_GROUP },
  { module: "telesales", link: TELE_SALES_GROUP },
  { module: "tasks", link: TASKS_GROUP },
  { module: "development", link: DEVELOPMENT_GROUP },
  { module: "any", link: HR_GROUP },
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
  if (link.module && !access.hasModule(link.module) && !(link.orMinRole && rankOk(link.orMinRole, access))) return null;
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
