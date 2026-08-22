# frozen_string_literal: true

class AgentMemoryController < ApplicationController
  before_action :authenticate_user!

  MAX_RECORDS = 100

  def index
    render :index
  end

  def data
    render json: agent_memory_data
  end

  private

  def agent_memory_data
    {
      user: {
        id: current_user.id,
        username: current_user.username,
        admin: current_user.admin?,
      },
      # Agent Memory records are intentionally empty until a local memory
      # provider is configured. Returning an explicit bounded empty state is
      # safer than presenting design fixtures or exposing host instructions.
      targets: [],
      blocks: [],
      skills: [],
      sessions: [],
      history: [],
      syncSteps: [],
      limits: { maxRecords: MAX_RECORDS },
    }
  end
end
