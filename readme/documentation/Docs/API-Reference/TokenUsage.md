# Token Usage

Admin-only endpoint for aggregating LLM token consumption over time.

---

## Auth

| Requirement | Value |
|-------------|-------|
| Role | `ROLE_ADMIN` |
| Header | `Authorization: Bearer <jwt>` |

---

## Endpoints

### GET /admin/token-usage

Returns aggregated token usage points for the requested time range.

#### Query parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `from` | `LocalDateTime` (ISO-8601) | Yes | — | Start of the range (inclusive). Example: `2026-06-01T00:00:00`. |
| `to` | `LocalDateTime` (ISO-8601) | Yes | — | End of the range (inclusive). Example: `2026-06-30T23:59:59`. |
| `interval` | `String` | No | `hour` | Aggregation bucket. Supported values: `hour`, `minute`. |

#### Response

**200 OK**

```json
[
  {
    "timestamp": "2026-06-30T10:00:00",
    "totalTokens": 1250
  },
  {
    "timestamp": "2026-06-30T11:00:00",
    "totalTokens": 890
  }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | `LocalDateTime` | Start of the aggregation bucket. |
| `totalTokens` | `Long` | Sum of `inputTokens + outputTokens` recorded in that bucket. |

#### Error responses

| Status | Cause |
|--------|-------|
| 401 | Missing or invalid JWT. |
| 403 | Authenticated user is not an admin. |

---

## Implementation notes

- Data is sourced from an independent, append-only `TokenUsageEntry` ledger written each time an assistant message is persisted in `MessageService.appendAssistantMessage`.
- The ledger is not cascaded when a `Message` or `Conversation` is deleted, so historical usage survives message/conversation removal.
- Aggregation uses dialect-safe `DATE_TRUNC` in production and an H2-compatible fallback for tests.
