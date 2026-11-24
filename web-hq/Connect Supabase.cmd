@echo off
title Site Studio - Connect Supabase
cd /d "%~dp0"
node --experimental-sqlite scripts/setup-supabase.mjs
pause
