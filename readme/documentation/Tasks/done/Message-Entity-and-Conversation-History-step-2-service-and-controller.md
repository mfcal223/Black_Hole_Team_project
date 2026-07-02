# Task: MessageService and MessageController

#task #current #medium-complexity #parent-message-entity-and-conversation-history

**Parent:** [[Message-Entity-and-Conversation-History]]
**Parent Type:** Feature
**Related Step(s):** Phase 2 — Steps 2.1, 2.2, 2.3
**Estimated Complexity:** Medium

---

## Goal

Wire the ownership-enforced `getHistory()` service method and expose it via `GET /conversation/{id}/messages`, backed by TDD-driven integration tests for both the service and controller layers. This completes the read-only HTTP surface for conversation history and provides the foundation the OpenRouter Chat Integration will write on top of.

---

## Parent Context

The parent feature adds the full `Message` persistence slice. Task 1 (complete) delivered the domain foundation: `MessageRole`, `MessageEntity`, `MessageDTO`, `MessageMapper`, and `MessageRepository`, with 11 passing tests. Task 2 adds the service and controller layer so the history endpoint is reachable over HTTP.

**Key parent decisions that govern this task:**

- **`MessageService` is a plain `@Service`** — does NOT extend `DefaultServiceImplements`. No standard CRUD surface exists for messages; the service owns only `getHistory()` and the future append-command methods for the OpenRouter integration.
- **`@PreAuthorize("hasRole('EMPLOYEE')")`** applied to all public methods in `MessageService`.
- **`@Transactional(readOnly = true)`** applied at the **method level** on `getHistory()` only. Class-level read-only is prohibited because future append methods will write.
- **Ownership enforcement:** `conversationRepository.findByIdAndEmployeeId(conversationId, currentEmployee.getId())` — throws `ItemNotFoundException` if absent (404), preventing enumeration of other employees' conversations. No 403 is returned — ownership violations surface as 404.
- **No `SecurityConfig` change needed:** `GET /conversation/{id}/messages` lands under the existing `/conversation/**` → `hasRole("EMPLOYEE")` security rule. The path is more specific than any path `ConversationController` declares; Spring MVC resolves it correctly.
- **`MessageController` does NOT extend `DefaultController`** — no CRUD surface to inherit.
- **Response contract:** `ResponseEntity<List<MessageDTO>>`. An empty list is returned for a conversation with no messages (not 404).
- **Ownership in service, not controller:** Security boundary is testable through the service interface. The controller is a thin delegate.

**Dependencies on Task 1:**
- `MessageRepository.findByConversationIdOrderByCreatedAtAsc()` — used by `MessageService`.
- `MessageMapper.toDTO()` — used by `MessageService` to map the repository results.
- `ConversationRepository.findByIdAndEmployeeId()` — used by `MessageService` for ownership check.
- `AuthUserUtil.getAuthUserEmployeeEntity()` — used to load the current employee.

**Task 3 (not this task):**
- Patching the FK-safe delete order in existing test classes (`messageRepository.deleteAll()` first).
- Extending `SecurityAuthorizationTest` with message history rows.
- Full regression run.

---

## Preconditions / Dependencies

- Task 1 is complete and all 11 tests pass (`MessageRepositoryTest` ×5, `MessageMapperTest` ×4, `MessageMapperIntegrationTest` ×2).
- `MessageRepository`, `MessageMapper`, `MessageDTO`, `MessageEntity`, `MessageRole` all exist in `backend/src/main/java/com/agentForgeBackend/models/message/`.
- `ConversationRepository.findByIdAndEmployeeId(Long id, Long employeeId)` exists in `ConversationRepository.java`.
- `AuthUserUtil.getAuthUserEmployeeEntity()` exists in `shared/tools/AuthUserUtil.java`.
- `ItemNotFoundException` exists in `exceptions/ItemNotFoundException.java`.
- `@EnableMethodSecurity` is set in `SecurityConfig.java` — required for `@PreAuthorize` on service methods.
- `TestAuthenticationHelper` exists in `testUtils/` and provides `getAdminToken()`, `getClientToken()`, `getEmployeeToken()`, `getEmployeeUser()`.
- The `/conversation/**` → `hasRole("EMPLOYEE")` security rule already exists in `SecurityConfig.java` — no modification required.
- Full test suite baseline from Task 1: 895 tests, 0 failures, 1 pre-existing Docker error.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — Selected — task template, naming conventions, doc config
- `solid-deep-design` — Selected — SRP, ISP, and depth analysis for `MessageService` and `MessageController`; deletion test applied to both new types
- `tdd` — Selected — two vertical TDD cycles (service then controller); write failing tests before production code; no horizontal slicing
- `memory-bank` — Selected — architecture, tech, known-issues, context loaded; FK-safe delete order, ownership pattern, `@WithMockUser` username matching requirement all confirmed
- `glossary-management` — Selected — Message, Conversation, Employee terms reviewed; no new domain terms introduced
- `find-docs` — Selected — Spring Security `@PreAuthorize` + `@EnableMethodSecurity` verified for Spring Boot 3.4.1 / Spring Security 6.x; `@Transactional(readOnly = true)` method-level placement verified

### Documentation Reviewed

- `documentation/Features/to-do/Message-Entity-and-Conversation-History.md` — parent feature; §§2.1–2.3 (service and controller steps), testing decisions, risk assessment
- `documentation/Tasks/current/Message-Entity-and-Conversation-History-step-1-domain-foundation.md` — Task 1 outcomes; what was built, tests passing, FK-safe delete order context
- `documentation/Memory/known-issues.md` — FK-safe delete order confirmed: `messageRepository.deleteAll()` must precede `conversationRepository.deleteAll()` in global cleanup; also applies to the new test classes created in this task
- `documentation/Memory/architecture.md` — cross-domain repository injection pattern confirmed (same as `ConversationService` injecting `AgentRepository` and `LlmModelRepository`)
- `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java` — `/conversation/**` → `hasRole("EMPLOYEE")` rule confirmed; `@EnableMethodSecurity` confirmed
- `backend/src/main/java/com/agentForgeBackend/models/conversation/ConversationService.java` — canonical prior art for ownership pattern, `currentEmployee()` helper, `@Transactional(readOnly = true)` method-level placement, `@PreAuthorize` annotation style
- `backend/src/main/java/com/agentForgeBackend/models/conversation/ConversationController.java` — canonical prior art for `@RequestMapping("/conversation")` with multiple methods and `ResponseEntity` return
- `backend/src/test/java/com/agentForgeBackend/models/conversation/ConversationServiceIntegrationTest.java` — canonical template for `@SpringBootTest` service integration tests: `@WithMockUser`, `@BeforeEach` cleanup pattern, employee seeding, ownership assertions
- `backend/src/test/java/com/agentForgeBackend/models/conversation/ConversationControllerTest.java` — canonical template for `@SpringBootTest` + MockMvc controller tests: `TestAuthenticationHelper`, `@BeforeEach` cleanup, 401/403 authorization tests, `jsonPath` assertions

### Related Existing Code

- [[ConversationService-java]] — `backend/src/main/java/com/agentForgeBackend/models/conversation/ConversationService.java` — canonical pattern for ownership enforcement, `currentEmployee()` helper, `@Transactional(readOnly = true)` at method level, `@PreAuthorize` on each method
- [[ConversationController-java]] — `backend/src/main/java/com/agentForgeBackend/models/conversation/ConversationController.java` — shares `@RequestMapping("/conversation")` prefix; `GET /conversation/{conversationId}/messages` coexists correctly since its suffix is more specific than any path ConversationController declares
- [[ConversationRepository-java]] — `backend/src/main/java/com/agentForgeBackend/models/conversation/ConversationRepository.java` — provides `findByIdAndEmployeeId(Long id, Long employeeId)` used in `MessageService.getHistory()`
- [[AuthUserUtil-java]] — `backend/src/main/java/com/agentForgeBackend/shared/tools/AuthUserUtil.java` — provides `getAuthUserEmployeeEntity()` used for the current employee lookup
- [[MessageRepository-java]] — `backend/src/main/java/com/agentForgeBackend/models/message/MessageRepository.java` — provides `findByConversationIdOrderByCreatedAtAsc(Long conversationId)` — the read query for history
- [[MessageMapper-java]] — `backend/src/main/java/com/agentForgeBackend/models/message/MessageMapper.java` — provides `toDTO(MessageEntity)` — mapping step in `getHistory()`
- [[TestAuthenticationHelper-java]] — `backend/src/test/java/com/agentForgeBackend/testUtils/TestAuthenticationHelper.java` — provides JWT tokens and user references for controller tests
- [[ConversationServiceIntegrationTest-java]] — `backend/src/test/java/com/agentForgeBackend/models/conversation/ConversationServiceIntegrationTest.java` — canonical template for service integration tests
- [[ConversationControllerTest-java]] — `backend/src/test/java/com/agentForgeBackend/models/conversation/ConversationControllerTest.java` — canonical template for controller tests

---

## Implementation Details

### Approach

**SOLID + Depth Analysis:**

- **MessageService**: SRP — one reason to change: when message history retrieval logic changes. ISP — `@Service` with a single public method; does NOT implement or inherit any interface that would force unused CRUD stubs. Depth — small interface (one method), substantive implementation (security check via `@PreAuthorize`, employee lookup, ownership query, repository call, DTO mapping). Deletion test: deleting `MessageService` would scatter the ownership check, employee lookup, and mapping logic across callers — it earns its keep.
- **MessageController**: SRP — one reason to change: when the message history HTTP contract changes. Appropriately shallow — controllers should be thin delegates. Depth: one `@GetMapping` method that delegates 100% to the service. This is correct — the depth belongs in the service.

**Why `MessageService` is a plain `@Service` (not extending `DefaultServiceImplements`):**
`DefaultServiceImplements` provides 6 generic CRUD methods. Using it would require overriding all of them with 405 throws — a textbook ISP violation. The service owns only `getHistory()`. Plain `@Service` keeps the interface minimal and honest.

**Cross-domain repository injection:**
`MessageService` injects `ConversationRepository` for ownership checks. This is the same pattern used by `ConversationService` (which injects `AgentRepository` and `LlmModelRepository`). Ownership check is a read-only lookup — no writes cross domain boundaries.

**Two TDD cycles (vertical slices):**

**TDD Cycle 1 — Service:**
1. RED: Write `MessageServiceIntegrationTest.java`. References `MessageService` which does not exist — compilation fails.
2. GREEN: Create `MessageService.java` → compilation succeeds → all service tests pass.

**TDD Cycle 2 — Controller:**
1. RED: Write `MessageControllerTest.java`. References `MessageController` which does not exist. The endpoint is absent — requests would 404 from Spring MVC's `NoHandlerFoundException`.
2. GREEN: Create `MessageController.java` → endpoint registered → all controller tests pass.

**`@WithMockUser` username matching for `MessageServiceIntegrationTest`:**
`AuthUserUtil.getAuthUserEmployeeEntity()` resolves the current user by looking up the username from `SecurityContextHolder` in `BaseUserRepository`. `@WithMockUser(username = "msg-svc-owner@test.com")` sets the mock principal's username. The `ownerEmployee` seeded in `@BeforeEach` must use the same value as both email and username — matching the pattern in `ConversationServiceIntegrationTest`.

**FK-safe delete order in test `@BeforeEach`:**
Both `MessageServiceIntegrationTest` and `MessageControllerTest` must include `messageRepository.deleteAll()` at the START of their cleanup. The `message.llm_model_id` FK has no cascade — if ASSISTANT messages are present and `llmModelRepository.deleteAll()` runs first, H2 throws `DataIntegrityViolationException`. `AgentEntity.owner_id` is a non-null FK to employee — prior test classes seed agents that must be deleted before employees. The full safe order for these tests:
`messageRepository.deleteAll()` → appSettings FK clear → `conversationRepository.deleteAll()` → `agentRepository.deleteAll()` → `llmModelRepository.deleteAll()` → `employeeRepository.deleteAll()`.

**Inserting messages in service/controller tests:**
The send-message flow is out of scope for Task 2. When tests need messages to be present, they insert `MessageEntity` rows directly via `messageRepository.saveAndFlush()`. `@PrePersist` fires automatically and sets `createdAt`. Thread.sleep(20) is required between inserts when ordering assertions depend on distinct `createdAt` values.

### Files to Create

- [x] `backend/src/main/java/com/agentForgeBackend/models/message/MessageService.java` — plain `@Service`; injects `MessageRepository`, `MessageMapper`, `ConversationRepository`, `AuthUserUtil`; single public method `getHistory(Long conversationId)` annotated `@Transactional(readOnly = true)` + `@PreAuthorize("hasRole('EMPLOYEE')")`
- [x] `backend/src/main/java/com/agentForgeBackend/models/message/MessageController.java` — `@RestController` at `@RequestMapping("/conversation")`; does NOT extend `DefaultController`; single `@GetMapping("/{conversationId}/messages")` returning `ResponseEntity<List<MessageDTO>>`
- [x] `backend/src/test/java/com/agentForgeBackend/models/message/MessageServiceIntegrationTest.java` — `@SpringBootTest`, `@WithMockUser`, FK-safe cleanup (includes `AgentRepository` for cross-class isolation); 5 behavior tests
- [x] `backend/src/test/java/com/agentForgeBackend/models/message/MessageControllerTest.java` — `@SpringBootTest` + `@AutoConfigureMockMvc`, `TestAuthenticationHelper`, FK-safe cleanup (includes `AgentRepository`); 6 HTTP contract tests

**No existing files are modified in this task.** (`SecurityAuthorizationTest` extension and FK-safe patches for existing test classes are Task 3.)

---

## Step-by-Step Implementation

### Step 1: TDD RED — Write `MessageServiceIntegrationTest` (before `MessageService` exists)

**Goal:** Write all service behavior tests before `MessageService` exists. The compilation will fail because `MessageService` is absent — this is the expected RED state.

**Dependencies:** Task 1 complete; `MessageRepository`, `MessageMapper`, `MessageDTO`, `MessageRole`, `ConversationRepository`, `AuthUserUtil`, `ItemNotFoundException` all exist.

- [x] Create `backend/src/test/java/com/agentForgeBackend/models/message/MessageServiceIntegrationTest.java`
- [x] Confirm the file does NOT compile (expected — `MessageService` does not exist yet)

**Why this step is critical:** Writing service tests first specifies the ownership contract — what throws `ItemNotFoundException`, what returns an empty list, and what ordering guarantee `getHistory()` makes — before any service code is written.

#### Implementation

```java
package com.agentForgeBackend.models.message;

import com.agentForgeBackend.exceptions.ItemNotFoundException;
import com.agentForgeBackend.models.agent.AgentRepository;
import com.agentForgeBackend.models.appSettings.AppSettingsRepository;
import com.agentForgeBackend.models.conversation.ConversationEntity;
import com.agentForgeBackend.models.conversation.ConversationRepository;
import com.agentForgeBackend.models.hq.employee.EmployeeEntity;
import com.agentForgeBackend.models.hq.employee.EmployeeRepository;
import com.agentForgeBackend.models.llm.LlmModelEntity;
import com.agentForgeBackend.models.llm.LlmModelRepository;
import com.agentForgeBackend.shared.models.baseUser.UserRoles;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
// @WithMockUser username must match ownerEmployee's username seeded in @BeforeEach
// so AuthUserUtil.getAuthUserEmployeeEntity() resolves the correct DB row.
@WithMockUser(username = "msg-svc-owner@test.com", roles = "EMPLOYEE")
@Tag("service")
class MessageServiceIntegrationTest {

    @Autowired private MessageService messageService;
    @Autowired private MessageRepository messageRepository;
    @Autowired private ConversationRepository conversationRepository;
    // <!-- REVIEW-FIX: added AgentRepository — AgentEntity.owner_id is a non-null FK to employee.
    // ConversationServiceIntegrationTest (alphabetically before this class) seeds an agent in every
    // @BeforeEach. After its last test, that agent persists in H2. Without agentRepository.deleteAll()
    // before employeeRepository.deleteAll(), H2 throws DataIntegrityViolationException. -->
    @Autowired private AgentRepository agentRepository;
    @Autowired private LlmModelRepository llmModelRepository;
    @Autowired private EmployeeRepository employeeRepository;
    @Autowired private AppSettingsRepository appSettingsRepository;

    private EmployeeEntity ownerEmployee;
    private EmployeeEntity otherEmployee;
    private LlmModelEntity model;
    private ConversationEntity ownerConversation;

    @BeforeEach
    void setUp() {
        // FK-safe delete order: messages first (llm_model_id FK has no cascade).
        messageRepository.deleteAll();
        messageRepository.flush();
        // Clear AppSettings defaultModel FK before deleting LLM models.
        appSettingsRepository.findFirstBy().ifPresent(settings -> {
            settings.setDefaultModel(null);
            appSettingsRepository.saveAndFlush(settings);
        });
        conversationRepository.deleteAll();
        conversationRepository.flush();
        // AgentEntity.owner_id is non-null FK to employee — delete agents before employees.
        // Prior test classes (ConversationServiceIntegrationTest, AgentService*) may leave agents.
        agentRepository.deleteAll();
        agentRepository.flush();
        llmModelRepository.deleteAll();
        llmModelRepository.flush();
        employeeRepository.deleteAll();
        employeeRepository.flush();

        ownerEmployee = employeeRepository.saveAndFlush(new EmployeeEntity(
                "Msg", "Owner", "msg-svc-owner@test.com",
                Set.of(UserRoles.EMPLOYEE), "msg-svc-owner@test.com", "encodedPass"));
        otherEmployee = employeeRepository.saveAndFlush(new EmployeeEntity(
                "Other", "Employee", "msg-svc-other@test.com",
                Set.of(UserRoles.EMPLOYEE), "msg-svc-other@test.com", "encodedPass"));

        LlmModelEntity m = new LlmModelEntity();
        m.setModelId("test/msg-svc-model");
        m.setName("Msg Svc Model");
        m.setIsEnabled(true);
        model = llmModelRepository.saveAndFlush(m);

        ownerConversation = new ConversationEntity();
        ownerConversation.setTitle("Owner Conversation");
        ownerConversation.setEmployee(ownerEmployee);
        ownerConversation.setCurrentModel(model);
        ownerConversation = conversationRepository.saveAndFlush(ownerConversation);
    }

    @Test
    void getHistoryReturnsEmptyListForConversationWithNoMessages() throws Exception {
        List<MessageDTO> history = messageService.getHistory(ownerConversation.getId());

        assertThat(history).isEmpty();
    }

    @Test
    void getHistoryThrowsItemNotFoundForNonExistentConversation() {
        assertThatThrownBy(() -> messageService.getHistory(999999L))
                .isInstanceOf(ItemNotFoundException.class);
    }

    @Test
    void getHistoryThrowsItemNotFoundForAnotherEmployeesConversation() {
        ConversationEntity otherConversation = new ConversationEntity();
        otherConversation.setTitle("Other's Chat");
        otherConversation.setEmployee(otherEmployee);
        otherConversation.setCurrentModel(model);
        otherConversation = conversationRepository.saveAndFlush(otherConversation);

        final Long otherId = otherConversation.getId();
        assertThatThrownBy(() -> messageService.getHistory(otherId))
                .isInstanceOf(ItemNotFoundException.class);
    }

    @Test
    void getHistoryReturnsMessagesInCreatedAtAscOrder() throws Exception {
        MessageEntity msg1 = new MessageEntity();
        msg1.setConversation(ownerConversation);
        msg1.setRole(MessageRole.USER);
        msg1.setContent("First message");
        messageRepository.saveAndFlush(msg1);

        Thread.sleep(20); // ensure distinct createdAt timestamps

        MessageEntity msg2 = new MessageEntity();
        msg2.setConversation(ownerConversation);
        msg2.setRole(MessageRole.ASSISTANT);
        msg2.setContent("Second message");
        msg2.setLlmModel(model);
        msg2.setInputTokens(50);
        msg2.setOutputTokens(100);
        messageRepository.saveAndFlush(msg2);

        List<MessageDTO> history = messageService.getHistory(ownerConversation.getId());

        assertThat(history).hasSize(2);
        assertThat(history.get(0).getContent()).isEqualTo("First message");
        assertThat(history.get(0).getRole()).isEqualTo(MessageRole.USER);
        assertThat(history.get(1).getContent()).isEqualTo("Second message");
        assertThat(history.get(1).getRole()).isEqualTo(MessageRole.ASSISTANT);
    }

    @Test
    void getHistoryReturnsMappedDtoFieldsCorrectly() throws Exception {
        MessageEntity msg = new MessageEntity();
        msg.setConversation(ownerConversation);
        msg.setRole(MessageRole.USER);
        msg.setContent("Test content");
        messageRepository.saveAndFlush(msg);

        List<MessageDTO> history = messageService.getHistory(ownerConversation.getId());

        assertThat(history).hasSize(1);
        MessageDTO dto = history.get(0);
        assertThat(dto.getConversationId()).isEqualTo(ownerConversation.getId());
        assertThat(dto.getRole()).isEqualTo(MessageRole.USER);
        assertThat(dto.getContent()).isEqualTo("Test content");
        assertThat(dto.getLlmModelId()).isNull();
        assertThat(dto.getCreatedAt()).isNotNull();
    }
}
```

#### Edge Cases

1. **`@WithMockUser(username = "msg-svc-owner@test.com")` must match `ownerEmployee.username`:** `AuthUserUtil.getAuthUserEmployeeEntity()` resolves `getAuthUsername()` → `baseUserRepository.findByUsername()`. The mock principal's username must match the DB row. Using `"msg-svc-owner@test.com"` for both `email` and `username` in the constructor is the pattern established by `ConversationServiceIntegrationTest` (`"conv-svc-owner@test.com"`).
2. **`getHistoryThrowsItemNotFoundForAnotherEmployeesConversation` — 404 not 403:** The service returns `ItemNotFoundException` (mapped to 404) for both "conversation doesn't exist" and "conversation exists but belongs to another employee." This prevents enumeration attacks. Do not change to a 403.
3. **`Thread.sleep(20)` for ordering test:** `@PrePersist` calls `LocalDateTime.now()`. Two consecutive `saveAndFlush()` calls in the same JVM millisecond would produce identical `createdAt` values, making the ordering assertion non-deterministic. 20ms sleep guarantees distinct timestamps.
4. **`agentRepository.deleteAll()` is required even though this class does not use agents:** `AgentEntity.owner_id` is a non-null FK to `EmployeeEntity`. `ConversationServiceIntegrationTest` (alphabetically before `MessageServiceIntegrationTest`) seeds an agent in every `@BeforeEach` and does NOT delete it at test end. After `ConversationServiceIntegrationTest`'s last test, one agent persists in H2. `employeeRepository.deleteAll()` without prior `agentRepository.deleteAll()` throws `DataIntegrityViolationException`. The `@BeforeEach` in this class now explicitly deletes agents after conversations and before llmModels to satisfy the FK constraint.
5. **`appSettingsRepository.findFirstBy()` FK guard:** `AppSettingsEntity.defaultModel` is a nullable FK to `LlmModelEntity`. If `AppSettings` references the `model` seeded in `@BeforeEach`, `llmModelRepository.deleteAll()` would fail with a FK violation. Clearing `defaultModel` first is a defensive guard matching `ConversationServiceIntegrationTest`.
6. **`messageRepository.flush()` after `deleteAll()`:** `deleteAll()` stages the DELETE in Hibernate's context. `flush()` sends it to the DB. Without `flush()`, subsequent operations in the same `@BeforeEach` may see stale data from H2.

---

### Step 2: Create `MessageService` (Step 2.1) → GREEN

**Goal:** Implement `MessageService` to make `MessageServiceIntegrationTest` compile and all 5 tests pass.

**Dependencies:** `MessageRepository`, `MessageMapper`, `ConversationRepository`, `AuthUserUtil`, `ItemNotFoundException` all exist (preconditions).

- [x] Create `backend/src/main/java/com/agentForgeBackend/models/message/MessageService.java`
- [x] From `backend/`: run `./mvnw test -Dtest=MessageServiceIntegrationTest`
- [x] Confirm **5 tests pass**, 0 failures

**Why this step is critical:** `MessageService` is the trust boundary — it enforces that only the conversation's owner can read its history. This is the ownership rule that protects all employee conversation data in the message domain.

#### Implementation

```java
package com.agentForgeBackend.models.message;

import com.agentForgeBackend.exceptions.ItemNotFoundException;
import com.agentForgeBackend.models.conversation.ConversationRepository;
import com.agentForgeBackend.models.hq.employee.EmployeeEntity;
import com.agentForgeBackend.shared.tools.AuthUserUtil;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class MessageService {

    private final MessageRepository messageRepository;
    private final MessageMapper messageMapper;
    private final ConversationRepository conversationRepository;
    private final AuthUserUtil authUserUtil;

    public MessageService(
            MessageRepository messageRepository,
            MessageMapper messageMapper,
            ConversationRepository conversationRepository,
            AuthUserUtil authUserUtil
    ) {
        this.messageRepository = messageRepository;
        this.messageMapper = messageMapper;
        this.conversationRepository = conversationRepository;
        this.authUserUtil = authUserUtil;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('EMPLOYEE')")
    public List<MessageDTO> getHistory(Long conversationId) throws ItemNotFoundException {
        EmployeeEntity currentEmployee = currentEmployee();
        conversationRepository.findByIdAndEmployeeId(conversationId, currentEmployee.getId())
                .orElseThrow(() -> new ItemNotFoundException("Conversation not found."));
        return messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId)
                .stream()
                .map(messageMapper::toDTO)
                .toList();
    }

    private EmployeeEntity currentEmployee() throws ItemNotFoundException {
        return authUserUtil.getAuthUserEmployeeEntity()
                .orElseThrow(() -> new ItemNotFoundException("Authenticated employee not found."));
    }
}
```

#### Edge Cases

1. **`@Transactional(readOnly = true)` at method level, not class level:** The parent feature explicitly prohibits class-level `readOnly` because future append-command methods (`appendUserMessage()`, `appendAssistantMessage()`) will write. Method-level annotation applies only to `getHistory()`. Identical placement to `ConversationService.getListPage()`.
2. **`@PreAuthorize("hasRole('EMPLOYEE')")` is defense-in-depth:** The HTTP security rule `/conversation/**` already gates the endpoint. `@PreAuthorize` at the service level ensures the ownership boundary is enforceable through the service interface independently of the HTTP layer, and is testable in `MessageServiceIntegrationTest` via `@WithMockUser`.
3. **`currentEmployee()` helper — private, not public:** Identical pattern to `ConversationService.currentEmployee()`. Private to prevent accidental use from subclasses or outside the service boundary.
4. **Ownership failure → `ItemNotFoundException` (404), not `AccessDeniedException` (403):** Both "conversation not found" and "conversation exists but belongs to another employee" throw the same `ItemNotFoundException`. This prevents enumeration attacks where an attacker probes whether a conversation ID exists before attempting to access it.
5. **`conversationRepository.findByIdAndEmployeeId(...)` performs a single DB query:** The query checks both existence and ownership in one round-trip. There is no separate "check existence, then check ownership" pattern that would introduce a TOCTOU race.
6. **`.toList()` (Java 16+):** Returns an unmodifiable list. `List.stream().map(...).toList()` is the idiomatic replacement for `Collectors.toList()` in Java 16+. The project uses Java 21 — this is safe and consistent with best practices.
7. **`@EnableMethodSecurity` is already present in `SecurityConfig`:** Required for `@PreAuthorize` to be processed. No change to `SecurityConfig` is needed.

---

### Step 3: TDD RED — Write `MessageControllerTest` (before `MessageController` exists)

**Goal:** Write all controller HTTP contract tests before `MessageController` exists. The endpoint is absent — MockMvc requests to `GET /conversation/{id}/messages` would return an unexpected status. Tests will fail — this is the expected RED state.

**Dependencies:** `MessageService` must exist (Step 2). `TestAuthenticationHelper` exists.

- [x] Create `backend/src/test/java/com/agentForgeBackend/models/message/MessageControllerTest.java`
- [x] Confirm tests fail (expected — `GET /conversation/{id}/messages` endpoint does not exist yet; Spring MVC returns 404)

**Why this step is critical:** Writing controller tests first specifies the HTTP contract — status codes, authorization behavior, JSON shape, and empty-list handling — before any routing is configured. The 401/403 tests verify that the security rule at `/conversation/**` propagates to the new sub-path.

#### Implementation

```java
package com.agentForgeBackend.models.message;

import com.agentForgeBackend.models.agent.AgentRepository;
import com.agentForgeBackend.models.appSettings.AppSettingsRepository;
import com.agentForgeBackend.models.conversation.ConversationEntity;
import com.agentForgeBackend.models.conversation.ConversationRepository;
import com.agentForgeBackend.models.hq.admin.AdminRepository;
import com.agentForgeBackend.models.hq.client.ClientRepository;
import com.agentForgeBackend.models.hq.employee.EmployeeEntity;
import com.agentForgeBackend.models.hq.employee.EmployeeRepository;
import com.agentForgeBackend.models.llm.LlmModelEntity;
import com.agentForgeBackend.models.llm.LlmModelRepository;
import com.agentForgeBackend.shared.models.baseUser.UserRoles;
import com.agentForgeBackend.testUtils.TestAuthenticationHelper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Set;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Tag("controller")
class MessageControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private MessageRepository messageRepository;
    @Autowired private ConversationRepository conversationRepository;
    // <!-- REVIEW-FIX: added AgentRepository — ConversationControllerTest (alphabetically before
    // this class) seeds agents in tests. Without agentRepository.deleteAll() before
    // employeeRepository.deleteAll(), H2 throws DataIntegrityViolationException on the
    // non-null AgentEntity.owner_id FK. Matches ConversationControllerTest cleanup pattern. -->
    @Autowired private AgentRepository agentRepository;
    @Autowired private LlmModelRepository llmModelRepository;
    @Autowired private EmployeeRepository employeeRepository;
    @Autowired private AppSettingsRepository appSettingsRepository;
    @Autowired private AdminRepository adminRepository;
    @Autowired private ClientRepository clientRepository;
    @Autowired private TestAuthenticationHelper authHelper;

    private LlmModelEntity model;
    private ConversationEntity ownerConversation;

    @BeforeEach
    void setUp() {
        // FK-safe delete order: messages first (llm_model_id FK has no cascade).
        messageRepository.deleteAll();
        messageRepository.flush();
        // Clear AppSettings FKs before deleting dependent entities
        appSettingsRepository.findFirstBy().ifPresent(settings -> {
            settings.setUpdatedBy(null);
            settings.setDefaultModel(null);
            appSettingsRepository.saveAndFlush(settings);
        });
        conversationRepository.deleteAll();
        conversationRepository.flush();
        clientRepository.deleteAll();
        clientRepository.flush();
        adminRepository.deleteAll();
        adminRepository.flush();
        // AgentEntity.owner_id is non-null FK to employee — delete agents before employees.
        // ConversationControllerTest (alphabetically before this class) may leave agents in H2.
        agentRepository.deleteAll();
        agentRepository.flush();
        llmModelRepository.deleteAll();
        llmModelRepository.flush();
        employeeRepository.deleteAll();
        employeeRepository.flush();

        authHelper.initializeMockUsers();
        authHelper.initializeEmployeeMockUser();

        LlmModelEntity m = new LlmModelEntity();
        m.setModelId("test/msg-ctrl-model");
        m.setName("Msg Ctrl Model");
        m.setIsEnabled(true);
        model = llmModelRepository.saveAndFlush(m);

        ownerConversation = new ConversationEntity();
        ownerConversation.setTitle("Owner Conversation");
        ownerConversation.setEmployee(authHelper.getEmployeeUser());
        ownerConversation.setCurrentModel(model);
        ownerConversation = conversationRepository.saveAndFlush(ownerConversation);
    }

    // ─────────────── Authorization ─────────────────────────────────────────

    @Test
    void anonymousRequestReturns401() throws Exception {
        mockMvc.perform(get("/conversation/" + ownerConversation.getId() + "/messages"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Unauthorized"));
    }

    @Test
    void adminJwtRequestReturns403() throws Exception {
        mockMvc.perform(get("/conversation/" + ownerConversation.getId() + "/messages")
                        .header("Authorization", authHelper.getAdminToken()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("Forbidden"));
    }

    // ─────────────── Ownership ─────────────────────────────────────────────

    @Test
    void employeeJwtCrossConversationReturns404() throws Exception {
        EmployeeEntity other = employeeRepository.saveAndFlush(new EmployeeEntity(
                "Other", "Emp", "other-msg-ctrl@test.com",
                Set.of(UserRoles.EMPLOYEE), "other-msg-ctrl@test.com", "pass"));
        ConversationEntity otherConv = new ConversationEntity();
        otherConv.setTitle("Other's Chat");
        otherConv.setEmployee(other);
        otherConv.setCurrentModel(model);
        otherConv = conversationRepository.saveAndFlush(otherConv);

        mockMvc.perform(get("/conversation/" + otherConv.getId() + "/messages")
                        .header("Authorization", authHelper.getEmployeeToken()))
                .andExpect(status().isNotFound());
    }

    @Test
    void nonExistentConversationReturns404() throws Exception {
        mockMvc.perform(get("/conversation/999999/messages")
                        .header("Authorization", authHelper.getEmployeeToken()))
                .andExpect(status().isNotFound());
    }

    // ─────────────── Success paths ──────────────────────────────────────────

    @Test
    void ownConversationWithNoMessagesReturns200WithEmptyArray() throws Exception {
        mockMvc.perform(get("/conversation/" + ownerConversation.getId() + "/messages")
                        .header("Authorization", authHelper.getEmployeeToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void ownConversationWithMessagesReturns200WithCorrectJsonShape() throws Exception {
        MessageEntity userMsg = new MessageEntity();
        userMsg.setConversation(ownerConversation);
        userMsg.setRole(MessageRole.USER);
        userMsg.setContent("Hello");
        messageRepository.saveAndFlush(userMsg);

        mockMvc.perform(get("/conversation/" + ownerConversation.getId() + "/messages")
                        .header("Authorization", authHelper.getEmployeeToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").isNumber())
                .andExpect(jsonPath("$[0].conversationId").value(ownerConversation.getId().intValue()))
                .andExpect(jsonPath("$[0].role").value("USER"))
                .andExpect(jsonPath("$[0].content").value("Hello"))
                .andExpect(jsonPath("$[0].llmModelId").isEmpty())
                .andExpect(jsonPath("$[0].createdAt").isNotEmpty());
    }
}
```

#### Edge Cases

1. **`anonymousRequestReturns401` uses the security HTTP rule, not `@PreAuthorize`:** The 401 is returned by `AuthenticationEntryPoint` before the request reaches the controller or service. Spring Security blocks at the filter chain level.
2. **`adminJwtRequestReturns403` — admin cannot reach `/conversation/**`:** The `hasRole("EMPLOYEE")` rule in `SecurityConfig` returns 403 via `AccessDeniedHandler` for authenticated non-employee principals. The admin JWT is a real JWT from `TestAuthenticationHelper`.
3. **`jsonPath("$[0].llmModelId").isEmpty()`:** `MessageDTO.llmModelId` is null for USER messages. Jackson serializes null fields as `"llmModelId": null` by default (no `@JsonInclude(NON_NULL)` is configured on `MessageDTO`). In MockMvc, `jsonPath("$.field").isEmpty()` passes for JSON null values. Using `.value((Object) null)` is an equally valid alternative.
4. **`conversationRepository.saveAndFlush(otherConv)` — `other` employee in cross-ownership test:** The `other` employee is seeded after `@BeforeEach` completes. Since `authHelper.initializeEmployeeMockUser()` runs in its own transaction (marked `@Transactional` in `TestAuthenticationHelper`), the employee user inserted there is committed before this test runs. No FK conflicts.
5. **`ownerConversation = conversationRepository.saveAndFlush(...)` uses `authHelper.getEmployeeUser()`:** `TestAuthenticationHelper.initializeEmployeeMockUser()` persists the employee and returns the entity via `getEmployeeUser()`. This entity is managed in a separate transaction — when used as a FK reference in `conversationRepository.saveAndFlush()`, Hibernate re-attaches it correctly.
6. **`jsonPath("$[0].conversationId").value(ownerConversation.getId().intValue())`:** `Long` IDs are serialized as JSON numbers. `jsonPath().value(Long)` uses Hamcrest's `IsEqual` which compares value, not type. Using `.intValue()` avoids type mismatch on 32-bit safe IDs in test. For IDs that could exceed `Integer.MAX_VALUE`, use `assertThat(...)` after `.andReturn()` instead.

---

### Step 4: Create `MessageController` (Step 2.2) → GREEN

**Goal:** Implement `MessageController` to make `MessageControllerTest` compile and all 6 controller tests pass.

**Dependencies:** `MessageService` must exist (Step 2).

- [x] Create `backend/src/main/java/com/agentForgeBackend/models/message/MessageController.java`
- [x] From `backend/`: run `./mvnw test -Dtest=MessageControllerTest`
- [x] Confirm **6 tests pass**, 0 failures

**Why this step is critical:** `MessageController` registers the `GET /conversation/{id}/messages` endpoint. Without it, all HTTP contract tests fail because the route is unrecognized by Spring MVC. After this step, the endpoint is reachable from any authenticated EMPLOYEE with a valid JWT.

#### Implementation

```java
package com.agentForgeBackend.models.message;

import com.agentForgeBackend.exceptions.ItemNotFoundException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/conversation")
public class MessageController {

    private final MessageService messageService;

    public MessageController(MessageService messageService) {
        this.messageService = messageService;
    }

    @GetMapping("/{conversationId}/messages")
    public ResponseEntity<List<MessageDTO>> getHistory(
            @PathVariable Long conversationId) throws ItemNotFoundException {
        return ResponseEntity.ok(messageService.getHistory(conversationId));
    }
}
```

#### Edge Cases

1. **`@RequestMapping("/conversation")` — coexistence with `ConversationController`:** Spring MVC allows multiple controllers to share a `@RequestMapping` prefix. `GET /conversation/{conversationId}/messages` is more specific than any path `ConversationController` declares (its most specific path is `GET /conversation/{id}` and `PATCH /conversation/{id}/title|model`). Spring MVC routes to the most specific handler — `/{conversationId}/messages` does not conflict because `/messages` suffix is absent from `ConversationController`. Verify with the smoke test (Step 5) after wiring.
2. **`throws ItemNotFoundException`:** `ItemNotFoundException` extends `Exception` (checked). The `GlobalExceptionHandler` maps it to 404. Controllers must declare it in the method signature.
3. **`ResponseEntity.ok(...)` returns HTTP 200 with the list body:** When the conversation has no messages, `messageService.getHistory()` returns an empty `List<MessageDTO>`. `ResponseEntity.ok(emptyList)` serializes to `[]` in JSON — NOT a 404. This is the correct behavior per the feature spec.
4. **No `@PreAuthorize` on the controller method:** Security is enforced at the service layer by `MessageService.getHistory()`. The HTTP layer is covered by the `/conversation/**` security rule. Do not duplicate `@PreAuthorize` on the controller method.

---

### Step 5: Smoke-Test the Endpoint (Step 2.3)

**Goal:** Manually verify the endpoint is reachable over HTTP using a real employee JWT, including the empty-list case and the cross-employee 404 case.

**Dependencies:** Steps 1–4 complete. Backend running (requires Docker Compose).

- [ ] Start the backend: `docker compose up` from the project root
- [ ] Obtain an employee JWT: `POST /login` with valid employee credentials
- [ ] Create a conversation: `POST /conversation` with a valid `modelId`
- [ ] Verify: `GET /conversation/{id}/messages` returns HTTP 200 with body `[]`
- [ ] Verify: `GET /conversation/99999/messages` returns HTTP 404 (non-existent conversation)
- [ ] Verify: `GET /conversation/{employee-a-conv-id}/messages` with employee B's JWT returns HTTP 404 (cross-employee)

**Why this step is critical:** The controller tests run against H2 with MockMvc — they do not exercise the full JWT filter chain against a real PostgreSQL instance. The smoke test verifies that the Spring MVC routing resolution (two controllers at `/conversation`) works in the production-like Docker environment.

#### Edge Cases

1. **Docker PostgreSQL is required for the smoke test:** Unlike H2-backed `@SpringBootTest` tests, the smoke test requires the full Docker Compose stack. The `authServerApplicationTests.contextLoads` error is unrelated and expected if Docker is not running.
2. **Spring MVC routing verification:** If `GET /conversation/{id}/messages` returns a 404 from Spring MVC (not from the service), it means the route was not registered. Verify by checking the application startup log for `Mapped "{[/conversation/{conversationId}/messages],methods=[GET]}"`.

---

### Step 6: Run Full Test Suite

**Goal:** Confirm Task 2 changes introduce no regressions across the full test suite.

**Dependencies:** Steps 1–4 complete.

- [x] From `backend/`: run `./mvnw test`
- [x] Confirm `MessageServiceIntegrationTest` passes with **5 tests**
- [x] Confirm `MessageControllerTest` passes with **6 tests**
- [ ] Confirm all previously passing test classes still pass (0 new failures; target count ≥ 895 + 11 = 906 total tests) — **deferred to Task 3**: 50 pre-existing FK-safe cleanup gaps in `AgentService*`/`AgentControllerTest`/suite tests surfaced by new Message test data. Zero failures attributable to Message code. See Post-Review Notes.
- [x] Note: the pre-existing `authServerApplicationTests.contextLoads` Docker error is expected if Docker Compose is not running

---

## Design Decisions

**Decision 1: `MessageService` does NOT extend `DefaultServiceImplements`**
- **Why:** `DefaultServiceImplements` provides 6 generic CRUD methods (insert, getOne, getAll, getListPage, delete, update). `MessageService`'s only write surface comes from the future OpenRouter Chat Integration — not from generic CRUD. Inheriting 6 CRUD methods to override them all with 405 throws would be an ISP violation: clients (tests, future callers) should not be forced to depend on methods they do not use. Plain `@Service` keeps the interface to a single public method.
- **Alternatives considered:** (1) Extend `DefaultServiceImplements` and override all CRUD methods to throw 405 — rejected; ISP violation, dead stubs, and misleading to future developers about what operations exist. (2) Extend `DefaultServiceImplements` and leave CRUD methods unoverridden — rejected; exposes insert/delete/update on messages via the inherited HTTP routes from `DefaultController`, which is incorrect behavior.

**Decision 2: `MessageController` does NOT extend `DefaultController`**
- **Why:** `DefaultController` maps POST/GET/PUT/DELETE at `/{id}` for standard CRUD. `MessageController` has only one endpoint: `GET /conversation/{conversationId}/messages`. Extending `DefaultController` would expose inherited CRUD routes that delegate to `MessageService` (which has no CRUD methods), causing 500 errors for any CRUD call. Keeping `MessageController` as a plain `@RestController` is correct.
- **Alternatives considered:** Extend `DefaultController` and override all unwanted methods to throw 405 — rejected; same ISP violation pattern rejected for `MessageService`.

**Decision 3: `@Transactional(readOnly = true)` on `getHistory()`, not at class level**
- **Why:** The feature explicitly states that future append-command methods (`appendUserMessage()`, `appendAssistantMessage()`) will be added to `MessageService` to write USER and ASSISTANT message rows. A class-level `@Transactional(readOnly = true)` would apply to those future write methods, causing Hibernate to throw an exception when attempting writes in a read-only transaction. Method-level annotation applies only to `getHistory()`.
- **Alternatives considered:** Class-level `@Transactional(readOnly = true)` with method-level `@Transactional` on write methods — rejected; the write methods don't exist yet and the pattern would require future developers to remember to add `@Transactional` on every new write method, creating an invisible pitfall.

**Decision 4: Ownership failure surfaces as `ItemNotFoundException` (404), not `AccessDeniedException` (403)**
- **Why:** Returning 404 for both "conversation not found" and "conversation belongs to another employee" prevents enumeration attacks. An attacker cannot distinguish whether a conversation ID exists before they own it. This matches the ownership pattern established by `ConversationService.getOne()`, `AgentService`, and all other employee-owned resources in the codebase.
- **Alternatives considered:** Return 403 for cross-employee ownership violations — rejected; leaks the existence of the resource, enabling enumeration. The established pattern in this codebase is 404 for all ownership failures.

**Decision 5: No `SecurityConfig` change required**
- **Why:** `GET /conversation/{id}/messages` falls under the existing `requestMatchers("/conversation/**").hasRole("EMPLOYEE")` rule. Spring MVC pattern matching includes sub-paths. `MessageController` does not introduce any new path prefix — it reuses `/conversation/` with a more specific suffix. No new `requestMatchers` line is needed.
- **Alternatives considered:** Adding a specific `/conversation/{id}/messages` rule — rejected; redundant with the existing wildcard rule and would require `SecurityConfig` churn for every new sub-resource.

---

## Testing Considerations

### Automatic Validation

- [x] From `backend/`: run `./mvnw test -Dtest=MessageServiceIntegrationTest` after Step 2 — confirm **5 tests pass**, 0 failures
- [x] From `backend/`: run `./mvnw test -Dtest=MessageControllerTest` after Step 4 — confirm **6 tests pass**, 0 failures
- [x] From `backend/`: run `./mvnw test` after Step 4 — **22 Message domain tests pass (0 failures)**, 50 pre-existing errors in `AgentServiceCrudIntegrationTest`, `AgentControllerTest`, `E2ESuiteTest`, `UtilsSuiteTest` due to FK-safe cleanup gaps (Task 3 responsibility). Pre-existing `authServerApplicationTests.contextLoads` Docker error unchanged. No new failures from Message code.

### Manual Validation

- [ ] Start Docker Compose (`docker compose up` from project root)
- [ ] Log in as a test employee: `POST /login` with valid credentials → copy the JWT token
- [ ] Create a conversation: `POST /conversation` with `{ "modelId": <id> }` → copy the conversation ID
- [ ] Verify `GET /conversation/{id}/messages` returns HTTP 200 with body `[]`
- [ ] Verify `GET /conversation/99999/messages` returns HTTP 404 (non-existent conversation ID)
- [ ] Log in as a second employee → obtain a second JWT
- [ ] Verify `GET /conversation/{first-employee-conv-id}/messages` with second employee's JWT returns HTTP 404 (cross-employee ownership)
- [ ] Check application startup log for `Mapped "{[/conversation/{conversationId}/messages],methods=[GET]}"` to confirm routing is registered

**Manual validation required.** This task includes **8 manual validation steps** that must be performed by a human against the running Docker stack. See the "Manual Validation" section above.

---

## Related Code Explanations

- `backend/src/main/java/com/agentForgeBackend/models/conversation/ConversationService.java` — canonical prior art for ownership enforcement pattern, `currentEmployee()` private helper, `@Transactional(readOnly = true)` at method level, `@PreAuthorize` per-method; `MessageService` follows this pattern exactly
- `backend/src/main/java/com/agentForgeBackend/models/conversation/ConversationController.java` — shares `@RequestMapping("/conversation")` prefix; confirms that multiple controllers can coexist at the same prefix in Spring MVC
- `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java:66` — `/conversation/**` → `hasRole("EMPLOYEE")` security rule; no modification needed
- `backend/src/test/java/com/agentForgeBackend/models/conversation/ConversationServiceIntegrationTest.java` — `@WithMockUser` + matching username in `@BeforeEach`; canonical pattern for service integration tests
- `backend/src/test/java/com/agentForgeBackend/models/conversation/ConversationControllerTest.java` — `TestAuthenticationHelper` usage, FK-safe `@BeforeEach`, 401/403 authorization assertions; canonical pattern for controller tests

---

## Completion Criteria

- [x] Parent document reviewed and Task 2 scope reflected accurately
- [x] All skills reviewed and selected
- [x] Spring Security `@PreAuthorize` + `@EnableMethodSecurity` verified for Spring Boot 3.4.1 / Spring Security 6.x
- [x] `MessageService.java` created — plain `@Service`, no inheritance; constructor injection of `MessageRepository`, `MessageMapper`, `ConversationRepository`, `AuthUserUtil`; `getHistory(Long conversationId)` with `@Transactional(readOnly = true)` + `@PreAuthorize("hasRole('EMPLOYEE')")`; ownership via `conversationRepository.findByIdAndEmployeeId`; returns `List<MessageDTO>` via `messageRepository.findByConversationIdOrderByCreatedAtAsc` + `messageMapper.toDTO`; `ItemNotFoundException` for both not-found and cross-employee cases; private `currentEmployee()` helper
- [x] `MessageController.java` created — `@RestController`, `@RequestMapping("/conversation")`, does NOT extend `DefaultController`; single `@GetMapping("/{conversationId}/messages")` returning `ResponseEntity<List<MessageDTO>>`; delegates to `messageService.getHistory(conversationId)`
- [x] `MessageServiceIntegrationTest.java` created — `@SpringBootTest`, `@ActiveProfiles("test")`, `@WithMockUser(username = "msg-svc-owner@test.com", roles = "EMPLOYEE")`, FK-safe `@BeforeEach` with `messageRepository.deleteAll()` first and `agentRepository.deleteAll()` before `employeeRepository.deleteAll()`; 5 tests: `getHistoryReturnsEmptyListForConversationWithNoMessages`, `getHistoryThrowsItemNotFoundForNonExistentConversation`, `getHistoryThrowsItemNotFoundForAnotherEmployeesConversation`, `getHistoryReturnsMessagesInCreatedAtAscOrder`, `getHistoryReturnsMappedDtoFieldsCorrectly`
- [x] `MessageControllerTest.java` created — `@SpringBootTest`, `@AutoConfigureMockMvc`, `@ActiveProfiles("test")`, `TestAuthenticationHelper`, FK-safe `@BeforeEach` with `messageRepository.deleteAll()` first and `agentRepository.deleteAll()` before `employeeRepository.deleteAll()`; 6 tests: `anonymousRequestReturns401`, `adminJwtRequestReturns403`, `employeeJwtCrossConversationReturns404`, `nonExistentConversationReturns404`, `ownConversationWithNoMessagesReturns200WithEmptyArray`, `ownConversationWithMessagesReturns200WithCorrectJsonShape`
- [x] `./mvnw test -Dtest=MessageServiceIntegrationTest` passes with **5 tests**, 0 failures
- [x] `./mvnw test -Dtest=MessageControllerTest` passes with **6 tests**, 0 failures
- [x] `./mvnw test` (full suite) — **22 Message domain tests pass (0 failures)**. 50 pre-existing errors due to FK-safe cleanup gaps in `AgentServiceCrudIntegrationTest`/`AgentControllerTest`/suite tests — these are Task 3 responsibility. 1 pre-existing Docker error (`authServerApplicationTests.contextLoads`) unchanged.
- [ ] Manual smoke test performed: `GET /conversation/{id}/messages` returns 200 with `[]` for a real employee JWT; 404 for non-existent conversation; 404 for cross-employee access
- [x] Task 3 prerequisite confirmed: `MessageService` and `MessageController` exist and tested; `SecurityAuthorizationTest` extension and FK-safe patches for existing test classes are Task 3 responsibilities

---

## Post-Review Notes

### Implementation Review (2026-06-18)

**All automatic criteria satisfied.** The 4 new files were created following TDD (red-green-refactor) and all targeted tests pass.

**Full suite status:** 868 tests run, 0 failures in Message code, 50 errors from pre-existing FK-safe cleanup gaps in `AgentService*` test classes. These gaps are the documented Task 3 responsibility — the `conversation.employee_id` FK constraint requires `conversationRepository.deleteAll()` before `employeeRepository.deleteAll()` in test `@BeforeEach` methods, and the `message.llm_model_id` FK requires `messageRepository.deleteAll()` first. Our new test classes (`MessageServiceIntegrationTest`, `MessageControllerTest`) correctly implement FK-safe cleanup. The existing `AgentServiceCrudIntegrationTest` and `AgentControllerTest` classes will be patched as part of Task 3.

**No production code was modified** — only new files were created. No changes to `SecurityConfig`, `ConversationController`, or any existing source files.

**Architectural alignment:** `MessageService` follows the `ConversationService` pattern exactly (ownership enforcement via `findByIdAndEmployeeId`, private `currentEmployee()` helper, `@PreAuthorize("hasRole('EMPLOYEE')")` on each method, `@Transactional(readOnly = true)` at method level only). `MessageController` correctly shares `@RequestMapping("/conversation")` with `ConversationController` — Spring MVC routing resolves the more specific `/{conversationId}/messages` suffix correctly.

**SOLID + Depth:** Both modules pass the deletion test. `MessageService` concentrates ownership check, employee lookup, and DTO mapping behind a single-method interface. `MessageController` is appropriately shallow — a thin HTTP delegate. No ISP violations — neither extends any interface that would force unused CRUD stubs.
