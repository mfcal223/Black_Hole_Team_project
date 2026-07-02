# Task: Build Shared Query Request And Validation Model

#task #current #medium-complexity #parent-backend-querydsl-filtering-pagination

**Parent:** [[Backend-QueryDSL-Filtering-Pagination]]
**Parent Type:** Feature
**Related Step(s):** Phase 2, Steps 2.1 – 2.4
**Estimated Complexity:** Medium

---

## Goal

Create the public request contract for the QueryDSL list-query subsystem in `code/backend/`: a `PageableRequest` DTO carrying page, size, sort, and filters, plus the supporting `SortRequest`, `FilterRequest`, `FilterOperationRequest` DTOs and the `SortDirection` and `FilterOperator` enums. The model must be transport-only — pure POJOs annotated with Jakarta Bean Validation — with no `Optional` fields, no mutable singleton state, no QueryDSL imports, and no entity-aware field validation. It is the input shape that Tasks 3 – 5 will consume.

---

## Parent Context

The parent feature [[Backend-QueryDSL-Filtering-Pagination]] (Phase 2) defines this request shape as the **single public API** for every list endpoint in the backend. The relevant constraints from the parent that this task must honor:

- **One request per endpoint.** `POST /{entity}/list` accepts exactly one `@RequestBody PageableRequest`. No query parameters, no overloaded shapes (Decision 5 of the parent — "POST For Complex List Queries").
- **No `Optional` fields in request DTOs.** This is one of the explicit "Problems To Avoid" called out from BugTracker. Defaults must come from field initializers and Bean Validation, not from `Optional` unwrapping inside controllers (Step 2.4).
- **Operators are enum names, not symbols.** Decision 4 of the parent: `EQUALS`, `CONTAINS`, `GREATER_THAN` — never `:`, `=`, `!=`. This makes the public contract self-documenting and validatable.
- **Sort uses an enum, not a boolean.** `SortDirection { ASC, DESC }`, never `boolean isAscending`.
- **Filters default to empty, not `null`.** Sort defaults to empty; Task 3's `PageableFactory` is responsible for injecting `id ASC` when the entity profile allows it. This task does not bake `id ASC` into the request DTO because field-vs-entity validity is a Task 3 concern.
- **`page >= 0`, `size in [1..100]`.** Bounded so clients cannot ask for unlimited rows (Risk Assessment, parent §"Risk Assessment").
- **Filters combine with `AND`; operations inside one filter combine with `OR`.** This task only encodes the *structure* that allows that semantics; the actual `AND`/`OR` composition is implemented by the predicate builder in Task 3.

The parent's "Implementation Architecture → Shared Query Package" table prescribes the exact class names and responsibilities for this task:

| Class / Interface | Responsibility (this task delivers) |
|-------------------|-------------------------------------|
| `PageableRequest` | Transport DTO containing page, size, sort, filters. |
| `SortRequest` | Transport DTO for one sort instruction (`field`, `direction`). |
| `SortDirection` | Enum with `ASC`, `DESC`. |
| `FilterRequest` | Transport DTO for one API field and one or more operations. |
| `FilterOperationRequest` | Transport DTO for one operator/value pair. |
| `FilterOperator` | Enum for supported operations. |

The remaining classes from that table (`QueryableField`, `EntityQueryProfile`, `QueryPredicateBuilder`, `PageableFactory`, `InvalidQueryRequestException`) are **explicitly out of scope** here — they belong to Task 3.

---

## Preconditions / Dependencies

- Task 1 ([[Backend-QueryDSL-Filtering-Pagination-step-1-configure-querydsl]]) is implemented: OpenFeign QueryDSL 6.12 is wired into `code/backend/pom.xml` and Q classes generate under `target/generated-sources/annotations`. This task does not import QueryDSL types, but the dependency must already be on the classpath because Task 3 will consume these DTOs without further build changes.
- `spring-boot-starter-validation` is already a dependency (see [[Memory/tech]]); Jakarta Bean Validation 3.x annotations (`jakarta.validation.constraints.*`, `jakarta.validation.Valid`) are available without a POM change.
- The shared layering convention ([[Memory/architecture]]) places generic infrastructure under `com.authServer.shared.*`. This task adds a new sibling package `com.authServer.shared.query` next to `defaultInterfaces`, `defaultImplements`, `functional`, `models`, `securityUser`, `tools`. The package rename to AgentForge ([[Memory/known-issues]]) has not happened yet; Task 2 ships under `com.authServer.shared.query` and will move with the rest of the backend when the rename task lands.
- Lombok is already enabled via `maven-compiler-plugin` annotation processing — these DTOs may use Lombok (`@Data`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`) consistently with the existing DTO style in `com.authServer.shared.models.baseUser.BaseUserDTO` and `com.authServer.models.hq.admin.AdminDTO`.
- Jackson defaults are sufficient: enum deserialization is case-sensitive by default (`"ASC"`, not `"asc"`); the request contract documents uppercase enum names. No custom `ObjectMapper` configuration is added in this task.
- This task does **not** touch `DefaultRepository`, `DefaultService`, `DefaultController`, any entity, any controller, or `GlobalExceptionHandler`. Those changes belong to Tasks 3 – 5.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `solid` — **Selected** — keeps each DTO single-purpose (one transport shape per class), keeps the request model decoupled from QueryDSL types (DIP — the request layer must not depend on the persistence layer), and prevents premature absorption of Task 3 concerns (allowlist validation, predicate construction).
- `find-docs` / Context7 — **Selected** — the task plan recorded Jakarta Bean Validation syntax (`@NotNull`, `@NotBlank`, `@Min`, `@Max`, `@Size`, `@Valid` on element collections) and the cascading-validation rules used for `List<@Valid SortRequest>` and `List<@Valid FilterRequest>`. During execution, the project dependency versions were verified as `jakarta.validation-api:3.0.2` and Hibernate Validator `8.0.2.Final`; fresh Context7 queries were attempted but blocked by the current monthly quota, so official Jakarta / Spring Data / OpenFeign documentation was used as the fallback source.
- `memory-bank` — **Selected** — pulled the current backend conventions: stack ([[Memory/tech]]), shared-package layering ([[Memory/architecture]]), and the ban on duplicating BugTracker's `Optional`-in-DTO pattern ([[Memory/known-issues]]).
- `superpowers:test-driven-development` — **Selected** — request-level validation has clear input/output behavior (`@NotNull` on `field`, `@Min(0)` on `page`, `@Size(min=1)` on `operations`); each validation rule should be expressed as an assertion in a Spring Validation unit test. The test suite is part of Phase 6 (Task 6) — this task only writes the DTOs; the parent's Task 6 will exhaustively cover validation tests. However, this task must include at least a smoke test per DTO so the contract is observable from day one.
- `superpowers:verification-before-completion` — **Selected** — completion is gated on three observable artefacts: `mvn clean compile` is green, the new classes exist under `com.authServer.shared.query`, and a smoke `@WebMvcTest`-style or `Validator`-based test fails for each declared constraint when violated.
- `documentation-management` — **Selected** — this task itself is a documentation deliverable; the skill guides format/template adherence and Obsidian wiki-link conventions.

### Documentation Reviewed

- Context7 `/websites/jakarta_ee_specifications_bean-validation_3_1` — confirmed:
  - Cascading container validation: `private List<@Valid SortRequest> sort` validates each element of the list; combined with `@NotNull` on the list reference and `@Size(min=...)` for cardinality.
  - Built-in constraints needed in this task: `@NotNull`, `@NotBlank`, `@Min`, `@Max`, `@Size`, `@Valid`.
  - Records support is clarified in 3.1 — but this task uses classes (not records) for consistency with the existing DTO style and Lombok integration in the backend.
- Context7 `/spring-projects/spring-data-jpa` (cited in parent) — confirms `Pageable` / `PageRequest` / `Sort` are the integration target; this task does **not** depend on them directly. The conversion `PageableRequest → PageRequest` is Task 3's `PageableFactory`.
- Context7 `/openfeign/querydsl` — informational only; this task does not import QueryDSL types because the request layer must remain transport-only. `BooleanExpression`, `Predicate`, and `JPAQueryFactory` enter the codebase in Task 3.
- Execution note, 2026-04-27: fresh Context7 resolution failed with `Monthly quota exceeded`. The implementation still used the `find-docs` workflow, verified exact versions from Maven, and cross-checked against the official Jakarta Bean Validation 3.0 specification plus Spring Data JPA and OpenFeign QueryDSL reference docs.

### Related Existing Code

- `code/backend/src/main/java/com/authServer/shared/models/baseUser/BaseUserDTO.java` — current Lombok-based DTO style: `@Data`, `@Builder`, `@AllArgsConstructor`, `@NoArgsConstructor`. New request DTOs follow the same style for consistency.
- `code/backend/src/main/java/com/authServer/models/hq/admin/AdminForm.java` — current example of a `@Valid`-bound request body with Bean Validation. New request DTOs use the same annotation set.
- `code/backend/src/main/java/com/authServer/exceptions/GlobalExceptionHandler.java` — already handles `IllegalArgumentException` → `400`, `BadCredentialsException` → `401`, etc. **It does not yet handle `MethodArgumentNotValidException`.** This task does not add the handler (that is Task 3's `InvalidQueryRequestException` work plus a separate handler for Bean Validation failures); the smoke tests written here use the `Validator` API directly so they do not depend on the controller-layer handler being wired yet.
- `code/backend/src/main/java/com/authServer/shared/defaultInterfaces/` — sibling package of the new `shared/query/`. Confirms layering convention.
- `code/backend/pom.xml` — `spring-boot-starter-validation` already declared; no POM change needed.

---

## Implementation Details

### Approach

Build a **transport-only** model: six small, focused types in a new package, each a plain POJO with Lombok and Bean Validation annotations. No QueryDSL imports. No entity awareness. No business logic. No `Optional`. No mutable singleton state.

The shape mirrors the parent feature's JSON example exactly:

```json
{
  "page": 0,
  "size": 20,
  "sort": [ { "field": "username", "direction": "ASC" } ],
  "filters": [
    { "field": "enabled", "operations": [ { "operator": "EQUALS", "value": true } ] }
  ]
}
```

Defaults (per parent Step 2.4 — "without using `Optional` fields"):

- `page` defaults to `0` via Java field initializer and Lombok `@Builder.Default`.
- `size` defaults to `20` via Java field initializer and Lombok `@Builder.Default`.
- `sort` defaults to an empty `ArrayList<>()` via Java field initializer and Lombok `@Builder.Default`. Task 3 will inject `id ASC` when the request sort is empty *and* the entity profile allows `id` as a sort field.
- `filters` defaults to an empty `ArrayList<>()` via Java field initializer and Lombok `@Builder.Default`.

This keeps the request usable from a minimal client (`POST /admin/list { }` is valid) while the field-by-field constraints stay tight.

Validation responsibility split (important to lock in now so Task 3 does not have to retro-fit):

- **This task (structural Bean Validation):** `page >= 0`, `size in [1..100]`, `field` non-blank and within an allowed length, `direction` non-null, `operator` non-null, `operations` non-null and `@Size(min=1)`, list elements `@Valid` cascaded.
- **Task 3 (semantic, entity-aware validation):** "is `field` actually queryable on this entity?", "is `operator` allowed for this field's Java type?", "does `value` parse into the field's declared type?". Those are Task 3 concerns expressed through `EntityQueryProfile`, `QueryableField`, and `InvalidQueryRequestException`.

The split is deliberate: it keeps the request DTOs reusable across entities (one Bean-Validation-correct shape, many entity profiles) and keeps SRP intact — the DTO knows the *shape*, the profile knows the *entity*, the predicate builder knows the *translation*.

`FilterOperationRequest.value` is typed as `Object` (deserialised by Jackson into `String`/`Number`/`Boolean`/`List`/`null`). Typed parsing is Task 3's job (per parent §"Value Parsing"). The DTO is shape-only.

`FilterOperator` enum members defined here cover the parent's full operator table (Phase: "Supported Operators"):

`EQUALS, NOT_EQUALS, CONTAINS, STARTS_WITH, ENDS_WITH, GREATER_THAN, GREATER_THAN_OR_EQUAL, LESS_THAN, LESS_THAN_OR_EQUAL, IN, IS_NULL, IS_NOT_NULL`.

Even though Task 3 is what *enforces* "`CONTAINS` is illegal on `id`", the enum must be complete now so the JSON contract does not change between Task 2 and Task 3.

`SortDirection` enum: `ASC, DESC` only. No `NONE`, no `DEFAULT` — defaults are encoded by the *absence* of a `SortRequest` entry, not by a third enum member.

### Files to Create/Modify

- [x] `code/backend/src/main/java/com/authServer/shared/query/PageableRequest.java` — new: top-level request DTO.
- [x] `code/backend/src/main/java/com/authServer/shared/query/SortRequest.java` — new: one sort instruction.
- [x] `code/backend/src/main/java/com/authServer/shared/query/SortDirection.java` — new: `ASC` / `DESC` enum.
- [x] `code/backend/src/main/java/com/authServer/shared/query/FilterRequest.java` — new: one API field + its operations.
- [x] `code/backend/src/main/java/com/authServer/shared/query/FilterOperationRequest.java` — new: one operator + one value.
- [x] `code/backend/src/main/java/com/authServer/shared/query/FilterOperator.java` — new: full operator enum.
- [x] `code/backend/src/test/java/com/authServer/shared/query/PageableRequestValidationTest.java` — new: smoke tests using a programmatic `Validator` (not Spring MVC) so they do not depend on the controller wiring that lands in Task 4.

No source files outside `com.authServer.shared.query` are modified. No `pom.xml` change. No `application.properties` change. No change to `GlobalExceptionHandler` (Task 3).

---

## Step-by-Step Implementation

### Step 1: Create the `SortDirection` enum

**Goal:** Provide the typed, two-value direction used by `SortRequest`.
**Dependencies:** None.

- [x] Create `code/backend/src/main/java/com/authServer/shared/query/SortDirection.java`.

**Why this step is critical:**
Bringing in this enum first lets `SortRequest` compile in isolation. It also satisfies parent Decision: "Enum with `ASC`, `DESC`. Avoid raw booleans like `isAscending`." A typed enum makes JSON deserialisation reject typos (`"asc"` ≠ `"ASC"`) at the framework boundary, which is the cheapest place to fail.

#### Implementation

Execution expanded the original smoke-test sketch into a 14-test `Validator` suite. It verifies default values and one invalid example for every declared structural constraint: `page` minimum, `size` minimum and maximum, `sort` / `filters` non-null, sort field blank and maximum length, sort direction non-null, filter field blank and maximum length, operations non-null and non-empty, and operation operator non-null.

```java
package com.authServer.shared.query;

public enum SortDirection {
    ASC,
    DESC
}
```

#### Edge Cases

1. **Case:** Client sends `"direction": "asc"` (lowercase) — Jackson rejects it as an unknown enum value and Spring returns `400 Bad Request` via the default `HttpMessageNotReadableException` handling chain. No custom handling is needed in this task; the parent's `InvalidQueryRequestException` covers semantic errors, not parse errors.
2. **Case:** Client omits `direction` — `@NotNull` on the field in `SortRequest` (Step 2) catches it as a Bean Validation violation.
3. **Case:** A future need for case-insensitive parsing — defer; do not add `@JsonCreator` or `@JsonProperty` aliasing now. Strictness at the boundary is the SOLID-aligned default.

---

### Step 2: Create the `SortRequest` DTO

**Goal:** Carry one (field, direction) pair.
**Dependencies:** Step 1.

- [x] Create `code/backend/src/main/java/com/authServer/shared/query/SortRequest.java`.

**Why this step is critical:**
`SortRequest` is the smallest unit the predicate-builder layer (Task 3) consumes. Locking its validation now means Task 3 only has to validate semantic correctness ("is `field` allowed for this entity?"); it does not have to re-validate that `field` is non-blank or that `direction` is one of the two valid enum values.

#### Implementation

```java
package com.authServer.shared.query;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SortRequest {

    @NotBlank
    @Size(max = 64)
    private String field;

    @NotNull
    private SortDirection direction;
}
```

#### Edge Cases

1. **Case:** `field` is `"  "` (whitespace) — `@NotBlank` catches it (`@NotNull` would not).
2. **Case:** `field` is 200 characters of garbage — `@Size(max = 64)` caps it; this is structural defence-in-depth even though Task 3's allowlist will reject any unknown field.
3. **Case:** `direction` is `null` — `@NotNull` catches it before the request reaches the service layer.
4. **Case:** A future relation field like `"manager.username"` — fits within 64 chars and is a single non-blank string; the structural constraints do not care about the dot. The dot's *meaning* is decoded by Task 3.

---

### Step 3: Create the `FilterOperator` enum

**Goal:** Provide the full set of operators clients may send. Operator-vs-field-type validation (e.g., "`CONTAINS` only on strings") is a Task 3 concern.
**Dependencies:** None.

- [x] Create `code/backend/src/main/java/com/authServer/shared/query/FilterOperator.java`.

**Why this step is critical:**
This enum is the public contract clients code against. It must be complete on day one so Task 3 does not have to introduce new enum members and break clients. Missing operators here would force clients to either send invalid JSON (rejected by Jackson) or work around the contract.

#### Implementation

```java
package com.authServer.shared.query;

public enum FilterOperator {
    EQUALS,
    NOT_EQUALS,
    CONTAINS,
    STARTS_WITH,
    ENDS_WITH,
    GREATER_THAN,
    GREATER_THAN_OR_EQUAL,
    LESS_THAN,
    LESS_THAN_OR_EQUAL,
    IN,
    IS_NULL,
    IS_NOT_NULL
}
```

#### Edge Cases

1. **Case:** Client sends `"operator": "="` — Jackson rejects it as an unknown enum constant; Spring returns `400`. The parent feature explicitly bans symbol-based operators (Decision 4).
2. **Case:** Client sends `"operator": "equals"` (lowercase) — same outcome; case-sensitive by default.
3. **Case:** A future operator like `BETWEEN` — add the enum member when the need arises; Task 3 then teaches the predicate builder how to translate it. Do not pre-add operators that no field allows.

---

### Step 4: Create the `FilterOperationRequest` DTO

**Goal:** Carry one (operator, value) pair. The `value` is intentionally untyped at this layer.
**Dependencies:** Step 3.

- [x] Create `code/backend/src/main/java/com/authServer/shared/query/FilterOperationRequest.java`.

**Why this step is critical:**
This is the only DTO whose `value` is `Object`. The parent feature §"Value Parsing" is explicit: typed parsing happens in the predicate builder against the field definition, not by guessing from the wire format. Keeping `value` as `Object` here is the only way to honor that without forcing every operator into a separate DTO subclass — which would explode the JSON contract surface for no benefit.

#### Implementation

```java
package com.authServer.shared.query;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FilterOperationRequest {

    @NotNull
    private FilterOperator operator;

    private Object value;
}
```

#### Edge Cases

1. **Case:** `operator` is `IS_NULL` or `IS_NOT_NULL` — `value` is ignored by Task 3's predicate builder; the parent's operator table marks it "ignores value". No Bean Validation rule is needed at this layer because the request is shape-correct either way.
2. **Case:** `operator` is `IN` and `value` is a JSON array — Jackson deserialises it as `java.util.List<Object>`; Task 3 will iterate it. No constraint added here.
3. **Case:** `value` is `null` for an operator that *needs* a value — semantic error, caught by Task 3's `InvalidQueryRequestException`. Not enforced at this layer because `value`-required-ness depends on `operator`, and tying the two together with Bean Validation requires a custom class-level constraint. That extra surface area is not worth it; Task 3 already has to do the operator-vs-value-vs-field-type check anyway.

---

### Step 5: Create the `FilterRequest` DTO

**Goal:** Carry one API field plus its `OR`-combined operations.
**Dependencies:** Steps 3 and 4.

- [x] Create `code/backend/src/main/java/com/authServer/shared/query/FilterRequest.java`.

**Why this step is critical:**
This DTO encodes the parent's "operations inside the same filter are combined with `OR`" semantics structurally: the list-of-operations under a single field *is* the OR group. Without this shape, clients would have to send the same field twice and rely on Task 3 to merge — fragile and wasteful.

#### Implementation

```java
package com.authServer.shared.query;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FilterRequest {

    @NotBlank
    @Size(max = 64)
    private String field;

    @NotNull
    @Size(min = 1)
    private List<@Valid FilterOperationRequest> operations;
}
```

#### Edge Cases

1. **Case:** `operations` is omitted — `@NotNull` catches it.
2. **Case:** `operations` is `[]` — `@Size(min = 1)` catches it. An empty operations list is structurally meaningless: there is no `OR` group.
3. **Case:** One element of `operations` has `operator: null` — the cascading `@Valid` triggers `FilterOperationRequest`'s own `@NotNull` on `operator`; the violation surfaces with a property path like `operations[0].operator`. This is exactly why Bean Validation cascading is preferred over hand-rolled checks.
4. **Case:** Same `field` appears in two separate `FilterRequest` entries (top-level `AND`-combined) — this is legal per the parent's combination rules. No constraint needed at this layer.

---

### Step 6: Create the top-level `PageableRequest` DTO

**Goal:** Tie page, size, sort, filters into one validated request body.
**Dependencies:** Steps 1 – 5.

- [x] Create `code/backend/src/main/java/com/authServer/shared/query/PageableRequest.java`.

**Why this step is critical:**
This is the single class that controllers will declare as `@Valid @RequestBody PageableRequest`. Every constraint placed here is enforced once per request by Spring's `MethodArgumentNotValidException` machinery, with no service-level code. Honoring parent Step 2.4 (defaults without `Optional`) is encoded entirely through Java field initialisers.

#### Implementation

```java
package com.authServer.shared.query;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PageableRequest {

    @Min(0)
    @Builder.Default
    private int page = 0;

    @Min(1)
    @Max(100)
    @Builder.Default
    private int size = 20;

    @NotNull
    @Builder.Default
    private List<@Valid SortRequest> sort = new ArrayList<>();

    @NotNull
    @Builder.Default
    private List<@Valid FilterRequest> filters = new ArrayList<>();
}
```

#### Edge Cases

1. **Case:** Client sends `{}` — Jackson uses the no-args constructor and the field initialisers; `page=0`, `size=20`, `sort=[]`, `filters=[]`. All validations pass. Task 3 will inject `id ASC` if the entity profile allows it.
2. **Case:** Client sends `{ "page": -1 }` — `@Min(0)` rejects it; `MethodArgumentNotValidException` produces a `400`.
3. **Case:** Client sends `{ "size": 101 }` — `@Max(100)` rejects it. The exact upper bound matches the parent (`1..100`).
4. **Case:** Client sends `{ "sort": null }` — `@NotNull` catches it. The contract is "send an empty array for none", not "send null for none". This is the single point where we deviate from "permissive defaults": permitting `null` here would force every downstream consumer to null-check, which is exactly what `Optional` would have demanded.
5. **Case:** Lombok's `@AllArgsConstructor` would normally let a caller pass `sort = null` — the `@NoArgsConstructor` + initialiser pattern is what Jackson uses on deserialisation; `@AllArgsConstructor` is kept for `@Builder` ergonomics in tests. Because Lombok builders do not preserve field initializers by default, `PageableRequest` uses `@Builder.Default` on all defaulted fields.

---

### Step 7: Add a smoke-level validation test

**Goal:** Lock in the validation contract before Task 3 starts consuming these DTOs.
**Dependencies:** Steps 1 – 6.

- [x] Create `code/backend/src/test/java/com/authServer/shared/query/PageableRequestValidationTest.java`.

The test uses `jakarta.validation.Validation.buildDefaultValidatorFactory().getValidator()` directly — no Spring context, no `@WebMvcTest`. This keeps the test independent of Task 4's controller wiring and matches the Surefire-friendly naming `*Test.java` (the existing exclusion is `**/*SuiteTest.java`, so `PageableRequestValidationTest` is included by the default `Test*.java` pattern; see [[Memory/known-issues]] §"Test suites and `TestLauncher` discovery").

**Why this step is critical:**
The DTOs have meaningful behaviour beyond compilation — every constraint annotation must actually trigger when violated. Adding a focused validator-driven test now catches regressions during the package rename (planned in [[Memory/known-issues]] §"Backend legacy naming") and during the eventual move from H2 to PostgreSQL, neither of which should affect validation but both of which will rebuild the project.

#### Implementation

```java
package com.authServer.shared.query;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PageableRequestValidationTest {

    private static ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void setUp() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void tearDown() {
        factory.close();
    }

    @Test
    void emptyRequestUsesDefaultsAndPasses() {
        PageableRequest req = new PageableRequest();
        Set<ConstraintViolation<PageableRequest>> violations = validator.validate(req);
        assertTrue(violations.isEmpty(), () -> violations.toString());
        assertEquals(0, req.getPage());
        assertEquals(20, req.getSize());
        assertTrue(req.getSort().isEmpty());
        assertTrue(req.getFilters().isEmpty());
    }

    @Test
    void negativePageFails() {
        PageableRequest req = PageableRequest.builder().page(-1).build();
        Set<ConstraintViolation<PageableRequest>> violations = validator.validate(req);
        assertEquals(1, violations.size());
        assertEquals("page", violations.iterator().next().getPropertyPath().toString());
    }

    @Test
    void sizeAboveOneHundredFails() {
        PageableRequest req = PageableRequest.builder().size(101).build();
        Set<ConstraintViolation<PageableRequest>> violations = validator.validate(req);
        assertEquals(1, violations.size());
        assertEquals("size", violations.iterator().next().getPropertyPath().toString());
    }

    @Test
    void blankSortFieldFailsViaCascade() {
        SortRequest sort = SortRequest.builder().field(" ").direction(SortDirection.ASC).build();
        PageableRequest req = PageableRequest.builder().sort(List.of(sort)).build();
        Set<ConstraintViolation<PageableRequest>> violations = validator.validate(req);
        assertEquals(1, violations.size());
        assertTrue(
                violations.iterator().next().getPropertyPath().toString().startsWith("sort[0].field"),
                () -> violations.toString());
    }

    @Test
    void emptyOperationsListFailsViaCascade() {
        FilterRequest filter = FilterRequest.builder().field("email").operations(List.of()).build();
        PageableRequest req = PageableRequest.builder().filters(List.of(filter)).build();
        Set<ConstraintViolation<PageableRequest>> violations = validator.validate(req);
        assertEquals(1, violations.size());
        assertTrue(
                violations.iterator().next().getPropertyPath().toString().startsWith("filters[0].operations"),
                () -> violations.toString());
    }

    @Test
    void nullOperatorFailsViaDoubleCascade() {
        FilterOperationRequest op = FilterOperationRequest.builder().operator(null).value("x").build();
        FilterRequest filter = FilterRequest.builder().field("email").operations(List.of(op)).build();
        PageableRequest req = PageableRequest.builder().filters(List.of(filter)).build();
        Set<ConstraintViolation<PageableRequest>> violations = validator.validate(req);
        assertEquals(1, violations.size());
        assertTrue(
                violations.iterator().next().getPropertyPath().toString()
                        .startsWith("filters[0].operations[0].operator"),
                () -> violations.toString());
    }
}
```

#### Edge Cases

1. **Case:** Hibernate Validator (the default Jakarta Validation provider) is not on the classpath — it is, transitively via `spring-boot-starter-validation`. No POM change.
2. **Case:** The test runs under the broken default-suite launcher — the file does not match `**/*SuiteTest.java` and does not extend `TestLauncher`, so it runs normally with `mvn -Dtest='PageableRequestValidationTest' test` and is also picked up by `code/backend/test.sh`'s `*RepositoryTest` pattern only if renamed. Run it explicitly via `-Dtest=` until the suite-launcher issue is fixed; do not chase that fix inside this task ([[Memory/known-issues]] §"Test suites and `TestLauncher` discovery").
3. **Case:** Lombok's `@Builder` produces immutable-feeling code that bypasses field initialisers unless `@Builder.Default` is used — `PageableRequest` uses `@Builder.Default` so builder-based tests preserve the transport defaults.

---

## Design Decisions

**Decision 1:** Place the new package at `com.authServer.shared.query` rather than creating a top-level `com.authServer.query`.
- **Why:** The shared layering convention ([[Memory/architecture]]) groups generic infrastructure under `shared/*`. Query handling is generic (it serves every entity), so it belongs next to `defaultInterfaces` and `defaultImplements`. A top-level `query` package would create a parallel hierarchy that breaks the existing layering story.
- **Alternatives considered:** `com.authServer.query` — rejected; would invite per-entity sub-packages later and erode the `shared/*` convention. `com.authServer.shared.defaultInterfaces.query` — rejected; query handling is not "yet another default interface contract", it is a peer subsystem.

**Decision 2:** Type `FilterOperationRequest.value` as `Object`, not as a typed sum (`StringValue | NumberValue | …`) or a JSON `JsonNode`.
- **Why:** The parent's "Value Parsing" rule says values are parsed against the field definition, not guessed from JSON. `Object` keeps Jackson's deserialisation work cheap and pushes typing to the one place that has the field metadata (Task 3's `QueryableField`). A typed sum would force every operator into a separate subclass, ballooning the contract surface; `JsonNode` would couple this layer to Jackson, breaking SOLID's DIP at the request boundary.
- **Alternatives considered:** Sealed-class hierarchy `sealed interface FilterValue permits StringValue, NumberValue, BooleanValue, ListValue` — rejected; over-engineering for the current use-case and Jackson does not deserialise sealed hierarchies without custom config. `JsonNode` — rejected; ties the request DTO to Jackson and complicates testing.

**Decision 3:** Provide defaults via Java field initialisers (`= 0`, `= 20`, `= new ArrayList<>()`), not via `Optional<T>` or `@JsonSetter` defaults.
- **Why:** This is the literal text of parent Step 2.4 ("Define request defaults without using `Optional` fields"). Field initialisers run on every Jackson deserialisation that uses the no-args constructor (the standard path for `@RequestBody`), so a missing field maps to its default automatically. This is also one of the explicit BugTracker mistakes to avoid ([[Memory/known-issues]] indirect; parent §"Problems To Avoid").
- **Alternatives considered:** `Optional<List<SortRequest>> sort` — rejected and explicitly banned by the parent. `@JsonSetter(nulls = Nulls.SKIP)` — rejected; works but hides the default in an annotation when the field initialiser is the obvious place.

**Decision 4:** Do **not** bake the `id ASC` default into `PageableRequest`.
- **Why:** Whether `id` is a valid sort field depends on the entity. `AdminEntity` has an `id`; a hypothetical future entity that uses a composite key might not. Hard-coding `id ASC` here would make the request DTO entity-aware, which violates SRP and DIP. Task 3's `PageableFactory` is the right place: it has both the request and the entity profile.
- **Alternatives considered:** Default `sort` to `[{ field: "id", direction: ASC }]` in the field initialiser — rejected; couples the transport DTO to a specific entity convention.

**Decision 5:** Cap structural string lengths at `@Size(max = 64)` for `field`, but do **not** add a regex constraint.
- **Why:** 64 is comfortably above any reasonable JPA property path (current max in `BaseUserEntity`/`AdminEntity` is well under 20). It is a defence-in-depth cap — a 1-MB `field` value gets rejected before reaching Task 3's allowlist check. A regex would falsely promise that "this is a valid field name" when only the entity profile can know that; the regex-on-DTO pattern was a BugTracker mistake (see parent §"Problems To Avoid", "Do not use reflection to discover whether a field exists on an entity"). Length is structural; semantics is Task 3's job.
- **Alternatives considered:** `@Pattern(regexp = "[A-Za-z][A-Za-z0-9_.]*")` — rejected; either too narrow (rejects future legitimate fields) or too broad (false sense of safety).

**Decision 6:** Use Lombok `@Data + @Builder + @NoArgsConstructor + @AllArgsConstructor` rather than Java records.
- **Why:** Existing DTOs in the project (`BaseUserDTO`, `AdminDTO`, `AdminForm`) use the Lombok pattern. Switching to records here would create two competing styles in the codebase. Jakarta Validation 3.1 supports records, but Spring Boot's request-binding works equally well with both — there is no payoff to introducing a divergence.
- **Alternatives considered:** `public record PageableRequest(int page, int size, List<SortRequest> sort, List<FilterRequest> filters) {}` — rejected; defaulting in records requires either `@JsonCreator` with explicit defaults or compact-constructor logic, both of which are noisier than the field-initialiser pattern.

**Decision 7:** Do not add a `@ControllerAdvice` handler for `MethodArgumentNotValidException` in this task.
- **Why:** Adding the handler is conceptually clean here, but Task 3 will introduce `InvalidQueryRequestException` and the parent's exception-handling story is meant to be told once, in one place. Adding it now and again in Task 3 would mean editing `GlobalExceptionHandler.java` twice. The smoke tests written in Step 7 use the `Validator` API directly, so they do not depend on the handler being wired.
- **Alternatives considered:** Add it now — rejected; doubles the diff surface and risks merge conflicts with Task 3.

---

## Testing Considerations

### Automatic Validation

- [x] `JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64" mvn clean compile` from `code/backend/` exits 0. (`./mvnw` is still blocked by the missing wrapper metadata per [[Memory/known-issues]] §"Backend Maven wrapper is incomplete".)
- [x] `JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64" mvn -Dtest='PageableRequestValidationTest' test` from `code/backend/` exits 0 with 14 tests run / 0 failures / 0 errors.
- [x] No new `WARNING` lines in the compile output related to unused imports or annotation processors. The compile output still includes the pre-existing `URLValidator` deprecation info line.
- [x] `code/backend/src/main/java/com/authServer/shared/query/` contains `6` Java source files.

### Manual Validation

- [ ] In IntelliJ IDEA (or whichever IDE the user runs), confirm autocomplete on `PageableRequest.builder().page(...).size(...).sort(...).filters(...).build()` — proves Lombok and Bean Validation annotations are picked up by the IDE's compile path.
- [ ] In a future Task 4 controller, confirm `@Valid @RequestBody PageableRequest` produces a `400` for invalid inputs without any extra controller-level code. **This check is deferred** to Task 4; do not attempt it here.

**Rule:** Run automatic checks when possible. The IDE autocomplete check requires user action; do not attempt it from the agent. The end-to-end controller check belongs to Task 4 and must not be retro-fitted into this task.

---

## Related Code Explanations

- `code/backend/src/main/java/com/authServer/shared/models/baseUser/BaseUserDTO.java` — reference for the Lombok DTO style adopted here.
- `code/backend/src/main/java/com/authServer/models/hq/admin/AdminForm.java` — reference for the existing `@Valid @RequestBody` + Bean Validation pattern in this project.
- `code/backend/src/main/java/com/authServer/exceptions/GlobalExceptionHandler.java` — current advice; this task does not modify it. Task 3 will add `InvalidQueryRequestException` handling and may also add a `MethodArgumentNotValidException` handler at that time.
- `code/backend/src/main/java/com/authServer/shared/defaultInterfaces/` — sibling package; confirms `shared/*` placement of generic infrastructure.

---

## Notes / Follow-ups

- **`MethodArgumentNotValidException` handler is not added here.** Task 3 should add it together with `InvalidQueryRequestException` so all query-layer error paths land in the same `GlobalExceptionHandler` change.
- **No `id ASC` default in the DTO.** Task 3's `PageableFactory` must inject `id ASC` only when both (a) the request `sort` is empty and (b) the entity profile lists `id` as a sortable field. Document this expectation in Task 3's "Implementation Details".
- **`FilterOperationRequest.value` is `Object`.** Task 3's predicate builder must parse it through `QueryableField`'s declared type, not by reflecting on the JSON shape. The parent's "Value Parsing" rules apply.
- **No relation-field handling here.** Strings like `"manager.username"` pass the structural validation (single non-blank, ≤ 64 chars) but their *meaning* is decoded by Task 3 / Task 5 only when an entity profile actually exposes a relation field. Do not add structural rules about dots or arrows — they would over-promise.
- **The default-test launcher remains broken.** Run the smoke test with `-Dtest='PageableRequestValidationTest'` until the launcher fix lands ([[Memory/known-issues]] §"Test suites and `TestLauncher` discovery"). Do not retro-fit the launcher inside this task.
- **Package rename pending.** When `com.authServer` → AgentForge happens, this entire package moves with the rest of `shared/*`; no logic changes required.
- **Context7 quota exhausted during execution.** Fresh Context7 queries returned `Monthly quota exceeded`; dependency versions were verified locally and official Jakarta / Spring Data / OpenFeign documentation was used as fallback. Authenticate Context7 before the next documentation-heavy task if fresh Context7 snippets are required.

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected for this task
- [x] Up-to-date documentation reviewed for the affected technologies. Fresh Context7 queries were attempted but blocked by quota; official Jakarta / Spring Data / OpenFeign docs were used as fallback.
- [x] Six new files created under `code/backend/src/main/java/com/authServer/shared/query/`: `PageableRequest.java`, `SortRequest.java`, `SortDirection.java`, `FilterRequest.java`, `FilterOperationRequest.java`, `FilterOperator.java`
- [x] One new file created under `code/backend/src/test/java/com/authServer/shared/query/`: `PageableRequestValidationTest.java`
- [x] All implementation steps checked off
- [x] Automatic validation passes: `mvn clean compile` green, smoke validation test passes 14/14
- [x] Manual IDE autocomplete check noted for the user (not executed by the agent)
- [x] Parent feature [[Backend-QueryDSL-Filtering-Pagination]] step boxes 2.1 – 2.4 flipped, and Task 2's "Task Document Link" replaced with `[[Tasks/current/Backend-QueryDSL-Filtering-Pagination-step-2-request-model]]`
- [x] Memory bank `context.md` updated to record that the shared query request and validation model is in place and the next task is Task 3 (stateless predicate and pageable infrastructure)
