# Task: Page + Wiring + Regression — `AgentsPage`, router, Sidebar, Header

#task #current #low-complexity #parent-employee-agent-management-page

**Parent:** [[Features/to-do/Employee-Agent-Management-Page]]
**Parent Type:** Feature
**Related Step(s):** Phase 6, Steps 6.1, 6.2, 6.3, 6.4, 6.5
**Estimated Complexity:** Low

---

## Goal

Compose `AgentsPage.tsx` from all hooks and components built in Tasks 1–5, wire the `/agents` route into the employee-only `RoleGuard` group, add the "Agents" sidebar item with `BrainCircuit` icon, add the `/agents` page title to `Header.tsx`, and run the final regression (typecheck + test + build). This is the closing task of the feature.

---

## Parent Context

The parent feature (`[[Features/to-do/Employee-Agent-Management-Page]]`) defines Phase 6 as pure composition and wiring — no new business logic, no new tests. All hook and component logic was built and verified in Tasks 1–5. Phase 6 connects them into a live, navigable page.

**Parent spec for each step:**

**Step 6.1 — `AgentsPage.tsx`:**
- Import `useAgentList` via the feature barrel (`@/features/agents`)
- Import `useAgentModals` directly from `@/features/agents/hooks/useAgentModals` (not exported from barrel — consistent with `EmployeesPage.tsx` prior art)
- Import all six components directly from `@/features/agents/components/`
- Page heading: `<h1>Agents</h1>` + subtitle "Manage your personal AI agents."
- "New Agent" button: `<Button>` with `<Plus className="size-4" />`
- `AgentPageSizeBar` always mounted (even in error state — allows retry via page size change)
- Error path: `<ErrorMessage message={error} />` replaces table + pagination
- Modals: conditionally mounted (`{createOpen && ...}`, `{editAgent && ...}`, `{deleteAgent && ...}`)

**Step 6.2 — `router.tsx`:**
- Add `<Route path="/agents" element={<AgentsPage />} />` to the employee-only `RoleGuard` group
- Import `AgentsPage` from `@/pages/AgentsPage`

**Step 6.3 — `Sidebar.tsx`:**
- Add "Agents" menu item after "Conversations" in the `menuItems` array
- Use `BrainCircuit` icon (NOT `MessageSquare` — fixes Finding 1 from `[[Bugs/to-do/Review-Employee-Agent-Management-Page]]`)
- `roles: [UserRole.EMPLOYEE]`
- Add `BrainCircuit` to the lucide-react import (alongside existing `Bot`, `LayoutDashboard`, `MessageSquare`, `Settings`, `Users`)

**Step 6.4 — `Header.tsx`:**
- Add `"/agents": "Agents"` to the `ROUTE_TITLES` Record

**Step 6.5 — Final regression:**
- `npm run typecheck` — 0 errors
- `npm run test` — all 157 tests pass (no regressions; no new tests added in Tasks 5–6)
- `npm run build` — clean build, no warnings

**Pending review findings (from `[[Bugs/to-do/Review-Employee-Agent-Management-Page]]`):**
- **Finding 1** (🟡 Moderate — This task resolves it): Sidebar icon conflict — original feature spec uses `MessageSquare` for both Conversations and Agents. **This task fixes it** by using `BrainCircuit` for Agents. In collapsed sidebar mode, employees can distinguish between Conversations and Agents by icon.
- **Finding 2** (🟢 Low — Resolved in Task 4): Null coalescing in `useEditAgent`. Already resolved. No impact here.

---

## Preconditions / Dependencies

- Tasks 1–5 complete:
  - `src/types/api.ts` — shared pagination types
  - `src/features/agents/types.ts` — all 5 agent interfaces
  - `src/features/agents/services/agentService.ts` — 5 HTTP adapter functions
  - `src/features/agents/hooks/useAgentList.ts` — pagination hook
  - `src/features/agents/hooks/useCreateAgent.ts`, `useEditAgent.ts`, `useDeleteAgent.ts`, `useAgentModals.ts` — modal hooks
  - `src/features/agents/index.ts` — barrel (`useAgentList` + type exports)
  - `src/components/ui/textarea.tsx` — installed via shadcn CLI
  - `src/features/agents/components/AgentTable.tsx`, `AgentPageSizeBar.tsx`, `AgentPagination.tsx`, `CreateAgentModal.tsx`, `EditAgentModal.tsx`, `DeleteAgentModal.tsx`
- Test baseline: **157/157** (after Tasks 1–4; Tasks 5–6 add no new tests)
- `src/pages/AgentsPage.tsx` does NOT exist yet
- `BrainCircuit` icon available in `lucide-react` ^1.21.0 (confirmed in `node_modules`)
- Frontend project root: `project/srcs/frontend/`. All commands run from that directory.

---

## Skills and Documentation Preparation

### Skills Reviewed

| Skill | Selected | Purpose |
|-------|----------|---------|
| `documentation-management` | Yes | Task template and doc placement |
| `solid-deep-design` | Yes | SRP for `AgentsPage` (thin composition layer only; zero business logic) |
| `memory-bank` | Yes | Confirmed routing pattern, sidebar pattern, header ROUTE_TITLES pattern |
| `tdd` | Yes | No new tests — wiring task; validates via typecheck + test + build |
| `find-docs` | Not needed | All patterns established in codebase; no new library APIs |
| `glossary-management` | Not needed | No new domain terms introduced |

### Documentation Reviewed

- `documentation/Features/to-do/Employee-Agent-Management-Page.md` — Sections 17–20 (page, router, sidebar, header specs)
- `documentation/Bugs/to-do/Review-Employee-Agent-Management-Page.md` — Finding 1 (icon conflict; resolved here)
- `documentation/ADRs/ADR-010-base-ui-over-radix-ui-for-frontend.md` — conditional modal mounting (Base UI Dialog fires animations on mount)

---

## Related Existing Code

| File | Role |
|------|------|
| `src/pages/EmployeesPage.tsx` | Prior art: page composition pattern, hook imports, modal mounting order |
| `src/router.tsx` | Modified in Step 6.2 — add `/agents` to employee-only group |
| `src/layouts/Sidebar.tsx` | Modified in Step 6.3 — add "Agents" menu item |
| `src/layouts/Header.tsx` | Modified in Step 6.4 — add `"/agents": "Agents"` to ROUTE_TITLES |
| `src/features/agents/index.ts` | Barrel; exports `useAgentList` and types |
| `src/features/agents/hooks/useAgentModals.ts` | Imported directly by `AgentsPage` (not via barrel) |
| `src/features/agents/components/AgentTable.tsx` | Imported by `AgentsPage` |
| `src/features/agents/components/AgentPageSizeBar.tsx` | Imported by `AgentsPage` |
| `src/features/agents/components/AgentPagination.tsx` | Imported by `AgentsPage` |
| `src/features/agents/components/CreateAgentModal.tsx` | Imported by `AgentsPage` |
| `src/features/agents/components/EditAgentModal.tsx` | Imported by `AgentsPage` |
| `src/features/agents/components/DeleteAgentModal.tsx` | Imported by `AgentsPage` |
| `src/components/common/ErrorMessage.tsx` | Used by `AgentsPage` for error state |
| `src/components/ui/button.tsx` | "New Agent" button |

---

## Implementation Details (Approach)

**`AgentsPage.tsx` is a pure composition layer.** It calls two hooks, passes their outputs to components, and conditionally mounts modals. It contains zero business logic. The deletion test confirms it earns its existence: removing it would push the composition responsibility into the router, which is not a layout concern.

**SRP:** `AgentsPage` has one reason to change — the layout and composition of the agent management page. It does not own data fetching, form state, or API calls.

**`AgentPageSizeBar` always mounted:** Consistent with the `EmployeesPage` pattern where `EmployeeFilterBar` is "always mounted so admin can retry after error." For agents, the page-size selector gives the employee a way to trigger a fresh fetch even in the error state (by changing page size, which calls `onPageSizeChange`, which calls `fetchAgents`).

**Conditional modal mounting:** Modals are mounted only when their trigger condition is met (`createOpen === true`, `editAgent !== null`, `deleteAgent !== null`). This is consistent with the employee page pattern and with ADR-010 — Base UI Dialog animations fire on mount/unmount, so conditional mounting is preferred over a persistent `open` prop.

**Icon fix for Sidebar:** The original feature spec used `MessageSquare` for Agents (it was already imported). The Review document (Finding 1) identifies this as a UX issue in collapsed sidebar mode. `BrainCircuit` is the recommended replacement — it evokes AI/intelligence and does not conflict with any existing sidebar icon (`Bot`, `LayoutDashboard`, `MessageSquare`, `Settings`, `Users`).

---

## Implementation Details (Files to Create/Modify)

- [x] `src/pages/AgentsPage.tsx` (new)
- [x] `src/router.tsx` (modify — add `/agents` route to employee-only group)
- [x] `src/layouts/Sidebar.tsx` (modify — add "Agents" menu item with `BrainCircuit`)
- [x] `src/layouts/Header.tsx` (modify — add `"/agents"` to `ROUTE_TITLES`)

---

## Step-by-Step Implementation

---

### Step 6.1 — Create `AgentsPage.tsx`

**Goal:** Thin composition layer for the Agents page. Imports hooks and components; contains no logic.

**Dependency:** Tasks 1–5 complete — all hooks and components exist.

**File:** `src/pages/AgentsPage.tsx`

```tsx
// src/pages/AgentsPage.tsx

import { useAgentList } from "@/features/agents"
import { useAgentModals } from "@/features/agents/hooks/useAgentModals"
import { AgentTable } from "@/features/agents/components/AgentTable"
import { AgentPageSizeBar } from "@/features/agents/components/AgentPageSizeBar"
import { AgentPagination } from "@/features/agents/components/AgentPagination"
import { CreateAgentModal } from "@/features/agents/components/CreateAgentModal"
import { EditAgentModal } from "@/features/agents/components/EditAgentModal"
import { DeleteAgentModal } from "@/features/agents/components/DeleteAgentModal"
import { ErrorMessage } from "@/components/common/ErrorMessage"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export function AgentsPage() {
  const {
    agents,
    totalPages,
    totalElements,
    currentPage,
    isLoading,
    error,
    pageSize,
    onPageSizeChange,
    onPageChange,
    refresh,
  } = useAgentList()

  const {
    editAgent,
    setEditAgent,
    deleteAgent,
    setDeleteAgent,
    createOpen,
    setCreateOpen,
  } = useAgentModals()

  return (
    <div className="flex flex-col gap-6">
      {/* Page heading */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agents</h1>
          <p className="text-muted-foreground">Manage your personal AI agents.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          New Agent
        </Button>
      </div>

      {/* Page size selector — always mounted so employee can retry after error */}
      <AgentPageSizeBar pageSize={pageSize} onPageSizeChange={onPageSizeChange} />

      {/* Error state replaces the table + pagination area */}
      {error ? (
        <ErrorMessage message={error} />
      ) : (
        <>
          <AgentTable
            agents={agents}
            isLoading={isLoading}
            onEditClick={setEditAgent}
            onDeleteClick={setDeleteAgent}
          />
          <AgentPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalElements={totalElements}
            isLoading={isLoading}
            onPageChange={onPageChange}
          />
        </>
      )}

      {createOpen && (
        <CreateAgentModal
          onClose={() => setCreateOpen(false)}
          onSuccess={() => { setCreateOpen(false); refresh() }}
        />
      )}
      {editAgent && (
        <EditAgentModal
          agent={editAgent}
          onClose={() => setEditAgent(null)}
          onSuccess={() => { setEditAgent(null); refresh() }}
        />
      )}
      {deleteAgent && (
        <DeleteAgentModal
          agent={deleteAgent}
          onClose={() => setDeleteAgent(null)}
          onSuccess={() => { setDeleteAgent(null); refresh() }}
        />
      )}
    </div>
  )
}
```

After creating the file:

```bash
npm run typecheck
```

Expected: 0 errors.

---

### Step 6.2 — Update `router.tsx`

**Goal:** Register `/agents` as an employee-only child route.

**Dependency:** Step 6.1 complete (`AgentsPage` must exist for the import to typecheck).

**Current state of `router.tsx`** (employee-only section):
```tsx
{/* Employee-only routes */}
<Route element={
  <ProtectedRoute>
    <RoleGuard allowedRoles={[UserRole.EMPLOYEE]} redirectTo="/dashboard">
      <MainLayout />
    </RoleGuard>
  </ProtectedRoute>
}>
  <Route path="/conversations" element={<ConversationsPage />} />
</Route>
```

**Change 1 — Add import** (alongside the other page imports at the top of `router.tsx`):
```tsx
import { AgentsPage } from "@/pages/AgentsPage"
```

**Change 2 — Add route** (inside the employee-only `RoleGuard` group, after `/conversations`):
```tsx
  <Route path="/conversations" element={<ConversationsPage />} />
  <Route path="/agents" element={<AgentsPage />} />
```

The resulting employee-only block:
```tsx
{/* Employee-only routes */}
<Route element={
  <ProtectedRoute>
    <RoleGuard allowedRoles={[UserRole.EMPLOYEE]} redirectTo="/dashboard">
      <MainLayout />
    </RoleGuard>
  </ProtectedRoute>
}>
  <Route path="/conversations" element={<ConversationsPage />} />
  <Route path="/agents" element={<AgentsPage />} />
</Route>
```

After editing:

```bash
npm run typecheck
```

Expected: 0 errors.

---

### Step 6.3 — Update `Sidebar.tsx`

**Goal:** Add "Agents" menu item for employees using `BrainCircuit` icon (not `MessageSquare`).

**Dependency:** Step 6.2 complete.

**Change 1 — Add `BrainCircuit` to the lucide-react import** (current import: `Bot, LayoutDashboard, MessageSquare, Settings, Users`):
```tsx
import {
  Bot,
  BrainCircuit,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Users,
} from "lucide-react"
```

**Change 2 — Add menu item** (after the "Conversations" entry in the `menuItems` array):
```tsx
{
  title: "Conversations",
  url: "/conversations",
  icon: MessageSquare,
  roles: [UserRole.EMPLOYEE],
},
{
  title: "Agents",
  url: "/agents",
  icon: BrainCircuit,
  roles: [UserRole.EMPLOYEE],
},
```

After editing:

```bash
npm run typecheck
```

Expected: 0 errors.

---

### Step 6.4 — Update `Header.tsx`

**Goal:** Add `/agents` to the `ROUTE_TITLES` record so the header renders "Agents" on that route.

**Dependency:** Step 6.3 complete.

**Current `ROUTE_TITLES`:**
```tsx
const ROUTE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/conversations": "Conversations",
  "/employees": "Employees",
  "/app-settings": "App Settings",
}
```

**Updated `ROUTE_TITLES`:**
```tsx
const ROUTE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/conversations": "Conversations",
  "/employees": "Employees",
  "/app-settings": "App Settings",
  "/agents": "Agents",
}
```

After editing:

```bash
npm run typecheck
```

Expected: 0 errors.

---

### Step 6.5 — Final Regression

**Goal:** Confirm the complete feature compiles, all tests pass, and the production build succeeds.

**Dependency:** Steps 6.1–6.4 all complete.

```bash
npm run typecheck
npm run test
npm run build
```

**Expected results:**
- `npm run typecheck`: 0 errors
- `npm run test`: **157/157** tests pass (0 regressions; 0 new tests in Tasks 5–6)
- `npm run build`: clean build, no errors or warnings

If `npm run test` shows a count other than 157, trace the delta:
- More than 157: unexpected test files were created (investigate)
- Fewer than 157: a regression broke an existing test (do not proceed until resolved)

---

## Edge Cases

### Step 6.1 — `AgentsPage`

| Edge Case | Handling |
|-----------|----------|
| `error` is non-null | `<ErrorMessage>` replaces table + pagination; `<AgentPageSizeBar>` stays mounted; all three modals still conditionally mount if triggered |
| `agents` is empty + not loading | `AgentTable` renders the empty state row ("No agents found.") |
| `createOpen` becomes true while `editAgent` or `deleteAgent` is non-null | Each modal is independently conditioned; multiple modals can theoretically mount simultaneously (Base UI stacks dialogs). In practice, the UI only triggers one at a time |
| Employee navigates to `/agents` for the first time | `useAgentList` mount effect fires immediately; `isLoading: true` → table shows loading overlay |

### Step 6.2 — `router.tsx`

| Edge Case | Handling |
|-----------|----------|
| Admin navigates directly to `/agents` | `RoleGuard allowedRoles={[UserRole.EMPLOYEE]}` redirects to `/dashboard` |
| Unauthenticated user navigates to `/agents` | `ProtectedRoute` redirects to `/login` before `RoleGuard` is evaluated |

### Step 6.3 — `Sidebar.tsx`

| Edge Case | Handling |
|-----------|----------|
| Admin user session | `hasAnyRole([UserRole.EMPLOYEE])` returns false; "Agents" item is filtered out of `visibleMenuItems` |
| Sidebar in collapsed (icon-only) mode | `BrainCircuit` and `MessageSquare` are now visually distinct icons; tooltip still shows the title on hover |

### Step 6.4 — `Header.tsx`

| Edge Case | Handling |
|-----------|----------|
| Admin navigates to `/agents` (should not happen — redirected) | Fallback `?? "Control Panel"` in `getPageTitle()` would apply if somehow reached; not a real case |

---

## Design Decisions

### Decision 1: `BrainCircuit` for the Agents sidebar icon (resolves Review Finding 1)

**Decision:** Use `BrainCircuit` from lucide-react for the "Agents" sidebar item instead of the `MessageSquare` originally specified in the feature document.

**Reasoning:** `MessageSquare` is already used by "Conversations." Both are employee-only items, so an employee sees two identical icons in the sidebar. In collapsed mode (icon-only view), the items are visually indistinguishable without hovering for a tooltip. `BrainCircuit` evokes AI agents/intelligence, does not conflict with any existing icon, and is available in lucide-react ^1.21.0 (confirmed in `node_modules`). See `[[Bugs/to-do/Review-Employee-Agent-Management-Page]]` Finding 1.

**Rejected alternative:** Keep `MessageSquare` — acceptable in expanded sidebar mode (labels distinguish), but poor UX in collapsed mode. The one-line icon change is low risk and high value.

### Decision 2: `useAgentModals` imported directly in `AgentsPage` (not via barrel)

**Decision:** `AgentsPage` imports `useAgentModals` directly from `@/features/agents/hooks/useAgentModals`, not through the `@/features/agents` barrel.

**Reasoning:** The barrel (`index.ts`) exports only the hooks and types that consumers OUTSIDE the feature module need to cross the feature boundary for data or types. `useAgentModals` is UI-layer state — it belongs to the page composition layer, not the feature's public API. Prior art: `EmployeesPage.tsx` imports `useEmployeeModals` directly from `@/features/employees/hooks/useEmployeeModals` while importing `useEmployeeList` via the barrel.

**Rejected alternative:** Export `useAgentModals` from `index.ts` — this would expose a UI-layer concern in the feature's public API, which would attract unintended consumers and widen the barrel's interface unnecessarily.

### Decision 3: `AgentPageSizeBar` always mounted during error state

**Decision:** `<AgentPageSizeBar>` is rendered outside the `{error ? ... : ...}` conditional, so it remains visible even when `<ErrorMessage>` is shown.

**Reasoning:** Changing the page size calls `onPageSizeChange`, which calls `fetchAgents(0, newSize)`, which clears `error` and retries the request. This gives the employee a UI action to attempt recovery without a full page reload. The same pattern is in `EmployeesPage` where `<EmployeeFilterBar>` is noted as "always mounted so admin can retry after error."

**Rejected alternative:** Mount `AgentPageSizeBar` only when `!error` — simpler conditional, but removes the employee's only in-page retry mechanism. They would need to reload the page or navigate away and back.

### Decision 4: Modal mounting order (create → edit → delete)

**Decision:** Modals are conditionally mounted in this order: `createOpen`, `editAgent`, `deleteAgent`.

**Reasoning:** This order follows the feature doc spec and mirrors the button layout order in the page heading and table row (New Agent appears before Edit, Edit before Delete). It is cosmetic — only one modal is ever shown at a time in normal use.

**Note:** `EmployeesPage.tsx` uses the reverse order (edit → delete → create). The agents page follows the feature spec order, which is more logical (create is triggered from the page heading button; edit and delete are triggered from table rows).

---

## Testing Considerations

### Automatic Validation

- [x] After Step 6.1: Run `npm run typecheck` from `project/srcs/frontend/` — 0 errors
- [x] After Step 6.2: Run `npm run typecheck` — 0 errors
- [x] After Step 6.3: Run `npm run typecheck` — 0 errors
- [x] After Step 6.4: Run `npm run typecheck` — 0 errors
- [x] Step 6.5: Run `npm run typecheck` — 0 errors
- [x] Step 6.5: Run `npm run test` — **157/157** pass (no regressions)
- [x] Step 6.5: Run `npm run build` — clean build, no errors or warnings

### Manual Validation

These checks verify the live feature in a browser. Start the dev server from `project/srcs/frontend/`:

```bash
npm run dev
```

**Navigation and access control:**

- [ ] Log in as an **employee** — confirm "Agents" appears in the sidebar below "Conversations" with a distinct icon (brain circuit, not speech bubble)
- [ ] Log in as an **admin** — confirm "Agents" does NOT appear in the sidebar
- [ ] While logged in as admin, navigate directly to `/agents` — confirm redirect to `/dashboard`
- [ ] While logged out, navigate directly to `/agents` — confirm redirect to `/login`
- [ ] Navigate to `/agents` as employee — confirm the header reads "Agents"
- [ ] Navigate between `/conversations` and `/agents` — confirm the header title updates correctly for each route

**Agent list:**

- [ ] Navigate to `/agents` — confirm the page renders with the heading "Agents" and subtitle "Manage your personal AI agents."
- [ ] "New Agent" button is visible in the top-right corner
- [ ] While agents are loading, a loading overlay appears over the table
- [ ] If no agents exist, the table body shows "No agents found."
- [ ] If agents exist, each row shows Name, Description (or "—" if null), Created date (formatted), and Edit/Delete action buttons
- [ ] Changing the rows-per-page selector updates the table

**Pagination:**

- [ ] Previous button is disabled on the first page
- [ ] Next button is disabled on the last page
- [ ] Page X of Y label updates when navigating pages

**Create agent:**

- [ ] Clicking "New Agent" opens the Create Agent modal
- [ ] The modal has Name *, Description, Init Prompt *, and Recurrent Prompt fields
- [ ] Init Prompt and Recurrent Prompt are multi-line textareas
- [ ] Help text is visible below Init Prompt: "Applied as a system message on the first turn of each conversation using this agent."
- [ ] Help text is visible below Recurrent Prompt: "Prepended to every user message. Changes take effect immediately on all future messages."
- [ ] Successful create closes the modal and refreshes the table (new agent appears)
- [ ] API error during create renders the error message inside the modal
- [ ] Clicking "Cancel" or closing the dialog dismisses the modal without creating an agent

**Edit agent:**

- [ ] Clicking the edit (pencil) icon on a row opens the Edit Agent modal
- [ ] While `GET /agent/{id}` is in flight, a loading spinner appears inside the modal
- [ ] Once loaded, all four fields are pre-populated (name, description, init prompt, recurrent prompt)
- [ ] Successful save closes the modal and refreshes the table (updated values appear)
- [ ] If `GET /agent/{id}` fails, an error message appears inside the modal with a "Close" button
- [ ] API error during save renders the error message inside the modal

**Delete agent:**

- [ ] Clicking the delete (trash) icon on a row opens the Delete Agent modal
- [ ] The modal displays the agent name in the description
- [ ] The Delete button is disabled until the confirmation checkbox is ticked
- [ ] Successful delete closes the modal and refreshes the table (agent is gone)
- [ ] API error during delete renders the error message inside the modal; checkbox state is preserved for retry

---

## Related Code Explanations

- `src/pages/EmployeesPage.tsx` — prior art for page composition, hook import pattern, modal mounting
- `src/router.tsx` — route structure before and after this task
- `src/layouts/Sidebar.tsx` — menu item array, `visibleMenuItems` filter, icon usage
- `src/layouts/Header.tsx` — `ROUTE_TITLES` record, `getPageTitle()` function
- `src/features/agents/index.ts` — barrel exports (data hook + types only; modal hooks not exported)

---

## Completion Criteria

- [x] `src/pages/AgentsPage.tsx` created; typechecks clean; contains no business logic
- [x] `src/router.tsx` updated — `/agents` route present inside employee-only `RoleGuard` group
- [x] `src/layouts/Sidebar.tsx` updated — "Agents" item present after "Conversations" with `BrainCircuit` icon and `roles: [UserRole.EMPLOYEE]`
- [x] `src/layouts/Header.tsx` updated — `"/agents": "Agents"` entry present in `ROUTE_TITLES`
- [x] `npm run typecheck` — 0 errors (run after each step and once more at end)
- [x] `npm run test` — all tests pass (157/157); no regressions
- [x] `npm run build` — clean build, no errors or warnings
- [x] Finding 1 from `[[Bugs/to-do/Review-Employee-Agent-Management-Page]]` resolved: Agents sidebar item uses `BrainCircuit`, not `MessageSquare`
- [ ] All manual validation steps completed by a human in the browser
