# frozen_string_literal: true

module WorkItems
  module Widgets
    class AgentPlan < Base
      def self.required_user_ability
        :update_work_item
      end

      delegate :content, :content_html, to: :agent_plan_record, allow_nil: true

      private

      def agent_plan_record
        work_item.agent_plan
      end
    end
  end
end
