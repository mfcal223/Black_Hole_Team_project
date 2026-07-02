# Employee API

Base path: `/employee`
Frontend calls: `/api/employee/**`
Auth required: **ROLE_ADMIN** on all endpoints.

---

## GET /employee

Returns all employees. Use `POST /employee/list` for paginated/filtered results.

**Response 200** — `EmployeeDTO[]`
```json
[
  {
    "firstName": "Alice",
    "lastName": "Smith",
    "email": "alice@example.com",
    "username": "alice",
    "roles": ["ROLE_EMPLOYEE"],
    "enabled": true
  }
]
```

---

## POST /employee

Creates a new employee. Admins use this to create employees directly (bypasses self-registration). Unlike `/register`, admin-created employees start with `enabled=true`.

**Request body**
```json
{
  "firstName": "Alice",
  "lastName": "Smith",
  "email": "alice@example.com",
  "username": "alice",
  "password": "secret"
}
```

`username`, `email`, and `password` are required — the service throws 400 if any is blank. `email`, when provided, must be a well-formed email address (max 100 characters) — otherwise the request is rejected with HTTP 400 `Validation Failed` at the request boundary. `firstName` and `lastName` are optional.

**Response 200** — `EmployeeMiniDTO`
```json
{
  "firstName": "Alice",
  "lastName": "Smith",
  "email": "alice@example.com",
  "username": "alice",
  "roles": ["ROLE_EMPLOYEE"]
}
```

---

## GET /employee/{id}

**Response 200** — `EmployeeDTO`

---

## PUT /employee/{id}

Partial update — only non-blank fields in the form are applied. Blank or null fields are ignored (the existing value is kept). Email and username uniqueness is enforced — throws 409 if the new value is already taken by another user. When `email` is provided on update, it must be a well-formed email address (max 100 characters) — otherwise the request is rejected with HTTP 400 `Validation Failed` at the request boundary.

**Request body** — `EmployeeForm`

**Response 200** — `EmployeeDTO`

---

## DELETE /employee/{id}

**Response 200** — `EmployeeDTO` (the deleted record)

---

## PATCH /employee/{id}/activate

Re-enables a deactivated employee account.

**No request body.**

**Response 200** — `EmployeeDTO`

> **CORS issue:** PATCH is not in `allowedMethods` in `SecurityConfig`. This will fail CORS preflight from the browser until PATCH is added.

---

## PATCH /employee/{id}/deactivate

Disables an employee account without deleting it.

**No request body.**

**Response 200** — `EmployeeDTO`

> **CORS issue:** Same as activate — PATCH blocked by CORS.

---

## POST /employee/list

Paginated, filtered, sorted list.
See [[_Shared-Schemas]] for `PageableRequest` format.

**Response 200** — pagination envelope with `EmployeeListDTO[]` in `content`.

**Example request**
```json
{
  "page": 0,
  "size": 20,
  "sort": [{ "field": "lastName", "direction": "ASC" }],
  "filters": [
    {
      "field": "enabled",
      "operations": [{ "operator": "EQUALS", "value": true }]
    }
  ]
}
```

---

## Schemas

### EmployeeForm
| Field | Type | Required |
|-------|------|----------|
| `firstName` | string | — |
| `lastName` | string | — |
| `email` | string | — | Must be a well-formed email address when provided (max 100 characters). |
| `username` | string | — |
| `password` | string | — |

### EmployeeDTO
| Field | Type |
|-------|------|
| `firstName` | string |
| `lastName` | string |
| `email` | string |
| `username` | string |
| `roles` | string[] |
| `enabled` | boolean |

### EmployeeMiniDTO
Same as `EmployeeDTO`. Returned on create.

### EmployeeListDTO (inside paginated content)
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
