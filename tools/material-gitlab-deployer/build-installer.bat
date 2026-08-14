@echo off
setlocal EnableExtensions

pushd "%~dp0" || (echo Could not enter the deployer package directory. & exit /b 1)
set "SILENT="
if /I "%~1"=="/s" set "SILENT=1"
if /I "%~1"=="--silent" set "SILENT=1"

where node >nul 2>nul || (echo Node.js 20+ is required. & exit /b 1)
where npm >nul 2>nul || (echo npm is required with Node.js. & exit /b 1)
if exist package-lock.json (call npm ci) else (call npm install)
if errorlevel 1 exit /b %errorlevel%

echo [1/3] Building the packaged Electron application...
call npm run build
if errorlevel 1 exit /b %errorlevel%
echo [2/3] Producing unsigned Squirrel.Windows assets...
call npx --no-install electron-builder --win squirrel
if errorlevel 1 exit /b %errorlevel%
echo [3/3] Verifying Setup.exe, RELEASES, and the full nupkg...
call npm run verify-package
if errorlevel 1 exit /b %errorlevel%
echo Installer packaging complete. Code signing is disabled; no deployment or publication occurred.
if defined CI exit /b 0
if /I "%SILENT%"=="1" exit /b 0
choice /C YN /N /M "Launch the packaged preview shell now? [Y/N] "
if errorlevel 2 exit /b 0
start "Material GitLab Deployer" "%~dp0dist\squirrel-windows\win-unpacked\Material GitLab Deployer.exe"
exit /b %errorlevel%
