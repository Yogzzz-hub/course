@echo off
title Academy backend
cd /d "%~dp0"
set APP_ENV=development
echo.
echo Academy backend starting on http://127.0.0.1:8000
echo Keep this window open while you use the site.
echo.
py -3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000
echo.
echo The backend stopped. Read the message above.
pause
try { 'backend ' + (Invoke-WebRequest http://127.0.0.1:8000/v1/health -UseBasicParsing).StatusCode } catch { 'backend DOWN' }; try { 'site ' + (Invoke-WebRequest http://127.0.0.1:5174/login -UseBasicParsing).StatusCode } catch { 'site 5174 DOWN' }