import {
  LayoutDashboard,
  Users,
  Ticket,
  UserCog,
  UsersRound,
  UserCheck,
  Clock,
  BarChart3,
  FolderKanban,
  FileBarChart
} from "lucide-react";

export const ROUTERLINKS = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Customers", path: "/customers", icon: Users },
  { name: "Tickets", path: "/tickets", icon: Ticket },
  { name: "Categories", path: "/categories", icon: FolderKanban },
  { name: "Consultants", path: "/consultants", icon: UserCog },
  { name: "Teams", path: "/teams", icon: UsersRound },
  { name: "Team Members", path: "/team-members", icon: UserCheck },
  { name: "SLA", path: "/sla", icon: Clock },
  { name: "Reports", path: "/reports", icon: BarChart3 },
  { name: "Consultant Reports", path: "/consultant-reports", icon: FileBarChart },
];

// Customer can only see Tickets
const CUSTOMER_LINKS = [
  { name: "Tickets", path: "/tickets", icon: Ticket },
];

// Filter links based on user type
export const getRouterLinksByUserType = (userType: string | null) => {
  if (userType === 'customer') {
    return CUSTOMER_LINKS;
  }
  // For consultants, team_members, and admins, show all links
  return ROUTERLINKS;
};

