#high #architectural

## Bug: Review of Employee-Chat-Interface Feature Document

### Summary

This is a pre-implementation review of [[Employee-Chat-Interface]]. The feature document describes a ChatGPT-like chat interface for employees, including a new backend endpoint for employee-accessible enabled models, WebSocket streaming, model/agent selection, URL-based conversation routing, and markdown rendering.

The review identified **7 findings**: 2 High, 3 Moderate, 2 Low. Two High findings must be resolved before implementation begins — one would produce a 403 error for employees at runtime, and the other would silently drop the first message after conversation creation. Neither is caught by TypeScript or tests.

---

### Findings

---

#### Finding 1 — Backend: `GET /llm-model/enabled` cannot reuse existing admin-gated service methods

**Severity:** 🟠 High

**Description:**
The feature document states: "No new service or repository method — use existing `LlmModelService` filtered appropriately." This is incorrect. Every method on `LlmModelService` carries `@PreAuthorize("hasRole('ADMIN')")`. When an employee calls `GET /llm-model/enabled`, Spring Security will evaluate the security annotation on the underlying service method and throw `AccessDeniedException`, returning 403 — regardless of the controller-level authorization.

**Evidence in Code:**
- `project/srcs/backend/src/main/java/com/BHT/models/llm/LlmModelService.java` — `getAll()`, `getOne()`, `getListPage()` all annotated `@PreAuthorize("hasRole('ADMIN')")`. Calling any of these from an employee security context throws `AccessDeniedException`.
- `project/srcs/backend/src/main/java/com/BHT/models/llm/LlmModelController.java` — confirms the only non-admin method is `toggle()` (no annotation, inherits from `DefaultController`).

**Why It Matters:**
Employees would get a 403 on page load. The model selector would never populate. The chat interface would be completely unusable. This is a silent runtime failure — TypeScript and unit tests would not catch it.

**Possible Solutions:**
- **Option A (recommended):** Add a new public service method `getEnabledModels()` to `LlmModelService` with **no** `@PreAuthorize` (internal helper — the controller provides the access gate): `return llmModelRepository.findByIsEnabledTrue().stream().map(mapper::toDTO).toList()`. The controller method carries `@PreAuthorize("hasRole('EMPLOYEE')")`. This requires adding `findByIsEnabledTrue()` to `LlmModelRepository` (a Spring Data derived query — zero implementation code).
- **Option B:** Add `@PreAuthorize("isAuthenticated()")` to the new service method. Slightly more permissive (any authenticated user), but since the controller already gates by EMPLOYEE, functionally equivalent for this endpoint.

**Recommended Solution:** Option A — no annotation on the service method, access gate only at the controller. This follows the precedent set by `AppSettingsService.getRawApiKey()` (no `@PreAuthorize`, used internally by `OpenRouterService`) and the in-module precedent `LlmModelController.getAvailableModels()` (controller-level `@PreAuthorize`). Documents the intention clearly: this method is an internal helper, the controller owns the authorization.

**Decision:** **Option A (refined) — accepted (2026-06-30).** Add a new public service method `getEnabledModels()` to `LlmModelService` with **no** `@PreAuthorize` (internal helper; the controller owns the access gate), returning `List<LlmModelMiniDTO>` via the existing `LlmModelMapper::toSmallDTO` — a 1:1 mirror of the frontend `EnabledModelDTO` (`{ id, modelId, name, isEnabled }`), so no `description`/`createdAt` leaks to employees (aligns with ADR-007's curated-list intent). Add the Spring Data derived query `List<LlmModelEntity> findByIsEnabledTrue()` to `LlmModelRepository` — zero implementation code (the repo already uses the `...AndIsEnabledTrue` idiom at line 11). The controller method carries `@PreAuthorize("hasRole('EMPLOYEE')")`. A javadoc on the service method warns against adding `@PreAuthorize`, mirroring the `AppSettingsService.getRawApiKey()` guard. **Rejected Option B:** `@PreAuthorize("isAuthenticated()")` is strictly weaker than the controller's `hasRole('EMPLOYEE')` (redundant, not defense-in-depth) and diverges from the mandated `getRawApiKey` precedent. **Refinement over the original Option A:** `LlmModelMiniDTO` replaces the full `LlmModelDTO` because `description`/`createdAt` are admin catalog metadata employees do not need and would be unused fields against the frontend contract. **Parent document patched:** Feature `Step 1.1` and `Implementation Architecture → Changes Required → 1. Backend`.

---

#### Finding 2 — First message is silently lost after navigation

**Severity:** 🟠 High

**Description:**
The feature document describes the first-message flow in `useChat` as: (1) call `createConversation()`, (2) call `navigate('/chat/{id}')`, (3) call `useChatSocket.sendMessage(content)`. This sequence is impossible as described. After step 2, React unmounts the current `ChatPage` (at `/chat`) and mounts a new one (at `/chat/{id}`). Step 3 would execute on the hook instance belonging to the OLD, unmounting component. The pending message content is never sent.

The new `ChatPage` at `/chat/{id}` has no knowledge of a pending first message — it only sees the conversation ID in the URL. The conversation is created in the database, but the WebSocket is never opened and the first message is never sent. The user sees a blank chat with no response.

**Why It Matters:**
The first message is the central user story (story #9: "I want to send my first message and have the conversation be created automatically"). A silent drop of that message would be the most confusing possible failure — the conversation appears in the DB but is forever empty.

**Possible Solutions:**
- **Option A (recommended):** Pass the pending message as navigation state: `navigate('/chat/${id}', { state: { pendingMessage: content } })`. In `useChat` (CHATTING phase), read `const location = useLocation()` and on mount check `if (location.state?.pendingMessage)` → auto-call `useChatSocket.sendMessage(location.state.pendingMessage)`. Clear the state after sending via `navigate('.', { replace: true, state: {} })` to prevent re-sending on refresh.
- **Option B:** Invert the order — open the WebSocket, send the message, and navigate only after the `done` frame arrives. This delays the URL update until after the full first exchange, which means the user is still on `/chat` while the LLM streams. The URL only updates after the response, which is disorienting but technically correct.
- **Option C:** Use a React context or a ref outside the component tree to hold the pending message. More complex, not idiomatic.

**Recommended Solution:** Option A — navigation state is the idiomatic React Router v6 mechanism for this exact pattern (passing ephemeral data during navigation). It requires minimal code, is cleared after use, and keeps the URL correct from the moment the conversation is created.

> **Premise correction (verified during decision, 2026-06-30):** the finding's stated mechanism — "React unmounts ChatPage at `/chat` and mounts a new one at `/chat/{id}`" — is **false for this router shape**. Verified against the installed `react-router@6.30.4` source (`dist/react-router.development.js`): a route using `element={<ChatPage/>}` reuses `match.route.element` (lines 576–577) and `RenderedRoute` is created with **no `key`** (lines 581–589); the `Component=` path is the explicitly "de-optimized" one (lines 568–575). Because Step 8.2 plans `<Route path="/chat" element={<ChatPage/>}/>` and `<Route path="/chat/:conversationId" element={<ChatPage/>}/>` (element=, no key), React preserves the ChatPage fiber across `/chat` → `/chat/:id` and only `useParams()` changes. **The real failure is a stale `useParams` closure** (`sendMessage` runs synchronously after `navigate()`, before the re-render, so it still sees `conversationId === undefined`) — not a remount. The symptom (first message dropped) stands; the cause does not.

**Decision:** **Same-instance flow (the alternative solution) — accepted (2026-06-30).** `createConversation` → `navigate('/chat/{id}', { replace: true })` → `useChatSocket.sendMessage(content, id)` with the new `id` passed **explicitly as an override** so the WS opens against the new conversation immediately (sidestepping the stale `useParams` closure — no reliance on the not-yet-applied re-render). ChatPage stays mounted; the SETUP→CHATTING flip happens on the same `useChat` instance. **Rejected Option A:** the navigation-state handoff solves a remount that does not occur under the planned router shape; it also carries a real residual cost (`history.state` survives a full reload per the HTML nav-history spec, so the post-send `replace({})` clear is load-bearing and a push→replace refresh-replay race exists, plus a React StrictMode double-send needing a `useRef` guard). The same-instance flow eliminates all of that with less machinery while keeping the URL correct from send-time (`replace` keeps the back button clean). **Rejected Option B:** deferring the URL until the `done` frame violates story #10 (URL lags the full generation), worse refresh-mid-stream failure (orphaned conversation), and a post-`done` remount reload flash. **Required invariants (documented in the Feature doc and `Memory/known-issues.md`):** (1) `<ChatPage/>` routes MUST use `element=` (not `Component=`) and MUST NOT carry a `key` (`key={location.pathname}` would reintroduce the silent drop); (2) `useChatSocket` MUST hold the active WebSocket in a `useRef` and close it only on hook unmount — never via a `useEffect` keyed on `conversationId` (the first-turn socket would be torn down when `useParams` flips `undefined → id`); (3) `sendMessage` MUST accept an optional `conversationIdOverride?` for the first send; (4) the merge step dedupes the optimistic user bubble against the persisted user message from `useConversation` by `message.id` (or suppresses the fetch while `isStreaming` is true). **Parent document patched:** Feature `useChat` Phase SETUP/CHATTING sections, `Step 5.1`, `Step 6.1`, `Step 6.2`, `Step 8.1/8.2`, and `Potential Issues / Risks`.

---

#### Finding 3 — React Rules of Hooks violation: `useChat` cannot conditionally delegate to hooks

**Severity:** 🟡 Moderate

**Description:**
The feature document describes `useChat` as delegating to `useChatSetup` "OR" `useConversation + useChatSocket` based on a SETUP/CHATTING phase. Conditional hook calls violate React's Rules of Hooks and will crash the application when the phase changes (`React Error: Rendered more hooks than during the previous render`).

Additionally, `useChatSocket` is specified with interface `sendMessage(content: string): void` taking `conversationId: number` as a constructor argument. In SETUP phase, `conversationId` from `useParams()` is `undefined`. If `useChatSocket` is always called (as required), it must accept `conversationId: number | undefined` and be a no-op when undefined.

**Why It Matters:**
The component would crash on the first render after the phase transition (when `conversationId` changes from `undefined` to a real number). This would break the core happy path.

**Possible Solutions:**
- **Option A (recommended):** Call all three hooks unconditionally in `useChat`. Pass `conversationId: number | undefined` to `useChatSocket` and `useConversation`. Both hooks are no-ops when `conversationId` is undefined. The SETUP/CHATTING phase is determined by `conversationId !== undefined`, and the returned state from `useChat` exposes different fields depending on the phase — but all three hooks always run.
- **Option B:** Use `useChatSocket` as a factory function that returns a mutable ref-based controller, not a hook. This sidesteps the rules-of-hooks constraint but diverges from the project hook convention.

**Recommended Solution:** Option A — update `useChatSocket`'s interface to `conversationId: number | undefined` with a no-op guard inside the `sendMessage` handler (NOT a `return` before the hook's `useState`/`useEffect` — that would itself be a Rules-of-Hooks violation). Update `useConversation` similarly. Update the feature document to make this explicit.

**Decision:** **Option A (refined) — accepted (2026-06-30).** Largely **auto-resolved by Finding 2**: the accepted same-instance flow already mandated that `useChat` call `useChatSetup`, `useConversation`, and `useChatSocket` **unconditionally** in a fixed lexical order on every render (patched Step 6.1), so the conditional-delegation crash is gone. Residual refinements: (1) **no-op placement** — `if (!conversationId) return { sendMessage: noop, ... }` placed *before* `useState`/`useRef`/`useEffect` is itself a Rules-of-Hooks violation ("Do not call Hooks after a conditional return"); the no-op must be implemented **inside** the `sendMessage` handler and inside fetch-effect bodies, never as an early return before the hooks. (2) **Fixed-shape returns** — `useAgentList`, `useEditAgent`, `useCreateAgent` all return fixed-shape interfaces; the chat hooks and `useChat` must too (the original Option A's "returned state exposes different fields by phase" diverges from this convention). The `SETUP`/`CHATTING` phase collapses to a derived `hasConversation` boolean (`conversationId !== undefined`) — no `phase` `useState`, no variable-shape return. Signatures: `useConversation(conversationId: number | undefined)` and `useChatSocket(conversationId: number | undefined)` returning their fixed zero-state when `conversationId` is undefined; `useChatSocket.sendMessage(content, conversationIdOverride?: number)` (override used only on the first send from SETUP — Finding 2). `useChatSetup` takes no `conversationId` and runs eagerly in both phases (its inputs are phase-independent). **Rejected Option B** (non-hook factory/ref-controller): incompatible with the accepted Finding 2 same-instance flow (which requires a surviving hook), breaks streaming reactivity unless it internally calls `useState` (becoming a hook anyway), and diverges from the project's sole hook convention. **Parent document patched:** Feature Sections #4 (useChatSetup), #5 (useConversation), #6 (useChatSocket), #7 (useChat), and Steps 3.1, 4.1, 5.1, 6.1.

---

#### Finding 4 — Sidebar `isActive` check breaks for `/chat/:conversationId`

**Severity:** 🟡 Moderate

**Description:**
`Sidebar.tsx` computes `isActive` using `location.pathname === item.url`. The "Chat" menu item has `url: "/chat"`. When the user navigates to `/chat/12`, `location.pathname` is `"/chat/12"` — the exact equality fails, and the "Chat" sidebar item appears inactive. The user has no visual indication of where they are in the app when viewing a conversation.

**Evidence in Code:**
- `project/srcs/frontend/src/layouts/Sidebar.tsx` — `const isActive = location.pathname === item.url` (exact match used for all items).
- All current routes (`/dashboard`, `/employees`, `/conversations`, `/agents`) are static paths, so the exact match has never been a problem. The `/chat/:conversationId` dynamic segment is the first case where this pattern breaks.

**Why It Matters:**
Navigation clarity is a baseline UX expectation. An unhighlighted sidebar item while the user is on a chat page breaks visual orientation. This is especially noticeable in a long session where the user opens and returns to conversations.

**Possible Solutions:**
- **Option A (recommended):** For the Chat item specifically, use `location.pathname.startsWith("/chat")` for the active check. The cleanest way is to add an optional `matchPrefix?: boolean` field to the menu item type, or to special-case the active check in the sidebar render based on the URL prefix.
- **Option B:** Add a `activePrefix?: string` field to the menu item definition: `{ ..., url: "/chat", activePrefix: "/chat" }`. The `isActive` check becomes `activePrefix ? location.pathname.startsWith(activePrefix) : location.pathname === url`.

**Recommended Solution:** Option B — the `activePrefix` field makes the intent explicit and extensible. Any future dynamic-segment route (e.g., `/conversations/:id`) can reuse the same pattern without modifying the `isActive` logic a second time.

**Decision:** **Uniform `matchPath` rule (the alternative investigated) — accepted (2026-06-30).** Replace `const isActive = location.pathname === item.url` with the segment-aware rule applied to **every** item, using the **pure** `matchPath` function from `react-router-dom@6.30.4` (exported and verified at runtime; `matchPath` is NOT a hook, so it is Rules-of-Hooks safe inside `visibleMenuItems.map(...)`, unlike `useMatch`):

```tsx
import { matchPath } from "react-router-dom"
const isActive =
  matchPath(item.url, location.pathname) != null ||
  matchPath(`${item.url}/*`, location.pathname) != null
```

With a bare path `matchPath` defaults `end: true` (exact match — behaviour-identical to the previous `===` for the five static routes, which have no child routes, so no behavioural change for existing items). The `${url}/*` clause matches child paths (`end` defaults `false`), so `/chat` lights for `/chat/12`, and any plausible future `/conversations/:id` or `/agents/:id` lights its item automatically with **zero** further sidebar change. Segment-aware matching is required: a naïve `startsWith("/chat")` (Options A and B as literally worded) would also match `/chatterbox`, `/channels`, etc. — a latent visual false positive. `matchPath` is bounded by path segments, so it does not. **Rejected Option B (`activePrefix?: string`):** premature abstraction for a single consumer, duplicates the `url` string, and ships the segment-unaware `startsWith` false positive. **Rejected Option A (`matchPrefix?: boolean` / inline `startsWith("/chat")`):** same `startsWith` false positive; the bool-field variant is premature abstraction. **Rejected `useMatch`/`NavLink` alternative:** `useMatch` is a hook and would violate the Rules of Hooks if called per item inside `.map()`; NavLink-via-`SidebarMenuButton render` would mix nav mechanisms and diverge from the project-mandated (`Memory/known-issues.md`) `onClick` + `useNavigate` pattern (shadcn/ui v4 `SidebarMenuButton` has no `asChild`). **Field-name correction (parent doc Step 8.3):** the real `Sidebar.tsx` menu-item field is `title` (consumed by `SidebarMenuItem key`, the `tooltip`, and the visible label), **not** `label` — the doc's `{ label: "Chat", ... }` is patched to `{ title: "Chat", ... }`. **Parent document patched:** Feature `Sidebar.tsx` Changes Required section, `Step 8.3`, and `Memory/architecture.md` Sidebar row.

---

#### Finding 5 — `getPageTitle()` restructuring is underspecified for dynamic paths

**Severity:** 🟡 Moderate

**Description:**
`Header.tsx` uses `const getPageTitle = () => ROUTE_TITLES[location.pathname] ?? "Control Panel"` — a one-liner doing exact path matching against a `Record<string, string>`. The feature document says to "use `location.pathname.startsWith('/chat')` as the match condition, placed before the `ROUTE_TITLES` exact-match lookup." This correctly identifies the approach but does not show the concrete updated function, leaving implementation ambiguous.

Without guidance, a developer might add `"/chat": "Chat"` to `ROUTE_TITLES` (which handles `/chat` but not `/chat/12`) or restructure `getPageTitle()` incorrectly.

**Evidence in Code:**
- `project/srcs/frontend/src/layouts/Header.tsx` — the current `ROUTE_TITLES` record + one-liner `getPageTitle`.

**Why It Matters:**
The Header shows "Control Panel" for any unrecognized path. Without explicit restructuring guidance, `/chat/12` would display "Control Panel" instead of "Chat". Low visual impact but inconsistent with project conventions.

**Possible Solutions:**
- **Option A (recommended):** Specify the updated function explicitly in the feature document:
  ```typescript
  const getPageTitle = () => {
    if (location.pathname.startsWith("/chat")) return "Chat"
    return ROUTE_TITLES[location.pathname] ?? "Control Panel"
  }
  ```
  Add `"/chat": "Chat"` to `ROUTE_TITLES` for the exact `/chat` case, but the `startsWith` guard handles `/chat/:id`.
- **Option B:** Replace `ROUTE_TITLES[location.pathname]` lookup with a route-matching approach using `matchPath` from `react-router-dom`, which handles dynamic segments natively.

**Recommended Solution:** Option A — simple, explicit, follows existing code style. `startsWith` guard before the record lookup is 2 lines and requires no new imports. Option B is over-engineered for this use case.

**Decision:** **Option A (refined — segment-safe) — accepted (2026-06-30).** Specify the concrete updated function explicitly in the feature document:
```typescript
const getPageTitle = () => {
  if (location.pathname === "/chat" || location.pathname.startsWith("/chat/")) return "Chat"
  return ROUTE_TITLES[location.pathname] ?? "Control Panel"
}
```
and add `"/chat": "Chat"` to `ROUTE_TITLES`. The guard is made **segment-safe** (`=== "/chat" || startsWith("/chat/")`) rather than the raw `startsWith("/chat")` the bug report Option A literally proposed — this avoids the latent `/chatterbox`/`/channels` false positive that raw `startsWith` introduces (the same edge rejected for Finding 4's sidebar), with **no new import** (unlike Option B's `matchPath`, which is over-engineered for a single fixed title mapping). Follows the existing one-liner `getPageTitle` code style; no new dependency. **Rejected Option B:** adds a `react-router-dom` `matchPath` import for one title lookup — over-engineering for this use case. **Parent document patched:** Feature `Header.tsx` Changes Required section and `Step 8.4`.

---

#### Finding 6 — `react-markdown` streaming flicker left unresolved

**Severity:** 🟢 Low

**Description:**
The feature document acknowledges that streaming partial markdown tokens (unclosed `**bold**`, half-written code fences) causes visual flicker during chunk accumulation, and mentions a potential mitigation ("render plain text during streaming, switch to `<ReactMarkdown>` only after `done`"). However, it explicitly defers this decision to Task 7 with no recommendation.

Leaving this open increases the chance that Task 7 implements the flicker-prone path and then requires a follow-up task to fix the UX.

**Why It Matters:**
The streaming experience is central to user stories 12 and 13 ("word-by-word appearance", "start reading before generation completes"). If chunks flicker as partial markdown is parsed, the experience is worse than a loading spinner. A clear decision in the feature document ensures Task 7 implements the correct approach from the start.

**Possible Solutions:**
- **Option A (recommended):** Render `streamingContent` as plain text (inside a `<pre>` or a styled `<div>`) while streaming, switch to `<ReactMarkdown>` after `done`. This eliminates flicker completely and is the simplest implementation.
- **Option B:** Always use `<ReactMarkdown>`. Accept the flicker as a known cosmetic limitation for MVP.

**Recommended Solution:** Option A — plain text during streaming, `<ReactMarkdown>` after `done`. The streaming bubble transitions from typing indicator → plain text accumulation → final rendered markdown. This is the pattern used by ChatGPT and produces the cleanest visual result.

**Decision:** **Option A — accepted (2026-06-30).** The decision is no longer deferred to Task 7. Render `streamingContent` as **plain text** (inside a styled container) while streaming; switch to `<ReactMarkdown>` only after the `done` frame. The assistant streaming bubble transitions: typing indicator → plain-text chunk accumulation → final rendered markdown. This eliminates partial-markdown flicker (unclosed `**`, half code fences) entirely, serves user stories #12/#13 (word-by-word, start reading before completion), and is the simplest correct implementation (the ChatGPT pattern). **Rejected Option B:** always-`<ReactMarkdown>` ships the flicker, making the streaming UX worse than a loading spinner. **Parent document patched:** Feature Step 7.2/7.3, the `react-markdown streaming` risk entry (now a decidedMitigation, not a deferred TBD), and the streaming Design decision bullet.

---

#### Finding 7 — `POST /agent/list` request body format unspecified for `useChatSetup`

**Severity:** 🟢 Low

**Description:**
The feature document states that `useChatSetup` fetches agents via `POST /agent/list` (page 0, size 100) but does not provide the full `PageableRequest` body. The backend expects `{ page, size, sort, filters }` per the shared schema. A developer implementing Task 3 would need to look up `agentService.ts` and `types/api.ts` to find the exact format.

**Evidence in Code:**
- `project/srcs/frontend/src/features/agents/services/agentService.ts` — `listAgents(request: PageableRequest)` — takes the full object.
- `project/srcs/frontend/src/types/api.ts` — `PageableRequest` requires `page`, `size`, `sort[]`, `filters[]`.

**Why It Matters:**
Minor friction during Task 3 implementation. Without the exact body, a developer might omit `sort` or `filters` and get a backend validation error.

**Possible Solutions:**
- **Option A (recommended):** Add the full request body to the feature document: `{ page: 0, size: 100, sort: [], filters: [] }`.

**Recommended Solution:** Option A — one line of clarification in the feature document eliminates implementation ambiguity.

**Decision:** **Option A — accepted (2026-06-30).** Add the full `PageableRequest` body to the feature document wherever the agent list fetch is specified: `POST /agent/list` with body `{ page: 0, size: 100, sort: [], filters: [] }` (the universal `POST /{resource}/list` body from `types/api.ts`; empty `sort`/`filters` arrays are valid). This eliminates Task-3 implementation ambiguity and prevents a backend validation error from omitting `sort` or `filters`. **Parent document patched:** Feature `useChatSetup` Changes Required section, `Step 3.1`, and the `Agent list pagination` risk entry.

---

### Findings Summary Table

| # | Title | Severity | Status |
|---|-------|----------|--------|
| 1 | Backend `GET /llm-model/enabled` cannot reuse admin-gated service methods | 🟠 High | Done |
| 2 | First message silently lost after navigation | 🟠 High | Done |
| 3 | React Rules of Hooks violation in `useChat` — conditional hook delegation | 🟡 Moderate | Done |
| 4 | Sidebar `isActive` check breaks for `/chat/:conversationId` | 🟡 Moderate | Done |
| 5 | `getPageTitle()` restructuring underspecified for dynamic paths | 🟡 Moderate | Done |
| 6 | `react-markdown` streaming flicker decision deferred without recommendation | 🟢 Low | Done |
| 7 | `POST /agent/list` request body format unspecified for `useChatSetup` | 🟢 Low | Done |

---

### Investigation Scope

- **Feature document reviewed:** `documentation/Features/to-do/Employee-Chat-Interface.md`
- **Code reviewed:**
  - `project/srcs/backend/src/main/java/com/BHT/models/llm/LlmModelController.java`
  - `project/srcs/backend/src/main/java/com/BHT/models/llm/LlmModelService.java`
  - `project/srcs/frontend/src/router.tsx`
  - `project/srcs/frontend/src/layouts/Sidebar.tsx`
  - `project/srcs/frontend/src/layouts/Header.tsx`
  - `project/srcs/frontend/src/services/authSession.ts`
  - `project/srcs/frontend/src/features/agents/types.ts`
  - `project/srcs/frontend/src/features/agents/services/agentService.ts`
  - `project/srcs/frontend/package.json` (lucide-react version + icon availability)
- **ADRs cross-referenced:** ADR-006, ADR-007, ADR-008, ADR-010
- **Runtime Evidence:** No runtime — design-time analysis only.

### Confidence Level

Confirmed for all findings. All evidence is directly observable in the codebase — no inference required.

---

### Affected Documentation

- [[Employee-Chat-Interface]] — the feature being reviewed; all findings require patches to this document
- [[Docs/API-Reference/WebSocket-Chat]] — informs Finding 2 (WS opened per send) and Finding 3 (conversationId required for WS URL)
- [[Docs/API-Reference/LlmModels]] — informs Finding 1 (all `/llm-model/**` admin-only)
- [[Memory/architecture]] — Sidebar and Header implementation details; informs Findings 4 and 5
