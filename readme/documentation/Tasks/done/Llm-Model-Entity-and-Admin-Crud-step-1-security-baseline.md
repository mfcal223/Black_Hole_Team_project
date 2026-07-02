# Task: Security Baseline for LlmModel Endpoints

#task #current #low-complexity #parent-llm-model-entity-and-admin-crud

**Parent:** [[Llm-Model-Entity-and-Admin-Crud]]
**Parent Type:** Feature
**Related Step(s):** Phase 1 — Steps 1.1, 1.2
**Estimated Complexity:** Low

---

## Goal

Gate all `/llm-model/**` routes at the HTTP security layer so that unauthenticated requests receive `401`, Employee requests receive `403`, and only Admin callers can proceed — before any `LlmModelController` exists.

---

## Parent Context

The feature defines four implementation tasks. This is Task 1 — the security baseline. The parent specifies that security must be enforced at the HTTP route level before the controller is written, so that when Task 3 creates `LlmModelController`, the admin-only gate is already in place and no `SecurityConfig` change will be needed at that point.

The parent's authorization decision:
- `/llm-model/**` → `hasRole("ADMIN")` in the `SecurityConfig.securityFilterChain()` authorization matrix
- `LlmModelService` will additionally carry `@PreAuthorize("hasRole('ADMIN')")` on every method (defense-in-depth, implemented in Task 3)
- Employees cannot access any LlmModel management endpoint

**Phase 1 test exception (from Finding 5 of the review bug):** The feature explicitly states that Step 1.1 tests should use `@WithMockUser` rather than real JWT tokens because no `LlmModelController` exists yet. Real JWT tests require a known endpoint that returns a meaningful response. `@WithMockUser` allows asserting `401`/`403`/`404` against an unregistered route cleanly. Phase 3–4 controller tests will use the full `TestAuthenticationHelper` JWT pattern.

---

## Preconditions / Dependencies

- [[Employee-User-Entity-and-Role-step-1-security-hardening]] is complete: `@EnableMethodSecurity` is already on `SecurityConfig`, and `authorizeHttpRequests` with the full existing matrix (`/employee/**`, `/admin/**`, `/client/**`) is already in place.
- `SecurityAuthorizationTest.java` exists with 6 passing tests covering `/admin/**` and the login/protected-route cases.
- All 349 existing tests pass (`./mvnw test`), with one pre-existing failure: `authServerApplicationTests.contextLoads` which requires Docker PostgreSQL and is unrelated to this task.
- Spring Boot 3.4.1 / Spring Security 6.4.x in use (verified from `backend/pom.xml`).
- `spring-security-test` is on the test classpath — `@WithMockUser` is already used in `AdminControllerListEndpointTest`, `EmployeeControllerListEndpointTest`, and others.
- H2 in-memory database is configured for tests via `application-test.properties`.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — Selected — task template and document location conventions
- `solid-deep-design` — Selected — SecurityConfig owns all security configuration (SRP); additive extension respects OCP
- `tdd` — Selected — write failing test first (RED), then add security rule (GREEN)
- `memory-bank` — Selected — architecture, known-issues, and prior task context loaded
- `glossary-management` — Not needed — no new domain terms introduced; this is pure infrastructure
- `find-docs` — Not needed — Spring Security `authorizeHttpRequests` and `@WithMockUser` syntax already verified by identical patterns in the existing codebase (Employee step-1 task, current `SecurityConfig.java`, and existing test classes)

### Documentation Reviewed

- Employee step-1 task (`documentation/Tasks/done/Employee-User-Entity-and-Role-step-1-security-hardening.md`) — prior art; this task follows the same TDD pattern for adding a new domain to the security matrix
- `documentation/Bugs/to-do/Review-of-Llm-Model-Entity-and-Admin-Crud.md` — Finding 5 resolution: Phase 1 tests use `@WithMockUser`; anonymous test asserts `401`; EMPLOYEE test asserts `403`; ADMIN test asserts `404` (no controller yet)
- `documentation/ADRs/ADR-007-admin-curated-llm-model-list.md` — confirms employees must never access LlmModel endpoints
- Current `SecurityConfig.java` — `authorizeHttpRequests` block already in place; this task adds one `requestMatchers` rule

### Related Existing Code

- `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java:58-66` — the `authorizeHttpRequests` block where the new `/llm-model/**` rule is inserted
- `backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java` — the existing security test class where the 3 new tests are added
- `backend/src/test/java/com/agentForgeBackend/testUtils/TestAuthenticationHelper.java` — provides real JWTs (not used in this task's new tests, but available for reference)
- `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeControllerListEndpointTest.java` — shows `@WithMockUser(roles = "ADMIN")` usage pattern in this project

---

## Implementation Details

### Approach

Two files are modified. No new files are created.

**TDD order:**
1. **RED** — Add 3 tests to `SecurityAuthorizationTest.java`. Before the security rule exists, the `employeeRequestToLlmModelEndpointReturns403` test fails (the employee passes `anyRequest().authenticated()` and gets `404` instead of `403`). The other two tests already pass (anonymous gets `401` from the existing `anyRequest().authenticated()` rule; admin gets `404`).
2. **GREEN** — Add `.requestMatchers("/llm-model/**").hasRole("ADMIN")` to `SecurityConfig`. All three new tests now pass.
3. **VERIFY** — Run `./mvnw test` to confirm no regressions in the 349 existing tests.

**SOLID analysis:**
- **SRP**: `SecurityConfig` owns the security contract — adding a new rule to the filter chain is its single responsibility. No other class is modified.
- **OCP**: The `authorizeHttpRequests` block is designed to be extended by adding new `requestMatchers` rules. Adding the LlmModel rule follows this pattern exactly; no existing rules are edited.
- **DIP**: The task introduces no new dependencies; it reuses the existing Spring Security abstractions already in the file.

**Depth analysis:** `SecurityConfig` is a deep module — all authentication, JWT filtering, CORS, exception handling, and authorization configuration is hidden behind a tiny Spring `@Bean`-annotated interface. This task adds one rule to the implementation without touching the interface.

**Placement of the new rule:** The rule goes between `/admin/**` and `/client/**`. All three admin-requiring rules (`/employee/**`, `/admin/**`, `/llm-model/**`) are grouped together, making the authorization matrix readable and easy to audit.

### Files to Create/Modify

- [x] `backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java` — **MODIFY** — add 3 new tests (TDD RED phase); add `@WithMockUser` import
- [x] `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java` — **MODIFY** — add one `requestMatchers` rule (TDD GREEN phase)

---

## Step-by-Step Implementation

### Step 1: Add 3 LlmModel Security Tests to SecurityAuthorizationTest (TDD RED)

**Goal:** Write the 3 tests that define the expected security behavior for `/llm-model/**` routes. Two of the three will immediately pass (anonymous 401, admin 404); the employee 403 test will fail until Step 2 adds the rule.

**Dependencies:** `SecurityAuthorizationTest.java` exists. `spring-security-test` is on the classpath.

- [x] Open `SecurityAuthorizationTest.java`
- [x] Add import: `import org.springframework.security.test.context.support.WithMockUser;`
- [x] Add the three tests below in a new comment-delimited section after the existing Step 1.2 tests
- [x] Run `./mvnw test -Dtest=SecurityAuthorizationTest` from the `backend/` directory and confirm `employeeRequestToLlmModelEndpointReturns403` fails with `Expected: 403, Was: 404`

**Why this step is critical:** The failing employee test is the observable proof that the security rule is absent. Without a red test, adding the rule to `SecurityConfig` has no test-driven validation — the rule could be silently misspelled or in the wrong position and no test would catch it.

#### Implementation

Add this import to `SecurityAuthorizationTest.java`:

```java
import org.springframework.security.test.context.support.WithMockUser;
```

Add these tests at the end of the class body, after the existing Step 1.2 block:

```java
// LlmModel security tests — @WithMockUser used because LlmModelController does not exist yet.
// Phase 3-4 controller tests will use real JWT tokens via TestAuthenticationHelper.

@Test
void anonymousRequestToLlmModelEndpointReturns401() throws Exception {
    mockMvc.perform(post("/llm-model/list")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{}"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.error").value("Unauthorized"));
}

@Test
@WithMockUser(roles = "EMPLOYEE")
void employeeRequestToLlmModelEndpointReturns403() throws Exception {
    mockMvc.perform(post("/llm-model/list")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{}"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.error").value("Forbidden"));
}

@Test
@WithMockUser(roles = "ADMIN")
void adminRequestToLlmModelEndpointPassesSecurity() throws Exception {
    // Security passes for ADMIN; no controller exists yet so DispatcherServlet returns 404.
    // This confirms the security rule does not block the admin caller.
    mockMvc.perform(post("/llm-model/list")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{}"))
        .andExpect(status().isNotFound());
}
```

#### Edge Cases

1. **`@WithMockUser` and `@BeforeEach` interaction** — `@BeforeEach` still runs before `@WithMockUser`-annotated tests and calls `initializeMockUsers()`. This creates real Admin and Client entities in H2. This is harmless for the LlmModel tests — the real users are not needed, and their presence in H2 does not interfere with the mock user's `SecurityContext`. No change to `@BeforeEach` is needed.

2. **`anonymousRequestToLlmModelEndpointReturns401` passes before the rule** — The `anyRequest().authenticated()` catch-all already requires authentication. An unauthenticated request to `/llm-model/list` will return `401` before and after the rule is added. This test is a regression guard, not a discriminating red test.

3. **`adminRequestToLlmModelEndpointPassesSecurity` returns `404` not `200`** — There is no `LlmModelController` yet. Spring Boot's `NoHandlerFoundException` (or `DispatcherServlet`'s default no-handler response) returns `404`. The test asserts `isNotFound()` intentionally — it confirms security passed (not `401`/`403`) while accepting that the route is not yet mapped. <!-- REVIEW-FIX: added forward-reference note — this test will fail after Task 3 adds the controller --> **Task 3 lifecycle note:** Once `LlmModelController` is created in Task 3, `POST /llm-model/list` will return a non-404 status (200 with a paginated response), causing this test to fail. The Task 3 implementer must either update this test to use a real Admin JWT and assert 200, or remove it entirely if Task 3's `LlmModelControllerListEndpointTest` already provides equivalent admin-reachability coverage.

4. **`@WithMockUser(roles = "EMPLOYEE")` and `accessDeniedHandler`** — When the `/llm-model/**` rule is in place, the employee's `@WithMockUser` context has `ROLE_EMPLOYEE`. The HTTP authorization check sees `hasRole("ADMIN")` is not satisfied and invokes `accessDeniedHandler`, which writes `{"status":403,"error":"Forbidden","message":"Access Denied",...}`. The test's `jsonPath("$.error").value("Forbidden")` assertion aligns with this handler output.

5. **`@WithMockUser` skips JWT filter** — `@WithMockUser` installs a `SecurityContext` before the filter chain runs. The `JWTTokenValidatorFilter` reads the `Authorization` header; since none is present in `@WithMockUser` tests, the filter passes through without setting or clearing the context. The `@WithMockUser`-installed context persists through the filter chain to the authorization check. This behavior is stable and verified by the existing `AdminControllerListEndpointTest` which uses `@WithMockUser(roles = "ADMIN")` in the same project configuration.

---

### Step 2: Add `/llm-model/**` Rule to SecurityConfig (TDD GREEN)

**Goal:** Add a single `requestMatchers` line to the `authorizeHttpRequests` block so all three tests pass.

**Dependencies:** Step 1 tests must be in place. `employeeRequestToLlmModelEndpointReturns403` must currently be failing.

- [x] Open `SecurityConfig.java`
- [x] Locate the `authorizeHttpRequests` block (lines 58–66)
- [x] Add `.requestMatchers("/llm-model/**").hasRole("ADMIN")` immediately after `.requestMatchers("/admin/**").hasRole("ADMIN")`
- [x] Do NOT modify any existing rule — this is purely additive
- [x] Save and run `./mvnw test -Dtest=SecurityAuthorizationTest` from the `backend/` directory — confirm all 9 tests pass

**Why this step is critical:** The rule must be placed before `anyRequest().authenticated()` and grouped with the other admin-only rules. An incorrect position (e.g., after `anyRequest()`) would silently produce a dead rule — the `anyRequest()` catch-all would fire first, granting Employee access.

#### Implementation

In `SecurityConfig.java`, the `authorizeHttpRequests` block becomes:

```java
.authorizeHttpRequests(authorize -> authorize
    .dispatcherTypeMatchers(DispatcherType.FORWARD, DispatcherType.ERROR).permitAll()
    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
    .requestMatchers("/login", "/login/").permitAll()
    .requestMatchers("/employee/**").hasRole("ADMIN")
    .requestMatchers("/admin/**").hasRole("ADMIN")
    .requestMatchers("/llm-model/**").hasRole("ADMIN")   // ← ADD THIS LINE
    .requestMatchers("/client/**").authenticated()
    .anyRequest().authenticated()
)
```

No other changes to `SecurityConfig.java`. No imports to add — `requestMatchers` and `hasRole` are already used on the lines above.

#### Edge Cases

1. **Rule ordering** — Spring Security evaluates `requestMatchers` rules in declaration order (first-match-wins). Placing `/llm-model/**` between `/admin/**` and `/client/**` ensures it is evaluated before the `anyRequest().authenticated()` catch-all. An Employee caller hits `/llm-model/**` → `hasRole("ADMIN")` fails → `403`. The `anyRequest()` rule is never reached for LlmModel paths.

2. **No controller yet** — The rule is evaluated at request time, not at application startup. Spring does not check whether a handler mapping exists for the matched path. The rule is effective immediately for any request to `/llm-model/**` paths, whether or not a controller handles them.

3. **Future `LlmModelController` in Task 3** — When `LlmModelController` is created in Task 3 with `@RequestMapping("/llm-model")`, the existing security rule automatically covers all its endpoints. Task 3 does not need to touch `SecurityConfig`.

---

### Step 3: Verify Full Test Suite (Regression Check)

**Goal:** Confirm that the security rule addition does not break any of the 349 existing tests.

**Dependencies:** Step 2 complete.

- [x] Run `./mvnw test` from `backend/`
- [x] Confirm `SecurityAuthorizationTest` shows 9 tests, 0 failures
- [x] Confirm all `AdminControllerListEndpointTest`, `EmployeeControllerListEndpointTest`, `ClientControllerListEndpointTest`, `AdminServiceListQueryIntegrationTest`, `EmployeeServiceCrudIntegrationTest`, `EmployeeServiceListQueryIntegrationTest` tests pass
- [x] Confirm the pre-existing `authServerApplicationTests.contextLoads` is the only failure (Docker PostgreSQL; unrelated to this task)

**Why this step is critical:** The `authorizeHttpRequests` block is a global configuration. Any rule that catches `/llm-model/**` paths erroneously (e.g., if the pattern were `/**` instead of `/llm-model/**`) would break all existing tests. The full suite run catches such mistakes.

#### Edge Cases

1. **`@WithMockUser(roles = "ADMIN")` in existing tests** — All existing controller tests that use `@WithMockUser(roles = "ADMIN")` continue to pass. The new `/llm-model/**` rule does not affect paths they test (`/admin/**`, `/employee/**`, `/client/**`). The new `@WithMockUser` tests in `SecurityAuthorizationTest` coexist with the existing real-JWT tests in the same class because `@WithMockUser` annotations are method-level only and do not affect sibling tests.

---

## Design Decisions

**Decision 1: Add tests to `SecurityAuthorizationTest`, not a new class**
- **Why:** `SecurityAuthorizationTest` is the canonical home for filter-chain behavior tests. Adding the LlmModel tests there keeps all security-matrix assertions co-located, making future audits straightforward. Creating a separate `LlmModelSecurityTest` class would split security tests by domain, which is incoherent — the security matrix is a cross-domain concern.
- **Alternatives considered:** Separate `LlmModelSecurityTest` class. Rejected because it fragments the security test surface.

**Decision 2: Use `@WithMockUser` for Phase 1 tests (Phase 1 exception)**
- **Why:** The LlmModel controller does not exist in this task. Real JWT tests (via `TestAuthenticationHelper`) require a concrete endpoint that returns a predictable non-404 response to confirm the security rule fired correctly. `@WithMockUser` avoids this dependency: it installs a synthetic `SecurityContext` that exercises the full HTTP authorization check without requiring a handler mapping to exist. The `employeeRequestToLlmModelEndpointReturns403` test is the meaningful red test — it fails before the rule (gets `404`) and passes after (gets `403`). `@WithMockUser` is used consistently in existing controller tests in this project (AdminControllerListEndpointTest, EmployeeControllerListEndpointTest), so it is not a foreign pattern.
- **Alternatives considered:** Using `TestAuthenticationHelper.initializeEmployeeMockUser()` + real Employee JWT for the employee 403 test. This is technically valid since `getEmployeeToken()` exists. Rejected because: (a) the feature document explicitly specifies `@WithMockUser` for Phase 1; (b) a real JWT test against a missing route still returns `403` from the security filter, but it also requires `initializeEmployeeMockUser()` in `@BeforeEach`, which adds complexity that belongs in the Phase 3–4 LlmModel controller tests, not the security baseline.

**Decision 3: `/llm-model/**` rule placed immediately after `/admin/**`**
- **Why:** All admin-only routes (`/employee/**`, `/admin/**`, `/llm-model/**`) are logically grouped. This grouping makes the authorization matrix auditable at a glance. Placement before `anyRequest().authenticated()` is structurally required (first-match-wins); placement adjacent to `/admin/**` is a readability choice.
- **Alternatives considered:** Placing `/llm-model/**` before `/employee/**`. Rejected as arbitrary; the order within the admin-only group does not affect behavior.

**Decision 4: No import changes to `SecurityConfig.java`**
- **Why:** `requestMatchers` and `hasRole` are already used in the existing block. No new import is required for the one-line addition. Keeping the diff minimal reduces review noise.
- **Alternatives considered:** N/A — this is a constraint, not a choice.

---

## Testing Considerations

### Automatic Validation

<!-- REVIEW-FIX: standardized all Maven commands to "from backend/" pattern, consistent with Employee step-1 prior art and Step 3 in this document -->
- [x] From `backend/`: run `./mvnw test -Dtest=SecurityAuthorizationTest` after Step 1 — confirm `employeeRequestToLlmModelEndpointReturns403` fails with expected 403 but received 404
- [x] From `backend/`: run `./mvnw test -Dtest=SecurityAuthorizationTest` after Step 2 — confirm all 9 tests pass (6 original + 3 new)
- [x] From `backend/`: run `./mvnw test` after Step 2 — confirm full suite passes with only the pre-existing `authServerApplicationTests.contextLoads` failure

### Manual Validation

- [ ] (Optional, requires Docker) Start the backend with `./mvnw spring-boot:run` (Docker Compose running). Use curl: `curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/llm-model/list -H "Content-Type: application/json" -d {}`. Without an Authorization header, confirm the response is `401`.
- [ ] (Optional, requires Docker) With a valid Employee JWT from `/login`, confirm `POST /llm-model/list` returns `403` with body `{"error":"Forbidden"}`.
- [ ] (Optional, requires Docker) With a valid Admin JWT from `/login`, confirm `POST /llm-model/list` returns a non-401/403 status (likely `404` or `400` — depends on what Spring Boot returns for an unmapped route with a JSON body).

---

## Related Code Explanations

- `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java:58-66` — the `authorizeHttpRequests` block; the new rule is inserted at line ~66 (between `/admin/**` and `/client/**`)
- `backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java` — the full security test class; 3 new tests are appended after the Step 1.2 block
- `backend/src/test/java/com/agentForgeBackend/testUtils/TestAuthenticationHelper.java` — helper available for Phase 3–4 controller tests; not used in this task's new tests
- `backend/src/main/java/com/agentForgeBackend/configuration/filter/JWTTokenValidatorFilter.java` — JWT filter; `@WithMockUser` tests bypass it (no Authorization header), but the filter does not clear the `@WithMockUser`-installed `SecurityContext`

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected for this task
- [x] Spring Security 6.4.x authorization patterns verified against existing codebase (identical patterns already in production code and Employee step-1 task)
- [x] `SecurityAuthorizationTest.java` modified — 3 new tests added + `@WithMockUser` import
- [x] `SecurityConfig.java` modified — one `requestMatchers("/llm-model/**").hasRole("ADMIN")` rule added
- [x] From `backend/`: `./mvnw test -Dtest=SecurityAuthorizationTest` passes with 9 tests (6 original + 3 new)
- [x] From `backend/`: `./mvnw test` passes — only pre-existing `authServerApplicationTests.contextLoads` failure remains
- [x] No `@WithMockUser` rationale comment needed in `SecurityConfig` — rule placement is self-explanatory
- [x] Manual validation steps documented for the user when Docker is available
- [x] Parent feature Step 1.1 and Step 1.2 ready to be marked complete after execution
