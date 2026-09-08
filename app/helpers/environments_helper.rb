# frozen_string_literal: true

module EnvironmentsHelper
  include ActionView::Helpers::AssetUrlHelper

  def material_operate_endpoints
    {
      environments: project_environments_path(@project, format: :json, scope: 'active', per_page: 100),
      stoppedEnvironments: project_environments_path(@project, format: :json, scope: 'stopped', per_page: 100),
      graphql: api_graphql_path,
      projectPath: @project.full_path,
      kubernetes: can?(current_user, :read_cluster, @project),
      terraform: can?(current_user, :read_terraform_state, @project),
      terraformAdmin: can?(current_user, :admin_terraform_state, @project),
      newEnvironment: (new_project_environment_path(@project) if can?(current_user, :create_environment, @project)),
      clustersPath: project_clusters_path(@project),
      terraformPath: project_terraform_index_path(@project)
    }.compact
  end

  def environments_folder_list_view_data(project, folder)
    {
      "endpoint" => folder_project_environments_path(project, folder, format: :json),
      "folder_name" => folder,
      "project_path" => project.full_path,
      "help_page_path" => help_page_path("ci/environments/_index.md"),
      "can_read_environment" => can?(current_user, :read_environment, @project).to_s
    }
  end

  def can_destroy_environment?(environment)
    can?(current_user, :destroy_environment, environment)
  end
end

EnvironmentsHelper.prepend_mod_with('EnvironmentsHelper')
