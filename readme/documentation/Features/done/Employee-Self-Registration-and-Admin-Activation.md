#high #new-feature

## Feature: Employee Self-Registration and Admin Activation

### Description

Extend the employee onboarding flow so that employees can self-register without requiring an admin to create their account first. Self-registered accounts are created in a disabled state and cannot log in until an admin explicitly activates them. Admins retain the ability to create employees directly (immediately active, as today) and gain new activate and deactivate endpoints to manage account status at any time.

This feature also fixes a pre-existing bug in `SecurityUser`: the `getEnabled()`, `getAccountNonExpired()`, `getAccountNonLocked()`, and `getCredentialsNonExpired()` methods do not override the `UserDetails` interface methods (`isEnabled()`, etc.) because they use the wrong `get` prefix. Spring Security 6.x provides default implementations returning `true` for all of them, meaning disabled accounts can currently log in. This bug must be fixed as part of the security foundation for this feature to work.

Design decisions confirmed during feature creation:
- Self-registration endpoint: `POST /register` (permitAll). Distinct from `/employee/**` which is admin-only.
- Admin-created employees (via `POST /employee`) remain immediately active — the act of admin creation is the approval.
- Self-registered employees start with `enabled = false` and cannot log in until an admin calls `PATCH /employee/{id}/activate`.
- Admins can also deactivate active employees (`PATCH /employee/{id}/deactivate`) to suspend access without deleting the account or any of its data.
- Registration response returns `{username, email, message}` — no JWT, because the account is pending approval.
- The existing `BaseUserEntity.enabled` field is the activation flag — no new field is needed.
- `DisabledException` (thrown by Spring Security when `isEnabled()` returns false) must be handled in `GlobalExceptionHandler` with a 401 response and message `"Account pending admin activation."` to distinguish it from wrong credentials.
- `enabled` status is added to `EmployeeDTO` and `EmployeeListDTO` so admins can see which accounts are pending.

---

## Problem Statement

Currently all employee accounts must be created by an admin. There is no way for an employee to onboard themselves — an admin must know the employee's details and manually create the account. This creates a friction point for new users and places unnecessary burden on admins for routine onboarding.

Additionally, there is no way to suspend an employee's access without deleting their account. Deletion cascades and destroys the employee's conversation history, agents, and usage data — an irreversible action that should be reserved for permanent removal, not routine access revocation.

---

## User Stories

1. As an Employee, I want to register myself with my name, email, username, and password, so that I do not need to wait for an admin to create my account before I can request access.
2. As an Employee, I want to receive a clear confirmation after registering that explains my account is pending approval, so that I know what to expect next and do not attempt to log in before activation.
3. As an Employee, I want the registration endpoint to reject my request if my chosen username or email is already taken, so that I receive an actionable error instead of a silent failure.
4. As an Employee, I want to be blocked from logging in until an admin activates my account, so that the system enforces the approval gate that the business requires.
5. As an Employee, I want to receive a clear error message when I try to log in with a pending account, so that I know my credentials are correct and my account just hasn't been approved yet.
6. As an Admin, I want to see the activation status (`enabled`) of every employee in the employee list, so that I can identify which accounts are pending activation at a glance.
7. As an Admin, I want to activate a self-registered employee account, so that the employee can log in and start using the system.
8. As an Admin, I want to deactivate an employee account without deleting it, so that I can suspend access for an employee who has left or who violates policy while preserving their conversation history and agent data.
9. As an Admin, I want to reactivate a previously deactivated employee, so that I can restore access when appropriate without recreating the account.
10. As an Admin, I want accounts I create directly (via `POST /employee`) to be immediately active, so that my existing workflow for provisioning known employees is unaffected.
11. As a backend maintainer, I want `SecurityUser.isEnabled()` to correctly delegate to `BaseUserEntity.enabled`, so that Spring Security enforces the account enabled state during authentication rather than defaulting to always-enabled.
12. As a backend maintainer, I want `DisabledException` to be handled by `GlobalExceptionHandler` with a distinct 401 message, so that the frontend can differentiate "wrong credentials" from "pending activation" and show the user appropriate guidance.
13. As a backend maintainer, I want the self-registration logic to live in `EmployeeService.register()` (no `@PreAuthorize`, `enabled = false`), so that all employee creation paths are co-located in a single service and the validation logic (uniqueness checks, password encoding, role assignment) is not duplicated.
14. As a QA engineer, I want the `/register` endpoint to be publicly accessible without a JWT, so that unauthenticated users can submit a registration form.
15. As a QA engineer, I want the activate and deactivate endpoints to require admin role, so that employees cannot self-activate or deactivate other accounts.

---

## Solution

Add a public `POST /register` endpoint backed by `EmployeeService.register()` that creates an `EmployeeEntity` with `enabled = false`. Fix `SecurityUser` so Spring Security correctly enforces the `enabled` state at login. Add `GlobalExceptionHandler` support for `DisabledException`. Add `PATCH /employee/{id}/activate` and `PATCH /employee/{id}/deactivate` admin endpoints to `EmployeeController`. Expose `enabled` status in `EmployeeDTO` and `EmployeeListDTO`.

### Scope

Impacted workflows and systems:
- New public endpoint: `POST /register`
- Modified `EmployeeService` — new `register()`, `activate()`, `deactivate()` methods
- Modified `EmployeeController` — two new admin `PATCH` endpoints
- New `RegistrationController` — thin adapter at `/register`
- New `RegistrationResponseDTO`
- Modified `EmployeeDTO`, `EmployeeMapper` — add `enabled` field to `EmployeeDTO.toDTO()` only (`EmployeeListDTO.enabled` and `toListDTO()` mapping already present)
- Modified `SecurityUser` — fix `is*()` method names to properly override `UserDetails`
- Modified `GlobalExceptionHandler` — add `DisabledException` handler
- Modified `SecurityConfig` — add `/register` → `permitAll` rule

Out of scope:
- Email notifications on registration or activation (no email service in MVP)
- Admin-facing "pending only" filter endpoint — the existing `POST /employee/list` endpoint already supports `enabled=false` filtering because `EmployeeQueryProfile` declares `enabled` as a `QueryableField.booleanField` (`EmployeeQueryProfile.java:24`). No new endpoint or code changes needed.
- Password reset flow
- Multi-step registration wizard
- Admin approval workflow with email confirmation
- Frontend implementation

### Affected Systems / Modules

- `backend/src/main/java/com/agentForgeBackend/shared/securityUser/SecurityUser.java` — fix four `is*()` method name bugs
- `backend/src/main/java/com/agentForgeBackend/exceptions/GlobalExceptionHandler.java` — add `DisabledException` handler
- `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java` — add `/register` permitAll rule
- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeService.java` — add `register()`, `activate()`, `deactivate()`
- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeController.java` — add two admin PATCH endpoints
- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeDTO.java` — add `enabled` field
- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeListDTO.java` — no changes needed; `enabled` field already present from prior feature
- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeMapper.java` — add `enabled` mapping to `toDTO()` only; `toListDTO()` already maps `enabled` from prior feature
- New: `backend/src/main/java/com/agentForgeBackend/models/hq/employee/RegistrationController.java`
- New: `backend/src/main/java/com/agentForgeBackend/models/hq/employee/RegistrationResponseDTO.java`

### Impact Analysis

- **`EmployeeService.insert()` is unchanged**: It already sets `enabled = true` explicitly. Admin-created accounts remain immediately active.
- **Existing `SecurityAuthorizationTest` tests**: The `/employee/**` admin-only rule is unchanged. The new `/register` rule must not weaken any existing HTTP rule. The new rule is added before `anyRequest().authenticated()`.
- **Login for all users**: Fixing `SecurityUser.isEnabled()` affects all user types (Admin, Client, Employee) because all extend `BaseUserEntity`. Since all existing accounts have `enabled = true` in the DB (set explicitly by `AdminBootstrap`, `EmployeeService.insert()`, and any client creation), fixing the method has no observable impact on existing active accounts.
- **Test FK-safe cleanup order**: No new JPA entities — the FK-safe delete order in `@BeforeEach` is unchanged.
- **`EmployeeDTO` shape change**: Adding the `enabled` field is additive and backward-compatible. The frontend (not yet built) will see the field from day one.

### Risk Assessment

- **`SecurityUser.isEnabled()` fix affects all `BaseUserEntity` subtypes**: Admin and Client entities also extend `BaseUserEntity`. Their `enabled` fields are currently set to `true` at creation time and never changed, so the fix has no impact on existing accounts. This risk is mitigated by the fact that `enabled = true` is explicitly set in all creation paths today and verified by the full regression suite.
- **`DisabledException` not currently in `GlobalExceptionHandler`**: Without the handler, a disabled account's login attempt currently falls through to Spring's default exception resolution and may return a 500. The handler must be added in the same task as the `SecurityUser` fix to ensure no window where the fix is live but the error response is broken.
- **`/register` is `permitAll` — no rate limiting**: Any unauthenticated caller can POST to `/register`. For MVP (internal deployment, not public internet), this is acceptable. Do not add rate limiting infrastructure in this feature.
- **`EmployeeForm` is reused for registration**: The same form is used for admin-created and self-registered employees. The `firstName` and `lastName` fields are optional (nullable in the entity) while `username`, `email`, and `password` are required. The `register()` method must validate the required fields the same way `insert()` does.
- **`ddl-auto=update` — no new columns**: No new JPA entity fields are added. The `enabled` column already exists on `base_user`. Schema is unchanged.

---

## Implementation Architecture

### Changes Required

#### 1. `SecurityUser` (modified — bug fix)

**Purpose:** Correctly implement the `UserDetails` interface so Spring Security enforces `BaseUserEntity.enabled` during authentication.

**Changes:**
- Rename `getEnabled()` → `isEnabled()` with `@Override`
- Rename `getAccountNonExpired()` → `isAccountNonExpired()` with `@Override`
- Rename `getAccountNonLocked()` → `isAccountNonLocked()` with `@Override`
- Rename `getCredentialsNonExpired()` → `isCredentialsNonExpired()` with `@Override`

All four methods delegate to the corresponding field on `BaseUserEntity` (unchanged behavior). The bug is purely the method names preventing proper interface overrides. Spring Security 6.x (used via Spring Boot 3.4.1) made `isEnabled()`, `isAccountNonExpired()`, `isAccountNonLocked()`, and `isCredentialsNonExpired()` into `default` interface methods returning `true` — the compiler did not require `SecurityUser` to implement them, which is why the `get*()` naming error compiled silently and went undetected.

**File:** `backend/src/main/java/com/agentForgeBackend/shared/securityUser/SecurityUser.java`

---

#### 2. `GlobalExceptionHandler` (modified)

**Purpose:** Return a meaningful 401 response when a disabled account attempts to log in, distinct from the existing `BadCredentialsException` handler (wrong password).

**Changes:**
- Add `@ExceptionHandler(DisabledException.class)` method returning `ResponseEntity` with HTTP 401, error `"Unauthorized"`, message `"Account pending admin activation."`.
- Import `org.springframework.security.authentication.DisabledException`.

**File:** `backend/src/main/java/com/agentForgeBackend/exceptions/GlobalExceptionHandler.java`

---

#### 3. `SecurityConfig` (modified)

**Purpose:** Permit the public registration endpoint without a JWT while leaving all other HTTP security rules unchanged.

**Changes:**
- Add `.requestMatchers("/register", "/register/").permitAll()` after the existing `/login` rule and before the `/employee/**` admin rule.

**File:** `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java`

---

#### 4. `EmployeeDTO` (modified)

**Purpose:** Expose account activation status to admin consumers.

**Changes:**
- Add `boolean enabled` field to `EmployeeDTO`.

**Note:** `EmployeeListDTO` already has `boolean enabled` (added in a prior feature) — no changes needed.

**Files:**
- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeDTO.java`

---

#### 5. `EmployeeMapper` (modified)

**Purpose:** Map `BaseUserEntity.enabled` to the new DTO field.

**Changes:**
- In `toDTO()`: set `dto.setEnabled(entity.isEnabled())`.
- In `toSmallDTO()` (if `EmployeeMiniDTO` does not need it, skip).
- In `toListDTO()`: no change needed — `.enabled(entity.isEnabled())` already mapped from a prior feature (see `EmployeeMapper.java:56`).

**File:** `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeMapper.java`

---

#### 6. `EmployeeService` (modified — three new methods)

**Purpose:** Add the self-registration path and admin activation/deactivation operations as a deep extension of the existing employee lifecycle management module.

**Depth analysis:** `EmployeeService` already hides duplicate-checking, password encoding, role assignment, and persistence behind a small interface. Adding `register()`, `activate()`, and `deactivate()` deepens the module further — all employee lifecycle state changes are concentrated here. Deletion test: removing these methods scatters enabled-state management and registration validation across controllers.

**New methods:**

- **`register(EmployeeForm form)`** → `RegistrationResponseDTO`:
  - No `@PreAuthorize` — public registration path; security at the HTTP layer via `permitAll` SecurityConfig rule.
  - `@Transactional`
  - Validate `username`, `email`, `password` are non-blank; throw `InvalidInsertDetails` if missing.
  - Check `baseUserRepository.existsByUsername()` and `existsByEmail()`; throw `ItemAlreadyExist` if taken.
  - Build `EmployeeEntity` via `mapper.toEntity(form)`.
  - Set `password` = `passwordEncoder.encode(form.getPassword())`.
  - Set `roles` = `Set.of(UserRoles.EMPLOYEE)`.
  - Set `enabled = false` (pending admin activation — key difference from `insert()`).
  - Set `accountNonExpired = true`, `accountNonLocked = true`, `credentialsNonExpired = true`.
  - Save and return `new RegistrationResponseDTO(saved.getUsername(), saved.getEmail(), "Registration successful. Your account is pending admin activation.")`.

- **`activate(Long id)`** → `EmployeeDTO`:
  - `@PreAuthorize("hasRole('ADMIN')")` `@Transactional`
  - Load employee via `employeeRepository.findById(id)` — throw `ItemNotFoundException` if absent.
  - Set `entity.setEnabled(true)`.
  - Save and return `mapper.toDTO(saved)`.

- **`deactivate(Long id)`** → `EmployeeDTO`:
  - `@PreAuthorize("hasRole('ADMIN')")` `@Transactional`
  - Load employee via `employeeRepository.findById(id)` — throw `ItemNotFoundException` if absent.
  - Set `entity.setEnabled(false)`.
  - Save and return `mapper.toDTO(saved)`.

**File:** `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeService.java`

---

#### 7. `RegistrationResponseDTO` (new)

**Purpose:** Carry the public registration confirmation back to the unauthenticated caller.

**Changes:**
- `@Data @AllArgsConstructor @NoArgsConstructor`
- Fields: `String username`, `String email`, `String message`

**File:** `backend/src/main/java/com/agentForgeBackend/models/hq/employee/RegistrationResponseDTO.java`

---

#### 8. `RegistrationController` (new)

**Purpose:** Thin HTTP adapter for the public self-registration endpoint. No business logic — delegates entirely to `EmployeeService.register()`.

**Changes:**
- `@RestController` at `@RequestMapping("/register")`.
- Does NOT extend `DefaultController` (single endpoint, no CRUD scaffold needed).
- Injects `EmployeeService`.
- `@PostMapping` method: accepts `@RequestBody EmployeeForm form`, calls `employeeService.register(form)`, returns `ResponseEntity<RegistrationResponseDTO>` with HTTP 201 Created.

**Package placement:** `models/hq/employee/` — not `configuration/security/`. `RegistrationController` creates `EmployeeEntity` records and delegates to `EmployeeService.register()`. It is a domain controller operating on the employee domain, not a security infrastructure controller. `SecurityController` (`configuration/security/`) handles credential exchange (`/login`); `RegistrationController` handles entity creation (`/register`). All entity-domain controllers in this codebase live under `models/hq/`; only authentication infrastructure lives in `configuration/security/`.

**File:** `backend/src/main/java/com/agentForgeBackend/models/hq/employee/RegistrationController.java`

---

#### 9. `EmployeeController` (modified — two new admin endpoints)

**Purpose:** Expose activate and deactivate operations as admin HTTP endpoints. Thin adapters delegating to `EmployeeService`.

**Changes:**
- `@PatchMapping("/{id}/activate")`: calls `employeeService.activate(id)`, returns `ResponseEntity<EmployeeDTO>` with 200.
- `@PatchMapping("/{id}/deactivate")`: calls `employeeService.deactivate(id)`, returns `ResponseEntity<EmployeeDTO>` with 200.

Both methods inherit admin-only enforcement from `EmployeeService` method-level security (`@PreAuthorize("hasRole('ADMIN')")`). The HTTP-level rule `/employee/**` → `hasRole('ADMIN')` in `SecurityConfig` also guards these paths.

**File:** `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeController.java`

---

## Implementation Steps

### Phase 1: Security Foundation

- [x] **Step 1.1:** Rename the four `get*()` methods in `SecurityUser` to `is*()` and add `@Override` to each. Methods: `isEnabled()`, `isAccountNonExpired()`, `isAccountNonLocked()`, `isCredentialsNonExpired()`. Each delegates to the matching `baseUser.isXxx()` method.
- [x] **Step 1.2:** Add `@ExceptionHandler(DisabledException.class)` to `GlobalExceptionHandler` — HTTP 401, message `"Account pending admin activation."`. Add import for `org.springframework.security.authentication.DisabledException`.
- [x] **Step 1.3:** Add `.requestMatchers("/register", "/register/").permitAll()` to `SecurityConfig` — after the `/login` rule, before `/employee/**`.
- [x] **Step 1.4:** Write security baseline tests:
  - Login with a user whose `enabled = false` → 401 with message `"Account pending admin activation."` (discriminating RED test: currently returns 200 because `isEnabled()` defaults to `true`).
  - Login with a user whose `enabled = true` → 200 (must not regress).
  - `GET /register` without JWT → 405 Method Not Allowed (path is public but only POST is registered).
  - Anonymous `OPTIONS /register` → 200 (CORS preflight).

### Phase 2: EmployeeDTO Enabled Status

- [x] **Step 2.1:** Add `boolean enabled` field to `EmployeeDTO`. `EmployeeListDTO` already has `enabled` — no change needed (see `EmployeeListDTO.java:33`).
- [x] **Step 2.2:** Update `EmployeeMapper.toDTO()` to map `entity.isEnabled()` via `.enabled(entity.isEnabled())` in the builder chain. `toListDTO()` already maps `enabled` at `EmployeeMapper.java:56` — no change needed.
- [x] **Step 2.3:** TDD for mapper (targeting `toDTO()` only — `toListDTO()` mapping already exists):
  - `toDTO()` maps `enabled = true` correctly.
  - `toDTO()` maps `enabled = false` correctly.

### Phase 3: Admin Activation / Deactivation

- [x] **Step 3.1:** Add `activate(Long id)` and `deactivate(Long id)` to `EmployeeService` — `@PreAuthorize("hasRole('ADMIN')")`, `@Transactional`, load by ID, set `enabled`, save, return `EmployeeDTO`.
- [x] **Step 3.2:** Add `@PatchMapping("/{id}/activate")` and `@PatchMapping("/{id}/deactivate")` to `EmployeeController` — delegate to service, return `ResponseEntity<EmployeeDTO>`.
- [x] **Step 3.3:** TDD for activation/deactivation:
  - `activate`: disabled employee → 200, `enabled = true` in response and DB.
  - `activate`: already-active employee → 200 (idempotent, no error).
  - `activate`: non-existent employee → 404.
  - `deactivate`: active employee → 200, `enabled = false` in response and DB.
  - `deactivate`: already-disabled employee → 200 (idempotent, no error).
  - Employee JWT calling `PATCH /employee/{id}/activate` → 403 (admin only).
  - Anonymous calling `PATCH /employee/{id}/activate` → 401.

### Phase 4: Self-Registration

- [x] **Step 4.1:** Create `RegistrationResponseDTO` — `@Data @AllArgsConstructor @NoArgsConstructor`, fields `String username`, `String email`, `String message`.
- [x] **Step 4.2:** Add `register(EmployeeForm form)` to `EmployeeService` — no `@PreAuthorize`, `@Transactional`, validates required fields, uniqueness checks, encodes password, role = EMPLOYEE, `enabled = false`, returns `RegistrationResponseDTO`.
- [x] **Step 4.3:** Create `RegistrationController` — `@RestController @RequestMapping("/register")`, single `@PostMapping` → `employeeService.register(form)` → `ResponseEntity.status(201).body(dto)`.
- [x] **Step 4.4:** TDD for registration:
  - Valid form → 201 with `{username, email, message}` containing "pending admin activation".
  - Employee saved with `enabled = false` (verify in DB via repository).
  - Duplicate username → 409 Conflict.
  - Duplicate email → 409 Conflict.
  - Missing `username` → 400 Bad Request.
  - Missing `email` → 400 Bad Request.
  - Missing `password` → 400 Bad Request.
  - Self-registered account cannot log in before activation → 401 with "Account pending admin activation." (end-to-end test).
  - Self-registered account CAN log in after admin activates → 200.

### Phase 5: Regression and Cleanup

- [x] **Step 5.1:** FK-safe cleanup audit for all new test classes — ensure `@BeforeEach` follows the established delete order: `messageRepository → conversationRepository → agentRepository → llmModelRepository → employeeRepository`.
- [ ] **Step 5.2:** Run full `./mvnw test` — confirm no regressions in existing Admin, Employee, Conversation, Agent, Message, AppSettings, Security, LlmModel, and WebSocket tests. Verify test count increases by new tests added in Phases 1–4.

---

## Potential Issues / Risks

- **`SecurityUser` fix affects all `BaseUserEntity` subtypes**: Admin and Client login paths also go through `SecurityUser`. Since all existing accounts have `enabled = true` explicitly set, the fix is safe. However, a future change that accidentally leaves `enabled = false` on an admin account would now correctly block that admin's login — where previously they could still log in. This is the CORRECT behavior, but it changes the blast radius of any future bug involving `enabled`.
- **`DisabledException` vs `BadCredentialsException` in the filter chain**: Spring Security wraps authentication exceptions through the filter chain (`JWTTokenValidatorFilter`). The `DisabledException` is thrown at the `AuthenticationManager.authenticate()` call in `SecurityController.login()`, not in the JWT filter. It propagates as an unhandled exception to the global handler. Ensure the `@ExceptionHandler(DisabledException.class)` is added BEFORE deploying the `SecurityUser` fix; otherwise disabled accounts get a 500 during the window.
- **Existing `SecurityAuthorizationTest` and the `/register` rule**: The new `permitAll` rule must be inserted BEFORE the `anyRequest().authenticated()` catch-all. It must not be inserted after `/employee/**` because Spring Security evaluates rules top-to-bottom; the order `/employee/**` → `hasRole('ADMIN')` before `/register/` → `permitAll` would still allow `/register` to pass through since `/register` does not match `/employee/**`. Order between `/login` and `/employee/**` is fine. Verify `SecurityAuthorizationTest` still passes its existing 12+ tests.
- **`EmployeeForm` reused for registration**: `firstName` and `lastName` are optional in `BaseUserEntity` (nullable). The `register()` method does not require them — only `username`, `email`, and `password` are validated. The frontend should reflect this (first/last name are optional on the registration form).
- **Idempotency of activate/deactivate**: Calling `activate()` on an already-active employee or `deactivate()` on an already-disabled employee should succeed (200, no error). The method simply sets the field and saves — it does not check the current state before acting. This is correct behavior and avoids unnecessary round-trips.

---

## Testing Decisions

Good tests verify observable behavior through public interfaces — what goes in and what comes out — not internal implementation details (not method call counts, not internal state that isn't externally observable).

**What makes a good test for this feature:**
- Tests call real HTTP endpoints (via `MockMvc` or `@SpringBootTest` with real JWT tokens) and assert on HTTP status codes, response bodies, and DB state.
- Tests do NOT assert on which service method was called or which repository method was invoked.
- Tests verify the end-to-end contract: a disabled account truly cannot log in; an activated account truly can log in.

**Modules to test:**

| Module | Test Type | Key Behaviors |
|--------|-----------|---------------|
| `SecurityUser` fix | Unit or integration | `isEnabled()` returns `baseUser.isEnabled()` for both true and false |
| Login with disabled account | `@SpringBootTest` integration | 401 + "Account pending admin activation." message |
| `EmployeeMapper` | Unit | `enabled` field mapped correctly in `toDTO()` and `toListDTO()` |
| `EmployeeService.register()` | `@SpringBootTest` integration | Creates disabled employee, returns correct DTO, rejects duplicates, rejects missing fields |
| `EmployeeService.activate/deactivate` | `@SpringBootTest` integration | State changes, idempotency, 404 for unknown employee |
| `RegistrationController` | `@SpringBootTest` integration | HTTP 201 on success, HTTP 400/409 on errors, anonymous access allowed |
| Activate/Deactivate endpoints | `@SpringBootTest` integration | Admin can act, employee cannot, anonymous cannot |
| End-to-end flow | `@SpringBootTest` integration | Register → login blocked → admin activates → login succeeds |

**Prior art:**
- `backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java` — real JWT-based HTTP security tests
- `backend/src/test/java/com/agentForgeBackend/models/hq/employee/` — existing employee CRUD tests
- `backend/src/test/java/com/agentForgeBackend/testUtils/TestAuthenticationHelper.java` — JWT helper for tests
- `backend/src/test/java/com/agentForgeBackend/models/message/MessageServiceWriteSeamsTest.java` — pattern for `@SpringBootTest` integration tests with FK-safe cleanup

---

## Task Breakdown

### Task 1: Security Foundation and Activation Fix

- **Steps Covered:** Steps 1.1, 1.2, 1.3, 1.4
- **Reason for Grouping:** The `SecurityUser` bug fix, `DisabledException` handler, and `SecurityConfig` rule are tightly coupled — the fix must not go live without the handler (broken error response) or the security rule (tests cannot verify public registration path). All four are small changes that form an atomic security baseline.
- **Planned Task File:** `Employee-Self-Registration-and-Admin-Activation-step-1-security-foundation.md`
- **Task Document Link:** [[Employee-Self-Registration-and-Admin-Activation-step-1-security-foundation]]

### Task 2: EmployeeDTO Enabled Status

- **Steps Covered:** Steps 2.1, 2.2, 2.3 (only `EmployeeDTO` and `toDTO()` — `EmployeeListDTO` and `toListDTO()` already done)
- **Reason for Grouping:** Small, standalone DTO/mapper change with no dependencies on other tasks. Adds `enabled` to `EmployeeDTO.toDTO()` only. Must come before Task 3 so the activation response includes the `enabled` field.
- **Planned Task File:** `Employee-Self-Registration-and-Admin-Activation-step-2-dto-enabled-status.md`
- **Task Document Link:** [[Employee-Self-Registration-and-Admin-Activation-step-2-dto-enabled-status]]

### Task 3: Admin Activation / Deactivation

- **Steps Covered:** Steps 3.1, 3.2, 3.3
- **Reason for Grouping:** The two endpoints are symmetric and depend on each other's test coverage (activate then deactivate then reactivate is a natural test sequence). Depends on Task 1 (for `isEnabled()` to work) and Task 2 (for full DTO response).
- **Planned Task File:** `Employee-Self-Registration-and-Admin-Activation-step-3-activate-deactivate.md`
- **Task Document Link:** [[Employee-Self-Registration-and-Admin-Activation-step-3-activate-deactivate]]

### Task 4: Self-Registration

- **Steps Covered:** Steps 4.1, 4.2, 4.3, 4.4
- **Reason for Grouping:** All registration-related work is contained here. Depends on Task 1 (security baseline and `isEnabled()` fix for end-to-end login tests) and Task 3 (activate endpoint needed for the end-to-end "register → activate → login" test).
- **Planned Task File:** `Employee-Self-Registration-and-Admin-Activation-step-4-self-registration.md`
- **Task Document Link:** [[Employee-Self-Registration-and-Admin-Activation-step-4-self-registration]]

### Task 5: Regression and Cleanup

- **Steps Covered:** Steps 5.1, 5.2
- **Reason for Grouping:** Verification-only. Depends on all implementation tasks being complete.
- **Planned Task File:** `Employee-Self-Registration-and-Admin-Activation-step-5-regression.md`
- **Task Document Link:** [[Employee-Self-Registration-and-Admin-Activation-step-5-regression]]
