#architectural #medium

## Bug: Review of Employee-Edit-and-Delete-Modals

### Summary

This is a review of [[Features/to-do/Employee-Edit-and-Delete-Modals]], which activates the placeholder Edit and Delete buttons on the `/employees` admin page. The review found 5 findings (0 high, 3 moderate, 2 low) across test-count accuracy, hook implementation consistency, API payload specification, UI implementation clarity, and test mock setup. All findings are in the feature document itself; no production code has been written yet. Resolving these findings before writing any Task documents will prevent rework.

### Findings

---

#### Finding 1 — Test count in Phase 5 regression step is wrong

**Severity:** 🟡 Moderate

**Description:** The Phase 5 regression step specifies `"target: 71"` tests. The correct count is 75.

**Evidence:**
- Baseline: 59 tests (after Admin Employee Management Page)
- New tests added in Task 2 (4 extended service tests): 59 + 4 = 63
- New tests added in Task 3 (8 `useEditEmployee` tests): 63 + 8 = 71
- New tests added in Task 4 (4 `useDeleteEmployee` tests): 71 + 4 = **75**

The document has 75 total but the regression step in Phase 5 shows 71, which is the intermediate count after Task 3 before Task 4's tests exist.

**Why It Matters:** A Task executor following Phase 5 will run `npm run test` expecting 71 to pass. If the actual count is 75 (because Task 4 is already done), the executor might incorrectly conclude there's an issue. Conversely, if Phase 5 is run without Task 4 complete, a count of 71 passing gives a false "all green" signal.

**Possible Solutions:**
- A) Update the Phase 5 regression step to `"target: 75"` (correct final count).
- B) Add intermediate count notes per phase (64 after Task 2, 71 after Task 3, 75 after Task 4) and update Phase 5 to `75`.

**Recommended Solution:** Option A — change `"target: 71"` to `"target: 75"` in Phase 5 Step 5.6. Add a parenthetical note `(59 baseline + 4 service + 8 useEditEmployee + 4 useDeleteEmployee)` for traceability.

**Decision:** Accepted (2026-06-27) — parent document patched. Update Phase 5 Step 5.6: "target: 75 (59 baseline + 4 service + 8 useEditEmployee + 4 useDeleteEmployee)".

---

#### Finding 2 — `refresh()` in `useEmployeeList` should be a plain function, not `useCallback`

**Severity:** 🟡 Moderate

**Description:** The feature doc proposes adding `refresh()` via `useCallback`:

```typescript
const refresh = useCallback(() => {
  fetchEmployees(currentPage, pageSize, filterField, filterValue)
}, [currentPage, pageSize, filterField, filterValue])
```

However, the actual `useEmployeeList.ts` (`project/srcs/frontend/src/features/employees/hooks/useEmployeeList.ts`) uses zero `useCallback` or `useMemo` hooks. All event handlers (`onFilterFieldChange`, `onFilterValueChange`, `onPageSizeChange`, `onPageChange`) are plain functions defined directly in the hook body. `fetchEmployees` itself is also a plain `async function` defined inside the hook, which means it is not stable across renders (new reference each render). Including `fetchEmployees` inside a `useCallback` dependency array would require adding it as a dep, which would in turn re-create the `useCallback` every render — defeating the purpose.

**Why It Matters:** `useCallback` without `fetchEmployees` in deps is an ESLint violation (react-hooks/exhaustive-deps) and could silently capture a stale `fetchEmployees` reference. With `fetchEmployees` in deps, the memoization is useless (recreated every render). Either way it introduces inconsistency with the hook's established pattern without providing any benefit.

**Possible Solutions:**
- A) Define `refresh()` as a plain function, exactly as `onPageChange` is defined: `function refresh() { void fetchEmployees(currentPage, pageSize, filterField, filterValue) }`. Returns the latest values from closure.
- B) Refactor the entire hook to use `useCallback` consistently (unnecessary scope expansion).

**Recommended Solution:** Option A — use a plain function. `fetchEmployees` is recreated each render and all existing handlers follow the same plain-function pattern. `refresh()` reads the latest state values from the same closure. No `useCallback`, no extra deps.

**Decision:** Accepted (2026-06-27) — parent document patched. Define `refresh()` as `function refresh() { void fetchEmployees(currentPage, pageSize, filterField, filterValue) }` without `useCallback`, matching the existing hook convention.

---

#### Finding 3 — PUT body construction in `onSave()` is ambiguous

**Severity:** 🟡 Moderate

**Description:** The `useEditEmployee` implementation steps describe `onSave()` as:

> "If `hasFieldChanges`: build `EmployeeUpdateForm` (include `password` only if non-empty), call `updateEmployee(employee.id, form)`."

It is not clear which fields go into the form. The `EmployeeUpdateForm` type has all optional fields (`username?`, `firstName?`, `lastName?`, `email?`, `password?`). A Task executor could reasonably interpret this as "only include fields that changed" (partial payload) or "always include all non-password fields" (full payload).

These have different behavior: if the executor sends only changed fields, a field that hasn't changed is omitted. If `firstName` is blank because the admin cleared it, the backend would keep the existing `firstName` (correct) regardless of whether `firstName` is sent or not. But if the executor only sends `username` (changed), `firstName` is not sent, and the backend keeps the existing `firstName` — which is correct but relies on implicit omission logic.

The behavior is the same in this case, but the intent is ambiguous and could cause subtle test failures where the executor asserts "PUT called with `{ username: 'alice2' }`" but the actual call sends all four text fields.

**Why It Matters:** Test assertions for `updateEmployee` calls could be wrong (too narrow or too broad), causing false red/green signals. The tests in `useEditEmployee.test.ts` must match what the hook actually sends.

**Possible Solutions:**
- A) Specify explicitly: "always include `username`, `firstName`, `lastName`, `email` in the form body (using current form values); include `password` only if non-empty". Tests assert `expect.objectContaining({ username: 'alice2' })`.
- B) Specify: "include only fields that differ from the initial employee values, plus non-empty password". Tests assert the exact changed field set.

**Recommended Solution:** Option A — always send all text fields. It is simpler to implement (no per-field diff logic beyond the `hasFieldChanges` gate), consistent with the backend's "blank = ignore" semantics, and easier to test with `expect.objectContaining(...)`. The `hasFieldChanges` gate prevents calling PUT at all when nothing changed; once past that gate, always send the full set.

**Decision:** Accepted (2026-06-27) — parent document patched. Specify in Implementation Architecture §5: "Build `EmployeeUpdateForm` with all four text fields always included (`username`, `firstName`, `lastName`, `email`); add `password` only when `password !== ''`". Tests use `expect.objectContaining({ username: ... })` to assert the specific changed value without asserting the full body.

---

#### Finding 4 — Enabled field implementation left open between checkbox and Switch install

**Severity:** 🟢 Low

**Description:** Implementation Architecture §7 says: "use `<input type="checkbox">` styled with Tailwind OR install `npx shadcn@latest add switch` — the Task executor decides." No Switch component is currently installed (`src/components/ui/` has 11 files; no `switch.tsx`).

**Why It Matters:** The ambiguity could cause a Task executor to spend time installing and validating a new shadcn component (including ADR-010 compliance verification) when a plain styled checkbox is sufficient for MVP. It also makes the feature doc's scope uncertain.

**Possible Solutions:**
- A) Commit to `<input type="checkbox">` with Tailwind styling in `EditEmployeeModal` for MVP. No new install.
- B) Add `npx shadcn@latest add switch` as a substep in Task 5 (with ADR-010 verification).

**Recommended Solution:** Option A — use a styled `<input type="checkbox">` for MVP. No new install needed. A Switch can be added in a future polish pass. Update §7 to remove the ambiguity.

**Decision:** Accepted (2026-06-27) — parent document patched. Remove the "OR install switch" option. Specify: "enabled: `<label>` wrapping `<input type='checkbox' checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />` styled with Tailwind".

---

#### Finding 5 — `useEditEmployee` test setup note missing from Testing Decisions

**Severity:** 🟢 Low

**Description:** The Testing Decisions section for `useEditEmployee` references prior art (`useLoginForm.test.ts`, `employeeService.test.ts`) for the `vi.mock` pattern but does not call out that the mock factory for `../services/employeeService` must include all four new functions: `updateEmployee`, `deleteEmployee`, `activateEmployee`, and `deactivateEmployee`.

**Why It Matters:** A Task executor following the prior art pattern from `useLoginForm.test.ts` (which only mocks a `login` function) might forget to include `deleteEmployee` (not used by `useEditEmployee` but present in the same module) or mock it incorrectly, leading to real HTTP calls in test or unhandled rejections.

**Possible Solutions:**
- A) Add a note in Testing Decisions: "`vi.mock('../services/employeeService', () => ({ listEmployees: vi.fn(), updateEmployee: vi.fn(), activateEmployee: vi.fn(), deactivateEmployee: vi.fn(), deleteEmployee: vi.fn() }))` — mock all exports from the service module so no real HTTP calls leak."
- B) Leave it to the Task executor to discover from prior art.

**Recommended Solution:** Option A — add the explicit mock factory skeleton to the Testing Decisions for `useEditEmployee`. Prevents accidental HTTP calls and removes guesswork.

**Decision:** Accepted (2026-06-27) — parent document patched. Add mock setup note to `useEditEmployee` Testing Decisions row.

---

### Investigation Scope
- **Code Reviewed:** `project/srcs/frontend/src/features/employees/hooks/useEmployeeList.ts`, `project/srcs/frontend/src/features/employees/components/EmployeeTable.tsx`, `project/srcs/frontend/src/pages/EmployeesPage.tsx`, `project/srcs/frontend/src/features/employees/types.ts`, `project/srcs/frontend/src/features/employees/services/employeeService.ts`, `project/srcs/backend/src/main/java/com/BHT/configuration/security/SecurityConfig.java`
- **Documentation Reviewed:** [[ADRs/ADR-010-base-ui-over-radix-ui-for-frontend]], [[Features/done/Admin-Employee-Management-Page]], [[Docs/API-Reference/Employee]]
- **Memory Bank Reviewed:** All 7 files read at session start

### Confidence Level
Confirmed — all findings are verified against the actual source files read during this review session.

---

## Affected Documentation

- [[Features/to-do/Employee-Edit-and-Delete-Modals]] — the document under review; all 5 findings require patches to this document before Tasks are written
- [[Docs/API-Reference/Employee]] — informs correct endpoint URLs, PUT body semantics, and CORS limitation
- [[ADRs/ADR-010-base-ui-over-radix-ui-for-frontend]] — governs dialog install approach (base-mira style); Finding 4 affects the enabled field decision within this feature

---

## Findings Summary Table

| # | Title | Severity | Status |
|---|-------|----------|--------|
| 1 | Test count in Phase 5 regression step is wrong (71 → 75) | 🟡 Moderate | Done |
| 2 | `refresh()` should be plain function, not `useCallback` | 🟡 Moderate | Done |
| 3 | PUT body construction in `onSave()` is ambiguous | 🟡 Moderate | Done |
| 4 | Enabled field implementation left open (checkbox vs Switch) | 🟢 Low | Done |
| 5 | `useEditEmployee` mock setup note missing from Testing Decisions | 🟢 Low | Done |
