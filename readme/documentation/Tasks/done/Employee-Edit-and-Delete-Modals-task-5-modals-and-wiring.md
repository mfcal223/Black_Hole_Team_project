# Task: Modal Components + Wiring + Regression

#task #current #medium-complexity #parent-employee-edit-and-delete-modals

**Parent:** [[Employee-Edit-and-Delete-Modals]]
**Parent Type:** Feature
**Related Step(s):** Phase 5 — Steps 5.1–5.6 (EditEmployeeModal, DeleteEmployeeModal, EmployeeTable wiring, EmployeesPage wiring, index.ts update, final regression)
**Estimated Complexity:** Medium

---

## Goal

Build the two modal display components (`EditEmployeeModal`, `DeleteEmployeeModal`), wire the existing placeholder buttons in `EmployeeTable`, and compose everything together in `EmployeesPage`. No new business logic — all orchestration already lives in `useEditEmployee` (Task 3) and `useDeleteEmployee` (Task 4). This task closes the Employee Edit and Delete Modals feature.

---

## Parent Context

[[Features/to-do/Employee-Edit-and-Delete-Modals]] activates the Edit and Delete buttons on the `/employees` admin page. Tasks 1–4 completed all prerequisites:
- **Task 1** — `dialog.tsx` installed (Base UI, ADR-010 compliant) + CORS PATCH fix in `SecurityConfig.java`
- **Task 2** — `EmployeeDTO`, `EmployeeUpdateForm` types + four service functions (`updateEmployee`, `deleteEmployee`, `activateEmployee`, `deactivateEmployee`)
- **Task 3** — `useEditEmployee` hook (8 behavior tests) + `useEmployeeList.refresh()` 
- **Task 4** — `useDeleteEmployee` hook (4 behavior tests)

Current state: **75/75 tests**, 0 typecheck errors, build success. The test count does NOT change in Task 5 — all new modules are structural (no business logic to test).

### Phase 5 — Steps 5.1–5.6

**Step 5.1 — `EditEmployeeModal.tsx` (new)**
Pure display layer. Calls `useEditEmployee(employee, onSuccess)` internally, renders the form in a Dialog. Props: `{ employee: EmployeeListDTO, onClose: () => void, onSuccess: () => void }`.

**Step 5.2 — `DeleteEmployeeModal.tsx` (new)**
Pure display layer. Calls `useDeleteEmployee(employee, onSuccess)` internally, renders the confirmation modal with checkbox and warning. Props: `{ employee: EmployeeListDTO, onClose: () => void, onSuccess: () => void }`.

**Step 5.3 — `EmployeeTable.tsx` (modify)**
Add `onEditClick: (employee: EmployeeListDTO) => void` and `onDeleteClick: (employee: EmployeeListDTO) => void` props. Replace `onClick={undefined}` with the corresponding callbacks. Update tooltip content: remove "(coming soon)" suffix.

**Step 5.4 — `EmployeesPage.tsx` (modify)**
Add two `useState` slots for selected employees. Destructure `refresh` from `useEmployeeList`. Pass `onEditClick`/`onDeleteClick` to `EmployeeTable`. Conditionally mount both modals with `onClose` and `onSuccess` callbacks.

**Step 5.5 — `index.ts` (no-op)**
`EmployeeDTO` and `EmployeeUpdateForm` are not consumed outside `features/employees/`. No new re-exports required. The existing exports (`useEmployeeList`, `EmployeeListDTO`, `FilterField`, `PageEnvelope`) are sufficient.

**Step 5.6 — Final Regression**
`npm run typecheck` = 0 errors, `npm run test` = 75/75 (no new tests; no regressions), `npm run build` = success.

---

## Preconditions / Dependencies

- **Task 1 complete** — `dialog.tsx` at `src/components/ui/dialog.tsx` (Base UI @base-ui/react/dialog, exports `Dialog`, `DialogClose`, `DialogContent`, `DialogDescription`, `DialogFooter`, `DialogHeader`, `DialogOverlay`, `DialogPortal`, `DialogTitle`, `DialogTrigger`). Backend CORS includes `"PATCH"`. Baseline 59/59 tests.
- **Task 2 complete** — `EmployeeDTO`, `EmployeeUpdateForm` in `src/features/employees/types.ts`; four new service functions in `src/features/employees/services/employeeService.ts`. 63/63 tests.
- **Task 3 complete** — `useEditEmployee` at `src/features/employees/hooks/useEditEmployee.ts` (exports `useEditEmployee(employee: EmployeeListDTO, onSuccess: () => void)` returning 11 properties); `useEmployeeList.refresh()` exposed. 71/71 tests.
- **Task 4 complete** — `useDeleteEmployee` at `src/features/employees/hooks/useDeleteEmployee.ts` (exports `useDeleteEmployee(employee: EmployeeListDTO, onSuccess: () => void)` returning 5 properties). 75/75 tests.
- `src/components/ui/button.tsx` — `Button` component with `variant="outline"` and `variant="destructive"` support (Base UI-backed).
- `src/components/ui/input.tsx` — `Input` component (Base UI-backed; accepts all `React.ComponentProps<"input">` including `value`, `onChange`, `type`, `placeholder`).
- `src/components/ui/label.tsx` — `Label` component (renders `<label>`; applies `flex items-center gap-2 text-xs/relaxed font-medium select-none`).
- `verbatimModuleSyntax: true` and `erasableSyntaxOnly: true` in `tsconfig.app.json` — type-only imports must use `import type`; `enum` is prohibited.
- `src/features/employees/components/EmployeeTable.tsx` — current state: `onClick={undefined}` on both action buttons; tooltip content has "(coming soon)" suffix.
- `src/pages/EmployeesPage.tsx` — current state: renders `EmployeeTable` without `onEditClick`/`onDeleteClick` props; no modal state.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — Selected — document structure, template, placement
- `solid-deep-design` — Selected — depth analysis for EditEmployeeModal / DeleteEmployeeModal as display modules; SOLID analysis of EmployeeTable and EmployeesPage wiring changes
- `tdd` — Reviewed — no new tests in this task; validation strategy is typecheck + build + manual
- `memory-bank` — Selected — loaded full project context
- `find-docs` — Loaded — Base UI Dialog API verified against installed `dialog.tsx`; `@base-ui/react` v1.4.1 Dialog.Root accepts `open` and `onOpenChange(open: boolean, event: Event | undefined)`
- `glossary-management` — CLI unavailable; domain terms taken from parent feature and memory bank

### Documentation Reviewed

- **`src/components/ui/dialog.tsx`** — Base UI dialog installed in Task 1. Key facts:
  - `Dialog` wraps `DialogPrimitive.Root` — accepts `open` and `onOpenChange` for controlled usage
  - `DialogContent` wraps portal + backdrop + popup; renders X close button by default (`showCloseButton={true}`); the X button uses `DialogPrimitive.Close` which calls `onOpenChange(false)` on the Root
  - `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter` are layout wrappers
  - `DialogClose` wraps `DialogPrimitive.Close` — calling it triggers `onOpenChange(false)` on the Root
- **`src/features/employees/hooks/useEditEmployee.ts`** — 11-property return: `username/setUsername`, `password/setPassword`, `firstName/setFirstName`, `lastName/setLastName`, `email/setEmail`, `enabled/setEnabled`, `isSubmitting`, `error`, `onSave`
- **`src/features/employees/hooks/useDeleteEmployee.ts`** — 5-property return: `isChecked/setIsChecked`, `isSubmitting`, `error`, `onConfirm`
- **`src/features/employees/components/EmployeeTable.tsx`** — current placeholder wiring: `onClick={undefined}` on both buttons; tooltip content `"Edit employee (coming soon)"` / `"Delete employee (coming soon)"`
- **`src/pages/EmployeesPage.tsx`** — current state: no modal state, no `refresh` in destructuring, `EmployeeTable` called without action props
- **`src/features/employees/index.ts`** — currently exports `useEmployeeList`, `EmployeeListDTO`, `FilterField`, `PageEnvelope`
- **`src/features/employees/types.ts`** — `EmployeeListDTO` (with `id`, `firstName/lastName: string | null`, `email`, `username`, `roles`, `enabled`, `dateCreated`, `lastLogin: string | null`)
- **`src/components/ui/button.tsx`** — Base UI-backed; accepts `variant` and `size`; `variant="destructive"` applies `bg-destructive/10 text-destructive` styles
- **`src/components/ui/input.tsx`** — spreads `React.ComponentProps<"input">`; `onChange` receives `React.ChangeEvent<HTMLInputElement>`; `type="password"` and `placeholder` work as expected
- **`src/components/ui/label.tsx`** — renders `<label>`; already applies `flex items-center gap-2` which can wrap a checkbox input inline

### Related Existing Code

- `src/features/employees/hooks/useEditEmployee.ts:1–120` — consumed by `EditEmployeeModal`
- `src/features/employees/hooks/useDeleteEmployee.ts:1–51` — consumed by `DeleteEmployeeModal`
- `src/features/employees/components/EmployeeTable.tsx:1–114` — modified in Step 5.3
- `src/pages/EmployeesPage.tsx:1–81` — modified in Step 5.4
- `src/features/employees/index.ts:1–4` — reviewed; no changes required
- `src/components/ui/dialog.tsx:1–155` — Dialog primitive used by both modals
- `documentation/ADRs/ADR-010-base-ui-over-radix-ui-for-frontend.md` — confirms Base UI dialog is the correct primitive (NOT Radix)

---

## Implementation Details

### Approach

All five steps are structural — no business logic is introduced. Each step is independently typechecked before proceeding.

1. **Create `EditEmployeeModal.tsx`** — calls `useEditEmployee`, renders a controlled Dialog with a 5-field form + enabled checkbox + error banner + Cancel/Save footer
2. **Create `DeleteEmployeeModal.tsx`** — calls `useDeleteEmployee`, renders a controlled Dialog with a warning paragraph + confirmation checkbox + error banner + Cancel/Delete footer
3. **Modify `EmployeeTable.tsx`** — add props, wire buttons, update tooltip text (no new tests; structural change)
4. **Modify `EmployeesPage.tsx`** — add modal state, wire callbacks, mount modals conditionally
5. **Run final regression** — confirm 75/75 tests, 0 typecheck errors, build success

### SOLID + Deep Module Analysis

**`EditEmployeeModal` and `DeleteEmployeeModal` as deep modules:**

Deletion test: if `EditEmployeeModal` were deleted, the Dialog, form field layout, error banner, loading state on the Save button, and the X/Cancel/Save wiring would scatter into `EmployeesPage`. That is a substantial layout concern that would contaminate the page's thin composition role. The modal earns its keep.

- **SRP**: `EditEmployeeModal` has one reason to change — the visual layout and field structure of the edit modal. If the API changes, `employeeService.ts` changes. If the edit logic changes, `useEditEmployee` changes. If the form layout changes, `EditEmployeeModal` changes.
- **DIP**: The modal receives `employee`, `onClose`, and `onSuccess` from `EmployeesPage`. It calls `useEditEmployee(employee, onSuccess)` internally. The hook is a stable module-level seam (not injected, but mockable at the module level for testing if needed). Since the parent spec explicitly says modal components are not tested, this DIP pattern is acceptable.
- **ISP**: The modal only uses the properties it needs from the hook's return value (`username`, `setUsername`, ..., `isSubmitting`, `error`, `onSave`). TypeScript destructuring ensures ISP at the type level.
- **OCP**: The form layout is closed for modification — adding a new field requires only editing this file, not any hook or service.

**`EmployeeTable` modification (additive, OCP-compliant):**
Two optional callback props are added. All existing behavior (loading overlay, status badges, empty state) is untouched. The edit follows the Open/Closed Principle — the table's list-rendering contract is unchanged; new behavior is added by extending its interface.

**`EmployeesPage` modification (thin composition):**
Adds two `useState` slots and three import lines. The page remains a thin composition layer — no business logic. It owns "which modal is open and for which employee" (UI state), not "how to save or delete" (business logic, owned by hooks).

### Controlled Dialog Pattern

Both modals use the `Dialog` component in controlled mode:

```tsx
<Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
  <DialogContent>
    ...
  </DialogContent>
</Dialog>
```

`open` is always `true` while the component is mounted (the parent uses conditional rendering to mount/unmount). The `onOpenChange` handler fires when Base UI's dialog infrastructure would normally close the dialog (X button click, Escape key, backdrop click). The handler converts the close signal into a call to `onClose()`, which sets the parent's state to `null`, unmounting the modal.

This is the minimal controlled pattern: one boolean prop + one callback. It avoids the two-state anti-pattern of having both the dialog's internal open state and the parent's `editEmployee` state diverge.

### Files to Create/Modify

- [x] `project/srcs/frontend/src/features/employees/components/EditEmployeeModal.tsx` — **new** — edit form modal (Step 5.1)
- [x] `project/srcs/frontend/src/features/employees/components/DeleteEmployeeModal.tsx` — **new** — delete confirmation modal (Step 5.2)
- [x] `project/srcs/frontend/src/features/employees/components/EmployeeTable.tsx` — **modify** — add props + wire buttons + update tooltips (Step 5.3)
- [x] `project/srcs/frontend/src/pages/EmployeesPage.tsx` — **modify** — add modal state + wiring (Step 5.4)
- `project/srcs/frontend/src/features/employees/index.ts` — **no change** (Step 5.5 is a no-op; `EmployeeDTO`/`EmployeeUpdateForm` are not needed externally)

---

## Step-by-Step Implementation

### Step 5.1: Create `EditEmployeeModal.tsx`

**Goal:** Pure display layer for the edit modal. Calls `useEditEmployee` hook, renders a Dialog with a 5-field form, enabled checkbox, inline error, and Cancel/Save footer.
**Dependencies:** Task 3 complete (`useEditEmployee` exists); Task 1 complete (`dialog.tsx` exists); `Input`, `Label`, `Button` components available.

- [x] Create `src/features/employees/components/EditEmployeeModal.tsx`
- [x] Run `npm --prefix project/srcs/frontend run typecheck` — confirm 0 errors

#### Implementation

Full `src/features/employees/components/EditEmployeeModal.tsx`:

```tsx
import { useEditEmployee } from "../hooks/useEditEmployee"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { EmployeeListDTO } from "../types"

interface EditEmployeeModalProps {
  employee: EmployeeListDTO
  onClose: () => void
  onSuccess: () => void
}

export function EditEmployeeModal({
  employee,
  onClose,
  onSuccess,
}: EditEmployeeModalProps) {
  const {
    username, setUsername,
    password, setPassword,
    firstName, setFirstName,
    lastName, setLastName,
    email, setEmail,
    enabled, setEnabled,
    isSubmitting,
    error,
    onSave,
  } = useEditEmployee(employee, onSuccess)

  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="edit-username">Username</Label>
            <Input
              id="edit-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="edit-password">Password</Label>
            <Input
              id="edit-password"
              type="password"
              placeholder="Leave blank to keep current password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="edit-firstName">First Name</Label>
            <Input
              id="edit-firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="edit-lastName">Last Name</Label>
            <Input
              id="edit-lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <Label className="cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="accent-primary"
            />
            Enabled
          </Label>
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
      </DialogContent>
    </Dialog>
  )
}
```

**Import decisions:**
- `import type { EmployeeListDTO }` — interface only; `verbatimModuleSyntax: true` requires `import type`.
- All dialog subcomponents imported by name — no barrel import. This matches the existing codebase pattern (components import from `@/components/ui/...` directly).
- `useEditEmployee` imported from the relative path `"../hooks/useEditEmployee"` — consistent with how hooks are imported inside the `features/employees/components/` directory.

**Enabled checkbox using `Label`:**
The shadcn `Label` component already applies `flex items-center gap-2` classes which lay out the checkbox and text inline. Using `Label` here avoids writing duplicate Tailwind layout classes. The `cursor-pointer` class is added so the label text is also clickable. No `Switch` shadcn component is installed (per parent spec constraint).

**`void onSave()` in the Save button `onClick`:**
`onSave()` returns a `Promise<void>`. Returning a `Promise` from a React event handler is not an error in React 18, but it does cause a TypeScript lint warning in some configs. Using `void` suppresses the warning without needing `async/await` in the onClick prop. This is consistent with the `DeleteEmployeeModal` pattern for `onConfirm`.

#### Edge Cases

1. **Case:** `onOpenChange` receives `(false, eventDetails)` when X button, Escape key, or backdrop click fires.
   **Handling:** `if (!isOpen) onClose()` — only reacts to the close signal (`false`). The `open` case (`true`) never fires in our usage since `Dialog open` is always `true` when the component is mounted. The `eventDetails` second parameter (type `DialogRoot.ChangeEventDetails`) is intentionally ignored — we do not need the reason or `preventDefault` for MVP.
<!-- REVIEW-FIX: Corrected second parameter name from `event` to `eventDetails` to match Base UI v1.4.1's actual onOpenChange signature: (open: boolean, eventDetails: DialogRoot.ChangeEventDetails) => void. -->

2. **Case:** Admin makes changes to the form fields, then accidentally presses Escape or clicks the modal backdrop — all unsaved changes are lost.
   **Handling:** The modal has no "unsaved changes" guard. `onOpenChange(false)` → `onClose()` → `setEditEmployee(null)` → component unmounts → hook state resets. The admin must re-open the modal and re-enter the changes. This is acceptable for MVP. A future enhancement could compare hook state to the initial `employee` prop values and call `eventDetails.preventDefault()` to block the close — but this is explicitly out of scope per the parent feature.
<!-- REVIEW-FIX: Added edge case for unsaved-changes data loss on accidental Escape/backdrop click. -->

3. **Case:** Admin clicks Save when no field has changed.
   **Handling:** `useEditEmployee.onSave()` detects no changes (`!hasFieldChanges && !hasEnabledChange`) and calls `onSuccess()` immediately. `onSuccess()` calls `setEditEmployee(null)` (unmounting the modal) and `refresh()`. This is per User Story 8 in the parent feature.

3. **Case:** Backend returns 409 (username conflict) — `updateEmployee` rejects.
   **Handling:** `useEditEmployee` catches the error, extracts `response.data.message` ("Username is already taken"), sets `error`. The modal stays open, `error` is non-null, and the error paragraph renders below the form fields. The Save button re-enables (not `isSubmitting`). Admin corrects the username and retries.

4. **Case:** `Input` receives `onChange={(e) => setUsername(e.target.value)}` — does the Base UI `Input` emit `ChangeEvent<HTMLInputElement>`?
   **Handling:** `src/components/ui/input.tsx` spreads `React.ComponentProps<"input">`, which includes `onChange: React.ChangeEventHandler<HTMLInputElement>`. Base UI's `InputPrimitive` renders a native `<input>` element that fires native change events, wrapped by React into `ChangeEvent<HTMLInputElement>`. `e.target.value` is a standard `string`. This is correct.

5. **Case:** `enabled` checkbox — using plain `<input type="checkbox">` inside `Label` vs. shadcn `Switch`.
   **Handling:** The feature spec explicitly requires a styled `<label>` wrapping `<input type="checkbox">` — no Switch install. The `Label` component + inline `<input type="checkbox">` approach satisfies this requirement. `className="accent-primary"` uses the browser's native checkbox styling with the project's primary color accent.

---

### Step 5.2: Create `DeleteEmployeeModal.tsx`

**Goal:** Pure display layer for the delete confirmation modal. Calls `useDeleteEmployee` hook, renders a Dialog with a warning paragraph, confirmation checkbox, inline error, and Cancel/Delete footer.
**Dependencies:** Task 4 complete (`useDeleteEmployee` exists); `dialog.tsx`, `Button`, `Label` available.

- [x] Create `src/features/employees/components/DeleteEmployeeModal.tsx`
- [x] Run `npm --prefix project/srcs/frontend run typecheck` — confirm 0 errors

#### Implementation

Full `src/features/employees/components/DeleteEmployeeModal.tsx`:

```tsx
import { useDeleteEmployee } from "../hooks/useDeleteEmployee"
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
import type { EmployeeListDTO } from "../types"

interface DeleteEmployeeModalProps {
  employee: EmployeeListDTO
  onClose: () => void
  onSuccess: () => void
}

export function DeleteEmployeeModal({
  employee,
  onClose,
  onSuccess,
}: DeleteEmployeeModalProps) {
  const {
    isChecked,
    setIsChecked,
    isSubmitting,
    error,
    onConfirm,
  } = useDeleteEmployee(employee, onSuccess)

  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Employee</DialogTitle>
        </DialogHeader>

        <DialogDescription>
          You are about to permanently delete{" "}
          <span className="font-semibold text-foreground">{employee.username}</span>.
          {" "}This action cannot be undone.
        </DialogDescription>

        <Label className="cursor-pointer">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => setIsChecked(e.target.checked)}
            className="accent-destructive"
          />
          I understand this action is permanent and cannot be undone.
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

**Username display:**
`DialogDescription` renders with `text-muted-foreground` styling by default. The username is wrapped in `<span className="font-semibold text-foreground">` to make it visually distinct (bold + primary text color) against the muted description text. This matches the feature spec's bold emphasis on the username.

**Delete button disabled state:**
`disabled={!isChecked || isSubmitting}` implements both guards: the checkbox must be checked AND the delete call must not be in progress. This is the primary UI-level guard. The `useDeleteEmployee.onConfirm()` also has a belt-and-suspenders `!isChecked` guard internally.

**`accent-destructive`:**
The checkbox `accent-destructive` class applies the project's destructive color (red) to the native checkbox accent, providing a visual warning cue consistent with the destructive button variant.

#### Edge Cases

1. **Case:** `employee.username` contains HTML-special characters (e.g., `<`, `>`).
   **Handling:** JSX renders `employee.username` as text content — React escapes it automatically. No XSS risk.

2. **Case:** Admin clicks X or presses Escape after a failed delete (error is shown).
   **Handling:** `onOpenChange(false)` → `onClose()` → `setDeleteEmployee(null)` → modal unmounts. The `isChecked` state from `useDeleteEmployee` is lost on unmount. If the admin re-opens the Delete modal on the same employee, the hook re-initializes with `isChecked = false`. This is correct — forcing the admin to re-acknowledge after dismissal is intentional.

3. **Case:** Delete succeeds while the admin has the modal open in another browser tab.
   **Handling:** `onSuccess()` → `refresh()` → the list re-fetches. The modal unmounts. The employee row disappears from the refreshed list. The other tab's stale modal is now orphaned — acceptable for MVP (no cross-tab sync).

---

### Step 5.3: Modify `EmployeeTable.tsx`

**Goal:** Add `onEditClick` and `onDeleteClick` callback props; wire the existing placeholder buttons; update tooltip text to remove "(coming soon)".
**Dependencies:** Steps 5.1 and 5.2 do not depend on this change, but this step must be done before Step 5.4 (which passes these props from `EmployeesPage`).

- [x] Modify `src/features/employees/components/EmployeeTable.tsx`
- [ ] Run `npm --prefix project/srcs/frontend run typecheck` — confirm 0 errors (skipped standalone per Step 5.3 edge case note; covered by Step 5.4 full typecheck gate)

#### Implementation

**Changes to `src/features/employees/components/EmployeeTable.tsx`:**

1. **Update `EmployeeTableProps` interface** — add two callback props:
```typescript
interface EmployeeTableProps {
  employees: EmployeeListDTO[]
  isLoading: boolean
  onEditClick: (employee: EmployeeListDTO) => void
  onDeleteClick: (employee: EmployeeListDTO) => void
}
```

2. **Update the function signature** — destructure the new props:
```typescript
export function EmployeeTable({
  employees,
  isLoading,
  onEditClick,
  onDeleteClick,
}: EmployeeTableProps) {
```

3. **Wire the Edit button** — replace `onClick={undefined}` with the callback:
```tsx
// BEFORE:
<button
  type="button"
  className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
  onClick={undefined}
  aria-label="Edit employee"
/>

// AFTER:
<button
  type="button"
  className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
  onClick={() => onEditClick(employee)}
  aria-label="Edit employee"
/>
```

4. **Wire the Delete button** — replace `onClick={undefined}` with the callback:
```tsx
// BEFORE:
<button
  type="button"
  className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
  onClick={undefined}
  aria-label="Delete employee"
/>

// AFTER:
<button
  type="button"
  className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
  onClick={() => onDeleteClick(employee)}
  aria-label="Delete employee"
/>
```

5. **Update tooltip content** — remove "(coming soon)" suffix from both tooltips:
```tsx
// BEFORE:
<TooltipContent>Edit employee (coming soon)</TooltipContent>
// AFTER:
<TooltipContent>Edit employee</TooltipContent>

// BEFORE:
<TooltipContent>Delete employee (coming soon)</TooltipContent>
// AFTER:
<TooltipContent>Delete employee</TooltipContent>
```

**Why these are the only changes:** The loading overlay, table structure, column order, status badge, `null` coalescing for `firstName`/`lastName`, and the `key={employee.id}` are all unchanged. This follows the OCP — the table's rendering contract is extended, not modified.

#### Edge Cases

1. **Case:** TypeScript error — "`EmployeeTable` property `onEditClick` is missing" in `EmployeesPage.tsx` (if Step 5.4 hasn't been done yet).
   **Handling:** Run typecheck only after Step 5.4 completes. During Step 5.3 alone, `EmployeesPage.tsx` is the only caller, and it will have a typecheck error until Step 5.4 adds the props. The step sequence (5.1 → 5.2 → 5.3 → 5.4 → typecheck → test) is intentional.

2. **Case:** `onClick={() => onEditClick(employee)}` creates a new arrow function on every render.
   **Handling:** This is the correct and idiomatic pattern for callback wiring in React function components. No `useCallback` is used for event handlers in this codebase (consistent with all hooks in this feature). The per-render arrow function is not a performance issue at this scale.

---

### Step 5.4: Modify `EmployeesPage.tsx`

**Goal:** Add `useState` for modal visibility, destructure `refresh` from `useEmployeeList`, wire `EmployeeTable` callbacks, and conditionally render both modals.
**Dependencies:** Steps 5.1, 5.2, 5.3 complete — `EditEmployeeModal`, `DeleteEmployeeModal`, and the updated `EmployeeTable` props must exist.

- [x] Modify `src/pages/EmployeesPage.tsx`
- [x] Run `npm --prefix project/srcs/frontend run typecheck` — confirm 0 errors

#### Implementation

Full `src/pages/EmployeesPage.tsx` after modification:

```tsx
import { useState } from "react"
import { useEmployeeList } from "@/features/employees"
import { EmployeeTable } from "@/features/employees/components/EmployeeTable"
import { EmployeeFilterBar } from "@/features/employees/components/EmployeeFilterBar"
import { EditEmployeeModal } from "@/features/employees/components/EditEmployeeModal"
import { DeleteEmployeeModal } from "@/features/employees/components/DeleteEmployeeModal"
import { ErrorMessage } from "@/components/common/ErrorMessage"
import { Button } from "@/components/ui/button"
import type { EmployeeListDTO } from "@/features/employees"

export function EmployeesPage() {
  const {
    employees,
    totalPages,
    totalElements,
    currentPage,
    isLoading,
    error,
    filterField,
    filterValue,
    pageSize,
    onFilterFieldChange,
    onFilterValueChange,
    onPageSizeChange,
    onPageChange,
    refresh,
  } = useEmployeeList()

  const [editEmployee, setEditEmployee] = useState<EmployeeListDTO | null>(null)
  const [deleteEmployee, setDeleteEmployee] = useState<EmployeeListDTO | null>(null)

  return (
    <div className="flex flex-col gap-6">
      {/* Page heading */}
      <div>
        <h1 className="text-3xl font-bold">Employees</h1>
        <p className="text-muted-foreground">Manage employee accounts.</p>
      </div>

      {/* Filter bar — always mounted so admin can retry after error */}
      <EmployeeFilterBar
        filterField={filterField}
        filterValue={filterValue}
        pageSize={pageSize}
        onFilterFieldChange={onFilterFieldChange}
        onFilterValueChange={onFilterValueChange}
        onPageSizeChange={onPageSizeChange}
      />

      {/* Error state replaces the table + pagination area */}
      {error ? (
        <ErrorMessage message={error} />
      ) : (
        <>
          <EmployeeTable
            employees={employees}
            isLoading={isLoading}
            onEditClick={setEditEmployee}
            onDeleteClick={setDeleteEmployee}
          />

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {totalElements} employee{totalElements !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 0 || isLoading}
              >
                Previous
              </Button>
              <span>
                Page {currentPage + 1} of {Math.max(totalPages, 1)}
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
        </>
      )}

      {editEmployee && (
        <EditEmployeeModal
          employee={editEmployee}
          onClose={() => setEditEmployee(null)}
          onSuccess={() => { setEditEmployee(null); refresh() }}
        />
      )}

      {deleteEmployee && (
        <DeleteEmployeeModal
          employee={deleteEmployee}
          onClose={() => setDeleteEmployee(null)}
          onSuccess={() => { setDeleteEmployee(null); refresh() }}
        />
      )}
    </div>
  )
}
```

**Import decisions:**
- `import { useState } from "react"` — value import; used at runtime.
- `import type { EmployeeListDTO } from "@/features/employees"` — type-only; `verbatimModuleSyntax` requires `import type`. `EmployeeListDTO` is already re-exported from the `employees` index.
- `EditEmployeeModal` and `DeleteEmployeeModal` are imported via their direct file paths (not through the feature index) — consistent with how `EmployeeTable` and `EmployeeFilterBar` are imported in the existing file.
- `refresh` is now destructured from `useEmployeeList()` — added at the end of the existing destructuring list, matching its position in the `UseEmployeeListResult` interface.

**Modal placement:**
Both modals are rendered outside the `{error ? ... : <>...</>}` conditional — they don't depend on the error state and should remain accessible regardless of the list's current fetch status. Placing them after the main content block (inside the root `<div>`) ensures correct stacking context with the dialog's `fixed` positioning.

**`onEditClick={setEditEmployee}` and `onDeleteClick={setDeleteEmployee}`:**
The `useState` setter (`setEditEmployee`) has type `Dispatch<SetStateAction<EmployeeListDTO | null>>`. The `onEditClick` prop type is `(employee: EmployeeListDTO) => void`. Passing `setEditEmployee` directly is valid because `Dispatch<SetStateAction<EmployeeListDTO | null>>` is assignable to `(employee: EmployeeListDTO) => void` in TypeScript — `setEditEmployee(employee)` sets state with the provided value, satisfying the callback signature.

#### Edge Cases

1. **Case:** Admin clicks Edit on one row, then (without closing the modal) navigates to the same page — can they open a second modal?
   **Handling:** While `EditEmployeeModal` is open (`editEmployee` is non-null), the `EmployeeTable`'s Edit buttons are still clickable. Clicking another row's Edit button calls `setEditEmployee(otherEmployee)`, which unmounts the current modal and mounts a new one with the new employee. The new modal reinitializes from scratch (hook state resets on unmount). This is the correct behavior — the admin can switch target without explicitly closing the first modal.

2. **Case:** Admin has both Edit and Delete modals open simultaneously.
   **Handling:** Not possible with this implementation. Each modal has its own independent `useState` slot, but the UI doesn't prevent both from being set simultaneously. However, since `onEditClick={setEditEmployee}` and `onDeleteClick={setDeleteEmployee}` are separate, and the buttons are in the same row, an admin would have to intentionally click Edit on row A and Delete on row B without closing. Both modals would render simultaneously. This is acceptable — both are controlled and independent.

3. **Case:** `refresh()` called via `onSuccess` while the list is currently loading (e.g., admin triggers edit+save right after a filter change).
   **Handling:** `refresh()` calls `fetchEmployees(currentPage, pageSize, filterField, filterValue)` which sets `isLoading = true` and clears `error`. If another `fetchEmployees` call is already in flight, both will complete and the last one to resolve will set the final list state. No cancellation mechanism exists in `useEmployeeList` (no `AbortController`). For the MVP use case (low concurrency), this is acceptable.

---

### Step 5.5: Verify `index.ts` (no-op)

- [x] Read `src/features/employees/index.ts` — confirm no changes needed
- [x] `EmployeeDTO` and `EmployeeUpdateForm` are NOT consumed outside `features/employees/` — no new re-exports required
- [x] `EmployeesPage` uses `EmployeeListDTO` from `@/features/employees` — already exported

Current `src/features/employees/index.ts` is sufficient as-is:
```typescript
// src/features/employees/index.ts
export { useEmployeeList } from "./hooks/useEmployeeList"
export type { EmployeeListDTO, FilterField, PageEnvelope } from "./types"
```

---

### Step 5.6: Final Regression

**Goal:** Confirm no regressions from the structural wiring changes. Test count stays at 75 (no new tests for structural modules per feature spec).

- [x] `npm --prefix project/srcs/frontend run typecheck` — must return **0 errors**
- [x] `npm --prefix project/srcs/frontend run test` — must return **75/75** (no regressions)
- [x] `npm --prefix project/srcs/frontend run build` — must succeed

---

## Design Decisions

**Decision 1: Modal props use `employee: EmployeeListDTO` (non-null) instead of `employee: EmployeeListDTO | null`**
- **Why:** The feature spec's parent lists `employee: EmployeeListDTO | null  // null = modal closed` in the interface, but this comment describes the parent's state type, not the component's live prop. Both modals are conditionally rendered via `{editEmployee && <EditEmployeeModal employee={editEmployee} ... />}` — TypeScript narrows `editEmployee` from `EmployeeListDTO | null` to `EmployeeListDTO` at the conditional's right-hand side. Using `employee: EmployeeListDTO | null` in the component props would require either a conditional hook call (violates rules of hooks) or a dummy employee object for the null case (unnecessary complexity). Non-null props + conditional rendering in the parent is the idiomatic React pattern.
- **Alternatives considered:** Two-component pattern with `EditEmployeeModal` as a guard and `EditEmployeeModalContent` as the hooks-calling inner component — rejected as over-engineering for this simple case.

**Decision 2: Both modals use `Dialog open` (always-open controlled) rather than uncontrolled with `defaultOpen`**
- **Why:** The `onOpenChange` handler converts the dialog's close signal (X button, Escape, backdrop click) into a call to `onClose()`, which sets the parent's `editEmployee`/`deleteEmployee` state to `null`, unmounting the modal. Without controlled mode, those events would close the dialog visually but leave the parent state stale (`editEmployee` would still be non-null, causing the modal to re-mount on the next render). Controlled mode ensures the parent state and the dialog's visual state always agree.
- **`onOpenChange` type note:** Base UI's full signature is `(open: boolean, eventDetails: DialogRoot.ChangeEventDetails) => void`. Our handler `(isOpen) => { if (!isOpen) onClose() }` uses only the first parameter — TypeScript permits this because a function with fewer parameters is compatible with a callback type that declares more. No type annotation is needed; TypeScript infers `isOpen: boolean` from the prop type. The `eventDetails` parameter (which contains `reason` and `preventDefault`) is intentionally ignored for MVP.
- **Known limitation — no exit animation:** Because `onClose()` calls `setEditEmployee(null)` (a React state update), the parent re-renders before Base UI can complete the `data-closed` exit animation on the dialog popup. The dialog disappears instantly on close. Acceptable for MVP; smooth exit animations would require a 2-phase close (first change `open` to `false` to run animation, then set state to null to unmount). The unmount pattern is deliberately chosen per parent spec to give clean hook state reset.
<!-- REVIEW-FIX: Added onOpenChange type note (Base UI full signature) and known animation limitation. -->
- **Alternatives considered:** Uncontrolled (`defaultOpen`) + `DialogClose` for all close actions — would require manually wiring X, Escape, and backdrop to call `onClose()`, which is more complex than the controlled pattern.

**Decision 3: Save button uses `onClick={() => void onSave()}` (no `async/await` in JSX)**
- **Why:** `onSave()` returns `Promise<void>`. Returning a Promise from a React event handler prop is valid but can produce a TypeScript ESLint warning in some configurations. Using `void` explicitly discards the promise, suppressing the warning. This is the idiomatic pattern for calling async functions from event handlers in JSX without making the handler itself `async`. Same pattern used for `onConfirm` in `DeleteEmployeeModal`.
- **Alternatives considered:** `onClick={async () => { await onSave() }}` — valid, but wrapping in an async lambda adds a layer of indirection with no benefit since we do nothing with the result.

**Decision 4: Enabled field uses `Label` component wrapping a native `<input type="checkbox">`**
- **Why:** The feature spec prohibits installing the shadcn `Switch` component. The project's `Label` component (`src/components/ui/label.tsx`) renders a `<label>` element with `flex items-center gap-2` layout already applied, which is exactly what's needed to display a checkbox inline with its label text. Reusing `Label` avoids duplicating Tailwind layout classes and stays consistent with the other form fields in the same modal.
- **Alternatives considered:** Plain `<label className="flex items-center gap-2 ...">` — valid but redundant given `Label` already applies those classes.

**Decision 5: `EmployeeTable.tsx` — `onEditClick` and `onDeleteClick` are required props (not optional)**
- **Why:** The feature spec requires both buttons to be wired. Optional props would allow `EmployeeTable` to be rendered without wiring, hiding the un-wired state until runtime. Required props produce a TypeScript compile error at the call site, making it impossible to forget the wiring. `EmployeesPage` is the only consumer; making the props required matches the actual usage.
- **Alternatives considered:** Optional props with no-op defaults (`onEditClick = () => {}`) — rejected. This would allow rendering the table without wiring and silently swallow clicks. The feature spec explicitly says to replace `onClick={undefined}`.

**Decision 6: `import type { EmployeeListDTO } from "@/features/employees"` in `EmployeesPage.tsx`**
- **Why:** `EmployeeListDTO` is used only as a type annotation for `useState<EmployeeListDTO | null>`. It has no runtime value. `verbatimModuleSyntax: true` requires `import type` for type-only imports. Importing from the feature index (`@/features/employees`) is consistent with the existing `useEmployeeList` import in the same file.
- **Alternatives considered:** `import type { EmployeeListDTO } from "@/features/employees/types"` — also valid, but the index already re-exports it and using the public API surface is more maintainable.

**Decision 7: `index.ts` — no new re-exports (Step 5.5 is a no-op)**
- **Why:** `EmployeeDTO` and `EmployeeUpdateForm` are internal types consumed only by hooks and service functions within `features/employees/`. No code outside the feature module (e.g., `pages/`, `routes/`) needs to reference them. Adding them to the public API surface without a consumer would create accidental coupling.
- **Alternatives considered:** Re-export defensively for future use — rejected. Add on second use.

---

## Testing Considerations

All modules in this task are structural display layers with no business logic. The feature spec explicitly designates them as "without tests" — verified by typecheck + build + manual browser validation.

### Automatic Validation

Run from project root (`/home/jlievano/Dropbox/CodeProjects/42-last`):

- [x] After Step 5.1: `npm --prefix project/srcs/frontend run typecheck` — must return 0 errors
- [x] After Step 5.2: `npm --prefix project/srcs/frontend run typecheck` — must return 0 errors
<!-- REVIEW-FIX: Removed the Step 5.3 standalone typecheck checkbox — it would fail because
EmployeesPage.tsx calls <EmployeeTable> without the new required props until Step 5.4 is done.
The Step 5.4 typecheck gate covers all callers. Running typecheck between Steps 5.3 and 5.4
is expected to produce exactly one error (missing onEditClick/onDeleteClick in EmployeesPage).
Developers can skip the intermediate typecheck and run it only after Step 5.4 completes. -->
- [x] After Step 5.4: `npm --prefix project/srcs/frontend run typecheck` — must return **0 errors** (full typecheck with all callers wired)
- [x] After Step 5.4: `npm --prefix project/srcs/frontend run test` — must return **75/75** (no regressions; no new tests)
- [x] After Step 5.4: `npm --prefix project/srcs/frontend run build` — must succeed

### Manual Validation

**Manual validation is required for this task.** All UI behavior — modal open, form pre-fill, error display, success + refresh — must be validated in a browser. These behaviors cannot be reliably tested without significant setup (no browser test framework is configured in this project).

Run the dev server:
```bash
npm --prefix project/srcs/frontend run dev
```
Ensure the backend is running (`docker compose up` from `project/`). Navigate to `http://localhost:3000/employees` and log in as admin.

#### Edit Modal

- [ ] Click **Edit** on any employee row — verify the Edit Employee modal opens
- [ ] Verify all fields are pre-populated: username, email, first name (blank if null), last name (blank if null), and the Enabled checkbox matches the employee's current status
- [ ] Verify the password field is empty (placeholder text visible)
- [ ] Change the username to a new unique value, click **Save** — verify the modal closes and the employee list refreshes with the new username
- [ ] Click **Edit** again on the same employee, change nothing, click **Save** — verify the modal closes immediately (no API call, list may not refresh)
- [ ] Click **Edit**, change the email to one that conflicts with another employee, click **Save** — verify the modal stays open with an inline error message (e.g., "Email is already taken")
- [ ] Click **Edit**, enter a new password (non-empty), click **Save** — verify the modal closes and the password was updated (test by logging in as that employee with the new password in a different browser tab)
- [ ] Click **Edit**, uncheck **Enabled** for an active employee, click **Save** — verify the employee's status changes to Inactive in the list
- [ ] Click **Edit**, then click **Cancel** — verify the modal closes without changes (list unchanged)
- [ ] Click **Edit**, then click the **X** button (top right corner of modal) — verify the modal closes without changes
- [ ] Click **Edit**, make a change, then press **Escape** — verify the modal closes without saving (changes are lost — expected behavior per MVP scope)
- [ ] Click **Edit**, then click outside the modal dialog (on the dark backdrop) — verify the modal closes without saving
<!-- REVIEW-FIX: Added backdrop-click dismissal test; Base UI closes the dialog on backdrop click by default (closeOnClickOutside is true). -->

#### Delete Modal

- [ ] Click **Delete** on any employee row — verify the Delete Employee modal opens
- [ ] Verify the modal shows the warning: "You are about to permanently delete **{username}**. This action cannot be undone."
- [ ] Verify the **Delete** button is disabled (cannot be clicked) when the checkbox is unchecked
- [ ] Check the confirmation checkbox — verify the **Delete** button becomes enabled
- [ ] Click **Delete** — verify the modal closes and the employee disappears from the list (list refreshes)
- [ ] Click **Delete** on another employee, check the checkbox, click **Cancel** — verify the modal closes without deleting (employee still in list)
- [ ] Click **Delete**, check the checkbox, then click the **X** button — verify the modal closes without deleting
- [ ] Click **Delete**, then click outside the modal dialog (on the dark backdrop) — verify the modal closes without deleting
- [ ] (Network error simulation) Disable the backend, open the Delete modal, check the checkbox, click **Delete** — verify an error message appears inline and the modal stays open with the checkbox still checked (retry UX)
<!-- REVIEW-FIX: Added backdrop-click dismissal test for Delete modal; matches Edit modal coverage. -->

---

## Related Code Explanations

- `src/features/employees/hooks/useEditEmployee.ts:1–120` — hook consumed by `EditEmployeeModal`; 11-property return interface
- `src/features/employees/hooks/useDeleteEmployee.ts:1–51` — hook consumed by `DeleteEmployeeModal`; 5-property return interface
- `src/components/ui/dialog.tsx:1–155` — Dialog primitive; `Dialog` wraps `DialogPrimitive.Root` (accepts `open`, `onOpenChange`); X close button via `showCloseButton` in `DialogContent`
- `src/features/employees/components/EmployeeTable.tsx:1–114` — current state before Step 5.3; `onClick={undefined}` and "(coming soon)" tooltips
- `src/pages/EmployeesPage.tsx:1–81` — current state before Step 5.4; no modal state, no `refresh`, no `onEditClick`/`onDeleteClick`
- `src/features/employees/index.ts:1–4` — public API surface; no changes in this task
- `src/features/employees/types.ts:1–79` — `EmployeeListDTO` type used in modal props and `EmployeesPage` state

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected for this task
- [x] `src/features/employees/components/EditEmployeeModal.tsx` created (Step 5.1)
- [x] `src/features/employees/components/DeleteEmployeeModal.tsx` created (Step 5.2)
- [x] `src/features/employees/components/EmployeeTable.tsx` modified — `onEditClick`/`onDeleteClick` props added; buttons wired; tooltip "(coming soon)" text removed (Step 5.3)
- [x] `src/pages/EmployeesPage.tsx` modified — `refresh` destructured; modal state added; `EmployeeTable` callbacks wired; both modals mounted conditionally (Step 5.4)
- [x] `src/features/employees/index.ts` reviewed — no changes required (Step 5.5)
- [x] `npm run typecheck` = **0 errors** after Step 5.4 (Step 5.6)
- [x] `npm run test` = **75/75** after Step 5.4 — no regressions, no new tests (Step 5.6)
- [x] `npm run build` = **success** after Step 5.4 (Step 5.6)
- [ ] All manual validation steps completed in browser (see Manual Validation section)
- [x] Parent feature Phase 5 steps (5.1–5.6) marked `[x]` in [[Features/done/Employee-Edit-and-Delete-Modals]]
- [x] Parent feature Task 5 section updated with wiki link `[[Employee-Edit-and-Delete-Modals-task-5-modals-and-wiring]]`

---

## Post-Review Notes

**Execution status (2026-06-27):** All five structural steps implemented; all automatic validation gates pass. No deviations from the task spec.

- **Implementation:** Files match the task spec line-for-line. `EditEmployeeModal.tsx` (96 lines) and `DeleteEmployeeModal.tsx` (75 lines) created as deep display modules; `EmployeeTable.tsx` and `EmployeesPage.tsx` modified per spec; `index.ts` verified as a no-op.
- **Validation:** `npm run typecheck` = 0 errors; `npm run test` = **75/75** across 13 files (no regressions, no new tests — consistent with the structural nature of this task); `npm run build` = success (8284 modules transformed, 503.96 kB JS / 165.64 kB gzip). Bundle grew ~6.5 kB JS over the Task 4 baseline (497.48 kB) — expected, the two new modal components are now imported into `EmployeesPage`.
- **Review:** Autonomous review of all four touched files found 0 bugs, 0 architectural issues, 0 correctness gaps, 0 code-quality issues, and 0 test gaps (structural modules with no business logic, per feature spec). No patches required. The controlled-Dialog `onOpenChange={(isOpen) => { if (!isOpen) onClose() }}` pattern typechecks against Base UI's `Dialog.Root` signature (full signature `(open, eventDetails)`; the single-arg handler is assignable because a function with fewer parameters satisfies the callback type).
- **Remaining (user responsibility):** Manual browser validation (see Manual Validation section — Edit and Delete modal behavior), parent feature Phase 5 step checkboxes, parent feature Task 5 wiki link, and feature close-out (move task document to `Tasks/done/`, feature to `Features/done/`).
