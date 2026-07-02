#architectural #high

## Review: OpenRouter Chat Integration

### Summary

Pre-implementation review of [[Features/to-do/OpenRouter-Chat-Integration]]. The feature establishes the OpenRouter HTTP integration, WebSocket chat infrastructure, message write seams, and admin model browser. **7 findings total: 2 high, 2 moderate, 3 low.** No critical issues were identified — the feature is architecturally sound in direction but has two high-severity gaps that should be resolved before implementation begins.

---

## Findings

---

### Finding 1 — `ChatWebSocketHandler` Violates SRP: Domain Orchestration Belongs in `ChatService`

**Severity:** 🟠 High

**Description:**

The feature document places 17 ordered steps of domain logic directly inside `ChatWebSocketHandler.handleTextMessage()`, with 8 injected dependencies (`OpenRouterService`, `MessageService`, `MessageRepository`, `ConversationRepository`, `AgentRepository`, `LlmModelRepository`, `AuthUserUtil`, `ObjectMapper`). A WebSocket handler is a protocol adapter — its responsibility is parsing incoming frames and sending outgoing frames, not performing ownership checks, agent prompt injection, payload assembly, and message persistence.

This also causes a LAZY-loading problem: `handleTextMessage` is not `@Transactional`, so accessing `conversation.getCurrentModel()` and `conversation.getAgent()` (both LAZY) will throw `LazyInitializationException` or silently return uninitialized proxies outside of the JPA session.

**Example:**

```java
// As designed: handler does everything
class ChatWebSocketHandler extends TextWebSocketHandler {
    // 8 dependencies
    // 17-step handleTextMessage: ownership check → first-turn detection 
    // → appendUserMessage → payload build → streamChat → appendAssistantMessage
    // → conversation.getCurrentModel().isEnabled() — LazyInitializationException risk
}

// Correct separation:
class ChatWebSocketHandler extends TextWebSocketHandler {
    // 2 dependencies: ChatService, ObjectMapper
    // 3-step handleTextMessage: parse → chatService.processTurn() → send done/error frame
}

class ChatServiceImpl implements ChatService {
    // Injects: MessageService, MessageRepository, ConversationRepository, 
    //          OpenRouterService, AuthUserUtil
    // @Transactional processTurn(conversationId, content, onChunk)
    // — owns the full turn within a JPA session
}
```

**Why It Matters:**

- LAZY proxies accessed outside a `@Transactional` boundary will throw at runtime — `conversation.getCurrentModel().isEnabled()` in an untransacted handler method is a guaranteed `LazyInitializationException`.
- `ChatWebSocketHandler` with 8 dependencies cannot be unit-tested without mocking the entire domain layer. Extracting `ChatService` allows the full turn logic to be tested independently of WebSocket protocol infrastructure.
- Future callers (REST fallback, batch replay, scheduled retries) would need to duplicate the 17-step logic instead of calling `ChatService.processTurn()`.

**Possible Solutions:**

1. Extract `ChatService` with a single `processTurn(Long conversationId, String content, Consumer<String> onChunk)` method annotated `@Transactional`. `ChatWebSocketHandler` injects only `ChatService` and `ObjectMapper`. The handler parses, delegates, and frames — nothing else.
2. Keep the handler as-is but annotate `handleTextMessage` with `@Transactional` and reduce dependencies by moving logic to `MessageService`. This is a partial fix that doesn't fully resolve the SRP violation.

**Recommended Solution:** Option 1 — extract `ChatService`. It creates the proper deep module the feature document describes ("one method call per turn hides ownership check, agent prompt injection, HTTP call, streaming, and DB writes"). The feature doc correctly identifies this behavior as a deep module but places the seam at the wrong layer. `ChatService.processTurn()` IS that deep module. `ChatWebSocketHandler` becomes a thin 2-dependency protocol adapter. Add `ChatService` and `ChatServiceImpl` to the `models/chat/` package and update the Implementation Architecture and Implementation Steps accordingly.

**Decision:** Option A (variant of Option 1) — extract `ChatTurnService` as a single concrete `@Service` class (no interface). `ChatTurnService.processTurn()` is annotated `@Transactional(noRollbackFor = {OpenRouterConfigException.class, OpenRouterApiException.class})` so USER messages survive LLM failures (user story #9). `ChatWebSocketHandler` injects only `ChatTurnService` and `ObjectMapper` — 2 dependencies. The `ChatTurnService` name communicates single responsibility and matches the codebase convention (`MessageService`, `OpenRouterService` are both concrete classes without interfaces). Parent document patched: Implementation Architecture items 4/4a/4b/4c updated, Implementation Steps Phase 1 and 4 restructured, Risk Assessment and Task Breakdown updated. **Date:** 2026-06-21.

---

### Finding 2 — SecurityContext ThreadLocal Lifecycle: Step 1.4 Contradicts Step 4.1

**Severity:** 🟠 High

**Description:**

Step 1.4 instructs the developer to "restore `SecurityContext`" inside `afterConnectionEstablished()`. Step 4.1 later correctly says to "Set `SecurityContextHolder` from session `authentication` attribute" at the start of `handleTextMessage()`. These two instructions are contradictory, and Step 1.4's instruction is wrong.

`SecurityContextHolder` stores authentication in a `ThreadLocal`. WebSocket handler methods (`afterConnectionEstablished`, `handleTextMessage`, `afterConnectionClosed`) are dispatched from a thread pool and **are not guaranteed to run on the same thread**. Setting the `SecurityContext` in `afterConnectionEstablished` on Thread A provides no guarantee it will be present when `handleTextMessage` runs on Thread B. The `ThreadLocal` does not transfer across thread pool dispatches.

If a developer follows Step 1.4 and sets SecurityContext in `afterConnectionEstablished`, calls to `@PreAuthorize("hasRole('EMPLOYEE')")` and `AuthUserUtil.getAuthUserEmployeeEntity()` in the service layer will fail silently (empty `SecurityContext`) or throw `AccessDeniedException` on a different thread.

**Example:**

```java
// WRONG (Step 1.4 as written):
@Override
public void afterConnectionEstablished(WebSocketSession session) {
    // Thread A sets SecurityContext
    SecurityContextHolder.getContext().setAuthentication(
        (Authentication) session.getAttributes().get("authentication")
    );
    // ... but handleTextMessage may run on Thread B, where SecurityContext is empty
}

// CORRECT (Step 4.1 as written — but Step 1.4 stub must not conflict):
@Override
protected void handleTextMessage(WebSocketSession session, TextMessage message) {
    Authentication auth = (Authentication) session.getAttributes().get("authentication");
    SecurityContextHolder.getContext().setAuthentication(auth); // Set here, per-call
    try {
        // ... call service methods with @PreAuthorize
    } finally {
        SecurityContextHolder.clearContext(); // Always clear
    }
}
```

**Why It Matters:**

A developer implementing Task 1 (the security baseline) who follows Step 1.4 will build a stub where the SecurityContext is set in `afterConnectionEstablished`. The stub may appear to work if all methods happen to run on the same thread during testing. In production, the thread pool dispatching will silently break authentication, causing `@PreAuthorize` to deny service calls or `AuthUserUtil` to return empty, both resulting in `ItemNotFoundException` or `AccessDeniedException` at runtime.

**Possible Solutions:**

1. Remove "restore `SecurityContext`" from Step 1.4. The stub's `afterConnectionEstablished` should only parse and store `conversationId` in session attributes. Step 4.1 already handles SecurityContext correctly per-message.
2. Add an explicit note in Step 1.4 that SecurityContext is intentionally NOT set in `afterConnectionEstablished` — it must be set per-call in `handleTextMessage` due to thread pool dispatch.

**Recommended Solution:** Option 1 — remove "restore SecurityContext" from Step 1.4 and add a comment in the stub that this is done in `handleTextMessage`. This prevents the incorrect pattern from being baked into the stub that developers will copy when implementing Task 4.

**Decision:** Auto-resolved — the parent document was already patched by Finding 1's decision. Implementation Architecture item 4 (`ChatWebSocketHandler`) correctly places SecurityContext set/clear in `handleTextMessage` only (steps 1 and 6). `afterConnectionEstablished` only parses and stores `conversationId`. Step 1.4 includes an explicit note: "SecurityContext is intentionally NOT set in `afterConnectionEstablished` — it is set per-call in `handleTextMessage` due to WebSocket thread pool dispatch (per Finding 2)." Step 4.1b specifies `set SecurityContext` at the start of `handleTextMessage` and `clear SecurityContext in finally`. The contradiction between Step 1.4 and Step 4.1 no longer exists. No parent-document changes needed. **Date:** 2026-06-21.

---

### Finding 3 — `MessageRepository.countByConversationId()` Is Undefined

**Severity:** 🟡 Moderate

**Description:**

Step 4.1 of the implementation steps references `messageRepository.countByConversationId(conversationId)` to detect whether the current message is the first turn in a conversation (for `initPrompt` injection). However, `MessageRepository` currently only declares one method:

```java
// Current MessageRepository
List<MessageEntity> findByConversationIdOrderByCreatedAtAsc(Long conversationId);
```

No implementation step in the feature document adds `countByConversationId(Long conversationId)` to `MessageRepository`. If implemented as written, the project will not compile when `ChatWebSocketHandler` (or `ChatService`) references this method.

**Why It Matters:**

Task 4 (chat orchestration) will fail at compile time. The missing method is trivial to add but, without an explicit step, it will be discovered as a build failure during implementation rather than prevented by the plan.

**Possible Solutions:**

1. Add an explicit step in Phase 3 (MessageService write seams) or Phase 4 (chat orchestration) to add `long countByConversationId(Long conversationId)` to `MessageRepository`. Spring Data JPA derives this query automatically from the method name.
2. Replace the count query with a check on the loaded history list: after Step 9 (load full history), check `history.size() == 1` (the USER message just appended is the only message). This avoids a separate count query entirely and uses data already in memory.

**Recommended Solution:** Option 2 — check `history.size() == 1` after loading the history list. It avoids an extra DB query, requires no change to `MessageRepository`, and the history is already loaded in the same flow. Add this clarification to Step 4.1.

**Decision:** Auto-resolved — the parent document was already patched by Finding 1's decision. Implementation Architecture item 4a step 5 uses `history.size() == 1` for first-turn detection (line: "check `history.size() == 1` after loading history in step 7 — per Finding 3"). Step 4.1a also specifies "first-turn detection via `history.size() == 1`." No reference to `countByConversationId` exists. No changes to `MessageRepository` are needed. No parent-document changes needed. **Date:** 2026-06-21.

---

### Finding 4 — ASSISTANT Save Failure After Successful Streaming Not Covered in Risk Assessment

**Severity:** 🟡 Moderate

**Description:**

The feature document defines the following order of operations in `handleTextMessage`:
1. Stream all chunk frames to the client (client sees complete response in UI).
2. Call `messageService.appendAssistantMessage()` to persist the ASSISTANT message.
3. Send the `done` frame with the saved `messageId`.

If Step 2 (`appendAssistantMessage`) throws — due to a DB error, connection timeout, or constraint violation — the client has already received the full content through chunk frames, but then receives an `error` frame. The ASSISTANT message is absent from the database. The conversation history shows an unanswered USER message, and the content the user read in the UI is permanently lost.

The Risk Assessment covers `session.sendMessage()` failure (Step 16 in the risk section) but does not address this symmetric failure: `appendAssistantMessage()` throwing after streaming completes.

**Why It Matters:**

This is a silent data consistency issue. The user believes the exchange happened (they read the full response), but history shows an incomplete conversation. On reload, the LLM response is gone. The accumulation of unanswered USER messages also misleads future LLM calls that replay history, since they will include a USER message with no paired ASSISTANT response.

**Possible Solutions:**

1. Accept this risk for MVP and add it explicitly to the Risk Assessment section with clear consequences and the recommended user behavior (reload the page; the USER message is still there; retry the send).
2. Save a placeholder ASSISTANT `MessageEntity` before streaming (empty content) and update it after streaming completes. This requires making `MessageEntity` mutable (adding `@PreUpdate` and an update method), which contradicts the immutability decision in the Message Entity feature. Not recommended without revisiting ADR alignment.
3. If extracting `ChatService` (Finding 1), annotate `processTurn()` as `@Transactional` and move the `session.sendMessage(chunk)` calls to a post-commit callback, ensuring the DB write commits before frames are sent. This inverts the order at the cost of delaying the streaming UX until the ASSISTANT message is saved. For MVP, this defeats the purpose of streaming.

**Recommended Solution:** Option 1 — document the risk explicitly. For MVP scale (a single business's internal tool), DB failures during message save are rare and recoverable. Add a bullet to the Risk Assessment: "If `appendAssistantMessage()` throws after all chunk frames have been sent, the client receives an `error` frame but has already seen the content. The ASSISTANT message will not appear in history. The USER message is retained. The user should retry the message; the orphaned USER message will be followed by a new complete exchange."

**Decision:** Option 4 — Catch & Convert. Catch `DataAccessException` around `appendAssistantMessage()` inside `processTurn()` and throw a checked `AssistantMessageSaveException` (extends `Exception`, matching codebase domain-exception convention). Checked exceptions do NOT trigger Spring rollback, so the transaction commits (USER message survives) while the handler receives the exception and sends an error frame. The user has already seen the full LLM response via chunks; the orphaned USER message provides retry context. This is ~15 lines of code (one try/catch + one exception class) and preserves real-time streaming UX. Parent document patched: Risk Assessment bullet updated to describe catch-and-convert semantics, `AssistantMessageSaveException` added to Implementation Architecture as new item 11a, item 4a step 13 updated with try/catch wrapper. **Date:** 2026-06-21.

---

### Finding 5 — Admin JWT WebSocket Rejection Should Return 403, Not 401

**Severity:** 🟢 Low

**Description:**

Step 1.5 specifies the test case: "WebSocket connect with valid Admin JWT → rejected (401, not EMPLOYEE)." An admin has a valid, properly signed JWT — they are fully authenticated. Returning 401 (Unauthorized) is semantically incorrect. 401 means "you have not provided valid credentials." 403 (Forbidden) means "you are authenticated but do not have permission." An authenticated admin connecting to an employee-only WebSocket endpoint is a Forbidden case.

This matches the existing behavior in `SecurityConfig.accessDeniedHandler()` which returns 403 for authenticated users accessing unauthorized resources.

**Why It Matters:**

Minor semantic correctness issue. The test will assert the wrong status code, and `JwtHandshakeInterceptor` will set the wrong status. While functionally the connection is still rejected, any monitoring, logging, or client-side error handling that distinguishes 401 from 403 will behave incorrectly.

**Possible Solutions:**

1. Update Step 1.5 to specify 403 for the admin-JWT case. Update `JwtHandshakeInterceptor` to return `HttpStatus.UNAUTHORIZED` when the token is missing/invalid and `HttpStatus.FORBIDDEN` when the token is valid but the role is not `ROLE_EMPLOYEE`.

**Recommended Solution:** Option 1.

**Decision:** Option 1. Updated Step 1.5 to specify 403 for the admin-JWT case (valid token, wrong role). Updated `JwtHandshakeInterceptor` description to return `HttpStatus.UNAUTHORIZED` (401) when the token is missing or invalid, and `HttpStatus.FORBIDDEN` (403) when the token is valid but the role is not `ROLE_EMPLOYEE`. **Date:** 2026-06-21.

---

### Finding 6 — MockWebServer/WireMock Test Dependency Not Added in Any Implementation Step

**Severity:** 🟢 Low

**Description:**

Step 2.5 specifies integration tests for `OpenRouterService` using "WireMock or `MockWebServer`." Testing a `WebClient`-based service that consumes an SSE stream requires a real HTTP server to control the response bytes. Neither `com.squareup.okhttp3:mockwebserver` nor `org.wiremock:wiremock-spring-boot` is present in `pom.xml`. The risk section mentions this but no implementation step explicitly adds the dependency.

**Why It Matters:**

A developer starting Task 2 who does not read the risk section will attempt to write `OpenRouterService` tests and discover mid-task that no HTTP mocking infrastructure is available, requiring an unplanned `pom.xml` change, compilation, and re-run.

**Possible Solutions:**

1. Add a new Step 2.0 (before Step 2.1): "Add `com.squareup.okhttp3:mockwebserver:<version>` to `pom.xml` in `<scope>test</scope>`. Verify it resolves cleanly with `./mvnw dependency:resolve`."

**Recommended Solution:** Option 1. A trivial step prevents a mid-task surprise.

**Decision:** Option B — `ExchangeFunction` (Spring built-in). No new dependency needed: `ExchangeFunction` is already available via `spring-boot-starter-webflux`. Tests inject a mock `ExchangeFunction` through `WebClient.Builder.exchangeFunction()` returning `ClientResponse` objects with pre-built `Flux<String>` bodies that simulate SSE lines. This tests the real `WebClient` encoder/decoder path without a real HTTP server, port binding, or thread coordination. `OpenRouterService` already injects `WebClient.Builder` (per Implementation Architecture item 10), so the implementation is already compatible. Parent document patched: Risk Assessment bullet updated to describe `ExchangeFunction` approach, Step 2.5 test descriptions updated to reference `ExchangeFunction` instead of MockWebServer/WireMock. No new Step 2.0 needed — no dependency to add. **Date:** 2026-06-21.

---

### Finding 7 — `conversationId` URI Parsing in `afterConnectionEstablished` Is Unspecified

**Severity:** 🟢 Low

**Description:**

Step 1.4 says "parse `conversationId` from `session.getUri().getPath()`." For a connection to `/ws/chat/42`, `getPath()` returns `/ws/chat/42`. Extracting `42` requires string splitting or regex. If the path segment is not a valid `Long` (e.g., a client connects to `/ws/chat/abc` or `/ws/chat/`), `Long.parseLong()` throws `NumberFormatException`. The feature document does not specify how to handle this or even mention that it needs error handling.

**Why It Matters:**

An unparseable `conversationId` in `afterConnectionEstablished` — before the try/catch in `handleTextMessage` — would propagate the exception up the call stack, likely closing the connection with a 500 rather than a clean error frame. This leaves the client disconnected with no useful error message.

**Possible Solutions:**

1. Add a note to Step 1.4: "Parse `conversationId` by splitting `session.getUri().getPath()` on `/` and taking the last segment. Call `Long.parseLong()` in a try/catch; if parsing fails, call `session.close(CloseStatus.BAD_DATA)` and return early. Store the parsed `conversationId` as a `Long` in `session.getAttributes()`."

**Recommended Solution:** Option 1.

**Decision:** Option B — `UriTemplate` + lazy extraction in `handleTextMessage`. `afterConnectionEstablished` becomes a log-only no-op. At the top of `handleTextMessage`, conversation ID is extracted from the URI path using Spring's `UriTemplate` (`new UriTemplate("/ws/chat/{conversationId}")`). If the pattern doesn't match or `Long.parseLong()` fails, an error frame is sent and the session closed with `CloseStatus.BAD_DATA` — the same `{type:"error"}` pathway used for all other errors. All application errors now flow through one error mechanism; no separate silent-close code path for the frontend. Parent document patched: Implementation Architecture item 4 `afterConnectionEstablished` updated to log-only no-op, `handleTextMessage` extended with `UriTemplate` extraction step before SecurityContext set. Step 1.4 updated to describe lazy extraction in `handleTextMessage`. **Date:** 2026-06-21.

---

## Findings Summary Table

| # | Title | Severity | Status |
|---|-------|----------|--------|
| 1 | `ChatWebSocketHandler` violates SRP — extract `ChatService` | 🟠 High | Done |
| 2 | SecurityContext ThreadLocal lifecycle — step 1.4 contradicts step 4.1 | 🟠 High | Auto-resolved |
| 3 | `MessageRepository.countByConversationId()` undefined | 🟡 Moderate | Auto-resolved |
| 4 | ASSISTANT save failure after streaming not in Risk Assessment | 🟡 Moderate | Done |
| 5 | Admin JWT rejection should be 403 Forbidden, not 401 Unauthorized | 🟢 Low | Done |
| 6 | MockWebServer/WireMock dependency not in implementation steps | 🟢 Low | Done |
| 7 | `conversationId` URI parsing unspecified — `NumberFormatException` risk | 🟢 Low | Done |

---

## Affected Documentation

- [[Features/to-do/OpenRouter-Chat-Integration]] — the feature document being reviewed; all findings map to changes needed here
- [[Memory/architecture]] — `models/chat/` package structure should be updated to include `ChatService` if Finding 1 is accepted
- [[ADRs/ADR-002-openrouter-as-service-not-entity]] — constrains `OpenRouterService` to remain a pure HTTP adapter with no DB access; relevant to Finding 1's `ChatService` extraction (ChatService does DB work; OpenRouterService does not)
- [[ADRs/ADR-008-agent-prompts-not-persisted-as-messages]] — the first-turn detection logic (Finding 3) is the mechanism that enforces this ADR's initPrompt-once rule
- [[Features/done/Message-Entity-and-Conversation-History]] — established `MessageRepository` interface; Finding 3 requires adding a method to this repository or changing the first-turn detection approach
