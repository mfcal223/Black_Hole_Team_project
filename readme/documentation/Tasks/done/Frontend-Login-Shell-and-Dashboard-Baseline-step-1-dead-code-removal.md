# Task: Dead Code Removal — Pages, Services, and Types

#task #current #low-complexity #parent-frontend-login-shell-and-dashboard-baseline

**Parent:** [[Features/to-do/Frontend-Login-Shell-and-Dashboard-Baseline]]
**Parent Type:** Feature
**Related Step(s):** Phase 1 — Steps 1.1, 1.2, 1.3
**Estimated Complexity:** Low

---

## Goal

Delete 17 files — 6 pages, 7 services, and 4 type files — that target non-existent backend endpoints or were never connected to real logic. After this task the deleted files no longer exist on disk; the known breakages in `App.tsx` and `DashboardPage.tsx` are expected and are explicitly left for Task 2.

---

## Parent Context

The frontend was built against an older backend API (`/api/v1/...` URL prefix, workflow endpoints, a different agent management paradigm). The current backend does not expose those endpoints. The result is a codebase full of files that compile but cannot work: they either call endpoints that return 404/405, call endpoints with the wrong URL shape (double-prefixed `/api/v1/agents` instead of `/agent`), or are empty stubs with no implementation at all.

The parent feature takes a two-phase approach:
1. **Phase 1 (this task):** Delete every dead file. Accept that `App.tsx` and `DashboardPage.tsx` will break — they import from files that will no longer exist.
2. **Phase 2 (Task 2):** Rewrite `DashboardPage.tsx`, clean up `App.tsx`, simplify `Sidebar.tsx` and `Header.tsx` — producing a compilable, runnable shell.

The parent document is explicit: "After Task 1, both `App.tsx` (imports deleted pages) and `DashboardPage.tsx` (imports deleted `agentService.ts`) fail to compile — Task 2 fixes both." Task 1 does not attempt to fix those callers.

**Scope constraint:** All changes are limited to `project/srcs/frontend/src/`. No backend, Makefile, or Docker files are touched.

---

## Preconditions / Dependencies

- No prior task needs to have run. The existing frontend codebase is the baseline.
- The 17 files to be deleted have been verified to exist in the codebase as of this writing (confirmed via filesystem enumeration).
- `project/srcs/frontend/src/services/api.ts` is **kept** — it is the shared Axios instance used by `authService.ts`, `authHelpers.ts`, and `LoginPage.tsx`, all of which survive.
- `project/srcs/frontend/src/routes/AdminRoute.tsx` is **kept** per the parent document: it has no callers after cleanup but is reserved for future admin-only pages.
- `project/srcs/frontend/src/pages/DashboardPage.tsx` is **kept** (but broken after this task) — it is the subject of a full rewrite in Task 2.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `solid-deep-design` — Selected — confirms that modules with no real responsibility (services targeting non-existent endpoints, empty stubs) are pure pass-throughs or dead code; the deletion test (if deleted, no useful behaviour scatters) applies cleanly to all 17 files.
- `tdd` — Selected — defines the validation approach: since no new code is written, validation is structural (file absence confirmed by grep/find), not behavioural.
- `find-docs` — Not needed — this task creates no new code and uses no library APIs. No documentation queries are required.
- `react-best-practices` — Not needed — no React code is written or modified.

### Documentation Reviewed

- **Project codebase scan:** All 17 target files were read in full to confirm their exact import chains and verify that no surviving file (outside of the two known Task 2 targets) depends on them.
- **Frontend-Architecture.md:** Confirms the direction the frontend is intended to evolve. Not applicable to this task (purely structural cleanup, no new architecture introduced).

### Related Existing Code

- `project/srcs/frontend/src/App.tsx` — imports all 6 deleted pages; will break after this task; fixed in Task 2.
- `project/srcs/frontend/src/pages/DashboardPage.tsx` — imports `getMyAgents` and `getSubordinateAgents` from `agentService.ts`; will break after this task; fixed in Task 2.
- `project/srcs/frontend/src/services/api.ts` — survived shared Axios instance; imported by all deleted services (those imports disappear when the services are deleted).
- `project/srcs/frontend/src/services/authHelpers.ts` — survived; imported by `Sidebar.tsx` (for `isAdmin`) and `Header.tsx`; NOT deleted in this task.

---

## Implementation Details

### Approach

Pure filesystem deletion. No code is written and no existing file is modified. The 17 files are deleted in three batches (pages → services → types) to match the parent document's step numbering. Within each batch the order of individual deletions does not affect correctness.

**SOLID perspective:** All 17 files fail the deletion test — deleting them causes zero complexity to scatter across callers. The services target endpoints that do not exist, so no real behaviour is hiding behind them. The type files are exclusively consumed by the deleted services and pages. The page files are thin UI wrappers over the deleted services. Removing all of them reduces the codebase to files that have a real reason to exist.

**Known post-task state:** After the 17 deletions, `tsc --noEmit` will report errors in `App.tsx` and `DashboardPage.tsx` because those files still import from deleted modules. This is intentional: the parent document explicitly stages the breakage here and repairs it in Task 2. Task 1 completion criteria do NOT include a passing typecheck.

### Files to Delete (17 total)

**Step 1.1 — Pages (6 files)**
- [x] `project/srcs/frontend/src/pages/AgentsPage.tsx`
- [x] `project/srcs/frontend/src/pages/AgentDetailsPage.tsx`
- [x] `project/srcs/frontend/src/pages/WorkflowsPage.tsx`
- [x] `project/srcs/frontend/src/pages/WorkflowDetailsPage.tsx`
- [x] `project/srcs/frontend/src/pages/EmployeesPage.tsx`
- [x] `project/srcs/frontend/src/pages/RegisterPage.tsx`

**Step 1.2 — Services (7 files)**
- [x] `project/srcs/frontend/src/services/agentService.ts`
- [x] `project/srcs/frontend/src/services/employeeService.ts`
- [x] `project/srcs/frontend/src/services/adminService.ts`
- [x] `project/srcs/frontend/src/services/workflowService.ts`
- [x] `project/srcs/frontend/src/services/workflowStepService.ts`
- [x] `project/srcs/frontend/src/services/userSettingsService.ts`
- [x] `project/srcs/frontend/src/services/userSourceService.ts`

**Step 1.3 — Types (4 files)**
- [x] `project/srcs/frontend/src/types/admin.ts`
- [x] `project/srcs/frontend/src/types/employee.ts`
- [x] `project/srcs/frontend/src/types/workflow.ts`
- [x] `project/srcs/frontend/src/types/workflowStep.ts`

---

## Step-by-Step Implementation

### Step 1.1: Delete Page Files

**Goal:** Remove the 6 page components that call non-existent backend endpoints.
**Dependencies:** None.

- [x] Delete `project/srcs/frontend/src/pages/AgentsPage.tsx`
- [x] Delete `project/srcs/frontend/src/pages/AgentDetailsPage.tsx`
- [x] Delete `project/srcs/frontend/src/pages/WorkflowsPage.tsx`
- [x] Delete `project/srcs/frontend/src/pages/WorkflowDetailsPage.tsx`
- [x] Delete `project/srcs/frontend/src/pages/EmployeesPage.tsx`
- [x] Delete `project/srcs/frontend/src/pages/RegisterPage.tsx`

**Why this step is critical:** These pages are the visible surface of the dead code problem. Each one makes API calls on mount, so each one produces runtime errors in the browser. Removing them ensures no route in the surviving `App.tsx` render tree will trigger broken network requests once Task 2 re-maps the routes.

#### What each file was doing

| File | Service dependency | Why deleted |
|------|-------------------|-------------|
| `AgentsPage.tsx` | `agentService.ts` (`getMyAgents`, `createAgent`, `deleteAgent`) | `agentService` targets `/api/v1/agents` — double-prefixed and endpoint does not exist in new backend |
| `AgentDetailsPage.tsx` | `agentService.ts` (`getAgentById`) | Same — endpoint gone |
| `WorkflowsPage.tsx` | `workflowService.ts` + `types/workflow.ts` | `/workflow` endpoint does not exist in new backend |
| `WorkflowDetailsPage.tsx` | `agentService.ts` + `workflowService.ts` + `workflowStepService.ts` + two type files | All three services target non-existent endpoints |
| `EmployeesPage.tsx` | `employeeService.ts` (`getEmployees`) | Targets `/api/v1/employees` — double-prefixed |
| `RegisterPage.tsx` | `adminService.ts` (`createEmployee`, `createAdmin`) | Targets `/admin/employees` and `/admin/` — non-existent endpoints |

#### Edge Cases

1. **`WorkflowDetailsPage.tsx` has the broadest import surface** — it imports from `agentService`, `workflowService`, `workflowStepService`, `types/workflow`, and `types/workflowStep`. Deleting it removes all five of those dependencies in one step; the other files in the delete list account for the remaining callers of those modules.
2. **`App.tsx` still imports all six deleted pages after this step.** This is expected. TypeScript will report errors on `App.tsx` — those errors are fixed in Task 2, Step 3.1.

---

### Step 1.2: Delete Service Files

**Goal:** Remove the 7 service files that target broken or non-existent endpoints.
**Dependencies:** None — all deletions in this task are independent at the filesystem level. Steps are ordered by dependency layer (pages → services → types) for ease of audit, not because of a technical sequencing requirement. <!-- REVIEW-FIX: Previous version overstated Step 1.1 as a hard dependency; deletions are independent. -->

- [x] Delete `project/srcs/frontend/src/services/agentService.ts`
- [x] Delete `project/srcs/frontend/src/services/employeeService.ts`
- [x] Delete `project/srcs/frontend/src/services/adminService.ts`
- [x] Delete `project/srcs/frontend/src/services/workflowService.ts`
- [x] Delete `project/srcs/frontend/src/services/workflowStepService.ts`
- [x] Delete `project/srcs/frontend/src/services/userSettingsService.ts`
- [x] Delete `project/srcs/frontend/src/services/userSourceService.ts`

**Why this step is critical:** Even after the pages are deleted, the service files remain importable. `DashboardPage.tsx` still imports `getMyAgents` and `getSubordinateAgents` from `agentService.ts`. Deleting `agentService.ts` here creates the clean break that forces Task 2 to rewrite `DashboardPage.tsx` without any stale API calls.

#### What each file was doing

| File | Target URL | Why deleted |
|------|-----------|-------------|
| `agentService.ts` | `/api/v1/agents/*` | Double-prefixed (Vite proxy adds `/api`; the service hardcodes it too) and endpoint does not exist in new backend |
| `employeeService.ts` | `/api/v1/employees` | Double-prefixed; endpoint path wrong |
| `adminService.ts` | `/admin/employees`, `/admin/` | Endpoints do not exist in new backend |
| `workflowService.ts` | `/workflow` | Endpoint does not exist in new backend |
| `workflowStepService.ts` | `/workflow-step` | Endpoint does not exist in new backend |
| `userSettingsService.ts` | (none — empty stub containing only `import api from "./api"`) | Unused stub with no exported functions |
| `userSourceService.ts` | (none — empty stub containing only `import api from "./api"`) | Unused stub with no exported functions |

#### Edge Cases

1. **`adminService.ts` imports from `types/admin.ts` and `types/employee.ts`** — both type files are in the Step 1.3 delete list. Deleting the service first removes the only importer of those types, making the type files orphaned dead code before Step 1.3 removes them.
2. **`workflowService.ts` and `workflowStepService.ts` import their type files** — same situation; after Step 1.1 deleted all page callers and Step 1.2 deletes the services, the `workflow.ts` and `workflowStep.ts` type files become fully orphaned.
3. **`DashboardPage.tsx` still imports from `agentService.ts` after Step 1.1.** Deleting `agentService.ts` in this step makes `DashboardPage.tsx` fail to compile. This is the intended state before Task 2.

---

### Step 1.3: Delete Type Files

**Goal:** Remove the 4 TypeScript type files that are exclusively consumed by the deleted features.
**Dependencies:** None — deletions are independent. Deleting types last mirrors the dependency-layer order (types are the deepest layer); there is no filesystem or build requirement that Steps 1.1 and 1.2 precede Step 1.3. <!-- REVIEW-FIX: Previous version overstated Steps 1.1 and 1.2 as hard dependencies. -->

- [x] Delete `project/srcs/frontend/src/types/admin.ts`
- [x] Delete `project/srcs/frontend/src/types/employee.ts`
- [x] Delete `project/srcs/frontend/src/types/workflow.ts`
- [x] Delete `project/srcs/frontend/src/types/workflowStep.ts`

**Why this step is critical:** Without this step, the types directory retains stale type definitions. These type files have no callers left after Steps 1.1 and 1.2, but their continued presence invites accidental re-use. Deleting them ensures the surviving types directory contains only types that are actually in use.

#### What each file contained and who used it

| File | Types defined | Importers (all deleted) |
|------|--------------|-------------------------|
| `types/admin.ts` | `AdminForm`, `AdminMiniDTO` | `adminService.ts` (Step 1.2) |
| `types/employee.ts` | `EmployeeForm`, `EmployeeMiniDTO` | `adminService.ts` (Step 1.2) |
| `types/workflow.ts` | `TriggerType`, `WorkflowDTO`, `WorkflowMiniDTO`, `WorkflowForm` | `workflowService.ts` (Step 1.2), `WorkflowsPage.tsx` (Step 1.1), `WorkflowDetailsPage.tsx` (Step 1.1) |
| `types/workflowStep.ts` | `WorkflowStepDTO`, `WorkflowStepForm` | `workflowStepService.ts` (Step 1.2), `WorkflowDetailsPage.tsx` (Step 1.1) |

#### Edge Cases

1. **`types/employee.ts` defines `EmployeeForm` with field `userName` (camelCase with capital N).** The backend `EmployeeController` may expect a different casing. This discrepancy is pre-existing and irrelevant — the type is deleted along with the service that used it.
2. **The `types/` directory WILL be empty after this step** — the directory currently contains exactly these 4 files and nothing else. The empty directory itself remains on disk; Vite and TypeScript ignore empty directories, so no further action is needed. <!-- REVIEW-FIX: Previous version was self-contradictory ("will not be empty" then "may remain empty"); corrected to "will be empty" since the types/ dir has exactly these 4 files. -->

---

### Step 1.4: Mark Parent Feature Document Phases Complete <!-- REVIEW-FIX: Added explicit closing step to follow project task-document conventions. -->

**Goal:** Record that Phase 1 of the parent feature is complete.
**Dependencies:** Steps 1.1, 1.2, and 1.3 must all be done.

- [x] Open `documentation/Features/to-do/Frontend-Login-Shell-and-Dashboard-Baseline.md`
- [x] Mark `Step 1.1` checkbox `[x]` in the Implementation Steps section
- [x] Mark `Step 1.2` checkbox `[x]` in the Implementation Steps section
- [x] Mark `Step 1.3` checkbox `[x]` in the Implementation Steps section
- [x] Update the Task 1 entry in the parent document's Task Breakdown section with the wiki link to this task document: `[[Tasks/current/Frontend-Login-Shell-and-Dashboard-Baseline-step-1-dead-code-removal]]`

**Why this step is critical:** Keeps the parent feature document as the single source of truth for progress. The Memory Bank's `context.md` and `progress.md` should also be updated at session end to reflect that Task 1 is complete.

---

## Design Decisions

**Decision 1:** Delete all 17 files in a single task rather than splitting across multiple tasks.
- **Why:** The parent document groups them as "all deletions — no logic to write, no imports to resolve, pure elimination. Low risk per file, can be batched." Each deletion is independent and reversible. Batching them avoids three separate commit points for changes that share the same reason to exist.
- **Alternatives considered:** Deleting pages in one task and services/types in a second. Rejected because splitting creates an intermediate state where pages are deleted but their service dependencies still exist — offering no benefit and requiring an extra round of review.

**Decision 2:** Accept that the codebase will not compile after Task 1.
- **Why:** The parent document is explicit about this staging. `App.tsx` and `DashboardPage.tsx` must remain unmodified in Task 1 so that Task 2 can rewrite them cleanly, informed by the full post-deletion state of the codebase. Attempting to fix those files within Task 1 would expand its scope and merge two separate concerns.
- **Alternatives considered:** Fixing the broken imports in Task 1 alongside the deletions. Rejected because that would require rewriting `App.tsx`, `DashboardPage.tsx`, `Sidebar.tsx`, and `Header.tsx` — which is the entire scope of Task 2.

**Decision 3:** Delete types AFTER pages and services.
- **Why:** Logical dependency order: types are consumed by services, services are consumed by pages. Deleting in this order means each deletion removes the consuming layer before the providing layer. In practice the order does not affect correctness (all are deleted in the same task), but it mirrors the natural dependency direction and makes the step progression easier to audit.
- **Alternatives considered:** Alphabetical order or random order. Rejected — dependency-layer order is more self-documenting and easier to verify manually.

**Decision 4:** Do NOT delete `project/srcs/frontend/src/routes/AdminRoute.tsx`.
- **Why:** The parent document explicitly keeps `AdminRoute.tsx` for future use as a route guard for admin-only pages. No router registration needed yet; TypeScript does not warn on unused files.
- **Alternatives considered:** Deleting it since it has no current callers. Rejected per parent document: the file is preserved as a starting point for future admin-guarded routes.

---

## Testing Considerations

### Automatic Validation

- [x] Run `find project/srcs/frontend/src/pages -name "AgentsPage.tsx" -o -name "AgentDetailsPage.tsx" -o -name "WorkflowsPage.tsx" -o -name "WorkflowDetailsPage.tsx" -o -name "EmployeesPage.tsx" -o -name "RegisterPage.tsx" | wc -l` — must output `0` (all 6 page files deleted).
- [x] Run `find project/srcs/frontend/src/services -name "agentService.ts" -o -name "employeeService.ts" -o -name "adminService.ts" -o -name "workflowService.ts" -o -name "workflowStepService.ts" -o -name "userSettingsService.ts" -o -name "userSourceService.ts" | wc -l` — must output `0` (all 7 service files deleted).
- [x] Run `find project/srcs/frontend/src/types -name "admin.ts" -o -name "employee.ts" -o -name "workflow.ts" -o -name "workflowStep.ts" | wc -l` — must output `0` (all 4 type files deleted).
- [x] Run `grep -rn "agentService\|employeeService\|adminService\|workflowService\|workflowStepService\|userSettingsService\|userSourceService\|types/admin\|types/employee\|types/workflow\|types/workflowStep" project/srcs/frontend/src --include="*.ts" --include="*.tsx"` — must return exactly **1 line**: `DashboardPage.tsx` (the `from "@/services/agentService"` line). `App.tsx` imports deleted page components (`AgentsPage`, `WorkflowsPage`, etc.), not service or type files, so it does not appear in this grep; its import breakage is documented and intentional. No other surviving file references the deleted service or type modules. <!-- REVIEW-FIX: Previous version incorrectly claimed two matches (DashboardPage + App.tsx); App.tsx only imports deleted PAGE files — these are not caught by a grep for service/type names, giving exactly 1 match. -->
- [x] Confirm that `project/srcs/frontend/src/services/api.ts`, `authService.ts`, `authHelpers.ts`, `project/srcs/frontend/src/routes/AdminRoute.tsx`, and `project/srcs/frontend/src/pages/LoginPage.tsx`, `HomePage.tsx` still exist on disk.

> **⚠️ Expected compiler failure:** Running `npm run typecheck` (or `tsc --noEmit`) from `project/srcs/frontend/` **will produce errors** after Task 1. `App.tsx` imports six deleted pages and `DashboardPage.tsx` imports the deleted `agentService.ts`. These errors are intentional and will be resolved by Task 2. Do not treat a failing typecheck as a Task 1 failure.

---

## Related Code Explanations

- `project/srcs/frontend/src/App.tsx:1-15` — imports all 6 deleted pages; will show TypeScript errors after this task; rewritten in Task 2, Step 3.1.
- `project/srcs/frontend/src/pages/DashboardPage.tsx:18-20` — imports `getMyAgents` and `getSubordinateAgents` from `agentService.ts`; will show a TypeScript error after this task; fully rewritten in Task 2, Step 2.1.
- `project/srcs/frontend/src/services/api.ts` — survived shared Axios instance; none of the deleted services should be confused with this file.
- `project/srcs/frontend/src/services/authHelpers.ts` — survived; provides `getUsername`, `isAdmin`, `isEmployee`, `clearAuth`; imported by `Sidebar.tsx` and `Header.tsx` (neither is deleted in this task).

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task
- [x] All 6 page files deleted (Step 1.1)
- [x] All 7 service files deleted (Step 1.2)
- [x] All 4 type files deleted (Step 1.3)
- [x] Grep for deleted service/type module names returns exactly 1 match (`DashboardPage.tsx`'s `agentService` import). `App.tsx` has broken page-component imports (a separate category not caught by the service/type grep) — its breakage is expected and covered by the typecheck warning below.
- [x] `api.ts`, `authService.ts`, `authHelpers.ts`, `AdminRoute.tsx`, `LoginPage.tsx`, `HomePage.tsx`, `ProtectedRoute.tsx` all still exist on disk
- [x] `tsc --noEmit` failure in `App.tsx` and `DashboardPage.tsx` accepted as expected and documented
- [x] Parent feature document Phase 1 steps 1.1, 1.2, 1.3 marked `[x]`
