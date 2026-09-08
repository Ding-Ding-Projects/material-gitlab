# Material group Epics route

The group Epics list route is hosted by `Groups::EpicsController#index` and mounts the material Epics surface at `#js-material-epics`. The route supplies the current group full path, authenticated current-user display identity, GraphQL endpoint, and native new/detail route paths as server-rendered data.

The list reads only from the authenticated same-origin GraphQL group connection. The client does not use fixture data and stops if the group identity, transport, response, or pagination cursor is invalid. Epic rows retain both the GraphQL global identity and the route IID, so native detail paths continue to address the resource correctly.

Creation uses the existing native `new_group_epic_path` route only when the server's exact `create_epic` ability is true. Detail links use the API-provided `webUrl`, preserving the existing work-item redirect behavior for advanced types. The production Roadmap control links to the native `group_roadmap_path` instead of rendering the surface's fixed design-time 2026 timeline. The material list does not claim a generic group-level write permission: list responses do not contain exact authorization for every selected Epic, so bulk update and delete controls are absent and their adapter calls reject unless the server supplies an explicit `true` per-operation permission. This preserves authorization boundaries and CSRF protection rather than inventing a successful write path.

The rendered mount carries `data-material-topbar-owner="surface.epics"`, which lets the shared top-bar bootstrap select exactly one owner on the real production route.

The Vue root preserves that marker after mounting. Its configuration is bound to instance callbacks rather than a mutable global project configuration. Parent-child relationships come from returned global parent IDs; duplicate IDs or cyclic relationships are rejected. Row dates display the actual returned ISO dates, and missing progress data is unavailable rather than zero. The reference's hard-coded subscription badge is not used as a claim about the running license.

The full mounted-component regression exposed missing translation-method bindings in the original surface templates. The route components now expose their imported translation helpers explicitly. The same regression proves rendered record text, actual dates, native creation/detail/roadmap links, top-bar ownership, and absence of the fixed timeline in the production route. These are local component checks, not screenshots or evidence of the deployed Rails route.
