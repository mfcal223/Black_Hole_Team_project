#high #architectural #security

## Bug: Review of Admin-App-Settings-Page Feature Document

### Summary

This is a review of the feature document at `documentation/Features/to-do/Admin-App-Settings-Page.md`, which plans an admin-only frontend App Settings page for configuring the OpenRouter API key and default LLM model through the existing backend API.

2 findings were identified. 1 is high severity: the feature requires a password-style API key input but does not specify browser autocomplete/password-manager suppression, which can autofill and submit an unrelated saved password as the OpenRouter API key. 1 is moderate severity: the default model selector uses `GET /llm-model`, whose backend implementation returns a `Set`, but the feature does not require deterministic frontend sorting.

---

### Findings

---

#### Finding 1 - API key password field lacks autocomplete/password-manager guard

**Severity:** High

**Description:**

The feature correctly requires the OpenRouter API key input to use `type="password"` and to remain empty when a key is already configured. However, it does not specify any `autoComplete` or password-manager suppression behavior for that input.

Browser password managers commonly treat `type="password"` fields as login-password fields. Because this field is intentionally empty on load, a password manager may autofill it with an unrelated saved password. If the admin then changes only the default model and clicks Save, the hook will see a non-blank `apiKeyInput` and submit that autofilled password as `openRouterApiKey`, overwriting the real OpenRouter key.

**Why It Matters:**

This can corrupt the platform's OpenRouter configuration without the admin intentionally rotating the key. It also risks placing a user login password into an API-key field and persisting it server-side. The feature's primary security requirement is to avoid exposing or mishandling the API key; allowing password-manager autofill is a direct gap in that requirement.

**Evidence:**

- `documentation/Features/to-do/Admin-App-Settings-Page.md:269-273` specifies the API key field as an empty password input but does not mention `autoComplete` or password-manager behavior.
- `documentation/Features/to-do/Admin-App-Settings-Page.md:240-244` specifies that any non-blank `apiKeyInput` is included in the PATCH payload.
- `project/srcs/backend/src/main/java/com/BHT/models/appSettings/AppSettingsService.java:47-49` updates the stored key whenever `openRouterApiKey` is non-null and non-blank.

**Examples:**

1. Admin has a valid OpenRouter API key configured.
2. Admin opens `/app-settings`; the API key input is empty by design.
3. Browser/password manager autofills the field with the admin's saved app password.
4. Admin selects a default model and clicks Save.
5. Frontend submits `{ openRouterApiKey: "<autofilled-password>", defaultModelId: 3 }`.
6. Backend replaces the OpenRouter key with the wrong value.

**Possible Solutions:**

a. Add explicit autocomplete suppression to the feature document: use `autoComplete="off"` or `autoComplete="new-password"`, avoid `name="password"`, and use a domain-specific field name such as `openRouterApiKey`.

b. Add a browser-autofill-resistant custom text field instead of `type="password"`, using CSS text-security where available. This is more complex and less portable.

c. Add an explicit `Change API key` toggle that only mounts/enables the password input after admin intent. This reduces accidental autofill risk but adds UI complexity.

**Recommended Solution:**

Option a plus a small component test. The feature should require the API key input to render as:

```tsx
<Input
  id="open-router-api-key"
  name="openRouterApiKey"
  type="password"
  autoComplete="new-password"
  value={apiKeyInput}
  onChange={(event) => setApiKeyInput(event.target.value)}
/>
```

`autoComplete="new-password"` is the primary value because Chromium/Edge honor it more reliably than `"off"` on `type="password"` fields. If implementation testing shows the target browsers ignore `"new-password"`, fall back to `autoComplete="off"`. `name="openRouterApiKey"` is required (not `name="password"`) because browser autofill heuristics also key off the `name` attribute. The component test should assert the rendered `<input>` has `type="password"`, `name="openRouterApiKey"`, an autofill-suppressing `autoComplete` attribute, and an empty `value` when a masked key is configured.

**Decision:**

Adopted: Option a (with `"new-password"` as primary, `"off"` as documented fallback). Rationale: lowest-complexity fix that preserves the already-interviewed single-form layout and the existing `useAppSettings` deep module; reuses the project's standard shadcn `Input` (which is a transparent spread of native `React.ComponentProps<"input">` and does not block `name`/`autoComplete`). The hybrid Dialog-based and toggle-based alternatives were considered but rejected because they require a documented UX re-decision for marginal additional security benefit over the attribute-level fix. Parent document patched: `documentation/Features/to-do/Admin-App-Settings-Page.md` (OpenRouter API key section spec, Risk Assessment bullet, Step 3.2 component-test scope, Testing Decisions table, Potential Issues list). Date: 2026-06-28.

---

#### Finding 2 - Default model selector has no deterministic ordering requirement

**Severity:** Moderate

**Description:**

The feature plans to populate default-model options with `GET /llm-model` and then filter enabled models on the frontend. The backend implementation of `LlmModelService.getAll()` maps `findAll()` results into a `Collectors.toSet()`, which means the JSON array order is not guaranteed. The feature document does not require sorting the enabled model list before rendering select options.

**Why It Matters:**

The default model selector may appear in a different order across reloads or environments. This makes the UI feel unstable, makes manual validation harder, and can produce fragile component tests if they assume the first option after `No default model` is stable. Settings pages are administrative workflows; deterministic ordering helps admins reliably find the same model.

**Evidence:**

- `documentation/Features/to-do/Admin-App-Settings-Page.md:191-197` selects `GET /llm-model` for `listLlmModels()`.
- `documentation/Features/to-do/Admin-App-Settings-Page.md:230-235` filters enabled models but does not sort them.
- `project/srcs/backend/src/main/java/com/BHT/models/llm/LlmModelService.java:39-43` returns `findAll().stream().map(...).collect(Collectors.toSet())`, losing repository iteration order.

**Examples:**

- Enabled models `GPT-4o`, `Claude Sonnet`, and `Gemini Pro` may render in one order locally and another order in CI or production.
- A test that expects the enabled model options in fixture insertion order can pass or fail depending on the `Set` iteration order.

**Possible Solutions:**

a. Sort the enabled models in `useAppSettings` after filtering, for example by `name.localeCompare()` and then `modelId.localeCompare()` as a tie-breaker.

b. Use `POST /llm-model/list` with an explicit `sort: [{ field: "name", direction: "ASC" }]` request and an `isEnabled = true` filter. This gives backend-driven ordering but introduces pagination-envelope handling and overlaps with the existing shared pagination extraction trigger.

c. Change the backend `getAll()` implementation to return a sorted list. This violates the user's frontend-only constraint and should not be used for this feature.

**Recommended Solution:**

Option a. Keep the frontend-only scope and add a hook requirement:

```typescript
const enabledModels = [...models]
  .filter((model) => model.isEnabled === true)
  .sort((a, b) =>
    a.name.localeCompare(b.name) || a.modelId.localeCompare(b.modelId)
  )
```

The non-mutating spread before sorting keeps the service-returned array immutable. Add a hook test with unordered enabled/disabled fixtures and assert `enabledModels` is sorted deterministically and disabled models are excluded.

**Decision:**

Adopted: Option a. Rationale: lowest-complexity fix that respects the documented frontend-only scope, concentrates the sort rule inside the existing deep `useAppSettings` module (alongside the existing enabled-model filter, masked-key safety, and PATCH null semantics), and requires no backend change. Option b (POST /llm-model/list with sort + isEnabled filter) was rejected because it pulls forward the shared-pagination extraction that progress.md flags as a pending refactor and widens the service's return shape from `LlmModelDTO[]` to a paginated envelope the hook does not need. The pure-helper + useMemo alternative (Intl.Collator + memoization) was considered but rejected as marginal benefit over a plain sort for the expected small admin-curated catalog. Parent document patched: `documentation/Features/to-do/Admin-App-Settings-Page.md` (load-behavior step 3, Step 2.1 test scope, Testing Decisions table, Risk Assessment bullet, Potential Issues list). Date: 2026-06-28.

---

### Investigation Scope

- **Feature Reviewed:** `documentation/Features/to-do/Admin-App-Settings-Page.md`
- **Code Reviewed:** `project/srcs/frontend/src/router.tsx`, `project/srcs/frontend/src/layouts/Sidebar.tsx`, `project/srcs/frontend/src/layouts/Header.tsx`, `project/srcs/frontend/src/services/authSession.ts`, `project/srcs/frontend/src/lib/api.ts`, `project/srcs/backend/src/main/java/com/BHT/models/appSettings/AppSettingsService.java`, `project/srcs/backend/src/main/java/com/BHT/models/appSettings/AppSettingsMapper.java`, `project/srcs/backend/src/main/java/com/BHT/models/llm/LlmModelService.java`
- **Docs Reviewed:** [[Docs/API-Reference/AppSettings]], [[Docs/API-Reference/LlmModels]], [[Features/done/App-Settings-Entity-and-Admin-Configuration]], [[Features/done/Llm-Model-Entity-and-Admin-Crud]], [[Features/done/Frontend-Role-Based-Routing-and-Landing-Pages]], [[ADRs/ADR-010-base-ui-over-radix-ui-for-frontend]]
- **Runtime Evidence:** Static review only; no implementation exists yet.
- **Logs Reviewed:** No.

### Confidence Level

Confirmed. Both findings are based on direct comparison between the feature document, existing backend behavior, and existing frontend patterns.

---

## Affected Documentation

- [[Features/to-do/Admin-App-Settings-Page]] - Parent feature document needs the selected finding resolutions patched before task creation.
- [[Docs/API-Reference/AppSettings]] - Relevant because API key update semantics determine the autofill risk.
- [[Docs/API-Reference/LlmModels]] - Relevant because the model list endpoint is the source for selector options.
- [[Memory/architecture]] - Relevant because the planned frontend feature module and admin route should be reflected after implementation.
- [[Memory/known-issues]] - May need a note if browser autocomplete behavior becomes a recurring frontend security constraint.

---

## Findings Summary Table

| # | Title | Severity | Status |
|---|-------|----------|--------|
| 1 | API key password field lacks autocomplete/password-manager guard | High | Done |
| 2 | Default model selector has no deterministic ordering requirement | Moderate | Done |
