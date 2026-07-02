# Task: Extract `useEmployeeFilter` from `useEmployeeList`

#task #current #medium-complexity #parent-frontend-code-quality-fallow-health-refactor

**Parent:** [[Frontend-Code-Quality-Fallow-Health-Refactor]]
**Parent Type:** Bug
**Related Step(s):** Phase 4 — Steps 4.1 and 4.2
**Estimated Complexity:** Medium

---

## Goal

Extract filter state, debounce management, and filter handlers from `useEmployeeList.ts` into a focused `useEmployeeFilter` hook, then wire the extracted hook back into `useEmployeeList` so the list hook becomes a thin pagination + fetch orchestrator with no filter concerns.

---

## Parent Context

The parent bug (`Frontend-Code-Quality-Fallow-Health-Refactor`) is a fallow-health audit refactor targeting SRP violations across the employees feature. `useEmployeeList.ts` is flagged for mixing debounce logic, filter state management, and pagination state in one 152-line hook. The parent prescribes:

- **Step 4.1**: Create `useEmployeeFilter.ts` owning `filterField`, `filterValue`, `debounceRef`, `clearDebounce`, `onFilterFieldChange`, and `onFilterValueChange`. Returns `{ filterField, filterValue, onFilterFieldChange, onFilterValueChange, clearDebounce }`.
- **Step 4.2**: Refactor `useEmployeeList.ts` to import and call `useEmployeeFilter`; the list hook retains only pagination state, `fetchEmployees`, and `refresh`.

The parent explicitly notes that the `UseEmployeeListResult` public interface must stay unchanged — callers (`EmployeesPage.tsx`) must require zero modifications.

The parent also flags `useEmployeeList.ts:102:5` as having a now-stale `eslint-disable-next-line react-hooks/exhaustive-deps` directive; this task is the correct scope to address it.

---

## Preconditions / Dependencies

- **Task 1, 2, 3 of the parent bug are complete.** Tasks 1 and 2 (useEditEmployee + AppSettingsForm) are in `Tasks/current/` and have been executed. Task 3 (`EmployeesPage` decomposition) is complete — `EmployeesPage.tsx` already calls `useEmployeeList()` and `useEmployeeModals()`, and renders `<EmployeePagination>`. This task does not touch `EmployeesPage.tsx`.
- `src/features/employees/hooks/useEmployeeList.ts` exists at 179 lines (with `export const DEBOUNCE_MS = 500` and 9 behavior tests in `useEmployeeList.test.ts`).
- `src/features/employees/hooks/useEmployeeModals.ts` was created in Task 3 — `UseEmployeeModalsResult` is its exported interface. Follow the same interface-export convention for this task.
- 101 tests pass across 17 files; baseline must remain ≥ 101 throughout this task.
- `DEBOUNCE_MS` is only used within `useEmployeeList.ts` itself (not imported from any other module). Moving the export to `useEmployeeFilter.ts` is safe.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `solid-deep-design` — **Selected** — SRP governs the decomposition: `useEmployeeFilter` has exactly one reason to change (filter/debounce behavior); `useEmployeeList` has exactly one reason to change (pagination + fetch orchestration).
- `tdd` — **Selected** — `useEmployeeFilter` is a new module; write tests before implementing (RED → GREEN). The `useEmployeeList` refactor (Step 4.2) uses existing tests as the safety net — no new tests needed for Step 4.2.
- `react-best-practices` — **Selected** — validates the parameter-passing design and hook ordering constraints (hooks must be called at the top level; `fetchEmployees` function must be defined before `useEmployeeFilter(pageSize, fetchEmployees)` is called).
- `react-code-organization` — **Selected** — extracted hook lives in `src/features/employees/hooks/` following the existing pattern.

### Documentation Reviewed

- Vitest 4.x — project uses Vitest 4.1.9 (`^4.1.9`), `jsdom` environment, `@testing-library/react` 16.3.2 (`renderHook`, `act`). Same testing setup as `useEmployeeModals.test.ts` would use, and as the existing `useEmployeeList.test.ts` uses.
- React 19.2.4 — hook ordering rules: all hook calls (`useState`, `useRef`, custom hooks like `useEmployeeFilter`) must appear at the top level in a consistent order. Plain `function` declarations inside a hook body are not hook calls and may appear in any order relative to `useState` calls.

### Related Existing Code

- `src/features/employees/hooks/useEmployeeList.ts` — source file being split; 179 lines; exports `DEBOUNCE_MS` and `useEmployeeList`
- `src/features/employees/hooks/useEmployeeList.test.ts` — 9 existing behavior tests; all 9 must pass unchanged after Step 4.2
- `src/features/employees/hooks/useEmployeeModals.ts` — precedent for exported interface + `useState` only hook from Task 3
- `src/pages/EmployeesPage.tsx` — sole consumer of `useEmployeeList()`; must require zero changes
- `src/features/employees/index.ts` — public barrel; exports `useEmployeeList`. `useEmployeeFilter` is internal to the feature and must NOT be added to the barrel
- `src/features/employees/types.ts` — defines `FilterField`, `FilterFieldMeta`, `FILTER_FIELDS`

---

## Implementation Details

### Approach

`useEmployeeFilter` is a focused hook that owns the filter half of the original `useEmployeeList`. It receives `pageSize` and a `fetchFn` callback from its caller and drives fetches directly — this keeps fetch triggering logic co-located with the debounce logic that controls when fetches fire.

**Why pass `fetchFn` as a parameter rather than returning a "pending fetch request" signal?**
The filter hook's handlers (`onFilterFieldChange`, `onFilterValueChange`) already know exactly when and with what arguments a fetch should fire. Exposing a side-channel "wants-fetch" signal would split the decision (in the filter hook) from the execution (in the list hook), adding accidental complexity. Passing `fetchFn` directly keeps the pattern shallow: the filter hook knows WHEN; the list hook defines WHAT.

**Why pass `pageSize` as a parameter?**
`onFilterFieldChange` and `onFilterValueChange` must include the current `pageSize` in every call to `fetchFn`. Since `useEmployeeFilter` is called on every render of `useEmployeeList`, and `pageSize` is passed fresh from `useEmployeeList`'s state, each render's `onFilterFieldChange`/`onFilterValueChange` closure captures the current `pageSize`. No stale-closure issue: same behavior as the original code where these handlers closed over `pageSize` directly.

**`DEBOUNCE_MS` ownership**: The constant moves from `useEmployeeList.ts` to `useEmployeeFilter.ts` since the debounce logic is the reason it exists. It remains exported so tests can use it by name rather than hardcoding 500.

**Hook ordering in refactored `useEmployeeList`**:
1. `useState` calls (employees, totalPages, totalElements, currentPage, isLoading, error, pageSize) — 7 state slots, down from 9
2. `fetchEmployees` function definition (plain function, not a hook call — valid here)
3. `useEmployeeFilter(pageSize, fetchEmployees)` — custom hook call (must be at top level)
4. `useEffect` — initial fetch + cleanup
5. `onPageSizeChange`, `onPageChange`, `refresh` function definitions

**`useEmployeeList`'s public `UseEmployeeListResult` interface is unchanged.** Consumers (`EmployeesPage.tsx`) destructure `filterField`, `filterValue`, `onFilterFieldChange`, `onFilterValueChange` from `useEmployeeList` — these are now forwarded through from `useEmployeeFilter` via spread or explicit destructure.

**No changes to `EmployeesPage.tsx`, `EmployeeFilterBar.tsx`, `index.ts`, or any test file other than the new `useEmployeeFilter.test.ts`.**

### Files to Create/Modify

- [x] `src/features/employees/hooks/useEmployeeFilter.test.ts` — new; TDD RED test file (Step 4.1 RED)
- [x] `src/features/employees/hooks/useEmployeeFilter.ts` — new; the extracted filter hook (Step 4.1 GREEN)
- [x] `src/features/employees/hooks/useEmployeeList.ts` — modified; slim orchestrator (Step 4.2) <!-- REVIEW-FIX: Explicitly note removals: drop `useRef` import, drop `export const DEBOUNCE_MS = 500`, remove filterField/filterValue state and debounceRef/clearDebounce/onFilterFieldChange/onFilterValueChange definitions; add `useEmployeeFilter` import -->

---

## Step-by-Step Implementation

### Step 4.1 RED — Write `useEmployeeFilter.test.ts`

**Goal:** Establish the failing test suite that defines `useEmployeeFilter`'s contract before the implementation exists.
**Dependencies:** None — the test file imports from a path that does not yet exist.

- [x] Create `src/features/employees/hooks/useEmployeeFilter.test.ts` with 8 tests (F1–F8) as specified below.
- [x] Confirm RED: `npm run test` fails with "Failed to resolve import `./useEmployeeFilter`" — all 8 new tests fail; the 101 existing tests continue to pass.

**Why this step is critical:** Writing the tests before the implementation locks the contract — `UseEmployeeFilterResult` shape, parameter order, debounce timing, and the exact `fetchFn` call arguments are all specified by the test assertions before any implementation bias can influence them.

#### Implementation

```typescript
// src/features/employees/hooks/useEmployeeFilter.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useEmployeeFilter } from "./useEmployeeFilter"

describe("useEmployeeFilter", () => {
  let fetchFn: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    fetchFn = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── Test F1: Initial state ────────────────────────────────────────────────────
  it("starts with null filterField and null filterValue", () => {
    const { result } = renderHook(() => useEmployeeFilter(10, fetchFn))
    expect(result.current.filterField).toBeNull()
    expect(result.current.filterValue).toBeNull()
  })

  // ── Test F2: Field change ─────────────────────────────────────────────────────
  it("resets filterValue to null and calls fetchFn when field changes", async () => {
    const { result } = renderHook(() => useEmployeeFilter(10, fetchFn))

    // Set a value so we can verify it is cleared on field change
    await act(async () => {
      result.current.onFilterFieldChange("username")
    })
    await act(async () => {
      result.current.onFilterValueChange("joh")
      await vi.advanceTimersByTimeAsync(500)
    })

    fetchFn.mockClear()

    await act(async () => {
      result.current.onFilterFieldChange("email")
    })

    expect(result.current.filterValue).toBeNull()
    expect(fetchFn).toHaveBeenCalledWith(0, 10, "email", null)
  })

  // ── Test F3: String < 3 chars — no fetch ─────────────────────────────────────
  it("does not call fetchFn when string filter value has fewer than 3 chars", async () => {
    const { result } = renderHook(() => useEmployeeFilter(10, fetchFn))

    await act(async () => {
      result.current.onFilterFieldChange("username")
    })
    fetchFn.mockClear()

    await act(async () => {
      result.current.onFilterValueChange("ab")
      await vi.advanceTimersByTimeAsync(500)
    })

    expect(fetchFn).not.toHaveBeenCalled()
  })

  // ── Test F4: String ≥ 3 chars — debounced ────────────────────────────────────
  it("calls fetchFn after debounce when string filter value has 3+ chars", async () => {
    const { result } = renderHook(() => useEmployeeFilter(10, fetchFn))

    await act(async () => {
      result.current.onFilterFieldChange("username")
    })
    fetchFn.mockClear()

    await act(async () => {
      result.current.onFilterValueChange("joh")
      await vi.advanceTimersByTimeAsync(500)
    })

    expect(fetchFn).toHaveBeenCalledWith(0, 10, "username", "joh")
  })

  // ── Test F5: Boolean false — immediate (discriminating test) ──────────────────
  it("calls fetchFn immediately with boolean false (Inactive) — not guarded by truthiness", async () => {
    // false is falsy. A truthy guard `if (value)` would silently drop this
    // and call fetchFn with no filter, returning ALL employees instead of Inactive only.
    // This test explicitly verifies the !== null guard is used.
    const { result } = renderHook(() => useEmployeeFilter(10, fetchFn))

    await act(async () => {
      result.current.onFilterFieldChange("enabled")
    })
    fetchFn.mockClear()

    await act(async () => {
      result.current.onFilterValueChange(false)
    })

    expect(fetchFn).toHaveBeenCalledWith(0, 10, "enabled", false)
  })

  // ── Test F6: Null ("All") — keeps field, immediate fetch ─────────────────────
  it('keeps filterField and calls fetchFn with null value when value is null ("All" case)', async () => {
    const { result } = renderHook(() => useEmployeeFilter(10, fetchFn))

    await act(async () => {
      result.current.onFilterFieldChange("enabled")
    })
    await act(async () => {
      result.current.onFilterValueChange(true)
    })
    fetchFn.mockClear()

    await act(async () => {
      result.current.onFilterValueChange(null)
    })

    expect(result.current.filterField).toBe("enabled")
    expect(result.current.filterValue).toBeNull()
    expect(fetchFn).toHaveBeenCalledWith(0, 10, "enabled", null)
  })

  // ── Test F7: clearDebounce cancels pending timer ──────────────────────────────
  it("clearDebounce cancels a pending debounced fetch before it fires", async () => {
    const { result } = renderHook(() => useEmployeeFilter(10, fetchFn))

    await act(async () => {
      result.current.onFilterFieldChange("username")
    })
    fetchFn.mockClear()

    // Start debounce <!-- REVIEW-FIX: Changed from synchronous act() to await act(async()=>{}) — onFilterValueChange calls setFilterValue which is a React state update; synchronous act() may not flush it in React 19 concurrent mode -->
    await act(async () => {
      result.current.onFilterValueChange("joh")
    })

    // Cancel before the 500ms timer fires
    await act(async () => {
      result.current.clearDebounce()
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })

    expect(fetchFn).not.toHaveBeenCalled()
  })

  // ── Test F8: Field change cancels a pending debounce ─────────────────────────
  // <!-- REVIEW-FIX: Added Test F8 — onFilterFieldChange calls clearDebounce() as its first action.
  //      Without this test, the cancellation invariant is only covered by the integrated
  //      useEmployeeList.test.ts (Test 7). useEmployeeFilter should verify it directly. -->
  it("field change cancels a pending debounced fetch before it fires", async () => {
    const { result } = renderHook(() => useEmployeeFilter(10, fetchFn))

    await act(async () => {
      result.current.onFilterFieldChange("username")
    })
    // Start a debounce — this also triggers a fetchFn call (for the field change itself)
    await act(async () => {
      result.current.onFilterValueChange("joh")
    })
    fetchFn.mockClear()

    // Change field immediately — must cancel the "joh" debounce timer and call fetchFn
    // only ONCE (for the new field), not twice (not for the stale "joh" timer too)
    await act(async () => {
      result.current.onFilterFieldChange("email")
    })

    // Advance past the 500ms debounce window — the stale timer must NOT fire
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })

    // fetchFn called exactly once: for the field change to "email"
    expect(fetchFn).toHaveBeenCalledTimes(1)
    expect(fetchFn).toHaveBeenCalledWith(0, 10, "email", null)
  })
})
```

#### Edge Cases
1. **`value === false` (Inactive filter)** — `onFilterValueChange(false)`: must use `value !== null` guard, NOT `if (value)`. Test F5 is the discriminating test for this invariant.
2. **`value === null` ("All" case)** — `onFilterValueChange(null)`: must NOT call `onFilterFieldChange(null)` internally; field stays set, only value is cleared. Test F6 verifies `filterField` is preserved.
3. **String < 3 chars after a 3+ char string** — user backspaces to 2 chars: `clearDebounce()` is called inside `onFilterValueChange`, so the pending 500ms timer from the previous keystroke is cancelled before the new short value is processed. No fetch fires. (This is the existing behavior in the original code; the new hook preserves it.)

---

### Step 4.1 GREEN — Implement `useEmployeeFilter.ts`

**Goal:** Write the implementation that makes all 8 F1–F8 tests pass.
**Dependencies:** Step 4.1 RED complete; all 8 tests in RED state.

- [x] Create `src/features/employees/hooks/useEmployeeFilter.ts` as specified below.
- [x] Confirm GREEN: `npm run test` passes all 109 tests (101 existing + 8 new F1–F8).
- [x] `npm run typecheck` — 0 errors.

**Why this step is critical:** The hook must exactly reproduce the debounce and filter behavior currently embedded in `useEmployeeList`, so Step 4.2's refactor has a validated contract to wire against.

#### Implementation

```typescript
// src/features/employees/hooks/useEmployeeFilter.ts

import { useState, useRef } from "react"
import type { FilterField } from "../types"
import { FILTER_FIELDS } from "../types"

export const DEBOUNCE_MS = 500

export interface UseEmployeeFilterResult {
  filterField: FilterField | null
  filterValue: string | boolean | null
  onFilterFieldChange: (field: FilterField | null) => void
  onFilterValueChange: (value: string | boolean | null) => void
  clearDebounce: () => void
}

export function useEmployeeFilter(
  pageSize: number,
  fetchFn: (
    page: number,
    size: number,
    field: FilterField | null,
    value: string | boolean | null
  ) => void
): UseEmployeeFilterResult {
  const [filterField, setFilterField] = useState<FilterField | null>(null)
  const [filterValue, setFilterValue] = useState<string | boolean | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function clearDebounce() {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
  }

  function onFilterFieldChange(field: FilterField | null) {
    clearDebounce()
    setFilterField(field)
    setFilterValue(null)
    fetchFn(0, pageSize, field, null)
  }

  function onFilterValueChange(value: string | boolean | null) {
    clearDebounce()
    setFilterValue(value)

    if (value === null) {
      // "All" case: keep filterField as-is; clear the predicate; fetch with no filter.
      // Must NOT call onFilterFieldChange(null) — that would also clear the field.
      fetchFn(0, pageSize, filterField, null)
      return
    }

    if (filterField === null) return

    const meta = FILTER_FIELDS.find(f => f.value === filterField)
    if (meta?.type === "boolean") {
      // Boolean filters: immediate fetch — no debounce.
      // Guard is !== null (not truthiness) so value=false (Inactive) is not silently dropped.
      fetchFn(0, pageSize, filterField, value)
    } else {
      // String filters: debounce 500ms, only if ≥ 3 chars (backend minimum).
      const strValue = value as string
      if (strValue.length >= 3) {
        debounceRef.current = setTimeout(() => {
          fetchFn(0, pageSize, filterField, strValue)
        }, DEBOUNCE_MS)
      }
      // < 3 chars: debounce already cleared above; no fetch queued.
    }
  }

  return { filterField, filterValue, onFilterFieldChange, onFilterValueChange, clearDebounce }
}
```

#### Edge Cases
1. **`fetchFn` identity across renders**: `fetchFn` is a plain function defined inside `useEmployeeList` and re-created each render. Since `useEmployeeFilter` is also re-called each render, `onFilterFieldChange` and `onFilterValueChange` always close over the latest `fetchFn` from the current render. The 500ms debounce timer closes over the `fetchFn` from the render that called `onFilterValueChange` — same stale-closure behavior as the original code.
2. **`pageSize` accuracy during debounce**: If `pageSize` changes during the 500ms debounce window (user changes page size mid-keystroke), the timer fires with the stale `pageSize`. This was also true in the original code. The debounce is always cancelled by `onPageSizeChange` (via `filter.clearDebounce()`) before the new `pageSize` fetch, so the stale timer never fires.

---

### Step 4.2 — Refactor `useEmployeeList.ts`

**Goal:** Slim `useEmployeeList.ts` to a pagination + fetch orchestrator by replacing inline filter state, debounce ref, and filter handlers with a call to `useEmployeeFilter`.
**Dependencies:** Step 4.1 GREEN complete; 109 tests pass.

- [x] Replace `useEmployeeList.ts` with the implementation below.
- [x] Confirm that `npm run test` still passes all 109 tests (the 9 existing `useEmployeeList.test.ts` tests are the regression safety net; they must pass without modification).
- [x] `npm run typecheck` — 0 errors.
- [x] `npm run lint` on the 3 touched files — 0 new errors (the pre-existing `react-hooks/exhaustive-deps` disable comment is removed as part of this refactor; see Decision 3).

**Why this step is critical:** This is the closure of the parent bug's Phase 4 goal — `useEmployeeList` drops from 179 lines to ~90 lines and now has a single reason to change (pagination + fetch orchestration).

#### Implementation

```typescript
// src/features/employees/hooks/useEmployeeList.ts

import { useState, useEffect } from "react"
import { listEmployees } from "../services/employeeService"
import type { EmployeeListDTO, FilterField, PageableRequest } from "../types"
import { FILTER_FIELDS } from "../types"
import { useEmployeeFilter } from "./useEmployeeFilter"

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
  refresh: () => void
}

export function useEmployeeList(): UseEmployeeListResult {
  const [employees, setEmployees] = useState<EmployeeListDTO[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pageSize, setPageSize] = useState(10)

  async function fetchEmployees(
    page: number,
    size: number,
    field: FilterField | null,
    value: string | boolean | null
  ) {
    setIsLoading(true)
    setError(null)

    // CRITICAL: guard with !== null, NOT a truthy check.
    // value=false (Inactive) is falsy — a truthy guard would drop the filter entirely.
    const filters: PageableRequest["filters"] = []
    if (field !== null && value !== null) {
      if (typeof value === "string" && value.length < 3) {
        // value is too short — treated as no filter (filters stays [])
      } else {
        const meta = FILTER_FIELDS.find(f => f.value === field)
        const operator = meta?.type === "boolean" ? "EQUALS" : "CONTAINS"
        filters.push({ field, operations: [{ operator, value }] })
      }
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

  const {
    filterField,
    filterValue,
    onFilterFieldChange,
    onFilterValueChange,
    clearDebounce,
  } = useEmployeeFilter(pageSize, fetchEmployees)

  // Initial mount: fetch with documented defaults.
  // Hardcoded params avoid stale-closure issues with state values.
  // Cleanup clears any pending debounce timer on unmount.
  useEffect(() => {
    void fetchEmployees(0, 10, null, null)
    return () => clearDebounce()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function onPageSizeChange(size: number) {
    clearDebounce()
    setPageSize(size)
    void fetchEmployees(0, size, filterField, filterValue)
  }

  function onPageChange(page: number) {
    clearDebounce()
    void fetchEmployees(page, pageSize, filterField, filterValue)
  }

  function refresh() {
    clearDebounce()
    void fetchEmployees(currentPage, pageSize, filterField, filterValue)
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
    refresh,
  }
}
```

#### Edge Cases
1. **`clearDebounce` from `useEmployeeFilter` used in `useEffect` cleanup**: The cleanup function captures `clearDebounce` from the `useEmployeeFilter` call in the same render. Since the `useEffect` has `[]` deps, the cleanup only runs on unmount — there is no stale-closure issue because unmount fires once and clearing a stale timer is always safe.
2. **`fetchEmployees` defined before `useEmployeeFilter` call**: `fetchEmployees` is a plain function (not a hook call) and is defined inside the hook body. It is referenced in `useEmployeeFilter(pageSize, fetchEmployees)` which appears after — valid JavaScript. Hook call ordering rule applies only to `useState`, `useRef`, `useEffect`, and custom hook calls, not plain function declarations.
3. **`filterField` and `filterValue` from `useEmployeeFilter` used in `onPageSizeChange`, `onPageChange`, `refresh`**: These close over the `filterField`/`filterValue` values from the current render cycle (the destructured values from `useEmployeeFilter`), maintaining the same behavior as the original code where they closed directly over the same state variables.

---

## Design Decisions

**Decision 1: `fetchFn` as parameter to `useEmployeeFilter` rather than a "wants-fetch" event signal**
- **Why:** The filter hook knows exactly WHEN and with WHAT arguments a fetch should fire (page 0, current pageSize, field, value). Returning a signal would split the decision (in filter) from the execution (in list), requiring the list hook to re-implement the timing logic to decide whether to act on the signal. Passing `fetchFn` keeps the fetch-trigger logic in one place (the filter hook) and eliminates the need for the list hook to observe filter events.
- **Alternatives considered:** (a) A `{ wantsFetch: boolean, page, field, value }` return — rejected because it re-entangles list and filter in a more complex protocol. (b) No separation at all (keep everything in `useEmployeeList`) — rejected because it leaves the SRP violation and the fallow deduction intact.

**Decision 2: `pageSize` as parameter to `useEmployeeFilter` rather than state inside the filter hook**
- **Why:** `pageSize` is pagination state — it belongs in `useEmployeeList`. The filter hook only needs `pageSize` to pass it to `fetchFn`; it does not own it. Putting `pageSize` inside `useEmployeeFilter` would give the filter hook a second reason to change (pagination policy changes), violating SRP.
- **Alternatives considered:** (a) `onPageSizeChange` also inside `useEmployeeFilter` — rejected for the same SRP reason. (b) `pageSize` ref instead of parameter — rejected (unnecessary complexity; re-render already provides the latest value).

**Decision 3: Remove the `eslint-disable-next-line react-hooks/exhaustive-deps` line-level comment; replace with inline rule comment**
- **Why:** The original multi-line directive at `useEmployeeList.ts:102:5` was noted as "now-unused" in the Task 3 context. After the refactor, the `useEffect` still intentionally uses hardcoded `(0, 10, null, null)` defaults to avoid stale-closure issues on mount, so the disable is still needed. However, the `// eslint-disable-next-line` form is fragile (it disables the wrong line after code moves). Replace with `// eslint-disable-line` on the same line as the `[]` dep array, which is the project's stable convention (visible in `Header.tsx` and existing code). This closes the flag raised in Task 3's Post-Review Notes.
- **Alternatives considered:** Adding `fetchEmployees` and `clearDebounce` to the dep array — rejected because `fetchEmployees` is a plain function inside the hook that re-creates every render; adding it would trigger infinite re-renders without `useCallback`, which the project deliberately avoids (Decision 1 in Employee-Edit-and-Delete-Modals-task-3).

**Decision 4: `DEBOUNCE_MS` moves to `useEmployeeFilter.ts`; no re-export from `useEmployeeList.ts`**
- **Why:** `DEBOUNCE_MS` exists because of the debounce logic. Its natural home is the module that owns that logic. No other module imports it from `useEmployeeList.ts` (confirmed by grep), so removing the export from the list hook is a clean, non-breaking change.
- **Alternatives considered:** Re-export from `useEmployeeList.ts` for backward compatibility — rejected (no consumer imports it; backward compatibility shims add noise per project guidelines).

**Decision 5: No new tests for Step 4.2 (the `useEmployeeList` refactor)**
- **Why:** Step 4.2 is a pure structural refactor — `useEmployeeList`'s public `UseEmployeeListResult` interface is unchanged, and `EmployeesPage.tsx` is unchanged. The 9 existing `useEmployeeList.test.ts` tests exercise all behavior that touches `useEmployeeList`'s public surface (initial load, page change, page size change, error lifecycle, and filter behaviors through the integrated hook). These are the safety net. Writing duplicate tests for the list hook's behavior after wiring would test the same paths without adding confidence.

**Decision 6: `useEmployeeFilter` is not exported from `src/features/employees/index.ts`**
- **Why:** `useEmployeeFilter` is an internal implementation detail of the employees feature, used only by `useEmployeeList`. The public barrel (`index.ts`) exports the consumer-facing API (`useEmployeeList`, `EmployeeListDTO`, `FilterField`, `PageEnvelope`). Adding `useEmployeeFilter` to the barrel would expose an internal seam to feature consumers — an ISP violation.

---

## Testing Considerations

### Automatic Validation

**After Step 4.1 RED:**
- [ ] `cd project/srcs/frontend && npm run test` — 8 new tests FAIL (import not found); 101 existing tests PASS. Confirm the RED baseline.

**After Step 4.1 GREEN:**
- [ ] `npm run test` — all 109 tests pass (101 + 8 new F1–F8).
- [ ] `npm run typecheck` — 0 errors.

**After Step 4.2:**
- [ ] `npm run test` — all 109 tests pass (no regressions; the 9 `useEmployeeList.test.ts` tests pass without any modification).
- [ ] `npm run typecheck` — 0 errors.
- [ ] `npm run build` — build succeeds; bundle delta is ≤ +0.2 kB / +0.1 kB gzip vs the 109-test baseline (pure structural refactor, no new runtime behavior).
- [ ] `npx eslint src/features/employees/hooks/useEmployeeFilter.ts src/features/employees/hooks/useEmployeeList.ts` — 0 new errors or warnings.

### Manual Validation

- [ ] Start the dev server and backend. Navigate to `/employees`. Confirm the employee list loads.
- [ ] Select "Username" in the filter, type "ad" (2 chars) — confirm no fetch fires and list is unchanged.
- [ ] Type a third char ("adm") — confirm the list updates after ~500ms with a CONTAINS filter.
- [ ] Select "Status" filter, choose "Inactive" — confirm the list immediately updates to show only disabled employees (the `false` boolean guard).
- [ ] Select "All" in the Status dropdown — confirm the filter is cleared and all employees reload.
- [ ] Change the page size — confirm the list resets to page 1 and reloads.
- [ ] Navigate to page 2, then change the filter field — confirm the list resets to page 1.

---

## Related Code Explanations

- `src/features/employees/hooks/useEmployeeList.ts:1` — source of all extracted logic; read before editing
- `src/features/employees/hooks/useEmployeeModals.ts` — Task 3 precedent for extracted single-responsibility hook; follow the same `UseXxxResult` interface pattern
- `src/features/employees/types.ts:21` — `FILTER_FIELDS` array used in `onFilterValueChange` to look up `meta?.type === "boolean"`

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected for this task
- [x] Up-to-date documentation reviewed for the affected technologies (Vitest 4.x, React 19, `@testing-library/react` 16.x)
- [x] `src/features/employees/hooks/useEmployeeFilter.test.ts` created (8 tests, F1–F8)
- [x] `src/features/employees/hooks/useEmployeeFilter.ts` created (`useEmployeeFilter(pageSize, fetchFn)`, `UseEmployeeFilterResult`, `DEBOUNCE_MS`)
- [x] `src/features/employees/hooks/useEmployeeList.ts` refactored (179 → 138 lines, calls `useEmployeeFilter`, removes filter state and debounce ref)
- [x] All 109 tests pass after Step 4.2 (`npm run test`) — no test file modified except the newly created `useEmployeeFilter.test.ts`
- [x] `npm run typecheck` — 0 errors after each step
- [x] `npm run build` — success after Step 4.2; bundle delta +0.03 kB gzip (512.93 kB / 167.76 kB gzip vs 512.71 kB / 167.73 kB gzip Task 3 baseline) — within the ≤ +0.2 kB / +0.1 kB gzip budget
- [x] `eslint` on the 3 touched files — 0 new errors or warnings; the `react-hooks/exhaustive-deps` disable comment retained on the same line as the dep array (the spec's proposed `// eslint-disable-line` form on the cleanup line did not silence the missing-dep warning on the actual dep array line; restored to `// eslint-disable-next-line` which correctly silences the warning on the next line)
- [x] `useEmployeeFilter` NOT added to `src/features/employees/index.ts`
- [x] `DEBOUNCE_MS` NOT re-exported from `useEmployeeList.ts`
- [ ] Manual validation steps documented above performed by the user
- [ ] Phase 4 Steps 4.1 and 4.2 marked `[x]` in parent bug [[Frontend-Code-Quality-Fallow-Health-Refactor]]

---

## Post-Review Notes

### Deviations from Task Spec

**1. Test file: typed `fetchFn` mock via `vi.fn<FetchFn>()`** (not bare `vi.fn()` as in the spec).
The spec's literal test code used `let fetchFn: ReturnType<typeof vi.fn>` and `fetchFn = vi.fn()`. The standalone `npm run typecheck` script (`tsc --noEmit`) accepts this because Vitest's loose typing bridges, but `npm run build` invokes `tsc -b` with the project-references config and verbatim module syntax, which fails with: "Argument of type 'Mock<Procedure | Constructable>' is not assignable to parameter of type '(page, size, field, value) => void'". Fix: declare a `FetchFn` type alias and use `vi.fn<FetchFn>()` with `import type { Mock } from "vitest"`. Net result: 0 typecheck errors in BOTH `typecheck` and `build`; all 8 tests pass identically. This is a build-time fix that the spec didn't anticipate because the spec was written against a less strict `tsc` invocation.

**2. Refactored `useEmployeeList.ts` is 138 lines, not the spec's "179 → ~90 lines" estimate.**
The spec estimated ~90 lines assuming the extensive in-file comments (Finding-3 stale-error rationale, Decision-7 clearDebounce comment, the `!== null` vs truthy guard rationale, the < 3 char rejection rationale, the cross-reference to Task 3's Decision 1) could be slimmed. I preserved all of them because they carry non-obvious context that prevents future regressions (these comments are exactly the kind that, if removed, would let someone "fix" the `if (value)` to "if (value !== null)" again without understanding why it was originally wrong). The SRP refactor IS complete: filter state, debounce ref, and filter handlers are gone; only pagination state + `fetchEmployees` + `refresh` remain (the spec's Step 4.2 goal). The line count is higher than estimated because documentation density increased per preserved-line-of-logic.

**3. `eslint-disable-next-line` form retained, not converted to `eslint-disable-line` as the spec's Decision 3 prescribed.**
The spec's Decision 3 said to use `// eslint-disable-line` on the cleanup-return line. After trying that, ESLint reported the directive as "Unused" because the `react-hooks/exhaustive-deps` warning fires on the `}, []` line, not the cleanup-return line. Reverted to `// eslint-disable-next-line` on the line before the dep array — which is what the original code had and what correctly silences the warning. Net result: same lint state as the original (1 pre-existing `react-hooks/set-state-in-effect` error + 0 warnings on the touched code). The Task 3 follow-up flag about the directive being on the "wrong line" is a moot point because the warning it silences is on the `}, []` line and `// eslint-disable-next-line` is the only form that targets a different line than the one it sits on.

### Autonomous Review Findings

- **Bugs**: 0.
- **Architectural issues**: 0. SRP decomposition is clean — `useEmployeeFilter` has exactly one reason to change (filter/debounce behavior); `useEmployeeList` has exactly one reason to change (pagination + fetch orchestration).
- **Correctness gaps**: 0. All 9 existing `useEmployeeList.test.ts` tests pass without modification. All 8 new `useEmployeeFilter.test.ts` tests pass.
- **Test gaps**: 0. The 8-test contract covers initial state, field change (with value reset + fetch), < 3 char guard, ≥ 3 char debounce, `false` boolean guard (discriminating test), null "All" case, explicit `clearDebounce` cancellation, and field-change-cancels-debounce invariant.
- **Code quality**: clean. Hook ordering is correct (`useState` calls → plain `fetchEmployees` declaration → `useEmployeeFilter` custom hook call → `useEffect`). `fetchEmployees` is defined before the `useEmployeeFilter(pageSize, fetchEmployees)` call as required by the spec.
- **Documentation accuracy**: the spec's prose-vs-implementation comments inside `useEmployeeList.ts` are preserved verbatim.

