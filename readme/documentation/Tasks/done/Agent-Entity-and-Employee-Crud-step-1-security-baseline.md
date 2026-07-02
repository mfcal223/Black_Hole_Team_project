# Task: Security Baseline for Agent Endpoints

#task #current #low-complexity #parent-agent-entity-and-employee-crud

**Parent:** [[Agent-Entity-and-Employee-Crud]]
**Parent Type:** Feature
**Related Step(s):** Phase 1 — Steps 1.1, 1.2
**Estimated Complexity:** Low

---

## Goal

Gate all `/agent/**` routes at the HTTP security layer so that unauthenticated requests receive `401`, non-Employee authenticated requests (Admin and Client) receive `403`, and only `ROLE_EMPLOYEE` callers can proceed — before any `AgentController` exists.

---

## Parent Context

The feature defines four implementation tasks. This is Task 1 — the security baseline. The parent mandates that the security gate must be enforced at the HTTP route level before the controller is written, so that when Task 3 creates `AgentController`, the employee-only gate is already in place and no `SecurityConfig` change will be needed at that point.

The parent's authorization decisions:
- `/agent/**` → `hasRole("EMPLOYEE")` in `SecurityConfig.securityFilterChain()`. This is the first `ROLE_EMPLOYEE` HTTP rule in the system — all previous rules use `hasRole("ADMIN")` or `authenticated()`.
- `AgentService` will additionally carry `@PreAuthorize("hasRole('EMPLOYEE')")` on all public methods for defense-in-depth — that is Task 3's responsibility.
- Admins have no agent management access. The HTTP rule blocks them before they reach `AgentService.getAuthUserEmployeeEntity()`, preventing the runtime error identified in Review Finding 1.

**Phase 1 test exception (Review Finding 7 resolution):** Steps 1.1 tests use `@WithMockUser(roles = "EMPLOYEE")` and `@WithMockUser(roles = "ADMIN")` — not real JWT tokens from `TestAuthenticationHelper` — because no `AgentController` exists yet. Real JWT endpoint tests belong in Phase 3–4 once the controller is wired.

**Key difference from prior security baselines (LlmModel, AppSettings):** Those features gated admin-only endpoints — the RED test was the Employee 403. For Agent, the endpoint is employee-only — the RED test is Admin 403. Before the rule exists, Admin falls through to `anyRequest().authenticated()` (gets 404, passes auth); the test expects 403, so it fails. This reversal is intentional.

---

## Preconditions / Dependencies

- `SecurityConfig` contains the HTTP authorization matrix with `/employee/**` and `/admin/**` → `hasRole("ADMIN")`, `/client/**` → `authenticated()`, and `anyRequest()` → `authenticated()`. Verify the actual file before proceeding — prior task documents for LlmModel and AppSettings mention rules for those paths, but confirm the on-disk state of `SecurityConfig.java` matches what this task builds on.
- `SecurityAuthorizationTest.java` exists with 6 passing tests covering `/admin/list` (401, 403, 200) and login/protected-route cases (login public, anonymous 401, admin 200).
- `TestAuthenticationHelper` is `@Autowired` in `SecurityAuthorizationTest`; `initializeMockUsers()` is called in `@BeforeEach`. No employee token needed for Phase 1 (`@WithMockUser` is used instead).
- **`EmployeeLoginJwtTest.java` compilation prerequisite (High risk):** <!-- REVIEW-FIX: Added to prevent Maven compilation failure that would block all test steps -->
  `EmployeeLoginJwtTest.java` exists on disk as an untracked file at `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeLoginJwtTest.java`. It calls `authHelper.initializeEmployeeMockUser()` and `authHelper.getEmployeeToken()`. Maven compiles all `src/test/java/**/*.java` before running any test — including when targeting a single class with `-Dtest=SecurityAuthorizationTest`. If `TestAuthenticationHelper` does not have these methods, every Maven test command in this task will fail to compile before any test runs.
  **Action before starting this task:** Check whether `TestAuthenticationHelper` has `initializeEmployeeMockUser()` and `getEmployeeToken()`. If not, add them following the implementation in `documentation/Tasks/done/Employee-User-Entity-and-Role-step-4-login-jwt-role.md` (Step 1). This takes 5 minutes and unblocks all test steps.
- `spring-security-test` is on the test classpath — `@WithMockUser` is already used in `AdminControllerListEndpointTest` and others. No new dependency required.
- Spring Boot 3.4.1 / Spring Security 6.4.x in use.
- H2 in-memory database configured via `application-test.properties`.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — Selected — task template, document location conventions, doc config
- `solid-deep-design` — Selected — `SecurityConfig` owns all security configuration (SRP); additive extension via one `requestMatchers` rule respects OCP; no new dependencies (DIP satisfied)
- `tdd` — Selected — write failing test first (RED), add security rule (GREEN), verify full suite (VERIFY)
- `memory-bank` — Selected — architecture, known-issues, and context loaded; current SecurityConfig baseline confirmed
- `glossary-management` — Not needed — no new domain terms; pure infrastructure change
- `find-docs` — Not needed — Spring Security `authorizeHttpRequests` and `@WithMockUser` patterns verified by identical patterns in existing production code and prior task documents

### Documentation Reviewed

- `documentation/Tasks/done/Llm-Model-Entity-and-Admin-Crud-step-1-security-baseline.md` — established the Phase 1 `@WithMockUser` pattern (3 tests: anonymous, employee, admin); direct template for structure
- `documentation/Tasks/done/App-Settings-Entity-and-Admin-Configuration-step-1-security-baseline.md` — second prior art; shows real-JWT approach but Phase 1 exception applies here
- `documentation/Bugs/done/Review-of-Agent-Entity-and-Employee-Crud.md` — Finding 1 mandates `hasRole("EMPLOYEE")` at HTTP layer; Finding 7 mandates `@WithMockUser` for Phase 1
- `documentation/Features/to-do/Agent-Entity-and-Employee-Crud.md` — parent feature; Steps 1.1 and 1.2 specify the rule, placement, and test requirements

### Related Existing Code

- `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java:58-65` — `authorizeHttpRequests` block; new rule inserted before `anyRequest().authenticated()`
- `backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java` — existing test class; 3 new tests added here
- `backend/src/test/java/com/agentForgeBackend/testUtils/TestAuthenticationHelper.java` — JWT helper; not needed for Phase 1 tests but will be the source of employee tokens in Phase 3–4
- `backend/src/main/java/com/agentForgeBackend/configuration/filter/JWTTokenValidatorFilter.java` — validates the `Authorization` header and sets `SecurityContext`; `@WithMockUser` tests bypass this filter by installing a synthetic SecurityContext before the filter chain runs

---

## Implementation Details

### Approach

Two files are modified. No new files are created.

**TDD order:**
1. **RED** — Add 3 tests to `SecurityAuthorizationTest.java`. Before the security rule exists:
   - `anonymousRequestToAgentEndpointReturns401` — **PASSES** immediately (`anyRequest().authenticated()` already returns 401 for unauthenticated requests).
   - `employeeRequestToAgentEndpointPassesSecurity` — **PASSES** immediately (`@WithMockUser` employee is authenticated, hits `anyRequest().authenticated()`, no handler → 404).
   - `adminRequestToAgentEndpointReturns403` — **FAILS** (admin is authenticated, hits `anyRequest().authenticated()` → 404; test expects 403). **This is the discriminating RED test.**
2. **GREEN** — Add `.requestMatchers("/agent/**").hasRole("EMPLOYEE")` to `SecurityConfig`. All 3 tests now pass (admin now hits the `/agent/**` rule first → `hasRole("EMPLOYEE")` fails → 403).
3. **VERIFY** — Run `./mvnw test` to confirm no regressions in the pre-existing test suite.

**SOLID analysis:**
- **SRP**: `SecurityConfig` owns the entire security contract. Adding one rule is within its single responsibility.
- **OCP**: The `authorizeHttpRequests` block is designed for additive extension. No existing rule is edited.
- **DIP**: No new dependencies introduced; the existing Spring Security fluent API is reused.

**Depth analysis:** `SecurityConfig` is a deep module — all JWT filtering, CORS, exception handling, and authorization hides behind a tiny `@Bean`-annotated surface. This task adds one line to the implementation without touching the surface.

**Why `@WithMockUser` instead of real JWT tokens:** No `AgentController` exists in Phase 1. `@WithMockUser` installs a synthetic `SecurityContext` that exercises the full HTTP authorization check without requiring a handler mapping to exist. The discriminating `adminRequestToAgentEndpointReturns403` test fails before the rule (gets 404) and passes after (gets 403) — a clean RED→GREEN cycle with no controller dependency.

### Files to Create/Modify

- [ ] `backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java` — **MODIFY** — add `@WithMockUser` import + 3 new tests (TDD RED phase)
- [ ] `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java` — **MODIFY** — add one `requestMatchers` rule (TDD GREEN phase)

---

## Step-by-Step Implementation

### Step 1: Add 3 Agent Security Tests to SecurityAuthorizationTest (TDD RED)

**Goal:** Write the 3 tests that define the expected security behavior for `/agent/**` routes. Exactly 1 test fails initially (`adminRequestToAgentEndpointReturns403`); the other 2 pass. This provides the observable RED signal before any `SecurityConfig` change.

**Dependencies:** `SecurityAuthorizationTest.java` exists with 6 passing tests. `spring-security-test` is on the classpath (verified from `AdminControllerListEndpointTest` usage of `@WithMockUser`).

- [ ] Open `SecurityAuthorizationTest.java`
- [ ] Add import: `import org.springframework.security.test.context.support.WithMockUser;`
- [ ] Append the 3 tests at the end of the class body, after `authenticatedRequestToProtectedEndpointReturns200` and before the closing `}`
- [ ] Run `./mvnw test -Dtest=SecurityAuthorizationTest` from `backend/` and confirm:
  - `adminRequestToAgentEndpointReturns403` FAILS with `Status expected: <403> but was: <404>`
  - `anonymousRequestToAgentEndpointReturns401` PASSES
  - `employeeRequestToAgentEndpointPassesSecurity` PASSES
  - All 6 original tests still pass (8 pass total, 1 fails)

**Why this step is critical:** The failing admin 403 test is the observable proof that the security rule is absent. Without a RED test, adding the rule to `SecurityConfig` has no test-driven validation — a misplaced or mistyped rule would be undetectable.

#### Implementation

Add this import to `SecurityAuthorizationTest.java` (with the other imports):

```java
import org.springframework.security.test.context.support.WithMockUser;
```

Append the following 3 tests inside the class body, after the last existing test:

```java
// Agent security tests — @WithMockUser used because AgentController does not exist yet.
// Phase 3-4 controller tests will use real JWT tokens via TestAuthenticationHelper.
// This is the first ROLE_EMPLOYEE HTTP rule in SecurityConfig.

@Test
void anonymousRequestToAgentEndpointReturns401() throws Exception {
    mockMvc.perform(post("/agent/list")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{}"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.error").value("Unauthorized"));
}

@Test
@WithMockUser(roles = "EMPLOYEE")
void employeeRequestToAgentEndpointPassesSecurity() throws Exception {
    // Security passes for EMPLOYEE; no controller exists yet so DispatcherServlet returns 404.
    // Task 3 must update this assertion to isOk() once AgentController is created.
    mockMvc.perform(post("/agent/list")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{}"))
        .andExpect(status().isNotFound());
}

@Test
@WithMockUser(roles = "ADMIN")
void adminRequestToAgentEndpointReturns403() throws Exception {
    // Admins have no agent management access — only ROLE_EMPLOYEE may reach /agent/**.
    // Without the /agent/** rule this returns 404 (admin passes anyRequest().authenticated()).
    // With the /agent/** rule this returns 403 (hasRole("EMPLOYEE") is not satisfied for ADMIN).
    mockMvc.perform(post("/agent/list")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{}"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.error").value("Forbidden"));
}
```

**Imports check:** `post`, `status`, `jsonPath`, and `MediaType` are already imported via the existing wildcard static imports in `SecurityAuthorizationTest`. No additional imports beyond `WithMockUser` are needed.

#### Edge Cases

1. **Why `adminRequestToAgentEndpointReturns403` is the RED test:** Without the `/agent/**` rule, admin requests reach `anyRequest().authenticated()`. Admin has `ROLE_ADMIN` via `@WithMockUser` — authentication passes, no handler exists → 404. The test expects 403 → FAILS. After the rule is added, admin matches `/agent/**` first → `hasRole("EMPLOYEE")` is not satisfied → `accessDeniedHandler` → 403 → PASSES.

2. **Why `employeeRequestToAgentEndpointPassesSecurity` passes before the rule:** Without `/agent/**`, employee requests fall through to `anyRequest().authenticated()`. `@WithMockUser(roles = "EMPLOYEE")` is authenticated → no handler → 404. Test asserts `isNotFound()` → PASSES. After the rule, employee matches `/agent/**` → `hasRole("EMPLOYEE")` passes → still no handler → 404 → still PASSES. This test is a regression guard ensuring the new rule does not accidentally block employees.

3. **Why anonymous returns 401 before and after the rule:** Spring Security checks authentication status when processing the authorization decision. For an unauthenticated request, the `AuthenticationEntryPoint` fires (writes `{"error":"Unauthorized"}` with 401) regardless of whether the matched rule is `authenticated()` or `hasRole("EMPLOYEE")`. No behavior change for anonymous requests.

4. **`@WithMockUser` and `@BeforeEach` interaction:** `@BeforeEach` calls `authHelper.initializeMockUsers()`, which persists real Admin and Client rows in H2. The `@WithMockUser`-annotated tests install a synthetic `SecurityContext` independently. The DB entities do not interfere with the mock SecurityContext. No changes to `@BeforeEach` needed.

5. **`@WithMockUser(roles = "ADMIN")` authority mapping:** Spring Security's `@WithMockUser` grants the authority `ROLE_ADMIN` (the `ROLE_` prefix is added automatically when using `roles`). The new `/agent/**` → `hasRole("EMPLOYEE")` check requires `ROLE_EMPLOYEE` — an Admin principal only has `ROLE_ADMIN` and fails the check.

6. **Task 3 forward reference:** Once `AgentController` is created in Task 3 with `@RequestMapping("/agent")`, `POST /agent/list` returns a real response. The `employeeRequestToAgentEndpointPassesSecurity` test's `isNotFound()` assertion will break. The Task 3 implementer must update this test to use a real Employee JWT from `authHelper.getEmployeeToken()` and assert `isOk()` (or the real paginated 200 response).

---

### Step 2: Add `/agent/**` Rule to SecurityConfig (TDD GREEN)

**Goal:** Add a single `requestMatchers` line so all 3 tests pass. `adminRequestToAgentEndpointReturns403` is the canonical GREEN signal — it was returning 404 and must now return 403.

**Dependencies:** Step 1 tests must be in place and `adminRequestToAgentEndpointReturns403` must currently be failing.

- [ ] Open `SecurityConfig.java`
- [ ] Locate the `authorizeHttpRequests` block
- [ ] Add `.requestMatchers("/agent/**").hasRole("EMPLOYEE")` immediately before `.anyRequest().authenticated()`
- [ ] Do NOT modify any existing rule — this is a purely additive change
- [ ] Run `./mvnw test -Dtest=SecurityAuthorizationTest` from `backend/` — confirm all 9 tests pass (6 original + 3 new)

**Why this step is critical:** The rule must appear before `anyRequest().authenticated()`. Spring Security evaluates `requestMatchers` in declaration order (first-match-wins). A rule placed after `anyRequest()` would be a dead rule — `anyRequest()` fires first for every path, and the specific rule is never evaluated.

#### Implementation

The `authorizeHttpRequests` block in `SecurityConfig.java` becomes:

```java
.authorizeHttpRequests(authorize -> authorize
    .dispatcherTypeMatchers(DispatcherType.FORWARD, DispatcherType.ERROR).permitAll()
    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
    .requestMatchers("/login", "/login/").permitAll()
    .requestMatchers("/employee/**").hasRole("ADMIN")
    .requestMatchers("/admin/**").hasRole("ADMIN")
    .requestMatchers("/client/**").authenticated()
    .requestMatchers("/agent/**").hasRole("EMPLOYEE")   // ← ADD THIS LINE
    .anyRequest().authenticated()
)
```

No other changes to `SecurityConfig.java`. No new imports required — `requestMatchers` and `hasRole` are already used on the lines above.

#### Edge Cases

1. **Rule ordering (first-match-wins):** Spring Security processes matchers in declaration order. `/agent/**` is placed before `anyRequest().authenticated()`, so all Agent paths are caught by the employee-only rule. An admin hitting `/agent/anything` matches `/agent/**` → `hasRole("EMPLOYEE")` fails → `accessDeniedHandler` → 403. `anyRequest()` is never reached for these paths.

2. **No controller yet:** The rule evaluates at request time; Spring does not validate handler existence at startup. The rule immediately enforces EMPLOYEE-only access regardless of whether any controller is mapped.

3. **Placement between `/client/**` and `anyRequest()`:** All specific path matchers above `anyRequest()` cover disjoint namespaces, so their relative order among themselves does not affect correctness. Placing `/agent/**` after `/client/**` groups employee-facing rules semantically after admin-facing rules.

4. **`hasRole("EMPLOYEE")` blocks ALL non-employees:** Admin principals have `ROLE_ADMIN` only; Client principals have `ROLE_CLIENT` only. Neither satisfies `hasRole("EMPLOYEE")`. Both receive 403. Only Employee principals (with `ROLE_EMPLOYEE`) pass.

5. **Future `AgentController`:** When Task 3 creates `AgentController` with `@RequestMapping("/agent")`, the security rule already covers all its endpoints. Task 3 does not need to touch `SecurityConfig`.

---

### Step 3: Verify Full Test Suite (Regression Check)

**Goal:** Confirm the security rule addition does not break any pre-existing tests.

**Dependencies:** Step 2 complete.

- [ ] Run `./mvnw test` from `backend/`
- [ ] Confirm `SecurityAuthorizationTest` shows 9 tests, 0 failures
- [ ] Confirm all previously passing test classes pass
- [ ] Confirm 0 test failures (the pre-existing `authServerApplicationTests.contextLoads` error requires Docker PostgreSQL — it is expected when Docker Compose is not running)

**Why this step is critical:** The `authorizeHttpRequests` block is global configuration. A typo in the pattern (e.g., `/**` instead of `/agent/**`) would apply the EMPLOYEE-only rule to all routes, breaking every existing admin and client test. The full suite run catches such mistakes immediately.

#### Edge Cases

1. **`@WithMockUser(roles = "ADMIN")` in existing tests:** All existing admin-using tests target `/admin/list` and `/employee/**` — paths covered by `hasRole("ADMIN")` rules, not affected by the new `/agent/**` rule. The new rule does not interfere.

2. **Test count:** Step 1 adds 3 tests. The expected post-implementation count for `SecurityAuthorizationTest` is 9 (6 original + 3 new). The full suite count depends on what was previously committed and tested; treat the pre-Step-1 suite count as the baseline and confirm it increases by exactly 3.

---

## Design Decisions

**Decision 1: Add tests to `SecurityAuthorizationTest`, not a new class**
- **Why:** `SecurityAuthorizationTest` is the canonical home for HTTP filter-chain behavior tests. All security-matrix assertions must be co-located for auditability. Creating `AgentSecurityTest` would fragment the security test surface; the matrix is a cross-domain concern.
- **Alternatives considered:** Separate `AgentSecurityTest` class. Rejected — inconsistent with the convention established by LlmModel and AppSettings security tests.

**Decision 2: Use `@WithMockUser` for Phase 1 tests**
- **Why:** No `AgentController` exists in Phase 1. The LlmModel step-1 prior art established `@WithMockUser` as the correct Phase 1 mechanism (Review Finding 7 repeated this for Agent). `@WithMockUser` installs a synthetic `SecurityContext` that exercises the full HTTP authorization check without requiring a handler mapping. It is already used in existing tests in this project.
- **Alternatives considered:** Real JWT tokens from `TestAuthenticationHelper`. Rejected — Phase 1 has no controller; a meaningful positive assertion for the employee case requires a real response, which only exists after Phase 3.

**Decision 3: 3 tests (anonymous, employee, admin) — not 4**
- **Why:** Anonymous guards against regressions in the catch-all rule; employee verifies the new rule does not accidentally block the intended caller; admin is the discriminating RED test (verifies non-employees are blocked). A fourth `@WithMockUser(roles = "CLIENT")` test would cover the same blocking behavior as admin and is redundant for Phase 1 validation. Client blocking is covered in Phase 3–4 controller integration tests.
- **Alternatives considered:** 4 tests adding a Client 403 case. Not wrong; rejected as unnecessary for the Phase 1 security baseline goal.

**Decision 4: `/agent/**` rule placed between `/client/**` and `anyRequest()`**
- **Why:** The feature specifies "before `anyRequest().authenticated()`." Placing it after `/client/**` preserves readability: admin-only rules → client auth rule → employee-only rule → catch-all. Functional correctness is identical for any position above `anyRequest()` since paths are disjoint.
- **Alternatives considered:** Placing before `/client/**`. Functionally equivalent. Rejected in favor of grouping employee-facing endpoints last among the specific matchers.

**Decision 5: Employee test asserts `isNotFound()` (404), not 2xx**
- **Why:** No `AgentController` is mapped in Phase 1. When security passes and no handler exists, `DispatcherServlet` returns 404. Asserting 404 confirms security passed (not 401/403) while accurately reflecting the current deployment state. The comment in the test documents that Task 3 must update this assertion.
- **Alternatives considered:** Not testing the employee positive case in Phase 1. Rejected — without this test, accidentally blocking employees with the new rule goes undetected until Phase 3.

---

## Testing Considerations

### Automatic Validation

- [ ] From `backend/`: run `./mvnw test -Dtest=SecurityAuthorizationTest` after Step 1 — confirm exactly **1 test fails**: `adminRequestToAgentEndpointReturns403` (expected: 403, actual: 404); all other 8 tests pass
- [ ] From `backend/`: run `./mvnw test -Dtest=SecurityAuthorizationTest` after Step 2 — confirm all **9 tests pass** (6 original + 3 new)
- [ ] From `backend/`: run `./mvnw test` after Step 2 — confirm the full suite passes with 0 failures (excluding the pre-existing `authServerApplicationTests.contextLoads` Docker blocker if Docker is not running)

### Manual Validation

- [ ] (Optional, requires Docker Compose) Start the backend and run: `curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/agent/list -H "Content-Type: application/json" -d "{}"` — confirm response code is `401`
- [ ] (Optional, requires Docker Compose) Obtain an Admin JWT via `POST /login` with admin credentials. Run: `curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/agent/list -H "Content-Type: application/json" -H "Authorization: Bearer <admin-token>" -d "{}"` — confirm response is `403`
- [ ] (Optional, requires Docker Compose) Obtain an Employee JWT via `POST /login` with employee credentials. Run the same request with the employee token — confirm response is `404` (security passes, no controller yet)

---

## Related Code Explanations

- `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java:58-65` — the `authorizeHttpRequests` block; the new `/agent/**` rule is inserted before `anyRequest().authenticated()`
- `backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java` — full security test class; 3 new agent tests appended after the existing 6
- `backend/src/test/java/com/agentForgeBackend/testUtils/TestAuthenticationHelper.java` — JWT helper; not used in Phase 1 but will provide `getEmployeeToken()` for Phase 3–4 agent controller tests once employee support is fully initialized
- `backend/src/main/java/com/agentForgeBackend/configuration/filter/JWTTokenValidatorFilter.java` — JWT filter; `@WithMockUser` bypasses it by installing a synthetic `SecurityContext` before the filter chain runs

---

## Completion Criteria

- [ ] Parent document reviewed and reflected accurately in this task
- [ ] Relevant skills reviewed and selected for this task
- [ ] Spring Security 6.4.x authorization patterns verified against existing codebase (identical patterns already in production code and prior task documents)
- [ ] `SecurityAuthorizationTest.java` modified — `@WithMockUser` import added; 3 new tests appended (`anonymousRequestToAgentEndpointReturns401`, `employeeRequestToAgentEndpointPassesSecurity`, `adminRequestToAgentEndpointReturns403`)
- [ ] `SecurityConfig.java` modified — `.requestMatchers("/agent/**").hasRole("EMPLOYEE")` added before `anyRequest().authenticated()`
- [ ] From `backend/`: `./mvnw test -Dtest=SecurityAuthorizationTest` passes with 9 tests (6 original + 3 new)
- [ ] From `backend/`: `./mvnw test` passes — 0 failures (excluding pre-existing `authServerApplicationTests.contextLoads` Docker blocker)
- [ ] Task 3 forward-reference comment present in `employeeRequestToAgentEndpointPassesSecurity` test body
- [ ] Manual validation steps documented for the user when Docker is available
- [ ] Parent feature Phase 1 Steps 1.1 and 1.2 ready to be marked complete after execution
