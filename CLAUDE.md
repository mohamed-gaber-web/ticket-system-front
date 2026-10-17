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
Roles unlock **modules** (`tickets`, `telesales`, `tasks`, `admin`, `development`, `hr`, `marketing`, `proposals`, `vault`); an admin may
override the module list per employee. The API is the authority; the client only
mirrors it so the sidebar, guards and buttons agree.

- `src/lib/access.ts` — role/module vocabulary and `effectiveModules`. Keep in step with the backend's `src/utils/roles.js`.
- Employees may hold several roles (`role` + `extraRoles`) and departments (`department` + `departments`); `rolesOf(user)` / `effectiveModules(roles, modules)` in `src/lib/access.ts` and `useAccess().roles` / `.families` OR across them, as the API does. The employee form (`EmployeeAccessFields`) edits both as multi-selects (`roles` / `departmentIds`, primary first).
- `useAccess()` (`src/redux/hooks/useAccess.ts`) — `isAdmin`, `isManager`, `hasModule(m)`, `isMarketing`, `isCrossTeam`… Use it instead of reading `state.auth.consultantRole` directly.
- `ProtectedRoute` + `EmployeeRoute` / `ModuleRoute` / `ManagerRoute` / `AdminRoute` — route guards in `src/components/auth/ProtectedRoute.tsx`.
- Sidebar: `EMPLOYEE_NAV` in `src/constatnts/app.constant.ts` — every entry is tagged with its module and optional `minRole`; add a link there, never a per-role array.
- One login page (`/login`) for everyone; the e-mail decides. Customers land on the "Customer Portal" shell (same `Layout`, customer link set).
- Tele-sales role helpers live in `src/lib/teleSalesRole.ts` (`isSuperAdmin` = admin only — the one role that spans teams with write access; `canManageTeam` = admin or sales manager — import, assign, roster; `isReadOnly` = marketing). An employee may be on several teams (`teleSalesTeam` = home, `teleSalesTeams` = every ticked team — the checkboxes on the employee form); `ownTeams(user)` lists them, and a multi-team user gets the team filter / column / import target / new-lead team picker. A plain agent sees only the records assigned to them (no owner filter); a sales manager every record of their teams. The pipeline has three tabs sharing `pages/tele-sales/leads/Leads.tsx` via `stage`: **Data** (`/tele-sales/data`, the only place with Import and "Add Data", nothing mandatory), **Leads** (`/tele-sales/leads`) and **Opportunities** (`/tele-sales/opportunities`). Stage vocabulary, `REQUIRED_LEAD_FIELDS`, `missingLeadFields` and `recordName` (raw data may have no company name) live in `src/lib/leadStages.ts`, mirroring the backend's `leadStages.js`. The Leads tab also lists converted Opportunities, with an "Opportunity" badge and no Convert button. Data → Lead opens `LeadFormModal` with `convert` (all mandatory fields, then `convertLead`); Lead → Opportunity is a confirm. The form's **Customer Need** is `ProductNeedSelect` (multi-select over the active Product Catalog, built on `ui/multi-select`) writing `customerNeedProducts`; the old free-text `customerNeeds` is shown read-only as earlier notes. Every tab has grid checkboxes (current page); the selection bar opens `BulkEditDialog` — "Fields & Owner" (reassign only for `canManageTeam`) and "Change Status" (`StatusUpdateForm` in `bulk` mode, statuses mirrored from the backend's `BULK_STATUSES`) — and shows what was skipped and why. **Team → Agent:** every Agent picker that depends on a Team (lead form, import "Assign All To", the owner filter, bulk reassign, the status form's New Lead owner) lists only that team's employees via `useTeamAgents(teamId)` (`src/hooks/useTeamAgents.ts`, cached per team for a minute); changing or clearing the Team clears the Agent. **Existing customer:** the lead form's first card, `ExistingCustomerFields` — Yes shows the Company lookup and, filtered by it, the Contact (`SearchSelect`); picking them fills company name, contact person, email, phone, address and country (only where the account holds a value). Any non-marketing role may import (non-managers' imports are assigned to them, status `No Action`). Lead status labels use `LeadStatusBadge`; lead money uses `formatMoney` (always `$50,000` — tele-sales prices are USD only, there is no currency picker) / `LEAD_VALUE_SOURCES` from `teleSales.types.ts`; `proposalValue` is the Quoted Value (leads list "Proposal Price" column). The status form lives in `StatusUpdateForm` (used by the Change Status dialog and the lead page's **Quick Update tab**, placed before Status History). Given `history`, the tab opens each status on its last update (date + who). It shows that update's details (`StatusEntryDetails`, shared with the Status History tab), with the fields read-only until **Edit** is pressed. Editing the *current* status corrects its last update in place (`amendLast`, "Save Changes"), while moving to another status adds a new one. The Change Status dialog always adds a new update. The current status is listed first with a "Current" tag. `valuesFromHistory` turns stored history values ("a, b", "50,000 EGP", { link }) back into inputs. `src/config/leadStatusWorkflow.ts` mirrors the backend's workflow — change both.
- Email composer: every lead and ticket email goes through `components/tele-sales/GmailCompose.tsx`. Its **From** row comes from `useEmailSender(senderKind)` (`src/hooks/useEmailSender.ts`; `'sales'` = lead mail, the default, `'support'` = ticket mail; cached per user). When the employee's address is a company mailbox, From is a picker — the shared mailbox (default) or their own email — sent as `sendAs: 'shared' | 'personal'`; a reply to mail that reached their own mailbox defaults to it.

## Tele-sales dashboard (`/tele-sales`)

`pages/tele-sales/TeleSalesDashboard.tsx` reads `GET /leads/dashboard` (`teleSalesApi.getTeleSalesDashboard`, types `TeleSalesDashboardData` in `teleSales.types.ts`, state `redux/slices/teleSalesDashboardSlice.ts` — the last payload stays on screen, dimmed, while a new filter loads). Filters live in the URL: `period=<today|week|month|lastMonth|quarter|year>` (rolling, wins) or `from`/`to` (custom, Cairo days, max 366), plus `team` and `agent`; no period = this month. Presets, Sunday-start weeks and the ▲▼ comparison (`kpiDelta`: % of the previous value, win rate in points, neutral when previous is 0/null, lower is better for avg days to close, Closed Lost neutral) are in `lib/teleSalesDashboard.ts` (`KPI_DEFS` = card order). Sections are in `components/tele-sales/dashboard/` (filters, KPI grid, "Right now" snapshot with the amount explainer in an `InfoPopover`, funnel, sortable leaderboard — row click toggles the agent filter, 12-week recharts combo on the `--chart-*` tokens, action lists, pipeline by status). The team select shows for cross-team readers or multi-team users (options = `filters.teams` from the API); the agent select only when `filters.canFilterAgent` (options = `useTeamAgents(team)`, or the last unfiltered leaderboard). Changing the team clears the agent. `/leads/stats` is unchanged and still used by other pages.

## HR module (employee directory)

The employee directory lives at `/hr/employees` (old `/consultants`, `/consultants/create|edit|view` redirect).
**Export Excel / Export PDF** (header buttons) fetch every employee matching the current filters (`limit: 5000`) and write the table's columns via `src/utils/employeeExport.ts` (PDF through `preparePdfText` for Arabic). The confidential HR file is deliberately not exported.
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

## Marketing module

Sidebar group "Marketing" (`module: "marketing"`): `/marketing/csp` (`CustomerSurveys.tsx` — customer `SearchSelect`, summary, survey editor with star rating + comment rows and a "+" button to add rows; edit/delete for the author or `useAccess().canManageMarketing`), `/marketing/email-campaign` (`EmailCampaign.tsx` — Import dialog parsing xlsx/csv via `src/utils/campaignImport.ts`, contact list with status tabs, send-hour chips (one random contact per hour, default 10 AM–4 PM Cairo), the **Activate** / **Pause** button (managers/admins; Activate confirms and saves the form), row checkboxes + "Mark as already emailed" (sent rows show a check and cannot be selected or deleted), email preview), `/marketing/social-media` (coming soon). API: `src/api/marketingApi.ts`, types `src/types/marketing.types.ts`.

## My Home (employee landing page)

`/home` (`pages/home/MyHome.tsx`) is where every employee lands: `/` redirects employees there via `RootRouter`, and the ticket dashboard moved to `/dashboard`. `/profile` sends employees to `/home`, except `?view=tasks`; customers keep the old profile page. The header's "My Home" item and the sidebar `MY_HOME_LINK` point at it.

- **Data:** `GET /api/me/home` (`api/myHomeApi.ts`), stored in `redux/slices/myHomeSlice.ts`. Every toggle is applied optimistically in the thunk's `pending` and reverted in `rejected`, with an error toast.
- **Derived values:** badges, hero tiles, the week plan and filtered lists are all computed in `pages/home/selectors.ts` from the raw data, using `lib/myHome.ts`, which mirrors the backend's `myHomeRules.js`. Never store a count.
- **Existing endpoints it reuses:** ticket status (`ticketApi.updateTicketStatus`), email replies and read flags (ticket and lead email APIs), follow-ups (`teleSalesApi.updateFollowUp`), leave (`createEmployeeRequest`), and the profile edit (`authSlice.updateProfile`).
- **Styling:** `pages/home/myHome.css`. Tokens are scoped to `.mh`, with a `.dark .mh` variant; it uses the app font (Manrope) and spans the full content width like the other modules (no max-width).
- **Overlays:** `components/ui.tsx` `Overlay`, with focus trap, Esc and backdrop close, and focus return.

## Ticketing menu

Under Ticketing: Dashboard, Customers, **Services** (Tickets, Emails, Projects, Meetings), **Internal** (Internal Tickets, Internal Dashboard) and **R&D** (R&D Tickets, R&D Dashboard — `requiresRnd`), then Configuration. Internal and R&D are their own sub-groups (`INTERNAL_GROUP`, `RND_GROUP` in `app.constant.ts`), not part of Services.

## Proposal Builder (module `proposals`)

Sidebar group "Proposals": `/proposals` (`pages/proposals/ProposalsList.tsx` — list + "New proposal", which picks an Opportunity), `/proposals/:id` (`ProposalBuilder.tsx`), `/proposals/price-list` (`ProposalCatalogPage.tsx`, `useAccess().canManageProposals` = admin or sales manager). An Opportunity's lead page has a **Proposals** tab (`components/proposals/LeadProposalsTab.tsx`: versions, Create proposal, New version) and its form a **Proposal Details** card (`ProposalDetailsFields`: interests from `lib/proposalInterests.ts`, expected users, legal entities).

- **State:** `redux/slices/proposalBuilderSlice.ts` — the working copy; every edit reducer calls `touch` (dirty + `rev`), `saveProposal` sends the whole document and only clears `dirty` if nothing changed in flight. Autosave every 30 s, on tab change and when leaving the page. API: `api/proposalApi.ts`; types `types/proposal.types.ts`.
- **Pages:** `lib/proposalPages.ts` builds every PDF page as an HTML string (escape everything with `esc`) — SOW markup + placeholders, module/financial/terms tables, greedy packing with off-screen measuring, tables split into 18-row chunks with "(continued)". Styles: `pages/proposals/proposalDoc.css`, scoped to `.pp-doc`, fixed brand colours (not themed). Page art: `public/proposal-assets/pages/*.jpg`. Fonts Exo 2 + Open Sans (`index.html`).
- **Sections (layout):** `proposal.layout` is the PDF's order after the cover — every built-in section once (`LAYOUT_KEYS` in `lib/proposalLayout.ts`, mirrored by the backend's `normalizeLayout`) plus the rep's own `custom` sections (title + description, same markup as the SOW, max 20). The builder's **Sections** step (`SectionsTab`) shows/hides, moves and adds a section above/below any other; `buildPages` walks `effectiveLayout(p)` (older proposals without a layout follow their `pages` flags). Custom sections print on the plain branded page (`portfolio.jpg` art) with a two-line title sized to fit, and continue onto more pages.
- **Measuring:** the preview waits for the Open Sans / Exo 2 fonts before packing, and `.pc` carries the document font so the off-screen measurer matches the page — measure with another font and pages overflow.
- **Money:** `lib/proposalMath.ts` mirrors the backend's `utils/proposalMath.js` — change both. USD only.
- **PDF:** `utils/proposalPdf.ts` (html2canvas + jsPDF, US Letter 816×1056) from the same page strings as the preview; the builder calls `POST /proposals/:id/export` first (403 while a discount awaits approval).
- **Send by email:** the builder's **Send by email** (`components/proposals/SendProposalEmail.tsx`) asks for the recipients (the opportunity's contact, ticked by default, and/or the contacts of a customer company — the opportunity's linked `account` preselected, any company via `/leads/accounts`) and an email template (active email `MessageTemplate`s; the default pricing one is preselected; "No template" = blank), builds the PDF through the same export gate, uploads it (`/upload`) and opens `GmailCompose` for the opportunity with the PDF attached and the body filled by `POST /sales-assistant/prepare`. The mail is always sent through the opportunity (`leadId`), so it is saved in the opportunity's Emails tab whoever it is addressed to, and replies thread back there. A PDF over ~9.5 MB is redrawn in `compact` quality (`buildProposalPdf(..., 'compact')`) to fit the 10 MB attachment cap. After sending, a Draft/Approved proposal with complete milestones is marked **Sent**.
- **New proposal picker:** lists every Opportunity the caller may see, 50 at a time with **Load more** and a "Showing X of Y" count.
- **SOW paste zone:** `lib/proposalPaste.ts` (HTML table → TSV → image → text; images downscaled to 1400 px and uploaded). Images are behind auth, so `useProposalImages` fetches them as blobs → object URLs.

## Credentials Vault (module `vault`)

Sidebar group "Credentials Vault" (`VAULT_GROUP`): `/vault` (dashboard), `/vault/accounts`, `/vault/send`, `/vault/log`, `/vault/settings` (admin only). No role has `vault` by default; an admin ticks it per employee, and holding it makes the account privileged (`holdsPrivilegedModule`). Everyone with the module views, reveals/copies, sends and reads the log; creating/editing/deleting accounts, lookups and clients is `useAccess().isAdmin` only (the API answers 403 too). Clients are the ticketing Companies; employees come from `GET /vault/users`.

- **Passwords never enter Redux.** `useRevealedPassword` (`src/hooks`) holds a revealed password in component state, hides it after 30 s and on unmount; every reveal/copy goes through `POST /vault/entries/:id/reveal` (logged). Copy falls back to a toast when the clipboard is refused.
- **Form config:** `src/lib/vaultFields.ts` (`VAULT_FIELDS`, spec §4 in English) drives the create/edit form (`components/vault/VaultEntryFormDialog.tsx`) and the details modal: grouped by section, filtered by owner type with `fieldsFor`. Hidden fields are not sent; on edit a cleared ref/date goes as `null`, the password only when typed. The backend mirrors the required/owner rules — change both.
- **Department** = the company's real departments (`GET /vault/departments` → `vaultLookupsSlice.departments`, field source `'departments'` in `LookupSelect`), not a vault lookup; Settings shows them read-only with a link to `/departments` (Ticketing › Modules), like the read-only Employees panel.
- **Attachments:** the form's Attachments section (`components/vault/VaultAttachments.tsx` — `VaultAttachmentsEditor`, after Governance) uploads each picked/dropped file at once to `POST /vault/attachments` (per-file progress, remove; max 10 files, 10 MB, no executables — `attachmentProblem` in `lib/vault.ts` mirrors the server) and the save sends the full list as `attachments: [{ fileId }]`. Save waits for uploads; when an edit can't load the stored files, `attachments` is left out so nothing is removed. The list sends `attachmentCount` (paperclip chip on the card), the detail sends `attachments`; a card's Edit fetches the detail for them. The details modal's Download is an authed blob fetch (`downloadVaultAttachment` → `saveBlob`, logged as `download`) — never a plain link. Attachments are never emailed by Send.
- **State:** `vaultLookupsSlice` (lookups by type + clients + employees + departments, loaded by `useVaultSetup`), `vaultEntriesSlice` (Accounts page; filters live in the URL query), `vaultSendSlice` (send draft — `setSendDraftEntries` from a card's Send button — and the masked preview), `vaultReportsSlice` (send log + dashboard). API: `src/api/vaultApi.ts`; types `src/types/vault.types.ts`; helpers (password generator, due/age chips) `src/lib/vault.ts`.
- **UI:** shared pieces in `components/vault/VaultUi.tsx` (`Chip`, `MonoText` — technical values LTR monospace, `FieldWithHelp`, `VaultSelect`, two-step `ConfirmButton`, `MissingBox`). Every vault screen is wrapped in `VaultLayout` (title + sub-tabs).
