#!/bin/bash

# 激活虚拟环境
source .venv/bin/activate

# 启动FastAPI服务器
uvicorn main:app --host 0.0.0.0 --port 8000 --reload