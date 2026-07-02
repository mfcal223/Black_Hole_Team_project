# Task: Chat Service and Types

#task #current #medium-complexity #parent-employee-chat-interface

**Parent:** [[Employee-Chat-Interface]]
**Parent Type:** Feature
**Related Step(s):** Phase 2, Steps 2.1, 2.2, 2.3, 2.4
**Estimated Complexity:** Medium

---

## Goal

Establish the `features/chat/` module foundation: five TypeScript interfaces that mirror backend DTOs, the `react-markdown` npm dependency, four service functions (TDD, `axios-mock-adapter`), and a public barrel stub. All three subsequent hook tasks (Tasks 3, 4, 5) depend on this foundation existing before they can start.

---

## Parent Context

The Employee Chat Interface is a purely frontend build (backend Task 1 is done). The parent feature mandates a `features/chat/` module following the same pattern as `features/agents/` and `features/app-settings/`: a `types.ts` file, a `services/chatService.ts` with standalone async exports, TDD with `axios-mock-adapter`, and an `index.ts` barrel that is the only public seam.

Key constraints from the parent:
- `EnabledModelDTO` is a **feature-local** type — identical shape to `LlmModelMiniDTO` but owned by the chat domain. No cross-feature type imports.
- Service functions follow the **standalone-export, no-error-handling-in-service** pattern established by `agentService.ts` and `appSettingsService.ts`. Hooks own error state.
- `ChatCreateForm.agentId` is `number | null` (required, not optional) — full-state semantics; `null` means no agent, `undefined` is never sent.
- The barrel stub exports **types only** at this stage; `useChat` is added in Step 6.1 (Task 6). The comment in the barrel marks the placeholder explicitly.
- `react-markdown` v10 is the current release; React >=18 peer dep satisfies this project's React 19.2.4.

---

## Preconditions / Dependencies

- Task 1 (backend `GET /llm-model/enabled`) is complete and verified GREEN — the endpoint the `getEnabledModels()` service function calls is live.
- `project/srcs/frontend/src/features/chat/` does **not** exist yet — this task creates it from scratch.
- `project/srcs/frontend/src/lib/api.ts` (Axios singleton, baseURL `/api`) is in place and is the sole HTTP client.
- `project/srcs/frontend/src/types/api.ts` (`PageableRequest`) is in place — `chatService.ts` does NOT import from it (chat service functions don't use paginated list endpoints), but it is the canonical location if pagination is ever added to this feature.
- Frontend test baseline before this task: **157 tests / 28 files** (`npm run test` passes clean).
- `vitest.config.ts` uses `environment: "jsdom"` and the `@/` alias resolving to `src/` — both are required by the test file.
- **All `npm` commands in this task run from `project/srcs/frontend/`** — this is where `package.json`, `vitest.config.ts`, and `vite.config.ts` live. Never run them from the project root.
<!-- REVIEW-FIX: Added explicit working directory requirement — npm commands were undirected; executing from wrong dir causes module resolution failures -->

---

## Skills and Documentation Preparation

### Skills Reviewed

- `solid-deep-design` — **Selected** — validates the module boundary design: `types.ts` as a pure declaration module (zero depth, maximum stability), `chatService.ts` as four shallow but SRP-clean adapter functions (each hides one axios call), and the barrel as the ISP seam (callers never import from `services/` or `hooks/` directly).
- `tdd` — **Selected** — TDD is mandatory for `chatService.ts`. Write `chatService.test.ts` first (RED), then create `chatService.ts` (GREEN). One describe block per function; one behavior test per describe.
- `documentation-management` — **Selected** — creating this task document, updating the parent feature wiki link.
- `memory-bank` — **Selected** — all Memory Bank files read; confirmed patterns: standalone-export service convention, per-describe MockAdapter isolation, feature-local types (no cross-feature imports), `index.ts` barrel as the only public seam.
- `find-docs` (context7) — **Selected** — queried `react-markdown` at `/remarkjs/react-markdown`; confirmed v10.x is the current release, `react >=18` peer dep is satisfied by React 19.2.4, installation is `npm install react-markdown`, import is `import Markdown from 'react-markdown'`.
- `glossary-management` — **Not needed** — no new domain terms; "Conversation", "Message", "LLM Model" are established.

### Documentation Reviewed

- Context7 `/remarkjs/react-markdown` — confirmed v10 install (`npm install react-markdown`), `React >=18` peer dep, `import Markdown from 'react-markdown'` usage, removal of `className` prop (v10 breaking change — use wrapping `<div>` instead).
- `documentation/Docs/API-Reference/Conversation.md` — verified `POST /conversation` body (`ConversationForm`: `title`, `modelId` required, `agentId` optional), `ConversationMiniDTO` shape (`id`, `title`, `createdAt`), `ConversationDTO` shape.
- `documentation/Docs/API-Reference/Messages.md` — verified `GET /conversation/{conversationId}/messages` returns `MessageDTO[]` ordered `createdAt ASC`; `MessageDTO` field set (including nullable `llmModelId`, `inputTokens`, `outputTokens` for USER rows).
- `documentation/Docs/API-Reference/LlmModels.md` (via Task 1 review) — confirmed `GET /llm-model/enabled` returns `LlmModelMiniDTO[]` (`{ id, modelId, name, isEnabled }`).
- `project/srcs/frontend/src/features/app-settings/services/appSettingsService.test.ts` — **primary TDD prior art**: per-describe MockAdapter, `beforeEach/afterEach` create/restore, `mock.history.*` assertions, module-level fixture objects.
- `project/srcs/frontend/src/features/agents/services/agentService.ts` — service pattern for POST body calls (`api.post` + `return response.data`).
- `project/srcs/frontend/src/features/agents/index.ts` — barrel export pattern (types + hooks, no services/components).

### Related Existing Code

- `project/srcs/frontend/src/lib/api.ts` — Axios singleton imported as `api`; `baseURL: "/api"`. All service calls use relative paths (`/llm-model/enabled`, not `/api/llm-model/enabled`).
- `project/srcs/frontend/src/features/app-settings/services/appSettingsService.ts` — canonical standalone-export service pattern; `import type` for DTOs.
- `project/srcs/frontend/src/features/app-settings/services/appSettingsService.test.ts` — canonical TDD test pattern; verbatim `beforeEach/afterEach` structure must be replicated.
- `project/srcs/frontend/src/features/app-settings/types.ts` — shows feature-local type ownership (same shapes as backend but declared locally).
- `project/srcs/frontend/src/features/agents/index.ts` — barrel export pattern: named exports only for public-facing hooks and types; raw services/components not re-exported.

---

## Implementation Details

### Approach

This task creates the **data-contract layer and HTTP adapter layer** for the chat feature. No business logic, no state management — just types and thin async functions.

**SOLID / Depth analysis:**

| Module | SRP | Depth | Verdict |
|--------|-----|-------|---------|
| `types.ts` | One reason to change: backend DTO shape changes | Interface = implementation (pure declarations) | Shallow by design — correct for a declaration module |
| `chatService.ts` | 4 functions, each one HTTP call | Shallow but SRP-clean; each function is a minimal adapter | Correct — deeper modules (hooks) sit above |
| `index.ts` barrel | One reason: feature's public API changes | Zero implementation; pure re-export | Shallow by design — ISP seam |

The feature-local types (`EnabledModelDTO`, etc.) break the temptation to import `LlmModelMiniDTO` from `features/app-settings`. Cross-feature type imports create hidden coupling: if `app-settings` renames or restructures its types, the chat feature breaks. Feature-local declarations are the correct pattern (established by `agents/types.ts` owning `AgentListDTO` rather than re-exporting from `employees`).

**TDD flow for `chatService.ts`:**
1. Write `chatService.test.ts` with all 4 describe blocks → confirm RED (import fails — file doesn't exist)
2. Create `chatService.ts` with all 4 functions → confirm GREEN

The test file follows the per-describe MockAdapter isolation pattern from `appSettingsService.test.ts` exactly. Each `describe` block owns its own `mock: InstanceType<typeof MockAdapter>` with `beforeEach(() => mock = new MockAdapter(api))` and `afterEach(() => mock.restore())`. This ensures no inter-test state leakage even if a previous test's mock is left open.

### Files to Create/Modify

> **TDD order:** Write `chatService.test.ts` first (Step 3.1 — RED), then `chatService.ts` (Step 3.2 — GREEN). The list below reflects logical dependency order.

- [ ] `project/srcs/frontend/src/features/chat/types.ts` — **new** — 5 TypeScript interfaces (no test needed; pure declarations)
- [ ] `project/srcs/frontend/src/features/chat/services/chatService.test.ts` — **new** — 4 describe blocks, 4 behavior tests — **create first (TDD RED)**
- [ ] `project/srcs/frontend/src/features/chat/services/chatService.ts` — **new** — 4 standalone async service functions
- [ ] `project/srcs/frontend/src/features/chat/index.ts` — **new** — barrel stub exporting types only (useChat placeholder comment)

---

## Step-by-Step Implementation

### Step 1: Create `features/chat/types.ts`

**Goal:** Declare all TypeScript interfaces the chat feature needs. These mirror the backend DTOs exactly and are the single source of truth for type safety across the feature's services, hooks, and components.
**Dependencies:** None.

- [ ] Create the directory `project/srcs/frontend/src/features/chat/`
- [ ] Create `project/srcs/frontend/src/features/chat/types.ts` with the 5 interfaces below
- [ ] Run `npm run typecheck` — 0 errors

**Why this step is critical:** All subsequent steps import from this file. Getting the shapes right now prevents cascading type errors in Tasks 3–6. Mismatches between these interfaces and the actual backend responses will surface as runtime failures (e.g., `undefined` model IDs in the selector).

#### Implementation

```typescript
// project/srcs/frontend/src/features/chat/types.ts

// Mirrors backend LlmModelMiniDTO — the shape returned by GET /llm-model/enabled.
// Declared locally (not imported from features/app-settings) to avoid cross-feature coupling.
export interface EnabledModelDTO {
  id: number
  modelId: string
  name: string
  isEnabled: boolean
}

// Returned by GET /conversation/{id}.
export interface ChatConversationDTO {
  id: number
  title: string
  employeeId: number
  agentId: number | null
  currentModelId: number
  createdAt: string
  updatedAt: string
}

// One entry in GET /conversation/{conversationId}/messages.
// USER rows have null llmModelId, inputTokens, outputTokens.
// ASSISTANT rows have all fields set.
export interface ChatMessageDTO {
  id: number
  conversationId: number
  role: "USER" | "ASSISTANT"
  content: string
  llmModelId: number | null
  inputTokens: number | null
  outputTokens: number | null
  createdAt: string
}

// Body for POST /conversation.
// agentId: null means no agent (general conversation); never send undefined.
export interface ChatCreateForm {
  modelId: number
  agentId: number | null
  title: string
}

// Response from POST /conversation (ConversationMiniDTO on the backend).
export interface ChatConversationMiniDTO {
  id: number
  title: string
  createdAt: string
}
```

#### Edge Cases

1. **`agentId: number | null` vs optional `agentId?`** — The field is always present in `ChatCreateForm`; it's just nullable. Sending `undefined` (an omitted key) would be valid JSON but risks backend null-coalescing differently than an explicit `null`. The parent spec mandates `null` for "no agent." The TypeScript type enforces this — the field cannot be accidentally omitted.
2. **`role: "USER" | "ASSISTANT"` string literal union** — The project uses `const` + `type` companion pattern (see `UserRole` in `types/auth.ts`) only when `erasableSyntaxOnly` is needed. String literal unions work fine for DTO role fields that never need runtime iteration.
3. **`createdAt: string`** — Dates come from the backend as ISO-8601 strings. The frontend parses them for display only (no `Date` objects — avoids timezone parse issues).

---

### Step 2: Install `react-markdown`

**Goal:** Add `react-markdown` v10 to the project's `package.json` dependencies.
**Dependencies:** Step 1 must be complete (no code dependency, but creates the `features/chat/` directory first).

- [ ] Run from `project/srcs/frontend/`: `npm install react-markdown`
- [ ] Verify `react-markdown` appears in `package.json` `"dependencies"` (not `devDependencies`) — it is a runtime render library, not a test/build tool
- [ ] Run `npm run typecheck` — 0 errors (react-markdown v10 ships its own TypeScript declarations)
- [ ] Run `npm run build` — build succeeds; note the new bundle delta in the output (expected: roughly +50–70 kB uncompressed)

**Why this step is critical:** `react-markdown` is needed by Task 7 (UI components), not this task. However, the parent groups it here because installing a new dependency before writing types and services keeps the dependency scope aligned with the task that first declares its usage in types. Installing it now also surfaces any peer-dependency conflicts before any code depends on it.

#### Implementation

```bash
# Run from project/srcs/frontend/
npm install react-markdown
```

**Expected result:** `react-markdown` is added to `"dependencies"` in `package.json`. No `--save-dev` flag — it is a production render dependency.

**Import pattern for Task 7:** When `MessageBubble.tsx` uses it:
```typescript
import Markdown from "react-markdown"

// Usage (v10 — no className prop on <Markdown>; wrap in div for styling):
<div className="prose">
  <Markdown>{content}</Markdown>
</div>
```

#### Edge Cases

1. **`className` removed in v10** — Do NOT pass `className` directly to `<Markdown>`. Wrap in `<div className="...">`. This is a v10 breaking change documented in context7. Task 7 must follow this pattern when creating `MessageBubble.tsx`.
2. **Bundle size** — react-markdown 10.x pulls in `remark` and `micromark` as transitive dependencies. The bundle will grow by approximately 50–70 kB uncompressed (~20 kB gzip). The project already has a pre-existing `500 kB chunk-size warning` from Vite — this addition does not fix that but does not meaningfully worsen it either.
3. **ESM-only package** — react-markdown v10 is ESM-only. Vite's native ESM support handles this without configuration changes. **Crucially, `react-markdown` is NOT imported in any test file in this task** — it is only used in UI components created in Task 7. No `vitest.config.ts` changes are needed here. If ESM transform issues arise in Task 7 (when `MessageBubble.tsx` imports it), address them there.
<!-- REVIEW-FIX: Clarified that react-markdown ESM concern is a Task 7 issue, not this task's — prevents executor from making unnecessary vitest config changes now -->

---

### Step 3: TDD — `chatService.ts`

**Goal:** Four service functions, TDD Red → Green. The test file establishes the behavioral contract; the implementation satisfies it.
**Dependencies:** Step 1 (`types.ts`) must be complete — the test file imports from it.

#### Step 3.1: Write `chatService.test.ts` — confirm RED

- [ ] Create directory `project/srcs/frontend/src/features/chat/services/`
- [ ] Create `project/srcs/frontend/src/features/chat/services/chatService.test.ts` with the 4 describe blocks below
- [ ] Run `npm run test` — confirm the new suite **fails** with `"Failed to resolve import './chatService'"` (or similar module-not-found error) and all 157 pre-existing tests still pass

**Why RED must be confirmed:** A test that passes before the implementation exists is not testing what you think it is. The import-resolution failure is the correct RED for this case.

```typescript
// project/srcs/frontend/src/features/chat/services/chatService.test.ts

import { describe, it, expect, beforeEach, afterEach } from "vitest"
import MockAdapter from "axios-mock-adapter"
import api from "@/lib/api"
import {
  getEnabledModels,
  createConversation,
  getConversation,
  getMessages,
} from "./chatService"
import type {
  EnabledModelDTO,
  ChatConversationDTO,
  ChatConversationMiniDTO,
  ChatMessageDTO,
  ChatCreateForm,
} from "../types"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockEnabledModel: EnabledModelDTO = {
  id: 2,
  modelId: "openai/gpt-4o",
  name: "GPT-4o",
  isEnabled: true,
}

const mockConversationMini: ChatConversationMiniDTO = {
  id: 12,
  title: "New Conversation 30/06/2026 10:00",
  createdAt: "2026-06-30T10:00:00",
}

const mockConversation: ChatConversationDTO = {
  id: 12,
  title: "New Conversation 30/06/2026 10:00",
  employeeId: 3,
  agentId: null,
  currentModelId: 2,
  createdAt: "2026-06-30T10:00:00",
  updatedAt: "2026-06-30T10:00:00",
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
    createdAt: "2026-06-30T10:00:01",
  },
  {
    id: 2,
    conversationId: 12,
    role: "ASSISTANT",
    content: "The capital of France is Paris.",
    llmModelId: 2,
    inputTokens: 12,
    outputTokens: 9,
    createdAt: "2026-06-30T10:00:03",
  },
]

// ---------------------------------------------------------------------------
// getEnabledModels
// ---------------------------------------------------------------------------

describe("chatService.getEnabledModels", () => {
  let mock: InstanceType<typeof MockAdapter>

  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => {
    mock.restore()
  })

  it("sends GET /llm-model/enabled and returns response.data", async () => {
    mock.onGet("/llm-model/enabled").reply(200, [mockEnabledModel])

    const result = await getEnabledModels()

    expect(mock.history.get).toHaveLength(1)
    expect(mock.history.get[0].url).toBe("/llm-model/enabled")
    expect(result).toEqual([mockEnabledModel])
  })
})

// ---------------------------------------------------------------------------
// createConversation
// ---------------------------------------------------------------------------

describe("chatService.createConversation", () => {
  let mock: InstanceType<typeof MockAdapter>

  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => {
    mock.restore()
  })

  it("POSTs the ChatCreateForm body to /conversation and returns ChatConversationMiniDTO", async () => {
    const form: ChatCreateForm = {
      modelId: 2,
      agentId: null,
      title: "New Conversation 30/06/2026 10:00",
    }

    mock.onPost("/conversation").reply(200, mockConversationMini)

    const result = await createConversation(form)

    expect(mock.history.post).toHaveLength(1)
    expect(mock.history.post[0].url).toBe("/conversation")
    const body = JSON.parse(mock.history.post[0].data as string)
    expect(body).toEqual(form)
    expect(result).toEqual(mockConversationMini)
  })
})

// ---------------------------------------------------------------------------
// getConversation
// ---------------------------------------------------------------------------

describe("chatService.getConversation", () => {
  let mock: InstanceType<typeof MockAdapter>

  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => {
    mock.restore()
  })

  it("sends GET /conversation/{id} and returns ChatConversationDTO", async () => {
    const id = 12

    mock.onGet(`/conversation/${id}`).reply(200, mockConversation)

    const result = await getConversation(id)

    expect(mock.history.get).toHaveLength(1)
    expect(mock.history.get[0].url).toBe(`/conversation/${id}`)
    expect(result).toEqual(mockConversation)
  })
})

// ---------------------------------------------------------------------------
// getMessages
// ---------------------------------------------------------------------------

describe("chatService.getMessages", () => {
  let mock: InstanceType<typeof MockAdapter>

  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => {
    mock.restore()
  })

  it("sends GET /conversation/{id}/messages and returns ChatMessageDTO[]", async () => {
    const conversationId = 12

    mock.onGet(`/conversation/${conversationId}/messages`).reply(200, mockMessages)

    const result = await getMessages(conversationId)

    expect(mock.history.get).toHaveLength(1)
    expect(mock.history.get[0].url).toBe(`/conversation/${conversationId}/messages`)
    expect(result).toEqual(mockMessages)
  })
})
```

#### Step 3.2: Create `chatService.ts` — confirm GREEN

- [ ] Create `project/srcs/frontend/src/features/chat/services/chatService.ts` with the 4 functions below
- [ ] Run `npm run test` — all 4 new tests pass; 157 pre-existing tests unaffected → **161 tests / 29 files GREEN**
- [ ] Run `npm run typecheck` — 0 errors

**Why this step is critical:** `chatService.ts` is the only module that calls the backend directly on behalf of the chat feature. Hooks (`useChatSetup`, `useConversation`) will import and call these functions — any signature mismatch between the test fixtures and the actual service causes runtime failures in the hooks layer above.

```typescript
// project/srcs/frontend/src/features/chat/services/chatService.ts

import api from "@/lib/api"
import type {
  EnabledModelDTO,
  ChatConversationDTO,
  ChatConversationMiniDTO,
  ChatMessageDTO,
  ChatCreateForm,
} from "../types"

export async function getEnabledModels(): Promise<EnabledModelDTO[]> {
  const response = await api.get<EnabledModelDTO[]>("/llm-model/enabled")
  return response.data
}

export async function createConversation(
  form: ChatCreateForm
): Promise<ChatConversationMiniDTO> {
  const response = await api.post<ChatConversationMiniDTO>("/conversation", form)
  return response.data
}

export async function getConversation(id: number): Promise<ChatConversationDTO> {
  const response = await api.get<ChatConversationDTO>(`/conversation/${id}`)
  return response.data
}

export async function getMessages(
  conversationId: number
): Promise<ChatMessageDTO[]> {
  const response = await api.get<ChatMessageDTO[]>(
    `/conversation/${conversationId}/messages`
  )
  return response.data
}
```

#### Edge Cases

1. **`createConversation` with `agentId: null`** — JSON serializes `null` correctly; the backend receives `"agentId": null` and treats it as "no agent." The test fixture uses `agentId: null` explicitly to prove this path works. Never pass `agentId: undefined` — JSON serialization drops `undefined` keys, which would be semantically wrong.
2. **`getEnabledModels` returns `[]`** — Axios returns a `200` with an empty array body; `response.data` is `[]`. The caller (`useChatSetup`) handles the empty-list case by setting `selectedModelId = null`. No error is thrown.
3. **`getConversation` 404** — Axios throws on non-2xx. Callers (`useConversation`) must catch this. The service itself does not catch — following the established no-error-handling-in-service pattern.
4. **`getMessages` 404** — Same as above. The backend returns 404 if the conversation does not exist or is not owned by the authenticated employee.
5. **Template literal URL paths** — `api.ts` sets `baseURL: "/api"`. Axios concatenates this with the relative path. `/conversation/12/messages` becomes `/api/conversation/12/messages`, which Vite proxies to `http://localhost:8080/conversation/12/messages`. No double-slash risk.

---

### Step 4: Create `features/chat/index.ts` barrel stub

**Goal:** Establish the public seam for the chat feature. External consumers import types from here; internal hook and service modules are not re-exported.
**Dependencies:** Step 1 (`types.ts`) must be complete.

- [ ] Create `project/srcs/frontend/src/features/chat/index.ts`
- [ ] Run `npm run typecheck` — 0 errors
- [ ] Run `npm run test` — still 161/29 (no change expected)

**Why this step is critical:** Establishing the barrel now enforces the feature-boundary convention from the first commit. All future consumers of the chat feature (e.g., `ChatPage.tsx` in Task 7) will import from `@/features/chat` — never from `@/features/chat/hooks/useChat` directly. This is the ISP seam: callers depend on the public interface, not internal paths.

#### Implementation

```typescript
// project/srcs/frontend/src/features/chat/index.ts

// Public API of the chat feature.
// Hooks and components are NOT re-exported — consumers import from here only.
// useChat will be added here in Step 6.1 (Task 6) once the hook exists.

export type {
  EnabledModelDTO,
  ChatConversationDTO,
  ChatMessageDTO,
  ChatCreateForm,
  ChatConversationMiniDTO,
} from "./types"
```

#### Edge Cases

1. **`useChat` placeholder** — The comment is intentional. Do NOT add `export { useChat }` yet — the file does not exist and TypeScript will error. The comment is the documentation contract; Task 6 fulfils it.
2. **`export type` vs `export`** — Using `export type` for interface re-exports is correct with TypeScript 5.9 and `isolatedModules: true` (if set) or erasable syntax. Following the pattern established in `features/agents/index.ts` and `features/app-settings/index.ts`.
3. **Services not re-exported** — `chatService.ts` functions are NOT exported from the barrel. This matches the `agents` and `app-settings` patterns where raw service functions stay internal to the feature and are called only by their own hooks.

---

## Design Decisions

**Decision 1:** `EnabledModelDTO` declared feature-locally in `features/chat/types.ts`, not imported from `features/app-settings/types.ts`.
- **Why:** `LlmModelMiniDTO` in `app-settings` has identical shape, but it is owned by the admin feature domain. Importing it in the chat feature creates an implicit coupling: renaming, extending, or removing `LlmModelMiniDTO` from `app-settings` would break the chat feature's contract. Feature-local type ownership is the established project convention (cf. `AgentListDTO` in `agents/types.ts` — no employee type imports). The cost of maintaining two identical interfaces is lower than the cost of cross-feature coupling.
- **Alternatives considered:** Re-exporting `LlmModelMiniDTO` from `app-settings` — rejected (coupling). Extracting to `types/models.ts` shared types — rejected (premature abstraction for two consumers; the shape may diverge as the features evolve).

**Decision 2:** `chatService.ts` uses standalone async exports (no class, no instance).
- **Why:** Follows the pattern of `agentService.ts` and `appSettingsService.ts` exactly. React hooks call these functions directly — no instantiation or DI wiring is needed at the hook boundary. Standalone exports are tree-shakeable and independently testable.
- **Alternatives considered:** An `axios`-based class with methods — rejected (adds OOP ceremony with no benefit; the project never uses service classes).

**Decision 3:** No error handling inside service functions.
- **Why:** Hooks own error state (e.g., `useChatSetup.error`, `useConversation.error`). Adding try/catch inside service functions would shadow errors and prevent hooks from catching and classifying them. The established convention across `appSettingsService.ts`, `agentService.ts`, etc. is: services throw (axios rejects on non-2xx), hooks catch.
- **Alternatives considered:** Wrapping in try/catch and returning `{ data, error }` — rejected (changes the return type, breaks the `async/await` idiom, couples the service to hook error semantics).

**Decision 4:** `ChatCreateForm.agentId` is `number | null` (required), not `agentId?: number`.
- **Why:** Full-state semantics: the caller always explicitly declares whether an agent is selected. `null` = no agent (general conversation). `undefined` would be dropped by `JSON.stringify`, which could cause the backend to use a default or fail validation unpredictably. Mirrors `AgentUpdateForm`'s use of `description: string | null` (required) instead of `description?: string`.
- **Alternatives considered:** Optional `agentId?: number` — rejected (undefined is silently dropped from JSON bodies; null is intentional and correct per the API spec).

**Decision 5:** The `index.ts` barrel exports **types only** at this stage; `useChat` is deferred to Task 6.
- **Why:** `useChat` (Step 6.1) doesn't exist yet. Including a placeholder export that points to a non-existent module would cause TypeScript compilation errors for any file that imports from the barrel. The comment in the barrel documents the contract explicitly so the Task 6 executor knows exactly what to add.
- **Alternatives considered:** Exporting `useChat` as a stub function — rejected (a stub adds surface area and misleads callers into thinking the hook is usable before it's implemented).

**Decision 6:** `react-markdown` v10 (current), not v9.
- **Why:** v10 is the current release (2025-02-20), fully compatible with React >=18 (this project uses 19.2.4). The only breaking change from v9 is the removal of the `className` prop — which Task 7 already accounts for by using wrapping `<div>` elements for styling. No reason to pin to an older version.
- **Alternatives considered:** v9 — rejected (older, no benefit). Installing at exactly v9 to avoid the `className` change — rejected (unnecessary; the feature spec already prescribes the wrapping-div pattern).

---

## Testing Considerations

### Automatic Validation

- [ ] **RED confirmed:** Run `npm run test` before creating `chatService.ts` — the new suite must fail (import error); 157 pre-existing tests must pass
- [ ] **GREEN:** Run `npm run test` after creating `chatService.ts` — **161 tests / 29 files, 0 failures**
- [ ] **Typecheck:** Run `npm run typecheck` from `project/srcs/frontend/` — **0 errors** (after each step)
- [ ] **Build:** Run `npm run build` — succeeds; note bundle delta from `react-markdown` (expected: +20–25 kB gzip)
- [ ] **ESLint:** Run `npx eslint src/features/chat/` from `project/srcs/frontend/` — 0 errors (consistent with the pattern from prior tasks: `npx eslint` on new feature directories is a non-optional post-implementation check)
<!-- REVIEW-FIX: Removed "(optional)" label — ESLint is run as a standard non-optional check on all new frontend feature code (established pattern from agents, app-settings tasks) -->

### Manual Validation

No manual browser validation is required for this task. Types, service functions, and a barrel stub have no UI. The automated test suite fully validates the behavioral contract.

> **Note for future tasks:** `react-markdown` rendering and the `className` wrapping pattern require visual validation in Task 7 (UI components). Document manual checks there, not here.

---

## Related Code Explanations

- `project/srcs/frontend/src/features/app-settings/services/appSettingsService.ts` — canonical standalone-export service; `chatService.ts` replicates this pattern exactly
- `project/srcs/frontend/src/features/app-settings/services/appSettingsService.test.ts` — canonical per-describe MockAdapter test pattern; `chatService.test.ts` replicates this structure
- `project/srcs/frontend/src/features/agents/index.ts` — barrel export pattern; `features/chat/index.ts` follows the same convention
- `project/srcs/frontend/src/lib/api.ts` — Axios singleton; all service functions import this as `api`
- `project/srcs/frontend/src/features/agents/types.ts` — feature-local type ownership pattern that `chat/types.ts` follows

---

## Completion Criteria

- [x] Parent document [[Employee-Chat-Interface]] reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected (`solid-deep-design`, `tdd`, `documentation-management`, `memory-bank`, `find-docs`)
- [x] Up-to-date `react-markdown` documentation confirmed via context7 (v10, React >=18, `npm install react-markdown`, `import Markdown from 'react-markdown'`)
- [x] `project/srcs/frontend/src/features/chat/types.ts` created with 5 interfaces (`EnabledModelDTO`, `ChatConversationDTO`, `ChatMessageDTO`, `ChatCreateForm`, `ChatConversationMiniDTO`)
- [x] `react-markdown` added to `package.json` `"dependencies"` via `npm install react-markdown` (installed `^10.1.0`)
- [x] `project/srcs/frontend/src/features/chat/services/chatService.test.ts` created with 4 describe blocks (one per service function), 4 behavior tests
- [x] RED confirmed: test suite fails on import before `chatService.ts` exists; 157 pre-existing tests unaffected
- [x] `project/srcs/frontend/src/features/chat/services/chatService.ts` created with 4 standalone async exports
- [x] GREEN confirmed: `npm run test` → **161 tests / 29 files, 0 failures, 0 regressions**
- [x] `project/srcs/frontend/src/features/chat/index.ts` barrel stub created, exporting 5 types via `export type`; `useChat` placeholder comment present
- [x] `npm run typecheck` → **0 errors**
- [x] `npm run build` → build succeeds
- [x] `npx eslint src/features/chat/` → **0 errors**
- [x] Parent feature Steps 2.1, 2.2, 2.3, 2.4 checkboxes updated to `[x]`
- [x] Parent feature Task 2 wiki link updated to `[[Employee-Chat-Interface-step-2-chat-service-and-types]]`
