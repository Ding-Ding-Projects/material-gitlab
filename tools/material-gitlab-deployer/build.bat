@echo off
setlocal EnableExtensions

rem Always own the build from this package directory, even when invoked from the repository root.
pushd "%~dp0" || (echo Could not enter the deployer package directory. & exit /b 1)

rem Build the deployer from a clean Windows checkout. No deployment or shell execution occurs.
if /I "%~1"=="/s" set "SILENT=1"
if /I "%~1"=="--silent" set "SILENT=1"
if "%SILENT%"=="1" goto :silent

echo [1/2] Checking Node.js and npm...
where node >nul 2>nul || (echo Node.js 20+ is required. Install it from https://nodejs.org/ and retry. & exit /b 1)
where npm >nul 2>nul || (echo npm is required with Node.js. & exit /b 1)
echo [2/2] Installing dependencies and compiling TypeScript...
if exist package-lock.json (call npm ci) else (call npm install)
if errorlevel 1 exit /b %errorlevel%
call npm run build
if errorlevel 1 exit /b %errorlevel%
echo Build complete. The preview shell does not execute deployment commands.
if defined CI exit /b 0
choice /C YN /N /M "Launch the preview shell now? [Y/N] "
if errorlevel 2 exit /b 0
call npm start
exit /b %errorlevel%

:silent
where node >nul 2>nul || (echo Node.js 20+ is required. & exit /b 1)
where npm >nul 2>nul || (echo npm is required with Node.js. & exit /b 1)
if exist package-lock.json (call npm ci) else (call npm install)
if errorlevel 1 exit /b %errorlevel%
call npm run build
exit /b %errorlevel%
