# Task: Business Rules, Service, and Controller for AppSettings

#task #current #high-complexity #parent-app-settings-entity-and-admin-configuration

**Parent:** [[App-Settings-Entity-and-Admin-Configuration]]
**Parent Type:** Feature
**Related Step(s):** Phase 3 — Steps 3.1–3.4
**Estimated Complexity:** High

---

## Goal

Implement `AppSettingsService` (3 public methods, all business rules), `AppSettingsController` (two singleton-resource endpoints), update `SecurityAuthorizationTest` to reflect the newly wired controller, and validate with service integration tests and controller tests. After this task, `GET /app-settings` and `PATCH /app-settings` are fully operational and all Phase 3 coverage is in place.

---

## Parent Context

The feature designates Task 3 as the business logic and HTTP-surface closure. The service and controller are tightly coupled — the controller is a thin delegator; the service encapsulates all business rules. The parent mandates:

- `AppSettingsService` is a **custom service** — does NOT extend `DefaultServiceImplements` because AppSettings is a singleton resource, not a collection.
- **Three public methods:**
  - `getSettings()` — `@PreAuthorize("hasRole('ADMIN')")` + `@Transactional(readOnly = true)`
  - `updateSettings(AppSettingsForm form)` — `@PreAuthorize("hasRole('ADMIN')")` + `@Transactional(rollbackFor = {ItemNotFoundException.class, InvalidInsertDetails.class})`
  - `getRawApiKey()` — **no `@PreAuthorize`** + `@Transactional(readOnly = true)` — internal backend consumer for future `OpenRouterService`; must be callable under EMPLOYEE security context
- **Per-method `@Transactional`** (not class-level) — methods have heterogeneous transaction semantics.
- **`updateSettings()` business rules:**
  1. Load entity via `findFirstBy()` — throw `ItemNotFoundException` if missing.
  2. If `form.getOpenRouterApiKey()` is not blank → update `openRouterApiKey`.
  3. If `form.getDefaultModelId()` is not null → validate model exists + `isEnabled = true`; throw `ItemNotFoundException` if not found; throw `InvalidInsertDetails` if disabled; then set FK.
  4. If `form.getDefaultModelId()` is null → clear FK (set `defaultModel` to null).
  5. Resolve current admin from `authUserUtil.getAuthUserAdminEntity().orElseThrow(...)` → set `updatedBy`.
  6. Save entity → `@PreUpdate` sets `updatedAt`.
  7. Return `mapper.toDTO(savedEntity)`.
- **`getRawApiKey()` has no `@PreAuthorize`** — intentional deviation. Do not add `@PreAuthorize`; it would break future employee-triggered LLM calls.
- `AppSettingsController` exposes exactly `GET /app-settings` and `PATCH /app-settings`. No path variable. No `@Valid` on the PATCH form.
- `SecurityAuthorizationTest` — 2 existing tests must be updated from `isNotFound()` to `isOk()` once the controller is wired.

---

## Preconditions / Dependencies

- **Task 1 complete**: `/app-settings/**` gated as `hasRole("ADMIN")` in `SecurityConfig`. ✓
- **Task 2 complete**: All domain types compiled and tested:
  - `AppSettingsEntity`, `AppSettingsForm`, `AppSettingsDTO`, `AppSettingsMapper` (with masking), `AppSettingsRepository` (`findFirstBy()`), `AppSettingsBootstrap` (singleton row seeded at context startup).
- **555 tests** (278 unique × 2 surefire runs - 1 pre-existing Docker error `authServerApplicationTests.contextLoads`), 0 failures.
- `LlmModelRepository` available — `findById(Long)` used for FK validation in the service.
- `AuthUserUtil` available — `getAuthUserAdminEntity()` resolves current admin from security context.
- `TestAuthenticationHelper` available in `testUtils/` — persists admin/employee users in H2 and issues real JWT tokens for integration tests.
- `@SpringBootTest` contexts execute `AppSettingsBootstrap.run()` at startup, pre-seeding the singleton `app_settings` row.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — Selected — task template, directory placement, naming convention.
- `solid-deep-design` — Selected — `AppSettingsService` is a deep module: 3-method interface hides singleton lookup + 5-rule business logic + FK validation + auth resolution + DTO mapping. `AppSettingsController` is a shallow delegator (intentional HTTP adapter). DIP: service depends on `AppSettingsRepository` (interface), `LlmModelRepository` (interface), `AppSettingsMapper` (@Component), `AuthUserUtil` (@Component) — all injected. `LlmModelRepository` is used directly (not `LlmModelService`) to keep cross-service coupling minimal.
- `tdd` — Selected — service integration tests verify each business rule through the public service interface, one behavior per test. Controller tests verify the HTTP contract through MockMvc. No mocks inside integration tests — H2 + real dependencies.
- `memory-bank` — Selected — confirmed 555-test baseline, confirmed domain types from Task 2 exist, confirmed `TestAuthenticationHelper` patterns for `updatedBy` setup, confirmed `@WithMockUser` + real-DB admin pattern works because `authUserUtil.getAuthUserAdminEntity()` queries by username.
- `glossary-management` — Not needed — no new domain terms.
- `find-docs` — Selected — verified `@PreAuthorize` method-level enforcement with `@EnableMethodSecurity`, `@Transactional(rollbackFor)` semantics for checked exceptions, and `AccessDeniedException` test behavior against Spring Boot 3.4.1 / Spring Security 6.x docs.

### Documentation Reviewed

- `documentation/Features/to-do/App-Settings-Entity-and-Admin-Configuration.md` — Sections 8 and 9 (AppSettingsService and AppSettingsController specifications)
- `documentation/Tasks/current/App-Settings-Entity-and-Admin-Configuration-step-2-domain-foundation.md` — Task 2 completion state; all domain type signatures confirmed
- `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelService.java` — Prior art for per-method `@PreAuthorize` + `@Transactional` without class-level annotation; constructor injection pattern
- `backend/src/test/java/com/agentForgeBackend/models/llm/LlmModelServiceCrudIntegrationTest.java` — Service integration test pattern: `@SpringBootTest`, `@WithMockUser` class-level with method-level overrides for role tests
- `backend/src/test/java/com/agentForgeBackend/models/llm/LlmModelControllerTest.java` — Controller test pattern: `@SpringBootTest @AutoConfigureMockMvc`, MockMvc + JSONPath assertions
- `backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java` — Contains 2 app-settings tests that need updating (`isNotFound()` → `isOk()`) in Step 3
- `backend/src/test/java/com/agentForgeBackend/testUtils/TestAuthenticationHelper.java` — `initializeMockUsers()` persists admin with `username = "admin@test.com"`; `getAdminToken()` returns real JWT

### Related Existing Code

- `backend/src/main/java/com/agentForgeBackend/models/appSettings/AppSettingsRepository.java` — `findFirstBy()` for singleton row access
- `backend/src/main/java/com/agentForgeBackend/models/appSettings/AppSettingsMapper.java` — `toDTO()` with API key masking
- `backend/src/main/java/com/agentForgeBackend/models/appSettings/AppSettingsEntity.java` — `@PreUpdate` lifecycle + 2 nullable FKs
- `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelRepository.java` — `findById(Long)` for FK validation (inherits from `DefaultRepository` → `JpaRepository`)
- `backend/src/main/java/com/agentForgeBackend/shared/tools/AuthUserUtil.java:23` — `getAuthUserAdminEntity()` resolves the authenticated username via `BaseUserRepository`
- `backend/src/main/java/com/agentForgeBackend/exceptions/ItemNotFoundException.java` — Checked exception for missing singleton row and non-existent model
- `backend/src/main/java/com/agentForgeBackend/exceptions/InvalidInsertDetails.java` — Checked exception for disabled model

---

## Implementation Details

### Approach

Four steps in order: (1) production code (service → controller), (2) update `SecurityAuthorizationTest`, (3) service integration tests, (4) controller tests.

**TDD approach:** The service has complex multi-rule `updateSettings()` logic that benefits from seeing the complete structure before writing tests. Production code is written first; tests are then written one-behavior-at-a-time through the public interface.

**SOLID / Depth analysis:**

| Module | Interface size | Implementation depth | Verdict |
|--------|---------------|---------------------|---------|
| `AppSettingsService` | 3 public methods | Singleton lookup, 5-rule update, FK validation, auth resolution, DTO mapping | Deep |
| `AppSettingsController` | 2 HTTP endpoints | Thin delegation to `AppSettingsService` | Shallow — intentional HTTP adapter |

**Key design notes:**
- `LlmModelRepository` is injected directly (not `LlmModelService`) — FK validation requires only `findById` + `isEnabled` check; pulling `LlmModelService` would couple two services unnecessarily and expose `AppSettingsService` to `@PreAuthorize` constraints on `LlmModelService` methods.
- `getRawApiKey()` returns `null` when key is not configured — `OpenRouterService` is responsible for null-checking; `AppSettingsService` should not decide the LLM call failure mode.

### Files to Create/Modify

- [x] `backend/src/main/java/com/agentForgeBackend/models/appSettings/AppSettingsService.java` — **CREATE** — 3-method singleton service with all business rules
- [x] `backend/src/main/java/com/agentForgeBackend/models/appSettings/AppSettingsController.java` — **CREATE** — REST controller with `GET` and `PATCH` endpoints
- [x] `backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java` — **MODIFY** — update 2 app-settings admin assertions from `isNotFound()` to `isOk()`; add `AppSettingsRepository` field and `updatedBy` FK clear to `@BeforeEach`
- [x] `backend/src/test/java/com/agentForgeBackend/models/appSettings/AppSettingsServiceIntegrationTest.java` — **CREATE** — 15 integration tests for all service business rules and access control
- [x] `backend/src/test/java/com/agentForgeBackend/models/appSettings/AppSettingsControllerTest.java` — **CREATE** — 8 MockMvc controller tests for HTTP contract

---

## Step-by-Step Implementation

### Step 1: Create AppSettingsService

**Goal:** Implement the 3-method service that owns all AppSettings business rules.

**Dependencies:** All Task 2 domain types. `LlmModelRepository` and `AuthUserUtil` already exist.

**Why this step is critical:** The service is the single locus of all business rules. Every other step in this task depends on it compiling correctly.

- [x] Create `backend/src/main/java/com/agentForgeBackend/models/appSettings/AppSettingsService.java`

#### Implementation

```java
package com.agentForgeBackend.models.appSettings;

import com.agentForgeBackend.exceptions.InvalidInsertDetails;
import com.agentForgeBackend.exceptions.ItemNotFoundException;
import com.agentForgeBackend.models.llm.LlmModelEntity;
import com.agentForgeBackend.models.llm.LlmModelRepository;
import com.agentForgeBackend.shared.tools.AuthUserUtil;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AppSettingsService {

    private final AppSettingsRepository appSettingsRepository;
    private final LlmModelRepository llmModelRepository;
    private final AppSettingsMapper mapper;
    private final AuthUserUtil authUserUtil;

    public AppSettingsService(
            AppSettingsRepository appSettingsRepository,
            LlmModelRepository llmModelRepository,
            AppSettingsMapper mapper,
            AuthUserUtil authUserUtil
    ) {
        this.appSettingsRepository = appSettingsRepository;
        this.llmModelRepository = llmModelRepository;
        this.mapper = mapper;
        this.authUserUtil = authUserUtil;
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public AppSettingsDTO getSettings() throws ItemNotFoundException {
        AppSettingsEntity settings = appSettingsRepository.findFirstBy()
                .orElseThrow(() -> new ItemNotFoundException("App settings not found"));
        return mapper.toDTO(settings);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(rollbackFor = {ItemNotFoundException.class, InvalidInsertDetails.class})
    public AppSettingsDTO updateSettings(AppSettingsForm form)
            throws ItemNotFoundException, InvalidInsertDetails {
        AppSettingsEntity settings = appSettingsRepository.findFirstBy()
                .orElseThrow(() -> new ItemNotFoundException("App settings not found"));

        if (form.getOpenRouterApiKey() != null && !form.getOpenRouterApiKey().isBlank()) {
            settings.setOpenRouterApiKey(form.getOpenRouterApiKey());
        }

        if (form.getDefaultModelId() != null) {
            LlmModelEntity model = llmModelRepository.findById(form.getDefaultModelId())
                    .orElseThrow(() -> new ItemNotFoundException("LLM model not found"));
            if (!model.getIsEnabled()) {
                throw new InvalidInsertDetails("Default model must be enabled");
            }
            settings.setDefaultModel(model);
        } else {
            settings.setDefaultModel(null);
        }

        settings.setUpdatedBy(
                authUserUtil.getAuthUserAdminEntity()
                        .orElseThrow(() -> new ItemNotFoundException("Authenticated admin not found"))
        );

        return mapper.toDTO(appSettingsRepository.save(settings));
    }

    @Transactional(readOnly = true)
    public String getRawApiKey() {
        return appSettingsRepository.findFirstBy()
                .map(AppSettingsEntity::getOpenRouterApiKey)
                .orElse(null);
    }
}
```

#### Edge Cases

1. **`form.getOpenRouterApiKey()` is `""` (empty)** — `"".isBlank()` is `true`; the key is NOT updated. Empty string means "no change", same as null.

2. **`form.getDefaultModelId()` is null** — The `else` branch sets `defaultModel` to null. Hibernate nulls the `default_model_id` column on save. This is the "clear FK" path.

3. **`model.getIsEnabled()` unboxing** — `LlmModelEntity.isEnabled` is `Boolean isEnabled = true` with `@Column(nullable = false)`. A DB-loaded entity never has null `isEnabled`. Unboxing `!model.getIsEnabled()` is safe for any entity loaded from the database.

4. **Lazy FK proxies inside `@Transactional`** — `mapper.toDTO()` accesses `entity.getDefaultModel()` and `entity.getUpdatedBy()` (lazy). Both `getSettings()` and `updateSettings()` run inside a transaction, so Hibernate proxies resolve without `LazyInitializationException`.

5. **`@PreUpdate` fires on `save(settings)`** — `save()` on a managed entity issues an UPDATE, which triggers `@PreUpdate` on `AppSettingsEntity`, setting `updatedAt`. No explicit `setUpdatedAt()` call needed.

6. **`getRawApiKey()` has no `@PreAuthorize`** — Intentional. Accessible to any authenticated user including `ROLE_EMPLOYEE`. Do not add `@PreAuthorize` — it would silently break future LLM calls made by employees.

---

### Step 2: Create AppSettingsController

**Goal:** Expose `GET /app-settings` and `PATCH /app-settings` as a singleton REST resource with thin delegation to `AppSettingsService`.

**Dependencies:** `AppSettingsService` (Step 1).

- [x] Create `backend/src/main/java/com/agentForgeBackend/models/appSettings/AppSettingsController.java`

#### Implementation

```java
package com.agentForgeBackend.models.appSettings;

import com.agentForgeBackend.exceptions.InvalidInsertDetails;
import com.agentForgeBackend.exceptions.ItemNotFoundException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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

#### Edge Cases

1. **`ItemNotFoundException` from `getSettings()`** — Bootstrap guarantees the row exists in production. If it doesn't, `GlobalExceptionHandler` returns HTTP 404.

2. **`InvalidInsertDetails` from `updateSettings()`** — `GlobalExceptionHandler` returns HTTP 400 with `{ "error": "Invalid Details", "message": "..." }`.

3. **No `@Valid`** — `AppSettingsForm` has no Bean Validation constraints. All fields are intentionally optional. A malformed JSON body raises `HttpMessageNotReadableException`, handled by `GlobalExceptionHandler` as HTTP 400.

4. **`@RequestBody` receives `{}`** — Deserializes to `AppSettingsForm` with both fields null. The service preserves the existing key and clears the `defaultModel` FK. This is the intended "touch nothing on key, clear model" behavior.

   **Why the null + blank guard is correct:** `null` → `!= null` is `false` → key not updated. `""` → `!= null` is `true` but `"".isBlank()` is `true` → key not updated. Both branches preserve the existing key, matching the Service Edge Case 1 specification. The two-clause guard is intentional and already correct. ✓

---

### Step 3: Update SecurityAuthorizationTest

**Goal:** Update 2 existing `app-settings` admin assertions in `SecurityAuthorizationTest` from `isNotFound()` to `isOk()`, now that the controller is wired.

**Dependencies:** `AppSettingsController` (Step 2) compiled and on the classpath.

- [x] Open `backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java`
- [x] Add `@Autowired AppSettingsRepository appSettingsRepository;` to the class fields (alongside the existing `adminRepository`, `employeeRepository`, `clientRepository` autowired fields)
- [x] At the **start** of `@BeforeEach` (before any `deleteAll()` calls), add the FK clear block:
  ```java
  appSettingsRepository.findFirstBy().ifPresent(s -> {
      s.setUpdatedBy(null);
      appSettingsRepository.saveAndFlush(s);
  });
  ```
- [x] In `adminGetToAppSettingsPassesSecurity()`: change `isNotFound()` to `isOk()` and remove the stale comment explaining the 404
- [x] In `adminPatchToAppSettingsPassesSecurity()`: change `isNotFound()` to `isOk()` and remove the stale comment
- [x] Run `./mvnw test -Dtest=SecurityAuthorizationTest` from `backend/` — confirm 15/15 pass, 0 failures

#### Implementation

`adminGetToAppSettingsPassesSecurity()` — change:
```java
// BEFORE
.andExpect(status().isNotFound());

// AFTER
.andExpect(status().isOk());
```

`adminPatchToAppSettingsPassesSecurity()` — change:
```java
// BEFORE
.andExpect(status().isNotFound());

// AFTER
.andExpect(status().isOk());
```

Both tests also have a multi-line comment block starting "// Security passes for ADMIN; no controller exists yet..." — remove it entirely.

#### Edge Cases

1. **`PATCH /app-settings` with `{}` returns 200 after Task 3** — `SecurityAuthorizationTest.@BeforeEach` calls `authHelper.initializeMockUsers()`, which persists an admin with `username = "admin@test.com"`. The admin JWT carries that username. `AuthUserUtil.getAuthUserAdminEntity()` finds the admin in H2. The empty form preserves the key and clears the (already null) FK. The service saves and returns 200. ✓

2. **No new tests added in this step** — Only 2 existing assertions are modified. Total test count remains 555 after Step 3.

3. <!-- REVIEW-FIX: Added FK clear to prevent H2 FK constraint violation across test methods -->
   **`app_settings.updated_by_id` FK constraint risk in `@BeforeEach`** — `adminPatchToAppSettingsPassesSecurity()` calls `PATCH /app-settings` with an admin JWT, which triggers `updateSettings()` and sets `app_settings.updated_by_id` to the admin's PK. H2 (in MySQL mode) enforces FK constraints. If JUnit runs `adminPatchToAppSettingsPassesSecurity()` before another test in this class, the next `@BeforeEach` will call `adminRepository.deleteAll()` while `app_settings.updated_by_id` still references that admin → FK constraint violation. The fix: clear `app_settings.updated_by_id` at the START of every `@BeforeEach` before any `deleteAll()` runs. Only `updatedBy` needs clearing; `defaultModel` is never set within `SecurityAuthorizationTest`.

---

### Step 4: Write AppSettingsServiceIntegrationTest

**Goal:** Verify all 14 service business rules through the `AppSettingsService` public interface using H2 with a real Spring context.

**Dependencies:** Steps 1–3 complete.

**Auth setup challenge:** `updateSettings()` calls `authUserUtil.getAuthUserAdminEntity()`, which queries `BaseUserRepository` by the authenticated username. Tests use `@WithMockUser(username = "admin@test.com", roles = "ADMIN")` at class level. `@BeforeEach` calls `authHelper.initializeMockUsers()`, which persists an `AdminEntity` with `username = "admin@test.com"` in H2. When `getAuthUserAdminEntity()` runs, it finds that admin. ✓

**App settings reset:** `@BeforeEach` resets the seeded settings row to null state before every test. Resetting via `saveAndFlush` triggers `@PreUpdate` (setting `updatedAt`), which is acceptable — no test in this class requires `updatedAt` to be null before the operation under test.

**FK deletion order:** The `@BeforeEach` clears FK references in `app_settings` BEFORE deleting the referenced entities (`LlmModelEntity`, `AdminEntity`) to avoid FK constraint violations in H2.

- [x] Create `backend/src/test/java/com/agentForgeBackend/models/appSettings/AppSettingsServiceIntegrationTest.java`
- [x] Write 15 tests per the behaviors below
- [x] Run `./mvnw test -Dtest=AppSettingsServiceIntegrationTest` from `backend/` — confirm 15/15 pass

#### Implementation

```java
package com.agentForgeBackend.models.appSettings;

import com.agentForgeBackend.exceptions.InvalidInsertDetails;
import com.agentForgeBackend.exceptions.ItemNotFoundException;
import com.agentForgeBackend.models.hq.admin.AdminRepository;
import com.agentForgeBackend.models.hq.client.ClientRepository;
import com.agentForgeBackend.models.hq.employee.EmployeeRepository;
import com.agentForgeBackend.models.llm.LlmModelEntity;
import com.agentForgeBackend.models.llm.LlmModelRepository;
import com.agentForgeBackend.testUtils.TestAuthenticationHelper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@WithMockUser(username = "admin@test.com", roles = "ADMIN")
class AppSettingsServiceIntegrationTest {

    @Autowired private AppSettingsService appSettingsService;
    @Autowired private AppSettingsRepository appSettingsRepository;
    @Autowired private LlmModelRepository llmModelRepository;
    @Autowired private AdminRepository adminRepository;
    @Autowired private EmployeeRepository employeeRepository;
    @Autowired private ClientRepository clientRepository;
    @Autowired private TestAuthenticationHelper authHelper;

    @BeforeEach
    void setUp() {
        // 1. Clear FK references in app_settings before deleting referenced entities
        appSettingsRepository.findFirstBy().ifPresent(settings -> {
            settings.setOpenRouterApiKey(null);
            settings.setDefaultModel(null);
            settings.setUpdatedBy(null);
            appSettingsRepository.saveAndFlush(settings);
        });

        // 2. Delete related entities (FK references cleared above)
        llmModelRepository.deleteAll();
        llmModelRepository.flush();
        employeeRepository.deleteAll();
        employeeRepository.flush();
        clientRepository.deleteAll();
        clientRepository.flush();
        adminRepository.deleteAll();
        adminRepository.flush();

        // 3. Re-initialize auth users; creates admin with username "admin@test.com" in H2
        authHelper.initializeMockUsers();
        authHelper.initializeEmployeeMockUser();
    }

    // --- getSettings() ---

    @Test
    void getSettingsReturnsDTOWithNullKeyWhenNotConfigured() throws ItemNotFoundException {
        AppSettingsDTO dto = appSettingsService.getSettings();

        assertThat(dto).isNotNull();
        assertThat(dto.getId()).isNotNull();
        assertThat(dto.getOpenRouterApiKey()).isNull();
        assertThat(dto.getDefaultModel()).isNull();
        assertThat(dto.getUpdatedByUsername()).isNull();
    }

    @Test
    void getSettingsReturnsMaskedKeyAfterApiKeyIsSet() throws ItemNotFoundException {
        appSettingsRepository.findFirstBy().ifPresent(s -> {
            s.setOpenRouterApiKey("sk-or-v1-abcdefghijklmnop");
            appSettingsRepository.saveAndFlush(s);
        });

        AppSettingsDTO dto = appSettingsService.getSettings();

        assertThat(dto.getOpenRouterApiKey()).isEqualTo("****mnop");
    }

    // --- updateSettings() — API key rules ---

    @Test
    void updateSettingsWithNonBlankApiKeyUpdatesKey() throws Exception {
        AppSettingsForm form = new AppSettingsForm();
        form.setOpenRouterApiKey("sk-or-v1-new-key-abcd");

        AppSettingsDTO result = appSettingsService.updateSettings(form);

        assertThat(result.getOpenRouterApiKey()).isEqualTo("****abcd");
    }

    @Test
    void updateSettingsWithBlankApiKeyPreservesExistingKey() throws Exception {
        appSettingsRepository.findFirstBy().ifPresent(s -> {
            s.setOpenRouterApiKey("sk-or-v1-existing-key");
            appSettingsRepository.saveAndFlush(s);
        });

        AppSettingsForm form = new AppSettingsForm();
        form.setOpenRouterApiKey("   ");

        AppSettingsDTO result = appSettingsService.updateSettings(form);

        assertThat(result.getOpenRouterApiKey()).isEqualTo("****-key");
    }

    @Test
    void updateSettingsWithNullApiKeyPreservesExistingKey() throws Exception {
        appSettingsRepository.findFirstBy().ifPresent(s -> {
            s.setOpenRouterApiKey("sk-or-v1-existing-key");
            appSettingsRepository.saveAndFlush(s);
        });

        AppSettingsForm form = new AppSettingsForm();
        form.setOpenRouterApiKey(null);

        AppSettingsDTO result = appSettingsService.updateSettings(form);

        assertThat(result.getOpenRouterApiKey()).isEqualTo("****-key");
    }

    // --- updateSettings() — defaultModel FK rules ---

    @Test
    void updateSettingsWithValidEnabledDefaultModelIdSetsFK() throws Exception {
        LlmModelEntity model = new LlmModelEntity();
        model.setModelId("openai/gpt-4o");
        model.setName("GPT-4o");
        LlmModelEntity saved = llmModelRepository.saveAndFlush(model);

        AppSettingsForm form = new AppSettingsForm();
        form.setDefaultModelId(saved.getId());

        AppSettingsDTO result = appSettingsService.updateSettings(form);

        assertThat(result.getDefaultModel()).isNotNull();
        assertThat(result.getDefaultModel().getModelId()).isEqualTo("openai/gpt-4o");
    }

    @Test
    void updateSettingsWithNullDefaultModelIdClearsFk() throws Exception {
        LlmModelEntity model = new LlmModelEntity();
        model.setModelId("openai/gpt-4o");
        model.setName("GPT-4o");
        LlmModelEntity saved = llmModelRepository.saveAndFlush(model);
        appSettingsRepository.findFirstBy().ifPresent(s -> {
            s.setDefaultModel(saved);
            appSettingsRepository.saveAndFlush(s);
        });

        AppSettingsForm form = new AppSettingsForm();
        form.setDefaultModelId(null);

        AppSettingsDTO result = appSettingsService.updateSettings(form);

        assertThat(result.getDefaultModel()).isNull();
    }

    @Test
    void updateSettingsWithNonExistentDefaultModelIdThrowsItemNotFoundException() {
        AppSettingsForm form = new AppSettingsForm();
        form.setDefaultModelId(999999L);

        assertThatThrownBy(() -> appSettingsService.updateSettings(form))
                .isInstanceOf(ItemNotFoundException.class)
                .hasMessageContaining("LLM model not found");
    }

    @Test
    void updateSettingsWithDisabledDefaultModelThrowsInvalidInsertDetails() throws Exception {
        LlmModelEntity disabled = new LlmModelEntity();
        disabled.setModelId("disabled/model");
        disabled.setName("Disabled Model");
        disabled.setIsEnabled(false);
        LlmModelEntity saved = llmModelRepository.saveAndFlush(disabled);

        AppSettingsForm form = new AppSettingsForm();
        form.setDefaultModelId(saved.getId());

        assertThatThrownBy(() -> appSettingsService.updateSettings(form))
                .isInstanceOf(InvalidInsertDetails.class)
                .hasMessageContaining("enabled");
    }

    // --- updateSettings() — updatedBy and updatedAt ---

    @Test
    void updateSettingsSetsUpdatedByToCurrentAdmin() throws Exception {
        AppSettingsDTO result = appSettingsService.updateSettings(new AppSettingsForm());

        assertThat(result.getUpdatedByUsername()).isEqualTo("admin@test.com");
    }

    @Test
    void updateSettingsUpdatedAtIsNotNullAfterPatch() throws Exception {
        AppSettingsDTO result = appSettingsService.updateSettings(new AppSettingsForm());

        assertThat(result.getUpdatedAt()).isNotNull();
    }

    // --- getRawApiKey() ---

    @Test
    void getRawApiKeyReturnsUnmaskedKey() {
        appSettingsRepository.findFirstBy().ifPresent(s -> {
            s.setOpenRouterApiKey("sk-or-v1-full-key-abcdef");
            appSettingsRepository.saveAndFlush(s);
        });

        String rawKey = appSettingsService.getRawApiKey();

        assertThat(rawKey).isEqualTo("sk-or-v1-full-key-abcdef");
    }

    // --- Access control ---

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void getSettingsThrowsAccessDeniedForEmployee() {
        assertThatThrownBy(() -> appSettingsService.getSettings())
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void updateSettingsThrowsAccessDeniedForEmployee() {
        assertThatThrownBy(() -> appSettingsService.updateSettings(new AppSettingsForm()))
                .isInstanceOf(AccessDeniedException.class);
    }

    // <!-- REVIEW-FIX: Added to verify getRawApiKey() is intentionally accessible without ADMIN role -->
    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void getRawApiKeyIsAccessibleWithoutAdminRole() {
        assertThatCode(() -> appSettingsService.getRawApiKey()).doesNotThrowAnyException();
    }
}
```

#### Edge Cases

1. **`@WithMockUser` at class level vs. method-level override** — `@WithMockUser(roles = "EMPLOYEE")` at method level overrides the class-level `(username = "admin@test.com", roles = "ADMIN")` for that test only. Spring Security Test processes the innermost annotation.

2. **`adminRepository.deleteAll()` and FK constraint** — The `@BeforeEach` clears `app_settings.updated_by_id` (set to null) BEFORE calling `adminRepository.deleteAll()`. H2 enforces FK constraints; deleting an admin that is still referenced by `app_settings.updated_by_id` would throw a constraint violation. The reset order in `@BeforeEach` prevents this.

3. **`updateSettingsWithBlankApiKeyPreservesExistingKey` — masked result** — Key `"sk-or-v1-existing-key"` (21 chars, last 4 = `"-key"`). Masked form: `"****-key"`. The `@BeforeEach` reset called `saveAndFlush`, which triggered `@PreUpdate` and set `updatedAt`. The key was cleared to null in the reset, then re-seeded in the test body via `saveAndFlush` BEFORE calling `updateSettings()`. At the service's `save()`, `@PreUpdate` fires again. `updatedAt` is updated. The key remains `"sk-or-v1-existing-key"` because blank key is skipped. ✓

4. **`updateSettingsWithNullDefaultModelIdClearsFk` — seed the FK before testing clear** — This test first sets `defaultModel` via the repository, then clears it via the service. Without the seed step, the FK is already null (from `@BeforeEach` reset), and the test would not prove the FK was actually cleared.

5. **`new AppSettingsForm()` default state** — `AppSettingsForm` has `@NoArgsConstructor`. Both fields default to null. When passed to `updateSettings()`: key is null (preserved), defaultModelId is null (FK cleared). For `updateSettingsSetsUpdatedByToCurrentAdmin` and `updateSettingsUpdatedAtIsNotNullAfterPatch`, the form is empty — the tests only verify `updatedBy` and `updatedAt` were set correctly.

6. **`authHelper.initializeMockUsers()` + `@WithMockUser`** — `initializeMockUsers()` persists an `AdminEntity` with `username = "admin@test.com"` in H2. The class-level `@WithMockUser(username = "admin@test.com")` sets the Spring Security context to that username. When `updateSettings()` calls `authUserUtil.getAuthUserAdminEntity()`, it calls `baseUserRepository.findByUsername("admin@test.com")`, which finds the admin. The returned `Optional<AdminEntity>` is non-empty → `orElseThrow` does not throw. ✓

---

### Step 5: Write AppSettingsControllerTest

**Goal:** Verify the HTTP contract for `GET /app-settings` and `PATCH /app-settings` through the full Spring MVC stack with real JWT authentication. 8 MockMvc tests.

**Dependencies:** Steps 1–4 complete.

**Auth strategy:** Uses `TestAuthenticationHelper` with real JWT tokens (same as `SecurityAuthorizationTest`). No class-level `@WithMockUser` — all requests carry explicit `Authorization` headers. This exercises the full `JWTTokenValidatorFilter` → `SecurityContext` → service `@PreAuthorize` chain.

- [x] Create `backend/src/test/java/com/agentForgeBackend/models/appSettings/AppSettingsControllerTest.java`
- [x] Write 8 tests per the behaviors below
- [x] Run `./mvnw test -Dtest=AppSettingsControllerTest` from `backend/` — confirm 8/8 pass

#### Implementation

```java
package com.agentForgeBackend.models.appSettings;

import com.agentForgeBackend.models.hq.admin.AdminRepository;
import com.agentForgeBackend.models.hq.client.ClientRepository;
import com.agentForgeBackend.models.hq.employee.EmployeeRepository;
import com.agentForgeBackend.models.llm.LlmModelEntity;
import com.agentForgeBackend.models.llm.LlmModelRepository;
import com.agentForgeBackend.testUtils.TestAuthenticationHelper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AppSettingsControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private AppSettingsRepository appSettingsRepository;
    @Autowired private LlmModelRepository llmModelRepository;
    @Autowired private AdminRepository adminRepository;
    @Autowired private EmployeeRepository employeeRepository;
    @Autowired private ClientRepository clientRepository;
    @Autowired private TestAuthenticationHelper authHelper;

    @BeforeEach
    void setUp() {
        appSettingsRepository.findFirstBy().ifPresent(s -> {
            s.setOpenRouterApiKey(null);
            s.setDefaultModel(null);
            s.setUpdatedBy(null);
            appSettingsRepository.saveAndFlush(s);
        });

        llmModelRepository.deleteAll();
        llmModelRepository.flush();
        employeeRepository.deleteAll();
        employeeRepository.flush();
        clientRepository.deleteAll();
        clientRepository.flush();
        adminRepository.deleteAll();
        adminRepository.flush();

        authHelper.initializeMockUsers();
        authHelper.initializeEmployeeMockUser();
    }

    @Test
    void getAppSettingsWithAdminTokenReturns200WithMaskedKey() throws Exception {
        appSettingsRepository.findFirstBy().ifPresent(s -> {
            s.setOpenRouterApiKey("sk-or-v1-test-key-abcd");
            appSettingsRepository.saveAndFlush(s);
        });

        mockMvc.perform(get("/app-settings")
                        .header("Authorization", authHelper.getAdminToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.openRouterApiKey").value("****abcd"))
                .andExpect(jsonPath("$.defaultModel").value(nullValue()));
    }

    @Test
    void patchAppSettingsWithNewApiKeyReturns200WithMaskedKey() throws Exception {
        String body = """
                { "openRouterApiKey": "sk-or-v1-patched-key-1234" }
                """;

        mockMvc.perform(patch("/app-settings")
                        .header("Authorization", authHelper.getAdminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.openRouterApiKey").value("****1234"))
                .andExpect(jsonPath("$.updatedByUsername").value("admin@test.com"))
                .andExpect(jsonPath("$.updatedAt").isNotEmpty());
    }

    @Test
    void patchAppSettingsWithNullDefaultModelIdClearsFK() throws Exception {
        LlmModelEntity model = new LlmModelEntity();
        model.setModelId("openai/gpt-4o");
        model.setName("GPT-4o");
        LlmModelEntity saved = llmModelRepository.saveAndFlush(model);
        appSettingsRepository.findFirstBy().ifPresent(s -> {
            s.setDefaultModel(saved);
            appSettingsRepository.saveAndFlush(s);
        });

        String body = """
                { "defaultModelId": null }
                """;

        mockMvc.perform(patch("/app-settings")
                        .header("Authorization", authHelper.getAdminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.defaultModel").value(nullValue()));
    }

    @Test
    void patchAppSettingsWithNonExistentDefaultModelIdReturns404() throws Exception {
        String body = """
                { "defaultModelId": 999999 }
                """;

        mockMvc.perform(patch("/app-settings")
                        .header("Authorization", authHelper.getAdminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andExpect(jsonPath("$.message").value(containsString("LLM model not found")));
    }

    @Test
    void patchAppSettingsWithDisabledModelIdReturns400() throws Exception {
        LlmModelEntity disabled = new LlmModelEntity();
        disabled.setModelId("disabled/model");
        disabled.setName("Disabled");
        disabled.setIsEnabled(false);
        LlmModelEntity saved = llmModelRepository.saveAndFlush(disabled);

        String body = String.format("{ \"defaultModelId\": %d }", saved.getId());

        mockMvc.perform(patch("/app-settings")
                        .header("Authorization", authHelper.getAdminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Invalid Details"))
                .andExpect(jsonPath("$.message").value(containsString("enabled")));
    }

    @Test
    void anonymousGetToAppSettingsReturns401() throws Exception {
        mockMvc.perform(get("/app-settings"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Unauthorized"));
    }

    @Test
    void anonymousPatchToAppSettingsReturns401() throws Exception {
        mockMvc.perform(patch("/app-settings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Unauthorized"));
    }

    @Test
    void employeeGetToAppSettingsReturns403() throws Exception {
        mockMvc.perform(get("/app-settings")
                        .header("Authorization", authHelper.getEmployeeToken()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("Forbidden"));
    }
}
```

#### Edge Cases

1. **`jsonPath("$.defaultModel").value(nullValue())`** — `AppSettingsDTO` has no `@JsonInclude(NON_NULL)`, so Jackson serializes `null` fields as `"defaultModel": null` (key present, value null). `doesNotExist()` would fail because the key IS present. `value(nullValue())` checks that the key exists and has a null value. ✓

2. **`jsonPath("$.updatedAt").isNotEmpty()`** — Spring Boot's Jackson auto-configuration registers `JavaTimeModule` with `WRITE_DATES_AS_TIMESTAMPS = false`, serializing `LocalDateTime` as an ISO-8601 string like `"2026-06-17T10:30:00"`. The `isNotEmpty()` assertion verifies the value is present and non-empty. If the timestamp format ever changes to an array (e.g., `[2026,6,17,10,30,0]`), `isNotEmpty()` still passes because arrays are non-empty. This is intentionally format-agnostic.

3. **`String.format` for disabled model ID** — Avoids inserting a `Long` value into a text block. Both styles work; `String.format` is more explicit about the type conversion.

4. **`patchAppSettingsWithNullDefaultModelIdClearsFK` — seeding before test** — The LlmModel FK is seeded via the repository directly (not via service), then the PATCH with `"defaultModelId": null` clears it. Without the seed, the test would only prove the FK is null when it was already null — not that the service can clear a previously set FK.

---

### Step 6: Run Full Test Suite and Verify No Regressions

**Goal:** Confirm all 23 new tests (15 service + 8 controller) pass and the 2 SecurityAuthorizationTest assertion changes pass. The existing 553 tests remain unaffected.

- [x] Run `./mvnw test` from `backend/`
- [x] Confirm total = 601 (301 unique × 2 surefire runs - 1 pre-existing error)
- [x] Confirm 0 failures
- [x] Confirm `authServerApplicationTests.contextLoads` is the only error (pre-existing Docker blocker)
- [x] If any test fails, investigate and fix before marking complete

#### Edge Cases

1. **`AppSettingsBootstrap` in existing `@SpringBootTest` tests** — Any existing `@SpringBootTest` context now also executes `AppSettingsBootstrap.run()` at startup, inserting one row into `app_settings`. Existing tests do not query `app_settings`, so this is a no-op for them. No regressions expected.

2. **`SecurityAuthorizationTest.adminPatchToAppSettingsPassesSecurity` — why 200 now** — The admin JWT carries `username = "admin@test.com"`. `@BeforeEach` persists that admin. `updateSettings()` with `{}` body preserves the key (null key → skipped) and clears the FK (null defaultModelId → clear, already null). `authUserUtil.getAuthUserAdminEntity()` finds the admin. Save succeeds → 200. ✓

3. **Shared Spring context** — `AppSettingsServiceIntegrationTest` and `AppSettingsControllerTest` both use `@SpringBootTest @ActiveProfiles("test")` with no custom `@TestConfiguration`. They likely share a Spring context within the same Maven run. Each test class has its own `@BeforeEach` that resets all relevant state. No cross-test contamination.

---

## Design Decisions

**Decision 1: `AppSettingsService` does NOT extend `DefaultServiceImplements`**
- **Why:** `DefaultServiceImplements` is a CRUD scaffold for collection resources (6 methods: getOne, getAll, getListPage, insert, update, delete). AppSettings is a singleton with none of those operations. Extending the base class would force 6 overrides implementing unsupported operations — a direct ISP violation.
- **Alternatives considered:** Extending `DefaultServiceImplements` with overrides. Rejected — exposes incorrect endpoints through the base class interface and pollutes the service with dead code.

**Decision 2: `LlmModelRepository` injected directly instead of `LlmModelService`**
- **Why:** `LlmModelService` methods are all `@PreAuthorize("hasRole('ADMIN')")`. Injecting it into `AppSettingsService` introduces a service-to-service dependency within the domain layer. FK validation requires only `findById(Long)` + `isEnabled` check — a minimal repository operation. Using the repository directly is the stable, minimal dependency.
- **Alternatives considered:** Injecting `LlmModelService`. Rejected — cross-service coupling; exposes `AppSettingsService` to unintended behavioral changes in `LlmModelService`.

**Decision 3: `updateSettings()` always sets `updatedBy`, even when only key is updated**
- **Why:** The feature mandates full audit trail — every PATCH records the admin who made the change. A partial audit (only recording admin when the model FK changes) would be incomplete and misleading.
- **Alternatives considered:** Setting `updatedBy` only when a meaningful field actually changed. Rejected — incomplete audit contradicts the feature spec.

**Decision 4: `getRawApiKey()` returns `null` (not throwing) when key is not configured**
- **Why:** The caller (`OpenRouterService`) is responsible for deciding what to do when no key is configured. `AppSettingsService` returning null makes the contract explicit. Throwing here would push a failure-mode decision into the wrong layer.
- **Alternatives considered:** Throw `ItemNotFoundException("API key not configured")`. Rejected — violates SRP; pushes LLM call failure decisions into the settings layer.

**Decision 5: Controller test uses real JWT, not `@WithMockUser`**
- **Why:** `@WithMockUser` bypasses `JWTTokenValidatorFilter`, which is the primary auth mechanism. Controller tests using real JWT tokens exercise the complete filter → context → `@PreAuthorize` chain, detecting filter misconfiguration that `@WithMockUser` would mask.
- **Alternatives considered:** `@WithMockUser` at class level (used in `LlmModelControllerTest`). Retained for LlmModel (pre-existing), not adopted for AppSettings to match the higher-fidelity pattern from `SecurityAuthorizationTest`.

---

## Testing Considerations

### Automatic Validation

- [x] From `backend/`: `./mvnw test -Dtest=SecurityAuthorizationTest` — confirm 15/15 pass after updating 2 assertions (Step 3)
- [x] From `backend/`: `./mvnw test -Dtest=AppSettingsServiceIntegrationTest` — confirm 15/15 pass
- [x] From `backend/`: `./mvnw test -Dtest=AppSettingsControllerTest` — confirm 8/8 pass
- [x] From `backend/`: `./mvnw test` — confirm 0 failures; total count = 601 (301 unique × 2 surefire runs - 1 pre-existing error); `authServerApplicationTests.contextLoads` is the only error

### Manual Validation

No manual validation required. `GET /app-settings` and `PATCH /app-settings` are REST endpoints with no UI surface. The frontend has not been started (per `tech.md`).

---

## Related Code Explanations

- `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelService.java` — Prior art for per-method `@PreAuthorize` + `@Transactional` without class-level annotation; constructor injection with 5 parameters; same exception types used
- `backend/src/main/java/com/agentForgeBackend/shared/tools/AuthUserUtil.java:23` — `getAuthUserAdminEntity()` — looks up authenticated username in `BaseUserRepository` and casts result to `AdminEntity`; used in `updateSettings()` for `updatedBy` assignment
- `backend/src/test/java/com/agentForgeBackend/models/llm/LlmModelServiceCrudIntegrationTest.java:24` — Class-level `@WithMockUser` + per-method role override pattern — exact pattern reused in `AppSettingsServiceIntegrationTest`
- `backend/src/test/java/com/agentForgeBackend/testUtils/TestAuthenticationHelper.java:43` — `initializeMockUsers()` — persists admin with `username = "admin@test.com"` in H2 and generates JWT; required by both `AppSettingsServiceIntegrationTest` (for `updatedBy` resolution) and `AppSettingsControllerTest` (for JWT auth)
- `backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java:95-115` — 2 app-settings admin tests updated in Step 3

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected for this task
- [x] Spring Security `@PreAuthorize`, `@Transactional(rollbackFor)`, and `AccessDeniedException` behavior verified against Spring Boot 3.4.1 / Spring Security 6.x docs
- [x] `AppSettingsService.java` created in `models/appSettings/` with 3 public methods
- [x] `getSettings()` annotated with `@PreAuthorize("hasRole('ADMIN')")` and `@Transactional(readOnly = true)`
- [x] `updateSettings()` annotated with `@PreAuthorize("hasRole('ADMIN')")` and `@Transactional(rollbackFor = {ItemNotFoundException.class, InvalidInsertDetails.class})`
- [x] `getRawApiKey()` has NO `@PreAuthorize` annotation
- [x] `updateSettings()` implements all 5 business rules: key preservation on blank/null, FK validation (existence + isEnabled), FK clear on null defaultModelId, updatedBy resolution via AuthUserUtil, save triggering @PreUpdate
- [x] `AppSettingsController.java` created in `models/appSettings/` with `GET /app-settings` and `PATCH /app-settings`
- [x] `SecurityAuthorizationTest.java` updated: `adminGetToAppSettingsPassesSecurity` and `adminPatchToAppSettingsPassesSecurity` changed from `isNotFound()` to `isOk()`
- [x] Stale comments removed from the 2 updated SecurityAuthorizationTest methods
- [x] `SecurityAuthorizationTest` has `@Autowired AppSettingsRepository appSettingsRepository` field and `@BeforeEach` clears `app_settings.updated_by_id` to null (via `saveAndFlush`) before calling `adminRepository.deleteAll()`
- [x] `AppSettingsServiceIntegrationTest.java` created with 15 tests: null key get, masked key get, non-blank key update, blank key preservation, null key preservation, valid model FK set, null defaultModelId FK clear, non-existent model → ItemNotFoundException, disabled model → InvalidInsertDetails, updatedBy set, updatedAt non-null, getRawApiKey unmasked, employee getSettings → AccessDeniedException, employee updateSettings → AccessDeniedException, getRawApiKey under EMPLOYEE role → no AccessDeniedException
- [x] `AppSettingsControllerTest.java` created with 8 tests: GET 200 masked key, PATCH 200 new key, PATCH null defaultModelId clears FK, PATCH non-existent model → 404, PATCH disabled model → 400, anonymous GET → 401, anonymous PATCH → 401, employee GET → 403
- [x] From `backend/`: `./mvnw test -Dtest=SecurityAuthorizationTest` — 15/15 pass
- [x] From `backend/`: `./mvnw test -Dtest=AppSettingsServiceIntegrationTest` — 15/15 pass
- [x] From `backend/`: `./mvnw test -Dtest=AppSettingsControllerTest` — 8/8 pass
- [x] From `backend/`: `./mvnw test` — 0 failures; total count = 601 (301 unique × 2 surefire runs - 1 pre-existing error)
- [x] No modifications to Task 1 files (`SecurityConfig.java`) or Task 2 production files (entity, form, DTO, mapper, repository, bootstrap)
- [x] Parent feature Steps 3.1–3.4 ready to be marked complete after execution
