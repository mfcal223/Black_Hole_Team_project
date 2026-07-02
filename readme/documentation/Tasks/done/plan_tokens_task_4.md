# Task: Implement Token Usage Dashboard (Backend + Frontend)

**Tags:** `#task` `#current` `#high-complexity` `#parent-token-usage-dashboard`

- **Parent:** `[[Features/to-do/Token-Usage-Dashboard]]`
- **Parent Type:** Feature
- **Related Steps:**
  - Phase 1 (Backend Endpoint)
  - Phase 2 (Frontend Dashboard)
  - Phase 3 (Verification)
- **Estimated Complexity:** High
- **Review Status:** Incorporates findings from `Review-of-plan-tokens-task-3` (implementation-gap fixes)

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

## Ledger scope: assistant messages only (resolved)

User messages do not consume LLM tokens — `inputTokens`/`outputTokens` remain `null` on `MessageEntity` for them (`MessageService.appendUserMessage`). Writing zero-valued ledger rows for every user message adds volume and null-handling risk without adding real information.

**Decision: the ledger is written only in `MessageService.appendAssistantMessage`, once per assistant turn, using the real OpenRouter token counts.** If a separate "activity" metric (distinct from token cost) is needed later, it should be its own table — not mixed into `TokenUsageEntry`.

## employeeId attribution (resolved)

`appendAssistantMessage` has no authenticated principal in scope (the response is system-generated). The only meaningful "who" available is the conversation owner.

**Decision: `employeeId` on each ledger row = `conversation.getEmployee().getId()`.** This is documented as "the ledger attributes token cost to the conversation owner, not to whichever process triggered the assistant turn" — this matches the existing `ConversationEntity.employee` relationship and requires no new authentication plumbing.

## Backfill

Out of scope for this task. The dashboard will only reflect token usage **from deployment forward** — no migration of historical `MessageEntity` rows into `TokenUsageEntry` is planned. If backfill is later required, it is a separate one-time data migration task (can be derived from existing `MessageEntity.inputTokens/outputTokens` + `conversation.employee`, run once, then discarded).

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
    - `appendUserMessage(...)` — leaves `inputTokens`/`outputTokens` unset (`null`). **No ledger write here.**
    - `appendAssistantMessage(...)` — sets `inputTokens`/`outputTokens` from `OpenRouterUsage`. **Ledger write happens here.**
  - `srcs/backend/src/main/java/com/BHT/models/chat/ChatTurnService.java`
    - `processTurn(...)` calls both message-creation methods within a single transaction — ledger write must stay inside `MessageService.appendAssistantMessage`, **not** moved up into `ChatTurnService`, to keep the concern in the correct layer.
  - `srcs/backend/src/main/java/com/BHT/models/message/MessageEntity.java`
    - `inputTokens`/`outputTokens` are nullable `Integer` — ledger write must normalize, see Step 2.

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
- Write exactly one `TokenUsageEntry` row per **assistant** message, inside `MessageService.appendAssistantMessage`, in the same transaction as the message write.
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

- [ ] `TokenUsageEntry.java` (new entity — the append-only ledger; Lombok-based, see Step 1)
- [ ] `TokenUsageEntryRepository.java` (write-side repository, used inside `MessageService.appendAssistantMessage`)
- [ ] `TokenUsagePoint.java` (DTO for aggregated points)
- [ ] `TokenUsageRepository.java` (read-side aggregation repository)
- [ ] `TokenUsageService.java`
- [ ] `TokenUsageController.java`

Location:

```
srcs/backend/src/main/java/com/BHT/models/metrics/
```

---

## Backend (Modify)

- [ ] `MessageService.java` — add ledger write inside `appendAssistantMessage(...)` only.
- [ ] `TokenUsageControllerTest.java`

> `MessageEntity.java` and `ChatTurnService.java` are **not modified** — no `deletedAt`, no new responsibilities pushed into the orchestration layer.

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

- [ ] `router.tsx`
- [ ] `Sidebar.tsx`
- [ ] `package.json`

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

- Decoupled from `MessageEntity`'s lifecycle: `sourceMessageId` is a plain column, not a managed JPA relationship, so there is no cascade behavior to reason about.
- `inputTokens`/`outputTokens` are `nullable = false` **by design** — nulls are normalized to `0L` *before* constructing this entity (Step 2), since this entity is only ever written for assistant messages, which always carry token counts from OpenRouter.
- No index on `employee_id` (per review finding 6): the current aggregation query (Step 4) does not filter or group by employee, so an unused index was removed. Documented here so it's added back deliberately if per-employee breakdown ships later.

---

# Step 2 — Write `TokenUsageEntry` inside `MessageService.appendAssistantMessage`

## Goal

Every assistant message gets exactly one corresponding ledger row, in the same transaction, attributed to the conversation owner.

### Change

In `srcs/backend/src/main/java/com/BHT/models/message/MessageService.java`:

```java
@Transactional
public MessageEntity appendAssistantMessage(
    Long conversationId,
    OpenRouterUsage usage
    /* ...existing params... */
) {
    ConversationEntity conversation = /* existing lookup logic */;

    MessageEntity message = /* existing assistant message creation logic */;

    long inputTokens = usage.getInputTokens() != null ? usage.getInputTokens() : 0L;
    long outputTokens = usage.getOutputTokens() != null ? usage.getOutputTokens() : 0L;

    tokenUsageEntryRepository.save(
        new TokenUsageEntry(
            null, // id, generated
            conversation.getEmployee().getId(),
            inputTokens,
            outputTokens,
            message.getCreatedAt(),
            message.getId()
        )
    );

    return message;
}
```

`appendUserMessage(...)` is **not modified** — no ledger write for user messages (see Scope Decisions).

### Why

- Writing inside `appendAssistantMessage` keeps both inserts (message + ledger) in the same `@Transactional` boundary already established by `ChatTurnService.processTurn`, without moving any responsibility into the orchestration layer.
- `employeeId = conversation.getEmployee().getId()` is the only attribution available at this call site and is documented as representing "conversation owner," not "principal who triggered this turn."
- Null-normalization happens here, at the boundary, so `TokenUsageEntry` itself can stay strictly non-nullable and simple.

### Edge Case

- If `AssistantMessageSaveException` (or equivalent) is already thrown on message-save failure, that behavior is preserved as-is — the ledger write must not silently swallow a failure that should propagate. No change needed to existing exception handling, just ensure the ledger save happens before the method returns successfully.

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

Same dialect-safety fix as before (literal-based `CASE`, no dynamic literal in `DATE_TRUNC`). Aggregation no longer depends on `MessageEntity` at all, so message/conversation deletion cannot affect it.

### Edge Cases

- Empty result set → returns empty list, frontend handles gracefully.
- Large ranges → index on `created_at` (Step 1) keeps this efficient.

---

# Step 5 — Create `TokenUsageService`

## Goal

Centralize:

- authorization
- validation
- read-only transaction

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

- [ ] Aggregation totals
- [ ] Correct buckets
- [ ] Admin receives 200
- [ ] Employee receives 403
- [ ] Missing parameters → 400
- [ ] Invalid interval → 400
- [ ] `interval=minute` and `interval=hour` both run successfully against H2
- [ ] Deleting a message/conversation does not change previously aggregated totals
- [ ] **`appendUserMessage` does not create a `TokenUsageEntry` row** (regression test for the user/assistant scope decision)
- [ ] **`appendAssistantMessage` creates exactly one `TokenUsageEntry` row, attributed to `conversation.getEmployee().getId()`**
- [ ] **Null `OpenRouterUsage` token fields are normalized to `0L`, not rejected**

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

1. First confirm the H2 version actually lacks `DATE_TRUNC` support in MySQL mode.
2. If unsupported, implement a **native query fallback** scoped to this feature (e.g. `@Query(nativeQuery = true)` variant using H2-compatible date functions, or a profile-specific repository bean), instead of changing the global `application-test.properties` mode.
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
- (Manual) Send a chat turn, confirm exactly one ledger row is created (not two).
- (Manual) Delete the message or its conversation, confirm the dashboard total for that period does **not** drop.

---

# Design Decisions

## Decision 1

Use a new, independent `TokenUsageEntry` ledger instead of reading directly from `MessageEntity`.

Alternatives rejected: reading from `MessageEntity` directly (loses history on cascade delete); soft-delete on `MessageEntity` (larger blast radius, still couples the counter to message lifecycle).

---

## Decision 2

Aggregate in SQL using a literal-based `CASE` + `DATE_TRUNC`, never a dynamic literal.

---

## Decision 3

Dedicated analytics repository, separate from any CRUD repository.

---

## Decision 4

Whitelist intervals (`hour`, `minute`) in the Service before they reach the query.

---

## Decision 5

H2 compatibility fallback must not change the global test profile mode.

---

## Decision 6 (new)

Ledger is written only for assistant messages, inside `MessageService.appendAssistantMessage`.

Reason: user messages never carry real token counts (`null` on `MessageEntity`); writing zero-rows for them adds volume and null-handling risk with no informational value. If "activity" tracking (distinct from token cost) becomes a requirement, it should be a separate table.

Alternative rejected: writing a ledger row for every message (user + assistant) with zeros for user messages.

---

## Decision 7 (new)

`employeeId` on each ledger row = `conversation.getEmployee().getId()` (conversation owner), not the principal that triggered the turn.

Reason: `appendAssistantMessage` has no authenticated employee in scope (system-generated response); conversation owner is the only meaningful, already-available attribution and matches the existing `ConversationEntity.employee` relationship.

---

## Decision 8 (new)

No index on `employee_id` for `TokenUsageEntry`.

Reason: the current aggregation query doesn't filter or group by employee; an unused index was removed to avoid maintenance cost. Documented so it can be added back deliberately alongside the corresponding query change if per-employee breakdown is implemented later.

---

## Decision 9 (new)

Backfill of historical `MessageEntity` data into `TokenUsageEntry` is out of scope.

Reason: the dashboard is acceptable as "usage from deployment forward" for MVP. A backfill, if needed, is a separate one-time migration task.

---

# Testing

## Automatic Validation

- [ ] `./mvnw -q test -Dtest=TokenUsageControllerTest`
- [ ] `npm run typecheck`
- [ ] `npm run test`

---

## Manual Validation

- [ ] `docker compose up --build -d`
- [ ] Login as admin
- [ ] Open `/token-usage`
- [ ] Verify chart buckets
- [ ] Check backend logs
- [ ] Verify employee receives 403
- [ ] Confirm `interval=minute` and `interval=hour` both render correctly
- [ ] Send a chat turn, confirm exactly one `TokenUsageEntry` row is created (assistant only)
- [ ] Delete the message or its conversation, confirm token totals for that period remain unchanged on the dashboard

---

# Related References

- [[Code/TokenUsageDashboard|TokenUsage Dashboard integration]] — end-to-end code explanation of the ledger, aggregation, and frontend wiring
- `[[Backend-Architecture]]`
- `[[Backend-Model-Anatomy]]`
- `MessageEntity.java`
- `MessageService.java`
- `ChatTurnService.java`
- `employeeService.ts`
- `useEmployeeList.ts`
- `Review-of-plan-tokens-task-3` (review this task addresses)

---

# Completion Criteria

- [ ] Parent Feature reviewed
- [ ] `TokenUsageEntry` entity created with Lombok conventions, index on `created_at` only
- [ ] Ledger write added inside `MessageService.appendAssistantMessage` only (not `appendUserMessage`, not `ChatTurnService`)
- [ ] Null OpenRouter token values normalized to `0L` before persisting
- [ ] `employeeId` resolved from `conversation.getEmployee().getId()`, documented as conversation-owner attribution
- [ ] Backend endpoint returns `{ timestamp, totalTokens }` sourced from `TokenUsageEntry`
- [ ] Endpoint protected with admin-only authorization
- [ ] Input validation implemented
- [ ] `DATE_TRUNC` uses whitelisted literals, not a dynamic parameter
- [ ] Deleting a message/conversation does not affect previously recorded token totals (verified by test)
- [ ] User messages do not create ledger rows (verified by test)
- [ ] H2 fallback does not modify the global test profile mode
- [ ] Backfill explicitly documented as out of scope
- [ ] Integration tests pass
- [ ] H2 compatibility verified
- [ ] Recharts installed
- [ ] Frontend feature created
- [ ] Route added
- [ ] Sidebar entry added
- [ ] Chart renders correctly
- [ ] Docker logs confirm backend response
- [ ] Documentation/code explanations updated if necessary