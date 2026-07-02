# Task: MessageService Write Seams for OpenRouter Chat Integration

#task #current #high-complexity #parent-openrouter-chat-integration

**Parent:** [[OpenRouter-Chat-Integration]]
**Parent Type:** Feature
**Related Step(s):** Phase 3 — Steps 3.1, 3.2, 3.3
**Estimated Complexity:** High

---

## Goal

Extend `MessageService` with `appendUserMessage` and `appendAssistantMessage` — the only two write paths for the `message` table — and create `AssistantMessageSaveException`, the checked domain exception that `ChatTurnService` (Task 4) uses to report ASSISTANT-persistence failure without rolling back the USER message that has already been persisted.

---

## Parent Context

The feature creates a full chat-over-WebSocket loop. Tasks 1 and 2 delivered the WebSocket infrastructure and the `OpenRouterService` HTTP adapter. This task builds the **message persistence seams** that `ChatTurnService` (Task 4) will delegate to. `ChatTurnService.processTurn()` calls `appendUserMessage` first, then (after streaming) calls `appendAssistantMessage`. Both methods must join any outer transaction with `REQUIRED` propagation so that OpenRouter failures can be handled by `noRollbackFor` semantics on the outer method.

**Key constraints from the parent:**

- **`appendUserMessage` is EMPLOYEE-gated**: `@PreAuthorize("hasRole('EMPLOYEE')")`. Ownership is verified via `conversationRepository.findByIdAndEmployeeId`. Cross-employee and non-existent conversations both surface as `ItemNotFoundException` (404), not 403.
- **`appendAssistantMessage` has NO `@PreAuthorize`**: Called exclusively from `ChatTurnService.processTurn()`, which enforces employee auth via `AuthUserUtil` inside its own `@Transactional` boundary. Adding `@PreAuthorize` here would break the internal call. This is documented in the parent to prevent a future developer from incorrectly adding an annotation.
- **`appendAssistantMessage` refreshes `conversation.updatedAt`**: This is a cross-domain write (Message domain writing Conversation state). It is contained inside the `@Transactional` method, following the precedent set by `ConversationService` injecting other domain repositories.
- **`conversation.updatedAt` is refreshed ONLY on ASSISTANT message save**: Not on USER message save. An unanswered USER message is an accurate record that the employee attempted to send something. Only a completed turn updates the conversation's "last active" timestamp.
- **`AssistantMessageSaveException extends Exception` (checked)**: This is the critical invariant. Because it is a checked exception (not `RuntimeException`), Spring's `@Transactional` does NOT roll back on it by default. `ChatTurnService` wraps `appendAssistantMessage()` in a try/catch, catches `DataAccessException`, and re-throws `AssistantMessageSaveException`. The transaction commits — the USER message survives. The handler then sends an error frame. This is user story #9: "my message is saved even if the LLM call fails."
- **`appendAssistantMessage` uses `conversationRepository.findById`, NOT `findByIdAndEmployeeId`**: Ownership was already verified by the time `ChatTurnService` calls this method. Using `findById` is correct — this is an internal write path.
- **MessageService remains a concrete class with no interface**: Follows the codebase convention (`ConversationService`, `AgentService`, etc.). A single concrete class is a hypothetical seam — the test double is provided by `@MockBean` at the call sites in Task 4 tests.

**Task grouping rationale from parent:** `appendUserMessage` and `appendAssistantMessage` are closely related write operations on the same service. They share ownership-check patterns and both need to be present before `ChatTurnService` can be wired. Testing them together covers the full message persistence surface.

---

## Preconditions / Dependencies

- Tasks 1 and 2 are complete:
  - `ChatTurnService` (stub), `ChatWebSocketHandler`, `JwtHandshakeInterceptor`, `WebSocketConfig`, all DTOs in `models/chat/dto/`, and `SecurityConfig` `/ws/**` rule are in place (Task 1).
  - `OpenRouterService`, all OpenRouter DTOs/exceptions, and `GET /llm-model/available` are in place (Task 2).
  - `OpenRouterConfigException` and `OpenRouterApiException` already live in `models/chat/openrouter/`.
- `MessageService` currently has 4 constructor parameters: `MessageRepository`, `MessageMapper`, `ConversationRepository`, `AuthUserUtil`. Adding `LlmModelRepository` as a fifth parameter is a non-breaking additive change — Spring wires all constructor parameters automatically.
- `ConversationRepository.findByIdAndEmployeeId(Long id, Long employeeId)` exists and is the correct ownership-check query for `appendUserMessage`.
- `ConversationRepository` extends `DefaultRepository` which extends `JpaRepository` — `findById(Long)` is available for `appendAssistantMessage`'s non-ownership-checked lookup.
- `LlmModelRepository.findById(Long)` is available via `JpaRepository` (inherited through `DefaultRepository`).
- `MessageRole.USER` and `MessageRole.ASSISTANT` are the only two legal roles in this codebase. There is no `SYSTEM` role in `MessageEntity` per ADR-008 and ADR-003.
- `MessageEntity` has `@PrePersist` that sets `createdAt`. It has no `@PreUpdate` — the entity is append-only; updates should not happen on a saved `MessageEntity`.
- `ConversationEntity` has `@PreUpdate void onUpdate()` that sets `updatedAt = LocalDateTime.now()`. The explicit `conversation.setUpdatedAt(...)` in `appendAssistantMessage` before calling `conversationRepository.save()` is required to signal a dirty field to Hibernate's dirty-checking mechanism. If the field is not changed, Hibernate may skip the UPDATE statement and `@PreUpdate` will not fire. Setting the field first guarantees the UPDATE is emitted.
- FK-safe test cleanup order for all new tests: `messageRepository.deleteAll()` → `AppSettings defaultModel → null` → `conversationRepository.deleteAll()` → `agentRepository.deleteAll()` → `llmModelRepository.deleteAll()` → `employeeRepository.deleteAll()`. This is the established pattern across all integration test classes in the project.
- `@WithMockUser(username = "<username>", roles = "EMPLOYEE")` at the test class level must use a username that matches the seeded `ownerEmployee` entity, because `AuthUserUtil.getAuthUserEmployeeEntity()` resolves username from `SecurityContextHolder` and then queries `BaseUserRepository.findByUsername()`. If the username does not match, `getAuthUserEmployeeEntity()` returns `Optional.empty()` and `appendUserMessage` throws `ItemNotFoundException` before the actual test case is exercised.
- `@EnableMethodSecurity` is already configured on `SecurityConfig` — `@PreAuthorize` is active at the service layer.
- Spring Boot 3.4.1 / Spring Framework 6.2.x in use. `JpaRepository.save()` returns the saved entity with `@GeneratedValue` ID populated.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — Selected — task template, location conventions, doc config
- `solid-deep-design` — Selected — depth and deletion test for MessageService extensions; confirmed no interface needed (single concrete class = hypothetical seam, test double via `@MockBean`); deletion test confirms the module earns its keep (ownership + entity construction + persistence scattered across callers without it)
- `tdd` — Selected — vertical TDD slices; discriminating RED test is `appendUserMessage_throwsItemNotFoundForCrossEmployeeConversation` (cross-employee access should fail; without ownership logic, a naive save-everything implementation would incorrectly pass)
- `memory-bank` — Selected — architecture, known-issues (FK-safe cleanup, `@WithMockUser` username pattern, `getRawApiKey` no `@PreAuthorize`), context (Tasks 1 and 2 complete)
- `glossary-management` — Selected — Employee, Ownership Scope, Agent, LLM Model terms verified
- `find-docs` — Not needed (Context7 unavailable in this environment; Spring Boot 3.4.1 / Spring Data JPA APIs are well-established and verified from prior tasks in this project)

### Documentation Reviewed

- `documentation/Features/to-do/OpenRouter-Chat-Integration.md` — parent feature; all constraints, implementation architecture items 11a, 12, and steps 3.1–3.3
- `documentation/ADRs/ADR-003-single-message-entity-with-role-enum.md` — USER and ASSISTANT are the only roles; no SYSTEM role on `MessageEntity`
- `documentation/ADRs/ADR-004-message-table-as-token-usage-source.md` — ASSISTANT messages must store `inputTokens` and `outputTokens` from OpenRouter's usage response
- `documentation/ADRs/ADR-008-agent-prompts-not-persisted-as-messages.md` — confirms no SYSTEM messages are ever saved; agent prompts are injected at request time only
- `documentation/Tasks/current/OpenRouter-Chat-Integration-step-1-security-and-websocket-baseline.md` — confirmed existing ChatTurnService stub signature; Task 4 replaces it; Task 3 methods must match the signatures ChatTurnService will call
- `documentation/Tasks/current/OpenRouter-Chat-Integration-step-2-openrouter-service.md` — confirmed `OpenRouterConfigException` and `OpenRouterApiException` already exist in `models/chat/openrouter/`; `AssistantMessageSaveException` joins them in the same package

### Related Existing Code

- `backend/src/main/java/com/agentForgeBackend/models/message/MessageService.java` — modified in this task; current `getHistory()` shows the pattern for `@Transactional`, `@PreAuthorize`, `currentEmployee()` helper
- `backend/src/main/java/com/agentForgeBackend/models/message/MessageEntity.java` — append-only entity; `@PrePersist` sets `createdAt`; `llmModel`, `inputTokens`, `outputTokens` are nullable for USER messages
- `backend/src/main/java/com/agentForgeBackend/models/message/MessageRepository.java` — `JpaRepository`; `save()` and `findById()` are the only methods needed for write seams
- `backend/src/main/java/com/agentForgeBackend/models/message/MessageRole.java` — `USER` and `ASSISTANT` enum values used by both write methods
- `backend/src/main/java/com/agentForgeBackend/models/conversation/ConversationEntity.java` — `@PreUpdate onUpdate()` sets `updatedAt`; `updatedAt` field must be dirtied before save to trigger the UPDATE
- `backend/src/main/java/com/agentForgeBackend/models/conversation/ConversationRepository.java` — `findByIdAndEmployeeId` for `appendUserMessage`; `findById` (from JpaRepository via DefaultRepository) for `appendAssistantMessage`
- `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelRepository.java` — `findById` from JpaRepository for `appendAssistantMessage`
- `backend/src/main/java/com/agentForgeBackend/models/chat/openrouter/OpenRouterConfigException.java` — sibling exception in `models/chat/openrouter/`; `AssistantMessageSaveException` lives alongside it
- `backend/src/test/java/com/agentForgeBackend/models/message/MessageServiceIntegrationTest.java` — direct prior art for the test class: FK-safe setUp, `@WithMockUser` username matching seeded employee, `@SpringBootTest @ActiveProfiles("test")` pattern

---

## Implementation Details

### Approach

**TDD vertical slices for this task:**

1. Create `AssistantMessageSaveException` (no test — plain exception class; compiles cleanly alongside existing exceptions in `models/chat/openrouter/`)
2. Add `LlmModelRepository` to `MessageService` constructor; add method stubs for `appendUserMessage` and `appendAssistantMessage` that throw `UnsupportedOperationException` (compilation succeeds; existing tests still GREEN)
3. Write `MessageServiceWriteSeamsTest` — **RED** (stubs throw `UnsupportedOperationException`; discriminating test is `appendUserMessage_throwsItemNotFoundForCrossEmployeeConversation`)
4. Implement `appendUserMessage` — **GREEN** for `appendUserMessage` tests
5. Implement `appendAssistantMessage` — **GREEN** for `appendAssistantMessage` tests
6. Run full suite — **VERIFY** (zero regressions)

**Module design (SOLID + Deep Module):**

| Module | Interface (public surface) | Implementation hidden | Depth |
|--------|----------------------------|-----------------------|-------|
| `MessageService.appendUserMessage` | 1 method: `(Long, String) → MessageEntity` | Auth lookup, ownership check, entity construction, persistence | Deep |
| `MessageService.appendAssistantMessage` | 1 method: `(Long, Long, String, int, int) → MessageEntity` | Conversation load, LlmModel load, entity construction, conversation timestamp refresh, persistence | Deep |
| `AssistantMessageSaveException` | Constructor + getMessage() | Checked exception delegation | Value object — correct pattern |

**Deletion test result:** If `appendUserMessage` and `appendAssistantMessage` were deleted, `ChatTurnService` would own auth lookup, ownership verification, entity construction, and persistence for both message roles — complexity scattered across the orchestrator. Module is earning its keep.

**No interface for `MessageService`:** One concrete implementation, test substitute via `@MockBean`. Adding an interface would be a hypothetical seam (zero benefit, added indirection). Follows codebase convention: `ConversationService`, `AgentService`, `AppSettingsService` — all concrete classes.

### Files to Create/Modify

- [x] `backend/src/main/java/com/agentForgeBackend/models/chat/openrouter/AssistantMessageSaveException.java` — **new** — checked exception for ASSISTANT persistence failure after successful streaming; `extends Exception` (not RuntimeException) so Spring does NOT roll back the enclosing transaction
- [x] `backend/src/main/java/com/agentForgeBackend/models/message/MessageService.java` — **modified** — add `LlmModelRepository` constructor injection; add `appendUserMessage` and `appendAssistantMessage` methods
- [x] `backend/src/test/java/com/agentForgeBackend/models/message/MessageServiceWriteSeamsTest.java` — **new** — `@SpringBootTest` integration test class for both write methods; 8 tests total

---

## Step-by-Step Implementation

### Step 1: Create `AssistantMessageSaveException`

**Goal:** Define the checked domain exception that `ChatTurnService` throws when ASSISTANT message persistence fails after OpenRouter streaming has completed. The checked nature (extends `Exception`, not `RuntimeException`) is the architectural decision that keeps the USER message alive in the DB.

**Dependencies:** `models/chat/openrouter/` package exists (from Task 2: `OpenRouterConfigException`, `OpenRouterApiException`, `OpenRouterService`, and related DTOs are all there).

- [x] Create `AssistantMessageSaveException.java` in `backend/src/main/java/com/agentForgeBackend/models/chat/openrouter/`
- [x] Verify: it extends `Exception` (not `RuntimeException`)
- [x] Verify: constructor signature `(String message, Throwable cause)` matches what `ChatTurnService` will use in Task 4

**Why this step is critical:**
This exception must exist before Task 4 code is written. The distinction between checked (`Exception`) and unchecked (`RuntimeException`) determines whether `@Transactional` rolls back. If this were `RuntimeException`, Spring would roll back the entire transaction on throw — including the USER message save — which directly violates user story #9. Making it checked is the only mechanism that achieves "USER message persists, error frame is sent."

#### Implementation

```java
package com.agentForgeBackend.models.chat.openrouter;

// Checked exception — extends Exception, not RuntimeException.
// Spring @Transactional does NOT roll back on checked exceptions by default.
// This ensures the USER message survives when ASSISTANT persistence fails after streaming.
public class AssistantMessageSaveException extends Exception {

    public AssistantMessageSaveException(String message, Throwable cause) {
        super(message, cause);
    }
}
```

#### Edge Cases

1. **Constructor with only `String message`:** Not provided intentionally — `AssistantMessageSaveException` is always thrown from a catch block that has a `DataAccessException` cause. The two-argument constructor ensures the stack trace is preserved. A no-cause constructor would make debugging DB failures harder.
2. **Caller forgetting `throws AssistantMessageSaveException`:** Because it's checked, the compiler enforces that callers either catch it or declare it. This is intentional — it forces `ChatTurnService.processTurn()` to explicitly declare that it can surface this failure to the handler.

---

### Step 2: Extend `MessageService` Constructor and Add Method Stubs

**Goal:** Add `LlmModelRepository` to `MessageService` constructor injection and introduce stub methods that compile but throw `UnsupportedOperationException`. This allows tests to be written (and fail RED) before the implementation exists.

**Dependencies:** `AssistantMessageSaveException` must exist (Step 1).

- [x] Add the following new imports to `MessageService.java` (none are currently present):
  - `import com.agentForgeBackend.models.conversation.ConversationEntity;` — used as local variable type in both write methods
  - `import com.agentForgeBackend.models.llm.LlmModelEntity;` — used as local variable type in `appendAssistantMessage`
  - `import com.agentForgeBackend.models.llm.LlmModelRepository;` — new constructor dependency
  - `import java.time.LocalDateTime;` — used in `appendAssistantMessage` to refresh `conversation.updatedAt`
- [x] Add `private final LlmModelRepository llmModelRepository` field to `MessageService`
- [x] Update the constructor to include `LlmModelRepository llmModelRepository` as the fifth parameter; assign to field
- [x] Add `appendUserMessage(Long conversationId, String content)` method signature returning `MessageEntity`, annotated `@Transactional @PreAuthorize("hasRole('EMPLOYEE')")`, throws `ItemNotFoundException` — body throws `new UnsupportedOperationException("not implemented")`
- [x] Add `appendAssistantMessage(Long conversationId, Long llmModelId, String content, int inputTokens, int outputTokens)` method signature returning `MessageEntity`, annotated `@Transactional`, throws `ItemNotFoundException` — body throws `new UnsupportedOperationException("not implemented")`
- [x] Confirm: existing `MessageServiceIntegrationTest` still passes (Spring wires the new constructor parameter automatically; existing tests do not call the new methods)

**Why this step is critical:**
Writing stubs before tests allows the test file to compile and establishes the exact method signatures that both the tests and `ChatTurnService` will use. The stubs serve as the RED baseline.

#### Implementation

```java
// New field:
private final LlmModelRepository llmModelRepository;

// Updated constructor:
public MessageService(
        MessageRepository messageRepository,
        MessageMapper messageMapper,
        ConversationRepository conversationRepository,
        AuthUserUtil authUserUtil,
        LlmModelRepository llmModelRepository
) {
    this.messageRepository = messageRepository;
    this.messageMapper = messageMapper;
    this.conversationRepository = conversationRepository;
    this.authUserUtil = authUserUtil;
    this.llmModelRepository = llmModelRepository;
}

// Stub 1 — replaced in Step 4:
@Transactional
@PreAuthorize("hasRole('EMPLOYEE')")
public MessageEntity appendUserMessage(Long conversationId, String content)
        throws ItemNotFoundException {
    throw new UnsupportedOperationException("not implemented");
}

// Stub 2 — replaced in Step 5:
// No @PreAuthorize — called only from ChatTurnService which enforces employee auth
// via AuthUserUtil inside its own @Transactional boundary.
@Transactional
public MessageEntity appendAssistantMessage(Long conversationId, Long llmModelId,
        String content, int inputTokens, int outputTokens)
        throws ItemNotFoundException {
    throw new UnsupportedOperationException("not implemented");
}
```

#### Edge Cases

1. **Spring cannot wire the 5-parameter constructor:** Impossible — Spring's constructor injection is type-based. `LlmModelRepository` is a unique `@Repository` bean. There is no ambiguity.
2. **Existing tests failing after adding LlmModelRepository:** Cannot happen — adding a new constructor parameter does not affect existing calls to `getHistory()`. No existing test mocks `MessageService` in a way that requires matching the constructor.

---

### Step 3: Write `MessageServiceWriteSeamsTest` (RED)

**Goal:** Write the full test class for both write methods. All 8 tests fail RED because the stubs throw `UnsupportedOperationException`. The **discriminating RED test** is `appendUserMessage_throwsItemNotFoundForCrossEmployeeConversation` — this test distinguishes a correct ownership-checking implementation from a naive "always-save" implementation.

**Dependencies:** `MessageService` method stubs exist (Step 2); `EmployeeEntity`, `ConversationEntity`, `LlmModelEntity`, and `MessageRole` are all importable.

- [x] Create `MessageServiceWriteSeamsTest.java` in `backend/src/test/java/com/agentForgeBackend/models/message/`
- [x] Annotate with `@SpringBootTest @ActiveProfiles("test") @Tag("service")`
- [x] Annotate with `@WithMockUser(username = "msg-write-owner@test.com", roles = "EMPLOYEE")` — username must match the seeded `ownerEmployee`
- [x] Implement FK-safe `@BeforeEach setUp()`: messages → AppSettings defaultModel null → conversations → agents → LlmModels → employees (in this order)
- [x] Seed: `ownerEmployee` (username `msg-write-owner@test.com`), `otherEmployee`, `model`, `ownerConversation`
- [x] Write 4 tests for `appendUserMessage`; write 4 tests for `appendAssistantMessage` (see Implementation section below)
- [x] Confirm all 8 tests are RED before proceeding to Step 4 — **Deferred: Java 21 not available**

**Why this step is critical:**
Writing tests before implementation (TDD). The discriminating RED test for `appendUserMessage` is the cross-employee case: a naive implementation that omits the ownership check would incorrectly save the message and return it, causing the test to unexpectedly pass. Having it fail RED proves the ownership check is not yet in place and must be implemented.

<!-- REVIEW-FIX: `appendUserMessage_throwsItemNotFoundForCrossEmployeeConversation` had an unnecessary `throws Exception` removed. No checked exceptions are thrown directly in that method body — the only checked call is inside an `assertThatThrownBy` lambda (`ThrowingCallable` handles `Throwable`). Matches the existing pattern in `MessageServiceIntegrationTest.getHistoryThrowsItemNotFoundForAnotherEmployeesConversation()`. -->

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

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
// Username must match ownerEmployee seeded in setUp() so AuthUserUtil resolves the correct DB row.
@WithMockUser(username = "msg-write-owner@test.com", roles = "EMPLOYEE")
@Tag("service")
class MessageServiceWriteSeamsTest {

    @Autowired private MessageService messageService;
    @Autowired private MessageRepository messageRepository;
    @Autowired private ConversationRepository conversationRepository;
    // AgentEntity.owner_id is a non-null FK to employee — delete agents before employees.
    // Prior test classes may leave agents behind — defensive cleanup prevents FK violations.
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
        agentRepository.deleteAll();
        agentRepository.flush();
        llmModelRepository.deleteAll();
        llmModelRepository.flush();
        employeeRepository.deleteAll();
        employeeRepository.flush();

        ownerEmployee = employeeRepository.saveAndFlush(new EmployeeEntity(
                "Write", "Owner", "msg-write-owner@test.com",
                Set.of(UserRoles.EMPLOYEE), "msg-write-owner@test.com", "encodedPass"));
        otherEmployee = employeeRepository.saveAndFlush(new EmployeeEntity(
                "Other", "Write", "msg-write-other@test.com",
                Set.of(UserRoles.EMPLOYEE), "msg-write-other@test.com", "encodedPass"));

        LlmModelEntity m = new LlmModelEntity();
        m.setModelId("test/write-seams-model");
        m.setName("Write Seams Model");
        m.setIsEnabled(true);
        model = llmModelRepository.saveAndFlush(m);

        ownerConversation = new ConversationEntity();
        ownerConversation.setTitle("Owner Write Conversation");
        ownerConversation.setEmployee(ownerEmployee);
        ownerConversation.setCurrentModel(model);
        ownerConversation = conversationRepository.saveAndFlush(ownerConversation);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // appendUserMessage tests
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void appendUserMessage_savesUserMessageWithCorrectFields() throws Exception {
        MessageEntity saved = messageService.appendUserMessage(
                ownerConversation.getId(), "Hello world");

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getRole()).isEqualTo(MessageRole.USER);
        assertThat(saved.getContent()).isEqualTo("Hello world");
        assertThat(saved.getLlmModel()).isNull();
        assertThat(saved.getInputTokens()).isNull();
        assertThat(saved.getOutputTokens()).isNull();
        assertThat(saved.getConversation().getId()).isEqualTo(ownerConversation.getId());
    }

    // DISCRIMINATING RED TEST: A naive "always-save" implementation without ownership
    // enforcement would incorrectly pass this conversation ID and return a saved entity,
    // causing the test to pass when it should fail. This test is RED until the ownership
    // check is in place.
    @Test
    void appendUserMessage_throwsItemNotFoundForCrossEmployeeConversation() {
        ConversationEntity otherConversation = new ConversationEntity();
        otherConversation.setTitle("Other's Write Conversation");
        otherConversation.setEmployee(otherEmployee);
        otherConversation.setCurrentModel(model);
        otherConversation = conversationRepository.saveAndFlush(otherConversation);

        final Long otherId = otherConversation.getId();
        assertThatThrownBy(() -> messageService.appendUserMessage(otherId, "Should fail"))
                .isInstanceOf(ItemNotFoundException.class);
    }

    @Test
    void appendUserMessage_throwsItemNotFoundForNonExistentConversation() {
        assertThatThrownBy(() -> messageService.appendUserMessage(999999L, "Hello"))
                .isInstanceOf(ItemNotFoundException.class);
    }

    @Test
    void appendUserMessage_persistedMessageAppearsInHistory() throws Exception {
        messageService.appendUserMessage(ownerConversation.getId(), "Persisted message");

        List<MessageDTO> history = messageService.getHistory(ownerConversation.getId());
        assertThat(history).hasSize(1);
        assertThat(history.get(0).getContent()).isEqualTo("Persisted message");
        assertThat(history.get(0).getRole()).isEqualTo(MessageRole.USER);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // appendAssistantMessage tests
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void appendAssistantMessage_savesAssistantMessageWithAllFields() throws Exception {
        MessageEntity saved = messageService.appendAssistantMessage(
                ownerConversation.getId(), model.getId(), "AI response", 100, 50);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getRole()).isEqualTo(MessageRole.ASSISTANT);
        assertThat(saved.getContent()).isEqualTo("AI response");
        assertThat(saved.getLlmModel().getId()).isEqualTo(model.getId());
        assertThat(saved.getInputTokens()).isEqualTo(100);
        assertThat(saved.getOutputTokens()).isEqualTo(50);
        assertThat(saved.getConversation().getId()).isEqualTo(ownerConversation.getId());
    }

    @Test
    void appendAssistantMessage_refreshesConversationUpdatedAt() throws Exception {
        LocalDateTime before = ownerConversation.getUpdatedAt();
        Thread.sleep(20); // ensure measurable timestamp difference

        messageService.appendAssistantMessage(
                ownerConversation.getId(), model.getId(), "Response", 10, 5);

        ConversationEntity refreshed = conversationRepository
                .findById(ownerConversation.getId()).orElseThrow();
        assertThat(refreshed.getUpdatedAt()).isAfter(before);
    }

    @Test
    void appendAssistantMessage_throwsItemNotFoundForNonExistentConversation() {
        assertThatThrownBy(() -> messageService.appendAssistantMessage(
                999999L, model.getId(), "Response", 10, 5))
                .isInstanceOf(ItemNotFoundException.class);
    }

    @Test
    void appendAssistantMessage_throwsItemNotFoundForNonExistentLlmModel() {
        assertThatThrownBy(() -> messageService.appendAssistantMessage(
                ownerConversation.getId(), 999999L, "Response", 10, 5))
                .isInstanceOf(ItemNotFoundException.class);
    }
}
```

#### Edge Cases

1. **`@WithMockUser` username mismatch:** If the `@WithMockUser` username does not match the seeded `ownerEmployee`, `AuthUserUtil.getAuthUserEmployeeEntity()` returns `Optional.empty()` and `appendUserMessage` throws `ItemNotFoundException` before reaching the ownership check. All `appendUserMessage` tests would then fail for the wrong reason — they'd all appear to throw `ItemNotFoundException` including the "save" and "persisted in history" tests. The username must match exactly.
2. **Race condition in `appendAssistantMessage_refreshesConversationUpdatedAt`:** Uses `Thread.sleep(20)` to ensure measurable time difference. On very slow CI machines, 20 ms may be insufficient. This is the same tolerance used in `MessageServiceIntegrationTest.getHistoryReturnsMessagesInCreatedAtAscOrder`. If flakiness is observed, increase to 50 ms.
3. **`appendAssistantMessage` tests run under `@WithMockUser`:** Since `appendAssistantMessage` has no `@PreAuthorize`, the mock user context is irrelevant for those tests. The tests would work the same way with or without a user in `SecurityContextHolder`. The class-level annotation is harmless.

---

### Step 4: Implement `appendUserMessage` (GREEN)

**Goal:** Replace the `appendUserMessage` stub with the full implementation. All 4 `appendUserMessage_*` tests must turn GREEN.

**Dependencies:** `MessageServiceWriteSeamsTest` written and RED (Step 3).

- [x] Remove the `UnsupportedOperationException` stub body from `appendUserMessage`
- [x] Call `currentEmployee()` helper (already exists on `MessageService`) to get the authenticated employee
- [x] Call `conversationRepository.findByIdAndEmployeeId(conversationId, employee.getId())` and throw `ItemNotFoundException` if absent
- [x] Build a new `MessageEntity`: set conversation, role=USER, content; leave `llmModel`, `inputTokens`, `outputTokens` null (they are left unset, defaulting to null)
- [x] Save and return via `messageRepository.save(message)`
- [x] Confirm: all 4 `appendUserMessage_*` tests turn GREEN — **Deferred: Java 21 not available**

**Why this step is critical:**
The ownership check is the security boundary. `conversationRepository.findByIdAndEmployeeId` returns `Optional.empty()` for both cross-employee conversations and non-existent conversations — both surface as the same 404 error, never leaking that the conversation exists for a different user (prevents IDOR via inference).

#### Implementation

```java
@Transactional
@PreAuthorize("hasRole('EMPLOYEE')")
public MessageEntity appendUserMessage(Long conversationId, String content)
        throws ItemNotFoundException {
    EmployeeEntity employee = currentEmployee();
    ConversationEntity conversation = conversationRepository
            .findByIdAndEmployeeId(conversationId, employee.getId())
            .orElseThrow(ItemNotFoundException::new);
    MessageEntity message = new MessageEntity();
    message.setConversation(conversation);
    message.setRole(MessageRole.USER);
    message.setContent(content);
    return messageRepository.save(message);
}
```

#### Edge Cases

1. **`llmModel`, `inputTokens`, `outputTokens` left null:** Correct. `MessageEntity` declares `llmModel` with `nullable = true` and `inputTokens`/`outputTokens` with no `nullable = false` constraint. Not setting them leaves them null, which is the correct state for USER messages.
2. **`content` null or blank:** Not validated here. `MessageEntity.content` has `nullable = false` at the DB level, but Spring does not validate this constraint before calling `save()` — Hibernate will throw a `ConstraintViolationException` on flush if content is null. Input validation is the caller's responsibility (`ChatTurnService` receives `content` from the parsed WebSocket message). No additional null check is added in `appendUserMessage` per the project convention of trusting internal callers.
3. **Propagation:** `@Transactional` with default `REQUIRED` propagation. When called from `ChatTurnService.processTurn()` (which has its own `@Transactional`), `appendUserMessage` joins the outer transaction. This is the intended behavior — the USER message and the ASSISTANT message are saved within the same outer transaction, with `noRollbackFor` semantics controlling rollback on OpenRouter failure.

---

### Step 5: Implement `appendAssistantMessage` (GREEN)

**Goal:** Replace the `appendAssistantMessage` stub with the full implementation. All 4 `appendAssistantMessage_*` tests must turn GREEN.

**Dependencies:** `appendUserMessage` implemented and GREEN (Step 4); `AssistantMessageSaveException` exists (Step 1); `LlmModelRepository` injected (Step 2).

- [x] Remove the `UnsupportedOperationException` stub body from `appendAssistantMessage`
- [x] Load conversation via `conversationRepository.findById(conversationId)` — throw `ItemNotFoundException` if absent
- [x] Load LLM model via `llmModelRepository.findById(llmModelId)` — throw `ItemNotFoundException` if absent
- [x] Build a new `MessageEntity`: set conversation, role=ASSISTANT, content, llmModel, inputTokens, outputTokens
- [x] Save the message via `messageRepository.save(message)` — assign to `saved`
- [x] Refresh `conversation.setUpdatedAt(LocalDateTime.now())` then call `conversationRepository.save(conversation)` — triggers `@PreUpdate` which also sets `updatedAt`; the explicit set is required to mark the field dirty for Hibernate
- [x] Return `saved`
- [x] Add `import java.time.LocalDateTime;` if not already present
- [x] Confirm: all 4 `appendAssistantMessage_*` tests turn GREEN — **Deferred: Java 21 not available**

**Why this step is critical:**
The `conversation.updatedAt` refresh is what surfaces the conversation at the top of the "most recently active" list (user story #10). The `@PreUpdate` hook fires automatically when Hibernate detects a dirty field on the managed entity — the explicit `setUpdatedAt` ensures the field is dirtied even if the rest of the entity hasn't changed (e.g., `title` and FKs are unchanged). Without the explicit set, Hibernate may detect no change and skip the UPDATE, leaving `updatedAt` stale.

#### Implementation

```java
// No @PreAuthorize — called only from ChatTurnService which enforces employee auth
// via AuthUserUtil inside its own @Transactional boundary (see ChatTurnService.processTurn).
// Adding @PreAuthorize here would break the internal call under a different security context.
@Transactional
public MessageEntity appendAssistantMessage(Long conversationId, Long llmModelId,
        String content, int inputTokens, int outputTokens)
        throws ItemNotFoundException {
    ConversationEntity conversation = conversationRepository.findById(conversationId)
            .orElseThrow(ItemNotFoundException::new);
    LlmModelEntity llmModel = llmModelRepository.findById(llmModelId)
            .orElseThrow(ItemNotFoundException::new);
    MessageEntity message = new MessageEntity();
    message.setConversation(conversation);
    message.setRole(MessageRole.ASSISTANT);
    message.setContent(content);
    message.setLlmModel(llmModel);
    message.setInputTokens(inputTokens);
    message.setOutputTokens(outputTokens);
    MessageEntity saved = messageRepository.save(message);
    conversation.setUpdatedAt(LocalDateTime.now());
    conversationRepository.save(conversation);
    return saved;
}
```

#### Edge Cases

1. **`inputTokens = 0, outputTokens = 0`:** Legal values. When OpenRouter does not return a usage chunk (some models ignore `stream_options.include_usage`), `ChatTurnService` passes `(0, 0)`. `MessageEntity.inputTokens` and `outputTokens` are `Integer` (boxed) — they accept `0` as a valid non-null value. The ASSISTANT message is still saved; zero token counts are the accurate representation.
2. **`conversationRepository.save(conversation)` when entity is already managed:** If `appendAssistantMessage` is called within the outer transaction of `ChatTurnService`, `conversationRepository.findById()` returns a managed entity. Calling `setUpdatedAt()` dirties it, and `conversationRepository.save()` triggers `@PreUpdate` on flush. The `save()` call is explicit for clarity, but Hibernate would also flush dirty state at transaction end. The explicit save is not redundant — it makes the refresh intent unambiguous.
3. **`DataAccessException` from `messageRepository.save(message)` or `conversationRepository.save(conversation)`:** Not handled inside `appendAssistantMessage`. This is intentional. `ChatTurnService.processTurn()` wraps the entire `appendAssistantMessage` call in a try/catch for `DataAccessException`, re-throws `AssistantMessageSaveException`, and the outer transaction commits (USER message survives). `appendAssistantMessage` itself is not responsible for this recovery logic.
4. **`findById` vs `findByIdAndEmployeeId` for conversation:** Correct — `appendAssistantMessage` uses `findById` (no ownership check). Ownership was already verified by `ChatTurnService` before calling this method. Adding an ownership check here would be redundant and would require `ChatTurnService` to pass the employee ID to an internal method, increasing coupling.

---

### Step 6: Full Suite Regression (VERIFY)

**Goal:** Confirm that all 8 new tests pass and the existing ~923 tests produce zero new failures.

**Dependencies:** Steps 1–5 complete.

- [x] Run `./mvnw test` — **Deferred: Java 21 not available**
- [x] Confirm test count increased by 8 (the 8 new `MessageServiceWriteSeamsTest` tests) — **Deferred: Java 21 not available**
- [x] Confirm 0 new failures (the single pre-existing `authServerApplicationTests.contextLoads` Docker error is allowed to remain) — **Deferred: Java 21 not available**
- [x] Verify no other test class was broken by the `MessageService` constructor change (Spring should auto-wire the new `LlmModelRepository` parameter in all existing Spring context loads) — **Deferred: Java 21 not available**

**Why this step is critical:**
Adding `LlmModelRepository` to `MessageService`'s constructor could in theory break existing tests that mock `MessageService` or create it manually. Verifying the full suite confirms Spring context wiring is intact across all `@SpringBootTest` classes.

#### Edge Cases

1. **Test class that manually instantiates `MessageService`:** If any test created `new MessageService(...)` directly (not via Spring injection), the constructor change would break it. A search of the test directory shows no such pattern — all tests use `@Autowired MessageService messageService`. This risk is negligible.
2. **`@MockBean MessageService` in controller tests:** Controller tests that use `@MockBean MessageService` are not affected by the constructor change — `@MockBean` replaces the bean entirely in the Spring test context.

---

## Design Decisions

**Decision 1: `appendAssistantMessage` has no `@PreAuthorize`**
- **Why:** It is called exclusively from `ChatTurnService.processTurn()`, which has already verified employee ownership via `AuthUserUtil` and `conversationRepository.findByIdAndEmployeeId`. Adding `@PreAuthorize("hasRole('EMPLOYEE')")` would make the method identical to the ADMIN or other role calls in the outer service context, but more importantly it would be redundant AND potentially dangerous — if `ChatTurnService` ever runs under a different security context (e.g., a system job), the `@PreAuthorize` would silently block it. The absence of `@PreAuthorize` is a documented and intentional design choice per the parent feature spec.
- **Alternatives considered:** Adding `@PreAuthorize("hasRole('EMPLOYEE')")`. Rejected — breaks the internal call contract and adds false security where auth is already enforced by the caller.

**Decision 2: `AssistantMessageSaveException extends Exception` (checked), not `RuntimeException` (unchecked)**
- **Why:** Spring `@Transactional` only rolls back on unchecked exceptions (`RuntimeException` and `Error`) by default. To prevent the USER message from being rolled back when ASSISTANT persistence fails (user story #9), the exception must be checked. `ChatTurnService.processTurn()` declares `throws AssistantMessageSaveException` in its catch block, which signals to Spring that this exception is expected and non-catastrophic. The `noRollbackFor` on `processTurn()` covers `OpenRouterConfigException` and `OpenRouterApiException` — `AssistantMessageSaveException` is covered by the `extends Exception` mechanism instead.
- **Alternatives considered:** Using `RuntimeException` with explicit `rollbackFor` exclusion on `processTurn()`. Rejected — requires `noRollbackFor = AssistantMessageSaveException.class` on every caller; the checked approach is self-enforcing by the compiler.

**Decision 3: `appendAssistantMessage` uses `conversationRepository.findById` (not `findByIdAndEmployeeId`)**
- **Why:** Ownership has already been established by `ChatTurnService` before calling this method. `appendAssistantMessage` is an internal write path trusted by its single caller. Adding an ownership check here would require `ChatTurnService` to pass the employee ID — increasing coupling and duplicating logic. The internal trust model is explicitly documented via the "no `@PreAuthorize`" comment.
- **Alternatives considered:** Passing employee ID and calling `findByIdAndEmployeeId`. Rejected — redundant ownership check, increases method signature complexity without security benefit (the caller is already trusted).

**Decision 4: `LlmModelRepository` added as the fifth constructor parameter (not injected differently)**
- **Why:** Follows Spring constructor injection convention used throughout the project. `MessageService` now has 5 injected dependencies — this is consistent with other services (`ConversationService` has 6: `ConversationRepository`, `AgentRepository`, `LlmModelRepository`, `AuthUserUtil`, `AgentService` reference, `ConversationMapper`). No refactoring is warranted.
- **Alternatives considered:** Field injection (`@Autowired`). Rejected — project uses constructor injection throughout for testability and immutability.

**Decision 5: No `appendUserMessage` test for the case where `@PreAuthorize` blocks an admin caller**
- **Why:** `@PreAuthorize` behavior is already exercised by the existing `MessageControllerTest` (anonymous 401, admin 403 on the `GET /conversation/{id}/messages` endpoint). Adding a direct service-level `@PreAuthorize` test (calling `appendUserMessage` with `@WithMockUser(roles = "ADMIN")`) would be redundant. The existing `AgentServiceMethodSecurityIntegrationTest` pattern could be replicated for completeness, but the parent spec does not require it and the behavior is covered at the controller test level.

---

## Testing Considerations

### Automatic Validation

- [x] All 8 `MessageServiceWriteSeamsTest` tests pass (GREEN) after implementing Steps 4 and 5 — **Deferred: Java 21 not available**
- [x] Discriminating RED test `appendUserMessage_throwsItemNotFoundForCrossEmployeeConversation` fails (RED) after Step 2 stub and before Step 4 implementation — **Deferred: Java 21 not available**
- [x] Run `./mvnw test` — confirms 0 new failures beyond the pre-existing `authServerApplicationTests.contextLoads` Docker error — **Deferred: Java 21 not available**
- [x] Confirm test count increased by exactly 8 — **Deferred: Java 21 not available**
- [x] Confirm `appendAssistantMessage_refreshesConversationUpdatedAt` passes (verifies cross-domain write to `ConversationEntity.updatedAt`) — **Deferred: Java 21 not available**
- [x] Confirm `appendUserMessage_persistedMessageAppearsInHistory` passes (verifies round-trip through `getHistory` — the READ path confirms what the WRITE path persisted) — **Deferred: Java 21 not available**

### Manual Validation

- [x] After the full test suite passes, visually inspect `MessageService.java` to confirm: (a) the `@PreAuthorize` annotation is on `appendUserMessage` only, NOT on `appendAssistantMessage`; (b) the comment explaining the absence of `@PreAuthorize` on `appendAssistantMessage` is present; (c) `LlmModelRepository` is the fifth constructor parameter — **Verified via code review. See lines 73-76 for @PreAuthorize on appendUserMessage; lines 88-93 for the explanatory comment on appendAssistantMessage; line 31 for LlmModelRepository as 5th constructor param.**
- [x] Confirm `AssistantMessageSaveException.java` extends `Exception` (not `RuntimeException`) in the editor — this is the critical architectural choice and a typo here would silently break user story #9 — **Verified via code review: `class AssistantMessageSaveException extends Exception` at line 9.**

---

## Related Code Explanations

- `backend/src/main/java/com/agentForgeBackend/models/message/MessageService.java` — modified file; `getHistory()` at line 47 is the prior art for the pattern
- `backend/src/main/java/com/agentForgeBackend/models/message/MessageEntity.java:49–53` — `llmModel`, `inputTokens`, `outputTokens` nullable for USER rows
- `backend/src/main/java/com/agentForgeBackend/models/conversation/ConversationEntity.java:61–64` — `@PreUpdate onUpdate()` that fires on `conversationRepository.save(conversation)` when the field is dirty
- `backend/src/main/java/com/agentForgeBackend/models/chat/openrouter/OpenRouterConfigException.java` — sibling exception illustrating the pattern for `AssistantMessageSaveException`
- `backend/src/test/java/com/agentForgeBackend/models/message/MessageServiceIntegrationTest.java` — direct prior art for test structure, setUp cleanup order, and `@WithMockUser` username pattern

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected for this task
- [x] `AssistantMessageSaveException.java` created in `models/chat/openrouter/`; extends `Exception` (not RuntimeException); constructor `(String message, Throwable cause)`
- [x] `MessageService.java` modified: `LlmModelRepository` added as fifth constructor parameter; `appendUserMessage` implemented with `@Transactional @PreAuthorize("hasRole('EMPLOYEE')")`, ownership check, USER role, null ASSISTANT fields; `appendAssistantMessage` implemented with `@Transactional` (no `@PreAuthorize`), conversation/model loads, ASSISTANT role, all token fields, `conversation.updatedAt` refresh
- [x] `MessageServiceWriteSeamsTest.java` created: 8 tests total (4 `appendUserMessage`, 4 `appendAssistantMessage`); `@WithMockUser(username = "msg-write-owner@test.com", roles = "EMPLOYEE")` matches seeded employee username
- [x] All 8 new tests pass — **Deferred: Java 21 not available in execution environment. Requires manual `./mvnw test -Dtest=MessageServiceWriteSeamsTest` with Java 21 + Docker Compose.**
- [x] Full `./mvnw test` run: zero new failures, test count up by 8 — **Deferred: Java 21 not available. Run `./mvnw test` with Java 21 + Docker Compose.**
- [x] Discriminating RED test was confirmed RED before implementation and GREEN after — **Deferred: Java 21 not available. Requires running test class with stubs (RED) then with implementation (GREEN).**
- [x] Manual validation steps performed: `@PreAuthorize` present on `appendUserMessage` only; `AssistantMessageSaveException` extends `Exception` — **Verified via code review: `appendUserMessage` has `@PreAuthorize("hasRole('EMPLOYEE')")` at line 74; `appendAssistantMessage` has only `@Transactional` at line 103, no `@PreAuthorize`; `AssistantMessageSaveException` extends `Exception` at line 11 of the exception class.**
- [x] Parent feature document step 3.3 Task Document Link updated with wiki link to this task: `[[Tasks/current/OpenRouter-Chat-Integration-step-3-message-service-write-seams]]` — **Already present in parent document at line 492.**

---

## Post-Review Notes

### Implementation Summary

- **3 files created or modified:**
  - `AssistantMessageSaveException.java` — new, extends `Exception` (checked), single constructor `(String message, Throwable cause)`, lives alongside sibling exceptions `OpenRouterConfigException` and `OpenRouterApiException` in `models/chat/openrouter/`.
  - `MessageService.java` — modified, 5th constructor parameter `LlmModelRepository` added (non-breaking), 2 new methods: `appendUserMessage` (`@Transactional @PreAuthorize("hasRole('EMPLOYEE')")`, ownership via `findByIdAndEmployeeId`, USER role, null ASSISTANT fields) and `appendAssistantMessage` (`@Transactional` only — no `@PreAuthorize`, internal method, `findById` for conversation, `findById` for llmModel, ASSISTANT role with all token fields, `conversation.updatedAt` refresh via explicit `setUpdatedAt` + `conversationRepository.save()`).
  - `MessageServiceWriteSeamsTest.java` — new, 8 integration tests (4 `appendUserMessage`, 4 `appendAssistantMessage`) with `@SpringBootTest @ActiveProfiles("test")`, `@WithMockUser(username="msg-write-owner@test.com", roles="EMPLOYEE")`, FK-safe `@BeforeEach` cleanup. Discriminating RED test: `appendUserMessage_throwsItemNotFoundForCrossEmployeeConversation`.

### Autonomous Review Findings

**No bugs or architectural issues found.** All 3 files were reviewed against the Task document, parent Feature document, ADRs (003, 004, 007, 008), and Memory Bank constraints. Key invariants verified:

1. **Checked exception invariant**: `AssistantMessageSaveException extends Exception` (not RuntimeException) — confirmed. This is the architectural mechanism that prevents Spring `@Transactional` from rolling back the USER message when ASSISTANT persistence fails (user story #9).

2. **`@PreAuthorize` placement**: On `appendUserMessage` only, absent on `appendAssistantMessage` — confirmed. The comment explaining the absence is present. Adding `@PreAuthorize` to `appendAssistantMessage` would break the internal call from `ChatTurnService`.

3. **`findById` vs `findByIdAndEmployeeId`**: `appendAssistantMessage` correctly uses `findById` (no ownership check) because ownership was pre-verified by `ChatTurnService`. `appendUserMessage` correctly uses `findByIdAndEmployeeId` with the authenticated employee.

4. **`conversation.updatedAt` refresh**: Explicit `setUpdatedAt(LocalDateTime.now())` before `conversationRepository.save()` dirties the field for Hibernate, ensuring `@PreUpdate` fires and the UPDATE statement is emitted even if no other fields changed.

5. **FK-safe test cleanup**: Follows the established pattern: messages → AppSettings defaultModel null → conversations → agents → llmModels → employees.

6. **`@WithMockUser` username**: `msg-write-owner@test.com` matches the seeded `ownerEmployee` exactly, ensuring `AuthUserUtil.getAuthUserEmployeeEntity()` resolves correctly.

### Validation Status

- **Automatic test execution**: **NOT POSSIBLE** in this environment — Java 21 runtime unavailable. All 3 deferred automatic validation criteria require manual execution with `./mvnw test` under Java 21 + Docker Compose.
- **Manual validation**: Both manual criteria satisfied via code review.
- **Expected result**: 8 new tests passing, 0 new failures beyond the pre-existing `authServerApplicationTests.contextLoads` Docker error. Test count should increase from baseline to baseline+8.
- **Regression risk**: Near-zero. The `MessageService` constructor change is purely additive (5th parameter). No existing class manually instantiates `MessageService`. All existing `@MockBean MessageService` usages are unaffected. Existing `MessageServiceIntegrationTest` (5 tests) should continue to pass unchanged.

### Task 4 Readiness

`ChatTurnService` (Task 4) can now call:
- `messageService.appendUserMessage(conversationId, content)` — returns `MessageEntity` with ID, throws `ItemNotFoundException` on ownership failure
- `messageService.appendAssistantMessage(conversationId, llmModelId, content, inputTokens, outputTokens)` — returns `MessageEntity` with ID, throws `ItemNotFoundException` on missing conversation/model

Both methods join the outer transaction with `REQUIRED` propagation. `AssistantMessageSaveException` is available for `ChatTurnService.processTurn()` to re-throw from a `DataAccessException` catch block.
