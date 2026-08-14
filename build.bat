@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem GitLab frontend bootstrap/build entry point.
rem Supported modes: build.bat, build.bat /s, build.bat --silent, SILENT=1 build.bat

set "REPO_ROOT=%~dp0"
if "%REPO_ROOT:~-1%"=="\" set "REPO_ROOT=%REPO_ROOT:~0,-1%"
set "SILENT_MODE=0"
set "YARN_CMD=yarn"
if /I "%SILENT%"=="1" set "SILENT_MODE=1"
for %%A in (%*) do (
  if /I "%%~A"=="/s" set "SILENT_MODE=1"
  if /I "%%~A"=="--silent" set "SILENT_MODE=1"
)

call :phase "Bootstrap" || exit /b 1
call :ensure_node || exit /b 1
call :ensure_yarn || exit /b 1
call :install_dependencies || exit /b 1
call :build_frontend || exit /b 1

echo.
echo [OK] Frontend build completed successfully.
echo [INFO] Output is in public\assets and is generated from the repository's webpack-prod script.
if "%SILENT_MODE%"=="1" exit /b 0

choice /C YN /N /M "Run the existing frontend development server now? [Y/N] "
if errorlevel 2 exit /b 0
echo [RUN] Starting yarn dev-server. Press Ctrl+C to stop it.
pushd "%REPO_ROOT%" >nul
yarn dev-server
set "RUN_EXIT=%ERRORLEVEL%"
popd >nul
exit /b %RUN_EXIT%

:phase
echo [PHASE] %~1
exit /b 0

:ensure_node
where node >nul 2>nul
if not errorlevel 1 (
  for /f "tokens=1" %%V in ('node --version 2^>nul') do echo [OK] Node.js %%V is available.
  exit /b 0
)
echo [INSTALL] Node.js is missing; acquiring the user-scoped LTS package with winget.
where winget >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is missing and winget is unavailable. Install Node.js 22.12.0 or newer, then rerun this script.
  exit /b 1
)
winget install --id OpenJS.NodeJS.LTS --scope user --accept-source-agreements --accept-package-agreements --silent
if errorlevel 1 (
  echo [ERROR] winget could not acquire Node.js. The requested version is the repository's .nvmrc value: 22.12.0.
  exit /b 1
)
set "PATH=%ProgramFiles%\nodejs;%LOCALAPPDATA%\Programs\nodejs;%PATH%"
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js installation reported success but node.exe is not on PATH in this process.
  exit /b 1
)
for /f "tokens=1" %%V in ('node --version 2^>nul') do echo [OK] Node.js %%V is available after bootstrap.
exit /b 0

:ensure_yarn
where corepack >nul 2>nul
if not errorlevel 1 goto :corepack_yarn
where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Neither Corepack nor npm is available to provide the manifest's Yarn package manager.
  exit /b 1
)
echo [INSTALL] Corepack is unavailable; acquiring Yarn 1.22.22 in the user npm prefix.
npm install --global yarn@1.22.22 --no-fund --no-audit
if errorlevel 1 (
  echo [ERROR] npm could not acquire Yarn 1.22.22.
  exit /b 1
)
goto :check_yarn

:corepack_yarn
echo [INSTALL] Activating the manifest-pinned Yarn 1.22.22 through Corepack.
corepack prepare yarn@1.22.22 --activate
if errorlevel 1 (
  echo [ERROR] Corepack could not prepare Yarn 1.22.22 in its user cache.
  exit /b 1
)
set "YARN_CMD=corepack yarn"

:check_yarn
if /I "%YARN_CMD%"=="yarn" (
  where yarn >nul 2>nul
  if errorlevel 1 (
    echo [ERROR] Yarn is still unavailable after bootstrap.
    exit /b 1
  )
)
for /f "tokens=1" %%V in ('%YARN_CMD% --version 2^>nul') do echo [OK] Yarn %%V is available.
exit /b 0

:install_dependencies
echo [DEPS] Installing JavaScript dependencies from yarn.lock (frozen, reproducible mode).
pushd "%REPO_ROOT%" >nul
%YARN_CMD% install --frozen-lockfile --non-interactive --no-progress
set "DEPS_EXIT=%ERRORLEVEL%"
popd >nul
if not "%DEPS_EXIT%"=="0" (
  echo [ERROR] yarn install failed with exit code %DEPS_EXIT%. No build was attempted.
  exit /b %DEPS_EXIT%
)
echo [OK] JavaScript dependencies are ready.
exit /b 0

:build_frontend
echo [BUILD] Running the repository-declared production frontend build: yarn webpack-prod.
pushd "%REPO_ROOT%" >nul
%YARN_CMD% webpack-prod
set "BUILD_EXIT=%ERRORLEVEL%"
popd >nul
if not "%BUILD_EXIT%"=="0" (
echo [ERROR] yarn webpack-prod failed with exit code %BUILD_EXIT%.
  exit /b %BUILD_EXIT%
)
if not exist "%REPO_ROOT%\public\assets" (
  echo [ERROR] webpack-prod returned success but public\assets was not produced.
  exit /b 1
)
exit /b 0
