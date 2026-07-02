# Frontend–Backend Alignment Report

**Date:** 2026-06-25  
**Backend reference:** Swagger at `http://localhost/v3/api-docs`  
**Frontend root:** `project/srcs/frontend/src/`

---

## Summary

The frontend was built against an older backend with a different API design (`/api/v1/...` URL prefix, different DTO shapes, workflow and workflow-step endpoints). The new backend uses clean paths (`/agent`, `/employee`, etc.), different DTO schemas for Agent and Employee, a new Conversation + Message layer, and does **not** implement workflows at all.

This report lists every file and classifies it as **Keep**, **Update**, or **Eliminate**, then closes with a list of new backend features that have no frontend code yet.

---

## New Backend API Surface (Swagger)

| Group | Endpoints |
|---|---|
| Auth | `POST /login`, `POST /register` |
| Admin | `GET/POST /admin`, `POST /admin/list`, `GET/PUT/DELETE /admin/{id}` |
| Employee | `GET/POST /employee`, `POST /employee/list`, `GET/PUT/DELETE /employee/{id}`, `PATCH /employee/{id}/activate`, `PATCH /employee/{id}/deactivate` |
| Client | `GET/POST /client`, `POST /client/list`, `GET/PUT/DELETE /client/{id}`, `GET /client/token/{username}` |
| Agent | `GET/POST /agent`, `POST /agent/list`, `GET/PUT/DELETE /agent/{id}` |
| Conversation | `GET/POST /conversation`, `POST /conversation/list`, `GET/PUT/DELETE /conversation/{id}`, `PATCH /conversation/{id}/model`, `PATCH /conversation/{id}/title` |
| Message | `GET /conversation/{conversationId}/messages` |
| App Settings | `GET /app-settings`, `PATCH /app-settings` |
| LLM Model | `GET/POST /llm-model`, `POST /llm-model/list`, `GET/PUT/DELETE /llm-model/{id}`, `GET /llm-model/available`, `PATCH /llm-model/{id}/toggle` |
| WebSocket | `/ws/chat/{conversationId}` (JWT via `?token=` query param) |
| Dev | `GET /test` |

**Not present in the new backend:** `/workflow`, `/workflow-step`, `/api/v1/*`

---

## Classification by File

### Infrastructure and UI — KEEP AS-IS

These files are not coupled to any backend endpoint and can be used without changes.

| File | Reason |
|---|---|
| `services/api.ts` | Axios instance with JWT injection and 401 auto-logout. Pattern is correct. |
| `services/authService.ts` | Calls `POST /login` — maps exactly to the new backend. |
| `services/authHelpers.ts` | Pure localStorage helpers (`getToken`, `getRoles`, `isAdmin`, `isEmployee`). No endpoint dependency. |
| `routes/ProtectedRoute.tsx` | Auth guard. No endpoint dependency. |
| `routes/AdminRoute.tsx` | Admin role guard. No endpoint dependency. |
| `components/layout/MainLayout.tsx` | Shell layout (Sidebar + Header + Outlet). Keep. |
| `components/layout/Header.tsx` | Header component. Keep. |
| `components/layout/Sidebar.tsx` | Navigation sidebar — structure is correct; needs two minor route fixes (see Notes below). |
| `components/common/EmptyState.tsx` | Generic UI utility. Keep. |
| `components/common/ErrorMessage.tsx` | Generic UI utility. Keep. |
| `components/common/LoadingSpinner.tsx` | Generic UI utility. Keep. |
| `components/ui/*` (all shadcn files) | Component library primitives. Keep entirely. |
| `components/theme-provider.tsx` | Theme management. Keep. |
| `hooks/use-mobile.ts` | Keep. |
| `lib/utils.ts` | Keep. |
| `pages/LoginPage.tsx` | Calls `login()` from `authService` → `POST /login`. Compatible with the new backend. |
| `App.tsx` | Router structure. Keep — but will need new routes added as features are built. |

**Sidebar notes:**  
- "Subordinate Agents" links to `/subordinate-agents`, which is not in the router. Either remove the item or add a route when the page is built.  
- "Settings" links to `/dashboard/settings`, which is not in the router. Update the target to `/settings` when the settings page is built.

---

### Services and Types — NEEDS UPDATE

These files target either the wrong URL, missing endpoints, or DTOs that no longer match the new backend schemas.

#### `services/agentService.ts`

**Problem:** Uses hardcoded URL `"/api/v1/agents"` (doubles the `/api` prefix from `api.ts`). All endpoint paths are wrong. Two operations (`getMyAgents`, `getSubordinateAgents`) target endpoints that do not exist.

**AgentDTO mismatch:**

| Old frontend field | New backend field |
|---|---|
| `systemPrompt` | `initPrompt` (required) + `recurrentPrompt` (optional) |
| `llmModel` (string) | removed |
| `isLocked` | removed |
| `isManagerAgent` | removed |
| `active`, `enabled`, `ownerUsername` | removed |
| — | `createdAt`, `updatedAt` added |

**Required changes:**
- Change base URL to `"/agent"` (no prefix — `api.ts` handles the `/api` prefix).
- Replace `getMyAgents()` with a `POST /agent/list` call (the backend scopes list results to the authenticated employee automatically).
- Remove `getSubordinateAgents()` — there is no such endpoint.
- Fix `getAgentById()`, `createAgent()`, `updateAgent()`, `deleteAgent()` URLs.
- Rename `AgentForm.systemPrompt` → `initPrompt`; remove `locked` and `managerAgent` fields.
- Update `AgentDTO` type to match the new schema above.

---

#### `services/employeeService.ts`

**Problem:** Uses URL `"/api/v1/employees"` (same prefix issue). `getEmployees()` calls `GET /api/v1/employees`, which does not exist. The new backend lists employees via `POST /employee/list`.

**EmployeeDTO mismatch:**

| Old frontend field | New backend field |
|---|---|
| `emailAddress` | `email` |
| `department` | removed |
| `position` | removed |
| `isActive` | `enabled` (boolean) |
| — | `roles` (string[]) added |

**Required changes:**
- Change base URL to `"/employee"`.
- Replace `getEmployees()` with `POST /employee/list`.
- Update `EmployeeDTO` fields to match the new schema.

---

#### `services/adminService.ts`

**Problems:**
- `createEmployee()` calls `POST /admin/employees` — this endpoint does not exist. Employees are created via `POST /employee`.
- `createAdmin()` calls `POST /admin/` — this endpoint **does** exist and is correct.

**Required changes:**
- Fix `createEmployee()` to call `POST /employee`.
- Update the imported `EmployeeForm` type (see `types/employee.ts` below).
- `createAdmin()` can stay as-is after the type fixes.

---

#### `types/employee.ts`

**Problem:** `EmployeeForm` fields do not match the new backend's `EmployeeForm`.

| Old | New |
|---|---|
| `userName` | `username` |
| `emailAddress` | `email` |
| `department` | removed |
| `position` | removed |
| `password` | unchanged |

**Required changes:** Rename the two mismatched fields, remove `department` and `position`.

---

#### `types/admin.ts`

**Problem:** `AdminForm` has a `parentAdminId` field that is not in the new backend schema.

**Required changes:** Remove `parentAdminId`. The `roles` field is already present and correct.

---

#### `pages/AgentsPage.tsx`

**Problems:**
- Calls `getMyAgents()` which needs to become a list-endpoint call.
- `createAgent()` form sends `systemPrompt`, `locked`, `managerAgent` — all removed from the new `AgentForm`.
- Shows `agent.enabled` which is not in the new `AgentDTO`.

**Required changes:** Update service calls and remove/replace the obsolete form fields and display fields.

---

#### `pages/AgentDetailsPage.tsx`

**Problems:**
- Calls `getAgentById()` (URL fix needed, handled in `agentService.ts`).
- Displays `agent.llmModel`, `agent.isLocked`, `agent.isManagerAgent` — all removed from the new `AgentDTO`.
- New DTO has `initPrompt` and `recurrentPrompt` to display instead.

**Required changes:** Replace the obsolete fields in the display with `initPrompt` and `recurrentPrompt`.

---

#### `pages/EmployeesPage.tsx`

**Problems:**
- Calls `getEmployees()` which needs to be replaced with the list endpoint.
- Displays `employee.department`, `employee.position` (removed), and `employee.isActive` (renamed to `enabled`).
- Missing: activate/deactivate action buttons (`PATCH /employee/{id}/activate`, `PATCH /employee/{id}/deactivate`).

**Required changes:** Fix service call, update column list, add activate/deactivate actions.

---

#### `pages/RegisterPage.tsx`

**Problem:** This page currently lets admins create both employees and admins. The new backend has changed the employee creation paradigm:
- Employees **self-register** at `POST /register` (public endpoint; account is disabled by default pending admin activation).
- Admins can still create employees at `POST /employee` and other admins at `POST /admin`.
- The `EmployeeForm` no longer has `department` or `position`.

**Required changes:** Decide whether this page remains an admin creation tool or becomes the public self-registration form. Either way, remove the `department`/`position` fields and update the service calls. The admin creation path (`POST /admin`) is still valid.

---

#### `pages/DashboardPage.tsx`

**Problems:**
- Calls `getSubordinateAgents()` to show a "Subordinate agents" card. That endpoint does not exist.
- Calls `getMyAgents()` (needs the list-endpoint fix).

**Required changes:** Remove or replace the "Subordinate agents" card. The admin section of the dashboard needs a different approach (e.g., link to employee list with a count from the employee list endpoint).

---

### Services and Pages — ELIMINATE

These files target endpoints that do not exist in the new backend and cannot be adapted without a backend feature.

| File | Reason |
|---|---|
| `services/workflowService.ts` | Targets `GET/POST/DELETE /workflow`. No workflow endpoint exists in the new backend. |
| `services/workflowStepService.ts` | Targets `GET/POST/PUT/DELETE /workflow-step`. No workflow-step endpoint exists. |
| `types/workflow.ts` | Type definitions for a non-existent resource. |
| `types/workflowStep.ts` | Type definitions for a non-existent resource. |
| `pages/WorkflowsPage.tsx` | UI built entirely around `workflowService`. Would fail on every call. |
| `pages/WorkflowDetailsPage.tsx` | UI built around `workflowService` and `workflowStepService`. Would fail on every call. |

> The Workflow feature is planned in the product brief but the backend does not yet expose it. The frontend code for it should be deleted now and rebuilt from scratch when the backend implements the feature.

---

#### Empty stubs — DECIDE

| File | Status |
|---|---|
| `services/userSettingsService.ts` | Contains only `import api from "./api"`. No logic. Delete unless you plan to add app-settings calls soon. |
| `services/userSourceService.ts` | Same as above. Delete unless it will be used soon. |

---

## Missing Frontend Coverage

The following new backend features have no corresponding frontend code yet.

| Backend feature | Priority for MVP |
|---|---|
| **Conversation CRUD** (`/conversation/**`) | High — core product feature |
| **WebSocket chat** (`/ws/chat/{conversationId}`) | High — the main UX |
| **Message history** (`GET /conversation/{id}/messages`) | High — part of chat UX |
| **App Settings** (`GET/PATCH /app-settings`) | High — needed to configure OpenRouter API key before chat works |
| **LLM Model management** (`/llm-model/**`) | High — needed before conversations can work |
| **Employee activate/deactivate** (`PATCH /employee/{id}/activate|deactivate`) | Medium — needed to onboard self-registered employees |
| **Public self-registration** (`POST /register`) | Medium — currently no public-facing registration page |
| **Client CRUD** (`/client/**`) | Low — not part of core employee/chat flow |

---

## Recommended Order of Work

1. Fix the service layer first — `agentService`, `employeeService`, `adminService`, and the two type files. Everything else depends on these.
2. Fix the pages that depend on those services — `AgentsPage`, `AgentDetailsPage`, `EmployeesPage`, `DashboardPage`, `RegisterPage`.
3. Delete the workflow files so they stop causing noise.
4. Build `appSettingsService` + `AppSettingsPage` (admin) — required before chat works.
5. Build `llmModelService` + `LlmModelsPage` (admin) — required before conversations work.
6. Build `conversationService` + `ConversationsPage` + WebSocket chat client — the core feature.
