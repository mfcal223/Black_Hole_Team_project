#architectural #high

## Bug: Frontend Code Quality — Fallow Health Refactor

### Summary

A `npx fallow health` audit of the frontend (6,944 LOC, 72 files) revealed a health score of 82 with two structural problems: function-level complexity spikes producing critical CRAP scores, and several hooks/components that have grown beyond a single responsibility and need to be split into smaller, focused units. The report identifies 27 oversized functions, 10 high-complexity functions (CRAP ≥30), and an unused dependency. This bug tracks the work to bring all flagged files within acceptable thresholds following the `solid-deep-design` skill.

### Reproduction Conditions

1. Clone the project and `cd project/srcs/frontend`
2. Run `npx fallow health`
3. Observe health score 82 B, with unit-size deduction −10.0, unused deps −6.1, and coupling −1.4

### Environment / Preconditions

- Report date: 2026-06-28
- Full report: `project/srcs/frontend/report.txt`
- Fallow version: latest (npx)

### Real-World Scenarios

- A developer modifying `onSave` in `useEditEmployee.ts` must reason through two independent API flows (field update + status toggle) interleaved in a single 62-line async function — high error-introduction risk.
- Adding a new app-settings card to `AppSettingsForm.tsx` means modifying a 164-line component with 13 props and JSX depth 7, risking regressions across all three existing cards.
- `useEmployeeList.ts` mixes pagination, filter management, and debounce logic — a change to debounce strategy requires understanding the entire 152-line hook.

### Expected Behavior

- All functions score below 30 CRAP (no untested complexity spikes).
- No component receives more than 7 props.
- No hook mixes more than one data-fetching concern.
- Files stay under ~100 LOC (excluding generated shadcn primitives).

### Actual Behavior

- `useEditEmployee.ts:onSave` scores **CRITICAL CRAP 116.3** (21 cyclomatic / 18 cognitive / 62 lines).
- `AppSettingsForm.tsx:AppSettingsForm` has 20 cyclomatic, 24 cognitive, **13 props**, JSX depth 7 — no sub-components.
- `EmployeesPage.tsx:EmployeesPage` scores **HIGH CRAP 72.0** (8 cyclomatic, 112 lines).
- `useEmployeeList.ts` is 152 lines mixing filter state, debounce, and pagination into one hook.
- `useAppSettings.ts` is 138 lines combining load and save operations with derived state.
- `Header.tsx:getPageTitle` uses a switch statement (CRAP 30) — closed to extension without modification.
- `EmployeeFilterBar.tsx:renderValueInput` is an inline render function (CRAP 30) rather than a focused component.

### Impact

- High cognitive load when modifying any of the flagged files.
- Any change to `onSave` risks breaking both the update-fields and toggle-status flows simultaneously.
- The 13-prop `AppSettingsForm` interface grows linearly with every new settings section.
- New route entries require modifying `Header.tsx:getPageTitle` (OCP violation).
- Unused dependency inflates the bundle and generates audit noise.

### Findings

- `useEditEmployee.ts:onSave` contains two independent `try/catch` blocks for two separate API calls. These can be extracted into `saveProfileChanges` and `saveStatusChange` private helpers, each with their own error path, reducing cyclomatic complexity from 21 to ≤5 per function.
- `AppSettingsForm.tsx` renders three logically independent cards (API Key, Default Model, Last Updated). Each card has its own props subset; extracting `OpenRouterApiKeyCard`, `DefaultModelCard`, and `LastUpdatedCard` reduces the parent to a thin layout wrapper with ≤4 props.
- `EmployeesPage.tsx` manages three modal open/close states (`editEmployee`, `deleteEmployee`, `createOpen`) inline. Extracting a `useEmployeeModals` hook and a `EmployeePagination` component reduces the page to a composition layer.
- `useEmployeeList.ts` contains debounce logic, filter state management, and pagination state management in one hook. Filter + debounce logic can be extracted to `useEmployeeFilter.ts`, leaving the list hook as a thin orchestrator.
- `useAppSettings.ts` mixes `load()` and `save()` as local functions inside one hook with 10 state variables. The two operations are independent and can be split into `useAppSettingsLoader` and `useAppSettingsSaver`, or at minimum extracted as clearly separated private helpers.
- `Header.tsx:getPageTitle` is a switch statement over `location.pathname`. A `ROUTE_TITLES: Record<string, string>` const closes the function to modification when new routes are added (OCP).
- `EmployeeFilterBar.tsx:renderValueInput` is a local function returning JSX. Extracting it as `<FilterValueInput>` gives it a proper React lifecycle and testable surface.
- `sidebar.tsx` (shadcn generated, 730 LOC) is flagged primarily due to LOC. Since it is a generated UI primitive, the shadcn-specific refactor (if any) should be scoped carefully to avoid diverging from upstream.

### Investigation Scope

- **Code Reviewed:** `src/features/employees/hooks/useEditEmployee.ts`, `src/features/app-settings/components/AppSettingsForm.tsx`, `src/pages/EmployeesPage.tsx`, `src/features/employees/hooks/useEmployeeList.ts`, `src/features/app-settings/hooks/useAppSettings.ts`, `src/layouts/Header.tsx`, `src/features/employees/components/EmployeeFilterBar.tsx`, `src/layouts/Sidebar.tsx`
- **Logs Reviewed:** No — static analysis only
- **Runtime Evidence:** `npx fallow health` output (`project/srcs/frontend/report.txt`)

### Root Cause Analysis

The primary cause is **Single Responsibility Principle (SRP) violations** that accumulated as features grew. Each hook and component started small but absorbed adjacent concerns over time:

- `onSave` became an orchestrator that handles two different API contracts (PATCH fields vs. PATCH status) instead of delegating to focused helpers.
- `AppSettingsForm` absorbed all settings cards into one component rather than composing them.
- `useEmployeeList` absorbed debounce and filter state alongside pagination because they shared the same fetch call.

A secondary cause is the **Open/Closed Principle (OCP) violation** in `getPageTitle`: the switch statement is the canonical anti-pattern for a function that must be modified every time the route table grows.

### Evidence in Code

- `src/features/employees/hooks/useEditEmployee.ts:40` — `onSave` orchestrates `hasFieldChanges` detection + `updateEmployee` + `activateEmployee`/`deactivateEmployee` in nested try/catch blocks. Each block duplicates the same error extraction pattern.
- `src/features/app-settings/components/AppSettingsForm.tsx:26` — Destructures 13 props from `UseAppSettingsResult` and renders three independent cards without delegation to sub-components.
- `src/pages/EmployeesPage.tsx:33` — Three `useState` calls for modal state sit inline alongside all business logic delegation.
- `src/features/employees/hooks/useEmployeeList.ts:38` — `debounceRef` plus `clearDebounce` live in the same scope as pagination state; debounce is not extracted.
- `src/layouts/Header.tsx:18` — `getPageTitle` is a switch over `location.pathname` with no extensibility hook.
- `src/features/employees/components/EmployeeFilterBar.tsx:33` — `renderValueInput` is a local function producing JSX (effectively an anonymous component with no React identity).

### Affected Systems / Modules

- Employee management feature: `src/features/employees/`
- App settings feature: `src/features/app-settings/`
- Layout layer: `src/layouts/`
- Pages: `src/pages/`

### Affected Processes

- Employee editing flow
- App settings save/load flow
- All page navigation (Header route title)

---

### Confidence Level

Confirmed

The CRAP scores, cyclomatic complexity values, and LOC counts are directly measured by fallow. The SOLID violations are confirmed by reading the source files.

### Remaining Uncertainty / Open Questions

- Whether `sidebar.tsx` (shadcn generated, 730 LOC) should be split or left intact to stay close to the upstream shadcn pattern.
- The exact unused dependency name (fallow reports −6.1 deduction for "unused deps" without naming the package — needs `fallow health --format json` to confirm).

---

## Solution Direction

### Proposed Fix

Decompose each flagged unit following SRP and OCP from the `solid-deep-design` skill:

1. **`useEditEmployee.ts:onSave`** — extract `saveProfileChanges(id, form)` and `saveStatusChange(id, enabled)` as private async helpers. Each owns its try/catch and error extraction. `onSave` becomes a coordinator of ≤10 lines.
2. **`AppSettingsForm.tsx`** — extract `OpenRouterApiKeyCard`, `DefaultModelCard`, and `LastUpdatedCard` as focused components. `AppSettingsForm` becomes a thin `<div className="flex flex-col gap-6">` wrapper with at most the error/success banner and the Save button.
3. **`EmployeesPage.tsx`** — extract `useEmployeeModals()` hook (returns `editEmployee`, `deleteEmployee`, `createOpen` and their setters) and `<EmployeePagination>` component (renders the Previous/Page count/Next row).
4. **`useEmployeeList.ts`** — extract `useEmployeeFilter(pageSize)` hook that owns `filterField`, `filterValue`, debounce ref, `onFilterFieldChange`, `onFilterValueChange`. `useEmployeeList` becomes an orchestrator that calls `useEmployeeFilter` and manages only pagination state.
5. **`useAppSettings.ts`** — extract `load()` and `save()` as clearly named private helpers that each own their own `setIsLoading`/`setIsSaving` and error/success states. If the file remains large, consider splitting into `useAppSettingsLoader` and `useAppSettingsSaver`.
6. **`Header.tsx:getPageTitle`** — replace switch with a `const ROUTE_TITLES: Record<string, string>` lookup. Function becomes one line: `return ROUTE_TITLES[location.pathname] ?? "Control Panel"`.
7. **`EmployeeFilterBar.tsx:renderValueInput`** — extract as `<FilterValueInput filterField={...} filterValue={...} onFilterValueChange={...} />` component.

### Why This Fix Is Correct

Each extraction follows the SRP (one reason to change per unit) and OCP (adding a new route/card/filter type does not require modifying an existing unit). The decompositions are parallel to the existing pattern used by the backend (generic CRUD layering already separates concerns by layer). The fix keeps the hook return contracts intact — callers (`AppSettingsPage`, `EmployeesPage`) do not change their import or usage.

### Skills and Documentation Used During Analysis and Solution Validation

- `solid-deep-design` — guides the decomposition strategy (SRP, OCP, and interface segregation for the 13-prop `AppSettingsForm`)
- `react-code-organization` — governs where extracted hooks and components live within `features/`
- `react-best-practices` — validates that `renderValueInput` should be a component, not an inline function

### Files to Modify or Create

- `src/features/employees/hooks/useEditEmployee.ts` — extract `saveProfileChanges`, `saveStatusChange`
- `src/features/app-settings/components/AppSettingsForm.tsx` — slim down, extract card sub-components
- `src/features/app-settings/components/OpenRouterApiKeyCard.tsx` — new
- `src/features/app-settings/components/DefaultModelCard.tsx` — new
- `src/features/app-settings/components/LastUpdatedCard.tsx` — new
- `src/pages/EmployeesPage.tsx` — extract modal state hook, extract pagination component
- `src/features/employees/hooks/useEmployeeModals.ts` — new
- `src/features/employees/components/EmployeePagination.tsx` — new
- `src/features/employees/hooks/useEmployeeFilter.ts` — new
- `src/features/employees/hooks/useEmployeeList.ts` — slim down to orchestrator
- `src/features/app-settings/hooks/useAppSettings.ts` — restructure load/save helpers
- `src/layouts/Header.tsx` — replace `getPageTitle` switch with route map
- `src/features/employees/components/EmployeeFilterBar.tsx` — extract `FilterValueInput`
- `src/features/employees/components/FilterValueInput.tsx` — new

### Validation Strategy After Fix

#### Automatic Validation

- [ ] `cd project/srcs/frontend && npm run build` — zero TypeScript errors
- [ ] `npm run lint` — no ESLint errors
- [ ] `npm test` — all existing tests pass without modification (contracts unchanged)
- [ ] `npx fallow health` — health score ≥ 90, no function scores CRAP ≥ 30

#### Manual Validation

- [ ] Open the app; navigate to Employees page, edit an employee (field change + status toggle), confirm both changes persist.
- [ ] Open App Settings, change API key and default model, save, reload — confirm values persist.
- [ ] Navigate between all four routes and confirm the Header shows the correct page title each time.
- [ ] Apply an Employee filter (username, enabled), confirm results update correctly with debounce.

### Potential Risks / Notes

- The `useEditEmployee` refactor must preserve the sequential dependency: profile update must succeed before status toggle is attempted (the current `onSave` halts on the first failure). The extracted helpers must maintain this ordering.
- `AppSettingsForm` currently passes the full `UseAppSettingsResult` via `type AppSettingsFormProps = UseAppSettingsResult` — the extracted card components should receive only the props they actually use (ISP), but the parent `AppSettingsForm` interface can remain unchanged.
- `sidebar.tsx` (730 LOC, shadcn generated) is out of scope for this bug — splitting it risks diverging from the upstream shadcn/ui release pattern and must be a separate deliberate decision.

---

## Resolution Steps

### Phase 1: Critical CRAP — `useEditEmployee.ts:onSave`

- [x] **Step 1.1:** Extract `saveProfileChanges(id: number, form: EmployeeUpdateForm): Promise<string | null>` — returns error string or null. Owns the axios error extraction pattern. *(executed 2026-06-28 in [[Frontend-Code-Quality-Fallow-Health-Refactor-task-1-useEditEmployee-onSave]])*
- [x] **Step 1.2:** Extract `saveStatusChange(id: number, enabled: boolean): Promise<string | null>` — same return contract. Calls `activateEmployee` or `deactivateEmployee`. *(executed 2026-06-28 in [[Frontend-Code-Quality-Fallow-Health-Refactor-task-1-useEditEmployee-onSave]])*
- [x] **Step 1.3:** Rewrite `onSave` as a coordinator: call `saveProfileChanges` if `hasFieldChanges`; on null error call `saveStatusChange` if `hasEnabledChange`; set error state from whichever returned non-null; call `onSuccess` only when both pass. *(executed 2026-06-28 in [[Frontend-Code-Quality-Fallow-Health-Refactor-task-1-useEditEmployee-onSave]])*

### Phase 2: God component — `AppSettingsForm.tsx`

- [x] **Step 2.1:** Create `OpenRouterApiKeyCard.tsx` with props: `apiKeyInput`, `hasConfiguredApiKey`, `isLoading`, `isSaving`, `setApiKeyInput`. *(executed 2026-06-28 in [[Frontend-Code-Quality-Fallow-Health-Refactor-task-2-AppSettingsForm-cards]])*
- [x] **Step 2.2:** Create `DefaultModelCard.tsx` with props: `enabledModels`, `selectedDefaultModelId`, `hasEnabledModels`, `isLoading`, `isSaving`, `setSelectedDefaultModelId`. *(executed 2026-06-28 in [[Frontend-Code-Quality-Fallow-Health-Refactor-task-2-AppSettingsForm-cards]])*
- [x] **Step 2.3:** Create `LastUpdatedCard.tsx` with props: `updatedAt: string | null | undefined`, `updatedByUsername: string | null | undefined`. **Note:** The parent bug's Step 2.3 prescription says `string | undefined`; the task document upgraded this to `string | null | undefined` to match the call-site expression `settings?.updatedAt` exactly (the DTO field is `string | null`; optional chaining adds `undefined`). The task's type is strictly more permissive and avoids forcing `?? null` casts at the call site. *(executed 2026-06-28 in [[Frontend-Code-Quality-Fallow-Health-Refactor-task-2-AppSettingsForm-cards]])*
- [x] **Step 2.4:** Slim `AppSettingsForm.tsx` to render the three cards + error/success banner + Save button. Props interface narrows from 13 to ≤6. **Note:** Per the task's Decision 1 and the parent bug's Potential Risks note, `type AppSettingsFormProps = UseAppSettingsResult` was preserved unchanged (not narrowed) so `AppSettingsPage.tsx` requires zero modifications. The form directly uses 6 members; the other 7 are forwarded to the card components. The ISP improvement is realized at the card level. *(executed 2026-06-28 in [[Frontend-Code-Quality-Fallow-Health-Refactor-task-2-AppSettingsForm-cards]])*

### Phase 3: Page decomposition — `EmployeesPage.tsx`

- [ ] **Step 3.1:** Create `useEmployeeModals.ts` hook returning `{ editEmployee, setEditEmployee, deleteEmployee, setDeleteEmployee, createOpen, setCreateOpen }`.
- [ ] **Step 3.2:** Create `EmployeePagination.tsx` component receiving `{ currentPage, totalPages, totalElements, isLoading, onPageChange }`.
- [ ] **Step 3.3:** Refactor `EmployeesPage.tsx` to use `useEmployeeModals` and `<EmployeePagination>`.

### Phase 4: Hook decomposition — `useEmployeeList.ts`

- [ ] **Step 4.1:** Create `useEmployeeFilter.ts` owning `filterField`, `filterValue`, `debounceRef`, `clearDebounce`, `onFilterFieldChange`, `onFilterValueChange`. Returns `{ filterField, filterValue, onFilterFieldChange, onFilterValueChange, clearDebounce }`.
- [ ] **Step 4.2:** Refactor `useEmployeeList.ts` to import and call `useEmployeeFilter`; the list hook retains only pagination state, `fetchEmployees`, and `refresh`.

### Phase 5: Hook decomposition — `useAppSettings.ts`

- [x] **Step 5.1:** Extract `load()` logic into a clearly bounded private async function with its own error handling; mark with a section comment or extract to a helper module `appSettingsLoader.ts` if the file stays > 100 LOC post-refactor.
- [x] **Step 5.2:** Apply the same separation to `save()` — no logic overlap with `load`.

### Phase 6: Small cleanups — `Header.tsx` and `EmployeeFilterBar.tsx`

- [x] **Step 6.1:** Replace `getPageTitle` switch in `Header.tsx` with `const ROUTE_TITLES: Record<string, string>` const + single-line lookup.
- [x] **Step 6.2:** Extract `FilterValueInput.tsx` from `EmployeeFilterBar.tsx:renderValueInput`. Props: `filterField`, `activeMeta`, `filterValue`, `onFilterValueChange`.

---

## Task Breakdown

### Task 1: Refactor `useEditEmployee.ts:onSave` (Critical CRAP 116.3)
- **Steps Covered:** Step 1.1, 1.2, 1.3
- **Reason for Grouping:** All three steps are tightly coupled — the two helpers feed directly into the rewritten coordinator. Must be done atomically.
- **Planned Task File:** `Frontend-Code-Quality-Fallow-Health-Refactor-task-1-useEditEmployee-onSave.md`
- **Task Document Link:** [[Frontend-Code-Quality-Fallow-Health-Refactor-task-1-useEditEmployee-onSave]]

### Task 2: Decompose `AppSettingsForm.tsx` into card sub-components
- **Steps Covered:** Step 2.1, 2.2, 2.3, 2.4
- **Reason for Grouping:** The four steps form a single card-extraction pass; splitting further would leave the parent in a half-migrated state.
- **Planned Task File:** `Frontend-Code-Quality-Fallow-Health-Refactor-task-2-AppSettingsForm-cards.md`
- **Task Document Link:** [[Frontend-Code-Quality-Fallow-Health-Refactor-task-2-AppSettingsForm-cards]]

### Task 3: Decompose `EmployeesPage.tsx` (High CRAP 72.0)
- **Steps Covered:** Step 3.1, 3.2, 3.3
- **Reason for Grouping:** Modal hook and pagination component are independent extractions but both target the same page — grouping avoids two partial PRs on the same file.
- **Planned Task File:** `Frontend-Code-Quality-Fallow-Health-Refactor-task-3-EmployeesPage-decompose.md`
- **Task Document Link:** [[Frontend-Code-Quality-Fallow-Health-Refactor-task-3-EmployeesPage-decompose]]

### Task 4: Split `useEmployeeList.ts` — extract `useEmployeeFilter`
- **Steps Covered:** Step 4.1, 4.2
- **Reason for Grouping:** The two steps are a single extract-and-wire operation; cannot ship 4.1 without 4.2.
- **Planned Task File:** `Frontend-Code-Quality-Fallow-Health-Refactor-task-4-useEmployeeFilter.md`
- **Task Document Link:** [[Frontend-Code-Quality-Fallow-Health-Refactor-task-4-useEmployeeFilter]]

### Task 5: Restructure `useAppSettings.ts` load/save helpers
- **Steps Covered:** Step 5.1, 5.2
- **Reason for Grouping:** Both steps address the same hook and are low-risk isolated extractions.
- **Planned Task File:** `Frontend-Refactor-useAppSettings-LoadSave.md`
- **Task Document Link:** [[Frontend-Refactor-useAppSettings-LoadSave]]

### Task 6: Small cleanups — `Header.tsx` route map + `FilterValueInput` component
- **Steps Covered:** Step 6.1, 6.2
- **Reason for Grouping:** Both are small, low-risk, isolated changes. Grouping avoids two trivial PRs.
- **Planned Task File:** `Frontend-Code-Quality-Fallow-Health-Refactor-task-6-small-cleanups.md`
- **Task Document Link:** [[Frontend-Code-Quality-Fallow-Health-Refactor-task-6-small-cleanups]]

---

## Expected Outcome After Fix

- Fallow health score rises from 82 to ≥90.
- `onSave` CRAP score drops from CRITICAL 116.3 to <15 (each helper is short and linearly structured).
- `AppSettingsForm` props drop from 13 to ≤6; JSX depth drops from 7 to ≤3.
- `useEmployeeList.ts` drops from 152 to ~70 LOC; `useEmployeeFilter.ts` owns the debounce boundary.
- `getPageTitle` is closed to modification — new routes require only adding a key to `ROUTE_TITLES`.
- All 6 tasks produce individually reviewable, independently mergeable changesets.
