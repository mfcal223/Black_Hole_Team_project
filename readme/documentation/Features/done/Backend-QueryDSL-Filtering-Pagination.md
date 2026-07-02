#high #new-feature #backend #querydsl #pagination #filtering #architectural

## Feature: Backend QueryDSL Filtering And Pagination

### Description

Add a reusable QueryDSL-based list-query architecture to the main Spring Boot backend under `code/backend/`. The goal is to give every controller-backed entity a consistent list endpoint that accepts one request object containing pagination, page size, sorting, and filters, then returns a Spring `Page` of list-view DTOs.

This feature is inspired by the separate `BugTracker/` project, but the implementation must not copy BugTracker code directly. BugTracker is a reference for the product concept only: a shared request model, a generic service path, QueryDSL predicates, entity-specific filter definitions, and a separate DTO for list views.

The main backend is Spring Boot 3.4.1 / Java 21 / Jakarta Persistence, while BugTracker is Spring Boot 2.7 / Java 11 / `javax.persistence`. The new implementation must be native to the main backend stack and must avoid the architectural mistakes found in BugTracker.

### Scope

This feature affects the main backend only:

- `code/backend/pom.xml` - add QueryDSL dependencies and annotation processing.
- `code/backend/src/main/java/com/authServer/shared/defaultInterfaces/` - extend repository, service, and mapper contracts for paged list queries.
- `code/backend/src/main/java/com/authServer/shared/defaultImplements/` - add generic controller and service support for list-view pages.
- `code/backend/src/main/java/com/authServer/shared/query/` - new shared query request, filtering, sorting, field-definition, and predicate-building components.
- `code/backend/src/main/java/com/authServer/models/hq/admin/` - add `AdminListDTO` and `AdminQueryProfile`, update mapper/service/controller integration.
- `code/backend/src/main/java/com/authServer/models/hq/client/` - add `ClientListDTO` and `ClientQueryProfile`, update mapper/service/controller integration.
- `code/backend/src/test/` - add focused unit and integration tests for request validation, predicate building, sorting, and entity list endpoints.

The feature must be applied to entities that have controllers. At the time of writing, those are:

- `AdminController` at `code/backend/src/main/java/com/authServer/models/hq/admin/AdminController.java:7`
- `ClientController` at `code/backend/src/main/java/com/authServer/models/hq/client/ClientController.java:14`

Future AgentForge entities with controllers must follow the same pattern.

### Affected Systems / Modules

- [[Docs/backend/Backend-Architecture|Backend Architecture]] - the generic CRUD architecture gains a list-query capability.
- [[Memory/architecture]] - backend layering remains `Controller -> Service -> Repository` with shared abstractions.
- [[Memory/known-issues]] - this feature must not worsen the known `DefaultServiceImplements.update(...)` bug or the current legacy package naming.
- `code/backend/src/main/java/com/authServer/shared/defaultInterfaces/DefaultRepository.java:7` - should extend QueryDSL executor support.
- `code/backend/src/main/java/com/authServer/shared/defaultInterfaces/DefaultService.java:10` - should expose paged list-query methods.
- `code/backend/src/main/java/com/authServer/shared/defaultInterfaces/DefaultMapper.java:3` - should support a list DTO shape.
- `code/backend/src/main/java/com/authServer/shared/defaultImplements/DefaultController.java:14` - should expose a shared list endpoint.
- `code/backend/src/main/java/com/authServer/shared/defaultImplements/DefaultServiceImplements.java:22` - should implement the generic list-query flow.

### Impact Analysis

The current backend exposes `GET /{entity}` through `DefaultController.getAll()` and returns an unpaged `Collection<DTO>`. That is acceptable for bootstrap, but it will not scale once AgentForge has users, agents, workflows, executions, messages, token usage, and manager dashboards.

After this feature, list screens should use a paged endpoint instead of loading all rows. The existing CRUD endpoints can remain for backward compatibility during bootstrap, but frontend list views and manager dashboards should rely on the new QueryDSL-backed list endpoint.

The implementation will touch all current entity slices because adding a `LISTDTO` generic parameter changes the shared mapper/service/controller contract. This is acceptable now because only `Admin` and `Client` controller-backed slices exist. Doing this before the AgentForge domain model lands avoids much larger churn later.

### Risk Assessment

- QueryDSL setup must match Spring Boot 3 / Jakarta Persistence. BugTracker's old `apt-maven-plugin` setup should not be copied.
- Extending shared generic contracts will require coordinated changes to `Admin` and `Client` in the same implementation task.
- Dynamic sorting and filtering can expose internal entity fields unless every queryable field is explicitly allowlisted.
- Invalid field/operator/value combinations must return controlled `400 Bad Request` responses, not runtime `500` errors.
- Generated Q classes must not be committed if the project convention keeps generated sources under `target/generated-sources/` (Task 1 uses Maven's default `target/generated-sources/annotations`).
- The current package name `com.authServer` is a known legacy issue. Implement under the package that exists when the task runs; if the AgentForge package rename happens first, use the renamed package.

---

## Reference Analysis From BugTracker

### Useful Ideas To Borrow

- A single request object can carry pagination, page size, sort, and filters.
- `DefaultRepository` can extend Spring Data's `QuerydslPredicateExecutor` so repositories support `findAll(predicate, pageable)`.
- The generic service can transform `Page<ENTITY>` into `Page<LISTDTO>` through the mapper.
- Entity-specific predicate logic should be isolated from controllers.
- Separate list DTOs are useful because list screens often need a smaller or differently shaped read model than detail screens.

### Problems To Avoid

- Do not put `Optional` fields inside request DTOs.
- Do not accept `@RequestBody Optional<PageableRequest>` in controllers.
- Do not store filters as mutable state inside singleton Spring services.
- Do not use reflection to discover whether a field exists on an entity.
- Do not detect booleans or dates by guessing from strings.
- Do not allow arbitrary string fields for sorting or filtering.
- Do not mutate and save entities while serving list/read requests.
- Do not use unhandled runtime exceptions for invalid filters.
- Do not keep relation-field support in a separate string registry that can fall out of sync with the switch logic.

---

## External Documentation Checked

### Context7: Spring Data JPA

Context7 library: `/spring-projects/spring-data-jpa`

Relevant findings:

- Spring Data repositories support pagination through `Pageable`, `Page`, `PageRequest`, and `Sort`.
- Spring Data JPA documentation includes QueryDSL integration using QueryDSL dependencies and generated query types.
- QueryDSL predicate execution is supported through repository integration, which is the right extension point for the existing `DefaultRepository` abstraction.

### Context7: QueryDSL / OpenFeign QueryDSL

Context7 libraries: `/querydsl/querydsl`, `/openfeign/querydsl`

Relevant findings:

- QueryDSL requires generated Q classes from annotation processing.
- For Spring Boot 3+ / Jakarta projects, prefer the modern compiler-plugin based setup instead of BugTracker's deprecated `apt-maven-plugin` pattern.
- OpenFeign QueryDSL documents a Spring Boot 3+ compatible setup and the standard `maven-compiler-plugin` integration.
- If dependency compatibility needs validation during implementation, compare OpenFeign QueryDSL with the `com.querydsl` artifacts using the `jakarta` classifier before writing code.

---

## Implementation Architecture

### Target Request Contract

Create a shared `PageableRequest` style DTO under a new shared query package. The exact names can be refined during implementation, but the request shape should stay close to this:

```json
{
  "page": 0,
  "size": 20,
  "sort": [
    { "field": "username", "direction": "ASC" }
  ],
  "filters": [
    {
      "field": "enabled",
      "operations": [
        { "operator": "EQUALS", "value": true }
      ]
    },
    {
      "field": "email",
      "operations": [
        { "operator": "CONTAINS", "value": "example.com" }
      ]
    }
  ]
}
```

Rules:

- `page` is zero-based and must be `>= 0`.
- `size` must be bounded, for example `1..100`, so clients cannot request unlimited rows.
- `sort` defaults to `id ASC` when absent or empty, but only if `id` is an allowed sort field for that entity.
- `filters` defaults to an empty list when absent.
- filters are combined with `AND`.
- operations inside the same filter are combined with `OR`, matching the useful part of the BugTracker pattern.
- relation filters should use explicit API field names such as `manager.username` or `owner.email` only when a future entity needs them.

### Shared Query Package

Create a package such as `com.authServer.shared.query` while the legacy package name remains. If the package rename to AgentForge happens before implementation, place the same concepts under the renamed shared package.

Recommended classes and responsibilities:

| Class / Interface | Responsibility |
|-------------------|----------------|
| `PageableRequest` | Transport DTO containing page, size, sort, and filters. Uses Bean Validation. No `Optional` fields. |
| `SortRequest` | Transport DTO for one sort instruction. Contains `field` and `direction`. |
| `SortDirection` | Enum with `ASC`, `DESC`. Avoid raw booleans like `isAscending`. |
| `FilterRequest` | Transport DTO for one API field and one or more operations. |
| `FilterOperationRequest` | Transport DTO for one operator/value pair. |
| `FilterOperator` | Enum for supported operations. Do not use symbols like `:`, `=`, `!=` in the public contract. |
| `QueryableField<ENTITY>` | Describes one allowed API field, its Java type, supported operators, QueryDSL expression, and optional Spring sort property. |
| `EntityQueryProfile<ENTITY>` | Entity-specific allowlist of queryable and sortable fields. |
| `QueryPredicateBuilder<ENTITY>` | Stateless component that turns request filters into a QueryDSL `Predicate` / `BooleanExpression`. |
| `PageableFactory<ENTITY>` | Stateless component that validates sort fields and builds a Spring `PageRequest`. |
| `InvalidQueryRequestException` | Typed exception for invalid field, operator, sort, or value. |

This design keeps SOLID boundaries clear:

- Controllers only accept the request and delegate.
- Services orchestrate repository, predicate builder, pageable factory, and mapper.
- Query profiles own entity-specific filter/sort metadata.
- Predicate builder owns operator-to-QueryDSL conversion.
- Repositories stay persistence-focused.

### Query Field Definitions

Do not use reflection or arbitrary field names. Each entity should define an explicit query profile.

Conceptually:

```java
public final class ClientQueryProfile implements EntityQueryProfile<ClientEntity> {
    private static final QClientEntity CLIENT = QClientEntity.clientEntity;

    @Override
    public Map<String, QueryableField<ClientEntity>> fields() {
        return Map.of(
            "id", QueryableField.number(CLIENT.id, Long.class),
            "firstName", QueryableField.string(CLIENT.firstName),
            "lastName", QueryableField.string(CLIENT.lastName),
            "email", QueryableField.string(CLIENT.email),
            "username", QueryableField.string(CLIENT.username),
            "enabled", QueryableField.booleanField(CLIENT.enabled),
            "dateCreated", QueryableField.dateTime(CLIENT.dateCreated)
        );
    }
}
```

The final code does not need to match this exact snippet, but the rule is mandatory: every field must be explicitly allowlisted and mapped to a QueryDSL path.

### Supported Operators

Initial operator set:

| Operator | Supported Types | Behavior |
|----------|-----------------|----------|
| `EQUALS` | string, number, boolean, enum, date/time | exact match, case-insensitive for string if desired |
| `NOT_EQUALS` | string, number, boolean, enum, date/time | exact non-match |
| `CONTAINS` | string | case-insensitive contains |
| `STARTS_WITH` | string | case-insensitive prefix |
| `ENDS_WITH` | string | case-insensitive suffix |
| `GREATER_THAN` | number, date/time | `>` |
| `GREATER_THAN_OR_EQUAL` | number, date/time | `>=` |
| `LESS_THAN` | number, date/time | `<` |
| `LESS_THAN_OR_EQUAL` | number, date/time | `<=` |
| `IN` | string, number, enum | match any value in array |
| `IS_NULL` | nullable fields | ignores value |
| `IS_NOT_NULL` | nullable fields | ignores value |

Field definitions should control which operators are allowed. For example, `CONTAINS` should be legal for `email`, but illegal for `id` and `enabled`.

### Value Parsing

The filter engine must parse values based on the field definition, not by guessing from the incoming string.

Rules:

- Boolean values must be actual booleans in JSON (`true` / `false`), not guessed from strings.
- Numeric values must be parsed through the field's declared numeric type.
- Date/time fields should use `java.time` types for new code (`LocalDate`, `LocalDateTime`, or `Instant`) instead of `java.util.Date` where possible.
- Existing `BaseUserEntity` uses `java.util.Date` today; the query layer can support it for current fields, but new AgentForge entities should prefer `java.time`.
- Invalid values must throw `InvalidQueryRequestException` and become `400 Bad Request` through `GlobalExceptionHandler`.

### Sorting

Sorting must use an allowlist, not arbitrary client-provided property paths.

Rules:

- Reject unknown sort fields with `400 Bad Request`.
- Reject sort fields that are filterable but not sortable.
- Default sort should be stable, usually `id ASC` or `dateCreated DESC`, depending on the entity.
- Use Spring `Sort` / `PageRequest` after validating each requested sort field.
- Do not use unsafe dynamic sort expressions.

### Repository Integration

Update the shared repository contract so all entity repositories inherit QueryDSL predicate execution:

```java
@NoRepositoryBean
public interface DefaultRepository<ENTITY, ID>
        extends JpaRepository<ENTITY, ID>, QuerydslPredicateExecutor<ENTITY> {
}
```

This keeps repository integration consistent with BugTracker's good idea while keeping the main backend code native to Spring Boot 3.

### Service And Mapper Contract

Extend the generic architecture with a list DTO shape.

Recommended contract direction:

```java
public interface DefaultMapper<DTO, MINIDTO, LISTDTO, FORM, ENTITY> {
    DTO toDTO(ENTITY entity);
    MINIDTO toSmallDTO(ENTITY entity);
    LISTDTO toListDTO(ENTITY entity);
    ENTITY toEntity(FORM form);
}
```

```java
public interface DefaultService<DTO, MINIDTO, LISTDTO, FORM, ID> {
    DTO getOne(ID id) throws ItemNotFoundException;
    Collection<DTO> getAll();
    MINIDTO insert(FORM form) throws ItemNotFoundException, ItemAlreadyExist, InvalidInsertDetails;
    DTO update(ID id, FORM form) throws ItemNotFoundException, InvalidInsertDetails;
    DTO delete(ID id) throws ItemNotFoundException, InvalidDeleteOperation;
    Page<LISTDTO> getListPage(PageableRequest request) throws InvalidQueryRequestException;
}
```

The exact method name can be refined during implementation, but the feature should expose one generic list-query method returning `Page<LISTDTO>`.

### Controller Endpoint

Add a generic list endpoint to `DefaultController`:

```java
@PostMapping("/list")
public ResponseEntity<Page<LISTDTO>> getListPage(@Valid @RequestBody PageableRequest request) {
    return ResponseEntity.ok(defaultService.getListPage(request));
}
```

The endpoint is `POST` because complex filters are easier and safer in a request body than query parameters. Existing `GET /{entity}` can remain for now, but UI list views should use `POST /{entity}/list`.

### Entity List DTOs

Create list DTOs for current controller-backed entities:

| Entity | New DTO | Notes |
|--------|---------|-------|
| `AdminEntity` | `AdminListDTO` | Likely fields: id, firstName, lastName, email, username, roles, enabled. Do not include password. |
| `ClientEntity` | `ClientListDTO` | Likely fields: id, firstName, lastName, email, username, roles, enabled, apikey if it is safe for list views. Confirm if API keys should be hidden. |

List DTOs should be explicit classes even if they initially match full DTOs. This preserves the list-view architecture and avoids forcing future list screens to expose full detail DTOs.

### Current Entity Query Profiles

`AdminQueryProfile` should support common inherited `BaseUserEntity` fields:

- `id`
- `firstName`
- `lastName`
- `email`
- `username`
- `enabled`
- `dateCreated`
- `lastLogin`
- `roles`, if QueryDSL support for the element collection is straightforward and covered by tests

`ClientQueryProfile` should support the same fields plus:

- `apikey`, only if it is safe to expose for filtering/sorting

If `roles` or `apikey` introduces complexity or security concerns, defer those fields rather than adding risky dynamic behavior.

### Error Handling

Add a typed `InvalidQueryRequestException` and a handler in `GlobalExceptionHandler`.

Response behavior:

- unknown filter field -> `400 Bad Request`
- unknown sort field -> `400 Bad Request`
- unsupported operator for field -> `400 Bad Request`
- invalid value type -> `400 Bad Request`
- invalid page or size -> `400 Bad Request` through Bean Validation

Do not let invalid query requests surface as `RuntimeException`, `IllegalArgumentException`, or generic `500` responses.

---

## Implementation Steps

### Phase 1: QueryDSL Dependency And Generated Types

- [x] **Step 1.1:** Add QueryDSL dependencies compatible with Spring Boot 3.4.1 / Jakarta Persistence.
- [x] **Step 1.2:** Configure annotation processing through `maven-compiler-plugin`, not BugTracker's old `apt-maven-plugin`.
- [x] **Step 1.3:** Run Maven compilation and confirm Q classes are generated under `target/generated-sources/annotations`.
- [x] **Step 1.4:** Update `.gitignore` only if generated QueryDSL sources are not already excluded by the target-directory rule. No project-wide `.gitignore` exists, so this is recorded as a follow-up instead of expanded into Task 1.

### Phase 2: Shared Query Request And Validation Model

- [x] **Step 2.1:** Create the shared query package and request DTOs: `PageableRequest`, `SortRequest`, `FilterRequest`, `FilterOperationRequest`.
- [x] **Step 2.2:** Create enums for `SortDirection` and `FilterOperator`.
- [x] **Step 2.3:** Add Bean Validation annotations for page, size, field names, sort direction, operators, and operation lists.
- [x] **Step 2.4:** Define request defaults without using `Optional` fields.

### Phase 3: Stateless Query Builder Architecture

- [x] **Step 3.1:** Create `QueryableField<ENTITY>` and `EntityQueryProfile<ENTITY>` to make every allowed query field explicit.
- [x] **Step 3.2:** Create `PageableFactory<ENTITY>` to validate sort fields and build `PageRequest`.
- [x] **Step 3.3:** Create `QueryPredicateBuilder<ENTITY>` to build QueryDSL predicates from `FilterRequest` values.
- [x] **Step 3.4:** Add typed value conversion based on each field definition.
- [x] **Step 3.5:** Add `InvalidQueryRequestException` and map it to `400 Bad Request`.

### Phase 4: Generic CRUD Layer Integration

- [x] **Step 4.1:** Extend `DefaultRepository` with `QuerydslPredicateExecutor<ENTITY>`.
- [x] **Step 4.2:** Add `LISTDTO` to `DefaultMapper`, `DefaultService`, `DefaultController`, and `DefaultServiceImplements`.
- [x] **Step 4.3:** Add `toListDTO(...)` to the mapper contract.
- [x] **Step 4.4:** Add a generic `POST /list` endpoint returning `Page<LISTDTO>`.
- [x] **Step 4.5:** Implement the generic service flow: request -> predicate -> page request -> repository -> mapper.

### Phase 5: Admin And Client Entity Integration

- [x] **Step 5.1:** Create `AdminListDTO` and update `AdminMapper` with `toListDTO(...)`.
- [x] **Step 5.2:** Create `AdminQueryProfile` with explicit allowed fields.
- [x] **Step 5.3:** Update `AdminServiceImpl` and `AdminController` generic parameters and constructor dependencies.
- [x] **Step 5.4:** Create `ClientListDTO` and update `ClientMapper` with `toListDTO(...)`.
- [x] **Step 5.5:** Create `ClientQueryProfile` with explicit allowed fields.
- [x] **Step 5.6:** Update `ClientService` and `ClientController` generic parameters and constructor dependencies.

### Phase 6: Tests And Validation

- [x] **Step 6.1:** Add unit tests for request validation and default values.
- [x] **Step 6.2:** Add unit tests for invalid fields, invalid operators, invalid values, and invalid sort requests.
- [x] **Step 6.3:** Add unit tests for string, number, boolean, enum, and date/time predicate generation where supported.
- [x] **Step 6.4:** Add repository/service integration tests proving `Page<LISTDTO>` works for Admin and Client.
- [x] **Step 6.5:** Add controller tests for `POST /admin/list` and `POST /client/list`, including success and `400 Bad Request` cases.
- [x] **Step 6.6:** Run `./mvnw test` from `code/backend/`. Attempted on 2026-04-27; blocked before Maven starts because `.mvn/wrapper/maven-wrapper.properties` is missing. System Maven targeted QueryDSL validation passes.
- [x] **Step 6.7:** Run `./mvnw verify` from `code/backend/` if dependency generation or integration tests require full lifecycle validation. System Maven `verify` was attempted and remains blocked only by the known `TestLauncher` empty-suite discovery issue after feature tests run.

---

## Potential Issues / Risks

- Adding QueryDSL can fail if the annotation processor does not see Jakarta entity annotations. This is why the implementation task must validate generated Q classes immediately after the dependency change.
- The current backend still uses MySQL but the product target is PostgreSQL. QueryDSL should be used through JPA abstractions only; do not add database-specific query behavior.
- `BaseUserEntity` uses inherited fields. Query profiles must reference generated QueryDSL paths directly and must not rely on `getDeclaredField(...)` style reflection.
- `ClientEntity.getBaseUser()` currently recursively calls itself. This feature should not touch that method unless a separate bug/task is opened.
- The generic `update(...)` bug remains out of scope. Do not attempt to solve it inside this feature unless a dedicated task is added.
- If `apikey` is sensitive, do not include it in `ClientListDTO` or allow filtering/sorting on it until the security decision is made.
- `roles` are an element collection. Add role filtering only if the generated QueryDSL path and tests prove it works cleanly.

---

## Design Decisions

### Decision 1: Explicit Query Profiles Instead Of Reflection

**Decision:** Every entity gets an explicit query profile listing allowed filter and sort fields.

**Why:** Reflection caused fragile behavior in BugTracker, especially for inherited fields. Explicit profiles are more verbose but safer, testable, and aligned with SOLID's single-responsibility and open/closed principles.

**Alternatives considered:** Reflection-based field discovery. Rejected because it exposes internal fields, fails on inherited fields, and moves validation errors to runtime surprises.

### Decision 2: Stateless Predicate Builder

**Decision:** Predicate builders must be stateless Spring components. Filters are method parameters, not mutable fields.

**Why:** Singleton services with mutable request state are unsafe under concurrent HTTP requests.

**Alternatives considered:** BugTracker's `CommonPathExpression.setFilters(...)`. Rejected because it stores request-specific state in a shared object.

### Decision 3: List DTO Is A First-Class Shape

**Decision:** Add `LISTDTO` to the generic architecture and require `toListDTO(...)` for controller-backed entities.

**Why:** AgentForge will have many list-heavy screens. List DTOs let each screen return safe, minimal read models without exposing detail DTOs.

**Alternatives considered:** Reusing `DTO` for all list endpoints. Rejected because it makes future list screens depend on full detail shape and risks over-fetching or leaking fields.

### Decision 4: Request Uses Enums, Not Operator Symbols

**Decision:** Public operators should be enum names like `CONTAINS`, `EQUALS`, and `GREATER_THAN`, not symbols like `:`, `=`, and `!=`.

**Why:** Enum names are self-documenting, easier to validate, and safer for clients.

**Alternatives considered:** BugTracker-style symbols. Rejected because they are compact but ambiguous and harder to evolve.

### Decision 5: POST For Complex List Queries

**Decision:** Use `POST /{entity}/list` for paged filtered list views.

**Why:** Complex filter bodies are cleaner and more maintainable in JSON than encoded query strings.

**Alternatives considered:** `GET /{entity}?page=...&filter=...`. Rejected for the first implementation because nested filter groups would become harder to validate and document.

---

## Task Breakdown

### Task 1: Configure QueryDSL For Spring Boot 3

- **Steps Covered:** Phase 1, Steps 1.1-1.4
- **Reason for Grouping:** Dependency setup and generated source validation are tightly coupled and must be completed before any QueryDSL code can compile.
- **Planned Task File:** `Backend-QueryDSL-Filtering-Pagination-step-1-configure-querydsl.md`
- **Task Document Link:** [[Backend-QueryDSL-Filtering-Pagination-step-1-configure-querydsl]]
- **Status:** Implemented on 2026-04-27. `QBaseUserEntity`, `QAdminEntity`, and `QClientEntity` are generated under `code/backend/target/generated-sources/annotations`. Default `mvn test` remains blocked by an existing `TestLauncher` / empty-suite discovery issue, not by QueryDSL.

### Task 2: Build Shared Query Request And Validation Model

- **Steps Covered:** Phase 2, Steps 2.1-2.4
- **Reason for Grouping:** These classes define the public API contract and should be designed together.
- **Planned Task File:** `Backend-QueryDSL-Filtering-Pagination-step-2-request-model.md`
- **Task Document Link:** [[Backend-QueryDSL-Filtering-Pagination-step-2-request-model]]
- **Status:** Implemented on 2026-04-27. The backend now has the transport-only shared query request model under `com.authServer.shared.query`, with Bean Validation constraints, no `Optional` fields, no QueryDSL imports, and a programmatic `Validator` suite that passes 14/14.

### Task 3: Build Stateless Predicate And Pageable Infrastructure

- **Steps Covered:** Phase 3, Steps 3.1-3.5
- **Reason for Grouping:** Field profiles, predicate generation, value parsing, sorting, and query errors form one shared query subsystem.
- **Planned Task File:** `Backend-QueryDSL-Filtering-Pagination-step-3-query-infrastructure.md`
- **Task Document Link:** [[Backend-QueryDSL-Filtering-Pagination-step-3-query-infrastructure]]
- **Status:** Implemented on 2026-04-27. The backend now has explicit query field metadata, stateless pageable and predicate builders, field-driven value conversion, `InvalidQueryRequestException`, Bean Validation and malformed-body error mapping, and focused query infrastructure tests passing 34/34 under targeted Maven validation.

### Task 4: Extend Generic CRUD Contracts For List Views

- **Steps Covered:** Phase 4, Steps 4.1-4.5
- **Reason for Grouping:** Repository, mapper, service, and controller generic signatures must be changed together to keep the backend compiling.
- **Planned Task File:** `Backend-QueryDSL-Filtering-Pagination-step-4-generic-crud-integration.md`
- **Task Document Link:** [[Backend-QueryDSL-Filtering-Pagination-step-4-generic-crud-integration]]
- **Status:** Implemented on 2026-04-27. Generic CRUD contracts now include `LISTDTO`, `DefaultRepository` extends `QuerydslPredicateExecutor`, `DefaultController` exposes `POST /list`, and `DefaultServiceImplements` builds predicate/pageable values through Task 3 infrastructure before mapping `Page<ENTITY>` to `Page<LISTDTO>`. The implementation also pulled in the minimum Task 5 production wiring to avoid broken inherited endpoints.

### Task 5: Integrate Admin And Client List Query Support

- **Steps Covered:** Phase 5, Steps 5.1-5.6
- **Reason for Grouping:** Admin and Client are the only current controller-backed entity slices, and both must be updated after the generic contract changes.
- **Planned Task File:** `Backend-QueryDSL-Filtering-Pagination-step-5-admin-client-integration.md`
- **Task Document Link:** [[Backend-QueryDSL-Filtering-Pagination-step-5-admin-client-integration]]
- **Status:** Implemented on 2026-04-27 as part of [[Backend-QueryDSL-Filtering-Pagination-step-4-generic-crud-integration]]. The standalone Task 5 document now records the completed Phase 5 production wiring. `AdminListDTO`, `AdminQueryProfile`, `ClientListDTO`, and `ClientQueryProfile` exist; Admin/Client mappers, services, and controllers use the new `LISTDTO` generic path. Profiles deliberately omit `roles`, `password`, and `apikey` from query fields.

### Task 6: Add Automated Validation

- **Steps Covered:** Phase 6, Steps 6.1-6.7
- **Reason for Grouping:** Tests should cover both the shared query subsystem and the entity-level endpoints after integration is complete.
- **Planned Task File:** `Backend-QueryDSL-Filtering-Pagination-step-6-validation.md`
- **Task Document Link:** [[Backend-QueryDSL-Filtering-Pagination-step-6-validation]]
- **Status:** Implemented on 2026-04-27. Added Admin/Client repository integration tests, real service `Page<LISTDTO>` integration tests, and MockMvc endpoint tests for `POST /admin/list` and `POST /client/list`, including success, unknown fields, unsupported operators, invalid values, validation failures, malformed enum bodies, and sensitive-field exclusion. Broader targeted validation passed with 79 tests, 0 failures, 0 errors. Default `./mvnw test` is still blocked by missing wrapper metadata; default system `mvn test` and `mvn verify` are still blocked by `TestLauncher` selecting empty suites, not by QueryDSL behavior.

---

## Expected Outcome

- `Admin` and `Client` list views can be queried through a consistent paged/filterable/sortable endpoint.
- The backend gains a reusable QueryDSL query subsystem that future AgentForge entities can adopt by adding a list DTO and query profile.
- Invalid filters and sort requests return consistent `400 Bad Request` responses.
- The implementation avoids the known BugTracker weaknesses while preserving the useful architecture pattern.
- The backend is ready for list-heavy AgentForge domains such as agents, workflows, executions, messages, and usage metrics.
