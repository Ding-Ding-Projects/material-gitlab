# frozen_string_literal: true

module MaterialCodeHelper
  def material_code_data(initial_tab, ref: nil, path: nil)
    {
      project_path: @project.full_path,
      project_url: project_path(@project),
      initial_tab: initial_tab,
      initial_ref: ref,
      initial_path: path,
      permissions: {
        Branches: can?(current_user, :push_code, @project),
        Tags: can?(current_user, :admin_tag, @project),
        Snippets: can?(current_user, :admin_snippet, @project),
        readSnippets: can?(current_user, :read_snippet, @project)
      }.to_json,
      routes: {
        Branches: (new_project_branch_path(@project) if can?(current_user, :push_code, @project)),
        Tags: (new_project_tag_path(@project) if can?(current_user, :admin_tag, @project)),
        Snippets: (new_project_snippet_path(@project) if can?(current_user, :create_snippet, @project)),
        branchRules: (project_settings_repository_path(@project, anchor: 'branch-rules') if can?(current_user, :admin_project, @project))
      }.compact.to_json
    }.compact
  end
end
