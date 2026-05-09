import { lazy, Suspense, type ReactNode } from "react";
import { useAppSelector } from "@/redux/hooks/hooks";
import type { RouteObject } from "react-router-dom";
import Layout from "@/components/layout/layout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Dashboard — eager (landing page, should load fast)
import Dashboard from "@/pages/dashboard/dashboard";

// Lightweight loading fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
    </div>
  );
}

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

// Routes to correct dashboard based on userType
function DashboardRouter() {
  const { userType } = useAppSelector((state) => state.auth);
  if (!userType) return <PageLoader />;
  if (userType === "customer") {
    return <Lazy><CustomerDashboard /></Lazy>;
  }
  if (userType === "tele_sales") {
    return <Lazy><TeleSalesDashboard /></Lazy>;
  }
  return <Dashboard />;
}

// Auth Module
const SigninPage = lazy(() => import("@/pages/auth/signin"));
const SignupPage = lazy(() => import("@/pages/auth/signup"));
const UnauthorizedPage = lazy(() => import("@/pages/auth/unauthorized"));
const ForgotPasswordPage = lazy(() => import("@/pages/auth/forgot-password"));
const ResetPasswordPage = lazy(() => import("@/pages/auth/reset-password"));
const ProfilePage = lazy(() => import("@/pages/auth/profile"));
const ChangePasswordPage = lazy(() => import("@/pages/auth/change-password"));

// Customer Dashboard (lazy)
const CustomerDashboard = lazy(() => import("@/pages/dashboard/CustomerDashboard"));

// Customer Module
const Customers = lazy(() => import("@/pages/customers/customers"));
const CreateCustomer = lazy(() => import("@/pages/customers/createCustomer"));
const EditCustomer = lazy(() => import("@/pages/customers/editCustomer"));
const ViewCustomer = lazy(() => import("@/pages/customers/viewCustomer"));
const CustomerSummary = lazy(() => import("@/pages/customers/CustomerSummary"));

// Ticket Module
const Tickets = lazy(() => import("@/pages/tickets/tickets"));
const CreateTicket = lazy(() => import("@/pages/tickets/createTicket"));
const EditTicket = lazy(() => import("@/pages/tickets/editTicket"));
const ViewTicket = lazy(() => import("@/pages/tickets/viewTicket"));

// Services — dedicated category pages
const ProjectTickets = lazy(() => import("@/pages/projects/ProjectTickets"));
const MeetingTickets = lazy(() => import("@/pages/meetings/MeetingTickets"));

// Consultant Module
const Consultants = lazy(() => import("@/pages/consultants/consultants"));
const CreateConsultant = lazy(() => import("@/pages/consultants/createConsultant"));
const EditConsultant = lazy(() => import("@/pages/consultants/editConsultant"));
const ViewConsultant = lazy(() => import("@/pages/consultants/viewConsultant"));
const ConsultantDashboard = lazy(() => import("@/pages/consultants/consultantDashboard"));

// Category Module
const Categories = lazy(() => import("@/pages/categories/categories"));
const CreateCategory = lazy(() => import("@/pages/categories/createCategory"));
const EditCategory = lazy(() => import("@/pages/categories/editCategory"));

// SLA Module
const SLA = lazy(() => import("@/pages/sla/sla"));
const CreateSLA = lazy(() => import("@/pages/sla/createSLA"));
const EditSLA = lazy(() => import("@/pages/sla/editSLA"));
const SLAMonitoring = lazy(() => import("@/pages/sla/slaMonitoring"));

// Reports Module
const Reports = lazy(() => import("@/pages/reports/reports"));
const TicketReports = lazy(() => import("@/pages/reports/ticketReports"));
const TeamPerformance = lazy(() => import("@/pages/reports/teamPerformance"));
const CustomerReports = lazy(() => import("@/pages/reports/customerReports"));

// Consultant Reports Module
const ConsultantReportsDashboard = lazy(() => import("@/pages/consultant-reports/ConsultantDashboard"));
const ConsultantListReport = lazy(() => import("@/pages/consultant-reports/ConsultantListReport"));
const ConsultantDetailReport = lazy(() => import("@/pages/consultant-reports/ConsultantDetailReport"));
const AssignmentAnalytics = lazy(() => import("@/pages/consultant-reports/AssignmentAnalytics"));
const WeeklyConsultantReport = lazy(() => import("@/pages/consultant-reports/WeeklyConsultantReport"));

// Config Modules
const Environments = lazy(() => import("@/pages/environments/Environments"));
const CustomizedSolutions = lazy(() => import("@/pages/customized-solutions/CustomizedSolutions"));
const ProductTypes = lazy(() => import("@/pages/product-types/ProductTypes"));
const Modules = lazy(() => import("@/pages/modules/Modules"));
const ServiceTypes = lazy(() => import("@/pages/service-types/ServiceTypes"));
const ErpTypes = lazy(() => import("@/pages/erp-types/ErpTypes"));
const VersionNumbers = lazy(() => import("@/pages/version-numbers/VersionNumbers"));
const Departments = lazy(() => import("@/pages/departments/Departments"));
const Sources = lazy(() => import("@/pages/sources/Sources"));
const Companies = lazy(() => import("@/pages/companies/Companies"));
const WorkingHoursPage = lazy(() => import("@/pages/working-hours/WorkingHoursPage"));

// Company Users Module
const CompanyUsers = lazy(() => import("@/pages/company-users/companyUsers"));

// TeleSales Module
const TeleSalesSignin = lazy(() => import("@/pages/tele-sales/auth/TeleSalesSignin"));
const TeleSalesDashboard = lazy(() => import("@/pages/tele-sales/TeleSalesDashboard"));
const Leads = lazy(() => import("@/pages/tele-sales/leads/Leads"));
const LeadDetail = lazy(() => import("@/pages/tele-sales/leads/LeadDetail"));
const TeleSalesAgents = lazy(() => import("@/pages/tele-sales/agents/Agents"));

export const routes: RouteObject[] = [
  // Public Routes (Authentication — Ticket System)
  { path: "/signin", element: <Lazy><SigninPage /></Lazy> },
  { path: "/signup", element: <Lazy><SignupPage /></Lazy> },
  { path: "/forgot-password", element: <Lazy><ForgotPasswordPage /></Lazy> },
  { path: "/reset-password/:userType/:token", element: <Lazy><ResetPasswordPage /></Lazy> },
  { path: "/unauthorized", element: <Lazy><UnauthorizedPage /></Lazy> },

  // Public Routes (Authentication — TeleSales Portal)
  { path: "/tele-sales/login", element: <Lazy><TeleSalesSignin /></Lazy> },

  // TeleSales Protected Routes — outside the main ProtectedRoute so loginPath is correct
  {
    path: "/tele-sales",
    element: (
      <ProtectedRoute allowedUserTypes={["tele_sales"]} loginPath="/tele-sales/login">
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Lazy><TeleSalesDashboard /></Lazy> },
      { path: "leads", element: <Lazy><Leads /></Lazy> },
      { path: "leads/:id", element: <Lazy><LeadDetail /></Lazy> },
      { path: "agents", element: <Lazy><TeleSalesAgents /></Lazy> },
    ],
  },

  // Protected Routes (Ticket System)
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      // Dashboard — CustomerDashboard for customers, consultant Dashboard for everyone else
      { path: "/", element: <DashboardRouter /> },
      { path: "/dashboard", element: <DashboardRouter /> },

      // Profile
      { path: "/profile", element: <Lazy><ProfilePage /></Lazy> },
      { path: "/change-password", element: <Lazy><ChangePasswordPage /></Lazy> },

      // Customer Routes
      { path: "/customers", element: <Lazy><Customers /></Lazy> },
      {
        path: "/customers/create",
        element: (
          <ProtectedRoute allowedUserTypes={["consultant"]}>
            <Lazy><CreateCustomer /></Lazy>
          </ProtectedRoute>
        ),
      },
      { path: "/customers/edit/:id", element: <Lazy><EditCustomer /></Lazy> },
      { path: "/customers/view/:id", element: <Lazy><ViewCustomer /></Lazy> },
      {
        path: "/customers/summary",
        element: (
          <ProtectedRoute allowedUserTypes={["consultant"]}>
            <Lazy><CustomerSummary /></Lazy>
          </ProtectedRoute>
        ),
      },

      // Ticket Routes
      { path: "/tickets", element: <Lazy><Tickets /></Lazy> },
      { path: "/tickets/create", element: <Lazy><CreateTicket /></Lazy> },
      { path: "/tickets/edit/:id", element: <Lazy><EditTicket /></Lazy> },
      { path: "/tickets/view/:id", element: <Lazy><ViewTicket /></Lazy> },

      // Services — dedicated pages
      { path: "/projects", element: <Lazy><ProjectTickets /></Lazy> },
      { path: "/meetings", element: <Lazy><MeetingTickets /></Lazy> },

      // Consultant Routes
      { path: "/consultants", element: <Lazy><Consultants /></Lazy> },
      {
        path: "/consultants/create",
        element: (
          <ProtectedRoute allowedUserTypes={["consultant"]}>
            <Lazy><CreateConsultant /></Lazy>
          </ProtectedRoute>
        ),
      },
      {
        path: "/consultants/edit/:id",
        element: (
          <ProtectedRoute allowedUserTypes={["consultant"]}>
            <Lazy><EditConsultant /></Lazy>
          </ProtectedRoute>
        ),
      },
      { path: "/consultants/view/:id", element: <Lazy><ViewConsultant /></Lazy> },
      { path: "/consultants/dashboard", element: <Lazy><ConsultantDashboard /></Lazy> },

      // Category Routes
      { path: "/categories", element: <Lazy><Categories /></Lazy> },
      { path: "/categories/create", element: <Lazy><CreateCategory /></Lazy> },
      { path: "/categories/edit/:id", element: <Lazy><EditCategory /></Lazy> },

      // SLA Routes
      { path: "/sla", element: <Lazy><SLA /></Lazy> },
      { path: "/sla/create", element: <Lazy><CreateSLA /></Lazy> },
      { path: "/sla/edit/:id", element: <Lazy><EditSLA /></Lazy> },
      { path: "/sla/monitoring", element: <Lazy><SLAMonitoring /></Lazy> },

      // Report Routes
      { path: "/reports", element: <Lazy><Reports /></Lazy> },
      { path: "/reports/tickets", element: <Lazy><TicketReports /></Lazy> },
      { path: "/reports/team-performance", element: <Lazy><TeamPerformance /></Lazy> },
      { path: "/reports/customer-satisfaction", element: <Lazy><CustomerReports /></Lazy> },

      // Consultant Report Routes
      { path: "/consultant-reports", element: <Lazy><ConsultantReportsDashboard /></Lazy> },
      { path: "/consultant-reports/list", element: <Lazy><ConsultantListReport /></Lazy> },
      { path: "/consultant-reports/weekly", element: <Lazy><WeeklyConsultantReport /></Lazy> },
      { path: "/consultant-reports/analytics", element: <Lazy><AssignmentAnalytics /></Lazy> },
      { path: "/consultant-reports/:id", element: <Lazy><ConsultantDetailReport /></Lazy> },

      // Config Routes
      { path: "/environments", element: <Lazy><Environments /></Lazy> },
      { path: "/customized-solutions", element: <Lazy><CustomizedSolutions /></Lazy> },
      { path: "/product-types", element: <Lazy><ProductTypes /></Lazy> },
      { path: "/modules", element: <Lazy><Modules /></Lazy> },
      { path: "/service-types", element: <Lazy><ServiceTypes /></Lazy> },
      { path: "/erp-types", element: <Lazy><ErpTypes /></Lazy> },
      { path: "/version-numbers", element: <Lazy><VersionNumbers /></Lazy> },
      { path: "/departments", element: <Lazy><Departments /></Lazy> },
      { path: "/sources", element: <Lazy><Sources /></Lazy> },
      { path: "/companies", element: <Lazy><Companies /></Lazy> },
      { path: "/working-hours", element: <Lazy><WorkingHoursPage /></Lazy> },

      // Company Users — company_admin customers only
      {
        path: "/company-users",
        element: (
          <ProtectedRoute allowedUserTypes={["customer"]} requiredCustomerRole="company_admin">
            <Lazy><CompanyUsers /></Lazy>
          </ProtectedRoute>
        ),
      },

    ],
  },
];
