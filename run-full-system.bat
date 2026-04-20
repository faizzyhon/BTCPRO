@echo off
setlocal
title BTC Trading Assistant - Full Local System

cd /d "%~dp0"

echo.
echo ============================================================
echo  BTC Trading Assistant - Full Local System
echo ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is missing. Install Node.js, then run this file again.
  pause
  exit /b 1
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo npm.cmd is missing. Reinstall Node.js, then run this file again.
  pause
  exit /b 1
)

where ollama >nul 2>nul
if errorlevel 1 (
  echo Ollama is not installed or not on PATH.
  echo The app will still run, but local AI will be offline until Ollama is installed.
) else (
  echo Starting Ollama server...
  start "Ollama Server" /min cmd /c "ollama serve"
  timeout /t 3 /nobreak >nul

  echo Pulling/refreshing lfm2.5-thinking model...
  ollama pull lfm2.5-thinking
  if errorlevel 1 (
    echo lfm2.5-thinking pull failed. Trying gemma3:4b fallback so local AI can still run.
    ollama pull gemma3:4b
  )
)

if not exist node_modules (
  echo Installing npm dependencies...
  npm.cmd install
) else (
  echo npm dependencies found.
)

where python >nul 2>nul
if errorlevel 1 (
  echo Python not found. Books Knowledge Server will be offline.
) else (
  echo Starting Books Knowledge Server on port 5001...
  start "Books Server" /min cmd /c "python books_server.py"
  timeout /t 2 /nobreak >nul
)

echo.
echo Starting BTC Trading Assistant at http://127.0.0.1:5173
echo Keep this window open while using the app.
echo.
npm.cmd run dev -- --port 5173

endlocal
