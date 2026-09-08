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
  if ($arguments[-1] -ne '-') { throw 'The immutable archive must be Docker stdin, not an extracted directory.' }

  $rejectedRepositoryOutput = $false
  try {
    & $helper -Commit $commit -OutputRoot $repositoryRoot -DryRun *> $null
  } catch {
    $rejectedRepositoryOutput = $true
  }
  if (-not $rejectedRepositoryOutput) { throw 'Dry run accepted the repository as its output root.' }

  New-Item -ItemType Directory -Path (Join-Path $taskOutput $commit) -Force | Out-Null
  [IO.File]::WriteAllText((Join-Path $taskOutput $commit 'owned.txt'), 'candidate')
  $rejectedExistingCandidate = $false
  try {
    & $helper -Commit $commit -OutputRoot $taskOutput -DryRun *> $null
  } catch {
    $rejectedExistingCandidate = $true
  }
  if (-not $rejectedExistingCandidate) { throw 'Dry run accepted a nonempty candidate output directory.' }

  function Invoke-SimulatedProcess {
    param([string]$Command, [int]$TimeoutMilliseconds)
    $processInfo = [Diagnostics.ProcessStartInfo]::new()
    $processInfo.FileName = 'cmd.exe'
    $processInfo.UseShellExecute = $false
    $processInfo.RedirectStandardOutput = $true
    $processInfo.RedirectStandardError = $true
    foreach ($argument in @('/d', '/c', $Command)) { [void]$processInfo.ArgumentList.Add($argument) }
    $process = [Diagnostics.Process]::Start($processInfo)
    $process.BeginOutputReadLine(); $process.BeginErrorReadLine()
    if (-not $process.WaitForExit($TimeoutMilliseconds)) {
      & taskkill /PID $process.Id /T /F *> $null
      return 'timeout'
    }
    return "exit:$($process.ExitCode)"
  }

  if ((Invoke-SimulatedProcess 'exit /b 17' 1000) -ne 'exit:17') { throw 'Simulated non-zero process path was not observed.' }
  if ((Invoke-SimulatedProcess 'powershell -NoProfile -Command "Start-Sleep -Seconds 3"' 100) -ne 'timeout') { throw 'Simulated timeout process path was not observed.' }
  Write-Host 'build-design-parity-runtime helper tests passed.'
} finally {
  if (Test-Path -LiteralPath $taskOutput) { Remove-Item -LiteralPath $taskOutput -Recurse -Force }
}
