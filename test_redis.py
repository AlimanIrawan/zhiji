#!/usr/bin/env python3
"""
测试Redis连接
"""
import os
import redis
from dotenv import load_dotenv

# 加载环境变量
load_dotenv('backend/.env')

print("=== Redis连接测试 ===")

# 获取Redis URL
redis_url = os.getenv('REDIS_REDIS_URL') or os.getenv('REDIS_URL')
print(f"Redis URL: {redis_url[:50]}..." if redis_url else "未找到Redis URL")

if not redis_url:
    print("❌ 未配置Redis URL")
    exit(1)

try:
    # 创建Redis连接
    client = redis.from_url(
        redis_url,
        decode_responses=True,
        socket_timeout=5,
        socket_connect_timeout=5
    )
    
    # 测试连接
    print("🔄 测试Redis连接...")
    client.ping()
    print("✅ Redis连接成功！")
    
    # 测试写入
    print("🔄 测试写入数据...")
    client.set('test_key', 'test_value')
    
    # 测试读取
    print("🔄 测试读取数据...")
    value = client.get('test_key')
    print(f"✅ 读取成功: {value}")
    
    # 清理测试数据
    client.delete('test_key')
    print("✅ 测试完成，Redis工作正常")
    
except Exception as e:
    print(f"❌ Redis连接失败: {e}")
    print(f"错误类型: {type(e).__name__}")
