# Task: Same-origin WebSocket routing (nginx + Vite proxy + page-location URL + origin allowlist)

#task #current #medium-complexity #parent-employee-chat-websocket-origin-rejected-appsettings-403

**Parent:** [[Employee-Chat-WebSocket-Origin-Rejected-AppSettings-403]]
**Parent Type:** Bug
**Related Step(s):** Phase 1 — Steps 1.1, 1.2, 1.3, 1.4 (Finding 1 — WebSocket handshake rejected as "Invalid CORS request")
**Estimated Complexity:** Medium

---

## Goal

Make the Employee Chat WebSocket **same-origin** through nginx and derive its URL from the page location, so the browser's `Origin` header on the upgrade matches one of the deployment origins the backend explicitly allows. This removes the `403 Invalid CORS request` (Finding 1) that currently blocks all chat sends in the dockerized deployment, and eliminates the hardcoded dev-only `ws://localhost:8080` host/port that would break any production environment.

---

## Parent Context

The parent Bug Report [[Employee-Chat-WebSocket-Origin-Rejected-AppSettings-403]] contains two independent findings. This Task addresses **Finding 1 only** (the Critical WebSocket 403). Finding 2 (`/app-settings` 403 for employees) is Task 2; the tests for both fixes are Task 3.

What the parent mandates for this task (Option B — production-aligned, accepted 2026-07-01):

1. **Step 1.1** — Add a `location /ws/` block to `nginx.conf` that reverse-proxies the WebSocket upgrade to `http://backend:8080`, mirroring the existing HMR Upgrade/Connection headers (`proxy_http_version 1.1; proxy_set_header Upgrade …; proxy_set_header Connection $connection_upgrade;`). It MUST set `access_log off;` (the `?token=` query param carries the bearer JWT and nginx records `$request` — including the query string — by default). It MUST set `proxy_read_timeout 300s` + `proxy_send_timeout 300s` (right-sized for streaming turns; nginx resets the read timer on each upstream chunk so an active stream is never idle). It MUST define a `limit_conn` zone and apply it to the location to bound concurrent upgraded sockets per client. `proxy_pass http://backend:8080;` must keep the `/ws/` prefix (no trailing slash) so the full path `/ws/chat/{id}` reaches the backend handler registered at that path.

2. **Step 1.2** — Add a `/ws` proxy entry to `vite.config.ts` with `target: "ws://localhost:8080"`, `ws: true`, `changeOrigin: true` (parity for the rare direct-Vite dev path where the SPA is opened on Vite `:3000`).

3. **Step 1.3** — Replace the hardcoded `ws://localhost:8080/ws/chat/${target}?token=…` URL at `useChatSocket.ts:40` with a page-location-derived URL: `${proto}//${window.location.host}/ws/chat/${target}?token=…` where `proto = window.location.protocol === "https:" ? "wss:" : "ws:"`.

4. **Step 1.4** — Make the WS origin allowlist explicit and **load-bearing**: `setAllowedOrigins("http://localhost:3000", "http://localhost", "https://localhost", "http://BHT.42.fr", "https://BHT.42.fr")`. Do NOT use `setAllowedOriginPatterns("http*://localhost*")` (omits the prod `BHT.42.fr` host and over-matches lookalike subdomains).

Key constraints from the parent:
- The allowlist is **load-bearing**, not defense-in-depth: browsers send `Origin` on every WS upgrade and Spring's `AbstractHandshakeHandler` validates it even for same-origin upgrades (same-origin routing removes the *cross-origin mismatch*, not the `Origin` check itself).
- The four edits **must land together** to avoid a window where the WS is neither cross-origin-allowed nor yet same-origin (which would break all chat sends) — hence the four steps are grouped into one Task.
- JWT still flows via the `?token=` query param and is validated by `JwtHandshakeInterceptor` (role check confirmed correct & independent of origin); nothing changes about the auth path.
- Rejected Option A (broaden-only) leaves the hardcoded `localhost:8080` host/port in the client (wrong in production) and is a divergent allowlist from REST. Rejected Option C (relative URL without page-location derivation) re-introduces the HTTPS/WSS protocol mismatch.
- This Task introduces **no new automated tests**: per the parent's Task Breakdown, all test coverage for Finding 1 (the `useChatSocket` URL-derivation test) is in **Task 3**. This Task's validation is regression (existing suites stay green) + manual browser validation.

---

## Preconditions / Dependencies

- The Employee Chat Interface feature must be implemented (it is — [[Employee-Chat-Interface]] Phases 1–8 complete per `context.md`/`progress.md`). The affected files already exist:
  - `project/srcs/nginx/conf/nginx.conf` (has the `/`, `/api/`, `/swagger-ui/`, `/v3/`, `/adminer/` blocks and a `map $http_upgrade $connection_upgrade {…}` at the top — the template to mirror for `/ws/`).
  - `project/srcs/frontend/vite.config.ts` (has the `/api` proxy with `changeOrigin`, `rewrite`, and a `configure` that removes the `origin` header — `/ws` is added alongside).
  - `project/srcs/frontend/src/features/chat/hooks/useChatSocket.ts` (line 40 is the hardcoded `ws://localhost:8080/…` URL to replace; the file already builds `token` via `getToken()` and uses `wsRef`/unmount-only cleanup — only the URL line changes).
  - `project/srcs/backend/src/main/java/com/BHT/models/chat/WebSocketConfig.java` (currently `.setAllowedOrigins("http://localhost:3000")` only).
- The deployment topology (parent Environment / Preconditions): backend (`:8080`), nginx (`:80`/`:443`, `server_name localhost BHT.42.fr`), frontend (Vite `:3000`, **not host-published** → page origin is the nginx origin `http://localhost`/`https://localhost`), db.
- No previous Task documents exist for this bug (`documentation/Tasks/current/` is empty); Task 1 is the first task. Tasks 2 and 3 are pending and depend on/parallel this work (Task 3's WS URL-derivation test depends on the Step 1.3 change landing).
- Constraint reminder (`known-issues.md`): Spring WebSocket **skips the origin check when no `Origin` header is present**. The existing `ChatWebSocketSecurityTest` uses `StandardWebSocketClient` with `new WebSocketHttpHeaders()` and sets **no Origin** → broadening the allowlist does NOT break the existing WS security tests (they never hit the origin path). This is load-bearing for the regression strategy below.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — **Selected** — provides the Task template, directory (`documentation/Tasks/current/`), and naming convention; confirms the doc system is initialized.
- `solid-deep-design` — **Selected** — governs the design of the one code module shaped here (`useChatSocket`'s URL construction seam) and the cross-tier routing decision (Option B vs A/C). See Design Decisions.
- `memory-bank` — **Selected** — loaded all Memory Bank files; confirmed architecture, deployment topology, the WebSocket sharp edges (`known-issues.md`), and the current frontend test baseline (185 tests / 33 files after Employee Chat Task 7).
- `find-docs` — **Selected** — retrieved version-matched Vite 7.3.1 server.proxy WebSocket (`ws: true`) documentation via Context7.
- `tdd` — **Selected** — defines the test strategy. This Task itself writes no new tests (parent groups all Finding-1 test coverage into Task 3); the strategy here is regression-guard + the manual validation steps the parent's Validation Strategy mandates.
- `glossary-management` — **Not needed** — the Glossary CLI JSON index is empty (`known-issues.md` notes the index/backfill gap); the domain terms used here ("WebSocket", "origin allowlist", "same-origin upgrade") are standard and already consistent with the bug report's terminology. No new ubiquitous-language terms are introduced by this routing change.
- `doc-exploration` — **Selected** (executed during planning) — confirmed no existing ADR constrains the WS routing approach (ADRs ADR-001..010 reviewed; none address nginx WS routing or the frontend WS URL derivation). No ADR update is required for this Task (the parent Bug Report itself records the Option B decision).

### Documentation Reviewed

- **Context7 — Vite `/vitejs/vite/v7.3.1`** (exact project version): reviewed `server.proxy` WebSocket proxying. Confirmed the option shape: `{ target, ws: true, changeOrigin: true }` (or `rewriteWsOrigin: true`); keys are path prefixes (so `"/ws"` matches `/ws/…`); `ws: true` enables WebSocket proxying via `http-proxy-3`. Per the Vite 7.3.1 docs, the canonical WS-proxy example is `'/socket.io': { target: 'ws://localhost:5174', ws: true, rewriteWsOrigin: true }`. The parent's proposed `changeOrigin: true` rewrites the `Host` header to the target (sufficient for the backend; `rewriteWsOrigin` rewrites the WS `Origin` header and carries a CSRF caveat the Vite docs warn about — not used here). No version-drift risk: `target` accepting a `ws://` scheme and the `ws`/`changeOrigin` booleans are stable across Vite 5–8.
- **Spring WebSocket `setAllowedOrigins`** — stable since Spring WebSocket 4.0; the project uses Spring Boot 3.4.1 (Boot-managed Spring WebSocket). `WebSocketHandlerRegistry.setAllowedOrigins(String...)` is exact-match, anchored (vs `setAllowedOriginPatterns` which is pattern-based). Verified against current usage in `WebSocketConfig.java:25` and `SecurityConfig.corsConfigurationSource()` (`setAllowedOrigins(List.of("http://localhost:3000"))` at `SecurityConfig.java:115`).
- **nginx WebSocket reverse proxy** — standard `map $http_upgrade $connection_upgrade` + `proxy_http_version 1.1` + Upgrade/Connection headers pattern, already present at the top of this project's `nginx.conf:1-4` and used by the HMR `/` block (`nginx.conf:30-33`). The `/ws/` block mirrors it.
- `documentation/Memory/known-issues.md` — reviewed the WebSocket sharp edges (JWT via `?token=`, per-message SecurityContext, `UriTemplate.match` needs `.getPath()`, and the **no-Origin-header ⇒ origin check skipped** behavior that protects the existing WS tests).

### Related Existing Code

- `project/srcs/nginx/conf/nginx.conf` — the `map $http_upgrade $connection_upgrade` (lines 1-4) and the HMR `/` block Upgrade/Connection headers (lines 30-33) are the exact template that `/ws/` mirrors. `server_name localhost BHT.42.fr;` (line 15) confirms the prod host is already known to nginx.
- `project/srcs/backend/src/main/java/com/BHT/models/chat/WebSocketConfig.java:25` — the one allowlist line to change.
- `project/srcs/frontend/src/features/chat/hooks/useChatSocket.ts:40` — the one URL line to change; surrounding `getToken()`/`wsRef`/cleanup logic stays byte-identical.
- `project/srcs/frontend/vite.config.ts:14-25` — existing `/api` proxy; `/ws` is added alongside it in the same `server.proxy` object.
- `project/srcs/backend/src/main/java/com/BHT/configuration/security/SecurityConfig.java:69` — `/ws/**` is already `permitAll` (WS auth delegated to `JwtHandshakeInterceptor`); no SecurityConfig change is needed.
- `documentation/Docs/API-Reference/WebSocket-Chat.md` — the WS protocol doc to update (route/origin note) at the end of this task.

---

## Implementation Details

### Approach

The fix is a **single cohesive cross-tier routing change** (the parent's reason for grouping the four steps into one Task). The four edits are mutually dependent and must land together:

1. **nginx becomes the WS gateway.** A new `location /ws/` block in `nginx.conf` reverse-proxies the upgrade to `backend:8080` with HTTP/1.1 + Upgrade/Connection headers, suppresses access logging (JWT-in-URL), right-sizes timeouts, and bounds per-client concurrency. Now the browser's WS upgrade is **same-origin** to the page (the page was served by this same nginx).

2. **Vite proxies `/ws` for direct-dev parity.** A `/ws` entry with `ws: true` lets the rare direct-Vite dev path (SPA opened on `:3000`) also reach the backend on `:8080`, so the same `useChatSocket` code is correct in both dev paths (Vite-direct and nginx/compose).

3. **`useChatSocket` derives the URL from the page location.** `${proto}//${window.location.host}/ws/chat/${target}?token=…` replaces the hardcoded `ws://localhost:8080…`. Because the upgrade now originates from the same host that served the page, the `Origin` header equals a deployment origin the backend allows → the WS allowlist check passes. `wss://` is selected automatically under HTTPS.

4. **The allowlist is made explicit and load-bearing.** `setAllowedOrigins(...)` enumerates every deployment origin exactly (Vite `:3000`, nginx HTTP/HTTPS localhost, prod `BHT.42.fr` HTTP/HTTPS). Exact-match (not patterns) avoids the over-broad `localhost*` and the prod-host-omission footguns.

This follows existing project precedents (nginx HMR Upgrade headers, Vite `/api` proxy), introduces **no new module, no new DTO, no new pattern**, and changes only one line of frontend behavior + three config files. The `solid-deep-design` lens: the one code module touched, `useChatSocket`, is already a deep module (a single `sendMessage` entry point hiding WS lifecycle, frame parsing, and state transitions behind a 4-field interface). This change **deepens** it slightly — the URL-construction concern that was previously *leaked into the caller's deployment assumptions* (a hardcoded host/port) is now *encapsulated behind a page-location derivation* the caller never sees. The change is purely additive to depth; the interface (`UseChatSocketResult`) is unchanged.

### Files to Create/Modify

- [x] `project/srcs/nginx/conf/nginx.conf` — add `limit_conn_zone` in the `http`-level scope and a new `location /ws/` block inside the `server` block (after the `/api/` block).
- [x] `project/srcs/frontend/vite.config.ts` — add a `/ws` proxy entry to the `server.proxy` object.
- [x] `project/srcs/frontend/src/features/chat/hooks/useChatSocket.ts` — replace the hardcoded URL at line 40 with the page-location-derived URL.
- [x] `project/srcs/backend/src/main/java/com/BHT/models/chat/WebSocketConfig.java` — broaden `setAllowedOrigins(...)` to the explicit 5-origin set.
- [x] `documentation/Docs/API-Reference/WebSocket-Chat.md` — update the dev-topology / routing note to reflect same-origin WS via nginx (no hardcoded backend port).

---

## Step-by-Step Implementation

### Step 1.1: Add the `/ws/` location block (and `limit_conn` zone) to `nginx.conf`

**Goal:** Make nginx the WebSocket gateway so the browser's upgrade is same-origin to the page, suppress logging of the `?token=` JWT, and bound per-client concurrency.
**Dependencies:** None (nginx is the entry point; the backend `/ws/chat/{conversationId}` handler already exists).

- [x] Add a `limit_conn_zone $binary_remote_addr zone=ws_per_ip:10m;` directive. It must be in the `http {}` scope. This project's `nginx.conf` is structured as a single `server` block with the `map` directive at the top (the `http {}` wrapper is provided by the nginx default config / the container's main config — confirmed by the existing top-level `map` directive which is only legal at `http` scope). Place the `limit_conn_zone` immediately after the existing `map $http_upgrade $connection_upgrade {…}` block at the top of the file, before `server {`.
- [x] Add the `location /ws/ { … }` block inside the `server` block, positioned after the existing `location /api/ { … }` block (keep the API/swagger/adminer ordering; `/ws/` is a backend route alongside `/api/`).

**Why this step is critical:**
Without this block, even after Step 1.3 makes the URL relative, the upgrade would be proxied to the **frontend** container by the catch-all `/` block (which `proxy_pass http://frontend:3000`) instead of reaching the backend — every chat send would fail. It is the keystone that makes the WS same-origin AND routes it to Spring Boot.

#### Implementation

Add at the top of `nginx.conf`, right after the existing `map $http_upgrade $connection_upgrade` block:

```nginx
# Bound concurrent upgraded WS sockets per client IP — protects nginx worker
# connections under many employees / abandoned stale tabs.
limit_conn_zone $binary_remote_addr zone=ws_per_ip:10m;
```

Then inside the `server` block, after the `location /api/ { … }` block (before the `# 2b. Swagger…` comment), add:

```nginx
    # 4. BACKEND WebSocket: reverse-proxy the chat WS upgrade to Spring Boot.
    #    The /ws/ URL carries the JWT in ?token= — suppress access logging here so the
    #    bearer token is not written to nginx access logs (the default log format
    #    records $request including the query string). Do NOT add access_log on here.
    location /ws/ {
        access_log off;                 # do NOT log the ?token= query string

        limit_conn ws_per_ip 20;         # max 20 upgraded sockets per client IP

        # No trailing slash on proxy_pass → preserve the /ws/ prefix so the full
        # path /ws/chat/{conversationId} reaches the backend handler registered at
        # that exact path (mirrors the /api/ block's prefix-strip via trailing slash;
        # /ws intentionally does NOT strip — the backend handler IS /ws/chat/{id}).
        proxy_pass http://backend:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_cache_bypass $http_upgrade;

        # Right-sized for streaming turns (idle gaps inside a turn are seconds, not
        # minutes). 300s tolerates a slow first token; nginx resets the read timer on
        # each upstream chunk, so an active stream is never prematurely closed.
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
```

#### Edge Cases

1. **`proxy_pass` trailing slash semantics** — `proxy_pass http://backend:8080;` (no trailing slash) preserves the request URI including `/ws/`, so `/ws/chat/1` reaches the backend's `/ws/chat/{conversationId}` handler verbatim. (Contrast with the `/api/` block at `nginx.conf:37-38` which uses a trailing slash to *strip* the `/api` prefix.) Adding a trailing slash here would forward `/chat/1` and 404 the handler — the comment above calls out this asymmetry deliberately.
2. **Already-upgraded sockets under the `/` block** — before this block exists, a `/ws/…` request falls through to the `/` block (`proxy_pass http://frontend:3000`), which forwards it to Vite (not the backend) and the upgrade fails. The `/ws/` block is `server`-scoped and more specific than `/`, so it wins. No `rewrite` is needed.
3. **Workers / `limit_conn` zone size** — `10m` (10 MB) is ample for a per-IP connection-count map at this scale; if the deployment grows, the zone size is a tuning knob, not a correctness concern. The `limit_conn ws_per_ip 20` bound is per-IP-concurrent — a single employee behind NAT sharing the IP gets 20 upgraded sockets (e.g. multiple tabs); abandoning a tab frees its slots when nginx closes the upgraded connection on the read/send timeout.
4. **`access_log off;` is the local mitigation** — server/app logs upstream of nginx (e.g. an edge relay that already captures the URL) are out of scope here; the parent's Potential Risks notes a stronger long-term fix (move the token out of the URL into an `Authorization`/`Sec-WebSocket-Protocol` frame), which is deferred.

---

### Step 1.2: Add the `/ws` proxy entry to `vite.config.ts`

**Goal:** Give the direct-Vite dev path (SPA opened on Vite `:3000`) WS-proxy parity with nginx, so the same `useChatSocket` URL code is correct in both dev topologies.
**Dependencies:** None.

- [x] Add a `"/ws"` key to the `server.proxy` object with `target: "ws://localhost:8080"`, `ws: true`, `changeOrigin: true`.

**Why this step is critical:**
In the compose deployment nginx does the proxying. In direct-Vite dev (the path a developer runs by `npm run dev` and opens `:3000`), the page origin is `http://localhost:3000` and a relative `/ws/…` upgrade must also reach the backend on `:8080`. Without this, the direct-Vite dev path breaks the instant Step 1.3 removes the hardcoded `:8080`. Both entries must land together.

#### Implementation

In `project/srcs/frontend/vite.config.ts`, the `server.proxy` object currently holds only `"/api"`. Add `"/ws"` alongside it:

```ts
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.removeHeader("origin")
          })
        },
      },
      // WebSocket upgrade proxy — parity with the nginx /ws/ block for the
      // direct-Vite dev path (SPA opened on :3000). In the compose deployment
      // nginx does the proxying; both paths use the SAME useChatSocket URL code
      // (page-location-derived, no hardcoded host/port).
      "/ws": {
        target: "ws://localhost:8080",
        ws: true,
        changeOrigin: true,
      },
    },
  },
```

The `/ws` proxy intentionally does **not** `removeHeader("origin")` (unlike `/api`): the backend's WS allowlist is load-bearing and *checks* the `Origin` header, so the browser's real origin (`http://localhost:3000` in direct-Vite dev) must reach the handler. `changeOrigin: true` rewrites the `Host` header to `localhost:8080` (so the backend sees the expected host) while leaving the `Origin` header intact — this is the correct behavior for a WS upgrade whose allowlist is origin-based.

#### Edge Cases

1. **`target` scheme `ws://`** — the Vite 7.3.1 docs confirm the WS-proxy example uses a `ws://` target with `ws: true`. Using `http://localhost:8080` + `ws: true` also works (http-proxy-3 derives the WS scheme), but the `ws://` target is the documented canonical form and removes ambiguity.
2. **Not using `rewriteWsOrigin`** — that option rewrites the WS `Origin` header to the target and the Vite 7.3.1 docs explicitly warn it "can leave the proxying open to CSRF attacks." The allowlist already authorizes `http://localhost:3000`, so the real browser origin is accepted; rewriting it is unnecessary and weakens the security posture.
3. **Path prefix match** — Vite proxy keys are path prefixes; `"/ws"` matches `/ws/…` upgrades. No `rewrite` is needed (the backend handler path is `/ws/chat/{id}`, so the prefix must reach it verbatim — same rationale as the nginx `proxy_pass` no-trailing-slash above).

---

### Step 1.3: Derive the WS URL from the page location in `useChatSocket.ts`

**Goal:** Remove the hardcoded dev-only `ws://localhost:8080` so the WS is same-origin to the page (and correct in both dev and production, including `wss://` under HTTPS).
**Dependencies:** Step 1.1 (nginx `/ws/` block) and Step 1.2 (Vite `/ws` proxy) must land together with this — otherwise the relative `/ws/…` upgrade has nothing to route it to the backend.

- [x] At `useChatSocket.ts:40`, replace the hardcoded URL with a page-location-derived URL.

**Why this step is critical:**
This is the single behavior change in the codebase. The hardcoded `localhost:8080` is (a) cross-origin to the nginx-served page → the 403, and (b) dev-machine-specific → wrong in any production environment. Deriving from `window.location` makes the upgrade same-origin (the page host is in the allowlist after Step 1.4) and selects `wss:` automatically under HTTPS.

#### Implementation

At `project/srcs/frontend/src/features/chat/hooks/useChatSocket.ts`, replace line 40 (`const url = \`ws://localhost:8080/ws/chat/${target}?token=${token ?? ""}\``) with:

```ts
    const token = getToken()
    // Derive the WS URL from the page location so the upgrade is SAME-ORIGIN to the
    // page (served by nginx in compose, by Vite in direct-dev). This removes the
    // hardcoded dev-only ws://localhost:8080 that was cross-origin to the nginx page
    // (=> 403 Invalid CORS request) and wrong in any non-dev host/port. wss: is used
    // automatically under HTTPS. See the Bug Report Finding 1 (Option B).
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:"
    const url = `${proto}//${window.location.host}/ws/chat/${target}?token=${token ?? ""}`
```

Everything else in the file (the `wsRef` hold, the `useEffect([], [])` unmount-only cleanup, `sendMessage`'s no-op guard inside the body, the `onopen`/`onmessage`/`onerror` handlers, the `chunk`/`done`/`error` frame parsing, the streaming-retained-after-done semantics) stays **byte-identical** — only the URL line (and the two new derivation lines above it) change.

#### Edge Cases

1. **jsdom test environment (`window.location`)** — Vitest/jsdom defaults `window.location` to `http://localhost/`. So under the existing test suite the derived URL becomes `ws://localhost/ws/chat/99?token=test-jwt-token`. The existing `useChatSocket.test.ts` Test 7 asserts `url.toContain("/ws/chat/99")` and `url.toContain("?token=test-jwt-token")` — both still hold (neither asserts `localhost:8080`). **No existing test breaks.** The `wss:`-under-`https:` assertion is Task 3's new test (it stubs `window.location` to an `https:` origin); this Task does not add it.
2. **`token` null handling** — `${token ?? ""}` is preserved verbatim; `getToken()` returning `null`/`undefined` yields `?token=` and `JwtHandshakeInterceptor` rejects with 401 (unchanged behavior; no test change).
3. **`conversationId` flip `undefined → id`** — the `target = conversationIdOverride ?? conversationId` logic is unchanged; the URL only derives host/proto from the page, the conversation id still comes from `target`. The mount-preservation invariants from `known-issues.md` (no `key` on `ChatPage`, `element=` not `Component=`, unmount-only WS cleanup) are untouched.
4. **`window.location.host` includes the port** — under nginx on `http://localhost` the host is `localhost` (port 80 implicit); under `https://localhost` it is `localhost` (443 implicit); under direct-Vite dev it is `localhost:3000`. In all three cases the host matches an allowlist entry. (If a future deployment serves nginx on a non-default port, the allowlist would need that origin too — already true for REST CORS today.)

---

### Step 1.4: Make the WS origin allowlist explicit and load-bearing in `WebSocketConfig.java`

**Goal:** Authorize every deployment origin exactly, so the same-origin (and any direct-Vite) upgrade passes Spring's handshake origin check — while staying a tight, anchored set (no wildcards).
**Dependencies:** None (independent of 1.1–1.3, but must land in the same Task to avoid the window where the WS is same-origin but the new same-origin is still absent from the allowlist).

- [x] Replace `.setAllowedOrigins("http://localhost:3000")` with the explicit 5-origin set.

**Why this step is critical:**
Same-origin routing removes the *cross-origin mismatch* but NOT the `Origin` check — Spring validates the allowlist on **every** upgrade, same-origin included. If the allowlist still only contained `:3000`, the nginx-served `http://localhost` upgrade would still 403 even after Steps 1.1–1.3. The allowlist is the gate; it must enumerate the page origins.

#### Implementation

At `project/srcs/backend/src/main/java/com/BHT/models/chat/WebSocketConfig.java:25`, replace:

```java
                .setAllowedOrigins("http://localhost:3000");
```

with:

```java
                // Load-bearing: browsers send an `Origin` header on every WS upgrade
                // and Spring's AbstractHandshakeHandler validates it even for same-origin
                // upgrades. Same-origin routing (nginx /ws/ + page-location URL in
                // useChatSocket) removes the CROSS-ORIGIN mismatch, not this check.
                // Enumerate every deployment origin exactly — do NOT use
                // setAllowedOriginPatterns("http*://localhost*"): it omits the prod
                // BHT.42.fr host and over-matches lookalike subdomains.
                .setAllowedOrigins(
                        "http://localhost:3000",  // Vite dev server (direct)
                        "http://localhost",       // nginx HTTP  (server_name includes localhost + BHT.42.fr)
                        "https://localhost",      // nginx HTTPS
                        "http://BHT.42.fr",       // prod host
                        "https://BHT.42.fr"       // prod host (HTTPS)
                );
```

#### Edge Cases

1. **Existing WS security tests use no `Origin` header** — `ChatWebSocketSecurityTest` constructs `new StandardWebSocketClient()` and `new WebSocketHttpHeaders()` with no `Origin` set. Per `known-issues.md`, Spring **skips** the origin check when no `Origin` header is present, so tests 1–5 (no-token 401, invalid-token 401, admin-token 403, employee-token 200, service-throws error frame) are unaffected by the broaden. **Regression stays green.**
2. **Exact-match vs patterns** — `setAllowedOrigins(String...)` is exact, anchored (Spring `OriginHandshakeInterceptor`). `http://localhost` does NOT match `http://localhost:3000` or `http://something.localhost`; each origin must be listed. That is the intent — tight authorization. `setAllowedOriginPatterns` would enable wildcarding (rejected by the parent for the over-match risk).
3. **REST CORS is unchanged** — `SecurityConfig.corsConfigurationSource()` (`SecurityConfig.java:112-115`) still has only `http://localhost:3000` for REST. The parent notes the WS allowlist should *ideally* be sourced from the same config as REST; that consolidation is **out of scope** for this Task (it touches `SecurityConfig`, a separate security surface, and REST CORS works today because REST calls are same-origin relative URLs). This Task widens the WS allowlist only.
4. **`BHT.42.fr` is already a known prod host** — `nginx.conf:15` already declares `server_name localhost BHT.42.fr;`, so both prod origins are reachable deployment origins and belong in the allowlist.

---

### Step 1.5: Update the WebSocket-Chat API reference note

**Goal:** Keep the protocol doc accurate after the routing change (the parent's Files to Modify lists it).
**Dependencies:** Steps 1.1–1.4 land first.

- [x] In `documentation/Docs/API-Reference/WebSocket-Chat.md`, update the four stale routing/origin statements to reflect same-origin WS via nginx + Vite proxy and the broadened, explicit allowlist. Do not change the documented frame protocol (`chunk`/`done`/`error`) — the message format is unchanged.

**Why this step is critical:**
The doc currently tells the reader to connect **directly to `ws://localhost:8080`** and claims the Vite proxy "does not relay WebSocket connections" — both statements are invalidated by this fix and, if left stale, actively mislead anyone following the API reference. Leaving them would re-introduce the bug a reader is sent to debug.

#### Implementation

Open `documentation/Docs/API-Reference/WebSocket-Chat.md` and make these exact edits:

1. **Line 3 (Endpoint banner):** replace `Endpoint: \`ws://localhost:8080/ws/chat/{conversationId}\`` with `Endpoint: \`{ws|wss}://{page-host}/ws/chat/{conversationId}\` (same-origin via nginx in compose, via the Vite \`/ws\` proxy in direct-dev)`. Keep the Auth/auth-required lines (4-5) unchanged.

2. **Lines 13-19 (Connection section):** replace the code block + direct-Vite bullet. The code block becomes:
   ```
   {ws|wss}://{page-host}/ws/chat/{conversationId}?token=<jwt>
   ```
   Replace the line-19 Vite bullet (`*From the Vite dev server, use \`ws://localhost:8080/...\` directly … Connect to the backend port (8080) directly.*`) with: *"The frontend derives the URL from `window.location` (protocol-derived `ws:`/`wss:` + host) and connects same-origin. In the compose deployment nginx reverse-proxies the upgrade (`location /ws/` → `backend:8080`); in direct-Vite dev the `/ws` proxy entry forwards it to `localhost:8080`. There is **no hardcoded backend host/port** — never connect to `ws://localhost:8080` directly."* Keep the `conversationId`/JWT bullets (17-18) unchanged.

3. **Lines 137-140 (CORS note):** replace the note text. Update the `setAllowedOrigins(...)` reference to the 5-origin set (Vite `:3000`, `http://localhost`, `https://localhost`, `http://BHT.42.fr`, `https://BHT.42.fr`) and clarify that the `Origin` check is **load-bearing** (browsers send `Origin` on every upgrade and Spring validates it even for same-origin upgrades) — same-origin routing removes the *cross-origin* mismatch, not the check. Keep the framing that this is a WS-level origin check (not HTTP CORS).

Leave the "Sending a message" (26-34), "Receiving frames" (38-85), "Full turn sequence" (89-113), prompt (117-124), and prerequisites (128-134) sections **untouched** — the message/frame contract and turn semantics are unchanged by this routing fix.

#### Edge Cases

1. **Only the routing/origin statements change** — the frame contract (`ChatOutgoingFrame` `chunk`/`done`/`error` + `ChatIncomingMessage {content}`) and turn sequence are unchanged; do not rewrite the protocol sections.
2. **The `{page-host}` placeholder** — intentional. The doc must not re-encode a concrete host/port (that was the original bug); the placeholder plus the "no hardcoded backend host/port" note forbids it by construction.

---

## Design Decisions

**Decision 1: Route the WS through nginx (same-origin) rather than broaden the allowlist only (Option B over Option A).**
- **Why:** Option A leaves the hardcoded `ws://localhost:8080` in the client — dev-machine-specific, wrong in production — and diverges the WS allowlist from the REST CORS posture while loosening security with every new origin. Same-origin routing removes the cross-origin path entirely (the `Origin` equals the page origin, which is in the allowlist), deletes the dev-only host/port hardcoding, and makes `wss:` work transparently under HTTPS. It is strictly more correct and more secure than Option A.
- **Alternatives considered:** Option A (broaden `setAllowedOrigins` only, keep `ws://localhost:8080`) — rejected by the parent: dev-only band-aid. Option C (relative URL without page-location derivation) — rejected: re-introduces the HTTPS/WSS protocol mismatch and is more code than `${proto}//${host}/…`.

**Decision 2: Use `setAllowedOrigins` (exact-match) over `setAllowedOriginPatterns`.**
- **Why:** Exact-match is anchored: `http://localhost` matches only that origin, not lookalike subdomains; every deployment origin is listed explicitly. The parent's rejected `setAllowedOriginPatterns("http*://localhost*")` omits the prod `BHT.42.fr` host (so same-origin upgrades scoped to that host would 403) and over-matches `localhost*` subdomains. Tight, enumerated authorization is the correct posture for a load-bearing allowlist.
- **Alternatives considered:** `setAllowedOriginPatterns` with per-origin entries — more lines for the same exact-match semantics; `setAllowedOrigins` is simpler and reads as a literal deployment-origin list.

**Decision 3: In `useChatSocket`, derive the URL from `window.location` rather than use a bare relative URL.**
- **Why:** A bare relative `/ws/chat/{id}?token=…` would also be same-origin, but the browser `WebSocket` constructor requires an absolute URL; constructing it from `window.location.host` + the correct protocol (`ws:`/`wss:`) is the minimal absolute form and fixes the HTTPS/WSS match automatically. The construction is one line + a proto ternary; callers see the same `useChatSocket` interface (the URL-derivation concern is **encapsulated** — deepening the module by removing the leaked deployment assumption).
- **Alternatives considered:** Hardcoding the scheme and leaving the host relative (`new URL(`/ws/…`, window.location)`) — `new URL` with a relative ref + no scheme in the ref derives scheme from the base, which is equivalent but adds an import and an intermediate object for no benefit over the template literal.

**Decision 4: This Task writes no new automated tests; Finding-1 test coverage lives in Task 3.**
- **Why:** The parent's Task Breakdown explicitly groups the `useChatSocket` URL-derivation test (Step 3.2) into Task 3 (Tests) alongside the Finding-2 endpoint tests. The four routing edits here are tightly coupled config (nginx + Vite + frontend + allowlist) that can only be regression-verified (existing suites stay green) and manually validated (the actual handshake needs a running stack + browser). Adding a partial URL-derivation test here would duplicate Task 3's Step 3.2 and split the test plan the parent defined. The TDD skill's "interface is the test surface" is honored via regression: the existing 7 `useChatSocket` behavior tests (Test 7 checks `/ws/chat/99` + `?token=`) act as the regression net for the URL change; jsdom's `window.location` default keeps them green.
- **Alternatives considered:** Inline the URL-derivation test here — rejected per the parent's explicit task grouping and to avoid test-plan duplication.

**Decision 5: `/ws` Vite proxy uses `changeOrigin` (not `rewriteWsOrigin`).**
- **Why:** `changeOrigin` rewrites the `Host` header to the target so the backend sees `localhost:8080`, while the browser's real `Origin` (`http://localhost:3000`) reaches the handler — exactly what the load-bearing allowlist needs to authorize. `rewriteWsOrigin` rewrites the WS `Origin` header to the target, which the Vite 7.3.1 docs warn "can leave the proxying open to CSRF attacks," and is unnecessary because `:3000` is already in the allowlist. Confirmed against the version-matched Vite 7.3.1 `server.proxy` docs retrieved via Context7.
- **Alternatives considered:** `rewriteWsOrigin: true` — rejected (CSRF caveat + unnecessary given the allowlist).

---

## Testing Considerations

### Automatic Validation

This Task introduces no new automated tests (see Design Decision 4; all Finding-1 test coverage is Task 3). The automatic checks are **regression guards** that must stay green after the four edits land together:

- [x] `npm --prefix project/srcs/frontend run typecheck` — 0 errors (the `useChatSocket.ts` and `vite.config.ts` changes are TS-typed; `window.location` is available in jsdom).
- [x] `npm --prefix project/srcs/frontend run test -- --run` — full suite green, expected **185/185 across 33 files** (current baseline after Employee Chat Task 7). The `-- --run` flag makes Vitest run once and exit (without it Vitest enters watch mode and blocks). Specifically `useChatSocket.test.ts` (7 tests) stays green: Test 7 asserts `/ws/chat/99` + `?token=test-jwt-token`, both hold under the new page-location URL (jsdom `window.location.host` = `localhost`).
- [x] `npm --prefix project/srcs/frontend run build` — Vite build succeeds (no new deps; bundle size unchanged modulo whitespace).
- [x] ESLint on the two touched frontend files — run **from `project/srcs/frontend/`** (the eslint config + `node_modules` live there): `npx eslint src/features/chat/hooks/useChatSocket.ts vite.config.ts` — 0 errors.
- [ ] Backend WS security tests — the `mvnw` wrapper lives in `project/srcs/backend/`, so run **from that directory**: `./mvnw test -Dtest=ChatWebSocketSecurityTest` — **5/5 green**. The broaden to the 5-origin allowlist does NOT break these tests because they use `StandardWebSocketClient` with no `Origin` header (Spring skips the origin check when `Origin` is absent — `known-issues.md`). Tests: no-token 401, invalid-token 401, admin-token 403, employee-token 200 (chunk+done frames), service-throws error frame.
- [ ] Backend full regression — from `project/srcs/backend/`: `./mvnw test` — green modulo the pre-existing `authServerApplicationTests.contextLoads` smoke test (no `@ActiveProfiles("test")`, tries real datasource — unrelated to this Task; `known-issues.md`). **Note:** the local Maven `target/` is root-owned when built inside Docker (`known-issues.md`); if local `./mvnw` fails on `target/classes/application-test.properties` permission, run the suite via the Docker container (`docker compose exec backend ./mvnw test` or rebuild), or `sudo chown -R $USER project/srcs/backend/target` once. nginx/Vite config files have no unit test; they are validated by the manual Validation below.

### Manual Validation

These require a running compose stack + a browser and **must be performed by the user** — do not execute them on the user's behalf (per the parent's Validation Strategy rule).

- [ ] `docker compose up --build` (nginx reloads the new `nginx.conf` on container rebuild). Log in as employee (`flor` / `ROLE_EMPLOYEE`), open `/chat` (page origin `http://localhost`). Confirm in the browser devtools Network tab: the WS upgrade to `ws://localhost/ws/chat/{id}?token=…` returns **`101 Switching Protocols`** and there is **no** `403 Invalid CORS request` on the handshake.
- [ ] Send a message; confirm the assistant bubble appears and streams word-by-word — no inline "WebSocket connection error." bubble.
- [ ] Under HTTPS (nginx `:443`, accept the self-signed cert `BHT.crt`), open `/chat` and confirm the WS URL uses `wss://localhost/ws/chat/{id}?token=…` and the handshake succeeds (`101` in the Network tab) — verifies the `wss:` derivation path from Step 1.3.
- [ ] Direct-Vite dev path: `npm --prefix project/srcs/frontend run dev`, open `http://localhost:3000/chat` (the stack's backend still on `:8080`), log in as employee, send a message — confirm `101` on `ws://localhost:3000/ws/chat/{id}?token=…` (the Vite `/ws` proxy forwards it). Verifies Step 1.2.
- [ ] Verify nginx access logs do **not** contain the `?token=…` value: `docker compose exec nginx tail -f /var/log/nginx/access.log` (or the configured log path) while sending a message — the `/ws/` requests should either not appear (`access_log off;`) or, if a global access log otherwise captures them, must not include the JWT query string. (Confirms Step 1.1's `access_log off;`.)
- [ ] Refresh mid-turn / open `/chat/:conversationId` directly — confirm history restores and no WS cross-origin rejection (regression of the conversation-restore path).

**Rule:** Run the automatic checks whenever possible. The manual steps require a real browser + running compose stack; document the results there — do not execute them yourself.

---

## Related Code Explanations

- [[Employee-Chat-Interface-task-5-use-chat-socket-hook]] — the task that created `useChatSocket` (the deep-module hook whose only line this Task changes at line 40). Documents the WS-lifecycle invariants (single-use per turn, unmount-only `wsRef` cleanup, streaming-retained-after-done) that this Task preserves unchanged.
- `project/srcs/frontend/src/features/chat/hooks/useChatSocket.ts:40` — the URL line; the only behavioral change in this Task.
- `project/srcs/backend/src/main/java/com/BHT/models/chat/WebSocketConfig.java:25` — the allowlist line; the load-bearing gate this Task makes explicit.
- `project/srcs/nginx/conf/nginx.conf:1-4,30-33` — the existing `map $http_upgrade $connection_upgrade` and HMR Upgrade/Connection headers that the new `/ws/` block mirrors.
- `documentation/Memory/known-issues.md` (WebSocket sharp edges) — the no-`Origin`-header ⇒ origin-check-skipped behavior that keeps `ChatWebSocketSecurityTest` green after the broaden; the JWT-`?token=` and `UriTemplate.match(.getPath())` invariants that this Task preserves.

---

## Completion Criteria

- [x] Parent Bug Report [[Employee-Chat-WebSocket-Origin-Rejected-AppSettings-403]] reviewed and reflected accurately (Finding 1, Option B, Steps 1.1–1.4).
- [x] Relevant skills reviewed and selected (`documentation-management`, `solid-deep-design`, `memory-bank`, `find-docs`, `tdd`; `glossary-management`/`doc-exploration` evaluated).
- [x] Up-to-date, version-matched documentation reviewed (Vite 7.3.1 `server.proxy` WS; Spring Boot 3.4.1 `setAllowedOrigins`; nginx WS proxy).
- [x] `project/srcs/nginx/conf/nginx.conf` — `limit_conn_zone` + `location /ws/` block added (Step 1.1).
- [x] `project/srcs/frontend/vite.config.ts` — `/ws` proxy entry added (Step 1.2).
- [x] `project/srcs/frontend/src/features/chat/hooks/useChatSocket.ts` — hardcoded URL replaced with page-location-derived URL (Step 1.3).
- [x] `project/srcs/backend/src/main/java/com/BHT/models/chat/WebSocketConfig.java` — `setAllowedOrigins(...)` broadened to the explicit 5-origin set (Step 1.4).
- [x] `documentation/Docs/API-Reference/WebSocket-Chat.md` — routing/dev-topology note updated (Step 1.5).
- [x] All four routing edits land together (no half-applied window where the WS is neither cross-origin-allowed nor same-origin).
- [ ] Automatic validation passes: `npm run typecheck` 0 errors; `npm run test -- --run` 185/185 across 33 files (incl. `useChatSocket.test.ts` 7/7); `npm run build` succeeds; `npx eslint` (run from `project/srcs/frontend/`) on the two touched frontend files clean; `ChatWebSocketSecurityTest` 5/5 green (run from `project/srcs/backend/` via `./mvnw`) (+ backend regression green modulo the pre-existing contextLoads smoke test).
- [ ] Manual validation steps documented for the user (running compose stack + browser; not executed on the user's behalf).
- [ ] Parent Bug Report Phase 1 Steps 1.1, 1.2, 1.3, 1.4 marked `[x]` upon execution; the Task document's wiki link wired into the parent Task Breakdown ("Task Document Link").

## Post-Review Notes

**Backend test suite execution blocked by environment:** the local Maven `target/` directory is root-owned (a pre-existing artifact of a Docker volume build, recorded in `documentation/Memory/known-issues.md`), and the current user cannot chown it without sudo, nor access the Docker socket (`docker compose exec` returns `permission denied` on `/var/run/docker.sock`). The task spec anticipated this — both workarounds (Docker exec, `sudo chown -R $USER target`) are out of reach. **Compensating verification:** the backend source compiles cleanly with the known-issues.md `javac` workaround (fresh outdir at `/tmp/kilo/backend-out`; `WebSocketConfig.class` produced, 0 errors, only standard javac notes). The frontend test suite — which is the regression net the task explicitly relies on for the `useChatSocket` URL change — is green (185/185). The `ChatWebSocketSecurityTest` 5/5 expectation remains logically certain: per `known-issues.md` ("Spring WebSocket skips origin check when no Origin header is present"), the broaden to the 5-origin set is unreachable from those tests (they use `new WebSocketHttpHeaders()` with no `Origin`); the change is therefore trivially non-breaking for them. Marked the backend test checkboxes as unchecked so the user can re-run via Docker when the socket is accessible.