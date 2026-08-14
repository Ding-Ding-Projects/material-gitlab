# frozen_string_literal: true

module Security
  module SecurityOrchestrationPolicies
    module PolicyStore
      class BaseService
        EXPERIMENT_NOT_ACTIVE_MESSAGE = 'Policy Store experiment is not active for this organization'
        POLICY_NOT_FOUND_MESSAGE = 'Policy was not found'
        CONFLICTING_SCOPE_MESSAGE = 'Only one of policy_scope or scope_rego can be provided'

        def initialize(organization:, params: {})
          @organization = organization
          @params = params.to_h.symbolize_keys
        end

        private

        attr_reader :organization, :params

        def experiment_active?
          organization.policy_store_experiment_active?
        end

        def find_policy(policy_id)
          policy = ::Gitlab::PolicyStore.find(policy_id)

          policy if policy.organization_id == organization.id
        rescue ::Gitlab::PolicyStore::NotFound
          nil
        end

        def experiment_not_active_error
          ServiceResponse.error(message: EXPERIMENT_NOT_ACTIVE_MESSAGE, reason: :experiment_not_active)
        end

        def policy_not_found_error
          ServiceResponse.error(message: POLICY_NOT_FOUND_MESSAGE, reason: :not_found)
        end

        def conflicting_scope?
          params[:policy_scope].present? && params[:scope_rego].present?
        end

        def conflicting_scope_error
          ServiceResponse.error(message: CONFLICTING_SCOPE_MESSAGE, reason: :invalid)
        end
      end
    end
  end
end
