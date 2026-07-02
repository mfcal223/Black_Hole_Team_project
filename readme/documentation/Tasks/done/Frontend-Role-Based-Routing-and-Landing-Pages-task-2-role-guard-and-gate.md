# Task: RoleGuard and RoleGate — Route Guard and Component Gate (TDD)

#task #current #medium-complexity #parent-frontend-role-based-routing-and-landing-pages

**Parent:** [[Frontend-Role-Based-Routing-and-Landing-Pages]]
**Parent Type:** Feature
**Related Step(s):** Phase 2 — Steps 2.1, 2.2
**Estimated Complexity:** Medium

---

## Goal

Create `RoleGuard` (a route-level redirect guard) and `RoleGate` (a component-level show/hide gate) via TDD, both driven by `hasAnyRole` from `authSession`. These two modules are the enforcement mechanism that Tasks 3 and 4 depend on to wire role-aware routing and conditional UI into the application.

---

## Parent Context

The parent feature (`Frontend-Role-Based-Routing-and-Landing-Pages`) introduces a role-aware routing layer. Task 1 established the `UserRole` const+type identity and the `hasAnyRole(roles: UserRole[]): boolean` helper in `authSession.ts` — the foundation both guards depend on.

### What the parent says about this task

**Steps covered:** 2.1 (TDD `RoleGuard.tsx`) and 2.2 (TDD `RoleGate.tsx`).

**RoleGuard purpose:** A single generic route guard that accepts `allowedRoles: UserRole[]` and `redirectTo: string`. It renders `children` if the user has any of the allowed roles; otherwise it redirects via `<Navigate to={redirectTo} replace />`. Callers decide the redirect target — `RoleGuard` stays a pure "check and redirect" module with no knowledge of specific routes. It always sits inside `ProtectedRoute` in `router.tsx` — it may safely assume a session exists.

**RoleGate purpose:** Renders `children` when the current user has one of the allowed roles; returns `null` otherwise. No redirect. Used for conditional UI elements (sidebar items, admin-only buttons, banners). Completely distinct from `RoleGuard` — same role-check, no navigation side-effect.

**Test approach mandated by parent (for `RoleGuard`):** Mock `<Navigate>` via:
```typescript
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>()
  return {
    ...actual,
    Navigate: (props: NavigateProps) => <div data-testid="navigate-to">{String(props.to)}</div>,
  }
})
```
Import `NavigateProps` as a type (`import type { NavigateProps }`) — the stub MUST be typed as `NavigateProps` because `RoleGuard` renders `<Navigate to={redirectTo} replace />` and a narrow `{ to: string }` stub fails to typecheck against the `replace` prop. Assert `screen.getByTestId("navigate-to").textContent` equals the expected `redirectTo`.

**localStorage cleanup (REQUIRED):** Both `RoleGuard.test.tsx` and `RoleGate.test.tsx` must include `beforeEach(() => { localStorage.clear() })` to prevent role bleed between tests. Without this, roles written in one test persist in `localStorage` and affect subsequent tests (they pass the `isUserRole` validation boundary in `getRoles()`), making tests order-dependent and flaky.

**SOLID intent from parent:**
- `RoleGuard` — SRP: one responsibility (check and redirect). Depth: small interface (3 props), non-trivial behavior (role resolution via `authSession`, navigation side-effect via `Navigate`). Deletion test: delete it, and all role-protected routes need inline guards — complexity scatters.
- `RoleGate` — SRP: only show/hide based on role. Distinct from `RoleGuard` (no redirect). Caller decides what to render; `RoleGate` decides whether to render it.

**Dependency note:** Task 2 depends on Task 1 (needs `UserRole` and `hasAnyRole`). Task 3 (role-aware login redirect) depends only on Task 1, not on Task 2 — it can be done in parallel after Task 1 and does NOT need to precede Task 4. Task 4 depends on Task 2 (needs `RoleGuard`).

---

## Preconditions / Dependencies

- Task 1 is complete: `src/types/auth.ts` exports `const UserRole` + `type UserRole`; `src/services/authSession.ts` exports `hasAnyRole(roles: UserRole[]): boolean`.
- Test baseline from Task 1: **40 tests, 0 failures** across 7 suites.
- `vitest.config.ts` maps `@/` → `./src` — no changes needed.
- `@testing-library/react` 16.3.2 is installed — `render` and `screen` are available.
- `react-router-dom` 6.30.3 is installed — `Navigate` and `NavigateProps` are available.
- `src/routes/ProtectedRoute.tsx` establishes the `return children` pattern for `ReactNode` children — Task 2 follows the same convention.
- No Router context is needed in the new test files: `Navigate` is mocked (no real router) and children are plain `<div>` elements (no router hooks).

---

## Skills and Documentation Preparation

### Skills Reviewed

- `solid-deep-design` — **Selected** — Applied to the depth analysis and SRP verification of `RoleGuard` and `RoleGate`.
- `tdd` — **Selected** — Governs the TDD cycle: write tests first (RED), implement minimally (GREEN), no speculative features.
- `documentation-management` — **Selected** — Governs task document location and template.
- `memory-bank` — **Selected** — Project context loaded; confirmed current codebase state after Task 1.
- `react-best-practices` — **Not invoked** — No new React hooks or state in these modules; patterns are established by `ProtectedRoute.tsx` which already exists.
- `find-docs` — **Selected** — Verified `NavigateProps` interface from react-router-dom 6.30.3.

### Documentation Reviewed

- **Context7 / react-router-dom 6.30.3** — `NavigateProps` interface confirmed:
  ```typescript
  interface NavigateProps {
    to: To;          // To = string | Partial<Path>
    replace?: boolean;
    state?: any;
    relative?: RelativeRoutingType;
  }
  ```
  The `replace` prop is present on `NavigateProps`. `RoleGuard` passes `<Navigate to={redirectTo} replace />`, so the mock's parameter type must include `replace` — `NavigateProps` satisfies this; `{ to: string }` does not.

- **`tsconfig.app.json`** — `"verbatimModuleSyntax": true` and `"erasableSyntaxOnly": true` confirmed. Type-only imports must use `import type`. `noUnusedLocals: true` and `noUnusedParameters: true` apply.

- **`src/routes/ProtectedRoute.tsx`** — Established patterns: `import type { ReactNode } from "react"`, `children: ReactNode` prop, `return children` (no fragment wrapper), `import { Navigate } from "react-router-dom"` (value import), no explicit return type annotation.

- **`src/features/authentication/hooks/useLoginForm.test.ts`** — Established test patterns: `vi.mock("react-router-dom", async (importOriginal) => { const mod = await importOriginal<typeof import("react-router-dom")>() ... })`, `import type { FormEvent } from "react"` for type-only imports in test files, `import { vi } from "vitest"` for explicit vi import.

### Related Existing Code

- `src/services/authSession.ts:53–55` — `hasAnyRole` implementation; both guards call it
- `src/types/auth.ts` — `UserRole` const+type; both guards type `allowedRoles` as `UserRole[]`
- `src/routes/ProtectedRoute.tsx` — Reference implementation for the `children: ReactNode` + `return children` pattern
- `src/features/authentication/hooks/useLoginForm.test.ts` — Reference for the `vi.mock("react-router-dom", async (importOriginal) => ...)` pattern

---

## Implementation Details

### SOLID + Depth Analysis

**RoleGuard:**

| Aspect | Assessment |
|--------|-----------|
| SRP | One reason to change: the role-checking redirect contract. Does not know about specific routes (caller decides `redirectTo`). Does not know about authentication (ProtectedRoute handles that). |
| Interface | 3 props (`allowedRoles`, `redirectTo`, `children`) — minimal |
| Implementation | Calls `hasAnyRole` (role resolution) + renders `<Navigate replace>` (navigation side-effect) |
| Deletion test | Delete → all role-protected routes need inline guards. Complexity scatters across `router.tsx`. Module earns its keep. |
| Seam | `RoleGuard` always sits inside `ProtectedRoute` — it can safely assume `isAuthenticated() === true`. This is documented in the router wiring (Task 4), not enforced by `RoleGuard` itself. |

**RoleGate:**

| Aspect | Assessment |
|--------|-----------|
| SRP | One reason to change: show/hide contract. No redirect; no router side-effect. |
| Interface | 2 props (`allowedRoles`, `children`) — even smaller than `RoleGuard` |
| Implementation | Calls `hasAnyRole` → renders `children` or `null` |
| Deletion test | Delete → every conditional UI element needs inline `hasAnyRole` checks scattered across the component tree. Complexity scatters. Module earns its keep. |
| Distinction | Callers choose `RoleGuard` for route-level enforcement; `RoleGate` for UI-level hiding. Same `hasAnyRole` call, completely different effect — two separate modules (not one with a flag) is the correct design. |

### Approach

Both modules follow the same structural shape as `ProtectedRoute`:
1. Accept `children: ReactNode` and role configuration.
2. Call `hasAnyRole` (from `authSession`) to check the current session.
3. Render either the protected content or the fallback (`<Navigate>` for `RoleGuard`, `null` for `RoleGate`).

The TDD cycle for each is vertical: write all 3 tests for the module, confirm RED (module not found), implement minimally, confirm GREEN.

### Files to Create/Modify

<!-- REVIEW-FIX: Added .tsx extension note. All 7 existing test files in this project use .ts extension. RoleGuard.test.tsx and RoleGate.test.tsx are the first component render tests that contain JSX (render(<Component />) and the Navigate mock factory). Any file with JSX syntax MUST use .tsx — creating them as .ts will produce a parse error ("JSX expressions are not allowed"). -->
- [x] `src/routes/RoleGuard.test.tsx` — **New** — 3 behavioral tests before implementation. **Must be `.tsx` (not `.ts`) — contains JSX in the Navigate mock factory and render calls.**
- [x] `src/routes/RoleGuard.tsx` — **New** — Route-level role guard
- [x] `src/components/common/RoleGate.test.tsx` — **New** — 3 behavioral tests before implementation. **Must be `.tsx` (not `.ts`) — contains JSX in render calls.**
- [x] `src/components/common/RoleGate.tsx` — **New** — Component-level role gate

---

## Step-by-Step Implementation

### Step 2.1: TDD — RoleGuard

**Goal:** Write 3 tests for `RoleGuard`, confirm RED, implement `RoleGuard`, confirm GREEN.

**Dependencies:** Task 1 complete (40 tests baseline, `hasAnyRole` exported from `authSession.ts`).

#### Sub-step 2.1a: Write Tests (RED)

- [x] Create `src/routes/RoleGuard.test.tsx` with the content below
- [x] Run `npm run test` — expect 1 failing suite ("Cannot find module './RoleGuard'" or equivalent), 40 passing tests — **CONFIRMED**: 1 failed suite (8 total), 40 passing

**Why this step is critical:**

The Navigate mock is the only mechanism that lets us test `RoleGuard`'s redirect path without a real browser router. The `NavigateProps` type annotation ensures the mock compiles correctly in TypeScript strict mode (the `replace` prop must be included in the type). The `beforeEach(() => localStorage.clear())` is mandatory — without it, roles set in test 1 persist in localStorage and cause test 2 to read stale role data.

#### Implementation — `src/routes/RoleGuard.test.tsx`

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import type { NavigateProps } from "react-router-dom"
import { UserRole } from "@/types/auth"
import { saveSession } from "@/services/authSession"
import { RoleGuard } from "./RoleGuard"

// vi.mock is hoisted above all imports by vitest.
// Using async importOriginal to spread the real react-router-dom and override
// only Navigate, preserving all other exports (BrowserRouter, Routes, etc.).
// NavigateProps is typed so the mock satisfies the `replace` prop that
// RoleGuard passes: <Navigate to={redirectTo} replace />.
// A narrow { to: string } type would fail TS2322 under strict mode.
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>()
  return {
    ...actual,
    Navigate: (props: NavigateProps) => (
      <div data-testid="navigate-to">{String(props.to)}</div>
    ),
  }
})

describe("RoleGuard", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("renders children when user has the required role", () => {
    saveSession("tok", "admin", ["ROLE_ADMIN"])
    render(
      <RoleGuard allowedRoles={[UserRole.ADMIN]} redirectTo="/conversations">
        <div>admin content</div>
      </RoleGuard>
    )
    expect(screen.getByText("admin content")).toBeDefined()
  })

  it("redirects to redirectTo when user does not have any allowed role", () => {
    saveSession("tok", "emp", ["ROLE_EMPLOYEE"])
    render(
      <RoleGuard allowedRoles={[UserRole.ADMIN]} redirectTo="/conversations">
        <div>admin content</div>
      </RoleGuard>
    )
    expect(screen.getByTestId("navigate-to").textContent).toBe("/conversations")
  })

  it("renders children when user has one of multiple allowed roles", () => {
    saveSession("tok", "emp", ["ROLE_EMPLOYEE"])
    render(
      <RoleGuard
        allowedRoles={[UserRole.ADMIN, UserRole.EMPLOYEE]}
        redirectTo="/login"
      >
        <div>shared content</div>
      </RoleGuard>
    )
    expect(screen.getByText("shared content")).toBeDefined()
  })
})
```

#### Sub-step 2.1b: Implement RoleGuard (GREEN)

- [x] Create `src/routes/RoleGuard.tsx` with the content below
- [x] Run `npm run test` — expect **43 tests passing, 0 failures** (40 previous + 3 new) — **CONFIRMED**: 43/43, 0 failures, 8 suites
- [x] Run `npm run typecheck` — expect 0 errors — **CONFIRMED**: 0 errors

**Why this implementation is correct:**

`Navigate` is imported as a value (used as JSX). `UserRole` and `ReactNode` are type-only imports (`import type`) — they are erased at compile time and satisfy `verbatimModuleSyntax: true`. `hasAnyRole` is a value import (called at runtime). No explicit return type annotation is needed: TypeScript infers `JSX.Element | ReactNode` from the two branches, matching the established pattern in `ProtectedRoute.tsx`.

#### Implementation — `src/routes/RoleGuard.tsx`

```tsx
import type { ReactNode } from "react"
import { Navigate } from "react-router-dom"
import { hasAnyRole } from "@/services/authSession"
import type { UserRole } from "@/types/auth"

type RoleGuardProps = {
  allowedRoles: UserRole[]
  redirectTo: string
  children: ReactNode
}

export function RoleGuard({ allowedRoles, redirectTo, children }: RoleGuardProps) {
  if (!hasAnyRole(allowedRoles)) {
    return <Navigate to={redirectTo} replace />
  }
  return children
}
```

#### Edge Cases

1. **No session (empty localStorage):** `hasAnyRole([...])` returns `false` (no roles). `RoleGuard` redirects. This is correct — `RoleGuard` always sits inside `ProtectedRoute` in the router, so unauthenticated users are blocked before reaching `RoleGuard`. If somehow reached without a session, the redirect is the safe fallback.

2. **`allowedRoles` is empty (`[]`):** `hasAnyRole([])` returns `false` (vacuously false — `[].some(...)` is false). `RoleGuard` redirects even if the user has roles. An empty `allowedRoles` effectively closes the route. This is consistent with `hasAnyRole` semantics verified in Task 1 test 4.

3. **Complex `children` (fragments, multiple elements):** `return children` handles all valid `ReactNode` values — including `null`, `ReactFragment`, and `ReactElement[]` — correctly in React 19. Follows the established `ProtectedRoute` pattern.

4. **`redirectTo` with query params:** `<Navigate to="/login?reason=unauthorized" />` — React Router accepts string paths with query params. No special handling needed.

5. **`String(props.to)` in the mock:** `NavigateProps.to` is typed as `To = string | Partial<Path>`. `String(str)` is a no-op for strings (our tests always pass string `redirectTo` values). The cast-free conversion avoids TypeScript issues while producing the correct `.textContent` for assertion.

---

### Step 2.2: TDD — RoleGate

**Goal:** Write 3 tests for `RoleGate`, confirm RED, implement `RoleGate`, confirm GREEN.

**Dependencies:** Step 2.1 complete (43 tests baseline).

#### Sub-step 2.2a: Write Tests (RED)

- [x] Create `src/components/common/RoleGate.test.tsx` with the content below
- [x] Run `npm run test` — expect 1 failing suite ("Cannot find module './RoleGate'" or equivalent), 43 passing tests — **CONFIRMED**: 1 failed suite (9 total), 43 passing

**Why this step is critical:**

`RoleGate` has no Navigate import, so no router mock is needed. The null-rendering test uses `container.firstChild` — the standard @testing-library/react idiom for asserting a component rendered nothing. `beforeEach(() => localStorage.clear())` is still required: `isUserRole` validates roles through `getRoles()`, and valid role strings persist in localStorage across tests if not cleared.

#### Implementation — `src/components/common/RoleGate.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { UserRole } from "@/types/auth"
import { saveSession } from "@/services/authSession"
import { RoleGate } from "./RoleGate"

describe("RoleGate", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("renders children when user has the required role", () => {
    saveSession("tok", "admin", ["ROLE_ADMIN"])
    render(
      <RoleGate allowedRoles={[UserRole.ADMIN]}>
        <div>admin content</div>
      </RoleGate>
    )
    expect(screen.getByText("admin content")).toBeDefined()
  })

  it("renders null when user does not have any allowed role", () => {
    saveSession("tok", "emp", ["ROLE_EMPLOYEE"])
    const { container } = render(
      <RoleGate allowedRoles={[UserRole.ADMIN]}>
        <div>admin content</div>
      </RoleGate>
    )
    expect(container.firstChild).toBeNull()
  })

  it("renders children when user has one of multiple allowed roles", () => {
    saveSession("tok", "emp", ["ROLE_EMPLOYEE"])
    render(
      <RoleGate allowedRoles={[UserRole.ADMIN, UserRole.EMPLOYEE]}>
        <div>shared content</div>
      </RoleGate>
    )
    expect(screen.getByText("shared content")).toBeDefined()
  })
})
```

#### Sub-step 2.2b: Implement RoleGate (GREEN)

- [x] Create `src/components/common/RoleGate.tsx` with the content below
- [x] Run `npm run test` — expect **46 tests passing, 0 failures** (43 previous + 3 new) — **CONFIRMED**: 46/46, 0 failures, 9 suites
- [x] Run `npm run typecheck` — expect 0 errors — **CONFIRMED**: 0 errors
- [x] Run `npm run build` — expect successful build — **CONFIRMED**: built in 10.03s, 0 errors

#### Implementation — `src/components/common/RoleGate.tsx`

```tsx
import type { ReactNode } from "react"
import { hasAnyRole } from "@/services/authSession"
import type { UserRole } from "@/types/auth"

type RoleGateProps = {
  allowedRoles: UserRole[]
  children: ReactNode
}

export function RoleGate({ allowedRoles, children }: RoleGateProps) {
  if (!hasAnyRole(allowedRoles)) {
    return null
  }
  return children
}
```

#### Edge Cases

1. **`allowedRoles` is empty (`[]`):** `hasAnyRole([])` returns `false`. `RoleGate` renders `null`. The gate is closed. Consistent with `RoleGuard` and `hasAnyRole` semantics.

2. **No session (empty localStorage):** `hasAnyRole([...])` returns `false`. `RoleGate` renders `null`. Correct — no session means no role, gate is closed.

3. **`children` is `null`:** `return children` when children is `null` — identical to `return null`. Both paths result in nothing rendered. `container.firstChild` is `null` in both cases.

4. **`container.firstChild` for null assertion:** `@testing-library/react` wraps the rendered output in a `div` container. When the component returns `null`, that container div has no children (`firstChild === null`). This is the idiomatic assertion for "nothing rendered" without `@testing-library/jest-dom`.

5. **No Router context needed:** `RoleGate` imports nothing from `react-router-dom`. Its test renders plain `<div>` children. No `BrowserRouter` or `MemoryRouter` wrapper is needed in any test case.

---

## Design Decisions

**Decision 1: `import type { UserRole }` in both guard files**
- **Why:** In `RoleGuard.tsx` and `RoleGate.tsx`, `UserRole` appears only as a type annotation (`allowedRoles: UserRole[]`) — it is not used as a value (no `UserRole.ADMIN`, no `Object.values(UserRole)`). `tsconfig.app.json` sets `verbatimModuleSyntax: true`, which requires that imports used only as types use `import type`. Contrast with `authSession.ts` where `UserRole` is used as both value and type, requiring a regular (non-type) import.
- **Alternatives considered:** `import { UserRole }` (value import). Would compile, but is semantically incorrect: TypeScript emits a warning under `verbatimModuleSyntax` that a value-import was written for something used only as a type. More importantly, it is inconsistent with the project's convention (established by `useLoginForm.test.ts:3: import type { FormEvent }`).

**Decision 2: `import type { NavigateProps }` in `RoleGuard.test.tsx`**
- **Why:** `NavigateProps` appears only as a type annotation in the mock callback parameter `(props: NavigateProps) => ...`. Type-only usage → `import type`. Consistent with `import type { FormEvent }` in `useLoginForm.test.ts`.
- **Alternatives considered:** `import { NavigateProps }`. Would work at runtime (types are erased) but violates `verbatimModuleSyntax: true` — TypeScript will flag it as a type import written without `type` modifier.

**Decision 3: `String(props.to)` in the Navigate mock instead of `{props.to}` or `{props.to as string}`**
- **Why:** `NavigateProps.to` is typed as `To = string | Partial<Path>`. Using `{props.to}` directly would cause TypeScript TS2322 ("Type 'To' is not assignable to type 'ReactNode'") because `Partial<Path>` is an object, not renderable. `String(props.to)` safely converts any `To` value to a string renderable as JSX. In our tests, `redirectTo` is always a string, so `String("/conversations") === "/conversations"`. No information is lost in the assertion.
- **Alternatives considered:** `{props.to as string}` — works but introduces a cast that technically bypasses type safety. `String()` is the cast-free conversion.

**Decision 4: `return children` vs `return <>{children}</>`**
- **Why:** `ProtectedRoute.tsx` establishes the `return children` pattern (no fragment wrapper). Both `RoleGuard` and `RoleGate` follow the same convention for consistency. In React 19, function components can return `ReactNode` directly. A fragment wrapper (`<>...</>`) would add an unnecessary extra node in the virtual DOM tree with no benefit.
- **Alternatives considered:** `return <>{children}</>`. Equivalent behavior, but adds a synthetic node. Rejected for consistency with `ProtectedRoute`.

**Decision 5: Two separate modules (`RoleGuard` + `RoleGate`) instead of one module with a `mode` flag**
- **Why:** SRP — each module has one reason to change. `RoleGuard`'s reason to change: the route-level redirect contract. `RoleGate`'s reason to change: the component-level show/hide contract. Merging them with a `redirect?: boolean` flag would give a single module two reasons to change, two test surfaces, and a more complex interface. ISP — callers that need show/hide should not be forced to depend on the redirect surface.
- **Alternatives considered:** `RoleGuard({ mode: "redirect" | "hide", ... })`. Rejected — mixing redirect and hide in one component couples unrelated behaviors and makes `redirectTo` conditionally required (a complex interface smell).

**Decision 6: No Router context wrapper in test renders**
- **Why:** `Navigate` is mocked to a plain `<div>`, so React Router's routing context is never accessed. `children` in tests are simple `<div>text</div>` elements that use no router hooks. Adding a `BrowserRouter` or `MemoryRouter` wrapper would add noise and couple tests to the router infrastructure unnecessarily.
- **When to change:** If `RoleGuard` is ever refactored to use `useNavigate()` instead of `<Navigate>`, switch to a real `MemoryRouter` test and assert on the rendered location instead of the Navigate mock. The parent feature notes this as a documented future change trigger.

---

## Testing Considerations

### Automatic Validation

**TDD RED cycle — Step 2.1a (before implementation):**

- [x] Run `npm run test` from `project/srcs/frontend/` — expect **1 failing suite** (RoleGuard tests fail with "Cannot find module './RoleGuard'"), **40 passing tests** — **CONFIRMED**: 1 failed (8 total) + 40 passing

**TDD GREEN cycle — Step 2.1b (after implementation):**

- [x] Run `npm run test` — expect **43 tests passing, 0 failures** (40 previous + 3 RoleGuard tests) — **CONFIRMED**: 43/43
- [x] Run `npm run typecheck` — expect **0 errors** — **CONFIRMED**: 0 errors

**TDD RED cycle — Step 2.2a (before implementation):**

- [x] Run `npm run test` — expect **1 failing suite** (RoleGate tests fail with "Cannot find module './RoleGate'"), **43 passing tests** — **CONFIRMED**: 1 failed (9 total) + 43 passing

**TDD GREEN cycle — Step 2.2b (after implementation):**

- [x] Run `npm run test` — expect **46 tests passing, 0 failures** (43 previous + 3 RoleGate tests) — **CONFIRMED**: 46/46, 9 suites
- [x] Run `npm run typecheck` — expect **0 errors** — **CONFIRMED**: 0 errors
- [x] Run `npm run build` from `project/srcs/frontend/` — expect **successful build, 0 errors** — **CONFIRMED**: built in 10.03s

<!-- REVIEW-FIX: Added auto-cleanup note explaining why afterEach(cleanup) is absent. @testing-library/react v16 registers afterEach(cleanup) automatically when vitest is detected — it clears the DOM between tests. This is SEPARATE from localStorage, which auto-cleanup does not touch. The beforeEach(() => localStorage.clear()) in the test files handles session state; @testing-library/react handles DOM state. Both mechanisms are required and non-overlapping. -->
> **Cleanup note:** `@testing-library/react` v16 auto-registers `afterEach(cleanup)` when vitest is detected, clearing the rendered DOM between tests. No explicit `afterEach(cleanup)` import is needed. This handles DOM isolation. `localStorage` is NOT cleared by this mechanism — the `beforeEach(() => localStorage.clear())` in both test files handles session isolation independently.

### Manual Validation

No manual validation is required for this task. Both modules are pure TypeScript/TSX — they have no UI of their own. `RoleGuard` redirects programmatically and `RoleGate` shows/hides children. Both behaviors are fully verified by the automated tests. Manual UI validation is deferred to Task 4 (pages and wiring) when `RoleGuard` is wired into `router.tsx` and `RoleGate` can be exercised in the browser.

---

## Related Code Explanations

- `src/routes/ProtectedRoute.tsx` — Reference implementation: same `children: ReactNode`, same `return children`, same `Navigate` usage, same absence of explicit return type annotation
- `src/services/authSession.ts:53–55` — `hasAnyRole` implementation; this is the only runtime dependency both new modules add
- `src/types/auth.ts` — `UserRole` const+type; type-only dependency in both guard files
- `src/features/authentication/hooks/useLoginForm.test.ts` — Reference for `vi.mock("react-router-dom", async (importOriginal) => ...)` pattern and `import type` for test-file type imports
- `src/services/authSession.test.ts:13` — `beforeEach(() => { localStorage.clear() })` — the cleanup pattern both new test files replicate

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task ✓ (see Parent Context)
- [x] `src/routes/RoleGuard.test.tsx` created with 3 tests before implementation (TDD RED confirmed)
- [x] `src/routes/RoleGuard.tsx` created: exports `RoleGuard({ allowedRoles, redirectTo, children })`, renders `<Navigate to={redirectTo} replace />` on role mismatch, renders `children` on role match
- [x] `src/components/common/RoleGate.test.tsx` created with 3 tests before implementation (TDD RED confirmed)
- [x] `src/components/common/RoleGate.tsx` created: exports `RoleGate({ allowedRoles, children })`, renders `null` on role mismatch, renders `children` on role match
- [x] Both test files include `beforeEach(() => { localStorage.clear() })` — confirmed before creating each test file
- [x] `RoleGuard.test.tsx` uses `vi.mock("react-router-dom", async (importOriginal) => ...)` with `NavigateProps` typed mock and `String(props.to)` rendering
- [x] `import type { NavigateProps }` used in `RoleGuard.test.tsx` (type-only import — `verbatimModuleSyntax` compliance)
- [x] `import type { UserRole }` used in both `RoleGuard.tsx` and `RoleGate.tsx` (type-only import — `verbatimModuleSyntax` compliance)
- [x] `npm run test` passes with **46 tests, 0 failures** after both implementations
- [x] `npm run typecheck` passes with **0 errors** after all four files are created
- [x] `npm run build` passes with **0 errors** after all four files are created
- [x] Parent feature Phase 2 steps (2.1, 2.2) marked `[x]` in `[[Frontend-Role-Based-Routing-and-Landing-Pages]]`
- [x] Task document link added in parent feature under Task 2
