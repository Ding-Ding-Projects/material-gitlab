@echo off
setlocal EnableExtensions EnableDelayedExpansion
set "SILENT_MODE=0"
if /I "%~1"=="/s" set "SILENT_MODE=1"
if /I "%~1"=="--silent" set "SILENT_MODE=1"
if "%SILENT%"=="1" set "SILENT_MODE=1"
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
if exist package-lock.json (npm ci --no-audit --no-fund) else (npm install --no-audit --no-fund)
if errorlevel 1 call :fail "npm dependency installation failed; the dependency tree is incomplete."
call :log "Compiling TypeScript and copying renderer assets"
npm run build
if errorlevel 1 call :fail "npm run build failed."
call :log "Build complete: dist is ready"
if "%SILENT_MODE%"=="0" (
  choice /C YN /N /M "Launch the local shell now? [Y/N] "
  if not errorlevel 2 (
    call npm start
    set "LAUNCH_EXIT=!errorlevel!"
    popd >nul
    exit /b !LAUNCH_EXIT!
  )
)
popd >nul
exit /b 0
:log
if "%SILENT_MODE%"=="0" echo [gitlab-instant] %~1
exit /b 0
:fail
echo [gitlab-instant] ERROR: %~1 1>&2
popd >nul
exit /b 1
