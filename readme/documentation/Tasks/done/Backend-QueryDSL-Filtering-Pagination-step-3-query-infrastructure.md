# Task: Build Stateless Predicate And Pageable Infrastructure

#task #current #high-complexity #parent-backend-querydsl-filtering-pagination

**Parent:** [[Backend-QueryDSL-Filtering-Pagination]]
**Parent Type:** Feature
**Related Step(s):** Phase 3, Steps 3.1 - 3.5
**Estimated Complexity:** High

---

## Goal

Build the shared, stateless query infrastructure that converts the transport-only `PageableRequest` model from Task 2 into validated Spring Data `PageRequest` objects and QueryDSL predicates. This task introduces explicit query field allowlists, typed value conversion, semantic filter/sort validation, and controlled `400 Bad Request` error handling without changing generic CRUD contracts or entity-specific Admin/Client production slices yet.

---

## Parent Context

The parent feature [[Backend-QueryDSL-Filtering-Pagination]] adds reusable QueryDSL-backed list queries to the Spring Boot backend under `code/backend/`.

Tasks already completed:

- [[Backend-QueryDSL-Filtering-Pagination-step-1-configure-querydsl]] added OpenFeign QueryDSL `6.12`, configured annotation processing with `maven-compiler-plugin`, and confirmed Q classes are generated under `code/backend/target/generated-sources/annotations`.
- [[Backend-QueryDSL-Filtering-Pagination-step-2-request-model]] added the transport-only request DTOs/enums under `com.authServer.shared.query`: `PageableRequest`, `SortRequest`, `FilterRequest`, `FilterOperationRequest`, `SortDirection`, and `FilterOperator`.

This task is the bridge between the request model and later repository/service integration:

- Task 3 creates generic query metadata, pageable creation, predicate creation, value conversion, and error handling.
- Task 4 will connect this infrastructure to `DefaultRepository`, `DefaultService`, `DefaultMapper`, `DefaultController`, and `DefaultServiceImplements`.
- Task 5 will create production `AdminQueryProfile`, `ClientQueryProfile`, `AdminListDTO`, and `ClientListDTO` and wire the current entity slices.

Mandatory parent constraints:

- No reflection-based field discovery.
- No arbitrary client-provided sort or filter property paths.
- No mutable request state in singleton Spring components.
- No boolean/date/number guessing from untrusted strings.
- No unhandled runtime exceptions or generic `500` responses for invalid query input.
- Top-level filters are combined with `AND`.
- Operations inside one `FilterRequest` are combined with `OR`.

---

## Preconditions / Dependencies

- `code/backend/pom.xml` uses Spring Boot `3.4.1`, Java `21`, OpenFeign QueryDSL `6.12`, and `spring-boot-starter-validation`.
- Maven resolves `org.springframework.data:spring-data-jpa:3.4.1` and `org.springframework.data:spring-data-commons:3.4.1`.
- Generated Q classes exist after compilation for `QBaseUserEntity`, `QAdminEntity`, and `QClientEntity` under `code/backend/target/generated-sources/annotations`.
- `PageableRequest` already defaults to `page = 0`, `size = 20`, `sort = []`, and `filters = []`; entity-specific defaults must not be added to the DTO.
- `FilterOperationRequest.value` is `Object`; this task must parse it through field metadata, not through DTO-level assumptions.
- `GlobalExceptionHandler` currently lacks `InvalidQueryRequestException` and `MethodArgumentNotValidException` handlers.
- `code/backend/mvnw` is still incomplete; use system Maven with Java 21 in validation commands until the wrapper is repaired.
- Default `mvn test` is still blocked by the known `TestLauncher` / empty-suite discovery issue; validate with targeted `-Dtest=...` commands.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `memory-bank` - **Selected** - confirmed current focus, backend architecture, QueryDSL version, package naming constraints, and known Maven/test blockers.
- `documentation-management` - **Selected** - this is a Task document under `documentation/Tasks/current/` and must link back to the parent feature.
- `solid` - **Selected** - separates responsibilities between field metadata, pageable construction, predicate construction, value conversion, and HTTP error mapping.
- `find-docs` / Context7 - **Selected** - Context7 was attempted for Spring Data JPA and OpenFeign QueryDSL, but the workspace quota is exhausted. Official documentation and version-specific local dependency verification were used as fallback.

### Documentation Reviewed

- Context7 - attempted for Spring Data JPA and OpenFeign QueryDSL; blocked by `Monthly quota exceeded`.
- `code/backend/pom.xml` - verified Spring Boot `3.4.1`, Java `21`, OpenFeign QueryDSL `6.12`, and validation dependencies.
- Maven dependency resolution - verified Spring Data JPA / Commons `3.4.1` using `mvn dependency:list`.
- Spring Data Commons `3.4.1` Javadoc: `QuerydslPredicateExecutor` - confirms `findAll(Predicate, Pageable)` returns `Page<T>` and requires non-null `Predicate` and `Pageable`.
- Spring Data Commons `3.4.1` Javadoc: `PageRequest` - confirms zero-based page numbers, positive page sizes, and non-null `Sort`.
- Spring Data Commons `3.4.1` Javadoc: `Sort` - confirms sort properties must not include null or empty strings.
- Spring Data JPA reference - confirms QueryDSL integration through `QuerydslPredicateExecutor` and generated Q types.
- OpenFeign QueryDSL migration / code-generation docs - confirm Spring Boot 3 / Jakarta support, compiler-plugin annotation processing, and that Java imports remain under `com.querydsl.*` even though Maven artifacts use `io.github.openfeign.querydsl`.

### Related Existing Code

- `code/backend/src/main/java/com/authServer/shared/query/PageableRequest.java` - top-level request object consumed here.
- `code/backend/src/main/java/com/authServer/shared/query/SortRequest.java` - sort instruction consumed by `PageableFactory`.
- `code/backend/src/main/java/com/authServer/shared/query/FilterRequest.java` - filter group consumed by `QueryPredicateBuilder`.
- `code/backend/src/main/java/com/authServer/shared/query/FilterOperationRequest.java` - operator/value pair requiring field-driven conversion.
- `code/backend/src/main/java/com/authServer/shared/query/FilterOperator.java` - public operator enum whose semantic validity is enforced here.
- `code/backend/src/main/java/com/authServer/shared/query/SortDirection.java` - public sort enum mapped to Spring Data `Sort.Direction`.
- `code/backend/src/main/java/com/authServer/exceptions/GlobalExceptionHandler.java` - must gain query-specific `400 Bad Request` handling.
- `code/backend/src/main/java/com/authServer/shared/models/baseUser/BaseUserEntity.java` - current shared entity field types include `Long`, `String`, `Set<UserRoles>`, `java.util.Date`, and booleans.
- `code/backend/src/main/java/com/authServer/shared/models/baseUser/UserRoles.java` - enum type useful for enum parsing tests.

---

## Implementation Details

### Approach

Create a small shared query subsystem under `com.authServer.shared.query`:

- `EntityQueryProfile<ENTITY>` owns the explicit field allowlist for one entity type.
- `QueryableField<ENTITY, VALUE>` describes one allowed API field: API name, Java value type, QueryDSL expression/path, supported operators, optional Spring sort property, and value conversion rules.
- `PageableFactory<ENTITY>` validates sort requests and builds Spring Data `PageRequest`.
- `QueryPredicateBuilder<ENTITY>` validates filters and builds a QueryDSL `Predicate` / `BooleanExpression`.
- `InvalidQueryRequestException` gives invalid query input a typed, handled `400 Bad Request` path.

The components that process requests must be stateless. Request data is passed as method parameters only.

Execution kept Task 3 limited to shared infrastructure and error handling. No generic CRUD contracts, production Admin/Client query profiles, list DTOs, repositories, services, controllers, or entity slices were modified.

Notable implementation details:

- `QueryableField<ENTITY, VALUE>` is immutable and uses explicit static factories for string, number, boolean, enum, and date/time fields.
- Date-only QueryDSL paths are supported through `QueryableField.date(...)`; date-time paths remain supported through `QueryableField.dateTime(...)`.
- Nullable operators are opt-in per field through `nullable()`; primitive-style boolean paths do not receive null operators by default.
- Sortability is opt-in per field through `sortable(String sortProperty)`, so filterable fields are not automatically sortable.
- `IN` requires a non-empty JSON array/list and converts each element through the same field converter.
- Empty filters return a non-null neutral `BooleanBuilder`, suitable for later `QuerydslPredicateExecutor.findAll(predicate, pageable)` use.
- Query profile default-sort misconfiguration is treated as `IllegalStateException`; client-provided invalid fields/operators/values throw checked `InvalidQueryRequestException` and are mapped to `400 Bad Request`.
- Malformed request bodies, including invalid enum text before Bean Validation runs, are mapped through `HttpMessageNotReadableException` to the existing `ErrorHTTPRes` shape with `400 Bad Request`.

### Files to Create/Modify

- [x] `code/backend/src/main/java/com/authServer/shared/query/QueryableField.java` - field metadata and field-driven value/predicate behavior.
- [x] `code/backend/src/main/java/com/authServer/shared/query/EntityQueryProfile.java` - entity field allowlist and default-sort contract.
- [x] `code/backend/src/main/java/com/authServer/shared/query/PageableFactory.java` - stateless sort validator and `PageRequest` factory.
- [x] `code/backend/src/main/java/com/authServer/shared/query/QueryPredicateBuilder.java` - stateless filter validator and QueryDSL predicate builder.
- [x] `code/backend/src/main/java/com/authServer/exceptions/InvalidQueryRequestException.java` - typed query validation exception.
- [x] `code/backend/src/main/java/com/authServer/exceptions/GlobalExceptionHandler.java` - add `InvalidQueryRequestException` and Bean Validation handlers.
- [x] `code/backend/src/test/java/com/authServer/shared/query/QueryableFieldTest.java` - value conversion and operator-support tests.
- [x] `code/backend/src/test/java/com/authServer/shared/query/PageableFactoryTest.java` - sort validation and default-sort tests.
- [x] `code/backend/src/test/java/com/authServer/shared/query/QueryPredicateBuilderTest.java` - predicate composition and invalid-filter tests.
- [x] `code/backend/src/test/java/com/authServer/exceptions/GlobalExceptionHandlerQueryTest.java` - focused handler test independent of Task 4 controller wiring.

Out of scope for this task:

- `DefaultRepository`, `DefaultService`, `DefaultMapper`, `DefaultController`, and `DefaultServiceImplements` changes.
- Production `AdminQueryProfile` / `ClientQueryProfile`.
- `AdminListDTO` / `ClientListDTO`.
- Entity service/controller integration.
- Repository integration with `QuerydslPredicateExecutor`.

---

## Step-by-Step Implementation

### Step 1: Add `InvalidQueryRequestException`

**Goal:** Add one typed exception for semantic query input failures.
**Dependencies:** Existing `com.authServer.exceptions` package.

- [x] Create `InvalidQueryRequestException` in `code/backend/src/main/java/com/authServer/exceptions/`.
- [x] Match the existing exception style with a message constructor and default constructor.
- [x] Prefer extending `Exception` rather than `RuntimeException` to match the current checked business exception convention and to force Task 4 signatures to acknowledge invalid query requests.

**Why this step is critical:**
The parent feature requires invalid query input to return controlled `400 Bad Request` responses, not generic runtime failures.

#### Edge Cases

1. **Case:** Unknown filter/sort field - throw `InvalidQueryRequestException` with a field-specific message.
2. **Case:** Known operator is not allowed for the selected field - throw `InvalidQueryRequestException` with field/operator context.
3. **Case:** A query profile is internally misconfigured - reserve `IllegalStateException` for developer configuration bugs, not client input.

---

### Step 2: Add query error handling

**Goal:** Map semantic query errors and structural request-validation failures to `400 Bad Request` responses.
**Dependencies:** Step 1 and existing `ErrorHTTPRes`.

- [x] Add `@ExceptionHandler(InvalidQueryRequestException.class)` to `GlobalExceptionHandler`.
- [x] Return the existing `ErrorHTTPRes` shape with status `400`, error `Invalid Query Request`, the exception message, and the request path.
- [x] Add a `MethodArgumentNotValidException` handler unless implementation proves it must remain deferred. Task 2 explicitly deferred HTTP validation-error shape to Task 3.
- [x] Do not rely on the existing `IllegalArgumentException` handler for query validation.

**Why this step is critical:**
The feature has two invalid-input layers: structural Bean Validation and semantic query validation. Both must be client errors.

#### Edge Cases

1. **Case:** Jackson cannot deserialize enum text like `operator = =` - this is usually `HttpMessageNotReadableException`. It can remain Spring's default `400` unless adding a tiny handler is trivial.
2. **Case:** The new Bean Validation handler affects existing form endpoints - acceptable if it uses the existing `ErrorHTTPRes` shape and remains generic.

---

### Step 3: Add `EntityQueryProfile<ENTITY>`

**Goal:** Define the explicit allowlist contract used by pageable and predicate builders.
**Dependencies:** `QueryableField` can be introduced in the same implementation pass.

- [x] Create `EntityQueryProfile<ENTITY>` under `com.authServer.shared.query`.
- [x] Expose `Map<String, QueryableField<ENTITY, ?>> fields()` keyed by public API field name.
- [x] Expose `List<SortRequest> defaultSort()` so profiles can later express stable multi-column defaults, such as `dateCreated DESC` then `id ASC`.
- [x] Add helper methods such as `requireField(String field)` that throw `InvalidQueryRequestException` for unknown fields.
- [x] Require production profiles to return immutable maps/lists.

**Why this step is critical:**
This is the no-reflection boundary. Every field available to external clients must be deliberately declared by an entity profile.

#### Edge Cases

1. **Case:** `defaultSort()` references an unknown field - `PageableFactory` must reject it and tests should catch the profile configuration error.
2. **Case:** A field is filterable but not sortable - `QueryableField` must represent that distinction.

---

### Step 4: Add `QueryableField<ENTITY, VALUE>`

**Goal:** Represent one allowed query field and its allowed operations.
**Dependencies:** QueryDSL runtime types from Task 1 and `FilterOperator` from Task 2.

- [x] Create `QueryableField<ENTITY, VALUE>` under `com.authServer.shared.query`.
- [x] Store API field name, Java value type, QueryDSL expression/path, supported operators, optional Spring sort property, and nullable/operator support.
- [x] Keep instances immutable after construction.
- [x] Provide static factory methods for initial field categories: string, number, boolean, enum, and date/time.
- [x] Represent sortable and non-sortable fields explicitly. A filterable field is not automatically sortable.

Recommended default operator sets:

| Field kind | Supported operators |
|------------|---------------------|
| String | `EQUALS`, `NOT_EQUALS`, `CONTAINS`, `STARTS_WITH`, `ENDS_WITH`, `IN`, optional null checks |
| Number | `EQUALS`, `NOT_EQUALS`, comparison operators, `IN`, optional null checks |
| Boolean | `EQUALS`, `NOT_EQUALS`, optional null checks for boxed booleans only |
| Enum | `EQUALS`, `NOT_EQUALS`, `IN`, optional null checks |
| Date/time | `EQUALS`, `NOT_EQUALS`, comparison operators, optional null checks |

**Why this step is critical:**
`FilterOperationRequest.value` is `Object`; this class is the type-aware boundary that keeps parsing and operator validation deterministic.

#### Edge Cases

1. **Case:** `CONTAINS` on `id` - reject through `InvalidQueryRequestException`.
2. **Case:** `IS_NULL` on primitive `enabled` - do not include `IS_NULL` for that field.
3. **Case:** Future relation field - support only through explicit profile metadata; do not parse relation paths from raw strings.

---

### Step 5: Implement field-driven value conversion

**Goal:** Convert raw JSON values into the field's declared Java type.
**Dependencies:** Step 4.

- [x] Reject `null` for all operators that require a value.
- [x] For `IS_NULL` and `IS_NOT_NULL`, ignore any provided raw value.
- [x] For `IN`, require a JSON array/list and convert each element through the same field converter.
- [x] For strings, require a JSON string.
- [x] For booleans, require an actual JSON boolean, not a string such as `true`.
- [x] For numbers, require JSON numeric values and convert through the declared numeric type (`Long`, `Integer`, `Double`, `BigDecimal`, etc.). Reject incompatible numeric conversions.
- [x] For enums, require exact enum names as strings and use the declared enum type.
- [x] For date/time fields, parse strings based on the field type. Support current `java.util.Date` because `BaseUserEntity` uses it today, while keeping new-code guidance toward `java.time` types.
- [x] Wrap parse failures in `InvalidQueryRequestException` with a safe client-facing message.

**Why this step is critical:**
The parent feature explicitly rejects BugTracker's string-guessing behavior. Conversion must be driven by the field definition.

#### Edge Cases

1. **Case:** `enabled EQUALS "true"` - reject because boolean fields require JSON boolean `true`.
2. **Case:** `id IN 1` - reject because `IN` requires an array/list.
3. **Case:** `dateCreated GREATER_THAN "not-a-date"` - reject with `InvalidQueryRequestException`.

---

### Step 6: Add `PageableFactory<ENTITY>`

**Goal:** Validate requested sorting and build a Spring Data `PageRequest`.
**Dependencies:** `EntityQueryProfile`, `QueryableField`, `PageableRequest`, `SortRequest`, and Spring Data `PageRequest` / `Sort`.

- [x] Create `PageableFactory<ENTITY>` as a stateless Spring `@Component`.
- [x] Add a method such as `PageRequest create(PageableRequest request, EntityQueryProfile<ENTITY> profile)`.
- [x] If `request.getSort()` is empty, use `profile.defaultSort()`.
- [x] Validate each requested/default sort field through the profile.
- [x] Reject unknown sort fields with `InvalidQueryRequestException`.
- [x] Reject fields that are filterable but not sortable with `InvalidQueryRequestException`.
- [x] Build `Sort.Order` values from profile-controlled sort properties, not directly from raw client field strings.
- [x] Build `PageRequest.of(request.getPage(), request.getSize(), sort)` with a non-null `Sort`.

**Why this step is critical:**
Spring Data `Sort` accepts raw property names. This factory is the allowlist that prevents clients from sorting by internal or unsafe paths.

#### Edge Cases

1. **Case:** Empty sort and profile default `id ASC` is valid - return a sorted `PageRequest`.
2. **Case:** Empty sort and profile default references non-sortable field - reject as misconfigured profile.
3. **Case:** Sort field is known but non-sortable - reject with `400`.

---

### Step 7: Add `QueryPredicateBuilder<ENTITY>`

**Goal:** Build a QueryDSL predicate from request filters.
**Dependencies:** `EntityQueryProfile`, `QueryableField`, `FilterRequest`, `FilterOperationRequest`, and QueryDSL `Predicate` / `BooleanExpression`.

- [x] Create `QueryPredicateBuilder<ENTITY>` as a stateless Spring `@Component`.
- [x] Add a method such as `Predicate build(PageableRequest request, EntityQueryProfile<ENTITY> profile)` or `Predicate build(List<FilterRequest> filters, EntityQueryProfile<ENTITY> profile)`.
- [x] For empty filters, return a non-null neutral predicate suitable for `QuerydslPredicateExecutor.findAll(predicate, pageable)`.
- [x] For each top-level `FilterRequest`, resolve the field through `EntityQueryProfile`.
- [x] For each operation inside the filter, validate operator support and convert the raw value through `QueryableField`.
- [x] Combine operations in the same filter with `OR`.
- [x] Combine separate filters with `AND`.
- [x] Do not store the request, filters, field, or predicate builder state in instance fields.

**Why this step is critical:**
This is the reusable predicate engine that future AgentForge entity list endpoints will share.

#### Edge Cases

1. **Case:** Same field appears in two top-level filters - treat them as separate `AND` groups, matching the parent feature.
2. **Case:** One field has multiple operations - combine those operations with `OR`.
3. **Case:** All filters are empty - return a valid neutral predicate rather than `null`, because `QuerydslPredicateExecutor` requires non-null predicates.

---

### Step 8: Add focused unit tests

**Goal:** Prove the shared infrastructure before Task 4 wires it into services and repositories.
**Dependencies:** Steps 1 - 7.

- [x] Add test-local query profiles that use generated Q paths or QueryDSL expressions without creating production `AdminQueryProfile` / `ClientQueryProfile`.
- [x] Test default sort application and explicit sort mapping.
- [x] Test unknown sort fields and non-sortable fields.
- [x] Test unknown filter fields, unsupported operators, invalid value types, invalid dates, and invalid `IN` payloads.
- [x] Test string predicates for `EQUALS`, `CONTAINS`, `STARTS_WITH`, and `ENDS_WITH`.
- [x] Test number, boolean, enum, and date/time conversion paths where practical.
- [x] Test `AND` between filters and `OR` within one filter by inspecting the generated predicate string or using QueryDSL expression structure.

**Why this step is critical:**
The implementation is pure infrastructure. Unit tests give immediate confidence without waiting for controller/service integration in Tasks 4 and 5.

#### Edge Cases

1. **Case:** Generated Q classes are absent because compile was not run - Maven test compilation should trigger annotation processing. If not, run `mvn clean test -Dtest=...`.
2. **Case:** Predicate string output differs across QueryDSL versions - prefer behavioral or structural assertions where possible; if string assertions are used, keep them minimal.

---

## Design Decisions

**Decision 1:** Query profiles are explicit allowlists, not reflection helpers.
- **Why:** Reflection was one of the weaknesses identified from BugTracker. Explicit profiles prevent accidental exposure of internal fields and keep inherited fields testable.
- **Alternatives considered:** Reflection over entity fields or Q type fields. Rejected because it reintroduces arbitrary field exposure.

**Decision 2:** `PageableFactory` and `QueryPredicateBuilder` are separate stateless components.
- **Why:** Sorting/pageable validation and predicate construction have different reasons to change. Separating them keeps SRP clear and makes tests focused.
- **Alternatives considered:** One `QueryRequestFactory` that returns both predicate and pageable. Rejected because it would become a coordinator before Task 4 actually needs one.

**Decision 3:** Sort properties come from `QueryableField`, not directly from client strings.
- **Why:** Spring `Sort` accepts raw property paths. Mapping through field metadata prevents unsafe paths and lets API field names differ from JPA property names later.
- **Alternatives considered:** Use `Sort.by(request.field())` after checking field exists. Rejected because it couples API names to entity internals.

**Decision 4:** Value conversion belongs to field metadata, not request DTOs.
- **Why:** The DTO only knows the transport shape. The field definition knows the expected Java type and allowed operators.
- **Alternatives considered:** Custom Bean Validation constraints on `FilterOperationRequest.value`. Rejected because validity depends on the entity profile.

**Decision 5:** `InvalidQueryRequestException` is checked to match current project convention.
- **Why:** Existing business exceptions extend `Exception`, and the parent service signature explicitly shows `throws InvalidQueryRequestException`.
- **Alternatives considered:** Extend `RuntimeException`. Rejected because the task goal is explicit, controlled query validation rather than generic runtime propagation.

---

## Testing Considerations

### Automatic Validation

- [x] `JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64" mvn clean compile` from `code/backend/` exits `0`.
- [x] `JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64" mvn -Dtest='QueryableFieldTest,PageableFactoryTest,QueryPredicateBuilderTest' test` from `code/backend/` exits `0`.
- [x] If a focused exception-handler test is added, include it in the targeted command: `-Dtest='QueryableFieldTest,PageableFactoryTest,QueryPredicateBuilderTest,GlobalExceptionHandlerQueryTest'`.
- [x] Do not use default `mvn test` as the only validation signal until the known `TestLauncher` issue is fixed.

Execution validation:

- `JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64" mvn clean compile` passed from `code/backend/`.
- `JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64" mvn -Dtest="PageableRequestValidationTest,QueryableFieldTest,PageableFactoryTest,QueryPredicateBuilderTest,GlobalExceptionHandlerQueryTest" test` passed from `code/backend/` with 34 tests, 0 failures, 0 errors.
- `JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64" mvn -Dtest="ClientRepositoryTest,PageableRequestValidationTest,QueryableFieldTest,PageableFactoryTest,QueryPredicateBuilderTest,GlobalExceptionHandlerQueryTest" test` passed from `code/backend/` with 46 tests, 0 failures, 0 errors.
- Q classes were regenerated and verified under `target/generated-sources/annotations` for `QBaseUserEntity`, `QAdminEntity`, and `QClientEntity`.
- A parallel first validation attempt ran `clean compile` and targeted tests at the same time; Maven failed the test run with a transient `NoSuchFileException` while `clean` removed `target/`. The targeted tests passed when rerun after the clean compile, so this was a command scheduling race, not a code failure.

### Manual Validation

- [x] Confirm the new files appear under `com.authServer.shared.query` and `com.authServer.exceptions` only.
- [x] Confirm no generated QueryDSL sources under `target/generated-sources/annotations` are committed.
- [x] Confirm no Task 4 / Task 5 files were modified.

**Rule:** Run automatic checks when possible. Manual checks are inspection-only for scope boundaries and generated files.

---

## Related Code Explanations

- `code/backend/src/main/java/com/authServer/shared/query/PageableRequest.java` - request entry point consumed by the factories/builders in this task.
- `code/backend/src/main/java/com/authServer/shared/query/FilterOperationRequest.java` - source of raw `Object value` requiring typed conversion.
- `code/backend/src/main/java/com/authServer/exceptions/GlobalExceptionHandler.java` - existing HTTP error mapping that must gain query-specific handling.
- `code/backend/src/main/java/com/authServer/shared/models/baseUser/BaseUserEntity.java` - current entity field types that drive conversion support.
- `code/backend/src/main/java/com/authServer/shared/defaultInterfaces/DefaultRepository.java` - future Task 4 integration point, not modified here.

---

## Notes / Follow-ups

- Context7 is currently quota-blocked. This task document used official docs and local dependency verification as fallback; re-run Context7 after authentication if exact snippets are needed during implementation.
- Do not add `JPAQueryFactory` unless the implementation proves it is required. The planned flow uses predicates that Task 4 will pass to `QuerydslPredicateExecutor`.
- Do not decide whether `roles` or `apikey` are queryable in this task. Task 5 owns production Admin/Client profiles and the security decision for those fields.
- Do not solve `ClientEntity.getBaseUser()` recursion or `DefaultServiceImplements.update(...)` here. Both are known out-of-scope issues.
- Keep Java imports on `com.querydsl.*` packages while keeping Maven artifacts on `io.github.openfeign.querydsl:*`; this is expected for the OpenFeign fork.

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task.
- [x] Relevant skills reviewed and selected for this task.
- [x] Up-to-date documentation checked, or Context7 quota limitation recorded with official-doc fallback.
- [x] `QueryableField<ENTITY, VALUE>` and `EntityQueryProfile<ENTITY>` created with explicit allowlist semantics.
- [x] `PageableFactory<ENTITY>` validates sort fields and builds `PageRequest` using profile-controlled sort properties.
- [x] `QueryPredicateBuilder<ENTITY>` builds non-null QueryDSL predicates, `AND`s top-level filters, and `OR`s operations within one filter.
- [x] Typed value conversion is field-definition driven and covers initial string, number, boolean, enum, and date/time paths.
- [x] `InvalidQueryRequestException` exists and is mapped to `400 Bad Request` in `GlobalExceptionHandler`.
- [x] Bean Validation request-body failures are handled or an explicit documented decision explains why they remain deferred.
- [x] Focused unit tests cover valid and invalid pageable, predicate, operator, and conversion behavior.
- [x] Automatic validation commands pass, except for the known default `mvn test` suite-launcher blocker.
- [x] No Task 4 / Task 5 production integration files are modified.
- [x] Parent feature Task 3 link is updated to this task document.
- [x] Memory Bank `context.md` is updated after the task document is created.
