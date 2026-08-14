# frozen_string_literal: true

require 'spec_helper'

RSpec.describe Security::SecurityOrchestrationPolicies::PolicyStore::ListService, :policy_store,
  feature_category: :security_policy_management do
  let_it_be(:organization) { create(:organization) }

  subject(:service) { described_class.new(organization: organization) }

  include_context 'with the policy store experiment active'

  describe '#execute' do
    let_it_be(:other_organization) { create(:organization) }

    let!(:policy) do
      create_policy(
        organization_id: organization.id,
        name: 'Test policy',
        trigger_type: 'deployment_requested'
      )
    end

    let!(:other_organization_policy) do
      create_policy(
        organization_id: other_organization.id,
        name: 'Other organization policy',
        trigger_type: 'deployment_requested'
      )
    end

    it 'returns only the policies of the given organization', :aggregate_failures do
      result = service.execute

      expect(result).to be_success
      expect(result.payload[:policies]).to contain_exactly(policy)
      expect(result.payload[:policies]).to all(be_a(Gitlab::PolicyStore::Policy))
    end

    context 'when the organization has no policies' do
      subject(:service) { described_class.new(organization: create(:organization)) }

      it 'returns an empty collection', :aggregate_failures do
        result = service.execute

        expect(result).to be_success
        expect(result.payload[:policies]).to be_empty
      end
    end

    context 'with a trigger_type' do
      let!(:merge_request_policy) do
        create_policy(
          organization_id: organization.id,
          name: 'Merge request policy',
          trigger_type: 'merge_request'
        )
      end

      subject(:service) { described_class.new(organization: organization, trigger_type: 'merge_request') }

      it 'returns only the policies for that trigger', :aggregate_failures do
        result = service.execute

        expect(result).to be_success
        expect(result.payload[:policies]).to contain_exactly(merge_request_policy)
      end

      context 'when no policy targets it' do
        subject(:service) { described_class.new(organization: organization, trigger_type: 'environment_advanced') }

        it 'returns an empty collection' do
          expect(service.execute.payload[:policies]).to be_empty
        end
      end
    end

    it_behaves_like 'a service gated by the policy store experiment', :list
  end
end
