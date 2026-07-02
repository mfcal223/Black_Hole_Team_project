#high #architectural #security #feature-review

## Bug: Review of Employee User Entity and Role Feature

### Summary

This Bug Report records the review findings for the Feature document at `documentation/Features/to-do/Employee-User-Entity-and-Role.md`.

The Feature correctly captures the core intent: add an `Employee` entity as a normal username/password user, reuse the existing `BaseUserEntity` inheritance model, assign `UserRoles.EMPLOYEE`, avoid all API-key fields, require Admin-only CRUD, and include security hardening.

The review found **5 findings**. The highest severity is **High** because the Feature currently includes security hardening but does not fully define the route authorization matrix or password update contract needed to implement the feature safely.

### Reproduction Conditions

1. Read `documentation/Features/to-do/Employee-User-Entity-and-Role.md`.
2. Compare the proposed architecture with the current backend security and user-management code.
3. Observe under-specified areas where implementation agents could make incompatible or insecure choices.

### Environment / Preconditions

- Backend: Spring Boot 3.4.1, Java 21.
- Existing user model: `BaseUserEntity` with JOINED inheritance.
- Existing roles: `ADMIN`, `CLIENT`, `EMPLOYEE`.
- Existing security: JWT filter, `/login`, `@PreAuthorize` annotations, but no discovered `@EnableMethodSecurity` or `authorizeHttpRequests` rules.
- Reviewed Feature: [[Employee-User-Entity-and-Role 1|Employee User Entity and Role]].

### Real-World Scenarios

- An implementation agent enables method security and adds `anyRequest().authenticated()` without considering `/login`, CORS preflight, existing Admin/Client routes, or `/error`, causing valid requests to fail unexpectedly.
- An Employee update request requires `password` because the same `EmployeeForm` is used for create and update, forcing Admins to reset passwords for simple profile edits.
- An Employee insert checks only `EmployeeRepository.findByEmail(...)`, misses an existing Admin with the same email, and later fails with a generic database constraint error from `base_user`.
- Employee endpoint authorization tests run before the Employee controller exists and accidentally assert `404`/filter behavior instead of real Admin-only CRUD behavior.

### Expected Behavior

The Feature document should fully constrain the risky implementation decisions:

- Define the intended security route matrix and method-security expectations.
- Define Employee create vs update password semantics.
- Require global username/email uniqueness checks through the shared base-user model.
- Sequence tests in vertical slices that correspond to real public behavior.
- Remove avoidable naming/optional-helper ambiguity that could cause inconsistent implementation.

### Actual Behavior

The Feature is directionally correct but leaves several decisions open or under-specified. An implementation could satisfy parts of the text while still producing insecure authorization, awkward password update behavior, generic uniqueness failures, or brittle tests.

### Impact

- Employee CRUD could be left exposed or existing routes could be broken during hardening.
- Employee profile updates could unintentionally require password changes or overwrite passwords.
- Duplicate usernames/emails across Admin, Client, and Employee could produce poor user-facing errors.
- Tests could become implementation-coupled or fail for route-existence reasons rather than behavior.
- Implementation agents could diverge on service naming and helper scope.

### Findings

#### Finding 1 — Security hardening is included but the authorization matrix is not explicit enough

- **Severity:** High
- **Status:** Pending

**Description:**

The Feature intentionally includes security hardening, but it only specifies a few rules: permit `/login`, require Admin for `/employee/**`, and require authentication or stricter rules for other protected routes. This is not enough for a safe implementation because the current `SecurityConfig` has no `authorizeHttpRequests` rules and existing Admin/Client services have mixed inherited `isAuthenticated()` and custom `hasRole('ADMIN')` annotations.

**Evidence:**

- `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java:47` defines the `SecurityFilterChain`.
- `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java:49-58` disables CSRF, configures stateless sessions, adds the JWT filter, and returns `http.build()` without `authorizeHttpRequests`.
- `backend/src/main/java/com/agentForgeBackend/agentForgeBackendApplication.java:8-11` enables Spring Boot, scheduling, and web security, but not method security.
- `backend/src/main/java/com/agentForgeBackend/shared/defaultImplements/DefaultServiceImplements.java:54-98` applies `@PreAuthorize("isAuthenticated()")` to inherited CRUD methods.
- Spring Security 6.5 docs confirm `@EnableMethodSecurity` is needed to activate method security and `authorizeHttpRequests` should explicitly define public/protected request rules.

**Examples:**

- If `anyRequest().authenticated()` is added without permitting `/login`, login may be blocked.
- If `/admin/**` and `/client/**` are left as only `authenticated`, a non-admin authenticated user may retain access to inherited list/update/delete operations.
- If `OPTIONS` preflight is not considered, browser-based clients may fail even when the endpoint behavior is correct.

**Why It Matters:**

Employee CRUD cannot be safely admin-only unless both HTTP-level and method-level rules are explicit. A vague hardening step can either under-secure the new Employee endpoints or over-tighten existing routes in ways that break the application.

**Possible Solutions:**

1. Patch the Feature with an explicit authorization matrix covering `/login`, `/employee/**`, `/admin/**`, `/client/**`, `/error`, CORS preflight/`OPTIONS`, and fallback behavior.
2. Move all broad security hardening to a separate Bug/Feature and keep this Employee Feature limited to the Employee domain.
3. Add only `/employee/**.hasRole("ADMIN")` and leave the rest unchanged.

**Recommended Solution:**

Patch the Feature with an explicit authorization matrix and compatibility/regression tests. This is superior because the user explicitly chose to include security hardening, and the Employee feature depends on enforceable Admin-only access.

**Decision:**

- **Chosen option:** Patch the Feature with an explicit authorization matrix.
- **Rationale:** The user confirmed the Feature's existing intent to include security hardening. An ordered route matrix with `/error`, `OPTIONS`, `/login`, `/employee/**`, `/admin/**`, `/client/**`, and fallback rules provides defense-in-depth and removes the ambiguity that could cause implementers to block login, break CORS preflight, or under-secure existing routes.
- **Parent document patched:** Yes — the "Security configuration hardening" subsection now contains the explicit matrix and regression-test requirements.
- **Date:** 2026-06-15


#### Finding 2 — Employee create/update password semantics are ambiguous

- **Severity:** High
- **Status:** Pending

**Description:**

The Feature says `EmployeeForm` should include `password`, Employee insert must require a non-blank password, and Admins can update Employee details including password. The current generic controller/service pattern uses one `FORM` type for both insert and update, which creates an ambiguity: does every update require a password, is password optional on update, or is password update a separate operation?

**Evidence:**

- `documentation/Features/to-do/Employee-User-Entity-and-Role.md:165` says `EmployeeForm` includes `password`.
- `documentation/Features/to-do/Employee-User-Entity-and-Role.md:199` says Employee insert requires a non-blank password.
- `documentation/Features/to-do/Employee-User-Entity-and-Role.md:333-335` plans a generic Employee service/controller for CRUD.
- `backend/src/main/java/com/agentForgeBackend/shared/defaultImplements/DefaultController.java` provides generic POST and PUT endpoints using one `FORM` type.
- `backend/src/main/java/com/agentForgeBackend/shared/defaultImplements/DefaultServiceImplements.java:89-94` shows update currently receives the same form type but does not apply it.

**Examples:**

- If `password` is `@NotBlank` on `EmployeeForm`, a simple update to `lastName` may fail unless the Admin also sends a password.
- If blank passwords are accepted on update but not handled carefully, the service may encode an empty password or overwrite the existing password.
- If password updates are allowed through the same route without clear semantics, tests may disagree with implementation.

**Why It Matters:**

Password handling is security-sensitive. Ambiguous create/update semantics can create poor UX, accidental credential resets, or invalid account states.

**Possible Solutions:**

1. Define separate input contracts, such as `EmployeeCreateForm` with required password and `EmployeeUpdateForm` with optional password, implemented through custom Employee controller/service methods instead of the fully generic single-form path.
2. Keep one `EmployeeForm`, but explicitly state that password is required on insert and optional on update; if blank or null on update, preserve the existing password.
3. Remove password update from this feature and require a separate password-reset/change-password workflow later.

**Recommended Solution:**

Patch the Feature to define separate create and update semantics. If the existing generic controller cannot support separate forms cleanly, Employee should override the relevant endpoints or use validation groups. This keeps insert validation strict while preventing accidental password changes during profile updates.

**Decision:**

- **Chosen option:** Keep one `EmployeeForm`, but explicitly state that password is required on insert and optional on update; if blank or null on update, preserve the existing password.
- **Rationale:** One shared form fits the existing generic `DefaultController`/`DefaultServiceImplements` seam with minimal change. Explicit service-level rules (reject blank on insert, preserve hash on update unless non-blank) remove the ambiguity while keeping the contract simple for implementers and API consumers.
- **Parent document patched:** Yes — Sections 3 and 6 now state that `password` is optional at the form level, required/non-blank on insert, and preserved on update unless a non-blank value is supplied.
- **Date:** 2026-06-15


#### Finding 3 — Global username/email uniqueness is identified but not specified as a concrete implementation contract

- **Severity:** Moderate
- **Status:** Done

**Description:**

The Feature correctly states that username/email uniqueness must respect `base_user`, but it does not specify the concrete repository methods, service module, or tests needed to guarantee this. The current `BaseUserRepository` only exposes `findByUsername`, not `findByEmail`, and existing Client/Admin patterns may check only subtype repositories.

**Evidence:**

- `backend/src/main/java/com/agentForgeBackend/shared/models/baseUser/BaseUserEntity.java:33-35` declares `email` unique on `base_user`.
- `backend/src/main/java/com/agentForgeBackend/shared/models/baseUser/BaseUserEntity.java:45-47` declares `username` unique on `base_user`.
- `backend/src/main/java/com/agentForgeBackend/shared/securityUser/BaseUserRepository.java:8-10` exposes only `findByUsername`.
- `documentation/Features/to-do/Employee-User-Entity-and-Role.md:191` says to use shared base-user lookup or repository support, but does not require exact methods or tests.

**Examples:**

- Existing Admin username `admin` exists. An Employee insert with username `admin` could pass Employee-only checks and then fail at database save time.
- Existing Client email `client@example.com` exists. An Employee insert with the same email could produce a generic persistence exception instead of a domain-level `ItemAlreadyExist` or validation error.

**Why It Matters:**

The user identity namespace is shared across all user subtypes. Employee-specific checks are insufficient and will produce inconsistent errors or duplicate-handling behavior.

**Possible Solutions:**

1. Add explicit Feature requirements to extend `BaseUserRepository` with `existsByUsername`, `existsByEmail`, or `findByEmail` and use those in Employee service validation.
2. Define a shared `BaseUserIdentityPolicy` or `UserAccountProvisioningPolicy` module that centralizes uniqueness checks and password policy.
3. Rely on database constraints and map persistence exceptions to domain errors.

**Recommended Solution:**

Patch the Feature to require shared base-user identity checks and tests that try to create Employees with existing Admin and Client usernames/emails. This provides clear behavior and avoids relying on low-level database exceptions.

**Decision:**

- **Chosen option:** Inject `BaseUserRepository` with `existsByUsername` and `existsByEmail` derived query methods as the single identity authority, and require all three subtype services (Admin, Client, Employee) to use it for global uniqueness checks.
- **Rationale:** Adding two derived query methods to `BaseUserRepository` retroactively fixes the existing bug where `AdminServiceImpl.insert()` only checks `AdminRepository` for duplicates, and prevents the same bug in Employee and Client. Establishes one identity authority without new classes or abstractions. Consistent domain-level `ItemAlreadyExist` errors replace fragile database constraint exception mapping.
- **Parent document patched:** Yes — Sections 5 and 6 now specify that `BaseUserRepository` gains `existsByUsername` and `existsByEmail`, that all subtype services inject `BaseUserRepository`, and that cross-subtype duplicate tests must verify Employee-vs-Admin and Employee-vs-Client scenarios.
- **Date:** 2026-06-15

#### Finding 4 — The test plan says TDD, but the phase/task ordering still risks horizontal or non-behavioral tests

- **Severity:** Moderate
- **Status:** Done

**Description:**

The Feature says tests should follow TDD vertical slices, but Phase 5 groups a large “complete test suite” after implementation, and Phase 1 proposes Employee endpoint authorization tests before the Employee endpoint exists. This can lead to tests that either fail for the wrong reason (`404` instead of authorization behavior) or are written in bulk after implementation.

**Evidence:**

- `documentation/Features/to-do/Employee-User-Entity-and-Role.md:318-321` puts Employee endpoint authorization tests before the Employee domain/controller exists.
- `documentation/Features/to-do/Employee-User-Entity-and-Role.md:345-352` places broad repository, mapper, service, list, controller, and validation tests in a final test-suite phase.
- The TDD skill guidance requires one behavior test followed by minimal implementation, repeated by vertical slice.

**Examples:**

- An Admin request to `/employee/list` before `EmployeeController` exists may return 404 even when security is correct.
- Writing mapper, service, controller, and repository tests after all implementation is complete encourages tests that mirror implementation instead of behavior.

**Why It Matters:**

The testing plan can produce brittle tests or false confidence. Employee is security-sensitive, so tests should prove behavior at each public seam as it is introduced.

**Possible Solutions:**

1. Reorder Feature phases into vertical slices: security baseline using existing endpoints, Employee repository/entity, Employee create service behavior, Employee controller/list authorization, Employee login/JWT, then final regression sweep.
2. Keep Phase 5 as a regression phase but explicitly move the first behavior tests for each module into the same phase as that module’s implementation.
3. Remove TDD language and treat the plan as implementation-first.

**Recommended Solution:**

Patch the Feature to keep a final regression phase but require each implementation phase to start with the behavior tests for that phase. Security baseline tests should use existing endpoints until `/employee` exists; Employee-specific authorization tests should run after the Employee controller route is present.

**Decision:**

- **Chosen option:** Fix labels and delegate TDD ordering to Task documents rather than restructuring Feature phases. Rename Phase 5 from "Full behavior test coverage" to "Regression and supplemental test coverage" to eliminate the miscommunication that module tests are first written there. Add a TDD-per-task instruction to Testing Decisions, and add a surgical note to Step 1.1 to use existing Admin/Client endpoints for the security baseline (not `/employee/**` routes that do not yet exist).
- **Rationale:** The Feature defines what to build; Tasks define when and in what order. Embedding test steps into every implementation phase couples the Feature to implementation sequencing. The Phase 5 mislabel was the root cause: calling it "Full behavior test coverage" implied tests are first written there, contradicting the TDD vertical-slice intent. Renaming it to "Regression and supplemental" fixes this without restructuring phases. The TDD discipline lives where sequencing happens — in Task documents.
- **Parent document patched:** Yes — Phase 5 renamed to "Regression and supplemental test coverage" with a clarifying description, Step 1.1 now explicitly instructs using existing endpoints for the security baseline, Testing Decisions section now requires each Task document to enforce TDD within its scope, and Task 5 renamed to "Regression and Supplemental Test Coverage."
- **Date:** 2026-06-15


#### Finding 5 — Service naming and optional helper scope are still ambiguous

- **Severity:** Low
- **Status:** Pending

**Description:**

The Feature lists `EmployeeService.java` or `EmployeeServiceImpl.java` and treats `AuthUserUtil` Employee support as optional. This is not fatal, but it leaves avoidable ambiguity for implementation and tests.

**Evidence:**

- `documentation/Features/to-do/Employee-User-Entity-and-Role.md:142` lists `EmployeeService.java` or `EmployeeServiceImpl.java`.
- `documentation/Features/to-do/Employee-User-Entity-and-Role.md:292-300` makes `AuthUserUtil` changes conditional.
- Existing code is inconsistent: Client uses `ClientService`, while Admin uses `AdminServiceImpl`.

**Examples:**

- One implementation agent creates `EmployeeService`; another creates `EmployeeServiceImpl`; test names and task documents may drift.
- `AuthUserUtil` might gain an unused `EmployeeRepository` dependency “just in case,” increasing coupling without immediate leverage.

**Why It Matters:**

Clear file/class naming and helper scope reduce coordination cost. The ambiguity is small but easy to eliminate before implementation tasks are generated.

**Possible Solutions:**

1. Choose one concrete service class name in the Feature document.
2. Explicitly defer `AuthUserUtil` Employee entity lookup until a caller needs it, while allowing `isAuthUserEmployee()` if role checks are needed immediately.
3. Leave names flexible and let the task decide.

**Recommended Solution:**

Patch the Feature to choose one service class name and defer full `AuthUserUtil` entity lookup unless a concrete caller appears. This keeps the Employee slice focused and avoids speculative dependencies.

**Decision:**

- **Chosen option:** Refactor `AuthUserUtil` to use `BaseUserRepository` for all subtype entity lookups (replacing `ClientRepository` and `AdminRepository` with a single `BaseUserRepository`) and name the service class `EmployeeService` without the `Impl` suffix.
- **Rationale:** `AuthUserUtil` has zero consumers — both `AdminRepository` and `ClientRepository` injections are dead code. This Feature is the one-time opportunity to eliminate the per-subtype repository coupling pattern before it ossifies with Employee. Using `BaseUserRepository` via JOINED inheritance (proven by `SecurityUserServiceImpl`) means every future user subtype works automatically with no constructor changes. For naming, `EmployeeService` follows the cleaner `ClientService` pattern and avoids the redundant "Impl-on-Impl" naming where `DefaultServiceImplements` already carries that semantic. `AdminServiceImpl` is noted as a known inconsistency for a separate cleanup.
- **Parent document patched:** Yes — Section 1 expected files list now specifies `EmployeeService.java` with a naming convention rationale note; Section 12 now describes the `BaseUserRepository`-based refactoring of `AuthUserUtil` with generic helper extraction and test requirements.
- **Date:** 2026-06-15


### Investigation Scope

- **Feature Reviewed:** `documentation/Features/to-do/Employee-User-Entity-and-Role.md`
- **Documentation Reviewed:** [[Memory/brief]], [[Memory/product]], [[Memory/context]], [[Memory/architecture]], [[Memory/tech]], [[Memory/progress]], [[Memory/known-issues]], [[ADRs/ADR-index]]
- **Code Reviewed:**
  - `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java`
  - `backend/src/main/java/com/agentForgeBackend/agentForgeBackendApplication.java`
  - `backend/src/main/java/com/agentForgeBackend/shared/defaultImplements/DefaultServiceImplements.java`
  - `backend/src/main/java/com/agentForgeBackend/shared/models/baseUser/BaseUserEntity.java`
  - `backend/src/main/java/com/agentForgeBackend/shared/securityUser/BaseUserRepository.java`
  - `backend/src/main/java/com/agentForgeBackend/shared/securityUser/SecurityUser.java`
  - `backend/src/main/java/com/agentForgeBackend/models/hq/client/ClientEntity.java`
- **Logs Reviewed:** No — this is a document/architecture review.
- **Runtime Evidence:** Not applicable; findings are based on static document/code review.

### Root Cause Analysis

The Feature is a strong first draft, but it mixes a new domain model with broader security hardening. That is the right direction for safety, but it requires additional precision. The current backend has several pre-existing sharp edges: security annotations without discovered method-security enablement, no explicit HTTP request authorization DSL, a shared base-user uniqueness namespace, a generic single-form CRUD abstraction, and an incomplete generic update method. The Feature names most of these risks but does not fully turn them into implementation contracts.

### Evidence in Code

- `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java:47-58` — security filter chain has no explicit request authorization matrix.
- `backend/src/main/java/com/agentForgeBackend/agentForgeBackendApplication.java:8-11` — no `@EnableMethodSecurity` present in the main application class.
- `backend/src/main/java/com/agentForgeBackend/shared/defaultImplements/DefaultServiceImplements.java:54-98` — inherited CRUD methods use broad `isAuthenticated()` authorization.
- `backend/src/main/java/com/agentForgeBackend/shared/defaultImplements/DefaultServiceImplements.java:89-94` — base update loads and saves the entity without applying form data.
- `backend/src/main/java/com/agentForgeBackend/shared/models/baseUser/BaseUserEntity.java:33-47` — email and username uniqueness are shared at the base-user table level.
- `backend/src/main/java/com/agentForgeBackend/shared/securityUser/BaseUserRepository.java:8-10` — base repository currently provides username lookup only.
- `backend/src/main/java/com/agentForgeBackend/models/hq/client/ClientEntity.java:19-20` — Client contains the API-key field Employee must not copy.
- `backend/src/main/java/com/agentForgeBackend/models/hq/client/ClientEntity.java:33-34` — Client has a recursive `getBaseUser()` method that Employee must not copy.

### Affected Systems / Modules

- [[Employee-User-Entity-and-Role 1|Employee User Entity and Role]] — parent Feature document that should be patched if findings are accepted.
- [[Memory/architecture|Architecture]] — describes the shared user model and security flow affected by the feature.
- [[Memory/known-issues|Known Issues & Constraints]] — already records method-security, CRUD update, CORS, and Client recursion gotchas relevant to these findings.
- [[Memory/tech|Tech Stack]] — documents Spring Security, Spring Data JPA, QueryDSL, and testing constraints.

### Affected Processes

- Feature creation and task planning for the Employee user domain.
- Security hardening and authorization test planning.
- Future Task creation from this Feature.

---

## Supporting Logs

No runtime logs were reviewed. This is a static Feature document review.

### Log Analysis

Not applicable.

### Confidence Level

Strong hypothesis.

The findings are supported by direct reads of the Feature and current backend code. Exact runtime behavior still needs validation in implementation tasks because Spring Security behavior can depend on the final filter-chain configuration and test setup.

### Remaining Uncertainty / Open Questions

- Whether Employee update should support password changes in the same endpoint or defer to a dedicated password-change workflow.
- Whether `/admin/**` and `/client/**` should be fully hardened in this same Feature or only regression-tested while Employee is added.
- Whether the implementation should introduce a shared identity-policy module immediately or keep the uniqueness logic local to Employee first.

---

## Solution Direction

### Proposed Fix

Patch `documentation/Features/to-do/Employee-User-Entity-and-Role.md` to resolve the pending decisions:

1. Add an explicit authorization matrix.
2. Define create/update password contracts.
3. Require shared base-user uniqueness methods and cross-role duplicate tests.
4. Reorder test planning into vertical behavior slices.
5. Choose the Employee service class name and avoid speculative `AuthUserUtil` coupling.

### Why This Fix Is Correct

The Feature will become implementation-ready: security-sensitive behavior will be specified, password handling will be deterministic, identity uniqueness will match the actual data model, and tests will be tied to observable behavior rather than implementation structure.

### Skills and Documentation Used During Analysis and Solution Validation

- `feature-reviewer` — guided the review workflow and finding structure.
- `documentation-management` — provided Feature/Bug document templates and status locations.
- `memory-bank` — supplied project architecture, tech stack, current context, and known issues.
- `doc-exploration` — checked ADRs and related documentation; only the ADR index and Memory Bank documents currently exist.
- `solid-deep-design` — informed module cohesion, seam discipline, and avoidance of speculative helper coupling.
- `tdd` — informed the finding about vertical slices and behavior-first tests.
- Context7: Spring Security 6.5 — verified `@EnableMethodSecurity`, `@PreAuthorize`, `hasRole`, and `authorizeHttpRequests` patterns.
- Context7: Spring Data JPA / Hibernate ORM — verified repository, QueryDSL, JOINED inheritance, and enum mapping considerations.

### Files to Modify or Create

- `documentation/Features/to-do/Employee-User-Entity-and-Role.md` — patch accepted findings into the Feature document.

### Validation Strategy After Fix

#### Automatic Validation

- [ ] Re-read the Feature document and confirm each finding has a concrete resolution.
- [ ] Verify the Feature still follows the Feature template required by `documentation-management`.
- [ ] Confirm the Findings Summary Table below is updated when decisions are recorded.

#### Manual Validation

- [ ] Confirm the user agrees with the password update contract and authorization matrix.

### Potential Risks / Notes

- Over-scoping security hardening can delay the Employee entity itself, but under-scoping it can leave Employee management unsafe.
- Separate create/update forms may require custom controller methods rather than the generic `DefaultController` path.
- Introducing a shared identity-policy module may touch Admin/Client in addition to Employee; keep it narrow if created.

---

## Resolution Steps

### Phase 1: Resolve high-severity design gaps

- [ ] **Step 1.1:** Add an explicit security authorization matrix to the Feature.
- [ ] **Step 1.2:** Define the Employee create/update password contract.

### Phase 2: Resolve moderate implementation-contract gaps

- [ ] **Step 2.1:** Specify base-user uniqueness repository methods or shared identity policy.
- [ ] **Step 2.2:** Add cross-role duplicate username/email tests to the planned test scope.
- [ ] **Step 2.3:** Reorder test phases into behavior-first vertical slices.

### Phase 3: Resolve low-severity ambiguity

- [ ] **Step 3.1:** Choose one Employee service class name.
- [ ] **Step 3.2:** Clarify that full `AuthUserUtil` Employee entity lookup is deferred until a real caller exists.

---

## Task Breakdown

### Task 1: Patch Feature Security and Password Contracts

- **Steps Covered:** Step 1.1, Step 1.2
- **Reason for Grouping:** These are high-severity decisions that must be resolved before implementation tasks are created.
- **Planned Task File:** `Review-of-Employee-User-Entity-and-Role-step-1-security-password-contracts.md`
- **Task Document Link:** Add when the task document is created

### Task 2: Patch Feature Identity and Test Planning

- **Steps Covered:** Step 2.1, Step 2.2, Step 2.3
- **Reason for Grouping:** These findings are related to implementation correctness and validation quality.
- **Planned Task File:** `Review-of-Employee-User-Entity-and-Role-step-2-identity-test-planning.md`
- **Task Document Link:** Add when the task document is created

### Task 3: Patch Feature Naming and Helper Scope

- **Steps Covered:** Step 3.1, Step 3.2
- **Reason for Grouping:** These are low-severity documentation cleanups that can be handled together.
- **Planned Task File:** `Review-of-Employee-User-Entity-and-Role-step-3-naming-helper-scope.md`
- **Task Document Link:** Add when the task document is created

---

## Expected Outcome After Fix

- The Employee Feature will be ready for Task creation.
- Admin-only Employee management will have a clear security contract.
- Employee password behavior will be deterministic and testable.
- User identity uniqueness will align with the shared `base_user` model.
- Tests will be planned as behavior-first vertical slices.

---

## Findings Summary Table

| # | Title | Severity | Status |
|---|-------|----------|--------|
| 1 | Security hardening is included but the authorization matrix is not explicit enough | 🟠 High | Done |
| 2 | Employee create/update password semantics are ambiguous | 🟠 High | Done |
| 3 | Global username/email uniqueness is identified but not specified as a concrete implementation contract | 🟡 Moderate | Done |
| 4 | The test plan says TDD, but the phase/task ordering still risks horizontal or non-behavioral tests | 🟡 Moderate | Done |
| 5 | Service naming and optional helper scope are still ambiguous | 🟢 Low | Done |

## Affected Documentation

- [[Employee-User-Entity-and-Role 1|Employee User Entity and Role]] — parent Feature requiring decisions/patches.
- [[Memory/architecture|Architecture]] — impacted by security and user-model decisions.
- [[Memory/known-issues|Known Issues & Constraints]] — related known security and CRUD constraints.
- [[Memory/tech|Tech Stack]] — related framework/testing constraints.
