#medium #done

## Feature: Conversation History List and Delete

**Status:** ✅ Complete — 2026-06-30
All 5 tasks (phases) implemented and validated. The Conversations page now renders the employee's paginated conversation history with delete functionality and comprehensive error/empty states.

### Description

Replace the placeholder Conversations page (`/conversations`) with a real, paginated history of the authenticated employee's previous conversations, ordered by **last activity** (most recent at the top). Each row exposes a **delete** action on the right that removes the conversation (and, at the database level, its messages) after a lightweight confirmation dialog.

This is a **frontend-only** feature. The backend Conversation domain (`models/conversation/`) is already complete and owner-scoped; this feature consumes its existing public endpoints without any backend change.

## Problem Statement

An employee using AgentForge has no way to see the conversations they have previously started. The `/conversations` page is a static placeholder ("Your conversation history.") with no data, no list, and no actions. Conversations accumulate in the database (created by the chat/WebSocket flow) but are invisible and unmanageable from the UI — the employee can neither review which conversations exist nor remove ones they no longer want.

## User Stories

1. As an employee, I want to see a list of my previous conversations on the Conversations page, so that I can review what I have worked on.
2. As an employee, I want my conversations ordered with the most recently active one at the top, so that the conversation I most likely care about is immediately visible.
3. As an employee, I want each conversation row to show its title, so that I can recognize it.
4. As an employee, I want each conversation row to show when it was last active, so that I can judge its recency.
5. As an employee, I want a delete control on the right of each conversation row, so that I can remove conversations I no longer need.
6. As an employee, I want a confirmation step before a conversation is deleted, so that I do not lose a conversation by an accidental click.
7. As an employee, I want to understand that deleting a conversation is permanent before I confirm, so that I make an informed decision.
8. As an employee, I want the list to page through my conversations when I have many, so that the page stays fast and readable.
9. As an employee, I want to choose how many conversations are shown per page, so that I can scan more or fewer at a time.
10. As an employee, I want a clear empty state when I have no conversations, so that I am not confused by a blank table.
11. As an employee, I want a clear error message if the list fails to load, so that I know to retry rather than assume I have no conversations.
12. As an employee, I want the list to refresh after I delete a conversation, so that the deleted conversation disappears without a manual reload.
13. As an employee, I want to see only my own conversations, so that my history stays private (enforced by the backend's owner-scoping).

## Solution

The Conversations page becomes a thin composition layer over a new `features/conversations/` module that mirrors the established `features/agents/` module. The module fetches the employee's conversations via `POST /conversation/list` (sorted by `updatedAt` descending), renders them in a table whose right-most column is a delete action, and deletes via `DELETE /conversation/{id}` after a confirmation dialog. Pagination and page-size selection reuse the exact patterns already proven on the Agents page.

### Scope

**In scope (frontend only):**
- New feature module `project/srcs/frontend/src/features/conversations/`.
- Rewrite of `project/srcs/frontend/src/pages/ConversationsPage.tsx` from placeholder to composition.
- Listing (paginated, sorted by last activity), per-row delete with confirmation, empty state, error state, post-delete refresh.

**Explicitly out of scope (per feature interview):**
- Opening / viewing a conversation (no chat/message view exists in the frontend yet). Rows are **not** clickable.
- Creating, renaming, or switching the model of a conversation (those backend endpoints exist but are not part of this feature).
- Any backend change. The Conversation domain is owned by another contributor and is consumed as-is.

### Affected Systems / Modules

- `project/srcs/frontend/src/pages/ConversationsPage.tsx` — rewritten from a static placeholder into a thin composition layer (mirrors `pages/AgentsPage.tsx`).
- `project/srcs/frontend/src/features/conversations/` — **new** feature module (types, service, hooks, components, barrel).
- `project/srcs/frontend/src/types/api.ts` — reused unchanged (`PageableRequest`, `PageEnvelope<T>`).
- Backend `models/conversation/` — **consumed, not modified.** Endpoints used: `POST /conversation/list` (owner-scoped `Page<ConversationListDTO>`, default sort `updatedAt DESC`) and `DELETE /conversation/{id}` (owner-scoped delete, found in `ConversationService.delete` / inherited `DefaultController.delete`).

**No changes required to:** `router.tsx` (the `/conversations` employee-only route already exists), `layouts/Sidebar.tsx` (the "Conversations" item already exists), `layouts/Header.tsx` (`"/conversations": "Conversations"` already in `ROUTE_TITLES`).

### Impact Analysis

- The only behavioral change to existing code is the body of `ConversationsPage.tsx`; everything else is additive. The route, sidebar entry, and header title are untouched.
- No new backend load patterns: `POST /conversation/list` and `DELETE /conversation/{id}` already exist and are exercised by backend tests.
- Bundle size grows by one feature module of the same shape as `features/agents/` (a few small components + hooks); expected to be comparable to the Agents feature's footprint.

### Risk Assessment

- **Irreversible delete with cascade.** Deleting a conversation removes its `MessageEntity` rows via the DB-level `@OnDelete(CASCADE)` on `message.conversation_id`. The confirmation dialog (User Stories 6–7) is the safeguard. Copy must state the action is permanent.
- **Owner-scoping is backend-enforced.** The frontend never sends an owner id; the backend derives the employee from the JWT and scopes both list and delete. The frontend must not attempt to filter by owner itself (it cannot, and `ConversationListDTO` intentionally omits `employeeId`).
- **`ConversationListDTO` shape.** It exposes `id`, `title`, `agentId`, `currentModelId`, `createdAt`, `updatedAt`. The list UI uses `id`, `title`, and `updatedAt`. `agentId` / `currentModelId` are available but unused in this feature.
- **Date rendering.** `createdAt` / `updatedAt` arrive as ISO date-time strings (Jackson-serialized `LocalDateTime`). Rendering must go through `new Date(value)`; format choice (date vs date-time) is a small UX decision deferred to the implementing task.
- **ADR-010 (Base UI, not Radix).** All shadcn primitives used (`Select`, `Tooltip`, `Dialog`, `Table`, `Button`) must follow the project's Base UI conventions already demonstrated in `features/agents/components/` (typed `Select<number>`, `TooltipTrigger render={<button .../>}`, `onValueChange` null guard).

---

## Implementation Architecture

The new module mirrors `features/agents/` but is **read + delete only** — there are no create or edit flows.

### Changes Required

#### 1. `features/conversations/types.ts`
**Purpose:** Type contracts for the conversation list rows and shared pageable types.
**Changes:** Define `ConversationListDTO` (`id: number`, `title: string`, `agentId: number | null`, `currentModelId: number`, `createdAt: string`, `updatedAt: string`) matching the backend `ConversationListDTO`. Re-export `PageableRequest` and `PageEnvelope` from `@/types/api` (same pattern as `features/agents/types.ts`).

#### 2. `features/conversations/services/conversationService.ts`
**Purpose:** HTTP seam to the backend conversation endpoints.
**Changes:** Two standalone async functions:
- `listConversations(request: PageableRequest): Promise<PageEnvelope<ConversationListDTO>>` → `api.post("/conversation/list", request)`.
- `deleteConversation(id: number): Promise<void>` → `await api.delete(`/conversation/${id}`)`. The backend returns the deleted `ConversationDTO`, but the frontend discards the body, so the interface is intentionally `void` — no `ConversationDTO` type is defined in this module (ISP/minimal surface).
Mirrors `services/agentService.ts`. No `/api` prefix (Vite proxy handles it), no error handling here.

#### 3. `features/conversations/hooks/useConversationList.ts`
**Purpose:** Owns pagination state and fetching for the list.
**Changes:** Mirror `useAgentList` exactly, but with `sort: [{ field: "updatedAt", direction: "DESC" }]` (last activity, most recent first). Exposes `conversations`, `totalPages`, `totalElements`, `currentPage`, `isLoading`, `error`, `pageSize` (default 10), `onPageSizeChange` (resets to page 0), `onPageChange`, `refresh`.

#### 4. `features/conversations/hooks/useDeleteConversation.ts`
**Purpose:** Owns the delete-confirmation submission lifecycle.
**Changes:** Lighter than `useDeleteAgent` — **no checkbox guard** (per interview: "Confirmation modal (lighter)"). Exposes `isSubmitting`, `error`, `onConfirm()`. `onConfirm` **early-returns when `isSubmitting` is already true** (double-submit guard — the checkbox in `useDeleteAgent` incidentally prevented re-entrancy; this hook must do it explicitly so a fast double-click cannot fire a second `DELETE` that 404s after success). It then calls `deleteConversation(conversation.id)`, extracts an axios error message on failure, and calls `onSuccess()` on success.

#### 5. `features/conversations/hooks/useConversationModals.ts`
**Purpose:** Owns modal open/close state for the page.
**Changes:** A single concern — "which conversation is pending deletion." Exposes `deleteConversation: ConversationListDTO | null` + `setDeleteConversation`. (Simpler than `useAgentModals`, which also tracks create/edit.)

#### 6. `features/conversations/components/ConversationTable.tsx`
**Purpose:** Render the list as a table with a right-aligned delete action.
**Changes:** Columns: **Title**, **Last activity** (`updatedAt`), **Actions** (delete icon button on the right). The Last activity cell renders `new Date(updatedAt).toLocaleString()` (date **and** time — not the agents table's date-only `toLocaleDateString()`), so the last-activity ordering stays legible when several conversations share a day. Loading overlay during in-flight fetch and empty state ("No conversations found.") mirror `AgentTable`. Receives `conversations`, `isLoading`, `onDeleteClick`. Only a delete `Trash2` action (no edit) — per scope, rows are not clickable and there is no edit.

#### 7. `features/conversations/components/ConversationPagination.tsx`
**Purpose:** Previous / count / Next row.
**Changes:** Verbatim mirror of `AgentPagination` with the "conversation"/"conversations" label and the `Math.max(totalPages, 1)` display guard.

#### 8. `features/conversations/components/ConversationPageSizeBar.tsx`
**Purpose:** Right-aligned rows-per-page selector.
**Changes:** Verbatim mirror of `AgentPageSizeBar` (typed `Select<number>`, 5/10/25/50, `onValueChange` null guard).

#### 9. `features/conversations/components/DeleteConversationModal.tsx`
**Purpose:** Confirmation dialog for delete.
**Changes:** Mirror `DeleteAgentModal` **without** the checkbox guard. Title "Delete Conversation", a `DialogDescription` naming the conversation title and stating the action is permanent, `Cancel` + destructive `Delete` (disabled only while `isSubmitting`), inline error on failure. Consumes `useDeleteConversation`.

#### 10. `features/conversations/index.ts`
**Purpose:** Public barrel.
**Changes:** Export `useConversationList` and the `ConversationListDTO` type (mirror `features/agents/index.ts`). Modal/delete hooks stay internal, consumed only by their components.

#### 11. `pages/ConversationsPage.tsx`
**Purpose:** Thin composition layer.
**Changes:** Replace the placeholder body. Compose `useConversationList()` + `useConversationModals()`, render heading, `ConversationPageSizeBar`, then either `ErrorMessage` or (`ConversationTable` + `ConversationPagination`), plus the conditionally-mounted `DeleteConversationModal`. Mirror `pages/AgentsPage.tsx` minus the create/edit pieces and the "New" button.

The delete modal's `onSuccess` must **step back a page when the last row of a non-first page is removed**, otherwise `refresh()` would re-fetch a now-out-of-range page and show an empty table while earlier pages still hold conversations. Logic: `setDeleteConversation(null); if (conversations.length === 1 && currentPage > 0) onPageChange(currentPage - 1); else refresh();`.

---

## Implementation Steps

### Phase 1: Types & Service (foundational, TDD)
- [x] **Step 1.1:** Create `features/conversations/types.ts` with `ConversationListDTO` and re-exported pageable types. [[Task: Conversation Types & Service (TDD)]]
- [x] **Step 1.2 (RED):** Write `services/conversationService.test.ts` (axios-mock-adapter): `listConversations` POSTs to `/conversation/list`; `deleteConversation` DELETEs `/conversation/{id}`. [[Task: Conversation Types & Service (TDD)]]
- [x] **Step 1.3 (GREEN):** Create `services/conversationService.ts` to pass the tests. [[Task: Conversation Types & Service (TDD)]]

### Phase 2: List Hook (TDD)
- [x] **Step 2.1 (RED):** Write `hooks/useConversationList.test.ts` — initial fetch with `sort: updatedAt DESC`, page change, page-size change resets to page 0, error path, `refresh()`. Mirror `useAgentList.test.ts`. [[Task: Conversation List Hook (TDD)]]
- [x] **Step 2.2 (GREEN):** Create `hooks/useConversationList.ts`. [[Task: Conversation List Hook (TDD)]]

### Phase 3: Delete Hook & Modal State (TDD where logic exists)
- [x] **Step 3.1 (RED):** Write `hooks/useDeleteConversation.test.ts` — `onConfirm` success calls `onSuccess`; failure sets `error` and does not call `onSuccess`. [[Task: Delete Hook & Modal State (TDD)]]
- [x] **Step 3.2 (GREEN):** Create `hooks/useDeleteConversation.ts` (no checkbox guard). [[Task: Delete Hook & Modal State (TDD)]]
- [x] **Step 3.3:** Create `hooks/useConversationModals.ts` (trivial state; no test, mirrors `useAgentModals` convention). [[Task: Delete Hook & Modal State (TDD)]]

### Phase 4: Display Components
- [x] **Step 4.1:** Create `components/ConversationTable.tsx` (Title / Last activity / Actions-delete, loading overlay, empty state). [[Task: Display Components & Barrel]]
- [x] **Step 4.2:** Create `components/ConversationPagination.tsx`. [[Task: Display Components & Barrel]]
- [x] **Step 4.3:** Create `components/ConversationPageSizeBar.tsx`. [[Task: Display Components & Barrel]]
- [x] **Step 4.4:** Create `components/DeleteConversationModal.tsx` (lighter confirm, no checkbox). [[Task: Display Components & Barrel]]
- [x] **Step 4.5:** Create `index.ts` barrel. [[Task: Display Components & Barrel]]

### Phase 5: Page Wiring & Validation
- [ ] **Step 5.1:** Rewrite `pages/ConversationsPage.tsx` as the composition layer, including the delete `onSuccess` empty-page step-back guard (`conversations.length === 1 && currentPage > 0 ? onPageChange(currentPage - 1) : refresh()`).
- [ ] **Step 5.2 (seed first):** Seed 2–3 conversations so the page has data to validate — the frontend has no conversation-creation UI yet. Either `POST /conversation` via a REST client with a body like `{ "modelId": <id of an ENABLED LlmModel>, "agentId": null, "title": "Test conversation" }` (repeat 2–3 times; vary timing so `updatedAt` differs), or insert rows via Adminer. `modelId` **must** reference an enabled model or insert returns 404; `agentId` is optional and may be null.
- [ ] **Step 5.3:** Manual browser validation: list renders sorted by last activity (newest first, time-of-day legible), delete confirm + cancel, post-delete refresh, **delete the last row on page ≥2 and confirm the view steps back instead of going blank**, pagination, page size, empty state (after deleting all), error state.

---

## Potential Issues / Risks

- **Empty `totalPages`.** When the employee has no conversations the backend returns `totalPages: 0`; the pagination guard (`Math.max(totalPages, 1)`) must show "Page 1 of 1" (same as agents).
- **Date-time string parsing.** `updatedAt` is an ISO `LocalDateTime` string; render via `new Date(updatedAt)`. **Decided:** the Last activity column uses `toLocaleString()` (date + time) rather than date-only, because ordering is by activity and date-only would hide intra-day order.
- **Cascade delete is permanent.** Confirmed acceptable; the confirmation dialog copy must say so explicitly.
- **Empty page after deleting the last row of a non-first page.** `refresh()` re-fetches the current page index, which can be out of range after a delete shrinks `totalPages`. Mitigated by the page-level step-back guard in the delete `onSuccess` (see `ConversationsPage` change above).
- **Double-submit on delete.** Without the checkbox guard, a fast double-click could fire two `DELETE`s; the `isSubmitting` early-return in `useDeleteConversation.onConfirm` prevents the second request.
- **Test cleanup / `screen` leakage.** Component tests in this project lack a global RTL cleanup (`vitest.config.ts` has no `setupFiles`); any new component test must scope queries (e.g., via `container`) as done elsewhere — though, per the agents convention, display components get no unit tests (logic lives in tested hooks).
- **Base UI deselect null.** The page-size `Select<number>` `onValueChange` must null-guard, matching `AgentPageSizeBar`.

---

## Testing Decisions

**What makes a good test here:** assert externally observable behavior across the module's seams — the HTTP request shape (URL, method, body) at the service seam, and the state transitions (loading, data, error, page) at the hook seam — not internal implementation details. Tests should survive an internal refactor that preserves behavior.

**Modules tested:**
- `services/conversationService.ts` — `axios-mock-adapter` verifies `POST /conversation/list` (with the request body passed through) and `DELETE /conversation/{id}` (resolves to `void`; the response body is not asserted because it is discarded).
- `hooks/useConversationList.ts` — `renderHook` + `act`: initial fetch issues `sort: [{ field: "updatedAt", direction: "DESC" }]`; `onPageChange` / `onPageSizeChange` (resets to page 0) re-fetch; error path sets `error` and clears it at the start of the next fetch; `refresh()` re-fetches the current page.
- `hooks/useDeleteConversation.ts` — `onConfirm` success calls `onSuccess`; failure sets `error` from the axios message and leaves `onSuccess` uncalled; **a second `onConfirm` while `isSubmitting` is true is a no-op (double-submit guard) — assert the service is called only once.**

**Not unit-tested (composition only, no logic — matches the agents convention):** `ConversationTable`, `ConversationPagination`, `ConversationPageSizeBar`, `DeleteConversationModal`, `useConversationModals`, and `ConversationsPage`. These are validated by the Phase 5 manual browser walkthrough.

**Prior art (mirror directly):**
- `project/srcs/frontend/src/features/agents/services/agentService.test.ts`
- `project/srcs/frontend/src/features/agents/hooks/useAgentList.test.ts`
- `project/srcs/frontend/src/features/agents/hooks/useDeleteAgent.test.ts`

---

## Task Breakdown

### Task 1: Conversation types & service (TDD)
- **Steps Covered:** Step 1.1, Step 1.2, Step 1.3
- **Reason for Grouping:** Tight, closely related boilerplate foundation (types + HTTP seam) that everything else depends on; low complexity, naturally one red-green cycle.
- **Planned Task File:** `Conversation-History-List-and-Delete-task-1-types-and-service.md`
- **Task Document Link:** [Add when the task document is created]

### Task 2: Conversation list hook (TDD)
- **Steps Covered:** Step 2.1, Step 2.2
- **Reason for Grouping:** Single deep module (pagination + fetch + sort-by-last-activity) with its own focused test suite.
- **Planned Task File:** `Conversation-History-List-and-Delete-task-2-list-hook.md`
- **Task Document Link:** [Add when the task document is created]

### Task 3: Delete hook & modal state (TDD)
- **Steps Covered:** Step 3.1, Step 3.2, Step 3.3
- **Reason for Grouping:** The delete lifecycle hook (tested) plus the trivial modal-state hook are small and closely related to the delete flow.
- **Planned Task File:** `Conversation-History-List-and-Delete-task-3-delete-hook-and-modal-state.md`
- **Task Document Link:** [Add when the task document is created]

### Task 4: Display components & barrel
- **Steps Covered:** Step 4.1, Step 4.2, Step 4.3, Step 4.4, Step 4.5
- **Reason for Grouping:** Stateless presentational components that all mirror existing agents components; no business logic, executed together.
- **Planned Task File:** `Conversation-History-List-and-Delete-task-4-display-components.md`
- **Task Document Link:** [[Tasks/current/Conversation-History-List-and-Delete-step-4-display-components]]

### Task 5: Page wiring & validation
- **Steps Covered:** Step 5.1, Step 5.2
- **Reason for Grouping:** Final composition of the page and the manual browser validation that proves the end-to-end behavior.
- **Planned Task File:** `Conversation-History-List-and-Delete-task-5-page-wiring-and-validation.md`
- **Task Document Link:** [[Tasks/current/Conversation-History-List-and-Delete-step-5-page-wiring-and-validation]]
