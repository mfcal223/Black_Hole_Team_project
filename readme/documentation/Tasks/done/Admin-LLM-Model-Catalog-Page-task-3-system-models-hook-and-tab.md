# Task: System Models Hook and Tab

#task #current #medium-complexity #parent-admin-llm-model-catalog-page

**Parent:** [[Admin-LLM-Model-Catalog-Page]]
**Parent Type:** Feature
**Related Step(s):** Phase 3 — Steps 3.1, 3.2, 3.3
**Estimated Complexity:** Medium

---

## Goal

Create `useSystemModels` — the page-level owner of `GET /llm-model` and the toggle action — via TDD, write its unit tests, and build `SystemModelsTab` as a thin stateless renderer driven by the hook's props. When Task 5 wires the page, this hook becomes the single source of truth for the system model list, feeding its `models` array into both `SystemModelsTab` and `useAppSettings` (the latter change is scoped to Task 5).

---

## Parent Context

The parent feature, [[Admin-LLM-Model-Catalog-Page]], extends the existing `/app-settings` admin page into a three-tab layout: **General Settings** (existing), **System Models** (admin-curated LLM catalog), and **Add Models** (static OpenRouter catalog browser).

Task 3 delivers the backend-facing half of this feature:

- **Step 3.1 — `useSystemModels` hook**: Fetches the system model list via `listLlmModels()` on mount and after each successful toggle. Exposes `toggleModel(id)` which calls `toggleLlmModel(id)` then refreshes. Owns the atomic `toggleState: { id, error }` that drives per-row spinner and error rendering in `SystemModelsTab`.
- **Step 3.2 — unit tests**: TDD red-green-refactor for `useSystemModels`. Tests verify observable behavior through the hook's public interface only — no internal spy.
- **Step 3.3 — `SystemModelsTab` component**: A thin renderer. Receives `{ models, isLoading, error, toggleModel, toggleState, refresh }` as props and renders a table. No local state. No unit tests (composition layer; validated via manual browser walk-through in Task 5).

**The `useAppSettings` optional `models?` prop change** — which eliminates the duplicate `GET /llm-model` fetch and ensures the General Settings default-model selector reflects the post-toggle model list without a separate re-fetch — is **scoped to Task 5**. Task 3 builds `useSystemModels` as a fully standalone module; the page-level wiring happens when `AppSettingsPage` is restructured.

**Current progress:** Task 1 ([[Admin-LLM-Model-Catalog-Page-task-1-static-catalog-setup]]) and Task 2 ([[Admin-LLM-Model-Catalog-Page-task-2-service-and-types]]) are implemented. The codebase baseline entering Task 3 is:
- `public/models.json` present.
- `src/components/ui/tabs.tsx` present; `TabsContent` forwards `{...props}` to `Tabs.Panel`.
- `types.ts` has `LlmModelForm` and `OpenRouterModel`.
- `appSettingsService.ts` has `createLlmModel()` and `toggleLlmModel()`.
- Test count: **116/116** across 20 files.

---

## Preconditions / Dependencies

- `project/srcs/frontend/` exists with all Task 1 and Task 2 code in place.
- `features/app-settings/services/appSettingsService.ts` exports `listLlmModels()` and `toggleLlmModel(id)` (added in Task 2).
- `features/app-settings/types.ts` exports `LlmModelDTO` and `LlmModelMiniDTO`.
- `features/app-settings/hooks/useAppSettings.test.ts` service mock factory already includes `createLlmModel: vi.fn()` and `toggleLlmModel: vi.fn()` (synchronized in Task 2).
- `features/app-settings/index.ts` currently exports `AppSettingsForm`, `useAppSettings`, and all type contracts from `./types`.
- Common UI components available: `LoadingSpinner` from `@/components/common/LoadingSpinner`, `ErrorMessage` from `@/components/common/ErrorMessage`.
- shadcn UI: `Table`, `TableHeader`, `TableBody`, `TableHead`, `TableRow`, `TableCell` from `@/components/ui/table` (installed); no `Badge` component exists — status badges use inline `<span>` classes following `EmployeeTable.tsx`'s pattern.
- `tsconfig.app.json` enforces `strict`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, `erasableSyntaxOnly` — use `import type` for type-only imports.
- Test baseline: **116/116**. No regressions allowed.
- No dependency on Task 4 (Available Models) or Task 5 (page restructure) — this task is self-contained.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `memory-bank` — Selected — loaded AgentForge frontend architecture, testing patterns, hook conventions, and current feature progress.
- `documentation-management` — Selected — confirmed Task placement, naming, and template structure.
- `solid-deep-design` — Selected — applied to `useSystemModels` interface design (SRP: one module, one reason to change; Depth: large implementation behind small interface; Deletion test: toggle lifecycle + refresh logic would scatter across `SystemModelsTab` and `AppSettingsPage` without this hook).
- `tdd` — Selected — Task 3 is a TDD pass: tests are written for the hook (Steps 3.1–3.2 red-green cycle) before `SystemModelsTab` is authored.
- `find-docs` — Selected — confirmed `@testing-library/react@16.3.2` `renderHook`/`act` API and `vitest@4.1.9` mock patterns.
- `glossary-management` — Selected — domain terms: LLM Model, System Model, toggle semantics.

### Documentation Reviewed

- **Context7 `@testing-library/react@16.x`** — confirmed `renderHook(() => hook())` returns `{ result }` where `result.current` is the hook's return value; `act(async () => { await Promise.resolve() })` drains mount-triggered async effects; `act(() => { void asyncFn() })` is used to start a deferred promise without awaiting it, enabling intermediate state assertions.
- **Context7 `vitest@4.x`** — confirmed `vi.mock(modulePath, factory)` is hoisted; `vi.mocked(fn)` gives typed mock; `mockImplementationOnce(() => new Promise(res => resolveRef = res))` captures the resolver for deferred testing; `vi.clearAllMocks()` in `beforeEach` resets call counts but not `mockResolvedValue` implementations (use `vi.resetAllMocks()` if implementations must also reset — `vi.clearAllMocks()` is correct here because `beforeEach` sets fresh `mockResolvedValue` defaults).
- **[[Admin-LLM-Model-Catalog-Page]]** — source of truth for hook interface, `toggleState` semantics, testing decisions, and `SystemModelsTab` layout.
- **[[Bugs/done/Review-Admin-LLM-Model-Catalog-Page]] Finding 5** — resolved to `toggleState: { id: number | null; error: string | null }` (atomic, both keys updated together). On start: `{ id, null }`. On failure: `{ id, error }` (id preserved for row context — this is the "fully closed" resolution that Option a left open). On success: `{ null, null }`.
- **[[Admin-LLM-Model-Catalog-Page-task-2-service-and-types]]** — confirms service function signatures and test mock factory state after Task 2.
- **ADR-007** — admins curate system models; employees never access `GET /llm-model`.
- **`useEmployeeList.test.ts`** — reference for deferred promise pattern in hook tests.
- **`useAppSettings.ts`** — reference for hook body structure (async load function, useEffect mount pattern, error extraction shape).

### Related Existing Code

- `project/srcs/frontend/src/features/app-settings/services/appSettingsService.ts:22-37` — `listLlmModels()` and `toggleLlmModel(id)` that `useSystemModels` calls.
- `project/srcs/frontend/src/features/app-settings/types.ts:1-15` — `LlmModelDTO` and `LlmModelMiniDTO`.
- `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.ts:65-216` — reference for hook body structure, async load function pattern, and error extraction.
- `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.test.ts:1-19` — service mock factory to keep synchronized in Step 4 (hook mock must list all exported service functions).
- `project/srcs/frontend/src/features/employees/hooks/useEmployeeList.test.ts:271-293` — deferred promise pattern for intermediate state assertions (`resolveRetry`).
- `project/srcs/frontend/src/features/employees/components/EmployeeTable.tsx:63-73` — inline `<span>` status badge pattern (no Badge component exists in this project).
- `project/srcs/frontend/src/components/common/LoadingSpinner.tsx` — full-panel spinner for `isLoading` state.
- `project/srcs/frontend/src/components/common/ErrorMessage.tsx` — full-panel error component for top-level fetch errors (not per-row errors).
- `project/srcs/frontend/src/components/ui/table.tsx` — `Table`, `TableHeader`, `TableBody`, `TableHead`, `TableRow`, `TableCell` components.
- `project/srcs/frontend/src/features/app-settings/index.ts` — barrel to update with new exports.

---

## Implementation Details

### Approach

This task applies vertical TDD slices: each `useSystemModels` test is written and made GREEN before writing the next. `SystemModelsTab` is written after all tests pass.

**SOLID / Deep Module analysis for `useSystemModels`:**

- **SRP**: One responsibility — own the system model list and toggle lifecycle. It does not format error messages for the UI, manage form state, filter models, or know about tabs. Its one reason to change: the backend API contract for `GET /llm-model` or `PATCH /llm-model/{id}/toggle` changes.
- **Depth**: Small interface (6 return values) hides substantial behavior: fetch lifecycle, cancellation guard, toggle PATCH + refresh, atomic toggle state management, per-error extraction from Axios shape. Deletion test: without the hook, all of this logic scatters across `SystemModelsTab`, `AppSettingsPage`, and the future `AvailableModelsTab` (which needs `refresh()` via `onModelAdded`).
- **DIP**: `useSystemModels` depends on `listLlmModels` and `toggleLlmModel` service functions (already thin HTTP adapters). Tests mock the service module — the hook calls through the same seam, satisfying the DIP: no `new AxiosInstance` inside the hook.
- **ISP**: Caller-side interface is narrow. `SystemModelsTab` uses all six props. `AppSettingsPage` (Task 5) uses `models`, `isLoading`, and `refresh`.

**`toggleState` semantics (resolved in [[Bugs/done/Review-Admin-LLM-Model-Catalog-Page]] Finding 5):**

```
Start toggle(id):   setToggleState({ id, error: null })
PATCH succeeds:     setToggleState({ id: null, error: null }) → then load()
PATCH fails:        setToggleState({ id, error: extractedMessage })
                    // id is PRESERVED for row-bound error context
                    // (fully closes Finding 5; Option a left id-context open)
```

The renderer checks `toggleState.id === model.id` to know which row is active. By keeping `id` on failure, the failing row shows its error while the in-flight guard (`toggleState.id !== null`) blocks all other toggles until the admin calls `refresh()`.

**`refresh()` as error-recovery mechanism:**

When `refresh()` is called (either by `AppSettingsPage.onModelAdded` after a successful add, or by the admin via a retry button in the error row), it resets `toggleState` to `{ id: null, error: null }` before re-fetching. This lifts the single-in-flight block.

**`SystemModelsTab` is a thin renderer:**

It owns no state. It receives all data and actions as props. Per the parent feature's Testing Decisions, this is a composition layer validated by manual browser testing — no unit tests.

**No Badge component:** This project has no `badge.tsx`. Status is rendered via inline `<span>` with Tailwind classes, following the `EmployeeTable.tsx` pattern.

**Per-row error rendering:** The full-panel `<ErrorMessage>` component is inappropriate for per-row use (it has `min-h-100` sizing). Per-row errors use an inline `<p className="text-xs text-destructive">` within the error row's action cell.

### Files to Create/Modify

- [ ] `project/srcs/frontend/src/features/app-settings/hooks/useSystemModels.ts` — **new** — `useSystemModels` hook.
- [ ] `project/srcs/frontend/src/features/app-settings/hooks/useSystemModels.test.ts` — **new** — 7 behavior tests (TDD red-green).
- [ ] `project/srcs/frontend/src/features/app-settings/components/SystemModelsTab.tsx` — **new** — thin table renderer.
- [ ] `project/srcs/frontend/src/features/app-settings/index.ts` — **modify** — export `useSystemModels` and `SystemModelsTab`.

---

## Step-by-Step Implementation

### Step 1: Write RED Tests for `useSystemModels`

**Goal:** Establish the full test suite before any implementation. Tests fail with "module not found" until Step 2.
**Dependencies:** Task 2's service functions (`listLlmModels`, `toggleLlmModel`) exist.

- [ ] Create `project/srcs/frontend/src/features/app-settings/hooks/useSystemModels.test.ts`.
- [ ] Mock the full `appSettingsService` module to prevent HTTP leaks.
- [ ] Write 7 behavior tests (see Implementation below).
- [ ] Run `npm --prefix project/srcs/frontend run test -- --run src/features/app-settings/hooks/useSystemModels.test.ts` — confirm RED (import failure).

#### Implementation

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useSystemModels } from "./useSystemModels"
import { listLlmModels, toggleLlmModel } from "../services/appSettingsService"
import type { LlmModelDTO } from "../types"

// Mock the complete appSettingsService surface to prevent HTTP leaks as exports grow.
vi.mock("../services/appSettingsService", () => ({
  getAppSettings: vi.fn(),
  updateAppSettings: vi.fn(),
  listLlmModels: vi.fn(),
  createLlmModel: vi.fn(),
  toggleLlmModel: vi.fn(),
}))

const mockListLlmModels = vi.mocked(listLlmModels)
const mockToggleLlmModel = vi.mocked(toggleLlmModel)

const mockEnabledModel: LlmModelDTO = {
  id: 1,
  modelId: "openai/gpt-4o",
  name: "GPT-4o",
  description: null,
  isEnabled: true,
  createdAt: "2026-06-01T00:00:00",
}

const mockDisabledModel: LlmModelDTO = {
  id: 2,
  modelId: "meta/llama-3",
  name: "Llama 3",
  description: null,
  isEnabled: false,
  createdAt: "2026-06-01T00:00:00",
}

const mockModels: LlmModelDTO[] = [mockEnabledModel, mockDisabledModel]

const mockToggledModel: LlmModelDTO = {
  ...mockEnabledModel,
  isEnabled: false,
}

describe("useSystemModels", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListLlmModels.mockResolvedValue(mockModels)
    mockToggleLlmModel.mockResolvedValue(mockToggledModel)
  })

  // ── Test 1: Initial fetch populates models ─────────────────────────────────────
  it("fetches models on mount and populates models, clears isLoading, and sets no error", async () => {
    const { result } = renderHook(() => useSystemModels())
    await act(async () => { await Promise.resolve() })

    expect(mockListLlmModels).toHaveBeenCalledOnce()
    expect(result.current.models).toEqual(mockModels)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  // ── Test 2: isLoading is true during the initial fetch ────────────────────────
  it("sets isLoading to true while the initial fetch is in-flight", async () => {
    let resolveLoad!: (value: LlmModelDTO[]) => void
    mockListLlmModels.mockImplementationOnce(
      () => new Promise<LlmModelDTO[]>((res) => { resolveLoad = res })
    )

    const { result } = renderHook(() => useSystemModels())

    // Mount triggers fetch; before it resolves, isLoading must be true
    expect(result.current.isLoading).toBe(true)

    await act(async () => {
      resolveLoad(mockModels)
    })

    expect(result.current.isLoading).toBe(false)
  })

  // ── Test 3: Fetch error sets error ────────────────────────────────────────────
  it("sets error and leaves models empty when the initial fetch rejects", async () => {
    mockListLlmModels.mockRejectedValueOnce(new Error("Network error"))

    const { result } = renderHook(() => useSystemModels())
    await act(async () => { await Promise.resolve() })

    expect(result.current.error).toBe("Network error")
    expect(result.current.models).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })

  // ── Test 4: toggleModel calls PATCH and triggers refresh ─────────────────────
  it("calls toggleLlmModel with the correct id and re-fetches the model list on success", async () => {
    const { result } = renderHook(() => useSystemModels())
    await act(async () => { await Promise.resolve() })

    mockListLlmModels.mockClear()

    await act(async () => {
      await result.current.toggleModel(1)
    })

    expect(mockToggleLlmModel).toHaveBeenCalledWith(1)
    // refresh() re-fetches the list
    expect(mockListLlmModels).toHaveBeenCalledOnce()
  })

  // ── Test 5: toggleState transitions — success path ──────────────────────────
  it("transitions toggleState from {null,null} → {id,null} on start → {null,null} on success", async () => {
    const { result } = renderHook(() => useSystemModels())
    await act(async () => { await Promise.resolve() })

    // Initial: no toggle in-flight
    expect(result.current.toggleState).toEqual({ id: null, error: null })

    let resolveToggle!: (value: LlmModelDTO) => void
    mockToggleLlmModel.mockImplementationOnce(
      () => new Promise<LlmModelDTO>((res) => { resolveToggle = res })
    )

    // Start toggle — don't await; inspect intermediate state
    // <!-- REVIEW-FIX: was synchronous act(() => {...}); must be await act(async () => {...}) to match project pattern -->
    await act(async () => {
      void result.current.toggleModel(1)
    })

    // In-flight: id set, no error
    expect(result.current.toggleState).toEqual({ id: 1, error: null })

    // Resolve the PATCH
    await act(async () => {
      resolveToggle(mockToggledModel)
    })

    // After success: both cleared
    expect(result.current.toggleState).toEqual({ id: null, error: null })
  })

  // ── Test 6: toggleState transitions — failure path (row-bound error) ─────────
  it("sets toggleState to {id, error} on failure, preserving id for row-bound error context, and does not re-fetch", async () => {
    // DISCRIMINATING TEST (Finding 5, Option d): id must be PRESERVED on failure so the
    // renderer can bind the error to the correct row via toggleState.id === model.id.
    // Option a would have set id: null, losing row context.
    mockToggleLlmModel.mockRejectedValueOnce(new Error("Toggle failed"))

    const { result } = renderHook(() => useSystemModels())
    await act(async () => { await Promise.resolve() })

    mockListLlmModels.mockClear()

    await act(async () => {
      await result.current.toggleModel(2)
    })

    // id preserved (row 2), error set
    expect(result.current.toggleState).toEqual({ id: 2, error: "Toggle failed" })
    // No refresh on failure — list is NOT re-fetched
    expect(mockListLlmModels).not.toHaveBeenCalled()
  })

  // ── Test 7: refresh() resets toggleState and re-fetches ──────────────────────
  it("resets toggleState to {null,null} and re-fetches models when refresh() is called", async () => {
    // Set up a prior failure state to verify refresh() clears it
    mockToggleLlmModel.mockRejectedValueOnce(new Error("Toggle failed"))

    const { result } = renderHook(() => useSystemModels())
    await act(async () => { await Promise.resolve() })

    // Trigger a failure to put toggleState into error state
    await act(async () => {
      await result.current.toggleModel(1)
    })
    expect(result.current.toggleState).toEqual({ id: 1, error: "Toggle failed" })

    mockListLlmModels.mockClear()

    // Call refresh() — must reset state and re-fetch
    await act(async () => {
      result.current.refresh()
      await Promise.resolve()
    })

    expect(result.current.toggleState).toEqual({ id: null, error: null })
    expect(mockListLlmModels).toHaveBeenCalledOnce()
  })
})
```

#### Edge Cases

1. **Case:** Tests use `401` for toggle error mock.
   **Handling:** Use non-401 error codes (e.g., `new Error("Toggle failed")` or a 500). The shared `api` singleton has a 401 interceptor that calls `onUnauthorizedCb()`, which may redirect globally.

2. **Case:** `mockListLlmModels.mockClear()` in Test 4/7 doesn't reset `mockResolvedValue`.
   **Handling:** `mockClear()` resets call history only; the `beforeEach` `mockResolvedValue(mockModels)` still applies for subsequent calls. This is the correct behavior — `mockClear()` is used here to isolate the assertion on the refresh call count.

3. **Case:** The deferred toggle in Test 5 (`act(() => { void result.current.toggleModel(1) })`) causes an unhandled promise warning.
   **Handling:** Using `void` is intentional. The promise resolves in the next `await act`. No fix needed.

---

### Step 2: Implement `useSystemModels` to GREEN

**Goal:** Write the hook to make all 7 tests pass.
**Dependencies:** Step 1 tests fail (RED) with "module not found."

- [ ] Create `project/srcs/frontend/src/features/app-settings/hooks/useSystemModels.ts`.
- [ ] Run targeted tests → confirm GREEN.
- [ ] Run full suite → confirm 123/123 (no regressions).

#### Implementation

```typescript
import { useState, useEffect } from "react"
import {
  listLlmModels,
  toggleLlmModel,
} from "../services/appSettingsService"
import type { LlmModelDTO } from "../types"

export interface ToggleState {
  id: number | null
  error: string | null
}

export interface UseSystemModelsResult {
  models: LlmModelDTO[]
  isLoading: boolean
  error: string | null
  toggleModel: (id: number) => Promise<void>
  toggleState: ToggleState
  refresh: () => void
}

export function useSystemModels(): UseSystemModelsResult {
  const [models, setModels] = useState<LlmModelDTO[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toggleState, setToggleState] = useState<ToggleState>({
    id: null,
    error: null,
  })

  async function load() {
    setIsLoading(true)
    setError(null)
    try {
      const data = await listLlmModels()
      setModels(data)
    } catch (err) {
      const axiosErr = err as {
        response?: { data?: { message?: string } }
        message?: string
      }
      setError(
        axiosErr.response?.data?.message ??
          axiosErr.message ??
          "Failed to load system models."
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function refresh() {
    setToggleState({ id: null, error: null })
    void load()
  }

  async function toggleModel(id: number): Promise<void> {
    setToggleState({ id, error: null })
    try {
      await toggleLlmModel(id)
      // <!-- REVIEW-FIX: was inlining setToggleState+load(); spec says "calls toggleLlmModel then refresh()" -->
      refresh()
    } catch (err) {
      const axiosErr = err as {
        response?: { data?: { message?: string } }
        message?: string
      }
      // Failure: preserve id for row-bound error context (Finding 5, Option d).
      // toggleState.id === model.id lets SystemModelsTab bind the error to the correct row.
      setToggleState({
        id,
        error:
          axiosErr.response?.data?.message ??
            axiosErr.message ??
            "Failed to toggle model.",
      })
    }
  }

  return { models, isLoading, error, toggleModel, toggleState, refresh }
}
```

Run targeted tests:

```bash
npm --prefix project/srcs/frontend run test -- --run src/features/app-settings/hooks/useSystemModels.test.ts
```

Expected GREEN: 7/7 tests pass.

Run full suite:

```bash
npm --prefix project/srcs/frontend run test -- --run
```

Expected: **123/123** (116 baseline + 7 new).

#### Edge Cases

1. **Case:** `useEffect(() => { void load() }, [])` triggers a react-hooks/exhaustive-deps ESLint warning because `load` is defined inside the hook.
   **Handling:** Add `// eslint-disable-next-line react-hooks/exhaustive-deps` above the `useEffect`. This is the established pattern in `useEmployeeList.ts:98`. `load` is recreated each render but its effect is idempotent; the empty deps array is intentional (mount-only).

2. **Case:** `toggleModel` on success calls `setToggleState({ id: null, error: null })` followed by `void load()`. The extra `setToggleState` before `load()` creates two state updates.
   **Handling:** This is intentional. `refresh()` also calls `setToggleState({ id: null, error: null })` + `load()`. On success, calling `refresh()` directly would work too, but the explicit `setToggleState` call makes the success path's state transition self-documenting. React batches these updates in React 19.

3. **Case:** Mount with strict mode fires `useEffect` twice.
   **Handling:** `main.tsx` wraps the app in `<StrictMode>`. In development, strict mode double-invokes effects, calling `load()` twice. This is harmless since `load()` is idempotent and the cancelled-flag pattern is not used here (consistent with `useEmployeeList.ts`'s mount effect). In production, `useEffect` fires once.

---

### Step 3: Create `SystemModelsTab` Component

**Goal:** Build the table renderer that displays system models and exposes toggle actions.
**Dependencies:** Step 2 hook is GREEN; types are in `types.ts`.

- [ ] Create `project/srcs/frontend/src/features/app-settings/components/SystemModelsTab.tsx`.
- [ ] Run `npm --prefix project/srcs/frontend run typecheck` — confirm 0 errors.
- [ ] Run full test suite — confirm 123/123 (component adds no tests).

#### Implementation

```typescript
import { Loader2 } from "lucide-react"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { ErrorMessage } from "@/components/common/ErrorMessage"
import { Button } from "@/components/ui/button"
import type { LlmModelDTO } from "../types"
import type { ToggleState } from "../hooks/useSystemModels"

interface SystemModelsTabProps {
  models: LlmModelDTO[]
  isLoading: boolean
  error: string | null
  toggleModel: (id: number) => Promise<void>
  toggleState: ToggleState
  refresh: () => void
}

export function SystemModelsTab({
  models,
  isLoading,
  error,
  toggleModel,
  toggleState,
  refresh,
}: SystemModelsTabProps) {
  if (isLoading) {
    return <LoadingSpinner />
  }

  if (error) {
    return <ErrorMessage message={error} />
  }

  const isToggleInFlight = toggleState.id !== null

  return (
    <div className="relative">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Model ID</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {models.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={4}
                className="py-8 text-center text-muted-foreground"
              >
                No system models found. Add models from the Add Models tab.
              </TableCell>
            </TableRow>
          )}
          {models.map((model) => {
            const isThisRowToggling =
              toggleState.id === model.id && toggleState.error === null
            const isThisRowErrored =
              toggleState.id === model.id && toggleState.error !== null

            return (
              <TableRow key={model.id}>
                <TableCell className="font-medium">{model.name}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {model.modelId}
                </TableCell>
                <TableCell>
                  <span
                    className={
                      model.isEnabled
                        ? "inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    }
                  >
                    {model.isEnabled ? "Enabled" : "Disabled"}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      {isThisRowToggling && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      <Button
                        size="sm"
                        variant={model.isEnabled ? "outline" : "default"}
                        disabled={isToggleInFlight}
                        onClick={() => void toggleModel(model.id)}
                      >
                        {model.isEnabled ? "Disable" : "Enable"}
                      </Button>
                    </div>
                    {isThisRowErrored && (
                      <div className="flex items-center gap-1 text-right">
                        <p className="text-xs text-destructive">
                          {toggleState.error}
                        </p>
                        <button
                          type="button"
                          className="text-xs text-muted-foreground underline hover:text-foreground"
                          onClick={refresh}
                        >
                          Refresh
                        </button>
                      </div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
```

#### Edge Cases

1. **Case:** `isToggleInFlight` is `toggleState.id !== null`. When a row is in error state (`toggleState.id === model.id && toggleState.error !== null`), `isToggleInFlight` is still `true` (id is non-null), so ALL buttons are disabled. The "Refresh" button calls `refresh()`, which resets `toggleState` to `{ id: null, error: null }` and re-fetches, lifting the block.
   **Handling:** This is the intended behavior. The per-row "Refresh" link is the admin's recovery path.

2. **Case:** `models` is an empty array (no system models yet).
   **Handling:** The empty-row cell with colspan=4 renders: "No system models found. Add models from the Add Models tab." This guides the admin toward the Add Models tab.

3. **Case:** `isLoading` becomes `true` again during `refresh()` (after a toggle). The top-level `if (isLoading)` guard would flash the full-panel `LoadingSpinner` momentarily.
   **Handling:** `load()` sets `isLoading = true` before the fetch. For a refresh triggered by a toggle, this flash may be acceptable but noticeable. To avoid it, `isLoading` could skip the spinner on refresh (e.g., distinguish initial load from refresh). This is a UX refinement deferred to post-MVP; the feature spec does not require smooth refresh transitions.

4. **Case:** `Button` variant `"outline"` / `"default"` for Disable/Enable.
   **Handling:** `variant="outline"` for "Disable" (a secondary/destructive-adjacent action on an enabled model) and `variant="default"` for "Enable" (a confirmative action on a disabled model). If the project's Button component does not support `variant="outline"`, adjust to the available variants in `src/components/ui/button.tsx`.

---

### Step 4: Update the Feature Barrel

**Goal:** Export `useSystemModels` (and its `ToggleState` / `UseSystemModelsResult` types) and `SystemModelsTab` from the feature's public API so `AppSettingsPage` (Task 5) can import them without deep paths.
**Dependencies:** Steps 2 and 3 complete.

- [ ] Update `project/srcs/frontend/src/features/app-settings/index.ts` to add the new exports.
- [ ] Run `npm --prefix project/srcs/frontend run typecheck` — confirm 0 errors.

#### Implementation

```typescript
// project/srcs/frontend/src/features/app-settings/index.ts

export { AppSettingsForm } from "./components/AppSettingsForm"
export { SystemModelsTab } from "./components/SystemModelsTab"
export { useAppSettings } from "./hooks/useAppSettings"
export { useSystemModels } from "./hooks/useSystemModels"
export type { UseSystemModelsResult, ToggleState } from "./hooks/useSystemModels"
export type {
  AppSettingsDTO,
  AppSettingsUpdateForm,
  LlmModelDTO,
  LlmModelForm,
  LlmModelMiniDTO,
  OpenRouterModel,
} from "./types"
```

#### Edge Cases

1. **Case:** `verbatimModuleSyntax: true` requires type-only re-exports to use `export type`.
   **Handling:** `UseSystemModelsResult` and `ToggleState` are interface types — use `export type`. The `useSystemModels` function is a value — plain `export`.

2. **Case:** `AppSettingsPage` (Task 5) imports `SystemModelsTab` or `useSystemModels` via deep path.
   **Handling:** With barrel exports, deep-path imports from outside the feature are a code smell. Adding these to `index.ts` prevents this.

---

### Step 5: Run Full Validation

**Goal:** Confirm all tests pass, typecheck is clean, and build succeeds after all file changes.
**Dependencies:** Steps 1–4 complete.

- [ ] Run targeted hook tests.
- [ ] Run full test suite.
- [ ] Run TypeScript typecheck.
- [ ] Run the frontend build.

#### Implementation

```bash
# Targeted hook tests
npm --prefix project/srcs/frontend run test -- --run src/features/app-settings/hooks/useSystemModels.test.ts

# Full suite
npm --prefix project/srcs/frontend run test -- --run

# Typecheck
npm --prefix project/srcs/frontend run typecheck

# Build
npm --prefix project/srcs/frontend run build
```

Expected after GREEN:
- Targeted: **7/7** new hook tests pass.
- Full suite: **123/123** (116 baseline + 7 new `useSystemModels` tests). No regressions.
- Typecheck: **0 errors**.
- Build: succeeds. The pre-existing 500 KB chunk-size warning is unchanged.

#### Edge Cases

1. **Case:** Typecheck fails on `ToggleState` imported from `../hooks/useSystemModels` inside `SystemModelsTab.tsx`.
   **Handling:** Confirm the `import type { ToggleState }` path resolves correctly. The file is at `hooks/useSystemModels.ts`; the component is at `components/SystemModelsTab.tsx`; the relative path is `../hooks/useSystemModels`.

2. **Case:** Full-suite test count is not 123 (e.g., 122 or 124).
   **Handling:** Count the actual test cases in `useSystemModels.test.ts` (7 `it(...)` blocks expected). Any mismatch indicates either an extra/missing test or a different baseline count; investigate before assuming a regression.

---

## Design Decisions

**Decision 1: `toggleState.id` is preserved on failure (Finding 5, Option d)**
- **Why:** If `id` were set to `null` on failure, `toggleState.id === model.id` would be false for every row, making it impossible for `SystemModelsTab` to bind the error to the correct row. The Testing Decisions table in the parent feature explicitly calls this out as "row-bound error" behavior.
- **Alternatives considered:** Option a (separate `isToggling: boolean` + `toggleError: string | null`) — rejected because it cannot express which row's toggle failed and leads to floating global errors. `{ id: null, error }` on failure — rejected for the same row-binding reason.

**Decision 2: `refresh()` resets `toggleState` before re-fetching**
- **Why:** `refresh()` is called externally by `AppSettingsPage.onModelAdded` (Task 4→5 wiring) after a successful `createLlmModel`. If a prior toggle left `toggleState` in error state (`{ id: X, error: "msg" }`), the external refresh must clear it or the error row persists indefinitely. Resetting in `refresh()` is a single defensive reset that covers both the error-recovery case and the post-add-model refresh case.
- **Alternatives considered:** Only reset `toggleState` inside `toggleModel.onSuccess` — rejected because external callers of `refresh()` bypass `toggleModel` entirely.

**Decision 3: `useAppSettings` optional `models?` prop deferred to Task 5**
- **Why:** The "single source of truth" wiring (eliminating the duplicate `GET /llm-model` call on mount and the post-toggle staleness) requires `AppSettingsPage` to pass `systemModels.models` into `useAppSettings`. Task 5 is where the page is restructured and all hooks are composed. Adding the `useAppSettings` change in Task 3 would require testing the `models` prop behavior without a page context, adding test complexity with no corresponding task deliverable. The backward-compatible `useAppSettings` API (no-arg path unchanged) means this change is safe to defer.
- **Alternatives considered:** Add `models?` prop to `useAppSettings` in Task 3 — not rejected outright, but the parent feature's step breakdown puts this in Step 5.1 ("Refactor `AppSettingsPage.tsx` to a 3-tab layout").

**Decision 4: `SystemModelsTab` uses inline `<span>` for status badges, not a Badge component**
- **Why:** There is no `badge.tsx` in `src/components/ui/`. The project uses inline Tailwind classes for status indicators, as established by `EmployeeTable.tsx:63-73`. Adding a `badge.tsx` component is out of scope for this task.
- **Alternatives considered:** Installing a `Badge` shadcn component — rejected because it requires a separate `npx shadcn@latest add badge` step and ADR-010 verification, which is disproportionate for two status values.

**Decision 5: Per-row error uses inline `<p>` not `<ErrorMessage>` component**
- **Why:** `ErrorMessage` is a full-panel component (`min-h-100` = 400px, centered layout). Embedding it per table row would break the table layout and look visually incorrect. Per-row error needs a compact inline element.
- **Alternatives considered:** Redesigning `ErrorMessage` to accept a `compact` variant — rejected as scope creep; the task doesn't require component redesign.

**Decision 6: No test for `SystemModelsTab`**
- **Why:** The parent feature's Testing Decisions section explicitly marks UI composition layers (`SystemModelsTab`, `AvailableModelsTab`, etc.) as outside the unit-test scope: "Their correctness is verified by the manual browser validation step." Testing a thin renderer with mocked props adds little value over the hook tests that already cover all behavioral state transitions.
- **Alternatives considered:** Test rendering with mocked props — not categorically wrong, but the project convention is not to test composition layers.

---

## Testing Considerations

### Automatic Validation

- [ ] `npm --prefix project/srcs/frontend run test -- --run src/features/app-settings/hooks/useSystemModels.test.ts` — all 7 hook tests pass after GREEN implementation.
- [ ] `npm --prefix project/srcs/frontend run test -- --run` — full suite passes at **123/123** (0 regressions from 116 baseline).
- [ ] `npm --prefix project/srcs/frontend run typecheck` — 0 TypeScript errors across all new and modified files.
- [ ] `npm --prefix project/srcs/frontend run build` — Vite build succeeds; no new chunk-size changes from this task.
- [ ] `grep -rn "useSystemModels\|SystemModelsTab" project/srcs/frontend/src/features/app-settings/index.ts` — confirms both are exported from the feature barrel.

### Manual Validation

Manual browser validation is deferred to Task 5, where `SystemModelsTab` is mounted inside `AppSettingsPage`. The following checks will be required then:

- [ ] **System Models tab renders**: Navigate to `/app-settings`, click "System Models" tab — confirm the table appears with model name, model ID, status badge, and Enable/Disable button for each model.
- [ ] **Enable/Disable toggle**: Click "Disable" on an enabled model — confirm the row spinner appears, the button disables, and after the request completes the model shows as "Disabled" with an "Enable" button.
- [ ] **Toggle error recovery**: With the backend stopped, click "Disable" — confirm an error message appears on the failing row and a "Refresh" link is visible; clicking "Refresh" re-fetches the model list.
- [ ] **Empty state**: Confirm that if no system models exist, the empty-state message "No system models found. Add models from the Add Models tab." renders correctly.

---

## Related Code Explanations

- `project/srcs/frontend/src/features/app-settings/services/appSettingsService.ts` — `listLlmModels()` and `toggleLlmModel(id)` are the only external dependencies of `useSystemModels`.
- `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.ts` — reference for hook structure (async `load()`, `useEffect` mount pattern, Axios error extraction). The optional `models` prop change to decouple from `listLlmModels` is scoped to Task 5.
- `project/srcs/frontend/src/features/employees/hooks/useEmployeeList.test.ts` — deferred-promise testing pattern (`resolveRetry`) used in Tests 2, 5, 7.
- `project/srcs/frontend/src/features/employees/components/EmployeeTable.tsx` — reference for inline `<span>` status badges and the table layout pattern.
- [[Admin-LLM-Model-Catalog-Page]] — parent feature with hook interface, `toggleState` semantics (Finding 5 resolution), and `SystemModelsTab` layout specification.
- [[Bugs/done/Review-Admin-LLM-Model-Catalog-Page]] — Finding 5 (atomic `toggleState`), Finding 2 (single source of truth — deferred to Task 5), Finding 3 (conditional modal mount — Task 4).

---

## Completion Criteria

- [ ] Parent document reviewed and reflected accurately in this task.
- [ ] Task 1 and Task 2 state verified — this task accounts for current codebase after both prior tasks.
- [ ] Relevant skills reviewed and selected.
- [x] `useSystemModels.test.ts` created with 7 behavior tests (Tests 1–7).
- [x] RED confirmed: tests fail before `useSystemModels.ts` is created.
- [x] `useSystemModels.ts` implemented — hook fetches on mount, exposes `toggleModel` and `refresh`, manages atomic `toggleState`.
- [x] GREEN confirmed: all 7 tests pass.
- [x] `SystemModelsTab.tsx` created — thin table renderer with status badges, toggle buttons, per-row spinner, per-row error with Refresh link.
- [x] `index.ts` updated — exports `useSystemModels`, `UseSystemModelsResult`, `ToggleState`, and `SystemModelsTab`.
- [x] `npm --prefix project/srcs/frontend run test -- --run` passes at **123/123**.
- [x] `npm --prefix project/srcs/frontend run typecheck` passes with 0 errors.
- [x] `npm --prefix project/srcs/frontend run build` succeeds.
- [x] Manual browser validation steps documented (deferred to Task 5).
- [x] Parent feature Task 3 section updated with wiki link `[[Admin-LLM-Model-Catalog-Page-task-3-system-models-hook-and-tab]]`.
