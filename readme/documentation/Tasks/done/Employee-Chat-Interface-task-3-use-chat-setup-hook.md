# Task: useChatSetup Hook

#task #current #medium-complexity #parent-employee-chat-interface

**Parent:** [[Employee-Chat-Interface]]
**Parent Type:** Feature
**Related Step(s):** Phase 3, Steps 3.1, 3.2
**Estimated Complexity:** Medium

---

## Goal

Create `features/chat/hooks/useChatSetup.ts` — the hook that prepares all pre-conversation state (available models, the default-model selection, and the employee's agents) before the first message is sent. This hook is the foundation for the model selector and agent selector shown in `ChatEmptyState`.

---

## Parent Context

The parent feature mandates that `useChatSetup` runs **eagerly and unconditionally on every render** — it is never conditional on a conversationId. Its inputs (enabled models, app settings, agents) are phase-independent, so it fetches at mount regardless of whether a conversation exists yet. This design is a deliberate asymmetry: `useConversation` and `useChatSocket` no-op when `conversationId` is `undefined`; `useChatSetup` does not, because making it conditional would reintroduce the Rules-of-Hooks violation identified in the feature review.

Key constraints from the parent:

- `isLoading` covers both models and settings (they are fetched in parallel; `isLoading` turns `false` only when all three parallel fetches — models, settings, agents — have settled).
- `error` is only set when the **models** fetch fails. Settings failure and agents failure both degrade gracefully (no error, empty agents, first-model fallback) because models are the critical dependency; the chat page is unusable without them but can function without agent state.
- The `selectedAgentId` always defaults to `null` (no agent = general conversation) and is never pre-populated from any fetch result.
- Default model selection order: (1) `appSettings.defaultModel.id` if present AND found in `enabledModels` → (2) `enabledModels[0].id` if any models exist → (3) `null`.
- The stale-default edge case: `GET /llm-model/enabled` returns only currently-enabled models. If the admin saved model id=2 as the default and then disabled it, id=2 will be absent from `enabledModels`. The hook must fall back to `enabledModels[0]`, not blindly use the settings default.
- Agents are fetched via `POST /agent/list` with the full `PageableRequest` body `{ page: 0, size: 100, sort: [], filters: [] }` (per `types/api.ts` canonical shape; empty `sort`/`filters` are valid).
- **No `@PreAuthorize` concern on the frontend** — all three endpoints are accessible to authenticated employees; this hook never runs outside an authenticated session.

---

## Preconditions / Dependencies

- **Task 1 (backend `GET /llm-model/enabled`)** is complete and verified GREEN — `getEnabledModels()` calls this endpoint.
- **Task 2 (chat service and types)** is complete and verified GREEN — `features/chat/types.ts`, `features/chat/services/chatService.ts` (`getEnabledModels`, `createConversation`, `getConversation`, `getMessages`), and `features/chat/index.ts` barrel all exist.
- `project/srcs/frontend/src/features/app-settings/services/appSettingsService.ts` — `getAppSettings()` is in place and returns `AppSettingsDTO` (`defaultModel: LlmModelMiniDTO | null`).
- `project/srcs/frontend/src/features/agents/services/agentService.ts` — `listAgents(PageableRequest)` is in place and returns `PageEnvelope<AgentListDTO>`.
- `project/srcs/frontend/src/features/agents/index.ts` barrel exports `AgentListDTO` — the hook imports this type from the barrel.
- `project/srcs/frontend/src/types/api.ts` — `PageableRequest` and `PageEnvelope<T>` canonical shared types.
- Frontend test baseline before this task: **161 tests / 29 files** (`npm run test` passes clean from `project/srcs/frontend/`).
- **All `npm` commands in this task run from `project/srcs/frontend/`** — never from the project root.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `solid-deep-design` — **Selected** — validates module design: `useChatSetup` must be a deep module (small interface, substantial implementation hiding parallel-fetch orchestration, default-model computation, graceful degradation, and `cancelled` cleanup behind 8 return fields).
- `tdd` — **Selected** — TDD is mandatory. Write `useChatSetup.test.ts` first (RED — import fails), then create `useChatSetup.ts` (GREEN). Tests use `renderHook` + `vi.mock` for service calls, verifying observable hook state.
- `documentation-management` — **Selected** — task document creation, parent feature link update.
- `memory-bank` — **Selected** — all Memory Bank files read; confirmed patterns: `Promise.allSettled` not used in existing hooks (project uses individual `try/catch` or `.catch(() => null)`) — but `Promise.allSettled` is the cleanest fit for this hook's partial-failure semantics (see Design Decisions).
- `find-docs` — **Not needed** — no new npm packages; all APIs (`react`, `vitest`, `@testing-library/react`) are established and unchanged from Task 2.
- `glossary-management` — **Not needed** — no new domain terms; "Conversation", "LLM Model", "Agent", "Employee" are established in the glossary.

### Documentation Reviewed

- `documentation/Docs/API-Reference/LlmModels.md` — confirmed `GET /llm-model/enabled` returns `LlmModelMiniDTO[]` (`{ id, modelId, name, isEnabled }`); `isEnabled: true` for all entries.
- `documentation/Docs/API-Reference/AppSettings.md` — confirmed `GET /app-settings` returns `AppSettingsDTO.defaultModel: LlmModelMiniDTO | null`; `null` when no default is configured.
- `documentation/Docs/API-Reference/_Shared-Schemas.md` — confirmed `PageableRequest.sort: []` is a valid empty array (no sorting = unspecified order from backend); same for `filters: []`.
- `project/srcs/frontend/src/features/agents/hooks/useAgentList.test.ts` — **primary TDD prior art**: `renderHook` + `vi.mock` module-factory pattern, `vi.mocked()` for type-safe mock access, `vi.clearAllMocks()` in `beforeEach`, deferred-promise test for in-flight state, `await act(async () => { await Promise.resolve() })` flush pattern.
- `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.ts` — reference for `cancelled` flag cleanup, `isLoading` initialized to `true`, `Promise.all` + error extraction pattern.

### Related Existing Code

- `project/srcs/frontend/src/features/chat/services/chatService.ts` — source of `getEnabledModels()`
- `project/srcs/frontend/src/features/app-settings/services/appSettingsService.ts` — source of `getAppSettings()`; exports: `getAppSettings`, `updateAppSettings`, `listLlmModels`, `createLlmModel`, `toggleLlmModel` (all must appear in the mock factory)
- `project/srcs/frontend/src/features/agents/services/agentService.ts` — source of `listAgents()`; exports: `listAgents`, `getAgent`, `createAgent`, `updateAgent`, `deleteAgent` (all must appear in the mock factory)
- `project/srcs/frontend/src/features/agents/hooks/useAgentList.ts` — reference for `useState`/`useEffect` hook structure pattern
- `project/srcs/frontend/src/features/app-settings/types.ts` — `AppSettingsDTO`, `LlmModelMiniDTO`
- `project/srcs/frontend/src/features/agents/index.ts` — exports `AgentListDTO` (barrel import for the type)
- `project/srcs/frontend/src/types/api.ts` — `PageableRequest`, `PageEnvelope<T>`

---

## Implementation Details

### Approach

**SOLID / Depth analysis:**

| Module | SRP | Depth |
|--------|-----|-------|
| `useChatSetup` | ONE reason to change: pre-chat state requirements change (new selector, different fetch endpoint) | **Deep** — interface: 8 fields (4 values + 2 setters + isLoading + error). Implementation: 3-way parallel fetch via `Promise.allSettled`, default-model computation, stale-default guard, graceful agent degradation, `cancelled` cleanup. |
| `UseChatSetupResult` | Pure interface — the contract | Shallow by design (declaration module) |

**Why `Promise.allSettled` (not `Promise.all` or sequential):**

`Promise.all` rejects immediately on any failure — agents or settings failure would prevent models from being set. Sequential fetches would add latency. `Promise.allSettled` is the right tool: all three fires in parallel, each result is inspected independently, partial success is handled per result. This is the cleanest expression of the spec's "parallel fetch + graceful degradation" requirement.

**Why `cancelled` flag (not `AbortController`):**

Matches the pattern established by `useAppSettings.ts`. `AbortController` adds ceremony without benefit for this use case (no streaming, no large payloads). The `cancelled` flag is set on effect cleanup and checked before any `setState` call after all three promises settle.

**Cross-feature imports:**

`useChatSetup` imports directly from `@/features/app-settings/services/appSettingsService` and `@/features/agents/services/agentService`. These are pragmatic cross-feature service dependencies — the chat feature needs app settings (default model) and agents (agent selector). The agent barrel does not expose `listAgents` publicly (only `useAgentList`, `AgentListDTO`, `AgentDTO`), so a direct service import is appropriate. `AgentListDTO` is imported from the barrel (`@/features/agents`) since it is publicly exported.

**Default model selection logic (in implementation order):**

```
defaultId = settingsResult.value.defaultModel?.id ?? null
defaultInEnabled = defaultId !== null && models.some(m => m.id === defaultId)
initialModelId = defaultInEnabled ? defaultId : (models[0]?.id ?? null)
```

The `?? null` guard on `defaultId` prevents numeric `0` from being treated as "no default" (defensive; backend IDs are positive integers, but null semantics must be explicit).

**Module-level constant `AGENT_PAGE_REQUEST`:**

```typescript
const AGENT_PAGE_REQUEST: PageableRequest = {
  page: 0,
  size: 100,
  sort: [],
  filters: [],
}
```

Declared at module scope (not inside the hook) to prevent object recreation on every hook render. Since the `useEffect` is keyed on `[]`, this makes no functional difference, but it is cleaner and avoids the `exhaustive-deps` lint warning.

### Files to Create/Modify

- [ ] `project/srcs/frontend/src/features/chat/hooks/` — **new directory**
- [ ] `project/srcs/frontend/src/features/chat/hooks/useChatSetup.test.ts` — **new** — 8 behavior tests — **create first (TDD RED)**
- [ ] `project/srcs/frontend/src/features/chat/hooks/useChatSetup.ts` — **new** — the hook implementation

---

## Step-by-Step Implementation

### Step 1: Create `features/chat/hooks/` directory and write the test file (TDD RED)

**Goal:** Write all 8 behavior tests, confirm RED (import fails — the hook file does not yet exist).
**Dependencies:** Task 2 complete — `chatService.ts` and `types.ts` must exist for the test's import paths to resolve (the test imports `getEnabledModels` from `chatService` and `EnabledModelDTO` from `types`).

- [ ] Create directory `project/srcs/frontend/src/features/chat/hooks/`
- [ ] Create `project/srcs/frontend/src/features/chat/hooks/useChatSetup.test.ts` with the content below
- [ ] Run `npm run test` from `project/srcs/frontend/` — confirm RED: new suite **fails** with `"Failed to resolve import './useChatSetup'"` and all 161 pre-existing tests still pass

**Why RED must be confirmed:** A test that passes before the implementation exists is not testing what you think it is. The import-resolution failure is the correct RED for this case.

#### Implementation

```typescript
// project/srcs/frontend/src/features/chat/hooks/useChatSetup.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useChatSetup } from "./useChatSetup"
import { getEnabledModels } from "../services/chatService"
import { getAppSettings } from "@/features/app-settings/services/appSettingsService"
import { listAgents } from "@/features/agents/services/agentService"
import type { EnabledModelDTO } from "../types"
import type { AgentListDTO } from "@/features/agents"
import type { AppSettingsDTO } from "@/features/app-settings/types"
import type { PageEnvelope } from "@/types/api"

// Mock all exports from each service module.
// The module-factory string-path pattern is hoisted before imports by Vitest.
// Include every export of each module — not just what this hook uses — to
// avoid "module does not provide an export named '...'" errors from other
// test files that share the same mock registry in the same Vitest run.
vi.mock("../services/chatService", () => ({
  getEnabledModels: vi.fn(),
  createConversation: vi.fn(),
  getConversation: vi.fn(),
  getMessages: vi.fn(),
}))

vi.mock("@/features/app-settings/services/appSettingsService", () => ({
  getAppSettings: vi.fn(),
  updateAppSettings: vi.fn(),
  listLlmModels: vi.fn(),
  createLlmModel: vi.fn(),
  toggleLlmModel: vi.fn(),
}))

vi.mock("@/features/agents/services/agentService", () => ({
  listAgents: vi.fn(),
  getAgent: vi.fn(),
  createAgent: vi.fn(),
  updateAgent: vi.fn(),
  deleteAgent: vi.fn(),
}))

// vi.mocked() requires the imported value — use value import (not import type) for vi.mocked() calls.
const mockGetEnabledModels = vi.mocked(getEnabledModels)
const mockGetAppSettings = vi.mocked(getAppSettings)
const mockListAgents = vi.mocked(listAgents)

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockModels: EnabledModelDTO[] = [
  { id: 2, modelId: "openai/gpt-4o", name: "GPT-4o", isEnabled: true },
  { id: 3, modelId: "anthropic/claude-3-5-sonnet", name: "Claude 3.5 Sonnet", isEnabled: true },
]

// mockAppSettings.defaultModel.id = 2 → matches mockModels[0]
const mockAppSettings: AppSettingsDTO = {
  id: 1,
  openRouterApiKey: "****abcd",
  defaultModel: { id: 2, modelId: "openai/gpt-4o", name: "GPT-4o", isEnabled: true },
  updatedAt: "2026-07-01T10:00:00",
  updatedByUsername: "admin",
}

const mockAgents: AgentListDTO[] = [
  {
    id: 1,
    name: "Support Agent",
    description: "Handles support queries",
    createdAt: "2026-07-01T10:00:00",
    updatedAt: "2026-07-01T10:00:00",
  },
]

function makeAgentEnvelope(
  content: AgentListDTO[] = mockAgents
): PageEnvelope<AgentListDTO> {
  return {
    content,
    totalElements: content.length,
    totalPages: 1,
    number: 0,
    size: 100,
    first: true,
    last: true,
    empty: content.length === 0,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useChatSetup", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Happy-path defaults — each test overrides only what it needs
    mockGetEnabledModels.mockResolvedValue(mockModels)
    mockGetAppSettings.mockResolvedValue(mockAppSettings)
    mockListAgents.mockResolvedValue(makeAgentEnvelope())
  })

  // ── Test 1: Pre-selects default model ────────────────────────────────────────
  it("pre-selects the default model from app settings when it is in the enabled list", async () => {
    const { result } = renderHook(() => useChatSetup())

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.selectedModelId).toBe(2)
    expect(result.current.enabledModels).toEqual(mockModels)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  // ── Test 2: Falls back to first model when no default is configured ───────────
  it("selects the first enabled model when app settings has no default model", async () => {
    mockGetAppSettings.mockResolvedValue({ ...mockAppSettings, defaultModel: null })

    const { result } = renderHook(() => useChatSetup())

    await act(async () => {
      await Promise.resolve()
    })

    // No default → fall back to first in the returned list (mockModels[0].id = 2)
    expect(result.current.selectedModelId).toBe(mockModels[0].id)
  })

  // ── Test 3: Falls back to first model when saved default is stale ─────────────
  it("selects the first enabled model when the saved default model id is not in the enabled list", async () => {
    mockGetAppSettings.mockResolvedValue({
      ...mockAppSettings,
      defaultModel: { id: 99, modelId: "stale/model", name: "Stale Model", isEnabled: false },
    })

    const { result } = renderHook(() => useChatSetup())

    await act(async () => {
      await Promise.resolve()
    })

    // id 99 is not present in mockModels (ids 2 and 3) → fall back to first
    expect(result.current.selectedModelId).toBe(mockModels[0].id)
  })

  // ── Test 4: Null when no models available ────────────────────────────────────
  it("sets selectedModelId to null when no enabled models are available", async () => {
    mockGetEnabledModels.mockResolvedValue([])
    mockGetAppSettings.mockResolvedValue({ ...mockAppSettings, defaultModel: null })

    const { result } = renderHook(() => useChatSetup())

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.selectedModelId).toBeNull()
    expect(result.current.enabledModels).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  // ── Test 5: Agents list populates correctly ───────────────────────────────────
  it("populates the agents list and sends the full PageableRequest body to the agent endpoint", async () => {
    const { result } = renderHook(() => useChatSetup())

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.agents).toEqual(mockAgents)
    expect(mockListAgents).toHaveBeenCalledOnce()
    expect(mockListAgents).toHaveBeenCalledWith({
      page: 0,
      size: 100,
      sort: [],
      filters: [],
    })
  })

  // ── Test 6: Agent fetch failure degrades gracefully ───────────────────────────
  it("degrades to empty agents list without setting error when agent fetch fails", async () => {
    mockListAgents.mockRejectedValue(new Error("Network error"))

    const { result } = renderHook(() => useChatSetup())

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.agents).toEqual([])
    expect(result.current.error).toBeNull()
    // Models and model selection still work — agent failure is non-critical
    expect(result.current.selectedModelId).toBe(2)
    expect(result.current.isLoading).toBe(false)
  })

  // ── Test 7: isLoading transitions ─────────────────────────────────────────────
  it("isLoading is true before all fetches settle and false once they have all settled", async () => {
    let resolveModels!: (value: EnabledModelDTO[]) => void
    mockGetEnabledModels.mockImplementationOnce(
      () =>
        new Promise<EnabledModelDTO[]>((resolve) => {
          resolveModels = resolve
        })
    )

    const { result } = renderHook(() => useChatSetup())

    // Before any fetch settles: isLoading must be true (useState initialised to true)
    expect(result.current.isLoading).toBe(true)

    // Resolve the deferred models promise — all three promises are now settled
    await act(async () => {
      resolveModels(mockModels)
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.selectedModelId).toBe(2)
  })

  // ── Test 8: Models fetch failure sets error ────────────────────────────────────
  it("sets error and leaves enabledModels empty when the enabled models fetch fails", async () => {
    mockGetEnabledModels.mockRejectedValue(new Error("Service unavailable"))

    const { result } = renderHook(() => useChatSetup())

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.error).not.toBeNull()
    expect(result.current.enabledModels).toEqual([])
    expect(result.current.selectedModelId).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })
})
```

#### Edge Cases

1. **`vi.clearAllMocks()` in `beforeEach`** — clears call history and resets mock state. Does NOT remove `mockResolvedValue` implementations — each test must override any mock whose default happy-path setup is wrong for it (e.g., Test 4 overrides `mockGetEnabledModels` to return `[]`).
2. **Module factory includes ALL exports** — `vi.mock` replaces the entire module. If a module export is not listed in the factory, any file that imports it in the same Vitest process will get `undefined`. This is why all 5 exports of `agentService` and all 5 of `appSettingsService` appear even though `useChatSetup` only uses one from each.
3. **`await Promise.resolve()` flush** — This flushes one microtask queue cycle, which is sufficient when all mock values are `mockResolvedValue`/`mockRejectedValue` (already-settled promises). `Promise.allSettled` with 3 already-settled inputs also resolves in one microtask tick. If a future test becomes flaky (state update missed), escalate to `await new Promise(r => setTimeout(r, 0))` inside `act`.

---

### Step 2: Create `useChatSetup.ts` (TDD GREEN)

**Goal:** Implement the hook so all 8 tests pass. No code beyond what the tests require.
**Dependencies:** Step 1 (test file + RED confirmed). `types.ts`, `chatService.ts`, `appSettingsService.ts`, `agentService.ts` must all exist.

- [ ] Create `project/srcs/frontend/src/features/chat/hooks/useChatSetup.ts` with the content below
- [ ] Run `npm run test` from `project/srcs/frontend/` — confirm GREEN: **169 tests / 30 files, 0 failures**
- [ ] Run `npm run typecheck` from `project/srcs/frontend/` — 0 errors
- [ ] Run `npx eslint src/features/chat/` from `project/srcs/frontend/` — 0 errors (note: the `eslint-disable-next-line react-hooks/exhaustive-deps` on the `useEffect([], [])` is standard project pattern, not a new suppression)

**Why this step is critical:** `useChatSetup` is the foundation for `useChat` (Task 6). Its fixed-shape return interface defines the contract that `useChat` spreads into its own return object. Getting the model selection logic correct here prevents subtle UI bugs where the selector pre-selects the wrong model (stale FK, disabled default, empty list).

#### Implementation

```typescript
// project/srcs/frontend/src/features/chat/hooks/useChatSetup.ts

import { useState, useEffect } from "react"
import { getEnabledModels } from "../services/chatService"
import { getAppSettings } from "@/features/app-settings/services/appSettingsService"
import { listAgents } from "@/features/agents/services/agentService"
import type { EnabledModelDTO } from "../types"
import type { AgentListDTO } from "@/features/agents"
import type { PageableRequest } from "@/types/api"

export interface UseChatSetupResult {
  selectedModelId: number | null
  setSelectedModelId: (id: number | null) => void
  selectedAgentId: number | null
  setSelectedAgentId: (id: number | null) => void
  enabledModels: EnabledModelDTO[]
  agents: AgentListDTO[]
  isLoading: boolean
  error: string | null
}

// Module-level constant avoids object recreation on every hook render.
const AGENT_PAGE_REQUEST: PageableRequest = {
  page: 0,
  size: 100,
  sort: [],
  filters: [],
}

export function useChatSetup(): UseChatSetupResult {
  const [enabledModels, setEnabledModels] = useState<EnabledModelDTO[]>([])
  const [agents, setAgents] = useState<AgentListDTO[]>([])
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null)
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function setup() {
      setIsLoading(true)
      setError(null)

      const [modelsResult, settingsResult, agentsResult] = await Promise.allSettled([
        getEnabledModels(),
        getAppSettings(),
        listAgents(AGENT_PAGE_REQUEST),
      ])

      if (cancelled) return

      // Models are critical — if they fail, the chat page cannot function
      if (modelsResult.status === "rejected") {
        const err = modelsResult.reason
        setError(
          err instanceof Error ? err.message : "Failed to load available models."
        )
        setIsLoading(false)
        return
      }

      const models = modelsResult.value

      // Settings failure is non-critical: fall back to first-model selection
      const defaultId =
        settingsResult.status === "fulfilled"
          ? (settingsResult.value.defaultModel?.id ?? null)
          : null

      // Guard stale FK: defaultId must appear in the enabled list; otherwise fall back
      const defaultInEnabled =
        defaultId !== null && models.some((m) => m.id === defaultId)
      const initialModelId = defaultInEnabled ? defaultId : (models[0]?.id ?? null)

      // Agents are non-critical — failure degrades to empty list, no error
      const agentList =
        agentsResult.status === "fulfilled" ? agentsResult.value.content : []

      setEnabledModels(models)
      setSelectedModelId(initialModelId)
      setAgents(agentList)
      setIsLoading(false)
    }

    void setup()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    selectedModelId,
    setSelectedModelId,
    selectedAgentId,
    setSelectedAgentId,
    enabledModels,
    agents,
    isLoading,
    error,
  }
}
```

#### Edge Cases

1. **Stale-default guard** — `defaultId !== null && models.some(m => m.id === defaultId)`. The `defaultId !== null` guard is required; without it, `models.some(m => m.id === null)` would always be `false` (IDs are positive integers), which is correct but relies on backend invariants. Explicit null guard is defensive and self-documenting.
2. **`models[0]?.id ?? null`** — Optional chaining needed: if `models` is `[]`, `models[0]` is `undefined`; accessing `.id` on `undefined` without `?.` throws a TypeError. The `?? null` converts `undefined` to `null` explicitly.
3. **`if (cancelled) return` placement** — Must appear AFTER `await Promise.allSettled(...)`, before any `setState` calls. If it were before the `await`, it would never catch the unmount-during-fetch case. If it were after individual `setState` calls, some state would be set on an unmounted component.
4. **`setIsLoading(true)` at the start of `setup()`** — Redundant on the initial mount (initialized to `true`), but makes `setup()` safe for a future `refresh()` function that would re-enter from `isLoading: false`.
5. **`Promise.allSettled` and React StrictMode** — In React 18 StrictMode, effects run twice (mount → unmount → remount). The `cancelled` flag ensures the first mount's `setup()` result is discarded on unmount. The second mount's `setup()` fires fresh. This is the correct behavior and is consistent with the `useAppSettings` cleanup pattern.

---

## Design Decisions

**Decision 1:** `Promise.allSettled` for the three-way parallel fetch.
- **Why:** `Promise.all` rejects on the first failure; agent failure would kill model loading. Sequential `await` would add unnecessary latency (no data dependency between the three calls). `Promise.allSettled` is the most honest expression of the spec: fire all three in parallel, inspect each result independently, derive composite state.
- **Alternatives considered:** `Promise.all` with `.catch(() => null)` per call — achieves the same result but loses the typed `PromiseSettledResult<T>` discriminant; the `status: "fulfilled" | "rejected"` field is clearer than checking for null. Three sequential `try/catch` blocks — verbose and adds latency (300ms–500ms sequential vs ~100ms parallel in production).

**Decision 2:** `isLoading` initialized to `true`, not `false`.
- **Why:** The fetch fires on mount unconditionally. Initializing to `false` would cause a brief render where `ChatEmptyState` shows the model selector with empty options (isLoading: false, enabledModels: []) before the fetch completes — a visual glitch. Initializing to `true` suppresses the selector until data is available.
- **Alternatives considered:** Initialize to `false`, set `true` at the start of `setup()` — this creates a one-render window where `isLoading === false` and `enabledModels === []` is visible. Rejected (visual glitch). Initialize to `false`, show skeleton immediately — rejected (the parent spec shows a loading state, not a skeleton).

**Decision 3:** `error` is only set on models failure; agent and settings failure degrade silently.
- **Why:** The parent spec is explicit: `error: string | null — error message if models fetch fails`. Models are the only critical dependency — the chat page is unusable without them (no model to send the message with). Agent fetch failure → agent selector is empty/disabled, which is a valid degraded state. Settings fetch failure → default model selection is unavailable, falls back to first model, which is a valid degraded state.
- **Alternatives considered:** Set `error` on settings failure too — rejected (the selector would still work with a first-model fallback; showing an error when the page is still usable would confuse the user). Set `error` on agent failure — rejected (the parent spec explicitly says agent failure degrades gracefully).

**Decision 4:** `selectedAgentId` defaults to `null` and is never pre-populated from a fetch.
- **Why:** The parent spec mandates "The agent selector defaults to 'No agent' (general conversation)." `null` is the canonical "no agent" value per `ChatCreateForm.agentId: number | null`. Pre-populating to the first agent would override the user's intent for a general conversation.
- **Alternatives considered:** Pre-populate with `agents[0].id` if any agents exist — rejected (changes default behavior to "always use first agent", which is wrong). Add a `defaultAgent` field to `AppSettings` — rejected (out of scope for this feature; the spec is clear about the default).

**Decision 5:** Cross-feature service imports (not barrel imports) for `getAppSettings` and `listAgents`.
- **Why:** `getAppSettings` is not re-exported from the `app-settings` barrel (`features/app-settings/index.ts` only exports hooks and types). `listAgents` is not re-exported from the `agents` barrel (`features/agents/index.ts` only exports `useAgentList`, `AgentListDTO`, `AgentDTO`). Direct service imports are the only practical option without modifying the other features' public APIs. The cost (one direct cross-feature import per dependency) is lower than the cost of adding service function exports to both barrels for a single consumer.
- **Alternatives considered:** Add `listAgents` to the agents barrel — rejected (premature; barrels expose hooks, not raw services); add a new chat-owned agent service wrapper — rejected (wrapping `listAgents` in `chatService.ts` just to re-export it adds a shallow pass-through with no value).

**Decision 6:** Module-level `AGENT_PAGE_REQUEST` constant.
- **Why:** The `PageableRequest` object for agent listing never changes. Declaring it inside the hook body would create a new object reference on every hook render (even though the `useEffect` is keyed on `[]` and only fires on mount). The module-level constant is the correct scope — it is created once, shared across all instances, and makes the intent clear (this is a fixed protocol, not a configurable request).
- **Alternatives considered:** `useMemo(() => ...)` — rejected (over-engineering a constant; `useMemo` is for computationally expensive derivations, not literal constant declarations). Inline object literal in the `listAgents()` call — rejected (less readable; intent less obvious).

---

## Testing Considerations

### Automatic Validation

- [ ] **RED confirmed:** Run `npm run test` from `project/srcs/frontend/` before creating `useChatSetup.ts` — the new suite must fail with `"Failed to resolve import './useChatSetup'"` while all 161 pre-existing tests still pass
- [ ] **GREEN:** Run `npm run test` after creating `useChatSetup.ts` — **169 tests / 30 files, 0 failures, 0 regressions**
- [ ] **Typecheck:** Run `npm run typecheck` from `project/srcs/frontend/` — **0 errors**
- [ ] **ESLint:** Run `npx eslint src/features/chat/` from `project/srcs/frontend/` — 0 errors (the `// eslint-disable-next-line react-hooks/exhaustive-deps` on the `useEffect([], [])` is a standard project pattern matching `useAgentList.ts` and `useAppSettings.ts` — not a new suppression being introduced)

### Manual Validation

No manual browser validation is required for this task. `useChatSetup` is a data hook with no UI. The automated test suite fully validates all observable behaviors. Visual validation of the model selector and agent selector is deferred to Task 7 (UI components).

---

## Related Code Explanations

- `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.ts` — reference for `cancelled` flag, `isLoading: true` init, `Promise.all` + graceful degradation pattern
- `project/srcs/frontend/src/features/agents/hooks/useAgentList.ts` — reference for `useState`/`useEffect` hook structure, `vi.mock` module-factory TDD pattern
- `project/srcs/frontend/src/features/agents/hooks/useAgentList.test.ts` — **primary TDD prior art**: `renderHook` + `vi.mock`, `vi.mocked()`, `beforeEach` happy-path default, deferred-promise test for in-flight state
- `project/srcs/frontend/src/features/chat/services/chatService.ts` — source of `getEnabledModels` used in Step 1 and Step 2

---

## Completion Criteria

- [x] Parent document [[Employee-Chat-Interface]] reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected (`solid-deep-design`, `tdd`, `documentation-management`, `memory-bank`)
- [x] `project/srcs/frontend/src/features/chat/hooks/` directory created
- [x] `project/srcs/frontend/src/features/chat/hooks/useChatSetup.test.ts` created with 8 behavior tests
- [x] RED confirmed: `npm run test` fails with import error on `useChatSetup`; 161 pre-existing tests unaffected
- [x] `project/srcs/frontend/src/features/chat/hooks/useChatSetup.ts` created with `UseChatSetupResult` interface and `useChatSetup()` function
- [x] GREEN confirmed: `npm run test` → **169 tests / 30 files, 0 failures, 0 regressions**
- [x] `npm run typecheck` → **0 errors**
- [x] `npx eslint src/features/chat/` → 0 errors
- [x] Parent feature Steps 3.1 and 3.2 checkboxes updated to `[x]`
- [x] Parent feature Task 3 wiki link updated to `[[Employee-Chat-Interface-task-3-use-chat-setup-hook]]`
