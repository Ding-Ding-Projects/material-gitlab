# Planning surfaces

The Plan, Epics, and To-Dos Material surfaces use the checked-in design references
as their UI contract:

* `design/Plan.dc.html`
* `design/Epics.dc.html`
* `design/Todos.dc.html`

The design files provide layout, states, labels, and interaction affordances.
They are not a production data source. Each surface loads records from the route
or GraphQL endpoint supplied by its server mount and renders an explicit error
state when that route is absent or unavailable. Inline fixture arrays and local
mutation-only state are deliberately not present in production modules.

## Data boundaries

`Plan` expects `data-material-plan` endpoint values (or
`window.__MATERIAL_PLAN_ENDPOINTS__`) for `milestones`, `iterations`,
`requirements`, and `wiki`. The loader normalizes server payloads while keeping
the original record fields available to the view. Status updates and wiki saves
use the same server-backed route, so permissions and validation remain owned by
Rails.

`Epics` uses the GitLab GraphQL endpoint and a server-provided `fullPath`. It
follows `pageInfo.endCursor` until the complete group collection is loaded. State
updates and deletion require explicit server routes from the mount; the Material
surface does not silently remove an epic when a mutation fails. CE/EE mounts may
provide different routes, but both must satisfy the same adapter contract.

`Todos` uses the GitLab GraphQL `currentUser.todos` query. The active view is
reflected in the URL's `state` parameter and each state change is sent through
the `todoMarkDone` or `todoRestore` mutation. Bulk actions fan out only the
selected server IDs and report partial transport failures instead of claiming a
local-only success.

## Verification

`spec/frontend/material_system/planning_surfaces_spec.js` covers missing-route
fail-closed behavior, payload normalization, GraphQL pagination, server error
reporting, and the exact Plan/Epics/Todos mount entries. Tests inject a fetcher;
production mounts use same-origin transport and never use the injected fixture
path.
