import type { RouteObject } from "react-router-dom";
import Layout from "@/components/layout/layout";
import Dashboard from "@/pages/dashboard/dashboard";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Auth Module
import SigninPage from "@/pages/auth/signin";
import SignupPage from "@/pages/auth/signup";
import UnauthorizedPage from "@/pages/auth/unauthorized";
import ForgotPasswordPage from "@/pages/auth/forgot-password";
import ResetPasswordPage from "@/pages/auth/reset-password";
import ProfilePage from "@/pages/auth/profile";
import ChangePasswordPage from "@/pages/auth/change-password";

// Customer Module
import Customers from "@/pages/customers/customers";
import CreateCustomer from "@/pages/customers/createCustomer";
import EditCustomer from "@/pages/customers/editCustomer";
import ViewCustomer from "@/pages/customers/viewCustomer";

// Ticket Module
import Tickets from "@/pages/tickets/tickets";
import CreateTicket from "@/pages/tickets/createTicket";
import EditTicket from "@/pages/tickets/editTicket";
import ViewTicket from "@/pages/tickets/viewTicket";

// Consultant Module
import Consultants from "@/pages/consultants/consultants";
import CreateConsultant from "@/pages/consultants/createConsultant";
import EditConsultant from "@/pages/consultants/editConsultant";
import ConsultantDashboard from "@/pages/consultants/consultantDashboard";

// Team Module - HIDDEN: Not currently in use
// import Teams from "@/pages/teams/teams";
// import CreateTeam from "@/pages/teams/createTeam";
// import EditTeam from "@/pages/teams/editTeam";
// import ViewTeam from "@/pages/teams/viewTeam";

// Team Member Module - HIDDEN: Not currently in use
// import TeamMembers from "@/pages/team-members/teamMembers";
// import CreateTeamMember from "@/pages/team-members/createTeamMember";
// import EditTeamMember from "@/pages/team-members/editTeamMember";
// import MemberDashboard from "@/pages/team-members/memberDashboard";
// import TeamMemberDashboard from "@/pages/team-member/TeamMemberDashboard";

// Category Module
import Categories from "@/pages/categories/categories";
import CreateCategory from "@/pages/categories/createCategory";
import EditCategory from "@/pages/categories/editCategory";

// SLA Module
import SLA from "@/pages/sla/sla";
import CreateSLA from "@/pages/sla/createSLA";
import EditSLA from "@/pages/sla/editSLA";
import SLAMonitoring from "@/pages/sla/slaMonitoring";

// Reports Module
import Reports from "@/pages/reports/reports";
import TicketReports from "@/pages/reports/ticketReports";
import TeamPerformance from "@/pages/reports/teamPerformance";
import CustomerReports from "@/pages/reports/customerReports";

// Consultant Reports Module
import ConsultantReportsDashboard from "@/pages/consultant-reports/ConsultantDashboard";
import ConsultantListReport from "@/pages/consultant-reports/ConsultantListReport";
import ConsultantDetailReport from "@/pages/consultant-reports/ConsultantDetailReport";
import AssignmentAnalytics from "@/pages/consultant-reports/AssignmentAnalytics";

// Environment Module
import Environments from "@/pages/environments/Environments";

// Feature Module
import Features from "@/pages/features/Features";

// Product Type Module
import ProductTypes from "@/pages/product-types/ProductTypes";

// Scope Module
import Scopes from "@/pages/scopes/Scopes";

// Service Type Module
import ServiceTypes from "@/pages/service-types/ServiceTypes";

// ERP Type Module
import ErpTypes from "@/pages/erp-types/ErpTypes";

// Version Number Module
import VersionNumbers from "@/pages/version-numbers/VersionNumbers";

// Department Module
import Departments from "@/pages/departments/Departments";

// Source Module
import Sources from "@/pages/sources/Sources";

// Company Module
import Companies from "@/pages/companies/Companies";

export const routes: RouteObject[] = [
  // Public Routes (Authentication)
  {
    path: "/signin",
    element: <SigninPage />,
  },
  {
    path: "/signup",
    element: <SignupPage />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPasswordPage />,
  },
  {
    path: "/reset-password/:token",
    element: <ResetPasswordPage />,
  },
  {
    path: "/unauthorized",
    element: <UnauthorizedPage />,
  },

  // Protected Routes
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      // Dashboard
      { path: "/", element: <Dashboard /> },
      { path: "/dashboard", element: <Dashboard /> },

      // Profile Routes
      { path: "/profile", element: <ProfilePage /> },
      { path: "/change-password", element: <ChangePasswordPage /> },

      // Customer Routes (accessible by customers)
      { path: "/customers", element: <Customers /> },
      {
        path: "/customers/create",
        element: (
          <ProtectedRoute allowedUserTypes={['consultant']}>
            <CreateCustomer />
          </ProtectedRoute>
        )
      },
      { path: "/customers/edit/:id", element: <EditCustomer /> },
      { path: "/customers/view/:id", element: <ViewCustomer /> },

      // Ticket Routes (accessible by all authenticated users)
      { path: "/tickets", element: <Tickets /> },
      { path: "/tickets/create", element: <CreateTicket /> },
      { path: "/tickets/edit/:id", element: <EditTicket /> },
      { path: "/tickets/view/:id", element: <ViewTicket /> },

      // Consultant Routes
      { path: "/consultants", element: <Consultants /> },
      { path: "/consultants/create", element: <CreateConsultant /> },
      { path: "/consultants/edit/:id", element: <EditConsultant /> },
      { path: "/consultants/dashboard", element: <ConsultantDashboard /> },

      // Team Routes - HIDDEN: Commented out (not in use)
      // Team Member Routes - HIDDEN: Commented out (not in use)

      // Category Routes
      { path: "/categories", element: <Categories /> },
      { path: "/categories/create", element: <CreateCategory /> },
      { path: "/categories/edit/:id", element: <EditCategory /> },

      // SLA Routes
      { path: "/sla", element: <SLA /> },
      { path: "/sla/create", element: <CreateSLA /> },
      { path: "/sla/edit/:id", element: <EditSLA /> },
      { path: "/sla/monitoring", element: <SLAMonitoring /> },

      // Report Routes
      { path: "/reports", element: <Reports /> },
      { path: "/reports/tickets", element: <TicketReports /> },
      { path: "/reports/team-performance", element: <TeamPerformance /> },
      { path: "/reports/customer-satisfaction", element: <CustomerReports /> },

      // Consultant Report Routes
      { path: "/consultant-reports", element: <ConsultantReportsDashboard /> },
      { path: "/consultant-reports/list", element: <ConsultantListReport /> },
      { path: "/consultant-reports/:id", element: <ConsultantDetailReport /> },
      { path: "/consultant-reports/analytics", element: <AssignmentAnalytics /> },

      // Environment Routes
      { path: "/environments", element: <Environments /> },

      // Feature Routes
      { path: "/features", element: <Features /> },

      // Product Type Routes
      { path: "/product-types", element: <ProductTypes /> },

      // Scope Routes
      { path: "/scopes", element: <Scopes /> },

      // Service Type Routes
      { path: "/service-types", element: <ServiceTypes /> },

      // ERP Type Routes
      { path: "/erp-types", element: <ErpTypes /> },

      // Version Number Routes
      { path: "/version-numbers", element: <VersionNumbers /> },

      // Department Routes
      { path: "/departments", element: <Departments /> },

      // Source Routes
      { path: "/sources", element: <Sources /> },

      // Company Routes
      { path: "/companies", element: <Companies /> },
    ],
  },
];
