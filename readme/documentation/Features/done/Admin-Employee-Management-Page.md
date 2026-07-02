#high #new-feature #frontend

## Feature: Admin Employee Management Page

### Description

Add an admin-only "Employees" section to the frontend. This introduces a new sidebar navigation item visible only to admins, a new route at `/employees`, and a paginated, filterable employee list backed by the existing `POST /api/employee/list` endpoint. The page lets an admin scan, filter, and paginate through all registered employees, with placeholder action buttons for future edit and delete functionality.

---

## Problem Statement

Admins currently have no frontend UI to view or manage the employee list. All employee data is accessible via the backend API, but there is no page, table, or filter interface for an admin to use. As the number of employees grows, admins need a way to browse, search, and act on employee records without direct API access.

---

## User Stories

1. As an admin, I want to see an "Employees" item in the sidebar, so that I can navigate to the employee list without knowing the URL.
2. As an employee (non-admin), I want the "Employees" sidebar item to be invisible, so that I am not confused by admin-only sections.
3. As an admin, when I click "Employees" in the sidebar, I want to land on the Employee list page, so that I can see all registered employees.
4. As an admin, I want to see a table of employees with their username, email, account status, first name, and last name, so that I can quickly identify any employee.
5. As an admin, I want to see whether each employee's account is active or inactive via a colored badge, so that I can immediately spot disabled accounts without reading text carefully.
6. As an admin, I want to filter employees by a specific field, so that I can narrow the list to the employee I am looking for.
7. As an admin, when I select "username" as the filter field, I want a text input to appear so I can type a partial username, so that I can find an employee by approximate name.
8. As an admin, when I select "enabled" as the filter field, I want a dropdown with Active / Inactive / All options, so that I can see only active or only disabled accounts.
9. As an admin, I want the filter to wait until I have typed at least 3 characters before sending a request for text fields, so that I do not trigger excessive network calls while typing.
10. As an admin, I want boolean filters to take effect immediately when I select an option, so that I do not need to press a submit button.
11. As an admin, I want to clear the active filter and return to the full employee list by selecting "No filter" in the field dropdown, so that I can reset the view without refreshing the page.
12. As an admin, I want to control how many employees appear per page (5, 10, 25, 50), so that I can choose between a compact or expanded view depending on my screen.
13. As an admin, when I change the page size, I want the results to refresh immediately, so that I see the updated list without clicking a separate button.
14. As an admin, I want previous and next page buttons and a "Page X of Y" indicator, so that I can navigate through large employee lists.
15. As an admin, while the table is loading data from the backend, I want a loading overlay to appear over the table, so that I know a request is in progress and the data is about to update.
16. As an admin, I want placeholder edit and delete buttons on each employee row, so that I can see where future management actions will live.
17. As an admin, I want the edit and delete buttons to show a tooltip explaining what they will do, so that their purpose is clear even before they are functional.
18. As an admin, I want the page title in the header to read "Employees" when I am on the `/employees` route, so that the app header stays contextually correct.
19. As an admin, if I am not authenticated and navigate to `/employees`, I want to be redirected to the login page, so that the page is not accessible to unauthenticated users.
20. As an employee (non-admin), if I navigate directly to `/employees`, I want to be redirected to `/conversations`, so that role-based access is enforced consistently with the rest of the app.

---

## Solution

Introduce a `features/employees/` feature module following the established `features/authentication/` pattern. The module owns a typed service layer (`employeeService`), a state-management hook (`useEmployeeList`) with all filtering and pagination logic, and feature-specific UI components (`EmployeeTable`, `EmployeeFilterBar`). These are composed into a thin `EmployeesPage` page component. The route is wired into the existing admin-only `RoleGuard` route group, and the sidebar menu item follows the existing `roles: UserRole[]` pattern already in `Sidebar.tsx`.

### Scope

All changes are limited to `project/srcs/frontend/src/`. No backend files are modified. The backend `POST /employee/list` endpoint is consumed as-is.

### Affected Systems / Modules

- `src/router.tsx` — add `/employees` route to admin-only `RoleGuard` group
- `src/layouts/Sidebar.tsx` — add "Employees" menu item with `roles: [UserRole.ADMIN]`
- `src/layouts/Header.tsx` — add `/employees` case to `getPageTitle()`
- `src/components/ui/table.tsx` — **new** (shadcn/ui install)
- `src/components/ui/select.tsx` — **new** (shadcn/ui install)
- `src/features/employees/` — **new feature module** (types, service, hook, components)
- `src/pages/EmployeesPage.tsx` — **new page**

### Impact Analysis

- The 47 existing tests are unaffected — all new code is additive.
- The admin-only `RoleGuard` route group currently has one child route (`/dashboard`). Adding `/employees` to the same group is safe; both routes share `allowedRoles={[UserRole.ADMIN]}` and `redirectTo="/conversations"`.
- The Sidebar's `visibleMenuItems` filter already uses `hasAnyRole(item.roles)`, so adding an employee item with `[UserRole.ADMIN]` requires only a new entry in the `menuItems` array.
- `LoadingSpinner` (`src/components/common/LoadingSpinner.tsx`) is reused inside the overlay, not wrapped — the overlay is a new element around the table body area.

### Risk Assessment

- **CORS / PATCH**: The placeholder edit and delete buttons do not call the backend. When they are eventually wired to `PATCH /employee/{id}/activate` or `PATCH /employee/{id}/deactivate`, the PATCH CORS fix must be applied first (add `PATCH` to `allowedMethods` in `SecurityConfig.corsConfigurationSource()`). This is documented in the API Reference at `documentation/Docs/API-Reference/Employee.md`.
- **shadcn/ui Select vs. native `<select>`**: The project uses `@base-ui/react` (not Radix). The shadcn `select` component must be installed via the CLI — do not copy-paste a Radix-based implementation. Verify the installed component works with base-ui before proceeding with the hook.
- **Debounce + cleanup**: `useEmployeeList` must cancel pending debounce timers on unmount (via `clearTimeout` in the hook's cleanup) to prevent state updates on an unmounted component.
- **Page reset on filter change**: When the filter field or value changes, the page must reset to 0 before fetching to avoid showing an empty page-2 result for a narrow filter.
- **Filter field change resets value**: When the user changes the filter field (e.g., from "username" to "enabled"), the filter value must be cleared. Otherwise, a string "joh" left over from a username filter would be sent as an `enabled` filter value, which would fail validation.
- **EmployeeListDTO `id` field**: The `id` field is present in the response but not shown in the table. It must be kept in the type so action buttons can reference the correct employee when they are eventually wired.
- **`PageableRequest` / `<T>` shared schemas are cross-cutting but feature-local for now (per Finding-7 resolution)**: The backend has a single generic `PageableRequest` (plus `SortRequest`/`FilterRequest`/`FilterOperationRequest`) reused by every `POST /{resource}/list` endpoint — see [[Docs/API-Reference/_Shared-Schemas]]. The Employee page is the **first** paginated frontend feature, so the shared schemas are declared feature-local inside `src/features/employees/types.ts` (with a marker comment there anchoring them to `_Shared-Schemas.md`) rather than extracted now — per SOLID/deep-design seam discipline, a single caller is a *hypothetical* seam, not a real one (deletion test: extracting `src/types/api.ts` today would create a shared module around one consumer = shallow/pass-through). **Trigger to extract:** when a **second** paginated frontend feature is added, lift `PageableRequest`, `PageEnvelope<T>`, `SortRequest`, `FilterRequest`, and `FilterOperationRequest` together into `src/types/api.ts` (matching the existing `src/types/auth.ts` shared-type precedent) so each feature imports the canonical mirror of `_Shared-Schemas.md` instead of re-deriving it. Note `PageEnvelope<T>` is an *intentional partial view* of the backend envelope (it omits `numberOfElements`/`pageable`/`sort` the employee feature never reads) — do not "complete" it when extracting; carry only the fields each consuming feature needs.

---

## Implementation Architecture

### Changes Required

#### 1. shadcn/ui `table` component
**Purpose:** Provides a styled, accessible table primitive. Installed at `src/components/ui/table.tsx`. Reusable across future admin pages.

**Changes:** `npx shadcn@latest add table`

---

#### 2. shadcn/ui `select` component
**Purpose:** Provides a styled dropdown for the filter field selector, the enabled boolean filter, and the page size control. Installed at `src/components/ui/select.tsx`.

**Changes:** `npx shadcn@latest add select`

---

#### 3. `src/features/employees/types.ts` (new)
**Purpose:** Declares all TypeScript types for the employee feature. Centralises type definitions so service, hook, and components share a single source of truth.

**Changes:**
```typescript
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
// pageable, and sort that the backend also returns. Do NOT "complete" this to match the backend envelope —
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

---

#### 4. `src/features/employees/services/employeeService.ts` (new, TDD)
**Purpose:** Single-responsibility adapter for `POST /api/employee/list`. Hides axios, the URL, and request/response types behind a minimal interface. Deep module: one public function, substantial implementation.

**Changes:**
```typescript
import api from "@/lib/api"
import type { PageableRequest, PageEnvelope, EmployeeListDTO } from "../types"

export async function listEmployees(
  request: PageableRequest
): Promise<PageEnvelope<EmployeeListDTO>> {
  const response = await api.post<PageEnvelope<EmployeeListDTO>>("/employee/list", request)
  return response.data
}
```

**Test (TDD):** `src/features/employees/services/employeeService.test.ts`
- POST body is exactly the PageableRequest passed in
- Returns the envelope from the response data
- Prior art: `src/lib/api.test.ts` (axios-mock-adapter pattern)

---

#### 5. `src/features/employees/hooks/useEmployeeList.ts` (new, TDD)
**Purpose:** Owns all state for the employee list: filter field, filter value, page, size, employees, pagination metadata, loading state. Encapsulates all business rules (3-char debounce, CONTAINS vs EQUALS, page reset, filter-value clearing). Deep module: small external interface, substantial implementation.

**Interface exposed:**
```typescript
interface UseEmployeeListResult {
  // Data
  employees: EmployeeListDTO[]
  totalPages: number
  totalElements: number
  currentPage: number
  isLoading: boolean
  error: string | null

  // Filter state
  filterField: FilterField | null
  filterValue: string | boolean | null

  // Controls
  pageSize: number
  onFilterFieldChange: (field: FilterField | null) => void
  onFilterValueChange: (value: string | boolean | null) => void
  onPageSizeChange: (size: number) => void
  onPageChange: (page: number) => void
}
```

**Business rules implemented inside the hook:**
- **Error lifecycle (per Finding-3 resolution):** every fetch must `try` the `listEmployees` call; set `error` to `null` at the **start** of each fetch (so a stale error from a prior failed fetch is cleared before the new one), and in the `catch` set `error` to a user-facing message (e.g. the thrown message or a generic "We couldn't fetch the employees. Please try again."). `error` non-null means the latest fetch failed and `employees` must not be silently shown as an empty list. On a successful response, `error` remains `null`.
- On mount: fetch with `{ page: 0, size: 10, sort: [{ field: "username", direction: "ASC" }], filters: [] }`
- On `onFilterFieldChange`: clear `filterValue`, reset `currentPage` to 0, re-fetch with no filter
- On `onFilterValueChange(null)`: clear `filterValue` while **keeping `filterField`** (this is the "All" case for the `enabled` filter — the field dropdown must remain on "Status"); reset `currentPage` to 0, cancel any pending debounce, fetch with `filters: []` (no predicate). This rule must not be confused with `onFilterFieldChange(null)`, which clears the field itself.
- On `onFilterValueChange` for a **string** field: update value; if `value.length >= 3`, debounce 500ms then fetch with `CONTAINS` filter; if `value.length < 3`, cancel pending debounce, do not fetch
- On `onFilterValueChange` for a **boolean** field (`enabled`): update value (`true`/`false`), fetch immediately with `EQUALS` filter
- **Filter predicate guard (per Finding-4 resolution):** when building the `filters` array for `POST /api/employee/list`, guard with **`if (filterValue !== null)`** — never a truthy check (`if (filterValue)`, `!!filterValue`, `Boolean(filterValue)`). `false` is the "Inactive" value yielded by the typed Base UI `<Select<boolean | null>>` in `EmployeeFilterBar` (see §8) and is falsy; a truthy guard would silently drop it, sending an empty `filters: []` that makes the backend return **all** employees instead of only inactive ones (US8). The discriminating test for the boolean filter must assert the `enabled = false` case emits exactly `filters: [{ field: "enabled", operations: [{ operator: "EQUALS", value: false }] }]` — not an empty filter.
- On `onPageSizeChange`: reset `currentPage` to 0, fetch immediately
- On `onPageChange`: update page, fetch immediately
- Cleanup: `clearTimeout` on unmount or before next debounce fires

**Test (TDD):** `src/features/employees/hooks/useEmployeeList.test.ts`
- Initial load fetches with default params (page 0, size 10, sort username ASC, no filters)
- Changing page fetches with updated page number
- Changing page size resets to page 0 and fetches
- String filter with fewer than 3 chars does not trigger fetch
- String filter with 3+ chars debounces and triggers fetch with CONTAINS operator
- Boolean filter fetches immediately with EQUALS operator — **discriminating `enabled = false` (Inactive) case must assert the predicate is exactly `filters: [{ field: "enabled", operations: [{ operator: "EQUALS", value: false }] }]`, NOT an empty `filters: []`** (a truthy guard would silently drop `false` and return all employees)
- Changing filter field clears the filter value and resets to page 0
- **Error on failed fetch:** when `listEmployees` rejects, the hook sets `error` to a user-facing message and the rejected response leaves `employees` unchanged (assert `error` is non-null). **Error cleared on retry:** after a failed fetch, a new fetch that resolves sets `error` back to `null` (assert `error` is null) — also assert `error` is reset to `null` at the start of a fetch even before its resolution (override any stale error from the prior fetch).
- Prior art: `src/features/authentication/hooks/useLoginForm.test.ts` (renderHook + act, vi.mock for service)

---

#### 6. `src/features/employees/index.ts` (new)
**Purpose:** Public API surface for the employees feature. Deep imports from `services/` or `hooks/` from outside the feature folder are forbidden.

**Changes:**
```typescript
export { useEmployeeList } from "./hooks/useEmployeeList"
export type { EmployeeListDTO, FilterField, PageEnvelope } from "./types"
```

---

#### 7. `src/features/employees/components/EmployeeTable.tsx` (new)
**Purpose:** Renders the employee table with an optional loading overlay over the rows. Owns column definitions, badge rendering, action button icons, and the overlay structure. SRP: display + loading state only.

**Props:**
```typescript
interface EmployeeTableProps {
  employees: EmployeeListDTO[]
  isLoading: boolean
}
```

**Key implementation details:**
- Uses shadcn `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell` primitives
- `enabled` column: `<span>` with Tailwind classes — green background for `true` ("Active"), red for `false` ("Inactive")
- Loading overlay: a `<div>` with `absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center z-10` positioned over the `<TableBody>` wrapper, containing `<LoadingSpinner />`
- The wrapper `<div>` containing table + overlay must be `relative` so the overlay positions correctly
- Action column: two `<button>` elements with `<Tooltip>` wrapping — `<Pencil className="size-4" />` and `<Trash2 className="size-4" />` from lucide-react; both `onClick` are `undefined` (placeholder)

---

#### 8. `src/features/employees/components/EmployeeFilterBar.tsx` (new)
**Purpose:** Renders the filter control bar: field selector on the left, dynamic value input in the middle, page size selector on the right. Owns the field-type-to-input-type mapping. SRP: filter UI only, no data fetching.

**Props:**
```typescript
interface EmployeeFilterBarProps {
  filterField: FilterField | null
  filterValue: string | boolean | null
  pageSize: number
  onFilterFieldChange: (field: FilterField | null) => void
  onFilterValueChange: (value: string | boolean | null) => void
  onPageSizeChange: (size: number) => void
}
```

**Layout:** `flex items-center gap-4`
- Left group: filter field `<Select>` + dynamic value input
- Right: page size `<Select>` pushed to the right via `ml-auto`
- Field selector: "Select a field…" as placeholder (maps to `null` — resets filter). Field values (`"username"`, `"email"`, …) are genuine strings, which already match Base UI's native string `Value` — no coercion needed.
- Value input variations:
  - String field: `<Input type="text" placeholder="Type to filter..." />` (3+ char threshold handled in hook)
  - Boolean field (`enabled`): a typed Base UI `<Select<boolean | null>>` with items `{ label: "All", value: null }`, `{ label: "Active", value: true }`, `{ label: "Inactive", value: false }`. `onValueChange` yields the typed primitive directly; "All" (`null`) calls `onFilterValueChange(null)` to **clear the filter value while preserving the `enabled` field** (it must NOT call `onFilterFieldChange(null)`, which would wrongly reset the field dropdown to the placeholder).
- Page size selector: a typed Base UI `<Select<number>>` with items `{ label: "5", value: 5 }`, `{ label: "10", value: 10 }`, `{ label: "25", value: 25 }`, `{ label: "50", value: 50 }`. `onValueChange` yields the `number` directly; pass it straight to `onPageSizeChange(size)` — no `parseInt`.

> **Typed `Value` design decision (per [[ADRs/ADR-010-base-ui-over-radix-ui-for-frontend]]):** The frontend uses Base UI (`@base-ui/react`), whose `Select.Root` is **generic over `Value`** and `onValueChange` yields the typed `Value` placed on `<Select.Item value>` (per Base UI docs — *not* Radix, where `onValueChange` always yields a string). Declare typed integer/boolean/`null` item values so primitives flow through directly. This eliminates string→primitive coercion at the source rather than patching it at each callback, keeps `useEmployeeList`'s callbacks typed in domain units (`number`, `boolean`, `null`), and avoids the backend `enabled` EQUALS predicate receiving the string `"true"` instead of boolean `true`. **Verify in Task 1** that the shadcn-installed `select.tsx` wrapper forwards Base UI's generic `Value` (if the wrapper drops the generic, fall back to explicit coercion in `EmployeeFilterBar` and reopen this decision).

---

#### 9. `src/pages/EmployeesPage.tsx` (new)
**Purpose:** Thin composition layer. Uses `useEmployeeList` and renders `EmployeeFilterBar`, `EmployeeTable`, and pagination controls. Contains no business logic — only view-layer render conditions evaluated over hook-owned state: the Prev/Next `disabled` guards (`currentPage === 0 || isLoading` and `currentPage >= totalPages - 1 || isLoading`), the `Math.max(totalPages, 1)` page-label guard against the documented `totalPages = 0` case, the `{totalElements !== 1 ? "s" : ""}` pluralization, and the Finding-3 `error ? <ErrorMessage /> : <>...</>` error-branch ternary. No data fetching, transformation, or business rules of its own — `useEmployeeList` owns all domain logic and state lifecycle (including the `error` lifecycle per §5).

**Changes:**
```tsx
import { ErrorMessage } from "@/components/common/ErrorMessage"

export function EmployeesPage() {
  const {
    employees, totalPages, totalElements, currentPage,
    isLoading, error, filterField, filterValue, pageSize,
    onFilterFieldChange, onFilterValueChange, onPageSizeChange, onPageChange,
  } = useEmployeeList()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Employees</h1>
        <p className="text-muted-foreground">Manage employee accounts.</p>
      </div>

      <EmployeeFilterBar
        filterField={filterField}
        filterValue={filterValue}
        pageSize={pageSize}
        onFilterFieldChange={onFilterFieldChange}
        onFilterValueChange={onFilterValueChange}
        onPageSizeChange={onPageSizeChange}
      />

      {/* Error state REPLACES the table + pagination; the filter bar stays mounted so the admin can retry by changing the filter/page-size. */}
      {error ? (
        <ErrorMessage message={error} />
      ) : (
        <>
          <EmployeeTable employees={employees} isLoading={isLoading} />

          {/* Pagination controls */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{totalElements} employee{totalElements !== 1 ? "s" : ""}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 0 || isLoading}>
                Previous
              </Button>
              <span>Page {currentPage + 1} of {Math.max(totalPages, 1)}</span>
              <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages - 1 || isLoading}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
```

> **Error-state render decision (per Finding-3 resolution):** when `error` is non-null, render the existing `ErrorMessage` component **in place of** the table and pagination area — not above it — to honor `ErrorMessage`'s `min-h-100` content-area-replacement design (a centered destructive panel) and avoid stacking a tall panel over a necessarily-empty table (double empty space) plus dead pagination controls. Keep `EmployeeFilterBar` mounted during the error state so the admin can change the filter or page size and trigger a retry. This is a view-layer condition in the composition layer (not business logic); the hook owns the `error` lifecycle (set on rejected fetch, cleared at the start of each fetch) per Implementation Architecture §5.

---

#### 10. `src/router.tsx` (modify)
**Purpose:** Add `/employees` as a child route inside the existing admin-only `RoleGuard` route group.

**Changes:** Add `<Route path="/employees" element={<EmployeesPage />} />` alongside `/dashboard` inside the admin-only group. Import `EmployeesPage` from `@/pages/EmployeesPage`.

---

#### 11. `src/layouts/Sidebar.tsx` (modify)
**Purpose:** Add "Employees" as a new admin-only menu item.

**Changes:**
```typescript
import { LayoutDashboard, MessageSquare, Users } from "lucide-react"

const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    roles: [UserRole.ADMIN],
  },
  {
    title: "Employees",
    url: "/employees",
    icon: Users,
    roles: [UserRole.ADMIN],
  },
  {
    title: "Conversations",
    url: "/conversations",
    icon: MessageSquare,
    roles: [UserRole.EMPLOYEE],
  },
]
```

---

#### 12. `src/layouts/Header.tsx` (modify)
**Purpose:** Add `/employees` case to `getPageTitle()`.

**Changes:**
```typescript
case "/employees":
  return "Employees"
```

---

## Implementation Steps

### Phase 1: Install shadcn/ui Components
- [x] **Step 1.1:** Run `npx shadcn@latest add table` — verify `src/components/ui/table.tsx` is created; run `npm run typecheck` to confirm zero errors
- [x] **Step 1.2:** Run `npx shadcn@latest add select` — verify `src/components/ui/select.tsx` is created; run `npm run typecheck` to confirm zero errors
  - [x] **Step 1.2a (Verification per ADR-010):** Inspect the generated `select.tsx`. Confirm its `Select` wrapper forwards Base UI's **generic `Value`** (i.e., `Select.Root` is generic, not locked to `string`). This is required so `EmployeeFilterBar` can declare typed `<SelectItem value>` values (number, boolean, `null`) and have `onValueChange` yield the typed primitive — see the typed-`Value` design decision in Implementation Architecture §8. If the wrapper drops the generic, fall back to explicit coercion in `EmployeeFilterBar` and reopen the Finding-1 decision. **Result:** generic forwarded via direct re-export (`const Select = SelectPrimitive.Root`); verified empirically with a temporary harness (typed `<Select<number>>`/`<Select<boolean | null>>` + `<SelectItem value={5/false/null}>` typechecks). No coercion needed in Task 4 — see [[Admin-Employee-Management-Page-task-1-shadcn-table-select]] §Step 1.2a Finding.

### Phase 2: Employee Types + Service (TDD)
- [x] **Step 2.1:** Create `src/features/employees/types.ts` — `EmployeeListDTO`, `FilterField`, `FilterFieldMeta`, `FILTER_FIELDS` constant, `PageableRequest`, `PageEnvelope<T>`
- [x] **Step 2.2 TDD:** Write `src/features/employees/services/employeeService.test.ts` (RED); create `src/features/employees/services/employeeService.ts` (GREEN); confirm tests pass

### Phase 3: useEmployeeList Hook (TDD)
- [x] **Step 3.1 TDD:** Write `src/features/employees/hooks/useEmployeeList.test.ts` (RED — 9 behavior tests: 8 functional + 1 error-lifecycle test asserting a rejected fetch sets `error` and a following successful fetch clears `error` to `null`); create `src/features/employees/hooks/useEmployeeList.ts` (GREEN); confirm tests pass. **Filter predicate guard (per Finding-4):** the boolean-filter test must include a discriminating `enabled = false` (Inactive) case asserting the emitted request body carries exactly `filters: [{ field: "enabled", operations: [{ operator: "EQUALS", value: false }] }]` — not an empty `filters: []` — to prove the hook guards with `filterValue !== null` (a truthy guard would silently drop `false` and return all employees). **Fake-timer setup for debounce tests (per Finding-5):** the two debounce tests ("string filter < 3 chars = no fetch", "string filter ≥ 3 chars = CONTAINS fetch") must use `vi.useFakeTimers()` in `beforeEach` (alongside `vi.clearAllMocks()`) and `vi.useRealTimers()` in `afterEach`, and advance the 500ms debounce with `await vi.advanceTimersByTimeAsync(500)` inside `await act(async () => { ... })` (the async variant — the debounce fires the mocked `listEmployees` fetch) — see the "Test harness (fake timers)" note in Testing Decisions for the exact snippet. Do not use real 500ms waits or `vi.useFakeTimers({ shouldAdvanceTime: true })`.
- [x] **Step 3.2:** Create `src/features/employees/index.ts` — re-export `useEmployeeList` and types; run `npm run typecheck`

### Phase 4: UI Components + Page
- [x] **Step 4.1:** Create `src/features/employees/components/EmployeeTable.tsx` — table with loading overlay; uses shadcn `Table`, `Tooltip`, lucide `Pencil`/`Trash2`, `LoadingSpinner`
- [x] **Step 4.2:** Create `src/features/employees/components/EmployeeFilterBar.tsx` — field selector + dynamic input + page size selector; uses shadcn `Select` and `Input`. **Use Base UI's typed `Value`** (per ADR-010): declare typed `<SelectItem value>` for page size (`number`) and the `enabled` filter (`boolean | null`, with `"All"` → `null` calling `onFilterValueChange(null)` to clear the value while keeping the `enabled` field); pass primitives straight to the hook callbacks with **no `parseInt`/`=== "true"` coercion** (see Implementation Architecture §8 and the Step 1.2a verification).
- [x] **Step 4.3:** Create `src/pages/EmployeesPage.tsx` — compose `useEmployeeList` + `EmployeeFilterBar` + `EmployeeTable` + pagination controls. **Destructure `error`** from the hook and, when `error` is non-null, render the existing `ErrorMessage` (from `@/components/common/ErrorMessage`) **in place of** the `EmployeeTable` + pagination controls — keep `EmployeeFilterBar` mounted so the admin can retry by changing the filter/page-size. Import `ErrorMessage` at the top of the file. See the error-state render decision in Implementation Architecture §9 and the hook error lifecycle in §5.

### Phase 5: Router + Sidebar + Header Wiring
- [x] **Step 5.1:** Update `src/router.tsx` — add `<Route path="/employees" element={<EmployeesPage />} />` inside admin-only `RoleGuard` group; add `EmployeesPage` import
- [x] **Step 5.2:** Update `src/layouts/Sidebar.tsx` — add `Users` to lucide import, add "Employees" menu item with `roles: [UserRole.ADMIN]` between Dashboard and Conversations
- [x] **Step 5.3:** Update `src/layouts/Header.tsx` — add `case "/employees": return "Employees"` before `default` in `getPageTitle()`
- [x] **Step 5.4:** Run `npm run typecheck` + `npm run test` + `npm run build` — confirm 0 errors, all prior tests pass, build succeeds

---

## Potential Issues / Risks

- **shadcn/ui Select with `@base-ui/react`**: This project uses shadcn 4.x with `@base-ui/react` instead of Radix, per [[ADRs/ADR-010-base-ui-over-radix-ui-for-frontend]]. The CLI-installed `select.tsx` should use base-ui internally. **Base UI's `Select.Root` is generic over `Value` and `onValueChange` yields the typed `Value` — not a forced string** (Radix yields strings). The typed-`Value` design (see Implementation Architecture §8) relies on this; verify in Step 1.2a. Check Base UI docs (never Radix docs) when working with primitives directly. Verify the component renders correctly in the dev server after install before building on top of it.
- **Tooltip component**: `src/components/ui/tooltip.tsx` is already installed. Use it for the action button tooltips — no additional install needed. **`TooltipProvider` is OPTIONAL** (per [[ADRs/ADR-010-base-ui-over-radix-ui-for-frontend]] + current Base UI docs): Base UI's `Tooltip.Provider` only provides shared-delay/grouped-hover behavior (`FloatingDelayGroup`); `Tooltip.Root` renders standalone via each `Tooltip.Trigger`'s own `delay`/`closeDelay`. No `TooltipProvider` ancestor is needed for `EmployeeTable`'s action-button tooltips to render — do **not** add a defensive provider (the running `sidebar.tsx` tooltips prove standalone rendering works). Add a `TooltipProvider` only if app-wide shared-delay polish for adjacent tooltips is explicitly desired later.
- **`useEmployeeList` debounce + React StrictMode**: In development, `useEffect` runs twice in StrictMode. The debounce timer must be created inside `useEffect` and cleared in its cleanup function to avoid double-fetch on mount.
- **`PageableRequest` `filters` array when no filter is active**: When `filterField` is null or filter value is below threshold, send `filters: []` — not a missing `filters` key, since the backend expects the key to be present per the shared schema.
- **`totalPages = 0` on empty list**: The backend may return `totalPages: 0` when there are no results. The "Page 1 of 0" label is visually confusing — use `Math.max(totalPages, 1)` in the page label only; do NOT pass a fake value to the API.
- **CORS PATCH fix required for future activation wiring**: The edit/delete buttons are placeholders. When eventually wired to `PATCH /employee/{id}/activate` or `PATCH /employee/{id}/deactivate`, the backend `SecurityConfig.corsConfigurationSource()` must add `"PATCH"` to `allowedMethods`. See `documentation/Docs/API-Reference/Employee.md`.

---

## Testing Decisions

**What makes a good test here:** Tests verify behavior through the public interface only — what a caller observes. For `employeeService`: does the correct POST body reach the backend and does the response come back typed correctly? For `useEmployeeList`: does the hook produce the right state transitions in response to method calls? Tests must survive internal refactors.

**Modules with TDD:**

| Module | Test file | What is tested |
|--------|-----------|----------------|
| `employeeService` | `src/features/employees/services/employeeService.test.ts` | POST body matches PageableRequest; response data is returned; uses axios-mock-adapter |
| `useEmployeeList` | `src/features/employees/hooks/useEmployeeList.test.ts` | Initial fetch with defaults; page change; page size change + reset; string filter < 3 chars = no fetch; string filter ≥ 3 chars = CONTAINS fetch (debounced); boolean filter = immediate EQUALS fetch — **discriminating `enabled = false` (Inactive) case asserts predicate is exactly `filters: [{ field: "enabled", operations: [{ operator: "EQUALS", value: false }] }]`, NOT empty** (Finding-4: guard with `filterValue !== null`, never a truthy check); filter field change = value clear + page reset; **failed fetch sets `error`, successful fetch clears `error` to `null`** |

**Test harness (fake timers) — `useEmployeeList` debounce tests (per [[Review-Admin-Employee-Management-Page]] Finding-5):** Two of the `useEmployeeList` behavior tests exercise the §5 500ms debounce ("string filter < 3 chars = no fetch", "string filter ≥ 3 chars = CONTAINS fetch (debounced)"). The listed prior-art files (`useLoginForm.test.ts`, `authSession.test.ts`) do **not** use fake timers — copy their `renderHook` + `act` + `vi.mock` patterns, but add the timer setup below for the debounce tests so the suite stays fast and deterministic (no real 500ms waits, no flaky asserts-before-debounce-fires):

```typescript
beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks() // keep the established prior-art cleanup
})
afterEach(() => {
  vi.useRealTimers()
})

// Debounce test — the timer fires a mocked listEmployees fetch (async work),
// so advance with the ASYNC variant inside act() to flush the fetch promise chain:
await act(async () => {
  result.current.onFilterValueChange("joh")
  await vi.advanceTimersByTimeAsync(500)
})
expect(mockListEmployees).toHaveBeenCalledWith(
  expect.objectContaining({
    filters: [{ field: "username", operations: [{ operator: "CONTAINS", value: "joh" }] }],
  })
)
```

- The non-debounce tests (initial load, page change, boolean EQUALS, error lifecycle) still assert correctly under fake timers — awaited mocked promises resolve normally (fake timers mock `setTimeout`/`Date`, not microtasks).
- Avoid `vi.useFakeTimers({ shouldAdvanceTime: true })` — it advances by a real interval and reintroduces the slowness/flakiness fake timers were meant to remove.
- Do **not** add a fake-timer row to the "Modules with TDD" table above — its columns are `Module | Test file | What is tested` and a "Timer setup" row would not fit.
- Optionally export `DEBOUNCE_MS = 500` from `useEmployeeList.ts` so the test imports it instead of hardcoding `500` (advisable to avoid magic-number drift; not required — do not widen the hook's surface if it adds friction).

**Modules without tests (structural):**
- `types.ts` — pure type declarations, no runtime logic
- `EmployeeTable.tsx` — no logic; props-driven display only; verified by typecheck + build + manual
- `EmployeeFilterBar.tsx` — no logic; data-driven display only; verified by typecheck + build + manual
- `EmployeesPage.tsx` — thin composition layer with view-layer render conditions only (the Prev/Next `disabled` guards derived from `currentPage`/`totalPages`/`isLoading`, the `Math.max(totalPages, 1)` page-label guard against the documented `totalPages = 0` case, the `{totalElements !== 1 ? "s" : ""}` pluralization, and the Finding-3 `error ? <ErrorMessage /> : <>...</>` error-branch ternary), all evaluated over `useEmployeeList` state; no data fetching, transformation, or business rules (all owned by the hook); verified by typecheck + build + manual
- `router.tsx`, `Sidebar.tsx`, `Header.tsx` — wiring changes; verified by typecheck + build + manual

**Prior art:**
- `src/lib/api.test.ts` — axios-mock-adapter pattern for testing service calls
- `src/features/authentication/hooks/useLoginForm.test.ts` — `renderHook` + `act` + `vi.mock` pattern for hooks
- `src/services/authSession.test.ts` — localStorage-backed state testing pattern

---

## Task Breakdown

### Task 1: Install shadcn/ui table + select
- **Steps Covered:** Steps 1.1, 1.2
- **Reason for Grouping:** Both are CLI installs with no logic — fast, low risk, prerequisite for all UI components. Grouped together as a single setup task.
- **Planned Task File:** `Admin-Employee-Management-Page-task-1-shadcn-table-select.md`
- **Task Document Link:** [[Admin-Employee-Management-Page-task-1-shadcn-table-select]]

### Task 2: Employee types + service (TDD)
- **Dependencies:** [Task 1]
- **Steps Covered:** Steps 2.1, 2.2
- **Reason for Grouping:** Types must exist before the service; the service test and implementation are a single TDD cycle. Low complexity, logically atomic.
- **Planned Task File:** `Admin-Employee-Management-Page-task-2-types-and-service.md`
- **Task Document Link:** [[Admin-Employee-Management-Page-task-2-types-and-service]]

### Task 3: useEmployeeList hook + index (TDD)
- **Dependencies:** [Task 2]
- **Steps Covered:** Steps 3.1, 3.2
- **Reason for Grouping:** The hook is the most complex module — 9 behavior tests covering debounce, CONTAINS/EQUALS logic, page reset, filter-value clearing, and the error lifecycle (error set on failed fetch, cleared before/at each new fetch). The `index.ts` re-export is trivial and naturally grouped with the hook it exposes.
- **Planned Task File:** `Admin-Employee-Management-Page-task-3-use-employee-list-hook.md`
- **Task Document Link:** [[Admin-Employee-Management-Page-task-3-use-employee-list-hook]]

### Task 4: UI components + page
- **Dependencies:** [Task 1, Task 2, Task 3]
- **Steps Covered:** Steps 4.1, 4.2, 4.3
- **Reason for Grouping:** All three are structural modules (no logic, no tests). They build on top of the installed shadcn components and the hook from Tasks 1–3. Execution is straightforward once dependencies exist.
- **Planned Task File:** `Admin-Employee-Management-Page-task-4-ui-components-and-page.md`
- **Task Document Link:** [[Admin-Employee-Management-Page-task-4-ui-components-and-page]]

### Task 5: Wiring + regression
- **Dependencies:** [Task 4]
- **Steps Covered:** Steps 5.1, 5.2, 5.3, 5.4
- **Reason for Grouping:** All three wiring changes are small surgical edits that should be executed and validated together. The final regression (typecheck + test + build) closes out the feature.
- **Planned Task File:** `Admin-Employee-Management-Page-task-5-wiring-and-regression.md`
- **Task Document Link:** [[Admin-Employee-Management-Page-task-5-wiring-and-regression]]
