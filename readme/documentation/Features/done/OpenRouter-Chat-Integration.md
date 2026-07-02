#high #integration

## Feature: OpenRouter Chat Integration

### Description

Wire the AgentForge backend to OpenRouter so employees can send messages and receive LLM responses streamed in real time over WebSocket. This feature introduces `OpenRouterService` (the HTTP adapter to OpenRouter), the WebSocket infrastructure for the chat flow, write seams on `MessageService` for USER and ASSISTANT messages, agent prompt injection at request time, and an admin endpoint to browse the OpenRouter model catalog. Image input and output are explicitly deferred.

Design decisions confirmed during feature creation:
- WebSocket is used for both sending and receiving — one bidirectional connection per conversation at `/ws/chat/{conversationId}`.
- JWT is passed as a `?token=<jwt>` query parameter during the WebSocket handshake (browser WebSocket clients cannot set `Authorization` headers). `JwtHandshakeInterceptor` validates the token and stores an `Authentication` object in session attributes; `ChatWebSocketHandler` sets the `SecurityContext` from session before calling service methods.
- `/ws/**` is `permitAll` in `SecurityConfig` because auth is enforced by the interceptor, not the HTTP filter chain.
- On any error during streaming: send `{type:"error", message:"..."}` frame then close the WebSocket connection.
- On stream failure: the USER message is retained (no compensating delete). An unanswered USER message is an accurate record that the employee attempted to send something.
- `conversation.updatedAt` is refreshed only when the ASSISTANT message is saved — a completed turn, not an attempt.
- Agent prompts are reconstructed at runtime per [[ADRs/ADR-008-agent-prompts-not-persisted-as-messages]]: `initPrompt` prepended as `{role:"system"}` on the first turn only; `recurrentPrompt` prepended to every USER message content before sending to OpenRouter. Neither is persisted as a `MessageEntity`.
- Models must be validated against `LlmModelEntity` before forwarding to OpenRouter per [[ADRs/ADR-007-admin-curated-llm-model-list]].
- `appendAssistantMessage()` has no `@PreAuthorize` — it is an internal-only method called exclusively by `ChatTurnService`, which enforces authentication via `AuthUserUtil` inside `@Transactional`. This is documented here to prevent a future developer from incorrectly adding an admin-level annotation.
- `ChatTurnService.processTurn()` uses `@Transactional(noRollbackFor = {OpenRouterConfigException.class, OpenRouterApiException.class})` — USER messages survive OpenRouter failures (user story #9). DB-level failures still trigger rollback, which is correct for unrecoverable system errors.

---

## Problem Statement

Employees can create conversations and view empty history, but cannot send messages or receive LLM responses. The chat interface is non-functional: the backend has no connection to OpenRouter, no mechanism to stream responses to the frontend, and no write path for messages. Every conversation started by an employee is permanently empty.

---

## User Stories

1. As an Employee, I want to send a message in a conversation and receive a real-time streamed response from the LLM, so that the chat feels responsive instead of showing a blank screen while waiting.
2. As an Employee, I want each response to appear word-by-word as it streams in, so that I can start reading the answer before it is fully generated.
3. As an Employee, I want to send a message in a general conversation (no agent) and have it go directly to the selected LLM model, so that I can have a free-form chat session.
4. As an Employee, I want to send a message in an agent conversation and have the agent's system prompt injected automatically, so that the LLM behaves according to the agent's configuration without me needing to repeat instructions.
5. As an Employee, I want the agent's `initPrompt` to be injected only on the first message in a conversation, so that the LLM has an initial context without receiving a redundant system message on every subsequent turn.
6. As an Employee, I want the agent's `recurrentPrompt` to be prepended to every message I send, so that the agent's behavioral guardrails are enforced throughout the conversation.
7. As an Employee, I want the system to always use the `currentModel` of my conversation when sending a message to OpenRouter, so that my model selection is respected per conversation.
8. As an Employee, I want a clear error message if the LLM call fails (bad API key, model unavailable, network error), so that I know the message did not go through and I can retry.
9. As an Employee, I want my message to be saved even if the LLM call fails, so that I have a record of what I tried to send.
10. As an Employee, I want the conversation to appear at the top of my conversation list after a successful exchange, so that my most recently active chats are easy to find.
11. As an Employee, I want the message history to include my sent messages and all LLM responses after the chat, so that I can review the full conversation when I return.
12. As an Employee, I want each ASSISTANT message in the history to show which model generated it, so that I can see which model was used for each response.
13. As an Admin, I want to browse the full catalog of models available on OpenRouter, so that I can decide which models to enable for my employees.
14. As an Admin, I want the model browser to return `modelId`, `name`, and `description` for each available model, so that I can make informed decisions about which models to add.
15. As a backend maintainer, I want WebSocket connections to be authenticated via JWT query parameter during the handshake, so that no unauthenticated or non-employee client can open a chat stream.
16. As a backend maintainer, I want the `OpenRouterService` to be a pure HTTP adapter with no knowledge of JPA entities, so that it can be tested in isolation and the LLM routing concern does not bleed into the domain layer.
17. As a backend maintainer, I want `MessageService.appendUserMessage()` and `MessageService.appendAssistantMessage()` to be the only write paths for messages, so that role/token invariants and ownership rules are enforced in one place.
18. As a backend maintainer, I want agent prompts to be reconstructed from `AgentEntity` at request time (never persisted), so that editing an agent's prompts takes effect immediately on all future messages per [[ADRs/ADR-008-agent-prompts-not-persisted-as-messages]].
19. As a backend maintainer, I want token counts (`inputTokens`, `outputTokens`) to be stored on every ASSISTANT message, so that the admin's usage analytics dashboard (a future feature) can aggregate from the message table per [[ADRs/ADR-004-message-table-as-token-usage-source]].
20. As a backend maintainer, I want the model ID forwarded to OpenRouter to be validated against the enabled `LlmModelEntity` list, so that employees cannot bypass the admin-curated model constraint per [[ADRs/ADR-007-admin-curated-llm-model-list]].
21. As a QA engineer, I want the WebSocket handshake to reject connections without a valid employee JWT, so that security is verifiable at the integration level.
22. As a QA engineer, I want `OpenRouterService` to throw domain exceptions (not raw HTTP exceptions) on failure, so that `ChatWebSocketHandler` can produce clean error frames without leaking HTTP internals.
23. As a QA engineer, I want `ChatTurnService` to be testable with a mocked `OpenRouterService`, so that the full chat orchestration logic can be verified without real HTTP calls, and `ChatWebSocketHandler` testable with a mocked `ChatTurnService`.

---

## Solution

Add a `models/chat/` package that contains the WebSocket infrastructure, `ChatTurnService` for chat turn orchestration, and `ChatTurnResult` DTO. Add `OpenRouterService` as a deep HTTP adapter in `models/chat/openrouter/`. Extend `MessageService` with two write methods. Add an admin model browser endpoint to `LlmModelController`. Wire the full chat loop: WebSocket message received → `ChatTurnService.processTurn()` handles ownership check, USER message save, history load, agent prompt injection, OpenRouter streaming, chunks forwarded, ASSISTANT message save, and conversation timestamp refresh — all within a `@Transactional` boundary. `ChatWebSocketHandler` is a thin protocol adapter with 2 dependencies (`ChatTurnService`, `ObjectMapper`).

### Scope

Impacted workflows and systems:
- New domain module `models/chat/` — WebSocket config, handshake interceptor, chat handler, `ChatTurnService`, and `ChatTurnResult` DTO.
- New integration module `models/chat/openrouter/` — OpenRouterService HTTP adapter and its internal DTOs.
- Modified `MessageService` — two new write methods (`appendUserMessage`, `appendAssistantMessage`).
- Modified `SecurityConfig` — `/ws/**` permitted for WebSocket handshake.
- Modified `LlmModelController` — new `GET /llm-model/available` admin endpoint.
- New REST endpoint: `GET /llm-model/available` (admin only).
- New WebSocket endpoint: `/ws/chat/{conversationId}` (employee only, JWT via `?token=`).

Out of scope for this feature:
- Image input or output (deferred).
- Streaming via SSE or any protocol other than WebSocket.
- Message pagination for history (deferred to a future performance feature).
- Token usage analytics dashboard (deferred — this feature provides the data; the dashboard is a separate feature).
- Model enable/disable admin UI (already exists via `LlmModelController` CRUD).
- Frontend implementation.
- Retry logic or circuit breakers on OpenRouter calls.

### Affected Systems / Modules

- [[Memory/architecture|Architecture]] — New `models/chat/` domain module. `models/chat/openrouter/` as the LLM routing layer.
- [[ADRs/ADR-001-single-llm-provider-openrouter]] — This feature implements the single-provider decision.
- [[ADRs/ADR-002-openrouter-as-service-not-entity]] — `OpenRouterService` is the Spring service specified by this ADR.
- [[ADRs/ADR-003-single-message-entity-with-role-enum]] — Write paths map to USER and ASSISTANT roles on the single `MessageEntity`.
- [[ADRs/ADR-004-message-table-as-token-usage-source]] — ASSISTANT messages are saved with `inputTokens` and `outputTokens` from OpenRouter's usage response.
- [[ADRs/ADR-006-nullable-agent-fk-for-conversation-type]] — `ChatTurnService` checks `conversation.agent` to distinguish general vs agent conversations.
- [[ADRs/ADR-007-admin-curated-llm-model-list]] — Model ID is validated against `LlmModelEntity` at the conversation level before forwarding.
- [[ADRs/ADR-008-agent-prompts-not-persisted-as-messages]] — Agent prompts injected at request time only.
- [[ADRs/ADR-009-long-primary-key-for-all-entities]] — No new entities, but all entity references use `Long` IDs.
- [[Features/done/Message-Entity-and-Conversation-History]] — This feature builds on `MessageEntity`, `MessageRepository`, `MessageMapper`, and `MessageService.getHistory()`.
- `backend/src/main/java/com/agentForgeBackend/models/message/MessageService.java` — Extended with write seams.
- `backend/src/main/java/com/agentForgeBackend/models/conversation/ConversationEntity.java` — `updatedAt` refreshed on ASSISTANT save.
- `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelController.java` — New admin endpoint added.
- `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java` — `/ws/**` added as `permitAll`.
- `backend/pom.xml` — `spring-boot-starter-websocket` already present; no new dependencies needed.

### Impact Analysis

- `ConversationEntity.updatedAt` is now modified by `MessageService.appendAssistantMessage()` via `conversationRepository.save()`. This is a cross-domain write (Message domain writing Conversation state). It is contained inside a single `@Transactional` method on `MessageService`, which already injects `ConversationRepository` for ownership checks. The pattern follows the precedent set by `ConversationService` injecting `AgentRepository` and `LlmModelRepository`.
- The `message` table transitions from read-only (history only) to append-only (USER and ASSISTANT writes). No existing tests are affected because no existing test writes messages — they only verify the empty-list and 404 paths. The FK-safe delete order in test cleanup is unchanged: `messageRepository.deleteAll()` remains the first step.
- `/ws/**` is added as `permitAll` to `SecurityConfig`. This does not weaken HTTP endpoint security because no REST endpoints live under `/ws/`. The sole security gate for WebSocket connections is `JwtHandshakeInterceptor`.
- `LlmModelController` receives a new `@GetMapping("/available")` method. The existing CRUD surface is untouched. The new method is gated by `@PreAuthorize("hasRole('ADMIN')")` consistent with all other `LlmModelController` methods.

### Risk Assessment

- **SecurityContext in WebSocket threads**: Spring's `JWTTokenValidatorFilter` does not populate `SecurityContext` for WebSocket connections (browser clients cannot send `Authorization` headers). `JwtHandshakeInterceptor` stores a fully-constructed `UsernamePasswordAuthenticationToken` in session attributes. `ChatWebSocketHandler` manually sets `SecurityContextHolder` before calling service methods and clears it in a `finally` block. Without this, `@PreAuthorize` and `AuthUserUtil.getAuthUserEmployeeEntity()` fail with `AccessDeniedException` or null principal on the WebSocket thread.
- **`@Transactional` rollback semantics for USER message persistence:** `ChatTurnService.processTurn()` is `@Transactional(noRollbackFor = {OpenRouterConfigException.class, OpenRouterApiException.class})`. This ensures the USER message persists when OpenRouter throws — the transaction commits despite the exception, matching the spec requirement that "my message is saved even if the LLM call fails" (user story #9). If `appendAssistantMessage()` throws a `DataAccessException` (DB error) after OpenRouter streaming has completed, `processTurn()` catches it and throws `AssistantMessageSaveException` — a checked domain exception that does NOT trigger rollback. The transaction commits (USER message survives), and the handler sends an error frame. The user has already seen the full LLM response in the UI. The orphaned USER message provides context for retry — on the next send, the full conversation history is replayed to OpenRouter and a new complete exchange is produced. Only DB-persistence failures after successful streaming are treated as non-fatal; all other `RuntimeException`s (including programming errors) still trigger full rollback.
- **WebClient in Spring MVC**: `WebClient` (from WebFlux) is used as an HTTP client only. It is safe to use in a Spring MVC application alongside `spring-boot-starter-websocket`. Both are already in `pom.xml`. No reactive stack is introduced — `streamChat()` calls `.toStream()` to block and iterate the SSE `Flux<String>` on the handler thread.
- **SSE parsing for streaming**: OpenRouter returns `data: <json>\n\n` lines. `[DONE]` signals end of stream. Token usage is in the final data chunk when `stream_options.include_usage = true` is sent. Malformed or empty `delta.content` fields must be null-checked before invoking the consumer.
- **First-turn detection for `initPrompt`**: The handler checks if the conversation has zero messages before saving the USER message. This is a count query on the message table. The check and subsequent `appendUserMessage()` are not atomic — a race condition could occur if two messages are sent simultaneously to the same conversation. For MVP (single-business, sequential conversation UI), this is acceptable. No distributed lock is introduced.
- **`ddl-auto=update` does not modify existing tables**: No new JPA entities are added in this feature. The schema is unchanged. This risk does not apply here.
- **WebSocket connection lifecycle on error**: If `session.sendMessage()` throws (e.g., client disconnected before `done` frame), the ASSISTANT message may already be saved. The `done` frame delivery failure is non-fatal — the message is persisted and will appear in the next `GET /conversation/{id}/messages` call. Log the send failure but do not treat it as an error that triggers compensating actions.

---

## Implementation Architecture

### Changes Required

#### 1. `SecurityConfig` (modified)

**Purpose:** Permit `/ws/**` paths so the WebSocket upgrade request reaches `JwtHandshakeInterceptor` without being blocked by the HTTP security filter chain.

**Changes:** Add `.requestMatchers("/ws/**").permitAll()` before the `anyRequest().authenticated()` catch-all. Authentication for WebSocket connections is enforced entirely by `JwtHandshakeInterceptor` — the HTTP filter chain cannot validate `?token=` query parameters.

**File:** `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java`

---

#### 2. `WebSocketConfig`

**Purpose:** Register the WebSocket endpoint and wire the interceptor.

**Changes:**
- `@Configuration @EnableWebSocket` implements `WebSocketConfigurer`.
- Registers `ChatWebSocketHandler` at `/ws/chat/{conversationId}`.
- Attaches `JwtHandshakeInterceptor`.
- Sets `allowedOrigins("http://localhost:3000")` consistent with the CORS rule in `SecurityConfig`.

**File:** `backend/src/main/java/com/agentForgeBackend/models/chat/WebSocketConfig.java`

---

#### 3. `JwtHandshakeInterceptor`

**Purpose:** Authenticate the WebSocket upgrade request using a JWT passed as `?token=<jwt>`. Replaces the role of `JWTTokenValidatorFilter` for WebSocket connections.

**Changes:**
- Implements `HandshakeInterceptor`.
- In `beforeHandshake()`:
  - Extract the `token` parameter from `ServerHttpRequest.getURI().getQuery()`.
  - If absent or blank: set response status `401`, return `false`.
  - Validate via `JwtTokenService` (existing bean). If invalid: set `401`, return `false`.
  - Extract username from token. Load `UserDetails` via `SecurityUserServiceImpl.loadUserByUsername()`.
  - Verify that the user has `ROLE_EMPLOYEE`. If not: set `403`, return `false`.
  - Build a `UsernamePasswordAuthenticationToken` and store it in `attributes` under the key `"authentication"`. Return `true`.
- `afterHandshake()`: no-op.

**File:** `backend/src/main/java/com/agentForgeBackend/models/chat/JwtHandshakeInterceptor.java`

---

#### 4. `ChatWebSocketHandler`

**Purpose:** Thin WebSocket protocol adapter. Parses incoming frames, delegates full turn orchestration to `ChatTurnService`, and frames outgoing responses. No domain logic beyond parsing and framing.

**Changes:**
- Extends `TextWebSocketHandler`, annotated `@Component`.
- Injects: `ChatTurnService`, `ObjectMapper` (reduced from 8 dependencies to 2).
- `afterConnectionEstablished(session)`:
  - Log connection established (no-op — `conversationId` is extracted lazily in `handleTextMessage` per Finding 7).
- `handleTextMessage(session, message)`:
  1. Extract `conversationId` from URI path using `UriTemplate`: `new UriTemplate("/ws/chat/{conversationId}").match(session.getUri().getPath())`. If no match or `Long.parseLong()` fails: send `{type:"error"}` frame, close with `CloseStatus.BAD_DATA`, return.
  2. Set `SecurityContextHolder` from session `authentication` attribute.
  3. Parse incoming JSON as `ChatIncomingMessage {content}` via `ObjectMapper`.
  4. Call `chatTurnService.processTurn(conversationId, content, chunk -> session.sendMessage(new TextMessage(ChatOutgoingFrame.chunk(chunk))))`.
  5. On success (returns `ChatTurnResult`): send `{type:"done", messageId: result.getMessageId(), inputTokens: result.getInputTokens(), outputTokens: result.getOutputTokens()}`.
  6. On exception: send `{type:"error", message: ex.getMessage()}`, close session.
  7. `finally`: `SecurityContextHolder.clearContext()`.
- `afterConnectionClosed(session, status)`: log closure.

**File:** `backend/src/main/java/com/agentForgeBackend/models/chat/ChatWebSocketHandler.java`

---

#### 4a. `ChatTurnService`

**Purpose:** Domain orchestrator for chat turn processing. One method hides ownership verification, agent prompt injection, OpenRouter streaming, message persistence, and conversation timestamp refresh behind a single call — the deep module the feature document describes.

**Changes:**
- `@Service`. Single concrete class (no interface — matches codebase convention per `MessageService`, `OpenRouterService`).
- Injects: `MessageService`, `MessageRepository`, `ConversationRepository`, `OpenRouterService`, `AuthUserUtil`.
- **`@Transactional(noRollbackFor = {OpenRouterConfigException.class, OpenRouterApiException.class}) processTurn(Long conversationId, String content, Consumer<String> onChunk)`** → `ChatTurnResult`:
  1. Load current employee via `AuthUserUtil.getAuthUserEmployeeEntity()`.
  2. Load `ConversationEntity` via `conversationRepository.findByIdAndEmployeeId(conversationId, employee.getId())` — throw `ItemNotFoundException` if absent.
  3. Validate `conversation.getCurrentModel().isEnabled()` — throw `ItemNotFoundException` if disabled (LAZY, accessible inside `@Transactional`).
  4. Load `AgentEntity agent = conversation.getAgent()` (may be null — LAZY, accessible inside `@Transactional`).
  5. Detect first turn: check `history.size() == 1` after loading history in step 7 (the single USER message just appended is the only message — per Finding 3).
  6. Call `messageService.appendUserMessage(conversationId, content)`. This participates in the outer transaction (`REQUIRED` propagation). On OpenRouter failure, `noRollbackFor` ensures the USER message survives (user story #9).
  7. Load full history: `messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId)`.
  8. Build `List<OpenRouterMessage> payload`:
     - If agent != null AND first turn: prepend `{role:"system", content:agent.getInitPrompt()}`.
     - Map history: ASSISTANT → `{role:"assistant", content}`; USER → `{role:"user", content: (agent != null && agent.getRecurrentPrompt() != null ? agent.getRecurrentPrompt() + content : content)}` (null-safe per ADR-008).
  9. Get `modelId = conversation.getCurrentModel().getModelId()`.
  10. Accumulate content in `StringBuilder`.
  11. Call `openRouterService.streamChat(payload, modelId, chunk -> { accumulated.append(chunk); onChunk.accept(chunk); })`.
  12. Receive `OpenRouterUsage usage` from `streamChat`.
   13. Wrap `appendAssistantMessage()` in try/catch: on success, assign `saved`. On `DataAccessException`, throw `new AssistantMessageSaveException("Response was streamed but could not be saved. Please retry.", e)`. The checked exception commits the transaction (USER message survives); the handler sends an error frame.
   14. Return `new ChatTurnResult(saved.getId(), usage.getInputTokens(), usage.getOutputTokens())`.
   15. On `OpenRouterConfigException` or `OpenRouterApiException`: transaction does NOT roll back (USER message persists per `noRollbackFor`); exception propagates to handler for error frame. On `AssistantMessageSaveException`: transaction does NOT roll back (checked exception, unchecked default); exception propagates to handler for error frame.

**File:** `backend/src/main/java/com/agentForgeBackend/models/chat/ChatTurnService.java`

---

#### 4b. `ChatTurnResult`

**Purpose:** Carries the result of a completed chat turn from `ChatTurnService.processTurn()` back to the caller.

**Changes:**
- `@Data @AllArgsConstructor`
- Fields: `Long messageId`, `int inputTokens`, `int outputTokens`

**File:** `backend/src/main/java/com/agentForgeBackend/models/chat/dto/ChatTurnResult.java`

---

#### 5. `ChatIncomingMessage`

**Purpose:** Deserializes the JSON payload sent by the frontend client over WebSocket.

**Changes:**
- `@Data @NoArgsConstructor @AllArgsConstructor`
- Field: `String content`

**File:** `backend/src/main/java/com/agentForgeBackend/models/chat/dto/ChatIncomingMessage.java`

---

#### 6. `ChatOutgoingFrame`

**Purpose:** Serializes the JSON frames sent from the server to the frontend client.

**Changes:**
- `@Data @NoArgsConstructor @AllArgsConstructor`
- Fields: `String type`, `String content` (nullable), `Long messageId` (nullable), `Integer inputTokens` (nullable), `Integer outputTokens` (nullable), `String message` (nullable, error description).
- Static factory methods: `chunk(String content)`, `done(Long messageId, int inputTokens, int outputTokens)`, `error(String message)`.

**File:** `backend/src/main/java/com/agentForgeBackend/models/chat/dto/ChatOutgoingFrame.java`

---

#### 7. `OpenRouterMessage`

**Purpose:** Internal DTO representing one message in the payload sent to OpenRouter's `/chat/completions`.

**Changes:**
- `@Data @AllArgsConstructor`
- Fields: `String role`, `String content`

**File:** `backend/src/main/java/com/agentForgeBackend/models/chat/openrouter/OpenRouterMessage.java`

---

#### 8. `OpenRouterUsage`

**Purpose:** Carries token usage from `OpenRouterService.streamChat()` back to the caller.

**Changes:**
- `@Data @AllArgsConstructor`
- Fields: `int inputTokens`, `int outputTokens`

**File:** `backend/src/main/java/com/agentForgeBackend/models/chat/openrouter/OpenRouterUsage.java`

---

#### 9. `OpenRouterModelInfo`

**Purpose:** Carries model catalog data from `OpenRouterService.fetchAvailableModels()` to the admin endpoint.

**Changes:**
- `@Data @AllArgsConstructor`
- Fields: `String modelId`, `String name`, `String description`

**File:** `backend/src/main/java/com/agentForgeBackend/models/chat/openrouter/OpenRouterModelInfo.java`

---

#### 10. `OpenRouterService`

**Purpose:** Deep HTTP adapter for OpenRouter. Encapsulates WebClient construction, SSE line parsing, token extraction, and HTTP error mapping. Callers see two clean methods; all HTTP complexity is hidden.

**Changes:**
- `@Service`. Injects `AppSettingsService`, `WebClient.Builder`.
- Builds `WebClient` in constructor: `webClientBuilder.baseUrl("https://openrouter.ai/api/v1").build()` (uses injected builder, enabling `ExchangeFunction` injection in tests).

- **`streamChat(List<OpenRouterMessage> messages, String modelId, Consumer<String> onChunk)`** → `OpenRouterUsage`:
  - Call `appSettingsService.getRawApiKey()` — throw `OpenRouterConfigException` if null or blank.
  - Build request body: `{model, messages, stream: true, stream_options: {include_usage: true}}`.
  - POST to `/chat/completions` with `Authorization: Bearer <key>`, `Content-Type: application/json`.
  - `.retrieve().bodyToFlux(String.class)` to get the raw SSE line stream.
  - Call `.toStream().forEach(line -> parseSseLine(line, onChunk, usageHolder))`.
  - `parseSseLine`: skip blank lines; skip `data: [DONE]`; strip `data: ` prefix; parse JSON; if `choices[0].delta.content` non-null and non-empty → `onChunk.accept(content)`; if `usage` non-null → store `prompt_tokens` / `completion_tokens` in a `AtomicReference<OpenRouterUsage>`.
  - On non-2xx response: map to `OpenRouterApiException(statusCode, body)`.
  - Return `usageHolder.get()` (defaults to `OpenRouterUsage(0, 0)` if usage chunk absent).

- **`fetchAvailableModels()`** → `List<OpenRouterModelInfo>`:
  - Call `appSettingsService.getRawApiKey()` — throw `OpenRouterConfigException` if missing.
  - GET `/models` with auth header.
  - Parse `data` array from JSON response; map each item's `id` → `modelId`, `name`, `description` (nullable → empty string).
  - Return list.

**File:** `backend/src/main/java/com/agentForgeBackend/models/chat/openrouter/OpenRouterService.java`

---

#### 11. `OpenRouterConfigException` and `OpenRouterApiException`

**Purpose:** Domain exceptions that decouple `ChatTurnService` from HTTP internals.

**Changes:**
- `OpenRouterConfigException extends RuntimeException` — thrown when API key is missing.
- `OpenRouterApiException extends RuntimeException` — thrown on non-2xx responses. Fields: `int statusCode`, `String body`.

**File:** `backend/src/main/java/com/agentForgeBackend/models/chat/openrouter/OpenRouterConfigException.java`
**File:** `backend/src/main/java/com/agentForgeBackend/models/chat/openrouter/OpenRouterApiException.java`

---

#### 11a. `AssistantMessageSaveException`

**Purpose:** Checked domain exception thrown when `appendAssistantMessage()` fails with a DB error after OpenRouter streaming has completed. Because it extends `Exception` (checked, not `RuntimeException`), Spring does NOT roll back the transaction — the USER message persists. The handler receives this exception and sends an error frame.

**Changes:**
- `AssistantMessageSaveException extends Exception` — matches codebase convention (`ItemNotFoundException`, `InvalidInsertDetails`, etc. all extend `Exception`). Intentionally NOT listed in `rollbackFor` on `ChatTurnService.processTurn()`.
- Constructor takes `String message, Throwable cause` for stack trace preservation.

**File:** `backend/src/main/java/com/agentForgeBackend/models/chat/openrouter/AssistantMessageSaveException.java`

---

#### 12. `MessageService` (modified — write seams added)

**Purpose:** Add the two append methods that are the only write paths for the `message` table.

**Changes:**

- **`appendUserMessage(Long conversationId, String content)`** → `MessageEntity`:
  - `@Transactional @PreAuthorize("hasRole('EMPLOYEE')")`
  - Load employee via `AuthUserUtil.getAuthUserEmployeeEntity()`.
  - Verify ownership: `conversationRepository.findByIdAndEmployeeId(conversationId, employee.getId())` — throw `ItemNotFoundException` if absent.
  - Build and save `MessageEntity(conversation, USER, content, null, null, null)`.
  - Return saved entity.

- **`appendAssistantMessage(Long conversationId, Long llmModelId, String content, int inputTokens, int outputTokens)`** → `MessageEntity`:
  - `@Transactional`. No `@PreAuthorize` — called only from `ChatTurnService` which enforces employee auth via `AuthUserUtil` inside its own `@Transactional` boundary. Document this clearly.
  - Load `ConversationEntity` via `conversationRepository.findById(conversationId)` — throw `ItemNotFoundException` if absent.
  - Load `LlmModelEntity` via `llmModelRepository.findById(llmModelId)` — throw `ItemNotFoundException` if absent.
  - Build and save `MessageEntity(conversation, ASSISTANT, content, llmModel, inputTokens, outputTokens)`.
  - Refresh `conversation.updatedAt = LocalDateTime.now()`; call `conversationRepository.save(conversation)`.
  - Return saved entity.

**File:** `backend/src/main/java/com/agentForgeBackend/models/message/MessageService.java`

---

#### 13. `LlmModelController` (modified — admin model browser endpoint)

**Purpose:** Expose the OpenRouter model catalog to admins so they can pick models to enable.

**Changes:**
- Inject `OpenRouterService` into `LlmModelController`.
- Add `@GetMapping("/available") @PreAuthorize("hasRole('ADMIN')")`:
  - Calls `openRouterService.fetchAvailableModels()`.
  - Returns `ResponseEntity<List<OpenRouterModelInfo>>`.

**File:** `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelController.java`

---

## Implementation Steps

### Phase 1: Security Baseline and WebSocket Config

- [x] **Step 1.1:** Add `.requestMatchers("/ws/**").permitAll()` to `SecurityConfig` (before `anyRequest().authenticated()`). Document why: auth is handled by `JwtHandshakeInterceptor`, not the HTTP filter chain.
- [x] **Step 1.2:** Create `JwtHandshakeInterceptor` — extract `?token=` from query string, validate via `JwtTokenService`, load `UserDetails` via `SecurityUserServiceImpl`, verify `ROLE_EMPLOYEE`, store `UsernamePasswordAuthenticationToken` in session attributes. Reject with 401 on missing/invalid token; reject with 403 on valid token without `ROLE_EMPLOYEE`.
- [x] **Step 1.3:** Create `WebSocketConfig` — `@EnableWebSocket`, register `ChatWebSocketHandler` at `/ws/chat/{conversationId}` with `JwtHandshakeInterceptor`, `allowedOrigins("http://localhost:3000")`.
- [x] **Step 1.4:** Create `ChatWebSocketHandler` stub — extends `TextWebSocketHandler`, `@Component`. Injects `ChatTurnService` (stub returning hardcoded `ChatTurnResult`) and `ObjectMapper`. In `afterConnectionEstablished()`: log-only (no-op — `conversationId` is extracted lazily in `handleTextMessage` per Finding 7). In `handleTextMessage()`: extract `conversationId` from URI path using `UriTemplate` (`new UriTemplate("/ws/chat/{conversationId}").match(session.getUri().getPath())`); if no match or `Long.parseLong()` fails, send error frame and close with `CloseStatus.BAD_DATA`. Parse incoming message, call `chatTurnService.processTurn()`, send `{type:"done"}` frame with the stub result. In `afterConnectionClosed()`: clear SecurityContext. Note: `SecurityContext` is intentionally NOT set in `afterConnectionEstablished` — it is set per-call in `handleTextMessage` due to WebSocket thread pool dispatch (per Finding 2).
- [x] **Step 1.4a:** Create `ChatTurnService` stub — `@Service` with single method `processTurn()` returning a hardcoded `ChatTurnResult`. Create `ChatTurnResult` DTO (`messageId`, `inputTokens`, `outputTokens`). Stub will be replaced with full implementation in Phase 4.
- [x] **Step 1.5:** Write security tests:
  - WebSocket connect without `?token=` → handshake rejected (401).
  - WebSocket connect with invalid `?token=` → rejected (401).
  - WebSocket connect with valid Admin JWT → rejected (403, not EMPLOYEE).
  - WebSocket connect with valid Employee JWT → accepted (101 Switching Protocols); send message, receive echo `chunk` frame.

### Phase 2: OpenRouterService and Admin Model Browser

- [x] **Step 2.1:** Create internal DTOs: `OpenRouterMessage`, `OpenRouterUsage`, `OpenRouterModelInfo`, `OpenRouterConfigException`, `OpenRouterApiException`.
- [x] **Step 2.2:** Implement `OpenRouterService.streamChat()` — WebClient POST to `/chat/completions`, SSE line parsing, `onChunk` consumer invocation, usage extraction from final chunk. Throw domain exceptions on missing key or non-2xx response.
- [x] **Step 2.3:** Implement `OpenRouterService.fetchAvailableModels()` — WebClient GET `/models`, map response to `List<OpenRouterModelInfo>`.
- [x] **Step 2.4:** Add `GET /llm-model/available` to `LlmModelController` — inject `OpenRouterService`, delegate to `fetchAvailableModels()`, admin only.
- [x] **Step 2.5:** TDD for `OpenRouterService`:
  - `streamChat` with a mock `ExchangeFunction` (injected via `WebClient.Builder.exchangeFunction()`) returning a `ClientResponse` with a `Flux<String>` body simulating SSE lines → verify onChunk called per delta, correct usage returned.
  - `streamChat` with missing API key → `OpenRouterConfigException` thrown.
  - `streamChat` with non-2xx response (`ClientResponse.create(HttpStatus.BAD_REQUEST).body(...)`) → `OpenRouterApiException` thrown.
  - `fetchAvailableModels` with mock `ExchangeFunction` returning a valid JSON model list → correct `OpenRouterModelInfo` list returned.
- [x] **Step 2.6:** TDD for `GET /llm-model/available`:
  - Admin JWT → 200 with model list.
  - Employee JWT → 403.
  - Anonymous → 401.

### Phase 3: MessageService Write Seams

- [x] **Step 3.1:** Add `appendUserMessage(Long conversationId, String content)` to `MessageService` — `@Transactional @PreAuthorize("hasRole('EMPLOYEE')")`, ownership check via `conversationRepository.findByIdAndEmployeeId`, save USER `MessageEntity`, return saved entity.
- [x] **Step 3.2:** Add `appendAssistantMessage(Long conversationId, Long llmModelId, String content, int inputTokens, int outputTokens)` to `MessageService` — `@Transactional`, load conversation and llmModel, save ASSISTANT `MessageEntity`, refresh `conversation.updatedAt`, return saved entity.
- [x] **Step 3.3:** TDD for write seams:
  - `appendUserMessage`: saves USER message with correct role, content, conversationId; `inputTokens`/`outputTokens`/`llmModel` are null; throws `ItemNotFoundException` for non-existent conversation; throws `ItemNotFoundException` for cross-employee conversation.
  - `appendAssistantMessage`: saves ASSISTANT message with all fields populated; `conversation.updatedAt` is updated; returns saved entity with correct `llmModel`.

### Phase 4: Full Chat Orchestration

- [x] **Step 4.1a:** Implement `ChatTurnService.processTurn()` — full `@Transactional(noRollbackFor = {OpenRouterConfigException.class, OpenRouterApiException.class})` orchestration as described in Implementation Architecture item 4a. Covers ownership check, model validation, first-turn detection via `history.size() == 1`, agent prompt injection per ADR-008, OpenRouter streaming, message persistence, and conversation timestamp refresh. `noRollbackFor` ensures USER message survives LLM failure (user story #9).
- [x] **Step 4.1b:** Complete `ChatWebSocketHandler.handleTextMessage()` — thin adapter: set SecurityContext, parse incoming message, delegate to `chatTurnService.processTurn()`, send `done` frame on success or `error` frame on exception, clear SecurityContext in finally.
- [x] **Step 4.2:** TDD for `ChatTurnService` and `ChatWebSocketHandler`:
  - `ChatTurnService` integration test with mocked `OpenRouterService`: general conversation (no agent) → USER message saved, OpenRouter called with plain history, ASSISTANT message saved, correct `ChatTurnResult` returned. Agent conversation, first message → `initPrompt` prepended, `recurrentPrompt` prepended. Agent conversation, subsequent message → no `initPrompt`, `recurrentPrompt` still prepended. OpenRouter throws → USER message still persisted (no rollback), exception propagates.
  - `ChatWebSocketHandler` integration test with mocked `ChatTurnService`: verify `done` frame received with correct messageId/tokens, error frame on `ChatTurnService` exception, cross-employee conversation → error frame, SecurityContext cleared in finally.

### Phase 5: Regression and Cleanup

- [x] **Step 5.1:** Add `messageRepository.deleteAll()` first in setUp for any new test classes that create messages (following the FK-safe delete order in `known-issues.md`). — Audit confirmed all 5 new test files have correct FK-safe cleanup; no patches needed.
- [x] **Step 5.2:** Run full `./mvnw test` to confirm no regressions in existing Conversation, Agent, Admin, Employee, LlmModel, AppSettings, Security, and Message tests. — Full suite: 987 tests, 0 failures, 1 pre-existing error (`authServerApplicationTests.contextLoads`). All 32 new tests pass.

---

## Potential Issues / Risks

- **SecurityContext must be set manually on the WebSocket thread.** The `JWTTokenValidatorFilter` does not run for WebSocket connections from browsers. `JwtHandshakeInterceptor` stores the `Authentication` in session attributes. `ChatWebSocketHandler` must call `SecurityContextHolder.getContext().setAuthentication(auth)` before any `@PreAuthorize`-annotated service method, and `SecurityContextHolder.clearContext()` in a `finally` block. Forgetting either causes either an `AccessDeniedException` or a security context leak between WebSocket sessions.
- **`WebClient.bodyToFlux(String.class).toStream()` blocks the handler thread.** This is intentional — the WebSocket handler thread blocks while streaming from OpenRouter and forwards chunks. In an MVP with a small number of concurrent users, this is acceptable. Under high concurrency, this pattern exhausts the WebSocket thread pool. The correct long-term solution is a reactive `WebFlux` handler, which is out of MVP scope.
- **`recurrentPrompt` may be null.** `AgentEntity.recurrentPrompt` is nullable. `ChatTurnService` must null-check before prepending: `agent.getRecurrentPrompt() != null ? agent.getRecurrentPrompt() + content : content`.
- **Model disabled between conversation creation and message send.** `ConversationEntity.currentModel` may reference a model that was later disabled. `ChatTurnService` should check `conversation.getCurrentModel().isEnabled()` before calling OpenRouter, and throw `ItemNotFoundException` if disabled.
- **SSE line format edge cases.** OpenRouter may send blank lines (valid SSE delimiter), multi-line `data:` chunks, or comment lines starting with `:`. The SSE parser must skip blank lines and `:` comment lines, and only process `data: <json>` lines.
- **Token usage absent from stream.** If `stream_options.include_usage` is not honored by the model (some models ignore it), the usage chunk may not appear. `appendAssistantMessage` should still be called with `inputTokens = 0, outputTokens = 0` rather than failing. The ASSISTANT message is still saved; zero token counts are the accurate representation.
- **`OpenRouterService` testing without new dependencies.** `OpenRouterService` uses `WebClient` for HTTP. Testing SSE streaming requires a mock HTTP exchange. No new dependency is needed: Spring WebFlux's `ExchangeFunction` interface (already available via `spring-boot-starter-webflux`) allows tests to provide a mock `ExchangeFunction` via `WebClient.Builder.exchangeFunction()` that returns `ClientResponse` objects with pre-built `Flux<String>` bodies simulating SSE lines. This exercises the real `WebClient` encoder/decoder path without a real HTTP server, port binding, or thread coordination. `OpenRouterService` must use the injected `WebClient.Builder` (per Implementation Architecture item 10) rather than calling `WebClient.builder()` statically.

---

## Testing Decisions

Good tests for this feature verify observable behavior through public interfaces — what goes in and what comes out — not internal implementation steps. Tests must not assert on SSE parsing internals, WebClient configuration details, or Spring Security filter internals beyond the observable HTTP/WebSocket status code.

Testing philosophy:
- Use TDD in vertical slices: one failing behavior test → minimal implementation → pass → repeat.
- `JwtHandshakeInterceptor`: test via real WebSocket connect attempts (accept valid employee JWT, reject others).
- `OpenRouterService`: test via `MockWebServer` — control the SSE response bytes and verify the consumer is called with correct content and usage is returned.
- `MessageService` write seams: `@SpringBootTest` integration tests, same pattern as existing `MessageServiceIntegrationTest`.
- `ChatTurnService`: `@SpringBootTest` integration test with mocked `OpenRouterService` — verify full orchestration (ownership, model validation, prompt injection, message persistence, streaming callback).
- `ChatWebSocketHandler`: `@SpringBootTest` integration test with mocked `ChatTurnService` — send a real WebSocket message, verify DB state and received frames.
- `LlmModelController.getAvailable()`: `@SpringBootTest` with mocked `OpenRouterService` — verify admin/employee/anonymous access control and response shape.

**Prior art:**
- `backend/src/test/java/com/agentForgeBackend/models/message/MessageServiceIntegrationTest.java`
- `backend/src/test/java/com/agentForgeBackend/models/message/MessageControllerTest.java`
- `backend/src/test/java/com/agentForgeBackend/configuration/security/SecurityAuthorizationTest.java`
- `backend/src/test/java/com/agentForgeBackend/testUtils/TestAuthenticationHelper.java`
- `backend/src/test/java/com/agentForgeBackend/models/llm/LlmModelControllerTest.java`

---

## Task Breakdown

### Task 1: Security Baseline and WebSocket Config

- **Steps Covered:** Steps 1.1, 1.2, 1.3, 1.4, 1.4a, 1.5
- **Reason for Grouping:** Security config, interceptor, WebSocket registration, handler stub, `ChatTurnService` stub, and `ChatTurnResult` DTO are tightly coupled — you cannot test the interceptor without the WebSocket endpoint registered, and you cannot test the endpoint without the security rule permitting the path. The handler stub depends on `ChatTurnService`, so both stubs must be created together as a complete baseline.
- **Planned Task File:** `OpenRouter-Chat-Integration-step-1-security-and-websocket-baseline.md`
- **Task Document Link:** [[Tasks/current/OpenRouter-Chat-Integration-step-1-security-and-websocket-baseline]]

### Task 2: OpenRouterService and Admin Model Browser

- **Steps Covered:** Steps 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
- **Reason for Grouping:** `OpenRouterService` is a standalone HTTP adapter with no dependencies on the WebSocket layer. It can be built, tested, and verified in isolation. The admin model browser endpoint (`GET /llm-model/available`) is a thin delegation to the same service and is most efficiently added alongside the service itself.
- **Planned Task File:** `OpenRouter-Chat-Integration-step-2-openrouter-service.md`
- **Task Document Link:** [[Tasks/current/OpenRouter-Chat-Integration-step-2-openrouter-service]]

### Task 3: MessageService Write Seams

- **Steps Covered:** Steps 3.1, 3.2, 3.3
- **Reason for Grouping:** `appendUserMessage` and `appendAssistantMessage` are closely related write operations on the same service. They share ownership-check patterns and both need to be present before the handler can be wired. Testing them together covers the full message persistence surface.
- **Planned Task File:** `OpenRouter-Chat-Integration-step-3-message-service-write-seams.md`
- **Task Document Link:** [[Tasks/current/OpenRouter-Chat-Integration-step-3-message-service-write-seams]]

### Task 4: Full Chat Orchestration

- **Steps Covered:** Steps 4.1a, 4.1b, 4.2
- **Reason for Grouping:** `ChatTurnService` is the domain orchestrator; `ChatWebSocketHandler` is the thin protocol adapter that delegates to it. `ChatTurnService` can be tested independently with mocked `OpenRouterService`; handler tests verify framing and error handling with mocked `ChatTurnService`. Both must be completed together because `ChatWebSocketHandler` delegates to `ChatTurnService`, which depends on Tasks 1–3.
- **Planned Task File:** `OpenRouter-Chat-Integration-step-4-chat-orchestration.md`
- **Task Document Link:** [[Tasks/current/OpenRouter-Chat-Integration-step-4-chat-orchestration]]

### Task 5: Regression and Cleanup

- **Steps Covered:** Steps 5.1, 5.2
- **Reason for Grouping:** FK-safe cleanup patches and the full regression run are verification-only work, dependent on all implementation tasks being complete.
- **Planned Task File:** `OpenRouter-Chat-Integration-step-5-regression-and-cleanup.md`
- **Task Document Link:** [[Tasks/current/OpenRouter-Chat-Integration-step-5-regression-and-cleanup]]
