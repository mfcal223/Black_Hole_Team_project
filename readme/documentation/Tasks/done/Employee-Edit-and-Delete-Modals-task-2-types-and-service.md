# Task: Extended Types + Employee Service Functions (TDD)

#task #current #medium-complexity #parent-employee-edit-and-delete-modals

**Parent:** [[Employee-Edit-and-Delete-Modals]]
**Parent Type:** Feature
**Related Step(s):** Phase 2 — Steps 2.1, 2.2
**Estimated Complexity:** Medium

---

## Goal

Add `EmployeeDTO` and `EmployeeUpdateForm` to the existing `types.ts`, then extend `employeeService.ts` with four new adapter functions (`updateEmployee`, `deleteEmployee`, `activateEmployee`, `deactivateEmployee`) using a TDD RED → GREEN cycle. These are the data-layer primitives that `useEditEmployee` (Task 3) and `useDeleteEmployee` (Task 4) depend on.

---

## Parent Context

[[Features/to-do/Employee-Edit-and-Delete-Modals]] activates the Edit and Delete buttons on `/employees`. All business logic lives in hooks (Tasks 3–4); all display lives in modal components (Task 5). Task 2 is the data-layer foundation for that logic — it adds the types and service functions the hooks will call.

### Why Task 2 comes before the hooks (Tasks 3–4)

`useEditEmployee` imports `EmployeeDTO`, `EmployeeUpdateForm`, `updateEmployee`, `activateEmployee`, and `deactivateEmployee`. `useDeleteEmployee` imports `deleteEmployee`. Neither hook can be written until all four service functions and both types are in place. The dependency chain is linear: **Task 1 → Task 2 → Task 3 → Task 4 → Task 5**.

### Types scope (Step 2.1)

The parent mandates two new type exports added to the existing `src/features/employees/types.ts`:

**`EmployeeDTO`** — the response shape for `PUT /employee/{id}`, `DELETE /employee/{id}`, `PATCH /employee/{id}/activate`, and `PATCH /employee/{id}/deactivate`. Distinct from `EmployeeListDTO` (the paginated row shape) because it lacks `id`, `dateCreated`, and `lastLogin` — those fields are only present in the list endpoint.

```typescript
export interface EmployeeDTO {
  firstName: string | null
  lastName: string | null
  email: string
  username: string
  roles: string[]
  enabled: boolean
}
```

**`EmployeeUpdateForm`** — the request body for `PUT /employee/{id}`. All fields are optional because the backend only applies non-blank fields (partial update semantics). Password is included only when the admin explicitly provides a new one.

```typescript
export interface EmployeeUpdateForm {
  username?: string
  password?: string
  firstName?: string
  lastName?: string
  email?: string
}
```

### Service scope (Step 2.2, TDD)

Four new functions added to the existing `src/features/employees/services/employeeService.ts`. Each function is a single-endpoint adapter — same deep module pattern as the existing `listEmployees`.

| Function | HTTP | Endpoint | Request body | Response |
|----------|------|----------|-------------|----------|
| `updateEmployee(id, form)` | PUT | `/employee/{id}` | `EmployeeUpdateForm` | `EmployeeDTO` |
| `deleteEmployee(id)` | DELETE | `/employee/{id}` | — | `EmployeeDTO` |
| `activateEmployee(id)` | PATCH | `/employee/{id}/activate` | — | `EmployeeDTO` |
| `deactivateEmployee(id)` | PATCH | `/employee/{id}/deactivate` | — | `EmployeeDTO` |

The parent specifies exactly 4 behavior tests (one per function), each asserting: (1) the correct HTTP verb and URL; (2) correct request body (for PUT only); (3) `response.data` is returned.

### What Task 2 does NOT create

- `useEditEmployee` — Task 3
- `useDeleteEmployee` — Task 4
- `EditEmployeeModal`, `DeleteEmployeeModal` — Task 5
- `refresh()` in `useEmployeeList` — Task 3 (minor addition, Step 3.1)

### Exports from `types.ts` visible through `index.ts`

`EmployeeDTO` and `EmployeeUpdateForm` are added to `types.ts`. Whether they are re-exported through `src/features/employees/index.ts` is deferred to Task 5 (Step 5.5) — at that point the parent instructs exporting only if needed externally. For Task 2, neither type needs to be in `index.ts` yet (they are consumed internally by the hooks).

---

## Preconditions / Dependencies

- **Task 1 complete:** `dialog.tsx` is installed (`src/components/ui/dialog.tsx`, ADR-010 compliant). `SecurityConfig.java:117` includes `"PATCH"`. 59/59 tests pass, 0 typecheck errors, build succeeds.
- `src/features/employees/types.ts` already exists with `EmployeeListDTO`, `FilterField`, `FilterFieldMeta`, `FILTER_FIELDS`, `PageableRequest`, and `PageEnvelope<T>` — Task 2 extends it with two new exports, it does not replace or restructure it.
- `src/features/employees/services/employeeService.ts` already exists with `listEmployees` and 2 passing tests — Task 2 extends both files; neither is replaced.
- `axios-mock-adapter` 2.1.0 is installed as a devDependency. The `mock.onPut`, `mock.onDelete`, `mock.onPatch`, `mock.history.put`, `mock.history.delete`, `mock.history.patch` APIs are part of the same library already used for `listEmployees` tests.
- `vitest` 4.1.9 with `jsdom` environment and `@/` path alias in `vitest.config.ts`.
- `verbatimModuleSyntax: true` and `erasableSyntaxOnly: true` in `tsconfig.app.json` — all type-only imports must use `import type`; `enum` is prohibited.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — Selected — document structure and placement
- `solid-deep-design` — Selected — depth analysis for the four new service functions
- `find-docs` — Selected — confirmed `mock.onPut`, `mock.onDelete`, `mock.onPatch`, `mock.history.put/delete/patch` API for axios-mock-adapter 2.1.0
- `tdd` — Selected — governs the RED → GREEN cycle; 4 behavior tests written before implementation
- `memory-bank` — Selected — loaded project architecture, patterns, prior art
- `glossary-management` — Not available (CLI not found); proceeded without it

### Documentation Reviewed

- **Prior art: `src/features/employees/services/employeeService.test.ts`** — the canonical axios-mock-adapter test pattern for this project (POST + `mock.history.post[0].data`). PUT/DELETE/PATCH use the same `mock.onXxx(url).reply(200, data)` + `mock.history.xxx` shape.
- **Prior art: `src/features/authentication/services/authService.test.ts`** — confirms `vi.mock` module factory pattern; `vi.mocked()` + `mockResolvedValueOnce` for service mocking in hooks.
- **axios-mock-adapter v2.1.0** — `mock.onPut(url).reply(status, data)`, `mock.onDelete(url).reply(status, data)`, `mock.onPatch(url).reply(status, data)`. History recorded at `mock.history.put`, `mock.history.delete`, `mock.history.patch` (arrays, reset on `mock.restore()` + `new MockAdapter(api)` in `beforeEach/afterEach`).
- **`documentation/Docs/API-Reference/Employee.md`** — confirms: `PUT /employee/{id}` accepts `EmployeeForm` (request body); `DELETE /employee/{id}` no body; `PATCH /employee/{id}/activate` no body; `PATCH /employee/{id}/deactivate` no body. All four return `EmployeeDTO` on 200.

### Related Existing Code

- `src/features/employees/types.ts:1–56` — the file being extended; must preserve all existing exports intact
- `src/features/employees/services/employeeService.ts:1–9` — the file being extended; `listEmployees` remains unchanged
- `src/features/employees/services/employeeService.test.ts:1–82` — the test file being extended; existing 2 tests must continue to pass
- `src/lib/api.ts` — the axios singleton imported by all service functions; `baseURL: "/api"`, JWT auto-attach

---

## Implementation Details

### Approach

**Step 2.1** is a pure type-declaration step — no runtime code, no tests. Append two new interfaces to `types.ts`, run `typecheck` to confirm 0 errors, run `test` to confirm no regressions (still 59/59).

**Step 2.2** is a TDD vertical slice:
1. **RED:** Extend `employeeService.test.ts` with 4 new describe blocks (one per function). Run tests — the 4 new suites fail with `does not provide an export named 'updateEmployee'` (or similar). Existing 59 tests remain green.
2. **GREEN:** Add the 4 functions to `employeeService.ts`. Run tests — 63/63 pass.
3. **VERIFY:** Run `typecheck` and `build` to confirm 0 errors.

### SOLID + Deep Module Analysis

**`types.ts` additions** — Pure type declarations (no depth concept). `EmployeeDTO` and `EmployeeUpdateForm` centralize the domain vocabulary used by all hook and component modules. Deletion test: deleting them scatters type declarations into the hook files — they earn their keep.

**Why `EmployeeDTO` is separate from `EmployeeListDTO`** — `EmployeeListDTO` is the paginated-list row shape (includes `id`, `dateCreated`, `lastLogin`). `EmployeeDTO` is what all four mutating endpoints return (no `id`, no timestamps). They represent different projections of the same entity; merging them would require nullable fields for list-only columns and cause TypeScript confusion in the hook layer.

**Four new service functions** — Each is a **deep module**: minimal interface (1–2 parameters), substantial hiding behind it (axios instance, URL construction, template literal interpolation, HTTP verb selection, generic type parameter, `response.data` extraction). Deletion test: deleting any function scatters those 5 responsibilities into the hook that calls it — they earn their keep. This is the exact same pattern as `listEmployees`.

**SRP per function** — Each function has one reason to change: the shape of its specific endpoint. `updateEmployee` changes only if `PUT /employee/{id}` changes. `activateEmployee` changes only if `PATCH /employee/{id}/activate` changes. No cross-function coupling.

**Error propagation (SRP)** — No `try/catch` in any of the four functions. When a request fails (non-2xx, network error, CORS rejection), axios rejects the promise. `useEditEmployee` (Task 3) and `useDeleteEmployee` (Task 4) own the error lifecycle — they extract `error.response?.data?.message ?? error.message` and set `error` state. This boundary is the same SRP split used by `listEmployees` → `useEmployeeList`.

**Seam** — The `api` singleton is the in-process dependency. `MockAdapter` intercepts at the axios adapter layer, exactly as in the existing service tests. No new ports or seams are needed.

### Files to Create/Modify

- [x] `src/features/employees/types.ts` — **extend** — append `EmployeeDTO` and `EmployeeUpdateForm` after the existing types
- [x] `src/features/employees/services/employeeService.test.ts` — **extend** — add 4 new `describe` blocks (one per function) with one behavior test each
- [x] `src/features/employees/services/employeeService.ts` — **extend** — add 4 new exported async functions

---

## Step-by-Step Implementation

### Step 2.1: Extend `src/features/employees/types.ts`

**Goal:** Add `EmployeeDTO` and `EmployeeUpdateForm` as named exports after the existing type declarations.
**Dependencies:** None — this step is independent.

- [x] Open `src/features/employees/types.ts`
- [x] Append `EmployeeDTO` and `EmployeeUpdateForm` after the `PageEnvelope<T>` interface (at the end of the file)
- [x] Run `npm --prefix project/srcs/frontend run typecheck` — confirm 0 errors
- [x] Run `npm --prefix project/srcs/frontend run test` — confirm 59/59 still pass (no regressions)

**Why this step is critical:** `useEditEmployee` (Task 3) imports `EmployeeDTO` and `EmployeeUpdateForm` from `../types`. If these types are absent at Task 3 creation time, the hook file fails to compile. Creating the types in their own step before the RED test cycle keeps the dependency graph clean.

#### Implementation

Append after the `PageEnvelope<T>` interface in `src/features/employees/types.ts`:

```typescript
// Response shape for PUT /employee/{id}, DELETE /employee/{id},
// PATCH /employee/{id}/activate, PATCH /employee/{id}/deactivate.
// Distinct from EmployeeListDTO: no id, dateCreated, or lastLogin fields.
export interface EmployeeDTO {
  firstName: string | null
  lastName: string | null
  email: string
  username: string
  roles: string[]
  enabled: boolean
}

// Request body for PUT /employee/{id}.
// All fields are optional — the backend applies only non-blank values (partial update).
// Password is omitted when the admin does not intend to change it.
export interface EmployeeUpdateForm {
  username?: string
  password?: string
  firstName?: string
  lastName?: string
  email?: string
}
```

#### Type Design Notes

**`EmployeeDTO.firstName / lastName: string | null`** — `Employee.md` lists these as `string` (non-nullable), but the backend's JPA entity stores them as nullable columns — the same fields in `EmployeeListDTO` are already `string | null`. Making them nullable here aligns with actual runtime behavior (the backend can return null for unset name fields) and with the `EmployeeListDTO` precedent. Do not change to `string` to match the API reference; the reference is simplified.
<!-- REVIEW-FIX: Corrected misleading note — Employee.md shows firstName/lastName as string (non-nullable) but the feature spec and EmployeeListDTO precedent require string | null to match actual backend behavior. -->

**`EmployeeUpdateForm` — all optional fields** — The backend `EmployeeForm` documentation says "only non-blank fields are applied." In practice, `useEditEmployee` (Task 3) will always send all four text fields (`username`, `firstName`, `lastName`, `email`) from the form state, and will conditionally include `password` only when non-empty. The optional typing (`?`) matches the contract: callers are not required to include every field.

**`EmployeeUpdateForm.password?: string`** — Password is never pre-populated in the edit form (the `EmployeeListDTO` carries no password hash). When the admin leaves the password field blank, `useEditEmployee` omits it from the form — the backend keeps the existing password. When non-empty, it is included and the backend hashes it. The `?` typing signals that omission is valid.

**`import type` requirement** — Both `EmployeeDTO` and `EmployeeUpdateForm` are interface declarations. When imported downstream (`useEditEmployee.ts`, `employeeService.ts`, `employeeService.test.ts`), they must be imported with `import type { EmployeeDTO, EmployeeUpdateForm }` because `verbatimModuleSyntax: true` is set in `tsconfig.app.json`.

#### Edge Cases

1. **Case:** TypeScript error `'EmployeeDTO' is defined but never used` in `types.ts` because the type has no local consumer yet.
   **Handling:** `noUnusedLocals: true` applies to local variables and non-exported declarations. Exported declarations are always safe from this rule — `EmployeeDTO` and `EmployeeUpdateForm` are both `export interface`, so this rule does not apply. No special handling needed.

2. **Case:** Confusion between `EmployeeDTO` and `EmployeeListDTO` in downstream code.
   **Handling:** The naming is intentional and mirrors the backend DTOs exactly (see `Employee.md`). The difference: `EmployeeListDTO` is the paginated list row (has `id`, `dateCreated`, `lastLogin`); `EmployeeDTO` is the mutating-endpoint response (has none of those). Hooks and components that receive the edit/delete response use `EmployeeDTO`; the table row state uses `EmployeeListDTO`.

3. **Case:** `EmployeeUpdateForm` fields conflict with `EmployeeListDTO` field names.
   **Handling:** No conflict. `EmployeeUpdateForm` contains the mutable fields only (`username`, `password`, `firstName`, `lastName`, `email`). `EmployeeListDTO` has additional read-only fields (`id`, `roles`, `enabled`, `dateCreated`, `lastLogin`). The `enabled` field is intentionally absent from `EmployeeUpdateForm` — the `PUT /employee/{id}` endpoint does not control `enabled`; that is done via `PATCH activate/deactivate` endpoints. `useEditEmployee` handles this split in its `onSave()` orchestration (Task 3).

---

### Step 2.2 RED: Extend `src/features/employees/services/employeeService.test.ts`

**Goal:** Write 4 behavior tests that specify what each new service function must do. All 4 tests must fail with a named-export error — this is the correct RED signal.
**Dependencies:** Step 2.1 complete (`types.ts` must export `EmployeeDTO` and `EmployeeUpdateForm` for the test imports to resolve).

- [x] Open `src/features/employees/services/employeeService.test.ts`
- [x] Add the imports for the four new functions and `EmployeeDTO` at the top (after existing imports)
- [x] Append 4 new `describe` blocks after the existing `describe("employeeService.listEmployees", ...)` block
- [x] Add a shared `mockEmployeeDTO` fixture constant (placed before all `describe` blocks, or inside each describe — see implementation below)
- [x] Run `npm --prefix project/srcs/frontend run test` — confirm the 4 new tests FAIL (expected: export not found or function undefined); existing 59 tests still pass

**Why the RED state is important:** Writing the tests first locks in the expected API shape and behavior before implementation. The named-export error confirms the tests are testing genuinely absent code, not accidentally passing.

#### Implementation

Add the following to `src/features/employees/services/employeeService.test.ts`:

**New imports to add at the top (after existing imports):**
```typescript
import {
  updateEmployee,
  deleteEmployee,
  activateEmployee,
  deactivateEmployee,
} from "./employeeService"
import type { EmployeeUpdateForm, EmployeeDTO } from "../types"
```

**Shared fixture and new describe blocks to append after the existing `describe` block:**

```typescript
const mockEmployeeDTO: EmployeeDTO = {
  firstName: "Alice",
  lastName: "Smith",
  email: "alice@example.com",
  username: "alice",
  roles: ["ROLE_EMPLOYEE"],
  enabled: true,
}

describe("employeeService.updateEmployee", () => {
  let mock: InstanceType<typeof MockAdapter>

  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => {
    mock.restore()
  })

  it("sends PUT /employee/{id} with the form body and returns response.data", async () => {
    const id = 42
    const form: EmployeeUpdateForm = { username: "newname", email: "new@example.com" }

    mock.onPut(`/employee/${id}`).reply(200, mockEmployeeDTO)

    const result = await updateEmployee(id, form)

    expect(mock.history.put).toHaveLength(1)
    expect(mock.history.put[0].url).toBe(`/employee/${id}`)
    const body = JSON.parse(mock.history.put[0].data as string)
    expect(body).toEqual(form)
    expect(result).toEqual(mockEmployeeDTO)
  })
})

describe("employeeService.deleteEmployee", () => {
  let mock: InstanceType<typeof MockAdapter>

  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => {
    mock.restore()
  })

  it("sends DELETE /employee/{id} and returns response.data", async () => {
    const id = 42

    mock.onDelete(`/employee/${id}`).reply(200, mockEmployeeDTO)

    const result = await deleteEmployee(id)

    expect(mock.history.delete).toHaveLength(1)
    expect(mock.history.delete[0].url).toBe(`/employee/${id}`)
    expect(result).toEqual(mockEmployeeDTO)
  })
})

describe("employeeService.activateEmployee", () => {
  let mock: InstanceType<typeof MockAdapter>

  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => {
    mock.restore()
  })

  it("sends PATCH /employee/{id}/activate and returns response.data", async () => {
    const id = 42

    mock.onPatch(`/employee/${id}/activate`).reply(200, mockEmployeeDTO)

    const result = await activateEmployee(id)

    expect(mock.history.patch).toHaveLength(1)
    expect(mock.history.patch[0].url).toBe(`/employee/${id}/activate`)
    expect(result).toEqual(mockEmployeeDTO)
  })
})

describe("employeeService.deactivateEmployee", () => {
  let mock: InstanceType<typeof MockAdapter>

  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => {
    mock.restore()
  })

  it("sends PATCH /employee/{id}/deactivate and returns response.data", async () => {
    const id = 42

    mock.onPatch(`/employee/${id}/deactivate`).reply(200, mockEmployeeDTO)

    const result = await deactivateEmployee(id)

    expect(mock.history.patch).toHaveLength(1)
    expect(mock.history.patch[0].url).toBe(`/employee/${id}/deactivate`)
    expect(result).toEqual(mockEmployeeDTO)
  })
})
```

**Test design rationale:**

- **Separate `describe` blocks** — one per function keeps failure messages scoped. If `updateEmployee` is wrong, only the `employeeService.updateEmployee` block fails; the other 3 are unaffected. Consistent with the single-describe block used by `listEmployees` (one describe = one function under test).

- **Shared `mockEmployeeDTO` constant at file level** — all four describe blocks need the same `EmployeeDTO` shape. A file-level constant avoids repeating the object literal 4 times. It is placed between describe blocks (not inside a beforeEach) because it is a pure value with no cleanup needed.

- **`mock.history.put[0].url` assertion** — confirms the template literal `/employee/${id}` produces the correct URL path. Without the URL assertion, a test could pass if axios-mock-adapter used a wildcard match.

- **`mock.history.delete[0].url` / `mock.history.patch[0].url`** — same URL-verification intent as PUT.

- **No body assertion for DELETE and PATCH** — axios sends no request body for `api.delete(url)` and `api.patch(url)` (no second argument). Asserting `mock.history.delete[0].data` would be asserting `undefined` — not useful. The parent feature spec confirms no body is needed for these endpoints.

- **Separate `beforeEach`/`afterEach` per describe** — each describe block re-creates and restores `MockAdapter`. This ensures `mock.history.patch` is clean for both `activateEmployee` and `deactivateEmployee` tests — there is no cross-test contamination.

#### Edge Cases

1. **Case:** Both `activateEmployee` and `deactivateEmployee` tests assert `mock.history.patch.toHaveLength(1)`. If they ran in the same MockAdapter instance, the second test would see 2 patch calls.
   **Handling:** Each describe block has its own `beforeEach(() => { mock = new MockAdapter(api) })` and `afterEach(() => { mock.restore() })`. History is reset between tests. No cross-test contamination.

2. **Case:** `mock.history.put[0].data` is `undefined` (axios did not serialize the body).
   **Handling:** `api.put(url, body)` — axios serializes the second argument to JSON by default. `mock.history.put[0].data` will be a JSON string (same behavior as `mock.history.post[0].data` in the existing `listEmployees` test). If it is somehow `undefined`, `JSON.parse(undefined)` throws — the test fails immediately with a clear error. This signals that the service function did not pass the form as the second argument.

3. **Case:** TypeScript error: `Property 'onPut' does not exist on type 'MockAdapter'`.
   **Handling:** All `onXxx` methods exist on the `MockAdapter` type from `axios-mock-adapter` v2.1.0. This error should not occur. If it does, confirm `axios-mock-adapter@2.1.0` is installed and that the import path `from "axios-mock-adapter"` is correct (same as the existing tests).

4. **Case:** `expect(mock.history.put[0].url).toBe(`/employee/${id}`)` fails because the stored URL includes the `/api` baseURL prefix.
   **Handling:** `axios-mock-adapter` stores the URL from `config.url` (the path passed to the axios method — e.g., `/employee/42`), NOT the resolved full URL with `baseURL` (which would be `/api/employee/42`). The existing `onPost("/employee/list")` ↔ `api.post("/employee/list")` match in the project confirms that mock matching operates on the relative path. So `mock.history.put[0].url` will be `/employee/42`. If this ever fails unexpectedly, check whether `axios-mock-adapter`'s `history` format changed in a version bump; the fix is to swap `.toBe(...)` for `.toContain(...)`.
<!-- REVIEW-FIX: Added edge case note for URL format in mock.history — no prior tests in this codebase assert .url on history entries, so the expected format needed explicit documentation. -->

---

### Step 2.2 GREEN: Extend `src/features/employees/services/employeeService.ts`

**Goal:** Write the 4 minimal implementations that make all 4 RED tests pass, without modifying `listEmployees`.
**Dependencies:** Step 2.2 RED complete; `types.ts` exports `EmployeeDTO` and `EmployeeUpdateForm` (Step 2.1).

- [x] Open `src/features/employees/services/employeeService.ts`
- [x] Add `EmployeeDTO` and `EmployeeUpdateForm` to the existing import line (or add a second `import type` line)
- [x] Append the 4 new functions after `listEmployees` — do not modify the existing function
- [x] Run `npm --prefix project/srcs/frontend run test` — confirm **63/63** pass (59 existing + 4 new)
- [x] Run `npm --prefix project/srcs/frontend run typecheck` — confirm 0 errors
- [x] Run `npm --prefix project/srcs/frontend run build` — confirm build succeeds

**Why this step is critical:** These four functions are the only data-access path from the edit/delete hooks to the backend. If a function uses the wrong HTTP verb (e.g., `api.post` instead of `api.put`), the hook will silently call the wrong endpoint in production. The tests catch this — each test asserts both the verb (via `mock.history.put/delete/patch`) and the URL.

#### Implementation

Updated `src/features/employees/services/employeeService.ts`:

```typescript
import api from "@/lib/api"
import type {
  PageableRequest,
  PageEnvelope,
  EmployeeListDTO,
  EmployeeDTO,
  EmployeeUpdateForm,
} from "../types"

export async function listEmployees(
  request: PageableRequest
): Promise<PageEnvelope<EmployeeListDTO>> {
  const response = await api.post<PageEnvelope<EmployeeListDTO>>("/employee/list", request)
  return response.data
}

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

**Import line update** — The original `import type` line imported `PageableRequest`, `PageEnvelope`, and `EmployeeListDTO`. The new line adds `EmployeeDTO` and `EmployeeUpdateForm`. All five are TypeScript interfaces — `import type` is correct for all of them per `verbatimModuleSyntax: true`.

**`api.delete<EmployeeDTO>(url)` — no second argument** — axios `delete` accepts an optional `config` object as the second parameter (not a body). For `DELETE /employee/{id}`, no request body is required. The generic `<EmployeeDTO>` types the response only. The backend ignores any body.

**`api.patch<EmployeeDTO>(url)` — no second argument** — Same as delete. The activate/deactivate endpoints have no request body. Axios sends an empty body by default; the Spring backend ignores it. The parent feature confirms: "Axios sends an empty body by default; the Spring backend ignores it. No special handling needed."

**Template literals** — `` `/employee/${id}` `` produces `/employee/42` for `id = 42`. Combined with the `api` base URL `/api` and the Vite proxy (strips `/api`, forwards to `:8080`), the effective backend URL is `http://localhost:8080/employee/42`. This matches the Employee API reference.

#### Edge Cases

1. **Case:** `api.delete` does not support a generic type parameter.
   **Handling:** `axios.delete<T>(url)` is fully supported — the generic types `response.data`. This is the same pattern used by `api.post<PageEnvelope<EmployeeListDTO>>(...)` in `listEmployees`. TypeScript will confirm at compile time.

2. **Case:** `api.patch` sends an unwanted body (e.g., the previous request body leaks through).
   **Handling:** `api.patch(url)` with no second argument sends `undefined` as the body. Axios serializes `undefined` as an empty body (`Content-Length: 0` or no body). The backend's `@RequestMapping(method = PATCH)` does not read the body — no issue.

3. **Case:** 409 Conflict from `PUT /employee/{id}` (username or email already taken).
   **Handling:** The service propagates the rejection — no `try/catch`. `useEditEmployee` (Task 3) extracts the error message with `err.response?.data?.message ?? err.message` and sets `error` state. The parent feature's Risk Assessment documents this: "the backend returns a 409 with a message string in the response body when username or email is already taken."

4. **Case:** CORS preflight for `PATCH` calls is rejected.
   **Handling:** Task 1 (Step 1.1) already added `"PATCH"` to `SecurityConfig.corsConfigurationSource()`. Browser `PATCH` preflights to `http://localhost:8080` will now succeed. If backend is not running with the updated CORS config (Docker not restarted), preflight will still fail — this is a deployment concern, not a code defect.

---

## Design Decisions

**Decision 1: Extend both files — do not create new files**
- **Why:** The parent feature's Solution section explicitly lists `employeeService.ts` as a file to modify (add 4 functions), and `types.ts` as a file to modify (add 2 types). Creating separate files (e.g., `editEmployeeService.ts`) would split the adapter layer by feature rather than by resource, requiring callers to import from two different service paths. All employee endpoint adapters belong in one service module (SRP: one reason to change = the Employee API changes).
- **Alternatives considered:** Separate `employeeEditService.ts` and `employeeDeleteService.ts` — rejected because they would be shallow pass-throughs around single functions, adding module count without adding depth. The deletion test: deleting `editEmployeeService.ts` would scatter its one function into the one hook that calls it — no real leverage is lost.

**Decision 2: One `describe` block per function in the test file**
- **Why:** The test file currently has `describe("employeeService.listEmployees", ...)`. Each new function gets its own describe block, following the established naming convention `employeeService.[functionName]`. Separate describe blocks produce scoped failure messages (failing describe name appears in the test runner output) and allow independent `beforeEach`/`afterEach` for each function's mock lifecycle.
- **Alternatives considered:** A single `describe("employeeService (extended)", ...)` block containing all 4 tests — rejected because `mock.history.patch` would accumulate across `activateEmployee` and `deactivateEmployee` tests if they shared a mock instance. Separate describe blocks eliminate this risk.

**Decision 3: Shared `mockEmployeeDTO` constant at file module level (outside describe blocks)**
- **Why:** All four new describe blocks assert `expect(result).toEqual(mockEmployeeDTO)`. Repeating the object literal 4 times creates redundancy without benefit. A module-level constant is appropriate for a pure data fixture with no state and no cleanup required. It does not affect test isolation (it's read-only).
- **Alternatives considered:** One `beforeEach` at file level using `let mockEmployeeDTO: EmployeeDTO` — unnecessary for a pure constant. `vi.fn()` factories for the DTO — not applicable (it's a plain object, not a function).

**Decision 4: No error-path tests for the 4 new functions**
- **Why:** The parent's Testing Decisions section lists exactly 4 tests for this task — one per function, all happy path. Error-path testing for the service layer is explicitly excluded: "the service is an HTTP adapter; error handling is the hook's responsibility." This matches the precedent from `listEmployees` (0 error-path tests at the service layer; errors tested at the hook layer in Task 3 and Task 4).
- **Alternatives considered:** Add 4 error tests (one per function testing rejection propagation) — rejected per parent's explicit test list and TDD principle of testing behavior through the public interface only. Rejection propagation is implicit axios behavior, not service-specific behavior.

**Decision 5: All fields of `EmployeeUpdateForm` are optional (`?`)**
- **Why:** The backend's `PUT /employee/{id}` applies only non-blank fields. The frontend hook (`useEditEmployee`, Task 3) always sends all four text fields from the form state, but the type contract should not enforce this — a caller that only wants to change the email should be able to pass `{ email: "new@example.com" }`. Optional fields honor the backend's partial-update semantics.
- **Alternatives considered:** Make `username`, `email`, `firstName`, `lastName` required — rejected because the backend does not require them (they can be null/blank, in which case the existing value is kept). Required fields would over-constrain callers unnecessarily.

---

## Testing Considerations

### Automatic Validation

Run from project root (`/home/jlievano/Dropbox/CodeProjects/42-last`):

- [x] After Step 2.1: `npm --prefix project/srcs/frontend run typecheck` — must return 0 errors
- [x] After Step 2.1: `npm --prefix project/srcs/frontend run test` — must return 59/59 passing (no regressions)
- [x] After Step 2.2 RED: `npm --prefix project/srcs/frontend run test` — must show 4 new test failures (named-export error in `employeeService.test.ts`); existing 59 tests still pass
- [x] After Step 2.2 GREEN: `npm --prefix project/srcs/frontend run test` — must return **63/63** passing (59 existing + 4 new)
- [x] After Step 2.2 GREEN: `npm --prefix project/srcs/frontend run typecheck` — must return 0 errors
- [x] After Step 2.2 GREEN: `npm --prefix project/srcs/frontend run build` — must succeed

### Manual Validation

No manual validation required for this task. All new code is TypeScript types and pure HTTP adapter functions with no UI and no browser-only behavior. The automatic validation above (typecheck + test + build) is sufficient. End-to-end browser validation is deferred to Task 5 (the modal wiring step).

---

## Related Code Explanations

- `src/features/employees/types.ts:1–56` — the file being extended; `EmployeeDTO` and `EmployeeUpdateForm` are appended after line 56
- `src/features/employees/services/employeeService.ts:1–9` — the file being extended; existing `listEmployees` is untouched
- `src/features/employees/services/employeeService.test.ts:1–82` — the test file being extended; 4 new describe blocks appended after line 81
- `src/lib/api.ts` — the axios singleton (`baseURL: "/api"`, JWT auto-attach, DIP seam `setOnUnauthorized`)
- `src/features/authentication/services/authService.ts` — prior art: same single-function service module pattern
- `documentation/Docs/API-Reference/Employee.md` — `EmployeeDTO` and `EmployeeForm` schemas; all four endpoint contracts

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected for this task
- [x] Up-to-date documentation reviewed for axios-mock-adapter v2 PUT/DELETE/PATCH API and backend Employee schemas
- [x] `src/features/employees/types.ts` extended with `EmployeeDTO` and `EmployeeUpdateForm` — existing exports preserved intact
- [x] `src/features/employees/services/employeeService.test.ts` extended with 4 new describe blocks (RED confirmed: 4 new tests fail, 59 existing pass)
- [x] `src/features/employees/services/employeeService.ts` extended with `updateEmployee`, `deleteEmployee`, `activateEmployee`, `deactivateEmployee` (GREEN confirmed)
- [x] `npm run test` = **63/63** passing after Step 2.2 GREEN (59 baseline + 4 new service tests)
- [x] `npm run typecheck` = 0 errors
- [x] `npm run build` = success
- [x] Parent feature Steps 2.1 and 2.2 marked `[x]` in [[Features/to-do/Employee-Edit-and-Delete-Modals]]
- [x] Parent feature Task 2 section updated with wiki link `[[Employee-Edit-and-Delete-Modals-task-2-types-and-service]]`
