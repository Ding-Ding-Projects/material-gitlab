# Project list route adapters

The project Issues and Merge Requests HTML index routes render their design-backed list components. Their HAML hosts provide current project identity, current-user display identity, exact boolean mutation abilities, native authoring paths, and `data-material-topbar-owner`. The Vue roots retain that ownership attribute after replacing their mount elements, so bootstrap order cannot produce duplicate top bars.

## Issues

`Projects::IssuesController#index` now renders `projects/issues/index.html.haml` for HTML instead of unconditionally redirecting to work items. Existing project access, issue-feature checks, session behavior, rate limits, Atom feeds, and creation/detail redirects remain intact. The route entrypoint is `pages/projects/issues/index/index.js`, which loads the previously staged material entrypoint.

The adapter receives the project ID explicitly. The existing GitLab Axios client supplies session cookies, CSRF protection, and the XMLHttpRequest header. Issue data, state changes, labels, assignees, and deletion use the existing REST service and project-local IID mapping. Writes require exact server-provided permissions, and successful HTTP responses must contain valid issue identities and confirm a requested state change. Partial bulk results announce only confirmed successes; deletion failure reloads authoritative data. Creation and full editing retain the existing native routes. The board control opens the real project board rather than treating reference columns as configured backend lists. The work-items link preserves advanced type and filter workflows.

Plain-text search, state filters, and assigned-to-me filtering are sent to the API. Regex matching explicitly applies to the current page. Pagination follows server metadata, including next-page headers when total counts are unavailable; it never invents an overall count. Stale read responses cannot replace a newer filter result.

## Merge Requests

The existing Merge Requests index view and action-specific entrypoint mount the actual project list. Native creation uses the existing source-project helper, preserving creation from a fork when appropriate. Full review links retain native editing, diffs, comments, approvals, merge checks, merge controls, and advanced review tools. The list does not replace those services with optimistic local detail state.

The scoped adapter uses the current installation prefix and URL-encodes the full project path exactly once. It requests a real page with state, authored-by-me, and text-search filters. The list renders a visible retryable error on failed reads. Unknown pipeline, approval, and comment metadata stays explicitly unavailable instead of being represented as passing or zero. Authorized bulk close applies returned server records and reports partial failures separately. Missing or malformed permission values block a write before transport.

Focused behavior is covered by `issues_adapter_spec.js`, `issues_merge_requests_route_spec.js`, and the existing collaboration surface specifications. These checks verify data contracts and mounted component behavior. Actual built Rails requests and rendered visual parity still require independent production evidence; test fixtures are not runtime evidence.
