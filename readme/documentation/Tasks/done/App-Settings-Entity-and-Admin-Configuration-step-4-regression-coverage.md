# Task: Regression and Supplemental Coverage for AppSettings

#task #current #low-complexity #parent-app-settings-entity-and-admin-configuration

**Parent:** [[App-Settings-Entity-and-Admin-Configuration]]
**Parent Type:** Feature
**Related Step(s):** Phase 4 — Step 4.1
**Estimated Complexity:** Low

---

## Goal

Run the full test suite against the 601-test baseline to confirm no regressions after Tasks 1-3, then close five genuine coverage gaps identified by reviewing the AppSettings test suite.

---

## Parent Context

The parent feature designates Task 4 as the final regression sweep and supplemental coverage pass. The parent mandates running the full test suite and adding any edge-case tests discovered during implementation, specifically naming examples such as `updatedAt` null on initial GET before first PATCH, masking boundary at exactly 8 characters, and concurrent PATCH safety.

Tasks 1-3 are fully implemented and all tests pass:
- **Task 1** — Security baseline: `/app-settings/**` gated as `hasRole("ADMIN")` in `SecurityConfig`; 6 tests in `SecurityAuthorizationTest`.
- **Task 2** — Domain foundation: `AppSettingsEntity`, `AppSettingsForm`, `AppSettingsDTO`, `AppSettingsMapper` (with API key masking), `AppSettingsRepository` (`findFirstBy()`), `AppSettingsBootstrap`; 6 repository tests + 12 mapper tests.
- **Task 3** — Business rules, service, and controller: `AppSettingsService` (3 methods: `getSettings()`, `updateSettings()`, `getRawApiKey()`), `AppSettingsController` (`GET /app-settings`, `PATCH /app-settings`), 2 assertion updates in `SecurityAuthorizationTest`, 15 service integration tests, 8 controller tests.

The parent's 507-test baseline referenced in Step 4.1 was inaccurate at execution time (actual baseline before Task 1 was 512); the real current baseline after Tasks 1-3 is **601 total tests** (301 unique × 2 surefire runs − 1 pre-existing error for `authServerApplicationTests.contextLoads`, which requires Docker Compose PostgreSQL).

The parent examples cited for this task (masking boundary at 8 chars, `updatedAt` null path) are already covered: `toDTO_shortKeyUpToEightCharsMasksEntirely` in `AppSettingsMapperTest`, `toDTO_nullUpdatedAtMapsNullWithoutNpe` in `AppSettingsMapperTest`, and `preUpdateSetsUpdatedAtOnEntityUpdate` in `AppSettingsRepositoryTest` all cover these. Concurrent PATCH safety is not testable at the JUnit/Spring Boot Test level. This task instead targets five genuine gaps in the existing test suite identified by audit.

---

## Preconditions / Dependencies

- Tasks 1, 2, and 3 are fully implemented and all tests pass.
- Current test baseline: **601 total tests** (301 unique × 2 surefire runs − 1 pre-existing Docker error), 0 failures.
- All AppSettings production code compiles: `AppSettingsEntity`, `AppSettingsForm`, `AppSettingsDTO`, `AppSettingsMapper`, `AppSettingsRepository`, `AppSettingsBootstrap`, `AppSettingsService`, `AppSettingsController`.
- All four AppSettings test files exist in `backend/src/test/java/com/agentForgeBackend/models/appSettings/`.
- H2 in-memory database configured for tests via `application-test.properties`.
- `TestAuthenticationHelper` available with real JWT support for admin and employee tokens.
- `AppSettingsBootstrap` seeds the singleton row at `@SpringBootTest` context startup — the row always exists in service and controller tests.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — Selected — task template, directory placement, naming convention.
- `solid-deep-design` — Selected — supplemental tests add no new modules; they exercise existing module interfaces. Confirmed that each test targets the public interface of the class under test, not internals. No new production dependencies introduced.
- `tdd` — Selected — each new test verifies one observable behavior through the public interface. Tests survive internal refactors because they assert outputs, not implementation.
- `memory-bank` — Selected — confirmed 601-test baseline and all domain types from Tasks 1-3.
- `glossary-management` — Not needed — no new domain terms.
- `find-docs` — Not needed — all test patterns (Spring Data JPA `@DataJpaTest`, `@SpringBootTest`, MockMvc, `@WithMockUser`, `assertThat`, `Hamcrest` matchers) are established in this codebase and have direct prior art in existing AppSettings test files from Tasks 1-3. No version-specific API uncertainties.

### Documentation Reviewed

- `documentation/Features/to-do/App-Settings-Entity-and-Admin-Configuration.md` — Phase 4, Step 4.1 definition and parent context.
- `documentation/Tasks/current/App-Settings-Entity-and-Admin-Configuration-step-3-service-and-controller.md` — Tasks 1-3 final state; all existing test method names confirmed.
- `backend/src/test/java/com/agentForgeBackend/models/appSettings/AppSettingsRepositoryTest.java` — 6 existing tests; confirms no string-field round-trip test exists.
- `backend/src/test/java/com/agentForgeBackend/models/appSettings/AppSettingsServiceIntegrationTest.java` — 15 existing tests; confirms `getRawApiKey()` null-key path and combined-field update are untested.
- `backend/src/test/java/com/agentForgeBackend/models/appSettings/AppSettingsControllerTest.java` — 8 existing tests; confirms `employeePatchToAppSettingsReturns403` and `getAppSettingsWithNoKeyConfiguredReturns200WithNullKey` are absent.

### Related Existing Code

- `backend/src/test/java/com/agentForgeBackend/models/appSettings/AppSettingsRepositoryTest.java` — 1 new test added here
- `backend/src/test/java/com/agentForgeBackend/models/appSettings/AppSettingsServiceIntegrationTest.java` — 2 new tests added here
- `backend/src/test/java/com/agentForgeBackend/models/appSettings/AppSettingsControllerTest.java` — 2 new tests added here
- `backend/src/main/java/com/agentForgeBackend/models/appSettings/AppSettingsService.java:202-206` — `getRawApiKey()` null-key path uses `Optional.map()` which returns `Optional.empty()` when key is null; `.orElse(null)` returns null.
- `backend/src/main/java/com/agentForgeBackend/models/appSettings/AppSettingsMapper.java` — masking logic confirmed: `maskApiKey(null) → null`, `maskApiKey("sk-or-v1-combined-update-key") → "****-key"` (28 chars, last 4 = "-key").

---

## Implementation Details

### Approach

No production code is created or modified. Three existing test files receive targeted additions: one test to `AppSettingsRepositoryTest`, two tests to `AppSettingsServiceIntegrationTest`, two tests to `AppSettingsControllerTest`. The regression check (Step 1) runs first to confirm the 601-test baseline is clean before adding anything. The supplemental tests (Step 2) are then added and verified individually before the final full-suite run (Step 3).

### Coverage Gaps Identified

The following five behaviors are untested after Tasks 1-3:

| # | File | Missing test | Why it matters |
|---|------|-------------|---------------|
| 1 | `AppSettingsRepositoryTest` | `openRouterApiKey` string field persists and reloads correctly | All 6 existing repo tests verify null saves, FK saves, and `@PreUpdate` — no test exercises `openRouterApiKey` as a persisted string column. A column mapping error (wrong name, wrong type) would be invisible without this test. |
| 2 | `AppSettingsServiceIntegrationTest` | `getRawApiKey()` returns `null` when key not configured | Only the happy path (key exists) is tested. The `Optional.map()` chain silently returns null when key is null — critical behavior for future `OpenRouterService` null-checking. |
| 3 | `AppSettingsServiceIntegrationTest` | Both `openRouterApiKey` and `defaultModelId` updated in a single request | All `updateSettings()` tests update one field at a time. The combined path (non-blank key + non-null modelId in the same form) exercises both update branches concurrently and confirms neither branch interferes with the other. |
| 4 | `AppSettingsControllerTest` | Employee `PATCH /app-settings` → 403 | `employeeGetToAppSettingsReturns403` exists but the equivalent PATCH test is absent. SecurityAuthorizationTest covers this at the HTTP filter level; the controller test suite should symmetrically cover both methods. |
| 5 | `AppSettingsControllerTest` | `GET /app-settings` with no key configured → 200, `null openRouterApiKey` in body | The existing GET test always seeds a key first. GET without a key exercises the mapper's null-key path through the full HTTP stack and verifies the JSON response serializes `null` correctly. |

### Why the parent's examples are already covered

The parent's Step 4.1 suggests checking `updatedAt` null on initial GET, masking boundary at exactly 8 characters, and concurrent PATCH safety:

- **`updatedAt` null on initial GET** — Covered by `toDTO_nullUpdatedAtMapsNullWithoutNpe` (mapper unit test) and `preUpdateSetsUpdatedAtOnEntityUpdate` (repository test verifies `updatedAt` is null before first UPDATE). The service-level test cannot easily exercise this because `@BeforeEach`'s `saveAndFlush` triggers `@PreUpdate`, setting `updatedAt` non-null in every test's start state. The mapper test provides sufficient coverage.
- **Masking boundary at exactly 8 characters** — Covered by `toDTO_shortKeyUpToEightCharsMasksEntirely` in `AppSettingsMapperTest`.
- **Concurrent PATCH safety** — Not practically testable in standard JUnit/Spring integration tests; the singleton invariant relies on the PK uniqueness constraint, which is enforced by the database.

### SOLID analysis

No production module is modified. The five new tests are additions to existing test classes. Each test targets the public interface of its subject:
- Repository test calls repository methods and asserts persisted state.
- Service tests call `appSettingsService` public methods and assert return values.
- Controller tests call HTTP endpoints via MockMvc and assert response status + JSON body.

No test reaches into private methods or internal state; all tests would survive internal refactors.

### Files to Create/Modify

- [x] `backend/src/test/java/com/agentForgeBackend/models/appSettings/AppSettingsRepositoryTest.java` — **MODIFY** — add 1 test: `savesAndLoadsOpenRouterApiKey`
- [x] `backend/src/test/java/com/agentForgeBackend/models/appSettings/AppSettingsServiceIntegrationTest.java` — **MODIFY** — add 2 tests: `getRawApiKeyReturnsNullWhenKeyNotConfigured`, `updateSettingsWithBothKeyAndDefaultModelIdUpdatesInSingleRequest`
- [x] `backend/src/test/java/com/agentForgeBackend/models/appSettings/AppSettingsControllerTest.java` — **MODIFY** — add 2 tests: `employeePatchToAppSettingsReturns403`, `getAppSettingsWithNoKeyConfiguredReturns200WithNullKey`

---

## Step-by-Step Implementation

### Step 1: Run Full Regression Check (Baseline Verification)

**Goal:** Confirm the 601-test baseline is clean before adding any tests. If any test fails here, investigate and fix before proceeding.

**Dependencies:** Tasks 1-3 fully implemented with no pending changes.

- [x] From `backend/`: run `./mvnw test`
- [x] Confirm total test count = 601 (301 unique × 2 surefire runs − 1 pre-existing Docker error)
- [x] Confirm 0 failures
- [x] Confirm `authServerApplicationTests.contextLoads` is the only error (pre-existing; requires Docker Compose PostgreSQL which is not running during `./mvnw test`)
- [x] If any unexpected failure occurs, investigate before proceeding to Step 2

**Why this step is critical:** This task adds tests-only. If a failure exists in the baseline, it must be diagnosed before attributing it to any supplemental test addition.

#### Edge Cases

1. **`authServerApplicationTests.contextLoads` error** — Pre-existing. This test requires a live PostgreSQL instance at `db:5432` (Docker Compose). Without Docker running, the Spring application context fails to load. This is expected and documented in `known-issues.md`. Do not attempt to fix it.

2. **Test isolation** — If any test fails unexpectedly (not the pre-existing Docker error), run the failing test class individually with `./mvnw test -Dtest=<ClassName>` to isolate the failure before diagnosing.

---

### Step 2: Add Supplemental Tests

**Goal:** Add 5 tests across 3 existing test files to close the identified coverage gaps.

**Dependencies:** Step 1 baseline confirmed clean.

- [x] Add `savesAndLoadsOpenRouterApiKey` to `AppSettingsRepositoryTest`
- [x] Run `./mvnw test -Dtest=AppSettingsRepositoryTest` — confirm 7/7 pass
- [x] Add `getRawApiKeyReturnsNullWhenKeyNotConfigured` and `updateSettingsWithBothKeyAndDefaultModelIdUpdatesInSingleRequest` to `AppSettingsServiceIntegrationTest`
- [x] Run `./mvnw test -Dtest=AppSettingsServiceIntegrationTest` — confirm 17/17 pass
- [x] Add `employeePatchToAppSettingsReturns403` and `getAppSettingsWithNoKeyConfiguredReturns200WithNullKey` to `AppSettingsControllerTest`
- [x] Run `./mvnw test -Dtest=AppSettingsControllerTest` — confirm 10/10 pass

**Why this step is critical:** Running each test class immediately after modification catches configuration errors early, before the final full-suite run.

#### Test 1 — `AppSettingsRepositoryTest.savesAndLoadsOpenRouterApiKey`

Append after `findFirstByReturnsEmptyWhenTableIsEmpty`, before the class closing `}`.

```java
@Test
void savesAndLoadsOpenRouterApiKey() {
    AppSettingsEntity entity = new AppSettingsEntity();
    entity.setOpenRouterApiKey("sk-or-v1-test-api-key-xyz");
    AppSettingsEntity saved = appSettingsRepository.saveAndFlush(entity);
    entityManager.clear();

    AppSettingsEntity loaded = appSettingsRepository.findById(saved.getId()).orElseThrow();
    assertEquals("sk-or-v1-test-api-key-xyz", loaded.getOpenRouterApiKey());
}
```

**What it verifies:** The `open_router_api_key` column mapping is correct (`@Column(name = "open_router_api_key")`), the field persists the string without truncation or transformation, and the value survives a persistence context clear + reload.

**No new imports needed** — `assertEquals` is already imported via `import static org.junit.jupiter.api.Assertions.*;` in the existing class.

---

#### Test 2 — `AppSettingsServiceIntegrationTest.getRawApiKeyReturnsNullWhenKeyNotConfigured`

Append after `getRawApiKeyReturnsUnmaskedKey`, before the `// --- Access control ---` comment block.

```java
@Test
void getRawApiKeyReturnsNullWhenKeyNotConfigured() {
    // @BeforeEach clears openRouterApiKey to null via saveAndFlush
    String rawKey = appSettingsService.getRawApiKey();

    assertThat(rawKey).isNull();
}
```

**What it verifies:** `getRawApiKey()` calls `findFirstBy().map(AppSettingsEntity::getOpenRouterApiKey).orElse(null)`. When the entity exists but `openRouterApiKey` is null, `Optional.map()` returns `Optional.empty()` (because the mapping function returned null), and `.orElse(null)` returns null. The `@BeforeEach` reset already sets `openRouterApiKey` to null via `saveAndFlush`, so no additional setup is needed.

**No new imports needed** — `assertThat` is already imported via `import static org.assertj.core.api.Assertions.*;`.

---

#### Test 3 — `AppSettingsServiceIntegrationTest.updateSettingsWithBothKeyAndDefaultModelIdUpdatesInSingleRequest`

Append after `updateSettingsWithNullDefaultModelIdClearsFk`, before `updateSettingsWithNonExistentDefaultModelIdThrowsItemNotFoundException`.

```java
@Test
void updateSettingsWithBothKeyAndDefaultModelIdUpdatesInSingleRequest() throws Exception {
    LlmModelEntity model = new LlmModelEntity();
    model.setModelId("openai/gpt-4o-mini");
    model.setName("GPT-4o Mini");
    LlmModelEntity saved = llmModelRepository.saveAndFlush(model);

    AppSettingsForm form = new AppSettingsForm();
    form.setOpenRouterApiKey("sk-or-v1-combined-update-key");
    form.setDefaultModelId(saved.getId());

    AppSettingsDTO result = appSettingsService.updateSettings(form);

    assertThat(result.getOpenRouterApiKey()).isEqualTo("****-key");
    assertThat(result.getDefaultModel()).isNotNull();
    assertThat(result.getDefaultModel().getModelId()).isEqualTo("openai/gpt-4o-mini");
    assertThat(result.getUpdatedByUsername()).isEqualTo("admin@test.com");
}
```

**What it verifies:** Both the API key branch (`form.getOpenRouterApiKey() != null && !isBlank()`) and the `defaultModelId` branch (`form.getDefaultModelId() != null`) execute in the same `updateSettings()` call. Key `"sk-or-v1-combined-update-key"` is 28 characters; last 4 = `"-key"`; masked form = `"****-key"`. `updatedBy` is also set, confirming the full `updateSettings()` flow completes when both fields are provided.

**Masking verification:** `"sk-or-v1-combined-update-key"`.length() = 28 > 8. `substring(28 - 4)` = `substring(24)` = `"-key"`. Masked: `"****-key"`. ✓

**No new imports needed** — all symbols already imported in the class.

---

#### Test 4 — `AppSettingsControllerTest.employeePatchToAppSettingsReturns403`

Append after `employeeGetToAppSettingsReturns403`, before the class closing `}`.

```java
@Test
void employeePatchToAppSettingsReturns403() throws Exception {
    mockMvc.perform(patch("/app-settings")
                    .header("Authorization", authHelper.getEmployeeToken())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{}"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error").value("Forbidden"));
}
```

**What it verifies:** `PATCH /app-settings` with an employee JWT triggers the `/app-settings/**` `hasRole("ADMIN")` security rule in `SecurityConfig`, returns HTTP 403, and includes `{"error":"Forbidden"}` in the body via `GlobalExceptionHandler`. This completes the symmetric coverage of both HTTP methods for the employee-forbidden case in the controller test suite.

**No new imports needed** — `patch`, `status`, `jsonPath`, `MediaType`, `authHelper.getEmployeeToken()` are all already used in the class.

---

#### Test 5 — `AppSettingsControllerTest.getAppSettingsWithNoKeyConfiguredReturns200WithNullKey`

Append after `getAppSettingsWithAdminTokenReturns200WithMaskedKey`, before `patchAppSettingsWithNewApiKeyReturns200WithMaskedKey`.

```java
@Test
void getAppSettingsWithNoKeyConfiguredReturns200WithNullKey() throws Exception {
    // @BeforeEach clears openRouterApiKey to null via saveAndFlush
    mockMvc.perform(get("/app-settings")
                    .header("Authorization", authHelper.getAdminToken()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").isNumber())
            .andExpect(jsonPath("$.openRouterApiKey").value(nullValue()))
            .andExpect(jsonPath("$.defaultModel").value(nullValue()));
}
```

**What it verifies:** `GET /app-settings` returns HTTP 200 when `openRouterApiKey` is null (not configured). The JSON response includes the `openRouterApiKey` key with a null value (not missing — Jackson serializes null fields as `null` since there is no `@JsonInclude(NON_NULL)` on `AppSettingsDTO`). `defaultModel` is also null because `@BeforeEach` clears it. The `id` field is present and a number (non-null singleton row from `AppSettingsBootstrap`).

**Note on `updatedAt`:** `@BeforeEach` calls `saveAndFlush` with null fields, which triggers `@PreUpdate`, setting `updatedAt` to a non-null timestamp. This test does NOT assert `updatedAt` — asserting `updatedAt` is null here would be incorrect given the `@BeforeEach` behavior.

**`nullValue()` import:** `import static org.hamcrest.Matchers.*;` is already present in `AppSettingsControllerTest` (it covers `nullValue()`, `containsString()`, etc.).

---

### Step 3: Run Full Test Suite with Supplemental Tests

**Goal:** Confirm all 5 new tests pass and the 601-test baseline is unaffected.

**Dependencies:** Step 2 complete — all 5 tests added.

- [x] From `backend/`: run `./mvnw test`
- [x] Confirm total test count = 611 (306 unique × 2 surefire runs − 1 pre-existing Docker error)
- [x] Confirm 0 failures
- [x] Confirm `authServerApplicationTests.contextLoads` is the only error (pre-existing Docker blocker — not caused by this task)
- [x] If any unexpected failure occurs, run the failing class individually and fix before marking complete

**Expected test count breakdown after Task 4:**
- `AppSettingsRepositoryTest`: 6 → 7 tests (+1)
- `AppSettingsServiceIntegrationTest`: 15 → 17 tests (+2)
- `AppSettingsControllerTest`: 8 → 10 tests (+2)
- All other test classes: unchanged
- New unique total: 301 + 5 = 306 unique tests
- Expected surefire total: 306 × 2 − 1 = 611

#### Edge Cases

1. **`authServerApplicationTests` count** — The pre-existing Docker error contributes 1 error to the total, not a test failure. Total = 611 includes this error count. If Docker Compose is running, this error disappears and total would be 612.

2. **`getRawApiKeyReturnsNullWhenKeyNotConfigured` — `@BeforeEach` side effect** — `@BeforeEach` calls `saveAndFlush` with null key, which triggers `@PreUpdate` and sets `updatedAt` to a non-null timestamp. This is the expected test start state. `getRawApiKey()` reads `openRouterApiKey` only — the `updatedAt` side effect does not affect the test.

3. **`updateSettingsWithBothKeyAndDefaultModelIdUpdatesInSingleRequest` — LlmModel cleanup** — The `@BeforeEach` calls `llmModelRepository.deleteAll()` before each test, so the `LlmModelEntity` seeded in this test is cleaned up between tests. The `@BeforeEach` also clears `app_settings.default_model_id` to null before deleting LlmModels, so there's no FK constraint violation.

4. **`getAppSettingsWithNoKeyConfiguredReturns200WithNullKey` — no key seeded** — The test body seeds nothing. The `@BeforeEach` left the settings row with `openRouterApiKey = null`. The `GET` request returns the entity via `getSettings()` → `mapper.toDTO()` → `maskApiKey(null)` → null in DTO → `"openRouterApiKey": null` in JSON. Jackson serializes this as the key present with null value (no `@JsonInclude(NON_NULL)` on `AppSettingsDTO`). `nullValue()` matcher verifies this.

---

## Design Decisions

**Decision 1: Add tests to existing files, not new test classes**
- **Why:** All five gaps belong to behaviors already covered by the respective test class — they are missing test methods, not missing test classes. Adding new test classes for single tests would fragment coverage into low-signal files. Each existing test class has the correct `@DataJpaTest` / `@SpringBootTest` setup and import context for the new tests.
- **Alternatives considered:** A standalone `AppSettingsEdgeCaseTest` class. Rejected — one file per three concerns adds fragmentation without value.

**Decision 2: Test 2 (`getRawApiKeyReturnsNullWhenKeyNotConfigured`) relies on `@BeforeEach` state without explicit setup**
- **Why:** The `@BeforeEach` already sets `openRouterApiKey` to null. Calling `saveAndFlush` again to explicitly set null would be redundant and noisy. Relying on `@BeforeEach` state is idiomatic in this test class (see `getSettingsReturnsDTOWithNullKeyWhenNotConfigured` which does the same).
- **Alternatives considered:** Explicit `appSettingsRepository.findFirstBy().ifPresent(s -> { s.setOpenRouterApiKey(null); appSettingsRepository.saveAndFlush(s); });` in the test body. Rejected — redundant with `@BeforeEach`; adds noise without added clarity.

**Decision 3: Test 3 inserted between `updateSettingsWithNullDefaultModelIdClearsFk` and `updateSettingsWithNonExistentDefaultModelIdThrowsItemNotFoundException`**
- **Why:** Test 3 (`updateSettingsWithBothKeyAndDefaultModelIdUpdatesInSingleRequest`) is a happy-path combined update, logically grouped with the other FK happy-path tests (setting and clearing). Inserting it between the FK-clear test and the FK-validation-failure tests maintains the thematic ordering of the existing test suite.
- **Alternatives considered:** Appending at the end of the happy-path block. Either position is functionally equivalent; insertion in the middle is slightly more readable.

**Decision 4: Test 5 (`getAppSettingsWithNoKeyConfiguredReturns200WithNullKey`) inserted before the first PATCH test**
- **Why:** The test verifies GET behavior with null state — placing it first in the GET-focused group (before PATCH tests) mirrors the feature's endpoint ordering and makes the GET suite's coverage contiguous.
- **Alternatives considered:** Appending at the end of all tests. Rejected — breaks the GET/PATCH grouping of the existing suite.

---

## Testing Considerations

### Automatic Validation

- [x] From `backend/`: run `./mvnw test` — confirm 601 total tests, 0 failures before Step 2 (baseline regression check)
- [x] From `backend/`: run `./mvnw test -Dtest=AppSettingsRepositoryTest` — confirm 7/7 pass after adding Test 1
- [x] From `backend/`: run `./mvnw test -Dtest=AppSettingsServiceIntegrationTest` — confirm 17/17 pass after adding Tests 2 and 3
- [x] From `backend/`: run `./mvnw test -Dtest=AppSettingsControllerTest` — confirm 10/10 pass after adding Tests 4 and 5
- [x] From `backend/`: run `./mvnw test` — confirm 611 total tests (306 unique × 2 surefire runs − 1 pre-existing Docker error), 0 failures

### Manual Validation

No manual validation required. This task adds only test code; no HTTP surface is changed and no UI exists.

---

## Related Code Explanations

- `backend/src/main/java/com/agentForgeBackend/models/appSettings/AppSettingsService.java:71-75` — `getRawApiKey()`: `findFirstBy().map(AppSettingsEntity::getOpenRouterApiKey).orElse(null)` — when `openRouterApiKey` is null, `Optional.map(f)` returns `Optional.empty()` (null-returning mapper function), `.orElse(null)` returns null. <!-- REVIEW-FIX: corrected line reference from :201-206 (wrong — file is ~76 lines) to :71-75 (verified) -->
- `backend/src/main/java/com/agentForgeBackend/models/appSettings/AppSettingsMapper.java:32-36` — `maskApiKey()`: null → null, length ≤ 8 → `"****"`, length > 8 → `"****" + last 4 chars`. <!-- REVIEW-FIX: corrected line reference from :20-22 to :32-36 (verified) -->
- `backend/src/test/java/com/agentForgeBackend/models/appSettings/AppSettingsRepositoryTest.java` — existing 6 tests; Test 1 appended at end of class body.
- `backend/src/test/java/com/agentForgeBackend/models/appSettings/AppSettingsServiceIntegrationTest.java` — existing 15 tests; Tests 2 and 3 inserted in the `getRawApiKey` and `defaultModel FK rules` sections respectively.
- `backend/src/test/java/com/agentForgeBackend/models/appSettings/AppSettingsControllerTest.java` — existing 8 tests; Tests 4 and 5 inserted after corresponding existing tests.

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected for this task
- [x] Baseline regression check passes: 601 tests, 0 failures (Step 1)
- [x] `AppSettingsRepositoryTest.savesAndLoadsOpenRouterApiKey` added — verifies `openRouterApiKey` string column round-trip
- [x] `AppSettingsServiceIntegrationTest.getRawApiKeyReturnsNullWhenKeyNotConfigured` added — verifies null-key path returns null
- [x] `AppSettingsServiceIntegrationTest.updateSettingsWithBothKeyAndDefaultModelIdUpdatesInSingleRequest` added — verifies combined update
- [x] `AppSettingsControllerTest.employeePatchToAppSettingsReturns403` added — closes asymmetric employee access coverage gap
- [x] `AppSettingsControllerTest.getAppSettingsWithNoKeyConfiguredReturns200WithNullKey` added — verifies null-key GET response
- [x] From `backend/`: `./mvnw test -Dtest=AppSettingsRepositoryTest` — 7/7 pass
- [x] From `backend/`: `./mvnw test -Dtest=AppSettingsServiceIntegrationTest` — 17/17 pass
- [x] From `backend/`: `./mvnw test -Dtest=AppSettingsControllerTest` — 10/10 pass
- [x] From `backend/`: `./mvnw test` — 611 total tests, 0 failures, 1 pre-existing Docker error only
- [x] No production code files created or modified
- [ ] Parent feature Step 4.1 ready to be marked complete after execution
