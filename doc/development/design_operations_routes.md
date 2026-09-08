# Operations design route adapters

The Deploy, Operate, Monitor, Secure, and Security design surfaces accept only
same-origin endpoint metadata emitted by their owning Rails route. Their fetch
adapter sends same-origin credentials, accepts JSON, and keeps server permission
responses intact. A missing endpoint is an unavailable capability, never a
fixture row or an assumed permission.

## Current route capability map

| Surface | Existing server data family | Supported adapter fields | Gap deliberately left unavailable |
| --- | --- | --- | --- |
| Deploy | Releases, feature flags, package and container registries | Release serializer fields, registry size and creation fields | A route must provide each registry endpoint before its tab can load or mutate. |
| Operate | Project environments, cluster integrations, Terraform states | Environment state and last deployment, cluster namespace/status, Terraform lock/version | The existing list surface has no common mutation endpoint, so it renders read-only. |
| Monitor | Incidents, alerts, error tracking, on-call and Service Desk | Identifier, title, description, state, severity and server timestamps | These families do not share one server mutation contract, so rows remain read-only until the owning route supplies a permitted one. |
| Secure | Dependency list, audit events, security policies and on-demand scans | Serializer fields passed through the endpoint contract | Audit and policy endpoints are capability-dependent. No local mutation fallback exists. |
| Security | Vulnerability REST/GraphQL connection | ID, severity, state, identifier, location, report type and timestamps | Issue creation is disabled unless the host explicitly provides an authorized endpoint. |

## Mutation and pagination rules

Each destructive action stays behind its existing confirmation UI and sends its
request only to the same-origin endpoint supplied by the Rails host. The client
does not infer endpoints, call external services, or optimistically claim a
success. A 401, 403, validation response, or malformed response stays visible
as an error state. Collection endpoints retain the owning server's pagination
semantics. These design surfaces do not invent cursors or page totals where a
controller has not exposed them.

## Verification

`spec/frontend/material_system/operations_data_adapters_spec.js` checks the
normalization boundary against representative Rails and API field shapes. The
route integration and runtime verification are owned by the controller and
mount-contract lanes because shared mounting files are intentionally outside
this surface lane.
