@echo off
chcp 65001 >nul
title BiliMedia - 一键启动 (前后端 Dev)
setlocal enabledelayedexpansion

:: ============================================================
::  BiliMedia 本地开发一键启动脚本
::  - 后端: Express + ts-node  ->  http://localhost:5000
::  - 前端: Vite (React 18)    ->  http://localhost:5173
::  - /api 会由 Vite proxy 自动转发到 5000
:: ============================================================

:: ---------- 1. 定位关键目录 ----------
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

:: _tools 默认位于 F:\项目\_tools\nodejs（即 ROOT 的兄弟目录）
set "NODE_1=%ROOT%\_tools\nodejs"
for %%I in ("%ROOT%") do set "PARENT=%%~dpI"
if "%PARENT:~-1%"=="\" set "PARENT=%PARENT:~0,-1%"
set "NODE_2=%PARENT%\_tools\nodejs"
set "NODE_ABS=F:\项目\_tools\nodejs"

set "NODE_DIR="
if exist "%NODE_ABS%\node.exe"       set "NODE_DIR=%NODE_ABS%"
if not defined NODE_DIR if exist "%NODE_2%\node.exe"   set "NODE_DIR=%NODE_2%"
if not defined NODE_DIR if exist "%NODE_1%\node.exe"   set "NODE_DIR=%NODE_1%"

if defined NODE_DIR (
    set "PATH=%NODE_DIR%;%PATH%"
    echo [√] 使用 Node.js: !NODE_DIR!
) else (
    echo [!] 未在 _tools 下找到 node.exe，尝试使用系统 PATH ...
)

where node >nul 2>nul
if errorlevel 1 (
    echo [X] 未找到可用的 Node.js，请安装到 F:\项目\_tools\nodejs 再重试。
    pause
    exit /b 1
)
for /f "usebackq delims=" %%v in (`node -v`) do echo [√] Node 版本: %%v

if not exist "%ROOT%\bilimedia-backend\src\index.ts" (
    echo [X] 找不到 bilimedia-backend\src\index.ts，请确认此 bat 在 F:\项目\BiliMedia 目录下。
    pause
    exit /b 1
)

echo.
echo ========================================================
echo   BiliMedia 正在启动 ...
echo     后端 (API)    http://localhost:5000
echo     前端 (界面)    http://localhost:5173
echo   关闭 "BiliMedia 后端" / "BiliMedia 前端" 窗口即可停止
echo ========================================================
echo.

:: ---------- 2. 启动 后端 (独立窗口) ----------
start "BiliMedia 后端 - Express :5000" cmd /k ^
    "cd /d %ROOT%\bilimedia-backend && echo [后端] 正在加载 ts-node -> src/index.ts && node node_modules\ts-node\dist\bin.js src\index.ts || echo [后端异常，按回车退出] & pause"

timeout /t 3 /nobreak >nul

:: ---------- 3. 启动 前端 Vite (独立窗口) ----------
start "BiliMedia 前端 - Vite :5173" cmd /k ^
    "cd /d %ROOT%\bilimedia-frontend && echo [前端] 正在启动 Vite dev server && node node_modules\vite\bin\vite.js --host 0.0.0.0 --port 5173 || echo [前端异常，按回车退出] & pause"

:: ---------- 4. 5s 后自动打开浏览器 ----------
timeout /t 5 /nobreak >nul
start "" "http://localhost:5173"

echo.
echo [√] 启动完成！浏览器已打开 http://localhost:5173
echo     关闭后端/前端窗口即可停止服务。
pause
endlocal
