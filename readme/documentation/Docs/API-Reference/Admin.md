# Admin API

Base path: `/admin`
Frontend calls: `/api/admin/**`
Auth required: **ROLE_ADMIN** on all endpoints.

---

## GET /admin

Returns all admin users. Use `POST /admin/list` for paginated/filtered results.

**Response 200** — `AdminDTO[]`
```json
[
  {
    "firstName": "Super",
    "lastName": "Admin",
    "email": "admin@example.com",
    "username": "admin",
    "roles": ["ROLE_ADMIN"]
  }
]
```

---

## POST /admin

Creates a new admin user.

**Request body**
```json
{
  "username": "newadmin",
  "firstName": "New",
  "lastName": "Admin",
  "email": "newadmin@example.com",
  "password": "secret",
  "roles": ["ROLE_ADMIN"]
}
```

`username`, `email`, and `password` are required — the service throws 400 if any is null. `email`, when provided, must be a well-formed email address (max 100 characters) — otherwise the request is rejected with HTTP 400 `Validation Failed` at the request boundary. `firstName`, `lastName`, and `roles` are optional. The `roles` field is silently ignored — all admins are hardcoded to `ROLE_ADMIN` regardless of what is submitted.

**Response 200** — `AdminMiniDTO`
```json
{
  "firstName": "New",
  "lastName": "Admin",
  "email": "newadmin@example.com",
  "username": "newadmin",
  "roles": ["ROLE_ADMIN"]
}
```

---

## GET /admin/{id}

**Response 200** — `AdminDTO`

---

## PUT /admin/{id}

> **Known issue:** `AdminServiceImpl` does not override `update()`. The default base implementation loads the entity and saves it without applying any form fields — the request body is ignored. Calling this endpoint returns the unmodified admin record. Do not use for actual updates until a custom override is implemented.

**Request body** — `AdminForm` (same as POST /admin)

**Response 200** — `AdminDTO` (unchanged record)

---

## DELETE /admin/{id}

**Response 200** — `AdminDTO` (the deleted record)

---

## POST /admin/list

Paginated, filtered, sorted list.
See [[_Shared-Schemas]] for `PageableRequest` format.

**Response 200** — pagination envelope with `AdminListDTO[]` in `content`.

**Example request**
```json
{
  "page": 0,
  "size": 10,
  "sort": [{ "field": "username", "direction": "ASC" }],
  "filters": []
}
```

---

## Schemas

### AdminForm
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `username` | string | yes | min length 1 |
| `firstName` | string | — | |
| `lastName` | string | — | |
| `email` | string | — | Must be a well-formed email address when provided (max 100 characters). |
| `password` | string | — | |
| `roles` | string[] | — | e.g. `["ROLE_ADMIN"]` |

### AdminDTO
| Field | Type |
|-------|------|
| `firstName` | string |
| `lastName` | string |
| `email` | string |
| `username` | string |
| `roles` | string[] |

### AdminMiniDTO
Same fields as `AdminDTO`. Returned on create.

### AdminListDTO (inside paginated content)
| Field | Type |
|-------|------|
| `id` | long |
| `firstName` | string |
| `lastName` | string |
| `email` | string |
| `username` | string |
| `roles` | string[] |
| `enabled` | boolean |
| `dateCreated` | datetime |
| `lastLogin` | datetime |
