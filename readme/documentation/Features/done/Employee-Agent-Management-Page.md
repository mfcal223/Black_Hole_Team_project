#high #new-feature #frontend

## Feature: Employee Agent Management Page

### Description

Add an employee-only "Agents" section to the frontend. This introduces a new sidebar navigation item visible only to employees, a new route at `/agents`, and a paginated agent list backed by the existing `POST /api/agent/list` endpoint. The page lets an employee browse their personal agents and manage them through three modals: create, edit, and delete. No filter controls are included — only pagination with a configurable page size.

As the second paginated frontend feature, this is also the trigger point for extracting the shared `PageableRequest` and `PageEnvelope<T>` types from `features/employees/types.ts` into a new canonical `src/types/api.ts` file, as documented in the employees feature risk assessment.

---

## Problem Statement

Employees currently have no frontend UI to create or manage their personal AI agents. The backend Agent CRUD API (`/agent/**`) is complete and fully tested, but it is only accessible through direct API calls. Employees cannot create, edit, or delete their agents without external tooling, which makes the core product feature — building reusable LLM personas — completely inaccessible from the UI.

---

## User Stories

1. As an Employee, I want to see an "Agents" item in the sidebar, so that I can navigate to my agent list without knowing the URL.
2. As an Admin, I want the "Agents" sidebar item to be invisible, so that I am not confused by employee-only sections.
3. As an Employee, when I click "Agents" in the sidebar, I want to land on the Agents list page, so that I can see all my personal agents.
4. As an Employee, I want to see a table of my agents with their name, description, and creation date, so that I can quickly identify any agent.
5. As an Employee, I want to see edit and delete buttons on each agent row, so that I can manage my agents without navigating to a separate page.
6. As an Employee, I want to control how many agents appear per page (5, 10, 25, 50), so that I can choose between a compact or expanded view depending on my needs.
7. As an Employee, I want previous and next page buttons and a "Page X of Y" indicator, so that I can navigate through a large agent list.
8. As an Employee, while the table is loading data from the backend, I want a loading overlay to appear over the table, so that I know a request is in progress.
9. As an Employee, if I have no agents yet, I want to see an empty state message in the table body, so that I understand there are no agents to display.
10. As an Employee, I want a "New Agent" button on the page, so that I can create a new agent.
11. As an Employee, clicking "New Agent" should open a create agent modal, so that I can create an agent without leaving the page.
12. As an Employee, I want the create form to have a required Name field, an optional Description field, a required Init Prompt field, and an optional Recurrent Prompt field, so that I can fully configure the new agent.
13. As an Employee, I want the Init Prompt and Recurrent Prompt fields to use multi-line text areas, so that I can write detailed, properly formatted system prompts.
14. As an Employee, clicking "Edit" on an agent row should open an edit modal pre-filled with the agent's current values, so that I can make changes efficiently.
15. As an Employee, I want the edit form to show all four fields (name, description, init prompt, recurrent prompt) populated from the saved agent, so that I can review and change any aspect.
16. As an Employee, after a successful save in the edit modal, I want the modal to close and the table to refresh, so that I see the updated agent immediately.
17. As an Employee, clicking "Delete" on an agent row should open a delete confirmation modal, so that I do not accidentally destroy an agent.
18. As an Employee, I want a checkbox in the delete modal that I must tick before the Delete button becomes active, so that I am forced to acknowledge the action is permanent.
19. As an Employee, after a successful delete, I want the modal to close and the table to refresh, so that the deleted agent is no longer shown.
20. As an Employee, I want to see an error message inside the modal if any create, edit, or delete operation fails, so that I understand what went wrong and can retry.
21. As an Employee, I want the page title in the header to read "Agents" when I am on the `/agents` route, so that the app header stays contextually correct.
22. As an Employee, if I am not authenticated and navigate to `/agents`, I want to be redirected to the login page, so that the page is not accessible to unauthenticated users.
23. As an Admin, if I navigate directly to `/agents`, I want to be redirected to `/dashboard`, so that role-based access is enforced consistently across the app.
24. As a frontend developer, I want `PageableRequest` and `PageEnvelope<T>` declared once in `src/types/api.ts`, so that the second paginated feature does not duplicate them from the employees feature.
25. As a frontend developer, I want all agent HTTP calls behind a service module with typed inputs and outputs, so that components and hooks never call Axios directly.
26. As a frontend developer, I want all pagination state managed by a dedicated hook, so that the page component remains a thin composition layer.
27. As a frontend developer, I want each modal's form state and API call owned by a dedicated hook, so that the modal components contain no business logic.

---

## Solution

Introduce a `features/agents/` feature module mirroring the established `features/employees/` pattern. The module owns a typed service layer, a state-management hook for pagination, three form hooks for modals, and feature-specific UI components. These are composed into a thin `AgentsPage` page component. The route is wired into the existing employee-only `RoleGuard` group, and the sidebar menu item follows the existing `roles: UserRole[]` pattern already in `Sidebar.tsx`.

### Scope

All changes are limited to `project/srcs/frontend/src/` and `documentation/`. No backend files are modified. The backend `/agent/**` endpoints are consumed as-is.

Impacted areas:
- New `src/types/api.ts` — shared pagination types (extracted from employees, used by agents)
- Modified `src/features/employees/types.ts` — remove locally-declared `PageableRequest` and `PageEnvelope<T>`; import from `src/types/api.ts`
- New `src/features/agents/` — complete feature module (types, service, hooks, components, index)
- New `src/pages/AgentsPage.tsx` — page component
- Modified `src/router.tsx` — add `/agents` to employee-only `RoleGuard` group
- Modified `src/layouts/Sidebar.tsx` — add "Agents" menu item with `roles: [UserRole.EMPLOYEE]`
- Modified `src/layouts/Header.tsx` — add `/agents` case to `getPageTitle()`

### Affected Systems / Modules

- [[Memory/architecture|Architecture]] — new employee-facing feature module; follows the same feature-slice pattern as `features/employees/`
- [[Memory/tech|Tech Stack]] — React 19, TypeScript, shadcn/ui (Base UI), axios, vitest; requires `npx shadcn@latest add textarea` if `src/components/ui/textarea.tsx` is not already installed
- [[ADRs/ADR-006-nullable-agent-fk-for-conversation-type]] — Agents are personal resources owned by the authenticated employee; the page only manages agents, not conversations
- [[ADRs/ADR-008-agent-prompts-not-persisted-as-messages]] — `initPrompt` and `recurrentPrompt` are displayed in the edit form and explained in the UI so employees understand how they are applied
- [[ADRs/ADR-009-long-primary-key-for-all-entities]] — `AgentListDTO.id` is `number` (Long on the backend)
- [[ADRs/ADR-010-base-ui-over-radix-ui-for-frontend]] — `Select.Root` is generic over `Value`; page size selector uses typed `<Select<number>>`; refer to Base UI docs only
- [[Features/done/Agent-Entity-and-Employee-Crud]] — backend feature that provides the full CRUD API this page consumes
- [[Features/done/Admin-Employee-Management-Page]] — reference implementation: table + pagination + modals pattern; agents follows this pattern, minus filters

### Impact Analysis

- The 132 existing tests are unaffected — all new code is additive, and the shared-types extraction replaces the locally declared types with imports (no runtime change, verified by typecheck).
- The employee-only `RoleGuard` route group currently has one child route (`/conversations`). Adding `/agents` to the same group is safe; both share `allowedRoles={[UserRole.EMPLOYEE]}` and `redirectTo="/dashboard"`.
- The Sidebar's `visibleMenuItems` filter already uses `hasAnyRole(item.roles)`, so adding an agents item with `[UserRole.EMPLOYEE]` requires only a new entry in the `menuItems` array.
- The `features/employees/types.ts` change is import-only: `PageableRequest` and `PageEnvelope<T>` move to `src/types/api.ts` and are re-exported or imported directly. Existing consumers inside the employees feature are updated to import from `@/types/api` instead of the local types file.

### Risk Assessment

- **shadcn/ui Textarea**: If `src/components/ui/textarea.tsx` does not exist, run `npx shadcn@latest add textarea` before Phase 5. Verify it uses Base UI internally. If not available via shadcn CLI, fall back to a native `<textarea>` with Tailwind classes matching the `Input` component's style (`border border-input bg-background px-3 py-2 text-sm rounded-md ...`).
- **`useEditAgent` requires a second API call**: `AgentListDTO` omits `initPrompt` and `recurrentPrompt`. The edit hook must call `GET /agent/{id}` on mount to load the full `AgentDTO`. The edit modal shows a loading spinner until this call resolves and an error message if it fails — this is a new pattern compared to `useEditEmployee`, which pre-fills all fields directly from the list row.
- **`PageableRequest` extraction**: The extraction modifies an existing file (`features/employees/types.ts`). Run `npm run typecheck` immediately after Step 1.2 to catch any import path regressions before proceeding.
- **`PageEnvelope<T>` is an intentional partial view**: When extracting to `src/types/api.ts`, do NOT add the backend fields that the employees feature deliberately omits (`numberOfElements`, `pageable`, `sort`). The intentional-partial-view comment must move with the type.
- **Default sort is `createdAt DESC`**: The backend `AgentQueryProfile` defaults to `createdAt DESC`. The `useAgentList` hook must pass `sort: [{ field: "createdAt", direction: "DESC" }]` in all requests so the most recently created agent appears first.
- **Employee ownership is backend-enforced**: `POST /agent/list` automatically scopes to the authenticated employee — the frontend does not send an `ownerId` filter. The hook sends `filters: []` unconditionally.
- **ADR-008 — Prompt edit behavior**: Editing `initPrompt` or `recurrentPrompt` takes effect immediately on all future messages in all conversations using that agent. This should be surfaced in the edit modal via help text below the prompt fields so the employee understands the consequence.

---

## Implementation Architecture

### Changes Required

#### 1. `src/types/api.ts` (new)

**Purpose:** Canonical location for the shared `PageableRequest` and `PageEnvelope<T>` types used by every `POST /{resource}/list` endpoint. Extracted from `features/employees/types.ts` as planned when the employees feature was built.

**Changes:**
```typescript
// Mirrors the backend SHARED schema — see documentation/Docs/API-Reference/_Shared-Schemas.md
// (PageableRequest / SortRequest / FilterRequest / FilterOperationRequest).
// This is the universal body for every POST /{resource}/list endpoint.
export interface PageableRequest {
  page: number
  size: number
  sort: { field: string; direction: "ASC" | "DESC" }[]
  filters: {
    field: string
    operations: { operator: string; value: unknown }[]
  }[]
}

// INTENTIONAL PARTIAL VIEW of the backend pagination envelope: omits numberOfElements,
// pageable, and sort — features declare which fields they actually read.
export interface PageEnvelope<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
  first: boolean
  last: boolean
  empty: boolean
}
```

---

#### 2. `src/features/employees/types.ts` (modify)

**Purpose:** Replace the locally declared `PageableRequest` and `PageEnvelope<T>` with imports from `src/types/api.ts`. All other employee types are unchanged.

**Changes:** Remove the two interface declarations and add:
```typescript
export type { PageableRequest, PageEnvelope } from "@/types/api"
```
(Re-export so existing consumers inside the employees feature that import from `"../types"` continue to work without path changes.)

---

#### 3. `src/features/agents/types.ts` (new)

**Purpose:** All TypeScript types for the agents feature. Imports shared pagination types from `@/types/api`.

**Changes:**
```typescript
import type { PageableRequest, PageEnvelope } from "@/types/api"
export type { PageableRequest, PageEnvelope }

export interface AgentListDTO {
  id: number
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
}

// Full detail returned by GET /agent/{id} — includes prompt fields not in AgentListDTO.
export interface AgentDTO {
  id: number
  name: string
  description: string | null
  initPrompt: string
  recurrentPrompt: string | null
  ownerId: number
  createdAt: string
  updatedAt: string
}

// Response from POST /agent.
export interface AgentMiniDTO {
  id: number
  name: string
  createdAt: string
}

// Body for POST /agent. Owner is never sent — the backend derives it from the JWT.
export interface AgentCreateForm {
  name: string
  description: string | null
  initPrompt: string
  recurrentPrompt: string | null
}

// Body for PUT /agent/{id}. Full-state PUT semantics: all fields are required;
// nullable fields (description, recurrentPrompt) set to null to clear them.
export interface AgentUpdateForm {
  name: string
  description: string | null
  initPrompt: string
  recurrentPrompt: string | null
}
```

---

#### 4. `src/features/agents/services/agentService.ts` (new, TDD)

**Purpose:** Single-responsibility HTTP adapter for all `/agent/**` endpoints. Deep module: 5 public functions, zero business logic, typed inputs and outputs.

**Changes:**
```typescript
import api from "@/lib/api"
import type { PageableRequest, PageEnvelope } from "@/types/api"
import type { AgentListDTO, AgentDTO, AgentMiniDTO, AgentCreateForm, AgentUpdateForm } from "../types"

export async function listAgents(request: PageableRequest): Promise<PageEnvelope<AgentListDTO>> {
  const response = await api.post<PageEnvelope<AgentListDTO>>("/agent/list", request)
  return response.data
}

export async function getAgent(id: number): Promise<AgentDTO> {
  const response = await api.get<AgentDTO>(`/agent/${id}`)
  return response.data
}

export async function createAgent(form: AgentCreateForm): Promise<AgentMiniDTO> {
  const response = await api.post<AgentMiniDTO>("/agent", form)
  return response.data
}

export async function updateAgent(id: number, form: AgentUpdateForm): Promise<AgentDTO> {
  const response = await api.put<AgentDTO>(`/agent/${id}`, form)
  return response.data
}

export async function deleteAgent(id: number): Promise<AgentDTO> {
  const response = await api.delete<AgentDTO>(`/agent/${id}`)
  return response.data
}
```

**Test (`src/features/agents/services/agentService.test.ts`):**
- `listAgents` POSTs the correct body to `/agent/list` and returns `PageEnvelope<AgentListDTO>`
- `getAgent` GETs `/agent/{id}` and returns `AgentDTO`
- `createAgent` POSTs to `/agent` with the form body and returns `AgentMiniDTO`
- `updateAgent` PUTs to `/agent/{id}` with the form body and returns `AgentDTO`
- `deleteAgent` DELETEs `/agent/{id}` and returns `AgentDTO`

Prior art: `src/features/employees/services/employeeService.test.ts` (axios-mock-adapter pattern).

---

#### 5. `src/features/agents/hooks/useAgentList.ts` (new, TDD)

**Purpose:** Owns all pagination state for the agent list. No filter logic — only page, pageSize, and sort. Deep module: small interface, substantial implementation.

**Interface exposed:**
```typescript
interface UseAgentListResult {
  agents: AgentListDTO[]
  totalPages: number
  totalElements: number
  currentPage: number
  isLoading: boolean
  error: string | null
  pageSize: number
  onPageSizeChange: (size: number) => void
  onPageChange: (page: number) => void
  refresh: () => void
}
```

**Business rules:**
- On mount: fetch with `{ page: 0, size: 10, sort: [{ field: "createdAt", direction: "DESC" }], filters: [] }`
- On `onPageSizeChange`: reset `currentPage` to 0, fetch immediately
- On `onPageChange`: update page, fetch immediately
- `refresh()`: re-fetch the current page/size
- Error lifecycle: set `error` to `null` at the start of every fetch; set `error` to a user-facing message on failure; clear on next successful fetch

**Test (`src/features/agents/hooks/useAgentList.test.ts`):**
- Initial load fetches with default params (page 0, size 10, sort createdAt DESC, no filters)
- Changing page fetches with the updated page number
- Changing page size resets to page 0 and fetches
- `refresh()` re-fetches with the current page and size
- Failed fetch sets `error` to a non-null message; subsequent successful fetch clears `error` to `null`
- Error is set to `null` at the start of each new fetch (stale error is cleared before resolution)

Prior art: `src/features/employees/hooks/useEmployeeList.ts` / `.test.ts` (no filter sub-hook needed — simpler than the employee version).

---

#### 6. `src/features/agents/hooks/useAgentModals.ts` (new)

**Purpose:** Own all modal open/close state for the Agents page. No API calls; no side effects. SRP: one reason to change.

**Interface:**
```typescript
interface UseAgentModalsResult {
  editAgent: AgentListDTO | null
  setEditAgent: (agent: AgentListDTO | null) => void
  deleteAgent: AgentListDTO | null
  setDeleteAgent: (agent: AgentListDTO | null) => void
  createOpen: boolean
  setCreateOpen: (open: boolean) => void
}
```

No tests — trivial state with no logic; mirrors `useEmployeeModals`.

---

#### 7. `src/features/agents/hooks/useCreateAgent.ts` (new, TDD)

**Purpose:** Own create form state and the `POST /agent` call. Accepts `onSuccess` callback; caller handles modal close and list refresh.

**Interface:**
```typescript
interface UseCreateAgentResult {
  name: string
  setName: (v: string) => void
  description: string
  setDescription: (v: string) => void
  initPrompt: string
  setInitPrompt: (v: string) => void
  recurrentPrompt: string
  setRecurrentPrompt: (v: string) => void
  isSubmitting: boolean
  error: string | null
  onSubmit: () => Promise<void>
}
```

`onSubmit` sends `{ name, description: description || null, initPrompt, recurrentPrompt: recurrentPrompt || null }`. Empty strings for optional fields are sent as `null` (backend full-state semantics).

**Test (`src/features/agents/hooks/useCreateAgent.test.ts`):**
- Successful submit calls `createAgent` with the correct form body and invokes `onSuccess`
- Failed submit sets `error` to the extracted message and does NOT invoke `onSuccess`
- Error is cleared at the start of each submit attempt

Prior art: `src/features/employees/hooks/useCreateEmployee.ts` / `.test.ts`.

---

#### 8. `src/features/agents/hooks/useEditAgent.ts` (new, TDD)

**Purpose:** Own edit form state, the `GET /agent/{id}` data-load, and the `PUT /agent/{id}` call. This hook has a two-phase lifecycle not present in `useEditEmployee`: it must load `initPrompt` and `recurrentPrompt` from the API on mount because `AgentListDTO` does not include them.

**Interface:**
```typescript
interface UseEditAgentResult {
  // Data-loading phase
  isLoadingData: boolean
  loadError: string | null

  // Form fields (name and description pre-filled from AgentListDTO; prompts populated after load)
  name: string
  setName: (v: string) => void
  description: string
  setDescription: (v: string) => void
  initPrompt: string
  setInitPrompt: (v: string) => void
  recurrentPrompt: string
  setRecurrentPrompt: (v: string) => void

  // Submission
  isSubmitting: boolean
  error: string | null
  onSave: () => Promise<void>
}
```

On mount: call `getAgent(agent.id)` to load `initPrompt` and `recurrentPrompt`. `name` and `description` are pre-filled immediately from `AgentListDTO`. `isLoadingData` is true during the initial fetch. The edit modal renders a `LoadingSpinner` while `isLoadingData` is true and an error message if `loadError` is non-null.

`onSave` sends `{ name, description: description || null, initPrompt, recurrentPrompt: recurrentPrompt || null }` via `updateAgent(agent.id, form)`.

**Test (`src/features/agents/hooks/useEditAgent.test.ts`):**
- On mount, `isLoadingData` is true until `getAgent` resolves
- After successful load, `initPrompt` and `recurrentPrompt` are populated from the API response
- If `getAgent` rejects, `loadError` is set and `isLoadingData` is false
- Successful save calls `updateAgent` with the correct body and invokes `onSuccess`
- Failed save sets `error` and does NOT invoke `onSuccess`
- `name` and `description` are pre-filled from the `AgentListDTO` prop immediately (before the load resolves)

Prior art: `src/features/employees/hooks/useEditEmployee.ts` / `.test.ts` (data-load phase is new — no prior art in the codebase).

---

#### 9. `src/features/agents/hooks/useDeleteAgent.ts` (new, TDD)

**Purpose:** Own delete confirmation state (checkbox guard) and the `DELETE /agent/{id}` call. Accepts `AgentListDTO` for `id` and `name`.

**Interface:**
```typescript
interface UseDeleteAgentResult {
  isChecked: boolean
  setIsChecked: (v: boolean) => void
  isSubmitting: boolean
  error: string | null
  onConfirm: () => Promise<void>
}
```

`onConfirm` is a no-op if `isChecked` is false. On success: invokes `onSuccess`. On failure: sets `error`.

**Test (`src/features/agents/hooks/useDeleteAgent.test.ts`):**
- `onConfirm` is a no-op when `isChecked` is false (no API call, no `onSuccess`)
- Successful confirm calls `deleteAgent(agent.id)` and invokes `onSuccess`
- Failed confirm sets `error` and does NOT invoke `onSuccess`

Prior art: `src/features/employees/hooks/useDeleteEmployee.ts` / `.test.ts`.

---

#### 10. `src/features/agents/index.ts` (new)

**Purpose:** Public API surface for the agents feature. Deep imports from `services/` or `hooks/` from outside the feature folder are forbidden.

**Changes:**
```typescript
export { useAgentList } from "./hooks/useAgentList"
export type { AgentListDTO, AgentDTO } from "./types"
```

---

#### 11. `src/features/agents/components/AgentTable.tsx` (new)

**Purpose:** Renders the agent table with a loading overlay. Shows Name, Description, Created, and Actions columns. SRP: display and loading state only.

**Props:**
```typescript
interface AgentTableProps {
  agents: AgentListDTO[]
  isLoading: boolean
  onEditClick: (agent: AgentListDTO) => void
  onDeleteClick: (agent: AgentListDTO) => void
}
```

**Key details:**
- Uses shadcn `Table`, `TableHeader`, `TableBody`, `TableHead`, `TableRow`, `TableCell`
- `description` column: render the value or `—` if null
- `createdAt` column: format with `new Date(agent.createdAt).toLocaleDateString()`
- Empty state: when `agents.length === 0 && !isLoading`, render a full-width `TableCell` with "No agents found."
- Loading overlay: `<div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden bg-background/60 backdrop-blur-[1px]">` containing `<LoadingSpinner />`; the wrapper `<div>` is `relative`
- Actions column: two buttons with `<Tooltip>` — `<Pencil className="size-4" />` for edit (hover: `bg-muted`) and `<Trash2 className="size-4" />` for delete (hover: `bg-destructive/10 text-destructive`); same class pattern as `EmployeeTable`

No tests — structural display component; verified by typecheck + build + manual.

---

#### 12. `src/features/agents/components/AgentPageSizeBar.tsx` (new)

**Purpose:** Renders a single right-aligned "Rows per page" selector above the table, consistent with the `EmployeeFilterBar` layout but without filter controls.

**Props:**
```typescript
interface AgentPageSizeBarProps {
  pageSize: number
  onPageSizeChange: (size: number) => void
}
```

**Layout:** `flex items-center` with the selector pushed right via `ml-auto`:
```tsx
<div className="flex items-center">
  <div className="ml-auto flex items-center gap-2">
    <span className="text-xs text-muted-foreground">Rows per page</span>
    <Select<number> value={pageSize} onValueChange={(size) => { if (size !== null) onPageSizeChange(size) }}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value={5}>5</SelectItem>
        <SelectItem value={10}>10</SelectItem>
        <SelectItem value={25}>25</SelectItem>
        <SelectItem value={50}>50</SelectItem>
      </SelectContent>
    </Select>
  </div>
</div>
```

Uses typed `<Select<number>>` per ADR-010. No tests — structural display; verified by typecheck.

---

#### 13. `src/features/agents/components/AgentPagination.tsx` (new)

**Purpose:** Renders the Previous / Page X of Y / Next pagination row. ISP-compliant props (exactly what it renders).

**Props:**
```typescript
interface AgentPaginationProps {
  currentPage: number
  totalPages: number
  totalElements: number
  isLoading: boolean
  onPageChange: (page: number) => void
}
```

Mirrors `EmployeePagination` with "agent"/"agents" pluralization label. No tests — structural display.

---

#### 14. `src/features/agents/components/CreateAgentModal.tsx` (new)

**Purpose:** Create agent dialog. Delegates all state and submission to `useCreateAgent`.

Fields: Name (Input, required), Description (Input, optional), Init Prompt (Textarea, required), Recurrent Prompt (Textarea, optional).
Help text below Init Prompt: *"Applied as a system message on the first turn of each conversation using this agent."*
Help text below Recurrent Prompt: *"Prepended to every user message. Changes take effect immediately on all future messages."*

No tests — structural composition; verified by typecheck + build + manual.

---

#### 15. `src/features/agents/components/EditAgentModal.tsx` (new)

**Purpose:** Edit agent dialog. Delegates all state, data-loading, and submission to `useEditAgent`.

Shows a `<LoadingSpinner />` overlay inside the dialog content while `isLoadingData` is true. Shows an `<ErrorMessage>` in place of the form if `loadError` is non-null (with a "Close" button). Once loaded, shows the same four fields as the create form, pre-populated. Same help text on prompt fields as `CreateAgentModal`.

No tests — structural composition; verified by typecheck + build + manual.

---

#### 16. `src/features/agents/components/DeleteAgentModal.tsx` (new)

**Purpose:** Delete confirmation dialog. Delegates all state and confirmation to `useDeleteAgent`.

Shows agent name in the description. Checkbox: "I understand this action is permanent and cannot be undone." Delete button disabled until `isChecked`. Mirrors `DeleteEmployeeModal` exactly, replacing "Employee" with "Agent".

No tests — structural composition; verified by typecheck + build + manual.

---

#### 17. `src/pages/AgentsPage.tsx` (new)

**Purpose:** Thin composition layer. Uses `useAgentList`, `useAgentModals`, and renders `AgentPageSizeBar`, `AgentTable`, `AgentPagination`, and the three modals. Contains no business logic.

**Structure:**
```tsx
export function AgentsPage() {
  const { agents, totalPages, totalElements, currentPage, isLoading, error,
          pageSize, onPageSizeChange, onPageChange, refresh } = useAgentList()

  const { editAgent, setEditAgent, deleteAgent, setDeleteAgent,
          createOpen, setCreateOpen } = useAgentModals()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agents</h1>
          <p className="text-muted-foreground">Manage your personal AI agents.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" /> New Agent
        </Button>
      </div>

      <AgentPageSizeBar pageSize={pageSize} onPageSizeChange={onPageSizeChange} />

      {error ? (
        <ErrorMessage message={error} />
      ) : (
        <>
          <AgentTable agents={agents} isLoading={isLoading}
                      onEditClick={setEditAgent} onDeleteClick={setDeleteAgent} />
          <AgentPagination currentPage={currentPage} totalPages={totalPages}
                           totalElements={totalElements} isLoading={isLoading}
                           onPageChange={onPageChange} />
        </>
      )}

      {createOpen && (
        <CreateAgentModal onClose={() => setCreateOpen(false)}
                          onSuccess={() => { setCreateOpen(false); refresh() }} />
      )}
      {editAgent && (
        <EditAgentModal agent={editAgent}
                        onClose={() => setEditAgent(null)}
                        onSuccess={() => { setEditAgent(null); refresh() }} />
      )}
      {deleteAgent && (
        <DeleteAgentModal agent={deleteAgent}
                          onClose={() => setDeleteAgent(null)}
                          onSuccess={() => { setDeleteAgent(null); refresh() }} />
      )}
    </div>
  )
}
```

Error state replaces table + pagination; `AgentPageSizeBar` stays mounted so the employee can retry by changing page size. Modals are conditionally mounted (consistent with Employee modal pattern per [[ADRs/ADR-010-base-ui-over-radix-ui-for-frontend]] — Base UI Dialog animations fire on mount).

No tests — thin composition layer with view-layer conditions only.

---

#### 18. `src/router.tsx` (modify)

**Purpose:** Add `/agents` as a child route inside the existing employee-only `RoleGuard` group.

**Changes:** Add `<Route path="/agents" element={<AgentsPage />} />` alongside `/conversations`. Import `AgentsPage` from `@/pages/AgentsPage`.

---

#### 19. `src/layouts/Sidebar.tsx` (modify)

**Purpose:** Add "Agents" as a new employee-only menu item between "Conversations" and any future items.

**Changes:** Add to `menuItems`:
```typescript
{
  title: "Agents",
  url: "/agents",
  icon: MessageSquare,
  roles: [UserRole.EMPLOYEE],
},
```
`MessageSquare` is already imported. Place this item after "Conversations" in the array.

---

#### 20. `src/layouts/Header.tsx` (modify)

**Purpose:** Add `/agents` case to `getPageTitle()`.

**Changes:**
```typescript
"/agents": "Agents"
```
Added to `ROUTE_TITLES` record (following the object-literal pattern introduced in the Phase 6 code-quality refactor).

---

## Implementation Steps

### Phase 1: Extract shared pagination types
- [x] **Step 1.1:** Create `src/types/api.ts` with `PageableRequest` and `PageEnvelope<T>` (with intentional-partial-view comment); run `npm run typecheck` to confirm 0 errors — implemented in [[Employee-Agent-Management-Page-task-1-extract-shared-types]]
- [x] **Step 1.2:** Update `src/features/employees/types.ts` — remove local declarations; migrate all 6 internal consumers (`employeeService.ts`, `employeeService.test.ts`, `useEmployeeList.ts`, `useEmployeeList.test.ts`, `index.ts` barrel) to import from `@/types/api` directly. **No re-export shim** — per design review [[Review-Employee-Agent-Management-Page]] Finding 4 Option (b). Run `npm run typecheck` to confirm 0 errors and `npm run test` to confirm 132/132 pass — implemented in [[Employee-Agent-Management-Page-task-1-extract-shared-types]]

### Phase 2: Agent types + service (TDD)
- [x] **Step 2.1:** Create `src/features/agents/types.ts` with all five interfaces; run `npm run typecheck` — task document: [[Employee-Agent-Management-Page-task-2-types-and-service]]
- [x] **Step 2.2 RED:** Create `src/features/agents/services/agentService.test.ts` with 5 service tests; confirm RED — task document: [[Employee-Agent-Management-Page-task-2-types-and-service]]
- [x] **Step 2.3 GREEN:** Create `src/features/agents/services/agentService.ts`; confirm tests pass — task document: [[Employee-Agent-Management-Page-task-2-types-and-service]]

### Phase 3: useAgentList hook (TDD) + index
- [x] **Step 3.1 RED:** Create `src/features/agents/hooks/useAgentList.test.ts` with 6 behavior tests; confirm RED — task document: [[Employee-Agent-Management-Page-task-3-use-agent-list-hook]]
- [x] **Step 3.2 GREEN:** Create `src/features/agents/hooks/useAgentList.ts`; confirm tests pass — task document: [[Employee-Agent-Management-Page-task-3-use-agent-list-hook]]
- [x] **Step 3.3:** Create `src/features/agents/index.ts` barrel; run `npm run typecheck` — task document: [[Employee-Agent-Management-Page-task-3-use-agent-list-hook]]

### Phase 4: Modal hooks (TDD)
- [x] **Step 4.1 TDD:** Write `useCreateAgent.test.ts` (RED) → `useCreateAgent.ts` (GREEN); confirm tests pass — task document: [[Employee-Agent-Management-Page-task-4-modal-hooks]]
- [x] **Step 4.2 TDD:** Write `useEditAgent.test.ts` (RED) → `useEditAgent.ts` (GREEN); confirm tests pass — task document: [[Employee-Agent-Management-Page-task-4-modal-hooks]]
- [x] **Step 4.3 TDD:** Write `useDeleteAgent.test.ts` (RED) → `useDeleteAgent.ts` (GREEN); confirm tests pass — task document: [[Employee-Agent-Management-Page-task-4-modal-hooks]]
- [x] **Step 4.4:** Create `src/features/agents/hooks/useAgentModals.ts`; run `npm run typecheck` — task document: [[Employee-Agent-Management-Page-task-4-modal-hooks]]

### Phase 5: UI components
- [x] **Step 5.1:** Check if `src/components/ui/textarea.tsx` exists; if not, run `npx shadcn@latest add textarea` and verify with `npm run typecheck`
- [x] **Step 5.2:** Create `src/features/agents/components/AgentTable.tsx`; run `npm run typecheck`
- [x] **Step 5.3:** Create `src/features/agents/components/AgentPageSizeBar.tsx`; run `npm run typecheck`
- [x] **Step 5.4:** Create `src/features/agents/components/AgentPagination.tsx`; run `npm run typecheck`
- [x] **Step 5.5:** Create `src/features/agents/components/CreateAgentModal.tsx`; run `npm run typecheck`
- [x] **Step 5.6:** Create `src/features/agents/components/EditAgentModal.tsx`; run `npm run typecheck`
- [x] **Step 5.7:** Create `src/features/agents/components/DeleteAgentModal.tsx`; run `npm run typecheck`

### Phase 6: Page + wiring + regression
- [x] **Step 6.1:** Create `src/pages/AgentsPage.tsx`; run `npm run typecheck`
- [x] **Step 6.2:** Update `src/router.tsx` — add `/agents` route to employee-only group; import `AgentsPage`
- [x] **Step 6.3:** Update `src/layouts/Sidebar.tsx` — add "Agents" menu item with `roles: [UserRole.EMPLOYEE]` after "Conversations"
- [x] **Step 6.4:** Update `src/layouts/Header.tsx` — add `"/agents": "Agents"` to `ROUTE_TITLES`
- [x] **Step 6.5:** Run `npm run typecheck` + `npm run test` + `npm run build` — confirm 0 errors, all tests pass (132 + ~20 new), build succeeds

---

## Potential Issues / Risks

- **`useEditAgent` data-load phase is a new pattern**: No prior hook in the codebase does an async load on mount before a form is usable. The test must cover the transition from `isLoadingData: true` → form fields populated, and the error branch when `getAgent` rejects.
- **`Textarea` component may not be installed**: Check for `src/components/ui/textarea.tsx` before Phase 5. If the shadcn CLI installs a Radix-based version, fall back to a native `<textarea>` styled to match the `Input` component.
- **Empty `description` and `recurrentPrompt` sent as `null`**: The backend uses full-state PUT semantics — sending `null` clears these fields. The hooks must convert empty strings `""` to `null` before calling the service, so the backend does not receive `""` as a description (which would be stored as an empty string, not cleared).
- **`createdAt` date formatting**: `new Date(agent.createdAt).toLocaleDateString()` uses the browser's locale. This is acceptable for MVP. If internationalization becomes a requirement, use a library like `date-fns`.
- **`totalPages = 0` on empty list**: Use `Math.max(totalPages, 1)` in the pagination label only — do not pass a fake value to the API.
- **No test for `useAgentModals`**: Trivial state hook with no logic. If a future task adds logic to this hook, add tests at that point.

---

## Testing Decisions

**What makes a good test here:** Tests verify behavior through the public interface of each hook. For `agentService`: does the correct request reach the backend and is the typed response returned? For `useAgentList`: does the hook produce the right state in response to method calls? For modal hooks: does the hook invoke the correct API call with the correct body and call `onSuccess` on success? Tests must survive internal refactors and must not assert on private implementation details.

**Modules with TDD (red → green):**

| Module | Test file | What is tested |
|--------|-----------|----------------|
| `agentService` | `services/agentService.test.ts` | All 5 HTTP calls — correct method, path, body, and returned data |
| `useAgentList` | `hooks/useAgentList.test.ts` | Initial load with defaults; page change; page size change + reset to page 0; `refresh()`; failed fetch sets error; subsequent successful fetch clears error; error cleared at start of each fetch |
| `useCreateAgent` | `hooks/useCreateAgent.test.ts` | Successful submit calls `createAgent` and invokes `onSuccess`; failed submit sets `error`; error cleared at start of each attempt |
| `useEditAgent` | `hooks/useEditAgent.test.ts` | `isLoadingData` true on mount; load populates initPrompt + recurrentPrompt; load failure sets `loadError`; name/description pre-filled from prop; successful save calls `updateAgent` + `onSuccess`; failed save sets `error` |
| `useDeleteAgent` | `hooks/useDeleteAgent.test.ts` | `onConfirm` no-op when unchecked; successful confirm calls `deleteAgent` + `onSuccess`; failed confirm sets `error` |

**Modules without tests (structural/display/wiring):**
- `types.ts` — pure type declarations
- `useAgentModals.ts` — trivial state, no logic
- `AgentTable.tsx` — props-driven display; verified by typecheck + build + manual
- `AgentPageSizeBar.tsx` — props-driven display; verified by typecheck
- `AgentPagination.tsx` — props-driven display; verified by typecheck
- `CreateAgentModal.tsx` — structural composition; verified by typecheck + build + manual
- `EditAgentModal.tsx` — structural composition; verified by typecheck + build + manual
- `DeleteAgentModal.tsx` — structural composition; verified by typecheck + build + manual
- `AgentsPage.tsx` — thin composition layer; verified by typecheck + build + manual
- `router.tsx`, `Sidebar.tsx`, `Header.tsx` — wiring; verified by typecheck + build + manual

**Prior art:**
- `src/features/employees/services/employeeService.test.ts` — axios-mock-adapter pattern
- `src/features/employees/hooks/useEmployeeList.ts` / `.test.ts` — pagination hook pattern
- `src/features/employees/hooks/useCreateEmployee.ts` / `.test.ts` — create form hook pattern
- `src/features/employees/hooks/useEditEmployee.ts` / `.test.ts` — edit form hook pattern
- `src/features/employees/hooks/useDeleteEmployee.ts` / `.test.ts` — delete confirmation hook pattern

---

## Task Breakdown

### Task 1: Extract shared pagination types
- **Steps Covered:** Steps 1.1, 1.2
- **Reason for Grouping:** Foundational prerequisite — both agents and employees types depend on the shared file. Low risk, surgical change. Must be executed and verified (typecheck + 132/132 tests) before any agent-specific code is written.
- **Planned Task File:** `Employee-Agent-Management-Page-task-1-extract-shared-types.md`
- **Task Document Link:** [[Employee-Agent-Management-Page-task-1-extract-shared-types]]

### Task 2: Agent types + service (TDD)
- **Steps Covered:** Steps 2.1, 2.2, 2.3
- **Reason for Grouping:** Types must exist before the service; the service test and implementation are a single TDD cycle. Low complexity, logically atomic.
- **Planned Task File:** `Employee-Agent-Management-Page-task-2-types-and-service.md`
- **Task Document Link:** [[Employee-Agent-Management-Page-task-2-types-and-service]]

### Task 3: useAgentList hook (TDD) + index
- **Steps Covered:** Steps 3.1, 3.2, 3.3
- **Reason for Grouping:** Core data-fetching module with 6 behavior tests. The `index.ts` re-export is trivial and naturally grouped with the hook it exposes.
- **Planned Task File:** `Employee-Agent-Management-Page-task-3-use-agent-list-hook.md`
- **Task Document Link:** [[Employee-Agent-Management-Page-task-3-use-agent-list-hook]]

### Task 4: Modal hooks (TDD)
- **Steps Covered:** Steps 4.1, 4.2, 4.3, 4.4
- **Reason for Grouping:** All three form hooks are related (same modal pattern, same error-extraction pattern). `useAgentModals` is trivial state and naturally grouped here. `useEditAgent` is the most complex (data-load phase); placing it in this task keeps complexity contained.
- **Planned Task File:** `Employee-Agent-Management-Page-task-4-modal-hooks.md`
- **Task Document Link:** [[Employee-Agent-Management-Page-task-4-modal-hooks]]

### Task 5: UI components + Textarea check
- **Steps Covered:** Steps 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
- **Reason for Grouping:** All structural display modules. The Textarea prerequisite check is the first step. Execution is straightforward once hooks from Tasks 1–4 exist.
- **Planned Task File:** `Employee-Agent-Management-Page-task-5-ui-components.md`
- **Task Document Link:** [[Employee-Agent-Management-Page-task-5-ui-components]]

### Task 6: Page + wiring + regression
- **Steps Covered:** Steps 6.1, 6.2, 6.3, 6.4, 6.5
- **Reason for Grouping:** All four wiring changes are small surgical edits that should be executed and validated together. The final regression (typecheck + test + build) closes out the feature.
- **Planned Task File:** `Employee-Agent-Management-Page-task-6-page-wiring-regression.md`
- **Task Document Link:** [[Employee-Agent-Management-Page-task-6-page-wiring-regression]]
