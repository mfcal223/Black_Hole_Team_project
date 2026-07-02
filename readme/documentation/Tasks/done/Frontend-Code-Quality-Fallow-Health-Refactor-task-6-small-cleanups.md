# Task: Small Cleanups — Header Route Map + FilterValueInput Component

#task #current #low-complexity #parent-frontend-code-quality-fallow-health-refactor

**Parent:** [[Frontend-Code-Quality-Fallow-Health-Refactor]]
**Parent Type:** Bug
**Related Step(s):** Phase 6 — Steps 6.1 and 6.2
**Estimated Complexity:** Low

---

## Goal

Replace `Header.tsx`'s `getPageTitle` switch statement with a `ROUTE_TITLES` record lookup to close the OCP violation, and extract `EmployeeFilterBar.tsx`'s `renderValueInput` local function into a proper `FilterValueInput` React component to give it a stable React identity and testable surface.

---

## Parent Context

The parent bug (`Frontend-Code-Quality-Fallow-Health-Refactor`) is a fallow-health audit refactor targeting SOLID violations across the frontend. Phase 6 covers two small, isolated cleanups that together close the remaining OCP and SRP findings from the fallow audit:

**Step 6.1 — OCP violation in `Header.tsx:getPageTitle`**: The function is a switch statement over `location.pathname`. Every new route requires modifying an existing, tested function — a direct OCP violation. The fix is a `const ROUTE_TITLES: Record<string, string>` lookup at module scope. Adding a new route then only requires adding a key to the constant; the function itself becomes a single immutable line.

**Step 6.2 — SRP / React identity violation in `EmployeeFilterBar.tsx:renderValueInput`**: `renderValueInput()` is a plain function inside `EmployeeFilterBar` that returns JSX. React has no identity for this function's output — it has no VDOM node, no stable key, and no reconciliation surface. When the boolean/string branch changes (e.g., user switches from a string field to "Status"), React tears down and recreates the DOM without proper reconciliation. Extracting it as `<FilterValueInput>` gives it a proper React identity, an explicit ISP-compliant prop interface, and a testable surface.

The parent explicitly prescribes:
- **Step 6.1**: Replace `getPageTitle` switch with `const ROUTE_TITLES: Record<string, string>` const + single-line lookup.
- **Step 6.2**: Extract `renderValueInput` as `<FilterValueInput filterField={...} activeMeta={...} filterValue={...} onFilterValueChange={...} />` component.

Both steps are isolated: no caller changes, no new network behavior, no state mutations.

---

## Preconditions / Dependencies

- **Tasks 1–5 of the parent bug are complete:**
  - Task 1: `useEditEmployee.ts:onSave` split into `saveProfileChanges`/`saveStatusChange` helpers ✅
  - Task 2: `AppSettingsForm.tsx` decomposed into `OpenRouterApiKeyCard`, `DefaultModelCard`, `LastUpdatedCard` ✅
  - Task 3: `EmployeesPage.tsx` decomposed into `useEmployeeModals` + `EmployeePagination` ✅
  - Task 4: `useEmployeeFilter.ts` extracted from `useEmployeeList.ts` ✅
  - Task 5: `useAppSettings.ts` `load()`/`save()` helpers restructured + lint error fixed ✅
- **Baseline:** 109 tests pass across 18 files (`npm run test`).
- `src/features/employees/components/EmployeeFilterBar.tsx` exists (111 lines); sole consumer is `src/pages/EmployeesPage.tsx`. Neither file changes in this task.
- `src/layouts/Header.tsx` exists (82 lines); sole consumer is `src/layouts/MainLayout.tsx`. `MainLayout.tsx` does not change.
- The 4 routes currently in `getPageTitle` match exactly the 4 protected routes in `router.tsx`: `/dashboard`, `/conversations`, `/employees`, `/app-settings`.
- **Out of scope:** `useEmployeeList.ts:96` has a pre-existing `react-hooks/set-state-in-effect` lint error noted in the Task 5 document. That file is not in Phase 6's scope and must not be modified in this task.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `solid-deep-design` — **Selected** — OCP governs Step 6.1 (close `getPageTitle` to modification via a data-driven lookup). SRP and React identity concerns govern Step 6.2 (give `FilterValueInput` its own reason to change, its own reconciliation node).
- `tdd` — **Selected** — `FilterValueInput` is a new component with three distinct behavioral contracts (null / string / boolean render modes); write tests before implementing.
- `react-best-practices` — **Selected** — validates that extracting a JSX-returning local function into a proper React component is the correct fix for the React identity issue.
- `react-code-organization` — **Selected** — `FilterValueInput.tsx` goes in `src/features/employees/components/` following the existing component pattern (`EmployeePagination.tsx`, `EmployeeTable.tsx`, `EmployeeFilterBar.tsx`).
- `glossary-management` — **Not available** (CLI not found). No new domain terms are introduced — this is a structural refactor.

### Documentation Reviewed

- **@testing-library/react 16.3.2** — `render`, `screen` APIs; pattern confirmed from `AppSettingsForm.test.tsx` which uses `render(<Component {...props} />)` + `screen.getByLabelText` / `screen.getByText`. Same pattern used for `FilterValueInput.test.tsx`.
- **React 19.2.4** — Component returning `null` renders nothing and removes its DOM node. A proper function component (vs. a JSX-returning local function) participates in VDOM reconciliation — React can diff its output across renders.

### Related Existing Code

- `src/layouts/Header.tsx` — contains `getPageTitle()` switch at line 18; `ROUTE_TITLES` will be added at module scope before the `Header` function definition.
- `src/features/employees/components/EmployeeFilterBar.tsx` — contains `renderValueInput()` at line 33; will be replaced by `<FilterValueInput>`.
- `src/features/employees/types.ts` — defines `FilterField`, `FilterFieldMeta`, `FILTER_FIELDS`; all imported by `FilterValueInput`.
- `src/router.tsx` — source of truth for all routes; confirms the 4 keys that belong in `ROUTE_TITLES`.
- `src/features/app-settings/components/AppSettingsForm.test.tsx` — precedent for component render tests using `render` + `screen`.
- `src/features/employees/components/EmployeePagination.tsx` — precedent for an extracted, focused component from Task 3.

---

## Implementation Details

### Approach

**Step 6.1 — ROUTE_TITLES**

The switch violates OCP: every new route requires modifying `getPageTitle`. The fix is a `const ROUTE_TITLES: Record<string, string>` at **module scope** (outside the `Header` component), for three reasons:
1. The mapping is static — it does not depend on render-time state, props, or hooks.
2. Module-scope placement avoids re-creating the object on every render.
3. Future tests can import it if needed.

`getPageTitle` becomes a single-line arrow function. It remains an arrow function (rather than being inlined in JSX) to preserve the self-documenting intent and match the parent bug's prescription ("Function becomes one line: `return ROUTE_TITLES[location.pathname] ?? "Control Panel"`").

The `??` operator is used — not `||` — because `ROUTE_TITLES[path]` returns `undefined` for unknown paths (not a falsy string), and `??` is the correct guard for `undefined`.

**Step 6.2 — FilterValueInput**

`renderValueInput()` closes over `filterField`, `filterValue`, `activeMeta`, and `onFilterValueChange` from `EmployeeFilterBar`'s scope. Extracting it as a component:
1. Replaces the closure with an explicit `FilterValueInputProps` interface (ISP: each prop is consumed).
2. Gives the output a stable VDOM node that React can reconcile between renders.
3. Enables direct unit testing.

`activeMeta` (the `FILTER_FIELDS.find()` result) stays computed in `EmployeeFilterBar` and is passed as a prop of type `FilterFieldMeta | undefined`. This keeps `FilterValueInput` focused on rendering; the lookup responsibility stays in the parent. If `activeMeta` were computed inside `FilterValueInput`, it would give the component a second reason to change when the filter field list changes — an SRP violation.

**Import cleanup in EmployeeFilterBar:** After extraction, `import { Input } from "@/components/ui/input"` becomes exclusive to `FilterValueInput`. It moves there and must be removed from `EmployeeFilterBar.tsx`. The Select-related imports remain in `EmployeeFilterBar` (used by the field selector and page-size selector).

**`FilterValueInput` is NOT exported from `src/features/employees/index.ts`** — it is an internal rendering detail of `EmployeeFilterBar`, not a public feature API.

**TDD order for Step 6.2**: RED (write `FilterValueInput.test.tsx`) → GREEN (create `FilterValueInput.tsx`) → WIRE (update `EmployeeFilterBar.tsx`).

### Files to Create/Modify

- [ ] `src/layouts/Header.tsx` — add `ROUTE_TITLES` const at module scope; replace switch with single-line lookup
- [ ] `src/features/employees/components/FilterValueInput.test.tsx` — **new**; 3 tests (FV1–FV3) covering null / string / boolean render modes (TDD RED first)
- [ ] `src/features/employees/components/FilterValueInput.tsx` — **new**; extracted component with `FilterValueInputProps` interface (TDD GREEN)
- [ ] `src/features/employees/components/EmployeeFilterBar.tsx` — remove `renderValueInput()` + its exclusive `Input` import; add `FilterValueInput` import; replace `{renderValueInput()}` with `<FilterValueInput .../>` (WIRE)

---

## Step-by-Step Implementation

### Step 6.1 — Replace `getPageTitle` switch with ROUTE_TITLES

**Goal:** Close `getPageTitle` to modification — new routes require only adding one entry to `ROUTE_TITLES`.
**Dependencies:** None.

- [ ] Add `const ROUTE_TITLES: Record<string, string>` at module scope in `Header.tsx`, before the `Header` function.
- [ ] Replace the `getPageTitle` function body (the switch) with a single lookup line.
- [ ] Run `npm run typecheck` — 0 errors.
- [ ] Run `npm run test` — 109/109 pass (Step 6.1 adds no new tests).

**Why this step is critical:** The fix is purely additive — no behavior changes, only the extensibility model. Adding `/new-route` to the app now requires only one file change: adding a key to `ROUTE_TITLES`. Previously it required opening `Header.tsx` and adding a `case` to the switch.

#### Implementation

Add at module scope, before `export function Header()`:

```typescript
const ROUTE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/conversations": "Conversations",
  "/employees": "Employees",
  "/app-settings": "App Settings",
}
```

Inside the `Header` component, replace the `getPageTitle` function body:

```typescript
const getPageTitle = () => ROUTE_TITLES[location.pathname] ?? "Control Panel"
```

The full modified `Header.tsx` (showing the changed region only):

```typescript
import { SidebarTrigger } from "@/components/ui/sidebar";
import { LogOut, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { getUsername, isAdmin, isEmployee, clearSession } from "@/services/authSession";

const ROUTE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/conversations": "Conversations",
  "/employees": "Employees",
  "/app-settings": "App Settings",
}

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();

  const username = getUsername() || "User";

  const getRoleLabel = () => {
    if (isAdmin()) return "Admin";
    if (isEmployee()) return "Employee";
    return "Role Unknown";
  };

  const getPageTitle = () => ROUTE_TITLES[location.pathname] ?? "Control Panel"

  // Manage logout functionality
  const handleLogout = () => {
    clearSession();
    navigate("/login");
  };

  // ... rest of JSX unchanged
}
```

Note: The original switch had inconsistent indentation (4-space vs 6-space for different cases). The `ROUTE_TITLES` record eliminates this entirely.

#### Edge Cases
1. **Unknown pathname (e.g. `/404`)** — `ROUTE_TITLES["/404"]` returns `undefined`; `?? "Control Panel"` provides the fallback. Behavior is identical to the original `default: return "Control Panel"`.
2. **`/` and `/login`** — these routes render outside `MainLayout` (which contains `Header`), so `Header` never renders on these paths. The `"Control Panel"` fallback applies safely if it ever does.

---

### Step 6.2a RED — Write `FilterValueInput.test.tsx`

**Goal:** Define the three behavioral contracts for `FilterValueInput` before implementing it.
**Dependencies:** Step 6.1 complete; 109 tests passing.

- [ ] Create `src/features/employees/components/FilterValueInput.test.tsx` with 3 tests (FV1–FV3).
- [ ] Confirm RED: `npm run test` fails with "Failed to resolve import `./FilterValueInput`"; 109 existing tests pass.

**Why this step is critical:** Writing tests first locks the prop interface (`filterField`, `activeMeta`, `filterValue`, `onFilterValueChange`) and the three render modes before any implementation bias influences them.

#### Implementation

```typescript
// src/features/employees/components/FilterValueInput.test.tsx

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { FilterValueInput } from "./FilterValueInput"
import type { FilterFieldMeta } from "../types"

describe("FilterValueInput", () => {
  const noop = vi.fn()

  // ── FV1: Null guard ───────────────────────────────────────────────────────────
  it("renders nothing when filterField is null", () => {
    const { container } = render(
      <FilterValueInput
        filterField={null}
        activeMeta={undefined}
        filterValue={null}
        onFilterValueChange={noop}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  // ── FV2: String input ─────────────────────────────────────────────────────────
  it("renders a controlled text input for string filter type", () => {
    const activeMeta: FilterFieldMeta = {
      value: "username",
      label: "Username",
      type: "string",
    }
    render(
      <FilterValueInput
        filterField="username"
        activeMeta={activeMeta}
        filterValue="joh"
        onFilterValueChange={noop}
      />
    )
    // getByPlaceholderText throws if the element is absent — no separate presence assertion needed.
    // The project does NOT use @testing-library/jest-dom (no setupFiles in vitest.config.ts,
    // not in devDependencies). toBeInTheDocument() would fail at runtime and at the type level.
    // <!-- REVIEW-FIX: Removed toBeInTheDocument() — jest-dom not installed; project pattern
    //      is .toBeDefined() or direct property access after getBy* (see RoleGuard.test.tsx,
    //      AppSettingsForm.test.tsx). getByPlaceholderText already throws on absence. -->
    const input = screen.getByPlaceholderText("Type to filter...") as HTMLInputElement
    expect(input.value).toBe("joh")
  })

  // ── FV3: Boolean select renders no text input ────────────────────────────────
  it("does not render a text input for boolean filter type", () => {
    // Verifies the string/boolean branch is correctly discriminated.
    // The Select internals (@base-ui/react portal) are not tested here;
    // the absence of the text Input is the observable contract.
    const activeMeta: FilterFieldMeta = {
      value: "enabled",
      label: "Status",
      type: "boolean",
    }
    render(
      <FilterValueInput
        filterField="enabled"
        activeMeta={activeMeta}
        filterValue={null}
        onFilterValueChange={noop}
      />
    )
    expect(screen.queryByPlaceholderText("Type to filter...")).toBeNull()
  })
})
```

#### Edge Cases
1. **`filterValue` is empty string for string type** — test FV2 uses `"joh"`; the empty-string case is handled by `value={typeof filterValue === "string" ? filterValue : ""}` in the implementation.
2. **`filterValue` is `false` for boolean type** — the `false` guard (`value !== null`) is covered by the integration-level `useEmployeeFilter.test.ts` test F5 and by manual validation. Testing it through the component would require interacting with the @base-ui/react Select, which adds significant jsdom setup cost.

---

### Step 6.2b GREEN — Implement `FilterValueInput.tsx`

**Goal:** Make tests FV1–FV3 pass with an exact verbatim lift of `renderValueInput()`.
**Dependencies:** `FilterValueInput.test.tsx` created; all 3 tests in RED state.

- [ ] Create `src/features/employees/components/FilterValueInput.tsx` as specified.
- [ ] Confirm GREEN: `npm run test` passes all 112 tests (109 + 3 new FV1–FV3).
- [ ] `npm run typecheck` — 0 errors.

**Why this step is critical:** The implementation is a verbatim lift — no new logic, no behavior change. The goal is purely structural: give the function a proper component identity and explicit prop interface.

#### Implementation

```typescript
// src/features/employees/components/FilterValueInput.tsx

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import type { FilterField, FilterFieldMeta } from "../types"

interface FilterValueInputProps {
  filterField: FilterField | null
  activeMeta: FilterFieldMeta | undefined
  filterValue: string | boolean | null
  onFilterValueChange: (value: string | boolean | null) => void
}

export function FilterValueInput({
  filterField,
  activeMeta,
  filterValue,
  onFilterValueChange,
}: FilterValueInputProps) {
  if (filterField === null) return null

  if (activeMeta?.type === "boolean") {
    // Typed Select<boolean | null>: onValueChange yields the typed primitive directly —
    // no "=== 'true'" coercion needed. null = "All" (keeps filterField, clears predicate).
    return (
      <Select<boolean | null>
        value={filterValue as boolean | null}
        onValueChange={(v) => onFilterValueChange(v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="All" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={null as boolean | null}>All</SelectItem>
          <SelectItem value={true}>Active</SelectItem>
          <SelectItem value={false}>Inactive</SelectItem>
        </SelectContent>
      </Select>
    )
  }

  // String field: controlled input; 3-char threshold is enforced in useEmployeeFilter
  return (
    <Input
      type="text"
      placeholder="Type to filter..."
      value={typeof filterValue === "string" ? filterValue : ""}
      onChange={(e) => onFilterValueChange(e.target.value)}
      className="w-48"
    />
  )
}
```

#### Edge Cases
1. **`activeMeta` is `undefined` but `filterField` is not null** — `activeMeta?.type === "boolean"` is `false`; falls through to the string Input branch. Matches the original behavior in `renderValueInput()`.
2. **`filterValue` is a boolean when the string Input renders** — `typeof filterValue === "string"` is `false`; `value` coerces to `""`. This is a caller-invariant violation (boolean value with non-boolean activeMeta) and is safe — identical to the original code's behavior.

---

### Step 6.2c WIRE — Update `EmployeeFilterBar.tsx`

**Goal:** Replace `{renderValueInput()}` with `<FilterValueInput>` in `EmployeeFilterBar.tsx` and clean up now-exclusive imports.
**Dependencies:** `FilterValueInput.tsx` created (GREEN); 112 tests passing.

- [ ] Remove the `renderValueInput()` function definition from `EmployeeFilterBar.tsx` (lines 33–66).
- [ ] Remove `import { Input } from "@/components/ui/input"` — this import is no longer used in `EmployeeFilterBar`.
- [ ] Add `import { FilterValueInput } from "./FilterValueInput"`.
- [ ] Replace `{renderValueInput()}` (line 89) with `<FilterValueInput filterField={filterField} activeMeta={activeMeta} filterValue={filterValue} onFilterValueChange={onFilterValueChange} />`.
- [ ] Confirm `npm run test` still passes all 112 tests.
- [ ] `npm run typecheck` — 0 errors.

**Why this step is critical:** This is the wiring step that completes the extraction. `EmployeeFilterBar` drops from ~111 lines to ~75 lines and its responsibility narrows to: layout container + field selector + page-size selector + `FilterValueInput` composition. The `activeMeta` computation stays here (not moved into `FilterValueInput`) to keep `FilterValueInput` free of `FILTER_FIELDS` coupling.

#### Implementation

Full `EmployeeFilterBar.tsx` after changes:

```typescript
// src/features/employees/components/EmployeeFilterBar.tsx

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import type { FilterField } from "../types"
import { FILTER_FIELDS } from "../types"
import { FilterValueInput } from "./FilterValueInput"

interface EmployeeFilterBarProps {
  filterField: FilterField | null
  filterValue: string | boolean | null
  pageSize: number
  onFilterFieldChange: (field: FilterField | null) => void
  onFilterValueChange: (value: string | boolean | null) => void
  onPageSizeChange: (size: number) => void
}

export function EmployeeFilterBar({
  filterField,
  filterValue,
  pageSize,
  onFilterFieldChange,
  onFilterValueChange,
  onPageSizeChange,
}: EmployeeFilterBarProps) {
  const activeMeta = FILTER_FIELDS.find((f) => f.value === filterField)

  return (
    <div className="flex items-center gap-3">
      {/* Filter field selector */}
      <Select<FilterField | null>
        value={filterField}
        onValueChange={(field) => onFilterFieldChange(field)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a field…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={null as FilterField | null}>No filter</SelectItem>
          {FILTER_FIELDS.map((f) => (
            <SelectItem key={f.value} value={f.value}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Dynamic value input — only shown when a field is selected */}
      <FilterValueInput
        filterField={filterField}
        activeMeta={activeMeta}
        filterValue={filterValue}
        onFilterValueChange={onFilterValueChange}
      />

      {/* Page size selector — ml-auto pushes it to the right */}
      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Rows per page</span>
        <Select<number>
          value={pageSize}
          onValueChange={(size) => { if (size !== null) onPageSizeChange(size) }}
        >
          <SelectTrigger>
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

#### Edge Cases
1. **`activeMeta` computed in `EmployeeFilterBar`, not `FilterValueInput`** — `FILTER_FIELDS.find()` is a linear scan over 5 items; no memoization needed. Keeping it in `EmployeeFilterBar` avoids giving `FilterValueInput` a dependency on `FILTER_FIELDS`, which would be a second reason to change if the filter list grows.

---

## Design Decisions

**Decision 1: `ROUTE_TITLES` at module scope, not inside the component function**
- **Why:** The mapping is static — no render-time state, props, or hooks. Module scope means one allocation per module load (not per render) and makes the constant importable for future tests.
- **Alternatives considered:** Inside `getPageTitle` as a local object — rejected (allocates on every render, no benefit). In a separate `constants.ts` — rejected (overkill for a 4-entry map in a single-component file).

**Decision 2: `getPageTitle` remains as an arrow function (not inlined in JSX)**
- **Why:** `getPageTitle` closes over `location.pathname` from the `useLocation()` hook. Keeping it as a named function preserves self-documenting intent without modifying the JSX structure. The parent bug's prescription is "function becomes one line" — the function remains, it just shrinks to one line.
- **Alternatives considered:** Inline `ROUTE_TITLES[location.pathname] ?? "Control Panel"` directly in JSX — valid but out of scope for the bug prescription and modifies more lines than necessary.

**Decision 3: `activeMeta` stays in `EmployeeFilterBar`, passed as a prop to `FilterValueInput`**
- **Why:** Computing `activeMeta` inside `FilterValueInput` would give it a dependency on `FILTER_FIELDS` — a second reason to change when the filter list changes (SRP violation). Passing it as a prop keeps `FilterValueInput` a pure renderer: given these 4 values, show this UI.
- **Alternatives considered:** Compute `activeMeta` inside `FilterValueInput` and remove it from the prop list — rejected for the SRP reason above.

**Decision 4: No new tests for Step 6.1 (Header.tsx)**
- **Why:** After the refactor, `getPageTitle` is a one-line data structure lookup. Testing it would mean testing a `Record<string, string>` — asserting that `"/dashboard"` maps to `"Dashboard"` is testing data, not logic. Manual navigation is the appropriate validation. The parent bug's own validation strategy confirms this: "Navigate between all four routes and confirm the Header shows the correct page title."
- **Alternatives considered:** Render `Header` in a test and assert each route title — rejected because it requires mocking `useLocation` and `useNavigate`, adding infrastructure cost for zero logical complexity.

**Decision 5: TDD for `FilterValueInput` (3 tests, not 0)**
- **Why:** `FilterValueInput` is a new exported component with three distinct render modes. The null guard and the string/boolean branch are behavioral contracts that can independently regress. Three focused tests (FV1–FV3) provide a regression net without coupling to shadcn Select internals. The parent bug explicitly states the extraction "gives it a proper React lifecycle and testable surface."
- **Alternatives considered:** No tests (treat it as a purely structural extraction) — rejected because the TDD skill mandates tests for new components with testable behavior. Exhaustive interaction tests (clicking Select, typing in Input) — rejected because they require fighting @base-ui/react's portal behavior in jsdom, adding setup cost disproportionate to the change size.

---

## Testing Considerations

### Automatic Validation

**After Step 6.1:**
- [ ] `cd project/srcs/frontend && npm run typecheck` — 0 errors
- [ ] `npm run test` — 109/109 pass (Step 6.1 adds no tests)

**After Step 6.2a RED:**
- [ ] `npm run test` — 3 new tests FAIL ("Failed to resolve import `./FilterValueInput`"); 109 existing tests PASS

**After Step 6.2b GREEN:**
- [ ] `npm run test` — 112/112 pass (109 + 3 new FV1–FV3)
- [ ] `npm run typecheck` — 0 errors

**After Step 6.2c WIRE:**
- [ ] `npm run test` — 112/112 pass (no regressions after wiring)
- [ ] `npm run typecheck` — 0 errors
- [ ] `npm run build` — success; bundle delta ≤ +0.3 kB / +0.1 kB gzip vs the 109-test baseline (structural extraction adds a small module boundary, no new runtime logic)
- [ ] `npx eslint src/layouts/Header.tsx src/features/employees/components/EmployeeFilterBar.tsx src/features/employees/components/FilterValueInput.tsx` — 0 new errors or warnings

### Manual Validation

- [ ] Start the dev server and backend. Navigate to `/dashboard` — confirm the Header shows **"Dashboard"**.
- [ ] Navigate to `/employees` — confirm Header shows **"Employees"**.
- [ ] Navigate to `/app-settings` — confirm Header shows **"App Settings"**.
- [ ] Log in as an Employee, navigate to `/conversations` — confirm Header shows **"Conversations"**.
- [ ] On `/employees`, select "Username" in the filter field selector — confirm the text Input (`Type to filter...`) appears.
- [ ] Select "Status" in the filter field selector — confirm the boolean Select appears with **"All"**, **"Active"**, **"Inactive"** options (verifies the boolean branch renders after switching from a string field — the React identity fix).
- [ ] Choose "Inactive" in the Status dropdown — confirm the employee list filters immediately to disabled accounts.
- [ ] Choose "All" in the Status dropdown — confirm the filter clears and all employees reload.
- [ ] Switch from "Status" back to "Username" — confirm the text Input appears and the boolean Select unmounts cleanly (no stale DOM).

---

## Related Code Explanations

- `src/layouts/Header.tsx:18` — `getPageTitle()` switch being replaced; 4 cases + default
- `src/router.tsx:28–30` — source of truth for the 4 protected routes whose paths populate `ROUTE_TITLES`
- `src/features/employees/components/EmployeeFilterBar.tsx:33` — `renderValueInput()` being extracted; 34 lines of JSX that become `FilterValueInput`
- `src/features/employees/types.ts:13` — `FilterField` union type; `src/features/employees/types.ts:15` — `FilterFieldMeta` interface; both imported by `FilterValueInput`
- `src/features/employees/components/EmployeePagination.tsx` — precedent extracted component from Task 3 of this refactor (same feature directory, same ISP-sliced interface pattern)

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected for this task
- [x] Up-to-date documentation reviewed for the affected technologies
- [x] `src/layouts/Header.tsx` modified: `ROUTE_TITLES` const at module scope; `getPageTitle` is a single-line `??` lookup; no switch statement remains
- [x] `src/features/employees/components/FilterValueInput.test.tsx` created (3 tests: FV1 null guard, FV2 string input, FV3 boolean select discriminant)
- [x] `src/features/employees/components/FilterValueInput.tsx` created: exports `FilterValueInput` and `FilterValueInputProps`; verbatim lift of `renderValueInput()` logic
- [x] `src/features/employees/components/EmployeeFilterBar.tsx` modified: `renderValueInput()` removed; `Input` import removed; `FilterValueInput` import and JSX element added; file is ~80 lines (down from ~111) <!-- REVIEW-FIX: Changed ~75 to ~80 — actual post-extraction count: 111 - 35 (renderValueInput fn + Input import) + 6 (FilterValueInput multi-line JSX) = ~82 lines --> (actual: 81 lines)
- [x] `FilterValueInput` NOT added to `src/features/employees/index.ts`
- [x] All 112 tests pass after Step 6.2c (`npm run test`) — no test file modified other than the new `FilterValueInput.test.tsx`
- [x] `npm run typecheck` — 0 errors after each step
- [x] `npm run build` — success; bundle delta within ≤ +0.3 kB / +0.1 kB gzip budget
- [x] `npx eslint` on the 3 modified/created files — 0 new errors or warnings
- [ ] Manual validation steps documented above performed by the user
- [ ] Phase 6 Steps 6.1 and 6.2 marked `[x]` in parent bug [[Frontend-Code-Quality-Fallow-Health-Refactor]]

---

## Post-Review Notes

### Deviation 1: FV3 test uses `container.querySelector` instead of `screen.queryByPlaceholderText`

**Symptom (initial GREEN run):** FV3 failed with
`AssertionError: expected <input id="base-ui-_r_0_" …> to be null`.
The DOM leftover from FV2's `<input placeholder="Type to filter..." />`
was still attached to `document.body` when FV3 ran.

**Root cause:** `vitest.config.ts` has no `setupFiles` for
`@testing-library/react` automatic cleanup. Each `render()` call appends
to the persistent `document.body` and `screen.*` queries the entire
document. Other test files in the project (`AppSettingsForm.test.tsx`,
`RoleGate.test.tsx`) avoid this by using unique selectors per test
(`getByLabelText("New API key")`, `getByText("admin content")`) so
stale DOM is never matched. FV2 and FV3 deliberately use the same
placeholder — that is the whole point of the discriminant — so the
collision is structural.

**Fix:** Scoped the FV3 assertion to the render's own `container`:
```ts
const { container } = render(<FilterValueInput ... />)
expect(container.querySelector('input[placeholder="Type to filter..."]')).toBeNull()
```
This makes FV3 order-independent without requiring global vitest
config changes (out of Task 6 scope per "Keep changes focused on the
Task scope"). A `beforeEach(cleanup)` setup file would be a
project-wide improvement and should be tracked as a separate task.

**Impact:** Zero functional change to `FilterValueInput`. The test
still asserts exactly the documented contract (boolean type produces
no `Type to filter...` text input).
