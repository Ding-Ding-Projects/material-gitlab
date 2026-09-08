# frozen_string_literal: true

# Metadata for the design-owned Advanced settings controls. This intentionally
# contains no rendered controls: Rails remains the source of action paths and
# authorization, while the Settings surface owns the visible form anatomy.
module MaterialSettingsAdvancedHelper
  def material_settings_advanced_data(project)
    return {} unless project

    can_admin_project = can?(current_user, :admin_project, project)
    can_archive_project = archiving_available?(project)

    data = {
      housekeeping: can_admin_project ? {
        action: housekeeping_project_path(project),
        allowed: true
      } : { allowed: false },
      archive: can_archive_project ? {
        action: archive_project_path(project),
        allowed: !project.self_or_ancestors_archived?,
        marked_for_deletion: project.scheduled_for_deletion_in_hierarchy_chain?
      } : { allowed: false },
      unarchive: can_archive_project ? {
        action: unarchive_project_path(project),
        allowed: project.self_or_ancestors_archived? && !project.ancestors_archived?
      } : { allowed: false }
    }

    data[:export] = material_settings_export_data(project) if can_admin_project && Gitlab::CurrentSettings.project_export_enabled?
    data[:path_change] = material_settings_path_change_data(project) if can_admin_project
    data[:transfer] = material_settings_transfer_data(project) if can?(current_user, :change_namespace, project)
    data[:remove_fork] = material_settings_remove_fork_data(project) if project.forked? && can?(current_user, :remove_fork_project, project)
    data[:restore] = material_settings_restore_data(project) if project.self_deletion_scheduled? && can_admin_project
    data[:delete] = material_settings_delete_data(project) if can?(current_user, :remove_project, project)
    data
  end

  private

  def material_settings_export_data(project)
    status = project.export_status(current_user)
    finished = status == :finished

    {
      allowed: true,
      status: status.to_s,
      export_action: export_project_path(project),
      download_action: finished ? download_export_project_path(project) : nil,
      generate_action: finished ? generate_new_export_project_path(project) : nil
    }
  end

  def material_settings_path_change_data(project)
    {
      allowed: true,
      action: project_path(project),
      prefix: Gitlab::Utils.append_path(root_url, project.namespace.full_path),
      current_path: project.path
    }
  end

  def material_settings_transfer_data(project)
    {
      allowed: true,
      action: transfer_project_path(project),
      project_id: project.id,
      confirm_phrase: project.full_path,
      show_user_transfer_locations: current_user.can?(:transfer_projects, current_user.namespace)
    }
  end

  def material_settings_remove_fork_data(project)
    {
      allowed: true,
      action: remove_fork_project_path(project),
      confirm_phrase: project.path
    }
  end

  def material_settings_restore_data(project)
    {
      allowed: true,
      action: restore_namespace_path(project)
    }
  end

  def material_settings_delete_data(project)
    if project.self_deletion_scheduled?
      project_delete_immediately_button_data(project).merge(allowed: true, mode: 'immediate')
    elsif project.scheduled_for_deletion_in_hierarchy_chain?
      { allowed: false, mode: 'blocked' }
    else
      project_delete_delayed_button_data(project).merge(allowed: true, mode: 'delayed')
    end
  end
end
