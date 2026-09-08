# Secrets Manager Settings design contract

The design-owned `SecretsManagerSettingsCard.vue` uses the original project lifecycle, health, entitlement, member-search, and principal permission GraphQL contracts. The deployed GraphQL lifecycle values are uppercase `ACTIVE`, `PROVISIONING`, and `DEPROVISIONING`. An explicit null manager means not initialized and maps to the UI state `INACTIVE`; an absent field or malformed payload is an error.

The card reads only lifecycle and permission metadata. It never queries secret values. Initialization requires a healthy service and current project authority, respects archived/deletion state and the existing paid-experience entitlement boundary, and cannot be repeated during a pending lifecycle operation. Transient lifecycle states are refreshed with a bounded polling sequence, after which the manual refresh control remains available.

Permission creation supports the original user, group, and role categories. Users must be selected from the authorized project-member search; roles are the existing Reporter/Developer/Maintainer set; group paths use the existing server-validated PrincipalInput contract. Scope selections are restricted to the existing `READ`, `READ_VALUE`, `WRITE`, and `DELETE` enums. Permission deletion and manager deprovisioning require confirmation. Missing mutation results or nonempty server error arrays are failures, never success acknowledgements.

Project context does not expose namespace enrollment controls in the original host, so none are invented here. Group-level enrollment remains on its existing group surface. The helper derives current availability and authority from the original permissions helper.

`settings_secrets_manager_spec.js` verifies the response and mutation boundaries. Production interaction and visual verification remain the responsibility of the candidate verification run.
