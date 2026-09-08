# Material Code and Repository routes

The Material Code surface has a same-origin REST data layer for branches, commits, tags, snippets, and comparisons. Its production route host remains pending until destructive branch, tag, and snippet operations await real REST mutations rather than changing local state alone.

The Material Repository surface mounts on project tree and blob routes. Rails supplies `project_path`, `ref`, and `path` as separate data attributes. This preserves refs that contain slashes and avoids reconstructing repository state from a browser URL.

`createProjectRepositoryAdapter` uses the existing same-origin REST endpoints for project metadata, branches, repository tree entries, commits, tags, and file blobs. Blob text is decoded from the API response only after the API succeeds. HTTP errors remain errors and are presented by the surface rather than replaced with placeholder files or trees.

Repository archive downloads navigate to the API archive endpoint. Star and fork actions use their existing API operations. File deletion remains on the dedicated repository route because the REST adapter does not fabricate a bulk deletion result.

Focused coverage is in `spec/frontend/material_system/code_repository_routes_spec.js` and `spec/frontend/material_system/repository_production_adapter_spec.js`.
