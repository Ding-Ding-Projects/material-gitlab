@echo off
setlocal EnableExtensions

rem Packaging is intentionally fail-closed until a verified app icon and Squirrel
rem configuration are committed. This script must never publish or execute deployment.
if /I not "%~1"=="/s" if /I not "%~1"=="--silent" echo Installer packaging is not configured for this preview package.
echo No installer was produced: Squirrel.Windows metadata and a verified app icon are not present.
echo The preview package is unsigned and does not create hosts, contact SSH, or expose ports.
exit /b 2
