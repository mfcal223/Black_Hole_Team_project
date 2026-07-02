# Task: Implement Token Usage Dashboard (Backend + Frontend)

**Tags:** `#task` `#current` `#high-complexity` `#parent-token-usage-dashboard`

- **Parent:** `[[Features/to-do/Token-Usage-Dashboard]]`
- **Parent Type:** Feature
- **Related Steps:**
  - Phase 1 (Backend Endpoint)
  - Phase 2 (Frontend Dashboard)
  - Phase 3 (Verification)
- **Estimated Complexity:** High
- **Review Status:** Final iteration. Incorporates findings from `Review-of-plan-tokens-task-4` (code-integration precision fixes). This is the single source of truth for this task — previous iterations have been archived.

---

# Goal

Implement a complete **admin-only Token Usage Dashboard** consisting of:

- A Spring Boot endpoint that aggregates platform-wide token consumption by hour or minute using database-level date truncation, sourced from an **append-only, deletion-resistant** record of consumption.
- A React page that renders the resulting time-series using **Recharts**.

---

# Parent Context

The parent Feature specifies:

- **Data source:** a new append-only `TokenUsageEntry` table, written at **assistant message creation time only**
  - `employeeId`
  - `inputTokens`
  - `outputTokens`
  - `createdAt`
- **Endpoint**
  - `GET /admin/token-usage?from=...&to=...&interval=hour|minute`
- **Security**
  - `@PreAuthorize("hasRole('ADMIN')")`
- **Frontend architecture**
  - Feature-based folder (`src/features/employees/` pattern)
- **Navigation**
  - `/token-usage`
  - Sidebar entry for admins
- **Charting**
  - `recharts`
- **Verification**
  - `docker compose logs -f`

This task covers the complete end-to-end implementation.

---

# Scope Decisions

## Historical Data Protection — Resolved via decoupled ledger, NOT soft-delete

Token consumption must survive deletion of the `Message`/`Conversation` it came from. Solved with an independent, append-only `TokenUsageEntry` table with no cascading FK to `Conversation`/`Message`. See Decision 1.

## DATE_TRUNC Portability — Fixed

The truncation unit is never passed as a dynamic literal into `DATE_TRUNC`. A `CASE` expression selects between two hardcoded literals (`'minute'` / `'hour'`); `:interval` is only ever compared with `=`.

## H2 Compatibility Fallback

Global H2 test profile mode (`MODE=MySQL`) must **not** be changed. If `DATE_TRUNC` is unsupported, fall back to a profile-scoped native query instead.

## Ledger scope: assistant messages only

The ledger is written only in `MessageService.appendAssistantMessage`, once per assistant turn, using the real token counts. User messages never get a ledger row (they don't consume LLM tokens).

## employeeId attribution

`employeeId` on each ledger row = `conversation.getEmployee().getId()` — the conversation owner. Documented as "the ledger attributes token cost to the conversation owner, not to whichever process triggered the assistant turn."

## Backfill

Out of scope. Dashboard reflects usage from deployment forward only.

## Method signature & save ordering (resolved, this iteration)

`MessageService.appendAssistantMessage` keeps its **existing signature** — `(Long conversationId, Long llmModelId, String content, int inputTokens, int outputTokens)` — no refactor to accept an `OpenRouterUsage` object, since that would require also updating the caller in `ChatTurnService.processTurn(...)`, and the existing primitive `int` parameters are sufficient. The ledger row is built directly from the existing `inputTokens`/`outputTokens` parameters, **after** `messageRepository.save(message)` returns, so `message.getId()` and `message.getCreatedAt()` are guaranteed populated before being copied into `TokenUsageEntry`.

`OpenRouterUsage.inputTokens` / `outputTokens` are primitive `int`, never `null` — no null-normalization logic or null-path tests are needed for this data; the only relevant edge case is a legitimate value of `0`, which is stored as-is.

---

# Preconditions / Dependencies

- Docker Compose stack starts successfully

```bash
docker compose up
```

- Backend compiles

```bash
./mvnw -q compile
```

- Frontend builds

```bash
npm install
npm run build
```

- Admin user exists
- Confirmed integration points (from codebase review):
  - `srcs/backend/src/main/java/com/BHT/models/message/MessageService.java`
    - `appendUserMessage(...)` — leaves `inputTokens`/`outputTokens` unset (`null` on `MessageEntity`). **No ledger write here.**
    - `appendAssistantMessage(Long conversationId, Long llmModelId, String content, int inputTokens, int outputTokens)` — **existing signature, unchanged.** Ledger write happens here, using these same `int` parameters.
  - `srcs/backend/src/main/java/com/BHT/models/chat/ChatTurnService.java`
    - `processTurn(...)` calls both message-creation methods within a single transaction, and already passes `usage.getInputTokens()` / `usage.getOutputTokens()` as separate `int` args to `appendAssistantMessage` — **no change needed in this caller.**
  - `srcs/backend/src/main/java/com/BHT/models/chat/openrouter/OpenRouterUsage.java`
    - `inputTokens` / `outputTokens` are primitive `int` — never null.
  - `srcs/backend/src/main/java/com/BHT/models/message/MessageEntity.java`
    - `inputTokens`/`outputTokens` are nullable `Integer`, only set for assistant messages.

---

# Skills and Documentation Preparation

## Skills Reviewed

- ✅ documentation-management
- ✅ solid-deep-design
- ✅ tdd
- ✅ find-docs *(conceptually only)*
- ❌ glossary-management *(not needed)*

---

## Documentation Reviewed

- `[[Backend-Architecture]]`
- `[[Backend-Model-Anatomy]]`
- `[[MVP-Entity-Model]]`
- `[[Login_and_authentication_explained]]`

---

## Related Existing Code

Backend

- `srcs/backend/src/main/java/com/BHT/models/message/MessageEntity.java`
- `srcs/backend/src/main/java/com/BHT/models/message/MessageService.java`
- `srcs/backend/src/main/java/com/BHT/models/chat/ChatTurnService.java`
- `srcs/backend/src/main/java/com/BHT/models/chat/openrouter/OpenRouterUsage.java`
- `srcs/backend/src/main/java/com/BHT/shared/tools/AuthUserUtil.java`
- `srcs/backend/src/main/java/com/BHT/models/hq/admin/AdminController.java`
- `srcs/backend/src/main/java/com/BHT/models/hq/admin/AdminServiceImpl.java`
- `srcs/backend/src/main/resources/application-test.properties`

Frontend

- `srcs/frontend/src/features/employees/services/employeeService.ts`
- `srcs/frontend/src/features/employees/hooks/useEmployeeList.ts`
- `srcs/frontend/src/router.tsx`
- `srcs/frontend/src/layouts/Sidebar.tsx`

---

# Implementation Details

## Overall Approach

Backend:

- Introduce a new, isolated `TokenUsageEntry` entity + table — the system of record for the dashboard.
- Write exactly one `TokenUsageEntry` row per **assistant** message, inside `MessageService.appendAssistantMessage`, after the message itself is persisted, in the same transaction.
- Keep controller thin.
- Service performs authorization and validation.
- Repository performs grouped JPQL aggregation over `TokenUsageEntry`, with dialect-safe `DATE_TRUNC`.

Frontend:

Mirror the Employees feature:

```
types
services
hooks
components
page
route
sidebar
```

---

# Files to Create / Modify

## Backend (Create)

- [x] `TokenUsageEntry.java` (new entity — append-only ledger; Lombok-based, see Step 1)
- [x] `TokenUsageEntryRepository.java` (write-side repository, used inside `MessageService.appendAssistantMessage`)
- [x] `TokenUsagePoint.java` (DTO for aggregated points)
- [x] `TokenUsageRepository.java` (read-side aggregation repository)
- [x] `TokenUsageService.java`
- [x] `TokenUsageController.java`

Location:

```
srcs/backend/src/main/java/com/BHT/models/metrics/
```

---

## Backend (Modify)

- [x] `MessageService.java` — add ledger write inside `appendAssistantMessage(...)` only, **no signature change**, ledger save placed after `messageRepository.save(message)`.
- [x] `TokenUsageControllerTest.java`

> `MessageEntity.java`, `ChatTurnService.java`, and `OpenRouterUsage.java` are **not modified**.

---

## Frontend (Create)

```
src/features/tokenUsage/
    types.ts
    services/tokenUsageService.ts
    hooks/useTokenUsage.ts
    components/TokenUsageChart.tsx
    components/TokenUsageControls.tsx
```

Create page:

```
src/pages/TokenUsagePage.tsx
```

---

## Frontend (Modify)

- [x] `router.tsx`
- [x] `Sidebar.tsx`
- [x] `package.json`

---

# Step-by-Step Implementation

---

# Step 1 — Create `TokenUsageEntry` entity (Lombok conventions)

## Goal

Define the append-only ledger table that survives message/conversation deletion, following the project's existing Lombok style.

```java
package com.BHT.models.metrics;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Table(
    name = "token_usage_entry",
    indexes = {
        @Index(name = "idx_token_usage_created_at", columnList = "created_at")
        // No index on employee_id: not currently queried by employee.
        // Add it back (with the corresponding WHERE/GROUP BY in the repository)
        // if/when per-employee breakdown is implemented.
    }
)
public class TokenUsageEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    @Column(name = "input_tokens", nullable = false)
    private Long inputTokens;

    @Column(name = "output_tokens", nullable = false)
    private Long outputTokens;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    // Optional, non-cascading reference for traceability only.
    // No @OnDelete(CASCADE), no @ManyToOne — deleting the message
    // must NOT delete or invalidate this row.
    @Column(name = "source_message_id")
    private Long sourceMessageId;
}
```

### Why

- Decoupled from `MessageEntity`'s lifecycle: `sourceMessageId` is a plain column, not a managed JPA relationship.
- `inputTokens`/`outputTokens` are `nullable = false` **by design** — they're sourced directly from `OpenRouterUsage`'s primitive `int` fields, which are never null (see Scope Decisions). No normalization needed.
- No index on `employee_id`: the current aggregation query does not filter or group by employee.

---

# Step 2 — Write `TokenUsageEntry` inside `MessageService.appendAssistantMessage` (existing signature, correct save order)

## Goal

Every assistant message gets exactly one corresponding ledger row, in the same transaction, attributed to the conversation owner, saved only after the message itself has a generated `id` and `createdAt`.

### Change

In `srcs/backend/src/main/java/com/BHT/models/message/MessageService.java` — **signature unchanged**:

```java
@Transactional
public MessageEntity appendAssistantMessage(
    Long conversationId,
    Long llmModelId,
    String content,
    int inputTokens,
    int outputTokens
) {
    ConversationEntity conversation = /* existing lookup logic */;

    MessageEntity message = /* existing assistant message creation logic */;

    MessageEntity savedMessage = messageRepository.save(message);

    conversation.setUpdatedAt(LocalDateTime.now());
    conversationRepository.save(conversation);

    tokenUsageEntryRepository.save(
        new TokenUsageEntry(
            null, // id, generated
            conversation.getEmployee().getId(),
            (long) inputTokens,
            (long) outputTokens,
            savedMessage.getCreatedAt(),
            savedMessage.getId()
        )
    );

    return savedMessage;
}
```

`appendUserMessage(...)` is **not modified**. `ChatTurnService.processTurn(...)` is **not modified** — it already calls `appendAssistantMessage` with the existing `int inputTokens, int outputTokens` arguments.

### Why

- Keeping the existing signature avoids any change to `ChatTurnService` and removes the compilation-break risk flagged in review.
- The ledger save happens **after** `messageRepository.save(message)` returns the persisted entity, so `savedMessage.getId()` and `savedMessage.getCreatedAt()` are guaranteed non-null when copied into `TokenUsageEntry`.
- `inputTokens`/`outputTokens` are `int` primitives, cast directly to `long` — no null check needed, since the type system already guarantees non-null.

### Edge Case

- If message save fails (e.g. `AssistantMessageSaveException` or equivalent), that exception propagates as before — the ledger write is unreachable in that path, which is correct (no orphaned ledger row for a message that doesn't exist).
- A legitimate `0` value for `inputTokens`/`outputTokens` (e.g. OpenRouter returns zero usage) is stored as-is — this is a valid value, not an error case.

---

# Step 3 — Create `TokenUsagePoint`

## Goal

Define the response DTO.

```java
package com.BHT.models.metrics;

import java.time.LocalDateTime;

public record TokenUsagePoint(
    LocalDateTime timestamp,
    Long totalTokens
) {}
```

---

# Step 4 — Create `TokenUsageRepository` (read-side aggregation, dialect-safe)

## Goal

Aggregate `TokenUsageEntry` rows in the database, without passing a dynamic literal into `DATE_TRUNC`.

```java
package com.BHT.models.metrics;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

@org.springframework.stereotype.Repository
public interface TokenUsageRepository extends Repository<TokenUsageEntry, Long> {

    @Query("""
        SELECT NEW com.BHT.models.metrics.TokenUsagePoint(
            CASE WHEN :interval = 'minute'
                 THEN FUNCTION('DATE_TRUNC', 'minute', t.createdAt)
                 ELSE FUNCTION('DATE_TRUNC', 'hour', t.createdAt)
            END,
            COALESCE(SUM(t.inputTokens), 0L)
              + COALESCE(SUM(t.outputTokens), 0L)
        )
        FROM TokenUsageEntry t
        WHERE t.createdAt >= :from
          AND t.createdAt <= :to
        GROUP BY
            CASE WHEN :interval = 'minute'
                 THEN FUNCTION('DATE_TRUNC', 'minute', t.createdAt)
                 ELSE FUNCTION('DATE_TRUNC', 'hour', t.createdAt)
            END
        ORDER BY
            CASE WHEN :interval = 'minute'
                 THEN FUNCTION('DATE_TRUNC', 'minute', t.createdAt)
                 ELSE FUNCTION('DATE_TRUNC', 'hour', t.createdAt)
            END
    """)
    List<TokenUsagePoint> aggregateTokenUsage(
        @Param("from") LocalDateTime from,
        @Param("to") LocalDateTime to,
        @Param("interval") String interval
    );
}
```

### Why

Literal-based `CASE`, no dynamic literal in `DATE_TRUNC`. Aggregation no longer depends on `MessageEntity`, so message/conversation deletion cannot affect it.

### Edge Cases

- Empty result set → returns empty list, frontend handles gracefully.
- Large ranges → index on `created_at` (Step 1) keeps this efficient.

### Implementation Note

The literal-based `CASE` expression shown above validates the approach, but when executed against PostgreSQL it produces `column "created_at" must appear in the GROUP BY clause or be used in an aggregate function` because the parameter inside the `CASE` prevents the planner from recognizing the expression as a deterministic function of `created_at`. The production implementation therefore selects the validated whitelisted literal (`"hour"` or `"minute"`) in Java and inlines it into the JPQL `FUNCTION('DATE_TRUNC', ...)` calls. No user-supplied value is ever passed as a dynamic parameter to `DATE_TRUNC`, and the interval is still restricted to the same two whitelisted literals. The H2 `test` profile uses a scoped native-query fallback as specified in Step 8.

---

# Step 5 — Create `TokenUsageService`

## Goal

Centralize authorization, validation, read-only transaction.

```java
@Service
@Transactional(readOnly = true)
public class TokenUsageService {

    private static final Set<String> ALLOWED_INTERVALS =
        Set.of("hour", "minute");

    private final TokenUsageRepository repository;

    public TokenUsageService(TokenUsageRepository repository) {
        this.repository = repository;
    }

    @PreAuthorize("hasRole('ADMIN')")
    public List<TokenUsagePoint> getTokenUsage(
        LocalDateTime from,
        LocalDateTime to,
        String interval
    ) {

        if (from == null || to == null)
            throw new IllegalArgumentException("from and to are required");

        if (from.isAfter(to))
            throw new IllegalArgumentException("from must be before to");

        String normalized = normalizeInterval(interval);

        return repository.aggregateTokenUsage(from, to, normalized);
    }

    private String normalizeInterval(String interval) {
        String normalized =
            interval == null ? "hour" : interval.toLowerCase();

        if (!ALLOWED_INTERVALS.contains(normalized))
            throw new IllegalArgumentException(
                "interval must be 'hour' or 'minute'"
            );

        return normalized;
    }
}
```

---

# Step 6 — Create `TokenUsageController`

## Goal

Expose:

```
GET /admin/token-usage
```

```java
@RestController
@RequestMapping("/admin/token-usage")
public class TokenUsageController {

    private final TokenUsageService service;

    public TokenUsageController(TokenUsageService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<TokenUsagePoint>> getTokenUsage(

        @RequestParam
        @DateTimeFormat(
            iso = DateTimeFormat.ISO.DATE_TIME
        )
        LocalDateTime from,

        @RequestParam
        @DateTimeFormat(
            iso = DateTimeFormat.ISO.DATE_TIME
        )
        LocalDateTime to,

        @RequestParam(
            defaultValue = "hour",
            required = false
        )
        String interval
    ) {
        return ResponseEntity.ok(
            service.getTokenUsage(from, to, interval)
        );
    }
}
```

---

# Step 7 — Backend Integration Tests

Create:

```
TokenUsageControllerTest.java
```

Verify:

- [x] Aggregation totals
- [x] Correct buckets
- [x] Admin receives 200
- [x] Employee receives 403
- [x] Missing parameters → 400
- [x] Invalid interval → 400
- [x] `interval=minute` and `interval=hour` both run successfully against H2
- [x] Deleting a message/conversation does not change previously aggregated totals
- [x] `appendUserMessage` does not create a `TokenUsageEntry` row
- [x] `appendAssistantMessage` creates exactly one `TokenUsageEntry` row, attributed to `conversation.getEmployee().getId()`
- [x] `TokenUsageEntry.sourceMessageId` and `createdAt` match the persisted message's `id`/`createdAt` (save-ordering regression test)
- [x] A legitimate `0` value for `inputTokens`/`outputTokens` is stored correctly (not treated as an error)

> Note: no null-token test is needed for `OpenRouterUsage` fields — they are primitive `int` and the null path is unreachable.

Reference:

```
AdminControllerListEndpointTest.java
```

---

# Step 8 — Verify H2 Compatibility (revised fallback)

Run:

```bash
./mvnw -q test -Dtest=TokenUsageControllerTest
```

If `DATE_TRUNC` fails under the existing `MODE=MySQL` H2 profile:

1. Confirm the H2 version actually lacks `DATE_TRUNC` support in MySQL mode.
2. If unsupported, implement a **native query fallback** scoped to this feature (e.g. `@Query(nativeQuery = true)` variant, or a profile-specific repository bean), instead of changing the global `application-test.properties` mode.
3. **Do not** switch the global H2 mode to `PostgreSQL` — out of scope, risks breaking unrelated existing tests.

---

# Step 9 — Install Recharts

```bash
cd srcs/frontend
npm install recharts
```

---

# Step 10 — Create Frontend Feature

## Types

```ts
export interface TokenUsagePoint {
  timestamp: string
  totalTokens: number
}

export type TokenUsageInterval =
  | "hour"
  | "minute"
```

---

## Service

```ts
import api from "@/lib/api"

export async function getTokenUsage(
    from: string,
    to: string,
    interval = "hour"
) {
    const response =
        await api.get("/admin/token-usage", {
            params: { from, to, interval }
        })

    return response.data
}
```

---

## Hook

Implement:

- loading
- error
- from
- to
- interval
- data

---

## Chart

Use:

- ResponsiveContainer
- AreaChart
- Tooltip
- XAxis
- YAxis
- Gradient Area

Render:

```
timestamp
↓

totalTokens
```

---

## Controls

Provide:

- interval selector
- datetime-local inputs
- from
- to

---

# Step 11 — Create `TokenUsagePage`

Follow the Employees page layout.

Include:

- Title
- Controls
- Chart
- Error state

---

# Step 12 — Register Route

Router:

```tsx
<Route
    path="/token-usage"
    element={<TokenUsagePage />}
/>
```

Sidebar:

- Add **Token Usage**
- Visible only for `UserRole.ADMIN`

---

# Step 13 — End-to-End Verification

Start stack:

```bash
docker compose up --build -d
```

Login as admin.

Open:

```
/token-usage
```

Choose a range with activity.

Watch backend logs:

```bash
docker compose logs -f <backend-service-name>
```

Verify:

- GET request
- Aggregated response
- (Manual) Send a chat turn, confirm exactly one ledger row is created.
- (Manual) Delete the message or its conversation, confirm the dashboard total for that period does **not** drop.

---

# Design Decisions

## Decision 1

Use a new, independent `TokenUsageEntry` ledger instead of reading directly from `MessageEntity`.

Alternatives rejected: reading from `MessageEntity` directly (loses history on cascade delete); soft-delete on `MessageEntity` (larger blast radius).

## Decision 2

Aggregate in SQL using a literal-based `CASE` + `DATE_TRUNC`, never a dynamic literal.

## Decision 3

Dedicated analytics repository, separate from any CRUD repository.

## Decision 4

Whitelist intervals (`hour`, `minute`) in the Service before they reach the query.

## Decision 5

H2 compatibility fallback must not change the global test profile mode.

## Decision 6

Ledger is written only for assistant messages, inside `MessageService.appendAssistantMessage`.

## Decision 7

`employeeId` on each ledger row = `conversation.getEmployee().getId()` (conversation owner).

## Decision 8

No index on `employee_id` for `TokenUsageEntry`.

## Decision 9

Backfill of historical data is out of scope.

## Decision 10 (new)

`appendAssistantMessage` keeps its existing signature; no refactor to accept `OpenRouterUsage`.

Reason: avoids any change to `ChatTurnService.processTurn(...)`, which already calls this method with the existing `int` parameters. The ledger entity is built directly from those parameters.

Alternative rejected: changing the signature to accept `OpenRouterUsage usage` (would require updating the caller, adds risk with no benefit).

## Decision 11 (new)

Ledger save happens strictly after `messageRepository.save(message)`.

Reason: guarantees `id` and `createdAt` are populated before being copied into `TokenUsageEntry`. Prevents null `sourceMessageId`/`createdAt` on the ledger row.

## Decision 12 (new)

No null-handling logic or tests for `OpenRouterUsage.inputTokens`/`outputTokens`.

Reason: these fields are primitive `int`, never `null` — null-handling code and tests for this path would be dead code / misleading coverage. The only relevant edge case is a legitimate `0` value, which is handled by storing it as-is.

---

# Testing

## Automatic Validation

- [x] `./mvnw -q test -Dtest=TokenUsageControllerTest`
- [x] `npm run typecheck`
- [x] `npm run test`

---

## Manual Validation

- [x] `docker compose up --build -d`
- [x] Login as admin
- [x] Open `/token-usage`
- [x] Verify chart buckets
- [x] Check backend logs
- [x] Verify employee receives 403
- [x] Confirm `interval=minute` and `interval=hour` both render correctly
- [x] Send a chat turn, confirm exactly one `TokenUsageEntry` row is created (assistant only)
- [x] Delete the message or its conversation, confirm token totals for that period remain unchanged on the dashboard
- [x] Confirm project still compiles after this change (no caller signature mismatch)

---

# Related References

- [[Code/TokenUsageDashboard|TokenUsage Dashboard integration]] — end-to-end code explanation of the ledger, aggregation, and frontend wiring
- `[[Backend-Architecture]]`
- `[[Backend-Model-Anatomy]]`
- `MessageEntity.java`
- `MessageService.java`
- `ChatTurnService.java`
- `OpenRouterUsage.java`
- `employeeService.ts`
- `useEmployeeList.ts`
- `Review-of-plan-tokens-task-4` (review this task addresses)

---

# Completion Criteria

- [x] Parent Feature reviewed
- [x] `TokenUsageEntry` entity created with Lombok conventions, index on `created_at` only
- [x] Ledger write added inside `MessageService.appendAssistantMessage`, **existing signature preserved**, save placed after `messageRepository.save(message)`
- [x] No null-handling code/tests for `OpenRouterUsage` fields
- [x] `employeeId` resolved from `conversation.getEmployee().getId()`
- [x] Backend endpoint returns `{ timestamp, totalTokens }` sourced from `TokenUsageEntry`
- [x] Endpoint protected with admin-only authorization
- [x] Input validation implemented
- [x] `DATE_TRUNC` uses whitelisted literals, not a dynamic parameter
- [x] Deleting a message/conversation does not affect previously recorded token totals (verified by test)
- [x] User messages do not create ledger rows (verified by test)
- [x] H2 fallback does not modify the global test profile mode
- [x] Backfill explicitly documented as out of scope
- [x] `ChatTurnService.processTurn(...)` requires no changes; project compiles
- [x] Integration tests pass
- [x] H2 compatibility verified
- [x] Recharts installed
- [x] Frontend feature created
- [x] Route added
- [x] Sidebar entry added
- [x] Chart renders correctly
- [x] Docker logs confirm backend response
- [x] Documentation/code explanations updated if necessary