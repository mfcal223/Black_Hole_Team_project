---
id: ADR-002
title: OpenRouter Implemented as a Spring Service, Not a JPA Entity
status: accepted
date: 2026-06-15
---

## Context

When the team discussed how to model the LLM provider layer, the question arose: should OpenRouter have a JPA entity in the database?

A JPA entity represents **persistent state that the application owns** — something stored, queried, and managed in our database. OpenRouter is an external HTTP API. We do not own it, we cannot query it through JPA, and it has no persistent state on our side beyond an API key (which already lives in `AppSettingsEntity`).

A hypothetical `OpenRouterProviderEntity` would contain:
- The base URL — a constant that never changes, not database state
- The API key — already stored in `AppSettingsEntity`

There is nothing left to justify a database table.

## Decision

OpenRouter is implemented as a Spring `@Service` class (`OpenRouterService`), not a JPA entity. It is a stateless HTTP adapter with two responsibilities:

1. `chat(messages, modelId)` — build the request payload, call OpenRouter's `/chat/completions`, return content and token usage.
2. `fetchAvailableModels()` — proxy OpenRouter's `/models` endpoint for the admin's model browser.

The service reads the API key from `AppSettingsEntity` at call time (via an injected settings service). It does not access `ConversationEntity`, `MessageEntity`, or any other domain entity directly — it speaks only in plain DTOs.

## Consequences

**For developers:**
- Do not create a `LlmProviderEntity`, `OpenRouterEntity`, or any JPA entity for a provider.
- Do not store provider connection details (URLs, timeouts, headers) in the database. These belong in `application.properties` or `AppSettingsEntity` for the API key only.
- `OpenRouterService` must remain a pure HTTP adapter. If it needs to write to the database (e.g., for logging), inject a repository into the calling service layer — not into `OpenRouterService` itself.
- The service should throw domain exceptions (not raw HTTP exceptions) so callers are decoupled from the HTTP layer.

**Accepted trade-offs:**
- The API key is read from the database on every call (or near-every call if cached). This is a deliberate choice to allow runtime key rotation without a restart.
- There is no connection pooling or circuit breaker in the MVP. These are valid future additions if OpenRouter reliability becomes a concern.
