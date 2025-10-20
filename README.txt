====================================
    脂记 - 减脂进度追踪应用
====================================

一个功能完整的减脂健身管理应用，支持饮食记录、Garmin数据同步、AI营养分析等功能。

------------------------------------
【核心功能】
------------------------------------

✅ 饮食记录
  - 拍照或文字记录每日饮食
  - AI自动分析营养成分(OpenAI GPT-4o)
  - 实时计算热量、蛋白质、碳水、脂肪
  - 智能饮食建议
  - ⚠️ 必须配置OpenAI API Key才能使用

✅ 进度追踪
  - 可视化减脂进度(环形图)
  - 每日脂肪变化计算
  - 日历视图展示历史数据
  - 自动计算剩余天数

✅ Garmin集成
  - 自动同步运动手表数据
  - 智能同步策略(避免频繁请求)
  - 步数、心率、卡路里消耗
  - 训练类型识别(有氧/无氧)

✅ 数据持久化
  - Upstash Redis云存储
  - 跨设备数据同步
  - 自动备份

------------------------------------
【技术架构】
------------------------------------

前端 (Vercel)
  - 纯静态HTML + JavaScript
  - Tailwind CSS响应式设计
  - 移动端优先

后端 (Render)
  - Python Flask框架
  - RESTful API设计
  - OpenAI GPT-4 Vision
  - Garminconnect库

数据库
  - Upstash Redis (Vercel集成)

------------------------------------
【本地开发】
------------------------------------

1. 配置环境变量
   
   复制并编辑配置文件:
   cp backend/env.template backend/.env
   nano backend/.env
   
   填写以下信息:
   - OPENAI_API_KEY: OpenAI API密钥(必填)
   - GARMIN_EMAIL: Garmin账号邮箱(可选)
   - GARMIN_PASSWORD: Garmin账号密码(可选)
   - SECRET_KEY: Flask密钥(随机字符串)
   - REDIS_URL: Redis连接地址(可选,不填使用内存模式)
   
   ⚠️ 重要: OPENAI_API_KEY 是必填项,否则无法使用食物分析功能

2. 启动应用
   
   双击运行: start_local.sh
   
   或命令行:
   ./start_local.sh
   
   应用将自动:
   - 创建Python虚拟环境
   - 安装依赖
   - 启动后端 (http://localhost:5000)
   - 启动前端 (http://localhost:8000)
   - 自动打开浏览器

3. 停止应用
   
   在终端按 Ctrl+C

------------------------------------
【部署到云端】
------------------------------------

1. 推送到GitHub
   
   双击运行: git_push.sh
   
   或命令行:
   ./git_push.sh
   
   脚本会自动:
   - 初始化Git仓库
   - 配置远程仓库
   - 提交并推送代码

2. 部署前端到Vercel
   
   a. 访问 https://vercel.com 并登录
   b. 点击 "New Project"
   c. 导入你的GitHub仓库
   d. 配置项目:
      - Framework Preset: Other
      - Root Directory: frontend
      - Build Command: 留空
      - Output Directory: .
   e. 添加Upstash Redis集成:
      - 在项目设置中点击 "Storage"
      - 选择 "Create Database" -> Upstash Redis
      - 系统会自动注入 REDIS_URL 环境变量
   f. 点击 "Deploy"

3. 部署后端到Render
   
   a. 访问 https://render.com 并登录
   b. 点击 "New +" -> "Web Service"
   c. 连接你的GitHub仓库
   d. 配置项目:
      - Name: zhiji-backend (或其他名称)
      - Environment: Python
      - Region: Oregon (免费)
      - Branch: main
      - Root Directory: backend
      - Build Command: pip install -r requirements.txt
      - Start Command: gunicorn app:app
   e. 配置环境变量:
      - OPENAI_API_KEY: (你的OpenAI API密钥)
      - GARMIN_EMAIL: (你的Garmin邮箱)
      - GARMIN_PASSWORD: (你的Garmin密码)
      - REDIS_URL: (从Vercel项目的环境变量中复制)
      - SECRET_KEY: (生成随机字符串,例如: openssl rand -hex 32)
      - FRONTEND_URL: (你的Vercel前端地址)
      - PYTHON_VERSION: 3.11.0
   f. 点击 "Create Web Service"

4. 更新前端配置
   
   a. 获取Render后端地址(例如: https://zhiji-backend.onrender.com)
   b. 在Vercel项目中添加环境变量:
      - 进入项目设置 -> Environment Variables
      - 添加: VITE_API_URL = (你的Render后端地址)
   c. 编辑 frontend/config.js:
      将 baseURL 的生产环境地址改为你的Render地址
   d. 重新部署前端

5. 测试
   
   访问你的Vercel地址,测试所有功能是否正常

------------------------------------
【项目结构】
------------------------------------

脂记/
├── frontend/                 # 前端代码
│   ├── index.html           # 主页面
│   ├── config.js            # 配置文件
│   ├── api.js               # API客户端
│   ├── api-integration.js   # API集成层
│   └── vercel.json          # Vercel配置
│
├── backend/                 # 后端代码
│   ├── app.py               # Flask主应用
│   ├── requirements.txt     # Python依赖
│   ├── render.yaml          # Render配置
│   ├── env.template         # 环境变量模板
│   └── services/            # 服务模块
│       ├── redis_service.py      # Redis数据存储
│       ├── openai_service.py     # OpenAI食物识别
│       ├── garmin_service.py     # Garmin数据同步
│       └── fat_calculator.py     # 脂肪变化计算
│
├── .gitignore               # Git忽略文件
├── start_local.sh           # 本地启动脚本 (双击运行)
├── git_push.sh              # Git推送脚本 (双击运行)
└── README.txt               # 说明文档 (本文件)

------------------------------------
【常见问题】
------------------------------------

Q: 启动脚本无法运行?
A: 确保脚本有执行权限:
   chmod +x start_local.sh git_push.sh

Q: OpenAI API调用失败?
A: 检查以下几点:
   1. API密钥是否正确配置在 backend/.env 中
   2. 账户是否有余额
   3. 是否有GPT-4o模型访问权限
   4. 网络连接是否正常
   ⚠️ 注意:本应用只使用真实AI分析,不提供降级方案

Q: Garmin同步失败?
A: Garmin使用社区库,可能遇到以下问题:
   1. 账号密码错误
   2. 需要两步验证(暂不支持)
   3. Garmin服务器限流
   如果无法解决,系统会自动使用模拟数据

Q: Render服务冷启动慢?
A: Render免费版会在15分钟无请求后休眠,
   首次访问需要等待30秒左右启动。
   建议使用定时任务定期唤醒服务。

Q: 数据会丢失吗?
A: 如果配置了Redis,数据会持久化保存。
   如果使用内存模式,重启后数据会丢失。

Q: 如何备份数据?
A: Redis数据会自动备份到Upstash云端。
   也可以导出JSON格式手动备份(功能待开发)。

------------------------------------
【更新日志】
------------------------------------

v1.0.0 (2025-01-XX)
  - 初始版本发布
  - 完整的前后端功能
  - OpenAI食物识别
  - Garmin数据同步
  - Upstash Redis持久化
  - 脂肪变化算法

------------------------------------
【开发者信息】
------------------------------------

技术栈:
  前端: HTML, JavaScript, Tailwind CSS
  后端: Python, Flask, OpenAI, Garminconnect
  数据库: Upstash Redis
  部署: Vercel (前端), Render (后端)

依赖版本:
  Python: 3.11+
  Flask: 3.0.0
  OpenAI: 1.12.0
  Garminconnect: 0.2.12
  Redis: 5.0.1

------------------------------------
【许可证】
------------------------------------

本项目仅供个人学习和使用。

------------------------------------
【联系方式】
------------------------------------

如有问题或建议,请通过GitHub Issues反馈。

祝您减脂成功！💪

