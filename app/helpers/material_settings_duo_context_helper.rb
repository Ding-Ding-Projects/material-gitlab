# frozen_string_literal: true

# Design-owned metadata for the project Duo settings. The original helper remains
# the authority for visibility, locks, readiness state, and dedicated destinations.
module MaterialSettingsDuoContextHelper
  def material_settings_duo_context_data(project)
    return {} unless project.licensed_ai_features_available?

    source = gitlab_duo_settings_data(project)
    visible = Array(source[:visibleSettings])
    all_settings = visible.include?('all')
    exclusion = source[:duoContextExclusionSettings] || {}

    {
      allowed: can?(current_user, :update_duo_setting, project) && all_settings,
      action: project_path(project),
      visible_settings: visible,
      exclusion_rules: Array(exclusion[:exclusion_rules] || exclusion['exclusion_rules'] || exclusion[:exclusionRules] || exclusion['exclusionRules']),
      governance_path: source[:governancePath],
      duo_readiness_available: all_settings && source[:duoReadinessAvailable] == true && source[:amazonQAvailable] != true && source.fetch(:duoReadiness, {}).key?(:platformEnabled),
      duo_readiness: source[:duoReadiness] || {},
      duo_features_enabled: source[:duoFeaturesEnabled] == true,
      duo_features_locked: source[:duoFeaturesLocked] == true,
      remote_flows_enabled: source[:initialDuoRemoteFlowsAvailability] == true,
      foundational_flows_enabled: source[:initialDuoFoundationalFlowsAvailability] == true,
      project_full_path: source[:projectFullPath].to_s,
      graphql_endpoint: "#{Gitlab.config.gitlab.relative_url_root}/api/graphql",
      local_setup: [
        { label: _('IDE extensions'), path: help_page_path('editor_extensions/_index.md') },
        { label: _('GitLab CLI'), path: help_page_path('editor_extensions/gitlab_cli/_index.md') },
        { label: _('GitLab Duo CLI'), path: help_page_path('user/gitlab_duo_cli/set_up.md') }
      ]
    }
  end
end
