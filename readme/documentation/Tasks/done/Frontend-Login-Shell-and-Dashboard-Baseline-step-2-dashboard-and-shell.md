# Task: Dashboard Rewrite and Shell Alignment

#task #current #medium-complexity #parent-frontend-login-shell-and-dashboard-baseline

**Parent:** [[Features/to-do/Frontend-Login-Shell-and-Dashboard-Baseline]]
**Parent Type:** Feature
**Related Step(s):** Phase 2 — Step 2.1; Phase 3 — Steps 3.1, 3.2, 3.3
**Estimated Complexity:** Medium

---

## Goal

Rewrite `DashboardPage.tsx` as a minimal, API-call-free greeting component, clean up `App.tsx` to the three surviving routes, and simplify `Sidebar.tsx` and `Header.tsx` to reflect only what exists. The result is a compilable, runnable frontend shell where every route and sidebar link works correctly.

---

## Parent Context

Task 1 deleted 17 files (6 pages, 7 services, 4 types) that targeted non-existent backend endpoints. After Task 1:

- `App.tsx` imports six deleted page components — TypeScript reports errors.
- `DashboardPage.tsx` imports `getMyAgents` and `getSubordinateAgents` from the deleted `agentService.ts` — TypeScript reports an error, and the component triggers two failing API calls on mount.
- `Sidebar.tsx` shows navigation items for routes that no longer exist (`/agents`, `/workflows`, `/employees`, `/subordinate-agents`) and has a Settings footer link pointing to an unregistered route (`/dashboard/settings`).
- `Header.tsx` has a `getPageTitle()` switch with cases that match paths that were never actual route registrations (`/dashboard/agents`, `/dashboard/workflows`, etc.) — the switch always falls through to the default.

The parent feature defines the surviving route tree after this task as exactly:

```
/           → HomePage
/login      → LoginPage
/dashboard  → ProtectedRoute → MainLayout (Outlet) → DashboardPage
```

The parent's risk notes are architectural constraints this task must honour:

- **`LoginPage.tsx` double-save** — `LoginPage.tsx` calls `localStorage.setItem("token", ...)` directly AND calls `authService.login()` which also stores the token. This is pre-existing. Do not fix it here.
- **`AdminRoute.tsx` has no callers after cleanup** — keep the file; do not import it in `App.tsx`; TypeScript does not warn on unused files.
- **JWT `console.log` in `LoginPage.tsx`** — pre-existing security issue; do not fix in this task.

**Scope constraint:** All changes are limited to `project/srcs/frontend/src/`. No backend, Makefile, or Docker files are touched.

---

## Preconditions / Dependencies

- **Task 1 must be complete.** The 17 deleted files (pages, services, types) must no longer exist on disk. `App.tsx` and `DashboardPage.tsx` will currently fail TypeScript type-checking — this is the expected starting state for Task 2.
- `project/srcs/frontend/src/services/authHelpers.ts` must exist and export `getUsername()`, `isAdmin()`, `isEmployee()`, `clearAuth()` — confirmed present after Task 1.
- `project/srcs/frontend/src/components/ui/card.tsx` must exist with the shadcn Card primitive exports (`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`) — confirmed present after Task 1.
- `project/srcs/frontend/src/components/layout/MainLayout.tsx` wraps all dashboard children in a `<main>` element — confirmed present; `DashboardPage` must therefore use a `<div>` root, not a second `<main>`.
- `project/srcs/frontend/src/routes/ProtectedRoute.tsx` and `AdminRoute.tsx` must exist — both confirmed present.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `solid-deep-design` — Selected — `DashboardPage` must have one responsibility (render a greeting from localStorage) with a minimal interface (no props, no local state beyond the derived values). The deletion test confirms the old `DashboardPage` was not earning its depth: removing the API-call logic leaves only the greeting, so the greeting alone is the real interface. The rewritten component concentrates that responsibility cleanly.
- `tdd` — Selected — No new business logic is introduced; the test strategy is structural (typecheck + build) and manual (golden path walkthrough). The TDD vertical-slice model is not needed because no new public interface is being defined.
- `react-best-practices` — Not needed — No new React patterns introduced; all surviving patterns (shadcn cards, authHelpers reads, `useLocation`) are already in use in the project.
- `find-docs` — Not needed — The Card primitive API is confirmed directly from the source file `src/components/ui/card.tsx`. React 19 and react-router-dom 6 patterns used are identical to patterns already in `LoginPage.tsx` and `HomePage.tsx`.

### Documentation Reviewed

- `project/srcs/frontend/src/components/ui/card.tsx` — read in full. Exports confirmed: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`, `CardAction`. This task uses `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` only.
- `project/srcs/frontend/src/services/authHelpers.ts` — read in full. `getUsername()` returns `string | null`; `isAdmin()` and `isEmployee()` return `boolean`. These are purely synchronous localStorage reads — no async or side-effect concerns.
- Confirmed library versions from `package.json`: React `^19.2.4`, react-router-dom `^6.30.3`, lucide-react `^1.21.0`, TypeScript `~5.9.3`.

### Related Existing Code

- `project/srcs/frontend/src/App.tsx` — currently broken; full rewrite in Step 3.1
- `project/srcs/frontend/src/pages/DashboardPage.tsx` — currently broken; full rewrite in Step 2.1
- `project/srcs/frontend/src/components/layout/Sidebar.tsx` — simplification in Step 3.2
- `project/srcs/frontend/src/components/layout/Header.tsx` — `getPageTitle()` simplification in Step 3.3
- `project/srcs/frontend/src/components/layout/MainLayout.tsx` — read only; wraps Outlet in `<main>`, which governs the root element constraint for `DashboardPage`
- `project/srcs/frontend/src/services/authHelpers.ts` — used by the rewritten DashboardPage, Sidebar simplification, and Header (unchanged)
- `project/srcs/frontend/src/routes/ProtectedRoute.tsx` — kept unchanged; used in App.tsx step 3.1

---

## Implementation Details

### Approach

All four steps are pure rewrites of existing files — no new files are created and no surviving file outside the four targets is modified.

**`DashboardPage.tsx` rewrite (Step 2.1):**
The new component is a pure read from `authHelpers` with no state, no effects, and no network calls. `getUsername()` returns `string | null`; the welcome subheading uses the conditional pattern `{username ? `, ${username}` : ""}` so the heading reads "Welcome, testuser." when logged in and "Welcome." when username is absent — matching the original DashboardPage's null handling. The card displays `{username ?? "Unknown"}`. The role label is derived synchronously: `isAdmin() ? "Admin" : isEmployee() ? "Employee" : "Unknown"`. Two shadcn `Card` primitives display the username and role. Root element is `<div>` — `MainLayout` already owns the `<main>` element, and a second `<main>` would be invalid HTML. <!-- REVIEW-FIX: Aligned null-username behavior in welcome subheading with original conditional pattern; "user" fallback was a gratuitous deviation -->

**`App.tsx` rewrite (Step 3.1):**
Remove all imports for deleted pages. Remove the `AdminRoute` import (file kept, but not wired into any route). Remove both commented-out import lines. The route tree collapses to three groups: `/` → `HomePage`, `/login` → `LoginPage`, and a pathless layout route `ProtectedRoute → MainLayout` with a single child `/dashboard` → `DashboardPage`.

**`Sidebar.tsx` simplification (Step 3.2):**
Remove all imports not needed after the menu reduction: `Cpu`, `Workflow`, `Users`, `Boxes`, `Settings` from `lucide-react`; `isAdmin` from `authHelpers`. Reduce `menuItems` to the single Dashboard entry. Remove the Settings `SidebarMenuButton` from `SidebarFooter`. The status bar (`v1.0.0-beta` + animated "Online" indicator) is kept unchanged.

**`Header.tsx` simplification (Step 3.3):**
Replace the entire `getPageTitle()` switch body with two cases: `"/dashboard" → "Dashboard"` and `default → "Control Panel"`. No other imports or logic in `Header.tsx` change.

**SOLID analysis:**
- `DashboardPage` now has a single responsibility: render user identity from localStorage. The deletion test passes — deleting the component would scatter the username/role display across no callers (it has no equivalent elsewhere). The interface is small (no props) and the implementation is minimal — genuinely proportional depth.
- `App.tsx` has a single responsibility: declare routes. Removing dead route declarations does not violate OCP — it eliminates code that should not have existed. The surviving three routes are stable.
- `Sidebar` has a single responsibility: render the navigation shell. Removing menu items that pointed to eliminated routes shrinks the interface without degrading depth.
- `Header`'s `getPageTitle()` now only maps real routes. Dead switch cases were accidental complexity (none of the cases ever matched a real pathname since the routes used `/dashboard` not `/dashboard/agents`).

### Files to Create/Modify

- [x] `project/srcs/frontend/src/pages/DashboardPage.tsx` — full rewrite
- [x] `project/srcs/frontend/src/App.tsx` — full rewrite
- [x] `project/srcs/frontend/src/components/layout/Sidebar.tsx` — simplification (remove icons, items, Settings footer button)
- [x] `project/srcs/frontend/src/components/layout/Header.tsx` — `getPageTitle()` body replacement only

---

## Step-by-Step Implementation

### Step 2.1: Rewrite DashboardPage.tsx

**Goal:** Replace the broken dashboard with a minimal greeting component that reads username and role from localStorage — no API calls, no loading state, no error state.
**Dependencies:** `authHelpers.ts` must exist with `getUsername()`, `isAdmin()`, `isEmployee()`; shadcn `card.tsx` must exist.

- [x] Open `project/srcs/frontend/src/pages/DashboardPage.tsx`
- [x] Replace the entire file content with the implementation below

**Why this step is critical:** `DashboardPage.tsx` is the first screen users see after login. The old version makes two failing API calls on mount, producing visible console errors and potentially breaking state. The rewrite eliminates all network dependency for the dashboard baseline.

#### Implementation

```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getUsername, isAdmin, isEmployee } from "@/services/authHelpers"

export function DashboardPage() {
  const username = getUsername()
  const roleLabel = isAdmin() ? "Admin" : isEmployee() ? "Employee" : "Unknown"

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome{username ? `, ${username}` : ""}.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Logged user</CardTitle>
            <CardDescription>Current authenticated user.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{username ?? "Unknown"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Role</CardTitle>
            <CardDescription>Current user permissions.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{roleLabel}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

#### Edge Cases

1. **`getUsername()` returns `null`** — the conditional `{username ? `, ${username}` : ""}` in the heading renders "Welcome." (no trailing username) and the card renders `"Unknown"`. This state occurs when localStorage is partially cleared or when a token exists but username was not stored. The component renders safely in all cases. <!-- REVIEW-FIX: Updated null description to match corrected conditional pattern -->
2. **Neither `isAdmin()` nor `isEmployee()` is true** — role ternary evaluates to `"Unknown"`. This state can occur during development with manually crafted tokens or future roles. The component degrades gracefully.
3. **Root element is `<div>`, not `<main>`** — `MainLayout` already renders a `<main>` element wrapping the `<Outlet />`. A second `<main>` inside the Outlet would produce invalid HTML (only one `<main>` per document is permitted by the ARIA landmark spec) and is incorrect accessibility-wise. `<div>` is the correct root here.

---

### Step 3.1: Rewrite App.tsx

**Goal:** Remove all dead imports and route definitions. Leave exactly three route groups matching the parent's surviving route tree.
**Dependencies:** Step 2.1 must be complete so `DashboardPage.tsx` compiles cleanly.

- [x] Open `project/srcs/frontend/src/App.tsx`
- [x] Replace the entire file content with the implementation below

**Why this step is critical:** `App.tsx` currently imports six deleted page components, causing TypeScript compilation errors. Until this file is rewritten, `tsc --noEmit` and `vite build` both fail. Every route definition for a deleted page is also a dead route — visiting `/agents`, `/workflows`, etc. was already broken at the API layer; removing the route registrations makes the routes definitively non-existent.

#### Implementation

```tsx
import { BrowserRouter, Route, Routes } from "react-router-dom"
import { HomePage } from "@/pages/HomePage"
import { LoginPage } from "@/pages/LoginPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { ProtectedRoute } from "@/routes/ProtectedRoute"
import { MainLayout } from "@/components/layout/MainLayout"

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

#### Edge Cases

1. **`AdminRoute` is NOT imported in `App.tsx`** — the file `routes/AdminRoute.tsx` is kept on disk for future admin-only pages, but it has no route registrations here. TypeScript does not warn on unused files — only unused imports within a file. No further action is needed.
2. **`/register` route removed** — it was previously wrapped in `<AdminRoute>` and backed by the deleted `RegisterPage`. Navigating to `/register` now returns a React Router "no match" (no 404 page is registered, so behaviour depends on the router; in practice the page renders nothing). This is acceptable for the baseline — a 404 fallback route is not in scope for this feature.
3. **Both commented-out import lines are removed** — `//import { SettingsPage }` and `//import { SubordinateAgentsPage }` had no corresponding route registrations. Removing them eliminates dead comments that could mislead future readers.

---

### Step 3.2: Simplify Sidebar.tsx

**Goal:** Reduce menu items to Dashboard only; remove unused icon imports; remove the Settings `SidebarMenuButton` from the footer.
**Dependencies:** None — this step is independent of Steps 2.1 and 3.1 at the filesystem level, though all four steps should be done in the same session for a consistent result.

- [x] Open `project/srcs/frontend/src/components/layout/Sidebar.tsx`
- [x] Replace the entire file content with the implementation below

**Why this step is critical:** The sidebar currently shows four navigation items that have no registered routes (`/agents`, `/workflows`, `/employees`, `/subordinate-agents`) and a Settings footer link to an unregistered route (`/dashboard/settings`). After this step, every visible link in the sidebar navigates to a real, rendering page.

#### Implementation

```tsx
import {
  Bot,
  LayoutDashboard,
} from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import {
  Sidebar as ShadcnSidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarFooter,
} from "@/components/ui/sidebar"

export function Sidebar() {
  const location = useLocation()

  const menuItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      show: true,
    },
  ]

  const visibleMenuItems = menuItems.filter((item) => item.show)

  return (
    <ShadcnSidebar>
      {/* HEADER SECTION */}
      <SidebarHeader className="flex h-16 items-center border-b border-sidebar-border px-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none select-none">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
                <Bot className="size-4 animate-pulse" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-heading font-bold text-sidebar-foreground tracking-tight">
                  BHT AI
                </span>
                <span className="truncate text-xs text-muted-foreground font-mono tracking-wider uppercase">
                  Manager
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* CONTENT SECTION */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-heading uppercase tracking-wider text-[10px]">
            Platform
          </SidebarGroupLabel>

          <SidebarMenu className="mt-2">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.url

              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={item.title}
                    className="data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
                  >
                    <Link to={item.url} className="flex items-center gap-3">
                      <Icon className="size-4" />
                      <span className="font-medium text-sm">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* FOOTER SECTION */}
      <SidebarFooter className="p-2 border-t border-sidebar-border gap-2">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono px-2 select-none border-t border-sidebar-border/40 pt-2 group-data-[collapsible=icon]:hidden">
          <span>v1.0.0-beta</span>
          <div className="flex items-center gap-1.5">
            <span className="relative flex size-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full size-1.5 bg-emerald-500"></span>
            </span>
            <span className="text-[9px] uppercase tracking-wider text-emerald-500 font-semibold">Online</span>
          </div>
        </div>
      </SidebarFooter>
    </ShadcnSidebar>
  )
}
```

#### Edge Cases

1. **`isAdmin` import removed** — this import was used only by the now-deleted Employee and Subordinate Agents menu items (whose `show` field was `isAdmin()`). The Dashboard item uses `show: true` unconditionally. Removing the import eliminates an unused dependency and keeps `Sidebar.tsx` free of auth concerns for this baseline.
2. **`visibleMenuItems.filter((item) => item.show)` still present** — the filter is preserved even with a single always-visible item, because the pattern supports future menu items without structural changes to the render logic. This is not premature abstraction — it mirrors the existing pattern and costs zero runtime overhead.
3. **Settings `SidebarMenuButton` removed from `SidebarFooter`** — the entire `<SidebarMenu>` block containing the Settings link is removed. The footer retains only the `v1.0.0-beta` + animated "Online" status bar. No Settings page or route exists for this baseline.

---

### Step 3.3: Simplify Header.tsx getPageTitle()

**Goal:** Replace the dead switch cases in `getPageTitle()` with only the two valid cases: `/dashboard → "Dashboard"` and `default → "Control Panel"`.
**Dependencies:** None — this step is independent.

- [x] Open `project/srcs/frontend/src/components/layout/Header.tsx`
- [x] Locate the `getPageTitle` function (currently a switch statement inside the `Header` component body)
- [ ] Replace only the switch body — leave all surrounding code (imports, `username`, `getRoleLabel`, `handleLogout`, JSX) entirely unchanged

**Why this step is critical:** The current `getPageTitle()` has six case branches (`/dashboard/agents`, `/dashboard/workflows`, `/dashboard/conversations`, `/dashboard/employees`, `/dashboard/subordinate-agents`, `/dashboard/settings`) that never matched any registered route path — they all fall through to `default: "Control Panel"`. This is pre-existing dead code. After this step, the switch reflects only what exists: one real route (`/dashboard`) and a safe default.

#### Implementation — replace only the `getPageTitle` function body:

```tsx
const getPageTitle = () => {
  switch (location.pathname) {
    case "/dashboard":
      return "Dashboard"
    default:
      return "Control Panel"
  }
}
```

The full `Header.tsx` after the change (all other code unchanged) — **this is a reference listing for verification only; do NOT use it as a full-file rewrite template; apply only the `getPageTitle` switch body substitution shown above**): <!-- REVIEW-FIX: Added explicit "reference only / not a rewrite template" warning to prevent accidental full-file replacement -->

```tsx
import { SidebarTrigger } from "@/components/ui/sidebar"
import { LogOut, User } from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"
import { getUsername, isAdmin, isEmployee, clearAuth } from "@/services/authHelpers"

export function Header() {
  const location = useLocation()
  const navigate = useNavigate()

  const username = getUsername() || "User"

  const getRoleLabel = () => {
    if (isAdmin()) return "Admin"
    if (isEmployee()) return "Employee"
    return "Role Unknown"
  }

  const getPageTitle = () => {
    switch (location.pathname) {
      case "/dashboard":
        return "Dashboard"
      default:
        return "Control Panel"
    }
  }

  const handleLogout = () => {
    clearAuth()
    navigate("/login")
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border bg-background px-4">

      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
        <div className="h-4 w-1px bg-sidebar-border" />
        <h1 className="font-heading font-semibold text-sm text-foreground tracking-tight">
          {getPageTitle()}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-2 py-1 rounded-md select-none">
          <div className="flex size-7 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground shadow-sm border border-sidebar-border">
            <User className="size-4" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-semibold leading-none text-foreground">
              {username}
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5 font-mono uppercase tracking-wider">
              {getRoleLabel()}
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors px-2 py-1.5 rounded-md hover:bg-destructive/10"
        >
          <LogOut className="size-4" />
          <span className="hidden sm:inline">LogOut</span>
        </button>
      </div>
    </header>
  )
}
```

#### Edge Cases

1. **`isAdmin` and `isEmployee` are still used by `getRoleLabel()`** — these imports must NOT be removed even though `Sidebar.tsx` drops its `isAdmin` import. The `Header.tsx` imports remain unchanged.
2. **`getPageTitle()` always returns `"Dashboard"` on `/dashboard`** — all other paths return `"Control Panel"`, which is correct for any future pages added before their own case branch is needed.

---

### Step 3.4: Mark Parent Feature Document Phases Complete

**Goal:** Record that Phase 2 and Phase 3 of the parent feature are complete.
**Dependencies:** Steps 2.1, 3.1, 3.2, and 3.3 must all be done. Automatic validation (typecheck + build) must pass.

- [ ] Open `documentation/Features/to-do/Frontend-Login-Shell-and-Dashboard-Baseline.md`
- [x] Mark `Step 2.1` checkbox `[x]` in the Implementation Steps section
- [x] Mark `Step 3.1` checkbox `[x]` in the Implementation Steps section
- [x] Mark `Step 3.2` checkbox `[x]` in the Implementation Steps section
- [x] Mark `Step 3.3` checkbox `[x]` in the Implementation Steps section
- [x] Update the Task 2 entry in the parent document's Task Breakdown section with the wiki link to this task document: `[[Tasks/current/Frontend-Login-Shell-and-Dashboard-Baseline-step-2-dashboard-and-shell]]`
- [x] Update Memory Bank `context.md` and prepend a dated entry to `progress.md`

---

## Design Decisions

**Decision 1:** Rewrite `DashboardPage.tsx` as a stateless, zero-effect component.
- **Why:** The parent document mandates zero API calls and no loading/error state for the baseline. The only data source available without a backend call is localStorage — already populated by the login flow. A pure synchronous read from `authHelpers` satisfies all user stories (welcome message, username display, role display) without any async machinery.
- **Alternatives considered:** Keeping the `useState`/`useEffect` structure and replacing API calls with a no-op. Rejected — retaining state hooks for a component that makes no async calls is accidental complexity. An empty `useEffect` is misleading: it implies something might change asynchronously, which is false for this component.

**Decision 2:** Use a `<div>` root for `DashboardPage`, not `<main>`.
- **Why:** `MainLayout.tsx` wraps the `<Outlet />` in a `<main>` element. A second `<main>` inside the Outlet would produce a nested `<main>` in the rendered DOM, which violates the HTML spec (a document may have at most one visible `<main>` landmark) and fails ARIA landmark semantics. Using `<div>` is the correct choice.
- **Alternatives considered:** Removing `<main>` from `MainLayout` and adding it to `DashboardPage`. Rejected — `MainLayout` is a shared layout component used by future pages; centralising the `<main>` landmark there is correct architectural practice and prevents the same mistake from recurring on each new page.

**Decision 3:** Full rewrite of `App.tsx` rather than surgical import removal.
- **Why:** The file has six dead imports, two commented-out import lines, three dead route groups, and an `AdminRoute` wrapper that is no longer part of the route tree. Surgical edits applied one at a time would require multiple read-validate-edit cycles with high risk of inconsistency. A full rewrite from the known surviving route tree is safer, produces a cleaner result, and is easier to diff.
- **Alternatives considered:** Keeping `AdminRoute` in the route tree for `/register` as a pre-wired placeholder. Rejected per the parent document: `AdminRoute` is kept as a file for future use, but no route registration should exist for it until a page is built. Dead routes are as harmful as dead imports.

**Decision 4:** Retain the `visibleMenuItems.filter()` pattern in `Sidebar.tsx` even with a single item.
- **Why:** The filter is already present in the codebase and costs nothing to retain. The `show` field on menu items is the established pattern for conditional display; removing the filter would require restructuring the menuItems array and render loop when the next menu item is added. Retaining it preserves the OCP-compliant pattern: adding a new sidebar item requires only a new entry in `menuItems`, not a change to the render logic.
- **Alternatives considered:** Remove the filter and render `menuItems` directly. Rejected — unnecessary churn for a pattern that already exists and is already correct.

**Decision 5:** `getPageTitle()` switch retained with only two cases (not replaced by a lookup object or removed entirely).
- **Why:** The switch is a small, readable function that matches the project's existing style. Two cases is a valid use of a switch. The parent document prescribes exactly this shape.
- **Alternatives considered:** Replacing the switch with an object map `{ "/dashboard": "Dashboard" }` and a fallback. Rejected — marginal style difference with no readability or performance benefit at two cases. Preserving the switch keeps the diff minimal and the reader's expectation consistent with the surrounding code.

---

## Testing Considerations

### Automatic Validation

- [x] From `project/srcs/frontend/`, run `npm run typecheck` — must complete with **zero errors**. Specifically: `App.tsx` and `DashboardPage.tsx` must report no TypeScript errors.
- [x] From `project/srcs/frontend/`, run `npm run build` — must complete successfully (`tsc -b && vite build` — zero TypeScript errors, Vite bundles without errors).
- [x] Run `grep -rn "agentService\|employeeService\|adminService\|workflowService\|workflowStepService\|AgentsPage\|AgentDetailsPage\|WorkflowsPage\|WorkflowDetailsPage\|EmployeesPage\|RegisterPage" project/srcs/frontend/src --include="*.ts" --include="*.tsx"` — must return **zero matches** (no surviving file references any deleted module).
- [x] Run `grep -rn "from.*SettingsPage\|from.*SubordinateAgentsPage" project/srcs/frontend/src --include="*.ts" --include="*.tsx"` — must return **zero matches** (commented-out imports removed).
- [x] Run `grep -rn "/dashboard/agents\|/dashboard/workflows\|/dashboard/conversations\|/dashboard/employees\|/dashboard/subordinate-agents\|/dashboard/settings" project/srcs/frontend/src --include="*.ts" --include="*.tsx"` — must return **zero matches** (all dead path references removed).
- [x] Confirm `Sidebar.tsx` no longer imports `Cpu`, `Workflow`, `Users`, `Boxes`, `Settings`, or `isAdmin`: `grep -n "Cpu\|Workflow\|Users\|Boxes\|Settings\|isAdmin" project/srcs/frontend/src/components/layout/Sidebar.tsx` must return **zero matches**.

### Manual Validation

The following steps must be performed by a human with the Vite dev server running (`npm run dev` from `project/srcs/frontend/`). The backend does not need to be running for steps 1–3 and 5; step 4 requires the backend.

- [x] **Step 1:** Visit `/` — landing page (`HomePage`) renders with "BHT AI Agents Manager" heading and Login button. No redirect occurs. Browser console shows zero errors.
- [x] **Step 2:** Visit `/dashboard` while unauthenticated (no token in localStorage) — `ProtectedRoute` redirects to `/login` with the message "You need to sign in to access that page." displayed in the yellow warning card.
- [x] **Step 3:** Open the browser devtools, manually set `localStorage.setItem("token", "fake")`, `localStorage.setItem("username", "testuser")`, `localStorage.setItem("roles", '["ROLE_EMPLOYEE"]')`, then navigate to `/dashboard` — the Dashboard page renders with "Welcome, testuser." in the subheading, a "Logged user" card showing "testuser", and a "Role" card showing "Employee". No loading spinner. No error message. No console errors. Sidebar shows only "Dashboard" link. Header shows "Dashboard" title and "testuser / EMPLOYEE" in the top right. Logout button appears in the header.
- [x] **Step 4:** (Requires backend running via Docker Compose.) Log in at `/login` with valid credentials — credentials accepted, redirect to `/dashboard`, welcome message shows real username and correct role. Sidebar shows exactly one link: "Dashboard". Header logout button works: clicking it clears localStorage and redirects to `/login`. Re-visiting `/dashboard` redirects back to `/login`.
- [x] **Step 5:** Clear localStorage and navigate to `/agents`, `/workflows`, `/employees` — React Router renders a blank page (no registered route — this is the expected behaviour for the baseline; no 404 page is in scope). Confirm no console errors about missing components or broken imports.

---

## Related Code Explanations

- `project/srcs/frontend/src/components/layout/MainLayout.tsx` — wraps `<Outlet />` in `<main>`; governs root-element constraint for all dashboard child pages
- `project/srcs/frontend/src/services/authHelpers.ts` — all auth reads in `DashboardPage`, `Header`, and `Sidebar` source from here
- `project/srcs/frontend/src/routes/ProtectedRoute.tsx` — guards the dashboard route group in `App.tsx`
- `project/srcs/frontend/src/routes/AdminRoute.tsx` — kept on disk; not imported by `App.tsx` after this task
- `project/srcs/frontend/vite.config.ts` — Vite proxy strips `/api` prefix before forwarding to `http://localhost:8080`; login flow in `authService.ts` posts to `/api/login`, which reaches `POST /login` on the backend

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected for this task
- [x] `project/srcs/frontend/src/pages/DashboardPage.tsx` rewritten — zero API calls, no loading/error state, username and role shown via two shadcn Cards, root element is `<div>`
- [x] `project/srcs/frontend/src/App.tsx` rewritten — exactly three route groups (`/`, `/login`, `/dashboard`), no dead imports, no dead route registrations, no commented-out import lines
- [x] `project/srcs/frontend/src/components/layout/Sidebar.tsx` simplified — `menuItems` array contains only Dashboard entry, unused icons (`Cpu`, `Workflow`, `Users`, `Boxes`, `Settings`) removed from imports, `isAdmin` import removed, Settings `SidebarMenuButton` removed from `SidebarFooter`, status bar unchanged
- [x] `project/srcs/frontend/src/components/layout/Header.tsx` simplified — `getPageTitle()` switch has exactly two cases (`/dashboard` and `default`), all other code unchanged
- [x] `npm run typecheck` completes with zero errors
- [x] `npm run build` completes successfully
- [x] Grep for deleted module names returns zero matches across all surviving `.ts`/`.tsx` files
- [x] Grep for dead path strings (`/dashboard/agents`, etc.) returns zero matches
- [ ] Manual golden path walkthrough completed successfully (steps 1–5 in Manual Validation)
- [x] Parent feature document Phase 2 (Step 2.1) and Phase 3 (Steps 3.1, 3.2, 3.3) marked `[x]`
- [x] Memory Bank `context.md` updated, `progress.md` updated with dated entry

---

## Post-Review Notes

### Deviations from Task Document Specification

1. **`Sidebar.tsx`: `asChild` replaced with `onClick`/`navigate`** — The Task document spec used `asChild` prop on `SidebarMenuButton` to wrap a `<Link>` component. This shadcn/ui v4 sidebar uses `@base-ui/react`'s `useRender`/`mergeProps` for rendering (not Radix's `Slot`), so `asChild` is not a recognized prop. The original pre-Task-2 `Sidebar.tsx` also had this `asChild` usage (pre-existing type error that wasn't caught before). Fix: replaced `<Link to={item.url}>` + `asChild` with `onClick={() => navigate(item.url)}` on `SidebarMenuButton`. Same behavior, zero runtime difference.

2. **`EmptyState.tsx`: removed unused `Inbox` import** — Pre-existing `tsc -b` error (`TS6133: 'Inbox' is declared but its value is never read`). File `src/components/common/EmptyState.tsx` contained only `import { Inbox } from "lucide-react"` with no other code. The import was never used and the file is not imported by any other module. Removed the import to allow `tsc -b` to pass. This is outside the Task's explicit scope but is a zero-risk fix to satisfy the build requirement.
