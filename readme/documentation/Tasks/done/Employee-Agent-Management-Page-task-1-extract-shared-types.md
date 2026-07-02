# Task: Extract Shared Pagination Types to `src/types/api.ts`

#task #current #low-complexity #parent-employee-agent-management-page

**Parent:** [[Features/to-do/Employee-Agent-Management-Page]]
**Parent Type:** Feature
**Related Step(s):** Phase 1, Steps 1.1 and 1.2
**Estimated Complexity:** Low

---

## Goal

Create `src/types/api.ts` as the canonical home for `PageableRequest` and `PageEnvelope<T>`, then migrate all consumers inside `features/employees/` to import from the new location — removing the locally-declared interfaces from `employees/types.ts` and leaving no re-export shim behind.

---

## Parent Context

The Employee Agent Management Page feature is the second paginated frontend feature. The first feature (Admin Employee Management Page) declared `PageableRequest` and `PageEnvelope<T>` locally inside `features/employees/types.ts` with an explicit comment marking them as temporary ("extract to `src/types/api.ts` on the SECOND paginated feature"). This task fulfils that planned extraction.

The parent feature document originally proposed keeping a re-export shim in `employees/types.ts` so internal consumers would not need path changes. **The design review bug `[[Bugs/to-do/Review-Employee-Agent-Management-Page]]` Finding 4 recommends Option (b) instead:** update all internal consumers to import from `@/types/api` directly and remove the shim entirely, making the canonical location unambiguous. This task adopts Option (b).

Findings 1, 2, and 3 of the design review concern later tasks (sidebar icon → Task 6, `useEditAgent` coalescing → Task 4, `useAgentList` single-fetch-function pattern → Task 3) and are out of scope here.

**Precondition for subsequent tasks:** every agent feature file that imports `PageableRequest` or `PageEnvelope` must use `@/types/api`. This task is the foundation all agent tasks build on.

---

## Preconditions / Dependencies

- Frontend project is at `project/srcs/frontend/`. All commands run from that directory.
- Test baseline is **132/132** across 23 files (established in progress entry 2026-06-29).
- `src/types/auth.ts` already exists — the `src/types/` directory is in place.
- No `src/types/api.ts` exists yet (verified by directory listing).
- TypeScript version is **5.9.3** — `export type { ... }` syntax (TS 3.8+) is fully supported.
- `@/` path alias resolves to `src/` in both `tsconfig.app.json` and `vitest.config.ts`.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — Selected — task template, doc placement
- `solid-deep-design` — Selected — guides Decision 1 (no re-export shim = no accidental coupling)
- `memory-bank` — Selected — confirmed test baseline and path alias setup
- `tdd` — Selected — no new test code in this task (pure type extraction); confirms all existing tests must still pass
- `find-docs` — Not needed — no library API calls; this is pure TypeScript interface extraction
- `glossary-management` — Not needed — no new domain terms introduced

### Documentation Reviewed

- `documentation/Docs/API-Reference/_Shared-Schemas.md` — confirms the `PageableRequest` fields (`page`, `size`, `sort`, `filters`), the `Pagination Envelope` shape, and which fields the frontend intentionally omits (`numberOfElements`, `pageable`, `sort`)
- `documentation/Features/to-do/Employee-Agent-Management-Page.md` — sections 1 and 2 define the exact interface bodies to use
- `documentation/Bugs/to-do/Review-Employee-Agent-Management-Page.md` — Finding 4 (direct-consumer migration vs. re-export shim) is incorporated into this task

### Related Existing Code

- `src/features/employees/types.ts` — source of the two declarations to remove (lines 31–58)
- `src/features/employees/services/employeeService.ts` — imports `PageableRequest` and `PageEnvelope` from `../types`
- `src/features/employees/services/employeeService.test.ts` — imports `PageableRequest` from `../types`
- `src/features/employees/hooks/useEmployeeList.ts` — imports `PageableRequest` from `../types`
- `src/features/employees/hooks/useEmployeeList.test.ts` — imports `PageEnvelope` from `../types`
- `src/features/employees/index.ts` — re-exports `PageEnvelope` from `./types`; no external consumers import it from here (verified by grep)
- `src/types/auth.ts` — style reference for the `src/types/` directory (no JSDoc, concise comments only)

---

## Implementation Details

### Approach

This is a pure import-path migration — no runtime behavior changes, no test changes, no new logic. The sequence is:

1. Create the canonical file first so TypeScript can resolve it immediately.
2. Migrate `employees/types.ts` (source of the declarations) — remove the two interfaces and their comments.
3. Migrate each consumer in dependency order (service → service test → hook → hook test → index barrel).
4. Run `npm run typecheck` after the `types.ts` change (Step 1.2a) and after all consumers are updated (Step 1.2f) to catch any import regressions.
5. Run the full test suite once at the end to confirm 132/132 still pass.

The "intentional partial view" comment (which explains WHY `numberOfElements`, `pageable`, and `sort` are omitted) must move from `employees/types.ts` to `src/types/api.ts`. This comment is load-bearing documentation — it prevents future developers from adding the backend fields "to complete the type."

### Files to Create / Modify

- [x] `src/types/api.ts` — **Create** — canonical shared pagination types
- [x] `src/features/employees/types.ts` — **Modify** — remove `PageableRequest` and `PageEnvelope<T>` declarations
- [x] `src/features/employees/services/employeeService.ts` — **Modify** — update `PageableRequest` and `PageEnvelope` imports to `@/types/api`
- [x] `src/features/employees/services/employeeService.test.ts` — **Modify** — update `PageableRequest` import to `@/types/api`
- [x] `src/features/employees/hooks/useEmployeeList.ts` — **Modify** — update `PageableRequest` import to `@/types/api`
- [x] `src/features/employees/hooks/useEmployeeList.test.ts` — **Modify** — update `PageEnvelope` import to `@/types/api`
- [x] `src/features/employees/index.ts` — **Modify** — remove `PageEnvelope` from the re-export (no external consumers; canonical location is now `@/types/api`)

---

## Step-by-Step Implementation

### Step 1.1: Create `src/types/api.ts`

**Goal:** Establish the canonical file with `PageableRequest` and `PageEnvelope<T>`, including the intentional-partial-view comment that guards against accidental field additions.
**Dependencies:** None — `src/types/` directory already exists.

- [x] Create `src/types/api.ts` with the content below
- [x] Run `npm run typecheck` — confirm 0 errors

**Why this step is critical:**
Consumers can only update their import paths once the canonical file exists. Creating it first eliminates a transient typecheck failure window.

#### Implementation

```typescript
// src/types/api.ts

// Mirrors the backend SHARED schema — see documentation/Docs/API-Reference/_Shared-Schemas.md
// (PageableRequest / SortRequest / FilterRequest / FilterOperationRequest).
// This is the universal body for every POST /{resource}/list endpoint.
export interface PageableRequest {
  page: number
  size: number
  sort: { field: string; direction: "ASC" | "DESC" }[]
  filters: {
    field: string
    operations: { operator: string; value: unknown }[]
  }[]
}

// INTENTIONAL PARTIAL VIEW of the backend pagination envelope: omits numberOfElements,
// pageable, and sort — features declare which fields they actually read.
export interface PageEnvelope<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
  first: boolean
  last: boolean
  empty: boolean
}
```

#### Edge Cases

1. **`value: unknown` in filters** — `unknown` is the correct type for the filter operation value (the backend accepts any JSON-serializable value). Do not widen to `any` or narrow to `string | number | boolean`.
2. **`sort` field name collision** — `PageEnvelope<T>` deliberately omits the backend's top-level `sort` field. The field `sort: { ... }` exists at the top level of the full backend envelope but is excluded from this type to prevent coupling.

---

### Step 1.2a: Remove declarations from `employees/types.ts`

**Goal:** Remove the `PageableRequest` and `PageEnvelope<T>` interface bodies (and their comments) from the employees types file. Do NOT add a re-export shim.
**Dependencies:** `src/types/api.ts` must exist (Step 1.1 complete).

- [x] Open `src/features/employees/types.ts`
- [x] Delete lines 31–58: the three-line comment block starting at `// Mirrors the backend SHARED schema…`, through `export interface PageableRequest { … }`, through `export interface PageEnvelope<T> { … }`, through the trailing blank line that follows `PageEnvelope`'s closing `}` <!-- REVIEW-FIX: corrected line range from "29-55" to "31-58" (31 = first comment line, 58 = trailing blank after PageEnvelope) -->
- [x] Save — the file now contains only `EmployeeListDTO`, `FilterField`, `FilterFieldMeta`, `FILTER_FIELDS`, `EmployeeDTO`, `EmployeeUpdateForm`, `EmployeeCreateForm`, `EmployeeMiniDTO`
- [x] Run `npm run typecheck` — expect errors on all consumer files (they still import the now-deleted types from `../types`); this is expected before Step 1.2b–f

**Why this step is critical:**
Removing the source declarations forces TypeScript to surface every consumer that needs updating. Running typecheck here confirms the exact files and lines to change.

#### Implementation

After this step `src/features/employees/types.ts` begins at line 1 with `export interface EmployeeListDTO {`. The removed block was:

```typescript
// Lines removed from employees/types.ts:
// Mirrors the backend SHARED schema — see documentation/Docs/API-Reference/_Shared-Schemas.md ...
export interface PageableRequest {
  page: number
  size: number
  sort: { field: string; direction: "ASC" | "DESC" }[]
  filters: {
    field: string
    operations: { operator: string; value: unknown }[]
  }[]
}

// INTENTIONAL PARTIAL VIEW of the backend pagination envelope ...
export interface PageEnvelope<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
  first: boolean
  last: boolean
  empty: boolean
}
```

#### Edge Cases

1. **Blank lines: remove lines 31–58 completely** — this range includes the blank separator between the two declarations (line 43) AND the trailing blank line after `PageEnvelope`'s closing `}` (line 58). After the deletion, a single blank line (the existing line 30) separates `FILTER_FIELDS` from the `// Response shape for PUT...` comment of `EmployeeDTO`. If line 58 is not removed, two consecutive blank lines appear at that boundary. <!-- REVIEW-FIX: updated edge case to cover trailing blank (line 58), not just the inter-declaration blank (line 43) -->

---

### Step 1.2b: Update `employeeService.ts`

**Goal:** Move the `PageableRequest` and `PageEnvelope` imports from `"../types"` to `"@/types/api"`.
**Dependencies:** Step 1.2a complete.

- [x] Open `src/features/employees/services/employeeService.ts`
- [x] Replace the single combined import block with two separate import blocks

#### Implementation

**Before (current):**
```typescript
import api from "@/lib/api"
import type {
  PageableRequest,
  PageEnvelope,
  EmployeeListDTO,
  EmployeeDTO,
  EmployeeUpdateForm,
  EmployeeCreateForm,
  EmployeeMiniDTO,
} from "../types"
```

**After:**
```typescript
import api from "@/lib/api"
import type { PageableRequest, PageEnvelope } from "@/types/api"
import type {
  EmployeeListDTO,
  EmployeeDTO,
  EmployeeUpdateForm,
  EmployeeCreateForm,
  EmployeeMiniDTO,
} from "../types"
```

#### Edge Cases

1. **Order of import blocks** — place `@/types/api` before `../types` to follow the project convention of ordering by path specificity (absolute aliases before relative paths).

---

### Step 1.2c: Update `employeeService.test.ts`

**Goal:** Move the `PageableRequest` import from `"../types"` to `"@/types/api"`.
**Dependencies:** Step 1.2a complete.

- [x] Open `src/features/employees/services/employeeService.test.ts`
- [x] Replace the combined `from "../types"` import block

#### Implementation

**Before (current):**
```typescript
import type {
  PageableRequest,
  EmployeeUpdateForm,
  EmployeeDTO,
  EmployeeCreateForm,
  EmployeeMiniDTO,
} from "../types"
```

**After:**
```typescript
import type { PageableRequest } from "@/types/api"
import type {
  EmployeeUpdateForm,
  EmployeeDTO,
  EmployeeCreateForm,
  EmployeeMiniDTO,
} from "../types"
```

---

### Step 1.2d: Update `useEmployeeList.ts`

**Goal:** Move the `PageableRequest` import from `"../types"` to `"@/types/api"`.
**Dependencies:** Step 1.2a complete.

- [x] Open `src/features/employees/hooks/useEmployeeList.ts`
- [x] Split the combined import so `PageableRequest` comes from `@/types/api`

#### Implementation

**Before (current):**
```typescript
import type { EmployeeListDTO, FilterField, PageableRequest } from "../types"
import { FILTER_FIELDS } from "../types"
```

**After:**
```typescript
import type { PageableRequest } from "@/types/api"
import type { EmployeeListDTO, FilterField } from "../types"
import { FILTER_FIELDS } from "../types"
```

#### Edge Cases

1. **`FILTER_FIELDS` import stays on `../types`** — it is a runtime constant (a `const` array), not a type. The two value imports (`FILTER_FIELDS`) and type imports (`EmployeeListDTO`, `FilterField`) can share the `../types` module; only `PageableRequest` moves.
2. **`PageableRequest["filters"]` indexed access type** — `useEmployeeList.ts` uses `const filters: PageableRequest["filters"] = []` (an indexed access on the interface). After migrating `PageableRequest` to `@/types/api`, this typed expression continues to work without any other change — TypeScript resolves indexed access types the same way regardless of where the base type is imported from. <!-- REVIEW-FIX: added edge case documenting that the indexed access type remains valid after migration -->

---

### Step 1.2e: Update `useEmployeeList.test.ts`

**Goal:** Move the `PageEnvelope` import from `"../types"` to `"@/types/api"`.
**Dependencies:** Step 1.2a complete.

- [x] Open `src/features/employees/hooks/useEmployeeList.test.ts`
- [x] Split the combined type import

#### Implementation

**Before (current):**
```typescript
import type { PageEnvelope, EmployeeListDTO } from "../types"
```

**After:**
```typescript
import type { PageEnvelope } from "@/types/api"
import type { EmployeeListDTO } from "../types"
```

---

### Step 1.2f: Update `employees/index.ts` barrel

**Goal:** Remove `PageEnvelope` from the employees feature's public re-export. No external consumers import it from here; the canonical location is now `@/types/api`.
**Dependencies:** Steps 1.2b–e complete.

- [x] Open `src/features/employees/index.ts`
- [x] Remove `PageEnvelope` from the `export type` line

#### Implementation

**Before (current):**
```typescript
// src/features/employees/index.ts

export { useEmployeeList } from "./hooks/useEmployeeList"
export type { EmployeeListDTO, FilterField, PageEnvelope } from "./types"
```

**After:**
```typescript
// src/features/employees/index.ts

export { useEmployeeList } from "./hooks/useEmployeeList"
export type { EmployeeListDTO, FilterField } from "./types"
```

#### Edge Cases

1. **`PageEnvelope` is currently imported by `EmployeesPage.tsx`** — verify by grep that no file outside `features/employees/` imports `PageEnvelope` from the employees barrel. Confirmed by prior search: only `EmployeesPage.tsx` imports from the barrel, and it imports only `useEmployeeList` (a named export, not `PageEnvelope`). The removal is safe.

---

### Step 1.2g: Final typecheck + test run

**Goal:** Confirm zero TypeScript errors and zero regressions across all 132 existing tests.
**Dependencies:** All previous steps complete.

- [x] Run `npm run typecheck` — expect 0 errors
- [x] Run `npm run test` — expect 132/132 pass, 0 failures, 0 regressions

**Why this step is critical:**
This is the gate before any subsequent agent task begins. All agent feature files will import from `@/types/api`. If the extraction is broken here, every downstream agent hook and service will fail.

---

## Design Decisions

**Decision 1: No re-export shim in `employees/types.ts`**
- **Why:** The parent feature document proposed `export type { PageableRequest, PageEnvelope } from "@/types/api"` in `employees/types.ts` so existing consumers would not need path changes. The design review (Finding 4, Option b) recommends against this: a shim left indefinitely becomes a permanent fixture, obscures the canonical location, and may confuse TypeScript "find all references." The consumers are bounded (4 production files, 2 test files), the change is import-path-only (no logic changes), and TypeScript verifies every path immediately. The cost of updating 6 import statements is lower than the long-term cost of maintaining an opaque indirection.
- **Alternatives considered:** (a) keep the shim with a `// Migration shim` comment — rejected; the comment would need active maintenance and would still mislead "find all references" queries.

**Decision 2: Remove `PageEnvelope` from `employees/index.ts`**
- **Why:** The employees feature barrel currently re-exports `PageEnvelope`. After the migration, `PageEnvelope` lives in `@/types/api`. No code outside `features/employees/` imports it from the barrel (confirmed by grep: the only external consumer of the barrel is `EmployeesPage.tsx`, which imports only `useEmployeeList`). Keeping the re-export would mean the barrel exposes a type that belongs to a different module, which contradicts the feature-slice ownership model. Removing it makes ownership unambiguous.
- **Alternatives considered:** Keep the barrel re-export as a convenience alias — rejected; no consumer needs it, and it would perpetuate the impression that `PageEnvelope` is employees-specific.

**Decision 3: `unknown` for filter operation value**
- **Why:** `filters[].operations[].value` accepts any JSON-serializable value (string, number, boolean, array for `IN`). Using `unknown` is correct — it is the safest widest type for values that are serialized to JSON and never read back. `any` would suppress legitimate type errors in call sites.
- **Alternatives considered:** `string | number | boolean | unknown[]` — too narrow for future operators; `any` — unsafe.

**Decision 4: Preserve "intentional partial view" comment in `src/types/api.ts`**
- **Why:** The comment guards the type from being "completed" to match the full backend envelope. Without it, a developer unfamiliar with the intentional omission might add `numberOfElements`, `pageable`, and `sort` to fix a TypeScript error when those fields appear in a backend response. The comment must travel with the type declaration, not stay in the old file.
- **Alternatives considered:** Add inline JSDoc — rejected; the project style uses concise block comments, not JSDoc.

---

## Testing Considerations

### Automatic Validation

- [x] Run `npm run typecheck` immediately after Step 1.1 — confirm 0 errors (new file, no consumers yet)
- [x] Run `npm run typecheck` after Step 1.2a — confirm expected errors in the 5 consumer files: `employeeService.ts`, `employeeService.test.ts`, `useEmployeeList.ts`, `useEmployeeList.test.ts`, `index.ts`; this confirms which files still need migration <!-- REVIEW-FIX: corrected "6 consumer files" to "5" with explicit file list -->
- [x] Run `npm run typecheck` after Step 1.2f (all consumers migrated) — confirm 0 errors
- [x] Run `npm run test` after Step 1.2g — confirm **132/132 pass**, 0 failures, 0 regressions
- [x] Run `npm run build` after all steps — confirm Vite build succeeds (bundle size delta expected: ≤ 0.1 kB from renamed comment string)

No new tests are written in this task. The existing 132 tests are the regression safety net. All test files import the pagination types only as type annotations (no runtime use), so changing import paths does not alter any test assertion.

---

## Related Code Explanations

- `src/types/auth.ts` — sister file in the `src/types/` directory; establishes the file format convention (no JSDoc, concise comments)
- `src/features/employees/types.ts` — source of the removed declarations; after this task it contains only employee-specific types
- `src/features/employees/index.ts` — employees feature public surface; `PageEnvelope` is removed because it is no longer employee-specific
- `documentation/Docs/API-Reference/_Shared-Schemas.md` — authoritative reference for the backend `PageableRequest` and pagination envelope shape

---

## Completion Criteria

- [x] `src/types/api.ts` created with `PageableRequest` and `PageEnvelope<T>` exactly as specified, including the intentional-partial-view comment
- [x] `PageableRequest` and `PageEnvelope<T>` declarations and their comments removed from `src/features/employees/types.ts`; no re-export shim added
- [x] `src/features/employees/services/employeeService.ts` imports `PageableRequest` and `PageEnvelope` from `@/types/api`
- [x] `src/features/employees/services/employeeService.test.ts` imports `PageableRequest` from `@/types/api`
- [x] `src/features/employees/hooks/useEmployeeList.ts` imports `PageableRequest` from `@/types/api`
- [x] `src/features/employees/hooks/useEmployeeList.test.ts` imports `PageEnvelope` from `@/types/api`
- [x] `PageEnvelope` removed from `src/features/employees/index.ts` re-export
- [x] `npm run typecheck` passes with 0 errors
- [x] `npm run test` passes with 132/132 (0 regressions)
- [x] `npm run build` succeeds
- [x] Parent feature Step 1.1 and Step 1.2 marked complete with a wiki link to this task document
- [x] Finding 4 in `[[Bugs/to-do/Review-Employee-Agent-Management-Page]]` marked as resolved (Decision: Option b applied in this task)
