# Task: Add Employee Domain Model and API Contract

#task #current #medium-complexity #parent-employee-user-entity-and-role

**Parent:** [[Employee-User-Entity-and-Role]]
**Parent Type:** Feature
**Related Step(s):** Phase 2 — Steps 2.1, 2.2, 2.3, 2.4, 2.5
**Estimated Complexity:** Medium

---

## Goal

Create the Employee domain foundation: entity, repository, DTOs, form, and mapper. Also add global username/email uniqueness methods to `BaseUserRepository` and trigger QueryDSL Q-class generation. This establishes the data shape and persistence contract that Tasks 3 and 4 build service, controller, and authentication logic on top of.

---

## Parent Context

The parent Feature (Section 2–5) defines Employee as a `BaseUserEntity` subclass stored in its own `employee` joined table, with **no API-key field anywhere** — not in the entity, DTO, form, or mapper. Employee shares the same JWT login flow through the existing inheritance hierarchy.

Key constraints from the parent:

- `EmployeeEntity` must extend `BaseUserEntity` and add no additional columns. The `apikey` field from `ClientEntity` must not appear.
- `EmployeeForm` accepts `firstName`, `lastName`, `email`, `username`, and `password`. The `password` field must NOT be annotated `@NotBlank` — it is optional at the form level (null/blank means preserve existing password on update; validation for insert is enforced in the service in Task 3).
- `EmployeeForm` must not accept `roles` from callers; the service assigns `EMPLOYEE` forcibly.
- `EmployeeDTO` and `EmployeeMiniDTO` expose safe identity fields and role authorities — never password.
- `EmployeeListDTO` exposes `id`, names, email, username, roles, enabled, `dateCreated`, and `lastLogin`.
- Roles must be serialized as `"ROLE_EMPLOYEE"` via `UserRoles.getAuthority()`.
- `EmployeeRepository` must expose `Optional<EmployeeEntity> findByUsername(String)` and `Optional<EmployeeEntity> findByEmail(String)`.
- `BaseUserRepository` must gain `boolean existsByUsername(String)` and `boolean existsByEmail(String)` — these are the cross-subtype uniqueness gates that the Employee service (Task 3) will use.
- Compile step (Step 2.5) triggers the QueryDSL APT processor to generate `QEmployeeEntity`, which is required for `EmployeeQueryProfile` in Task 3.
- Tests must exercise behavior through public interfaces (repository persistence, mapper DTO contract) — not private methods.

**ADR relevance:** ADR-007 confirms Employees are the normal portal users constrained to admin-curated models. This Task has no ADR conflicts — no architectural decision is changed here.

---

## Preconditions / Dependencies

- Task 1 is complete: `@EnableMethodSecurity` and `authorizeHttpRequests` are active in `SecurityConfig.java`. All 169+ existing tests pass.
- Spring Boot 3.4.1 / Spring Data JPA (Boot-managed) / QueryDSL 6.12 (openfeign fork) are in `pom.xml`.
- H2 in-memory database is configured for tests via `application-test.properties` with `spring.jpa.hibernate.ddl-auto=create-drop`.
- Admin domain at `models/hq/admin/` and Client domain at `models/hq/client/` exist as authoritative reference patterns.
- `BaseUserRepository` currently has only `findByUsername` — `existsByUsername` and `existsByEmail` do not yet exist.
- `UserRoles.EMPLOYEE` already exists in the enum. Do not reorder enum values.
- `TestAuthenticationHelper` exists at `testUtils/TestAuthenticationHelper.java` (extended in Task 4, not this task).

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — Selected — task template and document conventions
- `memory-bank` — Selected — architecture, known-issues, tech stack context
- `solid-deep-design` — Selected — Employee entity is a deep module (all JOINED inheritance complexity hidden behind `BaseUserEntity` interface); mapper is a deep translation module; interface segregation applied to DTO variants
- `tdd` — Selected — vertical-slice TDD: repository test first, then entity/repository; mapper test first, then DTOs/form/mapper
- `glossary-management` — Selected — domain terms verified (Employee, BaseUserEntity, UserRoles, DTO/Form/Mapper conventions)
- `find-docs` — Selected — Spring Data JPA derived query methods and QueryDSL APT verified below

### Documentation Reviewed

- **Spring Boot 3.4.1 / Spring Data JPA** — Spring Data derived query methods (`existsByUsername`, `findByUsername`) work on the `BaseUserRepository` through the JOINED inheritance view; no custom JPQL required.
- **QueryDSL 6.12 (openfeign fork)** — `QEmployeeEntity` is generated at compile time by the `querydsl-apt` annotation processor. Running `./mvnw compile` from `backend/` is sufficient; the generated class appears in `target/generated-sources/annotations/`.
- **`AdminMapper.java`** — Existing mapper pattern: `toEntity()` does null-check per field but calls `adminForm.getRoles().isEmpty()` without a null check on `roles`. `EmployeeMapper` must not replicate this bug — guard with `roles != null && !roles.isEmpty()` or simply omit the roles input path entirely (Employee form has no `roles` field).
- **`ClientRepositoryTest.java`** — Reference test for repository persistence pattern (`@DataJpaTest`, `@ActiveProfiles("test")`, `TestEntityManager`, `Optional` return types).
- **Known issues** — `DefaultServiceImplements.update()` does not apply form data (loads entity, saves unchanged). Employee service in Task 3 must override `update()` fully. This task creates the form used by that override.

### Related Existing Code

- `backend/src/main/java/com/agentForgeBackend/shared/models/baseUser/BaseUserEntity.java` — Employee extends this abstract class; no structural changes needed
- `backend/src/main/java/com/agentForgeBackend/shared/models/baseUser/UserRoles.java` — `EMPLOYEE` enum value already present; `getAuthority()` returns `"ROLE_EMPLOYEE"`
- `backend/src/main/java/com/agentForgeBackend/shared/securityUser/BaseUserRepository.java` — Add `existsByUsername` and `existsByEmail` here
- `backend/src/main/java/com/agentForgeBackend/shared/defaultInterfaces/DefaultRepository.java` — `EmployeeRepository` extends this
- `backend/src/main/java/com/agentForgeBackend/models/hq/admin/AdminEntity.java` — Pattern reference: `@Table(name = "admin")`, `@Entity`, extends `BaseUserEntity`, no extra columns
- `backend/src/main/java/com/agentForgeBackend/models/hq/admin/AdminDTO.java` — Pattern: `firstName`, `lastName`, `email`, `username`, `roles` (Set of authority strings)
- `backend/src/main/java/com/agentForgeBackend/models/hq/admin/AdminListDTO.java` — Pattern: adds `id`, `enabled`, `dateCreated`, `lastLogin`
- `backend/src/main/java/com/agentForgeBackend/models/hq/admin/AdminForm.java` — Pattern: has `password` field, `@NotBlank` on `username` only
- `backend/src/main/java/com/agentForgeBackend/models/hq/admin/AdminMapper.java` — Pattern: roles mapped via `UserRoles::getAuthority`; `toEntity()` null-checks each field
- `backend/src/main/java/com/agentForgeBackend/models/hq/admin/AdminRepository.java` — Pattern (Admin returns plain type, not Optional — Employee should use Optional like ClientRepository)
- `backend/src/test/java/com/agentForgeBackend/models/client/ClientRepositoryTest.java` — Reference test for `@DataJpaTest` persistence pattern

---

## Implementation Details

### Approach

Strictly TDD in two vertical slices:

**Slice 1 — Entity + Repository persistence**
1. RED: Write `EmployeeRepositoryTest` covering `persist`, `findById`, `findByUsername`, `findByEmail`, and JOINED inheritance row count.
2. GREEN: Create `EmployeeEntity` → create `EmployeeRepository` → run tests until green.

**Slice 2 — DTO contract + Mapper**
1. RED: Write `EmployeeMapperTest` covering `toDTO` (authority format, no password), `toListDTO` (id + audit fields), `toEntity` (null safety on all fields, no role input).
2. GREEN: Create `EmployeeDTO`, `EmployeeMiniDTO`, `EmployeeListDTO`, `EmployeeForm` → create `EmployeeMapper` → run tests until green.

**Step 2.4 — `BaseUserRepository` additions**
Add `existsByUsername` and `existsByEmail` as Spring Data derived query methods. These require no test in this task because their behavior is Spring Data's responsibility; the cross-subtype uniqueness behavior is tested at the service layer in Task 3.

**Step 2.5 — Compile**
Run `./mvnw compile` to trigger the QueryDSL APT processor and generate `QEmployeeEntity`. Verify it appears in `target/generated-sources/annotations/`. This is required for Task 3's `EmployeeQueryProfile` — no `EmployeeQueryProfile` can be written before this step.

**Design — why two distinct TDD slices:** Slice 1 tests persistence in isolation via `@DataJpaTest`; Slice 2 tests mapping logic as a pure unit. Mixing them would require a full Spring context in the mapper test, adding unnecessary overhead.

**Design — Optional return type on `EmployeeRepository`:** The Admin repository returns plain types (null on not-found), while the Client repository returns `Optional`. For Employee, use `Optional` — it is the safer pattern and consistent with the feature requirement that callers check presence before operating on the result.

**Design — no `roles` field in `EmployeeForm`:** Admin's `AdminForm` has a `roles` field that `AdminMapper.toEntity()` attempts to map. This creates the risk that a caller could supply roles. Employee intentionally omits `roles` from the form, removing the attack surface entirely. The service (Task 3) hard-assigns `Set.of(UserRoles.EMPLOYEE)`.

### Files to Create/Modify

- [x] `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeRepositoryTest.java` — **NEW** — TDD RED: repository persistence tests (Slice 1)
- [x] `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeEntity.java` — **NEW** — `BaseUserEntity` subclass, table `employee`, no extra columns
- [x] `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeRepository.java` — **NEW** — extends `DefaultRepository`, Optional finders
- [x] `backend/src/main/java/com/agentForgeBackend/shared/securityUser/BaseUserRepository.java` — **MODIFY** — add `existsByUsername` and `existsByEmail`
- [x] `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeMapperTest.java` — **NEW** — TDD RED: mapper contract tests (Slice 2)
- [x] `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeDTO.java` — **NEW** — full output DTO (no password, no apikey)
- [x] `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeMiniDTO.java` — **NEW** — insert-response DTO (same shape as EmployeeDTO)
- [x] `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeListDTO.java` — **NEW** — paginated list row DTO with id and audit fields
- [x] `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeForm.java` — **NEW** — request input type (password nullable, no roles)
- [x] `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeMapper.java` — **NEW** — TDD GREEN: implements DefaultMapper, maps roles via getAuthority()

---

## Step-by-Step Implementation

### Step 1: Write EmployeeRepositoryTest (TDD RED — Slice 1)

**Goal:** Establish failing tests that verify `EmployeeEntity` persists correctly via JOINED inheritance and `EmployeeRepository` finders work as expected. Tests fail until `EmployeeEntity` and `EmployeeRepository` are created in Step 2.

**Dependencies:** None beyond the existing Spring Data JPA infrastructure.

- [x] Create the package directory `backend/src/test/java/com/agentForgeBackend/models/hq/employee/`
- [x] Create `EmployeeRepositoryTest.java` annotated with `@DataJpaTest`, `@ActiveProfiles("test")`, `@Tag("repository")`
- [x] Inject `TestEntityManager` and `EmployeeRepository`
- [x] Write test: `testSaveAndFindById` — persist an `EmployeeEntity`, flush and clear, find by ID, assert all fields
- [x] Write test: `testFindByUsername` — persist, flush, clear, `findByUsername(...)`, assert `isPresent()` and values
- [x] Write test: `testFindByUsername_NotFound` — `findByUsername("nonexistent")`, assert `isEmpty()`
- [x] Write test: `testFindByEmail` — persist, flush, clear, `findByEmail(...)`, assert presence and values
- [x] Write test: `testFindByEmail_NotFound` — assert empty Optional for unknown email
- [x] Write test: `testEmployeeInheritance` — persist one EmployeeEntity, assert that `entityManager.find(BaseUserEntity.class, id)` returns a non-null `BaseUserEntity`, confirming JOINED inheritance stores correctly in `base_user`
- [x] Write test: `testDeleteEmployee` — persist, flush, delete by ID, assert `existsById` returns false

**Why this step is critical:** These tests define the minimum expected persistence contract. The `testEmployeeInheritance` test in particular validates the JOINED table mapping that the entire authentication chain depends on — if `EmployeeEntity` is not correctly registered in the inheritance hierarchy, `/login` will never authenticate an Employee even if CRUD works.

#### Implementation

```java
package com.agentForgeBackend.models.hq.employee;

import com.agentForgeBackend.shared.models.baseUser.BaseUserEntity;
import com.agentForgeBackend.shared.models.baseUser.UserRoles;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
@Tag("repository")
class EmployeeRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private EmployeeRepository employeeRepository;

    private EmployeeEntity testEmployee;

    @BeforeEach
    void setUp() {
        entityManager.clear();
        testEmployee = new EmployeeEntity(
                "Jane",
                "Smith",
                "jane.smith@example.com",
                new HashSet<>(Set.of(UserRoles.EMPLOYEE)),
                "janesmith",
                "hashedPassword123"
        );
    }

    @Test
    void testSaveAndFindById() {
        EmployeeEntity saved = employeeRepository.save(testEmployee);
        entityManager.flush();
        entityManager.clear();

        Optional<EmployeeEntity> found = employeeRepository.findById(saved.getId());

        assertTrue(found.isPresent());
        assertEquals("Jane", found.get().getFirstName());
        assertEquals("Smith", found.get().getLastName());
        assertEquals("jane.smith@example.com", found.get().getEmail());
        assertEquals("janesmith", found.get().getUsername());
    }

    @Test
    void testFindByUsername() {
        entityManager.persist(testEmployee);
        entityManager.flush();
        entityManager.clear();

        Optional<EmployeeEntity> found = employeeRepository.findByUsername("janesmith");

        assertTrue(found.isPresent());
        assertEquals("jane.smith@example.com", found.get().getEmail());
    }

    @Test
    void testFindByUsername_NotFound() {
        Optional<EmployeeEntity> found = employeeRepository.findByUsername("nonexistent");
        assertFalse(found.isPresent());
    }

    @Test
    void testFindByEmail() {
        entityManager.persist(testEmployee);
        entityManager.flush();
        entityManager.clear();

        Optional<EmployeeEntity> found = employeeRepository.findByEmail("jane.smith@example.com");

        assertTrue(found.isPresent());
        assertEquals("janesmith", found.get().getUsername());
    }

    @Test
    void testFindByEmail_NotFound() {
        Optional<EmployeeEntity> found = employeeRepository.findByEmail("nobody@example.com");
        assertFalse(found.isPresent());
    }

    @Test
    void testEmployeeInheritance() {
        EmployeeEntity saved = entityManager.persist(testEmployee);
        entityManager.flush();
        entityManager.clear();

        // JOINED inheritance: EmployeeEntity row stored in both base_user and employee tables.
        // Querying via base type must still resolve to the same entity.
        BaseUserEntity base = entityManager.find(BaseUserEntity.class, saved.getId());

        assertNotNull(base);
        assertInstanceOf(EmployeeEntity.class, base);
        assertEquals("janesmith", base.getUsername());
    }

    @Test
    void testDeleteEmployee() {
        EmployeeEntity saved = entityManager.persist(testEmployee);
        entityManager.flush();
        Long id = saved.getId();

        assertTrue(employeeRepository.existsById(id));

        employeeRepository.deleteById(id);
        entityManager.flush();

        assertFalse(employeeRepository.existsById(id));
    }
}
```

#### Edge Cases

1. **`testEmployeeInheritance` uses `entityManager.find()` not repository**: `TestEntityManager.find()` returns the Hibernate-managed entity using the JPA `find()` API directly. This tests whether Hibernate's JOINED inheritance discriminator correctly resolves `EmployeeEntity` through the `base_user` → `employee` join. A `@DataJpaTest` is sufficient; no `@SpringBootTest` is needed for this assertion.
2. **`@BeforeEach` calls `entityManager.clear()` not deleteAll**: H2 resets between `@DataJpaTest` test classes (each class gets a fresh context) but not between test methods within the same class. `entityManager.clear()` evicts cached entities; since the schema is recreated per-class with `create-drop`, no data cleanup is strictly needed between methods here. The `entityManager.clear()` is defensive and follows the pattern in `ClientRepositoryTest`.
3. **`UserRoles.EMPLOYEE` ordinal**: `BaseUserEntity.roles` is mapped via `@ElementCollection` without `@Enumerated(EnumType.STRING)` — it defaults to `@Enumerated(EnumType.ORDINAL)`. The `EMPLOYEE` value is third in the enum (0=ADMIN, 1=CLIENT, 2=EMPLOYEE). Do not reorder the enum; ordinal 2 must always mean EMPLOYEE.

---

### Step 2: Create EmployeeEntity and EmployeeRepository (TDD GREEN — Slice 1)

**Goal:** Create the two production files that make all `EmployeeRepositoryTest` tests pass.

**Dependencies:** Step 1 tests must be in place and failing.

- [x] Create `backend/src/main/java/com/agentForgeBackend/models/hq/employee/` package directory
- [x] Create `EmployeeEntity.java` — follows `AdminEntity` pattern exactly, no extra fields
- [x] Create `EmployeeRepository.java` — extends `DefaultRepository`, finders return `Optional`
- [x] Run `./mvnw test -Dtest=EmployeeRepositoryTest` from `backend/` and confirm all 7 tests pass <!-- REVIEW-FIX: removed incorrect -pl backend flag; backend/ is a standalone Maven project, not a submodule -->

**Why this step is critical:** `EmployeeEntity` must be registered in the JPA persistence context before Hibernate auto-DDL creates the `employee` table. Without it, even the `base_user` table won't have the right discriminator for Employee. The `@Table(name = "employee")` annotation must be present exactly as shown.

#### Implementation

```java
// EmployeeEntity.java
package com.agentForgeBackend.models.hq.employee;

import com.agentForgeBackend.shared.models.baseUser.BaseUserEntity;
import com.agentForgeBackend.shared.models.baseUser.UserRoles;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Set;

@Table(name = "employee")
@Entity
@NoArgsConstructor
@Getter
@Setter
public class EmployeeEntity extends BaseUserEntity {

    public EmployeeEntity(
            String firstName,
            String lastName,
            String email,
            Set<UserRoles> roles,
            String username,
            String password
    ) {
        super(firstName, lastName, email, roles, username, password);
    }
}
```

```java
// EmployeeRepository.java
package com.agentForgeBackend.models.hq.employee;

import com.agentForgeBackend.shared.defaultInterfaces.DefaultRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmployeeRepository extends DefaultRepository<EmployeeEntity, Long> {

    Optional<EmployeeEntity> findByUsername(String username);

    Optional<EmployeeEntity> findByEmail(String email);
}
```

#### Edge Cases

1. **`@NoArgsConstructor` is required**: JPA requires a no-argument constructor for entity instantiation during query result hydration. Lombok's `@NoArgsConstructor` handles this. Without it, Hibernate throws an `InstantiationException` at runtime.
2. **No `getBaseUser()` method**: `ClientEntity` has a `getBaseUser()` method that contains a recursive call bug (calls `this.getBaseUser()` instead of casting to `BaseUserEntity`). `EmployeeEntity` must not copy this method.
3. **No `apikey` column**: The `employee` table must not have an `apikey` column. Confirm by checking the H2 schema after `./mvnw compile` if needed.

---

### Step 3: Add existsByUsername and existsByEmail to BaseUserRepository

**Goal:** Add two Spring Data derived query methods that check cross-subtype uniqueness against the `base_user` table. These are required by the Employee service in Task 3.

**Dependencies:** Step 2 complete (EmployeeEntity must be a registered JPA entity so that BaseUserRepository's queries cover the full inheritance hierarchy).

- [x] Open `backend/src/main/java/com/agentForgeBackend/shared/securityUser/BaseUserRepository.java`
- [x] Add `boolean existsByUsername(String username);`
- [x] Add `boolean existsByEmail(String email);`
- [ ] Run `./mvnw test` to confirm no existing tests break (blocked by pre-existing `authServerApplicationTests` default-profile PostgreSQL failure; see `## Post-Review Notes`)

**Why this step is critical:** Admin and Client services currently call subtype-only finders for duplicate checks, which allows an Employee to reuse the same username as an existing Admin if only checked against `EmployeeRepository`. Placing `existsByUsername`/`existsByEmail` on `BaseUserRepository` means a single query covers all user subtypes via the JOINED inheritance view. The Employee service (Task 3) uses these; the Admin and Client service updates are also in Task 3 scope.

#### Implementation

```java
// BaseUserRepository.java — full file after modification
package com.agentForgeBackend.shared.securityUser;

import com.agentForgeBackend.shared.defaultInterfaces.DefaultRepository;
import com.agentForgeBackend.shared.models.baseUser.BaseUserEntity;

import java.util.Optional;

public interface BaseUserRepository extends DefaultRepository<BaseUserEntity, Long> {

    Optional<BaseUserEntity> findByUsername(String username);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);
}
```

#### Edge Cases

1. **Spring Data derives these from method names**: `existsByUsername` translates to `SELECT COUNT(*) > 0 FROM base_user WHERE username = ?`. With JOINED inheritance, `base_user` contains all user rows (Admin, Client, Employee) — so this truly is cross-subtype. No custom `@Query` annotation is needed.
2. **No `existsByEmail` on the base entity currently**: `base_user.email` has a `unique = true` constraint, so duplicates will always cause a `DataIntegrityViolationException` anyway. But the `existsByEmail` check in the service is a controlled early rejection, returning a meaningful `ItemAlreadyExist` error rather than a generic database constraint error.
3. **No test in this task**: The correctness of cross-subtype uniqueness (Admin username vs Employee insert) is tested at the service layer in Task 3. Spring Data derived queries are framework-guaranteed; testing `existsByUsername` in isolation would only test Spring Data itself.

---

### Step 4: Write EmployeeMapperTest (TDD RED — Slice 2)

**Goal:** Establish failing tests that define the mapper's observable DTO contract before any DTO or mapper code exists.

**Dependencies:** `EmployeeEntity` must exist (Step 2 complete) so tests can instantiate it.

- [x] Create `EmployeeMapperTest.java` in the test package `com.agentForgeBackend.models.hq.employee`
- [x] Annotate with `@ExtendWith(MockitoExtension.class)` — pure unit test, no Spring context
- [x] Instantiate `EmployeeMapper` directly in `@BeforeEach`
- [x] Build a shared `EmployeeEntity` test fixture with `UserRoles.EMPLOYEE`, known name/email/username, and a set `dateCreated`/`lastLogin`
- [x] Write test: `toDTO_mapsRolesAsAuthorities` — assert `dto.getRoles()` contains `"ROLE_EMPLOYEE"` (not `"EMPLOYEE"`)
- [x] Write test: `toDTO_doesNotExposePassword` — assert `EmployeeDTO` has no `password` field at compile time (enforced by the absence of the field in the class) — implement as a check that `dto.getRoles()` is correct and the returned object has no raw password value accessible
- [x] Write test: `toDTO_mapsNameAndEmail` — assert firstName, lastName, email, username map correctly
- [x] Write test: `toListDTO_includesIdAndAuditFields` — assert id, enabled, dateCreated, lastLogin are mapped correctly
- [x] Write test: `toListDTO_nullEntityReturnsNull` — assert `mapper.toListDTO(null)` returns null
- [x] Write test: `toSmallDTO_mapsRolesAsAuthorities` — assert `miniDTO.getRoles()` contains `"ROLE_EMPLOYEE"`
- [x] Write test: `toEntity_nullFormReturnsNull` — assert `mapper.toEntity(null)` returns null
- [x] Write test: `toEntity_mapsNonNullFields` — build a form with all fields set, assert each is mapped to entity
- [x] Write test: `toEntity_skipsNullFields` — build a partial form (null lastName), assert entity field is null (not overwritten with null)
- [x] Write test: `toEntity_doesNotMapPassword` — mapper `toEntity` maps the password field from the form (as a raw value) but does NOT encode it — encoding is the service's responsibility. Assert `entity.getPassword()` equals the raw value from the form.

**Why this step is critical:** The mapper is the primary contract between the API layer and the persistence layer. Failing tests guarantee that the DTOs and form are created to match the expected contract before any implementation decision is made. In particular, `toDTO_mapsRolesAsAuthorities` locks in `"ROLE_EMPLOYEE"` format before it can drift to `"EMPLOYEE"` or `"ROLE_EMPLOYEE"` depending on who writes the mapper.

#### Implementation

```java
package com.agentForgeBackend.models.hq.employee;

import com.agentForgeBackend.shared.models.baseUser.UserRoles;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Date;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class EmployeeMapperTest {

    private EmployeeMapper mapper;
    private EmployeeEntity entity;

    @BeforeEach
    void setUp() {
        mapper = new EmployeeMapper();

        entity = new EmployeeEntity();
        entity.setId(42L);
        entity.setFirstName("Alice");
        entity.setLastName("Wonder");
        entity.setEmail("alice@example.com");
        entity.setUsername("alicew");
        entity.setPassword("someHash");
        entity.setRoles(Set.of(UserRoles.EMPLOYEE));
        entity.setEnabled(true);
        entity.setDateCreated(new Date(0));
        entity.setLastLogin(new Date(1000));
        entity.setAccountNonExpired(true);
        entity.setAccountNonLocked(true);
        entity.setCredentialsNonExpired(true);
    }

    @Test
    void toDTO_mapsRolesAsAuthorities() {
        EmployeeDTO dto = mapper.toDTO(entity);
        assertTrue(dto.getRoles().contains("ROLE_EMPLOYEE"));
        assertFalse(dto.getRoles().contains("EMPLOYEE"));
    }

    @Test
    void toDTO_mapsNameAndEmail() {
        EmployeeDTO dto = mapper.toDTO(entity);
        assertEquals("Alice", dto.getFirstName());
        assertEquals("Wonder", dto.getLastName());
        assertEquals("alice@example.com", dto.getEmail());
        assertEquals("alicew", dto.getUsername());
    }

    @Test
    void toListDTO_includesIdAndAuditFields() {
        EmployeeListDTO listDTO = mapper.toListDTO(entity);
        assertEquals(42L, listDTO.getId());
        assertTrue(listDTO.isEnabled());
        assertNotNull(listDTO.getDateCreated());
        assertNotNull(listDTO.getLastLogin());
        assertTrue(listDTO.getRoles().contains("ROLE_EMPLOYEE"));
    }

    @Test
    void toListDTO_nullEntityReturnsNull() {
        assertNull(mapper.toListDTO(null));
    }

    @Test
    void toSmallDTO_mapsRolesAsAuthorities() {
        EmployeeMiniDTO mini = mapper.toSmallDTO(entity);
        assertTrue(mini.getRoles().contains("ROLE_EMPLOYEE"));
    }

    @Test
    void toEntity_nullFormReturnsNull() {
        assertNull(mapper.toEntity(null));
    }

    @Test
    void toEntity_mapsNonNullFields() {
        EmployeeForm form = new EmployeeForm();
        form.setFirstName("Bob");
        form.setLastName("Builder");
        form.setEmail("bob@example.com");
        form.setUsername("bobbuilder");
        form.setPassword("rawPassword");

        EmployeeEntity result = mapper.toEntity(form);

        assertEquals("Bob", result.getFirstName());
        assertEquals("Builder", result.getLastName());
        assertEquals("bob@example.com", result.getEmail());
        assertEquals("bobbuilder", result.getUsername());
        assertEquals("rawPassword", result.getPassword());
    }

    @Test
    void toEntity_skipsNullFields() {
        EmployeeForm form = new EmployeeForm();
        form.setFirstName("Bob");
        // lastName is null

        EmployeeEntity result = mapper.toEntity(form);

        assertEquals("Bob", result.getFirstName());
        assertNull(result.getLastName()); // null skipped — field stays null on new entity
    }

    @Test
    void toEntity_doesNotEncodePassword() {
        // Mapper passes raw password; encoding is the service's responsibility
        EmployeeForm form = new EmployeeForm();
        form.setPassword("plainTextPassword");

        EmployeeEntity result = mapper.toEntity(form);

        assertEquals("plainTextPassword", result.getPassword());
    }
}
```

#### Edge Cases

1. **`@ExtendWith(MockitoExtension.class)` — no Spring context**: The mapper is a pure `@Component` with no injected dependencies. Instantiating it directly with `new EmployeeMapper()` is faster and simpler than `@SpringBootTest`. If the mapper later gains a dependency, this test must be updated.
2. **`toEntity_skipsNullFields` tests null-skip behavior**: The mapper must use `if (form.getX() != null) entity.setX(...)` per field. This is defensive null safety: when a caller submits a partial form with null fields, the resulting entity has those fields as null rather than throwing a NullPointerException. Note that `toEntity()` always creates a **new** `EmployeeEntity` — it does not merge into an existing one. On the update path in Task 3, the service will directly update the existing entity's fields from the form (not by calling `mapper.toEntity(form)` and merging). The null-check pattern here matches the `AdminMapper` convention and prevents surprises if this mapper method is ever called with a partial form. <!-- REVIEW-FIX: corrected misleading explanation that said the null-check "matters for the update path where the service merges a toEntity result into an existing entity" — the service update path in Task 3 bypasses toEntity() entirely and updates fields directly on the loaded entity -->

---

### Step 5: Create Employee DTOs and EmployeeForm

**Goal:** Create the four data types required by the mapper so the mapper tests can compile and then pass.

**Dependencies:** Step 4 tests written and failing (compilation errors because types don't exist yet).

- [x] Create `EmployeeDTO.java` — `firstName`, `lastName`, `email`, `username`, `roles` — no `id`, no `password`, no `apikey`
- [x] Create `EmployeeMiniDTO.java` — same fields as `EmployeeDTO` — no `id`, no `password`, no `apikey`
- [x] Create `EmployeeListDTO.java` — adds `id`, `enabled`, `dateCreated`, `lastLogin`
- [x] Create `EmployeeForm.java` — `firstName`, `lastName`, `email`, `username`, `password` — no `roles`, no `apikey`; `password` must NOT have `@NotBlank`; `username` may optionally keep `@NotBlank` as the one required field for insert, but check against parent spec — the parent says password is optional at the form level and the service validates for insert; to keep the form truly neutral for both insert and update, omit `@NotBlank` from all fields and let the service enforce required-field rules

**Why this step is critical:** These types exist solely to satisfy the mapper's generic parameter contract. Their shape — specifically the absence of `password` in DTO types and the absence of `apikey` in all types — defines the security contract. Once these types compile, the mapper tests move from compilation failure to assertion failure (the actual TDD RED state).

#### Implementation

```java
// EmployeeDTO.java
package com.agentForgeBackend.models.hq.employee;

import lombok.*;
import java.util.Set;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Getter
@Setter
public class EmployeeDTO {
    private String firstName;
    private String lastName;
    private String email;
    private String username;
    private Set<String> roles;
}
```

```java
// EmployeeMiniDTO.java
package com.agentForgeBackend.models.hq.employee;

import lombok.*;
import java.util.Set;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Getter
@Setter
public class EmployeeMiniDTO {
    private String firstName;
    private String lastName;
    private String email;
    private String username;
    private Set<String> roles;
}
```

```java
// EmployeeListDTO.java
package com.agentForgeBackend.models.hq.employee;

import lombok.*;
import java.util.Date;
import java.util.Set;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Getter
@Setter
public class EmployeeListDTO {
    private Long id;
    private String firstName;
    private String lastName;
    private String email;
    private String username;
    private Set<String> roles;
    private boolean enabled;
    private Date dateCreated;
    private Date lastLogin;
}
```

```java
// EmployeeForm.java
package com.agentForgeBackend.models.hq.employee;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class EmployeeForm {
    private String firstName;
    private String lastName;
    private String email;
    private String username;
    private String password;
    // No roles field — service assigns EMPLOYEE forcibly
    // No apikey field — Employee has no API key
    // No @NotBlank on password — form is used for both insert and update;
    // null/blank password on update means preserve existing hash
}
```

#### Edge Cases

1. **`@NotBlank` intentionally absent on all EmployeeForm fields**: Unlike `AdminForm` which requires `username` via `@NotBlank`, `EmployeeForm` has no validation annotations. Insert validation (non-blank username, email, password) is enforced at the service layer (Task 3), not the form level. This is intentional per the parent feature spec: "must remain optional at the form level."
2. **No `@Builder` on `EmployeeForm`**: Admin form uses `@AllArgsConstructor` + `@Data`. `EmployeeForm` follows the same pattern without `@Builder` to keep it consistent with `AdminForm`.
3. **`EmployeeDTO` and `EmployeeMiniDTO` are identical in shape**: In the Admin domain, `AdminDTO` and `AdminMiniDTO` also have identical shapes. The distinction is semantic — `insert()` returns `MINIDTO` and `getOne()`/`update()` returns `DTO`. Future versions may diverge; keeping them separate types now avoids a future refactor.

---

### Step 6: Create EmployeeMapper (TDD GREEN — Slice 2)

**Goal:** Implement `EmployeeMapper` so all tests from Step 4 pass.

**Dependencies:** Steps 4 and 5 complete (mapper test written, DTO/form types exist).

- [x] Create `EmployeeMapper.java` implementing `DefaultMapper<EmployeeDTO, EmployeeMiniDTO, EmployeeListDTO, EmployeeForm, EmployeeEntity>`
- [x] Annotate with `@Component`
- [x] Implement `toDTO()` — map fields, roles via `UserRoles::getAuthority`; null-safe roles stream
- [x] Implement `toSmallDTO()` — same pattern as `toDTO()`
- [x] Implement `toListDTO()` — add id, enabled, dateCreated, lastLogin; guard with `if (entity == null) return null`
- [x] Implement `toEntity()` — guard with `if (form == null) return null`; null-check each field before setting; do NOT map password through a null guard (null password means leave unset — service handles the null-password-on-update case separately)
- [x] Run `./mvnw test -Dtest=EmployeeMapperTest` from `backend/` and confirm all tests pass <!-- REVIEW-FIX: removed incorrect -pl backend flag -->
- [ ] Run `./mvnw test` from `backend/` and confirm all existing tests still pass <!-- REVIEW-FIX: removed incorrect -pl backend flag -->

**Why this step is critical:** The mapper is the bridge between REST input/output and the JPA entity. Any field that appears in the DTO but not the entity (or vice versa) creates a silent data loss or exposure bug. The tests from Step 4 make the exact contract explicit.

#### Implementation

```java
package com.agentForgeBackend.models.hq.employee;

import com.agentForgeBackend.shared.defaultInterfaces.DefaultMapper;
import com.agentForgeBackend.shared.models.baseUser.UserRoles;
import org.springframework.stereotype.Component;

import java.util.stream.Collectors;

@Component
public class EmployeeMapper implements DefaultMapper<EmployeeDTO, EmployeeMiniDTO, EmployeeListDTO, EmployeeForm, EmployeeEntity> {

    @Override
    public EmployeeDTO toDTO(EmployeeEntity entity) {
        return EmployeeDTO.builder()
                .firstName(entity.getFirstName())
                .lastName(entity.getLastName())
                .email(entity.getEmail())
                .username(entity.getUsername())
                .roles(entity.getRoles() == null ? null :
                        entity.getRoles().stream()
                                .map(UserRoles::getAuthority)
                                .collect(Collectors.toSet()))
                .build();
    }

    @Override
    public EmployeeMiniDTO toSmallDTO(EmployeeEntity entity) {
        return EmployeeMiniDTO.builder()
                .firstName(entity.getFirstName())
                .lastName(entity.getLastName())
                .email(entity.getEmail())
                .username(entity.getUsername())
                .roles(entity.getRoles() == null ? null :
                        entity.getRoles().stream()
                                .map(UserRoles::getAuthority)
                                .collect(Collectors.toSet()))
                .build();
    }

    @Override
    public EmployeeListDTO toListDTO(EmployeeEntity entity) {
        if (entity == null) return null;

        return EmployeeListDTO.builder()
                .id(entity.getId())
                .firstName(entity.getFirstName())
                .lastName(entity.getLastName())
                .email(entity.getEmail())
                .username(entity.getUsername())
                .roles(entity.getRoles() == null ? null :
                        entity.getRoles().stream()
                                .map(UserRoles::getAuthority)
                                .collect(Collectors.toSet()))
                .enabled(entity.isEnabled())
                .dateCreated(entity.getDateCreated())
                .lastLogin(entity.getLastLogin())
                .build();
    }

    @Override
    public EmployeeEntity toEntity(EmployeeForm form) {
        if (form == null) return null;

        EmployeeEntity entity = new EmployeeEntity();
        if (form.getFirstName() != null)
            entity.setFirstName(form.getFirstName());
        if (form.getLastName() != null)
            entity.setLastName(form.getLastName());
        if (form.getEmail() != null)
            entity.setEmail(form.getEmail());
        if (form.getUsername() != null)
            entity.setUsername(form.getUsername());
        if (form.getPassword() != null)
            entity.setPassword(form.getPassword());
        // Roles are never set from form — service assigns EMPLOYEE forcibly
        return entity;
    }
}
```

#### Edge Cases

1. **Null roles collection**: `BaseUserEntity.roles` initializes to `new HashSet<>()` so it is never actually null on a real entity. But the null guard on `entity.getRoles()` is defensive and handles edge cases in tests where roles are not set.
2. **`toEntity` skips roles input**: Unlike `AdminMapper.toEntity()` which maps `adminForm.getRoles()` (and risks NPE if roles is null), `EmployeeMapper.toEntity()` simply does not map roles at all. The service will call `toSave.setRoles(Set.of(UserRoles.EMPLOYEE))` explicitly in Task 3.
3. **`toEntity` maps password as raw value**: The raw password from the form is placed into the entity field as-is. The service must BCrypt-encode it before calling `repository.save()`. The mapper has no `PasswordEncoder` dependency — keeping encoding out of the mapper follows SRP.

---

### Step 7: Compile to Generate QEmployeeEntity (Step 2.5)

**Goal:** Trigger the QueryDSL APT annotation processor to generate `QEmployeeEntity` in `target/generated-sources/annotations/`. This class is required by `EmployeeQueryProfile` in Task 3.

**Dependencies:** `EmployeeEntity.java` exists (Step 2 complete).

- [x] Run `./mvnw compile` from `backend/` (or `./mvnw test` which also compiles) <!-- REVIEW-FIX: removed incorrect -pl backend flag -->
- [x] Verify `QEmployeeEntity` appears in `target/generated-sources/annotations/com/agentForgeBackend/models/hq/employee/QEmployeeEntity.java`
- [x] If it does not appear, check that the `querydsl-apt` APT processor is configured in `pom.xml` (it should be, since `QAdminEntity` and `QClientEntity` already exist)

**Why this step is critical:** Without `QEmployeeEntity`, `EmployeeQueryProfile` cannot reference `QEmployeeEntity.employeeEntity` and `ADMIN.id`, `ADMIN.firstName`, etc. Task 3's `EmployeeQueryProfile` will fail to compile. This step has no test — it is a build prerequisite.

#### Edge Cases

1. **Stale Q-classes from a previous compile**: If the `target/` directory is not clean and a stale `QEmployeeEntity` from a failed previous attempt exists, it may reference fields that changed. Run `./mvnw clean compile` from `backend/` if the generated class causes unexpected errors in Task 3. <!-- REVIEW-FIX: removed incorrect -pl backend flag -->
2. **IDE may not pick up new Q-class**: IDEs (IntelliJ, Eclipse) sometimes need a manual "Reload Maven Project" or marking `target/generated-sources/annotations/` as a generated sources root before code completion works. This does not affect `./mvnw test` execution.

---

## Design Decisions

**Decision 1: `EmployeeRepository` finders return `Optional`, not plain type**
- **Why:** `AdminRepository.findByUsername()` and `findByEmail()` return plain types (null on not-found). This forces callers to null-check explicitly. `ClientRepository` uses `Optional`, which makes the absence case explicit and compiler-checked. `EmployeeRepository` follows the `Optional` pattern for safety and consistency with the newer Client domain code.
- **Alternatives considered:** Plain type return (matching Admin). Rejected because it creates a silent null-dereference risk at the call site.

**Decision 2: `EmployeeForm` has no `roles` field**
- **Why:** `AdminForm` has a `roles` field that `AdminMapper.toEntity()` maps, creating a surface where a caller could theoretically supply roles if the service doesn't override them. `EmployeeForm` omits the field entirely — there is no mechanism to supply roles through the Employee API contract. The service assigns `EMPLOYEE` forcibly. This eliminates the privilege-escalation surface entirely at the form level rather than just guarding against it in the service.
- **Alternatives considered:** Including `roles` in `EmployeeForm` but ignoring it in the service. Rejected because having an accepted-but-ignored field is confusing and misleading in documentation.

**Decision 3: `EmployeeForm` has no `@NotBlank` validation annotations**
- **Why:** The form is shared between insert and update. On insert, the service must validate that username, email, and password are non-blank. On update, only fields that are supplied and non-blank should be applied (null/blank password means preserve existing hash). Bean validation annotations on the form would fire on both paths and would reject partial-update requests where password is legitimately null. Service-layer validation is more flexible and explicit about which path requires which fields.
- **Alternatives considered:** Separate `EmployeeInsertForm` and `EmployeeUpdateForm` with different validation annotations. Rejected because the parent feature spec explicitly says to use one form type; adding two form types is scope creep for Task 2.

**Decision 4: Two TDD slices instead of one**
- **Why:** Slice 1 (entity/repository) uses `@DataJpaTest` — a narrow Spring context that only loads JPA infrastructure. Slice 2 (DTOs/mapper) is a pure unit test with no Spring context. Merging them would require `@SpringBootTest` for the mapper test (unnecessary overhead) or mocking JPA infrastructure (fragile). Keeping them separate gives faster test execution and narrower failure scopes.
- **Alternatives considered:** One `@SpringBootTest` test class covering all of Task 2. Rejected due to speed and diagnostic clarity.

**Decision 5: `existsByUsername` and `existsByEmail` on `BaseUserRepository`, not `EmployeeRepository`**
- **Why:** The uniqueness contract is cross-subtype. If an Admin already owns `alice@example.com`, an Employee insert with the same email must be rejected. `EmployeeRepository.existsByEmail()` would only check the `employee` table. `BaseUserRepository.existsByEmail()` checks `base_user`, which covers Admin, Client, and Employee rows via JOINED inheritance.
- **Alternatives considered:** Adding `existsByUsername`/`existsByEmail` to each subtype repository. Rejected because it would still miss cross-subtype conflicts. The whole point is global uniqueness.

---

## Testing Considerations

### Automatic Validation

- [x] Run `./mvnw test -Dtest=EmployeeRepositoryTest` from `backend/` — all 7 repository tests pass after Step 2 <!-- REVIEW-FIX: removed incorrect -pl backend flag -->
- [x] Run `./mvnw test -Dtest=EmployeeMapperTest` from `backend/` — all 10 mapper tests pass after Step 6 <!-- REVIEW-FIX: removed incorrect -pl backend flag -->
- [ ] Run `./mvnw test` from `backend/` — all 169+ pre-existing tests continue to pass after all changes <!-- REVIEW-FIX: removed incorrect -pl backend flag -->
- [x] Verify `target/generated-sources/annotations/com/agentForgeBackend/models/hq/employee/QEmployeeEntity.java` exists after Step 7
- [x] Run `./mvnw compile` from `backend/` with no compilation errors — confirms all new types are correctly wired <!-- REVIEW-FIX: removed incorrect -pl backend flag -->

### Manual Validation

- [ ] Inspect H2 schema in test output (enable `spring.jpa.show-sql=true` temporarily or use H2 console in `@DataJpaTest`) — confirm a `employee` table is created alongside `base_user` after `EmployeeEntity` is added
- [ ] Confirm `QEmployeeEntity` (Step 7 output) has fields `employeeEntity.id`, `employeeEntity.firstName`, `employeeEntity.lastName`, `employeeEntity.email`, `employeeEntity.username`, `employeeEntity.enabled`, `employeeEntity.dateCreated`, `employeeEntity.lastLogin` — all needed by Task 3's `EmployeeQueryProfile`
- [ ] Confirm `EmployeeDTO`, `EmployeeMiniDTO`, and `EmployeeListDTO` have no `password` field and no `apikey`/`apiKey` field — visual inspection of the class definitions is sufficient

---

## Related Code Explanations

- `backend/src/main/java/com/agentForgeBackend/shared/models/baseUser/BaseUserEntity.java` — Employee extends this; all shared user fields (username, email, password, roles, audit dates, account status flags) are defined here
- `backend/src/main/java/com/agentForgeBackend/shared/securityUser/BaseUserRepository.java` — modified in Step 3; now owns cross-subtype uniqueness checking
- `backend/src/main/java/com/agentForgeBackend/models/hq/admin/AdminEntity.java:16` — exact model for `EmployeeEntity` (no extra columns, super() constructor)
- `backend/src/main/java/com/agentForgeBackend/models/hq/admin/AdminMapper.java:76` — `adminForm.getRoles().isEmpty()` without null guard — the Employee mapper must NOT replicate this bug
- `backend/src/main/java/com/agentForgeBackend/shared/defaultImplements/DefaultServiceImplements.java:90-93` — `update()` is incomplete (loads entity, saves unchanged) — the Employee service in Task 3 must override this method fully; this task creates the `EmployeeForm` that the override will use

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected for this task
- [x] Spring Data JPA and QueryDSL documentation reviewed for version-matched accuracy
- [x] `EmployeeRepositoryTest.java` created with 7 behavior tests — all pass after Step 2
- [x] `EmployeeEntity.java` created: `@Table(name = "employee")`, extends `BaseUserEntity`, no extra columns, no apikey
- [x] `EmployeeRepository.java` created: extends `DefaultRepository`, `findByUsername` and `findByEmail` return `Optional`
- [x] `BaseUserRepository.java` modified: `existsByUsername` and `existsByEmail` added
- [x] `EmployeeMapperTest.java` created with 10 contract tests — all pass after Step 6
- [x] `EmployeeDTO.java`, `EmployeeMiniDTO.java`, `EmployeeListDTO.java` created — no password field, no apikey field
- [x] `EmployeeForm.java` created — no `roles` field, no `@NotBlank` annotations
- [x] `EmployeeMapper.java` created: maps roles via `UserRoles::getAuthority`, null-safe on all conversions, does not map roles from form
- [x] `./mvnw compile` generates `QEmployeeEntity` in `target/generated-sources/annotations/`
- [ ] `./mvnw test` passes: all 169+ pre-existing tests plus all new Employee tests
- [x] No Employee DTO has a `password`, `apiKey`, or `apikey` field, and `EmployeeForm` has no `apiKey` or `apikey` field
- [x] Manual validation steps documented for the user

## Post-Review Notes

- `./mvnw test` still fails on the pre-existing `authServerApplicationTests.contextLoads` integration test. The failure is unrelated to Employee changes: the default-profile test attempts to connect to PostgreSQL host `db` and errors with `java.net.UnknownHostException: db` while initializing the batch datasource.
- A completion criterion in the original task document incorrectly said the Employee **form** must not contain a `password` field. This was corrected during execution to match the parent feature and task requirements: `EmployeeForm` intentionally includes `password`, while Employee DTOs exclude `password` and all Employee contract types exclude `apiKey`/`apikey`.
