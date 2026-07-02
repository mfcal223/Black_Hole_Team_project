# Task: Dead Code Removal & Type Extraction

#task #current #low-complexity #parent-frontend-solid-refactor

**Parent:** [[Frontend-SOLID-Refactor]]
**Parent Type:** Feature
**Related Step(s):** Phase 1 — Steps 1.0, 1.1, 1.2, 1.3
**Estimated Complexity:** Low

---

## Goal

Remove all dead commented-out code from seven source files plus `EmptyState.tsx`, extract auth type constants into a dedicated `src/types/auth.ts` module, update callers, and reconcile the Memory Bank's "do not fix yet" double-write guard to a pending forward-reference. No logic changes — this task is a structural pass that leaves every subsequent task operating on a leaner, predictable codebase.

---

## Parent Context

[[Frontend-SOLID-Refactor]] identifies six code-level issues in the AgentForge frontend and plans a six-phase SOLID refactor. Task 1 covers Phase 1 — the lowest-risk entry point:

1. **Dead commented-out code** across seven files (multi-line JSDoc blocks that explain what names already say, inline orphaned comments, an unreachable `console.log`, and a duplicate import).
2. **SRP violation in `authHelpers.ts`**: type constants (`ROLE_ADMIN`, `ROLE_EMPLOYEE`, `UserRole`) are co-located with runtime localStorage utility functions — two reasons to change in one file. Extracting them to `src/types/auth.ts` gives each module one responsibility.

The parent mandates Step 1.0 as the **first action** of this task: the "do not fix yet" annotation in `architecture.md:33` and `known-issues.md:56` must be transitioned to pending forward-references before any code is touched. This feature IS the intentional login-flow redesign those guards were waiting for.

**Phase ordering (authoritative):** `Phase 1 → Phase 3 → Phase 2 → Phase 4 → (Phases 5 and 6 are independent of each other and of the auth sequence)`. This task is Phase 1 — it unlocks the rest of the chain.

---

## Preconditions / Dependencies

- The frontend baseline is in place: `npm run typecheck` = 0 errors, `npm run build` = success (8217 modules, confirmed 2026-06-25).
- No previous tasks from this feature have been executed — Task 1 is the first.
- Memory Bank files exist: `documentation/Memory/architecture.md` and `documentation/Memory/known-issues.md`.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `solid-deep-design` — Selected — SRP analysis of the type/utility co-location; depth and deletion-test evaluation of `src/types/auth.ts`.
- `tdd` — Selected — validation strategy: no new unit tests needed for structural moves; `npm run typecheck` + `npm run build` are the automatic validation gates.
- `documentation-management` — Selected — file creation, directory placement, Obsidian conventions.
- `memory-bank` — Selected — Step 1.0 writes to Memory Bank files.

### Documentation Reviewed

- **TypeScript 5.9.3 `verbatimModuleSyntax`**: `tsconfig.app.json` has `"verbatimModuleSyntax": true`. This requires type-only imports to carry the `type` keyword. The combined form `import { VALUE, type TypeName }` (valid TypeScript ≥ 4.5) is used in Step 1.3. Failure to mark `UserRole` as `type` will cause a compile error under this option.
- No Context7 queries required — this task introduces no framework API calls; all patterns are standard TypeScript module exports.

### Related Existing Code

- `project/srcs/frontend/src/services/authHelpers.ts` — source of the type constants being extracted; contains all the JSDoc blocks being removed.
- `project/srcs/frontend/src/services/authService.ts` — top block comment and inline comment being removed; `logout()` stays (removed in Task 4).
- `project/srcs/frontend/src/pages/LoginPage.tsx` — unreachable `console.log` removed (security issue, `known-issues.md:58`).
- `project/srcs/frontend/src/pages/HomePage.tsx` — duplicate `react-router-dom` import merged.
- `project/srcs/frontend/src/components/common/EmptyState.tsx` — placeholder comment replaced with a no-op stub.
- `documentation/Memory/architecture.md:33` — double-write "do not fix yet" annotation.
- `documentation/Memory/known-issues.md:56` — "Do not fix until the login flow is intentionally redesigned" annotation.

---

## Implementation Details

### Approach

Task 1 is a pure structural pass with two goals:

**Goal A — Dead code removal:** Remove every comment that restates what the code already expresses through its name and types. Remove the unreachable `console.log`. Merge the duplicate import. Replace the `EmptyState.tsx` placeholder comment with a type-checkable no-op stub. For three files (`AdminRoute.tsx`, `MainLayout.tsx`, `utils.ts`) the outcome is a confirmed-clean audit with no edits.

**Goal B — Type extraction (SRP):** `authHelpers.ts` currently has two reasons to change: (1) domain role names change → the constants change; (2) session storage mechanics change → the utility functions change. Separating `ROLE_ADMIN`, `ROLE_EMPLOYEE`, and `UserRole` into `src/types/auth.ts` gives each module exactly one responsibility. `authHelpers.ts` then imports what it needs from the new file.

**SOLID analysis:**
- **SRP**: `src/types/auth.ts` — one responsibility: domain type definitions. `authHelpers.ts` after extraction — one responsibility: localStorage session utilities.
- **Deletion test on `src/types/auth.ts`**: removing it would scatter `ROLE_ADMIN`, `ROLE_EMPLOYEE`, and `UserRole` back into `authHelpers.ts` today and into `authSession.ts`, `useLoginForm.ts`, and future role-checking modules in later tasks. The module earns its place as a stable naming boundary.
- No new seams, adapters, or ports are introduced in Task 1.

**`verbatimModuleSyntax` constraint:** `tsconfig.app.json` has `"verbatimModuleSyntax": true`. The `type` keyword is mandatory for all type-only imports. The combined form `import { ROLE_ADMIN, ROLE_EMPLOYEE, type UserRole }` is used — `ROLE_ADMIN` and `ROLE_EMPLOYEE` are values (no `type`), `UserRole` is a type (requires `type`).

### Files to Create/Modify

- [ ] `documentation/Memory/architecture.md` — update line 33 to forward-reference Task 4 (Step 1.0).
- [ ] `documentation/Memory/known-issues.md` — update line 56 to forward-reference Task 4 (Step 1.0).
- [ ] `project/srcs/frontend/src/services/authHelpers.ts` — remove all 8 JSDoc blocks and the `[ASK_JOSE]` comment; remove the 3 type constant exports; add import from `@/types/auth` (Steps 1.1a + 1.3).
- [ ] `project/srcs/frontend/src/services/authService.ts` — remove top block comment; remove inline comment `/* Saves the token in localStorage*/` (Step 1.1b).
- [ ] `project/srcs/frontend/src/pages/HomePage.tsx` — merge duplicate `react-router-dom` imports into one statement (Step 1.1c).
- [ ] `project/srcs/frontend/src/pages/LoginPage.tsx` — remove unreachable `console.log("Login successful:", data)` (Step 1.1d).
- [ ] `project/srcs/frontend/src/routes/AdminRoute.tsx` — audit only; no changes expected (Step 1.1e).
- [ ] `project/srcs/frontend/src/components/layout/MainLayout.tsx` — audit only; no changes expected (Step 1.1e).
- [ ] `project/srcs/frontend/src/lib/utils.ts` — audit only; no changes expected (Step 1.1e).
- [ ] `project/srcs/frontend/src/components/common/EmptyState.tsx` — replace placeholder comment with no-op stub (Step 1.1f).
- [ ] `project/srcs/frontend/src/types/auth.ts` — **NEW FILE**: export `ROLE_ADMIN`, `ROLE_EMPLOYEE`, `UserRole` (Step 1.2).

---

## Step-by-Step Implementation

### Step 1.0: Memory Bank Reconciliation

**Goal:** Transition the "do not fix yet" double-write guard in both Memory Bank files to a pending forward-reference. This step runs as the first action of the task — before any code is touched.
**Dependencies:** None.

- [ ] In `documentation/Memory/architecture.md`, find line 33. Current text: `"3. Backend responds with JWT; \`LoginPage\` stores token directly in localStorage AND calls \`authService.login()\` (pre-existing double-save — do not fix yet)"`. Edit: replace `— do not fix yet` with `— Double-write fix pending in [[Frontend-SOLID-Refactor]] Task 4, Step 4.1`.
- [ ] In `documentation/Memory/known-issues.md`, find line 56. It begins with `"- **\`LoginPage.tsx\` double-saves the JWT token**"`. Edit: replace the closing sentence `"Do not fix until the login flow is intentionally redesigned."` with `"Fix pending in [[Frontend-SOLID-Refactor]] Task 4, Step 4.1 — this feature IS the intentional login-flow redesign."`.

**Why this step is critical:**
The memory-bank guards were written to prevent premature fixes to the double-write bug. This feature resolves the bug in Task 4; removing the guard now without a forward-reference leaves the memory bank inconsistent. Any agent reading the memory bank in a later session needs to know the fix is in flight, not deferred indefinitely.

#### Edge Cases
1. **Line numbers may differ if the file was edited since this document was written**: Read the file fresh before editing. Locate the guard by content (`"do not fix yet"` and `"Do not fix until the login flow"`) rather than relying on line number alone.

---

### Step 1.1a: `authHelpers.ts` — Remove JSDoc Blocks

**Goal:** Remove all eight multi-line JSDoc comment blocks. The type constants stay until Step 1.2 removes them.
**Dependencies:** Step 1.0 complete.

Remove the `/** ... */` block above each of the following functions:
- [ ] `getToken()`
- [ ] `getUsername()`
- [ ] `getRoles()`
- [ ] `hasRole()`
- [ ] `isAuthenticated()` — the JSDoc block includes the embedded `[ASK_JOSE]` marker; removing the block removes the marker too.
- [ ] `isAdmin()`
- [ ] `isEmployee()`
- [ ] `clearAuth()`

**Why this step is critical:**
Each JSDoc block restates exactly what the function name and TypeScript signature already express. They add length without signal and make the file harder to scan. After removal the file is significantly shorter and every change needed in later tasks (rename, import update) targets real code, not documentation.

#### Implementation

After Step 1.1a, `authHelpers.ts` should look like this. The type constants are still present (they are removed in Step 1.3); the `import` from `@/types/auth` is not yet added (Step 1.3 adds it):

```typescript
export const ROLE_ADMIN = "ROLE_ADMIN"
export const ROLE_EMPLOYEE = "ROLE_EMPLOYEE"
export type UserRole = typeof ROLE_ADMIN | typeof ROLE_EMPLOYEE

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

export function clearAuth(): void {
  localStorage.removeItem("token")
  localStorage.removeItem("username")
  localStorage.removeItem("roles")
}
```

#### Edge Cases
1. **Compile state after this step alone**: Until Steps 1.2 and 1.3 complete, `authHelpers.ts` still exports the type constants under their own names — no compile breakage yet. Steps 1.1a → 1.2 → 1.3 should be completed in sequence within the same editing session.

---

### Step 1.1b: `authService.ts` — Remove Block and Inline Comments

**Goal:** Remove the top-of-file multi-line block comment and the orphaned inline comment inside `login()`. The `logout()` function stays in this task — Task 4 removes it.
**Dependencies:** Step 1.0 complete.

- [ ] Remove the `/** Authentication service... */` multi-line block comment at the top of `authService.ts`.
- [ ] Remove the `/* Saves the token in localStorage*/` inline comment inside `login()`.

**Why this step is critical:**
The top block comment says "Authentication service — responsible for sending login requests..." — the file name `authService.ts` already says this. The inline comment says "Saves the token in localStorage" — the three `localStorage.setItem` calls say this. Both are noise.

#### Implementation

After removal, `authService.ts` should be:

```typescript
import api from "./api"

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

  const data = response.data

  localStorage.setItem("token", data.token)
  localStorage.setItem("username", data.username)
  localStorage.setItem("roles", JSON.stringify(data.roles))

  return data
}

export function logout(): void {
  localStorage.removeItem("token")
  localStorage.removeItem("username")
  localStorage.removeItem("roles")
}
```

#### Edge Cases
1. **`logout()` is dead code with 0 callers**: It stays for now. Task 4 removes it. Removing it here would exceed this task's scope.
2. **`LoginResponse` type**: It stays local to this file for now. Task 4 evaluates whether to move it to `@/types/auth`.

---

### Step 1.1c: `HomePage.tsx` — Merge Duplicate Import

**Goal:** Merge the two separate `react-router-dom` import statements into one.
**Dependencies:** Step 1.0 complete.

- [ ] Replace the two import statements at the top of `HomePage.tsx` with a single merged statement.

**Why this step is critical:**
Two import statements from the same module is a structural smell that ESLint's `no-duplicate-imports` rule catches. The fix is trivial and leaves the file with a canonical single-import-per-module style.

#### Implementation

Current state:
```typescript
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Navigate } from "react-router-dom"
import { isAuthenticated } from "@/services/authHelpers"
```

After merge:
```typescript
import { Link, Navigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { isAuthenticated } from "@/services/authHelpers"
```

#### Edge Cases
1. **Import order**: Third-party imports (`react-router-dom`) come before `@/` aliased imports. The merged import preserves this order.

---

### Step 1.1d: `LoginPage.tsx` — Remove Unreachable `console.log`

**Goal:** Remove the `console.log("Login successful:", data)` line that appears after `window.location.href = "/dashboard"` and is therefore unreachable.
**Dependencies:** Step 1.0 complete.

- [ ] Locate `console.log("Login successful:", data)` inside the `try` block of `handleSubmit`. It appears after `window.location.href = "/dashboard"`.
- [ ] Delete the `console.log("Login successful:", data)` line.

**Why this step is critical:**
`known-issues.md:58` documents this as a security issue: the raw JWT token is passed as the second argument to `console.log`. Even though the page navigation makes the log unreachable in normal flow, browser extensions or XSS payloads could intercept it. The "unreachable" status is itself an argument for removal — it is dead code that carries a security risk.

#### Implementation

Inside `handleSubmit`, the `try` block becomes:

```typescript
    try {
      const data = await login(username, password)

      localStorage.setItem("token", data.token)
      localStorage.setItem("username", data.username)
      localStorage.setItem("roles", JSON.stringify(data.roles))

      window.location.href = "/dashboard"
    } catch (err) {
      setError("Invalid username or password")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
```

#### Edge Cases
1. **The three `localStorage.setItem` calls are the double-write bug**: They are NOT removed here. Task 4 removes them by thinning `LoginPage.tsx` and routing session writes through `authSession.saveSession()`.
2. **`console.error(err)` in the catch block stays**: This is useful debugging output for failed login attempts, not a security risk. Only the success-path `console.log` is removed.

---

### Step 1.1e: Audit `AdminRoute.tsx`, `MainLayout.tsx`, `utils.ts`

**Goal:** Verify that these three files contain no dead commented-out code. Record a confirmed-clean audit for each.
**Dependencies:** Step 1.0 complete.

- [ ] Read `project/srcs/frontend/src/routes/AdminRoute.tsx` — confirm no multi-line block comments, no `/* [REMOVE] */` markers, no commented-out code. The two `<Navigate>` branches and the `return children` are live implementation; no edits needed.
- [ ] Read `project/srcs/frontend/src/components/layout/MainLayout.tsx` — confirm no dead comments. JSX structural `{/* ... */}` comments in sibling files (e.g., `Sidebar.tsx`) are out of scope for Task 1; do not confuse them with MainLayout's content.
- [ ] Read `project/srcs/frontend/src/lib/utils.ts` — confirm no dead comments. The file is a two-line `cn()` utility; confirmed clean.

**Why this step is critical:**
The parent feature lists all three files in the dead code removal scope. A confirmed-clean audit is a completed audit. Skipping it would leave an ambiguous status in the completion checklist.

#### Edge Cases
1. **JSX structural comments in layout files**: `{/* HEADER SECTION */}` or similar inline JSX hints in layout components are NOT dead code — they are structural orientation markers in templates. Leave them if present.

---

### Step 1.1f: `EmptyState.tsx` — Placeholder Comment → No-Op Stub

**Goal:** Replace the single placeholder comment with an exported no-op component stub.
**Dependencies:** Step 1.0 complete.

- [ ] Replace the entire content of `project/srcs/frontend/src/components/common/EmptyState.tsx` with:

```typescript
export function EmptyState() { return null }
```

**Why this step is critical:**
The file currently contains only `// Placeholder component — kept for future use`. A comment-only file exports nothing TypeScript can verify. If any future task imports `EmptyState`, the import would fail silently. The no-op stub: (1) reserves the name with a type-checkable interface, (2) ensures any future import is caught at compile time, and (3) introduces no visible behavior (no file currently imports `EmptyState`). This is the pattern mandated by the parent feature.

#### Edge Cases
1. **Return type**: TypeScript infers `null` as the return type. React 19 (in use here) accepts `null` as a valid component return value without requiring an explicit annotation.
2. **No `React` import needed**: React 19 with the new JSX transform does not require `import React from "react"` for components returning `null`.

---

### Step 1.2: Create `src/types/auth.ts`

**Goal:** Create the dedicated module that owns `ROLE_ADMIN`, `ROLE_EMPLOYEE`, and `UserRole`.
**Dependencies:** Step 1.1a in progress (constants still exist in `authHelpers.ts`); both steps complete in the same editing session.

- [ ] Create the directory `project/srcs/frontend/src/types/` if it does not exist.
- [ ] Create `project/srcs/frontend/src/types/auth.ts` with the following exact content:

```typescript
export const ROLE_ADMIN = "ROLE_ADMIN"
export const ROLE_EMPLOYEE = "ROLE_EMPLOYEE"
export type UserRole = typeof ROLE_ADMIN | typeof ROLE_EMPLOYEE
```

**Why this step is critical:**
This is the SRP fix for `authHelpers.ts`. Type definitions have one reason to change (domain roles expand). Session utilities have a different reason to change (storage mechanism or key names change). Keeping them in the same file violates SRP. `src/types/auth.ts` is the new single home for auth type definitions.

**SOLID analysis:**
`src/types/auth.ts` is intentionally shallow — it has no implementation logic. Shallow modules are appropriate when their value is ownership clarity and a stable naming boundary, not behavior concentration. The deletion test confirms its worth: removing this file would scatter the `UserRole` type and the string constants into `authHelpers.ts` (now) and across `authSession.ts`, `useLoginForm.ts`, and future role-checking modules (after later tasks). The module earns its place.

#### Edge Cases
1. **`UserRole` type inference**: TypeScript infers `const ROLE_ADMIN = "ROLE_ADMIN"` as the string literal type `"ROLE_ADMIN"` (not `string`) because it is a `const` declaration. `UserRole` therefore resolves to `"ROLE_ADMIN" | "ROLE_EMPLOYEE"`. No `as const` assertion is needed.
2. **Directory creation**: `src/types/` does not currently exist. Create it when creating the file — no extra `mkdir` step required when using the Write tool.

---

### Step 1.3: Update `authHelpers.ts` — Remove Constants, Add Import

**Goal:** Complete the type extraction by removing the now-duplicated constant exports from `authHelpers.ts` and adding an import from `@/types/auth`.
**Dependencies:** Step 1.2 complete — `@/types/auth.ts` must exist before adding the import.

- [ ] Remove `export const ROLE_ADMIN = "ROLE_ADMIN"` from `authHelpers.ts`.
- [ ] Remove `export const ROLE_EMPLOYEE = "ROLE_EMPLOYEE"` from `authHelpers.ts`.
- [ ] Remove `export type UserRole = typeof ROLE_ADMIN | typeof ROLE_EMPLOYEE` from `authHelpers.ts`.
- [ ] Add at the top of `authHelpers.ts`: `import { ROLE_ADMIN, ROLE_EMPLOYEE, type UserRole } from "@/types/auth"`

**Why this step is critical:**
After Step 1.2, `ROLE_ADMIN`, `ROLE_EMPLOYEE`, and `UserRole` only exist in `@/types/auth`. `authHelpers.ts` uses `ROLE_ADMIN` in `isAdmin()`, `ROLE_EMPLOYEE` in `isEmployee()`, and `UserRole` as the parameter type of `hasRole()`. Without this import the file will not compile.

**`verbatimModuleSyntax` requirement**: `tsconfig.app.json` has `"verbatimModuleSyntax": true`. The `type` keyword is mandatory for type-only imports. `UserRole` is a type — it must be imported as `type UserRole`. `ROLE_ADMIN` and `ROLE_EMPLOYEE` are runtime values — they must NOT carry `type`. The combined import `import { ROLE_ADMIN, ROLE_EMPLOYEE, type UserRole }` satisfies this requirement.

#### Implementation

Final state of `authHelpers.ts` after Steps 1.1a + 1.2 + 1.3:

```typescript
import { ROLE_ADMIN, ROLE_EMPLOYEE, type UserRole } from "@/types/auth"

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

export function clearAuth(): void {
  localStorage.removeItem("token")
  localStorage.removeItem("username")
  localStorage.removeItem("roles")
}
```

**External callers audit:** No file outside `authHelpers.ts` currently imports `ROLE_ADMIN`, `ROLE_EMPLOYEE`, or `UserRole` from `authHelpers`. The following files import runtime functions only and do NOT need import path changes in Task 1:

| File | Imports from `authHelpers` |
|------|--------------------------|
| `AdminRoute.tsx` | `isAdmin`, `isAuthenticated` |
| `DashboardPage.tsx` | `getUsername`, `isAdmin`, `isEmployee` |
| `Header.tsx` | `getUsername`, `isAdmin`, `isEmployee`, `clearAuth` |
| `LoginPage.tsx` | `isAuthenticated` |
| `ProtectedRoute.tsx` | `isAuthenticated` |

These callers' import statements are unchanged by Task 1.

#### Edge Cases
1. **`noUnusedLocals: true`**: `tsconfig.app.json` has `"noUnusedLocals": true`. If `UserRole` is imported but no function uses it as a parameter type, TypeScript will report an error. After this step, `UserRole` IS used as the parameter type of `hasRole()` — no warning fires.
2. **`ROLE_ADMIN` and `ROLE_EMPLOYEE` are values**: They are imported without `type` and used in `isAdmin()` and `isEmployee()` at runtime — correct.

---

## Design Decisions

**Decision 1:** Extract types to `src/types/auth.ts`, not a barrel `src/types/index.ts`.
- **Why:** A barrel file front-loads a decision about what types will exist. Creating `auth.ts` specifically mirrors the naming pattern of `authHelpers.ts` (and future `authSession.ts`) and keeps scope bounded to authentication. Future type modules (`user.ts`, `agent.ts`) get their own files. No barrel until three or more type modules need a common entry point.
- **Alternatives considered:** (1) Keep types inline in `authHelpers.ts` — rejected: two reasons to change in one file. (2) Re-export the types from `authHelpers.ts` after moving them — rejected: callers would still import from the wrong source of truth.

**Decision 2:** `EmptyState.tsx` gets a no-op stub, not deletion.
- **Why:** Mandated by the parent feature. The stub reserves the name as a type-checkable interface so future imports are verified at compile time. Deleting the file would cause any future import to fail at runtime rather than at type-check time.
- **Alternatives considered:** Add `children?: ReactNode` prop — rejected: no use case exists; the simplest stub that reserves the name is correct.

**Decision 3:** `logout()` in `authService.ts` and the three `localStorage.setItem` calls in `LoginPage.tsx` are NOT removed in Task 1.
- **Why:** The parent assigns `logout()` removal to Task 4 (Step 4.1) and the `LoginPage.tsx` triple-write fix to Task 4 (Step 4.3). Removing them here would exceed scope and create a mid-refactor broken state if Task 4 is delayed.
- **Alternatives considered:** Remove all dead code in one pass — rejected: mixes structural cleanup (Task 1) with API migration and auth-flow logic changes (Tasks 3 and 4).

**Decision 4:** `UserRole` is NOT re-exported from `authHelpers.ts` after moving it to `@/types/auth`.
- **Why:** Re-exporting would keep `authHelpers.ts` as the de-facto entry point for the type, defeating the separation. Future callers who need `UserRole` should import it from `@/types/auth` directly. Since no external callers currently import the type constants from `authHelpers`, there are no backwards-compat concerns.
- **Alternatives considered:** Re-export via `export type { UserRole } from "@/types/auth"` — rejected: defeats the purpose of moving the type.

---

## Testing Considerations

This task introduces no new behavior. The test strategy is compile-time and build-time verification only.

### Automatic Validation

- [ ] Run `npm run typecheck` from `project/srcs/frontend/` — must pass with **0 errors**. This verifies: (a) `src/types/auth.ts` is correctly consumed by `authHelpers.ts`; (b) `verbatimModuleSyntax` constraint satisfied (`type UserRole` import); (c) `EmptyState.tsx` exports a valid React component; (d) `noUnusedLocals` does not fire; (e) no import paths are broken across all files.
- [ ] Run `npm run build` from `project/srcs/frontend/` — must succeed (Vite + TypeScript full build). This is the end-to-end gate.

### Manual Validation

- [ ] Start the dev server (`npm run dev` from `project/srcs/frontend/`). Navigate to `http://localhost:3000/` — confirm the homepage renders.
- [ ] Log in with valid credentials. Confirm the redirect to `/dashboard` works and the username and role appear in the header.
- [ ] After login, open browser DevTools → Console — confirm **no** `"Login successful:"` log message appears (the `console.log` removal).
- [ ] Press `D` on the keyboard — confirm the light/dark theme toggle still works.

---

## Related Code Explanations

- `project/srcs/frontend/src/services/authHelpers.ts:1` — top of file, where the 3 type constants live before extraction.
- `project/srcs/frontend/src/pages/LoginPage.tsx:44` — approximate location of `console.log("Login successful:", data)` inside `handleSubmit` (after `window.location.href = "/dashboard"`).
- `documentation/Memory/architecture.md:33` — auth flow step 3, line containing "do not fix yet".
- `documentation/Memory/known-issues.md:56` — double-write guard line containing "Do not fix until the login flow is intentionally redesigned".

---

## Post-Review Notes

Three deviations from the Task document's assumed file state were discovered during execution. All were resolved in-scope by removing the dead code (aligning with Goal A: "Remove all dead commented-out code from seven source files").

1. **`AdminRoute.tsx` — dead `[REMOVE]` block present (Step 1.1e):** The task said "audit only; no changes expected" and "confirm no multi-line block comments, no `[REMOVE]` markers." The actual file contained a 32-line `/* [REMOVE] working version 16/06/26 */` block at lines 33-64. Removed — the audit was not a clean pass. The file is now 31 lines (down from 65).

2. **`MainLayout.tsx` — dead "Version without Outlet" block present (Step 1.1e):** The task said "confirm no dead comments." The actual file contained a 31-line `/* Version without Outlet */` block at lines 27-57 (a children-based variant of the component). Removed — the audit was not a clean pass. The file is now 25 lines (down from 57).

3. **`HomePage.tsx` — dead commented-out import block (Step 1.1c):** The task only specified merging the duplicate `react-router-dom` imports. The file also contained a 22-line commented-out import block (lines 29-50) — a previous version of the component using `MainLayout` children. Removed as dead code. The file is now 25 lines (down from 50).

All three deviations are harmless scope extensions within Goal A. `npm run typecheck` and `npm run build` confirm no breakage from any removal.

---

## Completion Criteria

- [x] `documentation/Memory/architecture.md:33` updated — "do not fix yet" replaced with pending forward-reference to [[Frontend-SOLID-Refactor]] Task 4.
- [x] `documentation/Memory/known-issues.md:56` updated — "Do not fix until..." replaced with pending forward-reference to [[Frontend-SOLID-Refactor]] Task 4.
- [x] All 8 JSDoc block comments removed from `authHelpers.ts`.
- [x] `[ASK_JOSE]` marker removed from `authHelpers.ts` (part of the `isAuthenticated` JSDoc block).
- [x] Top block comment removed from `authService.ts`.
- [x] Inline comment `/* Saves the token in localStorage*/` removed from `authService.ts`.
- [x] Duplicate `react-router-dom` import merged in `HomePage.tsx`.
- [x] `console.log("Login successful:", data)` removed from `LoginPage.tsx`.
- [x] `AdminRoute.tsx` audited and cleaned — removed dead `[REMOVE]` commented-out code block (was not clean as the task assumed — deviation: actual dead code found and removed).
- [x] `MainLayout.tsx` audited and cleaned — removed dead "Version without Outlet" commented-out code block (was not clean as the task assumed — deviation: actual dead code found and removed).
- [x] `utils.ts` audited — confirmed no dead commented-out code.
- [x] `EmptyState.tsx` replaced with `export function EmptyState() { return null }`.
- [x] `src/types/auth.ts` created — exports `ROLE_ADMIN`, `ROLE_EMPLOYEE`, `UserRole`.
- [x] `authHelpers.ts` updated — type constant exports removed; `import { ROLE_ADMIN, ROLE_EMPLOYEE, type UserRole } from "@/types/auth"` added at top.
- [x] `npm run typecheck` passes with 0 errors.
- [x] `npm run build` passes.
- [ ] Manual validation steps completed by the user.
- [x] Parent feature [[Frontend-SOLID-Refactor]] Phase 1 steps (1.0, 1.1, 1.2, 1.3) marked `[x]`.
- [x] Task 1 wiki link updated in parent document [[Frontend-SOLID-Refactor]]: find the `Task Document Link: (add when task is created)` placeholder under the Task 1 section and replace it with `[[Frontend-SOLID-Refactor-task-1-dead-code-and-types]]`.
- [x] Memory Bank updated: prepend a dated entry to `documentation/Memory/progress.md` (format `## YYYY-MM-DD`) summarising what was done, linking to [[Frontend-SOLID-Refactor]] and [[Frontend-SOLID-Refactor-task-1-dead-code-and-types]]; update `documentation/Memory/context.md` to reflect that Task 1 is complete and Task 3 is next.
