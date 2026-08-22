# Collaboration and CI surfaces

The Material Merge Requests, Pipelines, Code, and Build surfaces are mounted with a project path and use GitLab's authenticated REST API through the shared frontend Axios client. They do not render bundled records when the API is unavailable.

## Data and permissions

- Merge Requests loads the project list, approvals, changes, and discussions. Approve/unapprove, merge, close, comment, and discussion resolution use the matching project endpoints, so GitLab permissions and server-side validation remain authoritative.
- Pipelines loads pipeline details, jobs, and traces. Run, retry, cancel, delete, and job retry actions use the corresponding API operations; a trace that is unavailable is shown as unavailable rather than fabricated.
- Code loads branches, commits, tags, snippets, and repository compare results. Protected branches remain non-deletable in the UI, while the server remains the final authority.
- Build loads jobs, schedules, test cases, artifacts, and `.gitlab-ci.yml`. YAML updates are committed through the repository-files API with the selected ref. Unsupported test-case mutations report the instance capability instead of pretending that the update succeeded.

## Failure modes

The mount fails closed when `data-project-path` is missing. API failures remain visible through the existing loading/error and notification surfaces, and local state is changed only after the corresponding request resolves.

## Verification

`spec/frontend/material_system/collaboration_ci_surfaces_spec.js` checks the four exact mount contracts, the API adapter boundaries, and the absence of production seed/mock fallbacks. The focused suite should be run with the repository's frontend Jest command; built-artifact parity evidence remains tracked by the design-reference inventory.

## Suggested articles

- [Project merge requests](../merge_requests/)
- [Pipelines](../../../ci/pipelines/)
- [Repository](../repository/)
