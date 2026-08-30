@echo off
title Servidor Minim Mon
cd /d "%~dp0"
powershell -Command "Start-Process -FilePath 'node' -ArgumentList 'node_modules/vite/bin/vite.js --host 0.0.0.0 --port 5173' -WindowStyle Hidden"
echo Servidor engegat correctament en segon pla a http://localhost:5173
timeout /t 2 >nul
exit
