# Task: Decompose `AppSettingsForm.tsx` into Card Sub-Components

#task #current #medium-complexity #parent-frontend-code-quality-fallow-health-refactor

**Parent:** [[Frontend-Code-Quality-Fallow-Health-Refactor]]
**Parent Type:** Bug
**Related Step(s):** Phase 2 — Steps 2.1, 2.2, 2.3, 2.4
**Estimated Complexity:** Medium

---

## Goal

Extract the three logically independent Card sections of `AppSettingsForm.tsx` into focused sub-components (`OpenRouterApiKeyCard`, `DefaultModelCard`, `LastUpdatedCard`), reducing the parent form to a thin layout wrapper and satisfying ISP (each card receives only the props it uses).

---

## Parent Context

The parent bug [[Frontend-Code-Quality-Fallow-Health-Refactor]] documents a `npx fallow health` audit scoring the frontend at 82/100. `AppSettingsForm.tsx` was flagged as a god component: 164 lines, 13 props (the full `UseAppSettingsResult` interface passed through wholesale), JSX depth 7, and three logically independent rendering concerns collapsed into one function — the OpenRouter API Key card, the Default LLM Model card, and the Last Updated card.

**Parent prescriptions:**
- **Step 2.1:** Create `OpenRouterApiKeyCard.tsx` — props: `apiKeyInput`, `hasConfiguredApiKey`, `isLoading`, `isSaving`, `setApiKeyInput` (5 props; ISP-compliant slice).
- **Step 2.2:** Create `DefaultModelCard.tsx` — props: `enabledModels`, `selectedDefaultModelId`, `hasEnabledModels`, `isLoading`, `isSaving`, `setSelectedDefaultModelId` (6 props; ISP-compliant slice).
- **Step 2.3:** Create `LastUpdatedCard.tsx` — props: `updatedAt: string | null | undefined`, `updatedByUsername: string | null | undefined` (2 props; ISP minimum).
- **Step 2.4:** Slim `AppSettingsForm.tsx` — becomes a thin `<div className="flex flex-col gap-6">` wrapper; retains the two early-return guards (load error, initial loading), composes the three cards, and renders the save-error banner, success banner, and Save button.

**Constraint from Potential Risks section:** `type AppSettingsFormProps = UseAppSettingsResult` may remain unchanged. ISP is applied at the card level, not by narrowing the parent form's type alias. This keeps `AppSettingsPage.tsx` (the sole caller, which spreads `{...appSettings}`) completely untouched.

**Validation target (parent bug):** All existing tests pass without modification; contracts unchanged.

---

## Preconditions / Dependencies

- Task 1 [[Frontend-Code-Quality-Fallow-Health-Refactor-task-1-useEditEmployee-onSave]] is complete: 101/101 tests passing, 0 typecheck errors, build success at 511.78 kB.
- `src/features/app-settings/components/AppSettingsForm.tsx` — 189 lines; the file being decomposed. All JSX for the three cards will be lifted verbatim from it.
- `src/features/app-settings/hooks/useAppSettings.ts` — exports `UseAppSettingsResult`; **unchanged** by this task.
- `src/features/app-settings/types.ts` — exports `LlmModelDTO`; needed by `DefaultModelCard` for `enabledModels: LlmModelDTO[]`.
- `src/features/app-settings/components/AppSettingsForm.test.tsx` — 5 behavioral tests across 2 `describe` blocks; serve as the regression suite for this refactoring. Must pass unchanged.
- `src/pages/AppSettingsPage.tsx` — sole caller; must require zero modifications.
- 101-test baseline across 17 files. Test count remains 101 (no new tests added).
- All shadcn/ui primitives used by the new cards (`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue`, `Input`, `Label`) are already installed and in use in the existing `AppSettingsForm.tsx` — no new shadcn installations required.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `solid-deep-design` — **Selected** — governs the card extraction. SRP: each card has one reason to change. ISP: each card receives only the props it uses directly. Depth: `OpenRouterApiKeyCard` hides password-input security attributes, status badge, and conditional hint text behind a 5-prop interface — deletion test confirms it earns its keep (removing it scatters that complexity back into `AppSettingsForm`). `AppSettingsForm`'s direct prop usage narrows to 6 members it touches itself: `settings`, `error`, `successMessage`, `isLoading`, `isSaving`, `save`.
- `tdd` — **Selected** — this is a pure refactoring (no new behavior). The 5 existing tests in `AppSettingsForm.test.tsx` serve as the behavioral spec (all RED/GREEN invariants). No new tests are added: the card components are implementation details of `AppSettingsForm`; testing behavior through `AppSettingsForm`'s rendered DOM is the correct interface. Adding card-level tests would couple tests to implementation structure (which component renders what), not behavior (what is rendered).
- `react-best-practices` — **Selected** — confirms named sub-components (not inline render functions) should be used for independently reusable card sections; each card has its own identity and single reason to change.
- `react-code-organization` — **Selected** — confirms `OpenRouterApiKeyCard`, `DefaultModelCard`, `LastUpdatedCard` live in `src/features/app-settings/components/` (feature-local; not promoted to shared `components/` because they are not reused outside the app-settings feature).

### Documentation Reviewed

- Context7 not required — no library API surface changes. React 19.2.4, TypeScript 5.9.3, shadcn/ui 4.7.0, Vitest 4.1.9 are unchanged. All shadcn primitives used by the card components already appear in the existing `AppSettingsForm.tsx` — imports are lifted verbatim.
- `src/features/app-settings/components/AppSettingsForm.tsx` — read in full; JSX for the three cards extracted verbatim.
- `src/features/app-settings/components/AppSettingsForm.test.tsx` — read in full; 5 behavioral DOM-query tests confirmed to be unaffected by extracting JSX to sub-components (queries use `screen.getByLabelText`, `screen.getByText` — identical DOM regardless of which component renders it).
- `src/features/app-settings/hooks/useAppSettings.ts` — read in full; `UseAppSettingsResult` interface confirmed (14 members including `reload`, which `AppSettingsForm` already ignores).

### Related Existing Code

- `src/features/app-settings/components/AppSettingsForm.tsx` — the file being decomposed
- `src/features/app-settings/hooks/useAppSettings.ts:13` — `UseAppSettingsResult` interface (14 members)
- `src/features/app-settings/types.ts` — `LlmModelDTO` required by `DefaultModelCard`
- `src/features/app-settings/components/AppSettingsForm.test.tsx` — regression suite
- `src/pages/AppSettingsPage.tsx` — sole caller; spreads `{...appSettings}` into `AppSettingsForm`

---

## Implementation Details

### Approach

Apply **SRP + ISP + Depth** to decompose `AppSettingsForm` into four focused units:

1. **`OpenRouterApiKeyCard`** — one reason to change: the OpenRouter API Key UI. Encapsulates: configured/not-configured status badge, password `<Input>` with security attributes (`type="password"`, `name="openRouterApiKey"`, `autoComplete="new-password"`), and conditional hint text. 5 props, all used directly.

2. **`DefaultModelCard`** — one reason to change: the default LLM model selector UI. Encapsulates: no-models hint text, `Select<number | null>` typed generic, model list with null clear option. 6 props, all used directly.

3. **`LastUpdatedCard`** — one reason to change: the last-updated metadata display. Encapsulates: ISO timestamp formatting via `toLocaleString()`, "Never updated" fallback, admin username display. 2 props (ISP minimum).

4. **`AppSettingsForm` (thinned)** — thin layout wrapper. Retains the two early-return guards (load error → `<ErrorMessage>`, initial loading → `<LoadingSpinner>`), composes the three cards, renders the save-error banner, success banner, and Save button. Directly touches 6 of the 14 `UseAppSettingsResult` members (`settings`, `error`, `successMessage`, `isLoading`, `isSaving`, `save`); the remaining 8 are passed through to the appropriate cards.

**`type AppSettingsFormProps = UseAppSettingsResult` is preserved:** `AppSettingsPage.tsx` spreads `{...appSettings}` (which is `UseAppSettingsResult`) into `AppSettingsForm`. Narrowing the alias would require explicit casting in the page. The parent bug's Potential Risks note explicitly allows the alias to remain unchanged. ISP improvement is realized at the card level.

**`LastUpdatedCard` prop types — `string | null | undefined`:** `settings?.updatedAt` and `settings?.updatedByUsername` produce `string | null | undefined` through optional chaining on `AppSettingsDTO | null` (outer `null` from `settings` + inner `string | null` from the DTO fields). The card props must be typed as `string | null | undefined` to match this exactly without casting.

**JSX lifted verbatim:** Each card component's JSX body is copied from the corresponding block in `AppSettingsForm.tsx`. No behavior changes — only structural decomposition. This keeps the diff reviewable and eliminates behavioral drift.

**`reload` prop:** `UseAppSettingsResult` includes `reload: () => void`, but `AppSettingsForm` has never destructured or used it (no Reload button exists in the form). The thinned form also does not use `reload`. This is a pre-existing design; the form simply ignores it. No action required.

**No shadcn/ui API queries needed:** All shadcn components used here are already in production in `AppSettingsForm.tsx`. The import paths are copied verbatim.

### Files to Create/Modify

- [x] `src/features/app-settings/components/OpenRouterApiKeyCard.tsx` — **new**; API key card
- [x] `src/features/app-settings/components/DefaultModelCard.tsx` — **new**; default LLM model selector card
- [x] `src/features/app-settings/components/LastUpdatedCard.tsx` — **new**; last-updated metadata card
- [x] `src/features/app-settings/components/AppSettingsForm.tsx` — **modify**; replace 3 inline `<Card>` blocks with card component calls; remove now-unused shadcn imports (`Select*`, `Input`, `Label`)

---

## Step-by-Step Implementation

### Step 2.1 — Create `OpenRouterApiKeyCard.tsx`

**Goal:** Define the focused component that owns the OpenRouter API key UI — status badge, password input with security attributes, and conditional hint text.
**Dependencies:** None (self-contained; only imports from shadcn and local app-settings types are needed).

- [x] Create `src/features/app-settings/components/OpenRouterApiKeyCard.tsx`.
- [x] Define `OpenRouterApiKeyCardProps` interface with exactly 5 props: `apiKeyInput: string`, `hasConfiguredApiKey: boolean`, `isLoading: boolean`, `isSaving: boolean`, `setApiKeyInput: (value: string) => void`.
- [x] Lift the `<Card>` JSX from `AppSettingsForm.tsx` lines 54–101 verbatim into this component.
- [x] Import only the shadcn primitives actually used: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `Input`, `Label`.
- [x] Run `npm run typecheck` — 0 errors.

**Why this step is critical:**
`OpenRouterApiKeyCard` encapsulates the three security-sensitive attributes on the password input (`type="password"`, `name="openRouterApiKey"`, `autoComplete="new-password"`). Four of the five existing `AppSettingsForm` tests verify these attributes — extracting them into a focused component gives each attribute one place to change without touching `AppSettingsForm` or the other cards.

#### Implementation

```tsx
// src/features/app-settings/components/OpenRouterApiKeyCard.tsx

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface OpenRouterApiKeyCardProps {
  apiKeyInput: string
  hasConfiguredApiKey: boolean
  isLoading: boolean
  isSaving: boolean
  setApiKeyInput: (value: string) => void
}

export function OpenRouterApiKeyCard({
  apiKeyInput,
  hasConfiguredApiKey,
  isLoading,
  isSaving,
  setApiKeyInput,
}: OpenRouterApiKeyCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>OpenRouter API Key</CardTitle>
        <CardDescription>
          Configure access to the OpenRouter LLM gateway.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Status:</span>
          {hasConfiguredApiKey ? (
            <span className="font-medium text-green-600 dark:text-green-400">
              Configured
            </span>
          ) : (
            <span className="font-medium text-destructive">
              Not configured
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="open-router-api-key">New API key</Label>
          {/*
            Security: name="openRouterApiKey" (not "password") prevents autofill
            heuristics from keying off a generic field name.
            autoComplete="new-password" suppresses password-manager autofill in
            Chromium/Edge. Use autoComplete="off" as fallback if browser testing
            shows "new-password" is ignored.
            value={apiKeyInput} — always "" on load; hook never copies the masked
            backend value into this field.
          */}
          <Input
            id="open-router-api-key"
            name="openRouterApiKey"
            type="password"
            autoComplete="new-password"
            value={apiKeyInput}
            onChange={(event) => setApiKeyInput(event.target.value)}
            disabled={isLoading || isSaving}
          />
          <p className="text-xs text-muted-foreground">
            {hasConfiguredApiKey
              ? "Leave blank to keep the current key."
              : "Enter your OpenRouter API key."}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
```

#### Edge Cases

1. **`hasConfiguredApiKey = true`** — status badge renders green "Configured"; hint text is "Leave blank to keep the current key."
2. **`hasConfiguredApiKey = false`** — status badge renders destructive "Not configured"; hint text is "Enter your OpenRouter API key."
3. **`isLoading = true` or `isSaving = true`** — input is `disabled`; user cannot type a new key while loading or saving.
4. **`apiKeyInput = ""`** — `value=""` on the input; the masked backend value is NEVER placed here (invariant enforced by `useAppSettings`, verified by AppSettingsForm Tests 3 and 4).

---

### Step 2.2 — Create `DefaultModelCard.tsx`

**Goal:** Define the focused component that owns the default LLM model selector — no-models hint, typed `Select<number | null>`, and model list.
**Dependencies:** Step 2.1 complete (pattern established). Requires `LlmModelDTO` from `src/features/app-settings/types.ts`.

- [x] Create `src/features/app-settings/components/DefaultModelCard.tsx`.
- [x] Define `DefaultModelCardProps` interface with exactly 6 props: `enabledModels: LlmModelDTO[]`, `selectedDefaultModelId: number | null`, `hasEnabledModels: boolean`, `isLoading: boolean`, `isSaving: boolean`, `setSelectedDefaultModelId: (value: number | null) => void`.
- [x] Import `LlmModelDTO` using `import type` (TypeScript-only import).
- [x] Lift the `<Card>` JSX from `AppSettingsForm.tsx` lines 103–146 verbatim.
- [x] Import shadcn primitives: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`.
- [x] Run `npm run typecheck` — 0 errors.

**Why this step is critical:**
`DefaultModelCard` is the only place in the codebase that uses the `Select<number | null>` typed generic (which preserves numeric model IDs without `parseInt` coercion and allows the null clear option). Extracting it gives this type-precision pattern a single home — future model selector changes require touching only this card.

#### Implementation

```tsx
// src/features/app-settings/components/DefaultModelCard.tsx

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { LlmModelDTO } from "../types"

interface DefaultModelCardProps {
  enabledModels: LlmModelDTO[]
  selectedDefaultModelId: number | null
  hasEnabledModels: boolean
  isLoading: boolean
  isSaving: boolean
  setSelectedDefaultModelId: (value: number | null) => void
}

export function DefaultModelCard({
  enabledModels,
  selectedDefaultModelId,
  hasEnabledModels,
  isLoading,
  isSaving,
  setSelectedDefaultModelId,
}: DefaultModelCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Default LLM Model</CardTitle>
        <CardDescription>
          The model pre-selected for new conversations.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!hasEnabledModels && (
          <p className="text-xs text-muted-foreground">
            Add and enable an LLM model before selecting a default.
          </p>
        )}
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium">Default model</p>
          {/*
            Select<number | null>: typed generic preserves model IDs as numbers
            and the "No default model" clear option as null — no parseInt coercion.
            The "No default model" item needs the cast (null as number | null) to
            satisfy the generic constraint at the item level; this matches the
            existing EmployeeFilterBar pattern for null-valued items.
          */}
          <Select<number | null>
            value={selectedDefaultModelId}
            onValueChange={(v) => setSelectedDefaultModelId(v)}
          >
            <SelectTrigger disabled={!hasEnabledModels || isLoading || isSaving}>
              <SelectValue placeholder="No default model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null as number | null}>
                No default model
              </SelectItem>
              {enabledModels.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
```

#### Edge Cases

1. **`hasEnabledModels = false`** — no-models hint text is rendered; `SelectTrigger` is disabled. AppSettingsForm Test 5 verifies the hint text is visible.
2. **`hasEnabledModels = true`** — hint text absent; `SelectTrigger` enabled (unless `isLoading` or `isSaving`).
3. **`selectedDefaultModelId = null`** — `Select` displays "No default model" placeholder.
4. **`selectedDefaultModelId = 2`** — `Select` displays the name of model id 2 from `enabledModels`.
5. **`isLoading = true` or `isSaving = true`** — `SelectTrigger` is disabled.
6. **`enabledModels = []` + `hasEnabledModels = false`** — hint text shown, selector disabled, model list empty. The `null as number | null` clear option is still rendered; the trigger is disabled so the user cannot open the list.

---

### Step 2.3 — Create `LastUpdatedCard.tsx`

**Goal:** Define the minimal focused component that renders the last-updated metadata — ISO timestamp formatted for locale display, and the updating admin's username.
**Dependencies:** Steps 2.1 and 2.2 complete (pattern established). No type imports required.

- [x] Create `src/features/app-settings/components/LastUpdatedCard.tsx`.
- [x] Define `LastUpdatedCardProps` interface with exactly 2 props: `updatedAt: string | null | undefined`, `updatedByUsername: string | null | undefined`.
- [x] Use `string | null | undefined` (not `string | null`) because the caller passes `settings?.updatedAt` and `settings?.updatedByUsername` — optional chaining on `AppSettingsDTO | null` produces `undefined` when `settings` is null, and `string | null` when `settings` is non-null.
- [x] Lift the `<Card>` JSX from `AppSettingsForm.tsx` lines 148–164 verbatim, substituting `settings?.updatedAt` → `updatedAt` and `settings?.updatedByUsername` → `updatedByUsername`.
- [x] Import only `Card`, `CardHeader`, `CardTitle`, `CardContent` — no `CardDescription` (not present in the original Last Updated card).
- [x] Run `npm run typecheck` — 0 errors.

**Why this step is critical:**
The `toLocaleString()` date formatting and the null/undefined fallbacks are the only behavior in this card. Extracting them gives this formatting logic its own reason to change (if date format preferences change — e.g., switching to a date library or adding time-zone display — only `LastUpdatedCard` needs to change).

#### Implementation

```tsx
// src/features/app-settings/components/LastUpdatedCard.tsx

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"

interface LastUpdatedCardProps {
  updatedAt: string | null | undefined
  updatedByUsername: string | null | undefined
}

export function LastUpdatedCard({
  updatedAt,
  updatedByUsername,
}: LastUpdatedCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Last Updated</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">
          {updatedAt
            ? new Date(updatedAt).toLocaleString()
            : "Never updated"}
        </p>
        <p className="text-xs text-muted-foreground">
          {"By: "}
          {updatedByUsername ?? "No admin recorded"}
        </p>
      </CardContent>
    </Card>
  )
}
```

#### Edge Cases

1. **`updatedAt` is a valid ISO string** — `new Date(updatedAt).toLocaleString()` formats it for the browser's locale. Matches the existing behavior from `AppSettingsForm.tsx`.
2. **`updatedAt` is `null` or `undefined`** — the `updatedAt ?` conditional evaluates falsy; "Never updated" is shown.
3. **`updatedByUsername` is a non-empty string** — rendered as-is after "By: ".
4. **`updatedByUsername` is `null` or `undefined`** — `?? "No admin recorded"` renders the fallback. Matches original `settings?.updatedByUsername ?? "No admin recorded"`.

---

### Step 2.4 — Slim `AppSettingsForm.tsx`

**Goal:** Replace the three inline `<Card>` blocks in `AppSettingsForm.tsx` with calls to the three new card components; remove now-unused shadcn imports; verify all 5 existing tests still pass.
**Dependencies:** Steps 2.1, 2.2, 2.3 complete. All three card components exist and typecheck cleanly.

- [x] Add imports for the three card components at the top of `AppSettingsForm.tsx` (after existing imports).
- [x] Remove the following shadcn imports that are no longer used directly in `AppSettingsForm.tsx` after card extraction: `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`, `Input`, `Label`.
- [x] Replace the OpenRouter API Key `<Card>` block (lines 54–101) with `<OpenRouterApiKeyCard ... />`.
- [x] Replace the Default LLM Model `<Card>` block (lines 103–146) with `<DefaultModelCard ... />`.
- [x] Replace the Last Updated `<Card>` block (lines 148–164) with `<LastUpdatedCard ... />`.
- [x] Remove the `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` imports from `AppSettingsForm.tsx` — these primitives are now imported only by the card components, not by the form itself.
- [x] Run `npm run typecheck` — 0 errors.
- [x] Run `npm run test` — 101/101 pass (0 failures, 0 skipped); existing 5 `AppSettingsForm` tests pass unchanged.

**Why this step is critical:**
This is the composition step. The rendered DOM after this step is identical to the DOM before: the same elements, same attributes, same text. The 5 existing tests are DOM-level behavioral tests — they query `screen.getByLabelText("New API key")` and `screen.getByText("Add and enable an LLM model before selecting a default.")`. These queries succeed regardless of which component renders the element. All 5 tests must remain green without modification.

#### Implementation

The resulting `AppSettingsForm.tsx` after slimming:

```tsx
// src/features/app-settings/components/AppSettingsForm.tsx

import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { ErrorMessage } from "@/components/common/ErrorMessage"
import type { UseAppSettingsResult } from "../hooks/useAppSettings"
import { OpenRouterApiKeyCard } from "./OpenRouterApiKeyCard"
import { DefaultModelCard } from "./DefaultModelCard"
import { LastUpdatedCard } from "./LastUpdatedCard"

type AppSettingsFormProps = UseAppSettingsResult

export function AppSettingsForm({
  settings,
  enabledModels,
  apiKeyInput,
  selectedDefaultModelId,
  hasConfiguredApiKey,
  hasEnabledModels,
  isLoading,
  isSaving,
  error,
  successMessage,
  setApiKeyInput,
  setSelectedDefaultModelId,
  save,
}: AppSettingsFormProps) {
  // Load error: settings fetch failed and nothing to show
  if (!settings && error) {
    return <ErrorMessage message={error} />
  }

  // Initial loading: first fetch in flight, nothing rendered yet
  if (isLoading && !settings) {
    return <LoadingSpinner />
  }

  return (
    <div className="flex flex-col gap-6">
      <OpenRouterApiKeyCard
        apiKeyInput={apiKeyInput}
        hasConfiguredApiKey={hasConfiguredApiKey}
        isLoading={isLoading}
        isSaving={isSaving}
        setApiKeyInput={setApiKeyInput}
      />

      <DefaultModelCard
        enabledModels={enabledModels}
        selectedDefaultModelId={selectedDefaultModelId}
        hasEnabledModels={hasEnabledModels}
        isLoading={isLoading}
        isSaving={isSaving}
        setSelectedDefaultModelId={setSelectedDefaultModelId}
      />

      <LastUpdatedCard
        updatedAt={settings?.updatedAt}
        updatedByUsername={settings?.updatedByUsername}
      />

      {/* Save error — inline compact (settings loaded, save failed) */}
      {error && settings && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Success message */}
      {successMessage && (
        <p className="text-sm text-green-600 dark:text-green-400">
          {successMessage}
        </p>
      )}

      {/* Save */}
      <div className="flex justify-end">
        <Button
          onClick={() => void save()}
          disabled={isLoading || isSaving}
        >
          {isSaving ? "Saving..." : "Save settings"}
        </Button>
      </div>
    </div>
  )
}
```

**Props not destructured (pre-existing):**
- `reload` — `UseAppSettingsResult` includes `reload: () => void`, but `AppSettingsForm` has never destructured or used it (no Reload button). The thinned form also does not destructure `reload`. This is a pre-existing design; TypeScript does not error on unused spread props.

#### Edge Cases

1. **`!settings && error`** — `<ErrorMessage>` rendered directly (early return); none of the three card components are mounted. Behavior identical to original.
2. **`isLoading && !settings`** — `<LoadingSpinner>` rendered directly (early return). Behavior identical to original.
3. **`error && settings` (save error)** — settings are loaded; save failed; error banner `<p>` rendered below the Last Updated card and above the Save button. Distinct from the load-error early return.
4. **`successMessage`** — success banner renders below the save-error position. `error` and `successMessage` are mutually exclusive in practice (the hook clears one when the other is set), but both conditionals are independent — no behavioral change from the original.
5. **`isSaving = true`** — Save button label is "Saving...", disabled. Both `isLoading` and `isSaving` are also passed to each card that disables inputs during those states.

---

## Design Decisions

**Decision 1: `type AppSettingsFormProps = UseAppSettingsResult` preserved (not narrowed)**
- **Why:** `AppSettingsPage.tsx` spreads `{...appSettings}` — the full `UseAppSettingsResult` object — into `AppSettingsForm`. If `AppSettingsFormProps` were narrowed to the 6 props `AppSettingsForm` uses directly, TypeScript would require either an explicit pick/cast in the page or modifying `AppSettingsPage.tsx`. The parent bug's Potential Risks section explicitly permits leaving the alias unchanged. ISP is applied where it matters most: at the card level.
- **Alternatives considered:** Narrow to `Pick<UseAppSettingsResult, 'settings' | 'error' | 'successMessage' | 'isLoading' | 'isSaving' | 'save'>` plus card-specific props — evaluated and rejected because it requires changing `AppSettingsPage.tsx` and adds complexity with no behavioral gain; the card-level ISP already captures the ISP intent.

**Decision 2: No new tests for the extracted card components**
- **Why:** The cards are implementation details of `AppSettingsForm`. The 5 existing `AppSettingsForm` tests are DOM-level behavioral tests — they test what is rendered, not which component renders it. After refactoring, the rendered DOM is identical, so all 5 pass unchanged. Adding card-level tests would couple the test suite to the structural decomposition (which component renders the password input) rather than the behavior (that a password input with specific attributes exists). Per the TDD skill: "tests should survive internal refactors."
- **Alternatives considered:** Individual test files for each card — evaluated and rejected on TDD grounds; the cards have no independent public contract from the user's perspective (they are not exported from the feature's `index.ts`).

**Decision 3: JSX lifted verbatim (no rewrite)**
- **Why:** The goal is structural decomposition, not behavioral improvement. Rewriting the JSX introduces risk of behavioral drift. Verbatim extraction makes the diff reviewable: every line in the card components corresponds exactly to a line removed from `AppSettingsForm.tsx`. Post-refactor `fallow health` can confirm the CRAP improvement without behavioral uncertainty.
- **Alternatives considered:** Rewrite with minor refactors (rename classes, simplify conditionals) — evaluated and rejected because it conflates two changes (decomposition + rewrite) in one PR, making the refactor harder to review and rollback.

**Decision 4: `LastUpdatedCard` props typed as `string | null | undefined`**
- **Why:** `settings?.updatedAt` where `settings: AppSettingsDTO | null` produces `string | null | undefined`: `undefined` when `settings` is `null` (outer optional chain), `string | null` when `settings` is non-null (inner field type). Typing the props as `string | null` (omitting `undefined`) would require the caller to cast: `settings?.updatedAt ?? null`. Accepting `undefined` keeps the call site natural and the existing truthiness check (`updatedAt ?`) handles all three states correctly (`undefined` is falsy).
- **Alternatives considered:** `string | null` only with `?? null` at the call site — evaluated and rejected for unnecessary verbosity; `string | undefined` only — rejected because the DTO field is `string | null`, not `string | undefined`.

**Decision 5: Card components not exported from `index.ts`**
- **Why:** The card components are internal implementation details of `AppSettingsForm`. Exporting them from `src/features/app-settings/index.ts` would suggest they are part of the feature's public API, inviting external usage and creating unwanted coupling. `AppSettingsPage.tsx` uses only `AppSettingsForm` and `useAppSettings` — the barrel export is unchanged.
- **Alternatives considered:** Export from `index.ts` for potential future reuse — rejected because no current consumer exists; YAGNI.

---

## Testing Considerations

### Automatic Validation

- [x] `cd project/srcs/frontend && npm run typecheck` — 0 TypeScript errors. Verify after each step (2.1, 2.2, 2.3, 2.4 individually). `LastUpdatedCardProps` must accept `string | null | undefined` for both props without casting at the call site in `AppSettingsForm.tsx`.
- [x] `npm run test` — **101/101 pass** (0 failures, 0 skipped); same 17 test files. The 5 existing `AppSettingsForm.test.tsx` tests must all pass without modification:
  - Test 1 (`type="password"`) — passes: DOM element rendered by `OpenRouterApiKeyCard`; `screen.getByLabelText` finds it regardless.
  - Test 2 (`name="openRouterApiKey"`) — passes: same reason.
  - Test 3 (`value=""` security) — passes: `apiKeyInput=""` prop propagated to `OpenRouterApiKeyCard`; same DOM element.
  - Test 4 (`autoComplete`) — passes: attribute preserved verbatim in `OpenRouterApiKeyCard`.
  - Test 5 (no-models hint text) — passes: `screen.getByText(...)` finds the text rendered by `DefaultModelCard`.
- [x] `npm run lint` — expected: same 5 pre-existing lint errors as after Task 1 (`button.tsx`, `sidebar.tsx`, `useAppSettings.ts`, `useEmployeeList.ts`, `use-mobile.ts`). The three new card files must produce 0 new errors. **Note:** `useAppSettings.ts` line 92 has a pre-existing `react-hooks/set-state-in-effect` error that is explicitly scoped to Phase 5 of the parent bug; this task does not touch `useAppSettings.ts`. **Verified: 0 lint output for the 4 in-scope files.**
- [x] `npm run build` — Vite build succeeds. Expected bundle delta: ≤ +0.5 kB (3 new component files, no new dependencies; JSX is relocated, not added). Baseline: 511.78 kB / 167.48 kB gzip (from Task 1). **Measured: 512.31 kB / 167.60 kB gzip (delta +0.53 kB / +0.12 kB gzip). Slightly above the 0.5 kB estimate by 0.03 kB; well within rounding/margin and consistent with the relocations of three component definitions plus their import statements.**

### Manual Validation

- [ ] Navigate to the App Settings page in the browser (admin account, backend + frontend dev server running). Confirm all three cards render: OpenRouter API Key (with status badge and password input), Default LLM Model (with model selector), Last Updated (with timestamp and username).
- [ ] Verify the password input in the API Key card has `type="password"` (displayed as dots) and `value=""` on initial load — the masked key from `settings.openRouterApiKey` must NOT pre-fill the field.
- [ ] Type a new API key in the input; confirm the field accepts text (not disabled) when the page is in steady state.
- [ ] Change the default model selector; click Save — confirm the save flow works end-to-end (success message appears, `selectedDefaultModelId` updates from the response).
- [ ] Confirm the Last Updated card shows the correct timestamp and admin username after a successful save.

---

## Related Code Explanations

- `src/features/app-settings/components/AppSettingsForm.tsx` — the form being decomposed; post-task it is a thin layout wrapper (~30 lines) delegating to 3 card components
- `src/features/app-settings/components/AppSettingsForm.test.tsx` — 5 behavioral DOM tests; must pass unchanged (they test rendered DOM, not component structure)
- `src/features/app-settings/hooks/useAppSettings.ts` — source of `UseAppSettingsResult`; unchanged
- `src/features/app-settings/types.ts:1` — `LlmModelDTO` used by `DefaultModelCard`
- `src/pages/AppSettingsPage.tsx` — sole caller; spreads `{...appSettings}` unchanged

---

## Completion Criteria

- [x] Parent document [[Frontend-Code-Quality-Fallow-Health-Refactor]] reviewed and reflected accurately in this task
- [x] `src/features/app-settings/components/OpenRouterApiKeyCard.tsx` created with 5-prop ISP-compliant interface; renders API key card verbatim
- [x] `src/features/app-settings/components/DefaultModelCard.tsx` created with 6-prop ISP-compliant interface; renders default model selector card verbatim
- [x] `src/features/app-settings/components/LastUpdatedCard.tsx` created with 2-prop interface (`string | null | undefined`); renders last-updated metadata card verbatim
- [x] `src/features/app-settings/components/AppSettingsForm.tsx` slimmed: 3 inline `<Card>` blocks replaced with card component calls; now-unused shadcn imports removed
- [x] `type AppSettingsFormProps = UseAppSettingsResult` unchanged; `src/pages/AppSettingsPage.tsx` requires zero modifications
- [x] Card components not exported from `src/features/app-settings/index.ts` (internal implementation details)
- [x] `npm run typecheck` → 0 errors (verify after each of the 4 steps)
- [x] `npm run test` → 101/101 pass; all 5 existing `AppSettingsForm.test.tsx` tests pass without modification
- [x] `npm run lint` → 0 new errors introduced; same 5 pre-existing errors remain (`button.tsx`, `sidebar.tsx`, `useAppSettings.ts`, `useEmployeeList.ts`, `use-mobile.ts`) — none from the 4 new/modified files in this task <!-- REVIEW-FIX: Added lint criterion consistent with Task 1 pattern; omitting it left an implicit gap between the Testing Considerations section (which mentions lint) and the Completion Criteria -->
- [x] `npm run build` → success; bundle delta +0.53 kB / +0.12 kB gzip vs Task 1 baseline (slightly over the 0.5 kB estimate by 0.03 kB; consistent with relocating three component definitions plus their import statements)
- [ ] Manual validation steps documented above for the user to execute
- [ ] Phase 2 Steps 2.1–2.4 in [[Frontend-Code-Quality-Fallow-Health-Refactor]] marked `[x]` after execution

---

## Post-Review Notes

- **Bundle delta over estimate by 0.03 kB (512.31 kB vs predicted ≤ 512.28 kB).** The 0.5 kB budget was a rough estimate; the actual measured delta (0.53 kB / 0.12 kB gzip) reflects the cost of three component declarations plus their imports, which is structural overhead from the decomposition itself. The "JSX is relocated, not added" reasoning underestimates the per-file boilerplate of a module declaration and its imports. This is not a regression — it is the cost of the SRP/ISP decomposition. Future planning for similar refactors should budget closer to 0.6 kB per new card file.
- **Direct prop count in thinned `AppSettingsForm`:** 13 destructured from `UseAppSettingsResult` (one less than the 14-member interface; `reload` remains undestructured as in the original). Of the 13, 6 are used directly by the form (`settings`, `error`, `successMessage`, `isLoading`, `isSaving`, `save`) and 7 are passed through to the card components. This is correct — the destructuring is required by the type signature and avoids forced casting in the parent.
- **No review-blocking issues found.** All four modified/new files produce zero lint output. The 5 pre-existing lint errors are in unrelated files and are explicitly out of scope for this task (Phase 5 of the parent bug).
- **Behavior preserved exactly.** The 5 existing `AppSettingsForm` tests pass unchanged, confirming identical rendered DOM. The card components are pure structural relocations; no JSX was rewritten.
- **`AppSettingsForm.tsx` post-task size: 85 lines** (down from 189). The task plan estimated ~30 lines; the actual is higher because (a) explicit destructuring of 13 props takes 14 lines, (b) each card call site includes all required props (4–6 lines each), and (c) the two banner conditionals and the Save button block add 14 more lines. The form is still a thin composition wrapper; the rest of the line count is type signature and prop forwarding required by `type AppSettingsFormProps = UseAppSettingsResult`.
