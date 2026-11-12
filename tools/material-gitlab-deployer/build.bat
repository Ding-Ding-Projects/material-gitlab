@echo off
setlocal EnableExtensions EnableDelayedExpansion
rem Builds Material GitLab Host from a fresh checkout with nothing installed.
rem   build.bat        build, then offer to launch the window
rem   build.bat /s     silent: never prompts, exits non-zero on the first failure
rem If Node.js 20 or newer is not on PATH, a pinned portable Node.js is downloaded from
rem nodejs.org into .tools\node (no administrator rights), checked against the published
rem SHA-256 list, and used for this build only.

pushd "%~dp0" || (echo Could not enter the Host package directory. & exit /b 1)
set "SILENT_MODE=0"
if /I "%~1"=="/s" set "SILENT_MODE=1"
if /I "%~1"=="--silent" set "SILENT_MODE=1"
if "%SILENT%"=="1" set "SILENT_MODE=1"
set "NODE_VERSION=22.12.0"
set "NODE_DIR=%CD%\.tools\node"

call :log "[1/3] Checking Node.js"
call :node_ok
if errorlevel 1 (
  if exist "%NODE_DIR%\node.exe" (
    set "PATH=%NODE_DIR%;%PATH%"
    call :node_ok
  )
)
call :node_ok
if errorlevel 1 (
  call :log "Node.js 20+ not found; fetching portable Node.js %NODE_VERSION% into .tools\node"
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ErrorActionPreference='Stop';" ^
    "$v='%NODE_VERSION%'; $name=\"node-v$v-win-x64\"; $base=\"https://nodejs.org/dist/v$v\";" ^
    "$tmp=Join-Path $env:TEMP \"mgh-node-$v\"; New-Item -ItemType Directory -Force $tmp | Out-Null;" ^
    "$zip=Join-Path $tmp \"$name.zip\"; Invoke-WebRequest \"$base/$name.zip\" -OutFile $zip -UseBasicParsing;" ^
    "$sums=(Invoke-WebRequest \"$base/SHASUMS256.txt\" -UseBasicParsing).Content -split \"`n\";" ^
    "$want=($sums | Where-Object { $_ -match \" $name.zip$\" } | Select-Object -First 1).Split(' ')[0];" ^
    "$got=(Get-FileHash $zip -Algorithm SHA256).Hash.ToLower();" ^
    "if ($want -ne $got) { throw \"SHA-256 mismatch for $name.zip\" };" ^
    "Expand-Archive $zip -DestinationPath $tmp -Force;" ^
    "if (Test-Path '%NODE_DIR%') { Remove-Item -Recurse -Force '%NODE_DIR%' };" ^
    "New-Item -ItemType Directory -Force (Split-Path '%NODE_DIR%') | Out-Null;" ^
    "Move-Item (Join-Path $tmp $name) '%NODE_DIR%'; Write-Host \"Installed Node.js $v to %NODE_DIR% (sha256 $got)\""
  if errorlevel 1 (call :err "Could not download portable Node.js %NODE_VERSION% from https://nodejs.org/dist/" & goto :failed)
  set "PATH=%NODE_DIR%;%PATH%"
  call :node_ok
  if errorlevel 1 (call :err "Portable Node.js was installed but does not run." & goto :failed)
) else (
  for /f "delims=" %%V in ('node --version') do call :log "Found Node.js %%V"
)

call :log "[2/3] Installing dependencies"
if exist package-lock.json (call npm ci --no-audit --no-fund) else (call npm install --no-audit --no-fund)
if errorlevel 1 (call :err "npm could not install the dependencies." & goto :failed)

call :log "[3/3] Compiling"
call npm run build
if errorlevel 1 (call :err "npm run build failed." & goto :failed)
call :log "Build complete: dist\main.js and dist\renderer are ready."

if "%SILENT_MODE%"=="1" goto :done
if defined CI goto :done
choice /C YN /N /M "Launch Material GitLab Host now? [Y/N] "
if errorlevel 2 goto :done
call npm start
:done
popd >nul
exit /b 0

:node_ok
where node >nul 2>nul || exit /b 1
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)" >nul 2>nul
exit /b %errorlevel%

:log
if "%SILENT_MODE%"=="0" echo %~1
exit /b 0

:err
echo ERROR: %~1 1>&2
exit /b 0

:failed
popd >nul
exit /b 1
