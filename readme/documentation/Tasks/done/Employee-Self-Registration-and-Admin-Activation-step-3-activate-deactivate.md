# Task: Admin Activation / Deactivation — activate() and deactivate() Service Methods and PATCH Endpoints

#task #current #medium-complexity #parent-employee-self-registration-and-admin-activation

**Parent:** [[Employee-Self-Registration-and-Admin-Activation]]
**Parent Type:** Feature
**Related Step(s):** Phase 3, Steps 3.1, 3.2, 3.3
**Estimated Complexity:** Medium

---

## Goal

Add `activate(Long id)` and `deactivate(Long id)` methods to `EmployeeService` and expose them via `PATCH /employee/{id}/activate` and `PATCH /employee/{id}/deactivate` admin-only endpoints on `EmployeeController`, so that admins can toggle employee account access without deleting any data.

---

## Parent Context

The parent feature (Employee Self-Registration and Admin Activation) requires admins to be able to enable or disable employee accounts without deleting them. Without these endpoints an admin must delete the employee record to revoke access — an irreversible action that cascades and destroys conversation history, agents, and usage data.

Key context from the parent:

- **`activate(Long id)`** — `@PreAuthorize("hasRole('ADMIN')")`, `@Transactional`, loads employee by ID, throws `ItemNotFoundException` if absent, sets `enabled = true`, saves, returns `EmployeeDTO` (now including the `enabled` field from Task 2).
- **`deactivate(Long id)`** — same contract, sets `enabled = false`.
- **Idempotency** — calling `activate()` on an already-active employee or `deactivate()` on an already-disabled employee is a valid no-op. The method simply sets the field and saves without checking the current state. This prevents unnecessary round-trips.
- **HTTP layer** — `PATCH /employee/{id}/activate` and `PATCH /employee/{id}/deactivate` are thin adapters. Both are secured at two layers: the HTTP rule `/employee/**` → `hasRole("ADMIN")` in `SecurityConfig`, and the method-level `@PreAuthorize("hasRole('ADMIN')")` on the service method.
- **Return type** — both endpoints return `ResponseEntity<EmployeeDTO>` with HTTP 200. The `enabled` field in the DTO (added in Task 2) confirms the new activation state to the caller.
- **No new field or schema change** — `BaseUserEntity.enabled` already exists. Task 1 fixed `SecurityUser.isEnabled()` to correctly enforce it during authentication. Task 2 exposed it in `EmployeeDTO`. This task wires the admin write path.

**Task dependencies:** Task 1 (`SecurityUser.isEnabled()` fix) and Task 2 (`EmployeeDTO.enabled` + `toDTO()` mapping) must already be complete. Both are confirmed done.

---

## Preconditions / Dependencies

- [[Employee-Self-Registration-and-Admin-Activation-step-1-security-foundation]] complete: `SecurityUser.isEnabled()` correctly enforces the `enabled` flag during login. ✅
- [[Employee-Self-Registration-and-Admin-Activation-step-2-dto-enabled-status]] complete: `EmployeeDTO` has `private boolean enabled` and `EmployeeMapper.toDTO()` maps `entity.isEnabled()`. The activate/deactivate response will carry the `enabled` field. ✅
- `EmployeeRepository` extends `DefaultRepository` (which extends `JpaRepository`) — `findById(Long id)` is available without any new methods. ✅
- `mapper` field is `protected` in `DefaultServiceImplements` (`DefaultServiceImplements.java:35`), directly accessible from `EmployeeService` methods. ✅
- `BaseUserEntity.enabled` has Lombok `@Getter @Setter` → `entity.isEnabled()` / `entity.setEnabled(boolean)` already generated. ✅
- `ItemNotFoundException` is already imported and used in `EmployeeService`. ✅
- FK-safe cleanup order for tests: `messageRepository → conversationRepository → agentRepository → employeeRepository → clientRepository → adminRepository` (established in `known-issues.md`). ✅

---

## Skills and Documentation Preparation

### Skills Reviewed

- `memory-bank` — Selected — loaded all 7 files; confirmed test patterns (`EmployeeServiceCrudIntegrationTest`, `EmployeeControllerListEndpointTest`, `SecurityAuthorizationTest`), FK-safe cleanup order, `TestAuthenticationHelper` JWT helpers, and Spring Boot 3.4.1 / Spring Security 6.4.x versions.
- `solid-deep-design` — Selected — applied to assess whether `activate()`/`deactivate()` deepen `EmployeeService` and whether the controller endpoints are appropriately thin adapters.
- `tdd` — Selected — vertical-slice TDD: write RED service test → implement service method → GREEN; then write RED controller test → implement controller endpoint → GREEN.
- `find-docs` — Not needed — no new library APIs. The change is purely additive on existing JPA, Spring Security, and Spring MVC patterns already in the codebase.
- `glossary-management` — Not needed — no new domain terms introduced; "activate" and "deactivate" are used consistently with the parent feature document.

### Documentation Reviewed

- **Spring Data JPA `findById()`**: inherited from `JpaRepository` via `DefaultRepository`. Returns `Optional<T>`. Used identically to the pattern in `EmployeeService.getOne()` (`EmployeeService.java:49`), `update()`, and `delete()`.
- **Spring `@Transactional` on checked exceptions**: Spring rolls back on `RuntimeException` and `Error` by default. `ItemNotFoundException` is a checked exception. For `activate()` and `deactivate()`, the `findById()` lookup occurs *before* any mutation — if the entity is absent, nothing has been modified and there is nothing to roll back. Plain `@Transactional` (no `rollbackFor`) is correct here.
- **`@PatchMapping` in Spring MVC**: Maps HTTP `PATCH` requests to handler methods. Supported by `DefaultController`'s parent but not defined on it — `EmployeeController` adds them as extra methods without overriding inherited endpoints.

### Related Existing Code

- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeService.java` — target; `getOne()` at line 48 is the prior art for `findById` + `ItemNotFoundException` pattern; `delete()` at line 137 shows the thin load-then-act pattern; `mapper` is available as the inherited `protected` field from `DefaultServiceImplements`.
- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeController.java` — target; currently only wraps `DefaultController`; the typed `EmployeeService` reference must be stored locally to call domain-specific methods.
- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeDTO.java:30` — `private boolean enabled;` (added in Task 2); this field in the return value confirms the new activation state to the caller.
- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeRepository.java` — `findById(Long)` is inherited from `DefaultRepository`; no new repository methods are needed.
- `backend/src/main/java/com/agentForgeBackend/shared/defaultImplements/DefaultServiceImplements.java:35` — `protected final DefaultMapper<...> mapper` — used as `mapper.toDTO(...)` in `activate()` / `deactivate()`.
- `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeServiceCrudIntegrationTest.java` — target for service-level tests; uses `@WithMockUser(roles = "ADMIN")` at class level, FK-safe `@BeforeEach`, and `employeeRepository.saveAndFlush()` for direct entity creation.
- `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeControllerListEndpointTest.java` — target for controller-level tests; uses `@WithMockUser(roles = "ADMIN")` at class level and `@WithMockUser(roles = "EMPLOYEE")` at method level for role-denial tests; already has `alpha` (enabled=true), `beta` (enabled=false), `gamma` (enabled=true) in `@BeforeEach`.
- `backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java` — target for anonymous 401 test; manages anonymous-caller tests without class-level `@WithMockUser`.

---

## Implementation Details

### Approach

**SOLID + Deep Design assessment:**

`EmployeeService` already concentrates all employee lifecycle management: insert, update, delete, getOne, getAll, getListPage. Adding `activate()` and `deactivate()` deepens the module further. Deletion test: if these methods did not exist in `EmployeeService`, the enabled-state mutation would scatter into controllers or ad-hoc repository calls at the HTTP layer — complexity appears in N callers. `EmployeeService` is the correct and only home for this logic.

SRP check: the module still has one reason to change — employee lifecycle management. Adding two more lifecycle operations (enable/disable) does not introduce a second reason; it deepens the existing one.

`EmployeeController` is a thin HTTP adapter. Its responsibility is translating HTTP requests into service calls and HTTP responses. `activate()` and `deactivate()` in the controller are one-liner delegates: call the service, return `ResponseEntity.ok(result)`. No business logic lives in the controller.

**Typed service reference in `EmployeeController`:** `DefaultController` stores the service as `DefaultService<...>`, the generic interface. `activate()` and `deactivate()` are not on `DefaultService` — they are domain-specific to `EmployeeService`. The controller must hold a typed reference:

```java
private final EmployeeService employeeService;

public EmployeeController(EmployeeService service) {
    super(service);            // stores as DefaultService for CRUD methods
    this.employeeService = service;  // stores as EmployeeService for domain-specific methods
}
```

This avoids any cast and is consistent with the `LlmModelController` dual-injection pattern (which stores an `OpenRouterService` reference alongside the default service). Spring injects `EmployeeService` once; the controller holds two references to the same object under different types.

**TDD order:** Write RED service tests → implement service methods (Step 1 → Step 2) → write RED controller/security tests → implement controller endpoints (Step 3 → Step 4). Each RED test is verified by the failing assertion before the production change that makes it GREEN.

### Files to Create/Modify

- [x] `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeService.java` — add `activate(Long id)` and `deactivate(Long id)` methods
- [x] `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeController.java` — add typed `EmployeeService` field and two `@PatchMapping` endpoint methods
- [x] `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeServiceCrudIntegrationTest.java` — add 6 service-level tests
- [x] `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeControllerListEndpointTest.java` — add 6 controller-level tests
- [x] `backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java` — add 1 anonymous 401 test for the activate endpoint

---

## Step-by-Step Implementation

### Step 1: Write RED service tests in `EmployeeServiceCrudIntegrationTest`

**Goal:** Establish 6 discriminating tests that verify service-level activate/deactivate behavior before any production code is written. These tests will fail to compile until `activate()` and `deactivate()` are added to `EmployeeService` in Step 2.

**Dependencies:** None beyond the existing test class.

- [x] Add 6 new `@Test` methods to `EmployeeServiceCrudIntegrationTest` (after existing tests)
- [x] Reuse the existing `@BeforeEach` FK-safe cleanup — no change needed to it

**Why this step is critical:** Writing the tests first establishes the contract before implementation. The discriminating RED test (`activate_setsEnabledTrueForDisabledEmployee`) will fail with `NoSuchMethodError` or compile error until `activate()` exists, proving the method does not yet exist.

#### Implementation

```java
// File: backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeServiceCrudIntegrationTest.java
// Add this import at the top — it is NOT present in the existing file and is required by Set.of():
import java.util.Set;
// Note: EmployeeDTO, EmployeeEntity, EmployeeForm, EmployeeRepository, EmployeeService are all in the same
// package (com.agentForgeBackend.models.hq.employee) as the test class — no imports needed for them.
// (all other required imports are already present in the existing file)
// <!-- REVIEW-FIX: replaced incorrect EmployeeDTO import (same-package, no import needed) with the
//      actually missing java.util.Set import required by Set.of(UserRoles.EMPLOYEE) in new test entities -->

// Add these 6 tests after the existing deleteThrowsItemNotFoundForNonExistentId test:

// --- activate() tests ---

@Test
void activate_setsEnabledTrueForDisabledEmployee() throws Exception {
    // Seed a disabled employee directly — insert() always sets enabled=true
    EmployeeEntity disabled = new EmployeeEntity();
    disabled.setEmail("activate-disabled@example.com");
    disabled.setUsername("activate-disabled@example.com");
    disabled.setPassword(passwordEncoder.encode("pass"));
    disabled.setRoles(Set.of(UserRoles.EMPLOYEE));
    disabled.setEnabled(false);
    disabled.setAccountNonExpired(true);
    disabled.setAccountNonLocked(true);
    disabled.setCredentialsNonExpired(true);
    Long id = employeeRepository.saveAndFlush(disabled).getId();

    EmployeeDTO result = employeeService.activate(id);

    assertThat(result.isEnabled()).isTrue();
    assertThat(employeeRepository.findById(id).orElseThrow().isEnabled()).isTrue();
}

@Test
void activate_isIdempotentWhenEmployeeAlreadyEnabled() throws Exception {
    employeeService.insert(new EmployeeForm("Act", "Idem", "act-idem@example.com", "actidem", "pass"));
    Long id = employeeRepository.findByUsername("actidem").orElseThrow().getId();
    // Employee is already enabled=true from insert()

    EmployeeDTO result = employeeService.activate(id);

    assertThat(result.isEnabled()).isTrue();
}

@Test
void activate_throwsItemNotFoundForUnknownId() {
    assertThatThrownBy(() -> employeeService.activate(999999L))
            .isInstanceOf(ItemNotFoundException.class);
}

// --- deactivate() tests ---

@Test
void deactivate_setsEnabledFalseForActiveEmployee() throws Exception {
    employeeService.insert(new EmployeeForm("Deact", "Active", "deact-active@example.com", "deactactive", "pass"));
    Long id = employeeRepository.findByUsername("deactactive").orElseThrow().getId();

    EmployeeDTO result = employeeService.deactivate(id);

    assertThat(result.isEnabled()).isFalse();
    assertThat(employeeRepository.findById(id).orElseThrow().isEnabled()).isFalse();
}

@Test
void deactivate_isIdempotentWhenEmployeeAlreadyDisabled() throws Exception {
    EmployeeEntity disabled = new EmployeeEntity();
    disabled.setEmail("deact-idem@example.com");
    disabled.setUsername("deact-idem@example.com");
    disabled.setPassword(passwordEncoder.encode("pass"));
    disabled.setRoles(Set.of(UserRoles.EMPLOYEE));
    disabled.setEnabled(false);
    disabled.setAccountNonExpired(true);
    disabled.setAccountNonLocked(true);
    disabled.setCredentialsNonExpired(true);
    Long id = employeeRepository.saveAndFlush(disabled).getId();

    EmployeeDTO result = employeeService.deactivate(id);

    assertThat(result.isEnabled()).isFalse();
}

@Test
void deactivate_throwsItemNotFoundForUnknownId() {
    assertThatThrownBy(() -> employeeService.deactivate(999999L))
            .isInstanceOf(ItemNotFoundException.class);
}
```

**RED state:** `employeeService.activate(id)` and `employeeService.deactivate(id)` do not compile until Step 2 adds these methods to `EmployeeService`.

#### Edge Cases

1. **Direct entity creation for disabled state:** `employeeService.insert()` always sets `enabled = true`. To test activate from a disabled starting state, the entity must be seeded directly via `employeeRepository.saveAndFlush()`. This is the same pattern used in `EmployeeAccountStatusSecurityTest`.
2. **`Set.of(UserRoles.EMPLOYEE)` immutability:** `Set.of()` returns an immutable set. Since Hibernate does not mutate the `roles` set (it replaces it), this is safe.

---

### Step 2: Add `activate()` and `deactivate()` to `EmployeeService`

**Goal:** Implement the two new methods to turn the RED tests GREEN. Both follow the established pattern of `findById` → throw if absent → mutate → save → `mapper.toDTO()`.

**Dependencies:** Step 1 (tests written and confirmed RED).

- [x] Add `activate(Long id)` method with `@PreAuthorize("hasRole('ADMIN')")` and `@Transactional`
- [x] Add `deactivate(Long id)` method with `@PreAuthorize("hasRole('ADMIN')")` and `@Transactional`
- [x] Both methods declare `throws ItemNotFoundException` in their signature

#### Implementation

```java
// File: backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeService.java
// No new imports needed — ItemNotFoundException, @PreAuthorize, @Transactional are already imported.

// Add these two methods after the existing delete() method and before the private isBlank() helper:

@PreAuthorize("hasRole('ADMIN')")
@Transactional
public EmployeeDTO activate(Long id) throws ItemNotFoundException {
    EmployeeEntity entity = employeeRepository.findById(id)
            .orElseThrow(() -> new ItemNotFoundException("Employee not found"));
    entity.setEnabled(true);
    return mapper.toDTO(employeeRepository.save(entity));
}

@PreAuthorize("hasRole('ADMIN')")
@Transactional
public EmployeeDTO deactivate(Long id) throws ItemNotFoundException {
    EmployeeEntity entity = employeeRepository.findById(id)
            .orElseThrow(() -> new ItemNotFoundException("Employee not found"));
    entity.setEnabled(false);
    return mapper.toDTO(employeeRepository.save(entity));
}
```

**No `@Override`:** These methods are not part of `DefaultService` or `DefaultServiceImplements`. They are new domain-specific operations on `EmployeeService` — no `@Override` annotation applies.

**`mapper` field:** `mapper` is `protected final DefaultMapper<...> mapper` declared in `DefaultServiceImplements` (line 35). It is directly accessible from `EmployeeService` without qualification.

**Plain `@Transactional` (no `rollbackFor`):** `findById()` happens before any mutation. If the entity is absent, `ItemNotFoundException` is thrown and there is nothing to roll back. Plain `@Transactional` is correct and consistent with the Spring default (rollback on `RuntimeException` and `Error`).

#### Edge Cases

1. **Idempotency:** Setting `enabled = true` on an already-enabled employee or `enabled = false` on an already-disabled employee is a valid no-op. JPA's `save()` still issues an `UPDATE` but the value written is the same. No conditional check is needed and no exception is thrown.
2. **`employeeRepository.save()` return value:** `save()` returns the managed entity after the `UPDATE`. `mapper.toDTO(saved)` maps the post-save state, including the new `enabled` value — this is the correct value to return to the caller.
3. **Security at two layers:** `@PreAuthorize("hasRole('ADMIN')")` enforces at the method level (requires Spring AOP to be active, confirmed by `@EnableMethodSecurity` on `SecurityConfig`). The HTTP rule `/employee/**` → `hasRole("ADMIN")` in `SecurityConfig` also enforces before the request reaches the controller. Both layers are independent defenses.

---

### Step 3: Write RED controller and security tests

**Goal:** Establish controller-level tests (HTTP contract) and an anonymous security test before the controller endpoints exist. The controller tests verify HTTP status codes and response JSON shapes. The security test verifies the anonymous caller is blocked.

**Dependencies:** Step 2 complete (service methods GREEN).

Tests are spread across **two existing test classes**:

**A — `EmployeeControllerListEndpointTest` (6 new tests):**

- [x] `activateDisabledEmployee_returns200WithEnabledTrue`
- [x] `activateAlreadyActiveEmployee_returns200Idempotent`
- [x] `activateNonExistentEmployee_returns404`
- [x] `deactivateActiveEmployee_returns200WithEnabledFalse`
- [x] `deactivateAlreadyDisabledEmployee_returns200Idempotent`
- [x] `@WithMockUser(roles = "EMPLOYEE") employeeCannotActivate_returns403`

**B — `SecurityAuthorizationTest` (1 new test):**

- [x] `anonymousRequestToActivateEndpointReturns401`

**RED state:** The controller tests fail with `404 Not Found` (unmapped path) before Step 4 adds the endpoints. The security test passes immediately (the `/employee/**` rule already blocks anonymous callers), so it is a regression guard, not a RED discriminating test.

**Why add the anonymous test to `SecurityAuthorizationTest`:** `EmployeeControllerListEndpointTest` uses `@WithMockUser(roles = "ADMIN")` at the class level. Anonymous callers cannot be simulated in a class that has a class-level `@WithMockUser`. `SecurityAuthorizationTest` manages anonymous requests without a class-level mock user and is the established home for auth-matrix tests.

#### Implementation A — `EmployeeControllerListEndpointTest`

```java
// File: backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeControllerListEndpointTest.java
// Add these imports (if not already present):
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;

// Add these 6 tests after the existing noTokenMintingEndpointExistsForEmployee test:

@Test
void activateDisabledEmployee_returns200WithEnabledTrue() throws Exception {
    // beta is enabled=false (seeded in setUp via ListQueryTestDataFactory.employee("emp-ctrl-beta", false, ...))
    mockMvc.perform(patch("/employee/" + beta.getId() + "/activate"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.enabled").value(true))
            .andExpect(jsonPath("$.username").value("emp-ctrl-beta"));
}

@Test
void activateAlreadyActiveEmployee_returns200Idempotent() throws Exception {
    // alpha is enabled=true — idempotent activation must not throw
    mockMvc.perform(patch("/employee/" + alpha.getId() + "/activate"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.enabled").value(true));
}

@Test
void activateNonExistentEmployee_returns404() throws Exception {
    mockMvc.perform(patch("/employee/999999/activate"))
            .andExpect(status().isNotFound());
}

@Test
void deactivateActiveEmployee_returns200WithEnabledFalse() throws Exception {
    // alpha is enabled=true
    mockMvc.perform(patch("/employee/" + alpha.getId() + "/deactivate"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.enabled").value(false))
            .andExpect(jsonPath("$.username").value("emp-ctrl-alpha"));
}

@Test
void deactivateAlreadyDisabledEmployee_returns200Idempotent() throws Exception {
    // beta is enabled=false — idempotent deactivation must not throw
    mockMvc.perform(patch("/employee/" + beta.getId() + "/deactivate"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.enabled").value(false));
}

@Test
@WithMockUser(roles = "EMPLOYEE")
void employeeCannotActivate_returns403() throws Exception {
    mockMvc.perform(patch("/employee/" + beta.getId() + "/activate"))
            .andExpect(status().isForbidden());
}
```

#### Implementation B — `SecurityAuthorizationTest`

```java
// File: backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java
// NO new import needed — SecurityAuthorizationTest.java:28 already has the wildcard:
//   import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
// which covers patch(). <!-- REVIEW-FIX: removed incorrect instruction to add a specific patch import;
//      the wildcard import at line 28 already provides patch() without any new import -->

// Add this test after the existing message history security tests:

@Test
void anonymousRequestToActivateEndpointReturns401() throws Exception {
    // /employee/** is hasRole("ADMIN") — anonymous caller hits 401 before reaching the controller.
    // This test uses employee ID 1 as a placeholder; the security rule fires before any DB lookup.
    mockMvc.perform(patch("/employee/1/activate"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error").value("Unauthorized"));
}
```

#### Edge Cases

1. **`beta` and `alpha` in controller tests:** These are seeded in `@BeforeEach` by `ListQueryTestDataFactory.employee("emp-ctrl-beta", false, ...)` and `ListQueryTestDataFactory.employee("emp-ctrl-alpha", true, ...)`. Their IDs are available via `beta.getId()` and `alpha.getId()`. Alphabetical ordering: `alpha` sorts before `beta` which sorts before `gamma` — the default sort in `@BeforeEach` preserves this ordering but the activate/deactivate tests do not assert on list order, only on specific IDs.
2. **Controller test isolation:** Each `@SpringBootTest` test runs with a separate `@BeforeEach` that repopulates `alpha`, `beta`, and `gamma`. Mutations from `activateDisabledEmployee_returns200WithEnabledTrue` (which modifies `beta.enabled`) do not bleed into other tests.
3. **Anonymous test placeholder ID:** The anonymous test uses ID `1` as a placeholder. The `/employee/**` HTTP security rule fires before Spring MVC routes the request to the controller — the DB is never queried, making the specific ID irrelevant.
4. **`@WithMockUser(roles = "EMPLOYEE")` on `employeeCannotActivate_returns403`:** This method-level annotation overrides the class-level `@WithMockUser(roles = "ADMIN")` for this test only. The employee role is blocked by both the HTTP rule and the service-level `@PreAuthorize("hasRole('ADMIN')")`.

---

### Step 4: Add `activate` and `deactivate` endpoints to `EmployeeController`

**Goal:** Expose the two service methods as HTTP `PATCH` endpoints. Turn the RED controller tests (currently 404) to GREEN.

**Dependencies:** Step 3 (controller tests written and confirmed RED).

- [x] Add `private final EmployeeService employeeService;` field to `EmployeeController`
- [x] Update the constructor to store `service` in the new field (in addition to passing it to `super(service)`)
- [x] Add `@PatchMapping("/{id}/activate")` method delegating to `employeeService.activate(id)`
- [x] Add `@PatchMapping("/{id}/deactivate")` method delegating to `employeeService.deactivate(id)`

#### Implementation

```java
// File: backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeController.java
// Full file after changes:

package com.agentForgeBackend.models.hq.employee;

import com.agentForgeBackend.exceptions.ItemNotFoundException;
import com.agentForgeBackend.shared.defaultImplements.DefaultController;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/employee")
public class EmployeeController extends DefaultController<EmployeeDTO, EmployeeMiniDTO, EmployeeListDTO, EmployeeForm, Long> {

    private final EmployeeService employeeService;

    public EmployeeController(EmployeeService service) {
        super(service);
        this.employeeService = service;
    }

    @PatchMapping("/{id}/activate")
    public ResponseEntity<EmployeeDTO> activate(@PathVariable Long id) throws ItemNotFoundException {
        return ResponseEntity.ok(employeeService.activate(id));
    }

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<EmployeeDTO> deactivate(@PathVariable Long id) throws ItemNotFoundException {
        return ResponseEntity.ok(employeeService.deactivate(id));
    }
}
```

#### Edge Cases

1. **`ItemNotFoundException` propagation:** `EmployeeService.activate()` and `deactivate()` declare `throws ItemNotFoundException`. The controller re-declares `throws ItemNotFoundException`. `GlobalExceptionHandler` handles `ItemNotFoundException` with HTTP 404, which is the expected response for an unknown employee ID.
2. **`ResponseEntity.ok(...)` vs `ResponseEntity.status(200).body(...)`:** `ResponseEntity.ok()` is the idiomatic shorthand. Consistent with all other `DefaultController` handlers (e.g., `getOne`, `update`, `delete` all return `ResponseEntity.ok(...)`).
3. **No `@RequestBody`:** `activate` and `deactivate` carry all required information in the path variable (`{id}`). No request body is needed or expected. A caller sending a body with a `PATCH` request will have it silently ignored.
4. **Path conflict check:** `@PatchMapping("/{id}/activate")` — `{id}` captures a Long. The path `/employee/{id}/activate` does not conflict with any existing `DefaultController` paths (`GET /{id}`, `PUT /{id}`, `DELETE /{id}`, `POST /`, `POST /list`). Spring MVC route resolution is based on both HTTP method and path; `PATCH` is not used by any inherited endpoint.
5. **Spring Security HTTP rule:** The `/employee/**` → `hasRole("ADMIN")` pattern in `SecurityConfig` matches both `/employee/{id}/activate` and `/employee/{id}/deactivate`. No `SecurityConfig` change is needed.

---

## Design Decisions

**Decision 1: `activate()` and `deactivate()` live in `EmployeeService`, not a new `EmployeeActivationService`**
- **Why:** All employee lifecycle operations are concentrated in `EmployeeService` — this is the existing pattern (insert, update, delete, getOne, getAll). Adding two more lifecycle operations deepens the same module rather than fragmenting it. A separate service would be a shallow pass-through (deletion test: removing it would scatter one method to `EmployeeService` anyway). SRP is preserved: the module's single responsibility is employee lifecycle management.
- **Alternatives considered:** New `EmployeeActivationService` (rejected — pure pass-through; no additional complexity hidden; splits related operations across files without architectural benefit).

**Decision 2: Typed `EmployeeService` reference in `EmployeeController`**
- **Why:** `DefaultController` stores the service as the generic `DefaultService<...>` interface. `activate()` and `deactivate()` are not on this interface. Casting (`(EmployeeService) defaultService`) would work but is fragile — a future type hierarchy change would silently compile and fail at runtime. Storing `private final EmployeeService employeeService` gives compile-time type safety with no runtime overhead (same object, second reference).
- **Alternatives considered:** Casting `(EmployeeService) defaultService` inline in each method (rejected — implicit assumption about the runtime type, not enforced by the compiler; pattern inconsistent with the `LlmModelController` dual-reference approach which stores typed collaborators explicitly).

**Decision 3: HTTP 200 (not 204) for activate and deactivate responses**
- **Why:** Both endpoints return a populated `EmployeeDTO` body that includes the new `enabled` state. HTTP 200 with a body is the standard response for a successful mutation that returns the updated resource. HTTP 204 (No Content) would discard the DTO, requiring the caller to issue a separate `GET /employee/{id}` to confirm the state change.
- **Alternatives considered:** HTTP 204 No Content (rejected — the caller needs the updated DTO to confirm the new `enabled` value and display it in the UI; matching the HTTP 200 pattern of `update()` and `delete()` in `DefaultController` which also return the modified resource).

**Decision 4: Plain `@Transactional` without `rollbackFor`**
- **Why:** The only exception thrown by `activate()` and `deactivate()` is `ItemNotFoundException`, which is thrown by `findById().orElseThrow()` before any mutation. There is nothing to roll back if the entity is absent. For successful paths, Spring's default transaction commit semantics apply. `rollbackFor` is only needed when a checked exception can be thrown *after* data modification — as `update()` does with `ItemAlreadyExist`.
- **Alternatives considered:** `@Transactional(rollbackFor = ItemNotFoundException.class)` (rejected — unnecessary overhead; exception is thrown pre-mutation; adds noise without behavioral difference).

**Decision 5: Test distribution — service tests in `EmployeeServiceCrudIntegrationTest`, controller/HTTP tests in `EmployeeControllerListEndpointTest`, auth tests in `SecurityAuthorizationTest`**
- **Why:** Follows the established project test architecture where each test class has a focused responsibility: `EmployeeServiceCrudIntegrationTest` tests service behavior (no HTTP, `@WithMockUser`); `EmployeeControllerListEndpointTest` tests HTTP contract through `MockMvc` (with `@WithMockUser` at class level); `SecurityAuthorizationTest` tests the auth matrix (anonymous + role denial). Mixing anonymous callers into `EmployeeControllerListEndpointTest` is impossible because the class-level `@WithMockUser(roles = "ADMIN")` provides mock authentication for all tests.
- **Alternatives considered:** New `EmployeeActivateDeactivateControllerTest` class (rejected — the existing `EmployeeControllerListEndpointTest` is the correct home for controller HTTP tests; fragmenting into a third controller test class adds navigation overhead without architectural benefit; prior tasks extended existing test classes rather than creating duplicates).

---

## Testing Considerations

### Automatic Validation

**TDD Cycle 1 — Service layer (Steps 1 → 2):**

- [ ] Write 6 new service tests in `EmployeeServiceCrudIntegrationTest` (Step 1) — tests fail to compile because `activate()` / `deactivate()` do not exist yet (**RED state = compilation error**) **⚠ Manual: Java 21 runtime required**
- [ ] Run `./mvnw -pl backend test -Dtest=EmployeeServiceCrudIntegrationTest#activate_setsEnabledTrueForDisabledEmployee` → confirm RED **⚠ Manual: Java 21 runtime required**
- [ ] Implement `activate()` and `deactivate()` in `EmployeeService` (Step 2)
- [ ] Run `./mvnw -pl backend test -Dtest=EmployeeServiceCrudIntegrationTest` → confirm all 23 tests GREEN (17 existing + 6 new) **⚠ Manual: Java 21 runtime required**

**TDD Cycle 2 — Controller layer (Steps 3 → 4):**

- [ ] Write 6 controller tests in `EmployeeControllerListEndpointTest` and 1 security test in `SecurityAuthorizationTest` (Step 3)
- [ ] Run `./mvnw -pl backend test -Dtest=EmployeeControllerListEndpointTest#activateDisabledEmployee_returns200WithEnabledTrue` → confirm RED (currently 404 — endpoint not mapped) **⚠ Manual: Java 21 runtime required**
- [ ] Implement `activate` and `deactivate` endpoints in `EmployeeController` (Step 4)
- [ ] Run `./mvnw -pl backend test -Dtest=EmployeeControllerListEndpointTest` → confirm all 19 tests GREEN (13 existing + 6 new) **⚠ Manual: Java 21 runtime required**
- [ ] Run `./mvnw -pl backend test -Dtest=SecurityAuthorizationTest` → confirm all existing tests still pass + new anonymous activate test GREEN **⚠ Manual: Java 21 runtime required**

**Full regression:**

- [ ] Run `./mvnw -pl backend test` → all existing tests pass + count increases by 13 (6 service + 6 controller + 1 security) **⚠ Manual: Java 21 runtime required**
- [ ] Confirm `EmployeeAccountStatusSecurityTest` (3 tests from Task 1) still GREEN — no regression from controller additions **⚠ Manual: Java 21 runtime required**
- [ ] Confirm `EmployeeMapperTest` (12 tests including 2 from Task 2) still GREEN — no regression **⚠ Manual: Java 21 runtime required**

### Manual Validation

No manual validation is required for this task. All behaviors are verifiable through the automated test suite using `MockMvc` integration tests and service-layer `@SpringBootTest` tests.

---

## Related Code Explanations

- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeService.java:137` — `delete()` is the closest prior art: load by `findById`, throw if absent, act on entity, return DTO. `activate()` and `deactivate()` follow the same pattern.
- `backend/src/main/java/com/agentForgeBackend/shared/defaultImplements/DefaultServiceImplements.java:35` — `protected final DefaultMapper<...> mapper` — confirms `mapper.toDTO(...)` is accessible from `EmployeeService` without qualification.
- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeDTO.java:30` — `private boolean enabled;` — the field in the return DTO that confirms activation state to the caller; added in Task 2.
- `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java` — `/employee/**` → `hasRole("ADMIN")` rule covers activate and deactivate paths; no changes needed to `SecurityConfig`.
- `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeControllerListEndpointTest.java:74` — `alpha`, `beta`, `gamma` seed employees; `beta` (`enabled=false`) and `alpha` (`enabled=true`) are used as discriminating inputs for the new controller tests.

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected for this task
- [x] Up-to-date documentation reviewed for the affected technologies
- [x] `EmployeeService` has `activate(Long id)` and `deactivate(Long id)` with `@PreAuthorize("hasRole('ADMIN')")`, `@Transactional`, and `throws ItemNotFoundException`
- [x] `EmployeeController` has `private final EmployeeService employeeService` field initialized in constructor, plus `@PatchMapping("/{id}/activate")` and `@PatchMapping("/{id}/deactivate")` endpoints returning `ResponseEntity<EmployeeDTO>`
- [x] `EmployeeServiceCrudIntegrationTest` has 6 new tests: `activate_setsEnabledTrueForDisabledEmployee`, `activate_isIdempotentWhenEmployeeAlreadyEnabled`, `activate_throwsItemNotFoundForUnknownId`, `deactivate_setsEnabledFalseForActiveEmployee`, `deactivate_isIdempotentWhenEmployeeAlreadyDisabled`, `deactivate_throwsItemNotFoundForUnknownId`
- [x] `EmployeeControllerListEndpointTest` has 6 new tests: `activateDisabledEmployee_returns200WithEnabledTrue`, `activateAlreadyActiveEmployee_returns200Idempotent`, `activateNonExistentEmployee_returns404`, `deactivateActiveEmployee_returns200WithEnabledFalse`, `deactivateAlreadyDisabledEmployee_returns200Idempotent`, `employeeCannotActivate_returns403`
- [x] `SecurityAuthorizationTest` has 1 new test: `anonymousRequestToActivateEndpointReturns401`
- [x] All implementation steps checked off
- [x] Automatic validation deferred (Java 21 runtime not available in execution environment — consistent with Tasks 1 and 2; runtime validation checklist remains documented below for manual execution)
- [x] No manual validation steps required
- [x] Parent document `Features/to-do/Employee-Self-Registration-and-Admin-Activation` Phase 3 step checkboxes marked `[x]` and wiki link added for this task

---

## Post-Review Notes

### 2026-06-22 — Task Executed and Autonomous Review

**Implementation:** All 5 files modified as specified: `EmployeeService.java` (2 new methods: `activate`, `deactivate`), `EmployeeController.java` (full rewrite with typed `EmployeeService` field + 2 `@PatchMapping` endpoints), `EmployeeServiceCrudIntegrationTest.java` (6 new tests), `EmployeeControllerListEndpointTest.java` (6 new tests), `SecurityAuthorizationTest.java` (1 new test). Total new tests: 13 (6 service + 6 controller + 1 security).

**Review findings:** One issue found and patched during review:
- **`EmployeeServiceCrudIntegrationTest` orphaned tests:** The `deleteThrowsItemNotFoundForNonExistentId` edit displaced the two `getOne` tests outside the class closing brace. Fixed by removing the duplicate closing brace and reinserting `getOneReturnsCorrectEmployee` and `getOneThrowsItemNotFoundForNonExistentId` inside the class. All 23 tests (17 existing + 6 new) now properly enclosed.

**All other files:** Zero findings. All 5 files match the Task document specification exactly:
- `EmployeeService.activate()` / `deactivate()` — correct `@PreAuthorize`, `@Transactional`, `findById` → `ItemNotFoundException`, `setEnabled`, `save`, `mapper.toDTO()`.
- `EmployeeController` — correct dual-injection pattern (`super(service)` + `this.employeeService = service`), correct `@PatchMapping` paths with `@PathVariable`, correct `ResponseEntity.ok()` return.
- Tests — correct seed patterns (direct entity creation for disabled state, `employeeService.insert()` for enabled state), correct assertions (DTO field + DB verification for service; HTTP status + JSON path for controller), correct security tests (`@WithMockUser(roles = "EMPLOYEE")` for 403, anonymous for 401).

**Deferred:** Runtime validation via `./mvnw -pl backend test` requires Java 21, which is not available in the execution environment. Same constraint as Tasks 1 and 2. All automated test checkboxes below remain unchecked pending manual execution with Java 21.
