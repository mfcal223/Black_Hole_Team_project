---
id: ADR-007
title: Admin-Curated LlmModel List Controls Which Models Employees Can Use
status: accepted
date: 2026-06-15
---

## Context

OpenRouter exposes hundreds of models. Employees could theoretically be allowed to type any model ID and use it freely. However, AgentForge's core value proposition is **centralized control**: the business controls costs, quality, and data routing. Allowing free model selection by employees undermines that.

Additionally, token pricing varies dramatically across models. An unconstrained employee could accidentally (or intentionally) consume expensive model capacity with no visibility to the admin until the bill arrives.

## Decision

Only models explicitly added by an Admin appear in the employee UI. This is enforced through `LlmModelEntity`:

1. Admin calls `GET /admin/llm-models/available` — the backend proxies OpenRouter's `/models` endpoint and returns the full catalog.
2. Admin selects models to activate and calls `POST /admin/llm-models` — these are saved as `LlmModelEntity` rows with `isEnabled = true`.
3. The employee model picker only shows `LlmModelEntity` records where `isEnabled = true`.
4. When an employee sends a message, the backend validates that the requested model ID exists in `LlmModelEntity` and is enabled before forwarding to OpenRouter.

If no models are enabled, employees cannot start a conversation. This is a deliberate gate — the application is not usable until an admin completes setup.

## Consequences

**For developers:**
- Do not allow employees to pass a free-text model ID to any chat endpoint. Always validate against `LlmModelEntity` before forwarding to OpenRouter.
- Do not add an employee-facing endpoint that proxies the OpenRouter model catalog. Only admins may browse and add models.
- Disabling a model (`isEnabled = false`) must not delete the entity — existing `ConversationEntity` and `MessageEntity` records hold FKs to it. Disable, never hard-delete without a data migration plan.
- Do not cache the enabled model list indefinitely on the backend. An admin toggling a model should take effect on the next request, not after a server restart.

**Accepted trade-offs:**
- Admins must manually add models. This is intentional friction — it forces a conscious cost and quality decision per model rather than blanket access to the full catalog.
- If OpenRouter adds or removes models from their catalog, the admin must re-sync the available list manually via the admin UI.
