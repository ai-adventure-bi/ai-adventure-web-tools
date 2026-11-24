@echo off
cd /d "%~dp0"
node --env-file-if-exists=.env --experimental-sqlite scripts/reset-teacher.mjs
pause
