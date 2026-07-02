# Task: Fix Default Model Initialization Race

#task #current #medium-complexity #parent-app-settings-default-model-select-display-and-persistence

**Parent:** [[App-Settings-Default-Model-Select-Display-and-Persistence]]
**Parent Type:** Bug
**Related Step(s):** Phase 2 - Step 2.1, Step 2.2; Task 2 from parent breakdown
**Estimated Complexity:** Medium

---

## Goal

Fix the initialization race in `useAppSettings` so a saved default model is restored into the General Settings selector on page load instead of always resetting to "No default model". Add a hook-level regression test that reproduces the race (settings resolves before the external model list arrives) and proves the saved default is eventually restored once models load.

---

## Parent Context

The parent bug reports two App Settings default-model defects. Task 2 addresses **Bug 2**: even after an admin saves a default model, refreshing `/app-settings` always shows `"No default model"` even though the backend persists it correctly.

The parent's confirmed root cause: `AppSettingsPage` instantiates `useSystemModels()` (whose `models` state starts as `[]`) and feeds `systemModels.models` into `useAppSettings({ models })`. Both `GET /app-settings` and `GET /llm-model` are concurrent; `/app-settings` resolves first, so the re-derive effect `[externalModels, settings]` fires while `externalModels` is still `[]`. Inside `!modelInitializedRef.current`, the hook sets `modelInitializedRef.current = true` **before** checking whether `newEnabled` has any models. With `newEnabled = []`, the backend `defaultModel.id` cannot match, so initialization returns `null` and — critically — trips the one-shot gate. When models subsequently arrive, the effect only clamps (leaves `null` unchanged). The saved default is never restored.

The parent's proposed fix defers initialization when `defaultId !== null && newEnabled.length === 0` (a backend default exists but models have not loaded yet), retrying on the next `externalModels` change without tripping the ref. The fix preserves all four documented cases: no backend default (`null`), default + models-deferred, default + models-present, and the all-models-disabled / stale-disabled-default clamp.

This task does **not** touch Bug 1 (Select trigger labels) — that was Task 1 and is already implemented (`130/130` test baseline). The hook's public interface (`UseAppSettingsResult`) is unchanged, the save path is unchanged, and the no-arg `useAppSettings()` fetch path is unchanged.

---

## Preconditions / Dependencies

- Documentation system is initialized under `documentation/`; tasks live in `documentation/Tasks/current/`.
- Parent bug exists at `documentation/Bugs/to-do/App-Settings-Default-Model-Select-Display-and-Persistence.md`.
- **Task 1 is implemented** (Bug 1 trigger labels): `documentation/Tasks/current/App-Settings-Default-Model-Select-Display-and-Persistence-task-1-fix-select-trigger-display.md`. Task 1 made no changes to `useAppSettings.ts`; the race described here is still present in the hook.
- Current frontend test baseline is **`130/130` across 23 files** with `npm --prefix project/srcs/frontend run test -- --run`. After this task the expected baseline is `131/131` (one new hook test added, no other suite changes).
- `useAppSettings.ts` already supports the optional `models?: LlmModelDTO[]` prop (`UseAppSettingsOptions`) and the re-derive effect keyed on `[externalModels, settings]` with `modelInitializedRef`. This task modifies only the initialization branch of that effect.
- `useSystemModels.ts` initializes `models = []` on first render — this is correct React behavior and the precondition for the race; this task must not change it.
- `@base-ui/react@1.5.0` is installed; this task does not touch Base UI primitives.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` - Selected - verified documentation structure, Task template, status directory (`Tasks/current/`), naming convention, and required tags.
- `memory-bank` - Selected - loaded all Memory Bank files for project architecture, active App Settings focus, test baseline, Base UI/shadcn decision history, and asynchronous fetch-then-effect quirks (Tech.md `@base-ui/react@1.5.0`, Vitest 4.1.9 + `@testing-library/react` 16.3.2 testing patterns).
- `glossary-management` - Selected - glossary CLI runtime is available, but the JSON index is currently empty (see `known-issues.md`), so `glossary search` returns no terms. Terminology in this task is taken from the parent bug and related feature/ADR docs: App Settings, Default LLM Model, System Model, Enabled Model, selectedDefaultModelId.
- `doc-exploration` - Selected - dispatched an exploration pass across ADRs, Features, Tasks, Docs, and Code for the App Settings domain; report cross-referenced below.
- `solid-deep-design` - Selected - used to choose a minimal, surgical change to the existing one-shot gate rather than a new ref, new effect, or a new module. The hook keeps its single responsibility and its deep interface (one entry point, full settings lifecycle behind it); the fix deepens the init-branch to absorb the race-deferral rule.
- `find-docs` - Selected - queried `@testing-library/react-testing-library` docs for `renderHook` + `rerender` with `initialProps` and async `act` to verify the test pattern against version 16.x behavior.
- `tdd` - Selected - task plan is a single vertical RED -> GREEN cycle: write the discriminating race test first (fails against the buggy init branch), then apply the defer guard (test passes).
- `task-reviewer` - Selected - this Task document must be reviewed and patched after creation.

### Documentation Reviewed

- **[[App-Settings-Default-Model-Select-Display-and-Persistence]]** - parent bug; confirmed Task 2 covers Step 2.1 (defer guard) and Step 2.2 (race regression test). Proposed fix code is at parent lines 148-169; exact line references for the buggy effect are at parent lines 99, 188-190, 217-219.
- **[[ADRs/ADR-007-admin-curated-llm-model-list|ADR-007]]** - default model options come from the admin-curated, **enabled-only** model catalog. The fix must preserve the `isEnabled === true` filter and the clamp-to-null-on-disabled-default rule.
- **[[ADRs/ADR-009-long-primary-key-for-all-entities|ADR-009]]** - backend entity IDs are `Long`; frontend mirrors as numeric `id`. `defaultId` comparisons and `newEnabled.some((m) => m.id === defaultId)` are numeric; the defer guard's `defaultId !== null` check operates on `number | null`.
- **[[ADRs/ADR-010-base-ui-over-radix-ui-for-frontend|ADR-010]]** - Base UI is the chosen primitive library; inherited from Task 1, not directly modified by this hook fix.
- **[[ADRs/ADR-005-no-user-settings-entity|ADR-005]]** - confirms `defaultModel` is platform-level `AppSettings` (not per-user), so restoration-from-backend on load is the correct behavior this task restores.
- **[[Features/done/Admin-App-Settings-Page]]** - original owner of `useAppSettings`; defines the load/initialization contract Task 2 must preserve: "Init `selectedDefaultModelId` to `settings.defaultModel.id` only if it appears in the enabled list; otherwise null."
- **[[Features/done/Admin-LLM-Model-Catalog-Page]]** - feature that introduced the 3-tab restructure and the `models?` single-source-of-truth wiring (`AppSettingsPage` -> `useSystemModels()` -> `useAppSettings({ models })`); the re-derive effect + `modelInitializedRef` (site of Bug 2) was introduced here.
- **[[Admin-LLM-Model-Catalog-Page-task-5-appsettings-tab-restructure]]** - contains the full `useAppSettings.ts` body with the exact buggy init branch; Decision 2 explains the `[externalModels, settings]` dependency choice; an old Edge Case claim that the race is handled by those deps is wrong (this is Bug 2).
- **[[Admin-LLM-Model-Catalog-Page-task-3-system-models-hook-and-tab]]** - created `useSystemModels.ts` (`useState<LlmModelDTO[]>([])`), the source of the empty `externalModels` on first render.
- **[[App-Settings-Default-Model-Select-Display-and-Persistence-task-1-fix-select-trigger-display]]** - sibling Task 1; test baseline `130/130`, no `useAppSettings.ts` changes, leaves Bug 2 to this task.
- **[[Review-Admin-LLM-Model-Catalog-Page]]** - Finding 2 (Option d) is the source of the `models?` single-source-of-truth decision the re-derive effect exists to serve; the effect now has the Bug 2 race.
- **[[Docs/API-Reference/AppSettings]]** - `GET /app-settings` returns `AppSettingsDTO` with nested `defaultModel: LlmModelMiniDTO | null` (id/modelId/name/isEnabled); asymmetric null semantics (`defaultModelId: null` clears the default).
- **[[Docs/API-Reference/LlmModels]]** - `GET /llm-model` returns `LlmModelDTO[]` (id/modelId/name/description/isEnabled/createdAt). `LlmModelService.getAll()` returns a Set with no guaranteed order — the hook's sort (name then modelId) is required.
- **Context7 `/testing-library/react-testing-library`** - confirms `renderHook(...)` with `initialProps`, `result`, `rerender(newProps)` (props update without resetting state), and `unmount`. `await act(async () => { ... })` and `act(() => { ... })` are used to flush state updates and effects.

### Version Information Checked

| Technology | Resolved Version | Source | Use In This Task |
|------------|------------------|--------|------------------|
| `@testing-library/react` | `16.3.2` | `package-lock.json` + Context7 docs | `renderHook`, `act`, `rerender` for the race regression test |
| React / React DOM | `19.2.6` | `package-lock.json` | hook rendering and effect scheduling |
| Vitest | `4.1.9` | `package-lock.json` | `describe`, `it`, `expect`, `vi`, `beforeEach` |
| TypeScript | `5.9.3` | `package-lock.json` | `number \| null` typing of the guard |
| `@base-ui/react` | `1.5.0` | `package-lock.json` | not modified in this task |
| axios-mock-adapter | `2.1.0` | `package-lock.json` | already configured via the existing service mock in `useAppSettings.test.ts` |
| Vite | `7.3.5` | `package-lock.json` | build validation |

### Related Existing Code

- `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.ts:100-103` - `modelInitializedRef` declaration and documented one-shot semantics.
- `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.ts:208-236` - the re-derive effect; lines `220-228` are the buggy initialization branch this task fixes.
- `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.ts:107-144` - `load()` and the mount effect (`146-196`) that set `settings` / `selectedDefaultModelId`; unchanged by this task.
- `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.ts:240-290` - `save()` post-response path; already calls `setSelectedDefaultModelId(updatedDefaultId)` explicitly and is not affected by the defer guard.
- `project/srcs/frontend/src/features/app-settings/hooks/useSystemModels.ts:23` - `useState<LlmModelDTO[]>([])` empty initial state (the race precondition).
- `project/srcs/frontend/src/pages/AppSettingsPage.tsx:16-21` - `useSystemModels()` then `useAppSettings({ models: systemModels.models })` wiring.
- `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.test.ts` - existing 12-test hook suite; fixtures (`mockSettings`, `mockModels`, `mockEnabledModel1/2`, `mockDisabledModel`) and the `vi.mock("../services/appSettingsService", ...)` block the new test reuses.

---

## Implementation Details

### Approach

Apply a surgical defer guard inside the existing `!modelInitializedRef.current` initialization branch of the re-derive effect. When a backend default exists (`defaultId !== null`) but the enabled model list is still empty (`newEnabled.length === 0`), return `prev` **without** tripping `modelInitializedRef.current`, so the effect retries on the next `externalModels` change once models have loaded. Otherwise, behave exactly as today: set the ref once and initialize from the backend default (matched against the enabled list, else `null`).

This is the smallest change that preserves every documented case:

- `defaultId === null` (no backend default) -> guard skipped (`defaultId !== null` is false) -> initialize to `null` immediately. Unchanged.
- `defaultId !== null`, models empty -> **defer** (return `prev`, ref stays `false`). Models arrive -> initialize to the correct id. **Fixed.**
- `defaultId !== null`, models present -> guard skipped (`newEnabled.length === 0` is false) -> initialize as before. Unchanged.
- All-models-disabled edge, `defaultId !== null` -> defers on every empty trigger (ref never trips); correct because no enabled model can ever be the default. When an admin later enables any model, the effect fires with a non-empty `newEnabled` and initializes to the default (if it matches) or `null`.

The test strategy is one vertical RED -> GREEN cycle: write a discriminating test that renders the hook with `models: []` and a settings fixture whose `defaultModel.id = 2`, flushes the settings-only resolution, rerenders with the populated enabled models (`[2, 3]`), and asserts `selectedDefaultModelId === 2`. Against the buggy branch the test is RED (the ref trips on the empty trigger and the saved default stays `null`); after the defer guard it is GREEN (`2` is restored on the populated trigger). The test exercises the hook through its public surface only (`result.current.selectedDefaultModelId`, `result.current.enabledModels`) and uses `rerender` to simulate `externalModels` arriving after `settings`, which is the observable trigger of the race.

### SOLID + Deep Module Design

**`useAppSettings` remains a deep module.** It already exposes one entry point (`useAppSettings(options?)`) behind which sits the entire load/derive/save/clamp lifecycle. The defer guard adds behavior inside the existing init branch, not a new public method, so the interface shrinks-to-stable (no public-surface growth). The race-deferral rule is essential complexity that belongs exactly here: the hook is the owner of "where does the persisted default come from on load".

**SRP is preserved.** The hook still has one reason to change (app-settings state orchestration). The fix refines how initialization completes; it does not introduce a second responsibility.

**OCP is honored.** The one-shot gate behavior is unchanged for every non-race case; new behavior is added by a guard clause, not by editing the clamp/post-init path. Existing 12 tests (`useAppSettings()`) continue to pass because they use the no-arg path where the re-derive effect returns early (`externalModels === undefined`).

**Deletion test.** If the defer guard were deleted, the race reappears exactly as in Bug 2: the saved default is dropped on every page load when models are not yet fetched. The guard earns its keep by closing the gap between "settings is non-null" and "models have loaded" — a gap that otherwise requires every caller of `useAppSettings({ models })` to coordinate fetch ordering, which would scatter the same race logic across the page layer.

**Rejected alternatives** (see Design Decisions): gating the whole effect on `externalModels.length > 0`; restoring from a separate `settings`-keyed effect; not completing initialization when `defaultId === null`. All either reintroduce the user-clear restoration bug the one-shot gate exists to prevent, or add accidental complexity.

### Files to Create/Modify

- [ ] `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.test.ts` - add Test 13 (race regression) using `renderHook` + `rerender`.
- [ ] `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.ts:220-228` - add the `defaultId !== null && newEnabled.length === 0` defer guard inside `!modelInitializedRef.current` and simplify the trailing return to `newEnabled.some(...)`.

---

## Step-by-Step Implementation

### Step 1: RED Test for the Initialization Race

**Goal:** Capture Bug 2 as a failing hook test before changing production code. The test simulates settings resolving before external models arrive and asserts the saved default is restored once models load.
**Dependencies:** Current `useAppSettings.ts` (buggy init branch), existing `useAppSettings.test.ts` fixtures and `vi.mock` block, `@testing-library/react@16.3.2`, Vitest 4.1.9.

- [ ] Open `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.test.ts`.
- [ ] Append a new `it(...)` (Test 13) inside the existing `describe("useAppSettings", () => { ... })` block, after Test 12. Reuse the module-level `mockSettings` (default `defaultModel.id = 2`), `mockEnabledModel1` (`id: 2`, enabled), and `mockEnabledModel2` (`id: 3`, enabled) fixtures; `mockModels = [mockEnabledModel1, mockEnabledModel2]`.
- [ ] Use `renderHook(({ models }) => useAppSettings({ models }), { initialProps: { models: [] as LlmModelDTO[] } })` so `externalModels` starts empty (the race precondition) and the hook takes the external-models mount path (`getAppSettings()` only; no `listLlmModels()` call).
- [ ] Flush the settings-only resolution with `await act(async () => { await Promise.resolve() })`. Assert `result.current.settings` equals `mockSettings` and `result.current.selectedDefaultModelId` is `null` (models not yet loaded).
- [ ] Simulate models arriving: `await act(async () => { rerender({ models: mockModels }) })`.
- [ ] Assert the discriminating outcome: `expect(result.current.selectedDefaultModelId).toBe(2)` (the saved default is restored once models are present). Also assert `result.current.enabledModels.map((m) => m.id)` contains `2`.
- [ ] Run the targeted test and confirm RED against the current buggy init branch: the assertion `toBe(2)` fails with `null` because the one-shot ref tripped on the empty trigger.

**Why this step is critical:** It pins the exact user-visible defect (saved default never restored) at the hook's public surface, reproduces the race deterministically (`externalModels` arrives after `settings`), and makes the fix verifiable without a browser. The empty-models-first load order is the precise trigger, so the test cannot pass accidentally under the buggy branch.

#### Implementation

```tsx
  // ── Test 13: Initialization race — persisted default restored when models arrive late ──
  it("restores the persisted default model id when settings resolves before external models arrive (Bug 2 initialization race)", async () => {
    // settings.defaultModel.id = 2 (from the shared mockSettings fixture).
    mockGetAppSettings.mockResolvedValueOnce(mockSettings)

    // externalModels starts empty — this is the race precondition. The hook takes the
    // external-models mount path, which calls getAppSettings() only (NOT listLlmModels()).
    const { result, rerender } = renderHook(
      ({ models }) => useAppSettings({ models }),
      { initialProps: { models: [] as LlmModelDTO[] } }
    )

    // Flush the mount effect: settings resolves while externalModels is still [].
    // The re-derive effect fires with newEnabled.length === 0.
    await act(async () => { await Promise.resolve() })

    // settings is loaded; selectedDefaultModelId stays null because models have not
    // arrived yet (the init branch must NOT trip the one-shot gate here).
    expect(result.current.settings).toEqual(mockSettings)
    expect(result.current.selectedDefaultModelId).toBeNull()

    // Models arrive (simulate useSystemModels populating after the settings fetch).
    await act(async () => {
      rerender({ models: mockModels }) // mockModels = [id 2 (enabled), id 3 (enabled)]
    })

    // The saved default (id=2) is now in the enabled list -> restored.
    expect(result.current.selectedDefaultModelId).toBe(2)
    expect(result.current.enabledModels.map((m) => m.id)).toContain(2)
  })
```

#### Edge Cases

1. **Case:** `getAppSettings` rejects during the settings-only mount path.  
   **Handling:** That path is the existing mount effect, not the re-derive effect; the re-derive effect returns early (`settings === null`) until settings loads, exactly as today. The test uses a resolving `mockSettings`, so it specifically targets the success-path race.

2. **Case:** The effect does not flush synchronously after `rerender`.  
   **Handling:** The re-derive effect has no internal `await`, so it runs synchronously after commit and `act` flushes it. If a future React/Vitest combination delays it, wrap an `await Promise.resolve()` inside the `act` callback after `rerender(...)`; do not add fake timers unless a behavior failure confirms the need.

3. **Case:** `mockListLlmModels` is invoked unexpectedly because the reader thought the external path still fetches models.  
   **Handling:** With `externalModels !== undefined`, the mount effect calls only `getAppSettings()` (see `useAppSettings.ts:113-118` and `:151-163`). `mockListLlmModels` is never called in this test; the `beforeEach` default on it is simply unused.

4. **Case:** The first assertion (`toBeNull()`) appears to pass under both the buggy and fixed code, weakening the test.  
   **Handling:** That assertion is a sanity guard, not the discriminator. The discriminating assertion is the final `toBe(2)`, which fails under the buggy branch (ref trips on the empty trigger, clamp keeps `null`) and passes under the fix (deferral keeps the ref false, the populated trigger initializes to `2`).

---

### Step 2: GREEN Fix — Defer Guard in the Initialization Branch

**Goal:** Apply the `defaultId !== null && newEnabled.length === 0` defer guard so the one-shot ref does not trip while the enabled model list is still empty.
**Dependencies:** Step 1 RED test exists and fails on current code.

- [ ] In `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.ts`, edit only the `if (!modelInitializedRef.current) { ... }` block inside the `setSelectedDefaultModelId((prev) => { ... })` updater of the re-derive effect (current lines `220-228`). Leave the clamp branch (`230-234`), the effect deps `[externalModels, settings]`, `setEnabledModels(newEnabled)`, and all surrounding code unchanged.
- [ ] Compute `defaultId` before touching the ref.
- [ ] Add the defer guard: when `defaultId !== null && newEnabled.length === 0`, `return prev` without setting `modelInitializedRef.current`, so the effect retries on the next `externalModels` change.
- [ ] After the guard, set `modelInitializedRef.current = true` and return `newEnabled.some((m) => m.id === defaultId) ? defaultId : null` (the `defaultId !== null &&` clause is no longer needed because the defer path already handled the empty-list-with-default case; when `defaultId === null`, `newEnabled.some(...)` is `false` and the result is `null`).
- [ ] Optionally extend the inline comment inside the init block so it documents the defer rule the guard implements. Do NOT edit the effect's preceding comment block (lines above the effect) — its gate/clamp description remains accurate; the only stale "race handled by `[externalModels, settings]`" claim lives in the `[[Admin-LLM-Model-Catalog-Page-task-5-appsettings-tab-restructure]]` *document*, not in this source file, and is outside this task's scope. <!-- REVIEW-FIX: Corrected the instruction — the stale claim is in the catalog Task 5 doc, not in useAppSettings.ts, so the executor should not hunt for it in the source. -->
- [ ] Run the targeted test and confirm GREEN: `npm --prefix project/srcs/frontend run test -- --run src/features/app-settings/hooks/useAppSettings.test.ts` -> Test 13 passes (and all 12 existing tests still pass).
- [ ] Run `npm --prefix project/srcs/frontend run typecheck` to confirm `defaultId: number | null` and the guard compile under `verbatimModuleSyntax` / strict settings.

**Why this step is critical:** The defer guard is the only change needed to restore the saved default. By deferring (not completing) initialization when a default exists but models are empty, the fix distinguishes "models are still loading" from "models have loaded and none match" — the exact distinction the original branch collapsed, causing the permanent `null` lock.

#### Implementation

Only the `if (!modelInitializedRef.current) { ... }` block inside the `setSelectedDefaultModelId` updater changes; the surrounding effect, deps, clamp branch, and hook body are unchanged:

```ts
    setSelectedDefaultModelId((prev) => {
      if (!modelInitializedRef.current) {
        const defaultId = settings.defaultModel?.id ?? null
        // Bug 2 — initialization race: settings can resolve while the external model
        // list is still empty (AppSettingsPage feeds useSystemModels().models, which
        // starts as []). If a backend default exists but no models have loaded yet,
        // defer initialization WITHOUT tripping the one-shot ref, so the effect retries
        // once externalModels arrives. Tripping the ref here locks selectedDefaultModelId
        // to null permanently — the saved default is never restored into the selector.
        if (defaultId !== null && newEnabled.length === 0) {
          return prev
        }
        modelInitializedRef.current = true
        // defaultId === null  -> some() is false -> initialize to null (correct).
        // models loaded       -> initialize to the matching enabled default, else null.
        return newEnabled.some((m) => m.id === defaultId) ? defaultId : null
      }

      // Post-initialization: only clamp if prev is no longer in the enabled list.
      if (prev !== null && !newEnabled.some((m) => m.id === prev)) {
        return null
      }
      return prev
    })
```

#### Edge Cases

1. **Case:** `settings.defaultModel` is `null` (`defaultId === null`), no backend default.  
   **Handling:** The defer guard's `defaultId !== null` is `false`, so it is skipped. The ref is set and `newEnabled.some(...)` over an id-less lookup is `false` -> returns `null`. Behavior is identical to today ("No default model" restores immediately). Unchanged.

2. **Case:** Backend default exists, models loaded, default is enabled (happy path).  
   **Handling:** Defer guard skipped (`newEnabled.length === 0` is false); ref set; `newEnabled.some((m) => m.id === defaultId)` is `true` -> returns `defaultId`. Unchanged.

3. **Case:** Backend default exists, models loaded, default is disabled / not in enabled list (stale FK).  
   **Handling:** Defer guard skipped; ref set; `some(...)` is `false` -> returns `null`. The disabled default is not offered in the selector. Matches ADR-007 and the original clamp-to-null rule. Unchanged.

4. **Case:** Backend default exists, `newEnabled` stays empty indefinitely (all models disabled forever).  
   **Handling:** The defer branch hits on every empty trigger; `modelInitializedRef` never trips and `selectedDefaultModelId` stays `null` (via `prev`). When an admin later enables a model, the effect fires with a non-empty `newEnabled`; the guard is skipped and initialization completes to the default (if it matches) or `null`. Correct: a disabled default cannot be the UI default.

5. **Case:** User clears the default (`setSelectedDefaultModelId(null)`) before models load.  
   **Handling:** `modelInitializedRef.current` is `false` until the populated trigger; the user's explicit `null` becomes `prev`, and the defer branch returns `prev` (`null`) on the empty trigger. On the populated trigger, the init branch initializes from the backend default to `defaultId` — same as the mount-time rule. This is the intended behavior (the user cleared before the saved default was ever applied; once models load the still-persisted backend default is the source of truth). This case is not exercised by the new test and is acceptable because it matches the documented mount-time rule.

6. **Case:** The `save()` response changes `settings.defaultModel`.  
   **Handling:** `save()` already calls `setSelectedDefaultModelId(updatedDefaultId)` explicitly (`useAppSettings.ts:269-273`) using the current `enabledModels`, bypassing the re-derive init branch. `modelInitializedRef.current` is typically already `true` after a successful load. The defer guard does not affect the save path.

7. **Case:** `useAppSettings()` is called with no args (no `models` prop).  
   **Handling:** The re-derive effect returns early at `if (externalModels === undefined || settings === null) return` (`useAppSettings.ts:209`). The defer guard is never reached. All 12 existing tests use this path and remain green.

---

### Step 3: Final Validation

**Goal:** Confirm the fix passes the targeted test, the full hook suite, the full frontend suite, typecheck, lint, and build.
**Dependencies:** Steps 1-2 complete.

- [ ] Run the targeted test: `npm --prefix project/srcs/frontend run test -- --run src/features/app-settings/hooks/useAppSettings.test.ts` -> all 13 tests pass (12 existing + Test 13).
- [ ] Run the full frontend suite: `npm --prefix project/srcs/frontend run test -- --run` -> all tests pass. Expected count: `131/131` across the existing 23 files (one new `it` added to `useAppSettings.test.ts`; no new test files).
- [ ] Run `npm --prefix project/srcs/frontend run typecheck` -> zero TypeScript errors.
- [ ] Run `npm --prefix project/srcs/frontend run build` -> Vite build succeeds. The pre-existing chunk-size warning (present since before Task 1) is unrelated.
- [ ] Run targeted eslint on the touched files: `cd project/srcs/frontend && npx eslint src/features/app-settings/hooks/useAppSettings.ts src/features/app-settings/hooks/useAppSettings.test.ts` -> no new lint errors. The pre-existing `eslint-disable-next-line react-hooks/exhaustive-deps` on the mount effect is untouched and not introduced by this task.

#### Edge Cases

1. **Case:** The full suite count differs from `131/131`.  
   **Handling:** Investigate whether concurrent work landed. The correctness requirement is all tests pass, not the exact count; document any delta in post-review notes.

2. **Case:** `useAppSettings.test.ts` emits React `act()` warnings after the `rerender`.  
   **Handling:** If the assertions pass and any warning originates from async Resource fetch/scheduler internals without a behavior failure, document it in post-review notes. Do not add fake timers unless a test fails.

3. **Case:** TypeScript narrowing flags `defaultId` as possibly `null` inside `newEnabled.some((m) => m.id === defaultId)`.  
   **Handling:** Comparing `number === (number | null)` is valid; TS allows it and the result is `false` when `defaultId` is `null`. No cast is needed.

4. **Case:** The existing `eslint-disable-next-line react-hooks/exhaustive-deps` above the mount effect is accidentally flagged by the targeted eslint run.  
   **Handling:** That disable precedes the mount effect, not the re-derive effect, and is pre-existing. It is not introduced or changed by this task; leave it as-is.

---

## Design Decisions

**Decision 1: Defer inside the existing `!modelInitializedRef.current` branch (do not add a new ref or a new effect).**
- **Why:** The one-shot gate and the `[externalModels, settings]` deps are correct mechanisms; the bug is that the gate is tripped at the wrong moment. A one-line defer guard restores the intended "initialize once, when ready" semantics without changing the effect's trigger model, the deps, or the clamp path. It keeps the hook's interface and its existing tests untouched.
- **Alternatives considered:** A new `modelsLoadedRef` ref consulted before initialization -> rejected as accidental complexity (a second ref to coordinate against the first) that duplicates the "is there something to initialize from" check already available as `newEnabled.length === 0`. A separate `useEffect([settings])` that restores the default -> rejected because it reopens the user-clear restoration problem the one-shot gate exists to prevent, and it would double the default-derivation logic. Both trade a focused fix for broader surface area and regress risk.

**Decision 2: Gate on `defaultId !== null && newEnabled.length === 0`, not on `newEnabled.length === 0` alone.**
- **Why:** When there is no backend default (`defaultId === null`), the correct behavior is to initialize to `null` **immediately** so the UI shows "No default model" as soon as settings load — not to defer until models arrive (which would briefly show a stale loading/empty state and, worse, would never complete if the catalog is empty). Deferring only when there is something to restore (`defaultId !== null`) is the precise condition that distinguishes "models are loading" from "there is no default anyway".
- **Alternatives considered:** Always defer while `newEnabled.length === 0` -> rejected because it changes the no-backend-default case (waiting for models to show "No default model") and risks never completing in an all-disabled catalog. Initializing to `null` immediately in all empty cases (current behavior) -> rejected because it is exactly the bug.

**Decision 3: Keep the trailing return as `newEnabled.some((m) => m.id === defaultId) ? defaultId : null` (drop the `defaultId !== null &&` prefix).**
- **Why:** After the defer guard, either `defaultId === null` (then `some()` is `false` -> returns `null`) or `newEnabled.length > 0` (then `some()` decides). The `defaultId !== null` prefix is now redundant Turing-wise and removing it makes the guard's effect explicit. Behavior is identical to the parent's proposed fix (parent lines 165-166).
- **Alternatives considered:** Keep the `defaultId !== null && newEnabled.some(...)` form -> behaviorally identical but obscures that the defer path is the only reason the empty-list-with-default case is no longer reachable here. Chose the clearer form; both compile and test identically.

**Decision 4: Test the hook only, through `renderHook` + `rerender`, no private helpers.**
- **Why:** The defect is hook behavior at the public surface (`selectedDefaultModelId`, `enabledModels`). `rerender({ models })` is the exact mechanism that simulates `externalModels` arriving after `settings`; it does not reset `useState`, so the `modelInitializedRef` lifecycle is exercised realistically. Testing private helpers would couple the test to implementation and break under the refactor this fix is part of.
- **Alternatives considered:** A component-level test of `AppSettingsPage` (mount with a deferred `useSystemModels` resolve) -> rejected as higher setup cost, more brittle, and duplicative of the hook-level guarantee; the hook test is the precise seam. Manual-only validation -> rejected as the regression is cheap and deterministic to capture automatically; a manual check is still added for the end-to-end refresh behavior.

**Decision 5: Add exactly one new hook test, not a suite of race permutations.**
- **Why:** The race has one discriminating failure mode (saved default dropped when models arrive after settings) and the fix has one behavioral rule (defer when default exists but models empty). One vertical RED -> GREEN test pins that contract. The four documented cases (no default, default + models-deferred, default + models-present, all-disabled) are either covered by existing tests (no-arg path / Test 4 stale disabled default) or are qualitatively the same coordination and add confidence without new signal.
- **Alternatives considered:** A permutation matrix (default vs no-default crossed with models-before-settings vs models-after-settings vs never) -> rejected as horizontal slicing that tests imagined behavior rather than the actual regression; adds maintenance cost for no extra signal.

---

## Testing Considerations

### Automatic Validation

- [ ] Write Test 13 (race regression) in `useAppSettings.test.ts` and confirm RED before production changes: `npm --prefix project/srcs/frontend run test -- --run src/features/app-settings/hooks/useAppSettings.test.ts` -> Test 13 fails with `expected null to be 2` (one-shot ref tripped on the empty trigger).
- [ ] After applying the defer guard, rerun `npm --prefix project/srcs/frontend run test -- --run src/features/app-settings/hooks/useAppSettings.test.ts` -> all 13 tests pass (12 existing + Test 13).
- [ ] Run `npm --prefix project/srcs/frontend run test -- --run` and confirm the full suite passes. Expected: `131/131` unless concurrent work changed the count.
- [ ] Run `npm --prefix project/srcs/frontend run typecheck` and confirm zero TypeScript errors.
- [ ] Run `npm --prefix project/srcs/frontend run build` and confirm the frontend build succeeds (pre-existing chunk-size warning is unrelated).
- [ ] Run targeted eslint on touched files: `cd project/srcs/frontend && npx eslint src/features/app-settings/hooks/useAppSettings.ts src/features/app-settings/hooks/useAppSettings.test.ts` -> no new lint errors.

### Manual Validation

- [ ] Log in as Admin, navigate to `/app-settings` -> **General Settings**, select an enabled model, and click **Save settings**. Confirm the success message appears.
- [ ] Hard-refresh the page (or navigate away and back to `/app-settings`) and confirm the Default LLM Model trigger pre-selects the saved model's **name** (e.g., `GPT-4o`), not `"No default model"`.
- [ ] From the same loaded state, clear the default (choose **No default model**) and click **Save settings**. Refresh; confirm the trigger shows `No default model` (no phantom restore).
- [ ] On the **System Models** tab, disable the currently-defaulted model, then return to **General Settings**; confirm the default selector clamps to `No default model` for the disabled model and the saved default is not offered.

Manual validation is required because the user-visible symptom of Bug 2 is the post-refresh pre-selection in a real browser with a running backend; the project does not include a browser automation framework such as Playwright. The hook-level race is covered automatically by Test 13.

**Rule:** Run automatic checks when possible. If validation requires manual testing, document the steps here for the user and do not attempt to execute those manual tests yourself.

---

## Related Code Explanations

- No dedicated `documentation/Code/` explanation exists for `useAppSettings.ts`; `grep` of `documentation/Code/` for `useAppSettings` / `modelInitializedRef` / `useSystemModels` returns no matches. The inline explanation in the re-derive effect's comment block (this task refines it to document the defer rule) is the closest code explanation.
- `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.ts:208-236` - re-derive effect; the `220-228` init branch is the fix site.
- `project/srcs/frontend/src/features/app-settings/hooks/useSystemModels.ts:23` - empty initial `models` state (race precondition).
- `project/srcs/frontend/src/pages/AppSettingsPage.tsx:16-21` - wiring that passes `systemModels.models` into `useAppSettings({ models })`.
- `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.test.ts` - hook test suite; Test 13 reuses `mockSettings` / `mockModels` / the `vi.mock` service block.

---

## Completion Criteria

- [x] Parent bug reviewed and Task 2 scope (Step 2.1 + Step 2.2) reflected accurately.
- [x] All mandatory skills reviewed and documented in this Task.
- [x] Related ADRs (007, 005, 009, 010), Features (Admin-App-Settings-Page, Admin-LLM-Model-Catalog-Page), sibling Task 1, the `models?` decision Bug Report, API references, and Memory Bank context reviewed.
- [x] Version-matched dependency information recorded from `package-lock.json` (`@testing-library/react` 16.3.2, React 19.2.6, Vitest 4.1.9, TypeScript 5.9.3).
- [x] Test 13 (initialization-race regression) added to `useAppSettings.test.ts` and first confirmed RED against the buggy init branch.
- [x] `useAppSettings.ts` init branch applies the `defaultId !== null && newEnabled.length === 0` defer guard, returns `prev` without tripping `modelInitializedRef`, and otherwise restores the backend default (`newEnabled.some(...) ? defaultId : null`).
- [x] Test 13 passes after the fix; all 12 existing hook tests still pass; the full frontend suite passes (131/131).
- [x] `useAppSettings.ts` public interface (`UseAppSettingsResult`, `UseAppSettingsOptions`) is unchanged; `save()`, the mount effect, `load()`, and the no-arg fetch path are unchanged.
- [x] `useSystemModels.ts`, `AppSettingsPage.tsx`, `DefaultModelCard.tsx`, `EmployeeFilterBar.tsx`, services, routing, and backend code are unchanged.
- [x] Frontend typecheck passes (0 errors).
- [x] Frontend build succeeds (pre-existing chunk-size warning unchanged).
- [ ] Targeted eslint passes on touched files; any pre-existing unrelated lint issues are documented.
- [x] Manual validation steps documented for the user (post-refresh pre-selection in a real browser).
- [x] Task 1's responsibility (Bug 1 trigger labels) is left untouched; this task does not regress it.

## Post-Review Notes

**Status (2026-06-29): Task executed, self-reviewed, all automatic completion criteria met.**

- RED test added and confirmed RED against the buggy init branch (fails with `expected null to be 2`).
- Defer guard applied; Test 13 goes GREEN.
- Full frontend suite: **131/131** across 23 files (target count met).
- TypeScript typecheck: **0 errors**.
- Vite build: **succeeds** (538.01 kB / 175.44 kB gzip; pre-existing 500 kB chunk warning unchanged).
- **Pre-existing eslint error (out of scope):** `react-hooks/set-state-in-effect` on `setEnabledModels(newEnabled)` at `useAppSettings.ts:218`. This error is on a line that pre-existed in the re-derive effect (introduced by the LLM Catalog Task 5 work, not by this task) and was not modified by the defer guard fix. The task's Step 3 acknowledges pre-existing unrelated lint issues; this is one. The targeted eslint run surfaced it because the touched file list includes the re-derive effect's surrounding context. A future refactor could extract the enabled-list derivation into a `useMemo` to silence the warning, but it is not in scope for Bug 2.
- All four documented cases (no backend default, default + models-deferred, default + models-present, all-disabled) verified mentally against the new code; Test 13 plus the existing 12 tests cover the relevant behaviors.
- **Manual validation required.** The 4 browser-based steps in the "Manual Validation" section above must be performed by the user against a running backend to confirm end-to-end post-refresh pre-selection behavior. The hook-level race is covered automatically by Test 13.