# Task: App Settings Page and Admin Navigation Wiring

#task #current #low-complexity #parent-admin-app-settings-page

**Parent:** [[Features/to-do/Admin-App-Settings-Page]]
**Parent Type:** Feature
**Related Step(s):** Phase 4 — Steps 4.1, 4.2, 4.3, 4.4
**Estimated Complexity:** Low

---

## Goal

Wire the completed `app-settings` feature module into the application shell: create the thin `AppSettingsPage` route target, register `/app-settings` inside the existing admin-only route group, add an "App Settings" sidebar entry visible only to admins, and add the page title case to the header — completing the full end-to-end admin flow for the feature.

---

## Parent Context

[[Features/to-do/Admin-App-Settings-Page]] is a frontend-only admin feature. Tasks 1–3 delivered the full feature module:

- **Task 1** — `types.ts` (4 interfaces) + `appSettingsService.ts` (3 service functions)
- **Task 2** — `useAppSettings.ts` (deep module: load/save lifecycle, enabled-model filtering, masked-key safety, PATCH null semantics)
- **Task 3** — `AppSettingsForm.tsx` (controlled form component) + `AppSettingsForm.test.tsx` (5 security tests) + `index.ts` (public API surface)

**Task 4 covers Phase 4: page, router, sidebar, and header wiring.** These are structural additions — no new tests, no new business logic. The parent explicitly states wiring changes are "verified by typecheck/build and manual browser checks."

### Phase 4 steps from parent

| Parent Step | Scope |
|-------------|-------|
| Step 4.1 | Create `AppSettingsPage.tsx` — thin assembler over `useAppSettings()` and `AppSettingsForm` |
| Step 4.2 | Update `router.tsx` — import `AppSettingsPage`, add `/app-settings` inside the admin-only group |
| Step 4.3 | Update `Sidebar.tsx` — add `Settings` icon import, add "App Settings" menu item with `roles: [UserRole.ADMIN]` |
| Step 4.4 | Update `Header.tsx` — add `/app-settings` case returning `"App Settings"` to `getPageTitle()` |

### Constraints from parent

- Route path is exactly `/app-settings` — matches the backend resource name.
- `AppSettingsPage` owns no API calls, transformations, or masked-key handling — all logic lives in the hook.
- The sidebar item must be invisible to employees; `hasAnyRole(item.roles)` filtering already handles this.
- Employees who navigate directly to `/app-settings` must be redirected to `/conversations` — the existing `RoleGuard(allowedRoles=[UserRole.ADMIN], redirectTo="/conversations")` at the admin group level handles this automatically.
- Unauthenticated users who navigate to `/app-settings` must be redirected to `/login` — `ProtectedRoute` at the admin group level handles this automatically.
- Do not extract a `RoleLayout` abstraction. The parent explicitly states the duplication between admin and employee route groups remains below the refactor trigger.
- `Header.tsx` uses semicolons. Follow local file style when editing it.

---

## Preconditions / Dependencies

- **Task 1 complete**: `src/features/app-settings/types.ts`, `src/features/app-settings/services/appSettingsService.ts`. Baseline after Task 1: 83/83 tests.
- **Task 2 complete**: `src/features/app-settings/hooks/useAppSettings.ts` (exports `useAppSettings` and `UseAppSettingsResult`). Baseline after Task 2: 95/95 tests.
- **Task 3 complete**: `src/features/app-settings/components/AppSettingsForm.tsx`, `src/features/app-settings/index.ts`. Baseline after Task 3: 100/100 tests.
- `src/features/app-settings/index.ts` already exports `AppSettingsForm` and `useAppSettings` — `AppSettingsPage` imports from this index, not from deep sub-paths.
- `src/layouts/Sidebar.tsx`: `menuItems` array already has `Dashboard` and `Employees` (both `roles: [UserRole.ADMIN]`) and `Conversations` (`roles: [UserRole.EMPLOYEE]`). The existing `visibleMenuItems = menuItems.filter((item) => hasAnyRole(item.roles))` logic handles visibility automatically.
- `src/layouts/Header.tsx`: `getPageTitle()` switch already has cases for `/dashboard`, `/conversations`, `/employees`. Adding one case does not require restructuring.
- `src/router.tsx`: Admin-only route group at lines 20–29 already wraps `/dashboard` and `/employees` under `ProtectedRoute → RoleGuard(ADMIN, redirectTo="/conversations") → MainLayout`. Adding one `<Route>` child is all that is needed.
- `lucide-react` 1.21.0 is installed. `Settings` is a standard long-established lucide icon available at this version.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — Selected — verified task location, task template, parent update requirement.
- `memory-bank` — Selected — loaded all Memory Bank files; confirmed Tasks 1–3 complete, 100/100 test baseline.
- `solid-deep-design` — Selected — applied depth and SRP analysis to `AppSettingsPage` (shallow by design — correct thin assembler); confirmed no new seams needed for structural wiring files.
- `tdd` — Selected (informally) — confirmed no TDD needed for wiring changes per parent spec; automatic validation is typecheck/build; manual validation is browser checks.
- `find-docs` — Selected for verification — React Router v6.30.3 nested route pattern verified from existing working `router.tsx` (dashboard/employees routes in the exact same admin-only group); lucide-react `Settings` icon verified as standard. No Context7 queries were required because all patterns are proven by existing working code in the same files.
- `glossary-management` — Selected — no new domain terms introduced by Task 4 wiring.
- `task-reviewer` — Selected — this document is reviewed and patched after initial creation.

### Documentation Reviewed

- **`project/srcs/frontend/src/router.tsx`** (full file) — confirmed exact admin-only route group structure (lines 19–29); confirmed import pattern and `<Route path="..." element={<Page />} />` child syntax.
- **`project/srcs/frontend/src/layouts/Sidebar.tsx`** (full file) — confirmed icon imports (lines 1–6), `menuItems` array structure (lines 26–45), `roles` field shape.
- **`project/srcs/frontend/src/layouts/Header.tsx`** (full file) — confirmed semicolon style, `getPageTitle()` switch structure (lines 18–29).
- **`project/srcs/frontend/src/pages/DashboardPage.tsx`** (full file) — primary prior art for page heading pattern (`<h1 className="text-3xl font-bold">`, `<p className="text-muted-foreground">`).
- **`project/srcs/frontend/src/features/app-settings/index.ts`** — confirmed `AppSettingsForm` and `useAppSettings` are exported.
- **[[Features/to-do/Admin-App-Settings-Page]] — Section 7 (router), Section 8 (sidebar), Section 9 (header), Section 6 (page)** — confirmed exact code to write for all 4 steps.

### Version Information Checked

| Tool | Project version | Source |
|------|-----------------|--------|
| React | 19.2.4 | `package.json` |
| TypeScript | 5.9.3 | `package.json`, `tsconfig.app.json` |
| react-router-dom | 6.30.3 | `package.json` |
| lucide-react | 1.21.0 | `package.json` |

### Related Existing Code

- `project/srcs/frontend/src/features/app-settings/index.ts` — Public API surface for the feature; `AppSettingsPage` imports from here.
- `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.ts` — Source of `useAppSettings` and `UseAppSettingsResult`; `AppSettingsPage` calls this hook.
- `project/srcs/frontend/src/features/app-settings/components/AppSettingsForm.tsx` — Form component; `AppSettingsPage` renders this.
- `project/srcs/frontend/src/pages/DashboardPage.tsx:1` — Prior art for page heading structure.
- `project/srcs/frontend/src/pages/EmployeesPage.tsx:1` — Prior art for `flex flex-col gap-6` root, heading, feature hook consumption.
- `project/srcs/frontend/src/router.tsx:19` — Admin-only route group where `/app-settings` will be added.
- `project/srcs/frontend/src/layouts/Sidebar.tsx:26` — `menuItems` array where "App Settings" item will be added.
- `project/srcs/frontend/src/layouts/Header.tsx:18` — `getPageTitle()` switch where `/app-settings` case will be added.

---

## Implementation Details

### Approach

Four sequential changes, each independent but all required before manual validation:

1. **Create `AppSettingsPage.tsx`** — pure thin assembler, no state, no API calls. Calls `useAppSettings()` and spreads the result onto `AppSettingsForm`. All rendering, all error states, and all business rules live in the hook and form (Tasks 2–3). The page's only job is to be the route target.
2. **Modify `router.tsx`** — add one import line and one `<Route>` child inside the existing admin-only group. No restructuring.
3. **Modify `Sidebar.tsx`** — add `Settings` to the lucide-react import and add one menu item object to `menuItems`. The existing `visibleMenuItems` filter and rendering loop need no changes.
4. **Modify `Header.tsx`** — add one `case` to the existing `getPageTitle()` switch. Preserve semicolons (local file style).

### SOLID + Deep Module Analysis

**`AppSettingsPage.tsx`** — **Shallow by design (correct thin assembler pattern).**
- **SRP**: One responsibility — serve as the route target and compose `useAppSettings()` with `AppSettingsForm`.
- **Deletion test**: Deleting the page would make `/app-settings` un-routable. The complexity (hook + form) does not scatter — the route simply breaks. The page earns its keep as the composition point between the router and the feature module, not as a depth provider.
- **Depth verdict: SHALLOW (correct)** — thin assemblers between route infrastructure and deep feature modules are the right architecture. The depth is in `useAppSettings` (Task 2), not here.

**`router.tsx`, `Sidebar.tsx`, `Header.tsx` changes** — Purely additive edits. Each file has SRP at the file level: router owns routes, sidebar owns navigation, header owns the page title. Adding one item to each does not create a new reason to change; it extends existing responsibility-sets.

**No new seams**: The route, sidebar, and header are wiring infrastructure. They do not introduce ports or adapters. The admin `RoleGuard` already wraps the entire admin-only route group — adding `/app-settings` inside it inherits access control without any new code.

### Files to Create/Modify

- [ ] `project/srcs/frontend/src/pages/AppSettingsPage.tsx` — **New**: thin page assembler
- [ ] `project/srcs/frontend/src/router.tsx` — **Modify**: add import and `/app-settings` route in admin-only group
- [ ] `project/srcs/frontend/src/layouts/Sidebar.tsx` — **Modify**: add `Settings` icon import, add "App Settings" menu item
- [ ] `project/srcs/frontend/src/layouts/Header.tsx` — **Modify**: add `/app-settings` case to `getPageTitle()`

---

## Step-by-Step Implementation

### Step 4.1: Create `AppSettingsPage.tsx`

**Goal:** Create the thin route target that composes `useAppSettings()` with `AppSettingsForm`.
**Dependencies:** Tasks 1–3 complete; `src/features/app-settings/index.ts` exists with `AppSettingsForm` and `useAppSettings` exported.

- [ ] Create `project/srcs/frontend/src/pages/AppSettingsPage.tsx` with the content below.
- [ ] Run `npm --prefix project/srcs/frontend run typecheck` — confirm 0 errors.

**Why this step is critical:** The page is the composition root between the router and the feature module. It keeps the route definition and the feature internals decoupled — the router knows only `AppSettingsPage`, not `useAppSettings` or `AppSettingsForm`.

#### Implementation

<!-- REVIEW-FIX: No explicit `import React from 'react'` is needed — the React 17+ JSX transform is active in this project (Vite + React 19). All other pages (DashboardPage.tsx, EmployeesPage.tsx) omit this import; AppSettingsPage.tsx follows the same convention. -->
```tsx
import { AppSettingsForm, useAppSettings } from "@/features/app-settings"

export function AppSettingsPage() {
  const appSettings = useAppSettings()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">App Settings</h1>
        <p className="text-muted-foreground">
          Configure OpenRouter access and platform defaults.
        </p>
      </div>

      <AppSettingsForm {...appSettings} />
    </div>
  )
}
```

**Import from the index**, not from deep sub-paths (`@/features/app-settings/hooks/useAppSettings`). This is the rule set in `index.ts` Step 3.3.

#### Edge Cases

1. **Case:** TypeScript warns about the `reload` prop flowing through `{...appSettings}` onto `AppSettingsForm` without being used by the form.
   **Handling:** `reload` is part of `UseAppSettingsResult` and therefore part of `AppSettingsFormProps`. The form's destructured parameter list does not include `reload` — it is received as a prop but not destructured. TypeScript's `noUnusedParameters` only flags named destructured parameters, not props that are present in the type but not destructured in the function signature. No TypeScript error will occur.

2. **Case:** `AppSettingsPage` is defined without `"use client"` or similar directives.
   **Handling:** This is a React 19 + Vite project without Next.js. No server/client boundary directives are needed or used anywhere in the codebase. The page is a standard React function component.

3. **Case:** The page heading `<h1>App Settings</h1>` duplicates the header title set in Step 4.4.
   **Handling:** This is the established pattern across all pages: `DashboardPage` has `<h1>Dashboard</h1>` and the header shows "Dashboard"; `EmployeesPage` has `<h1>Employees</h1>` and the header shows "Employees". The header title and the page heading serve different visual roles (top bar vs. main content area). This duplication is intentional and consistent.

4. **Case:** The `{...appSettings}` spread passes all 14 hook return values as props, including `isLoading`, `isSaving`, and `error`. These are used by the form to gate the save button and display states.
   **Handling:** The form is typed as `AppSettingsFormProps = UseAppSettingsResult`, so all 14 properties are required. The spread satisfies all of them in one operation. This is the `AppSettingsForm` design from Task 3 — the page is intentionally thin.

---

### Step 4.2: Update `router.tsx` — Add `/app-settings` Route

**Goal:** Register `/app-settings` inside the existing admin-only route group so `AppSettingsPage` is reachable by admin users and guarded from others.
**Dependencies:** Step 4.1 complete (`AppSettingsPage` importable).

- [ ] Add the import for `AppSettingsPage` to `router.tsx`.
- [ ] Add `<Route path="/app-settings" element={<AppSettingsPage />} />` inside the admin-only route group, after `/employees`.
- [ ] Run `npm --prefix project/srcs/frontend run typecheck` — confirm 0 errors.

**Why this step is critical:** Without this route, `/app-settings` renders the default route (or a 404). The route must be inside the admin-only group so it inherits `ProtectedRoute → RoleGuard(ADMIN) → MainLayout` — giving unauthenticated users a `/login` redirect and employees a `/conversations` redirect automatically.

#### Current router.tsx state (relevant section)

```tsx
// Lines 1–11 (current imports)
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

// Lines 19–29 (admin-only group, current)
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
```

#### Implementation

Add the import (after the `EmployeesPage` import line):

```tsx
import { AppSettingsPage } from "@/pages/AppSettingsPage"
```

Add the route inside the admin-only group (after the `/employees` route):

```tsx
<Route path="/app-settings" element={<AppSettingsPage />} />
```

**Complete admin-only group after change:**

```tsx
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
  <Route path="/app-settings" element={<AppSettingsPage />} />
</Route>
```

#### Edge Cases

1. **Case:** `AppSettingsPage` is added outside the admin-only group by mistake (e.g., after the closing `</Route>` of the group).
   **Handling:** If added outside the group, the route would be accessible to unauthenticated users and employees without restriction. Verify the `<Route path="/app-settings" ...>` is placed as a direct child of the admin-only group's parent `<Route element={...}>`, not after the `</Route>` closing tag. The correct indentation and placement is shown above.

2. **Case:** React Router v6 nested routes render child routes through the parent route's `<Outlet />`.
   **Handling:** `MainLayout` renders `<Outlet />` in its `<main>` section (confirmed from architecture.md). This is how `/dashboard` and `/employees` already render their pages — `AppSettingsPage` uses the exact same mechanism.

3. **Case:** Two routes share the same path.
   **Handling:** Each path in the admin group is unique: `/dashboard`, `/employees`, `/app-settings`. No collision.

---

### Step 4.3: Update `Sidebar.tsx` — Add "App Settings" Menu Item

**Goal:** Add an "App Settings" navigation entry visible only to admin users.
**Dependencies:** None (independent of Steps 4.1 and 4.2, but logically grouped for the same deployment).

- [ ] Add `Settings` to the lucide-react import in `Sidebar.tsx`.
- [ ] Add the "App Settings" menu item object to the `menuItems` array, after the "Employees" entry.
- [ ] Run `npm --prefix project/srcs/frontend run typecheck` — confirm 0 errors.

**Why this step is critical:** Without the sidebar entry, admins must know the URL to navigate to `/app-settings`. The parent feature user story 1 states: "As an Admin, I want an `App Settings` item in the sidebar, so that I can reach platform-level configuration without knowing the URL." User story 3 states that employees must not see the item.

#### Current Sidebar.tsx state (relevant sections)

```typescript
// Lines 1–6 (current icon imports)
import {
  Bot,
  LayoutDashboard,
  MessageSquare,
  Users,
} from "lucide-react"

// Lines 26–45 (current menuItems array)
const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    roles: [UserRole.ADMIN],
  },
  {
    title: "Employees",
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

#### Implementation

**Step 4.3a:** Add `Settings` to the icon import:

```typescript
import {
  Bot,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Users,
} from "lucide-react"
```

(Alphabetical order within the import block maintains consistency.)

**Step 4.3b:** Add the menu item after "Employees" and before "Conversations":

```typescript
const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    roles: [UserRole.ADMIN],
  },
  {
    title: "Employees",
    url: "/employees",
    icon: Users,
    roles: [UserRole.ADMIN],
  },
  {
    title: "App Settings",
    url: "/app-settings",
    icon: Settings,
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

The existing `visibleMenuItems = menuItems.filter((item) => hasAnyRole(item.roles))` at line 47 already handles role-based visibility. No rendering loop changes are needed.

#### Edge Cases

1. **Case:** `Settings` is not a named export from `lucide-react` at version 1.21.0.
   **Handling:** `Settings` is a standard, long-established icon in the lucide library. It appears in all published versions of `lucide-react`. If TypeScript reports a missing export during typecheck, an alternative icon like `Cog` or `SlidersHorizontal` can be used — but this is extremely unlikely.

2. **Case:** The icon import list is in a different order in the actual file.
   **Handling:** The import block can be in any order. Alphabetical order is preferred for consistency but is not enforced by TypeScript or linting. Match the existing style — if it is not alphabetical, add `Settings` in a position that keeps the block readable.

3. **Case:** An employee who navigates directly to `/app-settings` sees the sidebar with no "App Settings" item and is then redirected by `RoleGuard`.
   **Handling:** The sidebar renders based on `hasAnyRole(item.roles)` checked against localStorage at render time. Employees have `ROLE_EMPLOYEE`, not `ROLE_ADMIN`, so `hasAnyRole([UserRole.ADMIN])` returns false and the item is invisible. Simultaneously, the `RoleGuard` for the admin-only route group redirects the employee to `/conversations` before `MainLayout` (and the sidebar) renders. The sidebar's role filter is a UI-layer defense; `RoleGuard` is the authoritative access control.

---

### Step 4.4: Update `Header.tsx` — Add `/app-settings` Page Title

**Goal:** Make the header display "App Settings" as the page title when the user is on `/app-settings`.
**Dependencies:** None (independent of other steps).

- [ ] Add `case "/app-settings": return "App Settings"` to the `getPageTitle()` switch in `Header.tsx`.
- [ ] Match the local file style: semicolons on outer statements, no semicolons after `return` values inside the switch (matching existing cases).
- [ ] Run `npm --prefix project/srcs/frontend run typecheck` — confirm 0 errors.

**Why this step is critical:** Without this case, `getPageTitle()` falls through to `default: return "Control Panel"`, showing an incorrect title while on the App Settings page. The header title is the only visible page label in the top bar.

#### Current Header.tsx `getPageTitle()` (lines 18–29)

```typescript
const getPageTitle = () => {
  switch (location.pathname) {
    case "/dashboard":
      return "Dashboard"
    case "/conversations":
      return "Conversations"
    case "/employees":
      return "Employees"
    default:
      return "Control Panel"
  }
}
```

#### Implementation

Add the new case after `"/employees"` and before `default`:

```typescript
const getPageTitle = () => {
  switch (location.pathname) {
    case "/dashboard":
      return "Dashboard"
    case "/conversations":
      return "Conversations"
    case "/employees":
      return "Employees"
    case "/app-settings":
      return "App Settings"
    default:
      return "Control Panel"
  }
}
```

**File-level style note:** `Header.tsx` uses semicolons at the end of import statements and other outer statements (e.g., `import { SidebarTrigger } from "@/components/ui/sidebar";`). The `return` values inside the switch do not use semicolons — match the existing style exactly. Do not add semicolons after `return "App Settings"`.

#### Edge Cases

1. **Case:** TypeScript `noFallthroughCasesInSwitch` is enabled and adding a case incorrectly (without a `return`) causes a compile error.
   **Handling:** The case uses `return "App Settings"`, which exits the function. No fallthrough. TypeScript will not complain.

2. **Case:** The `getPageTitle()` function is called on every render with the current `location.pathname`. If an admin navigates from `/dashboard` to `/app-settings`, the header re-renders and correctly shows "App Settings".
   **Handling:** `useLocation()` is reactive to navigation events in React Router v6. The existing cases for `/dashboard`, `/employees`, and `/conversations` already rely on this. No additional logic needed.

---

## Design Decisions

**Decision 1: Import from `@/features/app-settings` index, not from deep sub-paths**
- **Why:** The parent feature spec explicitly states: "AppSettingsPage imports from this index. Other features must not deep-import from `features/app-settings/services` or `features/app-settings/hooks`." Importing from the barrel index encapsulates the feature's internal directory structure — if the hook or form is reorganized later, only the index needs updating, not the page.
- **Alternatives considered:** Import `useAppSettings` from `@/features/app-settings/hooks/useAppSettings` and `AppSettingsForm` from `@/features/app-settings/components/AppSettingsForm` — rejected because it creates coupling to internal paths and violates the module boundary the index establishes.

**Decision 2: `{...appSettings}` spread instead of explicit prop destructuring in `AppSettingsPage`**
- **Why:** The parent feature spec prescribes this pattern, and it matches the intent: the page is a thin assembler that passes everything from the hook to the form. Explicit destructuring would create 14 lines of pass-through props with zero added value. The spread is semantically correct here because `useAppSettings()` returns exactly `UseAppSettingsResult`, and `AppSettingsForm` accepts exactly `UseAppSettingsResult` as its props type.
- **Alternatives considered:** Destructure and pass props explicitly — rejected because it adds boilerplate with no benefit; if `UseAppSettingsResult` grows a new field, the page would need updating unnecessarily.

**Decision 3: Do not extract a `RoleLayout` abstraction**
- **Why:** The parent feature explicitly states this: "RoleGuard route group remains explicit: Adding one more admin child route does not require extracting a `RoleLayout`. The existing duplication between admin and employee route groups remains below the documented refactor trigger." Three repeated route groups would justify the abstraction; two do not.
- **Alternatives considered:** Extract `RoleLayout` component wrapping `ProtectedRoute → RoleGuard → MainLayout` — rejected because it introduces premature abstraction. The duplication is two instances of an 8-line block, not a significant burden.

**Decision 4: "App Settings" placed after "Employees" in the sidebar `menuItems` array**
- **Why:** Admin tools are grouped together: Dashboard, Employees, App Settings. Settings is a configuration concern (not a primary data management tool like Employees), so it sits after Employees. Visual grouping by concern is more intuitive than alphabetical ordering for navigation menus.
- **Alternatives considered:** Alphabetical order (App Settings before Dashboard) — rejected; alphabetical order of navigation items is not a convention in this codebase. Placing before Employees — rejected; settings is secondary to user management in an admin's daily workflow.

**Decision 5: `Settings` icon from lucide-react for the sidebar entry**
- **Why:** The parent feature spec explicitly recommends `Settings` from lucide-react. It is semantically appropriate — universally recognized as a gear/configuration icon — and consistent with the existing icon family (all sidebar icons are from `lucide-react`).
- **Alternatives considered:** `Cog`, `SlidersHorizontal`, `Wrench` — all valid fallbacks if `Settings` proves unavailable, but `Settings` is the standard choice and is present in lucide-react 1.21.0.

**Decision 6: Semicolons preserved in `Header.tsx`**
- **Why:** The parent feature explicitly warns: "Header.tsx currently uses semicolons while most frontend files omit them. Keep changes minimal and follow local file style when editing that file." Consistency within a file outweighs consistency across files. Changing the semicolons would create unnecessary diff noise.
- **Alternatives considered:** Standardize to no-semicolons when editing — rejected per parent spec guidance and the risk of creating unrelated file changes.

---

## Testing Considerations

### Automatic Validation

- [ ] After Step 4.1: Run `npm --prefix project/srcs/frontend run typecheck` — confirm `AppSettingsPage.tsx` has 0 TypeScript errors.
- [ ] After Step 4.2: Run `npm --prefix project/srcs/frontend run typecheck` — confirm `router.tsx` import and new route compile with 0 errors. <!-- REVIEW-FIX: Added per-step typecheck after each wiring file modification so typos in the AppSettingsPage import path or route path string are caught immediately rather than at the final combined check -->
- [ ] After Step 4.3: Run `npm --prefix project/srcs/frontend run typecheck` — confirm `Settings` is resolved from `lucide-react` and the `menuItems` entry typechecks with 0 errors. <!-- REVIEW-FIX: Catches a wrong icon name (e.g. "Setting" instead of "Settings") at the step it is introduced, not at the final combined typecheck -->
- [ ] After Step 4.4: Run `npm --prefix project/srcs/frontend run typecheck` — confirm the new `case "/app-settings"` in `getPageTitle()` has 0 errors. <!-- REVIEW-FIX: The Header.tsx switch is pure string logic but a malformed case string would only be caught at runtime without this step-level check -->
- [ ] After Steps 4.1–4.4: Run `npm --prefix project/srcs/frontend run test` — confirm all 100 existing tests still pass (no regressions; no new tests added by Task 4).
- [ ] After Steps 4.1–4.4: Run `npm --prefix project/srcs/frontend run typecheck` — confirm 0 errors across all 4 changed/created files (final combined check).
- [ ] After Steps 4.1–4.4: Run `npm --prefix project/srcs/frontend run build` — confirm Vite build succeeds; the `AppSettingsPage` bundle chunk should appear in the output.

### Manual Validation

The following browser checks must be performed by a human after all 4 steps are complete. These validate the end-to-end user experience that cannot be covered by unit tests or typecheck.

**Sidebar visibility:**

- [ ] Log in as an admin. Confirm "App Settings" appears in the sidebar below "Employees". Confirm the `Settings` icon is visible.
- [ ] Log in as an employee. Confirm "App Settings" does NOT appear in the sidebar.

**Route access control:**

- [ ] As an unauthenticated user, navigate directly to `http://localhost:3000/app-settings`. Confirm you are redirected to `/login` with the "You need to sign in…" message.
- [ ] As an employee, navigate directly to `http://localhost:3000/app-settings`. Confirm you are redirected to `/conversations`.
- [ ] As an admin, navigate to `/app-settings` via the sidebar. Confirm the page renders with the "App Settings" heading.

**Header title:**

- [ ] As an admin on `/app-settings`, confirm the header top bar shows "App Settings" as the page title (not "Control Panel").
- [ ] Navigate from `/app-settings` to `/dashboard`. Confirm the header title changes to "Dashboard".

**Page rendering:**

- [ ] Confirm the page loads the three cards (OpenRouter API Key, Default LLM Model, Last Updated) from `AppSettingsForm`.
- [ ] Confirm the API key input is empty on load (even if a key is configured server-side).
- [ ] Confirm the "Configured" / "Not configured" status reflects the server state.
- [ ] If no enabled LLM models exist: confirm the Default Model selector is disabled and the helper text "Add and enable an LLM model before selecting a default." appears.

**Save interaction (golden path):**

- [ ] Type a new API key in the password input. Click "Save settings". Confirm the input clears after success and the success message "App settings saved." appears.
- [ ] Select a different default model (if enabled models exist). Click "Save settings". Confirm the selection persists after the response.
- [ ] Select "No default model". Click "Save settings". Confirm the default model is cleared server-side.
- [ ] Leave the API key input blank and change the default model. Click "Save settings". Confirm the existing API key is preserved (the "Configured" status remains).

---

## Related Code Explanations

- `project/srcs/frontend/src/features/app-settings/index.ts` — Public API surface; `AppSettingsPage` imports from here.
- `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.ts:1` — Deep module owning all state, load/save lifecycle, masked-key safety, and PATCH null semantics for the form.
- `project/srcs/frontend/src/features/app-settings/components/AppSettingsForm.tsx:1` — Controlled form component rendered by `AppSettingsPage`.
- `project/srcs/frontend/src/router.tsx:20` — Admin-only route group; `AppSettingsPage` is added as a child route here.
- `project/srcs/frontend/src/layouts/Sidebar.tsx:26` — `menuItems` array; "App Settings" item added after "Employees".
- `project/srcs/frontend/src/layouts/Header.tsx:18` — `getPageTitle()` switch; `/app-settings` case added.
- `project/srcs/frontend/src/routes/RoleGuard.tsx:1` — Provides admin-only access control for the entire route group including `/app-settings`.
- `project/srcs/frontend/src/routes/ProtectedRoute.tsx:1` — Redirects unauthenticated users to `/login` before `RoleGuard` runs.

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task.
- [x] Relevant skills reviewed and selected for this task.
- [x] Version-matched documentation reviewed for react-router-dom, lucide-react, and React.
- [x] `project/srcs/frontend/src/pages/AppSettingsPage.tsx` created — thin assembler with heading + `AppSettingsForm` spread.
- [x] Page imports from `@/features/app-settings` index (not from deep sub-paths).
- [x] `project/srcs/frontend/src/router.tsx` updated — `AppSettingsPage` imported, `/app-settings` added inside admin-only route group.
- [x] `project/srcs/frontend/src/layouts/Sidebar.tsx` updated — `Settings` added to lucide-react import, "App Settings" menu item added with `roles: [UserRole.ADMIN]`.
- [x] `project/srcs/frontend/src/layouts/Header.tsx` updated — `case "/app-settings": return "App Settings"` added, preserving local semicolon style.
- [x] `npm --prefix project/srcs/frontend run test` passes: 100/100 (no regressions).
- [x] `npm --prefix project/srcs/frontend run typecheck` = 0 errors.
- [x] `npm --prefix project/srcs/frontend run build` = success.
- [x] Manual validation steps documented in Testing Considerations.
- [ ] Parent feature Phase 4 steps (4.1, 4.2, 4.3, 4.4) marked complete when this task is executed. *(deferred to Task 5 close-out — this task does not own parent doc updates)*
- [ ] Parent feature Task 4 section updated with wiki link `[[Admin-App-Settings-Page-task-4-page-and-wiring]]`. *(deferred to Task 5 close-out — this task does not own parent doc updates)*

---

## Post-Review Notes

### Implementation summary (executed 2026-06-28)

All four wiring steps executed sequentially with per-step typecheck validation; final combined validations run after all four.

- **Step 4.1 — `AppSettingsPage.tsx` created** at `project/srcs/frontend/src/pages/AppSettingsPage.tsx` (18 lines). Thin assembler exactly as specified: imports `AppSettingsForm, useAppSettings` from the `@/features/app-settings` index (barrel import, not deep sub-paths), renders `<h1>App Settings</h1>` + subtitle inside `flex flex-col gap-6`, spreads `appSettings` onto `<AppSettingsForm>`. No `import React from 'react'` (React 17+ JSX transform; consistent with `DashboardPage.tsx` and `EmployeesPage.tsx`).
- **Step 4.2 — `router.tsx` updated**: `AppSettingsPage` import added after the `EmployeesPage` import; `<Route path="/app-settings" element={<AppSettingsPage />} />` added as a child of the existing admin-only `<Route element={ProtectedRoute → RoleGuard(ADMIN) → MainLayout}>`. Placed last in the admin group, after `/employees`.
- **Step 4.3 — `Sidebar.tsx` updated**: `Settings` added to the `lucide-react` import (alphabetical position between `MessageSquare` and `Users`); "App Settings" menu item added with `url: "/app-settings"`, `icon: Settings`, `roles: [UserRole.ADMIN]`, placed after "Employees" and before "Conversations". The existing `visibleMenuItems = menuItems.filter((item) => hasAnyRole(item.roles))` handles role-based visibility automatically — no rendering loop changes needed.
- **Step 4.4 — `Header.tsx` updated**: `case "/app-settings": return "App Settings"` added to `getPageTitle()` between the `/employees` case and the `default` case. Matches the local file style: outer file statements use semicolons; the `return` values inside the switch do not.

### Validation results

| Check | Command | Result |
|-------|---------|--------|
| Step 4.1 typecheck | `npm --prefix project/srcs/frontend run typecheck` | 0 errors |
| Step 4.2 typecheck | `npm --prefix project/srcs/frontend run typecheck` | 0 errors |
| Step 4.3 typecheck | `npm --prefix project/srcs/frontend run typecheck` | 0 errors |
| Step 4.4 typecheck | `npm --prefix project/srcs/frontend run typecheck` | 0 errors |
| Combined typecheck (final) | `npm --prefix project/srcs/frontend run typecheck` | 0 errors |
| Tests | `npm --prefix project/srcs/frontend run test` | **100/100 pass** (17 files; no regressions) |
| Build | `npm --prefix project/srcs/frontend run build` | Success; `dist/assets/index-BRqI1x7a.js` = 511.63 kB (gzip 167.44 kB) — +5.08 kB vs Task 3 baseline of 506.55 kB |

### Review findings

**Bugs found and fixed during execution: 0.** The four wiring changes are mechanical, additive, and the patterns (admin route group child, sidebar menu item with `roles`, `getPageTitle` case, thin page assembler) are all already proven by the existing `/dashboard` and `/employees` routes.

**Pre-existing file inconsistency (not fixed — out of scope):** `Header.tsx` line 24 (`case "/employees":`) uses 4-space indentation while lines 20 and 22 use 6-space indentation. The new `case "/app-settings":` on line 26 was placed at 4-space indent to match its immediate neighbor (`/employees`). Fixing the 4-vs-6-space inconsistency in the other two pre-existing cases would create unrelated diff noise — task spec explicitly says "Keep changes minimal and follow local file style." The local style for the `"/employees"` block (which is the block I am adjacent to) is 4-space. ESLint/Prettier is not configured in this project (verified by absence of `.eslintrc` and `.prettierrc`); without an enforced style, the existing inconsistency is preserved as-is.

**Test gaps: none applicable.** Task spec explicitly states wiring changes are verified by typecheck/build and manual browser checks; no new tests are added by Task 4. The 100/100 baseline is preserved.

**Architectural concerns: none.** The page is a thin assembler (correct depth pattern for a route target over a deep hook — depth lives in `useAppSettings`). No new seams needed. The admin `RoleGuard` group already wraps the route, so access control is inherited automatically.

**Documentation accuracy: complete.** The Task doc's Step 4.1–4.4 implementation snippets match what was actually written (verified by reading back the four files). The exception is the `Header.tsx` indentation observation above, which is pre-existing and not introduced by this task.

### Out of Task 4 scope (deferred to Task 5)

- Marking Phase 4 steps complete in the parent feature document.
- Adding the `[[Admin-App-Settings-Page-task-4-page-and-wiring]]` wiki link to the parent feature's Task Breakdown section.
- Final regression run (Task 5.1–5.3) and manual browser validation by the user (Task 5.4).
- Moving this Task document to `Tasks/done/` (handled by Task 5 close-out).
