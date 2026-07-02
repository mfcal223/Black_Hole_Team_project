#high #architectural #needs-review

## Bug Report: Review of Admin Employee Management Page Feature

### Summary

This is a review of the feature document at `documentation/Features/to-do/Admin-Employee-Management-Page.md`. The feature adds an admin-only Employee list page with paginated, filterable results backed by `POST /api/employee/list`. The review identified **7 findings** (1 high, 3 moderate, 3 low). No critical findings. The high finding (Select value coercion) will cause either a TypeScript compile error or a silent API type mismatch; it must be resolved before Task 4 is executed.

---

## Findings

---

### Finding 1 — Select `onValueChange` produces strings; page size and enabled filter require explicit type coercion

**Severity:** 🟠 High

**Description:**
The shadcn/ui `Select` component's `onValueChange` callback always yields a `string`, regardless of what values were placed in `<SelectItem value="10">` or `<SelectItem value="true">`. The feature document defines:
- `onPageSizeChange: (size: number) => void` — expects a `number`
- `onFilterValueChange: (value: string | boolean) => void` — for the `enabled` filter, the hook builds `{ operator: "EQUALS", value: <boolean> }` and passes it to the backend

`EmployeeFilterBar` must convert Select values before calling these callbacks. The feature document does not mention this conversion anywhere. Without it, one of two bugs occurs:
- If the developer calls `onPageSizeChange(selectStringValue)` directly, TypeScript raises a compile error and the task is blocked.
- If `onFilterValueChange("true")` is called for the boolean filter (bypassing TypeScript with a loose type), the backend receives `{"value": "true"}` (a string) instead of `{"value": true}` (a boolean). The `EmployeeQueryProfile` EQUALS predicate for `enabled` (a `boolean` JPA field) will likely produce an empty result set or throw a QueryDSL type error, silently.

**Examples:**
```tsx
// WRONG — string "10" passed to onPageSizeChange(size: number)
<Select onValueChange={(val) => onPageSizeChange(val)}>

// CORRECT — parse before calling
<Select onValueChange={(val) => onPageSizeChange(parseInt(val, 10))}>

// WRONG — string "true" passed for enabled filter
<Select onValueChange={(val) => onFilterValueChange(val)}>

// CORRECT — convert to boolean
<Select onValueChange={(val) => {
  if (val === "all") { onFilterFieldChange(null); return; }
  onFilterValueChange(val === "true");
}}>
```

**Why It Matters:** Page size sent as string `"10"` to `POST /employee/list` will likely be coerced by the backend's Jackson deserialization to integer 10 (Java is lenient here). However, `enabled: "true"` is a boolean field — Spring QueryDSL will likely fail or produce no results when comparing a string to a JPA `boolean`. The page would silently show zero employees.

**Possible Solutions:**
1. Add explicit coercion in `EmployeeFilterBar` (parseInt for page size, `=== "true"` for boolean).
2. Define the hook's `onPageSizeChange` to accept `string` and do the conversion there. (Not recommended — violates SRP, leaks Select internals into the hook.)

**Recommended Solution:** Option 1 — coerce in `EmployeeFilterBar` at the callback site. This keeps the conversion at the boundary where the Select primitive is used. Document this requirement explicitly in the Task 4 implementation spec, calling out `parseInt(val, 10)` for page size and the `val === "true"` boolean conversion for the enabled filter.

> **Premise correction (per ADR-010):** This finding's premise — *"Select `onValueChange` always yields a `string`, regardless of the values in `<SelectItem>`"* — describes Radix/HTML-`<select>` semantics. Per [[ADRs/ADR-010-base-ui-over-radix-ui-for-frontend]] (accepted), the frontend uses `@base-ui/react`, **not Radix**, and Base UI's `Select.Root` is generic over `Value`; `onValueChange` yields the typed `Value` placed on `<Select.Item value>` (verified against Base UI docs). The string-coercion requirement therefore does not apply to this stack.

**Decision:** Option C (generated alternative) — **declare typed `Select.Item value` per Base UI's generic Select** so `onValueChange` yields primitives directly: `number` for page size, `boolean | null` for the `enabled` filter (where `{ label: "All", value: null }` represents "no filter"). This eliminates coercion at the source instead of patching callbacks, keeps `useEmployeeList`'s domain-typed (`number`, `boolean`) contract pristine, and fixes the UX bug in the original Option 1 (selecting "All" preserves the `enabled` field rather than resetting the field dropdown to the placeholder). Rationale: it is the only option that fits Base UI's actual generic `Value` model (this project's stack), eliminating the type-mismatch bug at its source and honouring SOLID/depth (`EmployeeFilterBar` declares a typed vocabulary once; the hook keeps domain-typed callbacks). Decision date: 2026-06-27. Parent document patched: Yes (EmployeeFilterBar spec, Task 1 verification note, Task 4 note, Risk Assessment ADR-010 cross-reference). Solution-analysis subagents: Option A ×1, Option B ×1, alternative ×1 (read-only, parallel).

---

### Finding 2 — `TooltipProvider` is required by `@base-ui/react` but is absent from the component tree

**Severity:** 🟡 Moderate

**Description:**
`src/components/ui/tooltip.tsx` wraps `@base-ui/react/tooltip`. The base-ui Tooltip API requires `TooltipPrimitive.Provider` (exported as `TooltipProvider`) to be present as an ancestor of any `<Tooltip>` usage. Without it, tooltips simply do not render — there is no error, just silent absence.

Currently, `App.tsx`, `main.tsx`, and `MainLayout.tsx` contain no `TooltipProvider`. The feature document says `EmployeeTable.tsx` will wrap the placeholder action buttons in `<Tooltip>` + `<TooltipContent>` (using the existing `tooltip.tsx` component). These will silently fail to show.

**Examples:**
```tsx
// tooltip.tsx exports:
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }

// Without a TooltipProvider ancestor, this renders no tooltip:
<Tooltip>
  <TooltipTrigger asChild>
    <button><Pencil className="size-4" /></button>
  </TooltipTrigger>
  <TooltipContent>Edit employee</TooltipContent>
</Tooltip>

// Fix: add TooltipProvider in MainLayout.tsx or App.tsx
<TooltipProvider delay={300}>
  {children}
</TooltipProvider>
```

**Why It Matters:** Without `TooltipProvider`, all tooltip usage fails silently. This affects not just the action buttons on this page but any future Tooltip usage across the entire app. Adding it now prevents repeated rediscovery of the same issue.

**Possible Solutions:**
1. Add `<TooltipProvider>` to `MainLayout.tsx` wrapping the layout's children. Best scope — only authenticated pages need tooltips.
2. Add `<TooltipProvider>` to `App.tsx` at the composition root. Slightly broader than needed but safe.
3. Wrap individual `<Tooltip>` usages in `<TooltipProvider>` at the usage site. Verbose, repetitive — not recommended.

**Recommended Solution:** Option 1 — add `<TooltipProvider delay={300}>` to `MainLayout.tsx`. It's the right semantic scope (all authenticated pages can use tooltips, public pages don't need them). Add this to the Implementation Architecture section for `MainLayout.tsx` and the Task 5 wiring step.

> **Premise correction (per ADR-010 + current Base UI docs + empirical codebase evidence):** This finding's premise — *"the base-ui Tooltip API requires `TooltipPrimitive.Provider`… Without it, tooltips simply do not render — there is no error, just silent absence"* — is false on this stack. Per [[ADRs/ADR-010-base-ui-over-radix-ui-for-frontend]] the frontend uses `@base-ui/react` (not Radix). Current Base UI docs define `Tooltip.Provider` solely as a **shared-delay / grouped-hover** wrapper (it renders `FloatingDelayGroup` so adjacent tooltips open instantly); `Tooltip.Root` renders standalone and each `Tooltip.Trigger` carries its own `delay` (default 600ms) / `closeDelay` (default 0). Decisive empirical proof already exists in this codebase: `src/components/ui/sidebar.tsx:547-555` renders `<Tooltip>`/`<TooltipTrigger>`/`<TooltipContent>` with **no `TooltipProvider` consumed anywhere** (verified: `TooltipProvider` is referenced only inside its own definition/export at `src/components/ui/tooltip.tsx:7,66`), and those sidebar tooltips render and work in the running app. Therefore `EmployeeTable`'s action-button tooltips (US17) will render correctly as the feature spec already describes them — there is no "silent absence" bug to fix, and the Moderate severity was inflated.

**Decision:** Dismiss (auto-resolved) — the finding's premise is false for this Base UI stack; no `TooltipProvider` is required for `EmployeeTable` tooltips to render, so no MainLayout/App.tsx/per-usage change is warranted. A one-line clarifying note was added to the parent feature doc's "Potential Issues / Risks" section stating that Base UI's `TooltipProvider` is OPTIONAL (shared-delay/grouped-hover only, not a render prerequisite) to prevent a future developer from re-discovering this and adding a defensive provider. Rationale: this mirrors the Finding-1 premise correction pattern under ADR-010; it keeps the report accurate, avoids solving a non-problem, and preserves the already-working `sidebar.tsx` tooltip grouping behavior (which a global `MainLayout` provider would silently alter). The Bug Report's recommended Option 1 was rejected because it solves a non-existent render-failure bug and introduces an app-wide shared-delay side effect beyond this feature's scope; Option 2 (App.tsx) rejected for the same reason plus broader public-tree coupling; Option 3 (per-usage) rejected as premature boilerplate. Decision date: 2026-06-27. Parent document patched: Yes (Potential Issues / Risks — added one-line `TooltipProvider`-is-optional note only). Solution-analysis subagents: Option 1 ×1, Option 2 ×1, Option 3 ×1, alternative ×1 (read-only, parallel); all four independently confirmed the premise is false.

---

### Finding 3 — Error state from `useEmployeeList` is never rendered in `EmployeesPage`

**Severity:** 🟡 Moderate

**Description:**
`useEmployeeList` exposes `error: string | null` in its return interface. The `EmployeesPage` component sketch in the feature document consumes this hook but does not render the error state anywhere. If `POST /api/employee/list` returns a non-2xx response or the network is unavailable, `isLoading` becomes `false`, `employees` stays `[]`, and the table renders empty — with no indication to the admin that something went wrong.

`src/components/common/ErrorMessage.tsx` is an existing common component designed for exactly this use case.

**Examples:**
```tsx
// Current sketch — no error handling:
<EmployeeTable employees={employees} isLoading={isLoading} />

// Fixed sketch — render error above the table:
{error && <ErrorMessage message={error} />}
<EmployeeTable employees={employees} isLoading={isLoading} />
```

**Why It Matters:** An admin sees an empty table and has no way to distinguish "no employees exist" from "the backend returned an error." They may conclude the system is broken or take no action when they should.

**Possible Solutions:**
1. Add `{error && <ErrorMessage message={error} />}` above the table in `EmployeesPage`. Simple, uses an existing component.
2. Pass `error` as a prop to `EmployeeTable` and render an error row in the table body. More complex, couples the table component to error handling.

**Recommended Solution:** Option 1 — add an `<ErrorMessage>` render in `EmployeesPage`. Update the `EmployeesPage` sketch in the feature document to include this. Add `error` to the list of destructured values from `useEmployeeList`.

**Decision:** Option A (generated/refined alternative) — in `EmployeesPage`, destructure `error` from `useEmployeeList` and, when `error` is non-null, render the existing `src/components/common/ErrorMessage.tsx` **in place of** the table+pagination area while keeping `EmployeeFilterBar` mounted so the admin can change the filter/page-size and retry (it replaces, not stacks above, to honor `ErrorMessage`'s `min-h-100` content-area-replacement design and avoid double-empty space + dead pagination on error). Pair the UI change with documenting in Implementation Architecture §5 (`useEmployeeList`) that the hook sets `error` to a user-facing message inside the `listEmployees` `catch` and clears `error` to `null` at the start of every fetch, plus add a Task 3 test expectation that the error is populated on a rejected fetch and cleared before/after a successful one. Rationale: it reuses `ErrorMessage` for its purpose-built role, keeps `EmployeeTable`'s SRP ("display + loading only") pristine, keeps the composition layer thin (one view-layer condition of the kind Finding 6 already accepts), removes dead pagination during error, keeps the filter bar retryable, and — critically — makes the rendered `error` branch live rather than dead code by closing the hook's `error`-lifecycle spec gap. Option B rejected: stacks a ~400px centered panel above an empty table, ignoring `ErrorMessage`'s design intent and leaving the hook error-lifecycle undocumented (dead branch). Option C rejected: violates `EmployeeTable`'s SRP, couples a fetch-failure concern into a display component, and breaks its structural test exemption. Decision date: 2026-06-27. Parent document patched: Yes (Implementation Architecture §5 hook error-lifecycle, §9 EmployeesPage sketch + import, Task 3 test expectation, Task 4 step note). Solution-analysis subagents: Option 1 ×1, Option 2 ×1, alternative ×1 (read-only, parallel); all rejected Option 2, and the alternative was confirmed materially better than Option 1.

---

### Finding 4 — Boolean `false` filter value is falsy; the hook must guard with `!== null` exclusively

**Severity:** 🟡 Moderate

**Description:**
The `useEmployeeList` hook tracks `filterValue: string | boolean | null`. When the user selects "Inactive" for the `enabled` filter, `filterValue` is `false` (boolean). Any guard in the hook that uses a truthy check (`if (filterValue)`, `!!filterValue`, `Boolean(filterValue)`) would skip applying the filter — `false` is falsy. The filter predicate sent to the backend would be empty, returning all employees instead of only inactive ones.

The feature document does not call out this constraint explicitly. A developer writing Task 3 could easily write:
```typescript
if (filterValue) { // BUG: false is falsy — skips the "Inactive" filter
  filters.push({ field: filterField, operations: [{ operator, value: filterValue }] })
}
```

**Examples:**
```typescript
// WRONG — skips filter when filterValue is false (Inactive)
if (filterValue) {
  filters.push({ ... })
}

// CORRECT — only skip when null (no filter selected or cleared)
if (filterValue !== null) {
  filters.push({ ... })
}
```

**Why It Matters:** Selecting "Inactive" from the enabled filter would silently show ALL employees instead of only inactive ones. The bug is invisible — no error, just wrong data.

**Possible Solutions:**
1. Add a design decision in the feature document and Task 3 implementation spec that explicitly calls out `filterValue !== null` as the only safe guard. Inline a comment in the implementation example.
2. Change the hook's interface to use separate `filterField`/`filterOperator`/`filterValue` fields, replacing `null` with a sentinel object. Overengineered for this use case.

**Recommended Solution:** Option 1 — add a prominent design decision to the feature document under Implementation Architecture §5 (`useEmployeeList`) and in the Testing Decisions table, noting that the discriminating test for the boolean filter must also verify the `enabled = false` (Inactive) case sends the correct predicate, not an empty filter.

**Decision:** Option 1 (recommended) — add a documented design decision that `filterValue !== null` is the **only** safe guard when building the `POST /api/employee/list` predicate array, paired with a discriminating `enabled = false` (Inactive) test that asserts the emitted predicate is exactly `filters: [{ field: "enabled", operations: [{ operator: "EQUALS", value: false }] }]` — not an empty `filters: []`. The guard is documented **once** in Implementation Architecture §5 (`useEmployeeList`) alongside the boolean business rule, echoed once in the §5 test bullet and once in the Task 3 TDD step, and reflected in the Testing Decisions table. No inline code comment in a shipped example beyond the guard's existence in the spec. Rationale: it is the cheapest, doc-only fix; it keeps predicate ownership inside `useEmployeeList` (preserving its SRP and deep-module boundary — the small `useEmployeeList` interface stays unchanged); it surfaces a subtle TS/JS trap (`false` is falsy) at the exact spot a Task-3 developer would otherwise write `if (filterValue)`; it converts the silent-wrong-data risk (US8: "Inactive" showing ALL employees) into a loud, asserted regression test; and it preserves the Finding-1 typed Base UI `<Select<boolean | null>>` contract (null = "All", false = "Inactive") without any interface churn. Option 2 (sentinel-object interface) was rejected by all analysis subagents as accidental complexity that clashes with the accepted Finding-1 typed-`Value` design and the §5 `onFilterValueChange(null)` "All" rule, widens a deep module's surface for a single-field MVP, and reintroduces boundary translation in `EmployeeFilterBar`. The generated `buildFilterPredicates` helper alternative was judged not materially better than an inline `!== null` guard (adds a named boundary around one line with no extra type-enforcement). Decision date: 2026-06-27. Parent document patched: Yes (Implementation Architecture §5 guard note + §5 test bullet, Step 3.1 TDD note, Testing Decisions table row). Solution-analysis subagents: Option 1 ×1, Option 2 ×1, alternative ×1 (read-only, parallel); all three converged on Option 1 (Option 2 "do not recommend", alternative "do not recommend / not materially better").

---

### Finding 5 — Debounce tests require `vi.useFakeTimers()` but this is not mentioned in Testing Decisions

**Severity:** 🟢 Low

**Description:**
The Testing Decisions section specifies 8 behavior tests for `useEmployeeList`, including:
- "String filter with fewer than 3 chars does not trigger fetch"
- "String filter with 3+ chars debounces and triggers fetch with CONTAINS operator"

These tests exercise a 500ms debounce timer. Without fake timers (`vi.useFakeTimers()` + `vi.advanceTimersByTime(500)`), tests would need to actually wait 500ms per assertion, making the suite slow and potentially flaky.

The prior art for this pattern (`useLoginForm.test.ts`, `authSession.test.ts`) does not use fake timers, so a developer following prior art would miss this requirement.

**Examples:**
```typescript
// Required setup for debounce tests:
beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

it("string filter with 3+ chars debounces and fetches with CONTAINS", async () => {
  const { result } = renderHook(() => useEmployeeList())
  // ... arrange
  await act(async () => {
    result.current.onFilterValueChange("joh")
    vi.advanceTimersByTime(500)
  })
  expect(mockListEmployees).toHaveBeenCalledWith(
    expect.objectContaining({
      filters: [{ field: "username", operations: [{ operator: "CONTAINS", value: "joh" }] }]
    })
  )
})
```

**Why It Matters:** Without documenting fake timer usage, Task 3 tests will either be slow (real 500ms waits) or structurally incorrect. This should be called out in the Testing Decisions section and in the Task 3 document.

**Possible Solutions:**
1. Add `vi.useFakeTimers()` / `vi.advanceTimersByTime(500)` / `vi.useRealTimers()` setup to the Testing Decisions section and ensure the Task 3 document includes it.

**Recommended Solution:** Option 1 — patch the Testing Decisions table to add a "Timer setup" row for `useEmployeeList`, noting `vi.useFakeTimers()` in `beforeEach` and `vi.useRealTimers()` in `afterEach`.

**Decision:** Option A (generated/refined alternative) — add a "Test harness (fake timers)" note **inside the Testing Decisions section but outside the module-keyed table** (the table's `Module | Test file | What is tested` schema cannot hold a "Timer setup" row, which Option 1 would have malformed), including a copy-pasteable `beforeEach(vi.useFakeTimers() + vi.clearAllMocks())` / `afterEach(vi.useRealTimers())` / `await act(async () => { onFilterValueChange("joh"); await vi.advanceTimersByTimeAsync(500) })` snippet, and echo the requirement once in the Task 3 (Phase 3 Step 3.1) TDD step. The snippet uses `vi.advanceTimersByTimeAsync` (not the sync `vi.advanceTimersByTime`) because the §5 debounce callback fires a mocked `listEmployees` fetch — async work whose promise chain the async variant flushes; verified against current Vitest 4.x docs (project runs vitest 4.1.9). The note also warns against `vi.useFakeTimers({ shouldAdvanceTime: true })` (reintroduces real-time waits) and notes the non-debounce tests still assert correctly under fake timers (mocked awaited promises resolve; fake timers mock `setTimeout`/`Date`, not microtasks). A shared `DEBOUNCE_MS = 500` export from `useEmployeeList.ts` is marked advisable (avoids magic-number drift) but **optional/non-required** to avoid widening the hook's surface for a Low-severity finding. Rationale: it is doc-only and low-complexity like Option 1 but fixes two defects Option 1 introduces — (a) a "Timer setup" row that breaks the table schema, and (b) the sync timer-advance which is ordering-fragile when the debounced callback kicks off an async fetch; it keeps `useEmployeeList`'s interface and SRP/deep-module boundary untouched (timer setup manipulates time, not the seam), protects US9, and gives the Task-3 developer one correct, copy-pasteable harness. Option 1 was rejected because its single table row is structurally malformed and its sync `advanceTimersByTime(500)` misses the Vitest 4.x async-flush nuance. Decision date: 2026-06-27. Parent document patched: Yes (Testing Decisions — "Test harness (fake timers)" note; Phase 3 Step 3.1 TDD fake-timer echo). Solution-analysis subagents: Option 1 ×1, alternative ×1 (read-only, parallel); both confirmed the Vitest 4.x API, and the alternative was confirmed materially better than Option 1.

---

### Finding 6 — `EmployeesPage` is described as "pure composition with no logic" but contains inline conditional logic

**Severity:** 🟢 Low

**Description:**
The feature document states `EmployeesPage.tsx` "contains no business logic" and is a "thin composition layer." However, the page sketch includes:
```tsx
disabled={currentPage === 0 || isLoading}
disabled={currentPage >= totalPages - 1 || isLoading}
{Math.max(totalPages, 1)}
```
These are conditional expressions that represent view-level decisions about pagination state. They are not business logic per se, but the "no logic" claim is inaccurate and will confuse the developer writing Task 4.

**Why It Matters:** Low practical impact — this is documentation clarity. However, if a developer takes "no logic" literally, they may try to remove the conditions and break the disabled state of pagination buttons.

**Possible Solutions:**
1. Correct the description to "thin composition — contains only view-layer conditions for the pagination controls, no data fetching or transformation logic."
2. Extract a `EmployeePagination` component that accepts `currentPage`, `totalPages`, `isLoading`, and `onPageChange` as props. The conditions stay in the component, `EmployeesPage` is truly logic-free.

**Recommended Solution:** Option 1 — correct the description in the feature document. Option 2 is a valid refactor but premature for MVP (one pagination control in the entire app). Extract when a second paginated page is built.

**Decision:** Option 1 (refined) — doc-only wording correction applied consistently to **both** Implementation Architecture §9 (`EmployeesPage` Purpose) **and** the Testing Decisions "Modules without tests (structural)" bullet for `EmployeesPage.tsx`. Both now drop the inaccurate "Contains no business logic" / "pure composition" labels and instead enumerate the actual view-layer render conditions evaluated over hook-owned state: the Prev/Next `disabled` guards (`currentPage === 0 || isLoading` and `currentPage >= totalPages - 1 || isLoading`), the `Math.max(totalPages, 1)` page-label guard against the documented `totalPages = 0` case, the `{totalElements !== 1 ? "s" : ""}` pluralization, and the Finding-3 `error ? <ErrorMessage /> : <>...</>` error-branch ternary — with an explicit "no data fetching, transformation, or business rules of its own (all owned by `useEmployeeList`)" boundary clause. The error-branch ternary is explicitly enumerated because it was added by the already-resolved Finding-3 patch *after* Finding 6 was written; the finding's original recommended wording ("view-layer conditions for the pagination controls") silently omitted it, so adopting it verbatim would have re-introduced a fresh inaccuracy. Rationale: it is the cheapest, architecturally honest fix (doc-only, zero code/test/build churn); it confirms the already-accepted Finding-3 framing that these are view-layer conditions in the composition layer, not business logic; it keeps `EmployeesPage`'s SRP honest (one reason to change: page composition/layout) without forcing an extraction; and the deletion test / seam rule reject Option 2 (only ONE pagination caller exists in the entire frontend MVP → a hypothetical seam, not a real one; `EmployeePagination` would be a shallow pass-through spreading props into two `disabled` attributes + a `Math.max`, and the Finding-3 error branch would remain in the page anyway, undermining its "truly logic-free" goal). Option 2 (extract `EmployeePagination`) is deferred until a second paginated page is built, where the one-adapter→two-adapter seam rule makes extraction genuinely warranted — mirroring the Finding-7 "extract when a second paginated feature is added" precedent. Decision date: 2026-06-27. Parent document patched: Yes (§9 EmployeesPage Purpose + Testing Decisions "Modules without tests (structural)" bullet for `EmployeesPage.tsx`). Solution-analysis subagents: Option 1 ×1 (read-only), Option 2 ×1 (read-only, returned empty but the result was unrecoverable — Option-1 and alternative analyses independently confirmed Option 2 premature), alternative ×1 (read-only, parallel — proposed the "consistent cross-location rewording with explicit enumeration" refinement that this decision adopts).

---

### Finding 7 — `PageableRequest` is feature-local but is a cross-cutting backend schema

**Severity:** 🟢 Low

**Description:**
`PageableRequest` is defined in `src/features/employees/types.ts`. This is the same request schema used by every paginated endpoint in the backend (`POST /agent/list`, `POST /conversation/list`, `POST /llm-model/list`, etc.). As the frontend adds more paginated features, this type will be re-defined in each feature module, creating divergence risk.

**Why It Matters:** No immediate impact (only one paginated frontend feature exists). Risk grows with each new paginated feature.

**Possible Solutions:**
1. Add a note to the feature document recommending extraction to `src/types/api.ts` when a second paginated feature is added.
2. Extract immediately to `src/types/api.ts` as part of Task 2. More work than MVP requires but future-proof.

**Recommended Solution:** Option 1 — add a note in the feature document's Risk Assessment section. Do not extract yet (premature optimization for a single usage).

**Decision:** Refined Option 1 — defer extraction and **add a Risk-Assessment note** recommending that `PageableRequest`, `PageEnvelope<T>`, `SortRequest`, `FilterRequest`, and `FilterOperationRequest` be lifted together into `src/types/api.ts` (matching the existing `src/types/auth.ts` shared-type precedent) **when a SECOND paginated frontend feature is added** — the moment the seam becomes real (two adapters). Keep the shared schemas feature-local inside `src/features/employees/types.ts` for now because the Employee page is the **first** and only paginated frontend caller, so immediate extraction would create a shared module around a single consumer (a hypothetical seam, rejected by the deletion test and the "one adapter = hypothetical seam" rule). Pair the deferral note with two low-cost anti-drift anchors at the exact drift site inside §3: (a) a marker comment above the local `PageableRequest` declaration pointing to the canonical backend contract `documentation/Docs/API-Reference/_Shared-Schemas.md` (so a future editor is warned this mirrors a backend-wide schema, not an employee-local shape); (b) an intentional-partial-view note above `PageEnvelope<T>` framing its omission of `numberOfElements`/`pageable`/`sort` as a deliberate consumer-side projection of fields the employee feature never reads (so a future developer does not "complete" the envelope and couple the feature to unused fields). Doc/spec-only; no code, test, or build churn. Rationale: it preserves the sound seam-discipline deferral (extract on the second caller) while closing Option 1's two gaps at near-zero cost — Option 1's note alone lives far from the declaration where drift is actually introduced, and does not address the partial-envelope divergence at all; the marker comment and partial-view note anchor the two risks at the exact line of copy-paste drift. Option 2 (extract now into `src/types/api.ts` as part of Task 2) was rejected by all three analysis subagents: it violates the single-caller deletion test, contradicts §3's explicitly feature-local type declarations, churns §3/§4/§6 and the Task 2 spec, and is premature for a self-admitted "No immediate impact" Low finding. Decision date: 2026-06-27. Parent document patched: Yes (Implementation Architecture §3 — PageableRequest marker comment + PageEnvelope intentional-partial-view note; Risk Assessment — cross-cutting-schema deferral note with extraction trigger). Solution-analysis subagents: Option 1 ×1, Option 2 ×1, alternative ×1 (read-only, parallel); the alternative was confirmed materially better than plain Option 1 and adopted.

---

## Findings Summary Table

| # | Title | Severity | Status |
|---|-------|----------|--------|
| 1 | Select `onValueChange` produces strings; page size and enabled filter require type coercion (premise corrected per ADR-010 — resolved via typed Base UI `Value`) | 🟠 High | Done |
| 2 | `TooltipProvider` required by `@base-ui/react` but absent from component tree (premise false per ADR-010 + Base UI docs + sidebar.tsx evidence — Tooltip renders standalone; Provider is optional shared-delay only) | 🟡 Moderate | Auto-resolved |
| 3 | Error state from `useEmployeeList` never rendered in `EmployeesPage` (resolved via error-replacement render in EmployeesPage + hook error-lifecycle spec) | 🟡 Moderate | Done |
| 4 | Boolean `false` filter value is falsy; hook must guard with `!== null` exclusively (resolved via documented `!== null` guard + discriminating `enabled=false`→EQUALS predicate test) | 🟡 Moderate | Done |
| 5 | Debounce tests require `vi.useFakeTimers()` — not mentioned in Testing Decisions (resolved via Test-harness note + async `advanceTimersByTimeAsync` in Testing Decisions + Task 3 echo) | 🟢 Low | Done |
| 6 | `EmployeesPage` described as "no logic" but has inline conditional logic (resolved via consistent §9 Purpose + Testing Decisions rewording enumerating the view-layer render conditions — pagination disabled guards, `Math.max` page-label guard, pluralization, Finding-3 error-branch ternary; doc-only) | 🟢 Low | Done |
| 7 | `PageableRequest` is feature-local but is a cross-cutting backend schema (resolved via defer-extraction Risk-Assessment note + §3 marker comment anchoring the local `PageableRequest` to `_Shared-Schemas.md` + intentional-partial-view note on `PageEnvelope<T>`; extract to `src/types/api.ts` on the second paginated feature) | 🟢 Low | Done |

---

## Affected Documentation

- [[Features/to-do/Admin-Employee-Management-Page]] — the feature document under review; findings 1–7 all require patches to this document before task creation
- [[Docs/API-Reference/Employee]] — relevant for Finding 1 (boolean EQUALS predicate behavior) and the CORS PATCH note
- [[Docs/API-Reference/_Shared-Schemas]] — relevant for Finding 7 (PageableRequest is a shared backend schema)
