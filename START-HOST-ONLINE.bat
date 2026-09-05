@echo off
chcp 65001 >nul
title Adoul Platform - Host Online (Public URL via Cloudflare Tunnel)
cls

echo ================================================================
echo   🌐 Adoul Platform - Host Online (Public Internet URL)
echo ================================================================
echo.
echo [1/3] Starting Backend Server (Port 4000)...
start "Adoul Backend Server" cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak >nul

echo [2/3] Starting Frontend Server (Port 5173)...
start "Adoul Frontend Server" cmd /k "cd frontend && npm run host"

timeout /t 3 /nobreak >nul

echo [3/3] Creating a secure Public HTTPS Tunnel via Cloudflare...
echo       (Anyone on the internet can access this URL)
echo.
npx cloudflared tunnel --url http://localhost:5173

pause

