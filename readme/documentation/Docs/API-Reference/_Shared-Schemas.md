# Shared Schemas

These schemas are used across multiple domains. Every `POST /{resource}/list` endpoint accepts `PageableRequest` and returns a paginated envelope.

---

## PageableRequest

Request body for all list/filter endpoints.

```json
{
  "page": 0,
  "size": 20,
  "sort": [
    { "field": "createdAt", "direction": "DESC" }
  ],
  "filters": []
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `page` | int | no | 0-based. Default: 0 |
| `size` | int | no | 1–100. Default varies |
| `sort` | SortRequest[] | yes | Can be empty array |
| `filters` | FilterRequest[] | yes | Can be empty array |

---

## SortRequest

```json
{ "field": "createdAt", "direction": "DESC" }
```

| Field | Type | Values |
|-------|------|--------|
| `field` | string | Entity field name (max 64 chars) |
| `direction` | enum | `ASC`, `DESC` |

---

## FilterRequest

```json
{
  "field": "username",
  "operations": [
    { "operator": "CONTAINS", "value": "john" }
  ]
}
```

| Field | Type | Notes |
|-------|------|-------|
| `field` | string | Entity field name (max 64 chars) |
| `operations` | FilterOperationRequest[] | At least 1, max 2 per field |

---

## FilterOperationRequest

| Field | Type | Notes |
|-------|------|-------|
| `operator` | enum | See operators below |
| `value` | any | Omit for IS_NULL / IS_NOT_NULL |

### Operators

| Operator | Description |
|----------|-------------|
| `EQUALS` | Exact match |
| `NOT_EQUALS` | Exclude exact match |
| `CONTAINS` | Substring match (case varies by DB collation) |
| `STARTS_WITH` | Prefix match |
| `ENDS_WITH` | Suffix match |
| `GREATER_THAN` | Numeric / date comparison |
| `GREATER_THAN_OR_EQUAL` | Numeric / date comparison |
| `LESS_THAN` | Numeric / date comparison |
| `LESS_THAN_OR_EQUAL` | Numeric / date comparison |
| `IN` | Match any value in a list; `value` should be an array |
| `IS_NULL` | Field is null; no `value` needed |
| `IS_NOT_NULL` | Field is not null; no `value` needed |

---

## Pagination Envelope

All `POST /list` endpoints return this shape:

```json
{
  "totalElements": 42,
  "totalPages": 3,
  "first": true,
  "last": false,
  "size": 20,
  "number": 0,
  "numberOfElements": 20,
  "empty": false,
  "content": [ /* domain ListDTO objects */ ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 20,
    "offset": 0,
    "paged": true,
    "unpaged": false,
    "sort": { "sorted": true, "unsorted": false, "empty": false }
  },
  "sort": { "sorted": true, "unsorted": false, "empty": false }
}
```

The `content` array type differs per domain — see each domain file.

---

## Example: filtered + sorted list request

```json
{
  "page": 0,
  "size": 10,
  "sort": [{ "field": "createdAt", "direction": "DESC" }],
  "filters": [
    {
      "field": "enabled",
      "operations": [{ "operator": "EQUALS", "value": true }]
    },
    {
      "field": "username",
      "operations": [{ "operator": "CONTAINS", "value": "alice" }]
    }
  ]
}
```
