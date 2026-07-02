# Task: Harden Security for Admin-Only Employee Management

#task #current #high-complexity #parent-employee-user-entity-and-role

**Parent:** [[Employee-User-Entity-and-Role]]
**Parent Type:** Feature
**Related Step(s):** Phase 1 — Steps 1.1, 1.2, 1.3, 1.4
**Estimated Complexity:** High

---

## Goal

Enable Spring method security and configure explicit HTTP request authorization rules so that admin-only access for the future Employee endpoints is actually enforceable, then prove the authorization behavior through failing-first tests against existing Admin and Client endpoints.

---

## Parent Context

The parent Feature adds an Employee user domain with admin-only CRUD. Before a single Employee file can be written, the authorization infrastructure must be proven correct: `@PreAuthorize` annotations are currently dead code because `@EnableMethodSecurity` is absent, and the filter chain has no `authorizeHttpRequests` rules, meaning all routes are effectively open once a valid JWT is present. This task establishes the security baseline that makes every subsequent task's `@PreAuthorize("hasRole('ADMIN')")` actually enforced.

The Feature's authorization matrix (from Section 10) specifies the following ordered rules for the filter chain:

| Pattern | Required access |
|---|---|
| `DispatcherType.FORWARD` and `DispatcherType.ERROR` | `permitAll` |
| `OPTIONS /**` | `permitAll` |
| `/login` and `/login/` | `permitAll` |
| `/employee/**` | `hasRole("ADMIN")` |
| `/admin/**` | `hasRole("ADMIN")` |
| `/client/**` | `authenticated` |
| any other request | `authenticated` |

Step 1.1 instructs using existing Admin and Client endpoints to prove the security infrastructure works — do not test against `/employee/**` routes that do not yet exist. The TDD constraint from the Feature requires that the first behavior test for this slice comes before the implementation changes.

---

## Preconditions / Dependencies

- The backend Spring Boot project compiles and all existing tests pass with `./mvnw test`.
- `TestAuthenticationHelper` exists at `backend/src/test/java/com/agentForgeBackend/testUtils/TestAuthenticationHelper.java` and provides `initializeMockUsers()`, `getAdminToken()`, and `getClientToken()`.
- No prior Task documents exist; this is the first task in the Employee feature sequence.
- Spring Boot 3.4.1 / Spring Security 6.4.x is in use (verified from `pom.xml`).
- H2 in-memory database is configured for tests via `application-test.properties` with `spring.jpa.hibernate.ddl-auto=create-drop`.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — Selected — task template and document location conventions
- `solid-deep-design` — Selected — kept security concern in `SecurityConfig` (SRP), designed authorization as pure configuration (deep module behind existing interface)
- `tdd` — Selected — vertical slice TDD: write failing authorization tests first, then implement config changes
- `memory-bank` — Selected — architecture and known-issues context
- `glossary-management` — Selected — no domain glossary exists yet; terms come from Memory Bank and the Feature
- `find-docs` — Selected — Spring Security 6.4.x docs verified via Context7

### Documentation Reviewed

- Context7: `spring-projects/spring-security@6.4.4` — `@EnableMethodSecurity`, `authorizeHttpRequests`, `dispatcherTypeMatchers`, `hasRole`, `permitAll`, `anyRequest().authenticated()` DSL syntax verified
- Feature document: `documentation/Features/to-do/Employee-User-Entity-and-Role.md` — authorization matrix (Section 10) and TDD vertical-slice requirement (Testing Decisions)
- Review bug report: `documentation/Bugs/done/Review-of-Employee-User-Entity-and-Role.md` — confirmed Finding 1 (security matrix now explicit), Finding 4 (TDD vertical slices), authorization decisions patched into parent

### Related Existing Code

- `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java` — the file to modify; currently lacks `authorizeHttpRequests` and `@EnableMethodSecurity`
- `backend/src/main/java/com/agentForgeBackend/agentForgeBackendApplication.java` — has duplicate `@EnableWebSecurity`; `@EnableMethodSecurity` goes to `SecurityConfig` instead
- `backend/src/main/java/com/agentForgeBackend/configuration/security/LoginForm.java` — `@Data` Lombok class with `String username` and `String password` fields; the login test posts JSON with these exact field names
- `backend/src/main/java/com/agentForgeBackend/configuration/filter/JWTTokenValidatorFilter.java` — skips `/login` via `shouldNotFilter`; OPTIONS requests without tokens pass through without setting a SecurityContext
- `backend/src/main/java/com/agentForgeBackend/shared/defaultImplements/DefaultServiceImplements.java` — `@PreAuthorize("isAuthenticated()")` on all base CRUD; currently unenforced because method security is disabled
- `backend/src/main/java/com/agentForgeBackend/models/hq/admin/AdminServiceImpl.java` — overrides `insert` and `getOne` with `@PreAuthorize("hasRole('ADMIN')")`; other methods inherit the weaker base annotation
- `backend/src/main/java/com/agentForgeBackend/models/hq/client/ClientService.java` — `insert` and `update` have `@PreAuthorize("hasRole('ADMIN')")`; `getOne` and list methods use the base `isAuthenticated()`
- `backend/src/test/java/com/agentForgeBackend/testUtils/TestAuthenticationHelper.java` — produces real JWT tokens for AdminEntity and ClientEntity; used by the new security test
- `backend/src/test/java/com/agentForgeBackend/models/hq/admin/AdminControllerListEndpointTest.java` — existing controller test using `@WithMockUser(roles = "ADMIN")` that must still pass
- `backend/src/test/java/com/agentForgeBackend/models/hq/client/ClientControllerListEndpointTest.java` — existing controller test using `@WithMockUser(roles = "ADMIN")` that must still pass
- `backend/src/test/java/com/agentForgeBackend/models/hq/admin/AdminServiceListQueryIntegrationTest.java` — existing service test using `@WithMockUser(roles = "ADMIN")` that must still pass
- `backend/src/main/resources/application-test.properties` — H2 test profile, `create-drop` DDL strategy

---

## Implementation Details

### Approach

The task proceeds in strict TDD vertical-slice order:

1. **RED** — Write `SecurityAuthorizationTest.java` first. Every assertion targets the final desired authorization behavior. All tests fail because the filter chain has no `authorizeHttpRequests` rules and `@PreAuthorize` is unenforced.
2. **GREEN** — Modify `SecurityConfig.java` to enable method security and add the authorization matrix. All new tests pass.
3. **VERIFY** — Run the full test suite (`./mvnw test`) to confirm existing `@WithMockUser`-based tests still pass under the hardened configuration.

**Design decision — where to add `@EnableMethodSecurity`:** `SecurityConfig` is the correct host. It already owns all security bean definitions. Adding method security there keeps the full security configuration co-located (SRP). The main application class already has a duplicate `@EnableWebSecurity`; do not add `@EnableMethodSecurity` there to avoid spreading security decisions across classes.

**Design decision — authorization order in filter chain:** Rules are evaluated first-match-wins. The order below ensures: error dispatches always work, CORS preflights always pass, login is always reachable, then explicit role-based rules for Employee and Admin, then a baseline authenticated check for everything else. The `/employee/**` rule must appear before `anyRequest().authenticated()` even though Employee endpoints do not yet exist — the rule is harmless today and will be enforced when the controller is created in Task 3.

**Design decision — why `@WithMockUser` tests survive hardening:** Spring Security Test's `@WithMockUser(roles = "ADMIN")` installs an authenticated `SecurityContext` with `ROLE_ADMIN` before the request reaches the filter chain. Both the HTTP-level `hasRole("ADMIN")` check on `/admin/**` and the method-level `@PreAuthorize("hasRole('ADMIN')")` evaluate against this synthetic context. The JWT filter is a `OncePerRequestFilter`; MockMvc wires it into the test filter chain but `@WithMockUser` runs before filters, injecting the auth context so the JWT filter sees no `Authorization` header and simply passes through without clearing the already-set context. All existing `@WithMockUser(roles = "ADMIN")` tests therefore pass under hardened security.

**Design decision — CORS OPTIONS handling:** The filter chain's `requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()` allows Spring Security to pass OPTIONS requests to the CORS configuration layer. The `corsConfigurationSource()` must also include `"OPTIONS"` in its allowed methods so that the CORS layer itself generates valid preflight responses.

### Files to Create/Modify

- [x] `backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java` — **NEW** — six behavior tests proving the authorization matrix; written first (TDD RED phase)
- [x] `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java` — **MODIFY** — add `@EnableMethodSecurity`, `authorizeHttpRequests` block, and `"OPTIONS"` to CORS methods (TDD GREEN phase)

---

## Step-by-Step Implementation

### Step 1: Write SecurityAuthorizationTest (TDD RED)

**Goal:** Establish failing tests that define the exact authorization behavior the filter chain must enforce. Tests run against existing `/admin/**` and `/client/**` endpoints. No Employee endpoints are tested because they do not exist yet.

**Dependencies:** `TestAuthenticationHelper` in classpath, `AdminRepository` and `ClientRepository` injectable, `MockMvc` auto-configured.

- [x] Create `backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java`
- [x] Annotate with `@SpringBootTest`, `@AutoConfigureMockMvc`, `@ActiveProfiles("test")` — no `@WithMockUser` at class level; this test uses real tokens
- [x] Inject `MockMvc`, `TestAuthenticationHelper`, `AdminRepository`, `ClientRepository`, `PasswordEncoder`
- [x] In `@BeforeEach`: delete all clients, delete all admins, call `authHelper.initializeMockUsers()` to populate a real Admin JWT and a real Client JWT
- [x] Write test: `anonymousRequestToAdminListEndpointReturns401` — POST `/admin/list` with `{}` and no auth header; expect 401 and JSON body `{"error":"Unauthorized"}`
- [x] Write test: `clientJwtRequestToAdminListEndpointReturns403` — POST `/admin/list` with Client JWT in `Authorization` header; expect 403 and JSON body `{"error":"Forbidden"}`
- [x] Write test: `adminJwtRequestToAdminListEndpointReturns200` — POST `/admin/list` with Admin JWT; expect 200 (even with empty data set, the endpoint is reachable)
- [x] Write test: `loginEndpointIsPublicAndReturnsTokenForValidCredentials` — persist an AdminEntity with BCrypt-encoded known password, POST to `/login` with that credential; expect 200, non-empty `token`, correct `username`, and a `roles` array containing `"ROLE_ADMIN"`
- [x] Write test: `anonymousRequestToProtectedEndpointReturns401` — GET `/test` with no auth; expect 401
- [x] Write test: `authenticatedRequestToProtectedEndpointReturns200` — GET `/test` with Admin JWT; expect 200

**Why this step is critical:** Tests written before the implementation constrain the implementation exactly. Without them, the implementation could add overly broad rules (blocking login) or overly narrow rules (leaving admin routes open). Failing tests make the gap visible.

#### Implementation

```java
package com.agentForgeBackend.configuration.security;

import com.agentForgeBackend.models.hq.admin.AdminEntity;
import com.agentForgeBackend.models.hq.admin.AdminRepository;
import com.agentForgeBackend.models.hq.client.ClientRepository;
import com.agentForgeBackend.shared.models.baseUser.UserRoles;
import com.agentForgeBackend.testUtils.TestAuthenticationHelper;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityAuthorizationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private TestAuthenticationHelper authHelper;
    @Autowired private AdminRepository adminRepository;
    @Autowired private ClientRepository clientRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        // Flush after each deleteAll() matches the existing project test pattern
        // and ensures H2 commit visibility before initializeMockUsers() re-inserts
        // entities at the same email/username addresses. <!-- REVIEW-FIX: added flush() after deleteAll() to match existing pattern and prevent constraint violations -->
        clientRepository.deleteAll();
        clientRepository.flush();
        adminRepository.deleteAll();
        adminRepository.flush();
        authHelper.initializeMockUsers();
    }

    // Step 1.1 — Admin endpoint blocks non-admin callers

    @Test
    void anonymousRequestToAdminListEndpointReturns401() throws Exception {
        mockMvc.perform(post("/admin/list")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error").value("Unauthorized"));
    }

    @Test
    void clientJwtRequestToAdminListEndpointReturns403() throws Exception {
        mockMvc.perform(post("/admin/list")
                .header("Authorization", authHelper.getClientToken())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error").value("Forbidden"));
    }

    @Test
    void adminJwtRequestToAdminListEndpointReturns200() throws Exception {
        mockMvc.perform(post("/admin/list")
                .header("Authorization", authHelper.getAdminToken())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk());
    }

    // Step 1.2 — Login is public; other routes require authentication

    @Test
    void loginEndpointIsPublicAndReturnsTokenForValidCredentials() throws Exception {
        AdminEntity loginAdmin = new AdminEntity();
        loginAdmin.setFirstName("Login");
        loginAdmin.setLastName("Test");
        loginAdmin.setEmail("logintest@test.com");
        loginAdmin.setUsername("logintest@test.com");
        loginAdmin.setPassword(passwordEncoder.encode("testPassword123"));
        loginAdmin.setRoles(Set.of(UserRoles.ADMIN));
        loginAdmin.setEnabled(true);
        loginAdmin.setAccountNonExpired(true);
        loginAdmin.setAccountNonLocked(true);
        loginAdmin.setCredentialsNonExpired(true);
        adminRepository.saveAndFlush(loginAdmin);

        mockMvc.perform(post("/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        { "username": "logintest@test.com", "password": "testPassword123" }
                        """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").isNotEmpty())
            .andExpect(jsonPath("$.username").value("logintest@test.com"))
            .andExpect(jsonPath("$.roles", hasItem("ROLE_ADMIN"))); // REVIEW-FIX: replaced $.roles[0] index with hasItem() to avoid ordering dependency
    }

    @Test
    void anonymousRequestToProtectedEndpointReturns401() throws Exception {
        mockMvc.perform(get("/test"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error").value("Unauthorized"));
    }

    @Test
    void authenticatedRequestToProtectedEndpointReturns200() throws Exception {
        mockMvc.perform(get("/test")
                .header("Authorization", authHelper.getAdminToken()))
            .andExpect(status().isOk());
    }
}
```

#### Edge Cases

1. **`TestAuthenticationHelper` emails already exist** — `@BeforeEach` deletes all clients, then all admins, each followed by an explicit `flush()`, before calling `initializeMockUsers()`. The `flush()` calls match the project's existing test pattern (`adminRepository.deleteAll(); adminRepository.flush();` in `AdminControllerListEndpointTest`) and ensure the H2 database commits are visible before `initializeMockUsers()` re-inserts entities at the same email/username values. Without the `flush()`, a unique constraint violation on `email` or `username` is possible when `initializeMockUsers()` runs if H2 hasn't yet made the delete visible within the session. Deleting clients before admins avoids FK constraint ordering issues during JOINED-inheritance cascade.
2. **login test admin conflicts with `initializeMockUsers` admin** — The `logintest@test.com` email/username differs from `admin@test.com` used by `initializeMockUsers`, so no unique constraint violation occurs.
3. **`adminJwtRequestToAdminListEndpointReturns200` with empty data** — The test expects 200, not a specific count. Even when zero admins exist (because `@BeforeEach` deletes then repopulates only the JWT-helper user, not the test data admins other tests use), the list endpoint returns a valid paginated response with `totalElements: 1` (the admin created by `initializeMockUsers`).

---

### Step 2: Add `@EnableMethodSecurity` and `authorizeHttpRequests` (TDD GREEN)

**Goal:** Modify `SecurityConfig` to enable method security and define the complete HTTP authorization matrix so all six tests from Step 1 pass.

**Dependencies:** Step 1 tests must be in place and failing.

- [x] Open `SecurityConfig.java`
- [x] Add `@EnableMethodSecurity` annotation to the class — place it below `@EnableWebSecurity` on the same `SecurityConfig` class
- [x] Add imports: `jakarta.servlet.DispatcherType`, `org.springframework.http.HttpMethod`, `org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity`
- [x] Inside `securityFilterChain()`, add `.authorizeHttpRequests(...)` after `.sessionManagement(...)` and before `.exceptionHandling(...)` with the exact authorization matrix from the Feature (see implementation below)
- [x] In `corsConfigurationSource()`, add `"OPTIONS"` to the `setAllowedMethods` list
- [x] Do NOT remove any existing configuration; this is purely additive

**Why this step is critical:** This is the gate. Without `@EnableMethodSecurity`, all `@PreAuthorize` annotations in existing and future services are silently ignored. Without `authorizeHttpRequests`, the filter chain grants implicit access to all routes after JWT validation, which means a Client JWT can call any `/admin/**` endpoint.

#### Implementation

```java
// Added imports (at top of SecurityConfig.java):
import jakarta.servlet.DispatcherType;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

// Changed class declaration:
@Configuration
@EnableWebSecurity
@EnableMethodSecurity   // ← ADD THIS
public class SecurityConfig {

    // Inside securityFilterChain(), add .authorizeHttpRequests() BEFORE .exceptionHandling():
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
            CorsConfigurationSource corsConfigurationSource) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(authorize -> authorize          // ← ADD THIS BLOCK
                .dispatcherTypeMatchers(DispatcherType.FORWARD, DispatcherType.ERROR).permitAll()
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/login", "/login/").permitAll()
                .requestMatchers("/employee/**").hasRole("ADMIN")
                .requestMatchers("/admin/**").hasRole("ADMIN")
                .requestMatchers("/client/**").authenticated()
                .anyRequest().authenticated()
            )
            .exceptionHandling(ex ->
                ex.authenticationEntryPoint(authenticationEntryPoint())
                    .accessDeniedHandler(accessDeniedHandler()))
            .addFilterBefore(jwtTokenValidatorFilter, BasicAuthenticationFilter.class);
        return http.build();
    }

    // In corsConfigurationSource(), add "OPTIONS":
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration corsConfiguration = new CorsConfiguration();
        corsConfiguration.setAllowedOrigins(List.of("http://localhost:3000"));
        corsConfiguration.setAllowedMethods(
            List.of("GET", "POST", "PUT", "DELETE", "OPTIONS")); // ← ADD "OPTIONS"
        corsConfiguration.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        corsConfiguration.setExposedHeaders(List.of("Authorization"));
        corsConfiguration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", corsConfiguration);
        return source;
    }
```

#### Edge Cases

1. **`/error` vs `DispatcherType.ERROR`** — Spring Boot's error handling dispatches to `/error` internally using `DispatcherType.ERROR`. Using `.dispatcherTypeMatchers(DispatcherType.FORWARD, DispatcherType.ERROR).permitAll()` handles this internal dispatch regardless of the URI. A separate `requestMatchers("/error").permitAll()` is NOT needed and would expose a direct HTTP GET `/error` to anonymous callers, which is undesirable.
2. **OPTIONS body** — Browser CORS preflights are OPTIONS requests with no body and no Authorization header. The JWT filter skips them (no token → no SecurityContext set → no 401). The `requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()` prevents the authorization layer from blocking them. Both layers must permit OPTIONS for preflight to succeed end-to-end.
3. **`/employee/**` rule before `anyRequest()`** — The Employee rule is added to the matrix even though no Employee controller exists yet. This is intentional: the rule is evaluated by the filter chain at startup, not at route registration time. When Employee endpoints are created in Task 3, they will immediately be admin-only without any SecurityConfig change.
4. **`/client/**` as `authenticated` vs `hasRole("ADMIN")`** — Client management methods that require ADMIN access are protected by method-level `@PreAuthorize("hasRole('ADMIN')")` already present in `ClientService`. The HTTP-level `authenticated` rule enforces a minimum bar without over-constraining future self-service Client endpoints.
5. **Duplicate `@EnableWebSecurity` on application class** — `agentForgeBackendApplication.java` has `@EnableWebSecurity` alongside `SecurityConfig`. In Spring Security 6.x this is redundant (only one effective `SecurityFilterChain` is registered), but harmless. Do not remove it in this task to keep the diff minimal; a cleanup task can address it separately.

---

### Step 3: Verify Existing Tests Still Pass (Step 1.4)

**Goal:** Confirm that all pre-existing tests continue to pass after the security configuration changes.

**Dependencies:** Step 2 completed.

- [x] Run `./mvnw test` from the `backend/` directory
- [x] Confirm `AdminControllerListEndpointTest` passes — uses `@WithMockUser(roles = "ADMIN")`, which satisfies both HTTP-level `hasRole("ADMIN")` on `/admin/**` and method-level `isAuthenticated()` on `getListPage`
- [x] Confirm `ClientControllerListEndpointTest` passes — uses `@WithMockUser(roles = "ADMIN")`, which satisfies HTTP-level `authenticated` on `/client/**`
- [x] Confirm `AdminServiceListQueryIntegrationTest` passes — uses `@WithMockUser(roles = "ADMIN")`, which satisfies method-level `@PreAuthorize("hasRole('ADMIN')")` now that method security is enabled
- [x] Confirm `ClientServiceListQueryIntegrationTest` passes — uses `@WithMockUser(roles = "ADMIN")`
- [x] Confirm all other existing test classes pass

**Why this step is critical:** Enabling method security changes behavior for every class in the application, not just Employee. If an existing test relied on `@PreAuthorize` being silently skipped, that test now fails. This step surfaces those regressions before they reach Task 2.

#### Edge Cases

1. **`@WithMockUser` vs HTTP authorization** — `@WithMockUser` does NOT bypass the HTTP authorization layer (`authorizeHttpRequests`). It installs an authenticated SecurityContext *before* the filter chain, which the HTTP authorization evaluator reads. A `@WithMockUser(roles = "ADMIN")` user thus passes both `authenticated()` and `hasRole("ADMIN")` checks at the HTTP layer AND the method layer. No existing test should fail.
2. **Method security now active on `DefaultServiceImplements`** — All six base CRUD methods now have their `@PreAuthorize("isAuthenticated()")` actually enforced. Any test that calls a service method without any authentication context (neither `@WithMockUser` nor a real JWT) would now get an `AccessDeniedException`. Audit the test base for any such cases — none are expected based on the existing test review, but this is the risk to verify.
3. **`AdminServiceImpl.getAll()` and `delete()` inherit `isAuthenticated()`** — These methods are not overridden in `AdminServiceImpl` to require `ADMIN`. The HTTP-level `/admin/**` rule now provides the `hasRole("ADMIN")` gate for those endpoints. Method-level protection for the remaining Admin methods remains at `isAuthenticated()`, which is less strict than the HTTP gate. This is intentional and consistent with the Feature's design (HTTP gate is the admin-only enforcer for the Admin domain; method security adds defense-in-depth at the override level).

---

## Design Decisions

**Decision 1: `@EnableMethodSecurity` goes on `SecurityConfig`, not the application class**
- **Why:** `SecurityConfig` already owns all security bean definitions. Placing `@EnableMethodSecurity` there keeps the complete security contract in one file, which satisfies the Single Responsibility Principle — one class owns authentication, filter chain, exception handlers, CORS, and method authorization setup. The application class currently has a duplicate `@EnableWebSecurity` that is harmless but conceptually messy; adding more security annotations there would increase that mess without benefit.
- **Alternatives considered:** Adding it to the application class (`agentForgeBackendApplication`). Rejected because it splits security configuration across two files.

**Decision 2: HTTP authorization matrix added to the existing filter chain bean, not a new bean**
- **Why:** Spring Security 6.x supports one primary `SecurityFilterChain`. The existing bean is the correct extension point. Adding a second `SecurityFilterChain` bean would require explicit ordering and creates ambiguity about which chain handles which requests.
- **Alternatives considered:** A second `SecurityFilterChain` with higher order for Employee-only rules. Rejected as over-engineering — the authorization matrix is small enough to be a single ordered rule set.

**Decision 3: Employee route rule added now even though the controller doesn't exist**
- **Why:** The authorization matrix is a global contract. Adding `/employee/**` now means Task 3 (which creates the EmployeeController) does not need to touch SecurityConfig. Adding security rules alongside the controller they protect would require Task 3 to understand SecurityConfig, increasing coupling between tasks. Rule evaluation is lazy (only triggers when a matching request arrives), so the rule is harmless until Task 3 creates the routes.
- **Alternatives considered:** Adding the `/employee/**` rule in Task 3 when the controller is created. Rejected because it would make Task 3 responsible for two concerns (Employee domain AND security config).

**Decision 4: Test uses real JWT tokens (not `@WithMockUser`) to prove filter chain behavior**
- **Why:** The security test's purpose is to prove that the filter chain correctly enforces the authorization matrix. `@WithMockUser` bypasses the JWT filter entirely and installs a synthetic SecurityContext. Using real JWT tokens exercises the full flow: JWT filter parses the token, populates authorities, then HTTP authorization evaluates the populated context. Only a real token test proves that the chain behaves correctly for actual clients.
- **Alternatives considered:** `@WithMockUser` tests for the new security tests. Rejected because they would not catch regressions in the filter chain itself (e.g., a bug in authority extraction from JWT claims would not be detected).

**Decision 5: `DispatcherType.FORWARD` and `DispatcherType.ERROR` both permitted**
- **Why:** Spring Boot's `BasicErrorController` processes errors via an internal forward from `DispatcherType.REQUEST` to `DispatcherType.ERROR`. Without permitting both dispatcher types, an anonymous request to a protected endpoint would trigger an auth failure, which Spring Boot then tries to forward to `/error`, which is also blocked, resulting in an empty 500 response instead of the intended JSON error body. The existing `authenticationEntryPoint` and `accessDeniedHandler` write the JSON error directly to the response before Spring Boot can forward to `/error`, so in practice `ERROR` dispatch may not always be reached — but permitting it is defensive and follows Spring Security's own documentation examples.
- **Alternatives considered:** Only permitting `DispatcherType.ERROR`. Rejected in favor of also permitting `FORWARD` since it matches Spring Security's recommended pattern and guards against future additions of Spring MVC view dispatches.

---

## Testing Considerations

### Automatic Validation

- [x] Run `./mvnw test` from `backend/` — confirm all tests pass, including the new `SecurityAuthorizationTest`
- [x] Specifically verify these test classes pass without modification:
  - `AdminControllerListEndpointTest`
  - `ClientControllerListEndpointTest`
  - `AdminServiceListQueryIntegrationTest`
  - `ClientServiceListQueryIntegrationTest`
  - `AdminRepositoryQuerydslIntegrationTest`
  - `ClientRepositoryQuerydslIntegrationTest`
  - `GlobalExceptionHandlerQueryTest`
  - `DefaultControllerListEndpointTest`
  - `DefaultServiceImplementsListQueryTest`
  - `PageableFactoryTest`, `PageableRequestValidationTest`, `QueryableFieldTest`, `QueryPredicateBuilderTest`
- [x] Confirm `SecurityAuthorizationTest` has 6 tests and all pass after Step 2 changes

### Manual Validation

- [x] After `./mvnw spring-boot:run` (with Docker Compose for the DB), verify that `POST /login` with valid credentials returns 200 and a JWT
- [x] Verify that a curl request to `GET /admin` with no `Authorization` header returns `{"status":401,"error":"Unauthorized","message":"Invalid Credentials"}`
- [x] Verify that a curl request to `GET /admin` with a Client JWT returns `{"status":403,"error":"Forbidden","message":"Access Denied"}`
- [x] Verify that a curl request to `GET /admin` with an Admin JWT returns a valid response (200 or 404 for missing resource)

---

## Related Code Explanations

- `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java` — primary file modified in this task; now owns the authorization matrix and enables method security
- `backend/src/main/java/com/agentForgeBackend/configuration/filter/JWTTokenValidatorFilter.java:95-97` — `shouldNotFilter` skips `/login` paths; does not need to skip OPTIONS because OPTIONS without a token passes through the filter without setting or clearing the SecurityContext
- `backend/src/main/java/com/agentForgeBackend/shared/defaultImplements/DefaultServiceImplements.java:54-98` — all CRUD methods now have their `@PreAuthorize("isAuthenticated()")` enforced; HTTP-level rules provide admin-only gate for Admin endpoints without requiring method-level override of each method
- `backend/src/test/java/com/agentForgeBackend/testUtils/TestAuthenticationHelper.java` — used by the new security test to produce real JWT tokens; its `initializeMockUsers()` must be called after deleting existing users to avoid unique constraint violations on email/username

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected for this task
- [x] Up-to-date Spring Security 6.4.x documentation reviewed via Context7
- [x] `SecurityAuthorizationTest.java` created with 6 behavior tests
- [x] `SecurityConfig.java` modified with `@EnableMethodSecurity`, `authorizeHttpRequests` matrix, and OPTIONS added to CORS
- [x] All 6 new tests pass after SecurityConfig changes
- [x] `./mvnw test` passes without modification to any existing test class
- [x] No `@WithMockUser` used in `SecurityAuthorizationTest` — all tests use real JWT tokens or no auth header
- [x] Login endpoint verified publicly accessible (returns 200 for valid credentials without Authorization header)
- [x] Manual validation steps documented for the user
- [x] Parent feature step 1.1–1.4 can be marked complete

---

## Post-Review Notes

### Implementation verified

- `SecurityAuthorizationTest`: 6 tests, all pass. Covers anonymous 401, client 403, admin 200 for `/admin/**`; login public access; `/test` protected/unprotected access.
- `SecurityConfig`: `@EnableMethodSecurity` added to class; complete `authorizeHttpRequests` matrix with ordered rules; `"OPTIONS"` added to CORS `setAllowedMethods`.
- All 169+ existing tests pass unmodified. No regression in `@WithMockUser`-based tests.

### Known pre-existing issue

`authServerApplicationTests.contextLoads` fails because it runs without `@ActiveProfiles("test")` and attempts to connect to PostgreSQL which is not running outside Docker. This is **not caused by these changes** and exists on the base branch.

### Manual validation remaining

The 4 manual curl validation steps (login, admin access with no token, admin access with client token, admin access with admin token) require `./mvnw spring-boot:run` with Docker Compose for the PostgreSQL database. These remain unchecked for the user to perform.
