# Task: UI Components, Routing, and Wiring

#task #current #high-complexity #parent-employee-chat-interface

**Parent:** [[Employee-Chat-Interface]]
**Parent Type:** Feature
**Related Step(s):** Phase 7 (Steps 7.1–7.5) and Phase 8 (Steps 8.1–8.4)
**Estimated Complexity:** High

---

## Goal

Assemble the chat feature's presentation layer and wire it into the application shell: create `ChatEmptyState`, `MessageBubble`, `ChatMessages`, and `ChatInput` components; create the thin `ChatPage` that renders them based on `useChat`'s `hasConversation` flag; add the `/chat` and `/chat/:conversationId` routes (mount-preserving); add "Chat" as the first employee sidebar item with segment-aware active matching; and extend the header title map with a segment-safe `/chat` guard. This task consumes the three deep hooks (Tasks 3–6) and exposes them through UI — the final assembly step that makes [[Employee-Chat-Interface]] usable end-to-end.

---

## Parent Context

The parent feature mandates that the chat UI is a **pure frontend composition** on top of the already-built hooks: `useChatSetup`, `useConversation`, `useChatSocket`, and the `useChat` orchestrator. All business logic (model/agent pre-selection, conversation creation, WebSocket lifecycle, display-list dedup-merge) lives in those hooks; the components are deliberately **shallow composition layers with no business logic**, consistent with the project's existing display components (`AgentTable`, `AgentPagination`, `CreateAgentModal`).

Key constraints and locked decisions from the parent:

- **No unit tests for the components** (Step 7.5) — they are composition layers. End-to-end validation is manual (the parent's Testing Decisions table lists all UI components under "Modules without TDD").
- **Streaming render decision is locked (Finding 6):** the streaming bubble transitions typing indicator → **plain text** of `streamingContent` while `isStreaming` is true (NOT `<ReactMarkdown>`, to avoid partial-markdown flicker) → **final `<ReactMarkdown>`** rendering of the completed assistant text once `done` arrives (`isStreaming === false && streamingContent !== ""`). Task 7 implements this transitions path directly; do not re-litigate it.
- **`streamingContent` is retained after `done`** (Decision from Task 5). `useConversation` does NOT refetch on `done`. `ChatMessages` must keep rendering the streaming bubble from `streamingContent` after the turn completes (as the rendered-markdown form), and drop it only when the next `sendMessage` clears it inside `useChatSocket` (or a refresh replaces it with the persisted ASSISTANT message from `useConversation`'s refetch).
- **The streaming bubble is NOT in `displayMessages`** — `useChat` builds `displayMessages` from persisted `messages` plus the optimistic user bubble; `ChatMessages` renders the streaming bubble separately from the `streamingContent` / `isStreaming` fields. (See `useChat.ts:120-145`.)
- **`ChatPage` is a thin composition layer** that calls `useChat()` with **no arguments** — `useChat` reads `conversationId` from `useParams()` itself, keeping all three sub-hooks callable unconditionally and letting the **same `useChat` instance survive** the `/chat` → `/chat/:id` navigation (the same-instance first-message flow, Task 6 Decision 2).
- **Mount-preserving route invariant (Finding 2, `known-issues.md`):** both routes MUST use `element={<ChatPage />}` (NOT `Component=`) and MUST NOT be given a `key`. Adding a `key` silently drops the first message and resets streaming/scroll state on every conversation switch.
- **Sidebar "Chat" item:** added as the **first entry in the employee section** of `menuItems`, using the real field shape `{ title, url, icon, roles }` (NOT `label` — that field does not exist on the type). Import `MessageSquarePlus` from `lucide-react`. `SidebarMenuButton` does **not** support `asChild` (shadcn/ui v4 + `@base-ui`), so navigation continues to use the existing `onClick={() => navigate(item.url)}` + `useNavigate` pattern.
- **Segment-aware active matching (Finding 4 fix):** replace the exact-match `const isActive = location.pathname === item.url` with the uniform `matchPath` rule using the **pure** `matchPath` function from `react-router-dom` (NOT `useMatch` — it is a hook and would violate the Rules of Hooks inside `.map()`). The rule covers `/chat/:id` and future child routes with no per-item field.
- **Header title:** extend `getPageTitle()` with a **segment-safe** guard for `/chat` and any `/chat/:id` placed **before** the `ROUTE_TITLES` exact-match lookup, and add `"/chat": "Chat"`. Do NOT use raw `startsWith("/chat")` (false-matches `/chatterbox`/`/channels`) nor `matchPath` (over-engineered for a single title mapping).
- **No-models warning (User Story 17):** `ChatEmptyState` must display a user-facing explanation ("No models available — ask your administrator to enable at least one model") and `ChatInput` must disable the send button when `selectedModelId` is `null`.
- **Agent selector (User Stories 6–8):** "No agent" as first option, default `null`, disabled with a placeholder if `agents` is empty. Model selection can still proceed if the agent fetch failed (graceful degradation from `useChatSetup`).

---

## Preconditions / Dependencies

- **Task 1** — backend `GET /llm-model/enabled` is live and verified GREEN (powers `useChatSetup`'s `getEnabledModels()`).
- **Task 2** — `features/chat/types.ts`, `features/chat/services/chatService.ts`, and `features/chat/index.ts` exist; `react-markdown@10.1.0` is installed in `package.json`.
- **Task 3** — `useChatSetup.ts` exports `UseChatSetupResult` with `{ selectedModelId, setSelectedModelId, selectedAgentId, setSelectedAgentId, enabledModels, agents, isLoading, error }`.
- **Task 4** — `useConversation.ts` exports `UseConversationResult` with `{ conversation, messages, isLoading, error }`.
- **Task 5** — `useChatSocket.ts` exports `UseChatSocketResult` with `{ sendMessage(content, override?), streamingContent, isStreaming, socketError }`. `streamingContent` is retained after `done`.
- **Task 6** — `useChat.ts` exports `UseChatResult` (14 fields, fixed-shape) and is re-exported from `features/chat/index.ts`. Backend test baseline after Task 6: **185 tests / 33 files** (`npm run test` from `project/srcs/frontend/` passes clean).
- All `npm` commands run from `project/srcs/frontend/` — never from the project root.
- Installed versions: `react@^19.2.4`, `react-dom@^19.2.4`, `react-router-dom@^6.30.3`, `react-markdown@^10.1.0`, `@base-ui/react@^1.4.1`, `lucide-react@^1.21.0`.
- `Base UI` Select (`@/components/ui/select`) and the `Select<number | null>` typed-generic + `items` trigger-label pattern are established in `features/app-settings/components/DefaultModelCard.tsx` — the model selector reuses that exact approach.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — **Selected** — task document creation, parent feature link update, completion-criteria structure (template `references/doc-types/task.md`).
- `solid-deep-design` — **Selected** — governs the depth analysis. The components are intentionally **shallow by design** (presentation layers; the deep modules are the hooks). `ChatPage` is a thin coordinator. The deletion test: deleting a component scatters only JSX markup into `ChatPage`, not business logic — which is the correct verdict for a pure display module. The depth metric confirms business logic must NOT leak into these components.
- `memory-bank` — **Selected** — `known-issues.md` documents the two critical invariants this task enforces in code: the `ChatPage` mount-preservation rule (no `key`, `element=` not `Component=`) and the `useChatSocket` WS-in-`useRef` requirement (informational — already implemented in Task 5). `context.md` confirms the current focus is Phase 6/7 of the feature and the test baseline is 185/33.
- `find-docs` — **Selected** — verified the `react-markdown@10` API via Context7 (`/remarkjs/react-markdown`). **Key version-matched fact:** the `className` prop was removed in `react-markdown@10.0.0` — to style the rendered markdown, **wrap** `<ReactMarkdown>` in a `<div className="…">`, do NOT pass `className` to the component. Default import is `import ReactMarkdown from "react-markdown"`. base-ui Select and react-router-dom v6 usage are verified against the project's own prior art (`DefaultModelCard.tsx`, existing routes).
- `tdd` — **Not needed for code** — the parent explicitly mandates NO unit tests for these components (Step 7.5). TDD discipline still informs the structure: each component has a single, observable responsibility so it could be tested if the project's policy changed.
- `memory-bank` / `glossary` CLI tools — glossary CLI is empty per `known-issues.md`; domain terms ("conversation", "model selector", "agent selector", "streaming bubble", "SETUP"/"CHATTING") are established in the parent feature and prior task documents.

### Documentation Reviewed

- `project/srcs/frontend/src/features/chat/hooks/useChat.ts` — confirmed the exact 14-field `UseChatResult` surface (notably `setupIsLoading`/`setupError`/`conversationIsLoading`/`conversationError` renamed fields, `displayMessages` excludes the streaming bubble, `isStreaming`/`streamingContent`/`socketError` socket fields, `sendMessage(content) => Promise<void>`, `hasConversation`). This is the contract the components consume.
- `project/srcs/frontend/src/features/chat/types.ts` — confirmed `ChatMessageDTO` (`role: "USER" | "ASSISTANT"`), `EnabledModelDTO` (`{ id, modelId, name, isEnabled }`), `ChatConversationDTO`.
- `project/srcs/frontend/src/features/agents/types.ts:6` — confirmed `AgentListDTO` shape `{ id, name, description, createdAt, updatedAt }` (used for the agent selector).
- `project/srcs/frontend/src/features/app-settings/components/DefaultModelCard.tsx` — **primary prior art** for the Base UI Select with numeric-typed values: `Select<number | null>` + `items` prop (so `SelectValue` resolves the trigger label to the model name) + `null as number | null` cast for the clear option + `SelectTrigger disabled`.
- `project/srcs/frontend/src/pages/AgentsPage.tsx` — prior art for the thin page pattern: `useAgentList()` → destructure → render `ErrorMessage`/`AgentTable`/etc. `ChatPage` follows this composition-only shape.
- `project/srcs/frontend/src/components/common/ErrorMessage.tsx` — reusable error block (used by `AgentTable`/`ChatEmptyState` for the setup-error path).
- `project/srcs/frontend/src/router.tsx` — confirmed the employee-only `RoleGuard` group (lines 35–44) where the two `/chat` routes are inserted, and the `element={<MainLayout />}` pattern.
- `project/srcs/frontend/src/layouts/Sidebar.tsx` — confirmed `menuItems` array uses `{ title, url, icon, roles }`; the active check is exactly `const isActive = location.pathname === item.url` at line 96; `SidebarMenuButton` uses `onClick={() => navigate(item.url)}` (no `asChild`).
- `project/srcs/frontend/src/layouts/Header.tsx` — confirmed `ROUTE_TITLES` record and `const getPageTitle = () => ROUTE_TITLES[location.pathname] ?? "Control Panel"`.
- `/remarkjs/react-markdown` (Context7) — verified v10 `className`-removal breaking change (wrap in a `<div>` for styling) and the `import Markdown from "react-markdown"` default import.

---

## Implementation Details

### Approach

**SOLID / Depth analysis of the new modules:**

| Module | SRP (one responsibility, no "and") | Depth verdict | Action |
|--------|------------------------------------|---------------|--------|
| `ChatPage` | Render the chat surface for the current URL phase | Shallow by design — pure coordinator over `useChat()`. Deleting it scatters one `useChat()` call + a ternary into the router. The page earns its place by being the mount-survival anchor (Finding 2) — it cannot be inlined into the router without losing the invariant. | KEEP (thin) |
| `ChatEmptyState` | Render the SETUP-phase controls (model + agent selectors + welcome) | Shallow presentation; all state comes in as props from `useChat`. No business logic. | KEEP (thin) |
| `MessageBubble` | Render one message (USER plain text / ASSISTANT markdown / error red) | Leaf component. Switch on `role`/`isError`. | KEEP (leaf) |
| `ChatMessages` | Render the display list + the streaming bubble, auto-scroll | Composition layer. Owns only the auto-scroll `useEffect` (a presentation concern, not business logic). | KEEP (thin) |
| `ChatInput` | Captured textarea + Enter-to-send | Leaf; owns only its local textarea string state. | KEEP (leaf) |

**Seam discipline:** No new ports/adapters — these are pure presentation modules consuming the `UseChatResult` interface (a real, two-consumer seam: production `ChatPage` + the mocked `useChat.test.ts`). The deep modules behind the seam are the hooks; the components are their *callers*, correctly depending on the abstraction.

**Why each component owns minimal local state (not props):**
- `ChatInput` holds the textarea string in `useState` (cleared on successful send). This is input affordance, not business logic — putting it in `useChat` would leak a presentation concern into the orchestrator.
- `ChatMessages` holds a bottom `ref` and runs a `useEffect` to scroll. This is view behavior, lives with the view.
Everything else (selected model/agent, messages, streaming, errors) is owned by `useChat` and flows down as props — single source of truth.

**Streaming bubble state machine (locked, Finding 6):** `ChatMessages` derives the streaming bubble's content/state from three pieces of `useChat` state:

```
isStreaming === true && streamingContent === ""  → typing indicator (animated dots)
isStreaming === true && streamingContent !== ""  → plain text of streamingContent  (NOT <ReactMarkdown>)
isStreaming === false && streamingContent !== ""  → <ReactMarkdown>{streamingContent}</ReactMarkdown>  (turn done, retained)
isStreaming === false && streamingContent === ""  → render nothing (idle)
```

`ChatMessages` appends exactly one streaming bubble at the end when any of the first three states holds.

**`react-markdown` v10 constraint:** style the rendered markdown by **wrapping** `<ReactMarkdown>` in a styled `<div>` (Tailwind descendant selectors — `@tailwindcss/typography` is **not** installed in this project), never via a `className` prop on `<ReactMarkdown>` (removed in v10).

**ChatPage mount survival:** verified against the installed `react-router-dom@6.30.4` (declared as `^6.30.3` in `package.json`, resolved to `6.30.4`; `known-issues.md` documents the same finding against this exact version). Two sibling `<Route>` elements both with `element={<ChatPage />}` and **no `key`** preserve the `ChatPage` fiber; only `useParams()` changes. The router's `Component=` path is explicitly "de-optimized" (mounts fresh each render) — do not use it.

### Files to Create/Modify

- [ ] `project/srcs/frontend/src/features/chat/components/ChatEmptyState.tsx` — **new** — SETUP-phase model + agent selectors, welcome copy, no-models warning, embeds `ChatInput`
- [ ] `project/srcs/frontend/src/features/chat/components/MessageBubble.tsx` — **new** — leaf: USER plain text (right) / ASSISTANT `<ReactMarkdown>` (left) / error red bubble
- [ ] `project/srcs/frontend/src/features/chat/components/ChatMessages.tsx` — **new** — maps `displayMessages` + appends streaming bubble; auto-scroll `useEffect`
- [ ] `project/srcs/frontend/src/features/chat/components/ChatInput.tsx` — **new** — controlled textarea, Enter-to-send / Shift+Enter newline, send button; `disabled` when `isStreaming || !selectedModelId`
- [ ] `project/srcs/frontend/src/pages/ChatPage.tsx` — **new** — thin wrapper; `useChat()` with no args; renders `ChatEmptyState` or `ChatMessages + ChatInput` by `hasConversation`
- [ ] `project/srcs/frontend/src/router.tsx` — **modify** — import `ChatPage`; add `/chat` and `/chat/:conversationId` routes inside the employee-only `RoleGuard` group (mount-preserving: `element=`, no `key`)
- [ ] `project/srcs/frontend/src/layouts/Sidebar.tsx` — **modify** — add "Chat" as first employee `menuItems` entry (`MessageSquarePlus`); replace exact-match active check with uniform segment-aware `matchPath` rule
- [ ] `project/srcs/frontend/src/layouts/Header.tsx` — **modify** — add segment-safe `/chat` guard before `ROUTE_TITLES` lookup; add `"/chat": "Chat"`

---

## Step-by-Step Implementation

### Step 1: `MessageBubble.tsx` (leaf)

**Goal:** A single component that renders one message bubble — USER (plain text, right-aligned), ASSISTANT (`<ReactMarkdown>`, left-aligned), or an inline error (red).
**Dependencies:** `react-markdown@10` installed (Task 2); `ChatMessageDTO` type exists.

- [ ] Create `project/srcs/frontend/src/features/chat/components/MessageBubble.tsx`
- [ ] Run `npx eslint src/features/chat/components/MessageBubble.tsx` from `project/srcs/frontend/` — 0 errors

**Why this step is critical:** `MessageBubble` is the rendering seam where the locked Finding 6 decision (markdown only for ASSISTANT completed text) and the USER-plain-text rule actually land. Getting `role` branching right here prevents accidental markdown rendering of user input (which can contain `*`/`` ` `` literally).

#### Implementation

```tsx
// project/srcs/frontend/src/features/chat/components/MessageBubble.tsx

import ReactMarkdown from "react-markdown"
import type { ChatMessageDTO } from "../types"

interface MessageBubbleProps {
  message: ChatMessageDTO
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "USER"

  // USER messages render as plain text (right-aligned).
  // ASSISTANT messages render as markdown (left-aligned).
  // react-markdown v10 removed the `className` prop — wrap in a div to style.
  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={
          isUser
            ? "max-w-[80%] rounded-lg bg-primary px-3 py-2 text-primary-foreground text-sm whitespace-pre-wrap"
            : "max-w-[80%] rounded-lg bg-muted px-3 py-2 text-foreground text-sm"
        }
      >
        {isUser ? (
          // whitespace-pre-wrap preserves the user's explicit newlines
          <span>{message.content}</span>
        ) : (
          // @tailwindcss/typography is NOT installed in this project, so `prose`
          // classes would be inert. Style the rendered markdown with explicit
          // Tailwind descendant selectors instead (no extra dependency). Keep
          // this class string in sync with the identical wrapper in ChatMessages.
          <div className="max-w-none space-y-1 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-muted-foreground/10 [&_pre]:p-2 [&_code]:rounded [&_code]:bg-muted-foreground/10 [&_code]:px-1 [&_code]:font-mono [&_code]:text-xs [&_h1]:font-semibold [&_h1]:text-base [&_h2]:font-semibold [&_h2]:text-sm">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}

// Error bubble variant — rendered inline in the thread for failed turns.
// Not a ChatMessageDTO (errors are ephemeral_socketError), so it is a
// separate exported component.
interface ErrorBubbleProps {
  message: string
}

export function ErrorBubble({ message }: ErrorBubbleProps) {
  return (
    <div className="flex w-full justify-start">
      <div className="max-w-[80%] rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {message}
      </div>
    </div>
  )
}
```

#### Edge Cases

1. **Empty `content`** — An ASSISTANT message with empty content renders an empty `<div>` (harmless). USER empty content cannot reach here (`ChatInput` prevents sending empty strings).
2. **`whitespace-pre-wrap` on user text** — Preserves line breaks the employee typed with Shift+Enter. Markdown is intentionally NOT applied to user text (it would interpret literal `*`/`#`).
3. **`message.id === -1` (optimistic bubble)** — Rendered identically to a real USER message; `useChat`'s content-based dedup ensures it is replaced once the persisted USER message arrives. No special-casing needed here.
4. **Markdown styling without a typography plugin** — `@tailwindcss/typography` is **NOT** installed in this project (`package.json` has no such dependency, verified during review), so `prose`/`prose-sm` classes would be inert and markdown would render with raw browser defaults. The component styles the wrapper with explicit Tailwind descendant selectors (`[&_p]`, `[&_ul]`, `[&_pre]`, `[&_code]`, …) — no new dependency. Keep this class string in sync with the identical wrapper in `ChatMessages`.

---

### Step 2: `ChatInput.tsx` (leaf)

**Goal:** A controlled textarea with Enter-to-send (Shift+Enter for newline) and a send button, disabled while streaming or when no model is selected.
**Dependencies:** None (leaf).

- [ ] Create `project/srcs/frontend/src/features/chat/components/ChatInput.tsx`
- [ ] Run `npx eslint src/features/chat/components/ChatInput.tsx` from `project/srcs/frontend/` — 0 errors

**Why this step is critical:** This is the only entry point for sending messages. The `disabled` flag wired to `isStreaming || !selectedModelId` enforces User Stories 14 (no overlapping messages) and 17 (no sending when no models).

#### Implementation

```tsx
// project/srcs/frontend/src/features/chat/components/ChatInput.tsx

import { useState, type KeyboardEvent } from "react"
import { SendHorizonal } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ChatInputProps {
  onSend: (content: string) => void
  disabled: boolean
  placeholder?: string
}

export function ChatInput({
  onSend,
  disabled,
  placeholder = "Type a message…",
}: ChatInputProps) {
  const [value, setValue] = useState("")

  const canSend = !disabled && value.trim().length > 0

  function handleSend() {
    const content = value.trim()
    if (!content || disabled) return
    onSend(content)
    setValue("")
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends; Shift+Enter inserts a newline (default textarea behaviour).
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex items-end gap-2 border-t border-sidebar-border bg-background p-3">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        rows={1}
        className="flex-1 resize-none rounded-md border border-input bg-input/20 px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <Button onClick={handleSend} disabled={!canSend} size="sm">
        <SendHorizonal className="size-4" />
        Send
      </Button>
    </div>
  )
}
```

#### Edge Cases

1. **`disabled` true while streaming** — The textarea and button are both disabled via the `disabled` prop; `handleSend` also guards on `disabled` defensively in case the button click fires between renders.
2. **`disabled` from `!selectedModelId`** — Passed by `ChatPage`/`ChatEmptyState` as `disabled={isStreaming || selectedModelId == null}`. The placeholder can be overridden by the caller (used by `ChatEmptyState` to show "No models available" as the placeholder when `selectedModelId == null`).
3. **Whitespace-only input** — `value.trim().length > 0` gates `canSend`; `handleSend` re-trims and returns early on empty — prevents sending empty turns.
4. **Send clears local state** — `setValue("")` runs after `onSend(content)`. The local `value` is the only source of truth for the textarea text; `onSend` is fire-and-forget from this component's perspective (it does not await `useChat`'s async `sendMessage`).
5. **Auto-grow textarea** — `rows={1}` with no auto-resize keeps the implementation simple; the textarea scrolls internally for long input. An auto-grow enhancement is out of scope for MVP.

---

### Step 3: `ChatMessages.tsx` (thin)

**Goal:** Render the `displayMessages` list as `MessageBubble`s, append the streaming bubble with its locked state-transition logic, surface an error bubble, and auto-scroll to the bottom on new content.
**Dependencies:** Step 1 (`MessageBubble`, `ErrorBubble`); `useChat` provides `displayMessages`, `streamingContent`, `isStreaming`, `socketError`/`conversationError`.

- [ ] Create `project/srcs/frontend/src/features/chat/components/ChatMessages.tsx`
- [ ] Run `npx eslint src/features/chat/components/ChatMessages.tsx` from `project/srcs/frontend/` — 0 errors

**Why this step is critical:** This is where the locked Finding 6 streaming-render decision is implemented. The three-state transition (typing → plain-text → `<ReactMarkdown>`) must be exactly here so partial-markdown flicker is eliminated while the final text is still rendered as rich markdown.

#### Implementation

```tsx
// project/srcs/frontend/src/features/chat/components/ChatMessages.tsx

import { useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"
import { MessageBubble, ErrorBubble } from "./MessageBubble"
import type { ChatMessageDTO } from "../types"

interface ChatMessagesProps {
  messages: ChatMessageDTO[]
  streamingContent: string
  isStreaming: boolean
  error?: string | null
}

export function ChatMessages({
  messages,
  streamingContent,
  isStreaming,
  error,
}: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null)

  // Auto-scroll to the latest content. Dependencies cover: a new persisted
  // message, a new chunk (streamingContent grows), a streaming→done flip,
  // and an error appearing.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, streamingContent, isStreaming, error])

  // Streamed bubble is showing only while streaming OR while the completed
  // assistant text is retained after `done` (useChatSocket keeps
  // streamingContent until the next send / a refresh replaces it).
  const showStreamingBubble = isStreaming || streamingContent !== ""

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {showStreamingBubble && (
        <div className="flex w-full justify-start">
          <div className="max-w-[80%] rounded-lg bg-muted px-3 py-2 text-sm">
            {isStreaming && streamingContent === "" ? (
              // Typing indicator — shown immediately on send, before any chunk.
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-current" />
              </span>
            ) : isStreaming ? (
              // Streaming chunks render as PLAIN TEXT (Finding 6) — partial
              // markdown would flicker as tokens complete.
              <span className="whitespace-pre-wrap">{streamingContent}</span>
            ) : (
              // Turn done — render the completed assistant text as markdown.
              // @tailwindcss/typography not installed → use descendant selectors
              // (same wrapper classes as MessageBubble — keep them in sync).
              <div className="max-w-none space-y-1 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-muted-foreground/10 [&_pre]:p-2 [&_code]:rounded [&_code]:bg-muted-foreground/10 [&_code]:px-1 [&_code]:font-mono [&_code]:text-xs [&_h1]:font-semibold [&_h1]:text-base [&_h2]:font-semibold [&_h2]:text-sm">
                <ReactMarkdown>{streamingContent}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      )}

      {error && <ErrorBubble message={error} />}

      <div ref={bottomRef} />
    </div>
  )
}
```

#### Edge Cases

1. **`streamingContent` retained after `done`** — Once `done` arrives, `isStreaming` flips to `false` but `streamingContent` is non-empty; the bubble re-renders as `<ReactMarkdown>`. It stays until the next `sendMessage` (which clears `streamingContent` inside `useChatSocket`) or until a refresh replaces it with the persisted ASSISTANT message from `useConversation`. This matches the Task 5 Decision 1 retention behaviour.
2. **Double-assistant on refresh** — After a refresh, `useConversation` loads the persisted ASSISTANT message into `messages`, and `streamingContent` is empty (fresh hook instance) — so only the persisted bubble renders. No dedup needed here (unlike the optimistic user bubble, which `useChat` handles).
3. **Typing indicator never shown for resumed conversations** — `showStreamingBubble` is false when `isStreaming === false && streamingContent === ""` (the idle state of a mounted-but-idle hook on a `/chat/:id` page). The persisted history renders alone.
4. **Auto-scroll on every chunk** — `streamingContent` in the dependency array re-streams the scroll effect on each chunk. `behavior: "smooth"` keeps it calm during fast streaming; acceptable cost.
5. **Error precedence** — `error` is rendered once after the streaming bubble. `ChatPage` passes `socketError ?? conversationError` (see Step 5); only one is typically set. The error bubble is left-aligned (an assistant-side failure) per the parent's "inline error bubbles in the chat thread" wording.

---

### Step 4: `ChatEmptyState.tsx` (thin)

**Goal:** Render the SETUP-phase surface: model selector (Base UI Select, pre-selected, disabled if empty), agent selector ("No agent" default, disabled if no agents), a welcome headline, the no-models warning, and the embedded `ChatInput`.
**Dependencies:** Step 2 (`ChatInput`); `useChat` provides the setup-phase fields + `sendMessage`.

- [ ] Create `project/srcs/frontend/src/features/chat/components/ChatEmptyState.tsx`
- [ ] Run `npx eslint src/features/chat/components/ChatEmptyState.tsx` from `project/srcs/frontend/` — 0 errors

**Why this step is critical:** This is the first thing an employee sees. The selector pre-selection (default model → first model → null), the disabled-when-empty rules, and the no-models warning (User Story 17) all land here. It reuses the exact `Select<number | null>` + `items` pattern from `DefaultModelCard.tsx`.

#### Implementation

```tsx
// project/srcs/frontend/src/features/chat/components/ChatEmptyState.tsx

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChatInput } from "./ChatInput"
import type { EnabledModelDTO } from "../types"
import type { AgentListDTO } from "@/features/agents"

interface ChatEmptyStateProps {
  enabledModels: EnabledModelDTO[]
  selectedModelId: number | null
  setSelectedModelId: (id: number | null) => void
  agents: AgentListDTO[]
  selectedAgentId: number | null
  setSelectedAgentId: (id: number | null) => void
  isLoading: boolean
  error: string | null
  onSend: (content: string) => void
}

export function ChatEmptyState({
  enabledModels,
  selectedModelId,
  setSelectedModelId,
  agents,
  selectedAgentId,
  setSelectedAgentId,
  isLoading,
  error,
  onSend,
}: ChatEmptyStateProps) {
  const hasModels = enabledModels.length > 0
  const hasAgents = agents.length > 0

  // Mirrors DefaultModelCard.tsx: pass `items` so SelectValue resolves the
  // trigger label to the model name (not the raw numeric id).
  const modelItems: { value: number | null; label: string }[] =
    enabledModels.map((m) => ({ value: m.id, label: m.name }))

  const agentItems: { value: number | null; label: string }[] = [
    { value: null, label: "No agent" },
    ...agents.map((a) => ({ value: a.id, label: a.name })),
  ]

  const hasNoModels = !isLoading && !hasModels

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-6">
      <div className="max-w-xl text-center">
        <h1 className="text-2xl font-bold">Start a conversation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a model, optionally pick an agent, and send your first message.
        </p>
      </div>

      {hasNoModels && (
        <p className="text-sm font-medium text-destructive">
          No models available — ask your administrator to enable at least one model.
        </p>
      )}

      {error && (
        <p className="text-sm font-medium text-destructive">{error}</p>
      )}

      <div className="flex w-full max-w-xl flex-col gap-4">
        {/* Model selector — required, disabled if no models */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium">Model</label>
          <Select<number | null>
            value={selectedModelId}
            onValueChange={setSelectedModelId}
            items={modelItems}
          >
            <SelectTrigger disabled={!hasModels || isLoading}>
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {enabledModels.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Agent selector — optional, "No agent" default, disabled if no agents */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium">Agent (optional)</label>
          <Select<number | null>
            value={selectedAgentId}
            onValueChange={setSelectedAgentId}
            items={agentItems}
          >
            <SelectTrigger disabled={!hasAgents || isLoading}>
              <SelectValue placeholder="No agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null as number | null}>No agent</SelectItem>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!hasAgents && !isLoading && (
            <p className="text-xs text-muted-foreground">
              You have no agents yet — this conversation will be a plain general chat.
            </p>
          )}
        </div>
      </div>

      <div className="w-full max-w-xl">
        <ChatInput
          onSend={onSend}
          disabled={!hasModels || isLoading}
          placeholder={hasNoModels ? "No models available" : "Type a message…"}
        />
      </div>
    </div>
  )
}
```

#### Edge Cases

1. **`selectedModelId === null` with models loaded** — Cannot happen normally (`useChatSetup` pre-selects a model when the list is non-empty), but if the admin-disabled-default case leaves `null` while `enabledModels` is non-empty, the selector shows the placeholder and the input is still enabled (model is selectable). The guard is `!hasModels`, not `selectedModelId == null`.
2. **Agent fetch failure** — `useChatSetup` degrades to an empty `agents` list without setting `error` (Task 3). `hasAgents` is false → selector disabled with placeholder "No agent", and the helper message explains the conversation will be a plain general chat. Model selection proceeds.
3. **`isLoading` true** — Both selectors disabled and the input disabled; the user waits for the parallel fetch in `useChatSetup`.
4. **`null as number | null` cast** — Required for the "No agent" clear item, matching the `DefaultModelCard` and `EmployeeFilterBar` pattern for null-valued Base UI items.
5. **`onSend` is `useChat`'s async `sendMessage`** — `ChatInput` treats it as fire-and-forget; `useChat`'s SETUP branch performs `createConversation → navigate → sendMessage(content, id)`. The component does not await it.

---

### Step 5: `ChatPage.tsx` (thin coordinator)

**Goal:** Call `useChat()` with no arguments and render `ChatEmptyState` (SETUP) or `ChatMessages + ChatInput` (CHATTING) based on the `hasConversation` boolean. No business logic.
**Dependencies:** Steps 1–4; `useChat` re-exported from `@/features/chat` (Task 6).

- [ ] Create `project/srcs/frontend/src/pages/ChatPage.tsx`
- [ ] Run `npx eslint src/pages/ChatPage.tsx` from `project/srcs/frontend/` — 0 errors

**Why this step is critical:** `ChatPage` is the mount-survival anchor (Finding 2). It must call `useChat()` with **no arguments** so the sub-hooks stay unconditional AND the same hook instance survives the `/chat` → `/chat/:id` navigation. Any argument-passing or conditional rendering of `useChat` breaks the first-message flow.

#### Implementation

```tsx
// project/srcs/frontend/src/pages/ChatPage.tsx

import { useChat } from "@/features/chat"
import { ChatEmptyState } from "@/features/chat/components/ChatEmptyState"
import { ChatMessages } from "@/features/chat/components/ChatMessages"
import { ChatInput } from "@/features/chat/components/ChatInput"

export function ChatPage() {
  // Called with NO arguments — useChat reads conversationId from useParams()
  // itself, so all three sub-hooks stay unconditional and the SAME useChat
  // instance survives the /chat → /chat/:id navigation (same-instance flow).
  const chat = useChat()

  // The streaming turn also disables the input while the LLM is generating.
  const inputDisabled = chat.isStreaming || chat.selectedModelId == null

  if (!chat.hasConversation) {
    // SETUP phase — fresh empty chat at /chat
    return (
      <div className="flex h-full flex-col">
        <ChatEmptyState
          enabledModels={chat.enabledModels}
          selectedModelId={chat.selectedModelId}
          setSelectedModelId={chat.setSelectedModelId}
          agents={chat.agents}
          selectedAgentId={chat.selectedAgentId}
          setSelectedAgentId={chat.setSelectedAgentId}
          isLoading={chat.setupIsLoading}
          error={chat.setupError}
          onSend={chat.sendMessage}
        />
      </div>
    )
  }

  // CHATTING phase — existing conversation at /chat/:id
  return (
    <div className="flex h-full flex-col">
      <ChatMessages
        messages={chat.displayMessages}
        streamingContent={chat.streamingContent}
        isStreaming={chat.isStreaming}
        error={chat.socketError ?? chat.conversationError}
      />
      <ChatInput
        onSend={chat.sendMessage}
        disabled={inputDisabled}
      />
    </div>
  )
}
```

#### Edge Cases

1. **`chat.selectedModelId == null` in CHATTING** — `useChatSetup` runs eagerly (Task 3) and produces `selectedModelId` regardless of phase. In CHATTING it is non-null as long as models exist; if the admin disabled all models mid-conversation, the input is disabled — the employee cannot send but can still read the thread. Acceptable for MVP.
2. **`socketError ?? conversationError`** — `socketError` (from the streaming turn) takes precedence over `conversationError` (history-load failure). Both render through the same `ErrorBubble`; only one is typically non-null.
3. **No `key` anywhere** — `ChatPage` deliberately renders different subtrees by phase WITHOUT a `key` on the wrapper `div`. The mount-survival invariant lives at the route level (Step 6), not here. The phase switch is just a React reconciliation of children, which preserves the `ChatPage` fiber.
4. **`onSend={chat.sendMessage}`** — The async `sendMessage` is passed by reference. `ChatInput` invokes it; React event handlers tolerate a returned promise (any rejection is surfaced by the socket/conversation error paths, not thrown at the input).

---

### Step 6: Routing — `router.tsx` (modify)

**Goal:** Add `/chat` and `/chat/:conversationId` routes inside the employee-only `RoleGuard` group, using mount-preserving `element={<ChatPage />}` with no `key`.
**Dependencies:** Step 5 (`ChatPage`).

- [ ] Edit `project/srcs/frontend/src/router.tsx`: import `ChatPage`; add two routes after `/agents`
- [ ] Add the inline mount-preservation comment at the route pair
- [ ] Run `npm run typecheck` from `project/srcs/frontend/` — 0 errors

**Why this step is critical:** This is the Finding 2 invariant. Using `Component=` or adding a `key` silently drops the first message and resets streaming/scroll on every conversation switch. The comment must document WHY so no one "cleans up" the routes later.

#### Implementation

Edit the imports (add after the `AgentsPage` import):

```tsx
import { ChatPage } from "@/pages/ChatPage"
```

Inside the employee-only `RoleGuard` group (after the `/agents` route):

```tsx
        {/* Employee-only routes */}
        <Route element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={[UserRole.EMPLOYEE]} redirectTo="/dashboard">
              <MainLayout />
            </RoleGuard>
          </ProtectedRoute>
        }>
          <Route path="/conversations" element={<ConversationsPage />} />
          <Route path="/agents" element={<AgentsPage />} />
          {/*
            MOUNT-PRESERVING ROUTE INVARIANT (Finding 2, known-issues.md):
            both routes MUST use element={<ChatPage />} (not Component=) and
            MUST NOT have a key. Verified against react-router-dom@6.30.4:
            sibling <Route> elements with `element=` and no key preserve the
            ChatPage fiber across /chat → /chat/:id — only useParams()
            changes, so the same useChat instance survives and the first
            message is sent from the SAME instance with the freshly-created
            conversationId passed as an explicit override (see useChat.ts).
            Adding key={pathname} or switching to Component= reintroduces the
            silent first-message drop and resets streaming/scroll state on
            every conversation switch.
          */}
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:conversationId" element={<ChatPage />} />
        </Route>
```

#### Edge Cases

1. **`element=` vs `Component=`** — `Component=` is the router's "de-optimized" path (mounts fresh each render); never use it here.
2. **No `key`** — A `key` would force a remount on every pathname change, defeating the same-instance flow. The comment documents the reason.
3. **Direct navigation to `/chat/:id`** — On a fresh load (refresh/new tab), `useChat` mounts fresh with `conversationId` already set → `useConversation` loads history in SETUP-less CHATTING. The same-instance flow is irrelevant on a refresh (no `/chat` → `/chat/:id` transition happens).
4. **`/conversations` order unchanged** — Adding the chat routes after `/agents` keeps the existing route order stable.

---

### Step 7: Sidebar — `Sidebar.tsx` (modify)

**Goal:** Add "Chat" as the **first** entry in the employee section of `menuItems` and replace the exact-match active check with the uniform segment-aware `matchPath` rule.
**Dependencies:** Step 6 (`/chat` route exists so the active match resolves).

- [ ] Edit imports: add `MessageSquarePlus` to the `lucide-react` import; add `import { matchPath } from "react-router-dom"`
- [ ] Insert the Chat `menuItems` entry as the FIRST item with `roles: [UserRole.EMPLOYEE]` (before "Conversations")
- [ ] Replace `const isActive = location.pathname === item.url` with the `matchPath`-based rule
- [ ] Run `npx eslint src/layouts/Sidebar.tsx` from `project/srcs/frontend/` — 0 errors

**Why this step is critical:** "Chat" must be the first employee nav entry (User Story 1). The Finding 4 fix (`/chat` lighting up on `/chat/:id`) requires segment-aware matching; the uniform `matchPath` rule covers future `/conversations/:id` and `/agents/:id` too with no per-item field.

#### Implementation

Update the `lucide-react` import to include `MessageSquarePlus`:

```tsx
import {
  Bot,
  BrainCircuit,
  LayoutDashboard,
  MessageSquare,
  MessageSquarePlus,
  Settings,
  Users,
} from "lucide-react"
```

Update the `react-router-dom` import to include `matchPath`:

```tsx
import { useLocation, useNavigate, matchPath } from "react-router-dom"
```

Insert "Chat" as the **first employee item** — i.e. immediately before the "Conversations" entry (the first `roles: [UserRole.EMPLOYEE]` item):

```tsx
    {
      title: "Chat",
      url: "/chat",
      icon: MessageSquarePlus,
      roles: [UserRole.EMPLOYEE],
    },
    {
      title: "Conversations",
      ...
```

Replace the active check inside `visibleMenuItems.map(...)`:

```tsx
            {visibleMenuItems.map((item) => {
              const Icon = item.icon
              // Segment-aware active matching (Finding 4). matchPath is a PURE
              // function — safe inside .map() (useMatch is a hook → Rules-of-
              // Hooks violation here). Bare-path matchPath defaults end:true
              // (exact — behaviour-identical to the previous === for the static
              // routes). The `${url}/*` clause matches child paths so /chat
              // lights for /chat/:id and future dynamic routes cover themselves.
              const isActive =
                matchPath(item.url, location.pathname) != null ||
                matchPath(`${item.url}/*`, location.pathname) != null
```

#### Edge Cases

1. **`matchPath` is pure, not `useMatch`** — `useMatch` is a hook and would violate the Rules of Hooks inside `.map()`. `matchPath(pattern, pathname)` is a pure function — confirmed by the react-router v6 API. This is the Finding 4 requirement.
2. **Bare-path `matchPath(item.url, …)` defaults `end: true`** — For the five previously-static routes (`/dashboard`, `/employees`, `/app-settings`, `/conversations`, `/agents`), none have child routes, so exact match is behaviour-identical to the prior `===`.
3. **`${item.url}/*` matches child paths** — `/chat` lights for `/chat/12`; `/agents` would light for a future `/agents/:id`. A naive `startsWith("/chat")` would also match `/chatterbox`/`/channels` — `matchPath` is segment-bounded, so it does not.
4. **Admin items unaffected** — The uniform rule applies to admin routes too; `/dashboard` stays exact-only (no children) — no behavioural change.
5. **"Chat" placement** — Inserted before "Conversations" makes it the first employee entry (User Story 1). Admin items precede it in the array but are filtered out for employees by `hasAnyRole(item.roles)`.

---

### Step 8: Header — `Header.tsx` (modify)

**Goal:** Extend `getPageTitle()` to return `"Chat"` for `/chat` and any `/chat/:id` via a segment-safe guard placed before the `ROUTE_TITLES` lookup; add `"/chat": "Chat"`.
**Dependencies:** Step 6.

- [ ] Edit the `ROUTE_TITLES` record to add `"/chat": "Chat"`
- [ ] Add the segment-safe guard to `getPageTitle()` **before** the record lookup
- [ ] Run `npx eslint src/layouts/Header.tsx` from `project/srcs/frontend/` — 0 errors

**Why this step is critical:** `/chat/:id` is dynamic and cannot be a single `ROUTE_TITLES` exact match. A segment-safe guard avoids the `/chatterbox`/`/channels` false positive that raw `startsWith("/chat")` would introduce. `matchPath` is deliberately NOT used here (over-engineered for a single fixed title mapping — adds an import where a 2-line guard suffices).

#### Implementation

```tsx
const ROUTE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/conversations": "Conversations",
  "/employees": "Employees",
  "/app-settings": "App Settings",
  "/agents": "Agents",
  "/chat": "Chat", // exact /chat — the guard below handles /chat/:id
}

  const getPageTitle = () => {
    // Segment-safe guard for the dynamic /chat/:id path.
    // Raw startsWith("/chat") would false-match /chatterbox, /channels, etc.
    if (location.pathname === "/chat" || location.pathname.startsWith("/chat/"))
      return "Chat"
    return ROUTE_TITLES[location.pathname] ?? "Control Panel"
  }
```

#### Edge Cases

1. **`/chat` exact** — Handled by both the guard and the `ROUTE_TITLES` entry; the guard wins because it is evaluated first. Keeping both is harmless (defence in depth) and matches the parent spec's concrete function.
2. **`/chat/12`** — `startsWith("/chat/")` matches (note the trailing slash) → "Chat". `startsWith("/chat")` (without slash) would also match `/chatterbox` — the trailing slash prevents that.
3. **`/chatterbox` / `/channels`** — Neither equals `/chat` nor starts with `/chat/` → falls through to `ROUTE_TITLES` → "Control Panel". No false positive.
4. **No `matchPath` import** — Deliberately rejected (over-engineered). The 2-line guard is the parent's mandated approach.

---

## Design Decisions

**Decision 1:** Components are intentionally shallow (no business logic, no unit tests).
- **Why:** The parent feature explicitly mandates this (Step 7.5) and it matches the project's existing display-component convention (`AgentTable`, `AgentPagination`, `CreateAgentModal` have no tests). The deep modules are the hooks (Tasks 3–6); the components are their callers. Per `solid-deep-design`, putting business logic in these components would violate SRP (they would have "render AND orchestrate" reasons to change) and would be untestable in isolation anyway.
- **Alternatives considered:** Write Vitest component tests with `@testing-library/react` for each component — rejected (premature; the project has no component-test prior art; the observable behaviours are already covered by the hook tests + manual validation). Write integration tests for the full `ChatPage` — rejected (deferred to manual end-to-end validation per the parent's Testing Decisions).

**Decision 2:** `react-markdown` v10 — wrap in a styled `<div>`, do NOT pass `className`; style with Tailwind descendant selectors (no `@tailwindcss/typography`).
- **Why:** Verified against `/remarkjs/react-markdown` (Context7): the `className` prop was removed in v10.0.0 — passing it is a no-op; any styling must live on a wrapper element. Verified against `package.json`: **`@tailwindcss/typography` is NOT installed**, so `prose`/`prose-sm` classes would be inert (markdown would render with raw browser defaults). The component therefore styles the wrapper with explicit Tailwind arbitrary descendant selectors (`[&_p]:my-1 [&_ul]:list-disc [&_pre]:overflow-x-auto [&_code]:…`). This adds no new dependency — consistent with the parent's scope (only `react-markdown` is a new dep; code-syntax-highlighting is explicitly out of scope). `import ReactMarkdown from "react-markdown"` is the default-import API.
- **Alternatives considered:** Add `@tailwindcss/typography` as a new dependency and use `prose` classes — rejected (introduces a dependency not in the parent's scope for one feature; the descendant-selector approach is sufficient). Use the `components` prop to customise element rendering — rejected (over-engineered for MVP). Leave markdown unstyled (browser defaults) — rejected (poor readability: paragraphs/lists/code would have no spacing or list markers).

**Decision 3:** Streaming bubble uses a three-state local transition (typing → plain text → `<ReactMarkdown>`).
- **Why:** This is the locked Finding 6 decision. Plain text during streaming eliminates partial-markdown flicker; `<ReactMarkdown>` only after `done` renders the completed text richly. The transition is owned by `ChatMessages` (the presentation layer) because it is a pure rendering concern over `useChat`'s `streamingContent`/`isStreaming` fields — no business logic is involved.
- **Alternatives considered:** Stream into a single `<ReactMarkdown>` that re-parses every chunk — rejected (flicker on unclosed `**`/fences, explicitly decided against). Stream as plain text and never switch to markdown — rejected (loses markdown rendering on the final text). Render the optimistic placeholder markdown — rejected.

**Decision 4:** `ChatInput` holds its own textarea string in `useState` (not lifted to `useChat`).
- **Why:** The textarea text is input affordance (cleared on send), not business state. Lifting it into `useChat` would leak a presentation concern into the orchestrator and would require `useChat` to expose `inputText`/`setInputText` — bloat on a 14-field interface for one component's local need.
- **Alternatives considered:** Controlled-from-parent textarea (value/onChange props from `ChatPage`) — rejected (forces `ChatPage` to hold the text state, polluting the thin coordinator). Uncontrolled textarea with a `ref` — rejected (harder to clear and validate cleanly; `useState` is idiomatic React).

**Decision 5:** "Chat" is inserted before "Conversations" (the first existing employee item), not appended after "Agents".
- **Why:** User Story 1 requires "Chat" at the **top** of the employee sidebar. The array is role-filtered, so inserting before the first `EMPLOYEE`-roles item guarantees it is first for employees regardless of admin-item ordering.
- **Alternatives considered:** Append after "Agents" then re-sort — rejected (more churn, fragile).

**Decision 6:** Sidebar active matching uses `matchPath` (pure) uniformly for every item, not a per-item `activePrefix` field.
- **Why:** The uniform rule covers `/chat/:id` (Finding 4 fix) and any future dynamic route (`/conversations/:id`, `/agents/:id`) with no per-item configuration — no premature abstraction seam for a single consumer. `matchPath` is a pure function, so it is Rules-of-Hooks-safe inside `.map()` (where `useMatch` would not be).
- **Alternatives considered:** A per-item `activePrefix?: string`/`matchPrefix?: boolean` field — rejected (duplicates `url`, adds a configured seam for one consumer, and the uniform rule already covers the cases). Naive `startsWith("/chat")` — rejected (false-matches `/chatterbox`/`/channels`).

**Decision 7:** Header uses a 2-line segment-safe guard, NOT `matchPath`.
- **Why:** The parent spec mandates this — `matchPath` is over-engineered for a single fixed title mapping (adds an import where the guard suffices). The guard `location.pathname === "/chat" || location.pathname.startsWith("/chat/")` is segment-safe (the trailing slash prevents `/chatterbox` matching).
- **Alternatives considered:** `matchPath("/chat/*", pathname)` — rejected (adds an import and call for one static title). Raw `startsWith("/chat")` — rejected (`/chatterbox` false positive).

---

## Testing Considerations

### Automatic Validation

> No component unit tests are written (Step 7.5). Automatic validation is the project-wide build/lint/typecheck suite, which must remain GREEN with the new files added.

- [ ] Run `npm run typecheck` from `project/srcs/frontend/` after each file is created — **0 errors** (verify `ChatPage` wiring, `matchPath` import, Select generics, `react-markdown` default import all resolve)
- [ ] Run `npm run lint` from `project/srcs/frontend/` — **0 errors** (no unused imports — `MessageSquarePlus`, `matchPath`, `ChatPage` import; no `react-hooks/exhaustive-deps` issues — the `ChatMessages` auto-scroll `useEffect` lists all dependencies it reads)
- [ ] Run `npm run test` from `project/srcs/frontend/` — **185 tests / 33 files, 0 failures, 0 regressions** (the new files add NO tests; the existing hook test suite must still pass — confirms the components do not break the `useChat` import path or the barrel)
- [ ] Run `npm run build` from `project/srcs/frontend/` — completes (verifies the new routes, `lucide-react` icon, and `react-markdown` bundle correctly)

### Manual Validation

> These steps exercise the full end-to-end chat flow against the running backend + frontend. Perform them after the automatic validation passes. Requires Docker Compose up (backend on `:8080`) and `npm run dev` (frontend on `:3000`), logged in as an employee.

- [ ] Navigate to `/chat` — confirm a clean empty chat page renders with the model selector (pre-selected to the admin default or the first enabled model), the agent selector ("No agent" pre-selected), a welcome headline, and the input bar.
- [ ] Confirm the "Chat" sidebar item is the **first** item and is highlighted/active on `/chat`.
- [ ] Click "Chat" from an existing conversation (`/chat/:id`) — confirm it navigates to `/chat` and shows a fresh empty state.
- [ ] Type a message and press Enter — confirm the conversation is created, the URL updates to `/chat/{conversationId}`, an assistant bubble with a typing indicator appears, chunks fill it in as **plain text** (no flicker), and the input is disabled during generation.
- [ ] Confirm that once the turn completes (`done`), the assistant bubble re-renders the text as **markdown** (bold, code blocks, lists render correctly).
- [ ] Send a follow-up message in the same conversation — confirm it sends directly (no new conversation created, URL unchanged) and the assistant responds.
- [ ] Refresh the page on `/chat/{conversationId}` — confirm the full conversation history is restored (user + assistant bubbles) with assistant messages rendered as markdown.
- [ ] Confirm the input re-enables after an error (if a model error occurs, e.g. disabled default): an inline red error bubble appears and the input becomes usable again.
- [ ] Confirm the header title shows "Chat" on both `/chat` and `/chat/12`.
- [ ] As an admin, disable all models, then log in as an employee and navigate to `/chat` — confirm the "No models available" warning shows and the send button is disabled.
- [ ] Confirm the agent selector is disabled with a helpful message when the employee has no agents, and that model selection still works.
- [ ] **Markdown styling check:** confirm the assistant markdown renders with readable styling (paragraphs spaced, lists with bullet/number markers, code blocks with a rounded background and horizontal scroll). The components use Tailwind descendant selectors (no `@tailwindcss/typography` plugin); if any markdown element looks wrong, adjust the `[&_*]` selector string in `MessageBubble.tsx` and `ChatMessages.tsx` (keep both wrappers in sync).

**Rule:** Run automatic checks first. The manual checks above are the ONLY way to validate the UI streaming behaviour, routing, and sidebar/header wiring — they require a running browser session and are not automatable within the project's current test setup.

---

## Related Code Explanations

- `project/srcs/frontend/src/features/chat/hooks/useChat.ts` — the `UseChatResult` contract consumed by `ChatPage`; `displayMessages` excludes the streaming bubble (Task 6)
- `project/srcs/frontend/src/features/chat/components/MessageBubble.tsx` — the USER-plain-text / ASSISTANT-markdown / error rendering seam (this task)
- `project/srcs/frontend/src/features/chat/components/ChatMessages.tsx` — the streaming three-state transition (Finding 6) and auto-scroll (this task)
- `project/srcs/frontend/src/features/app-settings/components/DefaultModelCard.tsx` — prior art for the `Select<number | null>` + `items` model-selector pattern reused by `ChatEmptyState`
- `project/srcs/frontend/src/pages/AgentsPage.tsx` — prior art for the thin page pattern followed by `ChatPage`
- `project/srcs/frontend/src/router.tsx` — employee-only `RoleGuard` group where the `/chat` routes are inserted (mount-preserving comment)
- `project/srcs/frontend/src/layouts/Sidebar.tsx` — `menuItems` shape and the `matchPath` active-matching fix
- `project/srcs/frontend/src/layouts/Header.tsx` — `ROUTE_TITLES` + the segment-safe `/chat` guard
- `documentation/Memory/known-issues.md` — the ChatPage mount-preservation invariant (Finding 2) and the base-ui `asChild`-unsupported constraint

---

## Completion Criteria

- [x] Parent document [[Employee-Chat-Interface]] reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected (`documentation-management`, `solid-deep-design`, `memory-bank`, `find-docs`)
- [x] Up-to-date, version-matched documentation reviewed (`react-markdown@10` via Context7; base-ui Select + react-router v6 via project prior art)
- [x] `features/chat/components/MessageBubble.tsx`, `ChatInput.tsx`, `ChatMessages.tsx`, `ChatEmptyState.tsx`, and `pages/ChatPage.tsx` created
- [x] `router.tsx` updated with the two mount-preserving `/chat` routes (with the invariant comment)
- [x] `Sidebar.tsx` updated with "Chat" as the first employee item and the segment-aware `matchPath` rule
- [x] `Header.tsx` updated with the segment-safe `/chat` guard and `"/chat": "Chat"`
- [x] All implementation steps (7.1–7.5, 8.1–8.4) checked off
- [x] `npm run typecheck` → 0 errors
- [ ] `npm run lint` → 0 errors — see Post-Review Notes (pre-existing errors in untouched files)
- [x] `npm run test` → 185 tests / 33 files, 0 failures, 0 regressions
- [ ] `npm run build` → completes — see Post-Review Notes (pre-existing TS error in `useChat.test.ts`)
- [x] Manual validation steps documented for the user (Manual Validation section above)
- [x] Parent feature Steps 7.1–7.5 and 8.1–8.4 checkboxes updated to `[x]`
- [x] Parent feature Task 7 wiki link updated to `[[Employee-Chat-Interface-task-7-ui-components-and-wiring]]`

---

## Post-Review Notes

### Pre-existing validation failures unrelated to this task

Two validation commands report failures, but every failure is in a file this task did NOT touch (Task 6 commits introduced them; Task 7 is a presentation-layer change and does not interact with their code paths).

**1. `npm run lint` — 9 pre-existing `react-hooks/set-state-in-effect` errors** in files outside the chat feature's UI changes:
- `src/hooks/use-mobile.ts:14`
- `src/features/agents/hooks/useEditAgent.ts:59`
- `src/features/app-settings/hooks/useAppSettings.ts:224`
- `src/features/app-settings/hooks/useSystemModels.ts:53`
- `src/features/employees/hooks/useEmployeeList.ts:97`

These are the same baseline that Task 6 verified "ESLint clean" against — the rule must have been promoted to `error` between Task 6 and Task 7, or `eslint-plugin-react-hooks` was upgraded. The pre-existing set-in-effect pattern in those files predates the new rule.

`npx eslint src/features/chat/ src/pages/ChatPage.tsx src/router.tsx src/layouts/Sidebar.tsx src/layouts/Header.tsx` (every file this task added or modified) → **0 errors**. The task's files do not introduce any lint regressions.

**2. `npm run build` — pre-existing TS2322 in `src/features/chat/hooks/useChat.test.ts:124` and `:199`**:

```
Type 'Mock<Procedure | Constructable>' is not assignable to type
'(content: string, conversationIdOverride?: number | undefined) => void'.
```

Confirmed pre-existing by stashing this task's changes and re-running the build on the clean working tree (lines 124 and 199 are in `useChat.test.ts`, a Task 6 test file unchanged by Task 7). Vitest 4 `Mock` typing for `vi.fn()` callbacks does not satisfy a strict `(content, override?) => void` signature without an explicit generic argument. This is a Task 6 test-file issue and is out of scope for the present task (Task 7 is a presentation-layer change; the affected test file is unchanged).

**Task 7 adds zero lint or build regressions**; both command failures are pre-existing in files this task did not create or modify.