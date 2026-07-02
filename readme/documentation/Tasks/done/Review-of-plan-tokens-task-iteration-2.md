#high #architectural

## Bug: Review of plan_tokens_task.md — Iteration 2

### Summary

This is a second review of the Task document [[Tasks/current/plan_tokens_task]]. Several critical issues from the first review have been resolved: the non-existent `deletedAt` filter was removed, the invalid `CAST(... AS long)` was replaced with `COALESCE(SUM(...), 0L)`, and `@Transactional(readOnly = true)` was added. However, the user's stated requirement to "protect historical data" with a `deletedAt IS NULL` filter is still not addressed because `MessageEntity` has no soft-delete field. The remaining technical risk is the use of `FUNCTION('DATE_TRUNC', :interval, m.createdAt)` with a parameter as the truncation unit, which may not be portable across dialects and can prevent effective query-plan caching.

### Reproduction Conditions

Not applicable — this is a document review.

### Environment / Preconditions (Optional)

- Backend: Spring Boot 3.4.1 / Hibernate 6 / PostgreSQL in production / H2 in MySQL mode for tests.
- `MessageEntity` does not contain a `deletedAt` field and the codebase has no soft-delete pattern.

### Real-World Scenarios

1. The dashboard is deployed without soft-delete support. Later, a message is "deleted" by removing its conversation, and because messages use `ON DELETE CASCADE`, all historical token data for that conversation is permanently lost — contradicting the goal of protecting historical data.
2. The H2 test profile rejects `FUNCTION('DATE_TRUNC', :interval, ...)` because the interval is passed as a JDBC parameter rather than a literal, causing CI failures despite PostgreSQL working locally.

### Expected Behavior

The Task document should either:
- Explicitly add `deletedAt` soft-delete support to `MessageEntity` and include `AND m.deletedAt IS NULL` in the query, or
- State clearly that historical data protection is out of scope and document the deletion behavior.

Additionally, the `DATE_TRUNC` query should be dialect-robust or explicitly tested against H2.

### Actual Behavior

- Step 3 has no `deletedAt` filter.
- Step 3 still uses `FUNCTION('DATE_TRUNC', :interval, m.createdAt)` with a parameter.

### Impact

- Historical token data may be lost if conversations are deleted, because messages cascade-delete.
- Potential CI/test instability due to dialect-specific function handling.

### Findings

1. No `deletedAt IS NULL` filter exists in Step 3, and `MessageEntity` has no `deletedAt` field, so the stated requirement to protect historical data is not met.
2. `FUNCTION('DATE_TRUNC', :interval, m.createdAt)` passes the interval as a parameter, which is dialect-sensitive and may not work in H2 tests.
3. `TokenUsageService` still mixes authorization, validation, and transaction management in one method/class.

### Investigation Scope

- **Code Reviewed:** `srcs/backend/src/main/java/com/BHT/models/message/MessageEntity.java`, `srcs/backend/src/main/java/com/BHT/configuration/security/SecurityConfig.java`, `documentation/Tasks/current/plan_tokens_task.md`.
- **Logs Reviewed:** No.
- **Runtime Evidence:** None — document review only.

### Root Cause Analysis

The Task document was corrected to remove references to a non-existent `deletedAt` field, but the underlying business requirement (protect historical data) was not resolved. The persistence model still cascade-deletes messages when a conversation is removed. The `DATE_TRUNC` parameterization is a separate portability concern carried over from the previous iteration.

### Evidence in Code

- `srcs/backend/src/main/java/com/BHT/models/message/MessageEntity.java:31-34` — `@OnDelete(action = OnDeleteAction.CASCADE)` on `conversation_id`; deleting a conversation removes all messages.
- `srcs/backend/src/main/java/com/BHT/models/message/MessageEntity.java:15-17` — no index or column for `deletedAt`.
- `srcs/backend/src/main/java/com/BHT/configuration/security/SecurityConfig.java:34` — `@EnableMethodSecurity` is active.
- `srcs/backend/src/main/java/com/BHT/configuration/security/SecurityConfig.java:65` — `/admin/**` requires `ADMIN`.

### Affected Systems / Modules

- [[Features/to-do/Token-Usage-Dashboard]] — parent Feature document.
- [[Backend-Architecture]] — security and layering pattern.
- [[Backend-Model-Anatomy]] — repository/query conventions.
- `srcs/backend/src/main/java/com/BHT/models/message/MessageEntity.java` — data source and deletion semantics.

### Affected Processes

- Message deletion/conversation cleanup.
- Backend CI/test pipeline (H2 compatibility).

---

## Supporting Logs (Optional)

```text
No runtime logs — document review only.
```

### Log Analysis

Not applicable.

### Confidence Level

Confirmed for the `deletedAt` field absence and cascade-delete behavior. Strong hypothesis for the `DATE_TRUNC` parameterization issue.

### Remaining Uncertainty / Open Questions

- Does the team intend to introduce soft-delete for messages, or is cascade-delete the intended behavior?
- If soft-delete is intended, should `deletedAt` be added as part of this task or as a prerequisite?

---

## Solution Direction

### Proposed Fix

1. **Decide on historical data protection.** If the requirement stands:
   - Add `deletedAt` (or `deleted_at`) column to `MessageEntity`.
   - Update message queries/conversation deletion logic to set `deletedAt` instead of physically deleting.
   - Add `AND m.deletedAt IS NULL` to the Step 3 JPQL query.
   - If the requirement does not stand, remove the reference to "protect historical data" from the Task and document that conversation deletion permanently removes token history.

2. **Improve `DATE_TRUNC` portability.** Options:
   - Replace the parameterized call with a `CASE`/`IF` that selects between two whitelisted literals, e.g.:
     ```java
     CASE WHEN :interval = 'minute' THEN FUNCTION('DATE_TRUNC', 'minute', m.createdAt)
          ELSE FUNCTION('DATE_TRUNC', 'hour', m.createdAt)
     END
     ```
   - Or create two explicit repository methods (`aggregateByHour`, `aggregateByMinute`) and select between them in the service.
   - Or use a native query with a whitelisted interval literal and document the H2/PostgreSQL duality.

3. **Keep `@PreAuthorize("hasRole('ADMIN')")` on the service method** — this is correct and consistent with the codebase.
4. **Consider extracting validation** into a small private method or value object if more rules are added; for two checks, the current design is acceptable.

### Why This Fix Is Correct

Addressing historical data protection at the entity level is the only way to honor the stated requirement. Improving `DATE_TRUNC` portability prevents H2 test failures. The security annotation remains correct and consistent.

### Skills and Documentation Used During Analysis and Solution Validation

- `documentation-management` — Task/Bug document structure.
- `solid-deep-design` — Evaluated service cohesion and repository depth.
- `find-docs` — `ctx7` CLI unavailable; validated against codebase patterns and training knowledge.
- `glossary-management` — CLI unavailable; terms inferred from docs.

### Files to Modify or Create

- `documentation/Tasks/current/plan_tokens_task.md` — update Step 3 and add soft-delete decision.
- `documentation/Bugs/to-do/Review-of-plan-tokens-task-iteration-2.md` — this document.

### Validation Strategy After Fix

#### Automatic Validation
- [ ] Review the updated Task document to confirm `deletedAt` handling is explicit.

#### Manual Validation
- [ ] Confirm with the team whether message soft-delete is required for the dashboard.

### Potential Risks / Notes

- Adding `deletedAt` to `MessageEntity` is a larger change than the dashboard itself; it affects all message write and query paths.
- If soft-delete is deferred, the dashboard's historical data will depend on conversation retention.

---

## Resolution Steps

### Phase 1: Clarify and document historical data protection
- [ ] **Step 1.1:** Decide whether messages should support soft-delete.
- [ ] **Step 1.2:** If yes, add `deletedAt` to `MessageEntity` and update deletion logic.
- [ ] **Step 1.3:** Add `AND m.deletedAt IS NULL` to the Step 3 query (or document the decision not to).

### Phase 2: Improve DATE_TRUNC portability
- [ ] **Step 2.1:** Refactor the query to use whitelisted interval literals or separate repository methods.
- [ ] **Step 2.2:** Verify the query against H2 in the test profile.

---

## Task Breakdown

### Task 1: Resolve historical data protection and query portability in plan_tokens_task.md
- **Steps Covered:** Step 1.1, Step 1.2, Step 1.3, Step 2.1, Step 2.2
- **Reason for Grouping:** Both findings affect the same Step 3 query and require documentation decisions before implementation.
- **Planned Task File:** `Review-of-plan-tokens-task-iteration-2-step-1-1-patch-task-doc.md`
- **Task Document Link:** [To be created]

---

## Expected Outcome After Fix

- The Task document explicitly states how historical token data is protected (or why it is not).
- The aggregation query is robust across PostgreSQL and H2.
- Security and architecture remain consistent with existing patterns.

---

## Findings Summary Table

| # | Title | Severity | Status |
|---|-------|----------|--------|
| 1 | Historical data protection (`deletedAt`) is not implemented | 🟠 High | Pending |
| 2 | `DATE_TRUNC` interval passed as parameter may cause dialect issues | 🟡 Moderate | Pending |
| 3 | `TokenUsageService` mixes authorization, validation, and transaction concerns | 🟢 Low | Pending |
