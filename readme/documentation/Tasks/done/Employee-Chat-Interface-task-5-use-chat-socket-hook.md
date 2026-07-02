# Task: useChatSocket Hook

#task #current #high-complexity #parent-employee-chat-interface

**Parent:** [[Employee-Chat-Interface]]
**Parent Type:** Feature
**Related Step(s):** Phase 5, Steps 5.1, 5.2
**Estimated Complexity:** High

---

## Goal

Create `features/chat/hooks/useChatSocket.ts` — the hook that manages the full WebSocket lifecycle for a single chat turn: opens a fresh connection per send, transmits the user message, accumulates streaming chunks, signals `done`/`error`, and cleans up on unmount. The completed hook is the streaming engine consumed by `useChat` (Task 6).

---

## Parent Context

The parent feature mandates `useChatSocket(conversationId: number | undefined)` with **all `useState`/`useRef`/`useEffect` called unconditionally at the top of the hook on every render** (Rules of Hooks — Finding 3 from the feature review). The no-op for `conversationId: undefined` is implemented **inside `sendMessage`** as `if (target == null) return`, never as an early `return` before the hooks. This is non-negotiable: an early return before hooks crashes the first render after `conversationId` flips `undefined → id` (the SETUP→CHATTING same-instance flow that `useChat` depends on).

Key constraints from the parent:

- **Fixed-shape return** — always returns `{ sendMessage, streamingContent, isStreaming, socketError }`. There is no phase-dependent shape.
- **Single-use WebSocket per turn** — each `sendMessage` call opens a `new WebSocket(...)`. The backend closes the connection immediately after `done` or `error`. The hook never reuses a closed connection.
- **`conversationIdOverride`** — `sendMessage(content, conversationIdOverride?)`. On the first send from SETUP (`conversationId` is still `undefined` because `useParams()` has not updated yet), `useChat` passes the newly-created conversation id as `conversationIdOverride`. Without the override, the WebSocket URL would be `undefined` and the connection would never open.
- **`streamingContent` retained after `done`** — on a `done` frame, `setIsStreaming(false)` is called but `streamingContent` is **NOT cleared**. `useConversation` does NOT refetch on `done`, so clearing `streamingContent` here would lose the assistant response until a page refresh. `streamingContent` is cleared at the start of each new `sendMessage` call.
- **WS lifecycle invariant** — the active `WebSocket` is held in a `useRef` and closed **only on hook unmount** (in a `useEffect` keyed on `[]`). It is never closed in a `useEffect` keyed on `conversationId` — the `undefined → id` flip would tear down the in-flight first-turn socket.
- **JWT in query param** — the WS URL format is `ws://localhost:8080/ws/chat/${target}?token=${token}` where `token` comes from `getToken()` (from `services/authSession.ts`). The Vite proxy does NOT relay WebSocket upgrades; this is a direct connection to port 8080.
- **Error semantics** — on an `error` frame, `socketError` is set to the frame's `message` field and `isStreaming` becomes `false`. The WS is already closed by the backend. The input re-enables (controlled by `isStreaming`) for retry.
- **`ws.onerror`** — a low-level WS `onerror` event (e.g. connection refused, network drop) also sets a fallback `socketError` string and clears `isStreaming`.
- **TDD is mandatory** — the parent assigns this the "most complex module" designation and says the fake-WebSocket test pattern is new to the project and deserves its own carefully designed task.

---

## Preconditions / Dependencies

- **Task 1** (`GET /llm-model/enabled` backend endpoint) — complete and verified GREEN.
- **Task 2** (chat service and types) — `features/chat/types.ts`, `features/chat/services/chatService.ts`, and `features/chat/index.ts` barrel all exist and are verified GREEN.
- **Task 3** (`useChatSetup` hook) — complete and verified GREEN. `features/chat/hooks/` directory exists.
- **Task 4** (`useConversation` hook) — complete and verified GREEN. `useConversation.ts` and `useConversation.test.ts` are in `hooks/`.
- Frontend test baseline before this task: **174 tests / 31 files** (`npm run test` passes clean from `project/srcs/frontend/`).
- `project/srcs/frontend/src/services/authSession.ts` — `getToken(): string | null` exists at line 27 (confirmed from codebase). All other exports (`saveSession`, `clearSession`, `getUsername`, `getRoles`, `hasRole`, `hasAnyRole`, `isAuthenticated`, `isAdmin`, `isEmployee`) must be listed in the `vi.mock` factory.
- **`jsdom` 29.1.1** (installed) — supports `queueMicrotask`, required by `FakeWebSocket`'s async open simulation.
- **All `npm` commands in this task run from `project/srcs/frontend/`** — never from the project root.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `solid-deep-design` — **Selected** — `useChatSocket` is a deep module: interface is 4 fields (1 function + 3 state values); implementation hides WS URL construction, JWT injection, connection lifecycle, JSON frame parsing, chunk accumulation, error classification, and unmount cleanup. Deletion test: without this hook, all WS logic would scatter into `useChat` or `ChatPage`.
- `tdd` — **Selected** — TDD is mandatory. Write `useChatSocket.test.ts` first (RED — import fails), then create `useChatSocket.ts` (GREEN). Each test verifies one observable behavior through the hook's public interface.
- `documentation-management` — **Selected** — task document creation, parent feature link update.
- `memory-bank` — **Selected** — all Memory Bank files read. `known-issues.md` documents critical WebSocket constraints: JWT must be passed as `?token=` query param; WS SecurityContext must be set per-message (backend concern only); `StandardWebSocketClient` not needed (tests use `FakeWebSocket`). `architecture.md` documents `ChatWebSocketHandler` and `JwtHandshakeInterceptor` behavior.
- `find-docs` — **Not needed** — `ctx7` CLI is not installed in this environment. All APIs involved (browser `WebSocket`, Vitest `renderHook`/`act`, `vi.stubGlobal`, `queueMicrotask`) are well-established and identical to their use in prior tasks (React 19, Vitest 4). Internal knowledge is sufficient and consistent with the established test patterns in `useChatSetup.test.ts` and `useConversation.test.ts`.
- `glossary-management` — **Not needed** — `glossary` CLI not available; domain terms "Conversation", "Message", "Employee", "LLM Model", "WebSocket turn" are established.

### Documentation Reviewed

- `documentation/Docs/API-Reference/WebSocket-Chat.md` — confirmed WS URL format, frame shapes (`chunk`/`done`/`error`), and the critical constraint: **connection is closed after every `done` or `error` frame** (backend `ChatWebSocketHandler` calls `session.close()` after any exception, making each WS single-use per turn).
- `project/srcs/frontend/src/services/authSession.ts:27` — confirmed `getToken(): string | null` returns the JWT from `localStorage`, returns `null` if session expired.
- `project/srcs/frontend/src/features/chat/hooks/useChatSetup.ts` — reference for `useState`, `useRef`, `useEffect` structure, `cancelled` flag cleanup pattern.
- `project/srcs/frontend/src/features/chat/hooks/useChatSetup.test.ts` — **primary TDD prior art**: `vi.mock` module factory with all exports, `vi.mocked()`, `vi.clearAllMocks()` in `beforeEach`, deferred-promise test for in-flight state.
- `project/srcs/frontend/src/features/chat/hooks/useConversation.test.ts` — reference for `renderHook` + `act` async flush pattern and `rerender` test.
- `documentation/Memory/known-issues.md` — WebSocket constraints section confirming: JWT via `?token=`, WS skips Vite proxy (direct to port 8080), `ChatPage` must stay mounted across `/chat` → `/chat/:id`.

### Related Existing Code

- `project/srcs/frontend/src/services/authSession.ts` — `getToken()` at line 27 — JWT source for WS URL
- `project/srcs/frontend/src/features/chat/hooks/useChatSetup.ts` — reference for hook structure, `useRef`, `useEffect` on `[]`
- `project/srcs/frontend/src/features/chat/hooks/useChatSetup.test.ts` — **primary TDD prior art**
- `project/srcs/frontend/src/features/chat/hooks/useConversation.ts` — the sibling hook whose no-op pattern this hook mirrors in `sendMessage`
- `project/srcs/frontend/src/features/chat/types.ts` — not directly imported by this hook (WS frames are parsed as plain JSON)

---

## Implementation Details

### Approach

**SOLID / Depth analysis:**

| Module | SRP | Depth |
|--------|-----|-------|
| `useChatSocket` | ONE reason to change: WebSocket turn protocol changes (URL scheme, frame format, authentication mechanism, retry policy) | **Deep** — interface: 4 fields. Implementation: URL construction with JWT injection, fresh WS per turn, JSON frame parsing (chunk/done/error), chunk accumulation with functional `setState`, `isStreaming` lifecycle, `socketError` classification, `wsRef` cleanup on unmount. |
| `UseChatSocketResult` | Pure interface — the contract | Shallow by design (declaration only) |

**Deletion test:** If `useChatSocket` were deleted, `useChat` would contain WS URL construction, JWT injection, frame parsing, chunk accumulation, and the `useRef` + cleanup lifecycle inline — scattering all WS complexity into the orchestrator. The module earns its keep.

**Why `useState` for `streamingContent` (not `useRef`):**

`streamingContent` must trigger re-renders (UI must update as chunks arrive). A `useRef` would not cause `ChatMessages` to re-render. `useState` with a functional updater (`(prev) => prev + chunk`) is the correct pattern for safe concurrent-mode accumulation.

**Why `wsRef` is a `useRef` (not `useState`):**

The active `WebSocket` instance must not trigger re-renders when a new connection is opened. `useState(null)` would schedule a re-render on each `sendMessage`, unnecessary because the WS object itself is not displayed. `useRef` provides mutable storage without rendering.

**Why `useEffect` keyed on `[]` for cleanup (not `[conversationId]`):**

The `conversationId` flips from `undefined` to a real id on the first message send (SETUP→CHATTING transition). A `useEffect` keyed on `[conversationId]` would fire its cleanup (`wsRef.current?.close()`) at exactly that moment — tearing down the in-flight socket mid-turn. The `[]` key means cleanup fires only on hook unmount, which is the correct and only safe moment to close the WS.

**Why `streamingContent` is cleared at the start of `sendMessage`, not at `done`:**

The parent spec mandates retaining `streamingContent` after `done` because `useConversation` does not refetch on `done`. Clearing `streamingContent` on `done` would make the assistant's response disappear from the UI immediately after generation completes — until a page refresh restores it via `useConversation`. `useChat` will clear `streamingContent` once the persisted ASSISTANT message enters the display list via the dedup-merge. The next `sendMessage` call explicitly clears `streamingContent` to `""` before the new turn's chunks start arriving.

**Note on Step 5.2 test requirement — `done` frame behavior:**

The parent document's Step 5.2 lists: `"done frame clears streamingContent and sets isStreaming = false"`. This description conflicts with the architecture section (Step 5.1, Step 7.3, and the Risk §"WS lifecycle invariant") which is explicit that `streamingContent` must be **retained** after `done`. The architecture section is the authoritative source. The test in this task verifies the correct behavior: `streamingContent` is retained after `done`. The Step 5.2 list entry was written before the Finding 6 decision was finalized and should not be followed.

**FakeWebSocket design:**

A `FakeWebSocket` class is defined at the top of the test file (not in a separate setup file — it is local to this test's needs; if `useChat.test.ts` needs it, extract it then). The class:
- Tracks all created instances in `FakeWebSocket.instances: FakeWebSocket[]`
- Accepts the URL string and stores it for assertion
- Fires `onopen` asynchronously via `queueMicrotask` (available in jsdom 29.1.1)
- Provides `receiveMessage(data: string)` as a test-helper to simulate server frames
- Implements `send(data)` (captures messages) and `close()` (no-op)

### Files to Create/Modify

> **TDD order:** Write `useChatSocket.test.ts` first (Step 1 — RED), then `useChatSocket.ts` (Step 2 — GREEN).

- [x] `project/srcs/frontend/src/features/chat/hooks/useChatSocket.test.ts` — **new** — 7 behavior tests, `FakeWebSocket` class — **create first (TDD RED)**
- [x] `project/srcs/frontend/src/features/chat/hooks/useChatSocket.ts` — **new** — the hook implementation

---

## Step-by-Step Implementation

### Step 1: Write the test file (TDD RED)

**Goal:** Write all 7 behavior tests with the `FakeWebSocket` class, confirm RED (import fails — `useChatSocket.ts` does not exist yet).
**Dependencies:** Tasks 2–4 complete — `hooks/` directory and `chatService.ts` exist.

- [x] Create `project/srcs/frontend/src/features/chat/hooks/useChatSocket.test.ts` with the content below
- [x] Run `npm run test` from `project/srcs/frontend/` — confirm RED: new suite fails with `"Failed to resolve import './useChatSocket'"` while all **174** pre-existing tests still pass

**Why RED must be confirmed:** A test that passes before the implementation exists does not verify what you think. The import-resolution failure is the correct RED for this task.

#### Implementation

```typescript
// project/srcs/frontend/src/features/chat/hooks/useChatSocket.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useChatSocket } from "./useChatSocket"
import { getToken } from "@/services/authSession"

// ---------------------------------------------------------------------------
// FakeWebSocket — in-file fake for the browser WebSocket API.
// jsdom does not implement WebSocket; vi.stubGlobal replaces the global
// before each test and vi.unstubAllGlobals() restores it after.
// ---------------------------------------------------------------------------

class FakeWebSocket {
  static instances: FakeWebSocket[] = []

  url: string
  sentMessages: string[] = []

  // Event handler slots — the hook attaches to these after construction.
  onopen: ((ev: Event) => void) | null = null
  onmessage: ((ev: MessageEvent) => void) | null = null
  onerror: ((ev: Event) => void) | null = null
  onclose: ((ev: CloseEvent) => void) | null = null

  constructor(url: string) {
    this.url = url
    FakeWebSocket.instances.push(this)
    // Fire onopen asynchronously (next microtask) so the hook has a chance
    // to assign its onopen handler before it fires — matches real WS behavior.
    // queueMicrotask is available in jsdom 29.1.1 (project dependency).
    queueMicrotask(() => {
      this.onopen?.({} as Event)
    })
  }

  send(data: string): void {
    this.sentMessages.push(data)
  }

  close(): void {
    // Intentional no-op — tests do not verify server-side close side effects.
  }

  // Test helper: simulate a text frame received from the server.
  receiveMessage(data: string): void {
    this.onmessage?.({ data } as MessageEvent)
  }

  // Test helper: simulate a low-level WS error event.
  triggerError(): void {
    this.onerror?.({} as Event)
  }
}

// ---------------------------------------------------------------------------
// Mock @/services/authSession — useChatSocket reads getToken() for the JWT.
// All exports listed to avoid "undefined" in the module scope of this file.
// ---------------------------------------------------------------------------

vi.mock("@/services/authSession", () => ({
  saveSession: vi.fn(),
  clearSession: vi.fn(),
  getToken: vi.fn(),
  getUsername: vi.fn(),
  getRoles: vi.fn().mockReturnValue([]),
  hasRole: vi.fn().mockReturnValue(false),
  hasAnyRole: vi.fn().mockReturnValue(false),
  isAuthenticated: vi.fn().mockReturnValue(false),
  isAdmin: vi.fn().mockReturnValue(false),
  isEmployee: vi.fn().mockReturnValue(false),
}))

// vi.mocked() requires the imported value — use value import (not import type) for vi.mocked() calls.
// This is the established project convention (see useChatSetup.test.ts, useConversation.test.ts).
// <!-- REVIEW-FIX: Added vi.mocked() comment consistent with established project pattern -->
const mockGetToken = vi.mocked(getToken)

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  FakeWebSocket.instances = []
  // vi.stubGlobal takes a string key ("WebSocket") and val: unknown — no cast needed.
  // jsdom does not provide WebSocket natively; this stub is the only WS implementation
  // in tests. vi.unstubAllGlobals() in afterEach restores globalThis.WebSocket to
  // undefined (its jsdom value) after each test.
  vi.stubGlobal("WebSocket", FakeWebSocket)
  vi.clearAllMocks()
  // Happy-path default: a valid JWT is available for every test.
  // Re-set after vi.clearAllMocks() (which clears call history but not implementations).
  mockGetToken.mockReturnValue("test-jwt-token")
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useChatSocket", () => {
  // ── Test 1: No-op when conversationId is undefined and no override ─────────
  it("sendMessage is a no-op when conversationId is undefined and no override is provided", () => {
    const { result } = renderHook(() => useChatSocket(undefined))

    act(() => {
      result.current.sendMessage("hello")
    })

    // No WebSocket opened — target was null/undefined so the guard short-circuited.
    expect(FakeWebSocket.instances).toHaveLength(0)
    expect(result.current.isStreaming).toBe(false)
    expect(result.current.streamingContent).toBe("")
    expect(result.current.socketError).toBeNull()
  })

  // ── Test 2: isStreaming true on sendMessage, false on done frame ───────────
  it("isStreaming becomes true immediately on sendMessage and false after the done frame", async () => {
    const { result } = renderHook(() => useChatSocket(12))

    act(() => {
      result.current.sendMessage("What is the capital of France?")
    })

    // isStreaming is set synchronously inside sendMessage — no flush needed.
    expect(result.current.isStreaming).toBe(true)

    // Flush microtask: FakeWebSocket's queueMicrotask fires onopen → ws.send().
    await act(async () => {
      await Promise.resolve()
    })

    expect(FakeWebSocket.instances).toHaveLength(1)

    const ws = FakeWebSocket.instances[0]

    // Simulate done frame from server.
    act(() => {
      ws.receiveMessage(
        JSON.stringify({ type: "done", messageId: 42, inputTokens: 10, outputTokens: 5 })
      )
    })

    expect(result.current.isStreaming).toBe(false)
  })

  // ── Test 3: Multiple chunk frames accumulate in order ─────────────────────
  it("accumulates multiple chunk frames into streamingContent in arrival order", async () => {
    const { result } = renderHook(() => useChatSocket(12))

    act(() => {
      result.current.sendMessage("hello")
    })

    await act(async () => {
      await Promise.resolve()
    })

    const ws = FakeWebSocket.instances[0]

    act(() => {
      ws.receiveMessage(JSON.stringify({ type: "chunk", content: "The " }))
      ws.receiveMessage(JSON.stringify({ type: "chunk", content: "capital " }))
      ws.receiveMessage(JSON.stringify({ type: "chunk", content: "is Paris." }))
    })

    expect(result.current.streamingContent).toBe("The capital is Paris.")
    expect(result.current.isStreaming).toBe(true)
  })

  // ── Test 4: done retains streamingContent ─────────────────────────────────
  // Note: the parent's Step 5.2 says "done clears streamingContent" — this
  // description is incorrect and contradicts the architecture section (Step 5.1,
  // Step 7.3, Risk §"WS lifecycle invariant"). The correct behavior is to RETAIN
  // streamingContent after done so useChat can render the completed assistant
  // message as <ReactMarkdown> before useConversation has it (useConversation
  // does NOT refetch on done — clearing here would lose the response until refresh).
  it("retains streamingContent after the done frame and sets isStreaming to false", async () => {
    const { result } = renderHook(() => useChatSocket(12))

    act(() => {
      result.current.sendMessage("hello")
    })

    await act(async () => {
      await Promise.resolve()
    })

    const ws = FakeWebSocket.instances[0]

    act(() => {
      ws.receiveMessage(JSON.stringify({ type: "chunk", content: "Paris." }))
      ws.receiveMessage(
        JSON.stringify({ type: "done", messageId: 42, inputTokens: 5, outputTokens: 3 })
      )
    })

    // streamingContent is RETAINED — not cleared — after done.
    expect(result.current.streamingContent).toBe("Paris.")
    expect(result.current.isStreaming).toBe(false)
    expect(result.current.socketError).toBeNull()
  })

  // ── Test 5: error frame sets socketError and clears isStreaming ────────────
  it("sets socketError with the frame message and clears isStreaming on an error frame", async () => {
    const { result } = renderHook(() => useChatSocket(12))

    act(() => {
      result.current.sendMessage("hello")
    })

    await act(async () => {
      await Promise.resolve()
    })

    const ws = FakeWebSocket.instances[0]

    act(() => {
      ws.receiveMessage(
        JSON.stringify({ type: "error", message: "OpenRouter API error: 429 Too Many Requests" })
      )
    })

    expect(result.current.socketError).toBe("OpenRouter API error: 429 Too Many Requests")
    expect(result.current.isStreaming).toBe(false)
  })

  // ── Test 6: Two sendMessage calls open fresh WebSocket connections ─────────
  // <!-- REVIEW-FIX: Added chunk + done to first turn so the streamingContent
  // assertion is non-trivial — without a chunk, streamingContent is "" both before
  // and after the second sendMessage, making the "cleared" assertion trivially true
  // and unable to detect a missing setStreamingContent("") call in sendMessage. -->
  it("opens a fresh WebSocket connection on each sendMessage call and clears streamingContent from the previous turn", async () => {
    const { result } = renderHook(() => useChatSocket(12))

    // First turn — includes a chunk so streamingContent is non-empty after done.
    act(() => {
      result.current.sendMessage("first message")
    })

    await act(async () => {
      await Promise.resolve()
    })

    // Simulate a chunk and done for the first turn.
    act(() => {
      FakeWebSocket.instances[0].receiveMessage(
        JSON.stringify({ type: "chunk", content: "First response." })
      )
      FakeWebSocket.instances[0].receiveMessage(
        JSON.stringify({ type: "done", messageId: 1, inputTokens: 5, outputTokens: 3 })
      )
    })

    // After done: streamingContent retained (non-empty), isStreaming false.
    expect(result.current.streamingContent).toBe("First response.")
    expect(result.current.isStreaming).toBe(false)
    expect(FakeWebSocket.instances).toHaveLength(1)

    // Second turn — sendMessage must clear the retained streamingContent and open a new WS.
    act(() => {
      result.current.sendMessage("second message")
    })

    // streamingContent cleared synchronously inside sendMessage — no flush needed.
    expect(result.current.streamingContent).toBe("")
    expect(result.current.isStreaming).toBe(true)

    await act(async () => {
      await Promise.resolve()
    })

    // A second FakeWebSocket was created — the turn is single-use per send.
    expect(FakeWebSocket.instances).toHaveLength(2)
    expect(FakeWebSocket.instances[1]).not.toBe(FakeWebSocket.instances[0])
    const secondWs = FakeWebSocket.instances[1]
    expect(secondWs.sentMessages).toHaveLength(1)
    expect(JSON.parse(secondWs.sentMessages[0])).toEqual({ content: "second message" })
  })

  // ── Test 7: conversationIdOverride routes to the correct URL ──────────────
  // This covers the SETUP-phase first-send: conversationId is still undefined
  // (useParams has not updated yet) when useChat calls sendMessage with the
  // newly-created conversation id as an explicit override.
  it("uses conversationIdOverride when provided — opens WS to the override id even when conversationId is undefined", async () => {
    // SETUP phase: conversationId is undefined (ChatPage not yet at /chat/:id).
    const { result } = renderHook(() => useChatSocket(undefined))

    act(() => {
      result.current.sendMessage("hello", 99)
    })

    // A WS was opened despite conversationId being undefined.
    expect(FakeWebSocket.instances).toHaveLength(1)
    expect(FakeWebSocket.instances[0].url).toContain("/ws/chat/99")
    expect(FakeWebSocket.instances[0].url).toContain("?token=test-jwt-token")
    expect(result.current.isStreaming).toBe(true)

    await act(async () => {
      await Promise.resolve()
    })

    // The message was sent to the correct WS.
    expect(FakeWebSocket.instances[0].sentMessages).toHaveLength(1)
    expect(JSON.parse(FakeWebSocket.instances[0].sentMessages[0])).toEqual({ content: "hello" })
  })
})
```

#### Edge Cases

1. **`vi.clearAllMocks()` in `beforeEach`** — clears call history from the previous test. Does NOT reset `mockReturnValue` implementations (`vi.clearAllMocks` ≠ `vi.resetAllMocks`). The `mockGetToken.mockReturnValue("test-jwt-token")` after `clearAllMocks` re-establishes the happy-path JWT for each test.
2. **`vi.stubGlobal` + `vi.unstubAllGlobals()`** — `stubGlobal` replaces `globalThis.WebSocket` with `FakeWebSocket`; `unstubAllGlobals` restores the original value (which is `undefined` in jsdom — jsdom does not implement `WebSocket`). Must be in `beforeEach`/`afterEach` (not in the `vi.mock` factory, which runs at module-load time, not per-test).
3. **`FakeWebSocket.instances = []` in `beforeEach`** — clears the static instance list. Without this, instances from a previous test would bleed into the current test's assertions on `toHaveLength`.
4. **`queueMicrotask` ordering** — `sendMessage` calls `new FakeWebSocket(url)` which queues `onopen` as a microtask. The test then calls `await act(async () => { await Promise.resolve() })` which yields to the microtask queue, triggering `onopen` → `ws.send()`. Assertions on `sentMessages` after the flush are safe.
5. **Test 2: `isStreaming` checked before flush** — `isStreaming` is set synchronously inside `sendMessage` (before the async `onopen` fires). No `act` flush needed to verify `isStreaming === true` immediately after the synchronous `sendMessage` call inside the outer `act`.
6. **Test 6: `streamingContent` cleared at second `sendMessage`** — `setStreamingContent("")` is called synchronously inside `sendMessage` (before the new WS opens). The assertion `expect(result.current.streamingContent).toBe("")` after the second `act(() => sendMessage(...))` is valid without an extra flush.

---

### Step 2: Create `useChatSocket.ts` (TDD GREEN)

**Goal:** Implement the hook so all 7 tests pass.
**Dependencies:** Step 1 (test file + RED confirmed). `services/authSession.ts` exists with `getToken()`.

- [x] Create `project/srcs/frontend/src/features/chat/hooks/useChatSocket.ts` with the content below
- [x] Run `npm run test` from `project/srcs/frontend/` — confirm GREEN: **181 tests / 32 files, 0 failures, 0 regressions**
- [x] Run `npm run typecheck` from `project/srcs/frontend/` — 0 errors
- [x] Run `npx eslint src/features/chat/` from `project/srcs/frontend/` — 0 errors

**Why this step is critical:** `useChatSocket` is the streaming engine for the entire chat feature. The three invariants below are load-bearing for the same-instance first-message flow, the display-list dedup-merge in `useChat`, and the markdown render-after-`done` behavior in `ChatMessages`. A wrong `if (conversationId == null) return` before hooks, a wrong cleanup key, or clearing `streamingContent` on `done` would each silently break downstream features in ways that are hard to diagnose.

#### Implementation

```typescript
// project/srcs/frontend/src/features/chat/hooks/useChatSocket.ts

import { useState, useRef, useEffect } from "react"
import { getToken } from "@/services/authSession"

export interface UseChatSocketResult {
  sendMessage: (content: string, conversationIdOverride?: number) => void
  streamingContent: string
  isStreaming: boolean
  socketError: string | null
}

export function useChatSocket(conversationId: number | undefined): UseChatSocketResult {
  const [streamingContent, setStreamingContent] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [socketError, setSocketError] = useState<string | null>(null)
  // wsRef holds the active WebSocket without triggering re-renders.
  // Closed ONLY on unmount — never in a conversationId-keyed effect (which would
  // tear down the in-flight first-turn socket when conversationId flips undefined → id).
  const wsRef = useRef<WebSocket | null>(null)

  // Unmount cleanup keyed on [] — single-teardown lifetime.
  // DO NOT key this effect on conversationId: the first send flips conversationId
  // undefined → id, and a conversationId-keyed cleanup would close the live socket.
  useEffect(() => {
    return () => {
      wsRef.current?.close()
    }
  }, [])

  function sendMessage(content: string, conversationIdOverride?: number): void {
    const target = conversationIdOverride ?? conversationId
    // No-op guard INSIDE sendMessage — never a return before hooks.
    // Rules of Hooks: all useState/useRef/useEffect must be called unconditionally.
    // An early return before hooks violates Rules of Hooks and crashes the first
    // render after conversationId flips undefined → id (SETUP→CHATTING transition).
    if (target == null) return

    const token = getToken()
    const url = `ws://localhost:8080/ws/chat/${target}?token=${token ?? ""}`

    // Synchronously reset transient state for the new turn before the WS opens.
    // streamingContent is cleared here (not on done) — see Design Decision 4.
    setStreamingContent("")
    setIsStreaming(true)
    setSocketError(null)

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({ content }))
    }

    ws.onmessage = (event: MessageEvent) => {
      const frame = JSON.parse(event.data as string) as {
        type: string
        content?: string
        message?: string
      }

      if (frame.type === "chunk") {
        // Functional updater is safe under concurrent mode — avoids stale closure
        // over the previous streamingContent value.
        setStreamingContent((prev) => prev + (frame.content ?? ""))
      } else if (frame.type === "done") {
        // isStreaming → false; streamingContent is RETAINED.
        // useConversation does NOT refetch on done — clearing here loses the
        // assistant response until a page refresh. useChat clears it via the
        // dedup-merge once the persisted ASSISTANT message is in the display list.
        setIsStreaming(false)
      } else if (frame.type === "error") {
        setSocketError(frame.message ?? "An error occurred during the chat turn.")
        setIsStreaming(false)
      }
    }

    ws.onerror = () => {
      // Low-level connection failure (refused, dropped). The backend also sends
      // an error frame in application-level failures, so this is a fallback.
      setSocketError("WebSocket connection error.")
      setIsStreaming(false)
    }
  }

  return { sendMessage, streamingContent, isStreaming, socketError }
}
```

#### Edge Cases

1. **`target == null` (loose equality)** — catches both `undefined` and `null`. The parameter type is `number | undefined`, but loose equality is defensive and matches the convention established in `useConversation.ts` ("when `conversationId == null`" in the parent spec).
2. **`getToken()` returns `null`** — if the session expired between page load and first send, `token` is `null`. The URL becomes `?token=` (empty string). The backend's `JwtHandshakeInterceptor` rejects the upgrade with 401. The `ws.onerror` handler fires, sets `socketError`, and `isStreaming` is cleared. The user sees an error bubble and is redirected to login by the `setOnUnauthorized` callback in `main.tsx`. This is expected behavior per the parent feature's Risk §.
3. **Functional updater in `setStreamingContent`** — `(prev) => prev + chunk` avoids the stale-closure problem where a batch of `chunk` frames received in the same event loop tick would each capture the same `streamingContent` value. With functional updaters, each update is queued relative to the last committed state.
4. **`ws.onmessage` JSON parse error** — if the backend sends malformed JSON (not expected in the implemented `ChatOutgoingFrame` protocol, but possible in edge cases), `JSON.parse` will throw. This bubbles to `ws.onerror` or crashes silently. For MVP, this is acceptable — the established risk assessment does not require defensive JSON parsing.
5. **`wsRef.current?.close()` on unmount** — calls `close()` on the WebSocket if it is still open. This handles the case where the user navigates away mid-stream. The backend's `afterConnectionClosed` handler on the Spring side cleans up its session state.
6. **Second `sendMessage` before first `done`** — the second call sets `wsRef.current = ws2` (new WS). The first WS (`ws1`) is now dereferenced. Its `onmessage`/`onopen` handlers still hold closures to the state setters, so any late-arriving frames from `ws1` will still call `setStreamingContent`, `setIsStreaming`, etc. For MVP (and given the backend closes the WS after done/error, making late frames impossible in practice), this is acceptable. `useChatSocket` disables the input during streaming (`isStreaming = true`), making double-sends only possible through programmatic calls (not user action).
7. **Backend crash before `done`/`error` frame** — if the backend crashes mid-stream, the WS closes via `onclose` without a preceding `done` or `error` frame. The `ws.onerror` handler may or may not fire (browser behavior varies: Chrome fires `onerror` before `onclose` on abnormal closure; Firefox may not). With neither handler firing, `isStreaming` stays `true` permanently and the input remains disabled. This is a known MVP gap. A defensive `ws.onclose` handler could reset `isStreaming` if still `true`, but the parent spec does not mandate it and it would require an additional test. Acceptable for MVP; note for a follow-up hardening task.
<!-- REVIEW-FIX: Added edge case 7 — backend crash mid-stream leaves isStreaming stuck; documented as known MVP gap per parent risk assessment. -->

---

## Design Decisions

**Decision 1:** `streamingContent` is retained after `done` (not cleared).
- **Why:** `useConversation` does not refetch on `done` (the parent spec mandates this to avoid the streaming bubble disappearing while `useConversation` re-fetches). If `streamingContent` were cleared on `done`, the assistant response would vanish from the UI immediately after generation completes — until the user refreshes the page. `useChat` (Task 6) manages the lifecycle: the streaming bubble stays visible (via `streamingContent`) until the persisted ASSISTANT message enters the display list and the dedup-merge replaces it. At that point, or on the next `sendMessage`, `streamingContent` is cleared.
- **Important:** The parent document's Step 5.2 lists `"done frame clears streamingContent"` — this text is incorrect. The architecture section (Step 5.1 body, Step 7.3, and Risk §"WS lifecycle invariant") is explicit that `streamingContent` must be retained. Test 4 verifies the correct behavior.
- **Alternatives considered:** Clear `streamingContent` on `done` — rejected (response disappears from UI until page refresh; breaks the streaming-bubble → markdown transition in `ChatMessages`). Clear `streamingContent` on the next `sendMessage` only — **this is the correct choice and is what the implementation does** (see `setStreamingContent("")` at the start of `sendMessage`).

**Decision 2:** `useEffect` cleanup keyed on `[]` (unmount only).
- **Why:** The hook's `conversationId` transitions from `undefined` to a real id on the first message send (SETUP→CHATTING). A `useEffect` keyed on `[conversationId]` runs its cleanup whenever `conversationId` changes — exactly when the first-turn socket is in-flight. Keying on `[]` means cleanup fires only on component unmount, which is the only correct moment to close the WS. This invariant is documented in `known-issues.md`.
- **Alternatives considered:** `useEffect(() => { ... }, [conversationId])` — rejected (tears down the in-flight socket on `undefined → id` transition). No cleanup at all — rejected (socket leak on navigation away from chat page).

**Decision 3:** `setIsStreaming(true)` called synchronously inside `sendMessage` (before the WS opens).
- **Why:** The UI (`ChatInput`) disables the send button while `isStreaming` is true. If `setIsStreaming(true)` were deferred to `onopen`, there would be a brief window between the button click and the WS open where the user could click send again. Setting it synchronously in `sendMessage` closes this window. The FakeWebSocket-based tests verify this: Test 2 asserts `isStreaming === true` immediately after `sendMessage` without any `act` flush.
- **Alternatives considered:** Set `isStreaming` in `onopen` — rejected (brief double-send window between `sendMessage` and `onopen`). Set `isStreaming` in a `useEffect` — rejected (adds a re-render cycle between the user action and the UI feedback).

**Decision 4:** `streamingContent` cleared at the start of `sendMessage` (synchronously).
- **Why:** Previous turn's retained `streamingContent` must be cleared before new chunks arrive. Clearing it synchronously at the start of `sendMessage` (before the new WS opens) ensures the UI shows the streaming bubble starting from empty for the new turn. If clearing were deferred to `onopen`, there would be a brief moment where the previous response is still visible as the new WS connects — disorienting.
- **Alternatives considered:** Clear in `onopen` — rejected (brief flash of previous content). Clear on `done` — rejected (removes the content too early, per Decision 1).

**Decision 5:** `FakeWebSocket` defined in the test file (not a shared setup file).
- **Why:** It is the first and only test file in the project that needs a WebSocket fake. Extracting it to a shared file (e.g., `src/test-utils/FakeWebSocket.ts`) before a second consumer exists would be premature — "one adapter = hypothetical seam" per `solid-deep-design`. Task 6 (`useChat.test.ts`) will mock `useChatSocket` directly (not call `sendMessage` through a real WS), so it does not need `FakeWebSocket`. If a future test does need it, extract it then with a real second consumer.
- **Alternatives considered:** Shared test utility module — rejected (premature abstraction; no second consumer at Task 5 time). Vitest global setup file — rejected (adds build complexity for a single-test-file concern).

**Decision 6:** `ws.onerror` sets a generic fallback `socketError` (not the event's detail). No test is written for this code path.
- **Why:** The browser `WebSocket` `ErrorEvent` provides limited information (no error message in most browser implementations for security reasons). The `message` field of `ErrorEvent` is typically empty or generic. Application-level errors are always surfaced as `error` frames (JSON with a `message` field) by the backend before it closes the connection. The `ws.onerror` handler is therefore a fallback for low-level connection failures (refused, network drop) where no application-level error frame will arrive. A generic string is appropriate. The `FakeWebSocket.triggerError()` helper exists in the test file but is not used by any of the 7 mandated tests — the parent's Step 5.2 test list covers application-level `error` frames only (`Test 5`), not low-level `onerror` events.
- **Alternatives considered:** Expose `ErrorEvent.message` — rejected (typically empty; adds complexity for no user-facing benefit). Throw instead of setting `socketError` — rejected (would crash the render tree; errors must be inline bubbles per the parent spec). Write an `onerror` unit test — deferred (not in parent's test list; the `triggerError()` helper is in the file for future use).
<!-- REVIEW-FIX: Clarified that ws.onerror path has no dedicated test — executor should not add one to meet the 7-test count. -->

---

## Testing Considerations

### Automatic Validation

- [x] **RED confirmed:** Run `npm run test` from `project/srcs/frontend/` after creating `useChatSocket.test.ts` but before creating `useChatSocket.ts` — new suite must fail with `"Failed to resolve import './useChatSocket'"` while all **174** pre-existing tests still pass
- [x] **GREEN:** Run `npm run test` after creating `useChatSocket.ts` — **181 tests / 32 files, 0 failures, 0 regressions** (174 pre-existing + 7 new)
- [x] **Typecheck:** Run `npm run typecheck` from `project/srcs/frontend/` — **0 errors**
- [x] **ESLint:** Run `npx eslint src/features/chat/` from `project/srcs/frontend/` — 0 errors (the `// eslint-disable-next-line react-hooks/exhaustive-deps` comment is NOT needed — `[]` is the correct and intentional dependency array for the cleanup `useEffect`; adding the disable comment would be misleading)

### Manual Validation

No manual browser validation is required for this task. `useChatSocket` is a data hook with no UI. The automated test suite fully validates all observable behaviors. End-to-end WebSocket streaming behavior (connected to the real backend) is validated in Task 7 when the full `ChatPage` is wired up.

---

## Related Code Explanations

- `project/srcs/frontend/src/features/chat/hooks/useChatSetup.ts` — sibling hook; reference for `useState`/`useRef`/`useEffect` structure and the `useEffect` keyed on `[]` cleanup pattern
- `project/srcs/frontend/src/features/chat/hooks/useChatSetup.test.ts` — **primary TDD prior art**: `vi.mock` factory (all exports), `vi.mocked()`, `vi.clearAllMocks()` in `beforeEach`, deferred-promise test patterns
- `project/srcs/frontend/src/features/chat/hooks/useConversation.ts` — sibling hook; the no-op-inside-function (not before hooks) pattern is mirrored here in `sendMessage`
- `project/srcs/frontend/src/services/authSession.ts:27` — `getToken()` — JWT source for WS URL query param
- `documentation/Docs/API-Reference/WebSocket-Chat.md` — authoritative WS protocol reference: frame shapes, connection lifecycle, JWT auth via `?token=`, direct port 8080 connection

---

## Completion Criteria

- [x] Parent document [[Employee-Chat-Interface]] reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected (`solid-deep-design`, `tdd`, `documentation-management`, `memory-bank`)
- [x] `project/srcs/frontend/src/features/chat/hooks/useChatSocket.test.ts` created with 7 behavior tests and `FakeWebSocket` class
- [x] RED confirmed: `npm run test` fails with import error on `useChatSocket`; 174 pre-existing tests unaffected
- [x] `project/srcs/frontend/src/features/chat/hooks/useChatSocket.ts` created with `UseChatSocketResult` interface and `useChatSocket()` function
- [x] GREEN confirmed: `npm run test` → **181 tests / 32 files, 0 failures, 0 regressions**
- [x] `npm run typecheck` → **0 errors**
- [x] `npx eslint src/features/chat/` → 0 errors
- [x] Parent feature Steps 5.1 and 5.2 checkboxes updated to `[x]`
- [x] Parent feature Task 5 wiki link updated to `[[Employee-Chat-Interface-task-5-use-chat-socket-hook]]`
