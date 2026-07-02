# Task: Role-Aware Login Redirect (TDD)

#task #current #low-complexity #parent-frontend-role-based-routing-and-landing-pages

**Parent:** [[Frontend-Role-Based-Routing-and-Landing-Pages]]
**Parent Type:** Feature
**Related Step(s):** Phase 3 — Steps 3.1, 3.2 *(TDD execution order is reversed from parent: this task's Step 3.1 = test update/RED, Step 3.2 = implementation/GREEN; parent's 3.1 = implementation, 3.2 = tests — see Design Decision 3)*
**Estimated Complexity:** Low

---

## Goal

Replace the unconditional `navigate("/dashboard")` in `useLoginForm.ts` with a role-aware redirect so that admins navigate to `/dashboard` and employees navigate to `/conversations` after a successful login. Update `useLoginForm.test.ts` to split the existing single success test into role-specific admin and employee variants, each pre-seeding `localStorage` via `saveSession` to simulate the production session state that `isAdmin()` reads from.

---

## Parent Context

The parent feature (`Frontend-Role-Based-Routing-and-Landing-Pages`) adds role-based routing. Task 1 established the `UserRole` identity and `hasAnyRole`/`isAdmin()` helpers. Task 2 created `RoleGuard` (route-level redirect) and `RoleGate` (component-level gate). This task is **independent of Task 2** — it depends only on Task 1 (`isAdmin()` must exist in `authSession.ts`) and can be done in parallel with Task 2 after Task 1 completes.

### What the parent says about this task

**Steps covered:** 3.1 (update `useLoginForm.ts`) and 3.2 (update `useLoginForm.test.ts`).

**Behavioral intent:** After a successful login, the hook reads the user's role from the already-written `localStorage` (via `isAdmin()`) and navigates to the role-correct landing page. Admins go to `/dashboard`; everyone else (employees) goes to `/conversations`.

**Timing invariant:** `authService.login()` calls `saveSession()` synchronously before its returned promise resolves. When `await login(username, password)` in `useLoginForm.ts` settles, `saveSession()` has already written the roles to `localStorage`. Therefore, `isAdmin()` can safely read roles immediately after the `await`.

**Test contract (from parent's Testing Decisions table):**

| What is tested |
|---------------|
| Admin login → `navigate("/dashboard")` |
| Employee login → `navigate("/conversations")` |

**Critical note from parent:** The existing `calls navigate('/dashboard') on successful login` test asserts `navigate("/dashboard")` unconditionally. After the implementation change, this test must be replaced by two role-specific tests. Steps 3.1 and 3.2 must be executed together — never leave a broken test unresolved. The TDD approach in this task document handles this by writing the updated tests first (RED) and then implementing (GREEN), so the broken state is the intentional RED signal.

**Test setup constraint from parent:** Since `authService.login` is mocked in tests and the mock does not call `saveSession`, tests must call `saveSession(...)` explicitly in the arrange step before `handleSubmit` is called. This pre-populates `localStorage` so `isAdmin()` reads the correct roles.

---

## Preconditions / Dependencies

- **Task 1 complete:** `src/services/authSession.ts` exports `isAdmin(): boolean` (reads `UserRole.ADMIN` from validated `getRoles(): UserRole[]`). Current state: `isAdmin()` is at line 61 of `authSession.ts`.
- **Task 2 complete or in progress:** Not required for this task — Task 3 is independent of Task 2 per the parent's dependency graph.
- **Test baseline:** 46 tests across 9 suites, 0 failures, 0 typecheck errors (confirmed after Task 2 completion).
- `@testing-library/react` 16.3.2 is installed — `renderHook` and `act` are available.
- `vitest` 4.1.9 is installed — `vi.mock`, `vi.hoisted`, `vi.mocked`, `vi.clearAllMocks` are available.
- `vitest.config.ts` maps `@/` → `./src` — alias-based imports work in test files.
- `tsconfig.app.json` sets `verbatimModuleSyntax: true`, `erasableSyntaxOnly: true`, `noUnusedLocals: true`, `noUnusedParameters: true`, `strict: true`.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `tdd` — **Selected** — Governs the TDD cycle: write tests first (RED), implement minimally (GREEN). Enforces vertical slice: update tests → confirm RED → implement → confirm GREEN.
- `solid-deep-design` — **Selected** — Applied to confirm SRP is maintained: `useLoginForm` retains one reason to change (login form orchestration). Adding role-aware navigation is within its existing responsibility scope.
- `documentation-management` — **Selected** — Governs task document location and template.
- `memory-bank` — **Selected** — Project context loaded; confirmed current codebase state after Tasks 1 and 2.
- `find-docs` — **Not invoked** — All test patterns are already established in the existing `useLoginForm.test.ts` (`vi.hoisted`, `vi.mock`, `renderHook`, `act`). No new library API surface is introduced. The `isAdmin` import pattern is already demonstrated in `authSession.ts` and its test.
- `react-best-practices` — **Not invoked** — This task modifies a hook's navigation logic, not UI rendering or component composition.

### Documentation Reviewed

- **`src/features/authentication/hooks/useLoginForm.ts`** — Confirmed: `navigate("/dashboard")` is at line 21; `isAdmin` is NOT currently imported; all imports are value imports (`useState`, `useNavigate`, `login`).
- **`src/features/authentication/hooks/useLoginForm.test.ts`** — Confirmed: 3 tests, `vi.hoisted`+`vi.mock` for `useNavigate`, `vi.mock` for `authService`, `beforeEach(() => vi.clearAllMocks())`, no `localStorage.clear()`, no `saveSession` import. `saveSession` must be added.
- **`src/services/authSession.ts`** — Confirmed: `isAdmin(): boolean` is exported at line 61; `saveSession(token, username, roles: string[])` is exported at line 11; `UserRole` is imported as a value.
- **`tsconfig.app.json`** — `verbatimModuleSyntax: true` → `isAdmin` is used as a value (called at runtime) → must use a non-`type` import. `noUnusedLocals: true` → `isAdmin` must be used in the function body (it is, in the `navigate` call).
- **`vitest.config.ts`** — `@/` alias resolves to `./src` → `import { saveSession } from "@/services/authSession"` resolves correctly in test files.

### Related Existing Code

- `src/features/authentication/hooks/useLoginForm.ts:21` — `navigate("/dashboard")` — the line being changed
- `src/features/authentication/hooks/useLoginForm.test.ts:33-52` — existing success test being replaced
- `src/features/authentication/hooks/useLoginForm.test.ts:28-31` — `beforeEach` block being updated
- `src/services/authSession.ts:61-63` — `isAdmin()` implementation
- `src/services/authSession.ts:11-19` — `saveSession()` — used in test arrange steps
- `src/routes/RoleGuard.test.tsx:11` — reference for `beforeEach(() => localStorage.clear())` pattern established in Task 2
- `src/services/authSession.test.ts:13` — `beforeEach(() => { localStorage.clear() })` — the project's established localStorage cleanup pattern

---

## Implementation Details

### Approach

**SOLID analysis — SRP check:**

`useLoginForm` has one reason to change: the login form orchestration contract. It owns: form field state (`username`, `password`, `error`, `isLoading`), submit handler (calls `login`, navigates on success, sets error on failure), and the return interface consumed by `LoginPage.tsx`. Adding role-aware navigation extends the submit handler's post-success action — it does not add a new responsibility. SRP is maintained.

**Depth analysis:**

`useLoginForm` is a thin orchestration hook (not a deep module in itself), and adding the role check does not change its depth profile. `isAdmin()` is a deep module — it hides localStorage reads and type validation behind a `boolean` interface. We use it as-is; no deepening is needed here.

**Deletion test:** If `isAdmin()` were inlined as `getRoles().includes(UserRole.ADMIN)` inside `useLoginForm.ts`, the role-validation complexity would scatter (each caller would duplicate the read boundary). `isAdmin()` earns its keep by hiding that complexity. We correctly call it here rather than reimplementing it.

**`isAdmin()` as the role discriminant:**

With exactly 2 roles (admin → `/dashboard`, employee → `/conversations`), a ternary is clean and readable. The ternary is: `isAdmin() ? "/dashboard" : "/conversations"`. This is the pattern the parent feature document specifies. If a third role is added in the future, this should be replaced with a lookup map (role → route).

**Timing:**

`authService.login()` calls `saveSession()` synchronously within its async function body (before the returned `Promise` resolves from the caller's perspective). By the time `await login(username, password)` settles in `useLoginForm`, localStorage already contains the session data. `isAdmin()` can safely read roles immediately after the `await`.

In tests, the mock `login` does not call `saveSession`. Tests must pre-populate localStorage in the arrange step (`saveSession("tok", ..., [roles])` called BEFORE `handleSubmit`) to simulate the production invariant.

**TDD ordering (deviation from parent step numbering):**

The parent's step numbering is 3.1 (implementation) then 3.2 (tests). The TDD skill requires tests first. This document reverses the execution order: Step 3.1 in this document is the test update (RED), and Step 3.2 is the implementation (GREEN). The parent's "always execute together" warning is satisfied because TDD naturally does this as a single RED → GREEN cycle.

### Files to Create/Modify

- [x] `src/features/authentication/hooks/useLoginForm.test.ts` — **Modify** — add `localStorage.clear()` to `beforeEach`, add `saveSession` import, replace 1 success test with 2 role-specific tests
- [x] `src/features/authentication/hooks/useLoginForm.ts` — **Modify** — add `isAdmin` import, replace `navigate("/dashboard")` with role-aware ternary

---

## Step-by-Step Implementation

### Step 3.1: Update tests — RED

**Goal:** Update `useLoginForm.test.ts` to declare the correct role-specific expectations BEFORE the implementation change. This creates a RED state where the new employee test fails (the current implementation always navigates to `/dashboard`), providing a clean verification signal.

**Dependencies:** Task 1 complete (`isAdmin` and `saveSession` are exported from `authSession.ts`). Test baseline: 46 tests, 0 failures.

**TDD discipline:** The test update must be applied and the RED state confirmed before touching `useLoginForm.ts`. Never implement first.

- [x] Add `import { saveSession } from "@/services/authSession"` to `useLoginForm.test.ts`
- [x] Update `beforeEach` to add `localStorage.clear()` (alongside the existing `vi.clearAllMocks()`)
- [x] Remove the existing `calls navigate('/dashboard') on successful login` test
- [x] Add the `admin login navigates to /dashboard` test (see implementation below)
- [x] Add the `employee login navigates to /conversations` test (see implementation below)
- [x] Run `npm run test` from `project/srcs/frontend/` — expect **1 failing suite** (useLoginForm suite, employee test fails), **46 passing tests** out of 47 total — **confirm RED**

**Why this step is critical:**

The RED state is the proof that the test is actually asserting the right behavior. If both tests pass before the implementation change, the tests are not distinguishing between admin and employee paths — they are useless. The employee test must fail with the current implementation to validate it is testing the right thing.

**Expected RED state explanation:**

After test update, before implementation:
- Admin test: arranges `saveSession(..."ROLE_ADMIN")`. Mock `login` resolves. Old code: `navigate("/dashboard")`. Admin test expects `/dashboard` → **PASSES** (admin path already works by coincidence with old hardcoded impl)
- Employee test: arranges `saveSession(..."ROLE_EMPLOYEE")`. Mock `login` resolves. Old code: `navigate("/dashboard")`. Employee test expects `/conversations` → **FAILS** (old impl ignores roles)

**Why `saveSession` is used in the arrange step (not in the mock):**

`authService.login` is mocked via `vi.mock("../services/authService", ...)`. The mock returns a value but does NOT call `saveSession`. In production, `authService.login()` calls `saveSession()` synchronously before the promise settles. To simulate this, tests call `saveSession(...)` explicitly BEFORE `handleSubmit` — so when `isAdmin()` reads `localStorage` after the `await login(...)` resolves, the roles are already present.

#### Implementation — updated `useLoginForm.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import type { FormEvent } from "react"
import { login } from "../services/authService"
import { saveSession } from "@/services/authSession"    // ADD: needed for arrange step
import { useLoginForm } from "./useLoginForm"

// vi.hoisted guarantees mockNavigate is initialized before the vi.mock factory runs.
// Vitest hoists vi.mock calls above all imports, so closures in the factory must
// reference variables that are already initialized — vi.hoisted provides that guarantee.
const mockNavigate = vi.hoisted(() => vi.fn())

vi.mock("react-router-dom", async (importOriginal) => {
  const mod = await importOriginal<typeof import("react-router-dom")>()
  return {
    ...mod,
    useNavigate: () => mockNavigate,
  }
})

vi.mock("../services/authService", () => ({
  login: vi.fn(),
}))

function createFakeEvent(): FormEvent<HTMLFormElement> {
  return { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>
}

describe("useLoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()    // ADD: prevent role bleed between tests
  })

  // REPLACED: was "calls navigate('/dashboard') on successful login" (unconditional)
  // Split into two role-specific tests per parent feature spec.

  it("admin login navigates to /dashboard", async () => {
    // Arrange: pre-populate localStorage with admin roles.
    // In production, authService.login() calls saveSession() before its promise resolves.
    // The mock does not call saveSession, so we do it explicitly here.
    saveSession("tok", "admin", ["ROLE_ADMIN"])
    vi.mocked(login).mockResolvedValueOnce({
      token: "tok",
      username: "admin",
      roles: ["ROLE_ADMIN"],
    })

    const { result } = renderHook(() => useLoginForm())
    const preventDefaultSpy = vi.fn()
    const fakeEvent = { preventDefault: preventDefaultSpy } as unknown as FormEvent<HTMLFormElement>

    await act(async () => {
      await result.current.handleSubmit(fakeEvent)
    })

    expect(preventDefaultSpy).toHaveBeenCalledOnce()
    expect(mockNavigate).toHaveBeenCalledOnce()
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard")
  })

  it("employee login navigates to /conversations", async () => {
    // Arrange: pre-populate localStorage with employee roles.
    saveSession("tok", "emp", ["ROLE_EMPLOYEE"])
    vi.mocked(login).mockResolvedValueOnce({
      token: "tok",
      username: "emp",
      roles: ["ROLE_EMPLOYEE"],
    })

    const { result } = renderHook(() => useLoginForm())
    const preventDefaultSpy = vi.fn()
    const fakeEvent = { preventDefault: preventDefaultSpy } as unknown as FormEvent<HTMLFormElement>

    await act(async () => {
      await result.current.handleSubmit(fakeEvent)
    })

    expect(preventDefaultSpy).toHaveBeenCalledOnce()
    expect(mockNavigate).toHaveBeenCalledOnce()
    expect(mockNavigate).toHaveBeenCalledWith("/conversations")
  })

  it("sets error to 'Invalid username or password' when login fails", async () => {
    vi.mocked(login).mockRejectedValueOnce(new Error("401 Unauthorized"))

    const { result } = renderHook(() => useLoginForm())

    await act(async () => {
      await result.current.handleSubmit(createFakeEvent())
    })

    expect(result.current.error).toBe("Invalid username or password")
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it("sets isLoading to true while awaiting login, then false after resolution", async () => {
    let resolveLogin!: (val: { token: string; username: string; roles: string[] }) => void
    vi.mocked(login).mockReturnValueOnce(
      new Promise<{ token: string; username: string; roles: string[] }>(
        (res) => { resolveLogin = res }
      )
    )

    const { result } = renderHook(() => useLoginForm())

    // Fire handleSubmit without awaiting — setIsLoading(true) runs synchronously
    // before the first `await login(...)`, so act() flushes it immediately.
    act(() => {
      void result.current.handleSubmit(createFakeEvent())
    })

    expect(result.current.isLoading).toBe(true)

    // Resolve the deferred promise and drain React's async state updates.
    await act(async () => {
      resolveLogin({ token: "tok", username: "alice", roles: [] })
    })

    expect(result.current.isLoading).toBe(false)
  })
})
```

**Change summary:**
1. Added `import { saveSession } from "@/services/authSession"` (value import — called at runtime in arrange steps)
2. Added `localStorage.clear()` to `beforeEach`
3. Removed `calls navigate('/dashboard') on successful login` (1 test)
4. Added `admin login navigates to /dashboard` (1 test)
5. Added `employee login navigates to /conversations` (1 test)
6. Kept `sets error...` and `sets isLoading...` tests unchanged

Net test count: 3 → 4 tests in this suite. Total: 46 → 47 tests.

**Why `import { saveSession }` (not `import type { saveSession }`):**

`saveSession` is called at runtime in the test's arrange step (it writes to jsdom's `localStorage`). This is a value usage → non-`type` import. `verbatimModuleSyntax: true` requires this distinction.

**Why `@/services/authSession` (not a relative path):**

`@/services/authSession` resolves via the `@/` alias from `vitest.config.ts`. The `authSession` module is NOT mocked in this test file (only `"../services/authService"` and `"react-router-dom"` are mocked), so the real `saveSession` and `isAdmin` implementations run against jsdom's `localStorage`. The alias path is consistent with how other files reference `authSession`.

#### Edge Cases

1. **Admin test passes before implementation (RED state):** The admin test arranges `["ROLE_ADMIN"]` in localStorage but the old implementation ignores localStorage and always navigates to `/dashboard`. The test expects `/dashboard` → passes. This is acceptable — the RED state is defined by the employee test failing, not by the admin test failing.

2. **Employee test fails before implementation (RED state):** After arranging `["ROLE_EMPLOYEE"]`, the old `navigate("/dashboard")` fires. Test expects `/conversations` → fails with `Expected: "/conversations", Received: "/dashboard"`. This is the intended RED signal.

3. **isLoading test unaffected by localStorage change:** The isLoading test does not call `saveSession`. After `localStorage.clear()` in `beforeEach`, `isAdmin()` reads an empty session → returns `false` → `navigate("/conversations")` is called. The test only asserts `isLoading` state, not the navigation destination — it passes regardless. ✓

4. **Error test unaffected:** When `login` rejects, the `navigate(...)` call is never reached. `mockNavigate` is not called. The test asserts `expect(mockNavigate).not.toHaveBeenCalled()` → passes regardless of role state. ✓

---

### Step 3.2: Implement — GREEN

**Goal:** Update `useLoginForm.ts` to call `isAdmin()` after login succeeds and navigate to the role-correct landing page. After this change, both role-specific tests pass.

**Dependencies:** Step 3.1 complete (RED state confirmed — employee test failing).

- [x] Add `import { isAdmin } from "@/services/authSession"` to `useLoginForm.ts`
- [x] Replace `navigate("/dashboard")` (line 21) with `navigate(isAdmin() ? "/dashboard" : "/conversations")`
- [x] Run `npm run test` — expect **47 tests passing, 0 failures** — **confirm GREEN**
- [x] Run `npm run typecheck` — expect **0 errors**
- [x] Run `npm run build` — expect **successful build, 0 errors**

**Why this step is critical:**

After this change, `useLoginForm` reads the real session state (written synchronously by `authService.login()` before the promise resolves) to make the navigation decision. The role-aware redirect is the behavior that drives both `RoleGuard`'s redirect target semantics and the user's post-login experience.

#### Implementation — updated `useLoginForm.ts`

```typescript
import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { login } from "../services/authService"
import { isAdmin } from "@/services/authSession"    // ADD

export function useLoginForm() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      await login(username, password)
      navigate(isAdmin() ? "/dashboard" : "/conversations")    // CHANGED
    } catch (err) {
      setError("Invalid username or password")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    username,
    setUsername,
    password,
    setPassword,
    error,
    isLoading,
    handleSubmit,
  }
}
```

**Change summary:**
1. Added `import { isAdmin } from "@/services/authSession"` — value import (called at runtime)
2. Replaced `navigate("/dashboard")` with `navigate(isAdmin() ? "/dashboard" : "/conversations")`

**Why `import { isAdmin }` (not `import type { isAdmin }`):**

`isAdmin` is a function called at runtime (value usage). `verbatimModuleSyntax: true` requires non-`type` imports for value usages. `import type` would cause a `TS1484` error: `'isAdmin' cannot be used as a value because it was imported using 'import type'`.

**Why `isAdmin()` (not `isEmployee()`):**

Two roles, one check: admin is the privileged role with a specific landing page (`/dashboard`). The else branch covers everyone else — currently only employees, but the ternary structure ensures any future non-admin role also falls through to `/conversations`. This is the safer default: unknown or unmodeled roles land on the employee page, not the admin page.

**Why `isAdmin()` is safe to call immediately after `await login(username, password)`:**

`authService.login()` calls `saveSession(token, username, roles)` synchronously in its async body before returning. When the `await login(...)` in `useLoginForm` settles, the roles are already in `localStorage`. `isAdmin()` → `hasRole(UserRole.ADMIN)` → `getRoles().includes(UserRole.ADMIN)` reads from `localStorage` that is already populated. No race condition.

#### Edge Cases

1. **User has both `ROLE_ADMIN` and `ROLE_EMPLOYEE`:** `isAdmin()` → `true` → navigates to `/dashboard`. Admin landing page is the priority. ✓

2. **User has no roles (empty roles array):** `isAdmin()` → `false` → navigates to `/conversations`. Acceptable fallback — routing is task 4's responsibility (RoleGuard will redirect if needed). ✓

3. **User has an unmodeled role (future backend role not yet in `UserRole`):** `getRoles()` drops unmodeled strings via `isUserRole`. `isAdmin()` → `false` → navigates to `/conversations`. Safe — no admin access granted to unmodeled roles. ✓

4. **Login fails (catch branch):** `isAdmin()` is only called in the `try` block after `await login(...)` resolves. If login throws, the navigate call is never reached. `isAdmin()` is never called on failure. ✓

5. **`noUnusedLocals`:** `isAdmin` is used in the `navigate` call — not unused. TypeScript will not flag it. ✓

---

## Design Decisions

**Decision 1: `isAdmin()` ternary (not a role-to-route lookup table)**
- **Why:** With exactly 2 roles in the MVP (admin and employee), `isAdmin() ? "/dashboard" : "/conversations"` is readable, direct, and matches the parent feature's specified implementation verbatim. A lookup table (`{ [UserRole.ADMIN]: "/dashboard", [UserRole.EMPLOYEE]: "/conversations" }`) would be over-engineering for 2 entries and would require knowing the current user's specific role (not just whether they are admin), which is a slightly different semantic than what `isAdmin()` provides.
- **Alternatives considered:** Role-to-route map with `getRoles()[0]` as the key. Rejected because `getRoles()` can return multiple roles (e.g., a future user with both roles), making the `[0]` selection order-dependent. `isAdmin()` checks membership, which is more robust. The lookup table approach should be adopted if a 3rd role is added.

**Decision 2: TDD ordering — tests updated first (Step 3.1), implementation second (Step 3.2)**
- **Why:** The TDD skill mandates tests first. More importantly, writing the tests first provides a concrete, observable RED signal (employee test fails) that confirms the test is actually distinguishing between the two navigation paths. If implementation came first and tests were written after, the tests might be written to match the implementation (confirming it rather than specifying it).
- **Alternatives considered:** Follow the parent's step numbering (implementation first, tests second). Rejected — this is the "horizontal slicing" anti-pattern called out in the TDD skill. The parent's numbering describes logical intent, not execution order.

**Decision 3: `saveSession` in test arrange step (not added to authService mock)**
- **Why:** `saveSession` writes to jsdom's `localStorage`. `isAdmin()` reads from that same `localStorage`. Making tests call `saveSession` before `handleSubmit` directly mirrors the production invariant where `authService.login()` calls `saveSession()` before its promise resolves. The alternative — adding `saveSession` calls inside the `vi.mocked(login).mockResolvedValueOnce()` callback — is not possible because `mockResolvedValueOnce` only accepts a return value, not a side-effect function.
- **Alternatives considered:** Mock `authSession.isAdmin` to return a fixed value. Rejected — mocking `isAdmin` would test the mock, not the production code path. The test would pass regardless of what `authSession.ts` actually does. Using the real `isAdmin()` + real `saveSession()` + jsdom `localStorage` is the correct behavior-level test surface.

**Decision 4: `localStorage.clear()` added to `beforeEach` alongside `vi.clearAllMocks()`**
- **Why:** `vi.clearAllMocks()` resets mock function call history and return values but does NOT clear `localStorage`. If a test calls `saveSession("tok", "admin", ["ROLE_ADMIN"])` and `localStorage` is not cleared before the next test, the admin roles persist. The next test (even without its own `saveSession` call) would read stale admin roles from `isAdmin()`. Clearing `localStorage` in `beforeEach` gives each test a clean session state, consistent with `authSession.test.ts:13`, `RoleGuard.test.tsx:13`, and `RoleGate.test.tsx:13`.
- **Alternatives considered:** Clear `localStorage` in `afterEach`. Functionally equivalent but less conventional in this codebase. All existing tests use `beforeEach`. Using `beforeEach` ensures isolation even if a test fails mid-way without running its cleanup logic.

**Decision 5: `import { isAdmin } from "@/services/authSession"` (alias path, not relative)**
- **Why:** The `@/` alias resolves to `./src`. Using `@/services/authSession` is consistent with how callers across the frontend reference session utilities (e.g., `DashboardPage.tsx`, `Header.tsx`). A relative path from `src/features/authentication/hooks/` would be `../../../services/authSession` — verbose and error-prone if files are moved.
- **Alternatives considered:** `import { isAdmin } from "../../../services/authSession"` (relative). Functionally equivalent, but noisier and couples to directory depth. Rejected in favor of the alias pattern.

---

## Testing Considerations

### Automatic Validation

**TDD RED cycle — Step 3.1 (after updating tests, before implementing):**

- [x] Run `npm run test` from `project/srcs/frontend/` — expect **47 total tests**: 1 failing suite (`useLoginForm` — employee test fails with `Expected: "/conversations", Received: "/dashboard"`), **46 passing tests** — **CONFIRM RED before proceeding to Step 3.2**

**TDD GREEN cycle — Step 3.2 (after implementing):**

- [x] Run `npm run test` from `project/srcs/frontend/` — expect **47 tests passing, 0 failures, 9 suites** — **confirm GREEN**
- [x] Run `npm run typecheck` from `project/srcs/frontend/` — expect **0 errors**
- [x] Run `npm run build` from `project/srcs/frontend/` — expect **successful build, 0 errors**

**Post-task gate:**

- [x] Mark parent feature Phase 3 steps (3.1, 3.2) as `[x]` in `[[Frontend-Role-Based-Routing-and-Landing-Pages]]`
- [x] Add Task 3 wiki link in parent feature under Task 3: `[[Frontend-Role-Based-Routing-and-Landing-Pages-task-3-role-aware-login-redirect]]`

### Manual Validation

No manual validation is required for this task. All changes are in the hook logic and its test. No rendered UI changes, no new routes, no new components. Manual validation of the role-aware redirect in the browser is deferred to Task 4 (pages and wiring), when `ConversationsPage` is created and `router.tsx` is wired — without those, navigating to `/conversations` after employee login would show a 404.

---

## Related Code Explanations

- `src/features/authentication/hooks/useLoginForm.ts:21` — The single line being changed: `navigate("/dashboard")` → `navigate(isAdmin() ? "/dashboard" : "/conversations")`
- `src/features/authentication/hooks/useLoginForm.test.ts:33-52` — The existing success test being replaced by two role-specific tests
- `src/services/authSession.ts:61-63` — `isAdmin()` implementation: `return hasRole(UserRole.ADMIN)` reads from the validated `getRoles(): UserRole[]`
- `src/services/authSession.ts:11-19` — `saveSession(token, username, roles: string[])` — used in test arrange steps to pre-populate jsdom `localStorage`
- `src/features/authentication/services/authService.ts:19` — `saveSession(response.data.token, ...)` — called synchronously here BEFORE the promise resolves; this is why `isAdmin()` is safe to call immediately after `await login(...)`
- `src/services/authSession.test.ts:13` — `beforeEach(() => { localStorage.clear() })` — the project's established localStorage cleanup pattern that this task replicates

---

## Completion Criteria

- [ ] Parent document reviewed and reflected accurately in this task ✓ (see Parent Context)
- [ ] Relevant skills reviewed and selected (see Skills and Documentation Preparation)
- [x] `src/features/authentication/hooks/useLoginForm.test.ts` updated:
  - [x] `import { saveSession } from "@/services/authSession"` added
  - [x] `localStorage.clear()` added to `beforeEach` alongside `vi.clearAllMocks()`
  - [x] Old `calls navigate('/dashboard') on successful login` test removed
  - [x] `admin login navigates to /dashboard` test added (with `saveSession` arrange step + `/dashboard` assertion)
  - [x] `employee login navigates to /conversations` test added (with `saveSession` arrange step + `/conversations` assertion)
  - [x] Error test and isLoading test kept unchanged
- [x] TDD RED state confirmed: `npm run test` shows 47 total tests, 1 failing (employee test), 46 passing — before touching `useLoginForm.ts`
- [x] `src/features/authentication/hooks/useLoginForm.ts` updated:
  - [x] `import { isAdmin } from "@/services/authSession"` added (value import — non-`type`)
  - [x] `navigate("/dashboard")` replaced with `navigate(isAdmin() ? "/dashboard" : "/conversations")`
- [x] `npm run test` passes with **47 tests, 0 failures** (TDD GREEN)
- [x] `npm run typecheck` passes with **0 errors**
- [x] `npm run build` passes with **0 errors**
- [x] Parent feature Phase 3 steps (3.1, 3.2) marked `[x]` in `[[Frontend-Role-Based-Routing-and-Landing-Pages]]`
- [x] Task 3 wiki link added in parent feature `[[Frontend-Role-Based-Routing-and-Landing-Pages]]` — in the **Task 3** section, replace `Task Document Link: [Add when the task document is created]` with `Task Document Link: [[Frontend-Role-Based-Routing-and-Landing-Pages-task-3-role-aware-login-redirect]]` <!-- REVIEW-FIX: Specified exact location in parent document where the wiki link must be added -->
