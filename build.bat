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
echo [INFO] Output is in public\assets, built from the same frontend-islands and
echo [INFO] webpack steps the repository's webpack-prod script declares.
if "%SILENT_MODE%"=="1" exit /b 0

choice /C YN /N /M "Run the existing frontend development server now? [Y/N] "
if errorlevel 2 exit /b 0
echo [RUN] Starting yarn dev-server. Press Ctrl+C to stop it.
pushd "%REPO_ROOT%" >nul
call %YARN_CMD% dev-server
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
goto :npm_yarn

:corepack_yarn
echo [INSTALL] Activating the manifest-pinned Yarn 1.22.22 through Corepack.
call corepack prepare yarn@1.22.22 --activate
if not errorlevel 1 (
  set "YARN_CMD=corepack yarn"
  goto :check_yarn
)
echo [WARN] Corepack could not prepare Yarn 1.22.22; trying the user-scoped npm fallback.

:npm_yarn
where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Neither Corepack nor npm is available to provide the manifest's Yarn package manager.
  exit /b 1
)
set "YARN_TOOLS=%LOCALAPPDATA%\material-gitlab-tools"
echo [INSTALL] Acquiring Yarn 1.22.22 in the user-scoped npm prefix: %YARN_TOOLS%.
call npm install --global --prefix "%YARN_TOOLS%" yarn@1.22.22 --no-fund --no-audit
if errorlevel 1 (
  echo [ERROR] npm could not acquire Yarn 1.22.22.
  exit /b 1
)
set "PATH=%YARN_TOOLS%;%YARN_TOOLS%\bin;%PATH%"
set "YARN_CMD=yarn"

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
call %YARN_CMD% install --frozen-lockfile --non-interactive --no-progress
set "DEPS_EXIT=%ERRORLEVEL%"
popd >nul
if not "%DEPS_EXIT%"=="0" (
  echo [ERROR] yarn install failed with exit code %DEPS_EXIT%. No build was attempted.
  exit /b %DEPS_EXIT%
)
echo [OK] JavaScript dependencies are ready.
exit /b 0

:build_frontend
rem The repository's own webpack-prod script is a POSIX command chain: an
rem extensionless bash script, then an inline VAR=value environment prefix.
rem Yarn runs package scripts through cmd.exe on this platform and cmd can
rem parse neither half, so `yarn webpack-prod` fails here before it starts.
rem Both halves are therefore invoked directly below, in the same order and
rem with the same environment the script declares.
call :ensure_bash || exit /b 1

rem Yarn 1 runs package scripts through cmd.exe on this platform regardless of
rem which shell invoked yarn, and this repository uses the POSIX
rem `VAR=value command` prefix throughout - including the island builds under
rem ee/frontend_islands, which fail with 'NODE_ENV' is not recognized without
rem this. Point yarn at the same bash for this process tree only; nothing is
rem written to the user's global yarn configuration.
set "YARN_SCRIPT_SHELL=%BASH_CMD%"

echo [BUILD] Building the frontend islands with the repository's own script.
pushd "%REPO_ROOT%" >nul
call "%BASH_CMD%" scripts/build_frontend_islands
set "ISLANDS_EXIT=%ERRORLEVEL%"
popd >nul
if not "%ISLANDS_EXIT%"=="0" (
  echo [ERROR] scripts/build_frontend_islands failed with exit code %ISLANDS_EXIT%.
  exit /b %ISLANDS_EXIT%
)
echo [OK] Frontend islands are built.

echo [BUILD] Running webpack in production mode.
rem webpack is started through its JS entry point rather than the
rem node_modules\.bin shim, which is an extensionless POSIX script too.
set "NODE_ENV=production"
if not defined NODE_OPTIONS set "NODE_OPTIONS=--max-old-space-size=10240"
pushd "%REPO_ROOT%" >nul
call node "node_modules\webpack\bin\webpack.js" --config config/webpack.config.js
set "BUILD_EXIT=%ERRORLEVEL%"
popd >nul
if not "%BUILD_EXIT%"=="0" (
  echo [ERROR] webpack failed with exit code %BUILD_EXIT%.
  exit /b %BUILD_EXIT%
)
if not exist "%REPO_ROOT%\public\assets" (
  echo [ERROR] webpack returned success but public\assets was not produced.
  exit /b 1
)
exit /b 0

:ensure_bash
rem The repository's shell scripts need the bash that Git for Windows ships.
rem C:\Windows\System32\bash.exe is the WSL launcher: it sits on PATH by
rem default and cannot see this checkout's Windows Node installation, so it is
rem never an acceptable substitute and is deliberately not searched for here.
set "BASH_CMD="
if exist "%ProgramFiles%\Git\bin\bash.exe" set "BASH_CMD=%ProgramFiles%\Git\bin\bash.exe"
if not defined BASH_CMD if exist "%ProgramFiles(x86)%\Git\bin\bash.exe" set "BASH_CMD=%ProgramFiles(x86)%\Git\bin\bash.exe"
if not defined BASH_CMD if exist "%LOCALAPPDATA%\Programs\Git\bin\bash.exe" set "BASH_CMD=%LOCALAPPDATA%\Programs\Git\bin\bash.exe"
if defined BASH_CMD goto :bash_ready
echo [INSTALL] Git for Windows is missing; acquiring the user-scoped package with winget.
where winget >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Git for Windows is missing and winget is unavailable. Install Git for Windows, then rerun this script.
  exit /b 1
)
winget install --id Git.Git --scope user --accept-source-agreements --accept-package-agreements --silent
if exist "%LOCALAPPDATA%\Programs\Git\bin\bash.exe" set "BASH_CMD=%LOCALAPPDATA%\Programs\Git\bin\bash.exe"
if not defined BASH_CMD if exist "%ProgramFiles%\Git\bin\bash.exe" set "BASH_CMD=%ProgramFiles%\Git\bin\bash.exe"
if not defined BASH_CMD (
  echo [ERROR] Git for Windows installed but bin\bash.exe was not found afterwards.
  exit /b 1
)
:bash_ready
echo [OK] Using the Git for Windows bash at "%BASH_CMD%".
exit /b 0
