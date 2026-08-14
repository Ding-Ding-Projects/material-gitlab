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
call npx --no-install electron-builder --win squirrel --publish never
if errorlevel 1 (
  echo [gitlab-instant] ERROR: electron-builder Squirrel packaging failed. 1>&2
  popd >nul
  exit /b 1
)
set "ASSET_DIR=%ROOT%installer\squirrel-windows"
set "SETUP=%ASSET_DIR%\Setup.exe"
if not exist "%SETUP%" (
  echo [gitlab-instant] ERROR: no Squirrel Setup.exe was produced. 1>&2
  popd >nul
  exit /b 1
)
set "RELEASES=%ASSET_DIR%\RELEASES"
if not exist "%RELEASES%" (
  echo [gitlab-instant] ERROR: Squirrel RELEASES index is missing beside Setup.exe. 1>&2
  popd >nul
  exit /b 1
)
set "FULL_NUPKG="
for /r "%ASSET_DIR%" %%F in (*-full.nupkg) do if not defined FULL_NUPKG set "FULL_NUPKG=%%~fF"
if not defined FULL_NUPKG (
  echo [gitlab-instant] ERROR: no Squirrel full .nupkg was produced. 1>&2
  popd >nul
  exit /b 1
)
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "%ROOT%scripts\verify-squirrel-assets.ps1" -SetupPath "%SETUP%" -ReleasesPath "%RELEASES%" -FullNupkgPath "%FULL_NUPKG%"
if errorlevel 1 (
  echo [gitlab-instant] ERROR: unsigned installer verification failed. 1>&2
  popd >nul
  exit /b 1
)
echo [gitlab-instant] Installer ready under %ASSET_DIR% (unsigned; Windows may show an unknown-publisher warning).
popd >nul
exit /b 0
