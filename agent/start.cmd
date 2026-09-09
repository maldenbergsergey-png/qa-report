@echo off
setlocal

where node >nul 2>nul
if errorlevel 1 (
  echo Нужен Node.js 22 или новее: https://nodejs.org/
  pause
  exit /b 1
)

rem Trust corporate certificates installed in the Windows certificate store.
rem Older Node.js versions safely ignore this environment variable.
set "NODE_USE_SYSTEM_CA=1"

node "%~dp0qa-report-agent.js"
set "agentExitCode=%errorlevel%"

pause
exit /b %agentExitCode%
