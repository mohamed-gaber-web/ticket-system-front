# Ticketing System - Mobile Build Task Plan

**Date:** March 25, 2026
**Strategy:** Keep existing React web app + Build React Native mobile app
**Approach:** Monorepo with shared code extraction

---

## IMPORTANT: You are NOT rebuilding the web. Your web app is done.

**What you're doing:**
1. Restructure into a monorepo
2. Extract shared code (types, API, Redux, utils) into a shared package
3. Build the React Native mobile app (Android + iOS)
4. Update web imports to use the shared package

---

## Phase 0: Monorepo Setup & Shared Code Extraction
**Duration:** 1 week (Week 1)
**Goal:** Working monorepo where web still runs + mobile shell boots

### Task 0.1: Initialize Monorepo Structure
- [ ] Create new root folder `ticketing-system/`
- [ ] Initialize root `package.json` with npm/yarn/pnpm workspaces
- [ ] Install Turborepo as dev dependency
- [ ] Create `turbo.json` with build/dev/lint pipelines
- [ ] Create `tsconfig.base.json` with shared compiler options
- [ ] Create `packages/` directory structure

### Task 0.2: Create Shared Package
- [ ] Create `packages/shared/package.json` (name: `@ticketing/shared`)
- [ ] Create `packages/shared/tsconfig.json` extending base config
- [ ] Create folder structure:
  ```
  packages/shared/
  ├── src/
  │   ├── types/        (19 files to copy)
  │   ├── api/          (21 files to copy)
  │   ├── redux/
  │   │   ├── slices/   (19 files to copy)
  │   │   ├── store.ts
  │   │   └── hooks.ts
  │   ├── utils/
  │   ├── constants/
  │   └── validation/   (new - Zod schemas)
  ├── index.ts          (barrel exports)
  └── package.json
  ```

### Task 0.3: Extract Types (copy from existing web)
- [ ] Copy `auth.types.ts` to shared
- [ ] Copy `ticket.ts` to shared
- [ ] Copy `customer.types.ts` to shared
- [ ] Copy `consultant.types.ts` to shared
- [ ] Copy `category.ts` to shared
- [ ] Copy `comment.types.ts` to shared
- [ ] Copy `attachment.types.ts` to shared
- [ ] Copy `assignment.types.ts` to shared
- [ ] Copy `notification.types.ts` to shared
- [ ] Copy `environment.types.ts` to shared
- [ ] Copy `feature.types.ts` to shared
- [ ] Copy `productType.types.ts` to shared
- [ ] Copy `serviceType.types.ts` to shared
- [ ] Copy `scope.types.ts` to shared
- [ ] Copy `erpType.types.ts` to shared
- [ ] Copy `versionNumber.types.ts` to shared
- [ ] Copy `department.types.ts` to shared
- [ ] Copy `team.types.ts` to shared
- [ ] Copy `teamMember.types.ts` to shared
- [ ] Create `types/index.ts` barrel export

### Task 0.4: Extract API Layer
- [ ] Copy `axiosConfig.ts` to shared (make base URL configurable for both platforms)
- [ ] Copy `authApi.ts` to shared
- [ ] Copy `ticketApi.ts` to shared
- [ ] Copy `customerApi.ts` to shared
- [ ] Copy `consultantApi.ts` to shared
- [ ] Copy `categoryApi.ts` to shared
- [ ] Copy `assignmentApi.ts` to shared
- [ ] Copy `commentApi.ts` to shared
- [ ] Copy `attachmentApi.ts` to shared
- [ ] Copy `teamApi.ts` to shared
- [ ] Copy `teamMemberApi.ts` to shared
- [ ] Copy `notificationApi.ts` to shared
- [ ] Copy `environmentApi.ts` to shared
- [ ] Copy `featureApi.ts` to shared
- [ ] Copy `productTypeApi.ts` to shared
- [ ] Copy `serviceTypeApi.ts` to shared
- [ ] Copy `scopeApi.ts` to shared
- [ ] Copy `erpTypeApi.ts` to shared
- [ ] Copy `versionNumberApi.ts` to shared
- [ ] Copy `departmentApi.ts` to shared
- [ ] Copy `emailApi.ts` to shared
- [ ] Update `axiosConfig.ts` to support both `localStorage` (web) and `AsyncStorage` (mobile) via dependency injection
- [ ] Create `api/index.ts` barrel export

### Task 0.5: Extract Redux Store & Slices
- [ ] Copy all 19 slices to `shared/src/redux/slices/`
- [ ] Copy `store.ts` to shared (configure for both platforms)
- [ ] Copy `hooks.ts` (`useAppDispatch`, `useAppSelector`) to shared
- [ ] Copy `useAuth.tsx` hook to shared
- [ ] Verify all slice imports point to shared types/api
- [ ] Create `redux/index.ts` barrel export

### Task 0.6: Extract Utils & Constants
- [ ] Copy `utils/reportExporter.ts` to shared (web-only utils stay in web)
- [ ] Copy any platform-agnostic utility functions
- [ ] Copy constants files
- [ ] Create `utils/index.ts` barrel export

### Task 0.7: Move Existing Web App into Monorepo
- [ ] Move current project to `packages/web/`
- [ ] Update `packages/web/package.json` to depend on `@ticketing/shared`
- [ ] Update ALL web imports to use `@ticketing/shared` instead of local paths:
  - [ ] Update imports in all 20 page directories
  - [ ] Update imports in all components
  - [ ] Update imports in route files
- [ ] Update `packages/web/vite.config.ts` for monorepo paths
- [ ] Update `packages/web/tsconfig.json` to extend base
- [ ] Test: Web app builds and runs correctly with shared package
- [ ] Test: All pages load without errors
- [ ] Test: Auth flow works (sign in, protected routes)
- [ ] Test: CRUD operations work on at least 3 modules

### Task 0.8: Initialize React Native Mobile App
- [ ] Run `npx create-expo-app packages/mobile --template blank-typescript`
- [ ] Configure `packages/mobile/package.json` to depend on `@ticketing/shared`
- [ ] Install core dependencies:
  - [ ] `@react-navigation/native` + `@react-navigation/native-stack` + `@react-navigation/bottom-tabs`
  - [ ] `react-native-screens` + `react-native-safe-area-context`
  - [ ] `@reduxjs/toolkit` + `react-redux`
  - [ ] `axios`
  - [ ] `@react-native-async-storage/async-storage`
  - [ ] `react-native-paper` (UI library)
  - [ ] `nativewind` + `tailwindcss` (styling)
  - [ ] `react-hook-form` + `zod` + `@hookform/resolvers`
  - [ ] `expo-secure-store` (secure token storage)
  - [ ] `expo-notifications` (push notifications)
  - [ ] `expo-document-picker` (file uploads)
  - [ ] `victory-native` (charts)
- [ ] Configure NativeWind/Tailwind for mobile
- [ ] Configure Metro bundler for monorepo (metro.config.js)
- [ ] Test: Mobile app boots on Android emulator
- [ ] Test: Mobile app boots on iOS simulator (if on Mac)

### Task 0.9: CI/CD Pipeline
- [ ] Create `.github/workflows/web.yml` for web deployment
- [ ] Create `.github/workflows/mobile.yml` for EAS Build
- [ ] Create `eas.json` in mobile package for Expo build profiles
- [ ] Configure environment variables for CI

### Task 0.10: Developer Experience
- [ ] Configure ESLint for monorepo (shared rules)
- [ ] Configure Prettier
- [ ] Setup Husky for pre-commit hooks
- [ ] Add root scripts: `dev:web`, `dev:mobile`, `build:web`, `build:mobile`, `lint`, `typecheck`
- [ ] Create `.env.example` files for both web and mobile

**Phase 0 Deliverable:** Monorepo running. Web works as before. Mobile shell boots with blank screen.

---

## Phase 1: Mobile Authentication & Core Layout
**Duration:** 2 weeks (Weeks 2-3)
**Goal:** Users can sign in, navigate, and see role-based menus on mobile

### Task 1.1: Mobile Auth - Storage Layer
- [ ] Create `mobile/src/services/tokenStorage.ts` using `expo-secure-store`
- [ ] Implement `getToken()`, `setToken()`, `removeToken()`
- [ ] Implement `getRefreshToken()`, `setRefreshToken()`, `removeRefreshToken()`
- [ ] Implement `getUserData()`, `setUserData()`, `removeUserData()`
- [ ] Connect storage to shared `axiosConfig.ts` via dependency injection

### Task 1.2: Mobile Auth - Sign In Screen
- [ ] Create `mobile/src/screens/auth/SignInScreen.tsx`
- [ ] Build form with React Hook Form: email, password, userType selector
- [ ] Connect to shared `authSlice.signin` thunk
- [ ] Handle loading state, error display
- [ ] Navigate to main app on success
- [ ] Style with NativeWind / React Native Paper
- [ ] Test: Sign in with valid credentials
- [ ] Test: Show error for invalid credentials

### Task 1.3: Mobile Auth - Sign Up Screen
- [ ] Create `mobile/src/screens/auth/SignUpScreen.tsx`
- [ ] Build form: name, email, password, confirm password, userType
- [ ] Add Zod validation schema (shared)
- [ ] Connect to shared `authSlice.signup` thunk
- [ ] Navigate to sign in on success
- [ ] Test: Registration flow end-to-end

### Task 1.4: Mobile Auth - Forgot/Reset Password
- [ ] Create `mobile/src/screens/auth/ForgotPasswordScreen.tsx`
- [ ] Create `mobile/src/screens/auth/ResetPasswordScreen.tsx` (deep link handling)
- [ ] Connect to shared auth API
- [ ] Test: Full password reset flow

### Task 1.5: Mobile Navigation - Auth Flow
- [ ] Create `mobile/src/navigation/AuthNavigator.tsx`
  - [ ] Sign In (default screen)
  - [ ] Sign Up
  - [ ] Forgot Password
  - [ ] Reset Password
- [ ] Create `mobile/src/navigation/RootNavigator.tsx`
  - [ ] If not authenticated → AuthNavigator
  - [ ] If authenticated → MainNavigator
- [ ] Implement auth state persistence (check token on app launch)
- [ ] Test: App opens to sign in if no token
- [ ] Test: App opens to main if valid token exists

### Task 1.6: Mobile Navigation - Main Layout
- [ ] Create `mobile/src/navigation/MainNavigator.tsx` with bottom tabs:
  - [ ] Dashboard tab (icon: home)
  - [ ] Tickets tab (icon: ticket)
  - [ ] More tab (icon: menu) → opens drawer/stack with remaining modules
- [ ] Create `mobile/src/navigation/DrawerNavigator.tsx` or stack for "More":
  - [ ] Customers
  - [ ] Consultants
  - [ ] Categories
  - [ ] SLA
  - [ ] Reports
  - [ ] Config modules (nested)
  - [ ] Settings/Profile
- [ ] Implement role-based tab/menu visibility:
  - [ ] Customer role: Tickets only + Profile
  - [ ] Consultant role: All tabs
  - [ ] Admin role: All tabs + admin sections
- [ ] Test: Customer sees limited menu
- [ ] Test: Consultant sees full menu

### Task 1.7: Mobile - Header Component
- [ ] Create `mobile/src/components/layout/AppHeader.tsx`
- [ ] Show screen title
- [ ] Notification bell icon with unread badge
- [ ] Profile avatar/menu button
- [ ] Style consistent across all screens

### Task 1.8: Mobile - Profile & Settings
- [ ] Create `mobile/src/screens/profile/ProfileScreen.tsx`
- [ ] Create `mobile/src/screens/profile/ChangePasswordScreen.tsx`
- [ ] Connect to shared auth API
- [ ] Test: View/edit profile
- [ ] Test: Change password

### Task 1.9: Mobile - Common UI Components
- [ ] Create `mobile/src/components/ui/LoadingSpinner.tsx`
- [ ] Create `mobile/src/components/ui/ErrorMessage.tsx`
- [ ] Create `mobile/src/components/ui/EmptyState.tsx`
- [ ] Create `mobile/src/components/ui/ConfirmDialog.tsx`
- [ ] Create `mobile/src/components/ui/SearchBar.tsx`
- [ ] Create `mobile/src/components/ui/StatusBadge.tsx`
- [ ] Create `mobile/src/components/ui/FloatingActionButton.tsx` (for create actions)
- [ ] Create `mobile/src/components/ui/PullToRefresh.tsx` wrapper
- [ ] Create `mobile/src/components/ui/FormInput.tsx` (reusable form field)
- [ ] Create `mobile/src/components/ui/FormSelect.tsx` (dropdown/picker)

**Phase 1 Deliverable:** Mobile app with working auth, navigation, and role-based menus.

---

## Phase 2: Mobile Core Business Modules
**Duration:** 3 weeks (Weeks 4-6)
**Goal:** Dashboard, Tickets, Customers, Consultants working on mobile

### Task 2.1: Mobile Dashboard
- [ ] Create `mobile/src/screens/dashboard/DashboardScreen.tsx`
- [ ] Build stat cards row (total tickets, open, resolved, SLA breaches)
- [ ] Implement simplified chart (ticket trend - Victory Native)
- [ ] Recent tickets list (last 5)
- [ ] Quick action buttons (create ticket, view all tickets)
- [ ] Pull-to-refresh
- [ ] Connect to shared Redux (dashboard data from ticket/customer slices)
- [ ] Test: Dashboard loads with real data
- [ ] Test: Pull-to-refresh updates data

### Task 2.2: Mobile Tickets - List Screen
- [ ] Create `mobile/src/screens/tickets/TicketListScreen.tsx`
- [ ] FlatList with ticket cards (ID, title, status, priority, date)
- [ ] Status color coding (new=blue, assigned=orange, in_progress=yellow, resolved=green, closed=gray)
- [ ] Filter chips: status, priority
- [ ] Search bar (by title, ticket ID)
- [ ] Pagination (infinite scroll with `onEndReached`)
- [ ] Pull-to-refresh
- [ ] FAB button → Create Ticket
- [ ] Connect to shared `ticketSlice`
- [ ] Test: List loads with pagination
- [ ] Test: Filters work
- [ ] Test: Search works

### Task 2.3: Mobile Tickets - Create Screen
- [ ] Create `mobile/src/screens/tickets/CreateTicketScreen.tsx`
- [ ] Form with React Hook Form:
  - [ ] Title (text input)
  - [ ] Description (multiline text)
  - [ ] Category (picker from shared categories)
  - [ ] Priority (picker: low, medium, high, critical)
  - [ ] Customer (picker - if consultant/admin role)
  - [ ] Environment (picker)
  - [ ] Feature (picker)
  - [ ] Product Type (picker)
  - [ ] Service Type (picker)
  - [ ] Scope (picker)
- [ ] Zod validation
- [ ] Submit → shared `ticketSlice.createTicket`
- [ ] Navigate back to list on success
- [ ] Toast notification on success/error
- [ ] Test: Create ticket with all fields
- [ ] Test: Validation errors show correctly

### Task 2.4: Mobile Tickets - Edit Screen
- [ ] Create `mobile/src/screens/tickets/EditTicketScreen.tsx`
- [ ] Pre-fill form with existing ticket data
- [ ] Same fields as create + status change capability
- [ ] Submit → shared `ticketSlice.updateTicket`
- [ ] Test: Edit and save ticket

### Task 2.5: Mobile Tickets - Detail Screen
- [ ] Create `mobile/src/screens/tickets/TicketDetailScreen.tsx`
- [ ] Ticket info card (title, description, status, priority, dates)
- [ ] Status timeline/history
- [ ] Assignment info
- [ ] Tab view or sections for:
  - [ ] Details (all ticket fields)
  - [ ] Comments (Task 3.1)
  - [ ] Attachments (Task 3.2)
  - [ ] Sub-tickets list
  - [ ] History/Status changes
- [ ] Action buttons: Edit, Assign, Change Status
- [ ] Connect to shared `ticketSlice.fetchTicketById`
- [ ] Test: All sections display correctly
- [ ] Test: Actions work (edit navigates, status change updates)

### Task 2.6: Mobile Tickets - Assign Dialog
- [ ] Create `mobile/src/components/tickets/AssignTicketSheet.tsx` (bottom sheet)
- [ ] Consultant picker (searchable list)
- [ ] Connect to shared `assignmentSlice`
- [ ] Test: Assign ticket to consultant

### Task 2.7: Mobile Customers - List Screen
- [ ] Create `mobile/src/screens/customers/CustomerListScreen.tsx`
- [ ] FlatList with customer cards (name, email, status, ERP type)
- [ ] Search bar
- [ ] Pull-to-refresh + pagination
- [ ] FAB → Create Customer (visible only for consultant/admin)
- [ ] Connect to shared `customerSlice`
- [ ] Test: List loads, search works

### Task 2.8: Mobile Customers - Create/Edit Screens
- [ ] Create `mobile/src/screens/customers/CreateCustomerScreen.tsx`
- [ ] Create `mobile/src/screens/customers/EditCustomerScreen.tsx`
- [ ] Form: name, email, phone, company, ERP type, version, status
- [ ] Zod validation
- [ ] Connect to shared `customerSlice`
- [ ] Test: Create and edit customer

### Task 2.9: Mobile Customers - Detail Screen
- [ ] Create `mobile/src/screens/customers/CustomerDetailScreen.tsx`
- [ ] Customer info display
- [ ] Assigned consultants list
- [ ] Customer's tickets list
- [ ] Action: Assign consultant (bottom sheet)
- [ ] Test: Detail view with all sections

### Task 2.10: Mobile Consultants - List Screen
- [ ] Create `mobile/src/screens/consultants/ConsultantListScreen.tsx`
- [ ] FlatList with consultant cards (name, role, status, assignment count)
- [ ] Role filter chips (consultant, senior, admin)
- [ ] Search bar
- [ ] Connect to shared `consultantSlice`
- [ ] Test: List loads with filters

### Task 2.11: Mobile Consultants - Create/Edit Screens
- [ ] Create `mobile/src/screens/consultants/CreateConsultantScreen.tsx`
- [ ] Create `mobile/src/screens/consultants/EditConsultantScreen.tsx`
- [ ] Form: name, email, role, department, status
- [ ] Connect to shared `consultantSlice`
- [ ] Test: Create and edit consultant

### Task 2.12: Mobile Consultants - Dashboard Screen
- [ ] Create `mobile/src/screens/consultants/ConsultantDashboardScreen.tsx`
- [ ] Active assignments count
- [ ] Ticket summary by status
- [ ] Recent activity list
- [ ] Test: Dashboard shows correct data

**Phase 2 Deliverable:** Core business modules working on mobile with full CRUD.

---

## Phase 3: Mobile Supporting Modules
**Duration:** 2 weeks (Weeks 7-8)
**Goal:** Comments, attachments, notifications, categories, SLA on mobile

### Task 3.1: Mobile Comments System
- [ ] Create `mobile/src/components/tickets/CommentList.tsx`
- [ ] Create `mobile/src/components/tickets/CommentItem.tsx`
- [ ] Create `mobile/src/components/tickets/AddCommentInput.tsx`
- [ ] Support public vs internal comments (toggle)
- [ ] Display: author, date, content, type badge
- [ ] Add comment with keyboard-aware input
- [ ] Connect to shared `commentSlice`
- [ ] Test: View comments on ticket
- [ ] Test: Add public comment
- [ ] Test: Add internal comment (consultant only)

### Task 3.2: Mobile File Attachments
- [ ] Create `mobile/src/components/tickets/AttachmentList.tsx`
- [ ] Create `mobile/src/components/tickets/AttachmentItem.tsx`
- [ ] Upload: use `expo-document-picker` to select files
- [ ] Download: use `expo-file-system` to save/open files
- [ ] Display: file name, size, type icon, upload date
- [ ] Connect to shared `attachmentSlice`
- [ ] Test: Upload a file to ticket
- [ ] Test: Download/view an attachment

### Task 3.3: Mobile Categories Module
- [ ] Create `mobile/src/screens/categories/CategoryListScreen.tsx`
- [ ] Create `mobile/src/screens/categories/CategoryFormScreen.tsx` (create + edit)
- [ ] Simple list with swipe-to-delete or long-press menu
- [ ] Connect to shared `categorySlice`
- [ ] Test: CRUD operations

### Task 3.4: Mobile Notifications
- [ ] Create `mobile/src/screens/notifications/NotificationListScreen.tsx`
- [ ] Create `mobile/src/components/notifications/NotificationItem.tsx`
- [ ] FlatList with notification items (type icon, message, date, read/unread)
- [ ] Mark as read on tap
- [ ] Mark all as read button
- [ ] Navigate to related ticket/entity on tap
- [ ] Update unread badge in header
- [ ] Connect to shared `notificationSlice`
- [ ] Test: View notifications
- [ ] Test: Mark as read
- [ ] Test: Navigate to ticket from notification

### Task 3.5: Mobile Push Notifications (Firebase)
- [ ] Configure Firebase project (console.firebase.google.com)
- [ ] Add `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)
- [ ] Configure `expo-notifications` in `app.json`
- [ ] Create `mobile/src/services/pushNotifications.ts`
  - [ ] Request permission
  - [ ] Get FCM token
  - [ ] Send token to backend API
  - [ ] Handle foreground notifications
  - [ ] Handle background notifications
  - [ ] Handle notification tap → navigate to relevant screen
- [ ] Test: Receive push notification on Android
- [ ] Test: Receive push notification on iOS
- [ ] Test: Tapping notification opens correct screen

### Task 3.6: Mobile SLA Module
- [ ] Create `mobile/src/screens/sla/SLAListScreen.tsx`
- [ ] Create `mobile/src/screens/sla/SLAFormScreen.tsx` (create + edit)
- [ ] Create `mobile/src/screens/sla/SLAMonitoringScreen.tsx`
  - [ ] Cards showing SLA status (on track, at risk, breached)
  - [ ] Color coded indicators
  - [ ] Simplified view compared to web
- [ ] Connect to shared SLA slice/API
- [ ] Test: View SLA list
- [ ] Test: Create/edit SLA
- [ ] Test: Monitoring screen shows correct statuses

**Phase 3 Deliverable:** Full ticket workflow on mobile with comments, files, notifications, SLA.

---

## Phase 4: Mobile Configuration Modules
**Duration:** 1 week (Week 9)
**Goal:** All 8 config CRUD modules on mobile

### Task 4.1: Create Reusable Config Module Template
- [ ] Create `mobile/src/components/config/ConfigListScreen.tsx` (generic)
  - [ ] Props: title, data, columns, onEdit, onDelete, onCreate
  - [ ] FlatList with items
  - [ ] Search bar
  - [ ] FAB for create
  - [ ] Swipe actions (edit, delete)
- [ ] Create `mobile/src/components/config/ConfigFormDialog.tsx` (generic)
  - [ ] Bottom sheet with form
  - [ ] Props: fields config, onSubmit, initialValues
- [ ] Test: Template works with mock data

### Task 4.2: Environments Module
- [ ] Create `mobile/src/screens/config/EnvironmentsScreen.tsx` using template
- [ ] Connect to shared `environmentSlice`
- [ ] Test: CRUD works

### Task 4.3: Features Module
- [ ] Create `mobile/src/screens/config/FeaturesScreen.tsx` using template
- [ ] Connect to shared `featureSlice`
- [ ] Test: CRUD works

### Task 4.4: Product Types Module
- [ ] Create `mobile/src/screens/config/ProductTypesScreen.tsx` using template
- [ ] Connect to shared `productTypeSlice`
- [ ] Test: CRUD works

### Task 4.5: Service Types Module
- [ ] Create `mobile/src/screens/config/ServiceTypesScreen.tsx` using template
- [ ] Connect to shared `serviceTypeSlice`
- [ ] Test: CRUD works

### Task 4.6: Scopes Module
- [ ] Create `mobile/src/screens/config/ScopesScreen.tsx` using template
- [ ] Connect to shared `scopeSlice`
- [ ] Test: CRUD works

### Task 4.7: ERP Types Module
- [ ] Create `mobile/src/screens/config/ErpTypesScreen.tsx` using template
- [ ] Connect to shared `erpTypeSlice`
- [ ] Test: CRUD works

### Task 4.8: Version Numbers Module
- [ ] Create `mobile/src/screens/config/VersionNumbersScreen.tsx` using template
- [ ] Connect to shared `versionNumberSlice`
- [ ] Test: CRUD works

### Task 4.9: Departments Module
- [ ] Create `mobile/src/screens/config/DepartmentsScreen.tsx` using template
- [ ] Connect to shared `departmentSlice`
- [ ] Test: CRUD works

**Phase 4 Deliverable:** All 8 configuration modules working on mobile.

---

## Phase 5: Mobile Reports & Analytics
**Duration:** 1.5 weeks (Weeks 10-11)
**Goal:** Simplified reports on mobile

### Task 5.1: Mobile Reports Dashboard
- [ ] Create `mobile/src/screens/reports/ReportsDashboardScreen.tsx`
- [ ] Summary cards: total tickets, avg resolution time, SLA compliance %, top categories
- [ ] Navigation to detailed reports
- [ ] Test: Dashboard loads with real data

### Task 5.2: Mobile Ticket Reports
- [ ] Create `mobile/src/screens/reports/TicketReportsScreen.tsx`
- [ ] Ticket count by status (Victory Native pie/bar chart)
- [ ] Ticket trend over time (line chart)
- [ ] Filter by date range
- [ ] Connect to shared report API
- [ ] Test: Charts render with real data

### Task 5.3: Mobile Team Performance
- [ ] Create `mobile/src/screens/reports/TeamPerformanceScreen.tsx`
- [ ] Consultant ranking list (tickets resolved, avg time)
- [ ] Simple bar chart comparison
- [ ] Test: Performance data displays correctly

### Task 5.4: Mobile Customer Reports
- [ ] Create `mobile/src/screens/reports/CustomerReportsScreen.tsx`
- [ ] Customer ticket count summary
- [ ] Satisfaction metrics (if available)
- [ ] Test: Customer report data loads

### Task 5.5: Mobile Consultant Reports
- [ ] Create `mobile/src/screens/reports/ConsultantReportScreen.tsx`
- [ ] Assignment analytics
- [ ] Role distribution chart
- [ ] Workload overview
- [ ] Test: Consultant report data loads

### Task 5.6: Mobile Export (Share)
- [ ] Implement "Share as PDF" using `expo-print` + `expo-sharing`
- [ ] Generate simple PDF report from current screen data
- [ ] Share via native share sheet (WhatsApp, email, etc.)
- [ ] Test: Export and share a report

**Phase 5 Deliverable:** Reports available on mobile with charts and export/share capability.

---

## Phase 6: Polish, Testing & Quality
**Duration:** 1.5 weeks (Weeks 11.5-13)
**Goal:** Production-quality mobile app

### Task 6.1: Error Handling & Edge Cases
- [ ] Implement global error boundary for mobile app
- [ ] Add retry logic for failed API calls
- [ ] Handle no internet connection (show offline banner)
- [ ] Handle token expiry gracefully (redirect to login)
- [ ] Empty state screens for all lists
- [ ] Test: App handles network errors gracefully
- [ ] Test: App handles 401/403 correctly

### Task 6.2: Loading States & Skeleton Screens
- [ ] Create skeleton loader components for:
  - [ ] List items
  - [ ] Detail screens
  - [ ] Dashboard cards
- [ ] Add pull-to-refresh on all list screens
- [ ] Add loading indicators on all form submissions

### Task 6.3: Dark Mode / Theming
- [ ] Configure React Native Paper theme (light + dark)
- [ ] Match color palette with web app
- [ ] System theme detection (auto switch)
- [ ] Manual theme toggle in settings
- [ ] Test: All screens look correct in dark mode

### Task 6.4: Performance Optimization
- [ ] Add `React.memo` to list item components
- [ ] Optimize FlatList with `getItemLayout`, `removeClippedSubviews`
- [ ] Lazy load screens with `React.lazy` or navigation lazy loading
- [ ] Image optimization (if any)
- [ ] Profile and fix any slow screens (React DevTools)

### Task 6.5: Offline Support (Basic)
- [ ] Cache last loaded data using AsyncStorage
- [ ] Show cached data when offline
- [ ] Queue actions when offline, sync when back online (optional)
- [ ] Test: App shows cached data without internet

### Task 6.6: Security Review
- [ ] Verify tokens stored in `expo-secure-store` (not AsyncStorage)
- [ ] Verify no sensitive data in Redux state persisted to disk
- [ ] Verify API calls use HTTPS
- [ ] Verify deep links are validated
- [ ] Review all text inputs for injection risks

### Task 6.7: Testing
- [ ] Setup Jest + React Native Testing Library
- [ ] Unit tests for shared utils/helpers
- [ ] Unit tests for Redux slices (at least auth, ticket, customer)
- [ ] Component tests for critical screens (sign in, ticket list, ticket detail)
- [ ] Integration test: Full auth flow
- [ ] Integration test: Create ticket flow
- [ ] Manual testing on Android device
- [ ] Manual testing on iOS device (if available)

### Task 6.8: Accessibility
- [ ] Add `accessibilityLabel` to all interactive elements
- [ ] Ensure proper focus order
- [ ] Test with TalkBack (Android) / VoiceOver (iOS)
- [ ] Ensure color contrast meets WCAG standards

**Phase 6 Deliverable:** Polished, tested, accessible mobile app.

---

## Phase 7: Deployment & Launch
**Duration:** 1 week (Week 14)
**Goal:** Apps live on App Store and Play Store

### Task 7.1: App Store Assets Preparation
- [ ] Design app icon (1024x1024)
- [ ] Create splash screen
- [ ] Take screenshots for both platforms:
  - [ ] Phone screenshots (5-8 screens)
  - [ ] Tablet screenshots (if supporting tablets)
- [ ] Write app title, subtitle, description
- [ ] Create privacy policy URL
- [ ] Create terms of service URL

### Task 7.2: Android Build & Play Store
- [ ] Configure `eas.json` production profile
- [ ] Generate signing key (keystore)
- [ ] Run EAS Build for Android (`eas build --platform android`)
- [ ] Create Google Play Console developer account ($25 one-time)
- [ ] Create app listing in Play Console
- [ ] Upload AAB file
- [ ] Fill in content rating questionnaire
- [ ] Set up pricing (free)
- [ ] Submit for review
- [ ] Test: Download from Play Store (after approval)

### Task 7.3: iOS Build & App Store
- [ ] Apple Developer Program membership ($99/year)
- [ ] Configure App Store Connect
- [ ] Create app ID and provisioning profiles
- [ ] Run EAS Build for iOS (`eas build --platform ios`)
- [ ] Create app listing in App Store Connect
- [ ] Upload IPA via EAS Submit (`eas submit --platform ios`)
- [ ] Fill in app review information
- [ ] Submit for review
- [ ] Test: Download from TestFlight first, then App Store

### Task 7.4: Web Deployment Update
- [ ] Deploy updated web app (monorepo version) to Vercel/Railway
- [ ] Verify web app works correctly after monorepo migration
- [ ] Update environment variables in production
- [ ] Test: Web app works in production

### Task 7.5: Post-Launch
- [ ] Monitor crash reports (Expo/Sentry)
- [ ] Set up Sentry for error tracking (both web and mobile)
- [ ] Monitor API performance
- [ ] Gather initial user feedback
- [ ] Create plan for first patch release

**Phase 7 Deliverable:** Apps live on both stores + web updated.

---

## Timeline Summary (Revised - Mobile Only Build)

| Phase | Description | Duration | Weeks | Status |
|-------|------------|----------|-------|--------|
| **Phase 0** | Monorepo Setup & Shared Extraction | 1 week | Week 1 | Not Started |
| **Phase 1** | Mobile Auth & Core Layout | 2 weeks | Weeks 2-3 | Not Started |
| **Phase 2** | Mobile Core Modules (Dashboard, Tickets, Customers, Consultants) | 3 weeks | Weeks 4-6 | Not Started |
| **Phase 3** | Mobile Supporting Modules (Comments, Attachments, Notifications, SLA) | 2 weeks | Weeks 7-8 | Not Started |
| **Phase 4** | Mobile Config Modules (8 CRUD modules) | 1 week | Week 9 | Not Started |
| **Phase 5** | Mobile Reports & Analytics | 1.5 weeks | Weeks 10-11 | Not Started |
| **Phase 6** | Polish, Testing & Quality | 1.5 weeks | Weeks 11.5-13 | Not Started |
| **Phase 7** | Deployment & Launch | 1 week | Week 14 | Not Started |

### Total: ~14 weeks (~3.5 months) for 1 developer

| Team Size | Duration |
|-----------|----------|
| 1 developer | 14 weeks |
| 2 developers (1 shared/web + 1 mobile) | 9 weeks (~2 months) |

---

## Total Task Count Summary

| Phase | Tasks | Subtasks (checkboxes) |
|-------|-------|-----------------------|
| Phase 0: Setup | 10 main tasks | ~75 subtasks |
| Phase 1: Auth & Layout | 9 main tasks | ~55 subtasks |
| Phase 2: Core Modules | 12 main tasks | ~65 subtasks |
| Phase 3: Supporting | 6 main tasks | ~45 subtasks |
| Phase 4: Config Modules | 9 main tasks | ~25 subtasks |
| Phase 5: Reports | 6 main tasks | ~25 subtasks |
| Phase 6: Polish & QA | 8 main tasks | ~40 subtasks |
| Phase 7: Deploy | 5 main tasks | ~30 subtasks |
| **TOTAL** | **65 main tasks** | **~360 subtasks** |

---

## How to Add a New Module in the Future

When the project grows and you need to add a new module (e.g., "Invoices"):

### Step 1: Shared Layer (write once, ~2 hours)
```
packages/shared/src/types/invoice.types.ts      → Define interfaces
packages/shared/src/api/invoiceApi.ts            → API endpoints
packages/shared/src/redux/slices/invoiceSlice.ts → Redux slice
packages/shared/src/validation/invoice.schema.ts → Zod validation
```

### Step 2: Web Page (~3-4 hours)
```
packages/web/src/pages/invoices/invoices.tsx       → List page
packages/web/src/pages/invoices/createInvoice.tsx  → Create form
packages/web/src/pages/invoices/editInvoice.tsx    → Edit form
packages/web/src/pages/invoices/viewInvoice.tsx    → Detail view
```

### Step 3: Mobile Screen (~3-4 hours)
```
packages/mobile/src/screens/invoices/InvoiceListScreen.tsx
packages/mobile/src/screens/invoices/InvoiceFormScreen.tsx
packages/mobile/src/screens/invoices/InvoiceDetailScreen.tsx
```

### Step 4: Update navigation (both platforms, ~30 min)
- Add route in web router
- Add screen in mobile navigator
- Add menu item in sidebar/drawer

**Total per new module: ~1 day**

---

*Last updated: March 25, 2026*
