# frozen_string_literal: true

# Design parity fixture seed.
#
# Creates the isolated product data that the design-parity captures are taken against,
# through the product's own models and services, with fixed timestamps so repeated
# captures compare like for like. It refuses to run anywhere it was not explicitly
# pointed at:
#
#   DESIGN_PARITY_FIXTURE_INSTANCE=gdk         the development or test GDK instance
#   DESIGN_PARITY_FIXTURE_INSTANCE=lan-omnibus a dedicated Omnibus instance on a private
#                                              network, which additionally requires
#                                              DESIGN_PARITY_FIXTURE_HOST to equal the
#                                              configured GitLab host, and requires the
#                                              instance to be either empty of projects or
#                                              already carrying this fixture marker
#
# Run it through the instance's own Rails runner, for example:
#   docker exec -e DESIGN_PARITY_FIXTURE_INSTANCE=lan-omnibus \
#               -e DESIGN_PARITY_FIXTURE_HOST=<host> material-gitlab \
#               gitlab-rails runner /path/to/seed.rb
#
# It never creates users, never modifies instance settings, never reads or prints
# credentials, and never deletes data. Output is fixture identifiers and relative URLs.

require 'json'

FIXTURE_TIME = Time.utc(2024, 1, 15, 12, 0, 0).freeze
GROUP_PATH = 'design-parity-fixture'
PROJECT_PATH = 'product-verification'
MARKER = '[design-parity-fixture]'.freeze
DEFAULT_BRANCH = 'main'.freeze
SOURCE_BRANCH = 'fixture/design-parity'.freeze
RELEASE_TAG = 'v1.0.0-parity'.freeze
ENVIRONMENT_NAME = 'production'.freeze

instance_kind = ENV['DESIGN_PARITY_FIXTURE_INSTANCE']

case instance_kind
when 'gdk'
  unless %w[development test].include?(Rails.env)
    abort "Design parity fixture refuses Rails environment: #{Rails.env} for the gdk instance kind"
  end
when 'lan-omnibus'
  expected_host = ENV['DESIGN_PARITY_FIXTURE_HOST'].to_s
  actual_host = Gitlab.config.gitlab.host.to_s
  if expected_host.empty? || expected_host != actual_host
    abort "Design parity fixture refuses: DESIGN_PARITY_FIXTURE_HOST (#{expected_host.inspect}) " \
          "does not match the configured GitLab host (#{actual_host.inspect})."
  end
  existing_group = Group.find_by(path: GROUP_PATH)
  dedicated = Project.count.zero? || existing_group&.description.to_s.include?(MARKER)
  unless dedicated
    abort 'Design parity fixture refuses: this instance already holds projects and carries no ' \
          'fixture marker, so it is not a dedicated verification instance.'
  end
else
  abort 'Set DESIGN_PARITY_FIXTURE_INSTANCE=gdk for the isolated GDK instance, or ' \
        'DESIGN_PARITY_FIXTURE_INSTANCE=lan-omnibus with DESIGN_PARITY_FIXTURE_HOST for a ' \
        'dedicated private-network Omnibus instance.'
end

def assert_fixture!(record, type)
  return if record.description.to_s.include?(MARKER)

  abort "Refusing existing #{type} outside the designated fixture marker."
end

def fix_timestamp!(record)
  record.update_columns(created_at: FIXTURE_TIME, updated_at: FIXTURE_TIME)
end

# Service classes changed their return shape across GitLab versions: some return the
# record, some a ServiceResponse whose payload carries it. Accept both, honestly.
def unwrap_record(result, key)
  return result if result.nil?
  return result.payload[key] if result.respond_to?(:payload) && result.payload.is_a?(Hash) && result.payload.key?(key)
  return result.payload if result.respond_to?(:payload) && !result.payload.is_a?(Hash)

  result
end

user = User.admins.order(:id).first || abort('An admin user is required on the target instance.')
organization = user.organizations.order(:id).first || abort('The admin user must belong to an organization.')

group = Group.find_by(path: GROUP_PATH)
if group
  assert_fixture!(group, 'group')
else
  group = Group.new(
    name: 'Design Parity Fixture',
    path: GROUP_PATH,
    description: "#{MARKER} Isolated product verification data.",
    organization: organization
  )
  group.build_namespace_settings
  group.save!
  group.add_owner(user)
end
fix_timestamp!(group)

project = Project.find_by_full_path("#{GROUP_PATH}/#{PROJECT_PATH}")
if project
  assert_fixture!(project, 'project')
else
  project = Projects::CreateService.new(user, {
    name: 'Product Verification',
    path: PROJECT_PATH,
    description: "#{MARKER} Isolated product verification data.",
    namespace_id: group.id,
    organization_id: organization.id,
    visibility_level: Gitlab::VisibilityLevel::PUBLIC,
    default_branch: DEFAULT_BRANCH,
    initialize_with_readme: true
  }).execute
  abort "Project creation failed: #{project.errors.full_messages.join(', ')}" unless project.persisted?
end
fix_timestamp!(project)

unless project.repository.branch_exists?(SOURCE_BRANCH)
  branch = project.repository.add_branch(user, SOURCE_BRANCH, project.default_branch, raise_on_invalid_ref: true)
  abort 'Fixture source branch creation failed.' unless branch
end
unless project.repository.blob_at_branch(SOURCE_BRANCH, 'fixture.txt')
  project.repository.create_file(
    user,
    'fixture.txt',
    "Design parity fixture\n",
    branch_name: SOURCE_BRANCH,
    message: 'Create design parity fixture commit'
  )
end

# A pipeline definition on the default branch gives the Build, Pipelines and Deploy
# surfaces real rows. Without runners the jobs stay pending, which is the honest state of
# a verification instance and is captured as such.
CI_DEFINITION = <<~YAML
  stages:
    - build
    - test
    - deploy

  build-fixture:
    stage: build
    script:
      - echo "design parity fixture build"

  test-fixture:
    stage: test
    script:
      - echo "design parity fixture test"

  deploy-fixture:
    stage: deploy
    environment:
      name: #{ENVIRONMENT_NAME}
    script:
      - echo "design parity fixture deploy"
YAML

unless project.repository.blob_at_branch(project.default_branch, '.gitlab-ci.yml')
  project.repository.create_file(
    user,
    '.gitlab-ci.yml',
    CI_DEFINITION,
    branch_name: project.default_branch,
    message: 'Add design parity fixture pipeline definition'
  )
end

label = project.labels.find_by(title: 'design-parity') || Labels::CreateService.new(
  user,
  title: 'design-parity',
  color: '#1F75CB',
  description: 'Design parity fixture label'
).execute(project: project)
abort "Label creation failed: #{label&.errors&.full_messages&.join(', ')}" unless label&.persisted?
fix_timestamp!(label)

milestone = project.milestones.find_by(title: 'Design Parity Milestone') || Milestones::CreateService.new(
  project,
  user,
  title: 'Design Parity Milestone',
  description: 'Fixed isolated design parity milestone',
  due_date: Date.new(2024, 2, 1)
).execute
abort "Milestone creation failed: #{milestone&.errors&.full_messages&.join(', ')}" unless milestone&.persisted?
fix_timestamp!(milestone)

issue = project.issues.find_by(title: 'Design parity fixture issue')
unless issue
  issue_result = Issues::CreateService.new(
    container: project,
    current_user: user,
    params: {
      title: 'Design parity fixture issue',
      description: 'Fixed isolated issue for product verification.',
      milestone_id: milestone.id,
      label_ids: [label.id]
    },
    perform_spam_check: false
  ).execute
  abort "Issue creation failed: #{issue_result.message}" unless issue_result.success?
  issue = issue_result.payload.fetch(:issue)
end
fix_timestamp!(issue)

merge_request = project.merge_requests.find_by(source_branch: SOURCE_BRANCH, target_branch: project.default_branch)
unless merge_request
  merge_request = MergeRequests::CreateService.new(
    project: project,
    current_user: user,
    params: {
      source_branch: SOURCE_BRANCH,
      target_branch: project.default_branch,
      title: 'Design parity fixture merge request',
      description: 'Fixed isolated merge request for product verification.',
      milestone_id: milestone.id,
      label_ids: [label.id]
    }
  ).execute
  abort "Merge request creation failed: #{merge_request.errors.full_messages.join(', ')}" unless merge_request.persisted?
end
fix_timestamp!(merge_request)

pipeline = project.ci_pipelines.where(ref: project.default_branch).order(:id).first
unless pipeline
  pipeline_result = Ci::CreatePipelineService.new(project, user, ref: project.default_branch).execute(:push)
  pipeline = unwrap_record(pipeline_result, :pipeline)
  unless pipeline.is_a?(Ci::Pipeline) && pipeline.persisted?
    detail = pipeline_result.respond_to?(:message) ? pipeline_result.message : pipeline.inspect
    abort "Pipeline creation failed: #{detail}"
  end
end

release = project.releases.find_by(tag: RELEASE_TAG)
unless release
  release_result = Releases::CreateService.new(project, user, {
    tag: RELEASE_TAG,
    ref: project.default_branch,
    name: 'Design parity fixture release',
    description: 'Fixed isolated release for product verification.'
  }).execute
  release = unwrap_record(release_result, :release)
  release = project.releases.find_by(tag: RELEASE_TAG) unless release.is_a?(Release)
  abort "Release creation failed: #{release_result.inspect}" unless release&.persisted?
end
fix_timestamp!(release)

environment = project.environments.find_by(name: ENVIRONMENT_NAME)
unless environment
  environment_result = Environments::CreateService.new(project, user, name: ENVIRONMENT_NAME).execute
  environment = unwrap_record(environment_result, :environment)
  environment = project.environments.find_by(name: ENVIRONMENT_NAME) unless environment.is_a?(Environment)
  abort "Environment creation failed: #{environment_result.inspect}" unless environment&.persisted?
end
fix_timestamp!(environment)

todo_count_before = user.todos.count
TodoService.new.mark_todo(issue, user) unless user.todos.exists?(target: issue)
todo_count_after = user.todos.count

epic_note = 'epics are not available on this instance (paid tier), no epic was created'
if group.respond_to?(:epics) && defined?(Epics::CreateService) && group.licensed_feature_available?(:epics)
  epic = group.epics.find_by(title: 'Design parity fixture epic')
  unless epic
    epic_result = Epics::CreateService.new(group: group, current_user: user, params: {
      title: 'Design parity fixture epic',
      description: 'Fixed isolated epic for product verification.'
    }).execute
    epic = unwrap_record(epic_result, :epic)
  end
  if epic.respond_to?(:persisted?) && epic.persisted?
    fix_timestamp!(epic)
    epic_note = "/groups/#{group.full_path}/-/epics/#{epic.iid}"
  end
end

puts JSON.generate(
  instance_kind: instance_kind,
  group_id: group.id,
  group_url: "/#{group.full_path}",
  project_id: project.id,
  project_url: "/#{project.full_path}",
  issue_id: issue.id,
  issue_url: "/#{project.full_path}/-/issues/#{issue.iid}",
  milestone_id: milestone.id,
  merge_request_id: merge_request.id,
  merge_request_url: "/#{project.full_path}/-/merge_requests/#{merge_request.iid}",
  pipeline_id: pipeline.id,
  pipeline_url: "/#{project.full_path}/-/pipelines/#{pipeline.id}",
  release_url: "/#{project.full_path}/-/releases/#{RELEASE_TAG}",
  environment_url: "/#{project.full_path}/-/environments/#{environment.id}",
  todos_added: todo_count_after - todo_count_before,
  epic: epic_note
)
