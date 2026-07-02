# LLM Models API

Base path: `/llm-model`
Frontend calls: `/api/llm-model/**`
Auth required: **ROLE_ADMIN** on all endpoints. Every method in `LlmModelService` carries `@PreAuthorize("hasRole('ADMIN')")`.

LLM Models are the catalog of models available for use in conversations. `modelId` is the OpenRouter model identifier string (e.g., `openai/gpt-4o`). `isEnabled` controls whether a model appears in user-facing selectors.

---

## GET /llm-model

Returns all models in the catalog.

**Response 200** — `LlmModelDTO[]`
```json
[
  {
    "id": 1,
    "modelId": "openai/gpt-4o",
    "name": "GPT-4o",
    "description": "OpenAI's flagship multimodal model.",
    "isEnabled": true,
    "createdAt": "2026-06-26T10:00:00"
  }
]
```

---

## POST /llm-model

Adds a model to the catalog.

**Request body**
```json
{
  "modelId": "anthropic/claude-sonnet-4-6",
  "name": "Claude Sonnet 4.6",
  "description": "Anthropic's balanced model."
}
```

`modelId` and `name` are required (min length 1). `description` is optional. `modelId` must be unique across all models — throws 409 if it already exists.

**Response 200** — `LlmModelMiniDTO`
```json
{
  "id": 2,
  "modelId": "anthropic/claude-sonnet-4-6",
  "name": "Claude Sonnet 4.6",
  "isEnabled": true
}
```

---

## GET /llm-model/{id}

**Response 200** — `LlmModelDTO`

---

## PUT /llm-model/{id}

Partial update — only non-blank fields are applied. `modelId` uniqueness is re-checked if it changes — throws 409 if already taken. `description` is updated only if non-null. `isEnabled` cannot be changed via this endpoint — use `PATCH /{id}/toggle`.

**Request body** — `LlmModelForm`

**Response 200** — `LlmModelDTO`

---

## DELETE /llm-model/{id}

**Returns 400 / error — LLM models cannot be deleted.** The service throws `InvalidDeleteOperation("LLM models cannot be deleted. Use toggle to disable.")`. Use `PATCH /llm-model/{id}/toggle` to disable a model instead.

---

## PATCH /llm-model/{id}/toggle

Toggles `isEnabled` between true and false. Use to hide/show a model in user-facing selectors without deleting it.

**No request body.**

**Response 200** — `LlmModelDTO`

> **CORS issue:** PATCH is not in `allowedMethods` in `SecurityConfig`. Will fail CORS preflight until PATCH is added.

---

## GET /llm-model/available

Fetches the live list of models from OpenRouter using the current API key from `AppSettings`. Auth: **ROLE_ADMIN** (explicit `@PreAuthorize` on the controller method). Returns available model names and IDs from OpenRouter's catalog — useful for populating a picker when adding a new model to the local catalog.

Requires `AppSettings.openRouterApiKey` to be set. Returns error if the key is missing or invalid.

**Response 200** — `OpenRouterModelInfo[]`
```json
[
  {
    "modelId": "openai/gpt-4o",
    "name": "GPT-4o",
    "description": "OpenAI's flagship..."
  },
  {
    "modelId": "anthropic/claude-sonnet-4-6",
    "name": "Claude Sonnet 4.6",
    "description": "..."
  }
]
```

---

## POST /llm-model/list

Paginated, filtered, sorted list.
See [[_Shared-Schemas]] for `PageableRequest` format.

**Response 200** — pagination envelope with `LlmModelListDTO[]` in `content`.

---

## Schemas

### LlmModelForm
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `modelId` | string | yes | min length 1; OpenRouter model ID e.g. `openai/gpt-4o` |
| `name` | string | yes | min length 1; display name |
| `description` | string | — | |

### LlmModelDTO
| Field | Type |
|-------|------|
| `id` | long |
| `modelId` | string |
| `name` | string |
| `description` | string |
| `isEnabled` | boolean |
| `createdAt` | datetime |

### LlmModelMiniDTO
| Field | Type |
|-------|------|
| `id` | long |
| `modelId` | string |
| `name` | string |
| `isEnabled` | boolean |

### LlmModelListDTO (inside paginated content)
Same fields as `LlmModelDTO`.

### OpenRouterModelInfo
| Field | Type |
|-------|------|
| `modelId` | string |
| `name` | string |
| `description` | string |
