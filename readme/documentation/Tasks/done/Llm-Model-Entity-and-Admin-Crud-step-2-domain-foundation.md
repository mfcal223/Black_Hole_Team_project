# Task: LlmModel Domain Foundation

#task #current #medium-complexity #parent-llm-model-entity-and-admin-crud

**Parent:** [[Llm-Model-Entity-and-Admin-Crud]]
**Parent Type:** Feature
**Related Step(s):** Phase 2 — Steps 2.1, 2.2, 2.3, 2.4, 2.5
**Estimated Complexity:** Medium

---

## Goal

Create the complete domain contract for `LlmModelEntity`: entity, DTOs (DTO, MiniDTO, ListDTO), form, mapper, and repository, then trigger a Maven compile to generate `QLlmModelEntity` via QueryDSL APT so that Task 3's query profile can reference it. This task produces the persistence and API-contract layer that all business logic in Task 3 depends on.

---

## Parent Context

The feature defines four implementation tasks. Task 1 (security baseline) is complete: `/llm-model/**` is already gated at `hasRole("ADMIN")` in `SecurityConfig`. Task 2 produces the domain foundation — entity, DTOs, mapper, and repository. Task 3 will build on this foundation to add `LlmModelQueryProfile`, `LlmModelService`, and `LlmModelController`.

Key constraints from the parent feature and its review findings:

- **`LlmModelEntity` does NOT extend `BaseUserEntity`** — it is a standalone entity with its own table, not a user subtype. No JOINED inheritance.
- **Package: `models/llm/`** — top-level peer of `models/hq/`, not nested under admin, because future entities (Conversation, Message) will import it.
- **PK: `Long` with auto-increment** — consistent with all existing entities per [[ADRs/ADR-009-long-primary-key-for-all-entities]].
- **`isEnabled` default via entity field initializer** — `private Boolean isEnabled = true` on the entity. The mapper does NOT set `isEnabled`; the service `insert()` does NOT set `isEnabled`. The entity field initializer is the sole authority for the default (Finding 1 resolution from [[Bugs/to-do/Review-of-Llm-Model-Entity-and-Admin-Crud]]).
- **`isEnabled` excluded from `LlmModelForm`** — enabled-state changes are exclusively via `PATCH /{id}/toggle`. PUT/POST payloads carry only `modelId`, `name`, and `description` (Finding 3 resolution).
- **`@PrePersist` for `createdAt`** — do NOT use database-level defaults; Hibernate DDL auto does not reliably create them across H2 (tests) and PostgreSQL (production).
- **`Boolean` (boxed), not `boolean` (primitive)** for `isEnabled` — avoids accidental primitive coercion in JPA and QueryDSL predicate contexts.
- **`modelId` is stored as-is** — no encoding or transformation.
- **`QLlmModelEntity` must be generated** before Task 3 can write `LlmModelQueryProfile`. Step 2.5 produces it via `./mvnw compile` from the `backend/` directory. <!-- REVIEW-FIX: removed incorrect -pl backend flag; pom.xml is inside backend/, so running from there needs no -pl flag -->

---

## Preconditions / Dependencies

- Task 1 is complete: `/llm-model/**` rule is live in `SecurityConfig`, 3 security tests pass in `SecurityAuthorizationTest`. Full test suite: 355 tests, 0 failures, 1 pre-existing Docker error.
- Spring Boot 3.4.1, QueryDSL JPA 6.12 (openfeign fork), Lombok, H2 test profile — all already configured in `backend/pom.xml`.
- `querydsl-apt` annotation processor is wired in `maven-compiler-plugin` — `QLlmModelEntity` will be generated automatically on next `compile` once `LlmModelEntity` is created.
- `DefaultRepository<ENTITY, ID>` interface is ready in `shared/defaultInterfaces/`.
- `DefaultMapper<DTO, MINIDTO, LISTDTO, FORM, ENTITY>` interface is ready in `shared/defaultInterfaces/`.
- H2 in-memory test profile at `application-test.properties` is already configured for `@DataJpaTest` tests.
- `models/llm/` package does not yet exist — this task creates it.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — Selected — task template, doc creation, and cross-reference conventions
- `solid-deep-design` — Selected — SOLID + deletion test analysis for entity, DTOs, mapper, repository
- `tdd` — Selected — vertical-slice TDD: one failing test → minimal implementation → repeat, for repository and mapper
- `memory-bank` — Selected — architecture, known-issues, and prior task context fully loaded
- `glossary-management` — Not needed — domain terms (LlmModel, modelId, isEnabled, toggle) are established in the parent feature and ADR-007; no new glossary entries required
- `find-docs` — Not needed for external queries — Spring Data JPA `@PrePersist`, `@Column` constraints, `Boolean` field initializer, and QueryDSL APT patterns are all demonstrated by the existing codebase (identical patterns in `BaseUserEntity`, `AdminQueryProfile`, and `pom.xml`)

### Documentation Reviewed

- [[ADRs/ADR-009-long-primary-key-for-all-entities]] — PK type: `Long` with `@GeneratedValue(IDENTITY)`
- [[ADRs/ADR-007-admin-curated-llm-model-list]] — `isEnabled` as the only enablement mechanism; form excludes `isEnabled`
- [[Bugs/to-do/Review-of-Llm-Model-Entity-and-Admin-Crud]] — Finding 1 (entity field initializer owns `isEnabled` default), Finding 3 (`isEnabled` removed from form)
- [[Tasks/current/Llm-Model-Entity-and-Admin-Crud-step-1-security-baseline]] — Task 1 final state and test count
- `backend/pom.xml` — Spring Boot 3.4.1, QueryDSL openfeign 6.12, Lombok, Java 21 confirmed

### Related Existing Code

- `backend/src/main/java/com/agentForgeBackend/shared/models/baseUser/BaseUserEntity.java:59-68` — field initializer pattern for boolean columns (`enabled = true`); `LlmModelEntity.isEnabled` follows this exactly
- `backend/src/main/java/com/agentForgeBackend/models/hq/admin/AdminMapper.java:60-84` — null-skip `toEntity()` pattern; `LlmModelMapper.toEntity()` replicates this pattern for `modelId`, `name`, `description`
- `backend/src/main/java/com/agentForgeBackend/models/hq/admin/AdminQueryProfile.java:16-29` — `QAdminEntity`-based QueryDSL field declaration; `LlmModelQueryProfile` (Task 3) will follow this pattern using `QLlmModelEntity`
- `backend/src/main/java/com/agentForgeBackend/shared/defaultInterfaces/DefaultMapper.java` — interface that `LlmModelMapper` implements
- `backend/src/main/java/com/agentForgeBackend/shared/defaultInterfaces/DefaultRepository.java` — interface that `LlmModelRepository` extends
- `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeRepositoryTest.java` — prior art for `@DataJpaTest` / `TestEntityManager` patterns
- `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeMapperTest.java` — prior art for pure unit mapper tests without Spring context

---

## Implementation Details

### Approach

This task applies **vertical-slice TDD**: for repository and mapper, write one failing test, implement the minimal code that makes it pass, then iterate. DTOs are data containers with no behavior — they don't need independent tests (their correctness is verified through mapper tests). The compile step (Step 5) gates Task 3 and should be verified before marking this task complete.

**SOLID + Depth Analysis:**

- **`LlmModelEntity`** — SRP: one reason to change (the persisted fields of LlmModel change). Standalone entity — no inheritance, no delegation, behavior limited to `@PrePersist` lifecycle. Correctly shallow: it is a data container, and being shallow here is right.
- **`LlmModelForm`** — SRP: HTTP input contract for create/update. `isEnabled` excluded by design. One reason to change: the set of mutable admin-controlled fields changes.
- **`LlmModelMapper`** — SRP: pure structural conversion between form/entity and DTOs. No business logic. One reason to change: field mapping logic changes. Follows `AdminMapper.toEntity()` null-skip pattern. Deep relative to callers: hides 4 DTO types behind the `DefaultMapper` 4-method interface.
- **`LlmModelRepository`** — SRP: persistence access for `LlmModel`. Extends `DefaultRepository<LlmModelEntity, Long>` (provides `findById`, `save`, `delete`, `existsById`, QueryDSL predicate executor). Adds `findByModelId` and `existsByModelId` as natural-key lookups. Deep module: Spring Data hides the JPA implementation behind a 2-method public interface.

**Deletion test results:**
- Delete `LlmModelMapper` → callers (service) must reimplement field mapping inline; complexity scatters. Mapper earns its keep.
- Delete `LlmModelRepository` → callers must use raw `EntityManager` for QueryDSL predicate execution and CRUD. Repository earns its keep.

### Files to Create/Modify

- [x] `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelEntity.java` — New entity (Step 2.1)
- [x] `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelForm.java` — New form (Step 2.2)
- [x] `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelDTO.java` — New full DTO (Step 2.2)
- [x] `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelMiniDTO.java` — New insert-response DTO (Step 2.2)
- [x] `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelListDTO.java` — New paginated-list DTO (Step 2.2)
- [x] `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelMapper.java` — New mapper (Step 2.3)
- [x] `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelRepository.java` — New repository (Step 2.4)
- [x] `backend/src/test/java/com/agentForgeBackend/models/llm/LlmModelRepositoryTest.java` — Repository TDD tests (Steps 2.1, 2.4)
- [x] `backend/src/test/java/com/agentForgeBackend/models/llm/LlmModelMapperTest.java` — Mapper TDD tests (Step 2.3)

---

## Step-by-Step Implementation

### Step 1: Entity Foundation + First Repository Test (TDD RED → GREEN)

**Goal:** Write the first failing repository test, then create the entity and repository to make it pass. The first test proves the entity persists and returns an assigned id — the foundation all subsequent tests depend on.

**Dependencies:** `DefaultRepository<ENTITY, ID>` interface exists. H2 `@DataJpaTest` profile configured.

- [x] Create `backend/src/main/java/com/agentForgeBackend/models/llm/` directory
- [x] Create `backend/src/test/java/com/agentForgeBackend/models/llm/` directory
- [x] Write `LlmModelRepositoryTest.java` skeleton with only the first test `savesEntityAndAssignsId`
- [x] Run `./mvnw test -Dtest=LlmModelRepositoryTest` from `backend/` — **expect compile failure** (entity + repository not yet created)
- [x] Create `LlmModelEntity.java` with ALL fields defined up front
- [x] Create `LlmModelRepository.java` with `findByModelId` and `existsByModelId` defined up front
- [x] Run `./mvnw test -Dtest=LlmModelRepositoryTest` from `backend/` — **expect `savesEntityAndAssignsId` to pass** (1 test)

**Why this step is critical:** Creating the entity with all columns up front avoids repeated Hibernate schema regeneration that would occur if columns were added one at a time. The first test confirms JPA mapping, H2 DDL creation, and id auto-generation all work before adding more behavior.

#### Implementation

**`LlmModelEntity.java`:**
```java
package com.agentForgeBackend.models.llm;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "llm_model")
@Getter
@Setter
@NoArgsConstructor
public class LlmModelEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "model_id", nullable = false, unique = true)
    private String modelId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description")
    private String description;

    @Column(name = "is_enabled", nullable = false)
    private Boolean isEnabled = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onPersist() {
        this.createdAt = LocalDateTime.now();
    }
}
```

**`LlmModelRepository.java`:**
```java
package com.agentForgeBackend.models.llm;

import com.agentForgeBackend.shared.defaultInterfaces.DefaultRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface LlmModelRepository extends DefaultRepository<LlmModelEntity, Long> {
    Optional<LlmModelEntity> findByModelId(String modelId);
    boolean existsByModelId(String modelId);
}
```

**`LlmModelRepositoryTest.java` (skeleton — first test only):**
```java
package com.agentForgeBackend.models.llm;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
@Tag("repository")
class LlmModelRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private LlmModelRepository llmModelRepository;

    @BeforeEach
    void setUp() {
        entityManager.clear();
    }

    @Test
    void savesEntityAndAssignsId() {
        LlmModelEntity entity = new LlmModelEntity();
        entity.setModelId("openai/gpt-4o");
        entity.setName("GPT-4o");

        LlmModelEntity saved = llmModelRepository.save(entity);
        entityManager.flush();
        entityManager.clear();

        assertNotNull(saved.getId());
        assertTrue(llmModelRepository.existsById(saved.getId()));
    }
}
```

#### Edge Cases

1. **H2 DDL auto-create** — `spring.jpa.hibernate.ddl-auto=create-drop` in `application-test.properties` causes H2 to create the `llm_model` table from the entity definition at test startup. No migration script needed.
2. **`@Column(updatable = false)` on `createdAt`** — Hibernate respects this at the JPA level and omits `created_at` from UPDATE statements. Tested in Step 2.
3. **`name` not set in first test** — The `name` column is `nullable = false` in the entity spec but `@Column(nullable = false)` constraints are enforced by the database on flush. Since we call `entityManager.flush()`, this test would fail if `name` is omitted. Set it in the test setup.

---

### Step 2: Complete Repository Tests (TDD iterations)

**Goal:** Add the remaining repository behavior tests incrementally. Each test targets a distinct behavior: auto-timestamp, default enabled state, lookup by natural key, and uniqueness constraint.

**Dependencies:** Step 1 complete — entity, repository, and `savesEntityAndAssignsId` all passing.

- [x] Add `createdAtIsAutoSetOnPersist` test → run → expect pass
- [x] Add `newEntityHasIsEnabledTrue` test → run → expect pass
- [x] Add `createdAtIsNotUpdatedOnSubsequentSave` test → run → expect pass
- [x] Add `findByModelIdReturnsEntityWhenPresent` test → run → expect pass
- [x] Add `findByModelIdReturnsEmptyForUnknownModelId` test → run → expect pass
- [x] Add `existsByModelIdReturnsTrueWhenPresent` test → run → expect pass
- [x] Add `existsByModelIdReturnsFalseWhenAbsent` test → run → expect pass
- [x] Add `duplicateModelIdThrowsDataIntegrityViolationException` test → run → expect pass
- [x] Run `./mvnw test -Dtest=LlmModelRepositoryTest` from `backend/` — confirm all 9 tests pass <!-- REVIEW-FIX: added createdAtIsNotUpdatedOnSubsequentSave test to verify @Column(updatable=false) on created_at; count updated 8→9 -->

**Why this step is critical:** The `createdAtIsAutoSetOnPersist` test validates the `@PrePersist` lifecycle callback fires — a constraint that `LlmModelListDTO` depends on (non-null `createdAt`). The `createdAtIsNotUpdatedOnSubsequentSave` test validates the `@Column(updatable = false)` annotation is respected by Hibernate, protecting against accidental timestamp drift on updates. The `duplicateModelIdThrowsDataIntegrityViolationException` test validates the `unique = true` DB constraint that backs the service-layer `existsByModelId` uniqueness check.

#### Implementation

Add these tests to `LlmModelRepositoryTest.java` after the first test:

```java
@Test
void createdAtIsAutoSetOnPersist() {
    LlmModelEntity entity = new LlmModelEntity();
    entity.setModelId("anthropic/claude-3-haiku");
    entity.setName("Claude 3 Haiku");

    llmModelRepository.saveAndFlush(entity);
    entityManager.clear();

    LlmModelEntity loaded = llmModelRepository.findByModelId("anthropic/claude-3-haiku").orElseThrow();
    assertNotNull(loaded.getCreatedAt());
}

@Test
void newEntityHasIsEnabledTrue() {
    LlmModelEntity entity = new LlmModelEntity();
    entity.setModelId("meta-llama/llama-3-8b");
    entity.setName("LLaMA 3 8B");

    LlmModelEntity saved = llmModelRepository.saveAndFlush(entity);
    entityManager.clear();

    LlmModelEntity loaded = llmModelRepository.findById(saved.getId()).orElseThrow();
    assertTrue(loaded.getIsEnabled());
}

@Test
void findByModelIdReturnsEntityWhenPresent() {
    LlmModelEntity entity = new LlmModelEntity();
    entity.setModelId("google/gemini-flash-1.5");
    entity.setName("Gemini Flash 1.5");
    entityManager.persist(entity);
    entityManager.flush();
    entityManager.clear();

    Optional<LlmModelEntity> result = llmModelRepository.findByModelId("google/gemini-flash-1.5");

    assertTrue(result.isPresent());
    assertEquals("Gemini Flash 1.5", result.get().getName());
}

@Test
void findByModelIdReturnsEmptyForUnknownModelId() {
    Optional<LlmModelEntity> result = llmModelRepository.findByModelId("nonexistent/model");
    assertFalse(result.isPresent());
}

@Test
void existsByModelIdReturnsTrueWhenPresent() {
    LlmModelEntity entity = new LlmModelEntity();
    entity.setModelId("mistral/mistral-7b");
    entity.setName("Mistral 7B");
    entityManager.persist(entity);
    entityManager.flush();
    entityManager.clear();

    assertTrue(llmModelRepository.existsByModelId("mistral/mistral-7b"));
    assertFalse(llmModelRepository.existsByModelId("mistral/unknown"));
}

@Test
void existsByModelIdReturnsFalseWhenAbsent() {
    assertFalse(llmModelRepository.existsByModelId("any/model"));
}

@Test
void createdAtIsNotUpdatedOnSubsequentSave() {
    LlmModelEntity entity = new LlmModelEntity();
    entity.setModelId("test/immutable-created-at");
    entity.setName("Immutable Test");
    LlmModelEntity saved = llmModelRepository.saveAndFlush(entity);
    LocalDateTime originalCreatedAt = saved.getCreatedAt();
    entityManager.clear();

    LlmModelEntity loaded = llmModelRepository.findById(saved.getId()).orElseThrow();
    loaded.setName("Updated Name");
    llmModelRepository.saveAndFlush(loaded);
    entityManager.clear();

    LlmModelEntity reloaded = llmModelRepository.findById(saved.getId()).orElseThrow();
    assertEquals(originalCreatedAt, reloaded.getCreatedAt());
}

@Test
void duplicateModelIdThrowsDataIntegrityViolationException() {
    LlmModelEntity first = new LlmModelEntity();
    first.setModelId("openai/gpt-4o-mini");
    first.setName("GPT-4o Mini");
    llmModelRepository.saveAndFlush(first);

    LlmModelEntity duplicate = new LlmModelEntity();
    duplicate.setModelId("openai/gpt-4o-mini");
    duplicate.setName("GPT-4o Mini Duplicate");

    assertThrows(DataIntegrityViolationException.class, () ->
            llmModelRepository.saveAndFlush(duplicate));
}
```

#### Edge Cases

1. **`entityManager.clear()` before `findByModelId`** — Forces Hibernate to issue a fresh SELECT rather than returning a cached first-level-cache instance. Without `clear()`, the test would pass even if the column was not actually flushed to H2, because Hibernate would return the in-memory object.
2. **`saveAndFlush` vs `save` + `flush`** — `saveAndFlush` immediately synchronizes to H2 and detects constraint violations. `save()` alone may defer the flush to transaction end, causing `assertThrows` to miss the `DataIntegrityViolationException`.
3. **`createdAtIsAutoSetOnPersist` does NOT set `createdAt` in the test** — The test relies exclusively on `@PrePersist`. If the test had set `createdAt`, it would not validate the callback fires — only that the field can be persisted.

---

### Step 3: Create DTOs and Form

**Goal:** Create all four contract types — `LlmModelForm`, `LlmModelDTO`, `LlmModelMiniDTO`, `LlmModelListDTO`. No independent behavior tests for DTOs — their correctness is verified through mapper tests in Step 4.

**Dependencies:** Step 1 complete (entity exists, compiler passes for the `models/llm` package).

- [x] Create `LlmModelForm.java`
- [x] Create `LlmModelDTO.java`
- [x] Create `LlmModelMiniDTO.java`
- [x] Create `LlmModelListDTO.java`
- [x] Run `./mvnw compile` from `backend/` — expect `BUILD SUCCESS` (DTOs are pure data containers)

**Why this step is critical:** Mapper tests in Step 4 import all four DTO types. Creating them before mapper tests ensures `LlmModelMapper.java` compiles cleanly on its first write.

#### Implementation

**`LlmModelForm.java`:**
```java
package com.agentForgeBackend.models.llm;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class LlmModelForm {

    @NotBlank
    private String modelId;

    @NotBlank
    private String name;

    private String description;
    // isEnabled intentionally excluded — enabled state is exclusively managed by PATCH /{id}/toggle
}
```

**`LlmModelDTO.java`:**
```java
package com.agentForgeBackend.models.llm;

import lombok.*;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Getter
@Setter
public class LlmModelDTO {
    private Long id;
    private String modelId;
    private String name;
    private String description;
    private Boolean isEnabled;
    private LocalDateTime createdAt;
}
```

**`LlmModelMiniDTO.java`:**
```java
package com.agentForgeBackend.models.llm;

import lombok.*;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Getter
@Setter
public class LlmModelMiniDTO {
    private Long id;
    private String modelId;
    private String name;
    private Boolean isEnabled;
}
```

**`LlmModelListDTO.java`:**
```java
package com.agentForgeBackend.models.llm;

import lombok.*;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Getter
@Setter
public class LlmModelListDTO {
    private Long id;
    private String modelId;
    private String name;
    private String description;
    private Boolean isEnabled;
    private LocalDateTime createdAt;
}
```

#### Edge Cases

1. **`@Data` + `@Getter` + `@Setter` redundancy** — `@Data` already generates getters, setters, `equals`, `hashCode`, and `toString`. Adding `@Getter` and `@Setter` explicitly is redundant but matches the existing project DTO pattern (see `EmployeeDTO`, `EmployeeListDTO`). Retain for consistency.
2. **`Boolean` (boxed) not `boolean` (primitive) for `isEnabled`** — A `boolean` primitive auto-defaults to `false` in a partially-constructed DTO, which could produce a misleading `false` in API responses when a mapper returns a DTO without explicitly setting the field. Boxed `Boolean` returns `null` in such cases, which is more accurately "unknown" than "disabled".
3. **`LlmModelMiniDTO` does NOT include `description` or `createdAt`** — It is the insert-response compact view. Callers only need to confirm the model was created and know its id, modelId, name, and enabled state.

---

### Step 4: Create Mapper with TDD

**Goal:** Create `LlmModelMapper` using TDD. Write one failing test, create the mapper with all four methods, then add remaining tests.

**Dependencies:** Step 3 complete — all DTO types and form exist. Step 1 complete — entity exists.

- [x] Create `LlmModelMapperTest.java` with only the first test: `toDTO_mapsAllFields`
- [x] Run `./mvnw test -Dtest=LlmModelMapperTest` from `backend/` — **expect compile failure** (mapper not yet created)
- [x] Create `LlmModelMapper.java` with all four methods implemented
- [x] Run `./mvnw test -Dtest=LlmModelMapperTest` from `backend/` — **expect first test to pass**
- [x] Add `toDTO_handlesNullDescription` → run → expect pass
- [x] Add `toDTO_nullEntityReturnsNull` → run → expect pass
- [x] Add `toSmallDTO_mapsIdModelIdNameIsEnabled` → run → expect pass
- [x] Add `toSmallDTO_nullEntityReturnsNull` → run → expect pass
- [x] Add `toListDTO_mapsAllFields` → run → expect pass
- [x] Add `toListDTO_handlesNullDescription` → run → expect pass
- [x] Add `toListDTO_nullEntityReturnsNull` → run → expect pass
- [x] Add `toEntity_mapsModelIdNameDescription` → run → expect pass
- [x] Add `toEntity_skipsNullFields` → run → expect pass
- [x] Add `toEntity_isEnabledDefaultsTrueFromEntityFieldInitializer` → run → expect pass
- [x] Add `toEntity_nullFormReturnsNull` → run → expect pass
- [x] Run `./mvnw test -Dtest=LlmModelMapperTest` from `backend/` — confirm all 12 tests pass <!-- REVIEW-FIX: corrected count from 13 to 12; only 12 mapper tests are defined in the code -->

**Why this step is critical:** The mapper is the boundary between the persistence layer and the API contract. `toEntity_isEnabledDefaultsTrueFromEntityFieldInitializer` is the key test that validates Finding 1's resolution — the mapper must NOT touch `isEnabled`, and the entity field initializer must supply `true`.

#### Implementation

**`LlmModelMapper.java`:**
```java
package com.agentForgeBackend.models.llm;

import com.agentForgeBackend.shared.defaultInterfaces.DefaultMapper;
import org.springframework.stereotype.Component;

@Component
public class LlmModelMapper implements DefaultMapper<LlmModelDTO, LlmModelMiniDTO, LlmModelListDTO, LlmModelForm, LlmModelEntity> {

    @Override
    public LlmModelDTO toDTO(LlmModelEntity entity) {
        if (entity == null) return null;
        return LlmModelDTO.builder()
                .id(entity.getId())
                .modelId(entity.getModelId())
                .name(entity.getName())
                .description(entity.getDescription())
                .isEnabled(entity.getIsEnabled())
                .createdAt(entity.getCreatedAt())
                .build();
    }

    @Override
    public LlmModelMiniDTO toSmallDTO(LlmModelEntity entity) {
        if (entity == null) return null;
        return LlmModelMiniDTO.builder()
                .id(entity.getId())
                .modelId(entity.getModelId())
                .name(entity.getName())
                .isEnabled(entity.getIsEnabled())
                .build();
    }

    @Override
    public LlmModelListDTO toListDTO(LlmModelEntity entity) {
        if (entity == null) return null;
        return LlmModelListDTO.builder()
                .id(entity.getId())
                .modelId(entity.getModelId())
                .name(entity.getName())
                .description(entity.getDescription())
                .isEnabled(entity.getIsEnabled())
                .createdAt(entity.getCreatedAt())
                .build();
    }

    @Override
    public LlmModelEntity toEntity(LlmModelForm form) {
        if (form == null) return null;
        LlmModelEntity entity = new LlmModelEntity();
        if (form.getModelId() != null)
            entity.setModelId(form.getModelId());
        if (form.getName() != null)
            entity.setName(form.getName());
        if (form.getDescription() != null)
            entity.setDescription(form.getDescription());
        // isEnabled NOT set here — entity field initializer (= true) is the sole authority
        return entity;
    }
}
```

**`LlmModelMapperTest.java`:**
```java
package com.agentForgeBackend.models.llm;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class LlmModelMapperTest {

    private LlmModelMapper mapper;
    private LlmModelEntity entity;
    private static final LocalDateTime TEST_DATETIME = LocalDateTime.of(2024, 1, 15, 10, 30, 0);

    @BeforeEach
    void setUp() {
        mapper = new LlmModelMapper();
        entity = new LlmModelEntity();
        entity.setId(1L);
        entity.setModelId("openai/gpt-4o");
        entity.setName("GPT-4o");
        entity.setDescription("OpenAI flagship model");
        entity.setIsEnabled(true);
        entity.setCreatedAt(TEST_DATETIME);
    }

    // --- toDTO tests ---

    @Test
    void toDTO_mapsAllFields() {
        LlmModelDTO dto = mapper.toDTO(entity);

        assertEquals(1L, dto.getId());
        assertEquals("openai/gpt-4o", dto.getModelId());
        assertEquals("GPT-4o", dto.getName());
        assertEquals("OpenAI flagship model", dto.getDescription());
        assertTrue(dto.getIsEnabled());
        assertEquals(TEST_DATETIME, dto.getCreatedAt());
    }

    @Test
    void toDTO_handlesNullDescription() {
        entity.setDescription(null);
        LlmModelDTO dto = mapper.toDTO(entity);

        assertEquals("openai/gpt-4o", dto.getModelId());
        assertNull(dto.getDescription());
    }

    @Test
    void toDTO_nullEntityReturnsNull() {
        assertNull(mapper.toDTO(null));
    }

    // --- toSmallDTO tests ---

    @Test
    void toSmallDTO_mapsIdModelIdNameIsEnabled() {
        LlmModelMiniDTO mini = mapper.toSmallDTO(entity);

        assertEquals(1L, mini.getId());
        assertEquals("openai/gpt-4o", mini.getModelId());
        assertEquals("GPT-4o", mini.getName());
        assertTrue(mini.getIsEnabled());
    }

    @Test
    void toSmallDTO_nullEntityReturnsNull() {
        assertNull(mapper.toSmallDTO(null));
    }

    // --- toListDTO tests ---

    @Test
    void toListDTO_mapsAllFields() {
        LlmModelListDTO listDTO = mapper.toListDTO(entity);

        assertEquals(1L, listDTO.getId());
        assertEquals("openai/gpt-4o", listDTO.getModelId());
        assertEquals("GPT-4o", listDTO.getName());
        assertEquals("OpenAI flagship model", listDTO.getDescription());
        assertTrue(listDTO.getIsEnabled());
        assertEquals(TEST_DATETIME, listDTO.getCreatedAt());
    }

    @Test
    void toListDTO_handlesNullDescription() {
        entity.setDescription(null);
        LlmModelListDTO listDTO = mapper.toListDTO(entity);

        assertNull(listDTO.getDescription());
        assertEquals("openai/gpt-4o", listDTO.getModelId());
    }

    @Test
    void toListDTO_nullEntityReturnsNull() {
        assertNull(mapper.toListDTO(null));
    }

    // --- toEntity tests ---

    @Test
    void toEntity_mapsModelIdNameDescription() {
        LlmModelForm form = new LlmModelForm("anthropic/claude-3-haiku", "Claude 3 Haiku", "Fast and cheap");

        LlmModelEntity result = mapper.toEntity(form);

        assertEquals("anthropic/claude-3-haiku", result.getModelId());
        assertEquals("Claude 3 Haiku", result.getName());
        assertEquals("Fast and cheap", result.getDescription());
    }

    @Test
    void toEntity_skipsNullFields() {
        LlmModelForm form = new LlmModelForm();
        form.setModelId("openai/gpt-4o");

        LlmModelEntity result = mapper.toEntity(form);

        assertEquals("openai/gpt-4o", result.getModelId());
        assertNull(result.getName());
        assertNull(result.getDescription());
    }

    @Test
    void toEntity_isEnabledDefaultsTrueFromEntityFieldInitializer() {
        LlmModelForm form = new LlmModelForm("openai/gpt-4o-mini", "GPT-4o Mini", null);

        LlmModelEntity result = mapper.toEntity(form);

        // The mapper does NOT set isEnabled. Entity field initializer (= true) provides the default.
        assertTrue(result.getIsEnabled(),
                "isEnabled should be true from LlmModelEntity field initializer, not set by mapper");
    }

    @Test
    void toEntity_nullFormReturnsNull() {
        assertNull(mapper.toEntity(null));
    }
}
```

#### Edge Cases

1. **`toEntity_isEnabledDefaultsTrueFromEntityFieldInitializer`** — This test validates Finding 1's resolution. The assertion `assertTrue(result.getIsEnabled())` passes because `LlmModelEntity` has `private Boolean isEnabled = true`. If a future developer adds `entity.setIsEnabled(true)` to the mapper, the test still passes (behavior is still correct), but the comment makes the design intent clear.
2. **`toSmallDTO` does NOT include `description` or `createdAt`** — The test `toSmallDTO_mapsIdModelIdNameIsEnabled` implicitly validates this by asserting only the 4 expected fields. No negative assertion is needed — the absence is structural (those fields are not on `LlmModelMiniDTO`).
3. **`LocalDateTime.equals()` in test assertions** — `LocalDateTime` implements `equals()` by comparing all date and time components. `assertEquals(TEST_DATETIME, dto.getCreatedAt())` is correct. No need for epsilon comparisons.
4. **`@ExtendWith(MockitoExtension.class)` for mapper test** — Mockito is not used for mocking in this test (mapper has no injectable dependencies). The extension is used to match the existing test class pattern (e.g., `EmployeeMapperTest`). It adds no overhead.

---

### Step 5: Compile to Generate `QLlmModelEntity`

**Goal:** Trigger a Maven compile to cause the QueryDSL APT processor to generate `QLlmModelEntity`. This Q-class is required by `LlmModelQueryProfile` in Task 3.

**Dependencies:** Steps 1–4 complete. `LlmModelEntity.java` must exist for APT to process it.

- [x] From `backend/`: run `./mvnw compile`
- [x] Verify output contains `BUILD SUCCESS`
- [x] Confirm `QLlmModelEntity.java` exists under `target/generated-sources/` (relative to `backend/`)
- [x] Run `./mvnw test` from `backend/` — confirm full suite still passes; new total should be 397 tests (376 baseline + 9 repo + 12 mapper); only pre-existing `authServerApplicationTests.contextLoads` failure <!-- REVIEW-FIX: removed -pl backend (not a multi-module project; pom.xml is in backend/); 9 repo tests because createdAtIsNotUpdatedOnSubsequentSave was added; actual total 397 not 376 due to 21 Employee step 5 supplemental tests added between Task 1 and Task 2 -->

**Why this step is critical:** `LlmModelQueryProfile` in Task 3 references `QLlmModelEntity.llmModelEntity` as a static field (see `AdminQueryProfile` pattern: `private static final QAdminEntity ADMIN = QAdminEntity.adminEntity`). If the Q-class is absent when Task 3 begins, Task 3's first compile will fail with `cannot find symbol: class QLlmModelEntity`.

#### Implementation

```bash
# From the backend/ directory:
./mvnw compile

# Verify Q-class generated (run from backend/):
find target -name "QLlmModelEntity.java" 2>/dev/null
```

Expected: `target/generated-sources/java/com/agentForgeBackend/models/llm/QLlmModelEntity.java` (path relative to `backend/`). <!-- REVIEW-FIX: removed -pl backend and fixed find path — backend/ is the Maven project root, not a module within a parent POM -->

#### Edge Cases

1. **Stale Q-classes** — If a compile-time error exists in `LlmModelEntity` (e.g., invalid import), APT may generate a partial `QLlmModelEntity` with missing fields. Fix the compile error first, then re-run `./mvnw compile`.
2. **IDE generated-sources** — If the project is open in IntelliJ, mark `target/generated-sources/java` as a Generated Sources Root (`File → Project Structure → Modules → Sources tab`) so the IDE recognizes `QLlmModelEntity` without a separate Maven reimport.
3. **Running from `backend/`** — The `pom.xml` is inside `backend/`, so `./mvnw compile` and `./mvnw test` run directly from that directory without any `-pl` flag. This is consistent with all other Maven commands in this project. <!-- REVIEW-FIX: replaced stale -pl backend scope note -->

---

## Design Decisions

**Decision 1: `LlmModelEntity` does NOT extend `BaseUserEntity`**
- **Why:** `LlmModelEntity` is not a user — it is a configuration entity representing an OpenRouter model. Extending `BaseUserEntity` would pollute the JOINED inheritance table hierarchy (`base_user`) with model records, bring in irrelevant fields (`username`, `password`, `roles`, `lastLogin`), and couple the LlmModel domain to the user domain for no architectural gain.
- **Alternatives considered:** Extending a lightweight base class for `id` + `createdAt` only. Rejected — no such base class exists in this codebase, and introducing one for a single entity is premature abstraction (YAGNI).

**Decision 2: `Boolean` (boxed) for `isEnabled`, not `boolean` (primitive)**
- **Why:** Boxed `Boolean` allows `null` in JPA mapped columns and is compatible with QueryDSL's `BooleanPath`/`QBooleanPath` predicate builders. A `boolean` primitive would auto-initialize to `false` in a fresh entity before `= true` takes effect, and could produce misleading `false` responses in partial-update scenarios.
- **Alternatives considered:** `boolean` primitive. Rejected per feature document requirement and QueryDSL compatibility note.

**Decision 3: `@PrePersist` for `createdAt`, not a database default**
- **Why:** `spring.jpa.hibernate.ddl-auto=update` (production) and `create-drop` (tests) do not reliably emit `DEFAULT CURRENT_TIMESTAMP` DDL for columns declared without explicit `columnDefinition`. Using `@PrePersist` is portable, testable, and consistent with how the existing codebase handles audit timestamps (e.g., `BaseUserEntity.dateCreated` is set in the service layer).
- **Alternatives considered:** `@Column(insertable=false, updatable=false, columnDefinition="TIMESTAMP DEFAULT NOW()")`. Rejected — H2 and PostgreSQL have different function names for current time; this approach requires environment-specific DDL or separate `application.properties` overrides.

**Decision 4: `description` excluded from filterable/sortable fields**
- **Why:** The parent feature explicitly excludes `description` from the query profile. Free-text search on descriptions is out of scope for MVP. This is a Task 3 decision but documented here to inform the `LlmModelListDTO` (which includes `description` for display, not filtering).
- **Implemented in:** Task 3 (`LlmModelQueryProfile`).

**Decision 5: `isEnabled` excluded from `LlmModelForm`**
- **Why:** ADR-007 establishes that `PATCH /{id}/toggle` is the exclusive mechanism for changing enabled state. Allowing `isEnabled` in the form creates a bypass route that contradicts the API contract (Finding 3). Removing it from the form enforces the constraint at the type level — no implementation discipline required in `update()`.
- **Alternatives considered:** Keep `isEnabled` in form but have `update()` ignore it (Finding 3 Option b). Rejected — enforcing it at the type level is stronger, self-documenting, and eliminates accidental assignment by future maintainers.

**Decision 6: All production files created with ALL fields up front (not incrementally)**
- **Why:** Adding JPA entity fields incrementally forces Hibernate to re-run DDL for each field addition during tests, which is slow and error-prone. Creating the entity with the full field set in Step 1 means all subsequent tests run against a stable schema. This is a pragmatic deviation from strict TDD in the entity layer — the test suite still validates behavior incrementally, just not the entity schema.
- **Alternatives considered:** Strict incremental entity (add one field per TDD slice). Rejected — Hibernate DDL management and QueryDSL APT make this expensive and fragile for entity fields.

---

## Testing Considerations

### Automatic Validation

**TDD incremental checks (run after each implementation step):**
- [x] From `backend/`: `./mvnw test -Dtest=LlmModelRepositoryTest` after Step 1 — 1 test passes (`savesEntityAndAssignsId`)
- [x] From `backend/`: `./mvnw test -Dtest=LlmModelRepositoryTest` after Step 2 — 9 repository tests pass
- [x] From `backend/`: `./mvnw compile` after Step 3 — `BUILD SUCCESS` (DTOs + form compile clean)
- [x] From `backend/`: `./mvnw test -Dtest=LlmModelMapperTest` after first mapper test + mapper implementation — 1 test passes (`toDTO_mapsAllFields`)
- [x] From `backend/`: `./mvnw test -Dtest=LlmModelMapperTest` after Step 4 — 12 mapper tests pass
- [x] From `backend/`: `./mvnw compile` for Step 5 — `BUILD SUCCESS`; `QLlmModelEntity.java` generated under `target/generated-sources/annotations/`
- [x] From `backend/`: `./mvnw test` after all steps — 397 total tests (376 baseline + 9 repository + 12 mapper); only pre-existing `authServerApplicationTests.contextLoads` failure
<!-- REVIEW-FIX: removed all -pl backend flags (pom.xml is inside backend/, no -pl needed); mapper count corrected 13→12; repo count updated 8→9 (createdAtIsNotUpdatedOnSubsequentSave added); final total: 355 + 9 + 12 = 376 -->

### Manual Validation

No manual validation required. All behavior is verifiable through the automated test suite and the compile step.

---

## Related Code Explanations

- `backend/src/main/java/com/agentForgeBackend/shared/models/baseUser/BaseUserEntity.java:59-68` — field initializer pattern; `LlmModelEntity.isEnabled = true` directly mirrors `enabled = true`
- `backend/src/main/java/com/agentForgeBackend/models/hq/admin/AdminMapper.java:60-84` — null-skip `toEntity()` pattern; `LlmModelMapper.toEntity()` replicates it for `modelId`, `name`, `description`
- `backend/src/main/java/com/agentForgeBackend/models/hq/admin/AdminQueryProfile.java:16-17` — `QAdminEntity.adminEntity` static field declaration; Task 3's `LlmModelQueryProfile` will use `QLlmModelEntity.llmModelEntity` equivalently
- `backend/src/main/java/com/agentForgeBackend/shared/defaultImplements/DefaultServiceImplements.java:82-94` — `update()` base implementation is a known no-op (loads entity, saves without applying form fields); Task 3 must override `update()` completely
- `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeRepositoryTest.java` — prior art; `LlmModelRepositoryTest` follows the same `@DataJpaTest` / `TestEntityManager` / `entityManager.clear()` pattern

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected for this task
- [x] Spring Boot 3.4.1 / QueryDSL 6.12 / Lombok patterns verified against existing codebase (no external doc query needed — patterns already in production code)
- [x] `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelEntity.java` created — all 6 fields, `@PrePersist` for `createdAt`, `isEnabled = true` field initializer, `unique = true` on `model_id`, `updatable = false` on `created_at`
- [x] `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelForm.java` created — `modelId` (`@NotBlank`), `name` (`@NotBlank`), `description` (nullable); `isEnabled` excluded
- [x] `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelDTO.java` created — all 6 fields (`id`, `modelId`, `name`, `description`, `isEnabled`, `createdAt`)
- [x] `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelMiniDTO.java` created — 4 fields (`id`, `modelId`, `name`, `isEnabled`)
- [x] `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelListDTO.java` created — all 6 fields
- [x] `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelMapper.java` created — 4 mapper methods, null guards on all, `isEnabled` NOT set in `toEntity()`
- [x] `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelRepository.java` created — extends `DefaultRepository<LlmModelEntity, Long>`, `findByModelId`, `existsByModelId`
- [x] `backend/src/test/java/com/agentForgeBackend/models/llm/LlmModelRepositoryTest.java` created — 9 tests: `savesEntityAndAssignsId`, `createdAtIsAutoSetOnPersist`, `newEntityHasIsEnabledTrue`, `createdAtIsNotUpdatedOnSubsequentSave`, `findByModelIdReturnsEntityWhenPresent`, `findByModelIdReturnsEmptyForUnknownModelId`, `existsByModelIdReturnsTrueWhenPresent`, `existsByModelIdReturnsFalseWhenAbsent`, `duplicateModelIdThrowsDataIntegrityViolationException`
- [x] `backend/src/test/java/com/agentForgeBackend/models/llm/LlmModelMapperTest.java` created — 12 tests: `toDTO_mapsAllFields`, `toDTO_handlesNullDescription`, `toDTO_nullEntityReturnsNull`, `toSmallDTO_mapsIdModelIdNameIsEnabled`, `toSmallDTO_nullEntityReturnsNull`, `toListDTO_mapsAllFields`, `toListDTO_handlesNullDescription`, `toListDTO_nullEntityReturnsNull`, `toEntity_mapsModelIdNameDescription`, `toEntity_skipsNullFields`, `toEntity_isEnabledDefaultsTrueFromEntityFieldInitializer`, `toEntity_nullFormReturnsNull` <!-- REVIEW-FIX: corrected 13→12 -->
- [x] From `backend/`: `./mvnw test -Dtest=LlmModelRepositoryTest` — 9 tests pass
- [x] From `backend/`: `./mvnw test -Dtest=LlmModelMapperTest` — 12 tests pass
- [x] From `backend/`: `./mvnw compile` — `BUILD SUCCESS`; `QLlmModelEntity.java` generated under `target/generated-sources/annotations/com/agentForgeBackend/models/llm/`
- [x] From `backend/`: `./mvnw test` — 397 total tests (376 baseline after Employee step 5 + 9 + 12); only pre-existing `authServerApplicationTests.contextLoads` failure
- [x] No manual validation steps needed
- [x] Parent feature Steps 2.1–2.5 ready to be marked complete after execution

---

## Post-Review Notes

**Deviation 1: `createdAtIsNotUpdatedOnSubsequentSave` test precision fix**
The task document's original test captured `saved.getCreatedAt()` from the in-memory entity (nanosecond precision from `LocalDateTime.now()`) and compared it against the DB-reloaded value (microsecond precision from H2 `timestamp(6)`). This caused a 1-microsecond mismatch. Fixed by loading the entity from DB after the first save to capture the DB-precision timestamp before performing the update. The test still validates the same behavior: `@Column(updatable = false)` prevents `created_at` from changing on subsequent saves.

**Deviation 2: Q-class generation path**
The task document predicted `target/generated-sources/java/` but the actual path is `target/generated-sources/annotations/`. This is a cosmetic difference in the APT plugin output directory configuration; the Q-class is fully functional and contains all 6 entity fields plus the static `llmModelEntity` instance.

**Deviation 3: Total test count**
The task document projected 376 total tests (355 baseline + 9 + 12). The actual count is 397 because 21 supplemental Employee tests (from Employee step 5 regression verification) were added between Task 1 and Task 2. The actual math: 376 baseline + 9 repo + 12 mapper = 397. All tests pass except the pre-existing `authServerApplicationTests.contextLoads` Docker blocker.
