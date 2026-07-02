# Task: Implement Token Usage Dashboard (Backend + Frontend)

**Tags:** `#task` `#current` `#high-complexity` `#parent-token-usage-dashboard`

- **Parent:** `[[Features/to-do/Token-Usage-Dashboard]]`
- **Parent Type:** Feature
- **Related Steps:**
  - Phase 1 (Backend Endpoint)
  - Phase 2 (Frontend Dashboard)
  - Phase 3 (Verification)
- **Estimated Complexity:** High

---

# Goal

Implement a complete **admin-only Token Usage Dashboard** consisting of:

- A Spring Boot endpoint that aggregates platform-wide token consumption by hour or minute using database-level date truncation.
- A React page that renders the resulting time-series using **Recharts**.

---

# Parent Context

The parent Feature specifies:

- **Data source:** existing `MessageEntity`
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

Frontend

- `srcs/frontend/src/features/employees/services/employeeService.ts`
- `srcs/frontend/src/features/employees/hooks/useEmployeeList.ts`
- `srcs/frontend/src/router.tsx`
- `srcs/frontend/src/layouts/Sidebar.tsx`

---

# Implementation Details

## Overall Approach

Backend:

- Create a focused analytics slice.
- Keep controller thin.
- Service performs authorization and validation.
- Repository performs grouped JPQL aggregation.

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

- [ ] `TokenUsagePoint.java`
- [ ] `TokenUsageRepository.java`
- [ ] `TokenUsageService.java`
- [ ] `TokenUsageController.java`

Location:

```
srcs/backend/src/main/java/com/BHT/models/metrics/
```

---

## Backend (Modify)

- [ ] `MessageEntity.java`
- [ ] `TokenUsageControllerTest.java`

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

# Step 1 — Add index on `message.created_at`

## Goal

Keep time-range queries efficient.

### Change

```java
@Table(
    name = "message",
    indexes = {
        @Index(name = "idx_message_conversation", columnList = "conversation_id"),
        @Index(name = "idx_message_created_at", columnList = "created_at")
    }
)
```

### Why

Without an index:

```
BETWEEN :from AND :to
```

would scan the entire table.

### Edge Case

Existing production tables should receive the index automatically with:

```
ddl-auto=update
```

Verify in staging.

---

# Step 2 — Create `TokenUsagePoint`

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

### Why

Required by the JPQL constructor expression.

---

# Step 3 — Create `TokenUsageRepository`

## Goal

Aggregate data in the database.

```java
package com.BHT.models.metrics;

import com.BHT.models.message.MessageEntity;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

@org.springframework.stereotype.Repository
public interface TokenUsageRepository extends Repository<MessageEntity, Long> {

    @Query("""
        SELECT NEW com.BHT.models.metrics.TokenUsagePoint(
            FUNCTION('DATE_TRUNC', :interval, m.createdAt),
            COALESCE(SUM(m.inputTokens), 0L)
              + COALESCE(SUM(m.outputTokens), 0L)
        )
        FROM MessageEntity m
        WHERE m.createdAt >= :from
          AND m.createdAt <= :to
        GROUP BY FUNCTION('DATE_TRUNC', :interval, m.createdAt)
        ORDER BY FUNCTION('DATE_TRUNC', :interval, m.createdAt)
    """)
    List<TokenUsagePoint> aggregateTokenUsage(
        @Param("from") LocalDateTime from,
        @Param("to") LocalDateTime to,
        @Param("interval") String interval
    );
}
```

### Why

Aggregation belongs in the database, not the frontend.

### Edge Cases

- Null token values
- Empty result set
- H2 compatibility with `DATE_TRUNC`

---

# Step 4 — Create `TokenUsageService`

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

        String normalized =
            interval == null
                ? "hour"
                : interval.toLowerCase();

        if (!ALLOWED_INTERVALS.contains(normalized))
            throw new IllegalArgumentException(
                "interval must be 'hour' or 'minute'"
            );

        return repository.aggregateTokenUsage(from, to, normalized);
    }
}
```

---

# Step 5 — Create `TokenUsageController`

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

# Step 6 — Backend Integration Tests

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

Reference:

```
AdminControllerListEndpointTest.java
```

---

# Step 7 — Verify H2 Compatibility

Run:

```bash
./mvnw -q test -Dtest=TokenUsageControllerTest
```

If `DATE_TRUNC` fails:

- test-profile repository
- or native query using H2-compatible functions

---

# Step 8 — Install Recharts

```bash
cd srcs/frontend
npm install recharts
```

---

# Step 9 — Create Frontend Feature

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

# Step 10 — Create `TokenUsagePage`

Follow the Employees page layout.

Include:

- Title
- Controls
- Chart
- Error state

---

# Step 11 — Register Route

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

# Step 12 — End-to-End Verification

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

---

# Design Decisions

## Decision 1

Reuse `MessageEntity`.

**Reason**

Avoids creating a new persistence model.

Alternative:

- `TokenUsageRecord` ❌ rejected

---

## Decision 2

Aggregate in SQL using:

```
FUNCTION('DATE_TRUNC', ...)
```

Alternative:

- Aggregate in Java ❌ rejected

---

## Decision 3

Dedicated analytics repository.

Reason:

- read-only
- aggregation-specific
- avoids unnecessary CRUD surface

Alternative:

- Add method to `MessageRepository` ❌ rejected

---

## Decision 4

Whitelist intervals.

Allowed:

- hour
- minute

Prevents arbitrary strings reaching JPQL.

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

---

# Related References

- [[Code/TokenUsageDashboard|TokenUsage Dashboard integration]] — end-to-end code explanation of the ledger, aggregation, and frontend wiring
- `[[Backend-Architecture]]`
- `[[Backend-Model-Anatomy]]`
- `MessageEntity.java`
- `employeeService.ts`
- `useEmployeeList.ts`

---

# Completion Criteria

- [ ] Parent Feature reviewed
- [ ] Index added to `createdAt`
- [ ] Backend endpoint returns `{ timestamp, totalTokens }`
- [ ] Endpoint protected with admin-only authorization
- [ ] Input validation implemented
- [ ] Integration tests pass
- [ ] H2 compatibility verified
- [ ] Recharts installed
- [ ] Frontend feature created
- [ ] Route added
- [ ] Sidebar entry added
- [ ] Chart renders correctly
- [ ] Docker logs confirm backend response
- [ ] Documentation/code explanations updated if necessary