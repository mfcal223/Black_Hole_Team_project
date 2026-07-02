# WebSocket Chat

Endpoint: `{ws|wss}://{page-host}/ws/chat/{conversationId}` (same-origin via nginx in compose, via the Vite `/ws` proxy in direct-dev)
Auth: JWT passed as `?token=<jwt>` query parameter.
Auth required: **ROLE_EMPLOYEE**. Connection rejected if token is missing, invalid, or not EMPLOYEE.

This endpoint is **not in the OpenAPI spec** — springdoc does not introspect WebSocket handlers. This document is the authoritative reference.

---

## Connection

```
{ws|wss}://{page-host}/ws/chat/{conversationId}?token=<jwt>
```

- `conversationId` must be an existing conversation that belongs to the authenticated employee.
- The JWT is passed in the query string, not in headers. Browser WebSocket APIs do not support custom headers during the upgrade handshake.
- The frontend derives the URL from `window.location` (protocol-derived `ws:`/`wss:` + host) and connects same-origin. In the compose deployment nginx reverse-proxies the upgrade (`location /ws/` → `backend:8080`); in direct-Vite dev the `/ws` proxy entry forwards it to `localhost:8080`. There is **no hardcoded backend host/port** — never connect to `ws://localhost:8080` directly.

**Connection rejected (401):** Token missing or invalid.
**Connection rejected (403):** Token valid but user does not have `ROLE_EMPLOYEE`.

---

## Sending a message

After connecting, send a JSON string:

```json
{ "content": "What is the capital of France?" }
```

The server processes one message at a time per connection. Send the next message only after receiving a `done` or `error` frame from the previous turn.

---

## Receiving frames

The server streams frames as plain JSON strings over the WebSocket.

### chunk — partial LLM output

Arrives multiple times per turn as the LLM streams tokens.

```json
{
  "type": "chunk",
  "content": "The capital"
}
```

Concatenate all `content` values from `chunk` frames in order to reconstruct the full response.

### done — turn complete

Sent once when the LLM finishes generating.

```json
{
  "type": "done",
  "messageId": 42,
  "inputTokens": 28,
  "outputTokens": 9
}
```

| Field | Type | Notes |
|-------|------|-------|
| `messageId` | long | ID of the saved ASSISTANT message |
| `inputTokens` | int | Tokens consumed by the prompt |
| `outputTokens` | int | Tokens generated in the response |

After `done`, the full assistant message has been persisted. `GET /conversation/{id}/messages` will include it.

### error — turn failed, connection closed

```json
{
  "type": "error",
  "message": "OpenRouter API error: 429 Too Many Requests"
}
```

**The connection is closed immediately after the error frame is sent** — `ChatWebSocketHandler` calls `session.close()` after any exception. The client must reconnect and send a new message to retry.

---

## Full turn sequence

```
Client                          Server
  |                               |
  |-- connect ?token=<jwt> -----> |  JwtHandshakeInterceptor validates JWT
  |                               |  Stores authentication in WebSocket session
  |                               |
  |-- { "content": "..." } -----> |  ChatWebSocketHandler receives message
  |                               |  Restores SecurityContext from session
  |                               |  ChatTurnService.processTurn():
  |                               |    1. Verify employee auth
  |                               |    2. Verify conversation ownership
  |                               |    3. Validate model is set
  |                               |    4. Save USER message to DB
  |                               |    5. Load conversation history
  |                               |    6. Detect first turn (inject initPrompt as system msg)
  |                               |    7. Prepend recurrentPrompt to user text (if set)
  |                               |    8. POST to OpenRouter /chat/completions (stream: true)
  |<-- { type: "chunk", ... } --- |  Stream tokens as they arrive
  |<-- { type: "chunk", ... } --- |
  |<-- { type: "chunk", ... } --- |
  |                               |    9. Save ASSISTANT message to DB
  |<-- { type: "done", ... } ---- |  Turn complete
```

---

## What initPrompt and recurrentPrompt do

If the conversation has an `agentId`, the linked agent's prompts are applied:

- **`initPrompt`** — on the **first turn only**, injected as a `{ "role": "system", "content": "<initPrompt>" }` message at the top of the payload sent to OpenRouter. Not stored in the message history.
- **`recurrentPrompt`** — prepended to **every USER message in the conversation history** when building the OpenRouter payload (not just the current turn). Every USER row in the history gets the prefix applied at request time. Not stored in the message history.

If `agentId` is null, no system message is injected and no prefix is added.

---

## Prerequisites for a successful turn

1. Conversation must exist and belong to the authenticated employee.
2. Conversation must have `currentModelId` set (set at creation via `ConversationForm.modelId`, or updated via `PATCH /conversation/{id}/model`).
3. `AppSettings.openRouterApiKey` must be configured (set via `PATCH /app-settings`).
4. The model's `modelId` string must be a valid OpenRouter model identifier.

---

## CORS note

WebSocket connections are not subject to CORS (CORS is an HTTP-only mechanism). The `ws://` upgrade request bypasses CORS. The backend's `setAllowedOrigins("http://localhost:3000", "http://localhost", "https://localhost", "http://BHT.42.fr", "https://BHT.42.fr")` in `WebSocketConfig` is the **WebSocket-level origin check** (Spring's `AbstractHandshakeHandler` validates a registered origin allowlist on every upgrade). This check is **load-bearing**, not merely defense-in-depth: browsers send an `Origin` header on every WS upgrade, and Spring validates it even for same-origin upgrades — same-origin routing (nginx `/ws/` + page-location URL in the frontend) removes the *cross-origin* mismatch, not this check. Connections whose `Origin` is not in the allowlist are rejected with `403 Invalid CORS request`. Do **not** use `setAllowedOriginPatterns("http*://localhost*")` (omits the prod `BHT.42.fr` host and over-matches lookalike subdomains).
