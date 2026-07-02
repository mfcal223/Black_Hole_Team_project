# Task: Domain Foundation for AppSettings

#task #current #medium-complexity #parent-app-settings-entity-and-admin-configuration

**Parent:** [[App-Settings-Entity-and-Admin-Configuration]]
**Parent Type:** Feature
**Related Step(s):** Phase 2 — Steps 2.1–2.8
**Estimated Complexity:** Medium

---

## Goal

Create the complete domain layer for `AppSettings`: entity, form, DTO, mapper (with API key masking), repository, and bootstrap — then validate them with repository and mapper tests. After this task, the singleton settings row exists in the database on startup, the masking contract is tested, and Task 3 can inject the full service and controller.

---

## Parent Context

The feature designates Task 2 as the domain foundation. Entity, form, DTO, mapper, repository, and bootstrap are grouped into a single task because none can be tested without the others existing. Steps 2.1–2.6 produce the production code; Steps 2.7–2.8 close out the task with repository and mapper tests.

Key constraints from the parent:

- `AppSettings` is a **singleton resource** — not a collection. `DefaultController` / `DefaultServiceImplements` / `DefaultMapper` are explicitly excluded.
- Package: `models/appSettings/`. Bootstrap: `configuration/boostrap/` (pre-existing typo — no 't').
- Primary key: `Long` with `GenerationType.IDENTITY` (consistent with ADR-009).
- The singleton row is found via `findFirstBy()`, never by `findById(1L)` — the sequence state is unknown.
- `updatedAt` is managed by `@PreUpdate` only — not set on initial bootstrap save. The initial row has `updatedAt = null`.
- `openRouterApiKey` masking rule: `null → null`, `length ≤ 8 → "****"`, `length > 8 → "****" + last 4 chars`.
- `defaultModel` FK to `LlmModelEntity`: nullable; `null` means no default selected.
- `updatedBy` FK to `AdminEntity`: nullable; `null` means settings have never been PATCHed.
- `AppSettingsMapper` is a standalone `@Component` — it does NOT extend `DefaultMapper` and has no interface.
- Task 3 owns the service (`AppSettingsService`) and controller (`AppSettingsController`).

---

## Preconditions / Dependencies

- Task 1 is complete: `/app-settings/**` is gated `hasRole("ADMIN")` in `SecurityConfig`. 519 tests pass (0 failures, 1 pre-existing Docker error `authServerApplicationTests.contextLoads`).
- `LlmModelEntity` exists in `models/llm/` — FK target for `defaultModel`.
- `AdminEntity` exists in `models/hq/admin/` — FK target for `updatedBy`.
- `LlmModelMiniDTO` exists in `models/llm/` — reused in `AppSettingsDTO.defaultModel`.
- H2 in-memory DB is configured for tests via `application-test.properties` (`create-drop`, H2 dialect, MySQL mode).
- `TestAuthenticationHelper` is available in `testUtils/` — not needed by this task's tests (no auth context required for `@DataJpaTest` or pure mapper unit tests).

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — Selected — task template, directory placement, naming convention
- `solid-deep-design` — Selected — AppSettingsMapper is a deep module: small surface (one public method), large implementation (masking, null-safety, FK projection). AppSettingsEntity has one reason to change (settings schema). AppSettingsBootstrap has one responsibility (seed the singleton). Seam analysis: AppSettingsRepository is the seam between the domain and persistence; AppSettingsBootstrap and the service (Task 3) both use `findFirstBy()` as the sole access point.
- `tdd` — Selected — tests are written per-behavior, verifying through the public interface. Repository tests verify persistence behavior; mapper tests verify the masking contract. Both test suites exercise real behavior, not implementation internals.
- `memory-bank` — Selected — confirmed test baseline (519), confirmed LlmModelEntity and AdminEntity exist, confirmed JOINED inheritance concern for AdminEntity FK
- `glossary-management` — Not needed — no new domain terms
- `find-docs` — Selected (consulted) — verified Spring Data JPA `findFirstBy()` derived query behavior and JPA `@PreUpdate` lifecycle semantics against Spring Data JPA 3.x docs (Spring Boot 3.4.1 ships Spring Data JPA 3.4.x). Both features are stable and usage is verified by existing codebase patterns (see LlmModelRepositoryTest, AdminBoostrap).

### Documentation Reviewed

- `documentation/Features/to-do/App-Settings-Entity-and-Admin-Configuration.md` — full feature doc; Sections 2 and 3 define all domain types and bootstrap behavior
- `documentation/Tasks/current/App-Settings-Entity-and-Admin-Configuration-step-1-security-baseline.md` — Task 1 completion confirmed; baseline 519 tests
- `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelEntity.java` — FK target; field patterns, Lombok annotations, @PrePersist usage
- `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelMapper.java` — mapper pattern (null-guard, builder, @Component)
- `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelMiniDTO.java` — reused DTO; 4 fields: id, modelId, name, isEnabled
- `backend/src/main/java/com/agentForgeBackend/models/hq/admin/AdminEntity.java` — FK target; JOINED inheritance from BaseUserEntity; `getUsername()` available
- `backend/src/main/java/com/agentForgeBackend/shared/models/baseUser/BaseUserEntity.java` — confirmed: boolean flags (`accountNonExpired`, `accountNonLocked`, `credentialsNonExpired`, `enabled`) have Java-level defaults `= true`, so they don't need to be set explicitly in test constructors
- `backend/src/main/java/com/agentForgeBackend/configuration/boostrap/AdminBoostrap.java` — structural reference for bootstrap; idempotency pattern
- `backend/src/test/java/com/agentForgeBackend/models/llm/LlmModelRepositoryTest.java` — repository test pattern: `@DataJpaTest @ActiveProfiles("test") @Tag("repository")` + `TestEntityManager`
- `backend/src/test/java/com/agentForgeBackend/models/llm/LlmModelMapperTest.java` — mapper test pattern: `@ExtendWith(MockitoExtension.class)`, pure unit test, no Spring context
- `backend/src/test/java/com/agentForgeBackend/models/hq/ListQueryTestDataFactory.java` — `admin()` helper pattern for persisting an AdminEntity in tests

### Related Existing Code

- `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelEntity.java` — FK target for `defaultModel`; entity field pattern reference
- `backend/src/main/java/com/agentForgeBackend/models/hq/admin/AdminEntity.java` — FK target for `updatedBy`; JOINED inheritance
- `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelMiniDTO.java` — reused in AppSettingsDTO; already has `@Builder`
- `backend/src/main/java/com/agentForgeBackend/configuration/boostrap/AdminBoostrap.java` — structural reference for AppSettingsBootstrap
- `backend/src/test/java/com/agentForgeBackend/models/llm/LlmModelRepositoryTest.java` — prior art for repository test structure
- `backend/src/test/java/com/agentForgeBackend/models/llm/LlmModelMapperTest.java` — prior art for mapper test structure
- `backend/src/test/java/com/agentForgeBackend/models/hq/ListQueryTestDataFactory.java` — `admin()` helper for creating AdminEntity in tests

---

## Implementation Details

### Approach

Six production files are created in declaration order (entity → form → DTO → mapper → repository → bootstrap), then two test files close the task. No files from Task 1 are modified.

**TDD approach for Task 2:** Because the production code types are interdependent (the entity must exist before the repository; the DTO must exist before the mapper), the production code is built first (Steps 1–5), then the repository and mapper tests are written to verify the behavior of those production types (Steps 6–7). Each test in Steps 6 and 7 verifies one specific behavior through the public interface of the class under test.

**SOLID / Depth analysis:**

| Module | Interface size | Implementation depth | Verdict |
|--------|---------------|---------------------|---------|
| `AppSettingsEntity` | 5 getters/setters + lifecycle callback | JPA column mappings, nullable FK constraints, @PreUpdate clock assignment | Deep — hides persistence contract behind accessors |
| `AppSettingsForm` | 2 getters/setters | Data holder | Shallow — intentional; pure input carrier |
| `AppSettingsDTO` | 5 getters/setters | Data holder | Shallow — intentional; pure output carrier |
| `AppSettingsMapper` | 1 public method (`toDTO`) | Masking logic, FK projection, null guards | Deep — API key masking concentrates logic that would otherwise scatter across every API key consumer |
| `AppSettingsRepository` | `JpaRepository` + 1 custom method | Spring Data derived query | Deep — inherited persistence depth from JPA |
| `AppSettingsBootstrap` | `run(String...)` | Idempotent seed logic | Deep enough — hides startup seeding concern |

**Key design decisions:**

1. `AppSettingsMapper` does NOT extend `DefaultMapper` — `DefaultMapper<DTO, MINIDTO, LISTDTO, FORM, ENTITY>` is designed for collection resources with four distinct DTO types. `AppSettings` has one DTO type and does not need `toSmallDTO`, `toListDTO`, or `toEntity`. Extending `DefaultMapper` would force implementing three methods with `return null` or `throw` — a clear ISP violation.

2. `AppSettingsMapper.toLlmMiniDTO()` is a private helper that inlines the `LlmModelEntity → LlmModelMiniDTO` conversion instead of injecting `LlmModelMapper`. Injecting `LlmModelMapper` would introduce a dependency on another domain's mapper. Since the conversion is 4 fields, inlining it is the right tradeoff — it avoids coupling without creating a deep module from a shallow extraction.

3. `AppSettingsBootstrap` uses `findFirstBy()` (not `findById(1L)`) for idempotency. This is sequence-agnostic — the bootstrap does not assume the auto-increment assigns `id = 1`.

4. `@PreUpdate` sets `updatedAt` on every entity update, but `@PrePersist` is intentionally absent. The bootstrap saves a new entity with `updatedAt = null`. The DTO mapper handles null `updatedAt` gracefully (LocalDateTime is a value type; returning null directly from `entity.getUpdatedAt()` is safe — no NPE).

### Files to Create/Modify

- [x] `backend/src/main/java/com/agentForgeBackend/models/appSettings/AppSettingsEntity.java` — **CREATE** — JPA entity, singleton row definition
- [x] `backend/src/main/java/com/agentForgeBackend/models/appSettings/AppSettingsForm.java` — **CREATE** — PATCH request body, both fields optional
- [x] `backend/src/main/java/com/agentForgeBackend/models/appSettings/AppSettingsDTO.java` — **CREATE** — GET response, API key masked, LlmModelMiniDTO for defaultModel
- [x] `backend/src/main/java/com/agentForgeBackend/models/appSettings/AppSettingsMapper.java` — **CREATE** — standalone @Component, masking logic, FK projection
- [x] `backend/src/main/java/com/agentForgeBackend/models/appSettings/AppSettingsRepository.java` — **CREATE** — JpaRepository with findFirstBy()
- [x] `backend/src/main/java/com/agentForgeBackend/configuration/boostrap/AppSettingsBootstrap.java` — **CREATE** — CommandLineRunner, idempotent singleton seed
- [x] `backend/src/test/java/com/agentForgeBackend/models/appSettings/AppSettingsRepositoryTest.java` — **CREATE** — @DataJpaTest, 6 tests for persistence and @PreUpdate behavior
- [x] `backend/src/test/java/com/agentForgeBackend/models/appSettings/AppSettingsMapperTest.java` — **CREATE** — pure unit test, 12 tests for masking and null-safety

---

## Step-by-Step Implementation

### Step 1: Create AppSettingsEntity

**Goal:** Define the JPA entity for the singleton settings row with two nullable FK relationships and a `@PreUpdate` lifecycle callback.

**Dependencies:** None — this is the foundation type for all subsequent files in this task.

**Why this step is critical:** Every other type in this task depends on `AppSettingsEntity` being defined first. The two `@ManyToOne` FK relationships require that `LlmModelEntity` and `AdminEntity` exist on the classpath — they already do.

- [x] Create `backend/src/main/java/com/agentForgeBackend/models/appSettings/AppSettingsEntity.java`
- [x] Verify the `@ManyToOne` annotations reference the correct entity classes (`LlmModelEntity` from `models/llm`, `AdminEntity` from `models/hq/admin`)

#### Implementation

```java
package com.agentForgeBackend.models.appSettings;

import com.agentForgeBackend.models.hq.admin.AdminEntity;
import com.agentForgeBackend.models.llm.LlmModelEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "app_settings")
@Getter
@Setter
@NoArgsConstructor
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

#### Edge Cases

1. **`@ManyToOne` columns are nullable by default** — `@JoinColumn` without `nullable = false` allows null, which is correct for both FKs. The bootstrap seeds the row with both FKs null.

2. **No `@PrePersist`** — Intentional. The bootstrap saves a brand-new entity with all nulls. `updatedAt` starts null and stays null until the first PATCH. The mapper handles null `updatedAt` safely (LocalDateTime is returned by value; null passes through without NPE).

3. **`@PreUpdate` visibility** — The `onUpdate()` method has package-private visibility (no access modifier). This is intentional and consistent with `LlmModelEntity.onPersist()`. JPA lifecycle callbacks do not require public visibility.

4. **`FetchType.LAZY` on both ManyToOne** — Lazy loading is the correct default for FK relationships that are not always needed. In the mapper, accessing `entity.getDefaultModel()` and `entity.getUpdatedBy()` will trigger lazy loading within the transaction. The service (Task 3) must ensure the entity is accessed within an active transaction. `@Transactional(readOnly = true)` on `getSettings()` provides the transaction boundary.

5. **`updatedBy` FK points to `base_user.id`** — Because AdminEntity uses JOINED inheritance, the FK column `updated_by_id` references `base_user.id` (the root table), not `admin.id`. Hibernate resolves this transparently. Tests that persist AdminEntity must ensure the `base_user` row exists first — `entityManager.persist(adminEntity)` inserts into both tables atomically.

---

### Step 2: Create AppSettingsForm and AppSettingsDTO

**Goal:** Define the PATCH input carrier (`AppSettingsForm`) and the GET output carrier (`AppSettingsDTO`). No business logic here.

**Dependencies:** `AppSettingsEntity` (Step 1) and `LlmModelMiniDTO` (already exists in `models/llm/`).

- [x] Create `backend/src/main/java/com/agentForgeBackend/models/appSettings/AppSettingsForm.java`
- [x] Create `backend/src/main/java/com/agentForgeBackend/models/appSettings/AppSettingsDTO.java`

#### Implementation — AppSettingsForm

```java
package com.agentForgeBackend.models.appSettings;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class AppSettingsForm {
    private String openRouterApiKey;
    private Long defaultModelId;
}
```

#### Implementation — AppSettingsDTO

```java
package com.agentForgeBackend.models.appSettings;

import com.agentForgeBackend.models.llm.LlmModelMiniDTO;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppSettingsDTO {
    private Long id;
    private String openRouterApiKey;
    private LlmModelMiniDTO defaultModel;
    private LocalDateTime updatedAt;
    private String updatedByUsername;
}
```

#### Edge Cases

1. **No `@NotBlank` on `openRouterApiKey`** — Intentional. A null or blank value means "keep existing key" in `updateSettings()`. Validation constraints here would block that behavior.

2. **No `@NotNull` on `defaultModelId`** — Intentional. `null` in a PATCH form means "clear the default model FK". A `@NotNull` constraint would prevent the admin from removing the default model selection.

3. **`updatedByUsername` is `String`, not `AdminDTO`** — The DTO only exposes the username of the last admin who changed settings. Returning a full AdminDTO would expose data the caller doesn't need (ISP). One field, not an object graph.

---

### Step 3: Create AppSettingsMapper

**Goal:** Implement the standalone mapper that converts `AppSettingsEntity → AppSettingsDTO`, applying API key masking and projecting the FK entities to minimal DTOs.

**Dependencies:** `AppSettingsEntity` (Step 1), `AppSettingsDTO` (Step 2), `LlmModelMiniDTO` (existing).

**Why this step is critical:** The masking logic is the most security-relevant piece in this task. It must never expose the full API key through the GET endpoint. This is the only place the masking rule is implemented — a single, testable location. The mapper test (Step 7) will verify every masking boundary.

- [x] Create `backend/src/main/java/com/agentForgeBackend/models/appSettings/AppSettingsMapper.java`

#### Implementation

```java
package com.agentForgeBackend.models.appSettings;

import com.agentForgeBackend.models.llm.LlmModelEntity;
import com.agentForgeBackend.models.llm.LlmModelMiniDTO;
import org.springframework.stereotype.Component;

@Component
public class AppSettingsMapper {

    public AppSettingsDTO toDTO(AppSettingsEntity entity) {
        if (entity == null) return null;
        return AppSettingsDTO.builder()
                .id(entity.getId())
                .openRouterApiKey(maskApiKey(entity.getOpenRouterApiKey()))
                .defaultModel(toLlmMiniDTO(entity.getDefaultModel()))
                .updatedAt(entity.getUpdatedAt())
                .updatedByUsername(
                        entity.getUpdatedBy() != null ? entity.getUpdatedBy().getUsername() : null)
                .build();
    }

    private LlmModelMiniDTO toLlmMiniDTO(LlmModelEntity model) {
        if (model == null) return null;
        return LlmModelMiniDTO.builder()
                .id(model.getId())
                .modelId(model.getModelId())
                .name(model.getName())
                .isEnabled(model.getIsEnabled())
                .build();
    }

    private String maskApiKey(String key) {
        if (key == null) return null;
        if (key.length() <= 8) return "****";
        return "****" + key.substring(key.length() - 4);
    }
}
```

#### Edge Cases

1. **`maskApiKey("")`** — Empty string has `length() == 0`, which is `≤ 8`. Returns `"****"`. This is correct — an empty key should not be returned as-is.

2. **`maskApiKey("12345678")` (exactly 8 chars)** — `length() == 8`, which is `≤ 8`. Returns `"****"`. The boundary includes 8 characters in the "mask entirely" branch.

3. **`maskApiKey("123456789")` (9 chars)** — `length() == 9 > 8`. Returns `"****" + "6789"`. Last 4 characters visible.

4. **`updatedAt` is null (initial bootstrap state)** — `entity.getUpdatedAt()` returns `null`. `AppSettingsDTO.updatedAt` is set to `null`. `LocalDateTime` is a value type, not a wrapper — no NPE.

5. **`updatedBy` is null (before first PATCH)** — The ternary guard `entity.getUpdatedBy() != null ? ... : null` returns `null` directly. No NPE.

6. **`defaultModel` is null (before first PATCH that sets a model)** — `toLlmMiniDTO(null)` returns `null`. No NPE.

7. **Lazy-loaded FK proxies in production** — In the service context (Task 3), `entity.getDefaultModel()` and `entity.getUpdatedBy()` may return Hibernate proxy objects. The proxy is transparent for field access within a transaction. Accessing `.getUsername()` on a proxy admin triggers the proxy to load — but `getAuthUserAdminEntity()` already loads the entity so this field is populated. The mapper must only be called while the transaction is active; this is enforced by the service's `@Transactional` on `getSettings()`.

---

### Step 4: Create AppSettingsRepository

**Goal:** Define the JPA repository for `AppSettingsEntity` with a single custom method for singleton-row access.

**Dependencies:** `AppSettingsEntity` (Step 1).

- [x] Create `backend/src/main/java/com/agentForgeBackend/models/appSettings/AppSettingsRepository.java`

#### Implementation

```java
package com.agentForgeBackend.models.appSettings;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AppSettingsRepository extends JpaRepository<AppSettingsEntity, Long> {
    Optional<AppSettingsEntity> findFirstBy();
}
```

#### Edge Cases

1. **`findFirstBy()` with no criteria** — Spring Data derives a query equivalent to `SELECT ... FROM app_settings FETCH FIRST 1 ROWS ONLY` (exact SQL varies by database; H2 MySQL mode uses `LIMIT 1`). No `ORDER BY` is added automatically — Spring Data only adds ordering when the method name includes `OrderBy` or a `Sort` parameter is provided. Since the `app_settings` table always has exactly one row, ordering is irrelevant to correctness. In an empty table it returns `Optional.empty()`. <!-- REVIEW-FIX: original claimed "ORDER BY id ASC LIMIT 1" — Spring Data JPA does NOT add ORDER BY for findFirstBy() without an explicit OrderBy clause in the method name -->

2. **No QueryDSL** — `AppSettingsRepository` does NOT extend `DefaultRepository` (which extends `QuerydslPredicateExecutor`). AppSettings is a singleton resource with no list/filter endpoint. Adding QueryDSL would force generating a `QAppSettingsEntity` Q-class at compile time with no consumer. Extending `JpaRepository` directly is the correct interface.

3. **No custom CRUD methods beyond `findFirstBy()`** — All standard `JpaRepository` methods (`save`, `findById`, `existsById`, etc.) are inherited. The bootstrap uses `findFirstBy()` for singleton discovery and `save()` for initial persist. The service (Task 3) uses `findFirstBy()` for all reads and writes.

---

### Step 5: Create AppSettingsBootstrap

**Goal:** Seed the singleton settings row on first startup so that `GET /app-settings` always returns a response, even before any PATCH has been sent.

**Dependencies:** `AppSettingsRepository` (Step 4), `AppSettingsEntity` (Step 1). The bootstrap component lives in `configuration/boostrap/` (pre-existing package typo — note missing 't').

**Why this step is critical:** Without the bootstrap, the service's `findFirstBy()` returns `Optional.empty()` and `updateSettings()` would throw `ItemNotFoundException` before any configuration is done. The bootstrap guarantees the row always exists.

- [x] Create `backend/src/main/java/com/agentForgeBackend/configuration/boostrap/AppSettingsBootstrap.java`
- [x] Confirm package name is `configuration.boostrap` (one 'o', no 't') — matches `AdminBoostrap`

#### Implementation

```java
package com.agentForgeBackend.configuration.boostrap;

import com.agentForgeBackend.models.appSettings.AppSettingsEntity;
import com.agentForgeBackend.models.appSettings.AppSettingsRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

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

#### Edge Cases

1. **Idempotency** — `findFirstBy()` returns the existing row if it exists. `orElseGet()` only invokes the supplier (the insert) when the `Optional` is empty. Re-running the bootstrap (application restart) never creates a second row.

2. **Concurrent startup** — If two startup events fire simultaneously, both would find `Optional.empty()` and both would attempt `save()`. The `id` column is the PK with auto-increment — a unique constraint violation on the second insert is the unlikely worst case. In practice, `CommandLineRunner` runs in the main thread after the Spring context is fully initialized; concurrent invocations are not possible in standard Spring Boot deployment.

3. **`@SpringBootTest` context in Task 3** — When `@SpringBootTest` loads the full Spring context, `CommandLineRunner` beans execute during context startup. `AppSettingsBootstrap.run()` seeds the settings row. Service integration tests in Task 3 will find the row pre-seeded. `@BeforeEach` in those tests must NOT delete the settings row (it is always required by the service's `findFirstBy()`). Only the FK rows (LlmModel, AdminEntity) need cleanup between tests.

4. **`@DataJpaTest` context in Step 6** — `@DataJpaTest` does NOT execute `CommandLineRunner` beans. It only loads the JPA layer. The settings table starts empty in repository tests. `findFirstBy()` returns `Optional.empty()` until explicitly seeded via repository calls.

5. **No logger** — Unlike `AdminBoostrap`, `AppSettingsBootstrap` omits the `Logger`. This is intentional — the bootstrap's only observable effect is the database row; logging is not needed for the minimal seed operation.

---

### Step 6: Write AppSettingsRepositoryTest

**Goal:** Verify entity persistence, FK round-trips (nullable and non-null), and `@PreUpdate` behavior through the repository's public interface. The `@DataJpaTest` slice provides a real H2 database.

**Dependencies:** Steps 1–5 complete. All production types compile. The `@DataJpaTest` context does NOT run `CommandLineRunner` beans, so the settings table starts empty.

**Why this step is critical:** The entity has two FK relationships to entities with non-trivial inheritance (AdminEntity via JOINED inheritance) and an `@PreUpdate` lifecycle callback. Without repository tests, any of these could silently misconfigure without failing compilation.

- [x] Create `backend/src/test/java/com/agentForgeBackend/models/appSettings/AppSettingsRepositoryTest.java`
- [x] Write 6 tests per the behaviors listed below
- [x] Run `./mvnw test -Dtest=AppSettingsRepositoryTest` from `backend/` — confirm 6/6 pass, 0 failures

#### Implementation

```java
package com.agentForgeBackend.models.appSettings;

import com.agentForgeBackend.models.hq.admin.AdminEntity;
import com.agentForgeBackend.models.llm.LlmModelEntity;
import com.agentForgeBackend.shared.models.baseUser.UserRoles;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
@Tag("repository")
class AppSettingsRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private AppSettingsRepository appSettingsRepository;

    @BeforeEach
    void setUp() {
        entityManager.clear();
    }

    @Test
    void savesEntityWithAllNullFields() {
        AppSettingsEntity entity = new AppSettingsEntity();

        AppSettingsEntity saved = appSettingsRepository.saveAndFlush(entity);
        entityManager.clear();

        AppSettingsEntity loaded = appSettingsRepository.findById(saved.getId()).orElseThrow();
        assertNotNull(loaded.getId());
        assertNull(loaded.getOpenRouterApiKey());
        assertNull(loaded.getDefaultModel());
        assertNull(loaded.getUpdatedAt());
        assertNull(loaded.getUpdatedBy());
    }

    @Test
    void savesEntityWithLlmModelFk() {
        LlmModelEntity model = new LlmModelEntity();
        model.setModelId("openai/gpt-4o");
        model.setName("GPT-4o");
        entityManager.persist(model);
        entityManager.flush();

        AppSettingsEntity entity = new AppSettingsEntity();
        entity.setDefaultModel(model);
        AppSettingsEntity saved = appSettingsRepository.saveAndFlush(entity);
        entityManager.clear();

        AppSettingsEntity loaded = appSettingsRepository.findById(saved.getId()).orElseThrow();
        assertNotNull(loaded.getDefaultModel());
        assertEquals("openai/gpt-4o", loaded.getDefaultModel().getModelId());
    }

    @Test
    void savesEntityWithAdminEntityFk() {
        AdminEntity admin = new AdminEntity(
                "Admin", "Test", "admin@test.com",
                Set.of(UserRoles.ADMIN), "admintest", "hashed-password");
        entityManager.persist(admin);
        entityManager.flush();

        AppSettingsEntity entity = new AppSettingsEntity();
        entity.setUpdatedBy(admin);
        AppSettingsEntity saved = appSettingsRepository.saveAndFlush(entity);
        entityManager.clear();

        AppSettingsEntity loaded = appSettingsRepository.findById(saved.getId()).orElseThrow();
        assertNotNull(loaded.getUpdatedBy());
        assertEquals("admintest", loaded.getUpdatedBy().getUsername());
    }

    @Test
    void preUpdateSetsUpdatedAtOnEntityUpdate() {
        AppSettingsEntity entity = new AppSettingsEntity();
        AppSettingsEntity saved = appSettingsRepository.saveAndFlush(entity);
        assertNull(saved.getUpdatedAt()); // @PreUpdate not fired on initial INSERT
        entityManager.clear();

        AppSettingsEntity toUpdate = appSettingsRepository.findById(saved.getId()).orElseThrow();
        toUpdate.setOpenRouterApiKey("sk-test-key");
        appSettingsRepository.saveAndFlush(toUpdate);
        entityManager.clear();

        AppSettingsEntity updated = appSettingsRepository.findById(saved.getId()).orElseThrow();
        assertNotNull(updated.getUpdatedAt()); // @PreUpdate fired on UPDATE
    }

    @Test
    void findFirstByReturnsSingletonRowWhenPresent() {
        AppSettingsEntity entity = new AppSettingsEntity();
        appSettingsRepository.saveAndFlush(entity);
        entityManager.clear();

        Optional<AppSettingsEntity> result = appSettingsRepository.findFirstBy();

        assertTrue(result.isPresent());
        assertNotNull(result.get().getId());
    }

    @Test
    void findFirstByReturnsEmptyWhenTableIsEmpty() {
        // @DataJpaTest does not run CommandLineRunner bootstrap; table starts empty
        Optional<AppSettingsEntity> result = appSettingsRepository.findFirstBy();

        assertFalse(result.isPresent());
    }
}
```

#### Edge Cases

1. **`AdminEntity` JOINED inheritance in `@DataJpaTest`** — `entityManager.persist(admin)` inserts into both `base_user` and `admin` tables atomically within the test transaction. The FK in `app_settings.updated_by_id` points to `base_user.id`. Loading `AppSettingsEntity.updatedBy` triggers a JOIN query. This is the same Hibernate-transparent behavior the production code relies on.

2. **`@BeforeEach entityManager.clear()`** — Clears the persistence context cache between tests. Prevents state bleed from one test into the next. Does not delete rows (the `@DataJpaTest` transaction rolls back between tests automatically).

3. **`preUpdateSetsUpdatedAtOnEntityUpdate` — why `findById` instead of working with `saved`** — After `saveAndFlush` on an entity with a generated ID, the returned `saved` reference is managed. After `entityManager.clear()`, the entity is detached. Reloading via `findById` returns a fresh managed entity. Modifying a managed entity and calling `saveAndFlush` issues an `UPDATE` SQL statement, which triggers `@PreUpdate`. If we skip `entityManager.clear()` and modify `saved` directly, Hibernate's dirty checking may or may not detect the change depending on the session state. The reload pattern is safer and matches `LlmModelRepositoryTest.createdAtIsNotUpdatedOnSubsequentSave`.

4. **`savesEntityWithLlmModelFk` — lazy loading on reload** — `loaded.getDefaultModel()` triggers lazy loading of the FK relationship within the `@DataJpaTest`'s active transaction. H2 handles the JOIN correctly. No special configuration is needed.

---

### Step 7: Write AppSettingsMapperTest

**Goal:** Verify the masking contract exhaustively, including every boundary, and verify null-safety for all nullable fields. This is a pure unit test — no Spring context.

**Dependencies:** Steps 1–3 complete (AppSettingsEntity, AppSettingsDTO, AppSettingsMapper).

**Why this step is critical:** The masking logic is the security contract for GET /app-settings. Every boundary case must be tested so no future change accidentally exposes the full API key or causes an NPE.

- [x] Create `backend/src/test/java/com/agentForgeBackend/models/appSettings/AppSettingsMapperTest.java`
- [x] Write 12 tests per the behaviors listed below <!-- REVIEW-FIX: corrected from "10" — implementation has 12 test methods covering null entity, null/empty/short/long/real-format key masking, non-null/null defaultModel, non-null/null updatedBy, null/non-null updatedAt -->
- [x] Run `./mvnw test -Dtest=AppSettingsMapperTest` from `backend/` — confirm 12/12 pass, 0 failures

#### Implementation

```java
package com.agentForgeBackend.models.appSettings;

import com.agentForgeBackend.models.hq.admin.AdminEntity;
import com.agentForgeBackend.models.llm.LlmModelEntity;
import com.agentForgeBackend.models.llm.LlmModelMiniDTO;
import com.agentForgeBackend.shared.models.baseUser.UserRoles;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class AppSettingsMapperTest {

    private AppSettingsMapper mapper;
    private AppSettingsEntity entity;

    @BeforeEach
    void setUp() {
        mapper = new AppSettingsMapper();
        entity = new AppSettingsEntity();
        entity.setId(1L);
    }

    // --- null entity guard ---

    @Test
    void toDTO_nullEntityReturnsNull() {
        assertNull(mapper.toDTO(null));
    }

    // --- API key masking ---

    @Test
    void toDTO_nullKeyMapsToNullInDTO() {
        entity.setOpenRouterApiKey(null);
        AppSettingsDTO dto = mapper.toDTO(entity);
        assertNull(dto.getOpenRouterApiKey());
    }

    @Test
    void toDTO_emptyKeyMasksEntirely() {
        entity.setOpenRouterApiKey("");
        AppSettingsDTO dto = mapper.toDTO(entity);
        assertEquals("****", dto.getOpenRouterApiKey());
    }

    @Test
    void toDTO_shortKeyUpToEightCharsMasksEntirely() {
        // Boundary: exactly 8 chars is still "mask entirely"
        entity.setOpenRouterApiKey("12345678");
        AppSettingsDTO dto = mapper.toDTO(entity);
        assertEquals("****", dto.getOpenRouterApiKey());
    }

    @Test
    void toDTO_keyLongerThanEightCharsShowsLastFour() {
        // 9 chars: last 4 = "6789"
        entity.setOpenRouterApiKey("123456789");
        AppSettingsDTO dto = mapper.toDTO(entity);
        assertEquals("****6789", dto.getOpenRouterApiKey());
    }

    @Test
    void toDTO_realApiKeyFormatMasksCorrectly() {
        // Realistic API key: "sk-or-v1-abc123def456ghi7"
        entity.setOpenRouterApiKey("sk-or-v1-abc123def456ghi7");
        AppSettingsDTO dto = mapper.toDTO(entity);
        assertEquals("****ghi7", dto.getOpenRouterApiKey());
    }

    // --- defaultModel FK ---

    @Test
    void toDTO_nonNullDefaultModelMapsToLlmModelMiniDTO() {
        LlmModelEntity model = new LlmModelEntity();
        model.setId(42L);
        model.setModelId("openai/gpt-4o");
        model.setName("GPT-4o");
        model.setIsEnabled(true);
        entity.setDefaultModel(model);

        AppSettingsDTO dto = mapper.toDTO(entity);

        assertNotNull(dto.getDefaultModel());
        LlmModelMiniDTO miniDTO = dto.getDefaultModel();
        assertEquals(42L, miniDTO.getId());
        assertEquals("openai/gpt-4o", miniDTO.getModelId());
        assertEquals("GPT-4o", miniDTO.getName());
        assertTrue(miniDTO.getIsEnabled());
    }

    @Test
    void toDTO_nullDefaultModelMapsToNullInDTO() {
        entity.setDefaultModel(null);
        AppSettingsDTO dto = mapper.toDTO(entity);
        assertNull(dto.getDefaultModel());
    }

    // --- updatedBy FK ---

    @Test
    void toDTO_nonNullUpdatedByMapsUsernameOnly() {
        AdminEntity admin = new AdminEntity(
                "Admin", "Test", "admin@test.com",
                Set.of(UserRoles.ADMIN), "settings-admin", "hash");
        entity.setUpdatedBy(admin);

        AppSettingsDTO dto = mapper.toDTO(entity);

        assertEquals("settings-admin", dto.getUpdatedByUsername());
    }

    @Test
    void toDTO_nullUpdatedByMapsNullUsername() {
        entity.setUpdatedBy(null);
        AppSettingsDTO dto = mapper.toDTO(entity);
        assertNull(dto.getUpdatedByUsername());
    }

    // --- updatedAt passthrough ---

    @Test
    void toDTO_nullUpdatedAtMapsNullWithoutNpe() {
        entity.setUpdatedAt(null);
        AppSettingsDTO dto = mapper.toDTO(entity);
        // No NPE expected — LocalDateTime is a value type, null passes through
        assertNull(dto.getUpdatedAt());
    }

    @Test
    void toDTO_nonNullUpdatedAtPassesThroughUnchanged() {
        LocalDateTime timestamp = LocalDateTime.of(2026, 6, 17, 10, 30, 0);
        entity.setUpdatedAt(timestamp);
        AppSettingsDTO dto = mapper.toDTO(entity);
        assertEquals(timestamp, dto.getUpdatedAt());
    }
}
```

#### Edge Cases

1. **12 tests vs. parent estimate of 8** — The parent feature (step 2.8) estimates 8 mapper tests. This task implements 12 by adding `toDTO_realApiKeyFormatMasksCorrectly`, `toDTO_emptyKeyMasksEntirely`, `toDTO_nullEntityReturnsNull`, and `toDTO_nonNullUpdatedAtPassesThroughUnchanged`. The additional tests cover edge-case boundaries (empty string, boundary at 8 chars, realistic key format, non-null updatedAt passthrough) that are required for the security contract. This is a TDD supplement, not a divergence from the parent.

2. **`new AdminEntity(...)` in mapper test (no JPA context)** — AdminEntity is instantiated directly with the 6-parameter constructor. Its boolean fields (`accountNonExpired`, `accountNonLocked`, `credentialsNonExpired`, `enabled`) have Java-level defaults `= true` in BaseUserEntity. No persistence context is needed for the mapper test — the mapper accesses `.getUsername()` on a plain object, not a proxy.

3. **`model.setId(42L)` in mapper test** — `LlmModelEntity.id` is a Lombok-generated `setId(Long)` method. Setting the ID directly on an unpersisted object is valid for unit tests because we are testing the mapper's projection behavior, not persistence semantics.

4. **`toDTO_shortKeyUpToEightCharsMasksEntirely` tests exactly 8 chars** — This is the most important boundary case. A key of length 8 returns `"****"` (not `"****" + last 4`). The condition is `key.length() <= 8`, which includes exactly 8.

---

### Step 8: Run Full Test Suite and Verify No Regressions

**Goal:** Confirm the 18 new tests (6 repository + 12 mapper) pass and the existing 519 tests are unaffected. <!-- REVIEW-FIX: corrected from "16 new tests (6 repository + 10 mapper + 2)" — the mapper has 12 tests, making the total 18 new tests -->

**Dependencies:** All production files and test files in Steps 1–7 created successfully.

- [x] Run `./mvnw test` from `backend/`
- [x] Confirm total test count = 555 (278 unique tests × 2 surefire runs - 1 pre-existing error); 18 new tests added (6 repository + 12 mapper) <!-- REVIEW-FIX: clarified parenthetical — original stated "the 12 comes from the 12-test mapper", omitting the 6 repository tests from the sum -->
- [x] Confirm 0 failures
- [x] Confirm `authServerApplicationTests.contextLoads` is the only error (pre-existing Docker blocker)
- [x] If any test fails, investigate before continuing — do NOT suppress failures

#### Edge Cases

1. **QueryDSL compilation** — `AppSettingsEntity` does NOT use QueryDSL (`AppSettingsRepository` extends `JpaRepository`, not `QuerydslPredicateExecutor`). The QueryDSL APT processor will NOT generate a `QAppSettingsEntity` class. This is correct and expected. No compile-time recompile concern from QueryDSL.

2. **`spring.jpa.hibernate.ddl-auto=create-drop` in test** — Hibernate will create the `app_settings` table with `default_model_id` and `updated_by_id` FK columns. Since both `LlmModelEntity` and `AdminEntity` tables already exist (created by other entities in the same context), FK constraints will resolve correctly. No ordering concern.

3. **`AppSettingsBootstrap` in `@SpringBootTest` contexts** — If any existing tests use `@SpringBootTest` (like `LlmModelServiceCrudIntegrationTest`), `AppSettingsBootstrap.run()` will now execute during their context startup. The bootstrap inserts one row into `app_settings`. Since no existing test queries or cleans `app_settings`, this is a no-op addition that doesn't affect any existing test behavior.

---

## Design Decisions

**Decision 1: AppSettingsMapper does NOT extend DefaultMapper**
- **Why:** `DefaultMapper<DTO, MINIDTO, LISTDTO, FORM, ENTITY>` requires implementing `toSmallDTO()`, `toListDTO()`, and `toEntity()`. AppSettings has no "small DTO" (it's a singleton, not a list item), no "list DTO", and no "toEntity" (the form-to-entity logic is handled in the service, not the mapper). Forcing the interface would produce three empty/throwing methods — a direct ISP violation. The parent feature mandates the standalone @Component design.
- **Alternatives considered:** Extending DefaultMapper and returning null/throwing for unused methods. Rejected — violates ISP and would produce misleading dead code in the mapper.

**Decision 2: `toLlmMiniDTO()` inlined in AppSettingsMapper instead of injecting LlmModelMapper**
- **Why:** Injecting `LlmModelMapper` into `AppSettingsMapper` would create a cross-domain mapper dependency. The `models/appSettings/` package would depend on an internal of `models/llm/` (the mapper, not just the entity/DTO). Inlining the 4-field projection keeps AppSettingsMapper self-contained. The deletion test: if `LlmModelMapper` were injected, deleting it would require updating AppSettingsMapper — coupling that makes no semantic sense.
- **Alternatives considered:** Injecting `LlmModelMapper`. Rejected — cross-domain mapper coupling; the projection is 4 lines and doesn't warrant a seam.

**Decision 3: AppSettingsBootstrap uses `findFirstBy()` not `findById(1L)`**
- **Why:** `GenerationType.IDENTITY` delegates ID assignment to the database sequence. The sequence value is indeterminate — it could be any number depending on prior test runs or application history. `findById(1L)` assumes ID is always 1, which is fragile. `findFirstBy()` is sequence-agnostic and always finds the single row regardless of its ID value.
- **Alternatives considered:** `findById(1L)`. Rejected — fragile; breaks if the sequence has advanced or if the database is shared.

**Decision 4: `@PreUpdate` sets `updatedAt`, no `@PrePersist` for `updatedAt`**
- **Why:** The bootstrap seeds a row with all nulls. Tracking when the row was last modified (PATCH) is the purpose of `updatedAt`. If `@PrePersist` set `updatedAt` on insert, the initial bootstrap row would have `updatedAt` set to the application startup timestamp — misleading, since no admin has actually changed settings. The GET endpoint returning a non-null `updatedAt` before any PATCH would be confusing.
- **Alternatives considered:** `@PrePersist` setting `updatedAt` to now on initial create. Rejected — semantically incorrect; `updatedAt = null` means "never updated by an admin", which is the correct initial state.

**Decision 5: No `@NotBlank` on `AppSettingsForm.openRouterApiKey`**
- **Why:** The business rule is "blank/null key in the form = keep existing key". A `@NotBlank` Bean Validation constraint would reject PATCH requests that only update `defaultModelId` without providing a new API key. The constraint would break the idiomatic "partial update" behavior defined by the feature.
- **Alternatives considered:** `@NotBlank`, requiring API key on every PATCH. Rejected — forces admin to re-enter the key every time they change another field.

---

## Testing Considerations

### Automatic Validation

- [x] From `backend/`: `./mvnw test -Dtest=AppSettingsRepositoryTest` — confirm 6/6 pass, 0 failures
- [x] From `backend/`: `./mvnw test -Dtest=AppSettingsMapperTest` — confirm 12/12 pass, 0 failures
- [x] From `backend/`: `./mvnw test` — confirm 0 failures; total count = 555 (278 unique × 2 surefire runs - 1 pre-existing error); `authServerApplicationTests.contextLoads` remains the only error (pre-existing Docker blocker)

### Manual Validation

No manual validation is required for this task. All production code in Task 2 (entity, form, DTO, mapper, repository, bootstrap) has no HTTP surface — it is exercised only through repository and mapper tests. The HTTP surface (controller endpoints) belongs to Task 3.

---

## Related Code Explanations

- `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelEntity.java` — FK target for `defaultModel`; same Lombok + `@PrePersist` pattern
- `backend/src/main/java/com/agentForgeBackend/models/hq/admin/AdminEntity.java` — FK target for `updatedBy`; JOINED inheritance from BaseUserEntity
- `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelMapper.java` — prior art for the standalone `@Component` mapper pattern
- `backend/src/main/java/com/agentForgeBackend/configuration/boostrap/AdminBoostrap.java` — structural reference for AppSettingsBootstrap; same package, same CommandLineRunner pattern
- `backend/src/test/java/com/agentForgeBackend/models/llm/LlmModelRepositoryTest.java:73-90` — `createdAtIsNotUpdatedOnSubsequentSave` — exact prior art for the `@PreUpdate` test pattern in Step 6
- `backend/src/test/java/com/agentForgeBackend/models/hq/ListQueryTestDataFactory.java:29-38` — `admin()` helper — prior art for creating an AdminEntity in tests

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected for this task
- [x] Spring Data JPA `findFirstBy()` and `@PreUpdate` verified against Spring Boot 3.4.1 / Spring Data JPA 3.x docs
- [x] `AppSettingsEntity.java` created in `models/appSettings/` with all 5 fields, 2 FK annotations, and `@PreUpdate`
- [x] `AppSettingsForm.java` created in `models/appSettings/` with 2 optional fields, no Bean Validation constraints
- [x] `AppSettingsDTO.java` created in `models/appSettings/` with 5 fields including `LlmModelMiniDTO` and `updatedByUsername`
- [x] `AppSettingsMapper.java` created in `models/appSettings/` as standalone `@Component` with masking logic and null guards
- [x] `AppSettingsRepository.java` created in `models/appSettings/` extending `JpaRepository` with `findFirstBy()`
- [x] `AppSettingsBootstrap.java` created in `configuration/boostrap/` (note: typo package) as `CommandLineRunner` with idempotent seed
- [x] `AppSettingsRepositoryTest.java` created with 6 tests covering: null FK save, LlmModelEntity FK, AdminEntity FK, `@PreUpdate`, `findFirstBy()` present, `findFirstBy()` empty
- [x] `AppSettingsMapperTest.java` created with 12 tests covering: null entity, null key, empty key, 8-char key boundary, long key, real format key, non-null defaultModel, null defaultModel, non-null updatedBy, null updatedBy, null updatedAt, non-null updatedAt
- [x] From `backend/`: `./mvnw test -Dtest=AppSettingsRepositoryTest` — 6/6 pass
- [x] From `backend/`: `./mvnw test -Dtest=AppSettingsMapperTest` — 12/12 pass
- [x] From `backend/`: `./mvnw test` — 0 failures; total count = 555 (278 unique tests × 2 surefire runs - 1 pre-existing error); `authServerApplicationTests.contextLoads` remains the only error
- [x] No modifications made to any file from Task 1 (`SecurityConfig.java`, `SecurityAuthorizationTest.java`)
- [x] Parent feature Steps 2.1–2.8 ready to be marked complete after execution
