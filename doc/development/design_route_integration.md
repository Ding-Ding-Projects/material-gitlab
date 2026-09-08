---
title: Material design route integration
---

`app/assets/javascripts/material_system/surfaces/contracts.js` is a hand-written
inventory of the 25 checked-in design references. It records actual server views,
page entries, import edges, initializers, and hosts. It does not infer a route from
a component export.

## Source-wired routes

Admin, Agent Memory, Analyze, Build, Code, Deploy, Epics, Issues, Manage, Merge Requests, Monitor,
Operate, Pipelines, Plan, Repository, Secure, Security, and To-Dos each have a Rails host and a
page entry that imports and calls the named surface initializer. Shell B and Sidebar
and Shell A are mounted by `entrypoints/super_sidebar.js` from the authenticated application
and page layouts. The inventory records one representative Code route; tags and
commits use the same `mountCodeSurface` import and host contract.

Command Palette and Regex Builder are embedded overlays in `ShellB.vue`. They have
component imports and template hosts, but no standalone Rails route. The source
guard verifies those exact imports and template hosts.

## Honest unresolved boundaries

Analyze replaces the authenticated project value-stream page at
`/:namespace/:project/-/value_stream_analytics`. Its Rails view supplies
`#js-material-analyze` and endpoint metadata, while the page entry imports and calls
`mountAnalyze`. Settings has checked-in initializer
and component source only, without an activated production page-entry edge. Login is a Rails-rendered Devise
authentication view, including `devise/sessions/new_base`; it is not recorded as a
Vue replacement.

The shared header command palette exposes actions to show or hide its theme
control. These select Shell A or Shell B through persisted `shellVariant`
preferences. Both variants use the real server navigation data; changing the
variant does not create a separate preview route. Preference failures retain the
current header and show an alert. Same-document settings changes notify other
subscribers once so header and sidebar themes remain synchronized.

Every row currently records `runtimeEvidence: 'not-captured'`. Source registration
is evidence of a checked-in edge only. It is not built-artifact interaction or a
capture claim.

## Verification

Run the focused specification and the independent AST-based source guard:

```shell
yarn jest spec/frontend/material_system/design_route_integration_spec.js --runInBand
node scripts/verify-design-integration.mjs
```

The focused negative cases remove an inventory row, import edge, initializer, and
host. The independent guard parses imports and calls with Babel AST nodes, so a
comment or unrelated substring cannot satisfy the source-wiring evidence.
