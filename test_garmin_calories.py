#!/usr/bin/env python3
"""
测试Garmin Connect卡路里数据获取功能
"""
import os
import sys
from datetime import datetime, timedelta

# 添加backend目录到Python路径
sys.path.append('backend')

from services.garmin_service import GarminService

def test_garmin_calories():
    """测试Garmin卡路里数据获取"""
    print("=" * 60)
    print("  🏃‍♂️ Garmin Connect 卡路里数据测试")
    print("=" * 60)
    
    try:
        # 初始化服务
        garmin_service = GarminService()
        
        if not garmin_service.is_configured():
            print("❌ Garmin账号未配置")
            return
        
        print("✅ Garmin账号已配置")
        
        # 登录
        garmin_service.login()
        print("✅ Garmin登录成功")
        
        # 测试昨天的数据（通常有完整数据）
        yesterday = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
        print(f"\n📅 测试日期: {yesterday}")
        
        # 获取统计数据
        stats = garmin_service.client.get_stats(yesterday)
        print("\n📊 原始统计数据:")
        calorie_fields = {k: v for k, v in stats.items() if 'calorie' in k.lower() or 'kcal' in k.lower()}
        for key, value in calorie_fields.items():
            print(f"  {key}: {value}")
        
        # 获取活动数据
        activities = garmin_service.client.get_activities_by_date(yesterday, yesterday)
        print(f"\n🏃 活动数据: {len(activities)} 个活动")
        
        # 解析数据
        result = garmin_service._parse_garmin_data(stats, activities)
        
        print("\n🎯 解析结果:")
        print(f"  总卡路里消耗: {result['totalCalories']} kcal")
        print(f"  活动卡路里: {result['activeCalories']} kcal")
        print(f"  基础代谢: {result['bmrCalories']} kcal")
        print(f"  步数: {result['steps']}")
        print(f"  训练类型: {result['trainingType']}")
        print(f"  心率数据: {result['heartRate']}")
        
        if result['activities']:
            print(f"\n🏃 活动详情:")
            for activity in result['activities']:
                print(f"  - {activity['name']}: {activity['calories']} kcal, {activity['duration']:.1f} 分钟")
        
        print("\n✅ 卡路里数据获取测试完成!")
        
        # 验证数据完整性
        print("\n🔍 数据验证:")
        total_expected = result['activeCalories'] + result['bmrCalories']
        print(f"  活动卡路里 + 基础代谢 = {result['activeCalories']} + {result['bmrCalories']} = {total_expected}")
        print(f"  总卡路里 = {result['totalCalories']}")
        print(f"  数据一致性: {'✅ 一致' if total_expected == result['totalCalories'] else '❌ 不一致'}")
        
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_garmin_calories()
