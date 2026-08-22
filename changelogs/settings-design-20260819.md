# Settings design adapter

- Removed fabricated project, member, CI/CD variable, protected branch, integration, and secret-like values from the production Settings surface.
- Added an explicit host adapter contract for real Rails, GraphQL, and store-backed reads and mutations, with fail-closed loading and server-error presentation.
- Kept masked CI/CD values masked unless a validated adapter response explicitly authorizes a reveal.
- Added focused adapter normalization and production-fixture guard coverage.
