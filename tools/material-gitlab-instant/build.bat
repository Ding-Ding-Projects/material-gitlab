@echo off
setlocal EnableExtensions EnableDelayedExpansion
set "SILENT_MODE=0"
if /I "%~1"=="/s" set "SILENT_MODE=1"
if /I "%~1"=="--silent" set "SILENT_MODE=1"
if /I "%SILENT%"=="1" set "SILENT_MODE=1"
set "ROOT=%~dp0"
pushd "%ROOT%" >nul
call :log "GitLab Instant build starting"
where node >nul 2>&1
if errorlevel 1 (
  call :log "Node.js was not found; attempting a user-scoped winget install"
  where winget >nul 2>&1
  if errorlevel 1 call :fail "Node.js is missing and winget is unavailable. Install Node.js 22 LTS or provide node.exe on PATH."
  winget install --id OpenJS.NodeJS.LTS --exact --scope user --accept-package-agreements --accept-source-agreements
  if errorlevel 1 call :fail "winget could not install Node.js LTS."
  set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
)
where npm >nul 2>&1
if errorlevel 1 call :fail "npm is unavailable after Node.js bootstrap."
call :log "Installing declared build dependencies"
npm install --no-audit --no-fund
if errorlevel 1 call :fail "npm install failed; the dependency tree is incomplete."
call :log "Compiling TypeScript and copying renderer assets"
npm run build
if errorlevel 1 call :fail "npm run build failed."
call :log "Build complete: dist is ready"
popd >nul
if "%SILENT_MODE%"=="0" pause
exit /b 0
:log
if "%SILENT_MODE%"=="0" echo [gitlab-instant] %~1
exit /b 0
:fail
echo [gitlab-instant] ERROR: %~1 1>&2
popd >nul
exit /b 1
