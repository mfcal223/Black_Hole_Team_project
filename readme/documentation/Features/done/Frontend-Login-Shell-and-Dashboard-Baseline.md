#high #refactor

## Feature: Frontend Login, Shell, and Dashboard Baseline

### Description

The existing frontend was built against an older backend with a different API design (`/api/v1/...` URL prefix, different DTO shapes, workflow and workflow-step endpoints). The new backend exposes different endpoints and DTO shapes and does not implement workflows or the old agent management paradigm. Rather than patching every broken page, the immediate goal is to strip the frontend down to a clean, working baseline: the login system, the UI shell, and a minimal dashboard. All pages, services, and types that target non-existent backend endpoints are eliminated. No new features are added.

## Problem Statement

The frontend currently imports and renders pages that call endpoints the new backend does not expose (`/api/v1/agents`, `/workflow`, `/workflow-step`, etc.). On login, users land on a Dashboard that immediately triggers two failing API calls (`getMyAgents`, `getSubordinateAgents`), producing a visible error. The Sidebar shows navigation items for routes that either have broken backing endpoints or no route registration at all (`/subordinate-agents`, `/dashboard/settings`). The codebase cannot serve as a reliable starting point for new frontend work until dead code is removed and the remaining shell is verified to operate correctly against the current backend.

## User Stories

1. As a visitor, I want to open the app and see a landing page with the platform name and a Login button, so that I understand where I am before logging in.
2. As an unauthenticated user, I want to be redirected to the login page when I try to access a protected route, so that my session is protected.
3. As an authenticated user who navigates to the landing page, I want to be automatically redirected to the dashboard, so that I skip the login screen.
4. As a user, I want to enter my username and password on the login form and be redirected to the dashboard on success, so that I can access the platform.
5. As a user, I want to see a clear error message if my credentials are wrong, so that I know the login attempt failed.
6. As a user, I want a warning message if I was redirected to login because I accessed a protected route, so that I understand why I was sent here.
7. As a logged-in user, I want to see a welcome message that shows my username and role on the dashboard, so that I know I am logged in as the correct account.
8. As a logged-in user, I want to see a sidebar with navigation links, so that I can move between sections of the app.
9. As a logged-in user, I want every sidebar link to lead to a real, functioning page, so that I am never stranded on a 404 or a blank screen.
10. As a logged-in user, I want to click Logout in the header and be redirected to the login page, so that I can end my session.
11. As a logged-in user, I want a 401 response from the backend to automatically clear my session and redirect me to login, so that expired or invalid tokens are handled gracefully.
12. As a developer, I want the frontend to contain no imports or references to deleted files, so that the TypeScript compiler reports zero errors after the cleanup.
13. As a developer, I want all sidebar navigation items to point to registered routes, so that there are no broken links in the shell.

## Solution

Remove all files, imports, and routes that reference non-existent backend endpoints or eliminated features. Rewrite `DashboardPage` as a minimal greeting component that reads the user's name and role from `localStorage` (already populated by the login flow) without making any backend calls. Simplify the Sidebar to a single navigation item (Dashboard), remove the broken Settings footer link from the sidebar footer, and update `App.tsx` to reflect only the surviving routes.

### Scope

All changes are limited to `project/srcs/frontend/src/`. No backend files, Makefile, or Docker files are modified.

### Affected Systems / Modules

- `project/srcs/frontend/src/App.tsx` — route definitions rewritten
- `project/srcs/frontend/src/pages/DashboardPage.tsx` — fully rewritten
- `project/srcs/frontend/src/components/layout/Sidebar.tsx` — menu items simplified
- `project/srcs/frontend/src/components/layout/Header.tsx` — `getPageTitle()` simplified
- 17 files deleted across `pages/`, `services/`, and `types/`

### Impact Analysis

After this feature is complete:
- `App.tsx` will have exactly three route groups: `/` (HomePage), `/login` (LoginPage), and `/dashboard` (DashboardPage inside ProtectedRoute + MainLayout).
- The TypeScript compiler will report zero errors from missing or broken imports.
- The login flow is end-to-end functional: unauthenticated access → redirect to login → login form → `POST /login` via `api.ts` (Vite proxy strips `/api` prefix) → JWT stored in localStorage → redirect to dashboard → welcome message shown using `authHelpers`.
- `DashboardPage` makes zero backend API calls.
- All sidebar links point to registered routes.

### Risk Assessment

- Surgical changes only. The kept auth logic (`api.ts`, `authService.ts`, `authHelpers.ts`, `ProtectedRoute.tsx`, `AdminRoute.tsx`, `LoginPage.tsx`, `HomePage.tsx`, `MainLayout.tsx`) is untouched.
- `LoginPage.tsx` stores the token in localStorage directly AND calls `authService.login()` which also stores it — a pre-existing double-save. Do not fix this in the current feature.
- `AdminRoute.tsx` is kept as a file (no router registration needed) so future admin-only pages can use the guard without creating it from scratch.

---

## Implementation Architecture

### Changes Required

#### 1. Pages — Delete

**Purpose:** Remove all pages that call non-existent backend endpoints.

| File | Reason |
|---|---|
| `project/srcs/frontend/src/pages/AgentsPage.tsx` | Calls `agentService.getMyAgents()` → endpoint gone |
| `project/srcs/frontend/src/pages/AgentDetailsPage.tsx` | Calls `agentService.getAgentById()` → endpoint gone |
| `project/srcs/frontend/src/pages/WorkflowsPage.tsx` | Calls `workflowService` → endpoint does not exist in new backend |
| `project/srcs/frontend/src/pages/WorkflowDetailsPage.tsx` | Calls `workflowService` + `workflowStepService` → endpoints do not exist |
| `project/srcs/frontend/src/pages/EmployeesPage.tsx` | Calls `employeeService.getEmployees()` at wrong path |
| `project/srcs/frontend/src/pages/RegisterPage.tsx` | Calls `adminService.createEmployee()` at non-existent endpoint |

#### 2. Services — Delete

**Purpose:** Remove all service files that target broken or non-existent endpoints.

| File | Reason |
|---|---|
| `project/srcs/frontend/src/services/agentService.ts` | Targets hardcoded `/api/v1/agents` — double-prefixed and endpoint removed |
| `project/srcs/frontend/src/services/employeeService.ts` | Targets `/api/v1/employees` — double-prefixed |
| `project/srcs/frontend/src/services/adminService.ts` | `createEmployee()` targets non-existent `/admin/employees` |
| `project/srcs/frontend/src/services/workflowService.ts` | Targets `/workflow` — endpoint does not exist in new backend |
| `project/srcs/frontend/src/services/workflowStepService.ts` | Targets `/workflow-step` — endpoint does not exist in new backend |
| `project/srcs/frontend/src/services/userSettingsService.ts` | Empty stub — only contains an import, no logic |
| `project/srcs/frontend/src/services/userSourceService.ts` | Empty stub — only contains an import, no logic |

#### 3. Types — Delete

**Purpose:** Remove TypeScript type files tied exclusively to deleted features.

| File | Reason |
|---|---|
| `project/srcs/frontend/src/types/admin.ts` | `AdminForm` type used only by deleted `RegisterPage` / `adminService` |
| `project/srcs/frontend/src/types/employee.ts` | `EmployeeForm` / `EmployeeDTO` used only by deleted pages |
| `project/srcs/frontend/src/types/workflow.ts` | Types for deleted workflow feature |
| `project/srcs/frontend/src/types/workflowStep.ts` | Types for deleted workflow step feature |

#### 4. DashboardPage — Rewrite

**Purpose:** Replace the broken Dashboard (which calls two non-existent endpoints on mount) with a clean placeholder that reads only from `localStorage`.

The new component:
- Reads `username` from `getUsername()` (from `authHelpers`)
- Reads role from `isAdmin()` / `isEmployee()` (from `authHelpers`)
- Derives a human-readable role label: `"Admin"`, `"Employee"`, or `"Unknown"`
- Shows a welcome heading (`"Dashboard"`) and a subheading (`"Welcome, [username]"`)
- Displays one `Card` with the username and one `Card` with the role — uses the existing shadcn/ui `Card` primitives already in the project
- Makes **zero backend API calls**
- Has no loading state, no error state, no action buttons, no links to eliminated routes
- Root element is `<div>`, not `<main>` — `MainLayout` already wraps the Outlet in a `<main>` element; a second `<main>` would be invalid HTML and violate accessibility semantics

#### 5. App.tsx — Route Cleanup

**Purpose:** Remove imports and route definitions for all deleted pages. Remove the unused `AdminRoute` wrapper from the route tree.

Surviving route tree:
```
/           → HomePage
/login      → LoginPage
/dashboard  → ProtectedRoute → MainLayout (Outlet) → DashboardPage
```

`AdminRoute.tsx` file is **kept** for future use but is not imported in `App.tsx`.

#### 6. Sidebar.tsx — Menu Simplification

**Purpose:** Remove all nav items pointing to eliminated routes. Remove the broken Settings footer link.

Surviving menu items (inside `menuItems` array):
```
{ title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, show: true }
```

All other items (`Manage AI Agents`, `Workflows`, `Employee`, `Subordinate Agents`) are removed. The Settings `SidebarMenuButton` in `SidebarFooter` is removed. Unused icon imports (`Cpu`, `Workflow`, `Boxes`, `Settings`) are removed. The `isAdmin` import from `@/services/authHelpers` is also removed — it was used only by the deleted Employee and Subordinate Agents items.

The `SidebarFooter` status bar (`v1.0.0-beta` + animated "Online" indicator) is kept unchanged.

#### 7. Header.tsx — Page Title Simplification

**Purpose:** Remove dead `switch` cases from `getPageTitle()`. The current cases all reference `/dashboard/agents`, `/dashboard/workflows`, etc., which do not match any actual route.

Surviving switch body:
```typescript
switch (location.pathname) {
  case "/dashboard":
    return "Dashboard";
  default:
    return "Control Panel";
}
```

All other imports and logic in `Header.tsx` are unchanged.

---

## Implementation Steps

### Phase 1: Dead Code Deletion

- [x] **Step 1.1:** Delete all six eliminated page files (`AgentsPage`, `AgentDetailsPage`, `WorkflowsPage`, `WorkflowDetailsPage`, `EmployeesPage`, `RegisterPage`)
- [x] **Step 1.2:** Delete all seven eliminated service files (`agentService`, `employeeService`, `adminService`, `workflowService`, `workflowStepService`, `userSettingsService`, `userSourceService`)
- [x] **Step 1.3:** Delete all four eliminated type files (`admin.ts`, `employee.ts`, `workflow.ts`, `workflowStep.ts`)

### Phase 2: Dashboard Rewrite

- [x] **Step 2.1:** Rewrite `DashboardPage.tsx` — minimal greeting component using `getUsername()`, `isAdmin()`, `isEmployee()` from `authHelpers`; two shadcn `Card` primitives showing username and role; zero API calls; no loading or error state

### Phase 3: Shell Alignment

- [x] **Step 3.1:** Rewrite `App.tsx` — keep only the three surviving route groups, remove all imports for deleted pages, remove `AdminRoute` wrapper from the route tree (keep the file itself), and remove the two commented-out import lines for `SettingsPage` and `SubordinateAgentsPage`
- [x] **Step 3.2:** Simplify `Sidebar.tsx` — reduce `menuItems` to Dashboard only, remove unused icon imports, remove the Settings `SidebarMenuButton` from `SidebarFooter`
- [x] **Step 3.3:** Simplify `Header.tsx` `getPageTitle()` — keep only the `/dashboard → "Dashboard"` case and the `default → "Control Panel"` fallback; remove all other `case` branches

---

## Potential Issues / Risks

- **LoginPage double-save:** `LoginPage.tsx` calls `localStorage.setItem("token", ...)` directly AND calls `login()` from `authService.ts`, which also saves the token. Pre-existing; do not fix in this feature.
- **AdminRoute.tsx will have no callers** after `App.tsx` cleanup. TypeScript does not warn on unused files — only unused imports within a file. No action needed.
- **Header `getPageTitle()` path mismatch is pre-existing.** The current cases reference `/dashboard/agents`, etc., which were never the actual route paths. The simplification in Step 3.3 is a fix, not a regression.
- **`main.tsx` wraps `<App />` in `<ThemeProvider>`.** This is not touched.
- **JWT console.log in `LoginPage.tsx`:** `LoginPage.tsx:41` logs the raw `LoginResponse` (including the JWT token) via `console.log("Login successful:", data)`. This is a pre-existing security issue — browser extensions or XSS payloads can extract the JWT from the console. It also has an ordering bug (log executes after `window.location.href = "/dashboard"`, making it unreachable in practice). Do not fix in this feature; file a separate bug ticket to remove or sanitize the log. See [[Review-of-Frontend-Login-Shell-and-Dashboard-Baseline#Finding 6]].

---

## Testing Decisions

This feature contains no new business logic — it is a deletion and simplification task. There is no new module whose interface merits a unit test.

**What constitutes a passing verification for each phase:**

- **Phase 1 (deletion):** `tsc --noEmit` and `vite build` complete with zero errors after all files are removed.
- **Phase 2 (DashboardPage):** Vite dev server starts; after login, `/dashboard` renders without errors in the browser console; the username and role label are visible.
- **Phase 3 (shell):** Every link in the sidebar navigates to an existing, rendering page. The header shows "Dashboard" on `/dashboard`. The logout button in the header clears localStorage and navigates to `/login`.

**Golden path (manual, post-implementation):**

1. Visit `/` → landing page shown, no redirect.
2. Visit `/dashboard` unauthenticated → redirected to `/login` with message "You need to sign in to access that page."
3. On `/login`, submit valid credentials → redirected to `/dashboard`.
4. Dashboard shows "Welcome, [username]" and the role label.
5. Sidebar shows exactly one navigation link: Dashboard.
6. Click Logout → `clearAuth()` runs → navigate to `/login`.
7. Re-visit `/dashboard` → redirected back to `/login`.

**What is not tested:**

- `authHelpers.ts`, `authService.ts`, `api.ts` — unchanged, no new tests required.
- `ProtectedRoute.tsx`, `AdminRoute.tsx` — unchanged.

---

## Task Breakdown

### Task 1: Dead Code Removal
- **Steps Covered:** Steps 1.1, 1.2, 1.3
- **Reason for Grouping:** All deletions — no logic to write, no imports to resolve, pure elimination. Low risk per file, can be batched.
- **Planned Task File:** `Frontend-Login-Shell-and-Dashboard-Baseline-step-1-dead-code-removal.md`
- **Task Document Link:** [[Frontend-Login-Shell-and-Dashboard-Baseline-step-1-dead-code-removal]]

### Task 2: Dashboard Rewrite and Shell Alignment
- **Steps Covered:** Steps 2.1, 3.1, 3.2, 3.3
- **Reason for Grouping:** These steps are coupled — once dead pages are removed, `App.tsx`, `Sidebar.tsx`, `Header.tsx`, and `DashboardPage.tsx` must all be updated together to produce a consistent, compilable, runnable shell. After Task 1, both `App.tsx` (imports deleted pages) and `DashboardPage.tsx` (imports deleted `agentService.ts`) fail to compile — Task 2 fixes both.
- **Planned Task File:** `Frontend-Login-Shell-and-Dashboard-Baseline-step-2-dashboard-and-shell.md`
- **Task Document Link:** [[Frontend-Login-Shell-and-Dashboard-Baseline-step-2-dashboard-and-shell]]
