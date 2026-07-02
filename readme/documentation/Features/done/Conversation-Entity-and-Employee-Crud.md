#high #new-feature #backend

## Feature: Conversation Entity and Employee CRUD

### Description

Add a `ConversationEntity` to the AgentForge backend. A Conversation groups a sequence of messages into a named session owned by an Employee. It tracks which LLM model is currently selected and optionally which Agent powers it. Employees can create, list, delete, rename, and switch the model of their own conversations.

This feature resolves the deferred `SET NULL` cascade constraint noted in the Agent feature: `ConversationEntity.agent` must be declared with `@OnDelete(action = OnDeleteAction.SET_NULL)` so that deleting an Agent converts linked conversations to general conversations without violating the FK.

This feature does **not** include the OpenRouter chat flow or the `MessageEntity`. Its sole purpose is to define the `ConversationEntity` persistence slice and give employees full lifecycle management over their personal conversation list.

Design decisions confirmed during feature creation:
- Primary key is `Long` with auto-increment (consistent with all existing entities; see [[ADRs/ADR-009-long-primary-key-for-all-entities]]).
- Package lives at `models/conversation/` — a top-level peer of `models/agent/` and `models/llm/`.
- `title` is optional on creation; the service defaults to `"New Conversation"` if blank or null.
- `agent` FK is nullable (null = general conversation, non-null = agent conversation) — see [[ADRs/ADR-006-nullable-agent-fk-for-conversation-type]].
- `agent` FK uses `@OnDelete(action = OnDeleteAction.SET_NULL)` so hard-deleting an Agent converts linked conversations to general conversations.
- `currentModel` FK is required and validated as existing and enabled on creation (see [[ADRs/ADR-007-admin-curated-llm-model-list]]).
- Model switching exposed as `PATCH /conversation/{id}/model` — same enabled validation applies.
- Title editing exposed as `PATCH /conversation/{id}/title`.
- `PUT /conversation/{id}` (inherited `update()`) throws `405 Method Not Allowed`.
- `GET /conversation` (inherited `getAll()`) throws `405 Method Not Allowed`.
- If an `agentId` is provided on creation, the service validates ownership via `AgentRepository.findByIdAndOwnerId()`.
- Hard delete is allowed; when `MessageEntity` is built, its `conversation` FK will declare `@OnDelete(action = OnDeleteAction.CASCADE)`.
- List queryable fields: `id`, `title`, `createdAt`, `updatedAt` (filterable + sortable); `agentId` (filterable only, not sortable). Default sort: `updatedAt DESC`.

---

## Problem Statement

Employees need a persistent, named container for their chat sessions. Without a Conversation, there is no place to attach messages, no way to associate a model selection with a session, and no way to resume a past chat. There is also no place to attach an Agent to a session — the Agent feature created the prompt configuration, but there is no session entity to bind it to at runtime.

Additionally, `ConversationEntity` is the FK parent for `MessageEntity` (per ADR-003) — no message can exist until this entity is persisted.

---

## User Stories

1. As an Employee, I want to create a new conversation by selecting an LLM model, so that I can begin a chat session.
2. As an Employee, I want to optionally assign an Agent to a new conversation, so that the Agent's prompts shape the LLM behavior throughout the session.
3. As an Employee, I want the system to assign a default title ("New Conversation") if I don't provide one, so that I can start chatting immediately without naming the session first.
4. As an Employee, I want to rename a conversation via a dedicated endpoint, so that I can label it after its content becomes clear.
5. As an Employee, I want to switch the model in an active conversation via a dedicated endpoint, so that I can change providers mid-session without losing my chat history.
6. As an Employee, I want the system to reject a model that has been disabled by the admin, so that I cannot accidentally use an off-limits model.
7. As an Employee, I want to retrieve a list of my own conversations with pagination, filtering, and sorting, so that I can navigate my chat history as it grows.
8. As an Employee, I want to filter my conversation list by agent so that I can see all conversations that use a specific Agent.
9. As an Employee, I want to sort my conversation list by last updated date so that my most recently active sessions appear first.
10. As an Employee, I want to retrieve a single conversation by ID to see its full details, so that I can inspect which agent and model are active.
11. As an Employee, I want to delete a conversation I no longer need, so that my conversation list stays clean.
12. As an Employee, I want deleting an Agent to automatically convert its conversations to general conversations (not delete them), so that I don't lose chat history when I retire an Agent.
13. As an Employee, I want the system to reject my request to access or modify another employee's conversation, so that my conversations remain private.
14. As an Employee, I want the system to prevent me from assigning another employee's Agent to my conversation, so that agent access remains personal.
15. As a backend maintainer, I want `/conversation/**` endpoints to require `hasRole("EMPLOYEE")` at the HTTP security layer, so that anonymous and non-employee requests are blocked before reaching the controller.
16. As a backend maintainer, I want ownership enforcement at the service layer (not just HTTP layer), so that the security boundary is testable through the service interface.
17. As a backend maintainer, I want ownership violations to surface as `ItemNotFoundException` (404), so that employees cannot enumerate other employees' conversation IDs.
18. As a backend maintainer, I want `ConversationEntity.agent` to declare `@OnDelete(action = OnDeleteAction.SET_NULL)` at the database level, so that deleting an Agent never violates a FK constraint.
19. As a backend maintainer, I want the `PUT /conversation/{id}` endpoint to throw `405`, so that mutation flows are clearly channeled through PATCH endpoints.
20. As a backend maintainer, I want `getAll()` to throw `405`, so that an unbounded dump of conversation history is never exposed.
21. As a backend maintainer, I want `ConversationEntity` to use `Long` primary key with auto-increment, consistent with all other entities.
22. As a QA engineer, I want repository tests for `ConversationEntity` persistence, all FK relationships, and the ownership finder method, so that the JPA mapping is verified.
23. As a QA engineer, I want service tests for ownership enforcement, model validation, agent ownership validation, title auto-generation, and list scoping, so that business rules are verified at the service boundary.
24. As a QA engineer, I want controller tests for the HTTP contract including `401`/`403`, ownership `404`, PATCH endpoints, and JSON shape, so that the full API surface is verified.
25. As a future frontend developer, I want the Conversation API shape to be predictable and consistent with the Agent API, so that conversation management screens can be built without reverse-engineering backend conventions.

---

## Solution

Add a new `Conversation` slice under `backend/src/main/java/com/agentForgeBackend/models/conversation/`. The slice follows the established scaffold pattern: entity → DTOs → form → mapper → repository → query profile → service → controller. It diverges in three places:

1. All CRUD methods are scoped to the authenticated employee (same as Agent).
2. Two custom PATCH endpoints replace the inherited `PUT /{id}` for mutable post-creation fields.
3. `ConversationEntity.agent` declares `@OnDelete(SET_NULL)` — a database-level constraint resolved here after being deferred from the Agent feature.

### Scope

Impacted workflows and systems:
- New domain module: `models/conversation/` with full CRUD scaffold.
- Security configuration: `/conversation/**` route added to the HTTP authorization matrix as `hasRole("EMPLOYEE")`.
- Employee-facing REST endpoints: `POST /conversation`, `GET /conversation/{id}`, `POST /conversation/list`, `DELETE /conversation/{id}`, `PATCH /conversation/{id}/model`, `PATCH /conversation/{id}/title`. `PUT /conversation/{id}` and `GET /conversation` return `405`.
- `AgentEntity` FK constraint: `@OnDelete(SET_NULL)` declared on the `conversation.agent_id` FK column.
- QueryDSL compile step required after entity creation to generate `QConversationEntity`.

Out of scope for this feature:
- OpenRouter chat calls (deferred to the chat/message feature).
- `MessageEntity` and its cascade delete from Conversation (declared in the Message feature).
- Admin-facing conversation visibility or management.
- Conversation sharing between employees.
- Frontend conversation management screens.

### Affected Systems / Modules

- [[Memory/architecture|Architecture]] — New employee-owned entity with three FK relationships (employee, agent, currentModel).
- [[Memory/tech|Tech Stack]] — Uses Spring Boot 3.4.1, Spring Security, Spring Data JPA, QueryDSL, JUnit 5, H2 test profile.
- [[ADRs/ADR-006-nullable-agent-fk-for-conversation-type]] — Nullable `agent` FK is the conversation type discriminator. This feature implements that decision.
- [[ADRs/ADR-007-admin-curated-llm-model-list]] — `currentModel` must reference an enabled `LlmModelEntity`. Validation enforced on creation and on PATCH model switch.
- [[ADRs/ADR-008-agent-prompts-not-persisted-as-messages]] — Agent prompts are not persisted here; that is a concern of the future OpenRouter/Message feature.
- [[ADRs/ADR-009-long-primary-key-for-all-entities]] — PK type decision.
- [[Features/done/Agent-Entity-and-Employee-Crud]] — `AgentEntity` is an FK target; the deferred `SET NULL` constraint is resolved here.
- `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java` — Add `/conversation/**` to the authorization matrix.
- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeEntity.java` — `ConversationEntity.employee` is a FK to this entity.
- `backend/src/main/java/com/agentForgeBackend/models/agent/AgentEntity.java` — `ConversationEntity.agent` is a nullable FK with `SET NULL`.
- `backend/src/main/java/com/agentForgeBackend/models/agent/AgentRepository.java` — Used by `ConversationService` to validate agent ownership on creation.
- `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelEntity.java` — `ConversationEntity.currentModel` is a FK to this entity.
- `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelRepository.java` — Used by `ConversationService` to validate model exists and is enabled.
- `backend/src/main/java/com/agentForgeBackend/shared/defaultImplements/DefaultServiceImplements.java` — Base class extended by `ConversationService`; `getListPage()` overridden for ownership scoping.
- `backend/src/main/java/com/agentForgeBackend/shared/defaultImplements/DefaultController.java` — Base class extended by `ConversationController`.
- `backend/src/main/java/com/agentForgeBackend/shared/tools/AuthUserUtil.java` — `getAuthUserEmployeeEntity()` provides the current employee for ownership checks and list scoping.

### Impact Analysis

`ConversationEntity` introduces three outbound FKs:
- `employee_id` → `employee` table (non-null): no change to Employee domain, FK is on the Conversation side.
- `agent_id` → `agent` table (nullable, `ON DELETE SET NULL`): the `@OnDelete` annotation changes the DDL generated by Hibernate for the `agent_id` column. Since `spring.jpa.hibernate.ddl-auto=update` and the `conversation` table is new, Hibernate will generate the correct constraint on first startup. Existing `agent` table rows are unaffected.
- `current_model_id` → `llm_model` table (non-null): no change to LlmModel domain, FK is on the Conversation side.

The cross-cutting security change adds `/conversation/**` → `hasRole("EMPLOYEE")` immediately after the existing `/agent/**` rule in `SecurityConfig`. The relative order of `requestMatchers` entries is significant — this must be placed before the `anyRequest().authenticated()` catch-all.

`ConversationService` reads from `AgentRepository` and `LlmModelRepository` directly. These are read-only lookups (findByIdAndOwnerId, findByIdAndIsEnabledTrue); no writes cross domain boundaries.

### Risk Assessment

- **`@OnDelete(SET_NULL)` and `ddl-auto=update`:** Hibernate `ddl-auto=update` does NOT modify existing FK constraints — it only adds new columns and tables. Since `conversation` is a brand-new table, the `ON DELETE SET NULL` constraint will be generated correctly on first startup. If this table already existed (e.g., from a prior migration), the constraint would need to be applied manually via SQL.
- **`QConversationEntity` does not exist until after a compile containing `ConversationEntity`.** `ConversationQueryProfile` will not compile until Step 2.5 is complete.
- **`LlmModelRepository.findByIdAndIsEnabledTrue()`** — this derived query method must be added to `LlmModelRepository` if it does not already exist. If the method is missing, the build will fail at runtime (Spring Data proxy generation). Verify at compile time.
- **`DefaultServiceImplements.update()` is a known no-op.** `ConversationService` overrides both `update()` and `getAll()` to throw `405` — do not call `super.update()` or `super.getAll()`.
- **`owner` FK is `LAZY`-loaded.** Repository methods use `employeeId` (Long) instead of `EmployeeEntity` objects, avoiding entity attachment concerns. The service always passes `currentEmployee.getId()`.
- **Deferred `MessageEntity` cascade:** When `MessageEntity` is built, its `conversation` FK must declare `@OnDelete(action = OnDeleteAction.CASCADE)`. Without it, deleting a conversation that has messages will throw a DB FK violation. Document this as a deferred dependency in the Message feature's risk section.
- **Model disabled mid-conversation:** `currentModel` is set at creation and updated only via PATCH. If an admin disables a model after a conversation is created using it, the stored FK still points to the disabled model. The PATCH model-switch endpoint re-validates `isEnabled`, so the employee can change to a new model. The `currentModel` FK is not auto-cleared on model disable — consistent with the `AppSettings.defaultModel` behavior documented in `known-issues.md`.

---

## Implementation Architecture

### Changes Required

#### 1. Security configuration update

**Purpose:** Gate all `/conversation/**` endpoints at the HTTP layer so only employees can reach conversation endpoints.

**Changes:** Add to `SecurityConfig.securityFilterChain()` before `anyRequest().authenticated()`:

```java
.requestMatchers("/conversation/**").hasRole("EMPLOYEE")
```

**File:** `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java`

---

#### 2. `ConversationEntity`

**Purpose:** Persist an Employee's chat session with its model and optional agent association.

**Package:** `backend/src/main/java/com/agentForgeBackend/models/conversation/`

**Changes:**

- Annotate with `@Entity` and `@Table(name = "conversation")`.
- Do not extend `BaseUserEntity` — standalone domain entity.
- Fields:

| Field | Column | Type | Constraints |
|-------|--------|------|-------------|
| `id` | `id` | `Long` | `@Id`, `@GeneratedValue(IDENTITY)` |
| `title` | `title` | `String` | `nullable = false` |
| `employee` | `employee_id` | `EmployeeEntity` | `@ManyToOne(fetch = LAZY)`, `@JoinColumn(name = "employee_id", nullable = false)` |
| `agent` | `agent_id` | `AgentEntity` | `@ManyToOne(fetch = LAZY)`, `@JoinColumn(name = "agent_id", nullable = true)`, `@OnDelete(action = OnDeleteAction.SET_NULL)` |
| `currentModel` | `current_model_id` | `LlmModelEntity` | `@ManyToOne(fetch = LAZY)`, `@JoinColumn(name = "current_model_id", nullable = false)` |
| `createdAt` | `created_at` | `LocalDateTime` | `nullable = false`, `updatable = false` |
| `updatedAt` | `updated_at` | `LocalDateTime` | `nullable = false` |

- `@PrePersist` sets both `createdAt` and `updatedAt` to `LocalDateTime.now()`.
- `@PreUpdate` sets only `updatedAt` to `LocalDateTime.now()`.
- Use Lombok `@Getter`, `@Setter`, `@NoArgsConstructor`.

---

#### 3. DTOs and `ConversationForm`

**Purpose:** Define safe API input/output contracts for employee-facing conversation operations.

**Changes:**

- `ConversationForm`: `title` (String, nullable — service auto-generates if blank), `modelId` (Long, `@NotNull`), `agentId` (Long, nullable). Employee is never accepted from the caller — derived from JWT principal.
- `ConversationModelSwitchForm`: `modelId` (Long, `@NotNull`) — request body for `PATCH /conversation/{id}/model`. Uses Lombok `@Data`, `@AllArgsConstructor`, `@NoArgsConstructor` to match existing form conventions.
- `ConversationTitleForm`: `title` (String, `@NotBlank`) — request body for `PATCH /conversation/{id}/title`. Uses Lombok `@Data`, `@AllArgsConstructor`, `@NoArgsConstructor`.
- `ConversationDTO`: `id`, `title`, `employeeId`, `agentId` (nullable), `currentModelId`, `createdAt`, `updatedAt` — full detail view.
- `ConversationMiniDTO`: `id`, `title`, `createdAt` — insert response.
- `ConversationListDTO`: `id`, `title`, `agentId` (nullable), `currentModelId`, `createdAt`, `updatedAt` — paginated list rows.

---

#### 4. `ConversationMapper`

**Purpose:** Convert `ConversationEntity` to DTOs without business logic.

**Changes:**

- Implement `DefaultMapper<ConversationDTO, ConversationMiniDTO, ConversationListDTO, ConversationForm, ConversationEntity>`.
- `toEntity(form)`: map `title` only (owner, agent, and model are set by the service, not the mapper).
- `toDTO`, `toSmallDTO`, `toListDTO`: map all respective fields; null-safe for `agentId` (nullable FK).
- `entity.getEmployee().getId()`, `entity.getAgent() != null ? entity.getAgent().getId() : null`, `entity.getCurrentModel().getId()` — all use Hibernate proxy `getId()` without triggering initialization.

---

#### 5. `ConversationRepository`

**Purpose:** Provide persistence and QueryDSL support for `ConversationEntity`.

**Changes:**

- Extend `DefaultRepository<ConversationEntity, Long>`.
- Add `Optional<ConversationEntity> findByIdAndEmployeeId(Long id, Long employeeId)` — ownership-scoped lookup used by service for all single-entity operations.

---

#### 6. `LlmModelRepository` — additive change

**Purpose:** Support enabled-model validation required by `ConversationService`.

**Changes:**

- Add `Optional<LlmModelEntity> findByIdAndIsEnabledTrue(Long id)` — this method does **not** currently exist in `LlmModelRepository` and must be added. `LlmModelService` is not injectable here because all its public methods require `@PreAuthorize("hasRole('ADMIN')")`, which would fail under employee security context. Direct repository injection is the correct approach for this cross-domain read-only lookup.

**File:** `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelRepository.java`

---

#### 7. `ConversationQueryProfile`

**Purpose:** Support QueryDSL filtering and sorting for the employee conversation list endpoint.

**Changes:**

- Declare filterable and sortable fields: `id` (number, sortable), `title` (string, sortable), `createdAt` (dateTime, sortable), `updatedAt` (dateTime, sortable).
- Declare filterable-only field: `agentId` (number, NOT sortable, nullable) — registered as `QueryableField.<ConversationEntity, Long>number("agentId", QConversationEntity.conversationEntity.agent.id, Long.class).nullable()`. This uses the standard `QueryableField` system with a nested FK path expression; no manual filter extraction or infrastructure changes needed. `.nullable()` adds `IS_NULL`/`IS_NOT_NULL` operators for free (enables "show general conversations with no agent"). Sorting by FK ID is not useful, so `.sortable()` is not called.
- Default sort: `updatedAt DESC`.
- `employee` is intentionally excluded — internal ownership FK, always auto-applied by the service.
- `currentModel` is intentionally excluded — FK predicate not useful for employee-facing list.

---

#### 8. `ConversationService`

**Purpose:** Own all Conversation business rules: ownership enforcement, model validation, agent ownership validation, title auto-generation, ownership-scoped list, and PATCH mutations.

**Changes:**

- Extend `DefaultServiceImplements<ConversationDTO, ConversationMiniDTO, ConversationListDTO, ConversationForm, ConversationEntity, Long>`.
- Inject `ConversationRepository`, `ConversationMapper`, `LlmModelRepository`, `AgentRepository`, `AuthUserUtil`, and the query infrastructure.
- Apply `@PreAuthorize("hasRole('EMPLOYEE')")` to all public methods.
- **`insert(form)`:**
  - Load current employee via `AuthUserUtil.getAuthUserEmployeeEntity()`.
  - Validate `modelId` is not null (covered by `@NotNull` on form).
  - Look up `LlmModelRepository.findByIdAndIsEnabledTrue(form.getModelId())` — throw `ItemNotFoundException` if absent or disabled.
  - If `form.getAgentId()` is non-null: call `agentRepository.findByIdAndOwnerId(form.getAgentId(), currentEmployee.getId())` — throw `ItemNotFoundException` if absent or not owned.
  - Resolve title: if `form.getTitle()` is blank or null, set `"New Conversation"`.
  - Map form to entity; set `employee`, `currentModel`, and optionally `agent`; save; return `ConversationMiniDTO`.
- **`getOne(id)`:**
  - Load current employee.
  - Use `repository.findByIdAndEmployeeId(id, currentEmployee.getId())` — throw `ItemNotFoundException` if absent.
  - Return `ConversationDTO`.
- **`delete(id)`:**
  - Load current employee.
  - Use `repository.findByIdAndEmployeeId(id, currentEmployee.getId())` — throw `ItemNotFoundException` if absent.
  - Hard delete; return `ConversationDTO` of the deleted entity.
- **`getListPage(request)`:**
  - Load current employee.
  - Build ownership predicate: `QConversationEntity.conversationEntity.employee.id.eq(currentEmployee.getId())`.
  - AND it with the user-supplied predicate (which may include an `agentId` filter — handled by the standard `QueryPredicateBuilder` via the `agentId` field registered in `ConversationQueryProfile` with the nested FK path expression).
  - Delegate to the query engine with the combined predicate.
- **`getAll()`:** Override to throw `ResponseStatusException(HttpStatus.METHOD_NOT_ALLOWED, "Use POST /conversation/list for scoped conversation retrieval")`.
- **`update(id, form)`:** Override to throw `ResponseStatusException(HttpStatus.METHOD_NOT_ALLOWED, "Use PATCH /conversation/{id}/title or PATCH /conversation/{id}/model")`.
- **`switchModel(Long id, Long modelId)`** (custom method, called by controller PATCH):
  - Load current employee.
  - Use `repository.findByIdAndEmployeeId(id, currentEmployee.getId())` — throw `ItemNotFoundException` if absent.
  - Look up `LlmModelRepository.findByIdAndIsEnabledTrue(modelId)` — throw `ItemNotFoundException` if absent or disabled.
  - Set `conversation.setCurrentModel(model)`; save; return `ConversationDTO`.
- **`updateTitle(Long id, String title)`** (custom method, called by controller PATCH):
  - Load current employee.
  - Use `repository.findByIdAndEmployeeId(id, currentEmployee.getId())` — throw `ItemNotFoundException` if absent.
  - Validate `title` is not blank — throw `InvalidInsertDetails` if blank.
  - Set `conversation.setTitle(title)`; save; return `ConversationDTO`.

---

#### 9. `ConversationController`

**Purpose:** Expose employee-facing Conversation endpoints including two custom PATCH endpoints.

**Changes:**

- Annotate with `@RestController` and `@RequestMapping("/conversation")`.
- Extend `DefaultController<ConversationDTO, ConversationMiniDTO, ConversationListDTO, ConversationForm, Long>`.
- Inject `ConversationService` explicitly as a second field (`private final ConversationService conversationService`) alongside the inherited `defaultService`, matching the `LlmModelController` dual-injection pattern. The inherited `defaultService` is typed as `DefaultService<...>` and cannot reach custom methods; the concrete field is used for PATCH endpoints.
- Add `@PatchMapping("/{id}/model")` — accepts `@Valid @RequestBody ConversationModelSwitchForm` request body; delegates to `conversationService.switchModel(id, form.getModelId())`.
- Add `@PatchMapping("/{id}/title")` — accepts `@Valid @RequestBody ConversationTitleForm` request body; delegates to `conversationService.updateTitle(id, form.getTitle())`.

---

## Implementation Steps

### Phase 1: Security baseline

- [ ] **Step 1.1:** Write failing security tests that verify: anonymous requests to `/conversation/**` receive `401`; authenticated `ROLE_EMPLOYEE` requests receive a non-401/403 status (404 before the controller exists); requests with `ROLE_ADMIN` receive `403`. Use `@WithMockUser` in this phase — real JWT tests belong in Phases 3–4.
- [ ] **Step 1.2:** Add `.requestMatchers("/conversation/**").hasRole("EMPLOYEE")` to `SecurityConfig.securityFilterChain()` so the failing security tests pass.

### Phase 2: Domain foundation

- [ ] **Step 2.1:** Create `ConversationEntity` with all fields, `@ManyToOne` FKs (`employee` non-null, `agent` nullable + `@OnDelete(SET_NULL)`, `currentModel` non-null), and `@PrePersist`/`@PreUpdate` timestamp lifecycle hooks.
- [ ] **Step 2.2:** Create `ConversationForm`, `ConversationDTO`, `ConversationMiniDTO`, `ConversationListDTO`.
- [ ] **Step 2.3:** Create `ConversationMapper` implementing `DefaultMapper`.
- [ ] **Step 2.4:** Create `ConversationRepository` with `findByIdAndEmployeeId`. Add `LlmModelRepository.findByIdAndIsEnabledTrue(Long id)` — this method does not exist and must be added (see Section 6: LlmModelRepository additive change).
- [ ] **Step 2.5:** Compile the backend (`./mvnw compile -pl backend`) to generate `QConversationEntity` via QueryDSL APT.

### Phase 3: Business rules and CRUD

- [ ] **Step 3.1:** Create `ConversationQueryProfile` with `id`, `title`, `createdAt`, `updatedAt` (filterable + sortable) and `agentId` (filterable only); default sort `updatedAt DESC`.
- [ ] **Step 3.2:** Create `ConversationService` with all overrides: ownership-scoped `insert`, `getOne`, `delete`, `getListPage`; `getAll()` → 405; `update()` → 405; `switchModel()`; `updateTitle()`.
- [ ] **Step 3.3:** Create `ConversationController` at `/conversation` with the inherited endpoints and two custom PATCH mappings.
- [ ] **Step 3.4:** Smoke-test with real employee JWT: create a conversation (general and agent), retrieve it, switch model, rename, delete.

### Phase 4: Regression and supplemental coverage

- [ ] **Step 4.1:** Repository edge cases — `findByIdAndEmployeeId` returns empty for wrong employee, timestamps auto-set on persist, `updatedAt` refreshed on update. **`@OnDelete(SET_NULL)` cascade test:** insert a Conversation with an Agent FK, delete the Agent, assert the Conversation's `agent` field is now null (verifies H2 honors the `ON DELETE SET NULL` constraint generated by Hibernate's `@OnDelete`). If H2 does not honor it, document the limitation and move this test to Docker PostgreSQL only.
- [ ] **Step 4.2:** Mapper contract tests — all DTO variants, null-safety for `agentId`, FK proxy `getId()` calls succeed without lazy-load (using `entityManager.getReference()`).
- [ ] **Step 4.3:** Service business-rule tests — ownership 404, disabled model rejected, non-owned agent rejected, null title auto-fills `"New Conversation"`, list scoped to current employee, `switchModel` rejects disabled model, `updateTitle` rejects blank string.
- [ ] **Step 4.4:** Controller HTTP contract tests — `POST /conversation` returns `ConversationMiniDTO`, `GET /conversation/{id}` returns `ConversationDTO`, `DELETE /conversation/{id}` returns `ConversationDTO`, `PATCH /conversation/{id}/model` updates model, `PATCH /conversation/{id}/title` updates title, `PUT /conversation/{id}` returns `405`, `GET /conversation` returns `405`, `POST /conversation/list` returns only current employee's conversations, `401` for anonymous, `403` for admin.
- [ ] **Step 4.5:** Query profile edge cases — filter by `agentId`, sort by `updatedAt`, rejection of `employee` and `currentModel` as filter fields.
- [ ] **Step 4.6:** Run full `./mvnw test` to confirm no regressions in Agent, Admin, Employee, LlmModel, AppSettings, or security tests.

---

## Potential Issues / Risks

- **`@OnDelete(SET_NULL)` requires nullable FK column.** The `agent_id` column must be declared nullable (`nullable = true` on `@JoinColumn`). If `nullable = false` is accidentally used, Hibernate will create a `NOT NULL` constraint that is incompatible with `ON DELETE SET NULL`.
- **`ddl-auto=update` does not alter existing FK constraints.** The `ON DELETE SET NULL` behavior is only guaranteed if the `conversation` table is new. If the table was created before this annotation was added, the constraint must be applied manually.
- **`QConversationEntity` does not exist until after a compile containing `ConversationEntity`.** `ConversationQueryProfile` references `QConversationEntity` — it will not compile until Step 2.5 completes.
- **`LlmModelRepository.findByIdAndIsEnabledTrue()` must exist.** If the method is absent, Spring Data fails at boot time when generating the proxy. Verify at Step 2.4.
- **`DefaultServiceImplements.update()` is a known no-op.** `ConversationService` overrides `update()` to throw `405` — do not call `super.update()`.
- **Deferred `MessageEntity` CASCADE.** When `MessageEntity` is built, its `conversation` FK must declare `@OnDelete(action = OnDeleteAction.CASCADE)`. Without it, hard-deleting a conversation with messages will throw a DB FK violation. Document this as a deferred constraint in the Message feature.
- **Model disabled mid-conversation.** If an admin disables the model currently set on a conversation, the `currentModel` FK is not auto-cleared. The employee must switch to a new enabled model via `PATCH /conversation/{id}/model`. This is consistent with `AppSettings.defaultModel` behavior.

---

## Testing Decisions

Good tests for this feature verify observable behavior through public interfaces. Tests must not assert on private methods, QueryDSL predicate internals, or internal mapper fields not exposed in the DTO. The most valuable tests exercise repository persistence, service business rules, and controller authorization flows end-to-end.

Testing decisions:
- Use TDD in vertical slices: one failing behavior test → minimal implementation → repeat. Each module's first behavior tests are written within its implementation phase (Phases 1–3), not deferred to Phase 4.
- Repository tests: use `@DataJpaTest` against H2. Verify `findByIdAndEmployeeId` returns empty for a wrong-employee conversation, timestamps auto-set, and FKs persist correctly. Include a targeted `@OnDelete(SET_NULL)` cascade test: insert a Conversation with an Agent, delete the Agent, assert the Conversation's `agent` is null. This is the first `@OnDelete` usage in the codebase — if H2 does not honor the constraint, document the limitation and test under Docker PostgreSQL only.
- Mapper tests: instantiate `ConversationMapper` directly (no Spring context). Assert DTO field values, null-safety for `agentId`, and that FK proxy `getId()` calls do not trigger lazy initialization.
- Service tests: use `@SpringBootTest` with `@ActiveProfiles("test")`. Seed an owner employee, a second employee, an enabled model, and a disabled model. Verify: wrong-employee access returns `ItemNotFoundException`, disabled model on creation returns `ItemNotFoundException`, non-owned agent returns `ItemNotFoundException`, null title inserts `"New Conversation"`, list returns only current employee's conversations.
- Controller tests: use MockMvc with `@SpringBootTest`. Use `TestAuthenticationHelper` to generate employee and admin JWTs. Assert `401` for anonymous, `403` for admin, `404` for cross-employee access, correct JSON shape for all CRUD and PATCH endpoints, `405` for `PUT` and `GET /`.

Prior art:
- `backend/src/test/java/com/agentForgeBackend/models/agent/AgentControllerTest.java`
- `backend/src/test/java/com/agentForgeBackend/models/agent/AgentServiceCrudIntegrationTest.java`
- `backend/src/test/java/com/agentForgeBackend/models/agent/AgentRepositoryTest.java`
- `backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java`
- `backend/src/test/java/com/agentForgeBackend/testUtils/TestAuthenticationHelper.java`

Modules to test:
- `ConversationEntity` persistence through `@DataJpaTest` repository tests.
- `ConversationMapper` DTO contract behavior and null-safety.
- `ConversationService` business rules: ownership, model validation, agent ownership validation, title auto-generation, list scoping, PATCH mutations.
- `ConversationController` endpoint HTTP contract: routes, status codes, JSON shape, `401`/`403`/`404`/`405`.
- `ConversationQueryProfile` filter/sort safety (via service integration tests).

---

## Task Breakdown

### Task 1: Security Baseline for Conversation Endpoints

- **Steps Covered:** Step 1.1, Step 1.2
- **Reason for Grouping:** Security must be enforced at the route level before any controller exists; focused, low-complexity change with a clear test gate.
- **Planned Task File:** `Conversation-Entity-and-Employee-Crud-step-1-security-baseline.md`
- **Task Document Link:** [[Conversation-Entity-and-Employee-Crud-step-1-security-baseline]]

### Task 2: Conversation Domain Foundation

- **Steps Covered:** Step 2.1, Step 2.2, Step 2.3, Step 2.4, Step 2.5
- **Reason for Grouping:** Entity, DTOs, mapper, and repository define the domain shape and can be created together before business behavior is wired. The compile step generates the Q-class needed for Phase 3. The `@OnDelete(SET_NULL)` constraint on the agent FK is resolved here.
- **Planned Task File:** `Conversation-Entity-and-Employee-Crud-step-2-domain-foundation.md`
- **Task Document Link:** [[Conversation-Entity-and-Employee-Crud-step-2-domain-foundation]]

### Task 3: Business Rules and CRUD

- **Steps Covered:** Step 3.1, Step 3.2, Step 3.3, Step 3.4
- **Reason for Grouping:** Query profile, service, and controller behavior are tightly coupled around the Conversation CRUD and PATCH use cases; ownership logic, model validation, and agent ownership validation all run through the service layer.
- **Planned Task File:** `Conversation-Entity-and-Employee-Crud-step-3-business-rules-and-crud.md`
- **Task Document Link:** Add when the task document is created.

### Task 4: Regression and Supplemental Coverage

- **Steps Covered:** Step 4.1, Step 4.2, Step 4.3, Step 4.4, Step 4.5, Step 4.6
- **Reason for Grouping:** Supplemental tests for edge cases, contract completeness, and full regression after all modules are assembled. First behavior tests for each module are written within their implementation task following TDD.
- **Planned Task File:** `Conversation-Entity-and-Employee-Crud-step-4-regression-coverage.md`
- **Task Document Link:** [[Conversation-Entity-and-Employee-Crud-step-4-regression-coverage]]
