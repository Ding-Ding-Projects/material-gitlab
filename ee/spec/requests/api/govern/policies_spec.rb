# frozen_string_literal: true

require 'spec_helper'

RSpec.describe API::Govern::Policies, :api, :aggregate_failures,
  feature_category: :security_policy_management do
  let_it_be(:user) { create(:user) }

  before do
    stub_licensed_features(security_orchestration_policies: true)
    stub_application_setting(policy_store_experiment_enabled: true)
  end

  shared_examples 'a policy store catalogue endpoint' do
    let(:current_user) { user }

    subject(:perform_request) { get api(path, current_user) }

    it 'returns the catalogue' do
      perform_request

      expect(response).to have_gitlab_http_status(:ok)
      expect(json_response).to eq(expected_catalogue)
    end

    context 'when the feature flag is disabled' do
      before do
        stub_feature_flags(security_policies_v2: false)
      end

      it 'returns 404, so the flag works as a kill switch on its own' do
        perform_request

        expect(response).to have_gitlab_http_status(:not_found)
      end
    end

    context 'when the experiment is disabled for the instance' do
      before do
        stub_application_setting(policy_store_experiment_enabled: false)
      end

      it 'returns 404' do
        perform_request

        expect(response).to have_gitlab_http_status(:not_found)
      end
    end

    context 'when the license is not available' do
      before do
        stub_licensed_features(security_orchestration_policies: false)
      end

      it 'returns 403' do
        perform_request

        expect(response).to have_gitlab_http_status(:forbidden)
      end
    end

    context 'when unauthenticated' do
      let(:current_user) { nil }

      it 'still returns the catalogue, because it is not user-specific' do
        perform_request

        expect(response).to have_gitlab_http_status(:ok)
        expect(json_response).to eq(expected_catalogue)
      end
    end

    context 'when the token is invalid' do
      it 'ignores the credentials rather than returning 401' do
        get api(path), headers: { 'PRIVATE-TOKEN' => 'not-a-real-token' }

        expect(response).to have_gitlab_http_status(:ok)
      end
    end
  end

  describe 'GET /security/policy_store/triggers' do
    it_behaves_like 'a policy store catalogue endpoint' do
      let(:path) { '/security/policy_store/triggers' }
      let(:expected_catalogue) do
        [
          { 'id' => 'deployment_requested', 'name' => 'Deployment' }
        ]
      end
    end
  end

  describe 'GET /security/policy_store/actions' do
    it_behaves_like 'a policy store catalogue endpoint' do
      let(:path) { '/security/policy_store/actions' }
      let(:expected_catalogue) do
        [
          { 'id' => 'block', 'name' => 'Block' },
          { 'id' => 'require_approval', 'name' => 'Require approval' }
        ]
      end
    end
  end

  describe 'GET /security/policy_store/rules' do
    it_behaves_like 'a policy store catalogue endpoint' do
      let(:path) { '/security/policy_store/rules' }
      let(:expected_catalogue) do
        [
          { 'id' => 'custom', 'name' => 'Custom' },
          { 'id' => 'calendar', 'name' => 'Calendar' },
          { 'id' => 'environment', 'name' => 'Environment' }
        ]
      end
    end
  end

  describe 'the organization-scoped routes', :policy_store do
    let_it_be(:organization) { create(:organization) }
    let_it_be(:private_organization) { create(:organization, :private) }
    let_it_be(:other_organization) { create(:organization) }
    let_it_be(:owner) { create(:user) }
    let_it_be(:member) { create(:user) }

    let(:current_user) { owner }
    let(:target_organization_id) { organization.id }

    let!(:policy) do
      create_policy(
        organization_id: organization.id,
        name: 'Block deployments on critical findings',
        trigger_type: 'deployment_requested'
      )
    end

    subject(:perform_request) { get api(path, current_user) }

    before_all do
      create(:organization_user, :owner, organization: organization, user: owner)
      create(:organization_user, organization: organization, user: member, access_level: :default)
    end

    shared_examples 'an organization-scoped policy store endpoint' do
      context 'when the user is an organization member without the owner role' do
        let(:current_user) { member }

        it 'returns 403' do
          perform_request

          expect(response).to have_gitlab_http_status(:forbidden)
        end
      end

      context 'when the user does not belong to the organization' do
        let(:current_user) { user }

        it 'returns 403, since the organization itself is public and readable' do
          perform_request

          expect(response).to have_gitlab_http_status(:forbidden)
        end
      end

      context 'when the organization is private and the user does not belong to it' do
        let(:current_user) { user }
        let(:target_organization_id) { private_organization.id }

        it 'returns 404 naming the organization, the same as one that does not exist' do
          perform_request

          expect(response).to have_gitlab_http_status(:not_found)
          expect(json_response['message']).to eq('404 Organization Not Found')
        end
      end

      context 'when the organization does not exist' do
        let(:target_organization_id) { non_existing_record_id }

        it 'returns 404 naming the organization' do
          perform_request

          expect(response).to have_gitlab_http_status(:not_found)
          expect(json_response['message']).to eq('404 Organization Not Found')
        end
      end

      context 'when unauthenticated' do
        let(:current_user) { nil }

        it 'returns 401, unlike the catalogue routes' do
          perform_request

          expect(response).to have_gitlab_http_status(:unauthorized)
        end
      end

      context 'when the feature flag is disabled' do
        before do
          stub_feature_flags(security_policies_v2: false)
        end

        it 'returns 404 without naming a resource, so the gate reveals nothing about the route' do
          perform_request

          expect(response).to have_gitlab_http_status(:not_found)
          expect(json_response['message']).to eq('404 Not Found')
        end
      end

      context 'when the experiment is disabled for the instance' do
        before do
          stub_application_setting(policy_store_experiment_enabled: false)
        end

        it 'returns 404 without naming a resource, since it is a separate gate from the flag' do
          perform_request

          expect(response).to have_gitlab_http_status(:not_found)
          expect(json_response['message']).to eq('404 Not Found')
        end
      end

      context 'when the license is not available' do
        before do
          stub_licensed_features(security_orchestration_policies: false)
        end

        it 'returns 403' do
          perform_request

          expect(response).to have_gitlab_http_status(:forbidden)
        end
      end
    end

    describe 'GET /organizations/:id/security/policy_store' do
      let(:path) { "/organizations/#{target_organization_id}/security/policy_store" }

      it 'returns the policies of the organization' do
        perform_request

        expect(response).to have_gitlab_http_status(:ok)
        expect(json_response).to contain_exactly(
          a_hash_including(
            'id' => policy.id,
            'organization_id' => organization.id,
            'name' => 'Block deployments on critical findings',
            'trigger_type' => 'deployment_requested',
            'version' => 1,
            'mode' => 'enforce',
            'lifecycle_state' => 'active'
          )
        )
      end

      it 'matches the policies schema' do
        perform_request

        expect(response).to match_response_schema('public_api/v4/govern_policies', dir: 'ee')
      end

      context 'with a trigger_type' do
        let!(:merge_request_policy) do
          create_policy(
            organization_id: organization.id,
            name: 'Merge request policy',
            trigger_type: 'merge_request'
          )
        end

        let(:path) do
          "/organizations/#{target_organization_id}/security/policy_store?trigger_type=deployment_requested"
        end

        it 'returns only the policies for that trigger' do
          perform_request

          expect(response).to have_gitlab_http_status(:ok)
          expect(json_response.pluck('id')).to contain_exactly(policy.id)
        end

        context 'when the trigger is not in the catalogue' do
          let(:path) do
            "/organizations/#{target_organization_id}/security/policy_store?trigger_type=merge_request"
          end

          it 'returns 400, rather than an empty collection, since the route constrains the value' do
            perform_request

            expect(response).to have_gitlab_http_status(:bad_request)
          end
        end
      end

      context 'when another organization owns a policy' do
        let!(:other_organization_policy) do
          create_policy(
            organization_id: other_organization.id,
            name: 'Other organization policy',
            trigger_type: 'deployment_requested'
          )
        end

        it 'omits it, so a policy id alone does not cross organizations' do
          perform_request

          expect(response).to have_gitlab_http_status(:ok)
          expect(json_response.pluck('id')).to contain_exactly(policy.id)
        end
      end

      context 'when the organization has no policies' do
        let_it_be(:empty_organization) { create(:organization) }

        let(:target_organization_id) { empty_organization.id }

        before_all do
          create(:organization_user, :owner, organization: empty_organization, user: owner)
        end

        it 'returns an empty collection' do
          perform_request

          expect(response).to have_gitlab_http_status(:ok)
          expect(json_response).to eq([])
        end
      end

      context 'when the service reports the experiment inactive' do
        before do
          allow_next_instance_of(::Security::SecurityOrchestrationPolicies::PolicyStore::ListService) do |service|
            allow(service).to receive(:execute).and_return(
              ServiceResponse.error(message: 'nope', reason: :experiment_not_active)
            )
          end
        end

        it 'returns 404 rather than presenting an empty payload' do
          perform_request

          expect(response).to have_gitlab_http_status(:not_found)
        end
      end

      context 'when the service reports invalid input' do
        before do
          allow_next_instance_of(::Security::SecurityOrchestrationPolicies::PolicyStore::ListService) do |service|
            allow(service).to receive(:execute).and_return(
              ServiceResponse.error(message: 'Missing required attributes: name', reason: :invalid)
            )
          end
        end

        it 'returns 400 and forwards the message, since it is written for the caller' do
          perform_request

          expect(response).to have_gitlab_http_status(:bad_request)
          expect(json_response['message']).to eq('Missing required attributes: name')
        end

        it 'does not track it, so a mapped reason cannot page anyone' do
          expect(::Gitlab::ErrorTracking).not_to receive(:track_exception)

          perform_request
        end
      end

      context 'when the service fails for a reason the endpoint does not map' do
        before do
          allow_next_instance_of(::Security::SecurityOrchestrationPolicies::PolicyStore::ListService) do |service|
            allow(service).to receive(:execute).and_return(
              ServiceResponse.error(message: 'PG::ConnectionBad: could not connect to host', reason: :unexpected)
            )
          end
        end

        it 'returns 500 and a generic message, since the reason is a bug on our side' do
          perform_request

          expect(response).to have_gitlab_http_status(:internal_server_error)
          expect(json_response['message']).to eq('Could not complete the policy store request')
          expect(json_response['message']).not_to include('PG::ConnectionBad')
        end

        it 'tracks the reason as the title, so the tracked issue names the fix' do
          expect(::Gitlab::ErrorTracking).to receive(:track_exception).with(
            having_attributes(
              class: ::API::Govern::Policies::UnmappedReasonError,
              message: 'Unmapped policy store reason: unexpected'
            ),
            service_message: 'PG::ConnectionBad: could not connect to host'
          )

          perform_request
        end
      end

      it_behaves_like 'an organization-scoped policy store endpoint'

      it_behaves_like 'authorizing granular token permissions', :read_govern_policy do
        let(:user) { owner }
        let(:boundary_object) { :instance }
        let(:request) { get api(path, personal_access_token: pat) }
      end
    end

    describe 'GET /organizations/:id/security/policy_store/:policy_id' do
      let(:target_policy_id) { policy.id }
      let(:path) { "/organizations/#{target_organization_id}/security/policy_store/#{target_policy_id}" }

      it 'returns the policy' do
        perform_request

        expect(response).to have_gitlab_http_status(:ok)
        expect(json_response).to include(
          'id' => policy.id,
          'organization_id' => organization.id,
          'name' => 'Block deployments on critical findings',
          'trigger_type' => 'deployment_requested',
          'version' => 1,
          'mode' => 'enforce',
          'lifecycle_state' => 'active'
        )
      end

      it 'matches the policy schema' do
        perform_request

        expect(response).to match_response_schema('public_api/v4/govern_policy', dir: 'ee')
      end

      context 'when the policy does not exist' do
        let(:target_policy_id) { non_existing_record_id }

        it 'returns 404 naming the policy, not the organization it looked in' do
          perform_request

          expect(response).to have_gitlab_http_status(:not_found)
          expect(json_response['message']).to eq('404 Policy Not Found')
        end
      end

      context 'when the policy belongs to another organization' do
        let(:target_policy_id) do
          create_policy(
            organization_id: other_organization.id,
            name: 'Other organization policy',
            trigger_type: 'deployment_requested'
          ).id
        end

        it 'returns the same 404 as a missing policy, so an id cannot be probed across organizations' do
          perform_request

          expect(response).to have_gitlab_http_status(:not_found)
          expect(json_response['message']).to eq('404 Policy Not Found')
        end
      end

      it_behaves_like 'an organization-scoped policy store endpoint'

      it_behaves_like 'authorizing granular token permissions', :read_govern_policy do
        let(:user) { owner }
        let(:boundary_object) { :instance }
        let(:request) { get api(path, personal_access_token: pat) }
      end
    end

    describe 'DELETE /organizations/:id/security/policy_store/:policy_id' do
      let(:target_policy_id) { policy.id }
      let(:path) { "/organizations/#{target_organization_id}/security/policy_store/#{target_policy_id}" }

      subject(:perform_request) { delete api(path, current_user) }

      it 'deletes the policy and returns no content' do
        expect { perform_request }
          .to change { Gitlab::PolicyStore.list(organization_id: organization.id).size }.by(-1)

        expect(response).to have_gitlab_http_status(:no_content)
        expect(response.body).to be_empty
      end

      context 'when the policy does not exist' do
        let(:target_policy_id) { non_existing_record_id }

        it 'returns 404 naming the policy' do
          perform_request

          expect(response).to have_gitlab_http_status(:not_found)
          expect(json_response['message']).to eq('404 Policy Not Found')
        end
      end

      # let! rather than let: the policy has to exist before the change matcher takes its
      # baseline, otherwise creating it inside the block reads as the delete having failed.
      context 'when the policy belongs to another organization' do
        let!(:target_policy_id) do
          create_policy(
            organization_id: other_organization.id,
            name: 'Other organization policy',
            trigger_type: 'deployment_requested'
          ).id
        end

        it 'returns the same 404 as a missing policy and leaves it in the store' do
          expect { perform_request }
            .not_to change { Gitlab::PolicyStore.list(organization_id: other_organization.id).size }

          expect(response).to have_gitlab_http_status(:not_found)
          expect(json_response['message']).to eq('404 Policy Not Found')
        end
      end

      it_behaves_like 'an organization-scoped policy store endpoint'

      it_behaves_like 'authorizing granular token permissions', :delete_govern_policy,
        expected_success_status: :no_content do
        let(:user) { owner }
        let(:boundary_object) { :instance }
        let(:request) { delete api(path, personal_access_token: pat) }
      end
    end
  end
end
