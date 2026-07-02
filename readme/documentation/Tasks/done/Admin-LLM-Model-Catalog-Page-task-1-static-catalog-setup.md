# Task: Static Catalog Setup

#task #current #low-complexity #parent-admin-llm-model-catalog-page

**Parent:** [[Admin-LLM-Model-Catalog-Page]]
**Parent Type:** Feature
**Related Step(s):** Phase 1 — Steps 1.1, 1.2
**Estimated Complexity:** Low

---

## Goal

Copy the OpenRouter model catalog snapshot to the frontend's public directory and install the shadcn Tabs component so the three-tab `AppSettingsPage` layout can be assembled in Task 5. Neither step introduces any React module or business logic — this task exists to place two static prerequisites before any UI code in Tasks 2–4 can be written.

---

## Parent Context

The Admin LLM Model Catalog Page feature extends the existing `/app-settings` admin page with a three-tab layout: **General Settings** (existing content), **System Models** (the admin-curated LLM catalog), and **Add Models** (browser for the OpenRouter model catalog). The feature document is at `documentation/Features/to-do/Admin-LLM-Model-Catalog-Page.md`.

**Task 1 is the infrastructure-only setup task.** Its job is to satisfy two prerequisites that block every other task:

1. **Step 1.1 — `models.json` static asset**: The Add Models tab (`AvailableModelsTab`) fetches the full OpenRouter model catalog from `/models.json` via `fetch()` when the admin first opens that tab. The catalog snapshot already exists at `project/models.json` (~488 KB). Copying it to `project/srcs/frontend/public/models.json` makes it a same-origin static asset served by Vite at the root URL — no import, no bundle impact. This is the correct location for large static data files that must not be inlined into the JavaScript bundle (Vite serves `public/` at the root automatically and excludes it from bundle analysis).

2. **Step 1.2 — shadcn `Tabs` component**: The three-tab layout in `AppSettingsPage.tsx` (Task 5) uses `Tabs`, `TabsList`, `TabsTrigger`, and `TabsContent` from `@/components/ui/tabs`. No `tabs.tsx` exists yet. Running `npx shadcn@latest add tabs` with the project's `components.json` (`"style": "base-mira"`) will generate the correct Base UI–backed component (ADR-010 mandates this style).

   **Critical verification (Finding 4 from [[Bugs/done/Review-Admin-LLM-Model-Catalog-Page]]):** After generation, `tabs.tsx` must be inspected to confirm that `TabsContent` forwards `{...props}` to the underlying `@base-ui/react` `Tabs.Panel`. This is necessary because the feature document sets `keepMounted={false}` explicitly on the `add-models` `TabsContent` to convert the Base UI default into an explicit, reviewable contract (user story 12: lazy-load guarantee). If the shadcn wrapper hardcodes `keepMounted={true}` or ignores unknown props, the explicit prop has no effect and the 500 KB `/models.json` fetch fires on every page load — not only on first tab-click. The prior Dialog and other shadcn components in this project use the `{...props}` spread pattern uniformly, so forwarding is expected, but it must be confirmed.

**No backend changes.** The CORS `PATCH` fix mentioned in earlier versions of the feature is already present at `project/srcs/backend/src/main/java/com/BHT/configuration/security/SecurityConfig.java:124` (resolved in [[Bugs/done/Post-Implementation-Review-of-Llm-Model-Entity-and-Admin-Crud]] Finding 1). Task 1 contains no backend work.

**Dependency chain:** Task 2 (types + service), Task 3 (hooks + tab), Task 4 (available models hook, modal, tab), and Task 5 (page restructure) all either depend on `models.json` being present at `/models.json` or depend on `tabs.tsx` existing. Neither Task 2 nor Task 3 directly imports these files, but Task 5 imports `tabs.tsx` and Task 4 fetches `/models.json` — those tasks cannot compile or run without this task complete.

---

## Preconditions / Dependencies

- The React + Vite + TypeScript frontend project exists at `project/srcs/frontend/`.
- `project/models.json` exists at the project root (~488 KB, OpenRouter model catalog snapshot confirmed).
- `project/srcs/frontend/public/` directory exists (currently contains only `vite.svg`).
- `components.json` is present at `project/srcs/frontend/components.json` with `"style": "base-mira"` — confirmed. This ensures `npx shadcn@latest add tabs` generates a Base UI–backed component per ADR-010.
- `@base-ui/react ^1.4.1` is installed (resolved to `1.5.0` per Memory Bank — `Tabs.Panel.keepMounted` defaults to `false`).
- No `tabs.tsx` exists yet in `project/srcs/frontend/src/components/ui/`.
- Current test baseline: **112/112 tests** across 19 files (no regressions allowed).
- Node.js and npm are available (`npm run typecheck`, `npm run test` work from the frontend directory).
- This task has no dependency on any other task in this feature — it is the first.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — Selected — governs document structure and placement.
- `solid-deep-design` — Selected — applied to verify the shadcn `tabs.tsx` wrapper is a thin, prop-forwarding adapter (deletion test, depth check).
- `find-docs` — Selected — used to verify shadcn install command and `@base-ui/react` `Tabs.Panel` `keepMounted` behavior.
- `tdd` — Not needed — no tests are written in this task; no new business logic is introduced.
- `memory-bank` — Selected — provides project context (stack versions, ADR-010, Vite `public/` behavior, prior shadcn installs).
- `glossary-management` — Selected — domain vocabulary reviewed (LLM Model, System Model, OpenRouter Model).

### Documentation Reviewed

- **Context7 `/shadcn-ui/ui`** — confirmed `npx shadcn@latest add tabs` as the correct CLI command. The `"style": "base-mira"` in `components.json` selects the Base UI (`@base-ui/react`) backed component family. No explicit `--style` flag is needed.
- **Context7 `/mui/base-ui`** — confirmed `Tabs.Panel` `keepMounted` prop:
  - API: `keepMounted?: boolean`, **default `false`** (inactive panels `return null` — lazy mounting is the default behavior)
  - Source: `const { keepMounted = false, ...} = componentProps; const shouldRender = keepMounted || mounted; if (!shouldRender) { return null; }`
  - This confirms that the lazy-load assumption in user story 12 already holds by default; the explicit `keepMounted={false}` in Task 5 converts this default into a named contract.
- **ADR-010** (`documentation/ADRs/ADR-010-base-ui-over-radix-ui-for-frontend.md`) — accepted. All new shadcn components must use `base-mira` style. Radix UI component packages (beyond `@radix-ui/react-slot`) are explicitly excluded.
- **ADR-007** (`documentation/ADRs/ADR-007-admin-curated-llm-model-list.md`) — accepted. Only admins may browse and add models. `models.json` is a static snapshot of the OpenRouter catalog for admin-only use; employees never see it.
- **[[Bugs/done/Review-Admin-LLM-Model-Catalog-Page]] Finding 4** — the `keepMounted` finding whose resolution mandates the Step 1.2 verification and the explicit `keepMounted={false}` in Task 5.

### Related Existing Code

- `project/srcs/frontend/src/components/ui/dialog.tsx` — existing shadcn/Base UI primitive in the same directory; confirms the project's shadcn wrapper pattern: thin function wrappers that spread `{...props}` onto the Base UI primitive, forwarding all props including non-standard ones. This pattern ensures `keepMounted` will be forwarded by the generated `tabs.tsx`.
- `project/srcs/frontend/components.json` — the shadcn CLI config; confirmed `"style": "base-mira"`, `"tsx": true`, `"rsc": false`.
- `project/srcs/frontend/package.json` — confirms `@base-ui/react: ^1.4.1` (resolved to 1.5.0), `shadcn: ^4.7.0`.
- `project/srcs/frontend/public/` — current contents: `vite.svg`. Vite serves this directory at the root URL during dev and copies it verbatim to `dist/` during build. Files in `public/` are never imported by JS modules and are excluded from bundle size analysis.
- `project/models.json` — the source file to be copied; structure confirmed as `{ "data": OpenRouterModel[] }` where each model has `id` (OpenRouter model identifier), `name`, `description`, `context_length`, and `pricing.prompt`/`pricing.completion` as per-token string values.

---

## Implementation Details

### Approach

Both steps are infrastructure-only: no TypeScript code is written, no React components are authored, no tests are added.

**Step 1.1** is a file copy. The challenge is placement: `public/` must be used (not `src/`) so Vite excludes the 500 KB file from the JavaScript bundle. A file imported directly via `import modelsData from './models.json'` would be inlined into the bundle — exactly what the feature document explicitly rules out (it resolves a pre-existing 500 KB chunk-size warning already present in `npm run build` output). Placing it in `public/` makes it a same-origin HTTP resource fetched via `fetch('/models.json')` at runtime by `useAvailableModels.load()` (Task 4).

**Step 1.2** is a CLI install + inspection. The shadcn CLI reads `components.json` and generates the Base UI–backed tabs component automatically. The inspection is a design-gate check: confirm the generated `TabsContent` wrapper passes `{...props}` through to `Tabs.Panel` so `keepMounted` is not silently ignored. Based on the `dialog.tsx` pattern, this is expected but must be documented.

**SOLID / Deep Module analysis:**

- `models.json` (static asset) — Not a module; a pure data file. No depth analysis needed. Its "seam" is the Vite static serving layer: callers use `fetch('/models.json')`, never `import`.
- `tabs.tsx` (generated) — A thin adapter (shadcn wrapper over Base UI `Tabs.*`). The deletion test: if deleted, callers would need to import `@base-ui/react/tabs` directly and write their own class composition. The wrapper earns its keep by hiding Tailwind class composition and aligning the API vocabulary to the project's import path (`@/components/ui/tabs`). The wrapper should be SHALLOW by design (thin adapter) — depth belongs in the consumers (`SystemModelsTab`, `AvailableModelsTab`, `AppSettingsPage`). The key quality criterion is that it does NOT deepen the interface by dropping or hardcoding props — it must remain neutral toward `keepMounted`.

### Files to Create/Modify

- [x] `project/srcs/frontend/public/models.json` — **new** — OpenRouter model catalog snapshot; copy of `project/models.json`. Static asset served by Vite at `/models.json`; never imported by any JS module.
- [x] `project/srcs/frontend/src/components/ui/tabs.tsx` — **new** — shadcn/ui `Tabs` component generated by `npx shadcn@latest add tabs`; exports `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`. No manual edits expected.

---

## Step-by-Step Implementation

### Step 1.1: Copy the Model Catalog Static Asset

**Goal:** Place `project/models.json` at `project/srcs/frontend/public/models.json` so Vite serves it at `/models.json` as a same-origin static file, ensuring the Add Models tab can fetch it lazily via `fetch('/models.json')` without bundling it.
**Dependencies:** None.

- [x] Run the copy command from the project root
- [x] Verify the file exists at the destination path (489 KB at `project/srcs/frontend/public/models.json`)
- [x] Spot-check the JSON structure to confirm the `data` array is present (`data.length = 339`; first entry `id="sakana/fugu-ultra"`, `name="Sakana: Fugu Ultra"`, pricing object present)

**Why this step is critical:**
`useAvailableModels.load()` (Task 4) calls `fetch('/models.json')` and expects a response with shape `{ data: OpenRouterModel[] }`. If the file is absent, the Add Models tab will receive a 404 and show an error state. If the file is placed anywhere inside `src/` and imported, it is inlined into the Vite bundle — adding 500 KB to the JavaScript payload on every page load.

#### Implementation

```bash
# Run from the project root (42-last/project/ is NOT the project root;
# the project root is the directory that contains `project/`, `documentation/`, etc.)
cp project/models.json project/srcs/frontend/public/models.json

# Verify the file is present and has the expected size (~488 KB):
ls -lh project/srcs/frontend/public/models.json

# Spot-check: confirm the top-level key is "data" and the first entry has an "id" field:
node -e "
  const fs = require('fs');
  const d = JSON.parse(fs.readFileSync('project/srcs/frontend/public/models.json', 'utf8'));
  const first = d.data[0];
  console.log('data length:', d.data.length);
  console.log('first.id:', first.id);
  console.log('first.name:', first.name);
  console.log('first.pricing:', first.pricing);
"
```

The output should show a `data` array with hundreds of entries, each having an `id` (OpenRouter model identifier), `name`, and `pricing` object. Any structure other than `{ data: [...] }` at the top level means the wrong file was copied.

#### Edge Cases

1. **Case:** The source `project/models.json` does not exist.
   **Handling:** The copy command will fail with `cp: cannot stat 'project/models.json': No such file or directory`. The file was confirmed present at the beginning of this task; if it is missing, check whether the project root is correct (this command must be run from `42-last/`, not from within `project/`).

2. **Case:** The destination `project/srcs/frontend/public/` does not exist.
   **Handling:** `cp` will fail with a "No such file or directory" error on the destination. Run `mkdir -p project/srcs/frontend/public/` first (though this directory is confirmed to already exist with `vite.svg`).

3. **Case:** A developer imports `models.json` from inside `src/` instead (e.g., `import data from '../../public/models.json'`).
   **Handling:** This is a future concern, not a Task 1 issue. The correct pattern — `fetch('/models.json')` in `useAvailableModels.load()` — is specified in the parent feature document and will be implemented in Task 4. No action needed in Task 1.

4. **Case:** `npm run build` shows `models.json` in the bundle size report after this task.
   **Handling:** A file in `public/` is NOT bundled by Vite — it is copied verbatim to `dist/` and served as a static file. If build output mentions `models.json`, verify the file was not accidentally imported by any TypeScript source. The pre-existing 500 KB chunk-size warning in build output is from something else (likely an existing large import) and is unrelated to this file.

---

### Step 1.2: Install the shadcn Tabs Component

**Goal:** Generate `src/components/ui/tabs.tsx` via the shadcn CLI and confirm it exports `Tabs`, `TabsList`, `TabsTrigger`, and `TabsContent`.
**Dependencies:** Step 1.1 (logically independent, but run sequentially to keep output clean).

- [x] Run `npx shadcn@latest add tabs` from the frontend directory (or use `--cwd`)
- [x] Confirm `src/components/ui/tabs.tsx` is created
- [x] Run `npm run typecheck` — confirm 0 errors
- [x] Run `npm run test` — confirm 112/112 tests pass (no regressions from the new file)

**Why this step is critical:**
`AppSettingsPage.tsx` (Task 5) imports `{ Tabs, TabsList, TabsTrigger, TabsContent }` from `@/components/ui/tabs`. Without this file, Task 5 will fail the typecheck on import resolution. The ADR-010 constraint means only the `base-mira`–style component is acceptable — a Radix-based `tabs.tsx` would silently introduce `@radix-ui/react-tabs` and create a mixed-library situation.

#### Implementation

```bash
# Option A — run from within the frontend directory:
cd project/srcs/frontend
npx shadcn@latest add tabs

# Option B — use shadcn's --cwd flag (run from project root, no cd needed):
npx shadcn@latest add tabs --cwd project/srcs/frontend
```

The CLI reads `components.json` (`"style": "base-mira"`) and generates a Base UI–backed tabs component at `src/components/ui/tabs.tsx`. If the CLI prompts about the style or initialization, verify you are pointing at the correct directory — `components.json` must be present at that path.

#### Edge Cases

1. **Case:** The CLI installs `@radix-ui/react-tabs` (Radix-based component).
   **Handling:** This means `components.json` was not found or has the wrong style. Remove `@radix-ui/react-tabs` from `package.json`, delete the generated file, verify `components.json` has `"style": "base-mira"`, and re-run. Radix-based Tabs does not expose a `keepMounted` prop on its `TabsContent`, making the Finding 4 fix impossible.

2. **Case:** `npm run typecheck` fails on the newly generated `tabs.tsx`.
   **Handling:** Read the error. Most likely a Base UI version type mismatch. Check the import path in the generated file (`@base-ui/react/tabs`) against the installed package version (`^1.4.1`, resolved to `1.5.0`). If a type API changed between versions, adjust the import.

3. **Case:** The CLI skips install because it detects a `tabs.tsx` already exists.
   **Handling:** This should not happen (the file is confirmed absent). If prompted to overwrite, confirm `yes`.

---

### Step 1.2a: Verify `TabsContent` Forwards `keepMounted` via `{...props}`

**Goal:** Read the generated `tabs.tsx` and confirm that the `TabsContent` wrapper function passes `{...props}` (or equivalent) to the underlying `@base-ui/react` `Tabs.Panel`, ensuring the explicit `keepMounted={false}` prop set in `AppSettingsPage.tsx` (Task 5) reaches the Base UI primitive.
**Dependencies:** Step 1.2 must be complete (the file must exist).

- [x] Open `project/srcs/frontend/src/components/ui/tabs.tsx` and read its full content
- [x] Locate the `TabsContent` component (the wrapper around `Tabs.Panel` from `@base-ui/react/tabs`)
- [x] Confirm it spreads `{...props}` onto the Base UI primitive (or otherwise passes all props through)
- [x] Record the finding in the Design Decisions section below
- [x] Act per the decision matrix if `keepMounted` is NOT forwarded (no action required — `keepMounted` is forwarded)

**Why this step is critical:**
`AppSettingsPage.tsx` (Task 5, Step 5.1) sets `keepMounted={false}` explicitly on the `add-models` `TabsContent` as a contract against future regressions (user story 12 — lazy-load guarantee). If the shadcn wrapper silently drops unknown props or hardcodes `keepMounted={true}`, the explicit prop has no effect and the 500 KB `/models.json` fetch fires on every `AppSettingsPage` load — exactly the performance issue the feature is designed to prevent.

The finding from [[Bugs/done/Review-Admin-LLM-Model-Catalog-Page]] Finding 4 confirms that `@base-ui/react@1.5.0` `Tabs.Panel` defaults `keepMounted` to `false` (lazy mounting is already the default). The risk is only at the shadcn wrapper layer.

#### Implementation

```typescript
// What to look for in src/components/ui/tabs.tsx:

// EXPECTED (based on the dialog.tsx pattern in this project):
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      className={cn("...", className)}
      {...props}           // ← keepMounted passes through here
    />
  )
}

// ALSO ACCEPTABLE — direct re-export (rarer for Base UI panels):
const TabsContent = TabsPrimitive.Panel

// NOT ACCEPTABLE — keepMounted hardcoded or missing:
function TabsContent({ className, children, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      keepMounted={true}   // ← locks all panels to always-mounted; voids the lazy-load contract
      className={cn("...", className)}
      {...props}
    >
      {children}
    </TabsPrimitive.Panel>
  )
}
```

**Decision matrix based on what you find:**

| Finding | Action |
|---------|--------|
| `TabsContent` spreads `{...props}` onto `Tabs.Panel` (or re-exports directly) | Document "keepMounted is forwarded." Task 5 may set `keepMounted={false}` on `<TabsContent value="add-models">` as specified. No edits to the generated file. |
| `TabsContent` hardcodes `keepMounted={true}` | Edit the generated `tabs.tsx`: remove the hardcoded prop, keeping `{...props}` spread so the caller controls mounting. Run `npm run typecheck` to confirm 0 errors. |
| `TabsContent` does NOT spread `{...props}` at all (only forwards `className` and `children`) | Edit `tabs.tsx` to add `{...props}` spread on the `Tabs.Panel` element. Ensure `className` is still merged via `cn(...)` first. Run `npm run typecheck`. |

**If an edit is required, add it to the Files to Create/Modify checklist and document it in Design Decisions.**

#### Edge Cases

1. **Case:** The generated `tabs.tsx` uses a completely different prop forwarding approach (e.g., explicit destructuring of every known `Tabs.Panel` prop without a rest spread).
   **Handling:** Add a `{...props}` spread to the `Tabs.Panel` render call, or restructure the wrapper to accept `...rest` and pass it through. The goal is that any prop accepted by `@base-ui/react/tabs` `Tabs.Panel` reaches the underlying component.

2. **Case:** The `TabsContent` wrapper is Radix-based (has `forwardRef`, wraps `TabsPrimitive.Content` from `@radix-ui/react-tabs`).
   **Handling:** Wrong style was used in Step 1.2. See Step 1.2 Edge Case 1 for remediation. Radix `Tabs.Content` does not support `keepMounted` at all — the prop would be silently ignored.

3. **Case:** `tabs.tsx` exports `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`, and additional exports not used by the feature.
   **Handling:** No action needed. The extra exports are harmless.

---

## Design Decisions

**Decision 1: `public/` placement, not `src/` import, for `models.json`**
- **Why:** A 488 KB JSON file imported as a TypeScript module would be inlined into the JavaScript bundle by Vite, inflating the initial page-load payload for every user hitting any page (not just the Add Models tab). Placing it in `public/` makes it a separately fetched HTTP resource, requested only when `useAvailableModels.load()` is called (on first tab-click). This directly satisfies user story 12 and resolves the pre-existing 500 KB chunk-size warning in `npm run build`.
- **Alternatives considered:** Fetching the live OpenRouter API from the backend (`GET /llm-model/available` proxying `/models`) — deferred to post-MVP per the parent feature's "Out of scope" section. Static file is the accepted MVP approach.

**Decision 2: Copy, not symlink or reference, `models.json`**
- **Why:** Vite's `public/` directory requires real files (not symlinks) to guarantee correct behavior in Docker containers and CI environments. Symlinking from `public/models.json → ../../../models.json` would break when the Docker container mounts only the `srcs/frontend` directory. A copy is portable and reproducible.
- **Alternatives considered:** Keeping the file only at `project/models.json` and configuring Vite to serve it — rejected because this requires a Vite config change and introduces accidental complexity. The copy is one command with zero config risk.

**Decision 3: Verify `keepMounted` forwarding as a blocking gate before Task 5**
- **Why:** Task 5 (`AppSettingsPage` restructure) sets `keepMounted={false}` explicitly on the `add-models` `TabsContent`. If the shadcn wrapper silently drops this prop, the explicit setting in Task 5 has no effect and the 500 KB fetch fires eagerly. Discovering this in Task 5 (after the feature is composed) is harder to fix than discovering and documenting it in Task 1. The Step 1.2a verification is the gate that makes Task 5's contract explicit and safe.
- **Alternatives considered:** Deferring the check to Task 5 — rejected because the feature's lazy-load guarantee is the architectural goal of `keepMounted={false}` (Finding 4, Option d decision); the Task 1 placement ensures the check is completed before any component code depends on it.

**Decision 4: No tests added in this task**
- **Why:** No business logic is introduced. The `tabs.tsx` component is auto-generated from the shadcn CLI and its correctness is verified by `npm run typecheck` + `npm run build` + the running test suite (regression). The `models.json` is a pure data file verified by structure inspection. Writing unit tests for a file copy or a CLI-generated UI primitive tests infrastructure, not project behavior.
- **Alternatives considered:** A Vitest test that fetches `/models.json` and asserts structure — rejected because Vitest runs in jsdom (no real Vite dev server), making `fetch('/models.json')` impossible without mocking. The manual validation step covers the real server behavior.

**Decision 5: Finding 1.2a result — `keepMounted` is forwarded**
- **Finding:** The generated `tabs.tsx` (lines 70-78) defines `TabsContent` as:
  ```tsx
  function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
    return (
      <TabsPrimitive.Panel
        data-slot="tabs-content"
        className={cn("flex-1 text-xs/relaxed outline-none", className)}
        {...props}
      />
    )
  }
  ```
  The wrapper destructures only `className` and spreads `{...props}` onto `TabsPrimitive.Panel` from `@base-ui/react/tabs`. There is no hardcoded `keepMounted` value and no destructuring of individual `Tabs.Panel` props. This matches the project's shadcn wrapper pattern (see `dialog.tsx` `DialogContent` at lines 40-78) and satisfies the Step 1.2a gate. The `base-mira` style is confirmed: the file imports from `@base-ui/react/tabs` (line 1), not `@radix-ui/react-tabs`, and `package.json` does not contain `@radix-ui/react-tabs`.
- **Action taken:** No edits to `tabs.tsx`. Task 5 may set `keepMounted={false}` on `<TabsContent value="add-models">` and the prop will reach `Tabs.Panel`, where Base UI's default (also `false`) applies. Lazy-load contract is preserved.

---

## Testing Considerations

### Automatic Validation

- [x] `ls -lh project/srcs/frontend/public/models.json` — file exists and is approximately 488 KB — **489 KB confirmed**
- [x] `node -e "const d=JSON.parse(require('fs').readFileSync('project/srcs/frontend/public/models.json','utf8')); console.log(Array.isArray(d.data) && d.data.length > 0 && typeof d.data[0].id === 'string')"` — outputs `true` — **`data.length = 339`, first entry has string `id`**
- [x] `ls project/srcs/frontend/src/components/ui/tabs.tsx` — file exists after Step 1.2
- [x] `grep -n "TabsContent" project/srcs/frontend/src/components/ui/tabs.tsx` — confirms `TabsContent` is defined/exported
- [x] `grep -n "keepMounted\|\.\.\.props\|\.\.\.rest" project/srcs/frontend/src/components/ui/tabs.tsx` — output confirms prop forwarding approach for `TabsContent` (used to document the Step 1.2a finding) — **`...props` spread present at line 75 onto `TabsPrimitive.Panel`**
- [x] `npm --prefix project/srcs/frontend run typecheck` — 0 errors after Step 1.2
- [x] `npm --prefix project/srcs/frontend run test` — 112/112 tests pass (no regressions; new files add no tests)
- [x] `grep "radix-ui/react-tabs" project/srcs/frontend/package.json` — command returns **no output** (exit 1); confirms `base-mira` style was used
- [x] `npm --prefix project/srcs/frontend run build` — build succeeds; `models.json` does NOT appear in the JS chunk size report (it is in `public/`, not imported by any module — Vite copies it verbatim to `dist/models.json` as a plain file, which is confirmed separately in the Manual Validation below) — **build succeeded, `dist/assets/index-CZPrJPlj.js` does not contain `sakana/fugu-ultra`; the pre-existing 500 KB chunk-size warning is unchanged in source (same `index-*.js` chunk as before this task)**

### Manual Validation

- [ ] **`models.json` is accessible as a static file:** Start the Vite dev server (`npm --prefix project/srcs/frontend run dev`) and open `http://localhost:3000/models.json` in the browser. Confirm the response is valid JSON with a `data` array and at least one model entry. A 404 means the file was placed in the wrong directory.
<!-- REVIEW-FIX: Clarified dist/ vs bundle distinction — the automatic validation says "does NOT appear in JS chunk report" while this manual step says "appears in dist/" — both are true and now explicitly linked to avoid confusion -->
- [ ] **`models.json` is in `dist/` as a plain file (not a JS chunk):** After `npm run build`, run `ls dist/models.json` to confirm Vite copied the file to the output root. Also confirm `dist/assets/*.js` files do NOT contain the string `"sakana/fugu-ultra"` (the first model in `models.json`) — a sanity check that the file was not accidentally inlined into the bundle. The pre-existing 500 KB chunk-size warning in build terminal output should remain at the same source as before this task; `models.json` adds zero KB to any JS chunk.
- [ ] **Step 1.2a finding documented:** Confirm Design Decision 5 in this Task document has been updated with the actual finding from inspecting `tabs.tsx` — whether `keepMounted` is forwarded, hardcoded, or absent.

---

## Related Code Explanations

- `project/srcs/frontend/src/components/ui/dialog.tsx` — the reference pattern for how this project's shadcn components wrap Base UI primitives. The `DialogContent` wrapper at lines 40-78 spreads `{...props}` onto `DialogPrimitive.Popup`, forwarding all props including non-standard ones. `TabsContent` is expected to follow the same pattern.
- `project/srcs/frontend/vite.config.ts` — Vite configuration. The `public/` directory is served at the root URL during dev (`server.proxy` only affects `/api`) and copied verbatim to `dist/` during build. No explicit configuration is needed for static file serving.
- `project/srcs/frontend/components.json` — shadcn CLI configuration at `"style": "base-mira"`. Must be the active `components.json` when the CLI runs, or the wrong component base will be generated.
- `documentation/ADRs/ADR-010-base-ui-over-radix-ui-for-frontend.md` — mandates `base-mira` style for all shadcn installs; any shadcn component not generated via the CLI with this style active violates the ADR.
- `documentation/ADRs/ADR-007-admin-curated-llm-model-list.md` — establishes that only admins may browse the OpenRouter catalog; `models.json` is admin-only static data, consistent with this decision.

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected for this task
- [x] Up-to-date documentation reviewed for shadcn (install command) and `@base-ui/react` (`Tabs.Panel.keepMounted` default)
- [x] `project/srcs/frontend/public/models.json` created (copy of `project/models.json`)
- [x] `models.json` structure verified: top-level `data` array, each entry has `id`, `name`, `pricing` fields
- [x] `project/srcs/frontend/src/components/ui/tabs.tsx` created via `npx shadcn@latest add tabs`
- [x] `tabs.tsx` confirmed to use `base-mira` style (imports from `@base-ui/react/tabs`, not `@radix-ui/react-tabs`)
- [x] Step 1.2a completed: `TabsContent` inspected, `keepMounted` forwarding status confirmed and documented in Design Decision 5
- [x] `npm run typecheck` passes with 0 errors after Steps 1.1 and 1.2
- [x] `npm run test` passes with 112/112 (no regressions)
- [x] `npm run build` succeeds and does NOT bundle `models.json`
- [x] Manual validation steps documented for the user
- [ ] Parent feature Steps 1.1 and 1.2 checkboxes marked `[x]` in [[Admin-LLM-Model-Catalog-Page]] — **deferred to the parent feature's update workflow (out of Task 1's edit scope)**
- [ ] Parent feature Task 1 section updated with wiki link `[[Admin-LLM-Model-Catalog-Page-task-1-static-catalog-setup]]` — **deferred to the parent feature's update workflow (out of Task 1's edit scope)**
