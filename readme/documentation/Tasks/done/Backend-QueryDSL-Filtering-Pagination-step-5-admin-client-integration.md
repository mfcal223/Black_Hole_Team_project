# Task: Integrate Admin And Client List Query Support

#task #current #medium-complexity #parent-backend-querydsl-filtering-pagination

**Parent:** [[Backend-QueryDSL-Filtering-Pagination]]
**Parent Type:** Feature
**Related Step(s):** Phase 5, Steps 5.1 - 5.6
**Estimated Complexity:** Medium

---

## Goal

Integrate the current controller-backed Admin and Client entity slices with the new QueryDSL list-query architecture by giving each slice an explicit list DTO, an explicit query profile, mapper support, and concrete service/controller wiring for the inherited `POST /list` endpoint.

This standalone task document records the Phase 5 scope after the production wiring was completed as a Task 4 scope expansion. It should be used as the audit trail and acceptance checklist for the Admin/Client integration work, while the remaining endpoint-level validation belongs to Task 6.

---

## Parent Context

The parent feature [[Backend-QueryDSL-Filtering-Pagination]] adds reusable pageable, sortable, filterable list endpoints to the Spring Boot backend under `code/backend/`.

Completed prerequisites:

- [[Backend-QueryDSL-Filtering-Pagination-step-1-configure-querydsl]] added OpenFeign QueryDSL `6.12`, configured annotation processing through `maven-compiler-plugin`, and verified generated Q classes.
- [[Backend-QueryDSL-Filtering-Pagination-step-2-request-model]] added the transport-only `PageableRequest`, sort request, filter request, operation request, and enum model under `com.authServer.shared.query`.
- [[Backend-QueryDSL-Filtering-Pagination-step-3-query-infrastructure]] added explicit field metadata, stateless predicate/pageable builders, value conversion, and controlled `400 Bad Request` query errors.
- [[Backend-QueryDSL-Filtering-Pagination-step-4-generic-crud-integration]] extended the generic CRUD contracts with `LISTDTO`, `QuerydslPredicateExecutor`, generic `POST /list`, and `DefaultServiceImplements.getListPage(...)`.

Task 4 made `POST /list` inherited by concrete controllers. That created an immediate runtime-safety requirement: Admin and Client could not remain only partially wired after the generic endpoint existed. The minimum real Task 5 production work was therefore implemented during Task 4 to avoid placeholder profiles, unsupported endpoints, or runtime `500` responses.

Important parent constraints preserved by this task:

- Use explicit allowlisted query profiles for every exposed filter/sort field.
- Do not use reflection, arbitrary client field names, mutable request state, or runtime-only unsupported paths.
- Keep controllers thin and entity-agnostic; entity-specific field metadata belongs in `EntityQueryProfile` implementations.
- Keep list DTOs separate from detail DTOs so list endpoints can expose safe and minimal read models.
- Do not expose passwords or API keys in list DTOs or query profiles.

---

## Execution Status

This task's production code was already completed on 2026-04-27 as part of [[Backend-QueryDSL-Filtering-Pagination-step-4-generic-crud-integration]]. This document formalizes that work and records the design decisions, affected files, and completion criteria for Phase 5.

No new production code is required solely because this task document exists. Future work should only modify these files if Task 6 validation reveals a defect or if the product owner changes the field exposure rules.

---

## Preconditions / Dependencies

- `code/backend/pom.xml` uses Spring Boot `3.4.1`, Java `21`, OpenFeign QueryDSL `6.12`, and Spring Data dependencies managed by the Spring Boot parent.
- Generated QueryDSL types exist after Maven compilation, including `QAdminEntity` and `QClientEntity`.
- `DefaultRepository<ENTITY, ID>` extends `QuerydslPredicateExecutor<ENTITY>`.
- `DefaultMapper`, `DefaultService`, `DefaultController`, and `DefaultServiceImplements` already include the `LISTDTO` generic parameter.
- `DefaultServiceImplements.getListPage(...)` already delegates to `QueryPredicateBuilder`, `PageableFactory`, repository `findAll(predicate, pageable)`, and `Page.map(mapper::toListDTO)`.
- `AdminController` and `ClientController` inherit the generic `POST /list` endpoint from `DefaultController`.
- The backend Maven wrapper is incomplete because `.mvn/wrapper/maven-wrapper.properties` is missing; use system Maven with Java 21 for validation until repaired.
- Default `mvn test` is blocked by the known `TestLauncher` empty-suite discovery issue; use targeted Maven validation until that separate build-hygiene issue is fixed.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `memory-bank` - **Selected** - confirmed AgentForge context, backend layering, current QueryDSL feature status, OpenFeign QueryDSL `6.12`, and known build/test blockers.
- `documentation-management` - **Selected** - this is a Task document under `documentation/Tasks/current/` and must link back to the parent feature.
- `solid` - **Selected** - guides the responsibility split: query profiles own field metadata, mappers own DTO conversion, services coordinate, controllers only delegate.
- `find-docs` / Context7 - **Selected** - Context7 resolution for Spring Data JPA and OpenFeign QueryDSL was attempted on 2026-04-27 but the workspace quota is exhausted. Official Spring and OpenFeign documentation was used as fallback.

### Documentation Reviewed

- Context7: Spring Data JPA - attempted; blocked by `Monthly quota exceeded`.
- Context7: OpenFeign QueryDSL - attempted; blocked by `Monthly quota exceeded`.
- `code/backend/pom.xml` - verified Spring Boot `3.4.1`, Java `21`, OpenFeign QueryDSL `6.12`, and Maven annotation processor configuration.
- Spring Data JPA reference, Querydsl Extension - confirms Spring Data repositories opt into QueryDSL by extending `QuerydslPredicateExecutor`; also documents the OpenFeign fork groupId `io.github.openfeign.querydsl` and Maven compiler annotation processing for generated Q classes.
- Spring Data Commons `3.4.1` Javadoc, `QuerydslPredicateExecutor` - confirms `findAll(Predicate, Pageable)` returns `Page<T>` and requires non-null predicate/pageable values.
- Spring Data Commons `3.4.1` Javadoc, `Page` - confirms `Page.map(Function)` returns a new mapped page while preserving pagination metadata.
- OpenFeign QueryDSL JPA tutorial - confirms QueryDSL JPA generates Q types from `jakarta.persistence.Entity` classes and supports type-safe predicates.
- OpenFeign QueryDSL code generation guide - confirms the recommended `maven-compiler-plugin` APT path and `querydsl-apt` `jpa` classifier.

### Related Existing Code

- `code/backend/src/main/java/com/authServer/models/hq/admin/AdminListDTO.java:19` - Admin list-view DTO.
- `code/backend/src/main/java/com/authServer/models/hq/admin/AdminQueryProfile.java:14` - Admin query/sort field allowlist.
- `code/backend/src/main/java/com/authServer/models/hq/admin/AdminMapper.java:10` - Admin mapper implements `DefaultMapper<AdminDTO, AdminMiniDTO, AdminListDTO, AdminForm, AdminEntity>`.
- `code/backend/src/main/java/com/authServer/models/hq/admin/AdminServiceImpl.java:17` - Admin service extends `DefaultServiceImplements` with `AdminListDTO` and query dependencies.
- `code/backend/src/main/java/com/authServer/models/hq/admin/AdminController.java:9` - Admin controller inherits `POST /admin/list` through `DefaultController`.
- `code/backend/src/main/java/com/authServer/models/hq/client/ClientListDTO.java:19` - Client list-view DTO.
- `code/backend/src/main/java/com/authServer/models/hq/client/ClientQueryProfile.java:14` - Client query/sort field allowlist.
- `code/backend/src/main/java/com/authServer/models/hq/client/ClientMapper.java:11` - Client mapper implements `DefaultMapper<ClientDTO, ClientMiniDTO, ClientListDTO, ClientForm, ClientEntity>`.
- `code/backend/src/main/java/com/authServer/models/hq/client/ClientService.java:27` - Client service extends `DefaultServiceImplements` with `ClientListDTO` and query dependencies.
- `code/backend/src/main/java/com/authServer/models/hq/client/ClientController.java:16` - Client controller inherits `POST /client/list` through `DefaultController`.

---

## Implementation Details

### Approach

Keep Admin and Client aligned with the generic architecture instead of adding entity-specific list endpoints. Each entity slice should provide only the concrete pieces required by the shared flow:

- a `LISTDTO` read model for list pages;
- a mapper method converting `ENTITY` to `LISTDTO`;
- an `EntityQueryProfile<ENTITY>` that explicitly allowlists filterable/sortable fields;
- service constructor wiring that supplies the query profile, `PageableFactory`, and `QueryPredicateBuilder` to `DefaultServiceImplements`;
- controller generic parameters that expose the inherited `POST /list` endpoint with the correct `Page<LISTDTO>` response type.

The service flow remains shared:

```java
Predicate predicate = queryPredicateBuilder.build(request, queryProfile);
PageRequest pageRequest = pageableFactory.create(request, queryProfile);

return repository.findAll(predicate, pageRequest)
        .map(mapper::toListDTO);
```

### Files Created

- [x] `code/backend/src/main/java/com/authServer/models/hq/admin/AdminListDTO.java` - list read model for Admin rows.
- [x] `code/backend/src/main/java/com/authServer/models/hq/admin/AdminQueryProfile.java` - explicit Admin field allowlist and default sort.
- [x] `code/backend/src/main/java/com/authServer/models/hq/client/ClientListDTO.java` - list read model for Client rows.
- [x] `code/backend/src/main/java/com/authServer/models/hq/client/ClientQueryProfile.java` - explicit Client field allowlist and default sort.

### Files Modified

- [x] `code/backend/src/main/java/com/authServer/models/hq/admin/AdminMapper.java` - added `AdminListDTO` generic type and `toListDTO(...)`.
- [x] `code/backend/src/main/java/com/authServer/models/hq/admin/AdminServiceImpl.java` - supplied `AdminQueryProfile`, `PageableFactory<AdminEntity>`, and `QueryPredicateBuilder<AdminEntity>` to the shared service base class.
- [x] `code/backend/src/main/java/com/authServer/models/hq/admin/AdminController.java` - added `AdminListDTO` to inherited controller generic parameters.
- [x] `code/backend/src/main/java/com/authServer/models/hq/client/ClientMapper.java` - added `ClientListDTO` generic type and `toListDTO(...)`.
- [x] `code/backend/src/main/java/com/authServer/models/hq/client/ClientService.java` - supplied `ClientQueryProfile`, `PageableFactory<ClientEntity>`, and `QueryPredicateBuilder<ClientEntity>` to the shared service base class.
- [x] `code/backend/src/main/java/com/authServer/models/hq/client/ClientController.java` - added `ClientListDTO` to inherited controller generic parameters.

### Field Exposure Matrix

| Field | Admin List DTO | Admin Query Profile | Client List DTO | Client Query Profile | Notes |
|-------|----------------|---------------------|-----------------|----------------------|-------|
| `id` | Yes | Filterable and sortable | Yes | Filterable and sortable | Default sort field, `ASC`. |
| `firstName` | Yes | Filterable and sortable | Yes | Filterable and sortable | Inherited from `BaseUserEntity`. |
| `lastName` | Yes | Filterable and sortable | Yes | Filterable and sortable | Inherited from `BaseUserEntity`. |
| `email` | Yes | Filterable and sortable | Yes | Filterable and sortable | Safe for list views in current backend. |
| `username` | Yes | Filterable and sortable | Yes | Filterable and sortable | Safe for list views in current backend. |
| `roles` | Yes | No | Yes | No | Exposed in list DTOs but omitted from query profiles because element-collection filtering adds complexity that is not validated yet. |
| `enabled` | Yes | Filterable and sortable | Yes | Filterable and sortable | Main active/inactive list filter. |
| `dateCreated` | Yes | Filterable and sortable | Yes | Filterable and sortable | Existing type is `java.util.Date`. |
| `lastLogin` | Yes | Filterable and sortable | Yes | Filterable and sortable | Existing type is `java.util.Date`. |
| `password` | No | No | No | No | Must never be exposed. |
| `apikey` | Not applicable | Not applicable | No | No | Omitted from Client list and query exposure until security requirements explicitly allow it. |
| account flags except `enabled` | No | No | No | No | Internal Spring Security state, not list-query API surface. |

---

## Step-by-Step Implementation

### Step 1: Create `AdminListDTO` and update `AdminMapper`

**Goal:** Give Admin list pages a dedicated read model and map entities into it.
**Dependencies:** Task 4 `DefaultMapper` contract with `LISTDTO` and `toListDTO(...)`.

- [x] Create `AdminListDTO` in the Admin package.
- [x] Include safe list fields: `id`, `firstName`, `lastName`, `email`, `username`, `roles`, `enabled`, `dateCreated`, and `lastLogin`.
- [x] Omit `password` and internal account flags except `enabled`.
- [x] Update `AdminMapper` to implement `DefaultMapper<AdminDTO, AdminMiniDTO, AdminListDTO, AdminForm, AdminEntity>`.
- [x] Implement `toListDTO(AdminEntity adminEntity)` using role authority strings and no secret fields.

**Why this step is critical:**
List endpoints must not reuse full detail DTOs by default. A dedicated `AdminListDTO` keeps the list response safe and gives future list screens room to evolve without changing detail endpoints.

#### Edge Cases

1. **Null entity:** `AdminMapper.toListDTO(...)` returns `null`, matching the existing mapper style.
2. **Password leakage:** `password` is not present in `AdminListDTO` and is never mapped.
3. **Role shape:** roles are exposed as authority strings, consistent with existing DTO mapping.

---

### Step 2: Create `AdminQueryProfile`

**Goal:** Define the exact Admin fields that clients can filter and sort through `POST /admin/list`.
**Dependencies:** Task 3 `EntityQueryProfile`, `QueryableField`, and generated `QAdminEntity`.

- [x] Create `AdminQueryProfile implements EntityQueryProfile<AdminEntity>`.
- [x] Mark it as a Spring `@Component` for constructor injection into `AdminServiceImpl`.
- [x] Use `QAdminEntity.adminEntity` for type-safe field paths.
- [x] Allow `id`, `firstName`, `lastName`, `email`, `username`, `enabled`, `dateCreated`, and `lastLogin`.
- [x] Mark all allowed fields sortable through explicit sort property mappings.
- [x] Set default sort to `id ASC`.
- [x] Do not include `password`, `roles`, or internal account flags.

**Why this step is critical:**
The profile is the security and stability boundary for dynamic queries. It prevents arbitrary property paths and makes the list-query API intentionally smaller than the entity model.

#### Edge Cases

1. **Unknown filter field:** Task 3 infrastructure rejects it as `InvalidQueryRequestException` and `400 Bad Request`.
2. **Unknown sort field:** `PageableFactory` rejects it before repository execution.
3. **Element collection roles:** roles are deliberately excluded until Task 6 or a future task proves the QueryDSL path and generated SQL behavior are correct.

---

### Step 3: Wire `AdminServiceImpl` and `AdminController`

**Goal:** Connect the Admin slice to the generic list-query service and inherited controller endpoint.
**Dependencies:** Steps 1 and 2, plus Task 4 generic CRUD integration.

- [x] Update `AdminServiceImpl` to extend `DefaultServiceImplements<AdminDTO, AdminMiniDTO, AdminListDTO, AdminForm, AdminEntity, Long>`.
- [x] Inject `AdminQueryProfile`, `PageableFactory<AdminEntity>`, and `QueryPredicateBuilder<AdminEntity>`.
- [x] Pass the repository, mapper, query profile, pageable factory, and predicate builder to `super(...)`.
- [x] Update `AdminController` to extend `DefaultController<AdminDTO, AdminMiniDTO, AdminListDTO, AdminForm, Long>`.
- [x] Do not add an Admin-specific `/list` method; inherit the shared endpoint from `DefaultController`.

**Why this step is critical:**
Admin should use the same path future entities will use. Adding a custom controller method would duplicate the generic architecture and weaken the consistency goal of the feature.

#### Edge Cases

1. **Security:** `getListPage(...)` inherits `@PreAuthorize("isAuthenticated()")` from `DefaultServiceImplements`, while Admin-specific create/read overrides retain their existing authorization rules.
2. **Constructor injection:** missing `AdminQueryProfile` should fail at startup rather than exposing a half-wired runtime path.
3. **Endpoint shape:** the inherited route is `POST /admin/list` because the controller class is mapped to `/admin`.

---

### Step 4: Create `ClientListDTO` and update `ClientMapper`

**Goal:** Give Client list pages a dedicated read model that excludes API key material.
**Dependencies:** Task 4 `DefaultMapper` contract with `LISTDTO` and `toListDTO(...)`.

- [x] Create `ClientListDTO` in the Client package.
- [x] Include safe list fields: `id`, `firstName`, `lastName`, `email`, `username`, `roles`, `enabled`, `dateCreated`, and `lastLogin`.
- [x] Omit `password`, `apikey`, and internal account flags except `enabled`.
- [x] Update `ClientMapper` to implement `DefaultMapper<ClientDTO, ClientMiniDTO, ClientListDTO, ClientForm, ClientEntity>`.
- [x] Implement `toListDTO(ClientEntity clientEntity)` using role authority strings and no secret/API-key fields.

**Why this step is critical:**
Client has a stronger field-exposure concern because the entity/detail model has API-key-related behavior. The list DTO creates a safe response boundary for list views.

#### Edge Cases

1. **API key exposure:** `apikey` is not present in `ClientListDTO` and is not mapped.
2. **Password exposure:** `password` remains absent from the list DTO.
3. **Role shape:** roles are exposed as authority strings, matching Admin list DTO behavior.

---

### Step 5: Create `ClientQueryProfile`

**Goal:** Define the exact Client fields that clients can filter and sort through `POST /client/list`.
**Dependencies:** Task 3 `EntityQueryProfile`, `QueryableField`, and generated `QClientEntity`.

- [x] Create `ClientQueryProfile implements EntityQueryProfile<ClientEntity>`.
- [x] Mark it as a Spring `@Component` for constructor injection into `ClientService`.
- [x] Use `QClientEntity.clientEntity` for type-safe field paths.
- [x] Allow `id`, `firstName`, `lastName`, `email`, `username`, `enabled`, `dateCreated`, and `lastLogin`.
- [x] Mark all allowed fields sortable through explicit sort property mappings.
- [x] Set default sort to `id ASC`.
- [x] Do not include `password`, `roles`, `apikey`, or internal account flags.

**Why this step is critical:**
Client query support must be conservative because dynamic filtering/sorting is part of the public API surface. Explicit allowlisting prevents clients from querying sensitive or unstable entity fields.

#### Edge Cases

1. **API-key filtering request:** rejected as an unknown field because `apikey` is not exposed.
2. **Roles filtering request:** rejected as an unknown field until element-collection support is deliberately designed and tested.
3. **Default sort:** `id ASC` is stable and valid because `id` is explicitly sortable.

---

### Step 6: Wire `ClientService` and `ClientController`

**Goal:** Connect the Client slice to the generic list-query service and inherited controller endpoint.
**Dependencies:** Steps 4 and 5, plus Task 4 generic CRUD integration.

- [x] Update `ClientService` to extend `DefaultServiceImplements<ClientDTO, ClientMiniDTO, ClientListDTO, ClientForm, ClientEntity, Long>`.
- [x] Inject `ClientQueryProfile`, `PageableFactory<ClientEntity>`, and `QueryPredicateBuilder<ClientEntity>`.
- [x] Pass the repository, mapper, query profile, pageable factory, and predicate builder to `super(...)`.
- [x] Update `ClientController` to extend `DefaultController<ClientDTO, ClientMiniDTO, ClientListDTO, ClientForm, Long>`.
- [x] Preserve the existing `/client/token/{username}` endpoint and do not mix token generation with list-query logic.
- [x] Do not add a Client-specific `/list` method; inherit the shared endpoint from `DefaultController`.

**Why this step is critical:**
Client must use the same list-query path as Admin while keeping its existing token endpoint behavior separate. This preserves SRP at the controller and service levels.

#### Edge Cases

1. **Endpoint shape:** the inherited route is `POST /client/list` because the controller class is mapped to `/client`.
2. **Token endpoint:** `/client/token/{username}` remains a separate use case and should not share list DTOs or query profiles.
3. **Constructor injection:** missing `ClientQueryProfile` should fail at startup rather than exposing a broken runtime path.

---

## Design Decisions

**Decision 1:** Treat Task 5 as completed production wiring plus formal documentation.
- **Why:** The inherited generic endpoint from Task 4 made real Admin/Client profiles necessary immediately. The safer implementation path was to add them during Task 4 and then create this standalone document as the Phase 5 audit trail.
- **Alternatives considered:** Leave Admin/Client half-wired until Task 5 execution. Rejected because inherited public endpoints would exist without real query support.

**Decision 2:** Use conservative query profiles for both Admin and Client.
- **Why:** Dynamic filtering/sorting should expose only intentional API fields. Safe base-user fields are enough for current list views and future AgentForge scaffolding.
- **Alternatives considered:** Expose every entity field generated by QueryDSL. Rejected because it would leak internal fields and contradict the parent feature's allowlist rule.

**Decision 3:** Expose `roles` in list DTOs but not in query profiles.
- **Why:** Roles are useful display data for list rows, but role filtering touches an element collection and should wait for focused tests proving QueryDSL behavior and SQL shape.
- **Alternatives considered:** Add role filtering now. Rejected because it would increase risk without a current tested requirement.

**Decision 4:** Omit `apikey` from Client list/query exposure.
- **Why:** API keys are sensitive by default. Until the product explicitly requires API key visibility or lookup, list endpoints should not expose or filter by it.
- **Alternatives considered:** Include `apikey` because the parent feature mentioned it as possible. Rejected because the same parent feature says to defer it if sensitive.

**Decision 5:** Do not add entity-specific `/list` controller methods.
- **Why:** The generic `DefaultController` endpoint is the contract. Entity-specific methods would duplicate behavior and make future entities less consistent.
- **Alternatives considered:** Add `AdminController.getListPage(...)` and `ClientController.getListPage(...)`. Rejected because the generic controller already owns that responsibility.

---

## Testing Considerations

### Automatic Validation

- [x] Prior Task 4 validation: `JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64" mvn clean compile` from `code/backend/` exited `0` after the Admin/Client production wiring was added.
- [x] Prior Task 4 validation: `JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64" mvn clean test -Dtest="authServerApplicationTests,PageableRequestValidationTest,QueryableFieldTest,PageableFactoryTest,QueryPredicateBuilderTest,GlobalExceptionHandlerQueryTest,DefaultServiceImplementsListQueryTest,DefaultControllerListEndpointTest,ClientRepositoryTest"` exited `0` with 51 tests, 0 failures, 0 errors.
- [x] Task 5 execution re-validation on 2026-04-27: source audit confirmed all Admin/Client list DTOs, query profiles, mapper/service/controller wiring, and sensitive-field exclusions are present; the same targeted Maven command exited `0` with 51 tests, 0 failures, 0 errors.
- [ ] Task 6 should add repository/service integration tests proving real `Page<AdminListDTO>` and `Page<ClientListDTO>` behavior against persisted entities.
- [ ] Task 6 should add controller tests for `POST /admin/list` and `POST /client/list`, including success, invalid field, invalid operator, invalid value, and invalid sort cases.
- [ ] Do not use default `mvn test` as the only validation signal until the known `TestLauncher` issue is fixed.

### Manual Validation

- [x] Confirm `AdminListDTO` and `ClientListDTO` do not include `password`.
- [x] Confirm `ClientListDTO` does not include `apikey`.
- [x] Confirm `AdminQueryProfile` and `ClientQueryProfile` do not expose `password`, `roles`, `apikey`, or internal account flags.
- [x] Confirm all exposed query profile fields are explicitly mapped to generated QueryDSL paths.
- [x] Confirm Admin and Client controllers inherit `POST /list` instead of duplicating endpoint code.

**Rule:** Endpoint-level behavior and `400 Bad Request` cases are intentionally deferred to Task 6. This task proves the production wiring exists and follows the field exposure rules.

---

## Related Code Explanations

- `code/backend/src/main/java/com/authServer/models/hq/admin/AdminListDTO.java:19` - Admin list DTO shape.
- `code/backend/src/main/java/com/authServer/models/hq/admin/AdminQueryProfile.java:18` - Admin allowlisted fields and default sort.
- `code/backend/src/main/java/com/authServer/models/hq/admin/AdminMapper.java:39` - Admin entity to list DTO conversion.
- `code/backend/src/main/java/com/authServer/models/hq/admin/AdminServiceImpl.java:21` - Admin query collaborator constructor injection.
- `code/backend/src/main/java/com/authServer/models/hq/admin/AdminController.java:9` - Admin inherited controller generic signature.
- `code/backend/src/main/java/com/authServer/models/hq/client/ClientListDTO.java:19` - Client list DTO shape.
- `code/backend/src/main/java/com/authServer/models/hq/client/ClientQueryProfile.java:18` - Client allowlisted fields and default sort.
- `code/backend/src/main/java/com/authServer/models/hq/client/ClientMapper.java:48` - Client entity to list DTO conversion.
- `code/backend/src/main/java/com/authServer/models/hq/client/ClientService.java:34` - Client query collaborator constructor injection.
- `code/backend/src/main/java/com/authServer/models/hq/client/ClientController.java:16` - Client inherited controller generic signature.

---

## Notes / Follow-ups

- Task 5 production wiring was implemented during Task 4 for runtime safety. This document intentionally avoids re-planning duplicate code changes.
- A 2026-04-27 execution pass re-audited the production sources and reran targeted Maven validation; no additional Task 5 Java changes were required.
- Task 6 remains necessary. It should add integration and controller tests for the real Admin/Client endpoints, not just shared-layer unit tests.
- `roles` are list DTO display data but not query fields. Add role filtering only through a future tested task.
- `apikey` remains absent from Client list/query exposure. Add it only after an explicit security decision.
- Generated QueryDSL sources under `code/backend/target/generated-sources/annotations` remain build artifacts and should not be committed.
- Context7 is quota-blocked in the current workspace. Re-run Context7 after authentication if exact snippets are needed during a future implementation pass.

---

## Completion Criteria

- [x] Parent feature reviewed and reflected accurately in this task.
- [x] Relevant skills reviewed and selected for this task.
- [x] Up-to-date documentation checked, or Context7 quota limitation recorded with official-doc fallback.
- [x] `AdminListDTO` exists and omits passwords/internal account flags.
- [x] `AdminMapper.toListDTO(...)` maps Admin entities to safe list DTOs.
- [x] `AdminQueryProfile` explicitly allowlists Admin fields and default sort.
- [x] `AdminServiceImpl` and `AdminController` use the new `LISTDTO` generic path.
- [x] `ClientListDTO` exists and omits passwords, API keys, and internal account flags.
- [x] `ClientMapper.toListDTO(...)` maps Client entities to safe list DTOs.
- [x] `ClientQueryProfile` explicitly allowlists Client fields and default sort.
- [x] `ClientService` and `ClientController` use the new `LISTDTO` generic path.
- [x] No reflection, arbitrary filter/sort field exposure, placeholder query profiles, or unsupported runtime list paths are introduced.
- [x] Parent feature Task 5 link is updated to this task document.
- [x] Remaining repository/service/controller endpoint validation is handed off to Task 6.
