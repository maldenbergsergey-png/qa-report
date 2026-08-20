@echo off
where node >nul 2>nul
if errorlevel 1 (
  echo Нужен Node.js 18 или новее: https://nodejs.org/
  pause
  exit /b 1
)
cd /d "%~dp0"
node qa-report-agent.js
pause
