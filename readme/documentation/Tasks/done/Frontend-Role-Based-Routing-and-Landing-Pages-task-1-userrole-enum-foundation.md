# Task: UserRole Enum Foundation — Types, Session Service, and Tests

#task #current #medium-complexity #parent-frontend-role-based-routing-and-landing-pages

**Parent:** [[Frontend-Role-Based-Routing-and-Landing-Pages]]
**Parent Type:** Feature
**Related Step(s):** Phase 1 — Steps 1.1, 1.2, 1.3, 1.4
**Estimated Complexity:** Medium

---

## Goal

Establish the type-safe role identity foundation that every subsequent task in this feature depends on: replace the raw string constants in `src/types/auth.ts` with a `const`+`type` `UserRole` declaration, extend `authSession.ts` with a validated `getRoles(): UserRole[]` return type and a new `hasAnyRole(roles: UserRole[]): boolean` helper, verify both with TDD, and delete the dead `AdminRoute.tsx` placeholder.

---

## Parent Context

The parent feature (`Frontend-Role-Based-Routing-and-Landing-Pages`) introduces role-based routing and component-level gating. Every module in the feature — `RoleGuard`, `RoleGate`, the Sidebar filter, and the login redirect — depends on a shared, type-safe `UserRole` identity and a single role-checking function (`hasAnyRole`) that lives in `authSession`. Task 1 is the foundational layer; Tasks 2, 3, and 4 all depend on it being complete.

### What the parent says about this task

**Steps covered:** 1.1 (rewrite `types/auth.ts`), 1.2 (update `authSession.ts`), 1.3 (TDD `authSession.test.ts`), 1.4 (delete `AdminRoute.tsx`).

**Architectural intent:**
- `UserRole` becomes the single source of truth for role identity. Its string values (`"ROLE_ADMIN"`, `"ROLE_EMPLOYEE"`) are identical to the previous constants, so existing localStorage data and backend JWT arrays remain fully compatible — no migration needed.
- `getRoles()` is retyped to return `UserRole[]` by validating the raw `string[]` from localStorage through an `isUserRole` type guard at the read boundary. The `as UserRole` cast is confined to this single validation point; every caller receives typed `UserRole[]` with no additional casts.
- Unmodeled role strings (e.g., a future backend role not yet in the enum) are silently dropped at this boundary — intentional, documented drop-unknown semantics. The frontend only grants permissions for roles it explicitly models.
- `saveSession(roles: string[])` remains the untrusted write seam — do NOT widen it to `UserRole[]`. The backend sends raw strings; `saveSession` is not the validation point.
- `hasAnyRole(roles: UserRole[]): boolean` is the shared checking function for `RoleGuard`, `RoleGate`, and `Sidebar`. It builds on `hasRole`, which in turn reads from the now-typed `getRoles()`.
- `AdminRoute.tsx` has no callers (never registered in `router.tsx` — confirmed by import-graph grep). It is safe to delete. `RoleGuard` (Task 2) is its generalized replacement.

**Risk documented in parent:** Task 1 is purely foundational with low risk. There is no breaking change to the existing 36 tests — the enum values are the same strings, `saveSession` signature is unchanged, and the new `isUserRole` guard is transparent to callers that already passed valid role strings.

---

## Preconditions / Dependencies

- The Frontend SOLID Refactor feature is fully complete: 36 tests across 7 suites, 0 typecheck errors, successful build. All relevant frontend files are in their post-refactor state.
- `src/types/auth.ts` currently exports `ROLE_ADMIN`, `ROLE_EMPLOYEE` constants and the `UserRole` union type.
- `src/services/authSession.ts` currently imports those constants and returns `string[]` from `getRoles()`.
- `src/routes/AdminRoute.tsx` exists but has no import in any other file (verified by grep — `router.tsx` does not import it).
- No other source file imports `ROLE_ADMIN` or `ROLE_EMPLOYEE` directly — only `authSession.ts` does. All other files go through `isAdmin()`/`isEmployee()` from `authSession`.
- `vitest.config.ts` already maps `@/` → `./src` — no config changes needed.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `solid-deep-design` — **Selected** — Applied to the design of `isUserRole` as a deep validation boundary and `hasAnyRole` as a shared concentrated module.
- `tdd` — **Selected** — Governs the TDD cycle for Step 1.3 (`hasAnyRole` tests written before implementation).
- `documentation-management` — **Selected** — Governs task document creation and location.
- `memory-bank` — **Selected** — Project context loaded; confirmed current codebase state.
- `glossary-management` — **Selected** — Consulted for "UserRole", "Admin", "Employee" domain terms.
- `find-docs` — **Not needed** — This task is pure TypeScript with no new library features. All patterns (type guards, `as const` objects, union type aliases) are standard TypeScript already used in the project.

### Documentation Reviewed

- TypeScript 5.9.3 `tsconfig.app.json` — `"erasableSyntaxOnly": true` **disallows regular `enum` declarations** because they generate runtime JavaScript (an IIFE/object assignment), which is not "erasable syntax". This is a TypeScript 5.5+ feature used by this project in bundler mode. The feature document specifies `export enum UserRole { ... }` — this will **fail compilation** with `error TS1205: Re-declaration of TypeScript-only identifier`. The correct pattern is `const` object + `type` alias (see Design Decision 1).
- TypeScript 5.9.3 `as const` and declaration merging — The `const`+`type` companion pattern (`export const X = {...} as const; export type X = ...`) is legal TypeScript declaration merging. The same name can be both a value export and a type export within the same module.
- TypeScript 5.9.3 `verbatimModuleSyntax: true` — Requires that imports used only as types use `import type`. Since `authSession.ts` imports `UserRole` both as a type (parameter annotations) and as a value (`UserRole.ADMIN`, `UserRole.EMPLOYEE`, `Object.values(UserRole)`), the import must be a regular (non-`type`) import.

### Related Existing Code

- `src/types/auth.ts` — File being rewritten (Step 1.1)
- `src/services/authSession.ts` — File being updated (Step 1.2)
- `src/services/authSession.test.ts` — Test file being extended (Step 1.3)
- `src/routes/AdminRoute.tsx` — File being deleted (Step 1.4)
- `src/features/authentication/hooks/useLoginForm.ts` — Uses `navigate("/dashboard")` unconditionally; this is updated in Task 3, NOT here. Do not touch this file in Task 1.
- `src/router.tsx` — Does NOT import `AdminRoute` — confirms deletion is safe.

---

## Implementation Details

### Approach

**SOLID analysis:**

- **SRP**: `types/auth.ts` has a single responsibility: declaring role identity. After the change, it still only does that — the two constants are merged into one structured declaration with the same string values. `authSession.ts` concentrates all session-state logic including the new role-checking helpers.
- **Depth**: `getRoles()` becomes a deep module: a large body of behavior (JSON parse, array validation, per-element type-guard filtering, fallback to empty array on any error) sits behind a small interface (`(): UserRole[]`). Deletion test: delete `isUserRole` and the validation logic scatters across every caller. The module earns its keep.
- **Locality**: The `as UserRole` cast is confined to `isUserRole` only — the single validation boundary. No cast appears at comparison sites (`hasRole`, `hasAnyRole`, any future guard).
- **ISP**: `hasAnyRole(roles: UserRole[]): boolean` is a minimal addition to `authSession`'s interface. It extends (does not modify) the existing surface.

**`erasableSyntaxOnly` constraint (critical deviation from feature doc):**

The project uses `"erasableSyntaxOnly": true` in `tsconfig.app.json`. This flag, introduced in TypeScript 5.5, disallows syntax that generates runtime JavaScript output — including regular `enum` declarations. The feature document specifies `export enum UserRole { ADMIN = "ROLE_ADMIN", EMPLOYEE = "ROLE_EMPLOYEE" }`, which will produce a TypeScript error with this flag.

The correct replacement is the `const` + `type` companion pattern:

```typescript
export const UserRole = {
  ADMIN: "ROLE_ADMIN",
  EMPLOYEE: "ROLE_EMPLOYEE",
} as const

export type UserRole = (typeof UserRole)[keyof typeof UserRole]
```

This is semantically equivalent to the feature doc's intent:
- `UserRole.ADMIN === "ROLE_ADMIN"` (value access — same as enum member) ✓
- `const role: UserRole` infers `"ROLE_ADMIN" | "ROLE_EMPLOYEE"` (type usage — same as enum type) ✓
- `Object.values(UserRole)` returns `("ROLE_ADMIN" | "ROLE_EMPLOYEE")[]` (needed by `isUserRole`) ✓
- Fully erasable — the `const` declaration is JavaScript; `as const` and the `type` alias are erased ✓
- `tsconfig` strict mode and `verbatimModuleSyntax` are satisfied ✓

**`hasRole` with no cast:**

After `getRoles()` returns `UserRole[]` (= `("ROLE_ADMIN" | "ROLE_EMPLOYEE")[]`), `hasRole(role: UserRole)` compiles as `getRoles().includes(role)` with no cast — both sides are `UserRole`. The feature doc's "do NOT use `role as string`" requirement is satisfied.

**Drop-unknown semantics (intentional):**

`isUserRole(value: string)` uses `Object.values(UserRole).includes(value as UserRole)`. Role strings from localStorage that do not match any `UserRole` value (e.g., a future backend role `"ROLE_MANAGER"` not yet in the const) are dropped by `getRoles()`. This is intentional: the frontend only grants permissions for roles it explicitly models. Unknown roles do not produce errors — they are silently ignored.

### Files to Create/Modify

- [x] `src/types/auth.ts` — **Rewrite** — Replace string constants and union type with `const`+`type` `UserRole` declaration
- [x] `src/services/authSession.ts` — **Update** — Add `isUserRole` guard, update `getRoles()` return type, update import, add `hasAnyRole`, update `isAdmin`/`isEmployee` to use `UserRole.ADMIN`/`UserRole.EMPLOYEE`
- [x] `src/services/authSession.test.ts` — **Extend** — Add `UserRole` import and 4 new `hasAnyRole` tests
- [x] `src/routes/AdminRoute.tsx` — **Delete** — No callers; replaced by `RoleGuard` in Task 2

---

## Step-by-Step Implementation

### Step 1.1: Rewrite `src/types/auth.ts`

**Goal:** Replace the three exported declarations (two constants + one union type) with a single `const`+`type` `UserRole` declaration that provides value access (`UserRole.ADMIN`) and type safety (`const x: UserRole`), and compiles under `erasableSyntaxOnly: true`.

**Dependencies:** None — foundational.

- [x] Open `src/types/auth.ts`
- [x] Replace the entire file content with the `const`+`type` companion pattern shown below
<!-- REVIEW-FIX: Removed incorrect typecheck instruction. After Step 1.1 alone, authSession.ts still imports ROLE_ADMIN/ROLE_EMPLOYEE which no longer exist, so typecheck WILL report errors (TS2305) until Step 1.2 is complete. Typecheck gate moved to Step 1.2. -->
- [ ] **Do not run `npm run typecheck` yet** — `authSession.ts` still imports the old `ROLE_ADMIN`/`ROLE_EMPLOYEE` names (TypeScript will report `TS2305` errors until Step 1.2 updates those imports). Proceed directly to Step 1.2.

**Why this step is critical:**

Every subsequent step — including the authSession update, `RoleGuard`, `RoleGate`, Sidebar, and router — imports `UserRole`. This must be correct before any other file is touched.

#### Implementation

```typescript
// src/types/auth.ts

export const UserRole = {
  ADMIN: "ROLE_ADMIN",
  EMPLOYEE: "ROLE_EMPLOYEE",
} as const

export type UserRole = (typeof UserRole)[keyof typeof UserRole]
```

**Complete replacement** — delete the three old lines, write these five lines.

Why `as const`:
- Makes all object values `readonly` and narrows their types to the literal string values (not `string`).
- `typeof UserRole` becomes `{ readonly ADMIN: "ROLE_ADMIN"; readonly EMPLOYEE: "ROLE_EMPLOYEE" }`.

Why the type alias uses `(typeof UserRole)[keyof typeof UserRole]`:
- `keyof typeof UserRole` = `"ADMIN" | "EMPLOYEE"` (the object keys)
- `(typeof UserRole)["ADMIN" | "EMPLOYEE"]` = `"ROLE_ADMIN" | "ROLE_EMPLOYEE"` (the literal value types)
- So `UserRole` as a type = `"ROLE_ADMIN" | "ROLE_EMPLOYEE"` — identical to the old union type

Why the same name `UserRole` for both the const and the type:
- TypeScript declaration merging allows a value and a type to share the same name in the same module.
- Importers use `import { UserRole } from "@/types/auth"` to get both the value (`UserRole.ADMIN`) and the type (`const x: UserRole`) in a single import.

#### Edge Cases

1. **Existing imports of `ROLE_ADMIN`/`ROLE_EMPLOYEE` constants** — Only `authSession.ts` imports them. After this step, TypeScript will report an error in `authSession.ts` for the stale import. Step 1.2 fixes it immediately.
2. **`verbatimModuleSyntax`** — Since `UserRole` is used both as a value (object) and a type in callers, callers use `import { UserRole }` (non-type import). This satisfies `verbatimModuleSyntax: true`. No `import type` workaround needed.
3. **`noUnusedLocals`** — The type alias `export type UserRole` is exported, so TypeScript does not flag it as unused even if no file uses it as a type locally. ✓

---

### Step 1.2: Update `src/services/authSession.ts`

**Goal:** Migrate the import from old string constants to `UserRole`, add the `isUserRole` type guard, update `getRoles()` to return `UserRole[]` (validated), add `hasAnyRole(roles: UserRole[]): boolean`, and update `isAdmin()`/`isEmployee()` to reference `UserRole.ADMIN`/`UserRole.EMPLOYEE`.

**Dependencies:** Step 1.1 must be complete (new `UserRole` export must exist).

- [x] Update the import line at the top of `authSession.ts`
- [x] Add `isUserRole` private type guard (not exported)
- [x] Update `getRoles()` to return `UserRole[]` using `isUserRole` filter
- [x] Update `hasRole(role: UserRole): boolean` — body is unchanged; return type compiles without cast
- [x] Update `isAdmin()` to call `hasRole(UserRole.ADMIN)`
- [x] Update `isEmployee()` to call `hasRole(UserRole.EMPLOYEE)`
- [x] Add `hasAnyRole(roles: UserRole[]): boolean` after `hasRole`
- [x] Confirm `npm run typecheck` shows 0 errors

**Why this step is critical:**

`authSession.ts` is the single session-state module. All role-checking logic (`RoleGuard`, `RoleGate`, `Sidebar`, `useLoginForm`) depends on `hasAnyRole` and the typed `getRoles()`. The `isUserRole` guard is the only place in the codebase where an `as UserRole` cast appears — all other role comparisons operate on validated `UserRole[]`.

#### Implementation

```typescript
// src/services/authSession.ts — full updated file

import { UserRole } from "@/types/auth"

// Private — validates that a raw value from localStorage is a modeled UserRole.
// Accepts `unknown` so `parsed.filter(isUserRole)` is semantically precise:
// elements of `any[]` are treated as unknown, and the typeof guard makes
// the `as UserRole` cast safe. Unmodeled strings are dropped; non-strings return false.
// <!-- REVIEW-FIX: Changed (value: string) to (value: unknown) with typeof guard.
//      parsed.filter(isUserRole) passes any[] elements; using string was semantically
//      imprecise (relying on any bypass). unknown + typeof guard is correct and explicit. -->
function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && Object.values(UserRole).includes(value as UserRole)
}

export function saveSession(
  token: string,
  username: string,
  roles: string[]     // stays string[] — untrusted write seam from the backend
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
  return getRoles().includes(role)   // no cast — both sides are UserRole
}

export function hasAnyRole(roles: UserRole[]): boolean {
  return roles.some((role) => hasRole(role))
}

export function isAuthenticated(): boolean {
  return Boolean(getToken())
}

export function isAdmin(): boolean {
  return hasRole(UserRole.ADMIN)     // was hasRole(ROLE_ADMIN)
}

export function isEmployee(): boolean {
  return hasRole(UserRole.EMPLOYEE)  // was hasRole(ROLE_EMPLOYEE)
}
```

**Import change:** `import { ROLE_ADMIN, ROLE_EMPLOYEE, type UserRole }` → `import { UserRole }` (no `type` qualifier — `UserRole` is used as both value and type in this file, so `verbatimModuleSyntax` requires a value import, not `import type`).

**`isUserRole` internals:** Accepts `unknown` so `parsed.filter(isUserRole)` is semantically precise — elements from the `any[]` result of `JSON.parse` are treated as `unknown`. The `typeof value === "string"` guard narrows to `string`, then `value as UserRole` casts to `"ROLE_ADMIN" | "ROLE_EMPLOYEE"` for the `.includes()` call. `Object.values(UserRole)` returns `("ROLE_ADMIN" | "ROLE_EMPLOYEE")[]` with `as const`. The `as UserRole` cast is the single contained escape point at the validation boundary; all callers above `getRoles()` receive typed `UserRole[]` with no casts.

**`getRoles()` change:** Return type changes from `string[]` to `UserRole[]`. Body adds `.filter(isUserRole)` to validate each element. The `JSON.parse` and `Array.isArray` guards remain identical.

**`hasRole()` change:** Body is unchanged (`getRoles().includes(role)`). Now compiles without any cast because both `getRoles()` (`UserRole[]`) and `role` (`UserRole`) are the same type.

**`hasAnyRole()` design:** Delegates to `hasRole` per role in the input array. `[].some(...)` returns `false` — the empty array edge case is handled by JS semantics, not by explicit guard.

#### Edge Cases

1. **`Object.values(UserRole)` return type** — With `as const`, TypeScript infers `("ROLE_ADMIN" | "ROLE_EMPLOYEE")[]`. The `typeof value === "string"` guard narrows `value` from `unknown` to `string`, then `value as UserRole` casts to `"ROLE_ADMIN" | "ROLE_EMPLOYEE"` as required by `.includes()`. The cast is safe because the runtime `Object.values` check immediately follows.
2. **Future roles not in `UserRole`** — Dropped by `isUserRole`. A backend that sends `["ROLE_ADMIN", "ROLE_MANAGER"]` will result in `getRoles()` returning `[UserRole.ADMIN]` — "ROLE_MANAGER" is silently ignored.
3. **`localStorage` corruption** — Non-array JSON (e.g., `"ROLE_ADMIN"` string, `null`, `42`) falls through the `Array.isArray` guard → returns `[]`. Malformed JSON falls through the `catch` → returns `[]`. Safe.
4. **`hasAnyRole([])` (empty roles array)** — `[].some(...)` is vacuously `false`. No session state is read. ✓
5. **`noUnusedLocals` on `isUserRole`** — It IS used (by `getRoles()`), so TypeScript does not flag it.
6. **`noUnusedParameters` on `hasAnyRole`** — The `roles` parameter is used in `.some(...)`, not unused. ✓

---

### Step 1.3: TDD — Extend `src/services/authSession.test.ts`

**Goal:** Add 4 tests for `hasAnyRole` (one per behavior: matching role, one of multiple, none match, empty array). Confirm the 36 existing tests still pass plus the 4 new tests. This step uses TDD: write the tests while `hasAnyRole` does not yet exist in your test runner view (it exists from Step 1.2 — but the TDD discipline is to write the test assertions against the specified behavior, verify they reflect the right observable behavior, and run).

**Dependencies:** Step 1.2 must be complete (`hasAnyRole` and `getRoles(): UserRole[]` must be exported).

- [x] Add `import { UserRole } from "@/types/auth"` to the test file
- [x] Add `hasAnyRole` to the existing import from `"./authSession"`
- [x] Add the `describe("hasAnyRole", ...)` block shown below
- [x] Run `npm run test` — confirm 40 tests pass (36 existing + 4 new), 0 failures

**Why this step is critical:**

`hasAnyRole` is consumed by `RoleGuard`, `RoleGate`, and `Sidebar` in Tasks 2 and 4. Tests here verify the behavioral contract those modules depend on: the function correctly reads validated `UserRole[]` from localStorage and checks membership. A test failure here catches regressions before they propagate to the guard layer.

#### Implementation

**Updated import block (add two lines):**

```typescript
import { describe, it, expect, beforeEach } from "vitest"
import { UserRole } from "@/types/auth"                   // ADD this line
import {
  saveSession,
  clearSession,
  isAuthenticated,
  isAdmin,
  isEmployee,
  hasAnyRole,                                             // ADD to this import
} from "./authSession"
```

**New test block (add after the `isEmployee` describe block):**

```typescript
describe("hasAnyRole", () => {
  it("returns true when user has the matching role", () => {
    saveSession("tok", "alice", ["ROLE_ADMIN"])
    expect(hasAnyRole([UserRole.ADMIN])).toBe(true)
  })

  it("returns true when user has one of multiple allowed roles", () => {
    saveSession("tok", "emp", ["ROLE_EMPLOYEE"])
    expect(hasAnyRole([UserRole.ADMIN, UserRole.EMPLOYEE])).toBe(true)
  })

  it("returns false when user has none of the allowed roles", () => {
    saveSession("tok", "emp", ["ROLE_EMPLOYEE"])
    expect(hasAnyRole([UserRole.ADMIN])).toBe(false)
  })

  it("returns false when roles array is empty", () => {
    saveSession("tok", "alice", ["ROLE_ADMIN"])
    expect(hasAnyRole([])).toBe(false)
  })
})
```

**Why `beforeEach(() => { localStorage.clear() })` is already correct:**

The existing `beforeEach` at the top of the outer `describe("authSession", ...)` block clears localStorage before every test, including the new `hasAnyRole` tests. No additional `beforeEach` is needed in the inner `hasAnyRole` describe block. The `isUserRole` guard ensures that leftover role strings from other tests would survive the boundary (they are valid role strings), so explicit clearing is the required safeguard — and it is already in place.

**Why existing tests need no changes:**

The existing tests (`isAdmin`, `isEmployee`, etc.) use `saveSession("tok", ..., ["ROLE_ADMIN"])` — raw strings. `saveSession` still accepts `string[]`, so these calls are unchanged. The `isAdmin()` function now internally reads via `getRoles(): UserRole[]` instead of `string[]`, but the observable behavior (returns `true`/`false`) is identical. The test assertions (`expect(isAdmin()).toBe(true)`) continue to pass without modification.

**`import { UserRole }` vs `import type { UserRole }` in the test:**

In the test file, `UserRole` is used as a VALUE (`UserRole.ADMIN`, `UserRole.EMPLOYEE`) — not just as a type annotation. Therefore, the import must be a non-`type` import. With `verbatimModuleSyntax: true`, using `import type { UserRole }` and then referencing `UserRole.ADMIN` as a value would be a compile error.

#### Edge Cases

1. **Test ordering independence** — The `beforeEach(() => { localStorage.clear() })` in the outer block ensures each `hasAnyRole` test starts with empty localStorage, preventing role bleed between tests. This is the established pattern in the existing test file.
2. **Implicit `isUserRole` coverage** — Test 1 (`hasAnyRole([UserRole.ADMIN])` when session has `["ROLE_ADMIN"]` → true) implicitly verifies that `getRoles()` correctly validates and returns `UserRole.ADMIN` (not drops it). If `isUserRole` were broken, this test would fail.
3. **Vitest `@/` alias** — `import { UserRole } from "@/types/auth"` is resolved via the alias in `vitest.config.ts`. No additional config needed.
4. **Empty-session case (no localStorage roles at all)** — The parent doc specifies 4 tests; an "empty session" test is not among them. The case is transitively covered: `beforeEach` clears localStorage, so any `hasAnyRole([...])` call without a prior `saveSession` reads `getRoles()` → `[]` → returns `false`. This behavior is the same as test 3 (none of the allowed roles match) — the distinction is only in how many roles `getRoles()` returns. No 5th test is added; the behavior is sound without it. <!-- REVIEW-FIX: Added note clarifying empty-session coverage gap vs parent spec; no 5th test added to stay faithful to parent doc's specified test count. -->

---

### Step 1.4: Delete `src/routes/AdminRoute.tsx`

**Goal:** Remove the dead placeholder file that has no callers and will be replaced by the generalized `RoleGuard` in Task 2.

**Dependencies:** Steps 1.1–1.3 complete (so typecheck is clean before deletion).

- [x] Confirm no callers: run `grep -rn "AdminRoute" src/` from the frontend root — expect 0 results (excluding the file itself)
- [x] Delete `src/routes/AdminRoute.tsx`
- [x] Run `npm run typecheck` — expect 0 errors
- [x] Run `npm run test` — expect 40 tests passing, 0 failures

**Why this step is critical:**

Keeping dead files increases cognitive load and creates confusion about which guard mechanism is canonical. `AdminRoute.tsx` was never wired into `router.tsx` — its presence suggests a future intention, but `RoleGuard` (Task 2) is the correct generalization. Deleting it now prevents future developers from accidentally using it.

#### Implementation

```bash
# From project/srcs/frontend/
grep -rn "AdminRoute" src/
# Expected output: only src/routes/AdminRoute.tsx itself — zero external references
```

Then delete the file using the file tools or terminal.

#### Edge Cases

1. **Grep returns unexpected import** — If any file unexpectedly imports `AdminRoute`, stop and investigate before deleting. Do not delete until grep shows zero external references.
2. **TypeScript `noUnusedLocals`** — `AdminRoute.tsx` is a module, not a local variable. TypeScript's `noUnusedLocals` does not flag unused module files — only unused local variables within a file. So TypeScript would not have warned about this file being dead even without this step.
3. **`router.tsx` unchanged** — This step deletes only `AdminRoute.tsx`. No changes to `router.tsx` are part of Task 1.

---

## Design Decisions

**Decision 1: `const`+`type` companion pattern instead of `enum`**
- **Why:** `tsconfig.app.json` sets `"erasableSyntaxOnly": true`, which disallows regular TypeScript `enum` declarations because they generate runtime JavaScript (an object assignment IIFE). The feature document specifies `export enum UserRole { ... }`, but this would produce a compile-time error (`TS1205: Re-declaration of TypeScript-only identifier` or a similar erasable syntax error) with this flag active. The `const`+`type` companion pattern produces identical runtime behavior (`UserRole.ADMIN === "ROLE_ADMIN"`, `UserRole.EMPLOYEE === "ROLE_EMPLOYEE"`), satisfies the same type safety goals, and is fully erasable syntax. This is the modern TypeScript + bundler-mode idiomatic pattern.
- **Alternatives considered:** (a) `const enum` — also disallowed by `erasableSyntaxOnly`, and introduces additional issues with isolated transpilation. (b) Keep the raw string constants but export them under a namespace object — functionally equivalent to the `const`+`type` approach but more verbose and inconsistent with how TypeScript declaration merging is typically used. (c) Disable `erasableSyntaxOnly` for this file — rejected because changing a project-wide strictness rule for one module violates the single-rule principle and breaks the intent of the flag.

**Decision 2: `isUserRole` is private (not exported)**
- **Why:** `isUserRole` is an implementation detail of `getRoles()`. No external caller needs to validate a role string directly — they either receive `UserRole[]` from `getRoles()` (already validated) or pass `UserRole` values (already typed). Exporting it would widen `authSession`'s interface unnecessarily (ISP violation).
- **Alternatives considered:** Export `isUserRole` for use in tests. Rejected — the `hasAnyRole` tests exercise `isUserRole` indirectly via `getRoles()`, which is the correct test surface (behavior, not implementation). Direct `isUserRole` tests would be implementation-coupled.

**Decision 3: `saveSession(roles: string[])` is NOT widened to `UserRole[]`**
- **Why:** `saveSession` is the untrusted write seam. `authService.login()` receives a raw backend response (`{ token: string, username: string, roles: string[] }`) and passes the roles directly to `saveSession`. Widening to `UserRole[]` would push the validation responsibility onto every write caller — scattering the `isUserRole` logic. Keeping `saveSession` as `string[]` preserves the seam's nature: accept anything from the backend, validate on read.
- **Alternatives considered:** Validate in `saveSession` (call `isUserRole` per element before writing). Rejected — validation at write time would silently drop unmodeled roles from localStorage, which could mask mismatches between the backend and frontend role model during development. Reading and dropping at parse time is more defensive and more observable.

**Decision 4: Drop-unknown semantics for unmodeled roles**
- **Why:** `isUserRole` drops role strings that do not match any `UserRole` value. This is intentional: if the backend sends a future role `"ROLE_MANAGER"` that the frontend does not yet model, `getRoles()` silently ignores it instead of crashing or granting unmodeled permissions. This is the safest default for a frontend that only manages permissions for roles it explicitly knows about.
- **Alternatives considered:** Throw on unknown roles. Rejected — an unknown backend role should not crash the frontend session; it should just not grant that permission. Logging an unknown role (e.g., `console.warn`) was considered but rejected to avoid leaking role information to browser devtools in production.

**Decision 5: `hasAnyRole` delegates to `hasRole`, not `getRoles().some()`**
- **Why:** `hasRole` is the existing, tested abstraction for single-role checks. `hasAnyRole` composes it rather than duplicating `getRoles().includes(role)` in its own closure. This respects DRY and ensures both functions have the same read path.
- **Alternatives considered:** `export function hasAnyRole(roles: UserRole[]): boolean { return roles.some(r => getRoles().includes(r)) }`. Functionally equivalent, but bypasses `hasRole` and duplicates the read path. Rejected.

**Decision 6: `AdminRoute.tsx` deletion in Task 1 (not Task 2)**
- **Why:** The parent feature groups deletion with the foundational steps (Phase 1). Deleting before `RoleGuard` is created ensures there is never a moment where both files coexist, which would create ambiguity about which guard to use. Since `AdminRoute.tsx` has zero callers, deletion has zero risk.
- **Alternatives considered:** Keep `AdminRoute.tsx` until Task 2 creates `RoleGuard` as a reference. Rejected — the file has no value as reference; the `RoleGuard` spec in the parent feature document and Task 2 document are the authoritative reference.

---

## Testing Considerations

### Automatic Validation

**TDD cycle for Step 1.3 (run after Steps 1.1 and 1.2 are complete):**

- [x] Run `npm run test` from `project/srcs/frontend/` — expect **40 tests passing**, 0 failures, 0 skipped (36 existing + 4 new `hasAnyRole` tests)

**After Step 1.4 (deletion):**

- [x] Run `npm run typecheck` from `project/srcs/frontend/` — expect **0 errors**
- [x] Run `npm run test` — expect **40 tests passing**, 0 failures (test count unchanged by deletion)
- [x] Run `npm run build` from `project/srcs/frontend/` — expect **successful build**, no errors

**Import-graph verification (run before deletion in Step 1.4):**

- [x] Run `grep -rn "AdminRoute" src/` from `project/srcs/frontend/` — expect **zero results outside `src/routes/AdminRoute.tsx` itself**

### Manual Validation

No manual validation is required for this task. All changes are purely TypeScript — types, functions, and test assertions. The UI behavior is unchanged; this task does not add, remove, or alter any rendered component or routing. Manual UI validation is deferred to Task 4 (pages and wiring).

---

## Related Code Explanations

- `src/types/auth.ts` — Being rewritten; was the source of `ROLE_ADMIN`/`ROLE_EMPLOYEE`/`UserRole`
- `src/services/authSession.ts:1` — Import line being updated from `{ ROLE_ADMIN, ROLE_EMPLOYEE, type UserRole }` to `{ UserRole }`
- `src/services/authSession.ts:40–50` — `getRoles()` being retyped and `hasRole` body leveraging the new type
- `src/services/authSession.test.ts:9–11` — `beforeEach(() => { localStorage.clear() })` — the existing cleanup pattern that covers the new `hasAnyRole` tests
- `src/routes/AdminRoute.tsx` — Being deleted; was an unregistered placeholder for admin-only routing
- `src/router.tsx` — Confirms `AdminRoute` has no import (safe to delete)

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task ✓ (see Parent Context)
- [x] `"erasableSyntaxOnly": true` constraint identified and addressed: `const`+`type` pattern used instead of `enum` as documented in Design Decision 1
- [x] `src/types/auth.ts` rewritten: exports `const UserRole` object (with `ADMIN`/`EMPLOYEE` keys) and `type UserRole` alias — no raw `ROLE_ADMIN`/`ROLE_EMPLOYEE` constants remain
- [x] `src/services/authSession.ts` updated: `import { UserRole }`, private `isUserRole` guard, `getRoles(): UserRole[]`, `hasRole` body unchanged/no cast, `hasAnyRole(roles: UserRole[]): boolean` exported, `isAdmin()`/`isEmployee()` use `UserRole.ADMIN`/`UserRole.EMPLOYEE`
- [x] `src/services/authSession.test.ts` extended: `import { UserRole }` from `@/types/auth` added, `hasAnyRole` added to authSession import, 4 new `hasAnyRole` tests added
- [x] `src/routes/AdminRoute.tsx` deleted: confirmed zero external references before deletion
- [x] `npm run test` passes with **40 tests, 0 failures** after Steps 1.1–1.3
- [x] `npm run typecheck` passes with **0 errors** after all four steps
- [x] `npm run build` passes with **0 errors** after all four steps
- [x] Parent feature Phase 1 steps (1.1, 1.2, 1.3, 1.4) marked `[x]` in `[[Frontend-Role-Based-Routing-and-Landing-Pages]]`
