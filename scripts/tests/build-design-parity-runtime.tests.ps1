$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repositoryRoot = (git rev-parse --show-toplevel).Trim()
$helper = Join-Path $repositoryRoot 'scripts/build-design-parity-runtime.ps1'
$commit = (git rev-parse HEAD).Trim()
$taskOutput = Join-Path ([IO.Path]::GetTempPath()) ("material-gitlab-parity-test-" + [Guid]::NewGuid().ToString('N'))

try {
  $dryRun = & $helper -Commit $commit -OutputRoot $taskOutput -DryRun | ConvertFrom-Json
  if ($LASTEXITCODE -ne 0) { throw 'The helper dry run returned a non-zero exit code.' }
  if ($dryRun.sourceSha -ne $commit) { throw 'Dry run did not pin the requested commit.' }
  if ($dryRun.tag -ne "material-gitlab-parity:$commit") { throw 'Dry run emitted an unexpected local image tag.' }
  $arguments = @($dryRun.dockerArguments)
  foreach ($requiredArgument in @('--load', '--platform', 'linux/amd64', 'RAILS_ENV=test', 'NODE_ENV=production', 'BABEL_ENV=production', 'NODE_OPTIONS=--max-old-space-size=10240', 'GLCI_GITLAB_ASSETS_HASH_FILE=/nonexistent/gitlab-assets-hash')) {
    if ($arguments -notcontains $requiredArgument) { throw "Dry run omitted required Docker argument: $requiredArgument" }
  }
  if (Test-Path -LiteralPath $taskOutput) { throw 'Dry run must not create an output directory.' }

  $rejectedRepositoryOutput = $false
  try {
    & $helper -Commit $commit -OutputRoot $repositoryRoot -DryRun *> $null
  } catch {
    $rejectedRepositoryOutput = $true
  }
  if (-not $rejectedRepositoryOutput) { throw 'Dry run accepted the repository as its output root.' }
  Write-Host 'build-design-parity-runtime helper tests passed.'
} finally {
  if (Test-Path -LiteralPath $taskOutput) { Remove-Item -LiteralPath $taskOutput -Recurse -Force }
}
