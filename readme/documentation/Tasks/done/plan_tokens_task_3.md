# Task: Implement Token Usage Dashboard (Backend + Frontend)

**Tags:** `#task` `#current` `#high-complexity` `#parent-token-usage-dashboard`

- **Parent:** `[[Features/to-do/Token-Usage-Dashboard]]`
- **Parent Type:** Feature
- **Related Steps:**
  - Phase 1 (Backend Endpoint)
  - Phase 2 (Frontend Dashboard)
  - Phase 3 (Verification)
- **Estimated Complexity:** High
- **Review Status:** Incorporates findings from `Review-of-plan-tokens-task-2` + redesign decision (see Scope Decisions)

---

# Goal

Implement a complete **admin-only Token Usage Dashboard** consisting of:

- A Spring Boot endpoint that aggregates platform-wide token consumption by hour or minute using database-level date truncation, sourced from an **append-only, deletion-resistant** record of consumption.
- A React page that renders the resulting time-series using **Recharts**.

---

# Parent Context

The parent Feature specifies:

- **Data source (revised, see Scope Decisions):** a new append-only `TokenUsageEntry` table, written at message-creation time
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

# Scope Decisions (revised after review iteration 2)

## Historical Data Protection — Resolved via decoupled ledger, NOT soft-delete

**Real requirement clarified by the user:** token consumption must be tracked per-employee in near real time, and **must not disappear if the underlying `Message` or `Conversation` is later deleted.**

Two options were considered:

1. ❌ **Soft-delete on `MessageEntity`** (`deletedAt` + filter in the query). Rejected: this couples the token counter to the full lifecycle of `MessageEntity`, requires auditing/touching every write and delete path for messages, and is a much larger, riskier change than the dashboard itself — without even fully guaranteeing the data survives a hard delete of a `Conversation` (cascade would still need to be reworked).
2. ✅ **Independent append-only ledger — `TokenUsageEntry`.** A new, isolated entity written once at message-creation time, in the same transaction as the `MessageEntity` insert. It has **no cascading FK** to `Conversation` (only an optional, non-cascading reference for traceability). The dashboard aggregates over this table instead of over `MessageEntity`.

**Decision: Option 2.** It fully satisfies "deleting a message/conversation must not affect the token count," touches zero existing message deletion logic, and keeps the aggregation query just as simple as before.

## DATE_TRUNC Portability — Fixed (kept from previous iteration)

The truncation unit is never passed as a dynamic literal into `DATE_TRUNC`. A `CASE` expression selects between two hardcoded literals (`'minute'` / `'hour'`); `:interval` is only ever compared with `=`.

## H2 Compatibility Fallback — Revised (per review iteration 2)

The previous draft suggested switching the H2 test profile to `MODE=PostgreSQL` as a fallback. **This is rejected** — the current test profile (`MODE=MySQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH`) is relied on by other existing tests, and changing it globally risks unrelated CI breakage. Instead:

- First, verify whether the H2 version in use supports `DATE_TRUNC` under `MODE=MySQL`.
- If not supported, fall back to a **native query** using H2-compatible scalar functions (e.g. `FORMATDATETIME`/`TRUNCATE`-style construction) guarded by a Spring profile, instead of touching the global test datasource configuration.
- Changing the global H2 mode is explicitly **out of scope / last resort**, and must not be done without a dedicated review of its impact on the rest of the test suite.

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
- `MessageEntity` already stores:
  - `inputTokens`
  - `outputTokens`
  - `createdAt`
- An `employeeId` (or equivalent author reference) is resolvable at message-creation time, to be written into `TokenUsageEntry`.

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
- `srcs/backend/src/main/java/com/BHT/models/hq/admin/AdminController.java`
- `srcs/backend/src/main/java/com/BHT/models/hq/admin/AdminServiceImpl.java`
- `srcs/backend/src/main/resources/application-test.properties`
- Wherever `MessageEntity` is persisted (message creation service) — needs to be located and extended to also write `TokenUsageEntry`.

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
- Write one `TokenUsageEntry` row per message at creation time, in the same transaction as the message write.
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

- [ ] `TokenUsageEntry.java` (new entity — the append-only ledger)
- [ ] `TokenUsageEntryRepository.java` (write-side repository, used at message-creation time)
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

- [ ] The message-creation service/use case (wherever `MessageEntity` is persisted) — add a write of `TokenUsageEntry` in the same transaction.
- [ ] `TokenUsageControllerTest.java`

> Note: `MessageEntity.java` itself is **not modified** in this revision — no `deletedAt` column, no new index requirement tied to it, since the dashboard no longer reads from it.

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

# Step 1 — Create `TokenUsageEntry` entity

## Goal

Define the append-only ledger table that survives message/conversation deletion.

```java
package com.BHT.models.metrics;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "token_usage_entry",
    indexes = {
        @Index(name = "idx_token_usage_created_at", columnList = "created_at"),
        @Index(name = "idx_token_usage_employee", columnList = "employee_id")
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
    // No @OnDelete(CASCADE) — deleting the message must NOT delete this row.
    @Column(name = "source_message_id")
    private Long sourceMessageId;

    protected TokenUsageEntry() {}

    public TokenUsageEntry(Long employeeId, Long inputTokens, Long outputTokens,
                            LocalDateTime createdAt, Long sourceMessageId) {
        this.employeeId = employeeId;
        this.inputTokens = inputTokens;
        this.outputTokens = outputTokens;
        this.createdAt = createdAt;
        this.sourceMessageId = sourceMessageId;
    }

    // getters omitted for brevity
}
```

### Why

This table is intentionally decoupled from `MessageEntity`'s lifecycle. `sourceMessageId` is kept only for debugging/traceability and is **not** a managed JPA relationship, so there is no cascade behavior to reason about.

### Edge Case

If message creation fails after the `TokenUsageEntry` write (or vice versa), both writes must happen in the **same transaction** as the message creation (Step 2) so they succeed or fail together — no orphaned or missing usage rows.

---

# Step 2 — Write `TokenUsageEntry` at message-creation time

## Goal

Every time a message with token usage is created, persist a corresponding ledger row, in the same transaction.

### Change

Locate the existing message-creation service (e.g. `MessageServiceImpl` or equivalent — **to be confirmed against the actual codebase path**) and add:

```java
@Transactional
public MessageEntity createMessage(/* existing params */) {
    MessageEntity message = /* existing message creation logic */;

    tokenUsageEntryRepository.save(
        new TokenUsageEntry(
            resolveEmployeeId(message),
            message.getInputTokens(),
            message.getOutputTokens(),
            message.getCreatedAt(),
            message.getId()
        )
    );

    return message;
}
```

### Why

Keeping both writes in the same transaction guarantees the ledger is always consistent with what was actually billed/produced, without needing to touch `MessageEntity`'s deletion semantics at all.

### Edge Case

- Messages with zero tokens (e.g. system messages) — decide whether to skip the ledger write or store zeros. Recommendation: skip writes where `inputTokens + outputTokens == 0` to avoid noise in the dashboard.

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

Same dialect-safety fix as before (literal-based `CASE`, no dynamic literal in `DATE_TRUNC`), now applied against the new ledger table. Aggregation no longer depends on `MessageEntity` at all, so message/conversation deletion cannot affect it.

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
- [ ] **Deleting a message/conversation does not change previously aggregated totals** (key regression test for the new design)

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

1. First confirm the H2 version actually lacks `DATE_TRUNC` support in MySQL mode (check H2 changelog/docs for the version pinned in the project).
2. If unsupported, implement a **native query fallback** for the test/H2 environment only (e.g. a profile-specific repository bean or `@Query(nativeQuery = true)` variant using H2-compatible date functions), instead of changing the global `application-test.properties` mode.
3. **Do not** switch the global H2 mode to `PostgreSQL` — this is out of scope and risks breaking unrelated existing tests that depend on `MODE=MySQL` behavior (e.g. `DATABASE_TO_LOWER=TRUE`).

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
- (Manual) Create a message, delete it or its conversation, confirm the dashboard total for that period does **not** drop.

---

# Design Decisions

## Decision 1 (revised)

Use a new, independent `TokenUsageEntry` ledger instead of reading directly from `MessageEntity`.

**Reason**

The real requirement is that token consumption survives deletion of the message/conversation it came from. Reading from `MessageEntity` can never satisfy that without reworking its cascade-delete behavior. A separate append-only table satisfies it directly, with no risk to existing message logic.

Alternatives:

- Reuse `MessageEntity` directly ❌ rejected (cascade-delete loses history)
- Soft-delete `MessageEntity` (`deletedAt`) ❌ rejected (larger blast radius, still couples the counter to message lifecycle, doesn't even fully solve hard-deletes of conversations)

---

## Decision 2

Aggregate in SQL using a literal-based `CASE` + `DATE_TRUNC`.

Alternative:

- Aggregate in Java ❌ rejected
- Pass `interval` directly into `DATE_TRUNC` as a parameter ❌ rejected (dialect portability)

---

## Decision 3

Dedicated analytics repository, separate from any CRUD repository.

Reason:

- read-only (aggregation side)
- write-side (`TokenUsageEntryRepository`) is intentionally simple/append-only
- avoids unnecessary CRUD surface

---

## Decision 4

Whitelist intervals.

Allowed:

- hour
- minute

Prevents arbitrary strings reaching JPQL, and combined with Decision 2's literal `CASE`, also prevents dialect-specific failures.

---

## Decision 5

H2 compatibility fallback must not change the global test profile mode.

Reason:

- The existing `MODE=MySQL` profile is relied on by other tests.
- A native, profile-scoped fallback is safer and contains the blast radius to this feature only.

Alternative:

- Switch H2 to `MODE=PostgreSQL` globally ❌ rejected (risk of unrelated CI breakage)

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
- [ ] Create a message, delete the message or its conversation, confirm token totals for that period remain unchanged on the dashboard

---

# Related References

- [[Code/TokenUsageDashboard|TokenUsage Dashboard integration]] — end-to-end code explanation of the ledger, aggregation, and frontend wiring
- `[[Backend-Architecture]]`
- `[[Backend-Model-Anatomy]]`
- `MessageEntity.java`
- `employeeService.ts`
- `useEmployeeList.ts`
- `Review-of-plan-tokens-task-2` (review this task addresses)

---

# Completion Criteria

- [ ] Parent Feature reviewed
- [ ] `TokenUsageEntry` entity and table created, with index on `created_at`
- [ ] Message-creation flow writes `TokenUsageEntry` in the same transaction as the message
- [ ] Backend endpoint returns `{ timestamp, totalTokens }` sourced from `TokenUsageEntry`
- [ ] Endpoint protected with admin-only authorization
- [ ] Input validation implemented
- [ ] `DATE_TRUNC` uses whitelisted literals, not a dynamic parameter
- [ ] Deleting a message/conversation does not affect previously recorded token totals (verified by test)
- [ ] H2 fallback does not modify the global test profile mode
- [ ] Integration tests pass
- [ ] H2 compatibility verified
- [ ] Recharts installed
- [ ] Frontend feature created
- [ ] Route added
- [ ] Sidebar entry added
- [ ] Chart renders correctly
- [ ] Docker logs confirm backend response
- [ ] Documentation/code explanations updated if necessary