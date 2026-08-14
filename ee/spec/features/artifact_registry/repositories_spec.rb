# frozen_string_literal: true

require 'spec_helper'

RSpec.describe 'Organization Artifact Registry repositories SPA', :js, :with_current_organization,
  feature_category: :artifact_registry do
  let(:user) { create(:user, organizations: [current_organization]) }

  let(:slug) { ::Organizations::ArtifactRegistry::STUB_SLUG }
  let(:repositories_base_path) { "/o/#{current_organization.path}/-/artifact_registry/#{slug}/repositories" }

  before do
    sign_in(user)
  end

  it 'boots the Vue SPA shell on the slug-scoped repositories route' do
    visit repositories_base_path

    expect(page).to have_testid('repositories-shell')
  end

  it 'serves a deep unregistered sub-path via the Rails catch-all and renders the in-SPA NotFound fallback' do
    visit "#{repositories_base_path}/does-not-exist"

    within_testid('repositories-shell') do
      expect(page).to have_css('h1', text: 'Page not found')
    end
  end
end
