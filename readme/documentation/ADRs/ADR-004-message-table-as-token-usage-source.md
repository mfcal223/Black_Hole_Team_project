---
id: ADR-004
title: Message Table as the Source of Truth for Token Usage Analytics
status: accepted
date: 2026-06-15
---

## Context

The admin dashboard needs to display token consumption per employee and per model over time. The team considered two approaches:

**Option A — Separate `TokenUsageEntity`:** A dedicated table that records each LLM call: timestamp, employee, model, input tokens, output tokens. The dashboard queries this table directly.

**Option B — Query `MessageEntity` directly:** Since every LLM response is already stored as an `ASSISTANT` message with `inputTokens`, `outputTokens`, a FK to `LlmModelEntity`, and a creation timestamp, the message table already contains all the data needed for analytics.

Option A introduces a write-twice pattern: the same token data is written once to `MessageEntity` and again to `TokenUsageEntity`. This creates a risk of the two tables diverging (e.g., a message is saved but the usage record fails), adds an extra repository and mapper with no new information, and gives future developers a false impression that these are two different datasets when they are the same.

## Decision

`MessageEntity` is the sole source of truth for token usage. No `TokenUsageEntity` will be created.

The admin dashboard aggregates directly from the message table:

```sql
SELECT e.username, m.name, DATE(msg.created_at), 
       SUM(msg.input_tokens), SUM(msg.output_tokens)
FROM message msg
JOIN conversation c ON msg.conversation_id = c.id
JOIN employee e ON c.employee_id = e.id
JOIN llm_model m ON msg.llm_model_id = m.id
WHERE msg.role = 'ASSISTANT'
GROUP BY e.username, m.name, DATE(msg.created_at)
```

## Consequences

**For developers:**
- Do not create a `TokenUsageEntity`, `UsageLogEntity`, or any denormalized usage tracking table.
- The analytics service layer queries `MessageEntity` with JPA or QueryDSL. Add appropriate database indexes on `message.role`, `message.created_at`, and `message.llm_model_id` when performance tuning becomes necessary.
- If the message table grows very large and analytics queries become slow, the correct path is to add a materialized view or a read replica — not to introduce a separate denormalized table maintained by application code.

**Accepted trade-offs:**
- Analytics queries join across three tables. For the MVP scale (a single business's employees), this is not a concern. At high volume, indexing solves it before denormalization is needed.
