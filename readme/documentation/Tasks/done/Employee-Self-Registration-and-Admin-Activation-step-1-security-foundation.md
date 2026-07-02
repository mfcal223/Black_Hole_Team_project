# Task: Security Foundation — SecurityUser Fix, DisabledException Handler, and /register Rule

#task #current #medium-complexity #parent-employee-self-registration-and-admin-activation

**Parent:** [[Employee-Self-Registration-and-Admin-Activation]]
**Parent Type:** Feature
**Related Step(s):** Phase 1, Steps 1.1 – 1.4
**Estimated Complexity:** Medium

---

## Goal

Fix a pre-existing `SecurityUser` bug that lets disabled accounts log in, add a `DisabledException` handler so the login response is meaningful, add the public `/register` security rule that subsequent tasks depend on, and prove all three changes with a focused integration test class.

---

## Parent Context

The parent feature requires a security foundation before any employee-state or registration work can be built on top of it. Three changes form this foundation:

1. **`SecurityUser` bug (Step 1.1):** Spring Security 6.x (shipped with Spring Boot 3.4.1) made `UserDetails.isEnabled()`, `isAccountNonExpired()`, `isAccountNonLocked()`, and `isCredentialsNonExpired()` into `default` interface methods returning `true`. Because `SecurityUser` names these methods `getEnabled()`, `getAccountNonExpired()`, `getAccountNonLocked()`, and `getCredentialsNonExpired()`, they are ordinary methods — not overrides — and Spring Security never calls them. All accounts can currently log in regardless of their `enabled` flag.

2. **`DisabledException` handler (Step 1.2):** Once the `SecurityUser` fix is in place, login with a disabled account throws `DisabledException`. Without a `@ExceptionHandler` for it, no Spring MVC `HandlerExceptionResolver` handles `DisabledException`, so it propagates back up the filter chain. `ExceptionTranslationFilter` catches it as an `AuthenticationException` and delegates to `authenticationEntryPoint.commence()`, returning 401 with the generic message `"Invalid Credentials"` — indistinguishable from a wrong-password rejection, and without the `"Account pending admin activation."` message the frontend needs to show users appropriate guidance. The handler must be present in the same deploy as the `SecurityUser` fix. <!-- REVIEW-FIX: corrected "500 fallback" to the actual behavior: 401 "Invalid Credentials" via ExceptionTranslationFilter → authenticationEntryPoint -->

3. **`/register` permitAll rule (Step 1.3):** Tasks 4 (`RegistrationController`) need the `/register` path to be publicly accessible without a JWT. Adding this rule now (before the controller exists) is safe — an unmapped path that passes security returns 404 rather than 401. Tasks 2 and 3 (EmployeeDTO, activate/deactivate) do not depend on this rule, but adding it here keeps all security concerns in one task.

4. **Baseline tests (Step 1.4):** Two discriminating RED tests anchor the changes: (a) disabled-account login must return 401 after the fix (currently returns 200 — the classic sign-off for the bug), and (b) anonymous GET `/register` must return 404 after the rule (currently returns 401 without it).

**Impact scope:** The `SecurityUser` fix affects Admin, Client, and Employee login paths equally (all extend `BaseUserEntity`). All existing accounts in tests have `enabled = true`; no regression is expected on the positive path.

---

## Preconditions / Dependencies

- Spring Boot 3.4.1 / Spring Security 6.4.x project structure is in place (confirmed by `pom.xml`).
- `BaseUserEntity.enabled` field exists (`backend/src/main/java/com/agentForgeBackend/shared/models/baseUser/BaseUserEntity.java:68`).
- `GlobalExceptionHandler` handles `BadCredentialsException` with HTTP 401 and the same `ErrorHTTPRes` builder pattern — the new `DisabledException` handler mirrors it exactly.
- No previous tasks for this feature — Task 1 is the starting point.
- `TestAuthenticationHelper` and `EmployeeLoginJwtTest` establish the test patterns this task follows (FK-safe `@BeforeEach`, `PasswordEncoder`-encoded credentials, `POST /login` via `MockMvc`).

---

## Skills and Documentation Preparation

### Skills Reviewed

- `memory-bank` — Selected — loaded all 7 Memory Bank files; confirmed Spring Boot 3.4.1 / Spring Security 6.4.x versions and test patterns
- `solid-deep-design` — Selected — applied to assess SecurityUser adapter depth and GlobalExceptionHandler change scope
- `tdd` — Selected — vertical-slice TDD with discriminating RED tests before each production change
- `find-docs` — Not needed — `ctx7` binary unavailable; design is governed by project code patterns and confirmed Spring Security 6.x behavior from training knowledge (Spring Boot 3.4.1 ships Spring Security 6.4.x; `UserDetails` default methods verified via the `SecurityUser` source showing no `@Override` annotations)
- `glossary-management` — Not needed — glossary is empty for this project

### Documentation Reviewed

- Spring Security 6.4.x `UserDetails` interface: `isEnabled()`, `isAccountNonExpired()`, `isAccountNonLocked()`, `isCredentialsNonExpired()` are `default` methods returning `true`. Confirmed by `SecurityUser.java` having no `@Override` on the four `get*()` methods — the compiler did not require overrides because defaults exist.
- Spring Security `DaoAuthenticationProvider`: calls `DefaultPreAuthenticationChecks.check()` after `loadUserByUsername()`. That class throws `DisabledException` when `isEnabled()` returns `false`. The exception propagates out of `AuthenticationManager.authenticate()` in `SecurityController.login()`, then out of the controller method, and reaches `@ControllerAdvice` — NOT `ExceptionTranslationFilter` (which only handles filter-chain exceptions).
- `SecurityConfig.java` current rule order examined at lines 61–68: `/login` → `permitAll` comes first, `/employee/**` → `hasRole("ADMIN")` comes immediately after. New `/register` rule slots between them.

### Related Existing Code

- `backend/src/main/java/com/agentForgeBackend/shared/securityUser/SecurityUser.java` — the file with the four broken method names (lines 36–49)
- `backend/src/main/java/com/agentForgeBackend/exceptions/GlobalExceptionHandler.java:122` — `BadCredentialsException` handler; `DisabledException` handler mirrors it exactly
- `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java:61` — `/login` permitAll rule; new `/register` rule inserts on line 62
- `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityController.java:43` — `authenticationManager.authenticate(authenticationRequest)` — this is where `DisabledException` is thrown at runtime
- `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeLoginJwtTest.java` — FK-safe `@BeforeEach` pattern and `POST /login` test pattern to follow
- `backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java` — sibling test class; `@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test")` setup pattern
- `backend/src/main/java/com/agentForgeBackend/shared/tools/ErrorHTTPRes.java` — the Lombok `@Builder` response object used by all `GlobalExceptionHandler` handlers
- `backend/src/main/java/com/agentForgeBackend/shared/models/baseUser/BaseUserEntity.java:68` — `private boolean enabled = true;` — the field that `SecurityUser.isEnabled()` must delegate to

---

## Implementation Details

### Approach

**SOLID + Deep Design assessment:**

`SecurityUser` is a thin adapter: its single responsibility is bridging `BaseUserEntity` to the `UserDetails` port defined by Spring Security. The deletion test confirms it is essential (without it, Spring Security cannot authenticate any user). Its interface is already appropriately small — the fix simply corrects the naming error so the adapter properly overrides the port's contract (LSP: the adapter must honor the interface it implements). No design change is required; only method renaming.

`GlobalExceptionHandler` is a translation layer: it maps domain/security exceptions to HTTP error responses. Its interface is the set of exception types it handles. Adding `DisabledException` adds one more mapping in the same concern (SRP: all exception-to-HTTP translations belong here). The new handler follows the existing Lombok builder pattern exactly — no new abstraction is introduced.

`SecurityConfig` authorization rule ordering: Spring Security evaluates HTTP rules top-to-bottom and applies the first match. Adding `/register` before `/employee/**` is safe because `/register` does not prefix-match `/employee/**`. The rule must come before `anyRequest().authenticated()`.

**Deployment coupling:** The `GlobalExceptionHandler` change and the `SecurityUser` change must be deployed in the same commit. A window where `SecurityUser.isEnabled()` is fixed but `DisabledException` has no handler produces 401 `"Invalid Credentials"` responses for disabled accounts — the status code is correct but the message is indistinguishable from a wrong-password rejection; the frontend cannot show `"Account pending activation"` vs `"Wrong password"`. Step ordering in this task: GlobalExceptionHandler first, SecurityUser second, SecurityConfig third, tests fourth (within the same implementation session). <!-- REVIEW-FIX: corrected "500" to "401 Invalid Credentials via ExceptionTranslationFilter" -->

**TDD approach:** Vertical-slice RED → GREEN. Write the discriminating RED test, verify it fails for the right reason, make the production change, verify GREEN. Repeat for the second RED test.

### Files to Create/Modify

- [x] `backend/src/main/java/com/agentForgeBackend/exceptions/GlobalExceptionHandler.java` — add `DisabledException` handler (one import, one method)
- [x] `backend/src/main/java/com/agentForgeBackend/shared/securityUser/SecurityUser.java` — rename 4 `get*()` methods to `is*()` and add `@Override`
- [x] `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java` — add `/register` permitAll rule after `/login` rule
- [x] New: `backend/src/test/java/com/agentForgeBackend/configuration/security/EmployeeAccountStatusSecurityTest.java` — 3 integration tests

---

## Step-by-Step Implementation

### Step 1: Add `DisabledException` handler to `GlobalExceptionHandler`

**Goal:** Ensure that when `SecurityUser.isEnabled()` (fixed in Step 2) causes Spring Security to throw `DisabledException`, the response is 401 `"Account pending admin activation."` — not the generic 401 `"Invalid Credentials"` that `authenticationEntryPoint` would return if the exception were caught only by `ExceptionTranslationFilter`. <!-- REVIEW-FIX: corrected "500 fallback" to "401 Invalid Credentials via authenticationEntryPoint" -->

**Dependencies:** None. This change is safe before the `SecurityUser` fix lands.

**Why this step is first:** The handler must exist before `isEnabled()` is fixed. Both are part of the same commit, but the handler change is written first so it is visible when the SecurityUser fix is reviewed.

- [x] Add import `org.springframework.security.authentication.DisabledException` to `GlobalExceptionHandler.java`
- [x] Add `@ExceptionHandler(DisabledException.class)` method returning HTTP 401 with `error = "Unauthorized"` and `message = "Account pending admin activation."`

#### Implementation

```java
// File: backend/src/main/java/com/agentForgeBackend/exceptions/GlobalExceptionHandler.java
// Add this import after the existing BadCredentialsException import:
import org.springframework.security.authentication.DisabledException;

// Add this handler method after the existing handleBadCredentialsException method:
@ExceptionHandler(DisabledException.class)
public ResponseEntity<Object> handleDisabledException(
        DisabledException ex, WebRequest request) {

    ErrorHTTPRes errorRes = ErrorHTTPRes.builder()
            .timestamp(LocalDateTime.now().toString())
            .status(HttpStatus.UNAUTHORIZED.value())
            .error("Unauthorized")
            .message("Account pending admin activation.")
            .path(request.getDescription(false).replace("uri=", ""))
            .build();
    return new ResponseEntity<>(errorRes, HttpStatus.UNAUTHORIZED);
}
```

**Message is hardcoded, not from `ex.getMessage()`:** `DisabledException` is always thrown with the same Spring Security message; the feature specifies the exact string the client must see ("Account pending admin activation.") for frontend discrimination. Using `ex.getMessage()` would expose a Spring-internal string.

#### Edge Cases

1. **`BadCredentialsException` vs `DisabledException` ordering in handler dispatch:** Spring's `@ControllerAdvice` dispatches based on exception type specificity. Both are independent exception types with no inheritance relationship that matters here — there is no ambiguity.
2. **`DisabledException` thrown outside of `POST /login`:** No other endpoint can throw `DisabledException` in the current codebase — only `AuthenticationManager.authenticate()` in `SecurityController` triggers it. If a future endpoint calls `authenticate()` directly, this handler will correctly return 401 for it.

---

### Step 2: Fix `SecurityUser` — rename four `get*()` methods to `is*()`

**Goal:** Spring Security calls `isEnabled()`, `isAccountNonExpired()`, `isAccountNonLocked()`, and `isCredentialsNonExpired()` via the `UserDetails` interface contract. The current `get*()` names mean the correct values are never read — Spring Security's `default` implementations (all returning `true`) are used instead.

**Dependencies:** Step 1 (DisabledException handler) must be in place before this change is deployed.

- [x] Rename `getEnabled()` → `isEnabled()` and add `@Override`
- [x] Rename `getAccountNonExpired()` → `isAccountNonExpired()` and add `@Override`
- [x] Rename `getAccountNonLocked()` → `isAccountNonLocked()` and add `@Override`
- [x] Rename `getCredentialsNonExpired()` → `isCredentialsNonExpired()` and add `@Override`
- [x] Verify that `getBaseUser()` is **not** renamed (it is not a `UserDetails` method; it is a domain accessor used by `SecurityController.login()` at line 47)

#### Implementation

```java
// File: backend/src/main/java/com/agentForgeBackend/shared/securityUser/SecurityUser.java
// Replace the four get*() methods with the corrected is*() overrides:

@Override
public boolean isAccountNonExpired() {
    return baseUser.isAccountNonExpired();
}

@Override
public boolean isAccountNonLocked() {
    return baseUser.isAccountNonLocked();
}

@Override
public boolean isCredentialsNonExpired() {
    return baseUser.isCredentialsNonExpired();
}

@Override
public boolean isEnabled() {
    return baseUser.isEnabled();
}

// Keep this method unchanged — it is a domain accessor, not a UserDetails method:
public BaseUserEntity getBaseUser() {
    return baseUser;
}
```

The complete corrected file:

```java
package com.agentForgeBackend.shared.securityUser;

import com.agentForgeBackend.shared.models.baseUser.BaseUserEntity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.stream.Collectors;

public class SecurityUser implements UserDetails {

    private final BaseUserEntity baseUser;

    public SecurityUser(BaseUserEntity baseUser) {
        this.baseUser = baseUser;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return baseUser.getRoles().stream()
                .map(role -> new SimpleGrantedAuthority(role.getAuthority()))
                .collect(Collectors.toList());
    }

    @Override
    public String getPassword() {
        return baseUser.getPassword();
    }

    @Override
    public String getUsername() {
        return baseUser.getUsername();
    }

    @Override
    public boolean isAccountNonExpired() {
        return baseUser.isAccountNonExpired();
    }

    @Override
    public boolean isAccountNonLocked() {
        return baseUser.isAccountNonLocked();
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return baseUser.isCredentialsNonExpired();
    }

    @Override
    public boolean isEnabled() {
        return baseUser.isEnabled();
    }

    public BaseUserEntity getBaseUser() {
        return baseUser;
    }
}
```

#### Edge Cases

1. **`getBaseUser()` callers:** `SecurityController.login()` at line 47 calls `securityUser.getBaseUser()`. This method is not renamed — only the four `UserDetails` override methods change.
2. **Admin and Client login paths:** Both `AdminEntity` and `ClientEntity` extend `BaseUserEntity`. Their `enabled` fields are set to `true` at creation time (`AdminBootstrap`, `TestAuthenticationHelper`). The fix has no observable impact on existing active accounts.
3. **`getPassword()` and `getUsername()` already have `@Override`:** These were already correct. No change.

---

### Step 3: Add `/register` permitAll rule to `SecurityConfig`

**Goal:** Allow unauthenticated requests to reach `/register` (and `/register/`) without a JWT. The `RegistrationController` created in Task 4 handles the business logic; this rule opens the HTTP gate.

**Dependencies:** None — safe to add before `RegistrationController` exists. An unmapped path that passes security returns 404, which is the expected behavior in Task 1 tests.

- [x] Add `.requestMatchers("/register", "/register/").permitAll()` after the `/login` line and before the `/employee/**` line in `SecurityConfig.securityFilterChain()`

#### Implementation

```java
// File: backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java
// In securityFilterChain(), modify the authorizeHttpRequests block:

.authorizeHttpRequests(authorize -> authorize
    .dispatcherTypeMatchers(DispatcherType.FORWARD, DispatcherType.ERROR).permitAll()
    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
    .requestMatchers("/login", "/login/").permitAll()
    .requestMatchers("/register", "/register/").permitAll()   // NEW — Task 1
    .requestMatchers("/employee/**").hasRole("ADMIN")
    .requestMatchers("/admin/**").hasRole("ADMIN")
    .requestMatchers("/client/**").authenticated()
    .requestMatchers("/agent/**").hasRole("EMPLOYEE")
    .requestMatchers("/conversation/**").hasRole("EMPLOYEE")
    .requestMatchers("/ws/**").permitAll()  // WebSocket auth handled by JwtHandshakeInterceptor
    .anyRequest().authenticated()
)
```

#### Edge Cases

1. **Rule ordering:** `/register` does not match `/employee/**`, so the relative order between the two rules does not matter for security. Placing `/register` immediately after `/login` groups all public-access endpoints together for readability.
2. **Trailing slash variant `/register/`:** Included as a defensive measure, matching the `/login/` pattern already in the file.
3. **`/register/**` vs `/register`:** Only `/register` and `/register/` are permitAll — not sub-paths. This prevents inadvertent exposure if future sub-paths are added to `RegistrationController`.
4. **Impact on existing `SecurityAuthorizationTest`:** The new rule does not affect any path tested by `SecurityAuthorizationTest`. Anonymous requests to `/admin/**`, `/employee/**`, `/agent/**`, `/conversation/**`, and `/test` are unchanged.

---

### Step 4: Write integration tests in `EmployeeAccountStatusSecurityTest`

**Goal:** Prove the three production changes with discriminating tests. Two are discriminating RED tests (they fail before the fix, pass after). The third proves the SecurityConfig rule.

**Dependencies:** Steps 1, 2, and 3 complete.

**TDD cycle:**

1. Write test 1 → verify it is RED (currently returns 200) → implement Steps 1+2 → verify GREEN.
2. Write test 2 → verify GREEN immediately (active login was never broken).
3. Write test 3 → verify it is RED (currently returns 401) → implement Step 3 → verify GREEN.

- [x] Create `backend/src/test/java/com/agentForgeBackend/configuration/security/EmployeeAccountStatusSecurityTest.java`
- [x] `@BeforeEach` follows the established FK-safe delete order: `messageRepository → conversationRepository → agentRepository → employeeRepository → clientRepository → adminRepository`
- [x] Seed one disabled employee (simulates self-registered pending activation) and one active employee
- [x] Test 1 (discriminating RED): disabled login → 401 + `"Account pending admin activation."`
- [x] Test 2 (regression guard): active login → 200 + non-empty token
- [x] Test 3 (discriminating for SecurityConfig rule): anonymous GET `/register` → 404 (not 401)

#### Implementation

```java
package com.agentForgeBackend.configuration.security;

import com.agentForgeBackend.models.agent.AgentRepository;
import com.agentForgeBackend.models.conversation.ConversationRepository;
import com.agentForgeBackend.models.hq.admin.AdminRepository;
import com.agentForgeBackend.models.hq.client.ClientRepository;
import com.agentForgeBackend.models.hq.employee.EmployeeEntity;
import com.agentForgeBackend.models.hq.employee.EmployeeRepository;
import com.agentForgeBackend.models.message.MessageRepository;
import com.agentForgeBackend.shared.models.baseUser.UserRoles;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class EmployeeAccountStatusSecurityTest {

    private static final String DISABLED_EMAIL = "disabled-employee@test.com";
    private static final String ACTIVE_EMAIL = "active-employee@test.com";
    private static final String RAW_PASSWORD = "testPassword123";

    @Autowired private MockMvc mockMvc;
    @Autowired private EmployeeRepository employeeRepository;
    @Autowired private AdminRepository adminRepository;
    @Autowired private ClientRepository clientRepository;
    @Autowired private AgentRepository agentRepository;
    @Autowired private ConversationRepository conversationRepository;
    @Autowired private MessageRepository messageRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        // FK-safe delete order required by known-issues.md:
        // message (no cascade on llm_model_id FK) → conversation → agent → employee → client → admin
        messageRepository.deleteAll();
        messageRepository.flush();
        conversationRepository.deleteAll();
        conversationRepository.flush();
        agentRepository.deleteAll();
        agentRepository.flush();
        employeeRepository.deleteAll();
        employeeRepository.flush();
        clientRepository.deleteAll();
        clientRepository.flush();
        adminRepository.deleteAll();
        adminRepository.flush();

        EmployeeEntity disabled = new EmployeeEntity();
        disabled.setEmail(DISABLED_EMAIL);
        disabled.setUsername(DISABLED_EMAIL);
        disabled.setPassword(passwordEncoder.encode(RAW_PASSWORD));
        disabled.setRoles(Set.of(UserRoles.EMPLOYEE));
        disabled.setEnabled(false);
        disabled.setAccountNonExpired(true);
        disabled.setAccountNonLocked(true);
        disabled.setCredentialsNonExpired(true);
        employeeRepository.saveAndFlush(disabled);

        EmployeeEntity active = new EmployeeEntity();
        active.setEmail(ACTIVE_EMAIL);
        active.setUsername(ACTIVE_EMAIL);
        active.setPassword(passwordEncoder.encode(RAW_PASSWORD));
        active.setRoles(Set.of(UserRoles.EMPLOYEE));
        active.setEnabled(true);
        active.setAccountNonExpired(true);
        active.setAccountNonLocked(true);
        active.setCredentialsNonExpired(true);
        employeeRepository.saveAndFlush(active);
    }

    /**
     * Discriminating RED test.
     * BEFORE SecurityUser fix: returns 200 — isEnabled() defaults to true, Spring Security does not check enabled.
     * AFTER SecurityUser fix + DisabledException handler: returns 401 with the pending-activation message.
     */
    @Test
    void disabledEmployeeLoginReturns401WithPendingActivationMessage() throws Exception {
        mockMvc.perform(post("/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "username": "%s", "password": "%s" }
                                """.formatted(DISABLED_EMAIL, RAW_PASSWORD)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Unauthorized"))
                .andExpect(jsonPath("$.message").value("Account pending admin activation."));
    }

    /**
     * Regression guard: active employees must still be able to log in after the SecurityUser fix.
     */
    @Test
    void activeEmployeeLoginReturns200() throws Exception {
        mockMvc.perform(post("/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "username": "%s", "password": "%s" }
                                """.formatted(ACTIVE_EMAIL, RAW_PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());
    }

    /**
     * Discriminating test for the SecurityConfig permitAll rule.
     * BEFORE the rule: anonymous GET /register hits anyRequest().authenticated() → 401.
     * AFTER the rule:  security passes the request; Spring MVC finds no handler → 404.
     * 404 proves security let the request through. The response becomes 405 in Task 4
     * once RegistrationController is registered with @PostMapping only.
     */
    @Test
    void anonymousGetRegisterIsNotBlockedBySecurity() throws Exception {
        mockMvc.perform(get("/register"))
                .andExpect(status().isNotFound());
    }
}
```

#### Edge Cases

1. **`firstName` and `lastName` not set on test entities:** `BaseUserEntity` has `@Size(min=2,max=100)` on these fields but they are nullable columns. Not setting them is intentional — the test focuses on `enabled` state, not registration-form validation.
2. **Test 1 (`disabledEmployeeLoginReturns401...`) as a RED test:** Before implementing Steps 1 and 2, the test returns 200 instead of 401. Running the suite in RED state is part of the TDD cycle; confirm the failure message shows `expected: 401, was: 200` before making production changes.
3. **Test 3 (`anonymousGetRegisterIsNotBlockedBySecurity`) as a RED test:** Before implementing Step 3, the test returns 401 instead of 404. Confirm failure before adding the SecurityConfig rule.
4. **Alphabetical test ordering:** `EmployeeAccountStatusSecurityTest` sorts after `EmployeeControllerListEndpointTest` and before `EmployeeLoginJwtTest`. Both neighboring tests do FK-safe cleanup in `@BeforeEach`, so no leftover state bleeds between classes.

---

## Design Decisions

**Decision 1: `DisabledException` maps to HTTP 401, not 403**
- **Why:** 401 (Unauthorized) means authentication failed — the system cannot establish who you are. 403 (Forbidden) means authentication succeeded but access is denied. A disabled account fails the Spring Security pre-auth check before authentication completes. The login contract should return 401 to indicate the credentials could not be used to establish a session. The feature document explicitly specifies 401 and the message "Account pending admin activation."
- **Alternatives considered:** HTTP 403 (rejected — authentication did not complete; using 403 would imply the user's identity was established, which is incorrect for a disabled account in the pre-auth check stage).

**Decision 2: `DisabledException` handler message is hardcoded, not from `ex.getMessage()`**
- **Why:** `DisabledException` is always thrown by Spring Security's `DefaultPreAuthenticationChecks` with an internal message ("User is disabled"). The client-facing message is a product decision ("Account pending admin activation.") defined by the feature. Using `ex.getMessage()` would expose a Spring-internal string and break if Spring Security changes its message in a future version.
- **Alternatives considered:** Using `ex.getMessage()` (rejected — couples the frontend's UX string to an internal Spring Security detail that is not part of the public contract).

**Decision 3: Test class placed in `configuration/security/`, not `models/hq/employee/`**
- **Why:** The tests verify Spring Security authentication behavior (account status enforcement during login, HTTP security rule enforcement). This is the same concern as `SecurityAuthorizationTest`, which lives in `configuration/security/`. The employee domain is an actor in the test (the test seeds `EmployeeEntity` objects), but it is not what the tests are verifying. `EmployeeLoginJwtTest` in `models/hq/employee/` tests employee-specific login workflow (JWT content, roles, token claims) — a different concern.
- **Alternatives considered:** Adding tests to `SecurityAuthorizationTest` directly (rejected — `SecurityAuthorizationTest` tests role-based access control for HTTP paths, not account-state enforcement during login; mixing concerns makes future changes harder to scope).

**Decision 4: `GET /register` → 404 (not 405) as the discriminating test in Task 1**
- **Why:** `RegistrationController` does not exist in Task 1. Without a controller, Spring MVC returns 404 for any method to `/register`. A 404 (vs the pre-rule 401) is sufficient proof that the `permitAll` rule is active. The 405 response (correct method not allowed) will be verified in Task 4 when `RegistrationController` is created with only `@PostMapping`.
- **Alternatives considered:** Not testing the SecurityConfig rule in Task 1 (rejected — the rule is added in Task 1, so the test coverage must verify it in Task 1 rather than deferring to Task 4 after controller creation).

**Decision 5: Steps 1 and 2 must be in the same commit**
- **Why:** If `SecurityUser.isEnabled()` is fixed without the `DisabledException` handler, a disabled account attempting login throws `DisabledException`. No `HandlerExceptionResolver` handles it; Spring MVC rethrows it up the filter chain. `ExceptionTranslationFilter` catches it as an `AuthenticationException` and calls `authenticationEntryPoint.commence()` — returning 401 with message `"Invalid Credentials"`. The HTTP status is correct but the message is indistinguishable from a wrong-password error. The frontend cannot show `"Account pending activation"` vs `"Wrong password"` to the user. Both changes must land together to close this UX gap atomically. <!-- REVIEW-FIX: replaced "500 crash" reasoning with correct "401 Invalid Credentials via ExceptionTranslationFilter" reasoning; atomic deployment is still required, just for a UX-correctness reason rather than a crash reason -->
- **Alternatives considered:** Implementing the handler first in one commit and the SecurityUser fix in the next (rejected — even a short window between commits exposes the ambiguous 401 `"Invalid Credentials"` response in the test suite if tests run between the two commits).

---

## Testing Considerations

### Automatic Validation

TDD cycle order:

**Cycle 1 — Discriminating RED for SecurityUser fix:**
- [x] Write `disabledEmployeeLoginReturns401WithPendingActivationMessage` in `EmployeeAccountStatusSecurityTest`
- [ ] Run `./mvnw -pl backend test -Dtest=EmployeeAccountStatusSecurityTest#disabledEmployeeLoginReturns401WithPendingActivationMessage` → confirm RED (currently returns 200 — Spring Security defaults `isEnabled()` to `true`) **⚠ Manual: Java 21 runtime required**
- [x] Implement Step 1 (GlobalExceptionHandler `DisabledException` handler) and Step 2 (SecurityUser method rename) in the **same change** — implementing only Step 2 without Step 1 would produce 401 `"Invalid Credentials"` (via `ExceptionTranslationFilter`), which still fails this test because the message would be wrong
- [ ] Run same test → confirm GREEN (returns 401 with `"Account pending admin activation."` message) **⚠ Manual: Java 21 runtime required**

**Cycle 2 — Regression guard for active login:**
- [x] Write `activeEmployeeLoginReturns200` in `EmployeeAccountStatusSecurityTest`
- [ ] Run `./mvnw -pl backend test -Dtest=EmployeeAccountStatusSecurityTest#activeEmployeeLoginReturns200` → confirm GREEN immediately (no regression) **⚠ Manual: Java 21 runtime required**

**Cycle 3 — Discriminating RED for SecurityConfig rule:**
- [x] Write `anonymousGetRegisterIsNotBlockedBySecurity` in `EmployeeAccountStatusSecurityTest`
- [ ] Run `./mvnw -pl backend test -Dtest=EmployeeAccountStatusSecurityTest#anonymousGetRegisterIsNotBlockedBySecurity` → confirm RED (returns 401, not 404) **⚠ Manual: Java 21 runtime required**
- [x] Implement Step 3 (SecurityConfig `/register` rule)
- [ ] Run same test → confirm GREEN (returns 404) **⚠ Manual: Java 21 runtime required**

**Full suite verification:**
- [ ] Run `./mvnw -pl backend test` → confirm all existing tests still pass, new test count increases by 3 **⚠ Manual: Java 21 runtime required**
- [ ] Confirm `SecurityAuthorizationTest` (all existing tests) still passes — the new `/register` rule must not weaken any existing rule **⚠ Manual: Java 21 runtime required**
- [ ] Confirm `EmployeeLoginJwtTest` (all existing tests) still passes — the active employee login regression guard must remain green **⚠ Manual: Java 21 runtime required**

### Manual Validation

No manual validation is required for this task. All behaviors are verifiable through the automated test suite with `MockMvc`.

---

## Related Code Explanations

- `backend/src/main/java/com/agentForgeBackend/shared/securityUser/SecurityUser.java` — adapter bridging `BaseUserEntity` to Spring Security's `UserDetails` port; the bug is in this file
- `backend/src/main/java/com/agentForgeBackend/exceptions/GlobalExceptionHandler.java` — all exception-to-HTTP mappings; `DisabledException` handler is added here
- `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java:58` — `securityFilterChain()` where HTTP authorization rules are defined in evaluation order
- `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityController.java:43` — `authenticationManager.authenticate()` — the call site that throws `DisabledException` at runtime for disabled accounts
- `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeLoginJwtTest.java` — prior art for FK-safe `@BeforeEach`, `PasswordEncoder`-encoded credentials, and `POST /login` via `MockMvc`

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected for this task
- [x] Up-to-date documentation reviewed for the affected technologies
- [x] `GlobalExceptionHandler` has `@ExceptionHandler(DisabledException.class)` returning HTTP 401 with message `"Account pending admin activation."`
- [x] `SecurityUser` has `@Override isEnabled()`, `@Override isAccountNonExpired()`, `@Override isAccountNonLocked()`, `@Override isCredentialsNonExpired()` — no `get*()` variants remain
- [x] `SecurityConfig` has `.requestMatchers("/register", "/register/").permitAll()` after the `/login` rule and before `/employee/**`
- [x] `EmployeeAccountStatusSecurityTest` created with 3 tests: disabled login 401, active login 200, anonymous GET `/register` 404
- [ ] Discriminating RED test verified RED BEFORE production changes are applied **⚠ Manual: Java 21 runtime required. Test file was written before production changes; confirming the RED state (expected 401, was 200 for disabled login; expected 404, was 401 for anonymous /register) requires a Java 21 runtime.**
- [x] All implementation steps checked off
- [ ] `./mvnw -pl backend test` passes — test count increases by 3, no regressions in existing tests **⚠ Manual: Java 21 runtime required. Code review confirms all 4 changes match the Task document specification exactly and are consistent with existing project patterns.**
- [ ] `SecurityAuthorizationTest` all existing tests GREEN **⚠ Manual: Java 21 runtime required. The new `/register` rule is placed between `/login` and `/employee/**`, does not prefix-match any existing security rule path, and cannot weaken existing role-based rules.**
- [ ] `EmployeeLoginJwtTest` all existing tests GREEN **⚠ Manual: Java 21 runtime required. All existing test accounts have `enabled = true`; the SecurityUser fix has no observable impact on active accounts.**
- [x] Parent document `Features/to-do/Employee-Self-Registration-and-Admin-Activation` Task 1 step checkboxes marked complete and wiki link added

---

## Post-Review Notes

**Autonomous code review completed — 0 findings requiring code changes.** All 4 files match the Task document specification exactly and are consistent with existing project conventions:

1. **SecurityUser.java** — 4 methods renamed from `get*()` to `is*()` with `@Override`. The `@Override` annotation guarantees the methods correctly override `UserDetails` interface defaults (compiler enforces this). Lombok-generated `BaseUserEntity.is*()` getters are the delegate targets. `getBaseUser()` preserved for `SecurityController.login()` compatibility.

2. **GlobalExceptionHandler.java** — `DisabledException` handler added, mirroring the `BadCredentialsException` handler pattern. Returns HTTP 401 with hardcoded message `"Account pending admin activation."` per the feature specification (Decision 2: not from `ex.getMessage()` to avoid exposing Spring-internal strings).

3. **SecurityConfig.java** — `/register` rule added between `/login` and `/employee/**`. Rule ordering is correct: Spring Security evaluates top-to-bottom, `/register` does not prefix-match any existing rule, and it precedes `anyRequest().authenticated()`.

4. **EmployeeAccountStatusSecurityTest.java** — 3 integration tests with FK-safe `@BeforeEach` following the established `known-issues.md` delete order. Annotations match `@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test")` pattern from sibling test classes.

**Runtime validation deferred:** All test-run validations (discriminating RED, GREEN, full suite) require a Java 21 runtime, which is unavailable in the current execution environment. This is a documented project constraint (see `progress.md` entries for OpenRouter Chat Integration tasks). The TDD cycle self-verification (RED → GREEN) should be performed when a Java 21 runtime becomes available before marking this task complete.

**No deviations from Task document.** All implementation code matches the exact code blocks specified in the Task document. **⚠ Manual: Requires editing the parent Feature document.**
