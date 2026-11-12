# Material GitLab one-click host (Windows, Docker Desktop). Launched by host.bat.
#
# What it does, in order:
#   1. Finds Docker. If it is missing, installs Docker Desktop with winget (Windows shows its
#      own administrator prompt; nothing here answers it), then starts Docker Desktop and waits.
#   2. Writes .env next to docker-compose.yml on first run, using this PC's LAN address so
#      phones and other computers on the network can reach the instance. An existing .env is
#      never overwritten.
#   3. Pulls the published image. If no image can be pulled, builds one locally from the
#      newest release's .deb, which the Omnibus package workflow publishes on every push.
#   4. Starts the container with named volumes (deploy\windows\docker-compose.windows.yml),
#      waits for GitLab's own health check, and opens the instance in the browser.
#   5. Offers to allow the two ports through Windows Firewall so the LAN can connect.
#
# It never prints a password or token, never deletes a volume, and never touches containers
# other than material-gitlab.

param([string]$Command = 'up')

$ErrorActionPreference = 'Stop'
$Silent = ($Command -in @('/s', '--silent', '-s')) -or ($env:SILENT -eq '1')
if ($Command -in @('/s', '--silent', '-s')) { $Command = 'up' }

$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$EnvFile = Join-Path $Root '.env'
$Compose = @('compose', '-f', (Join-Path $Root 'docker-compose.yml'), '-f', (Join-Path $PSScriptRoot 'docker-compose.windows.yml'), '--project-directory', $Root)
$Repo = 'Ding-Ding-Projects/material-gitlab'

function Say($msg) { Write-Host "  $msg" }
function Step($msg) { Write-Host ""; Write-Host "== $msg" -ForegroundColor Magenta }
function Fail($msg) { Write-Host ""; Write-Host "  FAILED: $msg" -ForegroundColor Red; exit 1 }
function Ask($question) {
  if ($Silent) { return $false }
  $a = Read-Host "  $question [y/N]"
  return $a -match '^(y|yes)$'
}

function Get-LanAddress {
  $candidates = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and
      $_.InterfaceAlias -notmatch 'vEthernet|WSL|Hyper-V|Loopback|Docker|VirtualBox|VMware'
    } |
    Sort-Object -Property @{ Expression = { (Get-NetRoute -InterfaceIndex $_.InterfaceIndex -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue | Measure-Object).Count }; Descending = $true }
  if ($candidates) { return @($candidates)[0].IPAddress }
  return 'localhost'
}

function Read-EnvValue($name, $default) {
  if (Test-Path $EnvFile) {
    $line = Get-Content $EnvFile | Where-Object { $_ -match "^\s*$name\s*=" } | Select-Object -First 1
    if ($line) { return ($line -split '=', 2)[1].Trim() }
  }
  return $default
}

function Test-DockerEngine {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { return $false }
  & docker info --format '{{.ServerVersion}}' *> $null
  return ($LASTEXITCODE -eq 0)
}

function Ensure-Docker {
  Step 'Docker'
  if (Test-DockerEngine) { Say "found, engine $(docker info --format '{{.ServerVersion}}')"; return }
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
      Fail 'Docker is not installed and winget is not available. Install Docker Desktop from https://docs.docker.com/desktop/setup/install/windows-install/ and run host.bat again.'
    }
    Say 'Docker Desktop is not installed. Installing it with winget.'
    Say 'Windows will ask for administrator approval; approve it yourself to continue.'
    & winget install --exact --id Docker.DockerDesktop --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) { Fail "winget could not install Docker Desktop (exit $LASTEXITCODE)." }
    $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
  }
  $desktop = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
  if (Test-Path $desktop) { Say 'starting Docker Desktop'; Start-Process $desktop | Out-Null }
  Say 'waiting for the Docker engine (up to 5 minutes; first start can ask you to accept its terms)'
  $deadline = (Get-Date).AddMinutes(5)
  while ((Get-Date) -lt $deadline) {
    if (Test-DockerEngine) { Say 'engine is up'; return }
    Start-Sleep -Seconds 5
  }
  Fail 'Docker Desktop did not start within 5 minutes. Open it, finish its first-run steps, then run host.bat again.'
}

function Ensure-EnvFile {
  Step 'Configuration'
  if (Test-Path $EnvFile) { Say ".env already exists, keeping it: $EnvFile"; return }
  $ip = Get-LanAddress
  $mem = [math]::Floor((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB)
  $limit = [math]::Max(4, [math]::Min(10, $mem - 4))
  $cores = [math]::Max(2, [math]::Min(4, [Environment]::ProcessorCount - 1))
  @(
    "# Written by host.bat on $(Get-Date -Format 'yyyy-MM-dd HH:mm'). Edit freely; host.bat never overwrites it."
    "GITLAB_HOSTNAME=$ip"
    'GITLAB_HTTP_PORT=8929'
    'GITLAB_SSH_PORT=2229'
    "GITLAB_MEMORY_LIMIT=${limit}g"
    "GITLAB_CPU_LIMIT=$cores"
  ) | Set-Content -Path $EnvFile -Encoding ascii
  Say "wrote $EnvFile"
  Say "LAN address $ip, memory cap ${limit} GB of ${mem} GB, $cores CPU cores"
  if ($mem -lt 8) { Say 'warning: GitLab is comfortable with 8 GB of RAM or more; this PC has less.' }
}

function Get-LatestDebUrl {
  try {
    $releases = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases?per_page=30" -Headers @{ 'User-Agent' = 'material-gitlab-host' }
  } catch { return $null }
  foreach ($r in $releases) {
    if ($r.draft) { continue }
    $asset = $r.assets | Where-Object { $_.name -like '*.deb' } | Select-Object -First 1
    if ($asset) { return @{ Url = $asset.browser_download_url; Tag = $r.tag_name } }
  }
  return $null
}

function Ensure-Image {
  Step 'Image'
  Say 'pulling the published image'
  & docker @Compose pull gitlab
  if ($LASTEXITCODE -eq 0) { Say 'pulled'; return }
  Say 'no image could be pulled (not published yet, or the registry package is private)'
  $deb = Get-LatestDebUrl
  if (-not $deb) {
    Fail "No release with a .deb exists yet. The Omnibus package workflow publishes one on every push to main: https://github.com/$Repo/actions/workflows/omnibus-package.yml"
  }
  Say "building locally from release $($deb.Tag)"
  $env:MATERIAL_GITLAB_DEB_URL = $deb.Url
  $env:MATERIAL_GITLAB_VERSION = $deb.Tag
  $env:MATERIAL_GITLAB_IMAGE = 'material-gitlab:local'
  & docker @Compose build gitlab
  if ($LASTEXITCODE -ne 0) { Fail 'the local image build failed; the output above names the step.' }
}

function Wait-Healthy {
  Say 'waiting for GitLab to report healthy (first boot takes 3 to 10 minutes)'
  $deadline = (Get-Date).AddMinutes(20)
  $last = ''
  while ((Get-Date) -lt $deadline) {
    $state = (& docker inspect --format '{{.State.Health.Status}}' material-gitlab 2>$null)
    if ($state -ne $last) { Say "health: $state"; $last = $state }
    if ($state -eq 'healthy') { return $true }
    Start-Sleep -Seconds 10
  }
  return $false
}

function Open-Firewall($http, $ssh) {
  $existing = Get-NetFirewallRule -DisplayName 'Material GitLab' -ErrorAction SilentlyContinue
  if ($existing) { Say 'firewall rule already present'; return }
  if (-not (Ask "Allow ports $http and $ssh through Windows Firewall so other devices on your network can connect? (administrator approval needed)")) {
    Say "skipped; this PC can still open the instance. Run host.bat again to add the rule later."
    return
  }
  $cmd = "New-NetFirewallRule -DisplayName 'Material GitLab' -Direction Inbound -Protocol TCP -LocalPort $http,$ssh -Profile Private,Domain -Action Allow"
  Start-Process powershell -Verb RunAs -Wait -ArgumentList @('-NoProfile', '-Command', $cmd)
  Say 'firewall rule requested for private and domain networks'
}

switch ($Command.ToLower()) {
  'stop' { & docker @Compose stop gitlab; exit $LASTEXITCODE }
  'logs' { & docker @Compose logs -f gitlab; exit $LASTEXITCODE }
  'status' {
    & docker @Compose ps
    $h = Read-EnvValue 'GITLAB_HOSTNAME' 'localhost'; $p = Read-EnvValue 'GITLAB_HTTP_PORT' '8929'
    Say "address: http://${h}:$p"
    exit 0
  }
  'up' {
    Write-Host ''
    Write-Host '  Material GitLab, one-click host' -ForegroundColor Magenta
    Ensure-Docker
    Ensure-EnvFile
    Ensure-Image
    Step 'Start'
    & docker @Compose up -d gitlab
    if ($LASTEXITCODE -ne 0) { Fail 'docker compose up failed; see the output above.' }
    $ok = Wait-Healthy
    $h = Read-EnvValue 'GITLAB_HOSTNAME' 'localhost'; $p = Read-EnvValue 'GITLAB_HTTP_PORT' '8929'; $s = Read-EnvValue 'GITLAB_SSH_PORT' '2229'
    if (-not $ok) { Fail 'GitLab did not become healthy within 20 minutes. Run "host.bat logs" to see why.' }
    Step 'Network'
    Open-Firewall $p $s
    $url = "http://${h}:$p"
    Step 'Ready'
    Say "open $url on this PC, or on any phone or computer on the same network"
    Say "Git over SSH: ssh://git@${h}:$s"
    Say 'first sign-in: user root. The generated password is in the container; read it with:'
    Say '  docker exec material-gitlab grep "Password:" /etc/gitlab/initial_root_password'
    Say 'GitLab deletes that file 24 hours after first boot, so change the password once signed in.'
    if (-not $Silent) { Start-Process $url | Out-Null }
    exit 0
  }
  default { Fail "unknown command '$Command'. Use: host.bat, host.bat /s, host.bat status, host.bat stop, host.bat logs" }
}
