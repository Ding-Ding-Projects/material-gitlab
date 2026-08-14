param([string]$Output = (Join-Path $PSScriptRoot '..\build\icon.ico'))
$ErrorActionPreference = 'Stop'
$sizes = @(16, 24, 32, 48, 64, 128, 256)
$frames = New-Object System.Collections.Generic.List[byte[]]
function Add-Bytes([System.Collections.Generic.List[byte]]$List, [int]$Value, [int]$Count) {
  $bytes = [BitConverter]::GetBytes($Value)
  if (-not [BitConverter]::IsLittleEndian) { [array]::Reverse($bytes) }
  for ($i = 0; $i -lt $Count; $i++) { $List.Add($bytes[$i]) }
}
foreach ($size in $sizes) {
  $dib = New-Object System.Collections.Generic.List[byte]
  Add-Bytes $dib 40 4; Add-Bytes $dib $size 4; Add-Bytes $dib ($size * 2) 4
  Add-Bytes $dib 1 2; Add-Bytes $dib 32 2; Add-Bytes $dib 0 4
  Add-Bytes $dib ($size * $size * 4) 4; Add-Bytes $dib 0 4; Add-Bytes $dib 0 4
  Add-Bytes $dib 0 4; Add-Bytes $dib 0 4
  for ($y = $size - 1; $y -ge 0; $y--) {
    for ($x = 0; $x -lt $size; $x++) {
      $nx = (($x + 0.5) / $size) * 2 - 1; $ny = (($y + 0.5) / $size) * 2 - 1
      $r = [Math]::Sqrt(($nx * $nx) + ($ny * $ny)); $red = 255; $green = 255; $blue = 255
      if ([Math]::Abs($nx) -gt 0.78 -or [Math]::Abs($ny) -gt 0.78 -or $r -gt 0.96) { $red = 15; $green = 23; $blue = 42 }
      if ([Math]::Abs($r - 0.61) -lt 0.075 -and $r -lt 0.75) { $red = 249; $green = 115; $blue = 22 }
      $g = (($nx - 0.02) * ($nx - 0.02)) + (($ny + 0.01) * ($ny + 0.01))
      if ($g -lt 0.21 -and $g -gt 0.13 -and $nx -lt 0.38) { $red = 255; $green = 255; $blue = 255 }
      if ($nx -gt 0.10 -and $nx -lt 0.48 -and $ny -gt 0.02 -and $ny -lt 0.19) { $red = 255; $green = 255; $blue = 255 }
      if ($nx -gt 0.42 -and $ny -lt -0.56 -and (($nx - 0.58) * ($nx - 0.58) + ($ny + 0.62) * ($ny + 0.62)) -lt 0.018) { $red = 34; $green = 197; $blue = 94 }
      $dib.Add([byte]$blue); $dib.Add([byte]$green); $dib.Add([byte]$red); $dib.Add([byte]255)
    }
  }
  $maskBytes = [int][Math]::Ceiling($size / 32) * 4 * $size
  for ($i = 0; $i -lt $maskBytes; $i++) { $dib.Add([byte]0) }
  $frames.Add($dib.ToArray())
}
$ico = New-Object System.Collections.Generic.List[byte]
Add-Bytes $ico 0 2; Add-Bytes $ico 1 2; Add-Bytes $ico $sizes.Count 2
$offset = 6 + (16 * $sizes.Count)
for ($i = 0; $i -lt $sizes.Count; $i++) {
  $size = $sizes[$i]; $frame = $frames[$i]
  $ico.Add([byte]($(if ($size -ge 256) { 0 } else { $size }))); $ico.Add([byte]($(if ($size -ge 256) { 0 } else { $size })))
  $ico.Add(0); $ico.Add(0); Add-Bytes $ico 1 2; Add-Bytes $ico 32 2
  Add-Bytes $ico $frame.Length 4; Add-Bytes $ico $offset 4; $offset += $frame.Length
}
foreach ($frame in $frames) { $ico.AddRange($frame) }
$parent = Split-Path -Parent $Output; New-Item -ItemType Directory -Force -Path $parent | Out-Null
[IO.File]::WriteAllBytes($Output, $ico.ToArray())
Write-Output ("Generated {0} ({1} bytes)" -f $Output, $ico.Count)
