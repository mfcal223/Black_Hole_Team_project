# Task: Security Baseline for Conversation Endpoints

#task #current #low-complexity #parent-conversation-entity-and-employee-crud

**Parent:** [[Conversation-Entity-and-Employee-Crud]]
**Parent Type:** Feature
**Related Step(s):** Phase 1 — Steps 1.1, 1.2
**Estimated Complexity:** Low

---

## Goal

Gate all `/conversation/**` routes at the HTTP security layer so that unauthenticated requests receive `401`, non-Employee authenticated requests (Admin) receive `403`, and only `ROLE_EMPLOYEE` callers can proceed — before any `ConversationController` exists.

---

## Parent Context

The feature defines four implementation tasks. This is Task 1 — the security baseline. The parent mandates that the security gate must be enforced at the HTTP route level before the controller is written, so that when Task 3 creates `ConversationController`, the employee-only gate is already in place and no `SecurityConfig` change will be needed at that point.

The parent's authorization decisions:
- `/conversation/**` → `hasRole("EMPLOYEE")` in `SecurityConfig.securityFilterChain()`. This is the second `ROLE_EMPLOYEE` HTTP rule in the system — following `/agent/**` which was added in Agent Task 1.
- `ConversationService` will additionally carry `@PreAuthorize("hasRole('EMPLOYEE')")` on all public methods for defense-in-depth — that is Task 3's responsibility.
- Admins have no conversation management access. The HTTP rule blocks them before they reach any service method, preventing any runtime error from `AuthUserUtil.getAuthUserEmployeeEntity()` being called under an admin security context.

**Phase 1 test strategy:** Steps 1.1 tests use `@WithMockUser(roles = "EMPLOYEE")` and `@WithMockUser(roles = "ADMIN")` — not real JWT tokens from `TestAuthenticationHelper` — because no `ConversationController` exists yet. Real JWT endpoint tests belong in Phase 3–4 once the controller is wired. This is identical to the strategy used in Agent Task 1 (Steps 1.1, 1.2) and is the established Phase 1 pattern for employee-owned resources in this codebase.

**Key difference from admin-only security baselines (LlmModel, AppSettings):** Those features gated admin-only endpoints — the RED test was the Employee 403. For Conversation (like Agent), the endpoint is employee-only — the RED test is Admin 403. Before the rule exists, Admin falls through to `anyRequest().authenticated()` (authenticated → no handler → 404); the test expects 403, so it fails. This reversal is intentional.

**Pre-implementation review:** All 6 findings from [[Review-of-Conversation-Entity-and-Employee-Crud]] are resolved (status: Done). No open blocking issues affect Task 1.

---

## Preconditions / Dependencies

- `SecurityConfig.java` contains the HTTP authorization matrix with the `/agent/**` rule already in place (added by Agent Task 1). Current state of the `authorizeHttpRequests` block (on-disk, verified):
  ```java
  .requestMatchers("/employee/**").hasRole("ADMIN")
  .requestMatchers("/admin/**").hasRole("ADMIN")
  .requestMatchers("/client/**").authenticated()
  .requestMatchers("/agent/**").hasRole("EMPLOYEE")
  .anyRequest().authenticated()
  ```
  The new `/conversation/**` rule inserts between `/agent/**` and `anyRequest().authenticated()`.
- `SecurityAuthorizationTest.java` exists with 9 passing tests: 6 original (admin list, login, catch-all) + 3 agent security tests (added in Agent Task 1, updated in Agent Task 3). `@WithMockUser` is already imported on line 18.
- `TestAuthenticationHelper` has `initializeEmployeeMockUser()` and `getEmployeeToken()` (confirmed on-disk — added during Employee feature). These are called in `SecurityAuthorizationTest.setUp()` already.
- `@BeforeEach setUp()` in `SecurityAuthorizationTest` already: deletes clients, admins, agents, employees (FK order respected); calls `authHelper.initializeMockUsers()` and `authHelper.initializeEmployeeMockUser()`. No changes to `setUp()` are needed for Phase 1 (no `ConversationEntity` exists yet in Task 1).
  <!-- REVIEW-FIX: Added forward-reference note so Task 3 implementer does not hit FK violation blindside -->
  **Forward reference for Task 3:** When `ConversationEntity` is introduced (Task 2) and `ConversationControllerTest` is created (Task 3), the setUp() delete order in `SecurityAuthorizationTest` must be extended. `ConversationControllerTest` runs alphabetically before `SecurityAuthorizationTest` ("Co" < "Se") and may leave committed conversations in H2 that FK to the mock employee (`employee_id` is non-nullable). Without deleting them first, `employeeRepository.deleteAll()` will throw a FK constraint violation. Task 3 must add `conversationRepository.deleteAll(); conversationRepository.flush();` BEFORE `agentRepository.deleteAll()` in the `setUp()` block, following the same pattern established for `agentRepository` (see the inline comment in the current setUp() body).
- `spring-security-test` is on the test classpath — `@WithMockUser` is already used in `SecurityAuthorizationTest` and multiple other test classes. No new dependency required.
- Spring Boot 3.4.1 / Spring Security 6.4.x in use.
- H2 in-memory database configured via `application-test.properties`.
- The Agent feature (`Agent-Entity-and-Employee-Crud`) is fully complete and all 9 SecurityAuthorizationTest tests (including the agent 3) pass.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — Selected — task template, document location conventions, doc config
- `solid-deep-design` — Selected — `SecurityConfig` owns all security configuration (SRP); additive extension via one `requestMatchers` rule respects OCP; no new dependencies (DIP satisfied)
- `tdd` — Selected — write failing test first (RED), add security rule (GREEN), verify full suite (VERIFY)
- `memory-bank` — Selected — architecture, known-issues, and context loaded; current `SecurityConfig` baseline and `SecurityAuthorizationTest` state confirmed
- `glossary-management` — Not needed — no new domain terms; pure infrastructure change
- `find-docs` — Not needed — Spring Security 6.4.x `authorizeHttpRequests` and `@WithMockUser` patterns verified by identical patterns in existing production code (`SecurityConfig.java`) and prior task documents (Agent Task 1). Version-matched pattern is already in the codebase.

### Documentation Reviewed

- `documentation/Tasks/done/Agent-Entity-and-Employee-Crud-step-1-security-baseline.md` — direct prior art and structural template for this task; identical TDD pattern, same 3-test structure, same Phase 1 `@WithMockUser` rationale
- `documentation/Bugs/to-do/Review-of-Conversation-Entity-and-Employee-Crud.md` — all 6 findings resolved; no open blockers for Task 1
- `documentation/Features/to-do/Conversation-Entity-and-Employee-Crud.md` — parent feature; Steps 1.1 and 1.2 specify the rule, placement, and test requirements

### Related Existing Code

- `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java:58–66` — `authorizeHttpRequests` block; new rule inserted between `/agent/**` and `anyRequest().authenticated()`
- `backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java` — existing 9-test security test class; 3 new conversation tests appended
- `backend/src/test/java/com/agentForgeBackend/testUtils/TestAuthenticationHelper.java` — JWT helper; not used for Phase 1 tests (uses `@WithMockUser` instead), but `initializeEmployeeMockUser()` is called in `setUp()` and the employee entity is in H2 for other tests that run in the same context
- `backend/src/main/java/com/agentForgeBackend/configuration/filter/JWTTokenValidatorFilter.java` — JWT filter; `@WithMockUser` tests bypass this filter by installing a synthetic SecurityContext before the filter chain runs

---

## Implementation Details

### Approach

Two files are modified. No new files are created.

**TDD order:**
1. **RED** — Add 3 tests to `SecurityAuthorizationTest.java`. Before the security rule exists:
   - `anonymousRequestToConversationEndpointReturns401` — **PASSES** immediately (`anyRequest().authenticated()` already returns 401 for unauthenticated requests).
   - `employeeRequestToConversationEndpointPassesSecurity` — **PASSES** immediately (`@WithMockUser` employee is authenticated, hits `anyRequest().authenticated()`, no handler → 404).
   - `adminRequestToConversationEndpointReturns403` — **FAILS** (admin is authenticated, hits `anyRequest().authenticated()` → 404; test expects 403). **This is the discriminating RED test.**
2. **GREEN** — Add `.requestMatchers("/conversation/**").hasRole("EMPLOYEE")` to `SecurityConfig`. All 3 tests now pass (admin now hits the `/conversation/**` rule first → `hasRole("EMPLOYEE")` fails → 403).
3. **VERIFY** — Run `./mvnw test` to confirm no regressions in the pre-existing test suite.

**SOLID analysis:**
- **SRP**: `SecurityConfig` owns the entire security contract. Adding one rule is within its single responsibility.
- **OCP**: The `authorizeHttpRequests` block is designed for additive extension. No existing rule is edited.
- **DIP**: No new dependencies introduced; the existing Spring Security fluent API is reused.

**Depth analysis:** `SecurityConfig` is a deep module — all JWT filtering, CORS, exception handling, and authorization hides behind a tiny `@Bean`-annotated surface. This task adds one line to the implementation without touching the surface.

**Why `@WithMockUser` instead of real JWT tokens:** No `ConversationController` exists in Phase 1. `@WithMockUser` installs a synthetic `SecurityContext` that exercises the full HTTP authorization check without requiring a handler mapping to exist. The discriminating `adminRequestToConversationEndpointReturns403` test fails before the rule (gets 404) and passes after (gets 403) — a clean RED→GREEN cycle with no controller dependency. This is the established Phase 1 pattern used by Agent Task 1, LlmModel Task 1, and AppSettings Task 1.

### Files to Create/Modify

- [x] `backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java` — **MODIFY** — add 3 new `@WithMockUser` conversation security tests (TDD RED phase)
- [x] `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java` — **MODIFY** — add one `requestMatchers` rule (TDD GREEN phase)

---

## Step-by-Step Implementation

### Step 1: Add 3 Conversation Security Tests to SecurityAuthorizationTest (TDD RED)

**Goal:** Write the 3 tests that define the expected security behavior for `/conversation/**` routes. Exactly 1 test fails initially (`adminRequestToConversationEndpointReturns403`); the other 2 pass. This provides the observable RED signal before any `SecurityConfig` change.

**Dependencies:** `SecurityAuthorizationTest.java` exists with 9 passing tests. `@WithMockUser` is already imported (line 18). `spring-security-test` is on the classpath.

- [x] Open `SecurityAuthorizationTest.java`
- [x] Append the 3 tests at the end of the class body, after `adminRequestToAgentEndpointReturns403` and before the closing `}`
- [x] Run `./mvnw test -Dtest=SecurityAuthorizationTest` from `backend/` and confirm:
  - `adminRequestToConversationEndpointReturns403` FAILS with `Status expected: <403> but was: <404>`
  - `anonymousRequestToConversationEndpointReturns401` PASSES
  - `employeeRequestToConversationEndpointPassesSecurity` PASSES
  - All 9 original tests still pass (11 pass total, 1 fails)

**Why this step is critical:** The failing admin 403 test is the observable proof that the security rule is absent. Without a RED test, adding the rule to `SecurityConfig` has no test-driven validation — a misplaced or mistyped rule would be undetectable.

#### Implementation

Append the following 3 tests inside the class body, after the last existing agent test (`adminRequestToAgentEndpointReturns403`):

```java
// Conversation security tests — @WithMockUser used because ConversationController does not exist yet.
// Phase 3-4 controller tests will use real JWT tokens via TestAuthenticationHelper.
// This is the second ROLE_EMPLOYEE HTTP rule in SecurityConfig (after /agent/**).

@Test
void anonymousRequestToConversationEndpointReturns401() throws Exception {
    mockMvc.perform(post("/conversation/list")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{}"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.error").value("Unauthorized"));
}

@Test
@WithMockUser(roles = "EMPLOYEE")
void employeeRequestToConversationEndpointPassesSecurity() throws Exception {
    // Security passes for EMPLOYEE; no controller exists yet so DispatcherServlet returns 404.
    // Task 3 must update this assertion to isOk() once ConversationController is created.
    mockMvc.perform(post("/conversation/list")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{}"))
        .andExpect(status().isNotFound());
}

@Test
@WithMockUser(roles = "ADMIN")
void adminRequestToConversationEndpointReturns403() throws Exception {
    // Admins have no conversation management access — only ROLE_EMPLOYEE may reach /conversation/**.
    // Without the /conversation/** rule this returns 404 (admin passes anyRequest().authenticated()).
    // With the /conversation/** rule this returns 403 (hasRole("EMPLOYEE") is not satisfied for ADMIN).
    mockMvc.perform(post("/conversation/list")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{}"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.error").value("Forbidden"));
}
```

**Imports check:** No new imports needed. `post`, `status()`, `jsonPath()`, `MediaType`, and `@WithMockUser` are all already imported in `SecurityAuthorizationTest.java` (imported in lines 25–26 and 18 respectively).

#### Edge Cases

1. **Why `adminRequestToConversationEndpointReturns403` is the RED test:** Without the `/conversation/**` rule, admin requests reach `anyRequest().authenticated()`. Admin has `ROLE_ADMIN` via `@WithMockUser` — authentication passes, no handler exists → 404. The test expects 403 → FAILS. After the rule is added, admin matches `/conversation/**` first → `hasRole("EMPLOYEE")` is not satisfied → `accessDeniedHandler` → 403 → PASSES.

2. **Why `employeeRequestToConversationEndpointPassesSecurity` passes before the rule:** Without `/conversation/**`, employee requests fall through to `anyRequest().authenticated()`. `@WithMockUser(roles = "EMPLOYEE")` is authenticated → no handler → 404. Test asserts `isNotFound()` → PASSES. After the rule, employee matches `/conversation/**` → `hasRole("EMPLOYEE")` passes → still no handler → 404 → still PASSES. This test is a regression guard ensuring the new rule does not accidentally block employees.

3. **Why anonymous returns 401 before and after the rule:** Spring Security checks authentication status when processing the authorization decision. For an unauthenticated request, the `AuthenticationEntryPoint` fires (writes `{"error":"Unauthorized"}` with 401) regardless of whether the matched rule is `authenticated()` or `hasRole("EMPLOYEE")`. No behavior change for anonymous requests.

4. **`@WithMockUser` and `@BeforeEach` interaction:** `@BeforeEach setUp()` calls `authHelper.initializeMockUsers()` and `authHelper.initializeEmployeeMockUser()`, which persist real Admin, Client, and Employee rows in H2. The `@WithMockUser`-annotated tests install a synthetic `SecurityContext` independently of the persisted DB entities. The DB entities do not interfere with the mock SecurityContext. No changes to `@BeforeEach` needed.

5. **`@WithMockUser(roles = "ADMIN")` authority mapping:** Spring Security's `@WithMockUser` grants the authority `ROLE_ADMIN` (the `ROLE_` prefix is added automatically when using `roles`). The new `/conversation/**` → `hasRole("EMPLOYEE")` check requires `ROLE_EMPLOYEE` — an Admin principal only has `ROLE_ADMIN` and fails the check.

6. **Task 3 forward reference:** Once `ConversationController` is created in Task 3 with `@RequestMapping("/conversation")`, `POST /conversation/list` returns a real response. The `employeeRequestToConversationEndpointPassesSecurity` test's `isNotFound()` assertion will break. The Task 3 implementer must update this test to use a real Employee JWT from `authHelper.getEmployeeToken()` and assert `isOk()` (or the real paginated 200 response).

7. **No collision with agent tests:** The 3 new tests target `/conversation/list`; the existing agent tests target `/agent/list`. Both rules are independent entries in the `authorizeHttpRequests` block with disjoint path matchers. There is no interference.

---

### Step 2: Add `/conversation/**` Rule to SecurityConfig (TDD GREEN)

**Goal:** Add a single `requestMatchers` line so all 3 tests pass. `adminRequestToConversationEndpointReturns403` is the canonical GREEN signal — it was returning 404 and must now return 403.

**Dependencies:** Step 1 tests must be in place and `adminRequestToConversationEndpointReturns403` must currently be failing.

- [x] Open `SecurityConfig.java`
- [x] Locate the `authorizeHttpRequests` block
- [x] Add `.requestMatchers("/conversation/**").hasRole("EMPLOYEE")` immediately after `.requestMatchers("/agent/**").hasRole("EMPLOYEE")` and before `.anyRequest().authenticated()`
- [x] Do NOT modify any existing rule — this is a purely additive change
- [x] Run `./mvnw test -Dtest=SecurityAuthorizationTest` from `backend/` — confirm all 12 tests pass (9 original + 3 new)

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
    .requestMatchers("/agent/**").hasRole("EMPLOYEE")
    .requestMatchers("/conversation/**").hasRole("EMPLOYEE")   // ← ADD THIS LINE
    .anyRequest().authenticated()
)
```

No other changes to `SecurityConfig.java`. No new imports required — `requestMatchers` and `hasRole` are already used on the lines above.

#### Edge Cases

1. **Rule ordering (first-match-wins):** Spring Security processes matchers in declaration order. `/conversation/**` is placed before `anyRequest().authenticated()`, so all Conversation paths are caught by the employee-only rule. An admin hitting `/conversation/anything` matches `/conversation/**` → `hasRole("EMPLOYEE")` fails → `accessDeniedHandler` → 403. `anyRequest()` is never reached for these paths.

2. **No controller yet:** The rule evaluates at request time; Spring does not validate handler existence at startup. The rule immediately enforces EMPLOYEE-only access regardless of whether any controller is mapped.

3. **Placement immediately after `/agent/**`:** Both `/agent/**` and `/conversation/**` are employee-only resources and are logically grouped together. Their relative order among themselves does not affect correctness since paths are disjoint.

4. **`hasRole("EMPLOYEE")` blocks ALL non-employees:** Admin principals have `ROLE_ADMIN` only; Client principals have `ROLE_CLIENT` only. Neither satisfies `hasRole("EMPLOYEE")`. Both receive 403. Only Employee principals (with `ROLE_EMPLOYEE`) pass.

5. **Future `ConversationController`:** When Task 3 creates `ConversationController` with `@RequestMapping("/conversation")`, the security rule already covers all its endpoints. Task 3 does not need to touch `SecurityConfig`.

6. **PATCH endpoints are covered by the wildcard:** Task 3 will introduce `PATCH /conversation/{id}/model` and `PATCH /conversation/{id}/title` as custom endpoints on `ConversationController`. These paths match `/conversation/**`, so the employee-only gate applies automatically. No additional `requestMatchers` entries are required in `SecurityConfig` for these PATCH routes.
<!-- REVIEW-FIX: Added explicit note that PATCH endpoints introduced in Task 3 are already covered by the wildcard, preventing a false assumption that SecurityConfig changes would be needed for them -->

---

### Step 3: Verify Full Test Suite (Regression Check)

**Goal:** Confirm the security rule addition does not break any pre-existing tests.

**Dependencies:** Step 2 complete.

- [x] Run `./mvnw test` from `backend/`
- [x] Confirm `SecurityAuthorizationTest` shows 12 tests, 0 failures (9 original + 3 new)
- [x] Confirm all previously passing test classes pass
- [x] Confirm 0 test failures (the pre-existing `authServerApplicationTests.contextLoads` error requires Docker PostgreSQL — it is expected when Docker Compose is not running)

**Why this step is critical:** The `authorizeHttpRequests` block is global configuration. A typo in the pattern (e.g., `/**` instead of `/conversation/**`) would apply the EMPLOYEE-only rule to all routes, breaking every existing admin and client test. The full suite run catches such mistakes immediately.

#### Edge Cases

1. **`@WithMockUser(roles = "ADMIN")` in existing tests:** All existing admin-using tests target `/admin/list` and `/employee/**` — paths covered by `hasRole("ADMIN")` rules, not affected by the new `/conversation/**` rule. The new rule does not interfere.

2. **Test count:** Step 1 adds 3 tests to `SecurityAuthorizationTest`. The expected post-implementation count for that class is 12 (9 original + 3 new). The full suite count depends on the pre-Task 1 baseline — confirm it increases by exactly 3.

3. **Agent tests remain passing:** `employeeRequestToAgentEndpointPassesSecurity` now uses a real JWT token (updated in Agent Task 3). The addition of the `/conversation/**` rule does not affect agent path matching — the agent rule fires first for `/agent/**` paths.

---

## Design Decisions

**Decision 1: Add tests to `SecurityAuthorizationTest`, not a new class**
- **Why:** `SecurityAuthorizationTest` is the canonical home for HTTP filter-chain behavior tests. All security-matrix assertions must be co-located for auditability. Creating `ConversationSecurityTest` would fragment the security test surface; the authorization matrix is a cross-domain concern.
- **Alternatives considered:** Separate `ConversationSecurityTest` class. Rejected — inconsistent with the convention established by Agent Task 1, LlmModel Task 1, and AppSettings Task 1.

**Decision 2: Use `@WithMockUser` for Phase 1 tests**
- **Why:** No `ConversationController` exists in Phase 1. `@WithMockUser` installs a synthetic `SecurityContext` that exercises the full HTTP authorization check without requiring a handler mapping. It is already used in the existing agent security tests in this class. Phase 1 pattern established by Agent Task 1 (Review Finding 7 reasoning) applies here identically.
- **Alternatives considered:** Real JWT tokens from `TestAuthenticationHelper`. Rejected — Phase 1 has no controller; a meaningful positive assertion for the employee case requires a real response, which only exists after Phase 3.

**Decision 3: 3 tests (anonymous, employee, admin) — not 4**
- **Why:** Anonymous guards against regressions in the catch-all rule; employee verifies the new rule does not accidentally block the intended caller; admin is the discriminating RED test (verifies non-employees are blocked). A fourth `@WithMockUser(roles = "CLIENT")` test would cover the same blocking behavior as admin and is redundant for Phase 1 validation. Client blocking is covered in Phase 3–4 controller integration tests.
- **Alternatives considered:** 4 tests adding a Client 403 case. Not wrong; rejected as unnecessary for the Phase 1 security baseline goal. Consistent with Agent Task 1 which also used 3 tests.

**Decision 4: `/conversation/**` rule placed immediately after `/agent/**`**
- **Why:** The feature specifies "before `anyRequest().authenticated()`." Placing it after `/agent/**` groups both employee-owned resource rules together, preserving the logical ordering: admin-only rules → client auth rule → employee-only rules → catch-all. Functional correctness is identical for any position above `anyRequest()` since paths are disjoint.
- **Alternatives considered:** Placing before `/agent/**`. Functionally equivalent. Rejected in favor of grouping employee-facing endpoints together and maintaining chronological order of feature implementation.

**Decision 5: Employee test asserts `isNotFound()` (404), not 2xx**
- **Why:** No `ConversationController` is mapped in Phase 1. When security passes and no handler exists, `DispatcherServlet` returns 404. Asserting 404 confirms security passed (not 401/403) while accurately reflecting the current deployment state. The comment in the test documents that Task 3 must update this assertion.
- **Alternatives considered:** Not testing the employee positive case in Phase 1. Rejected — without this test, accidentally blocking employees with the new rule goes undetected until Phase 3.

---

## Testing Considerations

### Automatic Validation

- [x] From `backend/`: run `./mvnw test -Dtest=SecurityAuthorizationTest` after Step 1 — confirm exactly **1 test fails**: `adminRequestToConversationEndpointReturns403` (expected: 403, actual: 404); all other 11 tests pass (9 original + 2 new that already pass)
- [x] From `backend/`: run `./mvnw test -Dtest=SecurityAuthorizationTest` after Step 2 — confirm all **12 tests pass** (9 original + 3 new)
- [x] From `backend/`: run `./mvnw test` after Step 2 — confirm the full suite passes with 0 failures (excluding the pre-existing `authServerApplicationTests.contextLoads` Docker blocker if Docker is not running)

### Manual Validation

- [ ] (Optional, requires Docker Compose) Start the backend and run: `curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/conversation/list -H "Content-Type: application/json" -d "{}"` — confirm response code is `401`
- [ ] (Optional, requires Docker Compose) Obtain an Admin JWT via `POST /login` with admin credentials. Run: `curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/conversation/list -H "Content-Type: application/json" -H "Authorization: Bearer <admin-token>" -d "{}"` — confirm response is `403`
- [ ] (Optional, requires Docker Compose) Obtain an Employee JWT via `POST /login` with employee credentials. Run the same request with the employee token — confirm response is `404` (security passes, no controller yet)

---

## Related Code Explanations

- `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java:58–67` — the `authorizeHttpRequests` block (pre-change: lines 58–66; post-change: 58–67 after the new rule is inserted); the new `/conversation/**` rule is inserted after `/agent/**` and before `anyRequest().authenticated()`
- `backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java` — full security test class; 3 new conversation tests appended after the existing 9
- `backend/src/test/java/com/agentForgeBackend/testUtils/TestAuthenticationHelper.java` — JWT helper; `initializeEmployeeMockUser()` is already called in `setUp()`; `getEmployeeToken()` will provide tokens for Phase 3–4 conversation controller tests
- `backend/src/main/java/com/agentForgeBackend/configuration/filter/JWTTokenValidatorFilter.java` — JWT filter; `@WithMockUser` bypasses it by installing a synthetic `SecurityContext` before the filter chain runs

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected for this task
- [x] Spring Security 6.4.x authorization patterns verified against existing codebase (identical patterns already in production code and prior task documents)
- [x] `SecurityAuthorizationTest.java` modified — 3 new tests appended (`anonymousRequestToConversationEndpointReturns401`, `employeeRequestToConversationEndpointPassesSecurity`, `adminRequestToConversationEndpointReturns403`)
- [x] `SecurityConfig.java` modified — `.requestMatchers("/conversation/**").hasRole("EMPLOYEE")` added after `/agent/**` and before `anyRequest().authenticated()`
- [x] From `backend/`: `./mvnw test -Dtest=SecurityAuthorizationTest` passes with 12 tests (9 original + 3 new)
- [x] From `backend/`: `./mvnw test` passes — 0 failures (excluding pre-existing `authServerApplicationTests.contextLoads` Docker blocker)
- [x] Task 3 forward-reference comment present in `employeeRequestToConversationEndpointPassesSecurity` test body
- [ ] Manual validation steps documented for the user when Docker is available
- [x] Parent feature Phase 1 Steps 1.1 and 1.2 ready to be marked complete after execution
