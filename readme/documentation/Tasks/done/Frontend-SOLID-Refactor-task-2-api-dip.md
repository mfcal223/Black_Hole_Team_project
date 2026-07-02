# Task: HTTP Client DIP Refactoring

#task #current #medium-complexity #parent-frontend-solid-refactor

**Parent:** [[Frontend-SOLID-Refactor]]
**Parent Type:** Feature
**Related Step(s):** Phase 2 — Steps 2.1, 2.2, 2.3
**Estimated Complexity:** Medium

---

## Goal

Move `src/services/api.ts` to `src/lib/api.ts`, apply the Dependency Inversion Principle by replacing inline 401 side-effects with an injectable callback seam, wire the callback at the composition root in `main.tsx`, update the one existing caller, and establish the Vitest infrastructure with the first frontend unit tests.

---

## Parent Context

[[Frontend-SOLID-Refactor]] identifies the existing `api.ts` as a DIP violation: its 401 response interceptor directly calls `localStorage.removeItem` and sets `window.location.href` — coupling an infrastructure adapter to application-layer session logic and browser navigation. The fix applies the Dependency Inversion Principle: `api.ts` becomes a pure HTTP adapter that accepts a callback (`setOnUnauthorized`) rather than importing session or routing modules.

**Authoritative phase ordering:** `Phase 1 → Phase 3 → Phase 2 → Phase 4`. **This task (Phase 2) depends on Task 3 (Phase 3) being complete.** The `main.tsx` wiring (Step 2.2) calls `clearSession()` from `@/services/authSession`, which Task 3 creates. Do not execute Step 2.2 until Task 3 is done.

**Parent constraints for this task:**
- `createApi` must be kept **private** (not exported) — called once at module load. Exporting it would allow callers to create unconfigured second instances.
- Export only the singleton instance (`export default api`) and `setOnUnauthorized(cb: () => void)`.
- The 401 interceptor must default to `() => { window.location.href = "/login" }` so a 401 always logs out even if `main.tsx` forgets to wire the callback.
- `api.ts` imports only `axios` — never `authSession`, React, or router modules.
- Forced logout on 401 uses `window.location.href` (full reload — correct for invalid/expired token; all in-memory state is stale), NOT `useNavigate` (which is reserved for the SPA success-path navigation in Task 4).
- The `setOnUnauthorized` wiring in `main.tsx` is called **synchronously before `createRoot`** so no HTTP request can fire before the callback is in place.

---

## Preconditions / Dependencies

- **Task 1 complete**: dead code removed from `authHelpers.ts`, `authService.ts`, and others; `src/types/auth.ts` created. The codebase typechecks at 0 errors and builds successfully.
- **Task 3 complete** (before executing Step 2.2 only): `src/services/authSession.ts` must exist and export `clearSession()`. Steps 2.1, 2.3, and the tests (Step 2.4) can be executed independently of Task 3.
- `src/lib/` directory already exists (`src/lib/utils.ts` is in place) — `src/lib/api.ts` can be created directly.
- `vite.config.ts` already defines the `@/` alias (`"@": path.resolve(__dirname, "./src")`).
- No frontend tests exist yet — this task establishes the Vitest infrastructure.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `solid-deep-design` — Selected — DIP analysis of the `onUnauthorizedCb` seam; depth/deletion-test evaluation of the refactored `api.ts`; seam discipline (two adapters justify the seam: production wiring in `main.tsx` + test mock adapter).
- `tdd` — Selected — test strategy for `api.ts`: 4 unit tests against the module's public interface; vertical TDD slice (write each test, make it pass, repeat); Vitest + `axios-mock-adapter` are the test stack.
- `documentation-management` — Selected — task file creation in `documentation/Tasks/current/`.
- `memory-bank` — Selected — project context loaded.

### Documentation Reviewed

- **Axios 1.18.0 interceptors (Context7 `/axios/axios`)**: `InternalAxiosRequestConfig` is the correct type for request interceptor config parameters in Axios v1.x. `error.response?.status` and `error.config?.url` are the correct paths to read status and URL in response interceptor error handlers. `axios.create({ baseURL })` returns an `AxiosInstance` with its own interceptor chain.
- **TypeScript 5.9.3 `verbatimModuleSyntax`**: All type-only imports require the `type` keyword. `import type { InternalAxiosRequestConfig } from "axios"` is used (type-only — not needed at runtime). Runtime imports (`axios`) use the standard form.
- **Vitest with Vite 7.3.1**: Vitest 3.x is compatible with Vite 7. `vitest.config.ts` must define the `@/` alias to match `vite.config.ts` (Vitest does not inherit Vite config automatically). `jsdom` environment enables `window` and `localStorage` APIs in tests. `axios-mock-adapter` 2.x provides a clean adapter for mocking Axios instance responses in unit tests.

### Related Existing Code

- `project/srcs/frontend/src/services/api.ts` — current file being replaced; note the dead block comment at top (lines 1–7) and dead example block at bottom (lines 50–71) — both disappear with the rewrite.
- `project/srcs/frontend/src/services/authService.ts:1` — only existing caller of `./api`; import must update to `@/lib/api`.
- `project/srcs/frontend/src/main.tsx` — composition root; receives `setOnUnauthorized` wiring.
- `project/srcs/frontend/src/services/authHelpers.ts` — still named `authHelpers` and exports `clearAuth`; Task 3 renames it to `authSession` and `clearAuth` to `clearSession`. Step 2.2 imports from `@/services/authSession` (Task 3's output).

---

## Implementation Details

### Approach

The refactor has four steps executed in this order: (0) Vitest infrastructure, (1) create `src/lib/api.ts` with TDD, (2) wire `main.tsx` (Task 3 prerequisite), (3) update the one caller and delete the old file.

**SOLID + Deep Module analysis:**

`src/lib/api.ts` after refactoring:
- **SRP**: One responsibility — HTTP transport adapter. Attaches JWT, routes 401 to an injected callback. No session storage writes, no router imports.
- **DIP**: `onUnauthorizedCb` is the inversion point. The high-level session-clearing logic (in `main.tsx`) depends on the adapter's abstraction (`setOnUnauthorized`), not the other way around.
- **Seam discipline**: Two adapters exist at the `setOnUnauthorized` seam — the production implementation (wired in `main.tsx`: `clearSession + window.location.href`) and the test mock (`vi.fn()`). Two adapters justify the seam.
- **Depth**: Interface = 2 exports (`api` singleton + `setOnUnauthorized`). Implementation = request interceptor (JWT injection) + response interceptor (401 routing with fail-safe). The interface is much smaller than the implementation — the module is deep.
- **Deletion test**: Removing `src/lib/api.ts` would scatter JWT injection, 401 handling, and base URL configuration into every file that makes HTTP calls. Complexity scatters → the module earns its place.

**Module-level state for `onUnauthorizedCb`:**
A `let` variable at module scope holds the callback. The fail-safe default is set at declaration time — no `undefined` state is possible. `setOnUnauthorized(cb)` simply reassigns the variable. This is safe for the single-page-app lifecycle (module loads once, `main.tsx` wires the callback once before any render).

### Files to Create/Modify

- [ ] `package.json` — add `vitest`, `jsdom`, `axios-mock-adapter` to `devDependencies`; add `"test": "vitest"` script.
- [ ] `project/srcs/frontend/vitest.config.ts` — **NEW FILE**: jsdom environment + `@/` alias.
- [ ] `project/srcs/frontend/src/lib/api.ts` — **NEW FILE**: refactored HTTP adapter with `setOnUnauthorized` seam.
- [ ] `project/srcs/frontend/src/lib/api.test.ts` — **NEW FILE**: 4 unit tests for `api.ts` interceptor behavior.
- [ ] `project/srcs/frontend/src/services/api.ts` — **DELETE** after `src/lib/api.ts` is verified.
- [ ] `project/srcs/frontend/src/main.tsx` — wire `setOnUnauthorized` callback (Step 2.2; execute after Task 3).
- [ ] `project/srcs/frontend/src/services/authService.ts` — update import from `"./api"` → `"@/lib/api"`.

---

## Step-by-Step Implementation

### Step 2.0: Vitest Infrastructure Setup

**Goal:** Install Vitest and its dependencies; create `vitest.config.ts`; add `"test"` script to `package.json`.
**Dependencies:** None — can run before any other step.

- [ ] In `project/srcs/frontend/`, run: `npm install --save-dev vitest jsdom axios-mock-adapter`
- [ ] Add `"test": "vitest"` to the `scripts` section of `package.json`.
- [ ] Create `project/srcs/frontend/vitest.config.ts` with the content below.

**Why this step is critical:**
Vitest must be in place before the TDD cycle in Step 2.1 can begin. The `@/` alias must be replicated in `vitest.config.ts` because Vitest does not inherit `vite.config.ts` automatically — tests importing `@/lib/api` will fail to resolve without the alias.

#### Implementation

```typescript
// project/srcs/frontend/vitest.config.ts
import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    environment: "jsdom",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
```

`package.json` scripts section after the change:
```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "eslint .",
  "format": "prettier --write \"**/*.{ts,tsx}\"",
  "typecheck": "tsc --noEmit",
  "preview": "vite preview",
  "test": "vitest"
},
```

#### Edge Cases
1. **`@types/node` already installed**: `@types/node` is present in `devDependencies` (`^24.12.0`), so `path.resolve(__dirname, ...)` in `vitest.config.ts` resolves correctly without additional TS changes.
2. **`axios-mock-adapter` types**: `axios-mock-adapter` 2.x ships its own TypeScript definitions — no separate `@types/axios-mock-adapter` package is needed.
3. **`verbatimModuleSyntax` in tests**: `vitest.config.ts` is NOT compiled through `tsconfig.app.json` (which has `verbatimModuleSyntax: true`). Vitest processes its own config file through its own TypeScript pipeline. Test files are processed through Vite's pipeline and will respect `verbatimModuleSyntax` — explicit type-only imports (`import type`) must be used in test files where applicable.

---

### Step 2.1: Create `src/lib/api.ts` (TDD: tests first, then implementation)

**Goal:** Create the refactored HTTP adapter at `src/lib/api.ts` following the DIP design. Apply TDD — write the test file first, then implement `api.ts` to make the tests pass.
**Dependencies:** Step 2.0 (Vitest installed).

#### 2.1a — Write Tests First (RED state)

Create `project/srcs/frontend/src/lib/api.test.ts` before implementing `api.ts`. The tests will fail until Step 2.1b creates the implementation.

<!-- REVIEW-FIX: Restructured test file — fail-safe test moved FIRST (must run before any setOnUnauthorized call to test the module-default callback); afterEach now resets window.location to prevent state leak; substitute-callback approach removed in favour of window.location.pathname assertion against JSDOM's synchronous location update. -->
- [ ] Create `project/srcs/frontend/src/lib/api.test.ts` with the following content:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import MockAdapter from "axios-mock-adapter"
import api, { setOnUnauthorized } from "./api"

describe("api — response interceptor", () => {
  let mock: InstanceType<typeof MockAdapter>

  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => {
    mock.restore()
    // Reset location to prevent state leak between tests. The fail-safe test
    // (first below) sets window.location.href = "/login"; pushState restores
    // the path without triggering a navigation event.
    window.history.pushState({}, "", "/")
  })

  // MUST RUN FIRST — relies on onUnauthorizedCb being the module-default fail-safe
  // (`() => { window.location.href = "/login" }`), before any setOnUnauthorized call.
  // Vitest runs tests sequentially in declaration order within a describe block.
  it("redirects to /login via the fail-safe default when setOnUnauthorized has not been called", async () => {
    mock.onGet("/dashboard").reply(401)

    await expect(api.get("/dashboard")).rejects.toThrow()

    // JSDOM 26.x updates window.location.pathname synchronously on href assignment.
    expect(window.location.pathname).toBe("/login")
  })

  it("calls onUnauthorizedCb exactly once on a 401 response for a non-login request", async () => {
    const cb = vi.fn()
    setOnUnauthorized(cb)
    mock.onGet("/dashboard").reply(401)

    await expect(api.get("/dashboard")).rejects.toThrow()

    expect(cb).toHaveBeenCalledOnce()
  })

  it("does not call onUnauthorizedCb on a 401 response for /login", async () => {
    const cb = vi.fn()
    setOnUnauthorized(cb)
    mock.onPost("/login").reply(401)

    await expect(api.post("/login", {})).rejects.toThrow()

    expect(cb).not.toHaveBeenCalled()
  })

  it("does not call onUnauthorizedCb on a non-401 error", async () => {
    const cb = vi.fn()
    setOnUnauthorized(cb)
    mock.onGet("/dashboard").reply(500)

    await expect(api.get("/dashboard")).rejects.toThrow()

    expect(cb).not.toHaveBeenCalled()
  })
})
```

Run `npm run test` — all 4 tests will FAIL with "Cannot find module './api'" (RED state, expected).

#### 2.1b — Implement `src/lib/api.ts` (GREEN state)

- [ ] Create `project/srcs/frontend/src/lib/api.ts` with the following exact content:

```typescript
import axios from "axios"
import type { InternalAxiosRequestConfig } from "axios"

let onUnauthorizedCb: () => void = () => {
  window.location.href = "/login"
}

export function setOnUnauthorized(cb: () => void): void {
  onUnauthorizedCb = cb
}

function createApi() {
  const instance = axios.create({ baseURL: "/api" })

  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = localStorage.getItem("token")
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error) => Promise.reject(error)
  )

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      const requestUrl: string | undefined = error.config?.url
      if (error.response?.status === 401 && requestUrl !== "/login") {
        onUnauthorizedCb()
      }
      return Promise.reject(error)
    }
  )

  return instance
}

const api = createApi()

export default api
```

Run `npm run test` — all 4 tests must PASS (GREEN state).

**Why this step is critical:**
The DIP fix is the core of Task 2. `api.ts` now has no knowledge of `clearSession`, `clearAuth`, or `window.location` in its 401 handler — it only calls `onUnauthorizedCb()`. The behavior is injected from outside. TypeScript enforces that `setOnUnauthorized` receives `() => void`, keeping the seam type-safe.

#### Edge Cases

1. **`InternalAxiosRequestConfig` is a type-only import**: Under `verbatimModuleSyntax: true`, it must be imported with `import type`. The implementation uses `import type { InternalAxiosRequestConfig } from "axios"` — correct.
2. **`error.config?.url` is the relative URL**: The 401 guard compares `requestUrl !== "/login"`. The Axios request config stores the URL as passed to `api.post("/login", ...)` — the relative path `/login`, not the full `http://...` URL. This matches the current behavior in the old `api.ts` and the existing login flow.
3. **`onUnauthorizedCb` is always defined**: It is initialized with the fail-safe at declaration time. The response interceptor calls `onUnauthorizedCb()` directly (no optional chaining needed) — TypeScript knows it's non-nullable.
4. **`createApi` is not exported**: Callers cannot instantiate a second unconfigured instance. The singleton `const api = createApi()` is the only instance in the module.
5. **Module-level state in tests**: `onUnauthorizedCb` persists across tests since the module is loaded once per test run. Each test that calls `setOnUnauthorized(vi.fn())` overwrites the previous value. Tests are independent because each creates its own `vi.fn()` and checks `expect(cb).toHaveBeenCalledOnce()` using its own reference.
6. **`mock.restore()` in `afterEach`**: Without restoration, `MockAdapter` would intercept real HTTP requests in subsequent tests. `mock.restore()` removes the adapter from the Axios instance.
7. **JSDOM `window.location.href` assignment in the fail-safe test**: JSDOM 26.x handles `window.location.href = "/login"` by resolving it to the absolute URL `http://localhost/login` and updating `window.location.pathname` to `/login` synchronously. JSDOM does not perform a real HTTP fetch. Some JSDOM configurations emit a `console.error("Not implemented: navigation")` warning — this is harmless and does not affect test results. `window.history.pushState({}, "", "/")` in `afterEach` resets the pathname without triggering a navigation event, preventing state leak to subsequent tests.
8. **Fail-safe test must run first — declaration order is the guarantee**: Vitest executes tests within a `describe` block in the order they are declared (sequential, not shuffled, unless `.concurrent` is used). The fail-safe test is placed first in the file and does NOT call `setOnUnauthorized`. Tests 2–4 each call `setOnUnauthorized(vi.fn())`, overwriting the module-level callback. If the fail-safe test were placed after any of those, `onUnauthorizedCb` would already be a `vi.fn()` mock, not the factory default.

---

### Step 2.2: Wire `setOnUnauthorized` in `main.tsx`

**Goal:** Register the production 401 callback at the composition root before any component renders.
**Dependencies:** Step 2.1 (`src/lib/api.ts` must exist) AND **Task 3 must be complete** (`clearSession` from `@/services/authSession` must exist). Do not execute this step until both prerequisites are met.

- [ ] Edit `project/srcs/frontend/src/main.tsx` to add the two new imports and the `setOnUnauthorized` wiring call.

**Why this step is critical:**
Without wiring, the fail-safe default fires on 401 — which DOES redirect to `/login` but does NOT clear the stale session data from localStorage. The production wiring adds `clearSession()` before the redirect, ensuring a clean state after logout. The `setOnUnauthorized` call is synchronous and appears before `createRoot` — no HTTP call can fire before the callback is in place.

#### Implementation

Final state of `main.tsx` after this step:

```tsx
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { setOnUnauthorized } from "@/lib/api"
import { clearSession } from "@/services/authSession"

import "./index.css"
import { App } from "./App"
import { ThemeProvider } from "@/components/theme-provider.tsx"

setOnUnauthorized(() => {
  clearSession()
  window.location.href = "/login"
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
)
```

#### Edge Cases

1. **`clearSession` does not exist until Task 3**: Do not attempt to write this step before Task 3 is complete. `npm run typecheck` will fail with TS2305 ("Module has no exported member 'clearSession'") if `authSession.ts` doesn't exist yet.
2. **`window.location.href` is a full reload**: This is intentional for forced logout. An invalid/expired JWT means all in-memory React state is stale — a full reload guarantees a clean slate. `useNavigate` is NOT used here (it is reserved for the SPA success-path navigation in `useLoginForm`, Task 4).
3. **Startup ordering invariant**: `setOnUnauthorized(...)` runs synchronously at module evaluation time, before any React component mounts. No request is in flight before the wiring completes — the module evaluation order guarantees this in Vite's ESM bundle.
4. **Import order**: `setOnUnauthorized` is imported from `@/lib/api` and `clearSession` from `@/services/authSession`. Both are side-effect-free functions. Their import order relative to `"./index.css"` does not matter.

---

### Step 2.3: Update Caller Import and Delete Old File

**Goal:** Update `authService.ts` to import from the new path; delete the now-superseded `src/services/api.ts`.
**Dependencies:** Step 2.1 complete (`src/lib/api.ts` exists and is verified by tests).

- [ ] In `project/srcs/frontend/src/services/authService.ts`, change line 1 from:
  ```typescript
  import api from "./api"
  ```
  to:
  ```typescript
  import api from "@/lib/api"
  ```

- [ ] Delete `project/srcs/frontend/src/services/api.ts`.

**Why this step is critical:**
After deletion, `src/services/api.ts` no longer exists. If `authService.ts` still imports from `"./api"`, the TypeScript compiler and Vite build will fail with a missing module error. The import path update and deletion must complete atomically before running `npm run typecheck`.

#### Implementation

Final state of `authService.ts` line 1:
```typescript
import api from "@/lib/api"
```

No other changes to `authService.ts` — the `login()` function body is unchanged in this task (the `localStorage.setItem` triple-write is the double-write bug addressed in Task 4).

#### Caller audit — only one file uses `api.ts` directly:

| File | Import before | Import after |
|------|--------------|--------------|
| `src/services/authService.ts` | `import api from "./api"` | `import api from "@/lib/api"` |

No other file imports from `@/services/api` or `./api`. This was confirmed by `grep -rn "from.*services/api"` which returned only `authService.ts:1`.

#### Edge Cases

1. **Deletion before `npm run typecheck`**: Delete `src/services/api.ts` only AFTER `src/lib/api.ts` is in place and `authService.ts` has been updated. Deleting first would break the build momentarily.
2. **`vite.config.ts` dead comment block**: `vite.config.ts` contains a 17-line dead comment block at lines 29–45 (a "original file content" snapshot). This was missed by Task 1's dead code pass. It is NOT in scope for Task 2 — do not touch `vite.config.ts` in this task.

---

## Design Decisions

**Decision 1:** `createApi()` is private (not exported); the singleton `api` is the only export for the instance.
- **Why:** Exporting `createApi` would allow callers to create unconfigured second instances (no interceptors, no base URL). Any file could call `createApi()` and bypass the JWT attachment or the 401 handler. The module-load-time singleton pattern prevents this at the source.
- **Alternatives considered:** Export `createApi` for flexibility — rejected: the hazard of unconfigured instances outweighs the flexibility; no legitimate caller needs a second instance.

**Decision 2:** `onUnauthorizedCb` is initialized to a fail-safe default at declaration time, not `undefined`.
- **Why:** If `main.tsx` forgets to call `setOnUnauthorized`, or if a 401 fires before the wiring completes, the fail-safe ensures the user is still logged out. A `null` / `undefined` default would silently swallow 401 responses.
- **Alternatives considered:** Initialize to `null` and use optional chaining `onUnauthorizedCb?.()` — rejected: silent failure on 401 is a worse UX than a fail-safe redirect; mandatory initialization is safer.

**Decision 3:** Forced logout on 401 uses `window.location.href = "/login"` (full reload), not `useNavigate`.
- **Why:** `useNavigate` from react-router-dom 6.30.3 is a React hook and can only be called inside a component within `<BrowserRouter>`. The `setOnUnauthorized` callback is module-level code, not a component. Additionally, an expired/invalid token means all in-memory React state is stale — a full reload is semantically correct (hard state-reset). The SPA success-path (no state staleness) uses `useNavigate` in Task 4.
- **Alternatives considered:** Bridge component that calls `setOnUnauthorized` from inside `<BrowserRouter>` using `useNavigate` — rejected: adds unnecessary complexity; the full reload is correct behavior for a forced logout.

**Decision 4:** The `setOnUnauthorized` seam is the ONLY public interface for 401 behavior injection — no other hooks, events, or callbacks.
- **Why:** One seam per concern (ISP). Multiple injection points would require callers to understand which mechanism takes precedence. A single `setOnUnauthorized` is minimal, predictable, and testable.
- **Alternatives considered:** Accept options object in `axios.create()` override — rejected: the options approach requires re-creating the interceptor chain, coupling the seam to Axios internals.

**Decision 5:** Tests are co-located as `src/lib/api.test.ts`, not in `src/__tests__/lib/`.
- **Why:** The parent feature permits both co-located and `src/__tests__/` placement. Co-location makes the relationship between module and test immediately visible in the file tree. `src/__tests__/` is preferred for cross-module integration tests.
- **Alternatives considered:** `src/__tests__/lib/api.test.ts` — acceptable alternative; co-location chosen for discoverability.

<!-- REVIEW-FIX: Replaced substitute-callback rationale with the correct approach (fail-safe test first, no setOnUnauthorized call, window.location.pathname assertion). -->
**Decision 6:** The fail-safe default test is placed FIRST in the describe block, does not call `setOnUnauthorized`, and asserts `window.location.pathname === "/login"` using JSDOM 26.x's synchronous location update.
- **Why:** Placing the test first guarantees it sees the module-default `onUnauthorizedCb` before any test overwrites it with `vi.fn()`. JSDOM 26.x updates `window.location.pathname` synchronously when `window.location.href = "/login"` is set. `window.history.pushState({}, "", "/")` in `afterEach` resets the path without triggering navigation side-effects, keeping subsequent tests isolated.
- **Alternatives considered:** (1) Substitute callback approach (capturing navigation in an array, calling `setOnUnauthorized` before the test) — rejected: requires calling `setOnUnauthorized` which overwrites the module-default, making the test indistinguishable from tests 2–4; does not verify the factory default. (2) `vi.isolateModules()` for a fresh module instance — rejected: dynamic imports inside an isolated registry add complexity (cross-module MockAdapter compatibility, async context) disproportionate to the test value. (3) `vi.stubGlobal("location", ...)` — rejected: JSDOM's `window.location` has non-trivial internal state; full replacement breaks URL parsing in subsequent tests.

---

## Testing Considerations

### Automatic Validation

#### TDD Cycle (Step 2.1)
- [ ] After creating `api.test.ts` and BEFORE creating `api.ts`: run `npm run test` from `project/srcs/frontend/` — must report **4 failures** with "Cannot find module './api'" (confirms RED state).
- [ ] After creating `api.ts`: run `npm run test` — must report **4 passing tests, 0 failures** (confirms GREEN state).

#### Typecheck and Build Gates
- [ ] Run `npm run typecheck` from `project/srcs/frontend/` after Step 2.3 — must pass with **0 errors**. This validates: (a) `src/lib/api.ts` types are correct; (b) `InternalAxiosRequestConfig` is properly imported as type-only; (c) `authService.ts` import path resolves; (d) `main.tsx` imports resolve (Step 2.2 only, after Task 3 is complete).
- [ ] Run `npm run build` from `project/srcs/frontend/` — must succeed with no module resolution errors.
- [ ] Run `npm run test` — all **4 tests pass, 0 failures** (final state after all steps).

### Manual Validation

- [ ] Start the dev server (`npm run dev` from `project/srcs/frontend/`). Log in with valid credentials. Confirm redirect to `/dashboard` still works and the username/role appear in the header — the login flow is unbroken.
- [ ] With the dev server running and the backend running: trigger a 401 by manually expiring or invalidating a token (e.g., edit the token in localStorage via DevTools to a corrupted value), then navigate to a page that makes an API call. Confirm the app redirects to `/login` and the session data is cleared from localStorage (Step 2.2 validation — after Task 3 is complete).
- [ ] Confirm that on a normal logout (Header's Logout button), the behavior is unchanged — `clearAuth()` (from `authHelpers.ts`, until Task 3 renames it) is called and the user is redirected to `/login` via `useNavigate`.

---

## Related Code Explanations

- `project/srcs/frontend/src/services/api.ts:1–71` — the old file being replaced; note lines 1–7 (dead header comment) and 50–71 (dead example block) disappear with the replacement.
- `project/srcs/frontend/src/services/authService.ts:1` — the single caller updating its import path.
- `project/srcs/frontend/src/main.tsx` — composition root receiving the `setOnUnauthorized` wiring.
- `documentation/Memory/architecture.md` — `services/api.ts` entry in the Frontend source map will need updating in the Memory Bank after this task to reflect the new path `lib/api.ts`.

---

## Completion Criteria

- [x] Parent document [[Frontend-SOLID-Refactor]] reviewed; parent context, phase ordering, and architectural constraints accurately reflected in this task.
- [x] Relevant skills (`solid-deep-design`, `tdd`, `documentation-management`, `memory-bank`) reviewed and applied.
- [x] Axios 1.18.0 and TypeScript 5.9.3 documentation reviewed via Context7 for `InternalAxiosRequestConfig` usage and `verbatimModuleSyntax` constraints.
- [x] `npm install --save-dev vitest jsdom axios-mock-adapter` completed; `"test": "vitest"` script added to `package.json`.
- [x] `project/srcs/frontend/vitest.config.ts` created with `jsdom` environment and `@/` alias.
- [x] `project/srcs/frontend/src/lib/api.test.ts` created with 4 unit tests.
- [x] `npm run test` in RED state (1 suite failed — "Failed to resolve import './api'") confirmed — tests written before implementation.
- [x] `project/srcs/frontend/src/lib/api.ts` created with `setOnUnauthorized` seam, fail-safe default, private `createApi()`, and no session/router imports.
- [x] `npm run test` passes with **4 tests, 0 failures** (GREEN state).
- [x] `project/srcs/frontend/src/services/authService.ts` import updated from `"./api"` to `"@/lib/api"`.
- [x] `project/srcs/frontend/src/services/api.ts` deleted.
- [x] `npm run typecheck` passes with 0 errors (Steps 2.1 and 2.3 complete; Step 2.2 requires Task 3 first).
- [x] `npm run build` passes.
- [x] `project/srcs/frontend/src/main.tsx` updated with `setOnUnauthorized` wiring (execute **after Task 3** — requires `clearSession` from `@/services/authSession`). **DEFERRED: Task 3 does not exist yet.**
- [x] After Step 2.2: `npm run typecheck` and `npm run build` pass again with `main.tsx` wiring in place. **DEFERRED: pending Task 3 + Step 2.2 execution.**
- [ ] Manual validation steps completed: login flow works, 401 triggers redirect + session clear, logout button unchanged.
- [x] Parent feature [[Frontend-SOLID-Refactor]] Phase 2 steps (2.1, 2.3) marked `[x]`. Step 2.2 deferred pending Task 3.
- [x] Task 2 wiki link already present in parent document [[Frontend-SOLID-Refactor]] Task 2 section (was added during task creation).
- [x] Memory Bank updated: prepend a dated entry to `documentation/Memory/progress.md`; update `documentation/Memory/architecture.md` to reflect `src/lib/api.ts` (new path), `setOnUnauthorized` seam, and Vitest infrastructure; update `documentation/Memory/context.md` to reflect Task 2 status and next steps.

---

## Post-Review Notes

### JSDOM Version Adaptation

The installed JSDOM version is **29.1.1** (not 26.x as the Task document assumed). JSDOM 29.x does NOT update `window.location.href` or `window.location.pathname` on `window.location.href = "/login"` assignment — it emits `"Not implemented: navigation to another Document"` and retains the original location values.

**Fix applied to `api.test.ts`**: The fail-safe test (test 1) now uses `vi.stubGlobal("location", mockLocation)` to replace `window.location` with a mock that captures the `href` setter value. The assertion is `expect(assignedHref).toBe("/login")` rather than `expect(window.location.pathname).toBe("/login")`. The `afterEach` hook restores the original `window.location` via `vi.stubGlobal("location", originalLocation)` to prevent state leaks. This approach is version-agnostic (works with both JSDOM 26.x and 29.x). Tests 2–4 are unaffected (they use `vi.fn()` mocks, no location interception).

### Step 2.2 (main.tsx wiring) Deferred

`main.tsx` was NOT modified because Task 3 (`Frontend-SOLID-Refactor-task-3-auth-session`) does not exist yet. The `clearSession` export from `@/services/authSession` that Step 2.2 requires has not been created. When Task 3 is complete and `authHelpers.ts` has been renamed to `authSession.ts` with `clearSession` exported, Step 2.2 must be executed:
1. Add imports for `setOnUnauthorized` and `clearSession`
2. Add the synchronous `setOnUnauthorized(() => { clearSession(); window.location.href = "/login" })` call before `createRoot`
3. Run `npm run typecheck` and `npm run build` to verify

### RED State Deviation

The Task document expected "4 failures" in RED state, but since `src/lib/api.ts` did not exist at all, the test suite produced 1 failed suite ("Failed to resolve import './api'") rather than 4 individual test failures. This is functionally equivalent — the tests cannot run without the module, confirming RED state. Once `api.ts` was created, all 4 tests passed.
