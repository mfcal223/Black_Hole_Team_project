# Task: Fix CORS PATCH Method and Exception Contract in update() Across All Services

#task #done #medium-complexity #parent-post-implementation-review-of-llm-model-entity-and-admin-crud

**Parent:** [[Bugs/done/Post-Implementation-Review-of-Llm-Model-Entity-and-Admin-Crud]]
**Parent Type:** Bug
**Related Step(s):** Phase 1 — Steps 1.1, 1.2, 1.3, 1.4, 1.5
**Estimated Complexity:** Medium

---

## Goal

Add `"PATCH"` to the CORS allowed methods in `SecurityConfig` so that `PATCH /llm-model/{id}/toggle` is not blocked by browsers, and align `update()` across `LlmModelService`, `EmployeeService`, and `ClientService` to throw `ItemAlreadyExist` (HTTP 409) instead of `InvalidInsertDetails` (HTTP 400) when a duplicate identifier is submitted — matching the behavior already established in each service's `insert()`.

---

## Parent Context

The post-implementation review of the LlmModel feature (all 4 tasks complete, 503 tests passing) found 2 high-severity bugs that will affect the React frontend before it is even built:

**Finding 1 — CORS `PATCH` gap:** `SecurityConfig.corsConfigurationSource()` lists `["GET", "POST", "PUT", "DELETE", "OPTIONS"]` but omits `"PATCH"`. The `PATCH /llm-model/{id}/toggle` endpoint is the primary mechanism for enabling/disabling models (ADR-007). Browsers send a CORS preflight (`OPTIONS`) before every cross-origin PATCH request; because `PATCH` is absent from `Access-Control-Allow-Methods`, browsers will block the actual PATCH request before it reaches the server. Spring MockMvc bypasses CORS entirely, so the current test suite cannot detect this gap.

**Finding 2 — Inconsistent exception type on update():** `insert()` in all three services (`LlmModelService`, `EmployeeService`, `ClientService`) correctly throws `ItemAlreadyExist` (→ HTTP 409 Conflict) for duplicate identifiers. But `update()` in all three services throws `InvalidInsertDetails` (→ HTTP 400 Bad Request) for the same condition. A frontend must handle two different status codes for semantically identical conflicts. The bug report's decision expanded scope beyond just LlmModel to fix all three services consistently.

The parent document mandates:
- Step 1.2 (widen `DefaultService.update()` interface) must be done **before** steps 1.3–1.5, because `ItemAlreadyExist extends Exception` is a checked exception and Java requires it to be declared in the interface before any override can throw it.
- `AdminServiceImpl` does not override `update()` — no changes needed there.
- The `PATCH` fix is a one-line change in `SecurityConfig` (step 1.1) and is independent of all other steps.

---

## Preconditions / Dependencies

- All 4 LlmModel tasks are in `Tasks/done/` and the feature is in `Features/done/`. The full test suite currently passes: 503 tests, 0 failures, 1 pre-existing Docker error (`authServerApplicationTests.contextLoads`).
- `ItemAlreadyExist` is already imported in `LlmModelService`, `EmployeeService`, and `ClientService` — no new imports are required for production code.
- `GlobalExceptionHandler` already maps `ItemAlreadyExist` → HTTP 409 Conflict and `InvalidInsertDetails` → HTTP 400 Bad Request. No changes to the exception handler.
- `ClientService.update()` already has `ItemAlreadyExist.class` in its `@Transactional(rollbackFor = {...})` — no transactional annotation change needed for Client.
- No `ClientServiceCrudIntegrationTest` exists. Step 1.5 requires creating one with targeted tests for the duplicate-identifier fix.
- The base `DefaultServiceImplements.update()` is documented in `known-issues.md` as incomplete (saves entity without applying form data). This task does NOT fix that base class bug — it only widens the throws clause. Every concrete service fully overrides `update()`, so the base class body is never executed in production.

---

## Skills and Documentation Preparation

### Skills Reviewed

- `documentation-management` — Selected — required for creating and placing this task document
- `solid-deep-design` — Selected — guides interface widening decision (Step 1.2 adds `ItemAlreadyExist` to `DefaultService` interface); confirms that exceptions belong in the throws clause at the seam (interface), not only in concrete implementations
- `tdd` — Selected — TDD principles applied to test changes: update existing tests to describe correct behavior, add new tests for ClientService where none existed
- `memory-bank` — Selected — loaded project context and confirmed codebase state
- `glossary-management` — Reviewed — not needed; no new domain terms introduced
- `find-docs` — Reviewed — not needed; changes involve only Java checked-exception throws-clause mechanics and Spring Security CORS configuration, both well-understood and not API-version-sensitive

### Documentation Reviewed

- `documentation/Bugs/to-do/Post-Implementation-Review-of-Llm-Model-Entity-and-Admin-Crud.md` — full parent bug report; findings, evidence locations, decisions, resolution steps
- `documentation/Memory/known-issues.md` — confirmed CORS gap and DefaultServiceImplements.update() incompleteness are documented there
- `documentation/Memory/architecture.md` — confirmed `GlobalExceptionHandler` exception-to-HTTP mapping, generic CRUD scaffold architecture
- `documentation/Memory/tech.md` — Java 21, Spring Boot 3.4.1, JUnit 5 + AssertJ; no framework-version-sensitive CORS APIs in scope

### Related Existing Code

- `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java:113` — CORS `setAllowedMethods` call; target of Step 1.1
- `backend/src/main/java/com/agentForgeBackend/shared/defaultInterfaces/DefaultService.java:21` — interface `update()` throws clause; widened in Step 1.2
- `backend/src/main/java/com/agentForgeBackend/shared/defaultImplements/DefaultServiceImplements.java:90` — base class `update()` throws clause; widened in Step 1.2
- `backend/src/main/java/com/agentForgeBackend/shared/defaultImplements/DefaultController.java:48` — base controller `update()` throws clause; widened in Step 1.2
- `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelService.java:66,74` — `update()` signature and duplicate-modelId exception; fixed in Step 1.3
- `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeService.java:100,110,116` — `update()` signature and two duplicate-user exception sites; fixed in Step 1.4
- `backend/src/main/java/com/agentForgeBackend/models/hq/client/ClientService.java:108,123,133` — `update()` signature and two duplicate-user exception sites; fixed in Step 1.5
- `backend/src/main/java/com/agentForgeBackend/exceptions/GlobalExceptionHandler.java:62,77` — `InvalidInsertDetails` → 400 and `ItemAlreadyExist` → 409; not modified
- `backend/src/test/java/com/agentForgeBackend/models/llm/LlmModelServiceCrudIntegrationTest.java:135` — test that currently expects `InvalidInsertDetails`; updated in Step 1.3
- `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeServiceCrudIntegrationTest.java:157,169,181` — three tests that currently expect `InvalidInsertDetails`; updated in Step 1.4

---

## Implementation Details

### Approach

The fix is a directed, minimal correction that aligns implementation with the spec. No new abstractions are introduced.

**CORS fix (Step 1.1):** One-line addition to an explicit method list. The `setAllowedMethods` call in `SecurityConfig` uses an explicit `List.of(...)`. Adding `"PATCH"` keeps the list explicit (prefer explicit over wildcard for security) and unblocks the toggle endpoint from browser clients.

**Interface widening (Step 1.2):** Because `ItemAlreadyExist extends Exception` is a checked exception, Java requires it to be declared in the throws clause of every method in the call chain that can propagate it. Three files form the call chain from interface to controller:
1. `DefaultService` (interface) — declares the contract
2. `DefaultServiceImplements` (base class) — implements the interface
3. `DefaultController` (base controller) — calls `defaultService.update()`

All three must declare `throws ... ItemAlreadyExist`. The base class body (`DefaultServiceImplements.update()`) never throws `ItemAlreadyExist` itself (it doesn't check for duplicates), but the throws clause must be widened so that concrete subclasses that DO throw it are valid overrides.

**Service fixes (Steps 1.3–1.5):** Each concrete service adds `ItemAlreadyExist` to its override signature and changes the duplicate-identifier `throw` from `InvalidInsertDetails` to `ItemAlreadyExist`. The null/blank validation throws (`InvalidInsertDetails("... is null")`, `InvalidInsertDetails("requires...")`) are left unchanged — those represent genuinely bad input, not a conflict.

**Test changes:** Existing tests that assert `InvalidInsertDetails.class` are renamed and their assertion updated to `ItemAlreadyExist.class`. For `ClientService`, new targeted tests are added in a new `ClientServiceCrudIntegrationTest` class because no CRUD tests existed.

**SOLID / deep module analysis:** The `DefaultService` interface is a seam. Adding `ItemAlreadyExist` to the interface's `update()` throws clause is correct — the interface should declare the full set of checked exceptions that callers must handle, matching the actual domain behavior. The prior omission was a defect in the interface spec, not a deliberate narrowing.

### Files to Create/Modify

- [x] `backend/src/main/java/com/agentForgeBackend/configuration/security/SecurityConfig.java` — add `"PATCH"` to `setAllowedMethods` (Step 1.1)
- [x] `backend/src/main/java/com/agentForgeBackend/shared/defaultInterfaces/DefaultService.java` — widen `update()` throws clause (Step 1.2)
- [x] `backend/src/main/java/com/agentForgeBackend/shared/defaultImplements/DefaultServiceImplements.java` — widen `update()` throws clause (Step 1.2)
- [x] `backend/src/main/java/com/agentForgeBackend/shared/defaultImplements/DefaultController.java` — widen `update()` throws clause (Step 1.2)
- [x] `backend/src/main/java/com/agentForgeBackend/models/llm/LlmModelService.java` — widen signature, change duplicate exception (Step 1.3)
- [x] `backend/src/main/java/com/agentForgeBackend/models/hq/employee/EmployeeService.java` — widen signature, change two duplicate exceptions, add `ItemAlreadyExist` to `@Transactional rollbackFor` (Step 1.4)
- [x] `backend/src/main/java/com/agentForgeBackend/models/hq/client/ClientService.java` — widen signature, change two duplicate exceptions (Step 1.5)
- [x] `backend/src/test/java/com/agentForgeBackend/models/llm/LlmModelServiceCrudIntegrationTest.java` — rename and update one test (Step 1.3)
- [x] `backend/src/test/java/com/agentForgeBackend/models/hq/employee/EmployeeServiceCrudIntegrationTest.java` — rename and update three tests (Step 1.4)
- [x] `backend/src/test/java/com/agentForgeBackend/models/hq/client/ClientServiceCrudIntegrationTest.java` — **create new file** with targeted duplicate-detection tests (Step 1.5)

---

## Step-by-Step Implementation

### Step 1: Add "PATCH" to CORS allowedMethods

**Goal:** Unblock `PATCH /llm-model/{id}/toggle` from browser-based frontends by including `"PATCH"` in the CORS method allowlist.
**Dependencies:** None. Independent of all other steps.

- [x] Open `SecurityConfig.java` and locate line 113 (`setAllowedMethods`)
- [x] Add `"PATCH"` between `"PUT"` and `"DELETE"` in the `List.of(...)` call
- [x] Verify the rest of the method is unchanged

**Why this step is critical:**
Without `"PATCH"` in `Access-Control-Allow-Methods`, browsers reject the preflight response for `PATCH /llm-model/{id}/toggle` before the actual request is sent. The toggle endpoint — the ADR-007 primary access-control mechanism for model enable/disable — is completely non-functional from any browser-based client. MockMvc tests do not exercise CORS preflight, so this is only visible when the React frontend actually runs.

#### Implementation

```java
// SecurityConfig.java — corsConfigurationSource() method
// Before (line 113):
corsConfiguration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));

// After:
corsConfiguration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
```

#### Edge Cases
1. **Future HTTP methods:** The known-issues.md note already documents that any new `@PatchMapping` or non-standard verb requires a corresponding entry in this list. The rule is already recorded.
2. **Wildcard alternative:** Using `"*"` would be simpler but sacrifices explicit security intent. The project deliberately maintains an explicit allowlist.

---

### Step 2: Widen DefaultService, DefaultServiceImplements, and DefaultController update() throws clause

**Goal:** Add `ItemAlreadyExist` to the checked-exception throws clause of the `update()` method in the interface, base class, and base controller so that concrete overrides can declare and throw it without compile errors.
**Dependencies:** None. Can be done concurrently with Step 1 or immediately after.

- [x] In `DefaultService.java`, add `ItemAlreadyExist` to `update()` throws clause
- [x] In `DefaultServiceImplements.java`, add `ItemAlreadyExist` to `update()` throws clause
- [x] In `DefaultController.java`, add `ItemAlreadyExist` to `update()` throws clause
- [x] Verify no other interface implementations exist that would also need updating (only `DefaultServiceImplements` implements `DefaultService`)

**Why this step is critical:**
`ItemAlreadyExist extends Exception` is a **checked exception**. Java's override rules require that an overriding method can only throw checked exceptions that are declared (or narrower) in the overridden method's throws clause. Without widening the interface first, Steps 1.3–1.5 would produce compile errors: "Exception `ItemAlreadyExist` is not compatible with throws clause in `DefaultService.update()`."

#### Implementation

```java
// DefaultService.java — line 21
// Before:
DTO update(ID id, FORM form) throws ItemNotFoundException, InvalidInsertDetails;

// After:
DTO update(ID id, FORM form) throws ItemNotFoundException, InvalidInsertDetails, ItemAlreadyExist;
```

```java
// DefaultServiceImplements.java — line 90
// Before:
public DTO update(ID id, FORM form) throws ItemNotFoundException, InvalidInsertDetails{

// After:
public DTO update(ID id, FORM form) throws ItemNotFoundException, InvalidInsertDetails, ItemAlreadyExist{
```

```java
// DefaultController.java — lines 48-49
// Before:
public ResponseEntity<DTO> update (@PathVariable ID id, @Valid @RequestBody FORM form) throws ItemNotFoundException,
        InvalidInsertDetails{

// After:
public ResponseEntity<DTO> update (@PathVariable ID id, @Valid @RequestBody FORM form) throws ItemNotFoundException,
        InvalidInsertDetails, ItemAlreadyExist{
```

#### Edge Cases
1. **AdminServiceImpl:** Does not override `update()`. Its inherited base-class `update()` now declares `ItemAlreadyExist` in the throws clause. This is safe — the base class body never actually throws it, and the method signature widening has no behavioral impact on Admin.
2. **`@Transactional(rollbackFor)` on DefaultServiceImplements:** Already includes `ItemAlreadyExist.class` at the class level. No change needed there.

---

### Step 3: Fix LlmModelService.update() and its test

**Goal:** Change the exception thrown for duplicate `modelId` in `update()` from `InvalidInsertDetails` to `ItemAlreadyExist`, and update the test to match.
**Dependencies:** Step 2 must be complete (interface widened).

- [x] In `LlmModelService.java`, add `ItemAlreadyExist` to the `update()` method signature
- [x] Change `throw new InvalidInsertDetails(...)` at line 75 to `throw new ItemAlreadyExist(...)`
- [x] In `LlmModelServiceCrudIntegrationTest.java`, rename `updateThrowsInvalidInsertDetailsWhenModelIdChangesToExisting` to `updateThrowsItemAlreadyExistWhenModelIdChangesToExisting`
- [x] In the renamed test, change `.isInstanceOf(InvalidInsertDetails.class)` to `.isInstanceOf(ItemAlreadyExist.class)`
- [x] Verify `InvalidInsertDetails` import is still needed in `LlmModelService` (it is — used for null form and the `insert()` method)

**Why this step is critical:**
`insert()` already throws `ItemAlreadyExist` for duplicate `modelId`. A frontend calling `POST /llm-model` learns to handle 409 for duplicates. When it later calls `PUT /llm-model/{id}` with a conflicting `modelId`, it receives 400 instead — a different status code for the same semantic condition. This is the inconsistency the parent bug identifies.

#### Implementation

```java
// LlmModelService.java — update() method signature (line 66)
// Before:
public LlmModelDTO update(Long id, LlmModelForm form) throws ItemNotFoundException, InvalidInsertDetails {

// After:
public LlmModelDTO update(Long id, LlmModelForm form) throws ItemNotFoundException, InvalidInsertDetails, ItemAlreadyExist {
```

```java
// LlmModelService.java — duplicate-modelId exception (line 74-75)
// Before:
if (llmModelRepository.existsByModelId(form.getModelId())) {
    throw new InvalidInsertDetails("A model with modelId '" + form.getModelId() + "' already exists");
}

// After:
if (llmModelRepository.existsByModelId(form.getModelId())) {
    throw new ItemAlreadyExist("A model with modelId '" + form.getModelId() + "' already exists");
}
```

```java
// LlmModelServiceCrudIntegrationTest.java — lines 135-143
// Before (test name and assertion):
@Test
void updateThrowsInvalidInsertDetailsWhenModelIdChangesToExisting() throws Exception {
    llmModelService.insert(new LlmModelForm("first/model", "First", null));
    llmModelService.insert(new LlmModelForm("second/model", "Second", null));
    Long secondId = llmModelRepository.findByModelId("second/model").orElseThrow().getId();

    assertThatThrownBy(() -> llmModelService.update(secondId,
            new LlmModelForm("first/model", null, null)))
            .isInstanceOf(InvalidInsertDetails.class)
            .hasMessageContaining("first/model");
}

// After:
@Test
void updateThrowsItemAlreadyExistWhenModelIdChangesToExisting() throws Exception {
    llmModelService.insert(new LlmModelForm("first/model", "First", null));
    llmModelService.insert(new LlmModelForm("second/model", "Second", null));
    Long secondId = llmModelRepository.findByModelId("second/model").orElseThrow().getId();

    assertThatThrownBy(() -> llmModelService.update(secondId,
            new LlmModelForm("first/model", null, null)))
            .isInstanceOf(ItemAlreadyExist.class)
            .hasMessageContaining("first/model");
}
```

#### Edge Cases
1. **Null form throws `InvalidInsertDetails`:** The guard at `if (form == null)` on line 67 remains `InvalidInsertDetails` — this is correct, as null input is genuinely bad input, not a conflict.
2. **`hasMessageContaining` assertion:** The message text does not change (`"A model with modelId '...' already exists"`), only the exception type. The `.hasMessageContaining("first/model")` assertion remains valid.

---

### Step 4: Fix EmployeeService.update() and its three tests

**Goal:** Change the two `InvalidInsertDetails` throws for duplicate email/username in `EmployeeService.update()` to `ItemAlreadyExist`, add `ItemAlreadyExist` to the `@Transactional` rollbackFor, and update three tests.
**Dependencies:** Step 2 must be complete.

- [x] In `EmployeeService.java`, add `ItemAlreadyExist` to the `update()` method signature
- [x] Add `ItemAlreadyExist.class` to the `@Transactional(rollbackFor = {...})` on `update()`
- [x] Change `throw new InvalidInsertDetails(...)` for email conflict (line 110) to `throw new ItemAlreadyExist(...)`
- [x] Change `throw new InvalidInsertDetails(...)` for username conflict (line 116) to `throw new ItemAlreadyExist(...)`
- [x] In `EmployeeServiceCrudIntegrationTest.java`, rename and update the three affected test methods (lines 157, 169, 181)
- [x] Verify `InvalidInsertDetails` import is still needed in `EmployeeService` (it is — used for null/blank form validation)

**Why this step is critical:**
`EmployeeService.insert()` already throws `ItemAlreadyExist` for duplicate username and email. The inconsistency in `update()` has the same frontend-impact as described for LlmModel. The parent bug explicitly extended the scope to cover Employee and Client as part of the same fix.

#### Implementation

```java
// EmployeeService.java — update() method signature (line 100)
// Before:
public EmployeeDTO update(Long id, EmployeeForm form) throws ItemNotFoundException, InvalidInsertDetails {

// After:
public EmployeeDTO update(Long id, EmployeeForm form) throws ItemNotFoundException, InvalidInsertDetails, ItemAlreadyExist {
```

```java
// EmployeeService.java — @Transactional on update() (line 100) <!-- REVIEW-FIX: corrected line number from 99 to 100 -->
// Before:
@Transactional(rollbackFor = {ItemNotFoundException.class, InvalidInsertDetails.class})

// After:
@Transactional(rollbackFor = {ItemNotFoundException.class, InvalidInsertDetails.class, ItemAlreadyExist.class})
```

```java
// EmployeeService.java — duplicate-email exception (line 109-112)
// Before:
if (baseUserRepository.existsByEmail(form.getEmail())) {
    throw new InvalidInsertDetails("A user with email '" + form.getEmail() + "' already exists");
}

// After:
if (baseUserRepository.existsByEmail(form.getEmail())) {
    throw new ItemAlreadyExist("A user with email '" + form.getEmail() + "' already exists");
}
```

```java
// EmployeeService.java — duplicate-username exception (line 115-118)
// Before:
if (baseUserRepository.existsByUsername(form.getUsername())) {
    throw new InvalidInsertDetails("A user with username '" + form.getUsername() + "' already exists");
}

// After:
if (baseUserRepository.existsByUsername(form.getUsername())) {
    throw new ItemAlreadyExist("A user with username '" + form.getUsername() + "' already exists");
}
```

```java
// EmployeeServiceCrudIntegrationTest.java — test at line 157
// Before:
@Test
void updateThrowsInvalidInsertDetailsWhenEmailConflictsWithAnotherUser() throws Exception {
    ...
    assertThatThrownBy(...)
            .isInstanceOf(InvalidInsertDetails.class)
            .hasMessageContaining("user4@example.com");
}

// After:
@Test
void updateThrowsItemAlreadyExistWhenEmailConflictsWithAnotherUser() throws Exception {
    ...
    assertThatThrownBy(...)
            .isInstanceOf(ItemAlreadyExist.class)
            .hasMessageContaining("user4@example.com");
}
```

```java
// EmployeeServiceCrudIntegrationTest.java — test at line 169
// Before:
@Test
void updateThrowsInvalidInsertDetailsWhenUsernameConflictsWithAdminUser() throws Exception {
    ...
    assertThatThrownBy(...)
            .isInstanceOf(InvalidInsertDetails.class)
            .hasMessageContaining("admin-conflict");
}

// After:
@Test
void updateThrowsItemAlreadyExistWhenUsernameConflictsWithAdminUser() throws Exception {
    ...
    assertThatThrownBy(...)
            .isInstanceOf(ItemAlreadyExist.class)
            .hasMessageContaining("admin-conflict");
}
```

```java
// EmployeeServiceCrudIntegrationTest.java — test at line 181
// Before:
@Test
void updateThrowsInvalidInsertDetailsWhenEmailConflictsWithClientUser() throws Exception {
    ...
    assertThatThrownBy(...)
            .isInstanceOf(InvalidInsertDetails.class)
            .hasMessageContaining("client-conflict@example.com");
}

// After:
@Test
void updateThrowsItemAlreadyExistWhenEmailConflictsWithClientUser() throws Exception {
    ...
    assertThatThrownBy(...)
            .isInstanceOf(ItemAlreadyExist.class)
            .hasMessageContaining("client-conflict@example.com");
}
```

#### Edge Cases
1. **Null form and blank-field guards remain `InvalidInsertDetails`:** Lines 102-104 (`throw new InvalidInsertDetails("EmployeeForm is null")`) and line 75-77 (`"Employee requires username, email, and password"`) are correct and unchanged — those are genuinely bad input, not conflicts.
2. **Cross-subtype uniqueness:** `baseUserRepository.existsByEmail()` and `existsByUsername()` query `base_user` across all subtypes (Admin, Client, Employee). The fix does not change which repository method is called, only which exception is thrown when it returns `true`.

---

### Step 5: Fix ClientService.update() and add targeted tests

**Goal:** Change the two `InvalidInsertDetails` throws for duplicate email/username in `ClientService.update()` to `ItemAlreadyExist`, and create `ClientServiceCrudIntegrationTest` with two tests verifying the new behavior.
**Dependencies:** Step 2 must be complete. No dependency on Steps 3 or 4.

- [x] In `ClientService.java`, add `ItemAlreadyExist` to the `update()` method signature
- [x] Change `throw new InvalidInsertDetails(msg)` for email conflict (line 127) to `throw new ItemAlreadyExist(msg)`
- [x] Change `throw new InvalidInsertDetails(msg)` for username conflict (line 137) to `throw new ItemAlreadyExist(msg)`
- [x] Create `backend/src/test/java/com/agentForgeBackend/models/hq/client/ClientServiceCrudIntegrationTest.java`
- [x] Add test `updateThrowsItemAlreadyExistWhenEmailChangesToExisting`
- [x] Add test `updateThrowsItemAlreadyExistWhenUsernameChangesToExisting`

**Why this step is critical:**
`ClientService` is the third service with the same pattern. Without this fix, `PUT /client/{id}` returns 400 for a duplicate email/username while `POST /client` returns 409. The `@Transactional(rollbackFor = {...})` on `ClientService.update()` already contains `ItemAlreadyExist.class` — an artifact that confirms the original intent was to throw it.

#### Implementation

```java
// ClientService.java — update() method signature (line 108)
// Before:
public ClientDTO update(Long id, ClientForm clientForm) throws ItemNotFoundException, InvalidInsertDetails {

// After:
public ClientDTO update(Long id, ClientForm clientForm) throws ItemNotFoundException, InvalidInsertDetails, ItemAlreadyExist {
```

```java
// ClientService.java — duplicate-email exception (lines 122-128)
// Before:
if (baseUserRepository.existsByEmail(clientForm.getEmail())) {
    String msg = "A user with email '" + clientForm.getEmail() + "' already exists";
    logger.error(msg);
    throw new InvalidInsertDetails(msg);
}

// After:
if (baseUserRepository.existsByEmail(clientForm.getEmail())) {
    String msg = "A user with email '" + clientForm.getEmail() + "' already exists";
    logger.error(msg);
    throw new ItemAlreadyExist(msg);
}
```

```java
// ClientService.java — duplicate-username exception (lines 132-139)
// Before:
if (baseUserRepository.existsByUsername(clientForm.getUsername())) {
    String msg = "A user with username '" + clientForm.getUsername() + "' already exists";
    logger.error(msg);
    throw new InvalidInsertDetails(msg);
}

// After:
if (baseUserRepository.existsByUsername(clientForm.getUsername())) {
    String msg = "A user with username '" + clientForm.getUsername() + "' already exists";
    logger.error(msg);
    throw new ItemAlreadyExist(msg);
}
```

```java
// ClientServiceCrudIntegrationTest.java — new file
package com.agentForgeBackend.models.hq.client;

import com.agentForgeBackend.exceptions.ItemAlreadyExist;
import com.agentForgeBackend.models.hq.ListQueryTestDataFactory;
import com.agentForgeBackend.models.hq.admin.AdminRepository;
import com.agentForgeBackend.models.hq.employee.EmployeeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@WithMockUser(username = "fix-client-update", roles = "ADMIN")
class ClientServiceCrudIntegrationTest {

    @Autowired
    private ClientService clientService;

    @Autowired
    private ClientRepository clientRepository;

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    // REVIEW-FIX: Added adminRepository and employeeRepository cleanup to match
    // EmployeeServiceCrudIntegrationTest pattern. baseUserRepository.existsByEmail()
    // and existsByUsername() query base_user across ALL user types; leaving admin/employee
    // records from prior test classes could cause spurious test failures.
    @BeforeEach
    void setUp() {
        employeeRepository.deleteAll();
        employeeRepository.flush();
        clientRepository.deleteAll();
        clientRepository.flush();
        adminRepository.deleteAll();
        adminRepository.flush();
    }

    @Test
    void updateThrowsItemAlreadyExistWhenEmailChangesToExisting() throws Exception {
        ClientEntity alpha = clientRepository.saveAndFlush(
                ListQueryTestDataFactory.client("client-alpha", true, ListQueryTestDataFactory.EARLY_DATE, 30_001L));
        ClientEntity beta = clientRepository.saveAndFlush(
                ListQueryTestDataFactory.client("client-beta", true, ListQueryTestDataFactory.MIDDLE_DATE, 30_002L));

        ClientForm form = new ClientForm();
        form.setEmail(alpha.getEmail()); // alpha's email — already taken

        assertThatThrownBy(() -> clientService.update(beta.getId(), form))
                .isInstanceOf(ItemAlreadyExist.class)
                .hasMessageContaining(alpha.getEmail());
    }

    @Test
    void updateThrowsItemAlreadyExistWhenUsernameChangesToExisting() throws Exception {
        ClientEntity alpha = clientRepository.saveAndFlush(
                ListQueryTestDataFactory.client("client-gamma", true, ListQueryTestDataFactory.EARLY_DATE, 30_003L));
        ClientEntity beta = clientRepository.saveAndFlush(
                ListQueryTestDataFactory.client("client-delta", true, ListQueryTestDataFactory.MIDDLE_DATE, 30_004L));

        ClientForm form = new ClientForm();
        form.setUsername(alpha.getUsername()); // alpha's username — already taken

        assertThatThrownBy(() -> clientService.update(beta.getId(), form))
                .isInstanceOf(ItemAlreadyExist.class)
                .hasMessageContaining(alpha.getUsername());
    }
}
```

#### Edge Cases
1. **`ClientForm` has no password field** — `ClientService.update()` does not require a password in the update form. Setting only `email` or only `username` in the form is valid and exercises the specific duplicate-check paths.
2. **`ListQueryTestDataFactory.client()` uses `apikey` parameter** — the factory creates a `ClientEntity` directly via repository. The `apikey` parameter is included to satisfy any non-null constraint on the entity; use distinct values (30_001L–30_004L) to avoid any unique constraint conflicts.
3. **`@WithMockUser(roles = "ADMIN")` at class level** — `ClientService.update()` inherits `@PreAuthorize("isAuthenticated()")` from `DefaultServiceImplements`. Admin satisfies authenticated. This is consistent with other service CRUD test classes.
4. **No `FileSigner` or `PasswordEncoder` dependency** — tests use `clientRepository.saveAndFlush()` to create fixture data, bypassing `ClientService.insert()` and its password-hash logic. This is the same pattern used by `ClientServiceListQueryIntegrationTest`.
5. **All three user repositories are cleared in `@BeforeEach`** — `baseUserRepository.existsByEmail()` and `existsByUsername()` query across Admin, Client, and Employee subtypes. Clearing only `clientRepository` would leave admin/employee records from other test classes in H2, which could cause spurious duplicate-detection failures. The pattern matches `EmployeeServiceCrudIntegrationTest`.

---

## Design Decisions

**Decision 1:** Add `ItemAlreadyExist` to the `DefaultService.update()` interface throws clause rather than leaving it only on concrete overrides.
- **Why:** `ItemAlreadyExist extends Exception` is a checked exception. Java's override compatibility rules require that concrete overrides can only declare checked exceptions that the overridden method (and interface) declares. Leaving the interface unchanged would produce compile errors in concrete services. The interface is the correct seam for this declaration — it documents to callers that `update()` can surface a conflict condition.
- **Alternatives considered:** (a) Make `ItemAlreadyExist` extend `RuntimeException` — would allow throwing it without interface changes, but would break all existing callers that rely on the checked-exception contract for forced handling, and would silently change the semantics of the other exception types. Rejected: too wide a change for a targeted fix. (b) Wrap `ItemAlreadyExist` inside `InvalidInsertDetails` — preserves the current HTTP 400 but does not fix the bug. Rejected: the goal is HTTP 409.

**Decision 2:** Leave null/blank input validation throwing `InvalidInsertDetails` (HTTP 400) unchanged.
- **Why:** `InvalidInsertDetails("EmployeeForm is null")`, `InvalidInsertDetails("LlmModelForm is null")`, etc. represent genuinely malformed input — a missing or empty request body. HTTP 400 is correct for these cases. HTTP 409 Conflict semantically means "the request is well-formed but conflicts with existing state." Null forms never reach the duplicate-check code.
- **Alternatives considered:** Standardize all update() validation errors to `ItemAlreadyExist` — would produce incorrect HTTP 409 for null inputs. Rejected: wrong semantics.

**Decision 3:** Create `ClientServiceCrudIntegrationTest` with only the two targeted duplicate-detection tests rather than a comprehensive CRUD test class.
- **Why:** The scope of this task is fixing the exception contract bug. A minimal test that verifies the fix is sufficient. Adding full CRUD coverage for `ClientService` (insert, getOne, getAll, delete) would expand scope beyond what the parent bug requires and would introduce complexity around `FileSigner` (the password-hash mechanism). The two new tests directly verify the behavior change and nothing else.
- **Alternatives considered:** Full ClientService CRUD test class — valid future work but out of scope for this bug fix. Rejected for this task.

**Decision 4:** Use `clientRepository.saveAndFlush()` with `ListQueryTestDataFactory.client()` for test fixture setup in `ClientServiceCrudIntegrationTest`.
- **Why:** This pattern bypasses `ClientService.insert()` and its `FileSigner`/password-hash dependency, which is not relevant to the duplicate-check test. The same pattern is used by `ClientServiceListQueryIntegrationTest`. This keeps the test fast and avoids implicit dependencies on `FileSigner` being properly configured in the test profile.
- **Alternatives considered:** Use `ClientService.insert()` for setup — would require `FileSigner` to be active in the test profile and would add implicit coupling. Rejected: unnecessary complexity.

---

## Testing Considerations

### Automatic Validation

- [x] Run `./mvnw test -pl backend` — all tests must pass. Expected total: **505 tests** (503 existing + 2 new tests in `ClientServiceCrudIntegrationTest`), 0 failures, 1 pre-existing Docker error (`authServerApplicationTests.contextLoads`). **Actual: 507 tests, 0 failures, 1 error (pre-existing).** The +2 difference from the estimate is due to the surefire retry mechanism counting both runs of `authServerApplicationTests.contextLoads`.
- [x] Verify `LlmModelServiceCrudIntegrationTest#updateThrowsItemAlreadyExistWhenModelIdChangesToExisting` passes (renamed from `updateThrowsInvalidInsertDetailsWhenModelIdChangesToExisting`).
- [x] Verify `EmployeeServiceCrudIntegrationTest#updateThrowsItemAlreadyExistWhenEmailConflictsWithAnotherUser` passes.
- [x] Verify `EmployeeServiceCrudIntegrationTest#updateThrowsItemAlreadyExistWhenUsernameConflictsWithAdminUser` passes.
- [x] Verify `EmployeeServiceCrudIntegrationTest#updateThrowsItemAlreadyExistWhenEmailConflictsWithClientUser` passes.
- [x] Verify `ClientServiceCrudIntegrationTest#updateThrowsItemAlreadyExistWhenEmailChangesToExisting` passes.
- [x] Verify `ClientServiceCrudIntegrationTest#updateThrowsItemAlreadyExistWhenUsernameChangesToExisting` passes.
- [x] Confirm the build compiles without warnings related to unchecked exceptions (`./mvnw compile -pl backend` with no compilation errors).

### Manual Validation

- [ ] **CORS preflight test (browser, after frontend exists):** From a browser, navigate to the React frontend and perform `PATCH /llm-model/{id}/toggle`. Confirm the toggle request succeeds (no CORS preflight rejection in browser DevTools Network tab). This cannot be validated automatically — MockMvc does not enforce CORS.

---

## Related Code Explanations

- `backend/src/main/java/com/agentForgeBackend/exceptions/GlobalExceptionHandler.java:62-89` — `InvalidInsertDetails` → 400 and `ItemAlreadyExist` → 409 mapping. Not modified by this task; the fix works because these handlers already exist and route the exception to the correct HTTP status.
- `backend/src/main/java/com/agentForgeBackend/shared/defaultImplements/DefaultServiceImplements.java:24-30` — Class-level `@Transactional(rollbackFor = {...})` already includes `ItemAlreadyExist.class`. The base class will roll back correctly when the subclass throws `ItemAlreadyExist` from an overridden `update()`.
- `backend/src/main/java/com/agentForgeBackend/models/hq/admin/AdminServiceImpl.java` — Does not override `update()`. The widened throws clause in the interface and base class propagates to `AdminServiceImpl` without any code change in Admin. Admin's `update()` behavior (load-and-save-without-form, the incomplete-update bug) is a separate known issue and is NOT addressed by this task.

---

## Completion Criteria

- [x] Parent document reviewed and reflected accurately in this task
- [x] Relevant skills reviewed and selected for this task
- [x] Step 1.1: `"PATCH"` added to `corsConfiguration.setAllowedMethods()` in `SecurityConfig.java`
- [x] Step 1.2: `ItemAlreadyExist` added to `update()` throws clause in `DefaultService`, `DefaultServiceImplements`, and `DefaultController`
- [x] Step 1.3: `LlmModelService.update()` throws `ItemAlreadyExist` for duplicate `modelId`; corresponding test renamed and updated
- [x] Step 1.4: `EmployeeService.update()` throws `ItemAlreadyExist` for duplicate email/username; `@Transactional rollbackFor` updated; three tests renamed and updated
- [x] Step 1.5: `ClientService.update()` throws `ItemAlreadyExist` for duplicate email/username; `ClientServiceCrudIntegrationTest` created with two targeted tests
- [x] All implementation steps checked off
- [x] `./mvnw test -pl backend` passes: **507 tests, 0 failures** (1 pre-existing Docker error is acceptable; count is 507 vs estimated 505 due to surefire retry counting both runs of `authServerApplicationTests.contextLoads`)
- [ ] Manual validation step documented for browser CORS test (cannot be automated)
- [x] No other files modified beyond the 10 listed in "Files to Create/Modify"
