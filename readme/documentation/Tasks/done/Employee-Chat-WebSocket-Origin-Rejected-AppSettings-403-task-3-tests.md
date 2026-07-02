# Task: Tests — WebSocket URL derivation

#task #current #low-complexity #parent-employee-chat-websocket-origin-rejected-appsettings-403

**Parent:** [[Employee-Chat-WebSocket-Origin-Rejected-AppSettings-403]]
**Parent Type:** Bug
**Related Step(s):** Phase 3 — Step 3.2 (`useChatSocket` URL-derivation test)
**Estimated Complexity:** Low

---

## Goal

Add two unit tests to `useChatSocket.test.ts` that verify the WS URL is derived from `window.location` (not a hardcoded host/port) and that the protocol switches from `ws:` to `wss:` when the page is served over HTTPS. These tests lock the Step 1.3 behavior change (Task 1) against regression.

---

## Parent Context

The parent Bug Report [[Employee-Chat-WebSocket-Origin-Rejected-AppSettings-403]] defined three test steps in Phase 3. Steps 3.1 and 3.3 were completed during Task 2:

- **Step 3.1 (DONE — Task 2 Step 2.5):** 4 backend security tests for `GET /app-settings/default-model` (employee 200 + no API key; employee 204; admin 403; anonymous 401) added to `AppSettingsControllerTest.java`.
- **Step 3.2 (TODO — this Task):** `useChatSocket` URL-derivation tests — assert the URL is built from `window.location` with the correct protocol (`ws:` / `wss:`), not from a hardcoded `localhost:8080`.
- **Step 3.3 (DONE — Task 2 Step 2.4):** `useChatSetup` default-preselection test — `useChatSetup.test.ts` was updated: 8 tests now mock `getDefaultModel` (from `chatService`) instead of `getAppSettings`; Test 1 asserts `selectedModelId === 2` when `getDefaultModel` returns the default mini DTO.

This Task is therefore scoped exclusively to **Step 3.2**.

What the parent mandates (Step 3.2):
- Assert `${proto}//${window.location.host}/ws/chat/…?token=…` is the constructed URL.
- Assert `ws:` is selected when `window.location.protocol === "http:"` (the jsdom default — implicitly tested by existing Test 7, but Step 3.2 requires an *explicit* assertion about protocol derivation and the absence of a hardcoded host/port).
- Assert `wss:` is selected when `window.location.protocol === "https:"` (the HTTPS/nginx path — currently untested).

Key constraints from the parent:
- Tests live in `useChatSocket.test.ts` alongside the 7 existing tests.
- The `FakeWebSocket` class and `vi.stubGlobal("WebSocket", FakeWebSocket)` setup are already in place; the new tests reuse them.
- `window.location` stubbing: Vitest's `vi.stubGlobal("location", { protocol: "https:", host: "localhost" })` is the correct mechanism (jsdom's `window.location` is configurable; `vi.unstubAllGlobals()` in `afterEach` restores it).
- The existing Test 7 already asserts `.toContain("/ws/chat/99")` and `.toContain("?token=test-jwt-token")` — the new tests complement it with explicit protocol and host assertions instead of duplicating it. A third test (`http:` / `ws:` derivation with an explicit host assertion) makes the derivation contract unambiguous; the HTTPS test is the one that adds real new coverage.

---

## Preconditions / Dependencies

- **Task 1 complete:** [[Employee-Chat-WebSocket-Origin-Rejected-AppSettings-403-task-1-same-origin-ws-routing]] is done. `useChatSocket.ts:40` now builds `const proto = window.location.protocol === "https:" ? "wss:" : "ws:"` and `const url = \`${proto}//${window.location.host}/ws/chat/${target}?token=${token ?? ""}\``. These are the lines the new tests target.
- **Task 2 complete:** [[Employee-Chat-WebSocket-Origin-Rejected-AppSettings-403-task-2-employee-default-model-endpoint]] is done. `useChatSetup.test.ts` has been updated and all 8 tests pass.
- **Frontend test baseline:** **185/185** across 33 files (after Task 1 and Task 2). The `useChatSocket.test.ts` suite currently has 7 tests; the two new tests will bring it to 9 and the total to 187/187.
- **`useChatSocket.ts` line 40 shape (confirmed):**
  ```ts
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:"
  const url = `${proto}//${window.location.host}/ws/chat/${target}?token=${token ?? ""}`
  ```
  jsdom's default `window.location`: `{ protocol: "http:", host: "localhost" }` → default URL is `ws://localhost/ws/chat/…`.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — **Selected** — provides the Task template, directory (`documentation/Tasks/current/`), and naming convention.
- `tdd` — **Selected** — defines the test approach: each new test targets a discrete observable behavior (protocol selection from page location) rather than an implementation detail; the `FakeWebSocket.url` field is the test surface (the SUT writes a URL that is the FakeWebSocket constructor arg).
- `memory-bank` — **Selected** — loaded; confirmed: frontend test baseline (185/185); `known-issues.md` confirms jsdom's `window.location.protocol = "http:"` and `host = "localhost"` as defaults; confirms `vi.unstubAllGlobals()` restores globals in `afterEach`.
- `solid-deep-design` — **Not needed** — no module design decisions; the test strategy is straightforward and the SUT's interface is unchanged.
- `find-docs` — **Not needed** — Vitest `vi.stubGlobal` API is stable and already in use in this file (`vi.stubGlobal("WebSocket", FakeWebSocket)`); no new API research required.

### Related Existing Code

- `project/srcs/frontend/src/features/chat/hooks/useChatSocket.test.ts` — the file to modify; 7 existing tests, `FakeWebSocket` class, `vi.stubGlobal("WebSocket", FakeWebSocket)` in `beforeEach`, `vi.unstubAllGlobals()` in `afterEach`, `mockGetToken.mockReturnValue("test-jwt-token")` default.
- `project/srcs/frontend/src/features/chat/hooks/useChatSocket.ts:40-41` — the two URL-derivation lines the tests target.

---

## Implementation Details

### Approach

Add two tests to the existing `describe("useChatSocket")` block, positioned after Test 7 (the last existing test):

**Test 8 — HTTP page derives `ws:` URL with `window.location.host`:**
Explicitly stubs `window.location` to `{ protocol: "http:", host: "testhost" }` (a non-`localhost` host to prove the URL does not hardcode a hostname) and asserts the constructed WS URL is `ws://testhost/ws/chat/5?token=test-jwt-token`. This test closes the gap where Test 7 only does `.toContain()` checks and cannot prove the absence of a hardcoded `localhost:8080`.

**Test 9 — HTTPS page derives `wss:` URL:**
Stubs `window.location` to `{ protocol: "https:", host: "localhost" }` and asserts the URL starts with `wss://localhost/ws/chat/…`. This is the only path that was completely untested before Task 1 landed.

Both tests reuse the existing `FakeWebSocket` infrastructure. `vi.stubGlobal("location", …)` is called inside each test body (not in `beforeEach`) so it is scoped to that test and `vi.unstubAllGlobals()` in `afterEach` restores `window.location` to the jsdom default.

### Files to Create/Modify

- [ ] `project/srcs/frontend/src/features/chat/hooks/useChatSocket.test.ts` — add Test 8 and Test 9 inside the existing `describe("useChatSocket")` block, after Test 7.

---

## Step-by-Step Implementation

### Step 3.2: Add URL-derivation tests to `useChatSocket.test.ts`

**Goal:** Lock the `window.location`-based URL derivation (protocol + host) against regression, and prove the `wss:` path under HTTPS works.
**Dependencies:** Task 1 (Step 1.3) must be complete — the `proto`/`url` lines at `useChatSocket.ts:40-41` must exist.

- [ ] In `project/srcs/frontend/src/features/chat/hooks/useChatSocket.test.ts`, add the following two tests **inside** the `describe("useChatSocket", () => { … })` block, after the closing brace of Test 7 and before the closing brace of `describe`.

#### Test 8 — HTTP page derives `ws:` and uses `window.location.host`

```ts
  // ── Test 8: URL is derived from window.location (ws: + host, no hardcoded port) ──
  it("builds ws: URL from window.location.protocol and window.location.host under HTTP", async () => {
    // Stub window.location to a non-default host to prove the URL is not hardcoded.
    // vi.unstubAllGlobals() in afterEach restores window.location to the jsdom default.
    vi.stubGlobal("location", { protocol: "http:", host: "testhost" })

    const { result } = renderHook(() => useChatSocket(undefined))

    act(() => {
      result.current.sendMessage("hello", 5)
    })

    expect(FakeWebSocket.instances).toHaveLength(1)
    expect(FakeWebSocket.instances[0].url).toBe(
      "ws://testhost/ws/chat/5?token=test-jwt-token"
    )
  })
```

**Why this test matters:** Test 7 uses `.toContain("/ws/chat/99")` and `.toContain("?token=…")` — it cannot distinguish `ws://localhost/ws/chat/99?…` (correct) from `ws://localhost:8080/ws/chat/99?…` (the old hardcoded URL). Test 8 uses a non-`localhost` host (`testhost`) and a `.toBe()` assertion on the full URL, so any hardcoded host or port in the URL immediately fails the test.

#### Test 9 — HTTPS page derives `wss:` URL

```ts
  // ── Test 9: URL uses wss: when the page protocol is https: ───────────────────
  it("builds wss: URL from window.location when the page is served over HTTPS", async () => {
    vi.stubGlobal("location", { protocol: "https:", host: "localhost" })

    const { result } = renderHook(() => useChatSocket(undefined))

    act(() => {
      result.current.sendMessage("hello", 7)
    })

    expect(FakeWebSocket.instances).toHaveLength(1)
    expect(FakeWebSocket.instances[0].url).toBe(
      "wss://localhost/ws/chat/7?token=test-jwt-token"
    )
  })
```

**Why this test matters:** Without this test, a developer could accidentally remove the `proto` ternary and hardcode `ws:` — the existing 7 tests would still pass because jsdom always runs on `http:`. Test 9 is the only guard for the `wss:` path (nginx HTTPS / port 443 deployment).

#### Edge Cases

1. **`vi.stubGlobal("location", { protocol: "http:", host: "testhost" })`** — Vitest's `stubGlobal` replaces `globalThis.location` (which is the same object as `window.location` in jsdom). `vi.unstubAllGlobals()` in the existing `afterEach` restores it. Calling `vi.stubGlobal` inside the test body (not `beforeEach`) ensures the stub is test-local; other tests in the suite are unaffected.
2. **Only `protocol` and `host` need to be stubbed** — `useChatSocket.ts` reads only `window.location.protocol` and `window.location.host` in the URL derivation. The stub object `{ protocol: "…", host: "…" }` is sufficient; other `Location` properties (`pathname`, `href`, etc.) are not accessed.
3. **`mockGetToken.mockReturnValue("test-jwt-token")` is set in `beforeEach`** — both new tests use the default token without any override. `vi.clearAllMocks()` in `beforeEach` clears call counts but the `.mockReturnValue("test-jwt-token")` line immediately after re-sets the implementation, so the token is available in every test (same pattern as Tests 1–7).
4. **`FakeWebSocket.instances` is reset in `beforeEach`** — `FakeWebSocket.instances = []` runs before each test, so Tests 8 and 9 start with an empty `instances` array regardless of previous test state.
5. **No `await act(async () => { await Promise.resolve() })` flush needed** — Tests 8 and 9 assert the URL that was passed to the `FakeWebSocket` constructor, which is set synchronously inside `sendMessage` before the `queueMicrotask` for `onopen` fires. The URL is captured at construction time (`this.url = url` in `FakeWebSocket.constructor`), so `expect(FakeWebSocket.instances[0].url)` is readable immediately after the synchronous `act(() => { sendMessage(…) })` block.

---

## Design Decisions

**Decision 1: Use `.toBe()` (exact match) not `.toContain()` for the URL assertion.**
- **Why:** `.toContain()` cannot prove the absence of a hardcoded host/port. The entire point of these tests is to lock the *full* URL shape, including the protocol scheme and the host. `.toBe("ws://testhost/ws/chat/5?token=test-jwt-token")` fails instantly if any fragment deviates — host, port, protocol, path, or query string.
- **Alternatives considered:** `.toContain("ws://")` + separate `.toContain("/ws/chat/5")` — rejected: a URL like `ws://localhost:8080/ws/chat/5` would still pass both `.toContain` checks while the host is wrong.

**Decision 2: Use `"testhost"` (not `"localhost"`) as the host in Test 8.**
- **Why:** If the URL derivation code were to fall back to hardcoded `localhost` (e.g., ignoring `window.location.host`), a test that stubs host to `"localhost"` and asserts `.toBe("ws://localhost/ws/chat/…")` would pass — masking the bug. Using a distinct, non-default host (`"testhost"`) ensures `window.location.host` is actually read. jsdom's default host is `"localhost"`, so Test 8 has to override it.
- **Alternatives considered:** Stub host to `"BHT.42.fr"` — equivalent; `"testhost"` is chosen because it is obviously synthetic (no risk of confusion with a real deployment host in test failure messages).

**Decision 3: Two new tests (not one combined test).**
- **Why:** Test 8 and Test 9 test orthogonal behaviors: host derivation (Test 8) and protocol switching (Test 9). Combining them would require stubbing both `"testhost"` and `"https:"` in a single test, making a failure message ambiguous (is it the protocol or the host that broke?). Two focused tests produce clearer failure output.
- **Alternatives considered:** A single parametrized test — Vitest supports `it.each` for parametrized cases; acceptable here but adds a layer of test infrastructure (a data table) that is not warranted for two distinct behaviors. Two explicit `it(…)` blocks are clearer.

**Decision 4: No new `beforeEach` setup; stubs are scoped to each test body.**
- **Why:** Tests 1–7 all rely on jsdom's default `window.location` (`http://localhost`). Putting `vi.stubGlobal("location", …)` in `beforeEach` would override the jsdom default for all tests and could break or mislead those that do not explicitly test the protocol. Scoping the stub to the test body is the minimal-impact pattern that `vi.unstubAllGlobals()` in `afterEach` cleans up automatically.

---

## Testing Considerations

### Automatic Validation

These checks must all pass after the two tests are added:

- [ ] `npm --prefix project/srcs/frontend run test -- --run` — **187/187 across 33 files** (185 baseline + 2 new). Specifically, the `useChatSocket.test.ts` suite must show **9/9** (7 existing + 2 new).
- [ ] `npm --prefix project/srcs/frontend run typecheck` — 0 errors. The new tests introduce no new imports and no new types; the only new TypeScript surface is `vi.stubGlobal("location", { protocol: string, host: string })`, which accepts `unknown` as its second argument (no type error).
- [ ] `npm --prefix project/srcs/frontend run build` — same outcome as after Tasks 1 and 2 (Vite build succeeds; pre-existing `tsc -b` failure in `useChat.test.ts` is unrelated and unaffected by this change; see Task 2 Post-Review Notes).
- [ ] `npx eslint src/features/chat/hooks/useChatSocket.test.ts` (run from `project/srcs/frontend/`) — 0 errors, 0 new warnings.

### Manual Validation

No additional manual steps are required for this Task. The manual validation checklist from Tasks 1 and 2 (running `docker compose up --build`, confirming `101 Switching Protocols` in the Network tab, verifying `wss://` under HTTPS, sending a message as employee) covers the production behavior these tests guard. This Task's contribution is the automated regression lock, not a new observable behavior.

---

## Related Code Explanations

- [[Employee-Chat-WebSocket-Origin-Rejected-AppSettings-403-task-1-same-origin-ws-routing]] — Task 1, which introduced the `proto`/`url` derivation at `useChatSocket.ts:40-41`. Design Decision 4 of that task explicitly groups the URL-derivation test into Task 3.
- `project/srcs/frontend/src/features/chat/hooks/useChatSocket.ts:40-41` — the two lines under test: `const proto = …` and `const url = \`${proto}//…\``.
- `project/srcs/frontend/src/features/chat/hooks/useChatSocket.test.ts` — the file to extend; `FakeWebSocket` class (captures the constructor-arg URL in `this.url`), `vi.stubGlobal("WebSocket", FakeWebSocket)` in `beforeEach`, `vi.unstubAllGlobals()` in `afterEach`.

---

## Completion Criteria

- [x] Parent Bug Report [[Employee-Chat-WebSocket-Origin-Rejected-AppSettings-403]] reviewed; confirmed Steps 3.1 and 3.3 are done (Tasks 2 Steps 2.5 and 2.4 respectively); this Task covers Step 3.2 only.
- [x] `useChatSocket.test.ts` — Test 8 (`ws:` + `window.location.host` derivation) and Test 9 (`wss:` under HTTPS) added inside `describe("useChatSocket")`, after Test 7.
- [x] `npm run test -- --run` — **187/187 across 33 files**; `useChatSocket.test.ts` **9/9**.
- [x] `npm run typecheck` — 0 errors on modified file.
- [x] `npx eslint` (from `project/srcs/frontend/`) — 0 errors on `useChatSocket.test.ts`.
- [x] Parent Bug Report Phase 3 Step 3.2 marked `[x]`; Task document wiki link wired into the parent Task Breakdown ("Task Document Link").
