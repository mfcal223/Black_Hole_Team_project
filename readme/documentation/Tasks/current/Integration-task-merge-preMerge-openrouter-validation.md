# Task: Merge preMerge into local main, configure OpenRouter integration, and validate full test suite

#task #current #high-complexity #standalone-task

**Parent:** No parent
**Parent Type:** Standalone
**Related Step(s):** N/A
**Estimated Complexity:** High

---

## Goal

Merge the integrated `preMerge` branch into local `main`, wire the local `OPENROUTER_API_KEY` from `.env` into the application bootstrap so AI-dependent flows can run without manual UI setup, document the OpenRouter setup and model alternatives, then run the full automated and manual validation suite until zero failures remain.

---

## Parent Context

This is a standalone integration and validation task. The caller provided the following context directly:

- `main` (local) is expected to be up to date with remote `main`.
- `preMerge` (local + remote) contains the already-integrated work from `gsanin-m` (Token Usage Dashboard) and `isramire` (Conversation History List and Delete), plus updated documentation.
- A valid `OPENROUTER_API_KEY` is already present in the local `project/.env` file and must be used for any OpenRouter-dependent validation. The real key value must never be printed, logged, committed, pasted into documentation, or included in any task/review output.
- The end-to-end chat flow depends on OpenRouter, so the key must be honored by the backend before manual validation begins.
- The colleague mentioned `nvidia/nemotron-*` models as viable options, but other OpenRouter models should also be documented as alternatives.

The task covers: (1) merging `preMerge` into `main`, (2) verifying/configuring how the OpenRouter API key is consumed, (3) documenting the OpenRouter setup and model options, (4) running the full automated test suite, (5) performing manual end-to-end testing of AI-dependent flows, (6) fixing any failures, and (7) final verification.

---

## Preconditions / Dependencies

- [ ] Local clone has `main` and `origin/preMerge` available. Run `git fetch --all` first if needed.
- [ ] Working directory is `/home/transcendence/BHT/project`; git repository root is `/home/transcendence/BHT`. All `git` commands must be run from the repository root or with `git -C /home/transcendence/BHT`.
- [ ] `project/.env` should contain a real `OPENROUTER_API_KEY=<real-key>` value. If it does not, add it as part of Step 8.3. Do **not** edit, commit, or expose this value.
- [ ] `project/.env` is gitignored (confirmed by `.gitignore` in both `main` and `origin/preMerge`).
- [ ] Java 21 and Maven 3.9+ are available for the backend build/tests.
- [ ] Node.js/npm toolchain matching `project/srcs/frontend/package-lock.json` (lockfileVersion 3) is available.
- [ ] Docker and `docker compose` are available for the full-stack manual validation.
- [ ] `documentation/Tasks/current/` exists (project documentation is initialized).
- [ ] **Note:** `documentation/Memory/` is missing and the `glossary` CLI is not installed in this environment. Project context is inferred from the existing codebase, ADRs, and task/feature documents.

---

## Skills and Documentation Preparation

### Skills Reviewed

| Skill | Status | Reason |
|-------|--------|--------|
| `documentation-management` | Selected | Task is created in `documentation/Tasks/current/` using the standard Task template. |
| `solid-deep-design` | Selected | Governs the merge workflow, API-key source-of-truth decision, and clean integration with existing ADRs. |
| `find-docs` | Unavailable | `ctx7` CLI is not installed. Version-matched project dependency information is read directly from `project/srcs/backend/pom.xml` and `project/srcs/frontend/package.json`. OpenRouter setup steps are documented from the official OpenRouter quickstart/FAQ fetched via web. |
| `memory-bank` | Unavailable | `documentation/Memory/` does not exist. Project context is inferred from the existing codebase, ADRs, and task/feature documents. |
| `tdd` | Selected | Defines the test-first verification strategy for the merge and OpenRouter configuration. |
| `glossary-management` | Unavailable | `glossary` CLI is not installed. Standard project terminology from existing ADRs and docs is used. |

### Documentation Reviewed

- **Git `git-merge` documentation** (official, version-agnostic) — confirms that `git merge --no-ff --no-commit <branch>` stages a merge without committing, allowing inspection before the merge commit; `git merge --abort` reconstructs the pre-merge state if needed.
- **`project/srcs/backend/pom.xml`** — Spring Boot 3.4.1, Java 21, QueryDSL 6.12, Mockito 5.14.2, Surefire 3.2.5, `spring-boot-starter-webflux` (provides `WebClient`).
- **`project/srcs/frontend/package.json`** — React 19.2.4, React Router 6.30.3, Vite 7.3.1, Vitest 4.1.9, axios 1.18.0.
- **`project/models.json`** — local OpenRouter model catalog snapshot (339 models) used to identify viable model alternatives.
- **OpenRouter quickstart / FAQ** (fetched 2026-07-01) — confirms API key authentication via `Authorization: Bearer <OPENROUTER_API_KEY>`, account/credit requirements, free `:free` model variants, and rate-limit basics.
- **Project ADRs:**
  - [[ADRs/ADR-001-single-llm-provider-openrouter|ADR-001]] — OpenRouter is the single LLM provider for the MVP.
  - [[ADRs/ADR-002-openrouter-as-service-not-entity|ADR-002]] — OpenRouter is a Spring service, not a JPA entity; the API key lives in `AppSettingsEntity` and is read at call time.
  - [[ADRs/ADR-007-admin-curated-llm-model-list|ADR-007]] — Only admin-enabled `LlmModelEntity` rows are forwarded to OpenRouter.
- **Existing Task/Feature docs:**
  - [[Features/done/OpenRouter-Chat-Integration|OpenRouter Chat Integration]] — backend WebSocket + OpenRouter architecture.
  - [[Features/done/Admin-LLM-Model-Catalog-Page|Admin LLM Model Catalog Page]] — frontend model catalog UI.
  - [[Tasks/current/Branch-Integration-task-merge-gsanin-m-and-isramire|Branch Integration: merge gsanin-m and isramire]] — parent integration plan whose result is now in `preMerge`.

### Related Existing Code

- `project/srcs/backend/src/main/java/com/BHT/models/chat/openrouter/OpenRouterService.java` — HTTP adapter to OpenRouter; reads API key via `AppSettingsService.getRawApiKey()`.
- `project/srcs/backend/src/main/java/com/BHT/models/appSettings/AppSettingsService.java` — singleton settings service; `getRawApiKey()` returns the DB-stored key.
- `project/srcs/backend/src/main/java/com/BHT/models/appSettings/AppSettingsEntity.java` — stores `openRouterApiKey`.
- `project/srcs/backend/src/main/java/com/BHT/configuration/boostrap/AppSettingsBootstrap.java` — seeds the singleton `AppSettingsEntity` on first startup.
- `project/srcs/backend/src/main/resources/application.properties` — Spring configuration; `file.signature.secret` and `TK_KEY` already read from `${JWT_SECRET}`.
- `project/srcs/backend/src/main/java/com/BHT/models/chat/ChatTurnService.java` — orchestrates chat turns and calls `OpenRouterService.streamChat()`.
- `project/srcs/frontend/src/features/app-settings/` — admin UI for API key and model management.
- `project/srcs/frontend/src/features/chat/` — employee chat UI and WebSocket client.
- `project/.env.example` — current example file (does not yet document `OPENROUTER_API_KEY`).
- `project/.gitignore` — already excludes `.env` and `.env.*` while allowing `.env.example` and `.env.template`.

---

## Implementation Details

### Approach

1. **Merge workflow:** Create a short-lived integration branch from `main`, merge `origin/preMerge` into it, resolve any conflicts on the integration/`main` side, clean up structural artifacts if needed, and fast-forward `main` once verified.
2. **OpenRouter API key wiring:** The runtime source of truth remains `AppSettingsEntity.openRouterApiKey` per ADR-002. To honor the local `.env` key without changing the architecture, add an optional `OPENROUTER_API_KEY` Spring property and modify `AppSettingsBootstrap` to seed the DB row with the environment key when the row is created and no key is already present. This keeps `OpenRouterService` unchanged and preserves the admin UI's ability to rotate the key at runtime.
3. **Documentation:** Update `project/.env.example` with an `OPENROUTER_API_KEY` placeholder (no real value). Add a project doc (`documentation/Docs/devops/OpenRouter-Setup.md`) describing how to generate an OpenRouter key and listing viable model alternatives (Nemotron + 3+ others) with tradeoffs. Update the README/setup docs if one exists.
4. **Validation:** Run backend tests, frontend tests/type-check/lint/build, then start the full Docker stack and perform manual end-to-end chat validation using the local `.env` key.

### Files to Create/Modify

- [ ] `documentation/Tasks/current/Integration-task-merge-preMerge-openrouter-validation.md` — this Task document.
- [ ] `project/.env.example` — add `OPENROUTER_API_KEY` placeholder and comment.
- [ ] `project/srcs/backend/src/main/resources/application.properties` — add optional `openrouter.api.key=${OPENROUTER_API_KEY:}` property.
- [ ] `project/srcs/backend/src/main/java/com/BHT/configuration/boostrap/AppSettingsBootstrap.java` — seed `openRouterApiKey` from the new property when creating the singleton row.
- [ ] `documentation/Docs/devops/OpenRouter-Setup.md` — new doc: key generation steps + model alternatives table.
- [ ] `documentation/Docs/API-Reference/_Index.md` — add link to the new OpenRouter Setup doc if appropriate.
- [ ] `project/srcs/backend/src/test/java/com/BHT/configuration/boostrap/AppSettingsBootstrapTest.java` — new test verifying bootstrap seeding behavior (optional but recommended).

---

## Step-by-Step Implementation

### Step 1: Prepare the workspace and record branch tips

**Goal:** Ensure the repository is clean and branch tips are recorded for later verification.
**Dependencies:** None.

- [ ] Run from the repository root:

```bash
cd /home/transcendence/BHT
git fetch --all
git status --short
```

- [ ] Save the current tip SHAs:

```bash
MAIN_SHA=$(git rev-parse main)
PREMERGE_SHA=$(git rev-parse origin/preMerge)
echo "main=$MAIN_SHA preMerge=$PREMERGE_SHA"
```

- [ ] If there are overlapping local changes, stash or commit them before continuing.

**Why this step is critical:** A dirty worktree can make `git merge --abort` unreliable and can leak unrelated changes into the merge commit.

#### Edge Cases

1. **Untracked files overlap with branch files** — move them aside before merging. The local `project/.env` is gitignored and safe.
2. **`origin/preMerge` is behind expectations** — fetch first; do not proceed with stale remote tips.

---

### Step 2: Create the integration branch from main

**Goal:** Isolate merge work from `main` until it is fully verified.
**Dependencies:** Step 1 complete.

```bash
git checkout -b integration/preMerge-to-main main
```

- [ ] Confirm HEAD is the integration branch and points to the same commit as `main`.

**Why this step is critical:** It lets the team inspect the merged state before moving `main` forward and makes rollback trivial.

---

### Step 3: Merge `origin/preMerge` into the integration branch

**Goal:** Bring the integrated `gsanin-m` + `isramire` work into the integration branch.
**Dependencies:** Step 2 complete.

```bash
git merge --no-ff --no-commit origin/preMerge
```

- [ ] If the merge stops with conflicts, list them with:

```bash
git diff --name-only --diff-filter=U
```

- [ ] Resolve each conflict on the integration branch (the `main` side) without editing `origin/preMerge`.
- [ ] Pay special attention to `project/srcs/backend/src/main/java/com/BHT/models/chat/openrouter/OpenRouterService.java`: `main` currently has a reverted SSE parser (no `stream_options`, conditional `data:` stripping), while `origin/preMerge` has the stricter fix (`stream_options.include_usage=true`, reject lines not starting with `data:`). Prefer the `origin/preMerge` version because it correctly requests usage metadata and matches the original OpenRouter Chat Integration design.
- [ ] After resolving, stage the files.

**Why this step is critical:** `preMerge` contains the integrated feature code and docs. A `--no-commit` merge lets us inspect and clean the result before recording it.

#### Edge Cases

1. **Merge conflict in `project/srcs/frontend/package-lock.json`** — keep the version that includes `recharts`; run `npm install` in Step 6 to regenerate.
2. **Merge conflict in documentation files** — both branches add distinct documents; preserve both and update cross-links as needed.
3. **True source-code conflict outside OpenRouterService** — resolve on the integration branch, preserving both features' behaviors.

---

### Step 4: Verify and clean structural artifacts

**Goal:** Ensure the merged tree contains only the canonical project structure.
**Dependencies:** Step 3 complete.

- [ ] Verify the canonical source tree is `project/srcs/` and that no duplicate `srcs/` directory exists at the repository root:

```bash
git ls-files | grep '^srcs/' | wc -l
# Expected: 0
```

- [ ] Verify no stray log files (e.g., `front_logs.txt`, `backend-log.txt`) or tracked files inside `documentation/Memory/` were introduced by the merge:

```bash
git ls-files | grep -E '^(front_logs\.txt|backend-log\.txt|documentation/Memory/)' || echo "OK"
```

- [ ] If any such artifacts are present, remove them on the integration branch with `git rm -f <path>`.

**Why this step is critical:** `preMerge` was built from an integration branch that may have carried temporary artifacts. These must not reach `main`.

---

### Step 5: Commit the merge

**Goal:** Record the merge on the integration branch.
**Dependencies:** Step 4 complete.

```bash
git commit -m "Merge branch 'preMerge' into integration/preMerge-to-main"
```

- [ ] Verify the merge commit has two parents: `git log --oneline -1 --merges`.
- [ ] Verify `origin/preMerge` tip SHA is unchanged: `git rev-parse origin/preMerge` equals `$PREMERGE_SHA`.

---

### Step 6: Install frontend dependencies and run a build check

**Goal:** Catch dependency/type/build issues early.
**Dependencies:** Step 5 complete.

```bash
cd project/srcs/frontend
npm ci
npm run typecheck
npm run lint
npm run build
```

- [ ] If `npm ci` fails because `package-lock.json` is out of sync, run `npm install` once, inspect the diff, and commit the updated lockfile if it only adds expected transitive dependencies.
- [ ] If lint/type/build fails, fix the issue on the integration branch.

**Why this step is critical:** `preMerge` adds `recharts` and new TypeScript code. Verifying it before running tests makes regressions obvious.

---

### Step 7: Run backend automated tests

**Goal:** Confirm the merged backend code passes the existing test suite.
**Dependencies:** Step 5 complete.

```bash
cd project/srcs/backend
./mvnw -q clean test
./mvnw -q clean package -DskipTests
```

- [ ] All tests should pass and the JAR/WAR package should build successfully.
- [ ] If a failure is related to the merged code, debug and fix on the integration branch.

**Why this step is critical:** The backend now includes Token Usage ledger writes inside `MessageService` and the Conversation History endpoints; existing chat/message tests must still pass.

---

### Step 8: Add environment-based OpenRouter API key bootstrap

**Goal:** Wire the local `OPENROUTER_API_KEY` from `.env` into the application without changing the runtime architecture.
**Dependencies:** Step 7 complete (or at least the backend builds).

#### 8.1 Add the Spring property

In `project/srcs/backend/src/main/resources/application.properties`, add:

```properties
# OpenRouter API key (optional fallback used to seed AppSettings on first startup)
openrouter.api.key=${OPENROUTER_API_KEY:}
```

This declares an optional property that defaults to empty when the env var is absent.

#### 8.2 Modify the bootstrap

In `project/srcs/backend/src/main/java/com/BHT/configuration/boostrap/AppSettingsBootstrap.java`:

```java
package com.BHT.configuration.boostrap;

import com.BHT.models.appSettings.AppSettingsEntity;
import com.BHT.models.appSettings.AppSettingsRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class AppSettingsBootstrap implements CommandLineRunner {

    private final AppSettingsRepository appSettingsRepository;
    private final String openRouterApiKey;

    public AppSettingsBootstrap(
            AppSettingsRepository appSettingsRepository,
            @Value("${openrouter.api.key:}") String openRouterApiKey
    ) {
        this.appSettingsRepository = appSettingsRepository;
        this.openRouterApiKey = openRouterApiKey;
    }

    @Override
    public void run(String... args) {
        appSettingsRepository.findFirstBy().orElseGet(() -> {
            AppSettingsEntity settings = new AppSettingsEntity();
            if (StringUtils.hasText(openRouterApiKey)) {
                settings.setOpenRouterApiKey(openRouterApiKey);
            }
            return appSettingsRepository.save(settings);
        });
    }
}
```

**Security note:** The injected value must never be logged or returned in any DTO. Only `AppSettingsService.getRawApiKey()` should expose it internally to `OpenRouterService`.

#### 8.3 Verify `.env.example` and the local `.env`

In `project/.env.example`, add a new section after the SECURITY block:

```properties
# --- OPENROUTER INTEGRATION ---
# Required for LLM chat and model catalog browsing.
# Get your key at https://openrouter.ai/settings/keys (create account + add credits first).
# NEVER commit the real value; copy this file to .env and fill it in locally.
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

- [ ] Confirm `project/.gitignore` excludes real env files but allows the example. The expected lines are already present:
  ```gitignore
  .env
  .env.*
  !.env.example
  !.env.template
  ```
- [ ] Confirm the real `project/.env` has `OPENROUTER_API_KEY=<real-key>`. If the variable is missing, add it now by copying the placeholder line from `.env.example` and replacing `your_openrouter_api_key_here` with the real key. Never commit this change.

**Why this step is critical:** The backend's `OpenRouterService` reads the key from `AppSettingsEntity`. Without seeding, a fresh database container would have an empty key and every chat attempt would fail with `OpenRouterConfigException`. Seeding from `.env` lets Dockerized manual testing start immediately while preserving ADR-002's DB-as-source-of-truth design.

#### Edge Cases

1. **DB already has an `app_settings` row with a key** — the bootstrap does nothing; the existing DB key wins. This preserves admin UI key rotations.
2. **`.env` key is blank or missing** — the bootstrap creates the row with a null key; behavior matches the pre-change state.
3. **Test profile** — `application-test.properties` does not need `openrouter.api.key`; tests that need a key provide it via mocks or direct repository saves.

---

### Step 9: Write the OpenRouter setup and model alternatives documentation

**Goal:** Provide a teammate-facing guide for generating a key and choosing models.
**Dependencies:** Step 8 complete.

Create `documentation/Docs/devops/OpenRouter-Setup.md` with the following content (no real key values):

```markdown
# OpenRouter Setup

AgentForge uses [OpenRouter](https://openrouter.ai) as its single LLM provider (ADR-001). This document explains how to generate an API key and choose models for the platform.

## Generating an OpenRouter API key

1. Create an account at https://openrouter.ai/signup.
2. Add credits at https://openrouter.ai/settings/credits (required for paid models; free models have strict rate limits).
3. Go to **Settings > API Keys** (https://openrouter.ai/settings/keys).
4. Click **Create Key**, give it a descriptive name (e.g., `AgentForge Local`), and copy the value.
5. Paste the value into your local `project/.env` as `OPENROUTER_API_KEY=<copied-key>`.
6. Restart the backend container (or the Spring Boot app) so the bootstrap seeds the key on first startup.

> **Security:** Never commit the key. `.gitignore` already excludes `.env` and `.env.*` except `.env.example` and `.env.template`.

## Model selection

Only models explicitly enabled by an admin in **App Settings > System Models** are available to employees (ADR-007). You can browse the full catalog in **App Settings > Add Models** or at https://openrouter.ai/models.

### Recommended starter models

| Model ID | Provider | Context window | Approx. prompt cost | Approx. completion cost | Free tier? | Notes |
|----------|----------|---------------|---------------------|-------------------------|------------|-------|
| `nvidia/llama-3.3-nemotron-super-49b-v1.5` | NVIDIA | 131,072 | $0.40 / 1M | $0.40 / 1M | No | Good balance of quality, latency, and cost; colleague-recommended. |
| `openai/gpt-4o-2024-11-20` | OpenAI | 128,000 | $2.50 / 1M | $10.00 / 1M | No | Strong general-purpose frontier model; higher cost. |
| `anthropic/claude-sonnet-4-6` | Anthropic | 1,000,000 | $3.00 / 1M | $15.00 / 1M | No | Large context window; excellent for long documents. |
| `google/gemini-3.5-flash` | Google | 1,048,576 | $1.50 / 1M | $9.00 / 1M | No | Very large context; cost-effective for high-volume use. |
| `meta-llama/llama-3.3-70b-instruct:free` | Meta | 131,072 | Free | Free | Yes | Useful for local development and smoke tests; low rate limits. |
| `nvidia/nemotron-3-nano-30b-a3b:free` | NVIDIA | 256,000 | Free | Free | Yes | Another free Nemotron option for development. |

Costs are approximate and based on the `project/models.json` snapshot; OpenRouter passes through provider pricing, so check https://openrouter.ai/models for live rates.

### Choosing for production vs. development

- **Development / CI smoke tests:** Use a `:free` model to avoid charges. Be aware of rate limits (roughly tens of requests per day for un-credited accounts, higher for credited accounts).
- **Production-like evaluation:** Use `nvidia/llama-3.3-nemotron-super-49b-v1.5` or `openai/gpt-4o-2024-11-20` for reliable output quality.
- **Long-context workflows:** Prefer `anthropic/claude-sonnet-4.6` or `google/gemini-3.5-flash` for inputs approaching hundreds of thousands of tokens.
```

- [ ] Update `documentation/Docs/API-Reference/_Index.md` to link to the new doc under a "DevOps / Setup" section if one exists.

**Why this step is critical:** Future teammates need self-service instructions that never include a real key value.

---

### Step 10: Add bootstrap unit test (optional but recommended)

**Goal:** Verify that the bootstrap seeds the key from the environment only when appropriate.
**Dependencies:** Step 8 complete.

Create `project/srcs/backend/src/test/java/com/BHT/configuration/boostrap/AppSettingsBootstrapTest.java`:

```java
package com.BHT.configuration.boostrap;

import com.BHT.models.appSettings.AppSettingsEntity;
import com.BHT.models.appSettings.AppSettingsRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@TestPropertySource(properties = "openrouter.api.key=env-test-key")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class AppSettingsBootstrapTest {

    @Autowired
    private AppSettingsRepository appSettingsRepository;

    @Test
    void seedsOpenRouterApiKeyFromEnvironmentWhenRowIsCreated() {
        AppSettingsEntity settings = appSettingsRepository.findFirstBy().orElseThrow();
        assertThat(settings.getOpenRouterApiKey()).isEqualTo("env-test-key");
    }
}
```

Also add a second test class in the same package to verify that an empty env value leaves the key null:

```java
package com.BHT.configuration.boostrap;

import com.BHT.models.appSettings.AppSettingsEntity;
import com.BHT.models.appSettings.AppSettingsRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@TestPropertySource(properties = "openrouter.api.key=")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class AppSettingsBootstrapNoKeyTest {

    @Autowired
    private AppSettingsRepository appSettingsRepository;

    @Test
    void leavesOpenRouterApiKeyNullWhenEnvironmentValueIsEmpty() {
        AppSettingsEntity settings = appSettingsRepository.findFirstBy().orElseThrow();
        assertThat(settings.getOpenRouterApiKey()).isNull();
    }
}
```

- [ ] Run the new tests:

```bash
cd project/srcs/backend
./mvnw -q test -Dtest=AppSettingsBootstrapTest,AppSettingsBootstrapNoKeyTest
```

**Why this step is critical:** Automated coverage prevents future refactors from accidentally breaking the env-to-DB seeding path.

---

### Step 11: Promote the integration branch to `main`

**Goal:** Move `main` forward to the verified integration commit.
**Dependencies:** Steps 6, 7, and 10 complete.

```bash
git checkout main
git merge --ff-only integration/preMerge-to-main
```

- [ ] Verify `main` now points to the integration tip: `git log --oneline -3`.
- [ ] Delete the integration branch if desired:

```bash
git branch -d integration/preMerge-to-main
```

**Why this step is critical:** This keeps `main` linear and avoids an extra merge commit beyond the preMerge merge.

#### Edge Cases

1. **`main` has moved since Step 1** — `git merge --ff-only` will fail. Recreate the integration branch on the new `main` tip and re-run merges/verification.

---

## Edge Cases

| Step | Case | Handling |
|------|------|----------|
| 1 | `main` has local changes | Stash or commit them before merging. |
| 3 | True merge conflict in source code | Resolve on the integration branch; prefer the `origin/preMerge` version for `OpenRouterService.java` because it contains the correct `stream_options` fix. |
| 3 | Merge conflict in `package-lock.json` | Accept the version with `recharts`, then run `npm install` and commit the regenerated lockfile. |
| 4 | Tracked duplicate `srcs/` directory appears | `git rm -rf srcs/` on the integration branch. |
| 4 | Tracked `documentation/Memory/brief.md` appears | `git rm -f documentation/Memory/brief.md` on the integration branch. |
| 6 | `npm ci` fails due to lockfile mismatch | Run `npm install`, inspect the diff, and commit if only expected dependencies changed. |
| 7 | Maven tests fail after merge | Debug on the integration branch; do not edit `origin/preMerge`. |
| 8 | DB row already exists with a different key | Bootstrap is skipped; existing DB key wins. To force re-seeding, run `make bk-entity-refresh` or manually update the key via the admin UI. |
| 8 | Real key accidentally pasted into task output | Never paste the key. If it happens, rotate the key immediately via OpenRouter settings. |
| 10 | Bootstrap test fails on H2 | Ensure `application-test.properties` is active and no conflicting `app_settings` seed data exists. |

---

## Design Decisions

### Decision 1: Merge `preMerge` via a temporary integration branch, then fast-forward `main`
- **Why:** Keeps `main` protected until the full verification suite passes. Provides a clear rollback path:
  - Before the merge commit: `git merge --abort`.
  - After a bad merge commit on the integration branch: abandon or reset the integration branch.
  - After promoting to `main`: `git checkout main; git reset --keep $MAIN_SHA` (only if the fast-forward has not been pushed).
- **Alternatives considered:** Merge directly into `main` — rejected because it would expose `main` to partially resolved conflicts and broken builds.

### Decision 2: Keep `AppSettingsEntity` as the runtime source of truth for the OpenRouter key
- **Why:** ADR-002 explicitly decided that the API key lives in `AppSettingsEntity` and is read at call time. Preserving this avoids architectural drift and keeps the admin UI key-rotation feature working.
- **Alternatives considered:** Modify `OpenRouterService` to read directly from `process.env.OPENROUTER_API_KEY` — rejected because it creates a second source of truth, violates ADR-002, and would ignore admin UI updates.

### Decision 3: Seed the DB key from `OPENROUTER_API_KEY` in `AppSettingsBootstrap`
- **Why:** It honors the local `.env` key automatically on fresh database startup while keeping the runtime read path (`OpenRouterService → AppSettingsService.getRawApiKey()`) unchanged. The DB key wins once set, so admin UI rotations are still authoritative.
- **Alternatives considered:**
  - Make `AppSettingsService.getRawApiKey()` fallback to env if DB key is null — rejected because it makes the source of truth ambiguous and complicates testing.
  - Replace DB storage entirely with env var — rejected because it removes the admin UI configuration surface.

### Decision 4: Prefer the `origin/preMerge` version of `OpenRouterService.java`
- **Why:** `main` currently contains a reverted version (commit `d78a0dd`) that removes `stream_options.include_usage` and relaxes the SSE parser. `origin/preMerge` restores the original, stricter implementation that correctly requests usage metadata. Keeping the stricter version aligns with the OpenRouter Chat Integration feature design and ensures token usage is captured.
- **Alternatives considered:** Keep the `main` version — rejected because it would lose usage metadata and re-introduce the empty-assistant-response bug that the original fix addressed.

### Decision 5: Document model alternatives with data from `project/models.json` plus live OpenRouter docs
- **Why:** The local snapshot provides stable cost/context-window figures; the live docs link provides current pricing. Combining both gives teammates actionable guidance without requiring live API calls.
- **Alternatives considered:** Hardcoding a single recommended model — rejected because model availability, pricing, and rate limits change; a table with alternatives is more maintainable.

---

## Testing Considerations

### Automatic Validation

- [ ] Record branch tip SHAs before the merge:
  ```bash
  cd /home/transcendence/BHT
  test "$(git rev-parse main)" = "$MAIN_SHA"
  test "$(git rev-parse origin/preMerge)" = "$PREMERGE_SHA"
  ```
- [ ] Run backend tests after the merge (before bootstrap changes):
  ```bash
  cd project/srcs/backend
  ./mvnw -q clean test
  ./mvnw -q clean package -DskipTests
  ```
- [ ] Run backend tests after the bootstrap change:
  ```bash
  ./mvnw -q test -Dtest=AppSettingsBootstrapTest
  ./mvnw -q test
  ```
- [ ] Run frontend unit tests:
  ```bash
  cd project/srcs/frontend
  npm run test -- --run
  ```
- [ ] Run frontend type check:
  ```bash
  npm run typecheck
  ```
- [ ] Run frontend lint:
  ```bash
  npm run lint
  ```
- [ ] Run frontend production build:
  ```bash
  npm run build
  ```
- [ ] Verify no tracked files remain under root `srcs/`:
  ```bash
  cd /home/transcendence/BHT
  test "$(git ls-files | grep '^srcs/' | wc -l)" -eq 0
  ```
- [ ] Verify the diff from original `main` to new `main` contains only intended changes:
  ```bash
  git diff --name-only $MAIN_SHA..main | grep -E '^(srcs/|front_logs\.txt|documentation/Memory/)' && echo "UNEXPECTED FILES" || echo "OK"
  ```
- [ ] Verify `origin/preMerge` is untouched:
  ```bash
  test "$(git rev-parse origin/preMerge)" = "$PREMERGE_SHA"
  ```

### Manual Validation

- [ ] Build and start the full Docker stack with the local `.env` so the bootstrap change is included in the backend image:
  ```bash
  cd /home/transcendence/BHT/project
  make
  ```
  If the stack is already running from an older image, stop it first with `make down`, then run `make`.
- [ ] Confirm the backend starts without schema/bean errors and the bootstrap seeds the key from `.env` (check that the first chat works; do not inspect the key value in logs).
- [ ] Log in as an admin, navigate to `/app-settings`, and confirm the three tabs render (General Settings, System Models, Add Models).
- [ ] In **Add Models**, add at least one model (e.g., `nvidia/llama-3.3-nemotron-super-49b-v1.5` or a `:free` model), then enable it in **System Models**.
- [ ] Log in as an employee, navigate to `/chat`, select the enabled model, and send a message. Confirm the assistant response streams word-by-word and completes without errors.
- [ ] Verify the conversation appears in `/conversations` with the correct model and timestamp.
- [ ] Navigate to `/token-usage` as an admin and confirm the dashboard loads with chart controls (if data exists).
- [ ] Open the browser's developer tools and confirm no 401/403/500 errors for chat, conversation, or token-usage endpoints.
- [ ] Verify the sidebar shows "Token Usage" only for admin users and "Conversations" only for employee users.

**Rule:** Run automatic checks when possible. Manual checks above require a running browser session and real OpenRouter calls; they cannot be reliably automated within the project's current test setup.

---

## Related Code Explanations

- `documentation/Docs/API-Reference/AppSettings.md` — API contract for settings and the masked API key.
- `documentation/Features/done/OpenRouter-Chat-Integration.md` — backend WebSocket + OpenRouter architecture.
- `documentation/Features/done/Admin-LLM-Model-Catalog-Page.md` — frontend model catalog UI.
- `project/srcs/backend/src/main/java/com/BHT/models/chat/openrouter/OpenRouterService.java` — OpenRouter HTTP adapter.
- `project/srcs/backend/src/main/java/com/BHT/models/appSettings/AppSettingsService.java` — runtime source of truth for the API key.
- `project/srcs/backend/src/main/java/com/BHT/configuration/boostrap/AppSettingsBootstrap.java` — seeding point for the env-to-DB key fallback.
- `project/srcs/frontend/src/features/app-settings/` — admin UI for API key and model management.
- `project/srcs/frontend/src/features/chat/` — employee chat UI and WebSocket client.
- `documentation/Tasks/current/Branch-Integration-task-merge-gsanin-m-and-isramire.md` — prior integration plan whose result is now in `preMerge`.

---

## Completion Criteria

- [ ] Workspace clean and branch SHAs recorded.
- [ ] Integration branch `integration/preMerge-to-main` created from `main`.
- [ ] `origin/preMerge` merged into the integration branch without modifying `origin/preMerge`.
- [ ] All merge conflicts resolved on the integration branch; `OpenRouterService.java` uses the stricter `origin/preMerge` version.
- [ ] Structural artifacts (duplicate `srcs/`, tracked logs, tracked `documentation/Memory/` files) removed from the integration branch.
- [ ] Merge committed.
- [ ] `project/srcs/backend/src/main/resources/application.properties` includes `openrouter.api.key=${OPENROUTER_API_KEY:}`.
- [ ] `AppSettingsBootstrap` seeds `openRouterApiKey` from the environment when creating the singleton row.
- [ ] `project/.env.example` documents `OPENROUTER_API_KEY` with no real value.
- [ ] `documentation/Docs/devops/OpenRouter-Setup.md` created with key-generation steps and model alternatives table.
- [ ] Backend tests pass (`./mvnw -q clean test`).
- [ ] Backend package builds (`./mvnw -q clean package -DskipTests`).
- [ ] Frontend type check, lint, tests, and build pass.
- [ ] `main` fast-forwarded to the verified integration tip.
- [ ] `origin/preMerge` tip SHA verified unchanged.
- [ ] Manual end-to-end chat test passes using the local `.env` key.
- [ ] No real API key value committed, logged, printed, or pasted into documentation.
- [ ] No push to remote performed without explicit user approval.
