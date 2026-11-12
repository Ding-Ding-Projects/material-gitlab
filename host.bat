@echo off
rem One-click host for Material GitLab on Windows.
rem
rem   host.bat            start (or update) the instance and open it in the browser
rem   host.bat /s         same, silent: never prompts, exits non-zero on the first failure
rem   host.bat status     show the container state and the LAN address
rem   host.bat stop       stop the container (data is kept)
rem   host.bat logs       follow the container log
rem
rem Everything happens in deploy\windows\host.ps1; this file only launches it so a double
rem click works from Explorer. The script never prints secrets and never deletes data.
setlocal
set "HERE=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%HERE%deploy\windows\host.ps1" %*
set "CODE=%ERRORLEVEL%"
if /I not "%~1"=="/s" if /I not "%~1"=="--silent" if not "%SILENT%"=="1" (
  echo.
  pause
)
exit /b %CODE%
