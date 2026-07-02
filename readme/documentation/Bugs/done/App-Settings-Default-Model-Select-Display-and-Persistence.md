#high #usability #reliability

## Bug: App Settings Default Model — Trigger Shows Raw ID and Persisted Default Not Restored on Load

### Summary

Two related defects in the General Settings tab of the App Settings page affect the default model selector. First, after a model is selected from the dropdown, the trigger field shows the numeric database ID (e.g., `"3"`) instead of the model name (e.g., `"GPT-4"`). Second, even after an admin saves a default model and refreshes the page, the selector always opens in the "No default model" state — the saved default is never restored into the UI.

Both bugs make the default model feature unusable in practice: the admin cannot confirm which model they are selecting (Bug 1), and any selection does not appear to have taken effect after a page reload (Bug 2), even though the backend is storing it correctly.

A secondary instance of Bug 1 also exists in `EmployeeFilterBar` (the filter-field selector shows raw camelCase keys like `"firstName"` instead of labels like `"First Name"`), though it is less visually jarring.

---

### Reproduction Conditions

**Bug 1 — Trigger shows raw ID:**
1. Log in as Admin and navigate to `/app-settings` → General Settings tab.
2. The Default LLM Model selector shows enabled models in the dropdown.
3. Select any model.
4. The dropdown closes and the trigger displays a number (e.g., `"3"`) instead of the model name.

**Bug 2 — Persisted default not restored on load:**
1. Complete the steps above, pick a model, and click **Save settings**.
2. Backend confirms save (success message appears).
3. Refresh the page or navigate away and return to `/app-settings`.
4. The Default LLM Model selector shows "No default model" even though the backend has the saved default.

---

### Environment / Preconditions
- At least one LLM model must be enabled in the System Models catalog.
- Admin role required.

---

### Real-World Scenarios

- An admin wants to set the default model for new conversations. They pick "GPT-4o" from the dropdown but the trigger shows `"5"` — they cannot confirm the correct model was chosen.
- An admin sets and saves a default model. On their next visit to the settings page, the field appears blank, giving the impression the save failed. Every visit requires re-selecting the default.

---

### Expected Behavior

- After selecting a model, the trigger shows the model's human-readable name.
- On page load, if `GET /app-settings` returns a `defaultModel`, its name is pre-selected in the dropdown.

---

### Actual Behavior

- The trigger shows the numeric database ID of the selected model (e.g., `"3"`).
- On page load, `selectedDefaultModelId` is always initialized to `null` regardless of what the backend returns.

---

### Impact
- Admin cannot confirm which model they have chosen in the dropdown trigger.
- The default model feature is effectively invisible — it appears unsaved after every page load.
- Trust in the settings page is undermined; admins may repeatedly re-save thinking their changes are lost.

---

### Findings

**Finding 1 — Bug 1 root cause (confirmed):** Base UI's `SelectValue` resolves trigger display text by calling `resolveSelectedLabel(value, items, itemToStringLabel)`. The `items` parameter is read from the store, which is populated by the `items` prop on `Select.Root`. `DefaultModelCard` does not pass `items` to `Select`, so the store has `items = undefined`. With no items or label function available, the resolver falls through to `serializeValue(numericId)` → `JSON.stringify(3)` → `"3"`. The children of `SelectItem` (`{model.name}`) are rendered in the open popup but are never extracted for trigger display — Base UI only uses `items` or `itemToStringLabel` for that.

**Finding 2 — Bug 2 root cause (confirmed):** `useAppSettings` receives `models` from `useSystemModels`, which starts as `[]` on first render. Both `GET /app-settings` and `GET /llm-model` fire simultaneously. Since `/app-settings` (single-object response) resolves faster than `/llm-model` (list response), `settings` becomes non-null while `externalModels` is still `[]`. The re-derive effect `[externalModels, settings]` then fires, enters the `!modelInitializedRef.current` initialization branch, finds `newEnabled = []`, cannot match `settings.defaultModel.id` in an empty list, returns `null`, and — critically — sets `modelInitializedRef.current = true`. When models subsequently arrive, `modelInitializedRef.current` is already `true`, so the effect only clamps (leaves `null` unchanged). The saved default is never applied.

**Finding 3 — Bug 1 also affects `EmployeeFilterBar`:** The filter-field `Select<FilterField | null>` follows the same pattern (no `items` prop). It shows raw values like `"firstName"` instead of `"First Name"`. Less visible because the values are readable camelCase strings, but the same structural fix applies.

---

### Investigation Scope
- **Code Reviewed:** `DefaultModelCard.tsx`, `AppSettingsForm.tsx`, `AppSettingsPage.tsx`, `useAppSettings.ts`, `useSystemModels.ts`, `components/ui/select.tsx`, `EmployeeFilterBar.tsx`
- **Library Source Reviewed:** `node_modules/@base-ui/react/select/value/SelectValue.js`, `node_modules/@base-ui/react/internals/resolveValueLabel.js`, `node_modules/@base-ui/react/select/item/SelectItem.js`, `node_modules/@base-ui/react/internals/composite/list/useCompositeListItem.js`, `node_modules/@base-ui/react/select/root/SelectRoot.js`, `node_modules/@base-ui/react/internals/serializeValue.js`
- **Logs Reviewed:** No — diagnosis is static analysis only.
- **Runtime Evidence:** Not reproduced in a running session; diagnosis is derived from reading the Base UI source and tracing the call chain.

---

### Root Cause Analysis

**Bug 1** is caused by a mismatch between how Base UI's `Select` expects labels to be provided and how the shadcn wrapper uses it. The trigger display is driven exclusively by `resolveSelectedLabel`, which requires either an `items` prop on `Select.Root` (array of `{value, label}` objects) or an `itemToStringLabel` function. The pattern used in this codebase — rendering children inside `SelectItem` as the display text — works for the open dropdown list but does not feed into the trigger. The children are text in the DOM; Base UI does not read DOM text content for the trigger, only the `items` store state.

**Bug 2** is a classic initialization race condition. The `modelInitializedRef` ref is intended to ensure the `selectedDefaultModelId` is initialized from the backend default exactly once. But it is tripped on the first firing of the re-derive effect, which happens as soon as `settings` becomes non-null — independently of whether `externalModels` has loaded. Because the two fetches are concurrent and the settings fetch typically wins, the initialization branch fires with an empty `newEnabled`, marks itself done, and subsequent model arrivals only trigger the clamp path.

---

### Evidence in Code

**Bug 1:**
- `project/srcs/frontend/src/features/app-settings/components/DefaultModelCard.tsx:59` — `Select<number | null>` has no `items` prop; `SelectValue` cannot resolve label.
- `node_modules/@base-ui/react/select/value/SelectValue.js` — calls `resolveSelectedLabel(value, items, itemToStringLabel)`; `items` is `undefined` when no prop is passed.
- `node_modules/@base-ui/react/internals/resolveValueLabel.js:resolveSelectedLabel` — with `items = undefined` falls through to `fallback()` → `stringifyAsLabel(numericId, undefined)` → `serializeValue(numericId)` → `JSON.stringify(numericId)`.

**Bug 2:**
- `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.ts:208-236` — re-derive effect sets `modelInitializedRef.current = true` before `newEnabled` has models, locking out future initialization.
- `project/srcs/frontend/src/pages/AppSettingsPage.tsx:16-21` — `useSystemModels()` starts with `models = []`; that empty array is passed to `useAppSettings` on first render.
- `project/srcs/frontend/src/features/app-settings/hooks/useSystemModels.ts:23` — `useState<LlmModelDTO[]>([])` confirms the initial state is empty.

**Bug 1 (secondary):**
- `project/srcs/frontend/src/features/employees/components/EmployeeFilterBar.tsx:36-51` — same missing `items` prop pattern; trigger shows raw field keys.

---

### Affected Systems / Modules
- [[Features/done/Admin-LLM-Model-Catalog-Page]] — the feature where this regression first became observable (3-tab restructure).
- [[Features/done/Admin-App-Settings-Page]] — the original app-settings module whose `useAppSettings` hook contains Bug 2.

---

## Supporting Logs

_No runtime logs — diagnosis is from static analysis of Base UI source and hook logic._

### Confidence Level

**Confirmed** for both bugs. The full call chain from `SelectValue` through `resolveValueLabel` to `serializeValue` was traced in the installed Base UI 1.5.0 source. The race condition in `useAppSettings` is provable by reading the effect dependencies and `modelInitializedRef` lifecycle.

### Remaining Uncertainty / Open Questions
- Whether Bug 2 manifests every time (if `/llm-model` is consistently slower than `/app-settings`) or only intermittently — in practice, models likely always load after settings, making it consistent.
- Whether the `EmployeeFilterBar` bug is user-visible in the current UI (labels differ only by casing/spacing, so it may have gone unnoticed).

---

## Solution Direction

### Proposed Fix

**Bug 1:** Pass an `items` prop to `Select.Root` in `DefaultModelCard` so `resolveSelectedLabel` can match the selected numeric ID to a human-readable name. The `items` array mirrors the rendered `SelectItem` list:

```tsx
// DefaultModelCard.tsx — add items prop to Select
<Select<number | null>
  value={selectedDefaultModelId}
  onValueChange={(v) => setSelectedDefaultModelId(v)}
  items={[
    { value: null as number | null, label: "No default model" },
    ...enabledModels.map((m) => ({ value: m.id as number | null, label: m.name })),
  ]}
>
```

Apply the same pattern to `EmployeeFilterBar` for the filter-field selector.

**Bug 2:** Guard the `modelInitializedRef` initialization branch to defer when `settings.defaultModel` exists but `newEnabled` is still empty — indicating the models list has not yet loaded. Change `useAppSettings.ts:220-228`:

```typescript
// Before (current — fires prematurely when externalModels=[]):
if (!modelInitializedRef.current) {
  modelInitializedRef.current = true
  const defaultId = settings.defaultModel?.id ?? null
  return newEnabled.some((m) => m.id === defaultId) ? defaultId : null
}

// After (defers until models are present, or until there is no default to wait for):
if (!modelInitializedRef.current) {
  const defaultId = settings.defaultModel?.id ?? null
  if (defaultId !== null && newEnabled.length === 0) {
    return prev   // models may still be loading — retry when externalModels changes
  }
  modelInitializedRef.current = true
  return newEnabled.some((m) => m.id === defaultId) ? defaultId : null
}
```

When `defaultId === null` (no backend default), the guard passes immediately and initialization completes with `null`. When `defaultId !== null` and models are empty, the branch defers without setting the ref. When models arrive, the effect fires again, the guard passes (`newEnabled.length > 0`), and initialization sets the correct ID.

### Why This Fix Is Correct

**Bug 1:** `resolveSelectedLabel` is the authoritative path Base UI uses to derive trigger text. It accepts `items` as an array of `{value, label}` pairs. Providing this array directly gives the resolver everything it needs: a value-to-label map. No other mechanism (label prop on `SelectItem`, `itemToStringLabel` function) is simpler or more aligned with Base UI's design for this use case.

**Bug 2:** The core issue is that `modelInitializedRef` is a one-shot gate that fires at the wrong moment. Deferring when `defaultId !== null && newEnabled.length === 0` precisely captures the race case without changing any other behavior:
- `defaultId = null` (no backend default) → initialize immediately with `null`. Correct.
- `defaultId !== null`, models empty → defer. Models arrive → initialize. Correct.
- `defaultId !== null`, models present → initialize as before. Correct.
- All-models-disabled edge case (`newEnabled = []` after models load) → same guard, `defaultId !== null`, defers. When admin enables any model, the effect fires again and initializes. Correct.

The `save()` post-response path in `useAppSettings` already calls `setSelectedDefaultModelId(updatedDefaultId)` explicitly, so the fix does not affect save behavior.

### Skills and Documentation Used During Analysis and Solution Validation
- `superpowers:systematic-debugging` — guided the full Phase 1–2 investigation before proposing any fix.
- Base UI 1.5.0 source (`SelectValue.js`, `resolveValueLabel.js`, `SelectItem.js`, `useCompositeListItem.js`, `SelectRoot.js`, `serializeValue.js`) — traced the complete trigger-label resolution pipeline and item registration mechanism.

### Files to Modify or Create
- `project/srcs/frontend/src/features/app-settings/components/DefaultModelCard.tsx` — add `items` prop to `Select.Root` (Bug 1).
- `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.ts:220-228` — add defer guard to `modelInitializedRef` initialization branch (Bug 2).
- `project/srcs/frontend/src/features/employees/components/EmployeeFilterBar.tsx` — add `items` prop to filter-field `Select.Root` (Bug 1 secondary).

### Validation Strategy After Fix

#### Automatic Validation
- [ ] `npm run test -- --run` — existing `useAppSettings` tests must still pass (no behavior change to non-race paths).
- [ ] `npm run test -- --run useAppSettings` — verify test coverage for the re-derive effect.
- [ ] `npm run build` — no TypeScript errors in modified files.

#### Manual Validation
- [ ] Navigate to `/app-settings` → General Settings. Open the Default LLM Model dropdown, select a model. Verify the trigger displays the model **name** (e.g., "GPT-4o"), not a number.
- [ ] Click **Save settings**. Refresh the page. Verify the saved model name is pre-selected in the dropdown.
- [ ] Navigate to the Employees page. Open the filter-field dropdown and select "First Name". Verify the trigger shows "First Name", not "firstName".

### Potential Risks / Notes
- The `items` prop on `Select.Root` must stay in sync with the rendered `SelectItem` list. If `enabledModels` changes (e.g., after a toggle), the `items` array must also update — this is automatic since both derive from the same `enabledModels` prop in `DefaultModelCard`.
- The Bug 2 defer guard does not protect against the edge case where the backend has a `defaultModel` pointing to a model that is disabled and stays disabled indefinitely. In that case, `newEnabled` never contains that model, and initialization correctly returns `null` (the disabled model cannot be the default). This is the intended behavior.
- No change to the `useAppSettings` public interface is required by either fix.

---

## Resolution Steps

### Phase 1: Fix SelectValue Trigger Display (Bug 1)
- [ ] **Step 1.1:** Add `items` prop to `Select.Root` in `DefaultModelCard.tsx` mapping `enabledModels` to `{value: m.id, label: m.name}` plus the `null` "No default model" entry.
- [ ] **Step 1.2:** Apply the same `items` prop fix to the filter-field `Select` in `EmployeeFilterBar.tsx`.

### Phase 2: Fix Default Model Initialization Race (Bug 2)
- [ ] **Step 2.1:** In `useAppSettings.ts`, add the `defaultId !== null && newEnabled.length === 0` defer guard inside the `!modelInitializedRef.current` branch of the re-derive effect.
- [ ] **Step 2.2:** Run `npm run test -- --run useAppSettings` and verify all existing tests pass. Add a test case that simulates the race (settings resolves before models) and asserts `selectedDefaultModelId` is eventually set to the backend default when models arrive.

---

## Task Breakdown

### Task 1: Fix SelectValue Trigger Display
- **Steps Covered:** Step 1.1, Step 1.2
- **Reason for Grouping:** Both are the same one-line `items` prop fix applied to two different components. Closely related, low complexity, can be done in one pass.
- **Planned Task File:** `App-Settings-Default-Model-Select-Display-and-Persistence-task-1-fix-select-trigger-display.md`
- **Task Document Link:** [[App-Settings-Default-Model-Select-Display-and-Persistence-task-1-fix-select-trigger-display]]

### Task 2: Fix Default Model Initialization Race
- **Steps Covered:** Step 2.1, Step 2.2
- **Reason for Grouping:** The hook change and its test validation are a single TDD unit — write the failing test first, apply the guard, verify the test passes.
- **Planned Task File:** `App-Settings-Default-Model-Select-Display-and-Persistence-task-2-fix-initialization-race.md`
- **Task Document Link:** (add when task is created)

---

## Expected Outcome After Fix
- The Default LLM Model trigger always displays the model's human-readable name after selection.
- On every page load, if the backend has a saved default model, it is pre-selected in the dropdown.
- The EmployeeFilterBar filter-field selector shows formatted labels instead of raw camelCase keys.
- No duplicate `GET /llm-model` requests are introduced; `useSystemModels` remains the single source of truth.
