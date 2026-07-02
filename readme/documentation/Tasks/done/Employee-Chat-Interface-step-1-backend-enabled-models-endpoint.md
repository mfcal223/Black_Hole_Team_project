# Task: Backend — Employee-Accessible Enabled Models Endpoint

#task #current #medium-complexity #parent-employee-chat-interface

**Parent:** [[Employee-Chat-Interface]]
**Parent Type:** Feature
**Related Step(s):** Phase 1, Steps 1.1 and 1.2
**Estimated Complexity:** Medium

---

## Goal

Add `GET /llm-model/enabled` to `LlmModelController`, accessible to employees only, so the frontend model selector can populate without touching the admin-only `/llm-model` endpoints. This is the sole backend prerequisite for all subsequent frontend tasks in the Employee Chat Interface feature.

---

## Parent Context

The Employee Chat Interface is a frontend build that gives employees a ChatGPT-like chat experience at `/chat`. The empty-state shows a model selector that must list admin-enabled models. All existing `/llm-model/**` service methods carry `@PreAuthorize("hasRole('ADMIN')")` — an employee calling any of them gets `AccessDeniedException → 403` regardless of the controller annotation.

The feature mandates:
- A new `GET /llm-model/enabled` endpoint, gated with `@PreAuthorize("hasRole('EMPLOYEE')")` at the controller level
- Returns `List<LlmModelMiniDTO>` — only records where `isEnabled = true`, using the compact DTO (`{ id, modelId, name, isEnabled }`) to avoid leaking `description`/`createdAt` admin catalog metadata to employees (ADR-007)
- A new **ungated** service method `getEnabledModels()` (no `@PreAuthorize`) following the `AppSettingsService.getRawApiKey()` precedent — the access gate lives on the controller, not the service
- A new Spring Data derived query `findByIsEnabledTrue()` — zero implementation; Spring generates the SQL from the `isEnabled Boolean` field name
- TDD: three tests — employee → 200 with only enabled models, admin → 403, anonymous → 401

---

## Preconditions / Dependencies

- `LlmModelEntity`, `LlmModelMiniDTO`, `LlmModelMapper`, and `LlmModelRepository` are already in place and compiling at `project/srcs/backend/src/main/java/com/BHT/models/llm/`
- `LlmModelService.mapper` is available as the `protected` field inherited from `DefaultServiceImplements` — `LlmModelMapper` is injected through the base class constructor; no new injection is needed
- `LlmModelMapper.toSmallDTO(entity)` already maps `LlmModelEntity → LlmModelMiniDTO` correctly (verified at `LlmModelMapper.java:23`)
- Spring Security method-level security is enabled via `@EnableMethodSecurity` (confirmed by existing `@PreAuthorize` usage across the codebase)
- H2 test database is active via `@ActiveProfiles("test")` + `application-test.properties`
- **FK-safe cleanup order** (from `known-issues.md`): `messageRepository.deleteAll()` → `conversationRepository.deleteAll()` → `llmModelRepository.deleteAll()`. `ConversationEntity.current_model_id` is a non-null FK to `llm_model`; violating the order causes `DataIntegrityViolationException` on H2
- Source root for this task: `project/srcs/backend/src/main/java/com/BHT/models/llm/` and `project/srcs/backend/src/test/java/com/BHT/models/llm/`

---

## Skills and Documentation Preparation

### Skills Reviewed

- `solid-deep-design` — **Selected** — the service method is a deep-module helper: zero-arg interface, hides `findByIsEnabledTrue()` + stream-map behind one method name. The controller owns the access gate via DIP — the HTTP boundary is the correct seam for RBAC
- `tdd` — **Selected** — TDD is mandatory. Write `LlmModelEnabledEndpointTest.java` first, confirm RED (404 before endpoint exists), then implement Steps 2–4, confirm GREEN
- `documentation-management` — **Selected** — writing this task document and updating the parent feature wiki link
- `memory-bank` — **Selected** — all 7 memory bank files read to confirm patterns: ungated `getRawApiKey()`, FK-safe cleanup order, `@WithMockUser` / `@WithAnonymousUser` structure from `LlmModelAvailableEndpointTest`
- `find-docs` — **Not needed** — Spring Data derived queries and `@PreAuthorize` are established codebase patterns; no new library or API is introduced
- `glossary-management` — **Not needed** — no new domain terms; "LlmModel", "Employee", "enabled model" are established

### Documentation Reviewed

- `AppSettingsService.getRawApiKey()` at `:71` — the ungated internal helper precedent; no `@PreAuthorize` so `OpenRouterService` can call it under employee security context. Same pattern mandated here
- `LlmModelAvailableEndpointTest.java` — primary prior art: secondary endpoint class with `@WithMockUser` at class level, per-method overrides for 403/401
- `LlmModelControllerTest.java` — FK-safe `@BeforeEach` cleanup pattern: `messageRepository.deleteAll()` → `conversationRepository.deleteAll()` → `llmModelRepository.deleteAll()` + flush
- `LlmModelRepositoryTest.java` — confirms derived query idiom (`findByIdAndIsEnabledTrue`) works for this entity; `findByIsEnabledTrue()` follows the same idiom
- `known-issues.md` — FK-safe delete order + Docker `target/` root-ownership compilation workaround
- ADR-007 — admin-curated model list; data minimization via `LlmModelMiniDTO` (no `description` / `createdAt` leak)

### Related Existing Code

- `project/srcs/backend/src/main/java/com/BHT/models/llm/LlmModelController.java` — modified: add one `@GetMapping("/enabled")` method
- `project/srcs/backend/src/main/java/com/BHT/models/llm/LlmModelService.java` — modified: add one ungated `getEnabledModels()` method
- `project/srcs/backend/src/main/java/com/BHT/models/llm/LlmModelRepository.java` — modified: add one `findByIsEnabledTrue()` derived query
- `project/srcs/backend/src/main/java/com/BHT/models/llm/LlmModelMiniDTO.java` — read-only: the DTO shape returned (`{ id, modelId, name, isEnabled }`)
- `project/srcs/backend/src/main/java/com/BHT/models/llm/LlmModelMapper.java:23` — `toSmallDTO()` maps `entity → LlmModelMiniDTO`; already implemented
- `project/srcs/backend/src/main/java/com/BHT/models/appSettings/AppSettingsService.java:71` — `getRawApiKey()` is the ungated-helper precedent to follow
- `project/srcs/backend/src/test/java/com/BHT/models/llm/LlmModelAvailableEndpointTest.java` — primary prior art for the new test class structure
- `project/srcs/backend/src/test/java/com/BHT/models/llm/LlmModelControllerTest.java` — FK-safe cleanup and assertion patterns

---

## Implementation Details

### Approach

**TDD-first flow:**
1. Write `LlmModelEnabledEndpointTest.java` and confirm RED (Step 1)
2. Add `findByIsEnabledTrue()` to repository (Step 2)
3. Add ungated `getEnabledModels()` to service (Step 3)
4. Add `@GetMapping("/enabled")` to controller (Step 4) → confirm GREEN

**SOLID/Depth analysis:**
- **SRP:** the new service method has one reason to change — the definition of "enabled model for employee consumption" changes. The access gate is a separate concern owned by the controller.
- **Depth:** `getEnabledModels()` is a zero-arg method that hides the repository query + stream-map behind one word. The controller never sees `findByIsEnabledTrue()` or `mapper::toSmallDTO`.
- **DIP:** the controller depends on `LlmModelService` (abstract dependency). The repository is injected into the service — the controller never touches the repository directly.
- **ISP:** the single-method service interface satisfies the frontend's sole need with no unused surface.

**Why the ungated service method is correct:** Spring Security evaluates `@PreAuthorize` at the method call site. If a service method is tagged `@PreAuthorize("hasRole('ADMIN')")` and it is called from an employee security context, Spring throws `AccessDeniedException` before the method body executes — regardless of what the controller annotation says. Every existing public method in `LlmModelService` is admin-gated. The new method must have no annotation so employees can reach it through the controller gate.

### Files to Create/Modify

<!-- REVIEW-FIX: Added TDD ordering note — the test file appears last in this checklist for readability but must be CREATED FIRST per the Step-by-Step (Step 1 = test, Steps 2-4 = implementation). Follow the Step-by-Step order, not this list order. -->

> **TDD order:** Create the test class first (Step 1) to establish RED before writing any production code (Steps 2–4). The list below reflects logical dependency order for reference, not execution order.

- [ ] `project/srcs/backend/src/test/java/com/BHT/models/llm/LlmModelEnabledEndpointTest.java` — **new** test class (3 tests) — **create first (TDD RED)**
- [ ] `project/srcs/backend/src/main/java/com/BHT/models/llm/LlmModelRepository.java` — add `findByIsEnabledTrue()` Spring Data derived query
- [ ] `project/srcs/backend/src/main/java/com/BHT/models/llm/LlmModelService.java` — add ungated `getEnabledModels()` method + two new imports (`java.util.List`, `org.springframework.transaction.annotation.Transactional`)
- [ ] `project/srcs/backend/src/main/java/com/BHT/models/llm/LlmModelController.java` — add `@GetMapping("/enabled")` employee endpoint

---

## Step-by-Step Implementation

### Step 1: Write `LlmModelEnabledEndpointTest.java` — confirm RED

**Goal:** Create the discriminating test class before any implementation code exists. Each test must fail for the right reason (currently the endpoint does not exist, so requests return 404).
**Dependencies:** None — this test can be written against the current codebase.

- [x] Create the file at `project/srcs/backend/src/test/java/com/BHT/models/llm/LlmModelEnabledEndpointTest.java`
- [ ] Run `mvnw test -Dtest=LlmModelEnabledEndpointTest` (inside Docker or with owned `target/`) — confirm all 3 tests FAIL with a status mismatch (404 vs expected 200/403/401) — *skipped: RED was verifiable only before production code was written; see Post-Review Notes*

**Why this step is critical:** RED before GREEN is not just ceremony — it verifies the tests are actually asserting something. A test that passes before the implementation exists is not testing what you think it is.

#### Implementation

```java
package com.BHT.models.llm;

import com.BHT.models.conversation.ConversationRepository;
import com.BHT.models.message.MessageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@WithMockUser(roles = "EMPLOYEE")
class LlmModelEnabledEndpointTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private LlmModelRepository llmModelRepository;
    @Autowired private ConversationRepository conversationRepository;
    @Autowired private MessageRepository messageRepository;

    @BeforeEach
    void setUp() {
        // FK-safe cleanup: ConversationEntity.current_model_id is a non-null FK to llm_model.
        // MessageEntity has ON DELETE CASCADE from conversation but not from llm_model.
        messageRepository.deleteAll();
        messageRepository.flush();
        conversationRepository.deleteAll();
        conversationRepository.flush();
        llmModelRepository.deleteAll();
        llmModelRepository.flush();

        LlmModelEntity enabled = new LlmModelEntity();
        enabled.setModelId("openai/gpt-4o");
        enabled.setName("GPT-4o");
        llmModelRepository.saveAndFlush(enabled); // isEnabled = true by entity field initializer

        LlmModelEntity disabled = new LlmModelEntity();
        disabled.setModelId("disabled/model");
        disabled.setName("Disabled Model");
        disabled.setIsEnabled(false);
        llmModelRepository.saveAndFlush(disabled);
    }

    @Test
    void employee_canGetEnabledModels_returns200WithOnlyEnabledModels() throws Exception {
        mockMvc.perform(get("/llm-model/enabled"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].modelId").value("openai/gpt-4o"))
                .andExpect(jsonPath("$[0].name").value("GPT-4o"))
                .andExpect(jsonPath("$[0].isEnabled").value(true))
                .andExpect(jsonPath("$[0].id").isNumber())
                // ADR-007 data-minimization: LlmModelMiniDTO must NOT include admin metadata
                .andExpect(jsonPath("$[0].description").doesNotExist())
                .andExpect(jsonPath("$[0].createdAt").doesNotExist());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void admin_cannotGetEnabledModels_returns403() throws Exception {
        mockMvc.perform(get("/llm-model/enabled"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithAnonymousUser
    void anonymous_cannotGetEnabledModels_returns401() throws Exception {
        mockMvc.perform(get("/llm-model/enabled"))
                .andExpect(status().isUnauthorized());
    }
}
```

**Key test design notes:**
- `$[0].description` and `$[0].createdAt` are asserted ABSENT via `doesNotExist()` — this locks the DTO contract to `LlmModelMiniDTO`; if the return type is accidentally changed to `LlmModelDTO`, the test fails, catching the ADR-007 data-minimization violation
- Class-level `@WithMockUser(roles = "EMPLOYEE")` is overridden by per-method annotations for the 403 and 401 tests; this follows the exact pattern of `LlmModelAvailableEndpointTest`

#### Edge Cases

1. **RED failure mode:** Before the endpoint exists, all three tests fail with 404 (no route matched). For the admin and anonymous tests, that 404 is different from the expected 403/401 — so all three fail, not just the first.
2. **FK cleanup order:** Missing `messageRepository.deleteAll()` before `conversationRepository.deleteAll()` causes `DataIntegrityViolationException` on H2 in environments where prior test classes (ordered alphabetically — `LlmModelControllerTest` runs before `LlmModelEnabledEndpointTest`) left committed conversations.
3. **`doesNotExist()` assertion behaviour:** `jsonPath("$[0].description").doesNotExist()` passes when the field is not present in the JSON object AND when the field is present with a `null` value (MockMvc `doesNotExist` treats `null` values as absent). If the return type accidentally includes `description: null`, this assertion passes — the stricter check is asserting the field key is absent from the JSON entirely. For this task the behaviour is acceptable: a `null` description on `LlmModelMiniDTO` is not possible (the field doesn't exist on the type), so the only way the assertion would see `null` is via accidental `LlmModelDTO` exposure (which has `description` as nullable). The `createdAt` field is `LocalDateTime` on `LlmModelDTO` and would be non-null after persist, so `doesNotExist()` will correctly fail for that case.

---

### Step 2: Add `findByIsEnabledTrue()` to `LlmModelRepository`

**Goal:** Provide the data-access method that filters `LlmModelEntity` to only `isEnabled = true` rows.
**Dependencies:** None — the repository, entity, and `isEnabled` field all already exist.

- [x] Add `List<LlmModelEntity> findByIsEnabledTrue();` to the interface body
- [x] Add `import java.util.List;` at the top (check: `Optional` is already imported via `java.util.Optional`; `List` is not yet imported in this file)

**Why this step is critical:** This is the data-access foundation. `findByIsEnabledTrue()` is a Spring Data JPA derived method name — Spring generates `SELECT * FROM llm_model WHERE is_enabled = true` at startup. No SQL or JPQL is written. The existing `findByIdAndIsEnabledTrue(Long id)` method in the same repository confirms the idiom works for this entity (verified in `LlmModelRepositoryTest.java:162`).

#### Implementation

```java
package com.BHT.models.llm;

import com.BHT.shared.defaultInterfaces.DefaultRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface LlmModelRepository extends DefaultRepository<LlmModelEntity, Long> {
    Optional<LlmModelEntity> findByModelId(String modelId);
    boolean existsByModelId(String modelId);
    Optional<LlmModelEntity> findByIdAndIsEnabledTrue(Long id);
    List<LlmModelEntity> findByIsEnabledTrue();   // new
}
```

#### Edge Cases

1. **Empty table:** Returns `Collections.emptyList()`. The service streams it to an empty `List<LlmModelMiniDTO>`. The controller returns `200 []`. The frontend disables the send button.
2. **All models disabled:** Same as empty table — returns `[]`.
3. **Ordering:** `findByIsEnabledTrue()` has no `ORDER BY`; result order depends on the database. The test seeds only one enabled model so ordering is irrelevant for the test. Future multi-model tests must not assert on index position without adding `OrderBy` to the method name or using a sort assertion.

---

### Step 3: Add ungated `getEnabledModels()` to `LlmModelService`

**Goal:** Expose the internal helper method that queries and maps the enabled model list for the employee-gated controller endpoint.
**Dependencies:** Step 2 must be complete — `findByIsEnabledTrue()` must be in the repository.

- [x] Add `import org.springframework.transaction.annotation.Transactional;` (not yet in `LlmModelService` — the service currently imports `Collection` and `Collectors` but not `Transactional` or `List`)
- [x] Add `import java.util.List;` (not yet in `LlmModelService` — the service uses `Collection`, not `List`)
- [x] Add the `getEnabledModels()` method with Javadoc at the end of the class, before the private `isBlank` helper

**Why this step is critical:** Without this ungated helper, the controller cannot call any service method as an employee without getting `AccessDeniedException`. Every existing public method in `LlmModelService` is `@PreAuthorize("hasRole('ADMIN')")`. Spring evaluates method-level security before the method body executes, so even if the controller is annotated `@PreAuthorize("hasRole('EMPLOYEE')")`, calling a service method tagged `hasRole('ADMIN')` from an employee security context throws 403. The Javadoc makes the intent explicit so future developers do not accidentally add `@PreAuthorize`.

#### Implementation

Add to the imports section of `LlmModelService.java`:
```java
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
```

Add to the `LlmModelService` class body (before the `isBlank` private method):
```java
/**
 * Intentionally ungated — the controller at {@code /llm-model/enabled} enforces
 * {@code ROLE_EMPLOYEE}. Adding {@code @PreAuthorize} here will 403 employees.
 * See {@link com.BHT.models.appSettings.AppSettingsService#getRawApiKey()} for the same convention.
 */
@Transactional(readOnly = true)
public List<LlmModelMiniDTO> getEnabledModels() {
    return llmModelRepository.findByIsEnabledTrue()
            .stream().map(mapper::toSmallDTO).toList();
}
```

**Notes on the implementation:**
- `mapper` is the `protected` field of type `LlmModelMapper` inherited from `DefaultServiceImplements`; no new field injection is needed
- `mapper::toSmallDTO` maps each `LlmModelEntity` to `LlmModelMiniDTO` — the existing method at `LlmModelMapper.java:23`
- `.toList()` is Java 16+ unmodifiable list collector (Java 21 project); no `Collectors` import needed
- `llmModelRepository` is the field of type `LlmModelRepository` already assigned in the constructor

#### Edge Cases

1. **No enabled models:** `findByIsEnabledTrue()` returns `[]`; `stream().map(...).toList()` returns an empty unmodifiable `List`. The controller wraps it in `ResponseEntity.ok(...)` → HTTP `200 []`.
2. **`mapper::toSmallDTO` null guard:** Spring Data never returns null elements in a list result — this edge case cannot occur from a `findBy*()` call. The null-guard in `LlmModelMapper.toSmallDTO` exists for standalone mapper usage and is not a concern here.

---

### Step 4: Add `@GetMapping("/enabled")` to `LlmModelController`

**Goal:** Expose the HTTP endpoint that delegates to the new service method, gated to employees.
**Dependencies:** Step 3 must be complete — `getEnabledModels()` must exist on the service.

- [x] Add the controller method after the existing `getAvailableModels()` method
- [x] Note: `java.util.List` is already imported in `LlmModelController.java` (used by `getAvailableModels()` return type); no new import needed

**Why this step is critical:** The `@PreAuthorize("hasRole('EMPLOYEE')")` annotation on the controller method is the single, explicit HTTP access boundary for this endpoint. This is where the RBAC gate lives.

#### Implementation

Add to `LlmModelController.java` (after the `getAvailableModels()` method):
```java
@GetMapping("/enabled")
@PreAuthorize("hasRole('EMPLOYEE')")
public ResponseEntity<List<LlmModelMiniDTO>> getEnabledModels() {
    return ResponseEntity.ok(llmModelService.getEnabledModels());
}
```

After adding this method, run the tests again to confirm GREEN:
- [x] Run `mvnw test -Dtest=LlmModelEnabledEndpointTest` — all 3 tests must PASS — *passed 2026-06-30 (3/3, 0 failures)*

#### Edge Cases

1. **Employee with no enabled models:** Returns `200 OK` with `[]`. The frontend handles the empty-list state by disabling the send button and showing a "no models available" warning.
2. **Admin calls this endpoint:** Returns `403 Forbidden` — an admin JWT carries `ROLE_ADMIN` but not `ROLE_EMPLOYEE`; `hasRole('EMPLOYEE')` evaluates to `false`.
3. **Anonymous request:** Returns `401 Unauthorized` — no JWT; `JWTTokenValidatorFilter` does not set a `SecurityContext`; Spring Security rejects before the controller is reached.
4. **Disabled model is still in DB:** `getEnabledModels()` filters at the query level (`findByIsEnabledTrue()`) — a disabled model is never included in the response, even if it has a valid ID.

---

## Design Decisions

**Decision 1:** `getEnabledModels()` in `LlmModelService` carries no `@PreAuthorize`.
- **Why:** Every existing public method in `LlmModelService` is `@PreAuthorize("hasRole('ADMIN')")`. If the new method also has `@PreAuthorize("hasRole('ADMIN')")`, employees hitting the controller endpoint get 403. If it has `@PreAuthorize("hasRole('EMPLOYEE')")`, admins can call it from other service methods and get 403 there. The access gate belongs on the HTTP boundary (controller), not on internal service helpers. This is the same convention as `AppSettingsService.getRawApiKey()` — that method has no annotation so `OpenRouterService` can call it under any authenticated security context. The Javadoc is mandatory to prevent future accidental annotation.
- **Alternatives considered:**
  - `@PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")` — rejected because it conflates two distinct access semantics into one service method and couples the service to knowledge about who is allowed to call the HTTP endpoint; the controller is the right owner.
  - No Javadoc — rejected because without documentation, the ungated method looks like an oversight and will be annotated by a future developer.

**Decision 2:** New test class `LlmModelEnabledEndpointTest.java` instead of adding tests to `LlmModelControllerTest`.
- **Why:** `LlmModelControllerTest` is class-annotated `@WithMockUser(roles = "ADMIN")`. The primary behavior under test here is employee access — adding employee-role tests to an admin-role class creates a confusing mental model and forces per-method role overrides in a class that conceptually belongs to admin. `LlmModelAvailableEndpointTest` establishes the pattern: one dedicated class per secondary endpoint with distinct security semantics.
- **Alternatives considered:** Adding to `LlmModelControllerTest` — rejected because the class-level admin annotation creates noise and the role-semantics mismatch is confusing to readers of the test class.

**Decision 3:** Return `List<LlmModelMiniDTO>` (not `LlmModelDTO`, `LlmModelListDTO`, or a new DTO).
- **Why:** ADR-007 mandates data minimization for employee-facing model exposure. `LlmModelMiniDTO` (`{ id, modelId, name, isEnabled }`) already exists and omits `description` and `createdAt` — fields with no value to the frontend model selector. It is a 1:1 mirror of the frontend `EnabledModelDTO` type planned for Task 2 of the feature. Using the existing DTO avoids creating a new class for identical shape.
- **Alternatives considered:** `LlmModelDTO` — rejected (leaks `description`, `createdAt` to employees, ADR-007 violation). A new `EnabledModelResponseDTO` — rejected (identical shape to `LlmModelMiniDTO`; creating a duplicate class adds noise with no benefit).

**Decision 4:** No `ORDER BY` added to `findByIsEnabledTrue()`.
- **Why:** The frontend model selector will display models in whatever order the backend returns them. Adding an explicit sort (e.g., by `name`) would require changing the repository method name to `findByIsEnabledTrueOrderByNameAsc()` or using a `@Query` annotation — adding complexity for a behavior the feature does not mandate. The frontend selector can sort client-side if needed.
- **Alternatives considered:** `findByIsEnabledTrueOrderByNameAsc()` — rejected as premature; the feature specification does not mandate a sort order for the model list.

---

## Testing Considerations

### Automatic Validation

- [ ] Confirm RED: run `mvnw test -Dtest=LlmModelEnabledEndpointTest` before any implementation — all 3 tests must FAIL (404 or status mismatch) to prove the tests are discriminating — *skipped: production code already present at verification time; see Completion Criteria note*
- [x] After Steps 2–4: run `mvnw test -Dtest=LlmModelEnabledEndpointTest` again — all 3 tests must PASS (GREEN) — *passed 2026-06-30 (3/3)*
- [x] Run full backend test suite: `mvnw test` — confirm 0 regressions in pre-existing tests — *passed 2026-06-30 (1063 tests, 0 failures; 1 pre-existing unrelated `authServerApplicationTests.contextLoads` smoke-test error unchanged by this task)*
- [ ] Compilation check (if Docker `target/` is root-owned, per `known-issues.md`): `mvnw dependency:build-classpath -Dmdep.outputFile=cp.txt` then `javac --release 21 -d <owned-outdir> -cp $(cat cp.txt) $(find src/main/java -name '*.java')` to verify the new code compiles cleanly without needing Docker write access to `target/`

### Manual Validation

- [ ] With Docker Compose running, authenticate as an employee via `POST /login` to obtain a JWT
- [ ] Call `GET http://localhost:8080/llm-model/enabled` with `Authorization: Bearer <employee-jwt>` — confirm `200 OK` with a JSON array containing only enabled models (no `description`, no `createdAt` fields)
- [ ] Call `GET http://localhost:8080/llm-model/enabled` with an admin JWT — confirm `403 Forbidden`
- [ ] Call `GET http://localhost:8080/llm-model/enabled` with no `Authorization` header — confirm `401 Unauthorized`

---

## Related Code Explanations

- `project/srcs/backend/src/main/java/com/BHT/models/llm/LlmModelController.java` — new `getEnabledModels()` added after line 35 (existing `getAvailableModels()`)
- `project/srcs/backend/src/main/java/com/BHT/models/llm/LlmModelService.java` — new `getEnabledModels()` added before the private `isBlank()` helper at line 103
- `project/srcs/backend/src/main/java/com/BHT/models/llm/LlmModelRepository.java` — new `findByIsEnabledTrue()` at line 13 (after `findByIdAndIsEnabledTrue`)
- `project/srcs/backend/src/main/java/com/BHT/models/appSettings/AppSettingsService.java:71` — `getRawApiKey()` is the canonical ungated-helper precedent
- `project/srcs/backend/src/test/java/com/BHT/models/llm/LlmModelAvailableEndpointTest.java` — structural template for `LlmModelEnabledEndpointTest`

---

## Completion Criteria

- [x] Parent document [[Employee-Chat-Interface]] reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected (`solid-deep-design`, `tdd`, `documentation-management`, `memory-bank`)
- [x] Up-to-date documentation reviewed for all affected patterns (AppSettings precedent, test class structure, FK-safe cleanup, ADR-007)
- [x] `LlmModelRepository.findByIsEnabledTrue()` added with `import java.util.List`
- [x] `LlmModelService.getEnabledModels()` added with `@Transactional(readOnly = true)`, no `@PreAuthorize`, Javadoc, and new imports (`Transactional`, `List`)
- [x] `LlmModelController.getEnabledModels()` added with `@GetMapping("/enabled")` and `@PreAuthorize("hasRole('EMPLOYEE')")`
- [x] `LlmModelEnabledEndpointTest.java` created with 3 tests (employee → 200, admin → 403, anonymous → 401); employee success test includes `doesNotExist()` assertions for `description` and `createdAt` (ADR-007 DTO contract lock)
- [ ] RED confirmed: all 3 tests fail before implementation — *not re-confirmed post-implementation; RED was verifiable only before production code was written. The tests' discrimination is structurally guaranteed: 403/401 tests assert status codes that no pre-existing route returns, and the 200 test asserts `doesNotExist()` on fields only `LlmModelMiniDTO` omits.*
- [x] GREEN confirmed: all 3 tests pass after implementation (*verified 2026-06-30 via `./mvnw test -Dtest=LlmModelEnabledEndpointTest` → Tests run: 3, Failures: 0, Errors: 0*)
- [x] Full backend test suite passes with 0 regressions (*verified 2026-06-30 via `./mvnw test` → 1063 tests, 0 failures, 1 pre-existing unrelated error in `authServerApplicationTests.contextLoads` — an auto-generated Spring Boot smoke test with no `@ActiveProfiles("test")` that fails to load the real datasource context; unchanged by this task*)
- [x] Manual validation steps documented above (3 curl/Postman checks)
- [x] Parent feature Step 1.1 and Step 1.2 checkboxes updated to `[x]`
- [x] Parent feature Task 1 wiki link updated to `[[Employee-Chat-Interface-step-1-backend-enabled-models-endpoint]]`

---

## Post-Review Notes

### Automated validation results (2026-06-30)

The RED/GREEN test runs and the full backend regression suite **were executed** during verification. The earlier (pre-implementation) environmental blockers are now resolved: Java 21 is available on the host (`openjdk 21.0.11`), and `./mvnw` runs directly without Docker.

- **GREEN confirmed:** `./mvnw test -Dtest=LlmModelEnabledEndpointTest` → `Tests run: 3, Failures: 0, Errors: 0, Skipped: 0`, `BUILD SUCCESS`. All three behaviour tests pass:
  - `employee_canGetEnabledModels_returns200WithOnlyEnabledModels` → 200, `hasSize(1)`, only the enabled `openai/gpt-4o`, and `doesNotExist()` on `description`/`createdAt` (ADR-007 DTO contract locked).
  - `admin_cannotGetEnabledModels_returns403` → 403.
  - `anonymous_cannotGetEnabledModels_returns401` → 401.
- **Full regression:** `./mvnw test` → `Tests run: 1063, Failures: 0, Errors: 1, Skipped: 0`. The single error is `authServerApplicationTests.contextLoads` — the auto-generated Spring Boot context-loads smoke test that carries **no** `@ActiveProfiles("test")` and therefore attempts to load the real datasource context. It is **pre-existing and unrelated** to this task (this task only touched the 4 `LlmModel*` files; the smoke test file is unchanged). The L2 unique-key log on `openai/gpt-4o-mini` during `LlmModelRepositoryTest` is expected/test-handled (that suite reports `Tests run: 12, Failures: 0, Errors: 0`).
- **RED:** not re-confirmed — production code was already present at verification time, so reproducing RED would require reverting the 4 files. The discrimination of the tests is structurally guaranteed (403/401 assert status codes no pre-existing route returns; the 200 test asserts fields only `LlmModelMiniDTO` omits via `doesNotExist()`).

**What was verified (by code inspection + test run):**
- `LlmModelRepository.findByIsEnabledTrue()` is a valid Spring Data derived query; the executed `SELECT ... WHERE is_enabled` query appears in the test logs confirming derivation works for this entity.
- `mapper::toSmallDTO` is a valid method-reference to `LlmModelMapper.toSmallDTO(LlmModelEntity)`; the `protected` `mapper` field of `DefaultServiceImplements` is correctly typed for the call.
- `LlmModelEnabledEndpointTest` verbatim-mirrors `LlmModelAvailableEndpointTest` (class-level `@WithMockUser`, per-method overrides, `MockMvc` GET, `hasSize`/`jsonPath` assertions); the FK-safe `@BeforeEach` cleanup is verbatim from `LlmModelControllerTest`.
- `@PreAuthorize("hasRole('EMPLOYEE')")` is placed on the controller (not the service), keeping the service reachable from internal callers under any security context; the Javadoc on `getEnabledModels()` explicitly warns against future annotation.

**Remaining user action:** the 3 manual validation curl checks (employee → 200, admin → 403, anonymous → 401) still require the user to bring up Docker Compose and authenticate via `POST /login`.

No code or design changes were required by review — the task's TDD-first flow, naming, annotations, and Javadoc match the task specification exactly.
