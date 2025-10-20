"""
Garmin Connect数据同步服务
使用garminconnect库获取Garmin手表数据
"""
import os
import logging
from datetime import datetime, timedelta
from garminconnect import Garmin

logger = logging.getLogger(__name__)

class GarminService:
    """Garmin数据同步服务类"""
    
    def __init__(self):
        """初始化Garmin客户端"""
        self.email = os.getenv('GARMIN_EMAIL')
        self.password = os.getenv('GARMIN_PASSWORD')
        self.client = None
        self.is_logged_in = False
        
        if not self.email or not self.password:
            logger.warning("未配置Garmin账号信息")
        else:
            logger.info("Garmin服务初始化完成")
    
    def is_configured(self):
        """检查是否已配置"""
        # 检查环境变量是否存在且不是默认值
        email_configured = self.email and self.email != 'your_email@example.com' and self.email.strip() != ''
        password_configured = self.password and self.password != 'your_password' and self.password.strip() != ''
        return email_configured and password_configured
    
    def login(self):
        """登录Garmin Connect"""
        if not self.is_configured():
            raise Exception("未配置Garmin账号信息")
        
        try:
            logger.info(f"正在登录Garmin Connect: {self.email}")
            
            # 创建Garmin客户端
            self.client = Garmin(self.email, self.password)
            self.client.login()
            self.is_logged_in = True
            
            logger.info("Garmin登录成功")
            return True
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Garmin登录失败: {error_msg}")
            logger.error(f"错误类型: {type(e).__name__}")
            if hasattr(e, 'response'):
                logger.error(f"响应状态码: {e.response.status_code if hasattr(e.response, 'status_code') else 'N/A'}")
                logger.error(f"响应内容: {e.response.text if hasattr(e.response, 'text') else 'N/A'}")
            self.is_logged_in = False
            raise Exception(f"Garmin登录失败: {error_msg}")
    
    def sync_data(self, date=None):
        """
        同步Garmin数据
        
        参数：
            date: 日期字符串 (YYYY-MM-DD)，默认为今天
        
        返回：
            {
                'totalCalories': int,  # 总消耗卡路里
                'trainingType': str,   # 训练类型: none/A/S/both
                'steps': int,          # 步数
                'heartRate': {
                    'average': int,
                    'max': int
                },
                'activities': []       # 活动列表
            }
        """
        # 如果未登录，先登录
        if not self.is_logged_in:
            self.login()
        
        if not date:
            date = datetime.now().strftime('%Y-%m-%d')
        
        try:
            logger.info(f"开始同步Garmin数据: {date}")
            
            # 获取指定日期的数据
            date_obj = datetime.strptime(date, '%Y-%m-%d')
            
            # 1. 获取每日汇总数据
            stats = self.client.get_stats(date)
            
            # 2. 获取当天的活动列表
            activities = self.client.get_activities_by_date(
                date_obj.strftime('%Y-%m-%d'),
                date_obj.strftime('%Y-%m-%d')
            )
            
            # 3. 解析数据
            result = self._parse_garmin_data(stats, activities)
            
            logger.info(f"Garmin数据同步完成: {result['totalCalories']} kcal")
            return result
            
        except Exception as e:
            logger.error(f"同步Garmin数据失败: {str(e)}")
            # 返回模拟数据作为降级方案
            return self._generate_mock_data()
    
    def _parse_garmin_data(self, stats, activities):
        """解析Garmin原始数据"""
        # 从Garmin统计数据中获取真实的卡路里数据
        total_calories = stats.get('totalKilocalories', 0)  # 总卡路里消耗
        active_calories = stats.get('activeKilocalories', 0)  # 活动消耗的卡路里
        bmr_calories = stats.get('bmrKilocalories', 0)  # 基础代谢消耗的卡路里
        
        # 如果没有数据，使用默认值
        if total_calories == 0:
            total_calories = active_calories + bmr_calories
        if bmr_calories == 0:
            bmr_calories = 1800  # 默认基础代谢
        
        # 获取步数
        steps = stats.get('totalSteps', 0)
        
        # 判断训练类型
        training_type = self._determine_training_type(activities)
        
        # 获取心率数据
        heart_rate = {
            'resting': stats.get('restingHeartRate', 0),
            'max': stats.get('maxHeartRate', 0),
            'average': stats.get('averageHeartRate', 0)
        }
        
        # 整理活动列表
        activity_list = []
        for activity in activities:
            activity_list.append({
                'name': activity.get('activityName', '未知活动'),
                'type': activity.get('activityType', {}).get('typeKey', ''),
                'duration': activity.get('duration', 0) / 60,  # 转换为分钟
                'calories': activity.get('calories', 0),
                'distance': activity.get('distance', 0) / 1000  # 转换为公里
            })
        
        return {
            'totalCalories': int(total_calories),
            'activeCalories': int(active_calories),
            'bmrCalories': int(bmr_calories),
            'trainingType': training_type,
            'steps': steps,
            'heartRate': heart_rate,
            'activities': activity_list,
            'dailyStats': stats,  # 保存完整的每日统计数据
            'syncTime': datetime.now().isoformat()
        }
    
    def _determine_training_type(self, activities):
        """
        根据活动列表判断训练类型
        
        返回：
            'none': 无运动
            'A': 仅有氧（跑步、骑行、游泳等）
            'S': 仅无氧（力量训练）
            'both': 有氧 + 无氧
        """
        if not activities:
            return 'none'
        
        has_aerobic = False
        has_strength = False
        
        # 有氧运动类型
        aerobic_types = [
            'running', 'cycling', 'swimming', 'walking', 
            'hiking', 'elliptical', 'cardio', 'treadmill'
        ]
        
        # 无氧运动类型
        strength_types = [
            'strength_training', 'weight_training', 'fitness_equipment',
            'gym', 'strength'
        ]
        
        for activity in activities:
            activity_type = activity.get('activityType', {}).get('typeKey', '').lower()
            
            # 检查是否为有氧运动
            if any(aero in activity_type for aero in aerobic_types):
                # 只计算30分钟以上的有氧运动
                duration_minutes = activity.get('duration', 0) / 60
                if duration_minutes >= 30:
                    has_aerobic = True
            
            # 检查是否为无氧运动
            if any(strength in activity_type for strength in strength_types):
                # 只计算40分钟以上的力量训练
                duration_minutes = activity.get('duration', 0) / 60
                if duration_minutes >= 40:
                    has_strength = True
        
        # 判断类型
        if has_aerobic and has_strength:
            return 'both'
        elif has_aerobic:
            return 'A'
        elif has_strength:
            return 'S'
        else:
            return 'none'
    
    def _generate_mock_data(self):
        """生成模拟数据（用于测试和降级）"""
        import random
        
        logger.info("使用模拟Garmin数据")
        
        training_types = ['none', 'A', 'S', 'both']
        random_type = random.choice(training_types)
        
        # 基础代谢率
        base_metabolism = 1800
        
        # 根据训练类型生成活动消耗
        if random_type == 'A':
            activity_calories = 300 + random.randint(0, 200)  # 有氧：300-500
        elif random_type == 'S':
            activity_calories = 200 + random.randint(0, 150)  # 无氧：200-350
        elif random_type == 'both':
            activity_calories = 400 + random.randint(0, 300)  # 混合：400-700
        else:
            activity_calories = 50 + random.randint(0, 150)   # 日常：50-200
        
        total_calories = base_metabolism + activity_calories
        
        return {
            'totalCalories': total_calories,
            'activeCalories': activity_calories,
            'bmrCalories': base_metabolism,
            'trainingType': random_type,
            'steps': random.randint(5000, 15000),
            'heartRate': {
                'resting': 55 + random.randint(0, 20),
                'average': 65 + random.randint(0, 20),
                'max': 120 + random.randint(0, 50)
            },
            'activities': [],
            'dailyStats': {},
            'syncTime': datetime.now().isoformat(),
            'isMock': True  # 标记为模拟数据
        }

