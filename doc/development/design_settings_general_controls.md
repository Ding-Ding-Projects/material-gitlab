# Design-owned general project controls

This staged Settings unit implements description and topics, badge management, avatar removal, and visibility confirmation using design-owned components. It does not activate the project settings route or embed the original settings panels.

Description and topics are selected from project GraphQL metadata. Saving sends the existing Rails `project[description]` and comma-separated `project[topics]` fields through the already-authorized JSON update action, then reloads authoritative metadata. Empty descriptions and topic lists are valid; unsuccessful updates retain the editable draft.

Badge listing, creation, editing, and deletion use the existing project badge REST resource. Inherited group badges are clearly identified and cannot be edited through these project controls. Badge image loading requires an explicit Preview action. Submitted and preview URLs are restricted to HTTP or HTTPS without embedded credentials. Failed saves retain the user's draft, and deletion requires the design confirmation dialog.

Avatar removal uses a native form with the existing Rails delete method override and CSRF value. Its action URL and capability come from `material_settings_general_data`. The component validates the local action path and rechecks authorization metadata immediately before confirmed submission. No fetch-based redirect handling or guessed removal state is involved.

Visibility changes require the dedicated visibility capability, a level present in the server's allowed-visibility list, and exact project-path confirmation in the design dialog. The server remains authoritative for namespace and instance restrictions. This intentionally provides confirmation for every visibility change, including the existing reduction case, and does not silently bypass the original confirmation boundary.

The reusable metadata helper contains only safe project identity, routes, display identity, capability flags, and allowed visibility values. It does not render or copy legacy controls, retrieve stored CI values, or include a runner registration credential.

Focused coverage lives in `settings_general_controls_spec.js`, `settings_project_adapter_spec.js`, and `project_surfaces_interaction_spec.js`. The production route remains unchanged until the remaining permissions, enterprise settings, Service Desk, and Advanced capability inventory is implemented and independently verified.
