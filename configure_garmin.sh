#!/bin/bash

echo "========================================"
echo "       配置Garmin Connect账号"
echo "========================================"
echo ""

# 检查.env文件是否存在
if [ ! -f "backend/.env" ]; then
    echo "❌ 未找到backend/.env文件"
    exit 1
fi

echo "请输入你的Garmin Connect账号信息："
echo ""

# 获取邮箱
read -p "📧 Garmin邮箱: " garmin_email
if [ -z "$garmin_email" ]; then
    echo "❌ 邮箱不能为空"
    exit 1
fi

# 获取密码
read -s -p "🔒 Garmin密码: " garmin_password
echo ""
if [ -z "$garmin_password" ]; then
    echo "❌ 密码不能为空"
    exit 1
fi

echo ""
echo "正在更新配置文件..."

# 备份原文件
cp backend/.env backend/.env.backup

# 更新邮箱
sed -i '' "s/GARMIN_EMAIL=.*/GARMIN_EMAIL=$garmin_email/" backend/.env

# 更新密码
sed -i '' "s/GARMIN_PASSWORD=.*/GARMIN_PASSWORD=$garmin_password/" backend/.env

echo "✅ 配置已更新"
echo ""
echo "配置内容："
echo "- 邮箱: $garmin_email"
echo "- 密码: $(echo $garmin_password | sed 's/./*/g')"
echo ""
echo "请重启后端服务以使配置生效："
echo "  ./start_local.sh"
echo ""
echo "然后访问测试页面："
echo "  http://localhost:8000/garmin_test.html"
echo ""
echo "========================================"

