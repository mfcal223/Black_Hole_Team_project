#high #reliability #usability

## Bug: App Settings Default Model Not Restored On Load — `id`/`modelId` Join Mismatch

### Summary

After the prior fixes for `[[App-Settings-Default-Model-Select-Display-and-Persistence]]` were applied (Bug 1 `items` prop — trigger now shows the model name; Bug 2 immediate-restore of `settings.defaultModel.id` on mount), a **residual** symptom persists in the General Settings tab: after an admin selects a default model, saves, and reloads the page (or navigates away and back), the **Default LLM Model selector shows "No default model"** even though `GET /app-settings` returns the saved default model.

The root cause is a **wrong join key**. `useAppSettings` resolves the persisted default against the live `/llm-model` enabled list by **database `id`** (`m.id === defaultId`). The `/app-settings` response embeds a **stale `LlmModelMiniDTO` snapshot** of the default (`{ id, modelId, name, isEnabled }`), not the authoritative live state. When the snapshot's `id` no longer lines up with the live `/llm-model` entry for the same model — because the model row was disabled, deleted-and-re-added (new DB `id`, same OpenRouter `modelId`), or the DB was re-seeded — `enabledModels.some((m) => m.id === defaultId)` returns `false`, and the hook's clamp branch **silently nulls** `selectedDefaultModelId` to `null`. The Base UI `Select` then renders the `{ value: null, label: "No default model" }` item, producing the symptom the admin observes.

Resolving the default by the **stable OpenRouter `modelId`** instead of the drifting database `id` fixes the symptom, and also reconciles the "stale disabled default" edge case the prior report deliberately deferred (see Known Issue: stale `defaultModel` FK after disable).

### Reproduction Conditions

1. Log in as Admin → `/app-settings` → General Settings.
2. Open the **Default LLM Model** dropdown, pick an enabled model (e.g. `Google: Gemini 3.5 Flash`), confirm the trigger shows the model **name** (Bug 1 fix works).
3. Click **Save settings**.
4. **Refresh the page** (or navigate to another area and come back to `/app-settings` → General Settings).
5. The `GET /app-settings` console log shows the expected body, e.g.:
   ```json
   {
     "id": 1,
     "openRouterApiKey": "****5e70",
     "defaultModel": {
       "id": 2,
       "modelId": "google/gemini-3.5-flash",
       "name": "Google: Gemini 3.5 Flash",
       "isEnabled": true
     },
     "updatedAt": "2026-06-29T02:39:46.208592",
     "updatedByUsername": "admin"
   }
   ```
6. **Observed failure:** the Default LLM Model selector displays `No default model`, despite `GET /app-settings` returning a `defaultModel` with `isEnabled: true`.

### Environment / Preconditions
- Admin role required.
- The affected model exists in the System Models catalog.
- The trigger resolves the inconsistency only when the `/app-settings` snapshot `id` does **not** appear in the live `/llm-model` enabled list. Two known ways to enter that state:
  - the model was **disabled** in the System Models tab after being set as default (see Known Issue: stale `defaultModel` FK — the snapshot still says `isEnabled: true` but the live row is disabled → excluded from `enabledModels`), or
  - the model row was **deleted and re-added** (or the DB re-seeded), giving the same `modelId` a **different `id`** than the one stored in `AppSettings.defaultModel`.

### Real-World Scenarios
- An admin sets `Google: Gemini 3.5 Flash` as default and saves. Later the catalog row is disabled (or re-created during a seed). On the next visit, the default appears unset even though the backend persists it — the admin re-selects it every time, thinking the save silently failed.
- A dev environment is re-seeded: the persisted `defaultModel.id` (e.g. `2`) no longer matches the new row's `id` for `google/gemini-3.5-flash`. Every settings load shows "No default model" until the admin picks a model again.

### Expected Behavior
- On page load, if `GET /app-settings` returns a `defaultModel`, the selector pre-selects that model's **name**, as long as a model with the same `modelId` exists and is currently **enabled** in the live `/llm-model` list. The selected value must be a real `id` from `enabledModels` so the trigger label resolves.
- A genuinely disabled default (no enabled row for that `modelId`) should be surfaced, not silently cleared on every load.

### Actual Behavior
- `selectedDefaultModelId` is reset to `null` whenever the persisted default's database `id` is not present in the current `enabledModels` list, even when the same model exists under a different `id` (id-drift) or the snapshot's `isEnabled` is stale. The trigger renders "No default model".

### Impact
- The default-model feature appears broken after reload despite a successful save, eroding admin trust and causing repeated re-selection.
- The mechanism is silent: there is no UI signal that the persisted default is stale/unmatched, so the admin cannot distinguish "save failed" from "id mismatch".
- The clamp-to-null is the same behavior the hook uses to drop a *legitimately* disabled default, so the two cases are indistinguishable to the user.

### Findings
- **Finding 1 — Wrong join key (confirmed):** `useAppSettings` matches the persisted default to `enabledModels` by `id` in three places — the no-arg derive (`fetchSettingsData`), the external-models derive (`deriveFromExternalModels`), and the re-derive clamp. `id` is a mutable database key; the stable identity of an LLM model is its OpenRouter `modelId` (e.g. `google/gemini-3.5-flash`), which persists across re-seed/re-add.
- **Finding 2 — Stale `isEnabled` snapshot (confirmed):** `/app-settings` embeds `defaultModel.isEnabled` from `AppSettingsEntity.defaultModel`, a snapshot taken when the default was last saved/toggled. It is **not** the live `/llm-model` `isEnabled`. The project's own Known Issue records this: the FK is not auto-nulled on disable, so the snapshot can say `isEnabled: true` while the live row is disabled. The codebase filters `enabledModels` from the live `/llm-model` list (`useSystemModels`), so a disabled live row is excluded → the `id` join fails → clamp to `null`.
- **Finding 3 — Base UI item resolution depends on a real `items` value (confirmed):** `DefaultModelCard` already passes `items` (Bug 1 fix), so the trigger renders "No default model" precisely when `selectedDefaultModelId === null`; this means the symptom is driven entirely by the hook's nulling, not by the Select component.
- **Finding 4 — StrictMode amplifies a transient flash (strong hypothesis):** `main.tsx` wraps the app in `<StrictMode>`. The mount effect captures `externalModels` at mount time (= `[]` from `useSystemModels`) and the re-derive effect + `modelInitializedRef` interplay run twice in dev. The unit test documenting the race (`useAppSettings.test.ts` Test #13) does **not** run under StrictMode, so the live app can diverge from the tested behavior for a transient "No default model" flash. This explains intermittent symptoms but **not** a persistent post-reload state; the persistent symptom is Finding 1/2.

### Investigation Scope
- **Code Reviewed:** `useAppSettings.ts`, `DefaultModelCard.tsx`, `AppSettingsForm.tsx`, `AppSettingsPage.tsx`, `useSystemModels.ts`, `services/appSettingsService.ts`, `types.ts`, `components/ui/select.tsx`, `main.tsx`, the Base UI `Select.Root` `items` semantics.
- **Library Source Reviewed:** Base UI Select `items` / `resolveSelectedLabel` documentation via Context7 — when `items` is provided, `<Select.Value>` renders the matching item's `label` instead of the raw value.
- **Logs Reviewed:** Yes — the user-provided `GET /app-settings` response (`defaultModel.id=2`, `modelId=google/gemini-3.5-flash`, `isEnabled=true`) confirming the backend persists a default that the UI fails to show.
- **Runtime Evidence:** Reproduced/observed by the user in the browser (see screenshot `project/sc/Screenshot from 2026-06-29 04-48-32.png`); selector = "No default model" while the console log shows a non-null `defaultModel`. Full confirmation requires logging `selectedDefaultModelId` and the `enabledModels` ids/modelIds/isEnabled (see Validation).

### Root Cause Analysis

The hook decides `selectedDefaultModelId` by joining `app-settings.defaultModel` to the live `/llm-model` enabled list **on `id`**:

```ts
// useAppSettings.ts — derive (fetchSettingsData / deriveFromExternalModels)
const defaultId = fetchedSettings.defaultModel?.id ?? null
const initialDefaultModelId = enabledModels.some((m) => m.id === defaultId)
  ? defaultId
  : null

// re-derive clamp
if (prev !== null && !newEnabled.some((m) => m.id === prev)) {
  return null
}
```

`defaultModel.id` is the database primary key stored on `AppSettingsEntity.defaultModel`. It is **not** a stable identity. Two normal-ops paths break the join:

1. **Disable-after-default:** the admin disables the model in System Models. `AppSettingsEntity.defaultModel` still points to the (now disabled) row; the `/app-settings` snapshot still reports a stale `isEnabled: true`. But the live `/llm-model` row has `isEnabled: false`, so `enabledModels` (filtered from the live list) excludes it. `some(m => m.id === defaultId)` is `false` → `selectedDefaultModelId = null`. The clamp path does the same on every subsequent `settings`/`externalModels` tick.
2. **Id drift (re-add/re-seed):** the row is deleted and re-added (or the DB re-seeded). `AppSettings.defaultModel.id` is the **old** `id` (e.g. `2`); the new live row for `google/gemini-3.5-flash` has a **different `id`** but the same `modelId`. The `id` join fails → `null`. The stale-`isEnabled` snapshot masks this from the admin by reporting `isEnabled: true` in the console.

Because `selectedDefaultModelId` ends up `null`, `DefaultModelCard`'s `items` array yields the `{ value: null, label: "No default model" }` entry → the trigger shows "No default model". The `items`-based label resolution (Bug 1 fix) is working correctly; it is faithfully rendering the null the hook produced.

The fix is to resolve the default by the **stable `modelId`**, then map back to the **live `id`** so `selectedDefaultModelId` is always a value actually present in `items` (so the trigger label resolves). `modelId` is the OpenRouter identifier, unique and persistent across re-seed/re-add, and is already present on both `LlmModelMiniDTO` (`types.ts:13`) and `LlmModelDTO` (`types.ts:3`).

### Evidence in Code
- `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.ts:57-60` — derive matches on `m.id === defaultId`.
- `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.ts:77-79` — `deriveFromExternalModels` matches on `m.id === defaultModelId`.
- `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.ts:226-241` — re-derive effect: init-branch restores `settings.defaultModel?.id ?? null`, then the clamp nulls `prev` when `!newEnabled.some((m) => m.id === prev)`; with id-drift `prev` (old id) is never in `newEnabled` → `null`.
- `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.ts:273-279` — `save()` re-derives `updatedDefaultId` from `updated.defaultModel?.id` and the `enabledModels.some(m.id===updatedDefaultId)` guard; same `id` join, so a save response carrying the old id after drift would also null.
- `project/srcs/frontend/src/features/app-settings/components/DefaultModelCard.tsx:41-47` — `items` derived from `enabledModels` (Bug 1 fix); correctly renders "No default model" only when `selectedDefaultModelId === null`.
- `project/srcs/frontend/src/features/app-settings/types.ts:10-15` — `LlmModelMiniDTO` carries `id`, `modelId`, `name`, `isEnabled` (snapshot fields, no live guarantee).
- `project/srcs/frontend/src/main.tsx:15` — `<StrictMode>` wrapping the app (StrictMode double-invoke of mount effect — Finding 4).
- `documentation/Memory/known-issues.md` sharp edge (stale `defaultModel` FK after disable) — confirms the stale-snapshot path.

### Affected Systems / Modules
- [[App-Settings-Default-Model-Select-Display-and-Persistence]] — prior report; its Bug 2 race-when-empty fix is in place, but it explicitly deferred the stale/disabled default edge case (its "Potential Risks / Notes") which is exactly this residual.
- [[Admin-App-Settings-Page]] — owns `useAppSettings`, the hook containing the join logic.
- [[Admin-LLM-Model-Catalog-Page]] — owns `useSystemModels`, the authoritative `/llm-model` source used to derive `enabledModels`.

---

## Supporting Logs

`GET /app-settings` response captured by the user at the moment the selector shows "No default model" (see `project/sc/Screenshot from 2026-06-29 04-48-32.png`):

```text
{
  "id": 1,
  "openRouterApiKey": "****5e70",
  "defaultModel": {
    "id": 2,
    "modelId": "google/gemini-3.5-flash",
    "name": "Google: Gemini 3.5 Flash",
    "isEnabled": true
  },
  "updatedAt": "2026-06-29T02:39:46.208592",
  "updatedByUsername": "admin"
}
```

### Log Analysis
The `console.log("[AppSettingsPage] General Settings tab rendered. GET /app-settings response:", appSettings.settings)` in `AppSettingsPage.tsx:41` only logs `settings`, never `selectedDefaultModelId` or `enabledModels`. That is why the log looks correct while the UI is wrong: the values driving the trigger (`selectedDefaultModelId` + `enabledModels`) are not logged. Adding the recommended diagnostic (see Validation) will show `selectedDefaultModelId === null` and/or `enabledModels` lacking the matching `id`, confirming the join failure.

### Confidence Level
**Strong hypothesis (Finding 1/2 — persistent symptom) + confirmed mechanism (Finding 3) + strong hypothesis (Finding 4 — transient).**

The mechanism (id join → clamp to null → trigger renders "No default model") is confirmed by reading the code and the Base UI `items` semantics. The *triggering condition* (id-drift vs stale-disabled) is a strong hypothesis pending the diagnostic log: both produce the same observable symptom and the same code path. StrictMode (Finding 4) only explains a transient flash, not the persistent post-reload state the user reports.

### Remaining Uncertainty / Open Questions
- Which of the two join-failure paths the user is actually hitting (id-drift vs stale-disabled) is not yet confirmed. The diagnostic log (Validation) will disambiguate: print `enabledModels` `id|modelId|isEnabled` and `selectedDefaultModelId`.
- Whether `save()` should normalize the persisted default to the live `id` on the response path as well (it currently re-derives by `id`).
- Desired UX for a genuinely disabled persisted default: silent-clear-on-load (current) vs. keep-selected-with-a-disabledbadge vs. warn. This is a product decision; the fix should at minimum stop the *false* clear when an enabled model with the same `modelId` exists.

---

## Solution Direction

### Proposed Fix

Resolve the persisted default by **`modelId`** (stable) instead of `id` (drifting), and map back to the **live `id`** from the enabled list so `selectedDefaultModelId` is always a value present in `items`. Apply the `modelId`-first resolution in all three derivation sites (derive, external derive, re-derive clamp) and in `save()`.

```ts
// Resolve persisted default to a LIVE enabled id, matching by modelId first.
const dm = fetchedSettings.defaultModel
const resolveDefaultId = (enabled: LlmModelDTO[]): number | null => {
  if (!dm) return null
  const byModelId = enabled.find((m) => m.modelId === dm.modelId && m.isEnabled === true)
  if (byModelId) return byModelId.id
  // Fallback to id only if that row is truly enabled.
  const byId = enabled.find((m) => m.id === dm.id && m.isEnabled === true)
  return byId ? byId.id : null
}

// fetchSettingsData / deriveFromExternalModels:
const initialDefaultModelId = resolveDefaultId(enabledModels)

// re-derive clamp — keep prev only if its modelId is still enabled,
// else try to re-resolve from settings.defaultModel.modelId:
if (prev !== null) {
  const prevModel = newEnabled.find((m) => m.id === prev)
  if (!prevModel) {
    // prev id no longer in enabled list — re-resolve from the persisted default's modelId
    return resolveDefaultIdFromMini(newEnabled, settings.defaultModel)
  }
  return prev
}
```

Optionally, add a derived `isPersistedDefaultDisabled` flag (a model with the default's `modelId` exists in `/llm-model` but is `isEnabled: false`) so the UI can show "Default exists but is disabled — re-enable or clear", instead of silently showing "No default model".

### Why This Fix Is Correct
- `modelId` is the OpenRouter identifier and the only key guaranteed to survive row re-creation and re-seed; matching by `id` is the documented failure mode (Known Issue: stale FK).
- Mapping back to the **live `id`** keeps `selectedDefaultModelId` a value actually in `items`, so Bug 1's `items`-based label resolution keeps working (no separate render fix needed).
- Falling back to `id`-match only when the row is truly enabled preserves the existing guard (a disabled default is not selectable), but the `modelId` match now rescues the re-added/enabled case the user is hitting.
- `save()` re-derives from the response with the same resolver, so the post-save trigger stays correct even if the backend returns the old-snapshot `id`.
- The change is internal to the hook; no public-interface change, and Bug 1's component fix is untouched.

### Skills and Documentation Used During Analysis and Solution Validation
- `documentation-management` — confirmed the prior report and the Known-Issue sharp edge before authoring this report.
- Context7 — Base UI (`/mui/base-ui`) Select `items` / `resolveSelectedLabel` behavior: "When the `items` property is specified, the `<Select.Value>` component renders the label of the selected item instead of its raw value." Confirmed trigger renders "No default model" iff `selectedDefaultModelId === null`, so this is a hook/state bug, not a Select bug.

### Files to Modify or Create
- `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.ts` — replace all three `id`-only derivations + the clamp + `save()` re-derive with `modelId`-first resolution mapping back to a live enabled `id`.
- `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.test.ts` — add id-drift test (default `id=2` absent from enabled list, but a row with `modelId === default.modelId` and a different `id` is enabled → assert the new `id` is selected) and a stale-disabled test (default `id=2` present but `isEnabled:false` in live list → assert `null` + flag if implemented). Add a StrictMode-wrapped variant of the existing race test.
- `project/srcs/frontend/src/pages/AppSettingsPage.tsx` (diagnostic only / optional) — extend the dev `console.log` to include `selectedDefaultModelId` and `enabledModels` ids/modelIds/isEnabled during validation (can be reverted after confirmation).

### Validation Strategy After Fix

#### Automatic Validation
- [ ] `npm run test -- --run useAppSettings` — all existing tests pass; new id-drift + stale-disabled tests pass.
- [ ] `npm run test -- --run` — full suite green (baseline 130/130 + 2 new).
- [ ] `npm run typecheck` and `npm run build` — no TS errors in modified files.

#### Manual Validation
- [ ] In a running app, set a default model and save. Refresh `/app-settings` → General Settings. Confirm the trigger shows the saved model name (e.g. `Google: Gemini 3.5 Flash`), not "No default model".
- [ ] Disable that model in the System Models tab, return to General Settings, confirm the trigger does not silently show a stale enabled default (show disabled state or "No default model" — per chosen UX). Re-enable it and confirm the default is restored on load.
- [ ] (id-drift path) If feasible: recreate the model row so its DB `id` differs from the persisted `defaultModel.id` but `modelId` matches, reload, confirm the default is still selected.
- [ ] Diagnose the user's live environment first: add `console.log` of `selectedDefaultModelId` and `enabledModels.map(m => `${m.id}|${m.modelId}|${m.isEnabled}`)`; confirm whether the live list lacks the matching `id` (id-drift) or the model is disabled (stale-snapshot) before and after the fix.

**Rule:** Prefer automatic validation when possible. Manual steps are documented here for the user; do not execute them on the user's behalf.

### Potential Risks / Notes
- `modelId` join assumes `modelId` is unique among enabled rows. If duplicates are possible, the resolver should pick deterministically (e.g. lowest `id`) or reject ambiguous defaults — confirm no two enabled models share a `modelId`.
- Implementing an `isPersistedDefaultDisabled` UI is optional but recommended; leaving the silent-clear behavior for genuinely disabled defaults is acceptable for the core fix, but only after the false-clear (enabled model via `modelId`) is fixed.
- StrictMode (Finding 4) is a separate, lower-priority concern; if the id-join fix removes the persistent symptom, the transient flash may still occur in dev — track separately if it persists after the fix.

---

## Resolution Steps

### Phase 1: Confirm the join-failure path (diagnostic)
- [ ] **Step 1.1:** Temporarily extend the General Settings `console.log` to print `selectedDefaultModelId` and `enabledModels` `id|modelId|isEnabled` alongside `settings`. Reload and capture output to confirm whether the failure is id-drift (live row present with a different `id`, same `modelId`) or stale-disabled (live row absent/disabled).

### Phase 2: Resolve default by `modelId` (core fix)
- [ ] **Step 2.1:** Add a shared resolver that maps the persisted `defaultModel` to a **live enabled `id`** by matching `modelId` first, then `id` (only if enabled), else `null`.
- [ ] **Step 2.2:** Use the resolver in `fetchSettingsData` and `deriveFromExternalModels` for `initialDefaultModelId`.
- [ ] **Step 2.3:** Update the re-derive clamp to re-resolve from `settings.defaultModel.modelId` when the previous `id` is no longer in the enabled list, instead of unconditionally nulling.
- [ ] **Step 2.4:** Update `save()` to re-derive `selectedDefaultModelId` from the response using the same resolver.

### Phase 3: Tests
- [ ] **Step 3.1:** Add an id-drift test: persisted `defaultModel.id=2` is absent from `enabledModels`, but a row with `modelId === default.modelId` and a different `id` is enabled → assert it becomes the selected id.
- [ ] **Step 3.2:** Add a stale-disabled test: persisted default's live row is `isEnabled:false` → assert `null` (and the disabled flag, if implemented).
- [ ] **Step 3.3:** Wrap the existing race test (Test #13) in `<React.StrictMode>` and assert the saved default is restored once models arrive.

---

## Task Breakdown

### Task 1: Confirm join-failure path via diagnostic log
- **Steps Covered:** Step 1.1
- **Reason for Grouping:** Standalone, low complexity; disambiguates id-drift vs stale-disabled before the fix is tuned. Quick to execute and informs the UX choice for genuinely disabled defaults.
- **Planned Task File:** `App-Settings-Default-Model-Not-Restored-Id-Drift-task-1-confirm-join-failure-path.md`
- **Task Document Link:** (add when the task document is created)

### Task 2: Resolve persisted default by `modelId` across all derivation sites
- **Steps Covered:** Step 2.1, Step 2.2, Step 2.3, Step 2.4
- **Reason for Grouping:** All four edits are in `useAppSettings.ts` and share one resolver; they must land together to keep derive, clamp, and save path consistent. High complexity / single cohesive change.
- **Planned Task File:** `App-Settings-Default-Model-Not-Restored-Id-Drift-task-2-resolve-default-by-modelid.md`
- **Task Document Link:** (add when the task document is created)

### Task 3: Add id-drift, stale-disabled, and StrictMode tests
- **Steps Covered:** Step 3.1, Step 3.2, Step 3.3
- **Reason for Grouping:** TDD unit for the resolver; closely related test cases exercising the same new behavior. Medium complexity.
- **Planned Task File:** `App-Settings-Default-Model-Not-Restored-Id-Drift-task-3-tests.md`
- **Task Document Link:** (add when the task document is created)

---

## Expected Outcome After Fix
- On every page load, a persisted default whose model is currently enabled (matched by `modelId`) is shown by name in the Default LLM Model selector.
- Row re-creation / DB re-seed no longer silently resets the default to "No default model".
- A genuinely disabled persisted default is either shown as disabled or explicitly cleared, but is distinguishable from a successful save.
- The Base UI `items`-based label resolution (Bug 1) keeps working because `selectedDefaultModelId` is always a live enabled `id` (or `null`).