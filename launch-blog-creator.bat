@echo off
REM Blog Post Creator Launcher for Windows
REM This script launches the Blog Post Creator application

cd /d "%~dp0"

if exist "blog-post-creator.py" (
    python blog-post-creator.py
) else (
    echo Error: blog-post-creator.py not found
    pause
)
