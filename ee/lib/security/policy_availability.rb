# frozen_string_literal: true

module Security
  class PolicyAvailability
    class Licensed
      def initialize(feature)
        @feature = feature
      end

      def enabled_for?(subject)
        subject.licensed_feature_available?(@feature)
      end
    end

    # Delegates to the dependency firewall's own availability rules (feature flag, license and
    # the root namespace setting) so both surfaces stay in sync.
    class DependencyFirewall
      def enabled_for?(subject)
        ::Security::DependencyFirewall::Availability.enforced_for?(subject)
      end
    end

    REGISTRY = {
      scan_execution_policy: PolicyAvailability::Licensed.new(:security_orchestration_policies),
      approval_policy: PolicyAvailability::Licensed.new(:security_orchestration_policies),
      pipeline_execution_policy: PolicyAvailability::Licensed.new(:security_orchestration_policies),
      pipeline_execution_schedule_policy: PolicyAvailability::Licensed.new(:security_orchestration_policies),
      vulnerability_management_policy: PolicyAvailability::Licensed.new(:security_orchestration_policies),
      dependency_firewall_policy: PolicyAvailability::DependencyFirewall.new
    }.freeze

    def self.any_available?(subject)
      REGISTRY.values.any? { |evaluator| evaluator.enabled_for?(subject) }
    end

    def self.available?(subject, policy_type)
      evaluator = REGISTRY[policy_type]
      return false unless evaluator

      evaluator.enabled_for?(subject)
    end
  end
end
