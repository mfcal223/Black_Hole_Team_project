# Task: Fix Select Trigger Display Labels

#task #current #low-complexity #parent-app-settings-default-model-select-display-and-persistence

**Parent:** [[App-Settings-Default-Model-Select-Display-and-Persistence]]
**Parent Type:** Bug
**Related Step(s):** Phase 1 - Step 1.1, Step 1.2; Task 1 from parent breakdown
**Estimated Complexity:** Low

---

## Goal

Fix the Base UI Select trigger text for two user-visible selectors so selected values display human-readable labels instead of raw internal values. This task covers the Default LLM Model selector on `/app-settings` and the Employee filter-field selector on `/employees`.

---

## Parent Context

The parent bug reports two App Settings default-model defects and one secondary Employee filter display defect. Task 1 addresses only Bug 1 and its secondary instance: Base UI's `Select.Value` displays raw selected values when `Select.Root` has no `items` prop, so numeric model IDs render as `"3"` and filter field keys render as `"firstName"`.

The parent diagnosis is confirmed by installed `@base-ui/react@1.5.0` source: `SelectValue.js` reads `items` from the Select store and passes it to `resolveSelectedLabel(value, items, itemToStringLabel)`. When the current component does not pass `items`, the resolver falls back to `serializeValue(value)`, which stringifies numbers and strings. `SelectItem` children render the open popup labels, but Base UI does not extract those children for trigger display.

This task intentionally does not address Bug 2, the default model initialization race in `useAppSettings.ts`. That is Task 2 from the parent bug and requires a separate hook-level test.

---

## Preconditions / Dependencies

- The documentation system is initialized under `documentation/` and tasks belong in `documentation/Tasks/current/`.
- Parent bug document exists at `documentation/Bugs/to-do/App-Settings-Default-Model-Select-Display-and-Persistence.md`.
- No previous tasks exist in this parent bug. Task 1 is the first implementation task.
- The current frontend test baseline is `128/128` passing across 21 files with `npm run test -- --run` from `project/srcs/frontend/`.
- `@base-ui/react` is installed at resolved version `1.5.0` in `package-lock.json`, despite `package.json` allowing `^1.4.1`.
- `DefaultModelCard.tsx` already receives `enabledModels` sorted and filtered by `useAppSettings`; this task must not change model filtering, sorting, save behavior, or initialization behavior.
- `EmployeeFilterBar.tsx` currently owns the filter-field Select and page-size Select. The dynamic value Select for boolean filters lives in `FilterValueInput.tsx` and is out of scope unless a separate bug/task expands the parent scope.
- `components/ui/select.tsx` directly re-exports `SelectPrimitive.Root` as `Select`; call sites can pass Base UI `Select.Root` props such as `items` directly.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` - Selected - verified documentation structure, Task template, status directory, and naming expectations.
- `memory-bank` - Selected - loaded all Memory Bank files for project architecture, active frontend context, Base UI/shadcn decision history, test baseline, and known testing quirks.
- `glossary-management` - Selected - glossary CLI is available but currently returns no indexed terms; terminology is taken from the parent bug and related docs: App Settings, Default LLM Model, System Model, Employee filter field.
- `doc-exploration` - Selected - checked all ADRs and relevant docs/features/tasks for App Settings, LLM model catalog, Base UI, and Employee filtering context.
- `solid-deep-design` - Selected - used to choose a minimal call-site fix instead of modifying the shared Select wrapper or creating a new abstraction.
- `find-docs` - Selected - queried Base UI Select docs, React Testing Library docs, and Vitest 4.1.x docs. Installed Base UI 1.5.0 source was used for exact version verification because Context7's version list did not include 1.5.0.
- `tdd` - Selected - task plan uses two vertical RED -> GREEN cycles, one per affected component.
- `task-reviewer` - Selected - this Task document must be reviewed and patched after creation.

### Documentation Reviewed

- **[[App-Settings-Default-Model-Select-Display-and-Persistence]]** - parent bug; confirmed Task 1 covers Step 1.1 and Step 1.2 only.
- **[[ADRs/ADR-010-base-ui-over-radix-ui-for-frontend|ADR-010]]** - Base UI is the required primitive library; do not switch to Radix or patch around Base UI behavior with DOM text extraction.
- **[[ADRs/ADR-007-admin-curated-llm-model-list|ADR-007]]** - default model options come from the admin-curated enabled model catalog.
- **[[ADRs/ADR-009-long-primary-key-for-all-entities|ADR-009]]** - backend entity IDs are `Long`; frontend mirrors them as numeric `id` values, so the Select value remains `number | null`.
- **[[Features/done/Admin-App-Settings-Page]]** - original settings feature; requires Base UI typed select values and explicit `defaultModelId: number | null` semantics.
- **[[Admin-LLM-Model-Catalog-Page]]** - current App Settings page is a three-tab layout with General Settings containing the existing default model card.
- **[[Admin-LLM-Model-Catalog-Page-task-5-appsettings-tab-restructure]]** - current state after the page restructure: `AppSettingsPage` passes `systemModels.models` to `useAppSettings({ models })` and renders `<AppSettingsForm {...appSettings} />` in the General Settings tab.
- **[[Admin-App-Settings-Page-task-3-form-and-feature-api]]** - the default model Select was originally implemented with typed `number | null` values but no `items` prop.
- **[[Admin-Employee-Management-Page-task-4-ui-components-and-page]]** - original `EmployeeFilterBar` typed Select pattern and field-label data source (`FILTER_FIELDS`).
- **[[Frontend-Code-Quality-Fallow-Health-Refactor-task-6-small-cleanups]]** - current Employee filter state after `FilterValueInput` extraction; `EmployeeFilterBar.tsx` still owns the filter-field selector.
- **[[Docs/API-Reference/AppSettings]]** - confirms `defaultModelId` references internal `LlmModel.id`, not `modelId`.
- **[[Docs/API-Reference/LlmModels]]** - confirms `LlmModelDTO.id`, `modelId`, `name`, and `isEnabled` fields.
- **Context7 `/mui/base-ui` Select docs** - confirms `Select.Root items={items}` causes `<Select.Value>` to render the selected item label instead of the raw value.
- **Installed `@base-ui/react@1.5.0` source** - `SelectRoot.d.ts`, `SelectValue.js`, `resolveValueLabel.js`, `serializeValue.js`, and `SelectTrigger.js` confirm exact prop names, trigger role, label resolution, null-label handling, and raw fallback behavior.
- **Context7 `/testing-library/react-testing-library` docs** - confirms `render` and `screen.getByRole` testing pattern; project does not use jest-dom matchers.
- **Context7 `/vitest-dev/vitest/v4.1.6` docs** - closest indexed version to installed 4.1.9; confirms `describe`, `it`, `expect`, and `vi.fn` syntax.

### Version Information Checked

| Technology | Resolved Version | Source | Use In This Task |
|------------|------------------|--------|------------------|
| `@base-ui/react` | `1.5.0` | `package-lock.json`, installed source | `Select.Root items`, `Select.Value`, `role="combobox"` trigger behavior |
| React / React DOM | `19.2.6` | `package-lock.json` | Component rendering in tests and app |
| `@testing-library/react` | `16.3.2` | `package-lock.json` | Component tests with `render` and `screen` |
| Vitest | `4.1.9` | `package-lock.json` | Test runner and `vi.fn` mocks |
| TypeScript | `5.9.3` | `package-lock.json` | Typechecking generic Select values |
| Vite | `7.3.5` | `package-lock.json` | Build validation |
| shadcn CLI | `4.7.0` | `package-lock.json` | Existing Base UI-backed shadcn components |

### Related Existing Code

- `project/srcs/frontend/src/features/app-settings/components/DefaultModelCard.tsx:59` - `Select<number | null>` missing `items`.
- `project/srcs/frontend/src/features/app-settings/components/AppSettingsForm.tsx:48` - composes `DefaultModelCard` inside General Settings.
- `project/srcs/frontend/src/features/employees/components/EmployeeFilterBar.tsx:36` - `Select<FilterField | null>` missing `items` for filter-field labels.
- `project/srcs/frontend/src/features/employees/components/FilterValueInput.tsx:32` - dynamic boolean filter value Select; not part of the parent task scope.
- `project/srcs/frontend/src/features/employees/types.ts:21` - `FILTER_FIELDS` contains the canonical value-to-label pairs for Employee filter fields.
- `project/srcs/frontend/src/features/app-settings/types.ts:1` - `LlmModelDTO` contains numeric `id` and display `name`.
- `project/srcs/frontend/src/components/ui/select.tsx:7` - `const Select = SelectPrimitive.Root`, so `items` can be passed at call sites.
- `project/srcs/frontend/node_modules/@base-ui/react/select/root/SelectRoot.d.ts:97` - `items` prop declaration and documentation.
- `project/srcs/frontend/node_modules/@base-ui/react/select/value/SelectValue.js:38` - `Select.Value` reads `items` from the store.
- `project/srcs/frontend/node_modules/@base-ui/react/internals/resolveValueLabel.js:69` - `resolveSelectedLabel` maps selected values to item labels.

---

## Implementation Details

### Approach

Use Base UI's intended `items` prop at each affected `Select.Root` call site. Each `items` array must derive from the same source as the rendered `SelectItem` list so trigger labels and popup rows cannot drift.

This is a call-site fix, not a shared wrapper fix. The shared `components/ui/select.tsx` wrapper cannot safely infer item labels from children because Base UI does not read `SelectItem` children for trigger text, and adding inference to the wrapper would create a custom abstraction over a library behavior that already has a first-class API.

The implementation should add two focused component tests before changing production code:

1. `DefaultModelCard.test.tsx` - selected model ID `2` renders trigger text containing `GPT-4o`, not `2`.
2. `EmployeeFilterBar.test.tsx` - selected filter field `firstName` renders trigger text containing `First Name`, not `firstName`.

Each RED test should fail against the current code because the trigger renders the raw selected value. Then apply the corresponding `items` prop and confirm the test passes before moving to the second component.

### SOLID + Deep Module Design

**DefaultModelCard** remains a focused UI module. It already owns rendering the default-model Select; deriving `defaultModelItems` from `enabledModels` is part of that rendering responsibility and does not add a second reason to change.

**EmployeeFilterBar** remains a focused UI module. It already owns the filter-field selector and imports `FILTER_FIELDS`; deriving `filterFieldItems` from `FILTER_FIELDS` keeps the field selector's value-to-label mapping local to its existing source of truth.

**Shared Select wrapper** is intentionally not modified. A global wrapper change would increase coupling and risk regressions across every Select in the app. The problem is not the wrapper's public interface; it is missing data at two call sites.

Deletion test: if the two local `items` arrays were deleted, the value-to-label mapping would reappear as raw `Select.Value` fallback behavior in exactly these selectors. The arrays earn their keep because they connect existing domain display labels to Base UI's trigger label seam without introducing a new module.

### Files to Create/Modify

- [ ] `project/srcs/frontend/src/features/app-settings/components/DefaultModelCard.test.tsx` - new focused RED/GREEN component test for default model trigger label.
- [ ] `project/srcs/frontend/src/features/app-settings/components/DefaultModelCard.tsx` - add `items` prop to `Select<number | null>` using `enabledModels` and the null option.
- [ ] `project/srcs/frontend/src/features/employees/components/EmployeeFilterBar.test.tsx` - new focused RED/GREEN component test for filter-field trigger label.
- [ ] `project/srcs/frontend/src/features/employees/components/EmployeeFilterBar.tsx` - add `items` prop to `Select<FilterField | null>` using `FILTER_FIELDS` and the null option.

---

## Step-by-Step Implementation

### Step 1: RED Test for `DefaultModelCard` Trigger Label

**Goal:** Capture the user-visible App Settings defect before changing production code.
**Dependencies:** Current `DefaultModelCard.tsx`, `@testing-library/react` 16.3.2, Vitest 4.1.9.

- [x] Create `project/srcs/frontend/src/features/app-settings/components/DefaultModelCard.test.tsx`.
- [x] Render `DefaultModelCard` with one enabled model whose `id` is `2` and `name` is `GPT-4o`.
- [x] Query the Select trigger using `screen.getByRole("combobox")`, which is provided by Base UI `Select.Trigger`.
- [x] Assert the trigger text contains `GPT-4o` and does not contain the raw value `2`.
- [x] Run the targeted test and confirm RED: it should fail before the `items` prop is added.

**Why this step is critical:** It proves the fix addresses the actual visible regression rather than only adding a prop. The test goes through the rendered component and Base UI trigger, not a private helper.

#### Implementation

```tsx
// project/srcs/frontend/src/features/app-settings/components/DefaultModelCard.test.tsx

import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { DefaultModelCard } from "./DefaultModelCard"
import type { LlmModelDTO } from "../types"

const enabledModels: LlmModelDTO[] = [
  {
    id: 2,
    modelId: "openai/gpt-4o",
    name: "GPT-4o",
    description: null,
    isEnabled: true,
    createdAt: "2026-06-01T00:00:00",
  },
]

describe("DefaultModelCard", () => {
  it("shows the selected model name in the trigger instead of the raw numeric id", () => {
    render(
      <DefaultModelCard
        enabledModels={enabledModels}
        selectedDefaultModelId={2}
        hasEnabledModels={true}
        isLoading={false}
        isSaving={false}
        setSelectedDefaultModelId={vi.fn()}
      />
    )

    const trigger = screen.getByRole("combobox")
    expect(trigger.textContent).toContain("GPT-4o")
    expect(trigger.textContent).not.toContain("2")
  })
})
```

#### Edge Cases

1. **Case:** The trigger contains SVG icon text or whitespace.  
   **Handling:** Use `textContent` with `toContain`, not exact text equality.

2. **Case:** `screen.getByRole("combobox")` fails because the wrapper changed away from Base UI.  
   **Handling:** That would be a meaningful failure because ADR-010 requires Base UI-backed Select and the installed `SelectTrigger.js` sets `role: "combobox"`.

3. **Case:** The raw numeric id `2` appears elsewhere in the component.  
   **Handling:** This test asserts against the trigger node's `textContent`, not the whole document.

---

### Step 2: GREEN Fix for `DefaultModelCard`

**Goal:** Pass Base UI `items` to the Default LLM Model Select so `Select.Value` resolves numeric IDs to model names.
**Dependencies:** Step 1 RED test exists and fails on current code.

- [x] In `DefaultModelCard.tsx`, derive `defaultModelItems` inside the component from `enabledModels` plus the `null` clear option.
- [x] Pass `items={defaultModelItems}` to `<Select<number | null>>`.
- [x] Keep all existing `SelectItem` children unchanged except where formatting requires minor line wrapping.
- [x] Leave the surrounding `Card`, helper text, disabled-state logic, and save wiring unchanged; the code below shows only the changed region. <!-- REVIEW-FIX: Clarified that the snippet is partial so executors do not replace the whole component shell. -->
- [x] Run the targeted test and confirm GREEN.
- [x] Run `npm --prefix project/srcs/frontend run typecheck` to confirm the `items` prop typechecks with numeric and null values.

**Why this step is critical:** Base UI's trigger display is driven by `items` or `itemToStringLabel`. Providing `items` is the smallest correct fix and keeps the popup list and trigger label sourced from the same `enabledModels` data.

#### Implementation

```tsx
export function DefaultModelCard({
  enabledModels,
  selectedDefaultModelId,
  hasEnabledModels,
  isLoading,
  isSaving,
  setSelectedDefaultModelId,
}: DefaultModelCardProps) {
  const defaultModelItems: { value: number | null; label: string }[] = [
    { value: null, label: "No default model" },
    ...enabledModels.map((model) => ({
      value: model.id,
      label: model.name,
    })),
  ]

  return (
    <Select<number | null>
      value={selectedDefaultModelId}
      onValueChange={(v) => setSelectedDefaultModelId(v)}
      items={defaultModelItems}
    >
      <SelectTrigger disabled={!hasEnabledModels || isLoading || isSaving}>
        <SelectValue placeholder="No default model" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={null as number | null}>No default model</SelectItem>
        {enabledModels.map((model) => (
          <SelectItem key={model.id} value={model.id}>
            {model.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
```

#### Edge Cases

1. **Case:** `selectedDefaultModelId` is `null`.  
   **Handling:** `items` includes `{ value: null, label: "No default model" }`. Base UI 1.5.0 `hasNullItemLabel()` recognizes null item labels, so the trigger can display the null label rather than falling back to an empty serialized value.

2. **Case:** `enabledModels` is empty.  
   **Handling:** `defaultModelItems` still contains only the null clear option. The trigger remains disabled by existing `!hasEnabledModels || isLoading || isSaving` logic.

3. **Case:** System Models toggles change `enabledModels`.  
   **Handling:** The items array is re-derived from the current props every render. No `useMemo` is needed because the array is small and cheap to compute.

4. **Case:** Model names change in a future edit UI.  
   **Handling:** Trigger labels and popup labels both read from `model.name`, so they remain synchronized.

---

### Step 3: RED Test for `EmployeeFilterBar` Filter Field Label

**Goal:** Capture the secondary display defect where the filter-field trigger shows raw field keys such as `firstName` instead of labels such as `First Name`.
**Dependencies:** Current `EmployeeFilterBar.tsx`, `FILTER_FIELDS`, `@testing-library/react` 16.3.2, Vitest 4.1.9.

- [x] Create `project/srcs/frontend/src/features/employees/components/EmployeeFilterBar.test.tsx`.
- [x] Render `EmployeeFilterBar` with `filterField="firstName"` and `pageSize={10}`.
- [x] Query all Select triggers with `screen.getAllByRole("combobox")`; the filter-field trigger is the first combobox in the component.
- [x] Assert the first trigger text contains `First Name` and not raw `firstName`.
- [x] Run the targeted test and confirm RED before changing production code.

**Why this step is critical:** It protects the secondary bug from regressing and proves the field selector uses `FILTER_FIELDS.label` for trigger display.

#### Implementation

```tsx
// project/srcs/frontend/src/features/employees/components/EmployeeFilterBar.test.tsx

import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { EmployeeFilterBar } from "./EmployeeFilterBar"

describe("EmployeeFilterBar", () => {
  it("shows the selected filter field label in the trigger instead of the raw field key", () => {
    render(
      <EmployeeFilterBar
        filterField="firstName"
        filterValue={null}
        pageSize={10}
        onFilterFieldChange={vi.fn()}
        onFilterValueChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />
    )

    const [fieldTrigger] = screen.getAllByRole("combobox")
    expect(fieldTrigger.textContent).toContain("First Name")
    expect(fieldTrigger.textContent).not.toContain("firstName")
  })
})
```

#### Edge Cases

1. **Case:** `screen.getAllByRole("combobox")` returns both the filter-field selector and page-size selector.  
   **Handling:** The field selector is first in the rendered layout. If the visual order changes later, this test should be updated because the user-visible order changed.

2. **Case:** The value input for string filters renders an input between the two Selects.  
   **Handling:** Inputs do not have `role="combobox"`, so they do not affect the Select trigger query.

3. **Case:** `filterField` is `null`.  
   **Handling:** This test intentionally uses `firstName` because that is the reported raw-key defect. The null option is covered by the items array in Step 4 and by manual validation.

---

### Step 4: GREEN Fix for `EmployeeFilterBar`

**Goal:** Pass Base UI `items` to the filter-field Select so `Select.Value` resolves filter keys to display labels from `FILTER_FIELDS`.
**Dependencies:** Step 3 RED test exists and fails on current code.

- [x] In `EmployeeFilterBar.tsx`, derive `filterFieldItems` inside the component from the null option plus `FILTER_FIELDS`.
- [x] Pass `items={filterFieldItems}` to `<Select<FilterField | null>>`.
- [x] Keep the rendered `SelectItem` list deriving from `FILTER_FIELDS` as it does today.
- [x] Leave `FilterValueInput`, the page-size Select, layout classes, and existing callback wiring unchanged; the code below shows only the changed filter-field Select region. <!-- REVIEW-FIX: Clarified that the snippet is partial so executors preserve the rest of EmployeeFilterBar. -->
- [x] Run the targeted test and confirm GREEN.
- [x] Run `npm --prefix project/srcs/frontend run typecheck` to confirm the union type and null option compile.

**Why this step is critical:** The field values (`firstName`, `lastName`, `enabled`) are internal filter keys. Users should see labels from the project-owned `FILTER_FIELDS` metadata.

#### Implementation

```tsx
export function EmployeeFilterBar({
  filterField,
  filterValue,
  pageSize,
  onFilterFieldChange,
  onFilterValueChange,
  onPageSizeChange,
}: EmployeeFilterBarProps) {
  const activeMeta = FILTER_FIELDS.find((f) => f.value === filterField)
  const filterFieldItems: { value: FilterField | null; label: string }[] = [
    { value: null, label: "No filter" },
    ...FILTER_FIELDS.map((field) => ({
      value: field.value,
      label: field.label,
    })),
  ]

  return (
    <Select<FilterField | null>
      value={filterField}
      onValueChange={(field) => onFilterFieldChange(field)}
      items={filterFieldItems}
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
  )
}
```

#### Edge Cases

1. **Case:** `FILTER_FIELDS` labels are changed later.  
   **Handling:** `filterFieldItems` and rendered `SelectItem` rows both derive from `FILTER_FIELDS`, so the trigger and popup stay synchronized.

2. **Case:** `filterField` is `null`.  
   **Handling:** `filterFieldItems` includes `{ value: null, label: "No filter" }`, matching the existing null `SelectItem`.

3. **Case:** Page size Select also has no `items` prop.  
   **Handling:** Page size values and labels are the same numbers (`5`, `10`, `25`, `50`), so raw serialization is not a user-visible label mismatch. Leave it unchanged to keep this task scoped to the parent bug.

4. **Case:** Boolean filter value Select in `FilterValueInput.tsx` has labels (`Active` / `Inactive`) that differ from boolean values.  
   **Handling:** The parent bug's Step 1.2 specifically names the filter-field selector in `EmployeeFilterBar.tsx`. Do not expand this task to `FilterValueInput.tsx` unless manual validation or a separate bug confirms the boolean value trigger defect should be fixed in this scope.

---

### Step 5: Final Validation

**Goal:** Confirm both fixes pass targeted tests, full regression, typecheck, and build.
**Dependencies:** Steps 1-4 complete.

- [x] Run `npm --prefix project/srcs/frontend run test -- --run src/features/app-settings/components/DefaultModelCard.test.tsx` - new DefaultModelCard test passes.
- [x] Run `npm --prefix project/srcs/frontend run test -- --run src/features/employees/components/EmployeeFilterBar.test.tsx` - new EmployeeFilterBar test passes.
- [x] Run `npm --prefix project/srcs/frontend run test -- --run` - full suite passes. Expected count: `130/130` if only the two tests above were added to the current `128/128` baseline.
- [x] Run `npm --prefix project/srcs/frontend run typecheck` - zero TypeScript errors.
- [x] Run `npm --prefix project/srcs/frontend run build` - Vite build succeeds. Existing chunk-size warning, if present, is unrelated.
- [x] Run `cd project/srcs/frontend && npx eslint src/features/app-settings/components/DefaultModelCard.tsx src/features/app-settings/components/DefaultModelCard.test.tsx src/features/employees/components/EmployeeFilterBar.tsx src/features/employees/components/EmployeeFilterBar.test.tsx` - no new lint errors in touched files.

#### Edge Cases

1. **Case:** The full suite count differs from `130/130`.  
   **Handling:** Investigate whether other work landed concurrently. The correctness requirement is all tests pass, not the exact count.

2. **Case:** Targeted component tests emit React `act()` warnings from Base UI focus setup.  
   **Handling:** If assertions pass and the warning is from Base UI `SelectTrigger` internals without a behavior failure, document it in post-review notes. Do not add artificial timers unless the warning fails CI.

3. **Case:** TypeScript complains about `items` array label type.  
   **Handling:** `SelectRoot.d.ts` accepts `React.ReactNode` labels. The typed arrays use `string` labels, which are valid React nodes.

---

## Design Decisions

**Decision 1: Use `items` prop instead of `itemToStringLabel`.**
- **Why:** The values are primitive IDs/keys and the display mapping already exists as `{ value, label }` pairs (`enabledModels` and `FILTER_FIELDS`). Base UI docs explicitly describe `items` as the prop that makes `<Select.Value>` render labels instead of raw values.
- **Alternatives considered:** `itemToStringLabel` - rejected because it would require a custom lookup function per component and duplicate the item list. Custom `SelectValue` children - rejected because it bypasses Base UI's item-label resolver and would need bespoke logic per Select.

**Decision 2: Fix call sites, not `components/ui/select.tsx`.**
- **Why:** The shared wrapper cannot infer label mappings safely from children. Base UI intentionally requires structured `items` or a label function for trigger labels. A wrapper-level workaround would be shallow, fragile, and would affect every Select in the app.
- **Alternatives considered:** Modify `SelectItem` wrapper to register text for trigger display - rejected because Base UI already has an explicit `items` API and DOM-child extraction would couple the wrapper to implementation details.

**Decision 3: Derive `items` arrays locally without `useMemo`.**
- **Why:** Both arrays are small and cheap to compute. The project does not default to `useMemo` for small derived render data, and React Compiler guidance in this repo favors avoiding unnecessary memoization.
- **Alternatives considered:** `useMemo` around `defaultModelItems` and `filterFieldItems` - rejected as unnecessary ceremony for tiny arrays.

**Decision 4: Add two focused component tests.**
- **Why:** The defect is user-visible trigger text. Testing the rendered trigger via Base UI's public combobox role locks the behavior without testing private helper functions or implementation-only state.
- **Alternatives considered:** Manual-only validation - rejected because the regression is cheap to capture automatically. Full select-open interaction tests - rejected because this task does not need to test Base UI popup behavior.

**Decision 5: Keep `FilterValueInput.tsx` out of scope.**
- **Why:** The parent task specifies the filter-field selector in `EmployeeFilterBar.tsx`. Expanding to the boolean filter value Select would modify a third production file and address a related but separate display concern not listed in the parent task.
- **Alternatives considered:** Add `items` to the boolean value Select too - technically consistent, but rejected for this task to preserve parent-specified scope. If manual validation confirms `false` / `true` trigger text is visible and unacceptable, create a follow-up bug or expand the parent before implementation.

---

## Testing Considerations

### Automatic Validation

- [x] Create and run the `DefaultModelCard` RED test before production changes: `npm --prefix project/srcs/frontend run test -- --run src/features/app-settings/components/DefaultModelCard.test.tsx`.
- [x] After adding `items` to `DefaultModelCard.tsx`, rerun `npm --prefix project/srcs/frontend run test -- --run src/features/app-settings/components/DefaultModelCard.test.tsx` and confirm GREEN.
- [x] Create and run the `EmployeeFilterBar` RED test before production changes: `npm --prefix project/srcs/frontend run test -- --run src/features/employees/components/EmployeeFilterBar.test.tsx`.
- [x] After adding `items` to `EmployeeFilterBar.tsx`, rerun `npm --prefix project/srcs/frontend run test -- --run src/features/employees/components/EmployeeFilterBar.test.tsx` and confirm GREEN.
- [x] Run `npm --prefix project/srcs/frontend run test -- --run` and confirm the full suite passes. Expected: `130/130` unless concurrent work changes the count.
- [x] Run `npm --prefix project/srcs/frontend run typecheck` and confirm zero TypeScript errors.
- [x] Run `npm --prefix project/srcs/frontend run build` and confirm the frontend build succeeds.
- [x] Run targeted eslint on touched files: `cd project/srcs/frontend && npx eslint src/features/app-settings/components/DefaultModelCard.tsx src/features/app-settings/components/DefaultModelCard.test.tsx src/features/employees/components/EmployeeFilterBar.tsx src/features/employees/components/EmployeeFilterBar.test.tsx`.

### Manual Validation

- [ ] Log in as Admin, navigate to `/app-settings`, stay on **General Settings**, and confirm the Default LLM Model trigger shows `No default model` when no default is selected.
- [ ] Select an enabled model in the Default LLM Model dropdown and confirm the closed trigger displays the model name, such as `GPT-4o`, not a numeric ID such as `2` or `3`.
- [ ] Navigate to `/employees`, open the filter-field selector, choose **First Name**, and confirm the closed trigger displays `First Name`, not `firstName`.
- [ ] In `/employees`, choose **No filter** again and confirm the closed trigger displays `No filter`.

Manual validation is required because the primary defect is visual trigger text in a browser-managed popup/trigger control, and because the task does not include a browser automation framework such as Playwright.

---

## Related Code Explanations

- No dedicated `documentation/Code/` explanation exists for `DefaultModelCard.tsx` or `EmployeeFilterBar.tsx` at task creation time.
- `project/srcs/frontend/src/features/app-settings/components/DefaultModelCard.tsx` - add Base UI `items` mapping for default model values.
- `project/srcs/frontend/src/features/employees/components/EmployeeFilterBar.tsx` - add Base UI `items` mapping for filter field values.
- `project/srcs/frontend/src/components/ui/select.tsx` - existing wrapper forwards `SelectPrimitive.Root` props; no wrapper change planned.
- `project/srcs/frontend/node_modules/@base-ui/react/internals/resolveValueLabel.js` - exact installed label resolver that this task feeds with `items`.

---

## Completion Criteria

- [x] Parent bug reviewed and Task 1 scope reflected accurately.
- [x] All mandatory skills reviewed and documented in this Task.
- [x] Related ADRs, Features, Tasks, API docs, Memory Bank context, and installed Base UI source reviewed.
- [x] Version-matched dependency information recorded from `package-lock.json`.
- [x] `DefaultModelCard.test.tsx` created and first confirmed RED against the missing `items` prop.
- [x] `DefaultModelCard.tsx` passes an `items` array with `{ value: null, label: "No default model" }` plus enabled model `{ value: model.id, label: model.name }` entries.
- [x] `DefaultModelCard.test.tsx` passes after the fix and asserts the trigger displays model name instead of numeric id.
- [x] `EmployeeFilterBar.test.tsx` created and first confirmed RED against the missing `items` prop.
- [x] `EmployeeFilterBar.tsx` passes an `items` array with `{ value: null, label: "No filter" }` plus `FILTER_FIELDS` entries.
- [x] `EmployeeFilterBar.test.tsx` passes after the fix and asserts the trigger displays field label instead of raw field key.
- [x] No changes made to `components/ui/select.tsx`, `useAppSettings.ts`, `FilterValueInput.tsx`, routing, services, or backend code.
- [x] Full frontend test suite passes. **Result: 130/130 across 23 test files** (128 baseline + 2 new).
- [x] Frontend typecheck passes. **Result: 0 TypeScript errors.**
- [x] Frontend build succeeds. **Result: Vite build OK, 537.99 kB / 175.44 kB gzip (pre-existing 500 kB chunk warning unchanged).**
- [x] Targeted eslint passes on touched files or any pre-existing unrelated lint issues are documented. **Result: eslint clean on all 4 touched files.**
- [x] Manual validation steps are documented for the user. (Steps remain unchecked — they require a real browser + running backend, per the task's manual-validation rationale.)
- [x] Task 2 remains responsible for the persisted default initialization race; this task does not attempt to fix it.
