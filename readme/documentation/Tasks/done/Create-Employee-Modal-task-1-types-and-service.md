# Task: Create Employee Modal — Task 1: Types + Extended Service (TDD)

#task #current #low-complexity #parent-create-employee-modal

**Parent:** [[Create-Employee-Modal]]
**Parent Type:** Feature
**Related Step(s):** Phase 1 — Steps 1.1, 1.2
**Estimated Complexity:** Low

---

## Goal

Add `EmployeeCreateForm` and `EmployeeMiniDTO` types to `types.ts`, then extend `employeeService.ts` with a `createEmployee` adapter for `POST /employee` using a TDD red-green cycle. This task establishes the pure data-layer foundation on which `useCreateEmployee` (Task 2) depends.

---

## Parent Context

The Create Employee Modal feature adds a "Create New" button and form modal to the admin `/employees` page. Task 1 is the foundational phase: it adds only the two types and the single service function that wrap `POST /employee`. No hooks, no UI, no wiring yet.

The parent specifies three concrete deliverables for this task:

1. **Step 1.1 — Types**: Append `EmployeeCreateForm` and `EmployeeMiniDTO` to `types.ts`. `EmployeeCreateForm` is the POST /employee request body (username/email/password required; firstName/lastName optional). `EmployeeMiniDTO` is the POST /employee response body (identical to what the backend Java class `EmployeeMiniDTO` returns: firstName/lastName nullable, email/username/roles only — no id, enabled, dateCreated, lastLogin).

2. **Step 1.2 RED**: Extend `employeeService.test.ts` with one new `describe` block testing `createEmployee`. The test must fail before the implementation exists.

3. **Step 1.2 GREEN**: Add `createEmployee` to `employeeService.ts`; update the all-exports `vi.mock` factory in `useEditEmployee.test.ts` and `useDeleteEmployee.test.ts` to add `createEmployee: vi.fn()` — the service module grows from 5 to 6 exports and the anti-leak factory must stay complete.

The parent is explicit on the no-try/catch rule: error lifecycle is owned by `useCreateEmployee` in Task 2, not by the service adapter. The service function follows the same pattern as `updateEmployee`, `deleteEmployee`, `activateEmployee`, and `deactivateEmployee`.

---

## Preconditions / Dependencies

- The Employee Edit and Delete Modals feature is fully executed: 75 tests passing, 0 typecheck errors, build success. This is the baseline.
- `src/features/employees/types.ts` already contains `EmployeeListDTO`, `EmployeeDTO`, `EmployeeUpdateForm`, `FilterField`, `FilterFieldMeta`, `FILTER_FIELDS`, `PageableRequest`, `PageEnvelope<T>`.
- `src/features/employees/services/employeeService.ts` already exports 5 functions: `listEmployees`, `updateEmployee`, `deleteEmployee`, `activateEmployee`, `deactivateEmployee`.
- `src/features/employees/services/employeeService.test.ts` already contains 5 `describe` blocks (one per existing function) using the `axios-mock-adapter` pattern.
- `src/features/employees/hooks/useEditEmployee.test.ts` and `useDeleteEmployee.test.ts` both contain a `vi.mock("../services/employeeService", () => ({ ...5 exports... }))` factory covering all 5 service exports.
- The `verbatimModuleSyntax: true` TypeScript config applies: type-only imports must use `import type`; runtime function imports must be value imports.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `tdd` — **Selected** — TDD red-green discipline for Step 1.2: write the test first (RED), verify failure, then implement (GREEN).
- `solid-deep-design` — **Selected** — `createEmployee` is designed as a deep module: one parameter, hides axios verb + URL + generic + `response.data` extraction. Deletion test passes (removing it would scatter HTTP concerns into every caller).
- `documentation-management` — **Selected** — governs task creation and file placement.
- `memory-bank` — **Selected** — project context loaded at session start.
- `find-docs` — **Selected** — axios-mock-adapter 2.1.0 patterns verified against existing codebase tests.
- `react-best-practices` — Not needed — no React components in this task.

### Documentation Reviewed

- `documentation/Docs/API-Reference/Employee.md` — confirmed `POST /employee` returns **200** (not 201) with `EmployeeMiniDTO` shape: `{ firstName, lastName, email, username, roles[] }`. No `id`, no `enabled`, no `dateCreated`, no `lastLogin`.
- `src/features/employees/services/employeeService.test.ts` — verified the axios-mock-adapter pattern: each `describe` block owns its own `let mock: InstanceType<typeof MockAdapter>`, `beforeEach` creates it, `afterEach` calls `mock.restore()`.
- `src/features/employees/hooks/useEditEmployee.test.ts` and `useDeleteEmployee.test.ts` — confirmed the all-exports `vi.mock` factory pattern (lists all 5 current service exports as `vi.fn()`).

### Related Existing Code

- `src/features/employees/types.ts` — the file to extend with two new types
- `src/features/employees/services/employeeService.ts` — the file to extend with `createEmployee`
- `src/features/employees/services/employeeService.test.ts` — the file to extend with 1 new describe block
- `src/features/employees/hooks/useEditEmployee.test.ts` — needs `createEmployee: vi.fn()` added to its mock factory
- `src/features/employees/hooks/useDeleteEmployee.test.ts` — needs `createEmployee: vi.fn()` added to its mock factory

---

## Implementation Details

### Approach

Task 1 is purely additive: all changes extend existing files without touching existing exports or tests. The TypeScript constraint `verbatimModuleSyntax: true` governs import style throughout:
- Type-only usages → `import type`
- Runtime value usages (functions called at runtime) → value import

**SOLID + Deep Module analysis for `createEmployee`:**
- **SRP**: One function, one responsibility — POST to `/employee`. No validation, no error handling, no state.
- **OCP**: Extending `employeeService.ts` by adding a new export; no existing function is modified.
- **DIP**: Depends on the `api` abstraction (Axios singleton from `@/lib/api`), not a concrete HTTP implementation.
- **Depth**: Interface = one parameter (`EmployeeCreateForm`) + return (`Promise<EmployeeMiniDTO>`). Implementation hides: HTTP verb, endpoint URL, axios generic type, `response.data` extraction. The deletion test passes — removing `createEmployee` would force every caller to repeat the axios call site.

The all-exports `vi.mock` convention in `useEditEmployee.test.ts` / `useDeleteEmployee.test.ts`: when a service module grows, every hook test file that mocks it must list ALL exports in the factory. An incomplete factory causes the unlisted exports to be `undefined` — if a future hook accidentally calls an unmocked function, a real HTTP request would be issued in the test environment.

### Files to Create/Modify

- [ ] `src/features/employees/types.ts` — **Modify**: append `EmployeeCreateForm` and `EmployeeMiniDTO`
- [ ] `src/features/employees/services/employeeService.test.ts` — **Modify**: add `createEmployee` describe block (RED then GREEN)
- [ ] `src/features/employees/services/employeeService.ts` — **Modify**: add `createEmployee` function + extend `import type` (GREEN step only)
- [ ] `src/features/employees/hooks/useEditEmployee.test.ts` — **Modify**: add `createEmployee: vi.fn()` to mock factory (GREEN step)
- [ ] `src/features/employees/hooks/useDeleteEmployee.test.ts` — **Modify**: add `createEmployee: vi.fn()` to mock factory (GREEN step)

---

## Step-by-Step Implementation

### Step 1.1: Add `EmployeeCreateForm` and `EmployeeMiniDTO` to `types.ts`

**Goal:** Declare the POST /employee request and response types that the service adapter and future hook will depend on.
**Dependencies:** None. This step is purely additive to an existing file.

- [ ] Open `src/features/employees/types.ts`
- [ ] Append `EmployeeCreateForm` after `EmployeeUpdateForm` (the current last type in the file)
- [ ] Append `EmployeeMiniDTO` after `EmployeeCreateForm`
- [ ] Run `npm run typecheck` from `project/srcs/frontend/` — expect 0 errors

**Why this step is critical:**
`EmployeeCreateForm` is the contract between the frontend form and the backend `POST /employee` endpoint. Making `firstName` and `lastName` optional (`?`) at the type level matches the form omission logic in `useCreateEmployee` (Task 2) and prevents TypeScript from requiring callers to explicitly pass empty strings. `EmployeeMiniDTO` must be a distinct type from `EmployeeDTO` because the create response is intentionally narrower: no `id`, no `enabled`, no `dateCreated`, no `lastLogin` — the backend's Java `EmployeeMiniDTO` class only maps `firstName/lastName/email/username/roles`.

#### Implementation

```typescript
// Append to the end of src/features/employees/types.ts

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

#### Edge Cases

1. **`firstName?` vs `firstName: string | undefined`** — Both are semantically equivalent in TypeScript but `firstName?` is the idiomatic optional-property syntax. In Task 2, `useCreateEmployee`'s `onSubmit()` uses spread syntax to omit the field entirely when the string is empty: `...(firstName !== "" ? { firstName } : {})`. The `?` in `EmployeeCreateForm` allows the spread to produce a valid object even when `firstName` is omitted.

2. **`firstName: string | null` in `EmployeeMiniDTO`** — The backend stores `firstName`/`lastName` as nullable columns. If the admin did not provide them during creation, the response will contain `null`. The `string | null` type matches this backend behavior and avoids false type safety that would break at runtime.

3. **`EmployeeMiniDTO` vs `EmployeeDTO`** — `EmployeeDTO` (existing) has `enabled: boolean`. `EmployeeMiniDTO` does NOT. They serve different endpoints and must not be merged or aliased even though most fields overlap.

---

### Step 1.2 RED: Extend `employeeService.test.ts` with the `createEmployee` test

**Goal:** Write a failing test for `createEmployee` before the implementation exists. The test should fail with a "not a function" error, confirming RED.
**Dependencies:** Step 1.1 complete — `EmployeeCreateForm` and `EmployeeMiniDTO` must exist before they can be imported in the test.

- [ ] Open `src/features/employees/services/employeeService.test.ts`
- [ ] Add `createEmployee` to the existing value import line from `"./employeeService"`
- [ ] Add `EmployeeCreateForm` and `EmployeeMiniDTO` to the existing `import type` line from `"../types"`
- [ ] Append the `describe("employeeService.createEmployee", ...)` block at the end of the file
- [ ] Run `npm run test` from `project/srcs/frontend/` — expect 1 failing suite (`createEmployee is not a function`), 75 existing tests still passing

**Why this step is critical:**
The RED signal confirms that the test infrastructure (mock setup, assertions) is correct before the implementation. A test that passes without the implementation would silently produce no value. The RED failure on "createEmployee is not a function" (rather than a TypeScript error or assertion mismatch) confirms the import path and test structure are correct.

#### Implementation

```typescript
// In src/features/employees/services/employeeService.test.ts

// 1. EXTEND the existing value import block:
import {
  listEmployees,
  updateEmployee,
  deleteEmployee,
  activateEmployee,
  deactivateEmployee,
  createEmployee,    // ADD
} from "./employeeService"

// 2. EXPAND the existing single-line import type to multi-line and add the two new types:
// <!-- REVIEW-FIX: Replaced single-line comment-annotation format with multi-line import type
//      to match the style used in employeeService.ts and avoid ambiguous arrow comments. -->
import type {
  PageableRequest,
  EmployeeUpdateForm,
  EmployeeDTO,
  EmployeeCreateForm, // ADD
  EmployeeMiniDTO,    // ADD
} from "../types"

// 3. APPEND this describe block after the deactivateEmployee block:
describe("employeeService.createEmployee", () => {
  let mock: InstanceType<typeof MockAdapter>

  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => {
    mock.restore()
  })

  it("sends POST /employee with the form body and returns response.data", async () => {
    const form: EmployeeCreateForm = {
      username: "bob",
      email: "bob@example.com",
      password: "secret123",
      firstName: "Bob",
      lastName: "Smith",
    }

    const mockMiniDTO: EmployeeMiniDTO = {
      firstName: "Bob",
      lastName: "Smith",
      email: "bob@example.com",
      username: "bob",
      roles: ["ROLE_EMPLOYEE"],
    }

    mock.onPost("/employee").reply(200, mockMiniDTO)

    const result = await createEmployee(form)

    expect(mock.history.post).toHaveLength(1)
    expect(mock.history.post[0].url).toBe("/employee")
    const body = JSON.parse(mock.history.post[0].data as string)
    expect(body).toEqual(form)
    expect(result).toEqual(mockMiniDTO)
  })
})
```

#### Edge Cases

1. **`mock.history.post` cross-contamination** — Each `describe` block in this test file creates its own `mock` instance in `beforeEach` and restores it in `afterEach`. The `createEmployee` describe block's `mock` is independent of the `listEmployees` describe block's `mock`, even though both POST. No cross-contamination is possible.

2. **`.url` assertion is `"/employee"` not `"/employee/list"`** — The assertion `expect(mock.history.post[0].url).toBe("/employee")` is discriminating: it verifies the adapter calls the correct endpoint, not the list endpoint. `mock.onPost("/employee")` only intercepts the exact path `/employee`.

3. **`reply(200, ...)` not `reply(201, ...)`** — Per `documentation/Docs/API-Reference/Employee.md`, `POST /employee` returns **200**, not 201. This matches the existing codebase convention where all CRUD operations return 200.

---

### Step 1.2 GREEN: Add `createEmployee` to the service + update mock factories

**Goal:** Make the failing test pass. Also update the all-exports mock factories in the two hook test files so the anti-leak convention remains complete after the service module grows from 5 to 6 exports.
**Dependencies:** Step 1.2 RED complete — the test must already exist and be failing.

- [ ] Open `src/features/employees/services/employeeService.ts`
- [ ] Extend the `import type` block to include `EmployeeCreateForm` and `EmployeeMiniDTO`
- [ ] Append the `createEmployee` function after `deactivateEmployee`
- [ ] Open `src/features/employees/hooks/useEditEmployee.test.ts`
- [ ] Add `createEmployee: vi.fn()` to the `vi.mock` factory
- [ ] Open `src/features/employees/hooks/useDeleteEmployee.test.ts`
- [ ] Add `createEmployee: vi.fn()` to the `vi.mock` factory
- [ ] Run `npm run test` from `project/srcs/frontend/` — expect **76/76** passing (75 existing + 1 new)
- [ ] Run `npm run typecheck` from `project/srcs/frontend/` — expect 0 errors

**Why this step is critical:**
The mock factory update is mandatory in the same GREEN step: once `createEmployee` is exported from `employeeService.ts`, any hook test file whose `vi.mock` factory omits it will leave `createEmployee` as `undefined` in the mocked module. While `useEditEmployee` and `useDeleteEmployee` never call `createEmployee` directly, the defensive all-exports convention ensures no future change to these hooks can accidentally trigger real HTTP calls.

#### Implementation

```typescript
// In src/features/employees/services/employeeService.ts

// 1. EXTEND the import type block:
import type {
  PageableRequest,
  PageEnvelope,
  EmployeeListDTO,
  EmployeeDTO,
  EmployeeUpdateForm,
  EmployeeCreateForm,   // ADD
  EmployeeMiniDTO,      // ADD
} from "../types"

// 2. APPEND after deactivateEmployee (the current last function):
export async function createEmployee(
  form: EmployeeCreateForm
): Promise<EmployeeMiniDTO> {
  const response = await api.post<EmployeeMiniDTO>("/employee", form)
  return response.data
}
```

```typescript
// In src/features/employees/hooks/useEditEmployee.test.ts
// ADD createEmployee: vi.fn() to the vi.mock factory:

vi.mock("../services/employeeService", () => ({
  listEmployees: vi.fn(),
  updateEmployee: vi.fn(),
  activateEmployee: vi.fn(),
  deactivateEmployee: vi.fn(),
  deleteEmployee: vi.fn(),
  createEmployee: vi.fn(),   // ADD
}))
```

```typescript
// In src/features/employees/hooks/useDeleteEmployee.test.ts
// ADD createEmployee: vi.fn() to the vi.mock factory:

vi.mock("../services/employeeService", () => ({
  listEmployees: vi.fn(),
  updateEmployee: vi.fn(),
  activateEmployee: vi.fn(),
  deactivateEmployee: vi.fn(),
  deleteEmployee: vi.fn(),
  createEmployee: vi.fn(),   // ADD
}))
```

#### Edge Cases

1. **`import type` for `EmployeeCreateForm` and `EmployeeMiniDTO` in `employeeService.ts`** — Under `verbatimModuleSyntax: true`, any import that is only used as a type annotation (not as a runtime value) must be `import type`. Both `EmployeeCreateForm` and `EmployeeMiniDTO` appear only in the function signature as type annotations — TypeScript erases them at compile time. They must be in the `import type` block, not the value import block.

2. **No `createEmployee` value import in the hook test files** — `useEditEmployee.test.ts` and `useDeleteEmployee.test.ts` add `createEmployee: vi.fn()` to the mock factory but do NOT import `createEmployee` as a value. This is correct: these files mock the entire service module, and they have no need to call `createEmployee` or use `vi.mocked(createEmployee)`. The mock entry exists solely to prevent the function from being `undefined` in the mocked module.

3. **`useEmployeeList.test.ts` does NOT need updating** — Its mock factory is `{ listEmployees: vi.fn() }` (intentionally partial — mocks only what `useEmployeeList` imports). Adding `createEmployee` to the service module does not break this test because Vitest's module mock replaces the entire module; `useEmployeeList` only imports `listEmployees` from the mocked module, and `listEmployees` remains mocked.

4. **No `try/catch` in `createEmployee`** — The error lifecycle belongs to `useCreateEmployee` (Task 2). Consistent with all 5 existing service functions. Axios throws on non-2xx responses; the hook catches and formats the error message.

---

## Design Decisions

**Decision 1: `EmployeeMiniDTO` is a distinct type, not an alias for `EmployeeDTO`**
- **Why:** `EmployeeDTO` (the PUT/DELETE/PATCH response) includes `enabled: boolean`. `EmployeeMiniDTO` (the POST /employee response) does not. Aliasing them would either (a) require adding a fake `enabled` field to the create response or (b) make consumers of `EmployeeDTO` silently accept a value with no `enabled` field. Both outcomes are wrong. Type accuracy matters at the boundary.
- **Alternatives considered:** Using `Omit<EmployeeDTO, "enabled">` — rejected because it couples `EmployeeMiniDTO` to `EmployeeDTO`'s definition. If `EmployeeDTO` gains or renames a field, `Omit` would silently produce a different shape. An explicit interface is more robust and readable.

**Decision 2: `firstName` and `lastName` in `EmployeeMiniDTO` are `string | null`**
- **Why:** The backend stores these as nullable columns. When the admin does not provide them during creation, the backend returns `null` in the response. Using `string` would be a type lie that breaks at runtime.
- **Alternatives considered:** `string | null | undefined` — rejected. The backend always includes these keys in the response body (as `null` when not set), so `undefined` does not occur. `string | null` is the accurate type.

**Decision 3: `firstName` and `lastName` in `EmployeeCreateForm` are optional (`?`), not `string | undefined`**
- **Why:** The `?` syntax is idiomatic for optional object properties in TypeScript. It allows the field to be omitted from the object literal entirely — which is what `useCreateEmployee.onSubmit()` does via spread syntax in Task 2. Using `firstName: string | undefined` would require explicitly passing `undefined`, which is less ergonomic and sends a different semantic signal.
- **Alternatives considered:** Making `firstName` and `lastName` required (`string`) with a separate "create with optional fields" form type — rejected as over-engineering. The backend accepts a single `EmployeeForm` shape; the frontend mirrors it directly.

**Decision 4: No try/catch in `createEmployee`**
- **Why:** SRP. The service adapter's responsibility is to translate a form object into an HTTP call and return the response data. Error handling (extracting backend error messages, setting error state, resetting isSubmitting) belongs to `useCreateEmployee` in Task 2. Adding try/catch here would either duplicate error handling logic or force the hook to re-throw and catch — unnecessary complexity.
- **Alternatives considered:** Wrapping in try/catch and re-throwing a formatted Error — rejected. All 5 existing service functions are bare async functions; `createEmployee` must be consistent.

**Decision 5: All-exports mock factory update happens in the GREEN step, not a separate step**
- **Why:** The anti-leak invariant must be maintained at all times when the test suite is in a fully passing state. Between RED (tests exist, implementation doesn't) and GREEN (implementation added), it is acceptable for the suite to have one failing test. But after GREEN, the suite must be at 76/76. Updating the mock factories in the same GREEN step ensures the suite goes from "1 failing" directly to "76/76 passing" without any intermediate inconsistent state.
- **Alternatives considered:** Updating mock factories in Step 1.1 (before RED) — rejected because at that point `createEmployee` doesn't exist as a service export yet, and adding it to the mock factory would be misleading and untestable.

---

## Testing Considerations

### Automatic Validation

**Step 1.1 gate:**
- [ ] Run `npm run typecheck` from `project/srcs/frontend/` — expect **0 errors**

**Step 1.2 RED gate:**
- [ ] Run `npm run test` from `project/srcs/frontend/` — expect **1 failing suite** for `employeeService.createEmployee`, 75 existing tests still passing. Failure message must be `TypeError: createEmployee is not a function` (confirms the import resolved but the export doesn't exist yet, not a path/parse error).

**Step 1.2 GREEN gate:**
- [ ] Run `npm run test` from `project/srcs/frontend/` — expect **76/76 tests passing** across all test files (75 baseline + 1 new `createEmployee` test)
- [ ] Run `npm run typecheck` from `project/srcs/frontend/` — expect **0 errors**
- [ ] Run `npm run build` from `project/srcs/frontend/` — expect success (bundle size should be byte-identical or very close to the 75-test baseline — no new React components, no new imports into the render tree)

### Manual Validation

No manual validation required for this task. All deliverables are pure TypeScript types and a single service function — fully verifiable by `typecheck`, `test`, and `build`.

---

## Related Code Explanations

- `src/features/employees/services/employeeService.ts:1-38` — the current service module; `createEmployee` is appended at line ~40
- `src/features/employees/types.ts:60-78` — `EmployeeDTO` and `EmployeeUpdateForm`, the types immediately before the two new types to be appended
- `src/features/employees/hooks/useEditEmployee.test.ts:14-20` — the canonical all-exports `vi.mock` factory that `useDeleteEmployee.test.ts` mirrors; `createEmployee: vi.fn()` is appended to both
- `documentation/Docs/API-Reference/Employee.md` — confirmed `POST /employee` returns 200 with `EmployeeMiniDTO` shape (no `id`, no `enabled`)

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected for this task
- [x] Up-to-date documentation reviewed for the affected technologies (`Employee.md` API reference, `employeeService.test.ts` patterns)
- [x] `EmployeeCreateForm` appended to `src/features/employees/types.ts` with `username`, `email`, `password` required and `firstName?`, `lastName?` optional
- [x] `EmployeeMiniDTO` appended to `src/features/employees/types.ts` with `firstName: string | null`, `lastName: string | null`, `email`, `username`, `roles[]`
- [x] `npm run typecheck` = 0 errors after Step 1.1
- [x] `describe("employeeService.createEmployee", ...)` block appended to `employeeService.test.ts` (1 test: POST body + URL + response.data)
- [x] `createEmployee` value import added to `employeeService.test.ts` import line
- [x] `EmployeeCreateForm` and `EmployeeMiniDTO` type imports added to `employeeService.test.ts`
- [x] Step 1.2 RED: `npm run test` = 1 failing (`createEmployee is not a function`), 75 passing
- [x] `createEmployee` function added to `employeeService.ts` after `deactivateEmployee`
- [x] `EmployeeCreateForm` and `EmployeeMiniDTO` added to `import type` block in `employeeService.ts`
- [x] `createEmployee: vi.fn()` added to `vi.mock` factory in `useEditEmployee.test.ts`
- [x] `createEmployee: vi.fn()` added to `vi.mock` factory in `useDeleteEmployee.test.ts`
- [x] Step 1.2 GREEN: `npm run test` = **76/76** passing
- [x] Step 1.2 GREEN: `npm run typecheck` = 0 errors
- [x] Step 1.2 GREEN: `npm run build` = success
- [x] Parent feature Step 1.1 and Step 1.2 checkboxes marked `[x]`
- [x] Parent feature Task 1 wiki link updated with `[[Create-Employee-Modal-task-1-types-and-service]]`
- [x] Code explanation files — N/A (Task 1 creates no new files; all changes are purely additive to existing files) <!-- REVIEW-FIX: Standard template criterion clarified as N/A since this task only extends existing files, not creates new ones. -->
