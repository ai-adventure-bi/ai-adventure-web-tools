@echo off
cd /d "%~dp0"
echo Building Quake Quest with your latest colours and settings...
call npm.cmd run build
if errorlevel 1 (
  echo Build failed. Check that Node.js is installed and run npm ci for first-time setup.
  pause
  exit /b 1
)
if exist ".quake-venv\Scripts\python.exe" (
  ".quake-venv\Scripts\python.exe" server\quake_api.py
) else if exist "investigation\.venv\Scripts\python.exe" (
  "investigation\.venv\Scripts\python.exe" server\quake_api.py
) else (
  echo Python environment missing. See DEPLOYMENT.md for one-time setup.
)
pause
