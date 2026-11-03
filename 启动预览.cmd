@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node.exe >nul 2>nul
if errorlevel 1 (
  echo 请先安装 Node.js 22 LTS。
  pause
  exit /b 1
)
if not exist node_modules (
  call npm.cmd ci
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
echo.
echo 新^&怡本地预览：http://127.0.0.1:3000
echo 请保持此窗口打开，按 Ctrl+C 可停止预览。
echo.
call npm.cmd run dev
pause
