@echo off
setlocal EnableExtensions DisableDelayedExpansion

rem GitLab source packaging for Deen No. This repository does not declare a
rem native Deen No installer; the supported local package is a reproducible
rem source ZIP made by git archive. This script never publishes or tags.

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%" >nul 2>&1
if errorlevel 1 (
  echo ERROR: Cannot enter the repository directory: "%SCRIPT_DIR%" 1>&2
  exit /b 1
)

set "SILENT_MODE="
if /I "%SILENT%"=="1" set "SILENT_MODE=1"
for %%A in (%*) do (
  if /I "%%~A"=="/s" set "SILENT_MODE=1"
  if /I "%%~A"=="--silent" set "SILENT_MODE=1"
)

where git >nul 2>&1
if errorlevel 1 (
  echo ERROR: Git is required to create the repository source archive. Install Git for Deen No and rerun this script. 1>&2
  exit /b 1
)

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo ERROR: The script must run from a Git checkout. 1>&2
  exit /b 1
)

rem If this checkout gains the repository's one-click build entry point, run
rem it first so the package cannot quietly rely on stale generated output.
rem The current source-only checkout has no build.bat, so archive creation is
rem intentionally the complete supported packaging route.
if exist "%SCRIPT_DIR%build.bat" (
  if not defined SILENT_MODE echo Running build.bat /s before packaging...
  call "%SCRIPT_DIR%build.bat" /s
  if errorlevel 1 (
    echo ERROR: build.bat /s failed; refusing to package an unbuilt checkout. 1>&2
    exit /b 1
  )
)

set "SOURCE_COMMIT="
for /f "delims=" %%H in ('git rev-parse HEAD 2^>nul') do set "SOURCE_COMMIT=%%H"
if not defined SOURCE_COMMIT (
  echo ERROR: Could not resolve the source commit. 1>&2
  exit /b 1
)

set "VERSION="
if not exist "VERSION" (
  echo ERROR: VERSION is missing; refusing to invent an artifact version. 1>&2
  exit /b 1
)
set /p VERSION=<"VERSION"
if not defined VERSION (
  echo ERROR: VERSION is empty; refusing to invent an artifact version. 1>&2
  exit /b 1
)

set "ARTIFACT_DIR=%SCRIPT_DIR%build\artifacts"
if not exist "%ARTIFACT_DIR%\." mkdir "%ARTIFACT_DIR%" >nul 2>&1
if not exist "%ARTIFACT_DIR%\." (
  echo ERROR: Could not create the artifact directory: "%ARTIFACT_DIR%" 1>&2
  exit /b 1
)

set "ARTIFACT=%ARTIFACT_DIR%\gitlab-source-%VERSION%-%SOURCE_COMMIT:~0,12%.zip"
set "TEMP_ARTIFACT=%ARTIFACT_DIR%\gitlab-source-%VERSION%-%SOURCE_COMMIT:~0,12%.zip.tmp-%RANDOM%"

if not defined SILENT_MODE echo Packaging source commit %SOURCE_COMMIT% as an unsigned source ZIP...
git archive --format=zip --prefix="gitlab-%VERSION%/" --output="%TEMP_ARTIFACT%" HEAD
if errorlevel 1 (
  del /q "%TEMP_ARTIFACT%" >nul 2>&1
  echo ERROR: git archive could not create the source package. 1>&2
  exit /b 1
)
if not exist "%TEMP_ARTIFACT%" (
  echo ERROR: git archive reported success but produced no artifact. 1>&2
  exit /b 1
)

rem Validate that the output is a readable ZIP with at least one entry before
rem replacing the previous artifact. The temporary file is ours only.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=[IO.Path]::GetFullPath($env:TEMP_ARTIFACT); Add-Type -AssemblyName System.IO.Compression.FileSystem; $z=[IO.Compression.ZipFile]::OpenRead($p); try { if($z.Entries.Count -lt 1){ throw 'ZIP has no entries' } } finally { $z.Dispose() }" >nul 2>&1
if errorlevel 1 (
  del /q "%TEMP_ARTIFACT%" >nul 2>&1
  echo ERROR: The generated source package is not a readable ZIP with entries. 1>&2
  exit /b 1
)

move /y "%TEMP_ARTIFACT%" "%ARTIFACT%" >nul 2>&1
if errorlevel 1 (
  del /q "%TEMP_ARTIFACT%" >nul 2>&1
  echo ERROR: Could not install the validated artifact at "%ARTIFACT%". 1>&2
  exit /b 1
)

set "ARTIFACT_SHA256="
set "HASH_FILE=%ARTIFACT%.sha256.tmp"
powershell -NoProfile -ExecutionPolicy Bypass -Command "(Get-FileHash -LiteralPath '%ARTIFACT%' -Algorithm SHA256).Hash" > "%HASH_FILE%" 2>nul
if exist "%HASH_FILE%" set /p ARTIFACT_SHA256=<"%HASH_FILE%"
del /q "%HASH_FILE%" >nul 2>&1
if not defined ARTIFACT_SHA256 (
  echo ERROR: Could not calculate the artifact SHA-256. 1>&2
  exit /b 1
)

for %%F in ("%ARTIFACT%") do set "ARTIFACT_BYTES=%%~zF"
echo Artifact: "%ARTIFACT%"
echo Size: %ARTIFACT_BYTES% bytes
echo SHA-256: %ARTIFACT_SHA256%
echo Source commit: %SOURCE_COMMIT%
echo Package type: unsigned source ZIP; this repository declares no native Deen No installer.
echo No publishing, tagging, or dewing was performed.

popd
exit /b 0
