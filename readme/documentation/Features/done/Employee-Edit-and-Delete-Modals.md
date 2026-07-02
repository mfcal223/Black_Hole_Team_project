#high #enhancement #frontend

## Feature: Employee Edit and Delete Modals

### Description

Activate the placeholder Edit and Delete action buttons on the `/employees` admin page. Clicking Edit opens an inline modal pre-populated with the employee's current field values; the admin can update username, password, firstName, lastName, email, and enabled status and save in place. Clicking Delete opens a confirmation modal with a checkbox the admin must check before the Delete button enables — preventing accidental deletion. Both modals display inline errors and keep themselves open on failure. On success the list re-fetches the current page.

---

## Problem Statement

The admin Employee Management page shows every registered employee in a paginated table but the Edit and Delete buttons have no behavior — they are visual placeholders. Admins have no way to correct employee data or remove accounts from the frontend; they would need direct API access to perform these actions.

---

## User Stories

1. As an admin, when I click the Edit button on an employee row, I want a modal to open pre-populated with that employee's current values, so that I can see what I am editing before making changes.
2. As an admin, inside the Edit modal I want to modify the employee's username, so that I can correct misspelled login names.
3. As an admin, inside the Edit modal I want to set a new password for the employee, so that I can reset credentials when an employee is locked out.
4. As an admin, I want the password field to be empty by default and optional, so that leaving it blank preserves the employee's current password without accidental overwrite.
5. As an admin, inside the Edit modal I want to modify the employee's first name and last name, so that I can keep the directory current.
6. As an admin, inside the Edit modal I want to modify the employee's email address, so that I can update contact information when it changes.
7. As an admin, inside the Edit modal I want to toggle whether the employee account is active or inactive, so that I can enable a new self-registered employee or disable a departing one.
8. As an admin, when I save the Edit modal without changing anything, I want the modal to close immediately with no API calls, so that accidental opens do not trigger unnecessary network traffic.
9. As an admin, when the backend rejects my edit (e.g., username conflict 409, blank required field 400), I want to see the error message inside the modal, so that I can correct the input and retry without losing my changes.
10. As an admin, after a successful edit I want the employee list to refresh, so that I see the updated values immediately.
11. As an admin, when I click the Delete button on an employee row, I want a warning modal to appear, so that I do not accidentally delete the wrong person.
12. As an admin, inside the Delete modal I want to see the employee's username, so that I can confirm I am deleting the right account.
13. As an admin, inside the Delete modal I want a checkbox I must check to confirm "I understand this action is permanent and cannot be undone", so that the Delete button only becomes available after I have acknowledged the consequences.
14. As an admin, when the Delete confirmation fails, I want to see the error inside the modal and be able to retry, so that a network hiccup does not leave me confused about whether the account was deleted.
15. As an admin, after a successful delete I want the employee list to refresh automatically, so that the removed employee disappears from the table.
16. As an admin, I want to cancel either modal at any time, so that I can exit without making changes.

---

## Solution

Add an edit hook (`useEditEmployee`) and a delete hook (`useDeleteEmployee`) inside the existing `features/employees/` module. Both hooks encapsulate all business logic (change detection, API orchestration, error lifecycle). Two new modal components (`EditEmployeeModal`, `DeleteEmployeeModal`) are pure display modules driven by these hooks. `EmployeeTable` gains two callback props (`onEditClick`, `onDeleteClick`). `EmployeesPage` manages which employee is selected and which modal is open, and passes a `refresh` callback to the hooks. The shadcn `dialog` component is installed as the modal primitive. A one-line CORS fix in the backend adds `PATCH` to the allowed methods so the activate/deactivate endpoints work from the browser.

### Scope

All frontend changes are limited to `project/srcs/frontend/src/`. The one backend change is a single line in `SecurityConfig.java`. No new backend endpoints are added — existing `PUT /employee/{id}`, `DELETE /employee/{id}`, `PATCH /employee/{id}/activate`, and `PATCH /employee/{id}/deactivate` endpoints are consumed as-is.

### Affected Systems / Modules

- `project/srcs/backend/src/main/java/com/BHT/configuration/security/SecurityConfig.java` — add `"PATCH"` to `corsConfigurationSource()` allowed methods list (line 117)
- `project/srcs/frontend/src/components/ui/dialog.tsx` — **new** (shadcn install, modal primitive)
- `project/srcs/frontend/src/features/employees/types.ts` — add `EmployeeDTO` and `EmployeeUpdateForm` types
- `project/srcs/frontend/src/features/employees/services/employeeService.ts` — add `updateEmployee`, `deleteEmployee`, `activateEmployee`, `deactivateEmployee` functions (TDD)
- `project/srcs/frontend/src/features/employees/hooks/useEditEmployee.ts` — **new** deep module: edit form state + save orchestration (TDD)
- `project/srcs/frontend/src/features/employees/hooks/useDeleteEmployee.ts` — **new** deep module: delete confirmation state + submit lifecycle (TDD)
- `project/srcs/frontend/src/features/employees/components/EditEmployeeModal.tsx` — **new** pure display modal
- `project/srcs/frontend/src/features/employees/components/DeleteEmployeeModal.tsx` — **new** pure display modal
- `project/srcs/frontend/src/features/employees/components/EmployeeTable.tsx` — add `onEditClick` and `onDeleteClick` props; wire existing placeholder buttons
- `project/srcs/frontend/src/pages/EmployeesPage.tsx` — add modal open/close state, wire EmployeeTable callbacks and refresh
- `project/srcs/frontend/src/features/employees/index.ts` — export new types and hooks

### Impact Analysis

- The 59 existing tests are unaffected — all changes are additive. Service extension adds new exported functions; existing `listEmployees` is untouched.
- `EmployeeTable` gains two optional callback props; the `isLoading` overlay and table rendering are unchanged.
- `EmployeesPage` gains local state for the selected employee and modal visibility; the filter bar, table render, and pagination controls are unaffected.
- Installing `dialog.tsx` via `npx shadcn@latest add dialog` (base-mira style) adds no new package dependencies — Base UI's dialog is already in `@base-ui/react`.
- The CORS backend fix (adding `"PATCH"`) is a one-line additive change. It enables the activate/deactivate endpoints and does not affect any other existing endpoints.

### Risk Assessment

- **CORS PATCH**: Without the backend fix the activate/deactivate PATCH calls will fail CORS preflight. The fix must be applied in Task 1 before Task 3 can be end-to-end validated. The fix is a one-line change to `SecurityConfig.java:117` — low risk.
- **Enabled field two-endpoint split**: The `PUT /employee/{id}` form (`EmployeeForm`) does not include an `enabled` field. Toggling enabled requires separate `PATCH` calls. The `useEditEmployee` hook must detect whether enabled changed from its initial value and issue the correct activate/deactivate call after the PUT succeeds. Tests must cover the case where enabled changes but no other field does (PUT skipped, only PATCH called).
- **Partial success (PUT succeeds, PATCH fails)**: If the field PUT succeeds but the enabled PATCH fails, the backend has committed the field changes but not the enabled change. The hook shows the PATCH error and keeps the modal open. The list does NOT refresh — the admin must close the modal to see the committed field changes and retry the enabled toggle. This is acceptable for MVP.
- **`firstName` / `lastName` nullable**: These fields are `string | null` in `EmployeeListDTO` but string inputs in the form. The hook initializes them as `employee.firstName ?? ""`. Change detection compares against the same null-coalesced initial value.
- **Dialog component (ADR-010)**: Must be installed with `npx shadcn@latest add dialog` (base-mira style, NOT Radix). Verify the installed `dialog.tsx` uses `@base-ui/react/dialog` internally.
- **Password omitted from form**: The `EmployeeListDTO` does not carry a password hash. The password field always initializes as `""`. For change detection purposes, `password !== ""` is the signal that the admin wants to set a new password.

---

## Implementation Architecture

### Changes Required

#### 1. Backend CORS fix
**Purpose:** Allow the browser to send `PATCH` requests, which is required for `PATCH /employee/{id}/activate` and `PATCH /employee/{id}/deactivate`.

**Changes:** In `project/srcs/backend/src/main/java/com/BHT/configuration/security/SecurityConfig.java` at line 117, add `"PATCH"`:

```java
corsConfiguration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
```

---

#### 2. `dialog.tsx` (shadcn install)
**Purpose:** Headless accessible modal primitive used by both `EditEmployeeModal` and `DeleteEmployeeModal`.

**Changes:** `npx shadcn@latest add dialog` (base-mira style, per [[ADRs/ADR-010-base-ui-over-radix-ui-for-frontend]]). Verify the installed file uses `@base-ui/react/dialog` and does not pull Radix dialog packages.

---

#### 3. `src/features/employees/types.ts` (modify)
**Purpose:** Add types for the update form payload and the full employee response.

**New types:**
```typescript
// Response type for PUT /employee/{id}, DELETE /employee/{id},
// PATCH /employee/{id}/activate, and PATCH /employee/{id}/deactivate.
export interface EmployeeDTO {
  firstName: string | null
  lastName: string | null
  email: string
  username: string
  roles: string[]
  enabled: boolean
}

// Request body for PUT /employee/{id}.
// All fields are optional — the backend ignores blank/null fields
// and keeps the existing value. Password is only included when non-empty.
export interface EmployeeUpdateForm {
  username?: string
  password?: string
  firstName?: string
  lastName?: string
  email?: string
}
```

---

#### 4. `src/features/employees/services/employeeService.ts` (modify, TDD)
**Purpose:** Add four new single-responsibility adapter functions for the edit/delete endpoints. Deep module: each function hides axios, URL construction, and types behind a minimal interface.

**New functions:**
```typescript
export async function updateEmployee(
  id: number,
  form: EmployeeUpdateForm
): Promise<EmployeeDTO> {
  const response = await api.put<EmployeeDTO>(`/employee/${id}`, form)
  return response.data
}

export async function deleteEmployee(id: number): Promise<EmployeeDTO> {
  const response = await api.delete<EmployeeDTO>(`/employee/${id}`)
  return response.data
}

export async function activateEmployee(id: number): Promise<EmployeeDTO> {
  const response = await api.patch<EmployeeDTO>(`/employee/${id}/activate`)
  return response.data
}

export async function deactivateEmployee(id: number): Promise<EmployeeDTO> {
  const response = await api.patch<EmployeeDTO>(`/employee/${id}/deactivate`)
  return response.data
}
```

**Tests (TDD):** `src/features/employees/services/employeeService.test.ts` (extend existing file)
- `updateEmployee` sends `PUT /employee/{id}` with the form body and returns `response.data`
- `deleteEmployee` sends `DELETE /employee/{id}` and returns `response.data`
- `activateEmployee` sends `PATCH /employee/{id}/activate` and returns `response.data`
- `deactivateEmployee` sends `PATCH /employee/{id}/deactivate` and returns `response.data`

---

#### 5. `src/features/employees/hooks/useEditEmployee.ts` (new, TDD)
**Purpose:** Deep module — owns all edit form state and the complete save orchestration behind a minimal interface. Callers receive form field values + setters, status flags, and a single `onSave()` action. The hook decides what changed, which endpoints to call, and in what order.

**Interface:**
```typescript
interface UseEditEmployeeResult {
  // Controlled form fields
  username: string
  setUsername: (v: string) => void
  password: string
  setPassword: (v: string) => void
  firstName: string
  setFirstName: (v: string) => void
  lastName: string
  setLastName: (v: string) => void
  email: string
  setEmail: (v: string) => void
  enabled: boolean
  setEnabled: (v: boolean) => void
  // Status
  isSubmitting: boolean
  error: string | null
  // Actions
  onSave: () => Promise<void>
}

function useEditEmployee(
  employee: EmployeeListDTO,
  onSuccess: () => void
): UseEditEmployeeResult
```

**Save orchestration inside `onSave()`:**

1. Compute `hasFieldChanges`: `username`, `firstName`, `lastName`, or `email` differs from its initial value, OR `password` is non-empty.
2. Compute `hasEnabledChange`: `enabled` differs from `employee.enabled`.
3. If `!hasFieldChanges && !hasEnabledChange` → call `onSuccess()` immediately (no-op save).
4. Set `isSubmitting = true`, clear `error`.
5. If `hasFieldChanges`: build `EmployeeUpdateForm` with all four text fields always included (`username`, `firstName`, `lastName`, `email` — using current form values); add `password` only when `password !== ""`. Call `updateEmployee(employee.id, form)`. On rejection → set `error`, clear `isSubmitting`, return (stop).
6. If `hasEnabledChange`: call `activateEmployee(employee.id)` or `deactivateEmployee(employee.id)` depending on `enabled`. On rejection → set `error`, clear `isSubmitting`, return.
7. Clear `isSubmitting`, call `onSuccess()`.

**Tests (TDD):** `src/features/employees/hooks/useEditEmployee.test.ts` — 8 behavior tests:
1. Form initializes from employee (username, email, firstName, lastName, enabled populated; password empty)
2. Save with no changes → `onSuccess` called; no service functions called
3. Changed username → `updateEmployee` called with new username; `onSuccess` called
4. Non-empty password → `updateEmployee` called including `password` field; `onSuccess` called
5. `enabled` changed true→false (no other changes) → `deactivateEmployee` called; `updateEmployee` NOT called; `onSuccess` called
6. `enabled` changed false→true (no other changes) → `activateEmployee` called; `onSuccess` called
7. `updateEmployee` rejects → `error` set to user-facing message; `onSuccess` NOT called
8. `deactivateEmployee` rejects (after a field change triggers PUT success) → `error` set; `onSuccess` NOT called

---

#### 6. `src/features/employees/hooks/useDeleteEmployee.ts` (new, TDD)
**Purpose:** Deep module — owns delete confirmation checkbox state and delete submit lifecycle.

**Interface:**
```typescript
interface UseDeleteEmployeeResult {
  isChecked: boolean
  setIsChecked: (v: boolean) => void
  isSubmitting: boolean
  error: string | null
  onConfirm: () => Promise<void>
}

function useDeleteEmployee(
  employee: EmployeeListDTO,
  onSuccess: () => void
): UseDeleteEmployeeResult
```

**`onConfirm()` logic:**
- Guard: if `!isChecked`, return immediately (button should already be disabled; guard is belt-and-suspenders).
- Set `isSubmitting = true`, clear `error`.
- Call `deleteEmployee(employee.id)`. On rejection → set `error`, clear `isSubmitting`, return.
- Clear `isSubmitting`, call `onSuccess()`.

**Tests (TDD):** `src/features/employees/hooks/useDeleteEmployee.test.ts` — 4 behavior tests:
1. `onConfirm` does nothing when checkbox is unchecked
2. `onConfirm` calls `deleteEmployee` with the correct employee `id` when checked
3. `onSuccess` called after successful delete
4. `error` set and `onSuccess` NOT called when `deleteEmployee` rejects

---

#### 7. `src/features/employees/components/EditEmployeeModal.tsx` (new)
**Purpose:** Pure display layer for the edit modal. Renders the Dialog with the form. No business logic — all state and actions come from `useEditEmployee` via props from `EmployeesPage`.

**Props:**
```typescript
interface EditEmployeeModalProps {
  employee: EmployeeListDTO | null  // null = modal closed
  onClose: () => void
  onSuccess: () => void             // triggers list refresh + close
}
```

The modal is only rendered (and `useEditEmployee` only instantiated) when `employee` is non-null. `EmployeesPage` mounts/unmounts it by conditionally rendering `{selectedEditEmployee && <EditEmployeeModal .../>}`.

**Form layout:**
- Dialog header: "Edit Employee"
- Fields (using `Input` + `Label`): Username, First Name, Last Name, Email, Password (type="password", placeholder "Leave blank to keep current password"), Enabled (styled `<label>` wrapping `<input type="checkbox">`; no Switch component install)
- Inline error: `<p className="text-sm text-destructive">` shown when `error` is non-null
- Footer buttons: "Cancel" (calls `onClose`) and "Save" (calls `onSave()`; disabled when `isSubmitting`)
- Enabled field: `<label>` wrapping `<input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />` styled with Tailwind — no Switch component install required.

---

#### 8. `src/features/employees/components/DeleteEmployeeModal.tsx` (new)
**Purpose:** Pure display layer for the delete confirmation modal. No business logic.

**Props:**
```typescript
interface DeleteEmployeeModalProps {
  employee: EmployeeListDTO | null
  onClose: () => void
  onSuccess: () => void
}
```

**Layout:**
- Dialog header: "Delete Employee"
- Warning paragraph: "You are about to permanently delete **{employee.username}**. This action cannot be undone."
- Checkbox + label: "I understand this action is permanent and cannot be undone."
- Inline error: shown when `error` is non-null
- Footer buttons: "Cancel" (calls `onClose`) and "Delete" (calls `onConfirm()`; disabled when `!isChecked || isSubmitting`; uses `variant="destructive"`)

---

#### 9. `src/features/employees/components/EmployeeTable.tsx` (modify)
**Purpose:** Add callback props for edit and delete actions; wire the existing placeholder buttons.

**New props:**
```typescript
interface EmployeeTableProps {
  employees: EmployeeListDTO[]
  isLoading: boolean
  onEditClick: (employee: EmployeeListDTO) => void   // new
  onDeleteClick: (employee: EmployeeListDTO) => void // new
}
```

**Changes:**
- Remove `onClick={undefined}` from the Edit button; replace with `onClick={() => onEditClick(employee)}`.
- Remove `onClick={undefined}` from the Delete button; replace with `onClick={() => onDeleteClick(employee)}`.
- Remove the "(coming soon)" suffix from both tooltip content strings; change to "Edit employee" and "Delete employee".

---

#### 10. `src/pages/EmployeesPage.tsx` (modify)
**Purpose:** Thin composition layer. Adds local state for modal open/close and the selected employee. Passes a `refresh` callback to both modals.

**Changes:**
```tsx
const [editEmployee, setEditEmployee] = useState<EmployeeListDTO | null>(null)
const [deleteEmployee, setDeleteEmployee] = useState<EmployeeListDTO | null>(null)

// refresh re-fetches current page — reuses existing hook state
const { ..., refresh } = useEmployeeList()
```

The `useEmployeeList` hook must expose a `refresh()` function that re-fetches with current state. If it does not currently expose one, expose `onPageChange(currentPage)` as the trigger (see Implementation Steps §3.2).

Wire `EmployeeTable`:
```tsx
<EmployeeTable
  employees={employees}
  isLoading={isLoading}
  onEditClick={setEditEmployee}
  onDeleteClick={setDeleteEmployee}
/>
```

Mount modals conditionally:
```tsx
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
```

---

#### 11. `src/features/employees/hooks/useEmployeeList.ts` (minor modify)
**Purpose:** Expose a `refresh()` function so `EmployeesPage` can trigger a re-fetch after a successful edit or delete.

**Changes:** Add `refresh: () => void` to the hook's return value, implemented as a plain function — consistent with the existing hook pattern where all event handlers (`onFilterFieldChange`, `onFilterValueChange`, `onPageSizeChange`, `onPageChange`) are plain functions with no `useCallback`:
```typescript
function refresh() {
  void fetchEmployees(currentPage, pageSize, filterField, filterValue)
}
```
Do NOT wrap in `useCallback`. `fetchEmployees` is not stable across renders (new reference each render), so `useCallback` would require `fetchEmployees` in its deps array and recreate on every render anyway — eliminating any benefit and breaking ESLint's exhaustive-deps rule.

Update `src/features/employees/index.ts` to re-export any new types used publicly.

---

## Implementation Steps

### Phase 1: Prerequisites (Dialog + CORS)
- [x] **Step 1.1:** Fix CORS — add `"PATCH"` to `corsConfiguration.setAllowedMethods(...)` in `SecurityConfig.java:117`; typecheck/build backend to confirm no compile errors
- [x] **Step 1.2:** Install dialog — run `npx shadcn@latest add dialog` from `project/srcs/frontend/`; verify `src/components/ui/dialog.tsx` created; confirm it uses `@base-ui/react/dialog`; run `npm run typecheck` — 0 errors

### Phase 2: Types + Extended Service (TDD)
- [x] **Step 2.1:** Add `EmployeeDTO` and `EmployeeUpdateForm` to `src/features/employees/types.ts`; run `npm run typecheck` — 0 errors
- [x] **Step 2.2 RED:** Extend `src/features/employees/services/employeeService.test.ts` with 4 new tests for `updateEmployee`, `deleteEmployee`, `activateEmployee`, `deactivateEmployee` — confirm they fail (module exports not yet present)
- [x] **Step 2.2 GREEN:** Add the 4 new functions to `src/features/employees/services/employeeService.ts`; run `npm run test` — all tests pass

### Phase 3: useEditEmployee Hook (TDD)
- [x] **Step 3.1:** Add `refresh()` to `useEmployeeList` return value; run `npm run typecheck` + `npm run test` — confirm no regressions  ← [[Employee-Edit-and-Delete-Modals-task-3-use-edit-employee]]
- [x] **Step 3.2 RED:** Create `src/features/employees/hooks/useEditEmployee.test.ts` with 8 behavior tests — confirm RED (module not found)
- [x] **Step 3.2 GREEN:** Create `src/features/employees/hooks/useEditEmployee.ts`; run `npm run test` — all tests pass; run `npm run typecheck` — 0 errors

### Phase 4: useDeleteEmployee Hook (TDD)
- [x] **Step 4.1 RED:** Create `src/features/employees/hooks/useDeleteEmployee.test.ts` with 4 behavior tests — confirm RED  ← [[Employee-Edit-and-Delete-Modals-task-4-use-delete-employee]]
- [x] **Step 4.1 GREEN:** Create `src/features/employees/hooks/useDeleteEmployee.ts`; run `npm run test` — all tests pass; run `npm run typecheck` — 0 errors

### Phase 5: Modal Components + Wiring + Regression
- [x] **Step 5.1:** Create `src/features/employees/components/EditEmployeeModal.tsx`; run `npm run typecheck` — 0 errors
- [x] **Step 5.2:** Create `src/features/employees/components/DeleteEmployeeModal.tsx`; run `npm run typecheck` — 0 errors
- [x] **Step 5.3:** Modify `src/features/employees/components/EmployeeTable.tsx` — add `onEditClick`/`onDeleteClick` props; wire buttons; update tooltip text
- [x] **Step 5.4:** Modify `src/pages/EmployeesPage.tsx` — add modal state; wire EmployeeTable callbacks; mount both modal components
- [x] **Step 5.5:** Update `src/features/employees/index.ts` — re-export `EmployeeDTO`, `EmployeeUpdateForm` if needed externally
- [x] **Step 5.6 Regression:** `npm run typecheck` = 0 errors; `npm run test` = all tests pass (target: 75 — 59 baseline + 4 service + 8 useEditEmployee + 4 useDeleteEmployee); `npm run build` = success

---

## Potential Issues / Risks

- **`useEmployeeList` `fetchEmployees` is a closure** — `refresh()` must be a plain function that passes the current render's `currentPage`, `pageSize`, `filterField`, and `filterValue` explicitly to `fetchEmployees`. Do not wrap it in `useCallback`; this matches the existing hook pattern and avoids stale or incomplete dependency arrays.
- **Modal unmount clears hook state** — because modals are conditionally rendered, hook state (form fields, errors) resets every time the modal closes. This is intentional: reopening the Edit modal on the same employee re-initializes from the latest `EmployeeListDTO` in the table (which may be stale until next refresh). Acceptable for MVP.
- **`enabled` checkbox** — no `Switch` shadcn component is installed. Use a styled `<label>` wrapping `<input type="checkbox">` in `EditEmployeeModal`. No new shadcn install needed for this field.
- **PATCH via Axios** — `axios.patch(url)` requires no body for activate/deactivate. Axios sends an empty body by default; the Spring backend ignores it. No special handling needed.
- **409 conflict error message** — the backend returns a 409 with a message string in the response body when username or email is already taken. `updateEmployee` will reject with an Axios error; the hook should extract `error.response?.data?.message ?? error.message` as the user-facing string.

---

## Testing Decisions

**What makes a good test here:** Tests verify observable hook behavior through the public interface — state transitions and which service functions were called. No implementation-detail assertions (e.g., internal variable names, private helpers). Tests must survive renaming internals.

**Modules with TDD:**

| Module | Test file | What is tested |
|--------|-----------|----------------|
| `employeeService` (extended) | `src/features/employees/services/employeeService.test.ts` | PUT/DELETE/PATCH calls hit the correct URLs; request body is correct; response data returned |
| `useEditEmployee` | `src/features/employees/hooks/useEditEmployee.test.ts` | Form initializes from employee; no-op save calls onSuccess without API calls; field change triggers PUT; password omitted when empty; enabled false→true triggers activate; enabled true→false triggers deactivate; PUT rejection sets error; PATCH rejection sets error. **Mock setup:** `vi.mock('../services/employeeService', () => ({ listEmployees: vi.fn(), updateEmployee: vi.fn(), activateEmployee: vi.fn(), deactivateEmployee: vi.fn(), deleteEmployee: vi.fn() }))` — mock all service exports to prevent HTTP leaks; resolve mocks with `vi.fn().mockResolvedValue(mockEmployeeDTO)` in beforeEach. |
| `useDeleteEmployee` | `src/features/employees/hooks/useDeleteEmployee.test.ts` | No-op when unchecked; deleteEmployee called with correct id when checked; onSuccess called on success; error set on rejection |

**Modules without tests (structural):**
- `types.ts` additions — pure type declarations
- `EditEmployeeModal.tsx` — props-driven display; verified by typecheck + build + manual
- `DeleteEmployeeModal.tsx` — props-driven display; verified by typecheck + build + manual
- `EmployeeTable.tsx` modification — structural wiring; verified by typecheck + build + manual
- `EmployeesPage.tsx` modification — thin composition; verified by typecheck + build + manual
- `dialog.tsx` — shadcn primitive; verified by typecheck + build + manual

**Prior art:**
- `src/features/employees/services/employeeService.test.ts` — axios-mock-adapter pattern for the same service module
- `src/features/employees/hooks/useEmployeeList.test.ts` — `renderHook` + `act` + `vi.mock` for hooks in this feature
- `src/features/authentication/hooks/useLoginForm.test.ts` — `vi.hoisted` + `vi.mock` factory pattern for service mocking

---

## Task Breakdown

### Task 1: Dialog component + CORS fix
- **Steps Covered:** Steps 1.1, 1.2
- **Reason for Grouping:** Both are setup prerequisites. The CORS fix unblocks PATCH endpoints; the dialog install is the UI primitive dependency for both modals. Neither has logic. Fast to execute together.
- **Planned Task File:** `Employee-Edit-and-Delete-Modals-task-1-dialog-and-cors.md`
- **Task Document Link:** [[Employee-Edit-and-Delete-Modals-task-1-dialog-and-cors]]

### Task 2: Types + extended employeeService (TDD)
- **Steps Covered:** Steps 2.1, 2.2
- **Reason for Grouping:** Types must precede service; the service TDD cycle is a single RED→GREEN unit. Low complexity, logically atomic.
- **Planned Task File:** `Employee-Edit-and-Delete-Modals-task-2-types-and-service.md`
- **Task Document Link:** [[Employee-Edit-and-Delete-Modals-task-2-types-and-service]]
- **Status:** ✅ Executed — 63/63 tests, 0 typecheck errors, build success.

### Task 3: useEditEmployee hook (TDD)
- **Steps Covered:** Steps 3.1, 3.2
- **Reason for Grouping:** The most complex module in this feature — 8 behavior tests covering no-op detection, field change routing, password omission, enabled change direction, and error lifecycle. Deserves its own focused task. Also includes the minor `useEmployeeList.refresh()` addition (Step 3.1) as a dependency gate.
- **Planned Task File:** `Employee-Edit-and-Delete-Modals-task-3-use-edit-employee.md`
- **Task Document Link:** [[Employee-Edit-and-Delete-Modals-task-3-use-edit-employee]]
- **Status:** ✅ Executed — 71/71 tests (63 baseline + 8 new), 0 typecheck errors, build success.

### Task 4: useDeleteEmployee hook (TDD)
- **Steps Covered:** Step 4.1
- **Reason for Grouping:** Simpler than Task 3 but still a TDD cycle with its own behavioral edge cases. Kept separate to preserve clean test feedback loops.
- **Planned Task File:** `Employee-Edit-and-Delete-Modals-task-4-use-delete-employee.md`
- **Task Document Link:** [[Employee-Edit-and-Delete-Modals-task-4-use-delete-employee]]
- **Status:** ✅ Executed — 75/75 tests (71 baseline + 4 new), 0 typecheck errors, build success.

### Task 5: Modal components + wiring + regression
- **Steps Covered:** Steps 5.1–5.6
- **Reason for Grouping:** All structural modules (display components + wiring edits) with no new logic. Executed in order: components first, then table/page wiring, then regression. Closes the feature.
- **Planned Task File:** `Employee-Edit-and-Delete-Modals-task-5-modals-and-wiring.md`
- **Task Document Link:** [[Employee-Edit-and-Delete-Modals-task-5-modals-and-wiring]]
- **Status:** ✅ Executed — 75/75 tests (unchanged; structural modules only), 0 typecheck errors, build success (8284 modules, 503.96 kB JS / 165.64 kB gzip).
