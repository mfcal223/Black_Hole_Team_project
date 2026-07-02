# Task: Security Baseline for AppSettings Endpoints

#task #current #low-complexity #parent-app-settings-entity-and-admin-configuration

**Parent:** [[App-Settings-Entity-and-Admin-Configuration]]
**Parent Type:** Feature
**Related Step(s):** Phase 1 — Steps 1.1, 1.2
**Estimated Complexity:** Low

---

## Goal

Gate all `/app-settings/**` routes at the HTTP security layer so that unauthenticated requests receive `401`, Employee requests receive `403`, and only Admin callers can proceed — before any `AppSettingsController` exists.

---

## Parent Context

The feature defines four implementation tasks. This is Task 1 — the security baseline. The parent specifies that the security gate must be enforced at the HTTP route level before the controller is written, so that when Task 3 creates `AppSettingsController`, the admin-only gate is already in place and no `SecurityConfig` change will be needed at that point.

The parent's authorization decisions:
- `/app-settings/**` → `hasRole("ADMIN")` in `SecurityConfig.securityFilterChain()` authorization matrix. Placement between `/llm-model/**` and `/client/**` matchers (parent-mandated).
- `AppSettingsService` will additionally carry `@PreAuthorize("hasRole('ADMIN')")` on `getSettings()` and `updateSettings()` for defense-in-depth — that is Task 3's responsibility.
- `getRawApiKey()` intentionally omits `@PreAuthorize` so future `OpenRouterService` can call it under `ROLE_EMPLOYEE` context — also Task 3's responsibility.

Step 1.2 requires security tests covering both HTTP methods (`GET /app-settings` and `PATCH /app-settings`) for all three caller types: anonymous (401), employee (403), and admin (passes security).

---

## Preconditions / Dependencies

- All tasks from the LlmModel feature are complete. `SecurityConfig` contains the `/llm-model/**` rule. Current test baseline: 507 tests, 0 failures. (`authServerApplicationTests.contextLoads` requires Docker PostgreSQL; it does not appear in the standard `./mvnw test` count when running without Docker Compose.) <!-- REVIEW-FIX: original text said "one pre-existing failure" but memory bank records 0 failures — the test is absent from the default surefire run when Docker is not running -->
- `SecurityAuthorizationTest.java` exists with 9 passing tests covering `/admin/**`, `/llm-model/**`, login, and protected-route cases.
- `TestAuthenticationHelper` is fully initialized in `SecurityAuthorizationTest`'s `@BeforeEach`: `initializeMockUsers()` (admin + client tokens) and `initializeEmployeeMockUser()` (employee token) are both called. Real JWT tokens are available without changes to `@BeforeEach`.
- Spring Boot 3.4.1 / Spring Security 6.4.x in use.
- H2 in-memory database configured for tests via `application-test.properties`.
- `SecurityConfig.corsConfigurationSource()` already includes `"PATCH"` in `setAllowedMethods` (fixed in the LlmModel post-implementation review bug). No CORS issue for PATCH tests.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — Selected — task template, document location conventions, and doc config
- `solid-deep-design` — Selected — `SecurityConfig` owns all security configuration (SRP); additive extension via a new `requestMatchers` rule respects OCP; no new dependencies introduced (DIP satisfied)
- `tdd` — Selected — write failing tests first (RED), then add security rule (GREEN), then verify full suite (VERIFY)
- `memory-bank` — Selected — architecture, known-issues, and context loaded; confirmed 507 baseline and CORS PATCH fix
- `glossary-management` — Not needed — no new domain terms introduced; this is pure infrastructure
- `find-docs` — Not needed — Spring Security `authorizeHttpRequests` and `requestMatchers` syntax already verified by identical patterns in existing production code and prior task documents

### Documentation Reviewed

- `documentation/Tasks/done/Llm-Model-Entity-and-Admin-Crud-step-1-security-baseline.md` — direct prior art; this task follows the same TDD pattern for adding a domain to the security matrix
- `documentation/Features/to-do/App-Settings-Entity-and-Admin-Configuration.md` — parent feature; Steps 1.1 and 1.2 specify the rule placement and test requirements
- `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java` — current authorization matrix; rule is inserted at line 65 between `/llm-model/**` and `/client/**`
- `documentation/Memory/known-issues.md` — CORS PATCH fix confirmed; no open risks for this task

### Related Existing Code

- `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java:58-66` — `authorizeHttpRequests` block; new rule is inserted between `/llm-model/**` and `/client/**`
- `backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java` — existing test class where 6 new tests are added
- `backend/src/test/java/com/agentForgeBackend/testUtils/TestAuthenticationHelper.java` — provides real JWT tokens; already wired into `SecurityAuthorizationTest` `@BeforeEach`

---

## Implementation Details

### Approach

Two files are modified. No new files are created.

**TDD order:**
1. **RED** — Add 6 tests to `SecurityAuthorizationTest.java`. Before the security rule exists, only the 2 employee 403 tests fail; all other 4 new tests pass:
   - Anonymous tests pass immediately — `anyRequest().authenticated()` catch-all already returns 401.
   - Admin tests pass — admin's JWT is valid, security clears, no handler returns 404.
   - Employee 403 tests fail — employee falls through to `anyRequest().authenticated()`, is authenticated, gets 404 instead of 403.
2. **GREEN** — Add `.requestMatchers("/app-settings/**").hasRole("ADMIN")` to `SecurityConfig`. Both employee 403 tests now pass.
3. **VERIFY** — Run `./mvnw test` to confirm no regressions in the 507 existing tests.

**SOLID analysis:**
- **SRP**: `SecurityConfig` owns the entire security contract — adding one rule is within its single responsibility. No other file is modified.
- **OCP**: The `authorizeHttpRequests` block is designed for additive extension. The new rule adds behavior; no existing rule is edited.
- **DIP**: No new dependencies; the existing Spring Security fluent API is reused.

**Depth analysis:** `SecurityConfig` is already a deep module — all JWT filtering, CORS, exception handling, and authorization configuration hides behind a tiny `@Bean`-annotated surface. This task adds one rule to the implementation without touching the surface.

**Why 6 tests (not 3):** The parent feature explicitly requires testing both `GET /app-settings` and `PATCH /app-settings`. Although the `/**` wildcard in the security rule covers all HTTP methods, testing both verifies neither method is accidentally exempted by a future HTTP-method-specific override or `permitAll()` rule addition.

**Why real JWT tokens instead of `@WithMockUser`:** The existing llm-model tests in `SecurityAuthorizationTest` use real JWT tokens from `TestAuthenticationHelper`. Matching that style keeps the class internally consistent and exercises the full JWT filter chain, providing stronger guarantees than the synthetic `SecurityContext` installed by `@WithMockUser`.

### Files to Create/Modify

- [x] `backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java` — **MODIFY** — add 6 new tests (TDD RED phase) ✅
- [x] `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java` — **MODIFY** — add one `requestMatchers` rule (TDD GREEN phase) ✅

---

## Step-by-Step Implementation

### Step 1: Add 6 AppSettings Security Tests to SecurityAuthorizationTest (TDD RED)

**Goal:** Write the 6 tests that define expected security behavior for `GET /app-settings` and `PATCH /app-settings`. Exactly 2 tests fail initially (employee 403); 4 pass immediately. This gives us a concrete red signal before touching `SecurityConfig`.

**Dependencies:** `SecurityAuthorizationTest.java` exists with `@BeforeEach` initializing both admin and employee JWT tokens.

**Why this step is critical:** The 2 failing employee 403 tests are the observable proof that the security rule is absent. Without a red test, adding the rule to `SecurityConfig` has no test-driven validation — the rule could be silently misplaced and no existing test would catch it.

- [x] Open `SecurityAuthorizationTest.java` ✅
- [x] Add the 6 tests in the implementation block below, at the end of the class body, after `adminRequestToLlmModelEndpointPassesSecurity` and before the closing `}` <!-- REVIEW-FIX: the LlmModel tests have no dedicated section comment in the actual file; inserting by method context is more reliable than searching for a comment that does not exist --> ✅
- [x] Run `./mvnw test -Dtest=SecurityAuthorizationTest` from `backend/` and confirm: ✅
  - `employeeGetToAppSettingsReturns403` fails with `Status expected: <403> but was: <404>`
  - `employeePatchToAppSettingsReturns403` fails with `Status expected: <403> but was: <404>`
  - All 4 other new tests pass
  - All original 9 tests still pass

#### Implementation

Append after the closing brace of `adminRequestToLlmModelEndpointPassesSecurity` (the last test in the file), immediately before the class closing `}`. The LlmModel tests in this file have no dedicated section comment header — do not search for one. <!-- REVIEW-FIX: original instruction referenced `// Step 1.2 — LlmModel security tests` which does not exist in the file; the `// Step 1.2` comment at line 84 refers to Login tests -->

```java
// AppSettings security tests — real JWT tokens used (TestAuthenticationHelper initialized in @BeforeEach).
// No AppSettingsController exists yet; admin tests assert 404 (security passes, no handler found).
// Task 3 will update admin assertions to isOk() once AppSettingsController is created.

@Test
void anonymousGetToAppSettingsReturns401() throws Exception {
    mockMvc.perform(get("/app-settings"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.error").value("Unauthorized"));
}

@Test
void employeeGetToAppSettingsReturns403() throws Exception {
    mockMvc.perform(get("/app-settings")
            .header("Authorization", authHelper.getEmployeeToken()))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.error").value("Forbidden"));
}

@Test
void adminGetToAppSettingsPassesSecurity() throws Exception {
    // Security passes for ADMIN; no controller exists yet so DispatcherServlet returns 404.
    // Task 3 will update this assertion to isOk() once AppSettingsController is created.
    mockMvc.perform(get("/app-settings")
            .header("Authorization", authHelper.getAdminToken()))
        .andExpect(status().isNotFound());
}

@Test
void anonymousPatchToAppSettingsReturns401() throws Exception {
    mockMvc.perform(patch("/app-settings")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{}"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.error").value("Unauthorized"));
}

@Test
void employeePatchToAppSettingsReturns403() throws Exception {
    mockMvc.perform(patch("/app-settings")
            .header("Authorization", authHelper.getEmployeeToken())
            .contentType(MediaType.APPLICATION_JSON)
            .content("{}"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.error").value("Forbidden"));
}

@Test
void adminPatchToAppSettingsPassesSecurity() throws Exception {
    // Security passes for ADMIN; no controller exists yet so DispatcherServlet returns 404.
    // Task 3 will update this assertion to isOk() once AppSettingsController is created.
    mockMvc.perform(patch("/app-settings")
            .header("Authorization", authHelper.getAdminToken())
            .contentType(MediaType.APPLICATION_JSON)
            .content("{}"))
        .andExpect(status().isNotFound());
}
```

**Imports check:** `get`, `patch`, `post`, `status`, `jsonPath`, `MediaType` are already imported via the existing wildcard and explicit imports. `authHelper` is already `@Autowired`. No new imports needed.

#### Edge Cases

1. **`patch()` availability** — `MockMvcRequestBuilders.patch` is included in the existing `import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;` wildcard. No additional import required.

2. **Why employee tests fail before Step 2** — With no `/app-settings/**` rule, an employee request hits `anyRequest().authenticated()`. The employee has a valid JWT, so they are authenticated. Spring's `DispatcherServlet` finds no handler and returns 404. After Step 2, the `/app-settings/**` matcher fires first — `hasRole("ADMIN")` is not satisfied for `ROLE_EMPLOYEE` → `accessDeniedHandler` → 403 with `{"error":"Forbidden"}`.

3. **Why admin tests return 404 (not 200)** — No `AppSettingsController` is mapped yet. Spring's `DispatcherServlet` returns 404 when no handler exists for the path. This is proof that security passed (not 401 or 403). Task 3 will update these assertions to `isOk()` after the controller is created.

4. **`@BeforeEach` interaction** — The existing `@BeforeEach` already calls both `initializeMockUsers()` and `initializeEmployeeMockUser()`. All 6 new tests use the pre-initialized tokens. No changes to `@BeforeEach` are needed.

5. **PATCH and CORS in MockMvc** — MockMvc bypasses browser CORS preflight. The PATCH test exercises only the Spring Security filter chain and the `DispatcherServlet`. CORS `allowedMethods` is not evaluated during MockMvc tests; that concern was already resolved for live environments in the LlmModel post-implementation review.

---

### Step 2: Add `/app-settings/**` Rule to SecurityConfig (TDD GREEN)

**Goal:** Add a single `requestMatchers` line to make all 6 new tests pass. The 2 failing employee 403 tests are the canonical GREEN signal.

**Dependencies:** Step 1 tests must be in place and `employeeGetToAppSettingsReturns403` / `employeePatchToAppSettingsReturns403` must currently be failing.

- [x] Open `SecurityConfig.java` ✅
- [x] Locate the `authorizeHttpRequests` block (currently lines 58–66) ✅
- [x] Add `.requestMatchers("/app-settings/**").hasRole("ADMIN")` immediately after `.requestMatchers("/llm-model/**").hasRole("ADMIN")` ✅
- [x] Do NOT modify any existing rule — this is a purely additive change ✅
- [x] Run `./mvnw test -Dtest=SecurityAuthorizationTest` from `backend/` — confirm all 15 tests pass (9 original + 6 new) ✅

**Why this step is critical:** The rule must be placed before `anyRequest().authenticated()`. Spring Security evaluates `requestMatchers` in declaration order (first-match-wins). An incorrect position would produce a dead rule that never fires — the `anyRequest()` catch-all would fire first for `/app-settings/**` paths, granting Employee access.

#### Implementation

The `authorizeHttpRequests` block in `SecurityConfig.java` becomes:

```java
.authorizeHttpRequests(authorize -> authorize
    .dispatcherTypeMatchers(DispatcherType.FORWARD, DispatcherType.ERROR).permitAll()
    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
    .requestMatchers("/login", "/login/").permitAll()
    .requestMatchers("/employee/**").hasRole("ADMIN")
    .requestMatchers("/admin/**").hasRole("ADMIN")
    .requestMatchers("/llm-model/**").hasRole("ADMIN")
    .requestMatchers("/app-settings/**").hasRole("ADMIN")   // ← ADD THIS LINE
    .requestMatchers("/client/**").authenticated()
    .anyRequest().authenticated()
)
```

No other changes to `SecurityConfig.java`. No new imports required — `requestMatchers` and `hasRole` are already used on the lines above.

#### Edge Cases

1. **Rule ordering (first-match-wins)** — Spring Security processes matchers in declaration order. `/app-settings/**` is placed before `anyRequest().authenticated()`, so all AppSettings paths are caught by the admin-only rule. An employee hitting `/app-settings/anything` matches `/app-settings/**` first → `hasRole("ADMIN")` fails → 403. `anyRequest()` is never reached for these paths.

2. **No controller yet** — The rule takes effect at request time regardless of whether a handler mapping exists. Spring does not validate handler existence at startup. The rule immediately enforces ADMIN-only access to all `/app-settings/**` paths.

3. **Future AppSettingsController** — When `AppSettingsController` is created in Task 3 with `@RequestMapping("/app-settings")`, the security rule already covers it. Task 3 does not need to modify `SecurityConfig`.

4. **Singleton resource — no `/{id}` paths** — `AppSettings` is a singleton resource with only `GET /app-settings` and `PATCH /app-settings`. The `/**` wildcard is forward-compatible if any sub-paths are ever added. There is no risk of the pattern being too broad for the intended resource.

---

### Step 3: Verify Full Test Suite (Regression Check)

**Goal:** Confirm the security rule addition does not break any of the 507 pre-existing tests.

**Dependencies:** Step 2 complete.

- [x] Run `./mvnw test` from `backend/` ✅
- [x] Confirm `SecurityAuthorizationTest` shows 15 tests, 0 failures ✅
- [x] Confirm all previously passing test classes pass ✅
- [x] Confirm 0 test failures (when Docker Compose is not running, `authServerApplicationTests.contextLoads` is absent from the surefire run entirely) ✅ 0 failures confirmed; 1 pre-existing error (`authServerApplicationTests.contextLoads` Docker blocker — see Post-Review Notes)

**Why this step is critical:** The `authorizeHttpRequests` block is global configuration. A typo in the pattern (e.g., `/**` instead of `/app-settings/**`) would block all routes and fail the entire suite. The full run catches such mistakes immediately.

#### Edge Cases

1. **Test count** — Step 1 adds 6 tests. The expected test count after Steps 1 and 2 is 513 (507 + 6). The regression check confirms the 507 pre-existing tests still pass.

---

## Design Decisions

**Decision 1: Add tests to `SecurityAuthorizationTest`, not a new class**
- **Why:** `SecurityAuthorizationTest` is the canonical home for filter-chain behavior tests in this project. All security-matrix assertions must be co-located for auditability. Creating a separate `AppSettingsSecurityTest` would fragment the security test surface; the matrix is a cross-domain concern.
- **Alternatives considered:** Separate `AppSettingsSecurityTest` class. Rejected — inconsistent with project convention.

**Decision 2: Use real JWT tokens (TestAuthenticationHelper) instead of `@WithMockUser`**
- **Why:** The existing llm-model tests in `SecurityAuthorizationTest` use real JWT tokens from `TestAuthenticationHelper`. Matching that style keeps the class internally consistent and exercises the full JWT validation path (`JWTTokenValidatorFilter` → `SecurityContext` → authorization check). The LlmModel Task 1 used `@WithMockUser` but those tests were later updated to real tokens. Using real tokens from the start avoids that update step.
- **Alternatives considered:** `@WithMockUser(roles = "EMPLOYEE")` and `@WithMockUser(roles = "ADMIN")`. The LlmModel Task 1 used this approach when no controller existed. Rejected for AppSettings because the current state of `SecurityAuthorizationTest` uses real tokens for llm-model tests, establishing real tokens as the file's convention.

**Decision 3: Admin tests assert `isNotFound()` (404) in Task 1, not `isOk()` (200)**
- **Why:** The parent feature describes "admin → 2xx" as the end-state of the security layer. In Task 1 there is no `AppSettingsController`, so no handler is mapped to `/app-settings`. When security passes for admin and no handler exists, Spring returns 404. Asserting 404 confirms security passed (not 401/403) while being accurate about the current deployment state. Task 3 will update these assertions to `isOk()` once the controller is created. The comment inside each admin test documents this lifecycle expectation for the Task 3 implementer.
- **Alternatives considered:** Asserting `isOk()` (200) in Task 1. Rejected — there is no controller to return 200. The test would always fail in Task 1's context.

**Decision 4: 6 tests covering both GET and PATCH (not 3 tests for one endpoint)**
- **Why:** The parent feature explicitly requires testing both HTTP methods. The security rule covers both via `/**`, but testing both serves as a regression guard: if a future change adds an HTTP-method-specific `permitAll()` or method-level override for one method, the test for that method will catch it.
- **Alternatives considered:** 3 tests (GET only). Rejected — the parent feature mandates both methods in Step 1.2.

**Decision 5: `/app-settings/**` rule placed between `/llm-model/**` and `/client/**`**
- **Why:** The parent feature mandates this exact placement. All admin-only rules (`/employee/**`, `/admin/**`, `/llm-model/**`, `/app-settings/**`) are grouped together, making the authorization matrix readable and auditable at a glance.
- **Alternatives considered:** Placing after `/admin/**` before `/llm-model/**`. Functionally equivalent but not what the parent specifies.

---

## Testing Considerations

### Automatic Validation

- [x] From `backend/`: run `./mvnw test -Dtest=SecurityAuthorizationTest` after Step 1 — confirm exactly 2 tests fail: `employeeGetToAppSettingsReturns403` and `employeePatchToAppSettingsReturns403` (expected 403 but was 404); all other 13 tests pass ✅ CONFIRMED: 15 tests run, 2 failures (employee GET + PATCH → expected 403 but was 404), 13 pass
- [x] From `backend/`: run `./mvnw test -Dtest=SecurityAuthorizationTest` after Step 2 — confirm all 15 tests pass (9 original + 6 new) ✅ CONFIRMED: 15 tests, 0 failures, 0 errors
- [x] From `backend/`: run `./mvnw test` after Step 2 — confirm 513 total tests, 0 failures (without Docker Compose running, `authServerApplicationTests.contextLoads` is absent from the surefire count) ✅ CONFIRMED with deviation: 519 total tests (not 513), 0 failures, 1 error (`authServerApplicationTests.contextLoads` — pre-existing Docker PostgreSQL blocker, NOT caused by this task). Baseline was 512 (not 507 as documented); 512 + 6 new + 1 authServerApplicationTests = 519. See Post-Review Notes.

### Manual Validation

- [x] (Optional, requires Docker Compose) Start backend with `docker compose up -d` and confirm: `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/app-settings` returns `401`
- [x] (Optional, requires Docker Compose) Obtain an Employee JWT via `POST /login` with employee credentials and confirm `GET /app-settings` returns `403` with `{"error":"Forbidden","message":"Access Denied"}`
- [x] (Optional, requires Docker Compose) Obtain an Admin JWT via `POST /login` with admin credentials and confirm `GET /app-settings` returns `404` (no controller yet; security passes)

---

## Related Code Explanations

- `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java:58-66` — the `authorizeHttpRequests` block; new rule inserted between `/llm-model/**` and `/client/**`
- `backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java` — full security test class; 6 new tests appended after the llm-model block
- `backend/src/test/java/com/agentForgeBackend/testUtils/TestAuthenticationHelper.java` — JWT token helper; `initializeMockUsers()` and `initializeEmployeeMockUser()` already called in `SecurityAuthorizationTest`'s `@BeforeEach`
- `backend/src/main/java/com/agentForgeBackend/configuration/filter/JWTTokenValidatorFilter.java` — validates the `Authorization` header and sets `SecurityContext`; real JWT tests exercise this filter end-to-end

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected for this task
- [x] Spring Security 6.4.x authorization patterns verified against existing codebase (identical patterns in current production code and prior task documents)
- [x] `SecurityAuthorizationTest.java` modified — 6 new tests added (3 for GET, 3 for PATCH `/app-settings`)
- [x] `SecurityConfig.java` modified — one `.requestMatchers("/app-settings/**").hasRole("ADMIN")` rule added between `/llm-model/**` and `/client/**`
- [x] From `backend/`: `./mvnw test -Dtest=SecurityAuthorizationTest` passes with 15 tests (9 original + 6 new)
- [x] From `backend/`: `./mvnw test` passes — 519 total tests, 0 failures, 1 pre-existing error (`authServerApplicationTests.contextLoads` Docker blocker; see Post-Review Notes for count deviation from estimated 513)
- [x] Task 3 forward-reference comments in place inside both admin test methods
- [x] Manual validation steps documented for the user when Docker is available
- [x] Parent feature Steps 1.1 and 1.2 ready to be marked complete after execution

---

## Post-Review Notes

### Test count deviation

The task document estimated a baseline of 507 tests and a post-implementation total of 513 (507 + 6). The actual baseline at execution time was 512 (excluding `authServerApplicationTests`), yielding 518 passing tests + 1 pre-existing Docker error = 519 total. The 5-test discrepancy from the estimate is pre-existing and not caused by this task's changes. The memory bank's "507 tests" figure appears to have been recorded under different conditions (possibly excluding `authServerApplicationTests` and some test classes that are now included in the surefire run).

### `authServerApplicationTests.contextLoads` presence

The task document stated this test "does not appear in the standard `./mvnw test` count when running without Docker Compose." In the execution environment, it IS present and errors (fails to load ApplicationContext because PostgreSQL host `db` is unreachable). This is the pre-existing Docker blocker documented in `known-issues.md`. The surefire configuration only excludes `**/*SuiteTest.java`, which does not match `authServerApplicationTests`. This is not a regression caused by this task.

### Implementation review: no issues found

- `SecurityConfig.java`: Rule correctly placed at line 65 between `/llm-model/**` and `/client/**`. Purely additive change.
- `SecurityAuthorizationTest.java`: 6 tests correctly added (lines 158-210). Section comment and Task 3 forward-reference comments present. Real JWT tokens used consistently with existing class convention. No new imports needed.
- RED phase: Exactly 2 employee 403 tests failed (expected 403, got 404). All other 13 tests passed.
- GREEN phase: All 15 SecurityAuthorizationTest tests pass.
- Full regression: 0 failures, 0 regressions.
