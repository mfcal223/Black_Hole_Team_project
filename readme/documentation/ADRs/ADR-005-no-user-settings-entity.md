---
id: ADR-005
title: User Preferences Deferred to Frontend — No UserSettings Entity for MVP
status: accepted
date: 2026-06-15
---

## Context

The team identified user preferences (dark mode, language, notification settings, etc.) as a possible domain to model in the backend with a `UserSettingsEntity`. This entity would store per-user UI preferences in the database so they persist across devices and sessions.

For the MVP, this is not a required feature. The primary use case is employees at a single business using the app on their work machine. Cross-device preference sync is not a stated requirement.

Backend persistence of UI preferences adds:
- A new JPA entity, repository, service, mapper, and controller
- An API endpoint the frontend must call on load and on every preference change
- Migration risk if the preference schema changes

None of this is justified for preferences that can live in `localStorage` with zero backend cost.

## Decision

User preferences are **not persisted in the backend** for the MVP. The frontend stores UI state (dark mode, sidebar state, etc.) in `localStorage`. No `UserSettingsEntity` will be created.

## Consequences

**For developers:**
- Do not create a `UserSettingsEntity`, `PreferencesEntity`, or any user-facing configuration entity unless this ADR is superseded.
- The frontend owns all UI preference state. If a preference needs to influence backend behavior (e.g., preferred default model), it should be sent as part of the relevant API request rather than stored server-side.
- If cross-device sync becomes a real requirement, the correct path is to introduce a `UserSettingsEntity` at that point. The decision to add it later is cheap; the decision to build it now and never need it is waste.

**Accepted trade-offs:**
- Preferences reset if the employee clears browser storage or switches devices. This is an accepted limitation of the MVP.
