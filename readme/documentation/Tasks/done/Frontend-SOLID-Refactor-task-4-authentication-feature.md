# Task: Authentication Feature Folder

#task #current #medium-complexity #parent-frontend-solid-refactor

**Parent:** [[Frontend-SOLID-Refactor]]
**Parent Type:** Feature
**Related Step(s):** Phase 4 — Steps 4.1, 4.2, 4.3, 4.4
**Estimated Complexity:** Medium

---

## Goal

Establish the `src/features/authentication/` boundary by moving and refactoring `authService.ts` (fixing the double-write bug and removing dead `logout()`), extracting form orchestration into a `useLoginForm` hook, thinning `LoginPage.tsx` to a pure renderer, and creating a public `index.ts` API — so all authentication concerns are grouped under one predictable directory and no caller outside the feature may deep-import its internals.

---

## Parent Context

[[Frontend-SOLID-Refactor]] identifies four code-level problems this task resolves:

1. **`authService.ts` double-write bug (Step 4.1):** `login()` calls `authSession.saveSession()` AND `LoginPage.tsx` also calls three `localStorage.setItem` calls directly for the same keys. Task 3 defined `saveSession()` as the single write seam; Task 4 migrates all callers to it.
2. **Dead `logout()` function (Step 4.1):** `authService.logout()` has zero callers — `Header.tsx` calls `clearSession()` directly from `authSession`, not `authService.logout()`. TypeScript's `tsc --noEmit` is the automatic removal verifier (TS2305/TS2339 if any import were missed through the index.ts re-export path).
3. **`LoginPage.tsx` mixes form orchestration with rendering (Steps 4.2 + 4.3):** The page owns four `useState` calls, `handleSubmit`, and direct `localStorage.setItem` calls. Extracting these into `useLoginForm` gives the page one responsibility: render the login UI using the hook's return values.
4. **No feature boundary (Steps 4.1–4.4):** Auth code is scattered across `src/services/` and `src/pages/`. `src/features/authentication/` with an `index.ts` public surface is the canonical single location; deep imports are forbidden.

**Authoritative phase ordering:** `Phase 1 → Phase 3 → Phase 2 → Phase 4 → (Phases 5 and 6 are independent)`. This task requires Tasks 1, 2, and 3 to be complete:
- `@/lib/api` (Task 2) — the Axios singleton `authService.ts` imports
- `@/services/authSession.saveSession` (Task 3) — the single write seam `authService.ts` calls instead of direct localStorage writes
- `@/types/auth` (Task 1) — `authSession.ts` imports `ROLE_ADMIN`, `ROLE_EMPLOYEE`, `UserRole` from here

**Parent constraints for this task:**
- `authService.ts` moves to `src/features/authentication/services/authService.ts`. The old `src/services/authService.ts` is deleted once `LoginPage.tsx` no longer imports it.
- `login()` calls `authSession.saveSession(data.token, data.username, data.roles)` — no direct `localStorage.setItem` calls in `authService`.
- `logout()` is removed from `authService`. Zero callers confirmed; removal automatically verified by `npm run typecheck` (a surviving import through index.ts would surface as TS2305).
- `useLoginForm` uses `useNavigate` from react-router-dom (push, default behavior) to navigate to `/dashboard` on success — NOT `window.location.href` (avoids the full-reload blank-flash bug).
- `LoginPage.tsx` keeps the `isAuthenticated()` redirect — this is routing logic, not form logic.
- Deep imports into `features/authentication/services/` or `features/authentication/hooks/` from outside the feature are forbidden. External callers use only `@/features/authentication`.

---

## Preconditions / Dependencies

- **Task 1 complete**: `src/types/auth.ts` exists; dead code removed from all affected files.
- **Task 2 complete**: `src/lib/api.ts` exists with `setOnUnauthorized` seam.
- **Task 3 complete**: `src/services/authSession.ts` exists with `saveSession()` and `clearSession()`; `main.tsx` is wired; all six callers updated; `authHelpers.ts` deleted.
- `npm run typecheck` passes with 0 errors; `npm run build` succeeds; `npm run test` passes with **16/16 tests** (4 `api.test.ts` + 12 `authSession.test.ts`) — this is the baseline to maintain throughout this task.
- Vitest infrastructure in place: `vitest.config.ts` with `jsdom` environment and `@/` alias; `package.json` has `"test": "vitest"` script.
- `@testing-library/react` is NOT yet installed — Step 4.0 installs it.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `solid-deep-design` — Selected — SRP + depth analysis for `authService.ts`, `useLoginForm.ts`, and the feature `index.ts`; deletion test on each new module; seam discipline for the `features/authentication/` boundary.
- `tdd` — Selected — TDD cycles for both new modules (`authService.test.ts` and `useLoginForm.test.ts`): write tests first, implement to pass, repeat.
- `documentation-management` — Selected — task file creation; `documentation/Tasks/current/` placement.
- `memory-bank` — Selected — project context loaded; Memory Bank updated at task completion.

### Documentation Reviewed

- **React Testing Library (Context7 `/testing-library/react-testing-library`):** `renderHook(fn, { wrapper })` renders a custom hook in isolation and returns `result.current` (the hook's return value). State updates inside `act()` are flushed synchronously. Async state updates require `await act(async () => { ... })`. Compatible with jsdom environment in Vitest.
- **react-router-dom 6.30.3 `useNavigate` (Context7 `/websites/reactrouter_6_30_3`):** `useNavigate()` returns a `NavigateFunction`. The default `navigate(to)` call (without `{ replace: true }`) pushes a new entry onto the history stack. Can be called inside custom hooks as long as the hook is used within a `<BrowserRouter>` (or test equivalent). Cannot be called at module scope — that is why `main.tsx` wires 401 forced logout with `window.location.href` instead.
- **Vitest 4.1.9 `vi.hoisted()` + `vi.mock()` factory:** `vi.hoisted(() => value)` executes a factory synchronously before `vi.mock()` factories run. This guarantees that variables initialized via `vi.hoisted` are available inside `vi.mock` factories, which are themselves hoisted above imports. The pattern is required when a `vi.mock` factory closure needs a variable that holds a `vi.fn()` reference used by tests.
- **TypeScript 5.9.3 `verbatimModuleSyntax`:** All type-only imports require the `type` keyword. `LoginResponse` in `authService.ts` is a local type alias — no import needed; declared inline.
- **`tsconfig.app.json` `"include": ["src"]`:** Test files placed under `src/` are included in the typecheck compilation. `noUnusedLocals: true` applies to test files — all imported symbols must be used.

### Related Existing Code

- `project/srcs/frontend/src/services/authService.ts` — the file being superseded; currently 28 lines with double-write bug and dead `logout()`.
- `project/srcs/frontend/src/services/authSession.ts` — exports `saveSession`, `clearSession`, and all session read functions; `authService.ts` will call `saveSession`.
- `project/srcs/frontend/src/lib/api.ts` — the Axios singleton `authService.ts` imports via `@/lib/api`.
- `project/srcs/frontend/src/pages/LoginPage.tsx` — the page being thinned; currently owns 4 useState calls, `handleSubmit`, and triple `localStorage.setItem` writes.
- `project/srcs/frontend/src/types/auth.ts` — `ROLE_ADMIN`, `ROLE_EMPLOYEE`, `UserRole` — imported by `authSession.ts`, NOT directly needed by `authService.ts` (no role constants used there).
- `project/srcs/frontend/src/main.tsx` — already wired with `setOnUnauthorized`; untouched in this task.
- `project/srcs/frontend/src/lib/api.test.ts` — 4 existing tests that must continue to pass after this task.
- `project/srcs/frontend/src/services/authSession.test.ts` — 12 existing tests that must continue to pass.

---

## Implementation Details

### Approach

The task executes four sequential work units. Each is independently type-checkable and test-verifiable before the next begins:

**Work unit A (Step 4.0 + 4.1):** Install `@testing-library/react`, write three tests for the new `authService.ts` (RED), create `features/authentication/services/authService.ts` to pass them (GREEN), and delete the old `src/services/authService.ts` as part of LoginPage's caller update.

**Work unit B (Step 4.2):** Write three tests for `useLoginForm.ts` (RED), create the hook (GREEN). The hook consumes the new `authService.ts` — it can only be written after Work Unit A.

**Work unit C (Step 4.3):** Create `features/authentication/index.ts`. This must exist before LoginPage can import from `@/features/authentication`.

**Work unit D (Step 4.4):** Thin `LoginPage.tsx` — remove four useState calls, `handleSubmit`, direct `localStorage.setItem` calls, and the `login` import; add `useLoginForm` from `@/features/authentication`; delete the old `src/services/authService.ts`.

**SOLID + Deep Module analysis:**

`features/authentication/services/authService.ts` (after refactoring):
- **SRP**: One responsibility — HTTP call to `/login` and session persistence delegation. Single reason to change: if the backend endpoint, payload shape, or response shape changes.
- **Depth**: Interface = 1 exported function (`login`). Implementation = Axios call + `saveSession` delegation. Interface is much smaller than the combined behavior. **Deletion test**: removing this file would scatter the `/login` Axios call, `LoginResponse` type, and `saveSession` invocation into callers — complexity scatters → module earns its place.
- **DIP compliance**: delegates session writes to `authSession.saveSession` (injected via import). No direct `localStorage` access — storage mechanics are `authSession`'s concern.

`features/authentication/hooks/useLoginForm.ts`:
- **SRP**: One responsibility — manage the login form interaction. Single reason to change: if the login form's user-facing behavior changes (fields, validation, error messaging, navigation target).
- **Depth**: Interface = `{ username, setUsername, password, setPassword, error, isLoading, handleSubmit }` (7 fields). Implementation = 4 state slots + async submit orchestration + navigation. The interface is much smaller than the accumulated behavior a caller would need to implement.
- **Deletion test**: removing this hook would scatter 4 useState calls, the async submit flow, error handling, and navigate call back into LoginPage, expanding a thin renderer into an orchestrator. Complexity scatters → the module earns its place.
- **Seam discipline**: `useNavigate` (react-router-dom) and `login` (authService) are the hook's two collaborators. Both are imported at the module level — no ports or adapters needed (these are standard library and feature-internal imports, not true infrastructure boundaries).

`features/authentication/index.ts`:
- **Purpose**: The feature boundary seam. A shallow pass-through that is correct here because its value is access control (preventing deep imports), not behavior concentration. The deletion test justifies it: removing it would leave no enforced boundary — callers could deep-import `services/authService.ts` directly, defeating the feature grouping.

### Files to Create/Modify

- [x] `project/srcs/frontend/package.json` — add `@testing-library/react` to `devDependencies` (Step 4.0)
- [x] `project/srcs/frontend/src/features/authentication/services/authService.test.ts` — **NEW FILE**: 3 TDD tests (Step 4.1a, RED)
- [x] `project/srcs/frontend/src/features/authentication/services/authService.ts` — **NEW FILE**: refactored auth service (Step 4.1b, GREEN)
- [x] `project/srcs/frontend/src/features/authentication/hooks/useLoginForm.test.ts` — **NEW FILE**: 3 TDD tests (Step 4.2a, RED)
- [x] `project/srcs/frontend/src/features/authentication/hooks/useLoginForm.ts` — **NEW FILE**: form orchestration hook (Step 4.2b, GREEN)
- [x] `project/srcs/frontend/src/features/authentication/index.ts` — **NEW FILE**: public API surface (Step 4.3)
- [x] `project/srcs/frontend/src/pages/LoginPage.tsx` — **THIN**: remove 4 useState calls, `handleSubmit`, triple `localStorage.setItem`; import `useLoginForm` from `@/features/authentication` (Step 4.4)
- [x] `project/srcs/frontend/src/services/authService.ts` — **DELETE**: superseded by `features/authentication/services/authService.ts` (Step 4.4)

---

## Step-by-Step Implementation

### Step 4.0: Install @testing-library/react

**Goal:** Add `@testing-library/react` to the project so `renderHook` and `act` are available for hook unit tests.
**Dependencies:** None — can run before any other step.

- [x] From `project/srcs/frontend/`, run: `npm install --save-dev @testing-library/react`

**Why this step is critical:**
`useLoginForm.test.ts` (Step 4.2a) calls `renderHook` from `@testing-library/react`. Without installing the package first, the test file cannot be created (the import would fail at the linting and type-checking stage). Installing now avoids a mid-step interruption.

#### Implementation

```bash
# Run from project/srcs/frontend/
npm install --save-dev @testing-library/react
```

Expected addition to `package.json devDependencies`:
```json
"@testing-library/react": "^16.x.x"
```

The package bundles `@testing-library/dom` as a dependency — no separate installation needed. No changes to `vitest.config.ts` are required: the `jsdom` environment already set in Step 2.0 satisfies React Testing Library's DOM requirement.

#### Edge Cases
1. **React 19 compatibility**: `@testing-library/react` v16 supports React 18 and 19. If the installed version is below v16, `act` semantics may differ. Verify with `npm ls @testing-library/react` after installation.
2. **No `@testing-library/user-event` needed**: the hook tests do not simulate real user events — they call the hook's `handleSubmit` function directly with a fake form event. `@testing-library/user-event` is not required.

---

### Step 4.1a: Write `authService.test.ts` at New Location (RED state)

**Goal:** Write three unit tests for the new `authService.ts` before the file exists. Tests confirm: POST payload is correct, `saveSession` is called with response data, and no direct `localStorage` writes occur.
**Dependencies:** Step 4.0 complete (Vitest infrastructure already in place from Task 2; no new deps needed here).

- [x] Create the directories `src/features/authentication/services/` (Vitest will pick up tests from anywhere under `src/`).
- [x] Create `project/srcs/frontend/src/features/authentication/services/authService.test.ts` with the following content:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import MockAdapter from "axios-mock-adapter"
import api from "@/lib/api"
import { saveSession } from "@/services/authSession"
import { login } from "./authService"

vi.mock("@/services/authSession", () => ({
  saveSession: vi.fn(),
}))

describe("authService.login", () => {
  let mock: InstanceType<typeof MockAdapter>

  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => {
    mock.restore()
    vi.clearAllMocks()
  })

  it("calls POST /login with the supplied username and password", async () => {
    mock.onPost("/login").reply(200, {
      token: "tok123",
      username: "alice",
      roles: ["ROLE_EMPLOYEE"],
    })

    await login("alice", "pass123")

    expect(mock.history.post).toHaveLength(1)
    const body = JSON.parse(mock.history.post[0].data as string)
    expect(body).toEqual({ username: "alice", password: "pass123" })
  })

  it("calls saveSession with token, username, and roles from the response", async () => {
    mock.onPost("/login").reply(200, {
      token: "tok123",
      username: "alice",
      roles: ["ROLE_EMPLOYEE"],
    })

    await login("alice", "pass123")

    expect(vi.mocked(saveSession)).toHaveBeenCalledOnce()
    expect(vi.mocked(saveSession)).toHaveBeenCalledWith(
      "tok123",
      "alice",
      ["ROLE_EMPLOYEE"]
    )
  })

  it("does not write to localStorage directly", async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem")
    mock.onPost("/login").reply(200, {
      token: "tok",
      username: "alice",
      roles: [],
    })

    await login("alice", "pass")

    expect(setItemSpy).not.toHaveBeenCalled()
    setItemSpy.mockRestore()
  })
})
```

- [x] Run `npm run test` from `project/srcs/frontend/` — must report **1 failing suite** ("Cannot find module './authService'") plus 16 passing tests from the other suites. This is the expected RED state.

**Why this test structure:**
- Test 1 verifies the HTTP layer — correct URL, correct request body shape. Uses `mock.history.post[0].data` to inspect the raw serialized body.
- Test 2 verifies the delegation contract — the new `authService.ts` must call `saveSession` (not write directly). `vi.mock("@/services/authSession")` replaces `saveSession` with a `vi.fn()` that records calls. `vi.mocked(saveSession)` gives proper TypeScript typing for the assertions.
- Test 3 verifies the absence of direct writes — `Storage.prototype.setItem` is a spy; if `authService.ts` calls `localStorage.setItem` directly, this test fails.

#### Edge Cases
1. **`vi.mock` hoisting and `saveSession` import:** `vi.mock("@/services/authSession")` is hoisted before all imports by Vitest's transform. When `authService.ts` imports `saveSession`, it receives the `vi.fn()` stub. When the test file imports `saveSession` for assertions, it also receives the same stub. `vi.clearAllMocks()` in `afterEach` resets call counts between tests — the stub identity is preserved.
2. **`Storage.prototype.setItem` spy scope:** `setItemSpy.mockRestore()` in test 3 removes the spy. Without restoration, the spy would persist into the next test. Since `authSession.ts` uses `localStorage.setItem` internally (via `saveSession`), and `saveSession` is mocked here, the spy correctly sees zero calls.
3. **`mock.history.post[0].data` is a serialized JSON string:** Axios serializes the request body via `JSON.stringify`. Parse it with `JSON.parse(...)` before asserting the shape.

---

### Step 4.1b: Create `authService.ts` at New Location (GREEN state)

**Goal:** Create `features/authentication/services/authService.ts` to pass the three tests. Call `saveSession` instead of three direct `localStorage.setItem` calls. Remove the dead `logout()` function.
**Dependencies:** Step 4.1a (test file exists and confirms RED state).

- [x] Create `project/srcs/frontend/src/features/authentication/services/authService.ts` with the following exact content:

```typescript
import api from "@/lib/api"
import { saveSession } from "@/services/authSession"

type LoginResponse = {
  token: string
  username: string
  roles: string[]
}

export async function login(
  username: string,
  password: string
): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>("/login", {
    username,
    password,
  })

  saveSession(response.data.token, response.data.username, response.data.roles)

  return response.data
}
```

- [x] Run `npm run test` from `project/srcs/frontend/` — must report **19 passing tests, 0 failures** (3 new + 16 existing). This confirms GREEN state.

**Why this step is critical:**
The three `localStorage.setItem` calls in the old `authService.ts` are the double-write half of the bug. With this change, `login()` delegates all session writes to `authSession.saveSession()` — the single write seam from Task 3. The `logout()` function had zero callers (`Header.tsx` already calls `clearSession()` from `authSession`; `LoginPage.tsx` is thinned in Step 4.4 and will not call `logout()`). Its removal is automatically verified at typecheck time if any re-export through `index.ts` were accidentally kept.

**SOLID + Depth analysis after refactoring:**
- **SRP**: `authService.ts` now has one reason to change — the `/login` HTTP contract. Session persistence mechanics are `authSession`'s concern.
- **Interface**: 1 exported function. **Implementation**: Axios POST + `saveSession` delegation + `LoginResponse` type.
- **Depth**: The file is intentionally lean — it earns its place as the explicit adapter between the HTTP boundary and the session seam.

#### Implementation — key differences from old `authService.ts`

| Old (`src/services/authService.ts`) | New (`features/authentication/services/authService.ts`) |
|-------------------------------------|--------------------------------------------------------|
| `import api from "@/lib/api"` | same |
| No `saveSession` import | `import { saveSession } from "@/services/authSession"` |
| 3 × `localStorage.setItem` in `login()` | `saveSession(data.token, data.username, data.roles)` |
| `export function logout()` (dead code) | removed |

#### Edge Cases
1. **`LoginResponse` stays local to this file:** The type is only used by `login()`'s return annotation. Moving it to `@/types/auth.ts` requires more than one file to need it. Currently, `useLoginForm.ts` will await `login()` but not reference `LoginResponse` directly — TypeScript infers the resolved type. No move needed.
2. **`logout()` removal is safe:** Zero callers confirmed by the Memory Bank and architecture doc. TypeScript's `tsc --noEmit` will surface any future re-export through `index.ts` (TS2305). No separate grep is required as the safety net.
3. **Old `src/services/authService.ts` still exists** at this point: `LoginPage.tsx` still imports from `@/services/authService`. The old file is deleted in Step 4.4 after `LoginPage.tsx`'s import is updated to `@/features/authentication`.

---

### Step 4.2a: Write `useLoginForm.test.ts` (RED state)

**Goal:** Write three unit tests for `useLoginForm.ts` before the file exists, covering the success path (navigate called), failure path (error set), and loading state.
**Dependencies:** Step 4.0 (`@testing-library/react` installed); Step 4.1b (`authService.ts` exists at new path so the mock factory can resolve the module).

- [x] Create `project/srcs/frontend/src/features/authentication/hooks/useLoginForm.test.ts` with the following content:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import type { FormEvent } from "react"
import { login } from "../services/authService"
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
  })

  it("calls navigate('/dashboard') on successful login", async () => {
    vi.mocked(login).mockResolvedValueOnce({
      token: "tok",
      username: "alice",
      roles: ["ROLE_EMPLOYEE"],
    })

    const { result } = renderHook(() => useLoginForm())
    // Keep a direct reference to the spy so we can assert it was called.
    const preventDefaultSpy = vi.fn()
    const fakeEvent = { preventDefault: preventDefaultSpy } as unknown as FormEvent<HTMLFormElement>

    await act(async () => {
      await result.current.handleSubmit(fakeEvent)
    })

    expect(preventDefaultSpy).toHaveBeenCalledOnce()
    expect(mockNavigate).toHaveBeenCalledOnce()
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard")
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

<!-- REVIEW-FIX: Test 1 updated to use a stored preventDefaultSpy reference instead of createFakeEvent() inline, enabling assertion that event.preventDefault() is called — critical behavioral check for preventing browser's default form POST -->

- [x] Run `npm run test` from `project/srcs/frontend/` — must report **1 failing suite** ("Cannot find module './useLoginForm'") plus 19 passing tests. This confirms RED state.

**Why this test structure:**
- **Test 1 (success path):** `vi.mocked(login).mockResolvedValueOnce(...)` simulates a successful backend response. A stored `preventDefaultSpy` reference enables asserting `event.preventDefault()` was called (prevents browser's default form POST — critical correctness check). `await act(async () => { await result.current.handleSubmit(...) })` drains all async state updates. `mockNavigate` must be called with `"/dashboard"` — asserts the SPA navigation (not `window.location.href`).
- **Test 2 (failure path):** `mockRejectedValueOnce` simulates a network/auth error. The hook must set `error` and must NOT call `navigate`. Both assertions verify the catch branch.
- **Test 3 (isLoading timing):** Uses a deferred promise to pause `login()` mid-flight. `act(() => { void fn() })` (synchronous act, not awaited) flushes the synchronous part of `handleSubmit` — specifically, `setIsLoading(true)` which fires before the first `await`. The deferred promise keeps `login()` pending. After the outer `act()` returns, `isLoading` is `true`. Then `await act(async () => { resolveLogin(...) })` drains the resolution and subsequent `setIsLoading(false)`.

#### Edge Cases
1. **`vi.hoisted(() => vi.fn())` is mandatory here:** `vi.mock` factories are hoisted above all imports. Without `vi.hoisted`, a top-level `const mockNavigate = vi.fn()` would be executed *after* the factory, so `mockNavigate` would be `undefined` inside the factory at the time it runs. `vi.hoisted` guarantees the value is initialized first.
2. **`vi.clearAllMocks()` in `beforeEach`:** Resets `mockNavigate.mock.calls`, `login.mock.calls`, and all other tracked mocks between tests. Without this, test 2's `expect(mockNavigate).not.toHaveBeenCalled()` might fail if test 1 ran first and left calls in the mock.
3. **`createFakeEvent()` type cast and stored spy pattern:** `{ preventDefault: vi.fn() }` satisfies the only method `handleSubmit` calls on the event. The `as unknown as FormEvent<HTMLFormElement>` cast is necessary because the fake object is a structural subset of the full event type. In test 1, a stored reference `preventDefaultSpy = vi.fn()` is created first and assigned to `fakeEvent.preventDefault`, so the assertion can call `expect(preventDefaultSpy).toHaveBeenCalledOnce()`. Tests 2 and 3 continue to use the `createFakeEvent()` helper (no `preventDefault` assertion needed in those tests).
4. **`import type { FormEvent } from "react"` is the correct form:** The `createFakeEvent()` return type uses `FormEvent<HTMLFormElement>`. Under `verbatimModuleSyntax: true`, type-only imports require the `type` keyword — hence `import type { FormEvent } from "react"`. This is preferable to `import type React from "react"` because it imports only the specific type needed rather than the full namespace, which is consistent with the implementation file's pattern (`import { useState, type FormEvent } from "react"`).
5. **`tsconfig.app.json` `include: ["src"]` means test files are typechecked:** `import type { FormEvent }` avoids an "unused variable" error from `noUnusedLocals` that would arise from a value import where only the type is used.

---

### Step 4.2b: Create `useLoginForm.ts` (GREEN state)

**Goal:** Create `features/authentication/hooks/useLoginForm.ts` so all three tests pass.
**Dependencies:** Step 4.2a (test file exists and confirms RED state); Step 4.1b (`login` from `../services/authService` exists).

- [x] Create `project/srcs/frontend/src/features/authentication/hooks/useLoginForm.ts` with the following exact content:

```typescript
import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { login } from "../services/authService"

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
      navigate("/dashboard")
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
<!-- REVIEW-FIX: Changed React.FormEvent → FormEvent with explicit `type FormEvent` import, consistent with the Edge Cases recommendation and avoids relying on ambient React namespace availability -->

- [x] Run `npm run test` from `project/srcs/frontend/` — must report **22 passing tests, 0 failures** (3 new + 19 from previous steps). This confirms GREEN state.

**Why this step is critical:**
`handleSubmit` now uses `navigate("/dashboard")` (SPA push navigation) instead of `window.location.href = "/dashboard"` (full reload). This is the key behavioral difference between the thinned `LoginPage.tsx` and the current one. The navigate call preserves React's in-memory state and avoids the blank-screen flash that a full reload causes. `useNavigate` requires the hook to be used inside a component within `<BrowserRouter>` (satisfied by `LoginPage.tsx` which renders inside `App.tsx`'s `<BrowserRouter>`).

**SOLID + Depth analysis:**
- **SRP**: One responsibility — the login form interaction (state, submission, navigation on success, error on failure). The rendering is LoginPage's concern.
- **Interface**: `{ username, setUsername, password, setPassword, error, isLoading, handleSubmit }` (7 fields). Every field is consumed by `LoginPage.tsx`.
- **Deletion test**: Removing this hook scatters the four useState calls, the async submit flow, the error-handling catch, and the navigate call back into `LoginPage.tsx`. The page would become an orchestrator again — violating SRP.

#### Edge Cases
1. **`import { useState, type FormEvent } from "react"` combines value and type imports:** Under `verbatimModuleSyntax: true` (TypeScript 5.9.3), type-only imports require the `type` keyword. The combined form `import { useState, type FormEvent }` imports `useState` as a value and `FormEvent` as a type in a single declaration — valid per TypeScript 4.5+ combined-import syntax. The implementation file avoids `import React from "react"` entirely, which is correct for the `"jsx": "react-jsx"` transform (no React namespace import needed for JSX). The type `FormEvent<HTMLFormElement>` is the named-export equivalent of the old `React.FormEvent<HTMLFormElement>` namespace form.

2. **`navigate("/dashboard")` is a push by default:** `NavigateOptions` `replace` defaults to `false`. The current `window.location.href = "/dashboard"` in `LoginPage.tsx` does NOT preserve history (it's a full reload). The new `navigate("/dashboard")` pushes a history entry, which means the user can press the browser back button to return to `/login`. This is an intentional UX improvement — the parent feature explicitly calls for `useNavigate` (push).

3. **`finally { setIsLoading(false) }` always runs:** Whether `login()` succeeds or fails, `isLoading` is reset. The test 3 timing relies on this: after `resolveLogin(...)` is called in `await act(async () => { ... })`, the `finally` block runs, setting `isLoading` to `false`.

---

### Step 4.3: Create `features/authentication/index.ts`

**Goal:** Create the public API surface for the `features/authentication/` module. External callers import only from here; deep imports into `services/` or `hooks/` are forbidden.
**Dependencies:** Step 4.1b and Step 4.2b complete — both modules being re-exported must exist.

- [x] Create `project/srcs/frontend/src/features/authentication/index.ts` with the following exact content:

```typescript
export { useLoginForm } from "./hooks/useLoginForm"
export { login } from "./services/authService"
```

**Why this step is critical:**
`LoginPage.tsx` in Step 4.4 imports `useLoginForm` from `@/features/authentication`. Without this `index.ts`, that import has no resolution target — TypeScript reports TS2307. The `index.ts` also enforces the feature boundary: once it is the only permitted import path for external callers, any deep import (`@/features/authentication/services/authService`) is a convention violation that code review and linting can catch.

**SOLID analysis:**
This file is intentionally shallow — it is a pure re-export index. Its depth is zero, which is acceptable for a boundary module. Shallow modules earn their place through access control, not behavior. The deletion test confirms: removing `index.ts` would force every external caller to either deep-import (defeating feature encapsulation) or stop compiling (if only `@/features/authentication` is allowed).

#### Edge Cases
1. **`login` re-exported but usually consumed by `useLoginForm` internally:** `login` is re-exported in case future pages or utilities need to call it directly (e.g., a programmatic token-refresh flow). It is not used directly by any existing external caller after Task 4.
2. **No re-export of `authSession` functions from this index:** `authSession` is not part of the `features/authentication/` feature — it is a shared infrastructure module. Its exports remain at `@/services/authSession`.
3. **`verbatimModuleSyntax: true` and re-exports:** Both re-exports are value exports (`useLoginForm` is a function, `login` is a function). No `export type` annotation is needed.

---

### Step 4.4: Thin `LoginPage.tsx`, Update Import, and Delete Old `authService.ts`

**Goal:** Remove form orchestration from `LoginPage.tsx` (call `useLoginForm()` instead), update the import from `@/services/authService` to `@/features/authentication`, delete the now-superseded `src/services/authService.ts`, and run the full typecheck + build gates.
**Dependencies:** Step 4.3 complete — `@/features/authentication` must exist before `LoginPage.tsx` can import from it.

- [x] Replace `project/srcs/frontend/src/pages/LoginPage.tsx` with the following thinned content:

```tsx
import { Link, Navigate, useLocation } from "react-router-dom"
import { isAuthenticated } from "@/services/authSession"
import { useLoginForm } from "@/features/authentication"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LoginPage() {
  const location = useLocation()
  const routeMessage = location.state?.message as string | undefined
  const {
    username,
    setUsername,
    password,
    setPassword,
    error,
    isLoading,
    handleSubmit,
  } = useLoginForm()

  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-4">
        {routeMessage && (
          <Card className="border-yellow-500/40 bg-yellow-500/10">
            <CardContent className="pt-6">
              <p className="text-sm text-yellow-200">{routeMessage}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>
              Enter your credentials to access AgentForge.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="admin"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Login"}
              </Button>

              <Link className="text-center text-sm underline" to="/">
                Back to homepage
              </Link>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
```

- [x] Delete `project/srcs/frontend/src/services/authService.ts`.
- [x] Run `npm run typecheck` from `project/srcs/frontend/` — must pass with **0 errors**. Validates: (a) `@/features/authentication` resolves to `index.ts`; (b) `useLoginForm()` return shape matches all JSX consumers; (c) `src/services/authService.ts` deletion causes no dangling imports (it was the only file importing from `./api` before Task 2, now nothing imports from the deleted location).
- [x] Run `npm run build` from `project/srcs/frontend/` — must succeed.
- [x] Run `npm run test` from `project/srcs/frontend/` — must pass with **22/22 tests, 0 failures**.

**Why this step is critical:**
After this step, `LoginPage.tsx` is a thin renderer: it calls `useLoginForm()`, destructures the return, and maps values to JSX. The page has one reason to change: the login UI layout. The double-write bug is fully resolved — neither `LoginPage.tsx` nor `authService.ts` writes to `localStorage` directly anymore; all session writes go through `authSession.saveSession()`.

**Removed from `LoginPage.tsx` in this step:**
- `import { useState } from "react"` (4 useState calls removed)
- `import { login } from "@/services/authService"` (authService no longer called from page)
- `const [username, setUsername] = useState("")`
- `const [password, setPassword] = useState("")`
- `const [error, setError] = useState("")`
- `const [isLoading, setIsLoading] = useState(false)`
- `async function handleSubmit(...)` body (moved to useLoginForm)
- Three `localStorage.setItem` calls inside `handleSubmit` (the double-write fix)
- `window.location.href = "/dashboard"` (replaced by `navigate("/dashboard")` in the hook)

**Added to `LoginPage.tsx` in this step:**
- `import { useLoginForm } from "@/features/authentication"`
- `const { username, setUsername, password, setPassword, error, isLoading, handleSubmit } = useLoginForm()`

#### Edge Cases
1. **Hook call placement before the `isAuthenticated()` guard:** React's rules of hooks require all hooks to be called before any conditional returns. `useLoginForm()` is called before `if (isAuthenticated()) { return <Navigate ... /> }`. This is valid — `isAuthenticated()` is a plain function, not a hook. The `useNavigate()` inside `useLoginForm` is also called unconditionally before the early return, which is correct.
2. **`useState` import removal from `LoginPage.tsx`:** The `useState` import is fully removed — the page no longer manages any local state. TypeScript's `noUnusedLocals: true` would catch it if accidentally left in.
3. **Deletion of `src/services/authService.ts` creates no orphaned imports:** The only external caller of this file was `LoginPage.tsx` (one import: `login`). After Step 4.4 updates `LoginPage.tsx`, no file imports from `@/services/authService`. TypeScript would surface any missed caller as TS2307 ("Cannot find module '@/services/authService'"). Deleting before running `npm run typecheck` is fine — `npm run typecheck` is the safety net.
4. **`navigate("/dashboard")` in `useLoginForm` vs `window.location.href` in old `LoginPage`:** The SPA navigation via `navigate` does not reset the browser tab or cause a blank-screen flash. The user experience is noticeably smoother than the old full reload.
5. **`handleSubmit` type:** `useLoginForm` returns `handleSubmit` typed as `(event: FormEvent<HTMLFormElement>) => Promise<void>`. This is the correct type for React's `onSubmit` handler on a `<form>` element. No type cast is needed at the JSX call site.

---

## Design Decisions

**Decision 1:** `features/authentication/` uses a strict `index.ts` boundary — no deep imports from external callers.
- **Why:** The parent feature mandates this pattern to prevent gradual erosion of the feature grouping. Without an enforced boundary, future callers could import directly from `features/authentication/services/authService.ts`, coupling them to internals that may be restructured.
- **Alternatives considered:** Allow direct deep imports initially and enforce the boundary later — rejected: the boundary is cheapest to establish at creation time; adding it later requires hunting down and refactoring existing deep imports.

**Decision 2:** `useNavigate` is mocked via `vi.hoisted` + `vi.mock` factory rather than using a real `MemoryRouter` wrapper.
- **Why:** `useNavigate` is the only react-router hook the test needs. Mocking it directly lets us assert `navigate` was called with the exact string `"/dashboard"` without parsing a route tree. A `MemoryRouter` wrapper would work but requires either additional assertions on the rendered URL or extra memory-router utilities — more complexity for the same coverage.
- **Alternatives considered:** Wrap `renderHook` with `{ wrapper: MemoryRouter }` and assert on the current location — rejected: would need `useLocation` or a capture component in the wrapper to observe navigation; more setup for equal signal.
- **Alternatives considered:** `createMemoryRouter` with a data router — rejected: the app uses `BrowserRouter` (not a data router), so this would introduce test infrastructure that doesn't match production behavior.

**Decision 3:** `logout()` is removed from `authService.ts` rather than kept for backward compatibility.
- **Why:** Zero callers confirmed. Keeping dead code in a module that was just moved and refactored propagates the confusion about what the module's responsibilities are. TypeScript's `tsc --noEmit` is the automated zero-caller verifier — it catches any surviving import that would trigger a compile error.
- **Alternatives considered:** Keep `logout()` and deprecate — rejected: the function does the same thing as `clearSession()` from `authSession.ts`. Having two functions with the same behavior in two modules is a violation of the "single point of truth" principle.

**Decision 4:** `LoginResponse` type stays local in `authService.ts` and is NOT moved to `src/types/auth.ts`.
- **Why:** The parent feature says "move it to `src/types/auth.ts` if used by more than this file." After Task 4, `LoginResponse` is only used by `authService.ts`'s return annotation. `useLoginForm.ts` awaits `login()` but infers the type — it never explicitly references `LoginResponse`. No external caller needs this type. Keeping it local to `authService.ts` keeps the type boundary at the module that owns the HTTP contract.
- **Alternatives considered:** Move to `@/types/auth.ts` preemptively — rejected: adding types to a shared module for hypothetical future use is premature generalization.

**Decision 5:** `setError("")` is called inside `handleSubmit` at the start of each submission, before the async call.
- **Why:** Clears any previous error message when the user retries. Without this, a failed login attempt would permanently show the error even if the user corrects the input and tries again. The `setError("")` call happens synchronously before the `await`, so it is always flushed as part of the same batched React update as `setIsLoading(true)`.
- **Alternatives considered:** Only clear the error on input change — rejected: requires additional `onChange` handlers; adds complexity; the parent feature does not specify this behavior.

**Decision 6:** Steps 4.3 and 4.4 in this task are in the opposite order from the parent document.
- **Why:** The parent feature lists Step 4.3 as "thin `LoginPage.tsx`" and Step 4.4 as "create `index.ts`". However, the thinned `LoginPage.tsx` imports `useLoginForm` from `@/features/authentication` — which is the `index.ts` public API. The `index.ts` must therefore exist before the `LoginPage.tsx` import can be updated. Executing the parent's ordering (thin LoginPage before creating index.ts) would produce a TS2307 compile error on the new import. This is a silent dependency in the parent that the parent's step ordering does not surface.
- **Alternatives considered:** Create index.ts stub with just `useLoginForm` first, then thin LoginPage, then add `login` to index.ts — rejected: unnecessary split of a single 2-line file; creates a partially complete state with no benefit.
- **Alternatives considered:** Thin LoginPage using a direct deep import (`@/features/authentication/hooks/useLoginForm`) initially and update to the index.ts path in the same step as creating index.ts — rejected: introduces a deep import as an intermediate step, which the parent explicitly forbids. The reordering is the cleanest resolution.

<!-- REVIEW-FIX: Added Design Decision 6 documenting the step reordering (4.3/4.4 swapped from parent) and its rationale, preventing executor confusion when cross-referencing parent and task documents -->

---

## Testing Considerations

### Automatic Validation

#### TDD Cycles

**authService.test.ts (Step 4.1a):**
- [x] After creating `authService.test.ts` (before `authService.ts`): run `npm run test` — must show **1 failing suite** ("Cannot find module './authService'") + 16 passing tests elsewhere.
- [x] After creating `authService.ts` (Step 4.1b): run `npm run test` — must show **19 passing tests, 0 failures**.

**useLoginForm.test.ts (Step 4.2a):**
- [x] After creating `useLoginForm.test.ts` (before `useLoginForm.ts`): run `npm run test` — must show **1 failing suite** ("Cannot find module './useLoginForm'") + 19 passing tests elsewhere.
- [x] After creating `useLoginForm.ts` (Step 4.2b): run `npm run test` — must show **22 passing tests, 0 failures**.

#### Typecheck and Build Gates

- [x] After Step 4.3 (create `index.ts`): run `npm run typecheck` — must pass with **0 errors**. Validates that the `index.ts` re-exports resolve correctly.
- [x] After Step 4.4 (thin `LoginPage.tsx`, delete `src/services/authService.ts`): run `npm run typecheck` — must pass with **0 errors**. Key validations: `@/features/authentication` resolves to `index.ts`; deleted `src/services/authService.ts` has no surviving import; `useLoginForm()` return type satisfies all JSX consumers in `LoginPage.tsx`.
- [x] After Step 4.4: run `npm run build` from `project/srcs/frontend/` — must succeed.
- [x] After Step 4.4: run `npm run test` — must pass with **22/22 tests, 0 failures**.

### Manual Validation

The following steps require a running frontend and backend (Docker Compose with the full stack). They cannot be automated in unit tests because they involve the browser, real network calls, and URL navigation.

- [x] Start the dev server (`npm run dev` from `project/srcs/frontend/`). Navigate to `http://localhost:3000/login`. Confirm the login form renders correctly with username and password fields, the Login button, and the "Back to homepage" link.
- [x] Enter valid credentials and click Login. Confirm: (a) the form shows "Logging in…" on the button while the request is in-flight; (b) the page navigates to `/dashboard` after success; (c) the username and role appear in the header. Open DevTools → Application → Local Storage — confirm `token`, `username`, and `roles` keys are set (written by `authSession.saveSession`, not directly by LoginPage).
- [x] Verify the SPA navigation: after the successful login redirect to `/dashboard`, press the browser back button. Confirm the browser navigates back to `/login` (not a full-page reload — indicates `navigate("/dashboard")` pushed a history entry, not `window.location.href`).
- [x] Enter invalid credentials and click Login. Confirm the error message "Invalid username or password" appears below the password field. Confirm the button returns to "Login" (isLoading resets to false after the catch).

---

## Related Code Explanations

- `project/srcs/frontend/src/services/authService.ts` — the old file being superseded; 28 lines, double-write bug in `login()`, dead `logout()`.
- `project/srcs/frontend/src/services/authSession.ts:1–11` — `saveSession(token, username, roles)` is the write seam called by the new `authService.ts`.
- `project/srcs/frontend/src/lib/api.ts` — the Axios singleton imported by `authService.ts` via `@/lib/api`.
- `project/srcs/frontend/src/pages/LoginPage.tsx` — the page being thinned; JSX structure is fully preserved, only the state management and submission logic are removed.
- `project/srcs/frontend/src/App.tsx` — renders `<BrowserRouter>` wrapping `<Routes>`; this is the router context that makes `useNavigate()` inside `useLoginForm` valid at runtime.
- `documentation/Memory/known-issues.md:56` — "Fix pending in [[Frontend-SOLID-Refactor]] Task 4, Step 4.1" — this task IS the fix; the known-issue entry should be updated to `[x] resolved` upon task completion.
- `documentation/Memory/architecture.md:33` — "Double-write fix pending in [[Frontend-SOLID-Refactor]] Task 4, Step 4.1" — update this line upon task completion.

---

## Completion Criteria

- [x] Parent document [[Frontend-SOLID-Refactor]] reviewed; parent context, phase ordering, and architectural constraints accurately reflected in this task.
- [x] Relevant skills (`solid-deep-design`, `tdd`, `documentation-management`, `memory-bank`) reviewed and applied.
- [x] `@testing-library/react` installed (`npm install --save-dev @testing-library/react` from `project/srcs/frontend/`).
- [x] `project/srcs/frontend/src/features/authentication/services/authService.test.ts` created with 3 unit tests.
- [x] `npm run test` in RED state (1 failing suite — "Cannot find module './authService'") confirmed — tests written before implementation.
- [x] `project/srcs/frontend/src/features/authentication/services/authService.ts` created: imports `saveSession` from `@/services/authSession`, calls `saveSession()` instead of 3 × `localStorage.setItem`, no `logout()` export.
- [x] `npm run test` passes with **19/19 tests** after Step 4.1b (GREEN state).
- [x] `project/srcs/frontend/src/features/authentication/hooks/useLoginForm.test.ts` created with 3 unit tests.
- [x] `npm run test` in RED state (1 failing suite — "Cannot find module './useLoginForm'") confirmed — tests written before implementation.
- [x] `project/srcs/frontend/src/features/authentication/hooks/useLoginForm.ts` created: uses `useNavigate` for SPA navigation to `/dashboard`, calls `login` from `../services/authService`, sets `error` on failure, resets `isLoading` in `finally`.
- [x] `npm run test` passes with **22/22 tests** after Step 4.2b (GREEN state).
- [x] `project/srcs/frontend/src/features/authentication/index.ts` created: re-exports `useLoginForm` and `login`.
- [x] `project/srcs/frontend/src/pages/LoginPage.tsx` thinned: 4 `useState` calls removed, `handleSubmit` body removed, 3 `localStorage.setItem` calls removed, `import { login } from "@/services/authService"` removed, `import { useLoginForm } from "@/features/authentication"` added, `useLoginForm()` destructured, JSX unchanged.
- [x] `project/srcs/frontend/src/services/authService.ts` deleted.
- [x] `npm run typecheck` passes with **0 errors** after Step 4.4.
- [x] `npm run build` passes after Step 4.4.
- [x] `npm run test` passes with **22/22 tests, 0 failures** after Step 4.4.
- [x] `documentation/Memory/known-issues.md:56` updated: "Fix pending in [[Frontend-SOLID-Refactor]] Task 4, Step 4.1" → "Resolved in [[Frontend-SOLID-Refactor-task-4-authentication-feature]]: `login()` now calls `authSession.saveSession()`; `LoginPage.tsx` no longer writes to localStorage directly."
- [x] `documentation/Memory/architecture.md:33` updated: "Double-write fix pending in [[Frontend-SOLID-Refactor]] Task 4, Step 4.1" → removed or marked resolved, with the frontend auth flow step 3 corrected to: "`authService.login()` calls `authSession.saveSession(token, username, roles)` — single write."
- [x] Parent feature [[Frontend-SOLID-Refactor]] Phase 4 steps (4.1, 4.2, 4.3, 4.4) marked `[x]`.
- [x] Task 4 wiki link added to parent document [[Frontend-SOLID-Refactor]] under the Task 4 section (replace `(add when task is created)` with `[[Frontend-SOLID-Refactor-task-4-authentication-feature]]`).
- [x] Memory Bank updated: prepend a dated `## YYYY-MM-DD` entry to `documentation/Memory/progress.md` summarising what was done, linking to [[Frontend-SOLID-Refactor]] and [[Frontend-SOLID-Refactor-task-4-authentication-feature]]; update `documentation/Memory/context.md` to reflect Task 4 complete, Tasks 5 and 6 next (independent of each other).
- [x] Manual validation steps documented above performed by the user.
