---
id: ADR-003
title: Single Message Entity with Role Enum Instead of Separate User and LLM Message Types
status: accepted
date: 2026-06-15
---

## Context

Every conversation turn produces two messages: one from the employee (user input) and one from the LLM (assistant response). The team considered whether these should be separate JPA entities — a `UserMessageEntity` and an `LlmMessageEntity` — or a single entity with a discriminator field.

Arguments for separate entities:
- User messages and LLM messages have different fields (LLM messages have token counts, a model FK)
- Type safety at the Java level

Arguments for a single entity:
- OpenRouter (and all OpenAI-compatible APIs) represent messages as a list of objects each with a `role` field (`user`, `assistant`, `system`). A single entity maps directly to this structure, making payload assembly trivial.
- A separate entity for each type doubles the number of repositories, mappers, and query paths for what is functionally a list of ordered records.
- The "extra" fields on LLM messages (token counts, model FK) are simply nullable on user messages — a minor schema asymmetry, not a structural mismatch.
- History reconstruction for an API call is a single ordered query on one table, not a merge of two queries across two tables.

## Decision

A single `MessageEntity` with a `MessageRole` enum (`USER`, `ASSISTANT`) is used for all messages. Fields that only apply to LLM responses (`llmModel`, `inputTokens`, `outputTokens`) are nullable and are only populated on `ASSISTANT` messages.

System-role messages (agent prompts) are **not persisted at all** — they are reconstructed from `AgentEntity` at request time (see ADR-008).

## Consequences

**For developers:**
- Do not create `UserMessageEntity`, `LlmMessageEntity`, or any message subtype.
- When querying for token usage, always filter by `role = ASSISTANT` before summing token counts. `USER` messages will always have null token fields.
- When assembling the payload for an OpenRouter call, map `MessageEntity` directly to OpenRouter's message object format: `role` → `role`, `content` → `content`.
- If a future message type is needed (e.g., tool calls, image attachments), add the relevant nullable fields to `MessageEntity` and extend the `MessageRole` enum before considering a schema split.
