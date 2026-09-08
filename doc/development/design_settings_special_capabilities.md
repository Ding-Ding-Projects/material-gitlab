# Specialized project Settings controls

`SpecialCapabilitiesSettings.vue` supplies design-owned CI/CD Catalog and pipeline execution policy controls. The canonical Secrets Manager card is `SecretsManagerSettingsCard.vue`, described separately in [its contract](design_settings_secrets_manager.md). The page metadata helper selects that card once and does not render the earlier generic lifecycle section alongside it.

Capability metadata is derived from the existing `project_permissions_panel_data` fields. Catalog operations use the existing GraphQL create/remove contracts and confirm removal. Policy access uses the original native project update form, nested project-setting field names, CSRF value, inherited lock state, and allowed-group metadata search. It does not claim that echoing a submitted setting proves persistence.

The server remains authoritative for licensing, permissions, inheritance, and validation. HTTP or GraphQL failures remain visible, and malformed mutation acknowledgements are rejected. Native form responses return to the Additional Advanced section without introducing an alternate legacy route.

The focused adapter and component coverage is `settings_special_capabilities_spec.js`. Built Rails interaction and visual-reference comparison remain separate evidence requirements.
