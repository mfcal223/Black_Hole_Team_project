# Task: Page Wiring & Validation

#task #current #low-complexity #parent-conversation-history-list-and-delete

**Parent:** [[Features/to-do/Conversation-History-List-and-Delete]]
**Parent Type:** Feature
**Related Step(s):** Phase 5 — Step 5.1, Step 5.2, Step 5.3
**Estimated Complexity:** Low
**Depends On:** Task 1 (types & service), Task 2 (list hook), Task 3 (delete hook & modal state), Task 4 (display components & barrel)

---

## Goal

Rewrite `pages/ConversationsPage.tsx` from a static placeholder into the thin composition layer that wires together the `features/conversations/` module (list hook, modal state, delete hook, and the four display components from Task 4), then seed sample data and validate the end-to-end behavior in the browser. This is the final task of the feature — after it, the Conversations page renders a real, paginated, deletable history.

---

## Parent Context

Per the feature's Implementation Architecture (#11) and Phase 5, the page composes `useConversationList()` + `useConversationModals()`, renders the heading, `ConversationPageSizeBar`, then either `ErrorMessage` or (`ConversationTable` + `ConversationPagination`), plus the delete confirmation modal. It must include the **empty-page step-back guard** in the delete `onSuccess`: when the last row of a non-first page is removed, step back one page instead of `refresh()`-ing an out-of-range page index that would render blank.

The feature mandates no changes to `router.tsx`, `Sidebar.tsx`, or `Header.tsx` — the `/conversations` employee-only route, sidebar item, and header title already exist.

### ⚠️ Deviation from the feature plan introduced by Task 4

The feature plan (#9) specified that `DeleteConversationModal` would **consume `useDeleteConversation` internally** (like `DeleteAgentModal` consumes `useDeleteAgent`). The **executed** Task 4 modal is instead **purely presentational** — it receives `conversation`, `isSubmitting`, `error`, `onCancel`, and `onConfirm` as props and does **not** call the hook. <!-- This is the as-built reality on disk; Task 5 wires to it, not to the original plan. -->

Consequence for this task: the page must call `useDeleteConversation(conversation, onSuccess)` itself. Because that hook requires a **non-null** `ConversationListDTO` and React's Rules of Hooks forbid calling it conditionally, the hook is invoked inside a small **conditionally-mounted page-local controller component** (`ConversationDeleteController`). This mirrors how `AgentsPage` conditionally mounts `{deleteAgent && <DeleteAgentModal … />}`, with the controller standing in for the hook-consuming wrapper the agents modal does internally.

---

## Preconditions / Dependencies

- **Tasks 1–4 complete and on disk.** Verified executed signatures this task wires to:
  - `useConversationList()` → `{ conversations, totalPages, totalElements, currentPage, isLoading, error, pageSize, onPageSizeChange, onPageChange, refresh }`.
  - `useConversationModals()` → `{ deleteConversation, setDeleteConversation }`.
  - `useDeleteConversation(conversation: ConversationListDTO, onSuccess: () => void)` → `{ isSubmitting, error, onConfirm }`.
  - `ConversationTable` props: `{ conversations, isLoading, onDeleteClick }`.
  - `ConversationPagination` props: `{ currentPage, totalPages, totalElements, onPageChange }` — **note: no `isLoading` prop** (executed signature differs from `AgentPagination`).
  - `ConversationPageSizeBar` props: `{ pageSize, onPageSizeChange }`.
  - `DeleteConversationModal` props: `{ conversation: ConversationListDTO | null, isSubmitting, error, onCancel, onConfirm }` — presentational (see deviation above).
  - Barrel `features/conversations/index.ts` exports `useConversationList` and the `ConversationListDTO` type.
- **Backend running** (`make up`) for seeding and browser validation; the `/conversation` endpoints require `ROLE_EMPLOYEE` (JWT).
- **At least one enabled `LlmModel`** must exist — `POST /conversation` returns 404 if `modelId` is missing/disabled (see [[Docs/API-Reference/Conversation]]).
- **Route / sidebar / header already wired** — confirm (do not modify): `/conversations` route in `router.tsx`, the "Conversations" sidebar item, and `"/conversations": "Conversations"` in `Header.tsx` `ROUTE_TITLES`.
- **Reference implementation:** `project/srcs/frontend/src/pages/AgentsPage.tsx` (mirror, minus create/edit and the "New" button).

---

## Skills and Documentation Preparation

### Skills Reviewed

- `solid-deep-design` — **Selected** — the page is a thin composition layer (no business logic); state lives in the hooks. The `ConversationDeleteController` keeps the hook call in the only place a non-null conversation is guaranteed.
- `react-best-practices` — **Selected (advisory)** — confirm conditional mounting and the step-back guard do not introduce stale-closure or extra-render issues.
- `verify` / `run` — **Selected** — Step 5.3 is a manual browser walkthrough; use the project's run flow (`make up`, `https://localhost`).
- `tdd` — **Reviewed, not applied** — per the parent's Testing Decisions, `ConversationsPage` is composition-only and gets no unit test; behavior is proven by the Phase 5 manual walkthrough and the already-tested hooks.

### Documentation Reviewed

- [[Docs/API-Reference/Conversation]] — `POST /conversation` (seed), `POST /conversation/list`, `DELETE /conversation/{id}`.
- [[ADRs/ADR-010-base-ui-over-radix-ui-for-frontend]] — Base UI conventions (already satisfied by Task 4 components).
- Parent feature #11 and Phase 5.

### Related Existing Code

- `src/pages/AgentsPage.tsx` — composition layer to mirror (minus create/edit).
- `src/pages/ConversationsPage.tsx` — the placeholder to replace.
- `src/components/common/ErrorMessage.tsx` — `{ message }` prop; replaces the table/pagination area on error.
- `src/features/conversations/` — all module files from Tasks 1–4.

---

## Implementation Details

### Approach

Replace the placeholder body of `ConversationsPage.tsx` with the composition described in the feature, mirroring `AgentsPage` minus create/edit. Two specifics drive the design:

1. **Step-back guard (`handleDeleted`)** — after a successful delete: `setDeleteConversation(null)`; if the deleted row was the **only** row on a **non-first** page (`conversations.length === 1 && currentPage > 0`), call `onPageChange(currentPage - 1)`; otherwise `refresh()`. This avoids re-fetching an out-of-range page that would show an empty table while earlier pages still hold conversations.
2. **`ConversationDeleteController`** — a small page-local component, conditionally mounted only when a conversation is pending deletion. It calls `useDeleteConversation(conversation, onDeleted)` (non-null guaranteed by the conditional mount) and feeds the result into the presentational `DeleteConversationModal`. Defined in the same file (no new module file) to keep the change surgical and within "page wiring" scope.

### Files to Create/Modify

- [ ] `src/pages/ConversationsPage.tsx` — **rewrite** placeholder → composition layer (includes the local `ConversationDeleteController`).

(No changes to `router.tsx`, `Sidebar.tsx`, `Header.tsx`, or any `features/conversations/` file.)

---

## Step-by-Step Implementation

### Step 5.1: Rewrite `ConversationsPage.tsx`

**Goal:** Compose the module into a working page with the step-back guard.
**Dependencies:** Tasks 1–4.

- [ ] Replace the entire body of `src/pages/ConversationsPage.tsx`.
- [ ] Mirror `AgentsPage` structure: heading, page-size bar (always mounted so the user can retry after an error), then error state **or** table + pagination, then the conditionally-mounted delete controller.
- [ ] **Do not** add a "New" button, create modal, or edit modal (out of scope).
- [ ] **Do not** pass `isLoading` to `ConversationPagination` (its executed signature has no such prop).
- [ ] Implement `handleDeleted` with the step-back guard.

#### Implementation

```tsx
// src/pages/ConversationsPage.tsx

import { useConversationList } from "@/features/conversations"
import type { ConversationListDTO } from "@/features/conversations"
import { useConversationModals } from "@/features/conversations/hooks/useConversationModals"
import { useDeleteConversation } from "@/features/conversations/hooks/useDeleteConversation"
import { ConversationTable } from "@/features/conversations/components/ConversationTable"
import { ConversationPageSizeBar } from "@/features/conversations/components/ConversationPageSizeBar"
import { ConversationPagination } from "@/features/conversations/components/ConversationPagination"
import { DeleteConversationModal } from "@/features/conversations/components/DeleteConversationModal"
import { ErrorMessage } from "@/components/common/ErrorMessage"

export function ConversationsPage() {
  const {
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
  } = useConversationList()

  const { deleteConversation, setDeleteConversation } = useConversationModals()

  // After a successful delete: if we just removed the only row of a non-first
  // page, step back one page (refresh() would re-fetch a now out-of-range
  // index and render blank). Otherwise re-fetch the current page.
  function handleDeleted() {
    setDeleteConversation(null)
    if (conversations.length === 1 && currentPage > 0) {
      onPageChange(currentPage - 1)
    } else {
      refresh()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Conversations</h1>
        <p className="text-muted-foreground">Your conversation history.</p>
      </div>

      {/* Always mounted so the user can change page size / retry after an error */}
      <ConversationPageSizeBar pageSize={pageSize} onPageSizeChange={onPageSizeChange} />

      {error ? (
        <ErrorMessage message={error} />
      ) : (
        <>
          <ConversationTable
            conversations={conversations}
            isLoading={isLoading}
            onDeleteClick={setDeleteConversation}
          />
          <ConversationPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalElements={totalElements}
            onPageChange={onPageChange}
          />
        </>
      )}

      {/* Conditionally mounted so useDeleteConversation receives a non-null
          conversation (Rules of Hooks). Mirrors AgentsPage's
          {deleteAgent && <DeleteAgentModal …/>} pattern. */}
      {deleteConversation && (
        <ConversationDeleteController
          conversation={deleteConversation}
          onCancel={() => setDeleteConversation(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  )
}

// Page-local wrapper: the executed DeleteConversationModal is presentational
// (it does not consume useDeleteConversation), so the hook is called here,
// where the conditional mount guarantees a non-null conversation.
interface ConversationDeleteControllerProps {
  conversation: ConversationListDTO
  onCancel: () => void
  onDeleted: () => void
}

function ConversationDeleteController({
  conversation,
  onCancel,
  onDeleted,
}: ConversationDeleteControllerProps) {
  const { isSubmitting, error, onConfirm } = useDeleteConversation(conversation, onDeleted)

  return (
    <DeleteConversationModal
      conversation={conversation}
      isSubmitting={isSubmitting}
      error={error}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  )
}
```

---

### Step 5.2 (seed first): Seed sample conversations

**Goal:** Give the page real data to validate — the frontend has no conversation-creation UI yet.
**Dependencies:** Backend running; at least one enabled `LlmModel`.

- [ ] Find an **enabled** model id: call `GET /llm-model` with an **admin** JWT (all `/llm-model/**` endpoints are `ROLE_ADMIN`) — it returns `LlmModelDTO[]`; pick any entry with `"isEnabled": true` and use its `id`. <!-- REVIEW-FIX: corrected the endpoint (GET /llm-model, admin-only, returns isEnabled) — the previous text referenced a non-existent "/llm-model/list" admin endpoint --> Alternatively (no admin token needed), read the `llm_model` table in Adminer (`https://localhost/adminer/`) and use the `id` of a row with `is_enabled = true`.
- [ ] Create 2–3 conversations via `POST /conversation` with an employee JWT (`Authorization: Bearer <token>`), body per [[Docs/API-Reference/Conversation]]:
  ```json
  { "modelId": <enabled-model-id>, "agentId": null, "title": "Test conversation 1" }
  ```
  Repeat with different titles. **Vary the timing between requests** (a few seconds apart) so `updatedAt` differs and the last-activity ordering is observable. `agentId` may be `null`.
- [ ] Alternatively, insert rows directly via Adminer into the `conversation` table (ensure `current_model_id` references an enabled model and `employee_id` is the logged-in employee).
- [ ] Seed **enough rows to exceed one page** at the smallest page size (≥6 rows lets you test pagination at size 5 and the step-back guard on page 2).

> `modelId` **must** reference an enabled model or `POST /conversation` returns 404. `title` defaults to `"New Conversation"` if blank.

---

### Step 5.3: Manual browser validation

**Goal:** Prove end-to-end behavior in the real app.
**Dependencies:** Steps 5.1 and 5.2.

- [ ] `make up` (or ensure the stack is running); log in as the employee who owns the seeded conversations; navigate to `https://localhost/conversations`.

See **Manual Validation** under Testing Considerations for the full checklist.

---

## Edge Cases

- **Delete last row on a non-first page:** `handleDeleted` steps back to `currentPage - 1` instead of `refresh()`, preventing a blank table. (The primary risk this task must get right.)
- **Delete last remaining conversation overall:** `conversations.length === 1 && currentPage === 0` → falls to `refresh()`, which re-fetches page 0 and renders the empty state ("No conversations found.") with pagination showing "Page 1 of 1".
- **Empty `totalPages` (no conversations):** `ConversationPagination` guards with `Math.max(totalPages, 1)`; the empty list shows "No conversations" text and disabled prev/next.
- **List load failure:** `error` is truthy → `ErrorMessage` replaces the table + pagination; the page-size bar stays mounted so the user can trigger a re-fetch by changing page size.
- **Delete failure:** `useDeleteConversation` sets `error`; the modal stays open showing the inline error and re-enables the Delete button (`isSubmitting` back to false). `onCancel` closes it.
- **Double-click Delete:** handled by `useDeleteConversation`'s `isSubmitting` early-return (Task 3); the page needs no extra guard.
- **Dialog dismissed mid-submit (ESC / overlay click):** the executed modal's `Cancel` button is `disabled` while `isSubmitting`, but the Base UI `Dialog` can still close via ESC or overlay click, firing `onCancel` → `setDeleteConversation(null)` → the controller unmounts before the in-flight `onConfirm` resolves. <!-- REVIEW-FIX: documented the mid-submit dismiss path so it is not mistaken for a bug during validation --> This is benign: the awaiting delete still completes server-side, and `onSuccess` (`handleDeleted`) runs on the still-mounted **page**, so the list refreshes correctly. React 18 does not warn about the hook's post-unmount `setIsSubmitting`. No guard is added here (closing the dialog mid-delete is acceptable; the row is removed either way).
- **Stale closure in `handleDeleted`:** `conversations.length`/`currentPage` are read from the render that mounted the controller; because the controller remounts whenever `deleteConversation` changes and the page re-renders on every list state change, the values are current at delete time. No `useCallback`/ref needed.
- **`onDeleteClick={setDeleteConversation}` typing:** `setDeleteConversation` accepts `ConversationListDTO | null`; it is assignable to `onDeleteClick: (c: ConversationListDTO) => void` (contravariant parameter). Mirrors `AgentsPage`'s `onDeleteClick={setDeleteAgent}`.

---

## Design Decisions

**Decision 1:** Wire to the as-built presentational modal via a page-local `ConversationDeleteController`, rather than refactoring `DeleteConversationModal` to consume the hook.
- **Why:** Task 4 is already executed and tested. Wiring to reality is lower-risk and surgical; the controller is the standard React idiom for "a hook that needs a value only available conditionally."
- **Alternatives considered:** (a) Refactor the modal to consume `useDeleteConversation` (matches the original feature plan #9) — rejected to avoid re-touching a completed, tested task and re-running its review. (b) Call the hook unconditionally in the page with a placeholder conversation — rejected; violates the hook's non-null contract and is a code smell.

**Decision 2:** Step-back guard lives in the page's `handleDeleted`, passed as the delete hook's `onSuccess`.
- **Why:** Pagination state (`conversations`, `currentPage`, `onPageChange`, `refresh`) lives in `useConversationList`, owned by the page. The guard belongs where that state is.

**Decision 3:** `ConversationsPage` gets no unit test.
- **Why:** Composition-only, no business logic; matches the agents convention. Validated by the manual walkthrough and the already-tested hooks.

**Decision 4:** Define `ConversationDeleteController` inside `ConversationsPage.tsx`, not as a new `features/` file.
- **Why:** It is page-specific wiring glue, not reusable module surface. Keeping it local avoids growing the module's public/file footprint for a one-use wrapper.

---

## Testing Considerations

> **Note on the test command:** Always append `-- run` for a single, non-blocking pass.

This task adds **no new automated tests** (`ConversationsPage` is composition-only). The existing module tests from Tasks 1–3 must continue to pass.

### Automatic Validation

- [ ] `npm --prefix project/srcs/frontend run typecheck` — 0 errors (all component prop shapes line up with the executed signatures; `ConversationDeleteController` props resolve).
- [ ] `cd project/srcs/frontend && npx eslint src/pages/ConversationsPage.tsx` — clean (no unused imports; note that `ConversationPagination` is imported without `isLoading`).
- [ ] `npm --prefix project/srcs/frontend run test -- run` — full suite green with **no regressions**; the count must be **identical to the post-Task-4 baseline** (this task adds no test files).
- [ ] `npm --prefix project/srcs/frontend run build` — succeeds.

### Manual Validation

> **Manual validation required.** Perform these in the browser at `https://localhost/conversations` after seeding (Step 5.2):

- [ ] The list renders the seeded conversations, **newest last-activity first** (sorted by `updatedAt DESC`).
- [ ] The **Last Activity** column shows date **and** time, so same-day rows are still ordered legibly.
- [ ] Clicking the row's **delete** (trash) icon opens the confirmation dialog naming the conversation title and stating the action is permanent.
- [ ] **Cancel** closes the dialog with no deletion.
- [ ] **Delete** removes the conversation; the list refreshes automatically (deleted row gone, no manual reload).
- [ ] **Step-back guard:** at page size 5 with ≥6 conversations, go to **page 2**, delete its **only/last** row, and confirm the view **steps back to page 1** instead of showing a blank table.
- [ ] Pagination **Previous/Next** work and are disabled at the first/last page.
- [ ] Changing **Rows per page** (5/10/25/50) re-fetches from page 1.
- [ ] **Empty state:** after deleting all conversations, the table shows "No conversations found." and pagination shows "No conversations".
- [ ] **Error state:** simulate a list failure (e.g., stop the backend, then change page size to force a fetch) and confirm `ErrorMessage` replaces the table while the page-size bar stays usable.

---

## Related Code Explanations

- `src/pages/AgentsPage.tsx` — the composition pattern this page mirrors (minus create/edit, "New" button, and with no `isLoading` on pagination).
- `src/features/conversations/hooks/useConversationList.ts` — list/pagination state + `refresh()`.
- `src/features/conversations/hooks/useConversationModals.ts` — `deleteConversation` / `setDeleteConversation`.
- `src/features/conversations/hooks/useDeleteConversation.ts` — delete lifecycle + double-submit guard (consumed by the controller).
- `src/features/conversations/components/DeleteConversationModal.tsx` — presentational confirm dialog (props-driven).
- `src/components/common/ErrorMessage.tsx` — error state.
- [[Docs/API-Reference/Conversation]] — endpoints used for seeding and runtime.

---

## Completion Criteria

- [x] Parent feature reviewed; Task 4 as-built signatures reconciled (presentational modal, `ConversationPagination` without `isLoading`).
- [x] `solid-deep-design` and `react-best-practices` skills reviewed and applied.
- [x] `src/pages/ConversationsPage.tsx` rewritten as the composition layer, including the `ConversationDeleteController` wrapper and the `handleDeleted` step-back guard.
- [x] No changes made to `router.tsx`, `Sidebar.tsx`, `Header.tsx`, or any `features/conversations/` file.
- [x] `npm run typecheck`, `eslint` on the page, `npm run test -- run`, and `npm run build` all clean with no regressions.
- [x] Sample conversations seeded (Step 5.2).
- [x] All Manual Validation checkboxes confirmed in the browser — **especially the step-back guard on page ≥2**.
- [x] Parent feature Phase 5 Steps 5.1–5.3 marked complete, the Task 5 wiki link added, and the feature moved to `done` once validated.

---

## Completion Summary

**Completed:** 2026-06-30

### Manual Validation Results
- ✅ Step-back guard: Page 2 deletion of last row correctly steps back to Page 1
- ✅ Pagination: Previous/Next work correctly at first/last page boundaries
- ✅ Page size changes: Changing "Rows per page" re-fetches from Page 1
- ✅ Empty state: "No conversations found." displays after deleting all rows
- ✅ Last Activity column: Displays both date and time for clear ordering

### All Tasks Complete
- Task 1: Types & service ✅
- Task 2: List hook ✅
- Task 3: Delete hook & modal state ✅
- Task 4: Display components & barrel ✅
- Task 5: Page wiring & validation ✅
