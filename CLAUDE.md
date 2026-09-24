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
- `useAccess()` (`src/redux/hooks/useAccess.ts`) — `isAdmin`, `isManager`, `hasModule(m)`, `isMarketing`, `isCrossTeam`… Use it instead of reading `state.auth.consultantRole` directly.
- `ProtectedRoute` + `EmployeeRoute` / `ModuleRoute` / `ManagerRoute` / `AdminRoute` — route guards in `src/components/auth/ProtectedRoute.tsx`.
- Sidebar: `EMPLOYEE_NAV` in `src/constatnts/app.constant.ts` — every entry is tagged with its module and optional `minRole`; add a link there, never a per-role array.
- One login page (`/login`) for everyone; the e-mail decides. Customers land on the "Customer Portal" shell (same `Layout`, customer link set).
- Tele-sales role helpers live in `src/lib/teleSalesRole.ts` (`isSuperAdmin` = admin or sales manager, `isReadOnly` = marketing).

## HR module (employee directory)

The employee directory lives at `/hr/employees` (old `/consultants`, `/consultants/create|edit|view` redirect).
Create and edit share `src/components/employees/EmployeeForm.tsx` — sections that follow the HR employee sheet,
with the confidential ones (personal, recruitment, contract, payroll, insurance, notes) shown only when
`useAccess().isHr` (admin or the `hr` module). Form ⇄ API mapping is in `employeeFormModel.ts`; option lists,
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
