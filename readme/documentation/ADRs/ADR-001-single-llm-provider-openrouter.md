---
id: ADR-001
title: Single LLM Provider (OpenRouter) for MVP
status: accepted
date: 2026-06-15
---

## Context

AgentForge needs to route employee chat requests to one or more LLM providers. The long-term vision includes supporting multiple providers directly (Anthropic, OpenAI, Google, etc.) alongside OpenRouter. However, this is an MVP with a hard constraint: **ship something working fast**.

Supporting multiple providers in parallel would require:
- An abstraction layer with a provider registry
- Per-provider authentication and configuration schemas
- Per-provider response normalization
- Multiple sets of integration tests
- Admin UI flows to configure each provider separately

None of that is needed to validate the core product.

OpenRouter already solves the multi-model problem: it exposes a single OpenAI-compatible API that proxies requests to hundreds of models across all major providers. One integration gives access to the full catalog.

## Decision

For the MVP, **OpenRouter is the only supported LLM provider**. No other provider integrations will be built. The backend will not implement a provider registry, a provider selection mechanism, or any provider-specific configuration beyond OpenRouter.

The integration lives in a single `OpenRouterService` Spring bean. The service boundary is clean enough that adding a second provider later is an interface extraction, not an architectural change.

## Consequences

**For developers:**
- Do not add provider selection logic, provider enums, or a provider FK to any entity.
- Do not build an `AnthropicService`, `OpenAIService`, or any other provider service until this ADR is superseded.
- If a second provider is needed in the future, the correct path is: extract a `LlmProviderService` interface, make `OpenRouterService` one implementation, and add the new service as a second implementation. The rest of the application depends on the interface — nothing else should change.

**Accepted trade-offs:**
- Businesses that want to use a provider not available on OpenRouter cannot be served by this MVP.
- All LLM costs route through OpenRouter's pricing, not direct provider pricing.
- The company is operationally dependent on OpenRouter's uptime for the duration of the MVP.
