---
title: Material operations surfaces
description: Live-data contracts for Deploy, Operate, and Monitor.
---

## Scope

The checked-in `design/Deploy.dc.html`, `design/Operate.dc.html`, and
`design/Monitor.dc.html` files are the UI contracts for these surfaces. The
Vue entries under `app/assets/javascripts/material_system/surfaces/` preserve
their tabs, search, command palette, responsive rows, and explicit loading and
error states.

## Live data

Rails mounts `#js-material-deploy`, `#js-material-operate`, or
`#js-material-monitor` with a JSON `data-endpoints` attribute. The adapters
require an endpoint for every collection and use same-origin JSON requests;
missing endpoints fail visibly rather than rendering example releases,
environments, alerts, or incidents. Mutations are sent back to the endpoint
provided by the host and only update the row after the request succeeds.

## Recovery and permissions

The host remains the authority for authorization, pagination, and action
availability. A rejected request is shown as an alert with a retry action; no
client-side fallback grants a permission or invents an operation result.

## Verification

`spec/frontend/material_system/ops_security_contract_spec.js` checks the exact
mount selectors, design files, live endpoint adapters, and absence of fixture
constructors in production components. Built-artifact interaction and visual
parity captures remain required before release.
