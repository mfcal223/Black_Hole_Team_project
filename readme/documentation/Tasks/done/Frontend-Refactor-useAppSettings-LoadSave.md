# Task: Fix `react-hooks/set-state-in-effect` in `useAppSettings.ts` + Section Comments

#task #current #low-complexity #parent-frontend-code-quality-fallow-health-refactor

**Parent:** [[Frontend-Code-Quality-Fallow-Health-Refactor]]
**Parent Type:** Bug
**Related Step(s):** Phase 5 — Steps 5.1, 5.2
**Estimated Complexity:** Low

---

## Goal

Fix the pre-existing `react-hooks/set-state-in-effect` lint error in `useAppSettings.ts` by extracting a module-level pure data-fetching function and restructuring the initial-load `useEffect` to call setState only in async promise callbacks (not synchronously in the effect body). Add `// ── Load` and `// ── Save` section comments to make the already-separated concerns explicit.

---

## Parent Context

The parent bug [[Frontend-Code-Quality-Fallow-Health-Refactor]] (Phase 5, Steps 5.1 and 5.2) originally called for extracting `load()` and `save()` as clearly bounded private async helpers with their own error handling. **That structural goal was already achieved** during [[Admin-App-Settings-Page-task-2-use-app-settings-hook]]: `useAppSettings.ts` was built from scratch with `load()` (lines 41–89) and `save()` (lines 96–146) as separate private async helpers, each with their own try/catch/finally and independent state variables (`isLoading` vs `isSaving`).

**What the parent prescribes for this task:**
- **Step 5.1:** Extract `load()` into a clearly bounded private async function with its own error handling; add a section comment; if the file stays > 100 LOC post-refactor, consider a helper module.
- **Step 5.2:** Apply the same separation to `save()` — no logic overlap with `load`.

**Current state vs. parent prescription:**
- `load()` and `save()` are ALREADY separate private async helpers (SRP goal achieved).
- The file is 167 LOC — above the 100-LOC threshold. However, extracting to a helper module (`appSettingsLoader.ts`) would require passing all setState callbacks as parameters, creating a wide shallow interface. The correct action per the parent's fallback ("or at minimum extracted as clearly named private helpers") is to add section comments and keep the file intact.
- The **remaining open issues** are a `react-hooks/set-state-in-effect` lint error (line 92: `void load()` called synchronously in `useEffect`, and `load()` internally calls setState) and a stale `// eslint-disable-next-line react-hooks/exhaustive-deps` comment that now fires as an unused-directive warning.

**The same `react-hooks/set-state-in-effect` error exists in `useEmployeeList.ts:96`** (pre-existing, same pattern). That file is out of scope for this task — it should be addressed in Task 6 or a dedicated cleanup task.

---

## Preconditions / Dependencies

- Tasks 1–4 of the parent bug are complete: 109/109 tests passing, 0 typecheck errors, build success.
- `src/features/app-settings/hooks/useAppSettings.ts` — 167 lines, 12 behavioral tests covering load, save, error paths, and the security invariant (masked API key never enters `apiKeyInput`). All 12 tests serve as the regression safety net.
- `src/features/app-settings/hooks/useAppSettings.test.ts` — 12 tests using `vi.mock("../services/appSettingsService", ...)` to mock `getAppSettings`, `updateAppSettings`, and `listLlmModels`. Because the mocks target the service functions (not `load()` or any intermediate helper), any internal restructuring of the hook is invisible to the tests provided behavior is preserved.
- No new shadcn/ui components, no new routes, no caller changes.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `solid-deep-design` — **Selected** — the `fetchSettingsData()` extraction is a depth improvement: a module-level pure async function (no setState) with a minimal 0-parameter interface that hides the `Promise.all`, filter, sort, and default-model guard behind a single return value. Applying the deletion test: removing `fetchSettingsData()` would scatter the filter/sort/guard logic back into both the `useEffect` promise chain and `load()` — confirms it earns its keep.
- `tdd` — **Selected** — pure refactor; existing 12 tests are the behavioral spec. No new behavior is introduced. The TDD discipline here is "all tests pass unchanged" — no RED phase; GREEN is maintaining the current 109/109 count throughout.
- `react-best-practices` — **Selected** — the `react-hooks/set-state-in-effect` rule targets synchronous setState calls in the effect body. The fix is the React-recommended pattern: separate data-fetching (pure promise, no setState) from state application (done in `.then()/.catch()/.finally()` callbacks). The cancellation flag (`let cancelled = false`) addresses the React-documented race condition for async effects on unmounting components.

### Documentation Reviewed

- Vitest 4.1.9 — `await act(async () => { await Promise.resolve() })` pattern used by all 12 tests. The `.then()` restructuring adds one more microtask hop (the `.then()` callback), but `act()` from `@testing-library/react` is designed to flush all pending state updates and promise microtasks — timing is not affected.
- `eslint-plugin-react-hooks` v7 (project uses `eslint-plugin-react-hooks: ^7.0.1`) — the `set-state-in-effect` rule fires when a function that calls setState is called synchronously in an effect body. Calling setState inside a `.then()` or `.catch()` promise callback is NOT synchronous from the effect body's perspective and does not trigger the rule.

### Related Existing Code

- `src/features/app-settings/hooks/useAppSettings.ts:41–89` — `load()` function (private async helper, lines 41–89)
- `src/features/app-settings/hooks/useAppSettings.ts:91–94` — `useEffect` with stale eslint-disable comment (line 93)
- `src/features/app-settings/hooks/useAppSettings.ts:96–146` — `save()` function (private async helper, already clean)
- `src/features/app-settings/hooks/useAppSettings.test.ts` — 12 behavioral tests; must all pass unchanged
- `src/features/app-settings/services/appSettingsService.ts` — `getAppSettings()`, `listLlmModels()`, `updateAppSettings()` — mocked in tests; called by `fetchSettingsData()` and `save()`
- `src/features/app-settings/types.ts` — `AppSettingsDTO`, `LlmModelDTO` — used in the return type of `fetchSettingsData()`

---

## Implementation Details

### Approach

Apply **Depth** (SOLID + deep module) to separate the pure data-fetching concern from the state-application concern:

1. **Extract `fetchSettingsData()`** as a module-level pure async function (above `useAppSettings()`). It takes no parameters, calls `getAppSettings()` and `listLlmModels()`, applies the filter/sort/guard logic, and returns `{ fetchedSettings, enabledModels, initialDefaultModelId }`. It calls NO setState — it is a pure data transformer.

2. **Change `isLoading` initial state to `true`** (from `false`). The hook always starts in a loading state (initial fetch is always immediate). This eliminates the need for `setIsLoading(true)` in the `useEffect` body, removing the last synchronous setState call from the effect.

3. **Restructure `useEffect`** to call `fetchSettingsData()` (not `load()`) with a `.then().catch().finally()` chain. setState calls appear only inside the callbacks (async, not synchronous in the effect body). Add a `cancelled` flag and cleanup return for race-condition safety.

4. **Simplify `load()`** (used by `reload()`) to call `fetchSettingsData()` internally. `load()` is no longer duplicating the filter/sort/guard logic — it delegates to the pure function and applies the result with setState. `load()` still calls setState (that is fine — it is not called from inside `useEffect`).

5. **Remove stale comment** `// eslint-disable-next-line react-hooks/exhaustive-deps` (line 93). It was added when `load` was a dependency that needed suppression; now the effect neither calls `load()` nor has `load` as a dependency.

6. **Add section comments** `// ── Load` and `// ── Save` before the respective function declarations to make the structural separation explicit.

**Why `isLoading = true` as initial state is correct:**
The hook always initiates a load on mount. There is no valid "not loading" initial state — the component would flash with empty/null data before the effect fires. Starting at `true` matches the actual UI behavior (loading spinner shown immediately). The existing 12 tests only assert `isLoading = false` AFTER `await act(...)` — none assert the initial `false` value, so no test changes are needed.

**Why NOT extract to `appSettingsLoader.ts`:**
The parent bug suggests this if the file stays > 100 LOC. The file would remain ~175 LOC post-refactor (the extraction does not meaningfully shrink it). Extracting `fetchSettingsData()` to a separate module provides marginal benefit: it is not shared across features, and its callers (`useEffect` + `load()`) are in the same file. Module-level placement in `useAppSettings.ts` is sufficient for testability (mocked at the service level, not at `fetchSettingsData()`).

**Why the 12 existing tests pass unchanged:**
- Tests mock `getAppSettings`, `listLlmModels`, and `updateAppSettings` via `vi.mock("../services/appSettingsService", ...)`.
- `fetchSettingsData()` calls the same mocked functions — mocks intercept regardless of the call depth.
- `act()` from `@testing-library/react` flushes all promise microtasks. The `.then()` chain adds one microtask hop, but `act` handles it.
- The only state change visible to tests is `isLoading` starting as `true` instead of `false`. Since all tests await the load completion before asserting, the initial value is irrelevant.

### Files to Create/Modify

- [ ] `src/features/app-settings/hooks/useAppSettings.ts` — modify only (no new files)

---

## Step-by-Step Implementation

### Step 1: Extract `fetchSettingsData()` as a module-level pure function

**Goal:** Concentrate the filter/sort/guard logic behind a 0-parameter, pure async interface with no setState. Eliminate the logic duplication between the current `useEffect` approach and `load()`.
**Dependencies:** None — this is a new module-level function.

- [ ] Add the following block immediately above the `export function useAppSettings()` declaration (after the import block and after the `UseAppSettingsResult` interface):

```typescript
// ── Module-level pure data fetcher — no setState; returns structured load result ──

type SettingsLoadResult = {
  fetchedSettings: AppSettingsDTO
  enabledModels: LlmModelDTO[]
  initialDefaultModelId: number | null
}

async function fetchSettingsData(): Promise<SettingsLoadResult> {
  const [fetchedSettings, allModels] = await Promise.all([
    getAppSettings(),
    listLlmModels(),
  ])

  // Non-mutating filter + sort: spread before sorting to keep the service array immutable.
  // Sort by name (primary) then modelId (tie-breaker) for stable, deterministic order.
  // GET /llm-model does not guarantee order — never rely on insertion order for UI display.
  const enabledModels = [...allModels]
    .filter((m) => m.isEnabled === true)
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name) || a.modelId.localeCompare(b.modelId)
    )

  // Initialize selected default model only if it appears in the enabled list.
  // If the backend holds a stale disabled default model, return null rather than
  // offering a disabled model in the selector.
  const defaultId = fetchedSettings.defaultModel?.id ?? null
  const initialDefaultModelId = enabledModels.some((m) => m.id === defaultId)
    ? defaultId
    : null

  return { fetchedSettings, enabledModels, initialDefaultModelId }
}
```

**Why this step is critical:**
`fetchSettingsData()` is the seam that allows the `useEffect` to call a function that does NOT call setState. Without it, any function called synchronously in the effect body that calls setState triggers the lint rule. As a module-level function, it is also callable from `load()` without duplication.

#### Edge Cases

1. **`Promise.all` partial failure** — If `getAppSettings()` succeeds but `listLlmModels()` rejects (or vice versa), `Promise.all` rejects immediately. The caller (`useEffect` `.catch()` or `load()` catch block) handles this uniformly. No special handling needed inside `fetchSettingsData()`.
2. **Empty model list** — `listLlmModels()` returning `[]` is valid. `filter` produces `[]`, `sort` no-ops, `some(...)` returns `false`, `initialDefaultModelId = null`. All correctly handled.
3. **`defaultModel` is null** — `fetchedSettings.defaultModel?.id ?? null` safely produces `null`; `enabledModels.some(m => m.id === null)` returns `false`; `initialDefaultModelId = null`. ✓

---

### Step 2: Change `isLoading` initial state to `true`

**Goal:** Eliminate `setIsLoading(true)` from the `useEffect` body (the only remaining synchronous setState call in the effect after `load()` is replaced).
**Dependencies:** Step 1 must be complete (rationale for the change is tied to the `useEffect` restructuring).

<!-- REVIEW-FIX: Removed stale line-number reference; Step 1 adds ~25 lines above the hook so "line 37" is wrong after Step 1 completes. Locate by content instead. -->
- [ ] Find the `isLoading` useState declaration (currently `const [isLoading, setIsLoading] = useState(false)`) and change the initial value to `true`:
  ```typescript
  // Before
  const [isLoading, setIsLoading] = useState(false)
  // After
  const [isLoading, setIsLoading] = useState(true)
  ```

**Why:** The hook always starts an initial fetch on mount. `useState(true)` reflects the accurate initial state and removes the need to call `setIsLoading(true)` synchronously in the `useEffect` body. `load()` (for `reload()`) still calls `setIsLoading(true)` explicitly — that is correct for reload scenarios where the prior state may be `false`.

#### Edge Cases

1. **No test checks `isLoading = false` as initial state** — confirmed by reading all 12 tests in `useAppSettings.test.ts`. All assertions on `isLoading` occur after `await act(...)`, at which point `setIsLoading(false)` has already run.
2. **SSR / no-mount context** — Not applicable; this is a React CSR app.

---

### Step 3: Restructure `useEffect` and simplify `load()`

**Goal:** Replace `void load()` in the `useEffect` body with a `.then().catch().finally()` chain on `fetchSettingsData()`. This is the change that fixes the `react-hooks/set-state-in-effect` lint error. Add a cancellation flag for mount/unmount race safety.
**Dependencies:** Steps 1 and 2 complete.

<!-- REVIEW-FIX: Removed stale line-number range "(lines 41–94)" — after Step 1 inserts fetchSettingsData() above the hook the line range shifts. Locate the block by content (from `async function load() {` to the closing `}, [])` of the useEffect). -->
- [ ] Replace the existing `load()` function and `useEffect` block (from `async function load() {` through the closing `}, [])` of the `useEffect`) with the following. Add the `// ── Load` section comment before `load()`:

```typescript
  // ── Load ────────────────────────────────────────────────────────────────────

  async function load() {
    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const { fetchedSettings, enabledModels, initialDefaultModelId } =
        await fetchSettingsData()
      setSettings(fetchedSettings)
      setEnabledModels(enabledModels)
      setHasConfiguredApiKey(Boolean(fetchedSettings.openRouterApiKey))
      // SECURITY: apiKeyInput must stay "". Never copy the masked key into editable state.
      // The masked value ("****5678") is display-status only — it must not be submitted as a
      // PATCH value, as that would overwrite the real key with a nonsense masked string.
      setApiKeyInput("")
      setSelectedDefaultModelId(initialDefaultModelId)
    } catch (err) {
      const axiosErr = err as {
        response?: { data?: { message?: string } }
        message?: string
      }
      setError(
        axiosErr.response?.data?.message ??
          axiosErr.message ??
          "Failed to load app settings."
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    void fetchSettingsData()
      .then(({ fetchedSettings, enabledModels, initialDefaultModelId }) => {
        if (cancelled) return
        setSettings(fetchedSettings)
        setEnabledModels(enabledModels)
        setHasConfiguredApiKey(Boolean(fetchedSettings.openRouterApiKey))
        // SECURITY: apiKeyInput must stay "". Never copy the masked key into editable state.
        setApiKeyInput("")
        setSelectedDefaultModelId(initialDefaultModelId)
      })
      .catch(
        (err: {
          response?: { data?: { message?: string } }
          message?: string
        }) => {
          if (cancelled) return
          setError(
            err.response?.data?.message ??
              err.message ??
              "Failed to load app settings."
          )
        }
      )
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])
```

**Why this step is critical:**
The `react-hooks/set-state-in-effect` rule fires because `void load()` is called synchronously in the effect body and `load()` calls setState. By replacing `void load()` with `void fetchSettingsData().then(...)`, the effect body no longer calls any function that synchronously calls setState. setState is now invoked only inside the `.then()`, `.catch()`, and `.finally()` callbacks — all of which run asynchronously. The rule does not fire for setState calls inside promise callbacks.

#### Edge Cases

1. **Component unmounts before fetch completes** — `cancelled = true` is set by the cleanup function. The `if (cancelled) return` guards in `.then()` and `.catch()` prevent setState on an unmounted component. `.finally()` uses `if (!cancelled) setIsLoading(false)` for the same reason.
2. **`fetchSettingsData()` rejects (network error, 500, etc.)** — The `.catch()` handler extracts the error message and sets `setError(...)`. `isLoading` is set to `false` by `.finally()`.
3. **`setIsLoading(true)` needed for `reload()` but not for mount** — `load()` still calls `setIsLoading(true)` at the start. This is correct: `reload()` is invoked when the user manually triggers a refresh (e.g., after saving), and the previous state may be `isLoading = false`. The `useEffect` does NOT need `setIsLoading(true)` because `useState(true)` already sets the initial loading state.
4. **Security comment on `apiKeyInput`** — The `SECURITY:` comment from the original `load()` is preserved in both `load()` and the `useEffect` `.then()` callback. The invariant (masked key must not enter `apiKeyInput`) must hold in both code paths.
5. **`load()` is no longer called from `useEffect` — is `reload` correct?** — Yes. `reload: () => void load()` in the return object calls `load()` directly from a user event handler, not from inside `useEffect`. The lint rule does not apply outside effects.

---

### Step 4: Add `// ── Save` section comment

**Goal:** Mark the `save()` boundary explicitly to match the `// ── Load` comment added in Step 3.
**Dependencies:** Step 3 complete.

- [ ] Add `// ── Save ────────────────────────────────────────────────────────────────────` on the line immediately before the `async function save()` declaration. No other changes to `save()`.

**Why this step is critical:**
The parent bug's Step 5.1 mandates "mark with a section comment." Both `load` and `save` are clearly bounded private helpers; the section comments make this structure immediately legible without reading the full function bodies.

#### Edge Cases

None — this is a comment-only change with no runtime or type impact.

---

## Design Decisions

**Decision 1: Extract `fetchSettingsData()` as module-level, not as an export**
- **Why:** Module-level (not exported) because it is an implementation detail of `useAppSettings.ts`. It is not reused outside this file. Exporting it would expose an internal helper as a public API, violating OCP (callers could depend on it and resist future changes to the load strategy).
- **Alternatives considered:** (a) Keep `load()` calling setState and add `// eslint-disable-next-line react-hooks/set-state-in-effect` — rejected because it adds a suppression without fixing the root issue. (b) Extract to `appSettingsLoader.ts` — rejected because passing all setState callbacks as parameters creates a wide interface (ISP violation) and the file is a single hook's implementation, not a module to share.

**Decision 2: Change `isLoading` initial state to `true` instead of calling `setIsLoading(true)` in the effect**
- **Why:** If `isLoading` stays `false` initially, we must call `setIsLoading(true)` synchronously in the `useEffect` body — which may also trigger the `react-hooks/set-state-in-effect` rule (direct synchronous setState in effect body). Starting at `true` eliminates this call entirely. It also matches reality: the component is always loading on first mount.
- **Alternatives considered:** (a) Call `setIsLoading(true)` synchronously before the `.then()` chain in the effect — might still trigger the rule for direct setState calls in the effect body. (b) Move `setIsLoading(true)` into the `.then()` chain preamble — awkward and requires an extra `.then()` step.

**Decision 3: Duplicate setState calls between `useEffect` and `load()`**
- **Why:** The `useEffect` `.then()` callback and `load()` both apply the same result from `fetchSettingsData()` to state. This is intentional: the `useEffect` is a one-time initialization path (no `setIsLoading(true)` needed; cancellation-aware); `load()` is the reload path (needs `setIsLoading(true)`, `setError(null)`, `setSuccessMessage(null)` resets, no cancellation needed). The shared `fetchSettingsData()` call eliminates the filter/sort/guard logic duplication — only the setState application wrapper differs.
- **Alternatives considered:** Extract an `applyLoadResult(result)` helper function — viable but over-engineering for 6 setState calls. The duplication is visible and bounded; a future maintainer can easily see both paths.

**Decision 4: `save()` is unchanged**
- **Why:** `save()` does not call setState inside a `useEffect`. It is invoked from a button click handler — the lint rule does not apply. `save()` already has its own `setIsSaving` lifecycle, independent from `load()`. No refactoring is needed.

**Decision 5: `load()` is kept for `reload()` (not removed)**
- **Why:** `reload: () => void load()` is part of the `UseAppSettingsResult` public interface. Removing `load()` would require inlining the reload logic directly in the return object or restructuring the public API — a breaking change to the hook's callers. `load()` is the correct encapsulation for the reload path.

**Decision 6: Escape hatch if the rule still fires after restructuring**
- **Context:** The fix assumes `eslint-plugin-react-hooks` v7's `set-state-in-effect` rule only flags synchronous function calls in the effect body (not setState in `.then()` / `.finally()` callbacks). If a future version of the plugin broadens the rule to also flag promise-chain callbacks, the developer should add a targeted suppression on the `void fetchSettingsData()` line: `// eslint-disable-next-line react-hooks/set-state-in-effect`. This is a last resort — prefer restructuring if the rule changes behavior.
- **Alternatives considered:** Preemptively add the suppression now — rejected because the fix should actually resolve the issue, not paper over it.

---

## Testing Considerations

### Automatic Validation

- [ ] `cd project/srcs/frontend && npm run typecheck` — 0 TypeScript errors. Verify that `SettingsLoadResult` is correctly inferred and the `fetchSettingsData()` return type is compatible with the `.then()` destructuring.
- [ ] `npm run test` — 109/109 tests pass (baseline from Task 4). All 12 `useAppSettings` tests must pass without modification. No new tests are added (pure refactor; behavior is unchanged). **If any `useAppSettings` test fails due to timing** (the `.then()` chain adds one extra microtask hop vs. the original `await` inside `load()`): replace `await act(async () => { await Promise.resolve() })` with `await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })` in the failing test to give the promise chain an extra tick to settle. In practice, `@testing-library/react` 16.x's `act` flushes all React work including multi-hop microtask chains, so no test changes are expected.
- [ ] `npm run build` — Vite build succeeds. Bundle size delta ≤ +0.5 kB vs Task 4 baseline (512.93 kB).
- [ ] `npx eslint src/features/app-settings/hooks/useAppSettings.ts` — **0 errors, 0 warnings**. Specifically: no `react-hooks/set-state-in-effect` error (the rule no longer fires because `useEffect` does not call `load()` or any function that calls setState synchronously); no unused `eslint-disable` warning (the stale comment is removed).

### Manual Validation

- [ ] Start the dev server (`docker compose up` for backend + `npm run dev` for frontend). Navigate to App Settings (`/app-settings`). Confirm the page loads with a loading spinner, then populates the API key status, default model selector, and last-updated metadata.
- [ ] Refresh the page. Confirm the loading state appears briefly before settings data renders (confirms `useState(true)` initial loading state is working).
<!-- REVIEW-FIX: reload() is NOT triggered by save — AppSettingsPage and AppSettingsForm do not call reload(). The save() function updates hook state directly. Corrected to test actual save behavior. -->
- [ ] Change the default model and save. Confirm the success message ("App settings saved.") appears, the `apiKeyInput` field is cleared, and `isSaving` resets (button re-enables). The `reload()` function is NOT called by the save flow (it is a public interface member but unused by the current UI).
- [ ] (Optional) Temporarily break the backend. Confirm the error banner appears and `isLoading` is `false` (spinner gone).

---

## Related Code Explanations

- `src/features/app-settings/hooks/useAppSettings.ts:91` — `useEffect` hook body (initial load trigger)
- `src/features/app-settings/services/appSettingsService.ts` — `getAppSettings()` and `listLlmModels()` called by `fetchSettingsData()`
<!-- REVIEW-FIX: "calls reload() after successful save" was incorrect — AppSettingsPage spreads props but neither it nor AppSettingsForm uses reload(); save() updates state internally in the hook. -->
- `src/pages/AppSettingsPage.tsx` — sole consumer of `useAppSettings()`; spreads `{...appSettings}` into `AppSettingsForm`; does NOT call `reload()` (unused by current UI — `save()` updates hook state directly); unchanged by this task

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected for this task
- [x] `fetchSettingsData()` extracted as module-level pure async function with `SettingsLoadResult` return type
- [x] `isLoading` initial state changed from `false` to `true`
- [x] `load()` simplified to delegate data fetching to `fetchSettingsData()`
- [x] `useEffect` restructured to call `fetchSettingsData().then().catch().finally()` with `cancelled` flag
<!-- REVIEW-FIX: Removed stale "line 93 in original" reference — after Step 1 the line number shifts. Locate by content. -->
- [x] Stale `// eslint-disable-next-line react-hooks/exhaustive-deps` comment removed (the line that sits between `void load()` and `}, [])` in the original useEffect — removed as part of Step 3's block replacement)
- [x] `// ── Load` section comment added before `load()`
- [x] `// ── Save` section comment added before `save()`
- [x] `npm run typecheck` — 0 errors
- [x] `npm run test` — 109/109 tests pass (all 12 `useAppSettings` tests unchanged)
- [x] `npm run build` — success, bundle delta ≤ +0.5 kB
- [x] `npx eslint src/features/app-settings/hooks/useAppSettings.ts` — 0 errors, 0 warnings
- [ ] Manual validation: App Settings page loads, saves, and reloads correctly in the browser
- [x] Parent bug Phase 5 steps 5.1 and 5.2 marked `[x]`
- [x] Parent bug Task 5 link updated to `[[Frontend-Refactor-useAppSettings-LoadSave]]`
