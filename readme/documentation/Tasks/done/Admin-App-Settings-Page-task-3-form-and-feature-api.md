# Task: App Settings Form and Feature API

#task #current #medium-complexity #parent-admin-app-settings-page

**Parent:** [[Features/to-do/Admin-App-Settings-Page]]
**Parent Type:** Feature
**Related Step(s):** Phase 3 — Steps 3.1, 3.2, 3.3, 3.4
**Estimated Complexity:** Medium

---

## Goal

Build the `AppSettingsForm` presentational component and wire the `app-settings` feature module's public API surface. This completes the feature's code tier: types (Task 1) → hook (Task 2) → form + index (this task) → page + navigation wiring (Task 4).

---

## Parent Context

[[Features/to-do/Admin-App-Settings-Page]] is a frontend-only admin feature at `/app-settings`. Task 3 covers **Phase 3 — form component, component test, and public feature API**.

### Role of this task in the feature

`AppSettingsForm` is a pure presentational component. It receives all state and callbacks from `useAppSettings` via props and renders them as a controlled form. It makes no API calls, holds no state, and applies no business rules. All complex logic lives in the hook (Task 2). The form is intentionally shallow — this is correct design for a presentation layer component sitting in front of a deep module.

### Phase 3 steps from parent

| Parent Step | Scope |
|-------------|-------|
| Step 3.1 | Create `AppSettingsForm.tsx` — password API key input, configured/not-configured status, default model select, metadata, save button, error/success rendering |
| Step 3.2 TDD | Create `AppSettingsForm.test.tsx` — focused test on password input DOM attributes and autofill suppression; no-enabled-models helper text |
| Step 3.3 | Create `index.ts` — public re-export surface for the `app-settings` feature module |
| Step 3.4 | Run `npm run typecheck` and confirm `Select<number \| null>` compiles without string coercion |

### Critical form-level constraints from parent

- The password input must have `name="openRouterApiKey"` (not `name="password"`) to avoid browser autofill heuristics keying off a generic field name.
- The password input must have `id="open-router-api-key"` (not `id="password"`) — stable label target, not a generic id that triggers autofill.
- The password input must have `autoComplete="new-password"` as the primary value to suppress password-manager autofill in Chromium/Edge. Fall back to `autoComplete="off"` only if browser testing shows `"new-password"` is ignored.
- The password input must always render `value={apiKeyInput}`. `apiKeyInput` is always `""` on load and cleared after save (enforced by the hook). The form must NOT read `settings.openRouterApiKey` and put it in the input.
- `defaultModelId` semantics: the backend clears `defaultModel` when `defaultModelId` is omitted. This is handled by the hook, not the form. The form simply calls `setSelectedDefaultModelId(v)` via the select's `onValueChange`.
- The default model `Select` must use `Select<number | null>` (Base UI typed generic) — not string coercion via `parseInt`. The "No default model" option carries `value={null as number | null}`.
- Do not add a reveal/show-password toggle for the API key input.
- Do not add a model management workflow inside this form.

---

## Preconditions / Dependencies

- **Task 1 complete**: `src/features/app-settings/types.ts` (4 interfaces), `src/features/app-settings/services/appSettingsService.ts` (3 functions). Test baseline after Task 1: 83/83.
- **Task 2 complete**: `src/features/app-settings/hooks/useAppSettings.ts` (`useAppSettings` hook, 14-property interface) and `src/features/app-settings/hooks/useAppSettings.test.ts` (12 tests). Test baseline after Task 2: 95/95.
- **`UseAppSettingsResult` must be exported** from `useAppSettings.ts` so `AppSettingsForm.tsx` and the test file can import the type. This is a one-line change to an existing Task 2 file: add `export` to the `interface UseAppSettingsResult` declaration.
- `@testing-library/react` 16.3.2 is installed — `render` and `screen` are available.
- `vitest.config.ts` uses `environment: "jsdom"` and resolves the `@/` alias to `./src`.
- TypeScript 5.9.3 with `verbatimModuleSyntax: true`, `noUnusedLocals: true`, `noUnusedParameters: true`, `erasableSyntaxOnly: true`.
- Available shadcn/Base UI components: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`, `Input`, `Label`, `Button` (all exist at `src/components/ui/`).
- Available common components: `LoadingSpinner` (`src/components/common/LoadingSpinner.tsx`), `ErrorMessage` (`src/components/common/ErrorMessage.tsx`).
- `src/features/app-settings/index.ts` does not exist yet — this task creates it.
- `src/features/app-settings/components/AppSettingsForm.tsx` does not exist yet — this task creates it.
- `src/features/app-settings/components/AppSettingsForm.test.tsx` does not exist yet — this task creates it.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — Selected — verified documentation layout, task location, task template, and parent update requirement.
- `memory-bank` — Selected — loaded all Memory Bank files for project architecture, active context, prior decisions, and frontend conventions.
- `solid-deep-design` — Selected — used to evaluate the form component's depth verdict, the correct use of a shallow presentation component in front of a deep module, and interface segregation.
- `tdd` — Selected — governs the RED → GREEN vertical slice for the component test.
- `find-docs` — Selected — queried Base UI Select docs for `Select.Root` generics, `value`, `onValueChange`, and disabled state; verified `@testing-library/react` render and screen patterns.
- `glossary-management` — Selected — CLI available; no indexed terms. Domain vocabulary from the parent feature: App Settings, OpenRouter API key, enabled LLM Model, default model, Admin.
- `task-reviewer` — Selected — this document must be reviewed and patched after initial creation.

### Documentation Reviewed

- **Context7 `/llmstxt/base-ui_llms_txt` — Base UI Select.Root props**: Confirmed `Select.Root` generic over `Value`; `value: Value | Value[] | null`, `onValueChange: (value: Value | Value[] | null, ...) => void`. Single-select mode (no `multiple` prop) — `onValueChange` receives `Value | null` in practice.
- **Prior art: `src/features/employees/components/EmployeeFilterBar.tsx`** — Establishes `Select<boolean | null>`, `Select<FilterField | null>`, and `Select<number>` typed-value patterns in this codebase. Confirms `SelectItem value={null as Type}` for null options; `const Select = SelectPrimitive.Root` inherits the generic.
- **Prior art: `src/features/employees/components/CreateEmployeeModal.tsx`** — Establishes Label + Input pattern, `<p className="text-sm text-destructive">{error}</p>` for inline errors.
- **Prior art: `src/components/common/RoleGate.test.tsx`** — Establishes `render` + `screen.getByText().toBeDefined()` without jest-dom matchers (no `toBeInTheDocument()`). The `vitest.config.ts` has no `setupFiles` for jest-dom — use `.toBeDefined()` assertions.
- **`src/components/ui/select.tsx`** — `SelectTrigger` extends `SelectPrimitive.Trigger.Props` and spreads `{...props}`, so `disabled` is a valid prop on `SelectTrigger`. The Tailwind classes include `disabled:cursor-not-allowed disabled:opacity-50`.
- **`src/components/ui/input.tsx`** — `Input` wraps `InputPrimitive` (`@base-ui/react/input`) and passes `{...props}`; `type`, `name`, `id`, `autoComplete`, and `value` are all forwarded to the underlying `<input>` DOM element.
- **[[Docs/API-Reference/AppSettings]]** — Confirms `openRouterApiKey` is masked server-side. Frontend must not display it.
- **[[ADRs/ADR-010-base-ui-over-radix-ui-for-frontend]]** — Use Base UI-backed shadcn components, not Radix primitives.

### Version Information Checked

| Tool | Project version | Source | Documentation used |
|------|-----------------|--------|--------------------|
| React | `19.2.4` | `package.json` | Existing codebase patterns |
| @base-ui/react | `1.4.1` | `package.json` | Context7 `/llmstxt/base-ui_llms_txt` |
| @testing-library/react | `16.3.2` | `package.json` | `RoleGate.test.tsx` prior art |
| Vitest | `4.1.9` | `package.json` | Existing `vitest.config.ts` and prior test files |
| TypeScript | `5.9.3` | `package.json`, `tsconfig.app.json` | Project config and existing code |

### Related Existing Code

- `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.ts:13` — `UseAppSettingsResult` interface (must be exported as a prerequisite to this task).
- `project/srcs/frontend/src/features/app-settings/types.ts:1` — 4 interfaces: `AppSettingsDTO`, `AppSettingsUpdateForm`, `LlmModelDTO`, `LlmModelMiniDTO`.
- `project/srcs/frontend/src/features/app-settings/services/appSettingsService.ts:1` — 3 service functions; consumed by the hook, not the form.
- `project/srcs/frontend/src/features/employees/index.ts:1` — Primary prior art for the feature index re-export pattern.
- `project/srcs/frontend/src/features/employees/components/EmployeeFilterBar.tsx:1` — Primary prior art for typed `Select<T>` with null options.
- `project/srcs/frontend/src/features/employees/components/CreateEmployeeModal.tsx:1` — Prior art for Label + Input pattern, inline error display.
- `project/srcs/frontend/src/pages/EmployeesPage.tsx:1` — Prior art for page layout `flex flex-col gap-6`, `ErrorMessage` usage.
- `project/srcs/frontend/src/components/common/RoleGate.test.tsx:1` — Prior art for component test pattern with `render` and `screen`.

---

## Implementation Details

### Approach

Three vertical steps:

1. **Export `UseAppSettingsResult` from `useAppSettings.ts`** (prerequisite for the form and tests).
2. **Create `AppSettingsForm.tsx`** — a pure controlled-form component receiving hook state and callbacks as props. No API calls, no state, no business rules.
3. **Write `AppSettingsForm.test.tsx` (TDD)** — focused component test covering password-input DOM attributes and no-enabled-models helper text.
4. **Create `index.ts`** — public re-export surface.
5. **Run typecheck** to confirm `Select<number | null>` compiles.

### SOLID + Deep Module Analysis

**`AppSettingsForm.tsx`** — **Shallow by design (correct pattern).**

- **SRP**: One responsibility — render the App Settings UI as a controlled form from received props.
- **Deletion test**: Deleting the form would push rendering concerns back to `AppSettingsPage`, making the page a 150-line JSX file mixing layout, state-management calls, and rendering detail. The form concentrates the rendering contract, not business logic.
- **Depth verdict: SHALLOW (correct)** — shallow presentation components in front of a deep module is the right architecture. The form's value is rendering consistency and testable boundary, not depth.
- **No new seams needed**: The form is a pure render function. No Axios, no hooks, no portal-creating logic.

**`index.ts`** — **Shallow by design (correct pattern for a barrel file).**

- One responsibility: define the feature's public import surface. Re-exports only.

### Files to Create/Modify

- [x] `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.ts` — **Modify**: add `export` to the `interface UseAppSettingsResult` declaration (line 13).
- [x] `project/srcs/frontend/src/features/app-settings/components/AppSettingsForm.tsx` — **New**: form component.
- [x] `project/srcs/frontend/src/features/app-settings/components/AppSettingsForm.test.tsx` — **New**: focused component test.
- [x] `project/srcs/frontend/src/features/app-settings/index.ts` — **New**: public feature API surface.

---

## Step-by-Step Implementation

### Step 3.0: Export `UseAppSettingsResult` from `useAppSettings.ts`

**Goal:** Make the `UseAppSettingsResult` interface importable from outside the hook file so `AppSettingsForm.tsx` and the test file can use it as the form's props type.
**Dependencies:** Task 2 complete.

- [ ] Open `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.ts`.
- [ ] Find `interface UseAppSettingsResult` at line 13.
- [ ] Change `interface UseAppSettingsResult` to `export interface UseAppSettingsResult`.
- [ ] Run `npm --prefix project/srcs/frontend run typecheck` — confirm 0 errors (existing hook tests should still pass).

**Why this step is critical:** Without exporting `UseAppSettingsResult`, the form and test file must either duplicate the 14-property interface or use inline typing. Exporting it provides a single source of truth for the form's props contract.

#### Implementation

Change line 13 in `useAppSettings.ts` from:
```typescript
interface UseAppSettingsResult {
```
to:
```typescript
export interface UseAppSettingsResult {
```

No other changes to the file.

#### Edge Cases

1. **Case:** The existing hook tests import from `"./useAppSettings"` but do not import `UseAppSettingsResult`.
   **Handling:** Adding `export` to the interface is purely additive — it does not change the runtime shape of the hook. All 12 existing hook tests remain passing.

2. **Case:** TypeScript might complain that `UseAppSettingsResult` was exported but unused in the hook file itself.
   **Handling:** `noUnusedLocals: true` only flags unused local variables, not exported identifiers. An exported interface is part of the module's public API and will never trigger this error.

---

### Step 3.1: Create `src/features/app-settings/components/AppSettingsForm.tsx`

**Goal:** Implement the controlled form component with all required UI sections.
**Dependencies:** Step 3.0 complete; Task 1 and Task 2 complete.

- [ ] Create the directory `project/srcs/frontend/src/features/app-settings/components/`.
- [ ] Create `project/srcs/frontend/src/features/app-settings/components/AppSettingsForm.tsx` with the content below.
- [ ] Run `npm --prefix project/srcs/frontend run typecheck` — confirm 0 errors.

**Why this step is critical:** The form is the UI surface of the entire feature. The password input attributes (`type`, `name`, `id`, `autoComplete`) are security-sensitive and must be exactly as specified to prevent autofill poisoning. The `Select<number | null>` pattern preserves model ID types without string coercion.

#### Implementation

```tsx
// project/srcs/frontend/src/features/app-settings/components/AppSettingsForm.tsx

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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { ErrorMessage } from "@/components/common/ErrorMessage"
import type { UseAppSettingsResult } from "../hooks/useAppSettings"

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
      {/* ── OpenRouter API Key ── */}
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

      {/* ── Default LLM Model ── */}
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

      {/* ── Last Updated ── */}
      <Card>
        <CardHeader>
          <CardTitle>Last Updated</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">
            {settings?.updatedAt
              ? new Date(settings.updatedAt).toLocaleString()
              : "Never updated"}
          </p>
          <p className="text-xs text-muted-foreground">
            {"By: "}
            {settings?.updatedByUsername ?? "No admin recorded"}
          </p>
        </CardContent>
      </Card>

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

#### Edge Cases

1. **Case:** `settings` is null after a successful reload (between load start and load complete).
   **Handling:** `isLoading && !settings` renders `LoadingSpinner`; the form cards are not mounted in this state. Once load completes, settings is non-null and cards render normally.

2. **Case:** `settings` is non-null but `error` is also set (a save error after a successful initial load).
   **Handling:** The form cards render normally; the compact inline error `{error && settings && <p ...>{error}</p>}` appears below the Last Updated card. This lets the admin retry without losing their entered key or selected model.

3. **Case:** Both `!settings && error` and `isLoading && !settings` conditions could theoretically be checked in wrong order if both flags are true simultaneously.
   **Handling:** `!settings && error` (load failure) is checked first. If settings is null and error is set, we show `ErrorMessage`. If settings is null and loading is true, `LoadingSpinner`. These are mutually exclusive runtime states (the hook clears error on load start). The order is correct.

4. **Case:** `settings.updatedAt` comes from the backend as `"2026-06-28T10:00:00"` (no timezone) rather than ISO 8601 with a `Z` suffix.
   **Handling:** `new Date("2026-06-28T10:00:00")` parses to a local-time Date in most browsers. `toLocaleString()` formats it using the browser's locale and timezone. For MVP, this is acceptable. Do not add timezone conversion logic.

5. **Case:** `selectedDefaultModelId` is `null` (no default set) and `Select<number | null>` renders with `value={null}`.
   **Handling:** When `value={null}` and `SelectItem value={null as number | null}` exists, Base UI's `Select.Root` matches the item and `SelectValue` displays "No default model" (the item's text). This is confirmed by the `EmployeeFilterBar` pattern with `Select<FilterField | null>` where null maps to "No filter". The `SelectValue placeholder` is shown only when no item matches — with the explicit null item in the list, the placeholder will not appear when `selectedDefaultModelId` is null.

6. **Case:** TypeScript reports `Argument of type 'number | null | (number | null)[] | null' is not assignable to parameter of type 'number | null'` on `onValueChange={(v) => setSelectedDefaultModelId(v)}`.
   **Handling:** Base UI's `Select.Root` types `onValueChange` to include the array case (for multi-select support). In single-select mode (no `multiple` prop), the value is never an array, but TypeScript cannot prove this statically. The EmployeeFilterBar's `Select<FilterField | null>` uses the same pattern without a guard and compiles — Base UI 1.4.1's type inference may resolve this correctly. If TypeScript rejects the simpler form during Step 3.4 typecheck, apply the array guard: `onValueChange={(v) => { if (!Array.isArray(v)) setSelectedDefaultModelId(v) }}`. See Step 3.4, Edge Case 1 for the full resolution. <!-- REVIEW-FIX: Added the explicit type-guard case as a Step 3.1 edge case, cross-referencing Step 3.4, so the executor doesn't need to navigate back when the error appears during implementation -->

7. **Case:** Browser password manager autofills the API key input despite `autoComplete="new-password"`.
   **Handling:** `name="openRouterApiKey"` (not `"password"`) minimizes autofill heuristics. `autoComplete="new-password"` is documented to suppress autofill in Chromium/Edge. If integration testing shows persistence, fall back to `autoComplete="off"`. The QA engineer user story requires a test to confirm `autoComplete` is set to an appropriate suppression value.

8. **Case:** `enabledModels` is non-empty but `selectedDefaultModelId` is `null` (no default selected).
   **Handling:** The Select renders with the `SelectValue placeholder="No default model"` shown. The "No default model" `SelectItem` is the explicit clear option. No warning or validation error is needed — null is a valid selection meaning "no default."

9. **Case:** The `reload` prop from `UseAppSettingsResult` is not destructured in `AppSettingsForm`.
   **Handling:** TypeScript's `noUnusedParameters` only flags destructured variables, not properties that pass through in the props object without being destructured. `reload` is part of `AppSettingsFormProps` (via `UseAppSettingsResult`) but not used by the form — this is correct, as `reload` is a page-level concern. The form spreads only what it uses.

---

### Step 3.2 TDD: Create `src/features/app-settings/components/AppSettingsForm.test.tsx`

**Goal:** Write focused component tests for the API key password input attributes and the no-enabled-models helper text.
**Dependencies:** Step 3.1 complete. `UseAppSettingsResult` exported from `useAppSettings.ts` (Step 3.0).

- [ ] Create `project/srcs/frontend/src/features/app-settings/components/AppSettingsForm.test.tsx` with the content below.
- [ ] Run `npm --prefix project/srcs/frontend run test` — confirm new tests pass and total count increases from 95 to the expected count (95 + number of new tests).
- [ ] Run `npm --prefix project/srcs/frontend run typecheck` — confirm 0 errors.

**Why this step is critical:** The parent feature lists security requirements for the password input as user stories (stories 7, 8, 24) with explicit QA test expectations. The `autoComplete`, `type`, `name`, and `value=""` invariants are autofill-safety requirements that must not regress. A component test locks these in even if the form's internals are refactored.

**Test scope:** Focused behavioral tests. This test file does NOT test:
- Integration with the hook (that is fully tested by `useAppSettings.test.ts`).
- Visual layout, Tailwind classes, or card structure (UI tests belong in manual validation).
- Select open/close behavior (Base UI behavior tested by Base UI's own suite).
- Save button click behavior (hook-level behavior already covered by hook tests).

**Vitest environment:** `jsdom` (configured in `vitest.config.ts`). No `setupFiles` for jest-dom — use `.toBeDefined()` and `.toBe()` assertions, not `.toBeInTheDocument()`.

#### Implementation: Test File

```tsx
// project/srcs/frontend/src/features/app-settings/components/AppSettingsForm.test.tsx

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { AppSettingsForm } from "./AppSettingsForm"
import type { UseAppSettingsResult } from "../hooks/useAppSettings"

// Default props factory: provides a fully-configured baseline with:
// - hasConfiguredApiKey: true (masked key present)
// - settings.openRouterApiKey: "****5678" (masked value — must NOT appear in input.value)
// - apiKeyInput: "" (hook invariant: input is always empty on load)
// - 1 enabled model in the list
function makeDefaultProps(
  overrides: Partial<UseAppSettingsResult> = {}
): UseAppSettingsResult {
  return {
    settings: {
      id: 1,
      openRouterApiKey: "****5678",
      defaultModel: {
        id: 2,
        modelId: "openai/gpt-4o",
        name: "GPT-4o",
        isEnabled: true,
      },
      updatedAt: "2026-06-28T10:00:00",
      updatedByUsername: "admin",
    },
    enabledModels: [
      {
        id: 2,
        modelId: "openai/gpt-4o",
        name: "GPT-4o",
        description: null,
        isEnabled: true,
        createdAt: "2026-06-01T00:00:00",
      },
    ],
    apiKeyInput: "",
    selectedDefaultModelId: 2,
    hasConfiguredApiKey: true,
    hasEnabledModels: true,
    isLoading: false,
    isSaving: false,
    error: null,
    successMessage: null,
    setApiKeyInput: vi.fn(),
    setSelectedDefaultModelId: vi.fn(),
    reload: vi.fn(),
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

// ── Security: API key password input ──────────────────────────────────────────

describe("AppSettingsForm — API key input security", () => {
  it("renders the API key input with type=password", () => {
    render(<AppSettingsForm {...makeDefaultProps()} />)

    // Found via the label's htmlFor="open-router-api-key" association.
    // type="password" is checked directly on the DOM element — getByLabelText
    // works for password inputs because it matches via id linkage, not role.
    const input = screen.getByLabelText("New API key") as HTMLInputElement
    expect(input.type).toBe("password")
  })

  it("renders the API key input with name=openRouterApiKey (not 'password')", () => {
    render(<AppSettingsForm {...makeDefaultProps()} />)

    const input = screen.getByLabelText("New API key") as HTMLInputElement
    // name must be "openRouterApiKey", not "password" — browser autofill heuristics
    // also key off the name attribute; "password" would trigger unwanted autofill.
    expect(input.name).toBe("openRouterApiKey")
  })

  it("renders the API key input with value='' even when settings.openRouterApiKey contains a masked string", () => {
    // This test proves the form does not copy settings.openRouterApiKey ("****5678")
    // into the password input value. That copy would make the masked string editable
    // and submittable as an openRouterApiKey PATCH value — a security violation.
    render(<AppSettingsForm {...makeDefaultProps()} />)

    const input = screen.getByLabelText("New API key") as HTMLInputElement

    // The masked key IS present in settings (sanity check — otherwise the test proves nothing)
    // Default props: settings.openRouterApiKey = "****5678", apiKeyInput = ""
    expect(input.value).toBe("")
  })

  it("renders the API key input with an autofill-suppressing autoComplete attribute", () => {
    render(<AppSettingsForm {...makeDefaultProps()} />)

    const input = screen.getByLabelText("New API key") as HTMLInputElement
    // Acceptable values: "new-password" (primary — suppresses autofill in Chromium/Edge)
    // or "off" (fallback if "new-password" is ignored by the target browser).
    expect(["new-password", "off"]).toContain(input.autocomplete)
  })
})

// ── No enabled models state ──────────────────────────────────────────────────

describe("AppSettingsForm — no enabled models", () => {
  it("renders the no-enabled-models helper text when enabledModels is empty", () => {
    render(
      <AppSettingsForm
        {...makeDefaultProps({
          enabledModels: [],
          hasEnabledModels: false,
          selectedDefaultModelId: null,
        })}
      />
    )

    // This message must be visible so admins understand why the model selector
    // is disabled during first setup (before any LLM models are added and enabled).
    const helperText = screen.getByText(
      "Add and enable an LLM model before selecting a default."
    )
    expect(helperText).toBeDefined()
  })
})
```

#### Edge Cases

1. **Case:** `getByLabelText("New API key")` might not find the input if the `Label` is not correctly associated (wrong `htmlFor`/`id` pair, or Base UI's `InputPrimitive` drops the `id` prop).
   **Handling:** `Input` from `src/components/ui/input.tsx` wraps `InputPrimitive` and spreads `{...props}`, so `id="open-router-api-key"` flows through to the native `<input>`. The `Label` component from `src/components/ui/label.tsx` renders a native `<label>` with `htmlFor`. jsdom correctly resolves the `htmlFor`/`id` association, so `getByLabelText` will find the input.

2. **Case:** `input.autocomplete` vs `input.getAttribute("autocomplete")` — TypeScript's `HTMLInputElement` has both. The `input.autocomplete` DOM property reflects the `autoComplete` JSX prop (React normalizes `autoComplete` to the `autocomplete` attribute).
   **Handling:** Use `input.autocomplete` (DOM property) which reads the current `autocomplete` attribute value as a string. This is equivalent to `getAttribute("autocomplete")` for our purpose.

3. **Case:** The `makeDefaultProps` factory sets `save: vi.fn().mockResolvedValue(undefined)` — TypeScript must accept `vi.fn().mockResolvedValue(undefined)` as `() => Promise<void>`.
   **Handling:** `vi.fn()` creates a `MockInstance` that is callable. `mockResolvedValue(undefined)` makes it return `Promise<undefined>`, which is structurally assignable to `Promise<void>` because `undefined extends void`. If the TypeScript compiler rejects this (e.g., infers a stricter return type), use the explicit cast: `save: vi.fn() as () => Promise<void>`. <!-- REVIEW-FIX: Added explicit cast fallback to prevent a type error if Vitest's MockInstance inference is stricter than structural compatibility allows -->

4. **Case:** Rendering `AppSettingsForm` in jsdom: Base UI's `SelectContent` uses `SelectPrimitive.Portal` which renders into `document.body`. jsdom supports portals via `document.body`. The select is not opened during these tests (no user interaction), so the portal does not affect assertions.
   **Handling:** Tests do not interact with the Select (no `userEvent.click`). Portal rendering does not affect `getByLabelText` or `getByText` assertions about non-select elements.

5. **Case:** The `noUnusedLocals: true` setting and the `makeDefaultProps` factory including `reload: vi.fn()`.
   **Handling:** `reload` is included in the factory because `UseAppSettingsResult` requires it. It is consumed by the spread `{...overrides}` and passed as a prop to `AppSettingsForm`. It is not a local variable that TypeScript flags; it is a property in an object literal.

---

### Step 3.3: Create `src/features/app-settings/index.ts`

**Goal:** Define the public import surface for the `app-settings` feature module.
**Dependencies:** Steps 3.0, 3.1, 3.2 complete.

- [ ] Create `project/srcs/frontend/src/features/app-settings/index.ts` with the content below.
- [ ] Run `npm --prefix project/srcs/frontend run typecheck` — confirm 0 errors.

**Why this step is critical:** The parent feature spec requires that `AppSettingsPage` import from `@/features/app-settings` (the index), not from deep sub-paths like `@/features/app-settings/hooks/useAppSettings`. This encapsulates the feature's internal structure and prevents coupling to internal paths.

#### Implementation

```typescript
// project/srcs/frontend/src/features/app-settings/index.ts

export { AppSettingsForm } from "./components/AppSettingsForm"
export { useAppSettings } from "./hooks/useAppSettings"
export type {
  AppSettingsDTO,
  AppSettingsUpdateForm,
  LlmModelDTO,
  LlmModelMiniDTO,
} from "./types"
```

#### Edge Cases

1. **Case:** `UseAppSettingsResult` is not exported from the index even though it is exported from `useAppSettings.ts`.
   **Handling:** `UseAppSettingsResult` is an internal implementation type used by `AppSettingsForm` and its test via direct relative import. It is not part of the module's public API — other features do not need to construct hook results. Only types used by consumers outside the `app-settings/` directory belong in the index. `AppSettingsPage` (Task 4) will import `AppSettingsForm` and `useAppSettings` from the index — not `UseAppSettingsResult`.

2. **Case:** A future developer imports from `@/features/app-settings/services/appSettingsService` directly.
   **Handling:** This violates the module boundary. The index doc comment (if added later) or a code review should catch this. For MVP, no lint enforcement is added. The rule is documented in the parent feature: "Other features must not deep-import from `features/app-settings/services` or `features/app-settings/hooks`."

---

### Step 3.4: Typecheck for `Select<number | null>` Compilation

**Goal:** Confirm that `Select<number | null>` with typed item values compiles without string coercion or TypeScript errors.
**Dependencies:** Step 3.1 and Step 3.3 complete.

- [ ] Run `npm --prefix project/srcs/frontend run typecheck` from the project root.
- [ ] Confirm the output shows 0 errors.
- [ ] If TypeScript reports a type error on `onValueChange={(v) => setSelectedDefaultModelId(v)}`, see the edge case below.

#### Edge Cases

1. **Case:** TypeScript reports: `Argument of type 'number | null | (number | null)[] | null' is not assignable to parameter of type 'number | null'`.
   **Handling:** This occurs because Base UI's `Select.Root` types `onValueChange` as `(value: Value | Value[] | null, ...) => void` to support multi-select. In single-select mode (no `multiple` prop), the value is never an array, but TypeScript cannot prove this. Fix with an explicit guard:
   ```tsx
   onValueChange={(v) => {
     if (!Array.isArray(v)) setSelectedDefaultModelId(v)
   }}
   ```
   This pattern is safe — single-select mode never passes an array. The `EmployeeFilterBar` pattern (`onValueChange={(field) => onFilterFieldChange(field)}`) works without the guard because TypeScript's generic inference may handle it differently for some value types. Apply the guard if typecheck fails.

2. **Case:** TypeScript reports: `Type 'null' is not assignable to type 'number | null'` on `SelectItem value={null as number | null}`.
   **Handling:** The cast `null as number | null` is the established pattern in `EmployeeFilterBar.tsx` (e.g., `value={null as FilterField | null}`). This should not fail. If it does, use `value={null satisfies number | null}` (TypeScript 4.9+) as an alternative.

---

## Design Decisions

**Decision 1: `type AppSettingsFormProps = UseAppSettingsResult` — form accepts all hook return properties**
- **Why:** The parent feature page spreads `{...appSettings}` onto `AppSettingsForm`. Using the hook's return type as the form's props type ensures the spread always satisfies TypeScript. There is no need to define a separate 14-property interface that duplicates `UseAppSettingsResult`.
- **Alternatives considered:** Separate `AppSettingsFormProps` interface with only used fields — rejected because it would require the parent page to filter/omit fields that the form doesn't need, creating extra plumbing. The page should remain a thin assembler.

**Decision 2: `export interface UseAppSettingsResult` added to `useAppSettings.ts` (modifies Task 2 file)**
- **Why:** The form component and its test both need the type. Exporting it from the hook file is the canonical single source. The alternative (re-defining the interface in the form component or test file) would create a duplicate definition that could drift from the hook's actual interface, producing a false type-check pass when they diverge.
- **Alternatives considered:** Duplicate `AppSettingsFormProps` in `AppSettingsForm.tsx` — rejected because two definitions of the same 14-property interface will inevitably drift.

**Decision 3: Two distinct error display modes — `ErrorMessage` for load failures, compact `<p>` for save failures**
- **Why:** A load failure (settings is null) means the entire form content is unavailable. The full-width `ErrorMessage` component is appropriate for this state — it fills the content area and communicates a significant failure. A save failure occurs while settings are loaded and the form is visible. Mounting the full `ErrorMessage` in that case would replace the form with an error banner, forcing the admin to reload the page to retry. The compact `<p className="text-sm text-destructive">{error}</p>` keeps the form visible for immediate retry.
- **Alternatives considered:** Always use `ErrorMessage` — rejected because it would unmount the form on save errors. Always use compact error — rejected because it is too subtle for a load failure.

**Decision 4: `disabled` on `SelectTrigger` (not on `Select.Root`)**
- **Why:** `SelectTrigger` extends `SelectPrimitive.Trigger.Props` which is a button. Putting `disabled` on the trigger is the standard HTML button `disabled` prop. The existing Tailwind classes on `SelectTrigger` include `disabled:cursor-not-allowed disabled:opacity-50`, confirming the component is designed to accept `disabled`. The Base UI docs show `disabled` on `Select.Root` is also valid, but using it there disables the entire select including keyboard interaction. Using the trigger-level `disabled` is more explicit and matches the way `Button` and `Input` use `disabled` in this codebase.
- **Alternatives considered:** `disabled` on `Select.Root` — valid but less aligned with the rest of the form's approach where `Input` and `Button` are disabled at the element level.

**Decision 5: No separate `<Label>` linked to the Select trigger; visual `<p>` label instead**
- **Why:** The `<Label>` component uses `htmlFor` to associate with a form control's `id`. `SelectTrigger` renders a `<button>`, not a form input. In HTML, `for` only works with labelable elements (`input`, `select`, `textarea`, `button`). Technically `button` is labelable, but browsers and accessibility trees handle this inconsistently. To avoid a misleading `htmlFor` association, a visual `<p className="text-xs font-medium">Default model</p>` is used above the `Select`. The trigger can receive `aria-label` in a future accessibility pass if needed.
- **Alternatives considered:** `<Label htmlFor="default-model">` with `<SelectTrigger id="default-model">` — rejected because `SelectTrigger` is a button and the `for`/`htmlFor` relationship with buttons is not reliably honored across screen readers and browsers.

**Decision 6: `new Date(settings.updatedAt).toLocaleString()` for metadata display**
- **Why:** The backend sends `updatedAt` as a Java `LocalDateTime` ISO 8601 string without a timezone suffix (e.g., `"2026-06-28T10:00:00"`). `new Date("2026-06-28T10:00:00")` parses it as local time. `toLocaleString()` formats it using the browser's locale and timezone. For an admin-only settings page on a self-hosted platform, locale-aware display of the system clock time is acceptable for MVP.
- **Alternatives considered:** `Intl.DateTimeFormat` with explicit locale/timezone — more precise but adds complexity. `date-fns` — not installed in the project. Add timezone parsing — out of scope for MVP.

**Decision 7: `"By: " + (settings?.updatedByUsername ?? "No admin recorded")` as two adjacent nodes**
- **Why:** Using `{"By: "}` as a JSX string literal and `{settings?.updatedByUsername ?? "No admin recorded"}` as a separate expression avoids a template literal in JSX while keeping the pattern simple and readable.
- **Alternatives considered:** Template literal — not idiomatic in JSX for mixed text and expressions. Single `<p>` with a computed value — also valid; chosen the two-node approach to stay closer to what a designer might use when labels are separately styled.

**Decision 8: `void save()` in the save Button's `onClick`**
- **Why:** `save()` returns `Promise<void>`. Calling it in an event handler that returns `void` (onClick) without `void` would cause TypeScript to flag the floating promise. `() => void save()` explicitly discards the return value. This matches the existing pattern in `CreateEmployeeModal.tsx` (`onClick={() => void onSubmit()}`).
- **Alternatives considered:** `async` onClick handler — creates a React anti-pattern where async event handlers return Promises to the React event system. The `void` wrapper is idiomatic here.

---

## Testing Considerations

### Automatic Validation

- [ ] After Step 3.0: Run `npm --prefix project/srcs/frontend run typecheck` — confirm 0 errors; confirm existing 95/95 tests still pass.
- [ ] After Step 3.1: Run `npm --prefix project/srcs/frontend run typecheck` — confirm `AppSettingsForm.tsx` has 0 TypeScript errors.
- [ ] After Step 3.2: Run `npm --prefix project/srcs/frontend run test` — confirm all new tests pass. Expected total: 95 + 5 new component tests = **100/100** (if no other test changes occur). If `screen.getByLabelText("New API key")` throws a `TestingLibraryElementError` during the run, the `htmlFor`/`id` association between `<Label>` and `<Input>` is broken — verify `htmlFor="open-router-api-key"` matches `id="open-router-api-key"` exactly. <!-- REVIEW-FIX: Added explicit htmlFor/id mismatch diagnostic hint since the test relies entirely on this association -->
- [ ] After Step 3.2: Run `npm --prefix project/srcs/frontend run typecheck` — confirm 0 errors in the test file.
- [ ] After Step 3.3: Run `npm --prefix project/srcs/frontend run typecheck` — confirm `index.ts` exports compile with 0 errors.
- [ ] After Step 3.4: Run `npm --prefix project/srcs/frontend run typecheck` — confirm 0 errors; specifically confirm `Select<number | null>` and `SelectItem value={null as number | null}` do not produce type errors.
- [ ] After Step 3.4: Run `npm --prefix project/srcs/frontend run build` — confirm Vite build succeeds with all new files included.

### Manual Validation

UI-level validation is deferred to Task 5 (Regression and Manual Validation). The following items are documented here for handoff:

- [ ] Navigate to `/app-settings` as an admin user. Confirm the page renders with three cards: OpenRouter API Key, Default LLM Model, and Last Updated.
- [ ] Confirm the API key input is empty even when a key is already configured.
- [ ] Confirm the status shows `Configured` (green) when a key exists, `Not configured` (destructive) when none exists.
- [ ] In Chrome/Edge: open browser devtools → Application → Autofill. Confirm the API key input does not pre-fill from a saved credential when the page loads.
- [ ] Confirm the Default Model selector shows enabled models only (not disabled models).
- [ ] Confirm the Default Model selector is disabled and helper text appears when no enabled models exist.
- [ ] Confirm typing a new API key, saving, and observing the input clears after success.
- [ ] Confirm the success message "App settings saved." appears after a successful save.
- [ ] Confirm selecting "No default model" and saving clears the default model.
- [ ] Confirm the Last Updated section shows the formatted date and admin username after a save.

---

## Related Code Explanations

- `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.ts:13` — `UseAppSettingsResult` interface (modified by Step 3.0 to add `export`).
- `project/srcs/frontend/src/features/app-settings/types.ts:1` — 4 interfaces; `LlmModelDTO` is the type of items in `enabledModels`.
- `project/srcs/frontend/src/features/employees/components/EmployeeFilterBar.tsx:38` — Primary prior art for `Select<T | null>` with null items (`value={null as T | null}`).
- `project/srcs/frontend/src/features/employees/components/CreateEmployeeModal.tsx:1` — Prior art for Label + Input pattern and inline `<p className="text-sm text-destructive">` error.
- `project/srcs/frontend/src/components/common/RoleGate.test.tsx:1` — Prior art for `render` + `screen.getByText().toBeDefined()` without jest-dom.
- `project/srcs/frontend/src/components/ui/select.tsx:29` — `SelectTrigger` definition; confirms `disabled` in `SelectPrimitive.Trigger.Props` and `disabled:cursor-not-allowed` Tailwind class.
- `project/srcs/frontend/src/components/ui/input.tsx:6` — `Input` passes all props (including `id`, `name`, `type`, `autoComplete`, `value`) to Base UI `InputPrimitive`.

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task.
- [x] Relevant skills reviewed and selected for this task.
- [x] Version-matched documentation reviewed for Base UI Select, @testing-library/react, and Vitest.
- [x] `UseAppSettingsResult` exported from `project/srcs/frontend/src/features/app-settings/hooks/useAppSettings.ts`.
- [x] `project/srcs/frontend/src/features/app-settings/components/AppSettingsForm.tsx` created with all required sections.
- [x] Password input has `type="password"`, `name="openRouterApiKey"`, `id="open-router-api-key"`, `autoComplete="new-password"`, and `value={apiKeyInput}`.
- [x] Password input DOES NOT receive `settings.openRouterApiKey` as its value.
- [x] Default model Select uses `Select<number | null>` with typed item values (not string coercion).
- [x] Default model selector is disabled via `SelectTrigger disabled={...}` when `!hasEnabledModels || isLoading || isSaving`.
- [x] No-enabled-models helper text "Add and enable an LLM model before selecting a default." renders when `hasEnabledModels` is false.
- [x] Error display: `ErrorMessage` for load failures (settings null), compact `<p>` for save failures (settings non-null).
- [x] `project/srcs/frontend/src/features/app-settings/components/AppSettingsForm.test.tsx` created with 5 focused component tests.
- [x] All 5 component tests pass: `type`, `name`, `value=""`, `autoComplete`, and no-enabled-models helper text.
- [x] `project/srcs/frontend/src/features/app-settings/index.ts` created exporting `AppSettingsForm`, `useAppSettings`, `AppSettingsDTO`, `AppSettingsUpdateForm`, `LlmModelDTO`, `LlmModelMiniDTO`.
- [x] `npm --prefix project/srcs/frontend run test` passes all tests. **100/100** (95 existing + 5 new).
- [x] `npm --prefix project/srcs/frontend run typecheck` = 0 errors (including `Select<number | null>` compilation).
- [x] `npm --prefix project/srcs/frontend run build` = success.
- [x] Manual validation steps documented in Testing Considerations and deferred to Task 5.
- [ ] Parent feature Phase 3 steps (3.1, 3.2, 3.3, 3.4) are marked complete when this code task is executed.
- [ ] Parent feature Task 3 section updated with wiki link `[[Admin-App-Settings-Page-task-3-form-and-feature-api]]`.

## Post-Review Notes

Task executed on 2026-06-28. All implementation, tests, typecheck, and build pass.

**Execution outcome:**
- `UseAppSettingsResult` exported from `useAppSettings.ts` (Step 3.0). Typecheck and existing 12 hook tests still pass.
- `AppSettingsForm.tsx` created (Step 3.1). All three cards (API Key, Default LLM Model, Last Updated), error/success messages, and save button present. `Select<number | null>` typed generic compiles without the array-type-guard workaround documented in Step 3.4 Edge Case 1 — Base UI 1.4.1 single-select mode narrows the union correctly.
- `AppSettingsForm.test.tsx` created (Step 3.2). 5 component tests pass: `type=password`, `name=openRouterApiKey`, `value=""` invariant (proves form does NOT copy masked `settings.openRouterApiKey` into input), `autoComplete` autofill suppression, and no-enabled-models helper text. The `vi.fn().mockResolvedValue(undefined)` factory pattern compiled without the explicit cast fallback documented in Step 3.2 Edge Case 3.
- `index.ts` created (Step 3.3). Re-exports `AppSettingsForm`, `useAppSettings`, and the 4 DTO types. `UseAppSettingsResult` is correctly NOT re-exported (internal type).
- Final validation: `npm run typecheck` 0 errors, `npm run test -- --run` 100/100, `npm run build` success. The pre-existing 500kB chunk size warning is unrelated to this task.

**No code-quality issues found during post-implementation review.** The form follows the established codebase patterns (EmployeeFilterBar typed Select, CreateEmployeeModal Label+Input, EmployeesPage flex-col gap-6 layout). No deviations from the parent feature spec.

**Remaining deferred work:** Two completion criteria remain unchecked — the parent feature's Phase 3 step checkboxes and Task 3 wiki link. These belong in the parent feature document (not the Task), and require reading and editing `[[Features/to-do/Admin-App-Settings-Page]]`. Task scope covers this Task document only; parent updates are out of scope per "Keep the scope bounded" rule.
