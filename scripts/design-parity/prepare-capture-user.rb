# frozen_string_literal: true

# Prepare the admin user of a dedicated verification instance for deterministic captures.
#
# Sets the colour mode to follow the system, so a capture tuple can select light or dark
# through browser emulation of prefers-color-scheme without changing stored preferences
# between tuples, and turns off the first-visit prompts that would otherwise sit on top of
# the surface being captured. It refuses every instance kind the fixture seed refuses, uses
# the same markers, and prints only the fields it changed.
#
#   docker exec -e DESIGN_PARITY_FIXTURE_INSTANCE=lan-omnibus \
#               -e DESIGN_PARITY_FIXTURE_HOST=<host> material-gitlab \
#               gitlab-rails runner /path/to/prepare-capture-user.rb

require 'json'

instance_kind = ENV['DESIGN_PARITY_FIXTURE_INSTANCE']
case instance_kind
when 'gdk'
  abort "refuses Rails environment #{Rails.env} for gdk" unless %w[development test].include?(Rails.env)
when 'lan-omnibus'
  expected_host = ENV['DESIGN_PARITY_FIXTURE_HOST'].to_s
  actual_host = Gitlab.config.gitlab.host.to_s
  abort "refuses: DESIGN_PARITY_FIXTURE_HOST #{expected_host.inspect} != #{actual_host.inspect}" if expected_host.empty? || expected_host != actual_host
else
  abort 'Set DESIGN_PARITY_FIXTURE_INSTANCE=gdk or lan-omnibus (with DESIGN_PARITY_FIXTURE_HOST).'
end

user = User.admins.order(:id).first || abort('An admin user is required on the target instance.')
changes = {}

system_mode_id =
  if defined?(Gitlab::ColorModes) && Gitlab::ColorModes.respond_to?(:by_id)
    (Gitlab::ColorModes.available_modes.find { |mode| mode.name.to_s.downcase.include?('system') || mode.css_class.to_s.include?('system') }&.id rescue nil)
  end
system_mode_id ||= 3

if user.respond_to?(:color_mode_id) && user.color_mode_id != system_mode_id
  user.color_mode_id = system_mode_id
  changes[:color_mode_id] = system_mode_id
end

# First-visit prompts that would sit on top of a captured surface.
if user.respond_to?(:callouts)
  # Dismiss common in-app callouts by feature name where the model supports it; unknown
  # names are skipped rather than guessed.
  %w[gke_cluster_integration ultimate_trial gold_trial_billings profile_personal_access_token_expiry pipeline_needs_banner web_ide_alert_dismissed].each do |feature|
    next unless Users::Callout.feature_names.key?(feature)
    next if user.callouts.exists?(feature_name: feature)

    user.callouts.create!(feature_name: feature, dismissed_at: Time.current)
    (changes[:dismissed_callouts] ||= []) << feature
  end
end

user.save! if user.changed?

puts JSON.generate(instance_kind: instance_kind, user_id: user.id, changes: changes)
