# Task: AppSettingsPage 3-Tab Restructure

#task #current #medium-complexity #parent-admin-llm-model-catalog-page

**Parent:** [[Admin-LLM-Model-Catalog-Page]]
**Parent Type:** Feature
**Related Step(s):** Phase 5 — Step 5.1
**Estimated Complexity:** Medium

---

## Goal

Refactor `AppSettingsPage.tsx` into a three-tab layout (General Settings, System Models, Add Models) by composing the modules built in Tasks 1–4, and extend `useAppSettings` with an optional `models?` prop so that `useSystemModels` becomes the single source of truth for `GET /llm-model`, eliminating the duplicate fetch and fixing post-toggle staleness in the General Settings default-model selector.

---

## Parent Context

The parent feature, [[Admin-LLM-Model-Catalog-Page]], extends the existing `/app-settings` admin page into a three-tab layout. Tasks 1–4 built the infrastructure: the static `models.json`, the service/types layer, `useSystemModels` + `SystemModelsTab`, and `useAvailableModels` + `AddModelModal` + `AvailableModelsTab`. Task 5 is the integration step that assembles all those pieces into the page.

**Step 5.1 covers two changes:**

1. **`useAppSettings` optional `models?` prop (additive, backward-compatible):** When `AppSettingsPage` passes `systemModels.models` as a prop, `useAppSettings` skips its own `listLlmModels()` call and derives `enabledModels` from the prop instead. A second `useEffect([externalModels, settings])` re-derives `enabledModels` and clamps `selectedDefaultModelId` whenever the model list changes (e.g., after a toggle). The existing 12 `useAppSettings` tests are unaffected — when `models` is omitted, the hook self-fetches identically to before.

2. **`AppSettingsPage.tsx` 3-tab restructure:** Wraps the existing `AppSettingsForm` in a **General Settings** tab; adds **System Models** and **Add Models** tabs. `useSystemModels` is instantiated at the page level. Its `refresh()` is wired as `onModelAdded` for `AvailableModelsTab`. Its `models` array is passed to `useAppSettings` and to `SystemModelsTab`/`AvailableModelsTab`. `keepMounted={false}` is set explicitly on the `add-models` `TabsContent` (the Base UI default, made explicit per Finding 4 of [[Review-Admin-LLM-Model-Catalog-Page]]).

**The App Settings page route** (`/app-settings`, `RoleGuard([UserRole.ADMIN])`) and the sidebar link already exist — no routing or sidebar changes are required.

**Test count impact:** No new tests. `AppSettingsPage` is a UI composition layer. The `useAppSettings` `models?` prop is validated via manual browser testing. Expected count after Task 5: **128/128** (unchanged from Task 4).

---

## Preconditions / Dependencies

- Tasks 1, 2, 3, and 4 are fully implemented and passing.
- `public/models.json` is present at `project/srcs/frontend/public/models.json`.
- `src/components/ui/tabs.tsx` exists and `TabsContent` forwards `{...props}` to `Tabs.Panel` (confirmed in Task 1).
- `@base-ui/react` `Tabs.Panel` type definition confirms `keepMounted?: boolean` (default `false`).
- Feature barrel `features/app-settings/index.ts` exports: `AppSettingsForm`, `SystemModelsTab`, `AddModelModal`, `AvailableModelsTab`, `useAppSettings`, `useSystemModels`, `useAvailableModels`, and all types.
- Test baseline: **128/128** across 21 test files. No regressions allowed.
- Current `AppSettingsPage.tsx` is a 17-line single-panel page — straightforward to restructure.
- `tsconfig.app.json` enforces `strict`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, `erasableSyntaxOnly` — use `import type` for type-only imports.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `memory-bank` — Selected — loaded project architecture, frontend conventions, test baseline (128/128), and feature progress (Tasks 1–4 implemented).
- `documentation-management` — Selected — confirmed Task placement, naming convention, and template structure.
- `solid-deep-design` — Selected — applied to `useAppSettings` `models?` prop design (SRP preserved: hook still owns one responsibility — settings state; DIP: `enabledModels` source is injectable through the prop seam; Depth: large implementation, the `models?` extension hides the two-source-of-truth fix behind the existing public interface, caller sees no added complexity).
- `tdd` — Selected — no new tests for this task (both changed modules are UI composition layers or additive hook changes validated by manual browser testing, per the parent feature's Testing Decisions).
- `find-docs` — Selected — confirmed Base UI `Tabs.Panel.keepMounted` prop name and default from installed `@base-ui/react@1.5.0` source.
- `glossary-management` — Selected — domain terms: System Model, LLM Model Catalog, App Settings.

### Documentation Reviewed

- **[[Admin-LLM-Model-Catalog-Page]]** — Step 5.1 spec, `useAppSettings` `models?` prop design, `keepMounted={false}` requirement, `onModelAdded` wiring, and Testing Decisions (AppSettingsPage is a composition layer — no unit tests).
- **[[Review-Admin-LLM-Model-Catalog-Page]] Findings 2, 4** — Finding 2 (single source of truth via `models` prop); Finding 4 (`keepMounted={false}` explicit contract on the `add-models` panel).
- **[[Admin-LLM-Model-Catalog-Page-task-4-available-models-hook-modal-and-tab]]** — confirmed `AvailableModelsTab` props interface (`systemModels: LlmModelDTO[], onModelAdded: () => void`) and barrel export state after Task 4.
- **[[Admin-LLM-Model-Catalog-Page-task-3-system-models-hook-and-tab]]** — confirmed `SystemModelsTab` props interface (`models, isLoading, error, toggleModel, toggleState, refresh`).
- **`@base-ui/react@1.5.0` `TabsPanel.js`** — confirmed `keepMounted = false` default and `shouldRender = keepMounted || mounted` semantics. `TabsContent` forwards `{...props}` so `keepMounted={false}` passes through to `TabsPrimitive.Panel`.
- **`features/app-settings/hooks/useAppSettings.ts`** — read in full: mount effect uses `fetchSettingsData()` (calls both `getAppSettings()` + `listLlmModels()`); `load()` also calls `fetchSettingsData()`; existing 12 tests validate the no-arg path.
- **`features/app-settings/hooks/useAppSettings.test.ts`** — read in full: all 12 tests call `useAppSettings()` with no args; the `models?` prop extension must not break any of them.
- **`src/pages/AppSettingsPage.tsx`** — current 17-line single-panel implementation, confirmed simple restructure.
- **`src/components/ui/tabs.tsx`** — confirmed `TabsContent` wraps `TabsPrimitive.Panel` with `{...props}` spread; `keepMounted` is a valid `Panel.Props`.
- **`src/router.tsx`** — confirmed `/app-settings` route exists under admin `RoleGuard`; no route changes needed.
- **`src/layouts/Sidebar.tsx`** — confirmed App Settings sidebar link exists; no sidebar changes needed.

### Related Existing Code

- `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.ts` — hook to extend with `models?` prop.
- `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.test.ts` — 12 existing tests that must remain GREEN (no-arg path unchanged).
- `project/srcs/frontend/src/pages/AppSettingsPage.tsx` — page to restructure.
- `project/srcs/frontend/src/components/ui/tabs.tsx` — `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` used in the page restructure.
- `project/srcs/frontend/src/features/app-settings/index.ts` — barrel already exports all needed modules.
- `project/srcs/frontend/src/features/app-settings/components/AppSettingsForm.tsx` — existing form component that moves into the General Settings tab.
- `project/srcs/frontend/src/features/app-settings/hooks/useSystemModels.ts` — hook instantiated at page level; provides `models`, `isLoading`, `error`, `toggleModel`, `toggleState`, `refresh`.
- `project/srcs/frontend/src/features/app-settings/components/SystemModelsTab.tsx` — mounted in the System Models tab.
- `project/srcs/frontend/src/features/app-settings/components/AvailableModelsTab.tsx` — mounted in the Add Models tab.
- `project/srcs/frontend/src/features/employees/hooks/useEmployeeList.ts:1-10` — reference for the established ESLint-disable comment pattern for exhaustive deps.

---

## Implementation Details

### Approach

Task 5 has two coupled changes:

#### A. `useAppSettings` `models?` Prop Extension

The hook currently accepts no arguments. After this change it accepts an optional `options?: { models?: LlmModelDTO[] }` object.

**SOLID / Deep Module analysis:**
- **SRP**: The hook still has one responsibility — managing app settings state (API key, default model, save lifecycle). The `models?` prop doesn't add a second responsibility; it changes WHERE the model list comes from, not WHAT the hook does with it.
- **Depth**: The interface grows by one optional argument. The implementation absorbs the complexity of dual-source model loading and reactive re-derivation — callers don't see it.
- **DIP**: The mount effect's `listLlmModels()` call is an injected dependency point. The `models?` prop is a second injection path (prop-based) for the same seam. Tests continue to mock via the module-level seam; the page uses the prop-based seam.
- **OCP**: The no-arg path is unchanged (closed for modification). The prop-based path is a new extension behind an optional parameter.

**Key implementation decisions:**

1. **Mount effect**: When `externalModels !== undefined`, only call `getAppSettings()` (not `listLlmModels()`). Derive `enabledModels` from `externalModels` directly. The initial `selectedDefaultModelId` is derived the same way as the existing logic (check if backend default is in the enabled list).

2. **Re-derive effect** `useEffect([externalModels, settings])`: Fires when `externalModels` changes (post-toggle, post-add) OR when `settings` changes (post-save). Guards:
   - If `externalModels === undefined`: no-op (standalone mode).
   - If `settings === null`: no-op (settings not yet loaded).
   - Otherwise: re-derive `enabledModels` from `externalModels` and update `selectedDefaultModelId` via functional updater.

3. **`modelInitializedRef`**: A `useRef(false)` that marks whether the initial `selectedDefaultModelId` derivation has happened. This distinguishes "first models-arrive (initialize from settings default)" from "subsequent models-change (only clamp, don't restore)."
   - First time effect runs with both `externalModels` and `settings` non-null: set `modelInitializedRef.current = true`, initialize `selectedDefaultModelId` from `settings.defaultModel?.id` (if in enabled list, else `null`).
   - Subsequent runs: only clamp (`prev !== null && not in newEnabled → null`); keep `prev` otherwise.
   - This handles both race conditions (settings arrives before or after models).

4. **`load()` function** (called by `reload()`): Also respects `externalModels`; if provided, only re-fetches `getAppSettings()`, derives `enabledModels` from current `externalModels` value.

5. **Backward compatibility**: All 12 existing tests call `useAppSettings()` with no args. When `options` is omitted, `externalModels = undefined`. The re-derive effect guard `if (externalModels === undefined) return` makes it a no-op. The mount effect falls through to `fetchSettingsData()`. Behavior is byte-for-byte identical.

#### B. `AppSettingsPage.tsx` 3-Tab Restructure

A straightforward structural change. The page instantiates `useSystemModels`, passes `models` to `useAppSettings`, and renders three `TabsContent` panels. `keepMounted={false}` is set explicitly on `add-models`.

**Default tab**: `"general"` — the admin lands on General Settings, which is the existing behavior.

**`keepMounted={false}` contract**: Base UI `Tabs.Panel` mounts children lazily by default. Setting it explicitly converts a default into an explicit API contract: if a future developer adds exit animations by setting `keepMounted={true}`, the `AvailableModelsTab` mount `useEffect` (which calls `useAvailableModels.load()`) will NOT fire — they must re-lift the load trigger. An inline comment explains this.

### Files to Create/Modify

- [x] `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.ts` — **modify** — add `models?` prop, mount effect conditional path, and re-derive effect.
- [x] `project/srcs/frontend/src/features/app-settings/index.ts` — **modify** — add `export type { UseAppSettingsOptions }` to the barrel so consumers can type-check prop objects without importing from the hook directly. <!-- REVIEW-FIX: UseAppSettingsOptions was defined + exported from the hook but omitted from the barrel, violating the barrel-as-public-API convention. -->
- [x] `project/srcs/frontend/src/pages/AppSettingsPage.tsx` — **modify** — 3-tab layout with `useSystemModels` wiring.

---

## Step-by-Step Implementation

### Step 1: Extend `useAppSettings` with `models?` Prop

**Goal:** Add backward-compatible `models?` prop, modify the mount effect to skip `listLlmModels()` when models are provided, and add the re-derive effect for post-toggle reactivity.
**Dependencies:** All Task 1–4 modules exist. Existing 12 tests use `useAppSettings()` with no args.

- [x] Modify `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.ts`.
- [x] Modify `project/srcs/frontend/src/features/app-settings/index.ts` — add `export type { UseAppSettingsOptions } from "./hooks/useAppSettings"` alongside the existing `UseAppSettingsResult` and other type exports.
- [x] Run `npm --prefix project/srcs/frontend run test -- --run src/features/app-settings/hooks/useAppSettings.test.ts` — confirm all 12 tests still pass.
- [x] Run `npm --prefix project/srcs/frontend run typecheck` — confirm 0 errors.

**Why this step is critical:** Without the `models?` prop, `useAppSettings` calls `listLlmModels()` independently on mount. After a toggle in `useSystemModels`, the General Settings tab's model selector would remain stale because `useAppSettings` holds its own copy. This fix makes both tabs react to the same source of truth.

#### Implementation

The full updated `useAppSettings.ts`:

```typescript
import { useState, useEffect, useRef } from "react"
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

export interface UseAppSettingsResult {
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

// ── Module-level pure data fetcher — no setState; returns structured load result ──

type SettingsLoadResult = {
  fetchedSettings: AppSettingsDTO
  enabledModels: LlmModelDTO[]
  initialDefaultModelId: number | null
}

async function fetchSettingsData(): Promise<SettingsLoadResult> {
  const [fetchedSettings, allModels] = await Promise.all([
    getAppSettings(),
    listLlmModels(),
  ])

  // Non-mutating filter + sort: spread before sorting to keep the service array immutable.
  // Sort by name (primary) then modelId (tie-breaker) for stable, deterministic order.
  // GET /llm-model does not guarantee order — never rely on insertion order for UI display.
  const enabledModels = [...allModels]
    .filter((m) => m.isEnabled === true)
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name) || a.modelId.localeCompare(b.modelId)
    )

  // Initialize selected default model only if it appears in the enabled list.
  // If the backend holds a stale disabled default model, return null rather than
  // offering a disabled model in the selector.
  const defaultId = fetchedSettings.defaultModel?.id ?? null
  const initialDefaultModelId = enabledModels.some((m) => m.id === defaultId)
    ? defaultId
    : null

  return { fetchedSettings, enabledModels, initialDefaultModelId }
}

// ── Helper: derive enabled models from an external list (used in models? prop path) ──

function deriveFromExternalModels(
  allModels: LlmModelDTO[],
  defaultModelId: number | null
): { enabledModels: LlmModelDTO[]; initialDefaultModelId: number | null } {
  const enabledModels = [...allModels]
    .filter((m) => m.isEnabled === true)
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name) || a.modelId.localeCompare(b.modelId)
    )
  const initialDefaultModelId = enabledModels.some((m) => m.id === defaultModelId)
    ? defaultModelId
    : null
  return { enabledModels, initialDefaultModelId }
}

export interface UseAppSettingsOptions {
  models?: LlmModelDTO[]
}

export function useAppSettings(options?: UseAppSettingsOptions): UseAppSettingsResult {
  const externalModels = options?.models

  const [settings, setSettings] = useState<AppSettingsDTO | null>(null)
  const [enabledModels, setEnabledModels] = useState<LlmModelDTO[]>([])
  const [apiKeyInput, setApiKeyInput] = useState("")
  const [selectedDefaultModelId, setSelectedDefaultModelId] = useState<number | null>(null)
  const [hasConfiguredApiKey, setHasConfiguredApiKey] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Tracks whether the first successful derivation from externalModels has happened.
  // When false: the re-derive effect initializes selectedDefaultModelId from settings.defaultModel.id.
  // When true: the re-derive effect only clamps (prevents restoring after user-clear or toggle-clamp).
  const modelInitializedRef = useRef(false)

  // ── Load ────────────────────────────────────────────────────────────────────

  async function load() {
    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)
    try {
      // <!-- REVIEW-FIX: Renamed `result` → `settingsLoadResult` and switched from destructuring
      //   to direct property access. Eliminates variable shadowing: the inner `if` block also
      //   declared `const fetchedSettings` and `derived` alias, causing shadowing when `result`
      //   was destructured again with the same names at the outer level. -->
      let settingsLoadResult: SettingsLoadResult
      if (externalModels !== undefined) {
        const fetchedSettings = await getAppSettings()
        const defaultId = fetchedSettings.defaultModel?.id ?? null
        const { enabledModels, initialDefaultModelId } =
          deriveFromExternalModels(externalModels, defaultId)
        settingsLoadResult = { fetchedSettings, enabledModels, initialDefaultModelId }
      } else {
        settingsLoadResult = await fetchSettingsData()
      }

      setSettings(settingsLoadResult.fetchedSettings)
      setEnabledModels(settingsLoadResult.enabledModels)
      setHasConfiguredApiKey(Boolean(settingsLoadResult.fetchedSettings.openRouterApiKey))
      // SECURITY: apiKeyInput must stay "". Never copy the masked key into editable state.
      // The masked value ("****5678") is display-status only — it must not be submitted as a
      // PATCH value, as that would overwrite the real key with a nonsense masked string.
      setApiKeyInput("")
      setSelectedDefaultModelId(settingsLoadResult.initialDefaultModelId)
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

  // ── Mount effect ────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false

    const promise =
      externalModels !== undefined
        ? getAppSettings().then((fetchedSettings) => {
            const defaultId = fetchedSettings.defaultModel?.id ?? null
            const { enabledModels: derived, initialDefaultModelId } =
              deriveFromExternalModels(externalModels, defaultId)
            return {
              fetchedSettings,
              enabledModels: derived,
              initialDefaultModelId,
            }
          })
        : fetchSettingsData()

    // <!-- REVIEW-FIX: Removed `enabledModels: derived` alias. The callback parameter can be
    //   named `enabledModels` directly — it intentionally shadows the outer state variable,
    //   which is not used inside this callback (only `setEnabledModels` is called). -->
    void promise
      .then(({ fetchedSettings, enabledModels, initialDefaultModelId }) => {
        if (cancelled) return
        setSettings(fetchedSettings)
        setEnabledModels(enabledModels)
        setHasConfiguredApiKey(Boolean(fetchedSettings.openRouterApiKey))
        // SECURITY: apiKeyInput must stay "". Never copy the masked key into editable state.
        setApiKeyInput("")
        setSelectedDefaultModelId(initialDefaultModelId)
      })
      .catch(
        (err: {
          response?: { data?: { message?: string } }
          message?: string
        }) => {
          if (cancelled) return
          setError(
            err.response?.data?.message ??
              err.message ??
              "Failed to load app settings."
          )
        }
      )
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Re-derive effect — only active when models are provided externally ──────
  //
  // Fires when externalModels or settings change. Re-derives enabledModels and
  // clamps selectedDefaultModelId if the selected model was just disabled (toggle).
  //
  // modelInitializedRef guards the initialization phase: on the first non-null trigger,
  // we attempt to restore selectedDefaultModelId from settings.defaultModel.id (same rule
  // as mount-time). Subsequent triggers only clamp — they do NOT restore a null value
  // to the backend default, preventing restoration of a user-cleared or toggle-clamped selection.

  useEffect(() => {
    if (externalModels === undefined || settings === null) return

    const newEnabled = [...externalModels]
      .filter((m) => m.isEnabled === true)
      .sort(
        (a, b) =>
          a.name.localeCompare(b.name) || a.modelId.localeCompare(b.modelId)
      )

    setEnabledModels(newEnabled)

    setSelectedDefaultModelId((prev) => {
      if (!modelInitializedRef.current) {
        // First non-null trigger: initialize from backend default (matching mount-time rule).
        modelInitializedRef.current = true
        const defaultId = settings.defaultModel?.id ?? null
        return defaultId !== null && newEnabled.some((m) => m.id === defaultId)
          ? defaultId
          : null
      }

      // Post-initialization: only clamp if prev is no longer in the enabled list.
      if (prev !== null && !newEnabled.some((m) => m.id === prev)) {
        return null
      }
      return prev
    })
  }, [externalModels, settings])
  // <!-- REVIEW-FIX: Removed spurious eslint-disable comment. deps [externalModels, settings] are
  //   complete: both are direct closure vars used in the effect body and the functional updater;
  //   modelInitializedRef is a ref (stable); setState setters are stable. No suppression needed. -->

  // ── Save ────────────────────────────────────────────────────────────────────

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

1. **Case:** Existing `useAppSettings.test.ts` calls `useAppSettings()` with no args → `options = undefined` → `externalModels = undefined`. The re-derive effect guard `if (externalModels === undefined) return` is a no-op. The mount effect falls through to `fetchSettingsData()`.
   **Handling:** All 12 existing tests remain byte-for-byte identical in behavior. Confirmed by running the test suite after this change.

2. **Case:** On mount, `externalModels = []` (because `useSystemModels` starts with `models=[]`). The mount effect uses `externalModels = []` and calls only `getAppSettings()`. `deriveFromExternalModels([], defaultId)` returns `enabledModels=[], initialDefaultModelId=null`.
   **Handling:** The General Settings tab shows `selectedDefaultModelId = null` initially. When `useSystemModels` finishes loading and models arrive, the re-derive effect fires and initializes `selectedDefaultModelId` from `settings.defaultModel?.id`.

3. **Case:** Race condition — `useSystemModels` models arrive BEFORE `getAppSettings()` resolves. The re-derive effect fires with `settings === null` → guard returns early. Later, `getAppSettings()` resolves → `settings` state updates → re-derive effect fires again (due to `settings` in deps) → now both are non-null → correct initialization.
   **Handling:** The `[externalModels, settings]` dependency array ensures the effect fires on both changes, eliminating the race.

4. **Case:** Post-initialization clamp — admin selects model 5 (unsaved), then toggle fires disabling model 5. Re-derive effect: `modelInitializedRef.current = true` (post-init), `prev = 5`, `!newEnabled.has(5)` → returns `null`. Correct — admin's unsaved selection is cleared.
   **Handling:** The post-initialization guard only clamps, never restores. The feature doc describes this as intentional "stale becomes explicit clear" behavior.

5. **Case:** Post-save re-derive — `save()` sets `selectedDefaultModelId = 3`, then the re-derive effect fires because `settings` state changed. `modelInitializedRef.current = true`, `prev = 3`, `newEnabled.has(3)` → returns `3` (idempotent). No spurious change.
   **Handling:** The functional updater `prev => prev` for the valid case makes save idempotent with the re-derive effect.

6. **Case:** `useAppSettings.reload()` is called while in external-models mode. `load()` uses `externalModels` from closure (captures the current prop value) and calls only `getAppSettings()`. The models from `useSystemModels` remain the source of truth.
   **Handling:** `reload()` is not wired in `AppSettingsPage` for Task 5 (no trigger exists), so this edge case is theoretical. The implementation is correct for safety.

7. **Case:** `verbatimModuleSyntax: true` requires the new `UseAppSettingsOptions` type to use `export type` if imported only as a type elsewhere.
   **Handling:** `UseAppSettingsOptions` is exported as a value-level `interface` (not `export type`) because it is a function parameter type — fine. If callers only import the type, they use `import type { UseAppSettingsOptions }`.

---

### Step 2: Refactor `AppSettingsPage.tsx` to 3-Tab Layout

**Goal:** Replace the current single-panel layout with a three-tab structure, wiring `useSystemModels` at the page level and passing `models` to `useAppSettings`.
**Dependencies:** Step 1 (`useAppSettings` `models?` prop) complete; all Task 1–4 modules present in the barrel.

- [x] Modify `project/srcs/frontend/src/pages/AppSettingsPage.tsx`.
- [x] Run `npm --prefix project/srcs/frontend run typecheck` — confirm 0 errors.
- [x] Run `npm --prefix project/srcs/frontend run test -- --run` — confirm 128/128 (no regressions).
- [x] Run `npm --prefix project/srcs/frontend run build` — confirm build succeeds.

**Why this step is critical:** This is the integration step that assembles all previous task work into a usable page. Until `AppSettingsPage` mounts `SystemModelsTab` and `AvailableModelsTab`, none of the feature's UI is accessible.

#### Implementation

```typescript
import {
  AppSettingsForm,
  SystemModelsTab,
  AvailableModelsTab,
  useAppSettings,
  useSystemModels,
} from "@/features/app-settings"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"

export function AppSettingsPage() {
  const systemModels = useSystemModels()

  // Pass system models list to useAppSettings so that:
  // 1. No duplicate GET /llm-model fires on page load (useSystemModels is the single fetcher).
  // 2. The General Settings default-model selector stays in sync with post-toggle model state.
  const appSettings = useAppSettings({ models: systemModels.models })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">App Settings</h1>
        <p className="text-muted-foreground">
          Configure OpenRouter access and platform defaults.
        </p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General Settings</TabsTrigger>
          <TabsTrigger value="system-models">System Models</TabsTrigger>
          <TabsTrigger value="add-models">Add Models</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <AppSettingsForm {...appSettings} />
        </TabsContent>

        <TabsContent value="system-models">
          <SystemModelsTab
            models={systemModels.models}
            isLoading={systemModels.isLoading}
            error={systemModels.error}
            toggleModel={systemModels.toggleModel}
            toggleState={systemModels.toggleState}
            refresh={systemModels.refresh}
          />
        </TabsContent>

        {/* keepMounted={false}: Base UI Tabs.Panel default — made explicit per Finding 4.
            AvailableModelsTab.useEffect fires load() on mount, fetching /models.json (500 KB).
            Keeping this false ensures the fetch only fires on first tab-open (user story 12).
            If changed to keepMounted={true} for exit animations, re-lift load() triggering
            to an owner-controlled mechanism — the on-mount fetch will not fire otherwise. */}
        <TabsContent value="add-models" keepMounted={false}>
          <AvailableModelsTab
            systemModels={systemModels.models}
            onModelAdded={systemModels.refresh}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

#### Edge Cases

1. **Case:** The `general` tab is the default. Admin navigates to `/app-settings` and sees General Settings immediately, same as the current page behavior.
   **Handling:** `defaultValue="general"` sets the initial active tab. No routing state is needed.

2. **Case:** `systemModels.isLoading = true` while `appSettings.isLoading = true` (both loading simultaneously on mount). `AppSettingsForm` renders `<LoadingSpinner />` (its internal guard: `isLoading && !settings → <LoadingSpinner />`). `SystemModelsTab` renders `<LoadingSpinner />` (its internal guard: `isLoading → <LoadingSpinner />`). Each tab handles its own loading state independently.
   **Handling:** No page-level loading state needed. Each tab's renderer owns its loading UI.

3. **Case:** Admin is on the General Settings tab editing the default model selector. A toggle fires in System Models tab (not visible). `useSystemModels.refresh()` updates `systemModels.models`. The re-derive effect in `useAppSettings` fires and may clamp `selectedDefaultModelId` if the toggled model was the selected one.
   **Handling:** This is the intended clamp behavior (Finding 2). The admin's in-progress unsaved selection is cleared only if the selected model was just disabled. This is documented in the parent feature's Potential Issues section as "stale becomes explicit clear."

4. **Case:** Admin clicks the Add Models tab. `AvailableModelsTab` mounts (because `keepMounted={false}`). Its `useEffect` fires `load()`. `/models.json` is fetched (one-time 500 KB request).
   **Handling:** The `keepMounted={false}` prop ensures the tab's children only mount when active. The fetch fires on first mount. If the admin switches back to System Models and then back to Add Models, the tab remounts and `useAvailableModels.load()` re-fires (because `hasLoaded` resets on unmount). This is an MVP-accepted re-fetch; `/models.json` is a same-origin static file that is fast to retrieve.

5. **Case:** `AvailableModelsTab` receives `systemModels: []` on initial render (before `useSystemModels` loads). The "Already added" cross-reference derives `systemModelIds = new Set([])` — all Add buttons are enabled. When models load, the page re-renders with the actual `systemModels.models`, `systemModelIds` updates, and "Already added" badges appear correctly.
   **Handling:** `systemModelIds` is derived inline from `systemModels` on every `AvailableModelsTab` render. No synchronization needed.

6. **Case:** After a successful add via `AddModelModal`, `onSuccess()` calls `onModelAdded()` → `systemModels.refresh()`. This re-fetches `GET /llm-model`. The new model appears in `SystemModelsTab` and the "Already added" badge appears in `AvailableModelsTab` (cross-reference updates on next render).
   **Handling:** `systemModels.refresh` is passed directly as `onModelAdded`. The refresh causes `systemModels.models` to update, which re-renders `AvailableModelsTab` with the new `systemModels` prop.

7. **Case:** `useSystemModels` imports are already re-exported from `@/features/app-settings`. The `AppSettingsPage` must NOT deep-import from `@/features/app-settings/hooks/useSystemModels` — it must use the barrel.
   **Handling:** All imports use `@/features/app-settings` (the barrel). The barrel exports `useSystemModels`, `SystemModelsTab`, `AvailableModelsTab`, `AppSettingsForm`, `useAppSettings`.

---

### Step 3: Final Validation

**Goal:** Confirm the full suite passes, typecheck is clean, and build succeeds after both changes.
**Dependencies:** Steps 1 and 2 complete.

- [x] Run the full test suite.
- [x] Run TypeScript typecheck.
- [x] Run the frontend build.

#### Implementation

```bash
# Full test suite — must still pass at 128/128
npm --prefix project/srcs/frontend run test -- --run

# TypeScript typecheck — must be 0 errors
npm --prefix project/srcs/frontend run typecheck

# Vite build — must succeed (pre-existing chunk-size warning is acceptable; models.json is in public/)
npm --prefix project/srcs/frontend run build
```

Expected:
- Full suite: **128/128** (unchanged from Task 4 baseline).
- Typecheck: **0 errors**.
- Build: succeeds.

#### Edge Cases

1. **Case:** Typecheck fails on `keepMounted={false}` — `TabsContent` is typed as `TabsPrimitive.Panel.Props`, which includes `keepMounted?: boolean`. Should resolve correctly.
   **Handling:** If `TabsPrimitive.Panel.Props` does not expose `keepMounted`, check `@base-ui/react/tabs/panel/TabsPanel.d.ts` — confirmed `keepMounted?: boolean | undefined` is present in the installed `@base-ui/react@1.5.0`.

2. **Case:** Typecheck fails on `useSystemModels` destructuring. The `UseSystemModelsResult` interface exports `models`, `isLoading`, `error`, `toggleModel`, `toggleState`, `refresh` — match exactly the props used in `SystemModelsTab` and `AvailableModelsTab`.
   **Handling:** No destructuring; pass `systemModels.models`, `systemModels.isLoading` etc. directly. Or destructure: `const { models, isLoading, error, toggleModel, toggleState, refresh } = useSystemModels()` — either style works.

3. **Case:** `useAppSettings` now exports `UseAppSettingsOptions`. The barrel `index.ts` must also export it to maintain the barrel-as-public-API convention — all types defined in the feature should be reachable through the barrel.
   **Handling:** Add `export type { UseAppSettingsOptions } from "./hooks/useAppSettings"` to `features/app-settings/index.ts`. `AppSettingsPage` uses the barrel (`@/features/app-settings`) for all imports. <!-- REVIEW-FIX: Original incorrectly stated the barrel export was unnecessary; per barrel-as-public-API convention, all exported types must be re-exported from index.ts. -->

---

## Design Decisions

**Decision 1: `modelInitializedRef` tracks the initialization phase of the re-derive effect**
- **Why:** Without it, the re-derive effect cannot distinguish "first time models arrive (initialize from settings default)" from "subsequent model changes (only clamp, never restore)." If initialization logic ran on every re-derive trigger, a user-cleared or toggle-clamped `null` would be restored to `settings.defaultModel.id` on the next toggle — incorrect.
- **Alternatives considered:** Using `useCallback` to memoize initialization — adds complexity. Using `settings.defaultModel.id` as the initialization fallback on every `null → ?` transition — violates the idempotency guarantee (post-clamp restoration).

**Decision 2: Re-derive effect depends on `[externalModels, settings]`, not just `[externalModels]`**
- **Why:** There is a race between `getAppSettings()` (sets `settings` state) and `GET /llm-model` (sets `useSystemModels.models` → `externalModels`). If models arrive before settings, the re-derive effect fires with `settings === null` and must skip. Adding `settings` to the deps ensures the effect re-runs when settings arrives, completing the initialization.
- **Alternatives considered:** `settingsRef.current` (a mutable ref always reflecting latest settings) + `[externalModels]` only — avoids re-running on save. But this breaks the race-condition coverage: the effect would only fire on `externalModels` changes, missing the case where models arrive before settings. The `[externalModels, settings]` approach handles both orderings correctly. Save idempotency is guaranteed by the functional updater guard.

**Decision 3: `load()` also respects `externalModels`**
- **Why:** `reload()` is exposed in the `UseAppSettingsResult` interface. If called while `AppSettingsPage` has `useAppSettings({ models: systemModels.models })`, `load()` must not call `listLlmModels()` — that would bypass `useSystemModels` and create a stale copy. The `externalModels !== undefined` conditional in `load()` ensures consistency.
- **Alternatives considered:** Let `load()` always call `fetchSettingsData()` — simpler, but defeats the single-source-of-truth contract and creates a duplicate `GET /llm-model` on every `reload()`.

**Decision 4: `keepMounted={false}` is set explicitly on the `add-models` TabsContent**
- **Why:** Base UI `Tabs.Panel` defaults to `keepMounted={false}`. Setting it explicitly converts a default into a visible API contract: the comment explains that a future developer enabling `keepMounted={true}` (e.g., for exit animations) must re-lift the `load()` trigger, or the 500 KB `models.json` fetch will silently move from tab-open time to page-load time (violating user story 12). Per [[Review-Admin-LLM-Model-Catalog-Page]] Finding 4, Option d.
- **Alternatives considered:** Leave it implicit (rely on the default) — rejected because defaults change across library versions and the explicit prop communicates design intent.

**Decision 5: `AppSettingsPage` imports from the feature barrel, not deep paths**
- **Why:** The barrel (`@/features/app-settings`) is the established public API of the feature. Deep imports (`@/features/app-settings/hooks/useSystemModels`) bypass the encapsulation boundary and are a code smell. All external consumers of the feature module must use the barrel.
- **Alternatives considered:** Deep imports — rejected; the feature barrel already exports everything needed.

**Decision 6: No new unit tests for `useAppSettings` `models?` prop or `AppSettingsPage`**
- **Why:** Per the parent feature's Testing Decisions section: "UI composition layers (`SystemModelsTab`, `AvailableModelsTab`, `AddModelModal`, `AppSettingsPage`) — their correctness is verified by the manual browser validation step." The `useAppSettings` `models?` prop behavior (initialization + clamp) is also not in the parent feature's test table. The existing 12 tests validate the unchanged default path; the prop-based path is validated manually.
- **Alternatives considered:** Adding tests for the re-derive effect — not wrong in principle, but the project convention (per the Testing Decisions section) is not to test composition layers or additive hook changes outside the explicitly-listed test modules.

---

## Testing Considerations

### Automatic Validation

- [x] `npm --prefix project/srcs/frontend run test -- --run src/features/app-settings/hooks/useAppSettings.test.ts` — all **12** existing tests pass (no-arg path unchanged).
- [x] `npm --prefix project/srcs/frontend run test -- --run` — full suite passes at **128/128** (no regressions from Task 4 baseline).
- [x] `npm --prefix project/srcs/frontend run typecheck` — 0 TypeScript errors across all modified files.
- [x] `npm --prefix project/srcs/frontend run build` — Vite build succeeds; pre-existing chunk-size warning is unchanged (models.json remains in `public/`, not in the bundle).
- [x] `grep -n "keepMounted={false}" project/srcs/frontend/src/pages/AppSettingsPage.tsx` — confirms the explicit prop is present on the `add-models` TabsContent.
- [x] `grep -n "useSystemModels\|useAppSettings" project/srcs/frontend/src/pages/AppSettingsPage.tsx` — confirms both hooks are instantiated and `useAppSettings` receives `{ models: systemModels.models }`.

### Manual Validation

**Golden Path — complete feature flow:**

- [ ] Start the dev server (`npm --prefix project/srcs/frontend run dev`) and log in as admin.
- [ ] Navigate to `/app-settings` — confirm the page renders with three tabs: **General Settings**, **System Models**, **Add Models**.
- [ ] Confirm the default active tab is **General Settings** and the existing API key form and default model selector are visible.

**General Settings tab:**

- [ ] Confirm the API key card and default model selector render correctly (same as before Task 5).
- [ ] Confirm the default model selector is populated with enabled models from the system catalog.
- [ ] Confirm "Save settings" saves correctly (no regression from the existing page behavior).

**System Models tab:**

- [ ] Click **System Models** tab — confirm the model table loads with Name, Model ID, Status, and Action columns.
- [ ] Confirm enabled models show a green "Enabled" badge and disabled models show a gray "Disabled" badge.
- [ ] Click **Disable** on an enabled model — confirm the row shows a loading spinner, the button disables, and after completion the status changes to "Disabled."
- [ ] Confirm after disabling a model: the **General Settings** default model selector no longer lists the disabled model (reactivity via `useAppSettings({ models })` wiring).
- [ ] If the disabled model was the currently-selected default: confirm `selectedDefaultModelId` is cleared to null in the General Settings tab (clamp behavior).
- [ ] Click **Enable** on a disabled model — confirm it transitions back to Enabled.
- [ ] Confirm after enabling: the General Settings selector now includes the re-enabled model.
- [ ] Test toggle error: stop the backend, click **Disable** — confirm an error message appears on the failing row with a "Refresh" link. Clicking Refresh re-fetches the model list.

**Add Models tab:**

- [ ] Click **Add Models** tab — confirm the model catalog loads (brief loading spinner, then list of ~339 models).
- [ ] Confirm the list shows Name, Input, Output, Context, and Action columns.
- [ ] Confirm models already in the system catalog show an "Already added" badge with a disabled Add button.
- [ ] Type "claude" in the search input — confirm the list filters to Claude models only (case-insensitive).
- [ ] Clear the search — confirm all models return.
- [ ] Click **Add** on a model not yet in the system — confirm the confirmation modal opens pre-filled with model ID (read-only), name (editable), and description (editable).
- [ ] Edit the name in the modal and click **Add** — confirm the modal closes, the System Models tab now shows the newly added model, and the model shows "Already added" in the Add Models tab.
- [ ] Click Cancel or X in the modal — confirm it closes without adding a model.
- [ ] Test add error: stop the backend, click **Add** in the modal — confirm an inline error message appears and the modal stays open.

**Lazy-load contract verification:**

- [ ] Reload the page and stay on **General Settings** — confirm NO `/models.json` request appears in the browser Network tab (lazy-load contract).
- [ ] Click **Add Models** tab — confirm ONE `/models.json` request fires and resolves.
- [ ] Switch tabs back to General Settings and back to Add Models — confirm `/models.json` re-fetches (expected MVP behavior: `keepMounted={false}` remounts the tab on switch, triggering `load()`).

---

## Related Code Explanations

- `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.ts` — extended with `models?` prop, re-derive effect, and `modelInitializedRef` initialization guard.
- `project/srcs/frontend/src/pages/AppSettingsPage.tsx` — restructured to 3-tab layout; orchestrates `useSystemModels` + `useAppSettings` + three tab components.
- `project/srcs/frontend/src/components/ui/tabs.tsx` — `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`; `TabsContent` forwards `keepMounted` through `{...props}` to `@base-ui/react` `Tabs.Panel`.
- `project/srcs/frontend/src/features/app-settings/hooks/useSystemModels.ts` — page-level model list owner; `refresh()` is the single hook called post-toggle and post-add.
- [[Admin-LLM-Model-Catalog-Page]] — parent feature; Step 5.1 spec, `models?` prop design, `keepMounted` contract, single-source-of-truth wiring (Finding 2), and lazy-load guarantee (Finding 4).
- [[Review-Admin-LLM-Model-Catalog-Page]] — Finding 2 (duplicate fetch fix), Finding 4 (`keepMounted` explicit prop), Finding 5 (toggleState atomic semantics — implemented in Task 3).

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task.
- [x] Tasks 1, 2, 3, and 4 state verified — this task accounts for current codebase after all prior tasks.
- [x] Relevant skills reviewed and selected.
- [x] `useAppSettings.ts` extended with `UseAppSettingsOptions`, `models?` prop handling in mount effect and `load()`, `modelInitializedRef`, and re-derive `useEffect([externalModels, settings])`.
- [x] `features/app-settings/index.ts` updated with `export type { UseAppSettingsOptions }`.
- [x] Existing 12 `useAppSettings.test.ts` tests confirmed GREEN (no-arg path unchanged).
- [x] `AppSettingsPage.tsx` refactored to 3-tab layout: `Tabs` → `TabsList` (3 triggers) → 3 `TabsContent` panels.
- [x] `useSystemModels` instantiated at page level; `models` prop passed to `useAppSettings`.
- [x] `SystemModelsTab` mounted in `system-models` panel with all 6 props from `useSystemModels`.
- [x] `AvailableModelsTab` mounted in `add-models` panel with `systemModels` and `onModelAdded={systemModels.refresh}`.
- [x] `keepMounted={false}` set explicitly on the `add-models` `TabsContent` with explanatory inline comment.
- [x] `npm --prefix project/srcs/frontend run test -- --run` passes at **128/128**.
- [x] `npm --prefix project/srcs/frontend run typecheck` passes with 0 errors.
- [x] `npm --prefix project/srcs/frontend run build` succeeds.
- [ ] Manual browser validation performed — golden path, toggle reactivity, lazy-load contract, and add-model flow verified. *(human task)*
- [ ] Parent feature Task 5 section updated with wiki link `[[Admin-LLM-Model-Catalog-Page-task-5-appsettings-tab-restructure]]`. *(out of scope for task executor)*
