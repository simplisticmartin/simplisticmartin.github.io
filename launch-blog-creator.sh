#!/bin/bash
# Blog Post Creator Launcher for macOS/Linux

cd "$(dirname "$0")"

if [ -f "blog-post-creator.py" ]; then
    python3 blog-post-creator.py
else
    echo "Error: blog-post-creator.py not found"
    exit 1
fi
