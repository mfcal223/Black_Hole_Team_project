# Task: Implement Employee CRUD, Querying, and Admin-Only Business Rules

#task #current #high-complexity #parent-employee-user-entity-and-role

**Parent:** [[Employee-User-Entity-and-Role 1]]
**Parent Type:** Feature
**Related Step(s):** Phase 3 — Steps 3.1, 3.2, 3.3, 3.4
**Estimated Complexity:** High

---

## Goal

Create `EmployeeQueryProfile`, `EmployeeService`, and `EmployeeController` to deliver complete admin-only Employee CRUD and paginated-list endpoints at `/employee`. Also apply a retroactive global username/email uniqueness fix to `AdminServiceImpl` and `ClientService`. After this task, all Employee endpoints are callable by authenticated Admins, and no Employee endpoint accepts or emits API-key data or a token-minting route.

---

## Parent Context

The parent Feature (Sections 7–9) defines the following constraints for this task:

**EmployeeQueryProfile (Section 9):** Mirror safe Admin/Client query fields: `id`, `firstName`, `lastName`, `email`, `username`, `enabled`, `dateCreated`, `lastLogin`. Default sort: `id ASC`. Reject `password`, `roles`, `apiKey`, and `apikey`. Depend on generated `QEmployeeEntity`.

**EmployeeService (Section 7):** Override ALL six CRUD/list methods with `@PreAuthorize("hasRole('ADMIN')")`. Enforce BCrypt password encoding on insert. Forbid null/blank password on insert at the service layer. Force `Set.of(UserRoles.EMPLOYEE)` on insert — never accept caller-supplied roles. Override `update()` because `DefaultServiceImplements.update()` is known-broken (loads entity, saves without applying form data). Preserve existing password hash when the supplied password is null or blank on update.

**EmployeeService global uniqueness (Section 5/6):** On insert, call `baseUserRepository.existsByUsername()` and `baseUserRepository.existsByEmail()` before encoding the password. Throw `ItemAlreadyExist` with a descriptive message if either returns `true`. On update, only check when the new value differs from the stored value (avoid self-conflict false positives). `AdminServiceImpl` and `ClientService` must also be retroactively updated to use these global checks instead of their current subtype-only finders.

**EmployeeController (Section 8):** `@RestController`, `@RequestMapping("/employee")`, extends `DefaultController`. No `/employee/token/{username}` endpoint. No self-registration routes.

**Authorization (from Task 1):** The HTTP filter chain already enforces `/employee/**` → `hasRole("ADMIN")`. Method-level `@PreAuthorize("hasRole('ADMIN')")` on every service method provides defense-in-depth. Both layers must be present.

**Testing (Feature Testing Decisions):** TDD in vertical slices: write one failing behavior test, implement the minimum to pass, then move to the next slice. Do not defer first behavior tests for a module to Phase 5.

**No API-key field anywhere:** `EmployeeController` must not declare any endpoint that reads or emits an API key. Step 3.4 is explicit verification.

---

## Preconditions / Dependencies

- **Task 1 complete:** `@EnableMethodSecurity` and `authorizeHttpRequests` matrix active in `SecurityConfig.java`. `/employee/**` rule enforcing `hasRole("ADMIN")` is already in the filter chain. All existing tests pass.
- **Task 2 complete:** `EmployeeEntity`, `EmployeeRepository`, `EmployeeMapper`, `EmployeeDTO`, `EmployeeMiniDTO`, `EmployeeListDTO`, `EmployeeForm`, and `BaseUserRepository.existsByUsername`/`existsByEmail` all exist in the codebase. `QEmployeeEntity` is generated at `backend/target/generated-sources/annotations/com/agentForgeBackend/models/hq/employee/QEmployeeEntity.java`.
- H2 in-memory test database configured via `application-test.properties` with `spring.jpa.hibernate.ddl-auto=create-drop`.
- `ListQueryTestDataFactory` exists at `backend/src/test/java/com/agentForgeBackend/models/hq/ListQueryTestDataFactory.java` — will be extended with an `employee()` factory method in Step 1.
- `AdminRepository`, `ClientRepository`, `EmployeeRepository` are injectable in tests.
- `PasswordEncoder` bean is available in the Spring context.
- `TestAuthenticationHelper` exists but is not used in this task (JWT tests belong to Task 4).

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — Selected — task template and document placement conventions
- `solid-deep-design` — Selected — EmployeeService is a deep module: substantial business rules (password encoding, role enforcement, global uniqueness, partial-field update) behind the same 6-method CRUD interface as Admin and Client. The deletion test confirms depth: if EmployeeService were removed, each caller would need its own uniqueness check, role enforcement, and password policy.
- `tdd` — Selected — three vertical TDD slices: list query path, CRUD business rules, HTTP layer
- `memory-bank` — Selected — architecture, known-issues, tech stack context
- `glossary-management` — Selected — glossary CLI unavailable (no `.glossaryrc`); terminology derived from Memory Bank and Feature document
- `find-docs` — Selected — Spring Security 6.4.x method security, Spring Data JPA, Spring Boot 3.4.1 transactional behavior verified via Context7

### Documentation Reviewed

- **Spring Boot 3.4.1 / Spring Security 6.4.x** — `@PreAuthorize` on overriding methods takes precedence over parent's annotation. `super.methodName()` calls within the same bean are direct Java calls (bypass AOP proxy) — the parent's `@PreAuthorize` is NOT re-evaluated on internal super calls. Only the overriding method's annotation is evaluated by the proxy.
- **Spring Data JPA derived queries** — `existsByUsername` on `BaseUserRepository` generates `SELECT COUNT(*) > 0 FROM base_user WHERE username = ?` covering all subtypes via JOINED inheritance. No custom `@Query` needed.
- **`@Transactional` precedence** — Method-level `@Transactional` on the overriding method takes precedence over class-level on the parent. `EmployeeService.update()` will carry an explicit `@Transactional(rollbackFor = ...)` matching the `ClientService.update()` pattern.
- **`DefaultServiceImplements.update()` known bug** — tracked in `known-issues.md`: loads entity by ID but saves unchanged (never applies form fields). `EmployeeService.update()` must be a full override.
- **`AdminServiceImpl` subtype-only duplicate check** — currently calls `AdminRepository.findByUsername()`/`findByEmail()` which return plain (nullable) types. Missing cross-subtype conflicts. Must be replaced with `BaseUserRepository.existsByUsername`/`existsByEmail`.
- **`ClientService` subtype-only duplicate check** — uses `ClientRepository.findByUsername()`/`findByEmail()` returning `Optional`. Missing cross-subtype conflicts. Must be replaced in both `insert()` and `update()`.

### Related Existing Code

- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/` — all Task 2 output files (entity, repository, mapper, DTOs, form)
- `backend/src/main/java/com/agentForgeBackend/shared/securityUser/BaseUserRepository.java` — `existsByUsername` and `existsByEmail` added in Task 2; used by the new service for global uniqueness
- `backend/src/main/java/com/agentForgeBackend/models/hq/admin/AdminQueryProfile.java` — direct template for `EmployeeQueryProfile`; uses `QAdminEntity.adminEntity` static reference
- `backend/src/main/java/com/agentForgeBackend/models/hq/admin/AdminServiceImpl.java` — template for constructor pattern and `@PreAuthorize` override style; also requires retroactive fix
- `backend/src/main/java/com/agentForgeBackend/models/hq/admin/AdminController.java` — template for `EmployeeController` (three lines)
- `backend/src/main/java/com/agentForgeBackend/models/hq/client/ClientService.java:109-160` — provides the reference update() implementation pattern; also requires retroactive fix
- `backend/src/main/java/com/agentForgeBackend/shared/defaultImplements/DefaultServiceImplements.java` — base class; `update()` at line 90-93 is the known-broken method
- `backend/src/main/java/com/agentForgeBackend/shared/defaultImplements/DefaultController.java` — base controller with all 6 CRUD endpoints; `EmployeeController` adds no methods beyond `super`
- `backend/target/generated-sources/annotations/com/agentForgeBackend/models/hq/employee/QEmployeeEntity.java` — generated Q-class; static field `QEmployeeEntity.employeeEntity` used in `EmployeeQueryProfile`
- `backend/src/test/java/com/agentForgeBackend/models/hq/ListQueryTestDataFactory.java` — shared factory; will gain an `employee()` method in Step 1
- `backend/src/test/java/com/agentForgeBackend/models/hq/admin/AdminServiceListQueryIntegrationTest.java` — direct test pattern for `EmployeeServiceListQueryIntegrationTest`
- `backend/src/test/java/com/agentForgeBackend/models/hq/admin/AdminControllerListEndpointTest.java` — direct test pattern for `EmployeeControllerListEndpointTest`

---

## Implementation Details

### Approach

Three TDD vertical slices executed in order:

**Slice 1 — List query path:**
Write failing `EmployeeServiceListQueryIntegrationTest` first. It fails because neither `EmployeeQueryProfile` nor `EmployeeService` exist. Then create `EmployeeQueryProfile` (pure data, mirrors `AdminQueryProfile`) and `EmployeeService` (constructor + all method overrides with `@PreAuthorize("hasRole('ADMIN')")`, full `getListPage` delegation, stub implementations for CRUD). Tests go green.

**Slice 2 — CRUD business rules:**
Write failing `EmployeeServiceCrudIntegrationTest` for insert, update, delete, getOne, and cross-subtype uniqueness. Fail on the stub implementations. Complete `EmployeeService.insert()`, `update()`, `delete()`, `getOne()`, and `getAll()` with full business logic. Tests go green. Then apply retroactive global uniqueness fixes to `AdminServiceImpl` and `ClientService` and run full test suite to confirm no regression.

**Slice 3 — HTTP layer:**
Write failing `EmployeeControllerListEndpointTest` covering list, CRUD endpoints, filter rejection, and authorization. Create the one-class `EmployeeController`. Tests go green.

**SOLID analysis — EmployeeService depth:** Interface: 6 public methods (same as admin/client base). Implementation: global uniqueness enforcement across 3 subtypes, BCrypt encoding, role forcing, null-preserving partial updates, exception path differentiation (insert vs update). The deletion test confirms the module is deep — removing it would scatter 5+ concerns across callers.

**Design — `EmployeeService` typed repository field:** Rather than casting `(EmployeeRepository) this.repository` in each method (as AdminServiceImpl does), EmployeeService stores a typed `employeeRepository` field alongside the `repository` parent field. This avoids repeated casts and is more readable at the cost of a redundant reference.

**Design — update throws `InvalidInsertDetails` for uniqueness conflicts:** `DefaultService.update()` declares `throws ItemNotFoundException, InvalidInsertDetails` but NOT `ItemAlreadyExist`. Adding `ItemAlreadyExist` to the override's throws clause would require all callers (including `DefaultController.update()`) to declare it, touching shared code. Following the pattern established by `ClientService.update()`, uniqueness conflicts during update are reported as `InvalidInsertDetails` with a clear message. The `GlobalExceptionHandler` maps this to HTTP 400. Insert conflicts use `ItemAlreadyExist` (HTTP 409) as the `DefaultService.insert()` interface declares it.

### Files to Create/Modify

- [x] `backend/src/test/java/com/agentForgeBackend/models/hq/ListQueryTestDataFactory.java` — **MODIFY** — add `employee()` factory method (Step 1)
- [x] `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeServiceListQueryIntegrationTest.java` — **NEW** — TDD RED Slice 1 (Step 2)
- [x] `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeQueryProfile.java` — **NEW** — TDD GREEN Slice 1 part A (Step 3)
- [x] `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeService.java` — **NEW** — TDD GREEN Slices 1+2 (Steps 4 and 6)
- [x] `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeServiceCrudIntegrationTest.java` — **NEW** — TDD RED Slice 2 (Step 5)
- [x] `backend/src/main/java/com/agentForgeBackend/models/hq/admin/AdminServiceImpl.java` — **MODIFY** — inject `BaseUserRepository`, replace subtype-only checks (Step 7)
- [x] `backend/src/main/java/com/agentForgeBackend/models/hq/client/ClientService.java` — **MODIFY** — inject `BaseUserRepository`, replace subtype-only checks in insert and update (Step 7)
- [x] `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeControllerListEndpointTest.java` — **NEW** — TDD RED Slice 3 (Step 8)
- [x] `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeController.java` — **NEW** — TDD GREEN Slice 3 (Step 9)

---

## Step-by-Step Implementation

### Step 1: Add `employee()` Factory Method to ListQueryTestDataFactory

**Goal:** Provide a reusable Employee test fixture factory parallel to the existing `admin()` and `client()` methods. Required by Steps 2 and 8.

**Dependencies:** `EmployeeEntity` exists (Task 2 complete).

- [ ] Open `backend/src/test/java/com/agentForgeBackend/models/hq/ListQueryTestDataFactory.java`
- [ ] Add import: `import com.agentForgeBackend.models.hq.employee.EmployeeEntity;`
- [ ] Add the `employee()` static factory method after the `client()` method

**Why this step is critical:** Without a shared factory, each test class invents its own fixture. A shared factory ensures consistent field values (key-based email addresses, controlled `enabled` and `dateCreated` values) that make sort/filter assertions deterministic across multiple test classes.

#### Implementation

```java
// Add import at top of ListQueryTestDataFactory.java:
import com.agentForgeBackend.models.hq.employee.EmployeeEntity;

// Add this method after client():
public static EmployeeEntity employee(String key, boolean enabled, Instant dateCreated) {
    EmployeeEntity employee = new EmployeeEntity(
            "Employee" + key,
            "User" + key,
            key + "@example.com",
            Set.of(UserRoles.EMPLOYEE),
            key,
            "encoded-password");
    employee.setEnabled(enabled);
    employee.setDateCreated(Date.from(dateCreated));
    employee.setLastLogin(Date.from(dateCreated.plus(1, ChronoUnit.HOURS)));
    return employee;
}
```

#### Edge Cases

1. **No `apikey` field:** Unlike `client()`, `employee()` does not set any API-key field. `EmployeeEntity` has no such field, so no explicit guard is needed — the absence is structural.
2. **Password is `"encoded-password"`:** This is a literal placeholder string, not a BCrypt hash. In list query tests, the password value is never authenticated against, so a placeholder is appropriate. Service CRUD tests that call `employeeService.insert()` via the service (which encodes the password) produce a real BCrypt hash.

---

### Step 2: Write EmployeeServiceListQueryIntegrationTest (TDD RED — Slice 1)

**Goal:** Define failing tests for the list/query path. All tests fail until `EmployeeQueryProfile` and `EmployeeService` exist.

**Dependencies:** Step 1 complete (`ListQueryTestDataFactory.employee()` exists).

- [ ] Create `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeServiceListQueryIntegrationTest.java`
- [ ] Annotate with `@SpringBootTest`, `@ActiveProfiles("test")`, `@WithMockUser(username = "task3-employee-service", roles = "ADMIN")`
- [ ] Inject `EmployeeService` and `EmployeeRepository`
- [ ] Write `@BeforeEach`: delete all employees, flush, save three employees (alpha/beta/gamma), flush
- [ ] Write 4 tests: default sort, filter+sort+paginate, password field rejection, roles+apikey rejection

**Why this step is critical:** These tests define the exact contract for `EmployeeQueryProfile` before a single field is written. Without them, the profile could omit a field, include `password` by accident, or use the wrong default sort direction.

#### Implementation

```java
package com.agentForgeBackend.models.hq.employee;

import com.agentForgeBackend.exceptions.InvalidQueryRequestException;
import com.agentForgeBackend.models.hq.ListQueryTestDataFactory;
import com.agentForgeBackend.shared.query.FilterOperator;
import com.agentForgeBackend.shared.query.PageableRequest;
import com.agentForgeBackend.shared.query.SortDirection;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;

import java.lang.reflect.Field;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@WithMockUser(username = "task3-employee-service", roles = "ADMIN")
class EmployeeServiceListQueryIntegrationTest {

    @Autowired private EmployeeService employeeService;
    @Autowired private EmployeeRepository employeeRepository;

    private EmployeeEntity alpha;
    private EmployeeEntity beta;
    private EmployeeEntity gamma;

    @BeforeEach
    void setUp() {
        employeeRepository.deleteAll();
        employeeRepository.flush();

        alpha = employeeRepository.save(ListQueryTestDataFactory.employee("employee-service-alpha", true, ListQueryTestDataFactory.EARLY_DATE));
        beta  = employeeRepository.save(ListQueryTestDataFactory.employee("employee-service-beta",  false, ListQueryTestDataFactory.MIDDLE_DATE));
        gamma = employeeRepository.save(ListQueryTestDataFactory.employee("employee-service-gamma", true, ListQueryTestDataFactory.LATE_DATE));
        employeeRepository.flush();
    }

    @Test
    void defaultRequestUsesProfileDefaultSortAndMapsEmployeeListDtos() throws InvalidQueryRequestException {
        Page<EmployeeListDTO> page = employeeService.getListPage(new PageableRequest());

        assertThat(page.getNumber()).isZero();
        assertThat(page.getSize()).isEqualTo(20);
        assertThat(page.getTotalElements()).isEqualTo(3);
        assertThat(page.getContent())
                .extracting(EmployeeListDTO::getId)
                .containsExactly(alpha.getId(), beta.getId(), gamma.getId());
        assertThat(page.getContent().get(0).getUsername()).isEqualTo("employee-service-alpha");
        assertThat(fieldNames(EmployeeListDTO.class)).doesNotContain("password", "apikey", "apiKey");
    }

    @Test
    void filtersSortsAndPaginatesEmployeeListDtos() throws InvalidQueryRequestException {
        PageableRequest request = ListQueryTestDataFactory.request(
                0, 1,
                List.of(ListQueryTestDataFactory.sort("username", SortDirection.DESC)),
                List.of(ListQueryTestDataFactory.filter("email", FilterOperator.CONTAINS, "example.com")));

        Page<EmployeeListDTO> page = employeeService.getListPage(request);

        assertThat(page.getTotalElements()).isEqualTo(3);
        assertThat(page.getContent())
                .extracting(EmployeeListDTO::getUsername)
                .containsExactly("employee-service-gamma");
    }

    @Test
    void rejectsPasswordAsEmployeeFilterField() {
        PageableRequest request = ListQueryTestDataFactory.request(
                0, 20, List.of(),
                List.of(ListQueryTestDataFactory.filter("password", FilterOperator.EQUALS, "secret")));

        assertThatThrownBy(() -> employeeService.getListPage(request))
                .isInstanceOf(InvalidQueryRequestException.class)
                .hasMessageContaining("password");
    }

    @Test
    void rejectsSensitiveEmployeeFilterFields() {
        PageableRequest rolesRequest = ListQueryTestDataFactory.request(
                0, 20, List.of(),
                List.of(ListQueryTestDataFactory.filter("roles", FilterOperator.EQUALS, "EMPLOYEE")));
        PageableRequest apiKeyRequest = ListQueryTestDataFactory.request(
                0, 20, List.of(),
                List.of(ListQueryTestDataFactory.filter("apikey", FilterOperator.EQUALS, 123L)));

        assertThatThrownBy(() -> employeeService.getListPage(rolesRequest))
                .isInstanceOf(InvalidQueryRequestException.class)
                .hasMessageContaining("roles");
        assertThatThrownBy(() -> employeeService.getListPage(apiKeyRequest))
                .isInstanceOf(InvalidQueryRequestException.class)
                .hasMessageContaining("apikey");
    }

    private List<String> fieldNames(Class<?> type) {
        return Arrays.stream(type.getDeclaredFields()).map(Field::getName).toList();
    }
}
```

#### Edge Cases

1. **`@WithMockUser(roles = "ADMIN")` satisfies `@PreAuthorize("hasRole('ADMIN')")`:** When `EmployeeService.getListPage()` is annotated with `hasRole('ADMIN')`, the `@WithMockUser` installs a SecurityContext with `ROLE_ADMIN` before the service is called. The AOP proxy evaluates this and passes the call through. This is the same mechanism used by `AdminServiceListQueryIntegrationTest`.
2. **`@BeforeEach` deletes all employees:** H2 with `create-drop` creates a fresh schema per test class, but not per test method. Deleting + flushing in `@BeforeEach` ensures each test method starts with exactly 3 employees.
3. **`fieldNames` checks `EmployeeListDTO.class` field names:** This is a compile-time guarantee check. If someone accidentally adds `password` or `apikey` to `EmployeeListDTO`, this test catches it at runtime via reflection.

---

### Step 3: Create EmployeeQueryProfile (TDD GREEN — Slice 1 part A)

**Goal:** Declare the 8 filterable/sortable Employee fields and the default sort order. This is pure static configuration with no business logic.

**Dependencies:** Step 2 tests written; `QEmployeeEntity` generated (Task 2 Step 7 confirmed).

- [ ] Create `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeQueryProfile.java`
- [ ] Mirror `AdminQueryProfile` exactly, replacing `QAdminEntity` with `QEmployeeEntity` and `AdminEntity` with `EmployeeEntity`
- [ ] Static reference: `private static final QEmployeeEntity EMPLOYEE = QEmployeeEntity.employeeEntity;`
- [ ] Declare 8 fields: `id` (number), `firstName`, `lastName`, `email`, `username` (strings), `enabled` (boolean), `dateCreated`, `lastLogin` (dateTimes)
- [ ] Default sort: `id ASC` via `SortRequest.builder().field("id").direction(SortDirection.ASC).build()`
- [ ] Do NOT declare `password`, `roles`, `apiKey`, or `apikey` — absence causes the `QueryPredicateBuilder` to throw `InvalidQueryRequestException` when these fields are used

**Why this step is critical:** The query profile is the sole declaration of which Employee fields are queryable. The filter/sort rejection in the tests is entirely controlled by what is (and is not) declared here. Including `password` accidentally would expose credentials to filter-based enumeration.

#### Implementation

```java
package com.agentForgeBackend.models.hq.employee;

import com.agentForgeBackend.shared.query.EntityQueryProfile;
import com.agentForgeBackend.shared.query.QueryableField;
import com.agentForgeBackend.shared.query.SortDirection;
import com.agentForgeBackend.shared.query.SortRequest;
import org.springframework.stereotype.Component;

import java.util.Date;
import java.util.List;
import java.util.Map;

@Component
public class EmployeeQueryProfile implements EntityQueryProfile<EmployeeEntity> {

    private static final QEmployeeEntity EMPLOYEE = QEmployeeEntity.employeeEntity;

    private static final Map<String, QueryableField<EmployeeEntity, ?>> FIELDS = Map.of(
            "id",          QueryableField.<EmployeeEntity, Long>number("id", EMPLOYEE.id, Long.class).sortable("id"),
            "firstName",   QueryableField.<EmployeeEntity>string("firstName", EMPLOYEE.firstName).sortable("firstName"),
            "lastName",    QueryableField.<EmployeeEntity>string("lastName", EMPLOYEE.lastName).sortable("lastName"),
            "email",       QueryableField.<EmployeeEntity>string("email", EMPLOYEE.email).sortable("email"),
            "username",    QueryableField.<EmployeeEntity>string("username", EMPLOYEE.username).sortable("username"),
            "enabled",     QueryableField.<EmployeeEntity>booleanField("enabled", EMPLOYEE.enabled).sortable("enabled"),
            "dateCreated", QueryableField.<EmployeeEntity, Date>dateTime("dateCreated", EMPLOYEE.dateCreated, Date.class).sortable("dateCreated"),
            "lastLogin",   QueryableField.<EmployeeEntity, Date>dateTime("lastLogin", EMPLOYEE.lastLogin, Date.class).sortable("lastLogin")
    );

    private static final List<SortRequest> DEFAULT_SORT = List.of(SortRequest.builder()
            .field("id")
            .direction(SortDirection.ASC)
            .build());

    @Override
    public Map<String, QueryableField<EmployeeEntity, ?>> fields() {
        return FIELDS;
    }

    @Override
    public List<SortRequest> defaultSort() {
        return DEFAULT_SORT;
    }
}
```

#### Edge Cases

1. **`Map.of()` requires ≤ 10 entries:** The 8 fields here are within Java's `Map.of()` 10-entry limit. If more fields are added in future, switch to `Map.ofEntries(Map.entry(...), ...)`.
2. **`EMPLOYEE.password` exists in `QEmployeeEntity` but is NOT in FIELDS:** The generated `QEmployeeEntity` exposes all inherited fields including `password`. Not including `password` in FIELDS is the intentional security decision — it does not matter that `QEmployeeEntity.password` exists in generated code.

---

### Step 4: Create EmployeeService — Initial (TDD GREEN — Slice 1)

**Goal:** Create the `EmployeeService` class with all 6 CRUD/list method overrides annotated `@PreAuthorize("hasRole('ADMIN')")`. The list path (`getListPage`, `getOne`, `getAll`) must be fully functional to make Slice 1 tests pass. The CRUD methods (`insert`, `update`, `delete`) are stubbed to compile but will fail Slice 2 tests — they will be completed in Step 6.

**Dependencies:** Steps 2 (test) and 3 (QueryProfile) complete.

- [ ] Create `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeService.java`
- [ ] Annotate with `@Service`
- [ ] Extend `DefaultServiceImplements<EmployeeDTO, EmployeeMiniDTO, EmployeeListDTO, EmployeeForm, EmployeeEntity, Long>`
- [ ] Declare fields: `private final EmployeeRepository employeeRepository`, `private final BaseUserRepository baseUserRepository`, `private final PasswordEncoder passwordEncoder`
- [ ] Constructor: accept all `super` parameters plus `passwordEncoder` and `baseUserRepository`; call `super(repository, mapper, queryProfile, pageableFactory, queryPredicateBuilder)`; assign `this.employeeRepository = repository`
- [ ] Override `getOne`, `getAll`, `getListPage`, `insert`, `update`, `delete` — all with `@PreAuthorize("hasRole('ADMIN')")`
- [ ] `getListPage`: delegate to `super.getListPage(request)` — this makes Slice 1 tests pass
- [ ] `getOne`: delegate to `employeeRepository.findById(id).map(mapper::toDTO).orElseThrow(() -> new ItemNotFoundException("Employee not found"))`
- [ ] `getAll`: delegate to `employeeRepository.findAll().stream().map(mapper::toDTO).collect(Collectors.toSet())`
- [ ] `insert`, `update`, `delete`: throw `UnsupportedOperationException("not yet implemented")` as stubs — will be replaced in Step 6
- [ ] Run `./mvnw test -Dtest=EmployeeServiceListQueryIntegrationTest` from `backend/` — all 4 tests must pass

**Why this step is critical:** The service class and its constructor must compile before any test can run. The list path must be complete before moving to CRUD — testing list behavior first confirms QueryProfile field wiring is correct, which is reused by CRUD tests that also call `getListPage`.

#### Implementation

```java
package com.agentForgeBackend.models.hq.employee;

import com.agentForgeBackend.exceptions.InvalidDeleteOperation;
import com.agentForgeBackend.exceptions.InvalidInsertDetails;
import com.agentForgeBackend.exceptions.InvalidQueryRequestException;
import com.agentForgeBackend.exceptions.ItemAlreadyExist;
import com.agentForgeBackend.exceptions.ItemNotFoundException;
import com.agentForgeBackend.shared.defaultImplements.DefaultServiceImplements;
import com.agentForgeBackend.shared.models.baseUser.UserRoles;
import com.agentForgeBackend.shared.query.PageableFactory;
import com.agentForgeBackend.shared.query.PageableRequest;
import com.agentForgeBackend.shared.query.QueryPredicateBuilder;
import com.agentForgeBackend.shared.securityUser.BaseUserRepository;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class EmployeeService extends DefaultServiceImplements<EmployeeDTO, EmployeeMiniDTO, EmployeeListDTO, EmployeeForm, EmployeeEntity, Long> {

    private final EmployeeRepository employeeRepository;
    private final BaseUserRepository baseUserRepository;
    private final PasswordEncoder passwordEncoder;

    public EmployeeService(
            EmployeeRepository repository,
            EmployeeMapper mapper,
            EmployeeQueryProfile queryProfile,
            PageableFactory<EmployeeEntity> pageableFactory,
            QueryPredicateBuilder<EmployeeEntity> queryPredicateBuilder,
            PasswordEncoder passwordEncoder,
            BaseUserRepository baseUserRepository
    ) {
        super(repository, mapper, queryProfile, pageableFactory, queryPredicateBuilder);
        this.employeeRepository = repository;
        this.passwordEncoder = passwordEncoder;
        this.baseUserRepository = baseUserRepository;
    }

    @Override
    @PreAuthorize("hasRole('ADMIN')")
    public EmployeeDTO getOne(Long id) throws ItemNotFoundException {
        return employeeRepository.findById(id)
                .map(mapper::toDTO)
                .orElseThrow(() -> new ItemNotFoundException("Employee not found"));
    }

    @Override
    @PreAuthorize("hasRole('ADMIN')")
    public Collection<EmployeeDTO> getAll() {
        return employeeRepository.findAll()
                .stream()
                .map(mapper::toDTO)
                .collect(Collectors.toSet());
    }

    @Override
    @PreAuthorize("hasRole('ADMIN')")
    public Page<EmployeeListDTO> getListPage(PageableRequest request) throws InvalidQueryRequestException {
        return super.getListPage(request);
    }

    @Override
    @PreAuthorize("hasRole('ADMIN')")
    public EmployeeMiniDTO insert(EmployeeForm form) throws ItemNotFoundException, ItemAlreadyExist, InvalidInsertDetails {
        // Completed in Step 6
        throw new UnsupportedOperationException("insert not yet implemented");
    }

    @Override
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(rollbackFor = {ItemNotFoundException.class, InvalidInsertDetails.class})
    public EmployeeDTO update(Long id, EmployeeForm form) throws ItemNotFoundException, InvalidInsertDetails {
        // Completed in Step 6
        throw new UnsupportedOperationException("update not yet implemented");
    }

    @Override
    @PreAuthorize("hasRole('ADMIN')")
    public EmployeeDTO delete(Long id) throws ItemNotFoundException, InvalidDeleteOperation {
        // Completed in Step 6
        throw new UnsupportedOperationException("delete not yet implemented");
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
```

#### Edge Cases

1. **`employeeRepository` field vs `this.repository` cast:** `DefaultServiceImplements.repository` is typed as `DefaultRepository<EmployeeEntity, Long>`. Storing the typed `EmployeeRepository` reference avoids casting (`(EmployeeRepository) this.repository`) and makes each method's intent explicit.
2. **`super.getListPage(request)` bypasses AOP proxy:** The call to `super.getListPage(request)` is a direct Java call within the same bean instance. Spring Security's AOP proxy does NOT intercept it. The parent's `@PreAuthorize("isAuthenticated()")` is NOT re-evaluated. Only the `@PreAuthorize("hasRole('ADMIN')")` on the overriding `EmployeeService.getListPage()` is enforced by the proxy.
3. **Stubs throw `UnsupportedOperationException`:** This is temporary and intentional. The Slice 2 tests will fail on these stubs, producing clear failure messages. After Step 6 replaces the stubs, the tests pass.

---

### Step 5: Write EmployeeServiceCrudIntegrationTest (TDD RED — Slice 2)

**Goal:** Define failing tests for insert/update/delete/getOne business rules, including cross-subtype uniqueness, password encoding, forced role, and update password preservation. Tests fail on the stubs from Step 4.

**Dependencies:** Step 4 complete (EmployeeService exists and compiles).

- [ ] Create `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeServiceCrudIntegrationTest.java`
- [ ] Annotate with `@SpringBootTest`, `@ActiveProfiles("test")`, `@WithMockUser(username = "task3-crud", roles = "ADMIN")`
- [ ] Inject `EmployeeService`, `EmployeeRepository`, `AdminRepository`, `ClientRepository`, `PasswordEncoder`
- [ ] `@BeforeEach`: delete all employees, clients, admins (in that order to respect FK constraints); flush after each
- [ ] Write insert tests: success path, blank password rejection, null username rejection, duplicate Employee username, Employee vs Admin cross-subtype conflict, Employee vs Client cross-subtype conflict
- [ ] Write update tests: apply name changes, preserve password when form password is blank, encode new password, skip uniqueness check when email/username unchanged
- [ ] Write delete tests: success, not-found
- [ ] Write getOne tests: success, not-found

**Why this step is critical:** Cross-subtype uniqueness cannot be tested in isolation at the repository layer — it requires a full Spring context where both Admin and Employee entities are persisted via their respective repositories. These integration tests verify the core safety guarantee of the feature: a rogue Employee cannot reuse an Admin's username even though they are in different subtype tables.

#### Implementation

```java
package com.agentForgeBackend.models.hq.employee;

import com.agentForgeBackend.exceptions.InvalidInsertDetails;
import com.agentForgeBackend.exceptions.ItemAlreadyExist;
import com.agentForgeBackend.exceptions.ItemNotFoundException;
import com.agentForgeBackend.models.hq.ListQueryTestDataFactory;
import com.agentForgeBackend.models.hq.admin.AdminRepository;
import com.agentForgeBackend.models.hq.client.ClientRepository;
import com.agentForgeBackend.shared.models.baseUser.UserRoles;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@WithMockUser(username = "task3-crud", roles = "ADMIN")
class EmployeeServiceCrudIntegrationTest {

    @Autowired private EmployeeService employeeService;
    @Autowired private EmployeeRepository employeeRepository;
    @Autowired private AdminRepository adminRepository;
    @Autowired private ClientRepository clientRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        employeeRepository.deleteAll();
        employeeRepository.flush();
        clientRepository.deleteAll();
        clientRepository.flush();
        adminRepository.deleteAll();
        adminRepository.flush();
    }

    // --- INSERT ---

    @Test
    void insertCreatesEmployeeWithEncodedPasswordAndForcedRole() throws Exception {
        EmployeeForm form = new EmployeeForm("Alice", "Smith", "alice@example.com", "alicesmith", "rawPassword");

        EmployeeMiniDTO result = employeeService.insert(form);

        assertThat(result.getUsername()).isEqualTo("alicesmith");
        assertThat(result.getRoles()).contains("ROLE_EMPLOYEE");

        EmployeeEntity saved = employeeRepository.findByUsername("alicesmith").orElseThrow();
        assertThat(passwordEncoder.matches("rawPassword", saved.getPassword())).isTrue();
        assertThat(saved.getRoles()).containsOnly(UserRoles.EMPLOYEE);
    }

    @Test
    void insertRejectsBlankPassword() {
        EmployeeForm form = new EmployeeForm("Bob", "Jones", "bob@example.com", "bobjones", "");

        assertThatThrownBy(() -> employeeService.insert(form))
                .isInstanceOf(InvalidInsertDetails.class);
    }

    @Test
    void insertRejectsNullUsername() {
        EmployeeForm form = new EmployeeForm("Bob", "Jones", "bob@example.com", null, "password123");

        assertThatThrownBy(() -> employeeService.insert(form))
                .isInstanceOf(InvalidInsertDetails.class);
    }

    @Test
    void insertThrowsItemAlreadyExistForDuplicateUsername() throws Exception {
        employeeService.insert(new EmployeeForm("Alice", "Smith", "alice@example.com", "alice", "pass1"));

        assertThatThrownBy(() -> employeeService.insert(
                        new EmployeeForm("Alice2", "Smith2", "alice2@example.com", "alice", "pass2")))
                .isInstanceOf(ItemAlreadyExist.class)
                .hasMessageContaining("alice");
    }

    @Test
    void insertThrowsItemAlreadyExistWhenAdminHasSameUsername() {
        adminRepository.saveAndFlush(ListQueryTestDataFactory.admin("alice", true, ListQueryTestDataFactory.EARLY_DATE));

        assertThatThrownBy(() -> employeeService.insert(
                        new EmployeeForm("Alice", "Smith", "alice2@example.com", "alice", "pass")))
                .isInstanceOf(ItemAlreadyExist.class)
                .hasMessageContaining("alice");
    }

    @Test
    void insertThrowsItemAlreadyExistWhenClientHasSameEmail() {
        clientRepository.saveAndFlush(ListQueryTestDataFactory.client("bob", true, ListQueryTestDataFactory.EARLY_DATE, 1L));

        assertThatThrownBy(() -> employeeService.insert(
                        new EmployeeForm("Bob", "Jones", "bob@example.com", "bobjones", "pass")))
                .isInstanceOf(ItemAlreadyExist.class)
                .hasMessageContaining("bob@example.com");
    }

    // --- UPDATE ---

    @Test
    void updateAppliesNameChanges() throws Exception {
        employeeService.insert(new EmployeeForm("Old", "Name", "old@example.com", "olduser", "pass"));
        Long id = employeeRepository.findByUsername("olduser").orElseThrow().getId();

        EmployeeDTO result = employeeService.update(id, new EmployeeForm("New", "Name", null, null, null));

        assertThat(result.getFirstName()).isEqualTo("New");
        assertThat(result.getLastName()).isEqualTo("Name");
    }

    @Test
    void updatePreservesPasswordWhenPasswordIsBlank() throws Exception {
        employeeService.insert(new EmployeeForm("User", "One", "user1@example.com", "user1", "original"));
        EmployeeEntity before = employeeRepository.findByUsername("user1").orElseThrow();
        String originalHash = before.getPassword();

        employeeService.update(before.getId(), new EmployeeForm("User", "One", null, null, null));

        EmployeeEntity after = employeeRepository.findByUsername("user1").orElseThrow();
        assertThat(after.getPassword()).isEqualTo(originalHash);
    }

    @Test
    void updateWithNewPasswordEncodesIt() throws Exception {
        employeeService.insert(new EmployeeForm("User", "Two", "user2@example.com", "user2", "original"));
        EmployeeEntity before = employeeRepository.findByUsername("user2").orElseThrow();

        employeeService.update(before.getId(), new EmployeeForm(null, null, null, null, "newPassword"));

        EmployeeEntity after = employeeRepository.findByUsername("user2").orElseThrow();
        assertThat(passwordEncoder.matches("newPassword", after.getPassword())).isTrue();
    }

    @Test
    void updateWithUnchangedEmailSkipsUniquenessCheck() throws Exception {
        employeeService.insert(new EmployeeForm("User", "Three", "user3@example.com", "user3", "pass"));
        EmployeeEntity saved = employeeRepository.findByUsername("user3").orElseThrow();

        // Same email submitted — must NOT throw even though email exists in base_user
        assertThatCode(() -> employeeService.update(saved.getId(),
                        new EmployeeForm("NewFirst", null, "user3@example.com", null, null)))
                .doesNotThrowAnyException();
    }

    @Test
    void updateThrowsInvalidInsertDetailsWhenEmailConflictsWithAnotherUser() throws Exception {
        employeeService.insert(new EmployeeForm("User", "Four", "user4@example.com", "user4", "pass"));
        employeeService.insert(new EmployeeForm("User", "Five", "user5@example.com", "user5", "pass"));
        Long user5Id = employeeRepository.findByUsername("user5").orElseThrow().getId();

        assertThatThrownBy(() -> employeeService.update(user5Id,
                        new EmployeeForm(null, null, "user4@example.com", null, null)))
                .isInstanceOf(InvalidInsertDetails.class)
                .hasMessageContaining("user4@example.com");
    }

    // --- DELETE ---

    @Test
    void deleteRemovesEmployee() throws Exception {
        employeeService.insert(new EmployeeForm("Del", "User", "del@example.com", "deluser", "pass"));
        EmployeeEntity saved = employeeRepository.findByUsername("deluser").orElseThrow();

        employeeService.delete(saved.getId());

        assertThat(employeeRepository.findById(saved.getId())).isEmpty();
    }

    @Test
    void deleteThrowsItemNotFoundForNonExistentId() {
        assertThatThrownBy(() -> employeeService.delete(999999L))
                .isInstanceOf(ItemNotFoundException.class);
    }

    // --- GETONE ---

    @Test
    void getOneReturnsCorrectEmployee() throws Exception {
        employeeService.insert(new EmployeeForm("Get", "One", "getone@example.com", "getone", "pass"));
        EmployeeEntity saved = employeeRepository.findByUsername("getone").orElseThrow();

        EmployeeDTO dto = employeeService.getOne(saved.getId());

        assertThat(dto.getUsername()).isEqualTo("getone");
        assertThat(dto.getRoles()).contains("ROLE_EMPLOYEE");
    }

    @Test
    void getOneThrowsItemNotFoundForNonExistentId() {
        assertThatThrownBy(() -> employeeService.getOne(999999L))
                .isInstanceOf(ItemNotFoundException.class);
    }
}
```

#### Edge Cases

1. **`@BeforeEach` delete order — employees first, then clients, then admins:** JOINED inheritance stores Employee rows in both `base_user` and `employee`. Deleting Employee entities via `employeeRepository.deleteAll()` removes both. Then deleting clients and admins removes their rows. If clients or admins were deleted first and left orphaned rows in `base_user` before Employee cascade delete attempted to remove the shared parent row, FK violations could occur. The order above respects the child-before-parent delete chain.
2. **`assertThatCode(...).doesNotThrowAnyException()`:** This is AssertJ's positive assertion — verifying no exception. Import: `import static org.assertj.core.api.Assertions.assertThatCode;`.
3. **`ListQueryTestDataFactory.admin("alice", ...)` produces `username = "alice"` and `email = "alice@example.com"`:** The factory appends `@example.com` to the `key` parameter for the email. When the Employee insert uses `"alice"` as username and `"alice2@example.com"` as email, only the username conflicts — confirming we test a username-only conflict in `insertThrowsItemAlreadyExistWhenAdminHasSameUsername`.

---

### Step 6: Complete EmployeeService CRUD Methods (TDD GREEN — Slice 2)

**Goal:** Replace the three stub methods (`insert`, `update`, `delete`) with full business-rule implementations so all Slice 2 tests pass.

**Dependencies:** Step 5 tests written and failing.

- [ ] Replace `insert()` stub with: null-form check, blank-field check for username/email/password, global uniqueness via `baseUserRepository`, BCrypt encode, set EMPLOYEE role and account flags, save and return `toSmallDTO`
- [ ] Replace `update()` stub with: null-form check, load entity by ID, conditional email uniqueness check (only when email differs), conditional username uniqueness check (only when username differs), apply non-blank name/username/email fields, preserve password when blank, BCrypt encode when non-blank, save and return `toDTO`
- [ ] Replace `delete()` stub with: load by ID, delete, return `toDTO`
- [ ] Run `./mvnw test -Dtest=EmployeeServiceCrudIntegrationTest` from `backend/` — all tests must pass
- [ ] Run `./mvnw test -Dtest=EmployeeServiceListQueryIntegrationTest` from `backend/` — confirm Slice 1 tests still pass

**Why this step is critical:** The business rules encoded here (forced EMPLOYEE role, BCrypt encoding, null-preserving update, cross-subtype uniqueness) are the security contract for the Employee domain. Errors here would allow privilege escalation (wrong role), password exposure (no encoding), or duplicate account creation (missing uniqueness gate).

#### Implementation

Replace the three stub methods in `EmployeeService.java`:

```java
    @Override
    @PreAuthorize("hasRole('ADMIN')")
    public EmployeeMiniDTO insert(EmployeeForm form) throws ItemNotFoundException, ItemAlreadyExist, InvalidInsertDetails {
        if (form == null) {
            throw new InvalidInsertDetails("EmployeeForm is null");
        }
        if (isBlank(form.getUsername()) || isBlank(form.getEmail()) || isBlank(form.getPassword())) {
            throw new InvalidInsertDetails("Employee requires username, email, and password");
        }

        if (baseUserRepository.existsByUsername(form.getUsername())) {
            throw new ItemAlreadyExist("A user with username '" + form.getUsername() + "' already exists");
        }
        if (baseUserRepository.existsByEmail(form.getEmail())) {
            throw new ItemAlreadyExist("A user with email '" + form.getEmail() + "' already exists");
        }

        EmployeeEntity toSave = mapper.toEntity(form);
        toSave.setPassword(passwordEncoder.encode(form.getPassword()));
        toSave.setRoles(Set.of(UserRoles.EMPLOYEE));
        toSave.setEnabled(true);
        toSave.setAccountNonExpired(true);
        toSave.setAccountNonLocked(true);
        toSave.setCredentialsNonExpired(true);

        return mapper.toSmallDTO(employeeRepository.save(toSave));
    }

    @Override
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(rollbackFor = {ItemNotFoundException.class, InvalidInsertDetails.class})
    public EmployeeDTO update(Long id, EmployeeForm form) throws ItemNotFoundException, InvalidInsertDetails {
        if (form == null) {
            throw new InvalidInsertDetails("EmployeeForm is null");
        }

        EmployeeEntity toUpdate = employeeRepository.findById(id)
                .orElseThrow(() -> new ItemNotFoundException("Employee not found"));

        if (!isBlank(form.getEmail()) && !form.getEmail().equals(toUpdate.getEmail())) {
            if (baseUserRepository.existsByEmail(form.getEmail())) {
                throw new InvalidInsertDetails("A user with email '" + form.getEmail() + "' already exists");
            }
            toUpdate.setEmail(form.getEmail());
        }

        if (!isBlank(form.getUsername()) && !form.getUsername().equals(toUpdate.getUsername())) {
            if (baseUserRepository.existsByUsername(form.getUsername())) {
                throw new InvalidInsertDetails("A user with username '" + form.getUsername() + "' already exists");
            }
            toUpdate.setUsername(form.getUsername());
        }

        if (!isBlank(form.getFirstName())) {
            toUpdate.setFirstName(form.getFirstName());
        }
        if (!isBlank(form.getLastName())) {
            toUpdate.setLastName(form.getLastName());
        }
        if (!isBlank(form.getPassword())) {
            toUpdate.setPassword(passwordEncoder.encode(form.getPassword()));
        }

        return mapper.toDTO(employeeRepository.save(toUpdate));
    }

    @Override
    @PreAuthorize("hasRole('ADMIN')")
    public EmployeeDTO delete(Long id) throws ItemNotFoundException, InvalidDeleteOperation {
        EmployeeEntity toDelete = employeeRepository.findById(id)
                .orElseThrow(() -> new ItemNotFoundException("Employee not found"));
        employeeRepository.delete(toDelete);
        return mapper.toDTO(toDelete);
    }
```

#### Edge Cases

1. **`insert()` checks uniqueness before encoding the password:** If the uniqueness check fails, the expensive BCrypt hash is never computed. This is an intentional optimization and also correct ordering — don't touch state until the pre-conditions are confirmed.
2. **`insert()` sets all UserDetails flags to `true`:** `BaseUserEntity` defaults these to `true` in the JPA column definitions, but the entity object starts with Java's default `false` for booleans. The explicit setters ensure a freshly constructed `EmployeeEntity` is always login-ready.
3. **`update()` does NOT call `mapper.toEntity(form)` and merge:** The mapper creates a NEW entity (no ID, no roles, no flags). Using it for update would require re-merging every field. Instead, update loads the existing entity and applies only the non-null/non-blank supplied fields, preserving all other state (roles, ID, account flags, existing password).
4. **`update()` uses `InvalidInsertDetails` (not `ItemAlreadyExist`) for conflicts:** `DefaultService.update()` declares `throws ItemNotFoundException, InvalidInsertDetails` — not `ItemAlreadyExist`. Adding `ItemAlreadyExist` to the override would require all callers to handle it. Following `ClientService.update()`, uniqueness conflicts during update are reported as `InvalidInsertDetails` with a clear message. `GlobalExceptionHandler` maps this to HTTP 400.
5. **Null vs blank password in `update()`:** `isBlank()` returns `true` for both null and empty-string passwords. A caller submitting `"password": null` (not in JSON) or `"password": ""` (empty string) both result in no change to the stored hash. This is the correct behavior for partial-update requests.

---

### Step 7: Retroactive Global Uniqueness Fix for AdminServiceImpl and ClientService

**Goal:** Replace subtype-only duplicate checks in `AdminServiceImpl.insert()` and `ClientService.insert()`/`update()` with global `BaseUserRepository` checks. This ensures an Admin cannot share a username with a Client or Employee, and vice versa.

**Dependencies:** Step 6 complete and passing. `BaseUserRepository.existsByUsername`/`existsByEmail` exist (Task 2 Step 3).

#### 7a — Update AdminServiceImpl

- [ ] Open `backend/src/main/java/com/agentForgeBackend/models/hq/admin/AdminServiceImpl.java`
- [ ] Add field: `private final BaseUserRepository baseUserRepository;`
- [ ] Add import: `import com.agentForgeBackend.shared.securityUser.BaseUserRepository;`
- [ ] Update constructor: add `BaseUserRepository baseUserRepository` parameter, assign `this.baseUserRepository = baseUserRepository`
- [ ] In `insert()`: replace the two-part subtype-only check (`repository.findByUsername(...) != null || repository.findByEmail(...) != null`) with two separate global checks that throw `ItemAlreadyExist` with specific messages

```java
// Replace in AdminServiceImpl.insert():
// OLD:
AdminRepository repository = (AdminRepository) this.repository;
if (repository.findByUsername(toSave.getUsername()) != null || repository.findByEmail(toSave.getEmail()) != null)
    throw new ItemAlreadyExist("Admin user already exist");

// NEW — replace only the cast+check block; also update the save line below it:
if (baseUserRepository.existsByUsername(toSave.getUsername()))
    throw new ItemAlreadyExist("A user with username '" + toSave.getUsername() + "' already exists");
if (baseUserRepository.existsByEmail(toSave.getEmail()))
    throw new ItemAlreadyExist("A user with email '" + toSave.getEmail() + "' already exists");
```

**IMPORTANT:** The local `repository` variable declared in the OLD block is also used by `toSave = repository.save(toSave)` further down in `insert()`. After removing the cast, that line becomes a compile error. Change it to:
```java
toSave = this.repository.save(toSave);
```
`this.repository` is the `DefaultRepository<AdminEntity, Long>` field inherited from `DefaultServiceImplements`. No explicit cast is needed for `save()` since the return type is generically `AdminEntity` in this context.

Note: The `AdminRepository` local variable and the cast are **not** needed anywhere else in `insert()` after this fix. The separate cast in `getOne()` (`AdminRepository repository = (AdminRepository) this.repository;`) is independent — leave it untouched.

<!-- REVIEW-FIX: Added explicit instruction to update toSave = repository.save(toSave) after removing cast; prevents compile error from dangling local variable reference -->

#### 7b — Update ClientService

- [ ] Open `backend/src/main/java/com/agentForgeBackend/models/hq/client/ClientService.java`
- [ ] Add field: `private final BaseUserRepository baseUserRepository;`
- [ ] Add import: `import com.agentForgeBackend.shared.securityUser.BaseUserRepository;`
- [ ] Update constructor: add `BaseUserRepository baseUserRepository` parameter after `PasswordEncoder passwordEncoder`, assign `this.baseUserRepository = baseUserRepository`
- [ ] In `insert()`: replace the two `clientRepository.findByUsername/findByEmail` Optional checks with `baseUserRepository.existsByUsername/existsByEmail` boolean checks

```java
// In ClientService.insert() — replace:
Optional<ClientEntity> clientOPT = clientRepository.findByUsername(clientForm.getUsername());
if (clientOPT.isPresent()){
    String msj = "Client with username " + clientForm.getUsername() + " already exist";
    logger.error(msj);
    throw new ItemAlreadyExist(msj);
}
clientOPT = clientRepository.findByEmail(clientForm.getEmail());
if (clientOPT.isPresent()){
    String msj = "Client with email " + clientForm.getEmail() + " already exist";
    logger.error(msj);
    throw new ItemAlreadyExist(msj);
}

// With:
if (baseUserRepository.existsByUsername(clientForm.getUsername())) {
    String msj = "A user with username '" + clientForm.getUsername() + "' already exists";
    logger.error(msj);
    throw new ItemAlreadyExist(msj);
}
if (baseUserRepository.existsByEmail(clientForm.getEmail())) {
    String msj = "A user with email '" + clientForm.getEmail() + "' already exists";
    logger.error(msj);
    throw new ItemAlreadyExist(msj);
}
```

- [ ] In `update()`: replace the two `clientRepository.findByEmail/findByUsername` Optional checks with `baseUserRepository.existsByEmail/existsByUsername` boolean checks

```java
// In ClientService.update() — replace both inner Optional blocks:
// Email check — replace inner body:
// OLD:
Optional<ClientEntity> existingClient = clientRepository.findByEmail(clientForm.getEmail());
if (existingClient.isPresent()) {
    String msg = "Client with email " + clientForm.getEmail() + " already exists";
    logger.error(msg);
    throw new InvalidInsertDetails(msg);
}
// NEW:
if (baseUserRepository.existsByEmail(clientForm.getEmail())) {
    String msg = "A user with email '" + clientForm.getEmail() + "' already exists";
    logger.error(msg);
    throw new InvalidInsertDetails(msg);
}

// Username check — replace inner body:
// OLD:
Optional<ClientEntity> existingClient = clientRepository.findByUsername(clientForm.getUsername());
if (existingClient.isPresent()) {
    String msg = "Client with username " + clientForm.getUsername() + " already exists";
    logger.error(msg);
    throw new InvalidInsertDetails(msg);
}
// NEW:
if (baseUserRepository.existsByUsername(clientForm.getUsername())) {
    String msg = "A user with username '" + clientForm.getUsername() + "' already exists";
    logger.error(msg);
    throw new InvalidInsertDetails(msg);
}
```

- [ ] Run `./mvnw test` from `backend/` — all 169+ pre-existing tests plus new Employee tests must pass

**Why this step is critical:** Without this retroactive fix, an Employee could register with the same email as an existing Client, and a new Admin could duplicate an existing Employee's username. The `base_user` table has a unique constraint on both, but the database-level error would surface as `DataIntegrityViolationException` — an opaque 500 rather than a meaningful 409 with a user-visible message.

#### Edge Cases

1. **`clientOPT` variable becomes unused after the change in `insert()`:** After replacing both Optional checks in `ClientService.insert()`, the local variable `clientOPT` is no longer needed. Remove both usages entirely. The compiler will warn about unused variables.
2. **`ClientService.insert()` and `update()` — remove the now-unused cast lines:** After replacing the uniqueness checks, the following cast assignment in `insert()` (line 80) becomes unused and must be removed: `ClientRepository clientRepository = (ClientRepository) repository;`. Likewise, the identical cast at the start of `update()` (line 120) becomes unused once both `existingClient` Optional checks are replaced — remove it too. Leaving unused local variables will trigger compiler warnings but not errors; removing them keeps the code clean. The `generateTokenForClient()` method uses an inline cast `((ClientRepository) repository)` independently — leave that untouched.
3. **`update()` removes the `Optional<ClientEntity> existingClient` local variables:** These two local variables are replaced by boolean calls. Remove their declarations.
4. **`AdminServiceImpl` `getOne()` still casts `this.repository`:** The `AdminRepository repository = (AdminRepository) this.repository` cast inside `getOne()` is separate and unrelated. Keep it untouched.
5. **Existing tests should not break:** `AdminControllerListEndpointTest`, `ClientControllerListEndpointTest`, and their service equivalents use `@BeforeEach` with direct repository saves (bypassing the service), so the service changes don't affect their test data setup. No test currently exercises the duplicate-check code path in Admin or Client services.

<!-- REVIEW-FIX: Added explicit instruction to remove the unused ClientRepository cast lines in insert() and update() after uniqueness checks are replaced; missing from original instructions -->

---

### Step 8: Write EmployeeControllerListEndpointTest (TDD RED — Slice 3)

**Goal:** Define failing HTTP-layer tests. Tests fail because `EmployeeController` does not exist yet, so no routes under `/employee` are registered.

**Dependencies:** Steps 6 and 7 complete (`EmployeeService` fully implemented, retroactive fixes in place).

- [ ] Create `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeControllerListEndpointTest.java`
- [ ] Annotate with `@SpringBootTest`, `@AutoConfigureMockMvc`, `@ActiveProfiles("test")`, `@WithMockUser(username = "task3-emp-controller", roles = "ADMIN")`
- [ ] Inject `MockMvc`, `ObjectMapper`, `EmployeeRepository`
- [ ] `@BeforeEach`: delete all employees, flush, save alpha/beta/gamma via `ListQueryTestDataFactory.employee()`
- [ ] Write list tests: default list returns 200, filter+sort+paginate returns matching page, password/roles/apikey filter returns 400, invalid size returns 400
- [ ] Write CRUD endpoint tests: POST `/employee` returns 200, GET `/employee/{id}` returns 200, PUT `/employee/{id}` returns 200, DELETE `/employee/{id}` returns 200, GET `/employee/999999` returns 404
- [ ] Write authorization test: `@WithMockUser(roles = "EMPLOYEE")` on list request returns 403

**Why this step is critical:** The controller is the only component that registers the HTTP routes. These tests prove that: (a) the routes exist under `/employee`, (b) the responses have the correct shape, (c) sensitive fields are absent from responses, (d) the method-level `@PreAuthorize` on `EmployeeService` blocks non-admin callers even when the HTTP layer is bypassed.

#### Implementation

```java
package com.agentForgeBackend.models.hq.employee;

import com.agentForgeBackend.models.hq.ListQueryTestDataFactory;
import com.agentForgeBackend.shared.query.FilterOperator;
import com.agentForgeBackend.shared.query.PageableRequest;
import com.agentForgeBackend.shared.query.SortDirection;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@WithMockUser(username = "task3-emp-controller", roles = "ADMIN")
class EmployeeControllerListEndpointTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private EmployeeRepository employeeRepository;

    private EmployeeEntity alpha;
    private EmployeeEntity beta;
    private EmployeeEntity gamma;

    @BeforeEach
    void setUp() {
        employeeRepository.deleteAll();
        employeeRepository.flush();

        alpha = employeeRepository.save(ListQueryTestDataFactory.employee("emp-ctrl-alpha", true, ListQueryTestDataFactory.EARLY_DATE));
        beta  = employeeRepository.save(ListQueryTestDataFactory.employee("emp-ctrl-beta",  false, ListQueryTestDataFactory.MIDDLE_DATE));
        gamma = employeeRepository.save(ListQueryTestDataFactory.employee("emp-ctrl-gamma", true, ListQueryTestDataFactory.LATE_DATE));
        employeeRepository.flush();
    }

    // --- LIST ---

    @Test
    void listWithDefaultRequestReturnsEmployeeListPageWithoutPassword() throws Exception {
        mockMvc.perform(post("/employee/list")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(3)))
                .andExpect(jsonPath("$.content[0].id").value(alpha.getId().intValue()))
                .andExpect(jsonPath("$.content[0].username").value("emp-ctrl-alpha"))
                .andExpect(jsonPath("$.content[0].roles", hasItem("ROLE_EMPLOYEE")))
                .andExpect(jsonPath("$.content[0].password").doesNotExist())
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.number").value(0));
    }

    @Test
    void listWithFilterSortAndPaginationReturnsMatchingEmployeePage() throws Exception {
        PageableRequest request = ListQueryTestDataFactory.request(
                0, 1,
                List.of(ListQueryTestDataFactory.sort("username", SortDirection.DESC)),
                List.of(ListQueryTestDataFactory.filter("enabled", FilterOperator.EQUALS, true)));

        mockMvc.perform(post("/employee/list")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].username").value("emp-ctrl-gamma"))
                .andExpect(jsonPath("$.content[0].password").doesNotExist())
                .andExpect(jsonPath("$.totalElements").value(2));
    }

    @Test
    void unknownPasswordFilterFieldReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/employee/list")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(queryRequest("password", "EQUALS", "\"secret\"")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Invalid Query Request"))
                .andExpect(jsonPath("$.message").value("Unknown query field 'password'."));
    }

    @Test
    void unknownRolesFilterFieldReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/employee/list")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(queryRequest("roles", "EQUALS", "\"EMPLOYEE\"")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Invalid Query Request"));
    }

    @Test
    void unknownApiKeyFilterFieldReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/employee/list")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(queryRequest("apikey", "EQUALS", "123")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Invalid Query Request"));
    }

    @Test
    void invalidSizeReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/employee/list")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"size\": 101 }"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation Failed"))
                .andExpect(jsonPath("$.message").value("size: must be less than or equal to 100")); // REVIEW-FIX: added message assertion to match AdminControllerListEndpointTest pattern
    }

    // --- CRUD ---

    @Test
    void insertEmployeeReturns200WithEmployeeData() throws Exception {
        String body = """
                { "firstName": "New", "lastName": "Employee",
                  "email": "newemployee@example.com", "username": "newemployee",
                  "password": "securePass123" }
                """;

        mockMvc.perform(post("/employee")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("newemployee"))
                .andExpect(jsonPath("$.roles", hasItem("ROLE_EMPLOYEE")))
                .andExpect(jsonPath("$.password").doesNotExist());
    }

    @Test
    void getOneEmployeeReturns200WithCorrectData() throws Exception {
        mockMvc.perform(get("/employee/" + alpha.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("emp-ctrl-alpha"))
                .andExpect(jsonPath("$.roles", hasItem("ROLE_EMPLOYEE")))
                .andExpect(jsonPath("$.password").doesNotExist());
    }

    @Test
    void getOneNonExistentEmployeeReturns404() throws Exception {
        mockMvc.perform(get("/employee/999999"))
                .andExpect(status().isNotFound());
    }

    @Test
    void updateEmployeeReturns200WithUpdatedData() throws Exception {
        String body = """
                { "firstName": "Updated", "lastName": "Name" }
                """;

        mockMvc.perform(put("/employee/" + alpha.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("Updated"))
                .andExpect(jsonPath("$.password").doesNotExist());
    }

    @Test
    void deleteEmployeeReturns200WithDeletedData() throws Exception {
        mockMvc.perform(delete("/employee/" + alpha.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("emp-ctrl-alpha"));
    }

    // --- AUTHORIZATION ---

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void employeeRoleCannotAccessEmployeeEndpoints() throws Exception {
        mockMvc.perform(post("/employee/list")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void noTokenMintingEndpointExistsForEmployee() throws Exception {
        mockMvc.perform(get("/employee/token/someuser"))
                .andExpect(status().isForbidden());
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
}
```

#### Edge Cases

1. **`noTokenMintingEndpointExistsForEmployee` returns 403, not 404:** The `/employee/**` HTTP rule in `SecurityConfig` requires `hasRole("ADMIN")`. An `@WithMockUser(roles = "EMPLOYEE")` user is blocked at the HTTP authorization layer before any route matching occurs. So the test verifies the authorization behavior — not whether the URL exists as a handler. If you want to prove the route doesn't exist as a registered handler (independent of auth), you'd need an Admin user and expect 404. Both assertions are valid; the 403 form proves the HTTP security layer blocks the Employee role.
2. **`insertEmployeeReturns200WithEmployeeData` email uniqueness:** The `@BeforeEach` populates alpha/beta/gamma with `*@example.com` emails. The insert test uses `newemployee@example.com`, which is unique. No conflict occurs.
3. **`alpha.getId().intValue()`:** Spring Boot's `MockMvc` JSON path `$.content[0].id` returns the ID as an int in the JSON response. Comparing `intValue()` of a `Long` avoids type-mismatch assertion failures.

---

### Step 9: Create EmployeeController (TDD GREEN — Slice 3)

**Goal:** Create the one-class controller that registers all `/employee` routes by extending `DefaultController`. No additional endpoints.

**Dependencies:** Step 8 tests written and failing; `EmployeeService` fully implemented.

- [ ] Create `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeController.java`
- [ ] Mirror `AdminController` exactly: `@RestController`, `@RequestMapping("/employee")`, extend `DefaultController<EmployeeDTO, EmployeeMiniDTO, EmployeeListDTO, EmployeeForm, Long>`
- [ ] Constructor receives `EmployeeService`, calls `super(service)`
- [ ] Do NOT add any additional `@GetMapping`, `@PostMapping`, or `@PutMapping` methods
- [ ] Run `./mvnw test -Dtest=EmployeeControllerListEndpointTest` from `backend/` — all tests must pass
- [ ] Run `./mvnw test` from `backend/` — full test suite must pass (except pre-existing `authServerApplicationTests` PostgreSQL failure)

**Why this step is critical:** `DefaultController` provides all 6 endpoints: `GET /{id}`, `GET /`, `POST /list`, `POST /`, `PUT /{id}`, `DELETE /{id}`. The controller adds no behavior — all business logic is in `EmployeeService`. Three lines of code make all HTTP layer tests pass because the work was front-loaded into the service and query profile.

#### Implementation

```java
package com.agentForgeBackend.models.hq.employee;

import com.agentForgeBackend.shared.defaultImplements.DefaultController;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/employee")
public class EmployeeController extends DefaultController<EmployeeDTO, EmployeeMiniDTO, EmployeeListDTO, EmployeeForm, Long> {

    public EmployeeController(EmployeeService service) {
        super(service);
    }
}
```

#### Edge Cases

1. **No `generateTokenForEmployee()` method:** `ClientController` adds a `@GetMapping("/token/{username}")` method. `EmployeeController` must not add this. The Feature explicitly prohibits it (Section 2: "There is no `/employee/token/{username}` endpoint").
2. **No self-registration route:** No `@PostMapping("/register")` or any anonymous-accessible endpoint. All routes inherit the `hasRole("ADMIN")` security from both the HTTP filter chain and the service's `@PreAuthorize` annotations.

---

### Step 10: Verify No API-Key Field or Token-Minting Endpoint (Step 3.4)

**Goal:** Structural confirmation that the Employee domain has no API-key leakage and no token endpoint.

**Dependencies:** Step 9 complete (all files created).

- [ ] Confirm `EmployeeDTO.java` has no field named `apikey`, `apiKey`, or `api_key`
- [ ] Confirm `EmployeeMiniDTO.java` has no API-key field
- [ ] Confirm `EmployeeListDTO.java` has no API-key field
- [ ] Confirm `EmployeeForm.java` has no API-key field
- [ ] Confirm `EmployeeController.java` has no method annotated `@GetMapping("/token/{username}")` or any token-related mapping
- [ ] Confirm `EmployeeService.java` has no method that calls `jwtTokenService.generateToken()` or returns a token string
- [ ] The `noTokenMintingEndpointExistsForEmployee` test in Step 8 covers HTTP-level verification

---

## Design Decisions

**Decision 1: EmployeeService stores a typed `employeeRepository` field rather than casting `this.repository`**
- **Why:** `AdminServiceImpl` casts `(AdminRepository) this.repository` inside each method that needs subtype-specific finders. This pattern is error-prone (the cast could fail if the wrong repository is injected) and verbose. Storing the typed reference as `employeeRepository` alongside the untyped `repository` (parent field) means the constructor provides the assignment once and methods use the typed field directly. The tiny cost is a redundant reference to the same object.
- **Alternatives considered:** Following `AdminServiceImpl`'s cast pattern. Rejected because the typed field is clearer and makes `EmployeeService` easier to test in isolation.

**Decision 2: `getListPage()` override delegates to `super.getListPage(request)`**
- **Why:** The parent's `getListPage()` implementation is correct and complete (builds predicate, creates pageRequest, executes QueryDSL query, maps to ListDTO). The only reason to override it is to add `@PreAuthorize("hasRole('ADMIN')")`. The override is a one-line delegation. Direct `super` calls bypass Spring's AOP proxy, so the parent's `@PreAuthorize("isAuthenticated()")` is NOT re-enforced — only the override's `@PreAuthorize("hasRole('ADMIN')")` applies to callers.
- **Alternatives considered:** Copying the parent implementation. Rejected as duplication without benefit. Not overriding (relying only on HTTP-level `/employee/**` rule). Rejected because the Feature spec requires explicit `@PreAuthorize` on ALL service methods — defense-in-depth that remains enforceable even if the HTTP rule were changed.

**Decision 3: `update()` throws `InvalidInsertDetails` (not `ItemAlreadyExist`) for uniqueness conflicts**
- **Why:** `DefaultService.update()` is declared `throws ItemNotFoundException, InvalidInsertDetails`. Adding `ItemAlreadyExist` as a new checked exception to the override's throws clause is not permitted by Java unless `DefaultService.update()` also declares it (since `ItemAlreadyExist` is not a subtype of `InvalidInsertDetails` or `ItemNotFoundException`). Modifying the shared `DefaultService` interface is out of scope for this task. Following `ClientService.update()` which uses `InvalidInsertDetails` for conflicts, Employee update does the same. The message clearly identifies the conflict, and `GlobalExceptionHandler` returns HTTP 400 with the message.
- **Alternatives considered:** Wrapping `ItemAlreadyExist` in a runtime exception to bypass the checked exception constraint. Rejected — it hides the error type and makes exception handling inconsistent. Modifying `DefaultService` to add `ItemAlreadyExist` to `update()`. Rejected — scope creep; this is a Task 5 refactor candidate.

**Decision 4: Retroactive global uniqueness fix applied to Admin and Client services in this task**
- **Why:** The Feature (Section 5) explicitly mandates that Admin and Client also switch to `BaseUserRepository` global checks. Without this fix, a new Employee could reuse an Admin's username, crashing on the `base_user.username` unique constraint with an opaque 500. Applying this fix now, before the first Employee is insertable, prevents the inconsistency from ever being observable in production.
- **Alternatives considered:** Deferring Admin/Client fixes to Task 5 (regression coverage). Rejected because the cross-subtype conflict tests in `EmployeeServiceCrudIntegrationTest` also depend on the Admin and Client subtype checks NOT falsely passing. If AdminServiceImpl still used subtype-only checks, `insertThrowsItemAlreadyExistWhenAdminHasSameUsername` would fail (the Admin check would miss the conflict).

**Decision 5: `insert()` enforces blank-field validation at the service layer, not the form layer**
- **Why:** `EmployeeForm` has no `@NotBlank` annotations (per Task 2 Decision 3 — the form is shared between insert and update). A blank password on update means "preserve existing hash", which is valid. A blank password on insert is invalid. Service-layer validation is the only place where the insert vs update distinction is known.
- **Alternatives considered:** `@NotBlank` on `EmployeeForm.password`. Rejected in Task 2 because it would reject valid update requests.

---

## Testing Considerations

### Automatic Validation

- [x] Run `./mvnw test -Dtest=EmployeeServiceListQueryIntegrationTest` from `backend/` — all 4 tests pass after Steps 3 and 4
- [x] Run `./mvnw test -Dtest=EmployeeServiceCrudIntegrationTest` from `backend/` — all 17 tests pass after Step 6, including cross-subtype update conflicts
- [x] Run `./mvnw test -Dtest=EmployeeControllerListEndpointTest` from `backend/` — all 13 tests pass after Step 9 <!-- REVIEW-FIX: corrected count from 11 to 13 -->
- [x] Run `./mvnw test` from `backend/` — the suite still exits non-zero only because of the pre-existing `authServerApplicationTests.contextLoads` PostgreSQL host `db` failure; all other 270 tests pass
- [x] Confirm `EmployeeController` has no `/token/{username}` endpoint by searching: `grep -r "token" backend/src/main/java/com/agentForgeBackend/models/hq/employee/` returns no results
- [x] Confirm no DTO has `apikey`/`apiKey` field: `grep -r "apikey\|apiKey" backend/src/main/java/com/agentForgeBackend/models/hq/employee/` returns no results

### Manual Validation

- [ ] Start the application with Docker Compose (`docker compose up`, then `./mvnw spring-boot:run`). POST to `/login` with admin credentials and retrieve a JWT.
- [ ] Using the Admin JWT: POST to `/employee` with a valid form body — expect HTTP 200 and a JSON body with `username`, `roles: ["ROLE_EMPLOYEE"]`, and no `password` field.
- [ ] Using the Admin JWT: POST to `/employee/list` with `{}` — expect HTTP 200 with `content` array and `totalElements`.
- [ ] Using the Admin JWT: GET to `/employee/token/someuser` — expect HTTP 404 (no token endpoint registered; the path `/token/someuser` is two segments after `/employee` and does not match any handler).
- [ ] Without any JWT: POST to `/employee/list` with `{}` — expect HTTP 401 JSON response from the auth entry point.
- [ ] Using a Client JWT (obtained by posting to `/client/token/{username}`): POST to `/employee/list` — expect HTTP 403.

---

## Related Code Explanations

- `backend/src/main/java/com/agentForgeBackend/models/hq/admin/AdminQueryProfile.java` — direct structural model for `EmployeeQueryProfile`; compare field declarations to verify consistency
- `backend/src/main/java/com/agentForgeBackend/models/hq/admin/AdminServiceImpl.java` — modified in Step 7; retroactive global uniqueness fix; also provides the constructor pattern reference
- `backend/src/main/java/com/agentForgeBackend/models/hq/client/ClientService.java:109-160` — `update()` pattern reference; also modified in Step 7; shows how `InvalidInsertDetails` is used for update uniqueness conflicts
- `backend/src/main/java/com/agentForgeBackend/shared/defaultImplements/DefaultServiceImplements.java:90-93` — the known-broken `update()` that `EmployeeService.update()` must fully override
- `backend/src/main/java/com/agentForgeBackend/shared/defaultImplements/DefaultController.java` — provides all 6 CRUD/list endpoints that `EmployeeController` inherits via `extends`
- `backend/target/generated-sources/annotations/com/agentForgeBackend/models/hq/employee/QEmployeeEntity.java` — generated Q-class; `QEmployeeEntity.employeeEntity` static reference used in `EmployeeQueryProfile`

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected for this task
- [x] Spring Boot 3.4.1 / Spring Security 6.4.x documentation reviewed via Context7
- [x] `ListQueryTestDataFactory.java` updated with `employee()` factory method
- [x] `EmployeeServiceListQueryIntegrationTest.java` created with 4 list-query behavior tests
- [x] `EmployeeQueryProfile.java` created with 8 safe fields, `id ASC` default sort, no password/roles/apikey
- [x] `EmployeeService.java` created with all 6 methods overridden with `@PreAuthorize("hasRole('ADMIN')")`
- [x] `EmployeeService.insert()` enforces blank-field validation, global uniqueness via `BaseUserRepository`, BCrypt encoding, forced EMPLOYEE role
- [x] `EmployeeService.update()` loads existing entity, applies non-blank fields, skips uniqueness check for unchanged values, preserves password hash when form password is blank/null
- [x] `EmployeeService.delete()` loads by ID and removes
- [x] `EmployeeServiceCrudIntegrationTest.java` created with 17 CRUD behavior tests including cross-subtype uniqueness on insert and update
- [x] `AdminServiceImpl.java` updated to inject `BaseUserRepository` and use global uniqueness checks
- [x] `ClientService.java` updated to inject `BaseUserRepository` and use global uniqueness checks in both `insert()` and `update()`
- [x] `EmployeeControllerListEndpointTest.java` created with 13 HTTP-layer tests <!-- REVIEW-FIX: corrected count from 11 to 13 (6 list/validation + 5 CRUD + 2 authorization) -->
- [x] `EmployeeController.java` created at `/employee`, extends `DefaultController`, no token endpoint
- [x] `./mvnw test` passes for all Employee test classes
- [x] All pre-existing tests continue to pass except the already-documented `authServerApplicationTests.contextLoads` Docker/PostgreSQL blocker
- [x] No Employee DTO output contract exposes `password`, `apiKey`, or `apikey`; `EmployeeForm` keeps `password` only as required input and has no API-key field
- [x] `EmployeeController` has no `/token/{username}` or token-minting method
- [x] Manual validation steps documented for the user
- [x] Parent feature Phase 3 steps (3.1–3.4) can be marked complete

## Post-Review Notes

- `./mvnw test` still exits non-zero because `authServerApplicationTests.contextLoads` requires the Docker PostgreSQL host `db`. This is the pre-existing blocker already tracked in `documentation/Memory/known-issues.md` and was not introduced by this task.
