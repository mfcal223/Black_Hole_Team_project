# Task: `useAgentList` Hook (TDD) + Feature Index

#task #current #low-complexity #parent-employee-agent-management-page

**Parent:** [[Features/to-do/Employee-Agent-Management-Page]]
**Parent Type:** Feature
**Related Step(s):** Phase 3, Steps 3.1, 3.2, 3.3
**Estimated Complexity:** Low

---

## Goal

Create the `useAgentList` pagination hook via TDD (RED → GREEN) and the `features/agents/index.ts` barrel. After this task, the agent list hook manages all pagination state behind a minimal typed interface, backed by 6 passing behavior tests, and the agents feature has a defined public API surface.

---

## Parent Context

The parent feature (`[[Features/to-do/Employee-Agent-Management-Page]]`) defines `useAgentList` as the core data-fetching module for the Agents page. It owns all pagination state — page, pageSize, sort, loading flag, error, and the list data — behind a 10-member return interface. No filter logic is included; `filters: []` is always sent unconditionally.

**Interface exposed (from parent spec, Section 5):**
```typescript
interface UseAgentListResult {
  agents: AgentListDTO[]
  totalPages: number
  totalElements: number
  currentPage: number
  isLoading: boolean
  error: string | null
  pageSize: number
  onPageSizeChange: (size: number) => void
  onPageChange: (page: number) => void
  refresh: () => void
}
```

**Business rules (from parent spec):**
- On mount: fetch with `{ page: 0, size: 10, sort: [{ field: "createdAt", direction: "DESC" }], filters: [] }`
- On `onPageSizeChange`: reset to page 0, fetch immediately
- On `onPageChange`: update page, fetch immediately
- `refresh()`: re-fetch the current page/size
- Error lifecycle: set `error` to `null` at the start of every fetch; set on failure; clear on next successful fetch

**Finding 3 from `[[Bugs/to-do/Review-Employee-Agent-Management-Page]]`** (Low severity): instead of a named sort constant, use a **single internal `fetchAgents(page, size)` function** called by all paths. This eliminates multi-path sort divergence risk and is consistent with the `useEmployeeList` pattern. This task adopts Option (b) of that finding.

**Backend ownership scoping:** `POST /agent/list` automatically scopes to the authenticated employee. The hook sends `filters: []` unconditionally — no `ownerId` filter is needed.

**Default sort:** The backend `AgentQueryProfile` defaults to `createdAt DESC`. The hook must pass `sort: [{ field: "createdAt", direction: "DESC" }]` in all requests so the most recently created agent appears first.

The `index.ts` barrel (Step 3.3) is trivial and naturally grouped with the hook it exposes.

**Prior art:** `src/features/employees/hooks/useEmployeeList.ts` and `.test.ts` — the agent list hook is explicitly simpler: no filter sub-hook (`useEmployeeFilter`), no debouncing, fixed sort. The test pattern (vi.mock factory, makeEnvelope helper, `act` + `Promise.resolve()` flush, deferred promise for intermediate state) is identical.

---

## Preconditions / Dependencies

- Task 1 complete: `src/types/api.ts` exists with `PageableRequest` and `PageEnvelope<T>` (executed 2026-06-29).
- Task 2 complete: `src/features/agents/types.ts` and `src/features/agents/services/agentService.ts` exist (executed 2026-06-29).
- Test baseline: **137/137** across 24 test files (confirmed by Task 2 execution 2026-06-29).
- `src/features/agents/hooks/` directory does **not** exist yet — created in Step 3.1.
- `src/features/agents/index.ts` does **not** exist yet — created in Step 3.3.
- Frontend project root: `project/srcs/frontend/`. All commands run from that directory.
- `@/` path alias resolves to `src/` in both `tsconfig.app.json` and `vitest.config.ts` (vitest 4.1.9, confirmed).
- `vi.mock` factory hoisting is available (established by `useCreateEmployee.test.ts` and `useEditEmployee.test.ts` patterns).

---

## Skills and Documentation Preparation

### Skills Reviewed

| Skill | Selected | Purpose |
|-------|----------|---------|
| `documentation-management` | Yes | Task template and doc placement |
| `solid-deep-design` | Yes | `useAgentList` deep module analysis |
| `memory-bank` | Yes | Confirmed test baseline, path aliases, prior art locations |
| `tdd` | Yes | RED → GREEN; tests verify public interface behavior only |
| `find-docs` | Not needed | All patterns are established in the codebase; no new library APIs |
| `glossary-management` | Not needed | No new domain terms introduced |

### Documentation Reviewed

- `documentation/Features/to-do/Employee-Agent-Management-Page.md` — Steps 3.1, 3.2, 3.3 spec; `UseAgentListResult` interface; business rules
- `documentation/Bugs/to-do/Review-Employee-Agent-Management-Page.md` — Finding 3 (single fetch function) → Design Decision 1
- `documentation/Docs/API-Reference/Agent.md` — `POST /agent/list`; sort field options; employee-scoped list behavior
- `documentation/ADRs/ADR-009-long-primary-key-for-all-entities.md` — `id: number` (Java Long → TypeScript number)

### Related Existing Code

| File | Role |
|------|------|
| `src/features/agents/types.ts` | `AgentListDTO`, `AgentDTO`, `PageableRequest`, `PageEnvelope` — created in Task 2 |
| `src/features/agents/services/agentService.ts` | `listAgents` — the only external dependency of `useAgentList` |
| `src/types/api.ts` | Canonical `PageableRequest` and `PageEnvelope<T>` |
| `src/features/employees/hooks/useEmployeeList.ts` | Prior art: single fetch function, error lifecycle, `setCurrentPage(envelope.number)`, `eslint-disable` pattern |
| `src/features/employees/hooks/useEmployeeList.test.ts` | Prior art: `vi.mock` factory, `makeEnvelope` helper, `act(async () => { await Promise.resolve() })` flush, deferred promise pattern |
| `src/features/employees/index.ts` | Prior art for `index.ts` barrel structure |

---

## Implementation Details

### Approach

`useAgentList` is a **deep module**:
- **Interface**: one `useAgentList()` call that returns 10 members (agents, totalPages, totalElements, currentPage, isLoading, error, pageSize, onPageSizeChange, onPageChange, refresh).
- **Implementation**: hides 7 `useState` calls, 1 `useEffect`, 1 internal async `fetchAgents` function, `PageableRequest` construction with fixed sort and empty filters, `listAgents` service call, state update cascade (content, totalPages, totalElements, currentPage), error extraction and lifecycle, and the "error cleared at start of fetch" invariant.
- **SRP**: one reason to change — how the agent list is fetched and paginated. No filter logic, no form state, no debounce.
- **Deletion test**: without this hook, `AgentsPage` would need 7 `useState` calls, a `useEffect`, a `fetchAgents` function, and 3 handlers. Deleting it scatters complexity across the page component — the hook earns its depth.
- **DIP**: imports `listAgents` from `"../services/agentService"`. The service is the infrastructure adapter; the hook is the application-layer consumer. Tests mock the service to verify hook behavior in isolation.

All four paths (mount, `onPageSizeChange`, `onPageChange`, `refresh`) call the same `fetchAgents(page, size)` function. The sort and filters are defined once inside it.

### Files to Create / Modify

- [ ] `src/features/agents/hooks/useAgentList.test.ts` — **Create** — 6 behavior tests (RED first)
- [ ] `src/features/agents/hooks/useAgentList.ts` — **Create** — pagination hook implementation (GREEN)
- [ ] `src/features/agents/index.ts` — **Create** — feature public API barrel

---

## Step-by-Step Implementation

### Step 3.1 RED — Create `src/features/agents/hooks/useAgentList.test.ts`

**Goal:** Write 6 failing tests that fully specify `useAgentList` behavior. Confirm RED before proceeding.
**Dependencies:** Task 2 complete (`agentService.ts` and `types.ts` exist).

- [x] Create directory `src/features/agents/hooks/`
- [x] Create `src/features/agents/hooks/useAgentList.test.ts` with the content below
- [x] Run `npm run test` — confirm **RED**: vitest reports import resolution failure for `"./useAgentList"` (6 new tests fail); existing 137 tests still pass

**Why this step is critical:**
Confirming RED first ensures the tests are real tests, not vacuously-passing assertions. The tests describe the hook's complete behavioral contract.

#### Implementation

```typescript
// src/features/agents/hooks/useAgentList.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useAgentList } from "./useAgentList"
import { listAgents } from "../services/agentService"
import type { PageEnvelope, AgentListDTO } from "../types"

// Mock all service exports to prevent HTTP leaks from any function in the module.
// The module factory pattern (string path + factory function) is hoisted before
// imports by Vitest — this is the established pattern in this codebase.
vi.mock("../services/agentService", () => ({
  listAgents: vi.fn(),
  getAgent: vi.fn(),
  createAgent: vi.fn(),
  updateAgent: vi.fn(),
  deleteAgent: vi.fn(),
}))

// listAgents imported as a value (not import type) — required by verbatimModuleSyntax: true
// because vi.mocked(listAgents) needs the runtime function reference, not an erased type.
const mockListAgents = vi.mocked(listAgents)

// Helper to create a minimal, valid PageEnvelope for mocking.
function makeEnvelope(
  overrides: Partial<PageEnvelope<AgentListDTO>> = {}
): PageEnvelope<AgentListDTO> {
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

describe("useAgentList", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListAgents.mockResolvedValue(makeEnvelope())
  })

  // ── Test 1: Initial load ──────────────────────────────────────────────────────
  it("fetches agents with default params on mount", async () => {
    const { result } = renderHook(() => useAgentList())

    // Flush the useEffect and the async listAgents promise
    await act(async () => {
      await Promise.resolve()
    })

    expect(mockListAgents).toHaveBeenCalledOnce()
    expect(mockListAgents).toHaveBeenCalledWith({
      page: 0,
      size: 10,
      sort: [{ field: "createdAt", direction: "DESC" }],
      filters: [],
    })
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  // ── Test 2: Page change ───────────────────────────────────────────────────────
  it("fetches with the updated page number when onPageChange is called", async () => {
    const { result } = renderHook(() => useAgentList())
    await act(async () => { await Promise.resolve() })

    mockListAgents.mockClear()
    mockListAgents.mockResolvedValue(makeEnvelope({ number: 2 }))

    await act(async () => {
      result.current.onPageChange(2)
    })

    expect(mockListAgents).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2 })
    )
    expect(result.current.currentPage).toBe(2)
  })

  // ── Test 3: Page size change resets to page 0 ─────────────────────────────────
  it("resets to page 0 and fetches with the new size when onPageSizeChange is called", async () => {
    const { result } = renderHook(() => useAgentList())
    await act(async () => { await Promise.resolve() })

    // Navigate to page 2 first to verify the reset
    mockListAgents.mockResolvedValue(makeEnvelope({ number: 2 }))
    await act(async () => {
      result.current.onPageChange(2)
    })
    expect(result.current.currentPage).toBe(2)

    mockListAgents.mockClear()
    mockListAgents.mockResolvedValue(makeEnvelope({ number: 0 }))

    await act(async () => {
      result.current.onPageSizeChange(25)
    })

    // Must send page: 0 (reset) with the new size — NOT page: 2
    expect(mockListAgents).toHaveBeenCalledWith(
      expect.objectContaining({ page: 0, size: 25 })
    )
  })

  // ── Test 4: refresh() re-fetches with current page and size ───────────────────
  // <!-- REVIEW-FIX: expanded test to change BOTH pageSize (25) and page (1) before calling
  // refresh(), so the assertion verifies size tracking in addition to page tracking.
  // Original only changed the page (size stayed at default 10), leaving the "current size"
  // part of the spec ("re-fetches with the current page and size") untested. -->
  it("re-fetches with the current page and size when refresh is called", async () => {
    const { result } = renderHook(() => useAgentList())
    await act(async () => { await Promise.resolve() })

    // Change size to 25 (non-default) so the assertion verifies size tracking, not just page
    mockListAgents.mockResolvedValue(makeEnvelope({ number: 0 }))
    await act(async () => {
      result.current.onPageSizeChange(25)
    })

    // Navigate to page 1 so refresh() must send both the non-default page and size
    mockListAgents.mockResolvedValue(makeEnvelope({ number: 1 }))
    await act(async () => {
      result.current.onPageChange(1)
    })
    expect(result.current.currentPage).toBe(1)

    mockListAgents.mockClear()
    mockListAgents.mockResolvedValue(makeEnvelope({ number: 1 }))

    await act(async () => {
      result.current.refresh()
    })

    // refresh() must send page: 1 (current), size: 25 (current — changed from default 10)
    expect(mockListAgents).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, size: 25 })
    )
  })

  // ── Test 5: Failed fetch sets error; subsequent success clears error ───────────
  it("sets error on failed fetch and clears error to null after a subsequent successful fetch", async () => {
    mockListAgents.mockRejectedValueOnce(new Error("Network error"))

    const { result } = renderHook(() => useAgentList())
    await act(async () => { await Promise.resolve() })

    expect(result.current.error).not.toBeNull()
    expect(result.current.agents).toEqual([])

    // Retry with success
    mockListAgents.mockResolvedValue(makeEnvelope())
    await act(async () => {
      result.current.onPageChange(0)
    })

    expect(result.current.error).toBeNull()
  })

  // ── Test 6: Error cleared at start of each fetch (before resolution) ──────────
  it("clears error to null at the start of each new fetch, before the promise resolves", async () => {
    // Establish an error state from a failed initial load
    mockListAgents.mockRejectedValueOnce(new Error("Server error"))

    const { result } = renderHook(() => useAgentList())
    await act(async () => { await Promise.resolve() })

    expect(result.current.error).not.toBeNull()

    // Set up a deferred promise for the retry so we can inspect mid-fetch state
    let resolveRetry!: (value: PageEnvelope<AgentListDTO>) => void
    mockListAgents.mockImplementationOnce(
      () => new Promise<PageEnvelope<AgentListDTO>>(res => { resolveRetry = res })
    )

    // Start the retry. setError(null) is called synchronously before the first
    // await inside fetchAgents, so act() returns with error already cleared even
    // though the deferred promise is still unresolved.
    await act(async () => {
      result.current.onPageChange(0)
    })

    // Error is null before the deferred promise resolves — this is the invariant under test
    expect(result.current.error).toBeNull()

    // Resolve the deferred promise to clean up hanging async state
    await act(async () => {
      resolveRetry(makeEnvelope())
    })

    expect(result.current.error).toBeNull()
  })
})
```

#### Edge Cases

1. **`vi.mock` factory includes all 5 service exports** — `useAgentList` only calls `listAgents`, but the factory mocks all 5 exports to prevent HTTP leaks if a future import is added to the hook without updating the mock.
2. **`await act(async () => { await Promise.resolve() })`** — flushes the synchronous `useEffect` callback and the microtask queue where the `listAgents` promise resolves. Without this, `expect(mockListAgents).toHaveBeenCalledOnce()` would see 0 calls because the effect has not fired yet.
3. **`mockListAgents.mockClear()` within tests** — resets just the call history of `listAgents` to start counting from 0 for the post-navigation assertion, while preserving the `mockResolvedValue` set in `beforeEach`.
4. **Deferred promise in Test 6** — the `resolveRetry!` non-null assertion is intentional; TypeScript knows the assignment always happens inside the synchronous factory callback before `resolveRetry` is referenced.
5. **`number: 2` in Test 2 mock envelope** — `makeEnvelope({ number: 2 })` sets the `number` field of the response, which `fetchAgents` maps to `setCurrentPage(envelope.number)`. This ensures `result.current.currentPage` is 2 after the mock resolves.
6. **No `vi.useFakeTimers()`** — `useAgentList` has no timers or debouncing. Unlike `useEmployeeList.test.ts`, fake timers are not needed and should not be added.

---

### Step 3.2 GREEN — Create `src/features/agents/hooks/useAgentList.ts`

**Goal:** Implement `useAgentList` so all 6 tests pass. Run the full test suite to confirm GREEN and zero regressions.
**Dependencies:** Step 3.1 complete (RED confirmed).

- [x] Create `src/features/agents/hooks/useAgentList.ts` with the content below
- [x] Run `npm run test` — confirm **GREEN**: **143/143** (137 baseline + 6 new), 0 failures, 0 regressions
- [x] Run `npm run typecheck` — confirm 0 errors
- [x] Run `npm run build` — confirm Vite build succeeds

**Why this step is critical:**
This hook is the core data-fetching module for the Agents page. All subsequent Tasks (4–6) depend on it being correct.

#### Implementation

```typescript
// src/features/agents/hooks/useAgentList.ts

import { useState, useEffect } from "react"
import { listAgents } from "../services/agentService"
import type { PageableRequest, AgentListDTO } from "../types"

interface UseAgentListResult {
  agents: AgentListDTO[]
  totalPages: number
  totalElements: number
  currentPage: number
  isLoading: boolean
  error: string | null
  pageSize: number
  onPageSizeChange: (size: number) => void
  onPageChange: (page: number) => void
  refresh: () => void
}

export function useAgentList(): UseAgentListResult {
  const [agents, setAgents] = useState<AgentListDTO[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pageSize, setPageSize] = useState(10)

  async function fetchAgents(page: number, size: number) {
    setIsLoading(true)
    setError(null)  // clear stale error at the START of every fetch (Test 6)

    const request: PageableRequest = {
      page,
      size,
      sort: [{ field: "createdAt", direction: "DESC" }],
      filters: [],
    }

    try {
      const envelope = await listAgents(request)
      setAgents(envelope.content)
      setTotalPages(envelope.totalPages)
      setTotalElements(envelope.totalElements)
      setCurrentPage(envelope.number)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't fetch the agents. Please try again."
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Initial mount: fetch with documented defaults.
  // Hardcoded params avoid stale-closure issues with state values.
  useEffect(() => {
    void fetchAgents(0, 10)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function onPageSizeChange(size: number) {
    setPageSize(size)
    void fetchAgents(0, size)
  }

  function onPageChange(page: number) {
    void fetchAgents(page, pageSize)
  }

  function refresh() {
    void fetchAgents(currentPage, pageSize)
  }

  return {
    agents,
    totalPages,
    totalElements,
    currentPage,
    isLoading,
    error,
    pageSize,
    onPageSizeChange,
    onPageChange,
    refresh,
  }
}
```

#### Edge Cases

1. **`fetchAgents(0, 10)` in `useEffect`** — hardcoded default values avoid a stale closure. Consistent with `useEmployeeList.ts` which uses `void fetchEmployees(0, 10, null, null)`.
2. **`setCurrentPage(envelope.number)` not `setCurrentPage(page)`** — the backend's `number` field (zero-indexed page actually returned) is used. The backend is the source of truth. If a fetch fails, `currentPage` remains at the last successfully fetched page; `refresh()` re-fetches that page.
3. **`eslint-disable-next-line react-hooks/exhaustive-deps`** — required to avoid an infinite re-render loop. Adding `fetchAgents` to the dependency array would re-create it on every render, triggering the effect on every render. The disable comment is intentional and pre-approved by the `useEmployeeList.ts` precedent.
4. **`setError(null)` before first `await`** — the synchronous `setError(null)` call happens before the `await listAgents(request)` suspension point. React batches this state update, but the assignment is observable as `null` mid-fetch (before resolution) when inspected via a deferred promise in tests — exactly what Test 6 verifies.
5. **No `useCallback` for handlers** — consistent with `useEmployeeList.ts`. The handlers are plain function declarations; they are redefined on each render but not passed to children that depend on referential equality for memoization.
6. **`void` before `fetchAgents` calls in handlers** — `fetchAgents` returns `Promise<void>`. Handlers are not `async`; using `void` explicitly abandons the promise and suppresses the TypeScript floating-promise error, consistent with the employees hook.

---

### Step 3.3 — Create `src/features/agents/index.ts`

**Goal:** Define the feature's public API surface. Only `useAgentList` and the two types needed by page-layer consumers are exported; all other internals stay private.
**Dependencies:** Step 3.2 complete (hook exists and tests pass).

- [x] Create `src/features/agents/index.ts` with the content below
- [x] Run `npm run typecheck` — confirm 0 errors

**Why this step is critical:**
The barrel file enforces the feature-boundary rule: `AgentsPage` and other outer modules import from `@/features/agents`, never directly from `@/features/agents/hooks/useAgentList`. This prevents callers from taking undocumented dependencies on internal modules.

#### Implementation

```typescript
// src/features/agents/index.ts

export { useAgentList } from "./hooks/useAgentList"
export type { AgentListDTO, AgentDTO } from "./types"
```

#### Edge Cases

1. **`AgentDTO` exported alongside `AgentListDTO`** — the edit modal (Task 5) receives an `AgentListDTO` from the table row and internally loads the full `AgentDTO` via `getAgent(id)`. `AgentDTO` must be on the public surface so `useEditAgent` and `EditAgentModal` can reference it without crossing into feature internals.
2. **Modal hooks NOT exported** — `useCreateAgent`, `useEditAgent`, `useDeleteAgent`, `useAgentModals` are internal. They are consumed only by components within `features/agents/`. Exporting them prematurely would expose unstable interfaces.
3. **Service functions NOT exported** — `listAgents`, `getAgent`, etc. are infrastructure adapters; they stay internal per the feature-slice convention established in `features/employees/index.ts`.

---

## Design Decisions

**Decision 1: Single `fetchAgents(page, size)` function for all paths**

All four paths (mount effect, `onPageSizeChange`, `onPageChange`, `refresh`) call the same `fetchAgents(page, size)` function. The sort `[{ field: "createdAt", direction: "DESC" }]` and `filters: []` are defined once inside it.

- **Why:** Eliminates multi-path divergence risk (Finding 3 from `[[Bugs/to-do/Review-Employee-Agent-Management-Page]]`). A future maintainer adding a new fetch trigger cannot accidentally omit the sort. The single function is also easier to read, test, and maintain. Consistent with `useEmployeeList`'s `fetchEmployees` pattern.
- **Alternatives considered:** Define `DEFAULT_SORT` as a module-level constant — rejected per Finding 3 Option (b). A constant adds indirection without adding clarity when there is only one internal call site.

**Decision 2: `setCurrentPage(envelope.number)` instead of `setCurrentPage(page)`**

`currentPage` is set from the backend response `envelope.number`, not from the argument passed to `fetchAgents`.

- **Why:** The backend is the source of truth for the actual page returned. If the requested page exceeds `totalPages - 1`, the backend may return the last page. Setting from the response ensures the displayed page indicator is always accurate.
- **Consequences:** If a fetch fails, `currentPage` stays at the last successfully fetched page. `refresh()` re-fetches that page — correct behavior (retry the last known good page).
- **Alternatives considered:** `setCurrentPage(page)` immediately in handlers — rejected; this would display a page indicator that doesn't match the content until the fetch resolves or errors.

**Decision 3: No `useCallback` for handlers**

`onPageSizeChange`, `onPageChange`, and `refresh` are plain function declarations inside the hook body.

- **Why:** Consistent with `useEmployeeList.ts`. `AgentsPage` is the sole consumer of these callbacks and does not memo-ize its children based on handler referential equality. Adding `useCallback` would add complexity without measurable benefit.
- **Alternatives considered:** Wrap in `useCallback` — rejected; no consumer currently depends on referential equality, and adding it proactively violates the "no speculative abstractions" rule.

**Decision 4: `AgentDTO` in the `index.ts` barrel from the start**

`AgentDTO` (the full detail type) is exported from the feature barrel alongside `AgentListDTO` when the barrel is first created, not deferred to Task 4.

- **Why:** `useEditAgent` (Task 4) returns `AgentDTO` fields after loading via `getAgent(id)`. The `EditAgentModal` (Task 5) needs `AgentDTO` as a type reference. Exporting it now means the barrel requires no modification in Tasks 4–5, reducing inter-task coupling.
- **Alternatives considered:** Export only `AgentListDTO` now, add `AgentDTO` in Task 4 — rejected; the barrel is better specified completely at creation time.

---

## Testing Considerations

### Automatic Validation

- [x] Run `npm run test` after Step 3.1 — confirm **RED**: 6 new tests fail with `"Failed to resolve import './useAgentList'"` (or similar module-not-found); existing **137 tests still pass**
- [x] Run `npm run test` after Step 3.2 — confirm **GREEN**: **143/143** (137 baseline + 6 new), 0 failures, 0 regressions
- [x] Run `npm run typecheck` after Step 3.2 — confirm 0 errors
- [x] Run `npm run build` after Step 3.2 — confirm Vite build succeeds (expected bundle delta: ≤ +1 kB from new hook module)
- [x] Run `npm run typecheck` after Step 3.3 — confirm 0 errors (barrel exports resolve)

No manual validation required for this task. The hook has no UI and the 6 tests fully verify all behavior through the public interface.

---

## Related Code Explanations

- `src/features/agents/services/agentService.ts` — `listAgents` is the hook's only external dependency; the hook treats it as an opaque async function returning `PageEnvelope<AgentListDTO>`
- `src/features/agents/types.ts` — `AgentListDTO`, `AgentDTO`, `PageableRequest` and `PageEnvelope` re-exported from `@/types/api`
- `src/types/api.ts` — canonical `PageableRequest` and `PageEnvelope<T>`
- `src/features/employees/hooks/useEmployeeList.ts:36` — `fetchEmployees` single-function pattern; `setCurrentPage(envelope.number)`; `eslint-disable` for exhaustive-deps
- `src/features/employees/hooks/useEmployeeList.test.ts:270` — deferred promise pattern for intermediate error state test (used in Test 6)

---

## Completion Criteria

- [x] `src/features/agents/hooks/useAgentList.test.ts` created with 6 behavior tests following the `vi.mock` factory pattern; **RED confirmed** before Step 3.2
- [x] `src/features/agents/hooks/useAgentList.ts` created with `UseAgentListResult` interface and all 10 return members; single `fetchAgents(page, size)` function; fixed `createdAt DESC` sort; `filters: []` unconditional; `setError(null)` before first `await`
- [x] All 6 new tests pass after Step 3.2 GREEN: initial load with defaults, page change, page size change + page 0 reset, refresh with current page/size, failed fetch sets error, error cleared before resolution
- [x] `npm run test` passes with **143/143** (137 baseline + 6 new), 0 regressions
- [x] `npm run typecheck` passes with 0 errors
- [x] `npm run build` succeeds
- [x] `src/features/agents/index.ts` created with `useAgentList` hook and `AgentListDTO` / `AgentDTO` type exports
- [x] Parent feature Steps 3.1, 3.2, 3.3 marked `[x]` in `documentation/Features/to-do/Employee-Agent-Management-Page.md` with a wiki link to this task document
