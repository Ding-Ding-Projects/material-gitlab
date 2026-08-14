# frozen_string_literal: true

module Security
  module SecurityOrchestrationPolicies
    module PolicyStore
      class FindService < BaseService
        def initialize(organization:, policy_id:)
          super(organization: organization)

          @policy_id = policy_id
        end

        def execute
          return experiment_not_active_error unless experiment_active?

          policy = find_policy(policy_id)
          return policy_not_found_error unless policy

          ServiceResponse.success(payload: { policy: policy })
        end

        private

        attr_reader :policy_id
      end
    end
  end
end
