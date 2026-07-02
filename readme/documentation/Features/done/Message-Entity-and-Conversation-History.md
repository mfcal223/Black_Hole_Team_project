#high #new-feature #backend

## Feature: Message Entity and Conversation History

### Description

Add a `MessageEntity` to the AgentForge backend. A Message represents one turn in a conversation — either a user input or an LLM response. This entity is the write target for the future OpenRouter chat flow and the source of truth for token usage analytics.

This feature covers the **persistence slice only**: entity, role enum, DTOs, mapper, repository, service, and a read-only history endpoint (`GET /conversation/{id}/messages`). It also resolves the deferred `@OnDelete(CASCADE)` FK constraint noted in the Conversation feature: when a Conversation is deleted, all its Messages must be cascade-deleted at the database level.

The actual message-sending flow (saving USER messages, calling `OpenRouterService`, saving ASSISTANT messages) is explicitly **out of scope** and belongs in a follow-up feature ("OpenRouter Chat Integration").

Design decisions confirmed during feature creation:
- Primary key is `Long` with auto-increment — see [[ADRs/ADR-009-long-primary-key-for-all-entities]].
- Package lives at `models/message/` — a top-level peer of `models/conversation/`, `models/agent/`, and `models/llm/`.
- Single `MessageEntity` with `MessageRole` enum (`USER`, `ASSISTANT`) — no subtype split — see [[ADRs/ADR-003-single-message-entity-with-role-enum]].
- `MessageEntity` is the sole source of truth for token analytics — see [[ADRs/ADR-004-message-table-as-token-usage-source]].
- Agent system prompts are NOT persisted as messages — see [[ADRs/ADR-008-agent-prompts-not-persisted-as-messages]].
- `MessageEntity` is immutable (write-once). No `updatedAt` field. No individual delete or update endpoint.
- `conversation` FK declared with `@OnDelete(action = OnDeleteAction.CASCADE)` — resolves the deferred constraint from [[Features/done/Conversation-Entity-and-Employee-Crud]].
- History endpoint is `GET /conversation/{id}/messages`, a sub-resource under the existing `/conversation/**` security rule. No new security config needed.
- History returns all messages for the conversation ordered by `createdAt ASC`, no pagination.
- `MessageService` is a plain `@Service` (does **not** extend `DefaultServiceImplements`) — there is no standard CRUD surface to inherit.
- Ownership enforcement: `MessageService.getHistory()` verifies that the conversation belongs to the current employee before returning messages.

---

## Problem Statement

The Conversation entity exists and employees can manage their conversation list, but there is no way to store or retrieve the content of those conversations. Without `MessageEntity`, the chat history cannot be persisted or displayed, the OpenRouter chat flow has no write target, and the admin's token usage dashboard has no source data. Additionally, deleting a Conversation currently leaves orphaned message rows behind (a deferred FK constraint from the Conversation feature). This feature completes the persistence foundation so the chat flow can be wired in the next feature.

---

## User Stories

1. As an Employee, I want to retrieve the full message history for one of my conversations, so that I can see every turn of the chat in chronological order.
2. As an Employee, I want the history to be ordered oldest-first, so that the conversation reads naturally from top to bottom in the UI.
3. As an Employee, I want the history response to include the role of each message (`USER` or `ASSISTANT`), so that the frontend can render them on the correct side of the chat interface.
4. As an Employee, I want the history response to include the model used for each ASSISTANT message, so that I can see which model generated a particular response.
5. As an Employee, I want the system to reject history requests for conversations that do not belong to me, so that I cannot read another employee's private conversation.
6. As an Employee, I want the system to return a 404 when I request history for a non-existent conversation, so that I receive a clear error rather than an empty list.
7. As a backend maintainer, I want `GET /conversation/{id}/messages` to be gated by `ROLE_EMPLOYEE` without additional security configuration, so that the existing `/conversation/**` HTTP security rule covers the sub-resource automatically.
8. As a backend maintainer, I want ownership enforcement at the service layer (not just HTTP layer), so that the security boundary is testable through the service interface.
9. As a backend maintainer, I want `MessageEntity.conversation` FK to declare `@OnDelete(action = OnDeleteAction.CASCADE)` at the database level, so that deleting a Conversation automatically removes all its Messages without FK violations.
10. As a backend maintainer, I want `MessageEntity` to use a `Long` primary key with auto-increment, consistent with all other entities.
11. As a backend maintainer, I want `MessageEntity` to be immutable (no `updatedAt`, no update endpoint), so that the message table is an append-only audit log of conversation turns.
12. As a backend maintainer, I want `llmModel`, `inputTokens`, and `outputTokens` to be nullable fields, so that USER messages (which have no LLM metadata) can be stored without dummy values.
13. As a backend maintainer, I want `content` to be stored as a `TEXT` column (`@Lob`), so that long LLM responses are not truncated by a varchar limit.
14. As an Admin, I want the token analytics dashboard query to work against the `message` table once `ASSISTANT` messages are populated, so that usage data is available without a separate analytics entity.
15. As a QA engineer, I want repository tests for `MessageEntity` persistence, FK cascade behavior, and the history finder method, so that the JPA mapping is verified.
16. As a QA engineer, I want service tests for ownership enforcement, conversation-not-found, and ordering, so that the business rules are verified at the service boundary.
17. As a QA engineer, I want controller tests for the HTTP contract including `401`/`403`/`404` and the JSON shape, so that the full API surface is verified.
18. As a future developer building the OpenRouter chat feature, I want `MessageRepository` and `MessageMapper` to already exist, so that the send-message flow only needs to add write operations on top of a tested persistence layer.
19. As a future frontend developer, I want the `GET /conversation/{id}/messages` endpoint to return a stable `List<MessageDTO>` shape, so that the chat history view can be built without waiting for the full send-message feature.

---

## Solution

Add a new `Message` slice under `backend/src/main/java/com/agentForgeBackend/models/message/`. The slice is intentionally narrower than other domain slices: no query profile, no pagination, and no DefaultServiceImplements inheritance. The only read operation is `getHistory(conversationId)`, which returns all messages for a conversation ordered by `createdAt ASC`.

### Scope

Impacted workflows and systems:
- New domain module: `models/message/` with entity, role enum, DTO, mapper, repository, service, and controller.
- Deferred FK constraint resolved: `MessageEntity.conversation` declares `@OnDelete(action = OnDeleteAction.CASCADE)`, which generates an `ON DELETE CASCADE` constraint in the `message` table DDL on first startup.
- New REST endpoint: `GET /conversation/{id}/messages` — covered by the existing `/conversation/**` → `hasRole("EMPLOYEE")` security rule. No `SecurityConfig` change needed.
- FK-safe delete order in affected test classes: keep `messageRepository.deleteAll()` first in global setup cleanup for isolation and forward compatibility. The DB cascade on `conversation_id` handles message deletion when conversations are deleted, but `llm_model_id` has no cascade — once ASSISTANT messages are written in the OpenRouter Chat Integration feature, tests that delete LLM models without first clearing messages can fail.

Out of scope for this feature:
- `POST /conversation/{id}/messages` (the send-message endpoint) — deferred to the OpenRouter Chat Integration feature.
- `OpenRouterService` — deferred to the OpenRouter Chat Integration feature.
- Individual message delete or update endpoints.
- `ConversationEntity.updatedAt` refresh on new message — deferred to the OpenRouter Chat Integration feature.
- Admin-facing analytics queries or dashboard endpoints.
- Frontend chat history screens.

### Affected Systems / Modules

- [[Memory/architecture|Architecture]] — New append-only entity with two outbound FKs (conversation non-null CASCADE, llmModel nullable).
- [[Memory/tech|Tech Stack]] — Uses Spring Boot 3.4.1, Spring Data JPA, JUnit 5, H2 test profile.
- [[ADRs/ADR-003-single-message-entity-with-role-enum]] — This feature implements that decision.
- [[ADRs/ADR-004-message-table-as-token-usage-source]] — This feature creates the table; analytics queries become possible once ASSISTANT messages are populated.
- [[ADRs/ADR-008-agent-prompts-not-persisted-as-messages]] — `MessageRole` enum contains only `USER` and `ASSISTANT`. No `SYSTEM` value.
- [[ADRs/ADR-009-long-primary-key-for-all-entities]] — PK type decision.
- [[Features/done/Conversation-Entity-and-Employee-Crud]] — The deferred `@OnDelete(CASCADE)` constraint on `message.conversation_id` is resolved here.
- `backend/src/main/java/com/agentForgeBackend/models/conversation/ConversationEntity.java` — FK parent for `MessageEntity.conversation`. Not modified; FK is declared on the Message side.
- `backend/src/main/java/com/agentForgeBackend/models/conversation/ConversationRepository.java` — Used by `MessageService` to verify conversation ownership before returning history.
- `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelEntity.java` — FK target for `MessageEntity.llmModel` (nullable, ASSISTANT messages only).
- `backend/src/main/java/com/agentForgeBackend/shared/tools/AuthUserUtil.java` — `getAuthUserEmployeeEntity()` provides the current employee for ownership checks.

### Impact Analysis

`MessageEntity` introduces two outbound FKs:
- `conversation_id` → `conversation` table (non-null, `ON DELETE CASCADE`): deleting a Conversation now cascades deletes to all its Messages at the database level. This resolves a dormant FK violation risk — any existing Conversation delete that had accumulated messages would have failed without this constraint.
- `llm_model_id` → `llm_model` table (nullable): no change to LlmModel domain. ADR-007 already prohibits hard-deleting enabled models, so this FK is stable.

The new `GET /conversation/{id}/messages` endpoint lands under the existing `/conversation/**` security rule. `SecurityAuthorizationTest` should be extended with a message history test row, but no new `requestMatchers` line is needed in `SecurityConfig`.

Test isolation: global setup cleanup should call `messageRepository.deleteAll()` before deleting conversations, agents, LLM models, or employees. This is not because conversation deletion bypasses cascade behavior — `conversation_id` uses `ON DELETE CASCADE` and Step 1.7 verifies it. The message-first cleanup is defensive isolation and forward compatibility for future ASSISTANT rows, because `message.llm_model_id` has no cascade and can block `llmModelRepository.deleteAll()`. The existing FK-safe delete order documented in `known-issues.md` is extended to: `messageRepository.deleteAll()` → `conversationRepository.deleteAll()` → `agentRepository.deleteAll()` → `llmModelRepository.deleteAll()` → `employeeRepository.deleteAll()`.

### Risk Assessment

- **`@OnDelete(CASCADE)` and `ddl-auto=update`:** `ddl-auto=update` does NOT alter existing FK constraints on tables that already exist. The `message` table is new, so Hibernate will generate the correct `ON DELETE CASCADE` constraint on first startup. If the table previously existed without this constraint (e.g., from a manual schema migration), it must be applied manually via SQL.
- **`MessageRepository` does not extend `DefaultRepository`:** It extends `JpaRepository<MessageEntity, Long>` directly. This means `QMessageEntity` is generated by the APT processor (it's generated for all `@Entity` classes) but is not used. No QueryDSL compile step is required for this feature.
- **History returns all messages:** For MVP scale, this is fine. If a conversation accumulates thousands of messages and performance degrades, the correct path is to add a cursor-based pagination parameter to the endpoint — not to change the entity or repository schema.
- **ADR-004 analytics indexes are deferred:** ADR-004 recommends analytics indexes on `message.role`, `message.created_at`, and `message.llm_model_id` when performance tuning becomes necessary. This feature creates only `idx_message_conversation`, which is sufficient for the current history query. The future admin analytics dashboard feature must choose the actual index shape from its query plan and account for the current `ddl-auto=update` / no-migration-tooling constraint with verified DDL or migration guidance.
- **`MessageService` injects `ConversationRepository` for ownership checks:** This is a cross-domain repository injection (the same pattern used by `ConversationService` injecting `AgentRepository` and `LlmModelRepository`). Ownership check is a read-only lookup — no writes cross domain boundaries.
- **FK-safe delete order:** Keep `messageRepository.deleteAll()` first in global test cleanup. Deleting Conversations should cascade-delete Messages through the `conversation_id` FK; the message-first rule exists for isolation and future ASSISTANT rows with non-null `llm_model_id`, which has no cascade and can block `llmModelRepository.deleteAll()` if messages remain. This is the same class of FK cleanup issue that affected 9 test classes during the Conversation feature (Task 3), but the causal FK is different.

---

## Implementation Architecture

### Changes Required

#### 1. `MessageRole` enum

**Purpose:** Discriminate USER and ASSISTANT messages without a separate entity per ADR-003.

**Package:** `backend/src/main/java/com/agentForgeBackend/models/message/`

**Changes:**

```java
public enum MessageRole {
    USER,
    ASSISTANT
}
```

No `SYSTEM` value — agent prompts are reconstructed at runtime and not persisted (ADR-008).

---

#### 2. `MessageEntity`

**Purpose:** Persist every individual turn in a conversation with its role, content, and (for ASSISTANT messages) the model and token counts used.

**Package:** `backend/src/main/java/com/agentForgeBackend/models/message/`

**Changes:**

- Annotate with `@Entity` and `@Table(name = "message")`.
- Does not extend `BaseUserEntity` — standalone domain entity.
- Fields:

| Field | Column | Type | Constraints |
|-------|--------|------|-------------|
| `id` | `id` | `Long` | `@Id`, `@GeneratedValue(IDENTITY)` |
| `conversation` | `conversation_id` | `ConversationEntity` | `@ManyToOne(fetch = LAZY)`, `@JoinColumn(name = "conversation_id", nullable = false)`, `@OnDelete(action = OnDeleteAction.CASCADE)` |
| `role` | `role` | `MessageRole` | `@Enumerated(EnumType.STRING)`, `@Column(nullable = false)` |
| `content` | `content` | `String` | `@Lob`, `@Column(columnDefinition = "TEXT", nullable = false)` |
| `llmModel` | `llm_model_id` | `LlmModelEntity` | `@ManyToOne(fetch = LAZY)`, `@JoinColumn(name = "llm_model_id", nullable = true)` |
| `inputTokens` | `input_tokens` | `Integer` | `nullable = true` — set only on ASSISTANT messages |
| `outputTokens` | `output_tokens` | `Integer` | `nullable = true` — set only on ASSISTANT messages |
| `createdAt` | `created_at` | `LocalDateTime` | `@Column(nullable = false, updatable = false)` |

- `@PrePersist` sets `createdAt` to `LocalDateTime.now()`.
- No `@PreUpdate` — `MessageEntity` is immutable.
- Use Lombok `@Getter`, `@Setter`, `@NoArgsConstructor`.
- Add `@Index(name = "idx_message_conversation", columnList = "conversation_id")` on the table — the history query filters exclusively on `conversation_id`.
- Do not add ADR-004 analytics indexes (`message.role`, `message.created_at`, `message.llm_model_id`) in this feature. Those indexes are deferred to the admin analytics dashboard feature, which owns the aggregate query shape and performance tuning.

**File:** `backend/src/main/java/com/agentForgeBackend/models/message/MessageEntity.java`

---

#### 3. `MessageDTO`

**Purpose:** Safe API output contract for message history responses.

**Package:** `backend/src/main/java/com/agentForgeBackend/models/message/`

**Changes:**

- Fields: `id` (Long), `conversationId` (Long), `role` (MessageRole), `content` (String), `llmModelId` (Long, nullable), `inputTokens` (Integer, nullable), `outputTokens` (Integer, nullable), `createdAt` (LocalDateTime).
- Use Lombok `@Data`, `@AllArgsConstructor`, `@NoArgsConstructor`.

**File:** `backend/src/main/java/com/agentForgeBackend/models/message/MessageDTO.java`

---

#### 4. `MessageMapper`

**Purpose:** Convert `MessageEntity` to `MessageDTO` without business logic.

**Package:** `backend/src/main/java/com/agentForgeBackend/models/message/`

**Changes:**

- Does **not** implement `DefaultMapper` — `MessageEntity` has no form input (write operations come from the future send-message flow) and no list/mini DTO variants needed in this feature.
- Single method: `toDTO(MessageEntity entity)` → `MessageDTO`.
- Null-safe for `llmModel`: `entity.getLlmModel() != null ? entity.getLlmModel().getId() : null`.
- `entity.getConversation().getId()` — uses Hibernate proxy `getId()` without triggering initialization (LAZY).
- Annotate with `@Component`.
- Forward-compatibility decision: `MessageMapper` is intentionally read-side in this feature. The future OpenRouter Chat Integration must persist USER and ASSISTANT rows through `MessageService` append-command methods (for example, `appendUserMessage(...)` and `appendAssistantMessage(...)`) rather than creating `MessageEntity` instances ad hoc in controllers, `OpenRouterService`, or duplicate mapper/factory classes. `MessageService` owns transaction boundaries, role/token invariants, association validation, and repository writes; `MessageMapper` remains focused on DTO output unless a later feature extracts a purely mechanical internal mapping helper.

**File:** `backend/src/main/java/com/agentForgeBackend/models/message/MessageMapper.java`

---

#### 5. `MessageRepository`

**Purpose:** Provide persistence and ordered history retrieval for `MessageEntity`.

**Package:** `backend/src/main/java/com/agentForgeBackend/models/message/`

**Changes:**

- Extend `JpaRepository<MessageEntity, Long>` directly — not `DefaultRepository`. No QueryDSL filtering is needed for messages.
- Add `List<MessageEntity> findByConversationIdOrderByCreatedAtAsc(Long conversationId)` — returns all messages for a conversation in send order.

**File:** `backend/src/main/java/com/agentForgeBackend/models/message/MessageRepository.java`

---

#### 6. `MessageService`

**Purpose:** Enforce ownership before returning history and provide a clean API for the future send-message flow to build on.

**Package:** `backend/src/main/java/com/agentForgeBackend/models/message/`

**Changes:**

- Plain `@Service` — does **not** extend `DefaultServiceImplements`.
- Inject `MessageRepository`, `MessageMapper`, `ConversationRepository`, and `AuthUserUtil`.
- Apply `@PreAuthorize("hasRole('EMPLOYEE')")` to all public methods.
- Apply `@Transactional(readOnly = true)` to `getHistory(Long conversationId)` only. Do not use a class-level read-only transaction because the future append-command methods will write USER and ASSISTANT rows.
- **`getHistory(Long conversationId)`:**
  - Load current employee via `AuthUserUtil.getAuthUserEmployeeEntity()`.
  - Verify conversation ownership: `conversationRepository.findByIdAndEmployeeId(conversationId, currentEmployee.getId())` — throw `ItemNotFoundException` if absent (404, prevents enumeration of other employees' conversations).
  - Load and return `messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId)` mapped to `List<MessageDTO>` via `MessageMapper`.
- Future OpenRouter Chat Integration should extend this service with append-command methods for USER and ASSISTANT message writes. Those commands are out of scope here, but they are the intended write seam for the `message` table.

**File:** `backend/src/main/java/com/agentForgeBackend/models/message/MessageService.java`

---

#### 7. `MessageController`

**Purpose:** Expose the conversation history endpoint.

**Package:** `backend/src/main/java/com/agentForgeBackend/models/message/`

**Changes:**

- Annotate with `@RestController` and `@RequestMapping("/conversation")`.
- Does **not** extend `DefaultController` — no standard CRUD surface.
- Inject `MessageService`.
- Add `@GetMapping("/{conversationId}/messages")` — delegates to `messageService.getHistory(conversationId)` and returns `ResponseEntity<List<MessageDTO>>` via `ResponseEntity.ok(messageService.getHistory(conversationId))`.

Note: The path `/conversation/{conversationId}/messages` is distinct from `ConversationController`'s paths. Spring MVC resolves the more specific path pattern correctly. Both controllers share the `/conversation` root, but message history requires the `/{id}/messages` suffix that `ConversationController` never declares.

**File:** `backend/src/main/java/com/agentForgeBackend/models/message/MessageController.java`

---

## Implementation Steps

### Phase 1: Domain foundation

- [x] **Step 1.1:** Create `MessageRole` enum with `USER` and `ASSISTANT` values.
- [x] **Step 1.2:** Create `MessageEntity` with all fields, `@ManyToOne` FKs (`conversation` non-null + `@OnDelete(CASCADE)`, `llmModel` nullable), `@Enumerated(EnumType.STRING)` for role, `@Lob` TEXT for content, `@PrePersist` timestamp lifecycle hook, and table index on `conversation_id`.
- [x] **Step 1.3:** Create `MessageDTO` with all fields.
- [x] **Step 1.4:** Create `MessageMapper` with `toDTO(MessageEntity)`, null-safe for `llmModel`.
- [x] **Step 1.5:** Create `MessageRepository` extending `JpaRepository<MessageEntity, Long>` with `findByConversationIdOrderByCreatedAtAsc`.
- [x] **Step 1.6:** Compile the backend (`./mvnw compile -pl backend`) to verify the entity and all FK relationships compile cleanly and `QMessageEntity` is generated by the APT processor.
- [x] **Step 1.7:** Create `MessageRepositoryTest` (`@DataJpaTest`) as the Phase 1 repository completion gate. Cover message persistence round-trip, `findByConversationIdOrderByCreatedAtAsc` ordering, nullable `llmModel` for USER messages, and `onDeleteCascadeRemovesMessagesWhenConversationDeleted` by inserting a `ConversationEntity` with two `MessageEntity` rows, deleting the parent Conversation, flushing/clearing, and asserting both Message rows are gone. Run `./mvnw test -pl backend -Dtest=MessageRepositoryTest`. If H2 does not honor the generated `ON DELETE CASCADE` constraint, document the limitation in `documentation/Memory/known-issues.md` and add a Docker PostgreSQL-backed cascade verification path for this case.

### Phase 2: Service and controller

- [x] **Step 2.1:** Create `MessageService` (plain `@Service`) with `getHistory(Long conversationId)` annotated with `@Transactional(readOnly = true)`: ownership check via `ConversationRepository.findByIdAndEmployeeId`, then `MessageRepository.findByConversationIdOrderByCreatedAtAsc`, mapped to `List<MessageDTO>`.
- [x] **Step 2.2:** Create `MessageController` at `@RequestMapping("/conversation")` with `@GetMapping("/{conversationId}/messages")` returning `ResponseEntity<List<MessageDTO>>` via `ResponseEntity.ok(messageService.getHistory(conversationId))`.
- [x] **Step 2.3:** Smoke-test with a real employee JWT: create a conversation, verify `GET /conversation/{id}/messages` returns an empty list (no messages yet), then verify a cross-employee request returns 404.

### Phase 3: Regression and supplemental coverage

- [x] **Step 3.1:** Patch any existing test class that participates in FK-safe setup cleanup to prepend `messageRepository.deleteAll()`. The DB cascade on `conversation_id` handles message deletion when conversations are deleted, but `llm_model_id` has no cascade — once ASSISTANT messages are written in the next feature, any test deleting LLM models without first clearing messages can fail. The full FK-safe delete order is now: `messageRepository.deleteAll()` → `conversationRepository.deleteAll()` → `agentRepository.deleteAll()` → `llmModelRepository.deleteAll()` → `employeeRepository.deleteAll()`.
- [x] **Step 3.2:** Add message history security tests to `SecurityAuthorizationTest`: anonymous `GET /conversation/1/messages` → 401; ROLE_ADMIN → 403; ROLE_EMPLOYEE with real JWT → 404 (no conversation yet, before controller exists: use forward ref stub).
- [x] **Step 3.3:** Run full `./mvnw test` to confirm no regressions in Conversation, Agent, Admin, Employee, LlmModel, AppSettings, or security tests.

---

## Potential Issues / Risks

- **`@OnDelete(CASCADE)` requires `ddl-auto=update` on a new table.** The `message` table is brand-new, so Hibernate generates the correct constraint on first startup. If the table already existed (e.g., from a prior partial migration), the `ON DELETE CASCADE` must be applied manually via `ALTER TABLE message ADD CONSTRAINT fk_message_conversation FOREIGN KEY (conversation_id) REFERENCES conversation(id) ON DELETE CASCADE`.
- **`MessageRepository` does not extend `DefaultRepository`.** Any future feature that needs QueryDSL filtering on the message table will need to either add `QuerydslPredicateExecutor<MessageEntity>` to `MessageRepository` or extend `DefaultRepository` at that point. Do not add it now speculatively.
- **`MessageController` at `/conversation` collides with `ConversationController` at `/conversation`.** Spring MVC supports multiple controllers with overlapping `@RequestMapping` prefixes, routing by the most specific path pattern. `GET /conversation/{conversationId}/messages` is more specific than any path `ConversationController` declares. Verify with a smoke test after wiring.
- **FK-safe delete order in test setUp.** Keep `messageRepository.deleteAll()` first in global cleanup. The `conversation_id` cascade handles message deletion when conversations are deleted; the defensive message-first rule is for isolation and future `llm_model_id` references from ASSISTANT messages, because that FK has no cascade. Patch all affected classes in Step 3.1 proactively.
- **`DefaultServiceImplements.update()` no-op is not a concern here.** `MessageService` does not extend `DefaultServiceImplements`, so the known no-op is irrelevant to this domain.
- **Token analytics queries require ASSISTANT messages to be populated.** The analytics dashboard described in ADR-004 cannot produce meaningful output until `ASSISTANT` messages with token counts are written by the future send-message flow. This feature creates the schema; the data comes from the OpenRouter Chat Integration feature.

---

## Testing Decisions

Good tests for this feature verify observable behavior through public interfaces. Tests must not assert on private methods, mapper field internals, or repository query internals beyond what is observable in the returned data.

Testing philosophy:
- Use TDD in vertical slices: one failing behavior test → minimal implementation → pass → repeat.
- Repository tests verify persistence, FK cascade, and the custom finder method.
- Mapper tests verify DTO field correctness and null-safety for `llmModel`.
- Service tests verify ownership enforcement and ordering through the service's public interface.
- Controller tests verify the HTTP contract: routes, status codes, and JSON shape.

**Modules to test:**

- **`MessageEntity` via `MessageRepositoryTest`** (`@DataJpaTest`): persist a message and verify all fields round-trip correctly; verify `findByConversationIdOrderByCreatedAtAsc` returns messages in insertion order; verify `@OnDelete(CASCADE)` — delete the parent Conversation and assert the message row is also gone (verifies H2 honors the constraint). Verify FK to `LlmModelEntity` is nullable (USER message persists without `llmModel`).
- **`MessageMapper`** (plain unit test, no Spring context): `toDTO` maps all fields correctly; null `llmModel` maps to null `llmModelId`; Hibernate proxy `getId()` does not trigger lazy initialization (use `entityManager.getReference()` in an integration variant if needed).
- **`MessageService` via `MessageServiceIntegrationTest`** (`@SpringBootTest`, `@ActiveProfiles("test")`): ownership returns `ItemNotFoundException` for cross-employee conversation; own conversation with no messages returns empty list; messages returned in `createdAt ASC` order; non-existent conversation returns `ItemNotFoundException`.
- **`MessageController` via `MessageControllerTest`** (`@SpringBootTest` + MockMvc): anonymous `GET /conversation/{id}/messages` → 401; ROLE_ADMIN JWT → 403; ROLE_EMPLOYEE cross-conversation → 404; ROLE_EMPLOYEE own conversation → 200 with correct JSON shape; `List` body when conversation has no messages → 200 with empty array.

**Prior art:**
- `backend/src/test/java/com/agentForgeBackend/models/conversation/ConversationRepositoryTest.java`
- `backend/src/test/java/com/agentForgeBackend/models/conversation/ConversationServiceIntegrationTest.java` (new name pattern, wraps service logic)
- `backend/src/test/java/com/agentForgeBackend/models/conversation/ConversationControllerTest.java`
- `backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java`
- `backend/src/test/java/com/agentForgeBackend/testUtils/TestAuthenticationHelper.java`

---

## Task Breakdown

### Task 1: Domain Foundation

- **Steps Covered:** Step 1.1, Step 1.2, Step 1.3, Step 1.4, Step 1.5, Step 1.6, Step 1.7
- **Reason for Grouping:** `MessageRole`, `MessageEntity`, `MessageDTO`, `MessageMapper`, and `MessageRepository` define the full domain shape and can be created together before any service behavior is wired. The compile step verifies FK resolution and APT generation.
- **Task File:** `Message-Entity-and-Conversation-History-step-1-domain-foundation.md`
- **Task Document:** [[Tasks/current/Message-Entity-and-Conversation-History-step-1-domain-foundation]]

### Task 2: Service and Controller

- **Steps Covered:** Step 2.1, Step 2.2, Step 2.3
- **Reason for Grouping:** Service ownership logic and the controller endpoint are tightly coupled around the single `getHistory` operation; implementing and smoke-testing them together is efficient.
- **Task File:** `Message-Entity-and-Conversation-History-step-2-service-and-controller.md`
- **Task Document:** [[Tasks/current/Message-Entity-and-Conversation-History-step-2-service-and-controller]]

### Task 3: Regression and Supplemental Coverage

- **Steps Covered:** Step 3.1, Step 3.2, Step 3.3
- **Reason for Grouping:** FK-safe delete order patches, security test coverage, and full regression run are all verification-focused and depend on the previous two tasks being complete.
- **Task File:** `Message-Entity-and-Conversation-History-step-3-regression-and-cleanup.md`
- **Task Document:** [[Tasks/current/Message-Entity-and-Conversation-History-step-3-regression-and-cleanup]]
