# Task: Message Entity Regression and Supplemental Coverage

#task #current #medium-complexity #parent-message-entity-and-conversation-history

**Parent:** [[Message-Entity-and-Conversation-History]]
**Parent Type:** Feature
**Related Step(s):** Phase 3 — Steps 3.1, 3.2, 3.3
**Estimated Complexity:** Medium

---

## Goal

Resolve the 50 pre-existing FK-safe cleanup failures in `AgentServiceCrudIntegrationTest` and `AgentControllerTest` by patching their `@BeforeEach` methods to include `messageRepository.deleteAll()` and `conversationRepository.deleteAll()` in the correct FK-safe order. Extend `SecurityAuthorizationTest` with three message history security tests and its own `messageRepository.deleteAll()` prepend. Apply defensive `messageRepository.deleteAll()` prepends to the remaining 17 `@SpringBootTest` classes whose `@BeforeEach` cleanup does not yet begin with message deletion. Close with a full `./mvnw test` regression run confirming zero failures.

---

## Parent Context

The parent feature adds the `Message` persistence slice (Tasks 1–2 complete). Task 3 is the quality gate: FK-safe cleanup patches, security test supplementation, and full regression.

**Key decisions from the parent that govern this task:**

- **FK-safe delete order is now:** `messageRepository.deleteAll()` → `conversationRepository.deleteAll()` → `agentRepository.deleteAll()` → `llmModelRepository.deleteAll()` → `employeeRepository.deleteAll()`. The message-first rule exists because `message.llm_model_id` FK has NO cascade — once the next feature writes ASSISTANT messages with non-null `llm_model_id`, any test that calls `llmModelRepository.deleteAll()` without first clearing messages will throw `DataIntegrityViolationException`. The conversation-first rule (before llmModels/employees) is an existing constraint already documented in `known-issues.md`.
- **The 50 failures** are caused by `AgentServiceCrudIntegrationTest` and `AgentControllerTest` calling `employeeRepository.deleteAll()` without first clearing conversations. After Tasks 1–2 introduced `MessageServiceIntegrationTest` and `MessageControllerTest` (which create conversations in their `@BeforeEach`), Agent test classes' cleanup now encounters orphaned conversation rows that violate `conversation.employee_id`'s `nullable = false` constraint.
- **`SecurityAuthorizationTest` extension:** Add `anonymous GET /conversation/{id}/messages → 401`, `ROLE_ADMIN → 403`, `ROLE_EMPLOYEE with real JWT → 404` (authorized but no such conversation) — matching the three-test security pattern used for agent and conversation endpoints. Also prepend `messageRepository.deleteAll()` to its `@BeforeEach`.
- **No production code changes** are needed in this task. No new entities, services, or controllers. Only test-class cleanup order and new security test methods.
- **Scope boundary:** `POST /conversation/{id}/messages` (send-message), `OpenRouterService`, and analytics queries are out of scope — deferred to the OpenRouter Chat Integration feature.

---

## Preconditions / Dependencies

- Tasks 1 and 2 of the Message feature are complete:
  - `MessageEntity`, `MessageRole`, `MessageDTO`, `MessageMapper`, `MessageRepository` exist in `backend/src/main/java/com/agentForgeBackend/models/message/`.
  - `MessageService` and `MessageController` exist in the same package.
  - 22 Message domain tests pass: `MessageRepositoryTest` ×5, `MessageMapperTest` ×4, `MessageMapperIntegrationTest` ×2, `MessageServiceIntegrationTest` ×5, `MessageControllerTest` ×6.
- `SecurityAuthorizationTest` exists at `backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java` with 13 tests (admin, login, agent, conversation security rows). Its `@BeforeEach` already includes `conversationRepository.deleteAll()` but is missing `messageRepository.deleteAll()`.
- `AgentServiceCrudIntegrationTest` and `AgentControllerTest` are failing with ~50 errors caused by missing `conversationRepository.deleteAll()` (and `messageRepository.deleteAll()`) before `employeeRepository.deleteAll()`.
- `MessageController` exists and is registered — `GET /conversation/{id}/messages` returns `404` (not Spring MVC's own 404) for non-existent conversations, and `401`/`403` for unauthorized/forbidden callers. The `SecurityAuthorizationTest` employee positive path therefore uses a real JWT and expects `404` (authorized, no such conversation).
- Full test suite baseline from Task 2: 22 Message domain tests pass, ~50 errors in Agent/suite tests (≈36 direct failures from `AgentServiceCrudIntegrationTest` [20 tests] + `AgentControllerTest` [16 tests] in the default `./mvnw test` run; additional failures appear in `E2ESuiteTest`/`UtilsSuiteTest` which are excluded from the default Surefire run per `tech.md`), 1 pre-existing Docker error (`authServerApplicationTests.contextLoads`).

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — Selected — task template, naming conventions, doc config
- `solid-deep-design` — Selected — confirms all patches are test-layer changes; no production module boundaries are crossed; the deletion test applied to this task: deleting the FK-safe order patches would cause inter-test contamination, so they earn their keep
- `tdd` — Selected — Step 3.2 security tests are written first (RED: expected pass, since controller exists), then confirmed green; the 50 Agent failures are the RED state for the FK patches
- `memory-bank` — Selected — `known-issues.md` FK-safe delete order confirmed; active context confirms 50 failures deferred from Task 2; progress log reviewed
- `glossary-management` — Selected — Message, Conversation, Employee terms reviewed; no new domain terms introduced
- `find-docs` — Not needed — no new library APIs introduced; all Spring Boot 3.4.1 + Spring Security 6.x patterns already established by Tasks 1–2

### Documentation Reviewed

- `documentation/Features/to-do/Message-Entity-and-Conversation-History.md` — Steps 3.1, 3.2, 3.3, Risk Assessment, Testing Decisions
- `documentation/Tasks/current/Message-Entity-and-Conversation-History-step-2-service-and-controller.md` — Task 2 completion state, confirmed 50 failures are deferred here, `@BeforeEach` patterns for `MessageServiceIntegrationTest` and `MessageControllerTest` (canonical models for the FK-safe cleanup order in new test classes)
- `documentation/Memory/known-issues.md` — FK-safe delete order: `messageRepository.deleteAll()` → `conversationRepository.deleteAll()` → `agentRepository.deleteAll()` → `llmModelRepository.deleteAll()` → `employeeRepository.deleteAll()`; message-aware cleanup patches confirmed as Task 3 responsibility
- `documentation/Tasks/done/Conversation-Entity-and-Employee-Crud-step-3-business-rules-and-crud.md` — canonical prior art for the FK-safe `@BeforeEach` patch pattern applied to 9 classes during the Conversation feature; the same technique is applied here to 19 additional classes

### Related Existing Code

- [[SecurityAuthorizationTest-java]] — `backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java` — primary target for new security tests; existing 3-test pattern (anonymous/admin/employee) for agent and conversation endpoints is the model
- [[AgentServiceCrudIntegrationTest-java]] — `backend/src/test/java/com/agentForgeBackend/models/agent/AgentServiceCrudIntegrationTest.java` — one of the two actively failing classes; missing `conversationRepository` injection and `conversationRepository.deleteAll()` before employees
- [[AgentControllerTest-java]] — `backend/src/test/java/com/agentForgeBackend/models/agent/AgentControllerTest.java` — second actively failing class; same root cause
- [[MessageServiceIntegrationTest-java]] — `backend/src/test/java/com/agentForgeBackend/models/message/MessageServiceIntegrationTest.java` — canonical model for the correct FK-safe `@BeforeEach` cleanup order (already correct)
- [[MessageControllerTest-java]] — `backend/src/test/java/com/agentForgeBackend/models/message/MessageControllerTest.java` — canonical model for the correct FK-safe `@BeforeEach` cleanup order (already correct)

---

## Implementation Details

### Approach

**Why the 50 failures exist now but didn't before Task 2:**
`AgentServiceCrudIntegrationTest` and `AgentControllerTest` call `employeeRepository.deleteAll()` in their `@BeforeEach`. Before the Message feature, no `@SpringBootTest` class committed conversations to H2 before these Agent tests ran. Task 2 introduced `MessageServiceIntegrationTest` and `MessageControllerTest`, which seed conversations in their `@BeforeEach`. JUnit 5 runs `@SpringBootTest` test classes sharing a single H2 instance. If `MessageServiceIntegrationTest` runs before `AgentServiceCrudIntegrationTest` (alphabetically `M` before `A` — but JUnit class ordering may vary), conversations committed by the Message test `@BeforeEach` remain in H2. The Agent tests' `employeeRepository.deleteAll()` then hits the `conversation.employee_id` FK constraint and throws `DataIntegrityViolationException`. This is the 50-error root cause.

**SOLID + Depth analysis for this task:**
- All changes in this task are test-layer patches — no production module interfaces change.
- Depth: the FK-safe delete order concentrates cleanup invariants inside each test class's `@BeforeEach`, preventing complexity from scattering across individual tests. Adding `messageRepository.deleteAll()` first deepens the module's isolation guarantee.

**Three execution phases:**

1. **Security test extension (Step 1 in this task):** Write three new test methods in `SecurityAuthorizationTest` following the existing 3-test pattern (anonymous/admin/employee). Prepend `messageRepository.deleteAll()` + `messageRepository.flush()` to `@BeforeEach`. Run `SecurityAuthorizationTest` alone to confirm all 16 tests pass.

2. **Critical FK patches (Steps 2–3):** Patch `AgentServiceCrudIntegrationTest` (add `MessageRepository` + `ConversationRepository` injections; prepend their `deleteAll()/flush()` calls before agents) and `AgentControllerTest` (same). Run both individually, confirm 50 errors → 0.

3. **Defensive patches (Step 4):** Apply `messageRepository.deleteAll()` + `messageRepository.flush()` as the first two calls in the `@BeforeEach` of the remaining 17 `@SpringBootTest` test classes. For the 3 classes that also lack `conversationRepository.deleteAll()` before `employeeRepository.deleteAll()` (`AuthUserUtilTest`, `ClientServiceCrudIntegrationTest`, and any others identified during review), add `conversationRepository.deleteAll()` and `agentRepository.deleteAll()` in the correct position as well.

**Why `@DataJpaTest` classes are excluded:**
`@DataJpaTest` wraps each test method in a rollback transaction. No data persists between test methods. These classes (`MessageRepositoryTest`, `MessageMapperIntegrationTest`, `ConversationRepositoryTest`, `AgentRepositoryTest`, `LlmModelRepositoryTest`, `EmployeeRepositoryTest`, `ClientRepositoryTest`, `AppSettingsRepositoryTest`) do not share H2 state with `@SpringBootTest` classes and do not need FK-safe cleanup patches.

<!-- REVIEW-FIX: Added explicit exclusion rationale for AgentServiceMethodSecurityIntegrationTest — it is a @SpringBootTest class but has no @BeforeEach, so it must be explicitly named to avoid confusion when counting the 20 classes to patch. -->
**Why `AgentServiceMethodSecurityIntegrationTest` is excluded from the patch list:**
This `@SpringBootTest` class was assessed and confirmed to have **no `@BeforeEach` method**. Its two test methods rely solely on `@WithMockUser` and assert that Spring Security's `@PreAuthorize("hasRole('EMPLOYEE')")` throws `AccessDeniedException` before any method body in `AgentService` executes — meaning no DB operations run. With no `deleteAll()` calls to order, this class requires no FK-safe patch and must not be added to any patch group.

### Files to Create/Modify

**Modified test files:**
- [ ] `backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java` — add `MessageRepository` injection + prepend `messageRepository.deleteAll()` to `@BeforeEach` + 3 new message history security tests
- [ ] `backend/src/test/java/com/agentForgeBackend/models/agent/AgentServiceCrudIntegrationTest.java` — add `MessageRepository` + `ConversationRepository` injections + prepend both `deleteAll()` calls
- [ ] `backend/src/test/java/com/agentForgeBackend/models/agent/AgentControllerTest.java` — add `MessageRepository` + `ConversationRepository` injections + prepend both `deleteAll()` calls
- [ ] `backend/src/test/java/com/agentForgeBackend/models/appSettings/AppSettingsServiceIntegrationTest.java` — add `MessageRepository` injection + prepend `messageRepository.deleteAll()`
- [ ] `backend/src/test/java/com/agentForgeBackend/models/appSettings/AppSettingsControllerTest.java` — same
- [ ] `backend/src/test/java/com/agentForgeBackend/models/conversation/ConversationControllerTest.java` — same
- [ ] `backend/src/test/java/com/agentForgeBackend/models/conversation/ConversationServiceIntegrationTest.java` — same
- [ ] `backend/src/test/java/com/agentForgeBackend/models/llm/LlmModelServiceCrudIntegrationTest.java` — same
- [ ] `backend/src/test/java/com/agentForgeBackend/models/llm/LlmModelControllerTest.java` — same
- [ ] `backend/src/test/java/com/agentForgeBackend/models/llm/LlmModelServiceListQueryIntegrationTest.java` — same
- [ ] `backend/src/test/java/com/agentForgeBackend/shared/tools/AuthUserUtilTest.java` — add `MessageRepository` + `ConversationRepository` + `AgentRepository` injections + prepend all three `deleteAll()` calls before `employeeRepository.deleteAll()`
- [ ] `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeLoginJwtTest.java` — add `MessageRepository` injection + prepend `messageRepository.deleteAll()`
- [ ] `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeServiceCrudIntegrationTest.java` — same
- [ ] `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeServiceListQueryIntegrationTest.java` — same
- [ ] `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeControllerListEndpointTest.java` — same
- [ ] `backend/src/test/java/com/agentForgeBackend/models/hq/client/ClientServiceCrudIntegrationTest.java` — add `MessageRepository` + `ConversationRepository` + `AgentRepository` injections + prepend all three before `employeeRepository.deleteAll()`
- [ ] `backend/src/test/java/com/agentForgeBackend/models/hq/admin/AdminControllerListEndpointTest.java` — add `MessageRepository` injection + prepend `messageRepository.deleteAll()` (defensive only)
- [ ] `backend/src/test/java/com/agentForgeBackend/models/hq/admin/AdminServiceListQueryIntegrationTest.java` — same
- [ ] `backend/src/test/java/com/agentForgeBackend/models/hq/client/ClientControllerListEndpointTest.java` — same
- [ ] `backend/src/test/java/com/agentForgeBackend/models/hq/client/ClientServiceListQueryIntegrationTest.java` — same

**No production files are created or modified in this task.**

---

## Step-by-Step Implementation

### Step 1: Patch `SecurityAuthorizationTest` — Add Message Cleanup + 3 New Security Tests

**Goal:** Prepend `messageRepository.deleteAll()` to `SecurityAuthorizationTest.@BeforeEach` and add the three message history security tests. Run `SecurityAuthorizationTest` alone to confirm all 16 tests pass.

**Dependencies:** Task 2 complete — `MessageController` registered at `GET /conversation/{conversationId}/messages`; `MessageRepository` injectable; `TestAuthenticationHelper.getEmployeeToken()` available.

- [ ] Add `MessageRepository` import and `@Autowired` injection to `SecurityAuthorizationTest`
- [ ] In `@BeforeEach`, prepend `messageRepository.deleteAll()` + `messageRepository.flush()` as the first two lines (before `clientRepository.deleteAll()`)
- [ ] Add three new test methods for message history security (see Implementation below)
- [ ] From `backend/`: run `./mvnw test -Dtest=SecurityAuthorizationTest`
- [ ] Confirm **16 tests pass**, 0 failures (13 existing + 3 new)

**Why this step is first:** `SecurityAuthorizationTest` is the primary security contract for the `GET /conversation/{id}/messages` endpoint. Writing these tests first proves the existing security rule (`/conversation/**` → `hasRole("EMPLOYEE")`) covers the sub-resource correctly, before any cleanup patches are applied.

#### Implementation — `@BeforeEach` diff

```java
// Add this injection field with the other @Autowired fields:
@Autowired private MessageRepository messageRepository;

// @BeforeEach becomes:
@BeforeEach
void setUp() {
    // messageRepository.deleteAll() is now first — message.llm_model_id has no cascade;
    // once ASSISTANT messages are written, this prevents FK violations when llmModels are deleted.
    messageRepository.deleteAll();
    messageRepository.flush();
    clientRepository.deleteAll();
    clientRepository.flush();
    adminRepository.deleteAll();
    adminRepository.flush();
    conversationRepository.deleteAll();
    conversationRepository.flush();
    agentRepository.deleteAll();
    agentRepository.flush();
    employeeRepository.deleteAll();
    employeeRepository.flush();
    authHelper.initializeMockUsers();
    authHelper.initializeEmployeeMockUser();
}
```

#### Implementation — 3 new test methods

Add these after the `adminRequestToConversationEndpointReturns403` test:

```java
// Message history security tests — GET /conversation/{id}/messages lands under the existing
// /conversation/** → hasRole("EMPLOYEE") rule. MessageController exists since Task 2.

@Test
void anonymousRequestToMessageHistoryEndpointReturns401() throws Exception {
    mockMvc.perform(get("/conversation/999999/messages"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.error").value("Unauthorized"));
}

@Test
@WithMockUser(roles = "ADMIN")
void adminRequestToMessageHistoryEndpointReturns403() throws Exception {
    mockMvc.perform(get("/conversation/999999/messages"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.error").value("Forbidden"));
}

@Test
void employeeRequestToMessageHistoryEndpointPassesSecurity() throws Exception {
    // GET /conversation/999999/messages → 404: the request is authorized (ROLE_EMPLOYEE),
    // but MessageService.getHistory() throws ItemNotFoundException because no conversation 999999 exists.
    // 404 proves the security rule passes — the request reached the service.
    mockMvc.perform(get("/conversation/999999/messages")
            .header("Authorization", authHelper.getEmployeeToken()))
        .andExpect(status().isNotFound());
}
```

**Required import to add:**
```java
import com.agentForgeBackend.models.message.MessageRepository;
```

#### Edge Cases

1. **`anonymousRequestToMessageHistoryEndpointReturns401` is covered by the existing `/conversation/**` HTTP rule:** Spring Security blocks the anonymous request at the filter chain before it reaches Spring MVC. No `MessageController` or `MessageService` code runs.
2. **`adminRequestToMessageHistoryEndpointReturns403` uses `@WithMockUser(roles = "ADMIN")`:** This is consistent with `adminRequestToAgentEndpointReturns403` and `adminRequestToConversationEndpointReturns403` — a focused role-matrix check, not a full JWT flow.
3. **`employeeRequestToMessageHistoryEndpointPassesSecurity` returns 404, not 200:** Unlike `POST /agent/list` (returns 200 with empty page) and `POST /conversation/list` (returns 200 with empty page), `GET /conversation/999999/messages` hits ownership logic in `MessageService.getHistory()`. `conversationRepository.findByIdAndEmployeeId(999999L, ...)` finds nothing → `ItemNotFoundException` → HTTP 404. This is the correct observable behavior: the request was authorized, the service ran, the conversation was not found.
4. **No conversation seeded in setUp for the employee positive test:** The test uses conversation ID `999999L` (a sentinel value guaranteed not to exist in H2 after `conversationRepository.deleteAll()`). Do not seed a real conversation — the test asserts 404, not 200.

---

### Step 2: Patch `AgentServiceCrudIntegrationTest`

**Goal:** Add `MessageRepository` and `ConversationRepository` injections; prepend `messageRepository.deleteAll()` and `conversationRepository.deleteAll()` to `@BeforeEach` before the existing `agentRepository.deleteAll()`. This directly resolves the Agent service test failures.

**Dependencies:** Step 1 complete; `MessageRepository` and `ConversationRepository` are injectable.

- [ ] Add `MessageRepository` and `ConversationRepository` imports and `@Autowired` injections
- [ ] Prepend `messageRepository.deleteAll()` + `messageRepository.flush()` + `conversationRepository.deleteAll()` + `conversationRepository.flush()` before `agentRepository.deleteAll()`
- [ ] From `backend/`: run `./mvnw test -Dtest=AgentServiceCrudIntegrationTest`
- [ ] Confirm all Agent service tests pass, 0 failures

**Why this step is critical:** This is one of the two root causes of the 50 pre-existing failures. `AgentServiceCrudIntegrationTest.@BeforeEach` calls `agentRepository.deleteAll()` then `employeeRepository.deleteAll()`. When conversation rows exist in H2 (seeded by earlier `@SpringBootTest` test classes), `employeeRepository.deleteAll()` throws `DataIntegrityViolationException` because `conversation.employee_id` is `nullable = false` with no cascade.

#### Implementation — `@BeforeEach` diff

```java
// Add these injections with the other @Autowired fields:
@Autowired private ConversationRepository conversationRepository;
@Autowired private MessageRepository messageRepository;

// @BeforeEach becomes:
@BeforeEach
void setUp() {
    // FK-safe delete order: messages first (llm_model_id FK has no cascade once ASSISTANT messages exist).
    // Then conversations (employee_id FK is nullable=false; cannot delete employees while conversations exist).
    messageRepository.deleteAll();
    messageRepository.flush();
    conversationRepository.deleteAll();
    conversationRepository.flush();
    agentRepository.deleteAll();
    agentRepository.flush();
    employeeRepository.deleteAll();
    employeeRepository.flush();

    // Username must match @WithMockUser so AuthUserUtil resolves this as the current employee
    ownerEmployee = employeeRepository.saveAndFlush(new EmployeeEntity(
            "Owner", "Agent", "agent-svc-owner@test.com",
            Set.of(UserRoles.EMPLOYEE), "agent-svc-owner@test.com", "encodedPass"));
}
```

**Required imports to add:**
```java
import com.agentForgeBackend.models.conversation.ConversationRepository;
import com.agentForgeBackend.models.message.MessageRepository;
```

#### Edge Cases

1. **`LlmModelRepository` is not injected here:** `AgentServiceCrudIntegrationTest` does not delete LLM models in its `@BeforeEach`. The conversation cascade handles FK to `llm_model_id` when conversations are deleted (conversation.current_model_id is non-null). LLM model cleanup is not required in this class.
2. **`agentRepository.deleteAll()` remains after `conversationRepository.deleteAll()`:** Conversations reference agents via a nullable FK (`agent_id`). Deleting conversations before agents is safe — the FK is nullable and `@OnDelete(SET_NULL)` handles cascade on agent deletion anyway. The existing order `conversations → agents` is correct.
3. **The 20 AgentService test methods are unchanged:** This step adds only to the `@BeforeEach` setup. No existing test bodies are touched.

---

### Step 3: Patch `AgentControllerTest`

**Goal:** Add `MessageRepository` and `ConversationRepository` injections; prepend their `deleteAll()` calls before the existing `agentRepository.deleteAll()` in `@BeforeEach`. Confirm all Agent controller tests pass.

**Dependencies:** Step 2 complete.

- [ ] Add `MessageRepository` and `ConversationRepository` imports and `@Autowired` injections
- [ ] Prepend `messageRepository.deleteAll()` + `messageRepository.flush()` + `conversationRepository.deleteAll()` + `conversationRepository.flush()` before `agentRepository.deleteAll()`
- [ ] From `backend/`: run `./mvnw test -Dtest=AgentControllerTest`
- [ ] Confirm all Agent controller tests pass, 0 failures

**Why this step is critical:** This is the second of the two actively failing classes. `AgentControllerTest.@BeforeEach` deletes `clients → admins → agents → employees` but skips `conversationRepository.deleteAll()` before `employeeRepository.deleteAll()`. Same root cause as `AgentServiceCrudIntegrationTest`.

#### Implementation — `@BeforeEach` diff

```java
// Add these injections with the other @Autowired fields:
@Autowired private ConversationRepository conversationRepository;
@Autowired private MessageRepository messageRepository;

// @BeforeEach becomes:
@BeforeEach
void setUp() {
    // AppSettingsEntity.updatedBy is an FK to AdminEntity. Clear it before deleting admins.
    appSettingsRepository.findFirstBy().ifPresent(settings -> {
        settings.setUpdatedBy(null);
        appSettingsRepository.saveAndFlush(settings);
    });

    // FK-safe delete order: messages → conversations → agents → users
    messageRepository.deleteAll();
    messageRepository.flush();
    conversationRepository.deleteAll();
    conversationRepository.flush();
    clientRepository.deleteAll();
    clientRepository.flush();
    adminRepository.deleteAll();
    adminRepository.flush();
    agentRepository.deleteAll();
    agentRepository.flush();
    employeeRepository.deleteAll();
    employeeRepository.flush();

    authHelper.initializeMockUsers();        // admin + client JWTs
    authHelper.initializeEmployeeMockUser(); // employee JWT + user reference
}
```

**Required imports to add:**
```java
import com.agentForgeBackend.models.conversation.ConversationRepository;
import com.agentForgeBackend.models.message.MessageRepository;
```

#### Edge Cases

1. **`clientRepository.deleteAll()` and `adminRepository.deleteAll()` before `employeeRepository.deleteAll()` order is unchanged:** These user subtypes do not have FKs from conversations or messages, so their order relative to employees does not matter for the current FK constraint. The message + conversation prepend is the only new addition.
2. **`appSettingsRepository.findFirstBy()` guard remains first:** `AppSettingsEntity.updatedBy` is an FK to `AdminEntity`. Clearing it before deleting admins is the existing correct behavior. The message/conversation cleanup comes after this guard.
3. **The 16 AgentController test methods are unchanged:** Only the `@BeforeEach` cleanup order changes.

---

### Step 4: Verify Critical Patches — Run Agent Tests

**Goal:** Confirm the 50 pre-existing errors are resolved after Steps 2 and 3.

**Dependencies:** Steps 2 and 3 complete.

- [ ] From `backend/`: run `./mvnw test -Dtest=AgentServiceCrudIntegrationTest,AgentControllerTest`
- [ ] Confirm combined: **0 failures** (previously ~50 errors)
- [ ] Confirm all Agent test methods pass (20 service + 16 controller)

---

### Step 5: Apply Defensive Message Cleanup to All Remaining `@SpringBootTest` Classes

**Goal:** Prepend `messageRepository.deleteAll()` + `messageRepository.flush()` to the `@BeforeEach` of all remaining `@SpringBootTest` test classes that contain `deleteAll()` calls but do not already start with message cleanup. For two classes (`AuthUserUtilTest`, `ClientServiceCrudIntegrationTest`) that also lack `conversationRepository.deleteAll()` before `employeeRepository.deleteAll()`, also add conversation and agent cleanup in the correct position.

**Dependencies:** Steps 1–4 complete.

**Why this step is critical:** Currently no ASSISTANT messages exist (the send-message flow is out of scope for this feature), so `message.llm_model_id` violations cannot occur yet. Once the OpenRouter Chat Integration feature writes ASSISTANT messages, any test class that calls `llmModelRepository.deleteAll()` without first clearing messages will fail. Applying the defensive patches now prevents a second wave of FK failures in the next feature.

#### Classes to Patch — Pattern A: Prepend message cleanup only (conversation cleanup already present)

For each of these classes: add `@Autowired private MessageRepository messageRepository;` and add `messageRepository.deleteAll(); messageRepository.flush();` as the first two lines of `@BeforeEach`. No other changes.

| Class | File Path | Existing first deleteAll | After patch: first deleteAll |
|-------|-----------|--------------------------|------------------------------|
| `AppSettingsServiceIntegrationTest` | `models/appSettings/...` | `conversationRepository.deleteAll()` | `messageRepository.deleteAll()` |
| `AppSettingsControllerTest` | `models/appSettings/...` | `conversationRepository.deleteAll()` | `messageRepository.deleteAll()` |
| `ConversationControllerTest` | `models/conversation/...` | `conversationRepository.deleteAll()` | `messageRepository.deleteAll()` |
| `ConversationServiceIntegrationTest` | `models/conversation/...` | `conversationRepository.deleteAll()` | `messageRepository.deleteAll()` |
| `LlmModelServiceCrudIntegrationTest` | `models/llm/...` | `conversationRepository.deleteAll()` | `messageRepository.deleteAll()` |
| `LlmModelControllerTest` | `models/llm/...` | `conversationRepository.deleteAll()` | `messageRepository.deleteAll()` |
| `LlmModelServiceListQueryIntegrationTest` | `models/llm/...` | `conversationRepository.deleteAll()` | `messageRepository.deleteAll()` |
| `EmployeeLoginJwtTest` | `models/hq/employee/...` | `conversationRepository.deleteAll()` | `messageRepository.deleteAll()` |
| `EmployeeServiceCrudIntegrationTest` | `models/hq/employee/...` | `conversationRepository.deleteAll()` | `messageRepository.deleteAll()` |
| `EmployeeServiceListQueryIntegrationTest` | `models/hq/employee/...` | `conversationRepository.deleteAll()` | `messageRepository.deleteAll()` |
| `EmployeeControllerListEndpointTest` | `models/hq/employee/...` | `conversationRepository.deleteAll()` | `messageRepository.deleteAll()` |

**Pattern A `@BeforeEach` change (applies to all 11 classes above):**
```java
// Add injection:
@Autowired private MessageRepository messageRepository;

// In @BeforeEach, insert as first two lines:
messageRepository.deleteAll();
messageRepository.flush();
// ... then all existing deleteAll() calls follow unchanged
```

**Required import for all Pattern A classes:**
```java
import com.agentForgeBackend.models.message.MessageRepository;
```

<!-- REVIEW-FIX: Clarified that AppSettings classes start with an appSettingsRepository guard (not a deleteAll), so messageRepository.deleteAll() must go before that guard, not merely before the first deleteAll() call. -->
> **Note for `AppSettingsServiceIntegrationTest` and `AppSettingsControllerTest`:** Their `@BeforeEach` begins with an `appSettingsRepository.findFirstBy().ifPresent(...)` guard that clears FK references (`openRouterApiKey`, `defaultModel`, `updatedBy`) in the singleton AppSettings row before deleting the referenced entities. Insert `messageRepository.deleteAll()` and `messageRepository.flush()` as the **first two lines, before this guard**, not after it.

---

#### Classes to Patch — Pattern B: Prepend message + conversation + agent cleanup (employee is deleted without FK-safe order)

These classes delete `employeeRepository.deleteAll()` without first clearing conversations, agents, and messages. They need all three prepended.

**`AuthUserUtilTest`:**
- Current: `employeeRepository.deleteAll()` → `clientRepository.deleteAll()` → `adminRepository.deleteAll()`
- Risk: conversation and agent rows from other @SpringBootTest tests violate `conversation.employee_id` and `agent.owner_id` FKs

```java
// Add injections:
@Autowired private MessageRepository messageRepository;
@Autowired private ConversationRepository conversationRepository;
@Autowired private AgentRepository agentRepository;

// @BeforeEach — prepend before the existing employee deleteAll:
messageRepository.deleteAll();
messageRepository.flush();
conversationRepository.deleteAll();
conversationRepository.flush();
agentRepository.deleteAll();
agentRepository.flush();
employeeRepository.deleteAll();
employeeRepository.flush();
// ... then existing client, admin deleteAll calls and SecurityContextHolder.clearContext()
```

**Required imports:**
```java
import com.agentForgeBackend.models.message.MessageRepository;
import com.agentForgeBackend.models.conversation.ConversationRepository;
import com.agentForgeBackend.models.agent.AgentRepository;
```

---

**`ClientServiceCrudIntegrationTest`:**
- Current: `employeeRepository.deleteAll()` → `clientRepository.deleteAll()` → `adminRepository.deleteAll()`
- Risk: same as `AuthUserUtilTest` — conversations/agents from other tests block employee deletion

```java
// Add injections:
@Autowired private MessageRepository messageRepository;
@Autowired private ConversationRepository conversationRepository;
@Autowired private AgentRepository agentRepository;

// @BeforeEach — prepend before existing employee deleteAll:
messageRepository.deleteAll();
messageRepository.flush();
conversationRepository.deleteAll();
conversationRepository.flush();
agentRepository.deleteAll();
agentRepository.flush();
employeeRepository.deleteAll();
employeeRepository.flush();
// ... then existing client, admin deleteAll calls
```

**Required imports:** same as `AuthUserUtilTest`.

---

#### Classes to Patch — Pattern C: Defensive-only (admin/client entities only, no FK risk from messages/conversations)

These classes only delete admin or client entities. There is no current FK risk from the message table (messages do not reference admins or clients). The `messageRepository.deleteAll()` prepend is purely defensive for consistency and future-proofing.

| Class | Current @BeforeEach deleteAll | 
|-------|-------------------------------|
| `AdminControllerListEndpointTest` | `adminRepository.deleteAll()` |
| `AdminServiceListQueryIntegrationTest` | `adminRepository.deleteAll()` |
| `ClientControllerListEndpointTest` | `clientRepository.deleteAll()` |
| `ClientServiceListQueryIntegrationTest` | `clientRepository.deleteAll()` |

**Pattern C `@BeforeEach` change (all 4 classes):**
```java
// Add injection:
@Autowired private MessageRepository messageRepository;

// In @BeforeEach, insert as first two lines:
messageRepository.deleteAll();
messageRepository.flush();
// ... then existing deleteAll() calls unchanged
```

**Required import:**
```java
import com.agentForgeBackend.models.message.MessageRepository;
```

---

#### Verification for Step 5

- [ ] From `backend/`: run `./mvnw test -Dtest=AppSettingsServiceIntegrationTest,AppSettingsControllerTest`
- [ ] Confirm pass, 0 failures
- [ ] From `backend/`: run `./mvnw test -Dtest=ConversationControllerTest,ConversationServiceIntegrationTest`
- [ ] Confirm pass, 0 failures
- [ ] From `backend/`: run `./mvnw test -Dtest=LlmModelServiceCrudIntegrationTest,LlmModelControllerTest,LlmModelServiceListQueryIntegrationTest`
- [ ] Confirm pass, 0 failures
- [ ] From `backend/`: run `./mvnw test -Dtest=EmployeeLoginJwtTest,EmployeeServiceCrudIntegrationTest,EmployeeServiceListQueryIntegrationTest,EmployeeControllerListEndpointTest`
- [ ] Confirm pass, 0 failures
- [ ] From `backend/`: run `./mvnw test -Dtest=AuthUserUtilTest,ClientServiceCrudIntegrationTest`
- [ ] Confirm pass, 0 failures
- [ ] From `backend/`: run `./mvnw test -Dtest=AdminControllerListEndpointTest,AdminServiceListQueryIntegrationTest,ClientControllerListEndpointTest,ClientServiceListQueryIntegrationTest`
- [ ] Confirm pass, 0 failures

---

### Step 6: Full Regression Run

**Goal:** Confirm the complete test suite has zero failures after all patches are applied.

**Dependencies:** Steps 1–5 complete.

- [ ] From `backend/`: run `./mvnw test`
- [ ] Confirm all 22 Message domain tests pass (`MessageRepositoryTest` ×5, `MessageMapperTest` ×4, `MessageMapperIntegrationTest` ×2, `MessageServiceIntegrationTest` ×5, `MessageControllerTest` ×6)
- [ ] Confirm `SecurityAuthorizationTest` passes with **16 tests** (13 existing + 3 new message history)
- [ ] Confirm `AgentServiceCrudIntegrationTest` passes with **20 tests** (0 failures — previously ~25+ errors)
- [ ] Confirm `AgentControllerTest` passes with **16 tests** (0 failures — previously ~25+ errors)
- [ ] Confirm all previously passing test classes still pass (0 new failures)
- [ ] Total count expected: ≥ 906 + 3 new SecurityAuthorizationTest tests = **≥ 909 tests, 0 failures**
- [ ] Pre-existing `authServerApplicationTests.contextLoads` Docker error is expected if Docker Compose is not running — not caused by this task

**Why this step is critical:** The full suite run is the only way to verify that no circular or indirect dependency was missed in the FK-safe patch sequence. A patch that fixes one class's `@BeforeEach` can surface a previously hidden failure in another class if the cleanup order is still incomplete.

---

## Design Decisions

**Decision 1: `messageRepository.deleteAll()` is the absolute first call in every `@BeforeEach`, even in classes that do not use messages**
- **Why:** `message.llm_model_id` is a nullable FK with no cascade. Once ASSISTANT messages are written (next feature: OpenRouter Chat Integration), any test that deletes LLM models without first clearing messages will fail with `DataIntegrityViolationException`. Applying the patch universally now prevents a second wave of FK failures that would otherwise require patching 17+ classes in the next feature.
- **Alternatives considered:** (1) Patch only classes that call `llmModelRepository.deleteAll()` — rejected; this leaves admin-only and client-only classes un-patched, creating an inconsistent partial policy that future developers will not follow; (2) Add `CascadeType.REMOVE` from LLM model to messages — rejected; creates bidirectional coupling between `LlmModelEntity` and `MessageEntity` that contradicts the architecture decision to keep message-to-LLM as a one-directional FK.

**Decision 2: The 50 failures are fixed in `AgentServiceCrudIntegrationTest` and `AgentControllerTest` by adding `conversationRepository.deleteAll()`, not by reordering test class execution**
- **Why:** JUnit 5 test class execution order is not guaranteed across `@SpringBootTest` classes. Relying on execution order to prevent FK violations is fragile — any tooling, IDE, or Maven Surefire configuration change can reorder test classes. FK-safe `@BeforeEach` cleanup is the robust, execution-order-independent solution. Each class must be self-contained in its cleanup.
- **Alternatives considered:** `@TestMethodOrder(MethodOrderer.OrderAnnotation.class)` or Surefire test ordering — rejected; these solve ordering, not cleanup isolation; if a `@BeforeEach` fails, subsequent tests in the same class also fail, so cleanup isolation is the correct fix.

**Decision 3: `AuthUserUtilTest` and `ClientServiceCrudIntegrationTest` (Pattern B) need `agentRepository.deleteAll()` in addition to `conversationRepository.deleteAll()`**
- **Why:** `AgentEntity.owner_id` is a `nullable = false` FK to `EmployeeEntity`. `AgentServiceCrudIntegrationTest` and `AgentControllerTest` seed agents in their tests. If those Agent test classes run before `AuthUserUtilTest` or `ClientServiceCrudIntegrationTest`, agent rows remain in H2. Attempting `employeeRepository.deleteAll()` without first clearing agents throws `DataIntegrityViolationException` on `agent.owner_id`. Adding `agentRepository.deleteAll()` before `employeeRepository.deleteAll()` closes this gap.
- **Alternatives considered:** Only add `conversationRepository.deleteAll()` — rejected; agent rows from other classes would remain and still block employee deletion.

**Decision 4: 3 new `SecurityAuthorizationTest` tests use `/conversation/999999/messages` as the test path**
- **Why:** Using a sentinel conversation ID (999999) that is guaranteed not to exist in H2 after `conversationRepository.deleteAll()` avoids seeding a real conversation in the security test. The focus is on the security rule, not on the service ownership logic. The `ItemNotFoundException` (→ 404) for the employee positive test proves the request reached the service layer (security passed), which is the assertion the security test needs.
- **Alternatives considered:** Seed a real conversation and assert 200 — rejected; the security test's purpose is to verify the HTTP security rule, not the business logic. Seeding data adds test setup complexity without improving coverage of the rule itself. `MessageControllerTest.ownConversationWithNoMessagesReturns200WithEmptyArray` already covers the 200 case with a real JWT and real conversation.

---

## Testing Considerations

### Automatic Validation

- [x] From `backend/`: run `./mvnw test -Dtest=SecurityAuthorizationTest` after Step 1 — confirm **15 tests pass**, 0 failures *(actual: 12 existing + 3 new = 15; Task doc estimate of 13 existing was slightly off)*
- [x] From `backend/`: run `./mvnw test -Dtest=AgentServiceCrudIntegrationTest` after Step 2 — confirm all Agent service tests pass, 0 failures *(26 tests, 0 failures)*
- [x] From `backend/`: run `./mvnw test -Dtest=AgentControllerTest` after Step 3 — confirm all Agent controller tests pass, 0 failures *(23 tests, 0 failures)*
- [x] From `backend/`: run `./mvnw test -Dtest=AgentServiceCrudIntegrationTest,AgentControllerTest` after Steps 2–3 — confirm combined 0 failures (was ~50 errors) *(49 tests, 0 failures)*
- [x] Step 5 batch verifications: targeted test commands passed via full suite verification — 0 failures across all patched classes
- [x] From `backend/`: run `./mvnw test` after Step 5 — confirm **923 tests, 0 failures**, 1 pre-existing Docker error (`authServerApplicationTests.contextLoads` expected if Docker is not running)

### Manual Validation

*(This task contains no new HTTP endpoints or UI changes. No manual validation steps are required.)*

*(Optional diagnostic)* If the full suite still shows FK failures after all patches, enable verbose Surefire output with `./mvnw test -Dsurefire.failIfNoSpecifiedTests=false -Dtest.verbose=true` or run failing classes individually to isolate which `@BeforeEach` is still missing a cleanup step.

---

## Related Code Explanations

- `backend/src/test/java/com/agentForgeBackend/models/message/MessageServiceIntegrationTest.java` — canonical example of the correct FK-safe `@BeforeEach` cleanup order as established in Task 2; this is the reference pattern for all patches in this task
- `backend/src/test/java/com/agentForgeBackend/models/message/MessageControllerTest.java` — same canonical pattern; includes `agentRepository.deleteAll()` before `employeeRepository.deleteAll()` and `messageRepository.deleteAll()` as the first call
- `backend/src/main/java/com/agentForgeBackend/models/message/MessageEntity.java:24` — `@OnDelete(action = OnDeleteAction.CASCADE)` on `conversation_id` FK — deleting a conversation cascades to its messages at DB level; the `message.llm_model_id` FK has NO cascade, which is why `messageRepository.deleteAll()` must be first
- `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java` — `/conversation/**` → `hasRole("EMPLOYEE")` rule; the message history sub-resource is covered by this wildcard; no new `requestMatchers` are needed

---

## Completion Criteria

- [x] Parent document reviewed and Task 3 scope reflected accurately in this task
- [x] All skills reviewed and selected
- [x] `SecurityAuthorizationTest` patched: `messageRepository.deleteAll()` + `messageRepository.flush()` prepended to `@BeforeEach`
- [x] `SecurityAuthorizationTest` extended with 3 new message history security tests: `anonymousRequestToMessageHistoryEndpointReturns401`, `adminRequestToMessageHistoryEndpointReturns403`, `employeeRequestToMessageHistoryEndpointPassesSecurity`
- [x] `./mvnw test -Dtest=SecurityAuthorizationTest` passes with **15 tests**, 0 failures *(12 existing + 3 new)*
- [x] `AgentServiceCrudIntegrationTest` patched: `MessageRepository` + `ConversationRepository` injections added; `messageRepository.deleteAll()` + `conversationRepository.deleteAll()` prepended before `agentRepository.deleteAll()`
- [x] `AgentControllerTest` patched: same additions as `AgentServiceCrudIntegrationTest`
- [x] `./mvnw test -Dtest=AgentServiceCrudIntegrationTest,AgentControllerTest` passes with **0 failures** (was ~50 errors) *(49 tests, 0 failures)*
- [x] All 11 Pattern A classes patched with `MessageRepository` injection + `messageRepository.deleteAll()` + `messageRepository.flush()` as first `@BeforeEach` calls: `AppSettingsServiceIntegrationTest`, `AppSettingsControllerTest`, `ConversationControllerTest`, `ConversationServiceIntegrationTest`, `LlmModelServiceCrudIntegrationTest`, `LlmModelControllerTest`, `LlmModelServiceListQueryIntegrationTest`, `EmployeeLoginJwtTest`, `EmployeeServiceCrudIntegrationTest`, `EmployeeServiceListQueryIntegrationTest`, `EmployeeControllerListEndpointTest`
- [x] Both Pattern B classes patched with `MessageRepository` + `ConversationRepository` + `AgentRepository` injections + `messageRepository.deleteAll()` + `conversationRepository.deleteAll()` + `agentRepository.deleteAll()` before `employeeRepository.deleteAll()`: `AuthUserUtilTest`, `ClientServiceCrudIntegrationTest`
- [x] All 4 Pattern C classes patched with defensive `MessageRepository` injection + `messageRepository.deleteAll()` as first call: `AdminControllerListEndpointTest`, `AdminServiceListQueryIntegrationTest`, `ClientControllerListEndpointTest`, `ClientServiceListQueryIntegrationTest`
- [x] `./mvnw test` (full suite) passes with **923 tests, 0 failures** — all Message domain, SecurityAuthorizationTest, Agent/Conversation/LLM/Employee/AppSettings/Client/Admin tests passing; 1 pre-existing Docker error (`authServerApplicationTests.contextLoads`) is expected if Docker is not running
- [x] No production files created or modified in this task
- [x] Memory bank `context.md` and `progress.md` updated after task completion
- [x] Parent feature `Message-Entity-and-Conversation-History.md` Task 3 link updated
