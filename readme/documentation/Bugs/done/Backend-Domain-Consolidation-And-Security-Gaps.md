#critical #architectural #security

## Bug: Backend Domain Consolidation and Security Gaps

### Summary

The current AgentForge backend has a strong reusable foundation, especially the generic CRUD/query stack and QueryDSL list-query infrastructure, but the active domain implementation contains several architectural and security defects that should be resolved before adding more product features.

The most serious issue is that the backend currently contains two competing Agent modules with duplicated class names and different domain models. One model treats an AI agent as a `BaseUserEntity`, forcing fake credentials and identity fields onto non-human agents. Other modules reference the alternate Agent model, producing inconsistent ownership, workflow, and source relationships.

In addition, authorization rules are scattered across service methods, some endpoints inherit generic CRUD behavior that may not match domain access rules, user settings are exposed by arbitrary `userId`, API paths are inconsistent, and deployment/security configuration still contains bootstrap-grade defaults.

### Reproduction Conditions

1. Inspect the backend source under `project/srcs/backend/src/main/java/com/BHT/`.
2. Compare `models/agents/*` with `models/agents/agent/*`.
3. Review ownership and authorization checks across Agent, Workflow, WorkflowStep, UserSource, and UserSettings services.
4. Review backend configuration in `application.properties`, `application-test.properties`, `SecurityConfig`, `AdminBoostrap`, and `ApplicationConstants`.

### Environment / Preconditions

- Backend: Spring Boot 3.4.1, Java 21.
- Runtime DB: PostgreSQL.
- Test DB: H2 with MySQL compatibility mode.
- Active code path: `project/srcs/backend/`.
- Documentation source of truth: `documentation/Memory/`.

### Real-World Scenarios

- The backend may fail at startup due to duplicated Spring bean names such as `agentRepository`, `agentMapper`, `agentServiceImpl`, and `agentController`.
- A workflow step may reference one Agent entity model while `/api/v1/agents` manages another.
- Agents may be persisted as fake user accounts with fake passwords, usernames, and emails.
- Authenticated users may query or mutate resources they should not control if inherited generic endpoints or weak ownership checks are exposed.
- Frontend integration may break because some endpoints are versioned and others are not.
- PostgreSQL behavior may differ from tests because tests run against H2 in MySQL mode.

### Expected Behavior

The backend should have one canonical Agent domain model. AI agents should not inherit from `BaseUserEntity`. Ownership and authorization rules should be explicit, centralized, and consistently enforced. API routes should follow one versioning scheme. Production-sensitive configuration should be environment-driven. Tests should catch PostgreSQL-specific behavior. The backend domain should align with the product roles: `EMPLOYEE` and `MANAGER`.

### Actual Behavior

- Two Agent modules coexist: `project/srcs/backend/src/main/java/com/BHT/models/agents/*` and `project/srcs/backend/src/main/java/com/BHT/models/agents/agent/*`.
- One Agent entity extends `BaseUserEntity`.
- WorkflowStep and UserSource reference `com.BHT.models.agents.agent.AgentEntity`, while Admin/Employee ownership references `com.BHT.models.agents.AgentEntity`.
- Authorization is implemented through a mix of `@PreAuthorize`, inherited generic guards, manual `SecurityContextHolder` checks, and `AuthUserUtil`.
- `UserSettings` exposes lookup and default creation by arbitrary `userId` with only authentication.
- Routes mix `/api/v1/...` and unversioned paths.
- Bootstrap and secrets configuration contain production-unsafe defaults.

### Impact

- High risk of startup failures or ambiguous Spring bean wiring.
- High risk of data model drift and invalid relationships.
- Security risk from inconsistent ownership enforcement.
- Increased accidental complexity around agents due to fake user identity fields.
- Frontend integration friction due to inconsistent route naming.
- Future migrations become harder if the duplicate domain model is allowed to grow.

### Findings

- Duplicate Agent domain modules exist and define overlapping entities, repositories, mappers, services, controllers, DTOs, and query profiles.
- `models/agents/AgentEntity` incorrectly extends `BaseUserEntity`.
- WorkflowStep and UserSource reference the alternate `models/agents/agent/AgentEntity`, while Admin/Employee reference `models/agents/AgentEntity`.
- Authorization logic is inconsistent and scattered.
- UserSettings endpoints can operate by arbitrary `userId` with only authentication.
- API paths are inconsistent.
- Runtime uses PostgreSQL, but tests use H2 with MySQL compatibility mode.
- `spring.jpa.hibernate.ddl-auto=update` is still enabled.
- Bootstrap admin credentials are hardcoded.
- JWT issuer and POM metadata still contain stale legacy names.
- `FILE_SIGNATURE_SECRET` exists in env docs but is not used by backend config.
- CORS is hardcoded to `http://localhost:3000`.
- Product roles are `EMPLOYEE` and `MANAGER`, but backend roles are `ADMIN`, `CLIENT`, and `EMPLOYEE`.
- The base generic `update(...)` method is a no-op unless subclasses override it.

### Investigation Scope

- **Code Reviewed:** `project/srcs/backend/src/main/java/com/BHT/models/agents/AgentEntity.java`, `project/srcs/backend/src/main/java/com/BHT/models/agents/AgentServiceImpl.java`, `project/srcs/backend/src/main/java/com/BHT/models/agents/AgentController.java`, `project/srcs/backend/src/main/java/com/BHT/models/agents/agent/AgentEntity.java`, `project/srcs/backend/src/main/java/com/BHT/models/agents/agent/AgentServiceImpl.java`, `project/srcs/backend/src/main/java/com/BHT/models/workflows/workflowStep/WorkflowStepEntity.java`, `project/srcs/backend/src/main/java/com/BHT/models/sources/userSource/UserSourceServiceImpl.java`, `project/srcs/backend/src/main/java/com/BHT/models/usersSettings/UserSettingsServiceImpl.java`, `project/srcs/backend/src/main/java/com/BHT/configuration/security/SecurityConfig.java`, `project/srcs/backend/src/main/resources/application.properties`, `project/srcs/backend/src/main/resources/application-test.properties`
- **Logs Reviewed:** No - source-based analysis only.
- **Runtime Evidence:** Not executed. The diagnosis is based on source inspection.

### Root Cause Analysis

Confirmed architectural cause: the backend appears to contain two partially overlapping Agent implementations from different iterations. Instead of one replacing the other, both now coexist. This creates duplicated Spring components, split persistence models, and inconsistent downstream references.

Secondary cause: generic CRUD inheritance was used before every aggregate had explicit ownership and authorization rules. Generic endpoints are useful for simple resources, but AgentForge resources are ownership-sensitive and need domain-specific access policies.

### Evidence in Code

- `project/srcs/backend/src/main/java/com/BHT/models/agents/AgentEntity.java:37` - `AgentEntity extends BaseUserEntity`, forcing agent records into the user inheritance model.
- `project/srcs/backend/src/main/java/com/BHT/models/agents/AgentServiceImpl.java:88` - creates fake agent password and identity fields.
- `project/srcs/backend/src/main/java/com/BHT/models/agents/agent/AgentEntity.java:13` - second Agent entity exists as an independent JPA entity.
- `project/srcs/backend/src/main/java/com/BHT/models/agents/AgentController.java:27` - versioned route `/api/v1/agents`.
- `project/srcs/backend/src/main/java/com/BHT/models/agents/agent/AgentController.java:8` - duplicate unversioned route `/agent`.
- `project/srcs/backend/src/main/java/com/BHT/models/workflows/workflowStep/WorkflowStepEntity.java:3` - workflow steps import `com.BHT.models.agents.agent.AgentEntity`.
- `project/srcs/backend/src/main/java/com/BHT/models/users/admin/AdminEntity.java:5` - admins import `com.BHT.models.agents.AgentEntity`.
- `project/srcs/backend/src/main/java/com/BHT/models/usersSettings/UserSettingsServiceImpl.java:47` - user settings lookup/default creation only require authentication.
- `project/srcs/backend/src/main/java/com/BHT/shared/defaultImplements/DefaultServiceImplements.java:88` - generic update loads and saves an entity without applying form fields.
- `project/srcs/backend/src/main/java/com/BHT/configuration/boostrap/AdminBoostrap.java:52` - hardcoded initial admin credentials.
- `project/srcs/backend/src/main/resources/application.properties:16` - `ddl-auto=update`.
- `project/srcs/backend/src/main/resources/application.properties:26` - `file.signature.secret=${JWT_SECRET}` instead of `FILE_SIGNATURE_SECRET`.
- `project/srcs/backend/src/main/resources/application-test.properties:4` - H2 uses `MODE=MySQL` while runtime is PostgreSQL.
- `project/srcs/backend/src/main/java/com/BHT/constant/ApplicationConstants.java:6` - stale issuer `UpEmpresa`.
- `project/srcs/backend/pom.xml:14` - stale metadata says `authServer` and `Auth microservice`.

### Affected Systems / Modules

- Backend domain model.
- Agent management.
- Workflow and workflow-step management.
- Source pool management.
- User settings.
- Authentication and authorization.
- Dockerized runtime configuration.
- Backend test strategy.

### Affected Processes

- [[Memory/architecture]] - backend layering and planned AgentForge domain additions are affected by the duplicate Agent aggregate.
- [[Memory/known-issues]] - several systemic backend sharp edges are formalized here as an actionable bug report.
- [[Docs/general/MVP-Entity-Model]] - the implemented backend model must be reconciled with the planned MVP model.

---

## Supporting Logs

```text
No runtime logs were collected. This report is based on source inspection only.
```

### Log Analysis

Logs are inconclusive because the backend was not started during this investigation.

### Confidence Level

Strong hypothesis.

The duplicate modules, incorrect inheritance, route inconsistency, stale configuration, and weak UserSettings authorization are directly visible in source. Startup behavior and runtime security effects still need validation through the test suite and a Spring context startup check.

### Remaining Uncertainty / Open Questions

- Which Agent module should be the canonical implementation?
- Should the product role `MANAGER` replace `ADMIN`, or should `ADMIN` remain as a technical superuser outside the MVP role model?
- Is compatibility required for any current unversioned routes?
- Should PostgreSQL-backed tests use Testcontainers, Docker Compose, or a dedicated local profile?

---

## Solution Direction

### Proposed Fix

Perform a backend consolidation and hardening pass before continuing feature work:

1. Select one canonical Agent model.
2. Remove or migrate the duplicate Agent module.
3. Refactor Agent so it does not inherit from `BaseUserEntity`.
4. Introduce explicit ownership/access policy modules for user-owned resources.
5. Normalize API routes to `/api/v1/...`.
6. Lock down UserSettings to current-user or manager-authorized access.
7. Align backend roles with the product role model.
8. Replace bootstrap-grade config with environment-driven settings.
9. Add migration tooling and PostgreSQL-backed validation.

### Why This Fix Is Correct

This removes accidental complexity at the domain boundary, restores a single source of truth for agents, and makes ownership/security rules explicit. It also keeps the strong existing generic CRUD/query infrastructure while preventing generic endpoints from bypassing domain-specific access rules.

### Skills and Documentation Used During Analysis and Solution Validation

- Memory Bank - confirmed product direction, current architecture, known issues, and backend constraints.
- Documentation Management - bug report structure and documentation conventions.
- SOLID / Deep Module Design - used to assess duplicated modules, shallow seams, and incorrect inheritance.

### Files to Modify or Create

- `project/srcs/backend/src/main/java/com/BHT/models/agents/**` - consolidate canonical Agent module.
- `project/srcs/backend/src/main/java/com/BHT/models/agents/agent/**` - remove or migrate duplicate module.
- `project/srcs/backend/src/main/java/com/BHT/models/workflows/workflowStep/**` - update Agent references.
- `project/srcs/backend/src/main/java/com/BHT/models/sources/userSource/**` - update Agent references and access rules.
- `project/srcs/backend/src/main/java/com/BHT/models/usersSettings/**` - enforce current-user/manager authorization.
- `project/srcs/backend/src/main/java/com/BHT/shared/models/baseUser/UserRoles.java` - align roles with product model.
- `project/srcs/backend/src/main/java/com/BHT/configuration/security/SecurityConfig.java` - env-driven CORS.
- `project/srcs/backend/src/main/java/com/BHT/configuration/boostrap/AdminBoostrap.java` - env-driven bootstrap admin.
- `project/srcs/backend/src/main/java/com/BHT/constant/ApplicationConstants.java` - replace stale issuer/subject.
- `project/srcs/backend/src/main/resources/application.properties` - fix secrets and migration settings.
- `project/srcs/backend/src/main/resources/application-test.properties` - remove misleading MySQL compatibility or add PostgreSQL-backed tests.
- `project/srcs/backend/pom.xml` - update stale metadata and add migration tooling.

### Validation Strategy After Fix

#### Automatic Validation

- [ ] `cd project/srcs/backend && ./mvnw test`
- [ ] `cd project/srcs/backend && ./mvnw verify`
- [ ] Add/validate Spring context startup test to catch duplicate bean conflicts.
- [ ] Add API authorization tests for Agent, Workflow, WorkflowStep, UserSource, and UserSettings.
- [ ] Add integration tests confirming WorkflowStep and UserSource reference the canonical Agent model.
- [ ] Add PostgreSQL-backed integration validation for JSON/JSONB and QueryDSL behavior.

#### Manual Validation

- [ ] Run Docker Compose stack locally.
- [ ] Login as manager/admin and employee.
- [ ] Verify each user sees only authorized agents, workflows, sources, and settings.
- [ ] Verify frontend can call all backend routes using a consistent `/api/v1/...` scheme.

### Potential Risks / Notes

- Migrating away from `AgentEntity extends BaseUserEntity` may require database reset or migration scripts.
- Role migration from `ADMIN` to `MANAGER` may affect JWT claims, seeded users, tests, and existing rows in `user_roles`.
- Removing one Agent module may require coordinated changes in workflows, sources, tests, and documentation.
- Generic CRUD should remain, but ownership-sensitive aggregates must override or narrow inherited behavior.

---

## Resolution Steps

### Phase 1: Stop Domain Drift

- [ ] **Step 1.1:** Identify the canonical Agent aggregate design.
- [ ] **Step 1.2:** Remove or migrate the duplicate Agent module.
- [ ] **Step 1.3:** Refactor all Agent references in WorkflowStep, UserSource, Admin, Employee, tests, and DTOs to the canonical module.
- [ ] **Step 1.4:** Ensure the backend Spring context starts with no duplicate Agent beans.

### Phase 2: Correct Agent Ownership Model

- [ ] **Step 2.1:** Refactor Agent so it no longer extends `BaseUserEntity`.
- [ ] **Step 2.2:** Remove fake agent username/email/password generation.
- [ ] **Step 2.3:** Model ownership explicitly through user ownership fields and access policies.
- [ ] **Step 2.4:** Add tests proving agents are not authenticatable users.

### Phase 3: Harden Authorization

- [ ] **Step 3.1:** Introduce reusable ownership/access policy logic for user-owned resources.
- [ ] **Step 3.2:** Apply policy checks to Agent, Workflow, WorkflowStep, UserSource, and UserSettings.
- [ ] **Step 3.3:** Restrict UserSettings operations to the current user or authorized manager/admin.
- [ ] **Step 3.4:** Add positive and negative authorization tests.

### Phase 4: Normalize API Design

- [ ] **Step 4.1:** Move unversioned endpoints to `/api/v1/...`.
- [ ] **Step 4.2:** Keep temporary compatibility only if the frontend or existing tests require it.
- [ ] **Step 4.3:** Update tests and docs to use canonical routes.

### Phase 5: Align Platform Identity and Configuration

- [ ] **Step 5.1:** Align roles with AgentForge product terminology.
- [ ] **Step 5.2:** Update stale issuer, subject, POM metadata, and test script references.
- [ ] **Step 5.3:** Make CORS, bootstrap admin, and file-signature secret environment-driven.

### Phase 6: Stabilize Persistence and Tests

- [ ] **Step 6.1:** Add Flyway or Liquibase.
- [ ] **Step 6.2:** Replace or supplement H2/MySQL-mode tests with PostgreSQL-backed tests.
- [ ] **Step 6.3:** Validate JSON/JSONB mappings, QueryDSL fields, and schema creation under PostgreSQL.

---

## Task Breakdown

### Task 1: Consolidate Agent Domain Module

- **Steps Covered:** 1.1, 1.2, 1.3, 1.4
- **Reason for Grouping:** Highest-risk blocker; all later workflow/source/user security work depends on one canonical Agent model.
- **Planned Task File:** `Backend-Domain-Consolidation-And-Security-Gaps-step-1-consolidate-agent-domain.md`
- **Task Document Link:** Add when the task document is created.

### Task 2: Refactor Agent Away From BaseUserEntity

- **Steps Covered:** 2.1, 2.2, 2.3, 2.4
- **Reason for Grouping:** Standalone domain correction after the canonical module is chosen.
- **Planned Task File:** `Backend-Domain-Consolidation-And-Security-Gaps-step-2-refactor-agent-identity.md`
- **Task Document Link:** Add when the task document is created.

### Task 3: Harden Ownership and Authorization

- **Steps Covered:** 3.1, 3.2, 3.3, 3.4
- **Reason for Grouping:** Cross-cutting security work across multiple aggregates.
- **Planned Task File:** `Backend-Domain-Consolidation-And-Security-Gaps-step-3-harden-authorization.md`
- **Task Document Link:** Add when the task document is created.

### Task 4: Normalize API Routes

- **Steps Covered:** 4.1, 4.2, 4.3
- **Reason for Grouping:** API design cleanup with broad but mechanical test/doc updates.
- **Planned Task File:** `Backend-Domain-Consolidation-And-Security-Gaps-step-4-normalize-api-routes.md`
- **Task Document Link:** Add when the task document is created.

### Task 5: Align Identity and Runtime Configuration

- **Steps Covered:** 5.1, 5.2, 5.3
- **Reason for Grouping:** Related platform identity and deployment-hardening cleanup.
- **Planned Task File:** `Backend-Domain-Consolidation-And-Security-Gaps-step-5-align-identity-config.md`
- **Task Document Link:** Add when the task document is created.

### Task 6: Stabilize Persistence and PostgreSQL Validation

- **Steps Covered:** 6.1, 6.2, 6.3
- **Reason for Grouping:** Persistence/test reliability work should happen after the domain shape stabilizes.
- **Planned Task File:** `Backend-Domain-Consolidation-And-Security-Gaps-step-6-stabilize-persistence-validation.md`
- **Task Document Link:** Add when the task document is created.

---

## Expected Outcome After Fix

- One canonical Agent domain model exists.
- Agents are no longer modeled as fake user accounts.
- WorkflowStep and UserSource reference the same Agent aggregate.
- Ownership rules are explicit and consistently tested.
- UserSettings cannot be accessed by arbitrary authenticated users.
- Backend routes are consistent and frontend-friendly.
- Runtime secrets and bootstrap values are production-safe.
- PostgreSQL-specific persistence behavior is validated.
- The backend is safe to extend with conversations, executions, metrics, and provider integrations.
