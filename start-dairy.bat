@echo off
title Pashu Khadya Ledger - Dairy Cooperative Society
color 0A

echo ===================================================
echo     पशू खाद्य खतावणी प्रणाली (Dairy Ledger)
echo ===================================================
echo.
echo Server chalu hot ahe, krupaya thamba... (Starting server...)
echo.

cd /d "%~dp0"
start http://localhost:5000
node backend/src/server.js

pause
