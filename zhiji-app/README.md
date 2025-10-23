# 脂记 (Zhiji) - 智能健康管理应用

一个基于 Next.js 14 的现代化健康管理应用，集成了食物记录、营养分析、运动追踪等功能。

## 功能特性

- 🍎 **智能食物识别**: 通过拍照识别食物并自动计算营养成分
- 📊 **营养分析**: 详细的营养成分分析和可视化图表
- 🏃 **运动追踪**: 集成 Garmin 设备数据同步
- 📱 **响应式设计**: 支持移动端和桌面端
- 🔐 **用户认证**: 支持邮箱注册和第三方登录
- 📈 **数据可视化**: 直观的健康数据图表展示

## 技术栈

- **前端**: Next.js 14, TypeScript, Tailwind CSS
- **认证**: NextAuth.js
- **数据库**: Vercel KV (Redis)
- **部署**: Vercel
- **AI**: OpenAI GPT-4o

## Garmin 数据同步说明

**重要说明**: 本应用的 Garmin 数据同步不是通过官方 API 实现的，而是使用开源库通过模拟登录的方式获取数据。

### 库迁移说明

项目已从JavaScript `garmin-connect` 库迁移到Python `python-garminconnect` 库，以解决数据获取不完整的问题。

#### 迁移原因
- JavaScript `garmin-connect` 库无法获取完整的睡眠数据和每日汇总数据
- 睡眠相关字段（deepSleepSeconds, lightSleepSeconds等）返回undefined
- dailySummary缺少原始数据，只能获取基础步数信息

#### 新库功能
Python `python-garminconnect` 库提供更完整的数据访问：
- 完整的睡眠数据（深度睡眠、浅度睡眠、REM睡眠等）
- 详细的每日汇总数据（卡路里、活动数据等）
- 更稳定的API接口
- 更好的错误处理

#### 支持的数据类型
- 用户资料信息
- 每日活动数据
- 睡眠详细数据
- 步数和距离数据
- 心率数据
- 身体成分数据
- 卡路里消耗数据

#### 部署架构

**Vercel部署方案**
项目采用混合部署架构，可以完全在Vercel上部署：

1. **前端部署**：Next.js应用部署在Vercel
2. **Python后端**：通过Vercel的Python运行时支持
3. **API路由**：Next.js API路由调用Python脚本
4. **数据流**：前端 → Next.js API → Python脚本 → Garmin Connect

**部署文件结构**
```
├── zhiji-app/          # Next.js前端应用
├── backend/            # Python后端服务
│   ├── garmin_service.py    # Garmin数据服务
│   ├── garmin_script.py     # 独立Python脚本
│   └── requirements.txt     # Python依赖
└── vercel.json         # Vercel部署配置
```

**关键配置**
- `vercel.json`：配置Python运行时和路由
- API路由：`/api/garmin-python/route.ts`调用Python脚本
- Python脚本：独立运行，返回JSON数据

#### 开发和部署步骤
1. ✅ 设置Python后端环境
2. ✅ 创建Python Garmin服务
3. ✅ 配置Vercel部署文件
4. 🔄 更新前端API调用
5. 🔄 测试数据获取功能
6. 🔄 部署到生产环境

### 安全性
- 账号信息仅用于数据同步，不会被存储或传输给第三方
- 建议使用专门的 Garmin 账号或确保账号安全
- 暂不支持开启两步验证的账号

## 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 环境变量配置

复制 `.env.local.example` 到 `.env.local` 并配置以下环境变量：

```env
# Vercel KV 数据库
KV_REST_API_URL=your_kv_rest_api_url
KV_REST_API_TOKEN=your_kv_rest_api_token

# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# NextAuth 配置
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# OAuth 配置 (可选)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_ID=your_github_id
GITHUB_SECRET=your_github_secret

# Vercel Blob 存储
zhiji_READ_WRITE_TOKEN=your_blob_read_write_token

# Garmin 配置 (使用 garmin-connect 库模拟登录)
GARMIN_EMAIL=your_garmin_email
GARMIN_PASSWORD=your_garmin_password
```
```

### 本地开发

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 部署

### Vercel 部署

1. 将代码推送到 GitHub 仓库
2. 在 Vercel 中导入项目
3. 配置环境变量
4. 创建 Vercel KV 数据库
5. 部署应用

详细部署步骤请参考项目文档。

## 项目结构

```
src/
├── app/                 # Next.js 13+ App Router
│   ├── api/            # API 路由
│   ├── auth/           # 认证相关页面
│   └── ...
├── components/         # React 组件
├── lib/               # 工具库和配置
│   ├── auth.ts        # NextAuth 配置
│   ├── storage.ts     # 存储适配器
│   └── kv.ts          # 数据服务
└── types/             # TypeScript 类型定义
```

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License