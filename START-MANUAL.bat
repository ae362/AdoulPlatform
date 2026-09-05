@echo off
echo ===============================================
echo   Adliyyah Platform - Local Launcher (Manual)
echo ===============================================
echo.

:: Check for Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install it from https://nodejs.org/
    pause
    exit /b
)

echo [1/3] Starting Backend...
cd backend
if not exist "node_modules\" (
    echo   Installing backend dependencies...
    call npm install
)
start "Adliyyah Backend" cmd /c "npm run dev"
cd ..

echo [2/3] Starting Frontend...
cd frontend
if not exist "node_modules\" (
    echo   Installing frontend dependencies...
    call npm install
)
:: Use call npm run dev to ensure the local vite binary is used
start "Adliyyah Frontend" cmd /c "npm run dev -- --port 5143"
cd ..

echo.
echo [3/3] Waiting for servers to initialize...
timeout /t 10 /nobreak >nul

echo.
echo ===============================================
echo   SUCCESS! The app is starting.
echo   Frontend: http://localhost:5143
echo   Backend:  http://localhost:4000
echo ===============================================
echo.
echo Opening browser...
start http://localhost:5143
echo.
echo Note: Keep the two spawned terminal windows open.
echo To stop the app, close those windows.
pause