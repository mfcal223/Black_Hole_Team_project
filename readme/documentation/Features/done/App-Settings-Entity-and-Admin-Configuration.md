#high #new-feature #backend

## Feature: AppSettings Entity and Admin Configuration

### Description

Add an `AppSettingsEntity` to the AgentForge backend. This entity is the singleton system-configuration record that the admin uses to set the OpenRouter API key and choose a default LLM model. It is a hard dependency of `OpenRouterService` (which reads the API key from this table at call time) and a soft dependency for `ConversationEntity` (which may inherit the default model from here). Exactly one row ever exists, seeded at startup by `AppSettingsBootstrap`.

Design decisions confirmed during feature creation:
- Route is `/app-settings/**` (own prefix, not under `/admin/**`), protected by `hasRole("ADMIN")` in `SecurityConfig`.
- Singleton enforcement: `AppSettingsBootstrap` seeds the singleton row on first startup via `findFirstBy()`; no insert endpoint is exposed via the API.
- Architecture: custom controller and service — `DefaultController` / `DefaultService` scaffold is not used because AppSettings is not a collection resource.
- The API key is masked in GET responses (last 4 characters visible, rest replaced with `****`).
- `defaultModel` is validated as existing and `isEnabled = true` before saving the FK; `null` in the PATCH form clears the FK.
- `openRouterApiKey` is never cleared implicitly: `null` or blank in the PATCH form keeps the existing key unchanged.
- `updatedBy` FK to `AdminEntity` is included in the MVP for audit purposes, populated via `AuthUserUtil` on every PATCH.
- Package: `models/appSettings/`. `AppSettingsBootstrap` lives in `configuration/boostrap/` (note: package name has a pre-existing typo — missing 't' — matching the actual codebase directory).
- Primary key is `Long` with auto-increment consistent with [[ADRs/ADR-009-long-primary-key-for-all-entities]].

---

## Problem Statement

The admin needs to configure the OpenRouter API key through the dashboard — not via environment variables — so it can be changed at runtime without a redeploy. Without a persisted, admin-editable API key, the entire LLM call chain (`OpenRouterService`) has nothing to authenticate with and cannot make any request. The admin also needs to designate a default LLM model that pre-selects itself when employees start a new conversation.

---

## User Stories

1. As an Admin, I want to retrieve the current application settings via `GET /app-settings`, so that I can inspect the configured API key and default model at any time.
2. As an Admin, I want the API key in the GET response to be masked, so that the full credential is never returned over the wire unnecessarily.
3. As an Admin, I want to update the OpenRouter API key via `PATCH /app-settings`, so that I can rotate or correct the key without redeploying the application.
4. As an Admin, I want the API key to remain unchanged if I send a PATCH without providing it (or with a blank value), so that I can update other settings without accidentally clearing the key.
5. As an Admin, I want to set a default LLM model by providing a `defaultModelId` in the PATCH form, so that new employee conversations automatically pre-select that model.
6. As an Admin, I want the system to reject a `defaultModelId` that refers to a non-existent model, so that broken FK references cannot be saved.
7. As an Admin, I want the system to reject a `defaultModelId` that refers to a disabled model, so that employees are never given a default model they cannot use.
8. As an Admin, I want to clear the default model by sending `null` for `defaultModelId` in a PATCH request, so that I can remove the pre-selection without deleting the model itself.
9. As an Admin, I want the settings record to exist from the first startup of the application, so that `GET /app-settings` always returns a response even before any PATCH has been sent.
10. As an Admin, I want `PATCH /app-settings` to record which admin made the last change in the `updatedBy` field, so that there is an audit trail for settings modifications.
11. As an Admin, I want `updatedAt` to be updated automatically on every PATCH, so that I can see when settings were last changed.
12. As a backend maintainer, I want `/app-settings/**` to require `ROLE_ADMIN` at the HTTP security layer, so that unauthorized access is blocked before reaching the controller.
13. As a backend maintainer, I want `AppSettingsService` to enforce admin-only access with `@PreAuthorize("hasRole('ADMIN')")` on both `getSettings()` and `updateSettings()`, so that the constraint is enforced at the method level independent of route configuration.
14. As a backend maintainer, I want `AppSettingsBootstrap` to be idempotent, so that restarting the application never creates a second settings row or fails if one already exists.
15. As a backend maintainer, I want `OpenRouterService` (future) to be able to call a settings service to retrieve the raw (unmasked) API key, so that LLM calls can authenticate against OpenRouter.
16. As a QA engineer, I want repository tests for `AppSettingsEntity` persistence including nullable FK round-trips, so that the entity mapping and constraint behavior are verified.
17. As a QA engineer, I want mapper tests for the key masking logic and null handling for `defaultModel` and `updatedBy`, so that the DTO contract is verified in isolation.
18. As a QA engineer, I want service integration tests covering all business rules (key preservation, FK clear, enabled model validation, access control), so that the core logic is verified at the service boundary.
19. As a QA engineer, I want controller tests for the HTTP contract including 401 and 403 responses, so that the API surface is verified end-to-end.

---

## Solution

Add a new `AppSettings` slice under `backend/src/main/java/com/agentForgeBackend/models/appSettings/` plus an `AppSettingsBootstrap` in `configuration/boostrap/`. The slice does NOT follow the `DefaultController` / `DefaultService` scaffold because `AppSettings` is a singleton resource, not a collection. The controller exposes exactly two endpoints: `GET /app-settings` and `PATCH /app-settings`. The service always operates on the singleton row via `findFirstBy()`.

### Scope

Impacted workflows and systems:

- New domain module: `models/appSettings/` with entity, DTO, form, mapper, repository, service, controller.
- New bootstrap component: `configuration/boostrap/AppSettingsBootstrap`.
- Security configuration: `/app-settings/**` rule added to the HTTP authorization matrix.
- Admin-facing REST endpoints: `GET /app-settings`, `PATCH /app-settings`.
- Future dependency: `OpenRouterService` will inject `AppSettingsService` (or a dedicated `getApiKey()` method) to retrieve the API key before every LLM call.

Out of scope for this feature:

- `OpenRouterService` — separate feature. This feature only provides the settings store it will read.
- `ConversationEntity` and `MessageEntity` — separate features. The `defaultModel` FK will be consumed there.
- Frontend settings management screens.
- API key encryption at rest (noted as recommended in the roadmap; deferred as a separate security hardening task).

### Affected Systems / Modules

- [[Memory/architecture|Architecture]] — New non-user, non-collection domain entity; no JOINED inheritance; custom service/controller pattern.
- [[Memory/tech|Tech Stack]] — Spring Boot 3.4.1, Spring Security, Spring Data JPA, JUnit 5, H2 test profile.
- [[ADRs/ADR-001-single-llm-provider-openrouter]] — AppSettings holds the OpenRouter API key; this feature is a direct enabler of the OpenRouter integration.
- [[ADRs/ADR-002-openrouter-as-service-not-entity]] — `OpenRouterService` reads the API key from `AppSettingsEntity` at call time; this feature provides that store.
- [[ADRs/ADR-007-admin-curated-llm-model-list]] — `AppSettingsEntity.defaultModel` holds a nullable FK to `LlmModelEntity`; the enabled-model validation in this feature enforces the spirit of ADR-007.
- [[ADRs/ADR-009-long-primary-key-for-all-entities]] — PK type decision (Long auto-increment).
- `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java` — Add `/app-settings/**` to the authorization matrix.
- `backend/src/main/java/com/agentForgeBackend/configuration/boostrap/AdminBoostrap.java` — Structural reference for `AppSettingsBootstrap` (note: both the package and class name contain a pre-existing typo).
- `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelEntity.java` — FK target for `defaultModel`.
- `backend/src/main/java/com/agentForgeBackend/models/hq/admin/AdminEntity.java` — FK target for `updatedBy`.
- `backend/src/main/java/com/agentForgeBackend/shared/tools/AuthUserUtil.java` — Used in `AppSettingsService.updateSettings()` to resolve the authenticated admin for `updatedBy`.

### Impact Analysis

`AppSettingsEntity` introduces two new FK relationships into the existing schema: one to `LlmModelEntity` and one to `AdminEntity`. Both FKs are nullable, so existing rows in those tables are unaffected. The bootstrap seeds a single row with nulls for both optional FKs — this is valid and represents an unconfigured state. The `SecurityConfig` change adds one `requestMatcher` line; it does not modify any existing matcher and cannot affect existing routes.

### Risk Assessment

- **FK to `LlmModelEntity` requires `LlmModelEntity` to exist**: Hibernate will attempt to verify the FK constraint on schema update. Since `LlmModelEntity` already exists, this is safe. The `models/llm/` package must be on the classpath before `models/appSettings/` is introduced — it already is.
- **`updatedBy` FK to `AdminEntity`**: `AdminEntity` uses JOINED inheritance (`base_user` + `admin` tables). The FK column in `app_settings` will point to the `id` in `base_user` (the root table). Hibernate handles this transparently, but tests must ensure the referenced admin ID exists in `base_user` before saving settings.
- **`authUserUtil.getAuthUserAdminEntity()`**: This call assumes the current authenticated principal is an admin. Since `@PreAuthorize("hasRole('ADMIN')")` guards `updateSettings()`, this is always true. However, if the method security annotation is removed accidentally, `getAuthUserAdminEntity()` would return `Optional.empty()` and the `orElseThrow` would throw `ItemNotFoundException`. The service test must cover this guard.
- **Singleton invariant**: The bootstrap is idempotent (`findById(1L).orElseGet(...)`). If two startup events fire concurrently (unlikely but possible in some deployment setups), a unique constraint on `id` (it's the PK) prevents a second row from being inserted. Safe.
- **API key masking length edge case**: If the stored key is shorter than 8 characters, the masking logic must not throw. The mapper must handle short or null keys gracefully (null key → return `null` or empty string, short key → mask entirely).

---

## Implementation Architecture

### Changes Required

#### 1. Security configuration update

**Purpose:** Gate all `/app-settings/**` endpoints at the HTTP layer.

**Changes:**
Add one `requestMatcher` line to `SecurityConfig.securityFilterChain()`, between the existing `/llm-model/**` and `/client/**` matchers:

```java
.requestMatchers("/app-settings/**").hasRole("ADMIN")
```

`backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java`

---

#### 2. `AppSettingsEntity`

**Purpose:** JPA entity representing the singleton system-configuration row.

**Changes:** New file at `backend/src/main/java/com/agentForgeBackend/models/appSettings/AppSettingsEntity.java`.

```java
@Entity
@Table(name = "app_settings")
public class AppSettingsEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "open_router_api_key")
    private String openRouterApiKey;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "default_model_id")
    private LlmModelEntity defaultModel;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by_id")
    private AdminEntity updatedBy;

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
```

Key design notes:
- `openRouterApiKey` is nullable (null = not yet configured).
- `defaultModel` is nullable (null = no default selected).
- `updatedAt` is managed by `@PreUpdate` — not set on initial creation by bootstrap (remains null until first PATCH).
- `updatedBy` is nullable (null = settings never patched by an admin yet).
- No `@PrePersist` — the bootstrap sets fields directly before the initial save.

---

#### 3. `AppSettingsForm`

**Purpose:** PATCH request body. Both fields are optional; absence means "no change" for the key, "clear" for defaultModelId when null.

**Changes:** New file at `backend/src/main/java/com/agentForgeBackend/models/appSettings/AppSettingsForm.java`.

```java
@Getter
@Setter
@NoArgsConstructor
public class AppSettingsForm {
    private String openRouterApiKey;
    private Long defaultModelId;
}
```

No `@NotBlank` on `openRouterApiKey` — blank means "keep existing". No `@NotNull` on `defaultModelId` — null means "clear default model".

---

#### 4. `AppSettingsDTO`

**Purpose:** GET response. API key is masked; `defaultModel` exposes a minimal LlmModel projection; `updatedBy` exposes only the admin's username.

**Changes:** New file at `backend/src/main/java/com/agentForgeBackend/models/appSettings/AppSettingsDTO.java`.

```java
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppSettingsDTO {
    private Long id;
    private String openRouterApiKey;       // masked
    private LlmModelMiniDTO defaultModel;  // reuses existing DTO
    private LocalDateTime updatedAt;
    private String updatedByUsername;      // just the username, not full AdminDTO
}
```

---

#### 5. `AppSettingsMapper`

**Purpose:** Maps `AppSettingsEntity` → `AppSettingsDTO` with key masking. Also applies `AppSettingsForm` fields onto an existing entity (partial update logic).

**Changes:** New file at `backend/src/main/java/com/agentForgeBackend/models/appSettings/AppSettingsMapper.java`.

Key masking rule:
- `null` → return `null`
- length ≤ 8 → return `"****"` (mask entirely)
- length > 8 → return `"****" + key.substring(key.length() - 4)`

This is a standalone `@Component`, not extending `DefaultMapper`.

`updatedAt` is passed through as-is (`entity.getUpdatedAt()`) — no transformation applied. This is null-safe: `LocalDateTime` is returned by value, so a null value (before first PATCH) naturally maps to null in the DTO without NPE.

---

#### 6. `AppSettingsRepository`

**Purpose:** JPA repository for `AppSettingsEntity`. No QueryDSL — there is no list or filter endpoint.

**Changes:** New file at `backend/src/main/java/com/agentForgeBackend/models/appSettings/AppSettingsRepository.java`.

```java
@Repository
public interface AppSettingsRepository extends JpaRepository<AppSettingsEntity, Long> {
    Optional<AppSettingsEntity> findFirstBy();
}
```

---

#### 7. `AppSettingsBootstrap`

**Purpose:** Idempotent startup component that seeds the singleton settings row if it does not exist.

**Changes:** New file at `backend/src/main/java/com/agentForgeBackend/configuration/boostrap/AppSettingsBootstrap.java`.

```java
@Component
public class AppSettingsBootstrap implements CommandLineRunner {

    private final AppSettingsRepository appSettingsRepository;

    public AppSettingsBootstrap(AppSettingsRepository appSettingsRepository) {
        this.appSettingsRepository = appSettingsRepository;
    }

    @Override
    public void run(String... args) {
        appSettingsRepository.findFirstBy().orElseGet(() -> {
            AppSettingsEntity settings = new AppSettingsEntity();
            return appSettingsRepository.save(settings);
        });
    }
}
```

The seeded row has all nullable fields set to null (unconfigured state). The `id` is assigned by the database via auto-increment. Both the bootstrap and the service use `findFirstBy()` to locate the singleton row, making the design safe regardless of the auto-increment sequence state.

---

#### 8. `AppSettingsService`

**Purpose:** Encapsulates all AppSettings business logic. Always operates on the singleton row via `findFirstBy()`. Enforces admin-only access, key preservation, enabled-model validation, and updatedBy population.

**Changes:** New file at `backend/src/main/java/com/agentForgeBackend/models/appSettings/AppSettingsService.java`.

Public interface (3 methods):

```java
@PreAuthorize("hasRole('ADMIN')")
@Transactional(readOnly = true)
public AppSettingsDTO getSettings()

@PreAuthorize("hasRole('ADMIN')")
@Transactional(rollbackFor = {ItemNotFoundException.class, InvalidInsertDetails.class})
public AppSettingsDTO updateSettings(AppSettingsForm form)

@Transactional(readOnly = true)
public String getRawApiKey()
```

Note: `AppSettingsService` uses per-method `@Transactional` annotations (not class-level) because its methods have heterogeneous transaction semantics (read-only vs. read-write). Future methods added to this service must be explicitly annotated.

`updateSettings()` logic:
1. Load `AppSettingsEntity` via `appSettingsRepository.findFirstBy()` (throw `ItemNotFoundException` if missing — bootstrap guarantees this won't happen in production).
2. If `form.getOpenRouterApiKey()` is not blank → update `openRouterApiKey`.
3. If `form.getDefaultModelId()` is not null → validate model exists and `isEnabled = true`; if not found throw `ItemNotFoundException`; if disabled throw `InvalidInsertDetails`; then set FK.
4. If `form.getDefaultModelId()` is null → set `defaultModel` to null (clear FK).
5. Resolve current admin from `authUserUtil.getAuthUserAdminEntity().orElseThrow(() -> new ItemNotFoundException("Authenticated admin not found"))` → set `updatedBy`.
6. Save entity → `@PreUpdate` sets `updatedAt`.
7. Return `mapper.toDTO(savedEntity)`.

The service also needs a `public String getRawApiKey()` method with **no `@PreAuthorize` annotation**. This is an internal service method for backend consumers (e.g., future `OpenRouterService`) that must be callable under any authenticated security context, including `ROLE_EMPLOYEE`. Adding `@PreAuthorize("hasRole('ADMIN')")` would break all employee-triggered LLM calls. This method bypasses DTO mapping and returns the raw string directly. If the API key has not been configured (null in the database), this method returns `null` — `OpenRouterService` is responsible for null-checking before making HTTP calls. If a second settings consumer is ever introduced, extract a `SettingsReader` interface at that point (not before — one adapter = hypothetical seam).

---

#### 9. `AppSettingsController`

**Purpose:** Exposes `GET /app-settings` and `PATCH /app-settings`. No path variable — singleton resource.

**Changes:** New file at `backend/src/main/java/com/agentForgeBackend/models/appSettings/AppSettingsController.java`.

```java
@RestController
@RequestMapping("/app-settings")
public class AppSettingsController {

    private final AppSettingsService appSettingsService;

    public AppSettingsController(AppSettingsService appSettingsService) {
        this.appSettingsService = appSettingsService;
    }

    @GetMapping
    public ResponseEntity<AppSettingsDTO> getSettings() throws ItemNotFoundException {
        return ResponseEntity.ok(appSettingsService.getSettings());
    }

    @PatchMapping
    public ResponseEntity<AppSettingsDTO> updateSettings(@RequestBody AppSettingsForm form)
            throws ItemNotFoundException, InvalidInsertDetails {
        return ResponseEntity.ok(appSettingsService.updateSettings(form));
    }
}
```

Note: `@Valid` is not used on the PATCH form — neither field has validation constraints (all fields are intentionally optional).

---

## Implementation Steps

### Phase 1: Security Baseline

- [x] **Step 1.1:** Add `.requestMatchers("/app-settings/**").hasRole("ADMIN")` to `SecurityConfig.securityFilterChain()` between the `/llm-model/**` and `/client/**` matchers.
- [x] **Step 1.2:** Write security tests in `SecurityAuthorizationTest`: anonymous → 401, employee → 403, admin → 2xx for both `GET /app-settings` and `PATCH /app-settings`.

### Phase 2: Domain Foundation

- [x] **Step 2.1:** Create `AppSettingsEntity` with all fields, FK annotations (`@ManyToOne` to `LlmModelEntity` and `AdminEntity`), and `@PreUpdate`.
- [x] **Step 2.2:** Create `AppSettingsForm` (two optional fields, no validation annotations).
- [x] **Step 2.3:** Create `AppSettingsDTO` (masked key, `LlmModelMiniDTO` for defaultModel, `updatedByUsername` String).
- [x] **Step 2.4:** Create `AppSettingsMapper` as `@Component` with `toDTO()` (masking logic) and `applyForm()` (partial update logic).
- [x] **Step 2.5:** Create `AppSettingsRepository` extending `JpaRepository<AppSettingsEntity, Long>`.
- [x] **Step 2.6:** Create `AppSettingsBootstrap` implementing `CommandLineRunner`; seeds the singleton row idempotently via `findFirstBy()`.
- [x] **Step 2.7:** Write `AppSettingsRepositoryTest`: save entity with null FKs, save with valid `LlmModelEntity` FK, save with valid `AdminEntity` FK, verify `@PreUpdate` sets `updatedAt`.
- [x] **Step 2.8:** Write `AppSettingsMapperTest`: null key → null, short key → `"****"`, long key → masked, non-null defaultModel → correct `LlmModelMiniDTO`, null defaultModel → null in DTO, updatedBy username mapping, null `updatedAt` → `null` in DTO (no NPE).

### Phase 3: Business Rules, Service and Controller

- [x] **Step 3.1:** Create `AppSettingsService` with `getSettings()`, `updateSettings(form)`, and `getRawApiKey()`. Implement all business rules: key preservation, FK clear on null, enabled-model validation, `updatedBy` population.
- [x] **Step 3.2:** Create `AppSettingsController` with `GET /app-settings` and `PATCH /app-settings`.
- [x] **Step 3.3:** Write `AppSettingsServiceIntegrationTest`:
  - `getSettings()` returns DTO from seeded row.
  - `updateSettings()` with new API key updates the key.
  - `updateSettings()` with blank/null API key keeps existing key.
  - `updateSettings()` with valid enabled `defaultModelId` sets FK.
  - `updateSettings()` with null `defaultModelId` clears FK.
  - `updateSettings()` with non-existent `defaultModelId` throws `ItemNotFoundException`.
  - `updateSettings()` with disabled model `defaultModelId` throws `InvalidInsertDetails`.
  - Employee role → `AccessDeniedException` on `getSettings()`.
  - Employee role → `AccessDeniedException` on `updateSettings()`.
- [x] **Step 3.4:** Write `AppSettingsControllerTest`:
  - `GET /app-settings` with admin JWT → 200, masked key in body.
  - `PATCH /app-settings` with admin JWT and valid form → 200, updated fields in body.
  - Anonymous `GET` → 401.
  - Anonymous `PATCH` → 401.
  - Employee `GET` → 403.
  - Employee `PATCH` → 403.

### Phase 4: Regression and Supplemental Coverage

- [x] **Step 4.1:** Run full test suite; verify no regressions against the 507-test baseline. Add any edge-case tests discovered during implementation (e.g., `updatedAt` null on initial GET before first PATCH, masking boundary at exactly 8 characters, concurrent PATCH safety).

---

## Potential Issues / Risks

- **`id = 1` assumption — RESOLVED**: The original design assumed `findById(1L)` would always find the singleton row. This was fragile under `GenerationType.IDENTITY` if the sequence advanced. Fixed by using `findFirstBy()` in both the bootstrap and the service, which is sequence-agnostic and always finds the only row. ADR-009 remains intact.
- **`@PreUpdate` not fired on initial save**: The bootstrap saves a new entity with `save()`, which triggers `@PrePersist` (if defined) but not `@PreUpdate`. `updatedAt` will be null until the first PATCH. `GET /app-settings` must handle null `updatedAt` gracefully in the DTO/mapper.
- **Disabled model as `defaultModel`**: If an admin sets a valid enabled model as default and then disables that model, the `defaultModel` FK goes stale (points to a disabled model). This feature does not auto-null the FK when a model is disabled. The admin must manually clear `defaultModel` if they disable it. Document this in the admin UI tooltip (future work).
- **`AuthUserUtil` in service tests**: Integration tests running with `@WithMockUser` or JWT-based auth must ensure the mocked principal resolves to a valid `AdminEntity` in the H2 database, since `authUserUtil.getAuthUserAdminEntity()` queries the database. Use `TestAuthenticationHelper` patterns from the existing test suite.
- **Bootstrap package naming inconsistency**: The `configuration/boostrap/` package contains a pre-existing typo (missing 't'). `AppSettingsBootstrap` uses the correct class name spelling while its sibling `AdminBoostrap` does not. This is intentional — new classes use correct spelling, legacy classes retain their names. A future standalone cleanup task should rename the package to `configuration/bootstrap/` and `AdminBoostrap` to `AdminBootstrap`.
- **`getRawApiKey()` has no `@PreAuthorize`**: Unlike `getSettings()` and `updateSettings()`, the `getRawApiKey()` method intentionally omits `@PreAuthorize`. This deviates from the codebase convention of annotating every public service method. The deviation is necessary because `OpenRouterService` calls this method under employee security context (`ROLE_EMPLOYEE`), and admin-only authorization would break all employee-triggered LLM calls. Do not add `@PreAuthorize` to this method. If a future developer adds it for consistency, employee LLM calls will silently fail with 403.

---

## Testing Decisions

**What makes a good test here:** Tests verify behavior through the public interface — they call service methods or HTTP endpoints and assert on observable outputs (returned DTOs, persisted state, thrown exceptions). Tests do not mock the repository or mapper inside service tests — they use H2 and let the full stack run.

**Modules with tests:**
- `AppSettingsRepositoryTest` — H2 integration test, verifies entity persistence and FK constraints.
- `AppSettingsMapperTest` — unit test, verifies masking logic and null-safety.
- `AppSettingsServiceIntegrationTest` — H2 integration test with Spring context, verifies all business rules and `@PreAuthorize` guards.
- `AppSettingsControllerTest` — Spring MockMvc test with JWT authentication, verifies HTTP contract.
- `SecurityAuthorizationTest` — existing test class, extended with `/app-settings` security assertions.

**Prior art:** `LlmModelServiceCrudIntegrationTest`, `LlmModelMapperTest`, `LlmModelControllerTest`, `SecurityAuthorizationTest` — same structure and helper patterns apply.

---

## Task Breakdown

### Task 1: Security Baseline
- **Steps Covered:** Step 1.1, Step 1.2
- **Reason for Grouping:** The security gate and its tests are a self-contained TDD slice (red-green on the security rule). Consistent with how every prior feature started.
- **Planned Task File:** `App-Settings-Entity-and-Admin-Configuration-step-1-security-baseline.md`
- **Task Document Link:** [[App-Settings-Entity-and-Admin-Configuration-step-1-security-baseline]]

### Task 2: Domain Foundation
- **Steps Covered:** Steps 2.1–2.8
- **Reason for Grouping:** Entity, form, DTO, mapper, repository, and bootstrap are foundational — none can be tested without the others existing. Repository and mapper tests close out this task.
- **Planned Task File:** `App-Settings-Entity-and-Admin-Configuration-step-2-domain-foundation.md`
- **Task Document Link:** [[App-Settings-Entity-and-Admin-Configuration-step-2-domain-foundation]]

### Task 3: Business Rules, Service and Controller
- **Steps Covered:** Steps 3.1–3.4
- **Reason for Grouping:** Service and controller are tightly coupled — the controller delegates entirely to the service, and both are tested together in a single TDD pass.
- **Planned Task File:** `App-Settings-Entity-and-Admin-Configuration-step-3-service-and-controller.md`
- **Task Document Link:** [[App-Settings-Entity-and-Admin-Configuration-step-3-service-and-controller]]

### Task 4: Regression and Supplemental Coverage
- **Steps Covered:** Step 4.1
- **Reason for Grouping:** Final regression sweep after all production code exists. Catches gaps and confirms the test suite baseline has grown correctly.
- **Planned Task File:** `App-Settings-Entity-and-Admin-Configuration-step-4-regression-coverage.md`
- **Task Document Link:** [[App-Settings-Entity-and-Admin-Configuration-step-4-regression-coverage]]
