#!/bin/bash

# AI Agent Service 本地开发启动脚本

echo "启动 AI Agent Service (开发模式)..."

# 检查 Python 版本
if ! command -v python3 &> /dev/null; then
    echo "错误: 未找到 Python3"
    exit 1
fi

# 检查虚拟环境
if [ ! -d "venv" ]; then
    echo "创建 Python 虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
source venv/bin/activate

# 安装依赖
echo "安装 Python 依赖..."
pip install -r requirements.txt

# 启动服务
echo "启动 FastAPI 服务 (http://localhost:8000)..."
uvicorn main:app --reload --host 0.0.0.0 --port 8000
