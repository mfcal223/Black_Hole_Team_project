# Task: Modal Hooks (TDD) — `useCreateAgent`, `useEditAgent`, `useDeleteAgent`, `useAgentModals`

#task #current #medium-complexity #parent-employee-agent-management-page

**Parent:** [[Features/to-do/Employee-Agent-Management-Page]]
**Parent Type:** Feature
**Related Step(s):** Phase 4, Steps 4.1, 4.2, 4.3, 4.4
**Estimated Complexity:** Medium

---

## Goal

Create the four modal hooks for the Agents page via TDD. `useCreateAgent`, `useEditAgent`, and `useDeleteAgent` each own their form state and API call and are tested with RED→GREEN cycles. `useAgentModals` is trivial state with no logic and requires no tests. After this task, all modal business logic is isolated behind typed hook interfaces, leaving the modal components (Task 5) as thin composition layers.

---

## Parent Context

The parent feature (`[[Features/to-do/Employee-Agent-Management-Page]]`) defines four modal hooks in Phase 4. Together they follow the established pattern from `features/employees/` modal hooks, with one significant new pattern: `useEditAgent` has a two-phase lifecycle — it must call `GET /agent/{id}` on mount to load `initPrompt` and `recurrentPrompt`, which are absent from `AgentListDTO`. This is a new pattern not present in `useEditEmployee`.

**Parent spec for each hook (Section 7–9 of feature doc):**

`useCreateAgent(onSuccess)`:
- Interface (11 members): `name`, `setName`, `description`, `setDescription`, `initPrompt`, `setInitPrompt`, `recurrentPrompt`, `setRecurrentPrompt`, `isSubmitting`, `error`, `onSubmit`
- `onSubmit` sends `{ name, description: description || null, initPrompt, recurrentPrompt: recurrentPrompt || null }`
- Empty optional fields are sent as `null` (backend full-state semantics)

`useEditAgent(agent: AgentListDTO, onSuccess)`:
- Interface (14 members): `isLoadingData`, `loadError`, `name`, `setName`, `description`, `setDescription`, `initPrompt`, `setInitPrompt`, `recurrentPrompt`, `setRecurrentPrompt`, `isSubmitting`, `error`, `onSave`
- On mount: calls `getAgent(agent.id)` to load `initPrompt` and `recurrentPrompt`
- `name` and `description` pre-filled immediately from `AgentListDTO`; `description ?? ""` coalescing (Finding 2 from `[[Bugs/to-do/Review-Employee-Agent-Management-Page]]`)
- `onSave` sends `{ name, description: description || null, initPrompt, recurrentPrompt: recurrentPrompt || null }`

`useDeleteAgent(agent: AgentListDTO, onSuccess)`:
- Interface (5 members): `isChecked`, `setIsChecked`, `isSubmitting`, `error`, `onConfirm`
- `onConfirm` is a no-op if `isChecked` is false
- On success: invokes `onSuccess`

`useAgentModals()`:
- Interface (6 members): `editAgent`, `setEditAgent`, `deleteAgent`, `setDeleteAgent`, `createOpen`, `setCreateOpen`
- No tests — trivial state, no logic; mirrors `useEmployeeModals`

**Pending review findings (from `[[Bugs/to-do/Review-Employee-Agent-Management-Page]]`):**
- **Finding 1** (🟡 Moderate — Pending): Sidebar icon conflict — Agents item uses `MessageSquare` (same as Conversations). Affects **Task 6** (`Sidebar.tsx`). This task is not affected.
- **Finding 2** (🟢 Low — Pending): `useEditAgent` must coalesce `description: null → ""` on initialization and `recurrentPrompt: null → ""` after `getAgent` resolves. **This task addresses Finding 2** by applying explicit `?? ""` coalescing in the implementation and verifying it in tests.

---

## Preconditions / Dependencies

- Task 1 complete: `src/types/api.ts` with `PageableRequest` and `PageEnvelope<T>` (executed 2026-06-29)
- Task 2 complete: `src/features/agents/types.ts` (all 5 interfaces) and `src/features/agents/services/agentService.ts` (5 service functions) (executed 2026-06-29)
- Task 3 complete: `src/features/agents/hooks/useAgentList.ts` + `.test.ts` + `src/features/agents/index.ts` (executed 2026-06-29)
- Test baseline: **143/143** across 25 test files (confirmed 2026-06-29)
- `src/features/agents/hooks/` directory already exists from Task 3
- No `useCreateAgent.ts`, `useEditAgent.ts`, `useDeleteAgent.ts`, `useAgentModals.ts` exist yet
- Frontend project root: `project/srcs/frontend/`. All commands run from that directory.

---

## Skills and Documentation Preparation

### Skills Reviewed

| Skill | Selected | Purpose |
|-------|----------|---------|
| `documentation-management` | Yes | Task template and doc placement |
| `solid-deep-design` | Yes | Deep module analysis; SRP per hook; DIP via service mocking |
| `memory-bank` | Yes | Confirmed baseline, path aliases, prior art locations |
| `tdd` | Yes | RED → GREEN per hook; behavior tests through public interfaces |
| `find-docs` | Not needed | All patterns established in codebase; no new library APIs |
| `glossary-management` | Not needed | No new domain terms introduced |

### Documentation Reviewed

- `documentation/Features/to-do/Employee-Agent-Management-Page.md` — Sections 7, 8, 9, 10 (hook specs)
- `documentation/Bugs/to-do/Review-Employee-Agent-Management-Page.md` — Finding 2 (null coalescing for `useEditAgent`)
- `documentation/ADRs/ADR-009-long-primary-key-for-all-entities.md` — `id: number` (Java Long → TypeScript number)
- `documentation/ADRs/ADR-008-agent-prompts-not-persisted-as-messages.md` — `initPrompt` / `recurrentPrompt` semantics

### Related Existing Code

| File | Role |
|------|------|
| `src/features/agents/types.ts` | `AgentListDTO`, `AgentDTO`, `AgentMiniDTO`, `AgentCreateForm`, `AgentUpdateForm` |
| `src/features/agents/services/agentService.ts` | `createAgent`, `getAgent`, `updateAgent`, `deleteAgent` — the service functions each hook calls |
| `src/features/agents/hooks/useAgentList.ts` | Established hook patterns: `fetchAgents`, error extraction, `setError(null)` before `await` |
| `src/features/employees/hooks/useCreateEmployee.ts/.test.ts` | Prior art: form state + submit + error extraction + `vi.mock` factory pattern |
| `src/features/employees/hooks/useEditEmployee.ts/.test.ts` | Prior art: prop-initialized form fields, no-op save check |
| `src/features/employees/hooks/useDeleteEmployee.ts/.test.ts` | Prior art: checkbox guard, `isChecked` preserved on failure |
| `src/features/employees/hooks/useEmployeeModals.ts` | Prior art for `useAgentModals` structure |

---

## Implementation Details

### Approach

Each modal hook is a **deep module**:
- Small, stable interface (setters + status + action)
- Hides all form `useState` slots, service call, error extraction, loading flag, and `onSuccess` wiring
- **SRP**: one reason to change per hook — how a single CRUD operation (create / edit / delete) is submitted
- **DIP**: imports service functions from `"../services/agentService"` (the infrastructure adapter); tests mock the service to verify hook behavior in isolation

`useEditAgent` is the only hook with a new pattern: a two-phase lifecycle (async load on mount before the form is usable). No other hooks in the codebase have this. The load phase uses a separate `isLoadingData` flag and `loadError` field, distinct from the submission `isSubmitting` and `error` fields.

`useAgentModals` mirrors `useEmployeeModals` exactly — 3 `useState` pairs grouping the page's modal open/close state into one SRP unit.

### Files to Create / Modify

- [ ] `src/features/agents/hooks/useCreateAgent.test.ts` — **Create** — 4 behavior tests (RED first)
- [ ] `src/features/agents/hooks/useCreateAgent.ts` — **Create** — create form hook (GREEN)
- [ ] `src/features/agents/hooks/useEditAgent.test.ts` — **Create** — 6 behavior tests (RED first)
- [ ] `src/features/agents/hooks/useEditAgent.ts` — **Create** — edit form hook with mount-load (GREEN)
- [ ] `src/features/agents/hooks/useDeleteAgent.test.ts` — **Create** — 4 behavior tests (RED first)
- [ ] `src/features/agents/hooks/useDeleteAgent.ts` — **Create** — delete confirmation hook (GREEN)
- [ ] `src/features/agents/hooks/useAgentModals.ts` — **Create** — modal open/close state hook (no tests)

`src/features/agents/index.ts` is **not modified** — modal hooks are internal and intentionally not exported.

---

## Step-by-Step Implementation

### Step 4.1 RED → GREEN — `useCreateAgent`

**Goal:** TDD `useCreateAgent` — 4 tests covering initialization, successful submit (all fields), null-conversion of empty optional fields, and failure path.
**Dependencies:** Task 2 complete (`agentService.ts` and `types.ts` exist).

- [ ] Create `src/features/agents/hooks/useCreateAgent.test.ts` with the content below
- [ ] Run `npm run test` — confirm **RED**: 4 new tests fail with import resolution failure for `"./useCreateAgent"`; existing 143 tests still pass
- [ ] Create `src/features/agents/hooks/useCreateAgent.ts` with the content below
- [ ] Run `npm run test` — confirm **GREEN**: **147/147** (143 + 4 new), 0 failures, 0 regressions
- [ ] Run `npm run typecheck` — confirm 0 errors

**Why this step is critical:**
`useCreateAgent` is the simplest modal hook. Completing it GREEN first establishes the pattern (error extraction, `description || null`, `onSubmit` lifecycle) for the more complex hooks that follow.

#### Test File

```typescript
// src/features/agents/hooks/useCreateAgent.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useCreateAgent } from "./useCreateAgent"
import { createAgent } from "../services/agentService"
import type { AgentMiniDTO } from "../types"

// Mock all service exports to prevent HTTP leaks from any function in the module.
// The module factory pattern (string path + factory function) is hoisted before
// imports by Vitest — this is the established pattern in this codebase.
vi.mock("../services/agentService", () => ({
  listAgents: vi.fn(),
  getAgent: vi.fn(),
  createAgent: vi.fn(),
  updateAgent: vi.fn(),
  deleteAgent: vi.fn(),
}))

// createAgent imported as a value (not import type) — required by verbatimModuleSyntax: true
// because vi.mocked(createAgent) needs the runtime function reference, not an erased type.
const mockCreateAgent = vi.mocked(createAgent)

const mockAgentMiniDTO: AgentMiniDTO = {
  id: 1,
  name: "My Test Agent",
  createdAt: "2026-01-01T00:00:00Z",
}

describe("useCreateAgent", () => {
  const onSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateAgent.mockResolvedValue(mockAgentMiniDTO)
  })

  // ── Test 1: Initialization ─────────────────────────────────────────────────────
  it("initializes all form fields to empty strings and status flags to clean state", () => {
    const { result } = renderHook(() => useCreateAgent(onSuccess))

    expect(result.current.name).toBe("")
    expect(result.current.description).toBe("")
    expect(result.current.initPrompt).toBe("")
    expect(result.current.recurrentPrompt).toBe("")
    expect(result.current.isSubmitting).toBe(false)
    expect(result.current.error).toBeNull()
  })

  // ── Test 2: Full form — all four fields ────────────────────────────────────────
  it("calls createAgent with all four fields and invokes onSuccess when all fields are filled", async () => {
    const { result } = renderHook(() => useCreateAgent(onSuccess))

    await act(async () => {
      result.current.setName("My Agent")
      result.current.setDescription("A helpful agent")
      result.current.setInitPrompt("You are a helpful assistant.")
      result.current.setRecurrentPrompt("Be concise.")
    })
    await act(async () => {
      await result.current.onSubmit()
    })

    expect(mockCreateAgent).toHaveBeenCalledWith({
      name: "My Agent",
      description: "A helpful agent",
      initPrompt: "You are a helpful assistant.",
      recurrentPrompt: "Be concise.",
    })
    expect(onSuccess).toHaveBeenCalledOnce()
    expect(result.current.isSubmitting).toBe(false)
    expect(result.current.error).toBeNull()
  })

  // ── Test 3: Empty optional fields sent as null ────────────────────────────────
  it("sends null for description and recurrentPrompt when those fields are left empty", async () => {
    const { result } = renderHook(() => useCreateAgent(onSuccess))

    await act(async () => {
      result.current.setName("My Agent")
      result.current.setInitPrompt("You are helpful.")
      // description and recurrentPrompt intentionally left at ""
    })
    await act(async () => {
      await result.current.onSubmit()
    })

    expect(mockCreateAgent).toHaveBeenCalledWith({
      name: "My Agent",
      description: null,        // "" || null
      initPrompt: "You are helpful.",
      recurrentPrompt: null,    // "" || null
    })
    expect(onSuccess).toHaveBeenCalledOnce()
    expect(result.current.isSubmitting).toBe(false)
    expect(result.current.error).toBeNull()
  })

  // ── Test 4: createAgent rejection → error set, onSuccess not called ───────────
  it("sets error message and does not call onSuccess when createAgent rejects", async () => {
    mockCreateAgent.mockRejectedValueOnce(new Error("Agent name already exists"))
    const { result } = renderHook(() => useCreateAgent(onSuccess))

    await act(async () => {
      result.current.setName("Duplicate")
      result.current.setInitPrompt("Be helpful.")
    })
    await act(async () => {
      await result.current.onSubmit()
    })

    expect(result.current.error).toBe("Agent name already exists")
    expect(result.current.isSubmitting).toBe(false)
    expect(onSuccess).not.toHaveBeenCalled()
  })
})
```

#### Edge Cases

1. **All 5 service functions mocked** — `useCreateAgent` only calls `createAgent`, but the factory mocks all 5 to prevent HTTP leaks if a future import is added to the hook.
2. **`description || null` vs `description === "" ? null : description`** — `|| null` is the idiomatic form used throughout this codebase; `""` is the only falsy string value a form field can produce.
3. **`isSubmitting` reset in both success and failure paths** — verified in Tests 2, 3, and 4.
4. **`error` null in success path** — verified in Tests 2 and 3; a bug that accidentally sets error in the try-success branch is caught.

#### `useCreateAgent.ts` Implementation

```typescript
// src/features/agents/hooks/useCreateAgent.ts

import { useState } from "react"
import { createAgent } from "../services/agentService"
import type { AgentCreateForm } from "../types"

interface UseCreateAgentResult {
  name: string
  setName: (v: string) => void
  description: string
  setDescription: (v: string) => void
  initPrompt: string
  setInitPrompt: (v: string) => void
  recurrentPrompt: string
  setRecurrentPrompt: (v: string) => void
  isSubmitting: boolean
  error: string | null
  onSubmit: () => Promise<void>
}

export function useCreateAgent(onSuccess: () => void): UseCreateAgentResult {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [initPrompt, setInitPrompt] = useState("")
  const [recurrentPrompt, setRecurrentPrompt] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit() {
    setIsSubmitting(true)
    setError(null)

    const form: AgentCreateForm = {
      name,
      description: description || null,
      initPrompt,
      recurrentPrompt: recurrentPrompt || null,
    }

    try {
      await createAgent(form)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string }
      const message =
        axiosErr.response?.data?.message ??
        axiosErr.message ??
        "Failed to create agent."
      setError(message)
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(false)
    onSuccess()
  }

  return {
    name, setName,
    description, setDescription,
    initPrompt, setInitPrompt,
    recurrentPrompt, setRecurrentPrompt,
    isSubmitting,
    error,
    onSubmit,
  }
}
```

---

### Step 4.2 RED → GREEN — `useEditAgent`

**Goal:** TDD `useEditAgent` — 6 tests covering pre-fill from prop, the `isLoadingData` transition, null coalescing, load failure, successful save, and failed save.
**Dependencies:** Step 4.1 GREEN complete (147/147 passing).

- [ ] Create `src/features/agents/hooks/useEditAgent.test.ts` with the content below
- [ ] Run `npm run test` — confirm **RED**: 6 new tests fail with import resolution failure for `"./useEditAgent"`; existing 147 tests still pass
- [ ] Create `src/features/agents/hooks/useEditAgent.ts` with the content below
- [ ] Run `npm run test` — confirm **GREEN**: **153/153** (147 + 6 new), 0 failures, 0 regressions
- [ ] Run `npm run typecheck` — confirm 0 errors

**Why this step is critical:**
`useEditAgent` is the most complex hook in this task due to its two-phase lifecycle: mount-load and submit. The 6 tests fully specify both phases and their failure modes. This is also where Finding 2 from `[[Bugs/to-do/Review-Employee-Agent-Management-Page]]` is resolved by explicit `?? ""` coalescing.

#### Test File

```typescript
// src/features/agents/hooks/useEditAgent.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useEditAgent } from "./useEditAgent"
import { getAgent, updateAgent } from "../services/agentService"
import type { AgentListDTO, AgentDTO } from "../types"

// Mock all service exports to prevent HTTP leaks from any function in the module.
vi.mock("../services/agentService", () => ({
  listAgents: vi.fn(),
  getAgent: vi.fn(),
  createAgent: vi.fn(),
  updateAgent: vi.fn(),
  deleteAgent: vi.fn(),
}))

// Imported as values — required by verbatimModuleSyntax: true for vi.mocked().
const mockGetAgent = vi.mocked(getAgent)
const mockUpdateAgent = vi.mocked(updateAgent)

// description: null — tests the ?? "" coalescing that Finding 2 requires
const mockAgentListRow: AgentListDTO = {
  id: 42,
  name: "My Agent",
  description: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
}

// recurrentPrompt: null — tests the ?? "" coalescing after getAgent resolves
const mockAgentDTO: AgentDTO = {
  id: 42,
  name: "My Agent",
  description: null,
  initPrompt: "You are a helpful assistant.",
  recurrentPrompt: null,
  ownerId: 7,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
}

describe("useEditAgent", () => {
  const onSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAgent.mockResolvedValue(mockAgentDTO)
    mockUpdateAgent.mockResolvedValue(mockAgentDTO)
  })

  // ── Test 1: Pre-fill from prop + isLoadingData true ────────────────────────────
  it("pre-fills name and description from AgentListDTO immediately; initPrompt and recurrentPrompt are empty and isLoadingData is true before the load resolves", async () => {
    // Deferred promise so the load hasn't resolved when we inspect
    let resolveLoad!: (value: AgentDTO) => void
    mockGetAgent.mockImplementationOnce(
      () => new Promise<AgentDTO>(res => { resolveLoad = res })
    )

    const { result } = renderHook(() => useEditAgent(mockAgentListRow, onSuccess))

    // Synchronous initial state — from useState(agent.x) before any async work
    expect(result.current.name).toBe("My Agent")
    expect(result.current.description).toBe("")   // null ?? "" coalescing
    expect(result.current.initPrompt).toBe("")    // not yet loaded
    expect(result.current.recurrentPrompt).toBe("") // not yet loaded
    expect(result.current.isLoadingData).toBe(true)
    expect(result.current.loadError).toBeNull()

    // Resolve to clean up hanging async state (async act flushes the promise microtask)
    await act(async () => { resolveLoad(mockAgentDTO) })
  })

  // ── Test 2: isLoadingData transition via deferred promise ─────────────────────
  it("sets isLoadingData to false after getAgent resolves", async () => {
    let resolveLoad!: (value: AgentDTO) => void
    mockGetAgent.mockImplementationOnce(
      () => new Promise<AgentDTO>(res => { resolveLoad = res })
    )

    const { result } = renderHook(() => useEditAgent(mockAgentListRow, onSuccess))
    expect(result.current.isLoadingData).toBe(true)

    await act(async () => {
      resolveLoad(mockAgentDTO)
    })

    expect(result.current.isLoadingData).toBe(false)
    expect(result.current.initPrompt).toBe("You are a helpful assistant.")
    expect(result.current.recurrentPrompt).toBe("") // null ?? "" coalescing after load
  })

  // ── Test 3: Successful load populates prompt fields ───────────────────────────
  it("populates initPrompt and recurrentPrompt after getAgent resolves, coalescing null to empty string", async () => {
    const { result } = renderHook(() => useEditAgent(mockAgentListRow, onSuccess))
    await act(async () => { await Promise.resolve() })

    expect(result.current.initPrompt).toBe("You are a helpful assistant.")
    expect(result.current.recurrentPrompt).toBe("") // null ?? ""
    expect(result.current.isLoadingData).toBe(false)
    expect(result.current.loadError).toBeNull()
  })

  // ── Test 4: Load failure sets loadError ───────────────────────────────────────
  it("sets loadError and clears isLoadingData when getAgent rejects", async () => {
    mockGetAgent.mockRejectedValueOnce(new Error("Agent not found"))
    const { result } = renderHook(() => useEditAgent(mockAgentListRow, onSuccess))
    await act(async () => { await Promise.resolve() })

    expect(result.current.isLoadingData).toBe(false)
    expect(result.current.loadError).toBe("Agent not found")
    expect(result.current.initPrompt).toBe("") // unchanged — load failed
  })

  // ── Test 5: Successful save ────────────────────────────────────────────────────
  it("calls updateAgent with the correct body and invokes onSuccess when saved", async () => {
    const { result } = renderHook(() => useEditAgent(mockAgentListRow, onSuccess))
    await act(async () => { await Promise.resolve() })
    // After load: name="My Agent", description="", initPrompt="You are a helpful assistant.", recurrentPrompt=""

    await act(async () => {
      result.current.setName("Updated Agent")
      result.current.setInitPrompt("Be very helpful.")
      // description and recurrentPrompt left as "" → sent as null
    })
    await act(async () => {
      await result.current.onSave()
    })

    expect(mockUpdateAgent).toHaveBeenCalledWith(mockAgentListRow.id, {
      name: "Updated Agent",
      description: null,      // "" || null
      initPrompt: "Be very helpful.",
      recurrentPrompt: null,  // "" || null
    })
    expect(onSuccess).toHaveBeenCalledOnce()
    expect(result.current.isSubmitting).toBe(false)
    expect(result.current.error).toBeNull()
  })

  // ── Test 6: Failed save sets error ────────────────────────────────────────────
  it("sets error and does not call onSuccess when updateAgent rejects", async () => {
    mockUpdateAgent.mockRejectedValueOnce(new Error("Update failed"))
    const { result } = renderHook(() => useEditAgent(mockAgentListRow, onSuccess))
    await act(async () => { await Promise.resolve() })

    await act(async () => {
      result.current.setInitPrompt("New prompt.")
    })
    await act(async () => {
      await result.current.onSave()
    })

    expect(result.current.error).toBe("Update failed")
    expect(result.current.isSubmitting).toBe(false)
    expect(onSuccess).not.toHaveBeenCalled()
  })
})
```

#### Edge Cases

1. **Deferred promise in Tests 1 and 2** — `resolveLoad!` uses a non-null assertion; TypeScript knows the assignment always occurs inside the synchronous factory before `resolveLoad` is referenced.
2. **`await act(async () => { await Promise.resolve() })`** — flushes the microtask queue where `mockGetAgent.mockResolvedValue` resolves (same pattern as `useAgentList.test.ts`). Used in Tests 3, 4, 5, 6 to reach post-load state.
3. **`description: null` in fixture** — tests that `useState(agent.description ?? "")` coalesces null to `""`. If an implementer writes `useState(agent.description)` instead, `result.current.description` would be `null`, not `""`, and Test 1 would fail.
4. **`recurrentPrompt: null` in DTO** — tests that `setRecurrentPrompt(agentData.recurrentPrompt ?? "")` coalesces null to `""`. If `recurrentPrompt: null` is set directly, `result.current.recurrentPrompt` would be `null`, causing a React controlled/uncontrolled warning and Test 2 would fail.
5. **Test 5 sends `recurrentPrompt: null`** — `"" || null` = `null`. This verifies the null→""→null roundtrip: the backend-returned `null` becomes `""` in state, and is sent back as `null` on save. The backend stores `null`; no data is lost.
6. **`agent.id` captured in `loadAgent` and `onSave` closures** — the hook is conditionally mounted; `agent` never changes during the lifetime of a hook instance. Using `agent.id` directly (not via state or ref) is correct and matches `useDeleteEmployee`'s `employee.id` pattern.
7. **`setIsLoadingData(true)` called at start of `loadAgent`** — consistent with `fetchAgents` in `useAgentList.ts` which calls `setIsLoading(true)` explicitly. It's a no-op on the mount call (initial state is already `true`), but makes the function self-contained and resistant to future misuse.

#### `useEditAgent.ts` Implementation

```typescript
// src/features/agents/hooks/useEditAgent.ts

import { useState, useEffect } from "react"
import { getAgent, updateAgent } from "../services/agentService"
import type { AgentListDTO, AgentUpdateForm } from "../types"

interface UseEditAgentResult {
  isLoadingData: boolean
  loadError: string | null
  name: string
  setName: (v: string) => void
  description: string
  setDescription: (v: string) => void
  initPrompt: string
  setInitPrompt: (v: string) => void
  recurrentPrompt: string
  setRecurrentPrompt: (v: string) => void
  isSubmitting: boolean
  error: string | null
  onSave: () => Promise<void>
}

export function useEditAgent(
  agent: AgentListDTO,
  onSuccess: () => void
): UseEditAgentResult {
  // Pre-filled from prop synchronously
  const [name, setName] = useState(agent.name)
  const [description, setDescription] = useState(agent.description ?? "")
  // Populated after getAgent resolves
  const [initPrompt, setInitPrompt] = useState("")
  const [recurrentPrompt, setRecurrentPrompt] = useState("")
  // Load phase
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  // Submit phase
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadAgent() {
    setIsLoadingData(true)  // consistent with fetchAgents pattern; no-op on first call (initial state is true)
    try {
      const agentData = await getAgent(agent.id)
      setInitPrompt(agentData.initPrompt)
      setRecurrentPrompt(agentData.recurrentPrompt ?? "")
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string }
      const message =
        axiosErr.response?.data?.message ??
        axiosErr.message ??
        "Failed to load agent data."
      setLoadError(message)
    } finally {
      setIsLoadingData(false)
    }
  }

  useEffect(() => {
    void loadAgent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSave() {
    setIsSubmitting(true)
    setError(null)

    const form: AgentUpdateForm = {
      name,
      description: description || null,
      initPrompt,
      recurrentPrompt: recurrentPrompt || null,
    }

    try {
      await updateAgent(agent.id, form)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string }
      const message =
        axiosErr.response?.data?.message ??
        axiosErr.message ??
        "Failed to update agent."
      setError(message)
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(false)
    onSuccess()
  }

  return {
    isLoadingData,
    loadError,
    name, setName,
    description, setDescription,
    initPrompt, setInitPrompt,
    recurrentPrompt, setRecurrentPrompt,
    isSubmitting,
    error,
    onSave,
  }
}
```

---

### Step 4.3 RED → GREEN — `useDeleteAgent`

**Goal:** TDD `useDeleteAgent` — 4 tests covering the checkbox guard, correct id, success path, and failure path.
**Dependencies:** Step 4.2 GREEN complete (153/153 passing).

- [ ] Create `src/features/agents/hooks/useDeleteAgent.test.ts` with the content below
- [ ] Run `npm run test` — confirm **RED**: 4 new tests fail with import resolution failure for `"./useDeleteAgent"`; existing 153 tests still pass
- [ ] Create `src/features/agents/hooks/useDeleteAgent.ts` with the content below
- [ ] Run `npm run test` — confirm **GREEN**: **157/157** (153 + 4 new), 0 failures, 0 regressions
- [ ] Run `npm run typecheck` — confirm 0 errors

**Why this step is critical:**
`useDeleteAgent` is the guard layer between the UI and permanent deletion. The checkbox guard test ensures the hook never calls `deleteAgent` without explicit user acknowledgment.

#### Test File

```typescript
// src/features/agents/hooks/useDeleteAgent.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useDeleteAgent } from "./useDeleteAgent"
import { deleteAgent } from "../services/agentService"
import type { AgentListDTO, AgentDTO } from "../types"

// Mock all service exports to prevent HTTP leaks from any function in the module.
vi.mock("../services/agentService", () => ({
  listAgents: vi.fn(),
  getAgent: vi.fn(),
  createAgent: vi.fn(),
  updateAgent: vi.fn(),
  deleteAgent: vi.fn(),
}))

// deleteAgent imported as a value — required by verbatimModuleSyntax: true for vi.mocked().
const mockDeleteAgent = vi.mocked(deleteAgent)

const mockAgentDTO: AgentDTO = {
  id: 42,
  name: "My Agent",
  description: null,
  initPrompt: "You are helpful.",
  recurrentPrompt: null,
  ownerId: 7,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
}

const mockAgentListRow: AgentListDTO = {
  id: 42,
  name: "My Agent",
  description: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
}

describe("useDeleteAgent", () => {
  const onSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockDeleteAgent.mockResolvedValue(mockAgentDTO)
  })

  // ── Test 1: Guard — unchecked checkbox ────────────────────────────────────────
  it("does nothing when the confirmation checkbox is unchecked", async () => {
    const { result } = renderHook(() => useDeleteAgent(mockAgentListRow, onSuccess))

    await act(async () => {
      await result.current.onConfirm()
    })

    expect(mockDeleteAgent).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  // ── Test 2: Correct id passed to deleteAgent ──────────────────────────────────
  it("calls deleteAgent with the correct agent id when the checkbox is checked", async () => {
    const { result } = renderHook(() => useDeleteAgent(mockAgentListRow, onSuccess))

    await act(async () => { result.current.setIsChecked(true) })
    await act(async () => { await result.current.onConfirm() })

    expect(mockDeleteAgent).toHaveBeenCalledWith(mockAgentListRow.id)
  })

  // ── Test 3: onSuccess called after successful delete ──────────────────────────
  it("calls onSuccess and resets isSubmitting after a successful delete", async () => {
    const { result } = renderHook(() => useDeleteAgent(mockAgentListRow, onSuccess))

    await act(async () => { result.current.setIsChecked(true) })
    await act(async () => { await result.current.onConfirm() })

    expect(onSuccess).toHaveBeenCalledOnce()
    expect(result.current.isSubmitting).toBe(false)
    expect(result.current.error).toBeNull()
  })

  // ── Test 4: deleteAgent rejection → error set, onSuccess not called ───────────
  it("sets error and does not call onSuccess when deleteAgent rejects", async () => {
    mockDeleteAgent.mockRejectedValueOnce(new Error("Delete failed"))
    const { result } = renderHook(() => useDeleteAgent(mockAgentListRow, onSuccess))

    await act(async () => { result.current.setIsChecked(true) })
    await act(async () => { await result.current.onConfirm() })

    expect(result.current.error).toBe("Delete failed")
    expect(result.current.isSubmitting).toBe(false)
    expect(result.current.isChecked).toBe(true) // preserved on failure — user can retry without re-checking
    expect(onSuccess).not.toHaveBeenCalled()
  })
})
```

#### Edge Cases

1. **`isChecked` preserved on failure** — Test 4 explicitly verifies `isChecked` remains `true` after a failed delete. This locks the intentional behavior: the employee can retry the deletion without re-checking the confirmation box. If `setIsChecked(false)` is accidentally called in the catch block, Test 4 fails.
2. **`onConfirm` is a no-op when `isChecked` is false** — Test 1 verifies neither `mockDeleteAgent` nor `onSuccess` is called, confirming the early return fires correctly before any `setIsSubmitting` call.
3. **`deleteAgent` return value not used** — the hook calls `await deleteAgent(agent.id)` and discards the returned `AgentDTO`. The mock resolves with `mockAgentDTO` for type safety, matching the service's `Promise<AgentDTO>` return type.

#### `useDeleteAgent.ts` Implementation

```typescript
// src/features/agents/hooks/useDeleteAgent.ts

import { useState } from "react"
import { deleteAgent } from "../services/agentService"
import type { AgentListDTO } from "../types"

interface UseDeleteAgentResult {
  isChecked: boolean
  setIsChecked: (v: boolean) => void
  isSubmitting: boolean
  error: string | null
  onConfirm: () => Promise<void>
}

export function useDeleteAgent(
  agent: AgentListDTO,
  onSuccess: () => void
): UseDeleteAgentResult {
  const [isChecked, setIsChecked] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onConfirm() {
    if (!isChecked) return

    setIsSubmitting(true)
    setError(null)

    try {
      await deleteAgent(agent.id)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string }
      const message =
        axiosErr.response?.data?.message ??
        axiosErr.message ??
        "Failed to delete agent."
      setError(message)
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(false)
    onSuccess()
  }

  return {
    isChecked,
    setIsChecked,
    isSubmitting,
    error,
    onConfirm,
  }
}
```

---

### Step 4.4 — `useAgentModals`

**Goal:** Create the modal open/close state hook. No TDD — trivial state with no logic.
**Dependencies:** Step 4.3 GREEN complete (157/157 passing).

- [ ] Create `src/features/agents/hooks/useAgentModals.ts` with the content below
- [ ] Run `npm run typecheck` — confirm 0 errors

**Why this step is critical:**
`useAgentModals` groups the three modal state pairs (edit / delete / create) under one SRP unit. `AgentsPage` uses it as the sole source of modal state — no `useState` calls for modal state in the page component.

#### Implementation

```typescript
// src/features/agents/hooks/useAgentModals.ts

import { useState } from "react"
import type { AgentListDTO } from "../types"

export interface UseAgentModalsResult {
  editAgent: AgentListDTO | null
  setEditAgent: (agent: AgentListDTO | null) => void
  deleteAgent: AgentListDTO | null
  setDeleteAgent: (agent: AgentListDTO | null) => void
  createOpen: boolean
  setCreateOpen: (open: boolean) => void
}

// One responsibility: own all modal open/close state for the Agents page.
// Groups three related state pairs (edit / delete / create) that share a
// single concern — "which modal is currently open" — into one SRP unit.
export function useAgentModals(): UseAgentModalsResult {
  const [editAgent, setEditAgent] = useState<AgentListDTO | null>(null)
  const [deleteAgent, setDeleteAgent] = useState<AgentListDTO | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  return {
    editAgent, setEditAgent,
    deleteAgent, setDeleteAgent,
    createOpen, setCreateOpen,
  }
}
```

#### Edge Cases

1. **`deleteAgent` naming** — the local state variable `deleteAgent` (the `AgentListDTO | null` currently being confirmed for deletion) has the same name as the imported service function `deleteAgent`. They coexist without conflict because the service function is not imported in this file. Task 5 modal components will import `useAgentModals` and destructure `deleteAgent` as a state value, not a function.
2. **Interface exported** — `UseAgentModalsResult` is exported (not just the function) to enable typed destructuring in `AgentsPage` and future consumers.
3. **No tests** — trivial state hook. If business logic is ever added (e.g., "close all modals" action, or a toggle), tests should be added at that point.

---

## Design Decisions

**Decision 1: `description` and `recurrentPrompt` use `string` state with `?? ""` initialization and `|| null` on save**

Both optional fields are typed `string | null` in the API types but stored as `string` in hook state.

- **Why:** React's controlled inputs require `string` values. A `null` state value wired to an `<Input>` or `<Textarea>` triggers React's uncontrolled-to-controlled transition warning and can render the literal string `"null"` in some environments. This directly resolves Finding 2 from `[[Bugs/to-do/Review-Employee-Agent-Management-Page]]`.
- **Initialization rule**: `agent.description ?? ""` (pre-fill), `agentData.recurrentPrompt ?? ""` (after load)
- **Save rule**: `description || null`, `recurrentPrompt || null` — converts `""` to `null`; non-empty strings are sent as-is
- **Alternatives considered**: Use `string | null` in state and guard inputs with `?? ""`  on render — rejected; this pushes null-handling responsibility onto every input consumer and is inconsistent with the employees pattern

**Decision 2: `useEditAgent` load phase uses `isLoadingData` + `loadError` separate from submission `isSubmitting` + `error`**

The two async operations (initial load and save) have separate flag pairs.

- **Why:** The edit modal needs to show a spinner overlay while loading and a form-level error after a failed save — these are visually distinct states. Sharing a single `isLoading` flag would prevent the modal from distinguishing "loading data" from "submitting form." Per the parent feature spec (Section 8): "The edit modal renders a `LoadingSpinner` while `isLoadingData` is true and an error message if `loadError` is non-null."
- **Alternatives considered**: Single `isLoading` / `error` pair for both phases — rejected; the modal UI requires two distinct states simultaneously (e.g., a loaded form with a submission error while `isLoadingData=false`)

**Decision 3: `loadAgent` is mount-only (`useEffect` with empty deps array)**

`loadAgent` is called exactly once per hook instance, on mount.

- **Why:** The hook is conditionally mounted — the edit modal only exists in the DOM when `editAgent !== null` in `useAgentModals`. When the user opens the edit modal for a different agent, the modal unmounts and remounts, re-running the mount effect with the new `agent` prop. There is no need for a manual refresh trigger or a dependency on `agent.id`.
- **`eslint-disable-next-line react-hooks/exhaustive-deps`**: required to suppress the `react-hooks/exhaustive-deps` rule warning about `loadAgent` and `agent.id` being missing from the dependency array. Adding them would cause `loadAgent` to be re-created on every render (since it's defined inside the hook), triggering the effect on every render cycle. This pattern is pre-approved by `useAgentList.ts` and `useEmployeeList.ts`.
- **Alternatives considered**: Declare `loadAgent` outside the hook body as a module-level function (like `saveProfileChanges` in `useEditEmployee.ts`) — rejected; `loadAgent` closes over `agent.id` and the state setters, which are hook-specific and cannot be module-level.

**Decision 4: Modal hooks NOT exported from `src/features/agents/index.ts`**

`useCreateAgent`, `useEditAgent`, `useDeleteAgent`, and `useAgentModals` remain internal to the feature.

- **Why:** These hooks are consumed only by modal components inside `features/agents/components/`. Exporting them prematurely exposes unstable interfaces and tempts callers to bypass the modal components. The feature boundary is enforced: callers outside `features/agents/` interact with the page component, not the hooks directly.
- **Alternatives considered**: Export all hooks immediately — rejected; the public surface of `features/agents/` is defined by the page composition (Task 6), not by every internal module.

**Decision 5: `axiosErr as { response?: { data?: { message?: string } }; message?: string }` error extraction pattern**

All three form hooks use the same error extraction pattern.

- **Why:** Established throughout the codebase (`useCreateEmployee`, `useEditEmployee`, `useDeleteEmployee`, `useAgentList`). The pattern handles both Axios error responses (with `response.data.message` from the backend's `GlobalExceptionHandler`) and plain Error objects (with `.message`). The fallback string is hook-specific ("Failed to create agent." / "Failed to update agent." / "Failed to delete agent.").
- **Alternatives considered**: Use `axios.isAxiosError()` type guard — not used in the existing codebase; introducing it here would create an inconsistency. Deferred to a future codebase-wide refactor if needed.

---

## Testing Considerations

### Automatic Validation

- [ ] Run `npm run test` after Step 4.1 test file — confirm **RED**: 4 new tests fail; existing **143 tests still pass**
- [ ] Run `npm run test` after Step 4.1 implementation — confirm **GREEN**: **147/147** (143 + 4), 0 regressions
- [ ] Run `npm run typecheck` after Step 4.1 — confirm 0 errors
- [ ] Run `npm run test` after Step 4.2 test file — confirm **RED**: 6 new tests fail; existing **147 tests still pass**
- [ ] Run `npm run test` after Step 4.2 implementation — confirm **GREEN**: **153/153** (147 + 6), 0 regressions
- [ ] Run `npm run typecheck` after Step 4.2 — confirm 0 errors
- [ ] Run `npm run test` after Step 4.3 test file — confirm **RED**: 4 new tests fail; existing **153 tests still pass**
- [ ] Run `npm run test` after Step 4.3 implementation — confirm **GREEN**: **157/157** (153 + 4), 0 regressions
- [ ] Run `npm run typecheck` after Step 4.3 — confirm 0 errors
- [ ] Run `npm run typecheck` after Step 4.4 — confirm 0 errors (final baseline)
- [ ] Run `npm run build` after Step 4.4 — confirm Vite build succeeds

No manual validation required for this task. All hooks are behavior-only (no UI) and the tests fully verify all behavior through public interfaces.

---

## Related Code Explanations

- `src/features/agents/services/agentService.ts` — `createAgent`, `getAgent`, `updateAgent`, `deleteAgent` are the infrastructure adapters called by the modal hooks
- `src/features/agents/types.ts` — `AgentListDTO`, `AgentDTO`, `AgentMiniDTO`, `AgentCreateForm`, `AgentUpdateForm`
- `src/features/employees/hooks/useCreateEmployee.ts` — prior art: `useState` init, `onSubmit` pattern, error extraction
- `src/features/employees/hooks/useEditEmployee.ts` — prior art: prop-initialized state, module-level helpers, `onSave` lifecycle
- `src/features/employees/hooks/useDeleteEmployee.ts` — prior art: checkbox guard, `isChecked` preserved on failure
- `src/features/employees/hooks/useEmployeeModals.ts` — prior art for `useAgentModals` structure
- `documentation/Bugs/to-do/Review-Employee-Agent-Management-Page.md` — Finding 2 (null coalescing in `useEditAgent`); Finding 1 (sidebar icon conflict, affects Task 6 only)

---

## Completion Criteria

- [x] `src/features/agents/hooks/useCreateAgent.test.ts` created with 4 behavior tests; **RED confirmed** before implementation
- [x] `src/features/agents/hooks/useCreateAgent.ts` created; all 4 tests GREEN; `npm run test` **147/147**
- [x] `src/features/agents/hooks/useEditAgent.test.ts` created with 6 behavior tests; **RED confirmed** before implementation
- [x] `src/features/agents/hooks/useEditAgent.ts` created with two-phase lifecycle (mount-load + submit); `?? ""` coalescing for `description` and `recurrentPrompt`; all 6 tests GREEN; `npm run test` **153/153**
- [x] `src/features/agents/hooks/useDeleteAgent.test.ts` created with 4 behavior tests; **RED confirmed** before implementation
- [x] `src/features/agents/hooks/useDeleteAgent.ts` created; all 4 tests GREEN; `npm run test` **157/157**
- [x] `src/features/agents/hooks/useAgentModals.ts` created with `UseAgentModalsResult` interface exported; `npm run typecheck` 0 errors
- [x] `src/features/agents/index.ts` unchanged (modal hooks intentionally not exported)
- [x] `npm run build` succeeds
- [x] Finding 2 from `[[Bugs/to-do/Review-Employee-Agent-Management-Page]]` resolved: `description ?? ""` on `useEditAgent` init; `recurrentPrompt ?? ""` after `getAgent` resolves; both verified in tests
- [x] Parent feature Steps 4.1, 4.2, 4.3, 4.4 marked `[x]` in `documentation/Features/to-do/Employee-Agent-Management-Page.md` with a wiki link to this task document
