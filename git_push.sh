#!/bin/bash

echo "======================================"
echo "       脂记 - Git推送脚本"
echo "======================================"
echo ""

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 检查Git是否安装
if ! command -v git &> /dev/null; then
    echo "❌ 错误: 未检测到Git"
    echo "请先安装Git: https://git-scm.com/downloads"
    exit 1
fi

echo "✅ Git 已安装"
echo ""

# 检查是否已初始化Git仓库
if [ ! -d ".git" ]; then
    echo "📦 初始化Git仓库..."
    git init
    echo "✅ Git仓库初始化完成"
    echo ""
    
    # 询问是否配置远程仓库
    read -p "是否要配置远程GitHub仓库? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "请输入GitHub仓库地址(例如: https://github.com/username/repo.git):"
        read repo_url
        git remote add origin "$repo_url"
        echo "✅ 远程仓库已配置"
        echo ""
    else
        echo "⚠️  跳过远程仓库配置"
        echo "稍后可以使用以下命令配置:"
        echo "  git remote add origin <your-repo-url>"
        echo ""
    fi
fi

# 检查是否有远程仓库
if ! git remote -v | grep -q "origin"; then
    echo "⚠️  未配置远程仓库"
    read -p "是否要现在配置? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "请输入GitHub仓库地址(例如: https://github.com/username/repo.git):"
        read repo_url
        git remote add origin "$repo_url"
        echo "✅ 远程仓库已配置"
        echo ""
    fi
fi

# 显示当前状态
echo "📊 当前Git状态:"
git status --short
echo ""

# 询问提交信息
echo "请输入提交信息(默认: 更新代码):"
read commit_message

if [ -z "$commit_message" ]; then
    commit_message="更新代码"
fi

# 添加所有文件
echo ""
echo "📝 添加文件..."
git add .

# 提交
echo "💾 提交更改..."
git commit -m "$commit_message"

if [ $? -ne 0 ]; then
    echo "❌ 提交失败或没有更改"
    exit 1
fi

echo "✅ 提交成功"
echo ""

# 检查当前分支
current_branch=$(git branch --show-current)
if [ -z "$current_branch" ]; then
    current_branch="main"
    git branch -M main
    echo "✅ 已创建主分支: main"
fi

# 推送到远程仓库
if git remote -v | grep -q "origin"; then
    echo "🚀 推送到远程仓库 ($current_branch)..."
    
    # 首次推送需要设置上游
    if ! git rev-parse --abbrev-ref --symbolic-full-name @{u} > /dev/null 2>&1; then
        git push -u origin $current_branch
    else
        git push
    fi
    
    if [ $? -eq 0 ]; then
        echo "✅ 推送成功"
        echo ""
        echo "======================================"
        echo "  🎉 代码已成功推送到GitHub"
        echo ""
        echo "  下一步操作:"
        echo "  1. 登录Vercel (https://vercel.com)"
        echo "  2. 导入GitHub仓库,设置根目录为 frontend"
        echo "  3. 添加Upstash Redis集成"
        echo "  4. 配置环境变量 REDIS_URL"
        echo ""
        echo "  5. 登录Render (https://render.com)"
        echo "  6. 导入GitHub仓库,设置根目录为 backend"
        echo "  7. 配置环境变量:"
        echo "     - OPENAI_API_KEY"
        echo "     - GARMIN_EMAIL"
        echo "     - GARMIN_PASSWORD"
        echo "     - REDIS_URL (从Vercel复制)"
        echo "     - SECRET_KEY"
        echo "     - FRONTEND_URL"
        echo ""
        echo "======================================"
    else
        echo "❌ 推送失败"
        echo "可能需要先设置GitHub账号认证"
        echo "参考: https://docs.github.com/cn/authentication"
    fi
else
    echo "⚠️  未配置远程仓库,跳过推送"
fi

echo ""
echo "✅ 完成!"

