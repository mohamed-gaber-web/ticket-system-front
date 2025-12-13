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
  ClipboardList
} from "lucide-react";

export const ROUTERLINKS = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Customers", path: "/customers", icon: Users },
  { name: "Tickets", path: "/tickets", icon: Ticket },
  { name: "Categories", path: "/categories", icon: FolderKanban },
  { name: "Consultants", path: "/consultants", icon: UserCog },
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
  { name: "Categories", path: "/categories", icon: FolderKanban },
  { name: "Consultants", path: "/consultants", icon: UserCog },
  { name: "Tickets", path: "/tickets", icon: Ticket },
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

