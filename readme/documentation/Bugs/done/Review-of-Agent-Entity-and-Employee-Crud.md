#high #architectural

## Bug: Review of Agent Entity and Employee CRUD

### Summary

This is a pre-implementation review of the feature document at `documentation/Features/to-do/Agent-Entity-and-Employee-Crud.md`. The feature adds `AgentEntity` — a reusable LLM persona owned by an Employee — with full employee-scoped CRUD. 8 findings were identified: 3 high, 3 moderate, and 2 low. No findings are critical — the core architecture is sound, but several design gaps could cause data leaks, runtime errors, or silent update failures if left unresolved before implementation begins.

### Reproduction Conditions

These are design-level findings, not runtime bugs. Each finding describes a gap in the feature document that would manifest during or after implementation.

### Findings

---

#### Finding 1 — Admin Users Can Reach Agent Endpoints and Cause Runtime Errors

**Severity:** 🟠 High

**Description:**
The HTTP security rule for `/agent/**` is `authenticated`, not `hasRole("EMPLOYEE")`. This means a logged-in Admin can send requests to any agent endpoint. The service then calls `AuthUserUtil.getAuthUserEmployeeEntity()`, which attempts to load the current principal as an `EmployeeEntity`. For an Admin principal, this returns `Optional.empty()` (or throws, depending on implementation). If the service calls `.get()` or `.orElseThrow(ItemNotFoundException(...))` on the result, an Admin receives either an `ItemNotFoundException` (confusing — "agent not found" when no agent was requested) or an `NPE` if the empty Optional is not guarded.

**Why It Matters:**
An Admin who stumbles onto `/agent/**` by mistake receives a misleading or crashing error response. More importantly, the service's ownership model assumes the caller is always an Employee — this assumption is never enforced at the HTTP boundary.

**Possible Solutions:**
1. Change the HTTP security rule to `.requestMatchers("/agent/**").hasRole("EMPLOYEE")` — blocks Admins (and Clients) at the HTTP layer before they reach the service. Cleanest.
2. Keep `authenticated` at HTTP layer and add an explicit guard in `AgentService` before calling `getAuthUserEmployeeEntity()` — if the principal is not an Employee, throw `AccessDeniedException("Only employees can manage agents")`.

**Recommended Solution:** Option 1 — `hasRole("EMPLOYEE")` at the HTTP layer. It's a single-line change, eliminates the runtime path entirely, and mirrors the intent described in the feature ("Employees manage their own agents; Admins have no agent management access"). It introduces the first `ROLE_EMPLOYEE` HTTP rule in `SecurityConfig`, which is the correct and consistent place for role-based HTTP gating.

**Decision:** Option 1 (enhanced) — Apply `hasRole("EMPLOYEE")` at BOTH the HTTP layer (`SecurityConfig`) AND the service layer (`@PreAuthorize("hasRole('EMPLOYEE')")` on `AgentService` class). This matches the established defense-in-depth pattern used by every other domain in the codebase (`EmployeeService`, `LlmModelService`, `AdminServiceImpl` all enforce the same role at both HTTP and service layers). Rationale: HTTP-layer blocking eliminates the runtime error path for non-employee principals; service-layer annotation ensures protection when called outside HTTP context (tests, batch jobs). Date: 2026-06-17. Parent document patched: yes — user stories 13, 15, Implementation Architecture §1, §7, and Impact Analysis updated.

---

#### Finding 2 — `getAll()` Is a Silent Data Leak if Not Properly Overridden

**Severity:** 🟠 High

**Description:**
`DefaultServiceImplements.getAll()` returns all entities in the table — it has no ownership scoping. `DefaultController` exposes a `GET /agent` (or equivalent) endpoint that calls `getAll()`. The feature document mentions overriding it but treats it as an afterthought: "Override `getAll()` to scope by owner (used rarely; included for consistency)." This framing undersells a serious data privacy risk — an unoverridden `getAll()` would return every employee's agents to any authenticated request.

**Why It Matters:**
If `getAll()` is not overridden before the controller is wired up (even transiently during development), all agents from all employees are visible to any authenticated principal. This directly violates the core ownership constraint stated throughout the feature.

**Possible Solutions:**
1. Elevate `getAll()` override to a first-class implementation step (alongside `getListPage()`), with explicit implementation detail: load the current employee and filter `findAll()` by owner using a repository method `findAllByOwner(EmployeeEntity owner)`.
2. Override `getAll()` to throw `UnsupportedOperationException` — it is not a meaningful endpoint for an ownership-scoped resource and `getListPage()` is the correct paginated equivalent.

**Recommended Solution:** Option 2 — throw `UnsupportedOperationException` (or a 405 Method Not Allowed) from `getAll()`. The `POST /agent/list` endpoint is the correct way to retrieve a scoped, paginated list. A `GET /agent` endpoint that returns all records has no valid use case for an employee-owned resource. Disabling it explicitly is cleaner than implementing a poorly-needed `findAllByOwner()` path. Add a note to `AgentRepository` skipping `findAll()` for direct use.

**Decision:** Option 2 (refined) — Override `getAll()` in `AgentService` to throw `ResponseStatusException(HttpStatus.METHOD_NOT_ALLOWED, "Use POST /agent/list for scoped agent retrieval")`. Raw `UnsupportedOperationException` would produce HTTP 500 since `GlobalExceptionHandler` has no handler for it; `ResponseStatusException` produces the correct 405 response. Guards at the service layer for defense-in-depth. No new repository method needed. Rationale: unpaginated full-list dump has no valid use case for an ownership-scoped resource; `POST /agent/list` is the correct paginated, scoped alternative. Date: 2026-06-17. Parent document patched: yes — feature doc §7 `getAll()` description updated.

---

#### Finding 3 — `recurrentPrompt` Cannot Be Cleared Once Set

**Severity:** 🟠 High

**Description:**
The service `update()` logic applies "non-null form fields to entity." If `AgentForm.recurrentPrompt` is `null`, it is skipped — the existing value is preserved. This means an employee who adds a `recurrentPrompt` to their Agent can never remove it through the update endpoint. Once set, `recurrentPrompt` is permanent.

This is a real UX scenario: an employee tries the recurrent prompt feature, finds it counterproductive, and wants to revert to a plain agent.

**Why It Matters:**
The feature explicitly calls `recurrentPrompt` optional. An optional field that cannot be un-set is a broken contract.

**Possible Solutions:**
1. Use `""` (empty string) as a sentinel value for "clear this field." If `recurrentPrompt` is `""` in the form, set `entity.setRecurrentPrompt(null)`. If it's `null`, skip (preserve). This is a convention, not a type-safe approach.
2. Treat `null` on `recurrentPrompt` as "clear it" and use a different mechanism (e.g., a separate boolean `clearRecurrentPrompt` flag in the form) to distinguish "not provided" from "explicitly cleared."
3. Use `Optional<String>` in the form to distinguish absent (not provided) from present-null (explicitly cleared). Spring's `@RequestBody` JSON deserialization can handle `Optional` fields.

**Recommended Solution:** Option 1 — the empty string sentinel. It's the simplest, matches how other nullable String fields are commonly handled in this codebase (e.g., `description`), and is easy to test. Document the convention clearly in the `AgentForm` field: `// null = preserve, "" = clear`. Validate in the service: if blank and not null, set to null on the entity.

**Decision:** Alternative chosen — Full-state PUT. Since `AgentService` must override `update()` completely (base is a no-op), implement with correct HTTP PUT semantics: apply every form field unconditionally. `name` and `initPrompt` are `@NotBlank`-validated by `@Valid`; `description` and `recurrentPrompt` are nullable — null means "no value" (clear). This eliminates the root cause (PATCH semantics on a PUT endpoint) rather than patching over it with sentinel conventions. Solves both `recurrentPrompt` and `description` uniformly with 4 unconditional setters, zero branching, zero conventions to document. Rationale: `@PutMapping` means "replace the resource"; the "skip null" pattern is semantically wrong for PUT and creates the same "cannot clear" bug in every domain. Date: 2026-06-17. Parent document patched: yes — feature doc §7 `update()` description updated.

---

#### Finding 4 — `findByIdAndOwner` Should Use `ownerId` (Long) Instead of Entity Object

**Severity:** 🟡 Moderate

**Description:**
The feature proposes `findByIdAndOwner(Long id, EmployeeEntity owner)` as a Spring Data derived query. Internally, Spring Data / Hibernate translates this to `WHERE id = ? AND owner_id = ?` using the entity's PK. This works when the entity is managed (within an active transaction). However, `AuthUserUtil.getAuthUserEmployeeEntity()` may return a detached entity depending on how it is implemented — accessing an entity that was loaded in a prior transaction and is no longer within the current persistence context. Passing a detached entity to a Spring Data query can produce unexpected behavior with some JPA provider configurations.

**Why It Matters:**
Using a detached entity in a derived query is a subtle JPA footgun. It works in most cases but can cause `DetachedObjectException` or silent ID mismatches with certain Hibernate versions.

**Possible Solutions:**
1. Change the repository method to `findByIdAndOwnerId(Long id, Long ownerId)` — Spring Data resolves this to `WHERE id = ? AND owner_id = ?` using a primitive Long, completely avoiding entity attachment concerns.
2. Ensure the calling service method runs within a transaction and that the `EmployeeEntity` is loaded fresh within that transaction.

**Recommended Solution:** Option 1 — `findByIdAndOwnerId(Long id, Long ownerId)`. It's a single naming change, is more explicit about what the query actually uses (the owner's ID, not the full entity), and eliminates any proxy/detachment ambiguity. The service calls: `repository.findByIdAndOwnerId(id, currentEmployee.getId())`. Parallelly change `existsByNameAndOwner` to `existsByNameAndOwnerId(String name, Long ownerId)`.

**Decision:** Option 1 — Rename to `findByIdAndOwnerId(Long id, Long ownerId)` and `existsByNameAndOwnerId(String name, Long ownerId)`. Spring Data resolves these to SQL using primitive Long bind parameters, eliminating entity attachment concerns entirely. Service call sites updated to pass `currentEmployee.getId()`. Rationale: more honest interface (ISP), single SQL query, eliminates detached-entity risk class. Date: 2026-06-17. Parent document patched: yes — feature doc §5 and §7 updated.

---

#### Finding 5 — `getListPage()` Ownership Predicate Injection Approach Not Specified

**Severity:** 🟡 Moderate

**Description:**
The feature says `getListPage()` should "AND [the ownership predicate] with the user-supplied predicate from the request" but doesn't describe the QueryDSL approach for combining predicates. `DefaultServiceImplements.getListPage()` calls `QueryPredicateBuilder.build(request, queryProfile)` to produce a `Predicate`, then passes it to `findAll(predicate, pageRequest)`. The override needs to obtain the base predicate and combine it with the owner predicate — but `QueryPredicateBuilder.build()` isn't called in the override directly (it's called internally by the base class).

**Why It Matters:**
Without a specified approach, the task implementer must understand the internals of `DefaultServiceImplements.getListPage()` and `QueryPredicateBuilder` to know how to inject the predicate. This creates implementation ambiguity and risks either (a) the predicate not being applied at all, or (b) the base pageable logic being bypassed.

**Possible Solutions:**
1. Override `getListPage()` to manually call `QueryPredicateBuilder.build(request, queryProfile)` (injected into the service), then AND the result with the owner predicate using `new BooleanBuilder(basePredicate).and(ownerPredicate)`, then call `repository.findAll(combinedPredicate, pageRequest)` directly.
2. Add a protected hook method to `DefaultServiceImplements.getListPage()` (e.g., `Predicate additionalPredicate()`) that subclasses can override to inject extra predicates. The base class ANDs this into the query automatically.

**Recommended Solution:** Option 1 — explicit override calling `QueryPredicateBuilder.build()` directly. Option 2 would require modifying the shared scaffold class which could affect other domains. The feature document's Implementation Architecture section for `AgentService` should be updated with a code sketch showing the exact override pattern.

**Decision:** Alternative chosen — Change `queryPredicateBuilder` and `pageableFactory` from `private` to `protected` in `DefaultServiceImplements` (two-word diff, consistent with `repository`, `mapper`, `queryProfile` already being `protected`), then override `getListPage()` in `AgentService` using the inherited fields directly. This eliminates the dual-reference anti-pattern of injecting duplicate fields, adds zero business logic to the base class (respecting known-issues.md), and enables a clean override. Feature doc §7 updated with code sketch. Rationale: fixes existing field visibility inconsistency, minimum-change solution. Date: 2026-06-17. Parent document patched: yes.

---

#### Finding 6 — Mapper Accesses Lazy-Loaded `owner` — LazyInitializationException Risk

**Severity:** 🟡 Moderate

**Description:**
`AgentMapper.toDTO()` maps `entity.getOwner().getId()` to populate `ownerId` in `AgentDTO`. `AgentEntity.owner` is declared `@ManyToOne(fetch = FetchType.LAZY)`. If the mapper is ever called on an `AgentEntity` that was loaded outside of an active Hibernate session (e.g., passed from a detached context or loaded with a projection that doesn't initialize the owner proxy), accessing `entity.getOwner().getId()` will throw `LazyInitializationException`.

In normal service-layer usage (within a `@Transactional` method), this is fine because the session is active. But if a test, a background job, or a future caller ever accesses `AgentMapper.toDTO()` on a detached entity, it will fail silently in non-obvious ways.

**Why It Matters:**
This is a latent risk that is not a problem today but will surface the moment the mapper is used outside a transaction — common in tests that load entities without a service layer.

**Possible Solutions:**
1. Use `@ManyToOne(fetch = FetchType.EAGER)` — the owner is always loaded with the agent. Simple, but loads extra data on every agent fetch.
2. In `AgentMapper.toDTO()`, use a null-safe check: `entity.getOwner() != null ? entity.getOwner().getId() : null`. This doesn't fix detachment but avoids NPE.
3. Use a JOIN FETCH in `findByIdAndOwner` (or `findByIdAndOwnerId`) to explicitly initialize the owner proxy within the same query: `@Query("SELECT a FROM AgentEntity a JOIN FETCH a.owner WHERE a.id = :id AND a.owner.id = :ownerId")`.
4. Remove `ownerId` from `AgentDTO` — since agents are always owner-scoped and the employee knows their own ID, exposing `ownerId` in the response is redundant and adds the mapping risk for zero UX benefit.

**Recommended Solution:** Option 4 — remove `ownerId` from `AgentDTO`. The employee is always the owner; returning `ownerId` in the response is information the caller already has (their own JWT) and creates a mapping dependency on a lazy-loaded association. If `ownerId` is truly needed for some API consumer in the future, add it back with a JOIN FETCH. For now, omitting it avoids the lazy-load risk entirely with zero loss of value.

**Decision:** Alternative chosen — No production code changes needed. Hibernate guarantees that `getId()` on a lazy proxy does NOT trigger initialization; the FK identifier is stored inside the proxy at construction time. Since `AgentMapper.toDTO()` only accesses `entity.getOwner().getId()` (never a non-key property), no `LazyInitializationException` can occur regardless of transaction context. This is a documented Hibernate ORM contract. Action: add a comment in `AgentMapper.toDTO()` documenting the guarantee, and add a regression test that verifies `toDTO()` succeeds on a proxy outside a transaction. `ownerId` remains in `AgentDTO` as the feature spec requires. Rationale: the finding's premise is incorrect for this specific access pattern; removing `ownerId` would solve a non-existent problem and contradict the feature spec. Date: 2026-06-17. Parent document patched: yes — feature doc §4 mapper note and §Testing added.

---

#### Finding 7 — Phase 1 Security Test Mechanism Not Specified

**Severity:** 🟢 Low

**Description:**
The LlmModel feature (Phase 1, Step 1.1) explicitly documented: "Phase 1 exception: no controller exists yet, so real JWT via `TestAuthenticationHelper` is not applicable — Phase 3-4 controller tests will use the full JWT pattern." The Agent feature's Step 1.1 says "write failing security tests" without specifying whether to use `@WithMockUser` (acceptable for Phase 1) or `TestAuthenticationHelper` (requires a running controller). Without this specification, an implementer may write Phase 1 tests that attempt real JWT flows, which would require the controller to exist first and fail unnecessarily.

**Why It Matters:**
Minor — but inconsistency in test patterns across features increases cognitive overhead during implementation and review.

**Possible Solutions:**
1. Add explicit note to Step 1.1: "Phase 1 exception: use `@WithMockUser(roles = 'EMPLOYEE')` for security tests in this phase; `TestAuthenticationHelper`-based JWT tests belong in Phase 3–4 once the controller exists."

**Recommended Solution:** Option 1 — add the note. One sentence, zero implementation cost.

**Decision:** Option 1 — Add explicit note to Step 1.1 specifying `@WithMockUser(roles = "EMPLOYEE")` for Phase 1 security tests. Date: 2026-06-17. Parent document patched: yes.

---

#### Finding 8 — `@Transactional` Behavior Not Documented

**Severity:** 🟢 Low

**Description:**
The LlmModel and Employee features both explicitly noted that service methods inherit `@Transactional(rollbackFor = {...})` from `DefaultServiceImplements` at the class level, and that no method-level `@Transactional` is needed. The Agent feature does not mention transactional behavior at all. For `delete()` in particular — where an entity is loaded and then deleted — transaction management is not trivial.

**Why It Matters:**
Low risk given the base class provides the transaction boundary. However, new contributors implementing `AgentService` may add redundant or incorrect `@Transactional` annotations out of uncertainty.

**Possible Solutions:**
1. Add a brief note to the `AgentService` implementation section: "Transaction coverage is inherited from `DefaultServiceImplements`'s class-level `@Transactional(rollbackFor = {...})`. Do not add method-level `@Transactional` annotations — this mirrors the `LlmModelService` convention."

**Recommended Solution:** Option 1 — add the note.

**Decision:** Option 1 — Add note to AgentService §7 about inherited `@Transactional` from `DefaultServiceImplements`. Date: 2026-06-17. Parent document patched: yes.

---

### Findings Summary Table

| # | Title | Severity | Status |
|---|-------|----------|--------|
| 1 | Admin users can reach `/agent/**` and cause runtime errors | 🟠 High | Done |
| 2 | `getAll()` is a silent data leak if not properly overridden | 🟠 High | Done |
| 3 | `recurrentPrompt` cannot be cleared once set | 🟠 High | Done |
| 4 | `findByIdAndOwner` should use `ownerId` (Long) instead of entity object | 🟡 Moderate | Done |
| 5 | `getListPage()` ownership predicate injection approach not specified | 🟡 Moderate | Done |
| 6 | Mapper accesses lazy-loaded `owner` — LazyInitializationException risk | 🟡 Moderate | Done |
| 7 | Phase 1 security test mechanism not specified | 🟢 Low | Done |
| 8 | `@Transactional` behavior not documented | 🟢 Low | Done |

---

### Affected Documentation

- [[Memory/architecture|Architecture]] — `AgentService` ownership model and `SecurityConfig` route gating affect the described auth flow and module map.
- [[Memory/known-issues|Known Issues & Constraints]] — Findings 2 and 6 relate to existing notes on lazy loading and `DefaultServiceImplements.update()` no-op behavior.
- [[ADRs/ADR-006-nullable-agent-fk-for-conversation-type]] — Finding 1 (EMPLOYEE-only HTTP rule) affects how `ConversationEntity` will later access agents; the FK target must be accessible to employees, not admins.
- [[ADRs/ADR-008-agent-prompts-not-persisted-as-messages]] — Finding 3 (clearing `recurrentPrompt`) is directly adjacent to the ADR's design — prompts are reconstructed at runtime from `AgentEntity`, so clearing `recurrentPrompt` immediately affects all future messages in open agent conversations.
- [[Features/to-do/Agent-Entity-and-Employee-Crud]] — The feature document being reviewed.
