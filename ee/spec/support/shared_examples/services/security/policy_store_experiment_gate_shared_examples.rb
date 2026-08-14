# frozen_string_literal: true

# `store_method` is the facade method the service would reach for, asserted to
# stay untouched while the experiment is off.
RSpec.shared_examples 'a service gated by the policy store experiment' do |store_method|
  shared_examples 'an inactive experiment' do
    it 'returns an error without using the store', :aggregate_failures do
      expect(Gitlab::PolicyStore).not_to receive(store_method)

      result = service.execute

      expect(result).to be_error
      expect(result.reason).to eq(:experiment_not_active)
      expect(result.message).to eq('Policy Store experiment is not active for this organization')
    end
  end

  context 'when the feature flag is disabled' do
    before do
      stub_feature_flags(security_policies_v2: false)
    end

    it_behaves_like 'an inactive experiment'
  end

  context 'when the license is not available' do
    before do
      stub_licensed_features(security_orchestration_policies: false)
    end

    it_behaves_like 'an inactive experiment'
  end

  context 'when the experiment is disabled for the instance' do
    before do
      stub_application_setting(policy_store_experiment_enabled: false)
    end

    it_behaves_like 'an inactive experiment'
  end
end
