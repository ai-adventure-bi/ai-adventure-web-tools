@echo off
title TopBot Launcher
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-topbot.ps1"
if errorlevel 1 (
  echo.
  echo TopBot did not start. Read the message above for details.
  pause
)
