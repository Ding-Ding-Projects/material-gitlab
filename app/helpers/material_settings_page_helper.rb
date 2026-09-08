# frozen_string_literal: true

module MaterialSettingsPageHelper
  def material_settings_page_data(project)
    can_admin = can?(current_user, :admin_project, project)
    material_settings_general_data(project).merge(
      generalAllowed: can_admin,
      initialTab: params[:material_settings_section] == 'advanced' ? 'advanced' : 'general',
      permissionsMetadata: can_admin ? material_settings_permissions_data(project) : {},
      additionalMetadata: material_settings_additional_data(project),
      advancedMetadata: material_settings_advanced_data(project),
      serviceDeskMetadata: can_admin ? material_settings_service_desk_data(project) : { supported: false },
      specialMetadata: can_admin ? material_settings_special_data(project).merge(secrets_manager: { available: false }) : {},
      secretsMetadata: can_admin ? material_settings_secrets_data(project) : { available: false },
      duoContextMetadata: material_settings_duo_context_data(project)
    )
  end
end
