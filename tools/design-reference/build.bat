@echo off
setlocal
set "SILENT=0"
if /I "%~1"=="/s" set "SILENT=1"
if /I "%~1"=="--silent" set "SILENT=1"
if "%SILENT%"=="1" set "NPM_CONFIG_FUND=false" & set "NPM_CONFIG_AUDIT=false"
cd /d "%~dp0"
call npm install --ignore-scripts
if errorlevel 1 exit /b %errorlevel%
call npm run validate
if errorlevel 1 exit /b %errorlevel%
if "%SILENT%"=="1" exit /b 0
echo Design reference app validated. Run npm start to open a deterministic route.
exit /b 0
