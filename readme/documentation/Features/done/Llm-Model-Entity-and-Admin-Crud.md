#high #new-feature #backend

## Feature: LlmModel Entity and Admin CRUD

### Description

Add a `LlmModelEntity` to the AgentForge backend. This entity represents a single OpenRouter model that an Admin has chosen to make available in the system. Admins can create, list, update, enable, and disable models. Employees cannot access any LlmModel management endpoint — they will see only enabled models through a future Conversation-scoped endpoint (deferred per design decision during this feature's planning).

This feature does not include the OpenRouter proxy endpoint (`GET /admin/llm-models/available`) or the employee-facing model picker — both are deferred to future features. It also does not build `AppSettingsEntity`. The `LlmModelEntity` slice is foundational: it is a dependency for `AppSettingsEntity`, `ConversationEntity`, and `MessageEntity`, all of which carry FKs to it.

Design decisions confirmed during feature creation:
- Primary key is `Long` with auto-increment (consistent with all existing entities; see [[ADRs/ADR-009-long-primary-key-for-all-entities]]).
- Package lives at `models/llm/` — a top-level peer of `models/hq/`, not nested under the admin domain, because future entities outside admin (Conversation, Message) will import it.
- Hard-delete is blocked at the service layer; `InvalidDeleteOperation` is thrown if attempted. Enable/disable is the only removal mechanism, via a `PATCH /llm-model/{id}/toggle` endpoint.
- The OpenRouter proxy endpoint (`GET /admin/llm-models/available`) is deferred to a future `OpenRouterService` feature.
- The employee-facing "list enabled models" endpoint is deferred to the `ConversationEntity` feature where it will actually be consumed.

---

## Problem Statement

Admins need to control which LLM models are available to employees. Without a curated model list, employees could use any model string — including expensive or inappropriate ones — with no oversight. `LlmModelEntity` is also a required FK target for `ConversationEntity` and `MessageEntity`, so no chat functionality can be built until this entity exists.

---

## User Stories

1. As an Admin, I want to add a model by providing its OpenRouter `modelId`, name, and optional description, so that it appears in the system's available model list.
2. As an Admin, I want a newly added model to start as enabled by default, so that it is immediately usable without a second action.
3. As an Admin, I want to list all models in the system with pagination, filtering, and sorting, so that I can manage a large model catalog.
4. As an Admin, I want to filter the model list by `isEnabled`, `name`, `modelId`, and `createdAt`, so that I can find specific models quickly.
5. As an Admin, I want to sort the model list by any of its filterable fields, so that I can view models in a meaningful order.
6. As an Admin, I want to retrieve a single model by ID, so that I can inspect its full details before editing.
7. As an Admin, I want to update a model's `name`, `description`, and `modelId`, so that I can correct or improve model metadata.
8. As an Admin, I want to toggle a model's enabled state with a single endpoint, so that I can enable or disable a model without sending a full update payload.
9. As an Admin, I want to be prevented from hard-deleting a model, so that existing conversation and message records that reference it are not orphaned.
10. As an Admin, I want the system to reject a model insert or update if the `modelId` already exists in the system, so that duplicate model registrations are prevented.
11. As a backend maintainer, I want `LlmModelEntity` to live in `models/llm/` separate from `models/hq/admin/`, so that future entities like `ConversationEntity` and `MessageEntity` can import it without creating cross-domain dependencies.
12. As a backend maintainer, I want `/llm-model/**` endpoints to require `ROLE_ADMIN` at the HTTP security layer, so that unauthorized access is blocked before reaching the service.
13. As a backend maintainer, I want `LlmModelService` to enforce admin-only access with `@PreAuthorize("hasRole('ADMIN')")` on every method, so that the constraint is enforced at the method level independent of route configuration.
14. As a backend maintainer, I want `LlmModelEntity` to use a `Long` primary key with auto-increment, consistent with all other entities (see [[ADRs/ADR-009-long-primary-key-for-all-entities]]), so that the persistence layer is uniform.
15. As a backend maintainer, I want the model list to be queryable through the same `POST /llm-model/list` pattern as Admin and Employee, so that list endpoints are consistent across all domains.
16. As a QA engineer, I want repository tests for `LlmModelEntity` persistence and uniqueness, so that the entity mapping and constraint behavior are verified.
17. As a QA engineer, I want service tests for admin-only access, modelId uniqueness enforcement, blocked delete, and toggle behavior, so that business rules are verified at the service boundary.
18. As a QA engineer, I want controller tests for the HTTP contract including the PATCH toggle endpoint and 403/401 responses, so that the API surface is verified end-to-end.

---

## Solution

Add a new `LlmModel` slice under `backend/src/main/java/com/agentForgeBackend/models/llm/`. The slice follows the established Admin/Employee scaffold: entity → DTOs → form → mapper → repository → query profile → service → controller. It diverges from that scaffold in one place: the `delete()` method is blocked and replaced by a `toggleEnabled()` method exposed via `PATCH /{id}/toggle`.

### Scope

Impacted workflows and systems:

- New domain module: `models/llm/` with full CRUD scaffold.
- Security configuration: `/llm-model/**` route added to the HTTP authorization matrix.
- Admin-facing REST endpoints: `GET`, `POST`, `PUT`, `DELETE` (blocked), `PATCH /toggle`, `POST /list`.
- QueryDSL compile step required after entity creation to generate `QLlmModelEntity`.

Out of scope for this feature:

- `GET /admin/llm-models/available` — OpenRouter catalog proxy (deferred to `OpenRouterService` feature).
- Employee-facing "list enabled models" endpoint — deferred to `ConversationEntity` feature.
- `AppSettingsEntity` — separate feature.
- Frontend model management screens.

### Affected Systems / Modules

- [[Memory/architecture|Architecture]] — New non-user entity domain; no JOINED inheritance.
- [[Memory/tech|Tech Stack]] — Uses Spring Boot 3.4.1, Spring Security, Spring Data JPA, QueryDSL, JUnit 5, H2 test profile.
- [[ADRs/ADR-007-admin-curated-llm-model-list]] — This feature directly implements the decision described in ADR-007.
- [[ADRs/ADR-009-long-primary-key-for-all-entities]] — PK type decision.
- `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java` — Add `/llm-model/**` to the authorization matrix.
- `backend/src/main/java/com/agentForgeBackend/shared/defaultImplements/DefaultServiceImplements.java` — Base class extended by `LlmModelService`.
- `backend/src/main/java/com/agentForgeBackend/shared/defaultImplements/DefaultController.java` — Base class extended by `LlmModelController`.
- `backend/src/main/java/com/agentForgeBackend/shared/defaultInterfaces/DefaultRepository.java` — Base interface extended by `LlmModelRepository`.

### Impact Analysis

`LlmModelEntity` has no FKs to existing entities — it is a root dependency for future entities. Adding it introduces no risk to the existing Admin, Employee, or Client domains. The only cross-cutting change is the `SecurityConfig` update to add `/llm-model/**` to the authorization matrix; this follows the established pattern used for `/employee/**` and `/admin/**` in Task 1 of the Employee feature.

### Risk Assessment

- **QueryDSL APT**: `QLlmModelEntity` is generated at compile time. A full Maven compile is required after creating `LlmModelEntity` before the query profile can reference it. Stale Q-classes will cause build failures.
- **modelId uniqueness**: The `modelId` column has a `unique = true` constraint. If service-layer uniqueness checks are missing, a duplicate insert will surface as a `DataIntegrityViolationException` from the database rather than a domain-level `ItemAlreadyExist`. Service-layer checks must be present and tested.
- **`DefaultServiceImplements.update()` is incomplete**: The base `update()` does not apply form data (known issue). `LlmModelService` must override `update()` fully.
- **`isEnabled` flip semantics**: The toggle endpoint must read the current state from the database and invert it — not accept a target state from the caller. This prevents race conditions where two admins simultaneously toggle the same model and one loses their intent.

---

## Implementation Architecture

### Changes Required

#### 1. Security configuration update

**Purpose:** Gate all `/llm-model/**` endpoints at the HTTP layer so unauthenticated and non-admin requests are blocked before reaching the controller.

**Changes:**

Add to `SecurityConfig.securityFilterChain()` before the `anyRequest().authenticated()` catch-all:

```java
.requestMatchers("/llm-model/**").hasRole("ADMIN")
```

**File:** `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java`

---

#### 2. `LlmModelEntity`

**Purpose:** Represent a persisted OpenRouter model that the admin has added to the system.

**Package:** `backend/src/main/java/com/agentForgeBackend/models/llm/`

**Changes:**

- Annotate with `@Entity` and `@Table(name = "llm_model")`.
- Do **not** extend `BaseUserEntity` — this is a standalone domain entity, not a user.
- Fields:

| Field | Column | Type | Constraints |
|-------|--------|------|-------------|
| `id` | `id` | `Long` | `@Id`, `@GeneratedValue(IDENTITY)` |
| `modelId` | `model_id` | `String` | `nullable = false`, `unique = true` |
| `name` | `name` | `String` | `nullable = false` |
| `description` | `description` | `String` | nullable |
| `isEnabled` | `is_enabled` | `Boolean` | `nullable = false`, field initializer `= true` (mirrors `BaseUserEntity` pattern) |
| `createdAt` | `created_at` | `LocalDateTime` | `nullable = false`, `updatable = false`, set via `@PrePersist` |

- Use `@PrePersist` to auto-set `createdAt` on insert.
- Use Lombok `@Getter`, `@Setter`, `@NoArgsConstructor`.

---

#### 3. DTOs and `LlmModelForm`

**Purpose:** Define safe API input/output contracts for admin operations.

**Changes:**

- `LlmModelForm`: `modelId` (`@NotBlank`), `name` (`@NotBlank`), `description` (nullable). `isEnabled` is intentionally excluded — new models start enabled via entity field initializer; state changes are exclusively managed by `PATCH /{id}/toggle` per ADR-007.
- `LlmModelDTO`: `id`, `modelId`, `name`, `description`, `isEnabled`, `createdAt` — full detail view.
- `LlmModelMiniDTO`: `id`, `modelId`, `name`, `isEnabled` — insert/compact response.
- `LlmModelListDTO`: `id`, `modelId`, `name`, `description`, `isEnabled`, `createdAt` — paginated list rows.

---

#### 4. `LlmModelMapper`

**Purpose:** Convert `LlmModelEntity` to DTOs and `LlmModelForm` to entity without business logic.

**Changes:**

- Implement `DefaultMapper<LlmModelDTO, LlmModelMiniDTO, LlmModelListDTO, LlmModelForm, LlmModelEntity>`.
- `toEntity(form)`: map `modelId`, `name`, and `description`; skip null values (follow existing `AdminMapper.toEntity()` null-skip pattern). `isEnabled` is not in the form — entity field initializer provides the default.
- `toDTO`, `toSmallDTO`, `toListDTO`: map all fields; null-check `description`.
- Do not encode or transform `modelId` — it is stored as-is.

---

#### 5. `LlmModelRepository`

**Purpose:** Provide persistence and QueryDSL support for `LlmModelEntity`.

**Changes:**

- Extend `DefaultRepository<LlmModelEntity, Long>`.
- Add `Optional<LlmModelEntity> findByModelId(String modelId)`.
- Add `boolean existsByModelId(String modelId)`.

---

#### 6. `LlmModelQueryProfile`

**Purpose:** Support safe QueryDSL filtering and sorting for the admin list endpoint.

**Changes:**

- Declare filterable and sortable fields:
  - `id` (number, sortable)
  - `modelId` (string, sortable)
  - `name` (string, sortable)
  - `isEnabled` (boolean, sortable)
  - `createdAt` (dateTime, sortable)
- Default sort: `id ASC`.
- `description` is intentionally excluded from query fields (free-text search on descriptions is out of scope for MVP).

---

#### 7. `LlmModelService`

**Purpose:** Own `LlmModel` business rules and enforce admin-only access.

**Changes:**

- Extend `DefaultServiceImplements<LlmModelDTO, LlmModelMiniDTO, LlmModelListDTO, LlmModelForm, LlmModelEntity, Long>`.
- Apply `@PreAuthorize("hasRole('ADMIN')")` to all overridden public methods.
- Override `insert()`:
  - Reject null or blank `modelId` and `name` with `InvalidInsertDetails`.
  - Call `repository.existsByModelId(form.getModelId())` — throw `ItemAlreadyExist` if true.
  - Save and return `LlmModelMiniDTO`.
- Override `update()`:
  - Load entity; throw `ItemNotFoundException` if missing.
  - If `modelId` is changing, call `repository.existsByModelId(newModelId)` and throw `ItemAlreadyExist` if another entity already holds it.
  - Apply non-null `modelId`, `name`, and `description` from the form to the entity; save; return `LlmModelDTO`. `isEnabled` is not in the form and is exclusively managed by `toggleEnabled()`.
- Override `delete()`:
  - Always throw `InvalidDeleteOperation("LLM models cannot be deleted. Use toggle to disable.")`.
- Add `toggleEnabled(Long id)`:
   - Load entity; throw `ItemNotFoundException` if missing.
   - Flip `entity.getIsEnabled()` to its inverse.
   - Save; return `LlmModelDTO`.
   - Annotate with `@PreAuthorize("hasRole('ADMIN')")`.
   - Transaction coverage: inherited from `DefaultServiceImplements`'s class-level `@Transactional(rollbackFor = {...})` — no method-level `@Transactional` needed (mirrors `AdminServiceImpl` convention).

---

#### 8. `LlmModelController`

**Purpose:** Expose admin LlmModel management endpoints through the existing controller scaffold, with one additional toggle endpoint.

**Changes:**

- Annotate with `@RestController` and `@RequestMapping("/llm-model")`.
- Extend `DefaultController<LlmModelDTO, LlmModelMiniDTO, LlmModelListDTO, LlmModelForm, Long>`.
- Inject `LlmModelService` using the typed-field + super pattern to safely access `toggleEnabled` without casting `defaultService`:
  ```java
  private final LlmModelService llmModelService;
  
  public LlmModelController(LlmModelService service) {
      super(service);
      this.llmModelService = service;
  }
  ```
  This is type-safe and proxy-safe: `DefaultController` accepts the service as a `DefaultService`, and the typed `llmModelService` field holds a direct reference to the concrete bean — no cast involved.
- Add:
  ```java
  @PatchMapping("/{id}/toggle")
  public ResponseEntity<LlmModelDTO> toggle(@PathVariable Long id) throws ItemNotFoundException {
      return ResponseEntity.ok(llmModelService.toggleEnabled(id));
  }
  ```
- The inherited `DELETE /{id}` remains wired but will always return `400 InvalidDeleteOperation` from the service.

---

## Implementation Steps

### Phase 1: Security baseline

- [x] **Step 1.1:** Write a failing security test using `@WithMockUser` (Phase 1 exception: no controller exists yet, so real JWT via `TestAuthenticationHelper` is not applicable — Phase 3-4 controller tests will use the full JWT pattern). Verify: anonymous requests to `/llm-model/**` receive `401`; `@WithMockUser(roles = "ADMIN")` requests receive a non-401/403 status (`200` once the controller exists, `404` before it — both confirm the security rule fires correctly). `ROLE_EMPLOYEE` requests receive `403`.
- [x] **Step 1.2:** Add `/llm-model/**` → `hasRole("ADMIN")` to `SecurityConfig` so the failing security tests pass.

### Phase 2: LlmModel domain foundation

- [x] **Step 2.1:** Create `LlmModelEntity` with all fields, `@PrePersist` for `createdAt`, proper column constraints.
- [x] **Step 2.2:** Create `LlmModelForm`, `LlmModelDTO`, `LlmModelMiniDTO`, `LlmModelListDTO`.
- [x] **Step 2.3:** Create `LlmModelMapper` implementing `DefaultMapper`.
- [x] **Step 2.4:** Create `LlmModelRepository` with `findByModelId` and `existsByModelId`.
- [x] **Step 2.5:** Compile the backend (`./mvnw compile -pl backend`) to generate `QLlmModelEntity` via QueryDSL APT.

### Phase 3: Business rules and CRUD

- [x] **Step 3.1:** Create `LlmModelQueryProfile` with the declared filterable/sortable fields and default sort.
- [x] **Step 3.2:** Create `LlmModelService` with admin-only overrides, `modelId` uniqueness, blocked delete, and `toggleEnabled`.
- [x] **Step 3.3:** Create `LlmModelController` with `@RequestMapping("/llm-model")` and the `PATCH /{id}/toggle` endpoint.
- [x] **Step 3.4:** Verify that `DELETE /llm-model/{id}` returns `400` and that `PATCH /llm-model/{id}/toggle` correctly inverts `isEnabled`.

### Phase 4: Regression and supplemental coverage

- [x] **Step 4.1:** Repository edge cases — `modelId` unique constraint, `createdAt` auto-set on persist, `findByModelId` returns empty for unknown modelId.
- [x] **Step 4.2:** Mapper contract tests — all DTO variants, null `description` safety, `isEnabled` default behavior.
- [x] **Step 4.3:** Service business-rule tests — duplicate `modelId` on insert and update, blocked delete message, toggle from enabled→disabled and disabled→enabled, admin-only access for all methods.
- [x] **Step 4.4:** Controller HTTP contract tests — `POST /llm-model` creates and returns `LlmModelMiniDTO`, `PUT /llm-model/{id}` updates, `DELETE /llm-model/{id}` returns `400`, `PATCH /llm-model/{id}/toggle` returns updated `LlmModelDTO`, `POST /llm-model/list` paginates and filters.
- [x] **Step 4.5:** Query profile edge cases — filter by `isEnabled`, sort by `createdAt`, rejection of unknown fields (e.g., `description`).
- [x] **Step 4.6:** Run full `./mvnw test` to confirm no regressions in Admin, Employee, Client, or security tests.

---

## Potential Issues / Risks

- `DefaultServiceImplements.update()` is a known no-op base implementation. `LlmModelService` must override it completely — do not call `super.update()`.
- `QLlmModelEntity` does not exist until after a compile containing `LlmModelEntity`. The `LlmModelQueryProfile` will not compile until Step 2.5 is complete.
- `@PrePersist` on `createdAt` is the correct approach for auto-timestamping; do not rely on `@Column(insertable = false, updatable = false)` with a database default — Hibernate's DDL auto does not reliably create database-level defaults across all environments.
- The `isEnabled` field should be `Boolean` (boxed) rather than `boolean` (primitive) in the entity. The entity field initializer (`= true`) provides the default; `Boolean` avoids accidental primitive coercion in JPA and QueryDSL predicate contexts.
- ADR-007 forbids caching the enabled model list indefinitely — when the employee-facing read endpoint is built in a future feature, ensure it does not apply a cache with an unbounded or very long TTL.

---

## Testing Decisions

Good tests for this feature verify observable behavior through public interfaces. Internal mapper logic, private helpers, and QueryDSL predicate wiring should not be tested directly; they are tested through service and controller behavior.

Test strategy:
- Use TDD in vertical slices: one failing behavior test → minimal implementation → refactor. Each module's first behavior tests are written within its implementation phase (Phases 1–3), not deferred to Phase 4.
- Repository tests: exercise `LlmModelRepository` against H2 using `@DataJpaTest`. Verify persistence, auto-timestamp, and uniqueness constraint behavior.
- Mapper tests: instantiate `LlmModelMapper` directly (no Spring context). Assert DTO field values, null-safety for `description`, and `isEnabled` default.
- Service tests: use `@SpringBootTest` with `@ActiveProfiles("test")` to run against H2. Seed data via repository. Assert business rules at the service interface.
- Controller tests: use `MockMvc` with `@WebMvcTest` or `@SpringBootTest`. Assert HTTP status codes, JSON shape, validation error responses, and `403`/`401` for unauthorized callers.
- Query profile tests: embed in service integration tests by sending `POST /llm-model/list` requests with various filter and sort payloads.

Prior art:
- `backend/src/test/java/com/agentForgeBackend/models/hq/admin/AdminRepositoryQuerydslIntegrationTest.java`
- `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeServiceCrudIntegrationTest.java`
- `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeControllerListEndpointTest.java`
- `backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java`

Modules to test:
- `LlmModelEntity` persistence through repository tests.
- `LlmModelMapper` DTO/form behavior.
- `LlmModelService` business rules and authorization.
- `LlmModelController` endpoint HTTP contract including `PATCH /{id}/toggle`.
- `LlmModelQueryProfile` list/filter/sort safety.

---

## Task Breakdown

### Task 1: Security Baseline for LlmModel Endpoints

- **Steps Covered:** Step 1.1, Step 1.2
- **Reason for Grouping:** Security must be enforced at the route level before any controller exists; this is a focused, low-complexity change with a clear test gate.
- **Planned Task File:** `Llm-Model-Entity-and-Admin-Crud-step-1-security-baseline.md`
- **Task Document Link:** [[Tasks/done/Llm-Model-Entity-and-Admin-Crud-step-1-security-baseline]] ✅ **COMPLETED**

### Task 2: LlmModel Domain Foundation

- **Steps Covered:** Step 2.1, Step 2.2, Step 2.3, Step 2.4, Step 2.5
- **Reason for Grouping:** Entity, DTOs, mapper, and repository define the domain shape and can be created together before business behavior is wired.
- **Planned Task File:** `Llm-Model-Entity-and-Admin-Crud-step-2-domain-foundation.md`
- **Task Document Link:** [[Tasks/done/Llm-Model-Entity-and-Admin-Crud-step-2-domain-foundation]] ✅ **COMPLETED**

### Task 3: Business Rules, CRUD, and Toggle

- **Steps Covered:** Step 3.1, Step 3.2, Step 3.3, Step 3.4
- **Reason for Grouping:** Query profile, service, and controller behavior are tightly coupled; the toggle endpoint is a natural extension of the controller and belongs here.
- **Planned Task File:** `Llm-Model-Entity-and-Admin-Crud-step-3-business-rules-crud-toggle.md`
- **Task Document Link:** [[Tasks/done/Llm-Model-Entity-and-Admin-Crud-step-3-business-rules-crud-toggle]] ✅ **COMPLETED**

### Task 4: Regression and Supplemental Coverage

- **Steps Covered:** Step 4.1, Step 4.2, Step 4.3, Step 4.4, Step 4.5, Step 4.6
- **Reason for Grouping:** Supplemental tests for edge cases, contract completeness, and full regression after all modules are assembled. First behavior tests for each module are written within their implementation task following TDD.
- **Planned Task File:** `Llm-Model-Entity-and-Admin-Crud-step-4-regression-coverage.md`
- **Task Document Link:** [[Tasks/done/Llm-Model-Entity-and-Admin-Crud-step-4-regression-coverage]] ✅ **COMPLETED**
