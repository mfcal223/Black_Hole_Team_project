# Task: Message Domain Foundation

#task #current #high-complexity #parent-message-entity-and-conversation-history

**Parent:** [[Message-Entity-and-Conversation-History]]
**Parent Type:** Feature
**Related Step(s):** Phase 1 — Steps 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
**Estimated Complexity:** High

---

## Goal

Create the full persistence and contract layer for the `Message` domain: `MessageRole` enum, `MessageEntity` (immutable, two outbound FKs, `@OnDelete(CASCADE)` on the conversation FK), `MessageDTO`, `MessageMapper` (read-only, `@Component`), and `MessageRepository` (extends `JpaRepository` directly). Compile to generate `QMessageEntity` via QueryDSL APT and verify all FK relationships. Close Phase 1 with `MessageRepositoryTest` as the repository completion gate.

---

## Parent Context

The parent feature adds the `Message` persistence slice to AgentForge. A `MessageEntity` represents a single conversation turn — USER or ASSISTANT — and is the write target for the future OpenRouter chat flow and the source of truth for token usage analytics (ADR-004).

This task covers the domain foundation only. Service, controller, and HTTP endpoint wiring are in Task 2. Regression patching (FK-safe delete order in existing test classes) is in Task 3.

**Key parent decisions that govern this task:**

- **Package:** `models/message/` — top-level peer of `models/conversation/`, `models/agent/`, and `models/llm/`. Not nested inside any other domain.
- **Entity inheritance:** `MessageEntity` does NOT extend `BaseUserEntity`. Standalone domain entity.
- **Two outbound FKs:**
  - `conversation` → `ConversationEntity` (`conversation_id`, `nullable = false`, LAZY, `@OnDelete(action = OnDeleteAction.CASCADE)`) — resolves the deferred constraint from the Conversation feature; deleting a Conversation now cascade-deletes all its Messages at the DB level.
  - `llmModel` → `LlmModelEntity` (`llm_model_id`, `nullable = true`, LAZY, no cascade) — set only on ASSISTANT messages.
- **Immutability:** `MessageEntity` is write-once. No `@PreUpdate` lifecycle hook. No `updatedAt` field. The message table is an append-only audit log.
- **`@PrePersist` only:** Sets `createdAt` to `LocalDateTime.now()`. The `createdAt` column is `updatable = false`.
- **`@Lob` TEXT for `content`:** Same pattern as `AgentEntity.initPrompt` — `@Lob @Column(columnDefinition = "TEXT", nullable = false)` prevents varchar truncation on long LLM responses.
- **`@Enumerated(EnumType.STRING)` for `role`:** Stores `"USER"` or `"ASSISTANT"` as a varchar — human-readable, schema-resilient. `MessageRole` enum contains only `USER` and `ASSISTANT` (no `SYSTEM` per ADR-008).
- **Nullable token fields:** `inputTokens` and `outputTokens` are `Integer` (boxed, nullable). USER messages always have null token fields; ASSISTANT messages have non-null token fields once populated by the OpenRouter Chat Integration.
- **`MessageMapper` does NOT implement `DefaultMapper`:** No form input, no list/mini DTO variants needed. Single method: `toDTO(MessageEntity)`. Annotated `@Component`.
- **`MessageRepository` extends `JpaRepository<MessageEntity, Long>` directly — NOT `DefaultRepository`:** No QueryDSL filtering needed for message history. Extending `DefaultRepository` (which adds `QuerydslPredicateExecutor`) would require QueryDSL predicates for a single-field equality query that Spring Data JPA resolves natively.
- **Index on `conversation_id`:** `@Index(name = "idx_message_conversation", columnList = "conversation_id")` — the history query filters exclusively on this column.
- **ADR-004 analytics indexes deferred:** `message.role`, `message.created_at`, and `message.llm_model_id` indexes are deferred to the admin analytics dashboard feature. Only `idx_message_conversation` is created here.
- **TDD:** Vertical slice approach. Repository cycle first (entity + repository), mapper cycle second (DTO + mapper).

---

## Preconditions / Dependencies

- `ConversationEntity` exists at `models/conversation/ConversationEntity.java` — FK parent for `MessageEntity.conversation`. Not modified in this task; FK is declared on the Message side.
- `ConversationRepository` exists at `models/conversation/ConversationRepository.java` — used in `MessageRepositoryTest` to verify `@OnDelete(CASCADE)` cascade behavior.
- `LlmModelEntity` exists at `models/llm/LlmModelEntity.java` — FK target for `MessageEntity.llmModel` (nullable).
- `EmployeeEntity` exists at `models/hq/employee/EmployeeEntity.java` — required to seed `ConversationEntity` in `MessageRepositoryTest` (Conversation has a non-null `employee_id` FK).
- `DefaultRepository` and `DefaultMapper` interfaces exist in `shared/defaultInterfaces/` — `MessageRepository` and `MessageMapper` intentionally do NOT extend/implement them; their patterns are referenced as negative examples in design decisions.
- H2 in-memory DB is configured via `application-test.properties` with `spring.jpa.hibernate.ddl-auto=create-drop`.
- Maven QueryDSL APT processor (`querydsl-apt`) is configured in `pom.xml` — generates Q-classes for all `@Entity` classes at compile time, including `QMessageEntity`.
- `./mvnw compile` run from `backend/` is the compile command (no `mvnw` at project root).
- Conversation feature (Tasks 1–4) is fully complete and merged. Full test suite currently at 873 tests, 0 failures, 1 pre-existing Docker error.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — Selected — task template, naming conventions, doc config
- `solid-deep-design` — Selected — SRP per class; ISP analysis for why MessageMapper does not implement DefaultMapper; depth analysis for MessageRepository; deletion test applied to all five new types
- `tdd` — Selected — two vertical TDD cycles (repository then mapper); write failing tests before production code; no horizontal slicing
- `memory-bank` — Selected — architecture, tech stack, and known-issues loaded; existing entity/FK patterns confirmed; FK-safe delete order requirement from known-issues.md noted
- `glossary-management` — Selected — Message, Conversation, Employee, LLM Model terms reviewed; no new domain terms introduced
- `find-docs` — Selected — Hibernate `@OnDelete(action = OnDeleteAction.CASCADE)` verified: DDL-level cascade, generates `ON DELETE CASCADE` SQL directive on FK constraint. Spring Data JPA `findByConversationIdOrderByCreatedAtAsc` derived query naming verified.

### Documentation Reviewed

- `documentation/Features/to-do/Message-Entity-and-Conversation-History.md` — parent feature; §§1.1–1.7 (domain foundation steps), testing decisions, risk assessment
- `documentation/Tasks/done/Conversation-Entity-and-Employee-Crud-step-2-domain-foundation.md` — direct prior art; identical TDD cycle pattern, same `@DataJpaTest` structure, same Hibernate proxy safety concern, same null-safe FK pattern
- `documentation/Memory/known-issues.md` — FK-safe delete order: `messageRepository.deleteAll()` must precede `conversationRepository.deleteAll()` in global cleanup; confirmed as Task 3 responsibility
- `documentation/ADRs/ADR-003-single-message-entity-with-role-enum.md` — single entity + enum discriminator; accepted
- `documentation/ADRs/ADR-004-message-table-as-token-usage-source.md` — MessageEntity is sole token analytics source; analytics indexes deferred
- `documentation/ADRs/ADR-008-agent-prompts-not-persisted-as-messages.md` — MessageRole has only USER and ASSISTANT; no SYSTEM value
- `documentation/ADRs/ADR-009-long-primary-key-for-all-entities.md` — `Long` PK with `@GeneratedValue(IDENTITY)`
- `backend/src/main/java/com/agentForgeBackend/models/agent/AgentEntity.java` — canonical prior art for `@Lob TEXT` pattern (`initPrompt`, `recurrentPrompt`)
- `backend/src/main/java/com/agentForgeBackend/models/conversation/ConversationEntity.java` — canonical prior art for `@OnDelete` annotation pattern and LAZY FK structure
- Context7 / Hibernate ORM docs — `@OnDelete(action = OnDeleteAction.CASCADE)` on `@ManyToOne` confirmed to generate `ON DELETE CASCADE` DDL via schema generator
- Context7 / Spring Data JPA docs — `findByConversationIdOrderByCreatedAtAsc` derived query naming confirmed

### Related Existing Code

- [[ConversationEntity-java]] — `backend/src/main/java/com/agentForgeBackend/models/conversation/ConversationEntity.java` — `@OnDelete` import pattern (`org.hibernate.annotations.OnDelete`, `org.hibernate.annotations.OnDeleteAction`), LAZY FK structure, `@PrePersist`/`@PreUpdate` lifecycle hooks
- [[ConversationRepository-java]] — `backend/src/main/java/com/agentForgeBackend/models/conversation/ConversationRepository.java` — used in `MessageRepositoryTest` to delete conversations and verify cascade; also the pattern being referenced (MessageRepository takes a simpler approach)
- [[AgentEntity-java]] — `backend/src/main/java/com/agentForgeBackend/models/agent/AgentEntity.java` — `@Lob @Column(columnDefinition = "TEXT", nullable = false)` pattern for TEXT columns
- [[LlmModelEntity-java]] — `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelEntity.java` — FK target for nullable `llmModel`; `getId()` proxy safety
- [[ConversationMapper-java]] — `backend/src/main/java/com/agentForgeBackend/models/conversation/ConversationMapper.java` — null-safe `agentId` null-check pattern; Hibernate proxy `getId()` comment; `@Component`
- [[ConversationRepositoryTest-java]] — `backend/src/test/java/com/agentForgeBackend/models/conversation/ConversationRepositoryTest.java` — canonical template for `@DataJpaTest` tests including `@OnDelete` cascade verification pattern

---

## Implementation Details

### Approach

**SOLID + Depth analysis:**

- **MessageRole**: value object / discriminator enum. One reason to change: when the set of valid roles changes. Shallow by design — enums are type-safe constants, not deep modules. Appropriate.
- **MessageEntity**: SRP — persists a single conversation turn. One reason to change: when the message table schema changes. Deep — `@PrePersist` lifecycle, two FK relationships, column mapping, table index all hidden from callers. Interface: setters from Lombok `@Getter @Setter @NoArgsConstructor`.
- **MessageDTO**: SRP — API output contract. One reason to change: when the message response shape changes. Shallow by design — DTOs are contracts, not logic modules.
- **MessageMapper**: SRP — converts `MessageEntity` to `MessageDTO`. One reason to change: when the conversion logic changes. ISP: does NOT implement `DefaultMapper`. `DefaultMapper` requires four methods (`toDTO`, `toSmallDTO`, `toListDTO`, `toEntity`); forcing `MessageMapper` to stub three unused methods violates ISP and adds dead stubs that create maintenance burden. Deletion test: deleting `MessageMapper` would scatter the null-safe `llmModel` conversion and proxy-safe `conversation.getId()` logic across all callers — it earns its keep. Single public method.
- **MessageRepository**: SRP — data access for `MessageEntity`. One reason to change: when message persistence needs change. Does NOT extend `DefaultRepository`. `DefaultRepository` adds `QuerydslPredicateExecutor` — this forces Q-class usage and adds QueryDSL compile complexity. The history query (`conversation_id = ?` ordered by `created_at ASC`) is a simple derived query that Spring Data JPA resolves natively with no predicate builder. Extending `DefaultRepository` would be accidental complexity.

**Two TDD cycles (vertical slices):**

**TDD Cycle 1 — Repository:**
1. **RED**: Write `MessageRepositoryTest.java`. Tests reference `MessageRole`, `MessageEntity`, `MessageRepository` which do not exist — compilation fails.
2. **GREEN**: Create `MessageRole` → `MessageEntity` → `MessageRepository` → compilation succeeds → run tests → all pass.

**TDD Cycle 2 — Mapper:**
1. **RED**: Write `MessageMapperTest.java`. Tests reference `MessageDTO`, `MessageMapper` which do not exist — compilation fails.
2. **GREEN**: Create `MessageDTO` → `MessageMapper` → compilation succeeds → run tests → all pass.

**`@OnDelete(action = OnDeleteAction.CASCADE)` on `conversation` FK:**
The annotation from `org.hibernate.annotations` instructs Hibernate's schema generator to emit `ON DELETE CASCADE` on the `conversation_id` FK DDL. With `ddl-auto=create-drop` in H2 tests, the constraint is generated on each test run. When `conversationRepository.deleteById(id)` is called and flushed, H2 processes the `ON DELETE CASCADE` and deletes all Message rows for that conversation at the database level — no JPA cascade annotations (`CascadeType`) are involved. `entityManager.clear()` evicts stale managed entities from the first-level cache; subsequent `findById` calls go to H2 and return empty.

**Null-safe `llmModel` in `MessageMapper.toDTO()`:**
When `llm_model_id` is NULL in the DB, Hibernate returns `null` for `entity.getLlmModel()` (not an uninitialized proxy — a null FK column means no proxy). The guard `entity.getLlmModel() != null ? entity.getLlmModel().getId() : null` is required. Calling `getId()` on null would throw `NullPointerException`, not `LazyInitializationException`.

**Hibernate proxy `getId()` safety for `conversation` FK:**
`entity.getConversation().getId()` — Hibernate stores the FK identifier inside the proxy at proxy construction time. `getId()` never triggers lazy initialization. This is safe to call outside a transaction. The integration test (`MessageMapperIntegrationTest`) verifies this contract on real Hibernate proxies.

**Compile step (Step 1.6):**
Running `./mvnw compile` from `backend/` triggers `querydsl-apt` to generate `QMessageEntity.java` in `backend/target/generated-sources/annotations/`. `QMessageEntity` is not used in this feature (MessageRepository extends JpaRepository directly), but it is generated because `@Entity` classes always get Q-classes. The compile step also verifies that all FK imports (`ConversationEntity`, `LlmModelEntity`) resolve cleanly and `@OnDelete` annotation imports are correct.

### Files to Create/Modify

**New production files (all in `backend/src/main/java/com/agentForgeBackend/models/message/`):**
- [x] `MessageRole.java` — enum with `USER` and `ASSISTANT` values; no `SYSTEM` (ADR-008)
- [x] `MessageEntity.java` — JPA entity, two FK relationships (`conversation` non-null + `@OnDelete(CASCADE)`, `llmModel` nullable), `@Enumerated(STRING)` for role, `@Lob TEXT` for content, `@PrePersist` timestamp, table index on `conversation_id`
- [x] `MessageDTO.java` — API output contract; `@Data @AllArgsConstructor @NoArgsConstructor`; 8 fields with nullable `llmModelId`, `inputTokens`, `outputTokens`
- [x] `MessageMapper.java` — `@Component`; single `toDTO(MessageEntity)` method; null-safe for `llmModel`; proxy-safe for `conversation.getId()`
- [x] `MessageRepository.java` — extends `JpaRepository<MessageEntity, Long>` (NOT `DefaultRepository`); `findByConversationIdOrderByCreatedAtAsc(Long conversationId)`

**New test files:**
- [x] `backend/src/test/java/com/agentForgeBackend/models/message/MessageRepositoryTest.java` — `@DataJpaTest` tests: persistence round-trip (USER message, ASSISTANT message), `prePersistSetsCreatedAt`, ordering, `@OnDelete(CASCADE)` cascade verification
- [x] `backend/src/test/java/com/agentForgeBackend/models/message/MessageMapperTest.java` — pure unit tests: `toDTO` for USER/ASSISTANT messages, null `llmModel` → null `llmModelId`, null entity → null DTO
- [x] `backend/src/test/java/com/agentForgeBackend/models/message/MessageMapperIntegrationTest.java` — `@DataJpaTest` regression: Hibernate proxy `getId()` safety for `conversation` and `llmModel`

**No existing files modified in this task.** (FK-safe delete order patches for existing test classes are Task 3.)

---

## Step-by-Step Implementation

### Step 1: TDD RED — Write MessageRepositoryTest (before enum/entity/repository exist)

**Goal:** Write behavior tests for `MessageRepository` before any production code exists. Tests reference `MessageRole`, `MessageEntity`, and `MessageRepository` — all of which are absent. Compilation fails — this is the expected RED state.

**Dependencies:** `ConversationEntity`, `ConversationRepository`, `LlmModelEntity`, `EmployeeEntity` all exist (preconditions satisfied).

- [ ] Create directory: `backend/src/test/java/com/agentForgeBackend/models/message/`
- [ ] Create `MessageRepositoryTest.java` with the full test class below
- [ ] Confirm the file does NOT compile (expected — `MessageRole`, `MessageEntity`, `MessageRepository` do not exist yet)

**Why this step is critical:** Writing tests first defines the repository contract — FK persistence, nullable llmModel, ordering by `createdAt ASC`, and the `@OnDelete(CASCADE)` cascade behavior — before any entity is written. The cascade test is the primary machine-verifiable gate for the deferred FK constraint.

#### Implementation

```java
package com.agentForgeBackend.models.message;

import com.agentForgeBackend.models.conversation.ConversationEntity;
import com.agentForgeBackend.models.conversation.ConversationRepository;
import com.agentForgeBackend.models.hq.employee.EmployeeEntity;
import com.agentForgeBackend.models.llm.LlmModelEntity;
import com.agentForgeBackend.shared.models.baseUser.UserRoles;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@Tag("repository")
class MessageRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private ConversationRepository conversationRepository;

    private ConversationEntity conversation;
    private LlmModelEntity model;

    @BeforeEach
    void setUp() {
        entityManager.clear();

        EmployeeEntity employee = entityManager.persistFlushFind(new EmployeeEntity(
                "Message", "Test", "message-repo-test@test.com",
                Set.of(UserRoles.EMPLOYEE), "message-repo-test", "password"));

        model = new LlmModelEntity();
        model.setModelId("openai/gpt-4o-msg-test");
        model.setName("GPT-4o Msg Test");
        model.setIsEnabled(true);
        model = entityManager.persistFlushFind(model);

        conversation = new ConversationEntity();
        conversation.setTitle("Test Conversation");
        conversation.setEmployee(employee);
        conversation.setCurrentModel(model);
        conversation = entityManager.persistFlushFind(conversation);
    }

    private MessageEntity buildUserMessage(String content) {
        MessageEntity msg = new MessageEntity();
        msg.setConversation(conversation);
        msg.setRole(MessageRole.USER);
        msg.setContent(content);
        return msg;
    }

    private MessageEntity buildAssistantMessage(String content) {
        MessageEntity msg = new MessageEntity();
        msg.setConversation(conversation);
        msg.setRole(MessageRole.ASSISTANT);
        msg.setContent(content);
        msg.setLlmModel(model);
        msg.setInputTokens(100);
        msg.setOutputTokens(200);
        return msg;
    }

    @Test
    void persistUserMessageWithNullLlmModelSucceeds() {
        MessageEntity msg = entityManager.persistAndFlush(buildUserMessage("Hello"));
        entityManager.clear();

        MessageEntity saved = messageRepository.findById(msg.getId()).orElseThrow();

        assertThat(saved.getRole()).isEqualTo(MessageRole.USER);
        assertThat(saved.getContent()).isEqualTo("Hello");
        assertThat(saved.getLlmModel()).isNull();
        assertThat(saved.getInputTokens()).isNull();
        assertThat(saved.getOutputTokens()).isNull();
    }

    @Test
    void persistAssistantMessageWithAllFieldsSucceeds() {
        MessageEntity msg = entityManager.persistAndFlush(buildAssistantMessage("Hi there!"));
        entityManager.clear();

        MessageEntity saved = messageRepository.findById(msg.getId()).orElseThrow();

        assertThat(saved.getRole()).isEqualTo(MessageRole.ASSISTANT);
        assertThat(saved.getContent()).isEqualTo("Hi there!");
        assertThat(saved.getLlmModel()).isNotNull();
        assertThat(saved.getLlmModel().getId()).isEqualTo(model.getId());
        assertThat(saved.getInputTokens()).isEqualTo(100);
        assertThat(saved.getOutputTokens()).isEqualTo(200);
    }

    @Test
    void prePersistSetsCreatedAt() {
        MessageEntity msg = entityManager.persistAndFlush(buildUserMessage("Timestamp test"));
        entityManager.clear();

        MessageEntity saved = messageRepository.findById(msg.getId()).orElseThrow();

        assertThat(saved.getCreatedAt()).isNotNull();
    }

    @Test
    void findByConversationIdOrderByCreatedAtAscReturnsMessagesInOrder() throws InterruptedException {
        // <!-- REVIEW-FIX: removed intermediate entityManager.clear() between persists — clearing
        // between persists detaches conversation and model, causing buildAssistantMessage to set
        // detached FK references on the second entity. ConversationRepositoryTest canonical
        // pattern never clears between persists in ordering tests. Single clear before query. -->
        MessageEntity first = entityManager.persistAndFlush(buildUserMessage("First"));

        Thread.sleep(20); // ensure distinct createdAt timestamps

        MessageEntity second = entityManager.persistAndFlush(buildAssistantMessage("Second"));
        entityManager.clear();

        List<MessageEntity> result =
                messageRepository.findByConversationIdOrderByCreatedAtAsc(conversation.getId());

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getId()).isEqualTo(first.getId());
        assertThat(result.get(1).getId()).isEqualTo(second.getId());
    }

    @Test
    void onDeleteCascadeRemovesMessagesWhenConversationDeleted() {
        // Verifies that @OnDelete(action = OnDeleteAction.CASCADE) on MessageEntity.conversation
        // generates an ON DELETE CASCADE constraint in H2 DDL. When the Conversation is deleted,
        // H2 deletes all message rows with that conversation_id at the database level.
        // This resolves the deferred @OnDelete(CASCADE) FK constraint from the Conversation feature.
        //
        // If this test fails on H2, verify that Hibernate generated ON DELETE CASCADE by enabling
        // spring.jpa.show-sql=true and checking the CREATE TABLE message DDL output.
        // If H2 does not honor the constraint, document in known-issues.md and add a Docker
        // PostgreSQL-backed cascade verification path.
        MessageEntity msg1 = entityManager.persistAndFlush(buildUserMessage("cascade msg 1"));
        MessageEntity msg2 = entityManager.persistAndFlush(buildAssistantMessage("cascade msg 2"));
        entityManager.clear();

        conversationRepository.deleteById(conversation.getId());
        conversationRepository.flush();
        entityManager.clear();

        assertThat(messageRepository.findById(msg1.getId())).isEmpty();
        assertThat(messageRepository.findById(msg2.getId())).isEmpty();
    }
}
```

#### Edge Cases

1. **`@DataJpaTest` transaction rollback:** Each test method runs in a transaction that rolls back on completion. `@BeforeEach` persists `employee`, `model`, and `conversation` within the same transaction — no cross-test contamination.
2. **Username/email uniqueness:** `message-repo-test@test.com` and `message-repo-test` are unique strings not used by any other test class. `@DataJpaTest` uses `create-drop` so tables are fresh per test session, but within a session multiple test classes can run and reuse the same H2 schema. If another test class in the same `@DataJpaTest` session seeds an employee with the same credentials, a `DataIntegrityViolationException` will occur. Use distinctive values.
3. **`Thread.sleep(20)` for ordering test:** `LocalDateTime.now()` has nanosecond precision; H2 stores microsecond precision. Even with the same-millisecond risk, 20ms sleep is sufficient to guarantee distinct `createdAt` values across two consecutive persists. Only a single `entityManager.clear()` is called after both persists — not between them — to avoid detaching the `conversation` and `model` fields that `buildAssistantMessage` references. (Calling `entityManager.clear()` between persists would make `conversation` and `model` detached; setting detached entities on a new entity being persisted deviates from the established `ConversationRepositoryTest` pattern.)
4. **`onDeleteCascadeRemovesMessagesWhenConversationDeleted` flush strategy:** `conversationRepository.deleteById(id)` stages the DELETE in Hibernate's context. `conversationRepository.flush()` sends `DELETE FROM conversation WHERE id = ?` to H2. H2 processes `ON DELETE CASCADE` and deletes message rows. `entityManager.clear()` evicts stale MessageEntity objects from the first-level cache. Subsequent `findById` queries go to H2 and return empty.
5. **Conversation's non-null `employee_id` FK:** `ConversationEntity.employee` is non-null. The `@BeforeEach` always seeds `employee` before `conversation`. The `EmployeeEntity` parameterized constructor `(firstName, lastName, email, roles, username, password)` is used — same pattern as `ConversationRepositoryTest`.

---

### Step 2: Create `MessageRole` enum (Step 1.1)

**Goal:** Define the role discriminator enum. Makes `MessageRepositoryTest` partially compilable (the enum reference resolves).

**Dependencies:** None — standalone enum.

- [ ] Create `backend/src/main/java/com/agentForgeBackend/models/message/MessageRole.java`

**Why this step is critical:** `MessageRole` is referenced by `MessageEntity`, `MessageRepository`, and all test code. Creating it first resolves enum references in the test before the entity and repository are written.

#### Implementation

```java
package com.agentForgeBackend.models.message;

public enum MessageRole {
    USER,
    ASSISTANT
}
```

No `SYSTEM` value — agent prompts are reconstructed at runtime and not persisted (ADR-008).

#### Edge Cases

1. **No `SYSTEM` value is intentional.** If a future feature requires persisting system-role messages, a new enum value must be added and this ADR re-evaluated. Do not add it speculatively.
2. **`@Enumerated(EnumType.STRING)` in the entity stores the name as a VARCHAR.** If the enum constant names are ever renamed (e.g., `USER` → `user_role`), all existing rows must be migrated. Use all-caps names consistent with the Java enum convention.

---

### Step 3: Create `MessageEntity` (Step 1.2)

**Goal:** Define the JPA entity with both FK relationships, the `@OnDelete(CASCADE)` constraint, and the `@PrePersist` lifecycle hook. This makes `MessageRepositoryTest` fully compilable.

**Dependencies:** `MessageRole` must exist (Step 2). `ConversationEntity`, `LlmModelEntity` must exist (preconditions).

- [ ] Create `backend/src/main/java/com/agentForgeBackend/models/message/MessageEntity.java`
- [ ] Verify the file compiles: `./mvnw compile` from `backend/`

**Why this step is critical:** `MessageEntity` defines the schema for the `message` table. The `@OnDelete(action = OnDeleteAction.CASCADE)` annotation on the `conversation` FK is the resolution to the deferred constraint documented in the Conversation feature. The `nullable = false` on `conversation` combined with CASCADE enables the DB-level deletion flow. The `@Lob` + `columnDefinition = "TEXT"` prevents varchar truncation on long LLM responses.

#### Implementation

```java
package com.agentForgeBackend.models.message;

import com.agentForgeBackend.models.conversation.ConversationEntity;
import com.agentForgeBackend.models.llm.LlmModelEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;

@Entity
@Table(name = "message", indexes = {
        @Index(name = "idx_message_conversation", columnList = "conversation_id")
})
@Getter
@Setter
@NoArgsConstructor
public class MessageEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    // @OnDelete(CASCADE) generates ON DELETE CASCADE DDL on conversation_id FK.
    // Deleting a Conversation removes all its Messages at the DB level — resolves the deferred
    // constraint from the Conversation feature.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private ConversationEntity conversation;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private MessageRole role;

    @Lob
    @Column(name = "content", columnDefinition = "TEXT", nullable = false)
    private String content;

    // nullable: null for USER messages; populated for ASSISTANT messages only
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "llm_model_id", nullable = true)
    private LlmModelEntity llmModel;

    @Column(name = "input_tokens")
    private Integer inputTokens;

    @Column(name = "output_tokens")
    private Integer outputTokens;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onPersist() {
        this.createdAt = LocalDateTime.now();
    }
}
```

#### Edge Cases

1. **`@OnDelete` import path:** `org.hibernate.annotations.OnDelete` and `org.hibernate.annotations.OnDeleteAction` — Hibernate-specific, not Jakarta Persistence. Spring Boot 3.4.1 manages Hibernate 6.x; these annotations are on the classpath via `spring-boot-starter-data-jpa`.
2. **`nullable = false` on `conversation` `@JoinColumn` is required:** `ON DELETE CASCADE` requires the FK column to exist. Non-null ensures every message has a parent conversation.
3. **No `@PreUpdate`:** `MessageEntity` is write-once. Adding `@PreUpdate` would silently timestamp modifications that should never happen. The absence is intentional — do not add it.
4. **`@Column(name = "input_tokens")` without `nullable = false`:** Omitting `nullable = false` means H2/PostgreSQL generates a nullable column. `Integer` (boxed) can hold null in Java. Primitive `int` cannot hold null and must not be used here.
5. **`@Lob` on H2:** H2 2.x (Spring Boot 3.4.1-managed) maps `@Lob` with `columnDefinition = "TEXT"` to a CLOB-compatible type. This is the same pattern used for `AgentEntity.initPrompt` and is verified by the existing agent tests.
6. **`ddl-auto=update` on a new table:** The `message` table does not yet exist in the production database. Hibernate generates the full DDL including the `ON DELETE CASCADE` constraint on first startup. No manual schema migration is needed for new installations.

---

### Step 4: Create `MessageRepository` (Step 1.5)

**Goal:** Provide data access with the ordered history finder method. After this step, `MessageRepositoryTest` compiles and all tests can be run.

**Dependencies:** `MessageEntity` must exist (Step 3).

- [ ] Create `backend/src/main/java/com/agentForgeBackend/models/message/MessageRepository.java`

**Why this step is critical:** `findByConversationIdOrderByCreatedAtAsc` is the only custom query needed for the message history feature. Using Spring Data JPA's derived query naming avoids writing JPQL while keeping the query fully verifiable through the repository test.

#### Implementation

```java
package com.agentForgeBackend.models.message;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<MessageEntity, Long> {

    List<MessageEntity> findByConversationIdOrderByCreatedAtAsc(Long conversationId);
}
```

**Spring Data JPA derived query resolution:**
- `findByConversationId` → `SELECT * FROM message WHERE conversation_id = :conversationId`
- `OrderByCreatedAtAsc` → `ORDER BY created_at ASC`

Spring Data resolves `ConversationId` by traversing `MessageEntity.conversation.id` — the `id` field of the `ConversationEntity` FK. This is a direct column comparison (`conversation_id = ?`) using the FK column already on the `message` table. `OrderByCreatedAtAsc` uses the `OrderBy...Asc` keyword pattern — verified against Spring Data JPA docs.

#### Edge Cases

1. **`ConversationId` suffix navigation:** Spring Data resolves `Conversation` → `MessageEntity.conversation` (the `ConversationEntity` field), then `Id` → `ConversationEntity.id` (the `@Id` field). Unambiguous because `conversation` is the only `ConversationEntity` field on `MessageEntity`.
2. **`List` return type:** Returns an empty `List` (not null) when no messages exist for the given `conversationId`. This is the expected behavior for a new conversation with no messages yet.
3. **Does NOT extend `DefaultRepository`:** `DefaultRepository` adds `QuerydslPredicateExecutor<MessageEntity>`, which forces QueryDSL dependency. Not needed here — the history query is a simple two-part derived query. The `QMessageEntity` class is still generated by APT (all `@Entity` classes get Q-classes) but is not used by this repository.

---

### Step 5: Run MessageRepositoryTest → GREEN (Step 1.7 partial)

**Goal:** All five repository tests pass.

**Dependencies:** Steps 2, 3, 4 complete.

- [ ] From `backend/`: run `./mvnw test -Dtest=MessageRepositoryTest`
- [ ] Confirm 5 tests pass, 0 failures
- [ ] If `onDeleteCascadeRemovesMessagesWhenConversationDeleted` fails: enable `spring.jpa.show-sql=true` in `application-test.properties`, re-run, and inspect the `CREATE TABLE message` DDL for `ON DELETE CASCADE`. If H2 does not honor the constraint, document the limitation in `documentation/Memory/known-issues.md` and add a Docker PostgreSQL-backed cascade verification path for this case.

**Why this step is critical:** Green repository tests confirm the entity schema, lifecycle hook, FK persistence, nullable `llmModel`, ordering, and the `@OnDelete(CASCADE)` cascade behavior all work correctly under H2. The cascade test is the highest-value test in this task — it is the first machine-verifiable confirmation that the deferred constraint from the Conversation feature is resolved.

#### Edge Cases

1. **`persistFlushFind` vs `persistAndFlush`:** `persistFlushFind(entity)` persists, flushes, and re-fetches (returns managed entity with generated ID). `persistAndFlush(entity)` persists and flushes (returns managed entity without re-fetch). The test uses `persistAndFlush` for message inserts (we need the generated ID immediately).
2. **H2 ON DELETE CASCADE support:** H2 2.x supports `ON DELETE CASCADE`. If the test fails, the most common cause is that `@ActiveProfiles("test")` is missing — without it, `ddl-auto=update` is used instead of `create-drop`, and Hibernate may not regenerate the table with the constraint.

---

### Step 6: TDD RED — Write MessageMapperTest (before DTO/mapper exist)

**Goal:** Write behavior tests for `MessageMapper` before `MessageDTO` or `MessageMapper` exist. Tests will not compile — expected RED state.

**Dependencies:** Steps 1–5 complete (repository tests green).

- [ ] Create `MessageMapperTest.java` in `backend/src/test/java/com/agentForgeBackend/models/message/`
- [ ] Confirm the file does NOT compile (expected — `MessageDTO` and `MessageMapper` do not exist yet)

**Why this step is critical:** Writing mapper tests first specifies the exact field contracts for `MessageDTO` before any class is created. The null-safety contract for `llmModelId` and the null-entity guard are verified here.

#### Implementation

```java
package com.agentForgeBackend.models.message;

import com.agentForgeBackend.models.conversation.ConversationEntity;
import com.agentForgeBackend.models.llm.LlmModelEntity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class MessageMapperTest {

    private MessageMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = new MessageMapper();
    }

    private MessageEntity buildUserMessage() {
        ConversationEntity conv = new ConversationEntity();
        conv.setId(1L);

        MessageEntity entity = new MessageEntity();
        entity.setId(10L);
        entity.setConversation(conv);
        entity.setRole(MessageRole.USER);
        entity.setContent("Hello");
        entity.setCreatedAt(LocalDateTime.of(2026, 6, 18, 10, 0, 0));
        return entity;
    }

    private MessageEntity buildAssistantMessage() {
        ConversationEntity conv = new ConversationEntity();
        conv.setId(1L);

        LlmModelEntity model = new LlmModelEntity();
        model.setId(5L);

        MessageEntity entity = new MessageEntity();
        entity.setId(20L);
        entity.setConversation(conv);
        entity.setRole(MessageRole.ASSISTANT);
        entity.setContent("Hello there!");
        entity.setLlmModel(model);
        entity.setInputTokens(50);
        entity.setOutputTokens(100);
        entity.setCreatedAt(LocalDateTime.of(2026, 6, 18, 10, 0, 1));
        return entity;
    }

    @Test
    void toDTOMapsUserMessageAllFields() {
        MessageEntity entity = buildUserMessage();

        MessageDTO dto = mapper.toDTO(entity);

        assertThat(dto.getId()).isEqualTo(10L);
        assertThat(dto.getConversationId()).isEqualTo(1L);
        assertThat(dto.getRole()).isEqualTo(MessageRole.USER);
        assertThat(dto.getContent()).isEqualTo("Hello");
        assertThat(dto.getLlmModelId()).isNull();
        assertThat(dto.getInputTokens()).isNull();
        assertThat(dto.getOutputTokens()).isNull();
        assertThat(dto.getCreatedAt()).isEqualTo(LocalDateTime.of(2026, 6, 18, 10, 0, 0));
    }

    @Test
    void toDTOMapsAssistantMessageAllFields() {
        MessageEntity entity = buildAssistantMessage();

        MessageDTO dto = mapper.toDTO(entity);

        assertThat(dto.getId()).isEqualTo(20L);
        assertThat(dto.getConversationId()).isEqualTo(1L);
        assertThat(dto.getRole()).isEqualTo(MessageRole.ASSISTANT);
        assertThat(dto.getContent()).isEqualTo("Hello there!");
        assertThat(dto.getLlmModelId()).isEqualTo(5L);
        assertThat(dto.getInputTokens()).isEqualTo(50);
        assertThat(dto.getOutputTokens()).isEqualTo(100);
    }

    @Test
    void toDTOMapsNullLlmModelToNullLlmModelId() {
        MessageEntity entity = buildUserMessage();

        MessageDTO dto = mapper.toDTO(entity);

        assertThat(dto.getLlmModelId()).isNull();
    }

    @Test
    void toDTOReturnsNullForNullEntity() {
        assertThat(mapper.toDTO(null)).isNull();
    }
}
```

#### Edge Cases

1. **`ConversationEntity.setId(Long)` availability:** `ConversationEntity` uses `@Getter @Setter` from Lombok — `setId(Long id)` is available. Same for `LlmModelEntity`.
2. **Plain POJOs, no Hibernate proxies:** The unit test sets IDs directly on plain POJO instances. This is valid for unit tests. The Hibernate proxy safety in production is verified in `MessageMapperIntegrationTest` (Step 8).
3. **`@ExtendWith(MockitoExtension.class)` with no mocks:** `MessageMapper` has no injected dependencies. The `@ExtendWith` is kept for consistency with the existing mapper test convention.

---

### Step 7: Create `MessageDTO` and `MessageMapper` (Steps 1.3 and 1.4) → GREEN

**Goal:** Create `MessageDTO` and `MessageMapper` so that `MessageMapperTest` compiles and all mapper tests pass.

**Dependencies:** `MessageRole` must exist (Step 2). `MessageEntity` must exist (Step 3).

- [ ] Create `MessageDTO.java`
- [ ] Create `MessageMapper.java`
- [ ] From `backend/`: run `./mvnw test -Dtest=MessageMapperTest`
- [ ] Confirm 4 tests pass, 0 failures

#### Implementation — `MessageDTO.java`

```java
package com.agentForgeBackend.models.message;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class MessageDTO {
    private Long id;
    private Long conversationId;
    private MessageRole role;
    private String content;
    private Long llmModelId;      // nullable — null for USER messages
    private Integer inputTokens;  // nullable — null for USER messages
    private Integer outputTokens; // nullable — null for USER messages
    private LocalDateTime createdAt;
}
```

**Why `@Data @AllArgsConstructor @NoArgsConstructor` (not `@Builder`):** The feature document specifies this combination for `MessageDTO`. `@Data` generates getters, setters, `equals`, `hashCode`, and `toString`. `@AllArgsConstructor` is needed for test construction. `@Builder` is not specified for `MessageDTO` — the mapper uses setter-based construction via the no-arg constructor.

#### Implementation — `MessageMapper.java`

```java
package com.agentForgeBackend.models.message;

import org.springframework.stereotype.Component;

@Component
public class MessageMapper {

    public MessageDTO toDTO(MessageEntity entity) {
        if (entity == null) return null;
        MessageDTO dto = new MessageDTO();
        dto.setId(entity.getId());
        // getId() on a Hibernate lazy proxy does not trigger initialization —
        // the FK identifier is stored in the proxy at construction time (Hibernate ORM contract)
        dto.setConversationId(entity.getConversation().getId());
        dto.setRole(entity.getRole());
        dto.setContent(entity.getContent());
        // llmModel is nullable — null for USER messages
        dto.setLlmModelId(entity.getLlmModel() != null ? entity.getLlmModel().getId() : null);
        dto.setInputTokens(entity.getInputTokens());
        dto.setOutputTokens(entity.getOutputTokens());
        dto.setCreatedAt(entity.getCreatedAt());
        return dto;
    }
}
```

#### Edge Cases

1. **`entity.getLlmModel() != null` guard before `getId()`:** When `llm_model_id` is NULL in the DB, Hibernate returns `null` for the lazy association (not an uninitialized proxy). Calling `.getId()` on null would throw `NullPointerException`. The null-check is the correct guard.
2. **`entity.getConversation().getId()` is proxy-safe:** `conversation_id` is always non-null (the column is `nullable = false`). Hibernate creates a proxy for the FK; `getId()` reads the identifier from the proxy without triggering a DB load. Verified by `MessageMapperIntegrationTest`.
3. **No `toSmallDTO`, `toListDTO`, `toEntity`:** These methods are not needed in this feature. Forcing their implementation would violate ISP. The future OpenRouter Chat Integration adds write methods directly to `MessageService`, not to `MessageMapper`.

---

### Step 8: Create `MessageMapperIntegrationTest` (Hibernate Proxy Regression)

**Goal:** Add a `@DataJpaTest` test that verifies `MessageMapper.toDTO()` succeeds when `conversation` and `llmModel` are Hibernate lazy proxies, and when `llmModel` is null.

**Dependencies:** `MessageMapper`, `MessageEntity`, `MessageRepository` must all exist (Steps 3, 4, 7).

- [ ] Create `MessageMapperIntegrationTest.java` in `backend/src/test/java/com/agentForgeBackend/models/message/`
- [ ] From `backend/`: run `./mvnw test -Dtest=MessageMapperIntegrationTest`
- [ ] Confirm 2 tests pass, 0 failures

**Why this step is critical:** The unit test (`MessageMapperTest`) uses plain POJOs — `entity.getConversation()` is a plain `new ConversationEntity()` with `setId()`. The integration test provides machine-verifiable evidence that `entity.getConversation().getId()` does not throw `LazyInitializationException` on a real Hibernate proxy after the session is closed.

#### Implementation

```java
package com.agentForgeBackend.models.message;

import com.agentForgeBackend.models.conversation.ConversationEntity;
import com.agentForgeBackend.models.hq.employee.EmployeeEntity;
import com.agentForgeBackend.models.llm.LlmModelEntity;
import com.agentForgeBackend.shared.models.baseUser.UserRoles;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

// <!-- REVIEW-FIX: removed unused ConversationRepository import — the test seeds conversations
// via TestEntityManager.persistFlushFind and never directly uses ConversationRepository -->
@DataJpaTest
@ActiveProfiles("test")
@Tag("repository")
class MessageMapperIntegrationTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private MessageRepository messageRepository;

    private ConversationEntity conversation;
    private LlmModelEntity model;

    @BeforeEach
    void setUp() {
        entityManager.clear();

        EmployeeEntity employee = entityManager.persistFlushFind(new EmployeeEntity(
                "Mapper", "Integration", "mapper-msg-int@test.com",
                Set.of(UserRoles.EMPLOYEE), "mapper-msg-int-test", "password"));

        model = new LlmModelEntity();
        model.setModelId("proxy/msg-mapper-model");
        model.setName("Proxy Msg Mapper Model");
        model.setIsEnabled(true);
        model = entityManager.persistFlushFind(model);

        conversation = new ConversationEntity();
        conversation.setTitle("Mapper Integration Chat");
        conversation.setEmployee(employee);
        conversation.setCurrentModel(model);
        conversation = entityManager.persistFlushFind(conversation);
    }

    @Test
    void toDTOSucceedsOnHibernateProxiesForUserMessage() {
        // Verifies that conversation.getId() on a lazy proxy does NOT throw
        // LazyInitializationException. Hibernate stores FK identifiers inside proxies
        // at construction time (Hibernate ORM contract).
        MessageMapper mapper = new MessageMapper();
        MessageEntity msg = new MessageEntity();
        msg.setConversation(conversation);
        msg.setRole(MessageRole.USER);
        msg.setContent("Proxy test user message");
        msg = entityManager.persistAndFlush(msg);
        entityManager.clear();

        MessageEntity loaded = messageRepository.findById(msg.getId()).orElseThrow();

        assertThatCode(() -> mapper.toDTO(loaded)).doesNotThrowAnyException();
        MessageDTO dto = mapper.toDTO(loaded);
        assertThat(dto.getConversationId()).isEqualTo(conversation.getId());
        assertThat(dto.getLlmModelId()).isNull();
    }

    @Test
    void toDTOSucceedsOnHibernateProxiesForAssistantMessage() {
        MessageMapper mapper = new MessageMapper();
        MessageEntity msg = new MessageEntity();
        msg.setConversation(conversation);
        msg.setRole(MessageRole.ASSISTANT);
        msg.setContent("Proxy test assistant response");
        msg.setLlmModel(model);
        msg.setInputTokens(10);
        msg.setOutputTokens(20);
        msg = entityManager.persistAndFlush(msg);
        entityManager.clear();

        MessageEntity loaded = messageRepository.findById(msg.getId()).orElseThrow();

        assertThatCode(() -> mapper.toDTO(loaded)).doesNotThrowAnyException();
        MessageDTO dto = mapper.toDTO(loaded);
        assertThat(dto.getConversationId()).isEqualTo(conversation.getId());
        assertThat(dto.getLlmModelId()).isEqualTo(model.getId());
    }
}
```

#### Edge Cases

1. **Separate class from `MessageRepositoryTest`:** `MessageMapper` does not exist until Step 7. If referenced in `MessageRepositoryTest`, all 5 repository tests would fail to compile during Steps 1–5. A separate class isolates the dependency — same rationale as `ConversationMapperIntegrationTest`.
2. **`entityManager.clear()` between persist and load:** After `persistAndFlush(msg)`, the entity is in the first-level cache. `entityManager.clear()` evicts it. `messageRepository.findById(msg.getId())` then loads a fresh entity whose `conversation` and `llmModel` associations are uninitiated Hibernate proxies.
3. **No `ConversationRepository` import:** The integration test seeds all entities via `TestEntityManager.persistFlushFind`. `ConversationRepository` is not needed; importing it without use would cause a compiler warning.

---

### Step 9: Compile to Generate `QMessageEntity` (Step 1.6)

**Goal:** Run the full Maven compile to trigger QueryDSL APT and generate `QMessageEntity.java`. Verify all FK imports resolve cleanly.

**Dependencies:** `MessageEntity` must exist (Step 3).

- [ ] From `backend/`: run `./mvnw compile`
- [ ] Confirm 0 compilation errors
- [ ] Confirm `QMessageEntity.java` was generated in `backend/target/generated-sources/annotations/com/agentForgeBackend/models/message/`

**Why this step is critical:** This is the FK resolution verification gate. If `ConversationEntity`, `LlmModelEntity`, or `MessageRole` cannot be resolved by the Java compiler, the build fails here — before any tests run. The compile step also confirms that the `@OnDelete`, `@Lob`, and `@Enumerated` annotations are correctly imported.

#### Edge Cases

1. **`./mvnw compile` must be run from `backend/`:** There is no `mvnw` at the project root. This is a known constraint documented in `known-issues.md`.
2. **`QMessageEntity` is generated but not used:** `MessageRepository` extends `JpaRepository` directly, not `DefaultRepository`. No QueryDSL predicates reference `QMessageEntity` in this feature. The Q-class is still generated because `querydsl-apt` processes all `@Entity` classes. It will be available for future use if the analytics dashboard feature needs QueryDSL predicates on the message table.
3. **Stale Q-classes:** If `MessageEntity` fields are changed after this step, a recompile is required before new field paths are available in QueryDSL expressions.

---

### Step 10: Run Full Test Suite (Regression Check)

**Goal:** Confirm Task 1 changes introduce no regressions across the full test suite.

**Dependencies:** All steps 1–9 complete.

- [ ] From `backend/`: run `./mvnw test`
- [ ] Confirm `MessageRepositoryTest` passes with 5 tests
- [ ] Confirm `MessageMapperTest` passes with 4 tests
- [ ] Confirm `MessageMapperIntegrationTest` passes with 2 tests
- [ ] Confirm all previously passing test classes still pass (0 new failures; target count ≥ 873 + 11 = 884 total tests)
- [ ] Note: the pre-existing `authServerApplicationTests.contextLoads` Docker error is expected if Docker Compose is not running — not caused by this task

**Why this step is critical:** A new `@Entity` class causes Hibernate to generate the `message` table DDL on test startup. Incorrect FK references, annotation errors, or missing imports will cause `ApplicationContext` load failures that surface as failures in ALL Spring-context-based tests. Confirming the full suite passes is the only way to detect this class of error.

---

## Design Decisions

**Decision 1: `MessageRepository` extends `JpaRepository<MessageEntity, Long>` directly, not `DefaultRepository`**
- **Why:** `DefaultRepository` extends `JpaRepository + QuerydslPredicateExecutor`. `QuerydslPredicateExecutor` is needed only when dynamic predicate construction (filtering, sorting) is required. The only message query in this feature — `findByConversationIdOrderByCreatedAtAsc` — is a static derived query with one equality condition and one ORDER BY. Spring Data JPA resolves it natively without QueryDSL. Using `JpaRepository` directly eliminates the QueryDSL dependency at the repository level and keeps the interface contract minimal.
- **Alternatives considered:** (1) `DefaultRepository` — rejected; adds QueryDSL compile dependency and `QMessageEntity` usage where not needed; accidental complexity. (2) Custom `@Query` annotation — rejected; derived query is cleaner and more maintainable for a simple single-condition query.

**Decision 2: `MessageMapper` does NOT implement `DefaultMapper`**
- **Why:** `DefaultMapper` requires four methods: `toDTO`, `toSmallDTO`, `toListDTO`, `toEntity`. `MessageMapper` needs only `toDTO` in this feature. Implementing `DefaultMapper` would force `toSmallDTO`, `toListDTO`, and `toEntity` to exist — either as stubs returning null/throwing exceptions, or as premature implementations for operations not yet defined. This violates ISP (interface segregation) and introduces dead code. `@Component` with a single public method is the correct surface.
- **Alternatives considered:** (1) Implement `DefaultMapper` with null-returning stubs for unused methods — rejected; stubs are ISP violations and create false impressions that these methods are available. (2) Create a `MessageMapper` interface extending a narrower `ReadMapper<DTO, ENTITY>` — rejected; over-engineering for a single-class implementation; inconsistent with the existing codebase which does not have this pattern.

**Decision 3: `@OnDelete(action = OnDeleteAction.CASCADE)` on `conversation` FK — DDL-level cascade**
- **Why:** When a Conversation is deleted, all its Messages must be removed. DDL-level `ON DELETE CASCADE` handles this at the database layer without JPA cascade configuration. `JpaCascadeType.REMOVE` would require a bidirectional `@OneToMany` association on `ConversationEntity` pointing back to `MessageEntity` — introducing unnecessary bidirectional coupling. `@OnDelete(CASCADE)` keeps the relationship unidirectional (MessageEntity → ConversationEntity) while ensuring referential integrity.
- **Alternatives considered:** (1) `JPA CascadeType.REMOVE` — rejected; requires bidirectional association which adds coupling to `ConversationEntity`; also requires Hibernate to load and individually delete each Message row rather than a single DB-level cascade. (2) Application-level cleanup (delete messages before deleting conversation in service) — rejected; creates invisible coupling between `ConversationService` and `MessageRepository`; future services that delete conversations must know to clean up messages.

**Decision 4: `MessageEntity` is immutable — no `@PreUpdate`, no `updatedAt`**
- **Why:** The message table is an append-only audit log of conversation turns. Allowing updates would undermine the auditability guarantee and create ambiguity about which version of a message was sent to the LLM. The absence of `@PreUpdate` is intentional and must be preserved.
- **Alternatives considered:** Adding `updatedAt` for future admin moderation features — rejected; moderation belongs in a separate audit table or a `status` field, not in a mutable message body. Out of scope.

**Decision 5: `content` stored as `@Lob @Column(columnDefinition = "TEXT")`**
- **Why:** LLM responses can be long (thousands of tokens, potentially 10k+ characters). VARCHAR columns have a default limit (typically 255 chars in many ORM configurations). `@Lob` with `columnDefinition = "TEXT"` maps to PostgreSQL's `TEXT` type (unlimited length) and H2's `CLOB`-compatible type. Same pattern as `AgentEntity.initPrompt`.
- **Alternatives considered:** `@Column(length = 65535)` — rejected; arbitrary limit that might truncate very long responses; requires knowledge of the maximum response length upfront.

---

## Testing Considerations

### Automatic Validation

- [x] From `backend/`: run `./mvnw test -Dtest=MessageRepositoryTest` after Steps 2–5 — confirm **5 tests pass**, 0 failures
- [x] From `backend/`: run `./mvnw test -Dtest=MessageMapperTest` after Steps 6–7 — confirm **4 tests pass**, 0 failures
- [x] From `backend/`: run `./mvnw test -Dtest=MessageMapperIntegrationTest` after Step 8 — confirm **2 tests pass**, 0 failures
- [x] From `backend/`: run `./mvnw compile` after Step 3 — confirm **0 compilation errors** and `QMessageEntity.java` appears in `backend/target/generated-sources/annotations/com/agentForgeBackend/models/message/`
- [x] From `backend/`: run `./mvnw test` after Step 9 — confirm **0 new failures** (pre-existing `authServerApplicationTests.contextLoads` Docker error is expected)

### Manual Validation

*(No HTTP endpoints are created in this task — no manual HTTP validation is required. HTTP endpoint testing begins in Task 2 once `MessageController` exists.)*

*(Optional — H2 schema inspection)* If `onDeleteCascadeRemovesMessagesWhenConversationDeleted` fails, add `spring.jpa.show-sql=true` to `application-test.properties`, re-run the test, and inspect the `CREATE TABLE message` DDL output. Look for `FOREIGN KEY (conversation_id) REFERENCES conversation(id) ON DELETE CASCADE`. If absent, `@OnDelete(action = OnDeleteAction.CASCADE)` was not applied correctly. Verify the import is `org.hibernate.annotations.OnDelete`, not any Jakarta Persistence import.

---

## Related Code Explanations

- `backend/src/main/java/com/agentForgeBackend/models/agent/AgentEntity.java` — `@Lob @Column(columnDefinition = "TEXT", nullable = false)` pattern for prompt fields; canonical prior art for TEXT column mapping
- `backend/src/main/java/com/agentForgeBackend/models/conversation/ConversationEntity.java` — `@OnDelete` annotation import pattern (`org.hibernate.annotations`), LAZY FK structure, `@PrePersist`/`@PreUpdate` lifecycle hooks; the `@OnDelete(SET_NULL)` pattern used there vs `@OnDelete(CASCADE)` here
- `backend/src/main/java/com/agentForgeBackend/models/conversation/ConversationMapper.java` — null-safe `entity.getAgent() != null ? entity.getAgent().getId() : null` pattern; Hibernate proxy `getId()` comment; same safety contract applies to `MessageMapper.llmModel`
- `backend/src/main/java/com/agentForgeBackend/models/conversation/ConversationRepository.java` — used in `MessageRepositoryTest` to verify cascade; also the contrast case (extends `DefaultRepository` with QueryDSL vs `MessageRepository` that does not)
- `backend/src/test/java/com/agentForgeBackend/models/conversation/ConversationRepositoryTest.java` — canonical template: `@DataJpaTest`, `TestEntityManager`, `@BeforeEach` seed pattern, `EmployeeEntity` parameterized constructor, `@OnDelete` cascade test pattern

---

## Completion Criteria

- [x] Parent document reviewed and Task 1 scope reflected accurately
- [x] All skills reviewed and selected
- [x] Hibernate `@OnDelete(action = OnDeleteAction.CASCADE)` verified for Spring Boot 3.4.1 / Hibernate 6.x — generates `ON DELETE CASCADE` DDL on FK constraint
- [x] Spring Data JPA `findByConversationIdOrderByCreatedAtAsc` derived query naming verified
- [x] `backend/src/main/java/com/agentForgeBackend/models/message/` directory created
- [x] `MessageRole.java` created — `USER` and `ASSISTANT` values only; no `SYSTEM`
- [x] `MessageEntity.java` created — `id` (Long, `@GeneratedValue(IDENTITY)`), `conversation` (non-null LAZY FK + `@OnDelete(CASCADE)`), `role` (`@Enumerated(STRING)`), `content` (`@Lob TEXT` non-null), `llmModel` (nullable LAZY FK), `inputTokens` (Integer nullable), `outputTokens` (Integer nullable), `createdAt` (non-null, `updatable = false`), `@PrePersist` only, table index `idx_message_conversation`
- [x] `MessageDTO.java` created — 8 fields; `@Data @AllArgsConstructor @NoArgsConstructor`; nullable `llmModelId`, `inputTokens`, `outputTokens`
- [x] `MessageMapper.java` created — `@Component`; single `toDTO(MessageEntity)` method; null-safe `llmModelId`; Hibernate proxy `getId()` comment on `conversationId`; does NOT implement `DefaultMapper`
- [x] `MessageRepository.java` created — extends `JpaRepository<MessageEntity, Long>` (NOT `DefaultRepository`); `findByConversationIdOrderByCreatedAtAsc(Long conversationId)`
- [x] `MessageRepositoryTest.java` created — 5 tests: `persistUserMessageWithNullLlmModelSucceeds`, `persistAssistantMessageWithAllFieldsSucceeds`, `prePersistSetsCreatedAt`, `findByConversationIdOrderByCreatedAtAscReturnsMessagesInOrder`, `onDeleteCascadeRemovesMessagesWhenConversationDeleted`
- [x] `MessageMapperTest.java` created — 4 tests: `toDTOMapsUserMessageAllFields`, `toDTOMapsAssistantMessageAllFields`, `toDTOMapsNullLlmModelToNullLlmModelId`, `toDTOReturnsNullForNullEntity`
- [x] `MessageMapperIntegrationTest.java` created — 2 tests: Hibernate proxy safety for USER message (null llmModel) and ASSISTANT message (non-null llmModel)
- [x] `./mvnw test -Dtest=MessageRepositoryTest` passes with **5 tests**, 0 failures
- [x] `./mvnw test -Dtest=MessageMapperTest` passes with **4 tests**, 0 failures
- [x] `./mvnw test -Dtest=MessageMapperIntegrationTest` passes with **2 tests**, 0 failures
- [x] `./mvnw compile` (from `backend/`) generates `QMessageEntity.java` in `target/generated-sources/annotations/com/agentForgeBackend/models/message/` with 0 compilation errors
- [x] `./mvnw test` (full suite) passes with **0 new failures** — 895 tests, 0 failures, 1 pre-existing Docker error (`authServerApplicationTests.contextLoads`)
- [x] Task 2 prerequisite confirmed: `MessageRepository`, `MessageMapper`, `ConversationRepository.findByIdAndEmployeeId` all exist and tested — `MessageService` can build on top of them
