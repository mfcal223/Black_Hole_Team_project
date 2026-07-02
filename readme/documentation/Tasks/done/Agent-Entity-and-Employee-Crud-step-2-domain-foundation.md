# Task: Agent Domain Foundation

#task #current #high-complexity #parent-agent-entity-and-employee-crud

**Parent:** [[Agent-Entity-and-Employee-Crud]]
**Parent Type:** Feature
**Related Step(s):** Phase 2 — Steps 2.1, 2.2, 2.3, 2.4, 2.5
**Estimated Complexity:** High

---

## Goal

Create the persistence and API-contract foundation for the `Agent` domain: `AgentEntity`, all DTOs and form, `AgentMapper`, and `AgentRepository`. Compile the backend to generate `QAgentEntity` via QueryDSL APT. After this task, the domain's data layer is complete and Task 3 (service, query profile, controller) can be built on top of it.

---

## Parent Context

The parent feature defines the `AgentEntity` as a reusable LLM persona owned exclusively by an `EmployeeEntity`. Task 1 established the HTTP security gate (`/agent/**` → `hasRole("EMPLOYEE")`). Task 2 builds the persistence and contract layer that Task 3 (service + controller) and Task 4 (supplemental tests) will build on.

Key parent decisions that govern this task:

- **Package:** `models/agent/` — top-level peer of `models/hq/` and `models/llm/`, not nested under `models/hq/`. This prevents cross-domain dependencies when `ConversationEntity` (a future feature) imports `AgentEntity`.
- **Entity inheritance:** `AgentEntity` does NOT extend `BaseUserEntity`. It is a standalone domain entity with an outbound FK (`owner`) to `EmployeeEntity`.
- **Prompt storage:** `initPrompt` is required (`nullable = false`); `recurrentPrompt` is optional. Both use `@Lob @Column(columnDefinition = "TEXT")` to prevent Hibernate from mapping `@Lob String` to `OID` on some PostgreSQL/Hibernate version combinations.
- **Timestamps:** Both `createdAt` and `updatedAt` are set by `@PrePersist`. Only `updatedAt` is refreshed by `@PreUpdate`. `createdAt` is `updatable = false` in the column declaration.
- **Repository finder signatures (Finding 4):** `findByIdAndOwnerId(Long id, Long ownerId)` and `existsByNameAndOwnerId(String name, Long ownerId)` use primitive `Long` bind parameters — not an `EmployeeEntity` object — to eliminate detached-entity concerns entirely.
- **Mapper `ownerId` (Finding 6 resolution):** `AgentMapper.toDTO()` includes `ownerId` mapped via `entity.getOwner().getId()`. Hibernate stores the FK value inside the proxy at construction time, so `getId()` on a lazy proxy never triggers initialization. A code comment documents this guarantee. A regression test in `AgentMapperIntegrationTest` (Step 7.5) verifies the mapper succeeds on a Hibernate proxy outside a transaction.
- **`AgentListDTO` omits prompts:** `initPrompt` and `recurrentPrompt` are intentionally excluded from `AgentListDTO` to keep paginated list payloads small.
- **`AgentForm` never accepts `owner`:** The owner is always derived from the JWT principal in the service layer (Task 3). It must never be accepted from the API caller.
- **TDD:** Write behavior tests before production code. This task uses two TDD cycles: repository tests → entity/repository implementation; mapper tests → DTO/form/mapper implementation.

---

## Preconditions / Dependencies

- Task 1 is complete: `SecurityConfig` has `.requestMatchers("/agent/**").hasRole("EMPLOYEE")` and `SecurityAuthorizationTest` has 9 passing tests.
- `EmployeeEntity` exists at `models/hq/employee/EmployeeEntity.java` and is fully functional — used as the FK target for `AgentEntity.owner`.
- `BaseUserEntity` at `shared/models/baseUser/BaseUserEntity.java` has `@Getter @Setter` from Lombok — `setId(Long id)` is available for mapper unit tests.
- `DefaultRepository`, `DefaultMapper`, `DefaultService` interfaces exist in `shared/defaultInterfaces/`.
- `DefaultServiceImplements` in `shared/defaultImplements/` has `pageableFactory` and `queryPredicateBuilder` declared as `private`. **Task 3 must change these to `protected`** before `AgentService` can override `getListPage()`. This task does NOT modify `DefaultServiceImplements`.
- H2 in-memory DB is configured via `application-test.properties` with `spring.jpa.hibernate.ddl-auto=create-drop`.
- Maven QueryDSL APT processor (`querydsl-apt`) is configured in `pom.xml` and generates Q-classes at compile time.
- <!-- REVIEW-FIX: Corrected compile command — no root-level mvnw exists; mvnw is only in backend/ -->`./mvnw compile` run from `backend/` is the compile command (same directory as `./mvnw test`). There is no root-level `mvnw` wrapper; `-pl backend` is not applicable.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — Selected — task template, directory conventions, doc config
- `solid-deep-design` — Selected — SRP per module, depth analysis for repository and mapper, seam placement
- `tdd` — Selected — two vertical TDD cycles (repository, mapper); write failing tests before production code
- `memory-bank` — Selected — architecture, tech stack, and known-issues loaded; patterns confirmed
- `glossary-management` — Selected — agent, initPrompt, recurrentPrompt, owner terms reviewed
- `find-docs` — Selected — Spring Data JPA 3.x derived queries and `@DataJpaTest` patterns verified against existing codebase (identical patterns in `LlmModelRepositoryTest`, `EmployeeRepositoryTest`)

### Documentation Reviewed

- `documentation/Features/to-do/Agent-Entity-and-Employee-Crud.md` — parent feature, §2 (entity), §3 (DTOs/form), §4 (mapper), §5 (repository), Steps 2.1–2.5
- `documentation/Bugs/done/Review-of-Agent-Entity-and-Employee-Crud.md` — Findings 4 (repository Long params), 6 (Hibernate proxy getId() safety), 8 (@Transactional note)
- `backend/src/main/java/com/agentForgeBackend/models/llm/` — LLM model domain (canonical prior art for entity/DTO/mapper/repository/query-profile pattern)
- `backend/src/test/java/com/agentForgeBackend/models/llm/` — LlmModelRepositoryTest, LlmModelMapperTest (canonical test templates)
- `backend/src/main/java/com/agentForgeBackend/shared/defaultImplements/DefaultServiceImplements.java` — confirms `pageableFactory` and `queryPredicateBuilder` are currently `private` (Task 3 changes them to `protected`)

### Related Existing Code

- [[LlmModelEntity-java]] — `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelEntity.java` — timestamp `@PrePersist` pattern
- [[LlmModelMapper-java]] — `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelMapper.java` — mapper implementation pattern
- [[LlmModelRepository-java]] — `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelRepository.java` — custom finder pattern
- [[EmployeeEntity-java]] — `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeEntity.java` — owner FK target
- [[BaseUserEntity-java]] — `backend/src/main/java/com/agentForgeBackend/shared/models/baseUser/BaseUserEntity.java` — `@Getter @Setter`, `setId()` available for mapper unit tests
- [[DefaultServiceImplements-java]] — `backend/src/main/java/com/agentForgeBackend/shared/defaultImplements/DefaultServiceImplements.java:37-38` — `private` fields that Task 3 must change to `protected`
- [[DefaultMapper-java]] — `backend/src/main/java/com/agentForgeBackend/shared/defaultInterfaces/DefaultMapper.java` — interface `AgentMapper` implements
- [[DefaultRepository-java]] — `backend/src/main/java/com/agentForgeBackend/shared/defaultInterfaces/DefaultRepository.java` — interface `AgentRepository` extends

---

## Implementation Details

### Approach

**SOLID analysis:**
- **SRP**: Each class has one reason to change. `AgentEntity` owns persistence structure; `AgentMapper` owns DTO conversion; `AgentRepository` owns data access; each DTO owns its API shape.
- **OCP**: `AgentRepository` extends `DefaultRepository` — adding new finders is additive. `AgentMapper` implements `DefaultMapper` — new mapping variants extend the interface without modifying it.
- **DIP**: Task 3's `AgentService` will depend on `AgentRepository` (via `DefaultRepository` abstraction) and `AgentMapper` (via `DefaultMapper` abstraction), never on concrete classes.
- **Depth**: `AgentRepository` is deep — the full Spring Data JPA + QueryDSL infrastructure sits behind a 2-method custom interface. `AgentMapper` is intentionally shallow — mappers are coordinators, not logic-holders; depth would be accidental complexity here.

**TDD cycle 1 — Repository:**
1. **RED**: Write `AgentRepositoryTest.java`. Tests will not compile because `AgentEntity` and `AgentRepository` do not exist.
2. **GREEN**: Create `AgentEntity` (makes tests compile). Create `AgentRepository` (provides the custom finders). All repository tests pass.

**TDD cycle 2 — Mapper:**
1. **RED**: Write `AgentMapperTest.java`. Tests will not compile because `AgentDTO`, `AgentMiniDTO`, `AgentListDTO`, `AgentForm`, and `AgentMapper` do not exist.
2. **GREEN**: Create the four DTO/form classes and `AgentMapper`. All mapper tests pass.

**Compile step:** Run `./mvnw compile` from `backend/` after `AgentEntity` exists. This triggers `querydsl-apt` to generate `QAgentEntity.java` in `target/generated-sources/`. `QAgentEntity` is required by `AgentQueryProfile` in Task 3 — the class must exist before Task 3 begins.

**Hibernate proxy safety (Finding 6 decision):** `AgentMapper.toDTO()` calls `entity.getOwner().getId()`. Because `owner` is a `@ManyToOne(fetch = FetchType.LAZY)`, Hibernate wraps it in a proxy. The Hibernate ORM contract guarantees that `getId()` on a proxy returns the FK identifier stored in the proxy at construction time — it does NOT issue a SELECT. This is safe in all contexts (within transaction, outside transaction, detached). <!-- REVIEW-FIX: Proxy test moved to AgentMapperIntegrationTest (Step 7.5) to avoid temporal dependency on AgentMapper not existing during Steps 1-4 -->The regression test `toDTOSucceedsOnHibernateOwnerProxy` lives in `AgentMapperIntegrationTest` (Step 7.5) — created after `AgentMapper` exists so the test class compiles cleanly from its first line.

### Files to Create/Modify

<!-- REVIEW-FIX: Merged duplicate "New files" sections into one block -->
**New production files (all in `backend/src/main/java/com/agentForgeBackend/models/agent/`):**
- [ ] `AgentEntity.java` — JPA entity, owner FK, timestamp lifecycle hooks
- [ ] `AgentForm.java` — input contract for insert and update
- [ ] `AgentDTO.java` — full detail view (returned by `getOne`, `update`, `delete`)
- [ ] `AgentMiniDTO.java` — compact insert response (returned by `insert`)
- [ ] `AgentListDTO.java` — list row view, prompts omitted (returned by `getListPage`)
- [ ] `AgentMapper.java` — converts between entity, DTOs, and form
- [ ] `AgentRepository.java` — Spring Data JPA repository with two ownership-scoped finders

**New test files (all in `backend/src/test/java/com/agentForgeBackend/models/agent/`):**
- [ ] `AgentRepositoryTest.java` — `@DataJpaTest` tests for repository persistence and lifecycle hooks (8 tests)
- [ ] `AgentMapperTest.java` — pure unit tests for all four mapper methods (13 tests)
- [ ] `AgentMapperIntegrationTest.java` — `@DataJpaTest` regression test for Hibernate proxy `getId()` contract (1 test; added in Step 7.5 after mapper exists)

---

## Step-by-Step Implementation

### Step 1: TDD RED — Write AgentRepositoryTest (before entity/repository exist)

**Goal:** Write behavior tests for `AgentRepository` before the entity or repository exist. Tests will fail to compile — this is the expected RED state.

**Dependencies:** `EmployeeEntity` exists and is functional.

- [ ] Create directory: `backend/src/test/java/com/agentForgeBackend/models/agent/`
- [ ] Create `AgentRepositoryTest.java` with the full test class below
- [ ] Confirm the file does NOT compile (expected — `AgentEntity` and `AgentRepository` do not exist yet)

**Why this step is critical:** Writing tests first ensures the repository contract is defined before implementation. The eight tests in this class cover: ownership-scoped find (correct owner, wrong owner, non-existent ID), name uniqueness scoping per owner, same-name for different owners (allowed), and timestamp lifecycle hooks. The Hibernate proxy regression test (`toDTOSucceedsOnHibernateOwnerProxy`) is in `AgentMapperIntegrationTest` (Step 7.5) — it depends on `AgentMapper` and cannot live here without breaking compilation during Steps 1–4.

#### Implementation

```java
package com.agentForgeBackend.models.agent;

import com.agentForgeBackend.shared.models.baseUser.UserRoles;
import com.agentForgeBackend.models.hq.employee.EmployeeEntity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
// REVIEW-FIX: Removed assertThatCode and assertThatThrownBy — unused in this class;
// the proxy test that required them was moved to AgentMapperIntegrationTest (Step 7.5)
// REVIEW-FIX: Added ChronoUnit import — required by preUpdateDoesNotChangeCreatedAt truncation fix

@DataJpaTest
@ActiveProfiles("test")
@Tag("repository")
class AgentRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private AgentRepository agentRepository;

    private EmployeeEntity owner;
    private EmployeeEntity otherEmployee;

    @BeforeEach
    void setUp() {
        entityManager.clear();
        owner = entityManager.persistFlushFind(new EmployeeEntity(
                "Owner", "Agent", "owner-agent@test.com",
                Set.of(UserRoles.EMPLOYEE), "owner-agent-test", "password"));
        otherEmployee = entityManager.persistFlushFind(new EmployeeEntity(
                "Other", "Agent", "other-agent@test.com",
                Set.of(UserRoles.EMPLOYEE), "other-agent-test", "password"));
    }

    private AgentEntity buildAgent(String name, EmployeeEntity agentOwner) {
        AgentEntity agent = new AgentEntity();
        agent.setName(name);
        agent.setInitPrompt("You are a helpful " + name + " assistant.");
        agent.setOwner(agentOwner);
        return agent;
    }

    @Test
    void findByIdAndOwnerIdReturnsAgentForCorrectOwner() {
        AgentEntity agent = entityManager.persistAndFlush(buildAgent("TestAgent", owner));
        entityManager.clear();

        Optional<AgentEntity> result = agentRepository.findByIdAndOwnerId(agent.getId(), owner.getId());

        assertThat(result).isPresent();
        assertThat(result.get().getName()).isEqualTo("TestAgent");
    }

    @Test
    void findByIdAndOwnerIdReturnsEmptyForWrongOwner() {
        AgentEntity agent = entityManager.persistAndFlush(buildAgent("TestAgent", owner));
        entityManager.clear();

        Optional<AgentEntity> result = agentRepository.findByIdAndOwnerId(agent.getId(), otherEmployee.getId());

        assertThat(result).isEmpty();
    }

    @Test
    void findByIdAndOwnerIdReturnsEmptyForNonExistentId() {
        Optional<AgentEntity> result = agentRepository.findByIdAndOwnerId(999L, owner.getId());

        assertThat(result).isEmpty();
    }

    @Test
    void existsByNameAndOwnerIdReturnsTrueForSameOwner() {
        entityManager.persistAndFlush(buildAgent("MyAgent", owner));
        entityManager.clear();

        boolean exists = agentRepository.existsByNameAndOwnerId("MyAgent", owner.getId());

        assertThat(exists).isTrue();
    }

    @Test
    void existsByNameAndOwnerIdReturnsFalseForDifferentOwner() {
        entityManager.persistAndFlush(buildAgent("MyAgent", owner));
        entityManager.clear();

        boolean exists = agentRepository.existsByNameAndOwnerId("MyAgent", otherEmployee.getId());

        assertThat(exists).isFalse();
    }

    @Test
    void sameNameAllowedForDifferentOwners() {
        entityManager.persistAndFlush(buildAgent("SharedName", owner));
        entityManager.persistAndFlush(buildAgent("SharedName", otherEmployee));
        entityManager.clear();

        assertThat(agentRepository.findAll()).hasSize(2);
        assertThat(agentRepository.existsByNameAndOwnerId("SharedName", owner.getId())).isTrue();
        assertThat(agentRepository.existsByNameAndOwnerId("SharedName", otherEmployee.getId())).isTrue();
    }

    @Test
    void prePersistSetsCreatedAtAndUpdatedAt() {
        AgentEntity agent = entityManager.persistAndFlush(buildAgent("TimestampAgent", owner));
        entityManager.clear();

        AgentEntity saved = agentRepository.findById(agent.getId()).orElseThrow();

        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getUpdatedAt()).isNotNull();
    }

    @Test
    void preUpdateDoesNotChangeCreatedAt() {
        AgentEntity agent = entityManager.persistAndFlush(buildAgent("UpdateAgent", owner));
        // Truncate to seconds: H2 TIMESTAMP column may round sub-second values
        // from @PrePersist (nanosecond) vs re-read (microsecond), leading to off-by-1
        // microsecond spurious inequality. Second precision is immune to this.
        var originalCreatedAt = agent.getCreatedAt().truncatedTo(ChronoUnit.SECONDS);
        entityManager.clear();

        AgentEntity saved = agentRepository.findById(agent.getId()).orElseThrow();
        saved.setName("Updated Name");
        agentRepository.saveAndFlush(saved);
        entityManager.clear();

        AgentEntity updated = agentRepository.findById(agent.getId()).orElseThrow();
        // @Column(updatable = false) on createdAt guarantees the value in the DB is unchanged
        assertThat(updated.getCreatedAt().truncatedTo(ChronoUnit.SECONDS))
                .isEqualTo(originalCreatedAt);
        assertThat(updated.getUpdatedAt()).isNotNull();
    }

}
```
<!-- REVIEW-FIX: Removed toDTOSucceedsOnHibernateOwnerProxy — it instantiates AgentMapper which does
not exist until Step 7. Placing it here causes the ENTIRE test class to fail compilation during Steps
1-4, blocking all repository tests. Moved to AgentMapperIntegrationTest (new Step 7.5). -->

#### Edge Cases

1. **`@DataJpaTest` transaction rollback:** Each test runs inside a transaction that rolls back on completion. `@BeforeEach` persists `owner` and `otherEmployee` within the same transaction — no `deleteAll()` needed.
2. **Username/email uniqueness in `base_user`:** `owner` and `otherEmployee` use distinct usernames and emails to avoid `DataIntegrityViolationException` from `base_user`'s unique constraints.
3. **`preUpdateDoesNotChangeCreatedAt` timing:** `createdAt` immutability is enforced by `@Column(updatable = false)` in JPA DDL — Hibernate excludes it from UPDATE statements. Both the baseline value (captured via `persistAndFlush`) and the reloaded value are truncated to `ChronoUnit.SECONDS` to prevent spurious inequality: `LocalDateTime.now()` produces nanosecond precision, but H2's `TIMESTAMP(6)` column stores only microsecond precision, creating a 1-nanosecond mismatch on the low bits. Truncating both sides to seconds eliminates this entirely. <!-- REVIEW-FIX: documented ChronoUnit.SECONDS truncation — fixes the same precision mismatch that appeared in LlmModel task (Deviation 1); actual implementation uses truncation rather than DB-reload approach -->

---

### Step 2: Create AgentEntity (Phase 2, Step 2.1)

**Goal:** Define the JPA entity. This makes `AgentRepositoryTest` compilable (Step 1 unblocks).

**Dependencies:** Step 1 tests written.

- [ ] Create directory: `backend/src/main/java/com/agentForgeBackend/models/agent/`
- [ ] Create `AgentEntity.java` with all fields, annotations, and lifecycle hooks as specified below
- [ ] Verify the file compiles by running `./mvnw compile` from `backend/`

**Why this step is critical:** All other files in this task depend on `AgentEntity`. The repository tests cannot even compile without it. The entity definition also drives the SQL schema generated by `ddl-auto=update` in production and `create-drop` in tests.

#### Implementation

```java
package com.agentForgeBackend.models.agent;

import com.agentForgeBackend.models.hq.employee.EmployeeEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "agent")
@Getter
@Setter
@NoArgsConstructor
public class AgentEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description")
    private String description;

    @Lob
    @Column(name = "init_prompt", columnDefinition = "TEXT", nullable = false)
    private String initPrompt;

    @Lob
    @Column(name = "recurrent_prompt", columnDefinition = "TEXT")
    private String recurrentPrompt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private EmployeeEntity owner;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onPersist() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
```

#### Edge Cases

1. **`@Lob` + PostgreSQL OID risk:** `@Column(columnDefinition = "TEXT")` alongside `@Lob` forces Hibernate to use TEXT for DDL generation regardless of the Hibernate/PostgreSQL driver combination. Without `columnDefinition = "TEXT"`, some combinations map `@Lob String` to OID (binary large object), breaking text operations.
2. **`owner` non-nullable FK:** `@JoinColumn(name = "owner_id", nullable = false)` means Hibernate will throw `PropertyValueException` at flush time if `owner` is null. The service is the sole authority for setting `owner` — the mapper never sets it.
3. **`updatable = false` on `createdAt`:** Hibernate excludes `created_at` from all UPDATE statements. `@PreUpdate` sets `updatedAt` only — it must never touch `createdAt`.
4. **`@NoArgsConstructor` requirement:** JPA mandates a no-args constructor on all entity classes. Lombok generates it. The parameterized `EmployeeEntity` constructor serves a different purpose — avoid adding it here.

---

### Step 3: Create AgentRepository (Phase 2, Step 2.4)

**Goal:** Provide data access with the two ownership-scoped finder methods. After this step, `AgentRepositoryTest` compiles and all tests can be run.

**Dependencies:** `AgentEntity` must exist (Step 2).

- [ ] Create `AgentRepository.java` in `backend/src/main/java/com/agentForgeBackend/models/agent/`

**Why this step is critical:** The two custom finders (`findByIdAndOwnerId` and `existsByNameAndOwnerId`) are the primary ownership-enforcement mechanism at the data layer. Using `ownerId` (Long) instead of `EmployeeEntity` (Finding 4) eliminates all JPA detachment risks.

#### Implementation

```java
package com.agentForgeBackend.models.agent;

import com.agentForgeBackend.shared.defaultInterfaces.DefaultRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AgentRepository extends DefaultRepository<AgentEntity, Long> {

    Optional<AgentEntity> findByIdAndOwnerId(Long id, Long ownerId);

    boolean existsByNameAndOwnerId(String name, Long ownerId);
}
```

**Spring Data JPA derived query resolution:**
- `findByIdAndOwnerId` → `SELECT * FROM agent WHERE id = :id AND owner_id = :ownerId`
- `existsByNameAndOwnerId` → `SELECT COUNT(*) > 0 FROM agent WHERE name = :name AND owner_id = :ownerId`

Spring Data JPA resolves `OwnerId` by traversing `AgentEntity.owner.id` — the `id` field of the `EmployeeEntity` FK. This generates a direct column comparison (`owner_id = ?`) using the FK column already present on the `agent` table. No JOIN is required.

#### Edge Cases

1. **`OwnerId` suffix navigation:** Spring Data resolves `Owner` → `AgentEntity.owner` (the `EmployeeEntity` field), then `Id` → `EmployeeEntity.id` (the `@Id` field). If the field chain is ever ambiguous, Spring Data throws `PropertyReferenceException` at startup. The naming is unambiguous because `owner` is the only `EmployeeEntity` field on `AgentEntity`.
2. **`existsByNameAndOwnerId` case sensitivity:** The Spring Data derived `existsBy` produces a case-sensitive equality check by default (`WHERE name = ?`). Name uniqueness per employee is case-sensitive in this project (no case-insensitive uniqueness requirement stated in the feature).

---

### Step 4: Run AgentRepositoryTest → GREEN

<!-- REVIEW-FIX: Corrected to 8 tests (proxy test moved to AgentMapperIntegrationTest); removed fragile workaround about commenting out tests -->
**Goal:** All eight repository tests pass.

**Dependencies:** Steps 1, 2, 3 complete.

- [ ] From `backend/`: run `./mvnw test -Dtest=AgentRepositoryTest`
- [ ] Confirm 8 tests pass, 0 failures
- [ ] If any test fails, diagnose and fix before proceeding

**Why this step is critical:** Green tests confirm the entity schema, lifecycle hooks, and custom finders all work correctly under H2. Failures here indicate mismatches in entity field declarations, JPA annotation errors, or incorrect Spring Data derived query names — all of which would surface in production as well.

#### Edge Cases

1. **`persistFlushFind` availability:** `TestEntityManager.persistFlushFind(entity)` is available since Spring Boot 2.x. It persists, flushes, and re-fetches the entity (returning the managed version with the generated ID populated). Do not confuse with `persistAndFlush()` (which persists and flushes but returns the input entity — ID is populated on the input object due to JPA identity mapping).

---

### Step 5: TDD RED — Write AgentMapperTest (before DTOs/mapper exist)

**Goal:** Write behavior tests for `AgentMapper` before the DTOs, form, or mapper exist. Tests will not compile — expected RED state.

**Dependencies:** Steps 1–4 complete (entity exists, repository tests green).

- [ ] Create `AgentMapperTest.java` in `backend/src/test/java/com/agentForgeBackend/models/agent/`
- [ ] Confirm the file does NOT compile (expected — DTOs, form, and mapper do not exist yet)

**Why this step is critical:** Writing mapper tests first specifies the exact field contract for each DTO type before any DTO class is created. This prevents speculative fields from creeping into DTOs.

#### Implementation

```java
package com.agentForgeBackend.models.agent;

import com.agentForgeBackend.models.hq.employee.EmployeeEntity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
// REVIEW-FIX: Removed unused `import java.util.Set;` — buildEntity() uses new EmployeeEntity() + setId(),
// not Set.of(UserRoles.EMPLOYEE), so Set is never referenced in this class

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class AgentMapperTest {

    private AgentMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = new AgentMapper();
    }

    private AgentEntity buildEntity() {
        EmployeeEntity owner = new EmployeeEntity();
        // BaseUserEntity has @Getter @Setter — setId() is available via Lombok
        owner.setId(42L);

        AgentEntity entity = new AgentEntity();
        entity.setId(1L);
        entity.setName("Code Reviewer");
        entity.setDescription("Reviews code for quality issues.");
        entity.setInitPrompt("You are an expert code reviewer.");
        entity.setRecurrentPrompt("Always comment on readability first.");
        entity.setOwner(owner);
        entity.setCreatedAt(LocalDateTime.of(2026, 6, 17, 10, 0, 0));
        entity.setUpdatedAt(LocalDateTime.of(2026, 6, 17, 11, 0, 0));
        return entity;
    }

    // ── toDTO ──────────────────────────────────────────────────────────

    @Test
    void toDTOMapsAllFields() {
        AgentEntity entity = buildEntity();

        AgentDTO dto = mapper.toDTO(entity);

        assertThat(dto.getId()).isEqualTo(1L);
        assertThat(dto.getName()).isEqualTo("Code Reviewer");
        assertThat(dto.getDescription()).isEqualTo("Reviews code for quality issues.");
        assertThat(dto.getInitPrompt()).isEqualTo("You are an expert code reviewer.");
        assertThat(dto.getRecurrentPrompt()).isEqualTo("Always comment on readability first.");
        assertThat(dto.getOwnerId()).isEqualTo(42L);
        assertThat(dto.getCreatedAt()).isEqualTo(LocalDateTime.of(2026, 6, 17, 10, 0, 0));
        assertThat(dto.getUpdatedAt()).isEqualTo(LocalDateTime.of(2026, 6, 17, 11, 0, 0));
    }

    @Test
    void toDTOWithNullDescription() {
        AgentEntity entity = buildEntity();
        entity.setDescription(null);

        AgentDTO dto = mapper.toDTO(entity);

        assertThat(dto.getDescription()).isNull();
    }

    @Test
    void toDTOWithNullRecurrentPrompt() {
        AgentEntity entity = buildEntity();
        entity.setRecurrentPrompt(null);

        AgentDTO dto = mapper.toDTO(entity);

        assertThat(dto.getRecurrentPrompt()).isNull();
    }

    @Test
    void toDTOReturnsNullForNullEntity() {
        assertThat(mapper.toDTO(null)).isNull();
    }

    // ── toSmallDTO ────────────────────────────────────────────────────

    @Test
    void toSmallDTOMapsIdNameCreatedAt() {
        AgentEntity entity = buildEntity();

        AgentMiniDTO mini = mapper.toSmallDTO(entity);

        assertThat(mini.getId()).isEqualTo(1L);
        assertThat(mini.getName()).isEqualTo("Code Reviewer");
        assertThat(mini.getCreatedAt()).isEqualTo(LocalDateTime.of(2026, 6, 17, 10, 0, 0));
    }

    @Test
    void toSmallDTOReturnsNullForNullEntity() {
        assertThat(mapper.toSmallDTO(null)).isNull();
    }

    // ── toListDTO ─────────────────────────────────────────────────────

    @Test
    void toListDTOMapsExpectedFields() {
        AgentEntity entity = buildEntity();

        AgentListDTO list = mapper.toListDTO(entity);

        assertThat(list.getId()).isEqualTo(1L);
        assertThat(list.getName()).isEqualTo("Code Reviewer");
        assertThat(list.getDescription()).isEqualTo("Reviews code for quality issues.");
        assertThat(list.getCreatedAt()).isEqualTo(LocalDateTime.of(2026, 6, 17, 10, 0, 0));
        assertThat(list.getUpdatedAt()).isEqualTo(LocalDateTime.of(2026, 6, 17, 11, 0, 0));
    }

    @Test
    void toListDTOOmitsPromptFields() {
        // AgentListDTO must not expose initPrompt or recurrentPrompt —
        // verify by checking declared fields, not getter presence
        var fieldNames = java.util.Arrays.stream(AgentListDTO.class.getDeclaredFields())
                .map(java.lang.reflect.Field::getName)
                .toList();

        assertThat(fieldNames).doesNotContain("initPrompt", "recurrentPrompt", "ownerId");
    }

    @Test
    void toListDTOReturnsNullForNullEntity() {
        assertThat(mapper.toListDTO(null)).isNull();
    }

    // ── toEntity ──────────────────────────────────────────────────────

    @Test
    void toEntityMapsAllFormFields() {
        AgentForm form = new AgentForm(
                "Marketing Copywriter",
                "Writes marketing copy.",
                "You are a creative marketing writer.",
                "Be persuasive and concise.");

        AgentEntity entity = mapper.toEntity(form);

        assertThat(entity.getName()).isEqualTo("Marketing Copywriter");
        assertThat(entity.getDescription()).isEqualTo("Writes marketing copy.");
        assertThat(entity.getInitPrompt()).isEqualTo("You are a creative marketing writer.");
        assertThat(entity.getRecurrentPrompt()).isEqualTo("Be persuasive and concise.");
    }

    @Test
    void toEntityDoesNotSetOwner() {
        AgentForm form = new AgentForm("Agent", null, "Prompt.", null);

        AgentEntity entity = mapper.toEntity(form);

        // owner must never be set by the mapper — AgentService sets it from the JWT principal
        assertThat(entity.getOwner()).isNull();
    }

    @Test
    void toEntityWithNullOptionalFields() {
        AgentForm form = new AgentForm("Agent", null, "Prompt.", null);

        AgentEntity entity = mapper.toEntity(form);

        assertThat(entity.getDescription()).isNull();
        assertThat(entity.getRecurrentPrompt()).isNull();
    }

    @Test
    void toEntityReturnsNullForNullForm() {
        assertThat(mapper.toEntity(null)).isNull();
    }
}
```

#### Edge Cases

1. **`EmployeeEntity.setId()` availability:** `BaseUserEntity` has `@Getter @Setter` from Lombok, which generates `setId(Long id)`. This is confirmed in the source file. If this ever changes, the test helper can use reflection: `Field f = BaseUserEntity.class.getDeclaredField("id"); f.setAccessible(true); f.set(owner, 42L);`
2. **`toListDTOOmitsPromptFields` reflection approach:** Testing the absence of `initPrompt` and `recurrentPrompt` via `getDeclaredFields()` is more reliable than asserting a getter doesn't exist — Lombok generates getters for all declared fields, so if the field isn't declared, the getter won't exist either.
3. **`@ExtendWith(MockitoExtension.class)` with no mocks:** No Mockito mocks are needed for mapper unit tests — `AgentMapper` has no dependencies. The `@ExtendWith` is kept for consistency with the existing mapper test convention in this project.

---

### Step 6: Create AgentForm, AgentDTO, AgentMiniDTO, AgentListDTO (Phase 2, Step 2.2)

**Goal:** Define the API input/output contracts. After this step, the mapper tests can reference these classes.

**Dependencies:** `AgentEntity` must exist (Step 2).

- [ ] Create `AgentForm.java`
- [ ] Create `AgentDTO.java`
- [ ] Create `AgentMiniDTO.java`
- [ ] Create `AgentListDTO.java`

#### Implementation

**AgentForm.java** — Input contract for insert and update. `owner` field is explicitly absent.

```java
package com.agentForgeBackend.models.agent;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AgentForm {

    @NotBlank
    private String name;

    private String description;

    @NotBlank
    private String initPrompt;

    private String recurrentPrompt;
    // owner is never accepted from the caller — AgentService derives it from the JWT principal
}
```

**AgentDTO.java** — Full detail view returned by `getOne`, `update`, `delete`.

```java
package com.agentForgeBackend.models.agent;

import lombok.*;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AgentDTO {
    private Long id;
    private String name;
    private String description;
    private String initPrompt;
    private String recurrentPrompt;
    private Long ownerId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```

**AgentMiniDTO.java** — Compact insert response returned by `insert`.

```java
package com.agentForgeBackend.models.agent;

import lombok.*;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AgentMiniDTO {
    private Long id;
    private String name;
    private LocalDateTime createdAt;
}
```

**AgentListDTO.java** — List row view returned by `getListPage`. Prompt fields intentionally omitted.

```java
package com.agentForgeBackend.models.agent;

import lombok.*;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AgentListDTO {
    private Long id;
    private String name;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    // initPrompt, recurrentPrompt, ownerId intentionally omitted — keep list payloads small
}
```

#### Edge Cases

1. **`@AllArgsConstructor` on `AgentForm`:** The four-argument constructor is used by `AgentMapperTest` (Step 5) with `new AgentForm(name, description, initPrompt, recurrentPrompt)`. Without `@AllArgsConstructor`, the test will not compile.
2. **No `@Getter @Setter` on DTOs:** `@Data` from Lombok generates both. There is no need to add `@Getter @Setter` separately.
3. **No `password` field anywhere:** DTOs must never expose sensitive fields. `ownerId` is the employee's JPA-generated PK — it is not a credential and is safe to expose.

---

### Step 7: Create AgentMapper (Phase 2, Step 2.3)

**Goal:** Implement the four mapping methods. After this step, `AgentMapperTest` compiles and all mapper tests pass.

**Dependencies:** `AgentEntity`, `AgentForm`, `AgentDTO`, `AgentMiniDTO`, `AgentListDTO` must all exist (Steps 2 and 6).

- [ ] Create `AgentMapper.java` in `backend/src/main/java/com/agentForgeBackend/models/agent/`

**Why this step is critical:** The mapper is the sole point where entity→DTO conversion happens. The Hibernate proxy safety comment (Finding 6 decision) must be present — it documents a subtle contract that future maintainers must not accidentally break by changing the access pattern.

#### Implementation

```java
package com.agentForgeBackend.models.agent;

import com.agentForgeBackend.shared.defaultInterfaces.DefaultMapper;
import org.springframework.stereotype.Component;

@Component
public class AgentMapper implements DefaultMapper<AgentDTO, AgentMiniDTO, AgentListDTO, AgentForm, AgentEntity> {

    @Override
    public AgentDTO toDTO(AgentEntity entity) {
        if (entity == null) return null;
        return AgentDTO.builder()
                .id(entity.getId())
                .name(entity.getName())
                .description(entity.getDescription())
                .initPrompt(entity.getInitPrompt())
                .recurrentPrompt(entity.getRecurrentPrompt())
                // getId() on a Hibernate lazy proxy does not trigger initialization —
                // the FK identifier is stored in the proxy at construction time (Hibernate ORM contract)
                .ownerId(entity.getOwner().getId())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    @Override
    public AgentMiniDTO toSmallDTO(AgentEntity entity) {
        if (entity == null) return null;
        return AgentMiniDTO.builder()
                .id(entity.getId())
                .name(entity.getName())
                .createdAt(entity.getCreatedAt())
                .build();
    }

    @Override
    public AgentListDTO toListDTO(AgentEntity entity) {
        if (entity == null) return null;
        return AgentListDTO.builder()
                .id(entity.getId())
                .name(entity.getName())
                .description(entity.getDescription())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    @Override
    public AgentEntity toEntity(AgentForm form) {
        if (form == null) return null;
        AgentEntity entity = new AgentEntity();
        if (form.getName() != null) entity.setName(form.getName());
        if (form.getDescription() != null) entity.setDescription(form.getDescription());
        if (form.getInitPrompt() != null) entity.setInitPrompt(form.getInitPrompt());
        if (form.getRecurrentPrompt() != null) entity.setRecurrentPrompt(form.getRecurrentPrompt());
        // owner is intentionally not set here — AgentService.insert() sets it from the authenticated principal
        return entity;
    }
}
```

#### Edge Cases

1. **`toEntity()` null guards on non-blank fields:** Even though `AgentForm.name` and `AgentForm.initPrompt` are `@NotBlank`, the mapper applies null guards defensively. `@Valid` validation fires at the controller boundary — the mapper cannot assume it has been called. Null-guard prevents NPE if the mapper is called directly in tests.
2. **`toDTO()` null-safety for `description` and `recurrentPrompt`:** Both are nullable entity fields. The builder accepts `null` and produces `null` in the DTO — no null-check needed in the mapping chain.
3. **`toListDTO()` does not call `entity.getOwner()`:** Only `toDTO()` accesses `owner`. `toListDTO()` and `toSmallDTO()` never touch the owner proxy — they are safe to call even if `owner` is fully uninitialized.

---

### Step 7.5: Add AgentMapperIntegrationTest (Hibernate Proxy Regression Test)

<!-- REVIEW-FIX: New step added to contain the Hibernate proxy test that could not live in
AgentRepositoryTest without causing a compile failure during Steps 1-4 -->
**Goal:** Create a `@DataJpaTest` test that verifies `AgentMapper.toDTO()` succeeds when `owner` is a Hibernate lazy proxy — confirming the Finding 6 decision is correct and will not regress.

**Dependencies:** `AgentMapper`, `AgentEntity`, and `AgentRepository` must all exist (Steps 2, 3, 7).

- [ ] Create `AgentMapperIntegrationTest.java` in `backend/src/test/java/com/agentForgeBackend/models/agent/`

**Why this step is critical:** This is the only machine-verifiable test for the Hibernate proxy `getId()` contract documented in `AgentMapper.toDTO()`. Without it, a future refactor that changes `entity.getOwner().getId()` to access any non-key property (e.g., `entity.getOwner().getUsername()`) would silently introduce a `LazyInitializationException` with no failing test.

#### Implementation

```java
package com.agentForgeBackend.models.agent;

import com.agentForgeBackend.models.hq.employee.EmployeeEntity;
import com.agentForgeBackend.shared.models.baseUser.UserRoles;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

@DataJpaTest
@ActiveProfiles("test")
@Tag("repository")
class AgentMapperIntegrationTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private AgentRepository agentRepository;

    private EmployeeEntity owner;

    @BeforeEach
    void setUp() {
        entityManager.clear();
        owner = entityManager.persistFlushFind(new EmployeeEntity(
                "Proxy", "Owner", "proxy-owner@test.com",
                Set.of(UserRoles.EMPLOYEE), "proxy-owner-test", "password"));
    }

    @Test
    void toDTOSucceedsOnHibernateOwnerProxy() {
        // Verifies Finding 6 decision: entity.getOwner().getId() on a lazy proxy does NOT throw
        // LazyInitializationException. Hibernate stores the FK id inside the proxy at construction time.
        AgentMapper agentMapper = new AgentMapper();
        AgentEntity agent = new AgentEntity();
        agent.setName("ProxyAgent");
        agent.setInitPrompt("Test prompt.");
        agent.setOwner(owner);
        agent = entityManager.persistAndFlush(agent);
        entityManager.clear();

        // After clear, findById returns an entity whose 'owner' field is a Hibernate lazy proxy
        AgentEntity loaded = agentRepository.findById(agent.getId()).orElseThrow();

        assertThatCode(() -> agentMapper.toDTO(loaded)).doesNotThrowAnyException();
        AgentDTO dto = agentMapper.toDTO(loaded);
        assertThat(dto.getOwnerId()).isEqualTo(owner.getId());
    }
}
```

#### Edge Cases

1. **Why a separate class and not `AgentRepositoryTest`:** `AgentMapper` does not exist until Step 7. If `AgentMapper` were referenced in `AgentRepositoryTest`, the entire test class (all 8 tests) would fail to compile during Steps 1–4. A separate class isolates the dependency.
2. **`entityManager.clear()` in `@BeforeEach`:** Detaches all entities from the previous test's transaction. After `persistFlushFind(owner)`, `owner` is a fresh managed instance with a populated `id`.

---

### Step 8: Run AgentMapperTest and AgentMapperIntegrationTest → GREEN

<!-- REVIEW-FIX: Fixed count from 12 to 13; removed stale proxy test workaround note; added AgentMapperIntegrationTest run -->
**Goal:** All mapper unit tests (13) and the mapper integration test (1) pass.

**Dependencies:** Steps 5, 6, 7, 7.5 complete.

- [ ] From `backend/`: run `./mvnw test -Dtest=AgentMapperTest`
- [ ] Confirm 13 tests pass, 0 failures
- [ ] From `backend/`: run `./mvnw test -Dtest=AgentMapperIntegrationTest`
- [ ] Confirm 1 test passes (`toDTOSucceedsOnHibernateOwnerProxy`)

**Why this step is critical:** Green mapper tests confirm the DTO field contracts, null-safety, and the `AgentListDTO` field exclusion. The `toListDTOOmitsPromptFields` reflection test is the only machine-verifiable check that prompt fields won't accidentally appear in list payloads. The integration test confirms the Hibernate proxy contract holds in a real JPA context.

#### Edge Cases

1. **`AgentMapperTest` has no `@SpringBootTest`:** It is a pure unit test. No database, no HTTP, no Spring context. Run time is under 1 second.
2. **`AgentMapperIntegrationTest` requires `@DataJpaTest` context:** It starts H2 and Hibernate. Run time is similar to `AgentRepositoryTest`.

---

### Step 9: Compile to Generate QAgentEntity (Phase 2, Step 2.5)

**Goal:** Run the full Maven compile to trigger QueryDSL APT and generate `QAgentEntity.java`. `AgentQueryProfile` in Task 3 imports `QAgentEntity` — this class must exist before Task 3 begins.

**Dependencies:** `AgentEntity` must exist (Step 2).

<!-- REVIEW-FIX: Corrected compile command — no root-level mvnw; mvnw lives only in backend/ -->
- [ ] From `backend/`: run `./mvnw compile`
- [ ] Verify no compilation errors
- [ ] Verify `QAgentEntity.java` was generated in `backend/target/generated-sources/annotations/com/agentForgeBackend/models/agent/` <!-- REVIEW-FIX: corrected path from generated-sources/java/ to generated-sources/annotations/ — matches actual APT output (same as LlmModel Deviation 2) -->

**Why this step is critical:** `querydsl-apt` generates Q-classes at compile time by scanning `@Entity`-annotated classes. If `QAgentEntity` is missing when Task 3 writes `AgentQueryProfile`, the build will fail. The compile step must run after `AgentEntity` is created and before Task 3 begins.

#### Edge Cases

1. **`mvnw` is inside `backend/`:** Run `./mvnw compile` from the `backend/` directory (the same directory used for `./mvnw test`). There is no `mvnw` at the project root.
2. **Stale Q-classes:** If `AgentEntity` fields are changed after this step, a recompile is required to regenerate `QAgentEntity`. The QueryDSL APT processor runs automatically on every `compile` invocation — a single `./mvnw compile` from `backend/` after any entity change is sufficient.
3. **`QAgentEntity` location:** The generated file appears under `backend/target/generated-sources/annotations/`. <!-- REVIEW-FIX: corrected path from generated-sources/java/ to generated-sources/annotations/ --> IDEs typically add this to the source root automatically. If IntelliJ does not recognize it, mark `target/generated-sources/annotations` as a "Generated Sources Root".

---

### Step 10: Run Full Test Suite (Regression Check)

**Goal:** Confirm Task 2 changes do not break any pre-existing tests.

**Dependencies:** Steps 1–9 complete.

<!-- REVIEW-FIX: Fixed counts — AgentRepositoryTest is 8 tests (proxy test moved); AgentMapperTest is 13 tests; added AgentMapperIntegrationTest -->
- [ ] From `backend/`: run `./mvnw test`
- [ ] Confirm `AgentRepositoryTest` passes with 8 tests
- [ ] Confirm `AgentMapperTest` passes with 13 tests
- [ ] Confirm `AgentMapperIntegrationTest` passes with 1 test
- [ ] Confirm all previously passing test classes still pass (0 new failures)
- [ ] Note: the pre-existing `authServerApplicationTests.contextLoads` Docker error is expected if Docker Compose is not running — it is not caused by this task

**Why this step is critical:** A new `@Entity` class (`AgentEntity`) causes Hibernate to generate a new `agent` table via `ddl-auto=update` in production and `create-drop` in tests. If the entity annotations are incorrect (e.g., a bad FK reference, an invalid column definition), the test infrastructure itself will fail to start.

---

## Design Decisions

**Decision 1: `models/agent/` as a top-level peer of `models/hq/` and `models/llm/`**
- **Why:** `AgentEntity` is a standalone domain entity — it is not a user-type subtype and does not belong in `models/hq/`. When `ConversationEntity` is built in a future feature, it imports `AgentEntity`. If `AgentEntity` lived inside `models/hq/`, `ConversationEntity` would create a cross-domain dependency from the conversation layer to the user-management layer.
- **Alternatives considered:** `models/hq/agent/` (collocated with employees). Rejected — creates coupling between the HQ domain and any future entity that references agents.

**Decision 2: `AgentEntity` does not extend `BaseUserEntity`**
- **Why:** `AgentEntity` is not a user type. Extending `BaseUserEntity` would put an `agent` row in `base_user` (JOINED inheritance), giving it a username, email, password, and roles — all nonsensical. `AgentEntity` is a resource owned by a user, not a user itself.
- **Alternatives considered:** None — the feature doc and architecture are clear on this.

**Decision 3: `findByIdAndOwnerId(Long, Long)` uses primitive Long, not `EmployeeEntity` (Finding 4)**
- **Why:** `AuthUserUtil.getAuthUserEmployeeEntity()` may return a detached entity (loaded in a previous transaction). Passing a detached entity to a Spring Data derived query using `findByIdAndOwner(id, entity)` risks `DetachedObjectException` in some Hibernate versions. Using `findByIdAndOwnerId(id, entity.getId())` passes only the FK value — completely eliminating the detachment risk class.
- **Alternatives considered:** `findByIdAndOwner(Long id, EmployeeEntity owner)`. Rejected — subtle JPA footgun that works in most cases but not all.

**Decision 4: `AgentMapper.toDTO()` includes `ownerId` with a Hibernate proxy safety comment (Finding 6 decision)**
- **Why:** Removing `ownerId` from `AgentDTO` (Finding 6's initial recommendation) would solve a non-existent problem — `entity.getOwner().getId()` on a lazy proxy never triggers `LazyInitializationException` because Hibernate stores the FK id in the proxy at construction time. The field is useful for API consumers that need to verify ownership. The comment documents the guarantee so future maintainers don't replace `getId()` with a property access that WOULD trigger initialization.
- **Alternatives considered:** Remove `ownerId` from `AgentDTO`. Rejected — solves a problem that does not exist, removes useful API information, and contradicts the feature spec.

**Decision 5: `AgentListDTO` omits `initPrompt`, `recurrentPrompt`, and `ownerId`**
- **Why:** List payloads should be scannable — returning full prompt text (potentially kilobytes per agent) in a paginated list of N agents creates unnecessary payload size. `ownerId` is redundant in the list context — all listed agents belong to the authenticated employee. Full detail is available via `GET /agent/{id}` which returns `AgentDTO`.
- **Alternatives considered:** Include all fields in `AgentListDTO`. Rejected — performance concern (large blobs in list responses), and the feature doc explicitly states "prompts omitted from list to keep payloads small."

**Decision 6: Two TDD cycles (repository then mapper) with compilation gates**
- **Why:** The repository cycle proves the JPA mapping and H2 schema work before adding mapper complexity. The mapper cycle proves the DTO contract before Task 3 wires business logic. Each cycle has a clear compilation gate — tests don't compile until the production code exists, making the RED state observable and unambiguous.
- **Alternatives considered:** Write all tests first (repository + mapper), then implement all production code. Rejected — the TDD skill explicitly prohibits horizontal slicing; vertical cycles provide faster feedback on each slice.

---

## Testing Considerations

### Automatic Validation

<!-- REVIEW-FIX: Removed stale "8 of 9 / skip proxy test" language; fixed counts; fixed compile command -->
- [ ] From `backend/`: run `./mvnw test -Dtest=AgentRepositoryTest` after Steps 1–4 — confirm 8 tests pass, 0 failures
- [ ] From `backend/`: run `./mvnw test -Dtest=AgentMapperTest` after Steps 5–8 — confirm 13 tests pass, 0 failures
- [ ] From `backend/`: run `./mvnw test -Dtest=AgentMapperIntegrationTest` after Step 7.5 — confirm 1 test passes (`toDTOSucceedsOnHibernateOwnerProxy`)
- [ ] From `backend/`: run `./mvnw compile` after Step 2 — confirm 0 errors and `QAgentEntity.java` appears in `backend/target/generated-sources/annotations/com/agentForgeBackend/models/agent/` <!-- REVIEW-FIX: corrected path from generated-sources/java/ to generated-sources/annotations/ -->
- [ ] From `backend/`: run `./mvnw test` after Steps 1–9 — confirm 0 new failures (pre-existing `authServerApplicationTests.contextLoads` Docker error is expected)

### Manual Validation

*(No UI or HTTP endpoints are created in this task — no manual validation is required. HTTP endpoint testing begins in Task 3 once AgentController exists.)*

---

## Related Code Explanations

- `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelEntity.java` — `@PrePersist` with only `createdAt` (Agent extends this with `updatedAt` and `@PreUpdate`)
- `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelMapper.java` — mapper null-safety and builder pattern template
- `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelRepository.java` — custom finder method naming convention
- `backend/src/main/java/com/agentForgeBackend/shared/defaultImplements/DefaultServiceImplements.java:37-38` — `private` `pageableFactory` and `queryPredicateBuilder` fields that Task 3 must change to `protected`
- `backend/src/main/java/com/agentForgeBackend/shared/models/baseUser/BaseUserEntity.java` — `@Getter @Setter` confirms `setId()` is available for mapper unit test

---

## Completion Criteria

- [ ] Parent document reviewed and Task 2 scope reflected accurately
- [ ] All skills reviewed and selected
- [ ] Spring Data JPA derived query patterns verified against existing codebase (identical patterns in `LlmModelRepository`, `EmployeeRepository`)
- [ ] `backend/src/main/java/com/agentForgeBackend/models/agent/` directory created
- [ ] `AgentEntity.java` created — all fields, `@Lob TEXT` prompts, `owner` FK, `@PrePersist`/`@PreUpdate` lifecycle hooks
- [ ] `AgentRepository.java` created — extends `DefaultRepository`, `findByIdAndOwnerId`, `existsByNameAndOwnerId` using Long parameters
- [ ] `AgentForm.java` created — `@NotBlank` on `name` and `initPrompt`; nullable `description` and `recurrentPrompt`; no `owner` field
- [ ] `AgentDTO.java` created — all 8 fields including `ownerId`
- [ ] `AgentMiniDTO.java` created — `id`, `name`, `createdAt`
- [ ] `AgentListDTO.java` created — `id`, `name`, `description`, `createdAt`, `updatedAt`; NO prompt fields
- [ ] `AgentMapper.java` created — 4 methods, Hibernate proxy `getId()` comment in `toDTO()`, `owner` not set in `toEntity()`
<!-- REVIEW-FIX: Fixed counts; added AgentMapperIntegrationTest; fixed compile command -->
- [ ] `AgentRepositoryTest.java` created — 8 tests covering custom finders and timestamp lifecycle
- [ ] `AgentMapperTest.java` created — 13 tests covering all 4 mapping methods, null-safety, and `AgentListDTO` field exclusion
- [ ] `AgentMapperIntegrationTest.java` created — 1 test verifying Hibernate proxy `getId()` contract (`toDTOSucceedsOnHibernateOwnerProxy`)
- [ ] `./mvnw test -Dtest=AgentRepositoryTest` passes with 8 tests
- [ ] `./mvnw test -Dtest=AgentMapperTest` passes with 13 tests
- [ ] `./mvnw test -Dtest=AgentMapperIntegrationTest` passes with 1 test
- [ ] `./mvnw compile` (from `backend/`) generates `QAgentEntity.java` in `target/generated-sources/annotations/com/agentForgeBackend/models/agent/` <!-- REVIEW-FIX: corrected from vague generated-sources/ to the actual full annotations/ path -->
- [ ] `./mvnw test` (full suite) passes with 0 new failures
- [ ] Task 3 prerequisite note: `DefaultServiceImplements.pageableFactory` and `queryPredicateBuilder` must be changed from `private` to `protected` before Task 3 begins (documented as a Task 3 precondition, not a Task 2 action)
