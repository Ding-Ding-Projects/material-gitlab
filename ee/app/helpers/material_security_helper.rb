# frozen_string_literal: true

module MaterialSecurityHelper
  def material_security_endpoints(project)
    {
      vulnerabilities: api_graphql_path,
      projectPath: project.full_path,
      projectId: project.to_global_id.to_s,
      vulnerability: (api_graphql_path if can?(current_user, :admin_vulnerability, project)),
      createIssue: (api_graphql_path if can?(current_user, :create_issue, project) && can?(current_user, :admin_vulnerability_issue_link, project))
    }.compact
  end
end
