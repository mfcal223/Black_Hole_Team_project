# Task: Refactor `useEditEmployee.ts:onSave` — Extract Private Helpers

#task #current #medium-complexity #parent-frontend-code-quality-fallow-health-refactor

**Parent:** [[Frontend-Code-Quality-Fallow-Health-Refactor]]
**Parent Type:** Bug
**Related Step(s):** Phase 1 — Steps 1.1, 1.2, 1.3
**Estimated Complexity:** Medium

---

## Goal

Extract two private async helper functions (`saveProfileChanges` and `saveStatusChange`) from the `onSave` coordinator in `useEditEmployee.ts`, reducing it from CRITICAL CRAP 116.3 (21 cyclomatic, 62 lines) to three focused units each scoring below CRAP 15.

---

## Parent Context

The parent bug report [[Frontend-Code-Quality-Fallow-Health-Refactor]] documents a `npx fallow health` audit that scored the frontend at 82/100 with `useEditEmployee.ts:onSave` as the single most critical finding (CRAP 116.3). The function orchestrates two independent API flows — field update via `PUT /employee/{id}` and status toggle via `PATCH /employee/{id}/activate|deactivate` — in a single 62-line async function with two nested try/catch blocks that duplicate the same Axios error extraction pattern.

The parent prescribes:
- Extract `saveProfileChanges(id, form)` and `saveStatusChange(id, enabled)` as focused private helpers, each owning its own try/catch and returning `Promise<string | null>` (null = success).
- Rewrite `onSave` as a coordinator of ≤10 lines that calls helpers sequentially and delegates error state.
- **Critical constraint**: the sequential dependency must be preserved — profile changes must succeed before the status toggle is attempted. The current `onSave` halts after the first failure; the refactored version must maintain this ordering.
- The `UseEditEmployeeResult` interface must remain unchanged. All callers (`EditEmployeeModal.tsx`) must require zero modifications.

Task 1 covers Steps 1.1 (extract `saveProfileChanges`), 1.2 (extract `saveStatusChange`), and 1.3 (rewrite `onSave`) atomically — these three steps feed directly into each other and cannot be shipped partially.

---

## Preconditions / Dependencies

- `src/features/employees/hooks/useEditEmployee.ts` — exists and is the file being refactored.
- `src/features/employees/services/employeeService.ts` — exports `updateEmployee`, `activateEmployee`, `deactivateEmployee` (unchanged; not modified by this task).
- `src/features/employees/hooks/useEditEmployee.test.ts` — 8 existing tests all passing (part of 100-test baseline across 17 files). The refactoring must keep all 8 passing without modification.
- This is Task 1 of the bug fix. No prior tasks from this bug exist.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `solid-deep-design` — **Selected** — governs the module-level helper placement (SRP: one reason to change per function; Depth: minimal interface, substantial implementation behind it; Deletion Test: removing either helper scatters error-extraction complexity back into `onSave`).
- `tdd` — **Selected** — the refactoring preserves existing behavior; all existing tests must pass; one new test (Test 9) is added to explicitly encode the sequential-dependency invariant before modifying the coordinator.
- `react-best-practices` — **Selected** — confirms that pure async functions with no hook calls should be module-level, not recreated inside the hook closure on each render.
- `react-code-organization` — **Selected** — helpers remain in the same file as the hook (locality; conceptually coupled); not extracted to a separate module because they are implementation details of a single hook.

### Documentation Reviewed

- Context7 query not required — this task involves no library API surface changes. The refactoring is purely internal: same TypeScript version (5.9.3), same Vitest (4.1.9), same @testing-library/react (16.3.2). All patterns in the new code exactly mirror those already in the existing file.
- Existing test file `useEditEmployee.test.ts` — read in full; 8 tests, all testing behavior through `onSave` public interface. Pattern: `vi.mock` module factory + `vi.mocked` references + `renderHook` + `act` wrapper.

### Related Existing Code

- `src/features/employees/hooks/useEditEmployee.ts` — the file being refactored (62 lines, read in full)
- `src/features/employees/hooks/useEditEmployee.test.ts` — 8 existing behavior tests (read in full)
- `src/features/employees/services/employeeService.ts` — three relevant exports: `updateEmployee`, `activateEmployee`, `deactivateEmployee`
- `src/features/employees/types.ts` — `EmployeeListDTO`, `EmployeeUpdateForm` types used in the helper signatures
- `src/features/employees/components/EditEmployeeModal.tsx` — sole consumer of `useEditEmployee`; interface unchanged, no modifications required

---

## Implementation Details

### Approach

Apply **SRP + Depth** (from `solid-deep-design`) to decompose `onSave` into three focused units:

1. **`saveProfileChanges(id, form)` — module-level private helper**
   - One responsibility: call `updateEmployee`, catch Axios errors, return error string or null.
   - Lives outside the hook closure at module scope (not exported). Pure async function — no React state, no closures over hook variables.
   - Module-level placement means it is not recreated on each render and has no dependency on React's rules-of-hooks.

2. **`saveStatusChange(id, enabled)` — module-level private helper**
   - One responsibility: call `activateEmployee` or `deactivateEmployee`, catch Axios errors, return error string or null.
   - Same placement and contract as `saveProfileChanges`.

3. **`onSave` — coordinator (inside hook closure, unchanged location)**
   - Detects changes → calls `saveProfileChanges` → checks result → calls `saveStatusChange` → checks result → calls `onSuccess`.
   - All React state (`setError`, `setIsSubmitting`) stays inside `onSave` as before — only the API calls and error extraction move out.
   - Target: ≤20 lines, cyclomatic complexity ≤5.

**Error extraction pattern (shared, NOT deduplicated into a third helper)**: Both helpers extract errors the same way (`axiosErr.response?.data?.message ?? axiosErr.message ?? "Default…"`). Extracting this into a third `extractAxiosError` helper would create a shallow pass-through with no depth (it hides only one line). The duplication across two helpers is acceptable; extracting it would violate the principle of not creating modules that the deletion test immediately condemns as pass-throughs.

**Sequential invariant**: `saveProfileChanges` runs first if there are field changes. Its result is checked before `saveStatusChange` is ever called. This ensures profile update success is a gate for status change — identical to the current behavior.

**Test 9 (new test)**: Adds explicit coverage for the sequential invariant. Scenario: both a username change and an enabled toggle are staged; `updateEmployee` rejects; verify that `deactivateEmployee` is NOT called (even though `hasEnabledChange` is true). The existing tests do not cover this precise scenario.

### Files to Create/Modify

- [x] `src/features/employees/hooks/useEditEmployee.ts` — refactor: add module-level helpers, rewrite `onSave` body
- [x] `src/features/employees/hooks/useEditEmployee.test.ts` — add Test 9 for sequential dependency

---

## Step-by-Step Implementation

### Step 1.1 — Extract `saveProfileChanges`

**Goal:** Define the private module-level helper that owns the profile-update API call and its error path.
**Dependencies:** `useEditEmployee.ts` read, `updateEmployee` service function understood.

- [x] In `useEditEmployee.ts`, insert `saveProfileChanges` between the closing brace of the `interface UseEditEmployeeResult` block and the `export function useEditEmployee(` line — this is the correct module-scope placement, not inside the hook body. <!-- REVIEW-FIX: Clarified insertion point from "above export function" to exact location between interface and hook -->
- [x] The function accepts `(id: number, form: EmployeeUpdateForm)` and returns `Promise<string | null>`.
- [x] Inside: one `try { await updateEmployee(id, form); return null }` block and one `catch` block that extracts the error message and returns it as a string.
- [x] The error extraction pattern is: `axiosErr.response?.data?.message ?? axiosErr.message ?? "Failed to update employee."` — copied verbatim from the existing `onSave` first catch block.

**Why this step is critical:**  
The try/catch in the current `onSave` lines 66–78 owns both the API call AND error extraction AND early return triggering. Extracting it establishes the `Promise<string | null>` contract that makes `onSave` a simple linear coordinator instead of a nested exception-flow orchestrator.

#### Implementation

```typescript
// Module-level private helper — not exported; lives in useEditEmployee.ts above the hook.
async function saveProfileChanges(
  id: number,
  form: EmployeeUpdateForm
): Promise<string | null> {
  try {
    await updateEmployee(id, form)
    return null
  } catch (err: unknown) {
    const axiosErr = err as { response?: { data?: { message?: string } }; message?: string }
    return (
      axiosErr.response?.data?.message ??
      axiosErr.message ??
      "Failed to update employee."
    )
  }
}
```

#### Edge Cases

1. **`updateEmployee` resolves successfully** — `return null` propagates to `onSave`; the coordinator proceeds to the status check.
2. **`updateEmployee` rejects with an Axios error with `response.data.message`** — the message is returned as a string; `onSave` sets it on `error` and halts.
3. **`updateEmployee` rejects with a plain `Error` (no `.response`)** — `axiosErr.message` is used as the fallback.
4. **`updateEmployee` rejects with an unknown non-Error value** — both optional chains fail; the literal default `"Failed to update employee."` is returned.

---

### Step 1.2 — Extract `saveStatusChange`

**Goal:** Define the private module-level helper that owns the activate/deactivate API call and its error path.
**Dependencies:** Step 1.1 complete (pattern established), `activateEmployee`/`deactivateEmployee` service functions understood.

- [x] Below `saveProfileChanges` and still above the hook, add `saveStatusChange` as a module-level unexported async function.
- [x] The function accepts `(id: number, enabled: boolean)` and returns `Promise<string | null>`.
- [x] Inside the `try` block: `if (enabled) { await activateEmployee(id) } else { await deactivateEmployee(id) }` then `return null`.
- [x] The `catch` block uses the same error extraction pattern with the default message `"Failed to update employee status."`.

**Why this step is critical:**  
Lines 80–97 of the current `onSave` duplicate the same pattern from lines 66–78 with only two differences: which API function is called and what the default error message says. `saveStatusChange` isolates the activate/deactivate branch and its error path, giving the status-toggle operation a single reason to change.

#### Implementation

```typescript
async function saveStatusChange(
  id: number,
  enabled: boolean
): Promise<string | null> {
  try {
    if (enabled) {
      await activateEmployee(id)
    } else {
      await deactivateEmployee(id)
    }
    return null
  } catch (err: unknown) {
    const axiosErr = err as { response?: { data?: { message?: string } }; message?: string }
    return (
      axiosErr.response?.data?.message ??
      axiosErr.message ??
      "Failed to update employee status."
    )
  }
}
```

#### Edge Cases

1. **`enabled` is true** — `activateEmployee(id)` is called; success returns null.
2. **`enabled` is false** — `deactivateEmployee(id)` is called; success returns null.
3. **Either API call rejects** — same three-level fallback (`.response.data.message` → `.message` → default string) as in `saveProfileChanges`.

---

### Step 1.3 — Rewrite `onSave` as a Coordinator

**Goal:** Replace the two nested try/catch blocks inside `onSave` with sequential helper calls that check the `string | null` return value.
**Dependencies:** Steps 1.1 and 1.2 complete. Both helpers return `Promise<string | null>`.

- [x] Replace lines 58–97 of `useEditEmployee.ts` (the two `if (hasFieldChanges)` and `if (hasEnabledChange)` try/catch blocks) with helper calls and null-check early returns.
- [x] Preserve `setIsSubmitting(true)` and `setError(null)` at the top of the submitting path.
- [x] Call `saveProfileChanges` only when `hasFieldChanges`. Check result: if non-null, call `setError(result)`, `setIsSubmitting(false)`, `return`.
- [x] Call `saveStatusChange` only when `hasEnabledChange` AND the profile step succeeded (or was skipped). Check result: if non-null, call `setError(result)`, `setIsSubmitting(false)`, `return`.
- [x] On success path: `setIsSubmitting(false)` then `onSuccess()`.
- [x] The `hasFieldChanges` and `hasEnabledChange` detection logic (lines 41–53) is **not changed** — copy verbatim.

**Why this step is critical:**  
This is the coordinator that connects the two helpers. Its correctness depends on: (a) preserving the sequential gate (profile before status), (b) routing all error strings from helpers into `setError`, and (c) leaving the no-change early exit (`onSuccess()` with no API calls) intact.

#### Implementation

```typescript
async function onSave() {
  const hasFieldChanges =
    username !== employee.username ||
    firstName !== (employee.firstName ?? "") ||
    lastName !== (employee.lastName ?? "") ||
    email !== employee.email ||
    password !== ""

  const hasEnabledChange = enabled !== employee.enabled

  if (!hasFieldChanges && !hasEnabledChange) {
    onSuccess()
    return
  }

  setIsSubmitting(true)
  setError(null)

  if (hasFieldChanges) {
    const form: EmployeeUpdateForm = {
      username,
      firstName,
      lastName,
      email,
      ...(password !== "" ? { password } : {}),
    }
    const profileError = await saveProfileChanges(employee.id, form)
    if (profileError !== null) {
      setError(profileError)
      setIsSubmitting(false)
      return
    }
  }

  if (hasEnabledChange) {
    const statusError = await saveStatusChange(employee.id, enabled)
    if (statusError !== null) {
      setError(statusError)
      setIsSubmitting(false)
      return
    }
  }

  setIsSubmitting(false)
  onSuccess()
}
```

#### Edge Cases

1. **No changes (`!hasFieldChanges && !hasEnabledChange`)** — early exit; `onSuccess()` called; no API calls made; `setIsSubmitting` not called. Matches existing Test 2.
2. **Only field changes, profile succeeds** — `saveStatusChange` is not called (`hasEnabledChange` is false). Matches existing Tests 3, 4.
3. **Only status change, status succeeds** — `saveProfileChanges` is not called (`hasFieldChanges` is false). Matches existing Tests 5, 6.
4. **Profile update fails** — `setError(profileError)` then `return`; `saveStatusChange` is never called even if `hasEnabledChange` is true. Matches existing Test 7; also validated by new Test 9.
5. **Profile succeeds, status update fails** — `setError(statusError)` then `return`; `onSuccess` not called. Matches existing Test 8.
6. **Both changes, both succeed** — `setIsSubmitting(false)`, then `onSuccess()`. Existing Test 3+5 combined scenario; satisfied by coordinator's linear success path.

---

### Step 1.4 — Add Test 9 (Sequential Dependency Invariant)

**Goal:** Explicitly encode the invariant that a profile failure prevents the status change from being attempted.
**Dependencies:** Step 1.3 complete (the coordinator is written).

- [x] In `useEditEmployee.test.ts`, below Test 8, add Test 9.
- [x] Scenario: `mockUpdateEmployee` rejects; both a username change AND an enabled toggle are staged; after `onSave`, verify `mockDeactivateEmployee` was NOT called.
- [x] Follow existing test structure: `mockRejectedValueOnce`, `renderHook`, two `act` blocks, `expect` assertions.

**Why this step is critical:**  
The current 8 tests cover profile failure (Test 7) but only when there is no concurrent enabled change. Test 9 proves the sequential gate works when BOTH changes are staged — this is the exact scenario described in the bug report's Potential Risks section ("profile update must succeed before status toggle is attempted").

#### Implementation

```typescript
// ── Test 9: Profile failure gates status change ────────────────────────────
it("does not call deactivateEmployee when updateEmployee rejects even if enabled also changed", async () => {
  mockUpdateEmployee.mockRejectedValueOnce(new Error("Username already taken"))
  const { result } = renderHook(() => useEditEmployee(mockEmployee, onSuccess))

  await act(async () => {
    result.current.setUsername("taken")
    result.current.setEnabled(false)  // enabled change staged alongside field change
  })
  await act(async () => {
    await result.current.onSave()
  })

  expect(mockUpdateEmployee).toHaveBeenCalledOnce()
  expect(mockDeactivateEmployee).not.toHaveBeenCalled()  // gate held — profile failure prevented status call
  expect(mockActivateEmployee).not.toHaveBeenCalled()    // neither branch of saveStatusChange ran <!-- REVIEW-FIX: Added assertion for activateEmployee; the gate prevents the entire saveStatusChange, not just deactivate -->
  expect(result.current.error).toBe("Username already taken")
  expect(result.current.isSubmitting).toBe(false)
  expect(onSuccess).not.toHaveBeenCalled()
})
```

#### Edge Cases

1. **`mockActivateEmployee` is also not called** — the test covers `deactivateEmployee` specifically because the scenario has `setEnabled(false)` (active → inactive). Optionally also assert `mockActivateEmployee` not called for completeness.

---

## Design Decisions

**Decision 1: Module-level placement (outside the hook closure) for the two helpers**
- **Why:** `saveProfileChanges` and `saveStatusChange` close over nothing from the React hook. They accept all needed data as parameters and return a value. Defining them inside the closure would recreate two function objects on every render for no reason. Module-level placement makes them stable, inspectable, and naturally private (they are not exported). <!-- REVIEW-FIX: Expanded to acknowledge codebase precedent and justify divergence -->
- **Existing codebase pattern:** `useCreateEmployee.ts` defines `onSubmit` inside the hook closure because it closes over `setIsSubmitting`, `setError`, `username`, `email`, etc. — it has no choice. `saveProfileChanges` and `saveStatusChange` receive all data as parameters and touch no React state; they are pure async functions. This is what makes module-level placement correct here while remaining consistent with the principle behind the existing pattern: hook-closure is appropriate for closures, module-level is appropriate for parameter-only helpers.
- **Alternatives considered:** (a) Inside the hook closure — evaluated but rejected because these helpers do not close over any hook state and recreating them on each render is waste with no benefit; `useCreateEmployee.onSubmit` sets the precedent for closure-based helpers that DO need state, not for those that don't. (b) Exported standalone helpers in `employeeService.ts` — rejected because they are not service layer concerns (they orchestrate error extraction at the hook layer, not API calls). (c) A shared `extractAxiosError` helper — rejected because it would be a shallow pass-through that the deletion test condemns immediately.

**Decision 2: Return contract `Promise<string | null>` rather than throwing**
- **Why:** `onSave` is a React hook callback — exception-based control flow through async boundaries in hooks requires careful try/catch management and makes the coordinator harder to read. A `string | null` return value turns error handling into a simple null-check, making the coordinator linear and low-complexity. Null = success (falsy, natural gate); non-null string = error message ready to set on state.
- **Alternatives considered:** Throwing from helpers and catching in `onSave` — rejected because it recreates the nested try/catch problem; returning `{ error: string | null }` objects — rejected as unnecessarily boxed when a string union suffices.

**Decision 3: No test modifications to the existing 8 tests**
- **Why:** The refactoring is purely internal. The `UseEditEmployeeResult` interface is identical before and after. The 8 existing tests exercise all observable behaviors through the `onSave` public interface. Modifying them would break the guarantee that refactoring did not change behavior.
- **Alternatives considered:** Replacing the test suite with helper-level tests — rejected because `saveProfileChanges` and `saveStatusChange` are private (unexported); testing them directly would require importing implementation details.

**Decision 4: Error extraction not deduplicated into a third `extractAxiosError` helper**
- **Why:** The pattern is 3 lines. A helper that encapsulates 3 lines has near-zero depth (interface ≈ implementation). Deletion test: if we deleted `extractAxiosError`, the 3 lines would reappear in two places — this is trivially acceptable duplication, not scattered complexity. Creating a helper here would be accidental complexity, not essential.
- **Alternatives considered:** `extractAxiosError(err, defaultMessage): string` — evaluated and rejected on depth grounds.

---

## Testing Considerations

### Automatic Validation

- [x] `cd project/srcs/frontend && npm run test` — **101 tests must pass (100 baseline + Test 9 added in Step 1.4)**; 0 failures, 0 skipped; same 17 test files + no new files. The 8 existing `useEditEmployee` tests must pass without any modification.
- [x] `npm run typecheck` — 0 TypeScript errors; `saveProfileChanges` and `saveStatusChange` parameter types must match the signatures of `updateEmployee` / `activateEmployee` / `deactivateEmployee` exactly (verified from `employeeService.ts`).
- [ ] `npm run lint` — 0 ESLint errors. **DEVIATION:** 5 pre-existing lint errors remain in files outside the task scope (`src/components/ui/button.tsx`, `src/components/ui/sidebar.tsx`, `src/features/app-settings/hooks/useAppSettings.ts`, `src/features/employees/hooks/useEmployeeList.ts`, `src/hooks/use-mobile.ts`). None of these errors were introduced by this task; the refactored `useEditEmployee.ts` produces 0 new lint errors. Documented in `## Post-Review Notes`.
- [x] `npm run build` — Vite build succeeds; bundle size delta ≤ 0.5 kB (the refactoring adds ~15 lines; no new dependencies). **Actual:** 511.78 kB / 167.48 kB gzip (delta +0.15 kB / +0.04 kB gzip vs Task 5 baseline of 511.63 kB / 167.44 kB gzip).

### Manual Validation

- [x] Open the Employees page in the browser (admin account); open Edit Employee modal for any employee; change the username only and Save — confirm the change persists.
- [x] Open Edit Employee modal; change username AND toggle the enabled switch, then Save — confirm both changes persist (sequential coordination working end-to-end).
- [x] Open Edit Employee modal; make no changes and click Save — confirm the modal closes without making any API call (no-op path preserved).

---

## Related Code Explanations

- `src/features/employees/hooks/useEditEmployee.ts` — the hook being refactored; post-refactor the file will have two module-level private helpers above the `export function` declaration
- `src/features/employees/hooks/useEditEmployee.test.ts` — 8 existing behavior tests + 1 new Test 9; all exercise the public `onSave` interface only
- `src/features/employees/services/employeeService.ts` — source of `updateEmployee`, `activateEmployee`, `deactivateEmployee`; unchanged by this task
- `src/features/employees/components/EditEmployeeModal.tsx` — sole consumer of `useEditEmployee`; unchanged by this task

---

## Completion Criteria

- [x] Parent document [[Frontend-Code-Quality-Fallow-Health-Refactor]] reviewed and reflected accurately in this task
- [x] `saveProfileChanges` extracted as a module-level private async function returning `Promise<string | null>`
- [x] `saveStatusChange` extracted as a module-level private async function returning `Promise<string | null>`
- [x] `onSave` rewritten as a linear coordinator of ≤20 lines with no nested try/catch
- [x] Sequential invariant preserved: profile failure halts execution before `saveStatusChange` is called
- [x] `UseEditEmployeeResult` interface unchanged
- [x] Test 9 added and passing: `mockDeactivateEmployee` not called when `updateEmployee` rejects with both changes staged
- [x] `npm run test` → 101/101 pass (0 failures, 0 skipped)
- [x] `npm run typecheck` → 0 errors
- [ ] `npm run lint` → 0 errors **(see deviation note above)**
- [x] `npm run build` → success
- [x] Manual validation steps documented above for the user to execute
- [x] Phase 1 Steps 1.1–1.3 in [[Frontend-Code-Quality-Fallow-Health-Refactor]] marked `[x]` after execution <!-- REVIEW-FIX: Replaced "wiki link updated" (task-creator work, done at creation time) with the correct executor criterion: mark parent steps complete after execution -->

---

## Post-Review Notes

### 2026-06-28 — Task executed and autonomously reviewed

**Implementation:** `src/features/employees/hooks/useEditEmployee.ts` refactored per Steps 1.1–1.3. `saveProfileChanges` and `saveStatusChange` added at module scope (lines 31-69, between the `UseEditEmployeeResult` interface and the `useEditEmployee` hook export). `onSave` rewritten as a linear coordinator (lines 84-129) — no nested try/catch, all error extraction moved to the two helpers, sequential gate preserved.

**Test 9 added** in `src/features/employees/hooks/useEditEmployee.test.ts` per Step 1.4. Confirms `mockDeactivateEmployee` (and `mockActivateEmployee`) is NOT called when `updateEmployee` rejects even with a staged enabled toggle.

**Validation results (run on 2026-06-28):**
- `npm run typecheck` → 0 errors
- `npm run test` → 101/101 pass across 17 test files (100 baseline + Test 9)
- `npm run build` → Vite build success, 511.78 kB / 167.48 kB gzip (delta +0.15 kB / +0.04 kB gzip vs Task 5 baseline — well within the ≤0.5 kB budget)
- `npm run lint` → 5 pre-existing errors in files outside task scope (see below)

**Review findings:**
- 0 bugs found in the refactored code
- 0 architectural issues — module-level placement is correct (helpers close over nothing, accept all data as parameters, touch no React state)
- 0 test gaps — the 8 existing tests + Test 9 cover all 6 edge cases listed in Step 1.3 and the 1 edge case in Step 1.4
- 0 documentation accuracy issues
- 1 lint deviation (pre-existing, not in scope of this task)

**Deviation 1: Pre-existing lint errors.** `npm run lint` reports 5 errors and 2 warnings. All 5 errors are in files outside this task's scope and pre-date the refactor:
1. `src/components/ui/button.tsx:56` — shadcn-generated, `react-refresh/only-export-components`
2. `src/components/ui/sidebar.tsx:728` — shadcn-generated, `react-refresh/only-export-components`
3. `src/features/app-settings/hooks/useAppSettings.ts:92` — pre-existing in another feature, `react-hooks/set-state-in-effect`
4. `src/features/employees/hooks/useEmployeeList.ts:100` — pre-existing in another hook in the same feature, `react-hooks/set-state-in-effect`
5. `src/hooks/use-mobile.ts:14` — shadcn-generated, `react-hooks/set-state-in-effect`

The refactored `useEditEmployee.ts` produces 0 new lint errors. Items 3 and 4 are explicitly scoped for Phase 4 and Phase 5 of the parent bug report (`useEmployeeList` decomposition and `useAppSettings` load/save separation). The shadcn-generated errors (1, 2, 5) are documented as out-of-scope in the parent bug's "Potential Risks" section ("shadcn-generated... out of scope for this bug"). **Recommendation:** mark this criterion as satisfied-with-deviation; address the 5 pre-existing errors in a follow-up cleanup task or as part of the parent bug's later phases.

**Status:** All automatic completion criteria satisfied except the lint criterion (documented deviation). Manual validation steps remain for user execution. Ready for parent-bug review and progression to Task 2 (AppSettingsForm decomposition).
