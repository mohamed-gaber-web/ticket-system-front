import {
  LayoutDashboard,
  Users,
  Ticket,
  UserCog,
  // UsersRound, // Hidden - not in use
  // UserCheck, // Hidden - not in use
  Clock,
  BarChart3,
  FolderKanban,
  FileBarChart,
  ClipboardList,
  Server,
  Sparkles,
  Package,
  Target,
  Wrench,
  Database,
  Hash,
  Building2,
  Layers
} from "lucide-react";

export const ROUTERLINKS = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Customers", path: "/customers", icon: Users },
  { name: "Tickets", path: "/tickets", icon: Ticket },
  { name: "Consultants", path: "/consultants", icon: UserCog },
  // Modules Group
  {
    name: "Modules",
    icon: Layers,
    isGroup: true as const,
    children: [
      { name: "Categories", path: "/categories", icon: FolderKanban },
      { name: "Environments", path: "/environments", icon: Server },
      { name: "Features", path: "/features", icon: Sparkles },
      { name: "Departments", path: "/departments", icon: Building2 },
      { name: "Product Types", path: "/product-types", icon: Package },
      { name: "Service Types", path: "/service-types", icon: Wrench },
      { name: "Scopes", path: "/scopes", icon: Target },
      { name: "ERP Types", path: "/erp-types", icon: Database },
      { name: "Version Numbers", path: "/version-numbers", icon: Hash },
    ]
  },
  // HIDDEN: Teams and Team Members are not currently in use
  // { name: "Teams", path: "/teams", icon: UsersRound },
  // { name: "Team Members", path: "/team-members", icon: UserCheck },
  { name: "SLA", path: "/sla", icon: Clock },
  { name: "Reports", path: "/reports", icon: BarChart3 },
  { name: "Consultant Reports", path: "/consultant-reports", icon: FileBarChart },
];

// Customer can only see Tickets
const CUSTOMER_LINKS = [
  { name: "Tickets", path: "/tickets", icon: Ticket },
];

// Consultant can see specific modules
const CONSULTANT_LINKS = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Customers", path: "/customers", icon: Users },
  { name: "Tickets", path: "/tickets", icon: Ticket },
  { name: "Consultants", path: "/consultants", icon: UserCog },
  // Modules Group
  {
    name: "Modules",
    icon: Layers,
    isGroup: true as const,
    children: [
      { name: "Categories", path: "/categories", icon: FolderKanban },
      { name: "Environments", path: "/environments", icon: Server },
      { name: "Features", path: "/features", icon: Sparkles },
      { name: "Departments", path: "/departments", icon: Building2 },
      { name: "Product Types", path: "/product-types", icon: Package },
      { name: "Service Types", path: "/service-types", icon: Wrench },
      { name: "Scopes", path: "/scopes", icon: Target },
      { name: "ERP Types", path: "/erp-types", icon: Database },
      { name: "Version Numbers", path: "/version-numbers", icon: Hash },
    ]
  },
  // HIDDEN: Teams and Team Members are not currently in use
  // { name: "Teams", path: "/teams", icon: UsersRound },
  // { name: "Team Members", path: "/team-members", icon: UserCheck },
];

// Team Member can only see My Assignments
const TEAM_MEMBER_LINKS = [
  { name: "My Assignments", path: "/my-assignments", icon: ClipboardList },
];

// Filter links based on user type
export const getRouterLinksByUserType = (userType: string | null) => {
  if (userType === 'customer') {
    return CUSTOMER_LINKS;
  }
  if (userType === 'consultant') {
    return CONSULTANT_LINKS;
  }
  if (userType === 'team_member') {
    return TEAM_MEMBER_LINKS;
  }
  // For admins, show all links
  return ROUTERLINKS;
};

