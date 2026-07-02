# Task: Service and Types Extension with Tests

#task #current #medium-complexity #parent-admin-llm-model-catalog-page

**Parent:** [[Admin-LLM-Model-Catalog-Page]]
**Parent Type:** Feature
**Related Step(s):** Phase 2 — Steps 2.1, 2.2, 2.3
**Estimated Complexity:** Medium

---

## Goal

Extend the existing frontend App Settings service boundary with the LLM model catalog create/toggle contracts and add the OpenRouter catalog form/types that later hooks and UI components will consume. This task is a focused TDD pass over `features/app-settings/types.ts` and `appSettingsService.ts`: no React UI, no hook behavior, and no backend changes.

---

## Parent Context

The parent feature, [[Admin-LLM-Model-Catalog-Page]], extends the already-delivered `/app-settings` admin page into a three-tab page:

1. **General Settings** — existing OpenRouter API key/default model workflow.
2. **System Models** — admin-curated LLM models persisted by the backend.
3. **Add Models** — local OpenRouter catalog browser backed by `public/models.json`.

Task 2 is the API-contract foundation for the later tabs:

- Step 2.1 adds frontend types for creating system models (`LlmModelForm`) and reading the static OpenRouter catalog (`OpenRouterModel`).
- Step 2.2 adds service functions for the existing backend endpoints: `POST /llm-model` and `PATCH /llm-model/{id}/toggle`.
- Step 2.3 adds unit tests at the service boundary using `axios-mock-adapter`.

The parent feature explicitly states that the existing backend endpoints are sufficient and that no new backend endpoint is in scope. This task must therefore consume the existing `api` Axios singleton and must not introduce a direct OpenRouter browser call, a new provider abstraction, a new route, or any UI components.

**Current progress:** Task 1 (`[[Admin-LLM-Model-Catalog-Page-task-1-static-catalog-setup]]`) has been implemented. Code-level prerequisites are present: `project/srcs/frontend/public/models.json` exists and `project/srcs/frontend/src/components/ui/tabs.tsx` exists with `TabsContent` forwarding `{...props}` to Base UI `Tabs.Panel`. Task 1's documentation remains in `Tasks/current/`, but its source-level work is complete and this task can proceed.

---

## Preconditions / Dependencies

- `project/srcs/frontend/` exists and currently has **112/112** frontend tests passing before this task.
- `project/srcs/frontend/src/features/app-settings/types.ts` already defines `AppSettingsDTO`, `AppSettingsUpdateForm`, `LlmModelDTO`, and `LlmModelMiniDTO`.
- `project/srcs/frontend/src/features/app-settings/services/appSettingsService.ts` already defines `getAppSettings()`, `updateAppSettings()`, and `listLlmModels()` using the shared `api` instance from `@/lib/api`.
- `project/srcs/frontend/src/features/app-settings/services/appSettingsService.test.ts` already uses `axios-mock-adapter` against the shared `api` instance and should be extended in the same style.
- `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.test.ts` mocks all named exports from `appSettingsService`; the mock factory must stay synchronized when new named exports are added.
- Backend API contracts already exist and are documented in [[Docs/API-Reference/LlmModels]]:
  - `POST /llm-model` accepts `LlmModelForm` and returns `LlmModelMiniDTO`.
  - `PATCH /llm-model/{id}/toggle` has **no request body** and returns `LlmModelDTO`.
- The CORS `PATCH` fix is already resolved in the codebase. Do not modify backend CORS in this task.
- `project/srcs/frontend/src/lib/api.ts` uses `baseURL: "/api"`; service functions must use backend-relative paths like `"/llm-model"`, never `"/api/llm-model"`.
- `tsconfig.app.json` has `strict`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, and `erasableSyntaxOnly` enabled; use `import type` for type-only imports and avoid unused values.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `memory-bank` — Selected — loaded current AgentForge architecture, frontend conventions, active feature status, and known testing/build constraints.
- `documentation-management` — Selected — confirmed the documentation system, Task location, Task template, and Obsidian conventions.
- `solid-deep-design` — Selected — used to keep the service boundary small and stable while avoiding misplaced business logic in the service layer.
- `find-docs` — Selected — queried version-matched documentation for Axios, axios-mock-adapter, and Vitest promise rejection assertions.
- `tdd` — Selected — this task is explicitly a service-boundary TDD pass; tests are written before implementation and verify public behavior only.
- `glossary-management` — Selected — searched glossary terms for LLM Model, System Model, OpenRouter Model, and App Settings. The glossary CLI currently has no indexed terms for these names, so the task uses the vocabulary established by the parent feature and ADRs.
- `doc-exploration` — Selected — checked the ADR inventory and related Feature/Bug/API documentation.

### Documentation Reviewed

- **Context7 `/axios/axios` (Axios 1.x; project resolves `axios@1.18.0`)** — confirmed typed request methods such as `api.post<T>()` / `api.patch<T>()` return a response whose `data` carries the generic type, and Axios 1.x rejects promises for non-2xx responses unless handled by a caller.
- **Context7 `/ctimmerm/axios-mock-adapter` (`axios-mock-adapter@2.1.0`)** — confirmed request history access via `mock.history.<method>`, `mock.restore()` for teardown, and handler reset/history behavior.
- **Context7 `/vitest-dev/vitest/v4.1.6` (closest indexed docs; project resolves `vitest@4.1.9`)** — confirmed `await expect(promise).rejects...` must be awaited when asserting promise rejection. The API is stable across this patch-level difference.
- **[[Docs/API-Reference/LlmModels]]** — source of `LlmModelForm`, `LlmModelDTO`, `LlmModelMiniDTO`, `POST /llm-model`, and `PATCH /llm-model/{id}/toggle` contracts. Note: its CORS note is stale; parent feature and codebase confirm PATCH CORS is already fixed.
- **[[Features/done/Admin-App-Settings-Page]]** — source of the existing `features/app-settings/` module and its service/test conventions.
- **[[Features/done/Llm-Model-Entity-and-Admin-Crud]]** — confirms backend intent: models are admin-curated, inserted enabled by default, toggled instead of deleted, and identified by numeric database `id` plus OpenRouter string `modelId`.
- **[[Bugs/done/Review-Admin-LLM-Model-Catalog-Page]]** — review decisions that shaped this feature, especially the single source of truth for `GET /llm-model` in later tasks and the explicit `OpenRouterModel.id` → `LlmModelForm.modelId` mapping.
- **[[Bugs/done/Post-Implementation-Review-of-Llm-Model-Entity-and-Admin-Crud]]** — confirms the browser `PATCH` CORS issue has already been resolved.
- **ADR inventory checked:** 10 ADRs from `documentation/ADRs/ADR-index.md` were checked. Relevant ADRs for this task:
  - [[ADRs/ADR-001-single-llm-provider-openrouter|ADR-001]] — model IDs are OpenRouter identifiers; do not introduce other providers.
  - [[ADRs/ADR-002-openrouter-as-service-not-entity|ADR-002]] — OpenRouter is a backend service, not a frontend persistence entity; this task consumes local backend endpoints only.
  - [[ADRs/ADR-007-admin-curated-llm-model-list|ADR-007]] — admins curate the persisted model list; employees never browse the full OpenRouter catalog.
  - [[ADRs/ADR-009-long-primary-key-for-all-entities|ADR-009]] — backend entity IDs are `Long`; frontend IDs are represented as `number`, hence `toggleLlmModel(id: number)`.
  - [[ADRs/ADR-010-base-ui-over-radix-ui-for-frontend|ADR-010]] — relevant to Task 1/Task 5 UI primitives but imposes no code change in this service-only task.

### Related Existing Code

- `project/srcs/frontend/src/features/app-settings/types.ts:1-28` — current app-settings DTO contracts to extend.
- `project/srcs/frontend/src/features/app-settings/services/appSettingsService.ts:1-23` — current service functions and import style to extend.
- `project/srcs/frontend/src/features/app-settings/services/appSettingsService.test.ts:1-122` — current service test structure; extend this file rather than creating a new service test file.
- `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.test.ts:11-16` — service module mock factory that must stay synchronized with new service exports.
- `project/srcs/frontend/src/features/app-settings/index.ts:1-10` — feature barrel; currently exports app-settings types and should export the new type-only contracts, but **not** service functions.
- `project/srcs/frontend/src/lib/api.ts:12-34` — Axios singleton with `baseURL: "/api"`, JWT request interceptor, and 401 response interceptor.
- `project/srcs/frontend/src/features/employees/services/employeeService.test.ts:156-201` — prior no-body PATCH service tests for activate/deactivate behavior.
- `project/srcs/frontend/package-lock.json:3477-3490` — exact resolved `axios@1.18.0` and `axios-mock-adapter@2.1.0`.
- `project/srcs/frontend/package-lock.json:8463-8465` — exact resolved `vitest@4.1.9`.
- `project/srcs/frontend/tsconfig.app.json:14-25` — TypeScript settings that require type-only imports and catch unused code.

---

## Implementation Details

### Approach

This task treats `appSettingsService.ts` as a small HTTP adapter module. Its responsibility is deliberately narrow: hide HTTP method/path details and return `response.data` using typed Axios calls. It must not filter models, format error messages, interpret toggle state, parse `models.json`, or own UI behavior. Those responsibilities belong to later hooks/components (`useSystemModels`, `useAvailableModels`, `AddModelModal`, and `AppSettingsPage`).

The implementation order follows a TDD vertical slice:

1. Add missing types first so service test fixtures and service signatures can compile.
2. Add RED tests for `createLlmModel()` and `toggleLlmModel()` in the existing service test file.
3. Implement the two service functions minimally to make those tests pass.
4. Keep downstream service mocks and public type exports synchronized.
5. Run targeted tests, full tests, typecheck, and build.

**SOLID / Deep Module analysis:**

- `appSettingsService.ts` has one reason to change: the frontend's app-settings backend HTTP contract changes. It is intentionally a thin adapter, not a business-logic module.
- The service interface remains small and stable: named functions aligned with backend capabilities (`getAppSettings`, `updateAppSettings`, `listLlmModels`, `createLlmModel`, `toggleLlmModel`).
- Deletion test: deleting the service would scatter raw Axios paths, response extraction, and endpoint naming across hooks/components. Keeping it provides locality even though each function is a small adapter.
- Business depth stays in hooks. `useSystemModels` will later own toggle lifecycle, row-bound errors, refresh semantics, and single-in-flight rules; the service must not pre-empt those responsibilities.

### Files to Create/Modify

- [x] `project/srcs/frontend/src/features/app-settings/types.ts` — extend with `LlmModelForm` and `OpenRouterModel`.
- [x] `project/srcs/frontend/src/features/app-settings/services/appSettingsService.test.ts` — add RED tests for `createLlmModel()` and `toggleLlmModel()`, including non-2xx error propagation.
- [x] `project/srcs/frontend/src/features/app-settings/services/appSettingsService.ts` — add `createLlmModel()` and `toggleLlmModel()` using the shared `api` instance.
- [x] `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.test.ts` — keep the service mock factory synchronized with the new named exports; no hook behavior changes.
- [x] `project/srcs/frontend/src/features/app-settings/index.ts` — export the new type-only contracts from the feature barrel; do not export service functions.

---

## Step-by-Step Implementation

### Step 1: Add the Missing Type Contracts

**Goal:** Extend the existing app-settings type file with the create form shape and the static OpenRouter catalog entry shape.
**Dependencies:** Existing `LlmModelDTO` and `LlmModelMiniDTO` already exist.

- [x] Open `project/srcs/frontend/src/features/app-settings/types.ts`.
- [x] Add `LlmModelForm` near the existing LLM model DTOs.
- [x] Add `OpenRouterModel` with an explicit comment on `id` explaining that it maps to `LlmModelForm.modelId` when a catalog entry is added to the system.
- [x] Keep `description` optional on `LlmModelForm`; do not force callers to send `null`.
- [x] Allow nullable static catalog fields (`description`, `context_length`, `pricing`, `pricing.prompt`, `pricing.completion`) because Task 4 must later handle missing/zero pricing and missing context values.

**Why this step is critical:**
The service signatures and later Add Models flow need a shared language for the backend create form and the OpenRouter catalog snapshot. The `id` → `modelId` mapping is easy to get wrong without the inline comment, and the parent review explicitly called this out.

#### Implementation

```typescript
export interface LlmModelForm {
  modelId: string
  name: string
  description?: string
}

export interface OpenRouterModel {
  id: string // OpenRouter model identifier; maps to LlmModelForm.modelId when adding to the system.
  name: string
  description: string | null
  context_length: number | null
  pricing: {
    prompt: string | null
    completion: string | null
  } | null
}
```

#### Edge Cases

1. **Case:** A catalog model has `pricing: null` or `pricing.prompt: null`.
   **Handling:** The type permits this. Task 4's display formatter will render missing/zero pricing as `Free`.

2. **Case:** A developer tries to add `modelId` to `OpenRouterModel` instead of using `id`.
   **Handling:** Do not alias the field in this task. `models.json` uses `id`; transforming the data belongs in `useAvailableModels` only if a later task intentionally decides to normalize it. The inline comment is the guardrail.

3. **Case:** Backend validation rejects blank `modelId` or `name`.
   **Handling:** The type only describes shape, not runtime validation. UI validation/error handling belongs in `AddModelModal`; backend remains authoritative.

---

### Step 2: Add RED Service Tests for Create and Toggle

**Goal:** Extend `appSettingsService.test.ts` with behavior tests proving request shape, response mapping, and error propagation for the two new service functions.
**Dependencies:** Step 1 types are available.

- [x] Import `createLlmModel` and `toggleLlmModel` from `./appSettingsService` before implementation; this should fail RED until Step 3 adds them.
- [x] Import `LlmModelForm` and `LlmModelMiniDTO` as types.
- [x] Add module-level fixtures for a create form, create response, and toggle response.
- [x] Add a `describe("appSettingsService.createLlmModel", ...)` block following the existing per-describe `MockAdapter` setup/teardown style.
- [x] Test happy path: `POST /llm-model`, exact JSON body, returns `LlmModelMiniDTO` response data.
- [x] Test error propagation: a non-2xx `POST /llm-model` response rejects; use `409` or `500`, not `401`, to avoid the `api` singleton's unauthorized redirect side effect.
- [x] Add a `describe("appSettingsService.toggleLlmModel", ...)` block following the same setup/teardown style.
- [x] Test happy path: `PATCH /llm-model/{id}/toggle`, no request body, returns `LlmModelDTO` response data.
- [x] Test error propagation: a non-2xx `PATCH /llm-model/{id}/toggle` response rejects.

**Why this step is critical:**
The service layer is the first frontend boundary that touches the backend contract. Tests must prove the exact URL/method/body because later hooks will rely on these functions and should not repeat raw Axios details.

#### Implementation

```typescript
import {
  getAppSettings,
  updateAppSettings,
  listLlmModels,
  createLlmModel,
  toggleLlmModel,
} from "./appSettingsService"
import type {
  AppSettingsDTO,
  AppSettingsUpdateForm,
  LlmModelDTO,
  LlmModelForm,
  LlmModelMiniDTO,
} from "../types"

const mockCreateForm: LlmModelForm = {
  modelId: "anthropic/claude-sonnet-4-6",
  name: "Claude Sonnet 4.6",
  description: "Anthropic's balanced model.",
}

const mockCreatedModel: LlmModelMiniDTO = {
  id: 5,
  modelId: "anthropic/claude-sonnet-4-6",
  name: "Claude Sonnet 4.6",
  isEnabled: true,
}

const mockToggledModel: LlmModelDTO = {
  id: 5,
  modelId: "anthropic/claude-sonnet-4-6",
  name: "Claude Sonnet 4.6",
  description: "Anthropic's balanced model.",
  isEnabled: false,
  createdAt: "2026-06-28T12:00:00",
}

describe("appSettingsService.createLlmModel", () => {
  let mock: InstanceType<typeof MockAdapter>

  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => {
    mock.restore()
  })

  it("sends POST /llm-model with the form body and returns response.data", async () => {
    mock.onPost("/llm-model").reply(200, mockCreatedModel)

    const result = await createLlmModel(mockCreateForm)

    expect(mock.history.post).toHaveLength(1)
    expect(mock.history.post[0].url).toBe("/llm-model")
    const body = JSON.parse(mock.history.post[0].data as string)
    expect(body).toEqual(mockCreateForm)
    expect(result).toEqual(mockCreatedModel)
  })

  it("propagates create errors to the caller", async () => {
    mock.onPost("/llm-model").reply(409, { message: "Model already exists" })

    await expect(createLlmModel(mockCreateForm)).rejects.toThrow()
  })
})

describe("appSettingsService.toggleLlmModel", () => {
  let mock: InstanceType<typeof MockAdapter>

  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => {
    mock.restore()
  })

  it("sends PATCH /llm-model/{id}/toggle with no body and returns response.data", async () => {
    const id = 5
    mock.onPatch(`/llm-model/${id}/toggle`).reply(200, mockToggledModel)

    const result = await toggleLlmModel(id)

    expect(mock.history.patch).toHaveLength(1)
    expect(mock.history.patch[0].url).toBe(`/llm-model/${id}/toggle`)
    expect(mock.history.patch[0].data).toBeUndefined()
    expect(result).toEqual(mockToggledModel)
  })

  it("propagates toggle errors to the caller", async () => {
    const id = 5
    mock.onPatch(`/llm-model/${id}/toggle`).reply(500, { message: "Toggle failed" })

    await expect(toggleLlmModel(id)).rejects.toThrow()
  })
})
```

Run the targeted test after adding these tests and before implementation to confirm RED:

```bash
npm --prefix project/srcs/frontend run test -- --run src/features/app-settings/services/appSettingsService.test.ts
```

Expected RED: TypeScript/Vitest fails because `createLlmModel` and `toggleLlmModel` are not exported yet. If the tests pass before Step 3, verify you did not accidentally implement the service first.

#### Edge Cases

1. **Case:** Error propagation tests use `401`.
   **Handling:** Avoid `401` here. `src/lib/api.ts` has a response interceptor that calls `onUnauthorizedCb()` for non-login 401s, which can redirect or mutate global browser state. Use `409` for create duplicate and `500` for toggle failure.

2. **Case:** `mock.history.patch[0].data` is not `undefined`.
   **Handling:** This likely means `toggleLlmModel` sent an empty object or target state. The API docs specify no request body. Fix the implementation to call `api.patch<LlmModelDTO>(url)` with no second argument.

3. **Case:** Axios error message text differs by runtime.
   **Handling:** Use `.rejects.toThrow()` rather than asserting the exact message unless the implementation needs exact message text. The service's contract is propagation, not formatting.

---

### Step 3: Implement the Service Functions

**Goal:** Add minimal typed Axios calls to `appSettingsService.ts` so the RED tests pass.
**Dependencies:** Step 2 tests are failing for missing exports.

- [x] Add `LlmModelForm` and `LlmModelMiniDTO` to the existing type-only import list.
- [x] Implement `createLlmModel(form)` with `api.post<LlmModelMiniDTO>("/llm-model", form)`.
<!-- REVIEW-FIX: Use double-backtick inline code so the template-literal backticks render correctly in Markdown. -->
- [x] Implement `toggleLlmModel(id)` with ``api.patch<LlmModelDTO>(`/llm-model/${id}/toggle`)`` and no body.
- [x] Return `response.data` exactly as existing service functions do.
- [x] Do not catch errors. Hooks/components own user-facing error extraction.
- [x] Do not add `/api` to URLs. The shared `api` instance already has `baseURL: "/api"`.

**Why this step is critical:**
Later hooks (`useSystemModels`) and components (`AddModelModal`) must depend on a stable service boundary rather than calling Axios directly. This keeps endpoint paths and response extraction local to one module.

#### Implementation

```typescript
import api from "@/lib/api"
import type {
  AppSettingsDTO,
  AppSettingsUpdateForm,
  LlmModelDTO,
  LlmModelForm,
  LlmModelMiniDTO,
} from "../types"

export async function getAppSettings(): Promise<AppSettingsDTO> {
  const response = await api.get<AppSettingsDTO>("/app-settings")
  return response.data
}

export async function updateAppSettings(
  form: AppSettingsUpdateForm
): Promise<AppSettingsDTO> {
  const response = await api.patch<AppSettingsDTO>("/app-settings", form)
  return response.data
}

export async function listLlmModels(): Promise<LlmModelDTO[]> {
  const response = await api.get<LlmModelDTO[]>("/llm-model")
  return response.data
}

export async function createLlmModel(
  form: LlmModelForm
): Promise<LlmModelMiniDTO> {
  const response = await api.post<LlmModelMiniDTO>("/llm-model", form)
  return response.data
}

export async function toggleLlmModel(id: number): Promise<LlmModelDTO> {
  const response = await api.patch<LlmModelDTO>(`/llm-model/${id}/toggle`)
  return response.data
}
```

Run the targeted service tests again and confirm GREEN:

```bash
npm --prefix project/srcs/frontend run test -- --run src/features/app-settings/services/appSettingsService.test.ts
```

Expected GREEN: existing 3 service tests + 4 new service tests pass.

#### Edge Cases

1. **Case:** `createLlmModel` returns `LlmModelDTO` instead of `LlmModelMiniDTO`.
   **Handling:** Correct the return type. `POST /llm-model` returns the backend mini DTO per API reference and backend feature document.

2. **Case:** `toggleLlmModel` accepts a string ID.
   **Handling:** Keep the signature `id: number`. Backend primary keys are `Long`; frontend represents them as `number` consistently across existing DTOs.

3. **Case:** Service catches and normalizes errors.
   **Handling:** Remove the catch. Error-message extraction belongs in hooks (`useSystemModels`, `AddModelModal`), not in the service adapter.

---

### Step 4: Keep Test Mocks and Type Barrel Synchronized

**Goal:** Prevent stale mock factories and keep the app-settings feature's public type surface consistent with existing conventions.
**Dependencies:** Step 3 added named service exports and Step 1 added new types.

- [x] Update `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.test.ts` mock factory to include `createLlmModel` and `toggleLlmModel` as `vi.fn()` exports.
- [x] Update the nearby comment from "all 3 named exports" to wording that remains accurate after new exports are added.
- [x] Do not import or create `mockCreateLlmModel` / `mockToggleLlmModel` in this test file; they are not used by `useAppSettings` and would violate `noUnusedLocals`.
- [x] Update `project/srcs/frontend/src/features/app-settings/index.ts` type export block to include `LlmModelForm` and `OpenRouterModel`.
- [x] Do not export service functions from the feature barrel. Existing convention keeps service functions internal to hooks/components; pages import the hook/form/component surface, not raw services.

**Why this step is critical:**
Vitest mock factories can become misleading when a module grows. Keeping the mock complete avoids accidental real HTTP leaks in future app-settings hook tests, and updating the type barrel lets later tasks import shared type contracts without deep-importing `./types` from outside the feature.

#### Implementation

```typescript
// useAppSettings.test.ts
// REVIEW-FIX: Clarified why the mock includes exports not used by this specific test file.
// Mock the complete appSettingsService surface to prevent HTTP leaks as exports grow.
vi.mock("../services/appSettingsService", () => ({
  getAppSettings: vi.fn(),
  updateAppSettings: vi.fn(),
  listLlmModels: vi.fn(),
  createLlmModel: vi.fn(),
  toggleLlmModel: vi.fn(),
}))
```

```typescript
// index.ts
export type {
  AppSettingsDTO,
  AppSettingsUpdateForm,
  LlmModelDTO,
  LlmModelForm,
  LlmModelMiniDTO,
  OpenRouterModel,
} from "./types"
```

Run the existing hook test file because its mock factory changed:

```bash
npm --prefix project/srcs/frontend run test -- --run src/features/app-settings/hooks/useAppSettings.test.ts
```

#### Edge Cases

1. **Case:** Adding unused `vi.mocked(createLlmModel)` variables causes typecheck failures.
   **Handling:** Do not create those variables in this file. The factory can expose unused mock exports without local variables.

2. **Case:** A future test needs to mock the new functions.
   **Handling:** That future test can import the functions and create `vi.mocked(...)` aliases in its own file. This task only keeps the existing hook test mock complete.

3. **Case:** Barrel-exporting service functions seems convenient.
   **Handling:** Do not do it. Pages and other features should not call raw service functions; hooks/components remain the feature boundary.

---

### Step 5: Run Validation and Record Implementation Close-Out

**Goal:** Verify the service extension is correct and leave documentation ready for implementation close-out.
**Dependencies:** Steps 1-4 complete.

- [x] Run targeted service tests.
- [x] Run the existing `useAppSettings` hook test because its mock factory was edited.
- [x] Run the full frontend test suite.
- [x] Run TypeScript typecheck.
- [x] Run the frontend build.
- [ ] After implementation is complete, mark parent feature Steps 2.1, 2.2, and 2.3 as done and move this Task document to `Tasks/done/` only if the project's close-out workflow is being performed. The Task document link is already added to the parent during task creation.

**Why this step is critical:**
The code changes are small but foundational. A broken service signature will cascade into Tasks 3 and 4; validating both targeted and full-suite behavior catches regressions before dependent hooks are written.

#### Implementation

```bash
npm --prefix project/srcs/frontend run test -- --run src/features/app-settings/services/appSettingsService.test.ts
npm --prefix project/srcs/frontend run test -- --run src/features/app-settings/hooks/useAppSettings.test.ts
npm --prefix project/srcs/frontend run test -- --run
npm --prefix project/srcs/frontend run typecheck
npm --prefix project/srcs/frontend run build
```

Expected after GREEN: the service test file increases by 4 tests and the full frontend suite should increase from **112/112** to **116/116** if no other tests are added in the same implementation session.

#### Edge Cases

1. **Case:** Full build still reports a 500 KB chunk warning.
   **Handling:** This warning is pre-existing and unrelated to Task 2. Do not chase bundle warnings in this task unless the new code imports `models.json`, which it must not do.

2. **Case:** `npm run typecheck` fails in `useAppSettings.test.ts` after mock sync.
   **Handling:** Check for unused imports/variables first. The mock factory can list new function names without importing them.

3. **Case:** Service tests fail because `mock.history.patch[0].data` is `"{}"` or `null`.
   **Handling:** Confirm `toggleLlmModel` does not pass a body. The API contract says no request body.

---

## Design Decisions

**Decision 1: Keep service functions as thin HTTP adapters**
- **Why:** Hooks/components should not duplicate URL paths or response extraction, but the service layer should also not absorb UI state, filtering, or error-message responsibilities. This preserves SRP and keeps the boundary easy to test.
- **Alternatives considered:** Put toggle refresh logic or duplicate-error formatting in the service. Rejected because later hooks need to own lifecycle state and row-bound errors.

**Decision 2: Model OpenRouter catalog entries as the static file's shape, not a normalized internal shape**
- **Why:** `models.json` already uses `id`, `context_length`, and nested `pricing`. Mirroring the source shape keeps the fetch hook simple and prevents accidental assumptions that the static file already matches backend form naming.
- **Alternatives considered:** Normalize `id` to `modelId` when parsing. Rejected for this task because parsing/normalization belongs in `useAvailableModels` if needed; this task only defines contracts.

**Decision 3: Test service error propagation without formatting messages**
- **Why:** Axios already rejects non-2xx responses. The service boundary's responsibility is to propagate the rejection; hooks/modal submitters format user-facing messages from `err.response?.data?.message` later.
- **Alternatives considered:** Assert exact Axios error message text. Rejected because the text is not this module's contract and can vary; `.rejects.toThrow()` is enough to prove propagation.

**Decision 4: `toggleLlmModel` sends no request body**
- **Why:** The backend toggle endpoint flips current state server-side and the API reference explicitly says "No request body." Sending a desired target state would misrepresent the backend semantics and risk future race-condition assumptions.
- **Alternatives considered:** `api.patch(url, {})` or `api.patch(url, { isEnabled })`. Rejected because the contract is a no-body toggle.

**Decision 5: Export new types from the feature barrel, but not services**
- **Why:** Existing `features/app-settings/index.ts` exports public type contracts. Exporting `LlmModelForm` and `OpenRouterModel` keeps later component/test code from deep-importing type contracts outside the feature. Raw service functions remain internal because pages and other features should call hooks/components, not Axios adapters.
- **Alternatives considered:** Do not update `index.ts`. Rejected because it creates a minor future import inconsistency. Export service functions too. Rejected because it widens the public API surface and encourages bypassing hooks.

---

## Testing Considerations

### Automatic Validation

- [x] `npm --prefix project/srcs/frontend run test -- --run src/features/app-settings/services/appSettingsService.test.ts` — targeted service tests pass after the TDD GREEN step.
- [x] `npm --prefix project/srcs/frontend run test -- --run src/features/app-settings/hooks/useAppSettings.test.ts` — existing hook tests still pass after service mock factory sync.
- [x] `npm --prefix project/srcs/frontend run test -- --run` — full frontend suite passes. Expected count after this task: **116/116** if exactly 4 new service tests are added.
- [x] `npm --prefix project/srcs/frontend run typecheck` — TypeScript passes with `strict`, `noUnusedLocals`, and `verbatimModuleSyntax` constraints.
- [x] `npm --prefix project/srcs/frontend run build` — Vite build succeeds; no Task 2 code imports `public/models.json`.

### Manual Validation

No manual browser validation is required for this task. It adds type definitions, service functions, and unit tests only. Browser validation begins in later UI composition tasks.

---

## Related Code Explanations

- `project/srcs/frontend/src/features/app-settings/services/appSettingsService.ts` — central HTTP adapter for App Settings and LLM model catalog frontend calls.
- `project/srcs/frontend/src/features/app-settings/services/appSettingsService.test.ts` — service-boundary tests using `axios-mock-adapter` request history.
- `project/srcs/frontend/src/features/app-settings/types.ts` — frontend mirror of backend DTO/form contracts and static OpenRouter catalog entry shape.
- `project/srcs/frontend/src/lib/api.ts` — shared Axios singleton; service functions rely on its `/api` base URL and interceptors.
- `project/srcs/frontend/src/features/employees/services/employeeService.test.ts` — prior no-body PATCH service test pattern for activate/deactivate endpoints.
- [[Docs/API-Reference/LlmModels]] — authoritative backend API contract for this task.
- [[ADRs/ADR-007-admin-curated-llm-model-list]] — architectural reason for create/toggle behavior and disable-not-delete semantics.

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task.
- [x] Previous Task 1 document and code-level output reviewed; this task accounts for current state after Task 1.
- [x] Relevant skills reviewed and selected for this task.
- [x] Up-to-date documentation reviewed for Axios, axios-mock-adapter, and Vitest.
- [x] `LlmModelForm` added to `types.ts` with `description?: string`.
- [x] `OpenRouterModel` added to `types.ts` with nullable catalog fields and explicit `id` → `modelId` comment.
- [x] `createLlmModel()` added to `appSettingsService.ts` using `POST /llm-model` and returning `LlmModelMiniDTO`.
- [x] `toggleLlmModel()` added to `appSettingsService.ts` using no-body `PATCH /llm-model/{id}/toggle` and returning `LlmModelDTO`.
- [x] `appSettingsService.test.ts` includes happy-path request/response tests for both new functions.
- [x] `appSettingsService.test.ts` includes non-2xx error propagation tests for both new functions.
- [x] `useAppSettings.test.ts` service mock factory includes the new named service exports and has an accurate comment.
- [x] `index.ts` exports the new type-only contracts and does not export raw service functions.
- [x] Targeted service tests pass.
- [x] Existing `useAppSettings` hook tests pass.
- [x] Full frontend test suite passes.
- [x] Typecheck passes.
- [x] Build passes.
- [x] Manual validation section explicitly states that no browser validation is required for this service/type-only task.
- [ ] After implementation, parent feature Steps 2.1, 2.2, and 2.3 are marked complete as part of close-out.
