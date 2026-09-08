# frozen_string_literal: true

require 'json'

unless %w[development test].include?(Rails.env)
  abort "Design parity fixture refuses Rails environment: #{Rails.env}"
end

unless ENV['DESIGN_PARITY_FIXTURE_INSTANCE'] == 'gdk'
  abort 'Set DESIGN_PARITY_FIXTURE_INSTANCE=gdk for the isolated GDK instance.'
end

FIXTURE_TIME = Time.utc(2024, 1, 15, 12, 0, 0).freeze
GROUP_PATH = 'design-parity-fixture'
PROJECT_PATH = 'product-verification'
MARKER = '[design-parity-fixture]'.freeze
DEFAULT_BRANCH = 'main'.freeze
SOURCE_BRANCH = 'fixture/design-parity'.freeze

def assert_fixture!(record, type)
  return if record.description.to_s.include?(MARKER)

  abort "Refusing existing #{type} outside the designated fixture marker."
end

def fix_timestamp!(record)
  record.update_columns(created_at: FIXTURE_TIME, updated_at: FIXTURE_TIME)
end

user = User.admins.order(:id).first || abort('An isolated GDK admin user is required.')
organization = user.organizations.order(:id).first || abort('The GDK admin user must belong to an organization.')

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

puts JSON.generate(
  group_id: group.id,
  group_url: "/#{group.full_path}",
  project_id: project.id,
  project_url: "/#{project.full_path}",
  issue_id: issue.id,
  issue_url: "/#{project.full_path}/-/issues/#{issue.iid}",
  milestone_id: milestone.id,
  merge_request_id: merge_request.id,
  merge_request_url: "/#{project.full_path}/-/merge_requests/#{merge_request.iid}"
)
