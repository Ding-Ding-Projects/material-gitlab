# frozen_string_literal: true

module MaterialSettingsSecretsHelper
  def material_settings_secrets_data(project)
    panel = project_permissions_panel_data(project)
    {
      available: panel[:isSecretsManagerAvailable] == true,
      allowed: panel[:canManageSecretsManager] == true,
      full_path: project.full_path,
      top_level_group_full_path: panel[:topLevelGroupFullPath].to_s,
      graphql_endpoint: "#{Gitlab.config.gitlab.relative_url_root}/api/graphql",
      # Project context does not expose a namespace enrollment mutation.
      enrollment_available: false,
      paid_experience: ::Feature.enabled?(:secrets_manager_paid_experience, project.root_ancestor),
      archived: project.self_or_ancestors_archived?,
      marked_for_deletion: project.scheduled_for_deletion_in_hierarchy_chain?
    }
  end
end
