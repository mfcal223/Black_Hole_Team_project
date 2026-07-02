# Task: Admin Employee Management Page — Wiring + Regression

#task #current #low-complexity #parent-admin-employee-management-page

**Parent:** [[Admin-Employee-Management-Page]]
**Parent Type:** Feature
**Related Step(s):** Phase 5, Steps 5.1, 5.2, 5.3, 5.4
**Estimated Complexity:** Low

---

## Goal

Wire the completed Employee feature modules (`EmployeesPage`, `useEmployeeList`, `EmployeeTable`, `EmployeeFilterBar`) into the app shell by adding the `/employees` route to the admin-only router group, adding the "Employees" sidebar item, and registering the page title in `Header.tsx`. Run typecheck + test + build to confirm the full feature is regression-free.

---

## Parent Context

The parent feature [[Admin-Employee-Management-Page]] defines a five-task roadmap. Tasks 1–4 are complete:

- **Task 1** — shadcn `table` + `select` installed (`src/components/ui/table.tsx`, `src/components/ui/select.tsx`)
- **Task 2** — `types.ts`, `employeeService.ts` (TDD)
- **Task 3** — `useEmployeeList.ts` + `index.ts` (TDD, 9 behavior tests)
- **Task 4** — `EmployeeTable.tsx`, `EmployeeFilterBar.tsx`, `EmployeesPage.tsx`

Current state: 59/59 tests, 0 typecheck errors, successful build (8226 modules). No changes to `router.tsx`, `Sidebar.tsx`, or `Header.tsx` have been made yet — `EmployeesPage` is compiled but unreachable from the browser.

Task 5 is purely additive wiring: three surgical edits to connect the page into the navigation shell. No logic is added. The parent specifies:

- **Step 5.1** — `src/router.tsx`: add `/employees` child route inside the existing admin-only `RoleGuard` group; import `EmployeesPage`.
- **Step 5.2** — `src/layouts/Sidebar.tsx`: add `Users` icon, add "Employees" menu item with `roles: [UserRole.ADMIN]` between Dashboard and Conversations.
- **Step 5.3** — `src/layouts/Header.tsx`: add `case "/employees": return "Employees"` before `default` in `getPageTitle()`.
- **Step 5.4** — Final regression: `npm run typecheck` + `npm run test` + `npm run build` — 0 errors, all tests pass, build succeeds.

After Task 5, manual dev-server validation covers the full feature end-to-end.

**Constraints from parent:**
- All changes are limited to `project/srcs/frontend/src/`. No backend files are modified.
- The 59 existing tests must remain regression-free — no new tests are needed for structural wiring.
- Non-admin employees navigating to `/employees` must be redirected to `/conversations` (existing `RoleGuard` handles this automatically once the route is added to the admin group).

---

## Preconditions / Dependencies

- **Task 4 complete**: `src/pages/EmployeesPage.tsx` exists and compiles; `src/features/employees/` module is complete with `index.ts`, `types.ts`, `employeeService.ts`, `useEmployeeList.ts`, `EmployeeTable.tsx`, `EmployeeFilterBar.tsx`.
- **shadcn `table` + `select` installed** (Task 1): `src/components/ui/table.tsx` and `src/components/ui/select.tsx` exist.
- **`RoleGuard` pattern established** (Frontend Role-Based Routing Task 2): admin-only routes are wrapped in `<ProtectedRoute><RoleGuard allowedRoles={[UserRole.ADMIN]} redirectTo="/conversations"><MainLayout /></RoleGuard></ProtectedRoute>`. The `/employees` route is added as a child of this existing group.
- **`hasAnyRole` filter in `Sidebar.tsx`**: `visibleMenuItems = menuItems.filter((item) => hasAnyRole(item.roles))` already filters by role. Adding a new item with `roles: [UserRole.ADMIN]` is automatically hidden from employees.
- **`tsconfig.app.json`**: `verbatimModuleSyntax: true` — page imports must use value imports (not `import type`) since `EmployeesPage` is used as a JSX element at runtime.
- **`tsconfig.app.json`**: `noFallthroughCasesInSwitch: true` — the new `case "/employees"` in `getPageTitle()` must have an explicit `return` statement.
- **Working directory for npm commands**: Run from `project/srcs/frontend/`. Use `npm --prefix project/srcs/frontend run <script>` if the shell does not automatically cd there.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `solid-deep-design` — Selected — wiring changes are purely additive; SOLID review confirms these edits extend data without touching logic (OCP-safe).
- `tdd` — Not needed — no new logic; no new tests required per parent testing decisions for structural wiring.
- `find-docs` — Not needed — all APIs used here (`react-router-dom`, `lucide-react`) follow exact patterns already in the codebase; no new library surface is touched.
- `documentation-management` — Selected — for task creation and parent feature link update.
- `glossary-management` — Not needed — no new domain terms introduced.

### Documentation Reviewed

- Parent feature document `documentation/Features/to-do/Admin-Employee-Management-Page.md` — Steps 5.1–5.4 fully read; constraints, approach, and completion criteria extracted.
- `documentation/ADRs/ADR-010-base-ui-over-radix-ui-for-frontend.md` — Confirms `base-mira` style; not relevant to this wiring task (no new shadcn components installed).
- Memory Bank: `architecture.md` — `router.tsx`, `Sidebar.tsx`, and `Header.tsx` source map entries read; existing patterns confirmed.

### Related Existing Code

- `src/router.tsx` — admin-only `RoleGuard` group to extend with `/employees`
- `src/layouts/Sidebar.tsx` — `menuItems` array to extend with "Employees" entry
- `src/layouts/Header.tsx` — `getPageTitle()` switch to extend with `/employees` case
- `src/pages/EmployeesPage.tsx` — the completed page (created in Task 4) being wired in
- `src/routes/RoleGuard.tsx` — `allowedRoles={[UserRole.ADMIN]} redirectTo="/conversations"` handles unauthorized access automatically
- `src/routes/ProtectedRoute.tsx` — wraps `RoleGuard`; unauthenticated users are redirected to `/login` before `RoleGuard` runs

---

## Implementation Details

### Approach

Three surgical edits, each adding exactly one entry to an existing data-driven structure. No logic is touched:

1. **`router.tsx`**: The admin-only `RoleGuard` group is a React Router layout route with child routes. Adding `/employees` follows the identical pattern as `/dashboard`. Import is a value import (JSX usage at runtime).

2. **`Sidebar.tsx`**: `menuItems` is a plain array of objects. Adding "Employees" between Dashboard and Conversations requires one `import` addition (`Users` from lucide-react) and one object in the array. The existing `visibleMenuItems.filter((item) => hasAnyRole(item.roles))` filter will automatically hide "Employees" from non-admins.

3. **`Header.tsx`**: `getPageTitle()` is a `switch` on `location.pathname`. Adding one `case "/employees": return "Employees"` before `default` is the identical pattern as `/dashboard` and `/conversations`. The `noFallthroughCasesInSwitch` rule is satisfied by the explicit `return`.

These changes are **OCP-compliant** (open for extension, closed for modification): they add new entries to data structures without editing any existing logic, guard, or conditional.

### Files to Create/Modify

- [ ] `src/router.tsx` — add `EmployeesPage` import + `/employees` child route in admin-only group
- [ ] `src/layouts/Sidebar.tsx` — add `Users` to lucide import + "Employees" menu item
- [ ] `src/layouts/Header.tsx` — add `/employees` case to `getPageTitle()`

---

## Step-by-Step Implementation

### Step 5.1: Update `src/router.tsx`

**Goal:** Register `/employees` as a child route inside the existing admin-only `RoleGuard` group so the route is accessible to admins and automatically restricted (with redirect to `/conversations`) for authenticated employees.
**Dependencies:** `src/pages/EmployeesPage.tsx` must exist (Task 4 complete).

- [ ] Add `import { EmployeesPage } from "@/pages/EmployeesPage"` as a value import (not `import type`) — `EmployeesPage` is used as a JSX element at runtime, which `verbatimModuleSyntax: true` requires to be a value import.
- [ ] Add `<Route path="/employees" element={<EmployeesPage />} />` as a child route inside the admin-only `RoleGuard` group, alongside the existing `/dashboard` route.
- [ ] Run `npm run typecheck` — confirm 0 errors.

**Why this step is critical:**
Without this route, navigating to `/employees` returns a 404 (no route match). The `RoleGuard` wrapping the group (`allowedRoles={[UserRole.ADMIN]} redirectTo="/conversations"`) makes the access control automatic — no per-route guard is needed.

#### Implementation

```typescript
// src/router.tsx — full file after Step 5.1

import { BrowserRouter, Route, Routes } from "react-router-dom"
import { HomePage } from "@/pages/HomePage"
import { LoginPage } from "@/pages/LoginPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { ConversationsPage } from "@/pages/ConversationsPage"
import { EmployeesPage } from "@/pages/EmployeesPage"
import { ProtectedRoute } from "@/routes/ProtectedRoute"
import { RoleGuard } from "@/routes/RoleGuard"
import { MainLayout } from "@/layouts/MainLayout"
import { UserRole } from "@/types/auth"

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Admin-only routes */}
        <Route element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={[UserRole.ADMIN]} redirectTo="/conversations">
              <MainLayout />
            </RoleGuard>
          </ProtectedRoute>
        }>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
        </Route>

        {/* Employee-only routes */}
        <Route element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={[UserRole.EMPLOYEE]} redirectTo="/dashboard">
              <MainLayout />
            </RoleGuard>
          </ProtectedRoute>
        }>
          <Route path="/conversations" element={<ConversationsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

#### Edge Cases

1. **Unauthenticated user navigates to `/employees`**: `ProtectedRoute` intercepts before `RoleGuard` fires and redirects to `/login`. No special handling needed — the existing `ProtectedRoute` wrapper guarantees this.
2. **Authenticated employee navigates to `/employees`**: `RoleGuard` (with `allowedRoles={[UserRole.ADMIN]}`) redirects to `/conversations`. Again, no new code — the existing group wrapper handles it.
3. **Authenticated admin navigates to `/employees`**: `RoleGuard` passes, `MainLayout` renders, `EmployeesPage` mounts and `useEmployeeList`'s initial fetch fires.

---

### Step 5.2: Update `src/layouts/Sidebar.tsx`

**Goal:** Add "Employees" as an admin-only menu item between Dashboard and Conversations.
**Dependencies:** Step 5.1 complete (so the sidebar item navigates to a valid route).

- [ ] Add `Users` to the existing lucide-react named import block (alongside `Bot`, `LayoutDashboard`, `MessageSquare`).
- [ ] Add the "Employees" menu item object `{ title: "Employees", url: "/employees", icon: Users, roles: [UserRole.ADMIN] }` in the `menuItems` array between the existing Dashboard and Conversations entries.
- [ ] Run `npm run typecheck` — confirm 0 errors.

**Why this step is critical:**
Without this entry, admins have no sidebar link to the employee list — they would have to know and type the URL directly. The `hasAnyRole(item.roles)` filter in `visibleMenuItems` automatically hides the item from non-admins, satisfying User Story 2.

#### Implementation

Only the changed sections of `Sidebar.tsx` are shown below (rest of the file is unchanged):

```typescript
// src/layouts/Sidebar.tsx — modified import and menuItems only

import {
  Bot,
  LayoutDashboard,
  MessageSquare,
  Users,                        // ← added
} from "lucide-react"

// ... (all other imports unchanged) ...

  const menuItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      roles: [UserRole.ADMIN],
    },
    {
      title: "Employees",          // ← added between Dashboard and Conversations
      url: "/employees",
      icon: Users,
      roles: [UserRole.ADMIN],
    },
    {
      title: "Conversations",
      url: "/conversations",
      icon: MessageSquare,
      roles: [UserRole.EMPLOYEE],
    },
  ]
```

#### Edge Cases

1. **TypeScript inference on `roles` field**: TypeScript infers `roles` as `("ROLE_ADMIN")[]` for the new entry, which is assignable to `UserRole[]` (the parameter type of `hasAnyRole`). No explicit type annotation or cast is needed — same as Dashboard and Conversations.
2. **`Users` icon name collision**: `lucide-react` exports `Users` as a named export. There is no collision with existing imports (`Bot`, `LayoutDashboard`, `MessageSquare`).
3. **Active state**: `isActive = location.pathname === item.url` evaluates to `true` when on `/employees`, applying the active sidebar styling automatically.

---

### Step 5.3: Update `src/layouts/Header.tsx`

**Goal:** Add the `/employees` case to `getPageTitle()` so the header displays "Employees" when the admin is on the employee list page (User Story 18).
**Dependencies:** Step 5.1 complete (so the route `/employees` can actually be visited).

- [ ] Add `case "/employees": return "Employees"` inside `getPageTitle()` before the existing `default` case.
- [ ] Run `npm run typecheck` — confirm 0 errors.

**Why this step is critical:**
Without this case, navigating to `/employees` causes `getPageTitle()` to fall through to `default` and display "Control Panel" — an inaccurate header that violates User Story 18.

#### Implementation

Only the modified function is shown:

```typescript
// src/layouts/Header.tsx — getPageTitle() after Step 5.3

  const getPageTitle = () => {
    switch (location.pathname) {
      case "/dashboard":
        return "Dashboard"
      case "/conversations":
        return "Conversations"
      case "/employees":          // ← added
        return "Employees"
      default:
        return "Control Panel"
    }
  }
```

#### Edge Cases

1. **`noFallthroughCasesInSwitch: true`**: The new case uses an explicit `return "Employees"` — no fall-through. TypeScript will error if the `return` is omitted. This matches the pattern of all existing cases.
2. **Sub-routes under `/employees`**: If future sub-routes like `/employees/123` are added, `location.pathname === "/employees"` will return `false` for them and fall through to `default`. This is acceptable and intentional — sub-route titles are a future concern.

---

### Step 5.4: Final Regression

**Goal:** Confirm all three wiring changes compile correctly, do not break any existing tests, and produce a successful build.
**Dependencies:** Steps 5.1, 5.2, 5.3 complete.

- [ ] Run `npm run typecheck` (from `project/srcs/frontend/`) — confirm 0 errors.
- [ ] Run `npm run test` (from `project/srcs/frontend/`) — confirm all 59 tests pass (0 regressions).
- [ ] Run `npm run build` (from `project/srcs/frontend/`) — confirm 0 build errors and a successful output bundle.
- [ ] Mark Steps 5.1, 5.2, 5.3, 5.4 as `[x]` in the parent feature document.

**Why this step is critical:**
Wiring changes touch shared layout files (`Sidebar.tsx`, `Header.tsx`) and the routing tree (`router.tsx`). A typecheck regression in any of these would break the entire app shell. The regression gate proves the changes are additive and correct.

#### Edge Cases

1. **Command working directory**: If the shell is at the repo root, prefix with `npm --prefix project/srcs/frontend run typecheck` (and similarly for `test`, `build`). The commands themselves are unchanged.
2. **Test count stays at 59**: No new tests are added for structural wiring per the parent's testing decisions. If the count deviates, investigate before proceeding.

---

## Design Decisions

**Decision 1: Import position for `EmployeesPage` in `router.tsx`**
- **Why:** Placed after the existing page imports (`DashboardPage`, `ConversationsPage`) and before the route/layout imports, following the existing import grouping pattern (pages together, routes/layouts together). Consistent ordering aids readability and avoids triggering any ESLint import-order rule.
- **Alternatives considered:** Placing it alphabetically among all imports — rejected because the existing file already groups by import category, not alphabetically.

**Decision 2: "Employees" menu item placement in `menuItems` array**
- **Why:** Positioned between Dashboard and Conversations (index 1 of 3). Dashboard is the admin overview; Employees is admin data management — a natural secondary admin item before the employee-only Conversations item. This ordering reflects role-based grouping: admin items first, then employee items.
- **Alternatives considered:** After Conversations — rejected because it would interleave admin and employee items, making the sidebar harder to scan as more items are added.

**Decision 3: No `RoleGate` wrapper in Sidebar for "Employees"**
- **Why:** The existing `visibleMenuItems.filter((item) => hasAnyRole(item.roles))` already handles role-based visibility. Adding a `<RoleGate>` JSX wrapper around the Employees item would be redundant indirection — the data-driven filter is the established pattern in this file.
- **Alternatives considered:** `<RoleGate allowedRoles={[UserRole.ADMIN]}>` wrapper — rejected as duplication of the filter already present; violates OCP (modifying the rendering logic instead of extending the data).

**Decision 4: No new tests for wiring changes**
- **Why:** Per the parent's testing decisions: "`router.tsx`, `Sidebar.tsx`, `Header.tsx` — wiring changes; verified by typecheck + build + manual." These are structural pass-through changes with no business logic. The typecheck + build gate provides sufficient automatic coverage; manual validation covers the browser behavior.
- **Alternatives considered:** Writing a test asserting the `/employees` route renders `EmployeesPage` — rejected because it would test React Router's internal routing machinery (already tested by `react-router-dom`'s own test suite) rather than application behavior.

---

## Testing Considerations

### Automatic Validation

- [ ] `npm run typecheck` — 0 errors after each step (can run once after all 3 edits are complete)
- [ ] `npm run test` — all 59 tests pass (0 regressions; count must not change)
- [ ] `npm run build` — 0 build errors; bundle output matches previous successful build approximately

### Manual Validation

All manual checks require the dev server to be running (`npm run dev` from `project/srcs/frontend/`). Log in as an admin (seeded credentials: `admin` / `test`) for admin checks, and as a non-admin employee for employee checks.

**Sidebar and navigation (admin):**
- [x] Log in as admin → confirm the sidebar shows three items: Dashboard, Employees, Conversations (in that order)
- [x] Click "Employees" in the sidebar → confirm navigation to `/employees`
- [x] Confirm the browser URL changes to `/employees` and the page loads without errors

**Header:**
- [x] While on `/employees` → confirm the header title reads "Employees"
- [x] Navigate to `/dashboard` → confirm header still reads "Dashboard" (no regression)
- [x] Navigate to `/conversations` as employee → confirm header still reads "Conversations" (no regression)

**Table and data:**
- [x] Employee table loads and displays rows with columns: Username, Email, Status, First Name, Last Name, Actions
- [x] Active employees show a green badge ("Active"); inactive employees show a red badge ("Inactive")
- [x] Loading overlay appears briefly over the table when the page first loads

**Filters:**
- [x] Select "Username" in the filter field dropdown → text input appears; typing fewer than 3 characters does not trigger a new fetch; typing 3+ characters triggers a debounced fetch
- [x] Select "Status" in the filter field dropdown → boolean dropdown appears with "All", "Active", "Inactive"
- [x] Select "Active" → table updates to show only enabled employees; select "Inactive" → only disabled employees; select "All" → all employees returned
- [x] Select "No filter" in the field dropdown → filter clears, all employees returned

**Pagination:**
- [x] Page size selector shows 5 / 10 / 25 / 50 options; changing the value refreshes the table immediately
- [x] "Previous" and "Next" buttons work; "Page X of Y" label updates correctly
- [x] "Previous" is disabled on page 1; "Next" is disabled on the last page

**Action buttons:**
- [x] Hovering over the pencil icon shows tooltip "Edit employee (coming soon)"
- [x] Hovering over the trash icon shows tooltip "Delete employee (coming soon)"

**Role-based access (employee):**
- [x] Log in as an employee (non-admin) → confirm the sidebar does NOT show "Employees"
- [x] While logged in as an employee, navigate directly to `/employees` → confirm redirect to `/conversations`

**Unauthenticated access:**
- [x] Log out and navigate directly to `/employees` → confirm redirect to `/login`

**Error state (optional — requires stopping the backend):**
- [x] With the backend stopped, navigate to `/employees` as admin → confirm the `ErrorMessage` component renders in place of the table and pagination area, while `EmployeeFilterBar` remains visible above it <!-- REVIEW-FIX: Added error-state check to match the 17 deferred manual checks noted in the Task 4 progress entry -->

---

## Related Code Explanations

- `src/router.tsx` — admin-only `RoleGuard` group (`ProtectedRoute → RoleGuard → MainLayout`) is the pattern being extended
- `src/layouts/Sidebar.tsx:27–40` — `menuItems` array and `visibleMenuItems` filter — the data-driven pattern being extended
- `src/layouts/Header.tsx:20–29` — `getPageTitle()` switch — the pattern being extended
- `src/routes/RoleGuard.tsx` — `allowedRoles={[UserRole.ADMIN]} redirectTo="/conversations"` makes `/employees` inaccessible to non-admins without any code change to `RoleGuard` itself
- `src/pages/EmployeesPage.tsx` — the page being wired in (created in Task 4)
- `src/features/employees/index.ts` — public API surface for the employee feature

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected for this task
- [x] `src/router.tsx` updated: `EmployeesPage` imported (value import); `/employees` child route added to admin-only `RoleGuard` group
- [x] `src/layouts/Sidebar.tsx` updated: `Users` added to lucide import; "Employees" menu item with `roles: [UserRole.ADMIN]` added between Dashboard and Conversations
- [x] `src/layouts/Header.tsx` updated: `case "/employees": return "Employees"` added before `default` in `getPageTitle()`
- [x] `npm run typecheck` — 0 errors
- [x] `npm run test` — 59/59 tests pass (0 regressions)
- [x] `npm run build` — build succeeds
- [x] Steps 5.1, 5.2, 5.3, 5.4 marked `[x]` in the parent feature document [[Admin-Employee-Management-Page]]
- [x] Manual validation steps documented and ready for the user to execute
- [x] Memory Bank `context.md` updated to reflect Task 5 complete and manual validation pending; `progress.md` entry prepended with today's date and link to [[Admin-Employee-Management-Page]] <!-- REVIEW-FIX: Memory Bank update is standard project practice at the end of every task; omitting it would leave context.md stale -->
- [x] After manual validation passes: move this task document to `Tasks/done/` and all four previous task documents (`task-1` through `task-4`) to `Tasks/done/`; move the parent feature document from `Features/to-do/` to `Features/done/` <!-- REVIEW-FIX: Feature close-out (move docs to done/) is the final step of every completed feature per the documentation-management skill conventions -->
