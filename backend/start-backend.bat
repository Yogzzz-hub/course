@echo off
title Academy backend
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo Creating the Python environment for the first time...
  py -3 -m venv .venv 2>nul || python -m venv .venv
)
if not exist ".venv\Scripts\python.exe" (
  echo.
  echo Python was not found. Install Python 3.11 or newer from python.org, tick "Add python.exe to PATH", then run this again.
  pause
  exit /b 1
)
echo Installing the backend requirements...
".venv\Scripts\python.exe" -m pip install -q -r requirements.txt
if errorlevel 1 (
  echo.
  echo The requirements could not be installed. Read the message above, then run this again.
  pause
  exit /b 1
)
set APP_ENV=development
echo.
echo Academy backend starting on http://127.0.0.1:8000
echo Keep this window open while you use the site.
echo.
".venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
echo.
echo The backend stopped. Read the message above.
pause
