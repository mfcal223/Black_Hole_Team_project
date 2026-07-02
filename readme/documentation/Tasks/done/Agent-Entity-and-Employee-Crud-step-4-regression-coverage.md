# Task: Agent Regression and Supplemental Coverage

#task #current #high-complexity #parent-agent-entity-and-employee-crud

**Parent:** [[Agent-Entity-and-Employee-Crud]]
**Parent Type:** Feature
**Related Step(s):** Phase 4 — Steps 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
**Estimated Complexity:** High

---

## Goal

Add the final regression and supplemental test coverage for the employee-owned Agent CRUD slice now that Tasks 1–3 have assembled the full entity → repository → mapper → query profile → service → controller path. This task should primarily change tests, prove the existing production behavior at edge-case boundaries, and run the full backend regression suite before the parent feature is marked complete.

---

## Parent Context

The parent feature adds `AgentEntity`, a personal LLM persona owned by an `EmployeeEntity`. Agents store `initPrompt`, optional `recurrentPrompt`, optional `description`, ownership metadata, and timestamps. Employees can create, list, read, update, and delete only their own agents; Admins and Clients have no Agent management access.

Tasks 1–3 are complete and provide the baseline this task builds on:

- **Task 1 — Security Baseline:** `/agent/**` is protected in `SecurityConfig` with `hasRole("EMPLOYEE")`; `SecurityAuthorizationTest` contains route-level Agent authorization coverage.
- **Task 2 — Domain Foundation:** `AgentEntity`, DTOs, `AgentForm`, `AgentMapper`, `AgentRepository`, repository tests, mapper tests, and `QAgentEntity` generation are in place.
- **Task 3 — Business Rules and CRUD:** `AgentQueryProfile`, `AgentService`, `AgentController`, service tests, controller tests, and the `SecurityAuthorizationTest` forward-reference update are in place. `DefaultServiceImplements.pageableFactory` and `queryPredicateBuilder` are now `protected` to support the Agent ownership-scoped list override.

This Task 4 is the feature's quality gate. The parent explicitly lists supplemental coverage for:

1. Repository edge cases: owner-scoped repository lookups, same-name scoping, and timestamp lifecycle behavior.
2. Mapper contract tests: DTO variants, nullable field handling, `ownerId` mapping through a Hibernate proxy, and list DTO prompt omission.
3. Service business rules: ownership `404`, per-employee name uniqueness, scoped list behavior, blank prompt validation, and owner derivation from the authenticated principal.
4. Controller HTTP contract: all CRUD routes, scoped list, ownership `404`, anonymous `401`, and employee-only authorization.
5. Query profile edge cases: sort by `updatedAt`, filter by `name`, and rejection of non-declared fields such as `initPrompt` and `owner`.
6. Full regression: `./mvnw test` from `backend/` after the supplemental coverage is added.

The parent also makes these constraints non-negotiable:

- Agent ownership violations return `404 Not Found`, not `403`, to avoid leaking resource existence.
- `/agent/**` is employee-only at HTTP security and service method-security layers.
- `POST /agent/list` is always auto-scoped to the authenticated employee.
- `GET /agent` must return `405 Method Not Allowed`; unpaginated `getAll()` is intentionally disabled.
- `AgentService.update()` uses full-state PUT semantics: nullable `description` and `recurrentPrompt` are cleared when `null` is sent.
- Query profile fields are intentionally limited to `id`, `name`, `createdAt`, and `updatedAt`.

---

## Preconditions / Dependencies

- Tasks 1–3 for [[Agent-Entity-and-Employee-Crud]] are complete and their Task documents exist:
  - [[Tasks/current/Agent-Entity-and-Employee-Crud-step-1-security-baseline]]
  - [[Tasks/current/Agent-Entity-and-Employee-Crud-step-2-domain-foundation]]
  - [[Tasks/current/Agent-Entity-and-Employee-Crud-step-3-business-rules-and-crud]]
- Current production Agent files exist under `backend/src/main/java/com/agentForgeBackend/models/agent/`:
  - `AgentEntity.java`
  - `AgentRepository.java`
  - `AgentForm.java`
  - `AgentDTO.java`
  - `AgentMiniDTO.java`
  - `AgentListDTO.java`
  - `AgentMapper.java`
  - `AgentQueryProfile.java`
  - `AgentService.java`
  - `AgentController.java`
- Current Agent test files exist under `backend/src/test/java/com/agentForgeBackend/models/agent/`:
  - `AgentRepositoryTest.java` — 8 tests
  - `AgentMapperTest.java` — 13 tests
  - `AgentMapperIntegrationTest.java` — 1 test
  - `AgentServiceCrudIntegrationTest.java` — 20 tests
  - `AgentControllerTest.java` — 16 tests
- `SecurityAuthorizationTest.java` has 9 tests and already updates the Agent employee path to use a real Employee JWT and assert `200 OK` for `POST /agent/list`.
- `TestAuthenticationHelper` has `initializeMockUsers()`, `initializeEmployeeMockUser()`, `getAdminToken()`, `getClientToken()`, `getEmployeeToken()`, and `getEmployeeUser()`.
- `backend/pom.xml` pins Spring Boot `3.4.1`, Java `21`, Mockito `5.14.2`, Maven Surefire `3.2.5`, and OpenFeign QueryDSL `6.12`.
- All Maven commands must run from `backend/`. There is no root-level `mvnw` wrapper.
- H2 timestamp precision can truncate/round sub-second values. Timestamp assertions must be precision-safe and should compare values read back from the database after flush/clear.
- The known pre-existing `authServerApplicationTests.contextLoads` Docker/PostgreSQL `db` host error may appear during the full suite if Docker Compose is not running. Do not attribute that error to this task unless its signature changes.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `memory-bank` — Selected — all Memory Bank files read. Current focus confirms Task 3 is complete and Task 4 is the remaining Agent feature step.
- `documentation-management` — Selected — documentation system initialized, `doc-config.json` read, Task template reviewed, and destination confirmed as `documentation/Tasks/current/`.
- `solid-deep-design` — Selected — guides keeping this task test-only unless tests reveal a real defect; tests should exercise deep public seams (`AgentService`, `AgentController`, repository contracts) rather than private implementation details.
- `find-docs` — Selected — Context7 documentation consulted for Spring Boot 3.4.1 test annotations, Spring Security 6.4.x test support, and Spring Data JPA derived query behavior.
- `glossary-management` — Selected — terms reviewed: **Agent**, **Employee**, **Ownership Scope**, **Query Profile**, **Generic CRUD Scaffold**.
- `doc-exploration` — Selected — relevant ADRs, Feature, Bug Review, previous Task documents, Backend Model Roadmap, and Frontend Architecture were reviewed.
- `tdd` — Selected — this task uses vertical test increments: one supplemental behavior test or small behavior cluster → run targeted test → fix only if behavior is wrong → repeat.
- `task-reviewer` — Selected for the follow-up quality gate after this Task document is written.

### Documentation Reviewed

- Context7: `/spring-projects/spring-boot/v3.4.1` — verified Spring Boot 3.4.1 testing patterns: `@SpringBootTest`, `@AutoConfigureMockMvc`, `MockMvc`, `@DataJpaTest`, embedded database repository tests, and `TestEntityManager` usage.
- Context7: `/spring-projects/spring-security/6.4.4` — closest available indexed version to project Spring Security 6.4.2; verified `@WithMockUser` and MockMvc authorization testing patterns for authorized, forbidden, and unauthorized paths.
- Context7: `/spring-projects/spring-data-jpa` — verified derived query creation from repository method names and nested property traversal behavior relevant to `findByIdAndOwnerId` / `existsByNameAndOwnerId`.
- `documentation/Features/to-do/Agent-Entity-and-Employee-Crud.md` — parent Feature, especially Phase 4 Steps 4.1–4.6 and Testing Decisions.
- `documentation/Bugs/done/Review-of-Agent-Entity-and-Employee-Crud.md` — pre-implementation review decisions: employee-only HTTP + service security, `getAll()` 405, full-state PUT, owner-id repository methods, ownership predicate combination, Hibernate proxy `getId()` decision, and inherited transaction note.
- `documentation/Docs/Backend-Model-Roadmap.md` — Agent, Conversation, Message, and OpenRouter relationships; Agent prompts are future chat inputs but this feature remains persistence/CRUD only.
- `documentation/Docs/Frontend-Architecture.md` — future `agents/` frontend feature maps to `AgentEntity`; no frontend work belongs in this task.
- ADR inventory checked in full. Relevant ADRs:
  - [[ADRs/ADR-006-nullable-agent-fk-for-conversation-type]] — `AgentEntity` is the nullable FK target for future `ConversationEntity.agent`.
  - [[ADRs/ADR-008-agent-prompts-not-persisted-as-messages]] — `initPrompt` and `recurrentPrompt` live on `AgentEntity`, not persisted messages.
  - [[ADRs/ADR-009-long-primary-key-for-all-entities]] — all JPA entities use `Long` PKs with identity generation.
- Previous Task documents:
  - [[Tasks/current/Agent-Entity-and-Employee-Crud-step-1-security-baseline]]
  - [[Tasks/current/Agent-Entity-and-Employee-Crud-step-2-domain-foundation]]
  - [[Tasks/current/Agent-Entity-and-Employee-Crud-step-3-business-rules-and-crud]]

### Related Existing Code

- `backend/src/main/java/com/agentForgeBackend/models/agent/AgentEntity.java:47-57` — `@PrePersist` / `@PreUpdate` timestamp hooks.
- `backend/src/main/java/com/agentForgeBackend/models/agent/AgentQueryProfile.java:18-27` — only `id`, `name`, `createdAt`, and `updatedAt` are declared; default sort is `createdAt DESC`.
- `backend/src/main/java/com/agentForgeBackend/models/agent/AgentService.java:45-128` — all public methods have `@PreAuthorize("hasRole('EMPLOYEE')")`; `getListPage()` ANDs owner predicate with caller filters; `getAll()` throws 405.
- `backend/src/test/java/com/agentForgeBackend/models/agent/AgentRepositoryTest.java` — add repository timestamp edge coverage here.
- `backend/src/test/java/com/agentForgeBackend/models/agent/AgentMapperIntegrationTest.java` — extend Hibernate proxy coverage here.
- `backend/src/test/java/com/agentForgeBackend/models/agent/AgentServiceCrudIntegrationTest.java` — add service update validation and query edge coverage here.
- `backend/src/test/java/com/agentForgeBackend/models/agent/AgentControllerTest.java` — add HTTP authorization, query-profile rejection, and updatedAt sort coverage here.
- `backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java` — optionally patch stale comments and add real-JWT Admin/Client Agent authorization coverage if not covered elsewhere.
- `backend/src/test/java/com/agentForgeBackend/testUtils/TestAuthenticationHelper.java` — provides real Admin, Client, and Employee JWTs.
- `backend/src/main/java/com/agentForgeBackend/shared/query/PageableRequest.java` — request body shape: `page`, `size`, `sort`, `filters`.
- `backend/src/main/java/com/agentForgeBackend/shared/query/EntityQueryProfile.java:16-32` — unknown query fields raise `InvalidQueryRequestException("Unknown query field '<field>'.")`.
- `backend/src/main/java/com/agentForgeBackend/shared/query/PageableFactory.java:59-69` — sort field validation uses the query profile and rejects unknown/non-sortable fields.
- `backend/src/main/java/com/agentForgeBackend/shared/query/QueryPredicateBuilder.java:51-58` — filter field validation uses the query profile.
- `backend/src/test/java/com/agentForgeBackend/models/llm/LlmModelServiceListQueryIntegrationTest.java` — prior art for timestamp sort acceptance and unknown field rejection at service level.
- `backend/src/test/java/com/agentForgeBackend/models/hq/admin/AdminControllerListEndpointTest.java` — prior art for `400 Invalid Query Request` HTTP JSON shape.

---

## Implementation Details

### Approach

This is a test-hardening task, not a production-feature task. The default expectation is that production code remains unchanged. If a new supplemental test fails, first determine whether the test exposes a legitimate defect in the current Agent behavior or whether the test is over-specified. Only patch production code when the behavior violates the parent Feature, an accepted ADR, or an existing public contract.

**SOLID / deep-design stance:**

- `AgentService` is the main deep module for business rules. Service tests should exercise it through public methods and validate externally visible outcomes: DTOs, exceptions, page content, and method-security behavior.
- `AgentController` is intentionally shallow. Controller tests should verify HTTP routing, serialization, validation, security, and exception mapping, but not duplicate every service implementation detail.
- `AgentRepository` is a Spring Data adapter seam. Repository tests should verify the custom finder contract and JPA lifecycle effects observable through persisted data.
- `AgentMapper` is a DTO conversion module. Mapper tests should verify mapping contracts, null handling, and the Hibernate proxy `getId()` contract that protects `ownerId` mapping.
- `AgentQueryProfile` is a declarative module. The best tests are through the service/controller list interfaces because the profile is only meaningful when consumed by `QueryPredicateBuilder` and `PageableFactory`.

**TDD sequencing:**

Do not add all tests in one horizontal batch. Add and run coverage vertically by file/behavior cluster:

1. Repository timestamp refresh edge.
2. Mapper proxy-outside-transaction edge.
3. Service update validation + method-security edge.
4. Service/controller query profile edge coverage.
5. Controller employee-only/anonymous contract edge coverage.
6. Targeted Agent regression command.
7. Full backend suite.

### Files to Create/Modify

**Modify existing tests:**

- [x] `backend/src/test/java/com/agentForgeBackend/models/agent/AgentRepositoryTest.java` — add a precision-safe test proving `updatedAt` changes on update.
- [x] `backend/src/test/java/com/agentForgeBackend/models/agent/AgentMapperIntegrationTest.java` — keep the existing persisted-agent proxy test; do **not** add the outside-transaction `getReference()` test here because this class has transactional setup. <!-- REVIEW-FIX: Corrected stale checklist target; outside-transaction proxy coverage belongs in AgentMapperProxyReferenceIntegrationTest. -->
- [x] `backend/src/test/java/com/agentForgeBackend/models/agent/AgentServiceCrudIntegrationTest.java` — add update validation tests and service-level query-profile edge tests.
- [x] `backend/src/test/java/com/agentForgeBackend/models/agent/AgentControllerTest.java` — add real-JWT Admin/Client 403 checks, anonymous CRUD checks, `updatedAt` sort check, `owner` filter/sort rejection, and ownership+name-filter leakage guard.
- [x] `backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java` — remove stale Phase 1 comment and optionally add real-JWT Admin/Client Agent checks if those are not placed in `AgentControllerTest`.

**Create new tests if cleaner than mixing security concerns into CRUD tests:**

- [x] `backend/src/test/java/com/agentForgeBackend/models/agent/AgentMapperProxyReferenceIntegrationTest.java` — <!-- REVIEW-FIX: Added separate no-setup class so outside-transaction proxy test is not broken by AgentMapperIntegrationTest's transactional @BeforeEach persistence. -->focused `getReference()` outside-transaction proxy test for `ownerId` mapping.
- [x] `backend/src/test/java/com/agentForgeBackend/models/agent/AgentServiceMethodSecurityIntegrationTest.java` — optional but recommended: focused method-security tests proving non-Employee principals cannot call `AgentService` directly.

**No production files should change unless a supplemental test exposes a real defect.**

---

## Step-by-Step Implementation

### Step 1: Add Repository `updatedAt` Refresh Coverage

**Goal:** Complete Phase 4 Step 4.1 by proving `@PreUpdate` actually refreshes `updatedAt`, not merely that `updatedAt` is non-null after an update.

**Dependencies:** Existing `AgentRepositoryTest` and `AgentEntity.onUpdate()`.

- [x] Open `AgentRepositoryTest.java`.
- [x] Add `import java.time.LocalDateTime;` if needed.
- [x] Add a new test after `preUpdateDoesNotChangeCreatedAt()`.
- [x] Use a short sleep between initial read and update so H2's timestamp precision cannot collapse both values to the same instant.
- [x] Always compare timestamps read from the database after `flush()` / `clear()`.
- [x] Run `./mvnw -Dtest='AgentRepositoryTest' test` from `backend/`.

**Why this step is critical:** `createdAt` immutability is already tested, but the lifecycle contract also requires `updatedAt` to move forward on every save. A non-null assertion would pass even if `@PreUpdate` were accidentally deleted.

#### Implementation

Add this test to `AgentRepositoryTest`:

```java
@Test
void preUpdateRefreshesUpdatedAt() throws InterruptedException {
    AgentEntity agent = entityManager.persistAndFlush(buildAgent("RefreshUpdatedAt", owner));
    entityManager.clear();

    AgentEntity saved = agentRepository.findById(agent.getId()).orElseThrow();
    LocalDateTime originalUpdatedAt = saved.getUpdatedAt();

    // H2 stores timestamps at finite precision. Sleep long enough that @PreUpdate's
    // LocalDateTime.now() is observably after the persisted value on typical CI hosts.
    Thread.sleep(20);

    saved.setName("RefreshUpdatedAt Renamed");
    agentRepository.saveAndFlush(saved);
    entityManager.clear();

    AgentEntity updated = agentRepository.findById(agent.getId()).orElseThrow();

    assertThat(updated.getUpdatedAt()).isAfter(originalUpdatedAt);
}
```

#### Edge Cases

1. **Timestamp precision:** Capture `originalUpdatedAt` from a database-reloaded entity, not directly from the pre-flush in-memory entity. This avoids nanosecond vs microsecond mismatches.
2. **Sleep duration:** `20ms` is intentionally small but enough to avoid same-tick failures in H2. If CI is extremely slow or virtualized, increasing to `50ms` is acceptable; do not add application-level time abstractions for this test.
3. **No assertion on `createdAt` here:** `createdAt` immutability remains covered by `preUpdateDoesNotChangeCreatedAt()`. This new test has one responsibility: `updatedAt` refresh.

---

### Step 2: Add Mapper Proxy Coverage Outside a Transaction

**Goal:** Complete the exact Phase 4 Step 4.2 requirement: verify `AgentMapper.toDTO()` succeeds with `ownerId` mapped through a Hibernate proxy created by `entityManager.getReference()` outside a transaction.

**Dependencies:** Existing `AgentMapper`, `AgentDTO`, `AgentEntity`, `EmployeeEntity`, and Spring Boot `@DataJpaTest` support.

<!-- REVIEW-FIX: Use a new no-setup test class instead of adding a NOT_SUPPORTED test to AgentMapperIntegrationTest. The existing AgentMapperIntegrationTest has a @BeforeEach that persists an employee; that setup may run without a transaction for a NOT_SUPPORTED method and fail before the test body. -->

- [x] Create `AgentMapperProxyReferenceIntegrationTest.java` under `backend/src/test/java/com/agentForgeBackend/models/agent/`.
- [x] Use `@DataJpaTest`, `@ActiveProfiles("test")`, and `@Transactional(propagation = Propagation.NOT_SUPPORTED)` at class level or method level.
- [x] Do **not** add a `@BeforeEach` that persists entities. This test intentionally needs no database row because it only verifies ID access on a reference proxy.
- [x] Construct an `EmployeeEntity` proxy with `entityManager.getReference(EmployeeEntity.class, 42L)` outside a transaction. <!-- REVIEW-FIX: Use raw JPA EntityManager; TestEntityManager helpers are transaction-oriented and unnecessary for this no-setup proxy test. -->
- [x] Construct an `AgentEntity` in memory, set the owner proxy, and call `AgentMapper.toDTO()`.
- [x] Assert no exception and `ownerId == 42L`.
- [x] Run `./mvnw -Dtest='AgentMapperProxyReferenceIntegrationTest' test` from `backend/`.

**Why this step is critical:** The existing proxy test loads a persisted `AgentEntity` inside `@DataJpaTest`'s default transaction. The parent requires a stricter regression guard: an owner proxy created through `getReference()` outside a transaction. That is the exact scenario where accidentally changing `getOwner().getId()` to `getOwner().getUsername()` would become dangerous.

#### Implementation

Create `AgentMapperProxyReferenceIntegrationTest.java`:

```java
package com.agentForgeBackend.models.agent;

import com.agentForgeBackend.models.hq.employee.EmployeeEntity;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

@DataJpaTest
@ActiveProfiles("test")
@Tag("repository")
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class AgentMapperProxyReferenceIntegrationTest {

    @Autowired
    private EntityManager entityManager;

    @Test
    void toDTOSucceedsWithOwnerReferenceOutsideTransaction() {
        AgentMapper agentMapper = new AgentMapper();
        EmployeeEntity ownerReference = entityManager.getReference(EmployeeEntity.class, 42L);

        AgentEntity agent = new AgentEntity();
        agent.setId(101L);
        agent.setName("Reference Agent");
        agent.setDescription("Uses getReference owner proxy.");
        agent.setInitPrompt("You test proxy id access.");
        agent.setRecurrentPrompt(null);
        agent.setOwner(ownerReference);
        agent.setCreatedAt(LocalDateTime.of(2026, 6, 17, 12, 0));
        agent.setUpdatedAt(LocalDateTime.of(2026, 6, 17, 12, 5));

        assertThatCode(() -> agentMapper.toDTO(agent)).doesNotThrowAnyException();

        AgentDTO dto = agentMapper.toDTO(agent);
        assertThat(dto.getOwnerId()).isEqualTo(42L);
    }
}
```

#### Edge Cases

1. **No database row needed for ID-only proxy access:** `getReference(EmployeeEntity.class, 42L)` can return a proxy whose identifier is known without loading a row. Accessing `getId()` is safe; accessing any non-identifier property would initialize the proxy and likely fail outside a transaction.
2. **Why a separate class:** `AgentMapperIntegrationTest` has a `@BeforeEach` that persists an employee. A `Propagation.NOT_SUPPORTED` test in that class can cause setup persistence to run without a transaction. A separate no-setup class avoids that trap entirely.
3. **Why `Propagation.NOT_SUPPORTED`:** `@DataJpaTest` is transactional by default. `NOT_SUPPORTED` suspends the test transaction so this test actually exercises the outside-transaction case.
4. **Do not assert proxy implementation type:** The behavior contract is that `toDTO()` succeeds and maps `ownerId`; asserting `HibernateProxy` would couple the test to Hibernate internals more than necessary.

---

### Step 3: Add Service Update Validation and Method-Security Coverage

**Goal:** Complete Phase 4 Step 4.3 by adding missing service-level edge tests for update validation and defense-in-depth method security.

**Dependencies:** Existing `AgentServiceCrudIntegrationTest`, `AgentServiceMethodSecurityIntegrationTest` optional new class, Spring Security method security already enabled.

#### Step 3A: Update validation in `AgentServiceCrudIntegrationTest`

- [x] Open `AgentServiceCrudIntegrationTest.java`.
- [x] Add tests near the existing update tests:
  - `updateThrowsInvalidInsertDetailsForBlankName()`
  - `updateThrowsInvalidInsertDetailsForBlankInitPrompt()`
- [x] Run `./mvnw -Dtest='AgentServiceCrudIntegrationTest' test`.

##### Implementation

```java
@Test
void updateThrowsInvalidInsertDetailsForBlankName() throws Exception {
    agentService.insert(new AgentForm("Valid Agent", null, "Prompt.", null));
    Long id = agentRepository.findAll().get(0).getId();

    assertThatThrownBy(() -> agentService.update(id, new AgentForm("", null, "Prompt.", null)))
            .isInstanceOf(InvalidInsertDetails.class)
            .hasMessageContaining("name");
}

@Test
void updateThrowsInvalidInsertDetailsForBlankInitPrompt() throws Exception {
    agentService.insert(new AgentForm("Valid Agent", null, "Prompt.", null));
    Long id = agentRepository.findAll().get(0).getId();

    assertThatThrownBy(() -> agentService.update(id, new AgentForm("Valid Agent", null, "", null)))
            .isInstanceOf(InvalidInsertDetails.class)
            .hasMessageContaining("initPrompt");
}
```

##### Edge Cases

1. **Service tests bypass `@Valid`:** Controller tests already prove request validation. These service tests prove the direct service guard remains in place for non-controller callers.
2. **Update should fail before ownership lookup side effects matter:** The current implementation validates form fields before loading the current employee. This is acceptable and keeps invalid forms cheap to reject.

#### Step 3B: Method security in a focused new test class

- [x] Create `AgentServiceMethodSecurityIntegrationTest.java` under `backend/src/test/java/com/agentForgeBackend/models/agent/`.
- [x] Use `@SpringBootTest` and `@ActiveProfiles("test")`.
- [x] Do not seed database rows; `@PreAuthorize` should deny non-Employee principals before business logic resolves the current employee.
- [x] Add Admin and Client denial tests.
- [x] Run `./mvnw -Dtest='AgentServiceMethodSecurityIntegrationTest' test`.

##### Implementation

```java
package com.agentForgeBackend.models.agent;

import com.agentForgeBackend.shared.query.PageableRequest;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Tag("service")
class AgentServiceMethodSecurityIntegrationTest {

    @Autowired
    private AgentService agentService;

    @Test
    @WithMockUser(username = "admin-denied@test.com", roles = "ADMIN")
    void adminCannotInvokeAgentServiceInsert() {
        assertThatThrownBy(() -> agentService.insert(
                new AgentForm("Admin Agent", null, "Prompt.", null)))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @WithMockUser(username = "client-denied@test.com", roles = "CLIENT")
    void clientCannotInvokeAgentServiceList() {
        assertThatThrownBy(() -> agentService.getListPage(new PageableRequest()))
                .isInstanceOf(AccessDeniedException.class);
    }
}
```

##### Edge Cases

1. **No DB seeding needed:** If the test starts hitting `AuthUserUtil`, then `@PreAuthorize` is not firing soon enough. The expected exception is `AccessDeniedException`.
2. **Class-level Employee mock avoided:** Keeping method-security tests in a separate class avoids ambiguity with the class-level `@WithMockUser` on `AgentServiceCrudIntegrationTest`.

---

### Step 4: Add Service Query Profile Edge Coverage

**Goal:** Complete the service-level portion of Phase 4 Steps 4.3 and 4.5: prove name filters stay owner-scoped, `updatedAt` sorting is accepted, and non-declared fields such as `owner` are rejected.

**Dependencies:** Existing `AgentServiceCrudIntegrationTest`, `AgentQueryProfile`, `PageableRequest`, shared query DTOs.

- [x] Replace `import com.agentForgeBackend.shared.query.PageableRequest;` with `import com.agentForgeBackend.shared.query.*;` in `AgentServiceCrudIntegrationTest.java`.
- [x] Add `import com.agentForgeBackend.exceptions.InvalidQueryRequestException;`.
- [x] Add `import java.util.List;`.
- [x] Add helper methods if desired for building query requests.
- [x] Add tests under the `getListPage` section.
- [x] Run `./mvnw -Dtest='AgentServiceCrudIntegrationTest' test`.

#### Implementation

Add these tests to `AgentServiceCrudIntegrationTest`:

```java
@Test
void getListPageNameFilterRemainsOwnerScoped() throws Exception {
    agentService.insert(new AgentForm("Code Reviewer", null, "Prompt.", null));
    agentService.insert(new AgentForm("Marketing Writer", null, "Prompt.", null));

    EmployeeEntity otherEmployee = employeeRepository.saveAndFlush(new EmployeeEntity(
            "Other", "Filter", "other-filter@test.com",
            Set.of(UserRoles.EMPLOYEE), "other-filter@test.com", "encodedPass"));
    AgentEntity otherAgent = new AgentEntity();
    otherAgent.setName("Code Reviewer Other Owner");
    otherAgent.setInitPrompt("Other prompt.");
    otherAgent.setOwner(otherEmployee);
    agentRepository.saveAndFlush(otherAgent);

    PageableRequest request = new PageableRequest();
    request.setFilters(List.of(FilterRequest.builder()
            .field("name")
            .operations(List.of(FilterOperationRequest.builder()
                    .operator(FilterOperator.CONTAINS)
                    .value("Code")
                    .build()))
            .build()));

    var page = agentService.getListPage(request);

    assertThat(page.getTotalElements()).isEqualTo(1);
    assertThat(page.getContent()).extracting(AgentListDTO::getName)
            .containsExactly("Code Reviewer");
}

@Test
void getListPageSortByUpdatedAtDoesNotThrowAndRemainsScoped() throws Exception {
    agentService.insert(new AgentForm("First", null, "Prompt.", null));
    agentService.insert(new AgentForm("Second", null, "Prompt.", null));

    EmployeeEntity otherEmployee = employeeRepository.saveAndFlush(new EmployeeEntity(
            "Other", "UpdatedSort", "other-updated-sort@test.com",
            Set.of(UserRoles.EMPLOYEE), "other-updated-sort@test.com", "encodedPass"));
    AgentEntity otherAgent = new AgentEntity();
    otherAgent.setName("Other Updated Sort");
    otherAgent.setInitPrompt("Other prompt.");
    otherAgent.setOwner(otherEmployee);
    agentRepository.saveAndFlush(otherAgent);

    PageableRequest request = new PageableRequest();
    request.setSort(List.of(SortRequest.builder()
            .field("updatedAt")
            .direction(SortDirection.DESC)
            .build()));

    var page = agentService.getListPage(request);

    assertThat(page.getTotalElements()).isEqualTo(2);
    assertThat(page.getContent()).extracting(AgentListDTO::getName)
            .containsOnly("First", "Second");
}

@Test
void getListPageRejectsOwnerFilterField() {
    PageableRequest request = new PageableRequest();
    request.setFilters(List.of(FilterRequest.builder()
            .field("owner")
            .operations(List.of(FilterOperationRequest.builder()
                    .operator(FilterOperator.EQUALS)
                    .value(ownerEmployee.getId())
                    .build()))
            .build()));

    assertThatThrownBy(() -> agentService.getListPage(request))
            .isInstanceOf(InvalidQueryRequestException.class)
            .hasMessage("Unknown query field 'owner'.");
}

@Test
void getListPageRejectsOwnerSortField() {
    PageableRequest request = new PageableRequest();
    request.setSort(List.of(SortRequest.builder()
            .field("owner")
            .direction(SortDirection.ASC)
            .build()));

    assertThatThrownBy(() -> agentService.getListPage(request))
            .isInstanceOf(InvalidQueryRequestException.class)
            .hasMessage("Unknown query field 'owner'.");
}
```

#### Edge Cases

1. **Do not assert exact `updatedAt` order unless deliberately changing timestamps:** Existing prior art (`LlmModelServiceListQueryIntegrationTest`) accepts timestamp sort fields by asserting correct count and no exception because fast inserts may tie at H2 precision.
2. **`owner` must remain undeclared:** Ownership scoping is internal to `AgentService`. Allowing callers to filter/sort by `owner` would expose an internal FK and invite cross-employee probing.
3. **Name filter plus ownership:** The important behavior is not merely `name CONTAINS`; it is `name CONTAINS AND owner = currentEmployee`.

---

### Step 5: Add Controller HTTP Contract and Query Edge Coverage

**Goal:** Complete Phase 4 Steps 4.4 and 4.5 at the HTTP boundary: real JWT role denial, anonymous CRUD denial, `updatedAt` sort, owner-field rejection, and ownership-preserving name filters.

**Dependencies:** Existing `AgentControllerTest`, `TestAuthenticationHelper`, `AgentRepository`, `EmployeeRepository`.

- [x] Open `AgentControllerTest.java`.
- [x] Inject `AdminRepository`, `ClientRepository`, and `AppSettingsRepository` if real Admin/Client JWTs are added in this class.
- [x] Update `setUp()` to clear `AppSettingsEntity.updatedBy` before deleting Admin rows. <!-- REVIEW-FIX: AppSettings.updatedBy has an FK to AdminEntity; deleting admins without clearing it can cause FK violations after AppSettings tests run. -->
- [x] Update `setUp()` to delete all role-specific users before calling both `authHelper.initializeMockUsers()` and `authHelper.initializeEmployeeMockUser()`.
- [x] Keep the delete order FK-safe: clear AppSettings updatedBy, then delete agents before employees, and delete Admin rows only after AppSettings no longer references them.
- [x] Add tests near the relevant sections.
- [x] Run `./mvnw -Dtest='AgentControllerTest' test`.

#### Implementation

Add imports:

```java
import com.agentForgeBackend.models.appSettings.AppSettingsRepository;
import com.agentForgeBackend.models.hq.admin.AdminRepository;
import com.agentForgeBackend.models.hq.client.ClientRepository;
```

Add fields:

```java
@Autowired private AppSettingsRepository appSettingsRepository;
@Autowired private AdminRepository adminRepository;
@Autowired private ClientRepository clientRepository;
```

Update `setUp()`:

```java
@BeforeEach
void setUp() {
    // AppSettingsEntity.updatedBy is an FK to AdminEntity. Clear it before deleting admins.
    appSettingsRepository.findFirstBy().ifPresent(settings -> {
        settings.setUpdatedBy(null);
        appSettingsRepository.saveAndFlush(settings);
    });

    clientRepository.deleteAll();
    clientRepository.flush();
    adminRepository.deleteAll();
    adminRepository.flush();
    agentRepository.deleteAll();
    agentRepository.flush();
    employeeRepository.deleteAll();
    employeeRepository.flush();

    authHelper.initializeMockUsers();        // admin + client JWTs
    authHelper.initializeEmployeeMockUser(); // employee JWT + user reference
}
```

Add role-denial tests:

```java
@Test
void adminJwtRequestToAgentListReturns403() throws Exception {
    mockMvc.perform(post("/agent/list")
                    .header("Authorization", authHelper.getAdminToken())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{}"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error").value("Forbidden"));
}

@Test
void clientJwtRequestToAgentListReturns403() throws Exception {
    mockMvc.perform(post("/agent/list")
                    .header("Authorization", authHelper.getClientToken())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{}"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error").value("Forbidden"));
}
```

Add anonymous CRUD-route coverage:

```java
@Test
void anonymousCrudRoutesReturn401() throws Exception {
    mockMvc.perform(post("/agent")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                            { "name": "Anonymous", "initPrompt": "Prompt." }
                            """))
            .andExpect(status().isUnauthorized());

    mockMvc.perform(get("/agent/1"))
            .andExpect(status().isUnauthorized());

    mockMvc.perform(put("/agent/1")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                            { "name": "Anonymous", "initPrompt": "Prompt." }
                            """))
            .andExpect(status().isUnauthorized());

    mockMvc.perform(delete("/agent/1"))
            .andExpect(status().isUnauthorized());
}
```

Add ownership-preserving name filter coverage:

```java
@Test
void listWithNameFilterDoesNotLeakOtherOwnerMatchingAgent() throws Exception {
    saveAgentForEmployee(authHelper.getEmployeeUser(), "Code Reviewer", null, "Prompt.", null);
    saveAgentForEmployee(authHelper.getEmployeeUser(), "Marketing Writer", null, "Prompt.", null);
    EmployeeEntity other = createOtherEmployee("other-ctrl-filter@test.com");
    saveAgentForEmployee(other, "Code Reviewer Other Owner", null, "Other prompt.", null);

    mockMvc.perform(post("/agent/list")
                    .header("Authorization", authHelper.getEmployeeToken())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                            {
                              "filters": [{
                                "field": "name",
                                "operations": [{ "operator": "CONTAINS", "value": "Code" }]
                              }]
                            }
                            """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalElements").value(1))
            .andExpect(jsonPath("$.content[0].name").value("Code Reviewer"));
}
```

Add `updatedAt` sort and owner rejection coverage:

```java
@Test
void listWithUpdatedAtSortReturns200() throws Exception {
    saveAgentForEmployee(authHelper.getEmployeeUser(), "First", null, "Prompt.", null);
    saveAgentForEmployee(authHelper.getEmployeeUser(), "Second", null, "Prompt.", null);

    mockMvc.perform(post("/agent/list")
                    .header("Authorization", authHelper.getEmployeeToken())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                            {
                              "sort": [ { "field": "updatedAt", "direction": "DESC" } ]
                            }
                            """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalElements").value(2));
}

@Test
void listWithOwnerFilterReturnsBadRequest() throws Exception {
    mockMvc.perform(post("/agent/list")
                    .header("Authorization", authHelper.getEmployeeToken())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                            {
                              "filters": [{
                                "field": "owner",
                                "operations": [{ "operator": "EQUALS", "value": 1 }]
                              }]
                            }
                            """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.status").value(400))
            .andExpect(jsonPath("$.error").value("Invalid Query Request"))
            .andExpect(jsonPath("$.message").value("Unknown query field 'owner'."));
}

@Test
void listWithOwnerSortReturnsBadRequest() throws Exception {
    mockMvc.perform(post("/agent/list")
                    .header("Authorization", authHelper.getEmployeeToken())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                            {
                              "sort": [ { "field": "owner", "direction": "ASC" } ]
                            }
                            """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.status").value(400))
            .andExpect(jsonPath("$.error").value("Invalid Query Request"))
            .andExpect(jsonPath("$.message").value("Unknown query field 'owner'."));
}
```

#### Edge Cases

1. **Initializing Admin/Client tokens:** `authHelper.getAdminToken()` and `getClientToken()` require `initializeMockUsers()`. If this is called, `setUp()` must also clean Admin and Client rows to avoid uniqueness collisions.
2. **AppSettings FK cleanup:** `AppSettingsEntity.updatedBy` references `AdminEntity`. Clear `updatedBy` before `adminRepository.deleteAll()` or this test can fail after AppSettings tests run in the same suite. <!-- REVIEW-FIX: Added AppSettings FK cleanup risk. -->
3. **Delete order:** Delete agents before employees because `agent.owner_id` is a non-null FK.
4. **403 before query validation:** Admin/Client role-denial tests should send valid `{}` bodies so any failure is authorization-related, not malformed-request-related.
5. **Anonymous before validation:** Anonymous CRUD tests should still provide valid-looking bodies for POST/PUT so Spring Security is the first meaningful gate.
6. **Do not expose `owner`:** Both filter and sort rejection are important because `QueryPredicateBuilder` validates filters and `PageableFactory` validates sorts via separate code paths.

---

### Step 6: Patch Stale SecurityAuthorizationTest Comment and Add Route-Level Regression If Needed

**Goal:** Keep the security-matrix test documentation accurate after Task 3 and avoid future confusion about `@WithMockUser` vs real JWTs.

**Dependencies:** Existing `SecurityAuthorizationTest.java`.

- [x] Open `SecurityAuthorizationTest.java`.
- [x] Replace the stale comment at lines 134–136 that says Agent security tests use `@WithMockUser` because `AgentController` does not exist.
- [x] If Admin/Client real-JWT route denial is not added in `AgentControllerTest`, add it here instead.
- [x] Run `./mvnw -Dtest='SecurityAuthorizationTest' test`.

#### Implementation

Replace the stale comment with:

```java
// Agent security tests — Task 1 used @WithMockUser before AgentController existed.
// Task 3 switched the Employee positive path to a real JWT and 200 OK.
// Admin denial still uses @WithMockUser as a focused role-matrix check; controller tests cover real JWTs.
```

If adding real JWT denial here instead of in `AgentControllerTest`, use:

```java
@Test
void clientJwtRequestToAgentEndpointReturns403() throws Exception {
    mockMvc.perform(post("/agent/list")
            .header("Authorization", authHelper.getClientToken())
            .contentType(MediaType.APPLICATION_JSON)
            .content("{}"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.error").value("Forbidden"));
}
```

#### Edge Cases

1. **Avoid duplicate identical tests:** If real-JWT Admin/Client denial exists in `AgentControllerTest`, do not duplicate both in `SecurityAuthorizationTest`; the comment patch is still worth doing.
2. **Keep one role-matrix test lightweight:** The current Admin `@WithMockUser` test is still useful because it directly tests `hasRole("EMPLOYEE")` behavior without token setup.

---

### Step 7: Run Targeted Agent and Security Regression

**Goal:** Verify all Agent tests and related security tests pass together before running the full suite.

**Dependencies:** Steps 1–6 complete.

- [x] From `backend/`, run:

```bash
./mvnw -Dtest='AgentRepositoryTest,AgentMapperTest,AgentMapperIntegrationTest,AgentMapperProxyReferenceIntegrationTest,AgentServiceCrudIntegrationTest,AgentServiceMethodSecurityIntegrationTest,AgentControllerTest,SecurityAuthorizationTest' test
```

- [x] If `AgentServiceMethodSecurityIntegrationTest` was not created, remove it from the `-Dtest` list.
- [x] Confirm all Agent/security tests pass.
- [x] Confirm expected count increases match the tests actually added.

**Why this step is critical:** Running all Agent and security tests together catches shared H2 state, repository cleanup, unique constraint, method-security, and FK-order issues that may not appear when tests are run individually.

#### Edge Cases

1. **Maven wildcard quoting:** Keep the `-Dtest='A,B,C'` value quoted in the shell so commas are not interpreted by the shell.
2. **If a test class name is absent:** Surefire fails when an explicitly named test does not exist. Remove optional classes from the command if not created.

---

### Step 8: Run Full Backend Regression Suite

**Goal:** Complete Phase 4 Step 4.6 and prove the Agent supplemental coverage does not regress Admin, Employee, Client, LlmModel, AppSettings, security, or shared query behavior.

**Dependencies:** Step 7 complete.

- [x] From `backend/`, run:

```bash
./mvnw test
```

- [x] Confirm all default Surefire tests pass except the known pre-existing Docker/PostgreSQL `authServerApplicationTests.contextLoads` error if Docker Compose is not running.
- [x] Record the final test counts in the implementation summary.
- [x] If a failure appears outside `authServerApplicationTests.contextLoads`, treat it as a real regression and fix before completing the task.

#### Edge Cases

1. **Known Docker blocker signature:** The known error comes from `authServerApplicationTests.contextLoads` trying to connect to PostgreSQL host `db` without `@ActiveProfiles("test")`. If a different test fails or the error message changes, investigate.
2. **Suite tests excluded:** `backend/pom.xml` excludes `**/*SuiteTest.java` from default Surefire runs. Do not add new suite assumptions here.

---

## Design Decisions

**Decision 1: Keep Task 4 primarily test-only**
- **Why:** Tasks 1–3 already implemented production behavior. Task 4 is a regression and supplemental coverage gate. Production changes are only justified if a new test reveals a violation of the parent Feature or accepted ADRs.
- **Alternatives considered:** Refactor AgentService or query infrastructure while adding tests. Rejected — would expand scope and increase regression risk at the final quality gate.

**Decision 2: Add query-profile edge tests through service/controller seams instead of testing `AgentQueryProfile.fields()` directly**
- **Why:** The public behavior is not the map itself; it is how `QueryPredicateBuilder`, `PageableFactory`, and `AgentService.getListPage()` use the profile to accept or reject user requests while enforcing ownership. Service/controller tests exercise the real seam and survive internal refactors.
- **Alternatives considered:** Unit-test `AgentQueryProfile.fields().containsKey("updatedAt")`. Rejected — shallow implementation detail test with low leverage.

**Decision 3: Use a focused method-security test class for non-Employee service callers**
- **Why:** `AgentServiceCrudIntegrationTest` has class-level `@WithMockUser(... roles = "EMPLOYEE")` because most tests need an employee principal. A separate `AgentServiceMethodSecurityIntegrationTest` avoids annotation override ambiguity and keeps security-specific tests readable.
- **Alternatives considered:** Add method-level `@WithMockUser(roles = "ADMIN")` into the existing service test class. Acceptable but less clear.

**Decision 4: Use real JWTs for HTTP role-denial tests where practical**
- **Why:** Task 3 introduced `AgentController`; HTTP contract tests can now exercise the actual JWT filter, token authorities, route authorization, and exception handler shape. This complements the lighter `@WithMockUser` role-matrix test in `SecurityAuthorizationTest`.
- **Alternatives considered:** Keep all HTTP role-denial tests on `@WithMockUser`. Rejected for Task 4 supplemental coverage because the controller and JWT helper now exist.

**Decision 5: Assert `updatedAt` sort acceptance and scoping, not exact order**
- **Why:** H2 timestamp precision can make rapidly inserted rows tie. The important contract is that `updatedAt` is declared sortable and the resulting page remains owner-scoped. Exact ordering should only be asserted when timestamps are deliberately separated and read back safely.
- **Alternatives considered:** Force ordering with sleeps between multiple inserts and assert exact order. Rejected as unnecessary; it increases test runtime and flakiness for little extra confidence.

**Decision 6: Patch stale comments as part of regression coverage**
- **Why:** `SecurityAuthorizationTest` still contains a Phase 1-era comment saying AgentController does not exist. That is false after Task 3 and can mislead future maintainers. Comment correction is in scope because Task 4 is the final documentation/coverage cleanup step before marking the feature done.
- **Alternatives considered:** Leave comments unchanged because tests pass. Rejected — stale comments are low-cost technical debt and contradict the current test behavior.

---

## Testing Considerations

### Automatic Validation

Run commands from `backend/` unless noted otherwise.

- [x] `./mvnw -Dtest='AgentRepositoryTest' test` — after Step 1; expect `AgentRepositoryTest` to pass with one additional timestamp-refresh test.
- [x] `./mvnw -Dtest='AgentMapperIntegrationTest,AgentMapperProxyReferenceIntegrationTest' test` — after Step 2; expect the existing persisted-proxy test and the new outside-transaction getReference proxy test to pass. <!-- REVIEW-FIX: Updated command for separate proxy-reference class. -->
- [x] `./mvnw -Dtest='AgentServiceCrudIntegrationTest' test` — after Steps 3A and 4; expect existing service tests plus supplemental validation/query tests to pass.
- [x] `./mvnw -Dtest='AgentServiceMethodSecurityIntegrationTest' test` — if Step 3B creates the focused method-security class; expect Admin/Client direct service calls to throw `AccessDeniedException`.
- [x] `./mvnw -Dtest='AgentControllerTest' test` — after Step 5; expect HTTP CRUD/list/security/query tests to pass.
- [x] `./mvnw -Dtest='SecurityAuthorizationTest' test` — after Step 6; expect the security matrix to pass and comments to match current behavior.
- [x] `./mvnw -Dtest='AgentRepositoryTest,AgentMapperTest,AgentMapperIntegrationTest,AgentMapperProxyReferenceIntegrationTest,AgentServiceCrudIntegrationTest,AgentServiceMethodSecurityIntegrationTest,AgentControllerTest,SecurityAuthorizationTest' test` — targeted Agent + security regression; remove `AgentServiceMethodSecurityIntegrationTest` if not created.
- [x] `./mvnw test` — full backend regression suite; expect 0 new failures, with only the known `authServerApplicationTests.contextLoads` Docker/PostgreSQL error if Docker Compose is unavailable.

### Manual Validation

No manual validation is required for this task. It is backend-only regression coverage and all intended behavior is verifiable through automated tests.

---

## Related Code Explanations

- `backend/src/main/java/com/agentForgeBackend/models/agent/AgentEntity.java:47-57` — timestamp lifecycle hooks under test.
- `backend/src/main/java/com/agentForgeBackend/models/agent/AgentMapper.java` — `ownerId` mapping uses `entity.getOwner().getId()`; Task 4 strengthens proxy regression coverage.
- `backend/src/main/java/com/agentForgeBackend/models/agent/AgentService.java:107-120` — ownership-scoped list behavior and query-profile integration under test.
- `backend/src/main/java/com/agentForgeBackend/models/agent/AgentQueryProfile.java:18-27` — field allowlist under test.
- `backend/src/main/java/com/agentForgeBackend/shared/query/EntityQueryProfile.java:16-32` — unknown field error source.
- `backend/src/main/java/com/agentForgeBackend/shared/query/PageableFactory.java:59-69` — sort field validation source.
- `backend/src/main/java/com/agentForgeBackend/shared/query/QueryPredicateBuilder.java:51-58` — filter field validation source.
- `backend/src/test/java/com/agentForgeBackend/models/llm/LlmModelServiceListQueryIntegrationTest.java` — existing convention for timestamp sort acceptance and unknown field rejection.
- `backend/src/test/java/com/agentForgeBackend/models/hq/admin/AdminControllerListEndpointTest.java` — existing convention for `400 Invalid Query Request` response assertions.

---

## Completion Criteria

- [x] Parent document reviewed and Task 4 scope reflected accurately.
- [x] Previous Task documents for Tasks 1–3 reviewed and current code state verified.
- [x] Relevant skills reviewed and selected for this task.
- [x] Context7 documentation reviewed for Spring Boot 3.4.1, Spring Security 6.4.x, and Spring Data JPA repository behavior.
- [x] `AgentRepositoryTest.java` includes a precision-safe `updatedAt` refresh test.
- [x] `AgentMapperProxyReferenceIntegrationTest.java` includes a `getReference()` outside-transaction proxy test for `ownerId` mapping. <!-- REVIEW-FIX: Separate class avoids AgentMapperIntegrationTest @BeforeEach transaction conflict. -->
- [x] `AgentServiceCrudIntegrationTest.java` includes update blank-name and blank-initPrompt validation tests.
- [x] Service-level query tests verify name filtering remains owner-scoped, `updatedAt` sort is accepted, and `owner` filter/sort are rejected.
- [x] Method-security coverage proves non-Employee principals cannot invoke `AgentService` directly.
- [x] `AgentControllerTest.java` covers real-JWT Admin/Client 403 behavior or equivalent coverage exists in `SecurityAuthorizationTest`, with `AppSettingsEntity.updatedBy` cleared before deleting Admin rows when Admin cleanup is added. <!-- REVIEW-FIX: Added FK cleanup completion criterion. -->
- [x] `AgentControllerTest.java` covers anonymous non-list CRUD routes returning 401.
- [x] Controller-level query tests verify `updatedAt` sort succeeds and `owner` filter/sort return `400 Invalid Query Request`.
- [x] `SecurityAuthorizationTest.java` no longer contains stale comments claiming AgentController does not exist.
- [x] Targeted Agent + security regression command passes.
- [x] Full `./mvnw test` regression command passes with 0 new failures, ignoring only the known Docker/PostgreSQL `authServerApplicationTests.contextLoads` blocker if present.
- [x] No production code changed unless a supplemental test exposed a genuine Feature/ADR contract violation.
- [x] Parent Feature Task 4 link points to this Task document.
