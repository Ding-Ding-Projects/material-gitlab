---
title: Material administration and identity surfaces
---

# Material administration and identity surfaces

The administration dashboard is rendered by the Material surface at `/admin` and
receives its user, runner, project, count, and health values from the authenticated
Rails controller. Mutations are submitted to the controller action endpoint and
are rejected when the current administrator lacks the required permission.

The project Manage surface is owned by the project route `/:namespace/:project/-/manage`.
Its Activity tab uses the project's existing event collection and its Labels tab uses
the project's existing label records. Deleting a label calls the existing project-label
delete route; no design fixture is used when the project has no activity or labels.

Agent Memory is an authenticated, bounded status surface at `/-/agent-memory`. The
endpoint reports the signed-in user's non-secret identity and explicit empty collections
until a local memory provider is configured. It does not expose instruction files,
credentials, tokens, environment values, or host paths, and it never substitutes sample
memory records for real data.

The Devise sign-in page keeps the existing Rails form, OmniAuth, LDAP, WebAuthn/passkey,
terms, registration, broadcast, and error flows. The page chrome and form host use the
Material Login contract; authentication remains owned by Devise and the existing sign-in
application rather than a client-side mock.

## Verification

Run `node scripts/verify-admin-identity-contract.mjs`. The guard checks exact mount
selectors and routes, rejects fixture fallbacks in production mounts, and includes a
deliberate missing-mount regression that must fail before the final green result.
