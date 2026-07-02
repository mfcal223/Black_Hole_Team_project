---
id: ADR-008
title: Agent System Prompts Are Reconstructed at Runtime, Not Persisted as Messages
status: accepted
date: 2026-06-15
---

## Context

When an agent-powered conversation is in progress, the `OpenRouterService` must inject the agent's prompts into the message payload sent to OpenRouter:
- `initPrompt` is injected as a `system` role message on the first turn.
- `recurrentPrompt` is prepended to every `user` role message.

The team considered whether these injected system messages should be saved as `MessageEntity` rows in the database alongside the regular conversation turns.

Arguments for persisting them:
- Complete audit trail of exactly what was sent to the LLM on every call.
- History reconstruction becomes a pure database read with no additional logic.

Arguments against:
- The prompts are already stored in `AgentEntity`. Persisting them as messages too is redundant duplication.
- If an agent's prompt is edited, persisted system messages in past conversations would show the old prompt — creating a confusing mismatch between what the agent currently says and what was stored.
- Reconstructing the payload at request time means an agent prompt edit immediately applies to all future messages in all conversations using that agent, which is the expected behavior.
- Storing system messages inflates the message table with rows that are never shown in the chat UI and serve no user-facing purpose.

## Decision

Agent system prompts are **not persisted as `MessageEntity` rows**. They are reconstructed at request time by `OpenRouterService` using the current state of `AgentEntity`. Only `USER` and `ASSISTANT` messages are saved to the database.

The payload sent to OpenRouter is built as follows:
- **First message in an agent conversation:** `[{role: system, content: agent.initPrompt}, ...<history>, {role: user, content: agent.recurrentPrompt + userInput}]`
- **Subsequent messages:** `[...<history>, {role: user, content: agent.recurrentPrompt + userInput}]`

The `initPrompt` is only prepended once (on the first turn) because it is included in the saved conversation history that gets replayed on all subsequent calls.

## Consequences

**For developers:**
- Do not save `system` role messages to `MessageEntity`. The `MessageRole` enum only needs `USER` and `ASSISTANT`.
- `OpenRouterService` is responsible for prompt injection. It must load `AgentEntity` (via the conversation's agent FK) before building the payload whenever the conversation has an agent.
- Editing an agent's `initPrompt` or `recurrentPrompt` takes effect immediately on all future messages across all conversations using that agent. This is intentional — document it in the Agent management UI so users understand the behavior.
- If a full audit log of the exact bytes sent to OpenRouter becomes a compliance requirement in the future, that is a separate concern (request logging at the HTTP layer, not message persistence) and should be addressed with a dedicated audit log mechanism, not by changing the message schema.

**Accepted trade-offs:**
- There is no record of which exact prompt text was active when a given `ASSISTANT` message was generated. If an agent prompt changes, the historical context is lost. This is acceptable for the MVP — the prompt is always recoverable from the agent's current state for recent conversations, and full audit logging is out of MVP scope.
