# Task: Regression and Supplemental Coverage for Conversation

#task #current #low-complexity #parent-conversation-entity-and-employee-crud

**Parent:** [[Conversation-Entity-and-Employee-Crud]]
**Parent Type:** Feature
**Related Step(s):** Phase 4 — Steps 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
**Estimated Complexity:** Low

---

## Goal

Verify that all supplemental test files are passing, fill the remaining query profile edge case gaps (`agentId` IS_NULL filter, `currentModel` field rejection, and explicit `updatedAt` sort acceptance), and confirm the full test suite has no new failures beyond the pre-existing Docker-bound context-load error. Steps 4.1 through 4.4 were completed ahead of schedule during Tasks 2 and 3; this task documents what was pre-done, adds the three missing tests, and runs the final regression gate.

---

## Parent Context

The parent feature defines four tasks. Tasks 1 (security baseline), 2 (domain foundation), and 3 (business rules and CRUD) are complete. Task 4 is the supplemental coverage and regression phase.

Key scope notes from the parent:

- **Step 4.1** (repository edge cases) — pre-done in Task 2: `ConversationRepositoryTest` has 9 tests covering `findByIdAndEmployeeId` ownership isolation, `@PrePersist`/`@PreUpdate` timestamps, FK persistence (null and non-null agent), and the `@OnDelete(SET_NULL)` cascade that resolves the deferred Agent FK constraint. <!-- REVIEW-FIX: corrected count from 8 to 9 — surefire report and @Test count both confirm 9; Task 2 progress.md also records "repository (9 tests)" -->
- **Step 4.2** (mapper contract) — pre-done in Task 2: `ConversationMapperTest` (13 unit tests) covers all DTO variants (`toDTO`, `toSmallDTO`, `toListDTO`, `toEntity`) and null-safety for `agentId`. `ConversationMapperIntegrationTest` (2 tests) verifies that Hibernate LAZY proxy `getId()` calls do not throw `LazyInitializationException` for employee, agent, and model FKs.
- **Step 4.3** (service business rules) — pre-done in Task 3: `ConversationServiceIntegrationTest` (28 tests) covers all ownership, model validation, agent validation, title auto-generation, list scoping, PATCH mutation, and 405 override behaviors.
- **Step 4.4** (controller HTTP contract) — pre-done in Task 3: `ConversationControllerTest` (23 tests) covers all endpoints, status codes, JSON shape, `401`/`403`/`404`/`405`, and cross-employee isolation.
- **Step 4.5** (query profile edge cases) — partially done in Task 3. Three gaps remain: `agentId IS_NULL` filter (for "show only general conversations"), rejection of `currentModel` as a filter field, and explicit `updatedAt` sort acceptance (a `SortRequest` with `field: "updatedAt"` that also verifies ownership scoping is preserved). All three require new tests added to `ConversationServiceIntegrationTest`. <!-- REVIEW-FIX: corrected "Two gaps remain" to "Three" — parent feature Step 4.5 specifies "sort by updatedAt" as an edge case; prior art AgentServiceCrudIntegrationTest.getListPageSortByUpdatedAtDoesNotThrowAndRemainsScoped shows this requires an explicit SortRequest test, not just a default sort test -->
- **Step 4.6** (full regression) — run `./mvnw test` after Step 4.5 tests are added; confirm 0 new failures across all modules and that the only remaining suite blocker is the pre-existing `authServerApplicationTests.contextLoads` Docker dependency.

---

## Preconditions / Dependencies

- Task 3 complete: `ConversationQueryProfile`, `ConversationService`, `ConversationController`, `ConversationServiceIntegrationTest`, `ConversationControllerTest`, and all FK-patch modifications to pre-existing test classes are present.
- `ConversationRepositoryTest`, `ConversationMapperTest`, `ConversationMapperIntegrationTest` exist (from Task 2 domain foundation).
- `./mvnw test -Dtest=ConversationServiceIntegrationTest` passes — 28 tests, 0 failures.
- `./mvnw test -Dtest=ConversationControllerTest` passes — 23 tests, 0 failures.
- `./mvnw test -Dtest=ConversationRepositoryTest` passes — 9 tests, 0 failures.
- `./mvnw test -Dtest=ConversationMapperTest,ConversationMapperIntegrationTest` passes — 15 tests, 0 failures.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — Selected — task template, doc config
- `tdd` — Selected — three new RED-first tests before any implementation change (no implementation changes are needed; the tests should pass immediately given `ConversationQueryProfile` and `ConversationService` are already implemented)

### Documentation Reviewed

- `documentation/Tasks/current/Conversation-Entity-and-Employee-Crud-step-3-business-rules-and-crud.md` — authoritative record of Task 3 work; query profile edge cases section, post-review notes
- `documentation/Features/done/Conversation-Entity-and-Employee-Crud.md` — Step 4.5 definition: filter by `agentId`, sort by `updatedAt` (already tested), rejection of `employee` and `currentModel` as filter fields

### Related Existing Code

- `backend/src/test/java/com/agentForgeBackend/models/conversation/ConversationServiceIntegrationTest.java` — add new tests here (Steps 4.5 gaps)
- `backend/src/main/java/com/agentForgeBackend/models/conversation/ConversationQueryProfile.java` — confirms `currentModel` is absent from the fields map; `agentId` registered with `.nullable()` which adds `IS_NULL`/`IS_NOT_NULL` operators
- `backend/src/test/java/com/agentForgeBackend/models/conversation/ConversationRepositoryTest.java` — pre-done Step 4.1
- `backend/src/test/java/com/agentForgeBackend/models/conversation/ConversationMapperTest.java` — pre-done Step 4.2
- `backend/src/test/java/com/agentForgeBackend/models/conversation/ConversationMapperIntegrationTest.java` — pre-done Step 4.2

---

## Implementation Details

### Approach

All pre-done test files (Steps 4.1–4.4) are already committed. This task adds three tests to `ConversationServiceIntegrationTest` and then runs the full regression. No production code changes are needed — the `ConversationQueryProfile` already registers `agentId` with `.nullable()` (which provides IS_NULL/IS_NOT_NULL for free), already exposes `updatedAt` as sortable, and does not register `currentModel` (which makes it an unknown field, rejected by `QueryPredicateBuilder`).

**IS_NULL agentId filter**: The `.nullable()` call on the `agentId` field registration in `ConversationQueryProfile` adds `IS_NULL` and `IS_NOT_NULL` to the allowed operators for that field. A `FilterRequest` with `operator: IS_NULL` (no `value`) should return only conversations where `agent_id IS NULL`. This is the "show general conversations only" use case described in the parent feature.

**`currentModel` filter rejection**: `currentModel` is intentionally absent from `ConversationQueryProfile.fields()`. The `QueryPredicateBuilder` throws `InvalidQueryRequestException` with the message `"Unknown query field 'currentModel'."` when a filter references a field not in the profile — identical behavior to the `employee` filter rejection tested in Task 3.

### Files to Create/Modify

- [x] `backend/src/test/java/com/agentForgeBackend/models/conversation/ConversationServiceIntegrationTest.java` — add three tests to the query profile edge case section

---

## Step-by-Step Implementation

### Step 1: Verify Pre-Done Tests Pass

**Goal:** Confirm all pre-done supplemental test classes are still green before adding new tests.

**Dependencies:** Task 3 implementation complete.

- [x] From `backend/`: run `./mvnw test -Dtest=ConversationRepositoryTest`
- [x] Confirm 9 tests pass, 0 failures
- [x] From `backend/`: run `./mvnw test -Dtest=ConversationMapperTest,ConversationMapperIntegrationTest`
- [x] Confirm 15 tests pass, 0 failures (13 + 2)
- [x] From `backend/`: run `./mvnw test -Dtest=ConversationServiceIntegrationTest`
- [x] Confirm 28 tests pass, 0 failures
- [x] From `backend/`: run `./mvnw test -Dtest=ConversationControllerTest`
- [x] Confirm tests pass, 0 failures

**Why this step is first:** Verifying the pre-done baseline before adding new tests distinguishes pre-existing failures from failures introduced by this task's additions.

---

### Step 2: Add IS_NULL agentId Filter Test (Phase 4, Step 4.5)

**Goal:** Verify that `agentId IS_NULL` filter returns only general conversations (no agent FK). This exercises the `.nullable()` IS_NULL operator path in `ConversationQueryProfile`.

**Dependencies:** Step 1 passes. `ConversationServiceIntegrationTest` must be open for editing.

- [x] Add `getListPageAgentIdIsNullFilterReturnsGeneralConversationsOnly` test to `ConversationServiceIntegrationTest`

**Why this test matters:** The `.nullable()` registration adds IS_NULL/IS_NOT_NULL operators specifically to support this use case. Without a test, the operator path is untested and could silently break if the query profile is refactored.

#### Implementation

Add the following test to `ConversationServiceIntegrationTest` in the `getListPage` section (after `getListPageAgentIdFilterReturnsAgentConversationsOnly`):

```java
@Test
void getListPageAgentIdIsNullFilterReturnsGeneralConversationsOnly() throws Exception {
    // General conversation — agent_id IS NULL
    conversationService.insert(new ConversationForm("General Chat", enabledModel.getId(), null));
    // Agent conversation — agent_id IS NOT NULL
    conversationService.insert(new ConversationForm("Agent Chat", enabledModel.getId(), ownerAgent.getId()));

    PageableRequest request = new PageableRequest();
    request.setFilters(List.of(FilterRequest.builder()
            .field("agentId")
            .operations(List.of(FilterOperationRequest.builder()
                    .operator(FilterOperator.IS_NULL)
                    .build()))
            .build()));

    var page = conversationService.getListPage(request);

    assertThat(page.getTotalElements()).isEqualTo(1);
    assertThat(page.getContent().get(0).getTitle()).isEqualTo("General Chat");
    assertThat(page.getContent().get(0).getAgentId()).isNull();
}
```

#### Edge Cases

1. **`FilterOperator.IS_NULL` has no `value`**: the `FilterOperationRequest` builder omits `.value()`. `QueryPredicateBuilder` must handle this without NPE — the `.nullable()` registration is what enables this operator and provides the null-safe predicate path.
2. **`ownerAgent` is available from `setUp()`**: the `@BeforeEach` in `ConversationServiceIntegrationTest` already seeds `ownerAgent` for the test class — no additional seeding needed.

---

### Step 3: Add currentModel Filter Rejection Test (Phase 4, Step 4.5)

**Goal:** Verify that using `currentModel` as a filter field throws `InvalidQueryRequestException`. `currentModel` is intentionally excluded from `ConversationQueryProfile` because it is not a useful employee-facing query dimension.

**Dependencies:** Step 1 passes.

- [x] Add `getListPageRejectsCurrentModelFilterField` test to `ConversationServiceIntegrationTest`

**Why this test matters:** The parent feature explicitly calls out both `employee` and `currentModel` as intentionally excluded filter fields. Task 3 tests `employee` rejection; this test completes the pair and documents the intentional exclusion.

#### Implementation

Add the following test to `ConversationServiceIntegrationTest` in the `getListPage` section (after `getListPageRejectsAgentIdSortField`):

```java
@Test
void getListPageRejectsCurrentModelFilterField() {
    PageableRequest request = new PageableRequest();
    request.setFilters(List.of(FilterRequest.builder()
            .field("currentModel")
            .operations(List.of(FilterOperationRequest.builder()
                    .operator(FilterOperator.EQUALS)
                    .value(enabledModel.getId())
                    .build()))
            .build()));

    assertThatThrownBy(() -> conversationService.getListPage(request))
            .isInstanceOf(com.agentForgeBackend.exceptions.InvalidQueryRequestException.class)
            .hasMessage("Unknown query field 'currentModel'.");
}
```

#### Edge Cases

1. **`enabledModel.getId()` is available from `setUp()`**: seeded by the `@BeforeEach` — no additional setup needed.
2. **Exception message exact match**: the message `"Unknown query field 'currentModel'."` must match what `QueryPredicateBuilder` produces for unknown fields. Verify against the `employee` rejection test in the same file — both should produce the same message pattern.

---

### Step 3.5: Add updatedAt Sort Acceptance Test (Phase 4, Step 4.5 — gap)

<!-- REVIEW-FIX: Added missing step — parent feature Step 4.5 specifies "sort by updatedAt" as a query profile edge case. Prior art: AgentServiceCrudIntegrationTest.getListPageSortByUpdatedAtDoesNotThrowAndRemainsScoped. Default sort test (getListPageDefaultSortIsUpdatedAtDesc) does not exercise an explicit SortRequest and would not catch accidental removal of the updatedAt sortable registration from ConversationQueryProfile. -->

**Goal:** Verify that an explicit `SortRequest` with `field: "updatedAt"` is accepted by `ConversationQueryProfile` and that the list remains ownership-scoped. This exercises the `.sortable("updatedAt")` registration path and mirrors the prior art test in `AgentServiceCrudIntegrationTest`.

**Dependencies:** Step 1 passes.

- [x] Add `getListPageSortByUpdatedAtDoesNotThrowAndRemainsScoped` test to `ConversationServiceIntegrationTest`

**Why this test matters:** The `.sortable("updatedAt")` call in `ConversationQueryProfile` is what enables explicit client-supplied `updatedAt` sorts. Without a test that submits an explicit `SortRequest`, removing the `.sortable()` registration during a future refactor would be silently undetected. The default sort test (`getListPageDefaultSortIsUpdatedAtDesc`) does not cover this path — it only tests the fallback when no sort is provided.

#### Implementation

Add the following test to `ConversationServiceIntegrationTest` in the `getListPage` section (after `getListPageRejectsCurrentModelFilterField`):

```java
@Test
void getListPageSortByUpdatedAtDoesNotThrowAndRemainsScoped() throws Exception {
    conversationService.insert(new ConversationForm("First Chat", enabledModel.getId(), null));
    conversationService.insert(new ConversationForm("Second Chat", enabledModel.getId(), null));

    // Other employee's conversation — must not appear even when explicit sort is applied
    ConversationEntity other = new ConversationEntity();
    other.setTitle("Other's Chat");
    other.setEmployee(otherEmployee);
    other.setCurrentModel(enabledModel);
    conversationRepository.saveAndFlush(other);

    PageableRequest request = new PageableRequest();
    request.setSort(List.of(SortRequest.builder()
            .field("updatedAt")
            .direction(SortDirection.DESC)
            .build()));

    var page = conversationService.getListPage(request);

    assertThat(page.getTotalElements()).isEqualTo(2);
    assertThat(page.getContent()).extracting(ConversationListDTO::getTitle)
            .containsOnly("First Chat", "Second Chat");
}
```

#### Edge Cases

1. **Ownership scope preserved under explicit sort**: The ownership predicate must still be ANDed even when a custom sort is provided. The test verifies this by inserting a third conversation owned by `otherEmployee` and asserting `totalElements = 2`.
2. **`SortDirection` import**: `SortDirection` is already imported in `ConversationServiceIntegrationTest` (used by `getListPageRejectsAgentIdSortField`).

---

### Step 4: Run Query Profile Tests → GREEN

**Goal:** All three new tests pass alongside the existing 28 service tests.

**Dependencies:** Steps 2, 3, and 3.5 complete.

- [x] From `backend/`: run `./mvnw test -Dtest=ConversationServiceIntegrationTest`
- [x] Confirm **31 tests pass**, 0 failures (28 existing + 3 new)

---

### Step 5: Full Regression Run (Phase 4, Step 4.6)

**Goal:** Confirm all tests across all modules pass. No regressions from Tasks 1–4.

**Dependencies:** Steps 1–4 complete.

- [x] From `backend/`: run `./mvnw test`
- [x] Confirm `ConversationRepositoryTest` — **9 tests**, 0 failures
- [x] Confirm `ConversationMapperTest` — **13 tests**, 0 failures
- [x] Confirm `ConversationMapperIntegrationTest` — **2 tests**, 0 failures
- [x] Confirm `ConversationServiceIntegrationTest` — **31 tests**, 0 failures
- [x] Confirm `ConversationControllerTest` — **23 tests**, 0 failures
- [x] Confirm `SecurityAuthorizationTest` — **12 tests**, 0 failures (employee conversation endpoint now asserts `isOk()`)
- [x] Confirm all pre-existing test classes pass — 0 new failures vs Task 2 baseline
- [x] Note: the `authServerApplicationTests.contextLoads` Docker failure is pre-existing and not caused by this feature (`./mvnw test` summary: **873 tests**, **0 failures**, **1 error** in this known context-load test)

**Why this step is the completion gate:** The full suite run is the only way to confirm that the FK-safe delete patches added in Task 3 (to `LlmModelServiceCrudIntegrationTest`, `AppSettingsControllerTest`, `EmployeeServiceCrudIntegrationTest`, etc.) do not introduce regressions in those pre-existing test classes.

---

## Design Decisions

**Decision 1: New tests added to `ConversationServiceIntegrationTest` (not a new `ConversationQueryProfileTest` class)**
- **Why:** All existing query profile behavior tests in this codebase are exercised through the service layer (`ConversationServiceIntegrationTest`, `AgentServiceCrudIntegrationTest`). A standalone `ConversationQueryProfileTest` would need a custom Spring context to exercise the predicate builder — more setup than the value of the isolation. Consistency with the existing pattern outweighs the isolation benefit for 3 small tests.
- **Alternatives considered:** Separate `ConversationQueryProfileTest` class with `@SpringBootTest`. Rejected — adds a new test class for 3 tests that fit naturally in the existing service test class.

**Decision 2: IS_NULL test uses `FilterOperator.IS_NULL` without `.value()`**
- **Why:** `IS_NULL` is a unary operator — there is no target value. The `.nullable()` registration in `ConversationQueryProfile` is what enables this operator. If a `value` were provided, `QueryPredicateBuilder` should ignore it (or may throw — behavior is consistent with other nullable fields in the codebase). The test omits `.value()` to match the realistic API usage.
- **Alternatives considered:** Passing `.value(null)` explicitly. Not necessary and may trigger different validation paths in `FilterOperationRequest`.

---

## Testing Considerations

### Automatic Validation

- [x] `./mvnw test -Dtest=ConversationRepositoryTest` — **9 tests pass** (Step 1 baseline)
- [x] `./mvnw test -Dtest=ConversationMapperTest,ConversationMapperIntegrationTest` — **15 tests pass** (Step 1 baseline)
- [x] `./mvnw test -Dtest=ConversationServiceIntegrationTest` — **28 tests pass** before new tests (Step 1 baseline), **31 tests pass** after (Step 4)
- [x] `./mvnw test -Dtest=ConversationControllerTest` — **23 tests pass** (Step 1 baseline)
- [x] `./mvnw test` full suite — **873 tests**, **0 failures**, **1 pre-existing error** (`authServerApplicationTests.contextLoads`) (Step 5)

### Manual Validation

No manual testing is required for this task. All validation is automated.

---

## Related Code Explanations

- `backend/src/main/java/com/agentForgeBackend/models/conversation/ConversationQueryProfile.java` — `agentId` field registered with `.nullable()` (provides IS_NULL/IS_NOT_NULL); `currentModel` intentionally absent
- `backend/src/test/java/com/agentForgeBackend/models/agent/AgentServiceCrudIntegrationTest.java` — prior art for query profile edge case tests through the service layer

---

## Completion Criteria

- [x] Step 1: All pre-done test classes pass at their expected counts (9 + 15 + 28 + 23 tests)
- [x] Step 2: `getListPageAgentIdIsNullFilterReturnsGeneralConversationsOnly` added to `ConversationServiceIntegrationTest`
- [x] Step 3: `getListPageRejectsCurrentModelFilterField` added to `ConversationServiceIntegrationTest`
- [x] Step 3.5: `getListPageSortByUpdatedAtDoesNotThrowAndRemainsScoped` added to `ConversationServiceIntegrationTest` <!-- REVIEW-FIX: added missing criterion for the explicit updatedAt sort acceptance test -->
- [x] Step 4: `./mvnw test -Dtest=ConversationServiceIntegrationTest` — **31 tests**, 0 failures
- [x] Step 5: `./mvnw test` full suite — **873 tests**, **0 failures**, **1 pre-existing Docker error** (`authServerApplicationTests.contextLoads`)
- [x] Parent feature steps 4.1–4.6 can be marked complete
- [x] Feature document moved from `Features/to-do/` to `Features/done/` once all four tasks are complete
