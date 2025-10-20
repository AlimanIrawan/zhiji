#!/bin/bash

echo "======================================"
echo "       脂记 - 本地开发启动脚本"
echo "======================================"
echo ""

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 检查Python是否安装
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误: 未检测到Python3"
    echo "请先安装Python3: https://www.python.org/downloads/"
    exit 1
fi

echo "✅ Python3 已安装"

# 创建虚拟环境(如果不存在)
if [ ! -d "backend/venv" ]; then
    echo "📦 创建Python虚拟环境..."
    cd backend
    python3 -m venv venv
    cd ..
    echo "✅ 虚拟环境创建完成"
fi

# 激活虚拟环境
echo "🔄 激活虚拟环境..."
source backend/venv/bin/activate

# 安装依赖
echo "📦 安装后端依赖..."
pip install -r backend/requirements.txt > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ 依赖安装完成"
else
    echo "❌ 依赖安装失败"
    exit 1
fi

# 检查环境变量配置
if [ ! -f "backend/.env" ]; then
    echo ""
    echo "⚠️  未找到环境变量配置文件"
    echo "请复制 backend/env.template 为 backend/.env 并填写配置信息:"
    echo "  cp backend/env.template backend/.env"
    echo "  nano backend/.env"
    echo ""
    read -p "是否现在创建配置文件? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cp backend/env.template backend/.env
        echo "✅ 配置文件已创建,请编辑 backend/.env 填写API密钥"
        echo "按回车键继续(或Ctrl+C退出)..."
        read
    fi
fi

# 启动后端服务
echo ""
echo "🚀 启动后端服务..."
echo "📡 后端地址: http://localhost:5001"
echo ""
cd backend
export FLASK_ENV=development
export PORT=5001
python3 app.py &
BACKEND_PID=$!
cd ..

# 等待后端启动
sleep 2

# 检查后端是否启动成功
if curl -s http://localhost:5001/health > /dev/null; then
    echo "✅ 后端服务启动成功"
else
    echo "❌ 后端服务启动失败"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# 启动前端服务
echo ""
echo "🚀 启动前端服务..."
echo "📱 前端地址: http://localhost:8000"
echo ""

cd frontend

# 使用Python内置的HTTP服务器
python3 -m http.server 8000 &
FRONTEND_PID=$!

# 等待前端启动
sleep 2

# 自动打开浏览器
echo "🌐 正在打开浏览器..."
open http://localhost:8000

echo ""
echo "======================================"
echo "  ✅ 应用已启动"
echo "  🔧 后端: http://localhost:5001"
echo "  📱 前端: http://localhost:8000"
echo ""
echo "  按 Ctrl+C 停止服务"
echo "======================================"
echo ""

# 捕获退出信号,清理进程
trap "echo ''; echo '🛑 正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo '✅ 服务已停止'; exit 0" INT TERM

# 保持脚本运行
wait

