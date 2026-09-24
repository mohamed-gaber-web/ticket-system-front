import { lazy, Suspense, type ReactNode } from "react";
import { useAppSelector } from "@/redux/hooks/hooks";
import { Navigate, useParams } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import Layout from "@/components/layout/layout";
import ProtectedRoute, {
  EmployeeRoute,
  ModuleRoute,
  ManagerRoute,
  AdminRoute,
  EmployeeManagerRoute,
} from "@/components/auth/ProtectedRoute";
import { useAccess } from "@/redux/hooks/useAccess";
import { homePathFor } from "@/lib/access";

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

// The employee directory moved from /consultants to /hr/employees; old links
// and bookmarks keep working.
function LegacyEmployeeRedirect({ to }: { to: (id?: string) => string }) {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={to(id)} replace />;
}

// Routes to the right dashboard: customers get the portal, employees the first
// module they can open (tickets → telesales → tasks → requests).
function DashboardRouter() {
  const { userType } = useAppSelector((state) => state.auth);
  const access = useAccess();
  if (!userType) return <PageLoader />;
  if (userType === "customer") return <Lazy><CustomerDashboard /></Lazy>;
  if (access.hasModule("tickets")) return <Dashboard />;
  const home = homePathFor(access.modules);
  return <Navigate to={home === "/" ? "/employee-requests" : home} replace />;
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
const WeeklyHoursPage = lazy(() => import("@/pages/consultants/WeeklyHoursPage"));
const EmployeeEvaluationPage = lazy(() => import("@/pages/consultants/EmployeeEvaluationPage"));
const EvaluationsOverviewPage = lazy(() => import("@/pages/consultants/EvaluationsOverviewPage"));

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
const IndustrySectors = lazy(() => import("@/pages/industry-sectors/IndustrySectors"));
const Countries = lazy(() => import("@/pages/countries/Countries"));
const BusinessClassifications = lazy(() => import("@/pages/business-classifications/BusinessClassifications"));
const Companies = lazy(() => import("@/pages/companies/Companies"));
const WorkingHoursPage = lazy(() => import("@/pages/working-hours/WorkingHoursPage"));

// Company Users Module
const CompanyUsers = lazy(() => import("@/pages/company-users/companyUsers"));

// TeleSales Module
const TeleSalesDashboard = lazy(() => import("@/pages/tele-sales/TeleSalesDashboard"));
const Leads = lazy(() => import("@/pages/tele-sales/leads/Leads"));
const LeadDetail = lazy(() => import("@/pages/tele-sales/leads/LeadDetail"));
const RecentCalls = lazy(() => import("@/pages/tele-sales/leads/RecentCalls"));
const TeleSalesAgents = lazy(() => import("@/pages/tele-sales/agents/Agents"));
const TeleSalesTeams = lazy(() => import("@/pages/tele-sales/teams/Teams"));

// Tasks Module
const Tasks = lazy(() => import("@/pages/tasks/Tasks"));
const TaskForm = lazy(() => import("@/pages/tasks/components/TaskForm"));
const ViewTask = lazy(() => import("@/pages/tasks/ViewTask"));
const TasksDashboard = lazy(() => import("@/pages/tasks/TasksDashboard"));
const TaskCategories = lazy(() => import("@/pages/task-categories/taskCategories"));
const CreateTaskCategory = lazy(() => import("@/pages/task-categories/createTaskCategory"));
const DevelopmentBoards = lazy(() => import("@/pages/development/DevelopmentBoards"));
const DevelopmentBoard = lazy(() => import("@/pages/development/DevelopmentBoard"));
const EditTaskCategory = lazy(() => import("@/pages/task-categories/editTaskCategory"));

// Employee Requests Module
const MyRequests = lazy(() => import("@/pages/employee-requests/MyRequests"));
const RequestApprovals = lazy(() => import("@/pages/employee-requests/Approvals"));
const EmployeeBalance = lazy(() => import("@/pages/employee-requests/EmployeeBalance"));

export const routes: RouteObject[] = [
  // Public Routes — one login for everyone; the e-mail decides the account type
  { path: "/login", element: <Lazy><SigninPage /></Lazy> },
  { path: "/signup", element: <Lazy><SignupPage /></Lazy> },
  { path: "/forgot-password", element: <Lazy><ForgotPasswordPage /></Lazy> },
  { path: "/reset-password/:userType/:token", element: <Lazy><ResetPasswordPage /></Lazy> },
  { path: "/unauthorized", element: <Lazy><UnauthorizedPage /></Lazy> },
  // Old login URLs (bookmarks, e-mails) keep working
  { path: "/signin", element: <Navigate to="/login" replace /> },
  { path: "/tele-sales/login", element: <Navigate to="/login" replace /> },

  // TeleSales — anyone with the telesales module (sales, marketing read-only, admin)
  {
    path: "/tele-sales",
    element: (
      <ModuleRoute module="telesales">
        <Layout />
      </ModuleRoute>
    ),
    children: [
      { index: true, element: <Lazy><TeleSalesDashboard /></Lazy> },
      { path: "leads", element: <Lazy><Leads /></Lazy> },
      { path: "opportunities", element: <Lazy><Leads lockedSalesType="Opportunity" title="Opportunities" /></Lazy> },
      // The Interested tab was replaced by Opportunities; keep old links working.
      { path: "interested", element: <Navigate to="/tele-sales/opportunities" replace /> },
      { path: "leads/:id", element: <Lazy><LeadDetail /></Lazy> },
      { path: "calls/recent", element: <Lazy><RecentCalls /></Lazy> },
      { path: "agents", element: <ManagerRoute><Lazy><TeleSalesAgents /></Lazy></ManagerRoute> },
      // Team management moved to HR (/hr/teams); keep old links working.
      { path: "teams", element: <Navigate to="/hr/teams" replace /> },
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

      // Customer Routes — ticketing module
      { path: "/customers", element: <ModuleRoute module="tickets"><Lazy><Customers /></Lazy></ModuleRoute> },
      { path: "/customers/create", element: <ModuleRoute module="tickets"><Lazy><CreateCustomer /></Lazy></ModuleRoute> },
      { path: "/customers/edit/:id", element: <ModuleRoute module="tickets"><Lazy><EditCustomer /></Lazy></ModuleRoute> },
      { path: "/customers/view/:id", element: <ModuleRoute module="tickets"><Lazy><ViewCustomer /></Lazy></ModuleRoute> },
      { path: "/customers/summary", element: <ModuleRoute module="tickets"><Lazy><CustomerSummary /></Lazy></ModuleRoute> },

      // Ticket Routes
      { path: "/tickets", element: <Lazy><Tickets /></Lazy> },
      { path: "/tickets/create", element: <Lazy><CreateTicket /></Lazy> },
      { path: "/tickets/edit/:id", element: <Lazy><EditTicket /></Lazy> },
      { path: "/tickets/view/:id", element: <Lazy><ViewTicket /></Lazy> },

      // Services — dedicated pages
      { path: "/projects", element: <Lazy><ProjectTickets /></Lazy> },
      { path: "/meetings", element: <Lazy><MeetingTickets /></Lazy> },

      // HR — the employee directory. The roster is readable by any employee
      // (pickers need it); creating and editing is for managers, HR and admins,
      // and the confidential HR file only ever reaches HR and admins.
      { path: "/hr/employees", element: <EmployeeRoute><Lazy><Consultants /></Lazy></EmployeeRoute> },
      { path: "/hr/employees/create", element: <EmployeeManagerRoute><Lazy><CreateConsultant /></Lazy></EmployeeManagerRoute> },
      { path: "/hr/employees/edit/:id", element: <EmployeeManagerRoute><Lazy><EditConsultant /></Lazy></EmployeeManagerRoute> },
      { path: "/hr/employees/view/:id", element: <EmployeeRoute><Lazy><ViewConsultant /></Lazy></EmployeeRoute> },
      // Tele-sales teams are managed by HR (admins always hold the hr module)
      { path: "/hr/teams", element: <ModuleRoute module="hr"><Lazy><TeleSalesTeams /></Lazy></ModuleRoute> },
      { path: "/consultants", element: <Navigate to="/hr/employees" replace /> },
      { path: "/consultants/create", element: <Navigate to="/hr/employees/create" replace /> },
      { path: "/consultants/edit/:id", element: <LegacyEmployeeRedirect to={(id) => `/hr/employees/edit/${id}`} /> },
      { path: "/consultants/view/:id", element: <LegacyEmployeeRedirect to={(id) => `/hr/employees/view/${id}`} /> },
      { path: "/consultants/dashboard", element: <ModuleRoute module="tickets"><Lazy><ConsultantDashboard /></Lazy></ModuleRoute> },
      { path: "/consultants/weekly-hours", element: <ModuleRoute module="tickets"><Lazy><WeeklyHoursPage /></Lazy></ModuleRoute> },
      { path: "/consultants/evaluation/:id", element: <EmployeeRoute><Lazy><EmployeeEvaluationPage /></Lazy></EmployeeRoute> },
      { path: "/consultants/evaluations", element: <AdminRoute><Lazy><EvaluationsOverviewPage /></Lazy></AdminRoute> },

      // Category Routes — ticketing setup
      { path: "/categories", element: <ModuleRoute module="tickets"><Lazy><Categories /></Lazy></ModuleRoute> },
      { path: "/categories/create", element: <AdminRoute><Lazy><CreateCategory /></Lazy></AdminRoute> },
      { path: "/categories/edit/:id", element: <AdminRoute><Lazy><EditCategory /></Lazy></AdminRoute> },

      // SLA Routes
      { path: "/sla", element: <ModuleRoute module="tickets"><Lazy><SLA /></Lazy></ModuleRoute> },
      { path: "/sla/create", element: <AdminRoute><Lazy><CreateSLA /></Lazy></AdminRoute> },
      { path: "/sla/edit/:id", element: <AdminRoute><Lazy><EditSLA /></Lazy></AdminRoute> },
      { path: "/sla/monitoring", element: <ModuleRoute module="tickets"><Lazy><SLAMonitoring /></Lazy></ModuleRoute> },

      // Report Routes
      { path: "/reports", element: <ModuleRoute module="tickets"><Lazy><Reports /></Lazy></ModuleRoute> },
      { path: "/reports/tickets", element: <ModuleRoute module="tickets"><Lazy><TicketReports /></Lazy></ModuleRoute> },
      { path: "/reports/team-performance", element: <ModuleRoute module="tickets"><Lazy><TeamPerformance /></Lazy></ModuleRoute> },
      { path: "/reports/customer-satisfaction", element: <ModuleRoute module="tickets"><Lazy><CustomerReports /></Lazy></ModuleRoute> },

      // Consultant Report Routes
      { path: "/consultant-reports", element: <ModuleRoute module="tickets"><Lazy><ConsultantReportsDashboard /></Lazy></ModuleRoute> },
      { path: "/consultant-reports/list", element: <ModuleRoute module="tickets"><Lazy><ConsultantListReport /></Lazy></ModuleRoute> },
      { path: "/consultant-reports/weekly", element: <ModuleRoute module="tickets"><Lazy><WeeklyConsultantReport /></Lazy></ModuleRoute> },
      { path: "/consultant-reports/analytics", element: <ModuleRoute module="tickets"><Lazy><AssignmentAnalytics /></Lazy></ModuleRoute> },
      { path: "/consultant-reports/:id", element: <ModuleRoute module="tickets"><Lazy><ConsultantDetailReport /></Lazy></ModuleRoute> },

      // Config Routes — the lists are readable by whoever uses the module that
      // needs them; editing is admin-only inside each page
      { path: "/environments", element: <ModuleRoute module="tickets"><Lazy><Environments /></Lazy></ModuleRoute> },
      { path: "/customized-solutions", element: <ModuleRoute module="tickets"><Lazy><CustomizedSolutions /></Lazy></ModuleRoute> },
      { path: "/product-types", element: <ModuleRoute module="tickets"><Lazy><ProductTypes /></Lazy></ModuleRoute> },
      { path: "/modules", element: <ModuleRoute module="tickets"><Lazy><Modules /></Lazy></ModuleRoute> },
      { path: "/service-types", element: <ModuleRoute module="tickets"><Lazy><ServiceTypes /></Lazy></ModuleRoute> },
      { path: "/erp-types", element: <ModuleRoute module="tickets"><Lazy><ErpTypes /></Lazy></ModuleRoute> },
      { path: "/version-numbers", element: <ModuleRoute module="tickets"><Lazy><VersionNumbers /></Lazy></ModuleRoute> },
      { path: "/departments", element: <AdminRoute><Lazy><Departments /></Lazy></AdminRoute> },
      { path: "/sources", element: <ModuleRoute module="tickets"><Lazy><Sources /></Lazy></ModuleRoute> },
      { path: "/industry-sectors", element: <ModuleRoute module="telesales"><Lazy><IndustrySectors /></Lazy></ModuleRoute> },
      { path: "/countries", element: <ModuleRoute module="telesales"><Lazy><Countries /></Lazy></ModuleRoute> },
      { path: "/business-classifications", element: <ModuleRoute module="telesales"><Lazy><BusinessClassifications /></Lazy></ModuleRoute> },
      { path: "/companies", element: <ModuleRoute module="tickets"><Lazy><Companies /></Lazy></ModuleRoute> },
      { path: "/working-hours", element: <ModuleRoute module="tickets"><Lazy><WorkingHoursPage /></Lazy></ModuleRoute> },

      // Company Users — company_admin customers only
      {
        path: "/company-users",
        element: (
          <ProtectedRoute allowedUserTypes={["customer"]} requiredCustomerRole="company_admin">
            <Lazy><CompanyUsers /></Lazy>
          </ProtectedRoute>
        ),
      },

      // Tasks Module — anyone with the tasks module
      {
        path: "/tasks/dashboard",
        element: <ModuleRoute module="tasks"><Lazy><TasksDashboard /></Lazy></ModuleRoute>,
      },
      {
        path: "/tasks",
        element: <ModuleRoute module="tasks"><Lazy><Tasks /></Lazy></ModuleRoute>,
      },
      {
        path: "/tasks/create",
        element: <ModuleRoute module="tasks"><Lazy><TaskForm /></Lazy></ModuleRoute>,
      },
      {
        path: "/tasks/edit/:id",
        element: <ModuleRoute module="tasks"><Lazy><TaskForm /></Lazy></ModuleRoute>,
      },
      {
        path: "/tasks/:id",
        element: <ModuleRoute module="tasks"><Lazy><ViewTask /></Lazy></ModuleRoute>,
      },

      // Task Categories — shared by the module, so shaping them is a manager's job
      { path: "/task-categories", element: <ModuleRoute module="tasks"><Lazy><TaskCategories /></Lazy></ModuleRoute> },
      { path: "/task-categories/create", element: <ManagerRoute><Lazy><CreateTaskCategory /></Lazy></ManagerRoute> },

      // Development Module — kanban boards; who sees which board is decided per board by the API
      { path: "/development", element: <ModuleRoute module="development"><Lazy><DevelopmentBoards /></Lazy></ModuleRoute> },
      { path: "/development/boards/:id", element: <ModuleRoute module="development"><Lazy><DevelopmentBoard /></Lazy></ModuleRoute> },
      { path: "/task-categories/edit/:id", element: <ManagerRoute><Lazy><EditTaskCategory /></Lazy></ManagerRoute> },

      // Employee Requests Module — every employee submits; managers and admins review
      { path: "/employee-requests", element: <EmployeeRoute><Lazy><MyRequests /></Lazy></EmployeeRoute> },
      { path: "/employee-requests/approvals", element: <ManagerRoute><Lazy><RequestApprovals /></Lazy></ManagerRoute> },
      { path: "/employee-requests/balances", element: <EmployeeRoute><Lazy><EmployeeBalance /></Lazy></EmployeeRoute> },

    ],
  },
];
