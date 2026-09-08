# frozen_string_literal: true

require 'find'

normalized = 0

normalize_file = lambda do |path|
  bytes = File.binread(path)
  next unless bytes.start_with?('#!')

  converted = bytes.gsub("\r\n", "\n")
  next if converted == bytes

  File.binwrite(path, converted)
  normalized += 1
end

ARGV.each do |root|
  next unless File.exist?(root)

  if File.file?(root)
    normalize_file.call(root) unless File.symlink?(root)
    next
  end

  Find.find(root) do |path|
    stat = File.lstat(path)
    if stat.symlink?
      Find.prune
      next
    end
    if stat.directory?
      Find.prune if File.basename(path) == 'node_modules'
      next
    end
    normalize_file.call(path) if stat.file?
  end
end

puts "Normalized CRLF shebang files: #{normalized}"
