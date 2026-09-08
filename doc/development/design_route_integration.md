---
title: Material design route integration
---

The design surface inventory lives in
`app/assets/javascripts/material_system/surfaces/contracts.js`.
It contains one explicit row for every checked-in design reference.
The inventory records the route, page entrypoint, initializer, and host for each route that is
connected to a production surface.

## Connected routes

The following routes mount a design surface through an existing page-specific entrypoint:

| Surface | Route | Entrypoint | Host |
| --- | --- | --- | --- |
| Admin | `/admin` | `pages/admin/dashboard/index.js` | `#js-material-admin` |
| Agent Memory | `/-/agent_memory` | `pages/agent_memory/index.js` | `#js-material-agent-memory` |
| Build | `/:namespace/:project/-/jobs` | `pages/projects/jobs/index/index.js` | `#js-material-build` |
| Manage | `/:namespace/:project/-/manage` | `pages/projects/manage.js` | `#js-material-manage` |
| Repository | project repository views | `repository/index.js` | `#js-material-repository-app` |
| To-Dos | `/dashboard/todos` | `pages/dashboard/todos/index/index.js` | `#js-todos-app-root` |

The admin dashboard entrypoint initializes both the Jihu transition banner and the Material Admin
surface. The two initializers operate on separate hosts.

## Existing-host boundary

Analytics Dashboards already owns `#js-explore-analytics-dashboards` through an authenticated
Apollo router. The inventory labels Analyze as `preserved-host` until an adapter can supply the
same authorized data and lifecycle to the design component. Replacing that host from a generic
mount would discard the route's router and live data contract.

The remaining design surfaces have an explicit `route-contract-pending` row. They are not mounted
on invented routes or generic eager bundles. Each row names the missing compatibility condition,
such as a Rails host, live endpoint metadata, or a page-specific replacement boundary.

## Verification

Run the focused Jest specification and the independent source guard:

```shell
yarn jest spec/frontend/material_system/design_route_integration_spec.js --runInBand
node scripts/verify-design-integration.mjs
```

The specification deliberately removes the Admin row and its initializer requirement. Both changes
make the inventory validation fail before the original row is restored.
