# Task: Add Employee Login and JWT Role Coverage

#task #current #high-complexity #parent-employee-user-entity-and-role

**Parent:** [[Employee-User-Entity-and-Role]]
**Parent Type:** Feature
**Related Step(s):** Phase 4 — Steps 4.1, 4.2, 4.3, 4.4
**Estimated Complexity:** High

---

## Goal

Prove that Employee is a functional login user by verifying through real HTTP tests that the `/login` endpoint authenticates Employee credentials and returns a JWT containing `ROLE_EMPLOYEE`, that the JWT allows access to non-admin endpoints, and that it is denied at admin-only Employee management endpoints. Also refactor `AuthUserUtil` to use `BaseUserRepository` for entity lookups and add Employee-specific helper methods.

---

## Parent Context

**Step 4.1 (Feature §4):** Add Employee login tests proving `/login` authenticates Employee credentials. These tests must use real HTTP through MockMvc and real entity persistence (H2), not `@WithMockUser`. The `/login` endpoint is handled by `SecurityController.login()` which delegates to `SecurityUserServiceImpl.loadUserByUsername()` via Spring's `AuthenticationManager`. Since `SecurityUserServiceImpl` uses `BaseUserRepository.findByUsername()` and `EmployeeEntity extends BaseUserEntity`, Employee login should work without code changes — the tests PROVE this is the case.

**Step 4.2 (Feature §4):** Add JWT response tests proving Employee login returns `ROLE_EMPLOYEE`. The `SecurityController` extracts roles from `SecurityUser.getAuthorities()`, which maps `UserRoles.EMPLOYEE.getAuthority()` → `"ROLE_EMPLOYEE"`. The JWT `LoginResponseDTO.roles` field must contain this string.

**Step 4.3 (Feature §4):** Add JWT-protected request tests proving Employee tokens do not grant admin-only Employee CRUD access. The HTTP filter chain (`/employee/**` → `hasRole("ADMIN")`) and method-level `@PreAuthorize("hasRole('ADMIN')")` on `EmployeeService` provide two layers of denial. An Employee JWT (containing only `ROLE_EMPLOYEE`) must be rejected at both layers.

**Step 4.4 (Feature §12 — AuthUserUtil Employee support):** Refactor `AuthUserUtil` to use `BaseUserRepository` for entity lookups instead of per-subtype repositories. Extract a private generic helper `<T extends BaseUserEntity> Optional<T> getAuthUserEntity(Class<T>)`. Add `isAuthUserEmployee()` (role-only check) and `getAuthUserEmployeeEntity()` (one-line delegation to the generic helper). The refactoring must not break existing `isAuthUserAdmin()` and `isAuthUserClient()` behavior. Add `AuthUserUtilTest` verifying the entity getters return correct `instanceof` subtypes under JOINED inheritance after the refactoring.

**Testing decisions (Feature §Testing):**
- Test Employee as a normal login user through `/login`, not only with `@WithMockUser`.
- Avoid tests that assert private implementation details.
- Each module's first behavior test belongs in the implementation task, not Phase 5.

**Authorization rules (from Task 1 already implemented):** The HTTP filter chain enforces `/employee/**` → `hasRole("ADMIN")`, `/admin/**` → `hasRole("ADMIN")`, `/login` → `permitAll`, and `anyRequest().authenticated()`. An Employee JWT grants access to `GET /test` (matches the authenticated fallback) but is blocked at `/employee/**` and `/admin/**`.

**Feature no-API-key guarantee:** No Employee endpoint or DTO exposes an API key. This task adds no new Employee-specific endpoints — all login behavior routes through the existing `/login` endpoint shared with Admin and Client.

---

## Preconditions / Dependencies

- **Task 1 complete:** `@EnableMethodSecurity`, HTTP `authorizeHttpRequests` matrix (`/employee/**` and `/admin/**` → `hasRole("ADMIN")`, `/client/**` → `authenticated`, `/login` → `permitAll`, `anyRequest().authenticated()`), `SecurityAuthorizationTest` (6 passing tests) all in place and verified.
- **Task 2 complete:** `EmployeeEntity`, `EmployeeRepository`, `EmployeeMapper`, DTOs, `EmployeeForm`, and `BaseUserRepository.existsByUsername`/`existsByEmail` all exist.
- **Task 3 complete:** `EmployeeQueryProfile`, `EmployeeService` (all 6 CRUD/list methods with `@PreAuthorize("hasRole('ADMIN')")`), and `EmployeeController` at `/employee` all exist and tested.
- `TestAuthenticationHelper` at `backend/src/test/java/com/agentForgeBackend/testUtils/TestAuthenticationHelper.java` — provides the JWT test setup pattern to follow; will be extended in Step 1.
- `SecurityAuthorizationTest` at `backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java` — direct structural template for `EmployeeLoginJwtTest`.
- H2 in-memory test DB configured via `application-test.properties` with `spring.jpa.hibernate.ddl-auto=create-drop` and `TK_KEY` JWT secret set to a 256-bit test value.
- `AuthUserUtil` at `backend/src/main/java/com/agentForgeBackend/shared/tools/AuthUserUtil.java` — currently injects `AdminRepository` and `ClientRepository`. No callers of this class are known to require breaking changes after the refactor (the public interface is backward-compatible; only the constructor and private implementation change).
- No existing `AuthUserUtilTest` exists — this task creates it.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — Selected — task template and document placement conventions.
- `solid-deep-design` — Selected — `AuthUserUtil` refactoring is a DIP + OCP improvement: two concrete repository dependencies become one abstraction. The private generic `getAuthUserEntity(Class<T>)` is a deep module: small interface (one line at each call site), substantial implementation (findByUsername + instanceof filter + cast hidden inside). Deletion test: removing the generic helper scatters the instanceof + cast pattern across three getter methods and every future getter added. The module is deep — keep it.
- `tdd` — Selected — TDD in vertical slices: (1) Employee login/JWT response tests → no prod code needed, (2) JWT access control tests → no prod code needed, (3) `AuthUserUtil` refactoring → write `AuthUserUtilTest` first (RED), then refactor (GREEN).
- `memory-bank` — Selected — architecture, known-issues, tech stack context loaded at session start; confirmed JOINED inheritance and JWT filter patterns.
- `find-docs` — Not needed for new API queries — all patterns confirmed from existing working test code in the codebase. `SecurityAuthorizationTest` and `TestAuthenticationHelper` already demonstrate the Spring Security MockMvc JWT patterns that this task follows.
- `glossary-management` — Not invoked — `.glossaryrc` not found; domain language derived from Memory Bank and Feature document.

### Documentation Reviewed

- **Spring Security 6.4.x MockMvc JWT integration test pattern** — verified from `SecurityAuthorizationTest.java` (existing, working test). JWT is sent as `Authorization: Bearer <token>` header. The `JWTTokenValidatorFilter` processes it, extracts `username` and `authorities` claims, and populates `SecurityContextHolder`. MockMvc tests use `.header("Authorization", "Bearer " + token)`.
- **jjwt 0.12.5 token generation** — verified from `JwtTokenService.generateToken()` and `TestAuthenticationHelper`. The JWT `authorities` claim contains a list of objects serialized as `[{"authority": "ROLE_EMPLOYEE"}]`. `JWTTokenValidatorFilter` extracts them by reading the `"authority"` key from each Map entry.
- **Spring Security 6.x `UserDetails` default methods** — **Known issue**: `SecurityUser` implements `UserDetails` but defines `getAccountNonExpired()` etc. instead of `isAccountNonExpired()`. Spring Security 6.x `UserDetails` provides default implementations for `is*` methods returning `true`. This means entity-level `enabled`, `accountNonExpired`, `accountNonLocked`, and `credentialsNonExpired` flags do NOT affect login decisions in the current implementation. Employee login succeeds regardless of these flags. This is a pre-existing issue tracked in `documentation/Memory/known-issues.md` — not introduced by this task and not fixed here.
- **`BaseUserRepository.findByUsername()` JOINED inheritance** — verified from `SecurityUserServiceImpl.loadUserByUsername()`. When called with an employee username, `BaseUserRepository.findByUsername()` returns the `EmployeeEntity` instance typed as `BaseUserEntity`. The JPA runtime correctly hydrates the full subtype object including the `employee` joined table. The `filter(type::isInstance)` in `getAuthUserEntity()` correctly identifies the returned object as `EmployeeEntity`.

### Related Existing Code

- `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityController.java` — handles `/login`; authenticates via `AuthenticationManager`, wraps user in `SecurityUser`, extracts `getAuthorities()` → `LoginResponseDTO.roles`.
- `backend/src/main/java/com/agentForgeBackend/configuration/filter/JWTTokenValidatorFilter.java` — validates JWT per request, extracts `username` (as `String` principal) and `authorities` claims, sets SecurityContext.
- `backend/src/main/java/com/agentForgeBackend/shared/securityUser/SecurityUserServiceImpl.java` — `loadUserByUsername()` queries `BaseUserRepository.findByUsername()` covering all subtypes; returns `new SecurityUser(user)`.
- `backend/src/main/java/com/agentForgeBackend/shared/securityUser/SecurityUser.java` — wraps `BaseUserEntity`; `getAuthorities()` maps `UserRoles.getAuthority()` → `SimpleGrantedAuthority("ROLE_EMPLOYEE")` for Employee users.
- `backend/src/main/java/com/agentForgeBackend/shared/tools/AuthUserUtil.java` — to be refactored; currently uses `AdminRepository.findByUsername()` (non-Optional) and `ClientRepository.findByUsername()` (Optional), producing inconsistent return paths. After refactoring: single `baseUserRepository.findByUsername()` path via generic helper.
- `backend/src/test/java/com/agentForgeBackend/testUtils/TestAuthenticationHelper.java` — extended in Step 1; currently creates Admin and Client with programmatic JWT tokens.
- `backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java` — direct structural template for `EmployeeLoginJwtTest`; demonstrates the `initializeMockUsers()` + MockMvc JWT Authorization header pattern.

---

## Implementation Details

### Approach

Three TDD vertical slices:

**Slice 1 — Employee login and JWT response (Steps 4.1 + 4.2):**
Extend `TestAuthenticationHelper` with `initializeEmployeeMockUser()`. Write `EmployeeLoginJwtTest` with login tests. These tests prove the existing infrastructure handles Employee without any new production code: `SecurityUserServiceImpl` loads `EmployeeEntity` via `BaseUserRepository`, `SecurityUser.getAuthorities()` emits `ROLE_EMPLOYEE`, `JwtTokenService` encodes it, and `LoginResponseDTO.roles` carries `"ROLE_EMPLOYEE"`.

**Slice 2 — JWT access control (Step 4.3):**
Add access control tests to `EmployeeLoginJwtTest`. Use the programmatic employee token from the helper to verify: `GET /test` → 200 (Employee JWT is a valid authenticated token), `POST /employee/list` → 403 (admin-only), `POST /admin/list` → 403 (admin-only). No production code changes — Task 1's HTTP security rules already enforce this.

**Slice 3 — AuthUserUtil refactoring (Step 4.4):**
Write `AuthUserUtilTest` first (RED — fails because `isAuthUserEmployee()` and `getAuthUserEmployeeEntity()` don't exist). Refactor `AuthUserUtil` to use `BaseUserRepository`, extract `getAuthUserEntity(Class<T>)`, add the two Employee methods (GREEN). Verify all tests pass.

**SOLID analysis — AuthUserUtil depth and DIP:**
- **Before:** Concrete dependencies on `AdminRepository` and `ClientRepository`. Each new user type adds a constructor parameter and a new `findByUsername` call. The lookup paths are inconsistent (one uses `.map()`, one uses `.flatMap()`).
- **After:** Single `BaseUserRepository` abstraction. `getAuthUserEntity(Class<T>)` hides `findByUsername + instanceof filter + cast` behind a one-liner for callers. Interface surface: 7 public methods. Implementation: JOINED-inheritance lookup + type-safe filtering. DIP satisfied. OCP satisfied — new subtypes require a new one-line getter only.

### Files to Create/Modify

- [x] `backend/src/test/java/com/agentForgeBackend/testUtils/TestAuthenticationHelper.java` — **MODIFY** — add employee fields, `initializeEmployeeMockUser()` method, and getters (Step 1)
- [x] `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeLoginJwtTest.java` — **NEW** — TDD Slices 1+2 (Steps 4.1, 4.2, 4.3) (Step 2)
- [x] `backend/src/test/java/com/agentForgeBackend/shared/tools/AuthUserUtilTest.java` — **NEW** — TDD RED Slice 3 (Step 3)
- [x] `backend/src/main/java/com/agentForgeBackend/shared/tools/AuthUserUtil.java` — **MODIFY** — TDD GREEN Slice 3 (Step 4)

---

## Step-by-Step Implementation

### Step 1: Extend TestAuthenticationHelper with Employee Support

**Goal:** Add employee user creation and JWT token generation to the shared test helper so `EmployeeLoginJwtTest` can use a pre-generated employee JWT for access control tests without reimplementing token generation in each test class.
**Dependencies:** Task 2 and Task 3 complete; `EmployeeEntity`, `UserRoles.EMPLOYEE` exist.

- [x] Open `backend/src/test/java/com/agentForgeBackend/testUtils/TestAuthenticationHelper.java`
- [x] Add import: `import com.agentForgeBackend.models.hq.employee.EmployeeEntity;`
- [x] Add private fields `private EmployeeEntity employeeUser;` and `private String employeeToken;` after `clientToken`
- [x] Add `public void initializeEmployeeMockUser()` method after `initializeMockUsers()` (see implementation)
- [x] Add `getEmployeeToken()` getter with `IllegalStateException` guard (same pattern as `getAdminToken()`)
- [x] Add `getEmployeeUser()` getter
- [x] Update `cleanUp()` to null out `employeeUser` and `employeeToken`
- [x] Do NOT modify `initializeMockUsers()` — existing `SecurityAuthorizationTest` must remain unaffected

**Why this step is critical:** `TestAuthenticationHelper` is the project's canonical helper for JWT-based integration tests. Adding employee support here makes the employee JWT reusable across test classes without duplicating token generation logic.

#### Implementation

```java
// New import (add with existing imports):
import com.agentForgeBackend.models.hq.employee.EmployeeEntity;

// New fields (add after clientToken field):
private EmployeeEntity employeeUser;
private String employeeToken;

// New method (add after initializeMockUsers()):
public void initializeEmployeeMockUser() {
    entityManager.clear();

    employeeUser = new EmployeeEntity();
    employeeUser.setFirstName("Employee");
    employeeUser.setLastName("User");
    employeeUser.setEmail("employee@test.com");
    employeeUser.setUsername("employee@test.com");
    employeeUser.setPassword("encodedPassword123");  // plain text — not for login, only for JWT generation
    employeeUser.setRoles(Set.of(UserRoles.EMPLOYEE));
    employeeUser.setEnabled(true);
    employeeUser.setAccountNonExpired(true);
    employeeUser.setAccountNonLocked(true);
    employeeUser.setCredentialsNonExpired(true);

    entityManager.persist(employeeUser);
    entityManager.flush();

    employeeToken = "Bearer " + jwtTokenService.generateToken(
            employeeUser,
            List.of(new SimpleGrantedAuthority(UserRoles.EMPLOYEE.getAuthority()))
    );

    entityManager.clear();
}

// New getters (add after getClientUser()):
public String getEmployeeToken() {
    if (employeeToken == null) {
        throw new IllegalStateException("Employee token not initialized. Call initializeEmployeeMockUser() first.");
    }
    return employeeToken;
}

public EmployeeEntity getEmployeeUser() {
    return employeeUser;
}

// Update cleanUp() — add two lines:
public void cleanUp() {
    entityManager.clear();
    adminToken = null;
    clientToken = null;
    employeeToken = null;   // ADD
    adminUser = null;
    clientUser = null;
    employeeUser = null;    // ADD
}
```

#### Edge Cases

1. **Plain-text password `"encodedPassword123"` in `initializeEmployeeMockUser()`:** This matches the existing pattern in `initializeMockUsers()` for admin and client. The helper bypasses `/login` and calls `jwtTokenService.generateToken()` directly. This token is valid for JWT access control tests. It cannot be used to authenticate via `/login` because Spring Security would BCrypt-check against the plain text. Login tests create their own employee with BCrypt password in `@BeforeEach`.
2. **`initializeMockUsers()` is NOT modified:** Existing callers (e.g., `SecurityAuthorizationTest.@BeforeEach`) do not expect an employee row in the DB after calling `initializeMockUsers()`. Making employee creation opt-in via a separate method prevents interference.
3. **Cleanup:** `cleanUp()` nulls both the user and token fields. Callers that only call `initializeMockUsers()` but not `initializeEmployeeMockUser()` will have `employeeToken = null`. The `IllegalStateException` guard in `getEmployeeToken()` catches accidental use and provides a clear error message.

---

### Step 2: Write EmployeeLoginJwtTest (TDD RED → GREEN — Slices 1+2)

**Goal:** Verify Employee login, JWT response content, and JWT access control through real HTTP tests. This class fails to compile until Step 1 is complete (it calls `authHelper.initializeEmployeeMockUser()`). After Step 1, the tests compile and all should pass immediately — proving the existing infrastructure handles Employee without code changes.

**Dependencies:** Step 1 complete; `EmployeeEntity`, `EmployeeRepository`, `PasswordEncoder` exist.

- [x] Create `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeLoginJwtTest.java`
- [x] Annotate with `@SpringBootTest`, `@AutoConfigureMockMvc`, `@ActiveProfiles("test")` (no `@WithMockUser` — these are real JWT tests)
- [x] Inject `MockMvc`, `EmployeeRepository`, `AdminRepository`, `ClientRepository`, `PasswordEncoder`, `TestAuthenticationHelper`
- [x] `@BeforeEach`: delete employees → clients → admins (this order avoids FK constraint violations) → create a BCrypt-password employee for login tests → call `authHelper.initializeEmployeeMockUser()` for JWT access tests
- [x] Write Step 4.1 tests: `employeeCanLoginWithValidCredentials`, `invalidEmployeePasswordReturns401`
- [x] Write Step 4.2 tests: `employeeLoginResponseContainsRoleEmployee`, `employeeLoginResponseDoesNotContainRoleAdmin`
- [x] Write Step 4.3 tests: `employeeJwtAllowsAccessToAuthenticatedEndpoints`, `employeeJwtForbidsAccessToEmployeeCrudEndpoints`, `employeeJwtForbidsAccessToAdminListEndpoints`, `anonymousRequestToLoginReturnsUnauthorizedForNonexistentUser`
- [x] Run `./mvnw test -Dtest=EmployeeLoginJwtTest` — all 8 tests must pass

**Why this step is critical:** This is the definitive proof that Employee authentication works end-to-end through the full auth stack: BCrypt password check → `SecurityUserServiceImpl.loadUserByUsername()` → `SecurityUser.getAuthorities()` → JWT generation → JWT decoding by `JWTTokenValidatorFilter` → SecurityContext authority evaluation. No part of this path was modified for Employee — the tests confirm correctness by nature of JOINED inheritance.

#### Implementation

```java
package com.agentForgeBackend.models.hq.employee;

import com.agentForgeBackend.models.hq.admin.AdminRepository;
import com.agentForgeBackend.models.hq.client.ClientRepository;
import com.agentForgeBackend.shared.models.baseUser.UserRoles;
import com.agentForgeBackend.testUtils.TestAuthenticationHelper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Set;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class EmployeeLoginJwtTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private EmployeeRepository employeeRepository;
    @Autowired private AdminRepository adminRepository;
    @Autowired private ClientRepository clientRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private TestAuthenticationHelper authHelper;

    @BeforeEach
    void setUp() {
        // Delete in child-before-parent order to respect JOINED-inheritance FK constraints
        employeeRepository.deleteAll();
        employeeRepository.flush();
        clientRepository.deleteAll();
        clientRepository.flush();
        adminRepository.deleteAll();
        adminRepository.flush();

        // BCrypt-encoded employee for /login tests (Steps 4.1 + 4.2)
        EmployeeEntity loginEmployee = new EmployeeEntity();
        loginEmployee.setFirstName("Login");
        loginEmployee.setLastName("Employee");
        loginEmployee.setEmail("login-employee@test.com");
        loginEmployee.setUsername("login-employee@test.com");
        loginEmployee.setPassword(passwordEncoder.encode("rawEmployeePassword123"));
        loginEmployee.setRoles(Set.of(UserRoles.EMPLOYEE));
        loginEmployee.setEnabled(true);
        loginEmployee.setAccountNonExpired(true);
        loginEmployee.setAccountNonLocked(true);
        loginEmployee.setCredentialsNonExpired(true);
        employeeRepository.saveAndFlush(loginEmployee);

        // Programmatic-JWT employee for access control tests (Step 4.3)
        authHelper.initializeEmployeeMockUser();
    }

    // --- Step 4.1: Employee can authenticate via /login ---

    @Test
    void employeeCanLoginWithValidCredentials() throws Exception {
        mockMvc.perform(post("/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "username": "login-employee@test.com", "password": "rawEmployeePassword123" }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", notNullValue()))
                .andExpect(jsonPath("$.username").value("login-employee@test.com"));
    }

    @Test
    void invalidEmployeePasswordReturns401() throws Exception {
        mockMvc.perform(post("/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "username": "login-employee@test.com", "password": "wrongPassword" }
                                """))
                .andExpect(status().isUnauthorized());
    }

    // --- Step 4.2: Login response contains ROLE_EMPLOYEE ---

    @Test
    void employeeLoginResponseContainsRoleEmployee() throws Exception {
        mockMvc.perform(post("/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "username": "login-employee@test.com", "password": "rawEmployeePassword123" }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roles", hasItem("ROLE_EMPLOYEE")));
    }

    @Test
    void employeeLoginResponseDoesNotContainRoleAdmin() throws Exception {
        mockMvc.perform(post("/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "username": "login-employee@test.com", "password": "rawEmployeePassword123" }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roles").isArray())
                .andExpect(jsonPath("$.roles", not(hasItem("ROLE_ADMIN")))); // REVIEW-FIX: replaced doesNotExist() — JSONPath filter returning [] is not "not found"; not(hasItem()) is the correct Hamcrest assertion
    }

    // --- Step 4.3: Employee JWT access control ---

    @Test
    void employeeJwtAllowsAccessToAuthenticatedEndpoints() throws Exception {
        mockMvc.perform(get("/test")
                        .header("Authorization", authHelper.getEmployeeToken()))
                .andExpect(status().isOk());
    }

    @Test
    void employeeJwtForbidsAccessToEmployeeCrudEndpoints() throws Exception {
        mockMvc.perform(post("/employee/list")
                        .header("Authorization", authHelper.getEmployeeToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("Forbidden"));
    }

    @Test
    void employeeJwtForbidsAccessToAdminListEndpoints() throws Exception {
        mockMvc.perform(post("/admin/list")
                        .header("Authorization", authHelper.getEmployeeToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("Forbidden"));
    }

    @Test
    void anonymousRequestToLoginReturnsUnauthorizedForNonexistentUser() throws Exception {
        mockMvc.perform(post("/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "username": "ghost@test.com", "password": "anyPassword" }
                                """))
                .andExpect(status().isUnauthorized());
    }
}
```

#### Edge Cases

1. **Delete order in `@BeforeEach` — employees first, then clients, then admins:** JOINED inheritance stores Employee rows in both `base_user` and `employee`. Deleting Employee entities removes both. If admins or clients were deleted first while orphaned Employee rows still referenced the same `base_user` parent, FK violations could occur. Employees → clients → admins is the safe order.
2. **Two employees in the DB during tests:** `@BeforeEach` creates "login-employee@test.com" (BCrypt) for login tests and `authHelper.initializeEmployeeMockUser()` creates "employee@test.com" (plain text) for access control tests. They coexist with different usernames — no unique constraint violation.
3. **`employeeJwtForbidsAccessToEmployeeCrudEndpoints` expects 403, not 404:** The `/employee/**` HTTP rule in `SecurityConfig` runs before route matching. A user with only `ROLE_EMPLOYEE` is denied at the HTTP authorization layer. The actual route existence (or non-existence) is irrelevant — the test is asserting the HTTP security layer blocks the request.
4. **`employeeLoginResponseDoesNotContainRoleAdmin` Hamcrest assertion — why not JSONPath filter:** `not(hasItem("ROLE_ADMIN"))` directly asserts the `roles` array does not contain `"ROLE_ADMIN"`. A JSONPath filter expression (`$.roles[?(@=='ROLE_ADMIN')]`) was intentionally avoided: when no elements match, jayway JSONPath returns `[]` (empty list), not null/PathNotFoundException. MockMvc's `doesNotExist()` checks for null/not-found — it would throw an unexpected assertion error against an empty list. `not(hasItem())` is the correct Hamcrest matcher for this assertion. <!-- REVIEW-FIX: clarified why doesNotExist() is not used and why not(hasItem()) is correct -->
5. **`authHelper.getEmployeeToken()` used for Step 4.3 tests, not the login response token:** Login tests in steps 4.1+4.2 test the `/login` endpoint behavior. Access control tests in step 4.3 test the JWT validation + authorization behavior. Using the pre-generated token from the helper decouples the two concerns — a login failure does not cascade into false failures in the access control tests.

---

### Step 3: Write AuthUserUtilTest (TDD RED — Slice 3)

**Goal:** Define failing tests for `AuthUserUtil` employee support. The tests compile but fail because `isAuthUserEmployee()` and `getAuthUserEmployeeEntity()` do not exist yet.

**Dependencies:** Step 2 complete; `EmployeeEntity`, `EmployeeRepository` exist.

- [x] Create `backend/src/test/java/com/agentForgeBackend/shared/tools/AuthUserUtilTest.java`
- [x] Annotate with `@SpringBootTest`, `@ActiveProfiles("test")` (no `@AutoConfigureMockMvc` — these tests call `AuthUserUtil` directly after setting up `SecurityContextHolder`)
- [x] Inject `AuthUserUtil`, `AdminRepository`, `ClientRepository`, `EmployeeRepository`, `PasswordEncoder`
- [x] `@BeforeEach`: delete all users (employees → clients → admins), clear `SecurityContextHolder`, persist fresh Admin/Client/Employee entities
- [x] `@AfterEach`: clear `SecurityContextHolder`
- [x] Write private helper `setAuthentication(String username, String roleAuthority)` using `UsernamePasswordAuthenticationToken` with `String` principal
- [x] Write 10 behavior tests covering: entity getter correctness (`instanceof`), cross-subtype filtering (admin getter returns empty when logged in as employee), role checks (`isAuthUserEmployee` true/false, `isAuthUserClient` true, `isAuthUserAdmin` true), `getAuthUsername()` roundtrip <!-- REVIEW-FIX: count corrected from 9 to 10; isAuthUserClientReturnsTrueWhenAuthenticatedAsClient test added to cover the hasRole() path for CLIENT -->

**Why this step is critical:** The feature spec (Section 12) explicitly requires a test verifying that `getAuthUserAdminEntity()` and `getAuthUserClientEntity()` return correct `instanceof` subtypes under JOINED inheritance after refactoring. Without this test, a regression where `baseUserRepository.findByUsername()` returns an uncast `BaseUserEntity` (failing the `instanceof` filter) would be silent.

#### Implementation

```java
package com.agentForgeBackend.shared.tools;

import com.agentForgeBackend.models.hq.admin.AdminEntity;
import com.agentForgeBackend.models.hq.admin.AdminRepository;
import com.agentForgeBackend.models.hq.client.ClientEntity;
import com.agentForgeBackend.models.hq.client.ClientRepository;
import com.agentForgeBackend.models.hq.employee.EmployeeEntity;
import com.agentForgeBackend.models.hq.employee.EmployeeRepository;
import com.agentForgeBackend.shared.models.baseUser.UserRoles;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class AuthUserUtilTest {

    @Autowired private AuthUserUtil authUserUtil;
    @Autowired private AdminRepository adminRepository;
    @Autowired private ClientRepository clientRepository;
    @Autowired private EmployeeRepository employeeRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private AdminEntity admin;
    private ClientEntity client;
    private EmployeeEntity employee;

    @BeforeEach
    void setUp() {
        employeeRepository.deleteAll();
        employeeRepository.flush();
        clientRepository.deleteAll();
        clientRepository.flush();
        adminRepository.deleteAll();
        adminRepository.flush();
        SecurityContextHolder.clearContext();

        admin = new AdminEntity();
        admin.setFirstName("Auth");
        admin.setLastName("Admin");
        admin.setEmail("auth-admin@test.com");
        admin.setUsername("auth-admin@test.com");
        admin.setPassword(passwordEncoder.encode("pass"));
        admin.setRoles(Set.of(UserRoles.ADMIN));
        admin.setEnabled(true);
        admin.setAccountNonExpired(true);
        admin.setAccountNonLocked(true);
        admin.setCredentialsNonExpired(true);
        admin = adminRepository.saveAndFlush(admin);

        client = new ClientEntity();
        client.setFirstName("Auth");
        client.setLastName("Client");
        client.setEmail("auth-client@test.com");
        client.setUsername("auth-client@test.com");
        client.setPassword(passwordEncoder.encode("pass"));
        client.setRoles(Set.of(UserRoles.CLIENT));
        client.setEnabled(true);
        client.setAccountNonExpired(true);
        client.setAccountNonLocked(true);
        client.setCredentialsNonExpired(true);
        // apikey is nullable — no need to set it
        client = clientRepository.saveAndFlush(client);

        employee = new EmployeeEntity();
        employee.setFirstName("Auth");
        employee.setLastName("Employee");
        employee.setEmail("auth-employee@test.com");
        employee.setUsername("auth-employee@test.com");
        employee.setPassword(passwordEncoder.encode("pass"));
        employee.setRoles(Set.of(UserRoles.EMPLOYEE));
        employee.setEnabled(true);
        employee.setAccountNonExpired(true);
        employee.setAccountNonLocked(true);
        employee.setCredentialsNonExpired(true);
        employee = employeeRepository.saveAndFlush(employee);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void getAuthUserAdminEntityReturnsAdminInstanceUnderJoinedInheritance() {
        setAuthentication(admin.getUsername(), UserRoles.ADMIN.getAuthority());

        Optional<AdminEntity> result = authUserUtil.getAuthUserAdminEntity();

        assertThat(result).isPresent();
        assertThat(result.get()).isInstanceOf(AdminEntity.class);
        assertThat(result.get().getUsername()).isEqualTo(admin.getUsername());
    }

    @Test
    void getAuthUserClientEntityReturnsClientInstanceUnderJoinedInheritance() {
        setAuthentication(client.getUsername(), UserRoles.CLIENT.getAuthority());

        Optional<ClientEntity> result = authUserUtil.getAuthUserClientEntity();

        assertThat(result).isPresent();
        assertThat(result.get()).isInstanceOf(ClientEntity.class);
        assertThat(result.get().getUsername()).isEqualTo(client.getUsername());
    }

    @Test
    void getAuthUserEmployeeEntityReturnsEmployeeInstanceUnderJoinedInheritance() {
        setAuthentication(employee.getUsername(), UserRoles.EMPLOYEE.getAuthority());

        Optional<EmployeeEntity> result = authUserUtil.getAuthUserEmployeeEntity();

        assertThat(result).isPresent();
        assertThat(result.get()).isInstanceOf(EmployeeEntity.class);
        assertThat(result.get().getUsername()).isEqualTo(employee.getUsername());
    }

    @Test
    void getAuthUserAdminEntityReturnsEmptyWhenAuthenticatedUserIsEmployee() {
        setAuthentication(employee.getUsername(), UserRoles.EMPLOYEE.getAuthority());

        Optional<AdminEntity> result = authUserUtil.getAuthUserAdminEntity();

        assertThat(result).isEmpty();
    }

    @Test
    void getAuthUserEmployeeEntityReturnsEmptyWhenAuthenticatedUserIsAdmin() {
        setAuthentication(admin.getUsername(), UserRoles.ADMIN.getAuthority());

        Optional<EmployeeEntity> result = authUserUtil.getAuthUserEmployeeEntity();

        assertThat(result).isEmpty();
    }

    @Test
    void isAuthUserEmployeeReturnsTrueWhenAuthenticatedAsEmployee() {
        setAuthentication(employee.getUsername(), UserRoles.EMPLOYEE.getAuthority());

        assertThat(authUserUtil.isAuthUserEmployee()).isTrue();
    }

    @Test
    void isAuthUserEmployeeReturnsFalseWhenAuthenticatedAsAdmin() {
        setAuthentication(admin.getUsername(), UserRoles.ADMIN.getAuthority());

        assertThat(authUserUtil.isAuthUserEmployee()).isFalse();
    }

    @Test
    void isAuthUserClientReturnsTrueWhenAuthenticatedAsClient() {
        setAuthentication(client.getUsername(), UserRoles.CLIENT.getAuthority());

        assertThat(authUserUtil.isAuthUserClient()).isTrue();
    }

    @Test
    void isAuthUserAdminReturnsTrueWhenAuthenticatedAsAdmin() {
        setAuthentication(admin.getUsername(), UserRoles.ADMIN.getAuthority());

        assertThat(authUserUtil.isAuthUserAdmin()).isTrue();
    }

    @Test
    void getAuthUsernameReturnsPresentForAuthenticatedUser() {
        setAuthentication(admin.getUsername(), UserRoles.ADMIN.getAuthority());

        assertThat(authUserUtil.getAuthUsername())
                .isPresent()
                .hasValue(admin.getUsername());
    }

    private void setAuthentication(String username, String roleAuthority) {
        Authentication auth = new UsernamePasswordAuthenticationToken(
                username, null, List.of(new SimpleGrantedAuthority(roleAuthority)));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }
}
```

#### Edge Cases

1. **`setAuthentication()` uses a `String` principal (not `UserDetails`):** `AuthUserUtil.getAuthUsername()` explicitly handles `String` principals: `if (principal instanceof String) return Optional.of((String) principal)`. This matches what `JWTTokenValidatorFilter` does in production — it sets `username` (a String) as the principal. Using a String principal in tests produces the most realistic security context.
2. **`SecurityContextHolder` is thread-local:** `@BeforeEach` calls `SecurityContextHolder.clearContext()` to guarantee no stale state from a previous test. `@AfterEach` clears again. Between these boundaries, each test method controls the exact SecurityContext state via `setAuthentication()`.
3. **`getAuthUserAdminEntityReturnsEmptyWhenAuthenticatedUserIsEmployee`:** This verifies the `filter(AdminEntity.class::isInstance)` rejects `EmployeeEntity`. `baseUserRepository.findByUsername("auth-employee@test.com")` returns an `EmployeeEntity`. `AdminEntity.class.isInstance(employeeEntity)` → `false`. The filter rejects it, and `.map()` is never called. Result: `Optional.empty()`. This is the cross-subtype safety guarantee.
4. **`client.setApikey(...)` not called:** `ClientEntity.apikey` is `@Column(name = "apikey", unique = true)` with no `nullable = false`. It is nullable. Leaving it null avoids a constraint violation and correctly reflects that this client has no API key assigned — a valid state for `AuthUserUtil` test purposes.

---

### Step 4: Refactor AuthUserUtil (TDD GREEN — Slice 3)

**Goal:** Replace the two concrete repository dependencies with `BaseUserRepository`, extract the generic `getAuthUserEntity(Class<T>)` helper, and add `isAuthUserEmployee()` and `getAuthUserEmployeeEntity()`. All `AuthUserUtilTest` tests must pass after this step.

**Dependencies:** Step 3 tests written and failing (compile error on `isAuthUserEmployee()` and `getAuthUserEmployeeEntity()`).

- [x] Open `backend/src/main/java/com/agentForgeBackend/shared/tools/AuthUserUtil.java`
- [x] Replace constructor parameters and fields: remove `ClientRepository clientRepository, AdminRepository adminRepository`; add `BaseUserRepository baseUserRepository`
- [x] Update imports: remove `AdminRepository`, `ClientRepository`; add `BaseUserRepository`, `BaseUserEntity`, `EmployeeEntity`
- [x] Extract private `<T extends BaseUserEntity> Optional<T> getAuthUserEntity(Class<T> type)` helper
- [x] Rewrite `getAuthUserAdminEntity()` to call `getAuthUserEntity(AdminEntity.class)`
- [x] Rewrite `getAuthUserClientEntity()` to call `getAuthUserEntity(ClientEntity.class)`
- [x] Add `getAuthUserEmployeeEntity()` delegating to `getAuthUserEntity(EmployeeEntity.class)`
- [x] Add `isAuthUserEmployee()` following the `isAuthUserClient()` / `isAuthUserAdmin()` pattern
- [x] Keep `isAuthUserClient()`, `isAuthUserAdmin()`, `getAuthUsername()`, `hasRole()`, `getAuthentication()` unchanged (same logic)
- [x] Run `./mvnw test -Dtest=AuthUserUtilTest` — all 10 tests must pass
- [x] Run `./mvnw test` — full suite passes (except pre-existing `authServerApplicationTests` Docker blocker)

**Why this step is critical:** This refactoring eliminates linear repository-dependency growth and ensures all entity lookup paths use the same `BaseUserRepository` abstraction that `SecurityUserServiceImpl` already uses. After the refactoring, adding a future user type requires only a one-line getter addition with no constructor changes.

#### Implementation

Full replacement of `AuthUserUtil.java`:

```java
package com.agentForgeBackend.shared.tools;

import com.agentForgeBackend.models.hq.admin.AdminEntity;
import com.agentForgeBackend.models.hq.client.ClientEntity;
import com.agentForgeBackend.models.hq.employee.EmployeeEntity;
import com.agentForgeBackend.shared.models.baseUser.BaseUserEntity;
import com.agentForgeBackend.shared.models.baseUser.UserRoles;
import com.agentForgeBackend.shared.securityUser.BaseUserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class AuthUserUtil {

    private final BaseUserRepository baseUserRepository;

    public AuthUserUtil(BaseUserRepository baseUserRepository) {
        this.baseUserRepository = baseUserRepository;
    }

    /* ------------------------------------------------------------------
     * Public helpers
     * ------------------------------------------------------------------ */

    public Optional<AdminEntity> getAuthUserAdminEntity() {
        return getAuthUserEntity(AdminEntity.class);
    }

    public Optional<ClientEntity> getAuthUserClientEntity() {
        return getAuthUserEntity(ClientEntity.class);
    }

    public Optional<EmployeeEntity> getAuthUserEmployeeEntity() {
        return getAuthUserEntity(EmployeeEntity.class);
    }

    public boolean isAuthUserClient() {
        return hasRole(UserRoles.CLIENT);
    }

    public boolean isAuthUserAdmin() {
        return hasRole(UserRoles.ADMIN);
    }

    public boolean isAuthUserEmployee() {
        return hasRole(UserRoles.EMPLOYEE);
    }

    public Optional<String> getAuthUsername() {
        Authentication authentication = getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return Optional.empty();
        }

        // Support both String principals (from JWT filter) and UserDetails (from login form)
        Object principal = authentication.getPrincipal();
        if (principal instanceof String) {
            return Optional.of((String) principal);
        } else if (principal instanceof UserDetails) {
            return Optional.of(((UserDetails) principal).getUsername());
        }

        return Optional.ofNullable(authentication.getName());
    }

    /* ------------------------------------------------------------------
     * Private helpers
     * ------------------------------------------------------------------ */

    private <T extends BaseUserEntity> Optional<T> getAuthUserEntity(Class<T> type) {
        return getAuthUsername()
                .flatMap(username -> baseUserRepository.findByUsername(username)
                        .filter(type::isInstance)
                        .map(type::cast));
    }

    private boolean hasRole(UserRoles role) {
        Authentication authentication = getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        return authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals(role.getAuthority()));
    }

    private Authentication getAuthentication() {
        return SecurityContextHolder.getContext().getAuthentication();
    }
}
```

#### Edge Cases

1. **`getAuthUserAdminEntity()` previously used `.map()` (non-Optional return from `adminRepository::findByUsername`):** Java's `Optional.map()` returns `Optional.empty()` when the mapping function returns null — there is no NPE risk in the old code. However, the old code mixed two incompatible lookup paths: `.map()` for Admin (non-Optional return from `AdminRepository`) vs `.flatMap()` for Client (Optional return from `ClientRepository`). The refactoring eliminates this inconsistency by routing both through `baseUserRepository.findByUsername()` which returns `Optional<BaseUserEntity>` and using `.flatMap()` uniformly. <!-- REVIEW-FIX: corrected incorrect claim that Optional.map() with null result produces Optional.of(null); it actually returns Optional.empty() -->
2. **`getAuthUserClientEntity()` was using `.flatMap()` correctly — now unified:** The old implementation was `getAuthUsername().flatMap(clientRepository::findByUsername)`. The new implementation produces identical behavior through the generic helper but eliminates the duplicate flatMap pattern across all getter methods.
3. **`AdminEntity.class::isInstance` filter under JOINED inheritance:** When `baseUserRepository.findByUsername("admin-username")` is called, Hibernate loads the full `AdminEntity` subtype (joining `base_user` and `admin` tables). The returned object's runtime type is `AdminEntity`, not just `BaseUserEntity`. Therefore `AdminEntity.class.isInstance(result)` → `true` and the subsequent cast succeeds. The same applies for Client and Employee.
4. **Callers of `AuthUserUtil` via Spring injection:** Any component that `@Autowired AuthUserUtil` will receive the refactored bean. The public interface is backward-compatible: `getAuthUserAdminEntity()`, `getAuthUserClientEntity()`, `isAuthUserClient()`, `isAuthUserAdmin()`, `getAuthUsername()` — all exist and return the same types. Two new methods are added (`getAuthUserEmployeeEntity()`, `isAuthUserEmployee()`). Existing callers are unaffected.

---

## Design Decisions

**Decision 1: `initializeEmployeeMockUser()` as a separate opt-in method in `TestAuthenticationHelper`**
- **Why:** `SecurityAuthorizationTest.@BeforeEach` calls `initializeMockUsers()` but only cleans up clients and admins — not employees. Adding employee creation inside `initializeMockUsers()` would leave orphan employee rows whenever `SecurityAuthorizationTest` runs, potentially conflicting with subsequent test classes. A separate method is opt-in: only callers that explicitly need an employee token call it.
- **Alternatives considered:** Modifying `initializeMockUsers()` to create all three user types and updating all callers to also clean up employees. Rejected — modifies tested, working infrastructure unnecessarily; wider blast radius.

**Decision 2: `EmployeeLoginJwtTest` creates its own BCrypt-password employee for login tests (does not use `TestAuthenticationHelper` for login)**
- **Why:** `TestAuthenticationHelper` uses plain-text passwords (not BCrypt) for programmatic JWT generation — it bypasses `/login`. A real `/login` test requires a BCrypt password because Spring Security's `DaoAuthenticationProvider` compares the submitted password against the stored BCrypt hash. Mixing BCrypt and plain-text in the same helper would require injecting `PasswordEncoder` into `TestAuthenticationHelper` and complicating its purpose.
- **Alternatives considered:** Making `TestAuthenticationHelper.initializeEmployeeMockUser()` BCrypt-encode the password. Rejected — `TestAuthenticationHelper` is a JWT token factory, not a login fixture factory. BCrypt encoding would make it serve two concerns.

**Decision 3: `AuthUserUtil` uses `BaseUserRepository.findByUsername()` instead of per-subtype repositories**
- **Why:** `SecurityUserServiceImpl` already uses this pattern for cross-subtype lookup. Extending `AuthUserUtil` to follow the same approach creates architectural consistency. The generic helper `getAuthUserEntity(Class<T>)` eliminates code duplication and closes `AuthUserUtil` for modification when new subtypes are added. Three concrete lookups become one abstraction with type-parametric filtering.
- **Alternatives considered:** Adding `EmployeeRepository` as a third constructor parameter following the existing Admin/Client pattern. Rejected — linear growth of dependencies; every new user type requires editing `AuthUserUtil` constructor, violating OCP. Using a `Map<Class<?>, Repository>` registry. Rejected — over-engineered; the JOINED inheritance already provides the needed cross-subtype lookup in one query.

**Decision 4: `AuthUserUtilTest` uses `SecurityContextHolder.setContext()` with a `String` principal instead of `@WithMockUser`**
- **Why:** `JWTTokenValidatorFilter` sets a `String` (username) as the authentication principal in production. `AuthUserUtil.getAuthUsername()` explicitly handles `String` principals. Testing with a `String` principal via `UsernamePasswordAuthenticationToken` accurately represents the production security context. `@WithMockUser` installs a `UserDetails` principal — a path that `AuthUserUtil` handles but that is less accurate for this system's JWT-centric auth model.
- **Alternatives considered:** Using `@WithMockUser(username = "...")` on each test method. Rejected — cannot vary the username and role per test cleanly without separate test classes; less representative of production principal type.

---

## Testing Considerations

### Automatic Validation

- [x] Run `./mvnw test -Dtest=EmployeeLoginJwtTest` from `backend/` — all 8 tests pass (proves Steps 4.1, 4.2, 4.3 complete and Employee login/JWT works through existing infrastructure)
- [x] Run `./mvnw test -Dtest=AuthUserUtilTest` from `backend/` — all 10 tests pass after Step 4 (proves Step 4.4 complete)
- [x] Run `./mvnw test -Dtest=SecurityAuthorizationTest` from `backend/` — all 6 existing tests still pass (regression check on `TestAuthenticationHelper` extension and `AuthUserUtil` refactoring)
- [x] Run `./mvnw test -Dtest=EmployeeServiceCrudIntegrationTest,EmployeeControllerListEndpointTest,EmployeeServiceListQueryIntegrationTest` from `backend/` — all Task 3 tests still pass (confirms no regression from the `AuthUserUtil` refactoring on Employee service or controller)
- [x] Run `./mvnw test` from `backend/` — full suite exits non-zero only due to pre-existing `authServerApplicationTests.contextLoads` Docker/PostgreSQL blocker; all other tests pass
- [x] Confirm no token-minting endpoint: `grep -r "token" backend/src/main/java/com/agentForgeBackend/models/hq/employee/` returns no results in production code (Controller has no token endpoint, Service has no `generateToken` call)

### Manual Validation

- [ ] Start the application with Docker Compose. Use the Admin JWT (from POST to `/login` with admin credentials) to POST to `/employee` with a valid body (firstName, lastName, email, username, password). Confirm HTTP 200 and the created employee has `roles: ["ROLE_EMPLOYEE"]`.
- [ ] POST to `/login` with the new employee credentials (username and raw password from the previous step). Confirm HTTP 200, `token` present, and `roles: ["ROLE_EMPLOYEE"]` in the response body.
- [ ] Use the employee JWT (from the previous step) to `GET /test`. Confirm HTTP 200.
- [ ] Use the employee JWT to `POST /employee/list` with body `{}`. Confirm HTTP 403 with JSON error response.
- [ ] Use the employee JWT to `POST /admin/list` with body `{}`. Confirm HTTP 403 with JSON error response.
- [ ] Attempt `GET /employee/token/someuser` with the employee JWT. Confirm HTTP 403 (auth layer blocks before route matching; no token endpoint is registered for Employee).

---

## Related Code Explanations

- `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityController.java` — login endpoint; `SecurityUser.getAuthorities()` is mapped to `LoginResponseDTO.roles`; `JwtTokenService.generateToken()` embeds `username` and `authorities` claims
- `backend/src/main/java/com/agentForgeBackend/shared/securityUser/SecurityUserServiceImpl.java` — `loadUserByUsername()` already uses `BaseUserRepository` covering Employee without modification
- `backend/src/main/java/com/agentForgeBackend/shared/securityUser/SecurityUser.java` — wraps `BaseUserEntity`; `getAuthorities()` maps `UserRoles.EMPLOYEE.getAuthority()` → `"ROLE_EMPLOYEE"`; see known issue re: `is*` UserDetails methods defaulting to `true`
- `backend/src/main/java/com/agentForgeBackend/configuration/filter/JWTTokenValidatorFilter.java` — validates JWT per request; sets `username` String as principal; extracts `authorities` from JWT claims as `SimpleGrantedAuthority` list
- `backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java` — reference structural template for `EmployeeLoginJwtTest`; shows `TestAuthenticationHelper` usage pattern and MockMvc JWT header approach

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected for this task
- [x] Spring Security 6.4.x and jjwt 0.12.5 patterns verified from existing working codebase tests
- [x] `TestAuthenticationHelper.java` extended with `initializeEmployeeMockUser()`, employee fields (`employeeUser`, `employeeToken`), and getters; `cleanUp()` updated; existing `initializeMockUsers()` unchanged
- [x] `EmployeeLoginJwtTest.java` created with 8 behavior tests covering Employee login (Steps 4.1+4.2) and JWT access control (Step 4.3)
- [x] `./mvnw test -Dtest=EmployeeLoginJwtTest` passes — proves Employee login works through existing infrastructure without production code changes
- [x] `AuthUserUtilTest.java` created with 10 behavior tests covering entity getter correctness (instanceof under JOINED inheritance), cross-subtype filtering, role checks (`isAuthUserEmployee`, `isAuthUserClient`, `isAuthUserAdmin`), and username retrieval
- [x] `AuthUserUtil.java` refactored: `BaseUserRepository` replaces `AdminRepository`+`ClientRepository`; generic `getAuthUserEntity(Class<T>)` helper extracted; `isAuthUserEmployee()` and `getAuthUserEmployeeEntity()` added; existing public interface backward-compatible
- [x] `./mvnw test -Dtest=AuthUserUtilTest` passes
- [x] `./mvnw test -Dtest=SecurityAuthorizationTest` still passes after `TestAuthenticationHelper` extension and `AuthUserUtil` refactoring
- [x] `./mvnw test` passes for all non-Docker tests (pre-existing `authServerApplicationTests.contextLoads` blocker excluded)
- [x] No Employee API-key field or token-minting endpoint in production code (verified by grep)
- [x] Manual validation steps documented for the user
- [x] Parent feature Phase 4 steps (4.1–4.4) can be marked complete

---

## Post-Review Notes

- The implemented `employeeLoginResponseContainsRoleEmployee` test is stronger than the original task sketch: it asserts both the response `roles` array and the returned JWT `authorities` claim contain `ROLE_EMPLOYEE`, directly proving the login-issued token carries the Employee authority.
- `./mvnw test` still exits non-zero only because the pre-existing `authServerApplicationTests.contextLoads` test boots the default PostgreSQL configuration and fails with `java.net.UnknownHostException: db` outside Docker. All targeted Task 4 validations passed.

