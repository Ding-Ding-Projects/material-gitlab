# frozen_string_literal: true

# `Gitlab::PolicyStore.configuration` is a process-wide singleton, so the
# in-memory adapter would otherwise carry policies from one example into the
# next. The previously configured repository is restored in an `ensure` so the
# swap cannot outlive the example, and so this stays correct once a persistent
# repository is configured at boot.
RSpec.shared_context 'with an empty policy store' do
  around do |example|
    original_repository = ::Gitlab::PolicyStore.configuration.repository

    ::Gitlab::PolicyStore.configure do |config|
      config.repository = ::Gitlab::PolicyStore::Adapters::InMemoryPolicyRepository.new
    end

    example.run
  ensure
    ::Gitlab::PolicyStore.configure { |config| config.repository = original_repository }
  end

  def create_policy(**attributes)
    ::Gitlab::PolicyStore.create(attributes) # rubocop:disable Rails/SaveBang -- not ActiveRecord; the store has no create!
  end
end

RSpec.shared_context 'with the policy store experiment active' do
  before do
    stub_licensed_features(security_orchestration_policies: true)
    stub_application_setting(policy_store_experiment_enabled: true)
  end
end

RSpec.configure do |config|
  config.include_context 'with an empty policy store', :policy_store
end
