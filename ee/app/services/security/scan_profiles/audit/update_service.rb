# frozen_string_literal: true

module Security
  module ScanProfiles
    module Audit
      class UpdateService
        AUDIT_EVENT_NAME = 'security_scan_profile_update'
        MAX_AUDITED_VALUE_LENGTH = 255

        def initialize(profile:, current_user:, old_snapshot:, new_snapshot:)
          @profile = profile
          @current_user = current_user
          @old = properties(old_snapshot)
          @new = properties(new_snapshot)
        end

        def execute
          return if current_user.blank?

          changes.each { |change| audit(change) }
        end

        private

        attr_reader :profile, :current_user, :old, :new

        def changes
          (old.keys | new.keys).filter_map do |property|
            from = old[property]
            to = new[property]
            next if from == to

            if from.is_a?(Array) || to.is_a?(Array)
              added = truncate_each(Array(to) - Array(from))
              removed = truncate_each(Array(from) - Array(to))
              next if added.empty? && removed.empty?

              { change: property, added: added, removed: removed }
            else
              { change: property, from: truncate(from), to: truncate(to) }
            end
          end
        end

        def truncate(value)
          value.is_a?(String) ? value.truncate(MAX_AUDITED_VALUE_LENGTH) : value
        end

        def truncate_each(values)
          values.map { |value| truncate(value) }
        end

        def audit(change)
          ::Gitlab::Audit::Auditor.audit(
            name: AUDIT_EVENT_NAME,
            author: current_user,
            scope: profile.namespace,
            target: profile,
            message: message_for(change),
            additional_details: change.merge(profile_id: profile.id, scan_type: profile.scan_type)
          )
        end

        def message_for(change)
          property = change[:change]

          if change.key?(:added)
            [("Added #{change[:added].join(', ')} to #{property}" if change[:added].any?),
              ("Removed #{change[:removed].join(', ')} from #{property}" if change[:removed].any?)].compact.join('; ')
          elsif change[:from].nil?
            "Set #{property} to #{change[:to]}"
          elsif change[:to].nil?
            "Removed #{property} (was #{change[:from]})"
          else
            "Changed #{property} from #{change[:from]} to #{change[:to]}"
          end
        end

        def properties(snapshot)
          flat = { 'name' => snapshot[:name], 'description' => snapshot[:description] }

          (snapshot[:triggers] || {}).each do |trigger_type, config|
            flat["trigger #{trigger_type}"] = 'enabled'
            flatten(config).each { |key, value| flat["trigger #{trigger_type} #{key}"] = value }
          end

          flat
        end

        def flatten(hash, prefix = nil)
          (hash || {}).each_with_object({}) do |(key, value), result|
            path = [prefix, key].compact.join('.')
            value.is_a?(Hash) ? result.merge!(flatten(value, path)) : result[path] = value
          end
        end
      end
    end
  end
end
