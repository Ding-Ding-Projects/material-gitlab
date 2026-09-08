# frozen_string_literal: true

module MaterialSettingsServiceDeskHelper
  # This mount contract deliberately exposes state, permissions, and local routes only.
  # SMTP credentials remain write-only and are never included in the initial document.
  def material_settings_service_desk_data(project)
    return { supported: false, allowed: false } unless ::ServiceDesk.supported?

    setting = project.service_desk_setting
    emails = ::ServiceDesk::Emails.new(project)
    can_manage = can?(current_user, :admin_project, project)

    {
      allowed: can_manage,
      supported: true,
      endpoint: project_service_desk_path(project),
      customEmailEndpoint: project_service_desk_custom_email_path(project),
      issueTrackerEnabled: project.project_feature.issues_enabled?,
      publicProject: project.public?,
      serviceDeskEmailEnabled: Gitlab::Email::ServiceDeskEmail.enabled?,
      enabled: ::ServiceDesk.enabled?(project),
      incomingEmail: (::ServiceDesk.enabled?(project) ? emails.incoming_address : nil),
      serviceDeskEmail: (::ServiceDesk.enabled?(project) ? emails.alias_address : nil),
      issueTemplateKey: setting&.issue_template_key,
      fileTemplateProjectId: setting&.file_template_project_id,
      outgoingName: setting&.outgoing_name,
      projectKey: setting&.project_key,
      ticketsConfidentialByDefault: setting.nil? ? true : setting.tickets_confidential_by_default,
      reopenIssueOnExternalParticipantNote: setting&.reopen_issue_on_external_participant_note || false,
      addExternalParticipantsFromCc: setting&.add_external_participants_from_cc || false,
      templates: JSON.parse(available_service_desk_templates_for(project))
    }
  end
end
