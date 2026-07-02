# Task: useConversation Hook

#task #current #medium-complexity #parent-employee-chat-interface

**Parent:** [[Employee-Chat-Interface]]
**Parent Type:** Feature
**Related Step(s):** Phase 4, Steps 4.1, 4.2
**Estimated Complexity:** Medium

---

## Goal

Create `features/chat/hooks/useConversation.ts` — the hook that loads an existing conversation's metadata and full message history. It returns a fixed-shape interface in both SETUP (no-op, `conversationId` undefined) and CHATTING (live fetch) phases, and is the data source `useChat` merges with the streaming bubble to build the display list.

---

## Parent Context

The parent feature mandates `useConversation(conversationId: number | undefined)` with an **unconditionally called** hook — all `useState`/`useEffect` are called at the top of the hook on every render, regardless of whether `conversationId` is `undefined`. The no-op for `undefined` is implemented **inside the `useEffect` body** (never as an early `return` before the hooks). This is the same Rules-of-Hooks discipline applied to `useChatSetup` and must be maintained here.

Key constraints from the parent:

- **Fixed-shape return** — the hook always returns `{ conversation, messages, isLoading, error }`. There is no union type or "phase-dependent" shape. `conversation` is `null` and `messages` is `[]` in both the no-op state and the error state.
- **No-op semantics** — when `conversationId` is `undefined`: return the fixed zero-state (`null`, `[]`, `false`, `null`), make no network calls, and do not set `isLoading: true`. The no-op is not "loading".
- **Parallel fetch** — when `conversationId` is defined, `getConversation(id)` and `getMessages(id)` must be fetched in parallel (both are required for rendering; if either fails, the whole load fails).
- **Effect keyed on `[conversationId]`** — the fetch re-runs whenever `conversationId` changes, including the critical `undefined → id` transition (SETUP → CHATTING) in the same-instance first-message flow.
- **`cancelled` flag cleanup** — the established project cleanup pattern (`let cancelled = false` + `if (cancelled) return` before setState + `return () => { cancelled = true }` on cleanup). No `AbortController` needed.
- **404 / network failure** — sets `error` with the error message, clears `conversation` to `null` and `messages` to `[]`, clears `isLoading`.
- **`useConversation` does NOT refetch on `done`** — `useChatSocket` retains `streamingContent` after `done` precisely because `useConversation` does not re-fetch. The persisted assistant message is surfaced by `useChat`'s display-list merge / dedup, not by a fresh `useConversation` fetch.

---

## Preconditions / Dependencies

- **Task 1** (`GET /llm-model/enabled` backend endpoint) — complete and verified GREEN.
- **Task 2** (chat service and types) — `features/chat/types.ts` (`ChatConversationDTO`, `ChatMessageDTO`), `features/chat/services/chatService.ts` (`getConversation`, `getMessages`), and `features/chat/index.ts` barrel all exist and are verified GREEN.
- **Task 3** (`useChatSetup` hook) — complete and verified GREEN. The `hooks/` directory already exists at `project/srcs/frontend/src/features/chat/hooks/`.
- Frontend test baseline before this task: **169 tests / 30 files** (confirmed after Task 3 GREEN run).
- **All `npm` commands in this task run from `project/srcs/frontend/`** — never from the project root.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `solid-deep-design` — **Selected** — `useConversation` is a deep module: small fixed-shape interface (4 fields) hides `Promise.all` parallel fetch, cancellation, 404/error handling, no-op logic. Applied during Approach design.
- `tdd` — **Selected** — TDD is mandatory. Write `useConversation.test.ts` first (RED), then `useConversation.ts` (GREEN). Each test verifies one observable behavior through the public hook interface.
- `documentation-management` — **Selected** — task document creation + parent feature link update.
- `memory-bank` — **Selected** — all Memory Bank files read; confirmed existing cleanup pattern (`cancelled` flag in `useChatSetup`, `useAppSettings`), confirmed `Promise.all` + try/catch pattern in `useAppSettings`, confirmed `renderHook` + `vi.mock` + deferred-promise test pattern in `useChatSetup.test.ts`.
- `find-docs` — **Not needed** — `ctx7` CLI not available in this environment; all APIs (React `useEffect`, Vitest `renderHook`, `act`) are established and unchanged from Tasks 2–3. Internal knowledge is sufficient.
- `glossary-management` — **Not needed** — `glossary` CLI not available; domain terms "Conversation", "Message", "Employee", "LLM Model" are established in the project glossary.

### Documentation Reviewed

- `project/srcs/frontend/src/features/chat/types.ts` — confirmed `ChatConversationDTO` and `ChatMessageDTO` shapes; both are available from `../types`.
- `project/srcs/frontend/src/features/chat/services/chatService.ts` — confirmed `getConversation(id: number): Promise<ChatConversationDTO>` and `getMessages(conversationId: number): Promise<ChatMessageDTO[]>`; all 4 exports must appear in the `vi.mock` factory.
- `project/srcs/frontend/src/features/chat/hooks/useChatSetup.ts` — primary reference for `Promise.allSettled` parallel fetch, `cancelled` flag, `isLoading: true` init, `if (cancelled) return` guard pattern.
- `project/srcs/frontend/src/features/chat/hooks/useChatSetup.test.ts` — primary TDD prior art: `vi.mock` module factory (all exports, not just used ones), `vi.mocked()`, `beforeEach` happy-path defaults, deferred-promise test for in-flight `isLoading`, `await act(async () => { await Promise.resolve() })` flush pattern.
- `project/srcs/frontend/src/features/agents/hooks/useEditAgent.test.ts` — reference for `renderHook` + `rerender` to test state transitions (`initialProps` pattern).
- `documentation/Features/to-do/Employee-Chat-Interface.md` — Steps 4.1, 4.2, Section "Implementation Architecture §5", Risk §"No-op placement (Rules-of-Hooks, Finding 3)".

### Related Existing Code

- `project/srcs/frontend/src/features/chat/services/chatService.ts` — exports `getConversation`, `getMessages` (and `getEnabledModels`, `createConversation` — all 4 must be in the mock factory)
- `project/srcs/frontend/src/features/chat/types.ts` — `ChatConversationDTO`, `ChatMessageDTO`
- `project/srcs/frontend/src/features/chat/hooks/useChatSetup.ts` — reference for `cancelled` flag, `Promise.allSettled`, `isLoading` init, cleanup pattern
- `project/srcs/frontend/src/features/chat/hooks/useChatSetup.test.ts` — primary TDD prior art (see above)
- `project/srcs/frontend/src/features/agents/hooks/useAgentList.ts` — reference for `useState`/`useEffect` structure and `try/catch` error extraction
- `project/srcs/frontend/src/features/agents/hooks/useEditAgent.test.ts` — reference for deferred-promise and `rerender` test patterns

---

## Implementation Details

### Approach

**SOLID / Depth analysis:**

| Module | SRP | Depth |
|--------|-----|-------|
| `useConversation` | ONE reason to change: the conversation-history loading contract changes (endpoint URL, DTO shape, caching strategy, or fetch timing policy) | **Deep** — interface: 4 fields (conversation, messages, isLoading, error). Implementation: conditional fetch, `Promise.all` parallel HTTP calls, `cancelled` flag cleanup, 404/error extraction, no-op logic for `undefined`. |
| `UseConversationResult` | Pure interface — the contract | Shallow by design (declaration only) |

**Deletion test:** If `useConversation` were deleted, `useChat` would have to contain the `Promise.all`, cancellation guard, 404 mapping, and no-op logic inline — scattering this complexity into the orchestrator. The module earns its keep.

**Why `Promise.all` (not `Promise.allSettled`):**

Unlike `useChatSetup` (where models are critical and agents are optional), both `getConversation` and `getMessages` are required to render a conversation thread. If either fails, the user cannot see a complete, trustworthy chat history. `Promise.all` is the correct idiom — one rejection surfaces as a single error, and the hook falls back to the zero-state cleanly. There is no "partial success" state meaningful to the caller.

**Why `isLoading` initializes to `false` (not `true`):**

`useChatSetup` initializes `isLoading: true` because it always fetches on mount. `useConversation` does not — when called with `conversationId: undefined` (SETUP phase), it is in no-op mode, not loading mode. Initializing to `true` in the no-op case would falsely suggest a fetch is in progress. The effect sets `isLoading(true)` immediately inside `load()` (before the first `await`) whenever `conversationId` is defined, so the loading state is `true` by the time React flushes the first re-render after mount with a valid id.

**Why `cancelled` flag (not `AbortController`):**

Matches the pattern established by `useChatSetup.ts` and `useAppSettings.ts`. No streaming, no large payloads — `cancelled` flag is the correct, established choice. `AbortController` would add ceremony without benefit.

**No-op placement (Rules-of-Hooks — critical invariant):**

The no-op is the `if (conversationId == null) { reset-state; return }` branch **inside** the `async load()` function **inside** the `useEffect` body. It is never a `return` before any `useState` or `useEffect` call. This is non-negotiable: an early return before hooks violates Rules of Hooks and causes a crash the first time `conversationId` transitions from `undefined` to a number (the SETUP→CHATTING transition that `useChat` depends on).

**Effect dependency: `[conversationId]`:**

The `useEffect` is keyed on `[conversationId]`, not `[]`. This means:
- On initial mount with `undefined`: effect fires → no-op branch → returns zero-state
- When `conversationId` changes from `undefined` to a number (first message sent): effect fires again → fetch branch → loads conversation and messages
- When navigating directly to `/chat/:id` on page load: effect fires with the id → fetch branch immediately

**`cancelled` check placement after `await Promise.all`:**

```typescript
const [conv, msgs] = await Promise.all([...])
if (cancelled) return        // <-- checked AFTER the await, before any setState
setConversation(conv)
setMessages(msgs)
setIsLoading(false)
```

The check must be AFTER the `await` (cannot catch unmount-during-fetch if before it) and BEFORE any `setState` call (prevents setState-on-unmounted-component warning). This is identical to the `useChatSetup` pattern.

### Files to Create/Modify

- [ ] `project/srcs/frontend/src/features/chat/hooks/useConversation.test.ts` — **new** — 5 behavior tests — **create first (TDD RED)**
- [ ] `project/srcs/frontend/src/features/chat/hooks/useConversation.ts` — **new** — the hook implementation

---

## Step-by-Step Implementation

### Step 1: Write the test file (TDD RED)

**Goal:** Write all 5 behavior tests, confirm RED (the import fails because `useConversation.ts` does not exist yet).
**Dependencies:** Task 3 complete — `hooks/` directory exists; `chatService.ts` and `types.ts` exist and will be resolved by the test's import paths.

- [ ] Create `project/srcs/frontend/src/features/chat/hooks/useConversation.test.ts` with the content below
- [ ] Run `npm run test` from `project/srcs/frontend/` — confirm RED: the new suite fails with `"Failed to resolve import './useConversation'"` while all **169** pre-existing tests still pass

**Why RED must be confirmed:** A test that passes before the implementation exists is not testing what you think. The import-resolution failure is the correct RED for this task.

#### Implementation

```typescript
// project/srcs/frontend/src/features/chat/hooks/useConversation.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useConversation } from "./useConversation"
import { getConversation, getMessages } from "../services/chatService"
import type { ChatConversationDTO, ChatMessageDTO } from "../types"

// Mock all exports of chatService — the factory replaces the entire module.
// Include every export (not just what this hook uses): the factory is the ONLY
// source of exports for any import of this module within this test file's scope.
// A missing export gives `undefined` to the hook under test or any helper that
// imports it, and causes silent failures. Established project convention (see
// useChatSetup.test.ts) is to always list the full module surface.
// <!-- REVIEW-FIX: corrected vi.mock comment — Vitest isolates test files in separate
// workers by default, so "shared registry across test files" is inaccurate; the
// real reason is completeness within THIS file's module scope. -->
vi.mock("../services/chatService", () => ({
  getEnabledModels: vi.fn(),
  createConversation: vi.fn(),
  getConversation: vi.fn(),
  getMessages: vi.fn(),
}))

// Imported as values (not import type) — verbatimModuleSyntax: true requires
// runtime references for vi.mocked() calls.
const mockGetConversation = vi.mocked(getConversation)
const mockGetMessages = vi.mocked(getMessages)

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockConversation: ChatConversationDTO = {
  id: 12,
  title: "New Conversation 01/07/2026 10:00",
  employeeId: 3,
  agentId: null,
  currentModelId: 2,
  createdAt: "2026-07-01T10:00:00",
  updatedAt: "2026-07-01T10:00:00",
}

const mockMessages: ChatMessageDTO[] = [
  {
    id: 1,
    conversationId: 12,
    role: "USER",
    content: "What is the capital of France?",
    llmModelId: null,
    inputTokens: null,
    outputTokens: null,
    createdAt: "2026-07-01T10:00:01",
  },
  {
    id: 2,
    conversationId: 12,
    role: "ASSISTANT",
    content: "The capital of France is **Paris**.",
    llmModelId: 2,
    inputTokens: 12,
    outputTokens: 9,
    createdAt: "2026-07-01T10:00:03",
  },
]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useConversation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Happy-path defaults — each test overrides only what it needs
    mockGetConversation.mockResolvedValue(mockConversation)
    mockGetMessages.mockResolvedValue(mockMessages)
  })

  // ── Test 1: No-op when conversationId is undefined ────────────────────────
  it("returns fixed zero-state and makes no service calls when conversationId is undefined", async () => {
    const { result } = renderHook(() => useConversation(undefined))

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.conversation).toBeNull()
    expect(result.current.messages).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(mockGetConversation).not.toHaveBeenCalled()
    expect(mockGetMessages).not.toHaveBeenCalled()
  })

  // ── Test 2: Happy path — loads conversation and messages in parallel ──────
  it("fetches conversation and messages in parallel and returns both when conversationId is provided", async () => {
    const { result } = renderHook(() => useConversation(12))

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.conversation).toEqual(mockConversation)
    expect(result.current.messages).toEqual(mockMessages)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    // Both endpoints called with the same conversationId
    expect(mockGetConversation).toHaveBeenCalledOnce()
    expect(mockGetConversation).toHaveBeenCalledWith(12)
    expect(mockGetMessages).toHaveBeenCalledOnce()
    expect(mockGetMessages).toHaveBeenCalledWith(12)
  })

  // ── Test 3: isLoading transitions ─────────────────────────────────────────
  it("isLoading is true while fetches are in-flight and false once Promise.all settles", async () => {
    // Defer getConversation so Promise.all stays unresolved
    let resolveConversation!: (value: ChatConversationDTO) => void
    mockGetConversation.mockImplementationOnce(
      () =>
        new Promise<ChatConversationDTO>((resolve) => {
          resolveConversation = resolve
        })
    )

    const { result } = renderHook(() => useConversation(12))

    // isLoading is true immediately: the lazy initializer useState(() => 12 != null)
    // computes true on the first render — no need to wait for the effect to fire.
    // <!-- REVIEW-FIX: updated comment after lazy-init patch (finding #1) — isLoading
    // is true from useState init, not from setIsLoading(true) in the effect. -->
    expect(result.current.isLoading).toBe(true)

    // Resolve the deferred promise — Promise.all settles, load() completes
    await act(async () => {
      resolveConversation(mockConversation)
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.conversation).toEqual(mockConversation)
    expect(result.current.messages).toEqual(mockMessages)
  })

  // ── Test 4: Network failure / 404 sets error ──────────────────────────────
  it("sets error, clears conversation and messages, and clears isLoading when a fetch fails", async () => {
    mockGetConversation.mockRejectedValueOnce(new Error("Not Found"))

    const { result } = renderHook(() => useConversation(12))

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.error).toBe("Not Found")
    expect(result.current.conversation).toBeNull()
    expect(result.current.messages).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })

  // ── Test 5: conversationId change undefined → number triggers fetch ───────
  it("starts fetching when conversationId changes from undefined to a number (SETUP → CHATTING transition)", async () => {
    const { result, rerender } = renderHook(
      ({ id }: { id: number | undefined }) => useConversation(id),
      { initialProps: { id: undefined as number | undefined } }
    )

    await act(async () => {
      await Promise.resolve()
    })

    // No fetch while conversationId is undefined
    expect(mockGetConversation).not.toHaveBeenCalled()
    expect(result.current.conversation).toBeNull()
    expect(result.current.isLoading).toBe(false)

    // Simulate the same-instance first-message flow: navigate('/chat/12') fires
    // and useParams() updates — ChatPage stays mounted, useConversation re-runs.
    rerender({ id: 12 })

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.conversation).toEqual(mockConversation)
    expect(result.current.messages).toEqual(mockMessages)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(mockGetConversation).toHaveBeenCalledWith(12)
    expect(mockGetMessages).toHaveBeenCalledWith(12)
  })
})
```

#### Edge Cases

1. **`vi.clearAllMocks()` in `beforeEach`** — clears call history and returns-once-only implementations. Does NOT remove `mockResolvedValue` defaults — each test overrides only what it needs. Test 4 uses `mockRejectedValueOnce` so it does not affect subsequent tests.
2. **Module factory must include ALL exports** — `vi.mock("../services/chatService", () => ({...}))` replaces the entire module. All 4 exports (`getEnabledModels`, `createConversation`, `getConversation`, `getMessages`) must be listed, even though only 2 are used by this hook. Missing exports cause `undefined` errors in other test files in the same Vitest process.
3. **`await Promise.resolve()` flush** — sufficient when all mock values are `mockResolvedValue`/`mockRejectedValue` (already-settled promises). `Promise.all` with 2 already-settled inputs also resolves in one microtask tick. If a future test becomes flaky (state update missed), escalate to `await new Promise(r => setTimeout(r, 0))` inside `act`.
4. **`isLoading` check after `renderHook` in Test 3** — works because `useState(() => conversationId != null)` computes `true` on the first render when `conversationId` is `12`. The lazy initializer runs synchronously during `renderHook`, so `isLoading` is already `true` before any effect fires or any `act()` flush is needed. <!-- REVIEW-FIX: updated explanation after lazy-init patch (finding #1). -->

---

### Step 2: Create `useConversation.ts` (TDD GREEN)

**Goal:** Implement the hook so all 5 tests pass.
**Dependencies:** Step 1 (test file + RED confirmed). `types.ts` and `chatService.ts` must exist (they do — Task 2 is done).

- [ ] Create `project/srcs/frontend/src/features/chat/hooks/useConversation.ts` with the content below
- [ ] Run `npm run test` from `project/srcs/frontend/` — confirm GREEN: **174 tests / 31 files, 0 failures, 0 regressions**
- [ ] Run `npm run typecheck` from `project/srcs/frontend/` — 0 errors
- [ ] Run `npx eslint src/features/chat/` from `project/srcs/frontend/` — 0 errors

**Why this step is critical:** `useConversation` is the conversation-history data source for `useChat` (Task 6). Getting the no-op guard and the `cancelled` flag placement correct here is mandatory for the same-instance first-message flow that the parent feature depends on. A wrong `if (conversationId == null) return` before hooks would crash on the `undefined → id` transition.

#### Implementation

```typescript
// project/srcs/frontend/src/features/chat/hooks/useConversation.ts

import { useState, useEffect } from "react"
import { getConversation, getMessages } from "../services/chatService"
import type { ChatConversationDTO, ChatMessageDTO } from "../types"

export interface UseConversationResult {
  conversation: ChatConversationDTO | null
  messages: ChatMessageDTO[]
  isLoading: boolean
  error: string | null
}

export function useConversation(conversationId: number | undefined): UseConversationResult {
  const [conversation, setConversation] = useState<ChatConversationDTO | null>(null)
  const [messages, setMessages] = useState<ChatMessageDTO[]>([])
  // Lazy initializer: true when conversationId is defined on first render (avoids a
  // brief empty-state flash before the effect fires on direct /chat/:id navigation),
  // false when conversationId is undefined (no-op state, not "loading").
  // <!-- REVIEW-FIX: changed from useState(false) to lazy init — React effects fire
  // after paint; a static false initial value caused a one-render flash of empty
  // ChatMessages with no loading indicator when navigating directly to /chat/:id. -->
  const [isLoading, setIsLoading] = useState(() => conversationId != null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      // No-op guard INSIDE the effect body — never a return before hooks.
      // Rules of Hooks: all useState/useEffect must be called unconditionally.
      // An early return before the hooks above would violate this invariant and
      // crash on the first render after conversationId transitions undefined → id.
      if (conversationId == null) {
        setConversation(null)
        setMessages([])
        setIsLoading(false)
        setError(null)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const [conv, msgs] = await Promise.all([
          getConversation(conversationId),
          getMessages(conversationId),
        ])
        // Guard against unmount-during-fetch before ANY setState call.
        // If the effect re-ran (conversationId changed) or the component
        // unmounted, the cleanup sets cancelled = true and we discard results.
        if (cancelled) return
        setConversation(conv)
        setMessages(msgs)
        setIsLoading(false)
      } catch (err) {
        if (cancelled) return
        setError(
          err instanceof Error ? err.message : "Failed to load conversation."
        )
        setConversation(null)
        setMessages([])
        setIsLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [conversationId])

  return { conversation, messages, isLoading, error }
}
```

#### Edge Cases

1. **`conversationId == null` (loose equality)** — catches both `undefined` and `null`. The parameter type is `number | undefined`, but loose equality is defensive against future refactors that might pass `null`. Matches the pattern in `useChatSocket.sendMessage` and is the exact phrasing from the parent feature spec ("when `conversationId == null`").
2. **`cancelled` placed AFTER `await Promise.all(...)`** — if it were placed before the `await`, it would never catch the case where the component unmounts (or `conversationId` changes) while the fetch is in flight. The current placement ensures that no `setState` is called if the effect has been cleaned up.
3. **`Promise.all` rejection semantics** — if `getConversation` rejects, `Promise.all` rejects immediately (fast-fail). `getMessages` may still be in flight but its result is discarded. The `catch` block handles this as a total load failure — `conversation = null`, `messages = []`, `error = message`. If `getMessages` rejects and `getConversation` resolves, the same total-failure semantics apply.
4. **`isLoading(false)` in both `try` and `catch`, and lazy init for `isLoading`** — `useState(() => conversationId != null)` initializes `isLoading` to `true` when `conversationId` is defined on first render and `false` when it is `undefined`. The explicit `setIsLoading(false)` in both the `try` and `catch` branches is still needed — it clears `isLoading` after the load completes or fails. No `finally` block is used because `if (cancelled) return` in both branches exits before `finally` would run (`finally` always executes even after `return`), making the explicit calls in each branch safer and more readable.
<!-- REVIEW-FIX: updated to document the lazy init behavior alongside the try/catch isLoading pattern (finding #1). -->
5. **Empty dependency array vs `[conversationId]`** — the effect is keyed on `[conversationId]`, NOT `[]`. This is intentional: the fetch must re-run when `conversationId` changes. Using `[]` would fix the hook to the initial value of `conversationId` and miss the SETUP→CHATTING transition entirely.

---

## Design Decisions

**Decision 1:** `Promise.all` instead of `Promise.allSettled`.
- **Why:** Both `getConversation` and `getMessages` are required to render a complete, trustworthy conversation history. There is no meaningful "partial success" state — showing conversation metadata without messages (or vice versa) would be confusing and incomplete. `Promise.all` is the correct idiom: one failure = total load failure, one error state, clean zero-state fallback.
- **Alternatives considered:** `Promise.allSettled` with per-result inspection (the `useChatSetup` pattern) — rejected because `useChatSetup` has an asymmetry where agents are optional and models are critical. `useConversation` has no such asymmetry — both endpoints are equally required.

**Decision 2:** `isLoading` uses a lazy initializer `useState(() => conversationId != null)`.
- **Why:** Two cases must be handled correctly. (1) When `conversationId` is `undefined` (SETUP phase): the hook is in no-op mode — not loading. `isLoading` must start `false`. (2) When `conversationId` is defined on first render (direct navigation to `/chat/:id`, e.g. page refresh or bookmark): React fires effects after paint, not before — a static `useState(false)` would cause a brief visible flash of empty `ChatMessages` before `setIsLoading(true)` fires in the effect. The lazy initializer computes the initial value from the parameter — `conversationId != null` — on the very first render, covering case 2 without affecting case 1. For the SETUP→CHATTING transition (same-instance flow): the lazy init already ran with `undefined` (returned `false`), and the effect fires `setIsLoading(true)` when `conversationId` changes — acceptable because this transition is driven by user action and the single-render delay is not perceptible.
<!-- REVIEW-FIX: replaced "initialized to false" with lazy initializer — static false
caused a one-render empty-state flash on direct /chat/:id navigation (finding #1). -->
- **Alternatives considered:** `useState(false)` — rejected (empty-state flash on direct `/chat/:id` navigation). `useState(true)` — rejected (`useChatSetup` always fetches; `useConversation` does not; `true` with `undefined` conversationId would falsely show loading on the initial SETUP render). `useRef` + force re-render — rejected (over-engineered for a simple conditional init).

**Decision 3:** Fixed-shape return interface — never a union type.
- **Why:** The parent feature explicitly mandates a fixed-shape return (consistent with `useAgentList` and `useEditAgent`). A union type (e.g., `{ phase: 'SETUP' } | { phase: 'CHATTING', conversation: ..., messages: ... }`) would require `useChat` to type-narrow before accessing fields, adding complexity at every call site. Fixed-shape means `useChat` can always spread the return object without guarding.
- **Alternatives considered:** Union return by phase — rejected (premature, adds call-site complexity for no gain, violates the project convention established in `useAgentList`/`useEditAgent`).

**Decision 4:** No `refresh()` function.
- **Why:** The parent spec states `useConversation` does NOT refetch on `done`. The only mechanism to re-render history is a page refresh (which re-mounts and re-fetches). Adding `refresh()` would enable a pattern the parent explicitly forbids (post-`done` refetch would clear `streamingContent` from `useChatSocket` before `useChat` could merge it). If a refresh function is needed in the future (e.g., for a "reload conversation" button), it can be added then.
- **Alternatives considered:** Add `refresh()` triggered by `useChatSocket`'s `done` event in `useChat` — rejected (parent spec, Finding §"WS lifecycle invariant", explicitly says `useConversation` does NOT refetch on `done`; this is load-bearing for `useChatSocket`'s decision to retain `streamingContent` after `done`).

**Decision 5:** `vi.mock` factory includes all 4 `chatService` exports.
- **Why:** `vi.mock` replaces the entire module for all code within this test file's module scope. If an export is missing from the factory, any import of that export within the test file's scope (from the hook under test, from a helper, or from a direct import) receives `undefined` — a silent failure. Vitest isolates test files in separate workers by default, so there is no cross-file registry sharing to worry about; the real concern is completeness within this file. Additionally, it is the established project convention (`useChatSetup.test.ts`, `useAgentList.test.ts`) to always list the full module surface, making it safe to add new imports to the hook without updating the factory.
<!-- REVIEW-FIX: corrected reasoning — Vitest isolates files by default; cross-file
sharing was inaccurate. The real reason is within-file completeness (finding #2). -->
- **Alternatives considered:** Mock only `getConversation` and `getMessages` — rejected (leaves `getEnabledModels` and `createConversation` unmocked; if `useConversation.ts` is later extended to import them, the test silently passes with `undefined` service calls instead of failing loudly).

---

## Testing Considerations

### Automatic Validation

- [ ] **RED confirmed:** Run `npm run test` from `project/srcs/frontend/` after creating `useConversation.test.ts` but before creating `useConversation.ts` — the new suite must fail with `"Failed to resolve import './useConversation'"` while all **169** pre-existing tests still pass
- [ ] **GREEN:** Run `npm run test` after creating `useConversation.ts` — **174 tests / 31 files, 0 failures, 0 regressions** (169 pre-existing + 5 new)
- [ ] **Typecheck:** Run `npm run typecheck` from `project/srcs/frontend/` — **0 errors**
- [ ] **ESLint:** Run `npx eslint src/features/chat/` from `project/srcs/frontend/` — 0 errors (the `// eslint-disable-next-line react-hooks/exhaustive-deps` comment is NOT needed here — `[conversationId]` is the correct and complete dependency array; the lint rule is not triggered)

### Manual Validation

No manual browser validation is required for this task. `useConversation` is a data hook with no UI. The automated test suite fully validates all observable behaviors. Visual validation of the restored conversation history on `/chat/:id` is deferred to Task 7 (UI components and routing).

---

## Related Code Explanations

- `project/srcs/frontend/src/features/chat/hooks/useChatSetup.ts` — reference for `Promise.allSettled`, `cancelled` flag, cleanup pattern; also the prior hook in this same `hooks/` directory
- `project/srcs/frontend/src/features/chat/hooks/useChatSetup.test.ts` — **primary TDD prior art**: `vi.mock` factory, `vi.mocked()`, `beforeEach` defaults, deferred-promise test for in-flight state
- `project/srcs/frontend/src/features/agents/hooks/useAgentList.ts` — reference for `useState`/`useEffect` structure and `try/catch` error extraction pattern
- `project/srcs/frontend/src/features/agents/hooks/useEditAgent.test.ts` — reference for `rerender` + `initialProps` test pattern used in Test 5
- `project/srcs/frontend/src/features/chat/services/chatService.ts` — source of `getConversation` and `getMessages`

---

## Completion Criteria

- [x] Parent document [[Employee-Chat-Interface]] reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected (`solid-deep-design`, `tdd`, `documentation-management`, `memory-bank`)
- [x] `project/srcs/frontend/src/features/chat/hooks/useConversation.test.ts` created with 5 behavior tests
- [x] RED confirmed: `npm run test` fails with import error on `useConversation`; 169 pre-existing tests unaffected
- [x] `project/srcs/frontend/src/features/chat/hooks/useConversation.ts` created with `UseConversationResult` interface and `useConversation()` function
- [x] GREEN confirmed: `npm run test` → **174 tests / 31 files, 0 failures, 0 regressions**
- [x] `npm run typecheck` → **0 errors**
- [x] `npx eslint src/features/chat/` → 0 errors
- [x] Parent feature Steps 4.1 and 4.2 checkboxes updated to `[x]`
- [x] Parent feature Task 4 wiki link updated to `[[Employee-Chat-Interface-task-4-use-conversation-hook]]`
