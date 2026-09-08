# frozen_string_literal: true

module MaterialSettingsPermissionsHelper
  MATERIAL_FEATURE_FIELDS = {
    issuesAccessLevel: ['issues_access_level', 'Work items'],
    repositoryAccessLevel: ['repository_access_level', 'Repository'],
    mergeRequestsAccessLevel: ['merge_requests_access_level', 'Merge requests'],
    forkingAccessLevel: ['forking_access_level', 'Forks'],
    buildsAccessLevel: ['builds_access_level', 'CI/CD'],
    containerRegistryAccessLevel: ['container_registry_access_level', 'Container registry'],
    analyticsAccessLevel: ['analytics_access_level', 'Analytics'],
    requirementsAccessLevel: ['requirements_access_level', 'Requirements'],
    securityAndComplianceAccessLevel: ['security_and_compliance_access_level', 'Security and compliance'],
    wikiAccessLevel: ['wiki_access_level', 'Wiki'],
    snippetsAccessLevel: ['snippets_access_level', 'Snippets'],
    packageRegistryAccessLevel: ['package_registry_access_level', 'Package registry'],
    modelExperimentsAccessLevel: ['model_experiments_access_level', 'Model experiments'],
    modelRegistryAccessLevel: ['model_registry_access_level', 'Model registry'],
    pagesAccessLevel: ['pages_access_level', 'Pages'],
    monitorAccessLevel: ['monitor_access_level', 'Monitor'],
    environmentsAccessLevel: ['environments_access_level', 'Environments'],
    featureFlagsAccessLevel: ['feature_flags_access_level', 'Feature flags'],
    infrastructureAccessLevel: ['infrastructure_access_level', 'Infrastructure'],
    releasesAccessLevel: ['releases_access_level', 'Releases']
  }.freeze

  def material_settings_permissions_data(project)
    return { allowed: false } unless can?(current_user, :admin_project, project)

    panel = project_permissions_panel_data(project)
    current = panel.fetch(:currentSettings)
    availability = {
      containerRegistryAccessLevel: panel[:registryAvailable],
      requirementsAccessLevel: panel[:requirementsAvailable],
      packageRegistryAccessLevel: panel[:packagesAvailable],
      pagesAccessLevel: panel[:pagesAvailable]
    }
    fields = MATERIAL_FEATURE_FIELDS.filter_map do |key, (field, label)|
      next unless current.key?(key)
      next if availability.key?(key) && !availability[key]

      {
        key: key, name: "project[project_feature_attributes][#{field}]",
        label: _(label), kind: 'access', value: current[key],
        repositoryDependent: %i[mergeRequestsAccessLevel buildsAccessLevel forkingAccessLevel].include?(key)
      }
    end
    booleans = [
      [:requestAccessEnabled, 'project[request_access_enabled]', _('Users can request access'), !project.private?],
      [:enforceAuthChecksOnUploads, 'project[project_setting_attributes][enforce_auth_checks_on_uploads]', _('Require authentication to view media files'), !project.public?],
      [:lfsEnabled, 'project[lfs_enabled]', _('Git Large File Storage'), panel[:lfsAvailable]],
      [:emailsEnabled, 'project[project_setting_attributes][emails_enabled]', _('Email notifications'), panel[:canDisableEmails]],
      [:showDiffPreviewInEmail, 'project[project_setting_attributes][show_diff_preview_in_email]', _('Include diff previews in email'), panel[:canDisableEmails] && panel[:canSetDiffPreviewInEmail]],
      [:showDefaultAwardEmojis, 'project[project_setting_attributes][show_default_award_emojis]', _('Show default emoji reactions'), true],
      [:warnAboutPotentiallyUnwantedCharacters, 'project[project_setting_attributes][warn_about_potentially_unwanted_characters]', _('Warn about potentially unwanted characters'), true],
      [:extendedPratExpiryWebhooksExecute, 'project[project_setting_attributes][extended_prat_expiry_webhooks_execute]', _('Additional access token expiration webhooks'), true],
      [:cveIdRequestEnabled, 'project[project_setting_attributes][cve_id_request_enabled]', _('Enable CVE ID requests'), panel[:requestCveAvailable]]
    ]
    booleans.each do |key, field, label, available|
      next unless available && current.key?(key)

      fields << { key: key, name: field, label: label, kind: 'boolean', value: !!current[key] }
    end

    {
      allowed: true, action: project_path(project), fields: fields,
      visibilityLevel: project.visibility_level,
      pagesAccessControlEnabled: panel[:pagesAccessControlEnabled],
      pagesAccessControlForced: panel[:pagesAccessControlForced],
      packageRegistryAllowAnyoneToPull: current[:packageRegistryAllowAnyoneToPullOption],
      lfsObjectsExist: panel[:lfsObjectsExist], lfsObjectsRemovalHelpPath: panel[:lfsObjectsRemovalHelpPath]
    }
  end
end
