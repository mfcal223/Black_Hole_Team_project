#high #new-feature #frontend #architectural

## Feature: Frontend Role-Based Routing and Landing Pages

### Description

Introduce a role-based access control system for the React frontend. This replaces the single shared `/dashboard` route (visible to all authenticated users) with a proper role-aware routing layer: a generic route guard (`RoleGuard`) and a component-level gate (`RoleGate`), both driven by a type-safe `UserRole` enum. Each role lands on its own page after login — admins on `/dashboard`, employees on `/conversations` — and attempting to access the wrong section triggers an automatic redirect to the correct one. The Sidebar renders only the navigation items that apply to the current user's role.

---

## Problem Statement

Today the frontend has no role-based routing. `ProtectedRoute` only checks whether the user is authenticated, and both admin and employee users land on the same `/dashboard` page. The existing `AdminRoute.tsx` was created as a placeholder but was never registered in the router. There is no component-level gate to conditionally show UI elements. As the application grows, every new page and UI element will need ad-hoc role-checking logic. Without a shared, type-safe system, this becomes error-prone and impossible to enforce consistently.

---

## User Stories

1. As an admin, after logging in I want to land on the Dashboard page, so that I have immediate access to system management areas.
2. As an employee, after logging in I want to land on the Conversations page, so that I immediately see my conversation history.
3. As an admin who navigates directly to `/conversations`, I want to be redirected to `/dashboard`, so that I stay in my appropriate workspace.
4. As an employee who navigates directly to `/dashboard`, I want to be redirected to `/conversations`, so that I stay in my appropriate workspace.
5. As a developer, I want to protect a route by passing a list of allowed roles, so that access control is declarative and requires no per-route duplication.
6. As a developer, I want to hide a UI component for users who don't have a required role, without blocking the page, so that admin-only controls are invisible to employees without redirecting them.
7. As a developer, I want a type-safe `UserRole` enum instead of raw strings, so that role assignments are verified at compile time and typos are impossible.
8. As an admin, I want the sidebar to show only admin-relevant navigation items, so that I see a workspace tailored to my role.
9. As an employee, I want the sidebar to show only employee-relevant navigation items, so that I see a workspace tailored to my role.
10. As a developer, I want to add a new role in the future and apply it to existing guards by adding it to the enum and passing it in the `allowedRoles` array, so that role expansion requires minimal changes.
11. As an employee, I want to see a clear "Conversations" heading on my landing page, so that I can confirm I landed in the correct place after login.
12. As an admin, I want to see a clear "Dashboard" heading on my landing page, so that I can confirm I landed in the correct place after login.
13. As a developer, I want the role-checking logic to live in a single, tested service function, so that `RoleGuard`, `RoleGate`, the Sidebar, and the login hook all share the same implementation.

---

## Solution

Introduce a `UserRole` string enum as the single source of truth for role identity. Extend `authSession` with a `hasAnyRole(roles: UserRole[])` helper. Build two new modules: `RoleGuard` (route-level, redirects) and `RoleGate` (component-level, hides). Update the login hook to navigate to the role-correct landing page. Create the employee landing page as a placeholder. Wire all existing and new routes through the guards, update the Sidebar to filter items by role.

### Scope

All changes are limited to `project/srcs/frontend/src/`. No backend files, Docker, or Vite config files are modified.

### Affected Systems / Modules

- `src/types/auth.ts` — string constants replaced with `UserRole` enum
- `src/services/authSession.ts` — `hasAnyRole` added; internal constants updated to use enum values
- `src/routes/AdminRoute.tsx` — **deleted** (replaced by `RoleGuard`)
- `src/routes/RoleGuard.tsx` — **new**: generic route-level role guard
- `src/components/common/RoleGate.tsx` — **new**: generic component-level role gate
- `src/features/authentication/hooks/useLoginForm.ts` — post-login redirect becomes role-aware
- `src/pages/ConversationsPage.tsx` — **new**: employee landing page placeholder
- `src/router.tsx` — `/dashboard` wrapped with `RoleGuard`, `/conversations` route added
- `src/layouts/Sidebar.tsx` — `show` field replaced with `roles: UserRole[]`, filtered via `hasAnyRole`
- `src/layouts/Header.tsx` — `/conversations` case added to `getPageTitle()`

### Impact Analysis

- All existing routes (`/`, `/login`) remain unchanged.
- `ProtectedRoute` remains unchanged — it still handles the unauthenticated case.
- The current `DashboardPage.tsx` content is unchanged — it keeps its username/role cards; it becomes admin-only via the router.
- The 36 existing tests continue to pass; new tests are added on top.
- After this feature, every new protected page must declare its `allowedRoles` at the router level — this is the enforcement mechanism.

### Risk Assessment

- **`useLoginForm` test update:** The existing success test asserts `navigate('/dashboard')`. It must be split into two role-specific tests. This is a breaking change to one test — intentional and expected.
- **Enum migration:** `UserRole` enum values (`"ROLE_ADMIN"`, `"ROLE_EMPLOYEE"`) match the existing string constants exactly, so `authSession.ts` internal logic, `saveSession`, and backend JWT roles remain compatible with zero changes to localStorage keys or JWT parsing.
- **`AdminRoute.tsx` deletion:** It has no callers (never registered in `router.tsx`) — TypeScript will not warn, but the file is safe to delete. Verified by `grep` on import graph.
- **`RoleGuard` assumes authenticated user:** `RoleGuard` always sits inside `ProtectedRoute` in the router, so it can safely assume a session exists. Do not use `RoleGuard` without a `ProtectedRoute` wrapper above it.

---

## Implementation Architecture

### Changes Required

#### 1. `src/types/auth.ts` — UserRole enum
**Purpose:** Replace raw string constants with a TypeScript string enum. Eliminates typo risk at every call site. The enum values are identical to the current strings so existing localStorage data and JWT role arrays remain valid.

**Changes:**
```typescript
// Before
export const ROLE_ADMIN = "ROLE_ADMIN"
export const ROLE_EMPLOYEE = "ROLE_EMPLOYEE"
export type UserRole = typeof ROLE_ADMIN | typeof ROLE_EMPLOYEE

// After
export enum UserRole {
  ADMIN = "ROLE_ADMIN",
  EMPLOYEE = "ROLE_EMPLOYEE",
}
```

---

#### 2. `src/services/authSession.ts` — hasAnyRole
**Purpose:** Add a single shared role-checking function used by `RoleGuard`, `RoleGate`, and `Sidebar`. Update internal usage of string constants to enum values.

**Changes:**
- `import { UserRole } from "@/types/auth"` (already imported for `ROLE_ADMIN`/`ROLE_EMPLOYEE`)
- Replace `ROLE_ADMIN` → `UserRole.ADMIN`, `ROLE_EMPLOYEE` → `UserRole.EMPLOYEE`
- Add a type guard and retype `getRoles()` so it returns validated `UserRole[]` (keeping `saveSession(roles: string[])` as the untrusted write seam):
```typescript
function isUserRole(value: string): value is UserRole {
  return Object.values(UserRole).includes(value as UserRole)
}

export function getRoles(): UserRole[] {
  const rawRoles = localStorage.getItem("roles")
  if (!rawRoles) return []
  try {
    const parsed = JSON.parse(rawRoles)
    if (Array.isArray(parsed)) {
      return parsed.filter(isUserRole)
    }
    return []
  } catch {
    return []
  }
}

export function hasRole(role: UserRole): boolean {
  return getRoles().includes(role)
}

export function hasAnyRole(roles: UserRole[]): boolean {
  return roles.some((role) => hasRole(role))
}
```
Note: `hasRole` uses **no cast** — `getRoles()` now returns `UserRole[]`, so `getRoles().includes(role)` compiles in TS strict mode. The `as UserRole` inside `isUserRole`'s `Object.values(UserRole).includes(...)` is the single contained escape point at the validation boundary, not at the comparison site. Unmodeled role strings (e.g. a future backend role not yet in the enum) are dropped silently here — this is intentional (frontend only recognizes modeled roles) and documented.

**SOLID:** `hasAnyRole` is a natural extension of `authSession`'s single responsibility (session state). The `getRoles()` → `UserRole[]` retyping makes `authSession` a deep module: it converts untrusted `string[]` from localStorage/JSON into validated domain `UserRole[]` behind a small interface, so every caller and future role comparison is type-safe with no casts. Knowledge of "which raw strings are valid roles" concentrates in `isUserRole` (locality), instead of scattering casts across every role check.

---

#### 3. `src/routes/RoleGuard.tsx` — Route-level guard (new)
**Purpose:** A single generic route guard that accepts `allowedRoles: UserRole[]` and `redirectTo: string`. Replaces the now-deleted `AdminRoute.tsx`. Callers decide the redirect target — `RoleGuard` stays a pure "check and redirect" module.

**Interface:**
```typescript
type RoleGuardProps = {
  allowedRoles: UserRole[]
  redirectTo: string
  children: ReactNode
}
```

**Implementation:**
```typescript
export function RoleGuard({ allowedRoles, redirectTo, children }: RoleGuardProps) {
  if (!hasAnyRole(allowedRoles)) {
    return <Navigate to={redirectTo} replace />
  }
  return children
}
```

**Depth:** Small interface (3 props), non-trivial behavior: role resolution via `authSession`, navigation side-effect via React Router `Navigate`. Deletion test: delete it, and all role-protected routes need inline guards — complexity scatters.

---

#### 4. `src/components/common/RoleGate.tsx` — Component-level gate (new)
**Purpose:** Renders `children` only when the current user has one of the allowed roles. Returns `null` otherwise. No redirect. Used for conditional UI elements: sidebar items, admin-only buttons, banners.

**Interface:**
```typescript
type RoleGateProps = {
  allowedRoles: UserRole[]
  children: ReactNode
}
```

**Implementation:**
```typescript
export function RoleGate({ allowedRoles, children }: RoleGateProps) {
  if (!hasAnyRole(allowedRoles)) {
    return null
  }
  return children
}
```

**SOLID:** SRP — only show/hide based on role. Distinct from `RoleGuard` (no redirect). Caller decides what to render; `RoleGate` decides whether to render it.

---

#### 5. `src/features/authentication/hooks/useLoginForm.ts` — Role-aware redirect
**Purpose:** After a successful login, navigate to the role-correct landing page. Admins go to `/dashboard`; employees go to `/conversations`.

**Change:** Replace `navigate("/dashboard")` with:
```typescript
navigate(isAdmin() ? "/dashboard" : "/conversations")
```

This works because `authService.login()` calls `saveSession()` synchronously before the `await` resolves, so `isAdmin()` reads from localStorage that is already populated when the navigation decision is made.

---

#### 6. `src/pages/ConversationsPage.tsx` — Employee landing page (new)
**Purpose:** Placeholder for the employee conversation list. No API calls, no state, no data. Just a structural header that confirms the correct landing page.

```tsx
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

---

#### 7. `src/router.tsx` — Route wiring
**Purpose:** Register the `/conversations` route, wrap `/dashboard` in a `RoleGuard` for admins, wrap `/conversations` in a `RoleGuard` for employees.

**Target route tree:**
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

---

#### 8. `src/layouts/Sidebar.tsx` — Role-filtered menu items
**Purpose:** Replace the `show: boolean` field with `roles: UserRole[]`. Filter items using `hasAnyRole(item.roles)`.

**Changes:**
- Add `import { hasAnyRole } from "@/services/authSession"` and `import { UserRole } from "@/types/auth"`
- Replace `show: boolean` → `roles: UserRole[]` in the item type
- Replace `menuItems.filter((item) => item.show)` → `menuItems.filter((item) => hasAnyRole(item.roles))`
- Update menu items:
```typescript
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
    icon: MessageSquare, // from lucide-react
    roles: [UserRole.EMPLOYEE],
  },
]
```

---

#### 9. `src/layouts/Header.tsx` — Conversations page title
**Purpose:** Add the `/conversations` case to `getPageTitle()`.

```typescript
case "/conversations":
  return "Conversations"
```

---

#### 10. `src/routes/AdminRoute.tsx` — Delete
**Purpose:** This placeholder was never registered in the router. `RoleGuard` fully replaces its intent with a generalized, tested implementation. No callers exist.

---

## Implementation Steps

### Phase 1: UserRole Enum Foundation
- [x] **Step 1.1:** Rewrite `src/types/auth.ts` — export `enum UserRole { ADMIN = "ROLE_ADMIN", EMPLOYEE = "ROLE_EMPLOYEE" }`, delete the old constants and union type *(Executed as `const`+`type` companion pattern per `erasableSyntaxOnly: true` — see [[Frontend-Role-Based-Routing-and-Landing-Pages-task-1-userrole-enum-foundation]] Design Decision 1)*
- [x] **Step 1.2:** Update `src/services/authSession.ts` — replace `ROLE_ADMIN`/`ROLE_EMPLOYEE` string constants with `UserRole.ADMIN`/`UserRole.EMPLOYEE`; add `hasAnyRole(roles: UserRole[]): boolean`; retype `getRoles()` to return `UserRole[]` by validating the raw localStorage `string[]` through an `isUserRole` type guard at the read boundary so `hasRole(role: UserRole)` compiles as `getRoles().includes(role)` with **NO cast** (do NOT use `role as string`); unmodeled roles are defensively dropped at this single boundary (documented drop-unknown semantics). `saveSession(roles: string[])` stays as the untrusted backend-facing write seam — do NOT widen it to `UserRole[]`
- [x] **Step 1.3:** TDD — update `src/services/authSession.test.ts` — add 4 tests for `hasAnyRole`: user has the role, user has one of multiple roles, user has none of the roles, empty roles array returns false; update any existing constant reference to use enum values; run tests to confirm all pass
- [x] **Step 1.4:** Delete `src/routes/AdminRoute.tsx`; run `npm run typecheck` to confirm zero errors

### Phase 2: Route Guard and Component Gate (TDD)
- [x] **Step 2.1:** TDD — create `src/routes/RoleGuard.tsx` — write tests first: matching role renders children, non-matching role redirects to `redirectTo`, one-of-multiple roles renders children; then implement; confirm tests pass
- [x] **Step 2.2:** TDD — create `src/components/common/RoleGate.tsx` — write tests first: matching role renders children, non-matching role renders null, one-of-multiple roles renders children; then implement; confirm tests pass

### Phase 3: Role-Aware Login Redirect (TDD)
- [x] **Step 3.1:** Update `src/features/authentication/hooks/useLoginForm.ts` — replace `navigate("/dashboard")` with `navigate(isAdmin() ? "/dashboard" : "/conversations")`; import `isAdmin` from `@/services/authSession`
- [x] **Step 3.2:** Update `src/features/authentication/hooks/useLoginForm.test.ts` — update the existing success test to be role-specific (admin variant), add employee success test; set up `localStorage` roles in each test's arrange step via `saveSession`; confirm all tests pass

### Phase 4: Pages and Wiring
- [x] **Step 4.1:** Create `src/pages/ConversationsPage.tsx` — placeholder with `<h1>Conversations</h1>` and subtitle; no API calls
- [x] **Step 4.2:** Update `src/router.tsx` — wrap `/dashboard` with `ProtectedRoute` + `RoleGuard(allowedRoles=[UserRole.ADMIN], redirectTo="/conversations")`; add `/conversations` route with `ProtectedRoute` + `RoleGuard(allowedRoles=[UserRole.EMPLOYEE], redirectTo="/dashboard")` + `MainLayout`
- [x] **Step 4.3:** Update `src/layouts/Sidebar.tsx` — replace `show` with `roles: UserRole[]`, replace filter with `hasAnyRole`, add Conversations item with `roles: [UserRole.EMPLOYEE]`, update Dashboard item to `roles: [UserRole.ADMIN]`, add `MessageSquare` import from lucide-react
- [x] **Step 4.4:** Update `src/layouts/Header.tsx` — add `case "/conversations": return "Conversations"` to `getPageTitle()`; run `npm run typecheck` + `npm run build` to confirm zero errors

---

## Potential Issues / Risks

- **`useLoginForm` test update is a breaking change:** The existing `loginSuccess_navigatesToDashboard` test asserts `navigate("/dashboard")` unconditionally. After Step 3.1, this test will fail until Step 3.2 updates it. Always execute Steps 3.1 and 3.2 together.
- **`RoleGuard` double-nesting with `ProtectedRoute`:** The router nests `RoleGuard` inside `ProtectedRoute`. This is intentional — do not merge them into one component. Each has a single responsibility.
- **Enum in tests:** Vitest tests need to import `UserRole` from `@/types/auth`. The `@/` alias is already wired in `vitest.config.ts` — no changes needed.
- **`isAdmin()` in `useLoginForm` reads localStorage that `authService.login()` has already written:** In tests, `authService.login` is mocked and will not call `saveSession`. Tests must call `saveSession(...)` explicitly in the arrange step before submitting the form to populate the roles that `isAdmin()` will read.
- **lucide-react `MessageSquare` icon:** Already installed (`lucide-react@1.21.0`). Just add the named import to `Sidebar.tsx`.
- **`MainLayout` duplication across route groups (accepted, revisit later):** The router has two route groups (admin `/dashboard`, employee `/conversations`), each repeating the `ProtectedRoute → RoleGuard → MainLayout` chain, differing only by `allowedRoles`/`redirectTo`. This is **intentionally accepted** at this stage — it is correct-and-simple, preserves the per-role config local to each group, and keeps the documented guard chain explicit (`RoleGuard` above `MainLayout`). Extracting a `RoleLayout` wrapper now would be a shallow pass-through (no logic, pure composition) and premature at 2 groups (no real polymorphic seam — callers vary only by values). Hoisting `MainLayout` above the guards is rejected because it would mount the layout before the role check resolves (transient layout flash on wrong-role access). **Refactor trigger:** revisit (`RoleLayout` extraction or a shared layout route) once the route tree reaches **≥3 groups** OR a genuinely divergent guard-chain variant emerges.
- **`RoleGuard` redirect is silent (accepted for MVP; preferred future approach recorded):** `RoleGuard` redirects via `<Navigate to={redirectTo} replace />` with no `state` message, unlike `ProtectedRoute` (which passes `state={{ message }}` read by `LoginPage`). This is **intentionally accepted** because sidebar role-filtering prevents accidental cross-role navigation; cross-role access requires deliberate URL manipulation, so a silent bounce to the correct workspace is the least-surprising behavior and adding messaging is out of scope for placeholder-stage pages. Do **NOT** add a `redirectMessage?` prop — it would widen `RoleGuard`'s interface (3→4 props) and scatter a `location.state` reader across three pages (`LoginPage`, `DashboardPage`, `ConversationsPage`). **Preferred future UX-polish approach** (when landing pages have real content): a single `MainLayout`-level `<RedirectMessageBanner/>` that reads `location.state?.message` once and renders a banner, with `RoleGuard` emitting a fixed internal `state.message` and **no** new caller-facing prop — this preserves `RoleGuard`'s minimal interface (ISP/OCP) and centralizes the read with locality and reusability across any future redirect.

---

## Testing Decisions

**What makes a good test here:** Tests verify behavior through the public interface only — what a caller or user observes. They must survive internal refactors. For route guards: does the user see the children or get redirected? For component gates: does the element render or not? For `hasAnyRole`: does it return the right boolean given localStorage state? For `useLoginForm`: does it navigate to the right path after login?

**localStorage cleanup (REQUIRED for any test file that calls `saveSession`):** Every new test file that populates session state — `RoleGuard.test.tsx`, `RoleGate.test.tsx`, and `useLoginForm.test.ts` — must include `beforeEach(() => { localStorage.clear() })`, following the established pattern in `src/services/authSession.test.ts`. There is no global Vitest setup that clears localStorage automatically; without per-file cleanup, roles written in one test bleed into the next and produce order-dependent (flaky) results. Note: since `getRoles()` validates via `isUserRole`, valid modeled enum values survive past the read boundary, so leftover roles persist deterministically — cleanup must be explicit.

**Modules with TDD:**

| Module | Test file | What is tested |
|--------|-----------|----------------|
| `authSession.hasAnyRole` | `src/services/authSession.test.ts` | Returns true for matching role, true for one-of-many, false for no match, false for empty array |
| `RoleGuard` | `src/routes/RoleGuard.test.tsx` | Children render when role matches; non-matching role emits a redirect to `redirectTo`; one-of-multiple roles renders children. **How (REQUIRED):** mock `<Navigate>` via `vi.mock('react-router-dom', async (importOriginal) => { const actual = await importOriginal(); return { ...actual, Navigate: (props: NavigateProps) => <div data-testid="navigate-to">{props.to}</div> } })` (import the `NavigateProps` type from `react-router-dom` so the `replace` prop typechecks), then assert `screen.getByTestId('navigate-to')` text equals the expected `redirectTo`. This test is coupled to the `<Navigate>` primitive; switch to a real-`MemoryRouter` path assertion if `RoleGuard` is later refactored to `useNavigate()` |
| `RoleGate` | `src/components/common/RoleGate.test.tsx` | Children render when role matches; null when role doesn't match; one-of-multiple roles renders children |
| `useLoginForm` | `src/features/authentication/hooks/useLoginForm.test.ts` | Admin login → navigate("/dashboard"); employee login → navigate("/conversations") |

**Modules without tests (structural):** `ConversationsPage` (no logic), `router.tsx` (wiring), `Sidebar.tsx` (data-driven filter), `Header.tsx` (switch case). Verified by `npm run typecheck` + `npm run build` + manual dev-server validation.

**Prior art:**
- `src/services/authSession.test.ts` — existing pattern for testing localStorage-backed session functions
- `src/features/authentication/hooks/useLoginForm.test.ts` — uses `vi.hoisted` + `vi.mock` for `useNavigate`; `vi.mock` for `authService`; `renderHook` + `act` from `@testing-library/react`
- `src/lib/api.test.ts` — uses `vi.stubGlobal` for side-effect testing

---

## Task Breakdown

### Task 1: UserRole Enum + hasAnyRole Foundation
- **Dependencies:** [] (no prerequisites — foundational)
- **Steps Covered:** Steps 1.1, 1.2, 1.3, 1.4
- **Reason for Grouping:** All foundational type and service changes. Every subsequent task depends on the enum and `hasAnyRole` existing. Low risk, logically atomic.
- **Planned Task File:** `Frontend-Role-Based-Routing-and-Landing-Pages-task-1-userrole-enum-foundation.md`
- **Task Document Link:** [[Frontend-Role-Based-Routing-and-Landing-Pages-task-1-userrole-enum-foundation]]

### Task 2: RoleGuard and RoleGate (TDD)
- **Dependencies:** [Task 1]
- **Steps Covered:** Steps 2.1, 2.2
- **Reason for Grouping:** Both are new modules with the same dependency (Phase 1). Both follow the same TDD cycle pattern. Can be grouped as one focused guard-system task.
- **Test approach (RoleGuard):** mock `<Navigate>` via `vi.mock('react-router-dom', async (importOriginal) => { const actual = await importOriginal(); return { ...actual, Navigate: (props: NavigateProps) => <div data-testid="navigate-to">{props.to}</div> } })` — the stub MUST be typed as `NavigateProps` (`RoleGuard` renders `<Navigate to={redirectTo} replace />`, so a narrow `{ to: string }` stub fails to typecheck against `replace`); assert `screen.getByTestId('navigate-to')` text equals the expected `redirectTo`. The test is coupled to the `<Navigate>` primitive; switch to a real-`MemoryRouter` path assertion if `RoleGuard` is ever refactored to `useNavigate()`. (`RoleGate` renders `null` on no-match and needs NO Router context.)
- **localStorage cleanup (REQUIRED):** both `RoleGuard.test.tsx` and `RoleGate.test.tsx` must include `beforeEach(() => { localStorage.clear() })` (following `src/services/authSession.test.ts:11`) to prevent role bleed between tests.
- **Planned Task File:** `Frontend-Role-Based-Routing-and-Landing-Pages-task-2-role-guard-and-gate.md`
- **Task Document Link:** [[Frontend-Role-Based-Routing-and-Landing-Pages-task-2-role-guard-and-gate]]

### Task 3: Role-Aware Login Redirect (TDD)
- **Dependencies:** [Task 1]
- **Steps Covered:** Steps 3.1, 3.2
- **Reason for Grouping:** A single focused behavior change in `useLoginForm` plus the test update that must accompany it. Independent of Task 2 (see `Dependencies`).
- **Planned Task File:** `Frontend-Role-Based-Routing-and-Landing-Pages-task-3-role-aware-login-redirect.md`
- **Task Document Link:** [[Frontend-Role-Based-Routing-and-Landing-Pages-task-3-role-aware-login-redirect]]

### Task 4: Pages and Wiring
- **Dependencies:** [Task 1, Task 2]
- **Steps Covered:** Steps 4.1, 4.2, 4.3, 4.4
- **Reason for Grouping:** All structural wiring steps. None have complex logic — they compose the modules built in Tasks 1–3. Depend on Task 2 (`RoleGuard`) and Task 1 (`UserRole`, `hasAnyRole`); NOT dependent on Task 3. See the `Dependencies` field above for the authoritative ordering — Task 3 can run in parallel after Task 1 (it does not need to precede Task 4).
- **Planned Task File:** `Frontend-Role-Based-Routing-and-Landing-Pages-task-4-pages-and-wiring.md`
- **Task Document Link:** [[Frontend-Role-Based-Routing-and-Landing-Pages-task-4-pages-and-wiring]]
