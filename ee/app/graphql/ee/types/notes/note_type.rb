# frozen_string_literal: true

module EE
  module Types
    module Notes
      module NoteType
        extend ActiveSupport::Concern

        prepended do
          field :duo_workflow_links,
            resolver: ::Resolvers::Ai::DuoWorkflows::NoteDuoWorkflowLinksResolver,
            description: 'GitLab Duo Agent Platform sessions linked to the note.' do
              extension ::Gitlab::Graphql::Limit::FieldCallCount, limit: 1
            end
        end
      end
    end
  end
end
