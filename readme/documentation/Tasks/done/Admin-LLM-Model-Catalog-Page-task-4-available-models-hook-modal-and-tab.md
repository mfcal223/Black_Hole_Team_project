# Task: Available Models Hook, Modal, and Tab

#task #current #high-complexity #parent-admin-llm-model-catalog-page

**Parent:** [[Admin-LLM-Model-Catalog-Page]]
**Parent Type:** Feature
**Related Step(s):** Phase 4 — Steps 4.1, 4.2, 4.3, 4.4
**Estimated Complexity:** High

---

## Goal

Create `useAvailableModels` — the lazy-loading hook that owns the static OpenRouter catalog fetch and client-side search — via TDD, build `AddModelModal` as a confirmation dialog that calls `POST /llm-model`, and build `AvailableModelsTab` as a thin renderer that combines the hook and modal into the full Add Models flow. Together these three modules complete the catalog-browsing side of the feature.

---

## Parent Context

The parent feature, [[Admin-LLM-Model-Catalog-Page]], extends the existing `/app-settings` admin page into a three-tab layout: **General Settings** (existing), **System Models** (admin-curated LLM catalog — built in Task 3), and **Add Models** (static OpenRouter catalog browser — this task).

Task 4 delivers the static-catalog half of the feature:

- **Step 4.1 — `useAvailableModels` hook**: Owns the `fetch("/models.json")` lifecycle. Exposes `load()` for caller-triggered lazy loading; `hasLoaded` flag prevents re-fetching within the same mount cycle. `filteredModels` is derived inline from `allModels` filtered by `searchQuery` (case-insensitive match on `name`). No fetch fires on mount — the caller decides when to load.
- **Step 4.2 — unit tests (TDD first)**: Five behavior tests for `useAvailableModels` written before the implementation. Tests mock `global.fetch` via `vi.stubGlobal` and verify observable behavior through the hook's public interface.
- **Step 4.3 — `AddModelModal` component**: A confirmation dialog pre-filled with the selected OpenRouter model's data. `modelId` is read-only. `name` and `description` are editable. Submit calls `createLlmModel(form)` from `appSettingsService.ts`; on success it calls `onSuccess()` (which closes the modal at the parent). No unit tests — composition layer validated manually in Task 5.
- **Step 4.4 — `AvailableModelsTab` component**: Thin renderer. Calls `useAvailableModels` internally; triggers `load()` on mount via `useEffect([], [])`. Derives `systemModelIds: Set<string>` from the parent-supplied `systemModels` prop for O(1) cross-reference. Conditionally mounts `AddModelModal` via `{selectedModel && <AddModelModal .../>}`. No unit tests — composition layer.

**The `AppSettingsPage` 3-tab restructure** — which mounts `SystemModelsTab`, `AvailableModelsTab`, wires `useSystemModels` at the page level, passes `models` into `useAppSettings`, and sets `keepMounted={false}` on the `add-models` TabsContent — is **scoped to Task 5**. Task 4 builds all three modules as standalone; page-level composition happens in Task 5.

**Current progress:** Tasks 1, 2, and 3 ([[Admin-LLM-Model-Catalog-Page-task-1-static-catalog-setup]], [[Admin-LLM-Model-Catalog-Page-task-2-service-and-types]], [[Admin-LLM-Model-Catalog-Page-task-3-system-models-hook-and-tab]]) are implemented. The codebase baseline entering Task 4:
- `public/models.json` present (339 OpenRouter models, shape: `{ "data": OpenRouterModel[] }`).
- `src/components/ui/tabs.tsx` present; `TabsContent` forwards `{...props}` to `Tabs.Panel`.
- `types.ts` has `OpenRouterModel` and `LlmModelForm`.
- `appSettingsService.ts` exports `createLlmModel()`.
- `useSystemModels` hook and `SystemModelsTab` component exist and are barrel-exported.
- Test count: **123/123** across 20 files.

---

## Preconditions / Dependencies

- `project/srcs/frontend/` exists with all Task 1, 2, and 3 code in place.
- `features/app-settings/services/appSettingsService.ts` exports `createLlmModel(form: LlmModelForm)` (added in Task 2).
- `features/app-settings/types.ts` exports `OpenRouterModel` and `LlmModelForm`.
- `features/app-settings/hooks/useAppSettings.test.ts` service mock factory includes `createLlmModel: vi.fn()` and `toggleLlmModel: vi.fn()` (synchronized in Task 2).
- `features/app-settings/index.ts` currently exports `AppSettingsForm`, `SystemModelsTab`, `useAppSettings`, `useSystemModels`, `UseSystemModelsResult`, `ToggleState`, and all types from `./types`.
- Common UI components available: `LoadingSpinner` from `@/components/common/LoadingSpinner`, `ErrorMessage` from `@/components/common/ErrorMessage`.
- shadcn UI installed: `Table` (and sub-components), `Button`, `Input`, `Label`, `Dialog` (and sub-components) — all in `@/components/ui/`. No `Textarea` or `Badge` component exists.
- `Dialog` in this project wraps `@base-ui/react/dialog`. It accepts `open` (boolean) and `onOpenChange` (function) from `DialogPrimitive.Root.Props`. The conditional-mount pattern (`{selectedModel && <Modal .../>}`) renders it with `open` always `true`; `onOpenChange` fires with `false` on user-initiated close (X button or backdrop click).
- `tsconfig.app.json` enforces `strict`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, `erasableSyntaxOnly` — use `import type` for type-only imports.
- Test baseline: **123/123**. No regressions allowed.
- No dependency on Task 5 (page restructure) — this task is self-contained.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `memory-bank` — Selected — loaded AgentForge frontend architecture, testing patterns, hook conventions, and current feature progress (Task 3 implemented, 123/123 tests).
- `documentation-management` — Selected — confirmed Task placement, naming convention, and template structure.
- `solid-deep-design` — Selected — applied to `useAvailableModels` interface design (SRP: one module owns fetch + filter; Depth: small interface hides fetch lifecycle, parse, guard, and search; Deletion test: fetch lifecycle, parse, and filter logic would scatter across `AvailableModelsTab` without the hook).
- `tdd` — Selected — Task 4 follows vertical TDD: RED tests (Step 1) before GREEN implementation (Step 2); modal and tab are written after hook is green.
- `find-docs` — Selected — confirmed Base UI Dialog props and `vi.stubGlobal` pattern for mocking `global.fetch` in Vitest.
- `glossary-management` — Selected — domain terms: OpenRouter Model, System Model, model catalog.

### Documentation Reviewed

- **Parent feature [[Admin-LLM-Model-Catalog-Page]]** — hook interface, `AddModelModal` props and behavior, `AvailableModelsTab` layout, pricing format spec, and Testing Decisions section.
- **[[Bugs/done/Review-Admin-LLM-Model-Catalog-Page]] Finding 3** — conditional modal mount (`{selectedModel && <AddModelModal .../>}`) is the correct pattern; always-mounting is not needed for Base UI Dialog animations.
- **[[Admin-LLM-Model-Catalog-Page-task-3-system-models-hook-and-tab]]** — confirms codebase state entering Task 4, test baseline, and barrel export current state.
- **`@testing-library/react@16.x` (Context7)** — confirmed `renderHook` + `act` API; `vi.stubGlobal("fetch", vi.fn())` pattern for mocking browser `fetch`; `vi.unstubAllGlobals()` in `afterEach` for cleanup.
- **`vitest@4.x` (Context7)** — confirmed `vi.stubGlobal` behavior; `vi.mocked(fetch)` typed access; `mockResolvedValueOnce` for single-use mocks.
- **`CreateEmployeeModal.tsx`** — reference for `Dialog open onOpenChange={...}` conditional-mount pattern.
- **`EmployeesPage.tsx`** — reference for `{condition && <Modal onClose={...} onSuccess={...} />}` conditional mount wiring.
- **`public/models.json`** — confirmed shape: `{ "data": OpenRouterModel[] }`, 339 entries; `pricing.prompt` and `pricing.completion` are per-token string values (e.g., `"0.000005"` = $0.000005/token = $5.00/M tokens).

### Related Existing Code

- `project/srcs/frontend/src/features/app-settings/services/appSettingsService.ts:27-30` — `createLlmModel(form)` called by `AddModelModal` on submit.
- `project/srcs/frontend/src/features/app-settings/types.ts` — `OpenRouterModel`, `LlmModelForm`, `LlmModelDTO` types.
- `project/srcs/frontend/src/features/app-settings/hooks/useSystemModels.ts` — reference for hook body pattern (state management, async lifecycle, error extraction).
- `project/srcs/frontend/src/features/app-settings/hooks/useSystemModels.test.ts` — reference for mock factory pattern and `vi.clearAllMocks()` in `beforeEach`.
- `project/srcs/frontend/src/features/app-settings/components/SystemModelsTab.tsx` — reference for table layout, inline status badges, and empty-state pattern.
- `project/srcs/frontend/src/features/employees/components/CreateEmployeeModal.tsx` — reference for `Dialog open onOpenChange` conditional-mount pattern.
- `project/srcs/frontend/src/pages/EmployeesPage.tsx:88-109` — reference for `{condition && <Modal .../>}` wiring.
- `project/srcs/frontend/src/components/ui/dialog.tsx` — confirms `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter` exports; Base UI backed.
- `project/srcs/frontend/src/components/ui/table.tsx` — `Table`, `TableHeader`, `TableBody`, `TableHead`, `TableRow`, `TableCell`.
- `project/srcs/frontend/src/components/ui/input.tsx` — `Input` component for search field and form fields.
- `project/srcs/frontend/src/features/app-settings/index.ts` — barrel to update with new exports.
- `project/srcs/frontend/public/models.json` — static file served at `/models.json` (fetched lazily).

---

## Implementation Details

### Approach

This task applies vertical TDD slices: RED tests for `useAvailableModels` are written first (Step 1), then the hook is implemented to GREEN (Step 2). `AddModelModal` and `AvailableModelsTab` are written after the hook passes (Steps 3–4).

**SOLID / Deep Module analysis for `useAvailableModels`:**

- **SRP**: One responsibility — own the static OpenRouter catalog fetch and client-side search. It does not format prices, cross-reference system models, manage modal state, or know about tabs. Its one reason to change: the static file location or shape changes, or the search predicate changes.
- **Depth**: Small interface (7 return values) hides substantial behavior: lazy load guard (`hasLoaded`), `fetch()` lifecycle, JSON parsing, error handling, and reactive filter derivation. Deletion test: without the hook, fetch lifecycle and filter logic scatter across `AvailableModelsTab` — the component would own both rendering and data fetching, violating SRP and making testing impossible without rendering.
- **DIP**: `useAvailableModels` depends only on `global.fetch` (browser built-in) and `OpenRouterModel` type. Tests mock `global.fetch` via `vi.stubGlobal` — no Axios seam needed.
- **ISP**: Caller-side interface is narrow. `AvailableModelsTab` uses `filteredModels`, `isLoading`, `error`, `searchQuery`, `setSearchQuery`, `load`. `hasLoaded` is exposed for future use (e.g., a "reload" button) but not used by `AvailableModelsTab` in MVP.

**`hasLoaded` guard semantics:**

`load()` is a no-op when `hasLoaded` is `true`. Since `hasLoaded` is state, the first call to `load()` (with `hasLoaded = false`) initiates the fetch and eventually sets `hasLoaded = true`. Any subsequent call to `load()` — including from a re-render — sees `hasLoaded = true` and returns early. Note: because `AvailableModelsTab` calls `useAvailableModels` internally, `hasLoaded` resets to `false` on unmount/remount. For MVP, re-fetching `/models.json` on each tab-open (if `keepMounted={false}`) is acceptable — the key user story (#12) requires no fetch on page load, not memoization across tab switches.

**Pricing format:**

`pricing.prompt` and `pricing.completion` are per-token costs as strings (e.g., `"0.000005"` = $5.00 per million tokens). Format:
```typescript
function formatPrice(pricePerToken: string | null | undefined): string {
  if (!pricePerToken || parseFloat(pricePerToken) === 0) return "Free"
  return `$${(parseFloat(pricePerToken) * 1_000_000).toFixed(2)} / 1M`
}
```

**Context window format:**

```typescript
function formatContext(contextLength: number | null): string {
  if (!contextLength) return "—"
  return contextLength.toLocaleString()
}
```

**`AddModelModal` is conditionally mounted at `AvailableModelsTab`:**

Follows the Employee modal convention (Finding 3). `{selectedModel && <AddModelModal model={selectedModel} ... />}` — `model` is guaranteed non-null because the modal only mounts when `selectedModel` is non-null. `useState` in `AddModelModal` initializes directly from `model.id`/`model.name`/`model.description` with no null-guard.

**No `Textarea` component:** There is no `textarea.tsx` in `src/components/ui/`. The `description` field uses a native `<textarea>` element with Tailwind classes matching the project's input style (`rounded-md border border-input bg-background px-3 py-2 text-xs`).

**No unit tests for `AddModelModal` or `AvailableModelsTab`:** Per the parent feature's Testing Decisions section, UI composition layers are validated by manual browser testing in Task 5.

**`fetch` mock approach:** `vi.stubGlobal("fetch", vi.fn())` in `beforeEach`, `vi.unstubAllGlobals()` in `afterEach`. Each test sets `vi.mocked(fetch).mockResolvedValueOnce(...)` with the required response shape.

**Promise chain draining in tests:** The `load()` function uses a `.then(res => res.json()).then(json => setState)` chain — two microtask ticks after `fetch` resolves. Inside `act(async () => { void result.current.load(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve() })`, three `await Promise.resolve()` calls reliably drain the full chain (fetch resolution + json resolution + React state batch).

### Files to Create/Modify

- [ ] `project/srcs/frontend/src/features/app-settings/hooks/useAvailableModels.test.ts` — **new** — 5 behavior tests (TDD RED first).
- [ ] `project/srcs/frontend/src/features/app-settings/hooks/useAvailableModels.ts` — **new** — lazy-load hook with `load()`, `hasLoaded`, `searchQuery`, `filteredModels`.
- [ ] `project/srcs/frontend/src/features/app-settings/components/AddModelModal.tsx` — **new** — confirmation dialog for adding a model.
- [ ] `project/srcs/frontend/src/features/app-settings/components/AvailableModelsTab.tsx` — **new** — catalog browser tab with search and cross-reference.
- [ ] `project/srcs/frontend/src/features/app-settings/index.ts` — **modify** — export new hook and components.

---

## Step-by-Step Implementation

### Step 1: Write RED Tests for `useAvailableModels`

**Goal:** Establish all 5 test cases before any implementation. Tests fail with "module not found" until Step 2.
**Dependencies:** Task 2's `createLlmModel` service and `OpenRouterModel` type exist.

- [ ] Create `project/srcs/frontend/src/features/app-settings/hooks/useAvailableModels.test.ts`.
- [ ] Stub `global.fetch` with `vi.stubGlobal` in `beforeEach`; restore with `vi.unstubAllGlobals()` in `afterEach`.
- [ ] Write 5 behavior tests (see Implementation below).
- [ ] Run `npm --prefix project/srcs/frontend run test -- --run src/features/app-settings/hooks/useAvailableModels.test.ts` — confirm RED (import failure).

#### Implementation

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useAvailableModels } from "./useAvailableModels"
import type { OpenRouterModel } from "../types"

// ── Fixtures ────────────────────────────────────────────────────────────────────

const mockModels: OpenRouterModel[] = [
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    description: "OpenAI GPT-4o flagship model",
    context_length: 128000,
    pricing: { prompt: "0.000005", completion: "0.000015" },
  },
  {
    id: "anthropic/claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
    description: null,
    context_length: 200000,
    pricing: { prompt: "0.000003", completion: "0.000015" },
  },
  {
    id: "meta/llama-3-8b-instruct",
    name: "Llama 3 8B Instruct",
    description: null,
    context_length: 8192,
    pricing: { prompt: "0", completion: "0" },
  },
]

// ── Suite ────────────────────────────────────────────────────────────────────────

describe("useAvailableModels", () => {
  beforeEach(() => {
    // Replace global.fetch with a fresh Vitest spy for each test.
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ── Test 1: No fetch on init ────────────────────────────────────────────────
  it("does not fetch on mount and initialises with hasLoaded false and empty filteredModels", () => {
    const { result } = renderHook(() => useAvailableModels())

    expect(vi.mocked(fetch)).not.toHaveBeenCalled()
    expect(result.current.hasLoaded).toBe(false)
    expect(result.current.filteredModels).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  // ── Test 2: load() fetches /models.json and populates ──────────────────────
  it("fetches /models.json and populates filteredModels when load() is called", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({ data: mockModels }),
    } as unknown as Response)

    const { result } = renderHook(() => useAvailableModels())

    await act(async () => {
      void result.current.load()
      await Promise.resolve() // drain: fetch() resolves
      await Promise.resolve() // drain: res.json() resolves
      await Promise.resolve() // drain: setState callbacks flush
    })

    expect(vi.mocked(fetch)).toHaveBeenCalledWith("/models.json")
    expect(result.current.filteredModels).toEqual(mockModels)
    expect(result.current.hasLoaded).toBe(true)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  // ── Test 3: searchQuery filters by name case-insensitively ─────────────────
  it("filters filteredModels case-insensitively by name when searchQuery is set", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({ data: mockModels }),
    } as unknown as Response)

    const { result } = renderHook(() => useAvailableModels())

    // Load the catalog first
    await act(async () => {
      void result.current.load()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    // "gpt" matches "GPT-4o" (case-insensitive); other models do not contain "gpt"
    await act(async () => {
      result.current.setSearchQuery("gpt")
    })

    expect(result.current.filteredModels).toEqual([mockModels[0]])
  })

  // ── Test 4: empty searchQuery returns all models ────────────────────────────
  it("returns all models when searchQuery is cleared back to empty string", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({ data: mockModels }),
    } as unknown as Response)

    const { result } = renderHook(() => useAvailableModels())

    // Load, then set a search query, then clear it
    await act(async () => {
      void result.current.load()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    await act(async () => {
      result.current.setSearchQuery("llama")
    })

    expect(result.current.filteredModels).toEqual([mockModels[2]])

    await act(async () => {
      result.current.setSearchQuery("")
    })

    expect(result.current.filteredModels).toEqual(mockModels)
  })

  // ── Test 5: fetch error sets error ─────────────────────────────────────────
  it("sets error and leaves filteredModels empty when fetch returns a non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as unknown as Response)

    const { result } = renderHook(() => useAvailableModels())

    await act(async () => {
      void result.current.load()
      await Promise.resolve() // drain: fetch() resolves (non-ok)
      await Promise.resolve() // drain: throw + catch + setState
    })

    expect(result.current.error).toBe("HTTP 500")
    expect(result.current.filteredModels).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })
})
```

#### Edge Cases

1. **Case:** `vi.mocked(fetch)` is typed `(...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>`. Asserting `not.toHaveBeenCalled()` and `toHaveBeenCalledWith("/models.json")` work on the spy.
   **Handling:** `vi.stubGlobal("fetch", vi.fn())` replaces the global with a plain `vi.fn()`. `vi.mocked(fetch)` provides the typed mock reference.

2. **Case:** The `Response` type requires `body`, `headers`, etc. Casting `{ ok: true, json: vi.fn() }` to `Response` would fail TypeScript.
   **Handling:** Use `as unknown as Response` to bypass the type check. This is intentional — tests mock only the subset of `Response` that the hook actually uses.

3. **Case:** Three `await Promise.resolve()` may not be sufficient on all environments.
   **Handling:** If a test intermittently fails due to timing, add a fourth `await Promise.resolve()`. The double tick (fetch + json) plus the React state batch flush is reliably covered by three ticks in jsdom.

4. **Case:** Test 5 (non-ok fetch) — `res.json()` is never called, so the chain reaches the catch from the `throw new Error(`HTTP ${res.status}`)` inside the first `.then()`.
   **Handling:** Only two `await Promise.resolve()` are needed for the non-ok path (fetch resolves → throw in then → catch). Three are used for consistency.

---

### Step 2: Implement `useAvailableModels` to GREEN

**Goal:** Write the hook to make all 5 tests pass.
**Dependencies:** Step 1 tests fail (RED) with "module not found."

- [ ] Create `project/srcs/frontend/src/features/app-settings/hooks/useAvailableModels.ts`.
- [ ] Run targeted tests → confirm GREEN.
- [ ] Run full suite → confirm 128/128 (no regressions).

#### Implementation

```typescript
import { useState } from "react"
import type { OpenRouterModel } from "../types"

export interface UseAvailableModelsResult {
  filteredModels: OpenRouterModel[]
  isLoading: boolean
  error: string | null
  searchQuery: string
  setSearchQuery: (q: string) => void
  load: () => void
  hasLoaded: boolean
}

export function useAvailableModels(): UseAvailableModelsResult {
  const [allModels, setAllModels] = useState<OpenRouterModel[]>([])
  const [hasLoaded, setHasLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  function load() {
    if (hasLoaded) return
    setIsLoading(true)
    setError(null)

    void fetch("/models.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((json: { data: OpenRouterModel[] }) => {
        setAllModels(json.data)
        setHasLoaded(true)
      })
      .catch((err: Error) => {
        setError(err.message ?? "Failed to load model catalog.")
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  const filteredModels =
    searchQuery.trim() === ""
      ? allModels
      : allModels.filter((m) =>
          m.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
        )

  return {
    filteredModels,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    load,
    hasLoaded,
  }
}
```

Run targeted tests:

```bash
npm --prefix project/srcs/frontend run test -- --run src/features/app-settings/hooks/useAvailableModels.test.ts
```

Expected GREEN: 5/5 tests pass.

Run full suite:

```bash
npm --prefix project/srcs/frontend run test -- --run
```

Expected: **128/128** (123 baseline + 5 new `useAvailableModels` tests). No regressions.

#### Edge Cases

1. **Case:** `load()` closure captures the stale `hasLoaded = false` from the initial render.
   **Handling:** This is correct behavior. On first render, `hasLoaded` is `false` and `load()` fires the fetch. After the fetch sets `hasLoaded = true`, the component re-renders with a new `load` function that sees `hasLoaded = true` and returns early. Any subsequent explicit `load()` call (e.g., from `AvailableModelsTab`'s `useEffect`) uses the stale reference (captured at mount time, `hasLoaded = false`) only on first mount — the effect runs once and doesn't re-run.

2. **Case:** `void fetch(...)` on a rejected promise (network failure, not HTTP error) — the `.catch()` would catch the rejection and set error. The `Error.message` is used as the error string.
   **Handling:** `(err: Error) => { setError(err.message ?? "...") }` covers both HTTP-level errors (thrown manually as `new Error("HTTP 500")`) and network-level rejections.

3. **Case:** `load()` called concurrently (before `hasLoaded` becomes `true`).
   **Handling:** The `hasLoaded` guard does NOT prevent concurrent fetches if `load()` is called multiple times before the first fetch completes. In practice, `AvailableModelsTab` calls `load()` only once in a `useEffect([], [])`, so concurrent calls don't occur in production. For MVP, this is accepted.

4. **Case:** `filteredModels` derivation with trailing/leading whitespace in `searchQuery`.
   **Handling:** `searchQuery.trim()` checks for blank (all whitespace returns all models). The filter uses `searchQuery.toLowerCase().trim()` to normalize the search term, preventing empty-string substring matching on non-empty whitespace queries.

---

### Step 3: Create `AddModelModal` Component

**Goal:** Build the confirmation dialog that pre-fills the selected OpenRouter model's data and calls `createLlmModel` on submit.
**Dependencies:** Step 2 hook is GREEN; `createLlmModel` service function exists; `Dialog` component exists in `src/components/ui/dialog.tsx`.

- [ ] Create `project/srcs/frontend/src/features/app-settings/components/AddModelModal.tsx`.
- [ ] Run `npm --prefix project/srcs/frontend run typecheck` — confirm 0 errors.
- [ ] Run full suite — confirm 128/128 (component adds no tests).

#### Implementation

```typescript
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createLlmModel } from "../services/appSettingsService"
import type { OpenRouterModel } from "../types"

interface AddModelModalProps {
  model: OpenRouterModel
  onClose: () => void
  onSuccess: () => void
}

export function AddModelModal({ model, onClose, onSuccess }: AddModelModalProps) {
  // model is guaranteed non-null (conditional mount at AvailableModelsTab).
  const [name, setName] = useState(model.name)
  const [description, setDescription] = useState(model.description ?? "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit() {
    setIsSubmitting(true)
    setError(null)
    try {
      await createLlmModel({
        modelId: model.id,
        name: name.trim(),
        description: description.trim() || undefined,
      })
      onSuccess() // parent sets selectedModel to null (unmounts modal) and calls onModelAdded()
    } catch (err) {
      const axiosErr = err as {
        response?: { data?: { message?: string } }
        message?: string
      }
      setError(
        axiosErr.response?.data?.message ??
          axiosErr.message ??
          "Failed to add model."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Model</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="add-model-id">Model ID</Label>
            <Input
              id="add-model-id"
              value={model.id}
              readOnly
              className="text-muted-foreground"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="add-model-name">Display Name *</Label>
            <Input
              id="add-model-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="add-model-description">Description</Label>
            <textarea
              id="add-model-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={() => void onSubmit()}
            disabled={isSubmitting || name.trim() === ""}
          >
            {isSubmitting ? "Adding…" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

#### Edge Cases

1. **Case:** `model.description` is `null` (many OpenRouter models have no description).
   **Handling:** `useState(model.description ?? "")` initializes the textarea to empty string when null. `description.trim() || undefined` sends `undefined` to `createLlmModel`, which omits `description` from the request body (consistent with `LlmModelForm.description?: string`).

2. **Case:** Admin clears the `name` field entirely.
   **Handling:** `disabled={isSubmitting || name.trim() === ""}` prevents submission with an empty name. The backend would also reject it, but guarding in the UI gives immediate feedback.

3. **Case:** `onSuccess()` is called before `finally` runs `setIsSubmitting(false)`. Since `onSuccess()` calls `setSelectedModel(null)` in the parent, the modal is unmounted. The `finally` `setIsSubmitting(false)` runs on an unmounted component.
   **Handling:** React 18+ suppresses "can't perform state update on unmounted component" warnings — the `finally` is a no-op after unmount. No cleanup needed.

4. **Case:** `Dialog open onOpenChange` — `open` is always `true` (modal is conditionally mounted, not controlled via `open`). `onOpenChange` fires with `false` when the user clicks the X button or the backdrop.
   **Handling:** `if (!isOpen) onClose()` calls the parent's close handler (sets `selectedModel` to null, unmounting the modal). This mirrors the `CreateEmployeeModal` pattern exactly.

---

### Step 4: Create `AvailableModelsTab` Component

**Goal:** Build the full catalog browser — search input, model table with pricing and context info, cross-reference against system models, and conditional modal mounting.
**Dependencies:** Steps 2 and 3 complete; `useAvailableModels`, `AddModelModal`, `LlmModelDTO`, `OpenRouterModel` all exist.

- [ ] Create `project/srcs/frontend/src/features/app-settings/components/AvailableModelsTab.tsx`.
- [ ] Run `npm --prefix project/srcs/frontend run typecheck` — confirm 0 errors.
- [ ] Run full suite — confirm 128/128.

#### Implementation

```typescript
import { useState, useEffect } from "react"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { ErrorMessage } from "@/components/common/ErrorMessage"
import { useAvailableModels } from "../hooks/useAvailableModels"
import { AddModelModal } from "./AddModelModal"
import type { LlmModelDTO, OpenRouterModel } from "../types"

interface AvailableModelsTabProps {
  systemModels: LlmModelDTO[]
  onModelAdded: () => void
}

function formatPrice(pricePerToken: string | null | undefined): string {
  if (!pricePerToken || parseFloat(pricePerToken) === 0) return "Free"
  return `$${(parseFloat(pricePerToken) * 1_000_000).toFixed(2)} / 1M`
}

function formatContext(contextLength: number | null): string {
  if (!contextLength) return "—"
  return contextLength.toLocaleString()
}

export function AvailableModelsTab({
  systemModels,
  onModelAdded,
}: AvailableModelsTabProps) {
  const {
    filteredModels,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    load,
  } = useAvailableModels()

  const [selectedModel, setSelectedModel] = useState<OpenRouterModel | null>(null)

  // Trigger lazy load on first mount — only fires once due to [] deps.
  // load() is a no-op if hasLoaded is already true (within the same mount cycle).
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Derive set of modelIds already in the system catalog for O(1) cross-reference.
  const systemModelIds = new Set(systemModels.map((m) => m.modelId))

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (error) {
    return <ErrorMessage message={error} />
  }

  return (
    <div className="flex flex-col gap-4">
      <Input
        placeholder="Search models by name…"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      <div className="max-h-[500px] overflow-y-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Input</TableHead>
              <TableHead>Output</TableHead>
              <TableHead>Context</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredModels.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-muted-foreground"
                >
                  {searchQuery
                    ? "No models match your search."
                    : "No models available."}
                </TableCell>
              </TableRow>
            )}
            {filteredModels.map((model) => {
              const isAlreadyAdded = systemModelIds.has(model.id)
              return (
                <TableRow key={model.id}>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{model.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {model.id}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {formatPrice(model.pricing?.prompt)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {formatPrice(model.pricing?.completion)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {formatContext(model.context_length)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      {isAlreadyAdded ? (
                        <>
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            Already added
                          </span>
                          <Button size="sm" disabled>
                            Add
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => setSelectedModel(model)}
                        >
                          Add
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {selectedModel && (
        <AddModelModal
          model={selectedModel}
          onClose={() => setSelectedModel(null)}
          onSuccess={() => {
            setSelectedModel(null)
            onModelAdded()
          }}
        />
      )}
    </div>
  )
}
```

#### Edge Cases

1. **Case:** `formatPrice` with `pricing.prompt = "0"` (free model).
   **Handling:** `parseFloat("0") === 0` → returns `"Free"`.

2. **Case:** `formatPrice` with `model.pricing = null` (no pricing info).
   **Handling:** `model.pricing?.prompt` → `undefined` → `!pricePerToken` is true → returns `"Free"`.

3. **Case:** `systemModelIds.has(model.id)` — `model.id` is the OpenRouter model identifier (e.g., `"openai/gpt-4o"`). `LlmModelDTO.modelId` is the same identifier stored in the system catalog. The cross-reference is exact string match.
   **Handling:** `new Set(systemModels.map((m) => m.modelId))` creates the set from `LlmModelDTO.modelId` values. O(1) lookup per row.

4. **Case:** The tab is unmounted/remounted on tab switch (`keepMounted={false}` in Task 5). `useAvailableModels` reinitializes fresh state, `hasLoaded = false`, and `load()` fires again on remount.
   **Handling:** Accepted MVP behavior. `/models.json` is a same-origin static file; re-fetching is fast and invisible to the user. The key user story (#12) — no fetch on page load — is still satisfied.

5. **Case:** 339 models rendered in a table without virtualization.
   **Handling:** The table is wrapped in `max-h-[500px] overflow-y-auto`. The DOM renders all visible rows at once. At 339 rows, this is ~330 KB of DOM nodes in the worst case (no search active). For MVP this is acceptable — the search filter reduces visible rows significantly in practice. Virtualization is deferred to post-MVP.

---

### Step 5: Update the Feature Barrel

**Goal:** Export `useAvailableModels`, `AddModelModal`, and `AvailableModelsTab` from the feature's public API so `AppSettingsPage` (Task 5) can import them without deep paths.
**Dependencies:** Steps 2, 3, and 4 complete.

- [ ] Update `project/srcs/frontend/src/features/app-settings/index.ts`.
- [ ] Run `npm --prefix project/srcs/frontend run typecheck` — confirm 0 errors.

#### Implementation

```typescript
// project/srcs/frontend/src/features/app-settings/index.ts

export { AppSettingsForm } from "./components/AppSettingsForm"
export { SystemModelsTab } from "./components/SystemModelsTab"
export { AddModelModal } from "./components/AddModelModal"
export { AvailableModelsTab } from "./components/AvailableModelsTab"
export { useAppSettings } from "./hooks/useAppSettings"
export { useSystemModels } from "./hooks/useSystemModels"
export { useAvailableModels } from "./hooks/useAvailableModels"
export type { UseSystemModelsResult, ToggleState } from "./hooks/useSystemModels"
export type { UseAvailableModelsResult } from "./hooks/useAvailableModels"
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

1. **Case:** `AddModelModal` imports `createLlmModel` via a relative path to `../services/appSettingsService`. External callers (Task 5 `AppSettingsPage`) do NOT need to import `createLlmModel` — it is an internal service call. Only `AddModelModal` itself needs the service.
   **Handling:** `AddModelModal` is the service's only external consumer for `createLlmModel`. No service re-export is needed.

2. **Case:** `verbatimModuleSyntax: true` requires type-only re-exports to use `export type`.
   **Handling:** `UseAvailableModelsResult` is an interface — use `export type`. The hook function is a value — plain `export`.

---

### Step 6: Run Full Validation

**Goal:** Confirm all tests pass, typecheck is clean, and build succeeds after all file changes.
**Dependencies:** Steps 1–5 complete.

- [ ] Run targeted hook tests.
- [ ] Run full test suite.
- [ ] Run TypeScript typecheck.
- [ ] Run the frontend build.

#### Implementation

```bash
# Targeted hook tests
npm --prefix project/srcs/frontend run test -- --run src/features/app-settings/hooks/useAvailableModels.test.ts

# Full suite
npm --prefix project/srcs/frontend run test -- --run

# Typecheck
npm --prefix project/srcs/frontend run typecheck

# Build
npm --prefix project/srcs/frontend run build
```

Expected:
- Targeted: **5/5** new hook tests pass.
- Full suite: **128/128** (123 baseline + 5 new `useAvailableModels` tests). No regressions.
- Typecheck: **0 errors**.
- Build: succeeds. The pre-existing chunk-size warning is unchanged (`models.json` is in `public/`, not the bundle).

#### Edge Cases

1. **Case:** Typecheck fails on `vi.mocked(fetch)` — `fetch` type may not be a `Mock`.
   **Handling:** `vi.stubGlobal("fetch", vi.fn())` replaces `global.fetch` with a `vi.fn()`. `vi.mocked(fetch)` should type-check correctly. If it doesn't, use `(fetch as ReturnType<typeof vi.fn>)` as a cast.

2. **Case:** Full-suite test count is not 128 (e.g., 127 or 129).
   **Handling:** Count the actual `it(...)` blocks in `useAvailableModels.test.ts` (5 expected). Any mismatch indicates an extra/missing test or a different baseline count. Verify before assuming a regression.

---

## Design Decisions

**Decision 1: `useAvailableModels` uses `global.fetch` instead of the Axios `api` instance**
- **Why:** `/models.json` is a same-origin static asset served by Vite's `public/` directory. It is not a backend API endpoint. Routing it through the `api` Axios instance (which uses `/api` base URL and attaches JWT headers) would be incorrect — `api.get("/models.json")` would resolve to `/api/models.json`, which does not exist.
- **Alternatives considered:** `api.get()` with an explicit URL override — rejected because it bypasses the base URL semantics and attaches unnecessary auth headers to a public asset request.

**Decision 2: `allModels` stored in state (not a `useRef`)**
- **Why:** State changes trigger re-renders, which causes `filteredModels` (derived inline from `allModels`) to update automatically. A `useRef` for `allModels` would require a separate state variable (e.g., `[_, forceUpdate] = useState(0)`) to trigger re-renders — unnecessary complexity.
- **Alternatives considered:** `useRef` for `allModels` + `useState` for `filteredModels` explicitly — rejected because it duplicates state: `filteredModels` would need to be kept in sync with `allModels` and `searchQuery` changes via a `useEffect`, introducing a synchronization risk. Inline derivation from state is simpler and avoids the derived-state pattern.

**Decision 3: `filteredModels` derived inline (not via `useMemo`)**
- **Why:** The filter is a simple case-insensitive substring match on `name`. With 339 models, filtering is sub-millisecond even on a slow CPU. `useMemo` adds cognitive overhead and a dependency array to maintain for no measurable performance benefit.
- **Alternatives considered:** `useMemo` with `[allModels, searchQuery]` deps — not wrong, but premature optimization for a trivially cheap computation.

**Decision 4: No `Textarea` shadcn component — native `<textarea>` with Tailwind**
- **Why:** No `textarea.tsx` exists in `src/components/ui/`. Adding a shadcn Textarea requires `npx shadcn@latest add textarea` with ADR-010 verification (same as the `tabs.tsx` step in Task 1). Adding a shadcn component for a single `<textarea>` field is disproportionate scope for this task.
- **Alternatives considered:** Using `Input` (single-line) for description — rejected because descriptions can be multi-line prose; a multi-row textarea is more appropriate UX. Native `<textarea>` with matching Tailwind classes is the minimal correct solution.

**Decision 5: `AvailableModelsTab` is not virtualized**
- **Why:** With search active, the visible row count drops dramatically. The full 339-model render is only visible when `searchQuery` is empty. With `max-h-[500px] overflow-y-auto`, the DOM renders all rows but only the visible viewport is painted. For an admin-only settings page used infrequently, this is acceptable MVP behavior.
- **Alternatives considered:** `react-virtual` or `@tanstack/react-virtual` for windowing — deferred; adds a dependency and complexity that the feature scope doesn't justify. Can be added if performance profiling shows a real issue.

**Decision 6: `systemModelIds` re-derived from `systemModels` prop on every render**
- **Why:** `AvailableModelsTab` receives `systemModels: LlmModelDTO[]` from `AppSettingsPage` (Task 5). Every time `useSystemModels.refresh()` runs (after toggle or add), `AppSettingsPage` re-renders with a new `systemModels` array. Re-deriving `systemModelIds` on each render ensures the "Already added" badges stay in sync without any effect or memo.
- **Alternatives considered:** `useMemo(() => new Set(...), [systemModels])` — correct but unnecessary; `Set` construction from 339 items is trivially cheap.

---

## Testing Considerations

### Automatic Validation

- [x] `npm --prefix project/srcs/frontend run test -- --run src/features/app-settings/hooks/useAvailableModels.test.ts` — all 5 hook tests pass after GREEN implementation.
- [x] `npm --prefix project/srcs/frontend run test -- --run` — full suite passes at **128/128** (0 regressions from 123 baseline).
- [x] `npm --prefix project/srcs/frontend run typecheck` — 0 TypeScript errors across all new and modified files.
- [x] `npm --prefix project/srcs/frontend run build` — Vite build succeeds; no new bundle size changes (all new modules are tree-shaken or in `public/`).
- [x] `grep -rn "useAvailableModels\|AddModelModal\|AvailableModelsTab" project/srcs/frontend/src/features/app-settings/index.ts` — confirms all three are exported from the feature barrel.

### Manual Validation

Manual browser validation is deferred to Task 5, where `AvailableModelsTab` is mounted inside `AppSettingsPage`. The following checks will be required then:

- [ ] **Add Models tab renders**: Navigate to `/app-settings`, click "Add Models" tab — confirm the model list loads (may take a brief moment) and shows model names, input/output costs, and context sizes.
- [ ] **Search filters**: Type "gpt" in the search input — confirm only models with "gpt" in the name appear (case-insensitive).
- [ ] **Clear search**: Clear the search input — confirm all models reappear.
- [ ] **Already added badge**: Models already in the System Models tab show an "Already added" badge with a disabled Add button.
- [ ] **Add modal opens**: Click "Add" on a model not yet added — confirm the modal opens pre-filled with the model's ID (read-only), name (editable), and description (editable).
- [ ] **Add model succeeds**: Click "Add" in the modal — confirm the modal closes, the System Models tab refreshes, and the newly added model appears there.
- [ ] **Add modal cancel**: Click Cancel or X in the modal — confirm the modal closes without adding a model.
- [ ] **Add model error**: With the backend stopped, click "Add" in the modal — confirm an inline error message appears and the modal stays open.
- [ ] **Already added updates after add**: After adding a model via the modal, switch back to the Add Models tab — confirm the just-added model now shows the "Already added" badge.

---

## Related Code Explanations

- `project/srcs/frontend/src/features/app-settings/services/appSettingsService.ts:27-30` — `createLlmModel()` is `AddModelModal`'s only external dependency; called on form submit.
- `project/srcs/frontend/src/features/app-settings/hooks/useSystemModels.ts` — reference for hook body structure (state management, promise chain, error extraction pattern).
- `project/srcs/frontend/src/features/employees/components/CreateEmployeeModal.tsx` — reference for `Dialog open onOpenChange` conditional-mount pattern and `disabled={isSubmitting}` pattern.
- `project/srcs/frontend/src/pages/EmployeesPage.tsx:88-109` — reference for `{condition && <Modal onClose={...} onSuccess={...} />}` wiring at the parent level.
- `project/srcs/frontend/src/features/app-settings/components/SystemModelsTab.tsx` — reference for table layout, inline `<span>` badge pattern, and empty-state cell.
- [[Admin-LLM-Model-Catalog-Page]] — parent feature with hook interface, `AddModelModal` props, `AvailableModelsTab` layout, pricing format spec, and Testing Decisions.
- [[Bugs/done/Review-Admin-LLM-Model-Catalog-Page]] — Finding 3 (conditional modal mount), Finding 2 (single source of truth wiring — deferred to Task 5), Finding 4 (keepMounted lazy-load contract — Task 5 concern).

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task.
- [x] Tasks 1, 2, and 3 state verified — this task accounts for the current codebase after all three prior tasks.
- [x] Relevant skills reviewed and selected.
- [x] `useAvailableModels.test.ts` created with 5 behavior tests.
- [x] RED confirmed: tests fail before `useAvailableModels.ts` is created.
- [x] `useAvailableModels.ts` implemented — hook exposes `load()`, `filteredModels`, `hasLoaded`, `searchQuery`, `setSearchQuery`; no fetch on init; `hasLoaded` guard prevents double-load; inline filter derivation.
- [x] GREEN confirmed: all 5 tests pass.
- [x] `AddModelModal.tsx` created — Dialog with read-only modelId, editable name/description, `createLlmModel` submit, inline error, cancel/close via `onClose`.
- [x] `AvailableModelsTab.tsx` created — `useAvailableModels` internal, `load()` on mount, `systemModelIds` cross-reference, `selectedModel` state, conditional `AddModelModal` mount, pricing and context formatting.
- [x] `index.ts` updated — exports `useAvailableModels`, `UseAvailableModelsResult`, `AddModelModal`, `AvailableModelsTab`.
- [x] `npm --prefix project/srcs/frontend run test -- --run` passes at **128/128**.
- [x] `npm --prefix project/srcs/frontend run typecheck` passes with 0 errors.
- [x] `npm --prefix project/srcs/frontend run build` succeeds.
- [ ] Manual browser validation steps documented (deferred to Task 5).
- [ ] Parent feature Task 4 section updated with wiki link `[[Admin-LLM-Model-Catalog-Page-task-4-available-models-hook-modal-and-tab]]`.
