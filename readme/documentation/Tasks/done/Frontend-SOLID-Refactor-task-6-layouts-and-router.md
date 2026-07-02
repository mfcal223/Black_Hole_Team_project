# Task: Layout Directory Restructure & Router Extraction

#task #current #medium-complexity #parent-frontend-solid-refactor

**Parent:** [[Features/to-do/Frontend-SOLID-Refactor]]
**Parent Type:** Feature
**Related Step(s):** Phase 6 — Steps 6.1 and 6.2
**Estimated Complexity:** Medium

---

## Goal

Move the three layout shell components (`MainLayout`, `Sidebar`, `Header`) from `src/components/layout/` to a dedicated `src/layouts/` directory, and extract the route definition tree from `App.tsx` into a standalone `src/router.tsx` — reducing `App.tsx` to a pure provider composition and making `main.tsx` a minimal entry point.

---

## Parent Context

The parent feature ([[Features/to-do/Frontend-SOLID-Refactor]]) identifies two SRP violations in the current directory structure:

1. **Layout shells co-located with UI components**: `MainLayout`, `Sidebar`, and `Header` live in `src/components/layout/`, but they are not UI components — they are authenticated application shells. A new developer reading `src/components/` cannot predict the difference between a layout shell and a shadcn UI primitive from the directory name alone. Moving them to `src/layouts/` makes this structural distinction visible from the tree.

2. **`App.tsx` owns two unrelated concerns**: it both defines routes (`BrowserRouter` + `Routes` + `Route` tree) and wraps the app in the `ThemeProvider` provider. After the split: `router.tsx` owns route definitions, `App.tsx` owns provider composition, `main.tsx` owns DOM mounting + one-time side effects (the `setOnUnauthorized` wiring).

The parent feature is explicit about scope:

- **Step 6.1**: move `MainLayout.tsx`, `Sidebar.tsx`, `Header.tsx` from `src/components/layout/` to `src/layouts/`; delete the now-empty `components/layout/` directory; update all import paths.
- **Step 6.2**: create `src/router.tsx` with the `BrowserRouter` + `Routes` tree; reduce `App.tsx` to provider composition only; update `main.tsx` to render `<App />` without a `ThemeProvider` wrapper (the `ThemeProvider` moves into `App.tsx`).

**No new user-visible behaviour is introduced.** All existing routes (`/`, `/login`, `/dashboard`) continue to function identically. The authentication flow, theme system, and 401 logout behaviour are unchanged.

The parent confirms Phase 6 is **independent of Phase 5** (theme decomposition) and of the auth sequence (Phases 1–4). It can be executed at any point after Task 5 is complete.

The parent's Testing Decisions table does **not** list `router.tsx`, `App.tsx`, or any layout file as modules requiring unit tests — this task contains no new business logic.

---

## Preconditions / Dependencies

- **Tasks 1–5 complete**: codebase is at 36/36 tests passing (7 suites). `npm run typecheck` = 0 errors. `npm run build` = success.
- **`src/components/layout/`** exists with `MainLayout.tsx`, `Sidebar.tsx`, and `Header.tsx` — verified pre-implementation.
- **`src/layouts/` does not yet exist** — will be created in Step 6.1.
- **`src/router.tsx` does not yet exist** — will be created in Step 6.2.
- **Only one caller of `@/components/layout/MainLayout`**: `App.tsx`. No other file imports from `src/components/layout/`. Confirmed by `grep -r "components/layout" src/` = one match.
- **No tests import from layout files or `App.tsx`**: the 7 existing test suites cover `api`, `authSession`, `authService`, `useLoginForm`, `useSystemThemeSync`, `useThemeStorageSync`, `useThemeKeyboardToggle` — none reference `components/layout/`, `layouts/`, `App.tsx`, `router.tsx`, or `main.tsx`. Moving these files introduces zero test import path breakage.
- **`ProtectedRoute` and `AdminRoute`**: use `@/services/authSession` only; no layout imports. Unchanged by this task.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `solid-deep-design` — Selected — guides the SRP split: each module gets one reason to change (`router.tsx` = route definitions, `App.tsx` = provider composition, `main.tsx` = DOM entry point)
- `tdd` — Selected — confirms no TDD cycle is needed: this task introduces zero new logic; validation is `typecheck` + `build` + existing test suite
- `react-best-practices` — Not needed — no new React patterns introduced; this is a structural file move
- `shadcn-component-review` — Not needed — shadcn components are untouched

### Documentation Reviewed

- react-router-dom 6.30.3 — `BrowserRouter` + `Routes` + `Route` API. No API changes: all code being moved to `router.tsx` already exists and passes `typecheck`. No new API surface.
- tsconfig.json / vite.config.ts — `@/` alias maps to `./src/` in both TypeScript (`paths`) and Vite (`resolve.alias`). No per-file path overrides; alias is directory-level. Moving files to `src/layouts/` is automatically covered.
- vitest.config.ts — `@/` alias also replicated for tests. Confirmed: moving layout files does not affect test imports.

### Related Existing Code

- `src/components/layout/MainLayout.tsx` — layout shell being moved to `src/layouts/`
- `src/components/layout/Sidebar.tsx` — layout shell being moved to `src/layouts/`
- `src/components/layout/Header.tsx` — layout shell being moved to `src/layouts/`
- `src/App.tsx` — BrowserRouter + Routes tree; will be reduced to provider composition
- `src/main.tsx` — entry point; will remove ThemeProvider wrapper
- `src/context/theme/ThemeProvider.tsx` — moves from `main.tsx` wrapper to `App.tsx` wrapper
- `src/routes/ProtectedRoute.tsx` — route guard; unchanged, but imported by `router.tsx`
- `src/pages/*.tsx` — page components; unchanged, but imported by `router.tsx`
- [[Features/to-do/Frontend-SOLID-Refactor]] — parent feature document

---

## Implementation Details

### Approach

This task is a **pure structural reorganization** — no logic changes, no new abstractions, no behaviour changes. The work is:

1. **File moves**: create files in new locations with identical content (adjusting only the two relative imports in `MainLayout.tsx` that happen to stay identical), then delete the originals.
2. **Import path update**: the single caller of `@/components/layout/MainLayout` (`App.tsx`) gets the import updated to `@/layouts/MainLayout`.
3. **JSX extraction**: the BrowserRouter + Routes tree moves verbatim from `App.tsx` to a new `router.tsx` file. `App.tsx` is rewritten as a one-responsibility provider wrapper.
4. **Provider migration**: `ThemeProvider` moves from `main.tsx` (where it wraps `App`) to `App.tsx` (where it wraps `AppRouter`). `main.tsx` renders `<App />` directly.

**SOLID analysis:**

- `router.tsx` — SRP: one reason to change (route definitions evolve when routes are added/removed/reorganized). Deep module check: thin by design — route definitions are configuration, not logic. Deletion test: deleting it and returning the JSX to `App.tsx` would merge two responsibilities back into one file. The module is correctly thin but earns its place through SRP.
- `App.tsx` (after) — SRP: one reason to change (provider composition changes when new global providers are added or removed). This is a coordinator, not a deep module — that is the correct shape for a composition root.
- `main.tsx` (after) — SRP: one reason to change (DOM entry point wiring). The `setOnUnauthorized` wiring remains here because it is a one-time startup side effect — it must fire before any component renders, and `main.tsx` is the only safe place for it.

**Naming convention for router component**: the exported component is named `AppRouter` (not `RouterProvider`, which is a react-router-dom export for the data-router API) to avoid a naming collision with react-router-dom v6's `RouterProvider` named export.

**`MainLayout.tsx` relative imports**: `MainLayout` imports `Sidebar` and `Header` with relative paths (`./Sidebar`, `./Header`). Because all three files move together to `src/layouts/`, these relative paths remain correct and require no change.

### Files to Create/Modify

- [x] `src/layouts/MainLayout.tsx` — new file (moved from `src/components/layout/MainLayout.tsx`)
- [x] `src/layouts/Sidebar.tsx` — new file (moved from `src/components/layout/Sidebar.tsx`)
- [x] `src/layouts/Header.tsx` — new file (moved from `src/components/layout/Header.tsx`)
- [x] `src/components/layout/MainLayout.tsx` — deleted after copy
- [x] `src/components/layout/Sidebar.tsx` — deleted after copy
- [x] `src/components/layout/Header.tsx` — deleted after copy
- [x] `src/components/layout/` — directory deleted (empty after file moves)
- [x] `src/App.tsx` — Step 6.1: update one import path; Step 6.2: rewrite as provider composition
- [x] `src/router.tsx` — new file (extracted from `src/App.tsx`)
- [x] `src/main.tsx` — Step 6.2: remove ThemeProvider import and wrapper
- [x] `documentation/Memory/architecture.md` — update source map entries for moved files

---

## Step-by-Step Implementation

### Step 6.1: Move Layout Files to `src/layouts/`

**Goal:** Make layout shells structurally distinct from UI components by relocating them to a dedicated `src/layouts/` directory.
**Dependencies:** None (this step is independent of Step 6.2).

- [x] Create `src/layouts/MainLayout.tsx` with the content below (no changes from the original except the path context)
- [x] Create `src/layouts/Sidebar.tsx` — copy verbatim from `src/components/layout/Sidebar.tsx` (no import changes needed; all imports use `@/` aliases)
- [x] Create `src/layouts/Header.tsx` — copy verbatim from `src/components/layout/Header.tsx` (no import changes needed; all imports use `@/` aliases)
- [x] Update `src/App.tsx`: change `import { MainLayout } from "@/components/layout/MainLayout"` to `import { MainLayout } from "@/layouts/MainLayout"`
- [x] Delete `src/components/layout/MainLayout.tsx`
- [x] Delete `src/components/layout/Sidebar.tsx`
- [x] Delete `src/components/layout/Header.tsx`
- [x] Delete the now-empty `src/components/layout/` directory
- [x] Run `npm run typecheck` — expect 0 errors

**Why this step is critical:** TypeScript surfaced all missed import-path references at `npm run typecheck`. Running it after the move (and before Step 6.2) isolates any import breakage to this step alone, making debugging faster if a path is missed.

#### Implementation

**`src/layouts/MainLayout.tsx`** (content identical to origin; relative imports `./Sidebar` and `./Header` remain correct because all three files are co-located in `src/layouts/`):

```typescript
import { SidebarProvider } from "@/components/ui/sidebar";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Outlet } from "react-router-dom";

export function MainLayout() {
  return (
    <SidebarProvider>
      <div className="flex w-screen h-screen overflow-hidden bg-background">
        
        <Sidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          
          <Header />
          
          <main className="flex-1 p-6 bg-background/50 overflow-y-auto">
            <Outlet /> 
          </main>          
        
        </div>
      </div>
    </SidebarProvider>
  );
}
```

**`src/App.tsx`** (Step 6.1 change only — one import path update; routing tree is unchanged until Step 6.2):

```typescript
import { BrowserRouter, Route, Routes } from "react-router-dom"
import { HomePage } from "@/pages/HomePage"
import { LoginPage } from "@/pages/LoginPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { ProtectedRoute } from "@/routes/ProtectedRoute"
import { MainLayout } from "@/layouts/MainLayout"  // updated path

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

1. **`./Sidebar` and `./Header` relative imports in `MainLayout.tsx`**: These point to sibling files. Because all three layout files move together, the relative paths remain valid. If only `MainLayout.tsx` were moved without the others, these would break. Moving all three together in one step prevents this.
2. **`Sidebar` naming collision**: `Sidebar.tsx` imports `shadcn/ui`'s `Sidebar` aliased as `ShadcnSidebar` to avoid a collision with the exported `Sidebar` function. This aliasing is already correct and carries over unchanged.
3. **Empty directory**: After deleting the three files, `src/components/layout/` is empty. Some file systems require explicit directory deletion. Delete the directory explicitly after the files are removed to keep the tree clean.

---

### Step 6.2: Extract Route Definitions into `src/router.tsx`

**Goal:** Give route definitions their own module (`router.tsx`) and reduce `App.tsx` to a pure provider composition, making `main.tsx` a minimal DOM entry point.
**Dependencies:** Step 6.1 complete (layouts are in `src/layouts/`).

- [x] Create `src/router.tsx` with the BrowserRouter + Routes tree extracted verbatim from `App.tsx`
- [x] Rewrite `src/App.tsx` as a provider composition wrapper
- [x] Update `src/main.tsx`: remove the `ThemeProvider` import and wrapper; render `<App />` directly
- [x] Run `npm run typecheck` — expect 0 errors
- [x] Run `npm run build` — expect successful production build
- [x] Run `npm run test` — expect 36/36 tests passing (no test file references these modules)

**Why this step is critical:** The provider migration is the riskiest part: `ThemeProvider` moves from `main.tsx` to `App.tsx`. The theme context must remain in scope for all components in the router tree. Because `App.tsx` renders `<ThemeProvider><AppRouter /></ThemeProvider>`, the context wraps all pages correctly. The `setOnUnauthorized` wiring in `main.tsx` is at module level (before `createRoot`) and is unaffected by the provider location change.

#### Implementation

**`src/router.tsx`** (new file — verbatim extraction from `App.tsx` with updated `MainLayout` import path from Step 6.1):

```typescript
import { BrowserRouter, Route, Routes } from "react-router-dom"
import { HomePage } from "@/pages/HomePage"
import { LoginPage } from "@/pages/LoginPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { ProtectedRoute } from "@/routes/ProtectedRoute"
import { MainLayout } from "@/layouts/MainLayout"

export function AppRouter() {
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

**`src/App.tsx`** (rewritten — provider composition only):

```typescript
import { ThemeProvider } from "@/context/theme/ThemeProvider"
import { AppRouter } from "@/router"

export function App() {
  return (
    <ThemeProvider>
      <AppRouter />
    </ThemeProvider>
  )
}
```

**`src/main.tsx`** (updated — ThemeProvider removed; renders `<App />` directly):

```typescript
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { setOnUnauthorized } from "@/lib/api"
import { clearSession } from "@/services/authSession"

import "./index.css"
import { App } from "./App"

setOnUnauthorized(() => {
  clearSession()
  window.location.href = "/login"
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

#### Edge Cases

1. **`setOnUnauthorized` startup ordering**: the wiring call is at module level in `main.tsx`, before `createRoot`. This ordering is unchanged — `setOnUnauthorized` still fires synchronously before any HTTP request can be made. Moving `ThemeProvider` from `main.tsx` into `App.tsx` does not affect the wiring call's position or timing.
2. **`ThemeProvider` default props**: the component accepts `defaultTheme`, `storageKey`, and `children`. When used without explicit props (as in `<ThemeProvider>`), TypeScript will use the defaults defined in the component. This is the same usage as the current `main.tsx` wrapper — no prop changes needed.
3. **`BrowserRouter` naming**: `AppRouter` is the name exported from `router.tsx`. This is intentionally not named `RouterProvider` to avoid a naming collision with react-router-dom v6's `RouterProvider` export (which is for the data-router/`createBrowserRouter` API, not the traditional `BrowserRouter` API in use here).
4. **`ProtectedRoute` children pattern**: the current route structure uses `<ProtectedRoute><MainLayout /></ProtectedRoute>` as the parent route element, with `<MainLayout />` (which contains `<Outlet />`) as children. This pattern is valid in react-router-dom v6 — the Outlet renders the matched child route through React context, not through the component tree prop chain. The pattern carries over unchanged to `router.tsx`.

---

## Design Decisions

**Decision 1: Name the router component `AppRouter`, not `RouterProvider`**
- **Why:** react-router-dom v6 exports a `RouterProvider` component used with the data-router API (`createBrowserRouter`). Using the same name for a different concept would create import confusion. `AppRouter` is unambiguous and clearly describes the role (the application's router).
- **Alternatives considered:** `Router` (too generic — clashes conceptually with react-router-dom's own `Router` base class), `Routes` (already exported by react-router-dom), `AppRoutes` (acceptable but `AppRouter` better implies the `BrowserRouter` wrapper is included).

**Decision 2: `ThemeProvider` moves from `main.tsx` into `App.tsx`, not the reverse**
- **Why:** `App.tsx` becomes the composition root for global providers. `main.tsx` is the DOM entry point — it should only mount the root component and wire one-time startup effects. Provider composition is an application concern, not a DOM concern. Keeping `ThemeProvider` in `App.tsx` means the provider wraps `AppRouter`, which is the correct scope — all routed pages need access to the theme context.
- **Alternatives considered:** Keeping `ThemeProvider` in `main.tsx` and just extracting the router — this leaves `main.tsx` with two concerns (entry point + provider), which is the violation the parent feature is trying to fix.

**Decision 3: `BrowserRouter` stays inside `router.tsx` (not promoted to `App.tsx`)**
- **Why:** `BrowserRouter` provides the routing context for all route-aware components. Its natural scope is the router module — it provides the context that `Routes` and `Route` consume. Keeping it inside `router.tsx` means `AppRouter` is a self-contained routing unit: `<AppRouter />` can be dropped anywhere and will work. Promoting `BrowserRouter` to `App.tsx` would split the router context from the route definitions across two files.
- **Alternatives considered:** `<BrowserRouter>` in `App.tsx` wrapping `<AppRouter>` which exports just `<Routes>` — rejected because it splits the routing responsibility across two files and provides no benefit.

**Decision 4: No architectural changes to the `ProtectedRoute` children pattern**
- **Why:** The current `<ProtectedRoute><MainLayout /></ProtectedRoute>` pattern works correctly in react-router-dom v6.30.3. `ProtectedRoute` returns its `children` when authenticated; `MainLayout` contains `<Outlet />` which renders the matched child route through React context. Changing this to a more idiomatic `<Outlet />` pattern inside `ProtectedRoute` would be a separate refactor beyond this task's scope (pure structural move).
- **Alternatives considered:** Refactoring `ProtectedRoute` to use `<Outlet />` directly — deferred. It is not part of the parent feature scope and would introduce logic changes that should be reviewed independently.

**Decision 5: `src/layouts/` does not get a barrel `index.ts`**
- **Why:** The `features/authentication/index.ts` public API file was required because `features/authentication/` is a domain boundary — external code must not deep-import its internal services or hooks directly. `src/layouts/` has no such boundary requirement: `MainLayout` is imported directly by `router.tsx` via an explicit path import, and `Sidebar`/`Header` are consumed only by `MainLayout` via relative imports. There is no "inside vs. outside the feature" distinction to enforce. Creating a barrel file here would be accidental complexity with no corresponding domain protection.
- **Alternatives considered:** Creating `src/layouts/index.ts` re-exporting all three components — rejected. A barrel adds an indirection layer without providing any encapsulation benefit, and would create a mismatched precedent suggesting layouts are a domain boundary (they are not).<!-- REVIEW-FIX: Added Decision 5 to explicitly prevent creation of a layouts/index.ts barrel file — executor might infer this pattern from Task 4's features/authentication/index.ts -->

---

## Testing Considerations

### Automatic Validation

After Step 6.1:
- [x] Run `npm run typecheck` (from `project/srcs/frontend/`) — expect 0 errors. TypeScript will surface any missed import path if a layout file reference was not updated.

After Step 6.2:
- [x] Run `npm run typecheck` — expect 0 errors
- [x] Run `npm run build` — expect successful Vite production build (no undefined export or missing module errors)
- [x] Run `npm run test` — expect 36/36 tests passing across 7 suites (no test file imports layout files, `App.tsx`, `router.tsx`, or `main.tsx`)

### Manual Validation

These checks verify that the structural reorganization did not break any route or theme behaviour in the running application:

- [ ] Start the dev server (`npm run dev`) and navigate to `http://localhost:3000/` — the Home page renders with the login button
- [ ] Navigate to `http://localhost:3000/login` — the Login page renders with the username/password form
- [ ] Navigate directly to `http://localhost:3000/dashboard` without logging in — `ProtectedRoute` redirects to `/login` with the "You need to sign in…" message
- [ ] Log in with valid credentials — redirect to `/dashboard`; the Dashboard page renders inside `MainLayout` (Sidebar + Header visible); the `<Outlet />` renders `DashboardPage` inside the main area
- [ ] Press the `D` key — the theme toggles between dark and light (verifies `ThemeProvider` + `useThemeKeyboardToggle` are still in scope after the provider migration from `main.tsx` to `App.tsx`)
- [ ] Click Logout — `clearSession()` fires, redirects to `/login`

---

## Related Code Explanations

- `src/components/layout/MainLayout.tsx` — authenticated shell that renders `<Sidebar>` + `<Header>` + `<Outlet />`; source of the file being moved
- `src/components/layout/Sidebar.tsx` — navigation sidebar; shadcn `SidebarMenuButton` uses `onClick`+`useNavigate()` (not `asChild`) per known-issues constraint
- `src/components/layout/Header.tsx` — top bar; `getPageTitle()` switch; logout calls `clearSession()`
- `src/App.tsx` — current home of both provider setup and route definitions; will be split
- `src/main.tsx` — entry point; `setOnUnauthorized` wiring must remain here at module level
- `src/context/theme/ThemeProvider.tsx` — migrates from `main.tsx` wrapper to `App.tsx` wrapper
- `src/routes/ProtectedRoute.tsx` — guard; accepts `children: ReactNode`; unchanged

---

## Completion Criteria

- [x] `src/layouts/` directory created with `MainLayout.tsx`, `Sidebar.tsx`, `Header.tsx`
- [x] `src/components/layout/` directory deleted (all three files removed)
- [x] `src/App.tsx` updated: `@/components/layout/MainLayout` → `@/layouts/MainLayout` in Step 6.1; rewritten as provider composition in Step 6.2
- [x] `src/router.tsx` created with the `BrowserRouter` + `Routes` tree and named export `AppRouter`
- [x] `src/main.tsx` updated: `ThemeProvider` import removed; renders `<App />` directly
- [x] `npm run typecheck` = 0 errors after Step 6.1
- [x] `npm run typecheck` = 0 errors after Step 6.2
- [x] `npm run build` = successful after Step 6.2
- [x] `npm run test` = 36/36 passing after Step 6.2
- [ ] Manual validation steps documented above performed by the user
- [x] `documentation/Memory/architecture.md` source map updated: `components/layout/` entries renamed to `layouts/`; `App.tsx` entry updated; new `router.tsx` entry added; `main.tsx` entry updated (ThemeProvider removed)
- [x] `documentation/Memory/context.md` updated to reflect Phase 6 complete and Frontend SOLID Refactor feature fully done
- [x] `documentation/Memory/progress.md` updated with a dated entry for Task 6 execution
- [x] Parent feature [[Features/to-do/Frontend-SOLID-Refactor]] Steps 6.1 and 6.2 marked `[x]`
- [ ] **Feature close-out (Task 6 is the final task):** move all 6 task documents from `Tasks/current/` to `Tasks/done/`; move the parent feature from `Features/to-do/` to `Features/done/` — these are user responsibility per orchestrator convention (file moves are not automated)<!-- REVIEW-FIX: Added feature close-out criteria — Task 6 is the last task; all task docs and the parent feature should be moved to done/ after execution -->

---

## Post-Execution Notes

Executed 2026-06-26. Pure structural reorganization completed with zero deviations from the Task document.

**Step 6.1** — created `src/layouts/MainLayout.tsx` (relative `./Sidebar`+`./Header` imports preserved), copied `Sidebar.tsx` and `Header.tsx` verbatim (all imports use `@/` aliases — no changes needed), updated `App.tsx` import `@/components/layout/MainLayout` → `@/layouts/MainLayout`, deleted the three origin files and the now-empty `src/components/layout/` directory. `npm run typecheck` = 0 errors.

**Step 6.2** — created `src/router.tsx` exporting `AppRouter` (BrowserRouter + Routes tree extracted verbatim), rewrote `App.tsx` as a pure `ThemeProvider` → `AppRouter` provider composition, reduced `main.tsx` to DOM entry point + `setOnUnauthorized` module-level wiring (ThemeProvider import/wrapper removed). Validation: `npm run typecheck` = 0 errors, `npm run build` = success (438.83 kB JS, 9.82s), `npm run test` = 36/36 across 7 suites. No test file references the moved/created modules, confirming the precondition.

**Post-implementation review:** 0 bugs, 0 architectural issues. `grep -rn "components/layout" src/` returns no matches. `src/components/` now contains only `common/` and `ui/`. The `AppRouter` naming avoids the react-router-dom v6 `RouterProvider` collision as planned. Manual validation (6 dev-server checks) remains for the user.

**Feature close-out:** This is the final task of [[Features/to-do/Frontend-SOLID-Refactor]] (all six phases now complete). Per orchestrator convention, file moves — all 6 task documents from `Tasks/current/` → `Tasks/done/` and the parent feature from `Features/to-do/` → `Features/done/` — are the user's responsibility and not automated.
