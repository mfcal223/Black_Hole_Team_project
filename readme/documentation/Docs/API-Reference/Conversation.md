# Conversation API

Base path: `/conversation`
Frontend calls: `/api/conversation/**`
Auth required: **ROLE_EMPLOYEE** on all endpoints.

Conversations are ownership-scoped to the authenticated employee. A conversation holds a reference to a model (the LLM it currently uses) and optionally an agent (persona). Messages are exchanged via WebSocket — see [[WebSocket-Chat]].

---

## POST /conversation

Creates a new conversation.

**Request body**
```json
{
  "title": "Q3 Research Session",
  "modelId": 2,
  "agentId": 7
}
```

`modelId` is required and must reference an **enabled** LLM model — throws 404 if the model does not exist or is disabled. `title` defaults to `"New Conversation"` if null or blank. `agentId` is optional — if provided, it must reference an agent **owned by the authenticated employee** (throws 404 otherwise).

**Response 200** — `ConversationMiniDTO`
```json
{
  "id": 12,
  "title": "Q3 Research Session",
  "createdAt": "2026-06-26T10:00:00"
}
```

---

## GET /conversation/{id}

Returns the full conversation record.

**Response 200** — `ConversationDTO`
```json
{
  "id": 12,
  "title": "Q3 Research Session",
  "employeeId": 3,
  "agentId": 7,
  "currentModelId": 2,
  "createdAt": "2026-06-26T10:00:00",
  "updatedAt": "2026-06-26T10:05:00"
}
```

---

## PUT /conversation/{id}

**Returns 405 Method Not Allowed.** `ConversationService.update()` is disabled — use `PATCH /conversation/{id}/title` or `PATCH /conversation/{id}/model` instead.

---

## DELETE /conversation/{id}

Deletes the conversation and all its messages (cascade delete on messages).

**Response 200** — `ConversationDTO` (the deleted record)

---

## GET /conversation

**Returns 405 Method Not Allowed.** `ConversationService.getAll()` is disabled — use `POST /conversation/list` instead.

---

## POST /conversation/list

Paginated, filtered, sorted list — scoped to the authenticated employee.
See [[_Shared-Schemas]] for `PageableRequest` format.

**Response 200** — pagination envelope with `ConversationListDTO[]` in `content`.

**Example request**
```json
{
  "page": 0,
  "size": 20,
  "sort": [{ "field": "updatedAt", "direction": "DESC" }],
  "filters": []
}
```

---

## PATCH /conversation/{id}/title

Updates only the conversation title.

**Request body**
```json
{ "title": "New Title" }
```

`title` is required (min length 1).

**Response 200** — `ConversationDTO`

> **CORS issue:** PATCH is not in `allowedMethods` in `SecurityConfig`. Will fail CORS preflight until PATCH is added.

---

## PATCH /conversation/{id}/model

Switches the LLM model for this conversation. Affects all future turns.

**Request body**
```json
{ "modelId": 3 }
```

`modelId` is required — must reference an **enabled** LLM model. Throws 404 if the model does not exist or is disabled.

**Response 200** — `ConversationDTO`

> **CORS issue:** Same as title patch — PATCH blocked by CORS.

---

## Schemas

### ConversationForm
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `modelId` | long | yes | References `LlmModel.id` |
| `title` | string | — | |
| `agentId` | long | — | References `Agent.id`; null = no persona |

### ConversationDTO
| Field | Type |
|-------|------|
| `id` | long |
| `title` | string |
| `employeeId` | long |
| `agentId` | long (nullable) |
| `currentModelId` | long |
| `createdAt` | datetime |
| `updatedAt` | datetime |

### ConversationMiniDTO
| Field | Type |
|-------|------|
| `id` | long |
| `title` | string |
| `createdAt` | datetime |

### ConversationListDTO (inside paginated content)
| Field | Type |
|-------|------|
| `id` | long |
| `title` | string |
| `agentId` | long (nullable) |
| `currentModelId` | long |
| `createdAt` | datetime |
| `updatedAt` | datetime |

### ConversationTitleForm
| Field | Type | Required |
|-------|------|----------|
| `title` | string | yes, min length 1 |

### ConversationModelSwitchForm
| Field | Type | Required |
|-------|------|----------|
| `modelId` | long | yes |
