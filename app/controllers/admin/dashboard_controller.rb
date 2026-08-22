# frozen_string_literal: true

class Admin::DashboardController < Admin::ApplicationController
  include CountHelper

  helper Admin::ComponentsHelper

  COUNTED_ITEMS = [Project, User, Group].freeze

  feature_category :not_owned # rubocop:todo Gitlab/AvoidFeatureCategoryNotOwned

  authorize! :access_admin_area, only: [:index, :stats]

  def index
    @counts = Gitlab::Database::Count.approximate_counts(COUNTED_ITEMS)
    @projects = Project.order_id_desc.without_deleted.with_route.limit(10)
    @users = User.order_id_desc.limit(10)
    @groups = Group.order_id_desc.with_route.limit(10)
    @notices = Gitlab::ConfigChecker::ExternalDatabaseChecker.check
    @kas_server_info = Gitlab::Kas::ServerInfo.new.present if Gitlab::Kas.enabled?
    @redis_versions = Gitlab::Redis::ALL_CLASSES.select(&:active?).map(&:version).uniq
    @material_admin_data = material_admin_data
  end

  def actions
    return render json: { error: _('Administrator permissions are required.') }, status: :forbidden unless current_user.can_admin_all_resources?

    tab = params.require(:tab)
    action = params.require(:action)
    ids = Array(params[:ids]).map(&:to_s).first(100)

    case tab
    when 'Users'
      ids.each do |id|
        user = User.find_by(id: id)
        next unless user

        service = action == 'block' ? Users::BlockService : Users::UnblockService
        result = service.new(current_user).execute(user)
        return render json: { error: _('The user action was not completed.') }, status: :unprocessable_entity if result.respond_to?(:success?) && !result.success?
      end
    when 'Projects'
      ids.each do |id|
        project = Project.find_by(id: id)
        next unless project
        return render json: { error: _('You do not have permission to change this project.') }, status: :forbidden unless can?(current_user, :admin_project, project)

        case action
        when 'archive' then Projects::ArchiveService.new(project: project, current_user: current_user).execute
        when 'unarchive' then Projects::UnarchiveService.new(project: project, current_user: current_user).execute
        when 'remove' then Projects::DestroyService.new(project, current_user, {}).async_execute
        else return render json: { error: _('The requested project action is not supported.') }, status: :unprocessable_entity
        end
      end
    else
      return render json: { error: _('The requested administrator action is not supported.') }, status: :unprocessable_entity
    end

    render json: { ok: true, data: material_admin_data }
  end

  def stats
    @users_statistics = UsersStatistics.latest
  end

  private

  def material_admin_data
    {
      users: (@users || User.order_id_desc.limit(10)).map { |user| { id: user.id.to_s, name: user.name, sub: "@#{user.username} · #{user.email}", role: user.admin? ? 'Admin' : 'Regular', blocked: user.blocked? } },
      runners: Ci::Runner.order(id: :desc).limit(50).map { |runner| { id: runner.id.to_s, name: runner.name.presence || "runner-#{runner.id}", sub: runner.runner_type.to_s, status: runner.active? ? 'online' : 'paused', jobs: '—' } },
      projects: (@projects || Project.order_id_desc.without_deleted.with_route.limit(10)).map { |project| { id: project.id.to_s, name: project.full_path, sub: project.visibility, when: project.created_at.iso8601, archived: project.archived? } },
    }
  end

end

Admin::DashboardController.prepend_mod_with('Admin::DashboardController')
