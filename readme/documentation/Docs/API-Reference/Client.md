# Client API

Base path: `/client`
Frontend calls: `/api/client/**`
Auth required: varies per operation (see below).

| Operation | Auth |
|-----------|------|
| `GET /client`, `GET /client/{id}`, `POST /client/list` | Any authenticated user |
| `POST /client`, `PUT /client/{id}`, `DELETE /client/{id}`, `GET /client/token/{username}` | **ROLE_ADMIN** |

The `SecurityConfig` opens `/client/**` to authenticated users, but `ClientService` overrides with `@PreAuthorize("hasRole('ADMIN')")` on write operations. The `getOne()` and read endpoints inherit the base `isAuthenticated()` check.

Clients are external API consumers — they authenticate via an API key, not a password. This is separate from the Employee/Admin user model.

---

## GET /client

Returns all clients.

**Response 200** — `ClientDTO[]`
```json
[
  {
    "id": 1,
    "firstName": "External",
    "lastName": "App",
    "email": "app@external.com",
    "username": "ext-app",
    "roles": ["ROLE_CLIENT"],
    "apikey": "abc123..."
  }
]
```

---

## POST /client

Creates a new client. No password needed — clients authenticate with an API key.

**Request body**
```json
{
  "firstName": "External",
  "lastName": "App",
  "email": "app@external.com",
  "username": "ext-app"
}
```

`firstName`, `lastName`, `email`, and `username` are all required — the service throws 400 if any is null or empty. `email`, when provided, must be a well-formed email address (max 100 characters) — otherwise the request is rejected with HTTP 400 `Validation Failed` at the request boundary.

**Response 200** — `ClientMiniDTO`
```json
{
  "firstName": "External",
  "lastName": "App",
  "email": "app@external.com",
  "username": "ext-app",
  "roles": ["ROLE_CLIENT"],
  "apiKey": "abc123..."
}
```

---

## GET /client/{id}

**Response 200** — `ClientDTO`

---

## PUT /client/{id}

Partial update — only non-null, non-empty fields are applied. Email and username uniqueness enforced — throws 409 if already taken. Changing the email regenerates the internal API key hash. When `email` is provided on update, it must be a well-formed email address (max 100 characters) — otherwise the request is rejected with HTTP 400 `Validation Failed` at the request boundary.

**Request body** — `ClientForm`

**Response 200** — `ClientDTO`

---

## DELETE /client/{id}

**Response 200** — `ClientDTO` (the deleted record)

---

## GET /client/token/{username}

Returns a freshly generated JWT for the client identified by `username`. Auth: **ROLE_ADMIN**.

Returns 404 if no client with that username exists.

**Response 200** — plain string (a JWT)
```
"eyJhbGciOiJIUzI1NiJ9..."
```

---

## POST /client/list

Paginated, filtered, sorted list.
See [[_Shared-Schemas]] for `PageableRequest` format.

**Response 200** — pagination envelope with `ClientListDTO[]` in `content`.

---

## Schemas

### ClientForm
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `firstName` | string | — | |
| `lastName` | string | — | |
| `email` | string | yes on create | Must be a well-formed email address when provided (max 100 characters). |
| `username` | string | yes on create | |

No `password` field — clients use generated API keys.

### ClientDTO
| Field | Type |
|-------|------|
| `id` | long |
| `firstName` | string |
| `lastName` | string |
| `email` | string |
| `username` | string |
| `roles` | string[] |
| `apikey` | string |

### ClientMiniDTO
| Field | Type | Notes |
|-------|------|-------|
| `firstName` | string | |
| `lastName` | string | |
| `email` | string | |
| `username` | string | |
| `roles` | string[] | |
| `apiKey` | string | Note: camelCase `apiKey`, vs `apikey` in `ClientDTO` |

### ClientListDTO (inside paginated content)
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
