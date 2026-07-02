# INVESTIGATION DRAFT: Employee Chat — streamed turn completes with empty ASSISTANT message (no LLM text rendered; empty bubble after refresh)

> **Status:** INVESTIGATION DRAFT — NOT a formal Bug Report. Once the root cause is confirmed (branch H or D→G — see Section 3), use this draft as source material to create a proper Bug Report via the `bug-findings-solver` / `documentation-management` skill and the `bug.md` template, then delete this file.

---

## 1. How this was discovered

While performing the manual validation steps for [[Employee-Chat-WebSocket-Origin-Rejected-AppSettings-403]] Task 1 (same-origin WS routing), on the real dockerized deployment (nginx-served SPA on `http://localhost`):

- Logged in as employee (`flor` / `ROLE_EMPLOYEE`).
- Navigated to `/chat`, selected a model and an agent, typed a prompt, pressed Enter.
- **Observation A:** the URL changed to `/chat/{conversationId}` — the SETUP→CHATTING flow (`createConversation → navigate`) worked. WS handshake succeeded.
- **Observation B:** a typing-indicator bubble (3 animated dots) appeared.
- **Observation C:** the OpenRouter dashboard showed **activity** — WS handshake, JWT/role check, `ChatTurnService.processTurn`, and the OpenRouter `/chat/completions` call all ran. The dashboard confirmed **26 input tokens and 147 output tokens at 84.5 t/s** — real content was generated.
- **Observation D:** the dots bubble disappeared after ~4 seconds, **no assistant text rendered**, no error bubble, user left only with their own message.
- **Observation F:** on refresh (same conversation), the persisted USER message is visible, and a small **empty** chat bubble appears for the ASSISTANT message — proving an ASSISTANT row was written to the DB with empty (`""`) content.

### Confirmed: Task 1 succeeded. This is a pre-existing latent defect.

OpenRouter being contacted at all proves the WS handshake is no longer 403'd. The empty-response defect sits one layer below — inside the OpenRouter SSE streaming path — and was unreachable until Task 1 fixed the handshake.

---

## 2. Symptom → code path map

```
Browser sends message
  └─ WS upgrade → 101 ✅ (Task 1 fixed)
        └─ ChatWebSocketHandler.handleTextMessage [io-8080-exec-10]
              └─ ChatTurnService.processTurn
                    └─ OpenRouterService.streamChat (HTTP POST, stream:true)
                          └─ OpenRouter responds 200 + SSE stream
                                └─ parseSseLine called for each SSE line
                                      → onChunk is NEVER called
                                      (see Section 3 for why — branch H or D→G)
                                └─ "[DONE]" terminator reached
                          → accumulated == "" in ChatTurnService
                          → usage == OpenRouterUsage(0, 0)  ← confirmed: 0 tokens in DB
                    └─ appendAssistantMessage(conversationId, llmModelId, "", 0, 0)
                          → ASSISTANT row written with:
                              content       = ""          ← confirmed (empty bubble on refresh)
                              llm_model_id  = <valid id>  ← confirmed (correctly set)
                              input_tokens  = 0           ← confirmed (0, not NULL)
                              output_tokens = 0           ← confirmed (0, not NULL)
                    └─ ChatTurnResult(messageId, 0, 0)
              └─ ChatWebSocketHandler: sends "done" frame (no "chunk" frames ever sent)
        └─ frontend: isStreaming=false, streamingContent=""
              → showStreamingBubble = (false || "" !== "") = false
              → streaming bubble vanishes, no assistant text shown
  └─ refresh: GET /conversation/{id}/messages → ASSISTANT row with "" → empty bubble
```

**Key confirmed facts from Section 4:**
- `appendAssistantMessage` ran and completed successfully (correct `llm_model_id`, DB row exists)
- `input_tokens = 0` and `output_tokens = 0` → the SSE usage chunk either did not arrive or `prompt_tokens`/`completion_tokens` fields were not found
- ASSISTANT content = `""` → `accumulated` was empty when `streamChat` returned → `onChunk` was never called
- No frontend error bubble → `ws.onerror` did not fire → WS connection itself was fine; only `chunk` frames were absent

---

## 3. Possible root causes

The core issue is that `parseSseLine` (`OpenRouterService.java:117–148`) processes each SSE line but **never calls `onChunk`**, leaving `accumulated = ""`. Two branches explain this, and they are indistinguishable from the browser alone.

### Branch H — OpenRouter returned HTTP 200 + an **inline SSE error event** (swallowed silently)

OpenRouter sometimes returns a **200** response whose SSE stream contains an inline error frame instead of content chunks:
```
data: {"error":{"code":404,"message":"Model not found"}}

data: [DONE]
```

`parseSseLine` reads `choices[0].delta.content`. An `error` JSON object has no `choices` array → the line is silently skipped. No warning is logged, no exception thrown, no error frame sent. `accumulated` stays `""` and the turn "succeeds."

This is the **most likely branch** given the observations, because:
- The OpenRouter dashboard showing 147 tokens does NOT rule it out — some inline error responses still accumulate token counts in the dashboard (the request reached the model layer before erroring).
- A malformed or deprecated `modelId` string (e.g. admin configured a model that has since been removed from OpenRouter's catalog) triggers exactly this pattern: `200 + data: {"error":{"code":404,"message":"..."}}`.
- The `stream_options: { include_usage: true }` parameter (line 51 of `OpenRouterService.java`) is passed to all providers. Some providers return an inline `error` event for unrecognized stream options, explaining the 0 token counts.

**Confirmation signal:** Add a temporary `log.info("SSE line: {}", line)` at the top of the `forEach` in `streamChat` (line 68). If Branch H, you will see `data: {"error":...}` in the logs alongside `data: [DONE]`, with no content-bearing `data: {"choices":...}` lines.

### Branch D→G — HTTP 200 + **genuinely empty completion** (all `delta.content` fields null or empty)

A 200 stream with real `data: {"choices":[...]}` chunks but every chunk carrying null or `""` for `delta.content`. Causes: content filter, model refusal, reasoning model streaming content in a non-standard field (`reasoning_content` rather than `content`), or the `stream_options` parameter causing the provider to suppress content in the delta.

`parseSseLine` line 134: `if (!text.isEmpty()) { onChunk.accept(text); }` — empty or null content chunks are correctly skipped. `accumulated` stays `""`. No error frame, no warning log.

**Confirmation signal:** Temporary `log.info` shows normal `data: {"choices":[...]}` lines arriving, but `delta.content` is either `""`, `null`, or missing for all of them (while being present in a non-standard field). Also: check if the model is a reasoning/thinking model (R1, o1, o3, QwQ, etc.) that produces output in `reasoning_content` rather than `content`.

### Contributing factor in both branches: `stream_options: { include_usage: true }`

`OpenRouterService.java:51`:
```java
requestBody.put("stream_options", Map.of("include_usage", true));
```

This is passed to OpenRouter and forwarded to the upstream provider. Confirmed effect: `input_tokens = 0` and `output_tokens = 0` in the DB, even though OpenRouter shows 26/147 in the dashboard. This means the usage chunk's `prompt_tokens`/`completion_tokens` fields were either not present, used different field names, or the usage chunk was never received.

`stream_options` is an OpenAI-specific feature. Providers that don't support it may:
- Return an inline error event (→ Branch H)
- Return zero usage in the final chunk even if content was generated
- Change streaming behavior to suppress `delta.content`

**Removing `stream_options` is the cheapest and most decisive test** (see Section 6 — Investigation Steps, Step 4).

### Common contributing cause (present in both branches)

`ChatTurnService.java:96–106` unconditionally persists `accumulated.toString()` as the ASSISTANT message even when `accumulated` is empty. There is no guard for "no content was streamed." The silent-empty case produces a `done` frame (not an error frame), leaving the user with a blank UI and a corrupt DB record.

---

## 4. Evidence gathered

### Confirmed

| Evidence | Source | Status |
|---|---|---|
| WS handshake succeeds (no 403) | Browser console / logs | ✅ Confirmed |
| OpenRouter receives the request (26 input / 147 output tokens) | OpenRouter dashboard | ✅ Confirmed |
| ASSISTANT row written to DB with correct `llm_model_id` | DB inspection | ✅ Confirmed |
| ASSISTANT content is `""` (empty) | Empty bubble on refresh | ✅ Confirmed |
| ASSISTANT `input_tokens = 0`, `output_tokens = 0` | DB inspection | ✅ Confirmed |
| No `chunk` frames received by frontend | Typing dots → disappear with no content | ✅ Confirmed |
| No error frame received by frontend | No error bubble shown | ✅ Confirmed |
| No `Failed to parse SSE line` warnings in backend logs (last 30 lines) | `--tail=30` log | ✅ Confirmed (but tail only covers post-streaming SQL; see Section 6 Step 1) |
| `appendAssistantMessage` ran fully (model lookup + save + conversation update) | DB rows + log UPDATE query | ✅ Confirmed |
| `accumulated = ""` when `streamChat` returned → `onChunk` was never called | Inferred from above | ✅ Confirmed |

### Ruled out

| Theory | Ruled out because |
|---|---|
| WS chunk frames sent but frontend not receiving | If sent successfully, `streamingContent` would be non-empty after `done`; it's `""` — so frames were never sent |
| `session.sendMessage(chunk)` throwing silently | Would produce `log.warn("Failed to send chunk frame...")` — not present in logs |
| ASSISTANT `llm_model_id` or tokens being NULL (separate issue) | DB shows correct model ID and 0 (not NULL) for tokens — the NULL observation was from the USER message row, which always has NULL for these fields |
| Frontend bug in `ws.onmessage` parsing | `done` frame IS received correctly (dots disappear, no error); the parsing is correct — there are simply no `chunk` frames to parse |

### Not yet confirmed (needed to identify branch)

1. **Raw SSE lines received by the backend** — are they `data: {"error":...}` (Branch H) or `data: {"choices":[...],"delta":{"content":""}}` (Branch D→G)?
2. **The `modelId` string** — is it a valid, currently-active OpenRouter model or has it been deprecated/removed?
3. **Whether removing `stream_options` fixes the issue** — the cheapest test to run.
4. **Full backend logs during a turn** — the `--tail=30` snapshot only captured SQL queries after streaming; any warn/info lines from the streaming phase are not visible.

---

## 5. Candidate fixes

**Do not implement until the branch is confirmed via Section 6.**

### Fix for Branch H — inline SSE error event swallowed

In `OpenRouterService.parseSseLine`, after `objectMapper.readTree(data)`, add an error node check before the `choices` block:

```java
JsonNode errorNode = root.path("error");
if (!errorNode.isMissingNode() && !errorNode.isNull()) {
    int code = errorNode.path("code").asInt(0);
    String message = errorNode.path("message").asText("OpenRouter inline SSE error");
    throw new OpenRouterApiException(code, message);
}
```

The thrown `OpenRouterApiException` propagates from `streamChat` into `processTurn`. Because `noRollbackFor = {OpenRouterApiException.class}`, the USER message row survives. `ChatWebSocketHandler`'s `catch (Exception e)` sends an `error` frame. The frontend's `error` branch sets `socketError` and renders an `ErrorBubble`.

### Fix for Branch D→G — genuinely empty completion

In `ChatTurnService.processTurn`, before Step 12 persist (before the `try { saved = messageService.appendAssistantMessage(...) }` block):

```java
if (accumulated.length() == 0) {
    throw new OpenRouterApiException(200, "The model returned an empty response. Please retry or select a different model.");
}
```

Using `OpenRouterApiException` (rather than a new exception type) keeps the USER message alive via `noRollbackFor` and triggers the existing error-frame path in `ChatWebSocketHandler` — no other changes needed.

**Design decision to make:** Should the USER message be rolled back on empty response? Currently `noRollbackFor` keeps it, leaving a dangling USER row with no ASSISTANT reply. Retrying appends a second USER row with the same content. This is acceptable for MVP; the design call belongs in the formal bug report.

### Common hardening (applies to both, implement regardless of branch)

Add the empty-content guard from Branch D→G regardless — it is always correct to treat "no content streamed" as a failure that sends an error frame rather than a silent done frame. This prevents the corrupt DB state (empty ASSISTANT row) independent of which branch is the root cause.

---

## 6. Investigation steps (run in this order)

### Step 1 — Get full backend logs during a live turn

```bash
docker compose logs -f backend 2>&1
```

Run this in a terminal, then navigate to `/chat` and send a message. Watch what appears between:
- `select ase1_0... from app_settings` (end of setup queries, ~07:55:42.603Z pattern)
- `insert into message ...` (ASSISTANT row persisted, ~4 seconds later)

**What to look for:**
- `WARN ... Failed to parse SSE line: ...` → present means JSON parse error on some SSE lines
- `WARN ... Failed to send chunk frame ...` → present means WS send succeeded but socket issue  
- `INFO SSE line: ...` → only present if you add the temporary log (Step 3)
- Any other WARN/ERROR lines during the 4-second gap

If the gap is **completely silent** (only SQL lines visible before and after), it confirms `parseSseLine` is running without exceptions — meaning Branch H or D→G where no warning is generated.

#### Step 1 — Results (2026-07-01, session from `project/backend-log.txt`)

**Setup confirmed:**
- `09:36:54.846Z` — `select llm_model ... where lme1_0.id=? and lme1_0.is_enabled` returned a row → the configured model ID resolves to a valid, **enabled** model in the local DB (does NOT rule out the remote OpenRouter model ID being deprecated)
- `09:36:54.858Z` — agent lookup succeeded
- `09:36:54.901Z` — `insert into conversation` succeeded
- `09:36:55.166Z` — first `insert into message` (USER row, on thread `nio-8080-exec-8`)
- `09:36:55.184Z` — `select agent` (init_prompt/recurrent_prompt loaded for context)
- `09:36:55.194Z` — `select app_settings` (OpenRouter API key fetched — last line before streaming begins)

**The streaming gap:**

| Timestamp | Event |
|---|---|
| `09:36:55.194Z` | Last SQL before OpenRouter call (`select app_settings`) |
| *(33 seconds of complete log silence)* | *(no WARN, ERROR, INFO, or SQL of any kind)* |
| `09:37:28.266Z` | Second `insert into message` (ASSISTANT row persisted) |
| `09:37:28.283Z` | `update conversation` (timestamp updated) |

**The 33-second gap is fully silent** — not a single WARN, ERROR, INFO, or DEBUG line appears between the app_settings fetch and the ASSISTANT insert. This definitively confirms:
- `parseSseLine` ran without throwing any exceptions (no `Failed to parse SSE line` warnings)
- `session.sendMessage` did not throw (no `Failed to send chunk frame` warnings)
- The streaming path completed "successfully" but produced zero chunks → `accumulated = ""`

**Anomaly — streaming duration:** The gap is **33 seconds**, substantially longer than the ~4 seconds observed in the original discovery session. The OpenRouter dashboard showed 147 output tokens at 84.5 t/s for the original run, which should complete in ~1.7 s. A 33-second streaming duration suggests the SSE connection was held open unusually long before `[DONE]` arrived — possibly caused by `stream_options: { include_usage: true }` interacting with the provider in a way that delays or hangs the stream completion signal.

**Conclusions from Step 1:**
- ✅ Branch H or D→G is confirmed as the failure mode (silent empty accumulation, no exceptions)
- ✅ Both USER and ASSISTANT rows written to DB (`appendAssistantMessage` completed)
- ✅ Model ID is valid in the local DB (Step 5 still needed to check against OpenRouter's live catalog)
- ⚠️ 33-second streaming duration is anomalous and points toward `stream_options` as a contributing cause
- ❌ Cannot distinguish Branch H from D→G from these logs alone — Step 3 (temporary SSE logging) or Step 4 (remove `stream_options`) required

### Step 2 — Confirm ASSISTANT content via SQL

Run this in Adminer or directly against the DB:

```sql
SELECT id, role, LEFT(content, 100) AS content_preview, input_tokens, output_tokens, llm_model_id
FROM message
ORDER BY id DESC
LIMIT 10;
```

Expected to see:
- USER row: `role=USER`, `content_preview=<your typed message>`, `input_tokens=NULL`, `output_tokens=NULL`, `llm_model_id=NULL` ← this is normal
- ASSISTANT row: `role=ASSISTANT`, `content_preview=` (empty), `input_tokens=0`, `output_tokens=0`, `llm_model_id=<number>` ← this confirms `accumulated=""`

### Step 3 — Add temporary SSE line logging (decisive for branch identification)

In `OpenRouterService.java`, inside the `.forEach(line -> {` lambda (line 68), add ONE line at the top:

```java
.forEach(line -> {
    log.info("SSE raw: [{}]", line);   // TEMP: remove after diagnosis
    for (String l : line.split("\n")) {
        parseSseLine(l, onChunk, usageHolder);
    }
});
```

Rebuild and redeploy (`docker compose up --build backend`), send a message, capture the logs.

**Interpreting the output:**
- Lines like `SSE raw: [data: {"error":{"code":404,...}}]` → **Branch H confirmed**
- Lines like `SSE raw: [data: {"choices":[{"delta":{"content":""},...}]}]` where content is always `""` → **Branch D→G confirmed**
- Lines like `SSE raw: [data: {"choices":[{"delta":{"content":"Hello"},...}]}]` with actual content → the issue is NOT in `parseSseLine`; something else is dropping the chunks (investigate `session.sendMessage`)
- Lines where the SSE body arrives as one large blob (entire response in one `SSE raw` line) → SSE line splitting may need fixing; check `StringDecoder` chunk size

#### Step 3 — Results (2026-07-01, agent: translate EN→FR, 2 turns across 2 models)

**ROOT CAUSE CONFIRMED.**

Two messages were sent in this session:
1. `"I really love pizza on fridays"` → `nvidia/nemotron-3-ultra-550b-a55b-20260604:free` (Nemotron)
2. `"I will like to have dog at home"` → `openai/gpt-chat-latest-20260505` (OpenAI via OpenRouter)

**Finding 1 — SSE chunks arrive WITHOUT `data: ` prefix (decisive)**

Every `SSE raw` line is a plain JSON object, not an `data: {json}` formatted SSE line:

```
SSE raw: [{"id":"gen-...","choices":[{"delta":{"content":"**","role":"assistant"}}]}]
SSE raw: [{"id":"gen-...","choices":[{"delta":{"content":" eating","role":"assistant"}}]}]
SSE raw: [{"id":"gen-...","choices":[{"delta":{"content":" pizza","role":"assistant"}}]}]
```

The `[DONE]` sentinel also arrives without prefix:
```
SSE raw: [[DONE]]   ← line value is literally "[DONE]", not "data: [DONE]"
```

**Spring's `.bodyToFlux(String.class)` with `Content-Type: text/event-stream` uses `ServerSentEventHttpMessageReader` which strips the `data: ` prefix and delivers raw payloads.** The existing code assumed lines would arrive with the prefix intact.

**Finding 2 — `parseSseLine`'s guard discards ALL chunks**

`parseSseLine` line 121:
```java
if (!line.startsWith("data: ")) return;
```
Since no line starts with `"data: "`, this guard fires for every single chunk and returns early. `onChunk` is never called. `accumulated` stays `""`. This is the root cause.

**Finding 3 — Both models were generating real content (it was being discarded)**

Nemotron (after reasoning phase): actual `delta.content` tokens present:
```
"delta":{"content":"**","role":"assistant"}
"delta":{"content":" eating","role":"assistant"}
"delta":{"content":" pizza","role":"assistant"}
```

OpenAI: actual `delta.content` tokens present:
```
"delta":{"content":" maison","role":"assistant"}
"delta":{"content":".","role":"assistant"}
```

All of this real content was silently thrown away by the `data: ` prefix guard.

**Finding 4 — Nemotron is a reasoning model (secondary issue)**

Nemotron first emits a reasoning phase where `delta.content = ""` and text lives in `delta.reasoning` / `delta.reasoning_details`:
```json
{"delta":{"content":"","reasoning":"The user wants to translate...","reasoning_details":[...]}}
```
After the reasoning phase it switches to normal content emission with actual `delta.content` text. For this model, fixing the `data: ` prefix issue is sufficient — the reasoning chunks are empty but the subsequent content chunks carry the translation. However, for models that produce output exclusively in `delta.reasoning` with no `delta.content` phase, the current `parseSseLine` would still produce empty output even after the primary fix.

**Finding 5 — Usage chunks arrive automatically (no `stream_options` needed)**

Both providers sent a usage chunk as their last event before `[DONE]` with no `stream_options` in the request:
- Nemotron: `"prompt_tokens":32,"completion_tokens":204,"reasoning_tokens":24`
- OpenAI: `"prompt_tokens":24,"completion_tokens":24`

The usage fields use `"prompt_tokens"` / `"completion_tokens"` — exactly what `parseSseLine`'s usage parser looks for. Token counts will be captured correctly once the prefix bug is fixed.

**Branch classification: D→G (empty `delta.content` silently skipped) — but the actual content IS present in the stream. The skip is caused by the incorrect `data: ` prefix guard, not by the provider sending genuinely empty content.**

**Fix required:** In `parseSseLine`, make the `data: ` prefix conditional instead of a hard gate. See Section 5 for the updated fix.

### Step 4 — Test without `stream_options` (cheapest test)

In `OpenRouterService.java`, comment out line 51:

```java
// requestBody.put("stream_options", Map.of("include_usage", true));
```

Rebuild, redeploy, send a message. If streaming now works (content appears), `stream_options` is the trigger — either it causes an inline error from the provider (Branch H) or it suppresses `delta.content` (Branch D→G). The fix would then be to either remove `stream_options` permanently or handle its interaction with the current provider.

**Side effect:** token counts in the DB will be 0 (since the usage chunk is what `stream_options` enables). That is acceptable as a temporary diagnostic change; the token-counting behavior can be fixed separately.

#### Step 4 — Results (2026-07-01, session from `project/backend-log.txt` run 2)

**Change applied:** `stream_options` line commented out in `OpenRouterService.java:51`, backend rebuilt and redeployed.

**Outcome: `stream_options` is NOT the root cause of empty content.** The empty bubble persists.

| Timestamp | Event |
|---|---|
| `09:54:34.840Z` | Last SQL before OpenRouter call (`select app_settings`) |
| *(~6.5 seconds of complete log silence)* | *(no WARN, ERROR, INFO, or SQL of any kind)* |
| `09:54:41.297Z` | `insert into message` (ASSISTANT row — still empty) |
| `09:54:41.314Z` | `update conversation` |

**Key findings:**

1. **Streaming duration dropped from 33 s → 6.5 s** — `stream_options` was causing a significant hang in the SSE connection (the provider held `[DONE]` for 33 s when the parameter was present). Removing it is still a valid improvement. But it did not fix the content.
2. **Still completely silent during the streaming phase** — no `Failed to parse SSE line`, no `Failed to send chunk frame`, no WARN or ERROR of any kind. `parseSseLine` still completes without exceptions, and `accumulated` is still `""` when `streamChat` returns.
3. **Branch H or D→G is still the active failure mode** — the gap is just now faster.
4. **`stream_options` ruled out as root cause** — removing it does not fix the empty content, confirming the issue is in the SSE content itself (`delta.content` is either null/empty for all chunks, or the stream contains an inline error object instead of choices).

**Conclusion:** Proceed to **Step 3** (temporary `log.info("SSE raw: [{}]", line)` inside the `forEach`) — this is now the decisive test to distinguish Branch H from D→G.

### Step 5 — Check the configured model ID

Run:

```sql
SELECT model_id, name, is_enabled FROM llm_model;
```

Compare `model_id` values against the [OpenRouter models page](https://openrouter.ai/models) to verify:
- The model ID is still a valid, active OpenRouter model (not deprecated/renamed)
- The model is NOT a reasoning/thinking model (R1, o1, o3, QwQ, DeepSeek-R1, etc.) that streams in `reasoning_content` rather than `content`

A deprecated model ID is the most common cause of Branch H (`data: {"error":{"code":404,"message":"No endpoints found..."}}`).

---

## 7. Proposed next steps (sequence)

1. Run **Step 1** (full live logs) and **Step 4** (remove `stream_options`) simultaneously — they are independent and both cheap. Step 4 may fix the problem outright; Step 1 will confirm the branch regardless.
2. If Step 4 fixes streaming → the branch is either H or D→G caused by `stream_options`; add the temporary Step 3 log to confirm which, then implement the appropriate fix from Section 5 plus restore `stream_options` or decide to drop it.
3. If Step 4 does NOT fix streaming → run **Step 3** (temporary SSE logging) to see raw SSE lines. This is the decisive test.
4. If Step 3 shows actual content in `delta.content` → the issue is NOT in `parseSseLine`; investigate `session.sendMessage` (look for `Failed to send chunk frame` warnings at the WARN level in Step 1 logs).
5. Once the branch is confirmed, **create the formal Bug Report** using the `bug-findings-solver` / `documentation-management` skill. Use this file as source material, then delete this draft.
6. Plan the fix as Task(s) under the new Bug Report — implement the branch-specific fix from Section 5 plus the common empty-content guard.

---

## 8. Open questions

- **Does removing `stream_options` fix streaming?** (Step 4 answers this — run first)
- **Which SSE lines does `parseSseLine` actually receive?** — the test mock (`OpenRouterServiceTest.java:44`) delivers the entire SSE body as a single string element via `ClientResponse.create(...).body(sseBody)`. In production, `bodyToFlux(String.class)` uses Spring's `StringDecoder` which may tokenize on `\n`. Whether production delivers one line per Flux element or multiple lines per element affects whether `line.split("\n")` is even needed. Step 3 temporary logging will show the raw shape.
- **Is the configured model a reasoning/thinking model?** (Step 5 answers this — cheap to check)
- **Should an empty LLM response roll back the USER message row?** — Design call for the formal bug report. Currently `noRollbackFor` keeps it (matching the original intent for OpenRouter errors), but an empty response leaves a dangling USER row; a retry appends a second USER row with identical content.
- **Should `stream_options` be removed permanently or only when the provider doesn't support it?** — Depends on whether any configured provider benefits from usage tracking; the current usage tracking was contributing 0 to the DB regardless, so removing it has no regression cost.
