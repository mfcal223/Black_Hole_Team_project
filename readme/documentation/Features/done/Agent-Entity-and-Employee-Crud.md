#high #new-feature #backend

## Feature: Agent Entity and Employee CRUD

### Description

Add an `AgentEntity` to the AgentForge backend. An Agent is a reusable LLM persona created by an Employee — it stores an initial system prompt (`initPrompt`) and an optional recurrent prompt (`recurrentPrompt`) that shape how the LLM behaves in a conversation. Employees create, manage, and delete their own agents. Agents are personal — they are never shared between employees and are never visible to or managed by Admins.

This feature does not include the OpenRouter chat flow or the Conversation/Message entities. Its sole purpose is to define the `AgentEntity` persistence slice and give employees full CRUD over their personal agent list.

Design decisions confirmed during feature creation:
- Primary key is `Long` with auto-increment (consistent with all existing entities; see [[ADRs/ADR-009-long-primary-key-for-all-entities]]).
- Package lives at `models/agent/` — a top-level peer of `models/hq/` and `models/llm/`.
- Employees manage their own agents; Admins have no agent management access.
- Ownership violations return `404 Not Found` (not 403), to avoid leaking the existence of other employees' agents.
- `POST /agent/list` is auto-scoped to the authenticated employee — no cross-employee visibility.
- Agent names must be unique per employee (not globally); enforced at the service layer.
- Hard delete is allowed. When `ConversationEntity` is built later, its FK to `AgentEntity` will use `SET NULL` semantics so deleting an agent converts linked conversations to general conversations.
- `initPrompt` is required and stored as `@Lob TEXT`. `recurrentPrompt` is optional and also stored as `@Lob TEXT`.
- `createdAt` and `updatedAt` are set by `@PrePersist`; `updatedAt` is updated by `@PreUpdate`.
- Agent list queryable fields: `id`, `name`, `createdAt`, `updatedAt`. Default sort: `createdAt DESC`.

---

## Problem Statement

Employees need to configure and reuse LLM personas for specialized tasks (e.g., "Code Reviewer", "Marketing Copywriter"). Without a persistent Agent, every chat session starts from a blank slate, requiring the employee to type the same system prompt repeatedly. There is no existing domain model to represent or store these reusable LLM configurations.

Additionally, `AgentEntity` is a required FK target for `ConversationEntity` (per ADR-006) — no agent-powered conversation can exist until this entity is persisted.

---

## User Stories

1. As an Employee, I want to create a new Agent with a name and an initial system prompt, so that I can configure a reusable LLM persona for a specific task.
2. As an Employee, I want to optionally add a recurrent prompt to my Agent, so that a behavioral instruction is prepended to every user message in conversations using this Agent.
3. As an Employee, I want to add an optional description to my Agent, so that I can remind myself what the Agent is intended for.
4. As an Employee, I want to retrieve a list of my own Agents with pagination, filtering, and sorting, so that I can browse and manage them as my collection grows.
5. As an Employee, I want to filter my agent list by name and sort by creation date or last update, so that I can quickly find a specific Agent.
6. As an Employee, I want to retrieve one Agent by ID to see its full details, so that I can inspect its prompts before assigning it to a new conversation.
7. As an Employee, I want to update an Agent's name, description, initPrompt, and recurrentPrompt, so that I can improve or repurpose an existing Agent.
8. As an Employee, I want to delete an Agent I no longer need, so that my agent list stays clean.
9. As an Employee, I want the system to prevent me from creating two Agents with the same name, so that my agent list remains unambiguous.
10. As an Employee, I want the system to reject my request to access or modify another employee's Agent, so that personal agents remain private.
11. As an Employee, I want my agent list to only show my own Agents, so that I never see agents belonging to other employees.
12. As a backend maintainer, I want `AgentEntity` to live in `models/agent/` separate from `models/hq/`, so that future entities like `ConversationEntity` can import it without creating cross-domain user-type dependencies.
13. As a backend maintainer, I want `/agent/**` endpoints to require `hasRole("EMPLOYEE")` at the HTTP security layer, so that only employees can reach agent endpoints and anonymous or non-employee requests are blocked before reaching the controller.
14. As a backend maintainer, I want ownership enforcement at the service layer (not controller), so that the security boundary is testable through the service interface.
15. As a backend maintainer, I want `AgentService` to use `@PreAuthorize("hasRole('EMPLOYEE')")` and then verify the requesting employee owns the resource, so that role-based access and ownership enforcement are separated concerns with defense-in-depth matching the HTTP layer.
16. As a backend maintainer, I want ownership violations to return `ItemNotFoundException` (resulting in `404`), so that employees cannot enumerate other employees' agent IDs.
17. As a backend maintainer, I want agent name uniqueness enforced per employee at the service layer, so that a duplicate insert surfaces as `ItemAlreadyExist` rather than a database constraint violation.
18. As a backend maintainer, I want `AgentEntity` to use `Long` primary key with auto-increment, consistent with all other entities in the system.
19. As a backend maintainer, I want `initPrompt` and `recurrentPrompt` stored as `@Lob @Column(columnDefinition = "TEXT")` to support arbitrarily long prompts in PostgreSQL.
20. As a backend maintainer, I want `AgentEntity` timestamps to be managed by `@PrePersist` and `@PreUpdate` lifecycle hooks, consistent with the existing `LlmModelEntity` pattern.
21. As a QA engineer, I want repository tests for `AgentEntity` persistence, owner FK, and the name-per-owner uniqueness constraint, so that the JPA mapping is verified.
22. As a QA engineer, I want service tests for ownership enforcement, name uniqueness, and list scoping, so that business rules are verified at the service boundary.
23. As a QA engineer, I want controller tests for the HTTP contract including `401`/`403` and ownership `404` responses, so that the API surface is verified end-to-end.
24. As a future frontend developer, I want the Agent API shape to be predictable and documented, so that agent management screens can be built without reverse-engineering backend conventions.

---

## Solution

Add a new `Agent` slice under `backend/src/main/java/com/agentForgeBackend/models/agent/`. The slice follows the established scaffold pattern: entity → DTOs → form → mapper → repository → query profile → service → controller. It diverges in two places:

1. All CRUD methods are scoped to the authenticated employee — not admin-only like previous domains.
2. The list endpoint overrides `getListPage()` to inject an ownership predicate, ensuring employees only see their own agents.

### Scope

Impacted workflows and systems:
- New domain module: `models/agent/` with full CRUD scaffold.
- Security configuration: `/agent/**` route added to the HTTP authorization matrix as `hasRole("EMPLOYEE")`.
- Employee-facing REST endpoints: `POST`, `PUT`, `DELETE`, `POST /list`. `GET /agent` returns `405 Method Not Allowed` (use `POST /agent/list` for scoped retrieval).
- QueryDSL compile step required after entity creation to generate `QAgentEntity`.

Out of scope for this feature:
- OpenRouter chat calls using agent prompts (deferred to `OpenRouterService` / `ConversationEntity` feature).
- `ConversationEntity` FK to `AgentEntity` and `SET NULL` cascade behavior (defined in the Conversation feature).
- Admin-facing agent visibility or management.
- Agent sharing between employees.
- Frontend agent management screens.

### Affected Systems / Modules

- [[Memory/architecture|Architecture]] — New non-user standalone entity; no JOINED inheritance; owner FK to `EmployeeEntity`.
- [[Memory/tech|Tech Stack]] — Uses Spring Boot 3.4.1, Spring Security, Spring Data JPA, QueryDSL, JUnit 5, H2 test profile.
- [[ADRs/ADR-006-nullable-agent-fk-for-conversation-type]] — `AgentEntity` is the FK target for `ConversationEntity.agent`; this feature creates that target.
- [[ADRs/ADR-008-agent-prompts-not-persisted-as-messages]] — Confirms that `initPrompt`/`recurrentPrompt` live on `AgentEntity`, not as persisted messages.
- [[ADRs/ADR-009-long-primary-key-for-all-entities]] — PK type decision.
- `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java` — Add `/agent/**` to the authorization matrix.
- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeEntity.java` — `AgentEntity.owner` is a FK to this entity.
- `backend/src/main/java/com/agentForgeBackend/shared/tools/AuthUserUtil.java` — `getAuthUserEmployeeEntity()` provides the current employee for ownership checks and list scoping.
- `backend/src/main/java/com/agentForgeBackend/shared/defaultImplements/DefaultServiceImplements.java` — Base class extended by `AgentService`; `getListPage()` overridden for ownership scoping.
- `backend/src/main/java/com/agentForgeBackend/shared/defaultImplements/DefaultController.java` — Base class extended by `AgentController`.

External documentation:
- Spring Data JPA `@Lob` and PostgreSQL TEXT: https://docs.spring.io/spring-data/jpa/reference/
- Spring Security method security: https://docs.spring.io/spring-security/reference/6.5/servlet/authorization/method-security.html

### Impact Analysis

`AgentEntity` has an outbound FK to `EmployeeEntity` (owner). It introduces no changes to the Employee domain — the FK is defined on the Agent side. The cross-cutting change is the `SecurityConfig` update to add `/agent/**` → `hasRole("EMPLOYEE")`; this introduces the first `ROLE_EMPLOYEE` HTTP rule and is more restrictive than the `anyRequest().authenticated()` catch-all. The `AgentService` also applies `@PreAuthorize("hasRole('EMPLOYEE')")` for defense-in-depth, matching the pattern used by all other domains.

`AuthUserUtil.getAuthUserEmployeeEntity()` is already implemented (Employee feature). `AgentService` can use it directly without any changes to `AuthUserUtil`.

Adding `AgentEntity` causes QueryDSL APT to generate `QAgentEntity` at compile time — no other Q-class is affected.

### Risk Assessment

- **QueryDSL APT**: `QAgentEntity` is generated at compile time. A full Maven compile is required after creating `AgentEntity` before `AgentQueryProfile` can reference it. Stale Q-classes will cause build failures.
- **`DefaultServiceImplements.update()` is a known no-op**: `AgentService` must override `update()` completely — do not call `super.update()`.
- **`@Lob` PostgreSQL behavior**: `@Lob` on `String` with some Hibernate/PostgreSQL combinations maps to `OID` rather than `TEXT`. Using `@Column(columnDefinition = "TEXT")` alongside `@Lob` avoids this. This has not been an issue with `spring.jpa.hibernate.ddl-auto=update` in this codebase, but it should be explicitly declared.
- **Owner FK not nullable**: `AgentEntity.owner` must be `nullable = false`. A parentless agent is invalid. The service must always set the owner from the authenticated principal before saving.
- **Name uniqueness is service-layer-only**: The database has no unique constraint on `(name, owner)`. Concurrent inserts could theoretically bypass the service-layer check. For the MVP with a single-instance deployment, this is acceptable.
- **Hard delete with future FK**: When `ConversationEntity` is created, its FK to `AgentEntity` must be declared with `@OnDelete(action = OnDeleteAction.SET_NULL)` or an equivalent cascade strategy. This feature does not define that constraint — it must be accounted for in the Conversation feature's design.

---

## Implementation Architecture

### Changes Required

#### 1. Security configuration update

**Purpose:** Gate all `/agent/**` endpoints at the HTTP layer so only employees can reach agent endpoints — anonymous and non-employee requests are blocked before reaching the controller.

**Changes:** Add to `SecurityConfig.securityFilterChain()` before the `anyRequest().authenticated()` catch-all:

```java
.requestMatchers("/agent/**").hasRole("EMPLOYEE")
```

**File:** `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java`

---

#### 2. `AgentEntity`

**Purpose:** Persist an Employee's reusable LLM persona with its prompt configuration.

**Package:** `backend/src/main/java/com/agentForgeBackend/models/agent/`

**Changes:**

- Annotate with `@Entity` and `@Table(name = "agent")`.
- Do not extend `BaseUserEntity` — this is a standalone domain entity.
- Fields:

| Field | Column | Type | Constraints |
|-------|--------|------|-------------|
| `id` | `id` | `Long` | `@Id`, `@GeneratedValue(IDENTITY)` |
| `name` | `name` | `String` | `nullable = false` |
| `description` | `description` | `String` | nullable |
| `initPrompt` | `init_prompt` | `String` | `@Lob`, `@Column(columnDefinition = "TEXT")`, `nullable = false` |
| `recurrentPrompt` | `recurrent_prompt` | `String` | `@Lob`, `@Column(columnDefinition = "TEXT")`, nullable |
| `owner` | `owner_id` | `EmployeeEntity` | `@ManyToOne(fetch = FetchType.LAZY)`, `@JoinColumn(name = "owner_id", nullable = false)` |
| `createdAt` | `created_at` | `LocalDateTime` | `nullable = false`, `updatable = false` |
| `updatedAt` | `updated_at` | `LocalDateTime` | `nullable = false` |

- `@PrePersist` sets both `createdAt` and `updatedAt` to `LocalDateTime.now()`.
- `@PreUpdate` sets only `updatedAt` to `LocalDateTime.now()`.
- Use Lombok `@Getter`, `@Setter`, `@NoArgsConstructor`.

---

#### 3. DTOs and `AgentForm`

**Purpose:** Define safe API input/output contracts for employee-facing agent operations.

**Changes:**

- `AgentForm`: `name` (`@NotBlank`), `description` (nullable), `initPrompt` (`@NotBlank`), `recurrentPrompt` (nullable). Owner is never accepted from the caller — the service derives it from the JWT principal.
- `AgentDTO`: `id`, `name`, `description`, `initPrompt`, `recurrentPrompt`, `ownerId`, `createdAt`, `updatedAt` — full detail view.
- `AgentMiniDTO`: `id`, `name`, `createdAt` — insert/compact response.
- `AgentListDTO`: `id`, `name`, `description`, `createdAt`, `updatedAt` — paginated list rows (prompts omitted from list to keep payloads small).

---

#### 4. `AgentMapper`

**Purpose:** Convert `AgentEntity` to DTOs and `AgentForm` to entity without business logic.

**Changes:**

- Implement `DefaultMapper<AgentDTO, AgentMiniDTO, AgentListDTO, AgentForm, AgentEntity>`.
- `toEntity(form)`: map `name`, `description`, `initPrompt`, `recurrentPrompt`; skip null values. Do not set `owner` in the mapper — the service sets ownership before saving.
- `toDTO`, `toSmallDTO`, `toListDTO`: map all respective fields; null-check nullable fields (`description`, `recurrentPrompt`).
- Note: `entity.getOwner().getId()` in `toDTO()` is safe on Hibernate lazy proxies — `getId()` returns the FK identifier stored in the proxy without triggering initialization (documented Hibernate ORM contract). Add a code comment: `// getId() on a Hibernate proxy does not trigger initialization`.

---

#### 5. `AgentRepository`

**Purpose:** Provide persistence and QueryDSL support for `AgentEntity`.

**Changes:**

- Extend `DefaultRepository<AgentEntity, Long>`.
- Add `Optional<AgentEntity> findByIdAndOwnerId(Long id, Long ownerId)` — used by service to load + verify ownership in one query using primitive Long bind parameters, avoiding entity attachment concerns.
- Add `boolean existsByNameAndOwnerId(String name, Long ownerId)` — used by service for per-employee name uniqueness checks using primitive Long bind parameters.

---

#### 6. `AgentQueryProfile`

**Purpose:** Support QueryDSL filtering and sorting for the employee agent list endpoint.

**Changes:**

- Declare filterable and sortable fields:
  - `id` (number, sortable)
  - `name` (string, sortable)
  - `createdAt` (dateTime, sortable)
  - `updatedAt` (dateTime, sortable)
- Default sort: `createdAt DESC`.
- `description`, `initPrompt`, `recurrentPrompt`, and `owner` are intentionally excluded — free-text blobs and internal FK are not useful as filter predicates.

---

#### 7. `AgentService`

**Purpose:** Own all Agent business rules: ownership enforcement, name uniqueness, auto-scoped list, and employee-owned CRUD.

**Changes:**

- Extend `DefaultServiceImplements<AgentDTO, AgentMiniDTO, AgentListDTO, AgentForm, AgentEntity, Long>`.
- Inject `AgentRepository`, `AgentMapper`, `AuthUserUtil`, and the query infrastructure.
- Apply `@PreAuthorize("hasRole('EMPLOYEE')")` to all public methods — defense-in-depth matching the HTTP layer rule, consistent with every other domain in the codebase.
- Transaction coverage is inherited from `DefaultServiceImplements`'s class-level `@Transactional(rollbackFor = {...})`. Do not add method-level `@Transactional` annotations — this mirrors the `LlmModelService` convention.
- **`insert(form)`:**
  - Load current employee via `AuthUserUtil.getAuthUserEmployeeEntity()`.
  - Validate `name` and `initPrompt` are non-blank; throw `InvalidInsertDetails` if not.
  - Check `repository.existsByNameAndOwnerId(form.getName(), currentEmployee.getId())` — throw `ItemAlreadyExist` if true.
  - Map form to entity, set `entity.setOwner(owner)`, save, return `AgentMiniDTO`.
- **`getOne(id)`:**
  - Load current employee.
  - Use `repository.findByIdAndOwnerId(id, currentEmployee.getId())` — throw `ItemNotFoundException` if absent (covers both "not found" and "not owner").
  - Return `AgentDTO`.
- **`update(id, form)`:**
  - Load current employee.
  - Use `repository.findByIdAndOwnerId(id, currentEmployee.getId())` — throw `ItemNotFoundException` if absent.
  - If `name` is changing: check `existsByNameAndOwnerId(newName, currentEmployee.getId())` — throw `ItemAlreadyExist` if conflict.
  - Apply all form fields unconditionally to entity (full-state PUT semantics): `name`, `initPrompt`, `description`, `recurrentPrompt`. `@Valid` ensures `name` and `initPrompt` are non-blank; nullable fields (`description`, `recurrentPrompt`) set to `null` when the form sends `null`, which correctly clears them. Save; return `AgentDTO`.
- **`delete(id)`:**
  - Load current employee.
  - Use `repository.findByIdAndOwnerId(id, currentEmployee.getId())` — throw `ItemNotFoundException` if absent.
  - Hard delete; return `AgentDTO` of the deleted entity (consistent with the base scaffold convention).
- **`getListPage(request)`:**
  - Load current employee.
  - Build the ownership predicate: `QAgentEntity.agentEntity.owner.id.eq(currentEmployee.getId())`.
  - AND it with the user-supplied predicate from the request.
  - Delegate to the query engine with the combined predicate.
  - Override pattern (uses inherited `protected` fields `queryPredicateBuilder` and `pageableFactory` from `DefaultServiceImplements`):
    ```java
    Predicate basePredicate = queryPredicateBuilder.build(request, queryProfile);
    Predicate ownerPredicate = QAgentEntity.agentEntity.owner.id.eq(currentEmployee.getId());
    Predicate combined = new BooleanBuilder(basePredicate).and(ownerPredicate).getValue();
    Pageable pageable = pageableFactory.create(request, queryProfile);
    return repository.findAll(combined, pageable).map(mapper::toListDTO);
    ```
  - Note: `DefaultServiceImplements.queryPredicateBuilder` and `pageableFactory` must be changed from `private` to `protected` to enable this override without duplicate field injection.
- **`getAll()`:** Override to throw `ResponseStatusException(HttpStatus.METHOD_NOT_ALLOWED, "Use POST /agent/list for scoped agent retrieval")` — an unpaginated full-table dump has no valid use case for an ownership-scoped resource and `POST /agent/list` is the correct paginated, scoped alternative.

---

#### 8. `AgentController`

**Purpose:** Expose employee-facing Agent CRUD endpoints through the existing controller scaffold.

**Changes:**

- Annotate with `@RestController` and `@RequestMapping("/agent")`.
- Extend `DefaultController<AgentDTO, AgentMiniDTO, AgentListDTO, AgentForm, Long>`.
- No extra endpoints beyond the inherited scaffold — the service handles all ownership logic.

---

## Implementation Steps

### Phase 1: Security baseline

- [ ] **Step 1.1:** Write failing security tests that verify: anonymous requests to `/agent/**` receive `401`; authenticated `ROLE_EMPLOYEE` requests receive a non-401/403 status (404 before the controller exists — confirms the security rule fires); unauthenticated requests are rejected. Phase 1 exception: use `@WithMockUser(roles = "EMPLOYEE")` for security tests in this phase; `TestAuthenticationHelper`-based JWT tests belong in Phase 3–4 once the controller exists.
- [ ] **Step 1.2:** Add `.requestMatchers("/agent/**").hasRole("EMPLOYEE")` to `SecurityConfig.securityFilterChain()` so the failing security tests pass.

### Phase 2: Agent domain foundation

- [ ] **Step 2.1:** Create `AgentEntity` with all fields, `@ManyToOne` owner FK, `@Lob @Column(columnDefinition = "TEXT")` for prompt fields, `@PrePersist`/`@PreUpdate` timestamp lifecycle hooks.
- [ ] **Step 2.2:** Create `AgentForm`, `AgentDTO`, `AgentMiniDTO`, `AgentListDTO`.
- [ ] **Step 2.3:** Create `AgentMapper` implementing `DefaultMapper`.
- [ ] **Step 2.4:** Create `AgentRepository` with `findByIdAndOwnerId` and `existsByNameAndOwnerId`.
- [ ] **Step 2.5:** Compile the backend (`./mvnw compile -pl backend`) to generate `QAgentEntity` via QueryDSL APT.

### Phase 3: Business rules and CRUD

- [ ] **Step 3.1:** Create `AgentQueryProfile` with `id`, `name`, `createdAt`, `updatedAt` fields and `createdAt DESC` default sort.
- [ ] **Step 3.2:** Create `AgentService` with all ownership-enforced overrides, name uniqueness per employee, ownership-scoped `getListPage()`, and `getAll()`.
- [ ] **Step 3.3:** Create `AgentController` at `/agent` using the generic controller pattern.
- [ ] **Step 3.4:** Verify that an authenticated employee can create, read, update, and delete their own agents, and that accessing another employee's agent ID returns `404`.

### Phase 4: Regression and supplemental coverage

- [ ] **Step 4.1:** Repository edge cases — `findByIdAndOwnerId` returns empty for wrong owner, `existsByNameAndOwnerId` returns true only for same owner, `createdAt`/`updatedAt` auto-set on persist, `updatedAt` updated on save.
- [ ] **Step 4.2:** Mapper contract tests — all DTO variants, null-safety for `description` and `recurrentPrompt`, `ownerId` mapping via Hibernate proxy `getId()` (verify `toDTO()` succeeds on a proxy constructed via `entityManager.getReference()` outside a transaction), prompts omitted from `AgentListDTO`.
- [ ] **Step 4.3:** Service business-rule tests — ownership 404, name-per-employee uniqueness (same name different owner succeeds), list scoped to current employee only, blank `initPrompt` rejected, owner set from principal not form.
- [ ] **Step 4.4:** Controller HTTP contract tests — `POST /agent` creates and returns `AgentMiniDTO`, `GET /agent/{id}` returns `AgentDTO`, `PUT /agent/{id}` updates, `DELETE /agent/{id}` deletes, `POST /agent/list` returns only current employee's agents, `401` for anonymous.
- [ ] **Step 4.5:** Query profile edge cases — sort by `updatedAt`, filter by `name`, rejection of non-declared fields (e.g., `initPrompt`, `owner`).
- [ ] **Step 4.6:** Run full `./mvnw test` to confirm no regressions in Admin, Employee, Client, LlmModel, or security tests.

---

## Potential Issues / Risks

- **`DefaultServiceImplements.update()` is a known no-op.** `AgentService` must override `update()` completely — do not call `super.update()`.
- **`QAgentEntity` does not exist until after a compile containing `AgentEntity`.** `AgentQueryProfile` will not compile until Step 2.5 is complete.
- **`@Lob` + PostgreSQL.** Without `@Column(columnDefinition = "TEXT")`, Hibernate may map `@Lob String` to `OID` on some PostgreSQL driver versions. Always declare `columnDefinition = "TEXT"` explicitly.
- **`owner` FK is `LAZY`-loaded.** Repository methods use `ownerId` (Long) instead of `EmployeeEntity` objects (`findByIdAndOwnerId`, `existsByNameAndOwnerId`), completely avoiding entity attachment concerns. The service passes `currentEmployee.getId()` — no proxy or detachment risk.
- **Hard delete and future Conversation FK.** The `ConversationEntity` FK to `AgentEntity` must use `@OnDelete(action = OnDeleteAction.SET_NULL)` when it is built. If this is omitted, deleting an agent will throw a database FK violation. This is a known deferred dependency — document it in the Conversation feature's risk section.
- **Name uniqueness is service-layer-only (no DB unique constraint on `(name, owner_id)`).** A race condition between two concurrent inserts with the same name and owner could bypass the check. Acceptable for MVP single-instance deployment.

---

## Testing Decisions

Good tests for this feature verify observable behavior through public interfaces. Tests must not assert on private methods, internal mapper fields not exposed in the DTO, or QueryDSL predicate internals. The most valuable tests exercise repository persistence, service ownership enforcement, and controller authorization flows.

Testing decisions:
- Use TDD in vertical slices: one failing behavior test → minimal implementation → refactor. Each module's first behavior tests are written within its implementation phase (Phases 1–3), not deferred to Phase 4.
- Repository tests: use `@DataJpaTest` against H2. Verify `findByIdAndOwnerId` returns empty for a wrong-owner agent, `existsByNameAndOwnerId` scopes correctly, and `@PrePersist`/`@PreUpdate` timestamps are auto-set.
- Mapper tests: instantiate `AgentMapper` directly (no Spring context). Assert DTO field values, null-safety, and that `initPrompt`/`recurrentPrompt` are omitted from `AgentListDTO`.
- Service tests: use `@SpringBootTest` with `@ActiveProfiles("test")`. Seed an owner employee and a different employee. Verify that accessing the different employee's agent returns `ItemNotFoundException`, that duplicate names for the same owner throw `ItemAlreadyExist`, and that the same name for a different owner succeeds. Verify list scoping.
- Controller tests: use MockMvc with `@SpringBootTest`. Use `TestAuthenticationHelper` to generate employee JWTs. Assert `401` for anonymous, `404` for cross-employee access, and correct JSON shape for all CRUD endpoints.

Prior art:
- `backend/src/test/java/com/agentForgeBackend/models/llm/LlmModelControllerTest.java`
- `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeServiceCrudIntegrationTest.java`
- `backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java`
- `backend/src/test/java/com/agentForgeBackend/testUtils/TestAuthenticationHelper.java`

Modules to test:
- `AgentEntity` persistence through `@DataJpaTest` repository tests.
- `AgentMapper` DTO contract behavior.
- `AgentService` business rules: ownership, name uniqueness, list scoping, owner injection.
- `AgentController` endpoint HTTP contract: routes, status codes, JSON shape, `401`/`404`.
- `AgentQueryProfile` filter/sort safety (via service integration tests).

---

## Task Breakdown

### Task 1: Security Baseline for Agent Endpoints

- **Steps Covered:** Step 1.1, Step 1.2
- **Reason for Grouping:** Security must be enforced at the route level before any controller exists; focused, low-complexity change with a clear test gate.
- **Planned Task File:** `Agent-Entity-and-Employee-Crud-step-1-security-baseline.md`
- **Task Document Link:** [[Tasks/current/Agent-Entity-and-Employee-Crud-step-1-security-baseline]]

### Task 2: Agent Domain Foundation

- **Steps Covered:** Step 2.1, Step 2.2, Step 2.3, Step 2.4, Step 2.5
- **Reason for Grouping:** Entity, DTOs, mapper, and repository define the domain shape and can be created together before business behavior is wired. Compile step generates the Q-class needed for Phase 3.
- **Planned Task File:** `Agent-Entity-and-Employee-Crud-step-2-domain-foundation.md`
- **Task Document Link:** [[Tasks/current/Agent-Entity-and-Employee-Crud-step-2-domain-foundation]]

### Task 3: Business Rules and CRUD

- **Steps Covered:** Step 3.1, Step 3.2, Step 3.3, Step 3.4
- **Reason for Grouping:** Query profile, service, and controller behavior are tightly coupled around the Agent CRUD use case; ownership logic runs through all three layers.
- **Planned Task File:** `Agent-Entity-and-Employee-Crud-step-3-business-rules-and-crud.md`
- **Task Document Link:** [[Tasks/current/Agent-Entity-and-Employee-Crud-step-3-business-rules-and-crud]]

### Task 4: Regression and Supplemental Coverage

- **Steps Covered:** Step 4.1, Step 4.2, Step 4.3, Step 4.4, Step 4.5, Step 4.6
- **Reason for Grouping:** Supplemental tests for edge cases, contract completeness, and full regression after all modules are assembled. First behavior tests for each module are written within their implementation task following TDD.
- **Planned Task File:** `Agent-Entity-and-Employee-Crud-step-4-regression-coverage.md`
- **Task Document Link:** [[Tasks/current/Agent-Entity-and-Employee-Crud-step-4-regression-coverage]]
