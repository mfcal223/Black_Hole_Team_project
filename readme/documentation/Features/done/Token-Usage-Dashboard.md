#high #new-feature

## Feature: Token Usage Dashboard

### Description

Build an admin-only Token Usage Dashboard that visualizes platform-wide LLM token consumption over time. The backend aggregates token counts by configurable time intervals (hour or minute) using database-level truncation from an independent, append-only `TokenUsageEntry` ledger, and the frontend renders the result as a time-series chart. The ledger is written when assistant messages are persisted, survives message/conversation deletion, plugs into the established Spring Security role model, and follows the frontend's feature-based folder pattern.

## Problem Statement

Administrators currently have no visibility into how many tokens the platform consumes over time. Token counts are stored per message but are not aggregated, so admins cannot spot usage spikes, plan capacity, or audit consumption trends.

## User Stories

1. As an Admin, I want to see a chart of total token usage over time, so that I can monitor platform consumption trends.
2. As an Admin, I want to choose the aggregation interval (hour or minute), so that I can zoom in or out of the data.
3. As an Admin, I want to specify a time range for the chart, so that I can investigate usage during a specific period.
4. As an Admin, I want the endpoint to be restricted to users with the `ADMIN` role, so that usage data remains confidential.
5. As an Admin, I want the chart to load from the same API pattern used by other admin pages, so that the UI behaves consistently.
6. As a Developer, I want aggregation to happen in the database, so that the backend remains fast even as the message table grows.
7. As a Developer, I want the frontend to follow the existing feature-based structure, so that the code is easy to maintain and test.
8. As a Developer, I want the backend query expressed in JPQL, so that it stays close to the JPA model while still using database-level date truncation.
9. As a Tester, I want to verify the time-series response in the Docker Compose logs, so that I can confirm the backend returns the expected data shape.
10. As a Developer, I want the chart rendered with `recharts`, so that the visualization is consistent with the project's planned charting library.

## Solution

Expose a new admin-only REST endpoint `/admin/token-usage` that returns a list of `{ timestamp, totalTokens }` objects aggregated from the `TokenUsageEntry` ledger. The endpoint accepts `from`, `to`, and optional `interval` query parameters. A dedicated `TokenUsageController` delegates to a `TokenUsageService` secured with `@PreAuthorize("hasRole('ADMIN')")`. The service validates inputs and calls a repository method that uses JPQL with `FUNCTION('DATE_TRUNC', ...)` to push aggregation to PostgreSQL.

The ledger is populated inside `MessageService.appendAssistantMessage`, immediately after `messageRepository.save(message)` returns, using `conversation.getEmployee().getId()` as the employee ID. This keeps the aggregation independent of `MessageEntity`/`ConversationEntity` lifecycles.

On the frontend, add a new `tokenUsage` feature under `src/features/tokenUsage/` with types, service, hook, chart, and controls. Create `TokenUsagePage` to compose them, register `/token-usage` as an admin-only route, and add it to the sidebar. Render the data with `recharts`.

For the complete end-to-end implementation details, see [[Code/TokenUsageDashboard|TokenUsage Dashboard integration]].

### Scope

- Backend: new `TokenUsageEntry` entity and write-side repository, new controller, service, read-side aggregation repository contract, and response DTO for token-usage aggregation; ledger write inside `MessageService.appendAssistantMessage`.
- Frontend: new feature folder, page component, route, sidebar entry, and chart dependency.
- Infrastructure: add `recharts` to `package.json`; a new `token_usage_entry` table is created by the JPA entity.

### Affected Systems / Modules

- [[Backend-Architecture]] — introduces a new `metrics` package with a read-only analytics controller/service/repository; security follows the existing `@PreAuthorize` pattern.
- [[Backend-Model-Anatomy]] — adds a new independent ledger entity and extends the generic CRUD pattern with a read-only analytics slice.
- [[Login_and_authentication_explained]] — relies on the existing JWT flow and `apiClient` for authenticated requests.
- `srcs/frontend/src/router.tsx` — adds the `/token-usage` admin route.
- `srcs/frontend/src/layouts/Sidebar.tsx` — adds the Token Usage navigation item.
- `srcs/frontend/package.json` — adds `recharts` dependency.
- `srcs/backend/src/main/resources/application-test.properties` — left unchanged; a profile-scoped native-query fallback provides H2 compatibility without modifying the global test profile mode.

### Impact Analysis

- Adds a read-only analytics endpoint that does not mutate existing entities.
- The only existing production code change is inside `MessageService.appendAssistantMessage`; all other CRUD endpoints remain unchanged.
- The query is read-only and aggregated at the database, so frontend payload stays small even for large token tables.
- The first use of `FUNCTION('DATE_TRUNC', ...)` in JPQL; if the project later migrates databases, the function call may need adjustment. A profile-scoped native fallback keeps tests independent of this dialect detail.

### Risk Assessment

- **H2 test compatibility:** `DATE_TRUNC` is PostgreSQL-native. The test profile uses H2 in MySQL mode, which does not support `DATE_TRUNC`. This risk is mitigated by a profile-scoped native-query fallback (`TokenUsageRepositoryTest`) without changing the global H2 mode.
- **Large table scans:** Without a time-range filter, the query would scan the entire `token_usage_entry` table. The endpoint requires `from`/`to` parameters to bound the scan.
- **Null tokens:** `TokenUsageEntry` stores non-null `Long` values; the query uses `COALESCE` to treat nulls as zero for defense in depth.
- **Timezone handling:** `created_at` is stored as `LocalDateTime` without explicit timezone. Timestamps returned to the frontend are in the server's local time; document this assumption.

---

## Implementation Architecture

### Changes Required

#### 1. `TokenUsageController`
**Purpose:** Admin-only REST facade for the `/admin/token-usage` endpoint.
**Changes:** Create `srcs/backend/src/main/java/com/BHT/models/metrics/TokenUsageController.java` with `@RestController @RequestMapping("/admin/token-usage")`. Expose `GET /admin/token-usage?from=...&to=...&interval=hour|minute` and delegate to `TokenUsageService`.
**Links:** [[Backend-Architecture]]

#### 2. `TokenUsageService`
**Purpose:** Encapsulate aggregation logic and enforce admin authorization.
**Changes:** Create `srcs/backend/src/main/java/com/BHT/models/metrics/TokenUsageService.java` as a `@Service`. Annotate the aggregation method with `@PreAuthorize("hasRole('ADMIN')")`. Validate `from`/`to`, normalize the interval default, and call the repository.
**Links:** [[Backend-Architecture]]

#### 3. `TokenUsageEntry` ledger and repositories
**Purpose:** Persist token usage independently of messages so history survives deletion.
**Changes:**
- Create `TokenUsageEntry` entity with `employeeId`, `inputTokens`, `outputTokens`, `createdAt`, and optional `sourceMessageId`.
- Create `TokenUsageEntryRepository` for ledger writes.
- Create `TokenUsageRepository` as a repository contract with `aggregateTokenUsage(from, to, interval)`.
- Provide `TokenUsageRepositoryProduction` (JPQL with `FUNCTION('DATE_TRUNC', ...)` using whitelisted literals) for the default profile and `TokenUsageRepositoryTest` (H2-native fallback) for the `test` profile.

**Links:** [[Backend-Model-Anatomy]]

#### 4. `TokenUsagePoint` DTO
**Purpose:** Carry a single timestamp/total pair from the repository to the response.
**Changes:** Create a small immutable record/DTO with `timestamp` and `totalTokens`.

#### 5. Frontend `tokenUsage` feature
**Purpose:** Fetch and render the time-series data.
**Changes:** Create `srcs/frontend/src/features/tokenUsage/` with:
- `types.ts` — `TokenUsagePoint`, `TokenUsageInterval`.
- `services/tokenUsageService.ts` — `getTokenUsage(from, to, interval)` using `api.get('/admin/token-usage', { params })`.
- `hooks/useTokenUsage.ts` — load state, error handling, and range/interval controls.
- `components/TokenUsageChart.tsx` — `recharts` line/area chart.
- `components/TokenUsageControls.tsx` — interval selector and date/time range inputs.

**Links:** [[Login_and_authentication_explained]]

#### 6. Page, route, and navigation
**Purpose:** Surface the dashboard in the admin UI.
**Changes:**
- Create `srcs/frontend/src/pages/TokenUsagePage.tsx` that composes the feature components.
- Register `/token-usage` in `srcs/frontend/src/router.tsx` inside the existing admin-only route group.
- Add a "Token Usage" item to `srcs/frontend/src/layouts/Sidebar.tsx` for admins.

#### 7. Dependency and proxy
**Purpose:** Enable chart rendering and keep API routing consistent.
**Changes:** Add `recharts` to `srcs/frontend/package.json`. No proxy change is needed because `/api` is already proxied to the backend.

---

## Implementation Steps

### Phase 1: Backend aggregation endpoint
- [x] **Step 1.1:** Create `TokenUsageEntry` entity and write-side repository under `com.BHT.models.metrics`.
- [x] **Step 1.2:** Create `TokenUsagePoint` response DTO under `com.BHT.models.metrics`.
- [x] **Step 1.3:** Create `TokenUsageRepository` contract plus JPQL and H2 fallback implementations.
- [x] **Step 1.4:** Create `TokenUsageService` with `@PreAuthorize("hasRole('ADMIN')")` and input validation.
- [x] **Step 1.5:** Create `TokenUsageController` mapped to `/admin/token-usage`.
- [x] **Step 1.6:** Add ledger write inside `MessageService.appendAssistantMessage` after `messageRepository.save(message)`.
- [x] **Step 1.7:** Add integration tests for the endpoint using `@SpringBootTest` and H2, verifying H2 compatibility.

### Phase 2: Frontend dashboard
- [x] **Step 2.1:** Install `recharts` in the frontend.
- [x] **Step 2.2:** Create `src/features/tokenUsage/types.ts`.
- [x] **Step 2.3:** Create `src/features/tokenUsage/services/tokenUsageService.ts`.
- [x] **Step 2.4:** Create `src/features/tokenUsage/hooks/useTokenUsage.ts`.
- [x] **Step 2.5:** Create `src/features/tokenUsage/components/TokenUsageChart.tsx`.
- [x] **Step 2.6:** Create `src/features/tokenUsage/components/TokenUsageControls.tsx`.
- [x] **Step 2.7:** Create `src/pages/TokenUsagePage.tsx`.
- [x] **Step 2.8:** Register `/token-usage` in `src/router.tsx` and add the sidebar entry.

### Phase 3: Verification
- [x] **Step 3.1:** Run the backend tests and confirm the endpoint returns the expected time-series shape.
- [x] **Step 3.2:** Start the full stack with `docker compose up` and log in as admin.
- [x] **Step 3.3:** Open `/token-usage`, select a range, and verify the chart renders.
- [x] **Step 3.4:** Run `docker compose logs -f <backend-service>` and confirm the backend logs show the aggregated response.

---

## Potential Issues / Risks

- H2 test database may not support `DATE_TRUNC` in MySQL mode; confirm H2 version or provide a test fallback.
- `LocalDateTime` query parameters require proper ISO-8601 parsing in the controller.
- The `recharts` dependency increases bundle size; it is acceptable for a dashboard feature.
- If messages are created without token counts, the chart will show zero for those intervals; this is correct but should be documented.

---

## Testing Decisions

- **Backend:** Write integration tests at the controller level (similar to `AdminControllerListEndpointTest.java`) that hit `/admin/token-usage` with seeded messages and assert the aggregated response. This tests behavior through the public HTTP interface, not the JPQL string.
- **Frontend:** Write a unit test for `useTokenUsage` using `vitest` and a mocked `tokenUsageService`, verifying that it calls the service with the correct params and handles errors. Write a component test for `TokenUsageChart` that asserts the chart renders when data is present.
- **Manual verification:** Use `docker compose logs -f` to inspect the backend response shape in the running container, as requested.

---

## Task Breakdown

### Task 1: Implement Token Usage Dashboard (Backend + Frontend)
- **Steps Covered:** Phase 1, Phase 2, Phase 3 (all implementation and verification steps)
- **Reason for Grouping:** The parent request asked for a single implementation plan covering backend aggregation, frontend dashboard, and verification.
- **Planned Task File:** `plan_tokens_task.md`
- **Task Document Link:** [[Tasks/current/plan_tokens_task]]
