#high #new-feature #frontend

## Feature: Create Employee Modal

### Description

Add a "Create New" button to the admin `/employees` page heading that opens a modal form for creating a new employee account. The modal mirrors the Edit modal in structure and style, containing the same fields (minus the `enabled` toggle, which is not applicable at creation time). Backend errors — including duplicate-username or duplicate-email conflicts — are displayed inline inside the modal. On success the employee list refreshes in place.

---

## Problem Statement

Admins can view, edit, and delete employees from the `/employees` page, but there is no way to create a new employee account from the frontend. Creating an account currently requires direct API access. The "Create New" button and modal complete the full employee lifecycle management flow in the UI.

---

## User Stories

1. As an admin, I want a "Create New" button on the Employees page, so that I can create employee accounts without direct API access.
2. As an admin, I want the "Create New" button to be always visible at the top right of the page, so that I can find it regardless of filter or pagination state.
3. As an admin, I want the "Create New" button to have a `+` icon, so that its purpose is clear at a glance.
4. As an admin, when I click "Create New", I want a modal to open with a blank form, so that I can fill in the new employee's details.
5. As an admin, inside the create modal, I want to enter a username, so that the employee has a login name.
6. As an admin, inside the create modal, I want to enter a password for the new employee, so that the account is ready to use immediately.
7. As an admin, inside the create modal, I want a visual indicator (asterisk) on the username, email, and password labels, so that I know those fields are required before submitting.
8. As an admin, inside the create modal, I want to enter a first name and last name, so that the employee record is complete.
9. As an admin, inside the create modal, I want to enter an email address, so that the employee can be identified and contacted.
10. As an admin, I do not want an "enabled" toggle in the create modal, so that I am not confused by a setting that the backend ignores on creation (new employees are always created enabled).
11. As an admin, when I submit the create form and the backend rejects it (e.g., username or email already taken), I want to see the error message inside the modal, so that I can correct the input and retry.
12. As an admin, when I cancel the create modal, I want the form to be cleared and the modal to close, so that I return to a clean state.
13. As an admin, after a successful employee creation, I want the employee list to refresh automatically, so that the new employee appears in the table without a manual page reload.
14. As an admin, after a successful creation, I want to remain on the current page (not jump to page 1), so that my browsing position in the list is preserved.
15. As an admin, I want the Create button to be disabled while the form is submitting, so that I cannot accidentally double-submit.
16. As an admin, I want the modal to stay open after a failed submission, so that I can correct the error and retry without re-entering all the data.

---

## Solution

Add a "Create New" button to the page heading row of `EmployeesPage`. Clicking it opens a `CreateEmployeeModal` that is conditionally mounted (same pattern as `EditEmployeeModal` and `DeleteEmployeeModal`). A new `useCreateEmployee` hook owns all form state and the submit lifecycle. A `createEmployee` service function wraps `POST /employee`. On success, `refresh()` from `useEmployeeList` re-fetches the current page.

### Scope

All changes are limited to `project/srcs/frontend/src/`. No backend files are modified. The existing `POST /employee` endpoint is consumed as-is with the existing `EmployeeForm` shape accepted by the backend.

### Affected Systems / Modules

- `project/srcs/frontend/src/features/employees/types.ts` — add `EmployeeCreateForm` and `EmployeeMiniDTO` types
- `project/srcs/frontend/src/features/employees/services/employeeService.ts` — add `createEmployee` function (TDD)
- `project/srcs/frontend/src/features/employees/hooks/useCreateEmployee.ts` — **new** deep module: create form state + submit orchestration (TDD)
- `project/srcs/frontend/src/features/employees/components/CreateEmployeeModal.tsx` — **new** pure display modal
- `project/srcs/frontend/src/pages/EmployeesPage.tsx` — add `createOpen` state, "Create New" button in heading row, conditional modal mount

### Impact Analysis

- The 75 existing tests are unaffected — all changes are additive. The service extension adds a new exported function; `listEmployees`, `updateEmployee`, `deleteEmployee`, `activateEmployee`, and `deactivateEmployee` are untouched.
- `EmployeesPage` is modified additively: the heading `<div>` becomes a flex row with the button on the right; the existing filter bar, table, pagination, and edit/delete modal wiring are unchanged.
- Conditionally mounting `CreateEmployeeModal` follows the exact same pattern as the existing `EditEmployeeModal` and `DeleteEmployeeModal` mounts.
- `useEmployeeList.refresh()` is already exposed and used by the edit/delete flows — no hook changes required.

### Risk Assessment

- **Required fields**: The backend requires `username`, `email`, and `password` — all three must be non-blank. The frontend relies on the backend to return a descriptive error if any required field is missing; no client-side field-by-field validation is added (consistent with the edit modal). The asterisk labels signal required fields to the admin without adding duplicate logic.
- **`firstName`/`lastName` in the payload**: These are optional. When the form fields are empty, they are omitted from the `EmployeeCreateForm` payload (not sent as empty strings) to avoid unexpected backend behavior with blank optional fields.
- **`EmployeeMiniDTO` response**: The `POST /employee` endpoint returns `EmployeeMiniDTO` (firstName, lastName, email, username, roles — no `id`, no `enabled`). The frontend does not read the response body on success — it only calls `onSuccess()` to trigger a list refresh. No new display logic depends on `EmployeeMiniDTO`.
- **Duplicate-conflict errors**: The backend returns a descriptive message in the response body when a username or email is already taken (`ItemAlreadyExist`). The hook extracts `axiosErr.response?.data?.message` as the first fallback — these messages will surface correctly inside the modal.
- **No `enabled` field**: New employees are always created with `enabled = true` by `EmployeeService.insert()`. Omitting the toggle from the modal avoids confusing the admin with a control that the backend ignores on the create path.
- **Form reset on cancel**: The modal is conditionally mounted (`{createOpen && <CreateEmployeeModal ... />}`). When `onClose` is called (Cancel button or Esc/backdrop), the parent sets `createOpen = false`, unmounting the modal and automatically resetting all hook state. Re-opening the modal always starts with a blank form.

---

## Implementation Architecture

### Changes Required

#### 1. `src/features/employees/types.ts` (modify)
**Purpose:** Add two new types — the create request form shape and the create response shape.

**Changes:**
```typescript
// Request body for POST /employee.
// username, email, and password are required by the backend (EmployeeService.insert() validates these).
// firstName and lastName are optional — omit from payload when empty (do not send empty strings).
export interface EmployeeCreateForm {
  username: string
  email: string
  password: string
  firstName?: string
  lastName?: string
}

// Response type for POST /employee (EmployeeMiniDTO on the backend).
// Does not include id, enabled, dateCreated, or lastLogin — those are absent from the create response.
export interface EmployeeMiniDTO {
  firstName: string | null
  lastName: string | null
  email: string
  username: string
  roles: string[]
}
```

---

#### 2. `src/features/employees/services/employeeService.ts` (modify, TDD)
**Purpose:** Add a single-responsibility adapter for `POST /employee`. Deep module: hides axios, URL, and types behind a one-parameter interface.

**New function:**
```typescript
export async function createEmployee(
  form: EmployeeCreateForm
): Promise<EmployeeMiniDTO> {
  const response = await api.post<EmployeeMiniDTO>("/employee", form)
  return response.data
}
```

No try/catch — error lifecycle is owned by `useCreateEmployee`. Consistent with the existing `updateEmployee`, `deleteEmployee`, `activateEmployee`, and `deactivateEmployee` adapters.

**Test (TDD):** `src/features/employees/services/employeeService.test.ts` (extend existing file)
- `createEmployee` sends `POST /employee` with the form body and returns `response.data`

---

#### 3. `src/features/employees/hooks/useCreateEmployee.ts` (new, TDD)
**Purpose:** Deep module — owns all create form state and the submit lifecycle behind a minimal interface. Callers receive form field values + setters, status flags, and a single `onSubmit()` action.

**Interface:**
```typescript
interface UseCreateEmployeeResult {
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
  isSubmitting: boolean
  error: string | null
  onSubmit: () => Promise<void>
}

function useCreateEmployee(onSuccess: () => void): UseCreateEmployeeResult
```

**`onSubmit()` logic:**
1. Set `isSubmitting = true`, clear `error`.
2. Build `EmployeeCreateForm`: always include `username`, `email`, `password`; include `firstName` only when `firstName !== ""`; include `lastName` only when `lastName !== ""`.
3. Call `createEmployee(form)`. On rejection → extract `axiosErr.response?.data?.message ?? axiosErr.message ?? "Failed to create employee."`, set `error`, set `isSubmitting = false`, return.
4. On success → set `isSubmitting = false`, call `onSuccess()`.

No `useCallback` — consistent with `useEditEmployee`, `useDeleteEmployee`, and all other hooks in this feature.

`UseCreateEmployeeResult` interface is NOT exported (consistent with `UseEditEmployeeResult` and `UseDeleteEmployeeResult` — callers infer the type via `ReturnType<typeof useCreateEmployee>`).

**Tests (TDD):** `src/features/employees/hooks/useCreateEmployee.test.ts` — 4 behavior tests:
1. Form initializes with all fields empty, `isSubmitting = false`, `error = null`
2. Submit with all fields filled → `createEmployee` called with `{ username, email, password, firstName, lastName }` → `onSuccess()` called once
3. Submit with `firstName` and `lastName` empty → `createEmployee` called WITHOUT `firstName`/`lastName` in the payload → `onSuccess()` called
4. `createEmployee` rejects → `error` set to extracted message → `isSubmitting = false` → `onSuccess()` NOT called

**Mock setup:** `vi.mock("../services/employeeService", () => ({ listEmployees: vi.fn(), updateEmployee: vi.fn(), activateEmployee: vi.fn(), deactivateEmployee: vi.fn(), deleteEmployee: vi.fn(), createEmployee: vi.fn() }))` — all 6 service exports mocked to prevent HTTP leaks. Import `createEmployee` as a value import, not `import type`, because `vi.mocked(createEmployee)` needs the runtime function under `verbatimModuleSyntax: true`. Happy-path `mockResolvedValue(mockEmployeeMiniDTO)` in `beforeEach`. `beforeEach(() => vi.clearAllMocks())`.

---

#### 4. `src/features/employees/components/CreateEmployeeModal.tsx` (new)
**Purpose:** Pure display layer for the create modal. Renders the Dialog with the form. No business logic — all state and actions come from `useCreateEmployee`.

**Props:**
```typescript
interface CreateEmployeeModalProps {
  onClose: () => void
  onSuccess: () => void
}
```

The modal is conditionally mounted by `EmployeesPage` when `createOpen === true`. Closing (Esc, backdrop click, or Cancel) calls `onClose()`, which sets `createOpen = false` in the parent and unmounts the component — automatically resetting all form state on the next open.

**Form layout:**
- Dialog header: "Create Employee"
- Fields (using `Input` + `Label`):
  - Username * (required indicator in label)
  - Password * (required indicator; `type="password"`, plain placeholder)
  - First Name (no asterisk — optional)
  - Last Name (no asterisk — optional)
  - Email * (required indicator in label)
- Inline error: `<p className="text-sm text-destructive">` shown when `error` is non-null
- Footer buttons:
  - "Cancel" (`variant="outline"`) → calls `onClose()`
  - "Create" → calls `void onSubmit()`; `disabled={isSubmitting}`; toggles "Creating…" / "Create" label

Controlled Dialog pattern (same as `EditEmployeeModal` and `DeleteEmployeeModal`):
```tsx
<Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
```

---

#### 5. `src/pages/EmployeesPage.tsx` (modify)
**Purpose:** Add the "Create New" button and wire the `CreateEmployeeModal`.

**Changes:**

Add `createOpen` state:
```tsx
const [createOpen, setCreateOpen] = useState(false)
```

Change the heading section from a plain `<div>` to a flex row:
```tsx
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
```

Add `Plus` to the lucide-react import.

Add the `CreateEmployeeModal` value import alongside the existing `EditEmployeeModal` and `DeleteEmployeeModal` imports:
```tsx
import { CreateEmployeeModal } from "@/features/employees/components/CreateEmployeeModal"
```

Conditionally mount `CreateEmployeeModal` alongside the existing edit/delete modals:
```tsx
{createOpen && (
  <CreateEmployeeModal
    onClose={() => setCreateOpen(false)}
    onSuccess={() => { setCreateOpen(false); refresh() }}
  />
)}
```

No changes to `useEmployeeList` destructuring, `EmployeeFilterBar`, `EmployeeTable`, pagination, or the existing edit/delete modal wiring.

---

## Implementation Steps

### Phase 1: Types + Extended Service (TDD)
- [x] **Step 1.1:** Add `EmployeeCreateForm` and `EmployeeMiniDTO` to `project/srcs/frontend/src/features/employees/types.ts`; run `npm run typecheck` — 0 errors
- [x] **Step 1.2 RED:** Extend `project/srcs/frontend/src/features/employees/services/employeeService.test.ts` with 1 new test for `createEmployee` — confirm it fails (function not yet exported)
- [x] **Step 1.2 GREEN:** Add `createEmployee` to `project/srcs/frontend/src/features/employees/services/employeeService.ts`; run `npm run test` — all tests pass
  - Also add `createEmployee: vi.fn()` to the `vi.mock` factory in `project/srcs/frontend/src/features/employees/hooks/useEditEmployee.test.ts` and `project/srcs/frontend/src/features/employees/hooks/useDeleteEmployee.test.ts` in the same GREEN step, preserving the all-exports anti-leak convention after `employeeService` grows from 5 to 6 exports.

### Phase 2: useCreateEmployee Hook (TDD)
- [x] **Step 2.1 RED:** Create `project/srcs/frontend/src/features/employees/hooks/useCreateEmployee.test.ts` with 4 behavior tests — confirm RED (module not found)
- [x] **Step 2.1 GREEN:** Create `project/srcs/frontend/src/features/employees/hooks/useCreateEmployee.ts`; run `npm run test` — all tests pass; run `npm run typecheck` — 0 errors

### Phase 3: Modal Component + Page Wiring + Regression
- [x] **Step 3.1:** Create `project/srcs/frontend/src/features/employees/components/CreateEmployeeModal.tsx`; run `npm run typecheck` — 0 errors
- [x] **Step 3.2:** Modify `project/srcs/frontend/src/pages/EmployeesPage.tsx` — add `createOpen` state, heading flex row with "Create New" button, `CreateEmployeeModal` import, `CreateEmployeeModal` conditional mount, `Plus` lucide import
- [x] **Step 3.3:** Update `project/srcs/frontend/src/features/employees/index.ts` — re-export `EmployeeCreateForm` and `EmployeeMiniDTO` if needed externally (verify; may be no-op)
- [x] **Step 3.4 Regression:** `npm run typecheck` = 0 errors; `npm run test` = all tests pass (target: 80 — 75 baseline + 1 service + 4 useCreateEmployee); `npm run build` = success

---

## Potential Issues / Risks

- **Required field validation**: `username`, `email`, and `password` are required by the backend. If any is blank, the backend returns a 400 with "Employee requires username, email, and password." This message surfaces via `axiosErr.response?.data?.message` and is shown inline in the modal. No client-side pre-validation is added — consistent with the edit modal.
- **`firstName`/`lastName` omitted when empty**: The hook uses spread syntax (`...(firstName !== "" ? { firstName } : {})`) to exclude optional fields from the payload when empty. Sending empty strings to the backend would cause unpredictable mapper behavior — omitting them is the safe choice.
- **Form reset on close**: Because `CreateEmployeeModal` is conditionally mounted, all hook state resets automatically on unmount. This means Cancel, Esc, and backdrop-click all cleanly reset the form on next open without needing an explicit `reset()` function. This is the same mechanism used by `EditEmployeeModal` and `DeleteEmployeeModal`.
- **`EmployeeMiniDTO` response not consumed**: The frontend discards the create response body — it only calls `onSuccess()` to trigger `refresh()`. The `EmployeeMiniDTO` type is declared for correctness and future use but is not rendered anywhere in this feature.
- **`Plus` icon import**: `Plus` must be added to the existing lucide-react named import in `EmployeesPage.tsx`. It is already available in the `lucide-react` package installed in the project.

---

## Testing Decisions

**What makes a good test here:** Tests verify observable hook and service behavior through public interfaces, not implementation details. For `createEmployee`: does the correct POST body reach the backend URL and does the response data come back? For `useCreateEmployee`: do the state transitions and service calls match what a caller would observe? Tests must survive renaming or restructuring of internals.

**Modules with TDD:**

| Module | Test file | What is tested |
|--------|-----------|----------------|
| `employeeService` (extended) | `project/srcs/frontend/src/features/employees/services/employeeService.test.ts` | POST /employee receives the correct body; response.data is returned |
| `useCreateEmployee` | `project/srcs/frontend/src/features/employees/hooks/useCreateEmployee.test.ts` | Initial state (all empty fields, not submitting, no error); submit with all fields → correct payload → `onSuccess()` called; optional fields omitted when empty; rejection → `error` set, `onSuccess` not called; `createEmployee` is imported as a value, not `import type`, for `vi.mocked(createEmployee)` |

**Modules without tests (structural):**
- `types.ts` additions — pure type declarations
- `CreateEmployeeModal.tsx` — props-driven display; verified by typecheck + build + manual browser validation
- `EmployeesPage.tsx` modification — additive wiring; verified by typecheck + build + manual browser validation

**Prior art:**
- `project/srcs/frontend/src/features/employees/services/employeeService.test.ts` — axios-mock-adapter pattern for the same service module; the new `createEmployee` test follows the existing describe-block structure
- `project/srcs/frontend/src/features/employees/hooks/useDeleteEmployee.test.ts` — 4-test `renderHook` + `act` + `vi.mock` pattern; `useCreateEmployee` tests follow this structure (both are simple submit-lifecycle hooks)
- `project/srcs/frontend/src/features/employees/hooks/useEditEmployee.test.ts` — canonical `vi.mock("../services/employeeService", ...)` factory covering all service exports; the create hook test replicates this factory with the addition of `createEmployee: vi.fn()`

---

## Task Breakdown

### Task 1: Types + extended service (TDD)
- **Steps Covered:** Steps 1.1, 1.2
- **Reason for Grouping:** Types must exist before the service; the service test and implementation are a single TDD cycle. Low complexity — logically atomic.
- **Planned Task File:** `Create-Employee-Modal-task-1-types-and-service.md`
- **Task Document Link:** [[Create-Employee-Modal-task-1-types-and-service]]

### Task 2: useCreateEmployee hook (TDD)
- **Steps Covered:** Step 2.1
- **Reason for Grouping:** The hook is the core deep module of this feature — 4 behavior tests covering initial state, full-payload submission, optional-field omission, and rejection error lifecycle. Deserves its own focused TDD task.
- **Planned Task File:** `Create-Employee-Modal-task-2-use-create-employee.md`
- **Task Document Link:** [[Create-Employee-Modal-task-2-use-create-employee]]

### Task 3: Modal component + page wiring + regression
- **Steps Covered:** Steps 3.1–3.4
- **Reason for Grouping:** All structural modules (display component + page wiring edits) with no new logic. Executed in order: modal component first, then page wiring, then regression. Closes the feature.
- **Planned Task File:** `Create-Employee-Modal-task-3-modal-and-wiring.md`
- **Task Document Link:** [[Create-Employee-Modal-task-3-modal-and-wiring]]
