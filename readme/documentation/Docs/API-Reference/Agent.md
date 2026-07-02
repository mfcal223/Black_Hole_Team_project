# Agent API

Base path: `/agent`
Frontend calls: `/api/agent/**`
Auth required: **ROLE_EMPLOYEE** on all endpoints.

Agents are ownership-scoped: every operation is automatically restricted to agents owned by the authenticated employee. Accessing another employee's agent returns 404, not 403.

---

## POST /agent

Creates a new agent. The authenticated employee becomes the owner.

**Request body**
```json
{
  "name": "Research Assistant",
  "description": "Finds and summarizes information from the web.",
  "initPrompt": "You are a research assistant. When given a topic, provide a concise, sourced summary.",
  "recurrentPrompt": "Always cite your reasoning. Be concise."
}
```

`name` and `initPrompt` are required (min length 1). `description` and `recurrentPrompt` are optional.

Agent names must be **unique per owner** — throws 409 if the authenticated employee already has an agent with the same name.

**Response 200** — `AgentMiniDTO`
```json
{
  "id": 7,
  "name": "Research Assistant",
  "createdAt": "2026-06-26T10:00:00"
}
```

---

## GET /agent/{id}

Returns the agent. Returns 404 if the agent does not belong to the authenticated employee.

**Response 200** — `AgentDTO`
```json
{
  "id": 7,
  "name": "Research Assistant",
  "description": "Finds and summarizes information from the web.",
  "initPrompt": "You are a research assistant...",
  "recurrentPrompt": "Always cite your reasoning.",
  "ownerId": 3,
  "createdAt": "2026-06-26T10:00:00",
  "updatedAt": "2026-06-26T10:00:00"
}
```

---

## PUT /agent/{id}

Full-state PUT — all four form fields are applied unconditionally. Sending `null` for `description` or `recurrentPrompt` clears that field. `name` uniqueness is re-checked (skipped if the name is unchanged). Returns 404 if not owned by the authenticated employee.

**Request body** — `AgentForm` (same as POST)

**Response 200** — `AgentDTO`

---

## DELETE /agent/{id}

Returns 404 if not owned by the authenticated employee.

**Response 200** — `AgentDTO` (the deleted record)

---

## GET /agent

**Returns 405 Method Not Allowed.** The unscoped getAll is disabled. Use `POST /agent/list` instead.

---

## POST /agent/list

Paginated, filtered, sorted list — **automatically scoped to the authenticated employee**.
See [[_Shared-Schemas]] for `PageableRequest` format.

**Response 200** — pagination envelope with `AgentListDTO[]` in `content`.

**Example request**
```json
{
  "page": 0,
  "size": 10,
  "sort": [{ "field": "updatedAt", "direction": "DESC" }],
  "filters": [
    {
      "field": "name",
      "operations": [{ "operator": "CONTAINS", "value": "research" }]
    }
  ]
}
```

---

## How initPrompt and recurrentPrompt work

These fields control how the agent participates in conversations. Neither is stored in the message history.

- **`initPrompt`** — injected as the `system` role message on the very first chat turn of a conversation. Tells the LLM who it is and what its job is.
- **`recurrentPrompt`** — prepended to the user's message text on every turn. Use for persistent formatting rules, constraints, or persona reinforcement.

Both are applied at request time by `ChatTurnService` when processing each WebSocket turn. See [[WebSocket-Chat]] for the full chat flow.

---

## Schemas

### AgentForm
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | yes | min length 1 |
| `initPrompt` | string | yes | min length 1 |
| `description` | string | — | |
| `recurrentPrompt` | string | — | |

### AgentDTO
| Field | Type |
|-------|------|
| `id` | long |
| `name` | string |
| `description` | string |
| `initPrompt` | string |
| `recurrentPrompt` | string |
| `ownerId` | long |
| `createdAt` | datetime |
| `updatedAt` | datetime |

### AgentMiniDTO
| Field | Type |
|-------|------|
| `id` | long |
| `name` | string |
| `createdAt` | datetime |

### AgentListDTO (inside paginated content)
| Field | Type |
|-------|------|
| `id` | long |
| `name` | string |
| `description` | string |
| `createdAt` | datetime |
| `updatedAt` | datetime |

Note: `initPrompt` and `recurrentPrompt` are intentionally omitted from list rows — fetch the full `AgentDTO` via `GET /agent/{id}` when you need them.
