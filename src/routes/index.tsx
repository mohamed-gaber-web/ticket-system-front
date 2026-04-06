import { lazy, Suspense, type ReactNode } from "react";
import type { RouteObject } from "react-router-dom";
import Layout from "@/components/layout/layout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Lightweight loading fallback — no extra dependencies
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

// Auth Module — lazy (not needed until user navigates)
const SigninPage = lazy(() => import("@/pages/auth/signin"));
const SignupPage = lazy(() => import("@/pages/auth/signup"));
const UnauthorizedPage = lazy(() => import("@/pages/auth/unauthorized"));
const ForgotPasswordPage = lazy(() => import("@/pages/auth/forgot-password"));
const ResetPasswordPage = lazy(() => import("@/pages/auth/reset-password"));
const ProfilePage = lazy(() => import("@/pages/auth/profile"));
const ChangePasswordPage = lazy(() => import("@/pages/auth/change-password"));

// Dashboard — eager (landing page, should load fast)
import Dashboard from "@/pages/dashboard/dashboard";

// Customer Module
const Customers = lazy(() => import("@/pages/customers/customers"));
const CreateCustomer = lazy(() => import("@/pages/customers/createCustomer"));
const EditCustomer = lazy(() => import("@/pages/customers/editCustomer"));
const ViewCustomer = lazy(() => import("@/pages/customers/viewCustomer"));

// Ticket Module
const Tickets = lazy(() => import("@/pages/tickets/tickets"));
const CreateTicket = lazy(() => import("@/pages/tickets/createTicket"));
const EditTicket = lazy(() => import("@/pages/tickets/editTicket"));
const ViewTicket = lazy(() => import("@/pages/tickets/viewTicket"));

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

// Config Modules
const Environments = lazy(() => import("@/pages/environments/Environments"));
const Features = lazy(() => import("@/pages/features/Features"));
const ProductTypes = lazy(() => import("@/pages/product-types/ProductTypes"));
const Scopes = lazy(() => import("@/pages/scopes/Scopes"));
const ServiceTypes = lazy(() => import("@/pages/service-types/ServiceTypes"));
const ErpTypes = lazy(() => import("@/pages/erp-types/ErpTypes"));
const VersionNumbers = lazy(() => import("@/pages/version-numbers/VersionNumbers"));
const Departments = lazy(() => import("@/pages/departments/Departments"));
const Sources = lazy(() => import("@/pages/sources/Sources"));
const Companies = lazy(() => import("@/pages/companies/Companies"));
const WorkingHoursPage = lazy(() => import("@/pages/working-hours/WorkingHoursPage"));

export const routes: RouteObject[] = [
  // Public Routes (Authentication)
  {
    path: "/signin",
    element: <Lazy><SigninPage /></Lazy>,
  },
  {
    path: "/signup",
    element: <Lazy><SignupPage /></Lazy>,
  },
  {
    path: "/forgot-password",
    element: <Lazy><ForgotPasswordPage /></Lazy>,
  },
  {
    path: "/reset-password/:token",
    element: <Lazy><ResetPasswordPage /></Lazy>,
  },
  {
    path: "/unauthorized",
    element: <Lazy><UnauthorizedPage /></Lazy>,
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
      // Dashboard (eager — landing page)
      { path: "/", element: <Dashboard /> },
      { path: "/dashboard", element: <Dashboard /> },

      // Profile Routes
      { path: "/profile", element: <Lazy><ProfilePage /></Lazy> },
      { path: "/change-password", element: <Lazy><ChangePasswordPage /></Lazy> },

      // Customer Routes
      { path: "/customers", element: <Lazy><Customers /></Lazy> },
      {
        path: "/customers/create",
        element: (
          <ProtectedRoute allowedUserTypes={['consultant']}>
            <Lazy><CreateCustomer /></Lazy>
          </ProtectedRoute>
        )
      },
      { path: "/customers/edit/:id", element: <Lazy><EditCustomer /></Lazy> },
      { path: "/customers/view/:id", element: <Lazy><ViewCustomer /></Lazy> },

      // Ticket Routes
      { path: "/tickets", element: <Lazy><Tickets /></Lazy> },
      { path: "/tickets/create", element: <Lazy><CreateTicket /></Lazy> },
      { path: "/tickets/edit/:id", element: <Lazy><EditTicket /></Lazy> },
      { path: "/tickets/view/:id", element: <Lazy><ViewTicket /></Lazy> },

      // Consultant Routes
      { path: "/consultants", element: <Lazy><Consultants /></Lazy> },
      { path: "/consultants/create", element: <Lazy><CreateConsultant /></Lazy> },
      { path: "/consultants/edit/:id", element: <Lazy><EditConsultant /></Lazy> },
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
      { path: "/consultant-reports/:id", element: <Lazy><ConsultantDetailReport /></Lazy> },
      { path: "/consultant-reports/analytics", element: <Lazy><AssignmentAnalytics /></Lazy> },

      // Config Routes
      { path: "/environments", element: <Lazy><Environments /></Lazy> },
      { path: "/features", element: <Lazy><Features /></Lazy> },
      { path: "/product-types", element: <Lazy><ProductTypes /></Lazy> },
      { path: "/scopes", element: <Lazy><Scopes /></Lazy> },
      { path: "/service-types", element: <Lazy><ServiceTypes /></Lazy> },
      { path: "/erp-types", element: <Lazy><ErpTypes /></Lazy> },
      { path: "/version-numbers", element: <Lazy><VersionNumbers /></Lazy> },
      { path: "/departments", element: <Lazy><Departments /></Lazy> },
      { path: "/sources", element: <Lazy><Sources /></Lazy> },
      { path: "/companies", element: <Lazy><Companies /></Lazy> },
      { path: "/working-hours", element: <Lazy><WorkingHoursPage /></Lazy> },
    ],
  },
];
