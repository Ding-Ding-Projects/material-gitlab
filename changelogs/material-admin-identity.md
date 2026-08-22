# Material administration and identity surfaces

- Added authenticated Material administration data and action wiring for users,
  projects, and instance health.
- Added a project-owned Manage route backed by real activity and label records.
- Added a bounded authenticated Agent Memory endpoint with explicit empty states
  and no secret-bearing payloads.
- Replaced the sign-in page chrome with the checked-in Material Login contract while
  preserving Devise, OmniAuth, LDAP, WebAuthn/passkey, registration, terms, and errors.
