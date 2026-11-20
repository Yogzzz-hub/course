@echo off
title Academy - start everything
cd /d "%~dp0"
echo Starting the academy backend in its own window...
start "Academy backend" cmd /k ""%~dp0backend\start-backend.bat""
echo Starting the website (keep this window open)...
call npm run dev
pause
