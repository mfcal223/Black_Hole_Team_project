# Task: Add Automated QueryDSL List Validation

#task #current #high-complexity #backend #testing #querydsl #pagination #parent-backend-querydsl-filtering-pagination

**Parent:** [[Backend-QueryDSL-Filtering-Pagination]]
**Parent Type:** Feature
**Related Step(s):** Phase 6, Steps 6.1 - 6.7
**Estimated Complexity:** High

---

## Goal

Add the remaining automated validation for the backend QueryDSL filtering and pagination feature. This task should prove that the real Admin and Client list-query endpoints work end-to-end through repository, service, and controller layers, while preserving the existing shared-query unit coverage.

This is a validation task. Do not change production behavior unless a new test exposes a defect that must be fixed for the feature to be correct.

---

## Parent Context

The parent feature [[Backend-QueryDSL-Filtering-Pagination]] adds reusable `POST /{entity}/list` endpoints to the Spring Boot backend under `code/backend/`.

Completed prerequisites:

- [[Backend-QueryDSL-Filtering-Pagination-step-1-configure-querydsl]] configured OpenFeign QueryDSL `6.12` for Spring Boot 3 / Jakarta Persistence and verified Q-class generation.
- [[Backend-QueryDSL-Filtering-Pagination-step-2-request-model]] created the request DTO and enum model with Bean Validation.
- [[Backend-QueryDSL-Filtering-Pagination-step-3-query-infrastructure]] created explicit query fields, entity profiles, typed conversion, pageable creation, predicate building, and controlled `400 Bad Request` errors.
- [[Backend-QueryDSL-Filtering-Pagination-step-4-generic-crud-integration]] added `LISTDTO` to generic CRUD contracts, extended repositories with `QuerydslPredicateExecutor`, and added generic `POST /list` service/controller support.
- [[Backend-QueryDSL-Filtering-Pagination-step-5-admin-client-integration]] confirmed Admin and Client have list DTOs, conservative query profiles, mapper support, and service/controller wiring.

Phase 6 status from the parent feature:

- Phase 6, Steps 6.1 - 6.3 are already covered by existing request/query infrastructure unit tests.
- Phase 6, Steps 6.4 - 6.7 are now implemented or explicitly recorded: entity-level repository/service integration tests and controller endpoint tests pass; `./mvnw test`, default `mvn test`, and `mvn verify` remain blocked by known unrelated build-hygiene issues.

Important parent constraints preserved by this task:

- Use explicit allowlisted fields only; do not introduce reflection or arbitrary client-controlled sort/filter paths.
- Invalid fields, operators, values, sort fields, validation errors, and malformed request bodies must return controlled `400 Bad Request` responses.
- Do not expose `password`, `apikey`, `roles`, or internal Spring Security account flags as queryable fields.
- List endpoint responses must use `AdminListDTO` and `ClientListDTO`, not full detail DTOs.
- Existing `GET /{entity}` endpoints can remain, but list validation should target `POST /admin/list` and `POST /client/list`.

---

## Preconditions / Dependencies

- `code/backend/pom.xml` resolves Spring Boot `3.4.1`, Spring Data JPA `3.4.1`, Spring Boot test modules `3.4.1`, Spring Framework test `6.2.1`, Spring Security Test `6.4.2`, OpenFeign QueryDSL `6.12`, Mockito `5.14.2`, and Java `21`.
- `code/backend/src/main/resources/application-test.properties` uses H2 in-memory with `ddl-auto=create-drop`, fixed test secrets, and scheduling disabled.
- Generated QueryDSL types exist after Maven compilation, including `QAdminEntity` and `QClientEntity`.
- `AdminQueryProfile` and `ClientQueryProfile` currently allow only `id`, `firstName`, `lastName`, `email`, `username`, `enabled`, `dateCreated`, and `lastLogin`.
- The backend Maven wrapper is incomplete because `code/backend/.mvn/wrapper/maven-wrapper.properties` is missing. Use system Maven with Java 21 until a separate build-hygiene task repairs the wrapper.
- Default `mvn test` is currently blocked by the known `TestLauncher` empty-suite discovery issue. Use targeted Maven validation for this task, then record the default-suite blocker instead of masking it.
- Security behavior is currently not a reliable Task 6 assertion target: `SecurityConfig` registers JWT filtering but does not configure `authorizeHttpRequests(...)`, and no `@EnableMethodSecurity` annotation exists for service `@PreAuthorize(...)`. Do not add authorization expectations in this task unless security is fixed by a separate task first.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `memory-bank` - **Selected** - confirmed AgentForge context, current QueryDSL feature status, backend layering, dependency versions, and known build/test blockers.
- `documentation-management` - **Selected** - this is a Task document under `documentation/Tasks/current/` and must link back to the parent feature.
- `solid` - **Selected** - guides the test boundaries: repository tests prove persistence integration, service tests prove orchestration/mapping, controller tests prove HTTP contract and error translation.
- `find-docs` / Context7 - **Selected** - Context7 resolution was attempted on 2026-04-27 for Spring Boot, Spring Data JPA, and Spring Security, but the workspace quota is exhausted. Version-aware official documentation was used as fallback.

### Documentation Reviewed

- Context7: Spring Boot - attempted during execution; blocked by `Monthly quota exceeded`.
- Context7: Spring Data JPA - attempted during execution; blocked by `Monthly quota exceeded`.
- Context7: OpenFeign QueryDSL - attempted during execution; blocked by `Monthly quota exceeded`.
- `code/backend/pom.xml` - verified exact project dependency versions and test dependencies.
- Maven dependency tree from `code/backend/` - verified resolved versions: Spring Data JPA `3.4.1`, Spring Boot test/autoconfigure `3.4.1`, Spring Framework test `6.2.1`, Spring Security Test `6.4.2`, OpenFeign QueryDSL `6.12`.
- Official Spring Boot 3.4.x `SpringBootTest` API docs - confirms `@SpringBootTest` loads a Spring Boot application context and defaults to the mock web environment.
- Official Spring Boot 3.4.x `AutoConfigureMockMvc` API docs - confirms `MockMvc` auto-configuration and that application filters are registered by default.
- Official Spring Boot 3.4.x `DataJpaTest` API docs - confirms focused JPA slices, repository/entity scanning, transactional rollback, and embedded database use by default.
- Spring Data JPA Spring Data Extensions reference - confirms QueryDSL support through `QuerydslPredicateExecutor` and the OpenFeign QueryDSL fork groupId `io.github.openfeign.querydsl`.
- Spring Data Commons `3.4.1` `QuerydslPredicateExecutor` API docs - confirms `findAll(Predicate, Pageable)` returns `Page<T>` and requires non-null predicate/pageable values.
- Spring Data Commons `3.4.1` `Page` API docs - confirms `Page.map(Function)` returns a mapped `Page` while preserving pagination metadata.
- Spring Security Test `6.4.2` is present in the POM. The new service/controller tests use `@WithMockUser` only as future-proofing for `@PreAuthorize`; they intentionally do not assert `401`/`403` because request authorization and method security are not fully configured.

### Related Existing Code

- `code/backend/src/test/java/com/authServer/shared/query/PageableRequestValidationTest.java` - existing Phase 6.1 request validation/default-value coverage.
- `code/backend/src/test/java/com/authServer/shared/query/PageableFactoryTest.java` - existing invalid/default sort coverage.
- `code/backend/src/test/java/com/authServer/shared/query/QueryPredicateBuilderTest.java` - existing invalid field/operator/value and predicate-generation coverage.
- `code/backend/src/test/java/com/authServer/shared/query/QueryableFieldTest.java` - existing typed conversion/operator support coverage.
- `code/backend/src/test/java/com/authServer/exceptions/GlobalExceptionHandlerQueryTest.java` - existing query validation/malformed-body `400` mapping coverage.
- `code/backend/src/test/java/com/authServer/shared/defaultImplements/DefaultServiceImplementsListQueryTest.java` - existing generic service orchestration coverage.
- `code/backend/src/test/java/com/authServer/shared/defaultImplements/DefaultControllerListEndpointTest.java` - existing generic controller delegation coverage.
- `code/backend/src/main/java/com/authServer/models/hq/admin/AdminController.java:9` - inherited `POST /admin/list` endpoint.
- `code/backend/src/main/java/com/authServer/models/hq/admin/AdminServiceImpl.java:17` - Admin service wired to generic list-query flow.
- `code/backend/src/main/java/com/authServer/models/hq/admin/AdminQueryProfile.java:18` - Admin allowed query/sort fields.
- `code/backend/src/main/java/com/authServer/models/hq/admin/AdminMapper.java:39` - Admin entity to list DTO mapping.
- `code/backend/src/main/java/com/authServer/models/hq/client/ClientController.java:16` - inherited `POST /client/list` endpoint.
- `code/backend/src/main/java/com/authServer/models/hq/client/ClientService.java:27` - Client service wired to generic list-query flow.
- `code/backend/src/main/java/com/authServer/models/hq/client/ClientQueryProfile.java:18` - Client allowed query/sort fields.
- `code/backend/src/test/java/com/authServer/testUtils/TestAuthenticationHelper.java` - existing helper for test users/tokens, useful only if security assertions become valid.
- `code/backend/src/test/java/com/authServer/models/hq/ListQueryTestDataFactory.java` - deterministic Admin/Client test data and query request helpers added by this task.
- `code/backend/src/test/java/com/authServer/models/hq/admin/AdminRepositoryQuerydslIntegrationTest.java` - Admin repository + QueryDSL + H2 integration coverage added by this task.
- `code/backend/src/test/java/com/authServer/models/hq/client/ClientRepositoryQuerydslIntegrationTest.java` - Client repository + QueryDSL + H2 integration coverage added by this task.
- `code/backend/src/test/java/com/authServer/models/hq/admin/AdminServiceListQueryIntegrationTest.java` - real Admin service `Page<AdminListDTO>` coverage added by this task.
- `code/backend/src/test/java/com/authServer/models/hq/client/ClientServiceListQueryIntegrationTest.java` - real Client service `Page<ClientListDTO>` coverage added by this task.
- `code/backend/src/test/java/com/authServer/models/hq/admin/AdminControllerListEndpointTest.java` - MockMvc `POST /admin/list` success and `400` coverage added by this task.
- `code/backend/src/test/java/com/authServer/models/hq/client/ClientControllerListEndpointTest.java` - MockMvc `POST /client/list` success and `400` coverage added by this task.

---

## Implementation Details

### Approach

Keep tests layered and focused:

- Repository integration tests should prove QueryDSL predicates, pageable requests, and sorting execute against real JPA/H2 persistence for Admin and Client.
- Service integration tests should prove real services compose `PageableRequest`, query profiles, predicate/pageable builders, repositories, and mappers into `Page<AdminListDTO>` / `Page<ClientListDTO>` results.
- Controller tests should prove `POST /admin/list` and `POST /client/list` accept the public request JSON, return paged list DTO content, and translate invalid query requests into `400 Bad Request`.

Prefer deterministic test data created inside each test or in a local test fixture. Do not rely on `AdminBoostrap` seeded data because it can make counts, sorting, and pagination assertions brittle.

Execution added one shared test-data factory and six focused test classes. No production code was changed because the tests did not expose a feature defect.

### Existing Coverage Map

| Parent Step | Existing Coverage | Task 6 Action |
|-------------|-------------------|---------------|
| Step 6.1: request validation/default values | `PageableRequestValidationTest` | Keep as regression coverage; do not duplicate. |
| Step 6.2: invalid fields/operators/values/sort | `PageableFactoryTest`, `QueryPredicateBuilderTest`, `GlobalExceptionHandlerQueryTest` | Add entity endpoint `400` cases to prove the same errors cross HTTP. |
| Step 6.3: string/number/boolean/enum/date predicate generation | `QueryableFieldTest`, `QueryPredicateBuilderTest` | Add entity-level persistence checks for representative string, boolean, number/id, and date fields. |
| Step 6.4: repository/service integration for `Page<LISTDTO>` | Missing for Admin/Client production slices | Add Admin and Client repository/service integration tests. |
| Step 6.5: controller tests for `POST /admin/list` and `POST /client/list` | Only generic controller unit coverage exists | Add MockMvc endpoint tests for success and `400` cases. |
| Step 6.6: `./mvnw test` | Known wrapper and `TestLauncher` blockers | Use system Maven targeted validation; record blockers if default lifecycle still fails. |
| Step 6.7: `./mvnw verify` | Not yet validated for this feature | Run only if wrapper/default-suite blockers are fixed or use system Maven and record exact result. |

### Files to Create or Modify

- [x] `code/backend/src/test/java/com/authServer/models/hq/admin/AdminRepositoryQuerydslIntegrationTest.java` - Admin repository + QueryDSL + H2 integration coverage.
- [x] `code/backend/src/test/java/com/authServer/models/hq/client/ClientRepositoryQuerydslIntegrationTest.java` - Client repository + QueryDSL + H2 integration coverage.
- [x] `code/backend/src/test/java/com/authServer/models/hq/admin/AdminServiceListQueryIntegrationTest.java` - real Admin service `Page<AdminListDTO>` coverage.
- [x] `code/backend/src/test/java/com/authServer/models/hq/client/ClientServiceListQueryIntegrationTest.java` - real Client service `Page<ClientListDTO>` coverage.
- [x] `code/backend/src/test/java/com/authServer/models/hq/admin/AdminControllerListEndpointTest.java` - MockMvc coverage for `POST /admin/list`.
- [x] `code/backend/src/test/java/com/authServer/models/hq/client/ClientControllerListEndpointTest.java` - MockMvc coverage for `POST /client/list`.
- [x] `code/backend/src/test/java/com/authServer/models/hq/ListQueryTestDataFactory.java` - shared deterministic test data and request builder helper.
- [x] `documentation/Features/to-do/Backend-QueryDSL-Filtering-Pagination.md` - Phase 6 checkboxes and Task 6 status updated.
- [x] `documentation/Tasks/current/Backend-QueryDSL-Filtering-Pagination-step-6-validation.md` - completed criteria and validation results recorded.

The exact test file names can be adjusted during implementation, but keep them ending in `Test` so Surefire can run them without requiring Failsafe configuration.

---

## Step-by-Step Implementation

### Step 1: Reconfirm Existing Shared-Layer Coverage

**Goal:** Avoid duplicating tests already completed in Phase 6.1 - 6.3 and establish a baseline before adding entity-level validation.
**Dependencies:** Tasks 2 - 5 completed.

- [x] Review the existing shared query tests and confirm they still cover request validation/defaults, invalid sort/filter requests, typed conversion, and predicate generation.
- [x] Run the existing focused shared-query suite before adding new tests.
- [x] Record any existing failures separately from new Task 6 failures. No baseline failures were found.

**Why this step is critical:**
Task 6 should fill entity integration gaps, not rewrite stable unit tests. A clean baseline makes later failures easier to diagnose.

#### Suggested Command

```bash
JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64" mvn -Dtest='PageableRequestValidationTest,QueryableFieldTest,PageableFactoryTest,QueryPredicateBuilderTest,GlobalExceptionHandlerQueryTest,DefaultServiceImplementsListQueryTest,DefaultControllerListEndpointTest' test
```

#### Edge Cases

1. **Case:** Existing shared-layer tests fail before Task 6 edits - stop and diagnose the existing regression before adding endpoint tests.
2. **Case:** Maven wrapper is still broken - use system Maven and record the wrapper blocker.

---

### Step 2: Add Admin And Client Repository QueryDSL Integration Tests

**Goal:** Prove the real repositories execute QueryDSL predicates with pagination and sorting against the H2 test database.
**Dependencies:** QueryDSL generated Q classes, `DefaultRepository` extending `QuerydslPredicateExecutor`, and test profile H2 configuration.

- [x] Add Admin repository integration tests using `@DataJpaTest` and `@ActiveProfiles("test")`.
- [x] Add Client repository integration tests using `@DataJpaTest` and `@ActiveProfiles("test")`.
- [x] Persist deterministic Admin/Client rows with unique usernames/emails and explicit `enabled`, `dateCreated`, and `lastLogin` values.
- [x] Assert `findAll(predicate, PageRequest)` returns the expected total, page size, content, and order.
- [x] Cover at least one string predicate such as `username.containsIgnoreCase(...)` or equivalent builder-generated predicate.
- [x] Cover at least one boolean predicate on `enabled`.
- [x] Cover at least one numeric/id predicate after persisted IDs are assigned.
- [x] Cover at least one date/time predicate on `dateCreated` or `lastLogin` using stable range comparisons.
- [x] Do not add repository tests for `roles`, `password`, or `apikey`; those are not allowed query fields.

**Why this step is critical:**
The shared query builder can produce valid predicates in unit tests while real persistence still fails because of entity inheritance, generated Q paths, H2 behavior, or repository wiring. Repository integration tests catch those failures at the persistence boundary.

#### Edge Cases

1. **Case:** Date precision differs after persistence - assert dates with stable ranges or use fixed dates that round-trip cleanly through H2.
2. **Case:** Bootstrap data appears in full-context tests - keep repository tests as `@DataJpaTest` and create only local data.
3. **Case:** Existing `ClientRepositoryTest` package path differs from production package - place new tests under `com.authServer.models.hq.client`, matching the production code.

---

### Step 3: Add Admin And Client Service List-Query Integration Tests

**Goal:** Prove the real services return `Page<AdminListDTO>` and `Page<ClientListDTO>` through the generic list-query flow.
**Dependencies:** Steps 1 - 2 and Task 5 production wiring.

- [x] Add Admin service integration tests with the real `AdminServiceImpl`, `AdminQueryProfile`, `PageableFactory`, `QueryPredicateBuilder`, repository, and mapper.
- [x] Add Client service integration tests with the real `ClientService`, `ClientQueryProfile`, `PageableFactory`, `QueryPredicateBuilder`, repository, and mapper.
- [x] Persist deterministic rows through repositories; avoid relying on seeded admin data.
- [x] Call `getListPage(PageableRequest)` with an empty/default request and assert default page number, size, total elements, and `id ASC` ordering.
- [x] Call `getListPage(PageableRequest)` with filter/sort/pagination requests and assert the mapped list DTO content.
- [x] Assert returned DTOs include safe list fields and do not expose `password` or Client `apikey`.
- [x] Assert invalid field requests such as `password`, `roles`, and `apikey` throw `InvalidQueryRequestException` before repository access causes uncontrolled failures.
- [x] Use `@WithMockUser` on service tests as future-proofing if method security becomes enabled later.

**Why this step is critical:**
The service is the coordination point required by the feature: request -> predicate -> pageable -> repository -> mapper -> `Page<LISTDTO>`. Unit tests already cover the generic orchestration, but this step proves the production Admin and Client beans are correctly assembled.

#### Edge Cases

1. **Case:** `@PreAuthorize` starts applying after a security change - make the test user explicit with `@WithMockUser` or `SecurityContextHolder`, and document the dependency.
2. **Case:** `Page` ordering is nondeterministic with identical values - sort by unique fields such as `id` or `username` for stable assertions.
3. **Case:** Mapper returns role authority sets in non-deterministic order - assert set membership rather than list order for roles.

---

### Step 4: Add Admin Controller `POST /admin/list` Tests

**Goal:** Prove the public Admin list endpoint accepts request JSON, returns a paged Admin list response, and emits controlled `400 Bad Request` errors.
**Dependencies:** Steps 1 - 3 and working Spring MVC test context.

- [x] Add a MockMvc test class using `@SpringBootTest`, `@AutoConfigureMockMvc`, and `@ActiveProfiles("test")`.
- [x] Persist deterministic Admin rows before each test and isolate test data between methods.
- [x] Test success with an empty/default request body: `POST /admin/list` returns `200 OK`, `content`, pagination metadata, and safe Admin list DTO fields.
- [x] Test success with filter + sort + pagination request JSON.
- [x] Test `400 Bad Request` for unknown filter field `password` and unknown sort field `password`.
- [x] Test `400 Bad Request` for unsupported operator `CONTAINS` on `enabled`.
- [x] Test `400 Bad Request` for invalid value type, such as non-numeric `id` value.
- [x] Test `400 Bad Request` for invalid request validation, such as `size` greater than `100`.
- [x] Test `400 Bad Request` for malformed enum/body.
- [x] Do not assert authentication/authorization behavior in this task because security has not been explicitly fixed.

**Why this step is critical:**
The feature's client-facing contract is the controller endpoint. Existing generic controller tests prove only method mapping/delegation; this step proves the real Admin route, JSON binding, Bean Validation, exception handling, and page serialization work together.

#### Example Success Request

```json
{
  "page": 0,
  "size": 10,
  "sort": [
    { "field": "username", "direction": "ASC" }
  ],
  "filters": [
    {
      "field": "email",
      "operations": [
        { "operator": "CONTAINS", "value": "example.com" }
      ]
    }
  ]
}
```

#### Edge Cases

1. **Case:** Jackson `Page` serialization includes framework-specific fields - assert only the stable contract fields needed by the frontend, especially `content`, `totalElements`, `size`, and `number` if present.
2. **Case:** Filters are registered by MockMvc and security behavior changes - use the current real configuration and update assertions only after a dedicated security fix.

---

### Step 5: Add Client Controller `POST /client/list` Tests

**Goal:** Prove the public Client list endpoint works like Admin while preserving Client-specific sensitive-field exclusions.
**Dependencies:** Steps 1 - 4.

- [x] Add a MockMvc test class using `@SpringBootTest`, `@AutoConfigureMockMvc`, and `@ActiveProfiles("test")`.
- [x] Persist deterministic Client rows before each test and isolate test data between methods.
- [x] Test success with an empty/default request body: `POST /client/list` returns `200 OK`, paged content, and safe Client list DTO fields.
- [x] Test success with filter + sort + pagination request JSON.
- [x] Test `400 Bad Request` for unknown field `apikey`.
- [x] Test `400 Bad Request` for unknown field `roles`.
- [x] Test `400 Bad Request` for unsupported operator, invalid value type, invalid size, and malformed enum/body.
- [x] Confirm the existing `/client/token/{username}` endpoint is not modified or coupled to list-query tests.

**Why this step is critical:**
Client has the strongest sensitive-field concern because of API-key behavior. Endpoint validation must prove API-key material is not exposed in list DTOs or accepted as a dynamic query field.

#### Edge Cases

1. **Case:** `apikey` appears in `ClientDTO` or entity behavior - it must still be absent from `ClientListDTO`, response JSON, and `ClientQueryProfile`.
2. **Case:** Role display data exists in the list DTO - roles can remain display data, but role filtering should still return `400` until explicitly designed and tested.

---

### Step 6: Run Targeted And Lifecycle Validation

**Goal:** Prove the added tests pass and accurately record known build lifecycle blockers.
**Dependencies:** Steps 1 - 5.

- [x] Run a targeted Task 6 test command covering the new repository, service, and controller tests.
- [x] Run the broader QueryDSL feature test suite including existing Phase 6.1 - 6.3 tests.
- [x] Attempt default lifecycle validation: `./mvnw test` cannot start because wrapper metadata is missing; default system `mvn test` fails only through the known `TestLauncher` empty-suite issue after feature tests run.
- [x] Run system Maven `verify` and record the exact blocker/result: it fails through the same `TestLauncher` empty-suite issue.
- [x] Do not commit or document generated QueryDSL sources under `code/backend/target/generated-sources/annotations` as source files.

Execution validation results:

- `JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64" mvn -Dtest='PageableRequestValidationTest,QueryableFieldTest,PageableFactoryTest,QueryPredicateBuilderTest,GlobalExceptionHandlerQueryTest,DefaultServiceImplementsListQueryTest,DefaultControllerListEndpointTest' test` passed with 38 tests, 0 failures, 0 errors.
- `JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64" mvn -Dtest='AdminRepositoryQuerydslIntegrationTest,ClientRepositoryQuerydslIntegrationTest,AdminServiceListQueryIntegrationTest,ClientServiceListQueryIntegrationTest' test` passed with 12 tests, 0 failures, 0 errors.
- `JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64" mvn -Dtest='AdminControllerListEndpointTest,ClientControllerListEndpointTest' test` passed with 16 tests, 0 failures, 0 errors.
- `JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64" mvn clean test -Dtest='authServerApplicationTests,PageableRequestValidationTest,QueryableFieldTest,PageableFactoryTest,QueryPredicateBuilderTest,GlobalExceptionHandlerQueryTest,DefaultServiceImplementsListQueryTest,DefaultControllerListEndpointTest,AdminRepositoryQuerydslIntegrationTest,ClientRepositoryQuerydslIntegrationTest,AdminServiceListQueryIntegrationTest,ClientServiceListQueryIntegrationTest,AdminControllerListEndpointTest,ClientControllerListEndpointTest,ClientRepositoryTest'` passed with 79 tests, 0 failures, 0 errors.
- `./mvnw test` failed before Maven startup with `cannot open ./.mvn/wrapper/maven-wrapper.properties` / `cannot read distributionUrl property`.
- `JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64" mvn test` failed after running tests because `TestLauncher` selected `E2ESuiteTest` and `UtilsSuiteTest`, both of which throw `NoTestsDiscoveredException`. Reported result: 99 tests run, 0 failures, 2 errors.
- `JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64" mvn verify` failed through the same `TestLauncher` / empty-suite issue. Reported result: 99 tests run, 0 failures, 2 errors.

**Why this step is critical:**
Task 6 is the feature's validation gate. It must distinguish feature regressions from known repository build-hygiene issues so future agents do not misinterpret a blocked default lifecycle as a QueryDSL endpoint failure.

#### Suggested Targeted Commands

```bash
JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64" mvn -Dtest='AdminRepositoryQuerydslIntegrationTest,ClientRepositoryQuerydslIntegrationTest,AdminServiceListQueryIntegrationTest,ClientServiceListQueryIntegrationTest,AdminControllerListEndpointTest,ClientControllerListEndpointTest' test
```

```bash
JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64" mvn -Dtest='authServerApplicationTests,PageableRequestValidationTest,QueryableFieldTest,PageableFactoryTest,QueryPredicateBuilderTest,GlobalExceptionHandlerQueryTest,DefaultServiceImplementsListQueryTest,DefaultControllerListEndpointTest,AdminRepositoryQuerydslIntegrationTest,ClientRepositoryQuerydslIntegrationTest,AdminServiceListQueryIntegrationTest,ClientServiceListQueryIntegrationTest,AdminControllerListEndpointTest,ClientControllerListEndpointTest,ClientRepositoryTest' test
```

#### Lifecycle Checks

```bash
./mvnw test
```

```bash
./mvnw verify
```

If the wrapper is still incomplete, use system Maven and document the substituted commands and outcomes:

```bash
JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64" mvn test
```

```bash
JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64" mvn verify
```

#### Edge Cases

1. **Case:** Targeted tests pass but default `mvn test` fails through `TestLauncher` - record the known blocker and do not expand this task into build-system repair unless explicitly approved.
2. **Case:** `verify` fails because default tests fail before integration checks - record the lifecycle failure and keep Task 6 completion tied to targeted feature validation plus documented blocker status.

---

## Design Decisions

**Decision 1:** Treat Task 6 as validation-first, not feature expansion.
- **Why:** Production QueryDSL support already exists through Tasks 1 - 5. Task 6 should prove behavior and only make production fixes when tests reveal a real defect.
- **Alternatives considered:** Add new operators or query fields while testing. Rejected because it expands scope and weakens the feature gate.

**Decision 2:** Add entity-level tests instead of more shared-layer unit tests.
- **Why:** Shared query and generic service/controller behavior already has focused tests. The remaining risk is real Admin/Client integration across JPA, QueryDSL, service mapping, and HTTP binding.
- **Alternatives considered:** Only add more `QueryPredicateBuilderTest` cases. Rejected because those would not prove the actual endpoints work.

**Decision 3:** Use MockMvc with full Spring Boot context for endpoint tests.
- **Why:** Controller tests need real JSON binding, Bean Validation, exception handlers, controller routing, service wiring, and repositories. `@SpringBootTest` plus `@AutoConfigureMockMvc` exercises that without starting a real server.
- **Alternatives considered:** Direct controller unit tests. Rejected because generic controller delegation is already covered and direct tests would miss HTTP-level failures.

**Decision 4:** Do not assert authentication/authorization behavior inside Task 6.
- **Why:** Current security configuration has known ambiguity around request authorization and method security. Adding auth expectations here would mix endpoint validation with a separate security hardening task.
- **Alternatives considered:** Add `401`/`403` assertions now. Rejected until `authorizeHttpRequests(...)` and method-security behavior are intentionally fixed.

**Decision 5:** Keep generated Q classes as build artifacts.
- **Why:** QueryDSL generated sources belong under `target/generated-sources/annotations` and should not be committed or referenced as source-controlled files.
- **Alternatives considered:** Commit generated Q classes for test stability. Rejected because it creates stale generated code risk.

---

## Testing Considerations

### Automatic Validation

- [x] Existing shared-query suite passes with system Maven and Java 21: 38 tests, 0 failures, 0 errors.
- [x] New Admin repository/service/controller tests pass.
- [x] New Client repository/service/controller tests pass.
- [x] Broader QueryDSL feature suite passes with all existing and new tests: 79 tests, 0 failures, 0 errors.
- [x] `./mvnw test` result recorded: blocked by missing wrapper metadata before Maven starts.
- [x] `mvn test` result recorded: blocked by the known `TestLauncher` / empty-suite issue after feature tests run.
- [x] System Maven `mvn verify` result recorded: blocked by the same `TestLauncher` / empty-suite issue.

### Manual Validation

- [x] Inspect response assertions to confirm `password` never appears in Admin/Client list endpoint JSON.
- [x] Inspect Client response assertions to confirm `apikey` never appears in `POST /client/list` JSON.
- [x] Confirm Admin/Client query profiles still omit `password`, `roles`, `apikey`, and internal account flags.
- [x] Confirm no generated QueryDSL files under `code/backend/target/` are treated as source changes. `target/` output appears in `git status` because the repository lacks a project `.gitignore`; this remains the known build-output sharp edge.

**Rule:** Run automatic checks when possible. Manual checks are safety inspections only and should not replace automated endpoint assertions.

---

## Related Code Explanations

- `code/backend/src/main/java/com/authServer/shared/defaultImplements/DefaultServiceImplements.java:73` - generic `getListPage(...)` flow under test.
- `code/backend/src/main/java/com/authServer/shared/defaultImplements/DefaultController.java:35` - inherited `POST /list` endpoint under test.
- `code/backend/src/main/java/com/authServer/models/hq/admin/AdminQueryProfile.java:18` - Admin filter/sort allowlist under test.
- `code/backend/src/main/java/com/authServer/models/hq/admin/AdminMapper.java:39` - Admin list DTO mapping under test.
- `code/backend/src/main/java/com/authServer/models/hq/client/ClientQueryProfile.java:18` - Client filter/sort allowlist under test.
- `code/backend/src/main/java/com/authServer/models/hq/client/ClientMapper.java:48` - Client list DTO mapping under test.
- `code/backend/src/main/java/com/authServer/exceptions/GlobalExceptionHandler.java` - query/validation/malformed-body error translation under HTTP tests.
- `code/backend/src/main/resources/application-test.properties` - H2 test profile for integration tests.

---

## Notes / Follow-ups

- If endpoint tests reveal that returning raw `Page` produces unstable JSON, open a separate feature/refactor task for stable page response DTOs or Spring Data `PagedModel`. Do not silently change the public contract inside this validation task unless required to make the current feature usable.
- If security expectations are needed for list endpoints, open a separate security task to configure `authorizeHttpRequests(...)`, enable method security if desired, and then add `401`/`403` endpoint assertions.
- If default `mvn test` or `verify` remains blocked by `TestLauncher`, open or link a dedicated build-hygiene task rather than broadening Task 6.
- If role filtering becomes required later, create a separate task for element-collection QueryDSL behavior with focused tests.
- If Client API-key filtering or display becomes required later, require an explicit security decision before exposing it.
- Raw Spring Data `Page` serialization worked for current endpoint tests, and assertions intentionally target stable fields (`content`, `totalElements`, `size`, `number`) only. A stable page-response DTO can remain a future refinement if frontend requirements need it.

---

## Completion Criteria

- [x] Parent feature reviewed and reflected accurately in this task.
- [x] Relevant skills reviewed and selected for this task.
- [x] Up-to-date documentation checked, or Context7 quota limitation recorded with official-doc fallback.
- [x] Existing Phase 6.1 - 6.3 shared-query tests still pass.
- [x] Admin repository integration tests prove QueryDSL predicate + pageable execution against H2.
- [x] Client repository integration tests prove QueryDSL predicate + pageable execution against H2.
- [x] Admin service integration tests prove real `Page<AdminListDTO>` behavior.
- [x] Client service integration tests prove real `Page<ClientListDTO>` behavior.
- [x] `POST /admin/list` controller tests cover success and `400 Bad Request` cases.
- [x] `POST /client/list` controller tests cover success and `400 Bad Request` cases.
- [x] Tests prove sensitive fields are not exposed in list JSON or query profiles.
- [x] Targeted Maven validation passes with Java 21.
- [x] Default `./mvnw test`, system `mvn test`, and `verify` outcomes are recorded accurately, including known blockers.
- [x] Parent feature Phase 6 checkboxes and Task 6 status are updated after implementation.
- [x] Memory Bank `context.md` and `progress.md` are updated after implementation.
