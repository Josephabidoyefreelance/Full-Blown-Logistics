@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0FIX-DRIVERS-ROUTE.ps1"
pause
