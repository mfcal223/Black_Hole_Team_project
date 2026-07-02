# Task: Conversation List Hook (TDD)

#task #current #low-complexity #parent-conversation-history-list-and-delete

**Parent:** [[Features/to-do/Conversation-History-List-and-Delete]]
**Parent Type:** Feature
**Related Step(s):** Phase 2 — Step 2.1, Step 2.2
**Estimated Complexity:** Low
**Depends On:** Task 1 (types and service must exist and pass tests)

---

## Goal

Create the pagination and fetch state management hook (`useConversationList`) that owns conversation list state, exposes pagination controls, and handles loading/error/refresh behaviors. Built test-first with `renderHook` and service mocking. This hook is the single source of truth for list state — all later components and page logic depend on it.

---

## Parent Context

The feature replaces the placeholder `/conversations` page with a paginated, last-activity-ordered list of the authenticated employee's conversations, each with a delete action. This task implements the **state and fetch logic** that powers the list. The hook mirrors `useAgentList` exactly except for the sort field: conversations are ordered by `updatedAt DESC` (last activity first) instead of `createdAt DESC`.

---

## Preconditions / Dependencies

- **Task 1 complete:** `conversationService.ts` and `conversationService.test.ts` exist and pass tests. The service exports `listConversations(request: PageableRequest): Promise<PageEnvelope<ConversationListDTO>>`.
- **Reference implementation exists:** `project/srcs/frontend/src/features/agents/hooks/useAgentList.ts` and `useAgentList.test.ts` — the exact pattern to mirror.
- **Test utilities available:** Vitest `renderHook`, `act` from `@testing-library/react`, `vi.mock()` for service mocking.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `tdd` — **Selected** — Steps 2.1/2.2 are a RED→GREEN cycle; the hook is tested before it is written.
- `solid-deep-design` — **Selected** — the hook concentrates pagination state and service coordination behind a single interface; callers depend on the hook, not on the service directly.

### Documentation Reviewed

- In-repo prior art (version-matched, currently passing): `project/srcs/frontend/src/features/agents/hooks/useAgentList.ts` and `useAgentList.test.ts` — the exact pattern to mirror.
- Parent decision: conversations are ordered by `updatedAt DESC` (last activity first), not `createdAt DESC`.
- Pinned versions (from `project/srcs/frontend/package.json`): `@testing-library/react@^16.3.2`, `vitest@^4.1.9`.

### Related Existing Code

- `src/features/agents/hooks/useAgentList.ts` — the hook to mirror exactly, changing sort field and DTO type.
- `src/features/agents/hooks/useAgentList.test.ts` — the test structure to mirror (6 tests covering mount, page change, page size change, refresh, error handling, mid-fetch error clear).
- `src/features/conversations/services/conversationService.ts` — the service this hook will call (Task 1).
- `src/features/conversations/types.ts` — `ConversationListDTO`, `PageableRequest`, `PageEnvelope` (Task 1).

---

## Implementation Details

### Approach

Mirror `useAgentList`, changing only the sort field to `updatedAt DESC` (last activity, most recent first). One test file with 6 tests, one implementation file.

The hook owns:
- Conversation list state (content, pagination metadata)
- Current page and page size
- Loading and error states
- Fetch logic and lifecycle (initial mount, page change, page size change, manual refresh)
- Error recovery (clearing stale errors at the start of each fetch)

The hook exposes a clean interface for callers:
```typescript
interface UseConversationListResult {
  conversations: ConversationListDTO[]
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

### Files to Create/Modify

- [x] `src/features/conversations/hooks/useConversationList.test.ts` — RED tests for all behaviors.
- [x] `src/features/conversations/hooks/useConversationList.ts` — GREEN implementation.

---

## Step-by-Step Implementation

### Step 2.1 (RED): Create `useConversationList.test.ts`

**Goal:** Encode all hook behaviors as failing tests before the hook is written.
**Dependencies:** Task 1 (service and types must exist).

- [ ] Create `src/features/conversations/hooks/useConversationList.test.ts`.
- [ ] Mock the `conversationService` module (both `listConversations` and `deleteConversation` to prevent accidental HTTP leaks).
- [ ] Write 6 tests, each testing one behavior:
  1. **Initial load:** Hook fetches with `sort: updatedAt DESC, page: 0, size: 10` on mount.
  2. **Page change:** `onPageChange(n)` re-fetches with the new page, keeping size constant.
  3. **Page size change resets to page 0:** `onPageSizeChange(n)` re-fetches with page 0 and the new size.
  4. **Refresh with current page and size:** `refresh()` re-fetches using the current page and size (changed in prior tests).
  5. **Error recovery:** Failed fetch sets error; subsequent success clears it.
  6. **Error cleared at start of fetch:** Error is `null` before a retry promise resolves (mid-fetch state).
- [ ] Run the suite and confirm RED: the import of `./useConversationList` fails to resolve.

**Why this step is critical:** The tests pin the API contract (sort field, pagination semantics) so the implementation and any later refactor cannot silently break the sort order or pagination behavior.

#### Implementation

```typescript
// src/features/conversations/hooks/useConversationList.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useConversationList } from "./useConversationList"
import { listConversations } from "../services/conversationService"
import type { PageEnvelope, ConversationListDTO } from "../types"

// Mock all service exports to prevent HTTP leaks from any function in the module.
vi.mock("../services/conversationService", () => ({
  listConversations: vi.fn(),
  deleteConversation: vi.fn(),
}))

const mockListConversations = vi.mocked(listConversations)

// Helper to create a minimal, valid PageEnvelope for mocking.
function makeEnvelope(
  overrides: Partial<PageEnvelope<ConversationListDTO>> = {}
): PageEnvelope<ConversationListDTO> {
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

describe("useConversationList", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListConversations.mockResolvedValue(makeEnvelope())
  })

  // ── Test 1: Initial load ──────────────────────────────────────────────────────
  it("fetches conversations with sort: updatedAt DESC and default pagination on mount", async () => {
    const { result } = renderHook(() => useConversationList())

    await act(async () => {
      await Promise.resolve()
    })

    expect(mockListConversations).toHaveBeenCalledOnce()
    expect(mockListConversations).toHaveBeenCalledWith({
      page: 0,
      size: 10,
      sort: [{ field: "updatedAt", direction: "DESC" }],
      filters: [],
    })
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  // ── Test 2: Page change ───────────────────────────────────────────────────────
  it("fetches with the updated page number when onPageChange is called", async () => {
    const { result } = renderHook(() => useConversationList())
    await act(async () => { await Promise.resolve() })

    mockListConversations.mockClear()
    mockListConversations.mockResolvedValue(makeEnvelope({ number: 2 }))

    await act(async () => {
      result.current.onPageChange(2)
    })

    expect(mockListConversations).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2 })
    )
    expect(result.current.currentPage).toBe(2)
  })

  // ── Test 3: Page size change resets to page 0 ─────────────────────────────────
  it("resets to page 0 and fetches with the new size when onPageSizeChange is called", async () => {
    const { result } = renderHook(() => useConversationList())
    await act(async () => { await Promise.resolve() })

    mockListConversations.mockResolvedValue(makeEnvelope({ number: 2 }))
    await act(async () => {
      result.current.onPageChange(2)
    })
    expect(result.current.currentPage).toBe(2)

    mockListConversations.mockClear()
    mockListConversations.mockResolvedValue(makeEnvelope({ number: 0 }))

    await act(async () => {
      result.current.onPageSizeChange(25)
    })

    expect(mockListConversations).toHaveBeenCalledWith(
      expect.objectContaining({ page: 0, size: 25 })
    )
  })

  // ── Test 4: refresh() re-fetches with current page and size ───────────────────
  it("re-fetches with the current page and size when refresh is called", async () => {
    const { result } = renderHook(() => useConversationList())
    await act(async () => { await Promise.resolve() })

    mockListConversations.mockResolvedValue(makeEnvelope({ number: 0 }))
    await act(async () => {
      result.current.onPageSizeChange(25)
    })

    mockListConversations.mockResolvedValue(makeEnvelope({ number: 1 }))
    await act(async () => {
      result.current.onPageChange(1)
    })
    expect(result.current.currentPage).toBe(1)

    mockListConversations.mockClear()
    mockListConversations.mockResolvedValue(makeEnvelope({ number: 1 }))

    await act(async () => {
      result.current.refresh()
    })

    expect(mockListConversations).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, size: 25 })
    )
  })

  // ── Test 5: Failed fetch sets error; subsequent success clears error ───────────
  it("sets error on failed fetch and clears error to null after a subsequent successful fetch", async () => {
    mockListConversations.mockRejectedValueOnce(new Error("Network error"))

    const { result } = renderHook(() => useConversationList())
    await act(async () => { await Promise.resolve() })

    expect(result.current.error).not.toBeNull()
    expect(result.current.conversations).toEqual([])

    mockListConversations.mockResolvedValue(makeEnvelope())
    await act(async () => {
      result.current.onPageChange(0)
    })

    expect(result.current.error).toBeNull()
  })

  // ── Test 6: Error cleared at start of each fetch (before resolution) ──────────
  it("clears error to null at the start of each new fetch, before the promise resolves", async () => {
    mockListConversations.mockRejectedValueOnce(new Error("Server error"))

    const { result } = renderHook(() => useConversationList())
    await act(async () => { await Promise.resolve() })

    expect(result.current.error).not.toBeNull()

    let resolveRetry!: (value: PageEnvelope<ConversationListDTO>) => void
    mockListConversations.mockImplementationOnce(
      () => new Promise<PageEnvelope<ConversationListDTO>>(res => { resolveRetry = res })
    )

    await act(async () => {
      result.current.onPageChange(0)
    })

    expect(result.current.error).toBeNull()

    await act(async () => {
      resolveRetry(makeEnvelope())
    })

    expect(result.current.error).toBeNull()
  })
})
```

---

### Step 2.2 (GREEN): Create `useConversationList.ts`

**Goal:** Implement the hook so all tests pass.
**Dependencies:** Step 2.1.

- [ ] Create `src/features/conversations/hooks/useConversationList.ts`.
- [ ] Mirror `useAgentList.ts` exactly, changing only:
  - Import `listConversations` (not `listAgents`)
  - Type the hook result as `UseConversationListResult` (mirror the agents type signature)
  - Change the sort field to `updatedAt DESC` (last activity, most recent first)
  - Rename state variables and return object field from `agents` to `conversations`
- [ ] Run the suite and confirm GREEN.

**Why this step is critical:** This is the single source of truth for list pagination state — every later component and the page layer depend on this hook working correctly, especially the sort order and page/size reset behavior.

#### Implementation

```typescript
// src/features/conversations/hooks/useConversationList.ts

import { useState, useEffect } from "react"
import { listConversations } from "../services/conversationService"
import type { PageableRequest, ConversationListDTO } from "../types"

interface UseConversationListResult {
  conversations: ConversationListDTO[]
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

export function useConversationList(): UseConversationListResult {
  const [conversations, setConversations] = useState<ConversationListDTO[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pageSize, setPageSize] = useState(10)

  async function fetchConversations(page: number, size: number) {
    setIsLoading(true)
    setError(null)

    const request: PageableRequest = {
      page,
      size,
      sort: [{ field: "updatedAt", direction: "DESC" }],
      filters: [],
    }

    try {
      const envelope = await listConversations(request)
      setConversations(envelope.content)
      setTotalPages(envelope.totalPages)
      setTotalElements(envelope.totalElements)
      setCurrentPage(envelope.number)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't fetch the conversations. Please try again."
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchConversations(0, 10)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function onPageSizeChange(size: number) {
    setPageSize(size)
    void fetchConversations(0, size)
  }

  function onPageChange(page: number) {
    void fetchConversations(page, pageSize)
  }

  function refresh() {
    void fetchConversations(currentPage, pageSize)
  }

  return {
    conversations,
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

---

## Design Decisions

**Decision 1:** Sort by `updatedAt DESC` (last activity, most recent first).
- **Why:** Matches parent feature requirement (User Story 2: "ordered with the most recently active one at the top").
- **Alternatives considered:** Sort by `createdAt DESC` (like agents) — rejected; last activity is more useful than creation date.

**Decision 2:** Mirror `useAgentList` exactly rather than refactoring common pagination logic into a reusable hook.
- **Why:** Duplication here is acceptable (2 similar hooks across 2 features is not DRY violation; the behavior may diverge later). Extracting shared logic would introduce indirection (a meta-hook) and make testing harder.
- **Alternatives considered:** Create `usePaginatedList<T>` generic hook — rejected for premature abstraction.

**Decision 3:** Error cleared at the START of each fetch (not the end).
- **Why:** Provides immediate user feedback that a retry is in progress (via `isLoading`), and clears stale error text before the new request resolves.
- **Alternatives considered:** Clear error only on success — rejected; leaves stale error visible during loading.

---

## Testing Considerations

> **Note on the test command:** Always append `-- run` to `npm run test` for a single, non-blocking pass in CI and local environments.

- [ ] `npm --prefix project/srcs/frontend run test -- run` — full suite green; the 6 new `useConversationList` tests pass and there are **no regressions** vs. the current baseline (should still be 159 total, 31 test files).
- [ ] Confirm the RED→GREEN transition with the same command: after Step 2.1 it must fail (hook import unresolved), after Step 2.2 it must pass.
- [ ] `npm --prefix project/srcs/frontend run typecheck` — 0 errors.
- [ ] Lint the new files: `cd project/srcs/frontend && npx eslint src/features/conversations/hooks/` — clean.
- [ ] `npm --prefix project/srcs/frontend run build` — build succeeds.

### Manual Validation

None. This task is pure state management with no UI; the hook tests fully cover the behavior. (UI validation for the feature is deferred to Task 5.)

---

## Related Code Explanations

- `src/features/agents/hooks/useAgentList.ts` — sibling hook this implementation mirrors exactly (changing sort field and variable names).
- `src/features/agents/hooks/useAgentList.test.ts` — sibling test structure mirrored here (6 tests, same lifecycle and mocking pattern).
- `src/features/conversations/services/conversationService.ts` — the service this hook calls (Task 1).
- `src/features/conversations/types.ts` — `ConversationListDTO`, `PageableRequest`, `PageEnvelope` (Task 1).

---

## Completion Criteria

- [x] Parent feature reviewed and reflected accurately (sort by updatedAt DESC honored).
- [x] `tdd` and `solid-deep-design` skills reviewed and applied.
- [x] Version-matched prior art reviewed (`useAgentList.ts` and `useAgentList.test.ts` at current versions).
- [x] `src/features/conversations/hooks/useConversationList.test.ts` created; RED confirmed before implementation.
- [x] `src/features/conversations/hooks/useConversationList.ts` created; GREEN confirmed.
- [x] `npm run test` passes with the 6 new tests and no regressions.
- [x] `npm run typecheck`, `eslint` on the new files, and `npm run build` all clean.
- [x] Sort field is `updatedAt DESC` (not `createdAt`); page size change resets to page 0; `refresh()` uses current page/size.
- [x] Parent feature Phase 2 Steps 2.1–2.2 marked complete and Task 2 wiki link added after execution.
