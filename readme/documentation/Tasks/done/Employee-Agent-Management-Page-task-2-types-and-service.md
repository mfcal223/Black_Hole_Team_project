# Task: Agent Types and Service Layer (TDD)

#task #current #low-complexity #parent-employee-agent-management-page

**Parent:** [[Features/to-do/Employee-Agent-Management-Page]]
**Parent Type:** Feature
**Related Step(s):** Phase 2, Steps 2.1, 2.2, 2.3
**Estimated Complexity:** Low

---

## Goal

Create the `features/agents/` feature module's type declarations (`types.ts`) and HTTP service adapter (`agentService.ts`) using test-driven development. After this task, five typed agent interfaces exist and five service functions — `listAgents`, `getAgent`, `createAgent`, `updateAgent`, `deleteAgent` — each have a passing test that verifies the correct HTTP method, path, body, and return type.

---

## Parent Context

The parent feature (`[[Features/to-do/Employee-Agent-Management-Page]]`) defines the agent types module as the contract that all hooks and service functions in `features/agents/` share. The service module is the sole HTTP adapter — it calls the backend `/agent/**` endpoints and returns typed results. It must contain zero business logic.

**From the parent spec (Step 2.1 — types.ts):**
Five interfaces are required: `AgentListDTO` (list-row shape from POST /agent/list), `AgentDTO` (full detail from GET/PUT /agent/{id}), `AgentMiniDTO` (create response from POST /agent), `AgentCreateForm` (body for POST /agent), and `AgentUpdateForm` (body for PUT /agent/{id}). The parent document also proposes re-exporting `PageableRequest` and `PageEnvelope` from `agents/types.ts`; this task follows that proposal — re-exports are included as a feature-boundary convenience for the hook layer (see Design Decision 1 for full rationale). <!-- REVIEW-FIX: removed incorrect claim that this task "deviates" — re-exports are included, not omitted -->

**From the parent spec (Steps 2.2–2.3 — agentService TDD):**
Five public functions, one per endpoint. The test verifies the correct HTTP method, path, request body, and response data. Prior art: `src/features/employees/services/employeeService.test.ts` (axios-mock-adapter pattern).

**Risk from the parent spec:** `listAgents` and `createAgent` both use POST to different paths (`/agent/list` vs. `/agent`). The tests must verify both paths explicitly to prevent path mixup in the implementation.

**Backend API:** Defined in `documentation/Docs/API-Reference/Agent.md`. All `/agent/**` endpoints require `ROLE_EMPLOYEE`. List is automatically scoped to the authenticated employee — no `ownerId` filter is sent from the frontend. PUT is full-state: sending `null` for `description` or `recurrentPrompt` clears those fields.

---

## Preconditions / Dependencies

- Task 1 complete: `src/types/api.ts` exists with `PageableRequest` and `PageEnvelope<T>` (verified 2026-06-29).
- Test baseline: **132/132** across 23 test files (confirmed 2026-06-29).
- `src/features/agents/` directory does **not** exist yet — it will be created in Step 2.1.
- `@/` path alias resolves to `src/` in both `tsconfig.app.json` and `vitest.config.ts`.
- Frontend project is at `project/srcs/frontend/`. All commands run from that directory.

---

## Skills and Documentation Preparation

### Skills Reviewed

| Skill | Selected | Purpose |
|-------|----------|---------|
| `documentation-management` | Yes | Task template and doc placement |
| `solid-deep-design` | Yes | `agentService` is a deep module — 5 public functions hiding all HTTP details |
| `memory-bank` | Yes | Confirmed test baseline, path aliases, prior art locations |
| `tdd` | Yes | RED → GREEN cycle; one test file per module; tests verify public interface only |
| `find-docs` | Not needed | Service pattern is established in codebase; no new library APIs |
| `glossary-management` | Not needed | No new domain terms introduced |

### Documentation Reviewed

- `documentation/Docs/API-Reference/Agent.md` — all five endpoint shapes, schemas for `AgentForm`, `AgentDTO`, `AgentMiniDTO`, `AgentListDTO`
- `documentation/Docs/API-Reference/_Shared-Schemas.md` — `PageableRequest` and pagination envelope shape
- `documentation/Features/to-do/Employee-Agent-Management-Page.md` — Steps 2.1, 2.2, 2.3 spec
- `documentation/Bugs/to-do/Review-Employee-Agent-Management-Page.md` — Finding 4 (no re-export shims) applied to Design Decision 1
- `documentation/ADRs/ADR-009-long-primary-key-for-all-entities.md` — all `id` fields are `number` (Java `Long`)

---

## Related Existing Code

| File | Role |
|------|------|
| `src/types/api.ts` | Canonical `PageableRequest` and `PageEnvelope<T>` — created in Task 1 |
| `src/features/employees/types.ts` | Style reference for agent types file |
| `src/features/employees/services/employeeService.ts` | Prior art for service function shape |
| `src/features/employees/services/employeeService.test.ts` | Canonical prior art for axios-mock-adapter test pattern |
| `src/lib/api.ts` | Axios singleton imported by the service as `api` |

---

## Implementation Details (Approach)

### SOLID + Deep Module Analysis

`agentService.ts` is a **deep module** by design:
- **Interface**: 5 public async functions, typed inputs and outputs. Callers see `listAgents(request) → Promise<PageEnvelope<AgentListDTO>>`, not Axios internals.
- **Implementation**: hides HTTP method selection, URL construction with template literals, body serialization, and `response.data` unwrapping.
- **SRP**: single responsibility — HTTP adaptation only. No validation, no state, no side effects beyond the network call.
- **DIP**: imports the `api` Axios singleton via `@/lib/api`, not `axios` directly. The `api` instance owns base URL, auth header injection, and 401 interception.
- **Deletion test**: deleting `agentService.ts` would scatter 5 Axios calls + 5 URL templates across every hook and component that needs agent data. The module earns its depth.

`types.ts` has a single responsibility too: type contracts for the agents feature boundary. It has no runtime behavior.

### Files to Create / Modify

- [ ] `src/features/agents/types.ts` — **Create** — 5 agent interfaces (no runtime code)
- [ ] `src/features/agents/services/agentService.test.ts` — **Create** — 5 service tests (RED first)
- [ ] `src/features/agents/services/agentService.ts` — **Create** — 5 service functions (GREEN)

---

## Step-by-Step Implementation

### Step 2.1 — Create `src/features/agents/types.ts`

**Goal:** Establish the type contracts for the agents feature. All types are pure TypeScript interfaces — no runtime code.

**Dependencies:** `src/types/api.ts` must exist (Task 1 complete).

- [x] Create directory `src/features/agents/`
- [x] Create directory `src/features/agents/services/`
- [x] Create `src/features/agents/types.ts` with the content below
- [x] Run `npm run typecheck` — confirm 0 errors

#### Implementation

```typescript
// src/features/agents/types.ts

import type { PageableRequest, PageEnvelope } from "@/types/api"
export type { PageableRequest, PageEnvelope }

// Row returned by POST /agent/list. Omits initPrompt and recurrentPrompt —
// fetch the full AgentDTO via GET /agent/{id} when those fields are needed.
export interface AgentListDTO {
  id: number
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
}

// Full detail returned by GET /agent/{id} and PUT /agent/{id}.
// Includes prompt fields omitted from the list row.
export interface AgentDTO {
  id: number
  name: string
  description: string | null
  initPrompt: string
  recurrentPrompt: string | null
  ownerId: number
  createdAt: string
  updatedAt: string
}

// Response from POST /agent (AgentMiniDTO on the backend).
export interface AgentMiniDTO {
  id: number
  name: string
  createdAt: string
}

// Body for POST /agent. name and initPrompt are required (min length 1).
// description and recurrentPrompt are optional — send null when not provided. <!-- REVIEW-FIX: "send null to omit" → "send null when not provided" — null explicitly sets the field to null; "omit" implied skipping the key entirely, which is not the same -->
export interface AgentCreateForm {
  name: string
  description: string | null
  initPrompt: string
  recurrentPrompt: string | null
}

// Body for PUT /agent/{id}. Full-state PUT semantics: all four fields are sent
// unconditionally. Sending null for description or recurrentPrompt clears that field.
export interface AgentUpdateForm {
  name: string
  description: string | null
  initPrompt: string
  recurrentPrompt: string | null
}
```

#### Edge Cases

1. **`id: number` (not `string`)** — ADR-009 establishes that all entity primary keys are Java `Long`, mapped to TypeScript `number`. Never use `string` for agent IDs.
2. **`description: string | null` (not `string | undefined`)** — the backend returns `null` for unset description in list and detail responses. Optional fields use `null`, not `undefined`, because they are always present in the JSON (just as `null`).
3. **`AgentCreateForm` and `AgentUpdateForm` have identical shapes** — this is intentional. They are semantically distinct (POST vs. PUT) and may diverge in future versions (e.g., the backend might add a `startEnabled` flag to create only). Keeping them as separate types avoids a single type alias that conceals the semantic difference.
4. **Re-export scope for `PageableRequest`/`PageEnvelope`** — these types are imported from `@/types/api` and re-exported so the hook layer (Tasks 3–4) can use the feature-local `../types` import path. The re-exports are intentional and declared at module creation time — not a migration shim. The service (`agentService.ts`) imports from `@/types/api` directly (not from `../types`) to keep the service's own dependency graph explicit. Hook-layer files should import from `../types` (the feature boundary), not from `@/types/api` directly. <!-- REVIEW-FIX: renamed from "No re-export" to "Re-export scope" — the title contradicted the implementation code which does include re-exports -->

---

### Step 2.2 RED — Create `src/features/agents/services/agentService.test.ts`

**Goal:** Write 5 failing tests, one per service function. The tests must fail because `agentService.ts` does not exist yet. Confirm RED before proceeding to Step 2.3.

**Dependencies:** Step 2.1 complete.

- [x] Create `src/features/agents/services/agentService.test.ts` with the content below
- [x] Run `npm run test` — confirm **RED**: vitest reports import resolution failure for `"./agentService"` (all 5 tests fail with `"Failed to resolve import"`)

#### Implementation

```typescript
// src/features/agents/services/agentService.test.ts

import { describe, it, expect, beforeEach, afterEach } from "vitest"
import MockAdapter from "axios-mock-adapter"
import api from "@/lib/api"
import { listAgents, getAgent, createAgent, updateAgent, deleteAgent } from "./agentService"
import type { PageableRequest } from "@/types/api"
import type { AgentListDTO, AgentDTO, AgentMiniDTO, AgentCreateForm, AgentUpdateForm } from "../types"

// Shared fixture used by getAgent, updateAgent, and deleteAgent tests.
const mockAgentDTO: AgentDTO = {
  id: 7,
  name: "Research Assistant",
  description: "Finds and summarizes information.",
  initPrompt: "You are a research assistant.",
  recurrentPrompt: "Always cite your reasoning.",
  ownerId: 3,
  createdAt: "2026-06-26T10:00:00",
  updatedAt: "2026-06-26T10:00:00",
}

describe("agentService.listAgents", () => {
  let mock: InstanceType<typeof MockAdapter>

  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => {
    mock.restore()
  })

  it("POSTs the PageableRequest body to /agent/list and returns the PageEnvelope", async () => {
    const request: PageableRequest = {
      page: 0,
      size: 10,
      sort: [{ field: "createdAt", direction: "DESC" }],
      filters: [],
    }

    const mockListDTO: AgentListDTO = {
      id: 7,
      name: "Research Assistant",
      description: "Finds and summarizes information.",
      createdAt: "2026-06-26T10:00:00",
      updatedAt: "2026-06-26T10:00:00",
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

    mock.onPost("/agent/list").reply(200, envelope)

    const result = await listAgents(request)

    expect(mock.history.post).toHaveLength(1)
    expect(mock.history.post[0].url).toBe("/agent/list")
    const body = JSON.parse(mock.history.post[0].data as string)
    expect(body).toEqual(request)
    expect(result).toEqual(envelope)
  })
})

describe("agentService.getAgent", () => {
  let mock: InstanceType<typeof MockAdapter>

  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => {
    mock.restore()
  })

  it("GETs /agent/{id} and returns AgentDTO", async () => {
    const id = 7

    mock.onGet(`/agent/${id}`).reply(200, mockAgentDTO)

    const result = await getAgent(id)

    expect(mock.history.get).toHaveLength(1)
    expect(mock.history.get[0].url).toBe(`/agent/${id}`)
    expect(result).toEqual(mockAgentDTO)
  })
})

describe("agentService.createAgent", () => {
  let mock: InstanceType<typeof MockAdapter>

  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => {
    mock.restore()
  })

  it("POSTs the form body to /agent and returns AgentMiniDTO", async () => {
    const form: AgentCreateForm = {
      name: "Research Assistant",
      description: "Finds and summarizes information.",
      initPrompt: "You are a research assistant.",
      recurrentPrompt: null,
    }

    const mockMiniDTO: AgentMiniDTO = {
      id: 7,
      name: "Research Assistant",
      createdAt: "2026-06-26T10:00:00",
    }

    mock.onPost("/agent").reply(200, mockMiniDTO)

    const result = await createAgent(form)

    expect(mock.history.post).toHaveLength(1)
    expect(mock.history.post[0].url).toBe("/agent")
    const body = JSON.parse(mock.history.post[0].data as string)
    expect(body).toEqual(form)
    expect(result).toEqual(mockMiniDTO)
  })
})

describe("agentService.updateAgent", () => {
  let mock: InstanceType<typeof MockAdapter>

  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => {
    mock.restore()
  })

  it("PUTs the form body to /agent/{id} and returns AgentDTO", async () => {
    const id = 7
    const form: AgentUpdateForm = {
      name: "Research Assistant v2",
      description: null,
      initPrompt: "You are a research assistant. Be concise.",
      recurrentPrompt: "Always cite your reasoning.",
    }

    mock.onPut(`/agent/${id}`).reply(200, mockAgentDTO)

    const result = await updateAgent(id, form)

    expect(mock.history.put).toHaveLength(1)
    expect(mock.history.put[0].url).toBe(`/agent/${id}`)
    const body = JSON.parse(mock.history.put[0].data as string)
    expect(body).toEqual(form)
    expect(result).toEqual(mockAgentDTO)
  })
})

describe("agentService.deleteAgent", () => {
  let mock: InstanceType<typeof MockAdapter>

  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => {
    mock.restore()
  })

  it("DELETEs /agent/{id} and returns the deleted AgentDTO", async () => {
    const id = 7

    mock.onDelete(`/agent/${id}`).reply(200, mockAgentDTO)

    const result = await deleteAgent(id)

    expect(mock.history.delete).toHaveLength(1)
    expect(mock.history.delete[0].url).toBe(`/agent/${id}`)
    expect(result).toEqual(mockAgentDTO)
  })
})
```

#### Edge Cases

1. **`listAgents` vs. `createAgent` path collision** — both use POST, to different paths (`/agent/list` vs. `/agent`). The test explicitly asserts `mock.history.post[0].url` for both to prevent the implementation from posting to the wrong path. axios-mock-adapter matches by URL, so `mock.onPost("/agent/list")` will not match a call to `mock.onPost("/agent")`.
2. **`updateAgent` form includes `description: null`** — the test deliberately passes `null` for an optional field to verify the service serializes `null` correctly (not omitting the key). The backend PUT is full-state; sending `null` clears the field.
3. **`deleteAgent` returns `AgentDTO`** — the backend returns the full deleted record, not just an acknowledgement. The test asserts `result` equals `mockAgentDTO` to confirm the function returns `response.data` (not just `response`).
4. **Per-describe mock isolation** — each `describe` block owns its own `let mock` with `beforeEach` setup and `afterEach` teardown. This prevents one test's mock configuration from leaking into another — identical to the `employeeService.test.ts` pattern.
5. **No `async` in `beforeEach`/`afterEach`** — `new MockAdapter(api)` and `mock.restore()` are synchronous. Do not add `async` to these hooks.

---

### Step 2.3 GREEN — Create `src/features/agents/services/agentService.ts`

**Goal:** Implement the 5 service functions so all tests pass. Run the full test suite to confirm GREEN and zero regressions.

**Dependencies:** Step 2.2 complete (RED confirmed).

- [x] Create `src/features/agents/services/agentService.ts` with the content below
- [x] Run `npm run test` — confirm **GREEN**: 137/137, 0 failures, 0 regressions
- [x] Run `npm run typecheck` — confirm 0 errors
- [x] Run `npm run build` — confirm Vite build succeeds

#### Implementation

```typescript
// src/features/agents/services/agentService.ts

import api from "@/lib/api"
import type { PageableRequest, PageEnvelope } from "@/types/api"
import type { AgentListDTO, AgentDTO, AgentMiniDTO, AgentCreateForm, AgentUpdateForm } from "../types"

export async function listAgents(
  request: PageableRequest
): Promise<PageEnvelope<AgentListDTO>> {
  const response = await api.post<PageEnvelope<AgentListDTO>>("/agent/list", request)
  return response.data
}

export async function getAgent(id: number): Promise<AgentDTO> {
  const response = await api.get<AgentDTO>(`/agent/${id}`)
  return response.data
}

export async function createAgent(form: AgentCreateForm): Promise<AgentMiniDTO> {
  const response = await api.post<AgentMiniDTO>("/agent", form)
  return response.data
}

export async function updateAgent(id: number, form: AgentUpdateForm): Promise<AgentDTO> {
  const response = await api.put<AgentDTO>(`/agent/${id}`, form)
  return response.data
}

export async function deleteAgent(id: number): Promise<AgentDTO> {
  const response = await api.delete<AgentDTO>(`/agent/${id}`)
  return response.data
}
```

#### Edge Cases

1. **`import type` vs. value import for `api`** — `api` is a value (the Axios instance), not a type. It must be imported with `import api from "@/lib/api"` (no `type` keyword). All DTO/interface imports use `import type` so TypeScript can elide them at runtime.
2. **`response.data` unwrapping** — all five functions return `response.data`, not `response`. The Axios `AxiosResponse<T>` wraps the parsed JSON in `.data`. Returning `response` would expose the full response object to callers.
3. **No error handling** — Axios rejects the returned promise on non-2xx responses. The hooks (`useAgentList`, `useCreateAgent`, etc.) catch errors and set `error` state. The service has no knowledge of UI-level error state.
4. **No base URL prefix in paths** — `api` is created with `baseURL: "/api"`, so service paths are relative: `/agent/list`, not `/api/agent/list`. The Vite proxy strips the `/api` prefix when forwarding to the backend.

---

## Design Decisions

**Decision 1: Re-export `PageableRequest`/`PageEnvelope` from `agents/types.ts` as feature-boundary convenience** <!-- REVIEW-FIX: rewrote from "No re-export" (wrong title + draft artifact "Wait — this decision was reconsidered") to accurately reflect the actual decision: re-exports ARE included -->

`agents/types.ts` imports `PageableRequest` and `PageEnvelope<T>` from `@/types/api` and re-exports them. Hook-layer files in `features/agents/` (Tasks 3–4: `useAgentList`, `useCreateAgent`, `useEditAgent`, `useDeleteAgent`) import these shared pagination types from `../types` rather than crossing the feature boundary to `@/types/api`.

**Why this differs from the Finding 4 decision (employees migration):** In the employees migration, the proposed re-export was a compatibility shim left over from a refactoring pass — its purpose was to avoid updating 6 existing consumers. Finding 4 rejected that shim because it perpetuated an accidental coupling. For agents, the re-exports are declared intentionally at module creation time (no prior consumers exist), and they serve a deliberate purpose: keeping all pagination-type imports within the feature module boundary so hook-layer files have a consistent, stable import path (`../types`). This is not a shim; it is a design boundary.

`agentService.ts` itself still imports from `@/types/api` directly. The service sits at the infrastructure boundary (it adapts HTTP responses), so its dependency on the canonical shared types file is explicit and appropriate. Hook-layer files are higher-level consumers; they should see the types through the feature interface.

- **Alternatives:** All agents files import `PageableRequest`/`PageEnvelope` from `@/types/api` directly — rejected because it forces hook-layer files to import from an infrastructure module that is logically external to the feature, creating an inconsistent import pattern compared with the 5 domain-specific types that come from `../types`.

**Decision 2: One test per service function (1:1 test-to-function ratio)**

The `listAgents` test verifies both the outgoing request (URL, method, body) and the incoming response (shape returned by the function) in a single `it()` block. This differs from `employeeService.test.ts` which has two tests for `listEmployees`. One test per function is sufficient for the agent service because each function has exactly one success path and the feature document specifies no error-path service tests.

- **Why:** Keeping one test per function keeps the test count proportional to the surface area. Service tests verify the HTTP adapter contract, not business logic. The feature document explicitly specifies 5 tests (one per function).
- **Alternatives:** Two tests per function (body check + response check separately) — not needed; the single test covers both in one readable assertion sequence.

**Decision 3: Module-level `mockAgentDTO` fixture**

`getAgent`, `updateAgent`, and `deleteAgent` all return `AgentDTO`. A single `mockAgentDTO` constant at module scope is reused across three describe blocks. This mirrors the `mockEmployeeDTO` pattern in the employees test.

- **Why:** Reduces duplication; the fixture shape is identical across the three describes. If `AgentDTO` gains a field, only one fixture needs updating.
- **Alternatives:** Inline the fixture per describe — rejected; creates 3 copies of the same 8-field object.

**Decision 4: `AgentCreateForm` and `AgentUpdateForm` as separate interfaces**

The two forms have identical shapes at the current spec level. They are still declared as separate named types.

- **Why:** They correspond to different HTTP verbs (POST vs. PUT) and the backend may add POST-only fields (e.g., a `duplicate: boolean` flag for cloning) or PUT-only constraints in the future. Separate types prevent a type alias from concealing a semantic distinction that may become structurally significant.
- **Alternatives:** `type AgentUpdateForm = AgentCreateForm` — rejected; too early to collapse two semantically distinct operations.

---

## Testing Considerations

### Automatic Validation

- [x] Run `npm run typecheck` after Step 2.1 — confirm 0 errors (types file only, no consumers yet)
- [x] Run `npm run test` after Step 2.2 — confirm **RED**: 5 new test cases fail with `"Failed to resolve import './agentService'"` (or similar module-not-found error from vitest); existing 132 tests still pass
- [x] Run `npm run test` after Step 2.3 — confirm **GREEN**: **137/137** pass (132 baseline + 5 new), 0 failures, 0 regressions
- [x] Run `npm run typecheck` after Step 2.3 — confirm 0 errors (service implementation matches all type constraints)
- [x] Run `npm run build` after Step 2.3 — confirm Vite build succeeds (bundle size delta expected: ≤ +1 kB from new type declarations; no runtime behavior beyond the 5 service functions)

### Validation results (2026-06-29)

- Step 2.1: `tsc --noEmit` exit 0, 0 errors.
- Step 2.2: vitest failed to resolve `./agentService` — RED confirmed.
- Step 2.3: `npm run test -- --run` → `Test Files  24 passed (24) / Tests  137 passed (137)`. `tsc --noEmit` → 0 errors. `npm run build` → built in 12.52s; bundle `index-CcoYbgDo.js` 538.03 kB / 175.46 kB gzip (delta from prior 537.99 kB: +0.04 kB, well under the ≤+1 kB expectation; the pre-existing 500 kB chunk-size warning is unchanged).

No manual validation required for this task. The service layer has no UI and the tests fully verify all five HTTP adapter behaviors.

---

## Related Code Explanations

- `src/lib/api.ts` — Axios singleton; `baseURL: "/api"`; JWT header injection; 401 → `onUnauthorizedCb()`
- `src/types/api.ts` — `PageableRequest` and `PageEnvelope<T>` (created in Task 1)
- `src/features/employees/services/employeeService.ts` — prior art for standalone async export pattern
- `src/features/employees/services/employeeService.test.ts` — prior art for per-describe `MockAdapter` isolation
- `documentation/Docs/API-Reference/Agent.md` — authoritative backend schema reference

---

## Completion Criteria

- [x] `src/features/agents/types.ts` created with `AgentListDTO`, `AgentDTO`, `AgentMiniDTO`, `AgentCreateForm`, `AgentUpdateForm`, and re-exports of `PageableRequest`/`PageEnvelope` from `@/types/api`
- [x] `src/features/agents/services/agentService.test.ts` created with 5 test describes, each following the per-describe `MockAdapter` isolation pattern; confirmed RED before Step 2.3
- [x] `src/features/agents/services/agentService.ts` created with 5 standalone async export functions matching the type signatures in the parent spec
- [x] All 5 new tests pass after Step 2.3 GREEN
- [x] `npm run typecheck` passes with 0 errors
- [x] `npm run test` passes with **137/137** (132 baseline + 5 new), 0 regressions
- [x] `npm run build` succeeds
- [x] Parent feature Steps 2.1, 2.2, 2.3 marked `[x]` in `documentation/Features/to-do/Employee-Agent-Management-Page.md` with a wiki link to this task document
