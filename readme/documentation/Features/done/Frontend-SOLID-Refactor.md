#high #refactor #frontend #architectural

## Feature: Frontend SOLID Refactor & Code Organization

### Description

Restructure the React frontend codebase so that every module has a single reason to change, every dependency points inward toward abstractions, and every file lives in a location that a new developer can predict from the directory name alone. The refactor addresses six specific issues identified by static analysis (fallow health score 74 B) and confirmed through code review: a localStorage double-write bug in the authentication flow, a 401 handler that violates the Dependency Inversion Principle, a ThemeProvider that owns four unrelated responsibilities, a LoginPage that mixes form orchestration with rendering, scattered auth type definitions, and dead commented-out code across seven files.

---

## Problem Statement

As a developer working on AgentForge's frontend, I cannot confidently locate, modify, or test code because the current structure mixes concerns within files and places modules in directories that don't reflect their role. Authentication logic is split across three files without a clear ownership boundary, layout components share a directory with UI primitives, the HTTP client directly calls `clearAuth` and navigates on 401 (coupling an infrastructure adapter to application logic), and the ThemeProvider handles context provisioning, system preference detection, local-storage persistence, and a keyboard shortcut all in one function body. This makes every edit risky, every test dependent on unrelated concerns, and every new feature harder to add correctly.

---

## User Stories

1. As a frontend developer, I want authentication logic grouped under `src/features/authentication/`, so that I can find all login-related code in one place without searching across `services/`, `pages/`, and `routes/`.
2. As a frontend developer, I want `LoginPage` to be a thin rendering component, so that I can change the form layout without touching state management or API calls.
3. As a frontend developer, I want the form state and submit logic extracted into a `useLoginForm` hook, so that the auth orchestration can be read, tested, and modified independently of JSX.
4. As a frontend developer, I want `authService.login()` to be the single place that writes the token, username, and roles to localStorage, so that a double-write bug cannot exist between the service and its callers.
5. As a frontend developer, I want the HTTP client (`api.ts`) to accept an `onUnauthorized` callback instead of importing `clearAuth` directly, so that the HTTP adapter does not depend on application-layer session logic.
6. As a frontend developer, I want the `onUnauthorized` binding wired at the app entry point (`main.tsx`), so that the dependency direction flows from infrastructure toward the domain, not the other way.
7. As a frontend developer, I want `ThemeProvider` decomposed into focused hooks, so that the keyboard toggle, the system-sync listener, and the context provider each have one reason to change.
8. As a frontend developer, I want layout components (`MainLayout`, `Sidebar`, `Header`) in `src/layouts/`, so that the difference between a layout shell and a UI component is visible from the directory tree.
9. As a frontend developer, I want route definitions extracted from `App.tsx` into `src/router.tsx`, so that route ownership is explicit and `App.tsx` is reduced to provider composition.
10. As a frontend developer, I want auth type constants (`ROLE_ADMIN`, `ROLE_EMPLOYEE`, `UserRole`) in `src/types/auth.ts`, so that types and constants are not co-located with runtime helper functions.
11. As a frontend developer, I want all dead commented-out code removed from every file, so that I read only the current implementation and the git log preserves history.
12. As a frontend developer, I want `authHelpers.ts` renamed to `authSession.ts` and its `clearAuth` function renamed to `clearSession`, so that names describe what the module represents (a session) rather than a category of helpers.
13. As a frontend developer, I want `api.ts` moved from `src/services/` to `src/lib/`, so that the HTTP client adapter lives in the library-wrapper layer where it belongs per the placement rules.
14. As a frontend developer, I want a `features/authentication/index.ts` public API file, so that nothing outside the feature can deep-import into its internals.

---

## Solution

Reorganize the codebase into the target directory structure defined by the `react-code-organization` skill, fix the identified code-level bugs and SRP violations during the same pass, and apply the `solid-deep-design` principles to every modified module. No new user-visible behaviour is introduced. The existing functionality is preserved exactly.

### Scope

The refactor touches every source file in `src/` except `src/components/ui/` (shadcn-generated files, left untouched) and `src/lib/utils.ts` (already correctly placed).

### Affected Systems / Modules

- `src/services/api.ts` — moves to `src/lib/api.ts`, DIP fix applied
- `src/services/authHelpers.ts` — renamed to `src/services/authSession.ts`, saveSession added, clearAuth renamed
- `src/services/authService.ts` — moved to `src/features/authentication/services/authService.ts`, double-write bug fixed
- `src/pages/LoginPage.tsx` — thinned; orchestration extracted to hook
- `src/components/theme-provider.tsx` — decomposed into three focused modules
- `src/components/layout/` — moved to `src/layouts/`
- `src/App.tsx` — routing extracted to `src/router.tsx`
- Seven files with dead commented-out code — comments removed

### Impact Analysis

All existing routes (`/`, `/login`, `/dashboard`) continue to function. The authentication flow (login → redirect → session persistence → 401 logout) behaves identically. The theme system (persistence, system sync, keyboard toggle) behaves identically. No backend contract changes. No shadcn components are modified.

### Risk Assessment

- **Import path breakage**: every moved file requires its callers to update import paths. TypeScript will surface all missed references at compile time — run `tsc --noEmit` after each phase.
- **`clearAuth` → `clearSession` rename**: used in 3 places (Header, api.ts interceptor, authService logout). Must update all three in the same commit to avoid a broken build state.
- **`onUnauthorized` wiring**: if the callback is not registered at startup, 401 responses will silently fail to log out. Must be verified in the browser after wiring.
- **ThemeProvider decomposition**: the `applyTheme` callback is shared between the storage-sync effect and the system-sync effect. The extracted hooks must both have access to it — pass it as a parameter or keep it in the provider and pass it down.

---

## Implementation Architecture

### Target Directory Structure

```
src/
├── assets/
├── components/
│   ├── common/             (unchanged — ErrorMessage, LoadingSpinner, EmptyState)
│   └── ui/                 (shadcn — untouched)
├── context/
│   └── theme/
│       ├── ThemeProvider.tsx   (thin context provider + applyTheme coordinator)
│       └── useTheme.ts         (consumer hook, exported from here)
├── features/
│   └── authentication/
│       ├── hooks/
│       │   └── useLoginForm.ts
│       ├── services/
│       │   └── authService.ts
│       └── index.ts
├── hooks/
│   ├── use-mobile.ts           (unchanged)
│   ├── useSystemThemeSync.ts   (extracted from ThemeProvider — OS color-scheme only)
│   ├── useThemeStorageSync.ts  (extracted from ThemeProvider — cross-tab storage event)
│   └── useThemeKeyboardToggle.ts (extracted from ThemeProvider)
├── layouts/
│   ├── MainLayout.tsx
│   ├── Sidebar.tsx
│   └── Header.tsx
├── lib/
│   ├── utils.ts                (unchanged)
│   └── api.ts                  (moved from services/, DIP fix)
├── pages/
│   ├── DashboardPage.tsx       (unchanged)
│   ├── HomePage.tsx            (dead code removed)
│   └── LoginPage.tsx           (thinned)
├── routes/
│   ├── AdminRoute.tsx          (dead code removed)
│   └── ProtectedRoute.tsx      (unchanged)
├── services/
│   └── authSession.ts          (renamed from authHelpers.ts)
├── types/
│   └── auth.ts
├── router.tsx
└── main.tsx
```

### Changes Required

#### 1. `src/types/auth.ts` (new file)
**Purpose:** Give type constants a home that is decoupled from runtime functions.
**Changes:** Extract `ROLE_ADMIN`, `ROLE_EMPLOYEE`, and `UserRole` from `authHelpers.ts` into this file. All callers that currently import these from `authHelpers` update their import path.

#### 2. `src/services/authSession.ts` (renamed from `authHelpers.ts`)
**Purpose:** Single deep module for all browser-session auth state — the only place that reads or writes the token, username, and roles in localStorage.
**Changes:**
- Add `saveSession(token: string, username: string, roles: string[]): void` — consolidates the three `localStorage.setItem` calls currently duplicated in `LoginPage` and `authService`
- Rename `clearAuth()` to `clearSession()` — the old name survives as a deprecated alias for one commit only, then removed
- Remove the type definitions (moved to `src/types/auth.ts`)
- Remove all `/* [REMOVE] */` commented blocks

#### 3. `src/lib/api.ts` (moved from `src/services/api.ts`)
**Purpose:** Pure HTTP adapter — creates and configures the Axios instance with no knowledge of auth session or routing. Imports only `axios`; never imports `authSession` or React.
**Changes:**
- Keep `createApi` as a **private** function inside `api.ts`, called once at module load to build the singleton Axios instance. Do **not** export `createApi` — callers can only ever import the one configured instance, which removes the second-unconfigured-instance hazard at its source.
- Export the singleton instance (`export default api`) — unchanged import surface for `authService.ts` and any other caller.
- Export `setOnUnauthorized(cb: () => void)` — the only seam through which the 401 side-effect is injected. The 401 response interceptor calls `onUnauthorizedCb?.()` instead of the inline `localStorage.removeItem` + `window.location.href` block.
- Default `onUnauthorizedCb` to a fail-safe `() => { window.location.href = "/login" }` so a 401 always logs out even if `main.tsx` forgets to wire the callback.
- Wire at the composition root in `main.tsx`: `setOnUnauthorized(() => { clearSession(); window.location.href = "/login" })`. Forced logout uses a full reload (hard state-reset is semantically correct for an invalid/expired token and matches the current `api.ts` behavior — no UX regression). The success path uses SPA `useNavigate` (see Step 4.2 / Finding 4). Navigation is intentionally split by intent.
- Startup ordering invariant: `main.tsx` calls `setOnUnauthorized(...)` synchronously before any HTTP call can fire — document this; no request is in flight before wiring completes.

#### 4. `src/features/authentication/services/authService.ts` (moved)
**Purpose:** Authentication API adapter — owns the single HTTP call to `/login`.
**Changes:**
- Call `authSession.saveSession(data.token, data.username, data.roles)` instead of three inline `localStorage.setItem` calls
- Remove the duplicate `logout()` function — session clearing is now `authSession.clearSession()`
- Import the `LoginResponse` type; move it to `src/types/auth.ts` if used by more than this file

#### 5. `src/features/authentication/hooks/useLoginForm.ts` (new file)
**Purpose:** Deep module encapsulating all login form state and submission logic. Single responsibility: manage the authentication interaction.
**Interface:** `useLoginForm(): { username, setUsername, password, setPassword, error, isLoading, handleSubmit }`
**Changes:**
- Move the four `useState` calls from `LoginPage`
- Move `handleSubmit` from `LoginPage`, calling `authService.login()` and navigating on success via `useNavigate` (SPA push to `/dashboard` — not `window.location.href`)
- `LoginPage` becomes a pure renderer that spreads the hook's return values into JSX

#### 6. `src/pages/LoginPage.tsx` (thinned)
**Purpose:** Route target — renders the login UI using the authentication feature's hook.
**Changes:**
- Remove the four `useState` calls
- Remove `handleSubmit` body
- Call `useLoginForm()` and destructure its return
- Keep the `isAuthenticated()` guard redirect (this is routing logic, not form logic — stays in the page)

#### 7. `src/features/authentication/index.ts` (new file)
**Purpose:** Public API surface for the authentication feature.
**Changes:** Re-export `useLoginForm` and `authService` functions that pages and routes are permitted to use. Deep imports into `features/authentication/components/` or `features/authentication/services/` from outside the feature are forbidden.

#### 8. `src/context/theme/ThemeProvider.tsx` (moved and thinned)
**Purpose:** Context provider only — provisions `ThemeProviderState` and coordinates `applyTheme`.
**Changes:**
- Retain: `applyTheme`, the React context, the `useState` for `theme`, the `setTheme` callback, and the provider JSX
- Remove: the system-sync effect (moved to `useSystemThemeSync`)
- Remove: the keyboard-toggle effect (moved to `useThemeKeyboardToggle`)
- Remove: the storage-change sync effect (moved to a dedicated `useThemeStorageSync` hook — separate from `useSystemThemeSync` because the two effects have non-overlapping interfaces and mutate different state; see Changes #9)
- Call `useSystemThemeSync(theme, applyTheme)`, `useThemeStorageSync(storageKey, defaultTheme, setThemeState)`, and `useThemeKeyboardToggle(storageKey, setThemeState)` from within the provider body

#### 9. `src/hooks/useSystemThemeSync.ts` + `src/hooks/useThemeStorageSync.ts` (new files)
Two separate hooks, split because the two effects have non-overlapping interfaces and mutate different state (the combined 5-parameter surface would force two responsibilities through one seam — an ISP smell). Note: `useThemeStorageSync` is NOT a shallow pass-through — it owns real depth (storageArea guard, key guard, `isTheme` validation, `defaultTheme` fallback).

**`useSystemThemeSync.ts`** — single responsibility: re-apply the current theme when the OS color-scheme changes.
- **Interface:** `useSystemThemeSync(theme: Theme, applyTheme: (t: Theme) => void): void`
- **Changes:** Extracts the `mediaQuery.addEventListener` effect from `ThemeProvider` (calls `applyTheme`; does not change the abstract `theme` state).

**`useThemeStorageSync.ts`** — single responsibility: react to another tab changing the stored theme.
- **Interface:** `useThemeStorageSync(storageKey: string, defaultTheme: Theme, setThemeState: (t: Theme) => void): void`
- **Changes:** Extracts the `window.addEventListener("storage", ...)` effect from `ThemeProvider` (calls `setThemeState`; changes the abstract `theme`, which then re-applies via the `[theme]` dependency).

#### 10. `src/hooks/useThemeKeyboardToggle.ts` (new file)
**Purpose:** Single responsibility — toggle between dark and light when the user presses `D`.
**Interface:** `useThemeKeyboardToggle(storageKey: string, setThemeState: Dispatch<SetStateAction<Theme>>): void`
**Changes:** Extracts the `handleKeyDown` function and its `window.addEventListener("keydown", ...)` effect from `ThemeProvider`. The `handleKeyDown` complexity (CRAP 56) is now isolated in a module with a single, testable interface.

#### 11. `src/layouts/` (moved from `src/components/layout/`)
**Purpose:** Make layout shells structurally distinct from UI components.
**Changes:** Move `MainLayout.tsx`, `Sidebar.tsx`, and `Header.tsx`. Update all import paths.

#### 12. `src/router.tsx` (extracted from `App.tsx`)
**Purpose:** Single file that owns route definitions, nested layout structure, and route guards.
**Changes:** Move the `BrowserRouter` + `Routes` + `Route` tree out of `App.tsx`. `App.tsx` becomes a provider composition only: `ThemeProvider` wrapping `RouterProvider`.

#### 13. Dead code removal (all affected files)
**Files:** `src/services/authHelpers.ts`, `src/services/authService.ts`, `src/pages/HomePage.tsx`, `src/pages/LoginPage.tsx`, `src/routes/AdminRoute.tsx`, `src/components/layout/MainLayout.tsx`, `src/lib/utils.ts` (if any).
**Changes:** Delete every `/* [REMOVE] */` and `/* Version without ... */` commented block. Delete the commented-out `import` block at the bottom of `HomePage.tsx`. Delete the old `AdminRoute` redirect-to-login variant.

---

## Implementation Steps

### Phase 1: Dead Code & Type Extraction
- [x] **Step 1.0 (Memory Bank Reconciliation):** Reconcile the "do not fix yet" double-write guard that this feature supersedes. Update `documentation/Memory/architecture.md` (line 33) and `documentation/Memory/known-issues.md` (line 56): replace the "do not fix yet" / "Do not fix until the login flow is intentionally redesigned" annotation with a forward-reference to this feature — e.g. "Double-write fix pending in [[Frontend-SOLID-Refactor]] Task 4, Step 4.1." Frame as **pending**, not completed (the concrete fix lands in Task 4). This feature IS the intentional login-flow redesign that `known-issues.md:56` was waiting for, so this is a status transition, not an override. Perform this edit atomically as the first action of Task 1.
- [x] **Step 1.1:** Remove all `/* [REMOVE] */` and unused commented blocks from the seven affected files. **`EmptyState.tsx` handling:** its single placeholder comment is replaced with an exported no-op stub — `export function EmptyState() { return null }` — so the file is not emptied to 0 bytes, the `EmptyState` name is reserved with a type-checkable interface (any future import is verified by TypeScript), and no user-visible behavior is introduced (nothing imports it today).
- [x] **Step 1.2:** Create `src/types/auth.ts` and move `ROLE_ADMIN`, `ROLE_EMPLOYEE`, `UserRole` from `authHelpers.ts`.
- [x] **Step 1.3:** Update all callers of the type constants to import from `src/types/auth.ts`.

### Phase 2: HTTP Client Refactoring (DIP)
- [x] **Step 2.1:** Refactor `src/services/api.ts` and move it to `src/lib/api.ts`. Keep `createApi` **private** (called once at module load); export the singleton instance (`export default api`) and `setOnUnauthorized(cb)`. Replace the inline 401 side-effects in the response interceptor with `onUnauthorizedCb?.()`, defaulting the slot to a fail-safe `() => { window.location.href = "/login" }`. `api.ts` imports only `axios` — no `authSession`, no React.
- [x] **Step 2.2:** Wire the callback at the composition root in `main.tsx`: `setOnUnauthorized(() => { clearSession(); window.location.href = "/login" })`. Forced logout uses a full reload (hard state-reset); the success path uses SPA `useNavigate` (Step 4.2). Document the synchronous startup-ordering invariant (wiring completes before any HTTP call fires). ~~**DEFERRED: requires Task 3 (`clearSession` from `@/services/authSession`).**~~
- [x] **Step 2.3:** Update all callers that import from `src/services/api` to import from `src/lib/api`.

### Phase 3: Auth Session Module
- [x] **Step 3.1:** Rename `authHelpers.ts` to `authSession.ts`. Add `saveSession(token, username, roles)`. Rename `clearAuth` to `clearSession`.
- [x] **Step 3.2:** Update all six callers (`Header.tsx`, `DashboardPage.tsx`, `LoginPage.tsx`, `HomePage.tsx`, `ProtectedRoute.tsx`, `AdminRoute.tsx`) to use the new function names.

### Phase 4: Authentication Feature Folder
- [x] **Step 4.1:** Move `authService.ts` to `src/features/authentication/services/authService.ts`. Remove the duplicate localStorage writes — call `authSession.saveSession()` instead. Remove the duplicate `logout()` function. **Dead-code confirmation (as of 2026-06-25):** `authService.logout()` has zero callers — the only `authService` import in the frontend is `LoginPage.tsx:14` (`import { login }`), and `Header` uses `clearAuth()` from `authSession`, not `authService.logout`. Removal is automatically verified by the mandated post-phase `tsc --noEmit` (`npm run typecheck`): a removed export still imported anywhere surfaces as TS2305/TS2339 under the strict tsconfig — this resolves re-exports through `features/authentication/index.ts` that a grep would miss, so no separate grep step is required. **Supersedes the "do not fix yet" constraint** recorded in `documentation/Memory/architecture.md:33` and `documentation/Memory/known-issues.md:56` — the decision to fix the double-write was approved during this feature's creation interview; this feature is the intentional login-flow redesign those guards were waiting for. The memory-bank guard is reconciled to a forward-reference in Step 1.0 (Task 1).
- [x] **Step 4.2:** Create `src/features/authentication/hooks/useLoginForm.ts`. Extract the four `useState` calls and `handleSubmit` from `LoginPage`. Use `useNavigate` from `react-router-dom` to navigate to `/dashboard` on success (a push — the default — to preserve the existing history-entry behavior of `window.location.href`) — do **not** use `window.location.href` (avoids the full-reload blank-flash bug migrating into the hook).
- [x] **Step 4.3:** Thin out `LoginPage.tsx` to call `useLoginForm()` and render its values. Keep the `isAuthenticated()` redirect.
- [x] **Step 4.4:** Create `src/features/authentication/index.ts` re-exporting `useLoginForm` and the auth service functions.

### Phase 5: Theme Infrastructure Decomposition
- [x] **Step 5.1a:** Extract `useSystemThemeSync` hook (OS color-scheme `mediaQuery` effect only — calls `applyTheme`) into `src/hooks/useSystemThemeSync.ts`. Interface: `useSystemThemeSync(theme, applyTheme)`.
- [x] **Step 5.1b:** Extract `useThemeStorageSync` hook (cross-tab `window` storage event only — calls `setThemeState`) into `src/hooks/useThemeStorageSync.ts`. Interface: `useThemeStorageSync(storageKey, defaultTheme, setThemeState)`. Split from `useSystemThemeSync` because the two effects have non-overlapping interfaces and mutate different state (ISP).
- [x] **Step 5.2:** Extract `useThemeKeyboardToggle` hook (`handleKeyDown` effect) into `src/hooks/useThemeKeyboardToggle.ts`.
- [x] **Step 5.3:** Slim down `ThemeProvider` to a coordinator that calls both hooks. Move it to `src/context/theme/ThemeProvider.tsx`. Move `useTheme` to `src/context/theme/useTheme.ts`.

### Phase 6: Layout & Routing Restructure
- [x] **Step 6.1:** Create `src/layouts/`. Move `MainLayout.tsx`, `Sidebar.tsx`, and `Header.tsx` from `src/components/layout/`. Delete the now-empty `components/layout/` directory. Update import paths in `App.tsx` and `router.tsx`.
- [x] **Step 6.2:** Create `src/router.tsx` with the `BrowserRouter` + `Routes` tree. Reduce `App.tsx` to provider composition only. Update `main.tsx` to render `<App />` which renders `<ThemeProvider><RouterProvider /></ThemeProvider>`.

---

## Potential Issues / Risks

- **TypeScript path aliases**: `@/` must resolve correctly for all moved files. Verify `tsconfig.json` `paths` entries are not file-specific.
- **`applyTheme` sharing**: both `useSystemThemeSync` and the main effect in `ThemeProvider` need `applyTheme`. Design it so `ThemeProvider` owns `applyTheme` and passes it as an argument to the hooks, avoiding duplication.
- **`navigate` in `onUnauthorized` (resolved):** React Router's `useNavigate` (react-router-dom 6.30.3) can only be called inside a component within `<BrowserRouter>` — there is no module-level navigate, and the app uses `<BrowserRouter>` (not the data-router `createBrowserRouter`). The 401 `onUnauthorized` callback is therefore wired in `main.tsx` using `window.location.href = "/login"` (a full reload), which is semantically correct for a forced logout: an invalid/expired token means all in-memory client state is stale, so a hard reset guarantees a clean slate. SPA `useNavigate` is reserved for the state-preserving success path (Step 4.2). This satisfies US 6 (wiring at `main.tsx`) without a bridge component. The `onUnauthorizedCb` slot defaults to a fail-safe logout so a 401 always logs out even if wiring is missing.
- **`EmptyState.tsx` is a placeholder**: it has no implementation. It should not be deleted — it marks an intentional future component. It stays as an exported no-op component stub (`export function EmptyState() { return null }`) reserving the name with a type-checkable interface (replacing the prior single placeholder comment, which Step 1.1's dead-code rule would otherwise leave as a 0-byte file).
- **Phase ordering (authoritative):** The required non-blocking execution order is `Phase 1 → Phase 3 → Phase 2 → Phase 4 → (Phases 5 and 6 are independent of each other and of the auth sequence)`. Rationale: Task 4's `authService.ts` imports the Axios instance from `@/lib/api`, which only exists after Task 2 (Phase 2) moves `api.ts` from `src/services/` to `src/lib/`; and Task 2's `main.tsx` wiring calls `clearSession()`, which only exists after Task 3 (Phase 3) renames `clearAuth` → `clearSession` (the deprecated `clearAuth` alias from Step 3.1 bridges any interim state but the canonical order is 1→3→2→4). This statement is the single source of truth for task ordering — per-task notes reference it rather than restating dependencies.

---

## Testing Decisions

A good test verifies the module's external behaviour through its public interface. It does not test implementation details (which `useState` is called, which `localStorage` key is used internally). It must survive an internal refactor if the public contract is unchanged.

### Modules to test

| Module | Test Type | What to Verify |
|---|---|---|
| `src/services/authSession.ts` | Unit | `saveSession` writes all three keys; `clearSession` removes all three; `isAuthenticated` returns false when token absent; `isAdmin`/`isEmployee` check the correct role strings |
| `src/features/authentication/hooks/useLoginForm.ts` | Unit (React Testing Library `renderHook` with `MemoryRouter` wrapper) | Successful login calls `authService.login` and calls `navigate('/dashboard')` (assert `navigate` is called with `'/dashboard'` and `window.location.href` is **not** assigned); failed login sets the error message; `isLoading` is true during the async call |
| `src/features/authentication/services/authService.ts` | Unit (mock `api`) | `login()` calls `POST /login` with correct payload; calls `authSession.saveSession` with returned data; does not write localStorage directly |
| `src/hooks/useThemeKeyboardToggle.ts` | Unit (`renderHook` + `fireEvent.keyDown`) | Pressing `D` toggles theme; modifier keys (`Ctrl`, `Meta`, `Alt`) are ignored; input fields are ignored |
| `src/hooks/useSystemThemeSync.ts` | Unit (`renderHook` + mocked `matchMedia`) | A media-query change calls `applyTheme` with the current theme; `applyTheme` is not called when the listener is cleaned up |
| `src/hooks/useThemeStorageSync.ts` | Unit (`renderHook` + dispatched `StorageEvent`) | A `storage` event with the right key and a valid theme calls `setThemeState`; events for other keys/storageArea are ignored; an invalid value falls back to `defaultTheme` |
| `src/lib/api.ts` | Unit | Use `setOnUnauthorized(vi.fn())` to register the callback, then assert it is called exactly once on a 401 response; it is not called on a non-401 error; it is not called when the failing request is `/login`; and a 401 still logs out (falls back to the fail-safe default) when no callback is registered |

### Prior art

There are currently no frontend tests in the codebase. These will be the first. The backend uses JUnit 5 + Mockito for unit tests and H2 for integration tests. The frontend equivalent is Vitest + React Testing Library. Tests should be added under `src/__tests__/` or co-located next to the module they cover (e.g., `authSession.test.ts` next to `authSession.ts`).

---

## Task Breakdown

### Task 1: Dead Code Removal & Type Extraction
- **Steps Covered:** Step 1.0, Step 1.1, Step 1.2, Step 1.3
- **Reason for Grouping:** All four steps are low-complexity, non-breaking, and independent of every other phase. Step 1.0 (memory-bank reconciliation) runs first as the atomic truth-update that supersedes the "do not fix yet" double-write guard before any code work begins; Steps 1.1–1.3 reduce file size before deeper changes start.
- **Planned Task File:** `Frontend-SOLID-Refactor-task-1-dead-code-and-types.md`
- **Task Document Link:** [[Frontend-SOLID-Refactor-task-1-dead-code-and-types]]

### Task 2: HTTP Client DIP Refactoring
- **Steps Covered:** Step 2.1, Step 2.2, Step 2.3
- **Reason for Grouping:** The factory function, its wiring, and the caller updates are tightly coupled — they must land together or the app breaks at runtime.
- **Planned Task File:** `Frontend-SOLID-Refactor-task-2-api-dip.md`
- **Task Document Link:** [[Frontend-SOLID-Refactor-task-2-api-dip]]

### Task 3: Auth Session Module Consolidation
- **Steps Covered:** Step 3.1, Step 3.2
- **Reason for Grouping:** The rename and the six caller updates are a single atomic change — an incomplete rename leaves the build broken.
- **Planned Task File:** `Frontend-SOLID-Refactor-task-3-auth-session.md`
- **Task Document Link:** [[Frontend-SOLID-Refactor-task-3-auth-session]]

### Task 4: Authentication Feature Folder
- **Steps Covered:** Step 4.1, Step 4.2, Step 4.3, Step 4.4
- **Reason for Grouping:** All four steps are part of establishing the `features/authentication/` boundary.
- **Dependencies:** Depends on Task 3 (authSession must exist before `authService` calls `saveSession`) AND Task 2 (`@/lib/api` must exist before `authService` imports the Axios instance). See the authoritative "Phase ordering" note in Potential Issues / Risks for the full execution order (`Phase 1 → Phase 3 → Phase 2 → Phase 4`).
- **Planned Task File:** `Frontend-SOLID-Refactor-task-4-authentication-feature.md`
- **Task Document Link:** [[Frontend-SOLID-Refactor-task-4-authentication-feature]]

### Task 5: Theme Infrastructure Decomposition
- **Steps Covered:** Step 5.1a, Step 5.1b, Step 5.2, Step 5.3
- **Reason for Grouping:** The steps progressively strip responsibilities from ThemeProvider — each extraction makes the next one smaller. They are independent of all auth-related tasks.
- **Planned Task File:** `Frontend-SOLID-Refactor-task-5-theme-decomposition.md`
- **Task Document Link:** [[Frontend-SOLID-Refactor-task-5-theme-decomposition]]

### Task 6: Layout & Routing Restructure
- **Steps Covered:** Step 6.1, Step 6.2
- **Reason for Grouping:** Moving layouts and extracting the router are both structural moves with no logic changes. Low risk, can run in parallel with Task 5.
- **Planned Task File:** `Frontend-SOLID-Refactor-task-6-layouts-and-router.md`
- **Task Document Link:** (add when task is created)
