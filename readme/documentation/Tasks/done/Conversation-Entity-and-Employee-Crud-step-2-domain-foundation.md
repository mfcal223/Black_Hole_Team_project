# Task: Conversation Domain Foundation

#task #current #high-complexity #parent-conversation-entity-and-employee-crud

**Parent:** [[Conversation-Entity-and-Employee-Crud]]
**Parent Type:** Feature
**Related Step(s):** Phase 2 — Steps 2.1, 2.2, 2.3, 2.4, 2.5
**Estimated Complexity:** High

---

## Goal

Create the persistence and API-contract foundation for the `Conversation` domain: `ConversationEntity` (with three outbound FKs and the first use of `@OnDelete(SET_NULL)` in this codebase), all DTOs and forms, `ConversationMapper`, `ConversationRepository`, and an additive `findByIdAndIsEnabledTrue` method on `LlmModelRepository`. Compile the backend to generate `QConversationEntity` via QueryDSL APT. After this task, the domain's data layer is complete and Task 3 (query profile, service, controller) can be built on top of it.

---

## Parent Context

The parent feature defines the `ConversationEntity` as a persistent, named chat session owned exclusively by an `EmployeeEntity`. Task 1 established the HTTP security gate (`/conversation/**` → `hasRole("EMPLOYEE")`). Task 2 builds the persistence and contract layer that Task 3 (service + controller) and Task 4 (supplemental tests) will build on.

Key parent decisions that govern this task:

- **Package:** `models/conversation/` — a top-level peer of `models/agent/` and `models/llm/`. Not nested under `models/hq/` or inside any other domain package.
- **Entity inheritance:** `ConversationEntity` does NOT extend `BaseUserEntity`. It is a standalone domain entity with three outbound FKs.
- **Three FK relationships:**
  - `employee` → `EmployeeEntity` (`employee_id`, `nullable = false`, `LAZY`)
  - `agent` → `AgentEntity` (`agent_id`, `nullable = true`, `LAZY`, **`@OnDelete(SET_NULL)`**)
  - `currentModel` → `LlmModelEntity` (`current_model_id`, `nullable = false`, `LAZY`)
- **`@OnDelete(SET_NULL)` on `agent` FK:** This is the first use of `@OnDelete` in this codebase. It resolves the deferred constraint noted in the Agent feature: deleting an Agent must convert its linked Conversations to general conversations (null agent) without violating the FK. It is declared here because the `conversation` table is new; existing tables are unaffected.
- **Nullable `agent` FK:** null = general conversation; non-null = agent conversation. The mapper must perform null-safe access when reading `entity.getAgent().getId()`.
- **Timestamps:** Both `createdAt` and `updatedAt` are set by `@PrePersist`. Only `updatedAt` is refreshed by `@PreUpdate`. `createdAt` is `updatable = false`.
- **Repository finder:** `findByIdAndEmployeeId(Long id, Long employeeId)` uses primitive `Long` bind parameters — not an `EmployeeEntity` object — to eliminate detached-entity concerns (same pattern as `AgentRepository.findByIdAndOwnerId`).
- **`LlmModelRepository.findByIdAndIsEnabledTrue(Long id)`:** This method does not currently exist. It must be added here. Direct repository injection in `ConversationService` is the correct approach because `LlmModelService` methods are all gated by `@PreAuthorize("hasRole('ADMIN')")`, which would fail under the employee security context.
- **Mapper `toEntity(form)`:** Maps `title` only. `employee`, `agent`, and `currentModel` are set by the service from the JWT principal and validated lookups. The mapper never accepts FK entities from the caller.
- **`ConversationForm.title` is nullable in the form:** The service defaults to `"New Conversation"` if blank or null. The mapper passes `title` through without defaulting.
- **Two additional form classes for PATCH endpoints:** `ConversationModelSwitchForm` (`modelId`, `@NotNull`) and `ConversationTitleForm` (`title`, `@NotBlank`) are created here, even though their endpoints are wired in Task 3. They belong to the domain-contract slice.
- **`ConversationListDTO` omits `employeeId`:** All conversations in the scoped list belong to the authenticated employee; exposing `employeeId` in the list payload is redundant. Only `ConversationDTO` includes `employeeId`.
- **TDD:** Write behavior tests before production code. This task uses three TDD cycles: repository tests → entity/repository implementation; LlmModel additive finder → method addition; mapper tests → DTO/form/mapper implementation.

---

## Preconditions / Dependencies

- Task 1 is complete: `SecurityConfig` has `.requestMatchers("/conversation/**").hasRole("EMPLOYEE")` and `SecurityAuthorizationTest` has 12 passing tests (9 original + 3 conversation security tests).
- `AgentEntity` exists at `models/agent/AgentEntity.java` and is functional — used as the nullable FK target for `ConversationEntity.agent`.
- `AgentRepository` exists at `models/agent/AgentRepository.java` — used in `ConversationRepositoryTest` to persist and delete `AgentEntity` instances for the `@OnDelete(SET_NULL)` test.
- `EmployeeEntity` exists at `models/hq/employee/EmployeeEntity.java` and is functional — used as the non-nullable FK target for `ConversationEntity.employee`.
- `LlmModelEntity` exists at `models/llm/LlmModelEntity.java` with an `isEnabled` Boolean field — used as the non-nullable FK target for `ConversationEntity.currentModel`.
- `LlmModelRepository` exists at `models/llm/LlmModelRepository.java` — currently has `findByModelId` and `existsByModelId` only. **Step 4.5 adds `findByIdAndIsEnabledTrue`.**
- `BaseUserEntity` at `shared/models/baseUser/BaseUserEntity.java` has `@Getter @Setter` from Lombok — `setId(Long id)` is available for mapper unit tests.
- `DefaultRepository`, `DefaultMapper`, `DefaultService` interfaces exist in `shared/defaultInterfaces/`.
- H2 in-memory DB is configured via `application-test.properties` with `spring.jpa.hibernate.ddl-auto=create-drop`.
- Maven QueryDSL APT processor (`querydsl-apt`) is configured in `pom.xml` and generates Q-classes at compile time.
- `./mvnw compile` run from `backend/` is the compile command. There is no root-level `mvnw` wrapper; `-pl backend` is not applicable.
- `DefaultServiceImplements.pageableFactory` and `queryPredicateBuilder` are already `protected` (changed in Agent Task 3). No changes to the base class are needed for Task 2.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — Selected — task template, directory conventions, doc config
- `solid-deep-design` — Selected — SRP per module, depth analysis for repository and mapper, seam placement; nullable FK introduces null-safety concern at the mapper seam
- `tdd` — Selected — three vertical TDD cycles (repository, LlmModel finder, mapper); write failing tests before production code
- `memory-bank` — Selected — architecture, tech stack, and known-issues loaded; patterns confirmed; `@OnDelete` deferred constraint from known-issues.md confirmed as this task's responsibility
- `glossary-management` — Selected — Conversation, Agent, Employee, LLM Model, Ownership Scope terms reviewed; no new domain terms introduced
- `find-docs` — Selected — Hibernate `@OnDelete` with `OnDeleteAction.SET_NULL` verified: annotation is from `org.hibernate.annotations`, available in Hibernate 6.x (Spring Boot 3.4.1-managed). Spring Data JPA derived queries verified against existing codebase patterns in `AgentRepository` and `LlmModelRepository`.

### Documentation Reviewed

- `documentation/Tasks/done/Agent-Entity-and-Employee-Crud-step-2-domain-foundation.md` — direct prior art and structural template; identical TDD cycle pattern, same `@DataJpaTest` test class structure, same Hibernate proxy safety concern
- `documentation/Features/to-do/Conversation-Entity-and-Employee-Crud.md` — parent feature; §2 (entity), §3 (DTOs/forms), §4 (mapper), §5 (repository), §6 (LlmModelRepository), Steps 2.1–2.5
- `documentation/Memory/known-issues.md` — deferred `AgentEntity` hard-delete FK violation note: confirmed this task resolves it via `@OnDelete(SET_NULL)` on `ConversationEntity.agent`
- `backend/src/main/java/com/agentForgeBackend/models/agent/` — canonical prior art for entity/DTO/mapper/repository pattern
- `backend/src/test/java/com/agentForgeBackend/models/agent/` — `AgentRepositoryTest`, `AgentMapperTest`, `AgentMapperIntegrationTest` — canonical test templates

### Related Existing Code

- [[AgentEntity-java]] — `backend/src/main/java/com/agentForgeBackend/models/agent/AgentEntity.java` — FK pattern (LAZY owner), `@PrePersist`/`@PreUpdate` lifecycle hook pattern
- [[AgentMapper-java]] — `backend/src/main/java/com/agentForgeBackend/models/agent/AgentMapper.java` — mapper null-safety, Hibernate proxy comment, builder pattern
- [[AgentRepository-java]] — `backend/src/main/java/com/agentForgeBackend/models/agent/AgentRepository.java` — ownership-scoped finder naming convention (Long params, not entity)
- [[LlmModelEntity-java]] — `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelEntity.java` — `isEnabled` Boolean field (FK target for `currentModel`; filtered via `findByIdAndIsEnabledTrue`)
- [[LlmModelRepository-java]] — `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelRepository.java` — **additive change in Step 4.5** — `findByIdAndIsEnabledTrue(Long id)` added here
- [[EmployeeEntity-java]] — `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeEntity.java` — employee FK target; parameterized constructor available for test seeding
- [[DefaultMapper-java]] — `backend/src/main/java/com/agentForgeBackend/shared/defaultInterfaces/DefaultMapper.java` — interface `ConversationMapper` implements
- [[DefaultRepository-java]] — `backend/src/main/java/com/agentForgeBackend/shared/defaultInterfaces/DefaultRepository.java` — interface `ConversationRepository` extends

---

## Implementation Details

### Approach

**SOLID analysis:**
- **SRP**: Each class has one reason to change. `ConversationEntity` owns persistence structure; `ConversationMapper` owns DTO conversion; `ConversationRepository` owns data access; each DTO and form owns its API shape.
- **OCP**: `ConversationRepository` extends `DefaultRepository` — adding new finders is additive. The new `findByIdAndIsEnabledTrue` in `LlmModelRepository` is purely additive, no existing behavior is changed.
- **DIP**: Task 3's `ConversationService` will depend on `ConversationRepository` (via `DefaultRepository` abstraction) and `ConversationMapper` (via `DefaultMapper` abstraction), never on concrete classes.
- **Depth**: `ConversationRepository` is deep — the full Spring Data JPA + QueryDSL infrastructure sits behind a 1-method custom interface. `ConversationMapper` is intentionally shallow — mappers are coordinators, not logic-holders; depth would be accidental complexity here.

**Three TDD cycles:**

**TDD cycle 1 — Repository:**
1. **RED**: Write `ConversationRepositoryTest.java`. Tests will not compile because `ConversationEntity` and `ConversationRepository` do not exist.
2. **GREEN**: Create `ConversationEntity` (makes tests compile) and `ConversationRepository` (provides the custom finder). All repository tests pass.

**TDD cycle 2 — LlmModel additive finder:**
1. **RED**: Write a `findByIdAndIsEnabledTrue` test in `LlmModelRepositoryTest.java`. The test will not compile because the method does not exist.
2. **GREEN**: Add `Optional<LlmModelEntity> findByIdAndIsEnabledTrue(Long id)` to `LlmModelRepository`. Both new tests pass.

**TDD cycle 3 — Mapper:**
1. **RED**: Write `ConversationMapperTest.java`. Tests will not compile because `ConversationDTO`, `ConversationMiniDTO`, `ConversationListDTO`, `ConversationForm`, `ConversationModelSwitchForm`, `ConversationTitleForm`, and `ConversationMapper` do not exist.
2. **GREEN**: Create all DTO/form classes and `ConversationMapper`. All mapper tests pass.

**Nullable FK proxy safety (agent):** `ConversationMapper.toDTO()` and `toListDTO()` must guard against a null `agent` proxy: `entity.getAgent() != null ? entity.getAgent().getId() : null`. The non-null FKs (`employee`, `currentModel`) follow the same Hibernate proxy `getId()` safety contract documented in `AgentMapper` — the FK identifier is stored in the proxy at construction time and `getId()` never triggers initialization.

**`@OnDelete(SET_NULL)` — first use in codebase:** The annotation `@OnDelete(action = OnDeleteAction.SET_NULL)` from `org.hibernate.annotations` instructs Hibernate to generate an `ON DELETE SET NULL` DDL clause on the FK constraint for `agent_id`. With `ddl-auto=create-drop` in tests, H2 generates the constraint. When an Agent is deleted, H2 sets `agent_id = NULL` on all rows in `conversation` that reference that agent. A regression test in `ConversationRepositoryTest` verifies this behavior. H2 2.x (included with Spring Boot 3.4.1) supports `ON DELETE SET NULL` — the test is expected to pass.

**Compile step:** Run `./mvnw compile` from `backend/` after `ConversationEntity` exists. This triggers `querydsl-apt` to generate `QConversationEntity.java` in `target/generated-sources/annotations/`. `QConversationEntity` is required by `ConversationQueryProfile` in Task 3 — the class must exist before Task 3 begins.

### Files to Create/Modify

**New production files (all in `backend/src/main/java/com/agentForgeBackend/models/conversation/`):**
- [x] `ConversationEntity.java` — JPA entity, three FK relationships, `@OnDelete(SET_NULL)` on agent, timestamp lifecycle hooks
- [x] `ConversationForm.java` — input contract for `POST /conversation`; `title` nullable, `modelId` `@NotNull`, `agentId` nullable
- [x] `ConversationModelSwitchForm.java` — request body for `PATCH /conversation/{id}/model`; `modelId` `@NotNull`
- [x] `ConversationTitleForm.java` — request body for `PATCH /conversation/{id}/title`; `title` `@NotBlank`
- [x] `ConversationDTO.java` — full detail view (returned by `getOne`, `delete`)
- [x] `ConversationMiniDTO.java` — compact insert response (returned by `insert`)
- [x] `ConversationListDTO.java` — list row view without `employeeId` (returned by `getListPage`)
- [x] `ConversationMapper.java` — converts between entity, DTOs, and form; null-safe `agentId`
- [x] `ConversationRepository.java` — Spring Data JPA repository with `findByIdAndEmployeeId`

**Modified production file:**
- [x] `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelRepository.java` — **additive only** — `findByIdAndIsEnabledTrue(Long id)` added

**New test files:**
- [x] `backend/src/test/java/com/agentForgeBackend/models/conversation/ConversationRepositoryTest.java` — `@DataJpaTest` tests for persistence, FK relationships, lifecycle hooks, and `@OnDelete(SET_NULL)` cascade (9 tests)
- [x] `backend/src/test/java/com/agentForgeBackend/models/conversation/ConversationMapperTest.java` — pure unit tests for all four mapper methods, null-safety for `agentId` (13 tests)
- [x] `backend/src/test/java/com/agentForgeBackend/models/conversation/ConversationMapperIntegrationTest.java` — `@DataJpaTest` regression test for Hibernate proxy `getId()` safety on all three FK fields (2 tests)

**Modified test file:**
- [x] `backend/src/test/java/com/agentForgeBackend/models/llm/LlmModelRepositoryTest.java` — **additive only** — 2 new tests for `findByIdAndIsEnabledTrue`

---

## Step-by-Step Implementation

### Step 1: TDD RED — Write ConversationRepositoryTest (before entity/repository exist)

**Goal:** Write behavior tests for `ConversationRepository` before the entity or repository exist. Tests will fail to compile — this is the expected RED state.

**Dependencies:** `AgentEntity`, `AgentRepository`, `EmployeeEntity`, `LlmModelEntity`, and their repositories must all exist (they do — all are from completed features).

- [x] Create directory: `backend/src/test/java/com/agentForgeBackend/models/conversation/`
- [x] Create `ConversationRepositoryTest.java` with the full test class below
- [x] Confirm the file does NOT compile (expected — `ConversationEntity` and `ConversationRepository` do not exist yet)

**Why this step is critical:** Writing tests first defines the repository contract (ownership-scoped finder, FK persistence behavior, timestamp lifecycle, `@OnDelete(SET_NULL)`) before any entity is written. The `@OnDelete(SET_NULL)` test is the first machine-verifiable validation that the deferred agent-FK constraint noted in `known-issues.md` is correctly resolved.

#### Implementation

```java
package com.agentForgeBackend.models.conversation;

import com.agentForgeBackend.models.agent.AgentEntity;
import com.agentForgeBackend.models.agent.AgentRepository;
import com.agentForgeBackend.models.hq.employee.EmployeeEntity;
import com.agentForgeBackend.models.llm.LlmModelEntity;
import com.agentForgeBackend.shared.models.baseUser.UserRoles;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

// REVIEW-FIX: Removed unused LlmModelRepository injection — model is seeded via TestEntityManager,
// not via llmModelRepository. Also added java.time.LocalDateTime import for explicit type declarations.

@DataJpaTest
@ActiveProfiles("test")
@Tag("repository")
class ConversationRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private ConversationRepository conversationRepository;

    @Autowired
    private AgentRepository agentRepository;

    private EmployeeEntity owner;
    private EmployeeEntity otherEmployee;
    private LlmModelEntity model;
    private AgentEntity agent;

    @BeforeEach
    void setUp() {
        entityManager.clear();

        owner = entityManager.persistFlushFind(new EmployeeEntity(
                "Owner", "Conv", "owner-conv@test.com",
                Set.of(UserRoles.EMPLOYEE), "owner-conv-test", "password"));

        otherEmployee = entityManager.persistFlushFind(new EmployeeEntity(
                "Other", "Conv", "other-conv@test.com",
                Set.of(UserRoles.EMPLOYEE), "other-conv-test", "password"));

        model = new LlmModelEntity();
        model.setModelId("openai/gpt-4o");
        model.setName("GPT-4o");
        model.setIsEnabled(true);
        model = entityManager.persistFlushFind(model);

        agent = new AgentEntity();
        agent.setName("Conv Test Agent");
        agent.setInitPrompt("You are a test agent.");
        agent.setOwner(owner);
        agent = entityManager.persistFlushFind(agent);
    }

    private ConversationEntity buildConversation(String title, EmployeeEntity employee,
                                                  AgentEntity convAgent) {
        ConversationEntity conv = new ConversationEntity();
        conv.setTitle(title);
        conv.setEmployee(employee);
        conv.setAgent(convAgent);
        conv.setCurrentModel(model);
        return conv;
    }

    @Test
    void findByIdAndEmployeeIdReturnsConversationForCorrectEmployee() {
        ConversationEntity conv = entityManager.persistAndFlush(
                buildConversation("My Chat", owner, null));
        entityManager.clear();

        Optional<ConversationEntity> result =
                conversationRepository.findByIdAndEmployeeId(conv.getId(), owner.getId());

        assertThat(result).isPresent();
        assertThat(result.get().getTitle()).isEqualTo("My Chat");
    }

    @Test
    void findByIdAndEmployeeIdReturnsEmptyForWrongEmployee() {
        ConversationEntity conv = entityManager.persistAndFlush(
                buildConversation("Private Chat", owner, null));
        entityManager.clear();

        Optional<ConversationEntity> result =
                conversationRepository.findByIdAndEmployeeId(conv.getId(), otherEmployee.getId());

        assertThat(result).isEmpty();
    }

    @Test
    void findByIdAndEmployeeIdReturnsEmptyForNonExistentId() {
        Optional<ConversationEntity> result =
                conversationRepository.findByIdAndEmployeeId(999L, owner.getId());

        assertThat(result).isEmpty();
    }

    @Test
    void prePersistSetsCreatedAtAndUpdatedAt() {
        ConversationEntity conv = entityManager.persistAndFlush(
                buildConversation("Timestamp Test", owner, null));
        entityManager.clear();

        ConversationEntity saved = conversationRepository.findById(conv.getId()).orElseThrow();

        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getUpdatedAt()).isNotNull();
    }

    @Test
    void preUpdateDoesNotChangeCreatedAt() {
        ConversationEntity conv = entityManager.persistAndFlush(
                buildConversation("Update Test", owner, null));
        // Truncate to seconds: H2 TIMESTAMP may produce off-by-1 microsecond on sub-second values
        var originalCreatedAt = conv.getCreatedAt().truncatedTo(ChronoUnit.SECONDS);
        entityManager.clear();

        ConversationEntity saved = conversationRepository.findById(conv.getId()).orElseThrow();
        saved.setTitle("Renamed Chat");
        conversationRepository.saveAndFlush(saved);
        entityManager.clear();

        ConversationEntity updated = conversationRepository.findById(conv.getId()).orElseThrow();
        assertThat(updated.getCreatedAt().truncatedTo(ChronoUnit.SECONDS))
                .isEqualTo(originalCreatedAt);
        assertThat(updated.getUpdatedAt()).isNotNull();
    }

    @Test
    void preUpdateRefreshesUpdatedAt() throws InterruptedException {
        ConversationEntity conv = entityManager.persistAndFlush(
                buildConversation("Refresh Test", owner, null));
        entityManager.clear();

        ConversationEntity saved = conversationRepository.findById(conv.getId()).orElseThrow();
        LocalDateTime originalUpdatedAt = saved.getUpdatedAt();  // explicit type — consistent with AgentRepositoryTest pattern

        Thread.sleep(20);

        saved.setTitle("Refresh Renamed");
        conversationRepository.saveAndFlush(saved);
        entityManager.clear();

        ConversationEntity updated = conversationRepository.findById(conv.getId()).orElseThrow();
        assertThat(updated.getUpdatedAt()).isAfter(originalUpdatedAt);
    }

    @Test
    void agentFkPersistsAsNullForGeneralConversation() {
        ConversationEntity conv = entityManager.persistAndFlush(
                buildConversation("General Chat", owner, null));
        entityManager.clear();

        ConversationEntity saved = conversationRepository.findById(conv.getId()).orElseThrow();

        // agent is LAZY — null FK column means the proxy is null, not an uninitialized proxy
        assertThat(saved.getAgent()).isNull();
    }

    @Test
    void agentFkPersistsWithValueForAgentConversation() {
        ConversationEntity conv = entityManager.persistAndFlush(
                buildConversation("Agent Chat", owner, agent));
        entityManager.clear();

        ConversationEntity saved = conversationRepository.findById(conv.getId()).orElseThrow();

        // getId() on a LAZY proxy does not trigger initialization — FK is stored in proxy
        assertThat(saved.getAgent()).isNotNull();
        assertThat(saved.getAgent().getId()).isEqualTo(agent.getId());
    }

    @Test
    void onDeleteSetNullClearsAgentFkWhenAgentDeleted() {
        // Verifies that @OnDelete(action = OnDeleteAction.SET_NULL) on ConversationEntity.agent
        // generates an ON DELETE SET NULL constraint in H2 DDL. When the Agent is hard-deleted,
        // H2 sets conversation.agent_id = NULL at the database level without violating the FK.
        // This resolves the deferred constraint noted in known-issues.md.
        //
        // H2 2.x (Spring Boot 3.4.1-managed) supports ON DELETE SET NULL in DDL.
        // If this test fails on H2, verify that Hibernate generated the ON DELETE SET NULL clause
        // by checking the H2 schema (enable H2 console or use SHOW CREATE TABLE conversation).
        // If H2 does not honor the constraint, this test should be moved to a Docker PostgreSQL profile.
        // REVIEW-FIX: Removed redundant entityManager.flush() — persistAndFlush() already flushed.
        ConversationEntity conv = entityManager.persistAndFlush(
                buildConversation("Agent Conv", owner, agent));
        entityManager.clear();

        agentRepository.deleteById(agent.getId());
        agentRepository.flush();
        entityManager.clear();

        ConversationEntity loaded = conversationRepository.findById(conv.getId()).orElseThrow();
        assertThat(loaded.getAgent()).isNull();
    }
}
```

#### Edge Cases

1. **`@DataJpaTest` transaction rollback:** Each test runs inside a transaction that rolls back on completion. `@BeforeEach` persists `owner`, `otherEmployee`, `model`, and `agent` within the same transaction — no cleanup needed between tests.
2. **Username/email uniqueness in `base_user`:** `owner` and `otherEmployee` use distinct usernames and emails to avoid `DataIntegrityViolationException` from `base_user`'s unique constraints.
3. **`preUpdateDoesNotChangeCreatedAt` truncation:** Same precision fix as `AgentRepositoryTest` — `LocalDateTime.now()` produces nanosecond precision, H2 stores only microsecond precision. Truncating both sides to seconds eliminates spurious off-by-1 microsecond failures.
4. **`onDeleteSetNullClearsAgentFkWhenAgentDeleted` flush strategy:** `agentRepository.deleteById(agent.getId())` stages the deletion in Hibernate. `agentRepository.flush()` forces the `DELETE FROM agent WHERE id = ?` SQL to H2. H2 processes the ON DELETE SET NULL constraint immediately. `entityManager.clear()` evicts the stale conversation from the first-level cache. The subsequent `findById` reads the updated row from H2 with `agent_id = NULL`. Without the explicit `flush()` + `clear()`, Hibernate might serve the stale cached version.
5. **`agentFkPersistsAsNullForGeneralConversation` — LAZY null proxy vs initialized null:** When `agent_id` is NULL in the database, Hibernate returns `null` (not an uninitialized proxy) for `entity.getAgent()`. Calling `getId()` would throw NPE on a null reference, not `LazyInitializationException`. The mapper must guard with `entity.getAgent() != null ?`.

---

### Step 2: Create ConversationEntity (Phase 2, Step 2.1)

**Goal:** Define the JPA entity with all three FK relationships and lifecycle hooks. This makes `ConversationRepositoryTest` compilable (Step 1 unblocks).

**Dependencies:** Step 1 tests written. `AgentEntity`, `EmployeeEntity`, `LlmModelEntity` all exist.

- [x] Create directory: `backend/src/main/java/com/agentForgeBackend/models/conversation/`
- [x] Create `ConversationEntity.java` with all fields, annotations, and lifecycle hooks as specified below
- [x] Verify the file compiles by running `./mvnw compile` from `backend/`

**Why this step is critical:** `ConversationEntity` is the root of all other classes in this task. The `@OnDelete(SET_NULL)` annotation on `agent` is the resolution to the deferred FK constraint noted in `known-issues.md`. The `nullable = true` on `@JoinColumn` for `agent` is required for `ON DELETE SET NULL` to work — a non-nullable column cannot be set to null by any cascade action.

#### Implementation

```java
package com.agentForgeBackend.models.conversation;

import com.agentForgeBackend.models.agent.AgentEntity;
import com.agentForgeBackend.models.hq.employee.EmployeeEntity;
import com.agentForgeBackend.models.llm.LlmModelEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;

@Entity
@Table(name = "conversation")
@Getter
@Setter
@NoArgsConstructor
public class ConversationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "title", nullable = false)
    private String title;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private EmployeeEntity employee;

    // nullable = true: null means general conversation; non-null means agent conversation.
    // @OnDelete(SET_NULL) generates an ON DELETE SET NULL constraint in DDL so that deleting
    // an Agent converts its linked Conversations to general conversations without FK violation.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id", nullable = true)
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private AgentEntity agent;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_model_id", nullable = false)
    private LlmModelEntity currentModel;

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

1. **`@OnDelete` import path:** `org.hibernate.annotations.OnDelete` and `org.hibernate.annotations.OnDeleteAction` — Hibernate-specific, not Jakarta Persistence. Spring Boot 3.4.1 manages Hibernate 6.x; these annotations are available without a separate dependency.
2. **`nullable = true` on agent `@JoinColumn` is mandatory:** `@OnDelete(SET_NULL)` requires the FK column to be nullable. A `NOT NULL` constraint is incompatible with setting the value to null. Any oversight here will cause a DDL conflict that surfaces at first startup.
3. **`ddl-auto=update` vs `ddl-auto=create-drop`:** Production uses `update` — since `conversation` is a new table, Hibernate generates the full DDL with the ON DELETE SET NULL constraint correctly. Tests use `create-drop` — H2 creates the table fresh each test run. Both are correct for a new table.
4. **`@NoArgsConstructor` requirement:** JPA mandates a no-args constructor on all entity classes. Lombok generates it.
5. **`employee` non-nullable FK:** Setting `employee` to null before persist will throw `PropertyValueException` at flush time. The service always sets it from the JWT principal.

---

### Step 3: Create ConversationRepository (Phase 2, Step 2.4 — part 1)

**Goal:** Provide data access with the ownership-scoped finder method. After this step, `ConversationRepositoryTest` compiles and all tests can be run.

**Dependencies:** `ConversationEntity` must exist (Step 2).

- [x] Create `ConversationRepository.java` in `backend/src/main/java/com/agentForgeBackend/models/conversation/`

**Why this step is critical:** `findByIdAndEmployeeId(Long, Long)` is the primary ownership-enforcement mechanism at the data layer for all single-entity operations in `ConversationService`. Using `employeeId` (Long) instead of `EmployeeEntity` eliminates all JPA detachment risks — same rationale as `AgentRepository.findByIdAndOwnerId`.

#### Implementation

```java
package com.agentForgeBackend.models.conversation;

import com.agentForgeBackend.shared.defaultInterfaces.DefaultRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ConversationRepository extends DefaultRepository<ConversationEntity, Long> {

    Optional<ConversationEntity> findByIdAndEmployeeId(Long id, Long employeeId);
}
```

**Spring Data JPA derived query resolution:**
- `findByIdAndEmployeeId` → `SELECT * FROM conversation WHERE id = :id AND employee_id = :employeeId`

Spring Data JPA resolves `EmployeeId` by traversing `ConversationEntity.employee.id` — the `id` field of the `EmployeeEntity` FK. This generates a direct column comparison (`employee_id = ?`) using the FK column already present on the `conversation` table. No JOIN is required.

#### Edge Cases

1. **`EmployeeId` suffix navigation:** Spring Data resolves `Employee` → `ConversationEntity.employee` (the `EmployeeEntity` field), then `Id` → `EmployeeEntity.id` (the `@Id` field). This is unambiguous because `employee` is the only `EmployeeEntity` field on `ConversationEntity`.
2. **No `existsByTitleAndEmployeeId`:** Unlike Agent (which enforces per-owner name uniqueness), Conversation titles are not unique per employee. No uniqueness finder is needed.

---

### Step 4: Run ConversationRepositoryTest → GREEN

**Goal:** All nine repository tests pass.

**Dependencies:** Steps 1, 2, 3 complete.

- [x] From `backend/`: run `./mvnw test -Dtest=ConversationRepositoryTest`
- [x] Confirm 9 tests pass, 0 failures
- [ ] If `onDeleteSetNullClearsAgentFkWhenAgentDeleted` fails: check whether H2 generated `ON DELETE SET NULL` in the DDL. Enable H2 trace logging (`spring.jpa.properties.hibernate.hbm2ddl.halt_on_error=true` and `spring.jpa.show-sql=true`) to inspect the generated schema. If H2 does not honor the constraint, mark the test with `@DisabledOnOs` or move to a Docker PostgreSQL profile and document the limitation.

**Why this step is critical:** Green tests confirm the entity schema, lifecycle hooks, FK persistence, and the `@OnDelete(SET_NULL)` constraint all work correctly under H2. The `@OnDelete(SET_NULL)` test is the highest-value test in this task — it's the first machine-verifiable confirmation that the deferred constraint from `known-issues.md` is actually resolved.

#### Edge Cases

1. **`persistFlushFind` availability:** `TestEntityManager.persistFlushFind(entity)` persists, flushes, and re-fetches the entity (returning the managed version with the generated ID). Use `persistAndFlush` when you only need the entity in managed state without a re-fetch.
2. **H2 ON DELETE SET NULL support:** H2 2.x supports `ON DELETE SET NULL`. If the test fails unexpectedly, confirm the Hibernate dialect is `H2Dialect` and that `ddl-auto=create-drop` is active in the test profile. A common failure mode is running without `@ActiveProfiles("test")`, causing `ddl-auto=update` to skip recreating the table.

---

### Step 4.5: TDD — Add `findByIdAndIsEnabledTrue` to LlmModelRepository (Phase 2, Step 2.4 — part 2)

**Goal:** Add the `findByIdAndIsEnabledTrue` method to `LlmModelRepository` following the TDD pattern: write failing tests first, then add the method.

**Dependencies:** `LlmModelRepository` and `LlmModelRepositoryTest` already exist.

<!-- REVIEW-FIX: Added instruction to read LlmModelRepositoryTest.java before modifying. Confirmed
the file uses JUnit5 Assertions style (assertTrue/assertFalse/assertNotNull), NOT AssertJ. The test
additions below match that style. TestEntityManager field is named `entityManager`; repo field is
`llmModelRepository`. -->
- [x] Read `backend/src/test/java/com/agentForgeBackend/models/llm/LlmModelRepositoryTest.java` to confirm the field names and assertion style before modifying (verified: `entityManager` = `TestEntityManager`, `llmModelRepository` = `LlmModelRepository`, assertions use JUnit5 `org.junit.jupiter.api.Assertions.*`)
- [x] Append the 2 new tests at the end of the class (TDD RED phase)
- [x] Confirm the tests fail to compile because `findByIdAndIsEnabledTrue` does not exist in `LlmModelRepository`
- [x] Add `Optional<LlmModelEntity> findByIdAndIsEnabledTrue(Long id)` to `LlmModelRepository` (TDD GREEN)
- [x] From `backend/`: run `./mvnw test -Dtest=LlmModelRepositoryTest` — confirm all tests pass

**Why this step is critical:** `ConversationService` (Task 3) uses `llmModelRepository.findByIdAndIsEnabledTrue(modelId)` on every `insert` and `switchModel` call. If the method is absent, Spring Data fails at boot time when generating the repository proxy — the entire test suite crashes. Adding and verifying it here prevents a Task 3 boot failure.

#### Implementation — Tests to append to `LlmModelRepositoryTest.java`

The existing file uses JUnit5 Assertions style (`import static org.junit.jupiter.api.Assertions.*`). Append these tests **inside the class body after the last existing test**, matching that style:

```java
@Test
void findByIdAndIsEnabledTrueReturnsModelWhenEnabled() {
    // Mirrors the lookup ConversationService uses on insert and switchModel
    LlmModelEntity model = new LlmModelEntity();
    model.setModelId("test/enabled-model");
    model.setName("Enabled Model");
    model.setIsEnabled(true);
    model = entityManager.persistFlushFind(model);
    entityManager.clear();

    Optional<LlmModelEntity> result = llmModelRepository.findByIdAndIsEnabledTrue(model.getId());

    assertTrue(result.isPresent());
    assertEquals("Enabled Model", result.get().getName());
}

@Test
void findByIdAndIsEnabledTrueReturnsEmptyWhenDisabled() {
    LlmModelEntity model = new LlmModelEntity();
    model.setModelId("test/disabled-model");
    model.setName("Disabled Model");
    model.setIsEnabled(false);
    model = entityManager.persistFlushFind(model);
    entityManager.clear();

    Optional<LlmModelEntity> result = llmModelRepository.findByIdAndIsEnabledTrue(model.getId());

    assertFalse(result.isPresent());
}
```

#### Implementation — Method to add to `LlmModelRepository.java`

Open `LlmModelRepository.java` and add after the existing `existsByModelId` method:

```java
Optional<LlmModelEntity> findByIdAndIsEnabledTrue(Long id);
```

**Spring Data JPA derived query resolution:**
- `findByIdAndIsEnabledTrue` → `SELECT * FROM llm_model WHERE id = :id AND is_enabled = TRUE`

Spring Data resolves `IsEnabledTrue` as `isEnabled = true`. This is a Spring Data keywords pattern: `True` is a trailing keyword meaning "equals `true`". The method returns `Optional.empty()` when the model does not exist OR when `isEnabled = false`.

#### Edge Cases

1. **`modelId` unique constraint:** `LlmModelEntity.modelId` has `unique = true`. Use distinct `modelId` values (e.g., `test/enabled-model`, `test/disabled-model`) to avoid `DataIntegrityViolationException` if other LlmModel tests in the same `@DataJpaTest` context have already seeded models. The `@DataJpaTest` transaction rollback isolates tests, but be cautious if the class uses `@BeforeAll` or shared state.
2. **`isEnabled` defaults to `true`:** `LlmModelEntity.isEnabled` has a default value of `true` at the field level. For the disabled-model test, `model.setIsEnabled(false)` must be called explicitly before persisting.

---

### Step 5: TDD RED — Write ConversationMapperTest (before DTOs/mapper exist)

**Goal:** Write behavior tests for `ConversationMapper` before the DTOs, forms, or mapper exist. Tests will not compile — expected RED state.

**Dependencies:** Steps 1–4.5 complete (entity and repository tests green).

- [x] Create `ConversationMapperTest.java` in `backend/src/test/java/com/agentForgeBackend/models/conversation/`
- [x] Confirm the file does NOT compile (expected — DTOs, forms, and mapper do not exist yet)

**Why this step is critical:** Writing mapper tests first specifies the exact field contracts for each DTO type before any class is created. The null-safety contract for `agentId` is verified in both `toDTOMapsAgentIdAsNullWhenAgentIsNull` and `toListDTOSetsAgentIdNullWhenAgentIsNull` — catching any future regression where someone removes the null-check from the mapper.

#### Implementation

```java
package com.agentForgeBackend.models.conversation;

import com.agentForgeBackend.models.agent.AgentEntity;
import com.agentForgeBackend.models.hq.employee.EmployeeEntity;
import com.agentForgeBackend.models.llm.LlmModelEntity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class ConversationMapperTest {

    private ConversationMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = new ConversationMapper();
    }

    private ConversationEntity buildEntity(boolean withAgent) {
        EmployeeEntity employee = new EmployeeEntity();
        employee.setId(10L);  // BaseUserEntity has @Getter @Setter from Lombok

        LlmModelEntity model = new LlmModelEntity();
        model.setId(20L);

        ConversationEntity entity = new ConversationEntity();
        entity.setId(1L);
        entity.setTitle("My Chat");
        entity.setEmployee(employee);
        entity.setCurrentModel(model);
        entity.setCreatedAt(LocalDateTime.of(2026, 6, 18, 10, 0, 0));
        entity.setUpdatedAt(LocalDateTime.of(2026, 6, 18, 11, 0, 0));

        if (withAgent) {
            AgentEntity agent = new AgentEntity();
            agent.setId(30L);
            entity.setAgent(agent);
        }
        return entity;
    }

    // ── toDTO ──────────────────────────────────────────────────────────

    @Test
    void toDTOMapsAllFieldsWithAgent() {
        ConversationEntity entity = buildEntity(true);

        ConversationDTO dto = mapper.toDTO(entity);

        assertThat(dto.getId()).isEqualTo(1L);
        assertThat(dto.getTitle()).isEqualTo("My Chat");
        assertThat(dto.getEmployeeId()).isEqualTo(10L);
        assertThat(dto.getAgentId()).isEqualTo(30L);
        assertThat(dto.getCurrentModelId()).isEqualTo(20L);
        assertThat(dto.getCreatedAt()).isEqualTo(LocalDateTime.of(2026, 6, 18, 10, 0, 0));
        assertThat(dto.getUpdatedAt()).isEqualTo(LocalDateTime.of(2026, 6, 18, 11, 0, 0));
    }

    @Test
    void toDTOMapsAgentIdAsNullWhenAgentIsNull() {
        ConversationEntity entity = buildEntity(false);

        ConversationDTO dto = mapper.toDTO(entity);

        assertThat(dto.getAgentId()).isNull();
    }

    @Test
    void toDTOReturnsNullForNullEntity() {
        assertThat(mapper.toDTO(null)).isNull();
    }

    // ── toSmallDTO ────────────────────────────────────────────────────

    @Test
    void toSmallDTOMapsIdTitleCreatedAt() {
        ConversationEntity entity = buildEntity(false);

        ConversationMiniDTO mini = mapper.toSmallDTO(entity);

        assertThat(mini.getId()).isEqualTo(1L);
        assertThat(mini.getTitle()).isEqualTo("My Chat");
        assertThat(mini.getCreatedAt()).isEqualTo(LocalDateTime.of(2026, 6, 18, 10, 0, 0));
    }

    @Test
    void toSmallDTOReturnsNullForNullEntity() {
        assertThat(mapper.toSmallDTO(null)).isNull();
    }

    // ── toListDTO ─────────────────────────────────────────────────────

    @Test
    void toListDTOMapsExpectedFieldsWithAgent() {
        ConversationEntity entity = buildEntity(true);

        ConversationListDTO list = mapper.toListDTO(entity);

        assertThat(list.getId()).isEqualTo(1L);
        assertThat(list.getTitle()).isEqualTo("My Chat");
        assertThat(list.getAgentId()).isEqualTo(30L);
        assertThat(list.getCurrentModelId()).isEqualTo(20L);
        assertThat(list.getCreatedAt()).isEqualTo(LocalDateTime.of(2026, 6, 18, 10, 0, 0));
        assertThat(list.getUpdatedAt()).isEqualTo(LocalDateTime.of(2026, 6, 18, 11, 0, 0));
    }

    @Test
    void toListDTOSetsAgentIdNullWhenAgentIsNull() {
        ConversationEntity entity = buildEntity(false);

        ConversationListDTO list = mapper.toListDTO(entity);

        assertThat(list.getAgentId()).isNull();
    }

    @Test
    void toListDTOOmitsEmployeeIdField() {
        // ConversationListDTO must NOT expose employeeId — all listed conversations belong
        // to the authenticated employee; the field is redundant and leaks user context.
        var fieldNames = java.util.Arrays.stream(ConversationListDTO.class.getDeclaredFields())
                .map(java.lang.reflect.Field::getName)
                .toList();

        assertThat(fieldNames).doesNotContain("employeeId");
    }

    @Test
    void toListDTOReturnsNullForNullEntity() {
        assertThat(mapper.toListDTO(null)).isNull();
    }

    // ── toEntity ──────────────────────────────────────────────────────

    @Test
    void toEntityMapsTitleFromForm() {
        ConversationForm form = new ConversationForm("Project Assistant", 20L, null);

        ConversationEntity entity = mapper.toEntity(form);

        assertThat(entity.getTitle()).isEqualTo("Project Assistant");
    }

    @Test
    void toEntityWithNullTitlePassesThroughNull() {
        // Service is responsible for defaulting null/blank title to "New Conversation".
        // The mapper should pass null through without defaulting.
        ConversationForm form = new ConversationForm(null, 20L, null);

        ConversationEntity entity = mapper.toEntity(form);

        assertThat(entity.getTitle()).isNull();
    }

    @Test
    void toEntityDoesNotSetFkFields() {
        ConversationForm form = new ConversationForm("Chat", 20L, 30L);

        ConversationEntity entity = mapper.toEntity(form);

        // employee, agent, currentModel are never set by the mapper —
        // ConversationService sets them from JWT principal and validated lookups
        assertThat(entity.getEmployee()).isNull();
        assertThat(entity.getAgent()).isNull();
        assertThat(entity.getCurrentModel()).isNull();
    }

    @Test
    void toEntityReturnsNullForNullForm() {
        assertThat(mapper.toEntity(null)).isNull();
    }
}
```

#### Edge Cases

1. **`LlmModelEntity.setId(Long)` availability:** `LlmModelEntity` uses `@Getter @Setter` from Lombok, so `setId()` is available directly. `AgentEntity` also uses `@Getter @Setter`. `EmployeeEntity` inherits `@Getter @Setter` from `BaseUserEntity`.
2. **`buildEntity(true)` proxy simulation:** The agent is set via `agent.setId(30L)` — this is a plain POJO (no Hibernate proxy), which is valid for unit tests. The Hibernate proxy safety in production is verified in `ConversationMapperIntegrationTest` (Step 7.5).
3. **`toListDTOOmitsEmployeeIdField` reflection approach:** Same pattern as `AgentMapperTest.toListDTOOmitsPromptFields`. Checking `getDeclaredFields()` is more reliable than asserting getter absence — Lombok generates getters only for declared fields.
4. **`@ExtendWith(MockitoExtension.class)` with no mocks:** No Mockito mocks are needed for mapper unit tests — `ConversationMapper` has no dependencies. The `@ExtendWith` is kept for consistency with the existing mapper test convention.

---

### Step 6: Create DTOs and Forms (Phase 2, Step 2.2)

**Goal:** Define the API input/output contracts. After this step, the mapper tests can reference these classes.

**Dependencies:** `ConversationEntity` must exist (Step 2), `AgentEntity` must exist (precondition).

- [x] Create `ConversationForm.java`
- [x] Create `ConversationModelSwitchForm.java`
- [x] Create `ConversationTitleForm.java`
- [x] Create `ConversationDTO.java`
- [x] Create `ConversationMiniDTO.java`
- [x] Create `ConversationListDTO.java`

#### Implementation

**ConversationForm.java** — Input contract for `POST /conversation`. `title` is nullable (service defaults); `modelId` and `agentId` reference IDs that the service resolves to entities.

```java
package com.agentForgeBackend.models.conversation;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ConversationForm {

    private String title;  // nullable — service defaults to "New Conversation" if blank or null

    @NotNull
    private Long modelId;

    private Long agentId;  // nullable — null = general conversation, non-null = agent conversation
    // employee is never accepted from the caller — ConversationService derives it from the JWT principal
}
```

**ConversationModelSwitchForm.java** — Request body for `PATCH /conversation/{id}/model`.

```java
package com.agentForgeBackend.models.conversation;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ConversationModelSwitchForm {

    @NotNull
    private Long modelId;
}
```

**ConversationTitleForm.java** — Request body for `PATCH /conversation/{id}/title`.

```java
package com.agentForgeBackend.models.conversation;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ConversationTitleForm {

    @NotBlank
    private String title;
}
```

**ConversationDTO.java** — Full detail view returned by `getOne`, `delete`.

```java
package com.agentForgeBackend.models.conversation;

import lombok.*;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ConversationDTO {
    private Long id;
    private String title;
    private Long employeeId;
    private Long agentId;  // nullable — null for general conversations
    private Long currentModelId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```

**ConversationMiniDTO.java** — Compact insert response returned by `insert`.

```java
package com.agentForgeBackend.models.conversation;

import lombok.*;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ConversationMiniDTO {
    private Long id;
    private String title;
    private LocalDateTime createdAt;
}
```

**ConversationListDTO.java** — List row view returned by `getListPage`. `employeeId` intentionally omitted.

```java
package com.agentForgeBackend.models.conversation;

import lombok.*;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ConversationListDTO {
    private Long id;
    private String title;
    private Long agentId;  // nullable — null for general conversations
    private Long currentModelId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    // employeeId intentionally omitted — all listed conversations belong to the authenticated employee
}
```

#### Edge Cases

1. **`@AllArgsConstructor` on `ConversationForm`:** The three-argument constructor is used by `ConversationMapperTest` with `new ConversationForm(title, modelId, agentId)`. Without `@AllArgsConstructor`, the test will not compile.
2. **`agentId` as `Long` (nullable) in DTOs:** Java's `Long` (boxed) can hold `null`; primitive `long` cannot. All DTO fields that represent nullable FKs must use boxed `Long`.
3. **`ConversationModelSwitchForm` and `ConversationTitleForm` are in the domain package:** They are part of the domain contract, not controller-only classes. Task 3's `ConversationController` imports them from `models/conversation/`.
4. **No `@Builder` on forms:** Forms use `@Data @AllArgsConstructor @NoArgsConstructor` (same as `AgentForm`). DTOs use `@Builder` for fluent construction in mapper code.

---

### Step 7: Create ConversationMapper (Phase 2, Step 2.3)

**Goal:** Implement the four mapping methods with null-safety for the `agent` FK. After this step, `ConversationMapperTest` compiles and all mapper tests pass.

**Dependencies:** All DTOs and forms must exist (Step 6). `ConversationEntity` must exist (Step 2).

- [x] Create `ConversationMapper.java` in `backend/src/main/java/com/agentForgeBackend/models/conversation/`

**Why this step is critical:** The mapper is the sole point where entity→DTO conversion happens. The null-safe access to `entity.getAgent()` is a critical contract that differs from `AgentMapper` — failure to null-guard will cause `NullPointerException` on every general conversation fetch.

#### Implementation

```java
package com.agentForgeBackend.models.conversation;

import com.agentForgeBackend.shared.defaultInterfaces.DefaultMapper;
import org.springframework.stereotype.Component;

@Component
public class ConversationMapper implements DefaultMapper<ConversationDTO, ConversationMiniDTO, ConversationListDTO, ConversationForm, ConversationEntity> {

    @Override
    public ConversationDTO toDTO(ConversationEntity entity) {
        if (entity == null) return null;
        return ConversationDTO.builder()
                .id(entity.getId())
                .title(entity.getTitle())
                // getId() on a Hibernate lazy proxy does not trigger initialization —
                // the FK identifier is stored in the proxy at construction time (Hibernate ORM contract)
                .employeeId(entity.getEmployee().getId())
                // agent is nullable: null agent_id means general conversation
                .agentId(entity.getAgent() != null ? entity.getAgent().getId() : null)
                .currentModelId(entity.getCurrentModel().getId())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    @Override
    public ConversationMiniDTO toSmallDTO(ConversationEntity entity) {
        if (entity == null) return null;
        return ConversationMiniDTO.builder()
                .id(entity.getId())
                .title(entity.getTitle())
                .createdAt(entity.getCreatedAt())
                .build();
    }

    @Override
    public ConversationListDTO toListDTO(ConversationEntity entity) {
        if (entity == null) return null;
        return ConversationListDTO.builder()
                .id(entity.getId())
                .title(entity.getTitle())
                // agent is nullable — same null-safe pattern as toDTO
                .agentId(entity.getAgent() != null ? entity.getAgent().getId() : null)
                .currentModelId(entity.getCurrentModel().getId())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    @Override
    public ConversationEntity toEntity(ConversationForm form) {
        if (form == null) return null;
        ConversationEntity entity = new ConversationEntity();
        entity.setTitle(form.getTitle());
        // employee, agent, and currentModel are intentionally not set here —
        // ConversationService.insert() resolves them from the JWT principal and validated lookups
        return entity;
    }
}
```

#### Edge Cases

1. **`entity.getAgent() != null` check before `getId()`:** When `agent_id` is NULL in the DB, Hibernate sets `entity.getAgent()` to `null` — it does NOT return an uninitialized proxy for a null FK. The null-check is the correct guard. Calling `getId()` on null would throw `NullPointerException`, not `LazyInitializationException`.
2. **`toEntity()` maps only `title`:** `form.getModelId()` and `form.getAgentId()` are IDs that `ConversationService` uses to look up and validate full entities before setting them on the entity. The mapper never performs repository lookups.
3. **`toSmallDTO()` does not access any FK proxy:** `toSmallDTO()` only reads `id`, `title`, `createdAt` — it never touches `employee`, `agent`, or `currentModel`. Safe to call even if all FKs are uninitialized proxies.
4. **`toListDTO()` does not access `employee`:** The `employeeId` field is absent from `ConversationListDTO`, so `entity.getEmployee()` is never called in `toListDTO`. The employee proxy is not accessed.

---

### Step 7.5: Create ConversationMapperIntegrationTest (Hibernate Proxy Regression)

**Goal:** Create a `@DataJpaTest` test that verifies `ConversationMapper.toDTO()` succeeds when `employee` and `currentModel` are Hibernate lazy proxies, and when `agent` is null (general conversation) and when `agent` is a lazy proxy (agent conversation).

**Dependencies:** `ConversationMapper`, `ConversationEntity`, and `ConversationRepository` must all exist (Steps 2, 3, 7).

- [x] Create `ConversationMapperIntegrationTest.java` in `backend/src/test/java/com/agentForgeBackend/models/conversation/`

**Why this step is critical:** The unit test (`ConversationMapperTest`) uses plain POJOs, not Hibernate proxies. This integration test provides the only machine-verifiable evidence that `entity.getEmployee().getId()` and `entity.getCurrentModel().getId()` do not throw `LazyInitializationException` when called on real Hibernate proxies after the session is closed. Without it, a future refactor that accidentally reads a non-key property (e.g., `entity.getCurrentModel().getName()`) would silently introduce a `LazyInitializationException` with no failing test.

#### Implementation

```java
package com.agentForgeBackend.models.conversation;

import com.agentForgeBackend.models.agent.AgentEntity;
import com.agentForgeBackend.models.hq.employee.EmployeeEntity;
import com.agentForgeBackend.models.llm.LlmModelEntity;
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
class ConversationMapperIntegrationTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private ConversationRepository conversationRepository;

    private EmployeeEntity employee;
    private LlmModelEntity model;
    private AgentEntity agent;

    @BeforeEach
    void setUp() {
        entityManager.clear();

        employee = entityManager.persistFlushFind(new EmployeeEntity(
                "Proxy", "Test", "proxy-conv@test.com",
                Set.of(UserRoles.EMPLOYEE), "proxy-conv-test", "password"));

        model = new LlmModelEntity();
        model.setModelId("proxy/test-model");
        model.setName("Proxy Model");
        model.setIsEnabled(true);
        model = entityManager.persistFlushFind(model);

        agent = new AgentEntity();
        agent.setName("Proxy Agent");
        agent.setInitPrompt("Test proxy prompt.");
        agent.setOwner(employee);
        agent = entityManager.persistFlushFind(agent);
    }

    @Test
    void toDTOSucceedsOnHibernateProxiesWithAgent() {
        // Verifies that employee.getId() and currentModel.getId() on lazy proxies do NOT throw
        // LazyInitializationException, and that agent.getId() on a lazy proxy is safe.
        // Hibernate stores FK identifiers inside proxies at construction time (Hibernate ORM contract).
        ConversationMapper mapper = new ConversationMapper();
        ConversationEntity conv = new ConversationEntity();
        conv.setTitle("Proxy Agent Chat");
        conv.setEmployee(employee);
        conv.setAgent(agent);
        conv.setCurrentModel(model);
        conv = entityManager.persistAndFlush(conv);
        entityManager.clear();

        // After clear, findById returns an entity whose employee, agent, currentModel are lazy proxies
        ConversationEntity loaded = conversationRepository.findById(conv.getId()).orElseThrow();

        assertThatCode(() -> mapper.toDTO(loaded)).doesNotThrowAnyException();
        ConversationDTO dto = mapper.toDTO(loaded);
        assertThat(dto.getEmployeeId()).isEqualTo(employee.getId());
        assertThat(dto.getAgentId()).isEqualTo(agent.getId());
        assertThat(dto.getCurrentModelId()).isEqualTo(model.getId());
    }

    @Test
    void toDTOSucceedsOnHibernateProxiesWithNullAgent() {
        // Verifies that null agent FK returns null agentId in DTO without NPE or LazyInitializationException.
        ConversationMapper mapper = new ConversationMapper();
        ConversationEntity conv = new ConversationEntity();
        conv.setTitle("Proxy General Chat");
        conv.setEmployee(employee);
        conv.setAgent(null);
        conv.setCurrentModel(model);
        conv = entityManager.persistAndFlush(conv);
        entityManager.clear();

        ConversationEntity loaded = conversationRepository.findById(conv.getId()).orElseThrow();

        assertThatCode(() -> mapper.toDTO(loaded)).doesNotThrowAnyException();
        ConversationDTO dto = mapper.toDTO(loaded);
        assertThat(dto.getAgentId()).isNull();
        assertThat(dto.getEmployeeId()).isEqualTo(employee.getId());
        assertThat(dto.getCurrentModelId()).isEqualTo(model.getId());
    }
}
```

#### Edge Cases

1. **Why a separate class and not `ConversationRepositoryTest`:** `ConversationMapper` does not exist until Step 7. If `ConversationMapper` were referenced in `ConversationRepositoryTest`, the entire test class (all 9 tests) would fail to compile during Steps 1–4. A separate class isolates the dependency — same rationale as `AgentMapperIntegrationTest`.
2. **`entityManager.clear()` after `@BeforeEach`:** Ensures the persistence context starts clean for each test. After `persistFlushFind(employee)`, the returned `employee` has a populated `id` that is used to assert `dto.getEmployeeId()`.

---

### Step 8: Run Mapper Tests → GREEN

**Goal:** All mapper unit tests (14) and mapper integration tests (2) pass.

**Dependencies:** Steps 5, 6, 7, 7.5 complete.

- [x] From `backend/`: run `./mvnw test -Dtest=ConversationMapperTest`
- [x] Confirm 13 tests pass, 0 failures (Task document spec says 14 but code defines 13)
- [x] From `backend/`: run `./mvnw test -Dtest=ConversationMapperIntegrationTest`
- [x] Confirm 2 tests pass, 0 failures

**Why this step is critical:** Green mapper tests confirm the DTO field contracts, null-safety for `agentId`, the `ConversationListDTO` field exclusion, and the Hibernate proxy safety contract.

#### Edge Cases

1. **`ConversationMapperTest` has no `@SpringBootTest`:** It is a pure unit test. No database, no HTTP, no Spring context. Run time is under 1 second.
2. **`ConversationMapperIntegrationTest` requires `@DataJpaTest` context:** It starts H2 and Hibernate. Run time is similar to `ConversationRepositoryTest`.

---

### Step 9: Compile to Generate QConversationEntity (Phase 2, Step 2.5)

**Goal:** Run the full Maven compile to trigger QueryDSL APT and generate `QConversationEntity.java`. `ConversationQueryProfile` in Task 3 imports `QConversationEntity` — this class must exist before Task 3 begins.

**Dependencies:** `ConversationEntity` must exist (Step 2).

- [x] From `backend/`: run `./mvnw compile`
- [x] Verify no compilation errors
- [x] Verify `QConversationEntity.java` was generated in `backend/target/generated-sources/annotations/com/agentForgeBackend/models/conversation/`

**Why this step is critical:** `querydsl-apt` generates Q-classes at compile time by scanning `@Entity`-annotated classes. `QConversationEntity` exposes QueryDSL path expressions for all entity fields, including `QConversationEntity.conversationEntity.employee.id` (ownership predicate in `ConversationService`) and `QConversationEntity.conversationEntity.agent.id` (agentId filter in `ConversationQueryProfile`). Without the Q-class, Task 3 cannot compile.

#### Edge Cases

1. **`mvnw` is inside `backend/`:** Run `./mvnw compile` from the `backend/` directory. There is no `mvnw` at the project root.
2. **Stale Q-classes:** If `ConversationEntity` fields are changed after this step, a recompile is required. The QueryDSL APT processor runs automatically on every `compile` invocation.
3. **`QConversationEntity` location:** The generated file appears under `backend/target/generated-sources/annotations/`. IDEs may need `target/generated-sources/annotations` marked as a "Generated Sources Root" to recognize it.

---

### Step 10: Run Full Test Suite (Regression Check)

**Goal:** Confirm Task 2 changes do not break any pre-existing tests.

**Dependencies:** Steps 1–9 complete.

- [x] From `backend/`: run `./mvnw test`
- [x] Confirm `ConversationRepositoryTest` passes with 9 tests
- [x] Confirm `ConversationMapperTest` passes with 13 tests
- [x] Confirm `ConversationMapperIntegrationTest` passes with 2 tests
- [x] Confirm `LlmModelRepositoryTest` passes with all original tests + 2 new tests
- [x] Confirm all previously passing test classes still pass (0 new failures)
- [x] Note: the pre-existing `authServerApplicationTests.contextLoads` Docker error is expected if Docker Compose is not running — it is not caused by this task

**Why this step is critical:** A new `@Entity` class (`ConversationEntity`) causes Hibernate to generate a new `conversation` table via `ddl-auto=update` in production and `create-drop` in tests. If the entity annotations are incorrect (e.g., a bad FK reference, an invalid column definition), the test infrastructure itself will fail to start, causing all tests to fail. The LlmModelRepository additive change is also global — if `findByIdAndIsEnabledTrue` has a typo or Spring Data cannot resolve it, ALL tests that load the full Spring context will fail at startup.

---

## Design Decisions

**Decision 1: `models/conversation/` as a top-level peer of `models/agent/` and `models/llm/`**
- **Why:** `ConversationEntity` imports `AgentEntity` (FK target) and `LlmModelEntity` (FK target). Placing `ConversationEntity` inside `models/hq/` would create a reverse dependency from the HQ user-management domain to the agent and LLM domains. Top-level placement keeps dependency direction clean: Conversation → Agent/LlmModel/Employee.
- **Alternatives considered:** `models/hq/conversation/` (collocated with employees). Rejected — creates bidirectional coupling between HQ domain and agent/LLM domains.

**Decision 2: `ConversationEntity` does not extend `BaseUserEntity`**
- **Why:** `ConversationEntity` is a resource owned by a user, not a user type. Extending `BaseUserEntity` would put a `conversation` row in `base_user` (JOINED inheritance), giving it a username, email, password, and roles — all nonsensical.
- **Alternatives considered:** None — the feature doc and architecture are clear on this.

**Decision 3: `@OnDelete(SET_NULL)` on `agent` FK — first use in codebase**
- **Why:** Hard-deleting an Agent must not cascade-delete its linked Conversations. Employees must retain their chat history even after retiring an Agent. `@OnDelete(SET_NULL)` generates the `ON DELETE SET NULL` DDL constraint, so H2/PostgreSQL handles the null-out at the database level without requiring JPA cascade configuration. This resolves the deferred constraint noted in `known-issues.md` ("AgentEntity hard delete will violate a FK when ConversationEntity is built").
- **Alternatives considered:** (1) JPA `CascadeType.MERGE` with application-level nulling. Rejected — requires a Hibernate listener or service-layer logic to null the FK before every agent delete, creating invisible coupling between `AgentService` and `ConversationEntity`. (2) Soft-delete on Agent. Rejected — the codebase uses hard deletes throughout; introducing soft-delete for this one case would be inconsistent. (3) `@OnDelete(action = OnDeleteAction.CASCADE)` to delete conversations when agent is deleted. Rejected — employees must not lose their chat history when they delete an agent.

**Decision 4: `findByIdAndEmployeeId(Long, Long)` uses primitive Long, not `EmployeeEntity`**
- **Why:** Same rationale as `AgentRepository.findByIdAndOwnerId` — `AuthUserUtil.getAuthUserEmployeeEntity()` may return a detached entity. Passing a detached entity to Spring Data risks `DetachedObjectException` in some Hibernate versions. Passing only the ID eliminates this risk class entirely.
- **Alternatives considered:** `findByIdAndEmployee(Long id, EmployeeEntity employee)`. Rejected — subtle JPA footgun that works in most cases but not all.

**Decision 5: `LlmModelRepository.findByIdAndIsEnabledTrue` — direct repository injection in ConversationService**
- **Why:** `LlmModelService` methods are all guarded by `@PreAuthorize("hasRole('ADMIN')")`. Calling any `LlmModelService` method under an employee security context would throw `AccessDeniedException` with 403. Direct `LlmModelRepository` injection bypasses the service layer and its ADMIN guard — an acceptable cross-domain read-only lookup.
- **Alternatives considered:** (1) Adding a non-guarded method to `LlmModelService`. Rejected — would expose an admin-only service's data to employees at the service boundary, violating the access control layer design. (2) Calling `llmModelRepository.findById(id)` and checking `isEnabled` in the service. Rejected — more verbose and produces two behaviors (model not found vs. model disabled) that should be collapsed into one `ItemNotFoundException`.

**Decision 6: `ConversationMapper.toEntity(form)` maps `title` only**
- **Why:** `employee`, `agent`, and `currentModel` are FKs that require validated entity lookups in the service. The mapper does not have access to repositories (it is a `@Component`, not a `@Service`). The service performs the lookups and sets the FKs directly on the entity before saving.
- **Alternatives considered:** Passing `LlmModelEntity`, `AgentEntity`, and `EmployeeEntity` as additional arguments to `toEntity()`. Rejected — `DefaultMapper.toEntity(form)` has a fixed signature. Adding extra parameters would break the `DefaultMapper` contract or require a method override outside the interface.

**Decision 7: Two TDD cycles for mapper — unit test class then integration test class**
- **Why:** `ConversationMapper` has no Spring dependencies and can be tested with plain POJOs in a pure unit test (`ConversationMapperTest`). A separate `ConversationMapperIntegrationTest` uses real Hibernate proxies loaded from H2 to verify the `getId()` safety contract. Separating them avoids requiring a full JPA context for the unit tests and isolates the proxy concern.
- **Alternatives considered:** Combining all mapper tests into `ConversationMapperIntegrationTest`. Rejected — the integration test starts H2 and Hibernate (much slower). Unit tests run in milliseconds. Keeping them separate follows the same pattern established by Agent Task 2.

---

## Testing Considerations

### Automatic Validation

- [x] From `backend/`: run `./mvnw test -Dtest=ConversationRepositoryTest` after Steps 1–4 — confirm **9 tests pass**, 0 failures
- [x] From `backend/`: run `./mvnw test -Dtest=LlmModelRepositoryTest` after Step 4.5 — confirm all original tests + **2 new tests pass**, 0 failures (12 total)
- [x] From `backend/`: run `./mvnw test -Dtest=ConversationMapperTest` after Steps 5–8 — confirm **13 tests pass**, 0 failures (Task document spec says 14 but the code defines 13 tests)
- [x] From `backend/`: run `./mvnw test -Dtest=ConversationMapperIntegrationTest` after Step 7.5 — confirm **2 tests pass**
- [x] From `backend/`: run `./mvnw compile` after Step 2 — confirm 0 errors and `QConversationEntity.java` appears in `backend/target/generated-sources/annotations/com/agentForgeBackend/models/conversation/`
- [x] From `backend/`: run `./mvnw test` after Steps 1–9 — confirm **0 new failures** (pre-existing `authServerApplicationTests.contextLoads` Docker error is expected if Docker Compose is not running) — 765 tests, 0 failures, 1 pre-existing error

### Manual Validation

*(No HTTP endpoints are created in this task — no manual HTTP validation is required. HTTP endpoint testing begins in Task 3 once `ConversationController` exists.)*

*(Optional — H2 schema inspection:)* If `onDeleteSetNullClearsAgentFkWhenAgentDeleted` fails, enable H2 trace logging in `application-test.properties` (`spring.jpa.show-sql=true`) and inspect the CREATE TABLE DDL output to confirm `ON DELETE SET NULL` appears on the `agent_id` FK constraint.

---

## Related Code Explanations

- `backend/src/main/java/com/agentForgeBackend/models/agent/AgentEntity.java` — canonical prior art for entity FK pattern (LAZY owner, `@PrePersist`/`@PreUpdate`)
- `backend/src/main/java/com/agentForgeBackend/models/agent/AgentMapper.java` — Hibernate proxy `getId()` comment pattern; null-safe `agentId` extends this pattern with an explicit null-check
- `backend/src/main/java/com/agentForgeBackend/models/agent/AgentRepository.java` — `findByIdAndOwnerId` naming convention for ownership-scoped finders using Long params
- `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelRepository.java` — additive change in Step 4.5: `findByIdAndIsEnabledTrue` added
- `backend/src/main/java/com/agentForgeBackend/models/appSettings/AppSettingsEntity.java` — reference for multi-FK entity pattern (non-user entity with multiple `@ManyToOne` FKs)
- `backend/src/test/java/com/agentForgeBackend/models/agent/AgentRepositoryTest.java` — canonical template for `@DataJpaTest` repository tests, including `ChronoUnit.SECONDS` truncation fix and `Thread.sleep(20)` pattern for `updatedAt` refresh test
- `backend/src/test/java/com/agentForgeBackend/models/agent/AgentMapperIntegrationTest.java` — canonical template for Hibernate proxy regression test using `@DataJpaTest` + `entityManager.clear()`

---

## Completion Criteria

- [x] Parent document reviewed and Task 2 scope reflected accurately
- [x] All skills reviewed and selected
- [x] Hibernate `@OnDelete(SET_NULL)` annotation verified for Spring Boot 3.4.1 / Hibernate 6.x
- [x] `backend/src/main/java/com/agentForgeBackend/models/conversation/` directory created
- [x] `ConversationEntity.java` created — `id`, `title`, `employee` (non-null LAZY FK), `agent` (nullable LAZY FK + `@OnDelete(SET_NULL)`), `currentModel` (non-null LAZY FK), `createdAt`/`updatedAt` with `@PrePersist`/`@PreUpdate`
- [x] `ConversationRepository.java` created — extends `DefaultRepository`, `findByIdAndEmployeeId` using Long parameters
- [x] `ConversationForm.java` created — nullable `title`, `@NotNull` `modelId`, nullable `agentId`; no `employee` field
- [x] `ConversationModelSwitchForm.java` created — `@NotNull` `modelId`
- [x] `ConversationTitleForm.java` created — `@NotBlank` `title`
- [x] `ConversationDTO.java` created — all 7 fields including nullable `agentId`
- [x] `ConversationMiniDTO.java` created — `id`, `title`, `createdAt`
- [x] `ConversationListDTO.java` created — `id`, `title`, nullable `agentId`, `currentModelId`, `createdAt`, `updatedAt`; NO `employeeId`
- [x] `ConversationMapper.java` created — 4 methods; null-safe `agentId` in `toDTO` and `toListDTO`; Hibernate proxy `getId()` comment; `toEntity` maps `title` only
- [x] `LlmModelRepository.java` modified (additive) — `findByIdAndIsEnabledTrue(Long id)` added
- [x] `ConversationRepositoryTest.java` created — 9 tests covering ownership finder, timestamps, nullable agent FK, and `@OnDelete(SET_NULL)` cascade
- [x] `ConversationMapperTest.java` created — 13 tests covering all 4 mapping methods, null-safe `agentId`, `ConversationListDTO` field exclusion (document spec says 14; actual code has 13 tests per the code block in Step 5)
- [x] `ConversationMapperIntegrationTest.java` created — 2 tests verifying Hibernate proxy `getId()` safety for employee, agent, and currentModel FKs
- [x] `LlmModelRepositoryTest.java` modified (additive) — 2 new tests for `findByIdAndIsEnabledTrue`
- [x] `./mvnw test -Dtest=ConversationRepositoryTest` passes with 9 tests
- [x] `./mvnw test -Dtest=ConversationMapperTest` passes with 13 tests
- [x] `./mvnw test -Dtest=ConversationMapperIntegrationTest` passes with 2 tests
- [x] `./mvnw test -Dtest=LlmModelRepositoryTest` passes with all original + 2 new tests (12 total)
- [x] `./mvnw compile` (from `backend/`) generates `QConversationEntity.java` in `target/generated-sources/annotations/com/agentForgeBackend/models/conversation/`
- [x] `./mvnw test` (full suite) passes with 0 new failures — 765 tests, 0 failures, 1 pre-existing Docker error
- [x] Task 3 prerequisite note: `ConversationService.getListPage()` will use `QConversationEntity.conversationEntity.employee.id.eq(...)` — requires `QConversationEntity` from the compile step above
- [x] `known-issues.md` deferred-FK note about AgentEntity hard delete resolved — `@OnDelete(SET_NULL)` is declared on `ConversationEntity.agent`
