# API Reference Index

Backend: Spring Boot on `http://localhost:8080`
Frontend proxy: Vite proxies `/api/*` → `http://localhost:8080/*` (strips `/api` prefix).
All frontend calls use `/api/<path>`; backend receives `/<path>`.

Auth: stateless JWT. Token is returned in the response body on login and in the `Authorization` response header.
All protected requests require `Authorization: Bearer <token>`.

WebSocket auth uses `?token=<jwt>` query param (not a header).

---

## Files

| File | Domain | Auth required |
|------|--------|---------------|
| [[_Shared-Schemas]] | PageableRequest, filters, pagination envelope | — |
| [[Auth]] | POST /login, POST /register | Public |
| [[Admin]] | CRUD + list for admin users | ROLE_ADMIN |
| [[Employee]] | CRUD + list + activate/deactivate | ROLE_ADMIN |
| [[Client]] | CRUD + list + API token | Authenticated |
| [[Agent]] | CRUD + list (ownership-scoped) | ROLE_EMPLOYEE |
| [[Conversation]] | CRUD + list + title/model patches | ROLE_EMPLOYEE |
| [[Messages]] | GET conversation history | ROLE_EMPLOYEE |
| [[LlmModels]] | CRUD + list + toggle + OpenRouter catalog | Authenticated |
| [[AppSettings]] | GET + PATCH singleton system config | Authenticated |
| [[TokenUsage]] | GET /admin/token-usage aggregation | ROLE_ADMIN |
| [[WebSocket-Chat]] | Real-time chat stream | ROLE_EMPLOYEE (JWT via query param) |

---

## Common response patterns

### Error (401 Unauthorized)
```json
{
  "timestamp": "2026-06-26T10:00:00",
  "status": 401,
  "error": "Unauthorized",
  "message": "Invalid Credentials",
  "path": "/agent"
}
```

### Error (403 Forbidden)
```json
{
  "timestamp": "2026-06-26T10:00:00",
  "status": 403,
  "error": "Forbidden",
  "message": "Access Denied",
  "path": "/employee"
}
```

### Error (404 Not Found / ownership violation)
Ownership violations surface as 404, not 403. Accessing another employee's agent returns 404.

---

## Known issue: PATCH blocked by CORS

`SecurityConfig.corsConfigurationSource()` lists `allowedMethods: GET, POST, PUT, DELETE, OPTIONS` — **PATCH is missing**.

Affected endpoints: `PATCH /employee/{id}/activate`, `PATCH /employee/{id}/deactivate`, `PATCH /llm-model/{id}/toggle`, `PATCH /conversation/{id}/title`, `PATCH /conversation/{id}/model`, `PATCH /app-settings`.

These will fail CORS preflight from the browser until PATCH is added to the allowed methods list.
