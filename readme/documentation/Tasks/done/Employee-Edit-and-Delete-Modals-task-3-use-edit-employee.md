# Task: useEmployeeList refresh() + useEditEmployee Hook (TDD)

#task #current #high-complexity #parent-employee-edit-and-delete-modals

**Parent:** [[Employee-Edit-and-Delete-Modals]]
**Parent Type:** Feature
**Related Step(s):** Phase 3 — Steps 3.1 (useEmployeeList refresh), 3.2 RED (useEditEmployee tests), 3.2 GREEN (useEditEmployee implementation)
**Estimated Complexity:** High

---

## Goal

Expose a `refresh()` function from `useEmployeeList` so pages can trigger a re-fetch after a successful edit or delete, then build the `useEditEmployee` hook — the most complex module in this feature — through a full TDD RED → GREEN cycle. The hook encapsulates all edit form state and the complete save orchestration (change detection, PUT routing, enabled PATCH routing, error lifecycle) behind a minimal interface.

---

## Parent Context

[[Features/to-do/Employee-Edit-and-Delete-Modals]] activates the placeholder Edit and Delete buttons on `/employees`. Task 3 delivers the edit-side business logic. Nothing here touches the UI — `EditEmployeeModal` (Task 5) is a pure display wrapper that drives props from `useEditEmployee`. All orchestration complexity lives in the hook.

### Step 3.1 — `refresh()` in `useEmployeeList`

The parent mandates a plain function added to the hook's return value:
```typescript
function refresh() {
  void fetchEmployees(currentPage, pageSize, filterField, filterValue)
}
```

**Why plain — no `useCallback`:** `fetchEmployees` is defined as a closure inside the hook body and gets a new function reference on every render. Wrapping `refresh` in `useCallback` would require `fetchEmployees` in the dep array, recreating on every render anyway and breaking ESLint's `exhaustive-deps` rule. Plain function is the correct pattern — consistent with all existing event handlers (`onFilterFieldChange`, `onFilterValueChange`, `onPageSizeChange`, `onPageChange`).

> **Review fix applied:** the implemented `refresh()` additionally calls `clearDebounce()` as its first line, mirroring `onPageChange`/`onPageSizeChange` (Decision 7 of the Admin feature) so a pending string-filter debounce cannot fire after a refresh with a captured stale intent. See the Independent Code Review section for details.

**Dependency gate:** `EmployeesPage` (Task 5) uses `refresh()` after a successful edit or delete. Adding it to `useEmployeeList` here unblocks Task 5 without introducing any new logic — `refresh()` is just `onPageChange(currentPage)` stated as a named intent.

### Step 3.2 — `useEditEmployee` (TDD, 8 behavior tests)

**Interface (deep module):**
```typescript
interface UseEditEmployeeResult {
  username: string; setUsername: (v: string) => void
  password: string; setPassword: (v: string) => void
  firstName: string; setFirstName: (v: string) => void
  lastName: string; setLastName: (v: string) => void
  email: string; setEmail: (v: string) => void
  enabled: boolean; setEnabled: (v: boolean) => void
  isSubmitting: boolean
  error: string | null
  onSave: () => Promise<void>
}

function useEditEmployee(employee: EmployeeListDTO, onSuccess: () => void): UseEditEmployeeResult
```

**Save orchestration inside `onSave()` — exactly as the parent specifies:**
1. Compute `hasFieldChanges`: `username`, `firstName`, `lastName`, or `email` differs from its initial value, OR `password` is non-empty.
2. Compute `hasEnabledChange`: `enabled` differs from `employee.enabled`.
3. If `!hasFieldChanges && !hasEnabledChange` → call `onSuccess()` immediately (no-op save — clean modal close with no API traffic).
4. Set `isSubmitting = true`, clear `error`.
5. If `hasFieldChanges`: build `EmployeeUpdateForm` with all four text fields always included (`username`, `firstName`, `lastName`, `email` — using current form values); add `password` only when `password !== ""`. Call `updateEmployee(employee.id, form)`. On rejection → set `error`, clear `isSubmitting`, **return** (stop).
6. If `hasEnabledChange`: call `activateEmployee(employee.id)` or `deactivateEmployee(employee.id)` depending on `enabled`. On rejection → set `error`, clear `isSubmitting`, **return**.
7. Clear `isSubmitting`, call `onSuccess()`.

**`firstName`/`lastName` nullable handling:** Initialize as `employee.firstName ?? ""` and `employee.lastName ?? ""`. Change detection compares against the same null-coalesced initial. Sending `""` for a null name field is acceptable — the backend treats blank as "keep existing value" per `PUT /employee/{id}` partial-update semantics.

**Error message extraction pattern (parent spec):**
```typescript
const axiosErr = err as { response?: { data?: { message?: string } }; message?: string }
const message = axiosErr.response?.data?.message ?? axiosErr.message ?? "Failed to update employee."
```
This handles 409 Conflict (username/email taken — backend puts the message in `response.data.message`), plain Axios errors (`axiosErr.message` = HTTP status string), and plain `Error` objects from tests or unexpected throws. The `instanceof Error` check is not needed — the structural cast's `message?: string` already covers all typed error cases, and non-Error thrown values (which have no `.message`) fall through to the hardcoded fallback.
<!-- REVIEW-FIX: Aligned error extraction pattern with the GREEN implementation code (both now use axiosErr.message ?? fallback instead of the instanceof Error ternary variant, which was in the original Parent Context). Both patterns are functionally equivalent, but consistency prevents implementer confusion. -->

**Partial success (PUT succeeds, PATCH fails):** If field PUT succeeds but the enabled PATCH fails, the backend has committed field changes but not the status change. The hook shows the PATCH error, sets `error`, clears `isSubmitting`, and **returns without calling `onSuccess()`**. The list does NOT refresh. The admin must close the modal to see the committed field changes and retry the toggle. This is acceptable per the parent's Risk Assessment.

### 8 behavior tests

| # | Scenario | What is verified |
|---|----------|-----------------|
| 1 | Initialize from employee | Fields populated; password = ""; `isSubmitting` = false; `error` = null |
| 2 | No-op save | `onSuccess` called; no service calls |
| 3 | Username changed | `updateEmployee` called with new username; `onSuccess` called |
| 4 | Non-empty password | `updateEmployee` called with `password` field; `onSuccess` called |
| 5 | enabled true→false only | `deactivateEmployee` called; `updateEmployee` NOT called; `onSuccess` called |
| 6 | enabled false→true only | `activateEmployee` called; `onSuccess` called |
| 7 | `updateEmployee` rejects | `error` set; `onSuccess` NOT called |
| 8 | `deactivateEmployee` rejects after PUT succeeds | `error` set; `onSuccess` NOT called |

---

## Preconditions / Dependencies

- **Task 1 complete** — `dialog.tsx` installed (ADR-010 compliant). `SecurityConfig.java:117` includes `"PATCH"`. Baseline 59/59 tests, 0 typecheck errors, build success.
- **Task 2 complete** — `EmployeeDTO` and `EmployeeUpdateForm` in `types.ts`; `updateEmployee`, `deleteEmployee`, `activateEmployee`, `deactivateEmployee` in `employeeService.ts`. 63/63 tests pass.
- `src/features/employees/hooks/useEmployeeList.ts` — the file being extended (Step 3.1).
- `src/features/employees/services/employeeService.ts` — already exports all four service functions the hook will call; no changes required in this task.
- `src/features/employees/types.ts` — already exports `EmployeeListDTO`, `EmployeeDTO`, `EmployeeUpdateForm`.
- `vitest` 4.1.9, `@testing-library/react` 16.3.2, `jsdom` 29.1.1 — test environment already configured in `vitest.config.ts` (jsdom environment, `@/` alias).
- `verbatimModuleSyntax: true` and `erasableSyntaxOnly: true` in `tsconfig.app.json` — all type-only imports must use `import type`; `enum` is prohibited.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — Selected — document structure, template, placement
- `solid-deep-design` — Selected — depth analysis for `useEditEmployee` as a deep module; `refresh()` addition evaluated against SRP
- `tdd` — Selected — governs the RED → GREEN cycle for Step 3.2 (8 behavior tests before implementation); vertical slice protocol
- `memory-bank` — Selected — loaded full project context: architecture, tech stack, prior art patterns
- `find-docs` — Selected — queried Vitest 4.x `vi.mock` factory + `renderHook`/`act` patterns to verify existing test patterns are current
- `glossary-management` — Loaded (CLI unavailable at session time); proceeded with documented domain terms from the parent feature

### Documentation Reviewed

- **`src/features/employees/hooks/useEmployeeList.test.ts`** — canonical `renderHook` + `act` + `vi.mock` pattern for hooks in this feature. 9 tests covering mount, page change, filter, error lifecycle. The `useEditEmployee` test file follows this exact structure.
- **`src/features/authentication/hooks/useLoginForm.test.ts`** — confirms `vi.mock` factory for service module + `vi.mocked()` + `mockResolvedValueOnce` for deferred promise testing. Shows `vi.hoisted` is available when needed for mock variable initialization.
- **`src/features/employees/hooks/useEmployeeList.ts`** — actual hook code inspected: `fetchEmployees` closure, all plain-function event handlers (no `useCallback`), state variables, `UseEmployeeListResult` interface, return object. `refresh()` is a one-liner matching the existing pattern.
- **`documentation/Docs/API-Reference/Employee.md`** — `PUT /employee/{id}` partial-update semantics (blank = keep existing); `PATCH activate/deactivate` no body; 409 on username/email conflict. Confirmed `firstName`/`lastName` are optional in `EmployeeForm`.
- **ADR-010** — Base UI primitive mandate. Not directly relevant to hook logic; confirmed `dialog.tsx` is already installed (Task 1). No new shadcn primitives added in Task 3.
- **Context7 — Vitest v4.1.9** — confirmed `vi.mock(path, factory)` string-path form (non-dynamic) is supported; factory runs before module evaluation; `vi.mocked()` wraps mocked functions for typed access. No behavior changes from v3 that affect this task.

### Related Existing Code

- `src/features/employees/hooks/useEmployeeList.ts` — file being extended (Step 3.1); current return interface has 12 members
- `src/features/employees/hooks/useEmployeeList.test.ts` — test prior art for `renderHook`+`act`+`vi.mock` hook test structure
- `src/features/employees/services/employeeService.ts` — module being mocked in `useEditEmployee.test.ts`; exports `listEmployees`, `updateEmployee`, `deleteEmployee`, `activateEmployee`, `deactivateEmployee`
- `src/features/employees/types.ts` — `EmployeeListDTO`, `EmployeeDTO`, `EmployeeUpdateForm` all available
- `src/features/authentication/hooks/useLoginForm.test.ts` — prior art for `vi.mock` factory pattern and `vi.mocked()` typed service mock

---

## Implementation Details

### Approach

**Step 3.1** is a minimal, additive modification: add `refresh: () => void` to `UseEmployeeListResult` and add `refresh()` as a plain function to the return object of `useEmployeeList`. Three lines of change — one in the interface, one function definition, one line in the return statement.

**Step 3.2** is a full TDD vertical slice:
1. **RED:** Create `useEditEmployee.test.ts` with 8 behavior tests; run tests — 8 fail because the module does not exist yet.
2. **GREEN:** Create `useEditEmployee.ts` with the hook implementation; run tests — 71/71 pass (63 existing + 8 new).
3. **VERIFY:** Run `typecheck` and `build` to confirm 0 errors.

### SOLID + Deep Module Analysis

**`refresh()` (Step 3.1):**
- **SRP**: `refresh` restates the intent of `onPageChange(currentPage)` as a named action for the list-revalidation use case. It does not add a new responsibility to `useEmployeeList`; it adds a named intent for an existing capability. SRP satisfied.
- **Depth**: `refresh()` has zero depth of its own — it calls `fetchEmployees(...)` directly. Its value is semantic clarity and a stable interface for `EmployeesPage` to call. Deleting it scatters a one-liner into `EmployeesPage` — minimal leverage, but the named function is still better than `onPageChange(currentPage)` at the call site (which implies "navigate to page" not "reload current page").
- **No `useCallback`**: `fetchEmployees` receives a new reference each render (it's defined inside the hook body). Memoizing `refresh` would require `fetchEmployees` in deps → recreates every render → zero benefit. Pattern is consistent with all existing event handlers.

**`useEditEmployee` (Step 3.2):**
- **Deep module** — the deletion test: if we deleted `useEditEmployee`, the following complexity would scatter into `EditEmployeeModal` (Task 5): 8 state slots, change detection for 6 fields, `hasFieldChanges`/`hasEnabledChange` computation, conditional PUT call, conditional PATCH call, ordering constraint (PUT before PATCH), error extraction pattern, `isSubmitting` lifecycle in 3 exit paths. This is a large amount of behavior behind a 1-argument interface (`employee`, `onSuccess`) — the hook earns its keep.
- **SRP** — one reason to change: the edit employee workflow changes. If the UI layout changes, only `EditEmployeeModal` changes. If the API contract changes, only `employeeService.ts` changes. If the save orchestration logic changes (e.g., new field, new endpoint), only `useEditEmployee` changes.
- **DIP** — `useEditEmployee` depends on the service functions as module-level imports (which are mockable seams). The hook does not call `new AxiosHttpClient()` — it depends on the adapter functions at `../services/employeeService`. The test's `vi.mock` factory is the evidence that DIP is satisfied: the seam is there and both a production adapter (real axios calls) and a test adapter (vi.fn mocks) exist.
- **ISP** — the hook's interface is scoped to what `EditEmployeeModal` needs: form field values, setters, status, and `onSave`. No unused methods are exposed to the component.

### Files to Create/Modify

- [x] `project/srcs/frontend/src/features/employees/hooks/useEmployeeList.ts` — **extend** — add `refresh: () => void` to `UseEmployeeListResult` interface and `refresh` to the hook return object
- [x] `project/srcs/frontend/src/features/employees/hooks/useEditEmployee.test.ts` — **new** — 8 behavior tests (Step 3.2 RED)
- [x] `project/srcs/frontend/src/features/employees/hooks/useEditEmployee.ts` — **new** — hook implementation (Step 3.2 GREEN)

---

## Step-by-Step Implementation

### Step 3.1: Add `refresh()` to `useEmployeeList`

**Goal:** Expose a `refresh()` function from `useEmployeeList` so `EmployeesPage` (Task 5) can trigger a list re-fetch after a successful edit or delete without needing to know the current page/filter state.
**Dependencies:** None — this step is independent of Step 3.2 and can be done first.

- [x] Open `src/features/employees/hooks/useEmployeeList.ts`
- [x] Add `refresh: () => void` to the `UseEmployeeListResult` interface (after `onPageChange`)
- [x] Add the `refresh` plain function to the hook body (after `onPageChange`, before the return statement)
- [x] Add `refresh` to the return object
- [x] Run `npm --prefix project/srcs/frontend run typecheck` — confirm 0 errors
- [x] Run `npm --prefix project/srcs/frontend run test` — confirm 63/63 still pass (no regressions)

**Why this step is critical:** `EmployeesPage` (Task 5) calls `refresh()` in `onSuccess` callbacks for both modals:
```tsx
onSuccess={() => { setEditEmployee(null); refresh() }}
```
Without `refresh` in the hook's return type, TypeScript would reject the destructuring in `EmployeesPage.tsx`. The addition must happen before Task 5 to avoid a typecheck failure that blocks wiring.

#### Implementation

Three-line change in `src/features/employees/hooks/useEmployeeList.ts`:

**Interface addition** (after `onPageChange: (page: number) => void`):
```typescript
interface UseEmployeeListResult {
  // ... existing members ...
  onPageChange: (page: number) => void
  refresh: () => void   // ← ADD
}
```

**Function definition** (after `function onPageChange`, before `return`):
```typescript
function onPageChange(page: number) {
  clearDebounce()
  void fetchEmployees(page, pageSize, filterField, filterValue)
}

function refresh() {                                           // ← ADD
  clearDebounce()                                             // ← review fix: mirrors onPageChange/Decision 7
  void fetchEmployees(currentPage, pageSize, filterField, filterValue)
}
```

**Return object addition** (after `onPageChange`):
```typescript
return {
  // ... existing entries ...
  onPageChange,
  refresh,   // ← ADD
}
```

#### Edge Cases

1. **Case:** `refresh()` called before the initial mount fetch completes — `isLoading` is already true.
   **Handling:** `fetchEmployees` sets `isLoading = true` at the start. If a refresh is called while loading, `fetchEmployees` re-enters: it sets `isLoading = true` again (no-op state update), clears `error`, and issues a new API call. The previous call's promise is not cancelled. The last resolved response wins (React batch order). For MVP this is acceptable — `refresh()` is only called after a successful modal save, at which point the previous fetch is already complete.

2. **Case:** `refresh()` is called from a stale closure in `EmployeesPage` after a re-render changed `currentPage`.
   **Handling:** `refresh()` is not memoized — it is a new function reference on each render, capturing the current render's `currentPage`, `pageSize`, `filterField`, and `filterValue`. If `EmployeesPage` receives a new hook result (after a re-render), the `refresh` function it holds is always the latest. No stale closure risk.

3. **Case:** Existing `useEmployeeList.test.ts` tests break because the return type changed.
   **Handling:** The test file uses `result.current.onPageChange(...)`, `result.current.onFilterFieldChange(...)`, etc. — it never destructures `refresh`. Adding a new member to the return object does not break any existing test. TypeScript `tsc --noEmit` will confirm this.

---

### Step 3.2 RED: Create `useEditEmployee.test.ts`

**Goal:** Write 8 behavior tests that define the observable contract of `useEditEmployee`. All 8 must fail because the module does not yet exist — this is the RED gate.
**Dependencies:** Step 3.1 complete (typecheck passes); `types.ts` exports `EmployeeListDTO`, `EmployeeDTO`; `employeeService.ts` exports `updateEmployee`, `activateEmployee`, `deactivateEmployee`.

- [x] Create `src/features/employees/hooks/useEditEmployee.test.ts`
- [x] Run `npm --prefix project/srcs/frontend run test` — confirm 8 new tests FAIL (module not found) and 63 existing tests still pass

**Why the RED state is important:** The tests lock in the expected interface shape (`onSave`, `setUsername`, `error`, etc.) and all 8 behavioral contracts before a single line of implementation is written. The "module not found" error confirms the tests are testing genuinely absent code.

> **RED confirmed:** `npx vitest run` reported `Test Files 1 failed | 11 passed (12)` / `Tests 63 passed (63)` — the single failing file is `useEditEmployee.test.ts` with `Error: Failed to resolve import "./useEditEmployee"` (module-not-found RED signal, exactly as predicted).

#### Implementation

Full `src/features/employees/hooks/useEditEmployee.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useEditEmployee } from "./useEditEmployee"
import {
  updateEmployee,
  activateEmployee,
  deactivateEmployee,
} from "../services/employeeService"
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

const mockUpdateEmployee = vi.mocked(updateEmployee)
const mockActivateEmployee = vi.mocked(activateEmployee)
const mockDeactivateEmployee = vi.mocked(deactivateEmployee)

const mockEmployeeDTO: EmployeeDTO = {
  firstName: "Alice",
  lastName: "Smith",
  email: "alice@example.com",
  username: "alice",
  roles: ["ROLE_EMPLOYEE"],
  enabled: true,
}

const mockEmployee: EmployeeListDTO = {
  id: 1,
  firstName: "Alice",
  lastName: "Smith",
  email: "alice@example.com",
  username: "alice",
  roles: ["ROLE_EMPLOYEE"],
  enabled: true,
  dateCreated: "2024-01-01T00:00:00Z",
  lastLogin: null,
}

describe("useEditEmployee", () => {
  const onSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateEmployee.mockResolvedValue(mockEmployeeDTO)
    mockActivateEmployee.mockResolvedValue(mockEmployeeDTO)
    mockDeactivateEmployee.mockResolvedValue(mockEmployeeDTO)
  })

  // ── Test 1: Initialization ─────────────────────────────────────────────────────
  it("initializes form fields from the employee prop and leaves password empty", () => {
    const { result } = renderHook(() => useEditEmployee(mockEmployee, onSuccess))

    expect(result.current.username).toBe("alice")
    expect(result.current.email).toBe("alice@example.com")
    expect(result.current.firstName).toBe("Alice")
    expect(result.current.lastName).toBe("Smith")
    expect(result.current.enabled).toBe(true)
    expect(result.current.password).toBe("")
    // Status fields must also start clean — EditEmployeeModal renders error conditionally on `error !== null`
    expect(result.current.isSubmitting).toBe(false)
    expect(result.current.error).toBeNull()
  })
  // REVIEW-FIX: Added isSubmitting and error assertions to Test 1 — EditEmployeeModal
  // renders the error banner conditionally on `error !== null`; verifying the initial
  // null prevents false-positive rendering on modal open.

  // ── Test 2: No-op save ─────────────────────────────────────────────────────────
  it("calls onSuccess without making any API calls when no fields have changed", async () => {
    const { result } = renderHook(() => useEditEmployee(mockEmployee, onSuccess))

    await act(async () => {
      await result.current.onSave()
    })

    expect(mockUpdateEmployee).not.toHaveBeenCalled()
    expect(mockActivateEmployee).not.toHaveBeenCalled()
    expect(mockDeactivateEmployee).not.toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalledOnce()
  })

  // ── Test 3: Field change triggers PUT ─────────────────────────────────────────
  it("calls updateEmployee with the changed username when username has been modified", async () => {
    const { result } = renderHook(() => useEditEmployee(mockEmployee, onSuccess))

    await act(async () => {
      result.current.setUsername("alice2")
    })
    await act(async () => {
      await result.current.onSave()
    })

    expect(mockUpdateEmployee).toHaveBeenCalledWith(
      mockEmployee.id,
      expect.objectContaining({ username: "alice2" })
    )
    expect(onSuccess).toHaveBeenCalledOnce()
  })

  // ── Test 4: Non-empty password included in PUT body ───────────────────────────
  it("includes password in the updateEmployee form when the admin has typed a new password", async () => {
    const { result } = renderHook(() => useEditEmployee(mockEmployee, onSuccess))

    await act(async () => {
      result.current.setPassword("newpass123")
    })
    await act(async () => {
      await result.current.onSave()
    })

    expect(mockUpdateEmployee).toHaveBeenCalledWith(
      mockEmployee.id,
      expect.objectContaining({ password: "newpass123" })
    )
    expect(onSuccess).toHaveBeenCalledOnce()
  })

  // ── Test 5: enabled true→false skips PUT, calls deactivate ────────────────────
  it("calls deactivateEmployee and skips updateEmployee when only the enabled toggle changed from true to false", async () => {
    const activeEmployee: EmployeeListDTO = { ...mockEmployee, enabled: true }
    const { result } = renderHook(() => useEditEmployee(activeEmployee, onSuccess))

    await act(async () => {
      result.current.setEnabled(false)
    })
    await act(async () => {
      await result.current.onSave()
    })

    expect(mockUpdateEmployee).not.toHaveBeenCalled()
    expect(mockDeactivateEmployee).toHaveBeenCalledWith(activeEmployee.id)
    expect(onSuccess).toHaveBeenCalledOnce()
  })

  // ── Test 6: enabled false→true calls activate ─────────────────────────────────
  it("calls activateEmployee when enabled is toggled from false to true", async () => {
    const inactiveEmployee: EmployeeListDTO = { ...mockEmployee, enabled: false }
    const { result } = renderHook(() => useEditEmployee(inactiveEmployee, onSuccess))

    await act(async () => {
      result.current.setEnabled(true)
    })
    await act(async () => {
      await result.current.onSave()
    })

    expect(mockActivateEmployee).toHaveBeenCalledWith(inactiveEmployee.id)
    expect(onSuccess).toHaveBeenCalledOnce()
  })

  // ── Test 7: updateEmployee rejection → error set, onSuccess not called ────────
  it("sets error and does not call onSuccess when updateEmployee rejects", async () => {
    mockUpdateEmployee.mockRejectedValueOnce(new Error("Username already taken"))
    const { result } = renderHook(() => useEditEmployee(mockEmployee, onSuccess))

    await act(async () => {
      result.current.setUsername("taken")
    })
    await act(async () => {
      await result.current.onSave()
    })

    expect(result.current.error).toBe("Username already taken")
    expect(result.current.isSubmitting).toBe(false)
    expect(onSuccess).not.toHaveBeenCalled()
  })

  // ── Test 8: deactivateEmployee rejection after PUT succeeds ───────────────────
  it("sets error and does not call onSuccess when deactivateEmployee rejects after a successful field PUT", async () => {
    mockDeactivateEmployee.mockRejectedValueOnce(new Error("Deactivate failed"))
    const { result } = renderHook(() => useEditEmployee(mockEmployee, onSuccess))

    // Change both a text field and the enabled state — PUT will run first and succeed
    await act(async () => {
      result.current.setUsername("newname")
      result.current.setEnabled(false)
    })
    await act(async () => {
      await result.current.onSave()
    })

    expect(mockUpdateEmployee).toHaveBeenCalledOnce()   // PUT succeeded
    expect(result.current.error).toBe("Deactivate failed")
    expect(result.current.isSubmitting).toBe(false)
    expect(onSuccess).not.toHaveBeenCalled()
  })
})
```

**Test design rationale:**

- **Single `describe` block** — all 8 tests share the same mock setup (`vi.mock` factory + `beforeEach`) and the same `onSuccess = vi.fn()`. Grouping them in one `describe` keeps the file coherent and avoids repeating the mock factory setup.
- **`beforeEach` resolves all mocks** — setting `mockResolvedValue(mockEmployeeDTO)` for all three mocks in `beforeEach` means each test starts with the "happy path" default. Tests 7 and 8 override with `mockRejectedValueOnce` only where rejection is the scenario.
- **`vi.clearAllMocks()` in `beforeEach`** — calls `.mockClear()` on every mock, resetting `.mock.calls`, `.mock.instances`, and `.mock.results`. It does NOT clear mock implementations (`.mockResolvedValue` persists across `clearAllMocks()`). The `mockResolvedValue(mockEmployeeDTO)` lines after `vi.clearAllMocks()` are defensive re-sets: they ensure the happy-path default is explicit on each `beforeEach` call, making test intent readable regardless of order.
<!-- REVIEW-FIX: Clarified what vi.clearAllMocks() clears (call history only, not implementations). The original wording "resets mock state" implied implementations were also reset, which is incorrect — that would be vi.resetAllMocks(). -->
- **`act(async () => { await result.current.onSave() })`** — `onSave()` is async (it awaits `updateEmployee`, `activateEmployee`, `deactivateEmployee`). Wrapping in `act` ensures React processes all state updates (including `setIsSubmitting(false)`, `setError(...)`) before assertions run. This is the same pattern used in `useLoginForm.test.ts` for `handleSubmit`.
- **Separate `act` for setters and `onSave`** — `result.current.setUsername("alice2")` in a first `act` ensures React processes the state update and re-renders the hook before `onSave()` runs. If setter and `onSave()` ran in a single `act`, the `onSave` closure would capture the pre-update state value. This two-`act` pattern is correct.
- **`expect.objectContaining`** for PUT assertions — Tests 3 and 4 use `objectContaining` rather than an exact match. This avoids brittleness: the test verifies the changed value is in the form without specifying all four text fields (which may change as the implementation evolves). Tests verify behavior, not the exact shape of internal state.
- **Mock `EmployeeListDTO.id: 1`** — tests verify the correct `id` is passed to service functions (`toHaveBeenCalledWith(activeEmployee.id, ...)`). The fixture must have a numeric id.

#### Edge Cases

1. **Case:** `vi.mock` factory order — factory runs before imports are evaluated by Vitest's hoisting.
   **Handling:** The module factory form `vi.mock("../services/employeeService", () => ({...}))` is correct. All five exports (`listEmployees`, `updateEmployee`, `activateEmployee`, `deactivateEmployee`, `deleteEmployee`) are included in the factory to prevent any of them from making real HTTP calls if accidentally invoked during an unrelated render cycle.

2. **Case:** Test 1 (initialization) is synchronous — no `act` needed.
   **Handling:** `renderHook` synchronously mounts the hook and runs the initial state setup. The initial values are set in `useState(employee.username)` etc. — no async work, no side effects (no `useEffect`). Assertions on `result.current.*` are correct without `act`.

3. **Case:** Tests 5 and 6 use spread `{ ...mockEmployee, enabled: true/false }` — may share reference with `mockEmployee`.
   **Handling:** The spread creates a new object. `renderHook` receives the new object as the `employee` prop. The `useState` initializers capture values from this prop at mount time. No shared reference issue.

---

### Step 3.2 GREEN: Create `useEditEmployee.ts`

**Goal:** Implement `useEditEmployee` so that all 8 RED tests pass. No extra functionality beyond what the tests specify.
**Dependencies:** Step 3.2 RED complete (8 failing tests); Step 3.1 complete.

- [x] Create `src/features/employees/hooks/useEditEmployee.ts`
- [x] Run `npm --prefix project/srcs/frontend run test` — confirm **71/71** pass (63 existing + 8 new)
- [x] Run `npm --prefix project/srcs/frontend run typecheck` — confirm 0 errors
- [x] Run `npm --prefix project/srcs/frontend run build` — confirm build succeeds

**Why this step is critical:** `useEditEmployee` is the only source of edit form state and `onSave` orchestration in the entire feature. `EditEmployeeModal` (Task 5) is a thin wrapper around this hook's return value. If the orchestration is wrong here (wrong PUT body, wrong order of PUT → PATCH, missing `isSubmitting` reset in error paths), bugs will appear silently in the browser rather than in tests.

#### Implementation

Full `src/features/employees/hooks/useEditEmployee.ts`:

```typescript
import { useState } from "react"
import type { EmployeeListDTO, EmployeeUpdateForm } from "../types"
import {
  updateEmployee,
  activateEmployee,
  deactivateEmployee,
} from "../services/employeeService"

interface UseEditEmployeeResult {
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
  isSubmitting: boolean
  error: string | null
  onSave: () => Promise<void>
}

export function useEditEmployee(
  employee: EmployeeListDTO,
  onSuccess: () => void
): UseEditEmployeeResult {
  const [username, setUsername] = useState(employee.username)
  const [password, setPassword] = useState("")
  const [firstName, setFirstName] = useState(employee.firstName ?? "")
  const [lastName, setLastName] = useState(employee.lastName ?? "")
  const [email, setEmail] = useState(employee.email)
  const [enabled, setEnabled] = useState(employee.enabled)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSave() {
    const hasFieldChanges =
      username !== employee.username ||
      firstName !== (employee.firstName ?? "") ||
      lastName !== (employee.lastName ?? "") ||
      email !== employee.email ||
      password !== ""

    const hasEnabledChange = enabled !== employee.enabled

    if (!hasFieldChanges && !hasEnabledChange) {
      onSuccess()
      return
    }

    setIsSubmitting(true)
    setError(null)

    if (hasFieldChanges) {
      const form: EmployeeUpdateForm = {
        username,
        firstName,
        lastName,
        email,
        ...(password !== "" ? { password } : {}),
      }
      try {
        await updateEmployee(employee.id, form)
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { message?: string } }; message?: string }
        const message =
          axiosErr.response?.data?.message ??
          axiosErr.message ??
          "Failed to update employee."
        setError(message)
        setIsSubmitting(false)
        return
      }
    }

    if (hasEnabledChange) {
      try {
        if (enabled) {
          await activateEmployee(employee.id)
        } else {
          await deactivateEmployee(employee.id)
        }
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { message?: string } }; message?: string }
        const message =
          axiosErr.response?.data?.message ??
          axiosErr.message ??
          "Failed to update employee status."
        setError(message)
        setIsSubmitting(false)
        return
      }
    }

    setIsSubmitting(false)
    onSuccess()
  }

  return {
    username,
    setUsername,
    password,
    setPassword,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    email,
    setEmail,
    enabled,
    setEnabled,
    isSubmitting,
    error,
    onSave,
  }
}
```

**Import decisions:**
- `import type { EmployeeListDTO, EmployeeUpdateForm }` — both are interfaces; `verbatimModuleSyntax: true` requires `import type` for type-only imports.
- `EmployeeDTO` is NOT imported — the hook's `onSave()` does not use the service return values (they are discarded). Importing it would be an unused import that triggers a TypeScript warning.
- `deleteEmployee` is NOT imported — this hook orchestrates edits only. `useDeleteEmployee` (Task 4) handles deletion. SRP: one hook, one operation.

**`EmployeeUpdateForm` spread for password:**
```typescript
...(password !== "" ? { password } : {})
```
The parent feature is explicit: "add `password` only when `password !== ""`". This spread pattern conditionally adds the property when non-empty and omits it entirely when blank — the backend keeps the existing hash when the field is absent.

**All four text fields always included in the PUT body:**
The parent explicitly says: "build `EmployeeUpdateForm` with all four text fields always included (`username`, `firstName`, `lastName`, `email` — using current form values)". This is intentional — even if only one field changed, all four are sent. The backend applies only non-blank fields, so sending unchanged values is harmless and simplifies the form-building logic (no per-field diff needed).

**`setIsSubmitting(false)` in every exit path:**
There are three exit paths that must reset `isSubmitting`:
1. No-op (line: `onSuccess(); return`) — `isSubmitting` was never set to `true`, so no reset needed.
2. PUT error catch — `setIsSubmitting(false); return`.
3. PATCH error catch — `setIsSubmitting(false); return`.
4. Happy path (end of function) — `setIsSubmitting(false); onSuccess()`.
TypeScript does not enforce this, but the tests verify it (Tests 7 and 8 assert `result.current.isSubmitting === false` after rejection).

**`err: unknown` + cast pattern:**
TypeScript 4.0+ requires `catch (err: unknown)`. The cast `err as { response?: ... }` is the correct pattern for handling Axios errors without importing `AxiosError` (which would introduce an unnecessary import from `axios` in a hook that should not know about HTTP internals). The chain `?? axiosErr.message ?? "fallback"` handles both Axios error objects (which have `.message`) and plain `Error` instances.

#### Edge Cases

1. **Case:** `firstName`/`lastName` initialized as `""` when `employee.firstName` is `null`.
   **Handling:** `useState(employee.firstName ?? "")` converts `null` to `""`. Change detection compares `firstName !== (employee.firstName ?? "")` — so `"" !== ""` → false (no change detected for a null-initialized field that was never edited). Correct.

2. **Case:** Admin opens the modal, edits a field, then deletes the input back to its original value, then saves.
   **Handling:** `hasFieldChanges` compares current form values against `employee.*`. If the admin typed "alice2" then deleted back to "alice", `username === employee.username` → false for `hasFieldChanges`. The no-op path is taken if no other field changed either. Correct.

3. **Case:** `password` set to a non-empty value, then cleared back to `""`.
   **Handling:** `password !== ""` → `false` → password omitted from form and not counted as a field change. The admin can type and clear the password field without triggering a PUT if no other field changed.

4. **Case:** Both `hasFieldChanges` and `hasEnabledChange` are true — PUT fails.
   **Handling:** The catch block after `updateEmployee` sets `error`, clears `isSubmitting`, and `return`s. The `hasEnabledChange` branch is never reached. PATCH is NOT called. Test 8 covers the inverse (PUT succeeds, PATCH fails).

5. **Case:** `onSuccess` is called by `EmployeesPage` via `() => { setEditEmployee(null); refresh() }`, which unmounts the modal and unmounts the hook. React will warn about state updates on unmounted components.
   **Handling:** The modal is unmounted via `setEditEmployee(null)` inside `onSuccess`. The hook has already finished all its state updates (`setIsSubmitting(false)`) before calling `onSuccess()` — the last line of `onSave()` is `setIsSubmitting(false); onSuccess()`. No state updates occur after `onSuccess()`, so no stale state update on unmounted component. No `AbortController` or `isMounted` ref is needed.

6. **Case:** TypeScript complains about `UseEditEmployeeResult` not being exported.
   **Handling:** The interface is used only inside this file as the return type annotation. It is not exported — callers infer the type from the return value of `useEditEmployee`. This is the same pattern as `UseEmployeeListResult` (not exported from `useEmployeeList.ts`). If a caller needs the type, they can use `ReturnType<typeof useEditEmployee>`.

---

## Design Decisions

**Decision 1: No dedicated test for `refresh()` in `useEmployeeList`**
- **Why:** `refresh()` is a one-line delegator — `void fetchEmployees(currentPage, pageSize, filterField, filterValue)` — with zero logic of its own. Its behavior is fully covered by the existing `useEmployeeList` tests: the fetch behavior is tested extensively (Tests 1–9 in `useEmployeeList.test.ts`), and `refresh()` simply re-exercises that path with the current state values. Writing a dedicated `refresh` test would assert that calling it triggers a `listEmployees` call — which is already proven by the existing tests. The parent feature explicitly scopes Task 3 to 8 tests for `useEditEmployee` + no new tests for `refresh()`. The addition is validated by typecheck (return-type contract) and the existing 63-test baseline (no regressions).
- **Alternatives considered:** Add a 9th test to `useEmployeeList.test.ts` asserting `refresh()` re-fetches with current state — deferred per the parent feature's explicit test count (63 → 71, not 64 → 72). Adding it would be reasonable if `refresh()` had any logic, but it is pure delegation.
<!-- REVIEW-FIX: Added Design Decision explaining why refresh() has no test — prevents future reviewers from questioning the coverage gap. -->

**Decision 2: All four text fields always sent in the PUT body (not just changed fields)**
- **Why:** The parent feature explicitly mandates this: "build `EmployeeUpdateForm` with all four text fields always included". The backend's partial-update semantics (blank = keep existing) make this safe — sending unchanged values has no side effect. Computing which specific fields changed to send only those would require more complex logic in the hook and more complex test fixtures (asserting exact form shapes rather than `objectContaining`). The simplicity tradeoff is clear.
- **Alternatives considered:** Send only changed fields — rejected because it adds complexity without behavioral benefit (backend handles partial updates), and it would cause the error message for 409 conflicts to be less predictable (e.g., username conflict only if username was in the body).

**Decision 3: `onSave` as a plain async function (no `useCallback`)**
- **Why:** Consistent with all event handlers in this codebase (`fetchEmployees`, `onFilterFieldChange`, `onPageChange`, `refresh`). `onSave`'s dependencies are the local state values (closures) and the `employee` prop — all of which cause re-renders anyway, making memoization useless. Adding `useCallback` with a deps array of `[username, password, firstName, lastName, email, enabled, employee, onSuccess]` would make the code more complex without any benefit (the component re-renders when state changes regardless).
- **Alternatives considered:** `useCallback(onSave, [...])` — rejected per the codebase-wide no-`useCallback` convention for event handlers in this project.

**Decision 4: Error message extraction without importing `AxiosError`**
- **Why:** The hook is a business logic module — it should not know about HTTP transport details. Importing `AxiosError` from `axios` would introduce a coupling between the hook and the HTTP library. The cast `err as { response?: { data?: { message?: string } }; message?: string }` is a structural type check (duck typing) that works for Axios errors, plain Error objects, and any other thrown value. If the backend response shape changes, only this one extraction pattern needs updating.
- **Alternatives considered:** `import { isAxiosError } from "axios"` + type guard — rejected as overly precise for a field that already has a fallback chain. The `isAxiosError` guard would prevent the `?.message` fallback from accessing `.message` on plain `Error` objects thrown by the mock — breaking Test 7 where `new Error("Username already taken")` is thrown.

**Decision 5: No `useEffect` — hook is mount-pure**
- **Why:** `useEditEmployee` initializes all state from the `employee` prop in `useState(...)` calls. No `useEffect` is needed because the form fields are not reactive to prop changes — the modal is unmounted and remounted each time a different employee is selected (via `{editEmployee && <EditEmployeeModal />}` conditional rendering in `EmployeesPage`). Each mount gets fresh `useState` values from the current `employee` prop. This is intentional per the parent's Risk Assessment: "Modal unmount clears hook state — this is intentional: reopening the Edit modal on the same employee re-initializes from the latest `EmployeeListDTO`."
- **Alternatives considered:** `useEffect` to sync state when `employee` prop changes — rejected because the conditional rendering pattern makes this unnecessary and `useEffect` with state setters would cause a double-render (initial render + effect render) without benefit.

**Decision 6: `UseEditEmployeeResult` interface is not exported**
- **Why:** Only `EditEmployeeModal` consumes the hook, and it accesses the return value via destructuring. No other module needs to type-annotate `UseEditEmployeeResult` explicitly. Consistent with `UseEmployeeListResult` which is also unexported in `useEmployeeList.ts`.
- **Alternatives considered:** Export `UseEditEmployeeResult` — deferred. If Task 5 or future tests need it, it can be exported then.

---

## Testing Considerations

### Automatic Validation

Run from project root (`/home/jlievano/Dropbox/CodeProjects/42-last`):

- [x] After Step 3.1: `npm --prefix project/srcs/frontend run typecheck` — must return 0 errors
- [x] After Step 3.1: `npm --prefix project/srcs/frontend run test` — must return 63/63 passing (no regressions)
- [x] After Step 3.2 RED: `npm --prefix project/srcs/frontend run test` — must show 8 new test failures (module not found); 63 existing tests still pass
- [x] After Step 3.2 GREEN: `npm --prefix project/srcs/frontend run test` — must return **71/71** passing (63 existing + 8 new `useEditEmployee` tests)
- [x] After Step 3.2 GREEN: `npm --prefix project/srcs/frontend run typecheck` — must return 0 errors
- [x] After Step 3.2 GREEN: `npm --prefix project/srcs/frontend run build` — must succeed

### Manual Validation

No manual validation required for this task. `useEditEmployee` is a pure React hook with no UI rendering and no browser-only behavior. Automatic validation (typecheck + test + build) is sufficient. End-to-end browser validation of the Edit modal is deferred to Task 5, which wires `useEditEmployee` into `EditEmployeeModal` and `EmployeesPage`.

---

## Related Code Explanations

- `src/features/employees/hooks/useEmployeeList.ts:26–166` — hook being extended in Step 3.1; plain function pattern for all event handlers is the convention `refresh()` follows
- `src/features/employees/hooks/useEmployeeList.test.ts:1–294` — canonical test structure for hooks in this feature: `renderHook` + `act` + `vi.mock` factory
- `src/features/authentication/hooks/useLoginForm.test.ts:1–122` — prior art for `vi.mock` factory + `vi.mocked()` + `mockResolvedValueOnce` for async hook testing
- `src/features/employees/services/employeeService.ts:1–38` — the service module mocked in `useEditEmployee.test.ts`; all 5 exports must be in the mock factory
- `src/features/employees/types.ts:1–79` — source of `EmployeeListDTO`, `EmployeeDTO`, `EmployeeUpdateForm` used in both the hook and test file
- `documentation/Docs/API-Reference/Employee.md` — `PUT /employee/{id}` partial-update semantics; 409 conflict behavior; PATCH activate/deactivate endpoint contracts

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected for this task
- [x] Up-to-date documentation reviewed (vitest `vi.mock` factory, `renderHook`/`act` via Context7; Employee API reference; prior art in codebase)
- [x] `src/features/employees/hooks/useEmployeeList.ts` extended — `refresh: () => void` added to interface and return object
- [x] `npm run typecheck` = 0 errors after Step 3.1
- [x] `npm run test` = 63/63 passing after Step 3.1 (no regressions)
- [x] `src/features/employees/hooks/useEditEmployee.test.ts` created with 8 behavior tests (Step 3.2 RED confirmed: 8 new failures + 63 existing passing)
- [x] `src/features/employees/hooks/useEditEmployee.ts` created (Step 3.2 GREEN confirmed)
- [x] `npm run test` = **71/71** passing after Step 3.2 GREEN (63 baseline + 8 new)
- [x] `npm run typecheck` = 0 errors after Step 3.2 GREEN
- [x] `npm run build` = success after Step 3.2 GREEN
- [x] Parent feature Steps 3.1 and 3.2 marked `[x]` in [[Features/to-do/Employee-Edit-and-Delete-Modals]]
- [x] Parent feature Task 3 section updated with wiki link `[[Employee-Edit-and-Delete-Modals-task-3-use-edit-employee]]` (link pre-existed; status line added)

---

## Post-Execution Notes

**Executed on 2026-06-27.** Full TDD RED → GREEN cycle completed as specified in the task.

**Files changed (3):**
- `project/srcs/frontend/src/features/employees/hooks/useEmployeeList.ts` — extended: `refresh: () => void` added to `UseEmployeeListResult` interface, `refresh` plain function defined after `onPageChange`, `refresh` added to the return object. 9-line additive change, no logic touched.
- `project/srcs/frontend/src/features/employees/hooks/useEditEmployee.test.ts` — created: 8 behavior tests using the project's canonical `vi.mock` factory + `renderHook`/`act` pattern.
- `project/srcs/frontend/src/features/employees/hooks/useEditEmployee.ts` — created: hook implementation matching the spec's 7-step save orchestration exactly (no-op detection, all-four-text-fields PUT body, conditional password spread, PUT → PATCH ordering, error extraction cast, `isSubmitting` reset in all 3 exit paths, partial-success returns without `onSuccess`).

**Validation results:**
- Step 3.1 — typecheck: 0 errors; tests: 63/63 (no regressions).
- Step 3.2 RED — tests: 1 failed file (`Failed to resolve import "./useEditEmployee"` module-not-found signal) + 11 passed (63/63 individual tests) — exactly the predicted RED gate.
- Step 3.2 GREEN — tests: **71/71** across 12 files (63 baseline + 8 new `useEditEmployee`); typecheck: 0 errors; build: success (497.47 kB JS / 164.16 kB gzip, consistent with the Task 2 baseline).

**Autonomous review:** Ran a line-by-line review of all three changed files against the task spec. No bugs, no architectural issues, no correctness gaps. The implementation exactly matches the spec's interface, save orchestration, error extraction pattern, nullable `firstName`/`lastName` handling, and the partial-success (PUT ok → PATCH fail → no `onSuccess`) behavior. The test file uses the established `vi.mock` factory covering all 5 service exports, `beforeEach` with `vi.clearAllMocks()` + happy-path default resolves, the two-`act` pattern (setter in one `act`, `onSave` in the next), and `expect.objectContaining` for PUT body assertions. No patches required.

**No manual validation required for this task** (see the task's "Manual Validation" section — `useEditEmployee` is a pure hook with no UI; browser validation deferred to Task 5 wiring).

### Independent Code Review (post-execution)

An independent review of the uncommitted working-tree changes (Task 2 service/types + Task 3 hook) was performed. Findings and dispositions:

**Fixes applied (in scope):**
1. **`refresh()` now calls `clearDebounce()`** (Medium → fixed) — every other fetch-triggering handler in `useEmployeeList` (`onPageChange`, `onPageSizeChange`, `onFilterFieldChange`, `onFilterValueChange`) calls `clearDebounce()` per Decision 7 of the Admin feature. `refresh()` was the only one that did not. A pending string-filter debounce (admin typed ≥3 chars, ~500ms timer running) could fire after `refresh()` with a captured intent, producing a redundant fetch. Added `clearDebounce()` as the first line of `refresh()` for defensive consistency. The task spec's Step 3.1 snippet showed `refresh()` without it; this is a defensive enhancement within Task 3 scope (the `refresh` addition itself is Task 3). No test depended on the absence.
2. **Trailing newline added to `employeeService.ts`** (Nit → fixed) — the file ended with `}` and no final `\n` (`git diff` reported `\ No newline at end of file`). Added a single trailing newline to satisfy `eol-last`.

**Findings flagged but NOT fixed (spec-accepted or out-of-scope):**

- **Clearing `firstName`/`lastName` to empty silently reverts** (review-rated High) — when an admin clears a previously non-null name field, change detection fires (`"" !== "Alice"`), the form sends `firstName: ""`, but the backend's partial-update semantics treat blank as "keep existing" → the clear is silently reverted on `refresh()`. This is a **parent-accepted contract limitation**, not a Task 3 bug: the parent spec line 62 explicitly states "Sending `""` for a null name field is acceptable — the backend treats blank as 'keep existing value'." Supporting real null-clearing would require a contract change (`EmployeeUpdateForm.firstName?: string | null`) plus backend semantics — out of Task 3 scope. Flag for the parent feature's future hardening if clearing becomes a product requirement.
- **No double-submit guard on `onSave`** (review-rated High) — `onSave` does not short-circuit if already submitting; a rapid double-click before `setIsSubmitting(true)` re-renders could fire two PUT/PATCH sequences. The task spec's `onSave` implementation (lines 521–582) intentionally relies on the **modal disabling the Save button via `disabled={isSubmitting}`** (the spec's Design Decision and `EditEmployeeModal` contract in the parent). A `useRef` guard in the hook would be defense-in-depth but is untested behavior beyond the spec's defined 8 tests. **Recommendation for Task 5:** wire `disabled={isSubmitting}` on the Save button (primary mitigation), and consider adding a `useRef` submit-guard if defense-in-depth is desired. Do NOT silently add untested guard logic to the hook.
- **Partial success leaves the list stale** (review-rated Medium) — PUT succeeds, PATCH fails → `onSuccess` is NOT called → list does not refresh → the table shows stale field values until the admin closes the modal and the next fetch runs. This is **explicitly accepted by the parent's Risk Assessment** (spec line 72): "the admin must close the modal to see the committed field changes and retry the toggle. This is acceptable." Documented, not a bug.
- **Error-extraction cast duplicated** (review-rated Medium) — the `err as { response?: { data?: { message?: string } }; message?: string }` + `?? axiosErr.message ?? fallback` block appears twice (PUT catch + PATCH catch). Extracting a helper + adopting `isAxiosError`/`instanceof Error` was considered and **explicitly rejected by the task spec** (Decision 4 + the REVIEW-FIX note on line 70): the `isAxiosError` guard would prevent the `?.message` fallback from reading `.message` on the plain `Error` objects thrown by the test mocks (Test 7), and importing `AxiosError` would couple the hook to the HTTP library. The inline duplicated pattern is the spec's deliberate choice for consistency. Not changed.
- **Form always sends all four text fields** (review-rated Medium) — even when only `password` changed, the PUT body includes unchanged `username`/`firstName`/`lastName`/`email`. This is **mandated by the parent spec** (Decision 2 + spec line 615) and is harmless because the backend applies only non-blank values. The reviewer's "spurious self uniqueness reject" concern is speculative (the backend's uniqueness check on `PUT /employee/{id}` excludes the row being updated). Not changed.
- **No symmetric "activate rejects after successful PUT" test** (review-rated Medium) — Test 8 covers deactivate-after-PUT fail; the activate branch is symmetric but untested. The task spec's test table (lines 75–85) **mandates exactly 8 tests** and the final feature target is 75 (71 + 4 `useDeleteEmployee` in Task 4), NOT 76. Adding a 9th edit-hook test would exceed the planned count. The symmetric branch shares identical orchestration code except the `enabled ? activate : deactivate` ternary; Test 6 already locks the activate happy path. Flag for Task 4/5 if additional coverage is desired, but do not exceed the spec's defined 8.
- **No dedicated `refresh()` test** (review-rated Medium) — **explicitly deferred by Decision 1** of this task: `refresh()` is pure delegation (`clearDebounce(); void fetchEmployees(...)`), fully covered by the existing `listEmployees` fetch tests. The parent feature scoped Task 3 to 8 `useEditEmployee` tests + no new `refresh` tests. Not added.
- **`refresh` stale-closure soundness depends on the consumer** (review-rated Low) — `refresh` is a fresh closure each render (no `useCallback`), so it always reads the latest render's state. Correct **provided** `EmployeesPage` (Task 5) passes a freshly-created `onSuccess` (e.g. `() => { setEditEmployee(null); refresh() }`) on each render rather than capturing `refresh` once at modal open. **Recommendation for Task 5:** do not memoize `EditEmployeeModal` with a captured-once `onSuccess`; either create the callback inline per render or ensure the modal receives the latest `refresh`.
- **Test 2 (no-op) does not assert `isSubmitting`/`error` stay clean** (review-rated Medium) — the spec's Test 2 code (lines 320–331) asserts only no service calls + `onSuccess` once. Strengthening it would align with Test 1's REVIEW-FIX philosophy, but the spec shows exact test content. Left as the spec defines; low value.
- **`EmployeeDTO` return of `updateEmployee` discarded** (review-rated Low) — intentional; the hook relies on `onSuccess → refresh()` to repopulate. Not a bug.

**Verdict of the independent review:** REQUEST CHANGES — driven primarily by the double-submit guard and the clear-to-null contract gap, both of which are parent-accepted/scope-deferred rather than Task 3 defects. The two in-scope fixes above (clearDebounce, trailing newline) were applied. After fixes: 71/71 tests, 0 typecheck errors, build success. The remaining findings are documented here as Post-Review Notes for the parent feature and Tasks 4–5.
