# Task: Create Employee Modal — Task 3: Modal Component + Page Wiring + Regression

#task #current #low-complexity #parent-create-employee-modal

**Parent:** [[Create-Employee-Modal]]
**Parent Type:** Feature
**Related Step(s):** Phase 3 — Steps 3.1, 3.2, 3.3, 3.4
**Estimated Complexity:** Low

---

## Goal

Create the `CreateEmployeeModal` display component, wire it into `EmployeesPage` with a "Create New" button, verify `index.ts` requires no barrel changes, and confirm regression (80/80 tests, 0 typecheck errors, build success). This closes the Create Employee Modal feature.

---

## Parent Context

The Create Employee Modal feature adds a "Create New" button and modal form to the admin `/employees` page. Tasks 1 and 2 completed the data layer (types, service adapter) and the business-logic layer (`useCreateEmployee` hook). Task 3 is the structural phase: pure display component and page wiring. No new business logic and no new tests are introduced here.

**Parent specifies the following for this task:**

**Step 3.1 — `CreateEmployeeModal.tsx`:** A pure display modal with two props (`onClose`, `onSuccess`). It internally calls `useCreateEmployee(onSuccess)` to get all form state and actions. Fields in order: Username* (required), Password* (required, `type="password"`), First Name (optional), Last Name (optional), Email* (required). Required fields carry an asterisk indicator in the label. No `enabled` toggle — new employees are always created enabled. Inline error displayed when `error` is non-null. Footer: Cancel (outline) + Create (disabled while `isSubmitting`, toggles "Creating…" / "Create"). Controlled Dialog pattern: `<Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>`. The modal is conditionally mounted by its parent — unmounting on close resets all hook state automatically.

**Step 3.2 — `EmployeesPage.tsx`:** Add `createOpen: boolean` state. Change the heading `<div>` to a flex row (`flex items-start justify-between`) with the title/subtitle on the left and a "Create New" `<Button>` with a `<Plus>` icon on the right. Add `Plus` to the `lucide-react` import. Add `CreateEmployeeModal` value import. Conditionally mount `CreateEmployeeModal` with `onClose={() => setCreateOpen(false)}` and `onSuccess={() => { setCreateOpen(false); refresh() }}`.

**Step 3.3 — `index.ts`:** Verify whether `EmployeeCreateForm` and `EmployeeMiniDTO` need re-exporting externally. `CreateEmployeeModal` is imported directly (not through the barrel). Likely a no-op.

**Step 3.4 — Regression:** `npm run typecheck` = 0 errors; `npm run test` = 80/80 (the 80-test baseline from Task 2 is maintained, no new tests); `npm run build` = success.

**Parent-specified constraint:** No changes to `useEmployeeList`, `EmployeeFilterBar`, `EmployeeTable`, pagination, or the existing edit/delete modal wiring. All changes to `EmployeesPage.tsx` are additive.

---

## Preconditions / Dependencies

- Task 1 fully executed: `EmployeeCreateForm` and `EmployeeMiniDTO` in `types.ts`; `createEmployee` in `employeeService.ts`; all-exports `vi.mock` factories updated in `useEditEmployee.test.ts` and `useDeleteEmployee.test.ts`.
- Task 2 fully executed: `useCreateEmployee.ts` and `useCreateEmployee.test.ts` created; 80/80 tests passing, 0 typecheck errors, build success.
- `src/features/employees/hooks/useCreateEmployee.ts` exports `useCreateEmployee(onSuccess: () => void)` returning 13 properties: `username`, `setUsername`, `password`, `setPassword`, `firstName`, `setFirstName`, `lastName`, `setLastName`, `email`, `setEmail`, `isSubmitting`, `error`, `onSubmit`.
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter` are available from `@/components/ui/dialog` (confirmed from the existing modal components).
- `Button` is already imported in `EmployeesPage.tsx` from `@/components/ui/button`.
- `lucide-react` is installed at `^1.21.0`; `Plus` is available but not yet imported anywhere in the feature area (existing imports use `Pencil`, `Trash2` in `EmployeeTable.tsx`).
- `verbatimModuleSyntax: true` in `tsconfig.app.json` — type-only imports must use `import type`; runtime function imports must be value imports.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — **Selected** — governs task creation, file placement, and doc updates.
- `solid-deep-design` — **Selected** — validates `CreateEmployeeModal` as a pure display deep module; ensures `EmployeesPage` modification is purely additive (OCP).
- `tdd` — **Selected** — confirms no new tests are required for structural modules; defines the regression validation plan.
- `memory-bank` — **Selected** — project context loaded at session start.
- `find-docs` — **Selected** — patterns verified against existing modal components in the codebase (no additional library queries needed; Dialog, Button, Input, Label patterns are already established).
- `react-best-practices` — Not needed — no new patterns introduced; this task replicates existing modal structure exactly.
- `shadcn-component-review` — Not needed — all shadcn components used here (`Dialog`, `Input`, `Label`, `Button`) are already in use in `EditEmployeeModal.tsx` and `DeleteEmployeeModal.tsx` with confirmed working patterns.

### Documentation Reviewed

- `src/features/employees/components/EditEmployeeModal.tsx` — canonical pattern for the Dialog structure, field layout (`flex flex-col gap-3` / `flex flex-col gap-1`), error display, footer button pattern, and controlled `open` + `onOpenChange` wiring. `CreateEmployeeModal` replicates this structure minus the `enabled` toggle and with different field IDs.
- `src/features/employees/components/DeleteEmployeeModal.tsx` — confirms `Dialog open onOpenChange` pattern and the "Deleting…" / "Delete" button label toggle; `CreateEmployeeModal` follows the same label-toggle pattern ("Creating…" / "Create").
- `src/pages/EmployeesPage.tsx` — confirmed existing heading structure (`<div>` wrapping h1 + p), existing `editEmployee`/`deleteEmployee` state pattern, existing `Button` import, and `refresh()` call on success. The `createOpen` boolean state and "Create New" button follow these patterns.
- `src/features/employees/components/EmployeeTable.tsx` — confirmed `lucide-react` import pattern: `import { Pencil, Trash2 } from "lucide-react"`. The `Plus` icon follows the same named import.
- `documentation/Docs/API-Reference/Employee.md` — confirmed `POST /employee` requires `username`, `email`, `password`; `firstName`/`lastName` are optional. Response is 200 with `EmployeeMiniDTO`. Consistent with `EmployeeCreateForm` and `EmployeeMiniDTO` types added in Task 1.
- `documentation/ADRs/ADR-010-base-ui-over-radix-ui-for-frontend.md` — `shadcn/ui 4.7.0` in this project uses `@base-ui/react` not Radix; the Dialog component wrappers in `@/components/ui/dialog` abstract this — no change to how Dialog is consumed by feature components.

### Related Existing Code

- `src/features/employees/hooks/useCreateEmployee.ts` — the hook `CreateEmployeeModal` calls; its 13-property result is destructured inside the modal.
- `src/features/employees/components/EditEmployeeModal.tsx` — direct structural template for `CreateEmployeeModal`.
- `src/features/employees/components/DeleteEmployeeModal.tsx` — supplemental reference for the button label toggle pattern.
- `src/pages/EmployeesPage.tsx` — the file modified in Step 3.2; heading section, state declarations, and modal mounts are the specific locations.
- `src/features/employees/index.ts` — the barrel; checked in Step 3.3 to confirm no re-exports are needed.
- `src/components/ui/dialog.tsx:144-155` — confirms `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter` are exported (plus `DialogClose`, `DialogDescription`, `DialogOverlay`, `DialogPortal`, `DialogTrigger` — the modal uses only the five confirmed exports).

---

## Implementation Details

### Approach

Task 3 is purely structural. All business logic is already in `useCreateEmployee`. The task introduces two files of change:

1. **New file** — `CreateEmployeeModal.tsx`: a pure display module that receives `onClose` and `onSuccess` via props, instantiates `useCreateEmployee(onSuccess)`, and renders the Dialog UI. No state of its own. No error handling logic of its own. The component calls `void onSubmit()` on the Create button click — matching the `void onSave()` / `void onConfirm()` pattern used in the existing modals.

2. **Modified file** — `EmployeesPage.tsx`: additive changes only. The heading `<div>` gains a flex-row layout. A `<Button>` with `<Plus>` icon is added. A `createOpen` boolean state controls the conditional mount. The `CreateEmployeeModal` import is added. No existing logic is touched.

**SOLID + Deep Module analysis for `CreateEmployeeModal`:**

- **SRP**: One reason to change — the visual structure of the create form. All state management, payload construction, and error lifecycle are in `useCreateEmployee`. If the form layout changes (reordering fields, adding a new optional field), only this component changes. If the submit logic changes, only the hook changes.
- **OCP**: The existing modal components (`EditEmployeeModal`, `DeleteEmployeeModal`) are untouched. `CreateEmployeeModal` is an entirely new module that follows the established extension pattern.
- **DIP**: The component depends on `useCreateEmployee` (a domain-level abstraction), not on `createEmployee` service or axios directly.
- **Depth**: Interface = 2 props (`onClose`, `onSuccess`). Implementation renders the full modal UI, delegates all logic to the hook. The deletion test passes — removing `CreateEmployeeModal` would force `EmployeesPage` to inline the entire Dialog JSX tree, scattering display concerns into the page component.

**SOLID analysis for `EmployeesPage.tsx` modification:**

- **OCP**: All changes to `EmployeesPage` are additive. The existing `editEmployee` / `deleteEmployee` state, the `EmployeeFilterBar`, `EmployeeTable`, pagination row, and the existing edit/delete modal mounts are completely unchanged.
- **SRP**: `createOpen` is the minimal state required to control the modal mount — a boolean, not a nullable entity, because the create flow needs no seed data.

**Why `createOpen: boolean` instead of `createEmployee: true | null`:**

The `editEmployee` and `deleteEmployee` states use `EmployeeListDTO | null` because the modals need the employee record to pre-fill the form and to identify the target. `CreateEmployeeModal` takes no employee data — the form always starts blank. A boolean is the minimal, semantically correct controller for a "is this modal open?" question with no associated data payload.

**Form reset on close:**

`CreateEmployeeModal` is conditionally mounted: `{createOpen && <CreateEmployeeModal ... />}`. When `onClose()` is called (Cancel button, Esc key, or backdrop click), the parent sets `createOpen = false`, React unmounts the component, and all `useState` inside `useCreateEmployee` is garbage-collected. Re-opening starts with fresh empty state. This requires zero explicit reset logic — it is the same mechanism used by `EditEmployeeModal` and `DeleteEmployeeModal`.

**Required field asterisks:**

The parent requires asterisks in the labels for Username, Password, and Email. The convention used in this task is to append ` *` inside the `<Label>` text: e.g., `<Label htmlFor="create-username">Username *</Label>`. This is purely visual — no `required` attribute is added to the inputs; validation is backend-delegated (consistent with the edit modal).

### Files to Create/Modify

- [ ] `src/features/employees/components/CreateEmployeeModal.tsx` — **Create**: pure display modal (Step 3.1)
- [ ] `src/pages/EmployeesPage.tsx` — **Modify**: heading flex row + "Create New" button + `createOpen` state + modal import + conditional mount (Step 3.2)
- [ ] `src/features/employees/index.ts` — **Verify**: confirm no barrel re-export changes are needed (Step 3.3 — expected no-op)

---

## Step-by-Step Implementation

### Step 3.1: Create `CreateEmployeeModal.tsx`

**Goal:** Implement the pure display component that renders the create employee Dialog, delegating all state and submit logic to `useCreateEmployee`.
**Dependencies:** `useCreateEmployee.ts` must exist (Task 2 complete). `@/components/ui/dialog`, `@/components/ui/button`, `@/components/ui/input`, `@/components/ui/label` must be available (confirmed — all used by `EditEmployeeModal`).

- [ ] Create `src/features/employees/components/CreateEmployeeModal.tsx` with the full content below
- [ ] Run `npm run typecheck` from `project/srcs/frontend/` — expect **0 errors**

**Why this step is critical:**
`CreateEmployeeModal` is the UI entry point for the create flow. It must render all form fields, display errors from the hook, and correctly call `onClose()` on cancel and `void onSubmit()` on submit. The controlled Dialog pattern (`open` + `onOpenChange`) ensures that Esc keypresses and backdrop clicks also trigger `onClose()`, which unmounts the component and resets all hook state.

#### Implementation

```tsx
import { useCreateEmployee } from "../hooks/useCreateEmployee"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface CreateEmployeeModalProps {
  onClose: () => void
  onSuccess: () => void
}

export function CreateEmployeeModal({
  onClose,
  onSuccess,
}: CreateEmployeeModalProps) {
  const {
    username, setUsername,
    password, setPassword,
    firstName, setFirstName,
    lastName, setLastName,
    email, setEmail,
    isSubmitting,
    error,
    onSubmit,
  } = useCreateEmployee(onSuccess)

  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Employee</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="create-username">Username *</Label>
            <Input
              id="create-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="create-password">Password *</Label>
            <Input
              id="create-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="create-firstName">First Name</Label>
            <Input
              id="create-firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="create-lastName">Last Name</Label>
            <Input
              id="create-lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="create-email">Email *</Label>
            <Input
              id="create-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => void onSubmit()}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

#### Edge Cases

1. **`void onSubmit()` vs `onSubmit()`** — `onSubmit()` returns `Promise<void>`. Calling it without `void` inside `onClick` would create a floating promise that the React event system doesn't await. `void onSubmit()` explicitly discards the Promise, matching the `void onSave()` / `void onConfirm()` pattern in `EditEmployeeModal` and `DeleteEmployeeModal`. This is not a lint bypass — it is the correct pattern for async actions in onClick handlers.

2. **No `DialogDescription` import** — `CreateEmployeeModal` does not include a `DialogDescription`. This is intentional: the form fields are self-explanatory and the modal title "Create Employee" is sufficient context. The import is omitted to avoid the shadcn/a11y lint warning that appears when `DialogContent` is rendered without `DialogDescription` or `DialogTitle` — `DialogTitle` is present, satisfying the requirement.

3. **Esc / backdrop closes via `onOpenChange`** — The `<Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>` pattern delegates all close triggers (Cancel button click, Esc keypress, outside-click) to the same `onClose()` handler. This ensures form state always resets on close, regardless of which close mechanism the user uses.

4. **`type="email"` on Email input** — The `email` field uses `type="email"` for browser-native format validation (prevents form submission with obviously malformed emails). This is consistent with `EditEmployeeModal`'s email field. The backend still validates email format server-side; the `type="email"` attribute is a UX enhancement only.

5. **No `placeholder` on Password** — The Password field has no `placeholder` attribute. In the edit modal the placeholder reads "Leave blank to keep current password" — that contextual hint is specific to the edit semantics. In the create modal, password is simply a required field. No placeholder is cleaner and avoids the hint being read as optional.

6. **Required field asterisks are visual-only** — No `required` attribute is added to the `<Input>` elements. Backend validation is the authoritative source of required-field enforcement (returns 400 with a descriptive message). Frontend asterisks are visual indicators only, consistent with the parent's "no client-side field-by-field validation" constraint.

7. **Field IDs use `create-` prefix** — IDs `create-username`, `create-password`, `create-firstName`, `create-lastName`, `create-email` are distinct from the edit modal's `edit-*` IDs. While both modals are never simultaneously mounted, distinct IDs prevent any theoretical DOM ID collision and make the markup unambiguous in browser dev tools.

---

### Step 3.2: Modify `EmployeesPage.tsx`

**Goal:** Add the `createOpen` boolean state, a "Create New" button in a flex-row heading layout, the `CreateEmployeeModal` import, and the conditional modal mount. All existing logic remains unchanged.
**Dependencies:** `CreateEmployeeModal.tsx` must exist (Step 3.1 complete).

- [ ] Add `createOpen` state declaration below the existing `editEmployee`/`deleteEmployee` state
- [ ] Add `Plus` to the `lucide-react` import (new import line)
- [ ] Add `CreateEmployeeModal` import line alongside the existing modal imports
- [ ] Replace the heading `<div>` with a flex-row `<div className="flex items-start justify-between">`
- [ ] Add the "Create New" `<Button>` with `<Plus className="size-4" />` inside the flex row
- [ ] Add `{createOpen && <CreateEmployeeModal ... />}` conditional mount after the existing delete modal mount
- [ ] Run `npm run typecheck` from `project/srcs/frontend/` — expect **0 errors**

**Why this step is critical:**
This is the wiring step that makes the feature visible to admins. The `createOpen` boolean is the simplest state that controls the modal's mount lifecycle. The flex-row heading layout is an additive CSS change that does not affect the filter bar, table, or pagination. The `onSuccess` callback chains `setCreateOpen(false)` (unmounting the modal) with `refresh()` (re-fetching the current page), ensuring the new employee appears in the list without losing the admin's current filter/pagination state.

#### Implementation

<!-- REVIEW-FIX: Replaced "FULL updated" documentation label with the actual file-path comment that exists in the original file, preserving the codebase's top-of-file comment convention and avoiding ambiguity for the executor. -->
```tsx
// src/pages/EmployeesPage.tsx

import { useState } from "react"
import { useEmployeeList } from "@/features/employees"
import { EmployeeTable } from "@/features/employees/components/EmployeeTable"
import { EmployeeFilterBar } from "@/features/employees/components/EmployeeFilterBar"
import { EditEmployeeModal } from "@/features/employees/components/EditEmployeeModal"
import { DeleteEmployeeModal } from "@/features/employees/components/DeleteEmployeeModal"
import { CreateEmployeeModal } from "@/features/employees/components/CreateEmployeeModal"
import { ErrorMessage } from "@/components/common/ErrorMessage"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import type { EmployeeListDTO } from "@/features/employees"

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

  const [editEmployee, setEditEmployee] = useState<EmployeeListDTO | null>(null)
  const [deleteEmployee, setDeleteEmployee] = useState<EmployeeListDTO | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

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

1. **`createOpen` is boolean, not `EmployeeListDTO | null`** — The edit and delete modals use `EmployeeListDTO | null` because they need an employee record to pre-fill forms and identify the target. The create modal starts blank and takes no employee data. A boolean is the minimal correct state; `null` would require a non-null assertion inside the conditional, adding unnecessary noise.

2. **`createOpen` state declared after `editEmployee`/`deleteEmployee`** — The `useState` hooks are declared in a stable order. New state is appended after existing state, not inserted between them. This avoids React hook ordering issues (all hooks must be called in the same order on every render) and minimizes the diff.

3. **`onSuccess={() => { setCreateOpen(false); refresh() }}`** — `setCreateOpen(false)` is called before `refresh()` to unmount the modal before the list re-fetch begins. This is consistent with `useCreateEmployee.onSubmit()` already calling `setIsSubmitting(false)` before `onSuccess()` — state resets flow from inside out (hook → modal → page) to prevent React "state update on unmounted component" warnings.

4. **`Plus` from `lucide-react` is a new import in `EmployeesPage.tsx`** — The existing `EmployeesPage.tsx` has no `lucide-react` import. `Plus` must be added as a new import line (not merged into another file's existing lucide import). The import is a named import matching the pattern in `EmployeeTable.tsx`.

5. **`CreateEmployeeModal` always visible regardless of filter/pagination** — The "Create New" button is in the page heading, which renders before the filter bar and table. It is therefore always visible regardless of error state, empty results, or pagination position. This matches user story 2: "the Create New button should always be visible at the top right of the page."

6. **No cursor-changing state when an error is displayed** — When `error` is truthy, `EmployeesPage` replaces the table with `<ErrorMessage>`. The heading (with "Create New") is still rendered above the filter bar, so the button remains accessible even during an API error state.

---

### Step 3.3: Verify `index.ts` — Barrel Re-export Check

**Goal:** Confirm that `EmployeeCreateForm`, `EmployeeMiniDTO`, and `CreateEmployeeModal` do not need to be re-exported from `index.ts`.
**Dependencies:** None (read-only verification step).

- [ ] Read `src/features/employees/index.ts`
- [ ] Verify `CreateEmployeeModal` is imported directly by `EmployeesPage.tsx` (via `@/features/employees/components/CreateEmployeeModal`), not through the barrel — no barrel change needed
- [ ] Verify `EmployeeCreateForm` and `EmployeeMiniDTO` are not used by any consumer outside `features/employees/` — no re-export needed
- [ ] If the above verifications hold, leave `index.ts` unchanged

**Why this step is critical:**
The feature document flags Step 3.3 as "may be no-op." Confirming it is a no-op prevents an unnecessary barrel change that would expand the feature's public API surface without a consumer. The barrel currently exports only what `EmployeesPage` needs from the feature module: `useEmployeeList`, `EmployeeListDTO`, `FilterField`, `PageEnvelope`. All other imports from the feature (modal components, hooks, service functions, types) are done via direct deep imports inside `EmployeesPage.tsx` and the feature's own files — consistent with the codebase's convention of keeping the barrel minimal.

#### Edge Cases

1. **`EmployeeCreateForm` is only used inside `features/employees/`** — Specifically in `employeeService.ts` (parameter type) and `useCreateEmployee.ts` (payload type). No external consumer reads it from the barrel. Re-exporting it would expose an internal implementation type unnecessarily.

2. **`CreateEmployeeModal` imported via deep path, not barrel** — `EmployeesPage.tsx` imports `EditEmployeeModal` and `DeleteEmployeeModal` via `@/features/employees/components/...` (deep import), not through `@/features/employees`. `CreateEmployeeModal` follows the same pattern. The barrel is reserved for the few types and hooks that truly need to be a stable public API.

---

### Step 3.4: Regression Verification

**Goal:** Confirm that the feature closes cleanly — all 80 existing tests still pass, no typecheck errors, build succeeds.
**Dependencies:** Steps 3.1, 3.2, and 3.3 complete.

- [ ] Run `npm run typecheck` from `project/srcs/frontend/` — expect **0 errors**
- [ ] Run `npm run test` from `project/srcs/frontend/` — expect **80/80** tests passing across all test files (80 baseline established in Task 2; no new tests are added in Task 3)
- [ ] Run `npm run build` from `project/srcs/frontend/` — expect success; bundle will be slightly larger than the Task 2 baseline because `CreateEmployeeModal.tsx` is now imported into the render tree

**Why this step is critical:**
Task 3 introduces two files that enter the render tree for the first time in this feature: `CreateEmployeeModal.tsx` and the updated `EmployeesPage.tsx`. The build step verifies that the import graph resolves correctly (no circular imports, no unresolved modules, no unused imports that trigger `noUnusedLocals`). The typecheck step confirms that the hook's 13-property destructure in `CreateEmployeeModal`, the `Plus` icon usage, and the `createOpen` boolean state are all correctly typed. The test step confirms that the structural additions have not broken any existing test's import resolution or mock setup.

#### Edge Cases

1. **`useCreateEmployee.test.ts` remains at 80 total (not 84)** — Task 3 adds zero new test files. The 80 tests established in Task 2 are the final count for the feature. The structural modules (`CreateEmployeeModal`, `EmployeesPage` wiring) are verified by typecheck + build + manual browser validation, not unit tests.

2. **Bundle size increase is expected and bounded** — `CreateEmployeeModal.tsx` adds a small component to the JS bundle (Dialog, form fields, button — all already in the bundle from `EditEmployeeModal.tsx`). Tree-shaking ensures only `Plus` is newly added from `lucide-react`. The size delta should be minimal (tens of bytes for the `Plus` SVG path + the component JSX).

3. **`noUnusedLocals` TypeScript flag** — All imports in both files are actively used. `Plus` is used in the JSX. `CreateEmployeeModal` is used in the conditional mount. `createOpen` is read in the condition. If any import were unused, `npm run typecheck` would fail.

---

## Design Decisions

**Decision 1: `createOpen: boolean` state (not `EmployeeListDTO | null`)**
- **Why:** The create modal needs no employee seed data — the form is always blank. A boolean is semantically precise: "is the create modal open?" The `null`-based pattern used for edit/delete carries an implicit entity payload that is irrelevant here. Using `boolean` makes the intent explicit and requires no non-null assertions.
- **Alternatives considered:** `useState<true | null>(null)` to align visually with the other states — rejected. A boolean expresses "open/closed" better than a nullable truthy sentinel. TypeScript knows `true | null` is a boolean in disguise; using `boolean` is cleaner.

**Decision 2: `CreateEmployeeModal` not re-exported from `index.ts`**
- **Why:** The barrel (`index.ts`) is a stable public API for consumers outside `features/employees/`. `EmployeesPage.tsx` is the only consumer of `CreateEmployeeModal`, and it imports it via deep path (consistent with how it imports `EditEmployeeModal` and `DeleteEmployeeModal`). Adding `CreateEmployeeModal` to the barrel would expand the public surface without a consumer, violating ISP (no client should depend on interfaces it doesn't use).
- **Alternatives considered:** Re-exporting all modal components from the barrel — rejected because the barrel would then expose all internal display components, blurring the boundary between the feature's public API and its internal structure.

**Decision 3: `{createOpen && <CreateEmployeeModal ... />}` conditional mount (not `open` prop)**
- **Why:** Conditional mount (`&&`) automatically resets all `useCreateEmployee` hook state when the modal closes, because React unmounts the component and discards its state. An alternative — keeping the modal always mounted and passing an `open` prop — would require an explicit `reset()` function in `useCreateEmployee` to clear form state on each open. The conditional mount approach is simpler, less error-prone, and consistent with `EditEmployeeModal` and `DeleteEmployeeModal` (both use the `employee && ...` pattern which has the same conditional-mount behavior).
- **Alternatives considered:** Always-mounted modal with an `open` prop and explicit form reset — rejected. Adding a `reset()` function to `useCreateEmployee` would expand the hook's interface and introduce a new caller responsibility. The conditional mount is zero-overhead and semantically clearer.

**Decision 4: `onSuccess(() => { setCreateOpen(false); refresh() })` — close before refresh**
- **Why:** `setCreateOpen(false)` unmounts `CreateEmployeeModal` before `refresh()` triggers the list re-fetch. If `refresh()` were called first, the in-progress network request would complete while `useCreateEmployee` is still mounted, potentially triggering state updates on an about-to-unmount component. Closing first ensures the component unmounts cleanly before any async side effects from `refresh()` propagate.
- **Alternatives considered:** `refresh()` first, then `setCreateOpen(false)` — rejected for the unmounted-component reason above.

**Decision 5: "Create New" button with `Plus` icon uses default `<Button>` variant (not `outline`)**
- **Why:** The default (primary-colored) button is the strongest visual affordance for the primary action on the page — creating a new employee. The "Previous" / "Next" pagination buttons use `variant="outline"` because they are secondary actions. A primary-colored "Create New" button clearly signals the most important action on the page.
- **Alternatives considered:** `variant="outline"` for visual lightness — rejected; the "Create New" button is the only primary CTA on this page and should be visually prominent.

**Decision 6: `flex items-start justify-between` for the heading row**
- **Why:** `items-start` aligns the button to the top of the heading block (not vertically centered with the two-line h1+p group). This prevents the button from floating to the vertical midpoint of a tall heading block. The parent document specifies this exact class combination. `justify-between` pushes the title to the left and the button to the right.
- **Alternatives considered:** `items-center` — rejected; vertically centering the button against a two-line text block looks misaligned when the font sizes differ between h1 and p.

---

## Testing Considerations

### Automatic Validation

**Step 3.1 typecheck gate:**
- [ ] Run `npm run typecheck` from `project/srcs/frontend/` — expect **0 errors** (confirms `useCreateEmployee` destructure, Dialog imports, and component props are correctly typed)

**Step 3.2 typecheck gate:**
- [ ] Run `npm run typecheck` from `project/srcs/frontend/` — expect **0 errors** (confirms `createOpen` boolean state, `Plus` icon usage, `CreateEmployeeModal` import, and `onClose`/`onSuccess` prop signatures)

**Step 3.4 regression gates (all run from `project/srcs/frontend/`):**
- [ ] Run `npm run typecheck` — expect **0 errors**
- [ ] Run `npm run test` — expect **80/80** tests passing (baseline preserved; no new tests added in Task 3)
- [ ] Run `npm run build` — expect **success** (bundle size increases slightly vs. Task 2 baseline; `Plus` icon path + `CreateEmployeeModal` JSX are newly bundled)

### Manual Validation

The following manual checks must be performed in a running browser session. Start the dev server (`npm run dev` from `project/srcs/frontend/`) and log in as an admin.

**"Create New" button presence:**
- [x] Navigate to `/employees` — confirm the page heading row shows "Employees" title on the left and a "Create New" button (with `+` icon) on the right
- [x] Confirm the button is visible regardless of the current filter selection
- [x] Confirm the button is visible on all pagination pages

**Create modal — open / close:**
- [x] Click "Create New" — confirm the modal opens with the title "Create Employee" and all fields blank
- [x] Press Esc — confirm the modal closes and the form resets on next open
- [x] Click the backdrop (outside the dialog) — confirm the modal closes
- [x] Click "Cancel" — confirm the modal closes

**Create modal — field layout:**
- [x] Confirm the field order: Username * → Password * → First Name → Last Name → Email *
- [x] Confirm that Username, Password, and Email labels show an asterisk (`*`) and First Name / Last Name labels do not
- [x] Confirm the Password field masks input (`type="password"`)
- [x] Confirm the Email field shows browser email-format validation hints (`type="email"`)

**Create modal — submission with all fields filled:**
- [x] Fill in all 5 fields with valid, unique values and click "Create"
- [x] Confirm the Create button shows "Creating…" and is disabled while the request is in flight
- [x] Confirm the modal closes on success
- [x] Confirm the new employee appears in the list without a full page reload
- [x] Confirm the admin remains on the current page (does not jump to page 1)

**Create modal — submission with only required fields:**
- [x] Open the modal, fill only Username, Password, and Email (leave First Name and Last Name blank), click "Create"
- [x] Confirm success: modal closes, new employee appears in list

**Create modal — backend validation errors:**
- [x] Attempt to create an employee with a username already taken — confirm the modal stays open and shows the backend error message inline (e.g., "Username already taken" or similar)
- [x] Attempt to create an employee with an email already registered — confirm the inline error displays correctly
- [x] Correct the field value and resubmit — confirm success

**Create modal — empty required fields:**
- [x] Attempt to submit with Username blank — confirm the backend returns a 400 and the error message appears inline in the modal
- [x] Attempt to submit with Password blank — confirm the same inline error behavior

---

## Related Code Explanations

- `src/features/employees/hooks/useCreateEmployee.ts` — the hook `CreateEmployeeModal` calls; its full interface (5 field pairs + `isSubmitting` + `error` + `onSubmit`) is destructured inside the modal
- `src/features/employees/components/EditEmployeeModal.tsx` — direct structural template; `CreateEmployeeModal` replicates the Dialog pattern, field layout classes, error paragraph, and footer button pattern
- `src/features/employees/components/DeleteEmployeeModal.tsx` — supplemental reference for the button label-toggle pattern ("Deleting…" / "Delete" → "Creating…" / "Create")
- `src/pages/EmployeesPage.tsx` — the page modified in Step 3.2; the heading section (lines 37-40) is replaced with the flex row; the three existing modal mounts serve as the structural template for the new conditional mount
- `src/features/employees/index.ts` — the barrel; confirmed unchanged in Step 3.3

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected for this task
- [x] Up-to-date documentation reviewed for the affected technologies (Dialog pattern from `EditEmployeeModal.tsx`, `DeleteEmployeeModal.tsx`; `Plus` from `lucide-react ^1.21.0`; API reference confirming POST /employee response)
- [x] `src/features/employees/components/CreateEmployeeModal.tsx` created with: `Dialog open onOpenChange` pattern; 5 fields in order (Username*, Password*, First Name, Last Name, Email*); asterisks on required labels only; inline error paragraph; Cancel (outline) + Create (disabled when isSubmitting, "Creating…" label) footer
- [x] `src/pages/EmployeesPage.tsx` modified: `createOpen` boolean state added; heading `<div>` changed to flex row (`flex items-start justify-between`); "Create New" `<Button>` with `<Plus className="size-4" />` added; `CreateEmployeeModal` import added; `{createOpen && <CreateEmployeeModal ... />}` conditional mount added; no existing logic modified
- [x] `src/features/employees/index.ts` verified — no re-export changes required
- [x] `npm run typecheck` = **0 errors**
- [x] `npm run test` = **80/80** tests passing (baseline maintained; no new tests in Task 3)
- [x] `npm run build` = **success**
- [x] Manual validation steps performed in a running dev server session (see Manual Validation section)
- [x] Parent feature Phase 3 steps (3.1, 3.2, 3.3, 3.4) marked `[x]`
- [x] Parent feature Task 3 wiki link updated with `[[Create-Employee-Modal-task-3-modal-and-wiring]]`
- [x] Code explanation files — N/A (`CreateEmployeeModal.tsx` is a pure display component whose structure is fully documented in this task; no code explanation file required)
- [x] Memory Bank `context.md` updated to reflect Task 3 completion and the Create Employee Modal feature closure
