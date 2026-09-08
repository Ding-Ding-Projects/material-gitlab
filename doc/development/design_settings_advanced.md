---
stage: none
group: unassigned
info: For assistance with this topic, see <https://handbook.gitlab.com/handbook/product/ux/technical-writing/#assignments-to-other-projects-and-subjects>.
title: Advanced settings design adapter
---

The project settings design adapter renders Advanced controls from server-provided metadata. The scope includes housekeeping, pruning unreachable objects, export, project path changes, transfer, archiving, unarchiving, fork relationship removal, restoration from scheduled deletion, and deletion.

## Server metadata

`MaterialSettingsAdvancedHelper#material_settings_advanced_data` provides action paths and capability flags. The page metadata helper includes it as escaped JSON in the single Settings mount. It does not render legacy controls inside the design surface.

The helper uses the same permission checks as the controller routes:

- Housekeeping and pruning require `admin_project`.
- Export and project path changes require `admin_project`.
- Transfer requires `change_namespace`.
- Fork relationship removal requires `remove_fork_project` and an existing fork relationship.
- Restoration requires `admin_project` and a project scheduled for deletion.
- Deletion requires `remove_project` and preserves the delayed, immediate, and hierarchy-blocked states from the existing project deletion flow.
- Archive and unarchive require `archive_project`.
- Archive remains unavailable when the project is already archived or scheduled for deletion.
- Unarchive remains unavailable when the project is active or an ancestor is archived.

The controller performs authorization and step-up authentication again for every submission.

## Form behavior

`AdvancedSettings.vue` renders native `POST` forms with the current CSRF value in `authenticity_token`. It uses Rails-generated local paths and refuses a malformed, cross-origin, or backslash-containing action in the browser before rendering a form.

Housekeeping posts to the existing housekeeping endpoint. Pruning posts to the same endpoint with `prune=true`, requires an acknowledgement checkbox, and requires a confirmation dialog before the native form submits. Archiving requires a confirmation dialog. Unarchiving posts through its existing endpoint.

Project path changes use the existing project update route with the standard method override and `project[path]` parameter. The export controls preserve the current export state: a finished export offers download and regeneration, while other states offer export generation.

Transfer, fork relationship removal, and deletion require an exact typed confirmation. The transfer picker calls the existing allowed-destination API service and the existing current-user namespace query. It keeps user and group destinations separate in the request data, paginates group results, filters the loaded results with the surface search and regex builder, and submits only the selected namespace's existing `new_namespace_id` parameter. The server remains responsible for validating that the destination namespace is available to the current user. Every confirmation is revalidated immediately before the native form submits, so permission, local-action validity, acknowledgement, and confirmation text cannot become stale while a dialog is open.

## Host contract

The page helper includes `material_settings_advanced_data(project)` as `advancedMetadata`. The design-owned Advanced tab passes it to `AdvancedSettings`, preserves native form submissions, and keeps the non-secret draft state while navigating tabs.

No legacy Advanced panel initializer is required. The component owns its confirmation dialogs and all forms use the existing controller endpoints. Do not initialize `initPruneObjectsButton`, `initArchiveSettings`, `initUnarchiveSettings`, `initTransferProjectForm`, `initConfirmDanger`, or `initProjectDeleteButton` inside this design host because that would render duplicate controls.
