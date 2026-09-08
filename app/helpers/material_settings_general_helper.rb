# frozen_string_literal: true

module MaterialSettingsGeneralHelper
  def material_settings_general_data(project)
    can_admin = can?(current_user, :admin_project, project)

    {
      projectId: project.id,
      fullPath: project.full_path,
      projectEndpoint: project_path(project, format: :json),
      apiBase: "#{Gitlab.config.gitlab.relative_url_root}/api/v4",
      graphqlEndpoint: "#{Gitlab.config.gitlab.relative_url_root}/api/graphql",
      allowedVisibilityLevels: project_allowed_visibility_levels(project),
      visibilityConfirmationPhrase: project.full_path,
      avatarRemoval: { allowed: can_admin, action: project_avatar_path(project) },
      permissions: {
        project: can_admin,
        visibility: can_admin && can_change_visibility_level?(project, current_user),
        badges: can_admin,
        members: can?(current_user, :admin_project_member, project),
        variables: can?(current_user, :admin_cicd_variables, project),
        branches: can?(current_user, :admin_protected_branch, project),
        integrations: can?(current_user, :admin_project_integrations, project)
      },
      integrationSettingsPath: project_settings_integrations_path(project),
      variablesEditorPath: project_settings_ci_cd_path(project),
      userName: current_user&.name.to_s,
      userInitials: current_user&.name.to_s.split.map { |part| part.first }.first(2).join
    }
  end
end
