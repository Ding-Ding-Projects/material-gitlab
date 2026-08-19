---
title: Material security surfaces
description: Live-data contracts for Secure and Security.
---

## Scope

The checked-in `design/Secure.dc.html` and `design/Security.dc.html` files are
the sole UI contracts. The production entries preserve their dependency,
audit, policy, scan, vulnerability, severity, search, triage, and bulk-action
surfaces.

## Live data and mutations

The host mounts `#js-material-secure` and `#js-security-dashboard` with
`data-endpoints`. Every list is loaded from its configured REST or GraphQL
adapter. Status changes, policy changes, scan actions, and issue creation are
sent to host endpoints and reflected only after a successful response. An
empty response is a truthful empty state; missing or failed endpoints produce
an actionable error and retry control.

## CE and EE behavior

The shared surface accepts the data shape supplied by the host. CE and EE
routes decide which endpoint and actions are available; the renderer does not
assume Ultimate data, synthesize findings, or bypass permissions. Destructive
actions remain behind the existing confirmation component.

## Verification

`spec/frontend/material_system/ops_security_contract_spec.js` checks exact
mount selectors, design references, live endpoint adapters, and no fixture
fallback in production Vue entries. Built-artifact interaction and visual
parity captures remain release requirements.
