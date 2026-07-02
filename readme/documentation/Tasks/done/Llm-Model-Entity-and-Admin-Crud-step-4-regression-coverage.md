# Task: Regression and Supplemental Coverage for LlmModel

#task #current #medium-complexity #parent-llm-model-entity-and-admin-crud

**Parent:** [[Llm-Model-Entity-and-Admin-Crud]]
**Parent Type:** Feature
**Related Step(s):** Phase 4 — Steps 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
**Estimated Complexity:** Medium

---

## Goal

Add the supplemental edge-case tests not covered by TDD-first slices in Tasks 1-3, then run the full regression suite to confirm that the complete LlmModel implementation introduces no regressions in existing Admin, Employee, Client, and security tests. The primary gap is service-level access control (Step 4.3): all 7 service methods carry `@PreAuthorize("hasRole('ADMIN')")` but no test has verified EMPLOYEE callers are blocked at the service boundary.

---

## Parent Context

The parent feature (`Llm-Model-Entity-and-Admin-Crud`) defined four tasks. Tasks 1-3 are complete:

- **Task 1** — `/llm-model/**` → `hasRole("ADMIN")` HTTP security rule; 3 `@WithMockUser` tests.
- **Task 2** — `LlmModelEntity`, DTOs, `LlmModelMapper`, `LlmModelRepository`; 9 repository tests + 12 mapper tests.
- **Task 3** — `LlmModelQueryProfile`, `LlmModelService`, `LlmModelController`; 16 service CRUD tests + 7 service list tests + 11 controller tests. Full suite: 465 tests, 0 failures, 1 pre-existing Docker error.

This task (Task 4) is Phase 4 from the feature — supplemental coverage. The parent states:

> "First behavior tests for each module are written within their implementation phase (Phases 1–3), not deferred to Phase 4. Phase 4 adds supplemental tests for edge cases, contract completeness, and full regression after all modules are assembled."

The key constraint from the parent that Task 4 must fulfill:

- **Step 4.1** — Repository: `modelId` unique constraint, `createdAt` auto-set, `findByModelId` empty case. (These are covered; add nullable `description` round-trip.)
- **Step 4.2** — Mapper: all DTO variants, null `description` safety, `isEnabled` default. (These are covered; add `isEnabled=false` paths.)
- **Step 4.3** — Service: `modelId` uniqueness, blocked delete, toggle behavior, **admin-only access for all methods**. The first three are covered; admin-only access for all methods is the primary gap.
- **Step 4.4** — Controller: HTTP contract, `PATCH /toggle`, `DELETE` 400, list. (Covered; add combined filter+sort+pagination and query-validation parity.)
- **Step 4.5** — Query profile: `isEnabled` filter, `createdAt` sort, unknown field rejection. (Covered; add `name` and `id` field filter coverage.)
- **Step 4.6** — Full `./mvnw test` to confirm no regressions.

---

## Preconditions / Dependencies

- Tasks 1, 2, and 3 complete and merged. Full suite: 465 tests, 0 failures, 1 pre-existing `authServerApplicationTests.contextLoads` Docker error.
- All LlmModel production files exist:
  - `models/llm/LlmModelEntity.java`
  - `models/llm/LlmModelForm.java`
  - `models/llm/LlmModelDTO.java`, `LlmModelMiniDTO.java`, `LlmModelListDTO.java`
  - `models/llm/LlmModelMapper.java`
  - `models/llm/LlmModelRepository.java`
  - `models/llm/LlmModelQueryProfile.java`
  - `models/llm/LlmModelService.java`
  - `models/llm/LlmModelController.java`
- All LlmModel test files exist:
  - `models/llm/LlmModelRepositoryTest.java` (9 tests)
  - `models/llm/LlmModelMapperTest.java` (12 tests)
  - `models/llm/LlmModelServiceCrudIntegrationTest.java` (16 tests)
  - `models/llm/LlmModelServiceListQueryIntegrationTest.java` (7 tests)
  - `models/llm/LlmModelControllerTest.java` (11 tests)
- `@EnableMethodSecurity` is active on `SecurityConfig` (added in Employee Task 1). Required for `@PreAuthorize` to fire in tests.
- `QLlmModelEntity` generated at `target/generated-sources/annotations/`. No new entities — no recompile needed.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — Selected — task template and document creation
- `solid-deep-design` — Selected — depth/SRP analysis for each supplemental test group
- `tdd` — Selected — incremental test addition: add test, confirm green, move to next
- `memory-bank` — Selected — architecture, known-issues, and prior task context loaded
- `glossary-management` — Not needed — no new domain terms introduced in supplemental tests
- `find-docs` — Not needed — Spring Boot 3.4.1, Spring Security, JUnit 5, AssertJ patterns verified against existing production code in Tasks 1-3

### Documentation Reviewed

- [[Features/to-do/Llm-Model-Entity-and-Admin-Crud]] — feature doc Phase 4 requirements
- [[Tasks/current/Llm-Model-Entity-and-Admin-Crud-step-3-business-rules-crud-toggle]] — Task 3 completion state, test counts, all implemented methods
- [[Tasks/current/Llm-Model-Entity-and-Admin-Crud-step-2-domain-foundation]] — Task 2 test patterns for repository and mapper
- [[Bugs/to-do/Review-of-Llm-Model-Entity-and-Admin-Crud]] — 5 findings, all resolved; Finding 3 (isEnabled side-channel) motivates `updatePreservesIsEnabledState` test
- [[ADRs/ADR-007-admin-curated-llm-model-list]] — employees must never access LlmModel endpoints; `isEnabled` change path is exclusively via toggle

### Related Existing Code

- `backend/src/test/java/com/agentForgeBackend/models/llm/LlmModelRepositoryTest.java` — 9 existing tests; 1 new test added
- `backend/src/test/java/com/agentForgeBackend/models/llm/LlmModelMapperTest.java` — 12 existing tests; 3 new tests added
- `backend/src/test/java/com/agentForgeBackend/models/llm/LlmModelServiceCrudIntegrationTest.java` — 16 existing tests; 8 new tests added
- `backend/src/test/java/com/agentForgeBackend/models/llm/LlmModelServiceListQueryIntegrationTest.java` — 7 existing tests; 2 new tests added
- `backend/src/test/java/com/agentForgeBackend/models/llm/LlmModelControllerTest.java` — 11 existing tests; 5 new tests added
- `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeControllerListEndpointTest.java` — prior art for controller query-validation parity (unknownSort, invalidIdType, malformedOperator, invalidSize)
- `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelService.java:23-117` — all 7 `@PreAuthorize("hasRole('ADMIN')")` annotations to verify

---

## Implementation Details

### Approach

This task adds supplemental tests to five existing test classes. No new production files are created; no new test classes are created. Each test targets a genuine gap identified by cross-referencing the feature doc's Phase 4 steps against the tests already written in Tasks 1-3.

**TDD cadence for supplemental tests:** Add one test → run targeted `./mvnw test -Dtest=ClassName` → confirm green → add next test. Do not add all tests at once. Each test should be green on the first run (supplemental tests verify behavior already implemented, not new implementation).

**SOLID + Depth Analysis — the purpose of each supplemental group:**

| Group | SRP check | Depth value | Gap filled |
|-------|-----------|-------------|-----------|
| Repository `nullDescription` | Repository tests have one reason to change: `LlmModelEntity` persistence contract changes | Deletion test: if removed, nullable `description` contract is unverified and future refactors could introduce NOT NULL | Nullable `description` round-trip not yet proven |
| Mapper `isEnabled=false` paths | Mapper tests have one reason to change: mapper field mappings change | 3 existing tests always use `isEnabled=true`; mapper code has a branch that returns `isEnabled` — `false` path is untested | False case for `isEnabled` in all 3 DTOs |
| Service access control (7 tests) | Service tests have one reason to change: service business rules change | If removed, a future refactor that accidentally drops `@PreAuthorize` on any method would go undetected | `@PreAuthorize("hasRole('ADMIN')")` verified on every public service method |
| Service `updatePreservesIsEnabled` | Same class, consistent scope | Bug-regression guard: if update() is refactored and accidentally reads `isEnabled` from the form, this test catches it | Finding 3 from review bug; no test currently guards against `isEnabled` mutation via update |
| Service list `name` + `id` filters | List query tests have one reason to change: `LlmModelQueryProfile` field map changes | `name` and `id` are declared in the query profile but no test exercises them as filter fields | Two of 5 query profile fields have zero filter tests |
| Controller query-validation parity | Controller tests have one reason to change: controller HTTP contract changes | Mirrors `EmployeeControllerListEndpointTest` supplemental patterns; ensures controller-layer error serialization (not just service-layer) is verified | Combined filter+sort+page, unknownSort, invalidIdType, malformedOperator, invalidSize — all missing at controller layer |

**`AccessDeniedException` semantics:**

`@PreAuthorize("hasRole('ADMIN')")` fires via Spring AOP before the method body executes. In a `@SpringBootTest` context with `@EnableMethodSecurity`, calling a protected service method with `@WithMockUser(roles = "EMPLOYEE")` throws `org.springframework.security.access.AccessDeniedException` directly to the test. There is no HTTP response — the test must use `assertThatThrownBy(...).isInstanceOf(AccessDeniedException.class)`. For `delete()` specifically: `@PreAuthorize` fires before the unconditional `throw new InvalidDeleteOperation(...)`, so an EMPLOYEE caller gets `AccessDeniedException`, not `InvalidDeleteOperation`.

**Method-level `@WithMockUser` override:**

The service crud integration test class has `@WithMockUser(roles = "ADMIN")` at class level. Method-level `@WithMockUser(roles = "EMPLOYEE")` overrides it for that specific test. This is the same pattern used by `LlmModelControllerTest.employeeCannotAccessLlmModelEndpoints` and `EmployeeControllerListEndpointTest.employeeRoleCannotAccessEmployeeEndpoints`.

### Files to Create/Modify

- [x] `backend/src/test/java/com/agentForgeBackend/models/llm/LlmModelRepositoryTest.java` — **MODIFY** — add 1 test: `entityWithNullDescriptionSavesAndLoadsCorrectly` (Step 4.1)
- [x] `backend/src/test/java/com/agentForgeBackend/models/llm/LlmModelMapperTest.java` — **MODIFY** — add 3 tests: `isEnabled=false` paths for all 3 DTO types (Step 4.2)
- [x] `backend/src/test/java/com/agentForgeBackend/models/llm/LlmModelServiceCrudIntegrationTest.java` — **MODIFY** — add 8 tests: 7 access control + 1 `updatePreservesIsEnabledState` (Step 4.3)
- [x] `backend/src/test/java/com/agentForgeBackend/models/llm/LlmModelServiceListQueryIntegrationTest.java` — **MODIFY** — add 2 tests: filter by `name` + filter by `id` (Step 4.5)
- [x] `backend/src/test/java/com/agentForgeBackend/models/llm/LlmModelControllerTest.java` — **MODIFY** — add 5 tests: combined filter+sort+page + 4 query-validation parity (Step 4.4)

---

## Step-by-Step Implementation

### Step 1: Repository Supplemental — Nullable Description (Step 4.1)

**Goal:** Verify that `description` is nullable at the database level — entities saved with `null` description are persisted and reloaded correctly.

**Dependencies:** `LlmModelRepositoryTest.java` exists with 9 tests passing.

- [x] Open `LlmModelRepositoryTest.java`
- [x] Add `entityWithNullDescriptionSavesAndLoadsCorrectly` after the existing tests
- [x] Run `./mvnw test -Dtest=LlmModelRepositoryTest` from `backend/` — expect 10 tests, all pass

**Why this step matters:** The repository test suite proves the database contract of `LlmModelEntity`. `description` is nullable (`@Column` with no `nullable = false`). Without this test, a future refactor that accidentally adds `nullable = false` to the column would not be caught until runtime or a separate migration.

#### Implementation

Add to `LlmModelRepositoryTest.java` (after the last existing `@Test` method, before the closing `}`):

```java
@Test
void entityWithNullDescriptionSavesAndLoadsCorrectly() {
    LlmModelEntity entity = new LlmModelEntity();
    entity.setModelId("test/null-description");
    entity.setName("Null Description Model");
    // description intentionally not set — tests nullable column constraint

    llmModelRepository.saveAndFlush(entity);
    entityManager.clear();

    LlmModelEntity loaded = llmModelRepository.findByModelId("test/null-description").orElseThrow();
    assertNull(loaded.getDescription());
    assertEquals("Null Description Model", loaded.getName());
}
```

#### Edge Cases

1. **`description` not explicitly set vs. set to null** — both result in the entity field being `null`. Not setting it is sufficient to test the nullable constraint, and mirrors how the existing `savesEntityAndAssignsId` test works (no description set).
2. **`@BeforeEach entityManager.clear()`** — the test repositions the entity manager after each test, so the `saveAndFlush` + `clear` + `findByModelId` pattern follows the existing repo test style exactly.

---

### Step 2: Mapper Supplemental — `isEnabled = false` Paths (Step 4.2)

**Goal:** Verify that `toDTO`, `toSmallDTO`, and `toListDTO` correctly map `isEnabled = false`. All existing mapper tests use the `@BeforeEach` entity with `isEnabled = true`, leaving the `false` path implicitly untested.

**Dependencies:** `LlmModelMapperTest.java` exists with 12 tests passing.

- [x] Open `LlmModelMapperTest.java`
- [x] Add `toDTO_isEnabledFalse_mapsFalseCorrectly` in the `toDTO tests` section
- [x] Add `toSmallDTO_isEnabledFalse_mapsFalseCorrectly` in the `toSmallDTO tests` section
- [x] Add `toListDTO_isEnabledFalse_mapsFalseCorrectly` in the `toListDTO tests` section
- [x] Run `./mvnw test -Dtest=LlmModelMapperTest` from `backend/` — expect 15 tests, all pass

**Why this step matters:** If a future Lombok or mapper refactor introduces a default (e.g., `@Builder.Default private Boolean isEnabled = true`), the `false` path would silently coerce to `true`. Three small tests eliminate this risk at the mapper boundary.

#### Implementation

Add to `LlmModelMapperTest.java`, within each existing section:

```java
// In the "toDTO tests" section:
@Test
void toDTO_isEnabledFalse_mapsFalseCorrectly() {
    entity.setIsEnabled(false);
    LlmModelDTO dto = mapper.toDTO(entity);

    assertFalse(dto.getIsEnabled());
}

// In the "toSmallDTO tests" section:
@Test
void toSmallDTO_isEnabledFalse_mapsFalseCorrectly() {
    entity.setIsEnabled(false);
    LlmModelMiniDTO mini = mapper.toSmallDTO(entity);

    assertFalse(mini.getIsEnabled());
}

// In the "toListDTO tests" section:
@Test
void toListDTO_isEnabledFalse_mapsFalseCorrectly() {
    entity.setIsEnabled(false);
    LlmModelListDTO listDTO = mapper.toListDTO(entity);

    assertFalse(listDTO.getIsEnabled());
}
```

#### Edge Cases

1. **The `entity` field is set to `isEnabled = true` in `@BeforeEach`** — each test sets `entity.setIsEnabled(false)` locally before calling the mapper. The `@BeforeEach` always resets to `isEnabled = true` for the next test, so no state leaks between tests.
2. **`Boolean` vs `boolean`** — `LlmModelEntity.isEnabled` is boxed `Boolean`. `assertFalse(dto.getIsEnabled())` will fail if `getIsEnabled()` returns `null` (NPE from assertFalse's unboxing). This is intentional: if the mapper ever returns `null` for `isEnabled`, the test will fail loudly rather than silently.

---

### Step 3: Service Access Control Supplemental (Step 4.3 — Admin-Only Access for All Methods)

**Goal:** Verify that `@PreAuthorize("hasRole('ADMIN')")` on all 7 `LlmModelService` public methods blocks EMPLOYEE callers with `AccessDeniedException`. No test in Tasks 1-3 verified the service-layer access boundary for non-admin users.

**Dependencies:** `LlmModelServiceCrudIntegrationTest.java` exists with 16 tests passing. `@EnableMethodSecurity` is active on `SecurityConfig`.

- [x] Open `LlmModelServiceCrudIntegrationTest.java`
- [x] Add import: `import org.springframework.security.access.AccessDeniedException;`
- [x] Add 7 access control tests under a `// --- Access control (EMPLOYEE role) ---` comment block
- [x] Add 1 `updatePreservesIsEnabledState` test (behavioral guard; see Step 4)
- [x] Run `./mvnw test -Dtest=LlmModelServiceCrudIntegrationTest` from `backend/` — expect 24 tests, all pass

**Why this step matters:** `@PreAuthorize` annotations are easy to accidentally drop during a refactor (e.g., when extracting a base class method or using a code generation tool). These 7 tests form an explicit regression net. The feature doc Step 4.3 explicitly lists "admin-only access for all methods" as required coverage.

#### Implementation

Add the following block to `LlmModelServiceCrudIntegrationTest.java` after the `// --- getAll() ---` section:

```java
// --- Access control (EMPLOYEE role) ---

@Test
@WithMockUser(roles = "EMPLOYEE")
void employeeCannotCallGetOne() throws Exception {
    LlmModelEntity e = llmModelRepository.saveAndFlush(model("ec/model-1", "EC Model 1"));
    assertThatThrownBy(() -> llmModelService.getOne(e.getId()))
            .isInstanceOf(AccessDeniedException.class);
}

@Test
@WithMockUser(roles = "EMPLOYEE")
void employeeCannotCallGetAll() {
    assertThatThrownBy(() -> llmModelService.getAll())
            .isInstanceOf(AccessDeniedException.class);
}

@Test
@WithMockUser(roles = "EMPLOYEE")
void employeeCannotCallInsert() {
    assertThatThrownBy(() -> llmModelService.insert(new LlmModelForm("ec/model-2", "EC Model 2", null)))
            .isInstanceOf(AccessDeniedException.class);
}

@Test
@WithMockUser(roles = "EMPLOYEE")
void employeeCannotCallUpdate() {
    assertThatThrownBy(() -> llmModelService.update(1L, new LlmModelForm("ec/model-3", "EC Model 3", null)))
            .isInstanceOf(AccessDeniedException.class);
}

@Test
@WithMockUser(roles = "EMPLOYEE")
void employeeCannotCallDelete() {
    assertThatThrownBy(() -> llmModelService.delete(1L))
            .isInstanceOf(AccessDeniedException.class);
}

@Test
@WithMockUser(roles = "EMPLOYEE")
void employeeCannotCallGetListPage() {
    assertThatThrownBy(() -> llmModelService.getListPage(new PageableRequest()))
            .isInstanceOf(AccessDeniedException.class);
}

@Test
@WithMockUser(roles = "EMPLOYEE")
void employeeCannotCallToggleEnabled() {
    assertThatThrownBy(() -> llmModelService.toggleEnabled(1L))
            .isInstanceOf(AccessDeniedException.class);
}
```

Also add the following imports to `LlmModelServiceCrudIntegrationTest.java`:

```java
import com.agentForgeBackend.shared.query.PageableRequest;
import org.springframework.security.access.AccessDeniedException;
```

And add a private helper method at the bottom of the class to avoid repetition in the access control tests:

```java
private LlmModelEntity model(String modelId, String name) {
    LlmModelEntity e = new LlmModelEntity();
    e.setModelId(modelId);
    e.setName(name);
    return e;
}
```

#### Edge Cases

1. **`employeeCannotCallDelete` uses ID `1L` without seeding** — `delete()` always throws `InvalidDeleteOperation` before doing any DB lookup. For an EMPLOYEE caller, `@PreAuthorize` fires *before* the method body, so `AccessDeniedException` is thrown regardless of whether ID `1L` exists. This is safe.
2. **`employeeCannotCallUpdate` uses ID `1L` without seeding** — same reasoning: `@PreAuthorize` fires before the service body reaches `findById(1L)`. The `AccessDeniedException` is thrown before any DB query.
3. **`employeeCannotCallGetOne` seeds an entity** — `getOne` is tested with a real entity to make the intent clear: even when the entity exists and would otherwise be found, EMPLOYEE access is denied at the authorization layer before any fetch.
4. **`@BeforeEach deleteAll()` runs with EMPLOYEE security context** — `WithSecurityContextTestExecutionListener` applies the method-level `@WithMockUser(roles = "EMPLOYEE")` BEFORE `@BeforeEach` runs. For access control tests, `@BeforeEach` therefore executes with an EMPLOYEE `SecurityContext`. This is safe because `LlmModelRepository.deleteAll()` has no `@PreAuthorize` annotation (confirmed: `DefaultRepository` extends `JpaRepository` with no security annotations). If repository-layer security is ever added, these tests would need a dedicated admin-role setup in `@BeforeEach`.
5. **`model()` helper naming** — the 2-parameter `model(String modelId, String name)` helper added here is distinct from the 3-parameter `model(String modelId, String name, boolean enabled)` helper in `LlmModelServiceListQueryIntegrationTest`. They are in different classes and have no Java conflict. A code reviewer inspecting both test files should not mistake them for duplicates — the signatures and classes differ intentionally.

---

### Step 4: Service CRUD Supplemental — Update Preserves `isEnabled` (Step 4.3)

**Goal:** Add a regression guard proving that `LlmModelService.update()` never modifies `isEnabled`, even though the method touches the entity and saves it.

**Dependencies:** Step 3 complete (same class).

- [x] Add `updateDoesNotChangeIsEnabledState` after the existing `update()` tests, before the access control block
- [x] Run `./mvnw test -Dtest=LlmModelServiceCrudIntegrationTest` from `backend/` — expect 24 tests pass (this test runs in the same run as Step 3)

**Why this step matters:** This is a direct consequence of Review Bug Finding 3 — `isEnabled` should be exclusively managed by `toggleEnabled()`. A regression guard at the service level ensures that if `update()` is ever refactored and accidentally reads `isEnabled` from the form, this test fails loudly.

#### Implementation

Add to `LlmModelServiceCrudIntegrationTest.java` after the `updateThrowsItemNotFoundForNonExistentId` test:

```java
@Test
void updateDoesNotChangeIsEnabledState() throws Exception {
    // Insert a model (starts enabled = true)
    llmModelService.insert(new LlmModelForm("preserve/model", "Preserve Model", null));
    Long id = llmModelRepository.findByModelId("preserve/model").orElseThrow().getId();

    // Disable via toggle so we have a known false state to guard against
    llmModelService.toggleEnabled(id);
    assertThat(llmModelService.getOne(id).getIsEnabled()).isFalse();

    // Update name only — isEnabled must remain false
    LlmModelDTO result = llmModelService.update(id, new LlmModelForm("preserve/model", "Updated Name", null));

    assertThat(result.getIsEnabled()).isFalse();
    assertThat(result.getName()).isEqualTo("Updated Name");
}
```

#### Edge Cases

1. **Why toggle before update?** — The entity starts enabled. If `update()` silently applies `isEnabled = true` (the entity field initializer) on every save, the test would still pass when starting from enabled. By first toggling to disabled and then updating, any accidental `isEnabled` reset by `update()` is caught.
2. **`isEnabled` is not in `LlmModelForm`** — `LlmModelForm` has no `isEnabled` field (decided in Finding 3 resolution). The test confirms the behavioral contract: even if `LlmModelForm` somehow gained an `isEnabled` field in the future, `update()` must not apply it.

---

### Step 5: Service List Supplemental — `name` and `id` Filter Coverage (Step 4.5)

**Goal:** Add filter tests for the `name` and `id` fields in `LlmModelQueryProfile`. These fields are declared filterable but have no filter-specific tests in Task 3.

**Dependencies:** `LlmModelServiceListQueryIntegrationTest.java` exists with 7 tests passing.

- [x] Open `LlmModelServiceListQueryIntegrationTest.java`
- [x] Add `filterByNameContainsReturnsMatchingModels`
- [x] Add `filterByIdEqualsReturnsSingleModel`
- [x] Run `./mvnw test -Dtest=LlmModelServiceListQueryIntegrationTest` from `backend/` — expect 9 tests, all pass

**Why this step matters:** The `LlmModelQueryProfile` declares 5 filterable fields: `id`, `modelId`, `name`, `isEnabled`, `createdAt`. Task 3 tests cover `isEnabled` (EQUALS) and `modelId` (CONTAINS). The `name` and `id` fields have zero filter tests. If `QueryableField.string("name", LLM.name)` or `QueryableField.number("id", LLM.id, Long.class)` was misconfigured, those fields would silently fail at runtime with no test coverage catching it.

#### Implementation

Add after the last existing `@Test` in `LlmModelServiceListQueryIntegrationTest.java`:

```java
@Test
void filterByNameContainsReturnsMatchingModels() throws InvalidQueryRequestException {
    PageableRequest request = new PageableRequest();
    request.setFilters(List.of(FilterRequest.builder()
            .field("name")
            .operations(List.of(FilterOperationRequest.builder()
                    .operator(FilterOperator.CONTAINS)
                    .value("Alpha")
                    .build()))
            .build()));

    Page<LlmModelListDTO> page = llmModelService.getListPage(request);

    assertThat(page.getTotalElements()).isEqualTo(1);
    assertThat(page.getContent().get(0).getName()).isEqualTo("Model Alpha");
}

@Test
void filterByIdEqualsReturnsSingleModel() throws InvalidQueryRequestException {
    PageableRequest request = new PageableRequest();
    request.setFilters(List.of(FilterRequest.builder()
            .field("id")
            .operations(List.of(FilterOperationRequest.builder()
                    .operator(FilterOperator.EQUALS)
                    .value(alpha.getId())
                    .build()))
            .build()));

    Page<LlmModelListDTO> page = llmModelService.getListPage(request);

    assertThat(page.getTotalElements()).isEqualTo(1);
    assertThat(page.getContent().get(0).getId()).isEqualTo(alpha.getId());
}
```

Note: `alpha`, `beta`, `gamma` are seeded in `@BeforeEach` with names `"Model Alpha"`, `"Model Beta"`, `"Model Gamma"`. The `alpha` field is accessible because it is declared as an instance field of `LlmModelServiceListQueryIntegrationTest`.

Also verify that `FilterOperationRequest` is imported — it is covered by the existing `import com.agentForgeBackend.shared.query.*;` wildcard import.

#### Edge Cases

1. **`filterByNameContainsReturnsMatchingModels` case sensitivity** — `FilterOperator.CONTAINS` maps to a QueryDSL `like()` predicate, which is typically case-sensitive in H2 and case-insensitive in PostgreSQL depending on locale settings. The test uses `"Alpha"` which matches `"Model Alpha"` with the exact same casing as seeded. This is safe.
2. **`filterByIdEqualsReturnsSingleModel` uses `alpha.getId()`** — `alpha` is a managed `LlmModelEntity` saved in `@BeforeEach`. Its ID is auto-assigned by H2. Using the field directly (not a hardcoded value) is correct and avoids assumption about ID values.

---

### Step 6: Controller Supplemental — Query Validation Parity (Step 4.4)

**Goal:** Add 5 controller tests that mirror the supplemental patterns from `EmployeeControllerListEndpointTest`: combined filter+sort+pagination, unknown sort field, invalid `id` type, malformed operator enum, invalid pagination size. These verify that the controller-layer error responses (JSON serialization, status codes, error messages) match the established contract — not just that the service rejects them.

**Dependencies:** `LlmModelControllerTest.java` exists with 11 tests passing. `@BeforeEach` seeds one entity (`saved`: `openai/gpt-4o`, enabled).

- [x] Open `LlmModelControllerTest.java`
- [x] Add a `private String queryRequest(String field, String operator, String jsonValue)` helper method at the bottom
- [x] Add `listWithFilterSortAndPaginationReturnsMatchingPage`
- [x] Add `unknownSortFieldReturnsBadRequest`
- [x] Add `invalidIdTypeReturnsBadRequest`
- [x] Add `malformedOperatorReturnsBadRequest`
- [x] Add `invalidSizeReturnsBadRequest`
- [x] Run `./mvnw test -Dtest=LlmModelControllerTest` from `backend/` — expect 16 tests, all pass

**Why this step matters:** The existing controller tests verify the happy path and a few rejection cases at the filter-field level. The supplemental tests verify the error serialization for all four edge-case categories (sort field, type mismatch, enum deserialization failure, validation constraint). The `GlobalExceptionHandler` maps each exception type to a specific HTTP status and JSON shape. These tests ensure that wiring is correct end-to-end at the HTTP layer, not just at the service layer.

#### Implementation

Add the following to `LlmModelControllerTest.java`:

**Add at the bottom, before the closing `}`:**

```java
// --- Supplemental: combined filter+sort+pagination ---

@Test
void listWithFilterSortAndPaginationReturnsMatchingPage() throws Exception {
    // Seed one more enabled model and one disabled model alongside the @BeforeEach entity
    LlmModelEntity enabled2 = new LlmModelEntity();
    enabled2.setModelId("anthropic/claude-3");
    enabled2.setName("Claude 3");
    llmModelRepository.saveAndFlush(enabled2);

    LlmModelEntity disabled = new LlmModelEntity();
    disabled.setModelId("disabled/model");
    disabled.setName("Disabled Model");
    disabled.setIsEnabled(false);
    llmModelRepository.saveAndFlush(disabled);

    // 2 enabled models ("GPT-4o" and "Claude 3"), sorted by name DESC, page 0 size 1
    // DESC name order: G > C → first page contains "GPT-4o"
    String body = """
            {
              "page": 0,
              "size": 1,
              "sort": [ { "field": "name", "direction": "DESC" } ],
              "filters": [ {
                "field": "isEnabled",
                "operations": [ { "operator": "EQUALS", "value": true } ]
              } ]
            }
            """;

    mockMvc.perform(post("/llm-model/list")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalElements").value(2))
            .andExpect(jsonPath("$.content", hasSize(1)))
            .andExpect(jsonPath("$.content[0].name").value("GPT-4o"))
            .andExpect(jsonPath("$.size").value(1))
            .andExpect(jsonPath("$.number").value(0));
}

// --- Supplemental: query validation parity with EmployeeControllerListEndpointTest ---

@Test
void unknownSortFieldReturnsBadRequest() throws Exception {
    String body = """
            {
              "sort": [ { "field": "unknownSortField", "direction": "ASC" } ]
            }
            """;

    mockMvc.perform(post("/llm-model/list")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.status").value(400))
            .andExpect(jsonPath("$.error").value("Invalid Query Request"))
            .andExpect(jsonPath("$.message").value("Unknown query field 'unknownSortField'."));
}

@Test
void invalidIdTypeReturnsBadRequest() throws Exception {
    mockMvc.perform(post("/llm-model/list")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(queryRequest("id", "EQUALS", "\"not-a-number\"")))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.status").value(400))
            .andExpect(jsonPath("$.error").value("Invalid Query Request"))
            .andExpect(jsonPath("$.message").value("Field 'id' requires a JSON number; received String."));
}

@Test
void malformedOperatorReturnsBadRequest() throws Exception {
    mockMvc.perform(post("/llm-model/list")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(queryRequest("modelId", "MATCHES", "\"openai\"")))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.status").value(400))
            .andExpect(jsonPath("$.error").value("Malformed Request"))
            .andExpect(jsonPath("$.message").value("Malformed request body."));
}

@Test
void invalidSizeReturnsBadRequest() throws Exception {
    String body = """
            { "size": 101 }
            """;

    mockMvc.perform(post("/llm-model/list")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("Validation Failed"))
            .andExpect(jsonPath("$.message").value("size: must be less than or equal to 100"));
}

private String queryRequest(String field, String operator, String jsonValue) {
    return """
            {
              "filters": [
                {
                  "field": "%s",
                  "operations": [ { "operator": "%s", "value": %s } ]
                }
              ]
            }
            """.formatted(field, operator, jsonValue);
}
```

#### Edge Cases

1. **`listWithFilterSortAndPaginationReturnsMatchingPage` — sort-by-name DESC with two enabled models** — `@BeforeEach` seeds `"GPT-4o"` (enabled). The test adds `"Claude 3"` (enabled) and `"Disabled Model"` (disabled). With `isEnabled EQUALS true`, 2 entities match. Sorted by `name DESC`: G comes after C alphabetically, so DESC order places "GPT-4o" (G) before "Claude 3" (C). Page 0, size 1 → returns "GPT-4o". This is the correct first page.

2. **`unknownSortFieldReturnsBadRequest` error message format** — `QueryPredicateBuilder`/`PageableFactory` throws `InvalidQueryRequestException("Unknown query field 'unknownSortField'.")` — note the trailing period. The test asserts the exact message, matching the Employee controller test precedent.

3. **`invalidIdTypeReturnsBadRequest` error message format** — `GlobalExceptionHandler.handleInvalidQueryRequestException()` serializes the error message directly from the exception. The message `"Field 'id' requires a JSON number; received String."` comes from the query engine's type validation. This mirrors `EmployeeControllerListEndpointTest.invalidIdValueTypeReturnsBadRequest` exactly.

4. **`malformedOperatorReturnsBadRequest` — `MATCHES` is not a valid `FilterOperator` enum value** — Jackson's `ObjectMapper` throws `HttpMessageNotReadableException` on deserialization, which `GlobalExceptionHandler.handleHttpMessageNotReadable()` maps to `{"error": "Malformed Request", "message": "Malformed request body."}` with `400`. This is the same as the Employee controller test.

5. **`invalidSizeReturnsBadRequest` — `size: 101` triggers `@Max(100)` on `PageableRequest.size`** — `MethodArgumentNotValidException` from Spring validation → `{"error": "Validation Failed", "message": "size: must be less than or equal to 100"}`. This verifies that `PageableRequest` validation constraints work for LlmModel requests, not just Employee.

---

### Step 7: Full Regression (Step 4.6)

**Goal:** Run the complete test suite to confirm no regressions across Admin, Employee, Client, LlmModel, and security tests.

**Dependencies:** Steps 1-6 complete.

- [x] From `backend/`: run `./mvnw test`
- [x] Confirm `LlmModelRepositoryTest` — 10 tests, 0 failures (+1 from Step 1)
- [x] Confirm `LlmModelMapperTest` — 15 tests, 0 failures (+3 from Step 2)
- [x] Confirm `LlmModelServiceCrudIntegrationTest` — 24 tests, 0 failures (+8 from Steps 3-4)
- [x] Confirm `LlmModelServiceListQueryIntegrationTest` — 9 tests, 0 failures (+2 from Step 5)
- [x] Confirm `LlmModelControllerTest` — 16 tests, 0 failures (+5 from Step 6)
- [x] Confirm `SecurityAuthorizationTest` — 9 tests, 0 failures (unchanged)
- [x] Confirm all existing Admin, Employee, Client tests pass
- [x] Confirm only failure remains `authServerApplicationTests.contextLoads` (pre-existing Docker blocker)

**Expected new total:** 465 + 19 = **484 tests** (1 repo + 3 mapper + 8 service crud + 2 service list + 5 controller)

---

## Design Decisions

**Decision 1: Supplement existing test classes, do not create new ones**
- **Why:** Tasks 2 and 3 created dedicated test classes organized by module (`LlmModelRepositoryTest`, `LlmModelMapperTest`, etc.). Adding supplemental tests to these classes keeps each module's full test picture in one file. A new `LlmModelServiceAccessControlTest` class would duplicate the `@SpringBootTest` + `@WithMockUser` + `@Autowired` boilerplate for 7 trivially small tests. The Employee supplemental task followed the same approach — 21 tests added across 5 existing classes, no new classes created.
- **Alternatives considered:** New `LlmModelServiceAccessControlTest` class — rejected; adds boilerplate without clarity benefit when the access control tests are small and clearly grouped within `LlmModelServiceCrudIntegrationTest` under a comment header.

**Decision 2: Access control tests use ID `1L` (not seeded entity) for all methods that do DB lookups before throwing**
- **Why:** For `update()` and `getOne()`, in production these would throw `ItemNotFoundException` for a missing ID — but in the access control tests, `@PreAuthorize` fires *before* the method body, so the DB is never queried. The test for `employeeCannotCallGetOne` deliberately seeds an entity to make the intent clear (EMPLOYEE is blocked even when the entity exists). `employeeCannotCallUpdate` and `employeeCannotCallDelete` use `1L` because reaching the DB is irrelevant — the assertion is purely about the exception type.
- **Alternatives considered:** Seed all entities before each access control test — rejected; unnecessary DB round-trips for tests that will never reach the repository layer.

**Decision 3: Controller test `listWithFilterSortAndPaginationReturnsMatchingPage` asserts `"GPT-4o"` as the first result, not `"Claude 3"`**
- **Why:** The test seeds "GPT-4o" (from `@BeforeEach`) and adds "Claude 3" and "Disabled Model". Filtering to enabled + sorting by `name DESC` + page 0 size 1: alphabetically, G > C, so DESC places "GPT-4o" first. This is deterministic in H2 with string `ORDER BY`.
- **Alternatives considered:** Assert `"Claude 3"` as first result — incorrect for DESC; sort by name ASC would place Claude 3 first, but the test uses DESC to create a non-trivial ordering that differs from the default `id ASC` sort.

**Decision 4: No new tests for the `DELETE /llm-model/{id}` endpoint with EMPLOYEE role at the controller layer**
- **Why:** `LlmModelControllerTest.employeeCannotAccessLlmModelEndpoints` already tests `POST /llm-model/list` with `@WithMockUser(roles = "EMPLOYEE")` returning `403`. The HTTP security rule (`/llm-model/**` → `hasRole("ADMIN")`) blocks all `EMPLOYEE` requests at the filter chain level, regardless of the specific HTTP verb. The `SecurityAuthorizationTest` also covers this. Testing every endpoint with EMPLOYEE role at the controller layer would be redundant.
- **Alternatives considered:** Add per-endpoint employee access tests — rejected; the HTTP security filter already provides blanket coverage, and `employeeCannotAccessLlmModelEndpoints` proves the filter fires. Per-endpoint tests add no new information.

---

## Testing Considerations

### Automatic Validation

**Incremental runs (after each step):**
- [x] From `backend/`: `./mvnw test -Dtest=LlmModelRepositoryTest` after Step 1 — 10 tests, all pass
- [x] From `backend/`: `./mvnw test -Dtest=LlmModelMapperTest` after Step 2 — 15 tests, all pass
- [x] From `backend/`: `./mvnw test -Dtest=LlmModelServiceCrudIntegrationTest` after Steps 3-4 — 24 tests, all pass
- [x] From `backend/`: `./mvnw test -Dtest=LlmModelServiceListQueryIntegrationTest` after Step 5 — 9 tests, all pass
- [x] From `backend/`: `./mvnw test -Dtest=LlmModelControllerTest` after Step 6 — 16 tests, all pass

**Full regression (Step 7):**
- [x] From `backend/`: `./mvnw test` — 503 total tests (baseline 484); 0 failures; 1 pre-existing `authServerApplicationTests.contextLoads` Docker error

### Manual Validation

There are no UI components, visual elements, or interactive behaviors in this task. All validation is automatic.

---

## Related Code Explanations

- `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelService.java` — all 7 `@PreAuthorize` annotations; Step 3 tests verify each one
- `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelEntity.java` — `description` nullable constraint; Step 1 tests verify it
- `backend/src/main/java/com/agentForgeBackend/shared/defaultImplements/DefaultServiceImplements.java:24-30` — class-level `@Transactional(rollbackFor = {...})` covers `toggleEnabled()` via inheritance (confirmed in Finding 4)
- `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java` — `@EnableMethodSecurity` (added in Employee Task 1) activates `@PreAuthorize` processing; required for all service access control tests
- `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeControllerListEndpointTest.java` — prior art for the 4 controller query-validation supplemental tests (Step 6)

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task
- [x] All skills reviewed and selected for this task
- [x] Spring Boot 3.4.1, Spring Security 6.4.x, JUnit 5, AssertJ patterns verified against existing codebase (Tasks 1-3)
- [x] `LlmModelRepositoryTest.java` modified — `entityWithNullDescriptionSavesAndLoadsCorrectly` added (10 total tests)
- [x] `LlmModelMapperTest.java` modified — 3 `isEnabled=false` tests added for `toDTO`, `toSmallDTO`, `toListDTO` (15 total tests)
- [x] `LlmModelServiceCrudIntegrationTest.java` modified — 7 access control tests + `updateDoesNotChangeIsEnabledState` added (24 total tests)
- [x] `LlmModelServiceListQueryIntegrationTest.java` modified — `filterByNameContains` + `filterByIdEquals` added (9 total tests)
- [x] `LlmModelControllerTest.java` modified — combined list + 4 query-validation parity tests + `queryRequest` helper added (16 total tests)
- [x] From `backend/`: `./mvnw test -Dtest=LlmModelRepositoryTest` — 10 tests pass
- [x] From `backend/`: `./mvnw test -Dtest=LlmModelMapperTest` — 15 tests pass
- [x] From `backend/`: `./mvnw test -Dtest=LlmModelServiceCrudIntegrationTest` — 24 tests pass
- [x] From `backend/`: `./mvnw test -Dtest=LlmModelServiceListQueryIntegrationTest` — 9 tests pass
- [x] From `backend/`: `./mvnw test -Dtest=LlmModelControllerTest` — 16 tests pass
- [x] From `backend/`: `./mvnw test` — 503 total tests (baseline was 484, not 465 as originally estimated); 0 failures; only pre-existing `authServerApplicationTests.contextLoads` Docker failure
- [x] Feature parent Steps 4.1–4.6 ready to be marked complete after execution
- [x] Memory bank `progress.md` updated to reflect Task 4 completion
