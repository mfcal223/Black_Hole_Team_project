---
id: ADR-009
title: Long (Auto-Increment) Primary Key for All JPA Entities
status: accepted
date: 2026-06-16
---

## Context

When designing `LlmModelEntity`, the Backend Model Roadmap specified a `UUID` primary key. However, every existing JPA entity in the codebase (`BaseUserEntity`, `AdminEntity`, `EmployeeEntity`) uses `Long` with `@GeneratedValue(strategy = GenerationType.IDENTITY)` — an auto-incrementing database sequence managed by PostgreSQL.

A mixed-PK codebase (some entities `Long`, some `UUID`) would require:
- The generic scaffold (`DefaultRepository<ENTITY, ID>`, `DefaultController`, `DefaultServiceImplements`) to handle both ID types across different call sites.
- Path variable parsing differences in controllers (`@PathVariable Long id` vs. `@PathVariable UUID id`).
- Different QueryDSL field types and predicate expressions per entity.
- Documentation, tests, and muscle-memory split across two conventions.

UUID brings concrete benefits in distributed systems (globally unique IDs without coordination, safe for client-generated IDs, no sequential ID enumeration attacks). AgentForge is a self-hosted single-instance application with no distributed ID generation requirement and no public API that exposes IDs to untrusted clients. None of the UUID benefits apply here.

## Decision

All JPA entities in AgentForge use `Long` as the primary key type with `@GeneratedValue(strategy = GenerationType.IDENTITY)`.

```java
@Id
@GeneratedValue(strategy = GenerationType.IDENTITY)
@Column(name = "id")
private Long id;
```

No entity should use `UUID`, `Integer`, `String`, or any other type as its primary key unless this ADR is superseded.

## Consequences

**For developers:**
- Always declare `@Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;` in new entities.
- The generic scaffold type parameters should always pass `Long` as the `ID` type: `DefaultRepository<MyEntity, Long>`, `DefaultController<..., Long>`, etc.
- Do not use `UUID.randomUUID()` or `@GeneratedValue(strategy = GenerationType.UUID)` for entity PKs.
- If a feature spec or roadmap document specifies a UUID PK for a new entity, treat this ADR as the authoritative override and use `Long` instead.

**Accepted trade-offs:**
- Sequential `Long` IDs are enumerable in URL paths (e.g., `/llm-model/1`, `/llm-model/2`). This is acceptable because all endpoints require `ROLE_ADMIN` or authenticated access — there is no unauthenticated resource exposure.
- If AgentForge ever becomes a multi-tenant SaaS or requires distributed ID generation, this decision should be revisited with a migration plan.
