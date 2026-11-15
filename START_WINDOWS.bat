@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
    echo Node.js 20 or newer is required to start the developer server.
    echo You can also double-click touchline-xi-standalone.html instead.
    pause
    exit /b 1
)
echo Starting Touchline XI at http://localhost:4173
start "Touchline XI browser" "http://localhost:4173"
node server.mjs
pause
