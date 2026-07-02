#high #new-feature #backend #security #testing

## Feature: Employee User Entity and Role

### Description

Add an `Employee` user entity to the Spring Boot backend. The new entity represents a normal login user for AgentForge employees and must be modeled as a sibling of the existing `Admin` and `Client` user domains. It will reuse the shared `BaseUserEntity` JOINED inheritance model, authenticate through the existing `/login` JWT flow, and use the existing `UserRoles.EMPLOYEE` authority.

The new `Employee` model is intentionally similar to the current `Client` entity but with one important difference: **Employee has no API-key field anywhere**. There must be no API-key column, DTO property, form property, query field, list field, or token-minting route for Employee. Employees are normal username/password users.

Decisions confirmed during feature creation:

- Employee creation uses an explicit password supplied by an Admin.
- Employee CRUD is admin-only in the first version.
- Employee authenticates through the existing `/login` flow.
- There is no `/employee/token/{username}` endpoint.
- The feature includes the security hardening needed to make admin-only rules enforceable.
- Tests should provide full behavior coverage, including repository, mapper, service, controller, login/JWT, and authorization checks.

## Problem Statement

AgentForge currently has shared user infrastructure and the `EMPLOYEE` role already exists in `UserRoles`, but there is no concrete `Employee` domain model. This prevents the backend from representing employees as first-class login users even though the product is designed as a private AI portal for business employees.

The existing `Client` model is close to what Employee needs, but it includes API-key-specific behavior and naming that should not be reused for normal employee accounts. Adding Employee by copying Client blindly would risk leaking API-key fields into the Employee contract, inheriting weak endpoint authorization, and missing tests for login and role behavior.

## User Stories

1. As an Admin, I want to create an Employee account with a username, email, name, and password, so that an employee can log in to AgentForge.
2. As an Admin, I want newly created Employee users to automatically receive the `EMPLOYEE` role, so that callers cannot escalate privileges through the request body.
3. As an Admin, I want Employee accounts to have no API key, so that employees are treated as normal portal users rather than API clients.
4. As an Admin, I want to list Employee accounts, so that I can manage who has employee access to the system.
5. As an Admin, I want to filter and sort Employee accounts by safe fields, so that user management remains searchable without exposing credentials or sensitive internals.
6. As an Admin, I want to retrieve one Employee account by ID, so that I can inspect an employee profile before updating it.
7. As an Admin, I want to update Employee name, email, username, and password details, so that employee accounts can be maintained over time.
8. As an Admin, I want to delete an Employee account, so that employee access can be revoked when needed.
9. As an Employee, I want to authenticate with `/login` using my username and password, so that I can receive a JWT for later requests.
10. As an Employee, I want my login response to contain `ROLE_EMPLOYEE`, so that the frontend and backend can distinguish employee access from admin and client access.
11. As a backend maintainer, I want Employee to extend `BaseUserEntity`, so that login and shared user fields continue to work through the existing security lookup path.
12. As a backend maintainer, I want Employee to use the same QueryDSL list pattern as Admin and Client, so that list endpoints remain consistent across user domains.
13. As a backend maintainer, I want Employee tests to exercise behavior through public endpoints and service interfaces, so that refactors do not break tests unnecessarily.
14. As a backend maintainer, I want Employee CRUD to be explicitly admin-only, so that normal employees and clients cannot manage employee accounts.
15. As a backend maintainer, I want method security and HTTP request authorization to be configured intentionally, so that `@PreAuthorize` rules are actually enforced.
16. As a backend maintainer, I want no Employee DTO or JSON response to expose passwords, so that credential material never leaves the backend.
17. As a backend maintainer, I want Employee query profiles to reject `password`, `roles`, and `apiKey`/`apikey`, so that sensitive or nonexistent fields cannot be queried.
18. As a backend maintainer, I want username and email uniqueness checks to respect the shared `base_user` table, so that an Employee cannot duplicate an Admin or Client identity.
19. As a QA engineer, I want repository tests for Employee persistence, so that the JOINED inheritance mapping is verified.
20. As a QA engineer, I want controller and security tests for Employee authorization, so that anonymous users and non-admin roles are denied.
21. As a QA engineer, I want login/JWT tests for Employee, so that `ROLE_EMPLOYEE` is verified in real authentication behavior.
22. As a future frontend developer, I want the Employee API shape to be predictable and documented, so that employee management screens can be built without reverse-engineering backend conventions.

## Solution

Add a new Employee user slice under the backend's `models/hq` package. The slice will mirror the safe parts of Admin and Client CRUD scaffolding while intentionally excluding all API-key behavior. Employee will be persisted as a JPA subclass of `BaseUserEntity`, stored in its own `employee` joined table, and assigned `UserRoles.EMPLOYEE` by the service layer.

Employee management will be admin-only. The feature must also harden the security configuration enough to make that statement true: method security must be enabled for `@PreAuthorize`, and HTTP request authorization must permit login while requiring appropriate authentication/roles for protected routes.

### Scope

Impacted workflows and systems:

- Backend user modeling and persistence for a new `EmployeeEntity`.
- Admin-only user-management CRUD endpoints under `/employee`.
- Shared JWT login flow for Employee authentication.
- Spring Security configuration for method security and request authorization.
- QueryDSL list/filter/sort infrastructure through a new `EmployeeQueryProfile`.
- Test utilities and test coverage for Employee behavior.
- Documentation and task planning for implementation.

Out of scope for this feature:

- Frontend employee-management screens.
- Employee self-registration.
- Employee self-profile endpoint.
- Password reset or invitation email workflow.
- API-key support for Employee.
- `/employee/token/{username}` or any admin impersonation endpoint.
- LLM chat authorization rules beyond the existence of `ROLE_EMPLOYEE`.
- Renaming or removing the existing `Client` domain.

### Affected Systems / Modules

- [[Memory/architecture|Architecture]] — Employee must fit the existing JOINED user inheritance and JWT auth model.
- [[Memory/tech|Tech Stack]] — Uses Spring Boot 3.4.1, Spring Security, Spring Data JPA, QueryDSL, JUnit 5, Mockito, and H2 test profile.
- [[Memory/known-issues|Known Issues & Constraints]] — Security and CRUD gotchas directly affect Employee design.
- `backend/src/main/java/com/agentForgeBackend/shared/models/baseUser/BaseUserEntity.java` — Employee extends this shared user base.
- `backend/src/main/java/com/agentForgeBackend/shared/models/baseUser/UserRoles.java` — Existing `EMPLOYEE` enum value is used; do not reorder enum constants.
- `backend/src/main/java/com/agentForgeBackend/shared/securityUser/BaseUserRepository.java` — Login already queries the shared base user table.
- `backend/src/main/java/com/agentForgeBackend/shared/securityUser/SecurityUser.java` — Employee roles become `ROLE_EMPLOYEE` authorities through existing mapping.
- `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java` — **UPDATED (Task 1):** Explicit request authorization rules and `@EnableMethodSecurity` added.
- `backend/src/main/java/com/agentForgeBackend/agentForgeBackendApplication.java` — **UNCHANGED:** `@EnableMethodSecurity` placed on `SecurityConfig` instead (SRP).
- `backend/src/main/java/com/agentForgeBackend/models/hq/client/` — Provides the closest CRUD/list/query pattern but must not be copied with API-key behavior.
- `backend/src/main/java/com/agentForgeBackend/models/hq/admin/` — Provides a no-extra-columns user subtype pattern and explicit-password creation behavior.
- `backend/src/test/java/com/agentForgeBackend/testUtils/TestAuthenticationHelper.java` — Should be extended with Employee test user/JWT helpers if JWT tests use it.

External/current documentation checked:

- Spring Security method security: https://docs.spring.io/spring-security/reference/6.5/servlet/authorization/method-security.html
- Spring Security HTTP authorization DSL: https://docs.spring.io/spring-security/reference/6.5/servlet/authorization/authorize-http-requests.html
- Spring Data JPA repositories and QueryDSL integration: https://github.com/spring-projects/spring-data-jpa
- Hibernate ORM JOINED inheritance and enum mapping: https://github.com/hibernate/hibernate-orm

### Impact Analysis

Employee should integrate cleanly with the existing authentication system because `SecurityUserServiceImpl` loads from `BaseUserRepository`, and Employee will be a `BaseUserEntity` subtype. Once Employee is persisted with a BCrypt password and `UserRoles.EMPLOYEE`, the existing `/login` flow should be able to authenticate it and issue a JWT containing `ROLE_EMPLOYEE`.

The main behavior change is security hardening. ~~Enabling method security and adding explicit request authorization can affect existing Admin and Client endpoints because their `@PreAuthorize` annotations will start being enforced. This is desired for correctness but must be tested carefully because some existing inherited CRUD methods currently rely on broad `isAuthenticated()` rules.~~ **COMPLETED (Task 1):** Method security is now enabled, the authorization matrix is enforced, and all existing Admin and Client tests pass unmodified.

Employee list/query behavior should follow Admin and Client list patterns: safe list DTO fields, declared query profile fields only, default sort by `id ASC`, and rejection of sensitive or nonexistent fields.

### Risk Assessment

- **Authorization risk:** ~~Existing code uses `@PreAuthorize`, but method security appears not to be enabled. Employee cannot be safely admin-only until this is fixed.~~ **RESOLVED (Task 1):** `@EnableMethodSecurity` is now on `SecurityConfig`; all `@PreAuthorize` annotations are enforced.
- **HTTP security risk:** ~~`SecurityConfig` currently lacks explicit `authorizeHttpRequests` rules. Missing tokens may pass the filter chain unless protected elsewhere.~~ **RESOLVED (Task 1):** Full authorization matrix is now defined in the filter chain (see Section 10).
- **Role persistence risk:** `BaseUserEntity.roles` currently does not show `@Enumerated(EnumType.STRING)`. Since `EMPLOYEE` already exists, do not reorder `UserRoles`. Any conversion to string enum persistence should be handled with a migration-aware task.
- **Uniqueness risk:** Username/email uniqueness lives on `base_user`, not per subtype. Employee checks must not only query `EmployeeRepository`; they must respect existing Admin and Client users.
- **Copy/paste risk:** Copying Client directly can introduce unwanted `apikey` fields, token endpoint behavior, and recursive `getBaseUser()` bug.
- **Base update risk:** `DefaultServiceImplements.update()` is known to be incomplete. Employee must override update behavior.
- **Testing risk:** Existing tests rely heavily on `@WithMockUser`; Employee must include tests that exercise actual login/JWT role behavior.

---

## Implementation Architecture

### Changes Required

#### 1. Employee domain package

**Purpose:** Add a first-class Employee user module without API-key behavior.

**Changes:** Create `backend/src/main/java/com/agentForgeBackend/models/hq/employee/` with the Employee entity, DTOs, form, mapper, repository, service, query profile, and controller.

**Expected files:**

- `EmployeeEntity.java`
- `EmployeeDTO.java`
- `EmployeeMiniDTO.java`
- `EmployeeListDTO.java`
- `EmployeeForm.java`
- `EmployeeMapper.java`
- `EmployeeRepository.java`
- `EmployeeQueryProfile.java`
- `EmployeeService.java`
- `EmployeeController.java`

> **Naming convention:** `DefaultServiceImplements` already communicates the "implements" semantic in its name. Subclass names describe the domain role (what the service IS), not the implementation status. `ClientService` follows this convention; `AdminServiceImpl` is a known inconsistency tracked in [[Memory/known-issues]] for a separate cleanup.

**Links:** [[Memory/architecture|Architecture]]

#### 2. `EmployeeEntity`

**Purpose:** Persist Employee as a normal user subtype in the existing JOINED inheritance hierarchy.

**Changes:**

- Annotate with `@Entity` and `@Table(name = "employee")`.
- Extend `BaseUserEntity`.
- Add no Employee-specific columns for now.
- Do not add `apikey`, `apiKey`, or any API-key equivalent.
- Do not copy `ClientEntity.getBaseUser()` because it contains a recursive-call bug.

#### 3. Employee DTOs and form

**Purpose:** Define safe API input/output contracts.

**Changes:**

- `EmployeeForm` should include `firstName`, `lastName`, `email`, `username`, and `password`.
- `EmployeeForm` is used for both insert and update. The `password` field must remain optional at the form level — do not annotate it with `@NotBlank` or any constraint that would reject null or blank values.
- `EmployeeForm` should not accept roles from clients; the service assigns `EMPLOYEE`.
- `EmployeeDTO` and `EmployeeMiniDTO` should expose safe identity fields and role authorities, not password.
- `EmployeeListDTO` should expose list-safe fields similar to Admin/Client: `id`, names, email, username, roles, enabled, `dateCreated`, and `lastLogin`.
- No DTO should expose any API-key field.

#### 4. `EmployeeMapper`

**Purpose:** Convert Employee entities to safe DTOs and map forms to entities without security decisions leaking into mapping.

**Changes:**

- Map roles as authorities using `UserRoles.getAuthority()` so Employee appears as `ROLE_EMPLOYEE`.
- Avoid accepting role values from request forms.
- Keep password encoding out of mapper if possible; the service should own password policy.
- Include null-safety for optional fields and role collections.

#### 5. `EmployeeRepository`

**Purpose:** Provide persistence and QueryDSL support for Employee.

**Changes:**

- Extend `DefaultRepository<EmployeeEntity, Long>`.
- Add `Optional<EmployeeEntity> findByUsername(String username)` for local Employee-level lookup.
- Add `Optional<EmployeeEntity> findByEmail(String email)` for local Employee-level lookup.
- **Global uniqueness methods must live on `BaseUserRepository`, not `EmployeeRepository`.** Add two Spring Data derived query methods to `BaseUserRepository`:
  - `boolean existsByUsername(String username)` — queries the shared `base_user` table across all subtypes.
  - `boolean existsByEmail(String email)` — queries the shared `base_user` table across all subtypes.
- `EmployeeServiceImpl` must inject both `EmployeeRepository` and `BaseUserRepository`. Before insert or email/username-changing update, call `baseUserRepository.existsByUsername(...)` and `baseUserRepository.existsByEmail(...)` and reject with `ItemAlreadyExist` if a conflict is found.
- `AdminServiceImpl` and `ClientServiceImpl` must also inject `BaseUserRepository` and replace their current subtype-only duplicate checks (`AdminRepository.findByUsername`/`findByEmail`) with the same global `BaseUserRepository.existsByUsername`/`existsByEmail` checks. This is a retroactive fix: the current implementations check only their own subtype repositories, missing cross-subtype duplicates.
- Local subtype repository `findByUsername`/`findByEmail` methods may be retained for other use cases within each service (e.g., get-by-username resolution), but must not be the sole gate for insert uniqueness.

#### 6. Employee identity and password policy

**Purpose:** Keep account provisioning rules explicit and testable.

**Changes:**

- Employee insert must require a non-blank password; reject null or blank passwords at the service level before encoding.
- Employee service must encode the password with the configured `PasswordEncoder` before saving on insert.
- Employee service must force `Set.of(UserRoles.EMPLOYEE)` on insert.
- Employee service must not preserve or accept caller-provided roles.
- Employee update must not rely on `DefaultServiceImplements.update()` because that base method does not apply form data.
- Employee update must preserve the existing encoded password when the supplied password is null or blank; only a non-blank raw password should be validated, encoded, and applied.
- A null or blank password on update must never overwrite the stored hash with an empty or raw value.
- **Global username/email uniqueness enforcement** (requires `BaseUserRepository` injection per Section 5):
  - On **insert**: call `baseUserRepository.existsByUsername(form.getUsername())` and `baseUserRepository.existsByEmail(form.getEmail())` before encoding the password. If either returns `true`, throw `ItemAlreadyExist` with a message identifying the conflicting field (e.g., `"A user with username 'X' already exists"` or `"A user with email 'Y' already exists"`). Do not proceed to `employeeRepository.save()` when a conflict is found.
  - On **update**: only perform the global check when the new username or email differs from the stored entity. If the new value matches the stored value, skip the check to avoid false-positive self-conflicts.
  - **Cross-subtype tests required**: create an Admin or Client with a target username/email, then attempt to insert/update an Employee with the same value. Assert that `ItemAlreadyExist` is thrown at the service layer (not a `DataIntegrityViolationException` from the database). Mirror these tests for Admin-vs-Employee and Client-vs-Employee insert conflicts.
  - A null or blank password on update must never overwrite the stored hash with an empty or raw value.

#### 7. `EmployeeService`

**Purpose:** Own Employee business rules and admin-only access.

**Changes:**

- Extend the generic CRUD base only where useful.
- Override CRUD/list methods that must be admin-only:
  - `getOne`
  - `getAll`
  - `getListPage`
  - `insert`
  - `update`
  - `delete`
- Apply `@PreAuthorize("hasRole('ADMIN')")` to admin-only service methods.
- Return DTOs through `EmployeeMapper`.
- Do not add token minting.

#### 8. `EmployeeController`

**Purpose:** Expose admin-only Employee management endpoints through existing controller conventions.

**Changes:**

- `@RestController`
- `@RequestMapping("/employee")`
- Extend `DefaultController` with Employee type parameters.
- Do not add `/employee/token/{username}`.
- Do not add self-registration routes.

#### 9. `EmployeeQueryProfile`

**Purpose:** Support safe QueryDSL filtering/sorting for Employee list endpoints.

**Changes:**

- Mirror safe Admin/Client query fields:
  - `id`
  - `firstName`
  - `lastName`
  - `email`
  - `username`
  - `enabled`
  - `dateCreated`
  - `lastLogin`
- Default sort: `id ASC`.
- Reject `password`, `roles`, `apiKey`, and `apikey`.
- Depend on generated `QEmployeeEntity`; full compile is required after entity creation.

#### 10. Security configuration hardening

**Purpose:** Make Employee admin-only rules enforceable and define the global authorization contract in one place.

**Changes:** **IMPLEMENTED (Task 1)**

- ~~Enable Spring method security with `@EnableMethodSecurity` in the main application class or a dedicated security configuration class so that all existing and new `@PreAuthorize` annotations are enforced.~~ Done: `@EnableMethodSecurity` placed on `SecurityConfig` (co-located with all security beans, SRP).
- ~~Configure HTTP request authorization with the ordered matrix above.~~ Done: `authorizeHttpRequests` block added to `SecurityConfig.securityFilterChain()`.

| Pattern | Required access | Rationale |
|---|---|---|
| `DispatcherType.FORWARD` and `DispatcherType.ERROR` | `permitAll` | Internal dispatches (including Spring's error handling) must remain reachable so auth failures return the intended JSON error body. |
| `OPTIONS /**` | `permitAll` | Browser CORS preflight requests must succeed before the real request reaches authorization. |
| `/login` and `/login/` | `permitAll` | The existing JWT login endpoint must be reachable anonymously. |
| `/employee/**` | `hasRole("ADMIN")` | Employee management is admin-only in this version. |
| `/admin/**` | `hasRole("ADMIN")` | Admin endpoints are admin-only; this closes the gap where inherited base CRUD methods were only `isAuthenticated()`. |
| `/client/**` | `authenticated` | Client mutations are already enforced as ADMIN at the method level; this baseline ensures read/self-service endpoints require a valid JWT. |
| any other request | `authenticated` | No anonymous access to undefined routes. |

- Preserve JWT stateless session behavior. — Confirmed: `SessionCreationPolicy.STATELESS` unchanged.
- Method-level rules (`@PreAuthorize`) may be stricter than HTTP-level rules and take precedence where present. — Now enforced; `@EnableMethodSecurity` activated.
- Update `corsConfigurationSource()` to include `HttpMethod.OPTIONS` in the allowed methods if preflight tests fail; do **not** broaden allowed origins in this feature. — Done: `"OPTIONS"` added to `setAllowedMethods`.
- Add regression tests proving: — Done: `SecurityAuthorizationTest.java` with 6 behavior tests.
  - `/login` stays public.
  - `/employee/**` rejects anonymous, Client, and Employee users; accepts Admin.
  - Existing Admin and Client endpoints still behave correctly under the tightened rules.

Spring Security reference notes:

- `@EnableMethodSecurity` activates method-level security.
- `@PreAuthorize("hasRole('ADMIN')")` requires `ROLE_ADMIN` authority.
- `authorizeHttpRequests` should explicitly define public and protected routes; rules are evaluated in declaration order.

#### 11. Login/JWT integration

**Purpose:** Confirm Employee is a normal login user.

**Changes:**

- No login endpoint changes should be required if Employee extends `BaseUserEntity` and uses BCrypt password storage.
- Employee login should return a JWT and response roles containing `ROLE_EMPLOYEE`.
- JWT validation should populate `ROLE_EMPLOYEE` authority from the token.
- Tests must verify this behavior.

#### 12. `AuthUserUtil` Employee support

**Purpose:** Prepare shared helpers for future Employee-owned features. Refactor `AuthUserUtil` to use `BaseUserRepository` for all subtype entity lookups (leveraging the existing JOINED inheritance), eliminating per-subtype repository coupling before it grows with Employee.

**Changes:**

- **Refactor existing entity lookups:** Replace `ClientRepository` and `AdminRepository` with a single `BaseUserRepository`. Rewrite `getAuthUserAdminEntity()` and `getAuthUserClientEntity()` to use `baseUserRepository.findByUsername()` with an `instanceof` filter and cast. Extract a private generic helper `<T extends BaseUserEntity> Optional<T> getAuthUserEntity(Class<T>)` to avoid duplication.
- **Add `isAuthUserEmployee()`:** Role-only check following the existing `isAuthUserClient()` / `isAuthUserAdmin()` pattern. Requires no repository injection.
- **Add `getAuthUserEmployeeEntity()`:** One-line delegation to the generic helper when a caller needs it. No constructor change required because the method uses the shared `BaseUserRepository`.
- **Test:** Add a test in `AuthUserUtilTest` verifying that `getAuthUserAdminEntity()` and `getAuthUserClientEntity()` return correct `instanceof` subtypes under JOINED inheritance after the refactoring.

**Rationale:** `SecurityUserServiceImpl` already uses `BaseUserRepository.findByUsername()` for cross-subtype user lookup. Extending this pattern to `AuthUserUtil` consolidates the architecture, satisfies the Open/Closed Principle (new subtypes like Employee require no constructor changes), and avoids the linear growth of repository dependencies with each new user type.

#### 13. Test helper support

**Purpose:** Make Employee security tests easy to write through public behavior.

**Changes:**

- Extend `TestAuthenticationHelper` with Employee user/token helpers if JWT-based tests use it.
- Prefer behavior tests through `/login` and MockMvc where practical.
- Avoid tests that assert private implementation details.

---

## Implementation Steps

### Phase 1: Baseline security and test scaffolding

- [x] **Step 1.1:** Add failing tests that prove Employee endpoints require Admin access: anonymous, Client, and Employee users are denied; Admin is allowed. Use existing Admin and Client endpoints to verify the authorization infrastructure is working; do not test against `/employee/**` routes that do not yet exist. Employee-specific authorization tests belong in Phase 3 after `EmployeeController` exists.
- [x] **Step 1.2:** Add or update security tests proving `/login` stays public while protected routes require authentication/authorization.
- [x] **Step 1.3:** Enable method security and explicit HTTP authorization rules so the new admin-only tests can pass.
- [x] **Step 1.4:** Ensure existing Admin and Client tests still pass or update expected authorization behavior where the previous behavior was insecure.

### Phase 2: Employee domain foundation

- [x] **Step 2.1:** Create `EmployeeEntity` as a `BaseUserEntity` subclass with no Employee-specific columns and no API-key field.
- [x] **Step 2.2:** Create Employee DTOs and `EmployeeForm` with explicit-password input and safe output fields.
- [x] **Step 2.3:** Create `EmployeeMapper` with authority serialization and no role-input mapping.
- [x] **Step 2.4:** Create `EmployeeRepository` with username/email lookup methods.
- [x] **Step 2.5:** Compile the backend to generate `QEmployeeEntity` for QueryDSL.

### Phase 3: Employee business rules and CRUD

- [x] **Step 3.1:** Create `EmployeeQueryProfile` with safe fields and default sorting.
- [x] **Step 3.2:** Create `EmployeeService` with explicit admin-only methods, global username/email uniqueness, forced `EMPLOYEE` role assignment, BCrypt password encoding, and a real update implementation.
- [x] **Step 3.3:** Create `EmployeeController` at `/employee` using the generic controller pattern.
- [x] **Step 3.4:** Verify no Employee API-key field or token-minting endpoint exists.

### Phase 4: Authentication and role behavior

- [x] **Step 4.1:** Add Employee login tests proving `/login` authenticates Employee credentials.
- [x] **Step 4.2:** Add JWT response tests proving Employee login returns `ROLE_EMPLOYEE`.
- [x] **Step 4.3:** Add JWT-protected request tests proving Employee tokens do not grant admin-only Employee CRUD access.
- [x] **Step 4.4:** Extend `AuthUserUtil` and/or test authentication helpers only where the tests or near-term code require it.

### Phase 5: Regression and supplemental test coverage

These tests exercise cross-cutting integration, edge cases, and final verification after all modules are assembled. Each module's first behavior tests must already exist from its respective implementation phase — this phase adds depth, not initial coverage.

- [x] **Step 5.1:** Add supplemental Employee repository tests for edge cases (constraint violations, cascade behavior, JOINED inheritance boundary conditions).
- [x] **Step 5.2:** Add mapper contract-completeness tests: safe DTO output across all DTO variants, `ROLE_EMPLOYEE` serialization, absence of password/API-key fields, and null-safety on optional fields.
- [x] **Step 5.3:** Add cross-cutting service tests: update-with-unchanged-email skips uniqueness check, blank password preserved on update, null roles ignored.
- [x] **Step 5.4:** Add list/query edge-case tests: maximum page size rejection, invalid filter field rejection (`password`, `roles`, `apikey`), unsupported operators on boolean fields, and type-mismatch error responses.
- [x] **Step 5.5:** Add controller validation tests: malformed request bodies, size-limit violations, and invalid query/sort field rejection at the HTTP layer.
- [x] **Step 5.6:** Run the full `./mvnw test` cycle and confirm all existing Admin and Client tests still pass under the hardened security configuration.

---

## Potential Issues / Risks

- Enabling method security can expose previously hidden authorization gaps in Admin and Client services.
- `DefaultServiceImplements.update()` is incomplete; Employee must not inherit it unchanged.
- QueryDSL generated classes require a compile after adding `EmployeeEntity`.
- `UserRoles.EMPLOYEE` already exists; do not reorder enum values because role persistence may currently be ordinal.
- Global username/email uniqueness should be handled deliberately to avoid database constraint failures surfacing as generic errors.
- If `SecurityUser` account status methods do not match the `UserDetails` `is*` methods, disabled/locked flags may not affect login; Employee tests may reveal this broader issue.
- Existing CORS config is hardcoded to `http://localhost:3000`; this feature should not broaden deployment CORS policy.
- Existing JWT validation trusts authority claims until expiration; Employee role changes may not affect already issued tokens.

---

## Testing Decisions

Good tests for this feature should verify observable behavior through public interfaces. Tests should avoid coupling to private methods or implementation-only details. The most valuable tests are integration-style tests that exercise repository persistence, service behavior, controller endpoints, and real authentication/authorization flows.

Testing decisions:

- Use TDD in vertical slices: one failing behavior test, minimal implementation, then refactor.
- Each Task document must enforce TDD within its scope: write the failing behavior test for the slice first, implement the minimum code to pass it, then refactor. Do not defer a module's first behavior tests to Phase 5; that phase provides regression and supplemental coverage only.
- Test Employee as a normal login user through `/login`, not only with `@WithMockUser`.
- Keep mapper tests focused on DTO contract behavior: safe fields, role format, no password/API-key exposure.
- Keep service tests focused on business rules: admin-only access, forced `EMPLOYEE` role, password encoding, uniqueness, and update behavior.
- Keep controller tests focused on HTTP contract: routes, status codes, JSON shape, validation errors, forbidden access, and query rejection.
- Reuse prior art from:
  - `backend/src/test/java/com/agentForgeBackend/models/client/ClientRepositoryTest.java`
  - `backend/src/test/java/com/agentForgeBackend/models/hq/client/ClientServiceListQueryIntegrationTest.java`
  - `backend/src/test/java/com/agentForgeBackend/models/hq/client/ClientControllerListEndpointTest.java`
  - `backend/src/test/java/com/agentForgeBackend/models/hq/admin/AdminServiceListQueryIntegrationTest.java`
  - `backend/src/test/java/com/agentForgeBackend/models/hq/admin/AdminControllerListEndpointTest.java`
  - `backend/src/test/java/com/agentForgeBackend/testUtils/TestAuthenticationHelper.java`

Modules to test:

- `EmployeeEntity` persistence through repository tests.
- `EmployeeMapper` DTO/form behavior.
- `EmployeeService` business rules and authorization.
- `EmployeeController` endpoint behavior.
- `EmployeeQueryProfile` list/filter/sort safety.
- `SecurityConfig` and method-security behavior.
- `/login` and JWT role emission for Employee.

---

## Task Breakdown

### Task 1: Harden Security for Admin-Only Employee Management

- **Steps Covered:** Step 1.1, Step 1.2, Step 1.3, Step 1.4
- **Reason for Grouping:** Security must be enforceable before Employee CRUD can safely exist; this task may affect existing endpoints and requires focused validation.
- **Planned Task File:** `Employee-User-Entity-and-Role-step-1-security-hardening.md`
- **Task Document Link:** [[Employee-User-Entity-and-Role-step-1-security-hardening]]

### Task 2: Add Employee Domain Model and API Contract

- **Steps Covered:** Step 2.1, Step 2.2, Step 2.3, Step 2.4, Step 2.5
- **Reason for Grouping:** These files define the core Employee shape and can be created together before business behavior is wired.
- **Planned Task File:** `Employee-User-Entity-and-Role-step-2-domain-contract.md`
- **Task Document Link:** [[Employee-User-Entity-and-Role-step-2-domain-contract]]

### Task 3: Implement Employee CRUD, Querying, and Admin-Only Business Rules

- **Steps Covered:** Step 3.1, Step 3.2, Step 3.3, Step 3.4
- **Reason for Grouping:** Service, query profile, and controller behavior are tightly coupled around the Employee CRUD use case.
- **Planned Task File:** `Employee-User-Entity-and-Role-step-3-crud-query-business-rules.md`
- **Task Document Link:** [[Employee-User-Entity-and-Role-step-3-crud-query-business-rules]]

### Task 4: Add Employee Login and JWT Role Coverage

- **Steps Covered:** Step 4.1, Step 4.2, Step 4.3, Step 4.4
- **Reason for Grouping:** Authentication behavior is a distinct integration path from CRUD and should be validated as its own vertical slice.
- **Planned Task File:** `Employee-User-Entity-and-Role-step-4-login-jwt-role.md`
- **Task Document Link:** [[Employee-User-Entity-and-Role-step-4-login-jwt-role]]

### Task 5: Regression and Supplemental Test Coverage

- **Steps Covered:** Step 5.1, Step 5.2, Step 5.3, Step 5.4, Step 5.5, Step 5.6
- **Reason for Grouping:** Supplemental tests for cross-cutting integration, edge cases, and comprehensive regression verification after all modules are assembled. First behavior tests for each module are written within their respective implementation task (Tasks 1–4) following TDD.
- **Planned Task File:** `Employee-User-Entity-and-Role-step-5-regression-verification.md`
- **Task Document Link:** 
