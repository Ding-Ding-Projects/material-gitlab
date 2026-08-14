# frozen_string_literal: true

module Groups
  module Security
    class PolicyStoreController < Groups::ApplicationController
      include SecurityPoliciesPermissions

      before_action :ensure_policy_store_experiment_active!
      before_action :authorize_read_policies!

      feature_category :security_policy_management
      urgency :low, [:index]

      def index
        render :index, locals: { group: group }
      end

      private

      def container
        group
      end

      def ensure_policy_store_experiment_active!
        render_404 unless group.policy_store_experiment_active?
      end

      def authorize_read_policies!
        render_404 unless can?(current_user, :read_security_orchestration_policies, group)
      end
    end
  end
end
