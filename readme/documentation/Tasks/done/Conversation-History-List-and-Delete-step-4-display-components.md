# Task: Display Components & Barrel

#task #current #low-complexity #parent-conversation-history-list-and-delete

**Parent:** [[Features/to-do/Conversation-History-List-and-Delete]]
**Parent Type:** Feature
**Related Step(s):** Phase 4 — Step 4.1, Step 4.2, Step 4.3, Step 4.4, Step 4.5
**Estimated Complexity:** Low
**Depends On:** Task 1 (types & service), Task 2 (list hook), Task 3 (delete hook & modal state)

---

## Goal

Create the four stateless presentational components and the public barrel for the `features/conversations/` module: `ConversationTable`, `ConversationPagination`, `ConversationPageSizeBar`, `DeleteConversationModal`, and `index.ts`. These components mirror the proven `features/agents/` components but are **read + delete only** — no create/edit. They carry no business logic; all state lives in the hooks built in Tasks 2–3.

---

## Parent Context

The Conversations page lists the employee's conversations in a table whose right-most column is a delete action, with pagination and a rows-per-page selector. Per the feature's Implementation Architecture (sections #6–#10), the display layer is a set of stateless components that mirror `features/agents/components/` with three deliberate differences:

1. **No edit action** — rows expose only a `Trash2` delete button (scope: rows are not clickable, there is no edit flow).
2. **Date + time** — the "Last activity" cell renders `new Date(updatedAt).toLocaleString()` (date **and** time), not the agents table's date-only `toLocaleDateString()`, so last-activity ordering stays legible when several conversations share a day.
3. **Lighter delete modal** — `DeleteConversationModal` has **no checkbox guard** (the double-submit guard lives in `useDeleteConversation` from Task 3). The destructive button is disabled only while `isSubmitting`.

The barrel (#10) exports only `useConversationList` and the `ConversationListDTO` type — modal/delete hooks stay internal, consumed only by their components.

---

## Preconditions / Dependencies

- **Task 1 complete:** `features/conversations/types.ts` (`ConversationListDTO`) and `services/conversationService.ts`.
- **Task 2 complete:** `hooks/useConversationList.ts` — provides `conversations`, `isLoading`, pagination state, and `refresh()`.
- **Task 3 complete:** `hooks/useDeleteConversation.ts` (consumed by `DeleteConversationModal`) and `hooks/useConversationModals.ts`.
- **Reference implementations exist (mirror directly):**
  - `project/srcs/frontend/src/features/agents/components/AgentTable.tsx`
  - `project/srcs/frontend/src/features/agents/components/AgentPagination.tsx`
  - `project/srcs/frontend/src/features/agents/components/AgentPageSizeBar.tsx`
  - `project/srcs/frontend/src/features/agents/components/DeleteAgentModal.tsx`
  - `project/srcs/frontend/src/features/agents/index.ts`
- **Shared UI primitives available:** `@/components/ui/{table,tooltip,button,select,dialog,label}` and `@/components/common/LoadingSpinner`.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `solid-deep-design` — **Selected** — these are thin, single-responsibility presentational components with minimal prop surfaces (ISP); each receives exactly the values it renders.
- `shadcn-component-review` — **Selected (advisory)** — confirm the Base UI conventions (ADR-010) used in the agents components are mirrored exactly.
- `tdd` — **Reviewed, not applied** — per the parent's Testing Decisions and the agents convention, display components get no unit tests (logic lives in already-tested hooks). Validation is the Phase 5 manual browser walkthrough (Task 5).

### Documentation Reviewed

- In-repo prior art: the four `features/agents/components/` files above and `features/agents/index.ts`.
- [[ADRs/ADR-010-base-ui-over-radix-ui-for-frontend]] — all shadcn primitives use Base UI conventions: typed `Select<number>`, `TooltipTrigger render={<button .../>}`, `onValueChange` null guard.
- Parent feature sections #6–#10 and Phase 4.

### Related Existing Code

- `src/features/agents/components/AgentTable.tsx` — table + loading overlay + empty state (mirror; drop the edit action, change date format).
- `src/features/agents/components/AgentPagination.tsx` — Previous / count / Next (mirror; swap label to "conversation"/"conversations").
- `src/features/agents/components/AgentPageSizeBar.tsx` — rows-per-page `Select<number>` (verbatim mirror).
- `src/features/agents/components/DeleteAgentModal.tsx` — confirm dialog (mirror; remove checkbox).
- `src/features/agents/index.ts` — barrel shape.
- `src/features/conversations/types.ts` — `ConversationListDTO` (Task 1).
- `src/features/conversations/hooks/useDeleteConversation.ts` — consumed by the modal (Task 3).
- `src/features/conversations/hooks/useConversationList.ts` — exported from the barrel (Task 2).

---

## Implementation Details

### Approach

Four presentational components + one barrel. Each mirrors its agents counterpart and owns zero state beyond the shadcn primitives it composes. Props are the minimal set each component renders.

- **`ConversationTable`** — 3 columns: **Title**, **Last activity**, **Actions** (delete only). Loading overlay during in-flight fetch; empty state "No conversations found." Props: `conversations`, `isLoading`, `onDeleteClick`.
- **`ConversationPagination`** — verbatim mirror of `AgentPagination` with the "conversation"/"conversations" label and the `Math.max(totalPages, 1)` display guard.
- **`ConversationPageSizeBar`** — verbatim mirror of `AgentPageSizeBar` (typed `Select<number>`, 5/10/25/50, `onValueChange` null guard).
- **`DeleteConversationModal`** — mirror of `DeleteAgentModal` **without** the checkbox; consumes `useDeleteConversation`; destructive `Delete` disabled only while `isSubmitting`.
- **`index.ts`** — export `useConversationList` and the `ConversationListDTO` type.

### Files to Create/Modify

- [ ] `src/features/conversations/components/ConversationTable.tsx` — table (Title / Last activity / Actions-delete).
- [ ] `src/features/conversations/components/ConversationPagination.tsx` — Previous / count / Next.
- [ ] `src/features/conversations/components/ConversationPageSizeBar.tsx` — rows-per-page selector.
- [ ] `src/features/conversations/components/DeleteConversationModal.tsx` — lighter confirm dialog (no checkbox).
- [ ] `src/features/conversations/index.ts` — public barrel.

---

## Step-by-Step Implementation

### Step 4.1: Create `ConversationTable.tsx`

**Goal:** Render the conversation list as a 3-column table with a right-aligned delete action, a loading overlay, and an empty state.
**Dependencies:** Task 1 types, Task 2 (`conversations`, `isLoading`).

- [ ] Create `src/features/conversations/components/ConversationTable.tsx`.
- [ ] Mirror `AgentTable`, removing the edit action and the Description column.
- [ ] Columns: **Title** (`font-medium`), **Last activity** (`new Date(updatedAt).toLocaleString()`), **Actions** (delete `Trash2` only). `colSpan={3}` on the empty-state row.

#### Implementation

```tsx
// src/features/conversations/components/ConversationTable.tsx

import { Trash2 } from "lucide-react"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import type { ConversationListDTO } from "../types"

interface ConversationTableProps {
  conversations: ConversationListDTO[]
  isLoading: boolean
  onDeleteClick: (conversation: ConversationListDTO) => void
}

// One responsibility: render the conversation list as a 3-column table
// (Title, Last activity, Actions) with a loading overlay during in-flight
// fetches. Owns no state — receives conversations and emits a row-level
// delete callback. No edit action (rows are not clickable; scope is read +
// delete only). Last activity uses toLocaleString() (date + time) so
// activity ordering stays legible when several conversations share a day.
export function ConversationTable({
  conversations,
  isLoading,
  onDeleteClick,
}: ConversationTableProps) {
  return (
    <div className="relative">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Last activity</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {conversations.length === 0 && !isLoading ? (
            <TableRow>
              <TableCell
                colSpan={3}
                className="py-8 text-center text-muted-foreground"
              >
                No conversations found.
              </TableCell>
            </TableRow>
          ) : (
            conversations.map((conversation) => (
              <TableRow key={conversation.id}>
                <TableCell className="font-medium">{conversation.title}</TableCell>
                <TableCell>
                  {new Date(conversation.updatedAt).toLocaleString()}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <button
                            type="button"
                            className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
                            onClick={() => onDeleteClick(conversation)}
                            aria-label="Delete conversation"
                          />
                        }
                      >
                        <Trash2 className="size-4" />
                      </TooltipTrigger>
                      <TooltipContent>Delete conversation</TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden bg-background/60 backdrop-blur-[1px]">
          <LoadingSpinner />
        </div>
      )}
    </div>
  )
}
```

---

### Step 4.2: Create `ConversationPagination.tsx`

**Goal:** Render the Previous / count / Next pagination row.
**Dependencies:** Task 2 pagination state.

- [ ] Create `src/features/conversations/components/ConversationPagination.tsx`.
- [ ] Verbatim mirror of `AgentPagination`; change only the singular/plural label to "conversation"/"conversations".

#### Implementation

```tsx
// src/features/conversations/components/ConversationPagination.tsx

import { Button } from "@/components/ui/button"

interface ConversationPaginationProps {
  currentPage: number
  totalPages: number
  totalElements: number
  isLoading: boolean
  onPageChange: (page: number) => void
}

// One responsibility: render the Previous / count / Next pagination row for
// the conversations list. Encapsulates the page-count guard
// (Math.max(totalPages, 1)), the singular/plural label, and the Previous/Next
// disabled conditions. Receives exactly the 5 values it renders.
export function ConversationPagination({
  currentPage,
  totalPages,
  totalElements,
  isLoading,
  onPageChange,
}: ConversationPaginationProps) {
  // Display-only guard: when the list is empty the backend returns
  // totalPages: 0. Show "Page 1 of 1" instead of "Page 1 of 0".
  const displayTotal = Math.max(totalPages, 1)
  const label = totalElements === 1 ? "conversation" : "conversations"

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        {totalElements} {label}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0 || isLoading}
        >
          Previous
        </Button>
        <span className="text-sm">
          Page {currentPage + 1} of {displayTotal}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages - 1 || isLoading}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
```

---

### Step 4.3: Create `ConversationPageSizeBar.tsx`

**Goal:** Render the right-aligned rows-per-page selector.
**Dependencies:** Task 2 (`pageSize`, `onPageSizeChange`).

- [ ] Create `src/features/conversations/components/ConversationPageSizeBar.tsx`.
- [ ] Verbatim mirror of `AgentPageSizeBar` (typed `Select<number>`, 5/10/25/50, `onValueChange` null guard per ADR-010).

#### Implementation

```tsx
// src/features/conversations/components/ConversationPageSizeBar.tsx

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

interface ConversationPageSizeBarProps {
  pageSize: number
  onPageSizeChange: (size: number) => void
}

// One responsibility: render the right-aligned page-size selector for the
// conversations list. Pairs with `useConversationList` — receives the current
// pageSize and a setter; emits new page sizes via the Select's onValueChange.
// Zero state.
export function ConversationPageSizeBar({
  pageSize,
  onPageSizeChange,
}: ConversationPageSizeBarProps) {
  return (
    <div className="flex items-center">
      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Rows per page</span>
        {/* Typed generic <Select<number>> per ADR-010. The onValueChange null
            guard protects against Base UI emitting null on deselect. */}
        <Select<number>
          value={pageSize}
          onValueChange={(size) => {
            if (size !== null) onPageSizeChange(size)
          }}
        >
          <SelectTrigger className="h-8 w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={5}>5</SelectItem>
            <SelectItem value={10}>10</SelectItem>
            <SelectItem value={25}>25</SelectItem>
            <SelectItem value={50}>50</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
```

---

### Step 4.4: Create `DeleteConversationModal.tsx`

**Goal:** Confirmation dialog for delete — lighter than agents (no checkbox).
**Dependencies:** Task 3 (`useDeleteConversation`).

- [ ] Create `src/features/conversations/components/DeleteConversationModal.tsx`.
- [ ] Mirror `DeleteAgentModal`, but **remove the checkbox and its `Label`/`isChecked` wiring**.
- [ ] Title "Delete Conversation"; `DialogDescription` naming the conversation title and stating the action is permanent.
- [ ] `Cancel` + destructive `Delete`; `Delete` disabled **only** while `isSubmitting` (the double-submit guard lives in the hook).
- [ ] Do not import `Label` (unused once the checkbox is removed) — avoids an orphan import / lint error.

#### Implementation

```tsx
// src/features/conversations/components/DeleteConversationModal.tsx

import { useDeleteConversation } from "../hooks/useDeleteConversation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { ConversationListDTO } from "../types"

interface DeleteConversationModalProps {
  conversation: ConversationListDTO
  onClose: () => void
  onSuccess: () => void
}

// One responsibility: render the Delete Conversation confirmation dialog.
// Lighter than DeleteAgentModal — no checkbox guard (the double-submit guard
// lives in useDeleteConversation). The destructive button is disabled only
// while a delete is in flight.
export function DeleteConversationModal({
  conversation,
  onClose,
  onSuccess,
}: DeleteConversationModalProps) {
  const { isSubmitting, error, onConfirm } = useDeleteConversation(
    conversation,
    onSuccess
  )

  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Conversation</DialogTitle>
        </DialogHeader>

        <DialogDescription>
          You are about to permanently delete{" "}
          <span className="font-semibold text-foreground">{conversation.title}</span>.
          {" "}This action cannot be undone.
        </DialogDescription>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => void onConfirm()}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

### Step 4.5: Create `index.ts` barrel

**Goal:** Expose the module's public surface.
**Dependencies:** Task 2 hook, Task 1 type.

- [ ] Create `src/features/conversations/index.ts`.
- [ ] Mirror `features/agents/index.ts`: export `useConversationList` and the `ConversationListDTO` type.
- [ ] Keep `useDeleteConversation`, `useConversationModals`, and all components internal (not re-exported) — they are consumed only within the module and by `ConversationsPage` via direct paths (mirrors how `AgentsPage` imports modal components directly).

#### Implementation

```ts
// src/features/conversations/index.ts

export { useConversationList } from "./hooks/useConversationList"
export type { ConversationListDTO } from "./types"
```

---

## Edge Cases

- **Empty list (Step 4.1):** `conversations.length === 0 && !isLoading` renders "No conversations found." spanning all 3 columns. While `isLoading` is true the empty row is suppressed and the overlay shows instead — prevents a flash of "no conversations" during the initial fetch.
- **Empty `totalPages` (Step 4.2):** `Math.max(totalPages, 1)` shows "Page 1 of 1" when the backend returns `totalPages: 0` for an empty list.
- **Single element label (Step 4.2):** `totalElements === 1` renders "1 conversation" (singular).
- **Base UI deselect null (Step 4.3):** the `onValueChange` null guard prevents a `null` page size from reaching `onPageSizeChange`.
- **Date parsing (Step 4.1):** `updatedAt` is an ISO `LocalDateTime` string with a time component (e.g. `"2026-06-27T14:30:00"`, no `Z`/offset). Per ECMAScript, a date-**time** string without a timezone designator is parsed as **local** time — so `new Date(value).toLocaleString()` renders the value as-is in the browser's local zone, which is the desired behavior. <!-- REVIEW-FIX: clarified WHY the no-offset string renders correctly (time-bearing ISO → local parse) so a future change does not "fix" it into a UTC shift --> Do not append a `Z` or reformat the string before parsing — a date-**only** string would instead be parsed as UTC and shift the displayed time.
- **Double-click Delete (Step 4.4):** re-entrancy is handled by `useDeleteConversation`'s `isSubmitting` early-return (Task 3), not by the modal; the button also disables on `isSubmitting`.
- **Long title (Step 4.4):** the title is interpolated into the description; no truncation is applied (consistent with `DeleteAgentModal`).

---

## Design Decisions

**Decision 1:** Three columns, delete-only actions (no edit, no clickable rows).
- **Why:** Feature scope is read + delete; there is no conversation/message view in the frontend yet, so rows must not be clickable and there is no edit flow.
- **Alternatives considered:** Mirror `AgentTable` 1:1 (Name/Description/Created/Edit+Delete) — rejected; conversations have no description column in scope and no edit.

**Decision 2:** Last activity uses `toLocaleString()` (date + time), not `toLocaleDateString()`.
- **Why:** The list is ordered by last activity; date-only would hide intra-day ordering when multiple conversations share a day.
- **Alternatives considered:** Date-only (agents convention) — rejected for the reason above.

**Decision 3:** `DeleteConversationModal` has no checkbox.
- **Why:** Lighter UX per the feature interview; the accidental-multi-delete risk the agents checkbox incidentally covered is handled explicitly by the `isSubmitting` double-submit guard in `useDeleteConversation`.
- **Alternatives considered:** Mirror the agents checkbox guard — rejected; unnecessary friction for this flow.

**Decision 4:** Barrel exports only `useConversationList` + `ConversationListDTO`.
- **Why:** Minimal public surface (ISP). Components and the delete/modal hooks are internal collaborators; the page imports modal components by direct path, mirroring `AgentsPage`.

---

## Testing Considerations

> **Note on the test command:** Always append `-- run` for a single, non-blocking pass.

Per the parent's Testing Decisions and the established agents convention, these display components are **composition-only with no business logic and get no unit tests** — their behavior is validated through the already-tested hooks (Tasks 2–3) and the Phase 5 manual browser walkthrough (Task 5). This task adds no new test files.

### Automatic Validation

- [ ] `npm --prefix project/srcs/frontend run typecheck` — 0 errors (props and `Select<number>` generic resolve correctly).
- [ ] `cd project/srcs/frontend && npx eslint src/features/conversations/components/ src/features/conversations/index.ts` — clean (no unused imports; confirm `Label` is **not** imported in the modal).
- [ ] `npm --prefix project/srcs/frontend run test -- run` — full suite still green with **no regressions**. This task adds **no new test files**, so the test/file count must be **identical to the post-Task-3 baseline** (Task 3 left the suite at 163 tests in 30 files); a change in that count means something was added or broken unintentionally. <!-- REVIEW-FIX: made the "no regressions" check concrete by stating the expected unchanged baseline count -->
- [ ] Confirm the `ConversationsPage` rewrite is **not** part of this task — wiring (`useConversationList` from the barrel, `useConversationModals`, the delete `onSuccess` refresh + empty-page step-back guard) belongs to Task 5. These components must stay presentation-only here.
- [ ] `npm --prefix project/srcs/frontend run build` — succeeds.

### Manual Validation

None in this task. Visual/interaction validation of these components is performed end-to-end in Task 5 (Phase 5 browser walkthrough), where the page composes them with live data.

---

## Related Code Explanations

- `src/features/agents/components/AgentTable.tsx` — table + overlay + empty state (mirror; drop edit + Description, change date format).
- `src/features/agents/components/AgentPagination.tsx` — pagination row (mirror; relabel).
- `src/features/agents/components/AgentPageSizeBar.tsx` — page-size selector (verbatim mirror).
- `src/features/agents/components/DeleteAgentModal.tsx` — confirm dialog (mirror; remove checkbox).
- `src/features/agents/index.ts` — barrel shape.
- `src/features/conversations/hooks/useDeleteConversation.ts` — consumed by the modal (Task 3).
- `src/features/conversations/hooks/useConversationList.ts` — exported from the barrel (Task 2).

---

## Completion Criteria

- [ ] Parent feature reviewed (3 columns, delete-only, date+time, no-checkbox modal, minimal barrel honored).
- [ ] `solid-deep-design` and `shadcn-component-review` skills reviewed and applied; ADR-010 Base UI conventions mirrored.
- [ ] Version-matched prior art reviewed (the four agents components and `agents/index.ts`).
- [ ] `src/features/conversations/components/ConversationTable.tsx` created.
- [ ] `src/features/conversations/components/ConversationPagination.tsx` created.
- [ ] `src/features/conversations/components/ConversationPageSizeBar.tsx` created.
- [ ] `src/features/conversations/components/DeleteConversationModal.tsx` created (no checkbox; `Delete` disabled only while `isSubmitting`).
- [ ] `src/features/conversations/index.ts` created (exports `useConversationList` + `ConversationListDTO` only).
- [ ] `npm run typecheck`, `eslint` on new files, `npm run test -- run`, and `npm run build` all clean with no regressions.
- [ ] Parent feature Phase 4 Steps 4.1–4.5 marked complete and the Task 4 wiki link added after execution.
