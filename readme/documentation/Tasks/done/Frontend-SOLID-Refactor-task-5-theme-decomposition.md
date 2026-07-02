# Task: Theme Infrastructure Decomposition

#task #current #high-complexity #parent-frontend-solid-refactor

**Parent:** [[Features/to-do/Frontend-SOLID-Refactor]]
**Parent Type:** Feature
**Related Step(s):** Phase 5 — Steps 5.1a, 5.1b, 5.2, 5.3
**Estimated Complexity:** High

---

## Goal

Extract the three embedded side-effect concerns from the monolithic `ThemeProvider` into focused single-responsibility hooks, then slim the provider down to a pure coordinator and relocate it to `src/context/theme/` — giving each piece of the theme system exactly one reason to change.

---

## Parent Context

The parent feature ([[Features/to-do/Frontend-SOLID-Refactor]]) identifies `src/components/theme-provider.tsx` as an SRP violation: a single 231-line component owns context provisioning, OS color-scheme detection, cross-tab storage synchronization, and a keyboard shortcut — four unrelated reasons to change. The resolution is to decompose it into three dedicated hooks and a thin coordinator:

- **`useSystemThemeSync(theme, applyTheme)`** — owns only the `window.matchMedia` listener that re-applies the theme when the OS preference changes.
- **`useThemeStorageSync(storageKey, defaultTheme, setThemeState)`** — owns only the `window.addEventListener("storage", ...)` listener that syncs the theme when another browser tab changes it. The parent doc explicitly notes this is NOT a shallow pass-through: it has real depth (storageArea guard, key guard, `isTheme` validation, defaultTheme fallback).
- **`useThemeKeyboardToggle(storageKey, setThemeState)`** — owns only the `window.addEventListener("keydown", ...)` handler for the `D` key toggle.
- **`ThemeProvider`** (thinned) — retains `useState`, `setTheme`, `applyTheme`, the apply-on-change `useEffect`, the context, and calls the three hooks.
- **`useTheme`** — extracted to `src/context/theme/useTheme.ts`, the consumer hook that components call.

The two theme-sync hooks (`useSystemThemeSync` and `useThemeStorageSync`) are split because their interfaces are non-overlapping and they mutate different state: `useSystemThemeSync` calls `applyTheme` (DOM-only mutation — CSS class on `<html>`); `useThemeStorageSync` calls `setThemeState` (React state mutation). Combining them through a single 5-parameter hook would be an ISP smell.

The parent's phase ordering note confirms Phase 5 is independent of the auth sequence (Phases 1–4) and of Phase 6 (layout restructure). Phase 5 can be executed at any time after Task 4 is complete.

The parent's test strategy mandates unit tests for all three extracted hooks using `renderHook` from `@testing-library/react`.

---

## Preconditions / Dependencies

- **Tasks 1–4 complete**: codebase is at 22/22 tests passing (4 suites: `api`, `authSession`, `authService`, `useLoginForm`).
- **Vitest + jsdom infrastructure**: installed in Task 2 (`vitest 4.1.9`, `jsdom 29.1.1`, `vitest.config.ts`).
- **`@testing-library/react`**: installed in Task 4 (`@testing-library/react 16.3.2`). Provides `renderHook`, `act`, and `fireEvent`.
- **No new npm packages needed**: all test dependencies are already present.
- **`src/components/theme-provider.tsx`**: the file being decomposed — read the full 231-line current implementation before writing any code.
- **`src/main.tsx`**: the only file that imports `ThemeProvider` — must be updated in Step 5.3.
- **No current `useTheme` callers**: `grep -r "useTheme" src/` returns only the definition in `theme-provider.tsx`. No import-path updates are needed beyond `main.tsx`.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — Selected — task document structure and placement.
- `solid-deep-design` — Selected — SRP decomposition; module depth evaluation; seam discipline (only `ThemeProvider` uses all three hooks, so extracting them is the correct granularity).
- `tdd` — Selected — TDD (RED → GREEN) for each of the three new hooks. No TDD cycle for Step 5.3 (structural move verified by typecheck and build).
- `find-docs` — Selected — queried `@testing-library/react` docs for `renderHook`, `fireEvent.keyDown`, `StorageEvent` dispatch patterns; queried `vitest` docs for `vi.stubGlobal` (correct approach for mocking `window.matchMedia` in jsdom 29.x).
- `react-best-practices` — Not needed — this task is focused on hook extraction, not React component design patterns.
- `react-code-organization` — Consulted — target directory structure aligns with the skill's placement rules: extracted hooks go to `src/hooks/`, the context provider goes to `src/context/theme/`.

### Documentation Reviewed

- **Context7 / `@testing-library/react` 16.3.2**: `renderHook(hook, { wrapper? })` returns `{ result, rerender, unmount }`. `fireEvent.keyDown(element, { key, repeat?, ctrlKey?, metaKey?, altKey? })` dispatches a `KeyboardEvent` that bubbles — firing on a target node means `event.target` is set to that node, which is how `isEditableTarget` discrimination works. `fireEvent` is from `@testing-library/react` (already imported by all test files in the project).
- **Context7 / Vitest 4.1.9**: `vi.stubGlobal('matchMedia', mockFn)` places the mock on `globalThis` — this is the correct way to mock `window.matchMedia` in jsdom, which does not ship a native `matchMedia` implementation. Per Vitest docs: stubs do NOT auto-reset between tests unless `unstubGlobals: true` is set in `vitest.config.ts` — therefore every test file that stubs globals must call `vi.unstubAllGlobals()` in `afterEach`.
- **jsdom 29.1.1**: `new StorageEvent("storage", { storageArea, key, newValue })` constructor works correctly; `storageArea` accepts both `localStorage` and `sessionStorage` objects. The `storage` event does NOT fire in the current tab when the tab itself writes to localStorage (only in OTHER tabs) — this is correct behavior and means there is no feedback loop between `useThemeKeyboardToggle`'s localStorage write and `useThemeStorageSync`'s listener.
- **React 19.2.4 `Dispatch<SetStateAction<T>>`**: imported from `"react"` as `import type { Dispatch, SetStateAction } from "react"`. The `setThemeState` setter from `useState` has this exact type. The functional-updater form `setThemeState((prev) => next)` is supported and correct — the hook must use this form because it needs to read the current theme to compute the next one without creating a closure dependency.

### Related Existing Code

- [[theme-provider.tsx]] — `src/components/theme-provider.tsx:1-231` — source file being decomposed; read in full before implementing.
- [[use-mobile.ts]] — `src/hooks/use-mobile.ts` — existing hook in `src/hooks/`; its pattern (`import * as React from "react"`, `React.useEffect`, `React.useState`) is the convention for new hooks in this directory.
- [[main.tsx]] — `src/main.tsx` — currently imports `ThemeProvider` from `@/components/theme-provider.tsx`; updated in Step 5.3.
- [[vitest.config.ts]] — `vitest.config.ts` — jsdom environment + `@/` alias; no changes needed for this task.
- [[useLoginForm.test.ts]] — `src/features/authentication/hooks/useLoginForm.test.ts` — reference for the `vi.hoisted` + `vi.mock` factory pattern and `renderHook` usage already established in this codebase.

---

## Implementation Details

### Approach

Each extracted hook is a **deep module**: a small interface (2–3 parameters, `void` return) behind a substantial implementation (guards, event listener registration, cleanup). The `ThemeProvider` becomes a coordinator that owns only stable, shared state (`theme`, `setTheme`, `applyTheme`) and delegates all three event-driven side effects to the extracted hooks.

**Type strategy**: `Theme = "dark" | "light" | "system"` is defined **locally** in each file that needs it. This avoids circular imports between `src/hooks/` and `src/context/theme/`. The type is a 3-string union — the duplication cost is one line per file. `isTheme` and `THEME_VALUES` follow the same rule: defined locally in `ThemeProvider.tsx` and in `useThemeStorageSync.ts` (the only two files that need them), never imported across the hooks/context boundary.

**Deletion test applied to each module**:
- Delete `useSystemThemeSync` → OS preference change re-apply logic scatters back into ThemeProvider and entangles with the "apply on mount" effect. The hook earns its place.
- Delete `useThemeStorageSync` → storageArea guard + isTheme validation + defaultTheme fallback scatter back into ThemeProvider. ~24 lines of real guard logic. The hook earns its place.
- Delete `useThemeKeyboardToggle` → `handleKeyDown` complexity (modifier key guards + editable target detection + functional updater + localStorage write) scatters back into ThemeProvider. The hook earns its place.

**ThemeProvider retains its own apply-on-change effect**: `useEffect(() => { applyTheme(theme) }, [theme, applyTheme])` stays in the provider. `useSystemThemeSync` only owns the media query listener — it does NOT call `applyTheme` on mount, because that is a separate responsibility (apply on state change). These are deliberately two different effects with different reasons to run.

**`useThemeKeyboardToggle` retains `localStorage.setItem` inside the functional updater**: the keyboard toggle must both persist the choice and update React state atomically (from the user's perspective). The functional updater form `setThemeState((prev) => { ...; localStorage.setItem(key, next); return next })` is the correct pattern — it reads current state without a stale closure. No feedback loop with `useThemeStorageSync` because jsdom's `storage` event only fires in other tabs.

### Files to Create/Modify

- [x] `src/hooks/useSystemThemeSync.ts` — new hook: OS color-scheme media query effect only
- [x] `src/hooks/useSystemThemeSync.test.ts` — 3 unit tests (TDD RED then GREEN)
- [x] `src/hooks/useThemeStorageSync.ts` — new hook: cross-tab storage event effect only
- [x] `src/hooks/useThemeStorageSync.test.ts` — 4 unit tests (TDD RED then GREEN)
- [x] `src/hooks/useThemeKeyboardToggle.ts` — new hook: D-key toggle effect only
- [x] `src/hooks/useThemeKeyboardToggle.test.ts` — 7 unit tests (TDD RED then GREEN)
- [x] `src/context/theme/ThemeProvider.tsx` — thin coordinator (moved + refactored from `src/components/theme-provider.tsx`)
- [x] `src/context/theme/useTheme.ts` — consumer hook extracted from old ThemeProvider
- [x] `src/main.tsx` — update import path for ThemeProvider
- [x] `src/components/theme-provider.tsx` — **delete** (replaced by the two files above)

---

## Step-by-Step Implementation

---

### Step 5.1a: Create `useSystemThemeSync` (TDD)

**Goal:** Extract the OS color-scheme media query listener from ThemeProvider into a focused hook that has one reason to change: when the interface for OS color-scheme listening changes.
**Dependencies:** No prior step in this task. Read `src/components/theme-provider.tsx` in full first to understand which lines to extract.

**Why this step is critical:** The combined `useEffect` in the current ThemeProvider (lines ~118–140) mixes "apply theme on mount" with "listen for OS changes". Separating them enables independent testing and makes the provider's apply-on-change responsibility legible at a glance.

#### TDD — RED State

Write the test file FIRST. Confirm it fails with "Cannot find module './useSystemThemeSync'" before creating the implementation.

```tsx
// src/hooks/useSystemThemeSync.test.ts
import { afterEach, describe, expect, it, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import { useSystemThemeSync } from "./useSystemThemeSync"

describe("useSystemThemeSync", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("when theme is system and media query fires, calls applyTheme with system", () => {
    let capturedHandler: (() => void) | null = null
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn((_event: string, handler: () => void) => {
          capturedHandler = handler
        }),
        removeEventListener: vi.fn(),
      })
    )

    const applyTheme = vi.fn()
    renderHook(() => useSystemThemeSync("system", applyTheme))

    expect(capturedHandler).not.toBeNull()
    capturedHandler!()

    expect(applyTheme).toHaveBeenCalledWith("system")
  })

  it("when theme is not system, does not add media query listener", () => {
    const addEventListener = vi.fn()
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener,
        removeEventListener: vi.fn(),
      })
    )

    const applyTheme = vi.fn()
    renderHook(() => useSystemThemeSync("dark", applyTheme))

    expect(addEventListener).not.toHaveBeenCalled()
    expect(applyTheme).not.toHaveBeenCalled()
  })

  it("on unmount, removes the media query listener with the same handler", () => {
    let capturedHandler: (() => void) | null = null
    const removeEventListener = vi.fn()
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn((_event: string, handler: () => void) => {
          capturedHandler = handler
        }),
        removeEventListener,
      })
    )

    const applyTheme = vi.fn()
    const { unmount } = renderHook(() => useSystemThemeSync("system", applyTheme))

    unmount()

    expect(removeEventListener).toHaveBeenCalledWith("change", capturedHandler)
  })
})
```

Run `npm run test` — expect: **1 failing suite** ("Cannot find module './useSystemThemeSync'"), 22 passing. That is the RED state.

#### TDD — GREEN State

Create the implementation:

```tsx
// src/hooks/useSystemThemeSync.ts
import * as React from "react"

type Theme = "dark" | "light" | "system"

const COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)"

export function useSystemThemeSync(
  theme: Theme,
  applyTheme: (t: Theme) => void
): void {
  React.useEffect(() => {
    if (theme !== "system") {
      return
    }

    const mediaQuery = window.matchMedia(COLOR_SCHEME_QUERY)
    const handleChange = () => {
      applyTheme("system")
    }

    mediaQuery.addEventListener("change", handleChange)

    return () => {
      mediaQuery.removeEventListener("change", handleChange)
    }
  }, [theme, applyTheme])
}
```

Run `npm run test` — expect: **25 tests, 5 suites, 0 failures** (22 prior + 3 new).

#### Edge Cases

1. **`theme` changes from `"system"` to `"dark"` mid-lifecycle**: React re-runs the effect (dependency changed). The cleanup from the previous render removes the old `mediaQuery.addEventListener` listener. The new render finds `theme !== "system"`, so no new listener is added. Handled by React's effect dependency system.
2. **`applyTheme` reference changes**: `applyTheme` is stabilized by `useCallback([disableTransitionOnChange])` in ThemeProvider, so it only changes when `disableTransitionOnChange` changes (never at runtime). Effect re-runs only on genuine changes.
3. **`window.matchMedia` is called on every effect run when `theme === "system"`**: Each call creates a fresh `MediaQueryList`. This is the same behavior as the original code and matches the platform API contract.

---

### Step 5.1b: Create `useThemeStorageSync` (TDD)

**Goal:** Extract the cross-tab storage event listener from ThemeProvider into a focused hook. This is the deeper of the two "sync" hooks — it owns real guard logic (storageArea check, key check, `isTheme` validation, defaultTheme fallback).
**Dependencies:** None. Independent of Step 5.1a.

**Why this step is critical:** The storage sync handler has four distinct guard conditions that would otherwise sit invisibly inside ThemeProvider. Isolating it enables testing each guard independently and makes the complete guard logic visible at the module level.

#### TDD — RED State

```tsx
// src/hooks/useThemeStorageSync.test.ts
import { describe, expect, it, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import { useThemeStorageSync } from "./useThemeStorageSync"

describe("useThemeStorageSync", () => {
  it("when storage event has correct key and valid theme, calls setThemeState with that theme", () => {
    const setThemeState = vi.fn()
    renderHook(() => useThemeStorageSync("theme", "system", setThemeState))

    window.dispatchEvent(
      new StorageEvent("storage", {
        storageArea: localStorage,
        key: "theme",
        newValue: "dark",
      })
    )

    expect(setThemeState).toHaveBeenCalledWith("dark")
  })

  it("when storage event has wrong key, is ignored", () => {
    const setThemeState = vi.fn()
    renderHook(() => useThemeStorageSync("theme", "system", setThemeState))

    window.dispatchEvent(
      new StorageEvent("storage", {
        storageArea: localStorage,
        key: "other-key",
        newValue: "dark",
      })
    )

    expect(setThemeState).not.toHaveBeenCalled()
  })

  it("when storage event has wrong storageArea, is ignored", () => {
    const setThemeState = vi.fn()
    renderHook(() => useThemeStorageSync("theme", "system", setThemeState))

    window.dispatchEvent(
      new StorageEvent("storage", {
        storageArea: sessionStorage,
        key: "theme",
        newValue: "dark",
      })
    )

    expect(setThemeState).not.toHaveBeenCalled()
  })

  it("when storage event has invalid newValue, calls setThemeState with defaultTheme", () => {
    const setThemeState = vi.fn()
    renderHook(() => useThemeStorageSync("theme", "system", setThemeState))

    window.dispatchEvent(
      new StorageEvent("storage", {
        storageArea: localStorage,
        key: "theme",
        newValue: "not-a-valid-theme",
      })
    )

    expect(setThemeState).toHaveBeenCalledWith("system")
  })
})
```

Run `npm run test` — expect: **1 failing suite** ("Cannot find module './useThemeStorageSync'"), 25 passing if Step 5.1a is already complete, or 22 passing if executing Step 5.1b first. RED confirmed.

#### TDD — GREEN State

```tsx
// src/hooks/useThemeStorageSync.ts
import * as React from "react"

type Theme = "dark" | "light" | "system"

const THEME_VALUES: Theme[] = ["dark", "light", "system"]

function isTheme(value: string | null): value is Theme {
  if (value === null) return false
  return THEME_VALUES.includes(value as Theme)
}

export function useThemeStorageSync(
  storageKey: string,
  defaultTheme: Theme,
  setThemeState: (t: Theme) => void
): void {
  React.useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.storageArea !== localStorage) {
        return
      }

      if (event.key !== storageKey) {
        return
      }

      if (isTheme(event.newValue)) {
        setThemeState(event.newValue)
        return
      }

      setThemeState(defaultTheme)
    }

    window.addEventListener("storage", handleStorageChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [defaultTheme, storageKey, setThemeState])
}
```

Run `npm run test` — expect: **29 tests, 6 suites, 0 failures** (22 + 3 + 4).

#### Edge Cases

1. **`storageArea` is `null`**: `event.storageArea !== localStorage` → `null !== localStorage` → true → event ignored. Handles `localStorage.clear()` which fires `storage` events with `storageArea: null`.
2. **`key` is `null`**: `event.key !== storageKey` → `null !== "theme"` → true → event ignored. Handles bulk-clear events.
3. **`newValue` is `null`**: `isTheme(null)` → first guard `if (value === null) return false` → falls through to `setThemeState(defaultTheme)`. Handles item-deletion events.
4. **`setThemeState` identity changes**: `setThemeState` is the raw React state setter (stable identity — React guarantees setter stability between renders), so the effect dependency is effectively stable. The dependency array still lists it for correctness.
5. **`defaultTheme` changes** (possible if ThemeProvider re-renders with new props): effect re-runs, re-registers the listener with the new fallback. Handled by React's cleanup + re-run.

---

### Step 5.2: Create `useThemeKeyboardToggle` (TDD)

**Goal:** Extract the D-key keyboard shortcut from ThemeProvider into a focused hook. The `handleKeyDown` complexity (modifier guard, target guard, repeat guard, functional updater with localStorage write) is now isolated behind a 2-parameter interface.
**Dependencies:** None. Independent of Steps 5.1a and 5.1b.

**Why this step is critical:** The parent doc notes the `handleKeyDown` has CRAP complexity of 56 — it is the single most complex function in the current ThemeProvider. Isolating it makes the function independently testable and gives it a single reason to change: when the keyboard shortcut behavior changes.

#### TDD — RED State

```tsx
// src/hooks/useThemeKeyboardToggle.test.ts
import { describe, expect, it, vi } from "vitest"
import { renderHook, fireEvent } from "@testing-library/react"
import { useThemeKeyboardToggle } from "./useThemeKeyboardToggle"

describe("useThemeKeyboardToggle", () => {
  it("pressing D calls setThemeState with updater that maps dark to light", () => {
    const setThemeState = vi.fn()
    renderHook(() => useThemeKeyboardToggle("theme", setThemeState))

    fireEvent.keyDown(window, { key: "d" })

    expect(setThemeState).toHaveBeenCalledOnce()
    const updater = setThemeState.mock.calls[0][0] as (t: string) => string
    expect(updater("dark")).toBe("light")
  })

  it("pressing D calls setThemeState with updater that maps light to dark", () => {
    const setThemeState = vi.fn()
    renderHook(() => useThemeKeyboardToggle("theme", setThemeState))

    fireEvent.keyDown(window, { key: "d" })

    expect(setThemeState).toHaveBeenCalledOnce()
    const updater = setThemeState.mock.calls[0][0] as (t: string) => string
    expect(updater("light")).toBe("dark")
  })

  it("pressing D with Ctrl is ignored", () => {
    const setThemeState = vi.fn()
    renderHook(() => useThemeKeyboardToggle("theme", setThemeState))

    fireEvent.keyDown(window, { key: "d", ctrlKey: true })

    expect(setThemeState).not.toHaveBeenCalled()
  })

  it("pressing D with Meta is ignored", () => {
    const setThemeState = vi.fn()
    renderHook(() => useThemeKeyboardToggle("theme", setThemeState))

    fireEvent.keyDown(window, { key: "d", metaKey: true })

    expect(setThemeState).not.toHaveBeenCalled()
  })

  it("pressing D with Alt is ignored", () => {
    const setThemeState = vi.fn()
    renderHook(() => useThemeKeyboardToggle("theme", setThemeState))

    fireEvent.keyDown(window, { key: "d", altKey: true })

    expect(setThemeState).not.toHaveBeenCalled()
  })

  it("repeated keydown event is ignored", () => {
    const setThemeState = vi.fn()
    renderHook(() => useThemeKeyboardToggle("theme", setThemeState))

    fireEvent.keyDown(window, { key: "d", repeat: true })

    expect(setThemeState).not.toHaveBeenCalled()
  })

  it("pressing D with an input element as the target is ignored", () => {
    const setThemeState = vi.fn()
    renderHook(() => useThemeKeyboardToggle("theme", setThemeState))

    const input = document.createElement("input")
    document.body.appendChild(input)
    fireEvent.keyDown(input, { key: "d" })
    document.body.removeChild(input)

    expect(setThemeState).not.toHaveBeenCalled()
  })
})
```

**Test design notes:**
- Tests 1 and 2: `setThemeState` receives a functional updater `(currentTheme) => nextTheme`. We capture it from `setThemeState.mock.calls[0][0]` and call it directly with known state. The updater also writes to `localStorage` — jsdom provides localStorage, so this works without mocking.
- Test 7: the `<input>` is appended to `document.body` so the event bubbles up to `window` with `event.target === input`. `isEditableTarget(input)` matches the `"input"` selector in `closest()` and returns `true`, so the handler exits early.
- `fireEvent.keyDown` dispatches a `KeyboardEvent` with `bubbles: true` by default, so events fired on child elements bubble up to `window`.

Run `npm run test` — expect: **1 failing suite** ("Cannot find module './useThemeKeyboardToggle'"). RED confirmed.

#### TDD — GREEN State

```tsx
// src/hooks/useThemeKeyboardToggle.ts
import * as React from "react"
import type { Dispatch, SetStateAction } from "react"

type Theme = "dark" | "light" | "system"

function getSystemTheme(): "dark" | "light" {
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark"
  }
  return "light"
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  if (target.isContentEditable) {
    return true
  }

  return !!target.closest("input, textarea, select, [contenteditable='true']")
}

export function useThemeKeyboardToggle(
  storageKey: string,
  setThemeState: Dispatch<SetStateAction<Theme>>
): void {
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (isEditableTarget(event.target)) {
        return
      }

      if (event.key.toLowerCase() !== "d") {
        return
      }

      setThemeState((currentTheme) => {
        const nextTheme =
          currentTheme === "dark"
            ? "light"
            : currentTheme === "light"
              ? "dark"
              : getSystemTheme() === "dark"
                ? "light"
                : "dark"

        localStorage.setItem(storageKey, nextTheme)
        return nextTheme
      })
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [storageKey, setThemeState])
}
```

Run `npm run test` — expect: **36 tests, 7 suites, 0 failures** (22 + 3 + 4 + 7).

#### Edge Cases

1. **`event.repeat === true`**: held keys fire repeated events; early return prevents rapid-fire toggle spam.
2. **Modifier keys** (`metaKey`, `ctrlKey`, `altKey`): allow OS/browser shortcuts (`Cmd+D` bookmarks, `Ctrl+D` debugger, etc.) to pass through without triggering the theme toggle.
3. **Editable targets**: `isEditableTarget` checks both `isContentEditable` and `closest("input, textarea, select, [contenteditable='true']")` to cover all editable ancestor scenarios (e.g., a `<span>` inside a `<textarea>`).
4. **`"system"` current theme toggle**: when the current theme is "system", the next theme depends on the current OS preference via `getSystemTheme()`. If the OS is dark, toggle to "light"; if light, toggle to "dark". This preserves the current behavior exactly.
5. **Uppercase `"D"`**: `event.key.toLowerCase() !== "d"` handles both `"d"` and `"D"` (shift+d) identically.
6. **`setThemeState` from `useState`**: React guarantees the state setter has stable identity between renders. The effect dependency array lists it for correctness but in practice the effect never re-runs due to setter identity change.

---

### Step 5.3: Slim ThemeProvider + Move to `src/context/theme/`

**Goal:** Reduce the old monolithic ThemeProvider to a pure coordinator, relocate it to `src/context/theme/ThemeProvider.tsx`, extract `useTheme` to `src/context/theme/useTheme.ts`, and update the one existing importer (`main.tsx`).
**Dependencies:** Steps 5.1a, 5.1b, and 5.2 must all be complete (all three hooks must exist before the provider can call them).

**Why this step is critical:** This is the structural move that closes the SRP violation. Without it, all three hooks are extracted but never used — the old ThemeProvider with its three embedded effects still ships to production.

**No TDD cycle for this step**: the behavior of the theme system is unchanged. The three hooks are already unit-tested. The correctness gate for this step is `npm run typecheck` (0 errors) + `npm run build` (0 errors) + the existing 36-test suite (0 failures).

#### Sub-steps

- [x] **5.3.1**: Create `src/context/theme/` directory (via the new files — no explicit `mkdir` needed).
- [x] **5.3.2**: Create `src/context/theme/ThemeProvider.tsx` (thin coordinator — see implementation below).
- [x] **5.3.3**: Create `src/context/theme/useTheme.ts` (extracted consumer hook — see below).
- [x] **5.3.4**: Update `src/main.tsx` — change import from `@/components/theme-provider.tsx` to `@/context/theme/ThemeProvider`.
- [x] **5.3.5**: Delete `src/components/theme-provider.tsx`.
- [x] **5.3.6**: Run `npm run typecheck` → confirm 0 errors.
- [x] **5.3.7**: Run `npm run build` → confirm build succeeds.
- [x] **5.3.8**: Run `npm run test` → confirm still 36/36 (no regression).

#### Implementation — `src/context/theme/ThemeProvider.tsx`

```tsx
/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { useSystemThemeSync } from "@/hooks/useSystemThemeSync"
import { useThemeStorageSync } from "@/hooks/useThemeStorageSync"
import { useThemeKeyboardToggle } from "@/hooks/useThemeKeyboardToggle"

export type Theme = "dark" | "light" | "system"
type ResolvedTheme = "dark" | "light"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
  disableTransitionOnChange?: boolean
}

export type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)"
const THEME_VALUES: Theme[] = ["dark", "light", "system"]

export const ThemeProviderContext = React.createContext<
  ThemeProviderState | undefined
>(undefined)

function isTheme(value: string | null): value is Theme {
  if (value === null) return false
  return THEME_VALUES.includes(value as Theme)
}

function getSystemTheme(): ResolvedTheme {
  if (window.matchMedia(COLOR_SCHEME_QUERY).matches) return "dark"
  return "light"
}

function disableTransitionsTemporarily() {
  const style = document.createElement("style")
  style.appendChild(
    document.createTextNode(
      "*,*::before,*::after{-webkit-transition:none!important;transition:none!important}"
    )
  )
  document.head.appendChild(style)

  return () => {
    window.getComputedStyle(document.body)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        style.remove()
      })
    })
  }
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "theme",
  disableTransitionOnChange = true,
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    const storedTheme = localStorage.getItem(storageKey)
    if (isTheme(storedTheme)) return storedTheme
    return defaultTheme
  })

  const setTheme = React.useCallback(
    (nextTheme: Theme) => {
      localStorage.setItem(storageKey, nextTheme)
      setThemeState(nextTheme)
    },
    [storageKey]
  )

  const applyTheme = React.useCallback(
    (nextTheme: Theme) => {
      const root = document.documentElement
      const resolvedTheme =
        nextTheme === "system" ? getSystemTheme() : nextTheme
      const restoreTransitions = disableTransitionOnChange
        ? disableTransitionsTemporarily()
        : null

      root.classList.remove("light", "dark")
      root.classList.add(resolvedTheme)

      if (restoreTransitions) {
        restoreTransitions()
      }
    },
    [disableTransitionOnChange]
  )

  React.useEffect(() => {
    applyTheme(theme)
  }, [theme, applyTheme])

  useSystemThemeSync(theme, applyTheme)
  useThemeStorageSync(storageKey, defaultTheme, setThemeState)
  useThemeKeyboardToggle(storageKey, setThemeState)

  const value = React.useMemo(
    () => ({ theme, setTheme }),
    [theme, setTheme]
  )

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}
```

**Key exports from this file**: `ThemeProvider` (default export pattern was never used; named export preserved), `ThemeProviderContext` (needed by `useTheme.ts`), `Theme` type, `ThemeProviderState` type.

#### Implementation — `src/context/theme/useTheme.ts`

```tsx
import * as React from "react"
import { ThemeProviderContext } from "./ThemeProvider"

export const useTheme = () => {
  const context = React.useContext(ThemeProviderContext)

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }

  return context
}
```

#### Implementation — Updated `src/main.tsx`

Change only the import line for `ThemeProvider`:

```tsx
// Before:
import { ThemeProvider } from "@/components/theme-provider.tsx"

// After:
import { ThemeProvider } from "@/context/theme/ThemeProvider"
```

All other lines in `main.tsx` remain unchanged.

#### Edge Cases for Step 5.3

1. **`...props` spread on `ThemeProviderContext.Provider`**: the `ThemeProviderProps` type includes `children`, `defaultTheme`, `storageKey`, `disableTransitionOnChange`. The `...props` rest collects only non-destructured props (none of the four listed ones are passed through). Preserve this spread — it was in the original and provides future extensibility without breaking the `ThemeProviderContext.Provider`.
2. **`ThemeProviderContext` must be exported**: `useTheme.ts` imports it. If it is not exported, TypeScript will surface a TS2305 error at `useTheme.ts`. Verify with `npm run typecheck`.
3. **Deletion of `src/components/theme-provider.tsx`**: after `main.tsx` is updated, TypeScript will report no callers. Delete the file to avoid it being a dead module in the bundle. Vitest will not try to import it since no test file imports from `@/components/theme-provider`.
4. **`useTheme` callable from outside `context/theme/`**: any future component that needs the theme calls `import { useTheme } from "@/context/theme/useTheme"`. Since no component currently imports `useTheme`, no further updates are needed now.
5. **`type Theme` export**: exporting `Theme` from `ThemeProvider.tsx` makes it available for future components that need to type-check a theme value. The three hooks define it locally — they do NOT import from here — avoiding the circular dependency.

---

## Design Decisions

**Decision 1: Local `Theme` type in each hook instead of shared import**
- **Why:** The three hooks (`useSystemThemeSync`, `useThemeStorageSync`, `useThemeKeyboardToggle`) live in `src/hooks/`. `ThemeProvider` is in `src/context/theme/`. If the hooks imported `Theme` from `ThemeProvider`, they would depend on a context module — inverting the correct dependency direction (`context` is higher-level than `hooks`). If `ThemeProvider` imported `Theme` from the hooks, the provider would depend on its own delegated side effects. Either creates a coupling smell.
- **Alternatives considered:** (1) `src/context/theme/types.ts` with just `type Theme = ...` — adds a new file for a single 3-string union; overhead not justified. (2) `src/types/theme.ts` — analogous to `src/types/auth.ts` from Task 1, but `Theme` is not a cross-feature type; it's purely a theme-system type. (3) Import `Theme` from hooks into ThemeProvider — inverts dependency direction. Local definition (one line per file) has zero maintenance burden.

**Decision 2: ThemeProvider keeps its own apply-on-change effect**
- **Why:** `useSystemThemeSync` owns ONLY the OS preference change listener. It does not call `applyTheme` on mount. The ThemeProvider's `useEffect(() => { applyTheme(theme) }, [theme, applyTheme])` is a separate responsibility: "when abstract theme state changes, apply the resolved CSS class." These two effects have different trigger conditions and different reasons to change. Collapsing them into `useSystemThemeSync` would make the hook's name misleading and give it two responsibilities.
- **Alternatives considered:** Having `useSystemThemeSync` call `applyTheme(theme)` on every render when theme changes — this would mean the hook applies the theme unconditionally AND watches for OS changes. ISP violation: two behaviors behind one seam. Rejected.

**Decision 3: `useThemeKeyboardToggle` retains `localStorage.setItem` inside the functional updater**
- **Why:** The functional updater form `setThemeState((prev) => { ...; localStorage.setItem(key, next); return next })` is required to atomically compute the next theme (from current state) and persist it. Passing `setTheme` (the compound setter) as an alternative parameter would not work because `setTheme` does not accept a functional updater — it only accepts a concrete `Theme` value. Using a ref to track current theme would require an additional parameter or a more complex hook interface.
- **Alternatives considered:** Accept `setTheme: (t: Theme) => void` and read current theme via a `themeRef` parameter — increases the interface from 2 to 3 parameters and adds ref-management complexity. Rejected in favor of the functional updater pattern already established in the original code.

**Decision 4: `isEditableTarget` and `getSystemTheme` defined locally in `useThemeKeyboardToggle.ts`**
- **Why:** These two utility functions are specific to the keyboard toggle logic. Moving them to a shared location would create a utility module for functions with a single consumer — a violation of the DRY principle's intent (avoid duplication that increases maintenance burden, not all duplication). `isEditableTarget` is only meaningful in the context of keyboard event handling; `getSystemTheme` uses the `COLOR_SCHEME_QUERY` constant that is also local to this file.
- **Alternatives considered:** Export `isEditableTarget` from `ThemeProvider.tsx` — ThemeProvider is a context coordinator, not a DOM utilities library. Rejected on SRP grounds.

**Decision 5: No TDD cycle for Step 5.3**
- **Why:** Step 5.3 is a structural relocation and wiring step. The behavioral contracts of the three hooks are already verified by their own test suites (Steps 5.1a, 5.1b, 5.2). ThemeProvider itself is a coordinator — its behavior is the composition of its hooks, which is not unit-testable in isolation without a full React tree. TypeScript (0 errors) + build (0 errors) + 36-test regression (0 failures) are the correct validation gates for a structural move with no new logic.
- **Alternatives considered:** Adding a component-level integration test for ThemeProvider — would require mounting a full React component tree, mocking localStorage, mocking matchMedia, and testing DOM class changes. This is E2E-level validation, not unit-level. The manual validation steps cover this instead.

**Decision 6: `ThemeProviderContext` exported from `ThemeProvider.tsx`**
- **Why:** `useTheme.ts` calls `React.useContext(ThemeProviderContext)`. For this to work, it must import the context object. Since the context object is created in `ThemeProvider.tsx`, it must be exported from there.
- **Alternatives considered:** Move context creation to `useTheme.ts` — `ThemeProvider.tsx` would then need to import the context from `useTheme.ts` to provide it. This would invert the provider-consumer relationship and make `ThemeProvider.tsx` depend on `useTheme.ts`. Rejected. Context is created by the provider; consumer hooks import from the provider.

---

## Testing Considerations

### Automatic Validation

**Step 5.1a (useSystemThemeSync):**
- [x] Run `npm run test -- useSystemThemeSync` (or `npm run test`) → 3 tests pass:
  - `when theme is system and media query fires, calls applyTheme with system`
  - `when theme is not system, does not add media query listener`
  - `on unmount, removes the media query listener with the same handler`
- [x] Run `npm run typecheck` → 0 errors after hook is created.

**Step 5.1b (useThemeStorageSync):**
- [x] Run `npm run test` → 4 new tests pass:
  - `when storage event has correct key and valid theme, calls setThemeState with that theme`
  - `when storage event has wrong key, is ignored`
  - `when storage event has wrong storageArea, is ignored`
  - `when storage event has invalid newValue, calls setThemeState with defaultTheme`
- [x] Run `npm run typecheck` → 0 errors after hook is created.

**Step 5.2 (useThemeKeyboardToggle):**
- [x] Run `npm run test` → 7 new tests pass:
  - `pressing D calls setThemeState with updater that maps dark to light`
  - `pressing D calls setThemeState with updater that maps light to dark`
  - `pressing D with Ctrl is ignored`
  - `pressing D with Meta is ignored`
  - `pressing D with Alt is ignored`
  - `repeated keydown event is ignored`
  - `pressing D with an input element as the target is ignored`
- [x] Run `npm run typecheck` → 0 errors after hook is created.

**Step 5.3 (ThemeProvider move + wiring):**
- [x] Run `npm run typecheck` → 0 errors (verifies all import paths updated, `ThemeProviderContext` exported, `Theme` type accessible).
- [x] Run `npm run build` → build succeeds (verifies no dead imports, no missing modules).
- [x] Run `npm run test` → **36/36 tests, 7 suites, 0 failures** (confirms no regression from the structural move).

### Manual Validation

> **Manual validation required.** This task includes 5 manual validation steps that must be performed by a human in the browser.

- [ ] Start the dev server (`npm run dev` from `project/srcs/frontend/`). Verify the app loads at `http://localhost:3000` with no console errors.
- [ ] Verify the dark/light theme toggle with the **D key**: navigate to any page, press `D` on the keyboard (not inside an input), confirm the page theme switches between dark and light. Press again to switch back.
- [ ] Verify the D key is **ignored inside input fields**: click into the username field on `/login`, press `D` — confirm the theme does NOT toggle and the character "d" is typed in the input.
- [ ] Verify **modifier keys** are ignored: press `Ctrl+D` (bookmarks shortcut) — confirm the theme does NOT toggle and browser default action fires.
- [ ] Verify **OS theme sync**: in browser devtools → Rendering → Emulate CSS media feature "prefers-color-scheme" → switch between "dark" and "light". When the stored theme is "system", confirm the app theme changes in real time.

---

## Related Code Explanations

- `src/components/theme-provider.tsx` — source of the three extracted behaviors (deleted after Step 5.3)
- `src/hooks/use-mobile.ts:1-25` — reference pattern for hooks in `src/hooks/`: import convention, `React.useEffect` cleanup style
- `src/features/authentication/hooks/useLoginForm.test.ts` — reference for `renderHook` usage in this codebase; establishes that `vi.fn()` mocks + `renderHook` is the established test pattern
- `src/lib/api.test.ts` — reference for `vi.stubGlobal` usage with jsdom 29.x (used in the fail-safe test for `window.location.href` assignment)
- `src/main.tsx:1-20` — caller that imports `ThemeProvider`; updated in Step 5.3

---

## Completion Criteria

- [x] `src/hooks/useSystemThemeSync.ts` created with the exact interface `useSystemThemeSync(theme: Theme, applyTheme: (t: Theme) => void): void`
- [x] `src/hooks/useSystemThemeSync.test.ts` created with 3 unit tests, all passing
- [x] `src/hooks/useThemeStorageSync.ts` created with the exact interface `useThemeStorageSync(storageKey: string, defaultTheme: Theme, setThemeState: (t: Theme) => void): void`
- [x] `src/hooks/useThemeStorageSync.test.ts` created with 4 unit tests, all passing
- [x] `src/hooks/useThemeKeyboardToggle.ts` created with the exact interface `useThemeKeyboardToggle(storageKey: string, setThemeState: Dispatch<SetStateAction<Theme>>): void`
- [x] `src/hooks/useThemeKeyboardToggle.test.ts` created with 7 unit tests, all passing
- [x] `src/context/theme/ThemeProvider.tsx` created — thin coordinator calling the three hooks; exports `ThemeProvider`, `ThemeProviderContext`, `Theme`, `ThemeProviderState`
- [x] `src/context/theme/useTheme.ts` created — `useTheme` consumer hook importing `ThemeProviderContext` from `./ThemeProvider`
- [x] `src/main.tsx` import updated from `@/components/theme-provider.tsx` to `@/context/theme/ThemeProvider`
- [x] `src/components/theme-provider.tsx` deleted
- [x] `npm run typecheck` passes with 0 errors
- [x] `npm run build` passes with 0 errors
- [x] `npm run test` passes with **36/36 tests, 7 suites, 0 failures** (22 baseline + 14 new)
- [ ] Manual validation steps documented and flagged for user verification
- [x] Parent feature [[Features/to-do/Frontend-SOLID-Refactor]] Phase 5 steps (5.1a, 5.1b, 5.2, 5.3) marked `[x]`
- [x] Memory Bank `architecture.md` updated: add `context/theme/ThemeProvider.tsx`, `context/theme/useTheme.ts`, `hooks/useSystemThemeSync.ts`, `hooks/useThemeStorageSync.ts`, `hooks/useThemeKeyboardToggle.ts`; remove `components/theme-provider.tsx` row
- [x] Memory Bank `context.md` updated to reflect Task 5 complete and Phase 6 next
- [x] Memory Bank `progress.md` entry prepended with today's date
