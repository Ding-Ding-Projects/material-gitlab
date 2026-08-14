# frozen_string_literal: true

require 'spec_helper'

RSpec.describe GitlabSchema.types['Note'], feature_category: :duo_agent_platform do
  include GraphqlHelpers

  it { expect(described_class).to have_graphql_field(:duo_workflow_links) }
end
