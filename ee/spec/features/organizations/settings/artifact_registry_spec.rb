# frozen_string_literal: true

require 'spec_helper'

RSpec.describe 'Organization Artifact Registry settings shell', :js, :with_current_organization,
  feature_category: :artifact_registry do
  let_it_be(:user) { create(:user, :organization_owner, organizations: [current_organization]) }

  before do
    sign_in(user)
  end

  it 'boots the Vue settings shell and renders the activation section' do
    visit artifact_registry_settings_organization_path(current_organization)

    expect(page).to have_content(s_('ArtifactRegistry|Activation'))
    expect(page).to have_content(
      s_('ArtifactRegistry|Control artifact registry access for this organization. When ' \
        'enabled, all projects and groups have access to a unified registry.')
    )
    expect_page_to_have_no_console_errors
  end
end
