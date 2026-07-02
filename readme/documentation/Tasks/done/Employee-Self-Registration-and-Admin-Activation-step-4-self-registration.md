# Task: Self-Registration — `RegistrationResponseDTO`, `EmployeeService.register()`, and `RegistrationController`

#task #current #medium-complexity #parent-employee-self-registration-and-admin-activation

**Parent:** [[Employee-Self-Registration-and-Admin-Activation]]
**Parent Type:** Feature
**Related Step(s):** Phase 4, Steps 4.1, 4.2, 4.3, 4.4
**Estimated Complexity:** Medium

---

## Goal

Create the public self-registration endpoint (`POST /register`) and its supporting types — `RegistrationResponseDTO`, `EmployeeService.register()`, and `RegistrationController` — so that unauthenticated employees can submit a registration form, receive a pending-activation confirmation, and be blocked from logging in until an admin activates them. Also update the security baseline test in `EmployeeAccountStatusSecurityTest` to reflect that the new controller is now registered.

---

## Parent Context

The parent feature (Employee Self-Registration and Admin Activation) adds a public onboarding path for employees who want to register without admin intervention. Key context from the parent:

- **`POST /register`** is `permitAll` in `SecurityConfig` (added in Task 1). It is a separate public endpoint from `/employee/**` (which is admin-only).
- **`EmployeeService.register(form)`** — no `@PreAuthorize`; security is enforced at the HTTP layer via the `permitAll` rule. `@Transactional`. Validates `username`/`email`/`password` non-blank → throws `InvalidInsertDetails`. Checks uniqueness via `baseUserRepository` → throws `ItemAlreadyExist`. Encodes password with `passwordEncoder`. Assigns `UserRoles.EMPLOYEE`. Sets `enabled = false` (pending admin activation — the key difference from `insert()`). Returns `RegistrationResponseDTO`.
- **`RegistrationResponseDTO`** — `@Data @AllArgsConstructor @NoArgsConstructor`, fields `String username`, `String email`, `String message`. Carries the registration confirmation back to the unauthenticated caller. Does NOT include a JWT — the account is pending and cannot log in yet.
- **`RegistrationController`** — thin HTTP adapter at `@RequestMapping("/register")`. Single `@PostMapping`. Does NOT extend `DefaultController` (single endpoint, no CRUD scaffold needed). Delegates entirely to `EmployeeService.register()`. Returns `ResponseEntity<RegistrationResponseDTO>` with HTTP 201 Created.
- **Package placement** — `models/hq/employee/`. `RegistrationController` creates `EmployeeEntity` records and delegates to `EmployeeService.register()`. It is a domain controller operating on the employee domain, not a security infrastructure controller. `SecurityController` (`configuration/security/`) handles credential exchange (`/login`); `RegistrationController` handles entity creation (`/register`). All entity-domain controllers in this codebase live under `models/hq/`; only authentication infrastructure lives in `configuration/security/`.
- **`DisabledException` handler** — already present in `GlobalExceptionHandler` (added in Task 1). When a disabled employee tries to log in after self-registering, Spring Security throws `DisabledException`, which the handler maps to 401 "Account pending admin activation."
- **`activate()` endpoint** — already present in `EmployeeController` (added in Task 3). The end-to-end test ("register → activate → login") exercises `PATCH /employee/{id}/activate` as part of the complete flow.
- **`EmployeeAccountStatusSecurityTest.anonymousGetRegisterIsNotBlockedBySecurity()`** — currently expects HTTP 404 because no controller handles `/register` yet. After `RegistrationController` is registered with `@PostMapping` only, `GET /register` correctly returns 405 Method Not Allowed. This test must be updated in Step 5 of this task.

**Task dependencies:** Task 1 (`SecurityUser.isEnabled()` fix + `DisabledException` handler + `/register` permitAll rule), Task 2 (`EmployeeDTO.enabled`), and Task 3 (`activate()` endpoint) must already be complete. All three are confirmed done. ✅

---

## Preconditions / Dependencies

- [[Employee-Self-Registration-and-Admin-Activation-step-1-security-foundation]] complete: `SecurityUser.isEnabled()` enforces the `enabled` flag at login; `GlobalExceptionHandler` maps `DisabledException` to 401 "Account pending admin activation."; `SecurityConfig` has `.requestMatchers("/register", "/register/").permitAll()`. ✅
- [[Employee-Self-Registration-and-Admin-Activation-step-2-dto-enabled-status]] complete: `EmployeeDTO` has `boolean enabled`; `EmployeeMapper.toDTO()` maps `entity.isEnabled()`. ✅
- [[Employee-Self-Registration-and-Admin-Activation-step-3-activate-deactivate]] complete: `EmployeeService.activate(Long id)` and `deactivate(Long id)` exist; `EmployeeController` has `PATCH /employee/{id}/activate` and `PATCH /employee/{id}/deactivate`. The end-to-end test in Step 4 exercises `activate()`. ✅
- `EmployeeService` already injects `baseUserRepository`, `passwordEncoder`, and `mapper` — no new dependencies needed for `register()`. ✅
- `BaseUserEntity.enabled` defaults to `true` at field declaration (`private boolean enabled = true`). `mapper.toEntity(form)` does NOT set `enabled`. `register()` MUST explicitly call `toSave.setEnabled(false)` after entity construction. ✅ (critical — documented in Edge Cases)
- `TestAuthenticationHelper.initializeMockUsers()` creates an `AdminEntity` and generates a JWT — used in end-to-end test 10 to obtain the admin JWT for `PATCH /employee/{id}/activate`. ✅
- FK-safe cleanup order for tests: `messageRepository → conversationRepository → agentRepository → employeeRepository → clientRepository → adminRepository` (established in `known-issues.md`). ✅

---

## Skills and Documentation Preparation

### Skills Reviewed

- `memory-bank` — Selected — loaded all 7 files; confirmed test patterns (`EmployeeAccountStatusSecurityTest`, `SecurityAuthorizationTest`, `TestAuthenticationHelper`), FK-safe cleanup order, Spring Boot 3.4.1 / Spring Security 6.x versions, and current codebase state after Tasks 1–3.
- `solid-deep-design` — Selected — applied to assess whether `register()` deepens `EmployeeService` and whether `RegistrationController` is appropriately thin.
- `tdd` — Selected — vertical-slice TDD: create `RegistrationResponseDTO` first (no test), write RED controller tests, implement `register()` service method, create `RegistrationController`, verify GREEN.
- `glossary-management` — Selected — reviewed glossary categories. No new domain terms introduced. "Registration," "activation," and "pending" are used consistently with the parent feature document.
- `find-docs` — Not needed — no new library APIs. All Spring MVC, Spring Security, and JPA patterns used are already established in the codebase (`@PostMapping`, `@RequestBody`, `ResponseEntity.status()`, `@Transactional`).

### Documentation Reviewed

- **Spring `@PostMapping` and `@RequestBody`**: `@PostMapping` with no path argument on `@RequestMapping("/register")` maps `POST /register`. `@RequestBody EmployeeForm form` deserializes the JSON body via Jackson. Fields not present in the JSON body are set to `null` — `isBlank(null)` catches these in the service validation.
- **`ResponseEntity.status(HttpStatus.CREATED).body(dto)`**: The Spring MVC idiom for HTTP 201 with a body. Used over `ResponseEntity.ok()` to communicate resource creation. Consistent with the semantic: registration creates a new employee record.
- **Checked exceptions in Spring MVC controllers**: `InvalidInsertDetails` and `ItemAlreadyExist` are checked exceptions. Declared in the controller method's `throws` clause and propagated to `GlobalExceptionHandler`. This pattern is already established in `EmployeeController.activate()` which declares `throws ItemNotFoundException`.

---

## Related Existing Code

- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeService.java:75` — `insert()` is the direct prior art for `register()`. Validation, uniqueness checks, password encoding, and role assignment are identical. The single difference: `insert()` sets `enabled = true`; `register()` sets `enabled = false`.
- `backend/src/main/java/com/agentForgeBackend/shared/models/baseUser/BaseUserEntity.java` — `private boolean enabled = true` at field declaration. This default is why `register()` must explicitly call `setEnabled(false)`. Without the explicit call, all self-registered employees are created as enabled.
- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeController.java` — prior art for thin HTTP adapter pattern. `RegistrationController` is even thinner — no inheritance, single method.
- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeForm.java` — reused as the input form for registration. `firstName` and `lastName` are optional (nullable in `BaseUserEntity`). `username`, `email`, `password` are required and validated in `register()`.
- `backend/src/main/java/com/agentForgeBackend/exceptions/GlobalExceptionHandler.java` — handles `InvalidInsertDetails` (400 "Invalid Details"), `ItemAlreadyExist` (409 "Conflict"), and `DisabledException` (401 "Account pending admin activation."). No changes needed.
- `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java` — `.requestMatchers("/register", "/register/").permitAll()` already present. No changes needed.
- `backend/src/test/java/com/agentForgeBackend/configuration/security/EmployeeAccountStatusSecurityTest.java:125` — `anonymousGetRegisterIsNotBlockedBySecurity()` currently expects `isNotFound()`. Must be updated to `isMethodNotAllowed()` in Step 5.
- `backend/src/test/java/com/agentForgeBackend/testUtils/TestAuthenticationHelper.java` — `initializeMockUsers()` creates admin + client entities in the DB and generates JWTs. `cleanUp()` clears cached token/entity state (does not touch the DB — that is handled by `setUp()` repository deleteAll calls).
- `backend/src/test/java/com/agentForgeBackend/configuration/security/EmployeeAccountStatusSecurityTest.java` — prior art for `@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test")` without class-level `@WithMockUser`; shows FK-safe cleanup, direct entity construction for disabled/enabled states, and `POST /login` assertions.

---

## Implementation Details

### Approach

**SOLID + Deep Design assessment:**

**`EmployeeService.register()`** — Deletion test: if `register()` did not exist in `EmployeeService`, the same validation logic (uniqueness checks, password encoding, role assignment, `enabled = false`) would scatter into `RegistrationController` or duplicate from `insert()`. Both outcomes are worse than concentrating it in the service. SRP check: the module's single responsibility is employee lifecycle management — registration is the public-path sub-case of employee creation. Adding `register()` deepens the module further; it does not introduce a second reason to change. The interface grows by one method; the implementation hides 6 steps (null check, field validation, username uniqueness, email uniqueness, entity construction with disabled state, persistence).

**`RegistrationController`** — Thin HTTP adapter. Its sole responsibility is translating `POST /register` → `employeeService.register(form)` → HTTP 201. Deletion test: if `RegistrationController` did not exist, the complexity (validation, persistence) would not scatter — it lives in the service. This confirms the controller is a thin adapter: it contributes routing, not behavior.

**Why `RegistrationController` does NOT extend `DefaultController`:** `DefaultController` provides 6 HTTP methods. `RegistrationController` needs exactly 1 (POST). Extending `DefaultController` would expose 5 unanticipated endpoints at `/register/**`. Single-endpoint controllers are the established exception in this codebase (`SecurityController` in `configuration/security/` also does not extend `DefaultController`).

**Why no `@PreAuthorize` on `register()`:** Security is enforced at the HTTP layer (`permitAll` in `SecurityConfig`). `@PreAuthorize` on a `permitAll` endpoint would make the service method callable only by authenticated callers — the opposite of the intent.

**TDD vertical-slice order:**
1. `RegistrationResponseDTO` (Step 1, no test — pure data carrier)
2. Write RED tests in `RegistrationControllerTest` (Step 2, fail with HTTP 404)
3. Implement `EmployeeService.register()` (Step 3, tests still 404 — service exists but controller doesn't)
4. Create `RegistrationController` (Step 4, all tests turn GREEN)
5. Update `EmployeeAccountStatusSecurityTest` (Step 5, one-line change)

### Files to Create/Modify

- [x] `backend/src/main/java/com/agentForgeBackend/models/hq/employee/RegistrationResponseDTO.java` — **new** DTO for registration confirmation
- [x] `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeService.java` — add `register(EmployeeForm form)` method
- [x] `backend/src/main/java/com/agentForgeBackend/models/hq/employee/RegistrationController.java` — **new** thin HTTP adapter at `/register`
- [x] `backend/src/test/java/com/agentForgeBackend/models/hq/employee/RegistrationControllerTest.java` — **new** integration test class (10 tests)
- [x] `backend/src/test/java/com/agentForgeBackend/configuration/security/EmployeeAccountStatusSecurityTest.java` — update `anonymousGetRegisterIsNotBlockedBySecurity()` from `isNotFound()` to `isMethodNotAllowed()`

---

## Step-by-Step Implementation

### Step 1: Create `RegistrationResponseDTO`

**Goal:** Provide the return type needed by `register()` before writing tests. No test needed — pure data carrier.

**Dependencies:** None.

- [x] Create `RegistrationResponseDTO.java` in `backend/src/main/java/com/agentForgeBackend/models/hq/employee/`

#### Implementation

```java
package com.agentForgeBackend.models.hq.employee;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RegistrationResponseDTO {

    private String username;

    private String email;

    private String message;
}
```

**Why `@Data @AllArgsConstructor @NoArgsConstructor` (no `@Builder`):** `@AllArgsConstructor` allows `new RegistrationResponseDTO(username, email, message)` in the service — readable with only 3 fields. `@Builder` is reserved for DTOs with ≥5 fields or optional fields (see `EmployeeDTO`, `EmployeeListDTO`). `@NoArgsConstructor` satisfies Jackson deserialization conventions even though this DTO is only serialized outbound.

#### Edge Cases

1. **No `roles` field:** `RegistrationResponseDTO` intentionally omits `roles`. Exposing `ROLE_EMPLOYEE` to an anonymous self-registering caller is unnecessary information disclosure. The caller only needs confirmation of what they submitted (`username`, `email`) plus a human-readable `message`.
2. **Null fields in the response:** `register()` validates `username` and `email` non-blank before saving, so `saved.getUsername()` and `saved.getEmail()` are guaranteed non-null in the DTO constructor. No null-safety handling needed.

---

### Step 2: Write RED Tests in `RegistrationControllerTest`

**Goal:** Establish 10 tests before the controller exists. Tests 1–8 fail with HTTP 404 (no `RegistrationController` registered). Tests 9–10 also fail at the `POST /register` step (404). All 10 tests compile because all referenced Java types (repository beans, `EmployeeEntity`, `TestAuthenticationHelper`) are on the classpath — the tests do not reference `RegistrationResponseDTO` or `register()` as Java types anywhere; only JSON path strings and HTTP calls are used.<!-- REVIEW-FIX: corrected compilation dependency — tests compile independently of RegistrationResponseDTO; RegistrationResponseDTO is a Step 4 (controller) dependency, not Step 2 -->

**Dependencies:** None — all referenced Java types are already on the classpath. (`RegistrationResponseDTO` is not referenced as a Java type in the test file; it is a compilation dependency for `RegistrationController` in Step 4.)

- [x] Create `RegistrationControllerTest.java` in `backend/src/test/java/com/agentForgeBackend/models/hq/employee/`

**RED state for discriminating tests:**
- `validRegistration_returns201WithUsernameEmailAndMessage` — currently 404 (no controller) → GREEN after Step 4
- `validRegistration_savesEmployeeWithEnabledFalse` — currently fails at `status().isCreated()` (404, never reaches the DB assertion); once Steps 3 + 4 are applied, this becomes the **key discriminating test for `setEnabled(false)`** — if the call is accidentally omitted from `register()`, the HTTP 201 passes but `assertThat(saved.isEnabled()).isFalse()` catches the regression<!-- REVIEW-FIX: added as discriminating RED test for setEnabled(false) — omission left the primary security property without an explicit RED-state callout -->
- `selfRegisteredEmployee_cannotLoginBeforeActivation_returns401` — currently 404 at `POST /register` → GREEN after Steps 3 + 4

#### Implementation

```java
package com.agentForgeBackend.models.hq.employee;

import com.agentForgeBackend.models.agent.AgentRepository;
import com.agentForgeBackend.models.conversation.ConversationRepository;
import com.agentForgeBackend.models.hq.admin.AdminRepository;
import com.agentForgeBackend.models.hq.client.ClientRepository;
import com.agentForgeBackend.models.message.MessageRepository;
import com.agentForgeBackend.testUtils.TestAuthenticationHelper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RegistrationControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private EmployeeRepository employeeRepository;
    @Autowired private AgentRepository agentRepository;
    @Autowired private ConversationRepository conversationRepository;
    @Autowired private MessageRepository messageRepository;
    @Autowired private AdminRepository adminRepository;
    @Autowired private ClientRepository clientRepository;
    @Autowired private TestAuthenticationHelper authHelper;

    @BeforeEach
    void setUp() {
        // FK-safe delete order per known-issues.md:
        // message (llm_model_id has no cascade) → conversation → agent → employee → client → admin
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
        // Reset token cache from any previous end-to-end test that called initializeMockUsers()
        authHelper.cleanUp();
    }

    // --- basic registration tests ---

    @Test
    void validRegistration_returns201WithUsernameEmailAndMessage() throws Exception {
        mockMvc.perform(post("/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "username": "newEmployee", "email": "new@example.com", "password": "password123" }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value("newEmployee"))
                .andExpect(jsonPath("$.email").value("new@example.com"))
                .andExpect(jsonPath("$.message").value("Registration successful. Your account is pending admin activation."));
    }

    @Test
    void validRegistration_savesEmployeeWithEnabledFalse() throws Exception {
        mockMvc.perform(post("/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "username": "pendingEmployee", "email": "pending@example.com", "password": "password123" }
                                """))
                .andExpect(status().isCreated());

        EmployeeEntity saved = employeeRepository.findByUsername("pendingEmployee").orElseThrow();
        assertThat(saved.isEnabled()).isFalse();
    }

    @Test
    void registration_duplicateUsername_returns409() throws Exception {
        mockMvc.perform(post("/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "username": "takenUser", "email": "first@example.com", "password": "pass" }
                                """))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "username": "takenUser", "email": "second@example.com", "password": "pass" }
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("Conflict"));
    }

    @Test
    void registration_duplicateEmail_returns409() throws Exception {
        mockMvc.perform(post("/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "username": "firstUser", "email": "taken@example.com", "password": "pass" }
                                """))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "username": "secondUser", "email": "taken@example.com", "password": "pass" }
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("Conflict"));
    }

    @Test
    void registration_missingUsername_returns400() throws Exception {
        mockMvc.perform(post("/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "email": "nouser@example.com", "password": "pass" }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Invalid Details"));
    }

    @Test
    void registration_missingEmail_returns400() throws Exception {
        mockMvc.perform(post("/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "username": "noEmailUser", "password": "pass" }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Invalid Details"));
    }

    @Test
    void registration_missingPassword_returns400() throws Exception {
        mockMvc.perform(post("/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "username": "noPassUser", "email": "nopass@example.com" }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Invalid Details"));
    }

    @Test
    void registration_blankPassword_returns400() throws Exception {
        mockMvc.perform(post("/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "username": "blankPassUser", "email": "blankpass@example.com", "password": "" }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Invalid Details"));
    }

    // --- end-to-end flow tests ---

    @Test
    void selfRegisteredEmployee_cannotLoginBeforeActivation_returns401() throws Exception {
        // Register — creates employee with enabled=false
        mockMvc.perform(post("/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "username": "pendingLogin", "email": "pending-login@example.com", "password": "password123" }
                                """))
                .andExpect(status().isCreated());

        // Attempt login — Spring Security throws DisabledException → 401 with pending message
        mockMvc.perform(post("/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "username": "pendingLogin", "password": "password123" }
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Account pending admin activation."));
    }

    @Test
    void selfRegisteredEmployee_canLoginAfterAdminActivates_returns200() throws Exception {
        // Register a new employee — saved with enabled=false
        mockMvc.perform(post("/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "username": "activatedLogin", "email": "activated-login@example.com", "password": "password123" }
                                """))
                .andExpect(status().isCreated());

        // Retrieve the persisted employee ID
        Long id = employeeRepository.findByUsername("activatedLogin").orElseThrow().getId();

        // Seed admin user and obtain admin JWT
        authHelper.initializeMockUsers();

        // Admin activates the self-registered employee
        mockMvc.perform(patch("/employee/" + id + "/activate")
                        .header("Authorization", authHelper.getAdminToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(true));

        // Login now succeeds — real BCrypt + AuthenticationManager + SecurityUser.isEnabled() path
        mockMvc.perform(post("/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "username": "activatedLogin", "password": "password123" }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());
    }
}
```

#### Edge Cases

1. **No `@WithMockUser` at class level:** `RegistrationControllerTest` makes unauthenticated requests to `POST /register`. Any class-level `@WithMockUser` would inject a security context for all tests, breaking the "public endpoint" semantics and preventing the end-to-end login flow from testing the real authentication path.
2. **`authHelper.cleanUp()` in `setUp()`:** Resets cached token state between tests. Tests 1–8 do not call `initializeMockUsers()`, so `cleanUp()` is a no-op for those. Test 10 calls `initializeMockUsers()` — the next test's `setUp()` calls `cleanUp()` + `adminRepository.deleteAll()` to clear the created admin from the DB and reset the cache.
3. **`adminRepository` and `clientRepository` in `setUp()`:** `TestAuthenticationHelper.initializeMockUsers()` creates both admin AND client entities. Tests 9–10 call this method. The FK-safe cleanup in `setUp()` must delete these entities to maintain test isolation.
4. **`patch` import for end-to-end test 10:** `PATCH /employee/{id}/activate` in test 10 requires `import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch` — included in the import block above.
5. **`findByUsername()` for end-to-end test 10:** The employee ID is retrieved from the repository after `POST /register`. This is safe because MockMvc requests go through the full Spring transaction lifecycle — the employee is committed and visible to the next repository call.

---

### Step 3: Add `register(EmployeeForm form)` to `EmployeeService`

**Goal:** Implement the public registration logic. No new imports needed — `InvalidInsertDetails`, `ItemAlreadyExist`, `UserRoles`, `Set`, `@Transactional`, `mapper`, `passwordEncoder`, `baseUserRepository`, and `employeeRepository` are all already present in `EmployeeService.java`. `RegistrationResponseDTO` is in the same package — no import needed.

**Dependencies:** Step 2 (RED tests written).

- [x] Add `register(EmployeeForm form)` method to `EmployeeService` — after the existing `deactivate()` method and before the private `isBlank()` helper

#### Implementation

```java
// File: backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeService.java
// Add this method after the existing deactivate() method and before the private isBlank() helper:

@Transactional
public RegistrationResponseDTO register(EmployeeForm form) throws InvalidInsertDetails, ItemAlreadyExist {
    if (form == null || isBlank(form.getUsername()) || isBlank(form.getEmail()) || isBlank(form.getPassword())) {
        throw new InvalidInsertDetails("Registration requires username, email, and password");
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
    toSave.setEnabled(false);
    toSave.setAccountNonExpired(true);
    toSave.setAccountNonLocked(true);
    toSave.setCredentialsNonExpired(true);

    EmployeeEntity saved = employeeRepository.save(toSave);
    return new RegistrationResponseDTO(
            saved.getUsername(),
            saved.getEmail(),
            "Registration successful. Your account is pending admin activation."
    );
}
```

**The critical line is `toSave.setEnabled(false)`:** `BaseUserEntity.enabled` defaults to `true` at field declaration. `mapper.toEntity(form)` does NOT set `enabled`. Without this explicit call, self-registered employees are `enabled = true` and can log in immediately. The discriminating end-to-end test (`selfRegisteredEmployee_cannotLoginBeforeActivation_returns401`) will catch a regression here.

**`toSave.setPassword(passwordEncoder.encode(form.getPassword()))` overwrites the plaintext:** `mapper.toEntity(form)` copies `form.getPassword()` (plaintext) into the entity. The explicit `passwordEncoder.encode(...)` call that follows replaces it with the BCrypt hash before `save()`. This is identical to the `insert()` pattern.

**Plain `@Transactional` (no `rollbackFor`):** Validation and uniqueness checks occur BEFORE `save()`. If either throws, nothing has been mutated — there is nothing to roll back. Spring does NOT roll back on checked exceptions by default (only on `RuntimeException` and `Error`). `InvalidInsertDetails` and `ItemAlreadyExist` are checked exceptions — this behavior is correct.

#### Edge Cases

1. **`BaseUserEntity.enabled = true` default is the primary risk:** If `setEnabled(false)` is accidentally omitted (e.g., by a diff tool collision), self-registered employees are immediately active. The end-to-end test 9 catches this regression. The code reviewer should specifically confirm `setEnabled(false)` is present when reviewing this file.
2. **`form.getPassword()` vs null:** The null check at the top of `register()` (`isBlank(form.getPassword())`) returns `true` if password is null or blank. This check fires BEFORE `passwordEncoder.encode()` is called. No NullPointerException risk.
3. **`baseUserRepository.existsByUsername()` covers all user types:** The `base_user` table holds all Admin, Client, and Employee records. A self-registering employee cannot claim a username or email already used by an admin or client. Correct cross-type uniqueness enforcement.
4. **`accountNonExpired`, `accountNonLocked`, `credentialsNonExpired` set to `true`:** These default to `true` in `BaseUserEntity` but are set explicitly for consistency with `insert()` and to avoid silent breakage if `BaseUserEntity` defaults change in a future refactor.
5. **`saved.getUsername()` vs `form.getUsername()`:** `saved.getUsername()` is used in the DTO constructor because it reflects the authoritative persisted state. In practice, `mapper.toEntity(form)` copies `form.getUsername()` directly, so they are equal. Using `saved.*` is defensive.

---

### Step 4: Create `RegistrationController`

**Goal:** Expose `POST /register` as a public HTTP endpoint. Turns all 10 RED tests GREEN.

**Dependencies:** Step 1 (`RegistrationResponseDTO` must exist — referenced directly as the method return type and `ResponseEntity<>` generic parameter) and Step 3 (`register()` service method is callable).<!-- REVIEW-FIX: added Step 1 as an explicit direct dependency — RegistrationController references RegistrationResponseDTO as a Java type and will not compile without it -->

- [x] Create `RegistrationController.java` in `backend/src/main/java/com/agentForgeBackend/models/hq/employee/`

#### Implementation

```java
package com.agentForgeBackend.models.hq.employee;

import com.agentForgeBackend.exceptions.InvalidInsertDetails;
import com.agentForgeBackend.exceptions.ItemAlreadyExist;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/register")
public class RegistrationController {

    private final EmployeeService employeeService;

    public RegistrationController(EmployeeService employeeService) {
        this.employeeService = employeeService;
    }

    @PostMapping
    public ResponseEntity<RegistrationResponseDTO> register(@RequestBody EmployeeForm form)
            throws InvalidInsertDetails, ItemAlreadyExist {
        return ResponseEntity.status(HttpStatus.CREATED).body(employeeService.register(form));
    }
}
```

**`ResponseEntity.status(HttpStatus.CREATED).body(dto)`:** HTTP 201 with the DTO body. Distinct from `ResponseEntity.ok()` (200). Registration creates a new resource — 201 is semantically correct. No `Location` header is set because there is no `GET /register` or equivalent endpoint for the self-registered employee record (`GET /employee/{id}` is admin-only and returns `EmployeeDTO`, not `RegistrationResponseDTO`).

**`@PostMapping` with no path argument:** Maps exactly `POST /register`. No other HTTP methods are mapped. `GET /register` returns 405 Method Not Allowed — the updated security baseline test will verify this.

**Constructor injection, single constructor:** Spring resolves `EmployeeService` automatically for single-constructor injection — no `@Autowired` annotation needed.

**`throws InvalidInsertDetails, ItemAlreadyExist` in the method signature:** Both are checked exceptions handled by `GlobalExceptionHandler` (400 and 409 respectively). Declaring them in `throws` is explicit about propagation and consistent with the existing controller pattern.

#### Edge Cases

1. **`GET /register` after `RegistrationController` is registered:** Returns 405 Method Not Allowed because only `@PostMapping` is mapped. The `EmployeeAccountStatusSecurityTest` security baseline test must be updated from `isNotFound()` to `isMethodNotAllowed()` in Step 5.
2. **CORS and `POST /register`:** `SecurityConfig.corsConfigurationSource()` allows `POST` in `setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"))`. `POST /register` passes CORS preflight. No changes needed.
3. **Malformed JSON body:** Spring MVC throws `HttpMessageNotReadableException`, which `GlobalExceptionHandler` maps to 400 "Malformed Request". No special handling needed in the controller.
4. **`@RequestBody EmployeeForm form`:** Jackson sets fields missing from the JSON body to `null`. A null field triggers `isBlank(null)` → `InvalidInsertDetails` → 400.
5. **Path conflict check:** `@RequestMapping("/register")` + `@PostMapping` — path `/register` does not conflict with any existing rule in `SecurityConfig` or any other `@RequestMapping` in the codebase. The `permitAll` rule covers `/register` and `/register/` — both are mapped.

---

### Step 5: Update `EmployeeAccountStatusSecurityTest`

**Goal:** Correct the existing security baseline test to reflect that `RegistrationController` is registered and only handles `POST`. A `GET /register` request now correctly returns 405 Method Not Allowed (not 404).

**Dependencies:** Step 4 (`RegistrationController` is registered by Spring).

- [x] In `EmployeeAccountStatusSecurityTest.java`, change `.andExpect(status().isNotFound())` to `.andExpect(status().isMethodNotAllowed())` in the `anonymousGetRegisterIsNotBlockedBySecurity()` test

#### Implementation

```java
// File: backend/src/test/java/com/agentForgeBackend/configuration/security/EmployeeAccountStatusSecurityTest.java
// Modify the existing test — change one line only:

/**
 * Discriminating test for the SecurityConfig permitAll rule.
 * BEFORE the rule: anonymous GET /register hits anyRequest().authenticated() → 401.
 * AFTER the rule + RegistrationController (Task 4): security lets the request through;
 * Spring MVC finds the controller but no GET handler → 405 Method Not Allowed.
 * 405 proves both that security passed the request AND that the controller is registered
 * with @PostMapping only.
 */
@Test
void anonymousGetRegisterIsNotBlockedBySecurity() throws Exception {
    mockMvc.perform(get("/register"))
            .andExpect(status().isMethodNotAllowed());
}
```

**The only change is the expected status:** `status().isNotFound()` → `status().isMethodNotAllowed()`. The mock request and Javadoc are updated to reflect the new expected behavior. No new tests are added in this step — it is a refinement of an existing security baseline test.

#### Edge Cases

1. **If `RegistrationController` is not created before this test runs:** The test would fail (still gets 404). This dependency is correctly captured in the step ordering — Step 5 depends on Step 4.
2. **No new imports needed:** `status().isMethodNotAllowed()` uses the `MockMvcResultMatchers.status()` matcher already imported via `import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*` at line 28 of `EmployeeAccountStatusSecurityTest.java`.

---

## Design Decisions

**Decision 1: `register()` lives in `EmployeeService`, not a new `RegistrationService`**
- **Why:** All employee creation paths are co-located in `EmployeeService` — stated explicitly in the parent feature document. A separate `RegistrationService` would duplicate validation logic or become a pass-through. Deletion test: removing a hypothetical `RegistrationService` would either scatter its logic into `RegistrationController` (wrong layer) or move it into `EmployeeService` anyway. SRP: `EmployeeService`'s single responsibility is employee lifecycle management; registration is a public-path sub-case of employee creation.
- **Alternatives considered:** New `RegistrationService` (rejected — pure pass-through; no additional complexity hidden; splits related lifecycle operations across files without architectural benefit).

**Decision 2: `RegistrationResponseDTO` is a new DTO, not a reuse of `EmployeeMiniDTO`**
- **Why:** `RegistrationResponseDTO` carries a `message` field (pending-activation explanation) that has no place in `EmployeeMiniDTO`. `EmployeeMiniDTO` carries `roles` — exposing `ROLE_EMPLOYEE` to an anonymous self-registering caller is unnecessary information disclosure. A separate DTO with exactly `username`, `email`, and `message` is semantically precise and minimal.
- **Alternatives considered:** Reusing `EmployeeMiniDTO` with an added `message` field (rejected — pollutes the admin insert response, which `DefaultController.insert()` uses and does not need a `message`); returning `Map<String, String>` (rejected — not type-safe; inconsistent with the DTO pattern used everywhere in the codebase).

**Decision 3: HTTP 201 Created for successful registration**
- **Why:** Registration creates a new employee record. HTTP 201 is the semantically correct status for resource creation. HTTP 200 represents a successful mutation or retrieval with a body — semantically incorrect for a `POST` that creates a resource.
- **Alternatives considered:** HTTP 200 OK (rejected — misrepresents the operation; callers cannot distinguish creation from retrieval/mutation; 201 is the REST convention for `POST`-that-creates).

**Decision 4: Combined null/blank validation check (single `if` block)**
- **Why:** A single check throws one `InvalidInsertDetails` for any missing required field — the same pattern as `insert()`. The error message is deliberately non-specific about which field is missing. On a public registration endpoint, per-field error disclosure ("username already exists" vs "email already exists") can be used to enumerate registered accounts. A generic 400 tells the caller a required field is missing without leaking which accounts exist. Each missing-field test still expects 400 "Invalid Details" independently — the tests verify behavior, not message content.
- **Alternatives considered:** Per-field validation with distinct messages (rejected — increases information disclosure risk; inconsistent with `insert()` pattern; individual tests already cover each missing field).

**Decision 5: `RegistrationControllerTest` is a new class (not added to `EmployeeControllerListEndpointTest`)**
- **Why:** `EmployeeControllerListEndpointTest` uses `@WithMockUser(roles = "ADMIN")` at the class level. All tests in that class run as an authenticated admin. Registration tests require unauthenticated requests — anonymous access is the POINT of the registration endpoint. Adding registration tests to an admin-authenticated class would break the end-to-end login flow tests.
- **Alternatives considered:** Adding tests to `EmployeeControllerListEndpointTest` (rejected — class-level `@WithMockUser` prevents anonymous request testing and breaks the real-authentication login assertions).

**Decision 6: End-to-end login test uses real password-based authentication (not `@WithMockUser`)**
- **Why:** The end-to-end flow exercises `BCryptPasswordEncoder`, `AuthenticationManager`, `SecurityUserServiceImpl`, and `SecurityUser.isEnabled()` in sequence. `@WithMockUser` bypasses all of this and would not verify that the feature works end-to-end. This is a true integration test — the one that validates the entire security gate.
- **Alternatives considered:** `@WithMockUser` for the login step (rejected — bypasses `SecurityUser.isEnabled()` and the `DisabledException` path; would make test 9 always pass even if the `setEnabled(false)` line is missing from `register()`).

---

## Testing Considerations

### Automatic Validation

**TDD Cycle 1 — Create `RegistrationResponseDTO` and write RED tests (Steps 1 → 2):**

- [ ] Create `RegistrationResponseDTO.java` (Step 1)
- [ ] Create `RegistrationControllerTest.java` with all 10 tests (Step 2)
- [ ] Run `./mvnw -pl backend test -Dtest=RegistrationControllerTest#validRegistration_returns201WithUsernameEmailAndMessage` → confirm RED (404 Not Found — no controller) **⚠ Manual: Java 21 runtime required**

**TDD Cycle 2 — Implement `EmployeeService.register()` (Step 3):**

- [ ] Implement `register()` in `EmployeeService` (Step 3) — no new imports needed
- [ ] Run `./mvnw -pl backend test -Dtest=RegistrationControllerTest#validRegistration_returns201WithUsernameEmailAndMessage` → still RED (404 — service exists but controller not yet registered) **⚠ Manual: Java 21 runtime required**

**TDD Cycle 3 — Create `RegistrationController` → GREEN (Step 4):**

- [ ] Create `RegistrationController.java` (Step 4)
- [ ] Run `./mvnw -pl backend test -Dtest=RegistrationControllerTest` → confirm all 10 tests GREEN **⚠ Manual: Java 21 runtime required**

**Step 5 — Update `EmployeeAccountStatusSecurityTest`:**

- [ ] Update `anonymousGetRegisterIsNotBlockedBySecurity()` from `isNotFound()` to `isMethodNotAllowed()` (Step 5)
- [ ] Run `./mvnw -pl backend test -Dtest=EmployeeAccountStatusSecurityTest` → confirm all 3 tests GREEN **⚠ Manual: Java 21 runtime required**

**Full regression:**

- [ ] Run `./mvnw -pl backend test` → all existing tests pass + test count increases by 10 (new `RegistrationControllerTest` tests) **⚠ Manual: Java 21 runtime required**
- [ ] Confirm `EmployeeAccountStatusSecurityTest` (3 tests) GREEN — `anonymousGetRegisterIsNotBlockedBySecurity` now expects 405 **⚠ Manual: Java 21 runtime required**
- [ ] Confirm `EmployeeServiceCrudIntegrationTest` (23 tests) GREEN — no regression from new `register()` method **⚠ Manual: Java 21 runtime required**
- [ ] Confirm `EmployeeControllerListEndpointTest` (19 tests) GREEN — no regression from new `RegistrationController` **⚠ Manual: Java 21 runtime required**
- [ ] Confirm `SecurityAuthorizationTest` (15 tests) GREEN — no regression from the `RegistrationController` registering under the `permitAll` `/register` rule **⚠ Manual: Java 21 runtime required**

### Manual Validation

No manual validation is required for this task. All behaviors — including the end-to-end register → login-blocked → admin-activate → login-succeeds flow — are verifiable through the automated test suite using `MockMvc` integration tests with real JWT tokens and real BCrypt password encoding.

---

## Related Code Explanations

- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeService.java:75` — `insert()` is the authoritative prior art for `register()`. Line-by-line: validation identical; uniqueness checks identical; `mapper.toEntity()` + `passwordEncoder.encode()` + `Set.of(UserRoles.EMPLOYEE)` identical; `setEnabled(true)` in `insert()` vs `setEnabled(false)` in `register()` — the one critical difference.
- `backend/src/main/java/com/agentForgeBackend/shared/models/baseUser/BaseUserEntity.java` — `private boolean enabled = true` at field declaration. This default is the primary risk: `register()` MUST explicitly call `setEnabled(false)` after `mapper.toEntity(form)`.
- `backend/src/main/java/com/agentForgeBackend/exceptions/GlobalExceptionHandler.java` — handles all three exception paths for registration: `InvalidInsertDetails` (400), `ItemAlreadyExist` (409), `DisabledException` (401 "Account pending admin activation."). No changes to this file.
- `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java` — `.requestMatchers("/register", "/register/").permitAll()` allows unauthenticated access. No changes to this file.
- `backend/src/test/java/com/agentForgeBackend/testUtils/TestAuthenticationHelper.java:38` — `initializeMockUsers()` persists an `AdminEntity` + `ClientEntity` and generates JWTs. Used in end-to-end test 10. `setUp()` deletes the persisted entities via `adminRepository.deleteAll()` + `clientRepository.deleteAll()` before each test.
- `backend/src/test/java/com/agentForgeBackend/configuration/security/EmployeeAccountStatusSecurityTest.java` — prior art for no-`@WithMockUser` integration tests; shows FK-safe cleanup pattern, direct entity construction, and `POST /login` assertions that match the registration test pattern.

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected for this task
- [x] Up-to-date documentation reviewed for the affected technologies
- [x] `RegistrationResponseDTO` exists at `backend/src/main/java/com/agentForgeBackend/models/hq/employee/RegistrationResponseDTO.java` with `@Data @AllArgsConstructor @NoArgsConstructor` and fields `String username`, `String email`, `String message`
- [x] `EmployeeService.register(EmployeeForm form)` exists with no `@PreAuthorize`, `@Transactional`, combined null/blank validation (throws `InvalidInsertDetails`), username uniqueness check (throws `ItemAlreadyExist`), email uniqueness check (throws `ItemAlreadyExist`), `mapper.toEntity(form)`, `passwordEncoder.encode(form.getPassword())`, `Set.of(UserRoles.EMPLOYEE)`, `setEnabled(false)`, `setAccountNonExpired(true)`, `setAccountNonLocked(true)`, `setCredentialsNonExpired(true)`, `employeeRepository.save()`, and returns `new RegistrationResponseDTO(saved.getUsername(), saved.getEmail(), "Registration successful. Your account is pending admin activation.")`
- [x] `RegistrationController` exists at `backend/src/main/java/com/agentForgeBackend/models/hq/employee/RegistrationController.java` with `@RestController @RequestMapping("/register")`, single-constructor injection of `EmployeeService`, and a single `@PostMapping` method returning `ResponseEntity.status(HttpStatus.CREATED).body(employeeService.register(form))`
- [x] `RegistrationControllerTest` exists with 10 tests: `validRegistration_returns201WithUsernameEmailAndMessage`, `validRegistration_savesEmployeeWithEnabledFalse`, `registration_duplicateUsername_returns409`, `registration_duplicateEmail_returns409`, `registration_missingUsername_returns400`, `registration_missingEmail_returns400`, `registration_missingPassword_returns400`, `registration_blankPassword_returns400`, `selfRegisteredEmployee_cannotLoginBeforeActivation_returns401`, `selfRegisteredEmployee_canLoginAfterAdminActivates_returns200`
- [x] `EmployeeAccountStatusSecurityTest.anonymousGetRegisterIsNotBlockedBySecurity()` updated from `status().isNotFound()` to `status().isMethodNotAllowed()`
- [x] All implementation steps checked off
- [ ] Automatic validation deferred (Java 21 runtime not available in execution environment — consistent with Tasks 1, 2, and 3; runtime validation checklist remains documented above for manual execution)
- [x] No manual validation steps required
- [x] Parent document `Features/to-do/Employee-Self-Registration-and-Admin-Activation` Phase 4 step checkboxes marked `[x]` and wiki link added for this task
