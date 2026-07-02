#adr #adr-accepted #frontend #architecture

## ADR 010: Base UI Selected as the React Primitive Library for the Frontend

### Status
Accepted

### Context

The frontend React application uses shadcn as its component system, which requires an underlying headless UI primitive library to supply accessible, unstyled components (dialogs, popovers, selects, etc.). Two major options exist for this role:

- **Radix UI** (`@radix-ui/*`) — the original library shadcn was built on; mature, widely adopted, but developed by a separate team.
- **Base UI** (`@base-ui/react`) — a newer headless library from the MUI team, designed as a more cohesive successor to Radix UI primitives, with React 19 support from day one.

shadcn introduced a new style called `base-mira` that targets Base UI primitives directly, making it a first-class supported path within the shadcn ecosystem.

The decision was also informed by the project's React 19 baseline and the desire to adopt a library with active forward momentum rather than one in maintenance mode.

### Decision

We will use Base UI (`@base-ui/react`) as the headless primitive library for the frontend. The shadcn style is set to `base-mira` in `components.json`, and all shadcn components are generated against Base UI primitives.

`@radix-ui/react-slot` is retained as a dependency because shadcn components use the `asChild` prop pattern, which is provided by that single Radix package. It is a utility dependency only — not an adoption of Radix UI as a primitive library.

Radix UI full component packages (e.g., `@radix-ui/react-dialog`, `@radix-ui/react-select`) are explicitly excluded. If new shadcn components are added, they must be generated using the `base-mira` style.

### Consequences

- All shadcn component additions must use the `base-mira` style — using the default Radix-based style would silently introduce Radix UI packages and create a mixed-library situation.
- `@radix-ui/react-slot` will remain in the dependency tree permanently; this is expected and not a violation of this decision.
- Base UI's API surface differs from Radix UI; developers must refer to Base UI documentation rather than Radix UI documentation when working with primitives directly.
- Upgrading shadcn or Base UI must be coordinated — `base-mira` components are tied to the Base UI release being used.
- The project benefits from Base UI's React 19 compatibility and its tighter design cohesion across components.
