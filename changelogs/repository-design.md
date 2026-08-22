# Repository design contract

The Material Repository surface now consumes a required, host-registered
GraphQL or Rails adapter. It does not ship sample project data. Tree pages are
loaded by branch and path, blob content is fetched on demand, and branch,
star, fork, download, and delete actions are delegated to the server adapter.

An adapter response is normalized and validated before rendering. Missing
adapter methods, missing project metadata, an empty branch list, invalid tree
entries, invalid blobs, and invalid commit SHAs fail closed with a visible
unavailable state. `mountRepositorySurface` also rejects a mount without a
validated adapter.
