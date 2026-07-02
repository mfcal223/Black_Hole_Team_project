# Task: Pages and Wiring — ConversationsPage, Router, Sidebar, Header

#task #current #medium-complexity #parent-frontend-role-based-routing-and-landing-pages

**Parent:** [[Frontend-Role-Based-Routing-and-Landing-Pages]]
**Parent Type:** Feature
**Related Step(s):** Phase 4 — Steps 4.1, 4.2, 4.3, 4.4
**Estimated Complexity:** Medium

---

## Goal

Create the `ConversationsPage` employee landing page, wire `RoleGuard` into `router.tsx` so each role lands on and is confined to the correct route, update `Sidebar` to filter menu items by role via `hasAnyRole`, and add the `/conversations` case to `Header.getPageTitle()`. After this task, the role-based routing feature is fully deployed and manually verifiable in the browser.

---

## Parent Context

The parent feature (`Frontend-Role-Based-Routing-and-Landing-Pages`) introduces role-aware routing. Tasks 1–3 built the foundational layer — `UserRole` identity, `hasAnyRole`, `RoleGuard`, `RoleGate`, and the post-login role-aware redirect in `useLoginForm`. Task 4 is the final assembly: it connects those modules to the actual routes, sidebar, and header so the role-based system becomes observable in the UI.

### What the parent says about this task

**Steps covered:**
- **4.1** — Create `src/pages/ConversationsPage.tsx` (employee landing page placeholder; no API calls, no state)
- **4.2** — Update `src/router.tsx`: wrap `/dashboard` with `ProtectedRoute` + `RoleGuard(allowedRoles=[UserRole.ADMIN], redirectTo="/conversations")`; add `/conversations` route with `ProtectedRoute` + `RoleGuard(allowedRoles=[UserRole.EMPLOYEE], redirectTo="/dashboard")` + `MainLayout`
- **4.3** — Update `src/layouts/Sidebar.tsx`: replace `show: boolean` with `roles: UserRole[]`, replace filter with `hasAnyRole(item.roles)`, add Conversations item, update Dashboard item; add `MessageSquare` from lucide-react
- **4.4** — Update `src/layouts/Header.tsx`: add `case "/conversations": return "Conversations"` to `getPageTitle()`; run `npm run typecheck` + `npm run build` to confirm zero errors

**Target route tree (from parent):**
```tsx
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
```

**Dependencies stated by parent:** Task 4 depends on Task 1 (`UserRole`, `hasAnyRole`) and Task 2 (`RoleGuard`). Task 3 (login redirect) does NOT need to precede Task 4 — both can run after Task 1. As of task creation, Tasks 1, 2, and 3 are all complete.

**No tests for structural modules (from parent's Testing Decisions):**
- `ConversationsPage` — no logic; verified by typecheck + build + manual dev-server validation
- `router.tsx` — wiring; verified by typecheck + build + manual dev-server validation
- `Sidebar.tsx` — data-driven filter; verified by typecheck + build + manual dev-server validation
- `Header.tsx` — switch case; verified by typecheck + build + manual dev-server validation

**Accepted design decisions from parent:**
- **`MainLayout` duplication accepted**: Two route groups each repeat the `ProtectedRoute → RoleGuard → MainLayout` chain. This is intentional at 2 groups — correct-and-simple, no `RoleLayout` extraction until ≥3 groups or a genuinely divergent guard chain.
- **`RoleGuard` redirect is silent**: Redirects with no `state` message. Cross-role navigation is blocked by sidebar role-filtering; silent bounce is the correct MVP behavior.
- **`RoleGuard` always sits inside `ProtectedRoute`**: Never use `RoleGuard` without a `ProtectedRoute` wrapper. `RoleGuard` safely assumes a session exists.

---

## Preconditions / Dependencies

- **Task 1 complete:** `src/types/auth.ts` exports `const UserRole` + `type UserRole`; `src/services/authSession.ts` exports `hasAnyRole(roles: UserRole[]): boolean`. Baseline: 40 tests.
- **Task 2 complete:** `src/routes/RoleGuard.tsx` exists and is tested (3 tests). `src/components/common/RoleGate.tsx` exists and is tested (3 tests). Baseline: 46 tests.
- **Task 3 complete:** `useLoginForm.ts` navigates to `/dashboard` for admins and `/conversations` for employees. Baseline: 47 tests.
- **Confirmed current test baseline:** 47 tests across 9 suites, 0 failures, 0 typecheck errors.
- `MessageSquare` is exported from `lucide-react@1.21.0` — confirmed in `node_modules/lucide-react/dist/esm/lucide-react.mjs`.
- `src/pages/DashboardPage.tsx` — structure reference for the new `ConversationsPage`.
- `tsconfig.app.json` constraints: `erasableSyntaxOnly: true`, `verbatimModuleSyntax: true`, `noUnusedLocals: true`, `noUnusedParameters: true`, `strict: true`, `noFallthroughCasesInSwitch: true`.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `solid-deep-design` — **Selected** — Applied to `router.tsx` chain design (no premature `RoleLayout` abstraction), `Sidebar` role-filter depth analysis, `ConversationsPage` structural SRP.
- `tdd` — **Not needed** — Parent explicitly excludes tests for the structural modules in this task (no logic; typecheck + build + manual validation). Existing 47 tests must pass unchanged.
- `documentation-management` — **Selected** — Governs task document location and template.
- `memory-bank` — **Selected** — Project context loaded; current codebase state confirmed after Tasks 1–3.
- `find-docs` — **Selected** — Verified `react-router-dom` v6.30.3 nested route and layout route patterns; confirmed `MessageSquare` export in `lucide-react@1.21.0`.
- `glossary-management` — **Selected** — Confirmed "Admin" and "Employee" domain terminology for sidebar item naming and heading copy.

### Documentation Reviewed

- **`react-router-dom` 6.30.3 — nested routes / layout routes**: The `<Route element={<Layout />}>` parent route renders the `<Outlet />` inside the layout. Child `<Route path="..." element={<Page />}>` renders into that outlet. Multiple sibling layout routes are valid — each wraps its own `MainLayout`. The `ProtectedRoute → RoleGuard → MainLayout` chain is the layout element; `DashboardPage`/`ConversationsPage` are the child elements.
- **`lucide-react@1.21.0` — `MessageSquare`**: Confirmed exported as `MessageSquare` (and aliases `MessageSquareIcon`, `LucideMessageSquare`) from `lucide-react/dist/esm/lucide-react.mjs`. Same named-import pattern as `LayoutDashboard` and `Bot` already used in `Sidebar.tsx`.
- **`tsconfig.app.json`** — `verbatimModuleSyntax: true`: imports used as values must NOT use `import type`. In `router.tsx` and `Sidebar.tsx`, `UserRole` is used as a VALUE object (`UserRole.ADMIN`, `UserRole.EMPLOYEE`) — must use regular `import { UserRole }`, not `import type { UserRole }`. `noFallthroughCasesInSwitch: true`: each new `case` in `getPageTitle()` must return explicitly (no fallthrough).

### Related Existing Code

- `src/router.tsx` — Current single route group (line 15) → split into two role-gated groups (Step 4.2)
- `src/layouts/Sidebar.tsx:22-31` — `menuItems` array with `show: boolean` → replaced with `roles: UserRole[]` (Step 4.3)
- `src/layouts/Header.tsx:18-25` — `getPageTitle()` switch → adds `/conversations` case (Step 4.4)
- `src/pages/DashboardPage.tsx` — Structural reference: `flex flex-col gap-6` wrapper, `text-3xl font-bold` heading, `text-muted-foreground` subtitle
- `src/routes/ProtectedRoute.tsx` — Unchanged; provides authentication guard that wraps `RoleGuard` in the router
- `src/routes/RoleGuard.tsx` — Created in Task 2; wired into router in this task
- `src/services/authSession.ts:53-55` — `hasAnyRole` — called by the updated Sidebar filter

---

## Implementation Details

### Approach

**SOLID + Depth analysis:**

| Module | SRP | Depth | Decision |
|--------|-----|-------|----------|
| `ConversationsPage` | One reason to change: the employee landing page structure. | Shallow by intent — placeholder with no logic. | Correct for MVP; depth grows when real conversation list is added. |
| `router.tsx` | Composition root — not a deep module. | Not measured by depth; its job is declarative wiring. | No abstraction at 2 groups; `RoleLayout` deferred to ≥3 groups per parent. |
| `Sidebar.tsx` | Navigation menu — one reason to change: what nav items are visible to the current user. | Deepens slightly: filter now delegates to `hasAnyRole` (real session state) instead of a raw `boolean`. Deletion test: delete the role filter → every new nav item needs inline `hasAnyRole` checks. Module earns its keep. | `roles: UserRole[]` field + `hasAnyRole(item.roles)` filter is the correct seam. |
| `Header.tsx` | Page title derivation — one reason to change: how path maps to title. | Same depth profile; one case added to the switch. | `noFallthroughCasesInSwitch: true` enforces explicit return per case. |

**Key import type decisions (all `verbatimModuleSyntax: true` compliant):**

| File | Symbol | Usage | Import Form |
|------|--------|-------|-------------|
| `router.tsx` | `UserRole` | Value: `UserRole.ADMIN`, `UserRole.EMPLOYEE` | `import { UserRole }` |
| `router.tsx` | `RoleGuard` | Value: JSX component | `import { RoleGuard }` |
| `router.tsx` | `ConversationsPage` | Value: JSX component | `import { ConversationsPage }` |
| `Sidebar.tsx` | `UserRole` | Value: `UserRole.ADMIN`, `UserRole.EMPLOYEE` | `import { UserRole }` |
| `Sidebar.tsx` | `hasAnyRole` | Value: called at runtime | `import { hasAnyRole }` |

**Execution order constraint:** Step 4.1 (create `ConversationsPage.tsx`) must complete before Step 4.2 (update `router.tsx`), because `router.tsx` imports `ConversationsPage`. Steps 4.3 and 4.4 are independent of each other and of 4.1/4.2.

### Files to Create/Modify

- [x] `src/pages/ConversationsPage.tsx` — **New** — Employee landing page placeholder (no logic, no API calls)
- [x] `src/router.tsx` — **Update** — Split single route group into admin and employee role-gated groups; add new imports
- [x] `src/layouts/Sidebar.tsx` — **Update** — Replace `show: boolean` with `roles: UserRole[]`; update filter; add Conversations item; add `MessageSquare` import
- [x] `src/layouts/Header.tsx` — **Update** — Add `/conversations` case to `getPageTitle()` switch

---

## Step-by-Step Implementation

### Step 4.1: Create `src/pages/ConversationsPage.tsx`

**Goal:** Create a placeholder landing page for employees. No API calls, no state, no data dependencies. The heading confirms the correct routing destination after login.

**Dependencies:** None — this step is independent of all other steps in Task 4.

<!-- REVIEW-FIX: Added .tsx extension warning. The file contains JSX (<div>, <h1>, <p>), so it MUST use .tsx — creating it as .ts produces a TypeScript parse error ("JSX expressions are not allowed"). The 'jsx: react-jsx' compiler option handles the runtime; the extension tells TypeScript to parse JSX syntax. -->
- [x] Create `src/pages/ConversationsPage.tsx` (**must be `.tsx`, not `.ts` — contains JSX**) with the implementation below
- [x] Confirm the file structure matches `DashboardPage.tsx` (same `flex flex-col gap-6` wrapper, same heading tier)

**Why this step is critical:**

`ConversationsPage` must exist before `router.tsx` is updated in Step 4.2 (which imports it). Creating it first avoids a transient typecheck error. The placeholder has just enough structure for the user to confirm the correct landing page — the `<h1>Conversations</h1>` heading is the manual validation anchor for the employee path.

#### Implementation

```tsx
// src/pages/ConversationsPage.tsx

export function ConversationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Conversations</h1>
        <p className="text-muted-foreground">Your conversation history.</p>
      </div>
    </div>
  )
}
```

**Why these class names:**
- `flex flex-col gap-6` — matches `DashboardPage`'s outer wrapper; all page content flows vertically with consistent gap.
- `text-3xl font-bold` — matches `DashboardPage`'s `<h1>` style; consistent page heading tier.
- `text-muted-foreground` — matches `DashboardPage`'s subtitle paragraph style.

**No imports needed:** This component uses no hooks, no context, no API calls, and no shadcn components. It is pure JSX with Tailwind classes — zero import dependencies. TypeScript will not flag any unused import.

#### Edge Cases

1. **`ConversationsPage` name collides with anything:** `grep -rn "ConversationsPage" src/` before creating — expect 0 results. The name is novel in this codebase. ✓
2. **`noUnusedLocals`:** No local variables — no risk.
3. **`erasableSyntaxOnly`:** No TypeScript-specific syntax (no interfaces, no enums, no type annotations) — fully erasable JSX. ✓
4. **Future implementation:** When real conversation data is wired in, all additions go inside this component — no other file needs to change. OCP satisfied. ✓

---

### Step 4.2: Update `src/router.tsx`

**Goal:** Split the single `ProtectedRoute → MainLayout` route group into two role-gated groups: admin-only (`/dashboard` with `RoleGuard(allowedRoles=[UserRole.ADMIN], redirectTo="/conversations")`) and employee-only (`/conversations` with `RoleGuard(allowedRoles=[UserRole.EMPLOYEE], redirectTo="/dashboard")`).

**Dependencies:** Step 4.1 complete (`ConversationsPage.tsx` must exist before this step, since `router.tsx` imports it).

- [x] Add 3 new imports: `ConversationsPage`, `RoleGuard`, `UserRole`
- [x] Replace the single layout `Route` with two role-gated layout `Route` elements as shown below
- [x] Run `npm run typecheck` — expect 0 errors
- [x] Run `npm run test` — expect **47 tests passing, 0 failures** (no new tests; existing tests must not regress)

**Why this step is critical:**

This is the enforcement point. Without the `RoleGuard` wrappers, admins can visit `/conversations` and employees can visit `/dashboard`. With them, cross-role navigation triggers an automatic redirect to the correct workspace. The parent's user stories 3 and 4 are satisfied here.

The guard chain `ProtectedRoute → RoleGuard → MainLayout` is intentional:
- `ProtectedRoute` ensures a session exists before `RoleGuard` reads roles.
- `RoleGuard` checks the role before `MainLayout` mounts (no transient layout flash).
- `MainLayout` renders the shell with `<Outlet />` only after both checks pass.

#### Implementation

```tsx
// src/router.tsx — full updated file

import { BrowserRouter, Route, Routes } from "react-router-dom"
import { HomePage } from "@/pages/HomePage"
import { LoginPage } from "@/pages/LoginPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { ConversationsPage } from "@/pages/ConversationsPage"
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

**Import decisions:**
- `import { UserRole } from "@/types/auth"` — NOT `import type` — `UserRole` is used as a VALUE (`UserRole.ADMIN`, `UserRole.EMPLOYEE`) in JSX prop expressions. `verbatimModuleSyntax: true` requires value imports for value usages.
- `import { RoleGuard } from "@/routes/RoleGuard"` — value import (React component used as JSX). ✓
- `import { ConversationsPage } from "@/pages/ConversationsPage"` — value import (React component used as JSX). ✓

**Why `ProtectedRoute` wraps `RoleGuard` (not the reverse):**

`RoleGuard` calls `hasAnyRole` → `hasRole` → `getRoles()` which reads localStorage. It always assumes a session exists. If `RoleGuard` were placed outside `ProtectedRoute`, an unauthenticated visitor hitting `/dashboard` would reach `RoleGuard` with empty localStorage, `hasAnyRole([UserRole.ADMIN])` returns `false`, and they'd be redirected to `/conversations` — which is wrong (they should go to `/login`). The `ProtectedRoute → RoleGuard` ordering is the correct guard chain.

**Why `MainLayout` is inside `RoleGuard` (not outside):**

If `MainLayout` were mounted outside `RoleGuard`, it would render the sidebar and header shell for a split moment before the role check redirects. The parent feature accepts a silent redirect and explicitly rejects a `RedirectMessageBanner` approach. Mounting `MainLayout` AFTER the role check ensures the shell never appears for cross-role navigation.

**Why `MainLayout` appears twice (accepted duplication):**

The parent feature documents this explicitly as "intentional accepted" — correct-and-simple at 2 groups. Each group is self-contained: its `allowedRoles` and `redirectTo` are local to the group. Extracting a `RoleLayout` wrapper would be a pass-through with no logic (fails the deletion test). Refactor trigger: ≥3 route groups or a genuinely divergent guard chain variant.

#### Edge Cases

1. **Unauthenticated user visits `/dashboard` or `/conversations`:** `ProtectedRoute` catches them first → redirects to `/login` with `state.message`. `RoleGuard` is never reached. ✓
2. **Admin visits `/conversations`:** `ProtectedRoute` passes (authenticated) → `RoleGuard([UserRole.EMPLOYEE], redirectTo="/dashboard")` → `hasAnyRole([UserRole.EMPLOYEE])` → `false` → redirects to `/dashboard`. ✓
3. **Employee visits `/dashboard`:** `ProtectedRoute` passes → `RoleGuard([UserRole.ADMIN], redirectTo="/conversations")` → `hasAnyRole([UserRole.ADMIN])` → `false` → redirects to `/conversations`. ✓
4. **Unknown role visits either route:** `hasAnyRole` returns `false` for unmodeled roles (drop-unknown semantics from Task 1). The user is redirected silently. This is the safe fallback. ✓
<!-- REVIEW-FIX: Added edge case for user with both roles. The backend currently cannot assign both roles to a single user, but the router behavior is worth documenting for completeness and future-proofing. -->
5. **User holds BOTH `ROLE_ADMIN` and `ROLE_EMPLOYEE`:** `getRoles()` returns both roles. `hasAnyRole([UserRole.ADMIN])` → `true` → the admin group's `RoleGuard` passes → `/dashboard` is accessible. `hasAnyRole([UserRole.EMPLOYEE])` → `true` → the employee group's `RoleGuard` passes → `/conversations` is accessible. Post-login redirect via `useLoginForm` calls `isAdmin()` → `hasRole(UserRole.ADMIN)` → `true` → lands on `/dashboard`. Both routes are accessible; sidebar would show both items. The backend does not currently create users with both roles, so this is a theoretical edge case. If it occurs, behavior is safe and defined (no loops, no crashes). ✓
6. **`UserRole` import is a regular import (not `type`) — noUnusedLocals risk:** `UserRole` is used in JSX expressions (`allowedRoles={[UserRole.ADMIN]}`) — it IS used. `noUnusedLocals` will not flag it. ✓

---

### Step 4.3: Update `src/layouts/Sidebar.tsx`

**Goal:** Replace the `show: boolean` menu item field with `roles: UserRole[]`, update the filter to `hasAnyRole(item.roles)`, add a Conversations item for employees (with `MessageSquare` icon), and update the Dashboard item to use `roles: [UserRole.ADMIN]`.

**Dependencies:** None — independent of Steps 4.1 and 4.2 (Sidebar doesn't import router or pages).

- [x] Add `MessageSquare` to the `lucide-react` import
- [x] Add `import { hasAnyRole } from "@/services/authSession"` (new import)
- [x] Add `import { UserRole } from "@/types/auth"` (new import; value import — not `import type`)
- [x] Replace `show: true` on the Dashboard item with `roles: [UserRole.ADMIN]`
- [x] Add Conversations item with `icon: MessageSquare, roles: [UserRole.EMPLOYEE]`
- [x] Replace `menuItems.filter((item) => item.show)` with `menuItems.filter((item) => hasAnyRole(item.roles))`
- [x] Run `npm run typecheck` — expect 0 errors

**Why this step is critical:**

Without this change, both Admin and Employee users would see the Dashboard item in the sidebar (it has `show: true`). With this change, each user sees only the items relevant to their role. The `hasAnyRole(item.roles)` filter is the component-level analog of `RoleGuard` — it hides nav items rather than redirecting routes.

#### Implementation

The complete updated `src/layouts/Sidebar.tsx`:

```tsx
import {
  Bot,
  LayoutDashboard,
  MessageSquare,
} from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"
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
import { hasAnyRole } from "@/services/authSession"
import { UserRole } from "@/types/auth"

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()

  const menuItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      roles: [UserRole.ADMIN],
    },
    {
      title: "Conversations",
      url: "/conversations",
      icon: MessageSquare,
      roles: [UserRole.EMPLOYEE],
    },
  ]

  const visibleMenuItems = menuItems.filter((item) => hasAnyRole(item.roles))

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
                    onClick={() => navigate(item.url)}
                    isActive={isActive}
                    tooltip={item.title}
                    className="data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
                  >
                    <Icon className="size-4" />
                    <span className="font-medium text-sm">{item.title}</span>
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

**What changed vs the current file (surgical diff):**
1. `lucide-react` import: added `MessageSquare`
2. Two new imports added after the shadcn/ui sidebar imports: `hasAnyRole` from `@/services/authSession`, `UserRole` from `@/types/auth`
3. Dashboard menu item: `show: true` → `roles: [UserRole.ADMIN]`
4. Conversations menu item: **new** — `{ title: "Conversations", url: "/conversations", icon: MessageSquare, roles: [UserRole.EMPLOYEE] }`
5. Filter line: `menuItems.filter((item) => item.show)` → `menuItems.filter((item) => hasAnyRole(item.roles))`

**Why `import { UserRole }` (not `import type`):**

`UserRole.ADMIN` and `UserRole.EMPLOYEE` are used as runtime VALUES in the `roles` arrays. `verbatimModuleSyntax: true` requires non-`type` imports for value usages. Using `import type { UserRole }` and then writing `UserRole.ADMIN` would produce error `TS1484: 'UserRole' cannot be used as a value because it was imported using 'import type'`.

**Why `import { hasAnyRole }` (not `import type`):**

`hasAnyRole` is called at runtime in the filter. Value import required. ✓

**TypeScript type inference for `menuItems.roles`:**

TypeScript infers the type of `[UserRole.ADMIN]` as `("ROLE_ADMIN")[]` (a literal array) and `[UserRole.EMPLOYEE]` as `("ROLE_EMPLOYEE")[]`. These are subtypes of `UserRole[] = ("ROLE_ADMIN" | "ROLE_EMPLOYEE")[]`, so `hasAnyRole(item.roles)` compiles without any explicit type annotation on the menu items. No `as UserRole[]` cast is needed. ✓

#### Edge Cases

1. **Admin user visits sidebar:** `hasAnyRole([UserRole.ADMIN])` → `true` for Dashboard, `hasAnyRole([UserRole.EMPLOYEE])` → `false` for Conversations. Sidebar shows only Dashboard. ✓
2. **Employee user visits sidebar:** `hasAnyRole([UserRole.ADMIN])` → `false` for Dashboard, `hasAnyRole([UserRole.EMPLOYEE])` → `true` for Conversations. Sidebar shows only Conversations. ✓
3. **Empty session (logout state):** `hasAnyRole([...])` returns `false` for any input. Sidebar shows no items. This never renders in practice because `ProtectedRoute` blocks unauthenticated access before `MainLayout` mounts. ✓
4. **Future role added (e.g., `UserRole.MANAGER`):** Add new item to `menuItems` with `roles: [UserRole.MANAGER]`. No other code changes needed — the filter handles it automatically. OCP satisfied. ✓
5. **`visibleMenuItems` can be empty:** The `{visibleMenuItems.map(...)}` render still works correctly — renders nothing. No `null` check needed. ✓
6. **`noUnusedLocals` on `UserRole` and `hasAnyRole`:** Both are used in the `menuItems` array and filter respectively — not unused. ✓

---

### Step 4.4: Update `src/layouts/Header.tsx`

**Goal:** Add `case "/conversations": return "Conversations"` to `getPageTitle()` so the header shows the correct title when an employee lands on the Conversations page.

**Dependencies:** None — independent of Steps 4.1, 4.2, and 4.3.

- [x] Add `case "/conversations": return "Conversations"` before the `default` case in `getPageTitle()`
- [x] Run `npm run typecheck` — expect 0 errors
- [x] Run `npm run build` — expect successful build, 0 errors
- [x] Run `npm run test` — expect **47 tests passing, 0 failures** (final gate)

**Why this step is critical:**

Without this case, an employee landing on `/conversations` sees "Control Panel" in the header (the default case). The `getPageTitle()` function is the single source of truth for page-level header titles — extending it here ensures consistent title rendering without touching `Header.tsx`'s JSX structure.

#### Implementation

Surgical change — only the switch inside `getPageTitle()` changes. The rest of `Header.tsx` is unchanged:

```typescript
// Header.tsx — only the getPageTitle() function changes

const getPageTitle = () => {
  switch (location.pathname) {
    case "/dashboard":
      return "Dashboard"
    case "/conversations":
      return "Conversations"
    default:
      return "Control Panel"
  }
}
```

The function before this change had 2 cases (`/dashboard` and `default`). After: 3 cases (`/dashboard`, `/conversations`, `default`).

**Why explicit `return` (not fallthrough):**

`tsconfig.app.json` sets `"noFallthroughCasesInSwitch": true`. A `case` without an explicit `break` or `return` would be a TypeScript error. Each case uses `return`, satisfying the constraint. ✓

**No new imports needed:** `getPageTitle()` uses only `location.pathname` (from `useLocation`, already imported) and string literals. ✓

#### Edge Cases

1. **Other paths (e.g., future `/settings`):** Fall through to `default: return "Control Panel"`. The default case covers all unregistered paths. ✓
2. **`/conversations` while logged in as admin (cross-role redirect scenario):** If an admin somehow reaches the `/conversations` URL (before `RoleGuard` redirects), they'd briefly see "Conversations" in the header — but `RoleGuard` prevents this scenario by redirecting before `MainLayout` mounts. The header case is defensive correctness only. ✓
3. **`noFallthroughCasesInSwitch`:** Confirmed: each case (`"/dashboard"`, `"/conversations"`, `default`) ends with `return`. No fallthrough possible. ✓

---

## Design Decisions

**Decision 1: Step 4.1 before Step 4.2 (creation before import)**
- **Why:** `router.tsx` imports `ConversationsPage`. If Step 4.2 runs before Step 4.1, TypeScript reports `TS2307: Cannot find module '@/pages/ConversationsPage'`. Creating the module first avoids this transient error. Steps 4.3 and 4.4 are independent of each other and can run in either order after any step.
- **Alternatives considered:** Create all files simultaneously. Impractical in a sequential execution model — `router.tsx` and `ConversationsPage.tsx` must be committed before typecheck can pass.

**Decision 2: `import { UserRole }` (value import) in `router.tsx` and `Sidebar.tsx`**
- **Why:** `UserRole.ADMIN` and `UserRole.EMPLOYEE` are used as runtime values (JSX prop values in router, array entries in sidebar). `verbatimModuleSyntax: true` requires that imports used as values be non-`type` imports. Using `import type { UserRole }` here would produce `TS1484`. This contrasts with `RoleGuard.tsx` and `RoleGate.tsx` where `UserRole` appears only as a type annotation — those correctly use `import type { UserRole }`.
- **Alternatives considered:** `import type { UserRole }` — forbidden by the constraint. Rejected.

**Decision 3: No type annotation on `menuItems` in `Sidebar.tsx`**
- **Why:** TypeScript correctly infers the type of `menuItems` from the literal objects. The `roles` field infers as `("ROLE_ADMIN")[]` and `("ROLE_EMPLOYEE")[]` — both assignable to `UserRole[]` (the parameter type of `hasAnyRole`). Adding an explicit annotation like `const menuItems: { title: string; url: string; icon: LucideIcon; roles: UserRole[] }[]` would be verbose and redundant. TypeScript's type inference is sufficient and keeps the code lean.
- **Alternatives considered:** Explicit type annotation for clarity. Rejected — annotation would need to import `LucideIcon` from lucide-react (another dependency) and adds noise without adding safety.

**Decision 4: `visibleMenuItems` variable name retained**
- **Why:** The variable name `visibleMenuItems` accurately describes the semantics before and after the change — it's the filtered list of items to render. Renaming it would create noise in the diff without adding clarity. The referenced JSX (`{visibleMenuItems.map(...)}`) needs no change.
- **Alternatives considered:** Rename to `roleFilteredItems` — more descriptive of the filtering mechanism, but the previous name already describes the outcome (visible items). Rejected.

**Decision 5: `MainLayout` duplicated across two route groups (accepted)**
- **Why:** The parent feature document explicitly documents this as "intentionally accepted at this stage." At 2 route groups, extracting a `RoleLayout` wrapper component would be a pass-through (no logic — just `<RoleGuard><MainLayout /></RoleGuard>`) that fails the deletion test. The deletion test: delete `RoleLayout` and you get back exactly the same complexity — the indirection earns nothing. Refactor trigger per parent: ≥3 groups OR a genuinely divergent guard-chain variant.
- **Alternatives considered:** `RoleLayout` wrapper — a thin pass-through component. Rejected per parent's documented reasoning and SOLID depth analysis (passes the "no deletion benefit" test).

**Decision 6: No `RoleGate` usage in Sidebar — `hasAnyRole` called directly**
- **Why:** `RoleGate` is a React component designed for JSX tree show/hide. In `Sidebar.tsx`, the role filtering happens at the data layer (`menuItems.filter(...)`) before any JSX is rendered. Wrapping each `SidebarMenuItem` in a `<RoleGate>` would move the conditional into JSX and require rendering each item's component tree before the check. The data-layer `hasAnyRole` call is simpler, more efficient, and doesn't instantiate component trees for hidden items.
- **Alternatives considered:** `<RoleGate allowedRoles={item.roles}><SidebarMenuItem>...</SidebarMenuItem></RoleGate>`. Functionally equivalent but renders more component tree unnecessarily. Rejected in favor of the data-layer filter.

**Decision 7: `ConversationsPage` has zero imports**
- **Why:** It is a structural placeholder — only `className` strings and literal text. Adding shadcn card components (like `DashboardPage` has) would be premature for a placeholder. The `<h1>Conversations</h1>` heading is the minimal content needed for manual validation of the routing (user story 11: "a clear 'Conversations' heading"). No imports means zero `noUnusedLocals` risk.
- **Alternatives considered:** Add `Card` components like `DashboardPage`. Rejected — those cards show meaningful admin data; the placeholder should not imply data availability when none exists yet.

---

## Testing Considerations

### Automatic Validation

**After Step 4.1 (ConversationsPage created):**

- [x] Run `npm run typecheck` from `project/srcs/frontend/` — expect **0 errors** (new file uses no TypeScript-specific syntax)

**After Step 4.2 (router.tsx updated):**

- [x] Run `npm run typecheck` from `project/srcs/frontend/` — expect **0 errors**
- [x] Run `npm run test` from `project/srcs/frontend/` — expect **47 tests passing, 0 failures** (no new tests; existing 9 suites must not regress)

**After all steps (Steps 4.3 and 4.4 complete):**

- [x] Run `npm run typecheck` from `project/srcs/frontend/` — expect **0 errors** (final gate)
- [x] Run `npm run build` from `project/srcs/frontend/` — expect **successful build, 0 errors** (final gate)
- [x] Run `npm run test` from `project/srcs/frontend/` — expect **47 tests passing, 0 failures** (final regression gate)

### Manual Validation

This task requires manual validation because it changes routing behavior, sidebar content, and header titles — all of which must be verified in a running browser against real session state.

<!-- REVIEW-FIX: Added Vite dev server URL. Default Vite port is 5173; the vite.config.ts for this project does not override server.port, so http://localhost:5173 is the authoritative URL for manual validation. -->
**Setup:** Start the frontend dev server with `npm run dev` from `project/srcs/frontend/`. Open **http://localhost:5173** in your browser (default Vite port — no `server.port` override in `vite.config.ts`). Ensure the backend is running (or mock a session manually via `localStorage`). You can simulate sessions by opening browser devtools and running:
```javascript
// Admin session
localStorage.setItem("token", "fake-admin-token")
localStorage.setItem("username", "admin")
localStorage.setItem("roles", '["ROLE_ADMIN"]')

// Employee session
localStorage.setItem("token", "fake-emp-token")
localStorage.setItem("username", "emp")
localStorage.setItem("roles", '["ROLE_EMPLOYEE"]')
```
Then navigate directly to the routes without going through the login flow.

**Validation checklist:**

- [ ] **Admin landing page:** Log in as admin (or set admin session) → navigate to `/dashboard` → confirm `<h1>Dashboard</h1>` heading renders and header shows "Dashboard" title
- [ ] **Employee landing page:** Log in as employee (or set employee session) → navigate to `/conversations` → confirm `<h1>Conversations</h1>` heading renders and header shows "Conversations" title
- [ ] **Admin cross-role redirect:** With admin session active, navigate directly to `/conversations` → confirm automatic redirect to `/dashboard` (browser URL should change to `/dashboard`)
- [ ] **Employee cross-role redirect:** With employee session active, navigate directly to `/dashboard` → confirm automatic redirect to `/conversations` (browser URL should change to `/conversations`)
- [ ] **Admin sidebar:** With admin session active, confirm sidebar shows "Dashboard" item and does NOT show "Conversations" item
- [ ] **Employee sidebar:** With employee session active, confirm sidebar shows "Conversations" item and does NOT show "Dashboard" item
- [ ] **Role-aware login redirect (Task 3 integration):** Use the real login form — admin credentials → confirm landing on `/dashboard`; employee credentials → confirm landing on `/conversations`
- [ ] **Logout:** From any authenticated route, click Logout → confirm redirect to `/login` and session cleared

---

## Related Code Explanations

- `src/routes/ProtectedRoute.tsx` — Unchanged; wraps `RoleGuard` in every protected route group; handles unauthenticated redirect to `/login` with `state.message`
- `src/routes/RoleGuard.tsx` — Created in Task 2; wired here in Step 4.2; accepts `allowedRoles: UserRole[]` and `redirectTo: string`; wraps `MainLayout` in each route group
- `src/services/authSession.ts:53-55` — `hasAnyRole(roles: UserRole[]): boolean` — called directly in `Sidebar.tsx` filter and indirectly through `RoleGuard` in the router
- `src/types/auth.ts` — `UserRole` const+type; `UserRole.ADMIN = "ROLE_ADMIN"`, `UserRole.EMPLOYEE = "ROLE_EMPLOYEE"`
- `src/layouts/MainLayout.tsx` — Unchanged; renders `<Sidebar /><Header /><Outlet />`; the `<Outlet />` renders the matched child page (`DashboardPage` or `ConversationsPage`)
- `src/pages/DashboardPage.tsx` — Structural reference for `ConversationsPage`; unchanged by this task; becomes admin-only via `RoleGuard` in Step 4.2
- `src/features/authentication/hooks/useLoginForm.ts:21` — Role-aware navigate (`isAdmin() ? "/dashboard" : "/conversations"`) set in Task 3; this task creates the routes those redirects land on

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task ✓ (see Parent Context)
- [x] Relevant skills reviewed and selected (see Skills and Documentation Preparation)
- [x] Up-to-date documentation reviewed for react-router-dom 6.30.3 and lucide-react 1.21.0 (see Skills and Documentation Preparation)
- [x] `src/pages/ConversationsPage.tsx` created: exports `ConversationsPage`, renders `<h1>Conversations</h1>` with subtitle, no imports, no state, no API calls
- [x] `src/router.tsx` updated: `/dashboard` wrapped in `ProtectedRoute → RoleGuard([UserRole.ADMIN], redirectTo="/conversations") → MainLayout`; `/conversations` route added with `ProtectedRoute → RoleGuard([UserRole.EMPLOYEE], redirectTo="/dashboard") → MainLayout`; 3 new imports added (`ConversationsPage`, `RoleGuard`, `UserRole`)
- [x] `src/layouts/Sidebar.tsx` updated: `MessageSquare` added to lucide-react import; `hasAnyRole` and `UserRole` added as value imports (not `import type`); `show: boolean` replaced with `roles: UserRole[]`; filter updated to `hasAnyRole(item.roles)`; Conversations item added with `MessageSquare` icon and `roles: [UserRole.EMPLOYEE]`; Dashboard item updated to `roles: [UserRole.ADMIN]`
- [x] `src/layouts/Header.tsx` updated: `case "/conversations": return "Conversations"` added to `getPageTitle()` switch before `default`
- [x] `npm run typecheck` passes with **0 errors** after all four steps
- [x] `npm run build` passes with **0 errors** after all four steps
- [x] `npm run test` passes with **47 tests, 0 failures** (no regressions; no new tests for structural modules)
- [ ] Manual validation completed: admin and employee landing pages render correctly, cross-role redirects fire, sidebar shows role-correct items, header shows correct title for each route
- [x] Parent feature Phase 4 steps (4.1, 4.2, 4.3, 4.4) marked `[x]` in `[[Frontend-Role-Based-Routing-and-Landing-Pages]]`
- [x] Task 4 wiki link added in parent feature under Task 4: `[[Frontend-Role-Based-Routing-and-Landing-Pages-task-4-pages-and-wiring]]`
