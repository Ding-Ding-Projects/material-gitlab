# frozen_string_literal: true

# Safe metadata for design-owned project settings that are not part of the
# general or advanced cards. The receiving surface owns the rendered controls.
module MaterialSettingsAdditionalHelper
  def material_settings_additional_data(project)
    return {} unless project

    can_admin = can?(current_user, :admin_project, project)
    can_duo = can?(current_user, :update_duo_setting, project)
    can_security_workflow = can?(current_user, :update_sec_ai_workflow_settings, project)
    data = {}
    data[:duo] = material_settings_duo_data(project, can_duo, can_security_workflow) if project.licensed_ai_features_available? && (can_duo || can_security_workflow)
    data[:default_work_item_template] = material_settings_default_template_data(project) if can_admin && project.feature_available?(:issuable_default_templates) && project.project_feature.issues_access_level != 0
    data[:external_authorization] = material_settings_external_authorization_data(project) if can_admin && ::Gitlab::ExternalAuthorization.enabled?
    data[:repository_size_limit] = material_settings_repository_size_data(project) if current_user.can_admin_all_resources? && defined?(::License) && ::License.feature_available?(:repository_size_limit)
    data
  end

  private

  def material_settings_duo_data(project, can_duo, can_security_workflow)
    settings = project.project_setting
    source = gitlab_duo_settings_data(project)
    visible_settings = Array(source[:visibleSettings])

    {
      allowed: can_duo || can_security_workflow,
      action: project_path(project),
      inherited_values: {
        duo_features_enabled: source[:duoFeaturesEnabled] == true,
        duo_remote_flows_enabled: source[:initialDuoRemoteFlowsAvailability] == true
      },
      fields: material_settings_duo_fields(project, settings, source, visible_settings, can_duo)
    }
  end

  def material_settings_duo_fields(project, settings, source, visible_settings, can_duo)
    fields = []
    if can_duo
      fields << material_settings_duo_field(settings, :duo_features_enabled, :duo_availability_cascading_settings, 'GitLab Duo', source)
      if source[:amazonQAvailable]
        fields << { key: 'amazon_q_auto_review_enabled', name: 'project[amazon_q_auto_review_enabled]', label: 'Enable Auto Review', value: source[:amazonQAutoReviewEnabled] == true, locked: false }
        return fields.compact
      end
      fields << material_settings_duo_field(settings, :duo_remote_flows_enabled, :duo_remote_flows_cascading_settings, 'Allow flow execution', source)
      fields << material_settings_duo_field(settings, :duo_foundational_flows_enabled, :duo_foundational_flows_cascading_settings, 'Allow foundational flows', source)
      fields << material_settings_duo_field(settings, :tool_approval_for_session_enabled, :tool_approval_for_session_cascading_settings, 'Require tool approval for sessions', source)
      fields << material_settings_duo_field(settings, :dap_session_tracking_enabled, nil, 'Track Duo Agent Platform sessions in commits', source) if source[:dapSessionTrackingAvailable]
      fields << material_settings_duo_field(settings, :ai_audit_events_storage_enabled, :ai_audit_events_storage_cascading_settings, 'Store AI audit events', source) if ::Feature.enabled?(:agent_artifacts_page, project.root_ancestor) && can?(current_user, :update_storage_ai_audit_events, project)
      fields << material_settings_duo_dependency_bump_field(project, settings, source) if source[:ultimateFeaturesAvailable] && ::Feature.enabled?(:enable_dependency_bump_breaking_changes, project.root_ancestor)
    end

    fields << material_settings_duo_field(settings, :duo_sast_vr_workflow_enabled, nil, 'Turn on SAST vulnerability resolution workflow', source) if source[:ultimateFeaturesAvailable] && material_settings_duo_visible?(visible_settings, 'duoSastVrWorkflowEnabled')
    fields << material_settings_duo_field(settings, :duo_sast_fp_detection_enabled, nil, 'Turn on SAST false positive detection', source) if source[:ultimateFeaturesAvailable] && material_settings_duo_visible?(visible_settings, 'duoSastFalsePositiveDetectionEnabled')
    fields << material_settings_duo_field(settings, :duo_secret_detection_fp_enabled, nil, 'Turn on Secret Detection false positive detection', source) if source[:ultimateFeaturesAvailable] && material_settings_duo_visible?(visible_settings, 'duoSecretDetectionFpEnabled')
    fields.compact
  end

  def material_settings_duo_visible?(visible_settings, name)
    visible_settings.include?('all') || visible_settings.include?(name)
  end

  def material_settings_duo_field(settings, attribute, cascade_key, label, source)
    return unless settings&.respond_to?(attribute)

    cascade = cascade_key ? source[cascade_key] || {} : {}
    locked = settings.respond_to?("#{attribute}_locked?") && settings.public_send("#{attribute}_locked?")
    locked ||= source[:duoFeaturesLocked] if attribute == :dap_session_tracking_enabled
    source_key = {
      duo_features_enabled: :duoFeaturesEnabled,
      duo_remote_flows_enabled: :initialDuoRemoteFlowsAvailability,
      duo_foundational_flows_enabled: :initialDuoFoundationalFlowsAvailability,
      tool_approval_for_session_enabled: :initialToolApprovalForSessionEnabled,
      dap_session_tracking_enabled: :initialDapSessionTrackingEnabled,
      ai_audit_events_storage_enabled: :aiAuditEventsStorageEnabled,
      duo_sast_vr_workflow_enabled: :initialDuoSastVrWorkflowEnabled,
      duo_sast_fp_detection_enabled: :initialDuoSastFalsePositiveDetectionEnabled,
      duo_secret_detection_fp_enabled: :initialDuoSecretDetectionFpEnabled
    }[attribute]
    value = source.key?(source_key) ? source[source_key] : settings.public_send(attribute)
    { key: attribute.to_s, name: "project[project_setting_attributes][#{attribute}]", label: label, value: !!value, locked: !!locked || cascade[:locked_by_ancestor] || cascade[:locked_by_application_setting] }
  end

  def material_settings_duo_dependency_bump_field(project, settings, source)
    return unless settings&.respond_to?(:duo_dependency_bump_breaking_changes_enabled)

    {
      key: 'duo_dependency_bump_breaking_changes_enabled',
      name: 'project[project_setting_attributes][duo_dependency_bump_breaking_changes_enabled]',
      label: 'Turn on Agentic Breaking Change Resolution',
      value: !!settings.duo_dependency_bump_breaking_changes_enabled,
      locked: false,
      requires_remediation_profile: true,
      project_full_path: source[:projectFullPath],
      project_global_id: source[:projectGlobalId]
    }
  end

  def material_settings_default_template_data(project)
    { allowed: true, action: project_path(project), value: project.issues_template.to_s }
  end

  def material_settings_external_authorization_data(project)
    {
      allowed: true,
      action: project_path(project),
      value: project.external_authorization_classification_label.to_s,
      default_label: ::Gitlab::CurrentSettings.current_application_settings.external_authorization_service_default_label.to_s
    }
  end

  def material_settings_repository_size_data(project)
    { allowed: true, action: project_path(project), value: project.repository_size_limit&.to_mb }
  end
end
