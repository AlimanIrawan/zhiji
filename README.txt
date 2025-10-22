====================================
    脂记 - 减脂进度追踪应用
====================================

一个功能完整的减脂健身管理应用，支持饮食记录、Garmin数据同步、AI营养分析等功能。
基于 Next.js 14 构建的现代化全栈应用，完全部署在 Vercel 平台上。

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
  - Vercel KV (Redis) 存储
  - Vercel Blob 文件存储
  - 跨设备数据同步
  - 自动备份

------------------------------------
【技术架构】
------------------------------------

🚀 现代化全栈架构 (Vercel)
  - Next.js 14 App Router
  - TypeScript + React
  - Tailwind CSS 响应式设计
  - 服务端渲染 (SSR)
  - API Routes (内置后端)

🔧 核心技术栈
  - 前端框架: Next.js 14 + React 18
  - 样式系统: Tailwind CSS
  - 类型检查: TypeScript
  - 状态管理: React Hooks
  - UI组件: Lucide React Icons

🗄️ 数据存储
  - Vercel KV: 结构化数据存储 (Redis)
  - Vercel Blob: 文件和图片存储
  - 本地缓存: 浏览器 localStorage

🤖 AI & 集成
  - OpenAI GPT-4 Vision: 图片营养分析
  - Garmin Connect: 运动数据同步
  - 自动化调度: 定时同步任务

------------------------------------
【项目结构】
------------------------------------

zhiji-app/                    # Next.js 应用根目录
├── src/
│   ├── app/                  # App Router 页面
│   │   ├── api/             # API 路由 (后端接口)
│   │   │   ├── food/        # 饮食相关 API
│   │   │   ├── garmin/      # Garmin 同步 API
│   │   │   ├── summary/     # 数据汇总 API
│   │   │   └── upload/      # 文件上传 API
│   │   ├── food/            # 饮食记录页面
│   │   ├── garmin/          # Garmin 数据页面
│   │   └── page.tsx         # 首页
│   ├── components/          # React 组件
│   ├── lib/                 # 工具库和服务
│   │   ├── garmin-service.ts    # Garmin 数据服务
│   │   ├── openai-service.ts    # OpenAI API 服务
│   │   ├── kv.ts               # 数据存储服务
│   │   └── utils.ts            # 工具函数
│   └── types/               # TypeScript 类型定义
├── package.json             # 依赖配置
├── next.config.js          # Next.js 配置
├── tailwind.config.js      # Tailwind 配置
└── tsconfig.json           # TypeScript 配置

------------------------------------
【部署说明】
------------------------------------

🌐 Vercel 部署 (推荐)
  1. 连接 GitHub 仓库到 Vercel
  2. 配置环境变量:
     - OPENAI_API_KEY: OpenAI API 密钥
     - GARMIN_USERNAME: Garmin 用户名
     - GARMIN_PASSWORD: Garmin 密码
     - KV_URL, KV_REST_API_URL, KV_REST_API_TOKEN: Vercel KV 配置
     - BLOB_READ_WRITE_TOKEN: Vercel Blob 配置
  3. 自动部署完成

📱 本地开发
  1. 克隆仓库: git clone [repository-url]
  2. 进入目录: cd zhiji-app
  3. 安装依赖: npm install
  4. 配置环境变量: 复制 .env.example 到 .env.local
  5. 启动开发服务器: npm run dev
  6. 访问: http://localhost:3000

------------------------------------
【环境变量配置】
------------------------------------

必需配置:
- OPENAI_API_KEY=sk-xxx           # OpenAI API 密钥
- GARMIN_USERNAME=your_username   # Garmin Connect 用户名
- GARMIN_PASSWORD=your_password   # Garmin Connect 密码

Vercel 服务配置 (自动生成):
- KV_URL=redis://xxx              # Vercel KV Redis URL
- KV_REST_API_URL=https://xxx     # Vercel KV REST API
- KV_REST_API_TOKEN=xxx           # Vercel KV 访问令牌
- BLOB_READ_WRITE_TOKEN=xxx       # Vercel Blob 访问令牌

------------------------------------
【功能特性】
------------------------------------

🎯 智能化
  - AI 图片识别营养成分
  - 自动计算每日营养摄入
  - 智能饮食建议
  - 自动同步运动数据

📊 数据可视化
  - 环形进度图表
  - 营养成分分布图
  - 历史趋势分析
  - 日历热力图

📱 移动优先
  - 响应式设计
  - 触摸友好界面
  - 离线数据缓存
  - PWA 支持

🔒 数据安全
  - 加密存储
  - 安全的 API 调用
  - 用户隐私保护
  - 自动备份机制

------------------------------------
【更新日志】
------------------------------------

v2.0.0 (2024-10-22)
- 🚀 重构为 Next.js 14 全栈应用
- 🗄️ 迁移到 Vercel KV + Blob 存储
- 🎨 全新的 UI/UX 设计
- 📱 优化移动端体验
- 🤖 改进 AI 营养分析
- ⚡ 性能优化和代码重构

v1.0.0 (2024-09-15)
- 🎉 初始版本发布
- 📝 基础饮食记录功能
- 🏃 Garmin 数据同步
- 📊 进度追踪和可视化

------------------------------------
【技术支持】
------------------------------------

如遇问题，请检查:
1. 环境变量是否正确配置
2. Vercel 服务是否正常运行
3. OpenAI API 额度是否充足
4. Garmin 账号是否有效

项目地址: https://github.com/your-username/zhiji
在线演示: https://zhiji.vercel.app

====================================

