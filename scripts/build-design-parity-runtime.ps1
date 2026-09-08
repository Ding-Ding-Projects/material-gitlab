[CmdletBinding()]
param(
  [Parameter(Mandatory)][ValidateNotNullOrEmpty()][string]$Commit,
  [Parameter(Mandatory)][ValidateNotNullOrEmpty()][string]$OutputRoot,
  [ValidateRange(1, 86400)][int]$TimeoutSeconds = 3600,
  [string]$Builder,
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
  param([Parameter(Mandatory)][string]$SourceSha)
  $recipeFiles = @('qa/gdk/Dockerfile.gdk', 'qa/gdk/Dockerfile.gdk.dockerignore', 'qa/gdk/gdk.yml', 'qa/gdk/entrypoint', 'qa/gdk/pre-receive')
  $entries = foreach ($relativePath in $recipeFiles) {
    $blobSha = Invoke-Native git @('rev-parse', '--verify', "${SourceSha}:$relativePath")
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

function Start-LoggedProcess {
  param([string]$FileName, [string[]]$Arguments, [string]$LogPath, [switch]$RedirectInput, [switch]$BinaryOutput)
  $info = [Diagnostics.ProcessStartInfo]::new()
  $info.FileName = $FileName
  $info.UseShellExecute = $false
  $info.RedirectStandardInput = $RedirectInput
  $info.RedirectStandardOutput = $true
  $info.RedirectStandardError = $true
  foreach ($argument in $Arguments) { [void]$info.ArgumentList.Add($argument) }
  $process = [Diagnostics.Process]::Start($info)
  $writer = [IO.StreamWriter]::new($LogPath, $false, [Text.UTF8Encoding]::new($false))
  $handler = [DataReceivedEventHandler]{ param($sender, $event); if ($null -ne $event.Data) { $writer.WriteLine($event.Data); $writer.Flush() } }
  if (-not $BinaryOutput) { $process.add_OutputDataReceived($handler); $process.BeginOutputReadLine() }
  $process.add_ErrorDataReceived($handler); $process.BeginErrorReadLine()
  [pscustomobject]@{ Process = $process; Writer = $writer }
}

$repositoryRoot = Invoke-Native git @('rev-parse', '--show-toplevel')
$sourceSha = Invoke-Native git @('rev-parse', '--verify', "$Commit^{commit}")
if ($sourceSha -notmatch '^[0-9a-f]{40}$') { throw "Commit did not resolve to a full commit SHA: $Commit" }
$safeOutputRoot = Assert-SafeOutputRoot -RequestedPath $OutputRoot -RepositoryRoot $repositoryRoot
$tag = "material-gitlab-parity:$sourceSha"
$candidateRoot = Join-Path $safeOutputRoot $sourceSha
$archivePath = Join-Path $candidateRoot 'source.tar'
$receiptPath = Join-Path $candidateRoot 'receipt.json'
$recipeHash = Get-RecipeHash -SourceSha $sourceSha
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
$archive = $null; $docker = $null
try {
  $archive = Start-LoggedProcess git @('archive', '--format=tar', $sourceSha) (Join-Path $candidateRoot 'git-archive.log') -BinaryOutput
  $docker = Start-LoggedProcess docker $dockerArguments (Join-Path $candidateRoot 'docker-build.log') -RedirectInput
  $archiveFile = [IO.File]::Open($archivePath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
  try {
    $cancellation = [Threading.CancellationTokenSource]::new([TimeSpan]::FromSeconds($TimeoutSeconds))
    $buffer = New-Object byte[] 131072
    while ($true) {
      $read = $archive.Process.StandardOutput.BaseStream.ReadAsync($buffer, 0, $buffer.Length, $cancellation.Token).GetAwaiter().GetResult()
      if ($read -eq 0) { break }
      $archiveFile.Write($buffer, 0, $read)
      $docker.Process.StandardInput.BaseStream.Write($buffer, 0, $read)
    }
  } finally {
    $archiveFile.Dispose()
  }
  $docker.Process.StandardInput.Close()
  $archive.Process.WaitForExit()
  if ($archive.Process.ExitCode -ne 0) { throw "git archive failed with exit code $($archive.Process.ExitCode). See $candidateRoot\git-archive.log" }
  $remaining = [Math]::Max(1, [int]($deadline - [DateTime]::UtcNow).TotalMilliseconds)
  if (-not $docker.Process.WaitForExit($remaining)) { throw "Docker build timed out after $TimeoutSeconds seconds." }
  if ($docker.Process.ExitCode -ne 0) { throw "Docker build failed with exit code $($docker.Process.ExitCode). See $candidateRoot\docker-build.log" }
  $imageId = Invoke-Native docker @('image', 'inspect', $tag, '--format', '{{.Id}}')
  $repoDigests = Invoke-Native docker @('image', 'inspect', $tag, '--format', '{{json .RepoDigests}}') | ConvertFrom-Json
  [pscustomobject]@{ sourceSha = $sourceSha; contextArchiveSha256 = Get-Sha256 $archivePath; buildRecipeSha256 = $recipeHash; imageTag = $tag; imageConfigId = $imageId; repoManifestDigests = @($repoDigests); dockerBuilder = $Builder; timeoutSeconds = $TimeoutSeconds; completedAtUtc = [DateTime]::UtcNow.ToString('o') } | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $receiptPath -Encoding utf8NoBOM
  Get-Content -LiteralPath $receiptPath
} catch {
  if ([DateTime]::UtcNow -ge $deadline) { Stop-OwnedProcessTree $archive.Process; Stop-OwnedProcessTree $docker.Process }
  throw
} finally {
  if ($null -ne $archive) { $archive.Writer.Dispose() }
  if ($null -ne $docker) { $docker.Writer.Dispose() }
}
