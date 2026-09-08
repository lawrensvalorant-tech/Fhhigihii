@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js 20+ kurulu degil. & pause & exit /b 1)
call npm install
start "" http://localhost:3000
node server.js
