#moderate #architectural

## Bug: Review of plan_tokens_task_2.md

### Summary

This is a review of the revised Task document [[Tasks/current/plan_tokens_task_2]]. The document has substantially improved since the previous iteration: the invalid `CAST(... AS long)` was removed, `@Transactional(readOnly = true)` was added, the `DATE_TRUNC` query now uses hardcoded literals inside a `CASE` expression for dialect portability, and validation was extracted into a private method. The main remaining issue is a scope mismatch: the user explicitly asked to ensure `deletedAt IS NULL` protects historical data, but the document scopes soft-delete support out as a separate task. There is also a concern about the proposed H2 test-profile change.

### Reproduction Conditions

Not applicable — this is a document review.

### Environment / Preconditions (Optional)

- Backend: Spring Boot 3.4.1 / Hibernate 6 / PostgreSQL in production / H2 in MySQL mode for tests.
- `MessageEntity` has no `deletedAt` field.

### Real-World Scenarios

1. The dashboard ships as documented. A few weeks later, an admin deletes a conversation to clean up data. Because `MessageEntity` cascade-deletes with the conversation, the token usage history for that period disappears from the dashboard. The admin expected "historical data protection" but the feature does not provide it.
2. A developer follows Step 7 and switches the H2 test profile to `MODE=PostgreSQL` to make `DATE_TRUNC` work. Several existing tests that rely on MySQL-specific behavior (e.g. `DATABASE_TO_LOWER=TRUE`) start failing, causing unexpected CI breakage.

### Expected Behavior

The Task document should either implement the user's stated `deletedAt` requirement or clearly surface the scope decision to the user before work begins. The H2 compatibility fallback should avoid broad changes to the test profile.

### Actual Behavior

- `deletedAt` is explicitly scoped OUT.
- Step 7 suggests changing the H2 compatibility mode to `PostgreSQL` as a fallback.

### Impact

- Potential mismatch between user expectation (historical data protection) and delivered behavior.
- Potential unintended side effects if the H2 test profile mode is changed.

### Findings

1. `deletedAt IS NULL` historical data protection is scoped out, while the review request explicitly asked to ensure it is implemented.
2. Step 7's fallback recommendation to switch H2 to `MODE=PostgreSQL` is a broad change that may break existing tests.
3. `TokenUsageService` still combines authorization, validation, and orchestration (minor, mitigated by `normalizeInterval`).

### Investigation Scope

- **Code Reviewed:** `documentation/Tasks/current/plan_tokens_task_2.md`, `srcs/backend/src/main/resources/application-test.properties`, `srcs/backend/src/main/java/com/BHT/models/message/MessageEntity.java`.
- **Logs Reviewed:** No.
- **Runtime Evidence:** None — document review only.

### Root Cause Analysis

The Task document correctly identified that adding `deletedAt` to `MessageEntity` is a cross-cutting change and chose to scope it out. However, the user's review instruction still treats it as a requirement. The H2 fallback recommendation is a pragmatic attempt to solve the `DATE_TRUNC` problem but underestimates the blast radius of changing the test-profile mode.

### Evidence in Code

- `srcs/backend/src/main/resources/application-test.properties` — current test URL is `jdbc:h2:mem:testdb;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH`.
- `srcs/backend/src/main/java/com/BHT/models/message/MessageEntity.java:31-34` — `@OnDelete(action = OnDeleteAction.CASCADE)` on `conversation_id`.
- `documentation/Tasks/current/plan_tokens_task_2.md:53-64` — explicit scope decision that `deletedAt` is out of scope.

### Affected Systems / Modules

- [[Features/to-do/Token-Usage-Dashboard]] — parent Feature document.
- [[Backend-Architecture]] — security and layering pattern.
- `srcs/backend/src/main/java/com/BHT/models/message/MessageEntity.java` — deletion semantics.

### Affected Processes

- Conversation/message cleanup behavior.
- Backend CI/test configuration.

---

## Supporting Logs (Optional)

```text
No runtime logs — document review only.
```

### Log Analysis

Not applicable.

### Confidence Level

Confirmed for the scope decision and H2 test profile contents. Strong hypothesis for the blast radius of changing H2 mode.

### Remaining Uncertainty / Open Questions

- Is protecting historical token data a hard requirement for this dashboard, or is it acceptable to scope it out?
- Does the current H2 version support `date_trunc` in MySQL mode, or is a native query the safer fallback?

---

## Solution Direction

### Proposed Fix

1. **Clarify the `deletedAt` requirement with the user.** If historical data protection is required, create a separate prerequisite task to add `deletedAt` soft-delete to `MessageEntity` before this dashboard task begins. If it is not required, keep the current scope decision and update the user's acceptance criteria to reflect that conversation deletion permanently removes token history.

2. **Refine the H2 compatibility fallback.** Instead of recommending `MODE=PostgreSQL`, recommend:
   - First, verify whether the current H2 version supports `date_trunc` in MySQL mode.
   - If not, use a **native query** with the same whitelisted-literal pattern, or
   - Add a profile-specific repository implementation that uses H2-compatible scalar functions.
   Changing the global H2 mode should be the last resort because it can break other tests.

3. **Keep `normalizeInterval` and `@Transactional(readOnly = true)`** — these are good improvements.

### Why This Fix Is Correct

Separating the soft-delete decision into its own task prevents scope creep while ensuring the user's requirement is explicitly addressed. Avoiding a global H2 mode change reduces the risk of unrelated test failures.

### Skills and Documentation Used During Analysis and Solution Validation

- `documentation-management` — Task/Bug document structure.
- `solid-deep-design` — Evaluated service cohesion and repository depth.
- `find-docs` — `ctx7` CLI unavailable; validated against codebase patterns and training knowledge.

### Files to Modify or Create

- `documentation/Tasks/current/plan_tokens_task_2.md` — update Step 7 fallback and clarify deletedAt scope.
- `documentation/Bugs/to-do/Review-of-plan-tokens-task-2.md` — this document.

### Validation Strategy After Fix

#### Automatic Validation
- [ ] Review the updated Task document to confirm H2 fallback does not recommend changing the global test profile mode.

#### Manual Validation
- [ ] Confirm with the user whether historical data protection is required.

### Potential Risks / Notes

- If soft-delete is required, the dashboard delivery will be blocked until the prerequisite task is complete.
- Native query fallback requires maintaining two SQL dialects (PostgreSQL + H2) if not handled by Spring profiles.

---

## Resolution Steps

### Phase 1: Resolve scope ambiguity and H2 fallback
- [ ] **Step 1.1:** Confirm user decision on `deletedAt` / historical data protection.
- [ ] **Step 1.2:** Update Step 7 to recommend H2-native verification or profile-specific native query instead of changing global H2 mode.
- [ ] **Step 1.3:** Add a note to the Scope Decisions section linking to the prerequisite task if soft-delete is required.

---

## Task Breakdown

### Task 1: Patch plan_tokens_task_2.md scope and H2 fallback
- **Steps Covered:** Step 1.1, Step 1.2, Step 1.3
- **Reason for Grouping:** Both findings require small edits to the same Task document.
- **Planned Task File:** `Review-of-plan-tokens-task-2-step-1-1-patch-task-doc.md`
- **Task Document Link:** [To be created]

---

## Expected Outcome After Fix

- The user explicitly accepts or rejects the scope decision on historical data protection.
- The H2 compatibility fallback is safe and does not risk breaking other tests.
- The Task document is ready for implementation.

---

## Findings Summary Table

| # | Title | Severity | Status |
|---|-------|----------|--------|
| 1 | `deletedAt` historical-data protection scoped out despite review request | 🟡 Moderate | Pending |
| 2 | H2 fallback recommends changing global test profile mode to PostgreSQL | 🟡 Moderate | Pending |
| 3 | `TokenUsageService` still combines authorization, validation, and orchestration | 🟢 Low | Pending |
