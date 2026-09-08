# frozen_string_literal: true

module Projects::AlertManagementHelper
  include ::API::Helpers::RelatedResourcesHelpers
  def material_monitor_endpoints(project)
    base = expose_path(api_v4_projects_path(id: project.id))
    {
      projectPath: project.full_path,
      projectUrl: project_path(project),
      alerts: api_graphql_path,
      incidents: ("#{base}/issues?issue_type=incident&scope=all&per_page=100" if can?(current_user, :read_issue, project)),
      tickets: ("#{base}/issues?issue_type=ticket&scope=all&per_page=100" if project.service_desk_enabled? && can?(current_user, :read_issue, project)),
      errors: (project_error_tracking_index_path(project, format: :json) if can?(current_user, :read_sentry_issue, project) && !Feature.enabled?(:hide_error_tracking_features, project)),
      errorsPath: project_error_tracking_index_path(project),
      oncall: (api_graphql_path if can?(current_user, :read_incident_management_oncall_schedule, project)),
      oncallPath: (project_incident_management_oncall_schedules_path(project) if can?(current_user, :read_incident_management_oncall_schedule, project)),
      updateAlert: (api_graphql_path if can?(current_user, :update_alert_management_alert, project)),
      updateIssue: ("#{base}/issues/:id" if can?(current_user, :update_issue, project)),
      settingsPath: (project_settings_operations_path(project, anchor: 'js-alert-management-settings') if can?(current_user, :admin_operations, project)),
      newIncident: (new_project_issue_path(project, issue: { issue_type: 'incident' }) if can?(current_user, :create_issue, project))
    }.compact
  end

  def alert_management_data(current_user, project)
    {
      'project-path' => project.full_path,
      'enable-alert-management-path' => project_settings_operations_path(
        project,
        anchor: 'js-alert-management-settings'
      ),
      'alerts-help-url' => help_page_url('operations/incident_management/alerts.md'),
      'populating-alerts-help-url' => help_page_url(
        'operations/incident_management/integrations.md',
        anchor: 'configuration'
      ),
      'empty-alert-svg-path' => image_path('illustrations/empty-state/empty-scan-alert-md.svg'),
      'user-can-enable-alert-management' => can?(current_user, :admin_operations, project).to_s,
      'alert-management-enabled' => alert_management_enabled?(project).to_s,
      'text-query': params[:search],
      'assignee-username-query': params[:assignee_username]
    }
  end

  def alert_management_detail_data(current_user, project, alert_id)
    {
      'alert-id' => alert_id,
      'project-path' => project.full_path,
      'project-id' => project.id,
      'project-issues-path' => project_issues_path(project),
      'project-alert-management-details-path' => details_project_alert_management_path(project, alert_id),
      'page' => 'OPERATIONS',
      'can-update' => can?(current_user, :update_alert_management_alert, project).to_s
    }
  end

  private

  def alert_management_enabled?(project)
    !!(
      project.alert_management_alerts.any? ||
      AlertManagement::HttpIntegrationsFinder.new(project, active: true).execute.any?
    )
  end
end
