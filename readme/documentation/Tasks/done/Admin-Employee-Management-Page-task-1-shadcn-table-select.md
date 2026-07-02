# Task: Install shadcn/ui Table and Select Components

#task #current #low-complexity #parent-admin-employee-management-page

**Parent:** [[Admin-Employee-Management-Page]]
**Parent Type:** Feature
**Related Step(s):** Steps 1.1, 1.2, 1.2a
**Estimated Complexity:** Low

---

## Goal

Install the shadcn/ui `table` and `select` primitives via the CLI and verify that the generated `select.tsx` forwards Base UI's generic `Value` type parameter. These two components are required prerequisites for every UI file in Tasks 2–5.

---

## Parent Context

The Admin Employee Management Page feature introduces a paginated, filterable employee list for admin users. It is entirely frontend-additive: all changes live in `project/srcs/frontend/src/`, no backend files are touched, and the 47 existing tests must remain unaffected.

The feature's implementation is split into five tasks. **Task 1 is the setup task** — its only job is to install the two shadcn primitives that all later components depend on:

- `EmployeeTable` (Task 4) uses `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell`
- `EmployeeFilterBar` (Task 4) uses `Select` for the filter-field dropdown, the `enabled` boolean filter, and the page-size selector

The parent establishes a critical type-safety constraint around the `Select` component (the "typed `Value` design decision"). Because the project uses Base UI (`@base-ui/react`) as the headless primitive library (ADR-010), Base UI's `Select.Root` is **generic over `Value`** and `onValueChange` yields the typed `Value` placed on `<Select.Item value>` — not a coerced string as in Radix UI. The shadcn `select.tsx` wrapper must forward this generic so `EmployeeFilterBar` can declare `<SelectItem value={5}>` (number), `<SelectItem value={false}>` (boolean), and `<SelectItem value={null}>` (null) and have `onValueChange` yield the typed primitive directly. The parent explicitly requires verifying this in Step 1.2a before any downstream task proceeds.

If the installed `select.tsx` locks `Value` to `string` (dropping the Base UI generic), Task 4 must fall back to explicit coercion at each callback (`parseInt`, `=== "true"`, etc.) — which the parent considers a design regression but not a blocker.

### Scope boundary

All changes in Task 1 are limited to two new files under `src/components/ui/`:

- `src/components/ui/table.tsx` — created by `npx shadcn@latest add table`
- `src/components/ui/select.tsx` — created by `npx shadcn@latest add select`

No other files are created or modified. The 47 existing tests are unaffected because the new files export only unused components.

---

## Preconditions / Dependencies

- The React + Vite + TypeScript frontend project exists at `project/srcs/frontend/`.
- `components.json` is present with `"style": "base-mira"` and `"rsc": false` — confirmed. The `base-mira` style targets `@base-ui/react` primitives (ADR-010).
- `@base-ui/react ^1.4.1` is installed (package.json dependency).
- The existing `src/components/ui/` directory contains: `button.tsx`, `card.tsx`, `input.tsx`, `label.tsx`, `separator.tsx`, `sheet.tsx`, `sidebar.tsx`, `skeleton.tsx`, `tooltip.tsx`. Neither `table.tsx` nor `select.tsx` exists yet.
- Node.js and npm are available (`npm run typecheck`, `npm run test` work from the frontend directory).
- No prior tasks for this feature exist — this is Task 1, the first in the sequence.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — Selected — governs document structure and placement.
- `solid-deep-design` — Selected — guides assessment of depth vs. pass-through for UI primitives.
- `find-docs` — Selected — used to verify shadcn install commands and Base UI generic `Value` behavior.
- `tdd` — Not needed — no tests are written in this task; this task has no custom logic.
- `memory-bank` — Selected — provides project context (stack, ADR-010, frontend patterns).
- `glossary-management` — Selected — domain vocabulary loaded (Employee, Admin, etc.).

### Documentation Reviewed

- **Context7 `/shadcn-ui/ui`** — confirmed `npx shadcn@latest add table` and `npx shadcn@latest add select` as the correct CLI commands for v4 (base-mira style). The `style` field in `components.json` controls which primitive library backs the generated component.
- **Context7 `/mui/base-ui`** — confirmed Base UI `Select.Root` is generic over `Value` and `Multiple`. `onValueChange(value: Value)` yields the typed `Value` placed on `<Select.Item value>`, not a string. Verified via the `MySelect<Value, Multiple>` typed wrapper example and the `Controlled Select with value and onValueChange` example.
- **ADR-010** (`documentation/ADRs/ADR-010-base-ui-over-radix-ui-for-frontend.md`) — accepted. All new shadcn components must use `base-mira` style. Radix UI component packages are explicitly excluded. Base UI's API surface differs from Radix UI — always refer to Base UI docs.
- **`documentation/Docs/API-Reference/Employee.md`** — reviewed to understand the `EmployeeListDTO` and `POST /employee/list` endpoint that later tasks consume.
- **`documentation/Docs/API-Reference/_Shared-Schemas.md`** — reviewed `PageableRequest` format and the pagination envelope shape.

### Related Existing Code

- `src/components/ui/tooltip.tsx` — existing shadcn/base-ui primitive in the same directory; confirms the `base-mira` pattern (imports from `@base-ui/react/tooltip`); confirms `TooltipProvider` is exported but optional (standalone rendering works per ADR-010).
- `src/components/ui/input.tsx` — existing primitive showing the class/cn pattern used in shadcn wrappers.
- `src/features/authentication/` — prior art for the feature module pattern this task's downstream tasks will follow.
- `project/srcs/frontend/package.json` — confirms `@base-ui/react: ^1.4.1`, `shadcn: ^4.7.0`, `react: ^19.2.4`, `typescript: ~5.9.3`.
- `project/srcs/frontend/components.json` — confirmed `"style": "base-mira"`, `"iconLibrary": "tabler"`, `"tsx": true`.

---

## Implementation Details

### Approach

Both components are installed via the shadcn CLI using the project's existing `components.json` configuration. Because `components.json` already has `"style": "base-mira"` set, the CLI automatically generates Base UI–backed components — no flags needed. The commands are identical to those that installed `tooltip.tsx`, `sidebar.tsx`, etc.

The only non-mechanical step in this task is **Step 1.2a**: reading the generated `select.tsx` and verifying that the shadcn wrapper correctly forwards Base UI's generic `Value`. This is a design-gate check, not a code change — it determines whether Task 4 can use typed primitives or must fall back to string coercion.

**SOLID / Deep Module analysis:**

- `table.tsx` — A deep UI primitive: the interface (`Table`, `TableHeader`, `TableRow`, etc.) is a small vocabulary over HTML table semantics; the implementation hides Tailwind styling, accessibility attributes, and shadcn class composition. Callers (EmployeeTable) import the vocabulary, not the CSS. Deletion test: deleting would scatter Tailwind class management across EmployeeTable — it earns its keep.
- `select.tsx` — A deep UI primitive: the interface hides Base UI's `Select.Root`, `Select.Trigger`, `Select.Positioner`, `Select.Popup`, `Select.Item`, etc. behind a simpler name set. Deletion test: deleting would push Base UI API knowledge into every caller — it earns its keep. The generic `Value` forwarding is the seam that makes the interface typed rather than stringly-typed.

Neither component introduces business logic, state management, or network calls — their responsibilities are purely rendering and accessibility. No tests are needed for installed shadcn primitives (verified by typecheck + build + existing test suite green).

### Files to Create/Modify

- [x] `src/components/ui/table.tsx` — **new** — shadcn/ui table primitive; exports `Table`, `TableHeader`, `TableFooter`, `TableBody`, `TableHead`, `TableRow`, `TableCell`, `TableCaption`.
- [x] `src/components/ui/select.tsx` — **new** — shadcn/ui select primitive; exports `Select`, `SelectContent`, `SelectGroup`, `SelectItem`, `SelectLabel`, `SelectScrollDownButton`, `SelectScrollUpButton`, `SelectSeparator`, `SelectTrigger`, `SelectValue` (and possibly `SelectRoot`). The generic `Value` forwarding is verified in Step 1.2a.

---

## Step-by-Step Implementation

### Step 1.1: Install the Table Component

**Goal:** Create `src/components/ui/table.tsx` using the shadcn CLI.
**Dependencies:** None — this step has no prerequisites beyond the project existing.

<!-- REVIEW-FIX: Added --prefix reminder inline; prior sessions confirm npm run must use --prefix when not cd'd into frontend directory -->
- [x] Run `npx shadcn@latest add table --cwd project/srcs/frontend` (or `cd project/srcs/frontend` first, then `npx shadcn@latest add table`)
- [x] Confirm `src/components/ui/table.tsx` is created (check via `ls project/srcs/frontend/src/components/ui/`)
- [x] Run `npm --prefix project/srcs/frontend run typecheck` — confirm 0 errors
- [x] Run `npm --prefix project/srcs/frontend run test` — confirm 47/47 tests pass (new file adds no tests, must not break existing)

**Why this step is critical:**
`EmployeeTable.tsx` (Task 4 Step 4.1) directly depends on `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, and `TableCell` from this file. Without it, Task 4 cannot import these primitives and will fail to compile.

#### Implementation

<!-- REVIEW-FIX: Added --cwd alternative; prior sessions confirm that not being in the frontend directory is common. npx does not support --prefix; shadcn CLI supports --cwd for this. -->
```bash
# Option A — cd into the frontend directory first:
cd project/srcs/frontend
npx shadcn@latest add table

# Option B — use shadcn's --cwd flag to specify the directory (no cd needed):
npx shadcn@latest add table --cwd project/srcs/frontend
```

The CLI reads `components.json` (`style: "base-mira"`) in the target directory and generates the Base UI–backed table component. The generated file will be placed at `src/components/ui/table.tsx` automatically. If no `components.json` is found, the CLI will prompt to initialize — this means the wrong directory was used.

#### Edge Cases

1. **Case:** The CLI prompts for an overwrite confirmation because a `table.tsx` already exists.
   **Handling:** This should not happen (the file doesn't exist yet), but if it does, answer `yes` to overwrite — the file is auto-generated and safe to replace.

2. **Case:** The CLI installs unexpected additional dependencies.
   **Handling:** Check `package.json` diff. If `@radix-ui/react-*` (non-slot) packages were added, the wrong style was used — uninstall them and re-run with the `base-mira` style explicitly. (Current `components.json` should prevent this.)

3. **Case:** `npm run typecheck` reports errors in the newly generated `table.tsx`.
   **Handling:** The generated file may use newer Base UI APIs. Check the error — if it is a version mismatch, update the import path to match `@base-ui/react ^1.4.1`. If it is an unrelated shadcn generation issue, check the `components.json` style setting.

---

### Step 1.2: Install the Select Component

**Goal:** Create `src/components/ui/select.tsx` using the shadcn CLI.
**Dependencies:** None — independent of Step 1.1.

<!-- REVIEW-FIX: Added --prefix reminder inline for Step 1.2 as well -->
- [x] Run `npx shadcn@latest add select --cwd project/srcs/frontend` (or within the already-cd'd frontend directory: `npx shadcn@latest add select`)
- [x] Confirm `src/components/ui/select.tsx` is created
- [x] Run `npm --prefix project/srcs/frontend run typecheck` — confirm 0 errors
- [x] Run `npm --prefix project/srcs/frontend run test` — confirm 47/47 tests pass

**Why this step is critical:**
`EmployeeFilterBar.tsx` (Task 4 Step 4.2) uses `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` from this file for the filter-field dropdown, the `enabled` boolean filter, and the page-size selector. The typed `Value` forwarding (verified in Step 1.2a below) determines whether Task 4 can use domain-typed items or must fall back to string coercion.

#### Implementation

<!-- REVIEW-FIX: Added --cwd alternative for consistency with Step 1.1 patch -->
```bash
# Option A — cd into the frontend directory first (if not already there from Step 1.1):
npx shadcn@latest add select

# Option B — use shadcn's --cwd flag (if running from project root):
npx shadcn@latest add select --cwd project/srcs/frontend
```

#### Edge Cases

1. **Case:** The CLI adds `@radix-ui/react-select` (the Radix-based select) to `package.json`.
   **Handling:** This indicates the wrong style was used. Remove the package, verify `components.json` has `"style": "base-mira"`, and re-run. `base-mira` must generate a `@base-ui/react/select`-backed component.

2. **Case:** `npm run typecheck` fails on the generated `select.tsx`.
   **Handling:** Check if the error is a type mismatch with `@base-ui/react ^1.4.1`. The `base-mira` style targets a specific Base UI version — if the installed Base UI is newer/older than expected, types may drift. Read the error and adjust the import or the `@base-ui/react` version to match.

3. **Case:** The shadcn CLI skips install because it detects `select.tsx` already exists.
   **Handling:** This should not happen, but if it does, the CLI may prompt for confirmation. Confirm the overwrite.

---

### Step 1.2a: Verify the Select Component Forwards the Generic `Value` Type

**Goal:** Read the generated `select.tsx` and confirm that the `Select` (or `SelectRoot`) wrapper exposes a generic `Value` type parameter that it forwards to the underlying `@base-ui/react` `Select.Root`. This verification determines whether Task 4 can use typed `<SelectItem value>` with number, boolean, and `null` values.

**Dependencies:** Step 1.2 must be complete (the file must exist).

- [x] Open `src/components/ui/select.tsx` and read its full content
- [x] Locate the wrapper around `Select.Root` from `@base-ui/react/select`
- [x] Determine if the wrapper is generic over `Value` (look for `<Value>` or similar type parameter on the exported component or its props type)
- [x] Record the finding and act per the decision matrix below

#### Finding (Execution Result)

**Generic forwarded via direct re-export — typed `Value` is available. No fix required; no coercion needed in Task 4.**

The generated `src/components/ui/select.tsx` (line 7) is:

```typescript
const Select = SelectPrimitive.Root
```

This is the ideal case (Edge Case 1): `Select` is a direct re-export of `@base-ui/react/select`'s `Select.Root`, NOT a wrapper that could drop the generic. Base UI's `SelectRoot` is declared generic in `node_modules/@base-ui/react/esm/select/root/SelectRoot.d.ts`:

```typescript
export declare function SelectRoot<Value, Multiple extends boolean | undefined = false>(
  props: SelectRoot.Props<Value, Multiple>
): React.JSX.Element;
// ...
onValueChange?: ((
  value: SelectValueType<Value, Multiple> | (Multiple extends true ? never : null),
  eventDetails: SelectRootChangeEventDetails
) => void) | undefined;
```

`onValueChange` therefore yields the typed `Value` placed on `<Select.Item value>` — not a coerced string.

**Empirical proof:** a temporary harness was placed at `src/components/ui/_select-generic-verify.tsx` (deleted after verification — no test added to the suite) that exercised the three Task 4 value types through the generated `Select`/`SelectItem`:

```typescript
// page size — number
<Select<number> onValueChange={(val) => onPageSizeChange(val)}>
  <SelectItem value={5}>5</SelectItem>

// enabled filter — boolean | null (Inactive = false is the critical case)
<Select<boolean | null> onValueChange={(val) => onFilterValueChange(val)}>
  <SelectItem value={null}>All</SelectItem>
  <SelectItem value={true}>Active</SelectItem>
  <SelectItem value={false}>Inactive</SelectItem>
```

`npm run typecheck` (project, which uses the `@/` alias + `tsconfig.app.json` JSX settings) returned **0 errors** with this harness present, confirming `onValueChange`'s parameter infers to `number` and `boolean | null` respectively — including the critical `<SelectItem value={false}>` (Inactive) and `<SelectItem value={null}>` cases. The file was then deleted.

**Conclusion:** Task 4 (`EmployeeFilterBar`) may declare `<Select<number>>`, `<Select<boolean | null>>`, `<SelectItem value={5}>`, `<SelectItem value={false}>`, `<SelectItem value={null}>` and pass the yielded primitives straight to `useEmployeeList`'s callbacks with **no `parseInt`/`=== "true"`/`=== "null"` coercion**. The Finding-4 `filterValue !== null` guard in `useEmployeeList` then receives the boolean `false` directly (not the string `"false"`), so the backend `enabled` EQUALS predicate receives `false` — the regression guard Task 3 will assert. The design-gate is passed; the Finding-1 typed-`Value` decision holds.

**Why this step is critical:**
`EmployeeFilterBar` (Task 4) uses the Select component with three different value types:
- **Page size selector**: `<SelectItem value={5}>` → `onValueChange(size: number)` — no `parseInt` needed
- **`enabled` boolean filter (Active/Inactive/All)**: `<SelectItem value={false}>` → `onValueChange(val: boolean | null)` — critical for the Inactive predicate (see Finding-4 in parent: a falsy guard drops `false` and makes the backend return all employees instead of only inactive ones)
- **Filter field selector**: values are strings already, no coercion issue

If the generic is dropped (i.e., `onValueChange` is typed as `(value: string) => void`), each `SelectItem value` is forced to be a string, and callers must manually coerce on every callback.

**Why this matters beyond convenience:** The `enabled = false` (Inactive) case is where a dropped generic causes a logic bug, not just a type error. If `EmployeeFilterBar` receives `"false"` (string) instead of `false` (boolean) from `onValueChange` and passes it unchecked to `useEmployeeList`, the hook's `filterValue !== null` guard is satisfied — but the backend receives `{ "operator": "EQUALS", "value": "false" }` (a string, not a boolean). Whether the backend rejects or silently mismatches this depends on the backend's type coercion. Task 3's discriminating test (`enabled = false` emits exactly `{ "operator": "EQUALS", "value": false }`) is the regression guard; but the safest approach is to enforce the correct type at the source (the `SelectItem value`).

#### Implementation

```typescript
// What to look for in src/components/ui/select.tsx:

// GOOD — generic Value forwarded: (should work with typed <SelectItem value>)
function Select<Value>(props: Select.Root.Props<Value>) {
  return <SelectPrimitive.Root {...props} />
}
// OR:
const Select = SelectPrimitive.Root  // direct re-export of the generic

// BAD — generic dropped (locked to string):
function Select(props: { onValueChange?: (value: string) => void; ... }) {
  return <SelectPrimitive.Root {...props} />
}
```

**Decision matrix based on what you find:**

| Finding | Action |
|---------|--------|
| `Select.Root` is re-exported directly, or the wrapper preserves `<Value>` generic | Document "Generic forwarded — typed `Value` is available." Task 4 may use `<SelectItem value={5}>` etc. with no coercion. |
| Wrapper exists but drops `<Value>` generic (fixed string type) | **Option A (preferred):** Edit the generated `select.tsx` to restore generic forwarding — replace the fixed-string wrapper with a generic one matching the Base UI API. Run `npm run typecheck` to confirm. See concrete fix below. |
| Generic cannot be restored without significant wrapper rewrite | **Option B (fallback):** Keep the generated file as-is. Document the decision in this task's Design Decisions section. Task 4 must use explicit coercion: `parseInt(value)` for page size, `value === "true"` for enabled filter, and `onFilterValueChange(value === "null" ? null : value === "true")` for the enabled Select's onValueChange. |

<!-- REVIEW-FIX: Added concrete Option A fix code for generic Value restoration — prior text only described the action without showing how to apply it -->
**Option A concrete fix** — apply only if the decision matrix finds a locked-to-string wrapper:

```typescript
// In src/components/ui/select.tsx, find the wrapper around SelectPrimitive.Root.
// The generated wrapper may look like this (BAD — Value locked to string):
import { Select as SelectPrimitive } from "@base-ui/react/select"

function SelectRoot({ ...props }: SelectPrimitive.Root.Props<string>) {
  return <SelectPrimitive.Root {...props} />
}

// Change the function signature to forward the generic (GOOD):
function SelectRoot<Value>({ ...props }: SelectPrimitive.Root.Props<Value>) {
  return <SelectPrimitive.Root<Value> {...props} />
}

// If the wrapper is an arrow function, the same pattern applies:
// BAD:  const SelectRoot = (props: SelectPrimitive.Root.Props<string>) => ...
// GOOD: const SelectRoot = <Value,>(props: SelectPrimitive.Root.Props<Value>) => ...
//       (The trailing comma in <Value,> is required in .tsx files to disambiguate from JSX tags)
```

After applying the fix, run `npm run typecheck` to confirm 0 errors. The generic enables callers to write:
```typescript
// page-size selector  — number
<SelectRoot<number> onValueChange={(val) => onPageSizeChange(val as number)}>

// enabled filter — boolean | null
<SelectRoot<boolean | null> onValueChange={(val) => onFilterValueChange(val)}>
```

> **Note:** The exact generated code structure varies by shadcn version. Find the function or const that wraps `SelectPrimitive.Root` and apply the generic parameter there. All other sub-components (`SelectTrigger`, `SelectContent`, `SelectItem`, etc.) typically don't need generic forwarding — only `SelectRoot` is parameterized by `Value`.

#### Edge Cases

1. **Case:** The generated `select.tsx` uses a named export that directly re-exports `@base-ui/react`'s `Select.Root` without a wrapper.
   **Handling:** Base UI's `Select.Root` is already generic — this is the ideal case. Document "Generic forwarded via direct re-export."

2. **Case:** The `select.tsx` file uses a Radix-based implementation (if `base-mira` style was not in effect).
   **Handling:** This means Step 1.2 ran against the wrong style. Uninstall any Radix select packages, verify `components.json`, re-run `npx shadcn@latest add select`. Radix always yields string-typed `onValueChange` — do not proceed with a Radix select.

3. **Case:** The generated wrapper exposes `<Value = string>` with a default but preserves the generic.
   **Handling:** This is still a generic — `<Value = string>` means callers can override the type. Document as "Generic forwarded with string default." Task 4 can still use `<Select<number>>` etc.

---

## Design Decisions

**Decision 1: Install via CLI, not copy-paste from another source**
- **Why:** The parent feature document explicitly warns against copy-pasting a Radix-based `select.tsx`. The CLI reads `components.json` and applies the correct `base-mira` style, ensuring the generated file uses `@base-ui/react` primitives rather than Radix UI packages. Manual copy-paste from documentation examples risks introducing a Radix dependency that violates ADR-010.
- **Alternatives considered:** Copying from an existing project or online example — rejected because most online `select.tsx` examples use the Radix-based style (the older shadcn default) and would silently introduce `@radix-ui/react-select`.

**Decision 2: Both components installed in the same task**
- **Why:** The parent groups Steps 1.1 and 1.2 as a single task ("Both are CLI installs with no logic — fast, low risk, prerequisite for all UI components"). There is no dependency between the two installs; they can be run sequentially without concern.
- **Alternatives considered:** Splitting into two tasks — rejected because the installs are trivial, share the same verification pattern (typecheck + test), and are both needed before any UI component can be built.

**Decision 3: The generic Value verification (1.2a) is a blocking gate before Task 4**
- **Why:** `EmployeeFilterBar` depends on typed `Value` to correctly pass `false` (boolean) through `onValueChange` for the Inactive filter. A string `"false"` arriving at the backend's EQUALS predicate may be silently mismatched. The discriminating test in Task 3 (`enabled = false` case) is a regression guard, but the safest prevention is a correctly typed Select at the source. Step 1.2a must be completed and its finding documented before Task 4 begins.
- **Alternatives considered:** Deferring the verification to Task 4 when `EmployeeFilterBar` is written — rejected because if the generic is missing, Task 4's typed design must be redesigned, not retrofitted.

**Decision 4: No test files created in this task**
- **Why:** The installed shadcn primitives contain no custom business logic — they are styled wrappers over Base UI components. Their correctness is guaranteed by the shadcn project's own tests and by `npm run typecheck` + `npm run build` in this project. Writing unit tests for pass-through UI wrappers would test shadcn's internals, not our own behavior. The parent explicitly categorizes `table.tsx` and `select.tsx` as "Modules without tests (structural)" — verified by typecheck + build + manual.
- **Alternatives considered:** Rendering tests to confirm basic exports — rejected as testing library internals with no value.

---

## Testing Considerations

### Automatic Validation

- [x] `npm run typecheck` passes with 0 errors after Step 1.1 (`table.tsx` created)
- [x] `npm run test` returns 47/47 after Step 1.1 (no regressions)
- [x] `npm run typecheck` passes with 0 errors after Step 1.2 (`select.tsx` created)
- [x] `npm run test` returns 47/47 after Step 1.2 (no regressions)
- [x] `npm run build` succeeds with 0 errors after both installs

> **Note:** Run commands from `project/srcs/frontend/` or via `npm --prefix project/srcs/frontend run <script>` if not `cd`'d into the directory. Prior sessions required the `--prefix` form because the shell's working directory was not honored. Use `--prefix` if the direct `npm run` form fails.

### Manual Validation

- [x] **Verify `table.tsx` exists:** Confirm `project/srcs/frontend/src/components/ui/table.tsx` is present and exports at least `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`.
- [x] **Verify `select.tsx` exists:** Confirm `project/srcs/frontend/src/components/ui/select.tsx` is present and exports at least `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`.
- [x] **Step 1.2a finding documented:** Confirm the Design Decisions or Step 1.2a section includes a clear statement of whether the generic `Value` is forwarded by the `select.tsx` wrapper, with the specific code evidence that led to that conclusion.
- [x] **No Radix select in package.json:** After the install, confirm `@radix-ui/react-select` does not appear in `package.json` (Radix slot package is fine: `@radix-ui/react-slot`).

---

## Related Code Explanations

- `src/components/ui/tooltip.tsx` — the most similar existing shadcn/base-ui primitive in this project; confirms the import pattern (`@base-ui/react/tooltip`), the `cn` utility usage, and that `TooltipProvider` is exported but optional (Base UI tooltips render standalone). Use this as the structural reference when reading `select.tsx`.
- `src/components/ui/input.tsx` — existing shadcn input showing the `React.ComponentProps<"input">` spread pattern used in many shadcn base components.
- `project/srcs/frontend/components.json` — the shadcn configuration that controls which style the CLI uses; must have `"style": "base-mira"` for all installs.
- `documentation/ADRs/ADR-010-base-ui-over-radix-ui-for-frontend.md` — the accepted decision that mandates Base UI and the `base-mira` style; all future shadcn installs are subject to this constraint.

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected for this task
- [x] Up-to-date documentation reviewed for shadcn (CLI) and Base UI (Select generic `Value`)
- [x] `src/components/ui/table.tsx` created by `npx shadcn@latest add table`
- [x] `src/components/ui/select.tsx` created by `npx shadcn@latest add select`
- [x] `npm run typecheck` passes with 0 errors
- [x] `npm run test` passes with 47/47 (no regressions)
- [x] `npm run build` succeeds
- [x] Step 1.2a completed: `select.tsx` inspected, generic `Value` status documented, decision recorded
- [x] `@radix-ui/react-select` NOT present in `package.json`
- [x] Parent feature Step 1.1, 1.2, and 1.2a checkboxes marked `[x]`
- [x] Parent feature Task 1 section updated with wiki link `[[Admin-Employee-Management-Page-task-1-shadcn-table-select]]`
