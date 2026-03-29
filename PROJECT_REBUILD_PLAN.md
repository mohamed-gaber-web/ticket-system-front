# Ticketing System - Full Rebuild Plan (Web + Mobile)

**Date:** March 18, 2026
**Project:** Ticketing System (Backend/API already exists)
**Goal:** Rebuild the frontend for Web, Android, and iOS from scratch with a scalable architecture

---

## 1. Current Project Analysis

### Existing Modules (19+ modules)
| # | Module | Features |
|---|--------|----------|
| 1 | **Authentication** | Sign in, Sign up, Forgot/Reset Password, Profile, Change Password, Unauthorized page |
| 2 | **Dashboard** | Analytics, Stats cards, Charts (Recharts) |
| 3 | **Tickets** | CRUD, Sub-tickets, Status lifecycle (new > assigned > in_progress > resolved > closed), Filters, Pagination |
| 4 | **Customers** | CRUD, Customer-consultant assignment, Status management |
| 5 | **Consultants** | CRUD, Consultant dashboard, Role-based (consultant/senior/admin) |
| 6 | **Categories** | CRUD for ticket categories |
| 7 | **SLA** | CRUD, SLA Monitoring/Tracking, Breach alerts |
| 8 | **Reports** | Ticket reports, Team performance, Customer satisfaction, Export (PDF/Excel/CSV) |
| 9 | **Consultant Reports** | Dashboard, List report, Detail report, Assignment analytics, Charts |
| 10 | **Comments** | Public/Internal comments on tickets |
| 11 | **Attachments** | File upload/download on tickets |
| 12 | **Notifications** | Real-time notifications, Unread count, Multiple notification types |
| 13 | **Environments** | CRUD configuration module |
| 14 | **Features** | CRUD configuration module |
| 15 | **Product Types** | CRUD configuration module |
| 16 | **Service Types** | CRUD configuration module |
| 17 | **Scopes** | CRUD configuration module |
| 18 | **ERP Types** | CRUD configuration module |
| 19 | **Version Numbers** | CRUD configuration module |
| 20 | **Departments** | CRUD configuration module |
| 21 | **Teams** | CRUD (currently hidden/inactive) |
| 22 | **Team Members** | CRUD + Dashboard (currently hidden/inactive) |

### User Roles & Access Control
- **Customer** - Limited access (Tickets only)
- **Consultant** - Full access (Dashboard, Customers, Tickets, Consultants, Config Modules, SLA, Reports)
- **Team Member** - Configurable access
- **Admin** - Full system access

### API Integration
- RESTful API (22 endpoints)
- JWT + Refresh Token authentication
- Backend hosted on Railway (production ready)

---

## 2. Technology Recommendation

### Option A: React Native (RECOMMENDED)

| Layer | Technology | Why |
|-------|-----------|-----|
| **Web** | React + TypeScript + Vite | Same as current - mature, fast, large ecosystem |
| **Mobile** | React Native + TypeScript | Share 70-80% code with web, single codebase for iOS & Android |
| **Shared Code** | Monorepo (Turborepo/Nx) | Share types, API layer, business logic, state management |
| **UI (Web)** | Shadcn/UI + Tailwind CSS | Modern, customizable, accessible |
| **UI (Mobile)** | React Native Paper / NativeWind | Tailwind-like styling for React Native |
| **State Management** | Redux Toolkit (RTK Query) | Already familiar, RTK Query replaces manual API layer |
| **Navigation (Mobile)** | React Navigation v7 | Industry standard for React Native |
| **Routing (Web)** | React Router v7 | Already in use |
| **Forms** | React Hook Form + Zod | Type-safe validation, works on both platforms |
| **Push Notifications** | Firebase Cloud Messaging | Free, supports iOS & Android |
| **File Handling** | react-native-document-picker | File uploads on mobile |
| **Charts** | Victory Native (mobile) + Recharts (web) | Cross-platform charting |
| **Build (Mobile)** | EAS Build (Expo) | Cloud builds for iOS & Android |

**Why React Native?**
- Your team already knows React + TypeScript (shortest learning curve)
- Share 70-80% of business logic, types, API code between web and mobile
- Single language (TypeScript) for everything
- Large community and ecosystem
- Hot reload for fast development
- Expo simplifies build/deploy process

### Option B: Flutter (Alternative)

| Layer | Technology |
|-------|-----------|
| **Web + Mobile** | Flutter + Dart |
| **State Management** | Riverpod or BLoC |
| **UI** | Material Design 3 |

**Pros:** True single codebase for web + iOS + Android, excellent performance
**Cons:** New language (Dart), cannot reuse existing React/TypeScript code, smaller ecosystem for web

### Option C: Separate Native Apps (Most Expensive)

| Platform | Technology |
|----------|-----------|
| **Web** | React + TypeScript |
| **iOS** | Swift + SwiftUI |
| **Android** | Kotlin + Jetpack Compose |

**Pros:** Best native performance and UX
**Cons:** 3x development cost, 3 separate codebases, need 3 different skill sets

---

### Final Recommendation: Option A (React Native + React Web in Monorepo)

**Reasoning:**
1. Your backend API is ready - all you need is the frontend
2. Your existing codebase is React + TypeScript - maximum code reuse
3. Monorepo allows sharing types, API layer, and business logic
4. Single team can maintain web + mobile
5. Project will grow (more modules) - shared code means adding features once, not 3 times
6. Cost-effective for a ticketing system (not a graphics-heavy app)

---

## 3. Recommended Project Architecture (Monorepo)

```
ticketing-system/
├── packages/
│   ├── shared/                    # Shared across web & mobile
│   │   ├── types/                 # TypeScript interfaces (reuse existing 19 type files)
│   │   ├── api/                   # API layer with RTK Query (reuse existing 22 API files)
│   │   ├── redux/                 # Redux store, slices (reuse existing 19 slices)
│   │   ├── utils/                 # Shared utilities
│   │   ├── constants/             # Shared constants
│   │   └── validation/            # Zod schemas for form validation
│   │
│   ├── web/                       # React Web Application
│   │   ├── src/
│   │   │   ├── components/        # Web-specific UI components (Shadcn/UI)
│   │   │   ├── pages/             # Web pages
│   │   │   ├── routes/            # Web routing
│   │   │   └── styles/            # Tailwind CSS
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── mobile/                    # React Native Application
│       ├── src/
│       │   ├── components/        # Mobile-specific UI components
│       │   ├── screens/           # Mobile screens
│       │   ├── navigation/        # React Navigation config
│       │   └── styles/            # NativeWind / StyleSheet
│       ├── app.json
│       └── package.json
│
├── turbo.json                     # Turborepo configuration
├── package.json                   # Root package.json
└── tsconfig.base.json             # Shared TypeScript config
```

---

## 4. Execution Plan & Timeline

### Phase 0: Project Setup (Week 1)
| Task | Duration | Details |
|------|----------|---------|
| Monorepo setup (Turborepo) | 2 days | Configure workspaces, shared packages, build pipeline |
| Shared package setup | 1 day | Extract types, API layer, Redux store to shared package |
| CI/CD pipeline | 1 day | GitHub Actions for web deploy + EAS Build for mobile |
| Development environment | 1 day | ESLint, Prettier, Husky, path aliases, environment configs |

**Deliverable:** Working monorepo with shared package, web shell, and mobile shell

---

### Phase 1: Authentication & Core Layout (Weeks 2-3)
| Task | Platform | Duration |
|------|----------|----------|
| Auth flow (Sign in, Sign up, Forgot/Reset Password) | Shared + Web | 3 days |
| Auth flow mobile UI | Mobile | 2 days |
| JWT + Refresh token management | Shared | 1 day |
| Protected routes / navigation guards | Web + Mobile | 1 day |
| Main layout (Sidebar, Header, Theme) | Web | 2 days |
| Main layout (Bottom tabs, Drawer, Header) | Mobile | 2 days |
| Profile & Change Password | Web + Mobile | 1 day |
| Role-based access control | Shared | 1 day |

**Deliverable:** Users can sign in/up, navigate the app, and see role-based menus on both platforms

---

### Phase 2: Core Business Modules (Weeks 4-7)
| Task | Platform | Duration |
|------|----------|----------|
| **Dashboard** | | |
| - Stats cards, charts, analytics | Web | 3 days |
| - Mobile dashboard (simplified charts) | Mobile | 2 days |
| **Tickets Module** | | |
| - Ticket list with filters, search, pagination | Web | 3 days |
| - Create/Edit ticket forms | Web | 2 days |
| - View ticket detail (comments, attachments, history) | Web | 3 days |
| - Sub-tickets support | Web | 1 day |
| - Mobile ticket screens | Mobile | 4 days |
| **Customers Module** | | |
| - Customer list, CRUD, assignment | Web | 3 days |
| - Mobile customer screens | Mobile | 2 days |
| **Consultants Module** | | |
| - Consultant list, CRUD, dashboard | Web | 2 days |
| - Mobile consultant screens | Mobile | 1 day |

**Deliverable:** Core business modules working on both platforms

---

### Phase 3: Supporting Modules (Weeks 8-9)
| Task | Platform | Duration |
|------|----------|----------|
| **Comments System** | Web + Mobile | 2 days |
| **File Attachments** | Web + Mobile | 2 days |
| **Categories Module** | Web + Mobile | 1 day |
| **Notifications** | | |
| - Notification dropdown (web) | Web | 1 day |
| - Push notifications setup (Firebase) | Mobile | 2 days |
| - Notification list screen | Mobile | 1 day |
| **SLA Module** | | |
| - SLA CRUD + Monitoring page | Web | 2 days |
| - SLA summary on mobile | Mobile | 1 day |

**Deliverable:** Full ticket workflow with comments, attachments, notifications, and SLA

---

### Phase 4: Configuration Modules (Week 10)
| Task | Platform | Duration |
|------|----------|---------|
| 8 config modules (Environments, Features, Product Types, Service Types, Scopes, ERP Types, Version Numbers, Departments) | Web | 3 days |
| Config modules on mobile (simplified list + form dialogs) | Mobile | 2 days |

> These are all simple CRUD modules with the same pattern - build one reusable template, replicate for all 8.

**Deliverable:** All configuration modules working

---

### Phase 5: Reports & Analytics (Weeks 11-12)
| Task | Platform | Duration |
|------|----------|---------|
| Ticket reports with charts | Web | 2 days |
| Team performance reports | Web | 2 days |
| Customer satisfaction reports | Web | 1 day |
| Consultant reports (dashboard, list, detail, analytics) | Web | 3 days |
| Export functionality (PDF, Excel, CSV) | Web | 1 day |
| Mobile reports (simplified views) | Mobile | 2 days |

**Deliverable:** Full reporting suite on web, summary reports on mobile

---

### Phase 6: Polish & Quality (Weeks 13-14)
| Task | Platform | Duration |
|------|----------|---------|
| Responsive design testing (all screen sizes) | Web | 2 days |
| Dark mode / theming | Web + Mobile | 1 day |
| Error handling & loading states | Shared | 1 day |
| Offline support / caching (mobile) | Mobile | 2 days |
| Performance optimization | Web + Mobile | 1 day |
| Accessibility (a11y) | Web | 1 day |
| Security review (XSS, injection, token handling) | Shared | 1 day |
| End-to-end testing | Web + Mobile | 2 days |

**Deliverable:** Production-quality application

---

### Phase 7: Deployment & Launch (Week 15)
| Task | Duration |
|------|----------|
| Web deployment (Vercel/Netlify/Railway) | 1 day |
| iOS build & App Store submission | 2 days |
| Android build & Play Store submission | 1 day |
| Documentation & handoff | 1 day |

**Deliverable:** Live applications on Web, App Store, and Play Store

---

## 5. Timeline Summary

| Phase | Duration | Cumulative |
|-------|----------|-----------|
| Phase 0: Project Setup | 1 week | Week 1 |
| Phase 1: Auth & Layout | 2 weeks | Week 3 |
| Phase 2: Core Modules | 4 weeks | Week 7 |
| Phase 3: Supporting Modules | 2 weeks | Week 9 |
| Phase 4: Config Modules | 1 week | Week 10 |
| Phase 5: Reports | 2 weeks | Week 12 |
| Phase 6: Polish & QA | 2 weeks | Week 14 |
| Phase 7: Deploy & Launch | 1 week | Week 15 |

### Total Estimated Duration: 15 weeks (~3.5 months)

> **With 1 full-stack developer:** 15 weeks
> **With 2 developers (1 web + 1 mobile):** 10 weeks (~2.5 months)
> **With 3 developers (1 web + 1 mobile + 1 shared/QA):** 8 weeks (~2 months)

---

## 6. Key Considerations for Scalability

Since you mentioned the project will grow with more modules:

1. **Monorepo structure** - Adding a new module means:
   - Add types to `shared/types/` (once)
   - Add API to `shared/api/` (once)
   - Add Redux slice to `shared/redux/` (once)
   - Add web page in `web/pages/`
   - Add mobile screen in `mobile/screens/`

2. **RTK Query** - Replace manual API calls + Redux slices with RTK Query for:
   - Automatic caching
   - Automatic refetching
   - Optimistic updates
   - Less boilerplate (no separate slice per module)

3. **Code generators** - Create templates/scaffolding for:
   - New CRUD modules (most config modules are identical patterns)
   - New form dialogs
   - New list/table views

4. **Feature flags** - Use environment variables or a feature flag service to:
   - Toggle modules on/off per deployment
   - Roll out new features gradually

5. **Micro-frontend ready** - The monorepo structure allows splitting into micro-frontends later if the app grows significantly

---

## 7. Technology Stack Summary

```
┌─────────────────────────────────────────────┐
│                 SHARED LAYER                 │
│  TypeScript Types | RTK Query | Redux Store  │
│  Zod Validation | Utils | Constants          │
├──────────────────────┬──────────────────────┤
│      WEB APP         │     MOBILE APP        │
│                      │                       │
│  React 19            │  React Native (Expo)  │
│  Vite                │  EAS Build            │
│  React Router v7     │  React Navigation v7  │
│  Shadcn/UI           │  RN Paper/NativeWind  │
│  Tailwind CSS        │  NativeWind           │
│  Recharts            │  Victory Native       │
│  Framer Motion       │  RN Reanimated        │
│                      │                       │
│  Deploy: Vercel      │  Deploy: App Store    │
│                      │          Play Store   │
└──────────────────────┴──────────────────────┘
                       │
                       ▼
            ┌─────────────────┐
            │   EXISTING API   │
            │  (Railway/Node)  │
            │  JWT + REST      │
            └─────────────────┘
```

---

## 8. Risk Factors & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| React Native performance for complex tables/reports | Medium | Use FlatList virtualization, paginate data, simplify mobile reports |
| iOS App Store review delays | Medium | Submit early, follow Apple guidelines strictly |
| Shared code complexity | Low | Clear package boundaries, strict TypeScript |
| Push notification setup (FCM + APNs) | Medium | Use Expo Notifications for simplified setup |
| File upload on mobile | Low | Use expo-document-picker, test on both platforms |
| Chart rendering on mobile | Low | Use Victory Native, simplify charts for small screens |
| Offline support | Medium | RTK Query cache + AsyncStorage persistence |

---

*This plan assumes the backend API is complete and stable. Any backend changes or new API endpoints needed will add to the timeline.*
