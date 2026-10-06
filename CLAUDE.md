## Design Context

### Users
Mixed roles use this system: support agents triaging and resolving tickets, managers/admins monitoring SLAs and assigning consultants, and customers submitting tickets. Each role has different priorities — agents need speed and clarity, managers need oversight and analytics, customers need simplicity. Users spend extended time in the interface, so it must reduce fatigue and support sustained focus.

### Brand Personality
**Modern, clean, efficient.** The system should feel like a well-designed, contemporary SaaS tool — streamlined and purposeful. Every element earns its place. The interface communicates competence without being cold, and sophistication without being showy.

**Emotional goals:** Calm & focus, efficiency & speed, trust & professionalism, confidence & control. Users should feel in command of their workflow with minimal cognitive load.

### Aesthetic Direction
**Reference:** Jira / ServiceNow — power-user focused with dense data, configurable views, and workflow-heavy interfaces. The system prioritizes function and information density for experienced users who need to move fast through queues and data.

**Anti-references:**
- **NOT dated & corporate** — no flat gray enterprise look from 2010, no legacy software aesthetics
- **NOT over-designed & flashy** — no gratuitous animations, no gradients everywhere, no style over substance

**Theme:** Light mode (soft lavender #FAF8FF base) and dark mode (deep blue-black #111318) supported via next-themes. Primary: Deep Blue (#003A8F). Accent: Vibrant Orange (#D83A03) for alerts and high-priority actions.

**Typography:** Manrope font family, weights 300-800, with a defined hierarchy from 3.5rem display to 0.75rem technical labels.

**Effects:** Glassmorphism on dialogs, ambient shadows on floating elements, ghost borders. Framer Motion for purposeful transitions only.

### Design Principles

1. **Information density over whitespace** — Power users need data-rich views. Prioritize showing relevant information without requiring extra clicks, but maintain clear visual hierarchy so density doesn't become clutter.

2. **Function first, form follows** — Every visual choice must serve usability. No decorative elements that don't aid comprehension, navigation, or task completion. Animations should communicate state changes, not entertain.

3. **Consistent surfaces, clear hierarchy** — Use the MD3-inspired surface system (surface → surface-container-lowest → highest) to create depth and grouping. Cards, tables, and panels should have predictable visual weight.

4. **Accessible by default** — Meet WCAG 2.1 AA standards. Ensure sufficient contrast ratios, full keyboard navigation, screen reader support, and visible focus indicators throughout.

5. **Role-adaptive clarity** — Design views that serve multiple user roles without compromise. Use progressive disclosure: simple at first glance for customers, power-user features readily available for agents and admins.

### Technical Stack
- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS 4 with custom design tokens in CSS variables
- **Components:** Shadcn/UI (new-york style) + Radix UI primitives
- **Icons:** Lucide React
- **Animation:** Framer Motion + tw-animate-css
- **State:** Redux Toolkit
- **Charts:** Recharts
- **Theme:** next-themes (light/dark)

## Access model (who sees what)

Two user types (`employee` | `customer`) and one flat employee role list —
`admin`, `consultant`, `sales`, `sales_manager`, `marketing`, `marketing_manager`,
`developer`, `developer_manager`.
Roles unlock **modules** (`tickets`, `telesales`, `tasks`, `admin`, `development`, `hr`); an admin may
override the module list per employee. The API is the authority; the client only
mirrors it so the sidebar, guards and buttons agree.

- `src/lib/access.ts` — role/module vocabulary and `effectiveModules`. Keep in step with the backend's `src/utils/roles.js`.
- Employees may hold several roles (`role` + `extraRoles`) and departments (`department` + `departments`); `rolesOf(user)` / `effectiveModules(roles, modules)` in `src/lib/access.ts` and `useAccess().roles` / `.families` OR across them, as the API does. The employee form (`EmployeeAccessFields`) edits both as multi-selects (`roles` / `departmentIds`, primary first).
- `useAccess()` (`src/redux/hooks/useAccess.ts`) — `isAdmin`, `isManager`, `hasModule(m)`, `isMarketing`, `isCrossTeam`… Use it instead of reading `state.auth.consultantRole` directly.
- `ProtectedRoute` + `EmployeeRoute` / `ModuleRoute` / `ManagerRoute` / `AdminRoute` — route guards in `src/components/auth/ProtectedRoute.tsx`.
- Sidebar: `EMPLOYEE_NAV` in `src/constatnts/app.constant.ts` — every entry is tagged with its module and optional `minRole`; add a link there, never a per-role array.
- One login page (`/login`) for everyone; the e-mail decides. Customers land on the "Customer Portal" shell (same `Layout`, customer link set).
- Tele-sales role helpers live in `src/lib/teleSalesRole.ts` (`isSuperAdmin` = admin only — the one role that spans teams with write access; `canManageTeam` = admin or sales manager — import, assign, roster; `isReadOnly` = marketing). An employee may be on several teams (`teleSalesTeam` = home, `teleSalesTeams` = every ticked team — the checkboxes on the employee form); `ownTeams(user)` lists them, and a multi-team user gets the team filter / column / import target / new-lead team picker. A plain agent sees only the records assigned to them (no owner filter); a sales manager every record of their teams. The pipeline has three tabs sharing `pages/tele-sales/leads/Leads.tsx` via `stage`: **Data** (`/tele-sales/data`, the only place with Import and "Add Data", nothing mandatory), **Leads** (`/tele-sales/leads`) and **Opportunities** (`/tele-sales/opportunities`). Stage vocabulary, `REQUIRED_LEAD_FIELDS`, `missingLeadFields` and `recordName` (raw data may have no company name) live in `src/lib/leadStages.ts`, mirroring the backend's `leadStages.js`. Data → Lead opens `LeadFormModal` with `convert` (all mandatory fields, then `convertLead`); Lead → Opportunity is a confirm. The form's **Customer Need** is `ProductNeedSelect` (multi-select over the active Product Catalog, built on `ui/multi-select`) writing `customerNeedProducts`; the old free-text `customerNeeds` is shown read-only as earlier notes. Every tab has grid checkboxes (current page); the selection bar opens `BulkEditDialog` — "Fields & Owner" (reassign only for `canManageTeam`) and "Change Status" (`StatusUpdateForm` in `bulk` mode, statuses mirrored from the backend's `BULK_STATUSES`) — and shows what was skipped and why. **Team → Agent:** every Agent picker that depends on a Team (lead form, import "Assign All To", the owner filter, bulk reassign, the status form's New Lead owner) lists only that team's employees via `useTeamAgents(teamId)` (`src/hooks/useTeamAgents.ts`, cached per team for a minute); changing or clearing the Team clears the Agent. **Existing customer:** the lead form's first card, `ExistingCustomerFields` — Yes shows the Company lookup and, filtered by it, the Contact (`SearchSelect`); picking them fills company name, contact person, email, phone, address and country (only where the account holds a value). Any non-marketing role may import (non-managers' imports are assigned to them, status `No Action`). Lead status labels use `LeadStatusBadge`; lead money uses `formatMoney` / `LEAD_VALUE_SOURCES` from `teleSales.types.ts`; `proposalValue` is the Quoted Value (leads list "Proposal Price" column). The status form lives in `StatusUpdateForm` (used by the Change Status dialog and the lead page's inline Quick Update card); `src/config/leadStatusWorkflow.ts` mirrors the backend's workflow — change both.

## HR module (employee directory)

The employee directory lives at `/hr/employees` (old `/consultants`, `/consultants/create|edit|view` redirect).
Create and edit share `src/components/employees/EmployeeForm.tsx` — sections that follow the HR employee sheet,
with the confidential ones (personal, recruitment, contract, payroll, insurance, medical, subscriptions, notes) shown only when
`useAccess().isHr` (admin or the `hr` module). Yes/no answers (`hasSocialInsurance`, `hasMedicalInsurance`,
`hasCompanyLine`, `hasLaptop`, `uberSubscriber`) are held in the form as `'yes' | 'no' | ''`; a "no" hides and
clears the fields it gates (the API clears them too). Ticking "Line Number" asks for `companyLineNumber` (8-15 digits). The laptop photo or PDF is the HR document type `laptop_photo`
(`asset: true` in `DOCUMENT_TYPES`), uploaded from the Subscriptions section rather than the Documents grid. Form ⇄ API mapping is in `employeeFormModel.ts`; option lists,
paths and insurance rates in `src/lib/hr.ts` (keep the enums in step with `HR_ENUMS` in the backend model).
`EmployeeHrFilePanel` renders the file read-only on the profile page — only when the API sent `hr`.
`EmployeeDocuments` is the per-type document upload grid (profile + edit upload immediately; the create form
stages files and `createConsultant.tsx` uploads them once the employee exists). Files open through an authed
blob fetch, never a plain link.

## Development module (kanban)

`/development` lists the boards the caller may see; `/development/boards/:id` is the board.
State lives in `src/redux/slices/developmentSlice.ts`, normalised as `lists` + `cardIdsByList` +
`cardsById` so a drag only touches id arrays. Drag-and-drop is `@dnd-kit` in
`src/components/development/KanbanBoard.tsx`: `onDragOver` applies the move locally
(`cardMovedLocally`), `onDragEnd` persists it (`moveCard` / `reorderLists`) and a failed save
restores the snapshot taken at drag start. `useAccess().seesAllBoards` (admin or development
manager) plus "is the creator" decides who gets the board-shaping controls; the API re-checks.
Shared helpers (`personName`, `contrastText`, dnd ids) are in `src/lib/development.ts`.
Board settings has a **Tickets** tab (only `seesAllBoards`) that links a department + employee to the board;
matching tickets arrive as cards carrying `card.ticket`, shown as a ticket-number badge that opens the ticket.
