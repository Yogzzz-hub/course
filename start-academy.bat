@echo off
title Academy - start everything
cd /d "%~dp0"
echo Starting the academy backend in its own window...
start "Academy backend" cmd /k "cd /d "%~dp0backend" && start-backend.bat"
echo Starting the frontend website (keep this window open)...
cd /d "%~dp0frontend"
call npm run dev
pause
