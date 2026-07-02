#high #new-feature #frontend

## Feature: Admin LLM Model Catalog Page

### Description

Extend the existing `/app-settings` admin page with a three-tab layout: a **General Settings** tab (the existing API key and default model cards), a **System Models** tab (the admin-curated catalog already persisted in the backend), and an **Add Models** tab (browse a local OpenRouter model catalog to add new entries). This feature delivers the frontend management surface for the LLM model catalog that ADR-007 describes and that the backend already fully supports.

A one-line backend fix to `SecurityConfig.java` is also included: `PATCH` is missing from `allowedMethods`, which blocks the toggle endpoint from any browser context.

> **Note (2026-06-28):** The `PATCH` CORS fix described above is already applied in the codebase (`SecurityConfig.java:124` already lists `"PATCH"`). This was resolved in [[Bugs/done/Post-Implementation-Review-of-Llm-Model-Entity-and-Admin-Crud]] Finding 1. No further backend change is required for this feature. Step 1.1 was removed from Implementation Steps; Phase 1 was removed from Task Breakdown.

---

## Problem Statement

Admins have no frontend surface to manage which LLM models are available to employees. The backend LLM model catalog (`POST /llm-model`, `GET /llm-model`, `PATCH /llm-model/{id}/toggle`) is complete and tested, but can only be reached through direct API calls. The OpenRouter API key and default model settings page already exists at `/app-settings`, but it explicitly excluded model management from its scope. This gap means the platform is not self-serviceable: an admin cannot enable or disable models, or add new ones, without external tooling.

Additionally, the browser CORS preflight for `PATCH /llm-model/{id}/toggle` was previously rejected by every browser because `PATCH` was not included in `SecurityConfig.corsConfigurationSource().setAllowedMethods`. **This has been resolved** — `"PATCH"` is now present in `SecurityConfig.java:124` (see [[Bugs/done/Post-Implementation-Review-of-Llm-Model-Entity-and-Admin-Crud]] Finding 1). No backend change is required for this feature.

---

## User Stories

1. As an Admin, I want the App Settings page to be organized into tabs, so that I can navigate between general configuration and model management without leaving the page.
2. As an Admin, I want a **General Settings** tab that contains the OpenRouter API key form and the default model selector, so that the existing settings workflow is preserved in a logical group.
3. As an Admin, I want a **System Models** tab showing all models currently in the backend catalog, so that I can see the full list at a glance.
4. As an Admin, I want each system model to show its name, `modelId`, and current enabled/disabled status, so that I understand what is available to employees.
5. As an Admin, I want models in the System Models tab to display a green badge when enabled and a gray badge when disabled, so that status is immediately scannable.
6. As an Admin, I want a **Disable** button on each enabled model, so that I can hide a model from employees without deleting it.
7. As an Admin, I want a **Enable** button on each disabled model, so that I can restore a previously hidden model.
8. As an Admin, I want no delete button on any model, so that the UI cannot accidentally orphan existing conversation or message records.
9. As an Admin, I want toggling a model's enabled state to take effect immediately and refresh the list, so that I see accurate status after each change.
10. As an Admin, I want an error message if toggling a model fails, so that I know the action did not succeed.
11. As an Admin, I want an **Add Models** tab where I can browse the full OpenRouter model catalog, so that I can discover and add new models without leaving the app.
12. As an Admin, I want the Add Models tab to load its data lazily (only when I click the tab), so that navigating to App Settings does not fetch 500 KB of catalog data on every page load.
13. As an Admin, I want a search input in the Add Models tab that filters models by name as I type, so that I can find a specific model quickly in a list of hundreds.
14. As an Admin, I want each model in the Add Models tab to show its name, input cost, output cost, and context window size, so that I can make an informed cost and capability decision before adding it.
15. As an Admin, I want input and output costs displayed as cost per million tokens (e.g., `$5.00 / 1M`), so that the numbers are comparable and immediately meaningful.
16. As an Admin, I want models with zero or null pricing to show **Free**, so that the display is clean and not confusing.
17. As an Admin, I want models already in the system catalog to show an **Already added** badge in the Add Models tab with a disabled Add button, so that I do not accidentally attempt to add a duplicate.
18. As an Admin, I want an **Add** button on models not yet in the system, so that I can add them with one click.
19. As an Admin, I want clicking **Add** to open a confirmation modal pre-filled with the model's `modelId`, `name`, and `description`, so that I can review what will be saved before confirming.
20. As an Admin, I want to be able to edit the `name` and `description` in the confirmation modal before saving, so that I can localize or simplify the display name.
21. As an Admin, I want the confirmation modal to call `POST /llm-model` on submit and close on success, so that the model is added to the system.
22. As an Admin, I want the System Models tab to refresh after a successful add, so that the newly added model appears immediately.
23. As an Admin, I want an error message in the confirmation modal if the add fails, so that I know what went wrong.
24. As an Admin, I want the Add Models tab to cross-reference against the current system catalog automatically, so that the **Already added** badge stays in sync after I add a model.
25. As a frontend developer, I want the Available Models data fetched through a dedicated hook, so that the Add Models tab does not manage fetch logic internally.
26. As a frontend developer, I want the System Models list managed through a dedicated hook, so that the toggle action and refresh logic are not duplicated across components.
27. As a frontend developer, I want new service functions for `createLlmModel` and `toggleLlmModel` in `appSettingsService.ts`, so that components and hooks do not call Axios directly.
28. As a QA engineer, I want unit tests for `useSystemModels` proving it fetches, handles errors, and calls toggle correctly, so that the list and toggle logic cannot regress silently.
29. As a QA engineer, I want unit tests for `useAvailableModels` proving it filters by search query correctly, so that the search logic cannot regress.
30. As a QA engineer, I want unit tests for the new `appSettingsService` functions verifying request shape and error propagation, so that the API contract is tested at the service boundary.

---

## Solution

### Overview

Extend the existing `features/app-settings/` module. The `AppSettingsPage` is refactored to host three tabs using shadcn `Tabs`. The existing form content moves into a **General Settings** tab. Two new tabs — **System Models** and **Add Models** — are added, each backed by a dedicated hook and set of components. A single-line backend CORS fix makes the toggle endpoint browser-accessible.

The OpenRouter model catalog is served from a static file copied to `frontend/public/models.json`, loaded lazily via `fetch` when the Add Models tab is first opened. This avoids a 500 KB HTTP call on every page visit while keeping the build bundle unchanged.

### Scope

In scope:

- Copy `project/models.json` to `project/srcs/frontend/public/models.json`.
- Extend `features/app-settings/types.ts` with `LlmModelForm` and `OpenRouterModel`.
- Extend `features/app-settings/services/appSettingsService.ts` with `createLlmModel()` and `toggleLlmModel()`.
- Create `useSystemModels` hook.
- Create `useAvailableModels` hook.
- Create `SystemModelsTab`, `AvailableModelsTab`, and `AddModelModal` components inside `features/app-settings/components/`.
- Refactor `AppSettingsPage.tsx` to a 3-tab layout; move existing cards into General Settings tab.
- Export new hooks and components from `features/app-settings/index.ts`.
- Unit tests for new service functions, `useSystemModels`, and `useAvailableModels`.

Out of scope:

- Any new backend endpoints (the existing `GET /llm-model`, `POST /llm-model`, `PATCH /llm-model/{id}/toggle` are sufficient).
- `GET /llm-model/available` (OpenRouter catalog proxy) — the static file replaces this for MVP.
- Editing an existing system model's `name`, `description`, or `modelId` (PUT endpoint exists but UI is deferred).
- Pagination or server-side filtering of system models (the catalog will be small; `GET /llm-model` returns all rows).
- A new route or sidebar entry (`/app-settings` already exists with the correct role guard).
- Sorting controls in the System Models tab (models are listed in fetch order).

### Affected Systems / Modules

- [[ADRs/ADR-007-admin-curated-llm-model-list|ADR-007]] — This feature delivers the admin UI that ADR-007 describes. The decision to use a local file instead of `GET /llm-model/available` is an MVP-scope choice aligned with ADR-007's spirit (admin curates, not employees).
- [[ADRs/ADR-001-single-llm-provider-openrouter|ADR-001]] — All model IDs in `models.json` are OpenRouter identifiers. No second provider is introduced.
- [[ADRs/ADR-010-base-ui-over-radix-ui-for-frontend|ADR-010]] — The `Tabs` component must use Base UI-backed shadcn (`npx shadcn@latest add tabs` with `base-mira` style). Do not use a Radix-based Tabs primitive directly.
- [[Features/done/Admin-App-Settings-Page]] — The page and feature module this feature extends. The General Settings tab is a reorganization of the existing form.
- [[Features/done/Admin-Employee-Management-Page]] — Reference pattern for table, toggle, and modal patterns in the System Models tab.
- [[Features/done/Llm-Model-Entity-and-Admin-Crud]] — The backend feature whose endpoints this UI consumes.
- [[Docs/API-Reference/LlmModels|LLM Models API]] — Contracts for `GET /llm-model`, `POST /llm-model`, `PATCH /llm-model/{id}/toggle`.
- `project/srcs/frontend/public/` — Static asset destination for `models.json`.
- `project/srcs/frontend/src/features/app-settings/` — The feature module being extended.
- `project/srcs/frontend/src/pages/AppSettingsPage.tsx` — Refactored to 3-tab layout.

### Impact Analysis

The General Settings tab contains exactly the existing form and cards — no behavior changes. **`useAppSettings` receives a small additive change**: an optional `models?: LlmModelDTO[]` parameter. When `AppSettingsPage` provides it (from `useSystemModels`), the hook skips its own `listLlmModels()` fetch and derives `enabledModels` from the prop, making `useSystemModels` the single source of truth for `GET /llm-model` and fixing the post-toggle staleness described in [[Review-Admin-LLM-Model-Catalog-Page]] Finding 2. When `models` is omitted, `useAppSettings` behaves exactly as before (it self-fetches `listLlmModels()`), so its existing tests and standalone-usage path are byte-for-byte unchanged. The existing `listLlmModels()` service function and `LlmModelDTO` / `LlmModelMiniDTO` types are unchanged. New functions and types are additive.

The `AppSettingsPage.tsx` restructure wraps existing content in a `TabsContent` panel. The page renders the same data in the same way — only the shell changes.

The `models.json` static file is 500 KB. Placing it in `public/` keeps it out of the Vite bundle (resolves the pre-existing 500 KB chunk-size warning noted in context.md). The file is only fetched when the Add Models tab is first clicked.

### Risk Assessment

- **CORS fix is a prerequisite for toggle.** ~~Without the `SecurityConfig` fix, `PATCH /llm-model/{id}/toggle` will fail CORS preflight in every browser.~~ **Resolved** (see [[Bugs/done/Post-Implementation-Review-of-Llm-Model-Entity-and-Admin-Crud]] Finding 1); `"PATCH"` is already in `SecurityConfig.java:124`.
- **`models.json` staleness.** The static file is a snapshot. New models added to OpenRouter after the snapshot date will not appear in the Add Models tab until the file is manually updated. This is an accepted MVP trade-off.
- **No edit UI.** The `PUT /llm-model/{id}` endpoint exists but is out of scope. If an admin adds a model with the wrong name, they must use the API directly to fix it.
- **ADR-010 Tabs constraint.** The shadcn `Tabs` component must be added via `npx shadcn@latest add tabs` with `base-mira` style active. If added via a Radix-based path, it will silently introduce Radix UI packages.
- **`useAvailableModels` fetch on first tab-open.** If the network request fails (unlikely for a same-origin static file in Docker), the Add Models tab should render an error state rather than a blank list.
- **Lazy-load is an explicit contract, not an implicit Base UI default (Finding 4, Option d).** Base UI `Tabs.Panel` (`@base-ui/react@1.5.0`) mounts children lazily by default (`keepMounted` defaults to `false`); the feature sets `keepMounted={false}` explicitly on the `add-models` `TabsContent` so the 500 KB `models.json` fetch is guaranteed to fire only on first tab-click (user story 12) regardless of future Base UI defaults or wrapper changes. A reviewer who later wants exit animations by setting `keepMounted={true}` must re-lift `load()` triggering off the panel mount (e.g., an explicit owner-controlled fetch) or the on-load fetch will silently return.

---

## Implementation Architecture

### Changes Required

#### 1. `frontend/public/models.json` — Static Model Catalog
**Purpose:** Serve the OpenRouter model list as a same-origin static asset, lazily fetched by the Add Models tab.
**Changes:** Copy `project/models.json` to `project/srcs/frontend/public/models.json`.
**Notes:** Response shape is `{ "data": OpenRouterModel[] }`. Each `OpenRouterModel` has `id` (the `modelId`), `name`, `description`, `context_length`, and `pricing.prompt` / `pricing.completion` as per-token string values.

#### 2. `features/app-settings/types.ts` — Type Extensions
**Purpose:** Add types for the new service functions and the static catalog shape.
**Changes:**
```typescript
// Form for creating a new system model
export interface LlmModelForm {
  modelId: string
  name: string
  description?: string
}

// Single entry from models.json "data" array
export interface OpenRouterModel {
  id: string          // the OpenRouter model identifier (used as modelId)
  name: string
  description: string | null
  context_length: number | null
  pricing: {
    prompt: string | null
    completion: string | null
  } | null
}
```

#### 3. `features/app-settings/services/appSettingsService.ts` — Service Extensions
**Purpose:** Expose `createLlmModel` and `toggleLlmModel` so hooks do not call Axios directly.
**Changes:**
```typescript
export async function createLlmModel(form: LlmModelForm): Promise<LlmModelMiniDTO> {
  const response = await api.post<LlmModelMiniDTO>("/llm-model", form)
  return response.data
}

export async function toggleLlmModel(id: number): Promise<LlmModelDTO> {
  const response = await api.patch<LlmModelDTO>(`/llm-model/${id}/toggle`)
  return response.data
}
```

#### 4. `useSystemModels` hook — System Model List and Toggle
**Purpose:** Deep module owning the system model list fetch and the toggle action. **Page-level single source of truth for `GET /llm-model`** — `AppSettingsPage` feeds its `models` array into `useAppSettings` (see [[Review-Admin-LLM-Model-Catalog-Page]] Finding 2, Option d) so the General Settings default-model selector always derives from this hook's list, not from a second fetch. Keeps `SystemModelsTab` as a thin renderer.
**Interface:**
```typescript
interface UseSystemModels {
  models: LlmModelDTO[]
  isLoading: boolean
  error: string | null
  toggleModel: (id: number) => Promise<void>
  toggleState: { id: number | null; error: string | null }
  refresh: () => void
}
```
**Implementation:** Calls `listLlmModels()` on mount. `toggleModel(id)` calls `toggleLlmModel(id)` then `refresh()` (one `PATCH` + one `GET /llm-model` per toggle; no `GET /app-settings` re-fetch). Per-row toggle state is owned by a single atomic `toggleState: { id, error }` (see [[Review-Admin-LLM-Model-Catalog-Page]] Finding 5, Option d) rather than separate `isToggling` + `toggleError`, so `SystemModelsTab` renders each row's loading spinner with `toggleState.id === model.id` and each row's error message against the failing row. Both keys are updated together (`{ id, error: null }` on start, `{ id: null, error }` on failure, `{ id: null, error: null }` on success), preventing state-tearing. Error messages extracted from `err.response?.data?.message` or generic fallback. Single-in-flight: the renderer blocks a second toggle while `toggleState.id !== null`. Because `useAppSettings({ models: models })` re-derives `enabledModels` from this hook's `models` state, a toggle's `refresh()` automatically updates the General Settings default selector — no `useAppSettings.reload()` call is wired in the toggle `onSuccess`.
**File:** `project/srcs/frontend/src/features/app-settings/hooks/useSystemModels.ts`

#### 5. `useAvailableModels` hook — Static Catalog Fetch and Client-Side Filter
**Purpose:** Deep module owning the `models.json` fetch lifecycle and search filtering. Loaded lazily — caller triggers fetch by calling `load()`.
**Interface:**
```typescript
interface UseAvailableModels {
  filteredModels: OpenRouterModel[]
  isLoading: boolean
  error: string | null
  searchQuery: string
  setSearchQuery: (q: string) => void
  load: () => void
  hasLoaded: boolean
}
```
**Implementation:** `load()` fetches `/models.json`, parses the `data` array, stores all models in ref. Sets `hasLoaded` flag so subsequent tab-opens skip the fetch. `filteredModels` is derived from `allModels` filtered by `searchQuery` (case-insensitive match on `name`). Empty `searchQuery` returns all models.
**File:** `project/srcs/frontend/src/features/app-settings/hooks/useAvailableModels.ts`

#### 6. `SystemModelsTab` component
**Purpose:** Renders the system model list using data from `useSystemModels`. Thin: no local state beyond what the hook provides.
**Props:** `systemModels: LlmModelDTO[], isLoading, toggleModel, toggleState, refresh`
**Layout:** shadcn `Table` with columns: **Name**, **Model ID**, **Status**, **Action**. Status column: green `Badge` for enabled, gray `Badge` for disabled. Action column: `Button` reading "Disable" (enabled models) or "Enable" (disabled models). `LoadingSpinner` when `isLoading`. Per-row loading spinner / disabled state when `toggleState.id === model.id`; per-row error (`ErrorMessage` bound to the row) when `toggleState.id === model.id && toggleState.error`. A second toggle is blocked while `toggleState.id !== null` (single-in-flight).
**File:** `project/srcs/frontend/src/features/app-settings/components/SystemModelsTab.tsx`

#### 7. `AddModelModal` component
**Purpose:** Confirmation dialog for adding a model from the catalog to the system.
**Props:** `model: OpenRouterModel, onClose: () => void, onSuccess: () => void` (non-null — the modal is conditionally mounted by the parent; see item 8 and [[Review-Admin-LLM-Model-Catalog-Page]] Finding 3).
**Behavior:** Pre-fills `modelId` from `model.id`, `name` from `model.name`, `description` from `model.description`. `modelId` is read-only (cannot be changed). `name` and `description` are editable. Submit calls `createLlmModel(form)`, closes on success, calls `onSuccess()`. Shows inline error from `err.response?.data?.message` on failure. Because `model` is guaranteed non-null (conditional mount at the parent), form field `useState` may be initialized directly from `model.id`/`model.name`/`model.description` with no internal null-guard.
**File:** `project/srcs/frontend/src/features/app-settings/components/AddModelModal.tsx`

#### 8. `AvailableModelsTab` component
**Purpose:** Renders the full OpenRouter catalog from `useAvailableModels`, cross-referenced against system models.
**Props:** `systemModels: LlmModelDTO[], onModelAdded: () => void`
**Behavior:** Calls `useAvailableModels` internally. Calls `load()` on first render (`useEffect` with empty deps). Derives `systemModelIds: Set<string>` from `systemModels` for O(1) lookup. For each `filteredModel`: if `systemModelIds.has(model.id)` → show **Already added** badge, disabled button. Otherwise → show **Add** button. Tracks `selectedModel: OpenRouterModel | null` state; clicking **Add** sets it. Conditionally mounts the modal at the parent — matching the Employee-modal convention (`{selectedModel && <AddModelModal model={selectedModel} onClose={() => setSelectedModel(null)} onSuccess={...} />}`) — rather than keeping the modal always mounted (see [[Review-Admin-LLM-Model-Catalog-Page]] Finding 3).
**Layout:** Search `Input` at top. List or table of models with columns: **Name**, **Input**, **Output**, **Context**, **Action**. Pricing formatted as `$X.XX / 1M` or `Free`. Context window formatted with `toLocaleString()` (e.g., `128,000`).
**File:** `project/srcs/frontend/src/features/app-settings/components/AvailableModelsTab.tsx`

#### 9. `AppSettingsPage.tsx` — 3-Tab Restructure
**Purpose:** Replace the current single-panel layout with a `Tabs` component hosting three panels.
**Changes:**
- Add `import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"` (requires `npx shadcn@latest add tabs` first).
- Wrap existing form content (`AppSettingsForm`, `LastUpdatedCard`) in `<TabsContent value="general">`.
- Add `<TabsContent value="system-models"><SystemModelsTab .../></TabsContent>`.
- Add `<TabsContent value="add-models"><AvailableModelsTab .../></TabsContent>`.
- **Lazy-load guarantee (Finding 4, Option d):** set `keepMounted={false}` explicitly on the `add-models` `TabsContent` with an inline comment citing user story 12. Base UI `Tabs.Panel` mounts its children lazily by default (`keepMounted` defaults to `false`), so `AvailableModelsTab` only mounts — and its mount `useEffect` only fires `useAvailableModels.load()` — when the Add Models tab becomes active; the explicit prop converts that default into an explicit contract so a future `keepMounted={true}` (e.g., for exit animations) cannot silently reintroduce a 500 KB on-load fetch. No `AppSettingsPage`-level active-tab state is required. Verification step: confirm after Step 1.2 that the generated `tabs.tsx` forwards `keepMounted` through to `Tabs.Panel` (base-mira shadcn registry forwards props via `{...props}`).
- `useSystemModels` is instantiated in `AppSettingsPage` so the `refresh` callback can be passed to `AvailableModelsTab.onModelAdded` (refreshes the system models list after a successful add).
- **Single source of truth wiring (Finding 2, Option d):** pass `systemModels.models` into the General Settings hook: `const appSettings = useAppSettings({ models: systemModels.models })`. Because `useAppSettings` derives `enabledModels` from this prop when it is provided, `SystemModelsTab`'s toggle `onSuccess` calls only `useSystemModels.refresh()` — no `useAppSettings.reload()` is needed and no duplicate `GET /llm-model` fires on page load.
**File:** `project/srcs/frontend/src/pages/AppSettingsPage.tsx`

---

## Implementation Steps

### Phase 1: Static Model Catalog Setup
- [ ] **Step 1.1:** Copy `project/models.json` to `project/srcs/frontend/public/models.json`.
- [ ] **Step 1.2:** Add `npx shadcn@latest add tabs` to install the `Tabs` shadcn component with `base-mira` style (required before `AppSettingsPage` restructure). After generation, verify `components/ui/tabs.tsx` forwards `keepMounted` through to the underlying Base UI `Tabs.Panel` (the base-mira registry forwards props via `{...props}`) and does not hardcode `keepMounted={true}` — required for the Finding 4 lazy-load guarantee on the `add-models` tab.

### Phase 2: Service and Types Extension
- [ ] **Step 2.1:** Add `LlmModelForm` and `OpenRouterModel` interfaces to `features/app-settings/types.ts`.
- [ ] **Step 2.2:** Add `createLlmModel()` and `toggleLlmModel()` to `features/app-settings/services/appSettingsService.ts`.
- [ ] **Step 2.3:** Write unit tests for `createLlmModel` and `toggleLlmModel` in `appSettingsService.test.ts` using `axios-mock-adapter`.

### Phase 3: System Models Hook and Tab
- [ ] **Step 3.1:** Create `useSystemModels` hook with fetch, toggle, and refresh behavior.
- [ ] **Step 3.2:** Write unit tests for `useSystemModels` covering: initial fetch, loading state, fetch error, successful toggle, toggle error, refresh after toggle.
- [ ] **Step 3.3:** Create `SystemModelsTab` component (table with enabled/disabled badge + Enable/Disable button).

### Phase 4: Available Models Hook and Add Flow
- [ ] **Step 4.1:** Create `useAvailableModels` hook with lazy fetch, `hasLoaded` guard, and `searchQuery` filter.
- [ ] **Step 4.2:** Write unit tests for `useAvailableModels` covering: lazy load (not fetched on init), fetch on `load()`, search filtering (case-insensitive), empty query returns all, fetch error.
- [ ] **Step 4.3:** Create `AddModelModal` component (pre-filled, read-only modelId, editable name/description, error handling).
- [ ] **Step 4.4:** Create `AvailableModelsTab` component (search input, model list, already-added cross-reference, opens `AddModelModal`).

### Phase 5: AppSettingsPage Restructure
- [ ] **Step 5.1:** Refactor `AppSettingsPage.tsx` to a 3-tab layout. Default tab is **General Settings**. Wire `useSystemModels` at the page level so `onModelAdded` refreshes the system catalog.

---

## Potential Issues / Risks

- **Tabs shadcn component must use `base-mira` style.** Running `npx shadcn@latest add tabs` without confirming `components.json` uses `base-mira` will silently add a Radix-backed `Tabs`. Verify before adding.
- **`models.json` fetch in `useAvailableModels` may fail in Docker** if the Vite dev server static file serving is not configured to serve from `public/`. Vite serves `public/` automatically at the root, so `/models.json` will resolve correctly during development.
- **`useSystemModels` toggle refresh causes a full list re-fetch.** With a small catalog this is fine. If the catalog grows large, a local optimistic update could replace the re-fetch. Per-toggle cost is exactly one `PATCH /llm-model/{id}/toggle` + one `GET /llm-model`; no `GET /app-settings` re-fetch, since `useAppSettings` derives from `useSystemModels.models` (Finding 2, Option d) rather than via a full `reload()`.
- **`useAppSettings` optional `models` prop — clamp-to-null semantics.** When `models` is provided and the toggled-off model is the currently-persisted default (`settings.defaultModel.id`), `useAppSettings`'s keyed re-derive effect sets `selectedDefaultModelId` to `null` (matching the existing mount-time rule that maps a stale disabled default → `null`). An unsaved General Settings change staged before the toggle will have its default selection cleared by this clamp; the effect carries an idempotency guard so it does not overwrite an admin's in-progress selection on subsequent prop updates. Saving after the clamp will explicitly null the backend `defaultModel` FK — intentional "stale becomes explicit clear" behavior, consistent with `AppSettingsUpdateForm.defaultModelId: number | null` semantics.
- **`AddModelModal` is conditionally mounted at `AvailableModelsTab`.** The modal uses `model: OpenRouterModel` (non-null) and is mounted via `{selectedModel && <AddModelModal ... />}`, matching the Employee-modal convention (`[[Features/done/Admin-Employee-Management-Page]]`). The previous design rationale that always-mounting "avoids mount/unmount animation issues with shadcn `Dialog`" was unfounded — the Base-UI-backed `Dialog` enter animations fire on mount, and the three Employee modals conditionally mount the same component in production with no animation defect (see [[Review-Admin-LLM-Model-Catalog-Page]] Finding 3). Should a smooth exit animation later be required, switch to a controlled `open` + `keepMounted`/`forceMount` pattern; no demonstrated need exists today.

---

## Testing Decisions

**What makes a good test in this codebase:**
Tests verify observable behavior through public hook/service interfaces, not implementation details. A hook test creates an `axios-mock-adapter` instance or mocks `fetch`, renders the hook via `renderHook`, and asserts on state transitions — not on internal function calls. Service tests verify the request URL, method, and response mapping. Tests survive internal refactors.

**Prior art in this codebase:**
- `features/app-settings/services/appSettingsService.test.ts` — axios-mock-adapter pattern for service tests.
- `features/employees/hooks/useEmployeeList.test.ts` — `renderHook` + `act` pattern for hook tests.
- `features/employees/hooks/useEmployeeFilter.test.ts` — filter state hook test pattern.
- `vitest.config.ts` — `jsdom` environment, `@/` alias; no `setupFiles` (see known-issues: `screen.*` queries across tests may need `container.querySelector` workaround for second renders in the same file).

**Modules with unit tests:**

| Module | Test File | What to Test |
|--------|-----------|--------------|
| `appSettingsService.ts` (new fns) | `appSettingsService.test.ts` | `createLlmModel`: POST to `/llm-model`, returns `LlmModelMiniDTO`; `toggleLlmModel`: PATCH to `/llm-model/{id}/toggle`, returns `LlmModelDTO`; error propagation on non-2xx |
| `useSystemModels` | `useSystemModels.test.ts` | Initial fetch populates `models`; `isLoading` true during fetch; fetch error sets `error`; `toggleModel(id)` calls PATCH and triggers refresh; `toggleState` transitions `null → { id, null }` on start, `{ id, error }` on failure (row-bound error), `{ null, null }` on success; single-in-flight (no second `id` overwrites while one is pending) |
| `useAvailableModels` | `useAvailableModels.test.ts` | No fetch on init (`hasLoaded` false); `load()` fetches `/models.json` and populates; `searchQuery` filters by name case-insensitively; empty query returns all; fetch error sets `error` |

**Modules without unit tests (UI composition layers):**
`SystemModelsTab`, `AvailableModelsTab`, `AddModelModal`, `AppSettingsPage` — these are thin renderers. Their correctness is verified by the manual browser validation step (golden path + toggle + add flow).

---

## Task Breakdown

### Task 1: Static Catalog Setup
- **Steps Covered:** Step 1.1, Step 1.2
- **Reason for Grouping:** Both are low-complexity setup steps with no frontend component work. They are prerequisites for every subsequent task. Grouping them keeps later tasks focused on logic and UI.
- **Planned Task File:** `Admin-LLM-Model-Catalog-Page-task-1-static-catalog-setup.md`
- **Task Document Link:** [[Admin-LLM-Model-Catalog-Page-task-1-static-catalog-setup]]

### Task 2: Service and Types Extension with Tests
- **Steps Covered:** Step 2.1, Step 2.2, Step 2.3
- **Reason for Grouping:** Types and service functions are tightly coupled — the types are used directly in the service signatures. Tests for the service are written in the same cycle. This is a single TDD pass over the new service layer.
- **Planned Task File:** `Admin-LLM-Model-Catalog-Page-task-2-service-and-types.md`
- **Task Document Link:** [[Admin-LLM-Model-Catalog-Page-task-2-service-and-types]]

### Task 3: System Models Hook and Tab
- **Steps Covered:** Step 3.1, Step 3.2, Step 3.3
- **Reason for Grouping:** Hook and tests are a TDD unit (red-green cycle), and `SystemModelsTab` is the direct consumer of the hook. Writing all three together avoids context-switching and catches integration issues between the hook interface and the component props.
- **Planned Task File:** `Admin-LLM-Model-Catalog-Page-task-3-system-models-hook-and-tab.md`
- **Task Document Link:** [[Admin-LLM-Model-Catalog-Page-task-3-system-models-hook-and-tab]]

### Task 4: Available Models Hook, Modal, and Tab
- **Steps Covered:** Step 4.1, Step 4.2, Step 4.3, Step 4.4
- **Reason for Grouping:** The hook, modal, and tab form the complete Add Models flow. The hook is tested in TDD cycle; the modal and tab are its consumers. All three must be built together to verify the end-to-end add path (search → click Add → modal → confirm → success).
- **Planned Task File:** `Admin-LLM-Model-Catalog-Page-task-4-available-models-hook-modal-and-tab.md`
- **Task Document Link:** [[Admin-LLM-Model-Catalog-Page-task-4-available-models-hook-modal-and-tab]]

### Task 5: AppSettingsPage 3-Tab Restructure
- **Steps Covered:** Step 5.1
- **Reason for Grouping:** This is the integration step that composes all previous work. It runs last because all three tabs and their hooks must exist before the page can be assembled. It is intentionally isolated so earlier tasks can be validated independently.
- **Planned Task File:** `Admin-LLM-Model-Catalog-Page-task-5-appsettings-tab-restructure.md`
- **Task Document Link:** [[Admin-LLM-Model-Catalog-Page-task-5-appsettings-tab-restructure]]
