@echo off
setlocal

where node >nul 2>nul
if errorlevel 1 (
  echo Нужен Node.js 18 или новее: https://nodejs.org/
  pause
  exit /b 1
)

node "%~dp0qa-report-agent.js"
set "agentExitCode=%errorlevel%"

pause
exit /b %agentExitCode%
