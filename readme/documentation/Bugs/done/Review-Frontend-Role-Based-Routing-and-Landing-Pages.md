#high #architectural

## Bug: Review of Frontend Role-Based Routing and Landing Pages

### Summary

This document is a review of [[Features/to-do/Frontend-Role-Based-Routing-and-Landing-Pages]], which introduces a `UserRole` enum, a generic `RoleGuard` route guard, a `RoleGate` component gate, role-aware post-login redirect, a new `ConversationsPage` placeholder, and role-filtered sidebar navigation.

The review found **6 findings** (2 High, 2 Moderate, 2 Low). The most critical is a TypeScript type incompatibility introduced by migrating from string union types to a string enum — `string[].includes(enumValue)` produces a compile-time error in TypeScript strict mode. The second high finding is that the feature document specifies no testing strategy for components that render `<Navigate>`, which differs from all existing test patterns in the project.

---

### Findings

---

#### Finding 1 — TypeScript string enum not assignable to `string` in `string[].includes()`

**Severity:** 🟠 High

**Description:**
The feature proposes replacing the current `UserRole` union type (`"ROLE_ADMIN" | "ROLE_EMPLOYEE"`) with a TypeScript string enum (`enum UserRole { ADMIN = "ROLE_ADMIN", EMPLOYEE = "ROLE_EMPLOYEE" }`). The current `hasRole` function in `authSession.ts` calls `getRoles().includes(role)`, where `getRoles()` returns `string[]` and `role` is typed as `UserRole`. 

With a string union type, `UserRole` is assignable to `string`, and `string[].includes(role)` compiles. With a string enum, `UserRole` is NOT assignable to `string` — TypeScript treats string enum members as a distinct type, not as `string`. `Array<string>.prototype.includes` expects its argument to be `string`. Passing a `UserRole` enum value will produce a compile-time error:
```
Argument of type 'UserRole' is not assignable to parameter of type 'string'
```

This same issue affects the proposed `hasAnyRole` function, which calls `hasRole(role)` where `role` is typed as `UserRole`.

**Evidence:**
- `project/srcs/frontend/src/services/authSession.ts` — `hasRole(role: UserRole)` calls `getRoles().includes(role)` where `getRoles(): string[]`
- Current `UserRole = typeof ROLE_ADMIN | typeof ROLE_EMPLOYEE` — string union type, assignable to `string`, no issue
- After migration to `enum UserRole`, the type of `role` is `UserRole`, which `Array<string>.includes` does not accept in TypeScript strict mode

**Impact:**
`npm run typecheck` will fail immediately after Step 1.1 (enum migration) and before Step 1.2 (authSession update). The build cannot proceed. All callers of `hasRole` and `hasAnyRole` are blocked.

**Possible Solutions:**
1. Cast `role` to `string` inside `hasRole`: `return getRoles().includes(role as string)`
2. Change `hasAnyRole`/`hasRole` to accept `string` internally, keeping the external API as `UserRole`
3. Keep `UserRole` as a string union type (not an enum) and use a `const` object + `as const` assertion for compile-time safety

**Recommended Solution:**
Option 1 — add a single `as string` cast inside `hasRole`. String enums are structurally equivalent to strings at runtime; the cast is safe and accurately expresses the intent. The external API (`hasRole(role: UserRole)`) remains type-safe. The fix is one line:
```typescript
export function hasRole(role: UserRole): boolean {
  return getRoles().includes(role as string)
}
```
This should be documented explicitly in Step 1.2 of the feature.

**Decision:** Option A (chosen) — deeper alternative to the Bug Report's recommended cast. Instead of casting, type `getRoles()` to return `UserRole[]` by validating the raw localStorage `string[]` through an `isUserRole` type guard at the read boundary, then `hasRole(role: UserRole)` compiles as `getRoles().includes(role)` with NO cast at any call site. `saveSession(roles: string[])` stays as the untrusted backend-facing write seam (NOT widened to `UserRole[]`). Unmodeled roles are defensively dropped at the single read boundary; this drop-unknown semantics is documented in Step 1.2. Rationale: the feature's explicit motivation is compile-time type safety and future role expansion (user stories 7, 10, 13), so completing the migration — making `authSession` an honest trust boundary that converts untrusted `string[]` → validated `UserRole[]` — is a better fit than leaving a localized `as string` workaround. Cost is ~4-5 lines (one type guard + `filter` in `getRoles`); architecture impact moderate, not overengineered. Date: 2026-06-26. Parent document patched: Yes (Step 1.2 + Changes Required #2 + Risk Assessment).

---

#### Finding 2 — `RoleGuard` test approach not specified

**Severity:** 🟠 High

**Description:**
The Testing Decisions section specifies what to test in `RoleGuard.test.tsx` (children render when role matches; `<Navigate>` renders when role doesn't match; one-of-multiple roles renders children) but does not specify HOW to test it. Components that render `<Navigate>` from `react-router-dom` require a Router context to operate — rendering `<RoleGuard>` in isolation without a Router wrapper will throw:
```
Error: useNavigate() may be used only in the context of a <Router> component.
```

This pattern is fundamentally different from all existing tests in the project:
- `authSession.test.ts` — tests a plain function, no Router context
- `useLoginForm.test.ts` — mocks `useNavigate` via `vi.mock('react-router-dom', ...)`
- `api.test.ts` — tests a plain axios module

Without guidance on the testing approach, the task implementor faces two different options with different trade-offs:

**Option A: `MemoryRouter` + `Routes`** — wrap the test render in a real `MemoryRouter` and add a sibling `Route` for the `redirectTo` path to assert navigation happened.

**Option B: Mock `Navigate`** — use `vi.mock('react-router-dom', ...)` to replace `<Navigate>` with a testable stub that renders the `to` prop as visible text.

**Impact:**
Without specifying the approach, the task implementor may choose an approach that either doesn't verify the redirect target at all, or writes a test that passes without actually testing the behavior (e.g., checking that children are null without verifying navigation occurred).

**Possible Solutions:**
1. Document that `RoleGuard.test.tsx` should use `MemoryRouter` from `react-router-dom` with sibling routes, asserting the current path changes
2. Document that `RoleGuard.test.tsx` should mock `Navigate` via `vi.mock` to render a detectable stub

**Recommended Solution:**
Option 2 — mock `Navigate`. This is simpler and more direct than `MemoryRouter + Routes`. It avoids needing to simulate full route state and is consistent with how `useLoginForm.test.ts` already mocks `useNavigate`. The recommended mock pattern:
```typescript
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate-to">{to}</div>,
  }
})
```
Then assert `screen.getByTestId('navigate-to')` has text matching the expected `redirectTo` value. Add this guidance to the Task 2 planned task file description in the feature document.

**Decision:** Option 2 (chosen, with a required correction) — mock `Navigate` via `vi.mock('react-router-dom', async (importOriginal) => ...)` to render a detectable stub, asserting the redirect target text. CORRECTION to the Bug Report's recommended stub: the narrow `({ to }: { to: string })` type will NOT typecheck against `RoleGuard`'s `<Navigate to={redirectTo} replace />` because the `replace` prop is absent from the stub — TypeScript rejects it. The stub MUST be typed as `NavigateProps` (imported from `react-router-dom`) or widened to accept `replace?: boolean`/`state?: unknown` so the JSX compiles. Also recorded a coupling note for Task 2: the test is coupled to the `<Navigate>` primitive and should switch to a real-Router path assertion if `RoleGuard` is later refactored to `useNavigate()`. Rationale: simplest, consistent with the project's single established router-test idiom (`useLoginForm.test.ts` mocks `useNavigate` via `vi.mock`), and it tests `RoleGuard` through its render interface (children shown vs Navigate emitted) while leaving the real role logic unmocked. Date: 2026-06-26. Parent document patched: Yes (Testing Decisions RoleGuard row + Task 2 entry).

---

#### Finding 3 — Task ordering ambiguity between Tasks 2 and 3

**Severity:** 🟡 Moderate

**Description:**
The Task Breakdown section says Task 4 "depend[s] on Task 2 (RoleGuard) and Task 1 (UserRole, hasAnyRole). Can be executed after Tasks 1 and 2 complete (Task 3 can be parallel or before)." This wording is ambiguous about Task 3's relationship to Task 2. A reader could interpret "Task 3 can be parallel or before" as:

- Interpretation A (correct): Task 3 can run at the same time as Task 2 (both only depend on Task 1)
- Interpretation B (incorrect): Task 3 can run before Task 1 (since no dependency is stated)

Additionally, Task 3's own description says "Independent of Task 2, dependent on Task 1" which is correct but is not in the Task Breakdown section where the ordering summary lives.

The authoritative ordering should be:
```
Task 1 → Task 2 → Task 4
Task 1 → Task 3 → (independent, can precede Task 4)
```

**Impact:**
If a task implementor starts Task 3 before Task 1, they will not have the `UserRole` enum available, and `saveSession` calls in the test's arrange step using enum values will fail.

**Possible Solutions:**
1. Rewrite the Task 4 dependency note to be explicit: "Depends on Task 1 and Task 2. Task 3 is independent of Task 2 and can run in parallel after Task 1 completes."
2. Add a dependency line to each Task entry: `Dependencies: [Task 1]` / `Dependencies: [Task 1]` / `Dependencies: [Task 1, Task 2]`

**Recommended Solution:**
Option 2 — add an explicit `Dependencies:` line to each task entry. This makes the ordering unambiguous without requiring readers to cross-reference across multiple sections.

**Decision:** Option 2 (refined) (chosen) — add a `Dependencies:` line to each of the four task entries: Task 1 → `Dependencies: []` (none), Task 2 → `Dependencies: [Task 1]`, Task 3 → `Dependencies: [Task 1]`, Task 4 → `Dependencies: [Task 1, Task 2]` (no dependency on Task 3). Additionally rewrite Task 4's ambiguous sentence — "Can be executed after Tasks 1 and 2 complete (Task 3 can be parallel or before)" — to defer to the new `Dependencies:` field, eliminating the lingering contradiction between the new structured field and the old prose. Rationale: per-task structured dependencies are self-contained and machine-scannable, removing both misreadings without cross-section reading. The `Dependencies:` field becomes a required template field on every task entry. Date: 2026-06-26. Parent document patched: Yes (Task 1–4 entries + Task 4 prose).

---

#### Finding 4 — `localStorage` test cleanup not specified for new guard test files

**Severity:** 🟡 Moderate

**Description:**
`RoleGuard.test.tsx` and `RoleGate.test.tsx` must call `saveSession(...)` in their arrange steps to populate the user's role in `localStorage`, so that `hasAnyRole()` returns the expected value during the test. Without cleanup between tests, roles written in one test bleed into the next, causing false positives or false negatives.

The existing `authSession.test.ts` handles this correctly with `beforeEach(() => { localStorage.clear() })` (confirmed by reading the file). The feature document does not mention that the new test files must follow the same pattern. There is no project-wide vitest setup file that clears localStorage automatically.

**Impact:**
Without explicit `beforeEach` cleanup, tests in `RoleGuard.test.tsx` and `RoleGate.test.tsx` may pass or fail depending on execution order, producing flaky, non-deterministic results.

**Possible Solutions:**
1. Add to the Testing Decisions section: "All new test files that call `saveSession` must include `beforeEach(() => { localStorage.clear() })`, following the pattern in `authSession.test.ts`"
2. Add a Vitest global setup file that clears localStorage before each test suite
3. Document the requirement at the task level (in Task 2's planned task description)

**Recommended Solution:**
Option 1 — add the guidance to the Testing Decisions section. It's project-level guidance that applies to both `RoleGuard.test.tsx` and `RoleGate.test.tsx`, and is consistent with the established pattern. Option 2 (global setup) is a larger change outside this feature's scope.

**Decision:** Option 1 + Option 3 (combined) (chosen) — add the `beforeEach(() => { localStorage.clear() })` requirement to the Testing Decisions section (feature-level reusability, applies to any current or future test file that calls `saveSession`), AND add an explicit note in Task 2's entry requiring it for BOTH `RoleGuard.test.tsx` and `RoleGate.test.tsx` (locality where the implementor acts). Option 2 (global vitest `setupFiles`) explicitly rejected: out of scope for this feature, over-engineered for a two-file problem, and diverges from the established per-file `authSession.test.ts:11` pattern. Rationale: with Finding 1's chosen Option A, valid enum values now survive past the `getRoles()` read boundary (the filter only drops UNMODELED role strings), so leftover localStorage roles persist deterministically across tests — cleanup is more important, not less. Date: 2026-06-26. Parent document patched: Yes (Testing Decisions section + Task 2 entry).

---

#### Finding 5 — `MainLayout` appears in two separate route groups

**Severity:** 🟢 Low

**Description:**
The proposed router structure has two separate route groups, each containing a `ProtectedRoute → RoleGuard → MainLayout` chain:
```tsx
{/* Admin routes */}
<Route element={<ProtectedRoute><RoleGuard ...><MainLayout /></RoleGuard></ProtectedRoute>}>
  <Route path="/dashboard" element={<DashboardPage />} />
</Route>

{/* Employee routes */}
<Route element={<ProtectedRoute><RoleGuard ...><MainLayout /></RoleGuard></ProtectedRoute>}>
  <Route path="/conversations" element={<ConversationsPage />} />
</Route>
```

This means React will mount two separate `MainLayout` instances (including two separate `Sidebar` and `Header` instances), one for admin routes and one for employee routes. As the route tree grows, this pattern will require copy-pasting the guard chain for every new route group.

**Impact:**
Low for now (only 2 route groups, no shared state in `MainLayout`). As more routes are added, the router will grow repetitively and become harder to maintain.

**Possible Solutions:**
1. Accept the duplication now as correct-and-simple; revisit when the route tree has more than 3-4 groups
2. Extract a `RoleLayout` component that wraps `ProtectedRoute + RoleGuard + MainLayout` for a given role, reducing duplication to one line per group
3. Hoist `MainLayout` above both guard groups and use separate `RoleGuard`-only wrappers per child route

**Recommended Solution:**
Option 1 for this feature. The duplication is minimal at this stage (2 groups), both groups have different `allowedRoles` and `redirectTo`, and merging them prematurely adds complexity without benefit. Note the pattern in the Potential Issues section for future awareness.

**Decision:** Option 1 (chosen) — accept the duplication now as correct-and-simple; add a future-refactor note to the feature's Potential Issues / Risks section. The duplication was confirmed "correct-and-simple" by all solution analyses: extracting a `RoleLayout` (Option 2) would be a shallow pass-through that fails the deletion test (no logic, pure composition, ~3-line implementation for a ~3-prop interface) and violates YAGNI at 2 groups — the two callers vary only by `allowedRoles`/`redirectTo` values, never by behavior, so no real polymorphic seam exists. Hoisting `MainLayout` above the guards (Option 3) was rejected because it flips the guard chain so the layout mounts before the role check resolves (transient layout flash on wrong-role access) and changes the documented `ProtectedRoute → RoleGuard → MainLayout` order. The revisit trigger: extraction becomes justified at ≥3 route groups OR when a genuinely divergent guard-chain variant emerges (e.g. a group needing a different guard combination). Date: 2026-06-26. Parent document patched: Yes (Potential Issues / Risks section note added).

---

#### Finding 6 — `RoleGuard` redirect is silent (no state message)

**Severity:** 🟢 Low

**Description:**
`ProtectedRoute` redirects to `/login` with a `state` prop containing a user-visible message: `state={{ message: "You need to sign in to access that page." }}`. This message allows `LoginPage` to surface context to the user about why they were redirected.

`RoleGuard` redirects via `<Navigate to={redirectTo} replace />` with no `state`. If an employee manually navigates to `/dashboard` and gets bounced to `/conversations`, no message explains why. Similarly, if an admin hits `/conversations` and gets bounced to `/dashboard`, the redirect is silent.

**Impact:**
Minor UX inconsistency. At this stage (placeholder pages, no navigation between sections), users won't encounter this path accidentally. The sidebar will only show role-relevant links, so cross-role navigation requires deliberate URL manipulation.

**Possible Solutions:**
1. Accept silent redirect as-is for MVP; add state messaging in a later UX-polish pass
2. Add a `redirectMessage?: string` prop to `RoleGuard` and pass it in `state` when redirecting; landing pages display it if present (same as `LoginPage` reads the login redirect message)

**Recommended Solution:**
Option 1 — accept the silent redirect for now. The sidebar filtering already prevents accidental cross-role navigation. Adding state message handling to landing pages is out of scope for a placeholder-stage feature.

**Decision:** Option 1 (chosen, with a forward-guidance refinement) — accept the silent redirect for MVP; do NOT add a `redirectMessage` prop now. Verified against react-router-dom 6.30.3 docs that `<Navigate>` accepts an optional `state` prop read via `useLocation().state`, and confirmed the project already uses the write/read idiom (`ProtectedRoute.tsx:14` writes `state={{ message }}`, `LoginPage.tsx:16-17,35-41` reads it). Rejected Option 2 (`redirectMessage?` prop): it widens `RoleGuard`'s interface 3→4 props and scatters a state-reader across three pages (LoginPage + both landing pages) — a scatter-and-repeat pattern. Forward guidance recorded: the *preferred* future UX-polish approach is a `MainLayout`-level `<RedirectMessageBanner/>` that reads `location.state?.message` once and renders a banner (with `RoleGuard` emitting a fixed internal `state.message`, NO new caller-facing prop) — it preserves RoleGuard's SRP/minimal interface (ISP/OCP), centralizes the read (locality, leverage), and is reusable for any later redirect. A note to this effect is added to the feature's Potential Issues / Risks section so a future implementor does not default to the per-page-prop pattern. Both Option 2 and the banner are YAGNI at the placeholder stage. Date: 2026-06-26. Parent document patched: Yes (Potential Issues / Risks section note).

---

### Affected Documentation

- [[Features/to-do/Frontend-Role-Based-Routing-and-Landing-Pages]] — the document under review
- `project/srcs/frontend/src/services/authSession.ts` — Finding 1 requires a fix to `hasRole`
- `project/srcs/frontend/src/types/auth.ts` — Finding 1 relates to the enum migration
- `project/srcs/frontend/src/routes/RoleGuard.tsx` (planned) — Finding 2 affects its test strategy

---

## Findings Summary Table

| # | Title | Severity | Status |
|---|-------|----------|--------|
| 1 | TypeScript string enum not assignable to `string` in `string[].includes()` | 🟠 High | Done |
| 2 | `RoleGuard` test approach not specified | 🟠 High | Done |
| 3 | Task ordering ambiguity between Tasks 2 and 3 | 🟡 Moderate | Done |
| 4 | `localStorage` test cleanup not specified for new guard test files | 🟡 Moderate | Done |
| 5 | `MainLayout` appears in two separate route groups | 🟢 Low | Done |
| 6 | `RoleGuard` redirect is silent (no state message) | 🟢 Low | Done |
