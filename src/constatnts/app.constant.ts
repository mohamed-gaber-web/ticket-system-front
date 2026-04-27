import {
  LayoutDashboard,
  Users,
  Ticket,
  UserCog,
  BarChart2,
  CalendarDays,
  // UsersRound, // Hidden - not in use
  // UserCheck, // Hidden - not in use
  // Clock,        // Hidden - SLA not in use
  // BarChart3,    // Hidden - Reports not in use
  // FileBarChart, // Hidden - Consultant Reports not in use
  FolderKanban,
  ClipboardList,
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
  Building,
  CalendarClock,
  PhoneCall,
  UserPlus,
} from "lucide-react";

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

export const ROUTERLINKS = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  {
    name: "Customers",
    icon: Users,
    isGroup: true as const,
    children: [
      { name: "Customers", path: "/customers", icon: Users },
      { name: "Customer Summary", path: "/customers/summary", icon: BarChart2 },
    ],
  },
  { name: "Tickets", path: "/tickets", icon: Ticket },
  {
    name: "Consultants",
    icon: UserCog,
    isGroup: true as const,
    children: [
      { name: "Consultants", path: "/consultants", icon: UserCog },
      { name: "Weekly Report", path: "/consultant-reports/weekly", icon: CalendarDays },
    ],
  },
  MODULES_GROUP,
  { name: "Working Hours", path: "/working-hours", icon: CalendarClock },
];

// Customer links — built dynamically based on role
const buildCustomerLinks = (customerRole?: string | null) => {
  const links = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Tickets", path: "/tickets", icon: Ticket },
  ];
  if (customerRole === "company_admin") {
    links.push({ name: "Manage Users", path: "/company-users", icon: Users });
  }
  return links;
};

// Consultant (regular & senior) can see specific modules
const CONSULTANT_LINKS = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  {
    name: "Customers",
    icon: Users,
    isGroup: true as const,
    children: [
      { name: "Customers", path: "/customers", icon: Users },
      { name: "Customer Summary", path: "/customers/summary", icon: BarChart2 },
    ],
  },
  { name: "Tickets", path: "/tickets", icon: Ticket },
  {
    name: "Consultants",
    icon: UserCog,
    isGroup: true as const,
    children: [
      { name: "My Tasks", path: "/profile?view=tasks", icon: ListChecks },
      { name: "Consultants", path: "/consultants", icon: UserCog },
    ],
  },
  MODULES_GROUP,
];

// Consultant admin sees everything
const CONSULTANT_ADMIN_LINKS = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  {
    name: "Customers",
    icon: Users,
    isGroup: true as const,
    children: [
      { name: "Customers", path: "/customers", icon: Users },
      { name: "Customer Summary", path: "/customers/summary", icon: BarChart2 },
    ],
  },
  { name: "Tickets", path: "/tickets", icon: Ticket },
  {
    name: "Consultants",
    icon: UserCog,
    isGroup: true as const,
    children: [
      { name: "My Tasks", path: "/profile?view=tasks", icon: ListChecks },
      { name: "Consultants", path: "/consultants", icon: UserCog },
      { name: "Weekly Report", path: "/consultant-reports/weekly", icon: CalendarDays },
    ],
  },
  MODULES_GROUP,
  { name: "Working Hours", path: "/working-hours", icon: CalendarClock },
];

// Team Member can only see My Assignments
const TEAM_MEMBER_LINKS = [
  { name: "My Assignments", path: "/my-assignments", icon: ClipboardList },
];

// TeleSales admin links
const TELE_SALES_ADMIN_LINKS = [
  { name: "Dashboard", path: "/tele-sales", icon: LayoutDashboard },
  { name: "Leads", path: "/tele-sales/leads", icon: PhoneCall },
  { name: "Agents", path: "/tele-sales/agents", icon: UserPlus },
];

// TeleSales user links
const TELE_SALES_USER_LINKS = [
  { name: "Dashboard", path: "/tele-sales", icon: LayoutDashboard },
  { name: "Leads", path: "/tele-sales/leads", icon: PhoneCall },
];

// Filter links based on user type
export const getRouterLinksByUserType = (
  userType: string | null,
  customerRole?: string | null,
  userRole?: string | null,
) => {
  if (userType === 'customer') {
    return buildCustomerLinks(customerRole);
  }
  if (userType === 'consultant') {
    return userRole === 'admin' ? CONSULTANT_ADMIN_LINKS : CONSULTANT_LINKS;
  }
  if (userType === 'team_member') {
    return TEAM_MEMBER_LINKS;
  }
  if (userType === 'tele_sales') {
    return userRole === 'admin' ? TELE_SALES_ADMIN_LINKS : TELE_SALES_USER_LINKS;
  }
  // For admins, show all links
  return ROUTERLINKS;
};

