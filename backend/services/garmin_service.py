"""
Garmin Connect数据同步服务
使用garminconnect库获取Garmin手表数据
"""
import os
import logging
import time
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
        self.last_request_time = 0
        self.min_request_interval = 2  # 最小请求间隔（秒）
        self.max_retries = 3  # 最大重试次数
        
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
        """登录Garmin Connect，带重试机制"""
        if not self.is_configured():
            raise Exception("未配置Garmin账号信息")
        
        for attempt in range(self.max_retries):
            try:
                logger.info(f"正在登录Garmin Connect: {self.email} (尝试 {attempt + 1}/{self.max_retries})")
                
                # 控制请求频率
                self._wait_for_rate_limit()
                
                # 创建Garmin客户端
                self.client = Garmin(self.email, self.password)
                self.client.login()
                self.is_logged_in = True
                
                logger.info("Garmin登录成功")
                return True
                
            except Exception as e:
                error_msg = str(e)
                logger.error(f"Garmin登录失败 (尝试 {attempt + 1}/{self.max_retries}): {error_msg}")
                
                # 检查是否是频率限制错误
                if "Too Many Requests" in error_msg or "429" in error_msg:
                    wait_time = (attempt + 1) * 30  # 递增等待时间：30秒、60秒、90秒
                    logger.warning(f"遇到频率限制，等待 {wait_time} 秒后重试...")
                    time.sleep(wait_time)
                elif attempt == self.max_retries - 1:
                    # 最后一次尝试失败
                    logger.error(f"错误类型: {type(e).__name__}")
                    if hasattr(e, 'response'):
                        logger.error(f"响应状态码: {e.response.status_code if hasattr(e.response, 'status_code') else 'N/A'}")
                        logger.error(f"响应内容: {e.response.text if hasattr(e.response, 'text') else 'N/A'}")
                    self.is_logged_in = False
                    raise Exception(f"Garmin登录失败 (已重试{self.max_retries}次): {error_msg}")
                else:
                    # 其他错误，等待较短时间后重试
                    time.sleep(5)
    
    def _wait_for_rate_limit(self):
        """控制API调用频率"""
        current_time = time.time()
        time_since_last_request = current_time - self.last_request_time
        
        if time_since_last_request < self.min_request_interval:
            wait_time = self.min_request_interval - time_since_last_request
            logger.info(f"API频率控制：等待 {wait_time:.1f} 秒")
            time.sleep(wait_time)
        
        self.last_request_time = time.time()
    
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
            
            # 控制API调用频率
            self._wait_for_rate_limit()
            
            # 1. 获取每日汇总数据
            stats = self.client.get_stats(date)
            
            # 控制API调用频率
            self._wait_for_rate_limit()
            
            # 2. 获取当天的活动列表
            activities = self.client.get_activities_by_date(
                date_obj.strftime('%Y-%m-%d'),
                date_obj.strftime('%Y-%m-%d')
            )
            
            # 3. 解析数据
            result = self._parse_garmin_data(stats, activities, date)
            
            logger.info(f"Garmin数据同步完成: {result['totalCalories']} kcal")
            return result
            
        except Exception as e:
            logger.error(f"[GARMIN SERVICE] 同步失败: {str(e)}", exc_info=True)
            logger.info("[GARMIN SERVICE] 返回无数据结构")
            return self._get_empty_data_structure()
    
    def _parse_garmin_data(self, stats, activities, date=None):
        """解析Garmin原始数据"""
        # 从Garmin统计数据中获取真实的卡路里数据
        total_calories = stats.get('totalKilocalories', 0) or 0  # 总卡路里消耗
        active_calories = stats.get('activeKilocalories', 0) or 0  # 活动消耗的卡路里
        bmr_calories = stats.get('bmrKilocalories', 0) or 0  # 基础代谢消耗的卡路里
        
        # 如果没有数据，使用默认值
        if total_calories == 0:
            total_calories = active_calories + bmr_calories
        if bmr_calories == 0:
            bmr_calories = 1800  # 默认基础代谢
        
        # 获取步数
        steps = stats.get('totalSteps', 0) or 0
        
        # 判断训练类型
        training_type = self._determine_training_type(activities)
        
        # 获取心率数据
        heart_rate = {
            'resting': stats.get('restingHeartRate', 0) or 0,
            'max': stats.get('maxHeartRate', 0) or 0,
            'average': stats.get('averageHeartRate', 0) or 0
        }
        
        # 整理活动列表
        activity_list = []
        for activity in activities:
            activity_list.append({
                'name': activity.get('activityName', '未知活动'),
                'type': activity.get('activityType', {}).get('typeKey', ''),
                'duration': (activity.get('duration', 0) or 0) / 60,  # 转换为分钟
                'calories': activity.get('calories', 0) or 0,
                'distance': (activity.get('distance', 0) or 0) / 1000  # 转换为公里
            })
        
        # 获取额外的健康数据
        date_str = date or datetime.now().strftime('%Y-%m-%d')
        
        # 获取睡眠数据
        sleep_data = self._get_sleep_data(date_str)
        
        # 获取HRV数据
        hrv_data = self._get_hrv_data(date_str)
        
        # 获取体能年龄和其他身体指标
        body_metrics = self._get_body_metrics(date_str)
        
        return {
            'totalCalories': int(total_calories),
            'activeCalories': int(active_calories),
            'bmrCalories': int(bmr_calories),
            'trainingType': training_type,
            'steps': steps,
            'heartRate': heart_rate,
            'sleep': sleep_data,
            'hrv': hrv_data,
            'bodyMetrics': body_metrics,
            'activities': activity_list,
            'dailyStats': stats,  # 保存完整的每日统计数据
            'syncTime': datetime.now().isoformat(),
            'syncDate': date_str,  # 添加同步日期字段
            'isMock': False,
            'hasData': True
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
    
    def _get_sleep_data(self, date_str):
        """获取睡眠数据"""
        try:
            # 控制API调用频率
            self._wait_for_rate_limit()
            
            sleep_data = self.client.get_sleep_data(date_str)
            if sleep_data and 'dailySleepDTO' in sleep_data:
                daily_sleep = sleep_data['dailySleepDTO']
                sleep_scores = daily_sleep.get('sleepScores', {})
                overall_score = sleep_scores.get('overall', {}).get('value', 0)
                
                return {
                    'totalSleepTime': daily_sleep.get('sleepTimeSeconds', 0) / 3600,  # 转换为小时
                    'totalSleepTimeSeconds': daily_sleep.get('sleepTimeSeconds', 0),
                    'deepSleep': daily_sleep.get('deepSleepSeconds', 0) / 3600,
                    'deepSleepSeconds': daily_sleep.get('deepSleepSeconds', 0),
                    'lightSleep': daily_sleep.get('lightSleepSeconds', 0) / 3600,
                    'lightSleepSeconds': daily_sleep.get('lightSleepSeconds', 0),
                    'remSleep': daily_sleep.get('remSleepSeconds', 0) / 3600,
                    'remSleepSeconds': daily_sleep.get('remSleepSeconds', 0),
                    'awakeTime': daily_sleep.get('awakeSleepSeconds', 0) / 3600,
                    'awakeTimeSeconds': daily_sleep.get('awakeSleepSeconds', 0),
                    'sleepScore': overall_score
                }
        except Exception as e:
            logger.warning(f"获取睡眠数据失败: {str(e)}")
        
        return {
            'totalSleepTime': 0,
            'totalSleepTimeSeconds': 0,
            'deepSleep': 0,
            'deepSleepSeconds': 0,
            'lightSleep': 0,
            'lightSleepSeconds': 0,
            'remSleep': 0,
            'remSleepSeconds': 0,
            'awakeTime': 0,
            'awakeTimeSeconds': 0,
            'sleepScore': 0
        }
    
    def _get_hrv_data(self, date_str):
        """获取HRV数据"""
        try:
            # 控制API调用频率
            self._wait_for_rate_limit()
            
            hrv_data = self.client.get_hrv_data(date_str)
            if hrv_data and 'hrvSummary' in hrv_data:
                hrv_summary = hrv_data['hrvSummary']
                baseline = hrv_summary.get('baseline', {})
                
                return {
                    'weeklyAvg': hrv_summary.get('weeklyAvg', 0),
                    'lastNightAvg': hrv_summary.get('lastNightAvg', 0),
                    'lastNight5MinHigh': hrv_summary.get('lastNight5MinHigh', 0),
                    'baseline': {
                        'lowUpper': baseline.get('lowUpper', 0),
                        'balancedLow': baseline.get('balancedLow', 0),
                        'balancedUpper': baseline.get('balancedUpper', 0)
                    },
                    'status': hrv_summary.get('status', 'NO_DATA')
                }
        except Exception as e:
            logger.warning(f"获取HRV数据失败: {str(e)}")
        
        return {
            'weeklyAvg': 0,
            'lastNightAvg': 0,
            'lastNight5MinHigh': 0,
            'baseline': {
                'lowUpper': 0,
                'balancedLow': 0,
                'balancedUpper': 0
            },
            'status': 'NO_DATA'
        }
    
    def _get_body_metrics(self, date_str):
        """获取身体指标数据（包括体能年龄）"""
        try:
            # 控制API调用频率
            self._wait_for_rate_limit()
            
            # 尝试获取身体组成数据
            body_composition = None
            try:
                body_composition = self.client.get_body_composition(date_str)
            except AttributeError:
                logger.warning("get_body_composition方法不可用，跳过身体组成数据")
            except Exception as e:
                logger.warning(f"获取身体组成数据失败: {str(e)}")
            
            fitness_age = 0
            vo2_max = 0.0
            weight = 0.0
            body_fat = 0.0
            
            if body_composition:
                weight = (body_composition.get('weight', 0) or 0) / 1000  # 转换为kg
                body_fat = body_composition.get('bodyFat', 0) or 0
            
            # 获取HRV数据用于bodyMetrics
            hrv_data = self._get_hrv_data(date_str)
            
            return {
                'fitnessAge': fitness_age,
                'vo2Max': vo2_max,
                'weight': weight,
                'bodyFat': body_fat,
                'hrv': hrv_data
            }
        except Exception as e:
            logger.warning(f"获取身体指标数据失败: {str(e)}")
        
        return {
            'fitnessAge': 0,
            'vo2Max': 0.0,
            'weight': 0.0,
            'bodyFat': 0.0,
            'hrv': {
                'weeklyAvg': 0,
                'lastNightAvg': 0,
                'lastNight5MinHigh': 0,
                'baseline': {
                    'lowUpper': 0,
                    'balancedLower': 0,
                    'balancedUpper': 0
                },
                'status': 'NO_DATA'
            }
        }

    def _get_empty_data_structure(self):
        """返回空数据结构，用于无数据情况"""
        return {
            'totalCalories': 0,
            'activeCalories': 0,
            'bmrCalories': 0,
            'trainingType': 'none',
            'steps': 0,
            'heartRate': {
                'resting': 0,
                'average': 0,
                'max': 0
            },
            'sleep': {
                'totalSleepTime': 0,
                'totalSleepTimeSeconds': 0,
                'deepSleep': 0,
                'deepSleepSeconds': 0,
                'lightSleep': 0,
                'lightSleepSeconds': 0,
                'remSleep': 0,
                'remSleepSeconds': 0,
                'awakeTime': 0,
                'awakeTimeSeconds': 0,
                'sleepScore': 0
            },
            'stress': {
                'averageStress': 0,
                'maxStress': 0,
                'restStress': 0
            },
            'bodyBattery': 0,
            'vo2Max': 0.0,
            'fitnessAge': 0,
            'spo2': {
                'average': 0.0,
                'min': 0.0,
                'max': 0.0
            },
            'respiration': {
                'average': 0.0,
                'max': 0.0,
                'min': 0.0
            },
            'hydration': 0,
            'weight': 0.0,
            'bodyFat': 0.0,
            'activities': [],
            'hrv': {
                'weeklyAvg': 0,
                'lastNightAvg': 0,
                'lastNight5MinHigh': 0,
                'baseline': {
                    'lowUpper': 0,
                    'balancedLower': 0,
                    'balancedUpper': 0
                },
                'status': 'NO_DATA'
            },
            'trainingStatus': {
                'trainingStatusType': 'NO_DATA',
                'load7Day': 0,
                'load4Week': 0,
                'trainingLoad': 0
            },
            'trainingReadiness': {
                'trainingReadinessLevel': 'NO_DATA',
                'trainingReadinessValue': 0
            },
            'bodyMetrics': {
                'fitnessAge': 0,
                'vo2Max': 0.0,
                'weight': 0.0,
                'bodyFat': 0.0,
                'hrv': {
                    'weeklyAvg': 0,
                    'lastNightAvg': 0,
                    'lastNight5MinHigh': 0,
                    'baseline': {
                        'lowUpper': 0,
                        'balancedLower': 0,
                        'balancedUpper': 0
                    },
                    'status': 'NO_DATA'
                }
            },
            'activities': [],
            'dailyStats': {},
            'syncTime': datetime.now().isoformat(),
            'isMock': False,
            'hasData': False
        }

