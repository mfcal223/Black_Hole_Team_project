# Task: Decompose `EmployeesPage.tsx` — Extract Modal Hook and Pagination Component

#task #current #medium-complexity #parent-frontend-code-quality-fallow-health-refactor

**Parent:** [[Frontend-Code-Quality-Fallow-Health-Refactor]]
**Parent Type:** Bug
**Related Step(s):** Phase 3 — Steps 3.1, 3.2, 3.3
**Estimated Complexity:** Medium

---

## Goal

Extract `useEmployeeModals` hook and `EmployeePagination` component from `EmployeesPage.tsx`, reducing the page from a HIGH CRAP 72.0 (8 cyclomatic, 112 lines) god component to a thin composition layer focused solely on orchestrating the employees feature.

---

## Parent Context

The parent bug [[Frontend-Code-Quality-Fallow-Health-Refactor]] documents a `npx fallow health` audit that scored the frontend at 82/100. `EmployeesPage.tsx` was flagged with CRAP 72.0 (8 cyclomatic, 112 lines) — a page component mixing three independent modal open/close state concerns, inline pagination rendering, employee list orchestration, and error display in one function.

**Parent prescriptions:**
- **Step 3.1:** Create `useEmployeeModals.ts` hook returning `{ editEmployee, setEditEmployee, deleteEmployee, setDeleteEmployee, createOpen, setCreateOpen }`.
- **Step 3.2:** Create `EmployeePagination.tsx` component receiving `{ currentPage, totalPages, totalElements, isLoading, onPageChange }`.
- **Step 3.3:** Refactor `EmployeesPage.tsx` to use `useEmployeeModals` and `<EmployeePagination>`.

**Constraints from parent:**
- Modal hook and pagination component are independent extractions but both target the same page — grouped to avoid two partial PRs on the same file.
- All callers of `EmployeesPage` require zero modifications (it has no callers that pass props; it is a route component in `router.tsx`).
- The `UseEmployeeListResult` interface is **unchanged** — `useEmployeeList` is not modified by this task.

---

## Preconditions / Dependencies

- Task 1 [[Frontend-Code-Quality-Fallow-Health-Refactor-task-1-useEditEmployee-onSave]] is complete: 101/101 tests passing, 0 typecheck errors, build at 511.78 kB / 167.48 kB gzip.
- Task 2 [[Frontend-Code-Quality-Fallow-Health-Refactor-task-2-AppSettingsForm-cards]] is complete: 101/101 tests still passing, build at 512.31 kB / 167.60 kB gzip.
- `src/pages/EmployeesPage.tsx` — 126 lines; the file being decomposed. Current state: three inline `useState` calls for modal state + inline pagination JSX.
- `src/features/employees/hooks/useEmployeeList.ts` — exports `UseEmployeeListResult` with `employees`, `totalPages`, `totalElements`, `currentPage`, `isLoading`, `error`, `filterField`, `filterValue`, `pageSize`, `onFilterFieldChange`, `onFilterValueChange`, `onPageSizeChange`, `onPageChange`, `refresh`. **Unchanged** by this task.
- `src/features/employees/types.ts` — exports `EmployeeListDTO`, the type used by `editEmployee` and `deleteEmployee` state.
- `src/features/employees/hooks/` — subdirectory exists; new hook placed here.
- `src/features/employees/components/` — subdirectory exists (contains `CreateEmployeeModal.tsx`, `DeleteEmployeeModal.tsx`, `EditEmployeeModal.tsx`, `EmployeeFilterBar.tsx`, `EmployeeTable.tsx`); new component placed here.
- 101-test baseline across 17 files. `EmployeesPage.tsx` has no existing tests. Test count remains 101 (no new tests required — this is a pure structural decomposition of a page component with no test baseline).
- `src/router.tsx` — sole consumer of `EmployeesPage`; it renders `<EmployeesPage />` with no props. Untouched by this task.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `solid-deep-design` — **Selected** — governs the extraction rationale. SRP: `EmployeesPage` currently has three reasons to change (modal state management, pagination UI, page-level composition). Each extracted unit has one reason to change. Deletion test: deleting `EmployeePagination` scatters Previous/Next disabled logic, `Math.max`, and pluralization back into the page caller — it is earning its keep. Deleting `useEmployeeModals` is shallow (3 useState calls), but the extraction is justified by SRP: modal state management is a distinct responsibility from page composition.
- `tdd` — **Selected** — this is a pure refactoring with no new behavior. `EmployeesPage.tsx` has no existing test baseline to preserve. No new tests are added: `useEmployeeModals` is a trivial wrapper around 3 `useState` calls (testing it would verify React's own `useState` contract, not feature behavior); `EmployeePagination` JSX is lifted verbatim from the page (its button disabled logic is validated manually). Manual validation of the Employees page covers the observable behavior of both extracted units end-to-end.
- `react-best-practices` — **Selected** — confirms that modal open/close state management should be extracted to a dedicated hook when it groups related state (three pairs that share a single "which modal is open" concern). Confirms `EmployeePagination` should be a named component rather than an inline render block.
- `react-code-organization` — **Selected** — confirms `useEmployeeModals.ts` lives in `src/features/employees/hooks/` (feature-local hooks subdirectory, consistent with `useEditEmployee.ts`, `useEmployeeList.ts`) and `EmployeePagination.tsx` lives in `src/features/employees/components/` (consistent with `EmployeeFilterBar.tsx`, `EmployeeTable.tsx`). Neither is exported from the feature barrel `index.ts` — both are internal to `EmployeesPage`.

### Documentation Reviewed

- Context7 not required — no library API surface changes. React 19.2.4 `useState` hook, TypeScript 5.9.3 interface patterns, shadcn/ui `Button` component — all patterns are already in production in the existing codebase. The new code mirrors existing patterns in `useEditEmployee.ts` (hook structure), `AppSettingsForm.tsx` sub-components (ISP-sliced props), and the existing `EmployeesPage.tsx` itself (JSX lifted verbatim).
- `src/pages/EmployeesPage.tsx` — read in full (126 lines); three inline `useState` calls (lines 33–35) and pagination JSX (lines 73–98) identified as extraction targets.
- `src/features/employees/hooks/useEmployeeList.ts` — read in full; `UseEmployeeListResult` interface confirmed (14 members returned). Confirms `currentPage`, `totalPages`, `totalElements`, `isLoading`, `onPageChange` are the 5 values needed by `EmployeePagination`.
- `src/features/employees/types.ts` — read in full; `EmployeeListDTO` type confirmed as the type for `editEmployee` and `deleteEmployee` state.

### Related Existing Code

- `src/pages/EmployeesPage.tsx` — the file being decomposed; modal state lines 33–35, pagination JSX lines 73–98
- `src/features/employees/hooks/useEmployeeList.ts` — unchanged; provides the 5 props `EmployeePagination` needs
- `src/features/employees/hooks/useEditEmployee.ts` — structural pattern for hook exports and `UseXxxResult` interface naming
- `src/features/employees/types.ts:1` — `EmployeeListDTO` type consumed by `useEmployeeModals`
- `src/features/employees/index.ts` — barrel export; **not modified** (neither new unit is a public API export)
- `src/router.tsx` — sole consumer of `EmployeesPage`; untouched
- `src/features/employees/components/EditEmployeeModal.tsx` — consumer of `editEmployee` from `useEmployeeModals`
- `src/features/employees/components/DeleteEmployeeModal.tsx` — consumer of `deleteEmployee` from `useEmployeeModals`
- `src/features/employees/components/CreateEmployeeModal.tsx` — consumer of `createOpen` from `useEmployeeModals`

---

## Implementation Details

### Approach

Apply **SRP + Depth** (from `solid-deep-design`) to decompose `EmployeesPage` into three focused units:

1. **`useEmployeeModals` — feature-local hook in `hooks/`**
   - One responsibility: own all modal open/close state for the Employees page.
   - Groups three related state pairs (`editEmployee`, `deleteEmployee`, `createOpen`) that share the concern "which modal is currently open." Extracting them together rather than individually is correct — they form one SRP unit (modal visibility management), not three unrelated pieces of state.
   - No async operations, no external service calls, no debouncing. Pure state management.
   - Does NOT close over `refresh` — the success callbacks (`setEditEmployee(null); refresh()`) remain in the page where `refresh` lives. The hook owns only state, not the success side-effects.
   - Exports `UseEmployeeModalsResult` interface for TypeScript contract clarity (consistent with `UseEditEmployeeResult`, `UseEmployeeListResult`).

2. **`EmployeePagination` — feature-local component in `components/`**
   - One responsibility: render the Previous/count/Next pagination row for the employee list.
   - Encapsulates: `Math.max(totalPages, 1)` guard, pluralization logic (`totalElements !== 1 ? "s" : ""`), Previous button disabled condition (`currentPage === 0 || isLoading`), and Next button disabled condition (`currentPage >= totalPages - 1 || isLoading`).
   - Receives exactly the 5 values it uses from `EmployeesPage` (ISP-compliant). Does not receive `employees`, `filterField`, `error`, or any other state it does not render.
   - JSX lifted verbatim from `EmployeesPage.tsx` lines 73–98 to prevent behavioral drift.

3. **`EmployeesPage` (thinned) — thin composition layer**
   - Delegates modal state to `useEmployeeModals()`.
   - Delegates pagination rendering to `<EmployeePagination>`.
   - Retains: the page heading + Create button, `EmployeeFilterBar`, `EmployeeTable`, `ErrorMessage`, and the three modal mount conditions (these remain in the page because they depend on both the modal state from `useEmployeeModals` and `refresh` from `useEmployeeList`).
   - Removes the `useState` import (no longer needed directly) and the `EmployeeListDTO` type import (type is now encapsulated in `useEmployeeModals`).

**Modal success callbacks stay in the page:** `onSuccess={() => { setEditEmployee(null); refresh() }}` cannot move into `useEmployeeModals` because `refresh` is returned by a different hook (`useEmployeeList`). Closing over both hooks' values in a third location would violate SRP and couple `useEmployeeModals` to `useEmployeeList`. The page is the correct coordinator for cross-hook callbacks.

**No barrel export for either new unit:** `useEmployeeModals` and `EmployeePagination` are internal to `EmployeesPage.tsx`. They are not reused anywhere else in the codebase and are not part of the `employees` feature's public API. `src/features/employees/index.ts` is unchanged.

### Files to Create/Modify

- [ ] `src/features/employees/hooks/useEmployeeModals.ts` — **new**; modal state hook
- [ ] `src/features/employees/components/EmployeePagination.tsx` — **new**; pagination row component
- [ ] `src/pages/EmployeesPage.tsx` — **modify**; replace 3 inline `useState` calls with `useEmployeeModals()`, replace inline pagination div with `<EmployeePagination>`, remove now-unused `useState` and `EmployeeListDTO` imports

---

## Step-by-Step Implementation

### Step 3.1 — Create `useEmployeeModals.ts`

**Goal:** Define the hook that owns all modal open/close state for the Employees page.
**Dependencies:** None (uses only React `useState` and the `EmployeeListDTO` type from the features package).

- [x] Create `src/features/employees/hooks/useEmployeeModals.ts`.
- [x] Define and export `UseEmployeeModalsResult` interface with exactly 6 members: `editEmployee: EmployeeListDTO | null`, `setEditEmployee: (employee: EmployeeListDTO | null) => void`, `deleteEmployee: EmployeeListDTO | null`, `setDeleteEmployee: (employee: EmployeeListDTO | null) => void`, `createOpen: boolean`, `setCreateOpen: (open: boolean) => void`.
- [x] Import `EmployeeListDTO` using `import type` (TypeScript-only import).
- [x] Implement `useEmployeeModals()`: three `useState` calls, return all six members.
- [x] Run `npm run typecheck` — 0 errors.

**Why this step is critical:**
The three modal state pairs in `EmployeesPage` lines 33–35 are the single SRP violation driving the CRAP score. Grouping them into one hook makes `EmployeesPage`'s sole remaining responsibility obvious: composing employees-feature components. The `UseEmployeeModalsResult` interface makes the hook's contract type-safe and documents the six values the page depends on for modal control.

#### Implementation

```typescript
// src/features/employees/hooks/useEmployeeModals.ts

import { useState } from "react"
import type { EmployeeListDTO } from "../types"

export interface UseEmployeeModalsResult {
  editEmployee: EmployeeListDTO | null
  setEditEmployee: (employee: EmployeeListDTO | null) => void
  deleteEmployee: EmployeeListDTO | null
  setDeleteEmployee: (employee: EmployeeListDTO | null) => void
  createOpen: boolean
  setCreateOpen: (open: boolean) => void
}

export function useEmployeeModals(): UseEmployeeModalsResult {
  const [editEmployee, setEditEmployee] = useState<EmployeeListDTO | null>(null)
  const [deleteEmployee, setDeleteEmployee] = useState<EmployeeListDTO | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  return {
    editEmployee,
    setEditEmployee,
    deleteEmployee,
    setDeleteEmployee,
    createOpen,
    setCreateOpen,
  }
}
```

#### Edge Cases

1. **`editEmployee` and `deleteEmployee` both non-null simultaneously** — This cannot happen in practice (only one modal opens at a time; when a modal is open it renders an overlay that blocks all table interaction, so the user cannot trigger a second click handler). When the user closes a modal, the `onClose` callback calls `setEditEmployee(null)` or `setDeleteEmployee(null)`, resetting that state before the other can be triggered. The hook enforces no mutual exclusion because the page's UX already prevents simultaneous opens. No guard needed. <!-- REVIEW-FIX: Clarified that it is the modal overlay + onClose callback that prevents simultaneous opens — not the click handlers themselves resetting each other -->
2. **`createOpen` true while `editEmployee` is non-null** — Same as above: UX routing prevents this. The hook does not enforce it.
3. **Initial state** — All three states initialize to their null/false defaults: `editEmployee = null`, `deleteEmployee = null`, `createOpen = false`. No modal is open on mount.

---

### Step 3.2 — Create `EmployeePagination.tsx`

**Goal:** Define the focused component that owns the Previous/count/Next pagination row, including all button disabled logic.
**Dependencies:** Step 3.1 complete (pattern established, but this step is actually independent — the pagination component has no dependency on `useEmployeeModals`).

- [x] Create `src/features/employees/components/EmployeePagination.tsx`.
- [x] Define `EmployeePaginationProps` interface with exactly 5 props: `currentPage: number`, `totalPages: number`, `totalElements: number`, `isLoading: boolean`, `onPageChange: (page: number) => void`.
- [x] Import `Button` from `@/components/ui/button`.
- [x] Lift the pagination `<div>` JSX from `EmployeesPage.tsx` lines 73–98 verbatim into this component's return.
- [x] Run `npm run typecheck` — 0 errors.

**Why this step is critical:**
The pagination block in `EmployeesPage.tsx` lines 73–98 contains non-trivial logic: `Math.max(totalPages, 1)` prevents showing "Page 1 of 0" when the list is empty, `totalElements !== 1 ? "s" : ""` handles pluralization, and the two disabled conditions encode edge-case navigation guards. Extracting this JSX gives these guards a single location to change when pagination behavior evolves (e.g., switching to a "first/last" button layout, adding page jump, or changing the count display format).

#### Implementation

```tsx
// src/features/employees/components/EmployeePagination.tsx

import { Button } from "@/components/ui/button"

interface EmployeePaginationProps {
  currentPage: number
  totalPages: number
  totalElements: number
  isLoading: boolean
  onPageChange: (page: number) => void
}

export function EmployeePagination({
  currentPage,
  totalPages,
  totalElements,
  isLoading,
  onPageChange,
}: EmployeePaginationProps) {
  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>
        {totalElements} employee{totalElements !== 1 ? "s" : ""}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0 || isLoading}
        >
          Previous
        </Button>
        <span>
          Page {currentPage + 1} of {Math.max(totalPages, 1)}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages - 1 || isLoading}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
```

#### Edge Cases

1. **`currentPage === 0`** — Previous button is disabled (`currentPage === 0 || isLoading`). User cannot navigate before page 0.
2. **`currentPage >= totalPages - 1`** — Next button is disabled. When `totalPages = 1`, `currentPage = 0` satisfies `0 >= 0`, so Next is disabled on a single-page list.
3. **`totalPages === 0` (empty list after filter)** — `Math.max(totalPages, 1)` renders "Page 1 of 1" rather than "Page 1 of 0". `currentPage = 0`, `totalPages = 0` → `0 >= -1` → Next is disabled. Previous is also disabled (`currentPage === 0`). Both buttons correctly disabled.
4. **`isLoading === true`** — Both buttons disabled regardless of page position. This prevents triggering a page change while a fetch is in flight, avoiding a double-fetch race condition.
5. **`totalElements === 1`** — Renders "1 employee" (singular). Any other count renders "N employees" (plural).
6. **`totalElements === 0`** — Renders "0 employees". Both navigation buttons are disabled (empty list → `totalPages = 0` → both guards trigger).

---

### Step 3.3 — Refactor `EmployeesPage.tsx`

**Goal:** Replace the three inline `useState` calls with `useEmployeeModals()`, replace the inline pagination `<div>` with `<EmployeePagination>`, and remove now-unused imports.
**Dependencies:** Steps 3.1 and 3.2 complete. Both new units exist and typecheck.

- [x] Remove `import { useState } from "react"` — no longer needed in the page after the three state calls move to `useEmployeeModals`.
- [x] Remove `import type { EmployeeListDTO } from "@/features/employees"` — the type is now encapsulated in `useEmployeeModals`; `EmployeesPage` does not need it directly.
- [x] Add `import { useEmployeeModals } from "@/features/employees/hooks/useEmployeeModals"` after the `useEmployeeList` import line.
- [x] Add `import { EmployeePagination } from "@/features/employees/components/EmployeePagination"` after the `EmployeeFilterBar` import line.
- [x] Replace the three `const [editEmployee, setEditEmployee]`, `const [deleteEmployee, setDeleteEmployee]`, `const [createOpen, setCreateOpen]` useState declarations with a single destructuring of `useEmployeeModals()`.
- [x] Replace the inline `<div className="flex items-center justify-between...">` pagination block (lines 73–98) with `<EmployeePagination currentPage={currentPage} totalPages={totalPages} totalElements={totalElements} isLoading={isLoading} onPageChange={onPageChange} />`.
- [x] Verify all modal mount conditions, the `onSuccess` callbacks, and the `onEditClick`/`onDeleteClick` props remain unchanged — they already use the same names (`editEmployee`, `setEditEmployee`, etc.) and require no update.
- [x] Run `npm run typecheck` — 0 errors.
- [x] Run `npm run test` — 101/101 pass; 0 new failures. `useEmployeeList.test.ts` (10 tests), `useEditEmployee.test.ts` (9 tests), `AppSettingsForm.test.tsx` (5 tests), and all 14 other test files must pass unchanged. <!-- REVIEW-FIX: Corrected useEmployeeList count 9 → 10 -->

**Why this step is critical:**
This is the composition step that wires the two new units into the page. The correctness condition is that the rendered output of `EmployeesPage` is byte-for-byte identical to the pre-refactoring output: same pagination row, same modal mounts, same filter bar, same table. TypeScript must accept all prop types without casts (`setEditEmployee` from `useEmployeeModals` is typed `(employee: EmployeeListDTO | null) => void`, which matches the `onEditClick: (employee: EmployeeListDTO) => void` call in `EmployeeTable` — the setter accepts `EmployeeListDTO | null` and `EmployeeTable` passes `EmployeeListDTO`, satisfying the widened setter type).

#### Implementation

The resulting `EmployeesPage.tsx` after refactoring:

```tsx
// src/pages/EmployeesPage.tsx

import { useEmployeeList } from "@/features/employees"
import { useEmployeeModals } from "@/features/employees/hooks/useEmployeeModals"
import { EmployeeTable } from "@/features/employees/components/EmployeeTable"
import { EmployeeFilterBar } from "@/features/employees/components/EmployeeFilterBar"
import { EmployeePagination } from "@/features/employees/components/EmployeePagination"
import { EditEmployeeModal } from "@/features/employees/components/EditEmployeeModal"
import { DeleteEmployeeModal } from "@/features/employees/components/DeleteEmployeeModal"
import { CreateEmployeeModal } from "@/features/employees/components/CreateEmployeeModal"
import { ErrorMessage } from "@/components/common/ErrorMessage"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export function EmployeesPage() {
  const {
    employees,
    totalPages,
    totalElements,
    currentPage,
    isLoading,
    error,
    filterField,
    filterValue,
    pageSize,
    onFilterFieldChange,
    onFilterValueChange,
    onPageSizeChange,
    onPageChange,
    refresh,
  } = useEmployeeList()

  const {
    editEmployee,
    setEditEmployee,
    deleteEmployee,
    setDeleteEmployee,
    createOpen,
    setCreateOpen,
  } = useEmployeeModals()

  return (
    <div className="flex flex-col gap-6">
      {/* Page heading */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Employees</h1>
          <p className="text-muted-foreground">Manage employee accounts.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Create New
        </Button>
      </div>

      {/* Filter bar — always mounted so admin can retry after error */}
      <EmployeeFilterBar
        filterField={filterField}
        filterValue={filterValue}
        pageSize={pageSize}
        onFilterFieldChange={onFilterFieldChange}
        onFilterValueChange={onFilterValueChange}
        onPageSizeChange={onPageSizeChange}
      />

      {/* Error state replaces the table + pagination area */}
      {error ? (
        <ErrorMessage message={error} />
      ) : (
        <>
          <EmployeeTable
            employees={employees}
            isLoading={isLoading}
            onEditClick={setEditEmployee}
            onDeleteClick={setDeleteEmployee}
          />

          <EmployeePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalElements={totalElements}
            isLoading={isLoading}
            onPageChange={onPageChange}
          />
        </>
      )}

      {editEmployee && (
        <EditEmployeeModal
          employee={editEmployee}
          onClose={() => setEditEmployee(null)}
          onSuccess={() => { setEditEmployee(null); refresh() }}
        />
      )}

      {deleteEmployee && (
        <DeleteEmployeeModal
          employee={deleteEmployee}
          onClose={() => setDeleteEmployee(null)}
          onSuccess={() => { setDeleteEmployee(null); refresh() }}
        />
      )}

      {createOpen && (
        <CreateEmployeeModal
          onClose={() => setCreateOpen(false)}
          onSuccess={() => { setCreateOpen(false); refresh() }}
        />
      )}
    </div>
  )
}
```

#### Edge Cases

1. **`error` is non-null** — `ErrorMessage` is rendered; `EmployeePagination` is NOT mounted (it sits inside the `!error` branch). The pagination component correctly does not appear when the list failed to load.
2. **`onEditClick={setEditEmployee}` type compatibility** — `EmployeeTable` declares `onEditClick: (employee: EmployeeListDTO) => void`. `setEditEmployee` from `useEmployeeModals` is typed `(employee: EmployeeListDTO | null) => void`. TypeScript accepts this: a function expecting `EmployeeListDTO | null` can be used where a function expecting `EmployeeListDTO` is needed (the narrower argument type from the call site satisfies the wider parameter type). No cast required.
3. **`onSuccess` callbacks** — `setEditEmployee(null); refresh()` calls both `useEmployeeModals`'s setter and `useEmployeeList`'s `refresh`. These remain in the page (not inside `useEmployeeModals`) because they depend on two different hooks. This is the correct coordinator pattern.
4. **`useState` removal** — After this step, `EmployeesPage.tsx` imports no React hooks directly. All state is owned by `useEmployeeList` and `useEmployeeModals`. TypeScript will error if `useState` is removed but still referenced — confirmed no remaining references.
5. **`EmployeeListDTO` type removal** — After this step, `EmployeesPage.tsx` has no explicit `EmployeeListDTO` type annotation. The type flows through TypeScript's inference from `useEmployeeModals`'s return type. TypeScript will error if the type is removed but still referenced — confirmed no remaining references (`editEmployee` is inferred, modal prop types are checked against modal component signatures).

---

## Design Decisions

**Decision 1: `useEmployeeModals` encapsulates all three modal state pairs as a single hook (not three separate hooks)**
- **Why:** The three pairs (`editEmployee`, `deleteEmployee`, `createOpen`) share a single concern: "which modal on the Employees page is currently open." This is one reason to change (e.g., adding a fourth modal type requires adding one pair here, not three separate files). Splitting each state pair into its own hook (`useEditEmployeeModal`, `useDeleteEmployeeModal`, `useCreateModal`) would create three shallow pass-throughs that the deletion test condemns immediately. Grouping them in one hook respects SRP at the granularity of the concern ("modal visibility management for this page"), not at the granularity of the React primitive.
- **Alternatives considered:** Three separate single-state hooks — evaluated and rejected because each would own exactly one `useState` call (maximum shallowness, no depth); a combined `useEmployeePage` hook absorbing both `useEmployeeList` and modal state — evaluated and rejected because it would mix two independent responsibilities (list data fetching and modal state) and prevent independent testing of `useEmployeeList`.

**Decision 2: Modal success callbacks (`setEditEmployee(null); refresh()`) remain in `EmployeesPage`, not in `useEmployeeModals`**
- **Why:** The success callbacks depend on two separate hook calls (`setEditEmployee` from `useEmployeeModals` and `refresh` from `useEmployeeList`). Moving these callbacks into `useEmployeeModals` would require injecting `refresh` into the modal hook as a parameter — introducing a DIP violation (a state-management hook depending on a data-fetching function) and creating coupling between two otherwise independent hooks. The page is the correct coordinator for cross-hook side effects (this is exactly the coordinator role that remains after decomposition).
- **Alternatives considered:** Pass `refresh` as a parameter to `useEmployeeModals` and return pre-wired `onSuccess` callbacks — evaluated and rejected because it couples the modal hook to the list hook's interface; extracting a combined `useEmployeePage` hook — evaluated and rejected per Decision 1.

**Decision 3: `EmployeePagination` is not exported from `src/features/employees/index.ts`**
- **Why:** `EmployeePagination` is an internal implementation detail of `EmployeesPage`. It is not consumed outside this page. Exporting it from the barrel would suggest it is part of the feature's public API, inviting external usage and creating coupling between `EmployeesPage` internals and other features. Consistent with Decision 5 in Task 2 (card components not exported from `AppSettingsForm`'s feature barrel).
- **Alternatives considered:** Export for hypothetical future reuse in `ConversationsPage` — rejected; YAGNI. No second consumer exists.

**Decision 4: No new tests for this refactoring**
- **Why:** `EmployeesPage.tsx` has no existing test baseline. Adding tests for `useEmployeeModals` would test React's own `useState` contract (not feature behavior). Adding tests for `EmployeePagination`'s button disabled logic would test what the JSX was already doing before extraction — the tests would verify a structural relocation, not a behavior change. Per the TDD skill: "tests describe what the system does, not how it does it." The button disabled invariants are verified by manual validation of the Employees page in the browser. The existing 101 tests (including 10 `useEmployeeList` tests) are the regression safety net for the list data path; neither is broken by this structural decomposition. <!-- REVIEW-FIX: Corrected 9 → 10 for useEmployeeList test count -->
- **Alternatives considered:** `EmployeePagination.test.tsx` with tests for disabled states — evaluated; would require `@testing-library/react` `render` and `screen.getByRole` queries, which is available in the project. Rejected because: (1) the component is a verbatim JSX lift, not a behavior change; (2) adding tests for structural decomposition couples the test suite to implementation structure (which component renders the buttons) rather than behavior (that the employees page has navigation buttons with correct disabled states). Future test investment should wait until `EmployeePagination` gains non-trivial logic of its own.

**Decision 5: `EmployeeListDTO` type import removed from `EmployeesPage.tsx`**
- **Why:** After extracting `useEmployeeModals`, `EmployeesPage.tsx` has no explicit `EmployeeListDTO` annotation remaining. The type was only used in the `useState<EmployeeListDTO | null>` declarations, which have moved to `useEmployeeModals.ts`. TypeScript infers `editEmployee: EmployeeListDTO | null` from the hook's return type. Keeping the import would create an unused import warning under strict TypeScript settings and would mislead readers into thinking the page directly handles `EmployeeListDTO` values with explicit annotations.
- **Alternatives considered:** Keep the import as documentation — rejected; TypeScript itself documents the type via inference, and an unused import is noise.

---

## Testing Considerations

### Automatic Validation

- [x] `cd project/srcs/frontend && npm run typecheck` — 0 TypeScript errors. Verify after each step (3.1, 3.2, 3.3 individually). Specifically verify: (a) `setEditEmployee` from `useEmployeeModals` is assignable to `EmployeeTable`'s `onEditClick: (employee: EmployeeListDTO) => void` prop (setter accepts `EmployeeListDTO | null`; table call site passes `EmployeeListDTO` — the widened setter satisfies the narrower call); (b) no "unused import" TypeScript errors after removing `useState` and `EmployeeListDTO` from `EmployeesPage.tsx`. **Verified:** typecheck 0 errors after each of Steps 3.1, 3.2, 3.3 individually and after the full refactor.
- [x] `npm run test` — **101/101 pass** (0 failures, 0 skipped); same 17 test files. Specifically verify: `useEmployeeList.test.ts` (10 tests — Tests 1–9 plus Test 4a as a separate `it()` block, hook untouched), `useEditEmployee.test.ts` (9 tests, hook untouched), `AppSettingsForm.test.tsx` (5 tests, untouched). None of the 17 existing test files import from `EmployeesPage.tsx` or `useEmployeeModals.ts` or `EmployeePagination.tsx` — zero interference expected. <!-- REVIEW-FIX: Corrected useEmployeeList.test.ts count from 9 to 10; Test 4a ("does not include incomplete string filter values in page-change fetch") is a separate it() block, making the total 10 --> **Verified:** `Test Files 17 passed (17) | Tests 101 passed (101)`.
- [x] `npm run lint` — expected: same 5 pre-existing lint errors as after Task 2 (`button.tsx`, `sidebar.tsx`, `useAppSettings.ts`, `useEmployeeList.ts`, `use-mobile.ts`). The three new/modified files must produce 0 new errors. **Note:** the pre-existing `react-hooks/set-state-in-effect` error in `useEmployeeList.ts:100` is explicitly scoped to Phase 4 of the parent bug — this task does not touch `useEmployeeList.ts`. **Verified:** `npx eslint` on the three touched files (`useEmployeeModals.ts`, `EmployeePagination.tsx`, `EmployeesPage.tsx`) reports 0 errors and 0 warnings. Full-repo lint: 5 errors + 2 warnings — all pre-existing in unrelated files (the second warning is the pre-existing `useEmployeeList.ts:102:5` "Unused eslint-disable directive" — a follow-up cleanup note, not introduced by this task).
- [x] `npm run build` — Vite build succeeds. Expected bundle delta: ≤ +0.6 kB over Task 2 baseline of 512.31 kB / 167.60 kB gzip (2 new module declarations + their imports; JSX relocated from `EmployeesPage`, not added; `useState` and `EmployeeListDTO` imports removed from `EmployeesPage`). **Verified:** build success at **512.71 kB / 167.73 kB gzip** — delta **+0.40 kB / +0.13 kB gzip**, well within the ≤ +0.6 kB budget.

### Manual Validation

- [ ] Navigate to the Employees page in the browser (admin account, backend + frontend dev servers running). Confirm the page renders correctly: page heading, Create New button, filter bar, employee table, and pagination row all visible.
- [ ] Click the "Create New" button — confirm the Create Employee modal opens. Cancel it; confirm it closes.
- [ ] Click an Edit (pencil) icon on any employee row — confirm the Edit Employee modal opens with the correct employee pre-filled. Cancel; confirm it closes cleanly.
- [ ] Click a Delete icon on any employee row — confirm the Delete Employee modal opens with the correct employee name. Cancel; confirm it closes cleanly.
- [ ] Apply a filter (e.g., username contains "adm"), confirm the employee list updates with the debounce; then use the Next/Previous buttons — confirm pagination works with the filter active.
- [ ] On a list with > 1 page, navigate to the last page and confirm the Next button is disabled.
- [ ] Navigate to page 0 (first page) and confirm the Previous button is disabled.
- [ ] Confirm the employee count reads correctly: "1 employee" (singular) or "N employees" (plural).
- [ ] Edit an employee (change username or toggle enabled) and save — confirm the modal closes and the employee list refreshes (`refresh()` called from `onSuccess`).
- [ ] Delete an employee and confirm — confirm the modal closes and the list refreshes.

---

## Related Code Explanations

- `src/pages/EmployeesPage.tsx` — the page being decomposed; post-task it is a thin composition layer (~65 lines) delegating modal state to `useEmployeeModals` and pagination rendering to `EmployeePagination`
- `src/features/employees/hooks/useEmployeeModals.ts` — new; owns the three modal state pairs; exports `UseEmployeeModalsResult`
- `src/features/employees/components/EmployeePagination.tsx` — new; owns Previous/count/Next pagination row rendering; 5-prop ISP-compliant interface
- `src/features/employees/hooks/useEmployeeList.ts` — unchanged; `UseEmployeeListResult` provides `currentPage`, `totalPages`, `totalElements`, `isLoading`, `onPageChange` that `EmployeePagination` needs
- `src/features/employees/components/EditEmployeeModal.tsx` — consumer of `editEmployee` and `setEditEmployee` from `useEmployeeModals`; unchanged
- `src/features/employees/components/DeleteEmployeeModal.tsx` — consumer of `deleteEmployee` and `setDeleteEmployee` from `useEmployeeModals`; unchanged
- `src/features/employees/components/CreateEmployeeModal.tsx` — consumer of `createOpen` and `setCreateOpen` from `useEmployeeModals`; unchanged

---

## Completion Criteria

- [x] Parent document [[Frontend-Code-Quality-Fallow-Health-Refactor]] reviewed and reflected accurately in this task
- [x] `src/features/employees/hooks/useEmployeeModals.ts` created: exports `useEmployeeModals()` and `UseEmployeeModalsResult` interface; 3 `useState` calls; 6-member return object
- [x] `src/features/employees/components/EmployeePagination.tsx` created: 5-prop ISP-compliant interface; verbatim pagination JSX from original `EmployeesPage.tsx` lines 73–98
- [x] `src/pages/EmployeesPage.tsx` modified: `useState` import removed; `EmployeeListDTO` type import removed; `useEmployeeModals` and `EmployeePagination` imports added; 3 inline useState calls replaced with `useEmployeeModals()` destructuring; inline pagination div replaced with `<EmployeePagination>` call
- [x] Modal success callbacks (`setEditEmployee(null); refresh()` etc.) remain in `EmployeesPage` — not moved into `useEmployeeModals`
- [x] `src/features/employees/index.ts` unchanged — neither `useEmployeeModals` nor `EmployeePagination` exported from the feature barrel
- [x] `npm run typecheck` → 0 errors (verify after each of the 3 steps)
- [x] `npm run test` → 101/101 pass; all 17 existing test files pass without modification
- [x] `npm run lint` → 0 new errors; same 5 pre-existing errors unchanged
- [x] `npm run build` → success; bundle delta ≤ +0.6 kB over Task 2 baseline (512.31 kB) — actual delta +0.40 kB
- [x] Manual validation steps documented above for the user to execute
- [ ] Phase 3 Steps 3.1–3.3 in [[Frontend-Code-Quality-Fallow-Health-Refactor]] marked `[x]` after execution (out of scope for this task; belongs to the parent bug's step-checklist)

---

## Post-Review Notes

### Autonomous review summary

Reviewed the 3 files created/modified by this task. Findings: **0 bugs, 0 architectural issues, 0 correctness gaps, 0 test gaps, 0 documentation accuracy issues.** No patches required.

**Verification highlights:**
- Type compatibility for `setEditEmployee: (e: EmployeeListDTO | null) => void` → `EmployeeTable.onEditClick: (e: EmployeeListDTO) => void` is satisfied by TypeScript function parameter contravariance (wider parameter type is assignable to a narrower call site). TypeScript 5.9.3 accepts this without cast.
- All 17 existing test files pass without modification — none import from the 3 touched files; structural decomposition is invisible to the test suite.
- ESLint clean on all 3 touched files. Full-repo lint: 5 errors + 2 warnings, all pre-existing in files outside this task's scope.
- Build bundle delta: +0.40 kB / +0.13 kB gzip, well within the ≤ +0.6 kB budget.

### Observations (not defects)

- **`EmployeesPage.tsx` line count:** post-refactor the page is 112 lines (was 126). The task estimated ~65 lines; actual is higher because the three modal mount blocks (5-line JSX each) and their imports (~3 lines each) remain in the page. This is correct — moving them would require either coupling `useEmployeeModals` to the modal components' prop contracts (DIP violation) or extracting a "modals" sub-component (out of scope; would create a fourth extraction unit that adds little value when the page is already a thin composer). The CRAP-score-relevant concern (modal state management and inline pagination rendering) is fully resolved.
- **Pre-existing lint warning discovered:** `useEmployeeList.ts:102:5` — `// eslint-disable-next-line react-hooks/exhaustive-deps` is now flagged as "Unused eslint-disable directive (no problems were reported from 'react-hooks/exhaustive-deps')". This is a follow-up cleanup: the disable comment was added for `fetchEmployees` which is no longer reported missing. Out of scope for this task (this task does not touch `useEmployeeList.ts`); flagged for Phase 4 of the parent bug where `useEmployeeList` is decomposed.

### Deviations from task spec

None. The implementation follows the task doc's structure, design decisions, and code snippets exactly. The only addition is a 1-line header comment and a multi-line docstring on `useEmployeeModals` (also present in the task doc's spec — preserved verbatim).
