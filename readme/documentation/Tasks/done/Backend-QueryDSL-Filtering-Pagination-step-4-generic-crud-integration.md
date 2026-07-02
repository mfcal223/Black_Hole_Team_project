# Task: Extend Generic CRUD Contracts For List Views

#task #current #high-complexity #parent-backend-querydsl-filtering-pagination

**Parent:** [[Backend-QueryDSL-Filtering-Pagination]]
**Parent Type:** Feature
**Related Step(s):** Phase 4, Steps 4.1 - 4.5
**Estimated Complexity:** High

---

## Goal

Extend the shared backend CRUD abstractions so every controller-backed entity can expose a reusable QueryDSL-backed `POST /list` endpoint that accepts `PageableRequest` and returns `Page<LISTDTO>`. This task connects the Task 2 request model and Task 3 query infrastructure to `DefaultRepository`, `DefaultMapper`, `DefaultService`, `DefaultController`, and `DefaultServiceImplements`. During execution, the concrete Admin/Client list DTOs and query profiles were also pulled in as a minimal scope expansion so the inherited `POST /list` endpoints are real and do not fail at runtime.

---

## Parent Context

The parent feature [[Backend-QueryDSL-Filtering-Pagination]] adds paged, sortable, filterable list endpoints to the Spring Boot backend under `code/backend/`.

Completed prerequisites:

- [[Backend-QueryDSL-Filtering-Pagination-step-1-configure-querydsl]] added OpenFeign QueryDSL `6.12`, configured annotation processing, and verified generated Q classes under `target/generated-sources/annotations`.
- [[Backend-QueryDSL-Filtering-Pagination-step-2-request-model]] added `PageableRequest`, `SortRequest`, `FilterRequest`, `FilterOperationRequest`, `SortDirection`, and `FilterOperator` under `com.authServer.shared.query`.
- [[Backend-QueryDSL-Filtering-Pagination-step-3-query-infrastructure]] added `QueryableField`, `EntityQueryProfile`, `PageableFactory`, `QueryPredicateBuilder`, `InvalidQueryRequestException`, and focused tests for semantic validation and predicate/pageable creation.

This task is the shared-layer integration point. It makes the generic CRUD stack list-aware while preserving the existing controller -> service -> repository layering documented in [[Memory/architecture]]. The original plan deferred production entity-specific pieces to Task 5, but implementation proved those pieces were required to keep inherited `POST /admin/list` and `POST /client/list` endpoints from becoming broken runtime paths.

Important parent constraints:

- `DefaultRepository` should inherit QueryDSL predicate execution through `QuerydslPredicateExecutor<ENTITY>`.
- The generic mapper/service/controller contracts should gain a first-class `LISTDTO` type.
- The mapper contract should expose `toListDTO(ENTITY entity)`.
- The shared controller should expose `POST /list` with `@Valid @RequestBody PageableRequest`.
- The generic service flow should be `PageableRequest -> Predicate -> PageRequest -> repository.findAll(predicate, pageable) -> Page.map(mapper::toListDTO)`.
- Do not use reflection, arbitrary client field names, mutable singleton request state, or runtime `500` errors for invalid query input.

---

## Scope Boundary And Coordination Note

This task intentionally touches generic contracts that current Admin and Client classes already implement. That creates a compile-time coupling with Task 5.

Implementation must use one of these safe paths:

1. Keep Task 4 strictly shared-layer focused, then execute Task 5 in the same implementation branch before marking Task 4 done and before relying on a green full compile.
2. If compilation must stay green at the end of Task 4, perform only the minimal concrete-class generic propagation needed for compile safety, and do not create placeholder or no-op query profiles that expose a broken runtime `POST /list` endpoint.

Do not add fake profiles, nullable query collaborators, `UnsupportedOperationException` list paths, or temporary endpoints that return `500` simply to satisfy generics. If real entity profiles or list DTOs become necessary for a green compile, pull the corresponding Task 5 work into the same implementation session and record the scope expansion in both task documents.

**Execution outcome:** Task 4 was paired with the minimal Task 5 entity work. Real `AdminListDTO`, `AdminQueryProfile`, `ClientListDTO`, and `ClientQueryProfile` classes were added, and current Admin/Client mappers, services, and controllers were wired to the generic list flow. No fake/no-op profiles or unsupported list paths were introduced.

---

## Preconditions / Dependencies

- `code/backend/pom.xml` currently uses Spring Boot `3.4.1`, Java `21`, OpenFeign QueryDSL `6.12`, Spring Data JPA / Commons `3.4.1`, and Jakarta Bean Validation through `spring-boot-starter-validation`.
- `code/backend/mvnw` is incomplete because `.mvn/wrapper/maven-wrapper.properties` is missing. Use system Maven with Java 21 for validation commands until that separate build-hygiene issue is repaired.
- Default `mvn test` is blocked by the known `TestLauncher` / empty-suite discovery issue. Use targeted `-Dtest=...` validation for this task.
- `PageableRequest` already supplies defaults and Bean Validation constraints; this task should not duplicate request-shape validation in controllers.
- `PageableFactory<ENTITY>.create(PageableRequest, EntityQueryProfile<ENTITY>)` already validates requested/default sort fields and returns `PageRequest`.
- `QueryPredicateBuilder<ENTITY>.build(PageableRequest, EntityQueryProfile<ENTITY>)` already returns a non-null QueryDSL `Predicate`.
- `InvalidQueryRequestException` is already mapped to `400 Bad Request` in `GlobalExceptionHandler`.
- Existing generic CRUD contracts are currently four-type contracts and not list-aware.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `memory-bank` - **Selected** - confirmed AgentForge context, Spring Boot 3.4.1 / Java 21 stack, existing generic CRUD layering, QueryDSL 6.12 setup, and known Maven/test blockers.
- `documentation-management` - **Selected** - this is a Task document under `documentation/Tasks/current/` and must link back to the parent feature.
- `solid` - **Selected** - guides the responsibility split: controller delegates, service orchestrates, repository executes, mapper converts, query profile owns field metadata, query builders stay stateless.
- `find-docs` / Context7 - **Selected** - Context7 resolution for Spring Data JPA and OpenFeign QueryDSL was attempted on 2026-04-27 but the workspace quota is exhausted. Official Spring Data and OpenFeign documentation was used as fallback, with versions verified from `code/backend/pom.xml`.

### Documentation Reviewed

- Context7 - attempted for Spring Data JPA and OpenFeign QueryDSL; both attempts returned `Monthly quota exceeded`.
- `code/backend/pom.xml` - verified Spring Boot `3.4.1`, Java `21`, OpenFeign QueryDSL `6.12`, and Spring Data dependencies managed by the Spring Boot parent.
- Spring Data Commons `3.4.1` Javadoc: `QuerydslPredicateExecutor` - confirms `findAll(Predicate, Pageable)` returns `Page<T>` and requires non-null `Predicate` and `Pageable`.
- Spring Data Commons `3.4.1` Javadoc: `PageRequest` - confirms page numbers are zero-based, page size must be greater than zero, and `Sort` must not be null.
- Spring Data Commons `3.4.1` Javadoc: `Page` - confirms `Page.map(Function)` returns a new `Page<U>` while preserving pagination metadata, which is the correct way to map `Page<ENTITY>` to `Page<LISTDTO>`.
- Spring Data JPA Querydsl extension reference - confirms repositories opt into QueryDSL by extending `QuerydslPredicateExecutor` and that the OpenFeign fork uses groupId `io.github.openfeign.querydsl`.
- OpenFeign QueryDSL JPA tutorial - confirms QueryDSL generates Q types from `jakarta.persistence.Entity` and exposes type-safe predicates through the `com.querydsl.*` API packages.

### Related Existing Code

- `code/backend/src/main/java/com/authServer/shared/defaultInterfaces/DefaultRepository.java` - currently `DefaultRepository<ENTITY, ID> extends JpaRepository<ENTITY, ID>` only.
- `code/backend/src/main/java/com/authServer/shared/defaultInterfaces/DefaultMapper.java` - currently `DefaultMapper<DTO, MINIDTO, FORM, ENTITY>` with `toDTO`, `toSmallDTO`, and `toEntity` only.
- `code/backend/src/main/java/com/authServer/shared/defaultInterfaces/DefaultService.java` - currently `DefaultService<DTO, MINIDTO, FORM, ID>` with CRUD methods only.
- `code/backend/src/main/java/com/authServer/shared/defaultImplements/DefaultController.java` - currently `DefaultController<DTO, MINIDTO, FORM, ID>` with CRUD endpoints only.
- `code/backend/src/main/java/com/authServer/shared/defaultImplements/DefaultServiceImplements.java` - currently coordinates repository and mapper only; no pageable/predicate/profile collaborators.
- `code/backend/src/main/java/com/authServer/shared/query/PageableRequest.java` - request object accepted by the new endpoint.
- `code/backend/src/main/java/com/authServer/shared/query/PageableFactory.java` - builds validated `PageRequest` objects.
- `code/backend/src/main/java/com/authServer/shared/query/QueryPredicateBuilder.java` - builds validated QueryDSL predicates.
- `code/backend/src/main/java/com/authServer/shared/query/EntityQueryProfile.java` - entity-specific field allowlist dependency required by the generic list flow.
- `code/backend/src/main/java/com/authServer/models/hq/admin/AdminMapper.java`, `AdminServiceImpl.java`, `AdminController.java` - current concrete generic usages that will be affected by adding `LISTDTO`.
- `code/backend/src/main/java/com/authServer/models/hq/client/ClientMapper.java`, `ClientService.java`, `ClientController.java` - current concrete generic usages that will be affected by adding `LISTDTO`.

---

## Implementation Details

### Approach

Update the shared CRUD contracts so list queries are a first-class service capability rather than an ad-hoc controller method. The service implementation should orchestrate existing Task 3 collaborators and rely on Spring Data's `Page.map(...)` to preserve pagination metadata while converting entities to list DTOs.

Target flow:

```java
Predicate predicate = queryPredicateBuilder.build(request, queryProfile);
PageRequest pageRequest = pageableFactory.create(request, queryProfile);

return repository.findAll(predicate, pageRequest)
        .map(mapper::toListDTO);
```

Responsibility split:

- `DefaultController` accepts `PageableRequest`, delegates, and returns `ResponseEntity<Page<LISTDTO>>`.
- `DefaultService` exposes the list-query use case.
- `DefaultServiceImplements` coordinates profile, predicate builder, pageable factory, repository, and mapper.
- `DefaultRepository` exposes QueryDSL execution capability.
- `DefaultMapper` owns DTO shape conversion, including `toListDTO`.
- `EntityQueryProfile` remains entity-specific and is not hard-coded in controllers.

### Files to Modify

- [x] `code/backend/src/main/java/com/authServer/shared/defaultInterfaces/DefaultRepository.java` - added `QuerydslPredicateExecutor<ENTITY>`.
- [x] `code/backend/src/main/java/com/authServer/shared/defaultInterfaces/DefaultMapper.java` - added `LISTDTO` generic parameter and `toListDTO(ENTITY entity)`.
- [x] `code/backend/src/main/java/com/authServer/shared/defaultInterfaces/DefaultService.java` - added `LISTDTO` generic parameter and `Page<LISTDTO> getListPage(PageableRequest request)`.
- [x] `code/backend/src/main/java/com/authServer/shared/defaultImplements/DefaultController.java` - added `LISTDTO` generic parameter and `POST /list` endpoint.
- [x] `code/backend/src/main/java/com/authServer/shared/defaultImplements/DefaultServiceImplements.java` - added `LISTDTO` generic parameter, query collaborators, and generic list-query flow.

### Files to Create Or Consider For Tests

- [x] `code/backend/src/test/java/com/authServer/shared/defaultImplements/DefaultServiceImplementsListQueryTest.java` - focused unit test for service orchestration using mocks.
- [x] `code/backend/src/test/java/com/authServer/shared/defaultImplements/DefaultControllerListEndpointTest.java` - focused controller test proving `POST /list` is mapped and delegates to the service.

### Concrete Slice Coordination

These production files were updated because the inherited generic endpoint would otherwise compile without real runtime support:

- [x] `code/backend/src/main/java/com/authServer/models/hq/admin/AdminMapper.java`
- [x] `code/backend/src/main/java/com/authServer/models/hq/admin/AdminServiceImpl.java`
- [x] `code/backend/src/main/java/com/authServer/models/hq/admin/AdminController.java`
- [x] `code/backend/src/main/java/com/authServer/models/hq/client/ClientMapper.java`
- [x] `code/backend/src/main/java/com/authServer/models/hq/client/ClientService.java`
- [x] `code/backend/src/main/java/com/authServer/models/hq/client/ClientController.java`
- [x] `code/backend/src/main/java/com/authServer/models/hq/admin/AdminListDTO.java`
- [x] `code/backend/src/main/java/com/authServer/models/hq/admin/AdminQueryProfile.java`
- [x] `code/backend/src/main/java/com/authServer/models/hq/client/ClientListDTO.java`
- [x] `code/backend/src/main/java/com/authServer/models/hq/client/ClientQueryProfile.java`

`AdminListDTO`, `AdminQueryProfile`, `ClientListDTO`, and `ClientQueryProfile` were created in this task because a generic inherited endpoint without real profiles would violate the no-fake/no-op runtime-safety rule.

---

## Step-by-Step Implementation

### Step 1: Extend `DefaultRepository` with QueryDSL execution

**Goal:** Make every default repository capable of executing QueryDSL predicates with Spring Data pagination.
**Dependencies:** Task 1 QueryDSL dependency setup.

- [x] Import `org.springframework.data.querydsl.QuerydslPredicateExecutor`.
- [x] Extend `DefaultRepository<ENTITY, ID>` with `QuerydslPredicateExecutor<ENTITY>` in addition to `JpaRepository<ENTITY, ID>`.
- [x] Keep `@NoRepositoryBean` so Spring Data does not try to instantiate the generic base repository directly.

**Why this step is critical:**
`DefaultServiceImplements` needs `repository.findAll(predicate, pageable)` from `QuerydslPredicateExecutor`. Adding it to the shared repository contract keeps the persistence capability in one place and avoids per-entity repository boilerplate.

#### Implementation Sketch

```java
@NoRepositoryBean
public interface DefaultRepository<ENTITY, ID>
        extends JpaRepository<ENTITY, ID>, QuerydslPredicateExecutor<ENTITY> {
}
```

#### Edge Cases

1. **Case:** QueryDSL imports are unavailable - Task 1 is incomplete or Maven did not resolve `io.github.openfeign.querydsl:querydsl-jpa`.
2. **Case:** A future entity does not have generated Q types - repository startup or query execution may fail; validate Q generation when each new entity is added.
3. **Case:** Developers try to add `QuerydslPredicateExecutor` to individual repositories instead - reject that duplication; the shared repository is the correct extension point.

---

### Step 2: Add `LISTDTO` to `DefaultMapper`

**Goal:** Make list-view DTO mapping a first-class generic contract.
**Dependencies:** Existing mapper contract and parent Decision 3.

- [x] Change `DefaultMapper<DTO, MINIDTO, FORM, ENTITY>` to `DefaultMapper<DTO, MINIDTO, LISTDTO, FORM, ENTITY>`.
- [x] Add `LISTDTO toListDTO(ENTITY entity)`.
- [x] Do not provide a default implementation that silently returns `DTO` or throws `UnsupportedOperationException`.

**Why this step is critical:**
List screens should not be forced to expose full detail DTOs. A dedicated `LISTDTO` keeps the read model safe and minimal while preserving a generic service flow.

#### Implementation Sketch

```java
public interface DefaultMapper<DTO, MINIDTO, LISTDTO, FORM, ENTITY> {

    DTO toDTO(ENTITY entity);

    MINIDTO toSmallDTO(ENTITY entity);

    LISTDTO toListDTO(ENTITY entity);

    ENTITY toEntity(FORM form);
}
```

#### Edge Cases

1. **Case:** Current concrete mappers no longer compile - expected. Update them as part of the coordinated implementation, but keep production list DTO semantics in Task 5.
2. **Case:** A mapper tries to include password or secrets in a future list DTO - reject it in the concrete Task 5 work; list DTOs are intentionally separate safety boundaries.
3. **Case:** `toListDTO` duplicates `toDTO` initially - acceptable only when the concrete list DTO truly matches the detail DTO temporarily; prefer explicit list DTOs in Task 5.

---

### Step 3: Add `LISTDTO` and list-query method to `DefaultService`

**Goal:** Expose one generic service use case for paged filtered list views.
**Dependencies:** `PageableRequest`, `InvalidQueryRequestException`, Spring Data `Page`.

- [x] Change `DefaultService<DTO, MINIDTO, FORM, ID>` to `DefaultService<DTO, MINIDTO, LISTDTO, FORM, ID>`.
- [x] Import `org.springframework.data.domain.Page`.
- [x] Import `com.authServer.shared.query.PageableRequest`.
- [x] Import `com.authServer.exceptions.InvalidQueryRequestException`.
- [x] Add `Page<LISTDTO> getListPage(PageableRequest request) throws InvalidQueryRequestException`.
- [x] Keep existing CRUD method signatures unchanged except for the generic arity.

**Why this step is critical:**
Controllers should depend on a service abstraction for the new use case, not on repositories or query builders directly. This preserves the current dependency direction.

#### Implementation Sketch

```java
Page<LISTDTO> getListPage(PageableRequest request) throws InvalidQueryRequestException;
```

#### Edge Cases

1. **Case:** `InvalidQueryRequestException` is checked - keep the `throws` declaration so invalid query requests remain explicit in the service contract.
2. **Case:** A controller wants to return `Collection<LISTDTO>` instead - reject; pagination metadata is part of the contract.
3. **Case:** A future non-controller-backed service extends `DefaultService` - it must either become list-aware or use a more specific abstraction; do not weaken the contract for speculative future services.

---

### Step 4: Add `POST /list` to `DefaultController`

**Goal:** Give every controller-backed entity the same list-query endpoint shape.
**Dependencies:** Step 3 and Task 2 Bean Validation request model.

- [x] Change `DefaultController<DTO, MINIDTO, FORM, ID>` to `DefaultController<DTO, MINIDTO, LISTDTO, FORM, ID>`.
- [x] Change the `defaultService` field and constructor to `DefaultService<DTO, MINIDTO, LISTDTO, FORM, ID>`.
- [x] Import `org.springframework.data.domain.Page`.
- [x] Import `com.authServer.shared.query.PageableRequest`.
- [x] Add `@PostMapping("/list")` method accepting `@Valid @RequestBody PageableRequest request`.
- [x] Return `ResponseEntity.ok(defaultService.getListPage(request))`.

**Why this step is critical:**
The frontend and future AgentForge list screens need one stable endpoint pattern. `POST /list` avoids encoding nested filter groups into query parameters and keeps controllers thin.

#### Implementation Sketch

```java
@PostMapping("/list")
public ResponseEntity<Page<LISTDTO>> getListPage(@Valid @RequestBody PageableRequest request)
        throws InvalidQueryRequestException {

    return ResponseEntity.ok(defaultService.getListPage(request));
}
```

#### Edge Cases

1. **Case:** Empty request body or malformed enum text - already handled by Task 3 `HttpMessageNotReadableException` handling.
2. **Case:** Invalid page/size or missing nested fields - handled by Bean Validation and `MethodArgumentNotValidException` mapping from Task 3.
3. **Case:** Route conflict with insert `POST {"", "/"}` - no conflict; `/list` is a distinct path.
4. **Case:** Client uses `GET /admin/list` - not supported; the parent decision is `POST` for complex list queries.

---

### Step 5: Implement generic list flow in `DefaultServiceImplements`

**Goal:** Connect request validation, predicate building, pageable creation, repository execution, and list DTO mapping in one reusable method.
**Dependencies:** Steps 1 - 3 and Task 3 query infrastructure.

- [x] Change `DefaultServiceImplements<DTO, MINIDTO, FORM, ENTITY, ID>` to `DefaultServiceImplements<DTO, MINIDTO, LISTDTO, FORM, ENTITY, ID>`.
- [x] Change mapper field and constructor type to `DefaultMapper<DTO, MINIDTO, LISTDTO, FORM, ENTITY>`.
- [x] Add constructor-injected collaborators: `EntityQueryProfile<ENTITY> queryProfile`, `PageableFactory<ENTITY> pageableFactory`, and `QueryPredicateBuilder<ENTITY> queryPredicateBuilder`.
- [x] Implement `getListPage(PageableRequest request)` with `@PreAuthorize("isAuthenticated()")`, matching inherited CRUD read behavior.
- [x] Build the predicate through `queryPredicateBuilder.build(request, queryProfile)`.
- [x] Build the page request through `pageableFactory.create(request, queryProfile)`.
- [x] Execute `repository.findAll(predicate, pageRequest)`.
- [x] Map the returned page with `.map(mapper::toListDTO)`.
- [x] Do not mutate or save entities while serving list requests.

**Why this step is critical:**
This is the reusable orchestration that future AgentForge entities should inherit. Query metadata stays entity-specific, but the execution flow is shared.

#### Implementation Sketch

```java
@Override
@PreAuthorize("isAuthenticated()")
public Page<LISTDTO> getListPage(PageableRequest request) throws InvalidQueryRequestException {
    Predicate predicate = queryPredicateBuilder.build(request, queryProfile);
    PageRequest pageRequest = pageableFactory.create(request, queryProfile);

    return repository.findAll(predicate, pageRequest)
            .map(mapper::toListDTO);
}
```

#### Edge Cases

1. **Case:** `request` is `null` - `QueryPredicateBuilder` and `PageableFactory` already reject this as `InvalidQueryRequestException`.
2. **Case:** `queryProfile` is missing - treat as implementation/configuration error. Do not paper over it with a fake profile.
3. **Case:** Empty filters - Task 3 returns a neutral non-null predicate.
4. **Case:** Empty sort - `PageableFactory` uses `queryProfile.defaultSort()` and validates that default.
5. **Case:** Mapper returns `null` list DTOs - this is a concrete mapper bug; Task 5 should test production mappers.

---

### Step 6: Add focused shared-layer tests

**Goal:** Prove Task 4 wiring without waiting for full Admin/Client endpoint tests from Task 6.
**Dependencies:** Steps 1 - 5.

- [x] Add a unit test for `DefaultServiceImplements.getListPage(...)` using Mockito mocks for repository/mapper/query builders.
- [x] Assert `QueryPredicateBuilder.build(...)` receives the request and profile.
- [x] Assert `PageableFactory.create(...)` receives the request and profile.
- [x] Assert repository `findAll(predicate, pageRequest)` is called once.
- [x] Assert returned `Page<ENTITY>` is mapped to `Page<LISTDTO>` with pagination metadata preserved.
- [x] Add a small controller test proving `POST /list` delegates to `DefaultService.getListPage(...)`.

**Why this step is critical:**
The integration is generic and easy to break during future package renames. A focused test protects the contract without duplicating Task 6's Admin/Client endpoint integration tests.

#### Edge Cases

1. **Case:** Mocking `DefaultRepository` with `QuerydslPredicateExecutor` causes ambiguous `findAll` methods - disambiguate with typed `Predicate` and `Pageable` matchers.
2. **Case:** `Page.map(...)` is not preserving metadata in the assertion - assert page number, size, total elements, and content separately.
3. **Case:** Controller test needs security context - keep it as a direct method/unit test unless a Spring MVC slice adds clear value.

---

## Design Decisions

**Decision 1:** Add `LISTDTO` to the generic CRUD contracts instead of reusing `DTO` for list endpoints.
- **Why:** List screens often need safer, smaller read models. The parent feature explicitly chose list DTOs as a first-class shape to avoid over-fetching and leaking detail-only fields.
- **Alternatives considered:** Return `Page<DTO>` from `getListPage`. Rejected because it makes list views depend on full detail DTOs and undermines the feature's safety goal.

**Decision 2:** Use `QuerydslPredicateExecutor.findAll(Predicate, Pageable)` through `DefaultRepository`.
- **Why:** Spring Data exposes the exact operation this feature needs: predicate + pageable -> `Page<ENTITY>`. Putting the interface on `DefaultRepository` keeps every repository aligned.
- **Alternatives considered:** Inject `EntityManager` or `JPAQueryFactory` into services. Rejected for this task because Task 3 already produces predicates and no custom projection query is needed.

**Decision 3:** Map `Page<ENTITY>` to `Page<LISTDTO>` with `Page.map(mapper::toListDTO)`.
- **Why:** Spring Data's `Page.map(...)` preserves pagination metadata while converting content. This is less error-prone than manually constructing `PageImpl`.
- **Alternatives considered:** `page.getContent().stream().map(...)` plus `new PageImpl<>(...)`. Rejected because it duplicates framework behavior and is easier to get wrong.

**Decision 4:** Keep query metadata out of controllers.
- **Why:** Controllers should know the request and response shape only. Entity-specific fields belong in `EntityQueryProfile`; query translation belongs in Task 3 builders; services coordinate.
- **Alternatives considered:** Inject profiles directly into controllers. Rejected because it makes controllers persistence-aware.

**Decision 5:** Do not introduce fake/no-op query support for current entities.
- **Why:** A generic endpoint that exists but fails at runtime is worse than no endpoint. If Task 4 cannot compile independently without real profiles, coordinate with Task 5 instead of hiding the gap behind placeholder collaborators.
- **Alternatives considered:** Nullable collaborators or `UnsupportedOperationException` in `getListPage`. Rejected because those paths would expose server misconfiguration through the public API.

**Decision 6:** Pull minimal Admin/Client list support into this task instead of leaving inherited `/list` endpoints half-wired.
- **Why:** Once `DefaultController` owns `POST /list`, `AdminController` and `ClientController` inherit the route immediately. Deferring real profiles would expose a public endpoint that compiles but fails through missing query collaborators. The safer path was to add real `AdminListDTO`, `ClientListDTO`, `AdminQueryProfile`, and `ClientQueryProfile` now, using a conservative allowlist of inherited user fields and omitting `roles` and `apikey` from query profiles.
- **Alternatives considered:** Keep Task 4 strictly shared-layer only and accept a non-green compile until Task 5. Rejected because the user asked to execute the task end-to-end. Use placeholder profiles. Rejected by this task's own runtime-safety rule.

---

## Testing Considerations

### Automatic Validation

- [x] `JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64" mvn clean compile` from `code/backend/` exits `0`.
- [x] `JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64" mvn -Dtest='DefaultServiceImplementsListQueryTest,DefaultControllerListEndpointTest' test` from `code/backend/` exits `0` with 4 tests, 0 failures, 0 errors.
- [x] `JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64" mvn clean test -Dtest="authServerApplicationTests,PageableRequestValidationTest,QueryableFieldTest,PageableFactoryTest,QueryPredicateBuilderTest,GlobalExceptionHandlerQueryTest,DefaultServiceImplementsListQueryTest,DefaultControllerListEndpointTest,ClientRepositoryTest"` exits `0` with 51 tests, 0 failures, 0 errors.
- [x] Do not use default `mvn test` as the only validation signal until the known `TestLauncher` issue is fixed.

### Manual Validation

- [x] Confirm no generated QueryDSL sources under `code/backend/target/generated-sources/annotations` are committed; validation regenerated them locally only.
- [x] Confirm `POST /list` endpoint implementation is generic and does not contain Admin/Client-specific field names.
- [x] Confirm entity field exposure is explicit and conservative: Admin/Client profiles allow only `id`, `firstName`, `lastName`, `email`, `username`, `enabled`, `dateCreated`, and `lastLogin`; no reflection, `roles`, `password`, or `apikey` exposure was added.

**Rule:** Run automatic checks when possible. Manual checks are scope and safety inspections only.

---

## Related Code Explanations

- `code/backend/src/main/java/com/authServer/shared/defaultInterfaces/DefaultRepository.java:7` - repository extension point for QueryDSL predicate execution.
- `code/backend/src/main/java/com/authServer/shared/defaultInterfaces/DefaultMapper.java:3` - mapper contract that gains `LISTDTO` and `toListDTO`.
- `code/backend/src/main/java/com/authServer/shared/defaultInterfaces/DefaultService.java:10` - service contract that gains `Page<LISTDTO>` list query method.
- `code/backend/src/main/java/com/authServer/shared/defaultImplements/DefaultController.java:14` - shared REST controller that gains `POST /list`.
- `code/backend/src/main/java/com/authServer/shared/defaultImplements/DefaultServiceImplements.java:22` - generic service implementation that will coordinate the query flow.
- `code/backend/src/main/java/com/authServer/shared/query/PageableFactory.java:14` - creates validated `PageRequest` values.
- `code/backend/src/main/java/com/authServer/shared/query/QueryPredicateBuilder.java:13` - creates validated QueryDSL predicates from `PageableRequest`.
- `code/backend/src/main/java/com/authServer/shared/query/EntityQueryProfile.java:8` - entity-specific field allowlist contract required by the generic list flow.

---

## Notes / Follow-ups

- Task 5's core production wiring was pulled into this task for runtime safety: real Admin/Client list DTOs and query profiles now exist, and current Admin/Client services/controllers are wired to the generic flow.
- Task 6 should still add repository/service integration tests for `Page<LISTDTO>` on Admin and Client and controller tests for `POST /admin/list` and `POST /client/list` with success and `400 Bad Request` cases.
- If a standalone Task 5 document is later created, write it as a verification/refinement task instead of duplicating the already-implemented production wiring.
- Context7 is currently quota-blocked. Re-run Context7 after authentication if exact snippets are needed during implementation.
- The known `DefaultServiceImplements.update(...)` bug is out of scope. Do not fix it while adding list-query support unless a separate bug/task is opened.

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task.
- [x] Relevant skills reviewed and selected for this task.
- [x] Up-to-date documentation checked, or Context7 quota limitation recorded with official-doc fallback.
- [x] `DefaultRepository` extends `QuerydslPredicateExecutor<ENTITY>`.
- [x] `DefaultMapper`, `DefaultService`, `DefaultController`, and `DefaultServiceImplements` include `LISTDTO` in their generic contracts.
- [x] `DefaultMapper` exposes `toListDTO(ENTITY entity)`.
- [x] `DefaultController` exposes generic `POST /list` accepting `@Valid @RequestBody PageableRequest`.
- [x] `DefaultServiceImplements.getListPage(...)` builds predicate and pageable through Task 3 infrastructure, calls `repository.findAll(predicate, pageable)`, and maps with `Page.map(mapper::toListDTO)`.
- [x] No reflection, arbitrary sort/filter field names, mutable request state, or read-side entity mutation is introduced.
- [x] Focused shared-layer tests are added.
- [x] Automatic validation passes; Task 4 was explicitly paired with the minimum Task 5 production wiring needed for safe runtime behavior.
- [x] Parent feature Task 4 link is updated to this task document.
- [x] Memory Bank `context.md` is updated after implementation.
