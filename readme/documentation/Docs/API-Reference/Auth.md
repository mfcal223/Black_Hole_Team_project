# Auth API

Base path: `/login`, `/register`
Frontend calls: `/api/login`, `/api/register`
Auth required: **None** — both endpoints are public.

---

## POST /login

Authenticates a user and returns a JWT token.

**Request body**
```json
{
  "username": "alice",
  "password": "secret"
}
```

**Response 200**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "username": "alice",
  "roles": ["ROLE_EMPLOYEE"]
}
```

The JWT is also returned in the `Authorization` response header. The frontend stores it in localStorage and attaches it to all subsequent requests as `Authorization: Bearer <token>`.

Token TTL: 24 hours.

---

## POST /register

Self-registers a new Employee account.

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

`username`, `email`, and `password` are required — the service throws 400 if any of the three is blank. `email`, when provided, must be a well-formed email address (max 100 characters) — otherwise the request is rejected with HTTP 400 `Validation Failed` at the request boundary. `firstName` and `lastName` are optional.

**Response 201**
```json
{
  "username": "alice",
  "email": "alice@example.com",
  "message": "Registration successful. Your account is pending admin activation."
}
```

Creates a user with `ROLE_EMPLOYEE` and `enabled=false`. **The account cannot log in until an admin activates it via `PATCH /employee/{id}/activate`.** Admin accounts cannot be self-registered — use `POST /admin` (requires `ROLE_ADMIN`).

---

## Schemas

### LoginForm
| Field | Type | Required |
|-------|------|----------|
| `username` | string | — |
| `password` | string | — |

### LoginResponseDTO
| Field | Type | Notes |
|-------|------|-------|
| `token` | string | JWT bearer token |
| `username` | string | |
| `roles` | string[] | e.g. `["ROLE_EMPLOYEE"]` |

### EmployeeForm (used for registration)
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `firstName` | string | — | |
| `lastName` | string | — | |
| `email` | string | yes (self-registration) | Must be a well-formed email address (max 100 characters). |
| `username` | string | yes (self-registration) | |
| `password` | string | yes (self-registration) | |

### RegistrationResponseDTO
| Field | Type |
|-------|------|
| `username` | string |
| `email` | string |
| `message` | string |

---

## GET /test

Returns the string `"test"`. Used to verify that the JWT filter chain is working.
Auth required: any authenticated user.
