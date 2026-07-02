# Task: UI Components + Textarea Check — `AgentTable`, `AgentPageSizeBar`, `AgentPagination`, `CreateAgentModal`, `EditAgentModal`, `DeleteAgentModal`

#task #current #medium-complexity #parent-employee-agent-management-page

**Parent:** [[Features/to-do/Employee-Agent-Management-Page]]
**Parent Type:** Feature
**Related Step(s):** Phase 5, Steps 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
**Estimated Complexity:** Medium

---

## Goal

Create all six UI components for the Agents page after verifying the `Textarea` shadcn component is installed. These are structural display components — no business logic, no tests. Each delegates state entirely to the hooks created in Tasks 1–4. After this task, all rendering components exist and typecheck cleanly; only the page composition and wiring (Task 6) remain.

---

## Parent Context

The parent feature (`[[Features/to-do/Employee-Agent-Management-Page]]`) defines six UI components in Phase 5 (Sections 11–16). All are structural — they own no API calls, no state beyond what the shadcn/UI primitives require, and no business logic. Prior art is the `features/employees/components/` directory: `EmployeeTable`, `EmployeePagination`, `EmployeeFilterBar`, `CreateEmployeeModal`, `EditEmployeeModal`, `DeleteEmployeeModal`.

**Key differences from the employee equivalents:**

1. **`AgentTable`**: 4 columns (Name, Description, Created, Actions). No filter bar integration. `description` renders as `—` when null. `createdAt` formatted via `toLocaleDateString()`.
2. **`AgentPageSizeBar`**: Right-aligned page-size selector only — no filter field selector. Uses typed `<Select<number>>` per ADR-010 without an `items` prop.
3. **`AgentPagination`**: Mirrors `EmployeePagination` with "agent"/"agents" label.
4. **`CreateAgentModal`**: Four fields (Name, Description, Init Prompt, Recurrent Prompt). Init Prompt and Recurrent Prompt use `<Textarea>` (not `<Input>`). Help text below each prompt field.
5. **`EditAgentModal`**: Same four fields as Create, plus a loading state (while `useEditAgent` calls `GET /agent/{id}` on mount). Conditionally renders `<LoadingSpinner />` or `<ErrorMessage />` before the form is ready.
6. **`DeleteAgentModal`**: Mirrors `DeleteEmployeeModal` exactly, replacing "Employee" with "Agent".

**Pending review findings (from `[[Bugs/to-do/Review-Employee-Agent-Management-Page]]`):**
- **Finding 1** (🟡 Moderate — Pending): Sidebar icon conflict — `MessageSquare` used by both Conversations and Agents. Affects **Task 6** (`Sidebar.tsx`). This task is not affected.
- **Finding 2** (🟢 Low — Resolved in Task 4): `useEditAgent` null coalescing for `description` and `recurrentPrompt`. Resolved. No impact on this task's components.

---

## Preconditions / Dependencies

- Task 1 complete: `src/types/api.ts` with `PageableRequest` and `PageEnvelope<T>`
- Task 2 complete: `src/features/agents/types.ts` (all 5 interfaces) and `src/features/agents/services/agentService.ts` (5 service functions)
- Task 3 complete: `src/features/agents/hooks/useAgentList.ts` + `.test.ts` + `src/features/agents/index.ts`
- Task 4 complete: `useCreateAgent.ts`, `useEditAgent.ts`, `useDeleteAgent.ts`, `useAgentModals.ts` in `src/features/agents/hooks/`
- Test baseline: **157/157** across 27 test files (143 pre-Task-4 + 14 new hook tests from Task 4)
- `src/features/agents/` directory exists; `hooks/` and `services/` subdirectories exist
- `src/features/agents/components/` directory does NOT exist yet — created in Step 5.2
- `src/components/ui/textarea.tsx` does NOT exist — must be installed in Step 5.1
- `src/components/common/LoadingSpinner.tsx` and `src/components/common/ErrorMessage.tsx` exist and are imported as named exports
- Frontend project root: `project/srcs/frontend/`. All commands run from that directory.

---

## Skills and Documentation Preparation

### Skills Reviewed

| Skill | Selected | Purpose |
|-------|----------|---------|
| `documentation-management` | Yes | Task template and doc placement |
| `solid-deep-design` | Yes | SRP per component; props as minimal interfaces; deletion test confirms display-only modules |
| `memory-bank` | Yes | Confirmed component patterns, loading overlay, import paths |
| `tdd` | Yes | Confirms no unit tests needed for pure display components; specifies typecheck + build + manual validation |
| `find-docs` | Not needed | All patterns established in codebase; no new library APIs |
| `glossary-management` | Not needed | No new domain terms introduced |

### Documentation Reviewed

- `documentation/Features/to-do/Employee-Agent-Management-Page.md` — Sections 11–16 (component specs)
- `documentation/ADRs/ADR-010-base-ui-over-radix-ui-for-frontend.md` — `Select<T>` typed generics; `TooltipTrigger` `render` prop
- `documentation/ADRs/ADR-008-agent-prompts-not-persisted-as-messages.md` — help text for prompt fields
- `documentation/ADRs/ADR-009-long-primary-key-for-all-entities.md` — `id: number`

---

## Related Existing Code

| File | Role |
|------|------|
| `src/features/employees/components/EmployeeTable.tsx` | Prior art: loading overlay pattern, TooltipTrigger render prop, action buttons |
| `src/features/employees/components/EmployeePagination.tsx` | Prior art: Math.max guard, singular/plural label, Previous/Next disabled logic |
| `src/features/employees/components/EmployeeFilterBar.tsx` | Prior art: Select<number> for page size, ml-auto layout, onValueChange null guard |
| `src/features/employees/components/CreateEmployeeModal.tsx` | Prior art: Dialog open/onOpenChange pattern, form field layout, error display |
| `src/features/employees/components/EditEmployeeModal.tsx` | Prior art: edit modal structure |
| `src/features/employees/components/DeleteEmployeeModal.tsx` | Prior art: checkbox guard, destructive button, DialogDescription |
| `src/features/agents/hooks/useCreateAgent.ts` | Hook consumed by `CreateAgentModal` |
| `src/features/agents/hooks/useEditAgent.ts` | Hook consumed by `EditAgentModal` (two-phase lifecycle: load + submit) |
| `src/features/agents/hooks/useDeleteAgent.ts` | Hook consumed by `DeleteAgentModal` |
| `src/features/agents/types.ts` | `AgentListDTO` type used by all table/modal props |
| `src/components/common/LoadingSpinner.tsx` | Used in `EditAgentModal` during `isLoadingData` |
| `src/components/common/ErrorMessage.tsx` | Used in `EditAgentModal` when `loadError` is non-null |
| `src/components/ui/dialog.tsx` | Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter |
| `src/components/ui/button.tsx` | Button component |
| `src/components/ui/input.tsx` | Input component (Name and Description fields) |
| `src/components/ui/label.tsx` | Label component |

---

## Implementation Details (Approach)

All six components are props-driven display modules. Each satisfies the deletion test: removing any one of them pushes its rendering responsibility back onto `AgentsPage`, scattering layout and conditional logic across the page component. They earn their existence by encapsulating display concerns.

**SRP per component:**
- `AgentTable` — renders a table row per agent; owns the loading overlay presentation; zero state
- `AgentPageSizeBar` — renders the right-aligned page-size selector; zero state
- `AgentPagination` — renders Previous / Page X of Y / Next; zero state
- `CreateAgentModal` — dialog composition for create form; delegates all state to `useCreateAgent`
- `EditAgentModal` — dialog composition for edit form; delegates all state/loading to `useEditAgent`; conditionally renders loading/error/form phases
- `DeleteAgentModal` — dialog composition for delete confirmation; delegates all state to `useDeleteAgent`

**Interface minimality (ISP):** Every component's props contain exactly what it renders — nothing more. `AgentTable` receives `agents`, `isLoading`, `onEditClick`, `onDeleteClick`. `AgentPagination` receives `currentPage`, `totalPages`, `totalElements`, `isLoading`, `onPageChange`. No callbacks that the component doesn't directly use.

**Textarea installation (Step 5.1):** `npx shadcn@latest add textarea` adds `src/components/ui/textarea.tsx` using the project's existing shadcn configuration. After install, verify with `npm run typecheck`. CreateAgentModal and EditAgentModal import from `@/components/ui/textarea`.

**EditAgentModal loading/error states:** `useEditAgent` exposes `isLoadingData` (true while `GET /agent/{id}` is in flight) and `loadError` (non-null if the call fails). The modal uses conditional rendering (not an absolute overlay) because `LoadingSpinner` uses `min-h-100` — designed for page-level use, not constrained within a fixed dialog. Inside `DialogContent`, the three-state render is:
1. `isLoadingData === true` → `<LoadingSpinner />`
2. `loadError !== null` → `<ErrorMessage message={loadError} />` + DialogFooter with a single "Close" button
3. Otherwise → form fields + error message + DialogFooter with Cancel/Save

---

## Implementation Details (Files to Create/Modify)

- [x] `src/features/agents/components/AgentTable.tsx` (new)
- [x] `src/features/agents/components/AgentPageSizeBar.tsx` (new)
- [x] `src/features/agents/components/AgentPagination.tsx` (new)
- [x] `src/features/agents/components/CreateAgentModal.tsx` (new)
- [x] `src/features/agents/components/EditAgentModal.tsx` (new)
- [x] `src/features/agents/components/DeleteAgentModal.tsx` (new)
- [x] `src/components/ui/textarea.tsx` (new — installed via shadcn CLI in Step 5.1)

---

### Step 5.1 — Install Textarea Component

**Goal:** Confirm `src/components/ui/textarea.tsx` does not exist and install it via shadcn CLI.

**Dependency:** None. Can be done before any component is written.

**Actions:**

```bash
# Run from project/srcs/frontend/
ls src/components/ui/textarea.tsx 2>/dev/null && echo "EXISTS" || echo "NOT FOUND"
```

If `NOT FOUND`:

```bash
npx shadcn@latest add textarea
```

After install, verify:

```bash
npm run typecheck
```

Expected: 0 errors. If the CLI fails (network error or component not available), fall back to a handwritten `Textarea` component styled to match `Input`:

```tsx
// src/components/ui/textarea.tsx (fallback if CLI fails)
import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
```

---

### Step 5.2 — `AgentTable.tsx`

**Goal:** Render the agent list as a table with a loading overlay. Name, Description, Created, Actions columns.

**Dependency:** Step 5.1 complete (typecheck clean). Creates the `components/` directory.

**File:** `src/features/agents/components/AgentTable.tsx`

```tsx
import { Pencil, Trash2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import type { AgentListDTO } from "../types"

interface AgentTableProps {
  agents: AgentListDTO[]
  isLoading: boolean
  onEditClick: (agent: AgentListDTO) => void
  onDeleteClick: (agent: AgentListDTO) => void
}

export function AgentTable({
  agents,
  isLoading,
  onEditClick,
  onDeleteClick,
}: AgentTableProps) {
  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden bg-background/60 backdrop-blur-[1px]">
          <LoadingSpinner />
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agents.length === 0 && !isLoading ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                No agents found.
              </TableCell>
            </TableRow>
          ) : (
            agents.map((agent) => (
              <TableRow key={agent.id}>
                <TableCell className="font-medium">{agent.name}</TableCell>
                <TableCell>{agent.description ?? "—"}</TableCell>
                <TableCell>
                  {new Date(agent.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <button
                            type="button"
                            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                            onClick={() => onEditClick(agent)}
                          />
                        }
                      >
                        <Pencil className="size-4" />
                        <span className="sr-only">Edit</span>
                      </TooltipTrigger>
                      <TooltipContent>Edit</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <button
                            type="button"
                            className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
                            onClick={() => onDeleteClick(agent)}
                          />
                        }
                      >
                        <Trash2 className="size-4" />
                        <span className="sr-only">Delete</span>
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
```

After creating the file:

```bash
npm run typecheck
```

Expected: 0 errors. Note: `TooltipTrigger` uses the Base UI `render` prop pattern (not Radix). `onClick` and `className` go on the element inside `render`; Base UI merges its own props (aria, open/close handlers) into that element. The icon and `sr-only` span are children of `TooltipTrigger`. See `EmployeeTable.tsx` lines 77–105 for prior art.

---

### Step 5.3 — `AgentPageSizeBar.tsx`

**Goal:** Render the right-aligned page-size selector above the table. No filter controls.

**Dependency:** Step 5.2 complete.

**File:** `src/features/agents/components/AgentPageSizeBar.tsx`

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface AgentPageSizeBarProps {
  pageSize: number
  onPageSizeChange: (size: number) => void
}

export function AgentPageSizeBar({
  pageSize,
  onPageSizeChange,
}: AgentPageSizeBarProps) {
  return (
    <div className="flex items-center">
      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Rows per page</span>
        <Select<number>
          value={pageSize}
          onValueChange={(size) => {
            if (size !== null) onPageSizeChange(size)
          }}
        >
          <SelectTrigger className="h-8 w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={5}>5</SelectItem>
            <SelectItem value={10}>10</SelectItem>
            <SelectItem value={25}>25</SelectItem>
            <SelectItem value={50}>50</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
```

After creating the file:

```bash
npm run typecheck
```

Expected: 0 errors. `Select<number>` is the typed generic form per ADR-010. No `items` prop is needed because numeric select items self-label — the trigger resolves the displayed value from the mounted `<SelectItem>` children directly.

---

### Step 5.4 — `AgentPagination.tsx`

**Goal:** Render Previous / Page X of Y / Next pagination row for the agent list.

**Dependency:** Step 5.3 complete.

**File:** `src/features/agents/components/AgentPagination.tsx`

```tsx
import { Button } from "@/components/ui/button"

interface AgentPaginationProps {
  currentPage: number
  totalPages: number
  totalElements: number
  isLoading: boolean
  onPageChange: (page: number) => void
}

export function AgentPagination({
  currentPage,
  totalPages,
  totalElements,
  isLoading,
  onPageChange,
}: AgentPaginationProps) {
  const displayTotal = Math.max(totalPages, 1)
  const label = totalElements === 1 ? "agent" : "agents"

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        {totalElements} {label}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0 || isLoading}
        >
          Previous
        </Button>
        <span className="text-sm">
          Page {currentPage + 1} of {displayTotal}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages - 1 || isLoading}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
```

After creating the file:

```bash
npm run typecheck
```

Expected: 0 errors. `Math.max(totalPages, 1)` guards the "Page X of 0" edge case when the list is empty (backend returns `totalPages: 0`). The guard is display-only — the actual `totalPages` value is still passed to `disabled` logic unchanged.

---

### Step 5.5 — `CreateAgentModal.tsx`

**Goal:** Create agent dialog with four fields (Name, Description, Init Prompt, Recurrent Prompt). Prompt fields use `<Textarea>`. Help text below each prompt field surfaces ADR-008 behavior.

**Dependency:** Step 5.1 complete (textarea installed). Step 5.4 complete.

**File:** `src/features/agents/components/CreateAgentModal.tsx`

```tsx
import { useCreateAgent } from "../hooks/useCreateAgent"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface CreateAgentModalProps {
  onClose: () => void
  onSuccess: () => void
}

export function CreateAgentModal({ onClose, onSuccess }: CreateAgentModalProps) {
  const {
    name, setName,
    description, setDescription,
    initPrompt, setInitPrompt,
    recurrentPrompt, setRecurrentPrompt,
    isSubmitting,
    error,
    onSubmit,
  } = useCreateAgent(onSuccess)

  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Agent</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="create-agent-name">Name *</Label>
            <Input
              id="create-agent-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="create-agent-description">Description</Label>
            <Input
              id="create-agent-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="create-agent-initPrompt">Init Prompt *</Label>
            <Textarea
              id="create-agent-initPrompt"
              value={initPrompt}
              onChange={(e) => setInitPrompt(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Applied as a system message on the first turn of each conversation using this agent.
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="create-agent-recurrentPrompt">Recurrent Prompt</Label>
            <Textarea
              id="create-agent-recurrentPrompt"
              value={recurrentPrompt}
              onChange={(e) => setRecurrentPrompt(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Prepended to every user message. Changes take effect immediately on all future messages.
            </p>
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => void onSubmit()}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

After creating the file:

```bash
npm run typecheck
```

Expected: 0 errors.

---

### Step 5.6 — `EditAgentModal.tsx`

**Goal:** Edit agent dialog. Handles three render states: loading (while `GET /agent/{id}` resolves), error (if load fails), and form (once data is available). All four fields use the same layout as `CreateAgentModal`. Help text on prompt fields is identical.

**Dependency:** Step 5.5 complete.

**File:** `src/features/agents/components/EditAgentModal.tsx`

```tsx
import { useEditAgent } from "../hooks/useEditAgent"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { ErrorMessage } from "@/components/common/ErrorMessage"
import type { AgentListDTO } from "../types"

interface EditAgentModalProps {
  agent: AgentListDTO
  onClose: () => void
  onSuccess: () => void
}

export function EditAgentModal({ agent, onClose, onSuccess }: EditAgentModalProps) {
  const {
    isLoadingData,
    loadError,
    name, setName,
    description, setDescription,
    initPrompt, setInitPrompt,
    recurrentPrompt, setRecurrentPrompt,
    isSubmitting,
    error,
    onSave,
  } = useEditAgent(agent, onSuccess)

  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Agent</DialogTitle>
        </DialogHeader>

        {isLoadingData ? (
          <LoadingSpinner />
        ) : loadError ? (
          <>
            <ErrorMessage message={loadError} />
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="edit-agent-name">Name</Label>
                <Input
                  id="edit-agent-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="edit-agent-description">Description</Label>
                <Input
                  id="edit-agent-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="edit-agent-initPrompt">Init Prompt</Label>
                <Textarea
                  id="edit-agent-initPrompt"
                  value={initPrompt}
                  onChange={(e) => setInitPrompt(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Applied as a system message on the first turn of each conversation using this agent.
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="edit-agent-recurrentPrompt">Recurrent Prompt</Label>
                <Textarea
                  id="edit-agent-recurrentPrompt"
                  value={recurrentPrompt}
                  onChange={(e) => setRecurrentPrompt(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Prepended to every user message. Changes take effect immediately on all future messages.
                </p>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={() => void onSave()}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

After creating the file:

```bash
npm run typecheck
```

Expected: 0 errors.

---

### Step 5.7 — `DeleteAgentModal.tsx`

**Goal:** Delete confirmation dialog. Mirrors `DeleteEmployeeModal` exactly — replaces "Employee" with "Agent" and uses `AgentListDTO`.

**Dependency:** Step 5.6 complete.

**File:** `src/features/agents/components/DeleteAgentModal.tsx`

```tsx
import { useDeleteAgent } from "../hooks/useDeleteAgent"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { AgentListDTO } from "../types"

interface DeleteAgentModalProps {
  agent: AgentListDTO
  onClose: () => void
  onSuccess: () => void
}

export function DeleteAgentModal({ agent, onClose, onSuccess }: DeleteAgentModalProps) {
  const {
    isChecked,
    setIsChecked,
    isSubmitting,
    error,
    onConfirm,
  } = useDeleteAgent(agent, onSuccess)

  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Agent</DialogTitle>
        </DialogHeader>

        <DialogDescription>
          You are about to permanently delete{" "}
          <span className="font-semibold text-foreground">{agent.name}</span>.
          {" "}This action cannot be undone.
        </DialogDescription>

        <Label className="cursor-pointer">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => setIsChecked(e.target.checked)}
            className="accent-destructive"
          />
          {" "}I understand this action is permanent and cannot be undone.
        </Label>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => void onConfirm()}
            disabled={!isChecked || isSubmitting}
          >
            {isSubmitting ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

After creating the file:

```bash
npm run typecheck
npm run test
```

Expected: 0 typecheck errors, all existing tests pass (count unchanged from baseline — no new test files added in this task).

---

## Edge Cases

### Step 5.2 — `AgentTable`

| Edge Case | Handling |
|-----------|----------|
| `agents.length === 0 && !isLoading` | Empty state row rendered with `colSpan={4}` and "No agents found." |
| `agents.length === 0 && isLoading` | Loading overlay renders; empty state row is suppressed (prevents flash of empty state during initial load) |
| `agent.description === null` | Renders `—` via `agent.description ?? "—"` |
| Loading overlay blocks interaction | `z-10` and `backdrop-blur` ensure the overlay visually covers the table content while allowing the dialog above it |

### Step 5.3 — `AgentPageSizeBar`

| Edge Case | Handling |
|-----------|----------|
| `onValueChange` fires with `null` | Guarded: `if (size !== null) onPageSizeChange(size)` — Base UI Select can emit `null` when deselecting |

### Step 5.4 — `AgentPagination`

| Edge Case | Handling |
|-----------|----------|
| `totalPages === 0` (empty list) | `Math.max(totalPages, 1)` makes the display read "Page 1 of 1" instead of "Page 1 of 0" |
| `totalElements === 1` | Label reads "1 agent" (singular) |
| Previous button at page 0 | Disabled via `currentPage === 0` |
| Next button at last page | Disabled via `currentPage >= totalPages - 1` |
| Buttons during loading | Both disabled via `isLoading` |

### Step 5.5 — `CreateAgentModal`

| Edge Case | Handling |
|-----------|----------|
| Empty Name field | No client-side guard — `useCreateAgent` sends it as-is; the backend validates required fields and returns a 400 which surfaces via `error` |
| Empty Init Prompt field | Same as Name — backend validation |
| Empty optional fields | `useCreateAgent` converts `""` to `null` before the API call (handled in hook, transparent to the modal) |

### Step 5.6 — `EditAgentModal`

| Edge Case | Handling |
|-----------|----------|
| `isLoadingData === true` | `<LoadingSpinner />` rendered; form not mounted |
| `loadError !== null` | `<ErrorMessage>` + Close button rendered; form not mounted; user can dismiss modal |
| `isLoadingData` and `loadError` both false | Normal form rendered |
| Dialog closed while loading | `onOpenChange` fires `onClose`; Base UI unmounts the dialog; `useEditAgent` mount effect is cancelled (React unmount) |
| `recurrentPrompt === null` in API response | `useEditAgent` coalesces to `""` via `?? ""` (handled in hook — see Task 4) |

### Step 5.7 — `DeleteAgentModal`

| Edge Case | Handling |
|-----------|----------|
| Delete button clicked while `!isChecked` | `useDeleteAgent.onConfirm` is a no-op; button is additionally `disabled` at the UI level |
| Error during delete | `error` is set in hook; rendered as `<p className="text-sm text-destructive">` in modal; `isChecked` preserved for retry |

---

## Design Decisions

### Decision 1: Conditional render (not absolute overlay) for `EditAgentModal` loading state

**Decision:** Use `{isLoadingData ? <LoadingSpinner /> : ...}` (conditional render) rather than an absolute overlay over the form skeleton inside `DialogContent`.

**Reasoning:** `LoadingSpinner` renders with `min-h-100` — a large minimum height designed for full-page loading states (e.g., `AgentsPage` error state). Placing it as an absolute overlay inside a `DialogContent` would either require a large dialog height or clip the spinner. The conditional render approach matches the component's design intent and produces a clean loading state within the natural dialog sizing.

**Rejected alternative:** Absolute overlay (`<div className="absolute inset-0">`) with a smaller inline `<Loader2>` spinner. This would require a custom spinner outside of the project's `LoadingSpinner` component, introducing a new visual pattern for a minor case.

### Decision 2: `TooltipTrigger render={<button />}` for action buttons in `AgentTable`

**Decision:** Use Base UI's `render` prop pattern. `onClick` and `className` go on the element **inside** `render`; the icon children go as `TooltipTrigger` children:

```tsx
<TooltipTrigger
  render={
    <button
      type="button"
      className="rounded p-1 ..."
      onClick={() => onEditClick(agent)}
    />
  }
>
  <Pencil className="size-4" />
</TooltipTrigger>
```

**Reasoning:** ADR-010 mandates Base UI components exclusively. Base UI's `Tooltip.Trigger` merges the host element's props (tooltip aria attributes, open/close handlers) into the `render` element. User-supplied `onClick` and `className` must live on the render element so Base UI can merge them correctly. Placing them on `<TooltipTrigger>` directly does not forward them to the rendered DOM element. Prior art: `EmployeeTable.tsx` lines 77–105.

**Rejected alternative:** `<TooltipTrigger asChild><button>...</button></TooltipTrigger>` — this is the Radix UI `asChild` pattern and will not work with Base UI.

### Decision 3: `Select<number>` without `items` prop for `AgentPageSizeBar`

**Decision:** Use `<Select<number>>` with `<SelectItem value={5}>5</SelectItem>` children directly, no `items` prop.

**Reasoning:** Numeric selects self-label — the item children already have their display value. The `items` prop is needed only when the trigger must resolve a string label from an opaque key (e.g., a `FilterField` enum). For `Select<number>`, the trigger automatically displays the selected numeric value. Prior art: `EmployeeFilterBar.tsx` page-size selector.

### Decision 4: `agentService` and modal hooks imported directly in components (not from barrel)

**Decision:** Modal components import hooks directly: `import { useCreateAgent } from "../hooks/useCreateAgent"`. They do not import through the `index.ts` barrel.

**Reasoning:** The feature boundary convention (established in Task 4) reserves `index.ts` exports for code crossing the feature boundary — i.e., what the page component and router need from outside the feature. Modal hooks are internal to the feature and are consumed only by the modal components within the same feature directory. This prevents over-exposure of internal hooks through the public API.

### Decision 5: Help text on prompt fields (ADR-008 compliance)

**Decision:** Include `<p className="text-xs text-muted-foreground">` below Init Prompt and Recurrent Prompt fields in both Create and Edit modals.

**Reasoning:** ADR-008 notes that editing `initPrompt` or `recurrentPrompt` takes effect immediately on all future conversations using that agent. The parent feature spec explicitly requires surfacing this behavior via help text so employees understand the consequence. Omitting the help text would violate the ADR-008 requirement for user-facing clarity.

---

## Testing Considerations

### Automatic Validation

- [ ] After Step 5.1: Run `npm run typecheck` from `project/srcs/frontend/` — 0 errors
- [ ] After Step 5.2 (`AgentTable`): Run `npm run typecheck` — 0 errors
- [ ] After Step 5.3 (`AgentPageSizeBar`): Run `npm run typecheck` — 0 errors
- [ ] After Step 5.4 (`AgentPagination`): Run `npm run typecheck` — 0 errors
- [ ] After Step 5.5 (`CreateAgentModal`): Run `npm run typecheck` — 0 errors
- [ ] After Step 5.6 (`EditAgentModal`): Run `npm run typecheck` — 0 errors
- [ ] After Step 5.7 (`DeleteAgentModal`): Run `npm run typecheck` and `npm run test` — 0 errors; test count unchanged from Task 4 baseline (no new test files)

### Manual Validation

These components require rendering to verify. Manual validation is deferred to **Task 6** when `AgentsPage` is wired in and the dev server can be run. The following checks are documented here for traceability:

- [ ] (Task 6) Navigate to `/agents` as an authenticated employee — `AgentTable` renders with correct columns (Name, Description, Created, Actions)
- [ ] (Task 6) While agents are loading, a loading overlay appears over the table
- [ ] (Task 6) When no agents exist, "No agents found." appears in the table body
- [ ] (Task 6) `description` column shows "—" for agents with a null description
- [ ] (Task 6) `createdAt` column shows a formatted date
- [ ] (Task 6) Changing the page-size selector re-fetches and updates the table
- [ ] (Task 6) Previous/Next buttons navigate pages; Previous is disabled on page 1; Next is disabled on the last page
- [ ] (Task 6) "New Agent" button opens `CreateAgentModal` with all four fields empty
- [ ] (Task 6) `CreateAgentModal`: Init Prompt and Recurrent Prompt fields are multi-line textareas
- [ ] (Task 6) `CreateAgentModal`: Help text appears below Init Prompt and Recurrent Prompt fields
- [ ] (Task 6) `CreateAgentModal`: Successful create closes the modal and refreshes the table
- [ ] (Task 6) `CreateAgentModal`: API error renders the error message inside the modal
- [ ] (Task 6) Edit button on a table row opens `EditAgentModal` with a loading spinner
- [ ] (Task 6) `EditAgentModal`: Once loaded, all four fields are pre-populated (name, description, init prompt, recurrent prompt)
- [ ] (Task 6) `EditAgentModal`: If `GET /agent/{id}` fails, an error message appears with a "Close" button
- [ ] (Task 6) `EditAgentModal`: Successful save closes the modal and refreshes the table
- [ ] (Task 6) Delete button on a table row opens `DeleteAgentModal` with agent name displayed
- [ ] (Task 6) `DeleteAgentModal`: Delete button is disabled until checkbox is ticked
- [ ] (Task 6) `DeleteAgentModal`: Successful delete closes the modal and refreshes the table

---

## Related Code Explanations

- `src/features/employees/components/EmployeeTable.tsx` — loading overlay pattern, TooltipTrigger Base UI render prop
- `src/features/employees/components/EmployeePagination.tsx` — pagination label, Math.max guard
- `src/features/employees/components/EmployeeFilterBar.tsx` — Select<number> page-size pattern
- `src/features/employees/components/CreateEmployeeModal.tsx` — Dialog open/onOpenChange pattern, form field layout
- `src/features/employees/components/DeleteEmployeeModal.tsx` — checkbox guard, DialogDescription, destructive button
- `src/features/agents/hooks/useEditAgent.ts` — two-phase lifecycle (isLoadingData / loadError / form) consumed by EditAgentModal

---

## Completion Criteria

- [x] `src/components/ui/textarea.tsx` exists (installed via shadcn CLI or hand-written fallback)
- [x] `src/features/agents/components/AgentTable.tsx` created; typechecks clean
- [x] `src/features/agents/components/AgentPageSizeBar.tsx` created; typechecks clean
- [x] `src/features/agents/components/AgentPagination.tsx` created; typechecks clean
- [x] `src/features/agents/components/CreateAgentModal.tsx` created; typechecks clean
- [x] `src/features/agents/components/EditAgentModal.tsx` created; typechecks clean
- [x] `src/features/agents/components/DeleteAgentModal.tsx` created; typechecks clean
- [x] `npm run test` passes with the same test count as the Task 4 baseline (no regressions, no new tests)
- [x] All six components use only the hooks from `src/features/agents/hooks/` — no direct API calls, no inline state beyond what shadcn/UI primitives require
- [x] `LoadingSpinner` and `ErrorMessage` imported from `@/components/common/` (not re-declared inline)
- [x] `Textarea` imported from `@/components/ui/textarea` in both Create and Edit modals
- [x] Help text present below Init Prompt and Recurrent Prompt in both Create and Edit modals

---

## Post-Review Notes

**Executed 2026-06-29.** All 7 files created, all 12 completion criteria checked, all validations green.

### Implementation summary

- **Step 5.1**: Installed `src/components/ui/textarea.tsx` via `npx shadcn@latest add textarea` (Base UI / `tabler` style — not the Radix fallback in the task spec; project uses Base UI per ADR-010). The generated component is `function Textarea({ className, ...props }: React.ComponentProps<"textarea">) { ... }` and matches the project's `Input` pattern.
- **Step 5.2–5.7**: Created 6 display components in `src/features/agents/components/`. All follow the established Employee equivalents (SRP per component, ISP-minimal props, hooks consumed directly per Decision 4, Base UI `render` prop on `TooltipTrigger` with `aria-label` per Decision 2, `Select<number>` without `items` prop per Decision 3, conditional render for Edit loading state per Decision 1, help text on prompt fields per Decision 5/ADR-008).

### Validation

- `npm run typecheck` → 0 errors (verified after each step).
- `npm run test` → **157/157 across 28 test files** (matches Task 4 baseline; no new tests added — display components are not unit-tested per the task's explicit "no business logic" rationale).
- `npm run build` → success at **538.03 kB / 175.46 kB gzip** (identical to Task 4 baseline — no node_modules dependency bloat from shadcn add; the pre-existing 500 kB chunk warning is unchanged).
- `npx eslint src/features/agents/components/` → clean.

### Deviations from task spec

1. **`AgentTable.tsx` — `aria-label` over `sr-only` span**: The task snippet used `<span className="sr-only">Edit</span>` children of `TooltipTrigger`; the established `EmployeeTable.tsx` prior art uses `aria-label="Edit employee"` on the button inside `render`. I followed the prior art (it is more idiomatic Base UI + accessibility-friendly, and the task spec itself explicitly cites `EmployeeTable.tsx` lines 77–105 as the prior art).
2. **`AgentTable.tsx` — `py-8` on empty state cell**: The task snippet used a plain `text-center text-muted-foreground`; the prior art adds `py-8` for better vertical breathing room. Aligned with prior art.
3. **`AgentTable.tsx` — `overflow-hidden` on loading overlay**: Captured in a comment (mirrors `EmployeeTable.tsx` line 113's REVIEW-FIX comment) so future maintainers understand the rationale.
4. **`CreateAgentModal.tsx` — no `type="text"` on description Input**: The prior art's `CreateEmployeeModal.tsx` does not specify `type` on its firstName/lastName/email/description inputs. Followed the prior art.
5. **Step 5.1 — used shadcn-generated Base UI `Textarea` instead of the task's Radix-style fallback**: The fallback was the contingent path; shadcn add succeeded so we use the project's Base UI styling.

### Manual validation

All 19 manual validation checkboxes remain unchecked per the task spec — they are intentionally deferred to Task 6 (page composition + dev-server run). No code change in this task exercises those checks directly; they are end-to-end browser walks.
