# Task: Regression and Cleanup for Employee Self-Registration and Admin Activation

#task #current #low-complexity #parent-employee-self-registration-and-admin-activation

**Parent:** [[Employee-Self-Registration-and-Admin-Activation]]
**Parent Type:** Feature
**Related Step(s):** Phase 5 — Steps 5.1, 5.2
**Estimated Complexity:** Low

---

## Goal

Verify FK-safe cleanup correctness across all new and modified test classes from Tasks 1–4, then run the full `./mvnw test` suite to confirm that the Employee Self-Registration and Admin Activation feature introduces zero regressions against the pre-existing 987-test baseline. Close out the feature by marking all step checkboxes, moving task and feature documents to `done/`, and updating the Memory Bank.

---

## Parent Context

Tasks 1–4 delivered the complete Employee Self-Registration and Admin Activation feature:

- **Task 1:** `SecurityUser.isEnabled()` fix (4 `get*()` → `is*()` renames with `@Override`), `GlobalExceptionHandler.DisabledException` handler (401 "Account pending admin activation."), `SecurityConfig` `/register` → `permitAll` rule, `EmployeeAccountStatusSecurityTest` (3 integration tests).
- **Task 2:** `EmployeeDTO.boolean enabled` field, `EmployeeMapper.toDTO()` `.enabled(entity.isEnabled())` mapping, 2 new unit tests in `EmployeeMapperTest` (`toDTO_mapsEnabledTrue`, `toDTO_mapsEnabledFalse`).
- **Task 3:** `EmployeeService.activate(Long id)` and `deactivate(Long id)` (`@PreAuthorize("hasRole('ADMIN')")`, `@Transactional`, `findById` → `ItemNotFoundException`, set `enabled`, save, return `EmployeeDTO`), `EmployeeController` rewrite with typed `EmployeeService` field and 2 `@PatchMapping` endpoints (`/{id}/activate`, `/{id}/deactivate`), 13 new tests across `EmployeeServiceCrudIntegrationTest` (+6), `EmployeeControllerListEndpointTest` (+6), and `SecurityAuthorizationTest` (+1).
- **Task 4:** `RegistrationResponseDTO` (`@Data @AllArgsConstructor @NoArgsConstructor`, fields `username`/`email`/`message`), `EmployeeService.register()` (no `@PreAuthorize`, `@Transactional`, `setEnabled(false)`, uniqueness checks, password encoding, returns `RegistrationResponseDTO`), `RegistrationController` (`@RestController @RequestMapping("/register")`, single `@PostMapping`, HTTP 201), `RegistrationControllerTest` (10 integration tests including end-to-end register → login-blocked → admin-activate → login-succeeds flow), `EmployeeAccountStatusSecurityTest` update (`isNotFound()` → `isMethodNotAllowed()`).

Task 5 is the closing VERIFY phase. It performs no production code changes. Its two deliverables are: (1) a documented FK-safe cleanup audit confirming all new and modified test classes are correctly isolated, and (2) a full regression run confirming zero new failures.

**Parent constraints:**
- Step 5.1: Audit every `@BeforeEach` in new/modified test classes to confirm the FK-safe delete order: `messageRepository → conversationRepository → agentRepository → (llmModelRepository) → employeeRepository`. The `llmModelRepository` step applies only if the class creates LLM model entities.
- Step 5.2: Run `./mvnw test` — confirm no regressions in existing Admin, Employee, Conversation, Agent, Message, AppSettings, Security, LlmModel, and WebSocket tests. Verify test count increases by 28 (all new tests added in Phases 1–4).

---

## Preconditions / Dependencies

- **Tasks 1–4 complete:** All production files created/modified, all test files created/updated. Confirmed via Memory Bank context.md. ✅
- **Java 21 + Docker Compose available:** `./mvnw test` requires the Maven/Java 21 container from `docker-compose.yml`. The full suite is blocked without it (this execution environment constraint affected all Tasks 1–4; runtime validation deferred throughout).
- **Pre-existing baseline:** 987 tests, 0 failures (excluding 1 pre-existing `authServerApplicationTests.contextLoads` Docker/PostgreSQL connection error that requires a running `db` container). This baseline was established at the end of the OpenRouter Chat Integration feature (Tasks 1–5).
- **FK-safe delete order established in `known-issues.md`:** `messageRepository.deleteAll()` → `conversationRepository.deleteAll()` → `agentRepository.deleteAll()` → `llmModelRepository.deleteAll()` → `employeeRepository.deleteAll()`. The `message.llm_model_id` FK has no `ON DELETE CASCADE` — messages must be deleted before LLM models.
- **H2 named in-memory database:** `application-test.properties` uses `jdbc:h2:mem:testdb` — all `@ActiveProfiles("test")` contexts in the same JVM share this database. Cross-class data isolation depends entirely on `@BeforeEach` cleanup; there is no per-context database reset.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — Selected — task template and naming conventions; directory `Tasks/current/`
- `memory-bank` — Selected — FK-safe delete order from `known-issues.md`; context confirming Tasks 1–4 complete; 987-test pre–Employee Self-Registration baseline; all new test file names
- `solid-deep-design` — Selected — confirms Task 5 introduces no new production modules; regression phase is a pure VERIFY step; no depth/seam analysis needed
- `tdd` — Selected — Task 5 is the VERIFY phase of the full TDD RED→GREEN→VERIFY cycle for the Employee Self-Registration feature
- `glossary-management` — Selected — domain terms used consistently (Employee, enabled, disabled, activation, registration, self-registration, pending admin activation)
- `find-docs` — Not needed — `./mvnw test` is a stable Maven invocation; no new library APIs used in this task

### Documentation Reviewed

- `documentation/Features/to-do/Employee-Self-Registration-and-Admin-Activation.md` — Phase 5 Steps 5.1, 5.2; all test classes listed; expected behaviors and completion criteria
- `documentation/Tasks/current/Employee-Self-Registration-and-Admin-Activation-step-4-self-registration.md` — manual validation steps and regression guard list carried forward to Task 5
- `documentation/Memory/known-issues.md` — FK-safe delete order; named H2 `testdb` database; `authServerApplicationTests` pre-existing Docker error
- `documentation/Memory/context.md` and `documentation/Memory/progress.md` — confirmed Tasks 1–4 complete; baseline test count of 987

### Related Existing Code

- `backend/src/main/resources/application-test.properties` — H2 named database `jdbc:h2:mem:testdb`; `ddl-auto=create-drop`; shared across all `@ActiveProfiles("test")` contexts
- `backend/src/test/java/com/agentForgeBackend/configuration/security/EmployeeAccountStatusSecurityTest.java` — **new** test class from Task 1 (updated in Task 4); FK-safe setUp audit target
- `backend/src/test/java/com/agentForgeBackend/models/hq/employee/RegistrationControllerTest.java` — **new** test class from Task 4; FK-safe setUp audit target
- `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeServiceCrudIntegrationTest.java` — modified in Task 3 (+6 tests); FK-safe setUp audit target
- `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeControllerListEndpointTest.java` — modified in Task 3 (+6 tests); FK-safe setUp audit target
- `backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java` — modified in Task 3 (+1 test); FK-safe setUp audit target
- `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeMapperTest.java` — modified in Task 2 (+2 unit tests); no Spring context, no DB operations; no cleanup audit needed

---

## Implementation Details

### Approach

Task 5 has three sequential activities:

**1. FK-Safe Cleanup Audit (Step 5.1)**

Every new or modified test class introduced in Tasks 1–4 must be inspected for correct `@BeforeEach` cleanup order. The risk being validated: if a test class creates `EmployeeEntity` rows (either directly or via `POST /register`) and a subsequent test class that calls `employeeRepository.deleteAll()` is preceded by an open `conversation.employee_id` or `agent.owner_id` FK constraint, H2 throws a `DataIntegrityViolationException`. Independently, the `message.llm_model_id` FK (no `ON DELETE CASCADE`) requires `messageRepository.deleteAll()` to run before any llmModel cleanup.

All six modified test files were audited during task planning by reading the actual source. The complete findings are documented in Step 1 below.

**2. Full Regression Run (Step 5.2)**

`./mvnw test` is run from `backend/` with Docker Compose active. The expected result:
- Test count: **1015** (987 baseline + 28 new tests from Tasks 1–4)
- Failures: **0** (excluding the pre-existing `authServerApplicationTests.contextLoads` error)

**Test count breakdown:**

| Task | New Test Classes / Methods | Count |
|------|---------------------------|-------|
| Task 1 | `EmployeeAccountStatusSecurityTest` — 3 new integration tests | +3 |
| Task 2 | `EmployeeMapperTest` — 2 new unit tests (`toDTO_mapsEnabledTrue`, `toDTO_mapsEnabledFalse`) | +2 |
| Task 3 | `EmployeeServiceCrudIntegrationTest` +6, `EmployeeControllerListEndpointTest` +6, `SecurityAuthorizationTest` +1 | +13 |
| Task 4 | `RegistrationControllerTest` — 10 new integration tests | +10 |
| **Total** | | **+28** |

**Why no new production code in Task 5:** Task 5 has no production code changes. All FK-safe cleanup invariants are already satisfied in the new and modified test files (see audit findings below). The 17 pre-existing test classes patched during Message Task 3 already have defensive `messageRepository.deleteAll()` prepends — they cover all scenarios where data written by employee-registration tests could leak into the next test class's `@BeforeEach`.

**SOLID + Deep Module — no new modules:** Task 5 is a VERIFY phase. No new modules are introduced. The TDD RED→GREEN cycle for the full Employee Self-Registration feature is complete after Task 4. Task 5 closes the cycle with a comprehensive VERIFY pass.

### Files to Create/Modify

- [x] No production files modified — verification-only task
- [x] No new test files — all cleanup is already in place
- [x] `documentation/Features/to-do/Employee-Self-Registration-and-Admin-Activation.md` — Phase 5.1 marked `[x]` (audit complete); Step 5.2 pending Java 21 runtime
- [ ] Move all 5 Employee Self-Registration task documents from `Tasks/current/` to `Tasks/done/`
- [ ] Move `documentation/Features/to-do/Employee-Self-Registration-and-Admin-Activation.md` to `documentation/Features/done/`
- [x] Update `documentation/Memory/context.md` and prepend a new dated entry to `documentation/Memory/progress.md`

---

## Step-by-Step Implementation

### Step 1: FK-Safe Cleanup Audit (Step 5.1)

**Goal:** Verify that every new or modified test class from Tasks 1–4 uses the correct `@BeforeEach` FK-safe delete order to prevent H2 `DataIntegrityViolationException` caused by open FK constraints across the shared `testdb` in-memory database.

**Dependencies:** All Tasks 1–4 implementation files must exist.

- [x] Read `EmployeeAccountStatusSecurityTest.java` — confirm FK-safe cleanup order in `setUp()`
- [x] Read `RegistrationControllerTest.java` — confirm FK-safe cleanup order in `setUp()`
- [x] Read `EmployeeServiceCrudIntegrationTest.java` — confirm FK-safe cleanup order in `setUp()`
- [x] Read `EmployeeControllerListEndpointTest.java` — confirm FK-safe cleanup order in `setUp()`
- [x] Read `SecurityAuthorizationTest.java` — confirm FK-safe cleanup order in `setUp()`
- [x] Confirm `EmployeeMapperTest.java` — verify it is a pure unit test with no Spring context (no `@BeforeEach` DB cleanup needed)

**Why this step is critical:** `application-test.properties` uses `jdbc:h2:mem:testdb` — a named, shared in-memory database. All `@ActiveProfiles("test")` contexts in the same JVM share this H2 instance. Data written by earlier test classes (alphabetically ordered) is visible to subsequent classes' `@BeforeEach`. Without correct cleanup order:
- An `EmployeeEntity` row left by `EmployeeControllerListEndpointTest` prevents `EmployeeServiceCrudIntegrationTest` from calling `agentRepository.deleteAll()` if any agents still have a live `owner_id` FK.
- An `AdminEntity` or `ClientEntity` left by `TestAuthenticationHelper.initializeMockUsers()` (called in `RegistrationControllerTest` end-to-end test 10 and `SecurityAuthorizationTest.setUp()`) prevents cross-class employee cleanup if the base_user table FK isn't cleared first.

#### Audit Findings

The following findings were established during task planning by reading all six test files in the actual codebase:

| Test Class | New / Modified | Creates Entity Rows? | FK-Safe setUp? | Verdict |
|---|---|---|---|---|
| `EmployeeAccountStatusSecurityTest` | **New** (Task 1) | Yes — 2 `EmployeeEntity` rows (disabled + active) directly | `messageRepository` → `conversationRepository` → `agentRepository` → `employeeRepository` → `clientRepository` → `adminRepository` (all with flush) | ✅ No patch needed |
| `RegistrationControllerTest` | **New** (Task 4) | Yes — `EmployeeEntity` via `POST /register`; `AdminEntity` + `ClientEntity` via `authHelper.initializeMockUsers()` in test 10 | `messageRepository` → `conversationRepository` → `agentRepository` → `employeeRepository` → `clientRepository` → `adminRepository` (all with flush) + `authHelper.cleanUp()` | ✅ No patch needed |
| `EmployeeServiceCrudIntegrationTest` | Modified (Task 3, +6 tests) | Yes — `EmployeeEntity` via `employeeService.insert()` and direct `saveAndFlush`; `AdminEntity` + `ClientEntity` via test data factory | `messageRepository` → `conversationRepository` → `agentRepository` → `employeeRepository` → `clientRepository` → `adminRepository` (all with flush) | ✅ No patch needed |
| `EmployeeControllerListEndpointTest` | Modified (Task 3, +6 tests) | Yes — 3 `EmployeeEntity` rows via `ListQueryTestDataFactory.employee()` | `messageRepository` → `conversationRepository` → `agentRepository` → `employeeRepository` (all with flush) — no admin/client created by this class | ✅ No patch needed |
| `SecurityAuthorizationTest` | Modified (Task 3, +1 test) | Yes — `AdminEntity` + `ClientEntity` + `EmployeeEntity` via `initializeMockUsers()` + `initializeEmployeeMockUser()` | `messageRepository` → `clientRepository` → `adminRepository` → `conversationRepository` → `agentRepository` → `employeeRepository` (all with flush) | ✅ No patch needed |
| `EmployeeMapperTest` | Modified (Task 2, +2 tests) | No — `@ExtendWith(MockitoExtension.class)` only; no `@SpringBootTest`; entities are plain `new EmployeeEntity()` with no persistence | No `@BeforeEach` DB cleanup needed | ✅ No patch needed |

**Pre-existing test classes:** All 17 classes patched during Message Task 3 (Message Regression and Cleanup) already have `messageRepository.deleteAll()` as the first cleanup call. These patches cover all scenarios where employee registration test data could leak into Agent, LlmModel, Conversation, Employee, AppSettings, and Security test classes. No additional patches are needed.

#### Edge Cases

1. **`SecurityAuthorizationTest` cleanup order differs from others** — It deletes `clientRepository` and `adminRepository` before `conversationRepository` and `agentRepository`, rather than messages → conversations → agents → employees. This is safe because `SecurityAuthorizationTest` itself does NOT create LLM models, conversations, or agents — it only creates admin/client/employee entities via `initializeMockUsers()`. The ordering still prevents FK violations for the data this class creates.

2. **`RegistrationControllerTest.authHelper.cleanUp()` in `setUp()`** — Resets the cached token/entity state in `TestAuthenticationHelper` but does NOT delete DB entities. DB entity cleanup is handled by the `adminRepository.deleteAll()` call that follows. The `cleanUp()` + `adminRepository.deleteAll()` sequence is correct: reset cache first, then clear DB.

3. **`EmployeeControllerListEndpointTest` omits admin/client cleanup** — Safe because this class never calls `authHelper.initializeMockUsers()`. The only rows it creates are 3 `EmployeeEntity` rows. No admin or client entities exist at the time its `setUp()` fires (prior classes that create admins/clients — like `SecurityAuthorizationTest` — already clean them up in their own `@BeforeEach`).

4. **H2 `ddl-auto=create-drop` with shared `testdb`** — Schema is created when the first Spring context starts and dropped when all contexts are closed. Both `@SpringBootTest` contexts used by the new Employee tests share the same schema on `testdb`. This is consistent with the pre-existing 987-test suite behavior.

---

### Step 2: Full Regression Run (Step 5.2)

**Goal:** Execute the complete test suite and confirm 1015 tests pass with 0 failures, establishing that the Employee Self-Registration and Admin Activation feature (Tasks 1–4) introduces no regressions against the 987-test pre-feature baseline.

**Dependencies:** Step 1 audit complete (no patches needed); Docker Compose running with `backend` service active; Java 21 available.

- [ ] From `backend/`: run `./mvnw test`
- [ ] Confirm test count is **1015** (987 baseline + 28 new tests; see note on count variance below)
- [ ] Confirm **0 failures** (excluding the pre-existing `authServerApplicationTests.contextLoads` Docker/PostgreSQL error)
- [ ] Confirm individual target test suites pass:
  - [ ] `./mvnw -pl backend test -Dtest=EmployeeAccountStatusSecurityTest` — 3/3 pass
  - [ ] `./mvnw -pl backend test -Dtest=RegistrationControllerTest` — 10/10 pass
  - [ ] `./mvnw -pl backend test -Dtest=EmployeeServiceCrudIntegrationTest` — 23/23 pass (17 original + 6 new)
  - [ ] `./mvnw -pl backend test -Dtest=EmployeeControllerListEndpointTest` — 19/19 pass (13 original + 6 new)
  - [ ] `./mvnw -pl backend test -Dtest=SecurityAuthorizationTest` — 16/16 pass (15 original + 1 new)
  - [ ] `./mvnw -pl backend test -Dtest=EmployeeMapperTest` — 12/12 pass (10 original + 2 new)

**Why this step is critical:** Tasks 1–4 all deferred test execution due to the Java 21 / Docker constraint in the execution environment. The Step 5.2 regression run is the first time all 28 new tests and all 987 pre-existing tests are verified together in a real execution environment. This is the feature's final quality gate. Specifically:

- `EmployeeAccountStatusSecurityTest` — the only verification that `SecurityUser.isEnabled()` actually enforces disabled status at login in a running Spring context (end-to-end through `AuthenticationManager` → `SecurityUserServiceImpl` → `SecurityUser` → `DisabledException` → `GlobalExceptionHandler`)
- `RegistrationControllerTest` — the only end-to-end verification of the full register → login-blocked → admin-activate → login-succeeds flow
- `EmployeeServiceCrudIntegrationTest` activate/deactivate tests — the only service-layer verification of `setEnabled()` persistence through a real `@Transactional` boundary

**Test count variance note:** The 1015 figure is a prediction (987 + 28). If the observed count differs, check:
1. Whether any test methods in the modified files were accidentally removed during Task 3's `EmployeeServiceCrudIntegrationTest` edit (the orphaned `getOne` tests incident was patched, but verify count is 23).
2. Whether the `suites/` package tests (excluded from default Surefire run by design) were accidentally included — `E2ESuiteTest`, `RepositorySuiteTest`, `UtilsSuiteTest` re-run existing tests and should not be counted separately.
3. Count each target class individually and compare to the table in the test count breakdown above.

#### Edge Cases

1. **`authServerApplicationTests.contextLoads` expected error** — This test requires a live PostgreSQL `db` container (connects to `db:5432`). It fails with a connection error when only the `backend` Maven container is running. This is a pre-existing, known failure that predates the Employee Self-Registration feature. Treat it as an error (excluded from failure count), not a regression.

2. **`RegistrationControllerTest` end-to-end test timing** — Test 10 (`selfRegisteredEmployee_canLoginAfterAdminActivates_returns200`) makes 4 sequential HTTP calls (register → fetch ID → activate → login). All calls go through MockMvc synchronously; there is no real HTTP or timing dependency. If this test fails, the likely cause is a missing data state, not a timing issue.

3. **BCrypt in `RegistrationControllerTest`** — End-to-end tests 9 and 10 use real BCrypt password hashing (not a mock). BCrypt hashing is intentionally slow. If the full test suite is slow, the 2 end-to-end tests in `RegistrationControllerTest` are expected to take ~500ms each due to BCrypt. This is normal; do not replace BCrypt with a no-op encoder in tests.

4. **`SecurityUser.isEnabled()` behavior change scope** — The Task 1 fix (`get*()` → `is*()` rename) affects all `BaseUserEntity` subtypes: Admin, Client, and Employee. The regression suite confirms existing Admin and Client login tests still pass after the fix, because all existing Admin and Client accounts have `enabled = true` set explicitly at creation time.

5. **Spring context cache — two distinct contexts** — The full suite uses two main Spring contexts: (a) `@SpringBootTest` with no mocks (most test classes including all Employee Self-Registration test classes), (b) `@SpringBootTest` with `@MockBean` configurations (used by OpenRouter/WebSocket tests from prior features). The Employee Self-Registration tests all run in context (a). No new `@MockBean` configurations are introduced.

---

### Step 3: Feature Close-Out

**Goal:** After the full regression run passes, update documentation to reflect Task 5 completion and the full feature closure.

**Dependencies:** Step 2 regression run passes (1015 tests, 0 failures excluding Docker blocker).

- [x] In `documentation/Features/to-do/Employee-Self-Registration-and-Admin-Activation.md`: Phase 5.1 marked `[x]` (audit complete); Step 5.2 pending Java 21 runtime
- [ ] Move this task document from `documentation/Tasks/current/` to `documentation/Tasks/done/`
- [ ] Move all other Employee Self-Registration task documents from `current/` to `done/`:
  - `Employee-Self-Registration-and-Admin-Activation-step-1-security-foundation.md`
  - `Employee-Self-Registration-and-Admin-Activation-step-2-dto-enabled-status.md`
  - `Employee-Self-Registration-and-Admin-Activation-step-3-activate-deactivate.md`
  - `Employee-Self-Registration-and-Admin-Activation-step-4-self-registration.md`
- [ ] Move `documentation/Features/to-do/Employee-Self-Registration-and-Admin-Activation.md` to `documentation/Features/done/`
- [ ] Update `documentation/Memory/context.md` to reflect all tasks complete and set next steps
- [ ] Prepend a new dated entry (format: `## YYYY-MM-DD`, using the actual execution date) to `documentation/Memory/progress.md` summarizing the full feature completion with Obsidian wiki links to all 5 completed task documents (`[[Tasks/done/Employee-Self-Registration-and-Admin-Activation-step-N-...]]`) and the feature (`[[Features/done/Employee-Self-Registration-and-Admin-Activation]]`)<!-- REVIEW-FIX: replaced hardcoded date 2026-06-22 with YYYY-MM-DD placeholder — the date must reflect the actual day the regression run passes, not when this task document was written -->

---

## Design Decisions

**Decision 1: No new test classes in Task 5**
- **Why:** All FK-safe cleanup is already in place. The 2 new test files from Tasks 1 and 4 each have correct `@BeforeEach` cleanup (verified by reading the actual files during task planning). The 4 modified test files from Tasks 2 and 3 either are pure unit tests (no cleanup needed) or already had correct FK-safe cleanup extended appropriately. Creating additional patches when none are needed adds maintenance burden with no safety benefit.
- **Alternatives considered:** Proactively adding defensive `messageRepository.deleteAll()` to test classes that don't currently need it. Rejected — the pre-existing 987-test suite already confirmed these classes are isolated. Defensive patches without a demonstrated need add noise to diffs and make FK-safe cleanup intent harder to read.

**Decision 2: Audit is documentation, not code**
- **Why:** Step 5.1 is a verification step. Its deliverable is the audit findings table (documented in Step 1 above), not a set of code changes. If findings had required patches, those patches would appear in Step 1's implementation section. Since no patches are needed, the task's implementation artifact is this document itself.
- **Alternatives considered:** Skipping the audit and proceeding directly to Step 5.2. Rejected — the audit is the only way to confirm the FK-safe invariant holds before running the full suite in an environment where FK violations would produce confusing `DataIntegrityViolationException` failures unrelated to the feature's actual correctness.

**Decision 3: Step 3 moves all 5 task documents to done, not just this one**
- **Why:** Tasks 1–4 task documents were left in `current/` while manual validation was deferred (Java 21 unavailable in the execution environment). Step 5.2 provides that validation. Moving all 5 task documents to `done/` in Step 3 reflects the actual completion state — the tasks are done and their criteria are met — not just that the document was written.
- **Alternatives considered:** Moving each task document to `done/` immediately after each task was executed. Rejected by the established convention: task documents move to `done/` only after the final regression run passes. Step 5.2 is that validation gate.

**Decision 4: Expected test count predicted at 1015, not treated as authoritative**
- **Why:** The prior regression task (OpenRouter Chat Integration Task 5) predicted 955 tests but observed 987 — a 32-test discrepancy that was attributable to count drift and implementation additions. The 1015 prediction is derived by summing the explicitly counted 28 new tests against the 987 baseline. The authoritative check is "0 failures" — the exact count is secondary as long as no tests regressed and all 28 new tests are observed to be present.
- **Alternatives considered:** Treating any count below 1015 as a failure. Rejected — test count variance (due to suite exclusion drift, test parameterization, or minor additions during implementation) should not block feature close-out when the 0-failure condition holds. Investigate if the count is below 1015 by more than 5 before concluding.

---

## Testing Considerations

### Automatic Validation

**Individual suite validation:**

- [ ] From `backend/`: run `./mvnw test -Dtest=EmployeeAccountStatusSecurityTest` — confirm 3/3 pass ⚠ **Java 21 runtime required**<!-- REVIEW-FIX: removed erroneous -pl backend flag; mvnw is invoked from within backend/ so no -pl flag is needed; consistent with all prior task documents -->
- [ ] From `backend/`: run `./mvnw test -Dtest=RegistrationControllerTest` — confirm 10/10 pass ⚠ **Java 21 runtime required**
- [ ] From `backend/`: run `./mvnw test -Dtest=EmployeeServiceCrudIntegrationTest` — confirm 23/23 pass ⚠ **Java 21 runtime required**
- [ ] From `backend/`: run `./mvnw test -Dtest=EmployeeControllerListEndpointTest` — confirm 19/19 pass ⚠ **Java 21 runtime required**
- [ ] From `backend/`: run `./mvnw test -Dtest=SecurityAuthorizationTest` — confirm 16/16 pass ⚠ **Java 21 runtime required**
- [ ] From `backend/`: run `./mvnw test -Dtest=EmployeeMapperTest` — confirm 12/12 pass ⚠ **Java 21 runtime required**

**Full regression:**

- [ ] From `backend/`: run `./mvnw test` — full suite passes with 0 failures; test count is approximately 1015 (excluding pre-existing `authServerApplicationTests.contextLoads` Docker error) ⚠ **Java 21 runtime required**
- [ ] Confirm 0 failures in the full suite (pre-existing `authServerApplicationTests` Docker error excluded)
- [ ] Confirm `EmployeeAccountStatusSecurityTest` (3 tests) GREEN — `disabledEmployeeLoginReturns401WithPendingActivationMessage` is the primary discriminating test for `SecurityUser.isEnabled()` ⚠ **Java 21 runtime required**
- [ ] Confirm `RegistrationControllerTest` (10 tests) GREEN — `selfRegisteredEmployee_cannotLoginBeforeActivation_returns401` and `selfRegisteredEmployee_canLoginAfterAdminActivates_returns200` are the primary end-to-end discriminating tests ⚠ **Java 21 runtime required**
- [ ] Confirm no regressions in `ChatTurnServiceIntegrationTest` (8 tests), `ChatWebSocketSecurityTest` (5 tests), `OpenRouterServiceTest` (8 tests), `MessageServiceWriteSeamsTest` (8 tests), `LlmModelAvailableEndpointTest` (3 tests) — OpenRouter Chat Integration tests must not regress ⚠ **Java 21 runtime required**

### Manual Validation

No manual validation is required for this task. All behaviors — including the end-to-end register → login-blocked → admin-activate → login-succeeds flow — are verifiable through the automated test suite using `MockMvc` integration tests with real JWT tokens and real BCrypt password encoding. The feature has no frontend or WebSocket components (the `POST /register` and `PATCH /employee/{id}/activate` endpoints are REST-only).

---

## Related Code Explanations

- `backend/src/main/resources/application-test.properties` — `jdbc:h2:mem:testdb` named database; shared across all `@ActiveProfiles("test")` contexts in the same JVM
- `backend/src/test/java/com/agentForgeBackend/configuration/security/EmployeeAccountStatusSecurityTest.java` — FK-safe setUp: messages → conversations → agents → employees → clients → admins; creates 1 disabled and 1 active `EmployeeEntity` directly to test `SecurityUser.isEnabled()` enforcement
- `backend/src/test/java/com/agentForgeBackend/models/hq/employee/RegistrationControllerTest.java` — FK-safe setUp: messages → conversations → agents → employees → clients → admins + `authHelper.cleanUp()`; end-to-end tests 9–10 verify the complete login gate
- `backend/src/main/java/com/agentForgeBackend/shared/securityUser/SecurityUser.java` — `isEnabled()`, `isAccountNonExpired()`, `isAccountNonLocked()`, `isCredentialsNonExpired()` now correctly override `UserDetails`; Task 1 fix; verified by `EmployeeAccountStatusSecurityTest`<!-- REVIEW-FIX: corrected path from src/test/ to src/main/ — SecurityUser.java is a production class, not a test class -->
- `backend/src/main/java/com/agentForgeBackend/exceptions/GlobalExceptionHandler.java` — `@ExceptionHandler(DisabledException.class)` returns 401 "Account pending admin activation."; Task 1 addition; exercised by `EmployeeAccountStatusSecurityTest` and `RegistrationControllerTest` test 9
- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeService.java` — `register()` sets `setEnabled(false)` (line after `mapper.toEntity(form)`) — the critical line; if omitted, `validRegistration_savesEmployeeWithEnabledFalse` catches the regression

---

## Completion Criteria

- [x] Parent document reviewed; Phase 5 Steps 5.1 and 5.2 reflected accurately in this task
- [x] All mandatory skills loaded: `documentation-management`, `solid-deep-design`, `tdd`, `memory-bank`, `glossary-management`
- [x] FK-safe cleanup audit complete for all 6 test files from Tasks 1–4 — findings documented in Step 1 (no patches required)
- [ ] From `backend/`: `./mvnw test -Dtest=EmployeeAccountStatusSecurityTest` passes (3/3)
- [ ] From `backend/`: `./mvnw test -Dtest=RegistrationControllerTest` passes (10/10)
- [ ] From `backend/`: `./mvnw test -Dtest=EmployeeServiceCrudIntegrationTest` passes (23/23)
- [ ] From `backend/`: `./mvnw test -Dtest=EmployeeControllerListEndpointTest` passes (19/19)
- [ ] From `backend/`: `./mvnw test -Dtest=SecurityAuthorizationTest` passes (16/16)
- [ ] From `backend/`: `./mvnw test -Dtest=EmployeeMapperTest` passes (12/12)
- [ ] From `backend/`: `./mvnw test` passes with 0 failures and approximately 1015 tests (excluding pre-existing Docker error)
- [x] No manual validation steps required (all behaviors verified by automated test suite)
- [ ] `documentation/Features/to-do/Employee-Self-Registration-and-Admin-Activation.md` — Phase 5.1 `[x]`, Step 5.2 pending Java 21 runtime (⚠ test execution deferred)
- [ ] All 5 Employee Self-Registration task documents moved to `documentation/Tasks/done/`
- [ ] `documentation/Features/to-do/Employee-Self-Registration-and-Admin-Activation.md` moved to `documentation/Features/done/`
- [x] `documentation/Memory/context.md` and `documentation/Memory/progress.md` updated to reflect Task 5 execution
