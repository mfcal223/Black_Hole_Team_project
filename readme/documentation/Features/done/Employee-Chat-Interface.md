#high #new-feature

## Feature: Employee Chat Interface

### Description

Add a ChatGPT-like chat interface for employees — the primary way employees interact with LLMs in AgentForge. The interface lives at `/chat` (new conversation) and `/chat/:conversationId` (active conversation), accessible only to employees. A new "Chat" sidebar item is added as the first entry in the employee navigation. A conversation is not created by navigating to the page — it is created the moment the employee sends their first message. The backend WebSocket chat system is already fully implemented; this feature is purely a frontend build, plus one small backend addition (an employee-accessible endpoint to fetch enabled models).

Design decisions confirmed during feature creation:
- A model selector (required) and agent selector (optional) appear in the empty state only, before the first message. They disappear once a conversation starts.
- The model selector pre-selects the system default model from `AppSettings`; if no default is configured, the first enabled model in the list is selected.
- The agent selector defaults to "No agent" (general conversation). It is shown disabled with a placeholder if the employee has no agents.
- The conversation title is generated client-side as `"New Conversation DD/MM/YYYY HH:mm"` and sent in `POST /conversation`.
- The URL updates to `/chat/{conversationId}` after conversation creation. Navigating directly to `/chat/{conversationId}` restores the conversation history. Refreshing does not lose history.
- Clicking the "Chat" sidebar item always navigates to `/chat`, which resets to a fresh empty chat.
- The WebSocket is opened only when the user sends a message — not eagerly on page load.
- Streaming: an assistant bubble with a typing indicator appears immediately on send; chunks fill it in word-by-word as **plain text** while streaming, then render as markdown (`react-markdown`) only after the turn completes (`done`) — to avoid partial-markdown flicker (Finding 6). The input and send button are disabled for the duration of the turn.
- Errors arrive as inline error bubbles in the chat thread; the input re-enables for retry.
- Assistant messages render markdown (`react-markdown`). User messages render as plain text.
- All `/llm-model/**` endpoints are admin-only, so a new `GET /llm-model/enabled` endpoint (employee-accessible) must be added to the backend to power the model selector.
- The existing `/conversations` page is left untouched — it is another developer's responsibility.

---

## Problem Statement

Employees have no way to interact with an LLM inside AgentForge. The backend WebSocket chat system is fully implemented and tested, and the conversation/message persistence layer exists, but there is no frontend chat interface. Employees who log in see only an agent management page and a conversations stub — they cannot start a chat, send a message, or receive a response.

---

## User Stories

1. As an Employee, I want a "Chat" item at the top of my sidebar so I can access the chat interface from anywhere in the app.
2. As an Employee, I want to see a clean empty chat page when I navigate to Chat, so I can start a new conversation without clutter from previous ones.
3. As an Employee, I want to select which LLM model to use before sending my first message, so I can choose the right model for my task.
4. As an Employee, I want the system to pre-select the admin-configured default model so I don't have to pick a model every time.
5. As an Employee, I want to see all admin-enabled models in the model selector, not the full OpenRouter catalog, so I only use models my organisation has approved.
6. As an Employee, I want to optionally select an agent before starting a conversation, so the LLM behaves according to a saved persona without me repeating instructions.
7. As an Employee, I want the agent selector to default to "No agent" so I can have a plain general conversation without accidentally activating a persona.
8. As an Employee, I want the agent selector to appear disabled if I have no agents yet, so I understand the feature exists but know I need to create agents first.
9. As an Employee, I want to send my first message and have the conversation be created automatically at that moment, so navigating to Chat is not enough to create database records.
10. As an Employee, I want the URL to update to `/chat/{conversationId}` after my first message is sent, so I can bookmark or revisit this specific conversation.
11. As an Employee, I want to refresh the page on `/chat/{conversationId}` and see my full conversation history restored, so I never lose a conversation by accident.
12. As an Employee, I want to see an assistant bubble appear immediately when I hit send, with a typing indicator, so the interface feels responsive instead of frozen.
13. As an Employee, I want the LLM response to appear word-by-word as it streams in, so I can start reading before generation completes.
14. As an Employee, I want the message input to be disabled while the LLM is generating, so I can't accidentally send multiple overlapping messages.
15. As an Employee, I want to see an inline error message in the chat thread if the LLM call fails, so I know exactly which message failed and can retry.
16. As an Employee, I want the input to re-enable after an error so I can retry sending.
17. As an Employee, I want to see a clear warning if no models are available (admin hasn't configured any), so I understand why I can't start a conversation.
18. As an Employee, I want assistant responses to render markdown properly (bold, code blocks, bullet lists), so LLM output is readable without raw asterisks and backticks.
19. As an Employee, I want to start a new conversation by clicking the "Chat" sidebar item, so I don't need a separate "New Chat" button.
20. As an Employee, I want the model and agent selectors to disappear once a conversation starts, so the chat interface stays clean and uncluttered.
21. As an Employee, I want the conversation title to be automatically set to "New Conversation DD/MM/YYYY HH:mm", so I can tell conversations apart in my history without typing a name.
22. As a backend maintainer, I want a new `GET /llm-model/enabled` endpoint accessible to employees, so the frontend can populate the model selector without exposing admin-only list data.

---

## Solution

Build the `features/chat/` frontend module with types, a service layer, three deep hooks (`useChatSetup`, `useConversation`, `useChatSocket`), and a top-level orchestrator (`useChat`). Compose UI components for the empty state, message list, and input bar. Wire the new `/chat` and `/chat/:conversationId` routes into `router.tsx`, add "Chat" as the first employee sidebar item, and update the header title map. On the backend, add one new endpoint `GET /llm-model/enabled` to `LlmModelController`, accessible by `ROLE_EMPLOYEE`.

### Scope

Impacted workflows and systems:
- **New route `/chat` and `/chat/:conversationId`** — employee-only, replacing `ConversationsPage` as the primary employee landing.
- **New `features/chat/` module** — types, services, hooks, components.
- **Sidebar** — "Chat" added as first employee item.
- **Header** — `ROUTE_TITLES` extended for `/chat` paths.
- **Router** — two new employee-gated routes.
- **Backend `LlmModelController`** — one new `GET /llm-model/enabled` method.
- **`react-markdown` dependency** — new npm package for markdown rendering.

Out of scope for this feature:
- The `/conversations` page (stays as a stub; another developer's responsibility).
- Conversation history sidebar or panel inside the chat interface (deferred to a future feature).
- Model switching mid-conversation via `PATCH /conversation/{id}/model`.
- Conversation title editing.
- Message pagination (all history loaded in one request per the current backend contract).
- Image input or output.
- Code syntax highlighting beyond what `react-markdown` provides by default.
- Agent creation from within the chat page.

### Affected Systems / Modules

- [[Memory/architecture]] — new `features/chat/` frontend module, new backend endpoint.
- [[ADRs/ADR-006-nullable-agent-fk-for-conversation-type]] — conversations created with `agentId = null` for general conversations or `agentId = <id>` for agent conversations.
- [[ADRs/ADR-007-admin-curated-llm-model-list]] — model selector only shows admin-enabled models via new employee endpoint.
- [[ADRs/ADR-008-agent-prompts-not-persisted-as-messages]] — no frontend awareness of prompt injection; handled entirely by the backend.
- [[ADRs/ADR-010-base-ui-over-radix-ui-for-frontend]] — any new shadcn components must use the `base-mira` style.
- [[Docs/API-Reference/WebSocket-Chat]] — the WebSocket protocol this feature implements on the frontend.
- [[Docs/API-Reference/Conversation]] — `POST /conversation` and `GET /conversation/{id}`.
- [[Docs/API-Reference/Messages]] — `GET /conversation/{conversationId}/messages`.
- [[Features/done/OpenRouter-Chat-Integration]] — the backend feature this UI consumes.
- `project/srcs/frontend/src/router.tsx` — new routes added.
- `project/srcs/frontend/src/layouts/Sidebar.tsx` — "Chat" menu item added.
- `project/srcs/frontend/src/layouts/Header.tsx` — `/chat` title added.
- `project/srcs/backend/src/main/java/com/BHT/models/llm/LlmModelController.java` — new endpoint.

### Impact Analysis

- The new `GET /llm-model/enabled` endpoint adds one method to `LlmModelController`. Existing admin methods are unchanged. The new method returns only enabled (`isEnabled = true`) models using a filtered query — no new service class or entity is needed.
- Adding `/chat` and `/chat/:conversationId` to the employee-only `RoleGuard` group in `router.tsx` follows the same pattern used for `/agents`. No change to admin routing.
- `react-markdown` is a new npm dependency. It is a client-side render library only; no build or bundle configuration changes required beyond `npm install`.
- The WebSocket connects directly to `ws://localhost:8080` — not through the Vite proxy. This is a documented constraint in [[Docs/API-Reference/WebSocket-Chat]] and is correct behavior; the Vite proxy does not relay WebSocket upgrades.
- `useChatSocket` must read the JWT from `getToken()` in `services/authSession.ts` (existing seam) to append as `?token=<jwt>` to the WebSocket URL.

### Risk Assessment

- **WebSocket connection on error must reconnect for retry.** The backend closes the WebSocket connection immediately after sending an error frame — `ChatWebSocketHandler` calls `session.close()` after any exception. The frontend must open a fresh WebSocket for each retry rather than reusing a closed one. `useChatSocket` must treat the connection as single-use per send, not as a persistent connection.
- **First message race condition (two tabs).** If the user opens `/chat` in two tabs and sends simultaneously, two conversations are created. This is acceptable for MVP — no locking needed.
- **No models available.** If `GET /llm-model/enabled` returns an empty array, the chat page must show a warning and disable the input. Attempting to call `POST /conversation` with no `modelId` would return a 404.
- **Default model disabled after page load.** The admin could disable the default model between page load and the first message. The backend validation in `ChatTurnService` will catch this and return an error frame. The frontend handles it as a standard error bubble.
- **Agent list load failure.** If `POST /agent/list` fails, `useChatSetup` should degrade gracefully — show the agent selector disabled rather than crashing the whole page. Model selection can still proceed.
- **`react-markdown` streaming.** Rendering markdown while chunks are still arriving can cause flickering as partial markdown tokens (e.g., an unclosed `**`) are re-parsed on every chunk. **Decision (Finding 6):** render `streamingContent` as plain text while streaming, switch to `<ReactMarkdown>` only after `done` — flicker is eliminated entirely rather than accepted.

---

## Implementation Architecture

### Changes Required

#### 1. Backend — `LlmModelController` (modified)

**Purpose:** Expose the list of admin-enabled models to employees so the frontend model selector can populate without using the admin-only `GET /llm-model` endpoint.

**Changes:**
- Add `@GetMapping("/enabled")` method to `LlmModelController` — `@PreAuthorize("hasRole('EMPLOYEE')")`, returns `ResponseEntity<List<LlmModelMiniDTO>>`.
- Implementation: delegates to a **new** `LlmModelService.getEnabledModels()` method (no `@PreAuthorize` — internal helper, controller owns the access gate; existing service methods are all `hasRole('ADMIN')` and would 403 employees). The service method calls a **new** `LlmModelRepository.findByIsEnabledTrue()` Spring Data derived query (zero implementation code) and maps results to `LlmModelMiniDTO` via `LlmModelMapper::toSmallDTO`.
- Returns only `LlmModelEntity` records where `isEnabled = true`, as `LlmModelMiniDTO` (`{ id, modelId, name, isEnabled }`) — a 1:1 mirror of the frontend `EnabledModelDTO` (per ADR-007; no `description`/`createdAt` leak).
- No new service **class**, no new mapper method, no new entity — only one new service method and one derived repository query.

**File:** `project/srcs/backend/src/main/java/com/BHT/models/llm/LlmModelController.java`

---

#### 2. `features/chat/types.ts` (new)

**Purpose:** Canonical TypeScript types for the chat feature. Mirrors backend DTOs.

**Types:**
- `EnabledModelDTO` — `{ id: number; modelId: string; name: string; isEnabled: boolean }` (mirrors `LlmModelDTO` subset)
- `ChatConversationDTO` — `{ id: number; title: string; employeeId: number; agentId: number | null; currentModelId: number; createdAt: string; updatedAt: string }`
- `ChatMessageDTO` — `{ id: number; conversationId: number; role: "USER" | "ASSISTANT"; content: string; llmModelId: number | null; inputTokens: number | null; outputTokens: number | null; createdAt: string }`
- `ChatCreateForm` — `{ modelId: number; agentId: number | null; title: string }`
- `ChatConversationMiniDTO` — `{ id: number; title: string; createdAt: string }` (POST /conversation response)

**File:** `project/srcs/frontend/src/features/chat/types.ts`

---

#### 3. `features/chat/services/chatService.ts` (new)

**Purpose:** All REST calls needed by the chat feature. Follows the existing standalone-export, no-error-handling-in-service pattern.

**Functions:**
- `getEnabledModels(): Promise<EnabledModelDTO[]>` — `GET /llm-model/enabled`
- `createConversation(form: ChatCreateForm): Promise<ChatConversationMiniDTO>` — `POST /conversation`
- `getConversation(id: number): Promise<ChatConversationDTO>` — `GET /conversation/{id}`
- `getMessages(conversationId: number): Promise<ChatMessageDTO[]>` — `GET /conversation/{conversationId}/messages`

**File:** `project/srcs/frontend/src/features/chat/services/chatService.ts`

---

#### 4. `features/chat/hooks/useChatSetup.ts` (new) — deep module

**Purpose:** Manages all state needed before the first message is sent — model list, app settings for the default model, and agent list. Computes the initial model selection. This hook takes **no** `conversationId` argument and is called **unconditionally** by `useChat` on every render (its inputs — enabled models and the employee's agents — are phase-independent, so it fetches eagerly in both SETUP and CHATTING). Its returned state is *consumed* only during SETUP; in CHATTING `ChatPage` ignores the selector fields. It must **not** be made conditional on phase (e.g. no-op in CHATTING) — that would reintroduce the Finding 3 Rules-of-Hooks violation. The asymmetry with `useConversation`/`useChatSocket` (which no-op when `conversationId` is `undefined`) is intentional: only hooks whose work depends on `conversationId` take the no-op guard.

**Interface (small — 3 entry points):**
- `selectedModelId: number | null` — the currently selected model ID
- `setSelectedModelId: (id: number | null) => void`
- `selectedAgentId: number | null` — the currently selected agent ID (null = no agent)
- `setSelectedAgentId: (id: number | null) => void`
- `enabledModels: EnabledModelDTO[]` — list of available models for the selector
- `agents: AgentListDTO[]` — list of the employee's agents for the selector
- `isLoading: boolean` — true while either models or settings are loading
- `error: string | null` — error message if models fetch fails

**Implementation hides:**
- Parallel fetch of `GET /llm-model/enabled` and `GET /app-settings`
- Sequential fallback: pre-select `defaultModel.id` if set → else `enabledModels[0].id` → else `null`
- Agents fetched from `POST /agent/list` with the full `PageableRequest` body `{ page: 0, size: 100, sort: [], filters: [] }` (the universal `POST /{resource}/list` body from `types/api.ts`; empty `sort`/`filters` arrays are valid) — failure degrades gracefully (empty list, no crash)
- No models case: `selectedModelId` stays `null`, caller must disable the send button

**File:** `project/srcs/frontend/src/features/chat/hooks/useChatSetup.ts`

---

#### 5. `features/chat/hooks/useConversation.ts` (new) — deep module

**Purpose:** Loads and exposes the message history and conversation metadata for an existing conversation. Called **unconditionally** by `useChat`; returns a **fixed-shape** interface in both phases (consistent with `useAgentList`/`useEditAgent`).

**Interface (fixed shape — always present):**
- Signature: `useConversation(conversationId: number | undefined)`
- `messages: ChatMessageDTO[]` — full history, ordered by `createdAt` ascending; `[]` when `conversationId` is `undefined` (no-op)
- `conversation: ChatConversationDTO | null` — `null` when `conversationId` is `undefined` or the fetch fails with 404
- `isLoading: boolean` — `false` when `conversationId` is `undefined` (no-op is not "loading")
- `error: string | null` — `null` when `conversationId` is `undefined` (no-op is not an error)

**Implementation hides:**
- Parallel fetch of `GET /conversation/{id}` and `GET /conversation/{id}/messages`
- 404 handling (cross-employee access or non-existent conversation)
- **No-op (fixed zero-state):** when `conversationId` is `undefined` the hook returns `{ messages: [], conversation: null, isLoading: false, error: null }` and performs no network calls. The no-op is implemented **inside the fetch `useEffect` body** (`if (conversationId == null) { set-state-to-empty; return }`), never as a `return` before the hook's `useState`/`useEffect` — an early return before hooks is itself a Rules-of-Hooks violation (Finding 3) and would crash the first render after `conversationId` flips `undefined → id`.

**File:** `project/srcs/frontend/src/features/chat/hooks/useConversation.ts`

---

#### 6. `features/chat/hooks/useChatSocket.ts` (new) — deep module

**Purpose:** Manages the full WebSocket lifecycle for one chat turn. Opens a connection, sends the message, accumulates chunks, signals done/error, and cleans up. The WebSocket is single-use per turn (backend closes after done/error).

**Interface (fixed shape — always present):**
- Signature: `useChatSocket(conversationId: number | undefined)` (do NOT narrow to `number` at the call site — `undefined` in SETUP is what allows the unconditional call, Finding 3)
- `sendMessage(content: string, conversationIdOverride?: number): void` — opens a fresh WS, sends the message, begins streaming. The optional `conversationIdOverride` is used **only** on the first send from SETUP, where `useParams()` has not yet updated (same-instance flow — Step 6.1); in CHATTING the override is omitted and the hook's own `conversationId` is used. **No-op when both `conversationId` and `conversationIdOverride` are `undefined`** (the guard lives **inside** `sendMessage`, not as an early `return` before the hook's `useState`/`useRef`/`useEffect`).
- `streamingContent: string` — accumulated chunk text; `""` when idle or in the no-op state
- `isStreaming: boolean` — `true` from send until `done`/`error`; `false` otherwise, including the no-op state
- `socketError: string | null` — set on an `error` frame; `null` otherwise, including the no-op state

**Implementation hides:**
- Building the WS URL: `ws://localhost:8080/ws/chat/${conversationIdOverride ?? conversationId}?token={jwt}` (direct to port 8080, not through Vite proxy)
- Reading the JWT via `getToken()` from `services/authSession.ts`
- Parsing `chunk`, `done`, and `error` frames as JSON
- On `done`: setting `isStreaming = false` and **retaining** `streamingContent` (the completed assistant text) so the streaming bubble can re-render it as `<ReactMarkdown>` (Finding 6). `streamingContent` is cleared only once the persisted assistant message replaces the streaming bubble via the Step 6.1 dedup-merge (e.g. on a `useConversation` refetch / refresh) — `useConversation` is keyed on `[conversationId]` and does NOT refetch on `done`, so clearing `streamingContent` on `done` would lose the assistant response until a page refresh.
- Setting `socketError` and `isStreaming = false` on `error`
- **WS lifecycle invariant:** the active `WebSocket` is held in a `useRef` and closed **only** on hook unmount (in a `useEffect` keyed on `[]`), never in a `useEffect` keyed on `conversationId` — the first send flips `conversationId` `undefined → id`, which would otherwise tear down the in-flight socket.
- **No-op placement (Rules-of-Hooks, Finding 3):** all `useState`/`useRef`/`useEffect` are called unconditionally at the top of the hook on every render. The no-op is `if (target == null) return` **inside** `sendMessage` (where `target = conversationIdOverride ?? conversationId`). There is **no `return` before the hooks** — an early return before hooks is itself a Rules-of-Hooks violation and would crash the first render after `conversationId` flips `undefined → id`.

**File:** `project/srcs/frontend/src/features/chat/hooks/useChatSocket.ts`

---

#### 7. `features/chat/hooks/useChat.ts` (new)

**Purpose:** Top-level orchestrator. Calls `useChatSetup`, `useConversation`, and `useChatSocket` **unconditionally, at the top level, in a fixed lexical order on every render** (Rules of Hooks — Finding 3). The single hook consumed by `ChatPage`.

**Return shape — fixed (not a union):** `useChat` returns one **fixed-shape object** (consistent with `useAgentList` and `useEditAgent`), spreading all sub-hook fields plus a derived boolean `hasConversation` (= `conversationId !== undefined`, read from `useParams()`). Every field is always present; setup-only fields (`enabledModels`, `selectedModelId`, `selectedAgentId`, `agents`, …) are simply unused after the first message; conversation-only fields (`conversation`, `messages`) are `null`/`[]` in SETUP. There is no `phase` `useState` and no variable-shape "different fields by phase" — the SETUP/CHATTING concept survives only as the derived `hasConversation` boolean, which `ChatPage` uses to render `ChatEmptyState` or `ChatMessages + ChatInput`.

**Phase SETUP** (`hasConversation === false`, i.e. no `conversationId` in URL):
- `ChatPage` consumes the `useChatSetup` fields; `useConversation`/`useChatSocket` return their fixed zero-states (no-ops).
- On `sendMessage(content)` (same-instance flow — `ChatPage` does **not** remount across `/chat` → `/chat/:id` under the planned router shape; see Step 8.2 invariant):
  1. Generate title: `"New Conversation DD/MM/YYYY HH:mm"` (client-side, current time).
  2. `await createConversation({ modelId, agentId, title })` → `{ id }`.
  3. `navigate('/chat/${id}', { replace: true })` — `replace:true` so the empty `/chat` entry is overwritten (back button leaves chat cleanly, not the blank state). ChatPage stays mounted; `useParams()` updates on the next render.
  4. `useChatSocket.sendMessage(content, id)` — pass `id` **explicitly as an override** so the WS opens against the new conversation immediately. Do NOT rely on the hook's `conversationId` here: `navigate` schedules a re-render but the closure inside this event handler still sees `conversationId === undefined`, so the WebSocket would never open (this is the real cause the review flagged — a stale `useParams` closure, not a remount).

**Phase CHATTING** (`hasConversation === true`, i.e. `conversationId` present in URL):
- `ChatPage` consumes the `useConversation` and `useChatSocket` fields for the message list and streaming bubble; `useChatSetup` has run (eager, unconditional) but its selector fields are ignored.
- On `sendMessage(content)` (subsequent messages): calls `useChatSocket.sendMessage(content)` directly — uses the hook's own `conversationId` (now populated from `useParams()`), no override and no `createConversation`.
- Merges persisted `messages` from `useConversation` with the current `streamingContent` from `useChatSocket` into a unified display list, deduping the optimistic user bubble against the persisted user message by `message.id` (or suppressing the `useConversation` fetch while `isStreaming` is true for the originating turn).

**File:** `project/srcs/frontend/src/features/chat/hooks/useChat.ts`

---

#### 8. UI Components (new)

**`ChatEmptyState`** — renders in SETUP phase. Shows the model selector (Base UI Select, pre-populated, disabled if no models), the agent selector (Base UI Select, "No agent" default, disabled if no agents), a welcome headline, and the `ChatInput`.

**`MessageBubble`** — renders a single message. USER messages: plain text, right-aligned. ASSISTANT messages: `react-markdown`, left-aligned. Error messages: red inline bubble.

**`ChatMessages`** — renders the list of `ChatMessageDTO[]` as `MessageBubble` components, plus the streaming bubble (typing indicator → accumulated chunks). Auto-scrolls to the bottom on new content.

**`ChatInput`** — a `<textarea>` and a send button. Disabled when `isStreaming` is true or `selectedModelId` is null (no enabled models). Supports Enter-to-send (Shift+Enter for newline).

**File directory:** `project/srcs/frontend/src/features/chat/components/`

---

#### 9. `pages/ChatPage.tsx` (new)

**Purpose:** Thin composition layer. Calls `useChat()` with **no arguments** (`useChat` reads `conversationId` from `useParams()` itself, so all sub-hooks stay unconditional and the same `useChat` instance survives the `/chat` → `/chat/:id` navigation — see Step 6.1). Renders `ChatEmptyState` (SETUP) or `ChatMessages` + `ChatInput` (CHATTING). No business logic.

**File:** `project/srcs/frontend/src/pages/ChatPage.tsx`

---

#### 10. Routing and Navigation (modified files)

**`router.tsx`** — Add `/chat` and `/chat/:conversationId` as two routes inside the employee-only `RoleGuard` group (same group as `/agents`).

**`Sidebar.tsx`** — Add the Chat menu item as the first entry in the employee section of the `menuItems` array. Use the project's actual field shape `{ title, url, icon, roles }` (the real `Sidebar.tsx` reads `item.title` for the `SidebarMenuItem key`, the `SidebarMenuButton tooltip`, and the visible label — **not** `label`, which does not exist on the type):
```ts
{
  title: "Chat",
  url: "/chat",
  icon: MessageSquarePlus,
  roles: [UserRole.EMPLOYEE],
},
```
Import `MessageSquarePlus` from `lucide-react`. (shadcn/ui v4 + `@base-ui`: `SidebarMenuButton` does **not** support `asChild`, so navigation continues to use the established `onClick={() => navigate(item.url)}` + `useNavigate` pattern — no `asChild`/`<Link>`/`<NavLink>` wrapping; see `Memory/known-issues.md`.)
**Active-state matching (Finding 4 fix):** Replace the exact-match `const isActive = location.pathname === item.url` with a single **segment-aware** rule applied **uniformly to every item**, using the **pure** `matchPath` function from `react-router-dom` (NOT `useMatch` — `useMatch` is a hook and would violate the Rules of Hooks inside `visibleMenuItems.map(...)`; `matchPath` is a pure function so it is safe there):
```tsx
import { matchPath } from "react-router-dom"
const isActive =
  matchPath(item.url, location.pathname) != null ||
  matchPath(`${item.url}/*`, location.pathname) != null
```
With a bare path, `matchPath` defaults `end: true` (exact match — behaviour-identical to the previous `===` for the five static routes, none of which have child routes, so no behavioural change for existing items). The `${url}/*` clause matches child paths (`end` defaults `false`), so `/chat` lights for `/chat/12` (the Finding 4 fix), and any plausible future `/conversations/:id` or `/agents/:id` lights its item automatically with no further sidebar change. Segment-aware matching is mandatory: a naïve `startsWith("/chat")` would also match `/chatterbox`, `/channels`, etc. (latent visual false positive); `matchPath` is bounded by segments. Do **not** add a per-item field (`activePrefix?` / `matchPrefix?`) — the uniform rule already covers any future dynamic route without a configured seam per item (premature abstraction for one consumer, and would duplicate the `url` string).

**`Header.tsx`** — Extend `getPageTitle()` to return `"Chat"` for `/chat` and any `/chat/:conversationId`. Because `/chat/:conversationId` is dynamic, the lookup cannot be a single `ROUTE_TITLES` exact match; use a **segment-safe** guard before the record lookup (avoids the `/chatterbox`/`/channels` false positive raw `startsWith("/chat")` would introduce; no new import needed). Concretely:
```typescript
const ROUTE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/conversations": "Conversations",
  "/employees": "Employees",
  "/app-settings": "App Settings",
  "/agents": "Agents",
  "/chat": "Chat", // exact /chat (the guard below handles /chat/:id)
}

const getPageTitle = () => {
  if (location.pathname === "/chat" || location.pathname.startsWith("/chat/")) return "Chat"
  return ROUTE_TITLES[location.pathname] ?? "Control Panel"
}
```
Do not replace the lookup with `matchPath` from `react-router-dom` (over-engineered for a single fixed title mapping — adds an import where the 2-line segment-safe guard suffices).

**`features/chat/index.ts`** — Public barrel exporting `useChat` and chat types. Internal hooks and components are not exported.

---

## Implementation Steps

### Phase 1: Backend — Employee Model Endpoint

- [x] **Step 1.1:** Add the employee-accessible enabled-models read path. Three coordinated additions:
  1. **`LlmModelRepository`** — add a Spring Data derived query: `List<LlmModelEntity> findByIsEnabledTrue();`. Zero implementation code (Spring generates the query from the existing `isEnabled` `Boolean` field; the repo already uses the same `...AndIsEnabledTrue` derived-query idiom at `LlmModelRepository:11`).
  2. **`LlmModelService`** — add a new public method **with no `@PreAuthorize`** (internal helper; the controller owns the access gate on this endpoint). This is required because every existing public method on `LlmModelService` (`getOne`, `getAll`, `getListPage`, `insert`, `update`, `delete`, `toggleEnabled`) carries `@PreAuthorize("hasRole('ADMIN')")`; invoking any of them from an employee security context throws `AccessDeniedException` → 403 regardless of the controller annotation. Follows the `AppSettingsService.getRawApiKey()` precedent (mandated ungated internal helper) and the in-module `/llm-model/available` precedent (controller-level gate on `getAvailableModels()`):
     ```java
     @Transactional(readOnly = true)
     public List<LlmModelMiniDTO> getEnabledModels() {
         return llmModelRepository.findByIsEnabledTrue()
                 .stream().map(mapper::toSmallDTO).toList();
     }
     ```
     Add a javadoc on the method: *"Intentionally ungated — the controller at `/llm-model/enabled` enforces `ROLE_EMPLOYEE`. Adding `@PreAuthorize` here will 403 employees. See `AppSettingsService.getRawApiKey()` for the same convention."*
  3. **`LlmModelController`** — add:
     ```java
     @GetMapping("/enabled")
     @PreAuthorize("hasRole('EMPLOYEE')")
     public ResponseEntity<List<LlmModelMiniDTO>> getEnabledModels() {
         return ResponseEntity.ok(llmModelService.getEnabledModels());
     }
     ```
  Returns `LlmModelMiniDTO` (`{ id, modelId, name, isEnabled }`) — the existing compact-exposure DTO and an exact 1:1 mirror of the frontend `EnabledModelDTO` (Feature Step 2.1); using `LlmModelMapper::toSmallDTO` avoids leaking the admin catalog metadata `description`/`createdAt` to employees (per ADR-007's curated-list intent). No new DTO, no new mapper method, no new entity.
- [x] **Step 1.2:** TDD for the new endpoint — employee JWT → 200 with only enabled models; admin JWT → 403; anonymous → 401. Prior art: `project/srcs/backend/src/test/java/com/BHT/models/llm/LlmModelControllerTest.java`.

### Phase 2: Chat Service and Types

- [x] **Step 2.1:** Create `features/chat/types.ts` — all TypeScript types: `EnabledModelDTO`, `ChatConversationDTO`, `ChatMessageDTO`, `ChatCreateForm`, `ChatConversationMiniDTO`.
- [x] **Step 2.2:** Install `react-markdown` (`npm install react-markdown`).
- [x] **Step 2.3:** Create `features/chat/services/chatService.ts` — 4 standalone async functions: `getEnabledModels`, `createConversation`, `getConversation`, `getMessages`. TDD with `axios-mock-adapter` following the pattern in `project/srcs/frontend/src/features/app-settings/services/appSettingsService.test.ts`.
- [x] **Step 2.4:** Create `features/chat/index.ts` barrel — export chat types only at this stage (`useChat` is deferred to Task 6 per the review). Internal hooks, services, and components are not re-exported from the barrel.

### Phase 3: useChatSetup Hook

- [x] **Step 3.1:** Create `features/chat/hooks/useChatSetup.ts` — **takes no `conversationId` argument and runs eagerly and unconditionally in both phases** (its inputs — `getEnabledModels()`, `getAppSettings()`, `POST /agent/list` — are phase-independent). Parallel fetch of `getEnabledModels()` and `getAppSettings()`; fetch agents via `POST /agent/list` with the full `PageableRequest` body `{ page: 0, size: 100, sort: [], filters: [] }` (Finding 7); compute initial `selectedModelId` (defaultModel → first model → null); `selectedAgentId` defaults to `null`. It must **not** be made conditional on phase — doing so reintroduces the Finding 3 Rules-of-Hooks violation. The asymmetry with `useConversation`/`useChatSocket` (which no-op on `undefined`) is intentional: only hooks whose work depends on `conversationId` take the no-op guard.
- [x] **Step 3.2:** TDD behaviors:
  - Pre-selects `defaultModel.id` when app settings has a default.
  - Falls back to `enabledModels[0].id` when no default model is set.
  - `selectedModelId` is `null` when no models are available.
  - Agent list populates correctly; agent fetch failure degrades to empty list without setting `error`.
  - `isLoading` is true while fetches are in flight, false after both resolve.

### Phase 4: useConversation Hook

- [x] **Step 4.1:** Create `features/chat/hooks/useConversation.ts` — signature `useConversation(conversationId: number | undefined)`; calls `useState`/`useEffect` unconditionally; the fetch `useEffect` (keyed on `[conversationId]`) parallel-fetches `getConversation(id)` and `getMessages(id)` when `conversationId` is defined, and when `conversationId == null` short-circuits **inside the effect body** to the fixed zero-state `{ conversation: null, messages: [], isLoading: false, error: null }`. The hook **never** early-returns before its `useState`/`useEffect` (that would be a Rules-of-Hooks violation — Finding 3). Returns a **fixed-shape** `{ conversation, messages, isLoading, error }`.
- [x] **Step 4.2:** TDD behaviors:
  - Returns empty messages and null conversation when `conversationId` is undefined (no-op).
  - Loads conversation and messages when `conversationId` is provided.
  - Sets `error` on 404 / network failure.
  - `isLoading` transitions correctly.

### Phase 5: useChatSocket Hook

- [x] **Step 5.1:** Create `features/chat/hooks/useChatSocket.ts` — signature `useChatSocket(conversationId: number | undefined)`; all `useState`/`useRef`/`useEffect` are called **unconditionally at the top of the hook on every render** (Rules of Hooks — Finding 3). `sendMessage(content, conversationIdOverride?)` opens a new `WebSocket` to `ws://localhost:8080/ws/chat/${conversationIdOverride ?? conversationId}?token={getToken()}` (the override is used only on the first send from SETUP, where `useParams()` has not yet updated — see Step 6.1 same-instance flow), sends the JSON payload `{ content }`, and listens for frames; accumulates chunks into `streamingContent`; on `done` sets `isStreaming = false` and **retains** `streamingContent` (the completed assistant text — required for the post-`done` `<ReactMarkdown>` render in Step 7.3; `useConversation` does NOT refetch on `done`, so clearing here would lose the assistant response until refresh); `streamingContent` is cleared once the persisted assistant message replaces the streaming bubble via the Step 6.1 dedup-merge; on `error` sets `socketError` and `isStreaming = false`; cleans up WS on unmount.
  - **WS lifecycle invariant (mandatory):** hold the active `WebSocket` in a `useRef` and close it **only in the hook's unmount cleanup** — NEVER in a `useEffect` keyed on `conversationId`. The first send flips `conversationId` from `undefined` to a real id (via `useParams()` update); a `conversationId`-keyed effect cleanup would tear down the in-flight first-turn socket. WS is single-use per turn (the backend closes after `done`/`error`), and each `sendMessage` opens a **fresh** `new WebSocket(...)`.
  - **No-op placement (mandatory):** the no-op is `if (target == null) return` **inside** `sendMessage` (where `target = conversationIdOverride ?? conversationId`) — **not** a `return` before the hook's `useState`/`useRef`/`useEffect`. An early return before hooks is itself a Rules-of-Hooks violation (Finding 3) and would crash the first render after `conversationId` flips `undefined → id`. The unmount-cleanup `useEffect` is keyed on `[]`.
- [x] **Step 5.2:** TDD behaviors (mock `window.WebSocket`):
  - `isStreaming` becomes true on `sendMessage`, false on `done` frame.
  - Multiple `chunk` frames accumulate in `streamingContent` in order.
  - `done` frame **retains** `streamingContent` and sets `isStreaming = false` *(corrected from "clears" — the architecture section is authoritative; see [[Employee-Chat-Interface-task-5-use-chat-socket-hook]] Decision 1)*.
  - `error` frame sets `socketError` with the message string and `isStreaming = false`.
  - Calling `sendMessage` twice sequentially opens a fresh WebSocket connection.
  - `sendMessage(content, conversationIdOverride)` opens a WS to the override id even when `conversationId` is undefined (SETUP-phase first-send).

### Phase 6: useChat Orchestrator

- [x] **Step 6.1:** Create `features/chat/hooks/useChat.ts` — reads `conversationId` from `useParams()`; calls `useChatSetup`, `useConversation`, and `useChatSocket` **unconditionally** at the top level in a fixed lexical order on every render (Rules of Hooks — Finding 3). The SETUP/CHATTING concept is a derived boolean `hasConversation = conversationId !== undefined` (no `phase` `useState`). **`useChat` returns a single fixed-shape object** (consistent with `useAgentList`/`useEditAgent`), spreading all sub-hook fields plus `hasConversation` — **not** a variable/union return "different fields by phase". Implements `sendMessage` using the **same-instance flow**: in SETUP, `await createConversation` → `navigate('/chat/${id}', { replace: true })` → `useChatSocket.sendMessage(content, id)` passing the new `id` explicitly as an override (the WS must open against the brand-new conversation immediately; do not rely on the stale `useParams` closure — `ChatPage` does not remount, only `useParams()` updates). In CHATTING, `useChatSocket.sendMessage(content)` uses the hook's own `conversationId`. Merges persisted `messages` from `useConversation` with the current `streamingContent` from `useChatSocket` into a unified display list, deduping the optimistic user bubble against the persisted user message by `message.id` (or suppressing the `useConversation` fetch while `isStreaming` is true for the originating turn).
- [x] **Step 6.2:** TDD behaviors:
  - First message in SETUP: calls `createConversation`, then `navigate('/chat/{id}', { replace: true })`, then `useChatSocket.sendMessage(content, id)` with the new `id` as an explicit override.
  - Subsequent message in CHATTING: calls `useChatSocket.sendMessage(content)` directly (no override, no `createConversation`) — uses the hook's own `conversationId` from `useParams()`.
  - Streaming message appears in the merged display list while `isStreaming` is true.
  - Error bubble injected into display list on `socketError`.

### Phase 7: UI Components

- [x] **Step 7.1:** Create `ChatEmptyState.tsx` — model selector (Base UI Select, items from `enabledModels`, disabled if empty, pre-selected by `selectedModelId`) + agent selector (Base UI Select, "No agent" as first option, disabled if `agents` is empty, default `null`) + welcome copy.

- [x] **Step 7.2:** Create `MessageBubble.tsx` — USER: plain text; ASSISTANT: `<ReactMarkdown>` wrapper; error: red styled bubble.

- [x] **Step 7.3:** Create `ChatMessages.tsx` — maps `messages` to `<MessageBubble>`; appends a **streaming bubble** that transitionstyping indicator (while `streamingContent` is empty) → **plain text** of `streamingContent` (while streaming, `isStreaming` true — NOT `<ReactMarkdown>`, to avoid partial-markdown flicker per Finding 6) → final `<ReactMarkdown>` rendering of the completed assistant message once `done` arrives (`isStreaming` false). `useEffect` auto-scrolls a `ref` to bottom on content change. The plain-text-during-streaming → `<ReactMarkdown>`-after-`done` decision is locked (Finding 6) — do not leave it to Task-7 implementation.

- [x] **Step 7.4:** Create `ChatInput.tsx` — controlled `<textarea>`; send on Enter (Shift+Enter for newline); send button; both disabled when `isStreaming || !selectedModelId`.

- [x] **Step 7.5:** No unit tests for components — they are composition layers with no business logic, consistent with `AgentTable`, `AgentPagination`, and other display components in the project.

### Phase 8: Routing, Sidebar, and Header Wiring

- [x] **Step 8.1:** Create `pages/ChatPage.tsx` — thin wrapper, renders `ChatEmptyState` (`hasConversation === false`) or `ChatMessages + ChatInput` (`hasConversation === true`) based on the **`hasConversation` boolean** returned by `useChat()` (there is no `phase` field — the SETUP/CHATTING concept survives only as the derived `hasConversation` boolean; see Section #7 and Step 6.1). `useChat` is called with **no arguments** — it reads `conversationId` from `useParams()` itself (this keeps all three sub-hooks callable unconditionally inside `useChat` and lets the same `useChat` instance survive the `/chat` → `/chat/:id` navigation; see Step 6.1). No business logic.

- [x] **Step 8.2:** Add two routes to `router.tsx` inside the employee-only `RoleGuard` group (after `/agents`):

- [x] **Step 8.3:** Add the Chat item as the first entry in the employee section of `Sidebar.tsx`'s `menuItems` array, using the **`title`** field (not `label`): `{ title: "Chat", url: "/chat", icon: MessageSquarePlus, roles: [UserRole.EMPLOYEE] }`. Import `MessageSquarePlus` from `lucide-react`. Replace the exact-match active check `location.pathname === item.url` with the segment-aware `matchPath` rule shown in the `Sidebar.tsx` Changes Required section (uniform for every item; `matchPath` is a pure function — Rules-of-Hooks safe inside `.map()`; covers `/chat/:id` and future child routes with no per-item field).

- [x] **Step 8.4:** Update `getPageTitle()` in `Header.tsx` to return `"Chat"` for `/chat` and any `/chat/:id` (handle the dynamic segment). Use a **segment-safe** guard — `if (location.pathname === "/chat" || location.pathname.startsWith("/chat/")) return "Chat"` — placed **before** the `ROUTE_TITLES` exact-match lookup, and add `"/chat": "Chat"` to `ROUTE_TITLES`. Do not use raw `startsWith("/chat")` (false-matches `/chatterbox`/`/channels`) nor `matchPath` (over-engineered for a single title mapping). See the concrete function in the `Header.tsx` Changes Required section.

---

## Potential Issues / Risks

- **WebSocket is not proxied by Vite.** The WS URL must be `ws://localhost:8080/ws/chat/...` — not `ws://localhost:3000/ws/chat/...`. Using the dev server port will silently fail to connect. This is documented in [[Docs/API-Reference/WebSocket-Chat]] and must be hardcoded for dev. A configurable base URL (env var) should be added before production deployment.
- **Connection closes after every error.** `ChatWebSocketHandler` calls `session.close()` after any exception. The frontend `useChatSocket` must treat each `sendMessage` call as requiring a fresh WebSocket — never attempt to reuse a closed connection. Any retry opens a new `new WebSocket(...)`.
- **`react-markdown` streaming flicker — DECIDED (Finding 6, Option A).** Rendering partial markdown on every chunk (e.g., an unclosed `**bold**` or a half-written code fence) flickers as tokens complete. **Decision:** render `streamingContent` as **plain text** (styled container, not `<ReactMarkdown>`) while streaming, and switch to `<ReactMarkdown>` only after the `done` frame. The streaming bubble transitions typing indicator → plain-text accumulation → final rendered markdown (the ChatGPT pattern). This is no longer a deferred TBD — Task 7 implements the plain-text-during-streaming path directly.
- **No enabled models.** If an admin logs in and enables zero models, `getEnabledModels()` returns `[]`. `useChatSetup` sets `selectedModelId = null`. `ChatInput` must disable the send button in this state. The empty-state UI should display a user-facing explanation: "No models available — ask your administrator to enable at least one model."
- **Agent list pagination.** `POST /agent/list` is paginated. `useChatSetup` requests body `{ page: 0, size: 100, sort: [], filters: [] }` (the full `PageableRequest` from `types/api.ts` — Finding 7). Employees with more than 100 agents will not see all agents in the selector. This is an acceptable MVP cut; a searchable selector or subsequent page loading can be added in a follow-up.
- **`getToken()` returning null.** If the session has expired between page load and first send, `getToken()` returns `null` and the WebSocket handshake will be rejected with 401. The `error` frame handling will surface this as an inline error. The 401 rejection may also close the page via the `setOnUnauthorized` callback in `main.tsx`. This is the expected behavior — the user is redirected to login.
- **Backend CORS: PATCH is blocked.** This is a pre-existing issue unrelated to this feature (`PATCH /conversation/{id}/model` and `/conversation/{id}/title` are blocked by CORS). This feature does not use any PATCH endpoints.
- **First-message flow depends on `ChatPage` staying mounted across `/chat` → `/chat/:id`.** Verified against the installed `react-router@6.30.4` source: two sibling `<Route>` elements both using `element={<ChatPage />}` with no `key` preserve the `ChatPage` fiber across the navigation (only `useParams()` changes). The same-instance first-message flow in Step 6.1 relies on this. **Do not** add a `key` (e.g. `key={location.pathname}`) to `<ChatPage />`, nor switch the routes to `Component={ChatPage}` ("de-optimized" path that mounts fresh each render) — either change would silently drop the first message and reset streaming/scroll state. Also update `documentation/Memory/known-issues.md` with this invariant. The first turn's optimistic user bubble may overlap the persisted user message fetched by `useConversation` once `useParams()` resolves — dedupe by `message.id` (or suppress `useConversation`'s fetch while `isStreaming` is true for the originating turn) in the merge step.

---

## Testing Decisions

Good tests for this feature verify observable behavior through public hook interfaces — what state is returned given a sequence of mock responses or WebSocket frames — not internal implementation details. Tests must not assert on service call order, internal `useState` references, or WebSocket object internals.

**What makes a good test in this feature:**
- Feed mock HTTP responses and mock WebSocket frames; assert on the hook's returned state.
- Tests survive internal refactors (e.g., combining two `useState` calls into one reducer).
- Each test covers one observable behavior (one sentence describing what the user experiences).

**Modules with TDD:**

| Module | Test type | Prior art |
|--------|-----------|-----------|
| `GET /llm-model/enabled` (backend) | `@SpringBootTest` + JWT-based security test | `project/srcs/backend/src/test/java/com/BHT/models/llm/LlmModelControllerTest.java` |
| `chatService.ts` | Service boundary test with `axios-mock-adapter` | `project/srcs/frontend/src/features/app-settings/services/appSettingsService.test.ts` |
| `useChatSetup` | `renderHook` + `vi.mock` for service calls | `project/srcs/frontend/src/features/agents/hooks/useAgentList.test.ts` |
| `useConversation` | `renderHook` + `vi.mock` | `project/srcs/frontend/src/features/agents/hooks/useAgentList.test.ts` |
| `useChatSocket` | `renderHook` + `vi.stubGlobal('WebSocket', FakeWebSocket)` | No direct prior art — introduce fake WebSocket class in test setup |
| `useChat` | `renderHook` + `vi.mock` for `useChatSetup`, `useConversation`, `useChatSocket`, `chatService` | `project/srcs/frontend/src/features/agents/hooks/useEditAgent.test.ts` |

**Modules without TDD:**
- All UI components (`ChatEmptyState`, `MessageBubble`, `ChatMessages`, `ChatInput`, `ChatPage`) — composition layers with no business logic, consistent with `AgentTable`, `CreateAgentModal`, and all other display components in the project.

---

## Task Breakdown

### Task 1: Backend — Employee Model Endpoint

- **Steps Covered:** Steps 1.1, 1.2
- **Reason for Grouping:** Self-contained backend change. Must be done first — the frontend model selector depends on it. Small scope: one controller method + one test class.
- **Planned Task File:** `Employee-Chat-Interface-step-1-backend-enabled-models-endpoint.md`
- **Task Document Link:** [[Employee-Chat-Interface-step-1-backend-enabled-models-endpoint]]

### Task 2: Chat Service and Types

- **Steps Covered:** Steps 2.1, 2.2, 2.3, 2.4
- **Reason for Grouping:** Types and services are the foundation all hooks depend on. `react-markdown` install belongs here since it is a compile-time dependency. The barrel (`index.ts`) is stubbed here and completed in later tasks.
- **Planned Task File:** `Employee-Chat-Interface-step-2-chat-service-and-types.md`
- **Task Document Link:** [[Employee-Chat-Interface-step-2-chat-service-and-types]]

### Task 3: useChatSetup Hook

- **Steps Covered:** Steps 3.1, 3.2
- **Reason for Grouping:** Standalone — no dependency on `useConversation` or `useChatSocket`. Tests can run in full isolation against mocked services.
- **Planned Task File:** `Employee-Chat-Interface-task-3-use-chat-setup-hook.md`
- **Task Document Link:** [[Employee-Chat-Interface-task-3-use-chat-setup-hook]]

### Task 4: useConversation Hook

- **Steps Covered:** Steps 4.1, 4.2
- **Reason for Grouping:** Standalone — loads existing conversation data, no WebSocket involvement. Can be built and tested independently.
- **Planned Task File:** `Employee-Chat-Interface-task-4-use-conversation-hook.md`
- **Task Document Link:** [[Employee-Chat-Interface-task-4-use-conversation-hook]]

### Task 5: useChatSocket Hook

- **Steps Covered:** Steps 5.1, 5.2
- **Reason for Grouping:** The most complex module — WebSocket lifecycle, chunk accumulation, frame parsing. Isolated from the rest of the feature; the fake WebSocket test pattern is new to the project and deserves its own task to be designed carefully.
- **Planned Task File:** `Employee-Chat-Interface-task-5-use-chat-socket-hook.md`
- **Task Document Link:** [[Employee-Chat-Interface-task-5-use-chat-socket-hook]]

### Task 6: useChat Orchestrator

- **Steps Covered:** Steps 6.1, 6.2
- **Reason for Grouping:** Depends on Tasks 3, 4, and 5 being complete. Orchestration logic (phase transitions, first-message creation, display list merge) is testable with all dependencies mocked.
- **Planned Task File:** `Employee-Chat-Interface-task-6-use-chat-orchestrator.md`
- **Task Document Link:** [[Employee-Chat-Interface-task-6-use-chat-orchestrator]]

### Task 7: UI Components, Routing, and Wiring

- **Steps Covered:** Steps 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4
- **Reason for Grouping:** All UI and wiring steps are composition-only, depend on all hooks being in place, and share no business logic. No unit tests. Grouped together as a single "assemble and wire" task.
- **Planned Task File:** `Employee-Chat-Interface-task-7-ui-components-and-wiring.md`
- **Task Document Link:** [[Employee-Chat-Interface-task-7-ui-components-and-wiring]]
