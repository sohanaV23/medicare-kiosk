@echo off
title MediVoice Kiosk Bootstrapper
echo =======================================================
echo           MEDIVOICE KIOSK SYSTEM STARTUP
echo =======================================================
echo.
echo [Step 1/2] Verifying and installing Node.js dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo.
    echo ERROR: Dependency installation failed. Please check your Node.js/npm configuration.
    pause
    exit /b %ERRORLEVEL%
)
echo.
echo [Step 2/2] Starting MediVoice Kiosk (Express + Vite Dev Mode)...
echo The application will run in hot-reload/development mode.
echo Server will be live at: http://localhost:3000
echo.
call npm run dev
pause
