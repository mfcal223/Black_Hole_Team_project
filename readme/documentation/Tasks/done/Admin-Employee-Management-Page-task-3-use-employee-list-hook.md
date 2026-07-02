# Task: useEmployeeList Hook (TDD) + Feature Public API

#task #current #high-complexity #parent-admin-employee-management-page

**Parent:** [[Admin-Employee-Management-Page]]
**Parent Type:** Feature
**Related Step(s):** Phase 3 — Steps 3.1, 3.2
**Estimated Complexity:** High

---

## Goal

Implement `src/features/employees/hooks/useEmployeeList.ts` via a TDD RED → GREEN cycle — the central state-management module that owns all pagination, filtering, debounce, and error-lifecycle logic for the employee list. Then create `src/features/employees/index.ts` as the feature's public API surface.

---

## Parent Context

The Admin Employee Management Page (feature [[Admin-Employee-Management-Page]]) adds a paginated, filterable employee list for admin users. Task 3 covers **Phase 3 (useEmployeeList Hook + Index)**, the most complex task in the feature.

### Role of the hook in the feature

`useEmployeeList` is the brain of the employee page. It owns:
- All fetch state (`employees`, `totalPages`, `totalElements`, `currentPage`, `isLoading`, `error`)
- All filter state (`filterField`, `filterValue`, `pageSize`)
- All business rules (3-char debounce, CONTAINS vs EQUALS operator selection, page reset on filter change, filter-value clearing on field change, `filterValue !== null` guard, error lifecycle)

`EmployeesPage` (Task 4) is a thin composition layer that reads from this hook and renders UI components. `EmployeeFilterBar` and `EmployeeTable` (also Task 4) are pure display components fed by this hook's state. No business logic lives outside this hook.

### Why Task 3 comes before Task 4

Every UI component in Task 4 imports from `useEmployeeList` or from the `index.ts` public API created in Step 3.2. The hook and index must exist before any component can be built.

### Business rules implemented inside the hook (from parent §5)

| Trigger | Rule |
|---------|------|
| Mount | Fetch with `{ page: 0, size: 10, sort: [{ field: "username", direction: "ASC" }], filters: [] }` |
| `onFilterFieldChange(field)` | Clear `filterValue`, reset `currentPage` to 0, re-fetch with `filters: []` |
| `onFilterValueChange(null)` | **"All" case**: keep `filterField` as-is, clear `filterValue`, reset page to 0, cancel debounce, fetch with `filters: []` |
| `onFilterValueChange(string)` | Update value; if ≥ 3 chars: debounce 500ms then fetch CONTAINS; if < 3 chars: cancel debounce, do not fetch |
| `onFilterValueChange(boolean)` | Update value, fetch immediately with EQUALS operator |
| `onPageSizeChange(size)` | Reset `currentPage` to 0, fetch immediately |
| `onPageChange(page)` | Fetch with new page immediately |
| Every fetch start | `setError(null)` synchronously before `await listEmployees(...)` |
| Failed fetch | `setError(message)` — user-facing message |
| Successful fetch | `error` remains null; update `employees`, `totalPages`, `totalElements`, `currentPage` |
| Unmount / debounce cancel | `clearTimeout` on debounce timer |

### Critical guard: `filterValue !== null` (Finding-4)

When building the `filters` array for `POST /api/employee/list`, guard with **`if (field !== null && value !== null)`** — never a truthy check. `false` is the Inactive value for the enabled filter and is falsy; a truthy guard would silently drop it, causing the backend to return all employees instead of only inactive ones. The discriminating test for `enabled = false` enforces this.

### `onFilterValueChange(null)` ≠ `onFilterFieldChange(null)` (Finding from parent §5)

These are two different operations:
- `onFilterValueChange(null)` → "All" option selected in the enabled dropdown; **keep `filterField`** (still "enabled"), clear the predicate, fetch with `filters: []`
- `onFilterFieldChange(null)` → "No filter" selected in the field dropdown; clear both `filterField` and `filterValue`, fetch with `filters: []`

`EmployeeFilterBar` must call the correct handler for each control. The hook enforces the distinction internally.

---

## Preconditions / Dependencies

- **Task 1 complete:** `src/components/ui/table.tsx` and `src/components/ui/select.tsx` exist.
- **Task 2 complete:** `src/features/employees/types.ts` (6 exports: `EmployeeListDTO`, `FilterField`, `FilterFieldMeta`, `FILTER_FIELDS`, `PageableRequest`, `PageEnvelope<T>`) and `src/features/employees/services/employeeService.ts` (`listEmployees` function) exist. 49/49 tests, 0 typecheck errors, build success.
- `@testing-library/react` 16.3.2 is installed as a devDependency — `renderHook` and `act` are available.
- `vitest` 4.1.9 with `jsdom` environment and `@/` path alias in `vitest.config.ts`.
- TypeScript 5.9.3 with `verbatimModuleSyntax: true` and `erasableSyntaxOnly: true` — `import type` required for type-only imports; `enum` prohibited.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — Selected — document structure and placement
- `solid-deep-design` — Selected — depth analysis and deletion test for the hook module
- `find-docs` — Selected — vitest fake timer patterns (`vi.useFakeTimers`, `advanceTimersByTimeAsync`) and `renderHook` async patterns
- `tdd` — Selected — governs the RED → GREEN vertical slice cycle
- `memory-bank` — Selected — project architecture, patterns, and prior art
- `glossary-management` — Selected (glossary CLI unavailable in current session; domain terms derived from memory bank and feature doc)

### Documentation Reviewed

- **Context7 `/vitest-dev/vitest`** — Confirmed `vi.advanceTimersByTimeAsync(ms)` is the async variant that advances fake timers AND drains any promises arising from timer callbacks. Required for the debounce tests. `vi.useFakeTimers()` in `beforeEach` + `vi.useRealTimers()` in `afterEach` is the correct setup/teardown pattern.
- **Context7 `/testing-library/testing-library-docs`** — Confirmed `renderHook` from `@testing-library/react` 16.x; `result.current` holds the latest hook return value; `act()` wraps state-update calls; async act `await act(async () => { ... })` drains microtasks and promise chains.
- **Prior art: `src/features/authentication/hooks/useLoginForm.test.ts`** — Establishes the `vi.mock` + `vi.hoisted` + `renderHook` + `act` pattern for this project. For the hook under test, `listEmployees` is mocked in the same way as `login` is mocked there.
- **Prior art: `src/features/authentication/hooks/useLoginForm.ts`** — Shows the `useState` + async function + try/catch/finally pattern for loading state. The `useEmployeeList` hook follows the same error/loading lifecycle, extended with filter state and debounce.
- **ADR-010** — Base UI's `Select` is generic over `Value`; `onValueChange` yields typed primitives. Confirmed in Task 1 Step 1.2a: the shadcn `select.tsx` forwards Base UI's generic `Value` via direct re-export. This means `EmployeeFilterBar` (Task 4) can pass `false` and `null` as typed `Value` directly to `onFilterValueChange` without coercion — the hook's `string | boolean | null` callback types flow end-to-end.

### Related Existing Code

- `src/features/employees/types.ts` — all type declarations the hook imports
- `src/features/employees/services/employeeService.ts` — `listEmployees(request: PageableRequest): Promise<PageEnvelope<EmployeeListDTO>>` — the only function the hook calls for data
- `src/features/authentication/hooks/useLoginForm.ts` — prior art: useState + try/catch/finally + async submit pattern
- `src/features/authentication/hooks/useLoginForm.test.ts` — prior art: `renderHook` + `act` + `vi.mock` pattern
- `src/features/authentication/index.ts` — prior art for the `index.ts` re-export pattern

---

## Implementation Details

### Approach

**Step 3.1** is a TDD vertical slice:
1. **RED:** Write `useEmployeeList.test.ts` with all 9 behavior tests. Run tests — they fail because `./useEmployeeList` does not exist yet.
2. **GREEN:** Create `useEmployeeList.ts` with the full implementation. Run tests — all 9 pass (58/58 total).
3. **VERIFY:** Run `typecheck` and `build` to confirm 0 errors.

**Step 3.2** creates `src/features/employees/index.ts` — 3 re-exports that constitute the feature's public API surface.

### SOLID + Deep Module Analysis

**`useEmployeeList.ts`** — **Deep module.** SRP: one reason to change — the employee list pagination/filter state management. Interface: 4 control callbacks + 8 data properties. Implementation: debounce logic, CONTAINS/EQUALS operator selection, 3-char threshold, `null` guard (not truthy), page reset rules, error lifecycle (clear at start, set on rejection, clear on success), StrictMode cleanup. Deletion test: without this hook, all 8 business rules would scatter across `EmployeesPage` (which would become a 200-line state machine) or be re-implemented across 4 UI components. The hook concentrates all essential complexity behind a minimal interface — this is the ideal outcome of the deletion test. Depth verdict: **DEEP**.

**`index.ts`** — Shallow by design. It is a barrel export (3 re-exports), not a computation module. The deletion test: without it, callers would import from internal paths (`hooks/useEmployeeList`, `types`) violating the module boundary. It earns its keep as an encapsulation boundary, not as a depth module.

### Files to Create/Modify

- [x] `src/features/employees/hooks/useEmployeeList.test.ts` — **new** — 9 TDD behavior tests (RED then GREEN)
- [x] `src/features/employees/hooks/useEmployeeList.ts` — **new** — the hook implementation with debounce, filter predicate, error lifecycle
- [x] `src/features/employees/index.ts` — **new** — public API surface: `useEmployeeList` + 3 type re-exports

---

## Step-by-Step Implementation

### Step 3.1 RED: Write `src/features/employees/hooks/useEmployeeList.test.ts`

**Goal:** Write all 9 behavior tests that specify what `useEmployeeList` must do. All tests must fail with a module-not-found error — this is the correct RED signal.
**Dependencies:** Task 2 complete (`types.ts` and `employeeService.ts` must exist — the test imports types from `"../types"` and mocks `"../services/employeeService"`).

- [x] Create `src/features/employees/hooks/` directory
- [x] Create `src/features/employees/hooks/useEmployeeList.test.ts` with the content below
- [x] Run `npm --prefix project/srcs/frontend run test` — confirm the new suite FAILS with module-not-found; all 49 existing tests still pass

**Why the RED state is important:** Writing tests first forces a precise statement of behavior before any implementation decisions. The discriminating `enabled = false` test (test 6) is the most critical — it proves the `filterValue !== null` guard is correct before the implementation can accidentally use a truthy guard.

**Fake timer setup (per parent Testing Decisions):** Use `vi.useFakeTimers()` in `beforeEach` for all tests (not just the debounce tests). `vi.useFakeTimers()` only fakes time-based APIs (`setTimeout`, `setInterval`, `Date`); it does NOT affect microtasks (Promises). So `await Promise.resolve()` inside `act()` still correctly drains the promise chain even with fake timers active. Use `vi.advanceTimersByTimeAsync(500)` (the async variant) inside `act()` for debounce tests — it advances the timer AND drains any promises arising from the timer callback.

#### Implementation: Test File

```typescript
// src/features/employees/hooks/useEmployeeList.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useEmployeeList } from "./useEmployeeList"
import { listEmployees } from "../services/employeeService"
import type { PageEnvelope, EmployeeListDTO } from "../types"

// Mock the service module — listEmployees is the hook's only external dependency
vi.mock("../services/employeeService", () => ({
  listEmployees: vi.fn(),
}))

const mockListEmployees = vi.mocked(listEmployees)

// Helper to create a minimal, valid PageEnvelope for mocking
function makeEnvelope(
  overrides: Partial<PageEnvelope<EmployeeListDTO>> = {}
): PageEnvelope<EmployeeListDTO> {
  return {
    content: [],
    totalElements: 0,
    totalPages: 1,
    number: 0,
    size: 10,
    first: true,
    last: true,
    empty: true,
    ...overrides,
  }
}

describe("useEmployeeList", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mockListEmployees.mockResolvedValue(makeEnvelope())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── Test 1: Initial load ──────────────────────────────────────────────────────
  it("fetches employees with default params on mount", async () => {
    const { result } = renderHook(() => useEmployeeList())

    // Flush the useEffect and the async listEmployees promise
    await act(async () => {
      await Promise.resolve()
    })

    expect(mockListEmployees).toHaveBeenCalledOnce()
    expect(mockListEmployees).toHaveBeenCalledWith({
      page: 0,
      size: 10,
      sort: [{ field: "username", direction: "ASC" }],
      filters: [],
    })
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  // ── Test 2: Page change ───────────────────────────────────────────────────────
  it("fetches with updated page number when page changes", async () => {
    const { result } = renderHook(() => useEmployeeList())
    await act(async () => { await Promise.resolve() })

    mockListEmployees.mockClear()
    mockListEmployees.mockResolvedValue(makeEnvelope({ number: 1 }))

    await act(async () => {
      result.current.onPageChange(1)
    })

    expect(mockListEmployees).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1 })
    )
    expect(result.current.currentPage).toBe(1)
  })

  // ── Test 3: Page size change + reset ─────────────────────────────────────────
  it("resets to page 0 and fetches with new size when page size changes", async () => {
    const { result } = renderHook(() => useEmployeeList())
    await act(async () => { await Promise.resolve() })

    // Navigate to page 1 first, so we can verify the reset
    mockListEmployees.mockResolvedValue(makeEnvelope({ number: 1 }))
    await act(async () => {
      result.current.onPageChange(1)
    })
    expect(result.current.currentPage).toBe(1)

    mockListEmployees.mockClear()
    mockListEmployees.mockResolvedValue(makeEnvelope({ number: 0 }))

    await act(async () => {
      result.current.onPageSizeChange(25)
    })

    // Must send page: 0 (reset) with the new size — not page: 1
    expect(mockListEmployees).toHaveBeenCalledWith(
      expect.objectContaining({ page: 0, size: 25 })
    )
  })

  // ── Test 4: String filter < 3 chars — no fetch ───────────────────────────────
  it("does not fetch when string filter value has fewer than 3 chars", async () => {
    const { result } = renderHook(() => useEmployeeList())
    await act(async () => { await Promise.resolve() })

    // Set up: select "username" field (triggers one fetch with empty filters)
    await act(async () => {
      result.current.onFilterFieldChange("username")
    })
    mockListEmployees.mockClear()

    // Type "ab" (2 chars) — debounce should not fire even after 500ms
    await act(async () => {
      result.current.onFilterValueChange("ab")
      await vi.advanceTimersByTimeAsync(500)
    })

    expect(mockListEmployees).not.toHaveBeenCalled()
  })

  // ── Test 5: String filter ≥ 3 chars — CONTAINS debounced ─────────────────────
  it("debounces and fetches with CONTAINS filter when string value has 3+ chars", async () => {
    const { result } = renderHook(() => useEmployeeList())
    await act(async () => { await Promise.resolve() })

    await act(async () => {
      result.current.onFilterFieldChange("username")
    })
    mockListEmployees.mockClear()

    // vi.advanceTimersByTimeAsync is async: it advances the 500ms timer AND
    // drains any promises that arise from the timer callback (the listEmployees call).
    await act(async () => {
      result.current.onFilterValueChange("joh")
      await vi.advanceTimersByTimeAsync(500)
    })

    expect(mockListEmployees).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: [{ field: "username", operations: [{ operator: "CONTAINS", value: "joh" }] }],
      })
    )
  })

  // ── Test 6: Boolean filter enabled=false — discriminating EQUALS ──────────────
  it("fetches immediately with EQUALS filter when boolean field value is false (Inactive)", async () => {
    // DISCRIMINATING TEST (Finding-4): value=false is falsy.
    // A truthy guard `if (field && value)` would silently drop false and send filters: [],
    // returning ALL employees instead of only Inactive ones.
    // The correct guard is `field !== null && value !== null` — false passes this check.
    const { result } = renderHook(() => useEmployeeList())
    await act(async () => { await Promise.resolve() })

    await act(async () => {
      result.current.onFilterFieldChange("enabled")
    })
    mockListEmployees.mockClear()

    // Set value to false — the Inactive case
    await act(async () => {
      result.current.onFilterValueChange(false)
    })

    // Must emit exactly this predicate — NOT filters: []
    expect(mockListEmployees).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: [{ field: "enabled", operations: [{ operator: "EQUALS", value: false }] }],
      })
    )
  })

  // ── Test 7: Filter field change — value clear + page reset ───────────────────
  it("clears filter value and resets page to 0 when filter field changes", async () => {
    const { result } = renderHook(() => useEmployeeList())
    await act(async () => { await Promise.resolve() })

    // Set up: username filter with a value
    await act(async () => {
      result.current.onFilterFieldChange("username")
    })
    await act(async () => {
      result.current.onFilterValueChange("joh")
      await vi.advanceTimersByTimeAsync(500)
    })

    mockListEmployees.mockClear()

    // Change the field — must clear the stale "joh" value and reset to page 0
    await act(async () => {
      result.current.onFilterFieldChange("email")
    })

    expect(result.current.filterValue).toBeNull()
    expect(mockListEmployees).toHaveBeenCalledWith(
      expect.objectContaining({ page: 0, filters: [] })
    )
  })

  // ── Test 8: onFilterValueChange(null) — "All" case keeps filterField ─────────
  it('keeps filterField, clears predicate, and fetches with empty filters when value is null ("All" case)', async () => {
    // This is DISTINCT from onFilterFieldChange(null) which also clears the field.
    // Here: "Status" field stays selected; only the value (Active/Inactive) becomes "All".
    const { result } = renderHook(() => useEmployeeList())
    await act(async () => { await Promise.resolve() })

    // Set up: enabled field with value true (Active)
    await act(async () => {
      result.current.onFilterFieldChange("enabled")
    })
    await act(async () => {
      result.current.onFilterValueChange(true)
    })

    mockListEmployees.mockClear()

    // Select "All" — value=null means no predicate; filterField must stay "enabled"
    await act(async () => {
      result.current.onFilterValueChange(null)
    })

    expect(result.current.filterField).toBe("enabled")  // field preserved
    expect(result.current.filterValue).toBeNull()         // value cleared
    expect(mockListEmployees).toHaveBeenCalledWith(
      expect.objectContaining({ filters: [] })            // no predicate
    )
  })

  // ── Test 9: Error lifecycle ───────────────────────────────────────────────────
  it("sets error on failed fetch and clears error to null at start of retry", async () => {
    // Failed initial load
    mockListEmployees.mockRejectedValueOnce(new Error("Server error"))

    const { result } = renderHook(() => useEmployeeList())
    await act(async () => { await Promise.resolve() })

    // Error should be set; employees unchanged (still [])
    expect(result.current.error).not.toBeNull()
    expect(result.current.employees).toEqual([])

    // Set up retry: deferred promise so we can capture state mid-fetch
    let resolveRetry!: (value: PageEnvelope<EmployeeListDTO>) => void
    mockListEmployees.mockImplementationOnce(
      () => new Promise<PageEnvelope<EmployeeListDTO>>(res => { resolveRetry = res })
    )

    // Start retry — async act flushes synchronous state updates (setError(null) called
    // before the first await in fetchEmployees). The deferred listEmployees promise is not
    // React-tracked async work, so act returns without hanging.
    // <!-- REVIEW-FIX: Changed synchronous act() to await act(async () => {}) — in React 18,
    //      act() returns a thenable and state updates may not flush until awaited. -->
    await act(async () => {
      result.current.onPageChange(0)
    })

    // Error is cleared at the start of every fetch, before the deferred promise resolves
    expect(result.current.error).toBeNull()

    // Complete the retry
    await act(async () => {
      resolveRetry(makeEnvelope())
    })

    // Error remains null after successful retry
    expect(result.current.error).toBeNull()
  })
})
```

#### Edge Cases

1. **Case:** `vi.useFakeTimers()` affects `Date` which some React internals use — test may show unexpected behavior.
   **Handling:** If RTL or React warns about fake timers, add `vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })` to restrict which APIs are faked to only those needed. The parent specifies NOT to use `{ shouldAdvanceTime: true }` — that re-introduces slowness.

2. **Case:** `renderHook` in React 18+ StrictMode renders twice (mounts, unmounts, remounts). With `mockListEmployees.mockResolvedValue(makeEnvelope())` set before each test, both mount attempts are satisfied. After the double mount, `mockListEmployees` may have been called twice. Test 1 uses `toHaveBeenCalledOnce()` — if StrictMode fires it twice, this assertion will fail.
   **Handling:** `vitest.config.ts` does not set `reactStrictMode: true` in `renderHook` options, and the project's `vitest.config.ts` does not enable it globally. StrictMode behavior in RTL is controlled by the `wrapper` option or by the Vite React plugin's dev config. In a standard Vitest + jsdom setup without explicit StrictMode configuration, `useEffect` runs once per test. If test 1 still fails, change `toHaveBeenCalledOnce()` to `toHaveBeenCalledWith(...)` only (any number of calls is fine as long as the correct call was made). Document the finding in this task.

3. **Case:** `act()` in test 9 must flush `setError(null)` BEFORE the deferred `listEmployees` promise resolves, so we can assert error is null mid-fetch.
   **Handling:** Use `await act(async () => { result.current.onPageChange(0) })`. In React 18, `act()` returns a thenable; calling it without `await` may not flush state updates before the next line runs. The `async () => {}` callback with `await act(...)` drains React's tracked async work (scheduled state updates, effects), which includes flushing `setError(null)`. The deferred `listEmployees` promise is NOT React-tracked, so `act` returns without hanging. This is the safe, portable pattern across React 18 rendering modes.

4. **Case:** In test 5, `result.current.onFilterValueChange("joh")` is called inside the same `act()` that also calls `vi.advanceTimersByTimeAsync(500)`. The timer fires inside `act`, which means React state updates from the timer callback are flushed by `act`. This is the correct pattern — do not separate these into two `act()` calls, as that can cause the assertion to run before the timer fires.

---

### Step 3.1 GREEN: Create `src/features/employees/hooks/useEmployeeList.ts`

**Goal:** Write the minimal implementation that makes all 9 RED tests pass.
**Dependencies:** Step 3.1 RED complete; `types.ts` (Step 2.1) and `employeeService.ts` (Step 2.2) exist.

- [x] Create `src/features/employees/hooks/useEmployeeList.ts` with the content below
- [x] Run `npm --prefix project/srcs/frontend run test` — confirm **58/58** pass (49 existing + 9 new)
- [x] Run `npm --prefix project/srcs/frontend run typecheck` — confirm 0 errors
- [x] Run `npm --prefix project/srcs/frontend run build` — confirm build succeeds

**Why this step is critical:** This hook concentrates all the business rules that make the employee list page correct. The `filterValue !== null` guard (not truthy) is the most important invariant — it ensures `enabled = false` (Inactive) produces a proper backend filter predicate rather than an empty `filters: []` that returns all employees.

#### Implementation

```typescript
// src/features/employees/hooks/useEmployeeList.ts

import { useState, useEffect, useRef } from "react"
import { listEmployees } from "../services/employeeService"
import type { EmployeeListDTO, FilterField, PageableRequest } from "../types"
import { FILTER_FIELDS } from "../types"

export const DEBOUNCE_MS = 500

interface UseEmployeeListResult {
  employees: EmployeeListDTO[]
  totalPages: number
  totalElements: number
  currentPage: number
  isLoading: boolean
  error: string | null
  filterField: FilterField | null
  filterValue: string | boolean | null
  pageSize: number
  onFilterFieldChange: (field: FilterField | null) => void
  onFilterValueChange: (value: string | boolean | null) => void
  onPageSizeChange: (size: number) => void
  onPageChange: (page: number) => void
}

export function useEmployeeList(): UseEmployeeListResult {
  const [employees, setEmployees] = useState<EmployeeListDTO[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterField, setFilterField] = useState<FilterField | null>(null)
  const [filterValue, setFilterValue] = useState<string | boolean | null>(null)
  const [pageSize, setPageSize] = useState(10)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function clearDebounce() {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
  }

  async function fetchEmployees(
    page: number,
    size: number,
    field: FilterField | null,
    value: string | boolean | null
  ) {
    setIsLoading(true)
    setError(null)  // clear stale error at the START of every fetch (Finding-3)

    // CRITICAL: guard with !== null, NOT a truthy check.
    // value=false (Inactive) is falsy — a truthy guard would drop the filter entirely.
    const filters: PageableRequest["filters"] = []
    if (field !== null && value !== null) {
      const meta = FILTER_FIELDS.find(f => f.value === field)
      const operator = meta?.type === "boolean" ? "EQUALS" : "CONTAINS"
      filters.push({ field, operations: [{ operator, value }] })
    }

    const request: PageableRequest = {
      page,
      size,
      sort: [{ field: "username", direction: "ASC" }],
      filters,
    }

    try {
      const envelope = await listEmployees(request)
      setEmployees(envelope.content)
      setTotalPages(envelope.totalPages)
      setTotalElements(envelope.totalElements)
      setCurrentPage(envelope.number)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't fetch the employees. Please try again."
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Initial mount: fetch with the documented defaults.
  // Hardcoded params avoid stale-closure issues with state values.
  // Cleanup clears any pending debounce timer on unmount.
  useEffect(() => {
    void fetchEmployees(0, 10, null, null)
    return () => clearDebounce()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function onFilterFieldChange(field: FilterField | null) {
    clearDebounce()
    setFilterField(field)
    setFilterValue(null)
    void fetchEmployees(0, pageSize, field, null)
  }

  function onFilterValueChange(value: string | boolean | null) {
    clearDebounce()
    setFilterValue(value)

    if (value === null) {
      // "All" case: keep filterField as-is; clear the predicate; fetch with no filter.
      // Must NOT call onFilterFieldChange(null) — that would also clear the field.
      void fetchEmployees(0, pageSize, filterField, null)
      return
    }

    if (filterField === null) return

    const meta = FILTER_FIELDS.find(f => f.value === filterField)
    if (meta?.type === "boolean") {
      // Boolean filters: immediate fetch with EQUALS
      void fetchEmployees(0, pageSize, filterField, value)
    } else {
      // String filters: debounce 500ms, only if ≥ 3 chars
      const strValue = value as string
      if (strValue.length >= 3) {
        debounceRef.current = setTimeout(() => {
          void fetchEmployees(0, pageSize, filterField, strValue)
        }, DEBOUNCE_MS)
      }
      // < 3 chars: cancel any pending debounce (done above), do not fetch
    }
  }

  function onPageSizeChange(size: number) {
    clearDebounce()  // cancel any pending string-filter debounce (see Decision 7)
    setPageSize(size)
    void fetchEmployees(0, size, filterField, filterValue)
  }

  function onPageChange(page: number) {
    clearDebounce()  // cancel any pending string-filter debounce (see Decision 7)
    void fetchEmployees(page, pageSize, filterField, filterValue)
  }

  return {
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
  }
}
```

#### Implementation Notes

**`void fetchEmployees(...)`**: The `void` operator discards the Promise returned by the async function. The handlers are synchronous from the caller's perspective; errors are caught inside `fetchEmployees` and stored in `error` state. Using `void` is the correct pattern for fire-and-forget async calls in event handlers and hooks.

**`fetchEmployees` defined inside hook body**: Since `fetchEmployees` only uses `useState` setters (stable references) and `listEmployees` (imported module-level function, also stable), it is safe to use in `useEffect` with `[]` deps. The `eslint-disable-next-line react-hooks/exhaustive-deps` comment is correct because `fetchEmployees` is a derived function, not a dependency in the traditional sense — it doesn't need to be in the deps array. This is the same pattern as React's own docs for async effects.

**Stale closure in debounce callback**: `pageSize` and `filterField` captured by the `setTimeout` callback in `onFilterValueChange` could be stale if the user changes page size, filter field, or page while a debounce is pending. This is safe because `onFilterFieldChange`, `onPageSizeChange`, and `onPageChange` all call `clearDebounce()` as their first action, canceling the pending timer before it can fire with stale closure values. See Decision 7.

**`currentPage` set from `envelope.number`**: The hook sets `currentPage` from the backend's response rather than tracking it separately. During a fetch, `isLoading` is `true`, and `EmployeesPage` disables pagination buttons when loading — so `currentPage` showing a stale value during fetch is safe. After the fetch, `envelope.number` correctly reflects the page the backend served.

#### Edge Cases

1. **Case:** The initial `useEffect` fires twice in React StrictMode (dev only). `fetchEmployees` is called twice, resulting in two network calls to `listEmployees`. The second call's result overwrites the first (same params, same result).
   **Handling:** No special handling needed — same data is fetched twice. StrictMode behavior is by design. The cleanup function `clearDebounce()` only clears the debounce timer, not the in-flight request. If request cancellation is desired in the future, add an `AbortController` signal to `listEmployees` — but this is not in scope for this task.

2. **Case:** The user types "jo" (2 chars) then quickly types "h" to get "joh" (3 chars). Both `onFilterValueChange("jo")` and `onFilterValueChange("joh")` are called. The second call calls `clearDebounce()` first (canceling any "jo" timer that would not have started anyway since 2 < 3), then starts a new 500ms timer for "joh".
   **Handling:** Correct behavior — only "joh" fires. No duplicate fetch.

3. **Case:** `onFilterValueChange(null)` is called when `filterField` is also `null` (no field selected). `fetchEmployees(0, pageSize, null, null)` is called, which sends `filters: []`. This is idempotent — same as the initial load.
   **Handling:** Correct behavior — no special case needed.

4. **Case:** `onPageSizeChange` captures `filterValue` from the closure. If `filterValue` is `false` (Inactive), this is passed to `fetchEmployees(0, size, filterField, false)`. The `false !== null` guard passes, and the EQUALS filter predicate is included. The page size change respects the current filter. ✓

---

### Step 3.2: Create `src/features/employees/index.ts`

**Goal:** Expose the hook and necessary types as the feature's public API. External code (e.g., `EmployeesPage`) imports from `"@/features/employees"` — not from internal paths.
**Dependencies:** Step 3.1 GREEN complete (`useEmployeeList.ts` must exist to re-export from it).

- [x] Create `src/features/employees/index.ts` with the content below
- [x] Run `npm --prefix project/srcs/frontend run typecheck` — confirm 0 errors

**Why this step is critical:** Establishes the module boundary. The feature's forbidden-deep-import rule (no imports of `services/` or `hooks/` from outside the feature) is enforced by this barrel export being the only sanctioned import path for external callers.

#### Implementation

```typescript
// src/features/employees/index.ts

export { useEmployeeList } from "./hooks/useEmployeeList"
export type { EmployeeListDTO, FilterField, PageEnvelope } from "./types"
```

**What is NOT exported through `index.ts`** (internal-only):

| Export | Why internal |
|--------|-------------|
| `FilterFieldMeta` | Used only by `EmployeeFilterBar` via `import type { FilterFieldMeta } from "../types"` |
| `FILTER_FIELDS` | Used only by `EmployeeFilterBar` via `import { FILTER_FIELDS } from "../types"` |
| `PageableRequest` | Used only by `employeeService.ts` and `useEmployeeList.ts` via `import type { PageableRequest } from "../types"` |
| `listEmployees` | Hidden service function — callers use the hook, not the service directly |
| `DEBOUNCE_MS` | Implementation detail for testing; not part of the public API |

**Note for Task 4:** `EmployeeFilterBar` and `EmployeeTable` are internal feature components in `features/employees/components/`. They may import from `"../types"` and `"../hooks/useEmployeeList"` (internal paths). The forbidden-deep-import rule only applies to external callers (e.g., `EmployeesPage`, `router.tsx`).

---

## Design Decisions

**Decision 1: `fetchEmployees` as a plain async function, not `useCallback`**
- **Why:** `fetchEmployees` only calls `useState` setters (stable) and `listEmployees` (imported, stable). It does not need memoization — a new function per render is fine because it is only called imperatively (from handlers and the initial `useEffect`), never as a dependency of other hooks. Adding `useCallback` would require listing all setters as deps, adding noise for zero practical benefit.
- **Alternatives considered:** `useCallback(fetchEmployees, [])` — rejected because the deps would need to include `listEmployees` and all setters; the `eslint-disable` would still be needed; and `useCallback` adds indirection without protecting against the closure issues it's designed to solve (those issues don't apply here).

**Decision 2: `filterValue !== null` guard (NOT truthy)**
- **Why:** This is the critical Finding-4 from the parent review. `false` (boolean) is the "Inactive" value for the `enabled` filter. A truthy check `if (field && value)` would treat `false` as "no value" and omit the filter predicate, causing the backend to return all employees instead of only inactive ones. The `!== null` guard correctly includes `false`.
- **Alternatives considered:** `typeof value !== "undefined" && value !== null` — equivalent but more verbose; `Boolean(value)` — incorrect for the same reason as truthy check; `if (value !== null && field !== null)` — same as chosen, just reordered. Guard is placed in `fetchEmployees` (the single place where the request is built), not in each handler.

**Decision 3: All new values passed as explicit parameters to `fetchEmployees`, not read from state**
- **Why:** State updates (`setPageSize(size)`, `setFilterField(field)`, etc.) are batched by React and do not take effect until the next render. Reading state values immediately after calling a setter would read the stale value. By passing the new values explicitly as parameters, the fetch always uses the correct values without waiting for the re-render.
- **Alternatives considered:** Reading from a ref that mirrors state — more complex; using a reducer pattern — overengineering for 5 state fields. Explicit params is the simplest correct approach.

**Decision 4: `currentPage` set from `envelope.number`, not by the handler**
- **Why:** The backend is the authority on which page index it served. Setting `currentPage` from `envelope.number` after a successful fetch is self-consistent. During loading, `isLoading: true` disables the pagination buttons, so a briefly stale `currentPage` during the fetch does not cause UX issues or enable double-clicks.
- **Alternatives considered:** Optimistic `setCurrentPage(page)` in the handler before the fetch — adds a state update that the fetch immediately overwrites; adds complexity for no visible benefit since buttons are disabled during loading.

**Decision 5: `DEBOUNCE_MS = 500` exported as a named constant**
- **Why:** Tests import the constant (`import { DEBOUNCE_MS } from "./useEmployeeList"`) instead of hardcoding `500`. If the debounce duration changes, the test automatically uses the new value. This avoids magic-number drift between implementation and tests.
- **Alternatives considered:** Hardcode `500` in both the hook and the test — creates a coupling risk; define it as a module-level constant but not export it — the test would need to duplicate the value.

**Decision 6: `index.ts` does NOT re-export `DEBOUNCE_MS`**
- **Why:** `DEBOUNCE_MS` is an implementation detail of the hook, not a public API concern. External callers (UI components, the page) have no use for the debounce constant. Limiting exports to `useEmployeeList` and the three type exports keeps the public API surface minimal.
- **Alternatives considered:** Export `DEBOUNCE_MS` through `index.ts` — rejected; it would imply it's a public API value and could lead to callers depending on the debounce duration for their own logic.

**Decision 7: `onPageChange` and `onPageSizeChange` call `clearDebounce()` before fetching**
<!-- REVIEW-FIX: Added clearDebounce() to page handlers to prevent stale debounce override of explicit user navigation. -->
- **Why:** If the user types "joh" (debounce starts, 500ms) and then within 500ms navigates to page 2, the debounce timer's callback captures the page size and filter field from the render at the time `onFilterValueChange("joh")` was called. Without cancelling the debounce, the timer fires 500ms later with a stale page size (e.g., 10 instead of 25 after a resize) and resets the page to 0, overwriting the user's deliberate navigation. Calling `clearDebounce()` in `onPageChange` and `onPageSizeChange` cancels the pending timer before the new fetch starts, preventing any stale-closure-driven override.
- **Alternatives considered:** Accepting the race condition as an unlikely edge case — rejected; 500ms is long enough that a user could reasonably type and navigate within that window. Using a ref-based "current intent" pattern — rejected as overengineering; `clearDebounce()` is already in the codebase and the fix is one line per handler.

---

## Testing Considerations

### Automatic Validation

- [x] Run `npm --prefix project/srcs/frontend run test` after Step 3.1 RED — confirm the new suite FAILS with module-not-found; all 49 existing tests still pass
- [x] Run `npm --prefix project/srcs/frontend run test` after Step 3.1 GREEN — confirm **58/58** pass (49 existing + 9 new `useEmployeeList` tests)
- [x] Run `npm --prefix project/srcs/frontend run typecheck` after Step 3.1 GREEN — confirm 0 errors
- [x] Run `npm --prefix project/srcs/frontend run build` after Step 3.1 GREEN — confirm build succeeds
- [x] Run `npm --prefix project/srcs/frontend run typecheck` after Step 3.2 — confirm 0 errors (index.ts re-exports resolve correctly)
- [x] Run `npm --prefix project/srcs/frontend run test` after Step 3.2 — confirm still 58/58 (index.ts adds no runtime code to test)

### Manual Validation

No manual validation required for this task. All new code is TypeScript hooks with no UI and no browser-only behavior. The automatic validation above (typecheck + test + build) is sufficient.

---

## Post-Review Notes

**2026-06-27 — Review finding patched (WARNING):**

- **Finding:** `onFilterValueChange` unconditionally calls `setFilterValue(value)` even for strings < 3 chars. Those incomplete values skip the fetch in `onFilterValueChange` (per rule 5), but when the user subsequently changes page or page size, the handlers pass the stale incomplete `filterValue` to `fetchEmployees`. `fetchEmployees` had no minimum-length guard — its only gate was `field !== null && value !== null`, which passes for `""`, `"a"`, `"ab"`.
- **Fix:** Added a guard inside `fetchEmployees` (the canonical place where filters are built): `if (typeof value === "string" && value.length < 3)` treats short strings as no-filter. This protects all code paths (page change, page size change, and any future callers of `fetchEmployees`), not just `onFilterValueChange`.
- **New test (4a):** "does not include incomplete string filter values (< 3 chars) in page-change fetch" — asserts that navigating pages with a 2-char filter sends `filters: []`, not `[{ field: "username", operations: [{ operator: "CONTAINS", value: "ab" }] }]`.
- **Final test count:** 59/59 (10 original + 1 post-review test).

---

## Related Code Explanations

- `src/features/employees/types.ts` — all types and `FILTER_FIELDS` constant imported by the hook
- `src/features/employees/services/employeeService.ts` — the only function the hook calls for data; mocked in tests
- `src/features/employees/services/employeeService.test.ts` — prior art: MockAdapter test pattern (not used in this task — hook tests use `vi.mock`)
- `src/features/authentication/hooks/useLoginForm.ts` — prior art: `useState` + async submit + try/catch/finally pattern
- `src/features/authentication/hooks/useLoginForm.test.ts` — prior art: `renderHook` + `act` + `vi.mock` pattern directly mirrored here
- `src/features/authentication/index.ts` — prior art for `index.ts` barrel export pattern

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected for this task
- [x] Version-matched documentation reviewed (Vitest 4.1.9 fake timers, @testing-library/react 16.3.2 renderHook)
- [x] `src/features/employees/hooks/useEmployeeList.test.ts` created — 9 behavior tests (RED confirmed)
- [x] `src/features/employees/hooks/useEmployeeList.ts` created (GREEN confirmed)
- [x] `npm run test` = **58/58** passing after Step 3.1 GREEN
- [x] `npm run typecheck` = 0 errors after Step 3.1 GREEN
- [x] `npm run build` succeeds after Step 3.1 GREEN
- [x] `src/features/employees/index.ts` created (Step 3.2)
- [x] `npm run typecheck` = 0 errors after Step 3.2
- [x] `npm run test` = **59/59** after Step 3.2 (no regressions; +1 post-review test for < 3-char guard in fetchEmployees)
- [x] Parent feature Phase 3 steps (3.1, 3.2) marked `[x]`
- [x] Parent feature Task 3 section updated with wiki link `[[Admin-Employee-Management-Page-task-3-use-employee-list-hook]]`
