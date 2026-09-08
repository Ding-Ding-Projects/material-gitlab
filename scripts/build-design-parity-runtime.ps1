[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [ValidateNotNullOrEmpty()]
  [string]$Commit,

  [Parameter(Mandatory)]
  [ValidateNotNullOrEmpty()]
  [string]$OutputRoot,

  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Invoke-Native {
  param(
    [Parameter(Mandatory)][string]$FilePath,
    [Parameter(Mandatory)][string[]]$Arguments,
    [switch]$CaptureOutput
  )

  if ($CaptureOutput) {
    $result = & $FilePath @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
      throw "Native command failed with exit code ${LASTEXITCODE}: $FilePath $($Arguments -join ' ')`n$result"
    }
    return ($result | Out-String).Trim()
  }

  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Native command failed with exit code ${LASTEXITCODE}: $FilePath $($Arguments -join ' ')"
  }
}

function Get-Sha256 {
  param([Parameter(Mandatory)][string]$Path)
  return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Get-RecipeHash {
  param([Parameter(Mandatory)][string]$SourceSha)

  $recipeFiles = @(
    'qa/gdk/Dockerfile.gdk',
    'qa/gdk/Dockerfile.gdk.dockerignore',
    'qa/gdk/gdk.yml',
    'qa/gdk/entrypoint',
    'qa/gdk/pre-receive'
  )
  $entries = foreach ($relativePath in $recipeFiles) {
    $blobSha = Invoke-Native -FilePath git -Arguments @('rev-parse', '--verify', "${SourceSha}:$relativePath") -CaptureOutput
    if ($blobSha -notmatch '^[0-9a-f]{40}$') { throw "Required GDK recipe file is missing from $SourceSha`: $relativePath" }
    "{0} {1}" -f $relativePath.Replace('\\', '/'), $blobSha
  }
  $bytes = [Text.Encoding]::UTF8.GetBytes(($entries -join "`n") + "`n")
  return ([Security.Cryptography.SHA256]::Create().ComputeHash($bytes) | ForEach-Object { $_.ToString('x2') }) -join ''
}

function Assert-SafeOutputRoot {
  param(
    [Parameter(Mandatory)][string]$RequestedPath,
    [Parameter(Mandatory)][string]$RepositoryRoot
  )

  $fullPath = [IO.Path]::GetFullPath($RequestedPath)
  $root = [IO.Path]::GetPathRoot($fullPath)
  if ($fullPath.TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar) -eq $root.TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)) {
    throw 'OutputRoot must be a task-owned directory, not a filesystem root.'
  }

  $repositoryPath = [IO.Path]::GetFullPath($RepositoryRoot).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
  $candidatePath = $fullPath.TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
  if ($candidatePath -eq $repositoryPath -or $candidatePath.StartsWith($repositoryPath + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'OutputRoot must be outside the repository so a build cannot write into the source checkout.'
  }
  if (Test-Path -LiteralPath (Join-Path $fullPath '.git')) {
    throw 'OutputRoot must not be a Git checkout.'
  }
  return $fullPath
}

$repositoryRoot = Invoke-Native -FilePath git -Arguments @('rev-parse', '--show-toplevel') -CaptureOutput
$sourceSha = Invoke-Native -FilePath git -Arguments @('rev-parse', '--verify', "$Commit^{commit}") -CaptureOutput
if ($sourceSha -notmatch '^[0-9a-f]{40}$') {
  throw "Commit did not resolve to a full commit SHA: $Commit"
}

$safeOutputRoot = Assert-SafeOutputRoot -RequestedPath $OutputRoot -RepositoryRoot $repositoryRoot
$tag = "material-gitlab-parity:$sourceSha"
$candidateRoot = Join-Path $safeOutputRoot $sourceSha
$contextDirectory = Join-Path $candidateRoot 'context'
$archivePath = Join-Path $candidateRoot 'source.tar'
$receiptPath = Join-Path $candidateRoot 'receipt.json'
$recipeHash = Get-RecipeHash -SourceSha $sourceSha

$dockerArguments = @(
  'buildx', 'build', '--load', '--platform', 'linux/amd64',
  '--file', 'qa/gdk/Dockerfile.gdk', '--tag', $tag,
  '--build-arg', 'RAILS_ENV=test',
  '--build-arg', 'NODE_ENV=production',
  '--build-arg', 'BABEL_ENV=production',
  '--build-arg', 'NODE_OPTIONS=--max-old-space-size=10240',
  '--build-arg', 'GLCI_GITLAB_ASSETS_HASH_FILE=/nonexistent/gitlab-assets-hash',
  $contextDirectory
)

if ($DryRun) {
  [pscustomobject]@{
    sourceSha = $sourceSha
    outputRoot = $safeOutputRoot
    candidateRoot = $candidateRoot
    contextDirectory = $contextDirectory
    recipeHash = $recipeHash
    tag = $tag
    dockerArguments = $dockerArguments
  } | ConvertTo-Json -Depth 4
  exit 0
}

if (Test-Path -LiteralPath $candidateRoot) {
  throw "Candidate output already exists and will not be replaced: $candidateRoot"
}

New-Item -ItemType Directory -Path $candidateRoot -Force | Out-Null
try {
  $archiveStream = [IO.File]::Open($archivePath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
  try {
    $processInfo = [Diagnostics.ProcessStartInfo]::new()
    $processInfo.FileName = 'git'
    $processInfo.UseShellExecute = $false
    $processInfo.RedirectStandardOutput = $true
    $processInfo.RedirectStandardError = $true
    foreach ($argument in @('archive', '--format=tar', $sourceSha)) { [void]$processInfo.ArgumentList.Add($argument) }
    $process = [Diagnostics.Process]::Start($processInfo)
    $process.StandardOutput.BaseStream.CopyTo($archiveStream)
    $standardError = $process.StandardError.ReadToEnd()
    $process.WaitForExit()
    if ($process.ExitCode -ne 0) { throw "git archive failed with exit code $($process.ExitCode): $standardError" }
  } finally {
    $archiveStream.Dispose()
  }

  New-Item -ItemType Directory -Path $contextDirectory -Force | Out-Null
  Invoke-Native -FilePath tar -Arguments @('-xf', $archivePath, '-C', $contextDirectory)
  if (-not (Test-Path -LiteralPath (Join-Path $contextDirectory 'qa/gdk/Dockerfile.gdk') -PathType Leaf)) {
    throw 'Archived candidate context does not contain qa/gdk/Dockerfile.gdk.'
  }

  Push-Location $contextDirectory
  try { Invoke-Native -FilePath docker -Arguments $dockerArguments } finally { Pop-Location }

  $imageId = Invoke-Native -FilePath docker -Arguments @('image', 'inspect', $tag, '--format', '{{.Id}}') -CaptureOutput
  $repoDigests = Invoke-Native -FilePath docker -Arguments @('image', 'inspect', $tag, '--format', '{{json .RepoDigests}}') -CaptureOutput | ConvertFrom-Json
  [pscustomobject]@{
    sourceSha = $sourceSha
    contextArchiveSha256 = Get-Sha256 -Path $archivePath
    buildRecipeSha256 = $recipeHash
    imageTag = $tag
    imageId = $imageId
    imageDigest = $imageId
    repoDigests = @($repoDigests)
    contextDirectory = $contextDirectory
    completedAtUtc = [DateTime]::UtcNow.ToString('o')
  } | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $receiptPath -Encoding utf8NoBOM
  Get-Content -LiteralPath $receiptPath
} catch {
  throw
}
