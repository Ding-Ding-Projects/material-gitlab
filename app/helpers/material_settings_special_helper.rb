# frozen_string_literal: true

# Metadata for specialized project settings that have their own server contracts.
# The design surface receives capability facts and local endpoints only. Secret
# values, SMTP credentials, and any enrollment credentials are intentionally absent.
module MaterialSettingsSpecialHelper
  def material_settings_special_data(project)
    panel = project_permissions_panel_data(project)
    current = panel.fetch(:currentSettings)
    root_group = project.root_ancestor if project.root_ancestor.is_a?(Group)

    {
      ci_catalog: {
        available: panel[:canAddCatalogResource] == true,
        full_path: project.full_path
      },
      secrets_manager: {
        available: panel[:isSecretsManagerAvailable] == true,
        allowed: panel[:canManageSecretsManager] == true,
        full_path: project.full_path,
        top_level_group_full_path: panel[:topLevelGroupFullPath].to_s,
        # The project panel has no enrollment mutation. Enrollment is administered
        # at the root namespace, so the design UI exposes only its factual state.
        enrollment_available: false
      },
      graphql_endpoint: "#{Gitlab.config.gitlab.relative_url_root}/api/graphql",
      bot_access: material_settings_bot_access_data(project, panel, current, root_group)
    }
  end

  private

  def material_settings_bot_access_data(project, panel, current, root_group)
    available = panel[:botAccessSettingsAvailable] == true
    {
      available: available,
      allowed: available && can?(current_user, :admin_project, project),
      action: available ? project_path(project) : nil,
      enabled: available && current[:pipelineExecutionPolicyBotAccessEnabled],
      file_patterns: available ? current[:pipelineExecutionPolicyBotAccessFilePatterns] : [],
      group_id: available ? panel[:botAccessGroupId] : nil,
      root_group_id: available ? panel[:botAccessRootGroupId] : nil,
      group_search_endpoint: available && root_group ? "#{api_v4_groups_path(id: root_group.id)}/descendant_groups" : nil,
      policy_access_available: panel[:policySettingsAvailable] == true,
      policy_access_enabled: current[:sppRepositoryPipelineAccess] == true,
      policy_access_locked: panel[:sppRepositoryPipelineAccessLocked] == true
    }
  end
end
