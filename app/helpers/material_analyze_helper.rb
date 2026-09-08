# frozen_string_literal: true

module MaterialAnalyzeHelper
  def material_analyze_endpoints(data_attributes)
    ref = params.dig(:cycle_analytics, :branch_name).presence || @project.default_branch
    repository_available = !@project.empty_repo? && can?(current_user, :read_repository_graphs, @project)
    pipelines_available = !@project.empty_repo? && @project.feature_available?(:builds, current_user) &&
      can?(current_user, :read_build, @project) && can?(current_user, :read_ci_cd_analytics, @project)
    insights_available = @project.respond_to?(:insights_available?) && @project.insights_available? &&
      can?(current_user, :read_insights, @project)

    {
      projectPath: @project.full_path,
      projectName: @project.name,
      ref: ref,
      graphql: api_graphql_path,
      valueStream: project_cycle_analytics_path(@project, format: :json),
      pipelineAggregates: pipelines_available && Gitlab::ClickHouse.enabled_for_analytics?(@project.group),
      insightsConfig: (namespace_project_insights_path(@project.namespace, @project, format: :json) if insights_available),
      insightsQuery: (query_namespace_project_insights_path(@project.namespace, @project, format: :json) if insights_available),
      startDate: data_attributes[:created_after] || (Time.current.utc.to_date - 29).iso8601,
      endDate: data_attributes[:created_before] || Time.current.utc.to_date.iso8601,
      initialError: (@request_params.errors.full_messages.join('. ') unless @request_params.valid?),
      permissions: {
        'value-stream': can?(current_user, :read_cycle_analytics, @project),
        'ci-cd': pipelines_available,
        repository: repository_available,
        contributors: repository_available,
        insights: insights_available
      },
      routes: {
        'ci-cd': (charts_project_pipelines_path(@project) if pipelines_available),
        repository: (charts_project_graph_path(@project, ref) if repository_available),
        contributors: (project_graph_path(@project, ref) if repository_available),
        insights: (project_insights_path(@project) if insights_available)
      }.compact,
      valueStreamEdit: (data_attributes[:edit_value_stream_path]&.gsub(':id', params[:value_stream_id].to_s) if
        data_attributes[:can_edit].to_s == 'true' && params[:value_stream_id].to_s.match?(/\A\d+\z/)),
      valueStreamNew: (data_attributes[:new_value_stream_path] if data_attributes[:can_edit].to_s == 'true')
    }.compact
  end
end
