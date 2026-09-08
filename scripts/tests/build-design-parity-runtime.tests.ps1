$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repositoryRoot = (git rev-parse --show-toplevel).Trim()
$helper = Join-Path $repositoryRoot 'scripts/build-design-parity-runtime.ps1'
$commit = (git rev-parse HEAD).Trim()
$taskOutput = Join-Path ([IO.Path]::GetTempPath()) ("material-gitlab-parity-test-" + [Guid]::NewGuid().ToString('N'))
$fakeBin = Join-Path $taskOutput 'fake-bin'
$fakeCommit = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

try {
  $dryRun = & $helper -Commit $commit -OutputRoot $taskOutput -DryRun | ConvertFrom-Json
  if ($LASTEXITCODE -ne 0) { throw 'The helper dry run returned a non-zero exit code.' }
  if ($dryRun.sourceSha -ne $commit) { throw 'Dry run did not pin the requested commit.' }
  if ($dryRun.tag -ne "material-gitlab-parity:$commit") { throw 'Dry run emitted an unexpected local image tag.' }
  $arguments = @($dryRun.dockerArguments)
  foreach ($requiredArgument in @('--load', '--platform', 'linux/amd64', 'RAILS_ENV=test', 'NODE_ENV=production', 'BABEL_ENV=production', 'NO_COMPRESSION=1', 'NO_SOURCEMAPS=1', 'WEBPACK_MINIFY_IN_PROCESS=true', 'NODE_OPTIONS=--max-old-space-size=10240', 'GLCI_GITLAB_ASSETS_HASH_FILE=/nonexistent/gitlab-assets-hash')) {
    if ($arguments -notcontains $requiredArgument) { throw "Dry run omitted required Docker argument: $requiredArgument" }
  }
  if (Test-Path -LiteralPath $taskOutput) { throw 'Dry run must not create an output directory.' }
  if ($arguments[-1] -ne '-') { throw 'The immutable archive must be Docker stdin, not an extracted directory.' }

  New-Item -ItemType Directory -Path $taskOutput -Force | Out-Null
  $normalizer = Join-Path $repositoryRoot 'qa/gdk/normalize-executable-shebangs.py'
  $crlfFixture = Join-Path $taskOutput 'crlf-shebang-fixture'
  $binaryFixture = Join-Path $taskOutput 'binary-fixture'
  [IO.File]::WriteAllText($crlfFixture, "#!/usr/bin/env ruby`r`nputs 'fixture'`r`n")
  [byte[]]$binaryBytes = 0, 13, 10, 255, 128
  [IO.File]::WriteAllBytes($binaryFixture, $binaryBytes)
  $normalizerOutput = & py -3 $normalizer $crlfFixture $binaryFixture 2>&1
  if ($LASTEXITCODE -ne 0) { throw 'The CRLF shebang normalizer fixture exited non-zero.' }
  if (($normalizerOutput | Out-String) -notmatch 'Normalized CRLF shebang files: 1') { throw 'The CRLF fixture did not exercise a normalizer transformation.' }
  $fixtureBytes = [IO.File]::ReadAllBytes($crlfFixture)
  if ([Text.Encoding]::ASCII.GetString($fixtureBytes) -match "\r\n") { throw "CRLF shebang fixture remained CRLF after normalization: $normalizerOutput" }
  if ([Text.Encoding]::ASCII.GetString($fixtureBytes) -notmatch '^#!/usr/bin/env ruby\n') { throw 'Shebang fixture did not preserve its executable interpreter line.' }
  if ([Convert]::ToBase64String([IO.File]::ReadAllBytes($binaryFixture)) -ne [Convert]::ToBase64String($binaryBytes)) { throw 'The shebang normalizer changed a non-shebang binary fixture.' }

  $versionSource = git show "$commit`:.gitlab/ci/version.yml"
  $rubygemsVersion = (Get-Content -LiteralPath (Join-Path $repositoryRoot 'qa/gdk/rubygems-version') -Raw).Trim()
  $rubygemsSeries = (($versionSource | Select-String 'RUBYGEMS_VERSION:').Line -replace '.*"([^"]+)".*', '$1')
  if (-not $rubygemsVersion.StartsWith($rubygemsSeries + '.')) { throw 'The GDK RubyGems patch must match the declared CI series.' }
  $toolVersions = Get-Content -LiteralPath (Join-Path $repositoryRoot 'qa/gdk/.tool-versions')
  $expectedVersions = @(
    ('ruby ' + (($versionSource | Select-String 'RUBY_VERSION_DEFAULT:').Line -replace '.*"([^"]+)".*', '$1'))
    ('node ' + (($versionSource | Select-String 'NODE_VERSION:').Line -replace '.*"([^"]+)".*', '$1'))
    ('golang ' + (($versionSource | Select-String 'GO_VERSION:').Line -replace '.*"([^"]+)".*', '$1'))
  )
  if (@(Compare-Object $expectedVersions $toolVersions).Count -ne 0) { throw 'qa/gdk/.tool-versions does not match the candidate version source.' }
  $dryRun | ConvertTo-Json -Depth 4 | & py -3 (Join-Path $PSScriptRoot 'verify-parity-archive-bytes.py')
  if ($LASTEXITCODE -ne 0) { throw 'Archive byte regression failed.' }

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

  New-Item -ItemType Directory -Path $fakeBin -Force | Out-Null
  $fakeGit = Join-Path $fakeBin 'fake-git.cmd'
  $fakeDocker = Join-Path $fakeBin 'fake-docker.cmd'
  [IO.File]::WriteAllText($fakeGit, "@echo off`r`n:dispatch`r`nif `"%1`"==`"rev-parse`" if `"%2`"==`"--show-toplevel`" ( echo $repositoryRoot & exit /b 0 )`r`nif `"%1`"==`"rev-parse`" ( echo $fakeCommit & exit /b 0 )`r`nif `"%1`"==`"archive`" ( <nul set /p `"=fake-tar`" & exit /b 0 )`r`nif `"%1`"==`"`" exit /b 19`r`nshift`r`ngoto dispatch`r`n")
  [IO.File]::WriteAllText($fakeDocker, "@echo off`r`nif `"%1`"==`"buildx`" goto buildx`r`nif `"%1`"==`"image`" goto image`r`nexit /b 19`r`n:buildx`r`nmore >nul`r`nif `"%FAKE_DOCKER_MODE%`"==`"timeout`" powershell -NoProfile -Command `"Start-Sleep -Seconds 3`"`r`nif `"%FAKE_DOCKER_MODE%`"==`"success`" exit /b 0`r`nexit /b 17`r`n:image`r`necho %* | findstr /C:`"RepoDigests`" >nul`r`nif not errorlevel 1 ( echo [] & exit /b 0 )`r`necho sha256:fake-image-id`r`nexit /b 0`r`n")

  $env:FAKE_DOCKER_MODE = 'nonzero'
  $nonzeroRoot = Join-Path $taskOutput 'nonzero'
  $nonzeroFailure = $null
  try { & $helper -Commit $fakeCommit -OutputRoot $nonzeroRoot -GitExecutable $fakeGit -DockerExecutable $fakeDocker *> $null } catch { $nonzeroFailure = $_.Exception.Message }
  if ($nonzeroFailure -notmatch 'exit code 17') { throw "Actual helper path did not report the simulated Docker non-zero exit: $nonzeroFailure" }
  if (-not (Test-Path -LiteralPath (Join-Path $nonzeroRoot $fakeCommit 'source.tar'))) { throw 'Actual helper path did not retain the streamed archive before Docker failed.' }

  $env:FAKE_DOCKER_MODE = 'timeout'
  $timeoutRoot = Join-Path $taskOutput 'timeout'
  $timeoutFailure = $null
  try { & $helper -Commit $fakeCommit -OutputRoot $timeoutRoot -TimeoutSeconds 1 -GitExecutable $fakeGit -DockerExecutable $fakeDocker *> $null } catch { $timeoutFailure = $_.Exception.Message }
  if ($timeoutFailure -notmatch 'timed out') { throw 'Actual helper path did not report the simulated Docker timeout.' }
  $env:FAKE_DOCKER_MODE = 'success'
  $successRoot = Join-Path $taskOutput 'success'
  $successOutput = & $helper -Commit $fakeCommit -OutputRoot $successRoot -GitExecutable $fakeGit -DockerExecutable $fakeDocker
  if ($LASTEXITCODE -ne 0) { throw 'Actual helper success path returned a non-zero exit code.' }
  if (($successOutput | Out-String) -match 'VoidTaskResult') { throw 'Actual helper success output leaked task return values.' }
  if (-not (Test-Path -LiteralPath (Join-Path $successRoot $fakeCommit 'receipt.json'))) { throw 'Actual helper success path did not write a receipt.' }
  Remove-Item Env:FAKE_DOCKER_MODE -ErrorAction SilentlyContinue
  Write-Host 'build-design-parity-runtime helper tests passed.'
} finally {
  if (Test-Path -LiteralPath $taskOutput) { Remove-Item -LiteralPath $taskOutput -Recurse -Force }
}
