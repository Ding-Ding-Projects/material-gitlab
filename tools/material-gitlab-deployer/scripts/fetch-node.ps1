# Downloads portable Node.js for build.bat when no Node.js 20+ is installed. User scoped, no
# administrator rights. The zip is checked against nodejs.org's published SHA-256 list.
param(
  [Parameter(Mandatory = $true)][string]$Version,
  [Parameter(Mandatory = $true)][string]$Destination
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$name = "node-v$Version-win-x64"
$base = "https://nodejs.org/dist/v$Version"
$tmp = Join-Path $env:TEMP "mgh-node-$Version"
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
$zip = Join-Path $tmp "$name.zip"
Invoke-WebRequest -Uri "$base/$name.zip" -OutFile $zip -UseBasicParsing
$sums = (Invoke-WebRequest -Uri "$base/SHASUMS256.txt" -UseBasicParsing).Content -split "`n"
$line = $sums | Where-Object { $_ -match " $([regex]::Escape("$name.zip"))$" } | Select-Object -First 1
if (-not $line) { throw "SHASUMS256.txt has no entry for $name.zip" }
$want = $line.Split(' ')[0].Trim().ToLowerInvariant()
$got = (Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant()
if ($want -ne $got) { throw "SHA-256 mismatch for $name.zip (expected $want, got $got)" }
Expand-Archive -LiteralPath $zip -DestinationPath $tmp -Force
if (Test-Path -LiteralPath $Destination) { Remove-Item -LiteralPath $Destination -Recurse -Force }
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Destination) | Out-Null
Move-Item -LiteralPath (Join-Path $tmp $name) -Destination $Destination
Write-Host "Installed Node.js $Version to $Destination (sha256 $got)"
