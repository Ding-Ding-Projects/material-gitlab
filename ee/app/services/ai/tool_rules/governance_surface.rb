# frozen_string_literal: true

module Ai
  module ToolRules
    # Resolves the governance surface for a Duo workflow, or nil to leave the
    # caller's default surface in place.
    module GovernanceSurface
      BACKGROUND = :background

      # `web` and `ambient` are both background environments (`web` is the legacy
      # form of `ambient`); keying off both reaches the Duo Developer flow, stored
      # as `web`, without a catalog relabel.
      BACKGROUND_ENVIRONMENTS = %w[web ambient].freeze

      # Limits background governance to these flows while the flag rolls out, so other
      # background flows stay unaffected. Remove at GA. Matched by reference base name
      # (`developer/v1` -> `developer`) so a flow version bump does not silently drop governance.
      ALLOWLISTED_FLOWS = %w[developer].freeze

      def self.for(environment:, container:, workflow_definition: nil)
        return unless BACKGROUND_ENVIRONMENTS.include?(environment.to_s)

        flow = ::Ai::Catalog::FoundationalFlow.find_by_reference(workflow_definition.to_s)
        return unless flow && ALLOWLISTED_FLOWS.include?(flow.foundational_flow_reference.split('/').first)

        # Check the flag on the root ancestor so it applies to all subgroups and projects.
        return unless Feature.enabled?(:duo_workflow_background_tool_governance, container&.root_ancestor)

        BACKGROUND
      end
    end
  end
end
