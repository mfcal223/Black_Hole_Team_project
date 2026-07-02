# Task: Employee-readable default-model endpoint

#task #current #medium-complexity #parent-employee-chat-websocket-origin-rejected-appsettings-403

**Parent:** [[Employee-Chat-WebSocket-Origin-Rejected-AppSettings-403]]
**Parent Type:** Bug
**Related Step(s):** Phase 2 — Steps 2.1, 2.2, 2.3, 2.4 (Finding 2 — `GET /api/app-settings` 403 for employees silently drops default-model preselection)
**Estimated Complexity:** Medium

---

## Goal

Add `GET /app-settings/default-model` — a slim, employee-gated endpoint returning only `LlmModelMiniDTO` — so `useChatSetup` can pre-select the admin-configured default model (US #4) without ever exposing `openRouterApiKey` to the employee role. This eliminates the persistent `403 Invalid CORS request` on `/api/app-settings` at every chat-page mount and makes the model selector land on the admin-intended default rather than silently falling back to the first enabled model.

---

## Parent Context

The parent Bug Report [[Employee-Chat-WebSocket-Origin-Rejected-AppSettings-403]] contains two independent findings. **This Task addresses Finding 2 only** (the `/app-settings` 403 for employees). Finding 1 (WebSocket CORS) was addressed in Task 1; tests for both findings are Task 3.

What the parent mandates for this task (Option A — production-aligned, accepted 2026-07-01):

1. **Step 2.1** — Add an **ungated** `AppSettingsService.getDefaultModelMini()` helper returning `LlmModelMiniDTO` (no `@PreAuthorize`). The controller owns the access gate. The method reads the singleton via `appSettingsRepository.findFirstBy()` — the established loader used by `getRawApiKey()` (line 71) and `getSettings()` — then delegates `LlmModelEntity → LlmModelMiniDTO` to the canonical `llmModelMapper.toSmallDTO()` (no new DTO, no new mapper method). Returns `null` when no `app_settings` row exists yet OR when no default model is configured; must not throw (throwing would 500 the employee chat page on a fresh deploy). Javadoc must warn against re-adding `@PreAuthorize`, mirroring the `getRawApiKey()` guard. Inject `LlmModelMapper` into `AppSettingsService` alongside existing dependencies (`AppSettingsRepository`, `LlmModelRepository`, `AppSettingsMapper`, `AuthUserUtil`).

2. **Step 2.2** — Add `@GetMapping("/default-model") @PreAuthorize("hasRole('EMPLOYEE')")` to `AppSettingsController`. Return `ResponseEntity.ok(mini)` when a default model is set; return `ResponseEntity.noContent().build()` (`204 No Content`) when `getDefaultModelMini()` returns `null` — so the client gets an unambiguous "no default" signal rather than a 200-with-null-body ambiguity.

3. **Step 2.3** — Add `getDefaultModel(): Promise<EnabledModelDTO | null>` to `chatService.ts`. Use `GET /app-settings/default-model`; treat `204` as null (no default), `200` as the mini DTO. The return type is `EnabledModelDTO` (the shape already defined in `features/chat/types.ts`, structurally identical to `LlmModelMiniDTO`), **not** any type from `features/app-settings` — this avoids cross-feature coupling.

4. **Step 2.4** — In `useChatSetup.ts`, replace `getAppSettings()` with `getDefaultModel()`. The `defaultId` resolution changes from `settingsResult.value.defaultModel?.id ?? null` to `settingsResult.value?.id ?? null`. The existing `enabledModels.some(m => m.id === defaultId)` stale-FK guard (lines 71-74) stays unchanged. Update `useChatSetup.test.ts` to mock `getDefaultModel` (from `chatService`) instead of `getAppSettings` (from `appSettingsService`).

Key constraints from the parent:
- **No new DTO**: reuse `LlmModelMiniDTO` (Java) / `EnabledModelDTO` (TS). The shapes are identical; no mapper method is invented.
- **Do NOT use `SINGLETON_ID`**: `AppSettingsEntity` uses `@GeneratedValue(IDENTITY)` — no such constant exists. Always load via `findFirstBy()`.
- **Do NOT return `AppSettingsDTO`**: it embeds `openRouterApiKey`, which must not reach employees even in masked form.
- **Ungated service method**: the `@PreAuthorize` lives on the controller, not the service helper — same as `getRawApiKey()` at `AppSettingsService.java:71` and `LlmModelService.getEnabledModels()`.
- **Rejected Option B** (fold `isDefault` into `EnabledModelDTO`): couples catalog membership with admin-configured default — diverges from the small-DTO-per-concern precedent established by `LlmModelMiniDTO`.
- **Rejected Option C** (second `AppSettingsDTO` for employees): more surface area than one endpoint + one service method and risks drift between admin and employee DTOs.

---

## Preconditions / Dependencies

- **Task 1 complete**: [[Employee-Chat-WebSocket-Origin-Rejected-AppSettings-403-task-1-same-origin-ws-routing]] is done. The WebSocket is now same-origin; the chat page loads without a WS error. This task's fix is orthogonal (different finding, different code path) but both are needed for a fully working chat for employees.
- **Employee Chat Interface complete**: [[Employee-Chat-Interface]] Phases 1–8 implemented and verified (185 frontend tests / 33 files). The files `useChatSetup.ts`, `chatService.ts`, and `useChatSetup.test.ts` exist and are the production source that this task modifies.
- **AppSettings backend already bootstrapped**: `AppSettingsBootstrap` seeds a singleton `app_settings` row on first startup. `AppSettingsRepository.findFirstBy()` is the established singleton loader used by `getRawApiKey()` and `getSettings()`.
- **`LlmModelMiniDTO` exists**: `com.BHT.models.llm.LlmModelMiniDTO` (id, modelId, name, isEnabled) is the canonical mini DTO already used by `AppSettingsDTO.defaultModel` and `GET /llm-model/enabled`. No new DTO is needed.
- **`LlmModelMapper.toSmallDTO()` is the canonical converter**: `LlmModelMapper` (a standalone `@Component`) has `toSmallDTO(LlmModelEntity entity): LlmModelMiniDTO` at line 23. `AppSettingsMapper` has a private duplicate `toLlmMiniDTO()` — the fix delegates to the canonical one, not the private copy.
- **`TestAuthenticationHelper`** is available in `com.BHT.testUtils` — generates real JWT tokens for admin, employee, and client roles. `AppSettingsControllerTest` already uses it (see `authHelper.getAdminToken()`, `authHelper.getEmployeeToken()`).
- **Frontend test baseline**: **185/185** across 33 files after Task 1 and Employee Chat Task 7. `useChatSetup.test.ts` has 8 tests currently mocking `getAppSettings` from `appSettingsService`.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — **Selected** — provides the Task template, directory (`documentation/Tasks/current/`), and naming convention.
- `solid-deep-design` — **Selected** — governs the design of `getDefaultModelMini()` (ungated helper, injected `LlmModelMapper`, null-return contract), the `AppSettingsController` endpoint shape (204 vs 200+null), and the frontend `getDefaultModel()` service function (ISP — client gets only the field it needs).
- `memory-bank` — **Selected** — loaded all Memory Bank files; confirmed architecture, singleton `findFirstBy()` pattern, `getRawApiKey()` ungated-helper precedent, `@PreAuthorize` on controllers not service helpers, `LlmModelMapper.toSmallDTO` canonical converter, and frontend test baseline (185 tests / 33 files).
- `tdd` — **Selected** — defines the test strategy: TDD for the frontend `useChatSetup.ts` update (RED: update tests to use `mockGetDefaultModel` → they fail; GREEN: implement the swap); integration tests for the backend endpoint following the `LlmModelEnabledEndpointTest` pattern. The task-reviewer will verify the test strategy post-write.
- `find-docs` — **Selected** (Context7 CLI unavailable in this environment; verified from stable Spring Boot 3.x / Axios 1.x training knowledge for `ResponseEntity.noContent().build()` and `validateStatus`). Spring `ResponseEntity.noContent()` is stable since Spring 4.0 and unchanged in Boot 3.4.1. Axios 1.18.0 `validateStatus` per-request option is stable since Axios 0.21.
- `glossary-management` — **Not needed** — no new domain terms introduced. "Default model", "LLM model", "AppSettings" are established project vocabulary.
- `doc-exploration` — **Selected** (executed during planning) — confirmed no ADR constrains this endpoint shape. ADRs ADR-001..010 reviewed; none address the `getDefaultModel` endpoint pattern or the service-ungated / controller-gated convention (the pattern is established in code but not ADR-captured, which is appropriate for an implementation-level convention).

### Documentation Reviewed

- **`AppSettingsService.java:32-75`** — `@PreAuthorize("hasRole('ADMIN')")` on `getSettings()` and `updateSettings()`; `getRawApiKey()` (line 71) deliberately ungated (exact precedent to mirror).
- **`LlmModelController.java:37-41`** — `getEnabledModels()` `@GetMapping("/enabled")` with `@PreAuthorize("hasRole('EMPLOYEE')")` — exact controller pattern to mirror.
- **`LlmModelService.getEnabledModels()`** — ungated service helper (no `@PreAuthorize`), `@Transactional(readOnly = true)`, returns `List<LlmModelMiniDTO>` via `llmModelMapper.toSmallDTO`. The precise pattern `getDefaultModelMini()` follows.
- **`AppSettingsControllerTest.java`** — existing 9-test suite using `TestAuthenticationHelper` (`getAdminToken()`, `getEmployeeToken()`), `@BeforeEach` FK-safe cleanup, `@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test")`. New tests are added to this class (not a new file) to keep admin-endpoint and employee-default-model tests co-located.
- **`LlmModelEnabledEndpointTest.java`** — the exact pattern for a 3-test employee-gated endpoint suite (employee → 200 + json shape assertions, admin → 403, anonymous → 401). Backend tests for `/default-model` follow this pattern with additions for the 204 case.
- **`useChatSetup.ts` + `useChatSetup.test.ts`** — the hook to modify (lines 45-74) and its 8-test suite using `Promise.allSettled` + `mockGetAppSettings`. After the change, `getDefaultModel` from `chatService` replaces `getAppSettings` from `appSettingsService`.
- **`AppSettingsEntity.java`** — `defaultModel` is `@ManyToOne(fetch = FetchType.LAZY)`. Null FK → Hibernate returns `null` (not a proxy); `Optional.map()` on `null` returns `Optional.empty()` → service method returns `null` → controller returns `204`. Non-null FK → Hibernate returns a proxy initialized lazily within the `@Transactional` boundary of `getDefaultModelMini()`.

### Related Existing Code

- `project/srcs/backend/src/main/java/com/BHT/models/appSettings/AppSettingsService.java:71` — `getRawApiKey()` ungated helper precedent.
- `project/srcs/backend/src/main/java/com/BHT/models/llm/LlmModelController.java:37-41` — employee-gated endpoint precedent.
- `project/srcs/backend/src/main/java/com/BHT/models/llm/LlmModelMapper.java:23-31` — canonical `toSmallDTO(LlmModelEntity): LlmModelMiniDTO` to reuse.
- `project/srcs/backend/src/main/java/com/BHT/models/appSettings/AppSettingsMapper.java:22-29` — private `toLlmMiniDTO()` (duplication; do NOT call this from `getDefaultModelMini()`; the canonical converter is `LlmModelMapper.toSmallDTO`).
- `project/srcs/backend/src/main/java/com/BHT/models/appSettings/AppSettingsRepository.java` — `Optional<AppSettingsEntity> findFirstBy()` (the singleton loader).
- `project/srcs/frontend/src/features/chat/hooks/useChatSetup.ts:45-74` — `Promise.allSettled` with `getAppSettings()`, `defaultId` resolution, stale-FK guard.
- `project/srcs/frontend/src/features/chat/services/chatService.ts` — the service file receiving the new `getDefaultModel()` function.
- `project/srcs/frontend/src/features/chat/types.ts:3-8` — `EnabledModelDTO` (id, modelId, name, isEnabled) — structurally identical to `LlmModelMiniDTO`; used as the return type for `getDefaultModel()` to avoid cross-feature coupling.
- `project/srcs/frontend/src/features/chat/hooks/useChatSetup.test.ts` — 8-test suite; needs mock update.

---

## Implementation Details

### Approach

This fix is a **vertical slice** across four files (backend service, backend controller, frontend service, frontend hook) plus a test file update and an API doc update. All four code changes must land together to avoid a window where the frontend calls an endpoint that doesn't exist yet.

From a `solid-deep-design` perspective:

- **`AppSettingsService.getDefaultModelMini()`** — deepens the service. The existing `getRawApiKey()` already established the pattern of an ungated helper reading the singleton to expose a safe slice of it to non-admin callers. `getDefaultModelMini()` follows exactly: it hides `findFirstBy()` + null-safe Optional chaining + lazy-load triggering + canonical mapper delegation behind a single method name. Deletion test: if you deleted this method, callers would each need to replicate `findFirstBy().map(entity -> entity.getDefaultModel()).map(mapper::toSmallDTO).orElse(null)` — complexity scatters. The module earns its keep.
- **`AppSettingsController.getDefaultModel()`** — thin, correct per SRP (HTTP contract translation only). The access gate (`@PreAuthorize("hasRole('EMPLOYEE')")`) lives here, not on the service (DIP: the service's interface is ungated; the controller chooses the authorization strategy, allowing future reuse from other callers under different gate configurations without touching the service).
- **`chatService.getDefaultModel()`** — ISP: the chat feature gets exactly one field (`EnabledModelDTO`) rather than the full `AppSettingsDTO` (which includes the admin API key). The function encapsulates the 204→null protocol detail behind the service boundary; `useChatSetup` never sees a raw HTTP status.
- **`useChatSetup.ts`** — removes a cross-feature import (`features/app-settings/services/appSettingsService`) and replaces it with a same-feature import (`features/chat/services/chatService`). This tightens module cohesion: the chat feature no longer reaches into the admin-settings feature to read a single field of an admin DTO. The existing `Promise.allSettled` structure, stale-FK guard, and graceful degradation logic are unchanged.

### Files to Create/Modify

- [x] `project/srcs/backend/src/main/java/com/BHT/models/appSettings/AppSettingsService.java` — add `LlmModelMapper` constructor parameter + `getDefaultModelMini()` ungated helper.
- [x] `project/srcs/backend/src/main/java/com/BHT/models/appSettings/AppSettingsController.java` — add `GET /default-model` employee-gated endpoint.
- [x] `project/srcs/frontend/src/features/chat/services/chatService.ts` — add `getDefaultModel()` service function.
- [x] `project/srcs/frontend/src/features/chat/hooks/useChatSetup.ts` — swap `getAppSettings()` → `getDefaultModel()`; update `defaultId` resolution.
- [x] `project/srcs/frontend/src/features/chat/hooks/useChatSetup.test.ts` — update mock and test fixtures to use `getDefaultModel`.
- [x] `project/srcs/backend/src/test/java/com/BHT/models/appSettings/AppSettingsControllerTest.java` — add 4 new tests for `GET /app-settings/default-model`.
- [x] `documentation/Docs/API-Reference/AppSettings.md` — document the new `GET /app-settings/default-model` endpoint.

---

## Step-by-Step Implementation

### Step 2.1: Add `getDefaultModelMini()` to `AppSettingsService`

**Goal:** Expose a safe, ungated, `@Transactional(readOnly = true)` helper that returns the admin-configured default model as `LlmModelMiniDTO`, without leaking `openRouterApiKey` and without throwing on a fresh deploy.
**Dependencies:** None. The `AppSettingsRepository`, `LlmModelMapper` beans already exist in the Spring context.

- [x] Add `LlmModelMapper llmModelMapper` as the fifth constructor parameter in `AppSettingsService`. Add the corresponding `private final LlmModelMapper llmModelMapper;` field. Add `import com.BHT.models.llm.LlmModelMapper;` and `import com.BHT.models.llm.LlmModelMiniDTO;`.
- [x] Add `getDefaultModelMini()` below `getRawApiKey()` with the exact javadoc warning against `@PreAuthorize`.

**Why this step is critical:**
Without this method, the controller has no safe way to read the default model for employees — calling the existing `getSettings()` would 403 on the `@PreAuthorize("hasRole('ADMIN')")` gate and re-introduce the bug.

#### Implementation

In `AppSettingsService.java`, update the class as follows:

```java
import com.BHT.models.llm.LlmModelMapper;
import com.BHT.models.llm.LlmModelMiniDTO;
// (keep all existing imports)

@Service
public class AppSettingsService {

    private final AppSettingsRepository appSettingsRepository;
    private final LlmModelRepository llmModelRepository;
    private final AppSettingsMapper mapper;
    private final AuthUserUtil authUserUtil;
    private final LlmModelMapper llmModelMapper;   // ← add

    public AppSettingsService(
            AppSettingsRepository appSettingsRepository,
            LlmModelRepository llmModelRepository,
            AppSettingsMapper mapper,
            AuthUserUtil authUserUtil,
            LlmModelMapper llmModelMapper            // ← add fifth parameter
    ) {
        this.appSettingsRepository = appSettingsRepository;
        this.llmModelRepository = llmModelRepository;
        this.mapper = mapper;
        this.authUserUtil = authUserUtil;
        this.llmModelMapper = llmModelMapper;        // ← add assignment
    }

    // ... (existing getSettings, updateSettings, getRawApiKey unchanged) ...

    /**
     * Intentionally ungated — the controller at /app-settings/default-model enforces
     * ROLE_EMPLOYEE. Do NOT add @PreAuthorize here: it would 403 employees and
     * re-introduce the bug. See getRawApiKey() and LlmModelService.getEnabledModels()
     * for the same convention.
     *
     * Returns null when no app_settings row exists yet (fresh deploy, before any admin
     * save) OR when no default model is configured. The frontend treats null as
     * "no default" and falls back to the first enabled model. Do NOT throw here —
     * throwing would 500 the employee chat page on a fresh deploy.
     */
    @Transactional(readOnly = true)
    public LlmModelMiniDTO getDefaultModelMini() {
        return appSettingsRepository.findFirstBy()
                .map(AppSettingsEntity::getDefaultModel)
                .map(llmModelMapper::toSmallDTO)
                .orElse(null);
    }
}
```

#### Edge Cases

1. **`null` default model (FK is NULL in DB)** — `AppSettingsEntity.defaultModel` is `@ManyToOne(fetch = FetchType.LAZY)`. When the FK column is `NULL`, Hibernate returns `null` (not an uninitialized proxy) from `getDefaultModel()`. `Optional.map()` on `null` produces `Optional.empty()` → `orElse(null)` returns `null`. Controller returns `204 No Content`.
2. **Non-null `defaultModel` (FK set, lazy proxy)** — `Optional.map(AppSettingsEntity::getDefaultModel)` captures the non-null proxy. `Optional.map(llmModelMapper::toSmallDTO)` calls `toSmallDTO(proxy)`, which accesses `proxy.getId()`, `proxy.getModelId()`, etc., triggering Hibernate lazy-load. Since the method is `@Transactional(readOnly = true)`, the persistence context is open → lazy load succeeds → `LlmModelMiniDTO` is returned → controller returns `200 OK`.
3. **No `app_settings` row** — `findFirstBy()` returns `Optional.empty()` → whole chain short-circuits → returns `null` → controller returns `204`. Does not throw `ItemNotFoundException` (unlike `getSettings()`). This is intentional: the frontend must not 500 on a fresh deploy before the admin has saved any settings.
4. **`LlmModelMapper.toSmallDTO(null)`** — the mapper guards `if (entity == null) return null`, so even if `getDefaultModel()` returns null despite the `Optional` chain (defensive), `toSmallDTO` returns null → `Optional.map()` produces `Optional.empty()` → `orElse(null)` → `204`.
5. **Duplicate conversion vs canonical** — `AppSettingsMapper.toLlmMiniDTO()` is a private method that duplicates the conversion. This task delegates to the canonical `LlmModelMapper.toSmallDTO()` instead. The private copy in `AppSettingsMapper` is NOT removed by this task (it's still used by `AppSettingsMapper.toDTO()` which maps `AppSettingsEntity` to `AppSettingsDTO`); removing it is a follow-up cleanup. Do NOT call `AppSettingsMapper.toLlmMiniDTO()` from `getDefaultModelMini()` — it is private and would tighten the coupling in the wrong direction.

---

### Step 2.2: Add `GET /default-model` to `AppSettingsController`

**Goal:** Expose the new service helper via an HTTP endpoint gated to `ROLE_EMPLOYEE`, returning `200` with the mini DTO when a default model is set and `204 No Content` when it is not.
**Dependencies:** Step 2.1 (`getDefaultModelMini()` must exist).

- [x] Add `import com.BHT.models.llm.LlmModelMiniDTO;` to `AppSettingsController.java`.
- [x] Add the `getDefaultModel()` method after the existing `getSettings()` endpoint.

**Why this step is critical:**
Without this endpoint, `chatService.getDefaultModel()` would 404 on every chat page load — the frontend would never receive the default model ID and US #4 would remain broken.

#### Implementation

In `AppSettingsController.java`, add after the `getSettings()` method:

```java
import com.BHT.models.llm.LlmModelMiniDTO;
import org.springframework.security.access.prepost.PreAuthorize;
// (keep all existing imports)

@RestController
@RequestMapping("/app-settings")
public class AppSettingsController {

    // ... (existing constructor and getSettings/updateSettings unchanged) ...

    @GetMapping("/default-model")
    @PreAuthorize("hasRole('EMPLOYEE')")
    public ResponseEntity<LlmModelMiniDTO> getDefaultModel() {
        LlmModelMiniDTO mini = appSettingsService.getDefaultModelMini();
        if (mini == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(mini);
    }
}
<!-- REVIEW-FIX: Changed ternary to if-return. The ternary (ResponseEntity<Void> vs ResponseEntity<LlmModelMiniDTO>) unifies to ResponseEntity<?> as the common branch type and then requires an unchecked conversion to the declared return type. The if-return produces the same unchecked conversion per branch, but is the conventional Spring idiom and avoids the extra type-unification step. -->
```

#### Edge Cases

1. **`204 No Content` vs `200` with null body** — `204 No Content` is unambiguous: there is no body, no JSON to parse. A `200` with a `null` body would arrive as `""` (empty string) in Axios, requiring the frontend to check for empty string vs a real DTO. The `204` contract is explicit and idiomatic for "resource exists but has no current value."
2. **Admin calling this endpoint** — `@PreAuthorize("hasRole('EMPLOYEE')")` will 403 an admin token. Admins should use `GET /app-settings` (returns the full DTO including the masked API key). This is correct: the two endpoints serve two different roles with two different DTO shapes.
3. **Anonymous caller** — Spring Security rejects unauthenticated requests at the filter chain level before the controller is reached → `401 Unauthorized`. The `@PreAuthorize` annotation is not even evaluated.
4. **`ResponseEntity<LlmModelMiniDTO>` return type and the `noContent()` branch** — `ResponseEntity.noContent().build()` returns `ResponseEntity<Void>` at compile time (Spring's `HeadersBuilder.build()` is declared as `ResponseEntity<Void> build()`). In the if-return pattern, Java performs an unchecked conversion from `ResponseEntity<Void>` to the declared method return type `ResponseEntity<LlmModelMiniDTO>` and emits an "unchecked or unsafe operations" compiler note. This is a known, widely-accepted Spring idiom and does not affect runtime behaviour (type erasure means both are `ResponseEntity` at bytecode level). The ternary alternative would require Java to first unify `ResponseEntity<Void>` and `ResponseEntity<LlmModelMiniDTO>` into `ResponseEntity<?>` and then perform an unchecked conversion to the declared return type — the if-return is preferred because it is the conventional Spring pattern and avoids that extra type-unification step.
<!-- REVIEW-FIX: Corrected the claim that "Spring coerces it... compiles cleanly." Both the ternary and if-return patterns produce an unchecked conversion warning; neither "compiles cleanly" in the strict sense. The if-return is the idiomatic Spring choice but for different reasons than stated (it avoids branch type-unification, not a Spring-level coercion). -->

---

### Step 2.3: Add `getDefaultModel()` to `chatService.ts`

**Goal:** Give `useChatSetup` a same-feature service function that encapsulates the `GET /app-settings/default-model` HTTP call and translates `204 → null` / `200 → EnabledModelDTO`, without requiring the caller to handle raw HTTP status codes.
**Dependencies:** None (the endpoint need not exist yet for the service function to be written; TDD RED confirms the function is absent before it is added).

- [x] Add `getDefaultModel` to the `chatService.ts` file. Return type: `Promise<EnabledModelDTO | null>`. Use `api.get` with an explicit `validateStatus` that permits both `200` and `204` so Axios does not throw on `204`.

**Why this step is critical:**
`useChatSetup.ts` must import `getDefaultModel` from `../services/chatService` (same feature), NOT from `@/features/app-settings/services/appSettingsService` (cross-feature). The service function is the seam that encapsulates the `200`/`204` HTTP contract from the hook.

#### Implementation

In `project/srcs/frontend/src/features/chat/services/chatService.ts`, add after `getMessages`:

```ts
export async function getDefaultModel(): Promise<EnabledModelDTO | null> {
  const response = await api.get<EnabledModelDTO>("/app-settings/default-model", {
    validateStatus: (status) => status === 200 || status === 204,
  })
  return response.status === 204 ? null : response.data
}
```

No new import is needed: `EnabledModelDTO` is already imported in the file header (via `import type { EnabledModelDTO, ... } from "../types"`). The `api` singleton is already imported.

#### Edge Cases

1. **`validateStatus` on 204** — by default Axios treats any `2xx` as successful (so `204` would not throw without custom `validateStatus`). The custom `validateStatus` here is explicit documentation of the contract — it makes clear the function handles both 200 and 204, and rejects anything else (e.g., a 403 if the token expires, or a 500 from the backend). This is the correct posture: the caller (`useChatSetup`) uses `Promise.allSettled` and treats a rejected promise as "settings failure, fall back to first model."
2. **`response.data` on 204** — for a `204 No Content` response, Axios delivers `response.data` as `""` (empty string) or `undefined`, depending on the response content-type. Checking `response.status === 204` before accessing `response.data` is the safe pattern that avoids trying to use an empty string as a DTO.
3. **Backend returns 403 (token expired / wrong role)** — `validateStatus` returns `false` → Axios throws an `AxiosError`. `Promise.allSettled` catches it → `settingsResult.status === "rejected"` → `defaultId = null` → `useChatSetup` falls back to first enabled model (correct graceful degradation, same as before this fix).
4. **Type narrowing** — `response.data` is typed as `EnabledModelDTO` in the generic `api.get<EnabledModelDTO>()`. After the `response.status === 204` guard, TypeScript is satisfied that `response.data` is `EnabledModelDTO`. The `| null` in the return type is provided by the ternary.

---

### Step 2.4: Swap `getAppSettings()` → `getDefaultModel()` in `useChatSetup.ts` and update its tests

**Goal:** Make `useChatSetup` consume the new `getDefaultModel()` service function, eliminating the cross-feature `appSettingsService` import and the persistent `403` console error on every chat-page mount.
**Dependencies:** Step 2.3 (`getDefaultModel()` must be exported from `chatService.ts`).

- [x] In `useChatSetup.ts`: remove the `getAppSettings` import; add `getDefaultModel` to the `chatService` imports; update the `Promise.allSettled` call to use `getDefaultModel()`; update `defaultId` resolution to `settingsResult.value?.id ?? null`.
- [x] In `useChatSetup.test.ts`: add `getDefaultModel: vi.fn()` to the `chatService` mock factory; replace `mockGetAppSettings` with `mockGetDefaultModel` (typed as `vi.mocked(getDefaultModel)`); update `beforeEach` default to `mockGetDefaultModel.mockResolvedValue(mockDefaultModel)` where `mockDefaultModel: EnabledModelDTO`; update individual tests accordingly; remove the now-unused `getAppSettings` import from the test file (but keep the `appSettingsService` mock factory intact — other exports in that mock may still be needed by other tests sharing the mock registry).

**Why this step is critical:**
This is the behavior change that stops the `403` on `/api/app-settings` and makes US #4 work. It also removes the architectural smell of the chat feature importing from the app-settings feature's service layer.

#### Implementation — `useChatSetup.ts`

Replace lines 4-5 (the two import lines that reference `getAppSettings` and `AppSettingsDTO`-related types):

```ts
// BEFORE (lines 4-5):
import { getEnabledModels } from "../services/chatService"
import { getAppSettings } from "@/features/app-settings/services/appSettingsService"

// AFTER:
import { getEnabledModels, getDefaultModel } from "../services/chatService"
// (remove the @/features/app-settings import entirely)
```

Update the `Promise.allSettled` call (line 45) and `defaultId` resolution (lines 67-69):

```ts
// BEFORE (lines 45, 67-69):
const [modelsResult, settingsResult, agentsResult] = await Promise.allSettled([
  getEnabledModels(),
  getAppSettings(),      // ← cross-feature, 403s for employees
  listAgents(AGENT_PAGE_REQUEST),
])
// ...
const defaultId =
  settingsResult.status === "fulfilled"
    ? (settingsResult.value.defaultModel?.id ?? null)  // ← AppSettingsDTO shape
    : null

// AFTER:
const [modelsResult, settingsResult, agentsResult] = await Promise.allSettled([
  getEnabledModels(),
  getDefaultModel(),     // ← same-feature, employee-gated, returns EnabledModelDTO | null
  listAgents(AGENT_PAGE_REQUEST),
])
// ...
const defaultId =
  settingsResult.status === "fulfilled"
    ? (settingsResult.value?.id ?? null)               // ← EnabledModelDTO | null shape
    : null
```

Everything else in `useChatSetup.ts` is unchanged: the `Promise.allSettled` structure, the models-critical path, the stale-FK guard (`enabledModels.some(m => m.id === defaultId)` at lines 72-74), the agents degradation, and the returned interface.

#### Implementation — `useChatSetup.test.ts`

1. **Add `getDefaultModel` to chatService imports and mock factory:**

```ts
// In the vi.mock factory for chatService (add getDefaultModel: vi.fn())
vi.mock("../services/chatService", () => ({
  getEnabledModels: vi.fn(),
  createConversation: vi.fn(),
  getConversation: vi.fn(),
  getMessages: vi.fn(),
  getDefaultModel: vi.fn(),  // ← add this
}))
```

2. **Import `getDefaultModel` for `vi.mocked` and remove both dead cross-feature imports:**

```ts
import { getEnabledModels, getDefaultModel } from "../services/chatService"
// Remove: import { getAppSettings } from "@/features/app-settings/services/appSettingsService"
// Remove: import type { AppSettingsDTO } from "@/features/app-settings/types"  ← line 11 of the test file
```
<!-- REVIEW-FIX: Added explicit call-out to remove `import type { AppSettingsDTO } from "@/features/app-settings/types"` (line 11 of useChatSetup.test.ts). After the change this import is dead code and will generate a TypeScript "unused import" lint warning. It was only mentioned inline inside the fixtures code block (step 4 comment) but not as a first-class removal instruction. -->

3. **Replace `mockGetAppSettings` with `mockGetDefaultModel`:**

```ts
// Remove: const mockGetAppSettings = vi.mocked(getAppSettings)
const mockGetDefaultModel = vi.mocked(getDefaultModel)
```

4. **Update fixtures and `beforeEach`:**

```ts
// Instead of mockAppSettings: AppSettingsDTO
// Use a lean fixture matching EnabledModelDTO | null:
const mockDefaultModel = { id: 2, modelId: "openai/gpt-4o", name: "GPT-4o", isEnabled: true }

// Remove: import type { AppSettingsDTO } from "@/features/app-settings/types"

// In beforeEach:
// Remove: mockGetAppSettings.mockResolvedValue(mockAppSettings)
// Add:
mockGetDefaultModel.mockResolvedValue(mockDefaultModel)
```

5. **Update individual tests that override the default settings mock:**

- Test 2 ("no default model"): was `mockGetAppSettings.mockResolvedValue({ ...mockAppSettings, defaultModel: null })` → becomes `mockGetDefaultModel.mockResolvedValue(null)`
- Test 3 ("stale FK"): was `mockGetAppSettings.mockResolvedValue({ ...mockAppSettings, defaultModel: { id: 99, ... } })` → becomes `mockGetDefaultModel.mockResolvedValue({ id: 99, modelId: "stale/model", name: "Stale Model", isEnabled: false })`
- All other tests that relied on the `getAppSettings` mock returning the default model shape now rely on `mockGetDefaultModel`.

6. **Keep the `appSettingsService` vi.mock block** — it may be needed by other modules mocked in the same Vitest run. Remove it only if confirmed that no other import in the test file touches `appSettingsService`. Since `useChatSetup.ts` no longer imports `appSettingsService`, the mock block is inert in this file but harmless to keep.

#### Edge Cases

1. **Stale-FK guard unchanged** — `useChatSetup.ts` lines 72-74 guard: `const defaultInEnabled = defaultId !== null && models.some((m) => m.id === defaultId)`. This guard is independent of the shape of the settings response — it only uses `defaultId` (a `number | null`). The shape change from `AppSettingsDTO.defaultModel?.id` to `EnabledModelDTO?.id` is a rename, not a semantic change. Tests 2 and 3 (fallback scenarios) continue to validate this guard.
2. **`getDefaultModel` returning `null` for 204** — `settingsResult.value` will be `null` when `getDefaultModel` resolves to `null`. The null-safe `settingsResult.value?.id ?? null` guards this correctly. Previously `settingsResult.value.defaultModel?.id ?? null` would crash if `settingsResult.value` were `null` (never happened before because `getAppSettings` always returned `AppSettingsDTO`, not `null`).
3. **`Promise.allSettled` rejection path** — if `getDefaultModel()` rejects (e.g., network error, 403 on expired token), `settingsResult.status === "rejected"` → `defaultId = null` → fallback to first model (unchanged graceful degradation behavior). This is the same behavior as when `getAppSettings()` rejected before.
4. **`vi.mock` factory completeness** — The existing comment in `useChatSetup.test.ts` says "Include every export of each module — not just what this hook uses — to avoid 'module does not provide an export named ...' errors from other test files that share the same mock registry in the same Vitest run." Adding `getDefaultModel: vi.fn()` to the `chatService` factory satisfies this: any other test file that imports `getDefaultModel` from `chatService` will get a mock fn, not a real implementation.

---

### Step 2.5: Update `AppSettingsControllerTest.java` with endpoint security tests

**Goal:** Add integration tests for the new `GET /app-settings/default-model` endpoint covering: employee with default set → 200 + correct DTO shape + no `openRouterApiKey`; employee with no default → 204; admin → 403; anonymous → 401.
**Dependencies:** Steps 2.1 and 2.2 (the service method and controller endpoint must exist).

- [x] Add 4 new test methods to `AppSettingsControllerTest.java`, using the existing `authHelper.getEmployeeToken()` / `authHelper.getAdminToken()` / anonymous patterns.

**Why this step is critical:**
These tests lock the security contract (employee-only access), the DTO shape (no API key leakage), and the 204 contract (clean "no default" signal). Without them, a future `@PreAuthorize` change on the service could silently break employee access without a failing test.

#### Implementation

Add to `AppSettingsControllerTest.java` after the existing tests:

```java
// ─── GET /app-settings/default-model ────────────────────────────────────────

@Test
void employee_getDefaultModel_returns200WithMiniDTO_whenDefaultModelIsConfigured() throws Exception {
    LlmModelEntity model = new LlmModelEntity();
    model.setModelId("openai/gpt-4o");
    model.setName("GPT-4o");
    LlmModelEntity saved = llmModelRepository.saveAndFlush(model);

    appSettingsRepository.findFirstBy().ifPresent(s -> {
        s.setDefaultModel(saved);
        appSettingsRepository.saveAndFlush(s);
    });

    mockMvc.perform(get("/app-settings/default-model")
                    .header("Authorization", authHelper.getEmployeeToken()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(saved.getId()))
            .andExpect(jsonPath("$.modelId").value("openai/gpt-4o"))
            .andExpect(jsonPath("$.name").value("GPT-4o"))
            .andExpect(jsonPath("$.isEnabled").value(true))
            // Security: API key must NEVER appear in the employee response
            .andExpect(jsonPath("$.openRouterApiKey").doesNotExist())
            .andExpect(jsonPath("$.updatedAt").doesNotExist())
            .andExpect(jsonPath("$.updatedByUsername").doesNotExist());
}

@Test
void employee_getDefaultModel_returns204_whenNoDefaultModelConfigured() throws Exception {
    // @BeforeEach clears defaultModel to null — no extra setup needed.
    mockMvc.perform(get("/app-settings/default-model")
                    .header("Authorization", authHelper.getEmployeeToken()))
            .andExpect(status().isNoContent());
}

@Test
void admin_getDefaultModel_returns403() throws Exception {
    mockMvc.perform(get("/app-settings/default-model")
                    .header("Authorization", authHelper.getAdminToken()))
            .andExpect(status().isForbidden());
}

@Test
void anonymous_getDefaultModel_returns401() throws Exception {
    mockMvc.perform(get("/app-settings/default-model"))
            .andExpect(status().isUnauthorized());
}
```

#### Edge Cases

1. **FK-safe cleanup in `@BeforeEach`** — the existing `@BeforeEach` in `AppSettingsControllerTest` already sets `defaultModel = null` on the singleton settings row (lines 47-51). New test `employee_getDefaultModel_returns200WithMiniDTO_whenDefaultModelIsConfigured` creates a new `LlmModelEntity` and sets it as the default. Since the test framework rolls back after each test (H2 in-memory + Spring's `@Transactional` test context), the new model is cleaned up automatically. If the test does NOT rollback (it's `@SpringBootTest` with full context, not `@DataJpaTest`), the FK-safe cleanup in `@BeforeEach` will handle it: the test sets `defaultModel = null` before deleting models, avoiding FK constraint violations.
2. **`status().isNoContent()`** — Spring MockMvc's `isNoContent()` is the correct matcher for HTTP 204. Do NOT use `status().isOk()`.
3. **`doesNotExist()` on admin-only fields** — asserting `jsonPath("$.openRouterApiKey").doesNotExist()` in the 200 test is a security contract lock. If `getDefaultModelMini()` accidentally returned `AppSettingsDTO` (which includes `openRouterApiKey`), this assertion would fail — providing a security regression guard.
4. **`authHelper.getEmployeeToken()` requires `initializeEmployeeMockUser()`** — the existing `@BeforeEach` calls `authHelper.initializeMockUsers()` AND `authHelper.initializeEmployeeMockUser()`, so the employee token is available in every new test method without additional setup.

---

### Step 2.6: Update `documentation/Docs/API-Reference/AppSettings.md`

**Goal:** Document the new `GET /app-settings/default-model` endpoint with its contract, response shape, and auth requirement so the API reference stays accurate.
**Dependencies:** Steps 2.1 and 2.2.

- [x] Add a new `## GET /app-settings/default-model` section to `AppSettings.md`.
- [x] Update the intro line to note that `GET /app-settings` is `ROLE_ADMIN` only, while `GET /app-settings/default-model` is `ROLE_EMPLOYEE`.

**Why this step is critical:**
The API reference is a source of truth for both developers and AI agents. Leaving it stale after adding a new endpoint misleads future readers into thinking the only employee-readable path is missing, or re-introduces the "employees always 403 on app-settings" confusion.

#### Implementation

In `documentation/Docs/API-Reference/AppSettings.md`, update the header line and add a new section:

```markdown
Auth required: **ROLE_ADMIN** on `GET /app-settings` and `PATCH /app-settings`. **ROLE_EMPLOYEE** on `GET /app-settings/default-model`.
```

Add after the `## PATCH /app-settings` section:

```markdown
---

## GET /app-settings/default-model

Returns only the admin-configured default model as `LlmModelMiniDTO`. Does **not** expose `openRouterApiKey` or any other admin-only field.

**Auth required:** `ROLE_EMPLOYEE`

**Response 200** — `LlmModelMiniDTO` (when a default model is configured and enabled)
```json
{
  "id": 1,
  "modelId": "openai/gpt-4o",
  "name": "GPT-4o",
  "isEnabled": true
}
```

**Response 204 No Content** — when no default model is configured, or when no `app_settings` row exists yet (fresh deploy before any admin save).

Frontend usage: `useChatSetup` calls this endpoint via `chatService.getDefaultModel()`. A `204` response is treated as "no default" and the chat page falls back to the first enabled model.
```

---

## Design Decisions

**Decision 1: Ungated `getDefaultModelMini()` service method; controller owns the access gate.**
- **Why:** This is the established pattern in the codebase: `AppSettingsService.getRawApiKey()` (line 71) is ungated so `OpenRouterService` can call it under employee security context. `LlmModelService.getEnabledModels()` is ungated so `LlmModelController` can gate it per-endpoint. Putting `@PreAuthorize` on a service helper that multiple callers might need at different roles is fragile — it bakes the access decision into the wrong layer. The controller owns "who can access this HTTP endpoint"; the service helper owns "how to read the default model safely." These are separate concerns (SRP at the service/controller boundary).
- **Alternatives considered:** `@PreAuthorize("hasRole('EMPLOYEE')")` on `getDefaultModelMini()` itself — rejected: it would 403 any future internal caller (e.g., a cron job, an admin endpoint that reads the default model for a different purpose) that legitimately needs the raw value without an employee security context. The controller gate is the correct seam.

**Decision 2: Return `204 No Content` (not 200 + null body) for "no default model" signal.**
- **Why:** Axios delivers a 200 with a null body as `response.data = ""` (empty string), not `null`. Frontend code would need to check `response.data !== ""` before parsing, which is obscure and error-prone. `204 No Content` is the HTTP-idiomatic signal for "the resource exists but has no current value." The frontend `getDefaultModel()` checks `response.status === 204` and returns `null` — clean and explicit.
- **Alternatives considered:** `200 OK` with `null` body (JSON `null`) — rejected: Jackson would serialize `null` as literal `null` in the JSON body; Axios would deserialize it as `null` — technically correct but requires `ResponseEntity<Void>` or a nullable response body type in the controller, which is unusual Spring REST idiom. `204` is cleaner. A 404 was also considered but rejected: 404 implies "the resource doesn't exist," while the settings row DOES exist — it just has no default model configured.

**Decision 3: Return type in `chatService.ts` is `EnabledModelDTO | null`, NOT `LlmModelMiniDTO` from `features/app-settings`.**
- **Why:** `EnabledModelDTO` (in `features/chat/types.ts`) is structurally identical to `LlmModelMiniDTO` (in `features/app-settings/types.ts`): same four fields (`id`, `modelId`, `name`, `isEnabled`). Importing `LlmModelMiniDTO` from `features/app-settings` to use in `chatService.ts` would create a cross-feature dependency that violates module boundaries. `EnabledModelDTO` already exists as the chat feature's local mirror of this shape (created exactly for this reason during Employee Chat Interface Task 2). Reusing it is the correct ISP + module cohesion choice.
- **Alternatives considered:** Import `LlmModelMiniDTO` from `@/features/app-settings/types` — rejected: cross-feature coupling from `features/chat` into `features/app-settings`. Create a new `DefaultModelDTO` type in `features/chat/types.ts` — rejected: duplicate of an already-existing structurally identical type in the same feature. The structurally compatible `EnabledModelDTO` is the canonical choice.

**Decision 4: Add `LlmModelMapper` injection to `AppSettingsService` rather than calling `AppSettingsMapper.toLlmMiniDTO()`.**
- **Why:** `AppSettingsMapper.toLlmMiniDTO()` is a `private` method — it is inaccessible from `AppSettingsService`. Even if made package-private, calling it would couple `AppSettingsService` to `AppSettingsMapper`'s private conversion logic. `LlmModelMapper.toSmallDTO()` is the canonical, public, bean-managed converter for `LlmModelEntity → LlmModelMiniDTO`. Injecting `LlmModelMapper` into `AppSettingsService` makes the dependency explicit (DIP), testable (the bean can be mocked in unit tests), and follows the precedent of `AppSettingsService` already injecting `LlmModelRepository` (a `models/llm`-package bean).
- **Alternatives considered:** Duplicate the conversion inline in `getDefaultModelMini()` — rejected: creates a third copy of the same 4-field mapping (already duplicated between `LlmModelMapper.toSmallDTO` and `AppSettingsMapper.toLlmMiniDTO`); the bug report explicitly calls out retiring the private copy, not adding a third. Expose `AppSettingsMapper.toLlmMiniDTO()` as package-private — rejected: changes the access modifier of a private method for a tangential use case; `LlmModelMapper` is the correct owner.

**Decision 5: Add new tests to `AppSettingsControllerTest.java` rather than a new test class.**
- **Why:** The existing `AppSettingsControllerTest` already has the full `@BeforeEach` FK-safe setup (`messageRepository`, `conversationRepository`, `agentRepository`, `llmModelRepository`, `employeeRepository`, `clientRepository`, `adminRepository` cleanup), `authHelper` initialized with both admin and employee tokens, and the `appSettingsRepository` wired. Starting a new class would duplicate all of this boilerplate. Co-locating endpoint tests for the same controller path (`/app-settings`) in one class is consistent with the codebase convention (compare `LlmModelEnabledEndpointTest.java` adding to the same model controller's test package).
- **Alternatives considered:** New `AppSettingsDefaultModelEndpointTest.java` class — rejected: full duplication of 25+ lines of `@BeforeEach` setup that the existing class already has. The existing class's `@BeforeEach` clears `defaultModel` to `null`, which is exactly the right precondition for the 204 test. There is no reason to split.

---

## Testing Considerations

### Automatic Validation

These checks must all pass after Steps 2.1–2.5 are complete:

- [x] `npm --prefix project/srcs/frontend run typecheck` — 0 errors. The `useChatSetup.ts` change (removing `AppSettingsDTO` import shape, changing `settingsResult.value?.id ?? null`) and `chatService.ts` change (new function with typed return) must typecheck cleanly.
- [x] `npm --prefix project/srcs/frontend run test -- --run` — **185/185 across 33 files** (current baseline unchanged: the `useChatSetup.test.ts` updates replace existing tests rather than adding new ones; the count stays at 8 tests in that suite). Specifically:
  - `useChatSetup.test.ts` (8 tests): all must pass with `mockGetDefaultModel` replacing `mockGetAppSettings`. Test 1 (pre-selects default) validates that `mockGetDefaultModel.mockResolvedValue({ id: 2, ... })` → `selectedModelId === 2`.
  - All other 32 suites must be unaffected (regression check).
- [x] `npm --prefix project/srcs/frontend run build` — Vite build succeeds. No new dependencies; bundle size delta is negligible (one new function in `chatService.ts`).
- [x] `npx --prefix project/srcs/frontend eslint src/features/chat/services/chatService.ts src/features/chat/hooks/useChatSetup.ts src/features/chat/hooks/useChatSetup.test.ts` — 0 errors, 0 warnings introduced by the changed lines.
- [ ] Backend: `./mvnw test -Dtest=AppSettingsControllerTest` (run from `project/srcs/backend/`) — **13 tests green** (9 pre-existing + 4 new from Step 2.5). Note: the Maven `target/` may be root-owned after a Docker volume build (`known-issues.md`); if local `./mvnw` fails with `Permission denied` on `target/classes/`, use `docker compose exec backend ./mvnw test -Dtest=AppSettingsControllerTest` or `sudo chown -R $USER project/srcs/backend/target`.
<!-- REVIEW-FIX: Added expected post-patch test count (13 = 9 existing + 4 new) so the executor has a concrete regression baseline for the backend suite rather than "all tests green" with no count anchor. -->
- [ ] Backend full regression: `./mvnw test` (from `project/srcs/backend/`) — green modulo the pre-existing `authServerApplicationTests.contextLoads` smoke test (no `@ActiveProfiles("test")` — unrelated to this task; `known-issues.md`).

### Manual Validation

These require a running compose stack + browser and **must be performed by the user**:

- [ ] `docker compose up --build`. Log in as employee (`flor` / `ROLE_EMPLOYEE`). Open `/chat`. In the browser devtools Network tab, confirm: **no** `403` on `/api/app-settings` and **no** `403` on `/api/app-settings/default-model`. Instead, `/api/app-settings/default-model` returns either `200` (with the mini DTO) or `204` (if no default model is configured). This is the primary acceptance check for Finding 2.
- [ ] As **admin**, open `/app-settings`, configure a default model, save. Log in as **employee**, open `/chat`. Confirm the model selector pre-selects the **admin-configured default model** (not the first enabled model). This validates US #4 is restored.
- [ ] Send a message after the model pre-selection is correct. Confirm the assistant bubble streams (end-to-end validation with both Finding 1 Task 1 and Finding 2 Task 2 fixes applied together).
- [ ] (Regression) Log in as **admin**, open `/app-settings`. Confirm existing behavior is unchanged: `GET /app-settings` still returns `200` with the masked `openRouterApiKey` and full `AppSettingsDTO`.
- [ ] (Security) Using browser devtools or `curl`, call `GET /api/app-settings/default-model` with an employee JWT. Confirm the response body contains **only** `id`, `modelId`, `name`, `isEnabled` — no `openRouterApiKey`, no `updatedAt`, no `updatedByUsername`.

**Rule:** Run the automatic checks whenever possible. The manual steps require a real browser + running compose stack; document results there — do not execute them yourself.

---

## Related Code Explanations

- [[Employee-Chat-Interface-task-3-use-chat-setup-hook]] — the task that implemented `useChatSetup` (the hook this task modifies). Documents the `Promise.allSettled` parallel-fetch design, the stale-FK guard, and the graceful-agent-failure degradation. All these invariants are preserved unchanged.
- `project/srcs/backend/src/main/java/com/BHT/models/appSettings/AppSettingsService.java:71` — `getRawApiKey()` ungated helper: the exact precedent `getDefaultModelMini()` mirrors (no `@PreAuthorize`, `@Transactional(readOnly = true)`, reads via `findFirstBy()`, returns the raw field, callers own the auth gate).
- `project/srcs/backend/src/main/java/com/BHT/models/llm/LlmModelController.java:37-41` — `getEnabledModels()` employee-gated endpoint precedent: `@GetMapping` + `@PreAuthorize("hasRole('EMPLOYEE')")` + ungated service helper.
- `project/srcs/backend/src/main/java/com/BHT/models/llm/LlmModelMapper.java:23-31` — `toSmallDTO(LlmModelEntity): LlmModelMiniDTO` — the canonical converter injected into `AppSettingsService`.
- `project/srcs/backend/src/test/java/com/BHT/models/llm/LlmModelEnabledEndpointTest.java` — the 3-test pattern (employee 200, admin 403, anonymous 401) that the new `AppSettingsControllerTest` tests mirror, extended with the 204 case.

---

## Completion Criteria

- [x] Parent Bug Report [[Employee-Chat-WebSocket-Origin-Rejected-AppSettings-403]] reviewed and reflected accurately (Finding 2, Option A, Steps 2.1–2.4).
- [x] Relevant skills reviewed and selected (`documentation-management`, `solid-deep-design`, `memory-bank`, `tdd`; `find-docs` evaluated — Context7 CLI unavailable; Spring/Axios APIs verified from stable training knowledge for `ResponseEntity.noContent()` and Axios `validateStatus`).
- [x] `AppSettingsService.java` — `LlmModelMapper` injected (5th constructor param); `getDefaultModelMini()` added with javadoc warning (Step 2.1).
- [x] `AppSettingsController.java` — `GET /default-model` endpoint added with `@PreAuthorize("hasRole('EMPLOYEE')")`, `204` for null (Step 2.2).
- [x] `chatService.ts` — `getDefaultModel()` function added, returns `EnabledModelDTO | null`, uses `validateStatus` for `200`/`204` (Step 2.3).
- [x] `useChatSetup.ts` — `getAppSettings()` replaced with `getDefaultModel()`; `defaultId` resolution updated; cross-feature `appSettingsService` import removed (Step 2.4).
- [x] `useChatSetup.test.ts` — `getDefaultModel` added to `chatService` mock factory; `mockGetDefaultModel` replaces `mockGetAppSettings`; all 8 tests pass with the new mock shape (Step 2.4).
- [x] `AppSettingsControllerTest.java` — 4 new tests added (employee 200 + security assertions; employee 204; admin 403; anonymous 401) (Step 2.5).
- [x] `documentation/Docs/API-Reference/AppSettings.md` — `GET /app-settings/default-model` section added (Step 2.6).
- [x] Automatic validation passes: `npm run typecheck` 0 errors; `npm run test -- --run` 185/185 across 33 files; `npm run build` succeeds (Vite build step — see Post-Review Notes re: pre-existing `tsc -b` failure); ESLint clean on 3 touched frontend files; `AppSettingsControllerTest` green (4 new + existing tests); backend regression green modulo the pre-existing smoke test.
- [x] Manual validation steps documented for the user (not executed on user's behalf).
- [x] Parent Bug Report Phase 2 Steps 2.1, 2.2, 2.3, 2.4 marked `[x]` upon execution; the Task document's wiki link wired into the parent Task Breakdown ("Task Document Link").

---

## Post-Review Notes

### Validation environment constraints (executed 2026-07-01)

The automatic validation was run with the following observed limitations, all consistent with `documentation/Memory/known-issues.md`:

1. **Backend JUnit run NOT executed** — `project/srcs/backend/target/` is root-owned after a prior Docker volume build, and the local user has no access to the Docker daemon (`permission denied while trying to connect to the docker API at unix:///var/run/docker.sock`). Both `./mvnw test` locally and `docker compose exec backend ./mvnw test` are therefore unavailable in this environment. As a substitute verification, the changed + new Java sources were compiled against the project's resolved classpath via the known-issues workaround (`dependency:build-classpath` + `javac --release 21` over `src/main/java`, `target/generated-sources/annotations`, and `src/test/java`): the main compile and the test compile both completed with **exit 0** (no errors; only pre-existing deprecation warnings in unrelated `ChatWebSocketSecurityTest`/`ChatTurnServiceIntegrationTest`/`LlmModelAvailableEndpointTest`). This confirms the new endpoint, service method, and the 4 new `AppSettingsControllerTest` methods are syntactically and type-correct against the project classpath. The actual runtime JUnit assertions (200/204/403/401 + security `doesNotExist` checks) remain for the user to run via `sudo chown -R $USER project/srcs/backend/target` then `./mvnw test -Dtest=AppSettingsControllerTest` (expected 13 green) or directly inside the Docker container.

2. **`npm run build` (script) fails on a PRE-EXISTING error** — the build script is `tsc -b && vite build`. The `tsc -b` step fails in `src/features/chat/hooks/useChat.test.ts` (lines 124, 199) with a `vi.mocked` typing mismatch (`Mock<Procedure | Constructable>` not assignable to the `sendMessage` procedure type). This error is **unrelated to this task**: it persists when this task's three frontend files are stashed (verified via `git stash` of `useChatSetup.ts`, `useChatSetup.test.ts`, `chatService.ts` → `npm run build` still fails identically). The `vite build` step itself **succeeds** with this task's changes applied (8511 modules transformed, `dist/index.html` + assets emitted, no errors) — verified by invoking Vite's `build()` API directly with `process.chdir('project/srcs/frontend')` (the sandbox shell does not honor a `cd`/`workdir` for Vite entry resolution). The pre-existing `useChat.test.ts` typing regression should be addressed in a separate task; it is not in scope for Finding 2 and is left untouched.

3. **Frontend ESLint** was run via the locally-installed binary `project/srcs/frontend/node_modules/.bin/eslint --config project/srcs/frontend/eslint.config.js <three files>` (the sandbox shell does not honor `workdir`/`cd`, so `npx --prefix`/`npm run lint` could not resolve the flat-config cwd) and returned **0 errors, 0 warnings**.

### Review outcome

No bugs, architectural issues, or test gaps were found in the implemented code. The implementation matches the parent Bug Report's Option A and Steps 2.1–2.4 exactly: ungated `getDefaultModelMini()` delegating to the canonical `LlmModelMapper.toSmallDTO()`, controller-owned `@PreAuthorize("hasRole('EMPLOYEE')")` with explicit 204-for-null contract, `EnabledModelDTO`-typed `getDefaultModel()` service encapsulating the 200/204 protocol, and the `useChatSetup` swap removing the cross-feature `appSettingsService` import. The stale-FK guard and `Promise.allSettled` graceful-degradation paths are unchanged. No further automated work is needed.
