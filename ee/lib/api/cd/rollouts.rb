# frozen_string_literal: true

module API
  module Cd
    # Callback for the CD orchestrator (a Starlark workflow run by AutoFlow in
    # Relay/KAS, not inside the customer's cluster) to report flow-graph
    # progress. Authenticated by a per-rollout bearer token, not a user/PAT.
    class Rollouts < ::API::Base
      feature_category :continuous_delivery
      urgency :low

      TOPIC = 'com.gitlab.cd.deployment'

      helpers do
        def find_authenticated_rollout!(id)
          rollout = ::Cd::Rollout.id_in(id).first
          return rollout if rollout && ::Cd::Rollouts::CallbackToken.matches?(rollout_callback_token, rollout)

          ::Gitlab::Cd::Logger.info(message: 'Rejected rollout workflow event callback', rollout_id: id)
          unauthorized!
        end

        def rollout_callback_token
          auth_header = headers['Authorization']
          return unless auth_header&.start_with?('Bearer ')

          auth_header.delete_prefix('Bearer ')
        end
      end

      resource :rollouts do
        desc 'Ingest a rollout workflow event' do
          detail 'Reports flow-graph progress from the CD orchestrator (a Starlark workflow run by AutoFlow).'
          success code: 202, model: ::API::Entities::Cd::Rollout
          failure [
            { code: 401, message: 'Unauthorized' },
            { code: 422, message: 'Unprocessable entity' }
          ]
          tags %w[rollouts]
        end
        params do
          requires :id, type: Integer, desc: 'The ID of the rollout', documentation: { example: 1 }
          requires :topic, type: String, values: [TOPIC], desc: 'The event topic'
          requires :type, type: String, limit: 255, desc: 'The event type'
          requires :data, type: Hash, desc: 'The event payload' do
            requires :position, type: Array[Integer],
              desc: 'Zero-based path to the stage/step in the flow definition'
            optional :stage_name, type: String, limit: 255,
              desc: 'Name of the enclosing stage (an environment tier); absent for a step outside any stage'
            optional :environment, type: String, limit: 255,
              desc: 'Exact name of the target GitLab environment; resolves the rollout environment to update ' \
                'when a stage deploys to more than one environment'
            optional :step_type, type: String, limit: 255, desc: 'The step type, present on step_* events'
            optional :error, type: String, limit: 2000, desc: 'Failure detail, present on step_failed'
          end
        end
        route_setting :authorization, skip_granular_token_authorization: :cd_rollout_workflow_event
        post ':id' do
          rollout = find_authenticated_rollout!(params[:id])

          result = ::Cd::Rollouts::ProcessWorkflowEventService.new(
            rollout, params: declared(params, include_missing: false)
          ).execute

          render_api_error!(result.message, 422) if result.error?

          status :accepted
          present rollout, with: ::API::Entities::Cd::Rollout
        end
      end
    end
  end
end
