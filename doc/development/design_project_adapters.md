# Project Settings route integration

The project Settings source route now mounts the design-owned `Settings` surface through `pages/projects/edit/index.js`. The view supplies `material_settings_page_data(@project)` as escaped JSON data. Existing controllers remain authoritative for authorization, CSRF, step-up authentication, inheritance, and validation. No original live panels are copied into the new chrome, and no alternate legacy route is introduced.

The General, Members, CI/CD, and Integrations design tabs remain. One additional Advanced section contains the existing feature permissions, enterprise settings, Service Desk, and lifecycle operations. This additional section is an intentional design-reference deviation pending visual review, not a claim of exact reference parity. A restricted user receives only the permitted Advanced controls and does not load administrator project data.

## Hand-written capability inventory

| Existing capability | Design-owned implementation | Server contract and availability | Focused evidence |
| --- | --- | --- | --- |
| Project ID and name | `ProjectDetailsCard.vue` | Explicit server ID; existing project update action | `settings_general_controls_spec.js`, `settings_complete_mount_spec.js` |
| Description and topics | `DescriptionTopicsCard.vue` | Selected GraphQL metadata; `project[description]`, scalar `project[topics]` | `settings_general_controls_spec.js` |
| Avatar upload and removal | `ProjectLogoCard.vue` | Multipart project update; confirmed native avatar DELETE | `settings_general_controls_spec.js` |
| Visibility and source/namespace restrictions | `ProjectDetailsCard.vue`, `ConfirmDialog.vue` | Dedicated ability, allowed levels, exact project-path confirmation | `settings_general_controls_spec.js` |
| Feature access levels, packages, registry, Pages, email, uploads, reactions, character warnings, CVE options | `ProjectPermissionsCard.vue` | `material_settings_permissions_data`; original nested project feature/setting fields and instance availability | `settings_permissions_spec.js` |
| Project and inherited badges | `BadgesCard.vue` | Existing badge REST resource; inherited entries remain read-only | `settings_general_controls_spec.js` |
| Duo settings and inherited locks | `AdditionalProjectSettings.vue` | Exact visible-settings allowlist, feature/license checks, native root/nested fields | `settings_additional_spec.js` |
| Dependency remediation prerequisite | `DuoRemediationDialog.vue`, `duo_remediation_adapter.js` | Existing scan-profile query/attachment; no setting enablement before confirmed attachment | `settings_additional_spec.js`, `settings_duo_remediation_spec.js` |
| Duo exclusions, governance, readiness, local setup | `DuoContextSettings.vue` | Original nested exclusion fields, explicit empty-list field, native governance/setup links, runner metadata recheck | `settings_duo_context_spec.js`, `settings_duo_remediation_spec.js` |
| Default work item description | `AdditionalProjectSettings.vue` | Existing `project[issues_template]` under original feature availability | `settings_additional_spec.js` |
| External classification and repository size | `AdditionalProjectSettings.vue` | Existing fields, instance feature and administrator restrictions | `settings_additional_spec.js` |
| Service Desk and custom email | `ServiceDeskSettings.vue` | Existing settings and custom-email endpoints, confirmed credential reset, write-only SMTP input | `settings_service_desk_spec.js` |
| CI/CD Catalog and policy bot access | `SpecialCapabilitiesSettings.vue` | Existing catalog GraphQL operations; native project policy fields and group metadata search | `settings_special_capabilities_spec.js` |
| Secrets Manager lifecycle and principal permissions | `SecretsManagerSettingsCard.vue` | Existing lifecycle, health, entitlement, member-search and user/group/role permission contracts; metadata only | `settings_secrets_manager_spec.js` |
| Housekeeping and pruning | `AdvancedSettings.vue` | Original housekeeping POST and `prune=true`; acknowledgement and confirmation | `settings_advanced_spec.js` |
| Export and regeneration/download | `AdvancedSettings.vue` | Original export status and action paths; exclusions remain disclosed | `settings_advanced_spec.js` |
| Archive and unarchive | `AdvancedSettings.vue` | Original availability, ancestor, and scheduled-deletion restrictions | `settings_advanced_spec.js` |
| Project path and transfer | `AdvancedSettings.vue` | Original path field, managed-destination search, selected namespace ID and typed confirmation | `settings_advanced_spec.js` |
| Fork unlink, restore, delayed/immediate deletion | `AdvancedSettings.vue` | Original methods, confirmation phrases, counts, and hierarchy-blocked state | `settings_advanced_spec.js` |
| Direct members and protected branches | Existing Members/CI/CD design cards | Existing REST services and exact permission flags | `settings_project_adapter_spec.js` |
| Variable metadata and creation/deletion | `CicdTab.vue` | Metadata-only GraphQL; exact scoped mutations. Generic reveal remains disabled in favor of the dedicated editor | `settings_project_adapter_spec.js` |
| Integration configuration | `IntegrationsTab.vue` | Active basic metadata and existing dedicated editor link, avoiding configuration-resetting generic toggles | `settings_project_adapter_spec.js` |

The route inventory in `route_contract.js` requires every metadata family explicitly, including unavailable capabilities. Its negative regressions remove each host boundary individually, verify rejection, restore it, and verify acceptance. `settings_complete_mount_spec.js` exercises the composed surface and restricted-access route. Native Advanced project-update forms return to the Advanced tab through a bounded local redirect anchor.

## Verification boundary

The implementation has local adapter and mounted-component evidence. Actual Rails helper execution, production route interaction, and screenshot parity must be verified against the built candidate independently. Unit-test records are never demo data in the production surface and never screenshot evidence. The new Advanced section and local-only appearance differences still require visual review before exact design parity can be claimed.
