# frozen_string_literal: true

module API
  module Govern
    class Policies < ::API::Base
      UnmappedReasonError = Class.new(StandardError)

      UNMAPPED_REASON_MESSAGE = 'Could not complete the policy store request'

      feature_category :security_policy_management
      urgency :low

      before do
        not_found! unless ::Feature.enabled?(:security_policies_v2, :instance)
        not_found! unless ::Gitlab::CurrentSettings.policy_store_experiment_enabled?
        forbidden! unless ::License.feature_available?(:security_orchestration_policies)
      end

      resource :security do
        desc 'List the triggers a security policy can target' do
          detail 'Lists the triggers available when creating a policy in the policy store.'
          success ::API::Entities::Govern::Trigger
          is_array true
          failure [
            { code: 403, message: 'Forbidden' },
            { code: 404, message: 'Not found' }
          ]
          tags %w[policy_store]
          hidden true
        end
        route_setting :authorization, skip_granular_token_authorization: :public_endpoint
        route_setting :lifecycle, :experiment
        route_setting :tier, :ultimate
        get 'policy_store/triggers' do
          present ::Gitlab::PolicyStore::Triggers::ALL, with: ::API::Entities::Govern::Trigger
        end

        desc 'List the actions a security policy can take' do
          detail 'Lists the actions available when creating a policy in the policy store.'
          success ::API::Entities::Govern::Action
          is_array true
          failure [
            { code: 403, message: 'Forbidden' },
            { code: 404, message: 'Not found' }
          ]
          tags %w[policy_store]
          hidden true
        end
        route_setting :authorization, skip_granular_token_authorization: :public_endpoint
        route_setting :lifecycle, :experiment
        route_setting :tier, :ultimate
        get 'policy_store/actions' do
          present ::Gitlab::PolicyStore::Actions::ALL, with: ::API::Entities::Govern::Action
        end

        desc 'List the rule kinds a security policy can be built from' do
          detail 'Lists the rule kinds available when creating a policy in the policy store.'
          success ::API::Entities::Govern::Rule
          is_array true
          failure [
            { code: 403, message: 'Forbidden' },
            { code: 404, message: 'Not found' }
          ]
          tags %w[policy_store]
          hidden true
        end
        route_setting :authorization, skip_granular_token_authorization: :public_endpoint
        route_setting :lifecycle, :experiment
        route_setting :tier, :ultimate
        get 'policy_store/rules' do
          present ::Gitlab::PolicyStore::Rules::ALL, with: ::API::Entities::Govern::Rule
        end
      end

      resource :organizations do
        before do
          authenticate!
        end

        helpers do
          def authorized_organization!(ability)
            organization = find_organization!(params[:id])
            authorize! ability, organization

            organization
          end

          def render_policy_store_error!(response)
            case response.reason
            when :not_found
              not_found!('Policy')
            when :experiment_not_active
              not_found!
            when :invalid
              render_api_error!(response.message, :bad_request)
            else
              ::Gitlab::ErrorTracking.track_exception(
                UnmappedReasonError.new("Unmapped policy store reason: #{response.reason}"),
                service_message: response.message
              )

              render_api_error!(UNMAPPED_REASON_MESSAGE, :internal_server_error)
            end
          end
        end

        desc 'List the security policies of an organization' do
          detail 'Lists the policies stored in the policy store for the given organization.'
          success ::API::Entities::Govern::Policy
          is_array true
          failure [
            { code: 400, message: 'Bad request' },
            { code: 401, message: 'Unauthorized' },
            { code: 403, message: 'Forbidden' },
            { code: 404, message: 'Not found' },
            { code: 500, message: 'Internal server error' }
          ]
          tags %w[policy_store]
          hidden true
        end
        params do
          requires :id, type: Integer, desc: 'The ID of the organization'
          optional :trigger_type, type: String,
            values: ::Gitlab::PolicyStore::Triggers::ALL.map { |trigger| trigger[:id] },
            desc: 'Return only the policies that respond to this trigger'
        end
        route_setting :authorization, permissions: :read_govern_policy, boundary_type: :instance
        route_setting :lifecycle, :experiment
        route_setting :tier, :ultimate
        get ':id/security/policy_store' do
          organization = authorized_organization!(:read_govern_policy)

          response = ::Security::SecurityOrchestrationPolicies::PolicyStore::ListService
            .new(organization: organization, trigger_type: params[:trigger_type])
            .execute

          render_policy_store_error!(response) if response.error?

          present response.payload[:policies], with: ::API::Entities::Govern::Policy
        end

        desc 'Get a security policy of an organization' do
          detail 'Gets a single policy from the policy store for the given organization.'
          success ::API::Entities::Govern::Policy
          failure [
            { code: 400, message: 'Bad request' },
            { code: 401, message: 'Unauthorized' },
            { code: 403, message: 'Forbidden' },
            { code: 404, message: 'Not found' },
            { code: 500, message: 'Internal server error' }
          ]
          tags %w[policy_store]
          hidden true
        end
        params do
          requires :id, type: Integer, desc: 'The ID of the organization'
          requires :policy_id, type: Integer, desc: 'The ID of the policy'
        end
        route_setting :authorization, permissions: :read_govern_policy, boundary_type: :instance
        route_setting :lifecycle, :experiment
        route_setting :tier, :ultimate
        get ':id/security/policy_store/:policy_id' do
          organization = authorized_organization!(:read_govern_policy)

          response = ::Security::SecurityOrchestrationPolicies::PolicyStore::FindService
            .new(organization: organization, policy_id: params[:policy_id])
            .execute

          render_policy_store_error!(response) if response.error?

          present response.payload[:policy], with: ::API::Entities::Govern::Policy
        end

        desc 'Delete a security policy of an organization' do
          detail 'Deletes a policy from the policy store for the given organization.'
          success code: 204
          failure [
            { code: 400, message: 'Bad request' },
            { code: 401, message: 'Unauthorized' },
            { code: 403, message: 'Forbidden' },
            { code: 404, message: 'Not found' },
            { code: 500, message: 'Internal server error' }
          ]
          tags %w[policy_store]
          hidden true
        end
        params do
          requires :id, type: Integer, desc: 'The ID of the organization'
          requires :policy_id, type: Integer, desc: 'The ID of the policy'
        end
        route_setting :authorization, permissions: :delete_govern_policy, boundary_type: :instance
        route_setting :lifecycle, :experiment
        route_setting :tier, :ultimate
        delete ':id/security/policy_store/:policy_id' do
          organization = authorized_organization!(:delete_govern_policy)

          response = ::Security::SecurityOrchestrationPolicies::PolicyStore::DestroyService
            .new(organization: organization, policy_id: params[:policy_id])
            .execute

          render_policy_store_error!(response) if response.error?

          no_content!
        end
      end
    end
  end
end
