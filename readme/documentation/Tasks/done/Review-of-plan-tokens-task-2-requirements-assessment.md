#critical #architectural

## Bug: Review of plan_tokens_task_2.md — Requirements & Risk Assessment

### Summary

This is a targeted review of [[Tasks/current/plan_tokens_task_2]] against the stated user-facing requirement: **deleting a `Message` or `Conversation` must not cause previously recorded token usage to disappear from the dashboard**. The document does **not** satisfy this requirement. It explicitly scopes historical-data protection out and aggregates over `MessageEntity`, which is subject to `ON DELETE CASCADE` when a `Conversation` is deleted. Other issues include a global H2 test-profile change recommendation and a persistence-model choice that couples the dashboard to message lifecycle.

### Reproduction Conditions

Not applicable — this is a document review.

### Environment / Preconditions (Optional)

- Backend: Spring Boot 3.4.1 / Hibernate 6 / PostgreSQL in production / H2 in MySQL mode for tests.
- `MessageEntity.conversation` has `@OnDelete(action = OnDeleteAction.CASCADE)`.
- `MessageEntity.inputTokens`/`outputTokens` are nullable `Integer` and are only set for assistant messages.

### Real-World Scenarios

1. An admin runs the dashboard for January, sees 1M tokens, then deletes an old conversation to clean up storage. Because `Conversation` deletion cascade-deletes all related `MessageEntity` rows, the dashboard now shows reduced January usage even though the tokens were actually consumed. The admin cannot trust the dashboard for capacity planning or billing.
2. A developer follows Step 7 and switches the H2 test profile to `MODE=PostgreSQL`. Several existing tests that rely on `DATABASE_TO_LOWER=TRUE` or MySQL-specific identifier behavior start failing in CI, blocking unrelated features.
3. A product manager asks "why did usage drop last month?" The engineering team explains that the dashboard only reflects conversations that still exist, which contradicts the original product requirement.

### Expected Behavior

The Task document should implement a persistence model and aggregation query such that deleting a message or conversation does not remove or alter previously aggregated token totals. Global shared configuration should not be changed as a side effect.

### Actual Behavior

- The dashboard aggregates `FROM MessageEntity m`.
- `MessageEntity` rows are cascade-deleted when their `Conversation` is deleted.
- The document explicitly states this behavior is out of scope.
- Step 7 recommends changing the global H2 test profile mode.

### Impact

- The feature **does not meet the stated user-facing requirement**.
- The dashboard will silently lose historical data, undermining trust.
- The H2 mode change risks unrelated test failures.

### Findings

1. **Critical:** Historical token usage is not protected from message/conversation deletion.
2. **High:** Step 7 recommends changing the global H2 test profile mode to `PostgreSQL`.
3. **Moderate:** Reusing `MessageEntity` couples the dashboard to message lifecycle.
4. **Moderate:** Requirement/scope mismatch — the document scopes out the very protection the user requires.
5. **Moderate:** User messages contribute null/0 tokens, which may or may not match the intended metric.

### Investigation Scope

- **Code Reviewed:** `documentation/Tasks/current/plan_tokens_task_2.md`, `srcs/backend/src/main/java/com/BHT/models/message/MessageEntity.java`, `srcs/backend/src/main/resources/application-test.properties`.
- **Logs Reviewed:** No.
- **Runtime Evidence:** None — document review only.

### Root Cause Analysis

The document prioritizes implementation simplicity over the stated requirement. Reading from `MessageEntity` avoids creating a new table but inherits its deletion semantics. The H2 fallback recommendation prioritizes getting `DATE_TRUNC` working over minimizing blast radius.

### Evidence in Code

- `srcs/backend/src/main/java/com/BHT/models/message/MessageEntity.java:31-34` — `@OnDelete(action = OnDeleteAction.CASCADE)` on `conversation_id`.
- `documentation/Tasks/current/plan_tokens_task_2.md:53-64` — explicit scope decision that historical data protection is out of scope.
- `documentation/Tasks/current/plan_tokens_task_2.md:510-511` — recommends `MODE=PostgreSQL` for H2 test profile.

### Affected Systems / Modules

- [[Features/to-do/Token-Usage-Dashboard]] — parent Feature document.
- [[Backend-Architecture]] — data lifecycle and layering.
- `srcs/backend/src/main/java/com/BHT/models/message/MessageEntity.java` — data source with cascade-delete semantics.
- `srcs/backend/src/main/resources/application-test.properties` — shared test configuration.

### Affected Processes

- Conversation/message cleanup.
- Token usage reporting and auditing.
- Backend CI/test pipeline.

---

## Supporting Logs (Optional)

```text
No runtime logs — document review only.
```

### Log Analysis

Not applicable.

### Confidence Level

Confirmed by direct code and document review.

### Remaining Uncertainty / Open Questions

- Is the user willing to accept that the dashboard only reflects conversations that still exist, or is historical-data protection a hard requirement?
- If historical protection is required, does the team prefer soft-delete on `MessageEntity` or an independent ledger table?

---

## Solution Direction

### Proposed Fix

The design must be changed so that token totals survive message/conversation deletion. Two main options exist; the recommended one is the independent ledger because it has the smallest blast radius on existing code.

**Recommended: Independent append-only ledger (`TokenUsageEntry`)**

- Create a new `TokenUsageEntry` entity/table with `employeeId`, `inputTokens`, `outputTokens`, `createdAt`, and an optional `sourceMessageId` (plain `Long` column, **not** a JPA relationship).
- Write one row per assistant message inside `MessageService.appendAssistantMessage`, in the same transaction as the message insert.
- Aggregate over `TokenUsageEntry` instead of `MessageEntity`.
- This satisfies the requirement without modifying `MessageEntity` deletion semantics or touching every message query.

**Alternative: Soft-delete on `MessageEntity`**

- Add `deletedAt` to `MessageEntity`.
- Change conversation deletion from hard delete to soft delete (or remove the cascade and set `deletedAt` on messages).
- Add `AND m.deletedAt IS NULL` only where active messages are needed; the dashboard aggregates over all rows.
- This has a larger blast radius because it changes every message write/query path and conversation deletion logic.

**H2 fallback fix:**

- Remove the recommendation to change the global H2 mode.
- Instead, verify H2-native `DATE_TRUNC` support or use a profile-scoped native query fallback.

### Why This Fix Is Correct

An independent ledger decouples the dashboard from message lifecycle, fully satisfying the historical-data requirement while leaving existing message logic untouched. It is the smallest-scoped architectural change that meets the requirement. Avoiding global H2 mode changes protects unrelated tests.

### Skills and Documentation Used During Analysis and Solution Validation

- `documentation-management` — Task/Bug document structure.
- `solid-deep-design` — Evaluated coupling between dashboard and message lifecycle.
- `find-docs` — `ctx7` CLI unavailable; validated against codebase patterns and training knowledge.

### Files to Modify or Create

- `documentation/Tasks/current/plan_tokens_task_2.md` — replace MessageEntity-based design with ledger-based design and revise H2 fallback.
- `documentation/Bugs/to-do/Review-of-plan-tokens-task-2-requirements-assessment.md` — this document.

### Validation Strategy After Fix

#### Automatic Validation
- [ ] Review the updated Task document to confirm aggregation reads from `TokenUsageEntry`.

#### Manual Validation
- [ ] Confirm with the user that the ledger-based approach satisfies the historical-data requirement.

### Potential Risks / Notes

- A ledger introduces a new table and a write-side integration point, but this is smaller than reworking message soft-delete.
- Existing messages will not be backfilled unless a migration is run; document this as out-of-scope if acceptable.

---

## Resolution Steps

### Phase 1: Redesign historical-data protection
- [ ] **Step 1.1:** Decide between independent ledger vs. soft-delete on `MessageEntity`.
- [ ] **Step 1.2:** Update the data model and aggregation query in the Task document.
- [ ] **Step 1.3:** Name exact integration points (e.g. `MessageService.appendAssistantMessage`).

### Phase 2: Fix H2 fallback
- [ ] **Step 2.1:** Remove global `MODE=PostgreSQL` recommendation.
- [ ] **Step 2.2:** Add profile-scoped native query fallback or H2-native verification.

---

## Task Breakdown

### Task 1: Redesign plan_tokens_task_2.md to satisfy historical-data requirement
- **Steps Covered:** Step 1.1, Step 1.2, Step 1.3, Step 2.1, Step 2.2
- **Reason for Grouping:** Both the data model and H2 fallback must be updated in the same Task document.
- **Planned Task File:** `Review-of-plan-tokens-task-2-requirements-assessment-step-1-1-redesign.md`
- **Task Document Link:** [To be created]

---

## Expected Outcome After Fix

- The Task document satisfies the user-facing historical-data-protection requirement.
- Global test configuration is not modified.
- The dashboard aggregates over a deletion-resistant data source.

---

## Findings Summary Table

| # | Title | Severity | Status |
|---|-------|----------|--------|
| 1 | Historical token usage is not protected from message/conversation deletion | 🔴 Critical | Pending |
| 2 | Step 7 recommends changing global H2 test profile mode to PostgreSQL | 🟠 High | Pending |
| 3 | Reusing `MessageEntity` couples the dashboard to message lifecycle | 🟡 Moderate | Pending |
| 4 | Requirement/scope mismatch: document scopes out the protection the user requires | 🟡 Moderate | Pending |
| 5 | User messages contribute null/0 tokens; metric definition is implicit | 🟡 Moderate | Pending |
