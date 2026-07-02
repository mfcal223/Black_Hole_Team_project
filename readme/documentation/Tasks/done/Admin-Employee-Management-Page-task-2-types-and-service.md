# Task: Employee Types and listEmployees Service (TDD)

#task #current #medium-complexity #parent-admin-employee-management-page

**Parent:** [[Admin-Employee-Management-Page]]
**Parent Type:** Feature
**Related Step(s):** Phase 2 — Steps 2.1, 2.2
**Estimated Complexity:** Medium

---

## Goal

Create `src/features/employees/types.ts` with all TypeScript types for the employee feature module, then implement `listEmployees` via a TDD RED → GREEN cycle in `src/features/employees/services/employeeService.ts`. These two files are the data-layer foundation that every subsequent task (hook, components, page) depends on.

---

## Parent Context

The Admin Employee Management Page (feature [[Admin-Employee-Management-Page]]) introduces a paginated, filterable employee list for admin users. All changes are frontend-only inside `project/srcs/frontend/src/`. Task 2 covers **Phase 2 (Employee Types + Service)** — it is the first task that writes source code for the feature itself.

### Why Task 2 comes before the hook (Task 3)

`useEmployeeList` (Task 3) imports both the types (`FilterField`, `PageableRequest`, `PageEnvelope`, `EmployeeListDTO`) and the service (`listEmployees`). The hook cannot be written until both are in place. The UI components (Task 4) and wiring (Task 5) depend on the hook. The dependency chain is linear: **Task 1 → Task 2 → Task 3 → Task 4 → Task 5**.

### Types scope (Step 2.1)

The parent mandates these exports for `src/features/employees/types.ts`:

| Export | Kind | Purpose |
|--------|------|---------|
| `EmployeeListDTO` | interface | Mirrors the backend `EmployeeListDTO` — shape of each item in paginated `content[]` |
| `FilterField` | type (union) | The 5 filterable field names — `"username" \| "email" \| "firstName" \| "lastName" \| "enabled"` |
| `FilterFieldMeta` | interface | Descriptor for filter UI rendering (`value`, `label`, `type`), consumed by `EmployeeFilterBar` (Task 4) |
| `FILTER_FIELDS` | const (runtime) | Array of `FilterFieldMeta` — the ordered, labeled filter options rendered in the filter dropdown |
| `PageableRequest` | interface | Mirrors the backend shared `PageableRequest` schema (see [[_Shared-Schemas]]); declared **feature-local** per the Risk Assessment |
| `PageEnvelope<T>` | interface | **Intentional partial view** of the backend pagination envelope — only the 8 fields the employee feature reads; do NOT add `numberOfElements`, `pageable`, or `sort` |

**Feature-local types decision (per parent Risk Assessment):** `PageableRequest` and `PageEnvelope<T>` are cross-cutting schemas (shared across all `POST /{resource}/list` endpoints), but the Employee page is the **first** paginated frontend feature. A single consumer is a hypothetical seam, not a real one (deletion test: extracting `src/types/api.ts` now creates a shared module around one consumer = shallow pass-through). **Extract trigger:** when a **second** paginated frontend feature is added, lift both types to `src/types/api.ts` alongside the existing `src/types/auth.ts` precedent.

### Service scope (Step 2.2, TDD)

A single function `listEmployees(request: PageableRequest): Promise<PageEnvelope<EmployeeListDTO>>` at `src/features/employees/services/employeeService.ts`:
- Calls `api.post<PageEnvelope<EmployeeListDTO>>("/employee/list", request)` using the existing `api` singleton from `@/lib/api`
- Returns `response.data`
- No error handling at the service layer — errors propagate as rejected `Promise`s to `useEmployeeList` (Task 3), which owns the error lifecycle

The parent identifies 2 behaviors to test: (1) POST body equals the `PageableRequest` passed in; (2) the `PageEnvelope` from `response.data` is returned.

### What Task 2 does NOT create

- `src/features/employees/index.ts` — the public API surface; created in Task 3 (Step 3.2)
- `useEmployeeList` hook — Task 3
- UI components — Task 4

### Feature-internal vs. public API exports

<!-- REVIEW-FIX: Added this section to clarify which types from types.ts are exported through index.ts (public) vs. imported directly from types.ts (internal). Task 4 implementors need this to avoid import errors when implementing EmployeeFilterBar. -->

Not all exports from `types.ts` appear in the feature's public `index.ts`. Per the parent's Step 3.2 specification:

| Export | Accessible via `index.ts`? | Used by |
|--------|---------------------------|---------|
| `EmployeeListDTO` | ✓ Yes — `export type { EmployeeListDTO }` | `EmployeesPage` (external) |
| `FilterField` | ✓ Yes — `export type { FilterField }` | `EmployeesPage` (external) |
| `PageEnvelope` | ✓ Yes — `export type { PageEnvelope }` | `EmployeesPage` (external) |
| `FilterFieldMeta` | ✗ No — feature-internal | `EmployeeFilterBar` (Task 4, internal) via `import type { FilterFieldMeta } from "../types"` |
| `FILTER_FIELDS` | ✗ No — feature-internal | `EmployeeFilterBar` (Task 4, internal) via `import { FILTER_FIELDS } from "../types"` |
| `PageableRequest` | ✗ No — feature-internal | `employeeService.ts`, `useEmployeeList.ts` (both internal) via `import type { PageableRequest } from "../types"` |

**Why this matters for Task 4:** `EmployeeFilterBar` must import `FILTER_FIELDS` and `FilterFieldMeta` from `"../types"` (the internal path), not from `"@/features/employees"` (the public `index.ts`). The parent's forbidden-deep-import rule applies only to `services/` and `hooks/` — `types.ts` itself is not subject to that restriction. Internal feature components (`components/`) may import from `../types` directly.

---

## Preconditions / Dependencies

- **Task 1 complete:** `src/components/ui/table.tsx` and `src/components/ui/select.tsx` exist (installed via shadcn CLI). 47/47 tests pass, 0 typecheck errors, build succeeds.
- `src/lib/api.ts` exists: exports the `api` axios singleton (base URL `/api`) and `setOnUnauthorized`. The `@/lib/api` alias resolves correctly in both Vite and Vitest (see `vitest.config.ts`).
- `axios-mock-adapter` 2.1.0 is installed as a devDependency — the test pattern is established in `src/lib/api.test.ts` and `src/features/authentication/services/authService.test.ts`.
- `vitest` 4.1.9 is configured with the `jsdom` environment and the `@/` path alias in `vitest.config.ts`.
- TypeScript 5.9.3 with `verbatimModuleSyntax: true` and `erasableSyntaxOnly: true` in `tsconfig.app.json` — all imports of types must use `import type` syntax; `enum` is prohibited (use `const` + `type` companion pattern instead, or union types as the parent mandates for `FilterField`).

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — Selected — document structure and placement
- `solid-deep-design` — Selected — depth analysis for the service module and type declarations
- `find-docs` — Selected — confirmed `mock.history.post[0].data` pattern and axios-mock-adapter v2 API
- `tdd` — Selected — governs the RED → GREEN cycle for the service
- `memory-bank` — Selected — loaded project architecture, patterns, and prior art
- `glossary-management` — Selected — domain vocabulary (Employee, Admin, Pageable, etc.)

### Documentation Reviewed

- **Context7 `/ctimmerm/axios-mock-adapter`** — confirmed `mock.history.post[0].data` is a JSON string (requires `JSON.parse()` to get the object); `mock.restore()` in `afterEach` is the correct teardown. Pattern verified against v2.1.0 README.
- **`documentation/Docs/API-Reference/Employee.md`** — confirms `POST /employee/list` endpoint, `EmployeeListDTO` field names and types (including `id: long`, nullable `firstName`/`lastName`/`lastLogin`).
- **`documentation/Docs/API-Reference/_Shared-Schemas.md`** — confirms `PageableRequest` field names (`page`, `size`, `sort[]`, `filters[]`) and the backend pagination envelope shape. The `PageEnvelope<T>` declared here omits `numberOfElements`, `pageable`, and `sort` — those 3 fields are present in the backend response but the employee feature never reads them.
- **Prior art: `src/features/authentication/services/authService.test.ts`** — the canonical axios-mock-adapter test pattern for this project: `MockAdapter` instantiated in `beforeEach`, `mock.restore()` in `afterEach`, `JSON.parse(mock.history.post[0].data as string)` for body inspection.
- **Prior art: `src/lib/api.test.ts`** — confirms Vitest + MockAdapter interaction, especially that the `api` singleton is the same instance used in `createApi()`.

### Related Existing Code

- `src/lib/api.ts` — the axios singleton imported by the service; base URL `/api`, JWT auto-attach, `setOnUnauthorized` DIP seam
- `src/features/authentication/services/authService.ts` — prior art for the single-function service module pattern
- `src/features/authentication/services/authService.test.ts` — prior art for the axios-mock-adapter test pattern
- `src/features/authentication/index.ts` — prior art for the feature index re-export pattern (will be mirrored by Task 3's `src/features/employees/index.ts`)
- `documentation/Docs/API-Reference/Employee.md` — `EmployeeListDTO` schema and `POST /employee/list` contract

---

## Implementation Details

### Approach

**Step 2.1** is a pure type-declaration step — no runtime code, no tests. Create the file, run `typecheck` to confirm 0 errors, run `test` to confirm no regressions.

**Step 2.2** is a TDD vertical slice:
1. **RED:** Write `employeeService.test.ts` with 2 behavior tests. Run tests — they fail because `./employeeService` does not exist yet (module not found). This is the correct RED signal.
2. **GREEN:** Create `employeeService.ts` with the minimal implementation. Run tests — both pass (49/49 total).
3. **VERIFY:** Run `typecheck` and `build` to confirm 0 errors.

### SOLID + Deep Module Analysis

**`types.ts`** — Pure type declarations with one runtime value (`FILTER_FIELDS` constant). No depth concept applies — there is no interface/implementation split. The file is a vocabulary module: it centralizes the domain types so service, hook, and components share a single source of truth. Deletion test: deleting would scatter type declarations across every file that needs them — it earns its keep as a cohesion point.

**`employeeService.ts`** — Deep module. Interface: 1 public function (`listEmployees`), 1 parameter (`PageableRequest`), 1 return type. Implementation: imports `api`, knows the URL `/employee/list`, applies the generic `<PageEnvelope<EmployeeListDTO>>`, accesses `response.data`. Deletion test: without this module, every caller would need to know the axios instance, the URL, the generic parameter, and the `response.data` extraction — that knowledge would scatter across the hook (Task 3). The function earns its keep. This is the exact same pattern as `login()` in `authService.ts`.

**Seam:** The `api` import is an in-process dependency (no I/O at the type level — the axios instance is already created). In tests, the `MockAdapter` intercepts at the axios adapter layer, so `listEmployees` is tested end-to-end through the real function body, hitting the mock instead of the real network. No additional mocking or injection is needed.

**Error propagation (SRP):** The service does not `try/catch`. When the network request fails (non-2xx), axios rejects the promise. The service propagates this rejection to the caller (`useEmployeeList`), which owns the error lifecycle (per the parent's "Error lifecycle per Finding-3 resolution" in Step 3's business rules). This is correct SRP: the service adapts the HTTP transport; the hook owns the state lifecycle.

### Files to Create/Modify

- [x] `src/features/employees/types.ts` — **new** — all TypeScript type and constant declarations for the employee feature
- [x] `src/features/employees/services/employeeService.test.ts` — **new** — TDD test file (2 behavior tests: POST body, return value)
- [x] `src/features/employees/services/employeeService.ts` — **new** — the `listEmployees` adapter function

> **Directory note:** `src/features/employees/` and `src/features/employees/services/` do not exist yet. Both directories must be created. File write tools create directories implicitly; shell `mkdir -p` can also be used explicitly if needed.

---

## Step-by-Step Implementation

### Step 2.1: Create `src/features/employees/types.ts`

**Goal:** Declare all TypeScript types and the `FILTER_FIELDS` runtime constant that the service, hook, and components share.
**Dependencies:** None — this step has no prerequisites beyond the project existing.

- [x] Create the directory `src/features/employees/` (if not already created by the write tool)
- [x] Create `src/features/employees/types.ts` with the content below
- [x] Run `npm --prefix project/srcs/frontend run typecheck` — confirm 0 errors
- [x] Run `npm --prefix project/srcs/frontend run test` — confirm 47/47 still pass

**Why this step is critical:** Every other file in the feature imports from `../types` or `../../types`. If the type file is absent or has errors, all downstream files fail to compile. Creating it first eliminates the dependency problem for Step 2.2.

#### Implementation

```typescript
// src/features/employees/types.ts

export interface EmployeeListDTO {
  id: number
  firstName: string | null
  lastName: string | null
  email: string
  username: string
  roles: string[]
  enabled: boolean
  dateCreated: string
  lastLogin: string | null
}

export type FilterField = "username" | "email" | "firstName" | "lastName" | "enabled"

export interface FilterFieldMeta {
  value: FilterField
  label: string
  type: "string" | "boolean"
}

export const FILTER_FIELDS: FilterFieldMeta[] = [
  { value: "username",  label: "Username",   type: "string"  },
  { value: "email",     label: "Email",       type: "string"  },
  { value: "firstName", label: "First Name",  type: "string"  },
  { value: "lastName",  label: "Last Name",   type: "string"  },
  { value: "enabled",   label: "Status",      type: "boolean" },
]

// Mirrors the backend SHARED schema — see documentation/Docs/API-Reference/_Shared-Schemas.md (PageableRequest / SortRequest / FilterRequest / FilterOperationRequest).
// This is the universal body for every POST /{resource}/list endpoint (used by DefaultServiceImplements.getListPage()).
// Declared feature-local here only because the Employee page is the FIRST paginated frontend feature; extract to src/types/api.ts on the SECOND paginated feature (see Risk Assessment).
export interface PageableRequest {
  page: number
  size: number
  sort: { field: string; direction: "ASC" | "DESC" }[]
  filters: {
    field: string
    operations: { operator: string; value: unknown }[]
  }[]
}

// INTENTIONAL PARTIAL VIEW of the backend pagination envelope (_Shared-Schemas.md): this feature consumes only
// content/totalElements/totalPages/number/size/first/last/empty, so it deliberately omits numberOfElements,
// pageable, and sort that the backend also returns. Do NOT "complete" it to match the backend envelope —
// those extra fields stay omitted to avoid coupling the employee feature to data it never reads.
export interface PageEnvelope<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
  first: boolean
  last: boolean
  empty: boolean
}
```

#### Type Annotations and Design Notes

**`EmployeeListDTO.id: number`** — The backend uses Java `long`. TypeScript `number` is safe for all IDs up to `Number.MAX_SAFE_INTEGER` (2^53 − 1 ≈ 9 × 10¹⁵). PostgreSQL `bigserial` IDs will not reach this ceiling in practice for employee records.

**`EmployeeListDTO.firstName / lastName / lastLogin: string | null`** — Both name fields are optional on `EmployeeForm` (blank → stored as null). `lastLogin` is null for employees who have never logged in.

**`EmployeeListDTO.dateCreated / lastLogin: string`** — The backend serializes Java `LocalDateTime` as an ISO 8601 string (e.g., `"2024-01-01T00:00:00"`). The frontend does not parse these into `Date` objects — they are displayed as-is or formatted by a display utility.

**`PageableRequest.filters[].operations[].value: unknown`** — TypeScript `unknown` is the correct choice here. The value can be a `string` (for CONTAINS/EQUALS on text fields), a `boolean` (for EQUALS on the `enabled` field), a `number`, or `null`. Using `unknown` lets each caller assert the correct type; `JSON.stringify` serializes all of these correctly. Critically, `false` (boolean) serializes as JSON `false`, not the string `"false"` — this is required for the `enabled = false` discriminating case in Task 3.

**`FILTER_FIELDS`** — This is a runtime constant, not a type. It must be exported without `export type`. The `FilterFieldMeta[]` type is inferred by TypeScript; the explicit type annotation is not strictly necessary but improves IDE discoverability.

#### Edge Cases

1. **Case:** TypeScript infers `FILTER_FIELDS` as a narrower literal type (e.g., `{ value: "username"; label: "Username"; type: "string" }[]`) instead of `FilterFieldMeta[]`.
   **Handling:** The explicit `: FilterFieldMeta[]` annotation widens the type to the interface, which is what consumers (`EmployeeFilterBar` in Task 4) expect. If the annotation is absent and TypeScript infers the narrower type, downstream code may see a type error when assigning to `FilterFieldMeta[]`. Keep the explicit annotation.

2. **Case:** The `PageEnvelope<T>` type has a field named `number` (the current page index). This shadows the global TypeScript `number` type name within certain contexts.
   **Handling:** No action needed. `number` as a field name is valid — it is the backend's JSON field name for the current page index (0-based), matching `pageable.pageNumber`. Do not rename it to `pageNumber` or similar — the backend response key is `number`.

3. **Case:** `EmployeeListDTO.roles` — the backend returns `["ROLE_EMPLOYEE"]`. The frontend's `UserRole` type (defined in `src/types/auth.ts`) is `"ROLE_ADMIN" | "ROLE_EMPLOYEE"`. The employee list table displays roles as-is (the parent feature does not require parsing them through `UserRole`). Keep `roles: string[]` to avoid coupling the employee feature to auth session types.
   **Handling:** Already handled by the `string[]` type. Do not import `UserRole` here.

---

### Step 2.2 RED: Write `src/features/employees/services/employeeService.test.ts`

**Goal:** Write the 2 behavior tests that specify what `listEmployees` must do. The tests must fail with a module-not-found error (not an assertion error) — this is the correct RED signal.
**Dependencies:** Step 2.1 complete (`types.ts` must exist so the `import type { PageableRequest }` in the test resolves).

- [x] Create `src/features/employees/services/` directory
- [x] Create `src/features/employees/services/employeeService.test.ts` with the content below
- [x] Run `npm --prefix project/srcs/frontend run test` — confirm the new suite FAILS (expected: "Cannot find module './employeeService'" or similar); all other 47 tests remain passing
- [x] Confirm the RED test count: 47 pass, 2 fail (the 2 new tests in the new failing suite)

**Why the RED state is important:** Writing the test first forces a clear statement of expected behavior before any implementation decisions are made. The module-not-found error confirms the test is genuinely testing the not-yet-created function, not accidentally passing through an import resolution accident.

#### Implementation

```typescript
// src/features/employees/services/employeeService.test.ts

import { describe, it, expect, beforeEach, afterEach } from "vitest"
import MockAdapter from "axios-mock-adapter"
import api from "@/lib/api"
import { listEmployees } from "./employeeService"
import type { PageableRequest } from "../types"

describe("employeeService.listEmployees", () => {
  let mock: InstanceType<typeof MockAdapter>

  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => {
    mock.restore()
  })

  it("sends the PageableRequest body to POST /employee/list", async () => {
    const request: PageableRequest = {
      page: 0,
      size: 10,
      sort: [{ field: "username", direction: "ASC" }],
      filters: [],
    }

    mock.onPost("/employee/list").reply(200, {
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 0,
      size: 10,
      first: true,
      last: true,
      empty: true,
    })

    await listEmployees(request)

    expect(mock.history.post).toHaveLength(1)
    const body = JSON.parse(mock.history.post[0].data as string)
    expect(body).toEqual(request)
  })

  it("returns the pagination envelope from the response data", async () => {
    const request: PageableRequest = {
      page: 0,
      size: 10,
      sort: [],
      filters: [],
    }

    const envelope = {
      content: [
        {
          id: 1,
          firstName: "Alice",
          lastName: "Smith",
          email: "alice@example.com",
          username: "alice",
          roles: ["ROLE_EMPLOYEE"],
          enabled: true,
          dateCreated: "2024-01-01T00:00:00",
          lastLogin: null,
        },
      ],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 10,
      first: true,
      last: true,
      empty: false,
    }

    mock.onPost("/employee/list").reply(200, envelope)

    const result = await listEmployees(request)

    expect(result).toEqual(envelope)
  })
})
```

**Test 1 — "sends the PageableRequest body to POST /employee/list":**
- Arranges a `PageableRequest` with all four required fields
- Mocks `POST /employee/list` to reply 200 with a minimal empty-page envelope (the response body does not matter for this test — only the request body is asserted)
- Calls `listEmployees(request)`
- Asserts: exactly 1 POST call was made; the parsed request body equals the original `request` object (no fields omitted, no fields added)

**Test 2 — "returns the pagination envelope from the response data":**
- Arranges a `PageableRequest` (minimal — no filters, no sort, response body is what matters)
- Mocks `POST /employee/list` to reply 200 with a non-empty envelope containing one `EmployeeListDTO`
- Calls `listEmployees(request)`
- Asserts: the returned value deeply equals the envelope object (confirming `response.data` is returned, not `response` itself or `response.data.content`)

**`mock.history.post[0].data as string`:** axios serializes the request body to a JSON string. `MockAdapter` stores the raw string in `history.post[0].data`. `JSON.parse()` restores it to an object for the `toEqual` comparison. This is the same pattern used in `authService.test.ts` line 33.

#### Edge Cases

1. **Case:** The test import `from "./employeeService"` causes a TypeScript "Module not found" error that prevents the test suite from loading at all (Vitest exits before running any tests).
   **Handling:** This is the correct RED state — proceed to Step 2.2 GREEN to create the service file. If Vitest completely refuses to run (all 47 existing tests also fail), check that `vitest.config.ts` includes an `exclude` for files that cannot resolve — but typically Vitest isolates per-file failures and other suites still pass.

2. **Case:** `mock.history.post` is empty after `await listEmployees(request)`, suggesting the MockAdapter did not intercept the call.
   **Handling:** This would indicate the `api` singleton imported by the test (`@/lib/api`) is not the same instance used by `employeeService.ts` (which imports `api from "@/lib/api"`). This should not happen because both use the same module path resolved by the same Vitest alias; the module is a singleton. If it does occur, check that `vitest.config.ts` has `singleton: true` or equivalent module caching behavior, and that the mock is initialized before `listEmployees` is called (both are in the correct order here).

---

### Step 2.2 GREEN: Create `src/features/employees/services/employeeService.ts`

**Goal:** Write the minimal implementation that makes both RED tests pass.
**Dependencies:** Step 2.2 RED complete; `types.ts` exists (Step 2.1); `src/lib/api.ts` exists.

- [x] Create `src/features/employees/services/employeeService.ts` with the content below
- [x] Run `npm --prefix project/srcs/frontend run test` — confirm 49/49 pass (47 existing + 2 new)
- [x] Run `npm --prefix project/srcs/frontend run typecheck` — confirm 0 errors
- [x] Run `npm --prefix project/srcs/frontend run build` — confirm build succeeds (no bundle errors)

**Why this step is critical:** `listEmployees` is the sole data-access point for the entire feature. All 4 filter fields and the `enabled` boolean predicate pass through this function's `request` parameter. The `PageEnvelope<EmployeeListDTO>` it returns is the shape that `useEmployeeList` (Task 3) destructures for `employees`, `totalPages`, `totalElements`, `currentPage`, etc.

#### Implementation

```typescript
// src/features/employees/services/employeeService.ts

import api from "@/lib/api"
import type { PageableRequest, PageEnvelope, EmployeeListDTO } from "../types"

export async function listEmployees(
  request: PageableRequest
): Promise<PageEnvelope<EmployeeListDTO>> {
  const response = await api.post<PageEnvelope<EmployeeListDTO>>("/employee/list", request)
  return response.data
}
```

<!-- REVIEW-FIX: Specified which three items are type-only to avoid ambiguity (FILTER_FIELDS is also in types.ts but is a value export, not a type). -->
**Import style:** `import type { PageableRequest, PageEnvelope, EmployeeListDTO } from "../types"` — all three are TypeScript interfaces (type-only imports); `verbatimModuleSyntax: true` requires the `import type` form. `api` is a value import (no `type`). Note: `FILTER_FIELDS` is also exported from `types.ts` but is a runtime `const` (value), not a type — it is NOT imported by the service and would need `import { FILTER_FIELDS }` (no `type`) if it were.

**URL `/employee/list`:** The `api` singleton has `baseURL: "/api"`. The Vite dev proxy at `vite.config.ts` strips `/api` and forwards to `http://localhost:8080`. The backend registers the endpoint at `/employee/list`. So the effective URL is `http://localhost:8080/employee/list` — the same pattern used by `api.post("/login", ...)` → backend `/login`.

**Generic parameter `api.post<PageEnvelope<EmployeeListDTO>>`:** Axios uses this generic to type-check `response.data`. Without it, `response.data` would be typed as `any`. With it, TypeScript confirms the return type of `listEmployees` matches the declared signature.

**No try/catch:** Intentional. The service is a pure HTTP adapter. Error handling (setting `error` state, clearing stale errors before each fetch) is the `useEmployeeList` hook's responsibility per the parent's "Error lifecycle per Finding-3 resolution."

#### Edge Cases

1. **Case:** TypeScript error: `Type 'unknown' is not assignable to type 'string | number | boolean | ...'` on the `filters[].operations[].value` field when building `PageableRequest` objects elsewhere.
   **Handling:** The `unknown` type in `PageableRequest` is intentional and correct. When constructing the request in `useEmployeeList` (Task 3), cast the filter value: `value: filterValue as unknown` if the hook's state is typed as `string | boolean | null`. The service itself does not construct `PageableRequest` — it only passes it through to axios.

2. **Case:** The `response.data` is `undefined` (rare axios quirk when the mock replies with an empty body string).
   **Handling:** `mock.onPost("/employee/list").reply(200, envelope)` in the test always provides a non-empty response body, so this edge case does not apply to the TDD tests. In production, the backend always returns a valid JSON body on 200.

3. **Case:** A 401 response from the backend for an expired token causes the axios interceptor in `api.ts` to call `onUnauthorizedCb()` (redirect to `/login`). The promise still rejects.
   **Handling:** The service lets the rejection propagate. The 401 interceptor in `lib/api.ts` handles the redirect; `useEmployeeList`'s `catch` block handles the error display. No special handling needed in the service.

---

## Design Decisions

**Decision 1: Single-function service module, not a class**
- **Why:** Consistent with `authService.ts` (`login()` as a standalone function). TypeScript modules are already single-instance; wrapping in a class adds syntax without any benefit. A function is simpler, directly testable, and requires no instantiation.
- **Alternatives considered:** An `EmployeeService` class with methods — rejected because `authService.ts` already establishes the function pattern and a class would introduce unnecessary instantiation complexity with no gain.

**Decision 2: `PageableRequest` and `PageEnvelope<T>` declared feature-local in `types.ts`**
- **Why:** The Employee page is the first paginated frontend feature. A single consumer is a hypothetical seam, not a real one (deletion test: extracting to `src/types/api.ts` now creates a shared module around one consumer — pass-through, no depth). When a second paginated feature is added, both types should be extracted to `src/types/api.ts` alongside the existing `src/types/auth.ts` precedent.
- **Alternatives considered:** Extract to `src/types/api.ts` immediately — rejected because the `DefaultServiceImplements.getListPage()` pattern is used by every backend list endpoint but the frontend only has one consumer today. The parent's Risk Assessment explicitly documents this decision and the extraction trigger.
- **Extraction trigger:** When a **second** paginated frontend feature is added, move `PageableRequest`, `PageEnvelope<T>`, and the related sort/filter sub-types to `src/types/api.ts`. Each consuming feature then imports the canonical types instead of re-declaring them.

**Decision 3: `PageEnvelope<T>` is an intentional partial view — 8 fields, not 11**
- **Why:** The backend returns `numberOfElements`, `pageable` (object), and `sort` (object) in addition to the 8 typed fields. The employee feature never reads these 3 fields. Omitting them avoids coupling the frontend type to backend response fields it has no use for. TypeScript's structural typing means the extra fields in the actual JSON response are harmlessly ignored.
- **Alternatives considered:** Declare all 11 fields for "completeness" — rejected by the parent explicitly ("Do NOT 'complete' it when extracting; carry only the fields each consuming feature needs"). Structural over-coupling is a form of accidental complexity.

**Decision 4: `filters[].operations[].value: unknown`**
- **Why:** The filter value can be a `string` (CONTAINS text filter), a `boolean` (`false` for Inactive, `true` for Active), or conceptually `null` (no value, for IS_NULL/IS_NOT_NULL operators). Using `unknown` forces callers to handle the type at the construction site and avoids a union type that would break `JSON.stringify` for future operators. Crucially, `false` (boolean) serializes as JSON `false`, not `"false"` (string) — this is the discriminating case for the `enabled = false` predicate that Task 3's tests will enforce.
- **Alternatives considered:** `string | boolean | null | number` union — more explicit but requires callers to cast their values at construction; `any` — unsafe, suppresses TypeScript errors. `unknown` is the strictest safe option that accurately represents "any JSON-serializable value."

**Decision 5: No error handling in the service**
- **Why:** SRP. The service is an HTTP adapter — its one responsibility is translating a `PageableRequest` into a `PageEnvelope<EmployeeListDTO>`. Error handling (clearing stale errors, setting error state, displaying messages) is `useEmployeeList`'s responsibility. Adding `try/catch` here would create a second place where errors are handled, making error propagation unpredictable. The parent's "Error lifecycle per Finding-3 resolution" explicitly assigns error handling to the hook layer.
- **Alternatives considered:** Wrap in `try/catch` and throw a typed `EmployeeServiceError` — rejected because it would add a dependency between the service and the hook's error vocabulary, violating the service's minimal interface principle.

**Decision 6: No test for 401/error response**
- **Why:** The service's behavior on error is "let the rejection propagate." This is a non-behavior — there is nothing custom to test. Testing that a rejected promise remains rejected would be testing axios internals. The parent's listed tests for this task are exactly the 2 happy-path behaviors; the error path is tested at the hook layer (Task 3).
- **Alternatives considered:** Add a 3rd test for network failure — rejected per the parent's explicit test list and the TDD principle of testing through the public interface only.

---

## Testing Considerations

### Automatic Validation

- [x] Run `npm --prefix project/srcs/frontend run typecheck` after Step 2.1 — confirm 0 errors (types.ts has no compilation issues)
- [x] Run `npm --prefix project/srcs/frontend run test` after Step 2.1 — confirm 47/47 pass (no regressions from the new types file)
- [x] Run `npm --prefix project/srcs/frontend run test` after Step 2.2 RED — confirm the new `employeeService.test.ts` suite FAILS with module-not-found; all other 47 tests still pass
- [x] Run `npm --prefix project/srcs/frontend run test` after Step 2.2 GREEN — confirm **49/49** pass (47 existing + 2 new employee service tests)
- [x] Run `npm --prefix project/srcs/frontend run typecheck` after Step 2.2 GREEN — confirm 0 errors
- [x] Run `npm --prefix project/srcs/frontend run build` after Step 2.2 GREEN — confirm build succeeds

> **Run command note:** Use `npm --prefix project/srcs/frontend run <script>` when not `cd`'d into the frontend directory. Prior sessions in this project confirmed the `--prefix` form is required when the shell's working directory is the project root.

### Manual Validation

No manual validation required for this task. All new code is TypeScript types and a service function with no UI and no browser-only behavior. The automatic validation above (typecheck + test + build) is sufficient.

---

## Related Code Explanations

- `src/lib/api.ts` — the axios singleton that `listEmployees` imports; confirms base URL `/api`, JWT auto-attach, and the `setOnUnauthorized` DIP seam (not used by the service directly)
- `src/features/authentication/services/authService.ts` — prior art: the same single-function, type-hidden service pattern; `listEmployees` follows the same module shape as `login()`
- `src/features/authentication/services/authService.test.ts` — prior art: establishes the `MockAdapter` + `mock.history.post[0].data` pattern used verbatim in `employeeService.test.ts`
- `src/features/authentication/index.ts` — prior art: the `index.ts` re-export pattern that Task 3 will mirror for the employees feature

---

## Completion Criteria

- [ ] Parent document reviewed and reflected accurately in this task
- [ ] Relevant skills reviewed and selected for this task
- [ ] Up-to-date documentation reviewed for axios-mock-adapter v2 and the backend Employee API
- [x] `src/features/employees/types.ts` created with all 6 exports: `EmployeeListDTO`, `FilterField`, `FilterFieldMeta`, `FILTER_FIELDS`, `PageableRequest`, `PageEnvelope<T>`
- [x] `src/features/employees/services/employeeService.test.ts` created (TDD RED step confirmed)
- [x] `src/features/employees/services/employeeService.ts` created (TDD GREEN step confirmed)
- [x] `npm run test` = **49/49** passing after Step 2.2 GREEN
- [x] `npm run typecheck` = 0 errors after Step 2.2 GREEN
- [x] `npm run build` succeeds after Step 2.2 GREEN
- [x] Parent feature Phase 2 steps (2.1, 2.2) marked `[x]`
- [x] Parent feature Task 2 section updated with wiki link `[[Admin-Employee-Management-Page-task-2-types-and-service]]`
