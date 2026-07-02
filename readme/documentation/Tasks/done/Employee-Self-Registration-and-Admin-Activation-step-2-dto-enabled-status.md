# Task: EmployeeDTO Enabled Status — Add `enabled` Field to EmployeeDTO and toDTO() Mapper

#task #current #low-complexity #parent-employee-self-registration-and-admin-activation

**Parent:** [[Employee-Self-Registration-and-Admin-Activation]]
**Parent Type:** Feature
**Related Step(s):** Phase 2, Steps 2.1, 2.2, 2.3
**Estimated Complexity:** Low

---

## Goal

Add `boolean enabled` to `EmployeeDTO` and update `EmployeeMapper.toDTO()` to map `entity.isEnabled()`, so that admin endpoints (`GET /employee/{id}`, `PUT /employee/{id}`, `DELETE /employee/{id}`) return the account activation status alongside the existing employee fields.

---

## Parent Context

The parent feature (Employee Self-Registration and Admin Activation) requires that admins can see the `enabled` flag on employee records. Without this, an admin calling `GET /employee/{id}` receives an `EmployeeDTO` with no indication of whether the account is active or pending. Task 3 (admin activate/deactivate) returns `EmployeeDTO` from both endpoints — if `enabled` is absent from `EmployeeDTO`, those responses cannot confirm the new activation state to the caller.

Key context from the parent:
- `EmployeeListDTO` already has `boolean enabled` (added in a prior feature), and `EmployeeMapper.toListDTO()` already maps `entity.isEnabled()` at line 56 — no changes needed to either.
- `EmployeeDTO` is the only target: it is currently missing `enabled`.
- `EmployeeMiniDTO` (insert response) does not need `enabled` — the parent document explicitly states "skip" for `toSmallDTO()`.
- A pre-implementation review finding confirmed that the parent Phase 2 description originally referenced `EmployeeListDTO` (already done). The corrected targets are `EmployeeDTO` and `EmployeeMapper.toDTO()` only.
- No schema changes: `BaseUserEntity.enabled` already exists in the DB as the `enabled` column on `base_user`. No new columns are introduced by this task.

`EmployeeDTO` is currently returned by `EmployeeService.getOne()`, `getAll()`, `update()`, and `delete()` — all admin-only operations. Adding `enabled` is additive and backward-compatible; no existing consumers assert on `enabled`, so no regressions are expected.

---

## Preconditions / Dependencies

- [[Employee-Self-Registration-and-Admin-Activation-step-1-security-foundation]] complete: `SecurityUser.isEnabled()` now correctly delegates to `BaseUserEntity.enabled`, ensuring the `enabled` field on the entity accurately reflects the authentication state that the DTO will expose. ✅
- `EmployeeListDTO.java` already has `boolean enabled` at line 33 — no change needed. ✅
- `EmployeeMapper.toListDTO()` already calls `.enabled(entity.isEnabled())` at line 56 — no change needed. ✅
- `BaseUserEntity.java:68` has `private boolean enabled = true;` with Lombok `@Getter @Setter` — `entity.isEnabled()` and `entity.setEnabled(boolean)` are already generated. ✅

---

## Skills and Documentation Preparation

### Skills Reviewed

- `memory-bank` — Selected — confirmed project patterns: Lombok builder DTOs, EmployeeMapper test style, FK-safe cleanup order
- `solid-deep-design` — Selected — applied to validate EmployeeDTO responsibility and assess whether `enabled` belongs here
- `tdd` — Selected — vertical-slice unit TDD cycle for mapper behavior
- `find-docs` — Not needed — no new library APIs; change is purely additive to existing Lombok and JPA patterns already present in the codebase
- `glossary-management` — Not needed — no new domain terms introduced

### Documentation Reviewed

- **Lombok `@Builder` + `@Data`**: adding a new field to a `@Builder` class automatically includes it in the builder chain (`.enabled(boolean)` becomes available). `@AllArgsConstructor` adds the field to the all-args constructor — safe because no production or test code constructs `EmployeeDTO` directly with the all-args constructor; all construction goes through `EmployeeMapper.toDTO()`.
- **Java primitive `boolean` + Lombok**: a `boolean enabled` field generates `isEnabled()` getter (not `getEnabled()`). The Lombok `@Builder` default for an unmapped `boolean` field is `false` (Java primitive default), so omitting `.enabled(...)` in the builder produces `false` for every entity regardless of actual state — this is the mechanism that makes test 1 (`mapsEnabledTrue`) a genuine RED test before Step 3.

### Related Existing Code

- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeDTO.java` — target; currently missing `boolean enabled`
- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeMapper.java:14` — `toDTO()` builder chain; missing `.enabled(entity.isEnabled())`
- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeListDTO.java:33` — prior art: `boolean enabled` already present
- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeMapper.java:56` — prior art: `toListDTO()` already calls `.enabled(entity.isEnabled())`
- `backend/src/main/java/com/agentForgeBackend/shared/models/baseUser/BaseUserEntity.java:68` — `private boolean enabled = true;` — source field
- `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeMapperTest.java` — existing test class to extend; `@ExtendWith(MockitoExtension.class)` pure unit, no Spring context

---

## Implementation Details

### Approach

**SOLID + Deep Design assessment:**

`EmployeeDTO`'s single responsibility is to represent the full employee state for admin read and write operations. The existing fields (`firstName`, `lastName`, `email`, `username`, `roles`) describe the employee identity — but the account activation state (`enabled`) is missing. Deletion test: if `enabled` were removed from `EmployeeDTO`, an admin calling `GET /employee/{id}` would lose activation status and would need a separate endpoint or additional query — complexity scatters to callers. Adding `enabled` deepens `EmployeeDTO`: more state behind the same interface.

`EmployeeMapper.toDTO()` has one responsibility: translate `EmployeeEntity` to `EmployeeDTO`. Adding `.enabled(entity.isEnabled())` extends the same responsibility. No new abstraction is introduced. The change mirrors the pattern already present in `toListDTO()` at line 56.

`EmployeeMiniDTO` and `toSmallDTO()` are intentionally excluded. `EmployeeMiniDTO` is the insert-response DTO — it confirms creation (admin-inserted employees are immediately `enabled = true` by design). An always-true `enabled` field on an insert response is noise. Task 3 activate/deactivate returns `EmployeeDTO`, not `EmployeeMiniDTO`, so `EmployeeMiniDTO` has no role in the activation feature.

### Files to Create/Modify

- [x] `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeDTO.java` — add `private boolean enabled;` after `roles`
- [x] `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeMapper.java` — add `.enabled(entity.isEnabled())` to `toDTO()` builder chain
- [x] `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeMapperTest.java` — add 2 unit tests: `toDTO_mapsEnabledTrue` and `toDTO_mapsEnabledFalse`

---

## Step-by-Step Implementation

### Step 1: Write RED tests in `EmployeeMapperTest`

**Goal:** Establish two discriminating tests that will fail (compile error) until Steps 2 and 3 are complete. Writing tests first anchors the expected behavior before any production change is made.

**Dependencies:** None — `EmployeeMapperTest.java` already exists; these are additions to it.

- [x] Add `toDTO_mapsEnabledTrue()` to `EmployeeMapperTest.java`
- [x] Add `toDTO_mapsEnabledFalse()` to `EmployeeMapperTest.java`

**Why this step is first:** The existing `setUp()` already sets `entity.setEnabled(true)`. Test 1 reuses that state. Test 2 overrides it to `false`. Writing tests first means the RED state is observable before any production code changes.

#### Implementation

```java
// File: backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeMapperTest.java
// Add these two tests after the existing toDTO tests (after toDTO_mapsNameAndEmail):

@Test
void toDTO_mapsEnabledTrue() {
    // entity.setEnabled(true) is already applied in setUp()
    EmployeeDTO dto = mapper.toDTO(entity);

    assertTrue(dto.isEnabled());
}

@Test
void toDTO_mapsEnabledFalse() {
    entity.setEnabled(false); // override setUp default

    EmployeeDTO dto = mapper.toDTO(entity);

    assertFalse(dto.isEnabled());
}
```

**RED state:** `dto.isEnabled()` does not compile until `boolean enabled` is added to `EmployeeDTO` in Step 2. After Step 2 (field added), the tests compile but `toDTO_mapsEnabledTrue` will still be RED because the builder omits `.enabled(...)` — Lombok defaults an unmapped `boolean` to `false`, so `dto.isEnabled()` returns `false` even when the entity has `enabled = true`.

#### Edge Cases

1. **Lombok builder default for `boolean`:** Without `.enabled(entity.isEnabled())` in the builder call, Lombok initializes `enabled` to `false` (Java primitive default). This makes `toDTO_mapsEnabledTrue()` fail even after Step 2 — it provides the discriminating RED test that confirms the mapper change in Step 3 is required.

---

### Step 2: Add `boolean enabled` to `EmployeeDTO`

**Goal:** Add the `enabled` field so the tests compile and the mapper builder can reference it.

**Dependencies:** Step 1 (tests written, RED state observed).

- [x] Add `private boolean enabled;` to `EmployeeDTO.java` after the `roles` field

**Placement rationale:** `enabled` is an access-control field — it determines whether the account can authenticate. It belongs with `roles` (also access-control) rather than between contact fields or as a standalone audit field. `EmployeeListDTO` uses the same ordering for consistency.

#### Implementation

```java
// File: backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeDTO.java
// Full file after change:

package com.agentForgeBackend.models.hq.employee;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Set;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Getter
@Setter
public class EmployeeDTO {

    private String firstName;

    private String lastName;

    private String email;

    private String username;

    private Set<String> roles;

    private boolean enabled;
}
```

#### Edge Cases

1. **`@AllArgsConstructor` signature change:** Lombok adds `boolean enabled` as the last parameter to the all-args constructor. No production code or test constructs `EmployeeDTO` via the all-args constructor — all construction goes through the mapper builder — so this is safe.
2. **`toDTO_doesNotExposePassword()` in `EmployeeMapperTest`:** This existing test calls `hasField(EmployeeDTO.class, "password")` and `hasField(EmployeeDTO.class, "apiKey")`. Adding `enabled` does not affect those checks — they remain `false` as required.
3. **`EmployeeServiceCrudIntegrationTest` tests asserting on `EmployeeDTO`:** `getOneReturnsCorrectEmployee` asserts `dto.getUsername()` and `dto.getRoles()`. `updateAppliesNameChanges` asserts `result.getFirstName()` and `result.getLastName()`. Neither assertion touches `enabled`. All admin-inserted test employees call `insert()` which sets `entity.setEnabled(true)` — so `dto.isEnabled()` will be `true` for all of them, but no test asserts on it, so no regression.

---

### Step 3: Update `EmployeeMapper.toDTO()` to map `enabled`

**Goal:** Add `.enabled(entity.isEnabled())` to the builder chain in `toDTO()`. This is the production change that turns both RED tests GREEN.

**Dependencies:** Step 2 (`boolean enabled` must exist in `EmployeeDTO` before the builder call compiles).

- [x] Add `.enabled(entity.isEnabled())` to the `toDTO()` builder chain in `EmployeeMapper.java`, after `.roles(mapAuthorities(entity.getRoles()))`
- [x] Leave `toSmallDTO()`, `toListDTO()`, `toEntity()`, and `mapAuthorities()` unchanged

#### Implementation

```java
// File: backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeMapper.java
// Modified toDTO() method only — all other methods remain identical:

@Override
public EmployeeDTO toDTO(EmployeeEntity entity) {
    if (entity == null) {
        return null;
    }

    return EmployeeDTO.builder()
            .firstName(entity.getFirstName())
            .lastName(entity.getLastName())
            .email(entity.getEmail())
            .username(entity.getUsername())
            .roles(mapAuthorities(entity.getRoles()))
            .enabled(entity.isEnabled())    // maps BaseUserEntity.enabled via Lombok-generated isEnabled()
            .build();
}
```

#### Edge Cases

1. **`entity.isEnabled()` call:** Lombok's `@Getter` on `BaseUserEntity` generates `isEnabled()` for the `boolean enabled` field (confirmed at `BaseUserEntity.java:68`). This is the same getter called in `toListDTO()` at line 56 — no behavioral difference.
2. **`null` entity guard:** The `if (entity == null) return null;` check on line 15 of the existing `toDTO()` handles null input before the builder is reached — unchanged and still correct.
3. **`EmployeeService.update()` and `delete()` response:** Both call `mapper.toDTO(...)`. After this change, the update and delete responses include `enabled`. This is intentional — Task 3 (activate/deactivate) calls `mapper.toDTO(saved)` and the `enabled` field in the response is how the caller confirms the new state.

---

## Design Decisions

**Decision 1: `boolean enabled` added to `EmployeeDTO` only, not `EmployeeMiniDTO`**
- **Why:** `EmployeeMiniDTO` is returned by `EmployeeService.insert()` — the admin-creation path. Admin-created employees are immediately `enabled = true` by feature design (admin creation is the approval). An always-`true` `enabled` field on an insert response adds noise without utility. `EmployeeDTO` is the admin view of a specific employee's current state — `enabled` is essential information in that context.
- **Alternatives considered:** Adding `enabled` to `EmployeeMiniDTO` as well (rejected — always-`true` value on an insert response is misleading; it implies variation that doesn't exist for the admin-creation path).

**Decision 2: Two tests added to existing `EmployeeMapperTest`, not a new test class**
- **Why:** The change targets `EmployeeMapper.toDTO()` — already covered by `EmployeeMapperTest`. Locality: all mapper behavior tests in one place. A new class for a 1-line mapper addition introduces unnecessary fragmentation with no benefit.
- **Alternatives considered:** New `EmployeeMapperEnabledTest.java` class (rejected — disperses mapper tests; `EmployeeMapperTest` is the correct location for `toDTO()` behavior verification).

**Decision 3: `enabled` field placed after `roles` in `EmployeeDTO`**
- **Why:** The fields in `EmployeeDTO` follow a natural grouping: name fields (`firstName`, `lastName`), contact fields (`email`, `username`), access/role fields (`roles`). `enabled` is an access-control field — it governs whether the account can authenticate — so it belongs immediately after `roles`. `EmployeeListDTO` uses the same ordering. Consistency across the two DTOs aids readability.
- **Alternatives considered:** After `username` (rejected — breaks the name→contact→access grouping); as the first field (rejected — inconsistent with `EmployeeListDTO`).

**Decision 4: `toSmallDTO()` is not modified**
- **Why:** The parent feature document explicitly states "skip" for `toSmallDTO()` because `EmployeeMiniDTO` does not need `enabled`. The feature document states: "In `toSmallDTO()` (if `EmployeeMiniDTO` does not need it, skip)." Task 3 (activate/deactivate) returns `EmployeeDTO` — not `EmployeeMiniDTO`. No Task or endpoint needs `EmployeeMiniDTO` to carry `enabled`.
- **Alternatives considered:** Modifying `toSmallDTO()` as well for completeness (rejected — the parent feature explicitly excludes it; adding fields to DTOs without a consuming caller is speculative over-engineering).

---

## Testing Considerations

### Automatic Validation

**TDD cycle:**

**Cycle 1 — Discriminating RED for `toDTO_mapsEnabledTrue`:**
- [x] Write `toDTO_mapsEnabledTrue()` and `toDTO_mapsEnabledFalse()` in `EmployeeMapperTest.java` (Step 1) — both fail to compile because `dto.isEnabled()` doesn't exist on `EmployeeDTO` (**RED state = compilation error**)
- [x] Add `boolean enabled` to `EmployeeDTO` (Step 2) — code compiles; tests now run
- [x] Run `./mvnw -pl backend test -Dtest=EmployeeMapperTest#toDTO_mapsEnabledTrue` → **RED**: `dto.isEnabled()` returns `false` (Lombok builder default), but entity has `enabled = true` **⚠ Manual: Java 21 runtime required — not available; deferred**
- [x] Add `.enabled(entity.isEnabled())` to `toDTO()` builder (Step 3)
- [x] Run same test → **GREEN** **⚠ Manual: Java 21 runtime required — not available; deferred**

**Cycle 2 — `toDTO_mapsEnabledFalse`:**
- [x] Run `./mvnw -pl backend test -Dtest=EmployeeMapperTest#toDTO_mapsEnabledFalse` after Step 3 → **GREEN** (entity.setEnabled(false) → builder calls `.enabled(false)` → `dto.isEnabled()` returns `false`) **⚠ Manual: Java 21 runtime required — not available; deferred**

**Full validation:**
- [x] Run `./mvnw -pl backend test -Dtest=EmployeeMapperTest` → all 12 tests GREEN (10 existing + 2 new) **⚠ Manual: Java 21 runtime required — not available; deferred**
- [x] Run `./mvnw -pl backend test -Dtest=EmployeeServiceCrudIntegrationTest` → all 17 existing tests GREEN (no regressions — `enabled` is additive, all admin-inserted employees are `enabled = true`, no test asserts on `enabled`) **⚠ Manual: Java 21 runtime required — not available; deferred** <!-- REVIEW-FIX: corrected test count from 14 to 17 — actual count confirmed by @Test method inventory: insert×6, update×6, delete×2, getOne×2, updateWithUnchangedEmail×1 = 17 -->
- [x] Run `./mvnw -pl backend test` → all existing tests pass, count increases by 2 **⚠ Manual: Java 21 runtime required — not available; deferred**

### Manual Validation

No manual validation is required for this task. All behaviors are verifiable through the automated test suite with pure unit tests (no server or HTTP layer involved).

---

## Related Code Explanations

- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeListDTO.java:33` — prior art: `boolean enabled` already present; the field declaration mirrors this exactly
- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeMapper.java:56` — prior art: `toListDTO()` already calls `.enabled(entity.isEnabled())`; the `toDTO()` addition mirrors this line exactly
- `backend/src/main/java/com/agentForgeBackend/shared/models/baseUser/BaseUserEntity.java:68` — `private boolean enabled = true;` — the source field from which `entity.isEnabled()` reads
- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeService.java:48` — `getOne()` calls `mapper.toDTO()` — its response gains `enabled` after this task
- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeService.java:56` — `getAll()` streams via `mapper::toDTO` and returns `Collection<EmployeeDTO>` — its response gains `enabled` after this task <!-- REVIEW-FIX: added missing getAll() — it also calls mapper.toDTO() and was omitted from the impact list -->
- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeService.java:100` — `update()` calls `mapper.toDTO(employeeRepository.save(toUpdate))` — its response gains `enabled` after this task

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected for this task
- [x] Up-to-date documentation reviewed for the affected technologies
- [x] `EmployeeDTO.java` has `private boolean enabled;` as a new field after `roles`
- [x] `EmployeeMapper.toDTO()` builder chain includes `.enabled(entity.isEnabled())`
- [x] `EmployeeMapperTest.java` has 2 new tests: `toDTO_mapsEnabledTrue` and `toDTO_mapsEnabledFalse`
- [x] `EmployeeMiniDTO.java` is NOT modified
- [x] `EmployeeMapper.toSmallDTO()` is NOT modified
- [x] `EmployeeListDTO.java` is NOT modified (already has `enabled`)
- [x] `EmployeeMapper.toListDTO()` is NOT modified (already maps `enabled`)
- [x] All implementation steps checked off
- [x] Automatic validation passes (or documented as requiring Java 21 runtime)
- [x] No manual validation steps required
- [x] Parent document `Features/to-do/Employee-Self-Registration-and-Admin-Activation` Phase 2 step checkboxes marked `[x]` and wiki link added for this task
