# Task: Create Employee Modal — Task 2: useCreateEmployee Hook (TDD)

#task #current #medium-complexity #parent-create-employee-modal

**Parent:** [[Create-Employee-Modal]]
**Parent Type:** Feature
**Related Step(s):** Phase 2 — Step 2.1
**Estimated Complexity:** Medium

---

## Goal

Create the `useCreateEmployee` hook — the deep module that owns all create-form state and the submit lifecycle — using a TDD red-green cycle with 4 behavior tests. This hook is the core business logic layer between the future `CreateEmployeeModal` display component (Task 3) and the `createEmployee` service adapter established in Task 1.

---

## Parent Context

The Create Employee Modal feature adds a "Create New" button and form modal to the admin `/employees` page. Task 2 is the business-logic phase: it creates the `useCreateEmployee` hook that encapsulates form state management, payload construction (with optional-field omission logic), and the full submit lifecycle.

The parent specifies this hook precisely:

**Interface declared in parent:**
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

**`onSubmit()` logic per parent:**
1. Set `isSubmitting = true`, clear `error`.
2. Build `EmployeeCreateForm`: always include `username`, `email`, `password`; include `firstName` only when `firstName !== ""`; include `lastName` only when `lastName !== ""`.
3. Call `createEmployee(form)`. On rejection → extract `axiosErr.response?.data?.message ?? axiosErr.message ?? "Failed to create employee."`, set `error`, set `isSubmitting = false`, return.
4. On success → set `isSubmitting = false`, call `onSuccess()`.

**Parent constraints:**
- No `useCallback` — consistent with `useEditEmployee`, `useDeleteEmployee`, and all other hooks in this feature.
- `UseCreateEmployeeResult` interface is NOT exported — consistent with `UseEditEmployeeResult` and `UseDeleteEmployeeResult`. Callers infer the type via `ReturnType<typeof useCreateEmployee>`.
- 4 behavior tests specified by parent: (1) initialization, (2) full-payload submit, (3) optional fields omitted when empty, (4) rejection error lifecycle.

---

## Preconditions / Dependencies

- Task 1 is fully executed: 76/76 tests passing, 0 typecheck errors, build success.
- `src/features/employees/types.ts` already exports `EmployeeCreateForm` and `EmployeeMiniDTO` (added in Task 1).
- `src/features/employees/services/employeeService.ts` already exports `createEmployee` (added in Task 1).
- `src/features/employees/hooks/useEditEmployee.test.ts` and `useDeleteEmployee.test.ts` both already contain `createEmployee: vi.fn()` in their `vi.mock` factories (updated in Task 1 GREEN step).
- `@testing-library/react@16.3.2` is installed — `renderHook` and `act` are available.
- `verbatimModuleSyntax: true` in `tsconfig.app.json` — type-only imports must use `import type`; runtime function imports must be value imports. **`createEmployee` must be a value import** in the test file because `vi.mocked(createEmployee)` needs the runtime function reference.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `tdd` — **Selected** — TDD red-green discipline for Step 2.1: write 4 behavior tests first (RED), verify failure, then implement (GREEN).
- `solid-deep-design` — **Selected** — `useCreateEmployee` is designed as a deep module: one parameter interface (`onSuccess`), 12-property result that hides all form state management, payload construction, and error lifecycle from callers.
- `documentation-management` — **Selected** — governs task creation and file placement.
- `memory-bank` — **Selected** — project context loaded at session start.
- `find-docs` — **Selected** — patterns verified against existing codebase (`useDeleteEmployee.test.ts`, `useEditEmployee.test.ts`) at the exact installed versions (Vitest 4.1.9, @testing-library/react 16.3.2, React 19.2.4).

### Documentation Reviewed

- `src/features/employees/hooks/useDeleteEmployee.ts` and `useDeleteEmployee.test.ts` — canonical prior art for a single-action submit hook: one-parameter interface, `renderHook` + two-`act` split, `vi.mock` all-exports factory, `vi.mocked()` for typed access, `beforeEach(vi.clearAllMocks())` + happy-path `mockResolvedValue` in `beforeEach`.
- `src/features/employees/hooks/useEditEmployee.test.ts` — canonical `vi.mock("../services/employeeService", ...)` factory covering all 6 service exports (updated in Task 1). `useCreateEmployee.test.ts` replicates this factory exactly.
- `project/srcs/frontend/package.json` — confirmed exact versions: Vitest `^4.1.9`, `@testing-library/react` `^16.3.2`, React `^19.2.4`, TypeScript `~5.9.3`.
- `documentation/Features/to-do/Create-Employee-Modal.md` — parent feature: 4 specified tests, hook interface, `onSubmit()` logic, no-`useCallback` convention, unexported result interface.

### Related Existing Code

- `src/features/employees/hooks/useDeleteEmployee.ts` — canonical pattern for a simple submit-lifecycle hook; `useCreateEmployee` follows this structure closely.
- `src/features/employees/hooks/useDeleteEmployee.test.ts` — canonical test structure; `useCreateEmployee.test.ts` replicates its mock setup, `beforeEach` pattern, and two-`act` setter/submit split.
- `src/features/employees/hooks/useEditEmployee.test.ts` — canonical all-exports `vi.mock` factory (all 6 exports including `createEmployee` added in Task 1); `useCreateEmployee.test.ts` uses the same factory.
- `src/features/employees/services/employeeService.ts:42-47` — `createEmployee` function; the hook delegates to this adapter.
- `src/features/employees/types.ts:83-99` — `EmployeeCreateForm` and `EmployeeMiniDTO` types the hook and tests depend on.

---

## Implementation Details

### Approach

Task 2 is a TDD-only task: one new test file + one new hook file. No existing files are modified. The hook follows the same deep-module pattern as `useDeleteEmployee` and `useEditEmployee` — form state lives entirely inside the hook; the caller (display component) receives only values, setters, and actions through a minimal interface.

**SOLID + Deep Module analysis for `useCreateEmployee`:**

- **SRP**: One reason to change — the create-employee form interaction contract. The hook owns: 5 form fields (username, email, password, firstName, lastName), 2 status flags (isSubmitting, error), and 1 submit action. If the backend create endpoint changes, only this hook changes.
- **OCP**: The hook is a new export; no existing hook is modified.
- **DIP**: Depends on the `createEmployee` service abstraction (which in turn depends on the `api` axios singleton). No direct HTTP in the hook.
- **Depth**: Interface = 12 properties (5 field pairs + 2 flags + `onSubmit`). Implementation hides: state management for all 5 fields, optional-field omission logic (`firstName !== ""` / `lastName !== ""`), error extraction from axios error shape, isSubmitting lifecycle (set true → try → catch/reset → success/reset → onSuccess). The deletion test passes: removing the hook would force `CreateEmployeeModal` to manage all of this directly, scattering form state + submit logic into a display component (violates SRP).

**Optional-field omission strategy:**
The parent specifies spread syntax to exclude `firstName`/`lastName` when empty. This is the idiomatic approach when the field must be absent from the serialized payload (not sent as `""`):
```typescript
const form: EmployeeCreateForm = {
  username,
  email,
  password,
  ...(firstName !== "" ? { firstName } : {}),
  ...(lastName !== "" ? { lastName } : {}),
}
```
When `firstName === ""`, the spread adds `{}` — no key is added to the object. The JSON serialization of the form object will not contain `firstName` at all, matching `EmployeeCreateForm`'s optional `firstName?` type.

**Error extraction pattern:**
Consistent with `useDeleteEmployee` and `useEditEmployee`:
```typescript
const axiosErr = err as { response?: { data?: { message?: string } }; message?: string }
const message =
  axiosErr.response?.data?.message ??
  axiosErr.message ??
  "Failed to create employee."
```

### Files to Create/Modify

- [x] `src/features/employees/hooks/useCreateEmployee.test.ts` — **Create**: 4 behavior tests (RED step)
- [x] `src/features/employees/hooks/useCreateEmployee.ts` — **Create**: hook implementation (GREEN step)

---

## Step-by-Step Implementation

### Step 2.1 RED: Create `useCreateEmployee.test.ts` with 4 behavior tests

**Goal:** Write 4 failing tests that fully specify the hook's observable behavior before the implementation exists. The tests should fail with `Error: Failed to resolve import "./useCreateEmployee"` — confirming the test infrastructure is correct and the module simply doesn't exist yet.
**Dependencies:** Task 1 fully executed (76/76 tests, `EmployeeCreateForm`, `EmployeeMiniDTO`, and `createEmployee` all exist).

- [x] Create `src/features/employees/hooks/useCreateEmployee.test.ts` with the full content below
- [x] Run `npm run test` from `project/srcs/frontend/` — expect **1 failing suite** (`Failed to resolve import "./useCreateEmployee"`), **76** existing tests still passing

**Why this step is critical:**
The RED signal on `Failed to resolve import "./useCreateEmployee"` proves the test file is syntactically valid, the mock setup compiles, and the import path is correct — all before any implementation exists. A GREEN signal at this stage would mean the test is not exercising the right module.

#### Implementation

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useCreateEmployee } from "./useCreateEmployee"
import { createEmployee } from "../services/employeeService"
import type { EmployeeMiniDTO } from "../types"

// Mock all service exports to prevent HTTP leaks from any function in the module.
// The module factory pattern (string path + factory function) is hoisted before
// imports by Vitest — this is the established pattern in this codebase.
vi.mock("../services/employeeService", () => ({
  listEmployees: vi.fn(),
  updateEmployee: vi.fn(),
  activateEmployee: vi.fn(),
  deactivateEmployee: vi.fn(),
  deleteEmployee: vi.fn(),
  createEmployee: vi.fn(),
}))

// createEmployee imported as a VALUE (not import type) — required by verbatimModuleSyntax: true
// because vi.mocked(createEmployee) needs the runtime function reference, not an erased type.
const mockCreateEmployee = vi.mocked(createEmployee)

const mockEmployeeMiniDTO: EmployeeMiniDTO = {
  firstName: "Bob",
  lastName: "Smith",
  email: "bob@example.com",
  username: "bob",
  roles: ["ROLE_EMPLOYEE"],
}

describe("useCreateEmployee", () => {
  const onSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateEmployee.mockResolvedValue(mockEmployeeMiniDTO)
  })

  // ── Test 1: Initialization ─────────────────────────────────────────────────────
  it("initializes all form fields to empty strings and status flags to clean state", () => {
    const { result } = renderHook(() => useCreateEmployee(onSuccess))

    expect(result.current.username).toBe("")
    expect(result.current.email).toBe("")
    expect(result.current.password).toBe("")
    expect(result.current.firstName).toBe("")
    expect(result.current.lastName).toBe("")
    // Status flags must start clean — CreateEmployeeModal renders error conditionally on `error !== null`
    expect(result.current.isSubmitting).toBe(false)
    expect(result.current.error).toBeNull()
  })

  // ── Test 2: Full payload — all fields filled ───────────────────────────────────
  it("calls createEmployee with all fields and calls onSuccess when all form fields are filled", async () => {
    const { result } = renderHook(() => useCreateEmployee(onSuccess))

    await act(async () => {
      result.current.setUsername("bob")
      result.current.setEmail("bob@example.com")
      result.current.setPassword("secret123")
      result.current.setFirstName("Bob")
      result.current.setLastName("Smith")
    })
    await act(async () => {
      await result.current.onSubmit()
    })

    expect(mockCreateEmployee).toHaveBeenCalledWith({
      username: "bob",
      email: "bob@example.com",
      password: "secret123",
      firstName: "Bob",
      lastName: "Smith",
    })
    expect(onSuccess).toHaveBeenCalledOnce()
    expect(result.current.isSubmitting).toBe(false)
    // REVIEW-FIX: Added error assertion — a bug that accidentally sets error in the
    // try-success branch would not otherwise be caught by this test.
    expect(result.current.error).toBeNull()
  })

  // ── Test 3: Optional fields omitted when empty ────────────────────────────────
  it("omits firstName and lastName from the payload when those fields are left empty", async () => {
    const { result } = renderHook(() => useCreateEmployee(onSuccess))

    // Only required fields set; firstName and lastName intentionally left at their initial ""
    await act(async () => {
      result.current.setUsername("bob")
      result.current.setEmail("bob@example.com")
      result.current.setPassword("secret123")
    })
    await act(async () => {
      await result.current.onSubmit()
    })

    // Deep equality: the actual call must have exactly these 3 keys and no others.
    // If firstName or lastName appear in the payload (even as ""), this assertion fails.
    expect(mockCreateEmployee).toHaveBeenCalledWith({
      username: "bob",
      email: "bob@example.com",
      password: "secret123",
    })
    expect(onSuccess).toHaveBeenCalledOnce()
    // REVIEW-FIX: Added isSubmitting and error assertions — a bug that accidentally sets
    // error or fails to reset isSubmitting in the success branch would not be caught
    // without these defensive checks (mirrors the fix applied to useDeleteEmployee.test.ts Test 3).
    expect(result.current.isSubmitting).toBe(false)
    expect(result.current.error).toBeNull()
  })

  // ── Test 4: createEmployee rejection → error set, onSuccess not called ─────────
  it("sets error message and does not call onSuccess when createEmployee rejects", async () => {
    mockCreateEmployee.mockRejectedValueOnce(new Error("Username already taken"))
    const { result } = renderHook(() => useCreateEmployee(onSuccess))

    await act(async () => {
      result.current.setUsername("taken")
      result.current.setEmail("taken@example.com")
      result.current.setPassword("password123")
    })
    await act(async () => {
      await result.current.onSubmit()
    })

    expect(result.current.error).toBe("Username already taken")
    expect(result.current.isSubmitting).toBe(false)
    expect(onSuccess).not.toHaveBeenCalled()
  })
})
```

#### Edge Cases

1. **`createEmployee` imported as a value, not `import type`** — Under `verbatimModuleSyntax: true`, importing as `import type { createEmployee }` would cause `vi.mocked(createEmployee)` to fail at runtime because the type import is erased at compile time. The value import `import { createEmployee } from "../services/employeeService"` is required for `vi.mocked()` to wrap the runtime reference. The `vi.mock()` factory ensures the import actually resolves to the mocked version, not a real HTTP call.

2. **Two-`act` pattern for setter/submit separation** — Tests 2, 3, and 4 split setters into the first `act` and `onSubmit()` into the second `act`. This is required because React batches state updates: the setters (`setUsername`, `setEmail`, etc.) update `useState` slots asynchronously in React 19. If `onSubmit()` ran in the same `act` as the setters, the closure inside `onSubmit()` might capture stale state (the initial `""` values) before React has flushed the state updates. The two-`act` split guarantees that all state has settled before `onSubmit()` executes.

3. **`toHaveBeenCalledWith` uses deep equality (not `objectContaining`) for Test 3** — `expect(mockCreateEmployee).toHaveBeenCalledWith({ username, email, password })` will FAIL if the actual call includes any additional keys (such as `firstName: ""` or `lastName: ""`). This is the correct assertion for verifying key omission — it does not require a separate `expect.not.objectContaining` assertion.

4. **`vi.clearAllMocks()` in `beforeEach`** — `clearAllMocks()` resets call counts and recorded arguments but does NOT reset `mockResolvedValue`. The `mockResolvedValue(mockEmployeeMiniDTO)` set in `beforeEach` persists across tests as the default happy-path behavior. `mockRejectedValueOnce` in Test 4 overrides this for a single call only, restoring the happy-path default for subsequent tests.

5. **`onSuccess` declared outside `beforeEach`** — Following the `useDeleteEmployee.test.ts` pattern: `const onSuccess = vi.fn()` declared at `describe` scope, cleared by `vi.clearAllMocks()` in `beforeEach`. This is equivalent to declaring it inside `beforeEach` but avoids re-creating the function object on every test.

6. **No `EmployeeListDTO` fixture needed** — Unlike `useEditEmployee` and `useDeleteEmployee`, `useCreateEmployee` takes only `onSuccess` (no `employee` parameter). The hook starts with blank state; no prior employee data is needed. This simplifies the test setup considerably.

---

### Step 2.1 GREEN: Create `useCreateEmployee.ts` hook implementation

**Goal:** Write the minimal hook implementation that makes all 4 tests pass.
**Dependencies:** Step 2.1 RED complete — the test file must already exist and all 4 tests must be failing.

- [x] Create `src/features/employees/hooks/useCreateEmployee.ts` with the full content below
- [x] Run `npm run test` from `project/srcs/frontend/` — expect **80/80** passing (76 baseline + 4 new)
- [x] Run `npm run typecheck` from `project/srcs/frontend/` — expect **0 errors**
- [x] Run `npm run build` from `project/srcs/frontend/` — expect success (bundle byte-count should be very close to the 76-test baseline — the hook is not yet imported into the render tree)

**Why this step is critical:**
`useCreateEmployee` is the core deep module of this feature. All business rules for the create flow live here. The display component in Task 3 will delegate entirely to this hook's interface — making the modal a pure rendering layer with no business logic of its own.

#### Implementation

```typescript
import { useState } from "react"
import type { EmployeeCreateForm } from "../types"
import { createEmployee } from "../services/employeeService"

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

export function useCreateEmployee(onSuccess: () => void): UseCreateEmployeeResult {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit() {
    setIsSubmitting(true)
    setError(null)

    const form: EmployeeCreateForm = {
      username,
      email,
      password,
      ...(firstName !== "" ? { firstName } : {}),
      ...(lastName !== "" ? { lastName } : {}),
    }

    try {
      await createEmployee(form)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string }
      const message =
        axiosErr.response?.data?.message ??
        axiosErr.message ??
        "Failed to create employee."
      setError(message)
      setIsSubmitting(false)
      return
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
    isSubmitting,
    error,
    onSubmit,
  }
}
```

#### Edge Cases

1. **`EmployeeCreateForm` imported as `import type`** — Under `verbatimModuleSyntax: true`, `EmployeeCreateForm` is used only as a type annotation (`const form: EmployeeCreateForm = ...`). TypeScript erases type annotations at compile time. Using `import type` is required; a regular value import would cause `noUnusedLocals` to flag a runtime-unused binding.

2. **`createEmployee` imported as a value** — `createEmployee` is called at runtime inside `onSubmit()`. It must be a value import (`import { createEmployee } from ...`), not `import type`. The same rule applies in the test file where `vi.mocked(createEmployee)` needs the runtime reference.

3. **`...(firstName !== "" ? { firstName } : {})` omits the key entirely** — The spread of `{}` adds zero keys to the object. This is the only correct approach to make the JSON serialization omit `firstName`. Sending `{ firstName: "" }` would be treated differently by some backends. Sending `{ firstName: undefined }` would cause `JSON.stringify` to omit the key in some environments but is not explicit. The `!== ""` check + spread is the codebase-consistent, explicit approach.

4. **`isSubmitting = true` set before the `try` block** — Setting `isSubmitting(true)` before entering `try` means the Create button becomes disabled immediately on click, before any async work starts. If the button were still enabled during the first tick, a fast user could double-click and submit twice. The `setError(null)` before `try` clears any previous error from a prior failed attempt.

5. **`UseCreateEmployeeResult` interface is not exported** — Consistent with `UseEditEmployeeResult` and `UseDeleteEmployeeResult`. Callers that need the return type should use `ReturnType<typeof useCreateEmployee>`. Exporting the interface would add an unnecessary API surface to the module.

6. **No `useCallback` anywhere** — Consistent with all existing hooks in this feature. Plain async functions declared inside the hook body are recreated on each render, but since none of these functions are passed as `memo` props or `useEffect` deps, `useCallback` would add complexity without benefit.

7. **Return order in the result object** — Fields are returned in the same order as the `UseCreateEmployeeResult` interface declaration: `username`, `setUsername`, `password`, `setPassword`, `firstName`, `setFirstName`, `lastName`, `setLastName`, `email`, `setEmail`, `isSubmitting`, `error`, `onSubmit`. This mirrors how `CreateEmployeeModal` will destructure them in Task 3.

---

## Design Decisions

**Decision 1: `useCreateEmployee` takes only `onSuccess` — no `employee` parameter**
- **Why:** Unlike `useEditEmployee(employee, onSuccess)`, the create hook starts blank. There is no pre-existing employee to initialize from. A no-argument creation hook with blank defaults is the correct abstraction — the form always starts empty, regardless of context.
- **Alternatives considered:** Accepting default values for each field — rejected because new employee creation always starts blank. Pre-filling any field would require a different feature (e.g., "duplicate employee") and would be addressed in a separate hook.

**Decision 2: Optional fields use `!== ""` guard with spread syntax**
- **Why:** The parent specifies: "include `firstName` only when `firstName !== ""`". This guard is explicitly not `!firstName` (which would also exclude `"0"` or other falsy strings) — it is a literal empty-string check. The spread `...(firstName !== "" ? { firstName } : {})` produces a payload object with no `firstName` key when the field is empty, matching `EmployeeCreateForm`'s `firstName?` optional type.
- **Alternatives considered:** (a) Sending `firstName: undefined` — rejected because `JSON.stringify` behavior with `undefined` values is environment-dependent and semantically ambiguous; (b) Sending `firstName: ""` always — rejected because the parent explicitly says to omit empty optional fields to avoid unexpected backend behavior; (c) Filtering the object after construction — rejected as a more complex approach than inline spread.

**Decision 3: `UseCreateEmployeeResult` interface is unexported**
- **Why:** Consistent with `UseEditEmployeeResult` and `UseDeleteEmployeeResult`. The interface is an internal implementation contract, not a public API. The hook's return type is already discoverable via `ReturnType<typeof useCreateEmployee>`. Adding an export would expand the module's public surface without adding value.
- **Alternatives considered:** Exporting the interface for use in `CreateEmployeeModal` — rejected. `CreateEmployeeModal`'s props (`onClose`, `onSuccess`) don't need to reference the hook's return type; the modal calls the hook internally and destructures its result.

**Decision 4: No `useCallback` on `onSubmit`**
- **Why:** All other hooks in the employee feature (`useEditEmployee.onSave`, `useDeleteEmployee.onConfirm`, `useEmployeeList` event handlers) are plain functions declared in the hook body. Consistency matters more than micro-optimization here. `onSubmit` is not passed to a `memo` component or used as a `useEffect` dependency, so `useCallback` would add complexity without benefit.
- **Alternatives considered:** `useCallback` with `[username, email, password, firstName, lastName]` dep array — rejected. The closure captures the current state, so the deps would change on every keystroke, making `useCallback` a no-op in practice.

**Decision 5: Mock `EmployeeListDTO` fixture is not needed**
- **Why:** `useCreateEmployee` takes no `employee` parameter, so there is no need for a `mockEmployee: EmployeeListDTO` fixture. The test file only needs `mockEmployeeMiniDTO: EmployeeMiniDTO` as the happy-path return value for `mockCreateEmployee.mockResolvedValue(...)`. This keeps the test setup simpler than `useEditEmployee.test.ts` and `useDeleteEmployee.test.ts`.
- **Alternatives considered:** Including a `mockEmployee` fixture for completeness — rejected. Including an unused fixture would trigger `noUnusedLocals` errors under the project's strict TypeScript config.

**Decision 6: `setIsSubmitting(false)` called before `onSuccess()` in the success path**
- **Why:** If `onSuccess()` triggers a parent state update that unmounts the modal (which it does — Task 3 wires `onSuccess={() => { setCreateOpen(false); refresh() }}`), any state setter called after `onSuccess()` would run on an unmounted component. Setting `isSubmitting = false` before calling `onSuccess()` avoids a potential React "can't perform state update on unmounted component" warning. This is the same ordering used in `useDeleteEmployee.onConfirm()`.
- **Alternatives considered:** Calling `onSuccess()` first, then `setIsSubmitting(false)` — rejected for the unmounted-component reason above.

---

## Testing Considerations

### Automatic Validation

**Step 2.1 RED gate:**
- [ ] Run `npm run test` from `project/srcs/frontend/` — expect **1 failing suite** (`Failed to resolve import "./useCreateEmployee"`), **76** existing tests still passing. The failure must be a module-not-found error, not a parse or type error.

**Step 2.1 GREEN gate:**
- [ ] Run `npm run test` from `project/srcs/frontend/` — expect **80/80** tests passing across all test files (76 baseline + 4 new `useCreateEmployee` tests)
- [ ] Run `npm run typecheck` from `project/srcs/frontend/` — expect **0 errors**
- [ ] Run `npm run build` from `project/srcs/frontend/` — expect success (bundle byte-count near-identical to the 76-test baseline — `useCreateEmployee` is not yet imported into the render tree and does not contribute to the JS bundle)

### Manual Validation

No manual validation required for this task. `useCreateEmployee` is a pure React hook with no DOM rendering — it is fully verified by `renderHook` + `act` tests, `typecheck`, and `build`. Browser-side manual validation is deferred to Task 3 (modal rendering and submit flow).

---

## Related Code Explanations

- `src/features/employees/hooks/useDeleteEmployee.ts:1-51` — canonical pattern for a simple submit-lifecycle hook; `useCreateEmployee` replicates this structure (no setter-from-prop init, single-action orchestration, same error extraction)
- `src/features/employees/hooks/useDeleteEmployee.test.ts:1-113` — canonical test structure; `useCreateEmployee.test.ts` replicates its mock factory, `vi.mocked()` usage, `beforeEach` pattern, and two-`act` setter/submit split
- `src/features/employees/hooks/useEditEmployee.test.ts:14-21` — the all-exports `vi.mock` factory (including `createEmployee: vi.fn()` added in Task 1) that `useCreateEmployee.test.ts` replicates exactly
- `src/features/employees/services/employeeService.ts:42-47` — `createEmployee` adapter; the hook delegates to this single function
- `src/features/employees/types.ts:83-99` — `EmployeeCreateForm` (hook builds this payload) and `EmployeeMiniDTO` (used as the mock fixture return type in tests)

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected for this task
- [x] Up-to-date documentation reviewed for the affected technologies (Vitest 4.1.9 + @testing-library/react 16.3.2 patterns verified against existing hook test files)
- [x] `src/features/employees/hooks/useCreateEmployee.test.ts` created with 4 behavior tests (Test 1: initialization, Test 2: full payload, Test 3: optional fields omitted, Test 4: rejection error lifecycle)
- [x] `vi.mock("../services/employeeService", ...)` factory in `useCreateEmployee.test.ts` covers all 6 service exports: `listEmployees`, `updateEmployee`, `activateEmployee`, `deactivateEmployee`, `deleteEmployee`, `createEmployee`
- [x] `createEmployee` imported as a value (not `import type`) in `useCreateEmployee.test.ts` — required for `vi.mocked(createEmployee)`
- [x] Step 2.1 RED: `npm run test` = **1 failing suite** (`Failed to resolve import "./useCreateEmployee"`), 76 passing
- [x] `src/features/employees/hooks/useCreateEmployee.ts` created with the full hook implementation
- [x] `UseCreateEmployeeResult` interface declared inside the module but NOT exported
- [x] `EmployeeCreateForm` imported as `import type` in `useCreateEmployee.ts`
- [x] `createEmployee` imported as a value import in `useCreateEmployee.ts`
- [x] Optional-field omission uses spread syntax with `!== ""` guard for `firstName` and `lastName`
- [x] No `useCallback` used anywhere in the hook
- [x] Step 2.1 GREEN: `npm run test` = **80/80** passing
- [x] Step 2.1 GREEN: `npm run typecheck` = **0 errors**
- [x] Step 2.1 GREEN: `npm run build` = success
- [x] Parent feature Step 2.1 RED and Step 2.1 GREEN checkboxes marked `[x]`
- [x] Parent feature Task 2 wiki link updated with `[[Create-Employee-Modal-task-2-use-create-employee]]`
- [x] Code explanation files — N/A (task creates 2 new pure-logic files; no UI to explain; behavior is fully documented in tests)
