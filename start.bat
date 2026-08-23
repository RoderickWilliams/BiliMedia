@echo off
chcp 65001 >nul
title BiliMedia
setlocal enabledelayedexpansion

:: ============================================================
::  BiliMedia 一键启动脚本（生产模式）
::  - 自动安装依赖、构建前后端
::  - 后端 Express 同时提供 API 和前端静态页面
::  - 单端口 http://localhost:5000
:: ============================================================

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

:: ---------- 检查 Node.js ----------
where node >nul 2>nul
if errorlevel 1 (
    echo [X] 未找到 Node.js
    echo.
    echo 请先安装 Node.js 18+ : https://nodejs.org/
    echo 安装时勾选 "Add to PATH"，然后重新运行此脚本。
    pause
    exit /b 1
)
for /f "usebackq delims=" %%v in (`node -v`) do set "NODE_VER=%%v"
echo [√] Node.js %NODE_VER%

:: ---------- 安装后端依赖 ----------
if not exist "%ROOT%\bilimedia-backend\node_modules" (
    echo [*] 首次运行，正在安装后端依赖...
    cd /d "%ROOT%\bilimedia-backend"
    call npm install --no-audit --no-fund
    if errorlevel 1 (
        echo [X] 后端依赖安装失败
        pause
        exit /b 1
    )
)

:: ---------- 安装前端依赖 ----------
if not exist "%ROOT%\bilimedia-frontend\node_modules" (
    echo [*] 首次运行，正在安装前端依赖...
    cd /d "%ROOT%\bilimedia-frontend"
    call npm install --no-audit --no-fund
    if errorlevel 1 (
        echo [X] 前端依赖安装失败
        pause
        exit /b 1
    )
)

:: ---------- 构建前端 ----------
if not exist "%ROOT%\bilimedia-frontend\dist\index.html" (
    echo [*] 正在构建前端...
    cd /d "%ROOT%\bilimedia-frontend"
    call npm run build
    if errorlevel 1 (
        echo [X] 前端构建失败
        pause
        exit /b 1
    )
)

:: ---------- 构建后端 ----------
if not exist "%ROOT%\bilimedia-backend\dist\index.js" (
    echo [*] 正在构建后端...
    cd /d "%ROOT%\bilimedia-backend"
    call npm run build
    if errorlevel 1 (
        echo [X] 后端构建失败
        pause
        exit /b 1
    )
)

:: ---------- 启动 ----------
echo.
echo ========================================================
echo   BiliMedia 启动中 ...
echo   地址: http://localhost:5000
echo   按 Ctrl+C 停止
echo ========================================================
echo.

set "PORT=5000"
set "NODE_ENV=production"
set "BILIMEDIA_FRONTEND_DIST=%ROOT%\bilimedia-frontend\dist"
set "BILIMEDIA_DATA_DIR=%ROOT%\bilimedia-backend\data"

cd /d "%ROOT%\bilimedia-backend"
start "" "http://localhost:5000"
node dist/index.js

pause
endlocal
