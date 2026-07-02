# Task: useDeleteEmployee Hook (TDD)

#task #current #medium-complexity #parent-employee-edit-and-delete-modals

**Parent:** [[Employee-Edit-and-Delete-Modals]]
**Parent Type:** Feature
**Related Step(s):** Phase 4 — Step 4.1 RED (useDeleteEmployee tests), Step 4.1 GREEN (useDeleteEmployee implementation)
**Estimated Complexity:** Medium

---

## Goal

Build the `useDeleteEmployee` hook — the delete-side business logic for the Employee Edit and Delete Modals feature — through a full TDD RED → GREEN cycle. The hook encapsulates delete confirmation checkbox state, the unchecked guard, the delete API call, and the error lifecycle behind a minimal 4-property interface.

---

## Parent Context

[[Features/to-do/Employee-Edit-and-Delete-Modals]] activates the placeholder Edit and Delete buttons on `/employees`. Task 4 delivers the delete-side business logic. Nothing here touches the UI — `DeleteEmployeeModal` (Task 5) is a pure display wrapper that drives props from `useDeleteEmployee`. All orchestration complexity lives in the hook.

### Step 4.1 — `useDeleteEmployee` (TDD, 4 behavior tests)

**Interface (deep module):**
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

**`onConfirm()` logic — exactly as the parent specifies:**
1. Guard: if `!isChecked`, return immediately (belt-and-suspenders; the Delete button should already be disabled).
2. Set `isSubmitting = true`, clear `error`.
3. Call `deleteEmployee(employee.id)`. On rejection → set `error`, clear `isSubmitting`, **return**.
4. Clear `isSubmitting`, call `onSuccess()`.

**4 behavior tests:**
| # | Scenario | What is verified |
|---|----------|-----------------|
| 1 | Unchecked checkbox | `deleteEmployee` NOT called; `onSuccess` NOT called |
| 2 | Correct id | `deleteEmployee` called with `employee.id` when checkbox is checked |
| 3 | `onSuccess` after success | `onSuccess` called; `isSubmitting` resets to false |
| 4 | `deleteEmployee` rejects | `error` set to rejection message; `isSubmitting` false; `onSuccess` NOT called |

**Final test count after Task 4:** 75/75 (71 baseline + 4 new `useDeleteEmployee` tests). This is the feature's final target per the parent.

**`DeleteEmployeeModal` layout (context for what the hook powers):**
- Checkbox + label: "I understand this action is permanent and cannot be undone." → drives `isChecked` / `setIsChecked`
- Delete button: `disabled={!isChecked || isSubmitting}` → primary guard in the UI
- `onConfirm()` guard in the hook: belt-and-suspenders if `isChecked` is somehow bypassed
- Inline error: `<p className="text-sm text-destructive">` shown when `error` is non-null
- Cancel button: calls `onClose` (from `EmployeesPage` — not part of this hook)

---

## Preconditions / Dependencies

- **Task 1 complete** — `dialog.tsx` installed (ADR-010 compliant). `SecurityConfig.java:117` includes `"PATCH"`. Baseline 59/59 tests, 0 typecheck errors, build success.
- **Task 2 complete** — `EmployeeDTO` and `EmployeeUpdateForm` in `types.ts`; `updateEmployee`, `deleteEmployee`, `activateEmployee`, `deactivateEmployee` in `employeeService.ts`. 63/63 tests pass.
- **Task 3 complete** — `useEmployeeList.refresh()` exposed; `useEditEmployee` hook built via TDD. 71/71 tests pass.
- `src/features/employees/services/employeeService.ts` — already exports `deleteEmployee(id: number): Promise<EmployeeDTO>`. No changes required in this task.
- `src/features/employees/types.ts` — already exports `EmployeeListDTO` and `EmployeeDTO`.
- `vitest` 4.1.9, `@testing-library/react` 16.3.2, `jsdom` 29.1.1 — test environment already configured in `vitest.config.ts` (jsdom environment, `@/` alias).
- `verbatimModuleSyntax: true` and `erasableSyntaxOnly: true` in `tsconfig.app.json` — all type-only imports must use `import type`; `enum` is prohibited.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — Selected — document structure, template, placement
- `solid-deep-design` — Selected — depth analysis for `useDeleteEmployee` as a deep module
- `tdd` — Selected — governs the RED → GREEN cycle (4 behavior tests before implementation); vertical slice protocol
- `memory-bank` — Selected — loaded full project context: architecture, tech stack, prior art patterns
- `find-docs` — Selected — queried Vitest 4.x `vi.mock` factory + `renderHook`/`act` patterns at version v4.1.6 to verify the established patterns are current
- `glossary-management` — Loaded (CLI unavailable at session time); proceeded with documented domain terms from the parent feature

### Documentation Reviewed

- **Context7: Vitest v4.1.6 (`/vitest-dev/vitest/v4.1.6`)** — confirmed `vi.mock(path, factory)` string-path form with hoisted factory; `vi.mocked()` for typed access; `vi.clearAllMocks()` clears call history but not implementations (`.mockResolvedValue` persists); `renderHook` + `act` from `@testing-library/react` (not `vitest-browser-react` — this project uses jsdom environment, not browser mode); two-`act` pattern required for state setter then async callback.
- **`src/features/employees/hooks/useEditEmployee.test.ts`** — direct prior art: same `vi.mock` factory covering all 5 service exports, `beforeEach` with `vi.clearAllMocks()` + happy-path `mockResolvedValue`, two-`act` setter/onConfirm split, `vi.mocked()` for typed access. `useDeleteEmployee.test.ts` follows this file's structure exactly.
- **`src/features/employees/hooks/useEditEmployee.ts`** — reference implementation: same error extraction pattern (`err as { response?: { data?: { message?: string } }; message?: string }`); same `isSubmitting` lifecycle in error paths; same plain async function; same no-`useCallback` convention.
- **`src/features/employees/hooks/useEmployeeList.ts`** — confirms plain function convention (no `useCallback`) for all event handlers in this feature module.
- **`documentation/Docs/API-Reference/Employee.md`** — `DELETE /employee/{id}` contract: admin-only, returns `EmployeeDTO`, 404 on not-found. No request body required. Axios `api.delete()` sends no body.

### Related Existing Code

- `src/features/employees/hooks/useEditEmployee.ts` — reference implementation: same structure, same error extraction, same `isSubmitting` lifecycle
- `src/features/employees/hooks/useEditEmployee.test.ts` — canonical test structure for hooks in this feature
- `src/features/employees/services/employeeService.ts` — module being mocked; exports `deleteEmployee` (and 4 others that must also be in the mock factory)
- `src/features/employees/types.ts` — `EmployeeListDTO` and `EmployeeDTO` both available
- `src/features/employees/hooks/useEmployeeList.ts` — confirms no-`useCallback` convention for plain function handlers

---

## Implementation Details

### Approach

**Step 4.1** is a full TDD vertical slice:
1. **RED:** Create `useDeleteEmployee.test.ts` with 4 behavior tests; run tests — 4 tests fail because the module does not exist yet.
2. **GREEN:** Create `useDeleteEmployee.ts` with the hook implementation; run tests — 75/75 pass (71 existing + 4 new).
3. **VERIFY:** Run `typecheck` and `build` to confirm 0 errors.

`useDeleteEmployee` is structurally simpler than `useEditEmployee`: one API call (no conditional branching between PUT and PATCH), no form fields to initialize, no change detection. The only business logic is the unchecked guard and the error lifecycle.

### SOLID + Deep Module Analysis

**Deep module evaluation:**
- If `useDeleteEmployee` were deleted, the following complexity would scatter into `DeleteEmployeeModal`: checkbox state management, guard logic (`!isChecked` early return), `setIsSubmitting(true)` at the right moment, `setError(null)` before the call, error extraction from the caught exception, `setIsSubmitting(false)` in both the error and success paths, and `onSuccess()` invocation after the service call. That is non-trivial behavior behind a 2-parameter interface — the hook earns its keep.
- **SRP**: One reason to change — the delete confirmation workflow. If the checkbox label changes, only `DeleteEmployeeModal` changes. If the API endpoint changes, only `employeeService.ts` changes. If the confirmation logic changes (e.g., additional validation), only `useDeleteEmployee` changes.
- **DIP**: `useDeleteEmployee` depends on `deleteEmployee` as a module-level import (a mockable seam). The test's `vi.mock` factory is evidence that DIP is satisfied: the seam is there and both a production adapter (real Axios call) and a test adapter (`vi.fn()` mock) exist.
- **ISP**: The interface is exactly what `DeleteEmployeeModal` needs — `isChecked`/`setIsChecked` for the checkbox, `isSubmitting` to disable the Delete button during the call, `error` to render the inline error banner, and `onConfirm` for the Delete button's `onClick`. No unused methods.

### Files to Create/Modify

- [x] `project/srcs/frontend/src/features/employees/hooks/useDeleteEmployee.test.ts` — **new** — 4 behavior tests (Step 4.1 RED)
- [x] `project/srcs/frontend/src/features/employees/hooks/useDeleteEmployee.ts` — **new** — hook implementation (Step 4.1 GREEN)

---

## Step-by-Step Implementation

### Step 4.1 RED: Create `useDeleteEmployee.test.ts`

**Goal:** Write 4 behavior tests that define the observable contract of `useDeleteEmployee`. All 4 must fail because the module does not yet exist — this is the RED gate.
**Dependencies:** Task 3 complete (71/71 tests pass); `employeeService.ts` exports `deleteEmployee`; `types.ts` exports `EmployeeListDTO` and `EmployeeDTO`.

- [x] Create `src/features/employees/hooks/useDeleteEmployee.test.ts`
- [x] Run `npm --prefix project/srcs/frontend run test` — confirm 4 new tests FAIL with "Failed to resolve import" and 71 existing tests still pass

**Why the RED state is important:** The tests lock in the expected interface (`setIsChecked`, `onConfirm`, `error`, `isSubmitting`, `isChecked`) and the 4 behavioral contracts before any implementation is written. The "module not found" error confirms the tests are testing genuinely absent code.

#### Implementation

Full `src/features/employees/hooks/useDeleteEmployee.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useDeleteEmployee } from "./useDeleteEmployee"
import { deleteEmployee } from "../services/employeeService"
import type { EmployeeListDTO, EmployeeDTO } from "../types"

// Mock all service exports to prevent HTTP leaks from any function in the module.
// The module factory pattern (string path + factory function) is hoisted before
// imports by Vitest — this is the established pattern in this codebase.
vi.mock("../services/employeeService", () => ({
  listEmployees: vi.fn(),
  updateEmployee: vi.fn(),
  activateEmployee: vi.fn(),
  deactivateEmployee: vi.fn(),
  deleteEmployee: vi.fn(),
}))

const mockDeleteEmployee = vi.mocked(deleteEmployee)

const mockEmployeeDTO: EmployeeDTO = {
  firstName: "Alice",
  lastName: "Smith",
  email: "alice@example.com",
  username: "alice",
  roles: ["ROLE_EMPLOYEE"],
  enabled: true,
}

const mockEmployee: EmployeeListDTO = {
  id: 42,
  firstName: "Alice",
  lastName: "Smith",
  email: "alice@example.com",
  username: "alice",
  roles: ["ROLE_EMPLOYEE"],
  enabled: true,
  dateCreated: "2024-01-01T00:00:00Z",
  lastLogin: null,
}

describe("useDeleteEmployee", () => {
  const onSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockDeleteEmployee.mockResolvedValue(mockEmployeeDTO)
  })

  // ── Test 1: Guard — unchecked checkbox ────────────────────────────────────────
  it("does nothing when the confirmation checkbox is unchecked", async () => {
    const { result } = renderHook(() => useDeleteEmployee(mockEmployee, onSuccess))

    await act(async () => {
      await result.current.onConfirm()
    })

    expect(mockDeleteEmployee).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  // ── Test 2: Correct id passed to deleteEmployee ───────────────────────────────
  it("calls deleteEmployee with the correct employee id when the checkbox is checked", async () => {
    const { result } = renderHook(() => useDeleteEmployee(mockEmployee, onSuccess))

    await act(async () => {
      result.current.setIsChecked(true)
    })
    await act(async () => {
      await result.current.onConfirm()
    })

    expect(mockDeleteEmployee).toHaveBeenCalledWith(mockEmployee.id)
  })

  // ── Test 3: onSuccess called after successful delete ─────────────────────────
  it("calls onSuccess and resets isSubmitting after a successful delete", async () => {
    const { result } = renderHook(() => useDeleteEmployee(mockEmployee, onSuccess))

    await act(async () => {
      result.current.setIsChecked(true)
    })
    await act(async () => {
      await result.current.onConfirm()
    })

    expect(onSuccess).toHaveBeenCalledOnce()
    expect(result.current.isSubmitting).toBe(false)
    expect(result.current.error).toBeNull()
    // REVIEW-FIX: Added error assertion — a bug that accidentally sets error in the
    // try-success branch would not otherwise be caught by this test.
  })

  // ── Test 4: deleteEmployee rejection → error set, onSuccess not called ────────
  it("sets error and does not call onSuccess when deleteEmployee rejects", async () => {
    mockDeleteEmployee.mockRejectedValueOnce(new Error("Delete failed"))
    const { result } = renderHook(() => useDeleteEmployee(mockEmployee, onSuccess))

    await act(async () => {
      result.current.setIsChecked(true)
    })
    await act(async () => {
      await result.current.onConfirm()
    })

    expect(result.current.error).toBe("Delete failed")
    expect(result.current.isSubmitting).toBe(false)
    expect(result.current.isChecked).toBe(true)
    // REVIEW-FIX: Added isChecked assertion — the hook intentionally preserves isChecked=true
    // on failure so the admin can retry without re-checking the box. This locks that behavior.
    expect(onSuccess).not.toHaveBeenCalled()
  })
})
```

**Test design rationale:**

- **All 5 service exports in the `vi.mock` factory** — `listEmployees`, `updateEmployee`, `activateEmployee`, `deactivateEmployee`, `deleteEmployee` are all included. This prevents any of them from making real HTTP calls if Vitest's module resolution causes a side effect. This is the mandatory pattern established in `useEditEmployee.test.ts`.
- **`id: 42` in `mockEmployee`** — a non-default value (not `1`) makes the "correct id" assertion in Test 2 more meaningful. `toHaveBeenCalledWith(42)` would catch a bug where the hook hardcodes `1`, while `toHaveBeenCalledWith(1)` would pass for the wrong reason.
- **`beforeEach`: `vi.clearAllMocks()` + `mockResolvedValue(mockEmployeeDTO)`** — `clearAllMocks()` resets call history only (not implementations). The `mockResolvedValue` line is a defensive re-set for the happy-path default. Test 4 overrides with `mockRejectedValueOnce` only for the rejection scenario.
- **Two-`act` pattern (Tests 2, 3, 4)** — `setIsChecked(true)` in a first `act` ensures React processes the state update before `onConfirm()` runs. If both ran in a single `act`, `onConfirm`'s closure would capture `isChecked = false` and the guard would fire.
- **Test 1 uses a single `act`** — no state setter needed; `isChecked` starts as `false`, so calling `onConfirm()` immediately exercises the guard branch.
- **Tests 2 and 3 share the same scenario** — checking the checkbox and confirming. They assert different observable behaviors: Test 2 asserts the correct service call argument; Test 3 asserts the success callback and `isSubmitting` reset. Keeping them separate follows the spec's 4-test structure and isolates each behavioral contract.

#### Edge Cases

1. **Case:** `vi.mock` factory is hoisted — the `import { deleteEmployee }` at the top of the test file refers to the mocked version, not the real function.
   **Handling:** This is the expected behavior. `vi.mocked(deleteEmployee)` wraps the already-mocked function for typed access. The factory includes all 5 exports to prevent any leaks.

2. **Case:** Test 1 — `onConfirm()` is async, but no service calls happen (guard fires immediately).
   **Handling:** `await act(async () => { await result.current.onConfirm() })` is correct even for the guard path. The `onConfirm` function is `async`, so it returns a Promise that resolves immediately on the guard path. No state updates happen, so `act` is technically optional here — but wrapping in `act` is defensive and consistent with Tests 2–4.

3. **Case:** `isChecked` starts as `false` — Test 1 relies on this default without explicitly asserting it.
   **Handling:** The default state is implicitly verified: if `isChecked` started as `true`, the guard would not fire and `deleteEmployee` would be called, failing Test 1's `expect(mockDeleteEmployee).not.toHaveBeenCalled()`.

4. **Case:** `mockEmployee.id` is `42` — distinct from `1` used in `useEditEmployee.test.ts` fixtures.
   **Handling:** Using `42` rather than `1` makes the ID assertion in Test 2 more discriminating. Both fixtures are local to their test files; no shared state.

---

### Step 4.1 GREEN: Create `useDeleteEmployee.ts`

**Goal:** Implement `useDeleteEmployee` so all 4 RED tests pass. No extra functionality beyond what the tests specify.
**Dependencies:** Step 4.1 RED complete (4 failing tests); Task 3 baseline at 71/71.

- [x] Create `src/features/employees/hooks/useDeleteEmployee.ts`
- [x] Run `npm --prefix project/srcs/frontend run test` — confirm **75/75** pass (71 existing + 4 new)
- [x] Run `npm --prefix project/srcs/frontend run typecheck` — confirm 0 errors
- [x] Run `npm --prefix project/srcs/frontend run build` — confirm build succeeds

**Why this step is critical:** `useDeleteEmployee` is the only source of delete confirmation state and `onConfirm` orchestration in the feature. `DeleteEmployeeModal` (Task 5) is a thin wrapper around this hook's return value. If the guard fires at the wrong time, or `isSubmitting` does not reset on error, bugs will appear in the browser rather than in tests.

#### Implementation

Full `src/features/employees/hooks/useDeleteEmployee.ts`:

```typescript
import { useState } from "react"
import type { EmployeeListDTO } from "../types"
import { deleteEmployee } from "../services/employeeService"

interface UseDeleteEmployeeResult {
  isChecked: boolean
  setIsChecked: (v: boolean) => void
  isSubmitting: boolean
  error: string | null
  onConfirm: () => Promise<void>
}

export function useDeleteEmployee(
  employee: EmployeeListDTO,
  onSuccess: () => void
): UseDeleteEmployeeResult {
  const [isChecked, setIsChecked] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onConfirm() {
    if (!isChecked) return

    setIsSubmitting(true)
    setError(null)

    try {
      await deleteEmployee(employee.id)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string }
      const message =
        axiosErr.response?.data?.message ??
        axiosErr.message ??
        "Failed to delete employee."
      setError(message)
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(false)
    onSuccess()
  }

  return {
    isChecked,
    setIsChecked,
    isSubmitting,
    error,
    onConfirm,
  }
}
```

**Import decisions:**
- `import type { EmployeeListDTO }` — `EmployeeListDTO` is an interface; `verbatimModuleSyntax: true` requires `import type`.
- `EmployeeDTO` is NOT imported — `onConfirm()` discards the `deleteEmployee` return value. The hook relies on `onSuccess → refresh()` to repopulate the list. Importing `EmployeeDTO` would be an unused import.
- Only `deleteEmployee` is imported from `employeeService` — this hook orchestrates deletion only. The other four service functions are NOT imported (SRP: one hook, one operation).

**`isChecked` initializes as `false`:**
The modal opens fresh each time (conditional rendering via `{deleteEmployee && <DeleteEmployeeModal />}` in `EmployeesPage` — Task 5). The checkbox must always start unchecked, forcing the admin to explicitly acknowledge before the Delete button enables.

**`isSubmitting` lifecycle — two exit paths:**
1. Guard path (`!isChecked`): `isSubmitting` was never set to `true`; no reset needed.
2. Error catch: `setIsSubmitting(false); return`.
3. Happy path: `setIsSubmitting(false); onSuccess()`.
Tests 3 and 4 verify the `false` state after the async paths.

**Error extraction pattern:**
Same structural cast as `useEditEmployee` — handles 404 (backend returns message in `response.data.message`), plain Axios errors (`axiosErr.message`), and plain `Error` objects from tests. The `instanceof Error` check is not needed; the cast's `message?: string` covers all typed error cases, and non-Error thrown values fall through to the hardcoded fallback.

**`onSuccess()` called AFTER `setIsSubmitting(false)`:**
React's `onSuccess` callback in `EmployeesPage` will call `setDeleteEmployee(null)`, unmounting the modal and the hook. The hook has already finished all state updates before invoking `onSuccess()`. No stale state update on unmounted component. No `AbortController` or `isMounted` ref needed.

#### Edge Cases

1. **Case:** `onConfirm()` called when `isChecked = false` — the guard fires.
   **Handling:** `if (!isChecked) return` is the first line after entering the function. `isSubmitting` is never set to `true`. `error` is never cleared (it was already `null` from initialization). No state changes, no service call. Test 1 verifies this.

2. **Case:** `deleteEmployee` rejects with an Axios 404 error (employee already deleted by another admin session).
   **Handling:** The catch block extracts `response.data.message` (backend's "Employee not found" message), sets `error`, resets `isSubmitting`, and returns without calling `onSuccess()`. The admin sees the error in the modal and can close it manually. The list will NOT refresh (no `onSuccess`), so the now-deleted employee may still appear in the table until the next manual navigation or filter action. Acceptable for MVP.

3. **Case:** `deleteEmployee` resolves successfully, `onSuccess()` is called, which calls `setDeleteEmployee(null)` in `EmployeesPage`, unmounting the modal and hook before any subsequent React state update.
   **Handling:** `setIsSubmitting(false)` runs before `onSuccess()`. No state updates occur after `onSuccess()`. React will not warn about updates on unmounted components. No cleanup needed.

4. **Case:** Admin double-clicks the Delete button before `setIsSubmitting(true)` re-renders (disabling the button).
   **Handling:** The primary mitigation is `disabled={!isChecked || isSubmitting}` on the Delete button in `DeleteEmployeeModal` (Task 5). The hook's `!isChecked` guard is not a double-submit guard. A `useRef` guard in the hook would provide defense-in-depth but is untested behavior beyond the spec's 4 tests — it should not be added silently. **Recommendation for Task 5:** wire `disabled={!isChecked || isSubmitting}` on the Delete button (the parent spec requires this).

5. **Case:** `deleteEmployee` fails — should `isChecked` reset to `false`?
   **Handling:** No. The implementation intentionally does NOT call `setIsChecked(false)` in the catch block. `isChecked` stays `true` after a failed delete. This preserves the admin's acknowledgment so they can retry immediately (the Delete button stays enabled since `disabled={!isChecked || isSubmitting}` resolves to `false` once `isSubmitting` resets). If the hook reset `isChecked` on failure, the admin would need to re-check the box before retrying — unnecessary friction after a network error. Test 4 locks this behavior with `expect(result.current.isChecked).toBe(true)`.
<!-- REVIEW-FIX: Added isChecked persistence edge case — this is a non-obvious design choice
that must be documented so Task 5 implementers understand why the retry UX works without
the modal resetting the checkbox after an error. -->

6. **Case:** `UseDeleteEmployeeResult` interface not exported — callers cannot explicitly annotate the return type.
   **Handling:** Callers (`DeleteEmployeeModal` in Task 5) will destructure via the returned values without needing to name the type. If a caller needs the explicit type, they can use `ReturnType<typeof useDeleteEmployee>`. Consistent with `UseEditEmployeeResult` and `UseEmployeeListResult` — both are unexported in this codebase.

---

## Design Decisions

**Decision 1: `UseDeleteEmployeeResult` interface is not exported**
- **Why:** Only `DeleteEmployeeModal` (Task 5) consumes the hook, and it accesses the return value via destructuring. No other module needs to type-annotate `UseDeleteEmployeeResult` explicitly. Consistent with `UseEmployeeListResult` (unexported in `useEmployeeList.ts`) and `UseEditEmployeeResult` (unexported in `useEditEmployee.ts`). If a caller needs the type, `ReturnType<typeof useDeleteEmployee>` is available.
- **Alternatives considered:** Export `UseDeleteEmployeeResult` — deferred. If Task 5 or future tests require it, it can be exported then.

**Decision 2: `isChecked` initializes as `false` without a test explicitly asserting the initial value**
- **Why:** The initial `false` state is implicitly verified by Test 1 — if `isChecked` started `true`, the guard would not fire and `deleteEmployee` would be called, failing `expect(mockDeleteEmployee).not.toHaveBeenCalled()`. Adding an explicit initialization test (like Test 1 in `useEditEmployee.test.ts`) would add a 5th test beyond the parent spec's mandated 4. The state is simpler here: 3 fields with obvious defaults (`false`, `false`, `null`) vs. `useEditEmployee`'s 8 fields with values derived from the employee prop.
- **Alternatives considered:** Add a 5th initialization test — rejected. The parent spec fixes the test count at 4, and the initialization is implicitly verified by the guard test.

**Decision 3: `onConfirm` as a plain async function (no `useCallback`)**
- **Why:** Consistent with all event handlers in this codebase (`fetchEmployees`, `onFilterFieldChange`, `onPageChange`, `refresh`, `onSave` in `useEditEmployee`). `onConfirm`'s closure dependencies are `isChecked`, `employee.id`, `onSuccess`, and `deleteEmployee` — all of which cause re-renders when they change, making memoization useless. `useCallback` would require a complete deps array and recreate on every relevant state change anyway.
- **Alternatives considered:** `useCallback(onConfirm, [...])` — rejected per the codebase-wide no-`useCallback` convention for event handlers in this project.

**Decision 4: Error message extraction without importing `AxiosError`**
- **Why:** Same reasoning as `useEditEmployee` (Decision 4 in Task 3): the hook is a business logic module and should not be coupled to HTTP transport details. The structural cast `err as { response?: { data?: { message?: string } }; message?: string }` is duck-typed and handles Axios errors, plain `Error` objects (as thrown by the test mocks), and any other thrown value. The `isAxiosError` guard from `axios` would prevent `.message` access on the plain `Error` thrown by `mockRejectedValueOnce(new Error("Delete failed"))` in Test 4, breaking the test. The inline cast pattern is the spec-mandated choice.
- **Alternatives considered:** `import { isAxiosError } from "axios"` + type guard — rejected (see reasoning above; breaks Test 4).

**Decision 5: Tests 2 and 3 test the same scenario**
- **Why:** Tests 2 and 3 both require the same setup (set checkbox, call `onConfirm`). They assert different observable behaviors: Test 2 asserts the correct `id` was passed to `deleteEmployee`; Test 3 asserts `onSuccess` was called and `isSubmitting` reset. The parent spec lists them as separate test items. Keeping them separate isolates each behavioral contract and makes failures more diagnostic — a failure in Test 2 specifically means "wrong id" while a failure in Test 3 means "callback not invoked or isSubmitting stuck".
- **Alternatives considered:** Combine Tests 2 and 3 into one happy-path test — would reduce count to 3 tests (violating the parent spec's 4). Rejected.

**Decision 6: `onSuccess()` called after `setIsSubmitting(false)`, not before**
- **Why:** `onSuccess()` in `EmployeesPage` calls `setDeleteEmployee(null)`, which unmounts the hook. Any state updates that run after `onSuccess()` (e.g., a misplaced `setIsSubmitting(false)` after the call) would fire on an unmounted component, producing a React warning. Calling `setIsSubmitting(false)` before `onSuccess()` ensures all state cleanup completes while the component is still mounted.
- **Alternatives considered:** `onSuccess(); setIsSubmitting(false)` — rejected because `onSuccess` triggers unmount; state updates after unmount generate React warnings.

---

## Testing Considerations

### Automatic Validation

Run from project root (`/home/jlievano/Dropbox/CodeProjects/42-last`):

- [x] After Step 4.1 RED: `npm --prefix project/srcs/frontend run test` — must show 4 new test failures (`Failed to resolve import "./useDeleteEmployee"`); 71 existing tests still pass
- [x] After Step 4.1 GREEN: `npm --prefix project/srcs/frontend run test` — must return **75/75** passing (71 existing + 4 new `useDeleteEmployee` tests)
- [x] After Step 4.1 GREEN: `npm --prefix project/srcs/frontend run typecheck` — must return 0 errors
- [x] After Step 4.1 GREEN: `npm --prefix project/srcs/frontend run build` — must succeed

### Manual Validation

No manual validation required for this task. `useDeleteEmployee` is a pure React hook with no UI rendering and no browser-only behavior. Automatic validation (typecheck + test + build) is sufficient. End-to-end browser validation of the Delete modal — including the checkbox enabling the Delete button, the confirmation guard, the error banner on failure, and the list refresh on success — is deferred to Task 5, which wires `useDeleteEmployee` into `DeleteEmployeeModal` and `EmployeesPage`.

---

## Related Code Explanations

- `src/features/employees/hooks/useEditEmployee.ts:1–120` — reference implementation: same structure, same `onSave` → `onConfirm` analogy, same error extraction pattern, same `isSubmitting` lifecycle
- `src/features/employees/hooks/useEditEmployee.test.ts:1–445` — canonical test structure for hooks in this feature: `vi.mock` factory covering all 5 exports, `beforeEach` with `vi.clearAllMocks()` + happy-path defaults, two-`act` pattern
- `src/features/employees/services/employeeService.ts:1–38` — the service module mocked in `useDeleteEmployee.test.ts`; all 5 exports must be in the mock factory
- `src/features/employees/types.ts:1–79` — source of `EmployeeListDTO` and `EmployeeDTO` used in the hook and test file
- `documentation/Docs/API-Reference/Employee.md` — `DELETE /employee/{id}` endpoint contract: admin-only, returns `EmployeeDTO`, 404 on not-found

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected for this task
- [x] Up-to-date documentation reviewed (Vitest v4.1.6 via Context7; Employee API reference; prior art in codebase)
- [x] `src/features/employees/hooks/useDeleteEmployee.test.ts` created with 4 behavior tests (Step 4.1 RED confirmed: 4 new failures + 71 existing passing)
- [x] `src/features/employees/hooks/useDeleteEmployee.ts` created (Step 4.1 GREEN confirmed)
- [x] `npm run test` = **75/75** passing after Step 4.1 GREEN (71 baseline + 4 new)
- [x] `npm run typecheck` = 0 errors after Step 4.1 GREEN
- [x] `npm run build` = success after Step 4.1 GREEN
- [x] Parent feature Step 4.1 (RED and GREEN) marked `[x]` in [[Features/to-do/Employee-Edit-and-Delete-Modals]]
- [x] Parent feature Task 4 section updated with wiki link `[[Employee-Edit-and-Delete-Modals-task-4-use-delete-employee]]`

---

## Post-Review Notes

Autonomous review of the completed implementation (both `useDeleteEmployee.test.ts` and `useDeleteEmployee.ts`) against the Task spec and prior art (`useEditEmployee.ts`, `useEditEmployee.test.ts`): **0 bugs, 0 architectural issues, 0 correctness gaps, 0 patches.**

- **RED confirmed (verbatim):** `Failed to resolve import "./useDeleteEmployee"` from `useDeleteEmployee.test.ts` — 1 failed suite, 71 existing tests still pass.
- **GREEN confirmed:** 13 test files / 75 tests pass (71 + 4). `tsc --noEmit` = 0 errors. `vite build` = success (497.48 kB JS / 164.16 kB gzip — byte-identical bundle to the Task 3 baseline, confirming no accidental dependency pull).
- **Test design verified:** `vi.mock` factory covers all 5 service exports (anti-leak pattern); `id: 42` makes the "correct id" assertion discriminating; two-`act` setter/onConfirm split (Tests 2–4) prevents closure-capture of stale `isChecked`; `beforeEach` reseals `mockResolvedValue` for the happy path; Test 4 uses `mockRejectedValueOnce` and locks `isChecked` persistence-on-failure (retry UX).
- **Implementation design verified:** `import type` for `EmployeeListDTO` (per `verbatimModuleSyntax`); `EmployeeDTO` deliberately NOT imported (return value discarded → no unused import); only `deleteEmployee` value-imported (SRP — one hook, one operation); `UseDeleteEmployeeResult` unexported (Decision 1, consistent with `useEditEmployee`/`useEmployeeList`); `onConfirm` is a plain async function, no `useCallback` (Decision 3, codebase convention); guard `if (!isChecked) return` is the first statement; `setIsSubmitting(false)` runs before `onSuccess()` (Decision 6 — avoids unmounted-component state update); error-extraction cast matches `useEditEmployee` exactly (`response.data.message ?? message ?? "Failed to delete employee."`).
- All automatic completion criteria satisfied. No manual validation required for this task (pure hook, no UI — deferred to Task 5 for browser-side modal validation).
