# Task: useChat Orchestrator

#task #current #high-complexity #parent-employee-chat-interface

**Parent:** [[Employee-Chat-Interface]]
**Parent Type:** Feature
**Related Step(s):** Phase 6, Steps 6.1, 6.2
**Estimated Complexity:** High

---

## Goal

Create `features/chat/hooks/useChat.ts` — the top-level orchestrator hook that calls `useChatSetup`, `useConversation`, and `useChatSocket` unconditionally, reads `conversationId` from `useParams()`, derives `hasConversation`, implements the same-instance first-message flow (SETUP: `createConversation → navigate → sendMessage(content, id)` with override; CHATTING: `sendMessage(content)` directly), and builds the `displayMessages` array by merging persisted messages with an optimistic user bubble. Export `useChat` from the `features/chat/index.ts` barrel. The completed hook is the sole hook consumed by `ChatPage` (Task 7).

---

## Parent Context

The parent feature mandates that `useChat` calls its three sub-hooks **unconditionally at the top level in a fixed lexical order on every render** (Rules of Hooks — Finding 3). The hook reads `conversationId` from `useParams()` itself (no argument); all sub-hooks are therefore callable without the caller knowing about the SETUP/CHATTING distinction.

Key constraints from the parent:

- **Fixed-shape return — no union type.** `useChat` always returns the same set of fields, consistent with `useAgentList`/`useEditAgent`. Field names are renamed where sub-hook names collide (`isLoading` / `error` from both `useChatSetup` and `useConversation` → `setupIsLoading`, `setupError`, `conversationIsLoading`, `conversationError`). The SETUP/CHATTING concept survives only as the derived boolean `hasConversation = conversationId !== undefined`.
- **Same-instance first-message flow (Finding 2).** `ChatPage` does NOT remount across `/chat` → `/chat/:id` (verified in `known-issues.md`; `element=` routes with no `key` preserve the fiber). When the user sends their first message:
  1. Generate title: `"New Conversation DD/MM/YYYY HH:mm"` (client-side).
  2. `await createConversation({ modelId, agentId, title })` → `{ id }`.
  3. `navigate('/chat/${id}', { replace: true })` — the empty `/chat` entry is overwritten.
  4. `useChatSocket.sendMessage(content, id)` — pass `id` as an **explicit override** because the `useParams()` closure still sees `conversationId === undefined` at this point (it updates on the next render, not inside the current event handler). Without the override the WebSocket URL would be `ws://localhost:8080/ws/chat/undefined` and no connection would open.
- **CHATTING-phase `sendMessage`.** Subsequent messages skip `createConversation` and call `useChatSocket.sendMessage(content)` directly with no override (by this point `useParams()` has the real `conversationId`).
- **`displayMessages` merge.** `useChat` maintains a `pendingUserMessage` state (set when `sendMessage` is called). It builds `displayMessages` by taking `messages` from `useConversation` and appending a synthetic optimistic user bubble (id = `−1`) when `pendingUserMessage` is set AND the persisted `messages` do not yet contain a USER message with the same content (content-based dedup — avoids the double bubble once `useConversation` loads the real USER message). The streaming bubble itself is NOT in `displayMessages`; it is rendered separately by `ChatMessages` via the `streamingContent`/`isStreaming` fields.
- **`streamingContent` retained after `done`** (Decision from Task 5). `useConversation` does NOT refetch on `done`. The streaming bubble remains visible via `streamingContent` until the next `sendMessage` (which clears it via `useChatSocket`'s own `sendMessage` reset).
- **TDD is mandatory** — 4 behavior tests covering: SETUP first-message flow, CHATTING direct-send flow, optimistic bubble in `displayMessages`, and `socketError` surfaced.

---

## Preconditions / Dependencies

- **Task 1** (`GET /llm-model/enabled` backend endpoint) — complete and verified GREEN.
- **Task 2** (types + service) — `features/chat/types.ts` (`ChatCreateForm`, `ChatConversationMiniDTO`, etc.) and `features/chat/services/chatService.ts` (`createConversation`) exist and are verified GREEN.
- **Task 3** (`useChatSetup`) — `useChatSetup.ts` exists; exports `UseChatSetupResult` with `{ selectedModelId, setSelectedModelId, selectedAgentId, setSelectedAgentId, enabledModels, agents, isLoading, error }`.
- **Task 4** (`useConversation`) — `useConversation.ts` exists; exports `UseConversationResult` with `{ conversation, messages, isLoading, error }`.
- **Task 5** (`useChatSocket`) — `useChatSocket.ts` exists; exports `UseChatSocketResult` with `{ sendMessage(content, override?), streamingContent, isStreaming, socketError }`.
- Frontend test baseline: **181 tests / 32 files** (`npm run test` from `project/srcs/frontend/` passes clean).
- `vi.hoisted(() => vi.fn())` pattern for `react-router-dom` mock — established in `features/authentication/hooks/useLoginForm.test.ts`.
- **All `npm` commands run from `project/srcs/frontend/`** — never from the project root.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `solid-deep-design` — **Selected** — `useChat` is a coordinator (not a deep module in the pure sense), but the depth framework guides its interface design. Deletion test: if `useChat` were deleted, the SETUP/CHATTING orchestration, `createConversation`, `navigate`, and dedup-merge logic would scatter into `ChatPage` — the module earns its keep by hiding the state-machine behind a clean 14-field return.
- `tdd` — **Selected** — TDD is mandatory. Write `useChat.test.ts` first (RED — import fails), then `useChat.ts` (GREEN). Each test verifies one observable behavior through the hook's public interface. The sub-hooks are mocked; only the orchestration logic is tested here.
- `documentation-management` — **Selected** — task document creation, parent feature link update.
- `memory-bank` — **Selected** — all Memory Bank files read. `known-issues.md` documents the critical `ChatPage` mount-preservation invariant (no `key`, `element=` not `Component=`), the `useChatSocket` WS-in-`useRef` requirement, and the `useNavigate` test pattern (`vi.hoisted`). `architecture.md` confirms `createConversation` is in `chatService.ts`, `useNavigate` is from `react-router-dom`.
- `find-docs` — **Not needed** — `ctx7` CLI is not installed in this environment. All APIs (React `useMemo`/`useState`/`useParams`/`useNavigate`, Vitest `renderHook`/`act`/`vi.hoisted`, react-router-dom v6) are established and identical to their use in prior tasks.
- `glossary-management` — **Not needed** — `glossary` CLI not available; domain terms are established.

### Documentation Reviewed

- `project/srcs/frontend/src/features/chat/hooks/useChatSetup.ts` — confirmed `UseChatSetupResult` interface (8 fields including `isLoading`/`error`); confirms `selectedModelId` and `selectedAgentId` values used in `sendMessage`.
- `project/srcs/frontend/src/features/chat/hooks/useConversation.ts` — confirmed `UseConversationResult` (4 fields); confirms `messages: ChatMessageDTO[]` is the base for `displayMessages`.
- `project/srcs/frontend/src/features/chat/hooks/useChatSocket.ts` — confirmed `UseChatSocketResult` (4 fields); `sendMessage(content, conversationIdOverride?)` signature for the SETUP-phase override.
- `project/srcs/frontend/src/features/chat/services/chatService.ts` — confirmed `createConversation(form: ChatCreateForm): Promise<ChatConversationMiniDTO>` returns `{ id, title, createdAt }`.
- `project/srcs/frontend/src/features/chat/types.ts` — confirmed `ChatCreateForm` shape `{ modelId: number; agentId: number | null; title: string }` and `ChatMessageDTO` shape (needed for synthetic user bubble).
- `project/srcs/frontend/src/features/authentication/hooks/useLoginForm.test.ts` — **primary TDD prior art for mocking react-router-dom**: `vi.hoisted(() => vi.fn())` for `mockNavigate`; `vi.mock("react-router-dom", async (importOriginal) => { ... })` preserving original exports.
- `project/srcs/frontend/src/features/agents/hooks/useEditAgent.test.ts` — prior art for mocking hook dependencies + `vi.fn()` in module factory.
- `documentation/Memory/known-issues.md` — ChatPage mount-preservation invariant (no `key` on ChatPage routes); `useChatSocket` WS-in-`useRef` unmount-only cleanup.

### Related Existing Code

- `project/srcs/frontend/src/features/chat/hooks/useChatSetup.ts` — sub-hook 1
- `project/srcs/frontend/src/features/chat/hooks/useConversation.ts` — sub-hook 2
- `project/srcs/frontend/src/features/chat/hooks/useChatSocket.ts` — sub-hook 3
- `project/srcs/frontend/src/features/chat/services/chatService.ts:15` — `createConversation`
- `project/srcs/frontend/src/features/chat/types.ts` — `ChatCreateForm`, `ChatMessageDTO`
- `project/srcs/frontend/src/features/chat/index.ts` — barrel to update with `useChat` export
- `project/srcs/frontend/src/features/authentication/hooks/useLoginForm.test.ts` — `vi.hoisted` + `react-router-dom` mock pattern

---

## Implementation Details

### Approach

**SOLID / Depth analysis:**

| Module | SRP | Depth |
|--------|-----|-------|
| `useChat` | ONE reason to change: the SETUP→CHATTING state-machine or the orchestration protocol between the three sub-hooks changes | **Coordinator** — interface: 14 fields (all three sub-hook surfaces + `sendMessage` + `hasConversation` + `displayMessages`). Implementation: `useParams` parsing, `hasConversation` derivation, async `createConversation` → navigate → socket-send, `pendingUserMessage` tracking, `displayMessages` dedup-merge. Without `useChat`, all of this would be in `ChatPage`. |
| `UseChatResult` | Pure interface — the contract | Shallow by design (declaration only) |

**Deletion test:** If `useChat` were deleted, `ChatPage` would contain: `useParams` parsing, `createConversation` call with title generation, navigate-with-replace, socket override, `pendingUserMessage` state, and dedup-merge logic. All of this complexity would scatter into a page component with zero business logic. The module earns its keep.

**Why `useMemo` for `displayMessages`:**

`displayMessages` is derived from `conv.messages`, `pendingUserMessage`, and `conversationId`. Computing it inline on every render without memoization would produce a new array reference on every render, causing `ChatMessages` to re-render even when no message data changed. `useMemo` with `[conv.messages, pendingUserMessage, conversationId]` as dependencies ensures referential stability.

**Why `pendingUserMessage` (not relying on `conv.messages` alone):**

After the first message send, `useConversation` fetches the history asynchronously. Until that fetch completes, `conv.messages` is `[]` — the user would see a blank chat instead of their just-sent message. `pendingUserMessage` provides the optimistic user bubble immediately while the fetch is in flight.

**Content-based dedup (not id-based):**

The parent spec says "dedup by `message.id`" but synthetic messages have `id = -1`. The practical dedup rule is: don't add the optimistic bubble if `conv.messages` already contains a USER message with the same content. This fires when `useConversation` loads the updated history (e.g., after the `undefined → id` transition kicks off the parallel fetch). Content-based dedup is equivalent here because the pending user message is the most recently sent message and the most recently persisted USER message will have the same content.

**Why `sendMessage` is `async`:**

In SETUP, it must `await createConversation(...)`. In CHATTING, it calls `chatSocket.sendMessage(content)` synchronously but still returns `Promise<void>` (an already-resolved promise) to keep the API consistent. `ChatPage` can `void result.sendMessage(content)` or `await` it without caring about the phase.

**Field name collision resolution:**

`useChatSetup` and `useConversation` both return `isLoading` and `error`. Renaming in `useChat`:
- `setup.isLoading` → `setupIsLoading`
- `setup.error` → `setupError`
- `conv.isLoading` → `conversationIsLoading`
- `conv.error` → `conversationError`
- `chatSocket.sendMessage` → internal (replaced by `useChat`'s own `sendMessage`)

### Files to Create/Modify

> **TDD order:** Write `useChat.test.ts` first (Step 1 — RED), then `useChat.ts` (Step 2 — GREEN), then update `index.ts` (Step 3).

- [ ] `project/srcs/frontend/src/features/chat/hooks/useChat.test.ts` — **new** — 4 behavior tests — **create first (TDD RED)**
- [ ] `project/srcs/frontend/src/features/chat/hooks/useChat.ts` — **new** — the hook implementation
- [ ] `project/srcs/frontend/src/features/chat/index.ts` — **modify** — add `useChat` and `UseChatResult` exports

---

## Step-by-Step Implementation

### Step 1: Write the test file (TDD RED)

**Goal:** Write all 4 behavior tests, mock all three sub-hooks and `react-router-dom`, confirm RED (import fails because `useChat.ts` does not exist yet).
**Dependencies:** Tasks 2–5 complete — `hooks/` directory exists with `useChatSetup.ts`, `useConversation.ts`, `useChatSocket.ts`; `chatService.ts` exists.

- [ ] Create `project/srcs/frontend/src/features/chat/hooks/useChat.test.ts` with the content below
- [ ] Run `npm run test` from `project/srcs/frontend/` — confirm RED: new suite fails with `"Failed to resolve import './useChat'"` while all **181** pre-existing tests still pass

**Why RED must be confirmed:** A test that passes before the implementation exists does not verify what you think. The import-resolution failure is the correct RED for this task.

#### Implementation

```typescript
// project/srcs/frontend/src/features/chat/hooks/useChat.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useChat } from "./useChat"
import { useChatSetup } from "./useChatSetup"
import { useConversation } from "./useConversation"
import { useChatSocket } from "./useChatSocket"
import { createConversation } from "../services/chatService"
import { useParams } from "react-router-dom"
import type { EnabledModelDTO, ChatConversationMiniDTO } from "../types"
import type { AgentListDTO } from "@/features/agents"

// ---------------------------------------------------------------------------
// vi.hoisted — creates mockNavigate before vi.mock factories run.
// This is the pattern established in useLoginForm.test.ts.
// vi.mock is hoisted above imports by Vitest; closures in the factory must
// reference variables that are already initialised — vi.hoisted guarantees that.
// ---------------------------------------------------------------------------
const mockNavigate = vi.hoisted(() => vi.fn())

// ---------------------------------------------------------------------------
// Mock react-router-dom — preserve all real exports; only replace the two
// hooks that useChat calls.
// ---------------------------------------------------------------------------
vi.mock("react-router-dom", async (importOriginal) => {
  const mod = await importOriginal<typeof import("react-router-dom")>()
  return {
    ...mod,
    useNavigate: () => mockNavigate,
    useParams: vi.fn().mockReturnValue({}),
  }
})

// ---------------------------------------------------------------------------
// Mock sub-hooks — each returns a vi.fn() whose return value is set in beforeEach.
// ---------------------------------------------------------------------------
vi.mock("./useChatSetup", () => ({
  useChatSetup: vi.fn(),
}))

vi.mock("./useConversation", () => ({
  useConversation: vi.fn(),
}))

vi.mock("./useChatSocket", () => ({
  useChatSocket: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Mock chatService — createConversation is the only function useChat calls
// directly; include all exports so any future useChat import of getEnabledModels
// etc. does not fail silently.
// ---------------------------------------------------------------------------
vi.mock("../services/chatService", () => ({
  getEnabledModels: vi.fn(),
  createConversation: vi.fn(),
  getConversation: vi.fn(),
  getMessages: vi.fn(),
}))

// ---------------------------------------------------------------------------
// vi.mocked wrappers for type-safe assertions.
// Imported as values (not import type) — verbatimModuleSyntax requires
// runtime references for vi.mocked() calls.
// ---------------------------------------------------------------------------
const mockUseChatSetup = vi.mocked(useChatSetup)
const mockUseConversation = vi.mocked(useConversation)
const mockUseChatSocket = vi.mocked(useChatSocket)
const mockCreateConversation = vi.mocked(createConversation)
const mockUseParams = vi.mocked(useParams)

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockModels: EnabledModelDTO[] = [
  { id: 2, modelId: "openai/gpt-4o", name: "GPT-4o", isEnabled: true },
]

const mockAgents: AgentListDTO[] = []

const mockConversationMini: ChatConversationMiniDTO = {
  id: 42,
  title: "New Conversation 01/07/2026 10:00",
  createdAt: "2026-07-01T10:00:00",
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

// mockSocketSendMessage is refreshed each test (declared at module scope so
// tests can reference it after beforeEach sets it up).
let mockSocketSendMessage: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()

  // Default: SETUP phase (no conversationId in URL)
  mockUseParams.mockReturnValue({})

  // Default useChatSetup return — selectedModelId: 2, no agent
  mockUseChatSetup.mockReturnValue({
    selectedModelId: 2,
    setSelectedModelId: vi.fn(),
    selectedAgentId: null,
    setSelectedAgentId: vi.fn(),
    enabledModels: mockModels,
    agents: mockAgents,
    isLoading: false,
    error: null,
  })

  // Default useConversation return — empty (SETUP: no conversationId)
  mockUseConversation.mockReturnValue({
    conversation: null,
    messages: [],
    isLoading: false,
    error: null,
  })

  // Fresh mockSocketSendMessage for each test — referenced by tests for assertions
  mockSocketSendMessage = vi.fn()
  mockUseChatSocket.mockReturnValue({
    sendMessage: mockSocketSendMessage,
    streamingContent: "",
    isStreaming: false,
    socketError: null,
  })

  // Default createConversation — resolves with id 42
  mockCreateConversation.mockResolvedValue(mockConversationMini)
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useChat", () => {
  // ── Test 1: SETUP — first message creates conversation, navigates, sends with override ──
  it("calls createConversation with selectedModelId/agentId and a 'New Conversation DD/MM/YYYY HH:mm' title, navigates with replace:true, then calls useChatSocket.sendMessage with content and the new id as an explicit override", async () => {
    // SETUP phase: no conversationId in URL
    mockUseParams.mockReturnValue({})

    const { result } = renderHook(() => useChat())

    expect(result.current.hasConversation).toBe(false)

    await act(async () => {
      await result.current.sendMessage("Hello LLM!")
    })

    // createConversation called once with correct model and agent
    expect(mockCreateConversation).toHaveBeenCalledOnce()
    const form = mockCreateConversation.mock.calls[0][0]
    expect(form.modelId).toBe(2) // from mockUseChatSetup default
    expect(form.agentId).toBeNull()
    // Title must follow the "New Conversation DD/MM/YYYY HH:mm" format
    expect(form.title).toMatch(/^New Conversation \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)

    // navigate called with replace:true to overwrite the empty /chat entry
    expect(mockNavigate).toHaveBeenCalledWith("/chat/42", { replace: true })

    // useChatSocket.sendMessage called with content AND the new id as an explicit override
    // (useParams closure still sees conversationId: undefined at this point)
    expect(mockSocketSendMessage.mock.calls[0]).toEqual(["Hello LLM!", 42])
  })

  // ── Test 2: CHATTING — subsequent messages send directly without override ──────
  it("calls useChatSocket.sendMessage with content only (no override, no createConversation) for messages in CHATTING phase", async () => {
    // CHATTING phase: conversationId is present
    mockUseParams.mockReturnValue({ conversationId: "12" })

    const { result } = renderHook(() => useChat())

    expect(result.current.hasConversation).toBe(true)

    await act(async () => {
      await result.current.sendMessage("Follow-up question")
    })

    // No conversation creation in CHATTING
    expect(mockCreateConversation).not.toHaveBeenCalled()
    // navigate is NOT called (conversation already exists)
    expect(mockNavigate).not.toHaveBeenCalled()

    // useChatSocket.sendMessage called with content only — no id override
    expect(mockSocketSendMessage.mock.calls[0]).toEqual(["Follow-up question"])
  })

  // ── Test 3: Streaming — optimistic user bubble in displayMessages ──────────────
  it("includes an optimistic user bubble in displayMessages while isStreaming is true, and surfaces streamingContent", async () => {
    // SETUP phase: first message
    mockUseParams.mockReturnValue({})

    // useChatSocket mock with isStreaming: true (simulates the streaming state
    // after the WS has been opened and is receiving chunks)
    mockSocketSendMessage = vi.fn()
    mockUseChatSocket.mockReturnValue({
      sendMessage: mockSocketSendMessage,
      streamingContent: "The capital is Paris.",
      isStreaming: true,
      socketError: null,
    })

    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.sendMessage("What is the capital of France?")
    })

    // displayMessages must include the optimistic user bubble (conv.messages is empty
    // because useConversation hasn't received the conversationId update yet)
    expect(result.current.displayMessages).toHaveLength(1)
    const [bubble] = result.current.displayMessages
    expect(bubble.role).toBe("USER")
    expect(bubble.content).toBe("What is the capital of France?")

    // Streaming state is surfaced from useChatSocket
    expect(result.current.streamingContent).toBe("The capital is Paris.")
    expect(result.current.isStreaming).toBe(true)
  })

  // ── Test 4: Error — socketError surfaced from useChatSocket ──────────────────
  it("surfaces socketError from useChatSocket when the socket reports an error", () => {
    // CHATTING phase
    mockUseParams.mockReturnValue({ conversationId: "12" })

    mockUseChatSocket.mockReturnValue({
      sendMessage: vi.fn(),
      streamingContent: "",
      isStreaming: false,
      socketError: "OpenRouter API error: 429 Too Many Requests",
    })

    const { result } = renderHook(() => useChat())

    // socketError is passed through in the fixed-shape return
    expect(result.current.socketError).toBe("OpenRouter API error: 429 Too Many Requests")
    // hasConversation reflects the URL state
    expect(result.current.hasConversation).toBe(true)
    // displayMessages does not crash when socketError is set
    expect(Array.isArray(result.current.displayMessages)).toBe(true)
  })
})
```

#### Edge Cases

1. **`vi.hoisted` for `mockNavigate`** — `vi.mock` factories are hoisted above all imports by Vitest. A const `mockNavigate = vi.fn()` defined at module level runs AFTER the hoist, making it `undefined` inside the factory. `vi.hoisted(() => vi.fn())` guarantees the mock is initialised before the factory executes. This is the established project pattern from `useLoginForm.test.ts`.
2. **`vi.clearAllMocks()` clears call history, not `mockReturnValue`** — `vi.clearAllMocks()` resets spy counts and call lists but does NOT remove `mockReturnValue` implementations. Each test's `beforeEach` explicitly re-sets every mock's return value. Tests that need different values override only what they need.
3. **`mockSocketSendMessage` refreshed per test** — Declared at module scope but assigned a fresh `vi.fn()` in `beforeEach`. This ensures call-count assertions from a previous test don't bleed into the next (complementary to `vi.clearAllMocks()`).
4. **`useParams` returns string values** — The URL param `:conversationId` is always a string. `useChat` must parse it to a number: `conversationIdParam ? parseInt(conversationIdParam, 10) : undefined`. Test 2 passes `{ conversationId: "12" }`, not `{ conversationId: 12 }`.
5. **`mock.calls[0]` for exact argument count** — `toHaveBeenCalledWith(a, b)` in Vitest verifies that SOME call had those arguments but does not enforce argument count strictly. Using `mock.calls[0]` with `toEqual(["content", 42])` is unambiguous about both the argument values AND the count.
6. **Test 3: `isStreaming: true` pre-set in mock** — `useChatSocket` is fully mocked; calling `result.current.sendMessage(...)` calls `mockSocketSendMessage` (a no-op). The `isStreaming: true` in the mock return is the starting state, not a reaction to `sendMessage`. This is correct for the test: we verify that `displayMessages` reflects the pending user message when streaming is in progress.
7. **`useNavigate` is NOT imported in the test file** — `mockNavigate` comes from `vi.hoisted(() => vi.fn())` and is used directly in assertions. Importing `useNavigate` from `react-router-dom` (the mocked version, which is an arrow function `() => mockNavigate`) would be an unused local variable. The project's `tsconfig.app.json` sets `noUnusedLocals: true` (TypeScript error) and ESLint's `@typescript-eslint/no-unused-vars` (ESLint error) both enforce this. Do NOT add `useNavigate` to the import.

---

### Step 2: Create `useChat.ts` (TDD GREEN)

**Goal:** Implement the hook so all 4 tests pass.
**Dependencies:** Step 1 (test file + RED confirmed). All 3 sub-hook files exist in `hooks/`.

- [ ] Create `project/srcs/frontend/src/features/chat/hooks/useChat.ts` with the content below
- [ ] Run `npm run test` from `project/srcs/frontend/` — confirm GREEN: **185 tests / 33 files, 0 failures, 0 regressions**
- [ ] Run `npm run typecheck` from `project/srcs/frontend/` — 0 errors
- [ ] Run `npx eslint src/features/chat/` from `project/srcs/frontend/` — 0 errors

**Why this step is critical:** `useChat` is the only public hook consumed by `ChatPage`. The same-instance first-message flow (the stale `useParams` closure pattern) is the most subtle correctness constraint in the feature. Any deviation from passing `id` as an explicit override to `useChatSocket.sendMessage` will silently open a WebSocket to `undefined` and the first message will never be delivered.

#### Implementation

```typescript
// project/srcs/frontend/src/features/chat/hooks/useChat.ts

import { useState, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useChatSetup } from "./useChatSetup"
import { useConversation } from "./useConversation"
import { useChatSocket } from "./useChatSocket"
import { createConversation } from "../services/chatService"
import type {
  EnabledModelDTO,
  ChatConversationDTO,
  ChatMessageDTO,
} from "../types"
import type { AgentListDTO } from "@/features/agents"

export interface UseChatResult {
  // --- useChatSetup fields (relevant in SETUP phase) ---
  selectedModelId: number | null
  setSelectedModelId: (id: number | null) => void
  selectedAgentId: number | null
  setSelectedAgentId: (id: number | null) => void
  enabledModels: EnabledModelDTO[]
  agents: AgentListDTO[]
  // Renamed to avoid collision with useConversation's isLoading / error
  setupIsLoading: boolean
  setupError: string | null

  // --- useConversation fields (relevant in CHATTING phase) ---
  conversation: ChatConversationDTO | null
  // Renamed to avoid collision with useChatSetup's isLoading / error
  conversationIsLoading: boolean
  conversationError: string | null

  // --- merged display list ---
  // Historical messages from useConversation + optimistic user bubble while
  // the backend hasn't yet returned the persisted USER message.
  displayMessages: ChatMessageDTO[]

  // --- useChatSocket fields ---
  streamingContent: string
  isStreaming: boolean
  socketError: string | null

  // --- orchestrator ---
  // Wraps the SETUP / CHATTING state machine. ChatPage calls this; it never
  // receives a conversationIdOverride — that detail is internal to useChat.
  sendMessage: (content: string) => Promise<void>
  hasConversation: boolean
}

export function useChat(): UseChatResult {
  // useParams returns string values for URL segments.
  // conversationId is parsed to number | undefined for sub-hooks.
  const { conversationId: conversationIdParam } = useParams<{
    conversationId?: string
  }>()
  const conversationId = conversationIdParam
    ? parseInt(conversationIdParam, 10)
    : undefined

  const navigate = useNavigate()

  // pendingUserMessage holds the content of the most recently sent message
  // until conv.messages catches up (dedup clears the optimistic bubble once
  // the persisted USER message appears in conv.messages).
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null)

  // All three sub-hooks called UNCONDITIONALLY at the top level in a fixed
  // lexical order on every render — Rules of Hooks (Finding 3).
  // DO NOT add early returns, conditional calls, or dynamic ordering.
  const setup = useChatSetup()
  const conv = useConversation(conversationId)
  const chatSocket = useChatSocket(conversationId)

  const hasConversation = conversationId !== undefined

  async function sendMessage(content: string): Promise<void> {
    // Track the optimistic user bubble before any async work.
    setPendingUserMessage(content)

    if (!hasConversation) {
      // SETUP phase: create the conversation, then navigate, then open the socket.

      // Guard: no model selected — UI should prevent this but guard defensively.
      if (setup.selectedModelId == null) return

      // Client-side title: "New Conversation DD/MM/YYYY HH:mm"
      const now = new Date()
      const dd = String(now.getDate()).padStart(2, "0")
      const mm = String(now.getMonth() + 1).padStart(2, "0")
      const yyyy = now.getFullYear()
      const HH = String(now.getHours()).padStart(2, "0")
      const min = String(now.getMinutes()).padStart(2, "0")
      const title = `New Conversation ${dd}/${mm}/${yyyy} ${HH}:${min}`

      const { id } = await createConversation({
        modelId: setup.selectedModelId,
        agentId: setup.selectedAgentId,
        title,
      })

      // replace: true so the empty /chat entry is overwritten — back button
      // leaves the chat cleanly rather than returning to a blank state.
      navigate(`/chat/${id}`, { replace: true })

      // Pass id as an explicit override — this is the SAME-INSTANCE FLOW:
      // ChatPage stays mounted across /chat → /chat/:id (no key, element= routes).
      // useParams() updates on the next render, not inside this event handler,
      // so the useChatSocket closure still sees conversationId: undefined here.
      // Without the override, the WS URL would be ws://…/ws/chat/undefined.
      chatSocket.sendMessage(content, id)
    } else {
      // CHATTING phase: conversationId is known, send directly.
      // No createConversation, no navigate, no override.
      chatSocket.sendMessage(content)
    }
  }

  // Build the display list: historical messages + optimistic user bubble.
  // The streaming bubble is NOT part of displayMessages — ChatMessages renders
  // it separately from isStreaming / streamingContent.
  const displayMessages = useMemo<ChatMessageDTO[]>(() => {
    const base = [...conv.messages]

    if (!pendingUserMessage) return base

    // Dedup: don't add the optimistic bubble once the persisted USER message
    // appears in conv.messages (content-based match on the most recent USER turn).
    const lastUserMsg = [...base].reverse().find((m) => m.role === "USER")
    if (lastUserMsg?.content === pendingUserMessage) return base

    // Append the optimistic user bubble with a synthetic id.
    const optimisticUser: ChatMessageDTO = {
      id: -1,
      conversationId: conversationId ?? -1,
      role: "USER",
      content: pendingUserMessage,
      llmModelId: null,
      inputTokens: null,
      outputTokens: null,
      createdAt: new Date().toISOString(),
    }

    return [...base, optimisticUser]
  }, [conv.messages, pendingUserMessage, conversationId])

  return {
    selectedModelId: setup.selectedModelId,
    setSelectedModelId: setup.setSelectedModelId,
    selectedAgentId: setup.selectedAgentId,
    setSelectedAgentId: setup.setSelectedAgentId,
    enabledModels: setup.enabledModels,
    agents: setup.agents,
    setupIsLoading: setup.isLoading,
    setupError: setup.error,

    conversation: conv.conversation,
    conversationIsLoading: conv.isLoading,
    conversationError: conv.error,
    displayMessages,

    streamingContent: chatSocket.streamingContent,
    isStreaming: chatSocket.isStreaming,
    socketError: chatSocket.socketError,

    sendMessage,
    hasConversation,
  }
}
```

#### Edge Cases

1. **`conversationIdParam ? parseInt(..., 10) : undefined`** — `useParams` always returns strings. Passing the string directly to `useChatSocket(conversationId)` would make `conversationId` a string, but `UseChatSocketResult.sendMessage` expects `number | undefined`. Parsing to `number | undefined` at the `useChat` boundary keeps sub-hooks clean.
2. **`setup.selectedModelId == null` guard in `sendMessage`** — The parent spec says the send button is disabled when `selectedModelId` is null. This guard is defensive; it prevents `createConversation` from being called with `modelId: null` which would cause a 400 from the backend. Returning early leaves `pendingUserMessage` set to the content — a minor inconsistency, but the input is disabled anyway so no further action can be taken.
3. **`createConversation` rejection** — If the POST fails (e.g., network error), `sendMessage` throws an unhandled rejection. `isStreaming` remains `false` (the socket was never opened) so the input re-enables. `pendingUserMessage` remains set, keeping the optimistic bubble visible. There is no `conversationCreateError` field — the parent spec does not define this error surface. Acceptable for MVP; note for a hardening task.
4. **`useMemo` with `new Date().toISOString()` in the optimistic bubble** — The `createdAt` field on the synthetic message calls `new Date()` at memo-compute time. This means the timestamp changes whenever the memo recomputes (any dependency change). This is acceptable because the synthetic message is display-only and is replaced by the real persisted message once `conv.messages` catches up.
5. **`pendingUserMessage` never cleared in this hook** — `pendingUserMessage` is set on `sendMessage` and removed by the dedup check (when the persisted USER message arrives in `conv.messages`). It is also implicitly replaced on the next `sendMessage` call (which calls `setPendingUserMessage(nextContent)`). There is no explicit reset on error or on `done`. This is intentional: keeping the pending message visible after an error or after streaming completes gives the user context for retry or history review.
6. **`conversationId ?? -1` in the optimistic bubble** — When `sendMessage` is called in SETUP, `conversationId` is still `undefined` (the `useParams` update comes on the next render). The synthetic `conversationId: -1` is a placeholder that will never match any real conversation. It is replaced by the real persisted message once `useConversation` loads.

---

### Step 3: Update the `index.ts` barrel

**Goal:** Export `useChat` and `UseChatResult` from the feature's public API.
**Dependencies:** Step 2 (GREEN confirmed — `useChat.ts` exists and exports `useChat` and `UseChatResult`).

- [ ] Edit `project/srcs/frontend/src/features/chat/index.ts` to add `useChat` and `UseChatResult` exports
- [ ] Run `npm run typecheck` from `project/srcs/frontend/` — 0 errors (verify the barrel re-export resolves correctly)

**Why this step is critical:** `ChatPage` (Task 7) will import `useChat` from `@/features/chat` (the barrel). If the barrel does not export `useChat`, the Task 7 import will fail with a module-resolution error.

#### Implementation

```typescript
// project/srcs/frontend/src/features/chat/index.ts
// Public API of the chat feature.
// Hooks and components are NOT re-exported — consumers import from here only.

export type {
  EnabledModelDTO,
  ChatConversationDTO,
  ChatMessageDTO,
  ChatCreateForm,
  ChatConversationMiniDTO,
} from "./types"

export { useChat } from "./hooks/useChat"
export type { UseChatResult } from "./hooks/useChat"
```

#### Edge Cases

1. **`export type { UseChatResult }`** — `verbatimModuleSyntax: true` in `tsconfig.app.json` requires type-only exports to use `export type`. Omitting `type` on a type-only re-export is a TypeScript error under this config.
2. **Internal hooks not re-exported** — `useChatSetup`, `useConversation`, `useChatSocket` remain internal. Task 7's `ChatPage` imports `useChat` from the barrel, not the deep paths. If a future task needs to import a sub-hook directly (e.g., a standalone component that needs only `useChatSetup`), it should import from the deep path, not the barrel.

---

## Design Decisions

**Decision 1:** `useChat` uses a fixed-shape return (no union type by phase).
- **Why:** The parent feature explicitly mandates this, consistent with `useAgentList`/`useEditAgent`. A union type (e.g., `{ phase: 'SETUP' } | { phase: 'CHATTING', ... }`) requires call-site type narrowing before accessing phase-specific fields, adding complexity to `ChatPage` without benefit. Fixed-shape means `ChatPage` can destructure the return once and use whichever fields are relevant to the current `hasConversation` state.
- **Alternatives considered:** Union return by phase — rejected (premature, adds call-site complexity, violates project convention).

**Decision 2:** `conversationIdOverride` is passed explicitly to `chatSocket.sendMessage` in SETUP (not derived from the updated `useParams`).
- **Why:** This is the core of the "same-instance flow" fix (Finding 2). `ChatPage` stays mounted across `/chat` → `/chat/:id` via `element=` route with no `key`. The `navigate('/chat/${id}')` call schedules a re-render; it does NOT synchronously update the `useParams()` return value within the current event handler closure. Calling `chatSocket.sendMessage(content)` without an override would use the stale `conversationId: undefined`, constructing a WS URL of `ws://localhost:8080/ws/chat/undefined?token=...` which the backend rejects (no conversation to attach to).
- **Alternatives considered:** Await the `useParams` update before calling `sendMessage` — impossible (React state updates are asynchronous; there is no hook to await them). Use a separate `useRef` to hold the id — adds state for no benefit; the override parameter is the correct idiom.

**Decision 3:** `pendingUserMessage` is a `useState` in `useChat` (not passed down from `ChatPage`).
- **Why:** The optimistic bubble is derived state from the hook's own `sendMessage` call. Placing `pendingUserMessage` in `ChatPage` would leak orchestration state into a composition layer. The deep-module principle: hide the optimistic UI bookkeeping behind the hook interface.
- **Alternatives considered:** Derive the pending message from the most recently sent content passed as a prop — rejected (creates coupling between `ChatPage` and the hook's internal timing).

**Decision 4:** Content-based dedup for the optimistic user bubble.
- **Why:** The parent says "dedup by `message.id`" but synthetic messages have id = `−1` (not a real db id). The practical equivalent: compare the most recently persisted USER message's `content` with `pendingUserMessage`. This fires at exactly the right moment — once `useConversation` loads the updated history (triggered by the `undefined → id` transition in the `[conversationId]`-keyed effect).
- **Alternatives considered:** Id-based dedup (requires the backend to echo back the exact synthetic id — not in the API contract). Suppress `useConversation` entirely while `isStreaming` is true (would delay loading history for the resume flow).

**Decision 5:** `sendMessage` is `async` regardless of phase.
- **Why:** In SETUP, it must `await createConversation`. A mixed sync/async API (`sendMessage` returns `Promise<void>` in SETUP but `void` in CHATTING) is confusing and causes TypeScript errors when `ChatPage` tries to type the callback. A consistently `async` function returns a resolved `Promise<void>` in CHATTING — zero cost, uniform API.
- **Alternatives considered:** Two separate functions (`sendFirstMessage`, `sendMessage`) surfaced by phase — rejected (adds `hasConversation` branching to `ChatPage`, which is supposed to be a thin composition layer with no business logic).

**Decision 6:** `FakeWebSocket` is NOT needed in `useChat.test.ts`.
- **Why:** `useChatSocket` is fully mocked at the module level. `useChat.test.ts` never opens a real WebSocket; it only verifies that `chatSocket.sendMessage` (the mock) was called with the correct arguments. The `FakeWebSocket` class lives in `useChatSocket.test.ts` where it was designed for.
- **Alternatives considered:** Integration test with real `FakeWebSocket` — rejected (mocking sub-hooks at the module level is the correct pattern for orchestrator tests; testing the full chain belongs to Task 7 manual validation).

---

## Testing Considerations

### Automatic Validation

- [ ] **RED confirmed:** Run `npm run test` from `project/srcs/frontend/` after creating `useChat.test.ts` but before creating `useChat.ts` — new suite must fail with `"Failed to resolve import './useChat'"` while all **181** pre-existing tests still pass
- [ ] **GREEN:** Run `npm run test` after creating `useChat.ts` and updating `index.ts` — **185 tests / 33 files, 0 failures, 0 regressions** (181 pre-existing + 4 new)
- [ ] **Typecheck:** Run `npm run typecheck` from `project/srcs/frontend/` — **0 errors** (verify after each step: after test file, after hook, after barrel update)
- [ ] **ESLint:** Run `npx eslint src/features/chat/` from `project/srcs/frontend/` — 0 errors (no `react-hooks/exhaustive-deps` disables needed — `useMemo` dependencies are complete; `sendMessage` is not in the dependency array of any effect)

### Manual Validation

No manual browser validation is required for this task. `useChat` is a data hook with no UI. The automated test suite fully validates all observable behaviors through the hook's public interface. End-to-end validation (sending a real message to the backend, seeing chunks stream in, URL updating to `/chat/:id`) is deferred to Task 7 when `ChatPage`, `ChatMessages`, and routing are wired up.

---

## Related Code Explanations

- `project/srcs/frontend/src/features/chat/hooks/useChatSetup.ts` — sub-hook 1; `UseChatSetupResult` interface; `isLoading`/`error` renamed to `setupIsLoading`/`setupError` in `useChat`
- `project/srcs/frontend/src/features/chat/hooks/useConversation.ts` — sub-hook 2; `UseConversationResult`; `isLoading`/`error` renamed to `conversationIsLoading`/`conversationError`
- `project/srcs/frontend/src/features/chat/hooks/useChatSocket.ts` — sub-hook 3; `sendMessage(content, override?)` signature; `wsRef` unmount-only cleanup (documented in `known-issues.md`)
- `project/srcs/frontend/src/features/chat/services/chatService.ts:15` — `createConversation` — the only service function `useChat` calls directly
- `project/srcs/frontend/src/features/authentication/hooks/useLoginForm.test.ts` — **primary TDD prior art for the `react-router-dom` mock**: `vi.hoisted(() => vi.fn())` for `mockNavigate` + `importOriginal` spread pattern
- `project/srcs/frontend/src/features/agents/hooks/useEditAgent.test.ts` — reference for mocking multiple hook dependencies + `vi.fn()` in module factory
- `documentation/Memory/known-issues.md` — ChatPage mount-preservation invariant (no `key` on routes, `element=` not `Component=`); `useChatSocket` WS-in-`useRef` unmount-only cleanup

---

## Completion Criteria

- [x] Parent document [[Employee-Chat-Interface]] reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected (`solid-deep-design`, `tdd`, `documentation-management`, `memory-bank`)
- [x] `project/srcs/frontend/src/features/chat/hooks/useChat.test.ts` created with 4 behavior tests
- [x] RED confirmed: `npm run test` fails with import error on `useChat`; 181 pre-existing tests unaffected
- [x] `project/srcs/frontend/src/features/chat/hooks/useChat.ts` created with `UseChatResult` interface and `useChat()` function
- [x] `project/srcs/frontend/src/features/chat/index.ts` updated to export `useChat` and `UseChatResult`
- [x] GREEN confirmed: `npm run test` → **185 tests / 33 files, 0 failures, 0 regressions**
- [x] `npm run typecheck` → **0 errors**
- [x] `npx eslint src/features/chat/` → 0 errors
- [x] Parent feature Steps 6.1 and 6.2 checkboxes updated to `[x]`
- [x] Parent feature Task 6 wiki link updated to `[[Employee-Chat-Interface-task-6-use-chat-orchestrator]]`
