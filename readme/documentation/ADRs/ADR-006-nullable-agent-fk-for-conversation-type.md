---
id: ADR-006
title: Nullable Agent FK on Conversation Instead of Separate General and Agent Conversation Types
status: accepted
date: 2026-06-15
---

## Context

Conversations in AgentForge come in two flavors: free/general conversations (no agent, plain LLM chat) and agent conversations (powered by a saved Agent with system prompts). The team considered two ways to model this:

**Option A — Separate entities:** A `GeneralConversationEntity` for free chat and `AgentConversationEntity` for agent-powered chat, with separate repositories, controllers, and list endpoints.

**Option B — Single entity with nullable FK:** A single `ConversationEntity` where the `agent` field is a nullable FK to `AgentEntity`. A `null` value means general conversation; a non-null value means agent conversation.

Option A doubles the surface area (two controllers, two services, two repositories, two sets of DTOs) for what is ultimately the same data structure with one optional field difference. It also complicates the "conversation list" view, which would need to merge two separate queries to show all of a user's conversations in one list.

## Decision

A single `ConversationEntity` is used for all conversations. The `agent` FK is nullable:
- `agent = null` → general/free conversation
- `agent = <id>` → agent-powered conversation

The conversation list endpoint returns all conversations for an employee in a single query. The frontend uses the presence or absence of the `agent` field in the response DTO to render the appropriate UI.

## Consequences

**For developers:**
- Do not create `GeneralConversationEntity`, `AgentConversationEntity`, or any conversation subtype.
- When the `OpenRouterService` builds the message payload, it must check whether `conversation.agent` is null. If null, build from history only. If non-null, prepend agent prompts (see ADR-008 for how prompts are applied).
- Do not add a conversation `type` enum that mirrors the nullable agent FK — the FK itself is the discriminator. An entity with `agent != null` is an agent conversation.
- If a future conversation type is needed (e.g., multi-agent, tool-use sessions), evaluate whether a `type` enum or a new entity is more appropriate at that point. Do not pre-emptively add types now.
