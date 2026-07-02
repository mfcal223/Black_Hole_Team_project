# Task: Auth Session Module Consolidation

#task #current #medium-complexity #parent-frontend-solid-refactor

**Parent:** [[Frontend-SOLID-Refactor]]
**Parent Type:** Feature
**Related Step(s):** Phase 3 — Steps 3.1, 3.2 + completing deferred Step 2.2 (Phase 2)
**Estimated Complexity:** Medium

---

## Goal

Rename `authHelpers.ts` to `authSession.ts`, add `saveSession()` as the single write seam for browser auth session, rename `clearAuth()` to `clearSession()`, update all six callers, and complete the deferred Step 2.2 wiring in `main.tsx` — closing the entire auth foundation before Task 4 begins.

---

## Parent Context

[[Frontend-SOLID-Refactor]] identifies three issues that this task resolves:

1. **Naming mismatch**: `authHelpers` is a category name that says nothing about the module's actual role. `authSession` names the real concern — the browser auth session held in localStorage.
2. **Missing `saveSession`**: Token, username, and roles are written in at least two places (`authService.ts` inside `login()` and `LoginPage.tsx` directly), duplicating the three `localStorage.setItem` calls and the key name strings. `saveSession(token, username, roles)` becomes the single write seam. Task 4 migrates callers to use it; this task defines it.
3. **`clearAuth` naming**: The name describes a category ("clear auth") rather than the specific action taken — clearing the browser session state. `clearSession` is the precise name.

**Phase ordering (authoritative):** `Phase 1 → Phase 3 → Phase 2 → Phase 4`. This task is Phase 3, which is completed before Phase 2's final step closes. Step 2.2 (wiring `setOnUnauthorized` in `main.tsx`) was deferred in Task 2 because it calls `clearSession()` from `@/services/authSession` — which this task creates. Step 2.2 is therefore completed as the final step of this task rather than remaining open.

**Parent constraints:**
- `saveSession(token, username, roles)` is the only function that writes token, username, and roles to localStorage. After Task 4, no caller writes these keys directly.
- `clearSession()` is the only function that removes these three keys. The old name `clearAuth` survives as a deprecated alias during the caller-update window and is removed once all callers are updated.
- `authSession.ts` imports only from `@/types/auth` — no Axios, no React, no router.

---

## Preconditions / Dependencies

- **Task 1 complete**: `src/types/auth.ts` exists; `authHelpers.ts` already imports `ROLE_ADMIN`, `ROLE_EMPLOYEE`, `type UserRole` from `@/types/auth`. All dead code removed. File is 51 lines.
- **Task 2 complete (Steps 2.1, 2.3)**: `src/lib/api.ts` exists with `setOnUnauthorized` seam and fail-safe default. Step 2.2 (main.tsx wiring) remains deferred and is completed in Step 3.4 of this task.
- Vitest infrastructure is in place: `vitest.config.ts` with `jsdom` environment and `@/` alias, `npm run test` script, 4 passing tests in `src/lib/api.test.ts`.
- `npm run typecheck` passes with 0 errors; `npm run build` succeeds (baseline after Task 2).

---

## Skills and Documentation Preparation

### Skills Reviewed

- `solid-deep-design` — Selected — SRP and depth analysis for `authSession.ts`; deletion test on `saveSession`; naming precision over category names.
- `tdd` — Selected — TDD cycle for `authSession.ts` unit tests (write tests first, create the module second).
- `documentation-management` — Selected — task file creation and completion criteria.
- `memory-bank` — Selected — project context loaded; Memory Bank updated at task completion.
- `glossary-management` — Reviewed — no new domain terms introduced; "auth session" is the browser-side localStorage auth state consistent with current usage.

### Documentation Reviewed

- **TypeScript 5.9.3 `verbatimModuleSyntax`**: `tsconfig.app.json` has `"verbatimModuleSyntax": true`. The import from `@/types/auth` uses the combined form `import { ROLE_ADMIN, ROLE_EMPLOYEE, type UserRole }` — the same form already established in Task 1 for `authHelpers.ts`. No new TypeScript API surface is introduced.
- **Vitest 4.1.9 / jsdom 29.1.1**: `localStorage` is available as a global in the jsdom test environment. `localStorage.clear()` in `beforeEach` provides complete isolation between tests. No additional documentation queries needed — the test infrastructure from Task 2 applies directly.
- **Context7 not queried**: No new library API calls are introduced. All patterns are standard TypeScript module exports and the jsdom-backed `localStorage` global.

### Related Existing Code

- `project/srcs/frontend/src/services/authHelpers.ts` — the file being renamed and extended; current state: 51 lines, 8 exported functions, 1 import from `@/types/auth`.
- `project/srcs/frontend/src/components/layout/Header.tsx:4` — the only caller that uses `clearAuth`; must have both import path and call site updated.
- `project/srcs/frontend/src/pages/DashboardPage.tsx:8` — imports `getUsername, isAdmin, isEmployee`; path update only.
- `project/srcs/frontend/src/pages/LoginPage.tsx:3` — imports `isAuthenticated`; path update only.
- `project/srcs/frontend/src/pages/HomePage.tsx:3` — imports `isAuthenticated`; path update only.
- `project/srcs/frontend/src/routes/ProtectedRoute.tsx:3` — imports `isAuthenticated`; path update only.
- `project/srcs/frontend/src/routes/AdminRoute.tsx:3` — imports `isAdmin, isAuthenticated`; path update only.
- `project/srcs/frontend/src/main.tsx` — composition root; receives the deferred `setOnUnauthorized` wiring in Step 3.4.
- `project/srcs/frontend/src/lib/api.ts:8` — exports `setOnUnauthorized`; the seam wired in Step 3.4.

---

## Implementation Details

### Approach

This task is a rename-plus-extend with four sequential steps:

1. **TDD + create `authSession.ts`**: Write 12 unit tests (RED), then create `authSession.ts` to pass them (GREEN). Include deprecated `clearAuth` alias temporarily.
2. **Update six callers**: Import path changes + `clearAuth` → `clearSession` rename in `Header.tsx`.
3. **Delete `authHelpers.ts` and remove alias**: After all callers are updated, the alias is removed and the old file is deleted.
4. **Complete deferred Step 2.2**: Wire `setOnUnauthorized` in `main.tsx` with `clearSession`.

**SOLID + Deep Module analysis:**

`authSession.ts`:
- **SRP**: One responsibility — browser auth session state management. Single reason to change: if localStorage key names, key layout, or the storage mechanism changes (e.g., migrating from `localStorage` to `sessionStorage`). That change is a single-file edit.
- **Depth**: The module concentrates all localStorage key knowledge (`"token"`, `"username"`, `"roles"`) behind its interface. No caller knows the key names — they get behavior. The interface (9 public functions) is much smaller than the implementation's total surface (every `localStorage.get/set/remove` call in the app, plus JSON parsing, plus the role-checking logic).
- **Deletion test**: Removing `authSession.ts` would scatter `localStorage.setItem("token", ...)`, `localStorage.getItem("token")`, and `localStorage.removeItem("token")` across 6+ files, each needing to rediscover the key strings. Complexity scatters across callers → the module earns its place.
- **`saveSession` specifically**: Before Task 3, session writes are duplicated in `LoginPage.tsx` (3 × `setItem`) and `authService.ts` (3 × `setItem`). After Task 3 + Task 4, `saveSession` is the single write seam. Callers pass `(token, username, roles)` — they never touch localStorage directly.

### Files to Create/Modify

- [ ] `project/srcs/frontend/src/services/authSession.test.ts` — **NEW FILE**: 12 unit tests for `authSession.ts`; written before the implementation (TDD).
- [ ] `project/srcs/frontend/src/services/authSession.ts` — **NEW FILE**: the renamed and extended module.
- [ ] `project/srcs/frontend/src/services/authHelpers.ts` — **DELETE** after all callers are updated (Step 3.3).
- [ ] `project/srcs/frontend/src/components/layout/Header.tsx:4` — update import path + `clearAuth` → `clearSession`.
- [ ] `project/srcs/frontend/src/pages/DashboardPage.tsx:8` — update import path.
- [ ] `project/srcs/frontend/src/pages/LoginPage.tsx:3` — update import path.
- [ ] `project/srcs/frontend/src/pages/HomePage.tsx:3` — update import path.
- [ ] `project/srcs/frontend/src/routes/ProtectedRoute.tsx:3` — update import path.
- [ ] `project/srcs/frontend/src/routes/AdminRoute.tsx:3` — update import path.
- [ ] `project/srcs/frontend/src/main.tsx` — add `setOnUnauthorized` wiring (deferred Step 2.2).

---

## Step-by-Step Implementation

### Step 3.1: Write Tests First (RED), Then Create `authSession.ts` (GREEN)

**Goal:** TDD cycle — write the 12 unit tests before `authSession.ts` exists, confirm RED, then create the module to make them pass.
**Dependencies:** Task 2 complete (Vitest infrastructure in place).

#### 3.1a — Write Tests (RED state)

- [ ] Create `project/srcs/frontend/src/services/authSession.test.ts` with the following content:

<!-- REVIEW-FIX: Removed getToken and getUsername from imports — both were imported but never used in any test body. tsconfig.app.json has "noUnusedLocals": true and "include": ["src"], so test files are part of the typecheck compilation. Unused imports cause a typecheck failure. -->

```typescript
import { describe, it, expect, beforeEach } from "vitest"
import {
  saveSession,
  clearSession,
  isAuthenticated,
  isAdmin,
  isEmployee,
} from "./authSession"

describe("authSession", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe("saveSession", () => {
    it("writes token to localStorage", () => {
      saveSession("tok123", "alice", ["ROLE_EMPLOYEE"])
      expect(localStorage.getItem("token")).toBe("tok123")
    })

    it("writes username to localStorage", () => {
      saveSession("tok123", "alice", ["ROLE_EMPLOYEE"])
      expect(localStorage.getItem("username")).toBe("alice")
    })

    it("writes roles as JSON string to localStorage", () => {
      saveSession("tok123", "alice", ["ROLE_EMPLOYEE"])
      expect(localStorage.getItem("roles")).toBe(
        JSON.stringify(["ROLE_EMPLOYEE"])
      )
    })
  })

  describe("clearSession", () => {
    it("removes token from localStorage", () => {
      saveSession("tok123", "alice", ["ROLE_EMPLOYEE"])
      clearSession()
      expect(localStorage.getItem("token")).toBeNull()
    })

    it("removes username from localStorage", () => {
      saveSession("tok123", "alice", ["ROLE_EMPLOYEE"])
      clearSession()
      expect(localStorage.getItem("username")).toBeNull()
    })

    it("removes roles from localStorage", () => {
      saveSession("tok123", "alice", ["ROLE_EMPLOYEE"])
      clearSession()
      expect(localStorage.getItem("roles")).toBeNull()
    })
  })

  describe("isAuthenticated", () => {
    it("returns false when no token is stored", () => {
      expect(isAuthenticated()).toBe(false)
    })

    it("returns true when token is present", () => {
      saveSession("tok123", "alice", [])
      expect(isAuthenticated()).toBe(true)
    })
  })

  describe("isAdmin", () => {
    it("returns true when ROLE_ADMIN is in roles", () => {
      saveSession("tok", "adm", ["ROLE_ADMIN"])
      expect(isAdmin()).toBe(true)
    })

    it("returns false when ROLE_ADMIN is not in roles", () => {
      saveSession("tok", "emp", ["ROLE_EMPLOYEE"])
      expect(isAdmin()).toBe(false)
    })
  })

  describe("isEmployee", () => {
    it("returns true when ROLE_EMPLOYEE is in roles", () => {
      saveSession("tok", "emp", ["ROLE_EMPLOYEE"])
      expect(isEmployee()).toBe(true)
    })

    it("returns false when ROLE_EMPLOYEE is not in roles", () => {
      saveSession("tok", "adm", ["ROLE_ADMIN"])
      expect(isEmployee()).toBe(false)
    })
  })
})
```

- [ ] Run `npm run test` from `project/srcs/frontend/` — the suite must report **1 failing suite** ("Cannot find module './authSession'"). This is the expected RED state.

**Why this test structure:**
- `saveSession` — three separate tests (one per key) so a failure identifies exactly which key is wrong.
- `clearSession` — three separate tests; each sets state via `saveSession` first to verify the full write-then-clear roundtrip.
- `isAuthenticated` — two tests: the false path (empty storage) and the true path (after `saveSession`). The parent feature specifies "returns false when token absent" — the true path is added as the complementary positive case.
- `isAdmin` / `isEmployee` — two tests each: one positive, one negative. Verifies the role string comparison is exact.

#### 3.1b — Create `authSession.ts` (GREEN state)

- [ ] Create `project/srcs/frontend/src/services/authSession.ts` with the following exact content:

```typescript
import { ROLE_ADMIN, ROLE_EMPLOYEE, type UserRole } from "@/types/auth"

export function saveSession(
  token: string,
  username: string,
  roles: string[]
): void {
  localStorage.setItem("token", token)
  localStorage.setItem("username", username)
  localStorage.setItem("roles", JSON.stringify(roles))
}

export function clearSession(): void {
  localStorage.removeItem("token")
  localStorage.removeItem("username")
  localStorage.removeItem("roles")
}

/** @deprecated Use clearSession() instead. Removed after all callers updated in Step 3.2. */
export const clearAuth = clearSession

export function getToken(): string | null {
  return localStorage.getItem("token")
}

export function getUsername(): string | null {
  return localStorage.getItem("username")
}

export function getRoles(): string[] {
  const rawRoles = localStorage.getItem("roles")

  if (!rawRoles) {
    return []
  }

  try {
    const parsed = JSON.parse(rawRoles)

    if (Array.isArray(parsed)) {
      return parsed
    }

    return []
  } catch {
    return []
  }
}

export function hasRole(role: UserRole): boolean {
  return getRoles().includes(role)
}

export function isAuthenticated(): boolean {
  return Boolean(getToken())
}

export function isAdmin(): boolean {
  return hasRole(ROLE_ADMIN)
}

export function isEmployee(): boolean {
  return hasRole(ROLE_EMPLOYEE)
}
```

- [ ] Run `npm run test` from `project/srcs/frontend/` — must report **16 passing tests, 0 failures** (12 new + 4 existing from `api.test.ts`). This confirms GREEN state.

**Why this step is critical:**
`saveSession` is the write seam that eliminates the double-write hazard. Defining it here, with tests, establishes the contract before any caller is migrated. The deprecated `clearAuth` alias (a const re-pointing to `clearSession`) prevents a broken-build window while callers are updated in Step 3.2.

#### Edge Cases

1. **`saveSession` roles serialization**: `localStorage.setItem("roles", JSON.stringify(roles))` and `getRoles()` using `JSON.parse` are symmetrical. The test asserts `JSON.stringify(["ROLE_EMPLOYEE"])` to verify the exact stored format.
2. **`clearAuth` deprecated alias**: `export const clearAuth = clearSession` re-exports the function under its old name. The JSDoc `@deprecated` is informational — TypeScript does not emit an error on usage, but IDE tooling shows a strikethrough. The alias exists only until Step 3.2 removes the last caller.
3. **`noUnusedLocals: true` constraint**: `ROLE_ADMIN`, `ROLE_EMPLOYEE`, and `UserRole` are all used in the module body (`isAdmin`, `isEmployee`, `hasRole`). No unused-local error fires.
4. **`verbatimModuleSyntax`**: The import uses `import { ROLE_ADMIN, ROLE_EMPLOYEE, type UserRole }` — the same combined form as `authHelpers.ts`. `UserRole` is type-only (requires `type`); the constants are values (no `type`).

---

### Step 3.2: Update All Six Callers

**Goal:** Update every file that imports from `@/services/authHelpers` to import from `@/services/authSession`. Update `Header.tsx` to use `clearSession` instead of `clearAuth` at both the import and the call site.
**Dependencies:** Step 3.1b complete — `authSession.ts` must exist and export all required names before `authHelpers.ts` is abandoned.

- [ ] **`Header.tsx`** (line 4): Change import path and rename `clearAuth` → `clearSession`.

  Before:
  ```typescript
  import { getUsername, isAdmin, isEmployee, clearAuth } from "@/services/authHelpers";
  ```
  After:
  ```typescript
  import { getUsername, isAdmin, isEmployee, clearSession } from "@/services/authSession";
  ```
  Also update the `handleLogout` function body (line ~31):
  ```typescript
  const handleLogout = () => {
    clearSession();
    navigate("/login");
  };
  ```
  <!-- REVIEW-FIX: Added instruction to remove stale comment — Header.tsx line ~10 has "// Get data from authHelpers" which will be incorrect after the module is renamed. Remove this comment while touching the file in this step. -->
  Also remove the stale comment on line ~10:
  ```typescript
  // Get data from authHelpers  ← DELETE THIS LINE
  const username = getUsername() || "User";
  ```

- [ ] **`DashboardPage.tsx`** (line 8): Change import path. Imported names (`getUsername, isAdmin, isEmployee`) are unchanged.

  Before:
  ```typescript
  import { getUsername, isAdmin, isEmployee } from "@/services/authHelpers"
  ```
  After:
  ```typescript
  import { getUsername, isAdmin, isEmployee } from "@/services/authSession"
  ```

- [ ] **`LoginPage.tsx`** (line 3): Change import path. Imported name (`isAuthenticated`) is unchanged.

  Before:
  ```typescript
  import { isAuthenticated } from "@/services/authHelpers"
  ```
  After:
  ```typescript
  import { isAuthenticated } from "@/services/authSession"
  ```

- [ ] **`HomePage.tsx`** (line 3): Change import path. Imported name (`isAuthenticated`) is unchanged.

  Before:
  ```typescript
  import { isAuthenticated } from "@/services/authHelpers"
  ```
  After:
  ```typescript
  import { isAuthenticated } from "@/services/authSession"
  ```

- [ ] **`ProtectedRoute.tsx`** (line 3): Change import path. Imported name (`isAuthenticated`) is unchanged.

  Before:
  ```typescript
  import { isAuthenticated } from "@/services/authHelpers"
  ```
  After:
  ```typescript
  import { isAuthenticated } from "@/services/authSession"
  ```

- [ ] **`AdminRoute.tsx`** (line 3): Change import path. Imported names (`isAdmin, isAuthenticated`) are unchanged.

  Before:
  ```typescript
  import { isAdmin, isAuthenticated } from "@/services/authHelpers"
  ```
  After:
  ```typescript
  import { isAdmin, isAuthenticated } from "@/services/authSession"
  ```

**Why this step is critical:**
All six callers must point to `authSession` before `authHelpers.ts` is deleted in Step 3.3. A missed caller surfaces immediately as TS2307 at typecheck time rather than a runtime error.

#### Caller audit — complete list

| File | Old import path | New import path | Function change |
|------|----------------|-----------------|-----------------|
| `Header.tsx` | `@/services/authHelpers` | `@/services/authSession` | `clearAuth` → `clearSession` (import + call site) |
| `DashboardPage.tsx` | `@/services/authHelpers` | `@/services/authSession` | None |
| `LoginPage.tsx` | `@/services/authHelpers` | `@/services/authSession` | None |
| `HomePage.tsx` | `@/services/authHelpers` | `@/services/authSession` | None |
| `ProtectedRoute.tsx` | `@/services/authHelpers` | `@/services/authSession` | None |
| `AdminRoute.tsx` | `@/services/authHelpers` | `@/services/authSession` | None |

**`authService.ts` is NOT a caller of `authHelpers`**: `authService.ts` imports only from `@/lib/api`. It will be updated to call `authSession.saveSession()` in Task 4.

#### Edge Cases

1. **`authHelpers.ts` still exists during Step 3.2**: The old file is kept until Step 3.3. The deprecated `clearAuth` alias in `authSession.ts` keeps the build valid even if this step is split across sessions.
2. **`clearSession` return type**: `clearSession` is `void`. The call `clearSession()` in `handleLogout` does not require a `!` assertion or any special handling.

---

### Step 3.3: Delete `authHelpers.ts` and Remove Deprecated Alias

**Goal:** Delete the old file and remove the temporary `clearAuth` alias from `authSession.ts`. After this step, neither `authHelpers.ts` nor `clearAuth` exists anywhere in the codebase.
**Dependencies:** Step 3.2 complete — all six callers must be updated before deletion.

- [ ] Delete `project/srcs/frontend/src/services/authHelpers.ts`.
- [ ] Remove the deprecated alias from `authSession.ts`: delete the line `export const clearAuth = clearSession` and its JSDoc comment (two lines total).
- [ ] Run `npm run typecheck` from `project/srcs/frontend/` — must pass with **0 errors**. A missed caller update surfaces as TS2307 ("Cannot find module '@/services/authHelpers'"); a stale `clearAuth` reference surfaces as TS2305 ("Module has no exported member 'clearAuth'").
- [ ] Run `npm run test` from `project/srcs/frontend/` — must still pass with **16/16 tests**.

**Why this step is critical:**
Deleting `authHelpers.ts` makes the rename permanent and removes the risk of new code importing from the old path. The typecheck gate is the safety net — it turns any missed update into an immediate, readable compile error.

#### Final state of `authSession.ts` after alias removal

```typescript
import { ROLE_ADMIN, ROLE_EMPLOYEE, type UserRole } from "@/types/auth"

export function saveSession(
  token: string,
  username: string,
  roles: string[]
): void {
  localStorage.setItem("token", token)
  localStorage.setItem("username", username)
  localStorage.setItem("roles", JSON.stringify(roles))
}

export function clearSession(): void {
  localStorage.removeItem("token")
  localStorage.removeItem("username")
  localStorage.removeItem("roles")
}

export function getToken(): string | null {
  return localStorage.getItem("token")
}

export function getUsername(): string | null {
  return localStorage.getItem("username")
}

export function getRoles(): string[] {
  const rawRoles = localStorage.getItem("roles")

  if (!rawRoles) {
    return []
  }

  try {
    const parsed = JSON.parse(rawRoles)

    if (Array.isArray(parsed)) {
      return parsed
    }

    return []
  } catch {
    return []
  }
}

export function hasRole(role: UserRole): boolean {
  return getRoles().includes(role)
}

export function isAuthenticated(): boolean {
  return Boolean(getToken())
}

export function isAdmin(): boolean {
  return hasRole(ROLE_ADMIN)
}

export function isEmployee(): boolean {
  return hasRole(ROLE_EMPLOYEE)
}
```

#### Edge Cases

1. **Deletion before updating a caller**: If a caller was missed in Step 3.2, `npm run typecheck` reports TS2307. Fix by updating the missed import path before proceeding.
2. **Removing alias before updating `Header.tsx`**: If the `clearAuth` alias is removed before `Header.tsx` is updated, TypeScript reports TS2305. Run Step 3.2 fully before this step.

---

### Step 3.4: Complete Deferred Step 2.2 — Wire `setOnUnauthorized` in `main.tsx`

**Goal:** Register the production 401 callback at the composition root, now that `clearSession` is available from `@/services/authSession`. This completes the deferred step from Task 2 and closes the auth foundation for the entire Phase 1 → Phase 3 → Phase 2 chain.
**Dependencies:** Step 3.3 complete — `clearSession` must be the canonical export from `@/services/authSession`.

- [ ] Edit `project/srcs/frontend/src/main.tsx` to add two new imports and the synchronous `setOnUnauthorized` call before `createRoot`.

Final state of `main.tsx`:

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

- [ ] Run `npm run typecheck` from `project/srcs/frontend/` — must pass with **0 errors**.
- [ ] Run `npm run build` from `project/srcs/frontend/` — must succeed.
- [ ] Run `npm run test` from `project/srcs/frontend/` — must still pass with **16/16 tests**.

**Why this step is critical:**
Without Step 3.4, the 401 interceptor uses the fail-safe default (`window.location.href = "/login"`) — which redirects but does NOT clear the stale token, username, or roles from localStorage. After a forced 401 logout, those keys remain. On the next load, `ProtectedRoute` reads the stale `token` via `isAuthenticated()`, sees a non-null value, and passes the user through — inconsistent state. `clearSession()` before the redirect ensures a clean slate on forced logout.

#### Edge Cases

1. **`clearSession` does not exist until Step 3.3**: Do not execute this step before `authSession.ts` is created and `authHelpers.ts` is deleted. `npm run typecheck` will fail with TS2305 if run prematurely.
2. **Startup ordering invariant**: `setOnUnauthorized(...)` is called synchronously at module evaluation time, before `createRoot`. Vite's ESM bundle guarantees this runs before any React component mounts — no HTTP request can fire before the callback is registered.
3. **`window.location.href` is a full reload (intentional)**: An expired or invalid JWT means all in-memory React state is stale. A full reload guarantees a clean slate. `useNavigate` from react-router-dom 6.30.3 can only be called inside a component within `<BrowserRouter>` — it is not available at module scope and would throw if called here.
4. **`.tsx` extension on `ThemeProvider` import**: The existing `main.tsx` includes `import { ThemeProvider } from "@/components/theme-provider.tsx"` with an explicit `.tsx` extension. Preserve this — it is the existing pattern in the file.

---

## Design Decisions

**Decision 1:** `saveSession` is defined in Task 3 but callers are migrated in Task 4.
- **Why:** The function must exist before any caller can import it. Defining it here (Task 3) and migrating callers (`authService.ts`, `LoginPage.tsx`) separately (Task 4) keeps each task independently type-checkable and follows the authoritative phase ordering (`Phase 3 → Phase 2 → Phase 4`). A Task 4 that tries to call `saveSession` before Task 3 exists would fail immediately at typecheck.
- **Alternatives considered:** Define `saveSession` only in Task 4 when callers are migrated — rejected: Task 4 depends on Task 3 being fully complete; adding `saveSession` in Task 4 would require a second edit to `authSession.ts` in a later task, splitting module ownership.

**Decision 2:** `clearAuth` is kept as a deprecated alias from Step 3.1 through Step 3.2, then removed in Step 3.3.
- **Why:** The alias bridges the window between creating `authSession.ts` (Step 3.1) and updating all callers (Step 3.2). If execution is interrupted between steps, the build remains valid. The parent feature mandates "the old name survives as a deprecated alias for one commit only, then removed."
- **Alternatives considered:** Create `authSession.ts` only after updating all callers atomically (no alias needed) — rejected: requires `authHelpers.ts` to remain authoritative until the last caller is updated, which means the TDD-first step would have to test a module that hasn't been created yet via an indirect path.

**Decision 3:** Step 3.4 (deferred Step 2.2) is included in Task 3 rather than left open.
- **Why:** Step 2.2 is blocked exclusively on `clearSession` from `authSession.ts`. Once `authSession.ts` exists, completing Step 2.2 takes three lines of code. Leaving it deferred means the 401 flow remains incomplete (redirects without session clearing) indefinitely — a partial regression. No future task owns `main.tsx` as its primary concern; Task 3 is the natural home for the completion.
- **Alternatives considered:** Leave Step 2.2 as the first step of Task 4 — rejected: Task 4 is scoped to the `features/authentication/` folder and the `LoginPage.tsx` thinning; `main.tsx` wiring belongs to the infrastructure layer, not the feature layer.

**Decision 4:** `getToken()`, `getRoles()`, and `hasRole()` remain exported even though no external caller currently imports them.
- **Why:** These functions are part of the module's current public interface. Removing exports that exist today without confirmed evidence of zero external use is aggressive cleanup. `"noUnusedLocals": true` only flags unused local variables, not exported functions. Future tasks (e.g., `useLoginForm` in Task 4) may read `getToken()` for auth-guard logic.
- **Alternatives considered:** Remove unexported accessors — rejected: premature interface shrinkage with no measurable benefit.

**Decision 5:** Tests are co-located as `authSession.test.ts` next to `authSession.ts`.
- **Why:** Consistent with Task 2's pattern (`api.test.ts` co-located with `api.ts`). Co-location makes the module-test relationship immediately visible in the file tree.
- **Alternatives considered:** `src/__tests__/services/authSession.test.ts` — acceptable; co-location preferred for discoverability.

---

## Testing Considerations

### Automatic Validation

#### TDD Cycle (Step 3.1)

- [ ] After creating `authSession.test.ts` and BEFORE creating `authSession.ts`: run `npm run test` from `project/srcs/frontend/` — must report **1 failing suite** ("Cannot find module './authSession'"). This confirms RED state.
- [ ] After creating `authSession.ts`: run `npm run test` — must report **16 passing tests, 0 failures** (12 new + 4 existing from `api.test.ts`). This confirms GREEN state.

#### Typecheck and Build Gates

- [ ] After Step 3.3 (delete `authHelpers.ts`, remove alias): run `npm run typecheck` — must pass with **0 errors**. Validates: no stale `@/services/authHelpers` imports remain; `clearAuth` is not exported anywhere.
- [ ] After Step 3.3: run `npm run test` — must still pass with **16/16 tests**.
- [ ] After Step 3.4 (`main.tsx` wiring): run `npm run typecheck` — must pass with **0 errors**. Validates: `setOnUnauthorized` and `clearSession` imports resolve correctly.
- [ ] After Step 3.4: run `npm run build` from `project/srcs/frontend/` — must succeed.
- [ ] After Step 3.4: run `npm run test` — must still pass with **16/16 tests**.

### Manual Validation

- [ ] Start the dev server (`npm run dev` from `project/srcs/frontend/`). Navigate to `http://localhost:3000/`. Confirm the homepage renders.
- [ ] Log in with valid credentials. Confirm the redirect to `/dashboard` works and username and role appear in the Header.
- [ ] Click the Logout button. Confirm the redirect to `/login` fires AND that DevTools → Application → Local Storage shows no `token`, `username`, or `roles` keys after logout.
- [ ] Trigger a forced 401 logout: after logging in, open DevTools → Application → Local Storage and corrupt the `token` value (change one character). Navigate to any page that would make a backend call, or simply refresh. Confirm: (a) the app redirects to `/login`, and (b) Local Storage is fully cleared (no stale `token`, `username`, or `roles`). This validates the `main.tsx` `setOnUnauthorized` wiring with `clearSession()`.

---

## Related Code Explanations

- `project/srcs/frontend/src/services/authHelpers.ts:1–51` — the file being superseded; read its current content before Step 3.1 to confirm the baseline matches expectations.
- `project/srcs/frontend/src/components/layout/Header.tsx:4` — the single caller that uses `clearAuth`; updated in Step 3.2.
- `project/srcs/frontend/src/main.tsx` — composition root; receives the deferred `setOnUnauthorized` wiring in Step 3.4.
- `project/srcs/frontend/src/lib/api.ts:8` — `setOnUnauthorized` is exported here; the seam wired in Step 3.4.
- `documentation/Tasks/current/Frontend-SOLID-Refactor-task-2-api-dip.md` — Task 2 document; its deferred Step 2.2 completion criteria is closed by Step 3.4 of this task.

---

## Completion Criteria

- [x] `project/srcs/frontend/src/services/authSession.test.ts` created with 12 unit tests.
- [x] `npm run test` in RED state (1 failing suite — "Cannot find module './authSession'") confirmed — tests written before implementation.
- [x] `project/srcs/frontend/src/services/authSession.ts` created — exports `saveSession`, `clearSession`, deprecated `clearAuth` alias, and all session utility functions from the former `authHelpers.ts`.
- [x] `npm run test` passes with **16/16 tests** (GREEN state after `authSession.ts` is created).
- [x] All six callers updated — import path changed from `@/services/authHelpers` to `@/services/authSession`.
- [x] `Header.tsx` updated — `clearAuth` renamed to `clearSession` in both the import statement and the `handleLogout` call site; stale comment `// Get data from authHelpers` removed.
- [x] `project/srcs/frontend/src/services/authHelpers.ts` deleted.
- [x] Deprecated `clearAuth` alias and its JSDoc comment removed from `authSession.ts`.
- [x] `npm run typecheck` passes with **0 errors** after Step 3.3.
- [x] `npm run test` passes with **16/16 tests** after Step 3.3.
- [x] `project/srcs/frontend/src/main.tsx` updated with `setOnUnauthorized(() => { clearSession(); window.location.href = "/login" })` wiring (deferred Step 2.2 from Task 2 completed).
- [x] `npm run typecheck` passes with **0 errors** after Step 3.4.
- [x] `npm run build` passes after Step 3.4.
- [x] `npm run test` passes with **16/16 tests** after Step 3.4.
- [ ] Manual validation steps documented above remain for the user to perform.
<!-- REVIEW-FIX: Expanded from "checkbox" to "two checkboxes" — Task 2 has two deferred items to mark complete: (1) main.tsx updated with setOnUnauthorized wiring, and (2) npm run typecheck + npm run build pass after Step 2.2. Both become completable once Task 3 finishes Step 3.4. -->
- [x] Task 2 document (`Frontend-SOLID-Refactor-task-2-api-dip.md`) updated: mark both deferred Step 2.2 completion criteria checkboxes as `[x]` — (1) "`main.tsx` updated with `setOnUnauthorized` wiring" and (2) "After Step 2.2: `npm run typecheck` and `npm run build` pass again".
- [x] Parent feature [[Frontend-SOLID-Refactor]] Phase 3 steps (3.1, 3.2) marked `[x]`; Phase 2 Step 2.2 marked `[x]`.
- [x] Task 3 wiki link added to parent document [[Frontend-SOLID-Refactor]] under the Task 3 section (replace `(add when task is created)` with `[[Frontend-SOLID-Refactor-task-3-auth-session]]`).
- [x] Memory Bank updated: prepend a dated `## 2026-06-26` entry to `documentation/Memory/progress.md` summarising what was done, linking to [[Frontend-SOLID-Refactor]] and [[Frontend-SOLID-Refactor-task-3-auth-session]]; update `documentation/Memory/context.md` to reflect Task 3 complete, Task 4 next.
