# Task: Conversation Types & Service (TDD)

#task #current #low-complexity #parent-conversation-history-list-and-delete

**Parent:** [[Features/to-do/Conversation-History-List-and-Delete]]
**Parent Type:** Feature
**Related Step(s):** Phase 1 — Step 1.1, Step 1.2, Step 1.3
**Estimated Complexity:** Low

---

## Goal

Create the foundation of the new `features/conversations/` frontend module: the TypeScript type contracts (`ConversationListDTO` + re-exported pageable types) and the HTTP service seam (`listConversations`, `deleteConversation`) that every later task in this feature depends on. Built test-first with `axios-mock-adapter`.

---

## Parent Context

The feature replaces the placeholder `/conversations` page with a paginated, last-activity-ordered list of the authenticated employee's conversations, each with a delete action. It is **frontend-only** — the backend Conversation domain (`models/conversation/`) is complete and owner-scoped, consumed as-is via `POST /conversation/list` and `DELETE /conversation/{id}`. The module **mirrors the proven `features/agents/` module** but is read + delete only (no create/edit).

This task is the first of five and is purely foundational boilerplate: the type that describes a list row and the two HTTP functions that fetch and delete. It enables Task 2 (list hook), Task 3 (delete hook), and Task 4 (components).

Relevant parent decisions baked into this task:
- **F2 (review):** `deleteConversation` returns **`Promise<void>`** — the backend returns the deleted `ConversationDTO` but the frontend discards it, so no `ConversationDTO` type is defined in this module (minimal interface / ISP).

---

## Preconditions / Dependencies

- No previous tasks in this feature — this is Task 1.
- Shared pagination types already exist at `project/srcs/frontend/src/types/api.ts` (`PageableRequest`, `PageEnvelope<T>`). Do **not** redefine them.
- The Axios singleton `project/srcs/frontend/src/lib/api.ts` (default export `api`, base URL `/api`, JWT auto-attach) already exists.
- Backend endpoints already exist and are owner-scoped: `POST /conversation/list` → `Page<ConversationListDTO>`; `DELETE /conversation/{id}` → `ConversationDTO`.
- Test tooling already configured: Vitest 4.1.9 (jsdom), `axios-mock-adapter` 2.1.0, the `@/` path alias in `vitest.config.ts`.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `tdd` — **Selected** — Steps 1.2/1.3 are a red-green cycle; the service is tested at its HTTP seam before it is written.
- `solid-deep-design` — **Selected** — keeps the service interface minimal (two standalone functions, `void` return on delete) and the type surface lean.
- `find-docs` — **Not needed** — no new/unknown library APIs are introduced. The exact same APIs (`api.post`, `api.delete`, `MockAdapter`, `mock.history`) are already exercised by `features/agents/services/agentService.test.ts` at the identical pinned versions; that in-repo, passing test is the version-matched reference.
- `glossary-management` — **Reviewed** — "Conversation" has no formal glossary entry (glossary CLI index is empty, a known issue); backend terminology is used.

### Documentation Reviewed

- In-repo prior art (version-matched, currently passing): `project/srcs/frontend/src/features/agents/services/agentService.ts` and `agentService.test.ts` — the exact pattern to mirror.
- Backend contract: `project/srcs/backend/src/main/java/com/BHT/models/conversation/ConversationListDTO.java` (field shape) and `ConversationController.java` / `DefaultController.java` (`POST /conversation/list`, `DELETE /conversation/{id}` signatures).
- Pinned versions (from `project/srcs/frontend/package.json`): `axios@^1.18.0`, `axios-mock-adapter@^2.1.0`, `vitest@^4.1.9`, `typescript@~5.9.3`.

### Related Existing Code

- `src/features/agents/services/agentService.ts` — the service to mirror (drop create/edit/get; delete returns `void`).
- `src/features/agents/services/agentService.test.ts` — the test structure to mirror (per-`describe` `MockAdapter` isolation).
- `src/features/agents/types.ts` — the types pattern (re-export pageable types + feature DTO).
- `src/types/api.ts` — `PageableRequest`, `PageEnvelope<T>` (import, do not redefine).
- `src/lib/api.ts` — the Axios singleton the service and tests use.

---

## Implementation Details

### Approach

Mirror the agents service module, trimmed to read + delete. Two files of production code and one test file:

1. `types.ts` — re-export `PageableRequest`/`PageEnvelope` from `@/types/api` and declare `ConversationListDTO` matching the backend `ConversationListDTO` (`id`, `title`, `agentId` nullable, `currentModelId`, `createdAt`, `updatedAt`). IDs are `number` per ADR-009; date-times are ISO `string`.
2. `conversationService.ts` — `listConversations(request)` → `api.post("/conversation/list", request)` returning `PageEnvelope<ConversationListDTO>`; `deleteConversation(id)` → `await api.delete(\`/conversation/${id}\`)` returning `Promise<void>` (body discarded).
3. `conversationService.test.ts` — written first (RED), one `describe` per function with isolated `MockAdapter`.

The service is a thin, deep-enough seam: it hides URL construction and the Axios call behind two named functions, and it is the single place the rest of the feature talks to the backend (DIP — hooks depend on these functions, not on `axios`).

### Files to Create/Modify

- [x] `src/features/conversations/types.ts` — `ConversationListDTO` + re-exported pageable types.
- [x] `src/features/conversations/services/conversationService.test.ts` — RED tests for both functions.
- [x] `src/features/conversations/services/conversationService.ts` — GREEN implementation.

(No `index.ts` barrel in this task — it is created in Task 4 once there is a public surface to export.)

---

## Step-by-Step Implementation

### Step 1.1: Create `types.ts`

**Goal:** Declare the list-row contract and re-export the shared pageable types.
**Dependencies:** None.

- [ ] Create `src/features/conversations/types.ts`.
- [ ] Re-export `PageableRequest` and `PageEnvelope` from `@/types/api` (mirrors `features/agents/types.ts`).
- [ ] Declare `ConversationListDTO` matching the backend field shape.

**Why this step is critical:** Every other file in the feature imports these types; the service's generics and the hooks' state are typed against them.

#### Implementation

```typescript
// src/features/conversations/types.ts

import type { PageableRequest, PageEnvelope } from "@/types/api"
export type { PageableRequest, PageEnvelope }

// Row returned by POST /conversation/list. Mirrors the backend
// ConversationListDTO (com.BHT.models.conversation.ConversationListDTO).
// employeeId is intentionally absent — every listed conversation belongs to
// the authenticated employee (backend owner-scoping).
export interface ConversationListDTO {
  id: number
  title: string
  agentId: number | null      // null for general (agent-less) conversations
  currentModelId: number
  createdAt: string           // ISO LocalDateTime string
  updatedAt: string           // ISO LocalDateTime string — list is ordered by this
}
```

#### Edge Cases
1. **Case:** `agentId` is null for conversations started without an agent — modeled as `number | null` (matches the backend `// nullable` comment). Consumers must null-check before use.
2. **Case:** `title` is always non-blank — the backend `insert` defaults blank/absent titles to `"New Conversation"` and `updateTitle` rejects blank — so `title: string` (not nullable) is correct; no `?? "—"` fallback is required for this column.

---

### Step 1.2 (RED): Create `conversationService.test.ts`

**Goal:** Encode the HTTP contract of both functions as failing tests before the implementation exists.
**Dependencies:** Step 1.1 (`ConversationListDTO`, `PageableRequest`).

- [ ] Create `src/features/conversations/services/conversationService.test.ts`.
- [ ] One `describe` per function, each with its own `MockAdapter(api)` in `beforeEach` and `mock.restore()` in `afterEach` (per-describe isolation — matches the agents test).
- [ ] `listConversations`: assert exactly one POST to `/conversation/list`, the request body deep-equals the `PageableRequest`, and the returned envelope deep-equals the mocked response.
- [ ] `deleteConversation`: assert exactly one DELETE to `/conversation/{id}`. **Do not assert a return value** — the function resolves to `void` (the response body is discarded, per parent decision F2). The mock still replies `200` with a body to prove the function ignores it.
- [ ] Run the suite and confirm RED: the import of `./conversationService` fails to resolve.

**Why this step is critical:** The test pins the request shape (URL, method, body) so the GREEN step and any later refactor cannot silently change the backend contract.

#### Implementation

```typescript
// src/features/conversations/services/conversationService.test.ts

import { describe, it, expect, beforeEach, afterEach } from "vitest"
import MockAdapter from "axios-mock-adapter"
import api from "@/lib/api"
import { listConversations, deleteConversation } from "./conversationService"
import type { PageableRequest } from "@/types/api"
import type { ConversationListDTO } from "../types"

const mockListDTO: ConversationListDTO = {
  id: 42,
  title: "Quarterly report draft",
  agentId: null,
  currentModelId: 3,
  createdAt: "2026-06-26T10:00:00",
  updatedAt: "2026-06-27T14:30:00",
}

describe("conversationService.listConversations", () => {
  let mock: InstanceType<typeof MockAdapter>

  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => {
    mock.restore()
  })

  it("POSTs the PageableRequest body to /conversation/list and returns the PageEnvelope", async () => {
    const request: PageableRequest = {
      page: 0,
      size: 10,
      sort: [{ field: "updatedAt", direction: "DESC" }],
      filters: [],
    }

    const envelope = {
      content: [mockListDTO],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 10,
      first: true,
      last: true,
      empty: false,
    }

    mock.onPost("/conversation/list").reply(200, envelope)

    const result = await listConversations(request)

    expect(mock.history.post).toHaveLength(1)
    expect(mock.history.post[0].url).toBe("/conversation/list")
    const body = JSON.parse(mock.history.post[0].data as string)
    expect(body).toEqual(request)
    expect(result).toEqual(envelope)
  })
})

describe("conversationService.deleteConversation", () => {
  let mock: InstanceType<typeof MockAdapter>

  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => {
    mock.restore()
  })

  it("DELETEs /conversation/{id} and resolves without returning the body", async () => {
    const id = 42

    // Backend replies with the deleted ConversationDTO; the service discards it.
    mock.onDelete(`/conversation/${id}`).reply(200, mockListDTO)

    const result = await deleteConversation(id)

    expect(mock.history.delete).toHaveLength(1)
    expect(mock.history.delete[0].url).toBe(`/conversation/${id}`)
    expect(result).toBeUndefined()
  })
})
```

#### Edge Cases
1. **Case:** `deleteConversation` resolves to `void` — asserting `result` is `undefined` proves the function does not leak the discarded body, locking in the F2 decision.
2. **Case:** Per-`describe` `MockAdapter` isolation prevents request-history bleed between the two suites (the established project pattern).

---

### Step 1.3 (GREEN): Create `conversationService.ts`

**Goal:** Implement the two functions so the tests pass.
**Dependencies:** Step 1.2.

- [ ] Create `src/features/conversations/services/conversationService.ts`.
- [ ] Import the default `api` (value) and `import type` the DTO/pageable types.
- [ ] Implement `listConversations` and `deleteConversation`. No `/api` prefix (the Vite proxy adds it). No error handling here — errors propagate to the calling hook (mirrors `agentService`).
- [ ] Run the suite and confirm GREEN.

**Why this step is critical:** This is the only seam the feature uses to reach the backend; keeping it thin and error-handling-free centralizes error handling in the hooks (Tasks 2 and 3).

#### Implementation

```typescript
// src/features/conversations/services/conversationService.ts

import api from "@/lib/api"
import type { PageableRequest, PageEnvelope } from "@/types/api"
import type { ConversationListDTO } from "../types"

export async function listConversations(
  request: PageableRequest
): Promise<PageEnvelope<ConversationListDTO>> {
  const response = await api.post<PageEnvelope<ConversationListDTO>>(
    "/conversation/list",
    request
  )
  return response.data
}

// Returns void: the backend responds with the deleted ConversationDTO, but no
// caller in this feature reads it (parent review F2 — minimal interface).
export async function deleteConversation(id: number): Promise<void> {
  await api.delete(`/conversation/${id}`)
}
```

#### Edge Cases
1. **Case:** A 4xx/5xx (e.g., 404 from deleting a non-owned/non-existent conversation) rejects the promise; this service does not catch it — the consuming hook (Task 3) extracts the message. Intentional separation of concerns.

---

## Design Decisions

**Decision 1:** `deleteConversation` returns `Promise<void>`, and no `ConversationDTO` type is created.
- **Why:** No consumer in this feature reads the delete response (rows are not clickable; there is no detail view). The smallest honest interface is `void`; defining a 6-field `ConversationDTO` only to discard it would be unused surface (ISP / depth).
- **Alternatives considered:** Mirror `deleteAgent`'s `Promise<AgentDTO>` and add `ConversationDTO` — rejected; `AgentDTO` exists because the agent edit flow genuinely consumes it, which has no analogue here.

**Decision 2:** Re-export `PageableRequest`/`PageEnvelope` from `types.ts` rather than importing `@/types/api` everywhere.
- **Why:** Matches `features/agents/types.ts`; feature-local files import all their types from one place (`../types`).
- **Alternatives considered:** Import `@/types/api` directly in each file — rejected for inconsistency with the established feature convention.

**Decision 3:** No `index.ts` barrel in this task.
- **Why:** There is no public surface to export yet (the hook arrives in Task 2). The agents barrel exports `useAgentList` + types, not the raw service. Creating an empty/premature barrel now would be speculative.
- **Alternatives considered:** Create the barrel now exporting the service — rejected; raw services are internal to the feature (the agents barrel does not export them).

**Decision 4:** No error handling in the service.
- **Why:** Mirrors `agentService`; the hooks own user-facing error extraction (`useConversationList`, `useDeleteConversation`). Centralizing errors in the service would duplicate that and couple the seam to UI concerns.

---

## Testing Considerations

> **Note on the test command:** the `test` npm script is bare `vitest`, which runs in **watch mode** in an interactive terminal. Always append `-- run` (→ `vitest run`) for a single, non-blocking pass. <!-- REVIEW-FIX: bare `vitest` watch-mode would hang; force `-- run` -->

- [ ] `npm --prefix project/srcs/frontend run test -- run` — full suite green; the two new `conversationService` tests pass and there are **no regressions** vs. the current baseline.
- [ ] Confirm the RED→GREEN transition with the same `... run test -- run` command: after Step 1.2 it must fail (Vitest cannot resolve `./conversationService`), after Step 1.3 it must pass.
- [ ] `npm --prefix project/srcs/frontend run typecheck` — 0 errors (`tsc --noEmit`).
- [ ] Lint the new files: from the frontend dir, `cd project/srcs/frontend && npx eslint src/features/conversations/` — clean. (`npm run lint` lints the whole repo and will surface pre-existing errors in unrelated files; scope to the new directory.) <!-- REVIEW-FIX: removed invalid `npx --prefix`; eslint must run from the frontend dir -->
- [ ] `npm --prefix project/srcs/frontend run build` — build succeeds (the `build` script is `tsc -b && vite build`, so this also re-typechecks; pre-existing 500 kB chunk-size warning is unrelated).

### Manual Validation

None. This task is pure types + HTTP functions with no UI; the automatic service tests fully cover the behavior. (Manual browser validation for the feature is deferred to Task 5.)

---

## Related Code Explanations

- `src/features/agents/services/agentService.ts` — sibling pattern this service mirrors.
- `src/features/agents/services/agentService.test.ts` — sibling test structure mirrored here.
- `src/types/api.ts:1` — `PageableRequest` / `PageEnvelope<T>` consumed by this module.
- `project/srcs/backend/src/main/java/com/BHT/models/conversation/ConversationListDTO.java` — backend field shape the frontend DTO mirrors.

---

## Completion Criteria

- [x] Parent feature reviewed and reflected accurately (read + delete only; F2 `void` delete honored).
- [x] `tdd` and `solid-deep-design` skills reviewed and applied.
- [x] Version-matched prior art reviewed (agents service at pinned axios/vitest/mock-adapter versions).
- [x] `src/features/conversations/types.ts` created with `ConversationListDTO` + re-exported pageable types.
- [x] `src/features/conversations/services/conversationService.test.ts` created; RED confirmed before implementation.
- [x] `src/features/conversations/services/conversationService.ts` created; GREEN confirmed.
- [ ] `npm run test` passes with the two new tests and no regressions.
- [ ] `npm run typecheck`, `eslint` on the new files, and `npm run build` all clean.
- [x] No `ConversationDTO` type introduced; `deleteConversation` returns `Promise<void>`.
- [x] No `index.ts` barrel created in this task (deferred to Task 4).
- [x] Parent feature Phase 1 Steps 1.1–1.3 marked complete and Task 1 wiki link added after execution.
