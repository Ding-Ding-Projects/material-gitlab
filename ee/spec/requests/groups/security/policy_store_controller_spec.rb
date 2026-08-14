# frozen_string_literal: true

require 'spec_helper'

RSpec.describe Groups::Security::PolicyStoreController, feature_category: :security_policy_management do
  let_it_be(:user) { create(:user) }
  let_it_be_with_reload(:group) { create(:group) }
  let(:instance_enabled) { true }
  let(:group_enabled) { true }

  subject(:request) { get group_security_policy_store_index_url(group) }

  before_all do
    group.add_developer(user)
  end

  before do
    sign_in(user)

    stub_licensed_features(security_orchestration_policies: true)
    stub_application_setting(policy_store_experiment_enabled: instance_enabled)
    group.namespace_settings.update!(policy_store_experiment_enabled: group_enabled)
  end

  context 'when the experiment is active for the group' do
    it 'renders the policy store page mounting the v2 app' do
      request

      expect(response).to have_gitlab_http_status(:ok)
      expect(response.body).to include('js-policy-store')
    end
  end

  context 'when the security_policies_v2 feature flag is disabled' do
    before do
      stub_feature_flags(security_policies_v2: false)
    end

    it 'returns 404' do
      request

      expect(response).to have_gitlab_http_status(:not_found)
    end
  end

  context 'when the instance setting is off' do
    let(:instance_enabled) { false }

    it 'returns 404' do
      request

      expect(response).to have_gitlab_http_status(:not_found)
    end
  end

  context 'when the group toggle is off' do
    let(:group_enabled) { false }

    it 'returns 404' do
      request

      expect(response).to have_gitlab_http_status(:not_found)
    end
  end

  context 'when the group is a subgroup' do
    let_it_be_with_reload(:subgroup) { create(:group, parent: group) }

    subject(:request) { get group_security_policy_store_index_url(subgroup) }

    before do
      subgroup.namespace_settings.update!(policy_store_experiment_enabled: true)
    end

    it 'returns 404, as the experiment is top-level-group only' do
      request

      expect(response).to have_gitlab_http_status(:not_found)
    end
  end

  context 'when the feature is not licensed' do
    before do
      stub_licensed_features(security_orchestration_policies: false)
    end

    it 'returns 404' do
      request

      expect(response).to have_gitlab_http_status(:not_found)
    end
  end
end
