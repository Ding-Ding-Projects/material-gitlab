@echo off
setlocal EnableExtensions EnableDelayedExpansion
set "ROOT=%~dp0"
pushd "%ROOT%" >nul
call "%ROOT%build.bat" /s
if errorlevel 1 (
  echo [gitlab-instant] ERROR: application build failed; installer was not attempted. 1>&2
  popd >nul
  exit /b 1
)
where npx >nul 2>&1
if errorlevel 1 (
  echo [gitlab-instant] ERROR: npx is unavailable after Node.js bootstrap. 1>&2
  popd >nul
  exit /b 1
)
echo [gitlab-instant] Packaging an unsigned Squirrel.Windows installer
npx --no-install electron-builder --win squirrel
if errorlevel 1 (
  echo [gitlab-instant] ERROR: electron-builder Squirrel packaging failed. 1>&2
  popd >nul
  exit /b 1
)
set "SETUP="
for /r "%ROOT%dist" %%F in (*Setup.exe) do if not defined SETUP set "SETUP=%%~fF"
if not defined SETUP (
  echo [gitlab-instant] ERROR: no Squirrel Setup.exe was produced. 1>&2
  popd >nul
  exit /b 1
)
for %%F in ("%SETUP%") do set "SETUP_DIR=%%~dpF"
if not exist "%SETUP_DIR%RELEASES" (
  echo [gitlab-instant] ERROR: Squirrel RELEASES index is missing beside Setup.exe. 1>&2
  popd >nul
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=Get-AuthenticodeSignature -LiteralPath '%SETUP%'; if ($s.Status -ne 'NotSigned') { Write-Error ('Setup.exe signing status is ' + $s.Status); exit 1 }; $h=(Get-FileHash -Algorithm SHA256 -LiteralPath '%SETUP%').Hash; Write-Output ('Installer=' + '%SETUP%'); Write-Output ('SHA256=' + $h); Write-Output 'Signing=NotSigned'"
if errorlevel 1 (
  echo [gitlab-instant] ERROR: unsigned installer verification failed. 1>&2
  popd >nul
  exit /b 1
)
echo [gitlab-instant] Installer ready under %SETUP_DIR% (unsigned; Deen No may show an unknown-publisher warning).
popd >nul
exit /b 0
