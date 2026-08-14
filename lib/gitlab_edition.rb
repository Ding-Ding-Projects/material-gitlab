# frozen_string_literal: true

require 'pathname'

module GitlabEdition
  def self.root
    Pathname.new(File.expand_path('..', __dir__))
  end

  def self.path_glob(path)
    "#{root}/#{extension_path_prefixes}#{path}"
  end

  def self.extension_path_prefixes
    path_prefixes = extensions
    return '' if path_prefixes.empty?

    path_prefixes.map! { "#{_1}/" }
    path_prefixes.unshift ''

    # For example `{,ee/,jh/}`
    "{#{path_prefixes.join(',')}}"
  end

  def self.extensions
    if jh?
      %w[ee jh]
    elsif ee?
      %w[ee]
    else
      %w[]
    end
  end

  # Return the active product edition without changing the existing CE/EE/JH
  # predicates or the extension path selection above. Consumers that only
  # support CE and EE should treat :jh as the EE-compatible side of the
  # shared surface and continue to use `ee?` for feature decisions.
  def self.edition
    return :jh if jh?
    return :ee if ee?

    :ce
  end

  def self.ee?
    # To reduce dependencies in QA image we are not using
    # `Gitlab::Utils::StrongMemoize` but reimplementing its functionality.
    return @is_ee if defined?(@is_ee)

    @is_ee =
      # We use this method when the Rails environment is not loaded. This
      # means that checking the presence of the License class could result in
      # this method returning `false`, even for an EE installation.
      #
      # The `FOSS_ONLY` is always `string` or `nil`
      # Thus the nil or empty string will result
      # in using default value: false
      #
      # The behavior needs to be synchronised with
      # config/helpers/is_ee_env.js
      root.join('ee/app/models/license.rb').exist? &&
      !%w[true 1].include?(ENV['FOSS_ONLY'].to_s) # rubocop:disable Rails/NegateInclude
  end

  def self.jh?
    return @is_jh if defined?(@is_jh)

    @is_jh =
      ee? &&
      root.join('jh').exist? &&
      !%w[true 1].include?(ENV['EE_ONLY'].to_s) # rubocop:disable Rails/NegateInclude
  end

  def self.ee
    yield if ee?
  end

  def self.jh
    yield if jh?
  end
end
