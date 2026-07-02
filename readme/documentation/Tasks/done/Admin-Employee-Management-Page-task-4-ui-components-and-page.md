# Task: UI Components + EmployeesPage Composition Layer

#task #current #high-complexity #parent-admin-employee-management-page

**Parent:** [[Admin-Employee-Management-Page]]
**Parent Type:** Feature
**Related Step(s):** Phase 4 — Steps 4.1, 4.2, 4.3
**Estimated Complexity:** High

---

## Goal

Create `EmployeeTable`, `EmployeeFilterBar`, and `EmployeesPage` — the three structural modules that compose `useEmployeeList`'s state into a visible, interactive employee management UI. No business logic lives here; all rules are owned by the hook from Task 3.

---

## Parent Context

The Admin Employee Management Page feature (parent [[Admin-Employee-Management-Page]]) adds a paginated, filterable employee list for admin users. Task 4 is the composition layer that converts `useEmployeeList`'s interface into JSX.

### Role of each module

| Module | SRP responsibility |
|--------|-------------------|
| `EmployeeTable` | Render the employee rows from `employees[]`, apply status badges, show action button placeholders, display a loading overlay when `isLoading` is true |
| `EmployeeFilterBar` | Render the filter field `<Select>`, the dynamic value input (text `<Input>` or boolean `<Select>`), and the page-size `<Select>` |
| `EmployeesPage` | Thin composition: call `useEmployeeList()`, wire its return values to the two components above, render pagination controls and the error-state branch |

### Critical constraints from the parent

**No business logic in these modules.** The parent's §9 states the page may only contain view-layer render conditions: `Prev/Next disabled` guards, `Math.max(totalPages, 1)` page-label guard, `{totalElements !== 1 ? "s" : ""}` pluralization, and the `error ? <ErrorMessage /> : <>...</>` branch ternary. Everything else is owned by `useEmployeeList`.

**Typed Base UI Select (ADR-010 + Step 1.2a verification):** Base UI's `Select.Root` is generic over `Value`; `onValueChange` yields the typed primitive placed on `<Select.Item value>`. Task 1 Step 1.2a verified that `select.tsx` forwards this generic via direct re-export (`const Select = SelectPrimitive.Root`). `EmployeeFilterBar` relies on this: declare `<Select<number>>` for page size and `<Select<boolean | null>>` for the enabled filter — pass typed primitives directly to hook callbacks with no `parseInt` / `=== "true"` coercion.

**`filterValue !== null` guard (Finding-4):** When the `enabled` field is selected and the value is `false` (Inactive), `filterValue` is `false` — which is falsy. The hook already handles the predicate guard correctly. `EmployeeFilterBar` must call `onFilterValueChange(false)` with the raw boolean — not coerce it to a string.

**`onFilterValueChange(null)` ≠ `onFilterFieldChange(null)` (Finding from parent §5):**
- `onFilterValueChange(null)` — "All" option in the `enabled` dropdown; **keeps `filterField`**; clears only the predicate
- `onFilterFieldChange(null)` — "No filter" option in the field dropdown; clears both `filterField` and `filterValue`
`EmployeeFilterBar` must call the correct handler for each control.

**Error-state render (Finding-3):** When `error` is non-null, `EmployeesPage` replaces the table + pagination area with `<ErrorMessage />` — not above the table. Keep `EmployeeFilterBar` mounted so the admin can trigger a retry.

**Loading overlay:** The overlay is a `<div className="absolute inset-0 overflow-hidden bg-background/60 backdrop-blur-[1px] flex items-center justify-center z-10">` wrapping `<LoadingSpinner />`, positioned inside a `relative` wrapper div that also contains the `<Table>`. The `overflow-hidden` clips `LoadingSpinner`'s `min-h-100` content to the overlay boundary. The overlay only mounts when `isLoading` is true.

---

## Preconditions / Dependencies

- **Task 1 complete:** `src/components/ui/table.tsx` and `src/components/ui/select.tsx` exist and typecheck. `select.tsx` generic `Value` forwarding verified in Step 1.2a.
- **Task 2 complete:** `src/features/employees/types.ts` (`EmployeeListDTO`, `FilterField`, `FilterFieldMeta`, `FILTER_FIELDS`, `PageableRequest`, `PageEnvelope<T>`) and `src/features/employees/services/employeeService.ts` exist.
- **Task 3 complete:** `src/features/employees/hooks/useEmployeeList.ts` (deep module, 10 TDD tests — 59/59 pass), `src/features/employees/index.ts` (public API: `useEmployeeList`, `EmployeeListDTO`, `FilterField`, `PageEnvelope`) exist. 59/59 tests pass, 0 typecheck errors, build success.
- `src/components/common/LoadingSpinner.tsx` — exists; renders a centered spinner with `min-h-100` (content-area-replacement size).
- `src/components/common/ErrorMessage.tsx` — exists; renders a centered destructive panel with `min-h-100`.
- `src/components/ui/tooltip.tsx` — exists; `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` exported. Standalone rendering (no `TooltipProvider` needed per ADR-010).
- `src/components/ui/input.tsx` — exists; `<Input>` from `@base-ui/react/input`.
- `src/components/ui/button.tsx` — exists; `<Button variant="outline" size="sm">` available.
- `lucide-react ^1.21.0` — `Pencil`, `Trash2`, `Users` icons available.
- TypeScript 5.9.3 with `verbatimModuleSyntax: true` and `erasableSyntaxOnly: true` — `import type` required for type-only imports.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — Selected — document structure and placement
- `solid-deep-design` — Selected — depth analysis for the three new modules; deletion test applied
- `find-docs` — Selected — Base UI Tooltip `render` prop pattern; Base UI Select generic Value
- `tdd` — Selected (context only) — no new tests in this task; modules verified by typecheck + build + manual
- `memory-bank` — Selected — project context, Tailwind v4, ADR-010, lucide-react version
- `glossary-management` — Selected — domain terms (Employee, Admin, Filter, Pagination)

### Documentation Reviewed

- **Base UI `@base-ui/react` 1.4.1 — Tooltip.Trigger:** `Tooltip.Trigger` accepts a `render` prop to override the rendered element. Use `render={<button type="button" ... />}` to render a styled `<button>` as the tooltip anchor. This prevents nested-button issues (the default `Tooltip.Trigger` wraps its children; if children include a `<button>`, nesting would occur without the `render` prop).
- **Base UI `@base-ui/react` 1.4.1 — Select:** `Select.Root` is generic over `Value`. `onValueChange` yields the typed `Value` from the clicked `<Select.Item value>`. `Select.Value` shows the selected item text; renders the `placeholder` prop when `value` is null/undefined and no matching item exists with that value.
- **Task 1 Step 1.2a finding:** `const Select = SelectPrimitive.Root` direct re-export forwards Base UI's generic `Value`. `<Select<number>>`, `<Select<boolean | null>>` with typed `<SelectItem value={5/false/null}>` typechecks. No coercion needed.
- **ADR-010 (`documentation/ADRs/ADR-010-base-ui-over-radix-ui-for-frontend.md`):** Base UI over Radix. `TooltipProvider` is optional — `Tooltip.Root` renders standalone via its own `delay`/`closeDelay`. Do not add a defensive `TooltipProvider`.

### Related Existing Code

- `src/features/employees/hooks/useEmployeeList.ts` — the hook these components wire to; interface: 4 callbacks + 8 data properties
- `src/features/employees/types.ts` — `EmployeeListDTO`, `FilterField`, `FilterFieldMeta`, `FILTER_FIELDS` (`{ value, label, type }[]`)
- `src/features/employees/index.ts` — `useEmployeeList` + type re-exports (public API path for `EmployeesPage`)
- `src/components/ui/table.tsx` — `Table`, `TableHeader`, `TableBody`, `TableHead`, `TableRow`, `TableCell` (note: `Table` already wraps in `<div className="relative w-full overflow-x-auto">`)
- `src/components/ui/select.tsx` — `Select` (= `SelectPrimitive.Root`, generic over `Value`), `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`
- `src/components/ui/tooltip.tsx` — `Tooltip`, `TooltipTrigger`, `TooltipContent`
- `src/components/ui/input.tsx` — `Input` from `@base-ui/react/input`
- `src/components/ui/button.tsx` — `Button` with `variant="outline"` and `size="sm"`
- `src/components/common/LoadingSpinner.tsx` — spinner with `min-h-100` (content-area-replacement)
- `src/components/common/ErrorMessage.tsx` — error panel with `min-h-100` (content-area-replacement)
- `src/pages/DashboardPage.tsx` — prior art: page layout `flex flex-col gap-6`, `<h1 className="text-3xl font-bold">`, `<p className="text-muted-foreground">`

---

## Implementation Details

### Approach

All three modules are structural (no business logic, no tests). Execution order:
1. **Step 4.1** — `EmployeeTable` (depends on: shadcn Table, Tooltip, lucide icons, LoadingSpinner)
2. **Step 4.2** — `EmployeeFilterBar` (depends on: shadcn Select, Input, types from feature)
3. **Step 4.3** — `EmployeesPage` (depends on: Steps 4.1 + 4.2 components + hook + ErrorMessage + Button)

### SOLID + Deep Module Analysis

**`EmployeeTable`** — Deep UI module. SRP: one reason to change — how employee rows are displayed, what columns appear, and how loading state is overlaid. Interface: 2 props (`employees`, `isLoading`). Implementation: column definitions, status badge classes, Tooltip+action button structure, overlay positioning, empty-state row. Deletion test: without it, all Tailwind table structure and loading overlay logic would scatter into `EmployeesPage`. Verdict: **DEEP**.

**`EmployeeFilterBar`** — Deep UI module. SRP: one reason to change — how the filter controls are rendered and what input type is shown per filter field. Interface: 6 props (field, value, pageSize + 3 callbacks). Implementation: field-type dispatch logic (`meta.type === "boolean"`), typed Select generics, controlled Input binding, layout. Deletion test: without it, all filter control rendering and field-type dispatch would accumulate in `EmployeesPage`. Verdict: **DEEP**.

**`EmployeesPage`** — Shallow by design. SRP: composition — wire `useEmployeeList` to two deep components + pagination controls. It should remain thin (< 70 lines of JSX). Deletion test: without it, callers would need to know about `useEmployeeList` + both sub-components + layout. It earns its keep as a composition boundary, not a depth module.

### Files to Create/Modify

- [x] `src/features/employees/components/EmployeeTable.tsx` — **new** — table with status badges, action button placeholders, and loading overlay
- [x] `src/features/employees/components/EmployeeFilterBar.tsx` — **new** — filter field selector, dynamic value input, page size selector
- [x] `src/pages/EmployeesPage.tsx` — **new** — thin composition layer: `useEmployeeList` + `EmployeeFilterBar` + `EmployeeTable` + pagination controls + error branch

---

## Step-by-Step Implementation

### Step 4.1: Create `src/features/employees/components/EmployeeTable.tsx`

**Goal:** Render the employee data table with columns, status badges, placeholder action buttons with tooltips, and a loading overlay over the table body when `isLoading` is true.
**Dependencies:** Tasks 1–3 complete. `table.tsx`, `tooltip.tsx`, `LoadingSpinner.tsx` exist.

- [x] Create `src/features/employees/components/` directory
- [x] Create `src/features/employees/components/EmployeeTable.tsx` with the content below
- [x] Run `npm --prefix project/srcs/frontend run typecheck` — confirm 0 errors

**Why this step is critical:** The table is the primary data display surface. Getting the overlay positioning correct (`relative` wrapper + `absolute inset-0` overlay) is required so the admin sees a loading indicator without layout shift.

#### Implementation

```tsx
// src/features/employees/components/EmployeeTable.tsx

import { Pencil, Trash2 } from "lucide-react"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import type { EmployeeListDTO } from "../types"

interface EmployeeTableProps {
  employees: EmployeeListDTO[]
  isLoading: boolean
}

export function EmployeeTable({ employees, isLoading }: EmployeeTableProps) {
  return (
    <div className="relative">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Username</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>First Name</TableHead>
            <TableHead>Last Name</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.length === 0 && !isLoading && (
            <TableRow>
              <TableCell
                colSpan={6}
                className="py-8 text-center text-muted-foreground"
              >
                No employees found.
              </TableCell>
            </TableRow>
          )}
          {employees.map((employee) => (
            <TableRow key={employee.id}>
              <TableCell className="font-medium">{employee.username}</TableCell>
              <TableCell>{employee.email}</TableCell>
              <TableCell>
                <span
                  className={
                    employee.enabled
                      ? "inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }
                >
                  {employee.enabled ? "Active" : "Inactive"}
                </span>
              </TableCell>
              <TableCell>{employee.firstName ?? "—"}</TableCell>
              <TableCell>{employee.lastName ?? "—"}</TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                          onClick={undefined}
                          aria-label="Edit employee"
                        />
                      }
                    >
                      <Pencil className="size-4" />
                    </TooltipTrigger>
                    <TooltipContent>Edit employee (coming soon)</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
                          onClick={undefined}
                          aria-label="Delete employee"
                        />
                      }
                    >
                      <Trash2 className="size-4" />
                    </TooltipTrigger>
                    <TooltipContent>Delete employee (coming soon)</TooltipContent>
                  </Tooltip>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* <!-- REVIEW-FIX: Added overflow-hidden to prevent LoadingSpinner's min-h-100 (400px) from visually extending beyond the overlay boundary when the table has few rows. --> */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden bg-background/60 backdrop-blur-[1px]">
          <LoadingSpinner />
        </div>
      )}
    </div>
  )
}
```

#### Edge Cases

1. **`employees` is empty and `isLoading` is true simultaneously:** The empty-state row is hidden (`!isLoading` guard) so the overlay is the only visible feedback. Correct behavior — showing "No employees found" while loading would be misleading.

2. **`LoadingSpinner` has `min-h-100` (25rem / 400px):** The overlay has `overflow-hidden` which clips the spinner's content to the overlay boundary. When the table is short (< 400px), the spinner icon is centered and fully visible; the "Loading data…" text may be clipped but the primary loading signal (spin icon + blur backdrop) remains correct. `overflow-hidden` was applied as a review fix — see the comment in the implementation above.

3. **`employees.firstName` / `employees.lastName` are nullable:** Render `"—"` (em dash) as a fallback. The backend schema defines these fields as `string | null`.

4. **Action buttons have `onClick={undefined}`:** These are placeholders. Browsers treat `undefined` onClick as no handler — the button is clickable but nothing happens. The tooltip explains "coming soon". When wiring is added, the CORS PATCH fix must be applied first (see parent Risk Assessment).

5. **`Table` component wraps in its own `relative` div:** The `table.tsx` `Table` function renders `<div className="relative w-full overflow-x-auto">` wrapping the `<table>`. Our outer `<div className="relative">` is the positioning context for the overlay. The inner `relative` from `Table` does not interfere because the overlay is a sibling of `<Table>`, not a child of the table container.

---

### Step 4.2: Create `src/features/employees/components/EmployeeFilterBar.tsx`

**Goal:** Render the filter control bar: a field selector on the left, a dynamic value input in the middle (text or boolean dropdown depending on field type), and a page-size selector on the right.
**Dependencies:** Step 4.1 complete. `select.tsx` (generic Value verified), `input.tsx`, `types.ts` (`FILTER_FIELDS`, `FilterFieldMeta`) exist.

- [x] Create `src/features/employees/components/EmployeeFilterBar.tsx` with the content below
- [x] Run `npm --prefix project/srcs/frontend run typecheck` — confirm 0 errors
- [x] Verify `<Select<FilterField | null>>`, `<Select<boolean | null>>`, `<Select<number>>` with typed item values typecheck correctly. Explicit casts applied preemptively for null item values (`value={null as FilterField | null}`, `value={null as boolean | null}`) per Edge Case 3. Build caught additional issue: `<Select<number>>` `onValueChange` yields `number | null` — null guard added (`if (size !== null)`). See Post-Review Notes.

**Why this step is critical:** This is the most type-complex component in the feature. The typed `Select<Value>` generics must flow correctly from item values through `onValueChange` to hook callbacks — with no coercion. The `enabled = false` (Inactive) case is the discriminating scenario: the `boolean | null` Select's `onValueChange` must yield the native `false` primitive, which is then passed directly to `onFilterValueChange(false)` (not `"false"` string).

#### Implementation

```tsx
// src/features/employees/components/EmployeeFilterBar.tsx

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import type { FilterField } from "../types"
import { FILTER_FIELDS } from "../types"

interface EmployeeFilterBarProps {
  filterField: FilterField | null
  filterValue: string | boolean | null
  pageSize: number
  onFilterFieldChange: (field: FilterField | null) => void
  onFilterValueChange: (value: string | boolean | null) => void
  onPageSizeChange: (size: number) => void
}

export function EmployeeFilterBar({
  filterField,
  filterValue,
  pageSize,
  onFilterFieldChange,
  onFilterValueChange,
  onPageSizeChange,
}: EmployeeFilterBarProps) {
  const activeMeta = FILTER_FIELDS.find((f) => f.value === filterField)

  function renderValueInput() {
    if (filterField === null) return null

    if (activeMeta?.type === "boolean") {
      // Typed Select<boolean | null>: onValueChange yields the typed primitive directly —
      // no "=== 'true'" coercion needed. null = "All" (keeps filterField, clears predicate).
      return (
        <Select<boolean | null>
          value={filterValue as boolean | null}
          onValueChange={(v) => onFilterValueChange(v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All</SelectItem>
            <SelectItem value={true}>Active</SelectItem>
            <SelectItem value={false}>Inactive</SelectItem>
          </SelectContent>
        </Select>
      )
    }

    // String field: controlled input; 3-char threshold is enforced in the hook
    return (
      <Input
        type="text"
        placeholder="Type to filter..."
        value={typeof filterValue === "string" ? filterValue : ""}
        onChange={(e) => onFilterValueChange(e.target.value)}
        className="w-48"
      />
    )
  }

  return (
    <div className="flex items-center gap-3">
      {/* Filter field selector */}
      <Select<FilterField | null>
        value={filterField}
        onValueChange={(field) => onFilterFieldChange(field)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a field…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={null}>No filter</SelectItem>
          {FILTER_FIELDS.map((f) => (
            <SelectItem key={f.value} value={f.value}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Dynamic value input — only shown when a field is selected */}
      {renderValueInput()}

      {/* Page size selector — ml-auto pushes it to the right */}
      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Rows per page</span>
        <Select<number>
          value={pageSize}
          onValueChange={(size) => onPageSizeChange(size)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={5}>5</SelectItem>
            <SelectItem value={10}>10</SelectItem>
            <SelectItem value={25}>25</SelectItem>
            <SelectItem value={50}>50</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
```

#### Edge Cases

1. **`onFilterValueChange(null)` vs `onFilterFieldChange(null)` distinction:** The boolean filter's `null` item ("All") calls `onFilterValueChange(null)` — which in the hook keeps `filterField` as "enabled" and clears the predicate. The field selector's `null` item ("No filter") calls `onFilterFieldChange(null)` — which clears both field and value. The two controls call different handlers. This invariant must not be changed.

2. **`filterValue as boolean | null` cast:** When `filterField === "enabled"`, `filterValue` from the hook is always `boolean | null` (the hook clears it to `null` on field change). The `as` cast is safe because the hook's `onFilterFieldChange` always resets `filterValue` to `null` before the component re-renders with the new field. If `filterValue` were ever a string when `filterField === "enabled"`, the boolean Select would receive an invalid value — not a runtime error, but a visual mismatch.

3. **`<SelectItem value={null}>` TypeScript behavior:** If `SelectPrimitive.Item.Props` doesn't accept `null` as `value` for `FilterField | null`, add an explicit cast: `value={null as FilterField | null}`. Same for the boolean null item: `value={null as boolean | null}`. Document any cast added as a finding.

4. **`Input` value when `filterValue` is `null`:** When the user switches from the `enabled` field to a string field, the hook sets `filterValue = null`. The Input renders `value=""` (empty string). No stale value is shown.

5. **`Input` value when `filterValue` is a partial string (< 3 chars):** The hook allows `filterValue` to be `"a"` or `"ab"` (it stores the value but doesn't fetch). The Input shows the partial value correctly — the threshold logic lives in the hook, not here.

6. **`Select<FilterField | null>` shows "No filter" when `filterField` is null:** Since `<SelectItem value={null}>No filter</SelectItem>` is the first item and matches the initial `value={null}`, the Select displays "No filter" — not the placeholder. The placeholder ("Select a field…") is a fallback for when value doesn't match any item and is `null`/`undefined`. Both states are fine UX.

---

### Step 4.3: Create `src/pages/EmployeesPage.tsx`

**Goal:** Thin composition layer — call `useEmployeeList()` and wire its return values to `EmployeeFilterBar`, `EmployeeTable`, pagination controls, and the error branch.
**Dependencies:** Steps 4.1 and 4.2 complete. `useEmployeeList`, `ErrorMessage`, `Button` exist.

- [x] Create `src/pages/EmployeesPage.tsx` with the content below
- [x] Run `npm --prefix project/srcs/frontend run typecheck` — confirm 0 errors
- [x] Run `npm --prefix project/srcs/frontend run test` — confirm still 59/59 (no regressions; `EmployeesPage` adds no runtime logic to test)
- [x] Run `npm --prefix project/srcs/frontend run build` — confirm build succeeds

**Why this step is critical:** This is the composition glue. The error-branch ternary (`error ? <ErrorMessage /> : <>table + pagination</>`) must correctly replace the table area — not sit above it — because `ErrorMessage` uses `min-h-100` as a content-area-replacement panel. `EmployeeFilterBar` stays mounted during the error state so the admin can retry.

#### Implementation

```tsx
// src/pages/EmployeesPage.tsx

import { useEmployeeList } from "@/features/employees"
import { EmployeeTable } from "@/features/employees/components/EmployeeTable"
import { EmployeeFilterBar } from "@/features/employees/components/EmployeeFilterBar"
import { ErrorMessage } from "@/components/common/ErrorMessage"
import { Button } from "@/components/ui/button"

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
  } = useEmployeeList()

  return (
    <div className="flex flex-col gap-6">
      {/* Page heading */}
      <div>
        <h1 className="text-3xl font-bold">Employees</h1>
        <p className="text-muted-foreground">Manage employee accounts.</p>
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
          <EmployeeTable employees={employees} isLoading={isLoading} />

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
    </div>
  )
}
```

#### Edge Cases

1. **`totalPages = 0` when list is empty:** `Math.max(totalPages, 1)` prevents "Page 1 of 0" label. The Next button is also disabled (`currentPage >= totalPages - 1` → `0 >= -1` → true). Correct.

2. **`error` non-null while `employees` has stale data:** When a retry fails after a successful fetch, `error` is set but `employees` still holds the last successful data. The error branch replaces the table entirely, so stale data is not shown alongside the error panel. Correct per parent §9.

3. **`isLoading` and `error` simultaneously:** The hook sets `error = null` at the start of every fetch (`setError(null)` before `await listEmployees(...)`). So during an in-flight request, `error` is always `null`. The `isLoading && error` state is not possible. The render branches are mutually exclusive in practice.

4. **Prev/Next button `disabled` when `isLoading`:** Prevents double-click during in-flight request. The hook's `onPageChange` would otherwise call `fetchEmployees` concurrently.

5. **`totalElements !== 1 ? "s" : ""` pluralization:** Handles "1 employee" vs "2 employees" correctly. Edge case: 0 employees renders "0 employees" — correct.

---

## Design Decisions

**Decision 1: `EmployeeTable` and `EmployeeFilterBar` imported directly by `EmployeesPage` (not via `index.ts`)**
- **Why:** The feature's forbidden-deep-import rule covers only `services/` and `hooks/` paths. `components/` is not restricted. `EmployeesPage` is the sole consumer of these two components; adding them to `index.ts` would widen the public API surface with no second consumer to justify the seam (deletion test: a single-caller export is a hypothetical seam). Direct import from the component path is the correct approach.
- **Alternatives considered:** Re-export from `index.ts` — creates a public API for feature-internal view components before a second consumer exists; rejected per SOLID deep-design seam discipline.

**Decision 2: `renderValueInput()` helper function inside `EmployeeFilterBar`**
- **Why:** The boolean/string field-type dispatch requires two JSX branches (a `Select<boolean | null>` vs an `Input`). Extracting to a helper avoids deeply nested ternaries in the JSX while keeping the logic local to the component. The helper is not extracted to its own component because it has no independent lifecycle, props, or re-render concerns.
- **Alternatives considered:** Inline ternary in JSX — unreadable with two full JSX subtrees; separate `FieldValueInput` component — premature extraction with one call site; `activeMeta?.type === "boolean" && ...` + `activeMeta?.type !== "boolean" && ...` pattern — verbose and error-prone.

**Decision 3: Loading overlay is a sibling of `<Table>`, not inside `<TableBody>`**
- **Why:** The `Table` component in `table.tsx` wraps in its own `relative` div (the `table-container`), making it a potential overlay positioning context — but the overlay is a sibling of `Table`, not a child of `table-container`. The outer `<div className="relative">` in `EmployeeTable` is the explicit positioning context. This ensures the overlay covers the full table (headers + body), not just the scrollable area within `table-container`.
- **Alternatives considered:** Nesting the overlay inside `<TableBody>` — not possible without forking the `Table` shadcn primitive; positioning relative to `table-container` via the `Table` component's internal `relative` div — would require `table.tsx` changes outside this task's scope.

**Decision 4: `<SelectItem value={null}>No filter</SelectItem>` as explicit reset option**
- **Why:** User Story 11 requires the admin to be able to clear the filter by selecting a dropdown item. A placeholder-only null state cannot be selected once a field is chosen (the user would have no way to return to null). The "No filter" item is the only mechanism that satisfies US11. When selected, it yields `null` via `onValueChange`, which the field selector's `onFilterFieldChange(null)` handler passes to the hook.
- **Alternatives considered:** A separate "Clear" button adjacent to the filter — adds visual complexity; placeholder as click target — not possible in Base UI's controlled Select pattern.

**Decision 5: Empty state row rendered when `employees.length === 0 && !isLoading`**
- **Why:** Prevents the table from collapsing to just its header while loading (which would misposition the overlay). When loading is in progress, the empty-state row is hidden — the overlay provides feedback. When loading completes with no results, the empty-state row appears.
- **Alternatives considered:** `EmptyState` component — `min-h-100` would collapse pagination area; always show empty row — conflicts with overlay (both visible during initial load with empty state).

---

## Testing Considerations

### Automatic Validation

- [x] `npm --prefix project/srcs/frontend run typecheck` after Step 4.1 — confirm 0 errors
- [x] `npm --prefix project/srcs/frontend run typecheck` after Step 4.2 — confirm 0 errors; confirm `<Select<FilterField | null>>`, `<Select<boolean | null>>`, `<Select<number>>` and their typed `<SelectItem value>` props typecheck without error. Explicit casts applied preemptively for null item values; build revealed `onValueChange` for `<Select<number>>` yields `number | null` — see Post-Review Notes.
- [x] `npm --prefix project/srcs/frontend run typecheck` after Step 4.3 — confirm 0 errors
- [x] `npm --prefix project/srcs/frontend run test` after Step 4.3 — confirm **59/59** passing (no regressions; these files add no runtime logic covered by existing tests)
- [x] `npm --prefix project/srcs/frontend run build` after Step 4.3 — confirm build succeeds

### Manual Validation

> **Manual validation required.** These are structural UI components — correctness is verified by running the dev server after Task 5 wires the route and sidebar. The following checks are intended for a human after completing Task 5.

- [x] Start the dev server (`npm --prefix project/srcs/frontend run dev`) and log in as an admin
- [x] Navigate to `/employees` — confirm the page title in the header reads "Employees" (after Task 5 wires Header.tsx)
- [x] <!-- REVIEW-FIX: Added initial-state check missing from original validation steps. --> Confirm initial page state: field selector shows "No filter", page size selector shows "10", and the employee table renders with the first page of results (no active filter applied)
- [x] Confirm the table renders with columns: Username, Email, Status, First Name, Last Name, Actions
- [x] Confirm Active employees show a green badge; Inactive employees show a red badge
- [x] Confirm the filter field selector shows "No filter", "Username", "Email", "First Name", "Last Name", "Status" as options
- [x] Select "Username" — confirm a text input appears; type 1–2 chars — confirm no fetch fires; type a 3rd char — confirm the list filters after 500ms
- [x] Select "Status" — confirm a boolean dropdown appears with "All", "Active", "Inactive"; select "Inactive" — confirm the list filters immediately
- [x] Select "All" in the Status dropdown — confirm the list resets to all employees and the Status field remains selected
- [x] Select "No filter" in the field dropdown — confirm both field and value are cleared, full list loads
- [x] Confirm the page size selector (5, 10, 25, 50) changes the page size immediately
- [x] Confirm "Previous" and "Next" buttons navigate pages; confirm "Previous" is disabled on page 1
- [x] Confirm the "Page X of Y" counter updates correctly; confirm it shows "Page 1 of 1" (not "Page 1 of 0") for a single-page result
- [x] Hover the edit icon — confirm tooltip reads "Edit employee (coming soon)"; hover delete — confirm "Delete employee (coming soon)"
- [x] While a fetch is in progress (slow network or backend restart), confirm the loading overlay appears over the table with a spinner
- [x] With the backend stopped, confirm the error panel replaces the table + pagination area; confirm the filter bar remains interactive; confirm changing a filter triggers a retry

---

## Related Code Explanations

- `src/features/employees/hooks/useEmployeeList.ts` — the hook these components wire to; all business rules live here
- `src/features/employees/types.ts` — `EmployeeListDTO`, `FilterField`, `FilterFieldMeta`, `FILTER_FIELDS`
- `src/features/employees/index.ts` — public API surface; `EmployeesPage` imports `useEmployeeList` from here
- `src/components/ui/select.tsx` — Base UI Select wrapper; `Select = SelectPrimitive.Root` (generic Value forwarded)
- `src/components/ui/table.tsx` — Table primitive; wraps in `<div className="relative w-full overflow-x-auto">`
- `src/components/ui/tooltip.tsx` — Tooltip primitive; `TooltipTrigger` accepts `render` prop for element override
- `src/components/common/LoadingSpinner.tsx` — content-area-replacement spinner (`min-h-100`); used inside overlay

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected for this task
- [x] Version-matched documentation reviewed (Base UI 1.4.1 Tooltip `render` prop, Select generic Value)
- [x] `src/features/employees/components/EmployeeTable.tsx` created
- [x] `src/features/employees/components/EmployeeFilterBar.tsx` created
- [x] `src/pages/EmployeesPage.tsx` created
- [x] `npm run typecheck` = 0 errors after each step
- [x] `<Select<FilterField | null>>`, `<Select<boolean | null>>`, `<Select<number>>` typecheck without error (null item casts applied preemptively; page size Select `onValueChange` null guard added — see Post-Review Notes)
- [x] `npm run test` = **59/59** passing after Step 4.3 (no regressions)
- [x] `npm run build` succeeds after Step 4.3
- [ ] Manual validation steps documented for the user (Task 5 must be complete first to wire the route and sidebar)
- [x] Parent feature Phase 4 steps (4.1, 4.2, 4.3) marked `[x]`
- [x] Parent feature Task 4 section updated with wiki link `[[Admin-Employee-Management-Page-task-4-ui-components-and-page]]`

---

## Post-Review Notes

### Build Error Fixed: Page Size Select `onValueChange` Null Guard

**Issue:** Base UI's `Select<number>.onValueChange` yields `number | null` (the type signature includes `null` for single-select mode when no item matches). `onPageSizeChange` expects `number` only. This caused `tsc -b` to fail with:

```
src/features/employees/components/EmployeeFilterBar.tsx(96,53): error TS2345: 
  Argument of type 'number | null' is not assignable to parameter of type 'number'.
```

**Fix:** Changed `onValueChange={(size) => onPageSizeChange(size)}` to `onValueChange={(size) => { if (size !== null) onPageSizeChange(size) }}`. At runtime, the page size Select's value is never null — it is initialized to `10` and all selectable items are non-null numbers (5, 10, 25, 50). The guard is a TypeScript-only satisfaction.

**Impact:** Single line change in `EmployeeFilterBar.tsx`. Build passes (8226 modules, 439.97 kB JS / 144.68 kB gzip). Typecheck 0 errors. Tests 59/59 (no regressions).

### Null Item Value Casts

`<SelectItem value={null}>` required explicit type assertions in both the field selector (`null as FilterField | null`) and the boolean value selector (`null as boolean | null`). These were applied preemptively per Edge Case 3 documentation. Without the casts, TypeScript infers `null` as type `null` (widened from the `Value` generic), which Base UI's `SelectItem` value prop rejects. The casts are safe — both `Select` components explicitly accept `null` in their union type parameter (`FilterField | null`, `boolean | null`).
