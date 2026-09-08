# Duo context Settings design contract

The design-owned Duo context card receives `material_settings_duo_context_data(project)`, which copies the original `gitlab_duo_settings_data(project)` visibility allowlist, readiness object, lock state, governance destination, and context-exclusion rules. It does not render the original Duo components.

Context exclusions submit through the exact nested existing project field: `project[project_setting_attributes][duo_context_exclusion_settings][exclusion_rules][]`. When the list is empty, the card submits the corresponding non-array field with `null`, preserving the original deep-munge behavior. Governance and local setup use the existing dedicated routes. Readiness displays only server-provided facts and links to the original group, instance, and runner setup destinations.
