#high #new-feature #frontend

## Feature: Admin App Settings Page

### Description

Create an admin-only frontend page for application settings at `/app-settings`. The page exposes the existing backend `AppSettings` contract without changing the backend: Admins can configure the OpenRouter API key and choose a default LLM model from the enabled local model catalog. The OpenRouter API key must never be shown in the UI; the form uses an empty password input plus a configured/not-configured status so admins can replace the key without seeing or accidentally resubmitting the masked value returned by the backend.

This is a frontend-only feature. It consumes the existing `GET /app-settings`, `PATCH /app-settings`, and `GET /llm-model` endpoints through the existing frontend Axios instance and role-based route infrastructure.

---

## Problem Statement

Admins currently have backend support for application settings, but no frontend page to view or modify those settings. The OpenRouter API key can be persisted through the backend, and the default model can be stored on `AppSettings`, but using those capabilities requires direct API access. This creates unnecessary operational friction for initial setup and key rotation, and it makes the platform harder to administer after deployment.

The most sensitive setting is the OpenRouter API key. The backend intentionally returns only a masked representation, and the frontend must not display a raw key or treat the masked value as an editable key. The UI needs a safe replacement workflow: show whether a key exists, keep the password input empty, and save a new key only when the admin types one.

---

## User Stories

1. As an Admin, I want an `App Settings` item in the sidebar, so that I can reach platform-level configuration without knowing the URL.
2. As an Admin, I want the App Settings page to be available at `/app-settings`, so that the frontend route matches the backend resource name.
3. As an Employee, I want the App Settings sidebar item to be hidden, so that I am not shown admin-only configuration areas.
4. As an Employee who directly navigates to `/app-settings`, I want to be redirected to `/conversations`, so that role-based access is enforced consistently.
5. As an unauthenticated user who directly navigates to `/app-settings`, I want to be redirected to `/login`, so that settings are not exposed without authentication.
6. As an Admin, I want to see whether the OpenRouter API key is configured, so that I know whether the system is ready to call OpenRouter.
7. As an Admin, I want the API key input to be a password field, so that typed characters are not visible on screen.
8. As an Admin, I want the API key input to be empty even when a key exists, so that the UI never displays the masked or raw key as an editable value.
9. As an Admin, I want helper text explaining that leaving the API key field blank preserves the existing key, so that I can update the default model without rotating the key.
10. As an Admin, I want to type a new OpenRouter API key and save it, so that I can complete initial setup or rotate the credential.
11. As an Admin, I want the saved response to clear the API key input after success, so that the newly typed key is not left visible in browser state.
12. As an Admin, I want to see the current default model if one is configured and enabled, so that I understand which model new conversations will pre-select.
13. As an Admin, I want the default model selector to list only enabled LLM models, so that I cannot choose a disabled model that employees cannot use.
14. As an Admin, I want the default model selector to include a `No default model` option, so that I can explicitly clear the default model.
15. As an Admin, I want the default model selector disabled when there are no enabled LLM models, so that the UI communicates that model setup must happen first.
16. As an Admin, I want the page to explain that LLM models must be added and enabled before a default can be selected, so that an empty selector is not confusing during first setup.
17. As an Admin, I want saving a new API key to preserve the current default model unless I intentionally change or clear it, so that key rotation does not accidentally clear model settings.
18. As an Admin, I want saving a default model to preserve the current API key when the key input is blank, so that model selection does not require re-entering the secret.
19. As an Admin, I want the page to show `updatedAt` and `updatedByUsername` when available, so that I can see when settings were last changed and by whom.
20. As an Admin, I want loading, saving, success, and error states, so that I understand whether settings are being fetched or updated.
21. As a frontend developer, I want App Settings API calls hidden behind a feature service module, so that pages and components do not call Axios directly.
22. As a frontend developer, I want App Settings state and PATCH payload rules hidden behind a hook, so that the page does not duplicate backend null/blank semantics.
23. As a frontend developer, I want the default model select to use Base UI typed values, so that model IDs remain numbers and the clear option remains `null` without string coercion.
24. As a QA engineer, I want tests proving the masked key is not placed into the password input, so that the security-sensitive UI behavior does not regress.
25. As a QA engineer, I want tests proving the PATCH payload always includes the selected `defaultModelId` or `null`, so that the backend's null-clears-default behavior cannot accidentally clear the default model.

---

## Solution

Add a new `features/app-settings/` frontend module and a thin `AppSettingsPage` route target. The module owns the App Settings API service, types, state hook, and form component. The route is added to the existing admin-only `RoleGuard` group alongside `/dashboard` and `/employees`, and the sidebar/header get a new `App Settings` entry.

The page exposes both settings currently available from the backend:

- OpenRouter API key: status display plus empty password input for replacement.
- Default LLM model: enabled-model-only selector with a `No default model` clear option, disabled when there are no enabled models.

The hook owns the important backend contract detail: `PATCH /app-settings` clears `defaultModel` if `defaultModelId` is null or omitted, while blank/null `openRouterApiKey` preserves the key. Therefore, the frontend save flow always sends `defaultModelId` explicitly (`number` or `null`) and sends `openRouterApiKey` only when the admin typed a non-blank replacement key.

### Scope

All production code changes are limited to `project/srcs/frontend/src/`.

In scope:

- Create a new admin-only App Settings route at `/app-settings`.
- Add an `App Settings` sidebar item visible only to `UserRole.ADMIN`.
- Add a header title for `/app-settings`.
- Create App Settings feature types, service calls, hook, form component, page, and tests.
- Consume existing backend endpoints only.
- Use the existing `api` Axios singleton from `src/lib/api.ts`.
- Use existing shadcn/Base UI components where possible.

Out of scope:

- Backend changes.
- Creating, editing, enabling, or disabling LLM models from this page.
- OpenRouter available-model browsing.
- API key encryption at rest.
- Showing or revealing the raw OpenRouter API key.
- Adding a separate settings entity or user-preference system.

### Affected Systems / Modules

- [[Memory/architecture|Architecture]] - Adds a new frontend feature module and one admin route; follows existing route guard and feature-module conventions.
- [[Memory/tech|Tech Stack]] - React 19, Vite 7, TypeScript 5.9, react-router-dom 6.30.3, shadcn/ui 4.7 with Base UI, Axios, Vitest.
- [[Docs/API-Reference/AppSettings|App Settings API]] - Source of the `GET /app-settings` and `PATCH /app-settings` contracts.
- [[Docs/API-Reference/LlmModels|LLM Models API]] - Source of the `GET /llm-model` contract used to populate enabled default-model options.
- [[Features/done/App-Settings-Entity-and-Admin-Configuration]] - Backend feature that created the singleton settings resource, masking behavior, and PATCH semantics.
- [[Features/done/Llm-Model-Entity-and-Admin-Crud]] - Backend feature that created the local model catalog and enabled/disabled model state.
- [[Features/done/Frontend-Role-Based-Routing-and-Landing-Pages]] - Existing route guard, role-aware sidebar, and admin route group pattern.
- [[Features/done/Admin-Employee-Management-Page]] - Existing frontend admin page pattern for sidebar/header/router wiring and feature-layer services/hooks.
- [[ADRs/ADR-001-single-llm-provider-openrouter|ADR-001]] - OpenRouter is the single MVP LLM provider; the settings page must not introduce provider selection.
- [[ADRs/ADR-002-openrouter-as-service-not-entity|ADR-002]] - OpenRouter API key lives in `AppSettingsEntity`; the frontend configures that setting, not a provider entity.
- [[ADRs/ADR-005-no-user-settings-entity|ADR-005]] - This is app-level configuration, not per-user preferences; do not add user settings.
- [[ADRs/ADR-007-admin-curated-llm-model-list|ADR-007]] - Default model options must come from the admin-curated model list and only enabled models should be selectable.
- [[ADRs/ADR-010-base-ui-over-radix-ui-for-frontend|ADR-010]] - Use Base UI-backed shadcn components, not Radix primitives.
- `project/srcs/frontend/src/router.tsx` - Add `/app-settings` route inside the admin-only route group.
- `project/srcs/frontend/src/layouts/Sidebar.tsx` - Add `App Settings` menu item with `roles: [UserRole.ADMIN]`.
- `project/srcs/frontend/src/layouts/Header.tsx` - Add `/app-settings` title case.
- `project/srcs/frontend/src/features/app-settings/` - New feature module.
- `project/srcs/frontend/src/pages/AppSettingsPage.tsx` - New thin page assembler.

### Impact Analysis

This feature is additive. Existing admin pages (`/dashboard`, `/employees`) and employee pages (`/conversations`) keep their current behavior. The new route is protected by the existing `ProtectedRoute -> RoleGuard -> MainLayout` chain, so access control follows the same path already used by `/dashboard` and `/employees`.

The frontend will make two read calls on page load: `GET /app-settings` and `GET /llm-model`. Both are admin-only backend endpoints. The model response is filtered on the frontend to enabled models only for selector options. If no enabled models exist, the default model selector is disabled and the save payload uses `defaultModelId: null` unless the admin later selects an enabled model.

No backend schema, controller, service, security, or CORS code is modified. If the environment still has an unresolved CORS issue for `PATCH /app-settings`, that is a backend deployment/configuration issue outside this frontend-only feature; the frontend still targets the documented endpoint.

### Risk Assessment

- **Masked API key must never be used as input:** `GET /app-settings` returns `openRouterApiKey` as `null`, `****`, or `****last4`. The hook must convert this only into a configured/not-configured status. It must never put the masked string into the password input or PATCH payload.
- **Password-manager autofill must not poison the OpenRouter key:** The API key input uses `type="password"` and renders empty on load, which can cause browser password managers to autofill the field with an unrelated saved credential. The input must use a domain-specific `name="openRouterApiKey"` (not `name="password"`) and an autofill-suppressing `autoComplete` attribute (`autoComplete="new-password"` as primary, with `autoComplete="off"` as fallback if browser testing shows `"new-password"` is ignored) so that an autofilled value cannot be PATCHed as `openRouterApiKey` and overwrite the real key server-side.
- **PATCH default model null semantics:** The backend clears `defaultModel` when `defaultModelId` is null or omitted. The hook must always include `defaultModelId` in the save payload as either the selected model id or `null`. If the admin changes only the API key, the hook must preserve the current selected default model by sending its id.
- **No enabled models on first setup:** Initial deployments may have zero local LLM models. The selector must be disabled and explain that enabled models must be added first. This feature does not create a model-management workflow.
- **Stale disabled default model:** The backend may still hold a default model that was enabled when selected but disabled later. Because the selector lists only enabled models, the UI should not offer that disabled model as selectable. It may display a warning/status that the current default is unavailable, and saving with no enabled selection should clear it by sending `defaultModelId: null`.
- **GET /llm-model returns all models:** The frontend filters disabled models out locally. For MVP this is acceptable because the admin-curated catalog is expected to be small. If model count becomes large, a future feature can replace this with a paginated/filtering model selector.
- **`LlmModelService.getAll()` returns a `Set` and does not guarantee order:** The hook must sort the enabled model list after filtering so the default model selector renders in a stable order. Do not rely on `GET /llm-model` returning models in any particular order across reloads, environments, or CI.
- **RoleGuard route group remains explicit:** Adding one more admin child route does not require extracting a `RoleLayout`. The existing duplication between admin and employee route groups remains below the documented refactor trigger.
- **Base UI typed select values:** The existing `src/components/ui/select.tsx` re-exports `SelectPrimitive.Root`, so typed values can flow through. If this wrapper changes later, tests/typecheck should catch coercion issues.

---

## Implementation Architecture

### Changes Required

#### 1. `src/features/app-settings/types.ts`

**Purpose:** Define the frontend mirror of the existing App Settings and LLM model API contracts.

**Changes:** New file at `project/srcs/frontend/src/features/app-settings/types.ts`.

Define:

```typescript
export interface LlmModelDTO {
  id: number
  modelId: string
  name: string
  description: string | null
  isEnabled: boolean
  createdAt: string
}

export interface LlmModelMiniDTO {
  id: number
  modelId: string
  name: string
  isEnabled: boolean
}

export interface AppSettingsDTO {
  id: number
  openRouterApiKey: string | null
  defaultModel: LlmModelMiniDTO | null
  updatedAt: string | null
  updatedByUsername: string | null
}

export interface AppSettingsUpdateForm {
  openRouterApiKey?: string
  defaultModelId: number | null
}
```

Key notes:

- `openRouterApiKey` on `AppSettingsDTO` is masked or null. It is never a raw secret.
- `openRouterApiKey` on `AppSettingsUpdateForm` is optional so blank input can be omitted from JSON while preserving the key.
- `defaultModelId` is required on the frontend form type as `number | null` to force every save path to handle the backend clear/preserve decision explicitly.

---

#### 2. `src/features/app-settings/services/appSettingsService.ts` (TDD)

**Purpose:** Hide Axios URLs and response extraction behind a small service interface.

**Changes:** New file at `project/srcs/frontend/src/features/app-settings/services/appSettingsService.ts`.

Public functions:

```typescript
export async function getAppSettings(): Promise<AppSettingsDTO>
export async function updateAppSettings(form: AppSettingsUpdateForm): Promise<AppSettingsDTO>
export async function listLlmModels(): Promise<LlmModelDTO[]>
```

Implementation:

- `getAppSettings()` calls `api.get<AppSettingsDTO>("/app-settings")` and returns `response.data`.
- `updateAppSettings(form)` calls `api.patch<AppSettingsDTO>("/app-settings", form)` and returns `response.data`.
- `listLlmModels()` calls `api.get<LlmModelDTO[]>("/llm-model")` and returns `response.data`.

This service does not filter enabled models and does not interpret masked API keys. The hook owns those business/UI rules.

---

#### 3. `src/features/app-settings/hooks/useAppSettings.ts` (TDD)

**Purpose:** Deep module that owns App Settings page state, API-key safety rules, enabled-model filtering, save payload construction, and error/success lifecycle.

**Changes:** New file at `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.ts`.

Suggested public interface:

```typescript
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
```

Load behavior:

1. Set `isLoading = true`, clear stale `error` and `successMessage`.
2. Fetch settings and models together with `Promise.all([getAppSettings(), listLlmModels()])`.
3. Filter `models` to `model.isEnabled === true` and sort the filtered list deterministically with `a.name.localeCompare(b.name) || a.modelId.localeCompare(b.modelId)` so the default model selector renders in a stable order across reloads, environments, and CI. Use a non-mutating spread before sorting (`[...models].filter(...).sort(...)`) to keep the service-returned array immutable.
4. Set `hasConfiguredApiKey` from `Boolean(settings.openRouterApiKey)`.
5. Keep `apiKeyInput` as `""` regardless of `settings.openRouterApiKey`.
6. Initialize `selectedDefaultModelId` to `settings.defaultModel.id` only if that id appears in the enabled model list; otherwise initialize to `null`.
7. Set `isLoading = false` in `finally`.

Save behavior:

1. Set `isSaving = true`, clear stale `error` and `successMessage`.
2. Build `AppSettingsUpdateForm` with `defaultModelId: selectedDefaultModelId` always present.
3. If `apiKeyInput.trim() !== ""`, include `openRouterApiKey: apiKeyInput.trim()`.
4. If `apiKeyInput.trim() === ""`, omit `openRouterApiKey` so the backend preserves the existing key.
5. Call `updateAppSettings(form)`.
6. Store returned settings, recompute `hasConfiguredApiKey`, and clear `apiKeyInput` back to `""`.
7. Keep or update `selectedDefaultModelId` from the returned `defaultModel` if it is enabled; otherwise set `null`.
8. Set a success message such as `App settings saved.`.
9. On failure, set a user-facing error message and keep the admin's typed input for retry.
10. Set `isSaving = false` in `finally`.

Depth:

- Small interface: one hook with state plus a handful of event handlers.
- Substantial implementation hidden behind it: two backend reads, enabled-model filtering, masked-key safety, backend PATCH null semantics, save lifecycle, and error/success lifecycle.
- Deletion test: deleting the hook would scatter masked-key and default-model payload rules across the page and form component.

---

#### 4. `src/features/app-settings/components/AppSettingsForm.tsx`

**Purpose:** Render the App Settings UI as a controlled form. It receives hook state and callbacks from the page; it does not call the API directly.

**Changes:** New file at `project/srcs/frontend/src/features/app-settings/components/AppSettingsForm.tsx`.

UI requirements:

- Use a page-level layout consistent with existing pages: `flex flex-col gap-6` root.
- Use cards/sections for `OpenRouter API Key`, `Default Model`, and `Last Updated` metadata.
- OpenRouter API key section:
  - Show status text: `Configured` when `hasConfiguredApiKey` is true, otherwise `Not configured`.
  - Render an empty password input controlled by `apiKeyInput`, hardened against browser and password-manager autofill:
    ```tsx
    <Input
      id="open-router-api-key"
      name="openRouterApiKey"
      type="password"
      autoComplete="new-password"
      value={apiKeyInput}
      onChange={(event) => setApiKeyInput(event.target.value)}
    />
    ```
    - `autoComplete="new-password"` is the primary value because password managers in Chromium/Edge are documented to honor it more reliably than `"off"` on `type="password"` fields. If implementation testing on the target browsers shows `"new-password"` is ignored, fall back to `autoComplete="off"`.
    - `name="openRouterApiKey"` is a domain-specific field name; do not use `name="password"`, because browser autofill heuristics also key off the `name` attribute.
    - `id="open-router-api-key"` is the stable label target; do not use `id="password"`.
  - Use placeholder/helper text: `Leave blank to keep the current key.` when configured, or `Enter your OpenRouter API key.` when not configured.
  - Do not render `settings.openRouterApiKey` inside the input.
- Default model section:
  - Use Base UI-backed shadcn `Select<number | null>`.
  - Include `No default model` with value `null`.
  - Include only `enabledModels` options with numeric `id` values.
  - Disable the select when `enabledModels.length === 0` or while loading/saving.
  - Show helper text when no enabled models exist: `Add and enable an LLM model before selecting a default.`
- Metadata section:
  - Render `updatedAt` when available, otherwise `Never updated`.
  - Render `updatedByUsername` when available, otherwise `No admin recorded`.
- Save action:
  - Save button calls `void save()`.
  - Disabled while loading or saving.
  - Shows `Saving...` while `isSaving` is true.
- Error/success:
  - Render existing `ErrorMessage` or a compact destructive alert for `error`.
  - Render a success message when `successMessage` is non-null.

Base UI Select note:

- Context7 Base UI docs confirm `Select.Root` can be generic over `Value`, and the existing local wrapper is `const Select = SelectPrimitive.Root`.
- Use typed item values (`number` and `null`) rather than string coercion.
- If TypeScript reports `number | null` in the page-size-style callback, guard null explicitly where needed; do not use `parseInt` for model IDs.

---

#### 5. `src/features/app-settings/index.ts`

**Purpose:** Public API surface for the App Settings feature.

**Changes:** New file at `project/srcs/frontend/src/features/app-settings/index.ts`.

Export:

```typescript
export { AppSettingsForm } from "./components/AppSettingsForm"
export { useAppSettings } from "./hooks/useAppSettings"
export type {
  AppSettingsDTO,
  AppSettingsUpdateForm,
  LlmModelDTO,
  LlmModelMiniDTO,
} from "./types"
```

Rule: `AppSettingsPage` imports from this index. Other features must not deep-import from `features/app-settings/services` or `features/app-settings/hooks`.

---

#### 6. `src/pages/AppSettingsPage.tsx`

**Purpose:** Thin route target that composes the hook and form component.

**Changes:** New file at `project/srcs/frontend/src/pages/AppSettingsPage.tsx`.

Structure:

```tsx
export function AppSettingsPage() {
  const appSettings = useAppSettings()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">App Settings</h1>
        <p className="text-muted-foreground">
          Configure OpenRouter access and platform defaults.
        </p>
      </div>

      <AppSettingsForm {...appSettings} />
    </div>
  )
}
```

The page owns no API calls, transformations, masked-key handling, or PATCH payload rules.

---

#### 7. `src/router.tsx`

**Purpose:** Add `/app-settings` to the existing admin-only route group.

**Changes:** Modify `project/srcs/frontend/src/router.tsx`.

Add:

```tsx
import { AppSettingsPage } from "@/pages/AppSettingsPage"
```

Inside the existing admin-only group:

```tsx
<Route path="/app-settings" element={<AppSettingsPage />} />
```

React Router docs checked through Context7 for v6.30.3 confirm nested routes render through the parent route element's `<Outlet />`; this matches the existing `MainLayout` route pattern.

---

#### 8. `src/layouts/Sidebar.tsx`

**Purpose:** Add visible navigation for Admin users only.

**Changes:** Modify `project/srcs/frontend/src/layouts/Sidebar.tsx`.

- Add a settings icon import from `lucide-react`, for example `Settings`.
- Add menu item after `Employees`:

```typescript
{
  title: "App Settings",
  url: "/app-settings",
  icon: Settings,
  roles: [UserRole.ADMIN],
}
```

The existing `visibleMenuItems = menuItems.filter((item) => hasAnyRole(item.roles))` handles visibility.

---

#### 9. `src/layouts/Header.tsx`

**Purpose:** Show the correct header title on the settings page.

**Changes:** Modify `project/srcs/frontend/src/layouts/Header.tsx`.

Add to `getPageTitle()`:

```typescript
case "/app-settings":
  return "App Settings"
```

---

## Implementation Steps

### Phase 1: Feature Types and Service (TDD)

- [x] **Step 1.1:** Create `src/features/app-settings/types.ts` with `AppSettingsDTO`, `AppSettingsUpdateForm`, `LlmModelDTO`, and `LlmModelMiniDTO`.
- [x] **Step 1.2 TDD:** Create `src/features/app-settings/services/appSettingsService.test.ts` with behavior tests for `getAppSettings()`, `updateAppSettings(form)`, and `listLlmModels()` using `axios-mock-adapter` against the shared `api` instance.
- [x] **Step 1.3:** Create `src/features/app-settings/services/appSettingsService.ts` and make the service tests pass.

### Phase 2: App Settings Hook (TDD)

- [x] **Step 2.1 TDD:** Create `src/features/app-settings/hooks/useAppSettings.test.ts` with behavior tests for initial load, enabled-model filtering, deterministic ordering of the enabled model list, empty API key input despite configured key, no-enabled-model state, save payload with blank key and preserved default model, save payload with new key, clear-default save payload, load error, and save error. The ordering test must seed the models fixture in an order that is not the expected sort order (for example insertion order `["Claude Sonnet", "GPT-4o", "Gemini Pro"]`) and assert that the returned `enabledModels` is sorted by `name.localeCompare` with `modelId.localeCompare` as the tie-breaker, and that disabled models are excluded.

- [x] **Step 2.2:** Create `src/features/app-settings/hooks/useAppSettings.ts` and make the hook tests pass.

- [x] **Step 2.3:** Ensure the hook clears `apiKeyInput` after successful save and does not place `settings.openRouterApiKey` into editable state.

### Phase 3: Form Component and Public Feature API

- [x] **Step 3.1:** Create `src/features/app-settings/components/AppSettingsForm.tsx` with the password API key input, configured/not-configured status, default model select, metadata, save button, and error/success rendering.
- [x] **Step 3.2 TDD:** Add a focused component test for the API key field behavior asserting three things on the rendered `<input>` element: (1) `type === "password"`, (2) `name === "openRouterApiKey"`, and (3) when `hasConfiguredApiKey` is true and the masked backend value exists in `settings.openRouterApiKey`, the rendered input's `value` is `""`. Also assert that the rendered input carries an autofill-suppressing `autoComplete` attribute (either `"new-password"` or `"off"`).
- [x] **Step 3.3:** Create `src/features/app-settings/index.ts` exporting the hook, form, and public types.
- [x] **Step 3.4:** Run `npm run typecheck` to verify Base UI typed select values (`number | null`) compile without string coercion.

### Phase 4: Page, Router, Sidebar, and Header Wiring

- [x] **Step 4.1:** Create `src/pages/AppSettingsPage.tsx` as a thin assembler over `useAppSettings()` and `AppSettingsForm`.
- [x] **Step 4.2:** Update `src/router.tsx` to import `AppSettingsPage` and add `/app-settings` inside the admin-only route group.
- [x] **Step 4.3:** Update `src/layouts/Sidebar.tsx` to add the `App Settings` menu item with `roles: [UserRole.ADMIN]`.
- [x] **Step 4.4:** Update `src/layouts/Header.tsx` to return `App Settings` for `/app-settings`.

### Phase 5: Regression and Manual Validation Notes

- [x] **Step 5.1:** Run `npm run typecheck` from `project/srcs/frontend/` and confirm zero TypeScript errors.
- [x] **Step 5.2:** Run `npm run test` from `project/srcs/frontend/` and confirm all frontend tests pass.
- [x] **Step 5.3:** Run `npm run build` from `project/srcs/frontend/` and confirm the Vite build succeeds.
- [x] **Step 5.4:** Document manual browser checks in the task: admin sidebar visibility, employee redirect, initial no-model disabled selector, key status display, blank key preserves current key, typed key saves and clears input, model selection saves, `No default model` clears, and metadata updates after save.

---

## Potential Issues / Risks

- `PATCH /app-settings` clears `defaultModel` when `defaultModelId` is omitted. The hook's TypeScript form type must make `defaultModelId` required as `number | null`; do not make it optional.
- Do not set `apiKeyInput` from `settings.openRouterApiKey`. That value is masked and must be display-status only.
- Do not give the API key input `name="password"` or `id="password"`. The autofill-suppression guidance in the OpenRouter API key section requires `name="openRouterApiKey"` and `id="open-router-api-key"`.
- Do not render a reveal/show-password toggle for the API key. The user explicitly requested that the key not be shown in the UI.
- Do not add backend changes for empty model catalogs. The frontend disables the default model select and explains the missing prerequisite.
- Do not add a model management page inside this feature. Model CRUD is separate and can be planned later.
- If the backend returns a disabled `defaultModel`, do not include it as a selectable option. Display a warning/status and save `defaultModelId: null` unless an enabled model is chosen.
- `GET /llm-model` returns disabled models too. The hook must filter with `model.isEnabled === true`, not truthiness over nullable values.
- Do not assume `GET /llm-model` returns models in a stable order. The hook must sort the enabled model list after filtering (by `name.localeCompare` with `modelId.localeCompare` as tie-breaker) and must use a non-mutating spread before sorting so the service-returned array stays immutable.
- The local DTO uses `isEnabled`, matching Java/Lombok JSON for the existing backend DTOs. If runtime API inspection shows the property serialized as `enabled`, update the type and mapper in the frontend task before implementing the selector.
- `Header.tsx` currently uses semicolons while most frontend files omit them. Keep changes minimal and follow local file style when editing that file.
- `Sidebar.tsx` defines `menuItems` inside the component. Adding one item there is acceptable; do not extract a route registry until multiple navigation surfaces need the same data.

---

## Testing Decisions

Good tests for this feature verify behavior through public interfaces and user-observable outcomes. They should not assert private helper names or internal state structure beyond the hook's public return value.

Modules with TDD:

| Module | Test file | What is tested |
|--------|-----------|----------------|
| `appSettingsService` | `src/features/app-settings/services/appSettingsService.test.ts` | Correct HTTP method/path/body for `GET /app-settings`, `PATCH /app-settings`, `GET /llm-model`; returned `response.data` is passed through |
| `useAppSettings` | `src/features/app-settings/hooks/useAppSettings.test.ts` | Initial load, enabled-model filtering, deterministic ordering of enabled models by name (with modelId tie-breaker) using unordered fixtures, empty API key input when configured, disabled default selector state when no enabled models exist, save payload preserves current model, save payload omits blank key, save payload includes typed key, clear default sends `null`, load/save error lifecycle |
| `AppSettingsForm` | `src/features/app-settings/components/AppSettingsForm.test.tsx` | Password input is rendered with `type="password"` and `name="openRouterApiKey"`; input carries an autofill-suppressing `autoComplete` attribute; configured masked key is not placed in the input value; no-enabled-model message appears when `enabledModels` is empty |

Modules without dedicated tests:

- `types.ts` - type-only definitions; verified by typecheck.
- `index.ts` - re-export surface; verified by typecheck.
- `AppSettingsPage.tsx` - thin composition over tested hook/form; verified by typecheck/build.
- `router.tsx`, `Sidebar.tsx`, `Header.tsx` - wiring changes; verified by typecheck/build and manual browser checks.

Prior art:

- `src/features/employees/services/employeeService.test.ts` - axios-mock-adapter service test pattern.
- `src/features/employees/hooks/useEmployeeList.test.ts` - hook test pattern with mocked feature service.
- `src/features/authentication/hooks/useLoginForm.test.ts` - hook event testing with `renderHook` and `act`.
- `src/routes/RoleGuard.test.tsx` - role-guard behavior and localStorage cleanup pattern.
- `src/components/common/RoleGate.test.tsx` - role-based visibility test pattern.

External documentation checked:

- React Router v6.30.3 nested routes and `<Outlet />`: https://reactrouter.com/6.30.3/components/outlet
- Base UI Select typed generic values: https://base-ui.com/react/components/select.md

---

## Task Breakdown

### Task 1: App Settings Types and Service

- **Steps Covered:** Step 1.1, Step 1.2, Step 1.3
- **Reason for Grouping:** Types and service calls form the API contract foundation. Service behavior is independently testable and required before hook work starts.
- **Planned Task File:** `Admin-App-Settings-Page-task-1-types-and-service.md`
- **Task Document Link:** [[Admin-App-Settings-Page-task-1-types-and-service]]

### Task 2: App Settings Hook

- **Steps Covered:** Step 2.1, Step 2.2, Step 2.3
- **Reason for Grouping:** The hook is the feature's deep module. It concentrates masked-key safety, enabled-model filtering, backend PATCH semantics, and save/load lifecycle behind one interface.
- **Planned Task File:** `Admin-App-Settings-Page-task-2-use-app-settings-hook.md`
- **Task Document Link:** [[Admin-App-Settings-Page-task-2-use-app-settings-hook]]

### Task 3: App Settings Form and Feature API

- **Steps Covered:** Step 3.1, Step 3.2, Step 3.3, Step 3.4
- **Reason for Grouping:** The form depends on the hook interface and types. The API key password behavior is user-visible and security-sensitive, so it gets focused component coverage.
- **Planned Task File:** `Admin-App-Settings-Page-task-3-form-and-feature-api.md`
- **Task Document Link:** [[Admin-App-Settings-Page-task-3-form-and-feature-api]]

### Task 4: Page and Admin Navigation Wiring

- **Steps Covered:** Step 4.1, Step 4.2, Step 4.3, Step 4.4
- **Reason for Grouping:** These are structural wiring edits that should be executed and validated together after the feature module exists.
- **Planned Task File:** `Admin-App-Settings-Page-task-4-page-and-wiring.md`
- **Task Document Link:** [[Admin-App-Settings-Page-task-4-page-and-wiring]]

### Task 5: Regression and Manual Validation Checklist

- **Steps Covered:** Step 5.1, Step 5.2, Step 5.3, Step 5.4
- **Reason for Grouping:** Final validation must happen after all production and test code is in place.
- **Planned Task File:** `Admin-App-Settings-Page-task-5-regression-and-validation.md`
- **Task Document Link:** [[Admin-App-Settings-Page-task-5-regression-and-validation]]
