# frozen_string_literal: true

module Cd
  module Rollouts
    # Dispatches a flow-graph event from the CD orchestrator to the
    # Cd::RolloutEnvironment it names. Events are at-least-once and
    # fire-and-forget: unmatched/unhandled events are logged as no-ops.
    #
    # `data.environment` (present on stage_started/stage_succeeded/step_failed) is
    # the exact GitLab environment name to transition -- a stage can deploy to more
    # than one environment, so `stage_name` alone cannot resolve it.
    #
    # step_started/step_succeeded, step_failed outside a stage, and unrecognised
    # event types are all accepted and acknowledged only.
    #
    # Driving the rollout's own state (not just its environments') from these
    # events is intentionally not done here: a rollout can have many stages
    # and steps outside any stage, so no single stage event maps to overall
    # rollout completion (see note_3654641863 on this MR). Nothing currently
    # transitions Cd::Rollout out of in_progress; that gap needs its own
    # follow-up once the orchestrator side of that signal is decided.
    #
    # Exact-duplicate retries (the reported state already matches the current
    # one) are treated as a no-op success rather than an error, since the
    # calling durable workflow engine retries actions on failure or restart.
    class ProcessWorkflowEventService
      STAGE_FINISHED_STATE = {
        'com.gitlab.cd.stage_succeeded' => 'completed',
        'com.gitlab.cd.step_failed' => 'failed'
      }.freeze

      def initialize(rollout, params:)
        @rollout = rollout
        @params = params
      end

      def execute
        dispatch

        ServiceResponse.success(payload: { rollout: rollout })
      rescue ActiveRecord::RecordInvalid => e
        Gitlab::ErrorTracking.track_exception(e, rollout_id: rollout.id)
        ServiceResponse.error(message: _('Unable to process rollout workflow event.'), payload: { rollout: rollout })
      end

      private

      attr_reader :rollout, :params

      def dispatch
        case params[:type]
        when 'com.gitlab.cd.stage_started'
          transition_environment('in_progress')
        when 'com.gitlab.cd.stage_succeeded', 'com.gitlab.cd.step_failed'
          transition_environment(STAGE_FINISHED_STATE.fetch(params[:type]))
        end
      end

      def transition_environment(target_state)
        return unless environment_name

        rollout_environment = rollout.rollout_environments.with_environment_name(environment_name).first

        return log_unmatched(environment_name) unless rollout_environment
        return if rollout_environment.state == target_state
        # A terminal environment ignores further events instead of being dragged back
        # to a non-terminal state by a stale/out-of-order retry.
        return if rollout_environment.state.in?(::Cd::RolloutEnvironment::TERMINAL_STATES)

        rollout_environment.update!(state: target_state)
      end

      def environment_name
        params.dig(:data, :environment)
      end

      def log_unmatched(environment_name)
        Gitlab::Cd::Logger.info(
          message: 'Unmatched CD rollout workflow event environment',
          rollout_id: rollout.id,
          rollout_environment_name: environment_name
        )
      end
    end
  end
end
