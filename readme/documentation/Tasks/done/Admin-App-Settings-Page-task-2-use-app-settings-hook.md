# Task: useAppSettings Hook (TDD)

#task #current #high-complexity #parent-admin-app-settings-page

**Parent:** [[Features/to-do/Admin-App-Settings-Page]]
**Parent Type:** Feature
**Related Step(s):** Phase 2 — Steps 2.1, 2.2, 2.3
**Estimated Complexity:** High

---

## Goal

Implement `src/features/app-settings/hooks/useAppSettings.ts` via a TDD RED → GREEN cycle. This is the feature's deep module: it hides masked-key safety, enabled-model filtering, deterministic model ordering, backend PATCH null semantics, and save/load lifecycle behind a small, stable interface. The page and form component in later tasks become thin consumers of this hook's state.

---

## Parent Context

[[Features/to-do/Admin-App-Settings-Page]] is a frontend-only admin page at `/app-settings`. Task 2 covers **Phase 2 — the `useAppSettings` hook**.

### Role of the hook in the feature

`useAppSettings` is the brain of the settings page. It owns:

- **Load lifecycle**: parallel `Promise.all([getAppSettings(), listLlmModels()])`, `isLoading` flag, `error` state.
- **Masked-key safety**: `openRouterApiKey` from the backend is `null`, `"****"`, or `"****last4"` — never a raw key. The hook must convert this only into a configured/not-configured status. `apiKeyInput` must start and stay at `""` regardless of what `settings.openRouterApiKey` contains.
- **Enabled-model filtering**: `GET /llm-model` returns all models including disabled ones. The hook filters with `model.isEnabled === true` (not a truthy check — `false` must be excluded).
- **Deterministic model ordering**: the hook sorts the enabled model list by `a.name.localeCompare(b.name) || a.modelId.localeCompare(b.modelId)` using a non-mutating spread before sorting so the service-returned array stays immutable.
- **Stale disabled default guard**: if the backend's `defaultModel` FK points to a model that is no longer in the enabled list, `selectedDefaultModelId` is initialized to `null`, not to the stale disabled model's id.
- **PATCH null semantics**: `PATCH /app-settings` clears `defaultModel` when `defaultModelId` is null or omitted. The hook always sends `defaultModelId` explicitly in the save form. `openRouterApiKey` is omitted when `apiKeyInput.trim() === ""` so the backend preserves the existing key.
- **Save lifecycle**: `isSaving`, `successMessage`, `error`, clear `apiKeyInput` after success.

`AppSettingsPage` (Task 4) is a thin composition layer that passes hook state to `AppSettingsForm`. No business logic from this list lives outside this hook.

### Phase 2 steps from parent

| Parent Step | Scope in this task |
|-------------|--------------------|
| Step 2.1 TDD | **DONE** — 12 behavior tests created and confirmed RED with module-not-found; GREEN with 95/95 tests passing |
| Step 2.2 | **DONE** — `useAppSettings.ts` created; all 12 hook tests pass |
| Step 2.3 | **DONE** — `apiKeyInput` is never set from `settings.openRouterApiKey` (grep confirmed zero matches); `setApiKeyInput("")` is called in both `load()` success (line 68) and `save()` success (line 121) |

---

## Preconditions / Dependencies

- **Task 1 complete**: `src/features/app-settings/types.ts` (4 interfaces: `LlmModelDTO`, `LlmModelMiniDTO`, `AppSettingsDTO`, `AppSettingsUpdateForm`) and `src/features/app-settings/services/appSettingsService.ts` (3 functions: `getAppSettings`, `updateAppSettings`, `listLlmModels`) exist. 83/83 tests, 0 typecheck errors, build success.
- `@testing-library/react` 16.3.2 installed — `renderHook` and `act` are available.
- `vitest` 4.1.9 with `jsdom` environment and `@/` path alias from `vitest.config.ts`.
- TypeScript 5.9.3 with `verbatimModuleSyntax: true` and `erasableSyntaxOnly: true` — `import type` required for type-only imports; `enum` prohibited.
- Glossary CLI has no indexed terms (known issue). Domain vocabulary comes from the parent feature: App Settings, OpenRouter API key, enabled LLM Model, default model, Admin.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — Selected — verified documentation layout, task location, task template, and parent update requirement.
- `memory-bank` — Selected — loaded all Memory Bank files for project architecture, active context, prior decisions, and current frontend conventions.
- `solid-deep-design` — Selected — used to evaluate module depth, interface minimality, deletion test, and seam discipline for the hook.
- `tdd` — Selected — governs the RED → GREEN vertical slice cycle.
- `find-docs` — Selected — queried Vitest 4.1.6 for `renderHook` / `act` async hook testing patterns (closest indexed version to 4.1.9).
- `glossary-management` — Selected — CLI available but no indexed terms; domain vocabulary used from parent feature.
- `task-reviewer` — Selected — this document must be reviewed and patched after initial creation.

### Documentation Reviewed

- **Context7 `/vitest-dev/vitest/v4.1.6`** — Confirmed `renderHook` from `@testing-library/react` 16.x; `result.current` holds the latest hook return value; `await act(async () => { ... })` drains microtasks and promise chains including `Promise.all` resolution. `vi.mock` factory pattern hoisted before imports.
- **Prior art: `src/features/employees/hooks/useEditEmployee.test.ts`** — Establishes the `vi.mock` all-exports factory + `vi.mocked()` + `vi.clearAllMocks()` + `renderHook` + two-`act` setter/save split pattern.
- **Prior art: `src/features/employees/hooks/useEmployeeList.ts`** — Shows `useEffect` + async inner function + `Promise.all` pattern; demonstrates explicit-params-to-async-fn to avoid stale-closure state reads.
- **Prior art: `src/features/employees/hooks/useCreateEmployee.test.ts`** — Shows mock factory covering all service exports, `mockResolvedValueOnce` for per-test overrides, `beforeEach(vi.clearAllMocks())` + happy-path defaults.
- **[[Docs/API-Reference/AppSettings]]** — Confirms that `defaultModelId` must be sent explicitly (omitting clears the default), `openRouterApiKey` blank/null preserves the existing key, and the response includes the full `AppSettingsDTO` with a `LlmModelMiniDTO` for the default model.
- **[[Docs/API-Reference/LlmModels]]** — Confirms `GET /llm-model` returns `LlmModelDTO[]` without pagination; includes both enabled and disabled models; `isEnabled` is the boolean field (not `enabled`).
- **[[Features/done/App-Settings-Entity-and-Admin-Configuration]]** — Backend masking behavior, key preservation on blank/null key, default-model clear on null `defaultModelId`.
- **[[ADRs/ADR-007-admin-curated-llm-model-list]]** — Only enabled models may be used as the default; the frontend must not offer disabled models in the selector.
- **[[ADRs/ADR-009-long-primary-key-for-all-entities]]** — `LlmModel.id` is a Java `Long`; mirror as TypeScript `number`.
- **[[Tasks/current/Admin-App-Settings-Page-task-1-types-and-service]]** — Confirmed actual files created in Task 1 and the exact types available.

### Version Information Checked

| Tool | Project version | Source | Documentation used |
|------|-----------------|--------|--------------------|
| React | `19.2.4` | `package.json` | Existing codebase patterns |
| Vitest | `4.1.9` | `package.json` | Context7 `/vitest-dev/vitest/v4.1.6` closest indexed 4.1.x docs |
| @testing-library/react | `16.3.2` | `package.json` | `renderHook` + `act` patterns from `useEditEmployee.test.ts` prior art |
| TypeScript | `5.9.3` | `package.json`, `tsconfig.app.json` | Project config and existing code patterns |

### Related Existing Code

- `project/srcs/frontend/src/features/app-settings/types.ts:1` — All 4 interfaces the hook imports from (`AppSettingsDTO`, `AppSettingsUpdateForm`, `LlmModelDTO`, `LlmModelMiniDTO`).
- `project/srcs/frontend/src/features/app-settings/services/appSettingsService.ts:1` — The 3 service functions the hook depends on (`getAppSettings`, `updateAppSettings`, `listLlmModels`).
- `project/srcs/frontend/src/features/employees/hooks/useEditEmployee.ts:1` — Closest prior-art hook: form state + async save + try/catch/finally + error lifecycle pattern.
- `project/srcs/frontend/src/features/employees/hooks/useEditEmployee.test.ts:1` — Primary test pattern: all-exports mock factory, `vi.mocked()`, two-`act` setter/save split.
- `project/srcs/frontend/src/features/employees/hooks/useEmployeeList.ts:1` — Prior art for `useEffect` + `async function load()` + explicit-params pattern.
- `project/srcs/frontend/vitest.config.ts:1` — `jsdom` environment and `@/` alias.
- `project/srcs/frontend/tsconfig.app.json:1` — `verbatimModuleSyntax: true` import constraints.

---

## Implementation Details

### Approach

**Step 2.1** is a TDD vertical slice:

1. **RED:** Write `useAppSettings.test.ts` with all 12 behavior tests. Run tests — they fail because `./useAppSettings` does not exist yet.
2. **GREEN:** Create `useAppSettings.ts` with the full implementation. Run tests — all 12 pass (95/95 total).
3. **VERIFY:** Run `typecheck` and `build` to confirm 0 errors.

**Step 2.3** is a correctness assertion integrated into the implementation (not a separate code change): verify in code review that `apiKeyInput` is never set from `settings.openRouterApiKey` anywhere in the hook, and that `setApiKeyInput("")` is called in the `save` success path. Tests 3 and 9 provide automated coverage.

### SOLID + Deep Module Analysis

**`useAppSettings.ts`** — **Deep module.**

- **SRP**: One reason to change — the App Settings page state and data lifecycle. Can be described as: "manages App Settings page state, masked-key safety, and PATCH payload construction."
- **Interface**: 14 properties total: 4 raw state values (`settings`, `enabledModels`, `apiKeyInput`, `selectedDefaultModelId`), 4 derived/display values (`hasConfiguredApiKey`, `hasEnabledModels`, `isLoading`, `isSaving`), 2 status values (`error`, `successMessage`), 3 setters (`setApiKeyInput`, `setSelectedDefaultModelId`, `reload`), 1 async action (`save`).
- **Implementation**: `Promise.all` parallel fetch, non-mutating spread+filter+sort, `Boolean(settings.openRouterApiKey)` → `hasConfiguredApiKey`, `isEnabled === true` guard (not truthy), stale-disabled-default guard, `apiKeyInput.trim()` conditional inclusion in PATCH form, `defaultModelId` always in PATCH form, `apiKeyInput` cleared after save, `successMessage` set on success, error extraction from Axios error shape, `isLoading`/`isSaving` managed in `finally`.
- **Deletion test**: Deleting this hook scatters at least 6 independent concerns across `AppSettingsPage` and `AppSettingsForm`: masked-key safety, enabled-model filtering, deterministic sort, PATCH null semantics, stale-default guard, and save lifecycle. `AppSettingsPage` would become a 150+ line state machine with security-sensitive logic embedded in JSX. The hook concentrates all essential complexity behind a minimal interface — this is the correct outcome of the deletion test.
- **Depth verdict: DEEP.**

`hasEnabledModels` is computed inline in the return statement as `enabledModels.length > 0`. It is not stored as separate state because it is a derived value from `enabledModels`. No memoization needed — the return object is reconstructed on every render, and this computation is O(1).

### Files to Create/Modify

- [ ] `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.test.ts` — New: 12 TDD behavior tests (RED, then GREEN).
- [ ] `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.ts` — New: hook implementation.

---

## Step-by-Step Implementation

### Step 2.1 RED: Create `src/features/app-settings/hooks/useAppSettings.test.ts`

**Goal:** Write all 12 behavior tests that specify what `useAppSettings` must do. All tests must fail with a module-not-found error — this is the correct RED signal.
**Dependencies:** Task 1 complete (`types.ts` and `appSettingsService.ts` must exist — the test imports types from `"../types"` and mocks `"../services/appSettingsService"`).

- [ ] Create directory `project/srcs/frontend/src/features/app-settings/hooks/`.
- [ ] Create `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.test.ts` with the content below.
- [ ] Run `npm --prefix project/srcs/frontend run test` — confirm the new suite FAILS with module-not-found; all 83 existing tests still pass.

**Why this step is critical:** Writing tests first forces a precise statement of behavior before any implementation decisions. The masked-key test (Test 3) and the stale-disabled-default test (Test 5) are the most critical discriminating tests — they lock in the security and correctness invariants that distinguish this hook from a trivial state container.

**Mock setup:** The service module has exactly 3 named exports (`getAppSettings`, `updateAppSettings`, `listLlmModels`). The `vi.mock` factory covers all 3 to prevent HTTP leaks. Service functions imported as value imports (not `import type`) because `vi.mocked()` needs the runtime reference — required by `verbatimModuleSyntax: true`.

**Initial load pattern:** The hook triggers load in a `useEffect` with empty deps. To drain the `Promise.all` resolution in tests, use `await act(async () => { await Promise.resolve() })` immediately after `renderHook()`.

#### Implementation: Test File

```typescript
// project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useAppSettings } from "./useAppSettings"
import {
  getAppSettings,
  updateAppSettings,
  listLlmModels,
} from "../services/appSettingsService"
import type { AppSettingsDTO, LlmModelDTO } from "../types"

// Mock all service exports — factory covers all 3 named exports to prevent HTTP leaks.
vi.mock("../services/appSettingsService", () => ({
  getAppSettings: vi.fn(),
  updateAppSettings: vi.fn(),
  listLlmModels: vi.fn(),
}))

// Value imports required by verbatimModuleSyntax: true — vi.mocked() needs the runtime reference.
const mockGetAppSettings = vi.mocked(getAppSettings)
const mockUpdateAppSettings = vi.mocked(updateAppSettings)
const mockListLlmModels = vi.mocked(listLlmModels)

// ── Fixtures ────────────────────────────────────────────────────────────────────

const mockEnabledModel1: LlmModelDTO = {
  id: 2,
  modelId: "openai/gpt-4o",
  name: "GPT-4o",
  description: "OpenAI flagship",
  isEnabled: true,
  createdAt: "2026-06-01T00:00:00",
}

const mockEnabledModel2: LlmModelDTO = {
  id: 3,
  modelId: "anthropic/claude-3.5-sonnet",
  name: "Claude Sonnet",
  description: "Anthropic model",
  isEnabled: true,
  createdAt: "2026-06-01T00:00:00",
}

const mockDisabledModel: LlmModelDTO = {
  id: 4,
  modelId: "meta/llama-3",
  name: "Llama 3",
  description: "Meta model",
  isEnabled: false,
  createdAt: "2026-06-01T00:00:00",
}

// Standard settings fixture: masked key, default model = id 2 (enabled in mockModels)
const mockSettings: AppSettingsDTO = {
  id: 1,
  openRouterApiKey: "****5678",
  defaultModel: {
    id: 2,
    modelId: "openai/gpt-4o",
    name: "GPT-4o",
    isEnabled: true,
  },
  updatedAt: "2026-06-28T10:00:00",
  updatedByUsername: "admin",
}

// Standard models fixture: 2 enabled, used in most tests
const mockModels: LlmModelDTO[] = [mockEnabledModel1, mockEnabledModel2]

// ── Tests ───────────────────────────────────────────────────────────────────────

describe("useAppSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set up happy-path defaults; individual tests override with mockResolvedValueOnce.
    mockGetAppSettings.mockResolvedValue(mockSettings)
    mockListLlmModels.mockResolvedValue(mockModels)
    mockUpdateAppSettings.mockResolvedValue(mockSettings)
  })

  // ── Test 1: Initial load ────────────────────────────────────────────────────
  it("fetches settings and models on mount, sets hasConfiguredApiKey from masked key, and initializes selectedDefaultModelId to the enabled default model id", async () => {
    const { result } = renderHook(() => useAppSettings())
    await act(async () => { await Promise.resolve() })

    // Service calls
    expect(mockGetAppSettings).toHaveBeenCalledOnce()
    expect(mockListLlmModels).toHaveBeenCalledOnce()

    // Settings state
    expect(result.current.settings).toEqual(mockSettings)

    // Masked key "****5678" is truthy → hasConfiguredApiKey = true
    expect(result.current.hasConfiguredApiKey).toBe(true)

    // apiKeyInput stays "" — NEVER copied from masked key (see Test 3)
    expect(result.current.apiKeyInput).toBe("")

    // Default model id=2 is in the enabled list → selectedDefaultModelId set
    expect(result.current.selectedDefaultModelId).toBe(2)

    // Loading complete
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.successMessage).toBeNull()
  })

  // ── Test 2: Deterministic ordering + disabled exclusion ─────────────────────
  it("sorts enabledModels by name then modelId and excludes disabled models, regardless of insertion order", async () => {
    // DISCRIMINATING TEST: seed in an order that is NOT the expected alphabetical order.
    // Insertion order: Claude Sonnet, GPT-4o, Gemini Pro (+ Llama 3 disabled)
    // Expected after filter+sort: [Claude Sonnet, Gemini Pro, GPT-4o]
    const unorderedModels: LlmModelDTO[] = [
      {
        id: 10,
        modelId: "anthropic/claude-3.5-sonnet",
        name: "Claude Sonnet",
        description: null,
        isEnabled: true,
        createdAt: "2026-06-01T00:00:00",
      },
      {
        id: 11,
        modelId: "openai/gpt-4o",
        name: "GPT-4o",
        description: null,
        isEnabled: true,
        createdAt: "2026-06-01T00:00:00",
      },
      {
        id: 12,
        modelId: "google/gemini-pro",
        name: "Gemini Pro",
        description: null,
        isEnabled: true,
        createdAt: "2026-06-01T00:00:00",
      },
      {
        id: 13,
        modelId: "meta/llama-3",
        name: "Llama 3",
        description: null,
        isEnabled: false,  // disabled — must be excluded
        createdAt: "2026-06-01T00:00:00",
      },
    ]
    mockListLlmModels.mockResolvedValueOnce(unorderedModels)
    // Settings with no default model — simplifies the test focus
    mockGetAppSettings.mockResolvedValueOnce({ ...mockSettings, defaultModel: null })

    const { result } = renderHook(() => useAppSettings())
    await act(async () => { await Promise.resolve() })

    // Only enabled models — Llama 3 excluded
    expect(result.current.enabledModels).toHaveLength(3)
    expect(result.current.enabledModels.map((m) => m.name)).toEqual([
      "Claude Sonnet",
      "Gemini Pro",
      "GPT-4o",
    ])
    expect(result.current.hasEnabledModels).toBe(true)

    // Verify Llama 3 (disabled) is not in the list
    expect(result.current.enabledModels.find((m) => m.id === 13)).toBeUndefined()
  })

  // ── Test 3: Masked API key NEVER placed into apiKeyInput (security) ──────────
  it("keeps apiKeyInput as empty string even when settings.openRouterApiKey contains a masked value — masked key must never enter editable state", async () => {
    // Even though settings.openRouterApiKey = "****5678", the hook must NOT do:
    //   setApiKeyInput(settings.openRouterApiKey)
    // That would put the masked value into the password input, which is incorrect.
    // Instead, the hook derives hasConfiguredApiKey from Boolean(settings.openRouterApiKey)
    // and leaves apiKeyInput at "".
    const { result } = renderHook(() => useAppSettings())
    await act(async () => { await Promise.resolve() })

    // Security assertion: apiKeyInput must be "" regardless of settings.openRouterApiKey
    expect(result.current.apiKeyInput).toBe("")

    // Sanity check: the masked key IS present in settings (otherwise the test proves nothing)
    expect(result.current.settings?.openRouterApiKey).toBe("****5678")

    // hasConfiguredApiKey is derived correctly from the masked key
    expect(result.current.hasConfiguredApiKey).toBe(true)
  })

  // ── Test 4: No-enabled-model state ──────────────────────────────────────────
  it("sets hasEnabledModels to false and selectedDefaultModelId to null when all models are disabled", async () => {
    mockListLlmModels.mockResolvedValueOnce([mockDisabledModel])
    // Settings has a defaultModel pointing to the disabled model (id=4)
    mockGetAppSettings.mockResolvedValueOnce({
      ...mockSettings,
      defaultModel: {
        id: 4,
        modelId: "meta/llama-3",
        name: "Llama 3",
        isEnabled: false,
      },
    })

    const { result } = renderHook(() => useAppSettings())
    await act(async () => { await Promise.resolve() })

    expect(result.current.enabledModels).toHaveLength(0)
    expect(result.current.hasEnabledModels).toBe(false)
    // Default model exists in backend but is disabled — not in enabled list → null
    expect(result.current.selectedDefaultModelId).toBeNull()
  })

  // ── Test 5: Stale disabled default model ────────────────────────────────────
  it("sets selectedDefaultModelId to null when the backend default model id is not in the enabled model list", async () => {
    // Scenario: admin previously set model id=99 as default, then disabled it.
    // The backend still holds defaultModel.id = 99, but 99 is not in the enabled list.
    mockGetAppSettings.mockResolvedValueOnce({
      ...mockSettings,
      defaultModel: {
        id: 99,
        modelId: "old/disabled-model",
        name: "Old Model",
        isEnabled: false,
      },
    })
    // mockModels only has id=2 and id=3 — id=99 is absent
    mockListLlmModels.mockResolvedValueOnce(mockModels)

    const { result } = renderHook(() => useAppSettings())
    await act(async () => { await Promise.resolve() })

    // id=99 is not in the enabled list → selectedDefaultModelId must be null
    expect(result.current.selectedDefaultModelId).toBeNull()
    // Enabled models are still populated (id=2 and id=3 are enabled)
    expect(result.current.enabledModels).toHaveLength(2)
  })

  // ── Test 6: Save payload — blank apiKeyInput omits openRouterApiKey ──────────
  it("sends PATCH with only defaultModelId (no openRouterApiKey) when apiKeyInput is blank, preserving the existing key server-side", async () => {
    const { result } = renderHook(() => useAppSettings())
    await act(async () => { await Promise.resolve() })

    // apiKeyInput is "" (default) — blank key must be omitted from the PATCH form
    // selectedDefaultModelId was initialized to 2 (from the enabled default model)
    await act(async () => {
      await result.current.save()
    })

    // The PATCH form must NOT include openRouterApiKey when apiKeyInput is blank
    expect(mockUpdateAppSettings).toHaveBeenCalledWith({
      defaultModelId: 2,
      // openRouterApiKey intentionally absent — backend preserves existing key on omission
    })
  })

  // ── Test 7: Save payload — typed apiKeyInput includes openRouterApiKey ───────
  it("sends PATCH with openRouterApiKey when admin has typed a new key in apiKeyInput", async () => {
    const { result } = renderHook(() => useAppSettings())
    await act(async () => { await Promise.resolve() })

    await act(async () => {
      result.current.setApiKeyInput("sk-or-v1-new-key")
    })
    await act(async () => {
      await result.current.save()
    })

    expect(mockUpdateAppSettings).toHaveBeenCalledWith({
      defaultModelId: 2,
      openRouterApiKey: "sk-or-v1-new-key",
    })
  })

  // ── Test 8: Save payload — clear-default sends defaultModelId: null ─────────
  it("sends PATCH with defaultModelId: null when selectedDefaultModelId has been cleared", async () => {
    const { result } = renderHook(() => useAppSettings())
    await act(async () => { await Promise.resolve() })

    // Clear the selected default model
    await act(async () => {
      result.current.setSelectedDefaultModelId(null)
    })
    await act(async () => {
      await result.current.save()
    })

    expect(mockUpdateAppSettings).toHaveBeenCalledWith({
      defaultModelId: null,
      // openRouterApiKey absent — blank input preserved
    })
  })

  // ── Test 9: Successful save lifecycle ────────────────────────────────────────
  it("clears apiKeyInput, sets successMessage, updates settings, and resets isSaving after a successful save", async () => {
    const updatedSettings: AppSettingsDTO = {
      ...mockSettings,
      openRouterApiKey: "****9999",
      updatedByUsername: "admin",
    }
    mockUpdateAppSettings.mockResolvedValueOnce(updatedSettings)

    const { result } = renderHook(() => useAppSettings())
    await act(async () => { await Promise.resolve() })

    // Type a new API key
    await act(async () => {
      result.current.setApiKeyInput("sk-or-v1-rotated-key")
    })
    await act(async () => {
      await result.current.save()
    })

    // apiKeyInput cleared after success — typed key must not remain in browser state
    expect(result.current.apiKeyInput).toBe("")

    // Success message set
    expect(result.current.successMessage).toBe("App settings saved.")

    // Settings updated from response
    expect(result.current.settings).toEqual(updatedSettings)

    // hasConfiguredApiKey derived from updated settings
    expect(result.current.hasConfiguredApiKey).toBe(true)

    // No error; saving complete
    expect(result.current.error).toBeNull()
    expect(result.current.isSaving).toBe(false)
  })

  // ── Test 10: Save updates selectedDefaultModelId from returned defaultModel ──
  it("updates selectedDefaultModelId from the returned defaultModel after a successful save, using the enabled model list to guard stale models", async () => {
    // Both id=2 and id=3 are in the enabled list (from mockModels in beforeEach)
    // Initial selectedDefaultModelId = 2 (from mockSettings.defaultModel.id)
    // Save response returns defaultModel.id = 3 — which IS in the enabled list
    const updatedSettings: AppSettingsDTO = {
      ...mockSettings,
      defaultModel: {
        id: 3,
        modelId: "anthropic/claude-3.5-sonnet",
        name: "Claude Sonnet",
        isEnabled: true,
      },
    }
    mockUpdateAppSettings.mockResolvedValueOnce(updatedSettings)

    const { result } = renderHook(() => useAppSettings())
    await act(async () => { await Promise.resolve() })

    // Change selected default to 3 before saving
    await act(async () => {
      result.current.setSelectedDefaultModelId(3)
    })
    await act(async () => {
      await result.current.save()
    })

    // selectedDefaultModelId updated from returned defaultModel.id (3 is enabled)
    expect(result.current.selectedDefaultModelId).toBe(3)
  })

  // ── Test 11: Load error lifecycle ────────────────────────────────────────────
  it("sets error and clears isLoading when the initial load fails", async () => {
    mockGetAppSettings.mockRejectedValueOnce(new Error("Network error"))

    const { result } = renderHook(() => useAppSettings())
    await act(async () => { await Promise.resolve() })

    expect(result.current.error).toBe("Network error")
    expect(result.current.isLoading).toBe(false)
    // Settings and models remain null/empty — failed load must not overwrite with stale data
    expect(result.current.settings).toBeNull()
    expect(result.current.enabledModels).toHaveLength(0)
  })

  // ── Test 12: Save error lifecycle ────────────────────────────────────────────
  it("sets error, resets isSaving, and preserves apiKeyInput for retry when updateAppSettings rejects", async () => {
    mockUpdateAppSettings.mockRejectedValueOnce(
      new Error("PATCH /app-settings failed: 500")
    )

    const { result } = renderHook(() => useAppSettings())
    await act(async () => { await Promise.resolve() })

    // Type a key before failing save
    await act(async () => {
      result.current.setApiKeyInput("sk-or-v1-key-to-rotate")
    })
    await act(async () => {
      await result.current.save()
    })

    // Error set, saving complete
    expect(result.current.error).toBe("PATCH /app-settings failed: 500")
    expect(result.current.isSaving).toBe(false)

    // apiKeyInput preserved so admin can retry without re-typing the key
    expect(result.current.apiKeyInput).toBe("sk-or-v1-key-to-rotate")

    // No success message
    expect(result.current.successMessage).toBeNull()
  })
})
```

#### Edge Cases

1. **Case:** `Promise.all` rejection — if `getAppSettings` rejects, `listLlmModels` may still resolve. The `catch` block handles this uniformly regardless of which promise rejected first.
   **Handling:** `Promise.all` rejects on the first rejection. The `catch` extracts the error message from whichever service threw.

2. **Case:** `mockGetAppSettings.toHaveBeenCalledOnce()` in Test 1 may fail in React StrictMode (double-invocation of effects).
   **Handling:** `vitest.config.ts` does not set `reactStrictMode: true` in the global `renderHook` wrapper, so effects run once per test in the jsdom environment. If this assertion fails in CI, change to `toHaveBeenCalled()` and document the finding.

3. **Case:** The `vi.clearAllMocks()` in `beforeEach` resets call counts, call history, and results — but does NOT clear `mockResolvedValue` implementations. Implementations persist between tests unless `vi.resetAllMocks()` is used instead. The `beforeEach` re-sets defaults as a defensive convention to make each test self-contained, not because `clearAllMocks()` erased them.
   **Handling:** Defaults are re-set in `beforeEach` after `clearAllMocks()`. Tests that need different values use `mockResolvedValueOnce`, which is consumed during the test's single load call and does not leak to subsequent tests. <!-- REVIEW-FIX: corrected incorrect claim that clearAllMocks() removes mockResolvedValue implementations — it does not; only resetAllMocks()/mockReset() does -->

4. **Case:** Test 2 uses `mockResolvedValueOnce` for `listLlmModels`. If a test that runs before it leaves `mockListLlmModels` in a different state, this could affect the ordering test.
   **Handling:** `vi.clearAllMocks()` in `beforeEach` resets all mock state, so ordering is not affected by prior tests.

5. **Case:** Test 11 calls `mockGetAppSettings.mockRejectedValueOnce(...)` but `mockListLlmModels` still resolves with the default mock. Since `Promise.all` rejects on first rejection, the `listLlmModels` result is ignored.
   **Handling:** Correct behavior. The error assertion proves the catch path sets `error` regardless of which promise was rejected.

---

### Step 2.2 GREEN: Create `src/features/app-settings/hooks/useAppSettings.ts`

**Goal:** Write the minimal implementation that makes all 12 RED tests pass.
**Dependencies:** Step 2.1 RED complete; `types.ts` and `appSettingsService.ts` from Task 1 must exist.

- [ ] Create `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.ts` with the content below.
- [ ] Run `npm --prefix project/srcs/frontend run test` — confirm **95/95** pass (83 existing + 12 new).
- [ ] Run `npm --prefix project/srcs/frontend run typecheck` — confirm 0 errors.
- [ ] Run `npm --prefix project/srcs/frontend run build` — confirm build succeeds.

**Why this step is critical:** This hook concentrates all security-sensitive and business-rule-dense logic for the App Settings page. The masked-key invariant (`apiKeyInput` never set from `settings.openRouterApiKey`) and the PATCH null semantics (`defaultModelId` always sent) are the most important correctness invariants. Both are enforced by tests before any code is written.

#### Implementation

```typescript
// project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.ts

import { useState, useEffect } from "react"
import {
  getAppSettings,
  updateAppSettings,
  listLlmModels,
} from "../services/appSettingsService"
import type {
  AppSettingsDTO,
  AppSettingsUpdateForm,
  LlmModelDTO,
} from "../types"

interface UseAppSettingsResult {
  settings: AppSettingsDTO | null
  enabledModels: LlmModelDTO[]
  apiKeyInput: string
  selectedDefaultModelId: number | null
  hasConfiguredApiKey: boolean
  hasEnabledModels: boolean
  isLoading: boolean
  isSaving: boolean
  error: string | null
  successMessage: string | null
  setApiKeyInput: (value: string) => void
  setSelectedDefaultModelId: (value: number | null) => void
  reload: () => void
  save: () => Promise<void>
}

export function useAppSettings(): UseAppSettingsResult {
  const [settings, setSettings] = useState<AppSettingsDTO | null>(null)
  const [enabledModels, setEnabledModels] = useState<LlmModelDTO[]>([])
  const [apiKeyInput, setApiKeyInput] = useState("")
  const [selectedDefaultModelId, setSelectedDefaultModelId] = useState<number | null>(null)
  const [hasConfiguredApiKey, setHasConfiguredApiKey] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  async function load() {
    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const [fetchedSettings, allModels] = await Promise.all([
        getAppSettings(),
        listLlmModels(),
      ])

      // Non-mutating filter + sort: spread before sorting to keep the service array immutable.
      // Sort by name (primary) then modelId (tie-breaker) for stable, deterministic order.
      // GET /llm-model does not guarantee order — never rely on insertion order for UI display.
      const filtered = [...allModels]
        .filter((m) => m.isEnabled === true)
        .sort(
          (a, b) =>
            a.name.localeCompare(b.name) || a.modelId.localeCompare(b.modelId)
        )

      setSettings(fetchedSettings)
      setEnabledModels(filtered)
      setHasConfiguredApiKey(Boolean(fetchedSettings.openRouterApiKey))

      // SECURITY: apiKeyInput must stay "". Never copy the masked key into editable state.
      // The masked value ("****5678") is display-status only — it must not be submitted as a
      // PATCH value, as that would overwrite the real key with a nonsense masked string.
      setApiKeyInput("")

      // Initialize selected default model only if it appears in the enabled list.
      // If the backend holds a stale disabled default model, initialize to null rather than
      // offering a disabled model in the selector.
      const defaultId = fetchedSettings.defaultModel?.id ?? null
      const defaultInEnabled = filtered.some((m) => m.id === defaultId)
      setSelectedDefaultModelId(defaultInEnabled ? defaultId : null)
    } catch (err) {
      const axiosErr = err as {
        response?: { data?: { message?: string } }
        message?: string
      }
      setError(
        axiosErr.response?.data?.message ??
          axiosErr.message ??
          "Failed to load app settings."
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function save() {
    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)
    try {
      // defaultModelId is ALWAYS included in the PATCH form.
      // The backend clears defaultModel when defaultModelId is null or omitted.
      // Explicitly sending null is a deliberate clear; sending the current id preserves it.
      const form: AppSettingsUpdateForm = {
        defaultModelId: selectedDefaultModelId,
      }

      // Only include openRouterApiKey when the admin has typed a non-blank replacement.
      // Omitting the property preserves the existing key server-side (backend ignores blank/null).
      // Trimming prevents whitespace-only input from being sent as a key rotation.
      if (apiKeyInput.trim() !== "") {
        form.openRouterApiKey = apiKeyInput.trim()
      }

      const updated = await updateAppSettings(form)

      setSettings(updated)
      setHasConfiguredApiKey(Boolean(updated.openRouterApiKey))

      // Clear apiKeyInput after save — do not leave the typed key visible in browser state.
      setApiKeyInput("")

      // Re-derive selectedDefaultModelId from the save response + current enabled list.
      // The enabled model list does not change during save (we don't re-fetch models on save).
      const updatedDefaultId = updated.defaultModel?.id ?? null
      const updatedDefaultInEnabled = enabledModels.some(
        (m) => m.id === updatedDefaultId
      )
      setSelectedDefaultModelId(updatedDefaultInEnabled ? updatedDefaultId : null)

      setSuccessMessage("App settings saved.")
    } catch (err) {
      const axiosErr = err as {
        response?: { data?: { message?: string } }
        message?: string
      }
      setError(
        axiosErr.response?.data?.message ??
          axiosErr.message ??
          "Failed to save app settings."
      )
      // apiKeyInput is intentionally NOT cleared on failure — admin can retry without re-typing.
    } finally {
      setIsSaving(false)
    }
  }

  return {
    settings,
    enabledModels,
    apiKeyInput,
    selectedDefaultModelId,
    hasConfiguredApiKey,
    // hasEnabledModels is a derived value — computed from state, no separate state variable needed.
    hasEnabledModels: enabledModels.length > 0,
    isLoading,
    isSaving,
    error,
    successMessage,
    setApiKeyInput,
    setSelectedDefaultModelId,
    // reload: re-trigger the same load() function. Tests exercise load() via mount;
    // reload() is a delegate and does not need its own test suite.
    reload: () => void load(),
    save,
  }
}
```

#### Edge Cases

1. **Case:** `save()` reads `selectedDefaultModelId` and `apiKeyInput` from closure state. If the user calls `setSelectedDefaultModelId(null)` and then immediately calls `save()` without awaiting a render, could `save()` capture the stale value?
   **Handling:** React state updates are applied before the next render. In tests, `act()` ensures state is flushed before the next call. In production, the save button renders disabled while `isSaving` is true — so `save()` can only be triggered after the render that reflects the new `selectedDefaultModelId`. No stale-closure issue in practice.

2. **Case:** `load()` is defined inside the hook body but called from `useEffect`. Should it be wrapped in `useCallback` or moved outside?
   **Handling:** `load()` only calls `getAppSettings`, `listLlmModels` (stable module-level imports), and `useState` setters (stable references). No `useCallback` needed — the function is only called imperatively (from `useEffect` and `reload`), never as a prop or dependency of another hook. Matches the `fetchEmployees` pattern in `useEmployeeList`.

3. **Case:** `Promise.all` is called with both service functions. If only one of the two calls is needed for a UI update, could we avoid the double-fetch?
   **Handling:** Both are always needed on load — settings provide the current state; models populate the default model selector. Sequential fetching would increase TTI with no benefit. `Promise.all` is correct here.

4. **Case:** React StrictMode mounts, unmounts, and remounts in development. `useEffect` with `[]` fires twice, causing `load()` to be called twice. The second load result overwrites the first (same data). No cleanup is needed because `load()` has no subscriptions to tear down; it is a one-shot async function.
   **Handling:** Accepted — same data fetched twice in development StrictMode, production fires once. Matching behavior to `useEmployeeList`.

5. **Case:** If `enabledModels` changes between the save call and the `setSelectedDefaultModelId` call in the success path, the re-derived value could use a stale enabled list.
   **Handling:** `enabledModels` is only changed by `load()`. `load()` is not called during `save()` (only on mount and via `reload`). So within the `save()` function, the `enabledModels` closure value is stable. Accepted.

---

### Step 2.3: Confirm Hook Safety (Correctness Assertion)

**Goal:** Confirm that the hook implementation satisfies both masked-key safety requirements.
**Dependencies:** Step 2.2 GREEN complete.

- [ ] Verify (code review, not a file change): `useAppSettings.ts` does NOT contain `setApiKeyInput(settings` or any expression that reads `settings.openRouterApiKey` and passes it to `setApiKeyInput`.
- [ ] Verify: `setApiKeyInput("")` is called in both the `load()` success path and the `save()` success path.
- [ ] Run `npm --prefix project/srcs/frontend run test` — confirm Tests 3 and 9 pass (they lock this invariant).

---

## Design Decisions

**Decision 1: `Promise.all` for parallel load**
- **Why:** `getAppSettings` and `listLlmModels` are independent backend calls. Running them sequentially doubles the initial load time with no benefit. `Promise.all` reduces TTI to the slower of the two calls.
- **Alternatives considered:** Sequential fetch — rejected because it adds latency for zero gain. SWR/React Query — rejected because the project uses plain `useEffect` + Axios across all existing hooks; introducing a data-fetching library is out of scope for this task.

**Decision 2: Non-mutating sort via spread**
- **Why:** `[...allModels].filter(...).sort(...)` keeps the service-returned array immutable. If the service or a future memoization layer holds a reference to the original array, in-place mutation (`.sort()` without spread) would corrupt it silently.
- **Alternatives considered:** In-place sort — rejected because it mutates the source array, which can cause subtle bugs if the service ever caches the response. The spread adds a single allocation per load — acceptable.

**Decision 3: Sort keys — `name.localeCompare` + `modelId.localeCompare` tie-breaker**
- **Why:** The parent feature explicitly specifies this sort order. `name` is the user-visible label; `modelId` (e.g., `openai/gpt-4o`) disambiguates models with the same display name. `localeCompare` produces locale-sensitive ordering, consistent with the text comparison patterns used elsewhere in the project.
- **Alternatives considered:** Sort by `id` — rejected because auto-increment IDs represent insertion order, not alphabetical order. Sort by `modelId` only — rejected because `name` is what the admin sees in the dropdown.

**Decision 4: `hasConfiguredApiKey = Boolean(settings.openRouterApiKey)` — not state**
- **Why:** `hasConfiguredApiKey` is derived from `settings.openRouterApiKey`. A non-null, non-empty masked value means a key exists. `Boolean("****5678") === true`, `Boolean(null) === false`, `Boolean("") === false`. Storing a separate `hasConfiguredApiKey` state variable avoids re-deriving it in JSX at the expense of one boolean in state. Stored as state (not a computed return value) so it can be updated independently after saves without requiring a re-fetch.
- **Alternatives considered:** Compute in the return statement as `Boolean(settings?.openRouterApiKey)` — simpler but means the form component would see `false` for one render cycle between load start and load completion. Storing it as state ensures a clean initial → configured transition.

**Decision 5: `selectedDefaultModelId` initialized only if default model is in enabled list**
- **Why:** The backend may hold a default model FK that was valid when set but was later disabled. The frontend must not offer a disabled model as selectable. The guard `filtered.some((m) => m.id === defaultId)` ensures the initialized value only points to an enabled model.
- **Alternatives considered:** Always initialize from `settings.defaultModel?.id` and let the form component show a "disabled default" warning — rejected because the form would need to implement its own stale-model detection, duplicating the logic here and in the hook.

**Decision 6: `openRouterApiKey` conditionally included in PATCH form**
- **Why:** The backend silently preserves the existing key when `openRouterApiKey` is blank or null. The frontend omits the property entirely when `apiKeyInput.trim() === ""`. This is the cleanest expression of "no change requested": the property is absent, not null. If the admin types a new key, the trimmed value is included.
- **Alternatives considered:** Always send `openRouterApiKey: null` when input is blank — rejected because `null` and omission have the same backend semantics here, but explicitly sending `null` could be confusing if backend semantics change in a future update.

**Decision 7: `defaultModelId` always included in PATCH form**
- **Why:** The backend clears `defaultModel` when `defaultModelId` is null or omitted. The frontend must explicitly send the current selection to preserve it. Making `defaultModelId` required in `AppSettingsUpdateForm` (as established in Task 1) forces every save path to handle this explicitly.
- **Alternatives considered:** Omit `defaultModelId` when unchanged — rejected because the backend treats omission as null, which clears the default. The only safe option is to always include it.

**Decision 8: `apiKeyInput` cleared after successful save, preserved after failed save**
- **Why:** After a successful save, the typed key must not remain in browser state — it has been accepted by the backend and is no longer needed. After a failed save, the admin should be able to retry without re-typing.
- **Alternatives considered:** Always clear on save completion (success or failure) — rejected because it forces re-typing after a transient failure.

**Decision 9: `save()` re-derives `selectedDefaultModelId` from returned `defaultModel` using the in-memory `enabledModels`**
- **Why:** The save response includes the authoritative `defaultModel`. Re-deriving from it ensures the UI reflects what the backend stored. Using the in-memory `enabledModels` (not re-fetching on save) avoids an extra network call. If a model is disabled between load and save, the stale-disabled guard would set `selectedDefaultModelId = null` — a safe outcome.
- **Alternatives considered:** Re-fetch models after every save — adds latency without providing real benefit for the MVP admin catalog size.

**Decision 10: `hasEnabledModels` computed inline in the return statement**
- **Why:** It is always `enabledModels.length > 0`. There is no reason to store a separate boolean in state that would need to be kept in sync with `enabledModels`.
- **Alternatives considered:** Separate `hasEnabledModels` state — rejected because it duplicates state unnecessarily.

**Decision 11: `reload` is a wrapper, not a separately tested function**
- **Why:** `reload = () => void load()`. Since `load()` is already fully tested by the 11 load-related tests (initial mount triggers `load()`), testing `reload` separately would test `void load()` delegation, not behavior. The deletion test for `reload` is trivial.
- **Alternatives considered:** Add a Test 13 for `reload` — rejected because it would add a test that asserts `getAppSettings` is called again, which is already proven by the initial load tests. The documented behavior of `reload` is sufficient.

---

## Testing Considerations

### Automatic Validation

- [ ] Run `npm --prefix project/srcs/frontend run test` after Step 2.1 RED — confirm the new `useAppSettings.test.ts` suite FAILS (module-not-found), while all 83 existing tests still pass.
- [ ] Run `npm --prefix project/srcs/frontend run test` after Step 2.2 GREEN — confirm **95/95** pass (83 existing + 12 new `useAppSettings` tests). If test count differs, reconcile before proceeding.
- [ ] Run `npm --prefix project/srcs/frontend run typecheck` after Step 2.2 GREEN — confirm 0 errors.
- [ ] Run `npm --prefix project/srcs/frontend run build` after Step 2.2 GREEN — confirm Vite build succeeds.
- [ ] Code review Step 2.3 assertions: search `useAppSettings.ts` for any `setApiKeyInput(settings` or `setApiKeyInput(fetchedSettings` — result must be zero matches.

### Manual Validation

No manual validation is required for this task. All new code is TypeScript hook logic with no UI, no routes, and no browser-only behavior. The automatic checks above (typecheck + test + build) are sufficient. UI-level validation (password input, autofill suppression, selector disable state) is deferred to Task 3 (form component) and Task 5 (regression and manual browser validation).

---

## Related Code Explanations

- `project/srcs/frontend/src/features/app-settings/types.ts:1` — 4 interfaces the hook depends on; `AppSettingsUpdateForm.defaultModelId` is required as `number | null`.
- `project/srcs/frontend/src/features/app-settings/services/appSettingsService.ts:1` — 3 adapter functions the hook calls; mocked in tests.
- `project/srcs/frontend/src/features/app-settings/services/appSettingsService.test.ts:1` — Service test pattern (not used by hook tests; hook tests use `vi.mock`).
- `project/srcs/frontend/src/features/employees/hooks/useEditEmployee.ts:40` — Primary prior-art hook: `async function onSave()` + try/catch/finally + Axios error extraction pattern.
- `project/srcs/frontend/src/features/employees/hooks/useEditEmployee.test.ts:14` — Primary prior-art test file: all-exports `vi.mock` factory + `vi.mocked()` + `beforeEach` defaults + two-`act` setter/save split.
- `project/srcs/frontend/src/features/employees/hooks/useEmployeeList.ts:54` — Prior art for `useEffect` + inner async function + `eslint-disable-next-line react-hooks/exhaustive-deps` comment.

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task.
- [x] Relevant skills reviewed and selected for this task.
- [x] Version-matched documentation reviewed (Vitest 4.1.6 docs; @testing-library/react 16.3.2 patterns from codebase).
- [x] `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.test.ts` created with 12 behavior tests.
- [x] RED step confirmed: new suite fails with module-not-found; all 83 existing tests still pass.
- [x] `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.ts` created.
- [x] `npm --prefix project/srcs/frontend run test` = **95/95** passing after GREEN.
- [x] `npm --prefix project/srcs/frontend run typecheck` = 0 errors after GREEN.
- [x] `npm --prefix project/srcs/frontend run build` = success after GREEN.
- [x] Code review confirms `apiKeyInput` is never set from `settings.openRouterApiKey`.
- [x] Code review confirms `setApiKeyInput("")` is called in both the `load()` success path and the `save()` success path.
- [x] Parent feature Phase 2 steps (2.1, 2.2, 2.3) are marked complete when the code task is executed.
- [x] Parent feature Task 2 section updated with wiki link `[[Admin-App-Settings-Page-task-2-use-app-settings-hook]]`. <!-- REVIEW-FIX: marked complete — done by task creator before review -->
