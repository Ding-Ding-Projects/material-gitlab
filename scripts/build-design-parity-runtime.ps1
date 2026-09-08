[CmdletBinding()]
param(
  [Parameter(Mandatory)][ValidateNotNullOrEmpty()][string]$Commit,
  [Parameter(Mandatory)][ValidateNotNullOrEmpty()][string]$OutputRoot,
  [ValidateRange(1, 86400)][int]$TimeoutSeconds = 3600,
  [string]$Builder,
  [string]$GitExecutable = 'git',
  [string]$DockerExecutable = 'docker',
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Invoke-Native {
  param([Parameter(Mandatory)][string]$FilePath, [Parameter(Mandatory)][string[]]$Arguments)
  $result = & $FilePath @Arguments 2>&1
  if ($LASTEXITCODE -ne 0) { throw "Native command failed with exit code ${LASTEXITCODE}: $FilePath $($Arguments -join ' ')`n$result" }
  return ($result | Out-String).Trim()
}

function Get-Sha256 {
  param([Parameter(Mandatory)][string]$Path)
  (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Get-RecipeHash {
  param([Parameter(Mandatory)][string]$SourceSha, [Parameter(Mandatory)][string]$GitCommand)
  $recipeFiles = @('qa/gdk/Dockerfile.gdk', 'qa/gdk/Dockerfile.gdk.dockerignore', 'qa/gdk/.tool-versions', 'qa/gdk/gdk.yml', 'qa/gdk/normalize-executable-shebangs.sh', 'qa/gdk/entrypoint', 'qa/gdk/pre-receive')
  $entries = foreach ($relativePath in $recipeFiles) {
    $blobSha = Invoke-Native $GitCommand @('rev-parse', '--verify', "${SourceSha}:$relativePath")
    if ($blobSha -notmatch '^[0-9a-f]{40}$') { throw "Required GDK recipe file is missing from $SourceSha`: $relativePath" }
    "{0} {1}" -f $relativePath.Replace('\\', '/'), $blobSha
  }
  $bytes = [Text.Encoding]::UTF8.GetBytes(($entries -join "`n") + "`n")
  ([Security.Cryptography.SHA256]::Create().ComputeHash($bytes) | ForEach-Object { $_.ToString('x2') }) -join ''
}

function Test-IsDescendantOrSame {
  param([string]$Path, [string]$Parent)
  $trimmedPath = $Path.TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
  $trimmedParent = $Parent.TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
  $trimmedPath -eq $trimmedParent -or $trimmedPath.StartsWith($trimmedParent + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)
}

function Assert-SafeOutputRoot {
  param([Parameter(Mandatory)][string]$RequestedPath, [Parameter(Mandatory)][string]$RepositoryRoot)
  $fullPath = [IO.Path]::GetFullPath($RequestedPath)
  $root = [IO.Path]::GetPathRoot($fullPath)
  if ((Test-IsDescendantOrSame $fullPath $root) -and (Test-IsDescendantOrSame $root $fullPath)) { throw 'OutputRoot must be a task-owned directory, not a filesystem root.' }
  $repositoryPath = [IO.Path]::GetFullPath($RepositoryRoot)
  if ((Test-IsDescendantOrSame $fullPath $repositoryPath) -or (Test-IsDescendantOrSame $repositoryPath $fullPath)) { throw 'OutputRoot must neither contain nor sit inside the source repository.' }
  $cursor = [IO.DirectoryInfo]::new($fullPath)
  while ($null -ne $cursor) {
    if ($cursor.Exists -and (($cursor.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0)) { throw "OutputRoot traverses a reparse point and is not safe: $($cursor.FullName)" }
    $cursor = $cursor.Parent
  }
  if (Test-Path -LiteralPath (Join-Path $fullPath '.git')) { throw 'OutputRoot must not be a Git checkout.' }
  $fullPath
}

function Stop-OwnedProcessTree {
  param([Diagnostics.Process]$Process)
  if ($null -ne $Process -and -not $Process.HasExited) { & taskkill /PID $Process.Id /T /F *> $null }
}

function Start-RedirectedProcess {
  param([string]$FileName, [string[]]$Arguments, [switch]$RedirectInput)
  $info = [Diagnostics.ProcessStartInfo]::new()
  $info.FileName = $FileName
  $info.UseShellExecute = $false
  $info.RedirectStandardInput = $RedirectInput
  $info.RedirectStandardOutput = $true
  $info.RedirectStandardError = $true
  foreach ($argument in $Arguments) { [void]$info.ArgumentList.Add($argument) }
  $process = [Diagnostics.Process]::Start($info)
  $process
}

$repositoryRoot = Invoke-Native $GitExecutable @('rev-parse', '--show-toplevel')
$sourceSha = Invoke-Native $GitExecutable @('rev-parse', '--verify', "$Commit^{commit}")
if ($sourceSha -notmatch '^[0-9a-f]{40}$') { throw "Commit did not resolve to a full commit SHA: $Commit" }
$safeOutputRoot = Assert-SafeOutputRoot -RequestedPath $OutputRoot -RepositoryRoot $repositoryRoot
$tag = "material-gitlab-parity:$sourceSha"
$candidateRoot = Join-Path $safeOutputRoot $sourceSha
$archivePath = Join-Path $candidateRoot 'source.tar'
$receiptPath = Join-Path $candidateRoot 'receipt.json'
$recipeHash = Get-RecipeHash -SourceSha $sourceSha -GitCommand $GitExecutable
$dockerArguments = @('buildx', 'build', '--load', '--platform', 'linux/amd64')
if ($Builder) { $dockerArguments += @('--builder', $Builder) }
$dockerArguments += @('--file', 'qa/gdk/Dockerfile.gdk', '--tag', $tag, '--build-arg', 'RAILS_ENV=test', '--build-arg', 'NODE_ENV=production', '--build-arg', 'BABEL_ENV=production', '--build-arg', 'NODE_OPTIONS=--max-old-space-size=10240', '--build-arg', 'GLCI_GITLAB_ASSETS_HASH_FILE=/nonexistent/gitlab-assets-hash', '-')

if (Test-Path -LiteralPath $candidateRoot) { throw "Candidate output already exists and will not be replaced: $candidateRoot" }
if ($DryRun) {
  [pscustomobject]@{ sourceSha = $sourceSha; outputRoot = $safeOutputRoot; candidateRoot = $candidateRoot; recipeHash = $recipeHash; tag = $tag; timeoutSeconds = $TimeoutSeconds; builder = $Builder; dockerArguments = $dockerArguments } | ConvertTo-Json -Depth 4
  exit 0
}

New-Item -ItemType Directory -Path $candidateRoot -Force | Out-Null
$deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
$archive = $null; $docker = $null; $archiveFile = $null; $archiveErrorFile = $null; $dockerOutputFile = $null; $dockerErrorFile = $null
try {
  $archive = Start-RedirectedProcess $GitExecutable @('archive', '--format=tar', $sourceSha)
  $docker = Start-RedirectedProcess $DockerExecutable $dockerArguments -RedirectInput
  $archiveFile = [IO.File]::Open($archivePath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
  $archiveErrorFile = [IO.File]::Open((Join-Path $candidateRoot 'git-archive.log'), [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
  $dockerOutputFile = [IO.File]::Open((Join-Path $candidateRoot 'docker-build.log'), [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
  $dockerErrorFile = [IO.File]::Open((Join-Path $candidateRoot 'docker-build.stderr.log'), [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
  $archiveErrorCopy = $archive.StandardError.BaseStream.CopyToAsync($archiveErrorFile)
  $dockerOutputCopy = $docker.StandardOutput.BaseStream.CopyToAsync($dockerOutputFile)
  $dockerErrorCopy = $docker.StandardError.BaseStream.CopyToAsync($dockerErrorFile)
  try {
    $cancellation = [Threading.CancellationTokenSource]::new([TimeSpan]::FromSeconds($TimeoutSeconds))
    [byte[]]$buffer = [byte[]]::new(131072)
    while ($true) {
      $read = $archive.StandardOutput.BaseStream.ReadAsync($buffer, 0, $buffer.Length, $cancellation.Token).GetAwaiter().GetResult()
      if ($read -eq 0) { break }
      $archiveFile.Write($buffer, 0, $read)
      [void]$docker.StandardInput.BaseStream.WriteAsync($buffer, 0, $read, $cancellation.Token).GetAwaiter().GetResult()
    }
  } finally {
    $archiveFile.Dispose()
  }
  $docker.StandardInput.Close()
  $remaining = [Math]::Max(1, [int]($deadline - [DateTime]::UtcNow).TotalMilliseconds)
  if (-not $archive.WaitForExit($remaining)) { throw "git archive timed out after $TimeoutSeconds seconds." }
  if ($archive.ExitCode -ne 0) { throw "git archive failed with exit code $($archive.ExitCode). See $candidateRoot\git-archive.log" }
  $remaining = [Math]::Max(1, [int]($deadline - [DateTime]::UtcNow).TotalMilliseconds)
  if (-not $docker.WaitForExit($remaining)) { throw "Docker build timed out after $TimeoutSeconds seconds." }
  [void]$archiveErrorCopy.GetAwaiter().GetResult(); [void]$dockerOutputCopy.GetAwaiter().GetResult(); [void]$dockerErrorCopy.GetAwaiter().GetResult()
  if ($docker.ExitCode -ne 0) { throw "Docker build failed with exit code $($docker.ExitCode). See $candidateRoot\docker-build.log" }
  $imageId = Invoke-Native $DockerExecutable @('image', 'inspect', $tag, '--format', '{{.Id}}')
  $repoDigests = Invoke-Native $DockerExecutable @('image', 'inspect', $tag, '--format', '{{json .RepoDigests}}') | ConvertFrom-Json
  [pscustomobject]@{ sourceSha = $sourceSha; contextArchiveSha256 = Get-Sha256 $archivePath; buildRecipeSha256 = $recipeHash; imageTag = $tag; imageConfigId = $imageId; repoManifestDigests = @($repoDigests); dockerBuilder = $Builder; timeoutSeconds = $TimeoutSeconds; completedAtUtc = [DateTime]::UtcNow.ToString('o') } | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $receiptPath -Encoding utf8NoBOM
  Get-Content -LiteralPath $receiptPath
} catch {
  Stop-OwnedProcessTree $archive
  Stop-OwnedProcessTree $docker
  throw
} finally {
  foreach ($stream in @($archiveFile, $archiveErrorFile, $dockerOutputFile, $dockerErrorFile)) { if ($null -ne $stream) { $stream.Dispose() } }
}
