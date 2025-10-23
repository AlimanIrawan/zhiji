# 脂记应用 - Garmin Connect 后端服务

这是脂记应用的独立Python后端服务，专门处理Garmin Connect数据同步。

## 功能特性

- Garmin Connect 用户认证
- 获取每日健康数据汇总
- 获取活动数据
- 获取睡眠数据
- 获取心率数据
- 支持多日数据批量获取

## API 端点

### 健康检查
```
GET /health
```

### Garmin登录
```
POST /api/garmin/login
Content-Type: application/json

{
  "email": "your-email@example.com",
  "password": "your-password"
}
```

### 数据同步
```
POST /api/garmin/sync
Content-Type: application/json

{
  "date": "2024-01-15",  // 可选，默认今天
  "days": 7              // 可选，默认7天
}
```

### 用户信息
```
POST /api/garmin/user-info
```

## 本地开发

1. 安装依赖：
```bash
pip install -r requirements.txt
```

2. 运行服务：
```bash
python app.py
```

服务将在 http://localhost:5000 启动

## 部署到Render

1. 将代码推送到GitHub仓库
2. 在Render.com创建新的Web Service
3. 连接GitHub仓库
4. 使用以下设置：
   - Environment: Python 3
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn --bind 0.0.0.0:$PORT app:app`

## 环境变量

- `PORT`: 服务端口（Render自动设置）
- `DEBUG`: 调试模式（可选，默认false）

## 依赖库

- Flask: Web框架
- Flask-CORS: 跨域支持
- python-garminconnect: Garmin Connect API客户端
- gunicorn: WSGI服务器