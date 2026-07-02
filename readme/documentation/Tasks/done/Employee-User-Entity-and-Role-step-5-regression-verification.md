# Task: Regression and Supplemental Employee Test Coverage

#task #current #high-complexity #parent-employee-user-entity-and-role

**Parent:** [[Employee-User-Entity-and-Role]]
**Parent Type:** Feature
**Related Step(s):** Phase 5 — Steps 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
**Estimated Complexity:** High

---

## Goal

Add supplemental and edge-case test coverage to the five Employee test classes created in Tasks 1–4, and execute a full test suite regression to confirm all existing Admin and Client tests still pass under the hardened security configuration.

---

## Parent Context

The parent feature defines Phase 5 as supplemental depth — not initial coverage. Each module's first behavior test was written in its respective task (Tasks 1–4). This task adds edge cases, boundary conditions, and cross-cutting contract verifications that were deferred to avoid scope creep in individual task phases.

**Step 5.1 — Repository edge cases (Feature §5.1):** Supplemental repository tests for unique constraint enforcement, cascade delete behavior across JOINED inheritance, and `BaseUserRepository` cross-subtype existence checks (the method added in Task 2 that the service depends on for global uniqueness enforcement).

**Step 5.2 — Mapper contract completeness (Feature §5.2):** Verify that `EmployeeListDTO` and `EmployeeMiniDTO` (not yet checked) have no `password` or `apiKey` fields, that date fields survive null-safety across all DTO variants, and that null inputs are handled consistently across all three `toDTO` / `toSmallDTO` / `toListDTO` paths.

**Step 5.3 — Service cross-cutting edge cases (Feature §5.3):** Three specific gaps noted but deferred from Task 3: (a) update with unchanged username skips uniqueness check, (b) insert rejects blank/null email (the service validates username and password but no test covers email), (c) roles are never updated from form data — they remain `EMPLOYEE` after any update.

**Step 5.4 — List/query layer edge cases (Feature §5.4):** At the service layer, verify that `EmployeeService.getListPage()` rejects unsupported operators on boolean fields, rejects a string value for the numeric `id` field, and rejects an unknown sort field. Maximum page size rejection and sensitive-field filter rejection are already covered in Tasks 3 and 4.

**Step 5.5 — Controller HTTP validation (Feature §5.5):** Match the Admin controller test suite depth for Employee. `AdminControllerListEndpointTest` has four tests that `EmployeeControllerListEndpointTest` is missing: unknown sort field, unsupported operator on boolean field, invalid id value type, and malformed operator enum. All four must be added.

**Step 5.6 — Full regression (Feature §5.6):** Run `./mvnw test` and confirm all non-Docker tests pass. The only known failing test is `authServerApplicationTests.contextLoads` (pre-existing Docker PostgreSQL host `db` failure outside Docker Compose — not introduced by this feature).

**Testing decisions (Feature §Testing):**
- Phase 5 provides regression and supplemental coverage only; first behavior tests for each module live in Tasks 1–4.
- Prefer automatic verification. No new manual validation steps in this task — all Phase 4 manual steps were already documented.
- Reuse `ListQueryTestDataFactory` for service query tests; reuse the `queryRequest()` helper for controller tests.

---

## Preconditions / Dependencies

- **Tasks 1–4 complete and all targeted tests passing:**
  - Task 1: `SecurityAuthorizationTest` (6 tests), security hardening in place.
  - Task 2: `EmployeeRepositoryTest` (7 tests), `EmployeeMapperTest` (10 tests), `EmployeeEntity`, `EmployeeMapper`, DTOs, `EmployeeForm`, `EmployeeRepository`, `QEmployeeEntity`, `BaseUserRepository.existsByUsername/existsByEmail` all present.
  - Task 3: `EmployeeServiceCrudIntegrationTest` (17 tests), `EmployeeServiceListQueryIntegrationTest` (4 tests), `EmployeeControllerListEndpointTest` (13 tests), `EmployeeService`, `EmployeeQueryProfile`, `EmployeeController` all present.
  - Task 4: `EmployeeLoginJwtTest` (8 tests), `AuthUserUtilTest` (10 tests), `AuthUserUtil` refactored, `TestAuthenticationHelper` extended with employee support.
- `ListQueryTestDataFactory` with `employee()`, `admin()`, `client()`, `filter()`, `sort()`, `request()` factory methods present at `backend/src/test/java/com/agentForgeBackend/models/hq/`.
- `FilterOperator.CONTAINS` exists as a valid enum constant (verified via `EmployeeServiceListQueryIntegrationTest.filtersSortsAndPaginatesEmployeeListDtos()` which already uses `FilterOperator.CONTAINS`).
- H2 in-memory test database enforces UNIQUE constraints on `username` and `email` columns of `base_user` table through Hibernate `ddl-auto=create-drop`.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — Selected — task template and placement.
- `solid-deep-design` — Selected — test additions follow existing module boundaries; no new production modules introduced. All new tests exercise public interfaces (no private method coupling). Deletion test: removing these tests leaves edge-case gaps that would silently pass through refactors. Tests earn their keep.
- `tdd` — Selected — supplemental TDD: write the new test, verify it fails for the right reason if production code has a bug, confirm it passes. No new production code should be required for any of these tests — if a test fails, it exposes a gap in the existing implementation.
- `memory-bank` — Selected — architecture and known-issues confirmed: JOINED inheritance, `BaseUserRepository` cross-subtype design, `@DataJpaTest` H2 constraint enforcement, pre-existing `authServerApplicationTests` Docker blocker.
- `find-docs` — Not needed — all patterns verified from existing working tests in the codebase. No new library APIs used.
- `glossary-management` — Not available — `.glossaryrc` not present. Domain language derived from Memory Bank and Feature document.

### Documentation Reviewed

- **Spring Data JPA `@DataJpaTest` constraint violation behavior:** Spring wraps Hibernate `ConstraintViolationException` as `org.springframework.dao.DataIntegrityViolationException`. Calling `employeeRepository.saveAndFlush(duplicate)` immediately flushes to H2, hitting the unique constraint and surfacing `DataIntegrityViolationException` within the test transaction.
- **Hibernate JOINED inheritance cascade delete:** When `EmployeeRepository.delete(entity)` is called, Hibernate removes the row from both the `employee` table and the `base_user` table in a single transaction. `BaseUserRepository.findByUsername()` after deletion returns `Optional.empty()`.
- **Spring MockMvc JSON deserialization errors:** An invalid enum string for `FilterOperator` (e.g., `"MATCHES"`) causes Jackson to throw `HttpMessageNotReadableException`, which `GlobalExceptionHandler` maps to a 400 "Malformed Request" response with message `"Malformed request body."` — confirmed from `AdminControllerListEndpointTest.malformedOperatorEnumReturnsBadRequest()` passing pattern.
- **`QueryPredicateBuilder` type validation:** When `value` for a `QueryableField<EmployeeEntity, Long>` (the `id` field) receives a `String`, the predicate builder throws `InvalidQueryRequestException` with message `"Field 'id' requires a JSON number; received String."` — confirmed from `AdminControllerListEndpointTest.invalidIdValueTypeReturnsBadRequest()` passing pattern.

### Related Existing Code

- `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeRepositoryTest.java` — modified in Step 1
- `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeMapperTest.java` — modified in Step 2
- `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeServiceCrudIntegrationTest.java` — modified in Step 3
- `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeServiceListQueryIntegrationTest.java` — modified in Step 4
- `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeControllerListEndpointTest.java` — modified in Step 5
- `backend/src/test/java/com/agentForgeBackend/models/hq/admin/AdminControllerListEndpointTest.java` — structural reference for controller test parity
- `backend/src/test/java/com/agentForgeBackend/models/hq/ListQueryTestDataFactory.java` — test data factory used in service and controller tests
- `backend/src/main/java/com/agentForgeBackend/shared/securityUser/BaseUserRepository.java` — `existsByUsername`, `existsByEmail`, `findByUsername` (tested in Step 1)
- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeService.java` — validates blank email/username/password in `insert()`; skips uniqueness check when values unchanged in `update()`; never touches `toUpdate.setRoles()` in `update()`
- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeMapper.java` — null guards on all `toDTO`/`toSmallDTO`/`toListDTO`/`toEntity` paths; `mapAuthorities()` returns null for null roles set

---

## Implementation Details

### Approach

All work in this task is additive: new test methods are added to five existing test classes. No production code changes are expected or required. If a new test fails, it identifies a genuine gap in the existing implementation that must be fixed before the task is considered complete.

**Organizing principle:** Each implementation step modifies exactly one test class and covers one phase-5 spec step. Steps are ordered from persistence layer (repository) up to HTTP layer (controller), finishing with the full regression run. This ordering mirrors the dependency direction: if a lower-layer test fails, diagnose at that layer before assuming higher-layer tests will pass.

**SOLID/Depth perspective for the test additions:**
- New tests cross the same public seams as existing tests — no new internal coupling introduced.
- `EmployeeRepositoryTest` tests the `BaseUserRepository` existence-check methods: the seam is `BaseUserRepository`, which is already the shared abstraction used by `EmployeeService`. Testing it through `@DataJpaTest` verifies JOINED inheritance is correctly scoped for cross-subtype checks.
- Controller edge-case tests at Step 5 mirror `AdminControllerListEndpointTest` exactly: Employee and Admin share the same generic `QueryPredicateBuilder` + `EntityQueryProfile` pipeline, so these tests are regression proofs for the shared query infrastructure, not Employee-specific logic.

### Files to Create/Modify

- [x] `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeRepositoryTest.java` — add 5 test methods (Step 1: Step 5.1)
- [x] `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeMapperTest.java` — add 5 test methods (Step 2: Step 5.2)
- [x] `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeServiceCrudIntegrationTest.java` — add 4 test methods (Step 3: Step 5.3)
- [x] `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeServiceListQueryIntegrationTest.java` — add 3 test methods (Step 4: Step 5.4)
- [x] `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeControllerListEndpointTest.java` — add 4 test methods (Step 5: Steps 5.4/5.5)

---

## Step-by-Step Implementation

### Step 1: Add Supplemental Repository Tests (Feature Step 5.1)

**Goal:** Verify JOINED inheritance constraint enforcement, cascade delete across both tables, and `BaseUserRepository` cross-subtype existence checks that the service depends on for global uniqueness.
**Dependencies:** `@DataJpaTest` H2 schema with UNIQUE constraints, `BaseUserRepository` injected alongside `EmployeeRepository`.

- [x] Open `EmployeeRepositoryTest.java`
- [x] Add `@Autowired private BaseUserRepository baseUserRepository;` field after the existing `employeeRepository` field
- [x] Add `import org.springframework.dao.DataIntegrityViolationException;` to imports <!-- REVIEW-FIX: assertThrows import also required — EmployeeRepositoryTest does not have it; see note below -->
- [x] Add `import static org.junit.jupiter.api.Assertions.assertThrows;` to imports (the existing test class does not have this import; it is required by the two constraint-violation tests)
- [x] Add 5 new `@Test` methods below the existing 7 (see implementation)
- [x] Run `./mvnw test -Dtest=EmployeeRepositoryTest` — all 12 tests pass

**Why this step is critical:** `BaseUserRepository.existsByUsername()` and `existsByEmail()` are the global uniqueness gate that `EmployeeService.insert()` calls before saving. Testing them here, through JOINED inheritance, proves they correctly see Employee rows through the `base_user` table. If these methods are broken, the service uniqueness checks silently no-op and duplicate users can be inserted.

#### Implementation

```java
// New field to add after existng employeeRepository:
@Autowired
private BaseUserRepository baseUserRepository;

// New import:
import org.springframework.dao.DataIntegrityViolationException;

// --- Step 5.1: Supplemental repository edge-case tests ---

@Test
void uniqueUsernameConstraintThrowsOnDuplicate() {
    employeeRepository.saveAndFlush(testEmployee); // persists username "janesmith"

    EmployeeEntity duplicate = new EmployeeEntity(
            "Bob", "Jones", "bob@example.com",
            new HashSet<>(Set.of(UserRoles.EMPLOYEE)),
            "janesmith", // same username — violates UNIQUE on base_user.username
            "hash2");

    assertThrows(DataIntegrityViolationException.class, () ->
            employeeRepository.saveAndFlush(duplicate));
}

@Test
void uniqueEmailConstraintThrowsOnDuplicate() {
    employeeRepository.saveAndFlush(testEmployee); // persists email "jane.smith@example.com"

    EmployeeEntity duplicate = new EmployeeEntity(
            "Bob", "Jones", "jane.smith@example.com", // same email
            new HashSet<>(Set.of(UserRoles.EMPLOYEE)),
            "bobjones",
            "hash2");

    assertThrows(DataIntegrityViolationException.class, () ->
            employeeRepository.saveAndFlush(duplicate));
}

@Test
void baseUserRepositoryExistsByUsernameReturnsTrueForEmployee() {
    entityManager.persist(testEmployee);
    entityManager.flush();
    entityManager.clear();

    assertTrue(baseUserRepository.existsByUsername("janesmith"));
    assertFalse(baseUserRepository.existsByUsername("nonexistent"));
}

@Test
void baseUserRepositoryExistsByEmailReturnsTrueForEmployee() {
    entityManager.persist(testEmployee);
    entityManager.flush();
    entityManager.clear();

    assertTrue(baseUserRepository.existsByEmail("jane.smith@example.com"));
    assertFalse(baseUserRepository.existsByEmail("nobody@example.com"));
}

@Test
void deletingEmployeeRemovesBaseUserRow() {
    EmployeeEntity saved = entityManager.persist(testEmployee);
    entityManager.flush();
    Long id = saved.getId();
    String username = saved.getUsername();

    employeeRepository.deleteById(id);
    employeeRepository.flush();
    entityManager.clear();

    assertFalse(baseUserRepository.findByUsername(username).isPresent());
    assertFalse(employeeRepository.existsById(id));
}
```

#### Edge Cases

1. **`uniqueUsernameConstraintThrowsOnDuplicate` — `saveAndFlush` vs `entityManager.persist`:** Using `employeeRepository.saveAndFlush()` routes through the Spring Data layer which immediately flushes and translates the Hibernate `ConstraintViolationException` to `DataIntegrityViolationException`. Using `entityManager.persist() + flush()` would throw `PersistenceException` (JPA layer). The Spring Data path is preferred because it matches what the application code calls.
2. **`deletingEmployeeRemovesBaseUserRow` — `flush()` after delete:** `deleteById` queues the DELETE in the persistence context. `flush()` sends it to the DB. `entityManager.clear()` evicts the cache. The subsequent `findByUsername` issues a fresh SELECT that should return empty.
3. **`@DataJpaTest` transaction rollback:** Each test runs in a transaction that rolls back after the test. The `saveAndFlush` in `uniqueUsernameConstraintThrowsOnDuplicate` may not commit, but the constraint is enforced at flush time before rollback. The exception escapes the test and the rollback cleans up automatically.

---

### Step 2: Add Supplemental Mapper Tests (Feature Step 5.2)

**Goal:** Prove that `EmployeeListDTO` and `EmployeeMiniDTO` are safe (no password/apiKey fields), that null dates in `toListDTO` do not throw NPE, and that all three `to*DTO` methods handle null input consistently.
**Dependencies:** `EmployeeMapper` source verified: all three `to*DTO` methods have explicit null guards; `mapAuthorities()` returns null for null roles.

- [x] Open `EmployeeMapperTest.java`
- [x] Add `import java.lang.reflect.Field;` if not already present (already imported in existing test)
- [x] Add 5 new `@Test` methods after the existing 10 (see implementation)
- [x] Run `./mvnw test -Dtest=EmployeeMapperTest` — all 15 tests pass

**Why this step is critical:** The existing mapper tests check `EmployeeDTO` does not expose `password` or `apiKey`. But `EmployeeListDTO` and `EmployeeMiniDTO` are not checked for these fields. The feature contract (Feature §3) states no DTO should expose API-key or password fields. Without these tests, a future refactor could accidentally add a field to `EmployeeListDTO` without detection.

#### Implementation

```java
// --- Step 5.2: Supplemental mapper contract-completeness tests ---

@Test
void toListDTO_doesNotExposePasswordOrApiKey() {
    EmployeeListDTO listDTO = mapper.toListDTO(entity);

    assertEquals("alicew", listDTO.getUsername());
    assertFalse(hasField(EmployeeListDTO.class, "password"));
    assertFalse(hasField(EmployeeListDTO.class, "apiKey"));
    assertFalse(hasField(EmployeeListDTO.class, "apikey"));
}

@Test
void toSmallDTO_doesNotExposePasswordOrApiKey() {
    EmployeeMiniDTO miniDTO = mapper.toSmallDTO(entity);

    assertEquals("alicew", miniDTO.getUsername());
    assertFalse(hasField(EmployeeMiniDTO.class, "password"));
    assertFalse(hasField(EmployeeMiniDTO.class, "apiKey"));
    assertFalse(hasField(EmployeeMiniDTO.class, "apikey"));
}

@Test
void toListDTO_handlesNullDates() {
    entity.setDateCreated(null);
    entity.setLastLogin(null);

    EmployeeListDTO listDTO = mapper.toListDTO(entity);

    // assertNotNull(listDTO) intentionally avoided — EmployeeMapperTest does not import assertNotNull.
    // The assertEquals call below serves the same purpose: it NPE-fails if listDTO is null. <!-- REVIEW-FIX: replaced assertNotNull(listDTO) with assertEquals assertion; assertNotNull is not imported in EmployeeMapperTest (imports: assertEquals, assertFalse, assertNull, assertTrue only) -->
    assertEquals("alicew", listDTO.getUsername()); // proves listDTO is non-null
    assertNull(listDTO.getDateCreated());
    assertNull(listDTO.getLastLogin());
}

@Test
void toDTO_nullEntityReturnsNull() {
    assertNull(mapper.toDTO(null));
}

@Test
void toSmallDTO_nullEntityReturnsNull() {
    assertNull(mapper.toSmallDTO(null));
}
```

#### Edge Cases

1. **`toListDTO_handlesNullDates` — `@BeforeEach` entity has non-null dates:** The existing `setUp()` sets `entity.setDateCreated(new Date(0))` and `entity.setLastLogin(new Date(1_000))`. The test explicitly overwrites these with null before calling `toListDTO`. Lombok `@Builder` propagates null through without NPE.
2. **`toDTO_nullEntityReturnsNull` and `toSmallDTO_nullEntityReturnsNull` — consistency with `toListDTO_nullEntityReturnsNull`:** These establish that all three DTO conversion methods have uniform null contracts. The source of `EmployeeMapper` confirms all three have `if (entity == null) return null` guards. The tests document this contract so a future maintainer cannot accidentally remove the guard from one method.
3. **`hasField()` helper — declared fields only:** The existing private `hasField()` method checks `type.getDeclaredFields()`, not inherited fields. `EmployeeListDTO` and `EmployeeMiniDTO` have no superclass with `password` or `apiKey` in this codebase, so this check is complete.

---

### Step 3: Add Supplemental Service Tests (Feature Step 5.3)

**Goal:** Cover three cross-cutting service edge cases that were noted in the feature spec but not explicitly tested in Task 3: (a) email is validated as required on insert, (b) update with unchanged username skips the uniqueness check, (c) roles remain `EMPLOYEE` after an update (update never modifies roles).
**Dependencies:** Task 3 complete; `EmployeeService` validates `isBlank(form.getEmail())` in `insert()`; `update()` never calls `toUpdate.setRoles()`.

- [x] Open `EmployeeServiceCrudIntegrationTest.java`
- [x] Add 4 new `@Test` methods after the existing 17 (see implementation)
- [x] Run `./mvnw test -Dtest=EmployeeServiceCrudIntegrationTest` — all 21 tests pass

**Why this step is critical:** The existing service tests verify null/blank username and blank password rejection, but no test covers null/blank email — which the service validates in the same `if` branch. This gap means a regression removing the email check would go undetected. The role preservation test explicitly documents the invariant that roles cannot be changed via update, which becomes more important as more user types are added to the system.

#### Implementation

```java
// --- Step 5.3: Supplemental cross-cutting service edge-case tests ---

@Test
void insertRejectsNullEmail() {
    EmployeeForm form = new EmployeeForm("Bob", "Jones", null, "bobjones", "password123");

    assertThatThrownBy(() -> employeeService.insert(form))
            .isInstanceOf(InvalidInsertDetails.class);
}

@Test
void insertRejectsBlankEmail() {
    EmployeeForm form = new EmployeeForm("Bob", "Jones", "", "bobjones", "password123");

    assertThatThrownBy(() -> employeeService.insert(form))
            .isInstanceOf(InvalidInsertDetails.class);
}

@Test
void updateWithUnchangedUsernameSkipsUniquenessCheck() throws Exception {
    employeeService.insert(new EmployeeForm("User", "Eight", "user8@example.com", "user8", "pass"));
    EmployeeEntity saved = employeeRepository.findByUsername("user8").orElseThrow();

    // Submitting the same username as the current value must not throw ItemAlreadyExist
    assertThatCode(() -> employeeService.update(saved.getId(),
            new EmployeeForm("NewFirst", null, null, "user8", null)))
            .doesNotThrowAnyException();
}

@Test
void updatePreservesEmployeeRoleAfterUpdate() throws Exception {
    employeeService.insert(new EmployeeForm("User", "Nine", "user9@example.com", "user9", "pass"));
    EmployeeEntity saved = employeeRepository.findByUsername("user9").orElseThrow();

    employeeService.update(saved.getId(),
            new EmployeeForm("UpdatedFirst", null, null, null, null));

    EmployeeEntity after = employeeRepository.findByUsername("user9").orElseThrow();
    assertThat(after.getRoles()).containsOnly(UserRoles.EMPLOYEE);
}
```

#### Edge Cases

1. **`updateWithUnchangedUsernameSkipsUniquenessCheck` — why it could fail:** `EmployeeService.update()` checks `!form.getUsername().equals(toUpdate.getUsername())` before calling `baseUserRepository.existsByUsername()`. If this guard is absent, the existing-username would trigger a false-positive conflict. This test makes the guard's presence explicit.
2. **`updatePreservesEmployeeRoleAfterUpdate` — `EmployeeForm` has no roles field:** `EmployeeForm` contains only `firstName`, `lastName`, `email`, `username`, `password`. There is no way for a caller to supply roles. This test confirms the invariant from the opposite direction: after an update, `entity.getRoles()` still contains exactly `UserRoles.EMPLOYEE` — the service does not clear or modify roles during update.
3. **`insertRejectsNullEmail` and `insertRejectsBlankEmail` — service validates in one `if` condition:** `if (isBlank(form.getUsername()) || isBlank(form.getEmail()) || isBlank(form.getPassword()))` — a single short-circuit `||` covers all three fields. Adding two tests (null and blank) for email is deliberate: `isBlank()` handles both, but having both tests documents that the method treats null and empty-string as equivalent failures.

---

### Step 4: Add Supplemental Service Query Tests (Feature Step 5.4)

**Goal:** Verify that `EmployeeService.getListPage()` rejects three additional error conditions at the service layer: unsupported operators on boolean fields, invalid value types for the `id` field, and unknown sort fields.
**Dependencies:** `QueryPredicateBuilder` validates these conditions and throws `InvalidQueryRequestException`; `FilterOperator.CONTAINS` exists as a valid enum constant (confirmed from existing test `filtersSortsAndPaginatesEmployeeListDtos()` which uses `FilterOperator.CONTAINS`).

- [x] Open `EmployeeServiceListQueryIntegrationTest.java`
- [x] Add `import com.agentForgeBackend.shared.query.SortDirection;` if not already present (already imported)
- [x] Add 3 new `@Test` methods after the existing 4 (see implementation)
- [x] Run `./mvnw test -Dtest=EmployeeServiceListQueryIntegrationTest` — all 7 tests pass

**Why this step is critical:** `EmployeeQueryProfile` declares the same field types as `AdminQueryProfile`. The Admin controller tests already confirm these validation paths work through the HTTP layer for Admin. Adding service-layer tests for Employee confirms the `QueryPredicateBuilder` uses `EmployeeQueryProfile` correctly — that the profile's boolean, id, and sort configurations are wired up consistently with Admin.

#### Implementation

```java
// --- Step 5.4: Supplemental service query edge-case tests ---

@Test
void rejectsUnknownSortField() {
    PageableRequest request = ListQueryTestDataFactory.request(
            0,
            20,
            List.of(ListQueryTestDataFactory.sort("password", SortDirection.ASC)),
            List.of());

    assertThatThrownBy(() -> employeeService.getListPage(request))
            .isInstanceOf(InvalidQueryRequestException.class)
            .hasMessageContaining("password");
}

@Test
void unsupportedOperatorOnBooleanFieldThrowsInvalidQueryRequestException() {
    PageableRequest request = ListQueryTestDataFactory.request(
            0,
            20,
            List.of(),
            List.of(ListQueryTestDataFactory.filter("enabled", FilterOperator.CONTAINS, "true")));

    assertThatThrownBy(() -> employeeService.getListPage(request))
            .isInstanceOf(InvalidQueryRequestException.class)
            .hasMessageContaining("enabled");
}

@Test
void invalidIdValueTypeThrowsInvalidQueryRequestException() {
    PageableRequest request = ListQueryTestDataFactory.request(
            0,
            20,
            List.of(),
            List.of(ListQueryTestDataFactory.filter("id", FilterOperator.EQUALS, "not-a-number")));

    assertThatThrownBy(() -> employeeService.getListPage(request))
            .isInstanceOf(InvalidQueryRequestException.class)
            .hasMessageContaining("id");
}
```

#### Edge Cases

1. **`rejectsUnknownSortField` — sort on `"password"`:** The sort field goes through `EntityQueryProfile.requireField()` in `QueryPredicateBuilder.build()`. The `EmployeeQueryProfile.fields()` map does not include `"password"`, so `requireField("password")` throws `InvalidQueryRequestException` with message `"Unknown query field 'password'."`. The service-layer test exercises the same code path as the controller test, but independently — confirming the profile is correctly configured without relying on the HTTP deserialization layer.
2. **`unsupportedOperatorOnBooleanFieldThrowsInvalidQueryRequestException` — `FilterOperator.CONTAINS` on `"enabled"`:** `EmployeeQueryProfile.fields()` declares `"enabled"` as a `booleanField`. `QueryPredicateBuilder` rejects any operator other than `EQUALS` for boolean fields. `FilterOperator.CONTAINS` is a valid Java enum constant (used in the CONTAINS-string-filter test already passing), but the predicate builder refuses it for a boolean field.
3. **`invalidIdValueTypeThrowsInvalidQueryRequestException` — `"not-a-number"` as `Object` for `id` filter:** `ListQueryTestDataFactory.filter("id", FilterOperator.EQUALS, "not-a-number")` creates a `FilterOperationRequest` with `value = "not-a-number"` (a `String`). `EmployeeQueryProfile` declares `id` as a `QueryableField<EmployeeEntity, Long>` (number type). `QueryPredicateBuilder` tries to cast the value to `Long`, fails, and throws `InvalidQueryRequestException` with message `"Field 'id' requires a JSON number; received String."`.

---

### Step 5: Add Supplemental Controller Tests (Feature Steps 5.4/5.5)

**Goal:** Add four missing controller-level tests to bring `EmployeeControllerListEndpointTest` to parity with `AdminControllerListEndpointTest`. The four tests cover: unknown sort field, unsupported operator on boolean field, invalid id value type, and malformed operator enum string.
**Dependencies:** `EmployeeControllerListEndpointTest` already has the `queryRequest()` private helper method; all four tests use it or a raw JSON body string.

- [x] Open `EmployeeControllerListEndpointTest.java`
- [x] Add 4 new `@Test` methods after the existing 13 (see implementation)
- [x] Run `./mvnw test -Dtest=EmployeeControllerListEndpointTest` — all 17 tests pass

**Why this step is critical:** The Admin controller tests serve as the canonical validation of the shared query infrastructure at the HTTP layer. Employee endpoints use the same `QueryPredicateBuilder` + `GlobalExceptionHandler` pipeline. Adding parity tests for Employee confirms the pipeline responds identically regardless of which user domain is queried — and catches any Employee-specific configuration error (e.g., missing field in `EmployeeQueryProfile`) that the Admin tests would not expose.

#### Implementation

```java
// --- Steps 5.4/5.5: Supplemental controller query-validation tests ---

@Test
void unknownSortFieldReturnsBadRequest() throws Exception {
    String body = """
            {
              "sort": [ { "field": "password", "direction": "ASC" } ]
            }
            """;

    mockMvc.perform(post("/employee/list")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.status").value(400))
            .andExpect(jsonPath("$.error").value("Invalid Query Request"))
            .andExpect(jsonPath("$.message").value("Unknown query field 'password'."));
}

@Test
void unsupportedOperatorOnBooleanFieldReturnsBadRequest() throws Exception {
    mockMvc.perform(post("/employee/list")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(queryRequest("enabled", "CONTAINS", "true")))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.status").value(400))
            .andExpect(jsonPath("$.error").value("Invalid Query Request"))
            .andExpect(jsonPath("$.message").value("Operator CONTAINS is not supported for field 'enabled'."));
}

@Test
void invalidIdValueTypeReturnsBadRequest() throws Exception {
    mockMvc.perform(post("/employee/list")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(queryRequest("id", "EQUALS", "\"not-a-number\"")))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.status").value(400))
            .andExpect(jsonPath("$.error").value("Invalid Query Request"))
            .andExpect(jsonPath("$.message").value("Field 'id' requires a JSON number; received String."));
}

@Test
void malformedOperatorEnumReturnsBadRequest() throws Exception {
    mockMvc.perform(post("/employee/list")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(queryRequest("email", "MATCHES", "\"example.com\"")))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.status").value(400))
            .andExpect(jsonPath("$.error").value("Malformed Request"))
            .andExpect(jsonPath("$.message").value("Malformed request body."));
}
```

#### Edge Cases

1. **`malformedOperatorEnumReturnsBadRequest` — `"MATCHES"` is not a `FilterOperator` enum constant:** Jackson cannot deserialize `"MATCHES"` into the `FilterOperator` enum. It throws `HttpMessageNotReadableException`, which `GlobalExceptionHandler` maps to 400 with `error: "Malformed Request"` and `message: "Malformed request body."`. This is distinct from `InvalidQueryRequestException` (field/operator validation) — it's a deserialization failure, hence a different error shape.
2. **`unknownSortFieldReturnsBadRequest` uses a raw JSON body string (not `queryRequest()`):** The `queryRequest()` helper only builds a `filters` array. Sort rejection needs a `sort` array in the body. Using an inline JSON string is consistent with the same test in `AdminControllerListEndpointTest`.
3. **Error message exact strings:** The expected `$.message` values in all four tests are copied from the passing Admin controller tests. They must match exactly what `GlobalExceptionHandler` returns. If the Employee messages differ from Admin, it indicates an inconsistency in the exception handling configuration, not a test error.

---

### Step 6: Full Regression Run (Feature Step 5.6)

**Goal:** Confirm all Employee tests, all Admin tests, and all Client tests pass together under the hardened security configuration established in Task 1.
**Dependencies:** Steps 1–5 complete; all targeted tests passing individually.

- [x] Run `./mvnw test` from `backend/`
- [x] Confirm all non-Docker tests pass
- [x] Confirm the pre-existing `authServerApplicationTests.contextLoads` failure is the only failure (it requires Docker PostgreSQL host `db` and fails outside Docker Compose with `java.net.UnknownHostException: db`)
- [x] Confirm no regression in `SecurityAuthorizationTest`, `AdminControllerListEndpointTest`, `AdminServiceListQueryIntegrationTest`, `AdminRepositoryQuerydslIntegrationTest`, `ClientControllerListEndpointTest`, `ClientServiceListQueryIntegrationTest`, `ClientRepositoryQuerydslIntegrationTest`, `ClientRepositoryTest`, `EmployeeLoginJwtTest`, `AuthUserUtilTest`

**Why this step is critical:** Tasks 1–4 individually verified their targeted tests. This is the first run that exercises all test classes simultaneously in a single Spring Boot context. `@SpringBootTest` classes share a Spring application context cache when their configurations are identical — but `@DataJpaTest` classes use a different slice. Running the full suite catches any context-cache conflicts, bean definition ordering issues, or data isolation problems that single-test runs don't reveal.

---

## Design Decisions

**Decision 1: Add to existing test classes rather than creating new test files**
- **Why:** Task 5 is "supplemental depth" per the feature spec. Creating new test files for a handful of edge-case methods fragments the test suite — a reviewer would need to open two files to get a complete picture of, say, mapper contract behavior. Adding to existing classes keeps related tests co-located and consistent with the project's test organization (one test class per source module).
- **Alternatives considered:** Creating a separate `EmployeeMapperContractTest.java`. Rejected — the existing `EmployeeMapperTest.java` already tests the mapper contract; splitting it would suggest the new tests belong to a different concern when they don't.

**Decision 2: Use `employeeRepository.saveAndFlush()` for constraint violation tests, not `entityManager.persist()` + `flush()`**
- **Why:** `saveAndFlush()` routes through the Spring Data JPA wrapper, which translates `PersistenceException` to `DataIntegrityViolationException`. This is the same exception type callers outside tests would catch. `entityManager.persist()` + `entityManager.flush()` could surface as `PersistenceException` instead, which is a less specific assertion.
- **Alternatives considered:** Using `entityManager.persist()`. Rejected — inconsistent exception type makes the test harder to read and couples to JPA internals rather than the Spring abstraction layer.

**Decision 3: Test all three DTO null guards explicitly (Steps 5.2)**
- **Why:** The existing test suite has `toListDTO_nullEntityReturnsNull()` but not the equivalent for `toDTO` and `toSmallDTO`. All three methods have null guards in the source. Without tests, the guards for `toDTO` and `toSmallDTO` are invisible to the test suite — a refactor that accidentally removes them would be silent. Documenting the contract for all three is cheap and valuable.
- **Alternatives considered:** Only testing `toListDTO` null guard since it already exists. Rejected — asymmetric test coverage is confusing: "why is only one variant tested?"

**Decision 4: Service-layer query tests (Step 4) are not redundant with controller-layer tests (Step 5)**
- **Why:** Controller tests pass JSON through MockMvc, deserialization, Spring MVC dispatch, and the service. A controller test failure could be caused by any of these layers. Service-layer tests call `employeeService.getListPage()` directly with a Java `PageableRequest` object, isolating the `QueryPredicateBuilder` + `EmployeeQueryProfile` interaction. Both layers are worth testing because they have distinct failure modes.
- **Alternatives considered:** Only testing at the controller level (as Admin does). Rejected — Employee already has more service-layer coverage than Admin in `EmployeeServiceListQueryIntegrationTest`; adding three more tests for the three missing validator cases is consistent with the established Employee testing depth.

---

## Testing Considerations

### Automatic Validation

- [x] Run `./mvnw test -Dtest=EmployeeRepositoryTest` from `backend/` — all 12 tests pass (7 original + 5 new)
- [x] Run `./mvnw test -Dtest=EmployeeMapperTest` from `backend/` — all 15 tests pass (10 original + 5 new)
- [x] Run `./mvnw test -Dtest=EmployeeServiceCrudIntegrationTest` from `backend/` — all 21 tests pass (17 original + 4 new)
- [x] Run `./mvnw test -Dtest=EmployeeServiceListQueryIntegrationTest` from `backend/` — all 7 tests pass (4 original + 3 new)
- [x] Run `./mvnw test -Dtest=EmployeeControllerListEndpointTest` from `backend/` — all 17 tests pass (13 original + 4 new)
- [x] Run `./mvnw test -Dtest=SecurityAuthorizationTest,AdminControllerListEndpointTest,AdminServiceListQueryIntegrationTest,ClientControllerListEndpointTest,ClientServiceListQueryIntegrationTest` from `backend/` — all pass (regression for Task 1 hardening)
- [x] Run `./mvnw test -Dtest=EmployeeLoginJwtTest,AuthUserUtilTest` from `backend/` — all 18 tests pass (regression for Task 4)
- [x] Run `./mvnw test` from `backend/` — full suite exits non-zero only due to pre-existing `authServerApplicationTests.contextLoads` Docker/PostgreSQL blocker; all other tests pass

---

## Related Code Explanations

- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeService.java:75-84` — `insert()` validates `isBlank(username) || isBlank(email) || isBlank(password)` in one condition; `insertRejectsNullEmail()` and `insertRejectsBlankEmail()` cover the email branch of this guard
- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeService.java:115-119` — `update()` wraps username change in `!isBlank(form.getUsername()) && !form.getUsername().equals(toUpdate.getUsername())`; `updateWithUnchangedUsernameSkipsUniquenessCheck()` tests the equality guard
- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeService.java:100-133` — `update()` never calls `toUpdate.setRoles()`; `updatePreservesEmployeeRoleAfterUpdate()` documents this invariant
- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeMapper.java:14-26` — `toDTO()` null guard on line 15; `toDTO_nullEntityReturnsNull()` documents it
- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeMapper.java:87-95` — `mapAuthorities()` returns null when `roles == null`; used by all three `to*DTO` methods
- `backend/src/main/java/com/agentForgeBackend/shared/securityUser/BaseUserRepository.java` — `existsByUsername` and `existsByEmail` queried through `base_user` JOINED inheritance parent table; Steps 5.1 tests verify they see Employee rows correctly

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected for this task
- [x] Up-to-date documentation reviewed for the affected technologies
- [x] `EmployeeRepositoryTest.java` — 5 test methods added: `uniqueUsernameConstraintThrowsOnDuplicate`, `uniqueEmailConstraintThrowsOnDuplicate`, `baseUserRepositoryExistsByUsernameReturnsTrueForEmployee`, `baseUserRepositoryExistsByEmailReturnsTrueForEmployee`, `deletingEmployeeRemovesBaseUserRow`; `BaseUserRepository` injected
- [x] `EmployeeMapperTest.java` — 5 test methods added: `toListDTO_doesNotExposePasswordOrApiKey`, `toSmallDTO_doesNotExposePasswordOrApiKey`, `toListDTO_handlesNullDates`, `toDTO_nullEntityReturnsNull`, `toSmallDTO_nullEntityReturnsNull`
- [x] `EmployeeServiceCrudIntegrationTest.java` — 4 test methods added: `insertRejectsNullEmail`, `insertRejectsBlankEmail`, `updateWithUnchangedUsernameSkipsUniquenessCheck`, `updatePreservesEmployeeRoleAfterUpdate`
- [x] `EmployeeServiceListQueryIntegrationTest.java` — 3 test methods added: `rejectsUnknownSortField`, `unsupportedOperatorOnBooleanFieldThrowsInvalidQueryRequestException`, `invalidIdValueTypeThrowsInvalidQueryRequestException`
- [x] `EmployeeControllerListEndpointTest.java` — 4 test methods added: `unknownSortFieldReturnsBadRequest`, `unsupportedOperatorOnBooleanFieldReturnsBadRequest`, `invalidIdValueTypeReturnsBadRequest`, `malformedOperatorEnumReturnsBadRequest`
- [x] All 21 new test methods pass individually when run with `-Dtest=<ClassName>`
- [x] `./mvnw test` passes for all non-Docker tests; only `authServerApplicationTests.contextLoads` fails (pre-existing Docker PostgreSQL host `db` blocker)
- [x] No regression in Admin, Client, or existing Employee tests
- [x] Parent feature Phase 5 steps (5.1–5.6) can be marked complete
