@echo off
setlocal EnableExtensions

rem Always package from this package directory. This script builds and verifies
rem unsigned local artifacts only; it never deploys, publishes, tags, or signs.
pushd "%~dp0" || (echo Could not enter the deployer package directory. & exit /b 1)

set "REQUESTED_SILENT=%SILENT%"
set "SILENT=0"
if /I "%~1"=="/s" set "SILENT=1"
if /I "%~1"=="--silent" set "SILENT=1"
if /I "%REQUESTED_SILENT%"=="1" set "SILENT=1"

if "%SILENT%"=="0" echo [1/3] Building the deployer package...
call "%~dp0build.bat" /s
if errorlevel 1 (
  echo Build failed; no installer assets were accepted.
  exit /b %errorlevel%
)

if "%SILENT%"=="0" echo [2/3] Creating unsigned Squirrel.Windows assets...
call npm run package:squirrel
if errorlevel 1 (
  echo Squirrel.Windows packaging failed; no installer assets were accepted.
  exit /b %errorlevel%
)

set "ASSET_DIR=%CD%\dist\squirrel-windows"
set "SETUP=%ASSET_DIR%\Setup.exe"
set "RELEASES=%ASSET_DIR%\RELEASES"
set "FULL_PACKAGE="
for %%F in ("%ASSET_DIR%\*-full.nupkg") do if exist "%%~fF" set "FULL_PACKAGE=%%~fF"

if not exist "%SETUP%" (
  echo Required Squirrel asset is missing: %SETUP%
  exit /b 3
)
if not exist "%RELEASES%" (
  echo Required Squirrel asset is missing: %RELEASES%
  exit /b 3
)
if not defined FULL_PACKAGE (
  echo Required Squirrel full package is missing under %ASSET_DIR%
  exit /b 3
)

node scripts\verify-unsigned.mjs "%SETUP%"
if errorlevel 1 exit /b %errorlevel%

if "%SILENT%"=="0" echo [3/3] Required unsigned Squirrel assets verified.
for %%F in ("%SETUP%" "%RELEASES%" "%FULL_PACKAGE%") do (
  echo SHA-256 %%~fF
  certutil.exe -hashfile "%%~fF" SHA256
  if errorlevel 1 exit /b 1
)
echo Setup.exe is unsigned. Windows may show an unknown-publisher or SmartScreen warning.
echo Installer assets: %ASSET_DIR%
exit /b 0
