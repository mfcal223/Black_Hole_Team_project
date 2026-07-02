#high #architectural

## Bug: Review of Token Usage Dashboard

### Summary

This is a review of the Feature document [[Features/to-do/Token-Usage-Dashboard]]. The feature is well-scoped and follows existing backend/frontend patterns, but the review identified 5 findings that should be resolved before implementation begins. The most significant risks are H2 test compatibility for the proposed `DATE_TRUNC` JPQL query and the absence of an index on `message.created_at`, which could cause performance problems as the table grows.

### Reproduction Conditions

Not applicable — this is a document review.

### Environment / Preconditions (Optional)

- Backend: Spring Boot 3.4.1 / Java 21 / PostgreSQL in production / H2 in MySQL mode for tests.
- Frontend: Vite + React 19 + TypeScript + React Router v6 + Tailwind CSS v4.
- No `TokenUsageRecord` entity exists; token counts live in `MessageEntity`.

### Real-World Scenarios

1. A developer implements the JPQL `DATE_TRUNC` query and all local backend tests pass against PostgreSQL, but CI fails because H2 in MySQL mode does not recognize `DATE_TRUNC`.
2. The dashboard is deployed and works for a small message table, but as usage grows the time-range query scans millions of rows because `created_at` is not indexed.
3. A malformed `interval` query parameter reaches the repository and produces a confusing database error instead of a clean 400 Bad Request.

### Expected Behavior

The Feature document should explicitly address test-database compatibility, query performance, input validation, and authorization testing before work starts.

### Actual Behavior

The Feature document proposes a reasonable design but leaves these risks implicit or unaddressed.

### Impact

- Potential CI/test breakage if H2 does not support the proposed JPQL function.
- Potential production performance degradation on large message tables.
- Potential poor error UX for invalid query parameters.
- Potential gap in the test pyramid for authorization.

### Findings

1. The JPQL query uses `FUNCTION('DATE_TRUNC', ...)` which is PostgreSQL-specific; H2 test compatibility is unverified.
2. `MessageEntity` has no index on `created_at`, so the time-range filter may scan the full table.
3. The `interval` query parameter is passed directly to the repository without a whitelist/validation.
4. The Feature document does not explicitly note the divergence from the MVP `TokenUsageRecord` entity described in [[MVP-Entity-Model]].
5. The testing section does not include an authorization test verifying non-admin users receive 403.

### Investigation Scope

- **Code Reviewed:** `srcs/backend/src/main/java/com/BHT/models/message/MessageEntity.java`, `srcs/backend/src/main/resources/application-test.properties`, `srcs/backend/src/main/java/com/BHT/models/hq/admin/AdminController.java`, `srcs/frontend/src/router.tsx`, `srcs/frontend/src/layouts/Sidebar.tsx`.
- **Logs Reviewed:** No.
- **Runtime Evidence:** None — document review only.

### Root Cause Analysis

The Feature document was written from a PostgreSQL-centric perspective and did not cross-check the test profile's H2 mode. It also focused on functional correctness and omitted non-functional concerns (indexing, validation) and one negative authorization test case.

### Evidence in Code

- `srcs/backend/src/main/java/com/BHT/models/message/MessageEntity.java:15` — indexes only `conversation_id`; no index on `created_at`.
- `srcs/backend/src/main/resources/application-test.properties` — `spring.datasource.url=jdbc:h2:mem:testdb;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH` — H2 in MySQL mode may not support `DATE_TRUNC`.
- `srcs/backend/src/main/java/com/BHT/models/hq/admin/AdminController.java` — existing pattern for admin-only endpoints.

### Affected Systems / Modules

- [[Backend-Architecture]] — new aggregation endpoint must fit the security and layering pattern.
- [[Backend-Model-Anatomy]] — query uses a repository outside the generic CRUD slice.
- [[MVP-Entity-Model]] — feature reuses `MessageEntity` instead of the planned `TokenUsageRecord`.
- [[Login_and_authentication_explained]] — frontend relies on JWT and role-based routing.

### Affected Processes

- Admin dashboard navigation and routing.
- Backend CI/test pipeline.

---

## Supporting Logs (Optional)

```text
No runtime logs — document review only.
```

### Log Analysis

Not applicable.

### Confidence Level

Strong hypothesis for findings 1–3; confirmed for finding 2 (no index) and finding 4 (MVP doc mismatch) by direct code/doc review.

### Remaining Uncertainty / Open Questions

- Which H2 version is in use? (Check `pom.xml` H2 version to confirm `DATE_TRUNC` support.)
- Should the `interval` parameter support additional values such as `day` or `week` in the future?
- Should the Feature document be updated to require an index migration, or should that become a separate Task?

---

## Solution Direction

### Proposed Fix

Update the Feature document to address each finding:

1. Add a design note and risk mitigation for H2 `DATE_TRUNC` compatibility; require the implementation Task to verify the H2 version or provide a profile-specific fallback.
2. Add a step to create a database index on `message.created_at` (or annotate it with `@Index` in `MessageEntity`).
3. Add input validation in `TokenUsageService` that whitelists `interval` to `"hour"` and `"minute"` only.
4. Add an explicit note explaining that the feature intentionally reuses `MessageEntity` because token data is already persisted per-message, and that a future migration to `TokenUsageRecord` remains possible.
5. Add an authorization test case to the testing decisions.

### Why This Fix Is Correct

These changes close the gaps between a design that works locally and one that is safe to run in CI and production. Indexing and validation are low-cost additions that prevent larger problems later.

### Skills and Documentation Used During Analysis and Solution Validation

- `documentation-management` — Feature/Bug document structure and conventions.
- `solid-deep-design` — Evaluated module boundaries (controller/service/repository) and interface depth.
- `memory-bank` — Attempted to load project context; Memory Bank is incomplete (only `brief.md` exists and is empty).
- `find-docs` — Context7 CLI (`ctx7`) was unavailable; technical claims were validated against existing codebase patterns and training knowledge.
- `glossary-management` — Glossary CLI (`glossary`) was unavailable; domain terms were inferred from existing documentation.

### Files to Modify or Create

- `documentation/Features/to-do/Token-Usage-Dashboard.md` — update with findings and mitigations.
- `documentation/Bugs/to-do/Review-of-Token-Usage-Dashboard.md` — this document.

### Validation Strategy After Fix

#### Automatic Validation
- [ ] Review the updated Feature document to confirm all findings are addressed.

#### Manual Validation
- [ ] Confirm with the team that reusing `MessageEntity` instead of `TokenUsageRecord` is acceptable for the MVP.

### Potential Risks / Notes

- Adding an index on `message.created_at` is a schema change; verify it does not conflict with existing migrations or ddl-auto behavior.
- If H2 compatibility cannot be resolved quickly, consider using a Criteria API or native query fallback for tests.

---

## Resolution Steps

### Phase 1: Update the Feature document
- [ ] **Step 1.1:** Add H2 compatibility note and mitigation for `DATE_TRUNC`.
- [ ] **Step 1.2:** Add index requirement on `message.created_at`.
- [ ] **Step 1.3:** Add interval whitelist/validation requirement.
- [ ] **Step 1.4:** Add note about reuse of `MessageEntity` vs MVP `TokenUsageRecord`.
- [ ] **Step 1.5:** Add authorization/403 test requirement.

---

## Task Breakdown

### Task 1: Patch Token-Usage-Dashboard Feature document
- **Steps Covered:** Step 1.1, Step 1.2, Step 1.3, Step 1.4, Step 1.5
- **Reason for Grouping:** All updates are low-complexity edits to the same Feature document.
- **Planned Task File:** `Review-of-Token-Usage-Dashboard-step-1-1-patch-feature-doc.md`
- **Task Document Link:** [To be created]

---

## Expected Outcome After Fix

- The Feature document explicitly addresses test compatibility, indexing, validation, and authorization testing.
- Implementation can proceed with fewer surprises in CI and production.

---

## Findings Summary Table

| # | Title | Severity | Status |
|---|-------|----------|--------|
| 1 | H2 test compatibility for `DATE_TRUNC` is unverified | 🟠 High | Pending |
| 2 | No index on `message.created_at` for time-range queries | 🟠 High | Pending |
| 3 | `interval` parameter is not whitelisted/validated | 🟡 Moderate | Pending |
| 4 | Divergence from MVP `TokenUsageRecord` is not documented | 🟡 Moderate | Pending |
| 5 | Missing authorization/403 test in testing decisions | 🟡 Moderate | Pending |
