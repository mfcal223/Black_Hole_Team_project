# App Settings API

Base path: `/app-settings`
Frontend calls: `/api/app-settings`
Auth required: **ROLE_ADMIN** on `GET /app-settings` and `PATCH /app-settings`. **ROLE_EMPLOYEE** on `GET /app-settings/default-model`.

Singleton resource — only one row exists in the database. Seeded on first startup by `AppSettingsBootstrap`. Controls the OpenRouter API key and the default LLM model for the platform.

---

## GET /app-settings

Returns the current platform settings.

**Response 200** — `AppSettingsDTO`
```json
{
  "id": 1,
  "openRouterApiKey": "sk-or-...",
  "defaultModel": {
    "id": 1,
    "modelId": "openai/gpt-4o",
    "name": "GPT-4o",
    "isEnabled": true
  },
  "updatedAt": "2026-06-26T10:00:00",
  "updatedByUsername": "admin"
}
```

`openRouterApiKey` is the key used by the backend for all LLM calls through OpenRouter. `defaultModel` is the pre-selected model for new conversations.

---

## PATCH /app-settings

Updates settings.

**Request body**
```json
{
  "openRouterApiKey": "sk-or-new-key",
  "defaultModelId": 2
}
```

**Field semantics:**
- `openRouterApiKey` — updated only if non-null and non-blank; blank/null is silently ignored (existing key preserved).
- `defaultModelId` — **always evaluated**. If non-null, the referenced model must exist and be **enabled** (throws 400 if disabled). If null or omitted, the default model is **cleared** (set to null). Send the current `defaultModelId` back if you don't want to change it.

**Response 200** — `AppSettingsDTO`

> **CORS issue:** PATCH is not in `allowedMethods` in `SecurityConfig`. Will fail CORS preflight until PATCH is added.

---

## GET /app-settings/default-model

Returns only the admin-configured default model as `LlmModelMiniDTO`. Does **not** expose `openRouterApiKey` or any other admin-only field.

**Auth required:** `ROLE_EMPLOYEE`

**Response 200** — `LlmModelMiniDTO` (when a default model is configured)
```json
{
  "id": 1,
  "modelId": "openai/gpt-4o",
  "name": "GPT-4o",
  "isEnabled": true
}
```

**Response 204 No Content** — when no default model is configured, or when no `app_settings` row exists yet (fresh deploy before any admin save).

Frontend usage: `useChatSetup` calls this endpoint via `chatService.getDefaultModel()`. A `204` response is treated as "no default" and the chat page falls back to the first enabled model.

---

## Schemas

### AppSettingsForm
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `openRouterApiKey` | string | — | Raw key string; stored as-is |
| `defaultModelId` | long | — | References `LlmModel.id` |

### AppSettingsDTO
| Field | Type | Notes |
|-------|------|-------|
| `id` | long | Always 1 (singleton) |
| `openRouterApiKey` | string | The current OpenRouter key |
| `defaultModel` | LlmModelMiniDTO | Expanded model object |
| `updatedAt` | datetime | Last update timestamp |
| `updatedByUsername` | string | Username of last editor |

### LlmModelMiniDTO (nested)
| Field | Type |
|-------|------|
| `id` | long |
| `modelId` | string |
| `name` | string |
| `isEnabled` | boolean |

---

## Notes

- The `openRouterApiKey` is readable by the frontend via this endpoint, so avoid displaying it in full in the UI — consider masking it (show only last 4 chars).
- `defaultModelId` in the PATCH form references `LlmModel.id` (the internal DB id), not `LlmModel.modelId` (the OpenRouter string identifier).
