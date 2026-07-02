#high #architectural

## Bug: Review of plan_tokens_task_3.md

### Summary

This is a review of the redesigned Task document [[Tasks/current/plan_tokens_task_3]]. The document addresses the historical-data-protection requirement with a clean architectural solution — an append-only `TokenUsageEntry` ledger decoupled from `MessageEntity` — rather than soft-delete. `DATE_TRUNC` remains dialect-safe, the H2 fallback no longer touches the global test profile, and security is correctly layered. The remaining issues are implementation gaps: the exact message-creation hooks are not specified, `employeeId` resolution for assistant messages is underspecified, and null token values from user messages are not handled.

### Reproduction Conditions

Not applicable — this is a document review.

### Environment / Preconditions (Optional)

- Backend: Spring Boot 3.4.1 / Hibernate 6 / PostgreSQL in production / H2 in MySQL mode for tests.
- Messages are created in `MessageService.appendUserMessage(...)` and `MessageService.appendAssistantMessage(...)`.
- User messages do not set `inputTokens` / `outputTokens` (they remain `null`).
- Assistant messages receive token counts from `OpenRouterUsage`.

### Real-World Scenarios

1. A developer implements the ledger write by hooking only into `appendAssistantMessage`. User messages consume zero tokens, but the dashboard now shows only assistant-side usage. If the team expected user prompts to also count toward consumption, the totals are wrong.
2. A developer writes a `TokenUsageEntry` for every message, copying `message.getInputTokens()` directly into the non-nullable `inputTokens` column. For user messages this value is `null`, causing a `ConstraintViolationException` or `DataIntegrityViolationException` at runtime.
3. A developer cannot determine the `employeeId` inside `appendAssistantMessage` because the method only receives `conversationId`, not the authenticated employee. They write a TODO and the ledger rows are left without ownership attribution.

### Expected Behavior

The Task document should name the exact methods where ledger writes happen, specify how `employeeId` is resolved for system-generated assistant messages, and define the null-token handling rule.

### Actual Behavior

- Step 2 says "Locate the existing message-creation service ... to be confirmed against the actual codebase path" instead of naming `MessageService.appendUserMessage` and `MessageService.appendAssistantMessage`.
- The example code passes `resolveEmployeeId(message)` without explaining how it works for assistant messages.
- The edge case mentions skipping zero-token messages but does not address `null` token fields on user messages.

### Impact

- Implementation cannot proceed without additional codebase exploration.
- Runtime errors if user messages are written to the ledger with null token counts.
- Inconsistent or missing ownership attribution on ledger rows.

### Findings

1. The exact message-creation hooks are not specified in the Task document.
2. `employeeId` resolution is underspecified, especially for assistant messages which have no authenticated employee in scope.
3. `TokenUsageEntry` declares non-nullable `inputTokens`/`outputTokens`, but user messages have null token fields.
4. No migration/backfill strategy for existing messages (acceptable for MVP but should be documented).
5. `TokenUsageEntry` entity does not follow the project's Lombok conventions.
6. Index on `employee_id` is created but the query does not filter by employee.

### Investigation Scope

- **Code Reviewed:** `documentation/Tasks/current/plan_tokens_task_3.md`, `srcs/backend/src/main/java/com/BHT/models/message/MessageService.java`, `srcs/backend/src/main/java/com/BHT/models/chat/ChatTurnService.java`, `srcs/backend/src/main/java/com/BHT/shared/tools/AuthUserUtil.java`, `srcs/backend/src/main/java/com/BHT/models/message/MessageEntity.java`.
- **Logs Reviewed:** No.
- **Runtime Evidence:** None — document review only.

### Root Cause Analysis

The Task document was written from an architectural perspective and left the concrete integration points as "to be confirmed." Because the ledger must be written in the same transaction as message creation, the exact call sites and ownership semantics are critical and cannot be deferred to implementation time without risk.

### Evidence in Code

- `srcs/backend/src/main/java/com/BHT/models/message/MessageService.java:73-122` — `appendUserMessage` leaves `inputTokens`/`outputTokens` unset; `appendAssistantMessage` sets them from OpenRouter usage.
- `srcs/backend/src/main/java/com/BHT/models/message/MessageService.java:103` — `appendAssistantMessage` has no `@PreAuthorize` and no authenticated employee parameter.
- `srcs/backend/src/main/java/com/BHT/models/chat/ChatTurnService.java:49-109` — `processTurn` calls both message-creation methods within a single transaction.
- `srcs/backend/src/main/java/com/BHT/models/message/MessageEntity.java:49-53` — `inputTokens` and `outputTokens` are nullable `Integer`.

### Affected Systems / Modules

- [[Features/to-do/Token-Usage-Dashboard]] — parent Feature document.
- [[Backend-Architecture]] — transaction and layering conventions.
- [[Backend-Model-Anatomy]] — entity/repository conventions.
- `srcs/backend/src/main/java/com/BHT/models/message/MessageService.java` — message-creation hooks.
- `srcs/backend/src/main/java/com/BHT/models/chat/ChatTurnService.java` — orchestrates the message-creation transaction.

### Affected Processes

- Chat turn processing and message persistence.
- Token usage tracking.

---

## Supporting Logs (Optional)

```text
No runtime logs — document review only.
```

### Log Analysis

Not applicable.

### Confidence Level

Confirmed for the message-creation methods and null token fields. Strong hypothesis for the ownership attribution issue.

### Remaining Uncertainty / Open Questions

- Should user messages be counted in the token ledger even though they consume zero LLM tokens, or should only assistant messages be tracked?
- Should the dashboard aggregate by conversation employee, message author, or authenticated user at creation time?

---

## Solution Direction

### Proposed Fix

1. **Specify exact ledger write locations.** Update Step 2 to name:
   - `MessageService.appendUserMessage(...)` — write a ledger row with `inputTokens = 0L`, `outputTokens = 0L` (or skip, depending on product decision), using `employee.getId()` from `currentEmployee()`.
   - `MessageService.appendAssistantMessage(...)` — write a ledger row with the OpenRouter token counts, resolving `employeeId` from `conversation.getEmployee().getId()`.

2. **Handle null token values.** Change `TokenUsageEntry` to accept nullable `Long` token fields, or normalize nulls to `0L` at write time. Document the rule: null input/output tokens are stored as `0L`.

3. **Clarify ownership semantics.** State that `employeeId` on the ledger represents the conversation owner, not necessarily the principal who triggered the assistant response. This aligns with the existing `ConversationEntity.employee` relationship.

4. **Document backfill.** Add a note that existing messages will not be reflected in the dashboard unless a one-time migration is run; for MVP, the dashboard only shows usage from deployment forward.

5. **Follow Lombok conventions.** Add `@Entity`, `@Table`, `@Getter`, `@NoArgsConstructor(access = AccessLevel.PROTECTED)`, and optionally `@AllArgsConstructor` to match the codebase style.

6. **Justify or remove the `employee_id` index.** If future features will filter by employee, keep it and document the plan. Otherwise, remove it to avoid maintaining an unused index.

### Why This Fix Is Correct

Naming the exact hooks removes ambiguity and lets the implementer make the change safely within existing transaction boundaries. Handling nulls prevents runtime constraint violations. Documenting ownership semantics prevents confusion when assistant messages are written on behalf of a conversation.

### Skills and Documentation Used During Analysis and Solution Validation

- `documentation-management` — Task/Bug document structure.
- `solid-deep-design` — Evaluated ledger decoupling and service boundaries.
- `find-docs` — `ctx7` CLI unavailable; validated against codebase patterns and training knowledge.

### Files to Modify or Create

- `documentation/Tasks/current/plan_tokens_task_3.md` — update Step 1, Step 2, and design decisions.
- `documentation/Bugs/to-do/Review-of-plan-tokens-task-3.md` — this document.

### Validation Strategy After Fix

#### Automatic Validation
- [ ] Review the updated Task document to confirm exact message-creation hooks are named.

#### Manual Validation
- [ ] Confirm with the team whether user messages should appear in the ledger with zeros or be skipped entirely.

### Potential Risks / Notes

- Writing the ledger inside `ChatTurnService.processTurn` instead of `MessageService` would place the concern in the wrong layer; the document should keep writes inside `MessageService`.
- If assistant message creation fails after OpenRouter streaming, the `DataAccessException` handling should not silently skip the ledger write — the current design already throws `AssistantMessageSaveException`, which is correct.

---

## Resolution Steps

### Phase 1: Close implementation gaps in the Task document
- [ ] **Step 1.1:** Name `MessageService.appendUserMessage` and `MessageService.appendAssistantMessage` as the ledger write locations.
- [ ] **Step 1.2:** Specify `employeeId` resolution for both methods.
- [ ] **Step 1.3:** Add null-token normalization rule.
- [ ] **Step 1.4:** Document backfill/migration scope.
- [ ] **Step 1.5:** Update `TokenUsageEntry` entity to use Lombok conventions.
- [ ] **Step 1.6:** Justify or remove the `employee_id` index.

---

## Task Breakdown

### Task 1: Patch plan_tokens_task_3.md implementation details
- **Steps Covered:** Step 1.1, Step 1.2, Step 1.3, Step 1.4, Step 1.5, Step 1.6
- **Reason for Grouping:** All updates are small edits to the same Task document.
- **Planned Task File:** `Review-of-plan-tokens-task-3-step-1-1-patch-task-doc.md`
- **Task Document Link:** [To be created]

---

## Expected Outcome After Fix

- The Task document can be implemented without ambiguity about where or how to write ledger rows.
- The ledger design correctly handles user messages, assistant messages, and ownership attribution.
- The entity follows project conventions.

---

## Findings Summary Table

| # | Title | Severity | Status |
|---|-------|----------|--------|
| 1 | Exact message-creation hooks are not specified | 🟠 High | Pending |
| 2 | `employeeId` resolution is underspecified for assistant messages | 🟠 High | Pending |
| 3 | `TokenUsageEntry` has non-nullable token fields but user messages have null tokens | 🟡 Moderate | Pending |
| 4 | No migration/backfill strategy for existing messages | 🟡 Moderate | Pending |
| 5 | `TokenUsageEntry` entity does not follow Lombok conventions | 🟢 Low | Pending |
| 6 | `employee_id` index justification is unclear | 🟢 Low | Pending |
