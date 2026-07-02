# Task: App Settings Types and Service

#task #current #medium-complexity #parent-admin-app-settings-page

**Parent:** [[Features/to-do/Admin-App-Settings-Page]]
**Parent Type:** Feature
**Related Step(s):** Phase 1 - Steps 1.1, 1.2, 1.3
**Estimated Complexity:** Medium

---

## Goal

Create the App Settings feature's TypeScript API contract mirror and implement the first service adapter module with TDD coverage. This task establishes the data-layer foundation needed by the future `useAppSettings` hook, form component, and `/app-settings` route.

---

## Parent Context

[[Features/to-do/Admin-App-Settings-Page]] is a frontend-only admin feature for `/app-settings`. It exposes the existing backend `AppSettings` contract without backend changes: admins can replace the OpenRouter API key and choose or clear the default LLM model from the local model catalog.

This task covers only Phase 1 of the parent feature:

| Parent Step | Scope in this task |
|-------------|--------------------|
| Step 1.1 | Create `src/features/app-settings/types.ts` with `AppSettingsDTO`, `AppSettingsUpdateForm`, `LlmModelDTO`, and `LlmModelMiniDTO` |
| Step 1.2 TDD | Create `src/features/app-settings/services/appSettingsService.test.ts` with behavior tests for `getAppSettings()`, `updateAppSettings(form)`, and `listLlmModels()` |
| Step 1.3 | Create `src/features/app-settings/services/appSettingsService.ts` and make the service tests pass |

The parent feature has security-sensitive constraints that begin at the type/service layer:

- `openRouterApiKey` in `AppSettingsDTO` is masked or null. It is never a raw key in frontend state or UI.
- `openRouterApiKey` in `AppSettingsUpdateForm` is optional so the hook can omit the key when the input is blank.
- `defaultModelId` in `AppSettingsUpdateForm` is required as `number | null` because the backend clears `defaultModel` when `defaultModelId` is null or omitted. Making it required forces every save path in later tasks to preserve or clear the default intentionally.
- `GET /llm-model` returns all local models, including disabled models, in no guaranteed order. This service must return the response unchanged; filtering, sorting, and disabled-model handling belong to Task 2's hook.

Task 1 is first in the parent task breakdown, so there are no previous Admin App Settings task documents or completed predecessor steps to depend on.

---

## Preconditions / Dependencies

- Documentation is initialized under `documentation/`; task documents live in `documentation/Tasks/current/`.
- Memory Bank files were read before task creation: [[Memory/brief]], [[Memory/product]], [[Memory/context]], [[Memory/architecture]], [[Memory/tech]], [[Memory/progress]], and [[Memory/known-issues]].
- Glossary CLI is available but currently has no indexed terms (`glossary categories` returned `[]`, `glossary list-all` returned `{}`). Use the parent feature's domain vocabulary directly: App Settings, OpenRouter API key, LLM Model, default model, Admin, Employee.
- `project/srcs/frontend/src/lib/api.ts` exists and exports the shared Axios singleton with `baseURL: "/api"`; feature services must call backend paths without the `/api` prefix.
- `project/srcs/frontend/src/features/app-settings/` does not exist yet; this task creates it.
- `axios-mock-adapter` is installed and already used in service tests.
- Current frontend baseline inferred from existing test files is 80 tests across 14 files. This task adds 3 service tests, so the expected post-task test count is 83 if no unrelated tests are added before execution.
- TypeScript config uses `verbatimModuleSyntax: true`, `erasableSyntaxOnly: true`, `strict: true`, `noUnusedLocals: true`, and `noUnusedParameters: true`; use `import type` for type-only imports and avoid `enum`.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` - Selected - verified documentation layout, task location, task template, parent update requirement, and Obsidian CLI availability.
- `memory-bank` - Selected - loaded all Memory Bank files for project architecture, active context, prior decisions, and current frontend conventions.
- `glossary-management` - Selected - ran glossary CLI; no indexed terms are currently available, so the task uses terminology from the parent feature, API docs, and Memory Bank.
- `doc-exploration` - Selected - checked all ADRs and related API, feature, and task documents before writing this task.
- `solid-deep-design` - Selected - used to evaluate module depth, service adapter boundaries, and where not to introduce premature seams.
- `find-docs` - Selected - queried version-matched or closest indexed docs for Axios, axios-mock-adapter, and Vitest.
- `tdd` - Selected - defines the RED -> GREEN workflow for the service test cycle.
- `task-reviewer` - Selected - this document must be reviewed and patched after initial creation.

### Documentation Reviewed

- [[Docs/API-Reference/AppSettings]] - Confirms `GET /app-settings`, `PATCH /app-settings`, response schema, `defaultModelId` semantics, and that `defaultModelId` references `LlmModel.id` rather than `modelId`. <!-- REVIEW-FIX: The API doc GET response example shows a raw key (`"sk-or-..."`) but `AppSettingsMapper.maskApiKey()` always masks server-side — the frontend receives `null`, `"****"`, or `"****last4"` only. The doc "Notes" section says "consider masking" on the frontend, but masking is already done by the backend. Do not use the API doc response example as the authoritative format for `openRouterApiKey`; use the `AppSettingsControllerTest` and `AppSettingsMapper` as ground truth. -->
- [[Docs/API-Reference/LlmModels]] - Confirms `GET /llm-model` returns a top-level `LlmModelDTO[]` with `id`, `modelId`, `name`, `description`, `isEnabled`, and `createdAt`.
- [[Features/done/App-Settings-Entity-and-Admin-Configuration]] - Confirms backend masking behavior, key preservation on blank/null key, default-model clear on null, and `updatedByUsername` metadata.
- [[Features/done/Llm-Model-Entity-and-Admin-Crud]] - Confirms local model catalog rules, `isEnabled` as the enablement field, and no hard delete for models.
- [[Features/done/Admin-Employee-Management-Page]] - Prior frontend feature pattern for feature-local types, service adapters, and axios-mock-adapter tests.
- [[Tasks/done/Admin-Employee-Management-Page-task-2-types-and-service]] - Primary task precedent for a frontend types-plus-service TDD slice.
- [[Tasks/done/Employee-Edit-and-Delete-Modals-task-2-types-and-service]] - Precedent for extending service modules with additional Axios methods and endpoint tests.
- [[Tasks/done/Create-Employee-Modal-task-1-types-and-service]] - Precedent for a low-surface service addition using existing Axios mock patterns.
- [[ADRs/ADR-001-single-llm-provider-openrouter]] - OpenRouter remains the sole provider for MVP; do not introduce provider selection.
- [[ADRs/ADR-002-openrouter-as-service-not-entity]] - OpenRouter API key belongs in `AppSettingsEntity`; the frontend configures App Settings, not a provider entity.
- [[ADRs/ADR-005-no-user-settings-entity]] - This is platform-level configuration, not per-user preferences.
- [[ADRs/ADR-007-admin-curated-llm-model-list]] - Default model choices must come from the admin-curated `LlmModel` list.
- [[ADRs/ADR-009-long-primary-key-for-all-entities]] - Backend IDs are Java `Long`; frontend mirrors them as TypeScript `number`.
- [[ADRs/ADR-010-base-ui-over-radix-ui-for-frontend]] - Relevant to later form work; Task 1 only creates data-layer code.
- Context7 `/axios/axios` - Axios 1.x TypeScript docs confirm `axios.get<T>()`, `axios.post<T>(url, data)`, and `axios.patch<T>(url, data)` type `response.data` through generic response types.
- Context7 `/ctimmerm/axios-mock-adapter` - README docs confirm `new AxiosMockAdapter(instance)`, `onGet`/`onPatch().reply(status, data)`, `mock.history.<method>` inspection, and `mock.restore()` teardown.
- Context7 `/vitest-dev/vitest/v4.1.6` - Closest indexed docs to installed Vitest 4.1.9; confirms `describe`, `it`, `expect`, `beforeEach`, and `afterEach` imports from `vitest` and TypeScript test support.

### Version Information Checked

| Tool | Project version | Source | Documentation used |
|------|-----------------|--------|--------------------|
| Axios | `1.18.0` | `package-lock.json` | Context7 `/axios/axios` v1.x docs |
| axios-mock-adapter | `2.1.0` | `package-lock.json` | Context7 `/ctimmerm/axios-mock-adapter` README |
| Vitest | `4.1.9` | `package-lock.json` | Context7 `/vitest-dev/vitest/v4.1.6` closest indexed 4.1.x docs |
| TypeScript | `5.9.3` | `package-lock.json`, `tsconfig.app.json` | Project config and existing code patterns |
| Vite | `7.3.5` resolved, `^7.3.1` declared | `package-lock.json`, `package.json` | Existing `@/` alias config in `vite.config.ts` and `vitest.config.ts` |

### Related Existing Code

- `project/srcs/frontend/src/lib/api.ts:1` - Axios singleton used by all frontend services; base URL is `/api`.
- `project/srcs/frontend/src/features/employees/services/employeeService.ts:1` - Existing single-resource service module pattern with standalone exported async functions.
- `project/srcs/frontend/src/features/employees/services/employeeService.test.ts:1` - Canonical `axios-mock-adapter` service test pattern.
- `project/srcs/frontend/src/features/authentication/services/authService.ts:1` - Existing service module that imports the shared `api` instance and returns `response.data`.
- `project/srcs/frontend/tsconfig.app.json:14` - `verbatimModuleSyntax: true`; type-only imports must use `import type`.
- `project/srcs/frontend/vitest.config.ts:4` - Vitest uses `jsdom` and resolves the `@` alias to `./src`.

---

## Implementation Details

### Approach

Create the App Settings feature's data layer in three vertical steps:

1. Create `types.ts` first so test and service code can import stable DTO/form contracts.
2. Write service tests before the implementation. The correct RED signal is a failed import or missing export for `./appSettingsService`.
3. Create the service implementation with the minimal Axios calls needed to satisfy the tests.

The service module is deliberately small and mechanical. It adapts frontend calls to backend endpoints and returns `response.data`. It does not interpret masked keys, filter enabled models, sort models, construct PATCH payloads, handle success/error messages, or decide whether to preserve/clear the default model. Those are hook responsibilities in Task 2.

### SOLID + Deep Module Design

**`types.ts`** is a vocabulary module. It has no implementation depth in the Ousterhout sense, but it centralizes the API contract for App Settings and LLM model DTOs. Deleting it would scatter duplicate DTO declarations across the service, hook, and component tests.

**`appSettingsService.ts`** is a deep-enough adapter module for this slice. Its interface is three public functions with simple signatures; its implementation hides endpoint paths, HTTP verbs, Axios generics, shared `api` usage, and `response.data` extraction. Deleting it would force those details into the hook and future components, reducing locality.

**No new port or injected HTTP client seam** is introduced. The existing `api` singleton is the project-level seam, and tests use `axios-mock-adapter` against that instance. Creating an additional `AppSettingsHttpClient` abstraction would be a single-adapter seam and therefore shallow.

**Error propagation** follows SRP. The service does not catch errors; Axios rejections propagate to the hook. Task 2 owns user-facing `error`, `successMessage`, loading, saving, retry, and preservation semantics.

### Files to Create/Modify

- [ ] `project/srcs/frontend/src/features/app-settings/types.ts` - New DTO/form type declarations for the App Settings feature.
- [ ] `project/srcs/frontend/src/features/app-settings/services/appSettingsService.test.ts` - New service behavior tests using `axios-mock-adapter`.
- [ ] `project/srcs/frontend/src/features/app-settings/services/appSettingsService.ts` - New service adapter functions for `GET /app-settings`, `PATCH /app-settings`, and `GET /llm-model`.

---

## Step-by-Step Implementation

### Step 1.1: Create `src/features/app-settings/types.ts`

**Goal:** Define the frontend mirror of the backend App Settings and local LLM model API contracts.
**Dependencies:** None.

- [x] Create the directory `project/srcs/frontend/src/features/app-settings/`.
- [x] Create `project/srcs/frontend/src/features/app-settings/types.ts`.
- [x] Add the DTO and form interfaces exactly as shown below.
- [x] Run `npm --prefix project/srcs/frontend run typecheck` and confirm 0 errors.

**Why this step is critical:** The service test, service implementation, future hook, and future form all depend on the same type names. Creating the types first avoids import churn and makes the TDD test file compile except for the intentionally missing service module.

#### Implementation

```typescript
// project/srcs/frontend/src/features/app-settings/types.ts

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

#### Edge Cases

1. **Case:** Backend Java fields use `Long` for IDs.
   **Handling:** Mirror them as TypeScript `number`, matching existing frontend DTOs and ADR-009. Do not use `string` IDs.

2. **Case:** `openRouterApiKey` in `AppSettingsDTO` may look like a key but is masked.
   **Handling:** Keep the type as `string | null` because JSON cannot distinguish masked from raw, but document and treat it as display-status input only. Future hook/form work must never copy it into editable state.

3. **Case:** Backend `AppSettingsForm.openRouterApiKey` accepts null or blank.
   **Handling:** The frontend update form intentionally uses `openRouterApiKey?: string`, not `string | null`, because the planned hook preserves the key by omitting the property when the password field is blank. The hook should not send `null` for this field.

4. **Case:** `defaultModelId` could be omitted in Java but omission clears the backend default model.
   **Handling:** Make `defaultModelId` required as `number | null`. This forces callers to choose either a concrete model ID or an explicit clear operation.

5. **Case:** LLM model JSON might be confused with user `enabled` fields.
   **Handling:** Use `isEnabled`, not `enabled`. Backend DTOs and controller tests confirm `isEnabled` is the serialized property for LLM models.

6. **Case:** `updatedAt` and `createdAt` are Java `LocalDateTime` values.
   **Handling:** Use `string` for API DTOs. Do not parse to `Date` in this task; formatting is a future display concern.

---

### Step 1.2 RED: Create `src/features/app-settings/services/appSettingsService.test.ts`

**Goal:** Write behavior tests for the service public interface before the implementation exists.
**Dependencies:** Step 1.1 complete.

- [x] Create the directory `project/srcs/frontend/src/features/app-settings/services/`.
- [x] Create `project/srcs/frontend/src/features/app-settings/services/appSettingsService.test.ts` with the content below.
- [x] Run `npm --prefix project/srcs/frontend run test`.
- [x] Confirm the RED signal: the new suite fails because `./appSettingsService` does not exist or does not export the functions yet, while unrelated existing tests still pass.

**Why this step is critical:** The test file specifies the adapter contract before any implementation is written: exact endpoint paths, HTTP verbs, request body handling, and `response.data` return values.

#### Implementation

```typescript
// project/srcs/frontend/src/features/app-settings/services/appSettingsService.test.ts

import { describe, it, expect, beforeEach, afterEach } from "vitest"
import MockAdapter from "axios-mock-adapter"
import api from "@/lib/api"
import {
  getAppSettings,
  updateAppSettings,
  listLlmModels,
} from "./appSettingsService"
import type {
  AppSettingsDTO,
  AppSettingsUpdateForm,
  LlmModelDTO,
} from "../types"

const mockSettings: AppSettingsDTO = {
  id: 1,
  openRouterApiKey: "****1234",
  defaultModel: {
    id: 2,
    modelId: "openai/gpt-4o",
    name: "GPT-4o",
    isEnabled: true,
  },
  updatedAt: "2026-06-26T10:00:00",
  updatedByUsername: "admin",
}

const mockModels: LlmModelDTO[] = [
  {
    id: 2,
    modelId: "openai/gpt-4o",
    name: "GPT-4o",
    description: "OpenAI flagship model",
    isEnabled: true,
    createdAt: "2026-06-26T10:00:00",
  },
  {
    id: 3,
    modelId: "anthropic/claude-sonnet-4-6",
    name: "Claude Sonnet",
    description: null,
    isEnabled: false,
    createdAt: "2026-06-26T11:00:00",
  },
]

describe("appSettingsService.getAppSettings", () => {
  let mock: InstanceType<typeof MockAdapter>

  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => {
    mock.restore()
  })

  it("sends GET /app-settings and returns response.data", async () => {
    mock.onGet("/app-settings").reply(200, mockSettings)

    const result = await getAppSettings()

    expect(mock.history.get).toHaveLength(1)
    expect(mock.history.get[0].url).toBe("/app-settings")
    expect(result).toEqual(mockSettings)
  })
})

describe("appSettingsService.updateAppSettings", () => {
  let mock: InstanceType<typeof MockAdapter>

  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => {
    mock.restore()
  })

  it("sends PATCH /app-settings with the form body and returns response.data", async () => {
    const form: AppSettingsUpdateForm = {
      defaultModelId: null,
    }

    const response: AppSettingsDTO = {
      ...mockSettings,
      defaultModel: null,
    }

    mock.onPatch("/app-settings").reply(200, response)

    const result = await updateAppSettings(form)

    expect(mock.history.patch).toHaveLength(1)
    expect(mock.history.patch[0].url).toBe("/app-settings")
    const body = JSON.parse(mock.history.patch[0].data as string)
    expect(body).toEqual(form)
    expect(result).toEqual(response)
  })
})

describe("appSettingsService.listLlmModels", () => {
  let mock: InstanceType<typeof MockAdapter>

  beforeEach(() => {
    mock = new MockAdapter(api)
  })

  afterEach(() => {
    mock.restore()
  })

  it("sends GET /llm-model and returns response.data", async () => {
    mock.onGet("/llm-model").reply(200, mockModels)

    const result = await listLlmModels()

    expect(mock.history.get).toHaveLength(1)
    expect(mock.history.get[0].url).toBe("/llm-model")
    expect(result).toEqual(mockModels)
  })
})
```

#### Edge Cases

1. **Case:** The RED state fails with a module-not-found error instead of assertion failures.
   **Handling:** This is correct. The service file is not created until Step 1.3.

2. **Case:** `mock.history.patch[0].data` is not a string.
   **Handling:** Existing project tests cast `mock.history.<method>[0].data as string` before `JSON.parse`. This matches axios-mock-adapter behavior for JSON request bodies. Keep the pattern consistent.

3. **Case:** The `updateAppSettings` test uses `defaultModelId: null`.
   **Handling:** This is intentional. It proves the service passes null through instead of dropping the property. The hook will later decide when null is appropriate; the service simply transmits the caller-provided form.

4. **Case:** `mockModels` includes disabled models.
   **Handling:** This is intentional. The service must return the backend response unchanged. Filtering disabled models belongs to `useAppSettings` in Task 2.

5. **Case:** Tests could share one `MockAdapter` instance across describes.
   **Handling:** Do not share. Keep the existing project pattern: each describe has its own `let mock`, `beforeEach`, and `afterEach` so request history does not leak between tests.

---

### Step 1.3 GREEN: Create `src/features/app-settings/services/appSettingsService.ts`

**Goal:** Implement the minimal service adapter functions that satisfy the RED tests.
**Dependencies:** Step 1.2 RED complete.

- [x] Create `project/srcs/frontend/src/features/app-settings/services/appSettingsService.ts`.
- [x] Import the shared `api` singleton from `@/lib/api`.
- [x] Import DTO/form interfaces from `../types` using `import type`.
- [x] Implement `getAppSettings()`, `updateAppSettings(form)`, and `listLlmModels()`.
- [x] Run `npm --prefix project/srcs/frontend run test` and confirm all tests pass. Expected count after this task: 83/83 if the baseline remains 80.
- [x] Run `npm --prefix project/srcs/frontend run typecheck` and confirm 0 errors.
- [x] Run `npm --prefix project/srcs/frontend run build` and confirm success.

**Why this step is critical:** This service becomes the only data-access module for the App Settings feature. Future hook/component code should not call Axios directly.

#### Implementation

```typescript
// project/srcs/frontend/src/features/app-settings/services/appSettingsService.ts

import api from "@/lib/api"
import type {
  AppSettingsDTO,
  AppSettingsUpdateForm,
  LlmModelDTO,
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
```

#### Edge Cases

1. **Case:** Developer accidentally calls `api.get<AppSettingsDTO>("/api/app-settings")`.
   **Handling:** Do not include `/api`. The `api` singleton already has `baseURL: "/api"`; calling `/api/app-settings` would produce `/api/api/app-settings`.

2. **Case:** Developer adds filtering or sorting to `listLlmModels()`.
   **Handling:** Do not filter or sort here. The service is an HTTP adapter. Task 2's hook owns enabled-model filtering and deterministic ordering.

3. **Case:** Developer catches errors in the service and returns `null` or a fallback object.
   **Handling:** Do not catch. The hook owns error state, retry, and user-facing messages. Returning fallback data would hide backend failures and make the UI state incorrect.

4. **Case:** Developer makes `defaultModelId` optional in `AppSettingsUpdateForm` to match Java's optional field.
   **Handling:** Do not. The parent feature explicitly requires `defaultModelId: number | null` so the frontend cannot accidentally clear the backend default by omitting it.

5. **Case:** `PATCH /app-settings` fails in a browser due to CORS.
   **Handling:** This task does not change backend CORS. Existing project progress indicates PATCH CORS was fixed during a prior feature, but any deployment still missing PATCH support is an environment/backend configuration issue. The frontend service targets the documented endpoint.

---

## Design Decisions

**Decision 1: App Settings gets a new feature-local `types.ts`**
- **Why:** The DTO/form contracts are specific to App Settings and the local LLM model selector. A feature-local module keeps the API mirror near the service/hook/components that consume it.
- **Alternatives considered:** A shared `src/types/app-settings.ts` file - rejected because there is only one feature consumer today. A shared type seam would be premature.

**Decision 2: `AppSettingsUpdateForm.defaultModelId` is required**
- **Why:** The backend treats omitted `defaultModelId` like null and clears `defaultModel`. The frontend's type must force save paths to choose a number or null explicitly.
- **Alternatives considered:** `defaultModelId?: number | null` - rejected because it allows accidental omission and therefore accidental clearing.

**Decision 3: `openRouterApiKey` remains optional and non-null in the frontend form type**
- **Why:** Blank input should preserve the existing key by omitting the field. Sending null is unnecessary and less expressive for the planned hook logic.
- **Alternatives considered:** `openRouterApiKey: string | null` - rejected because it implies callers should send null as a valid frontend action. The backend supports null, but the frontend workflow preserves by omission.

**Decision 4: Service functions are standalone exports, not a class**
- **Why:** Existing frontend services use standalone exported functions. A class would add construction and mocking surface without improving behavior or testability.
- **Alternatives considered:** `AppSettingsService` class - rejected as unnecessary TypeScript ceremony.

**Decision 5: The service returns backend responses unchanged**
- **Why:** The service adapter's responsibility is HTTP transport. Masked-key interpretation, enabled-model filtering, deterministic sorting, selected-default preservation, and error/success lifecycle are hook-level concerns.
- **Alternatives considered:** Filtering enabled models inside `listLlmModels()` - rejected because that would hide the actual backend contract and make future use cases unable to access disabled models if needed.

**Decision 6: No error-path tests in this task**
- **Why:** The service has no custom error behavior. Axios rejection propagation is tested indirectly by hook tests in later tasks and shared API interceptor tests. Testing rejection here would assert Axios internals rather than App Settings behavior.
- **Alternatives considered:** Add 401 or network-error tests - rejected because `lib/api.ts` owns unauthorized handling, while Task 2 owns hook error display.

**Decision 7: Keep `LlmModelDTO.id` as `number`, not `string`**
- **Why:** Backend uses Java `Long` consistently per ADR-009; existing frontend DTOs mirror backend IDs as `number`. The default model select will use numeric `id` values later.
- **Alternatives considered:** String IDs to avoid JavaScript integer precision concerns - rejected because project conventions use `number`, and AgentForge's self-hosted single-instance IDs will not approach `Number.MAX_SAFE_INTEGER`.

---

## Testing Considerations

### Automatic Validation

- [x] Run `npm --prefix project/srcs/frontend run typecheck` after Step 1.1 and confirm 0 errors.
- [x] Run `npm --prefix project/srcs/frontend run test` after Step 1.2 RED and confirm the new `appSettingsService.test.ts` suite fails because the service module/export is missing, while unrelated existing tests remain green.
- [x] Run `npm --prefix project/srcs/frontend run test` after Step 1.3 GREEN and confirm all tests pass. Expected count: 83/83 if the baseline remains 80.
- [x] Run `npm --prefix project/srcs/frontend run typecheck` after Step 1.3 GREEN and confirm 0 errors.
- [x] Run `npm --prefix project/srcs/frontend run build` after Step 1.3 GREEN and confirm the Vite build succeeds.

### Manual Validation

No manual validation is required for this task. It creates TypeScript types and pure HTTP adapter functions with automated service tests; there is no UI, browser interaction, route, or visual state to validate manually.

---

## Related Code Explanations

- No `documentation/Code/` explanation files currently exist for these frontend modules.
- `project/srcs/frontend/src/lib/api.ts:12` - `createApi()` creates the shared Axios instance with `baseURL: "/api"`.
- `project/srcs/frontend/src/features/employees/services/employeeService.ts:12` - Existing service adapter shape to mirror.
- `project/srcs/frontend/src/features/employees/services/employeeService.test.ts:29` - Existing service test layout and `MockAdapter` lifecycle to mirror.
- `project/srcs/frontend/tsconfig.app.json:14` - `verbatimModuleSyntax` import-style constraint.
- `project/srcs/frontend/vitest.config.ts:5` - `jsdom` test environment and `@` alias support.

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task.
- [x] Relevant skills reviewed and selected for this task.
- [x] Version-matched or closest indexed documentation reviewed for Axios, axios-mock-adapter, and Vitest.
- [x] `project/srcs/frontend/src/features/app-settings/types.ts` created with `LlmModelDTO`, `LlmModelMiniDTO`, `AppSettingsDTO`, and `AppSettingsUpdateForm`.
- [x] `AppSettingsUpdateForm.defaultModelId` is required as `number | null`.
- [x] `AppSettingsUpdateForm.openRouterApiKey` is optional and omitted when preserving the existing key in later hook code.
- [x] `LlmModelDTO` and `LlmModelMiniDTO` use `isEnabled`, not `enabled`.
- [x] `project/srcs/frontend/src/features/app-settings/services/appSettingsService.test.ts` created with tests for `getAppSettings()`, `updateAppSettings(form)`, and `listLlmModels()`.
- [x] RED step confirmed before creating `appSettingsService.ts`.
- [x] `project/srcs/frontend/src/features/app-settings/services/appSettingsService.ts` created with the three public functions and no extra error handling or filtering logic.
- [x] `getAppSettings()` calls `api.get<AppSettingsDTO>("/app-settings")` and returns `response.data`.
- [x] `updateAppSettings(form)` calls `api.patch<AppSettingsDTO>("/app-settings", form)` and returns `response.data`.
- [x] `listLlmModels()` calls `api.get<LlmModelDTO[]>("/llm-model")` and returns `response.data` unchanged.
- [x] `npm --prefix project/srcs/frontend run test` passes after GREEN.
- [x] `npm --prefix project/srcs/frontend run typecheck` passes after GREEN.
- [x] `npm --prefix project/srcs/frontend run build` passes after GREEN.
- [x] Parent feature Phase 1 steps (1.1, 1.2, 1.3) are marked complete when the code task is executed.
- [x] Parent feature Task 1 section remains linked to `[[Admin-App-Settings-Page-task-1-types-and-service]]`.
