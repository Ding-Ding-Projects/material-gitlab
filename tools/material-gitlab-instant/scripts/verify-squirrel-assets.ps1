param(
  [Parameter(Mandatory = $true)][string]$SetupPath,
  [Parameter(Mandatory = $true)][string]$ReleasesPath,
  [Parameter(Mandatory = $true)][string]$FullNupkgPath
)

$ErrorActionPreference = 'Stop'

foreach ($path in @($SetupPath, $ReleasesPath, $FullNupkgPath)) {
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Required Squirrel asset is missing: $path" }
}

$packageName = [IO.Path]::GetFileName($FullNupkgPath)
if (-not (Select-String -LiteralPath $ReleasesPath -SimpleMatch -Quiet $packageName)) {
  throw "RELEASES does not reference $packageName"
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$package = [IO.Compression.ZipFile]::OpenRead($FullNupkgPath)
try {
  if ($package.Entries.Count -lt 1) { throw 'The full nupkg has no entries.' }
} finally {
  $package.Dispose()
}

$setupBytes = [IO.File]::ReadAllBytes($SetupPath)
if ($setupBytes.Length -lt 256 -or $setupBytes[0] -ne 0x4d -or $setupBytes[1] -ne 0x5a) { throw 'Setup.exe is not a valid PE file.' }
$peOffset = [BitConverter]::ToInt32($setupBytes, 0x3c)
if ($peOffset -lt 0 -or $peOffset + 64 -gt $setupBytes.Length -or $setupBytes[$peOffset] -ne 0x50 -or $setupBytes[$peOffset + 1] -ne 0x45) { throw 'Setup.exe has no valid PE header.' }
$optionalOffset = $peOffset + 24
$magic = [BitConverter]::ToUInt16($setupBytes, $optionalOffset)
$directoryOffset = if ($magic -eq 0x20b) { $optionalOffset + 112 } elseif ($magic -eq 0x10b) { $optionalOffset + 96 } else { throw 'Setup.exe has an unsupported PE optional header.' }
$certificateOffset = [BitConverter]::ToUInt32($setupBytes, $directoryOffset + 32)
$certificateSize = [BitConverter]::ToUInt32($setupBytes, $directoryOffset + 36)
if ($certificateOffset -ne 0 -or $certificateSize -ne 0) { throw 'Setup.exe contains an Authenticode certificate table.' }

function Get-Sha256([string]$Path) {
  $sha = [Security.Cryptography.SHA256]::Create()
  try { return ([BitConverter]::ToString($sha.ComputeHash([IO.File]::ReadAllBytes($Path))).Replace('-', '')) } finally { $sha.Dispose() }
}

Write-Output "Installer=$SetupPath"
Write-Output "InstallerSHA256=$(Get-Sha256 $SetupPath)"
Write-Output "FullNupkg=$FullNupkgPath"
Write-Output "FullNupkgSHA256=$(Get-Sha256 $FullNupkgPath)"
Write-Output 'Signing=NotSigned'
