# Task: Business Rules, CRUD, and Toggle for LlmModel

#task #current #high-complexity #parent-llm-model-entity-and-admin-crud

**Parent:** [[Llm-Model-Entity-and-Admin-Crud]]
**Parent Type:** Feature
**Related Step(s):** Phase 3 — Steps 3.1, 3.2, 3.3, 3.4
**Estimated Complexity:** High

---

## Goal

Wire the complete LlmModel operational stack: `LlmModelQueryProfile` (dynamic filtering/sorting), `LlmModelService` (admin-only CRUD with blocked delete and `toggleEnabled`), and `LlmModelController` (all inherited CRUD endpoints plus `PATCH /{id}/toggle`). After this task, the admin REST API for LlmModel is fully functional end-to-end.

---

## Parent Context

The feature defines four tasks. Tasks 1 and 2 are complete:
- Task 1 added the `/llm-model/**` → `hasRole("ADMIN")` HTTP security rule and 3 security tests. The `SecurityAuthorizationTest.adminRequestToLlmModelEndpointPassesSecurity` test currently asserts `isNotFound()` because no controller existed yet — this task must update that assertion to `isOk()` once the controller is created.
- Task 2 created `LlmModelEntity`, `LlmModelForm`, 3 DTOs, `LlmModelMapper`, `LlmModelRepository`, and generated `QLlmModelEntity`. 9 repository tests + 12 mapper tests pass. Full suite: 397 tests, 0 failures, 1 pre-existing Docker error.

This task (Task 3) builds the operational layer on top of that foundation, following these parent constraints:

- **Query profile fields:** `id` (number, sortable), `modelId` (string, sortable), `name` (string, sortable), `isEnabled` (boolean, sortable), `createdAt` (dateTime, sortable). `description` is explicitly excluded — free-text search is out of scope for MVP.
- **Default sort:** `id ASC`.
- **Service `@PreAuthorize`:** all overridden public methods carry `@PreAuthorize("hasRole('ADMIN')")`, following the `EmployeeService` pattern (not just `insert()`/`getOne()` as in `AdminServiceImpl`).
- **Blocked delete:** `delete()` always throws `InvalidDeleteOperation("LLM models cannot be deleted. Use toggle to disable.")` — no entity lookup, no deletion.
- **`toggleEnabled()`:** loads entity by ID, inverts `isEnabled`, saves, returns `LlmModelDTO`. Transaction coverage comes from `DefaultServiceImplements`' class-level `@Transactional` — no method-level annotation needed.
- **Controller injection pattern:** the two-field constructor — `super(service)` for `DefaultController` + a typed `llmModelService` field — provides type-safe access to `toggleEnabled()` without casting `defaultService`.
- **`update()` duplicate modelId:** the `DefaultService.update()` interface declares `throws ItemNotFoundException, InvalidInsertDetails` (no `ItemAlreadyExist`). Per Java's override rules, `LlmModelService.update()` cannot add a new checked exception. When `modelId` changes to a taken value, throw `InvalidInsertDetails` (consistent with `EmployeeService.update()` for duplicate username/email conflicts).
- **`insert()` duplicate modelId:** `DefaultService.insert()` declares `throws ItemAlreadyExist`, so `LlmModelService.insert()` correctly throws `ItemAlreadyExist` for duplicate modelId.

---

## Preconditions / Dependencies

- Task 1 complete: `/llm-model/**` → `hasRole("ADMIN")` in `SecurityConfig`; 3 `@WithMockUser` tests in `SecurityAuthorizationTest` (including `adminRequestToLlmModelEndpointPassesSecurity` asserting `isNotFound()`).
- Task 2 complete: `LlmModelEntity`, `LlmModelForm`, `LlmModelDTO`, `LlmModelMiniDTO`, `LlmModelListDTO`, `LlmModelMapper`, `LlmModelRepository`, 9 repository tests, 12 mapper tests all passing. `QLlmModelEntity` generated at `target/generated-sources/annotations/com/agentForgeBackend/models/llm/QLlmModelEntity.java`.
- Full test suite: 397 tests, 0 failures, 1 pre-existing `authServerApplicationTests.contextLoads` Docker error.
- Spring Boot 3.4.1, QueryDSL JPA 6.12 (openfeign fork), Lombok, H2 test profile — confirmed in `backend/pom.xml`.
- `DefaultServiceImplements`, `DefaultController`, `EntityQueryProfile`, `PageableFactory<ENTITY>` (generic singleton `@Component`), `QueryPredicateBuilder<ENTITY>` (generic singleton `@Component`) — all in place.
- `EmployeeService`, `EmployeeQueryProfile`, `EmployeeController` — prior art for all patterns used here.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — Selected — task template and document creation conventions
- `solid-deep-design` — Selected — SOLID + depth analysis for query profile, service, and controller
- `tdd` — Selected — vertical TDD: one failing test → minimal implementation → iterate, for each new module
- `memory-bank` — Selected — architecture, known-issues, and prior task context fully loaded
- `glossary-management` — Not needed — all domain terms (LlmModel, modelId, isEnabled, toggle) established in Task 2 and parent feature; no new terms introduced
- `find-docs` — Not needed — all Spring Boot 3.4.1, Spring Security, Spring Data JPA, and QueryDSL patterns verified against existing production code (`EmployeeService`, `EmployeeQueryProfile`, `EmployeeController`, `AdminQueryProfile`)

### Documentation Reviewed

- [[Tasks/current/Llm-Model-Entity-and-Admin-Crud-step-1-security-baseline]] — Task 1 state: security rule live; `adminRequestToLlmModelEndpointPassesSecurity` test currently asserts `isNotFound()` → must be updated to `isOk()` in this task
- [[Tasks/current/Llm-Model-Entity-and-Admin-Crud-step-2-domain-foundation]] — Task 2 state: all domain foundation files, post-review deviations (Q-class path, test count)
- [[ADRs/ADR-007-admin-curated-llm-model-list]] — `isEnabled` toggle as sole enablement mechanism; employees never access LlmModel endpoints
- [[Bugs/to-do/Review-of-Llm-Model-Entity-and-Admin-Crud]] — Finding 2 (controller injection pattern), Finding 4 (toggleEnabled transaction), Finding 1 (isEnabled authority in mapper)

### Related Existing Code

- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeService.java` — primary prior art: override pattern, `@PreAuthorize`, `isBlank()` helper, `@Transactional` inheritance, `update()` duplicate check with `InvalidInsertDetails`
- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeQueryProfile.java` — primary prior art: `@Component`, static `Q`-class instance, `Map.of()` field declarations, default sort
- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeController.java` — primary prior art: `@RestController`, `@RequestMapping`, constructor calling `super(service)`
- `backend/src/main/java/com/agentForgeBackend/models/hq/admin/AdminQueryProfile.java` — `dateTime` field declaration pattern with `Date.class`; LlmModel uses `LocalDateTime.class` for `createdAt`
- `backend/src/main/java/com/agentForgeBackend/shared/defaultImplements/DefaultServiceImplements.java:82-94` — `update()` is a known no-op base; LlmModel must override it completely (never call `super.update()`)
- `backend/src/main/java/com/agentForgeBackend/shared/defaultImplements/DefaultController.java` — inherited endpoints: `GET /{id}`, `GET /`, `POST /list`, `POST /`, `PUT /{id}`, `DELETE /{id}`
- `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeServiceCrudIntegrationTest.java` — prior art: `@SpringBootTest` + `@WithMockUser` + `@BeforeEach deleteAll()`
- `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeServiceListQueryIntegrationTest.java` — prior art: service-layer list query tests
- `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeControllerListEndpointTest.java` — prior art: `@SpringBootTest` + `@AutoConfigureMockMvc` + MockMvc + `@WithMockUser`
- `backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java` — `adminRequestToLlmModelEndpointPassesSecurity` test to update from `isNotFound()` to `isOk()`

---

## Implementation Details

### Approach

This task applies **vertical TDD slices**: for each module, write one failing test, implement the minimal code that makes it pass, then add the next test. The TDD order is:

1. **QueryProfile → Service (list path):** Write the first service list test → fails (no service/profile) → create `LlmModelQueryProfile` + minimal service constructor + `getListPage()` → test passes.
2. **Service (CRUD + toggle):** Add service CRUD tests one by one → implement each method to pass.
3. **Controller:** Write controller tests → create `LlmModelController` → tests pass.
4. **Security test update:** Update `SecurityAuthorizationTest.adminRequestToLlmModelEndpointPassesSecurity` from `isNotFound()` to `isOk()`.
5. **Full regression:** `./mvnw test` — confirm all tests pass.

**SOLID + Depth Analysis:**

- **`LlmModelQueryProfile`** — SRP: one reason to change (the set of filterable/sortable LlmModel fields changes). Deep relative to callers: `EntityQueryProfile`'s 2-method interface hides the entire field metadata map, operator sets, and sort definitions. The `PageableFactory` and `QueryPredicateBuilder` consume it; they never need to know which specific fields exist.
- **`LlmModelService`** — SRP: one reason to change (LlmModel business rules change). Deep: the `DefaultService` 6-method interface hides uniqueness enforcement, blocked delete semantics, `toggleEnabled` state machine, admin-only authorization, and transaction rollback configuration. Deletion test: if deleted, all 6 callers (controller) must re-implement all business rules inline — complexity scatters. The module is deep and earns its keep.
- **`LlmModelController`** — SRP: HTTP routing and request/response translation for LlmModel. Shallow by design: it delegates all business logic to `LlmModelService`. This is correct — controllers should be thin.

**Seam analysis:**

- `DefaultController` is the seam between HTTP and service. `DefaultService` is the seam between controller and business logic. `DefaultRepository` is the seam between service and JPA. All seams have at least two adapters (Admin + Employee + LlmModel → three adapters), satisfying the "two adapters = real seam" criterion.

**`DefaultServiceImplements.update()` known no-op:**

The base `update()` loads the entity by ID but saves it without applying form data — a known incomplete implementation (documented in `known-issues.md`). `LlmModelService.update()` must override it completely. Never call `super.update()`.

**`createdAt` sorting in tests:**

`LlmModelEntity.@PrePersist` always sets `createdAt = LocalDateTime.now()`. Entities saved in rapid succession during `@BeforeEach` have nearly identical timestamps, making sort-order assertion on `createdAt` unreliable. Tests that verify `createdAt` sort behavior confirm the field is accepted by the query profile (no `InvalidQueryRequestException`) and returns the correct count — they do not assert a specific order. Order correctness for the `createdAt` field is proven by the existing `PageableFactory` coverage through Admin and Employee service tests.

### Files to Create/Modify

- [x] `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelQueryProfile.java` — **CREATE** — filterable/sortable field declarations, default sort (Step 3.1)
- [x] `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelService.java` — **CREATE** — admin-only CRUD, blocked delete, `toggleEnabled` (Step 3.2)
- [x] `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelController.java` — **CREATE** — `@RequestMapping("/llm-model")`, two-field constructor, `PATCH /{id}/toggle` (Step 3.3)
- [x] `backend/src/test/java/com/agentForgeBackend/models/llm/LlmModelServiceCrudIntegrationTest.java` — **CREATE** — TDD service CRUD + toggle tests (Steps 3.2, 3.4)
- [x] `backend/src/test/java/com/agentForgeBackend/models/llm/LlmModelServiceListQueryIntegrationTest.java` — **CREATE** — TDD service list/filter/sort tests (Steps 3.1, 3.4)
- [x] `backend/src/test/java/com/agentForgeBackend/models/llm/LlmModelControllerTest.java` — **CREATE** — TDD controller HTTP contract tests (Steps 3.3, 3.4)
- [x] `backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java` — **MODIFY** — update `adminRequestToLlmModelEndpointPassesSecurity` assertion from `isNotFound()` to `isOk()` (Step 3.3)

---

## Step-by-Step Implementation

### Step 1: Create `LlmModelQueryProfile` + First Service Test (TDD RED → GREEN)

**Goal:** Write the first failing service list test, then create `LlmModelQueryProfile` and the minimal service to make it pass. This proves the QueryDSL integration works end-to-end before adding CRUD behavior.

**Dependencies:** `QLlmModelEntity` exists at `target/generated-sources/annotations/`. `LlmModelRepository`, `LlmModelMapper` exist.

- [x] Create `LlmModelServiceListQueryIntegrationTest.java` with skeleton + first test `defaultRequestReturnsAllModels`
- [x] Run `./mvnw test -Dtest=LlmModelServiceListQueryIntegrationTest` from `backend/` — **expect compile failure** (no service/query profile yet)
- [x] Create `LlmModelQueryProfile.java` with all 5 fields and default sort
- [x] Create `LlmModelService.java` — constructor + override `getListPage()` (minimal; no other methods yet)
- [x] Run `./mvnw test -Dtest=LlmModelServiceListQueryIntegrationTest` from `backend/` — **expect `defaultRequestReturnsAllModels` to pass**

**Why this step is critical:** The `LlmModelQueryProfile` references `QLlmModelEntity.llmModelEntity` — the generated Q-class. If the Q-class is stale or the field names don't match, the compile fails here and not later in harder-to-diagnose test failures. The first passing test proves the QueryDSL wiring is complete.

#### Implementation

**`LlmModelQueryProfile.java`:**
```java
package com.agentForgeBackend.models.llm;

import com.agentForgeBackend.shared.query.EntityQueryProfile;
import com.agentForgeBackend.shared.query.QueryableField;
import com.agentForgeBackend.shared.query.SortDirection;
import com.agentForgeBackend.shared.query.SortRequest;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Component
public class LlmModelQueryProfile implements EntityQueryProfile<LlmModelEntity> {

    private static final QLlmModelEntity LLM = QLlmModelEntity.llmModelEntity;

    private static final Map<String, QueryableField<LlmModelEntity, ?>> FIELDS = Map.of(
            "id",        QueryableField.<LlmModelEntity, Long>number("id", LLM.id, Long.class).sortable("id"),
            "modelId",   QueryableField.<LlmModelEntity>string("modelId", LLM.modelId).sortable("modelId"),
            "name",      QueryableField.<LlmModelEntity>string("name", LLM.name).sortable("name"),
            "isEnabled", QueryableField.<LlmModelEntity>booleanField("isEnabled", LLM.isEnabled).sortable("isEnabled"),
            "createdAt", QueryableField.<LlmModelEntity, LocalDateTime>dateTime("createdAt", LLM.createdAt, LocalDateTime.class).sortable("createdAt")
    );

    private static final List<SortRequest> DEFAULT_SORT = List.of(
            SortRequest.builder().field("id").direction(SortDirection.ASC).build()
    );

    @Override
    public Map<String, QueryableField<LlmModelEntity, ?>> fields() {
        return FIELDS;
    }

    @Override
    public List<SortRequest> defaultSort() {
        return DEFAULT_SORT;
    }
}
```

**`LlmModelService.java` (minimal — only what's needed for Step 1):**
```java
package com.agentForgeBackend.models.llm;

import com.agentForgeBackend.exceptions.*;
import com.agentForgeBackend.shared.defaultImplements.DefaultServiceImplements;
import com.agentForgeBackend.shared.query.*;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.stream.Collectors;

@Service
public class LlmModelService extends DefaultServiceImplements<LlmModelDTO, LlmModelMiniDTO, LlmModelListDTO, LlmModelForm, LlmModelEntity, Long> {

    private final LlmModelRepository llmModelRepository;

    public LlmModelService(
            LlmModelRepository repository,
            LlmModelMapper mapper,
            LlmModelQueryProfile queryProfile,
            PageableFactory<LlmModelEntity> pageableFactory,
            QueryPredicateBuilder<LlmModelEntity> queryPredicateBuilder
    ) {
        super(repository, mapper, queryProfile, pageableFactory, queryPredicateBuilder);
        this.llmModelRepository = repository;
    }

    @Override
    @PreAuthorize("hasRole('ADMIN')")
    public Page<LlmModelListDTO> getListPage(PageableRequest request) throws InvalidQueryRequestException {
        return super.getListPage(request);
    }
}
```

**`LlmModelServiceListQueryIntegrationTest.java` (skeleton — first test only):**
```java
package com.agentForgeBackend.models.llm;

import com.agentForgeBackend.exceptions.InvalidQueryRequestException;
import com.agentForgeBackend.shared.query.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@WithMockUser(username = "task3-llm-list", roles = "ADMIN")
class LlmModelServiceListQueryIntegrationTest {

    @Autowired
    private LlmModelService llmModelService;

    @Autowired
    private LlmModelRepository llmModelRepository;

    private LlmModelEntity alpha;
    private LlmModelEntity beta;
    private LlmModelEntity gamma;

    @BeforeEach
    void setUp() {
        llmModelRepository.deleteAll();
        llmModelRepository.flush();

        alpha = llmModelRepository.save(model("provider-a/model-1", "Model Alpha", true));
        beta  = llmModelRepository.save(model("provider-b/model-2", "Model Beta",  false));
        gamma = llmModelRepository.save(model("provider-c/model-3", "Model Gamma", true));
        llmModelRepository.flush();
    }

    @Test
    void defaultRequestReturnsAllModels() throws InvalidQueryRequestException {
        Page<LlmModelListDTO> page = llmModelService.getListPage(new PageableRequest());

        assertThat(page.getTotalElements()).isEqualTo(3);
        assertThat(page.getNumber()).isZero();
        assertThat(page.getSize()).isEqualTo(20);
        assertThat(page.getContent())
                .extracting(LlmModelListDTO::getId)
                .containsExactly(alpha.getId(), beta.getId(), gamma.getId());
    }

    private LlmModelEntity model(String modelId, String name, boolean enabled) {
        LlmModelEntity e = new LlmModelEntity();
        e.setModelId(modelId);
        e.setName(name);
        e.setIsEnabled(enabled);
        return e;
    }
}
```

#### Edge Cases

1. **`Map.of()` with 5 entries** — `Map.of()` supports up to 10 key-value pairs in Java 9+. 5 entries is within range. No `Map.ofEntries()` needed.
2. **`LlmModelQueryProfile` vs `QLlmModelEntity` field names** — `QLlmModelEntity` field names must match the entity field names. The Q-class has: `createdAt`, `description`, `id`, `isEnabled`, `modelId`, `name`. All 5 query profile fields map exactly. `description` is intentionally absent from the query profile map.
3. **`LocalDateTime` in `dateTime` factory** — `AdminQueryProfile` uses `Date.class` for its `dateTime` fields because `BaseUserEntity.dateCreated` is `java.util.Date`. `LlmModelEntity.createdAt` is `java.time.LocalDateTime`. The `QueryableField.dateTime()` factory accepts `DateTimeExpression<VALUE>` where `QLlmModelEntity.createdAt` is `DateTimePath<LocalDateTime>` — a subtype. Using `LocalDateTime.class` is correct.
4. **`PageableFactory<LlmModelEntity>` injection** — `PageableFactory<ENTITY>` is a `@Component` singleton. Due to type erasure, Spring registers it as a single `PageableFactory` bean and injects it for all type parameters. This is the same mechanism used by `EmployeeService`, `AdminServiceImpl`, and others — no additional configuration needed.

---

### Step 2: Complete `LlmModelService` with TDD

**Goal:** Implement all remaining service methods (`getOne`, `getAll`, `insert`, `update`, `delete`, `toggleEnabled`) using TDD. Write one test, implement minimally, repeat.

**Dependencies:** Step 1 complete — `LlmModelService` skeleton compiles. `LlmModelRepository` provides `findById`, `existsByModelId`, `findAll`, `save`.

- [x] Create `LlmModelServiceCrudIntegrationTest.java` with first test `insertCreatesModelWithIsEnabledTrueAndReturnsMiniDTO`
- [x] Run `./mvnw test -Dtest=LlmModelServiceCrudIntegrationTest` — **expect fail** (no `insert()` override yet; base insert does not enforce uniqueness)
- [x] Add `insert()` override to `LlmModelService` — run → pass
- [x] Add `insertThrowsInvalidInsertDetailsForBlankModelId` → run → implement validation in `insert()` → pass
- [x] Add `insertThrowsInvalidInsertDetailsForNullName` → run → pass
- [x] Add `insertThrowsItemAlreadyExistForDuplicateModelId` → run → implement `existsByModelId` check in `insert()` → pass
- [x] Add `deleteAlwaysThrowsInvalidDeleteOperation` → run → implement `delete()` override → pass
- [x] Add `deleteThrowsInvalidDeleteOperationEvenForNonExistentId` → run → pass
- [x] Add `getOneReturnsCorrectModel` → run → implement `getOne()` override → pass
- [x] Add `getOneThrowsItemNotFoundForNonExistentId` → run → pass (same implementation)
- [x] Add `updateAppliesFieldChanges` → run → implement `update()` override completely → pass
- [x] Add `updateWithUnchangedModelIdSkipsUniquenessCheck` → run → pass
- [x] Add `updateThrowsInvalidInsertDetailsWhenModelIdChangesToExisting` → run → implement uniqueness check in `update()` → pass
- [x] Add `updateThrowsItemNotFoundForNonExistentId` → run → pass
- [x] Add `toggleEnabledFlipsEnabledToDisabled` → run → implement `toggleEnabled()` → pass
- [x] Add `toggleEnabledFlipsDisabledToEnabled` → run → pass
- [x] Add `toggleEnabledThrowsItemNotFoundForNonExistentId` → run → pass
- [x] Add `getAllReturnsAllModels` → run → implement `getAll()` override → pass
- [x] Run `./mvnw test -Dtest=LlmModelServiceCrudIntegrationTest` — confirm all 16 tests pass

**Why this step is critical:** `update()` base implementation is a known no-op — the override must be complete. `toggleEnabled()` is the only business-critical method exclusive to this domain. The TDD order ensures the uniqueness logic is driven by failing tests, not optimistic implementation.

#### Implementation

**Complete `LlmModelService.java`:**
```java
package com.agentForgeBackend.models.llm;

import com.agentForgeBackend.exceptions.*;
import com.agentForgeBackend.shared.defaultImplements.DefaultServiceImplements;
import com.agentForgeBackend.shared.query.*;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.stream.Collectors;

@Service
public class LlmModelService extends DefaultServiceImplements<LlmModelDTO, LlmModelMiniDTO, LlmModelListDTO, LlmModelForm, LlmModelEntity, Long> {

    private final LlmModelRepository llmModelRepository;

    public LlmModelService(
            LlmModelRepository repository,
            LlmModelMapper mapper,
            LlmModelQueryProfile queryProfile,
            PageableFactory<LlmModelEntity> pageableFactory,
            QueryPredicateBuilder<LlmModelEntity> queryPredicateBuilder
    ) {
        super(repository, mapper, queryProfile, pageableFactory, queryPredicateBuilder);
        this.llmModelRepository = repository;
    }

    @Override
    @PreAuthorize("hasRole('ADMIN')")
    public LlmModelDTO getOne(Long id) throws ItemNotFoundException {
        return llmModelRepository.findById(id)
                .map(mapper::toDTO)
                .orElseThrow(() -> new ItemNotFoundException("LLM model not found"));
    }

    @Override
    @PreAuthorize("hasRole('ADMIN')")
    public Collection<LlmModelDTO> getAll() {
        return llmModelRepository.findAll()
                .stream()
                .map(mapper::toDTO)
                .collect(Collectors.toSet());
    }

    @Override
    @PreAuthorize("hasRole('ADMIN')")
    public Page<LlmModelListDTO> getListPage(PageableRequest request) throws InvalidQueryRequestException {
        return super.getListPage(request);
    }

    @Override
    @PreAuthorize("hasRole('ADMIN')")
    public LlmModelMiniDTO insert(LlmModelForm form) throws ItemNotFoundException, ItemAlreadyExist, InvalidInsertDetails {
        if (form == null || isBlank(form.getModelId()) || isBlank(form.getName())) {
            throw new InvalidInsertDetails("LLM model requires a modelId and a name");
        }
        if (llmModelRepository.existsByModelId(form.getModelId())) {
            throw new ItemAlreadyExist("A model with modelId '" + form.getModelId() + "' already exists");
        }
        return mapper.toSmallDTO(llmModelRepository.save(mapper.toEntity(form)));
    }

    @Override
    @PreAuthorize("hasRole('ADMIN')")
    public LlmModelDTO update(Long id, LlmModelForm form) throws ItemNotFoundException, InvalidInsertDetails {
        if (form == null) {
            throw new InvalidInsertDetails("LlmModelForm is null");
        }
        LlmModelEntity toUpdate = llmModelRepository.findById(id)
                .orElseThrow(() -> new ItemNotFoundException("LLM model not found"));

        if (!isBlank(form.getModelId()) && !form.getModelId().equals(toUpdate.getModelId())) {
            if (llmModelRepository.existsByModelId(form.getModelId())) {
                throw new InvalidInsertDetails("A model with modelId '" + form.getModelId() + "' already exists");
            }
            toUpdate.setModelId(form.getModelId());
        }
        if (!isBlank(form.getName())) {
            toUpdate.setName(form.getName());
        }
        if (form.getDescription() != null) {
            toUpdate.setDescription(form.getDescription());
        }

        return mapper.toDTO(llmModelRepository.save(toUpdate));
    }

    @Override
    @PreAuthorize("hasRole('ADMIN')")
    public LlmModelDTO delete(Long id) throws ItemNotFoundException, InvalidDeleteOperation {
        throw new InvalidDeleteOperation("LLM models cannot be deleted. Use toggle to disable.");
    }

    @PreAuthorize("hasRole('ADMIN')")
    public LlmModelDTO toggleEnabled(Long id) throws ItemNotFoundException {
        LlmModelEntity entity = llmModelRepository.findById(id)
                .orElseThrow(() -> new ItemNotFoundException("LLM model not found"));
        entity.setIsEnabled(!entity.getIsEnabled());
        return mapper.toDTO(llmModelRepository.save(entity));
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
```

**`LlmModelServiceCrudIntegrationTest.java`:**
```java
package com.agentForgeBackend.models.llm;

import com.agentForgeBackend.exceptions.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@WithMockUser(username = "task3-llm-crud", roles = "ADMIN")
class LlmModelServiceCrudIntegrationTest {

    @Autowired
    private LlmModelService llmModelService;

    @Autowired
    private LlmModelRepository llmModelRepository;

    @BeforeEach
    void setUp() {
        llmModelRepository.deleteAll();
        llmModelRepository.flush();
    }

    // --- insert() ---

    @Test
    void insertCreatesModelWithIsEnabledTrueAndReturnsMiniDTO() throws Exception {
        LlmModelForm form = new LlmModelForm("openai/gpt-4o", "GPT-4o", null);

        LlmModelMiniDTO result = llmModelService.insert(form);

        assertThat(result.getModelId()).isEqualTo("openai/gpt-4o");
        assertThat(result.getName()).isEqualTo("GPT-4o");
        assertThat(result.getIsEnabled()).isTrue();
        assertThat(result.getId()).isNotNull();
    }

    @Test
    void insertThrowsInvalidInsertDetailsForBlankModelId() {
        LlmModelForm form = new LlmModelForm("", "GPT-4o", null);

        assertThatThrownBy(() -> llmModelService.insert(form))
                .isInstanceOf(InvalidInsertDetails.class);
    }

    @Test
    void insertThrowsInvalidInsertDetailsForNullName() {
        LlmModelForm form = new LlmModelForm("openai/gpt-4o", null, null);

        assertThatThrownBy(() -> llmModelService.insert(form))
                .isInstanceOf(InvalidInsertDetails.class);
    }

    @Test
    void insertThrowsItemAlreadyExistForDuplicateModelId() throws Exception {
        llmModelService.insert(new LlmModelForm("openai/gpt-4o", "GPT-4o", null));

        assertThatThrownBy(() -> llmModelService.insert(
                new LlmModelForm("openai/gpt-4o", "GPT-4o Duplicate", null)))
                .isInstanceOf(ItemAlreadyExist.class)
                .hasMessageContaining("openai/gpt-4o");
    }

    // --- delete() ---

    @Test
    void deleteAlwaysThrowsInvalidDeleteOperation() throws Exception {
        LlmModelMiniDTO saved = llmModelService.insert(new LlmModelForm("x/model", "X Model", null));

        assertThatThrownBy(() -> llmModelService.delete(saved.getId()))
                .isInstanceOf(InvalidDeleteOperation.class)
                .hasMessageContaining("cannot be deleted");
    }

    @Test
    void deleteThrowsInvalidDeleteOperationEvenForNonExistentId() {
        assertThatThrownBy(() -> llmModelService.delete(999999L))
                .isInstanceOf(InvalidDeleteOperation.class);
    }

    // --- getOne() ---

    @Test
    void getOneReturnsCorrectModel() throws Exception {
        LlmModelMiniDTO saved = llmModelService.insert(new LlmModelForm("anthropic/claude", "Claude", "desc"));
        LlmModelEntity entity = llmModelRepository.findByModelId("anthropic/claude").orElseThrow();

        LlmModelDTO dto = llmModelService.getOne(entity.getId());

        assertThat(dto.getModelId()).isEqualTo("anthropic/claude");
        assertThat(dto.getName()).isEqualTo("Claude");
        assertThat(dto.getDescription()).isEqualTo("desc");
        assertThat(dto.getIsEnabled()).isTrue();
    }

    @Test
    void getOneThrowsItemNotFoundForNonExistentId() {
        assertThatThrownBy(() -> llmModelService.getOne(999999L))
                .isInstanceOf(ItemNotFoundException.class);
    }

    // --- update() ---

    @Test
    void updateAppliesAllFieldChanges() throws Exception {
        llmModelService.insert(new LlmModelForm("old/model", "Old Name", "Old desc"));
        Long id = llmModelRepository.findByModelId("old/model").orElseThrow().getId();

        LlmModelDTO result = llmModelService.update(id,
                new LlmModelForm("new/model", "New Name", "New desc"));

        assertThat(result.getModelId()).isEqualTo("new/model");
        assertThat(result.getName()).isEqualTo("New Name");
        assertThat(result.getDescription()).isEqualTo("New desc");
    }

    @Test
    void updateWithUnchangedModelIdSkipsUniquenessCheck() throws Exception {
        llmModelService.insert(new LlmModelForm("stable/model", "Stable", null));
        Long id = llmModelRepository.findByModelId("stable/model").orElseThrow().getId();

        assertThatCode(() -> llmModelService.update(id,
                new LlmModelForm("stable/model", "Updated Name", null)))
                .doesNotThrowAnyException();
    }

    @Test
    void updateThrowsInvalidInsertDetailsWhenModelIdChangesToExisting() throws Exception {
        llmModelService.insert(new LlmModelForm("first/model", "First", null));
        llmModelService.insert(new LlmModelForm("second/model", "Second", null));
        Long secondId = llmModelRepository.findByModelId("second/model").orElseThrow().getId();

        assertThatThrownBy(() -> llmModelService.update(secondId,
                new LlmModelForm("first/model", null, null)))
                .isInstanceOf(InvalidInsertDetails.class)
                .hasMessageContaining("first/model");
    }

    @Test
    void updateThrowsItemNotFoundForNonExistentId() {
        assertThatThrownBy(() -> llmModelService.update(999999L,
                new LlmModelForm("x/model", "X", null)))
                .isInstanceOf(ItemNotFoundException.class);
    }

    // --- toggleEnabled() ---

    @Test
    void toggleEnabledFlipsEnabledToDisabled() throws Exception {
        llmModelService.insert(new LlmModelForm("toggle/model", "Toggle", null));
        Long id = llmModelRepository.findByModelId("toggle/model").orElseThrow().getId();

        LlmModelDTO result = llmModelService.toggleEnabled(id);

        assertThat(result.getIsEnabled()).isFalse();
    }

    @Test
    void toggleEnabledFlipsDisabledToEnabled() throws Exception {
        llmModelService.insert(new LlmModelForm("toggle2/model", "Toggle2", null));
        Long id = llmModelRepository.findByModelId("toggle2/model").orElseThrow().getId();
        llmModelService.toggleEnabled(id); // enabled→disabled

        LlmModelDTO result = llmModelService.toggleEnabled(id); // disabled→enabled

        assertThat(result.getIsEnabled()).isTrue();
    }

    @Test
    void toggleEnabledThrowsItemNotFoundForNonExistentId() {
        assertThatThrownBy(() -> llmModelService.toggleEnabled(999999L))
                .isInstanceOf(ItemNotFoundException.class);
    }

    // --- getAll() ---

    @Test
    void getAllReturnsAllModels() throws Exception {
        llmModelService.insert(new LlmModelForm("m1/model", "M1", null));
        llmModelService.insert(new LlmModelForm("m2/model", "M2", null));

        var all = llmModelService.getAll();

        assertThat(all).hasSize(2);
    }
}
```

#### Edge Cases

1. **`delete()` does NOT call `findById()`** — the implementation throws `InvalidDeleteOperation` immediately. `deleteThrowsInvalidDeleteOperationEvenForNonExistentId` tests this: even for ID `999999L`, the operation is rejected before any DB lookup. This is intentional — the policy is unconditional.
2. **`update()` with `form.getDescription() != null`** — an explicit `null` description in the form is treated as "not provided" (skip update), consistent with `LlmModelForm`'s nullable description field. A blank string `""` is valid and would be applied. Test `updateAppliesAllFieldChanges` uses a real description value to verify the path; there is no test for explicit `null` description (the null-skip is correct behavior per the nullable field contract).
3. **`toggleEnabled()` transaction** — the class-level `@Transactional(rollbackFor = {...})` on `DefaultServiceImplements` covers `toggleEnabled`. If the `save()` throws, the transaction rolls back. No method-level `@Transactional` is needed.
4. **`isBlank()` private helper** — mirrors `EmployeeService.isBlank()` exactly. Centralizes null + blank check. Not in the base class because it's domain-specific helper logic.
5. **`@WithMockUser(username = "task3-llm-crud", roles = "ADMIN")`** — the distinct `username` prevents conflicts if other `@SpringBootTest` tests run in the same JVM context with H2 data from a prior test class's `@BeforeEach`. The `@BeforeEach deleteAll()` already cleans data, but the distinct username is an extra guard for `@SpringBootTest` shared context.

---

### Step 3: Complete Service List Query Tests

**Goal:** Add remaining list/filter/sort tests to `LlmModelServiceListQueryIntegrationTest`. These tests validate the `LlmModelQueryProfile` field declarations through the service boundary.

**Dependencies:** Step 2 complete — full `LlmModelService` is in place.

- [x] Add `filterByIsEnabledTrueReturnsOnlyEnabledModels` → run → expect pass
- [x] Add `filterByModelIdContainsReturnsMatchingModels` → run → expect pass
- [x] Add `sortByCreatedAtDoesNotThrowAndReturnsCorrectCount` → run → expect pass
- [x] Add `rejectsDescriptionAsFilterField` → run → expect pass
- [x] Add `rejectsUnknownSortField` → run → expect pass
- [x] Add `unsupportedOperatorOnBooleanFieldThrowsException` → run → expect pass
- [x] Run `./mvnw test -Dtest=LlmModelServiceListQueryIntegrationTest` — confirm all 7 tests pass

#### Implementation

Add these tests to `LlmModelServiceListQueryIntegrationTest.java`:

```java
@Test
void filterByIsEnabledTrueReturnsOnlyEnabledModels() throws InvalidQueryRequestException {
    PageableRequest request = new PageableRequest();
    request.setFilters(List.of(FilterRequest.builder()
            .field("isEnabled")
            .operations(List.of(FilterOperationRequest.builder()
                    .operator(FilterOperator.EQUALS)
                    .value(true)
                    .build()))
            .build()));

    Page<LlmModelListDTO> page = llmModelService.getListPage(request);

    assertThat(page.getTotalElements()).isEqualTo(2); // alpha + gamma are enabled
    assertThat(page.getContent())
            .extracting(LlmModelListDTO::getIsEnabled)
            .containsOnly(true);
}

@Test
void filterByModelIdContainsReturnsMatchingModels() throws InvalidQueryRequestException {
    PageableRequest request = new PageableRequest();
    request.setFilters(List.of(FilterRequest.builder()
            .field("modelId")
            .operations(List.of(FilterOperationRequest.builder()
                    .operator(FilterOperator.CONTAINS)
                    .value("provider-a")
                    .build()))
            .build()));

    Page<LlmModelListDTO> page = llmModelService.getListPage(request);

    assertThat(page.getTotalElements()).isEqualTo(1);
    assertThat(page.getContent().get(0).getModelId()).isEqualTo("provider-a/model-1");
}

@Test
void sortByCreatedAtDoesNotThrowAndReturnsCorrectCount() throws InvalidQueryRequestException {
    // createdAt is a valid sortable field; verify it does not throw InvalidQueryRequestException.
    // Specific order is not asserted: entities saved in rapid @BeforeEach succession have
    // indistinguishable microsecond timestamps.
    PageableRequest request = new PageableRequest();
    request.setSort(List.of(SortRequest.builder()
            .field("createdAt")
            .direction(SortDirection.ASC)
            .build()));

    Page<LlmModelListDTO> page = llmModelService.getListPage(request);

    assertThat(page.getTotalElements()).isEqualTo(3);
}

@Test
void rejectsDescriptionAsFilterField() {
    PageableRequest request = new PageableRequest();
    request.setFilters(List.of(FilterRequest.builder()
            .field("description")
            .operations(List.of(FilterOperationRequest.builder()
                    .operator(FilterOperator.CONTAINS)
                    .value("text")
                    .build()))
            .build()));

    assertThatThrownBy(() -> llmModelService.getListPage(request))
            .isInstanceOf(InvalidQueryRequestException.class)
            .hasMessageContaining("description");
}

@Test
void rejectsUnknownSortField() {
    PageableRequest request = new PageableRequest();
    request.setSort(List.of(SortRequest.builder()
            .field("unknownField")
            .direction(SortDirection.ASC)
            .build()));

    assertThatThrownBy(() -> llmModelService.getListPage(request))
            .isInstanceOf(InvalidQueryRequestException.class)
            .hasMessageContaining("unknownField");
}

@Test
void unsupportedOperatorOnBooleanFieldThrowsException() {
    PageableRequest request = new PageableRequest();
    request.setFilters(List.of(FilterRequest.builder()
            .field("isEnabled")
            .operations(List.of(FilterOperationRequest.builder()
                    .operator(FilterOperator.CONTAINS)
                    .value("true")
                    .build()))
            .build()));

    assertThatThrownBy(() -> llmModelService.getListPage(request))
            .isInstanceOf(InvalidQueryRequestException.class)
            .hasMessageContaining("isEnabled");
}
```

<!-- REVIEW-FIX: Redundant imports block removed — Step 1 skeleton already declares `import com.agentForgeBackend.shared.query.*;` which covers all of these -->

#### Edge Cases

1. **`rejectsDescriptionAsFilterField` message** — `EntityQueryProfile.requireField("description")` throws `InvalidQueryRequestException("Unknown query field 'description'.")`. The test asserts `hasMessageContaining("description")` — stable regardless of the full message wording.
2. **`sortByCreatedAtDoesNotThrow` comment** — the comment is intentional documentation of the test's scope. A future maintainer who sees this test and wonders "why no order assertion?" should understand the `@PrePersist` timestamp constraint immediately.

---

### Step 4: Create `LlmModelController` and Controller Tests (TDD RED → GREEN)

**Goal:** Write the controller tests first, then create `LlmModelController` to make them pass. Update `SecurityAuthorizationTest` to account for the controller now existing.

**Dependencies:** Step 2 complete — full service is in place.

- [x] Create `LlmModelControllerTest.java` with first test `listWithDefaultRequestReturnsModelListPage`
- [x] Run `./mvnw test -Dtest=LlmModelControllerTest` — **expect fail** (no controller yet → 404 on all routes)
- [x] Create `LlmModelController.java`
- [x] Run → first test passes
- [x] Add `insertModelReturns200WithMiniDTO` → run → pass
- [x] Add `insertWithMissingModelIdReturns400` → run → pass
- [x] Add `getOneModelReturns200WithDTO` → run → pass
- [x] Add `getOneNonExistentModelReturns404` → run → pass
- [x] Add `updateModelReturns200WithUpdatedDTO` → run → pass
- [x] Add `deleteModelReturns400WithInvalidDeleteOperationMessage` → run → pass
- [x] Add `toggleEnabledFlipsIsEnabledState` → run → pass
- [x] Add `listWithFilterByIsEnabledReturnsMatchingModels` → run → pass
- [x] Add `listWithDescriptionFilterReturnsBadRequest` → run → pass
- [x] Add `employeeCannotAccessLlmModelEndpoints` → run → pass
- [x] Run `./mvnw test -Dtest=LlmModelControllerTest` — confirm all 11 tests pass
- [x] Update `SecurityAuthorizationTest.adminRequestToLlmModelEndpointPassesSecurity` — change `isNotFound()` to `isOk()`
- [x] Run `./mvnw test -Dtest=SecurityAuthorizationTest` — confirm 9 tests still pass

**Why this step is critical:** The controller test is the end-to-end HTTP contract proof: JSON serialization, validation, status codes, and the `PATCH /{id}/toggle` endpoint shape are all verified here. The security test update is required — the Task 1 document explicitly notes this lifecycle transition.

#### Implementation

**`LlmModelController.java`:**
```java
package com.agentForgeBackend.models.llm;

import com.agentForgeBackend.exceptions.ItemNotFoundException;
import com.agentForgeBackend.shared.defaultImplements.DefaultController;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/llm-model")
public class LlmModelController extends DefaultController<LlmModelDTO, LlmModelMiniDTO, LlmModelListDTO, LlmModelForm, Long> {

    private final LlmModelService llmModelService;

    public LlmModelController(LlmModelService service) {
        super(service);
        this.llmModelService = service;
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<LlmModelDTO> toggle(@PathVariable Long id) throws ItemNotFoundException {
        return ResponseEntity.ok(llmModelService.toggleEnabled(id));
    }
}
```

**`LlmModelControllerTest.java`:**
```java
package com.agentForgeBackend.models.llm;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@WithMockUser(username = "task3-llm-ctrl", roles = "ADMIN")
class LlmModelControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private LlmModelRepository llmModelRepository;

    private LlmModelEntity saved;

    @BeforeEach
    void setUp() {
        llmModelRepository.deleteAll();
        llmModelRepository.flush();

        LlmModelEntity e = new LlmModelEntity();
        e.setModelId("openai/gpt-4o");
        e.setName("GPT-4o");
        e.setDescription("OpenAI flagship");
        saved = llmModelRepository.saveAndFlush(e);
    }

    @Test
    void listWithDefaultRequestReturnsModelListPage() throws Exception {
        mockMvc.perform(post("/llm-model/list")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].modelId").value("openai/gpt-4o"))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.size").value(20));
    }

    @Test
    void insertModelReturns200WithMiniDTO() throws Exception {
        String body = """
                { "modelId": "anthropic/claude-3", "name": "Claude 3" }
                """;

        mockMvc.perform(post("/llm-model")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.modelId").value("anthropic/claude-3"))
                .andExpect(jsonPath("$.name").value("Claude 3"))
                .andExpect(jsonPath("$.isEnabled").value(true))
                .andExpect(jsonPath("$.id").isNumber());
    }

    @Test
    void insertWithMissingModelIdReturns400() throws Exception {
        String body = """
                { "name": "No ID Model" }
                """;

        mockMvc.perform(post("/llm-model")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getOneModelReturns200WithDTO() throws Exception {
        mockMvc.perform(get("/llm-model/" + saved.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(saved.getId().intValue()))
                .andExpect(jsonPath("$.modelId").value("openai/gpt-4o"))
                .andExpect(jsonPath("$.isEnabled").value(true));
    }

    @Test
    void getOneNonExistentModelReturns404() throws Exception {
        mockMvc.perform(get("/llm-model/999999"))
                .andExpect(status().isNotFound());
    }

    @Test
    void updateModelReturns200WithUpdatedDTO() throws Exception {
        String body = """
                { "modelId": "openai/gpt-4o-updated", "name": "GPT-4o Updated" }
                """;

        mockMvc.perform(put("/llm-model/" + saved.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.modelId").value("openai/gpt-4o-updated"))
                .andExpect(jsonPath("$.name").value("GPT-4o Updated"));
    }

    @Test
    void deleteModelReturns400WithInvalidDeleteOperationMessage() throws Exception {
        mockMvc.perform(delete("/llm-model/" + saved.getId()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value(containsString("cannot be deleted")));
    }

    @Test
    void toggleEnabledFlipsIsEnabledState() throws Exception {
        mockMvc.perform(patch("/llm-model/" + saved.getId() + "/toggle"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(saved.getId().intValue()))
                .andExpect(jsonPath("$.isEnabled").value(false));

        // Flip back
        mockMvc.perform(patch("/llm-model/" + saved.getId() + "/toggle"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isEnabled").value(true));
    }

    @Test
    void listWithFilterByIsEnabledReturnsMatchingModels() throws Exception {
        // Add a disabled model
        LlmModelEntity disabled = new LlmModelEntity();
        disabled.setModelId("disabled/model");
        disabled.setName("Disabled");
        disabled.setIsEnabled(false);
        llmModelRepository.saveAndFlush(disabled);

        String body = """
                {
                  "filters": [{
                    "field": "isEnabled",
                    "operations": [{ "operator": "EQUALS", "value": true }]
                  }]
                }
                """;

        mockMvc.perform(post("/llm-model/list")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].modelId").value("openai/gpt-4o"));
    }

    @Test
    void listWithDescriptionFilterReturnsBadRequest() throws Exception {
        String body = """
                {
                  "filters": [{
                    "field": "description",
                    "operations": [{ "operator": "CONTAINS", "value": "text" }]
                  }]
                }
                """;

        mockMvc.perform(post("/llm-model/list")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Invalid Query Request"))
                .andExpect(jsonPath("$.message").value(containsString("description")));
    }

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void employeeCannotAccessLlmModelEndpoints() throws Exception {
        mockMvc.perform(post("/llm-model/list")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }
}
```

**`SecurityAuthorizationTest.java` — update `adminRequestToLlmModelEndpointPassesSecurity`:**

Find the method:
```java
@Test
@WithMockUser(roles = "ADMIN")
void adminRequestToLlmModelEndpointPassesSecurity() throws Exception {
    // Security passes for ADMIN; no controller exists yet so DispatcherServlet returns 404.
    // This confirms the security rule does not block the admin caller.
    mockMvc.perform(post("/llm-model/list")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{}"))
        .andExpect(status().isNotFound());
}
```

Replace with:
```java
@Test
@WithMockUser(roles = "ADMIN")
void adminRequestToLlmModelEndpointPassesSecurity() throws Exception {
    // LlmModelController now exists; POST /llm-model/list returns 200 for admins.
    mockMvc.perform(post("/llm-model/list")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{}"))
        .andExpect(status().isOk());
}
```

#### Edge Cases

1. **`insertWithMissingModelIdReturns400`** — `LlmModelForm.modelId` carries `@NotBlank`. Spring Boot's `MethodArgumentNotValidException` is thrown before the controller method body executes, returning a `400` with `{"error":"Validation Failed",...}`. The service's `InvalidInsertDetails` check is an additional defense but is not reached in this path.
2. **`deleteModelReturns400WithInvalidDeleteOperationMessage`** — `GlobalExceptionHandler.handleInvalidDeleteOperation()` maps `InvalidDeleteOperation` to `HttpStatus.BAD_REQUEST` with `error: "Bad Request"`. This confirms the controller passes the exception through and the global handler serializes it correctly.
3. **`toggleEnabledFlipsIsEnabledState` two-request test** — verifies both the enabled→disabled and disabled→enabled transitions in a single test. The `saved` entity starts as `isEnabled = true` (entity field initializer); first toggle → `false`; second toggle → `true`.
4. **`@WithMockUser(roles = "EMPLOYEE")` on `employeeCannotAccessLlmModelEndpoints`** — method-level annotation overrides the class-level `@WithMockUser(roles = "ADMIN")`. This is the same pattern used in `EmployeeControllerListEndpointTest.employeeRoleCannotAccessEmployeeEndpoints`.
5. **`SecurityAuthorizationTest` update** — after this change, `SecurityAuthorizationTest` has no stale assertion. Task 1's comment in the test ("no controller exists yet") should also be removed/updated. The new comment ("LlmModelController now exists") is sufficient.
6. **`listWithFilterByIsEnabledReturnsMatchingModels` saves a second entity** — the `@BeforeEach` saves one enabled model. This test adds a disabled model to create a meaningful filter scenario. Because `@BeforeEach` runs before each test and clears the repository, this extra save does not affect other tests.

---

### Step 5: Full Regression

**Goal:** Confirm that the complete LlmModel implementation does not regress any existing tests.

**Dependencies:** Steps 1–4 complete.

- [x] From `backend/`: run `./mvnw test`
- [x] Confirm `LlmModelServiceCrudIntegrationTest` — 16 tests, 0 failures
- [x] Confirm `LlmModelServiceListQueryIntegrationTest` — 7 tests, 0 failures
- [x] Confirm `LlmModelControllerTest` — 11 tests, 0 failures
- [x] Confirm `SecurityAuthorizationTest` — 9 tests, 0 failures (updated admin assertion passes)
- [x] Confirm `LlmModelRepositoryTest` — 9 tests, 0 failures (unchanged from Task 2)
- [x] Confirm `LlmModelMapperTest` — 12 tests, 0 failures (unchanged from Task 2)
- [x] Confirm all existing Admin, Employee, Client, and security tests pass
- [x] Confirm the only failure is the pre-existing `authServerApplicationTests.contextLoads` Docker blocker

**Expected new total:** 465 tests (base was 431, not 397 as originally estimated; 431 + 34 new = 465)

---

## Design Decisions

**Decision 1: `update()` uses `InvalidInsertDetails` for duplicate `modelId`, not `ItemAlreadyExist`**
- **Why:** `DefaultService.update()` declares `throws ItemNotFoundException, InvalidInsertDetails` in the interface contract. Java's override rules forbid adding a new checked exception (`ItemAlreadyExist`) not declared in the interface. Using `InvalidInsertDetails` is consistent with `EmployeeService.update()`, which throws `InvalidInsertDetails` for duplicate username/email conflicts. The resulting HTTP status is `400 Bad Request`, which is acceptable for a constraint violation in an update request.
- **Alternatives considered:** (a) Throw `ItemAlreadyExist` unchecked by wrapping in `RuntimeException` — rejected, bad practice. (b) Modify the `DefaultService` interface to add `ItemAlreadyExist` to `update()`'s throws clause — rejected, it would require updating every existing service implementation. (c) Use the feature doc's aspirational `ItemAlreadyExist` — rejected, it doesn't compile.

**Decision 2: `delete()` throws unconditionally, no entity lookup**
- **Why:** The policy is "LLM models cannot be deleted — period." Looking up the entity before throwing would suggest the outcome could differ based on whether the entity exists. It cannot. The unconditional throw is semantically correct: there is no valid path to deletion regardless of entity state.
- **Alternatives considered:** Load entity, throw `ItemAlreadyExist` if found — rejected, semantically incoherent (the deletion is blocked by policy, not by entity state).

**Decision 3: Two-field constructor pattern for `LlmModelController`**
- **Why:** `DefaultController` stores the service as `DefaultService<DTO, MINIDTO, LISTDTO, FORM, ID>` — the abstract interface type. Calling `defaultService.toggleEnabled()` is impossible without casting (the method is not on `DefaultService`). A typed `llmModelService` field in `LlmModelController` holds the concrete type reference, making `llmModelService.toggleEnabled()` type-safe and proxy-safe (Spring's AOP proxy wraps the bean, but the same bean reference is passed to both `super` and the field, so `@PreAuthorize` annotations are honored). This is Finding 2's resolution from the review bug.
- **Alternatives considered:** Cast `defaultService` to `LlmModelService` in the toggle endpoint — rejected, fragile and couples the controller to a concrete implementation detail.

**Decision 4: All service methods annotated with `@PreAuthorize("hasRole('ADMIN')")`**
- **Why:** The base class methods carry `@PreAuthorize("isAuthenticated()")`. Without overrides, `getAll()`, `getListPage()`, etc., would be accessible to any authenticated user (including Employees and Clients). The feature requirement is admin-only for all LlmModel operations. `EmployeeService` follows the same pattern — every method is overridden with the stricter annotation.
- **Alternatives considered:** Override only the methods with custom logic, relying on the HTTP security rule (`/llm-model/**` → `hasRole("ADMIN")`) as the sole gate. Rejected — the feature doc requires defense-in-depth at the method level, independent of route configuration.

**Decision 5: `LlmModelQueryProfile` uses `LocalDateTime.class` for `createdAt`**
- **Why:** `LlmModelEntity.createdAt` is `java.time.LocalDateTime`. `QLlmModelEntity.createdAt` is `DateTimePath<LocalDateTime>`. The `QueryableField.dateTime()` factory takes `DateTimeExpression<VALUE>` and `Class<VALUE>`. Using `LocalDateTime.class` provides type consistency between the entity, the Q-class, and the query profile. `AdminQueryProfile` uses `Date.class` because `BaseUserEntity.dateCreated` is `java.util.Date`. These are different choices for different entity field types — not inconsistency.
- **Alternatives considered:** Use `Date.class` for uniformity with `AdminQueryProfile` — rejected, mismatches the entity field type and would require conversion logic.

**Decision 6: `createdAt` sort tests verify no-exception, not specific order**
- **Why:** `@PrePersist` always sets `createdAt = LocalDateTime.now()`. Entities saved in a tight `@BeforeEach` loop have sub-millisecond timestamp differences that are collapsed to identical microsecond values by H2. Asserting sort order on indistinguishable timestamps produces flaky tests. The meaningful assertion is that the `createdAt` field is a valid sortable field (no `InvalidQueryRequestException`). The value of `createdAt` persistence and immutability is already validated by `LlmModelRepositoryTest.createdAtIsAutoSetOnPersist` and `createdAtIsNotUpdatedOnSubsequentSave`.
- **Alternatives considered:** Use `TestEntityManager` + native SQL to set specific `created_at` values after save — rejected, adds test infrastructure complexity for limited value; the sort mechanism is already proven by existing Admin/Employee service tests.

---

## Testing Considerations

### Automatic Validation

**TDD incremental checks (run after each step):**
- [x] From `backend/`: `./mvnw test -Dtest=LlmModelServiceListQueryIntegrationTest` after Step 1 — `defaultRequestReturnsAllModels` passes (1 test)
- [x] From `backend/`: `./mvnw test -Dtest=LlmModelServiceCrudIntegrationTest` after first insert test passes (Step 2 first slice)
- [x] From `backend/`: `./mvnw test -Dtest=LlmModelServiceCrudIntegrationTest` after Step 2 complete — 16 tests pass
- [x] From `backend/`: `./mvnw test -Dtest=LlmModelServiceListQueryIntegrationTest` after Step 3 — 7 tests pass
- [x] From `backend/`: `./mvnw test -Dtest=LlmModelControllerTest` after Step 4 controller creation — 11 tests pass
- [x] From `backend/`: `./mvnw test -Dtest=SecurityAuthorizationTest` after Step 4 security test update — 9 tests pass (including updated admin assertion)
- [x] From `backend/`: `./mvnw test` (Step 5 full regression) — 465 total tests; only pre-existing `authServerApplicationTests.contextLoads` failure

### Manual Validation

- [ ] (Optional, requires Docker) Start backend with Docker Compose running. With a valid Admin JWT from `POST /login`, confirm `POST /llm-model` creates a model and returns a `LlmModelMiniDTO` with `"isEnabled": true`.
- [ ] (Optional, requires Docker) With a valid Admin JWT, confirm `PATCH /llm-model/{id}/toggle` flips `isEnabled` to `false` on the first call and back to `true` on the second call.
- [ ] (Optional, requires Docker) With a valid Admin JWT, confirm `DELETE /llm-model/{id}` returns `400` with `"message": "LLM models cannot be deleted. Use toggle to disable."`.
- [ ] (Optional, requires Docker) With a valid Employee JWT, confirm `POST /llm-model/list` returns `403 Forbidden`.

---

## Related Code Explanations

- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeService.java` — primary prior art; `LlmModelService` mirrors its override structure, `@PreAuthorize` pattern, `isBlank()` helper, and `update()` duplicate check
- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeQueryProfile.java` — primary prior art; `LlmModelQueryProfile` replicates the field declaration pattern
- `backend/src/main/java/com/agentForgeBackend/shared/defaultImplements/DefaultServiceImplements.java:82-94` — `update()` base no-op; never call `super.update()` from `LlmModelService.update()`
- `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java` — `/llm-model/**` rule already present (Task 1); no changes needed in this task
- `backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java` — `adminRequestToLlmModelEndpointPassesSecurity` must be updated from `isNotFound()` to `isOk()` in Step 4

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task
- [x] All skills reviewed and selected for this task
- [x] Spring Boot 3.4.1 / QueryDSL 6.12 / Spring Security 6.4.x patterns verified against existing codebase
- [x] `LlmModelQueryProfile.java` created — 5 fields (`id`, `modelId`, `name`, `isEnabled`, `createdAt`), `description` excluded, default sort `id ASC`
- [x] `LlmModelService.java` created — all 6 `DefaultService` methods overridden with `@PreAuthorize("hasRole('ADMIN')")`, `insert()` with uniqueness check, `update()` complete override (not calling super), `delete()` unconditional throw, `toggleEnabled()` public method
- [x] `LlmModelController.java` created — `@RequestMapping("/llm-model")`, two-field constructor, `PATCH /{id}/toggle` endpoint
- [x] `SecurityAuthorizationTest.java` modified — `adminRequestToLlmModelEndpointPassesSecurity` asserts `isOk()` instead of `isNotFound()`
- [x] `LlmModelServiceCrudIntegrationTest.java` created — 16 tests: insert (4), delete (2), getOne (2), update (4), toggleEnabled (3), getAll (1)
- [x] `LlmModelServiceListQueryIntegrationTest.java` created — 7 tests: default (1), filter (2), sort (1), rejection (3)
- [x] `LlmModelControllerTest.java` created — 11 tests: list (3), insert (2), getOne (2), update (1), delete (1), toggle (1), security (1)
- [x] From `backend/`: `./mvnw test -Dtest=LlmModelServiceCrudIntegrationTest` — 16 tests pass
- [x] From `backend/`: `./mvnw test -Dtest=LlmModelServiceListQueryIntegrationTest` — 7 tests pass
- [x] From `backend/`: `./mvnw test -Dtest=LlmModelControllerTest` — 11 tests pass
- [x] From `backend/`: `./mvnw test -Dtest=SecurityAuthorizationTest` — 9 tests pass
- [x] From `backend/`: `./mvnw test` — 465 total tests (base was 431, not 397 as estimated); only pre-existing `authServerApplicationTests.contextLoads` Docker failure
- [x] Manual validation steps documented for the user when Docker is available
- [x] Parent feature Steps 3.1–3.4 ready to be marked complete after execution
