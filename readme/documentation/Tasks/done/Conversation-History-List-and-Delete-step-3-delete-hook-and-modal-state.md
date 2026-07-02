# Task: Delete Hook & Modal State (TDD)

#task #current #low-complexity #parent-conversation-history-list-and-delete

**Parent:** [[Features/to-do/Conversation-History-List-and-Delete]]
**Parent Type:** Feature
**Related Step(s):** Phase 3 — Step 3.1, Step 3.2, Step 3.3
**Estimated Complexity:** Low
**Depends On:** Task 1 (service) and Task 2 (list hook)

---

## Goal

Create two hooks for the delete lifecycle:

1. **`useDeleteConversation`** (TDD) — manages delete confirmation and submission, with a **double-submit guard** (no checkbox like agents; fast double-clicks cannot fire multiple `DELETE`s). Tests verify success/error paths and re-entrancy prevention.
2. **`useConversationModals`** — trivial state hook that tracks "which conversation is pending deletion." No test; mirrors `useAgentModals` convention.

Together, these hooks own all delete-related state; the page and components stay stateless and depend on them.

---

## Parent Context

The feature includes a delete action on each conversation row. Clicking the action opens a confirmation dialog (lighter than agents — no checkbox). Confirming triggers the delete. This task implements the state management that drives both the dialog and the delete submission.

**Key difference from agents:** Agents have a checkbox guard; conversations use a **double-submit guard** in the hook itself. A fast double-click on "Delete" cannot fire two `DELETE` requests.

---

## Preconditions / Dependencies

- **Task 1 complete:** `conversationService.ts` with `deleteConversation(id): Promise<void>`.
- **Task 2 complete:** `useConversationList` hook (provides the `refresh()` method called after successful delete).
- **Reference implementations exist:**
  - `project/srcs/frontend/src/features/agents/hooks/useDeleteAgent.ts` and `.test.ts` — the pattern to mirror (minus the checkbox, plus double-submit guard).
  - `project/srcs/frontend/src/features/agents/hooks/useAgentModals.ts` — the modal state pattern.
- **Test utilities available:** Vitest `renderHook`, `act`, `vi.mock()`.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `tdd` — **Selected** — Step 3.1/3.2 are RED→GREEN; the hook is tested before written.
- `solid-deep-design` — **Selected** — the delete hook concentrates error handling and re-entrancy logic; callers stay simple.

### Documentation Reviewed

- In-repo prior art: `useDeleteAgent.ts` and `.test.ts` (checkbox guard pattern, error extraction) and `useAgentModals.ts` (trivial state).
- Parent decisions: no checkbox guard (simpler UX), double-submit guard in the hook (prevents accidental multi-delete on fast clicks).

### Related Existing Code

- `src/features/agents/hooks/useDeleteAgent.ts` — delete hook with checkbox guard (mirror the structure, remove checkbox).
- `src/features/agents/hooks/useDeleteAgent.test.ts` — test structure (4 tests covering guard, id, success, error).
- `src/features/agents/hooks/useAgentModals.ts` — modal state pattern to mirror exactly.
- `src/features/conversations/services/conversationService.ts` — `deleteConversation(id): Promise<void>` (Task 1).
- `src/features/conversations/hooks/useConversationList.ts` — `refresh()` called after delete (Task 2).

---

## Implementation Details

### Approach

**Step 3.1 (RED):** Write `useDeleteConversation.test.ts` with 4 tests:
1. `onConfirm` success: calls the service, sets `isSubmitting: false`, calls `onSuccess()`.
2. `onConfirm` error: calls the service, catches the error, sets `error`, keeps `isSubmitting: false`, does NOT call `onSuccess()`.
3. **Double-submit guard:** calling `onConfirm()` again while `isSubmitting: true` is a no-op — the service is called only once (this prevents the 404 if the first delete succeeds but the second fires before the redirect).
4. Error cleared at start of submission (like the list hook).

**Step 3.2 (GREEN):** Implement `useDeleteConversation.ts`:
- Takes `conversation: ConversationListDTO` and `onSuccess: () => void`.
- `onConfirm` **early-returns if `isSubmitting` is already true** (double-submit guard).
- Calls `deleteConversation(id)`, extracts axios error message, calls `onSuccess()` on success.
- Exposes `isSubmitting`, `error`, `onConfirm`.

**Step 3.3:** Implement `useConversationModals.ts` — trivial state, no test:
- `deleteConversation: ConversationListDTO | null`
- `setDeleteConversation: (c: ConversationListDTO | null) => void`

### Files to Create/Modify

- [x] `src/features/conversations/hooks/useDeleteConversation.test.ts` — RED tests.
- [x] `src/features/conversations/hooks/useDeleteConversation.ts` — GREEN implementation.
- [x] `src/features/conversations/hooks/useConversationModals.ts` — trivial modal state (no test).

---

## Step-by-Step Implementation

### Step 3.1 (RED): Create `useDeleteConversation.test.ts`

**Goal:** Encode delete behavior as failing tests.
**Dependencies:** Task 1 and 2.

- [ ] Create `src/features/conversations/hooks/useDeleteConversation.test.ts`.
- [ ] Mock `conversationService` module.
- [ ] Write 4 tests:
  1. **Success path:** `onConfirm()` calls `deleteConversation(id)`, then `onSuccess()`, resets `isSubmitting: false`.
  2. **Error path:** `onConfirm()` rejects; sets `error` from axios message, keeps `isSubmitting: false`, does NOT call `onSuccess()`.
  3. **Double-submit guard:** Two `onConfirm()` calls while `isSubmitting: true` → service called **once only**.
  4. **Error cleared at submission start:** Error is `null` before the delete promise resolves.

#### Implementation

```typescript
// src/features/conversations/hooks/useDeleteConversation.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useDeleteConversation } from "./useDeleteConversation"
import { deleteConversation } from "../services/conversationService"
import type { ConversationListDTO } from "../types"

vi.mock("../services/conversationService", () => ({
  listConversations: vi.fn(),
  deleteConversation: vi.fn(),
}))

const mockDeleteConversation = vi.mocked(deleteConversation)

const mockConversation: ConversationListDTO = {
  id: 42,
  title: "Test Conversation",
  agentId: null,
  currentModelId: 3,
  createdAt: "2026-06-26T10:00:00",
  updatedAt: "2026-06-27T14:30:00",
}

describe("useDeleteConversation", () => {
  const onSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockDeleteConversation.mockResolvedValue(undefined)
  })

  // ── Test 1: Success path ──────────────────────────────────────────────────────
  it("calls deleteConversation and then onSuccess on successful delete", async () => {
    const { result } = renderHook(() => useDeleteConversation(mockConversation, onSuccess))

    await act(async () => {
      await result.current.onConfirm()
    })

    expect(mockDeleteConversation).toHaveBeenCalledWith(mockConversation.id)
    expect(onSuccess).toHaveBeenCalledOnce()
    expect(result.current.isSubmitting).toBe(false)
    expect(result.current.error).toBeNull()
  })

  // ── Test 2: Error path ───────────────────────────────────────────────────────
  it("sets error and does not call onSuccess when deleteConversation rejects", async () => {
    mockDeleteConversation.mockRejectedValueOnce(new Error("Delete failed"))
    const { result } = renderHook(() => useDeleteConversation(mockConversation, onSuccess))

    await act(async () => {
      await result.current.onConfirm()
    })

    expect(result.current.error).toBe("Delete failed")
    expect(result.current.isSubmitting).toBe(false)
    expect(onSuccess).not.toHaveBeenCalled()
  })

  // ── Test 3: Double-submit guard ──────────────────────────────────────────────
  it("prevents double-submit: calling onConfirm while isSubmitting is true is a no-op", async () => {
    // Create a deferred promise so we can call onConfirm again before it resolves
    let resolveDelete!: () => void
    mockDeleteConversation.mockImplementationOnce(
      () => new Promise<void>(res => { resolveDelete = res })
    )

    const { result } = renderHook(() => useDeleteConversation(mockConversation, onSuccess))

    // Start first delete (unresolved)
    await act(async () => {
      result.current.onConfirm()
    })
    expect(result.current.isSubmitting).toBe(true)
    expect(mockDeleteConversation).toHaveBeenCalledTimes(1)

    // Try to delete again while isSubmitting is true — should be no-op
    await act(async () => {
      await result.current.onConfirm()
    })
    expect(mockDeleteConversation).toHaveBeenCalledTimes(1) // still 1, not 2

    // Resolve the first delete
    await act(async () => {
      resolveDelete()
    })

    expect(result.current.isSubmitting).toBe(false)
    expect(onSuccess).toHaveBeenCalledOnce()
  })

  // ── Test 4: Error cleared at submission start ────────────────────────────────
  it("clears error to null at the start of delete, before the promise resolves", async () => {
    // Establish an error state from a failed prior delete
    mockDeleteConversation.mockRejectedValueOnce(new Error("Server error"))
    const { result } = renderHook(() => useDeleteConversation(mockConversation, onSuccess))
    await act(async () => {
      await result.current.onConfirm()
    })
    expect(result.current.error).not.toBeNull()

    // Set up a deferred promise for the retry
    let resolveRetry!: () => void
    mockDeleteConversation.mockImplementationOnce(
      () => new Promise<void>(res => { resolveRetry = res })
    )

    // Start retry
    await act(async () => {
      result.current.onConfirm()
    })

    // Error is null before the deferred promise resolves
    expect(result.current.error).toBeNull()

    // Resolve to clean up
    await act(async () => {
      resolveRetry()
    })

    expect(result.current.error).toBeNull()
  })
})
```

---

### Step 3.2 (GREEN): Create `useDeleteConversation.ts`

**Goal:** Implement the hook to pass all tests.
**Dependencies:** Step 3.1.

- [ ] Create `src/features/conversations/hooks/useDeleteConversation.ts`.
- [ ] Mirror `useDeleteAgent`, but:
  - Remove `isChecked` and `setIsChecked` (no checkbox guard).
  - Add double-submit guard: **`onConfirm` early-returns if `isSubmitting` is true**.
  - Extract axios error the same way.
- [ ] Run tests and confirm GREEN.

#### Implementation

```typescript
// src/features/conversations/hooks/useDeleteConversation.ts

import { useState } from "react"
import { deleteConversation } from "../services/conversationService"
import type { ConversationListDTO } from "../types"

interface UseDeleteConversationResult {
  isSubmitting: boolean
  error: string | null
  onConfirm: () => Promise<void>
}

export function useDeleteConversation(
  conversation: ConversationListDTO,
  onSuccess: () => void
): UseDeleteConversationResult {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onConfirm() {
    // Double-submit guard: if already submitting, bail out.
    if (isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    try {
      await deleteConversation(conversation.id)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string }
      const message =
        axiosErr.response?.data?.message ??
        axiosErr.message ??
        "Failed to delete conversation."
      setError(message)
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(false)
    onSuccess()
  }

  return {
    isSubmitting,
    error,
    onConfirm,
  }
}
```

---

### Step 3.3: Create `useConversationModals.ts`

**Goal:** Trivial state hook tracking which conversation is pending deletion.
**Dependencies:** Task 2 types.

- [ ] Create `src/features/conversations/hooks/useConversationModals.ts` (no test).
- [ ] Mirror `useAgentModals` exactly, changing only the type from `AgentListDTO` to `ConversationListDTO`.

#### Implementation

```typescript
// src/features/conversations/hooks/useConversationModals.ts

import { useState } from "react"
import type { ConversationListDTO } from "../types"

interface UseConversationModalsResult {
  deleteConversation: ConversationListDTO | null
  setDeleteConversation: (c: ConversationListDTO | null) => void
}

export function useConversationModals(): UseConversationModalsResult {
  const [deleteConversation, setDeleteConversation] = useState<ConversationListDTO | null>(null)

  return {
    deleteConversation,
    setDeleteConversation,
  }
}
```

---

## Design Decisions

**Decision 1:** No checkbox guard; double-submit guard in the hook instead.
- **Why:** Simpler UX (no checkbox to check). Double-submit guard (early-return if `isSubmitting`) prevents the 404 on fast double-clicks without adding UI friction.
- **Alternatives considered:** Mirror agents exactly (checkbox guard) — rejected; conversations don't need the cognitive overhead for users.

**Decision 2:** Error extraction mirrors `useDeleteAgent`.
- **Why:** Consistent error message fallback chain: axios response message → error message → generic fallback.

**Decision 3:** `useConversationModals` has no test.
- **Why:** It's pure state (no logic). Mirrors the agents convention; state hooks are tested by their callers (components), not in isolation.

---

## Testing Considerations

> **Note on the test command:** Always append `-- run` for single, non-blocking pass.

- [ ] `npm --prefix project/srcs/frontend run test -- run` — full suite green; the 4 new `useDeleteConversation` tests pass and there are **no regressions** (should be 163 tests in 30 files).
- [ ] Confirm RED→GREEN: after Step 3.1 it must fail (hook unresolved), after Step 3.2 it must pass.
- [ ] `npm --prefix project/srcs/frontend run typecheck` — 0 errors.
- [ ] Lint: `cd project/srcs/frontend && npx eslint src/features/conversations/hooks/` — clean.
- [ ] `npm --prefix project/srcs/frontend run build` — succeeds.

### Manual Validation

None. This task is pure state management; tests fully cover behavior. (UI validation deferred to Task 5.)

---

## Related Code Explanations

- `src/features/agents/hooks/useDeleteAgent.ts` — delete hook with checkbox (mirror structure, remove guard mechanism).
- `src/features/agents/hooks/useDeleteAgent.test.ts` — test pattern (mirror, remove checkbox tests).
- `src/features/agents/hooks/useAgentModals.ts` — modal state pattern (mirror exactly).
- `src/features/conversations/services/conversationService.ts` — `deleteConversation(id): Promise<void>` (Task 1).
- `src/features/conversations/hooks/useConversationList.ts` — `refresh()` called after success (Task 2).

---

## Completion Criteria

- [x] Parent feature reviewed (no checkbox, double-submit guard, error extraction honored).
- [x] `tdd` and `solid-deep-design` skills reviewed and applied.
- [x] Version-matched prior art reviewed (`useDeleteAgent.ts/.test.ts` and `useAgentModals.ts`).
- [x] `src/features/conversations/hooks/useDeleteConversation.test.ts` created; RED confirmed.
- [x] `src/features/conversations/hooks/useDeleteConversation.ts` created; GREEN confirmed.
- [x] `src/features/conversations/hooks/useConversationModals.ts` created.
- [x] `npm run test` passes with 4 new tests and no regressions.
- [x] `npm run typecheck`, `eslint` on new files, and `npm run build` all clean.
- [x] Double-submit guard in `onConfirm`; error cleared at start of submission.
- [x] Parent feature Phase 3 Steps 3.1–3.3 marked complete and Task 3 wiki link added after execution.
