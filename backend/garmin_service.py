import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import json

from garminconnect import Garmin

logger = logging.getLogger(__name__)

class GarminService:
    def __init__(self):
        self.client: Optional[Garmin] = None
        self.is_authenticated = False
        
    async def login(self, email: str, password: str) -> bool:
        """登录Garmin Connect"""
        try:
            logger.info(f"尝试登录Garmin Connect: {email}")
            
            # 创建Garmin客户端
            self.client = Garmin(email, password)
            
            # 执行登录
            await asyncio.to_thread(self.client.login)
            
            self.is_authenticated = True
            logger.info("Garmin Connect登录成功")
            return True
            
        except Exception as e:
            logger.error(f"Garmin Connect登录失败: {str(e)}")
            self.is_authenticated = False
            self.client = None
            return False
    
    async def get_user_info(self) -> Dict[str, Any]:
        """获取用户信息"""
        if not self.is_authenticated or not self.client:
            raise Exception("未登录Garmin Connect")
        
        try:
            # 获取用户资料
            user_profile = await asyncio.to_thread(self.client.get_user_profile)
            
            return {
                "displayName": user_profile.get("displayName", ""),
                "fullName": user_profile.get("fullName", ""),
                "profileImageUrlLarge": user_profile.get("profileImageUrlLarge", ""),
                "profileImageUrlMedium": user_profile.get("profileImageUrlMedium", ""),
                "profileImageUrlSmall": user_profile.get("profileImageUrlSmall", ""),
                "userProfileId": user_profile.get("userProfileId", ""),
                "username": user_profile.get("username", "")
            }
            
        except Exception as e:
            logger.error(f"获取用户信息失败: {str(e)}")
            raise Exception(f"获取用户信息失败: {str(e)}")
    
    async def sync_data(self, days: int = 7, force: bool = False) -> List[Dict[str, Any]]:
        """同步Garmin数据"""
        if not self.is_authenticated or not self.client:
            raise Exception("未登录Garmin Connect")
        
        try:
            logger.info(f"开始同步{days}天的Garmin数据")
            
            # 获取日期范围
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=days-1)
            
            all_data = []
            
            # 逐日获取数据
            current_date = start_date
            while current_date <= end_date:
                try:
                    logger.info(f"获取日期 {current_date} 的数据")
                    day_data = await self.get_single_day_data(current_date)
                    all_data.append(day_data)
                except Exception as e:
                    logger.error(f"获取日期 {current_date} 数据失败: {str(e)}")
                    # 继续处理下一天
                
                current_date += timedelta(days=1)
            
            logger.info(f"成功同步{len(all_data)}天的数据")
            return all_data
            
        except Exception as e:
            logger.error(f"同步数据失败: {str(e)}")
            raise Exception(f"同步数据失败: {str(e)}")
    
    async def get_single_day_data(self, date: datetime.date) -> Dict[str, Any]:
        """获取单日数据"""
        if not self.is_authenticated or not self.client:
            raise Exception("未登录Garmin Connect")
        
        try:
            date_str = date.strftime("%Y-%m-%d")
            logger.info(f"获取日期 {date_str} 的详细数据")
            
            # 获取各种数据
            activities = await asyncio.to_thread(self.client.get_activities_by_date, date_str, date_str)
            sleep_data = await asyncio.to_thread(self.client.get_sleep_data, date_str)
            steps_data = await asyncio.to_thread(self.client.get_steps_data, date_str)
            heart_rate = await asyncio.to_thread(self.client.get_heart_rates, date_str)
            body_composition = await asyncio.to_thread(self.client.get_body_composition, date_str)
            
            # 获取每日汇总数据
            daily_summary = await asyncio.to_thread(self.client.get_stats, date_str)
            
            logger.info(f"原始数据获取完成 - 日期: {date_str}")
            logger.info(f"Activities: {len(activities) if activities else 0} 条")
            logger.info(f"Sleep data: {type(sleep_data)} - {sleep_data}")
            logger.info(f"Steps data: {type(steps_data)} - {steps_data}")
            logger.info(f"Daily summary: {type(daily_summary)} - {daily_summary}")
            
            # 解析数据
            parsed_data = self.parse_single_day_data(
                date=date,
                activities=activities,
                sleep_data=sleep_data,
                steps_data=steps_data,
                heart_rate=heart_rate,
                body_composition=body_composition,
                daily_summary=daily_summary
            )
            
            return parsed_data
            
        except Exception as e:
            logger.error(f"获取日期 {date} 数据失败: {str(e)}")
            raise Exception(f"获取日期 {date} 数据失败: {str(e)}")
    
    def parse_single_day_data(self, date: datetime.date, activities: List, sleep_data: Any, 
                            steps_data: Any, heart_rate: Any, body_composition: Any, 
                            daily_summary: Any) -> Dict[str, Any]:
        """解析单日数据"""
        try:
            date_str = date.strftime("%Y-%m-%d")
            
            # 解析睡眠数据
            sleep_parsed = self.parse_sleep_data(sleep_data)
            
            # 解析步数和活动数据
            steps_parsed = self.parse_steps_data(steps_data)
            
            # 解析每日汇总数据
            summary_parsed = self.parse_daily_summary(daily_summary)
            
            # 解析活动数据
            activities_parsed = self.parse_activities(activities)
            
            # 解析心率数据
            heart_rate_parsed = self.parse_heart_rate(heart_rate)
            
            # 解析身体成分数据
            body_composition_parsed = self.parse_body_composition(body_composition)
            
            result = {
                "date": date_str,
                "sleep": sleep_parsed,
                "steps": steps_parsed.get("steps", 0),
                "distance": steps_parsed.get("distance", 0),
                "calories": summary_parsed.get("calories", 0),
                "activeCalories": summary_parsed.get("activeCalories", 0),
                "bmrCalories": summary_parsed.get("bmrCalories", 0),
                "totalCalories": summary_parsed.get("totalCalories", 0),
                "activities": activities_parsed,
                "heartRate": heart_rate_parsed,
                "bodyComposition": body_composition_parsed,
                "dailySummary": summary_parsed,
                "rawData": {
                    "sleep": sleep_data,
                    "steps": steps_data,
                    "dailySummary": daily_summary,
                    "activities": activities,
                    "heartRate": heart_rate,
                    "bodyComposition": body_composition
                }
            }
            
            logger.info(f"数据解析完成 - 日期: {date_str}")
            logger.info(f"解析结果: 步数={result['steps']}, 卡路里={result['totalCalories']}, 睡眠={result['sleep']}")
            
            return result
            
        except Exception as e:
            logger.error(f"解析日期 {date} 数据失败: {str(e)}")
            raise Exception(f"解析日期 {date} 数据失败: {str(e)}")
    
    def parse_sleep_data(self, sleep_data: Any) -> Dict[str, Any]:
        """解析睡眠数据"""
        try:
            if not sleep_data:
                return {
                    "deepSleepSeconds": 0,
                    "lightSleepSeconds": 0,
                    "remSleepSeconds": 0,
                    "awakeSleepSeconds": 0,
                    "totalSleepTimeSeconds": 0,
                    "sleepStartTimestampGMT": None,
                    "sleepEndTimestampGMT": None
                }
            
            # 根据实际返回的数据结构解析
            if isinstance(sleep_data, dict):
                return {
                    "deepSleepSeconds": sleep_data.get("deepSleepSeconds", 0),
                    "lightSleepSeconds": sleep_data.get("lightSleepSeconds", 0),
                    "remSleepSeconds": sleep_data.get("remSleepSeconds", 0),
                    "awakeSleepSeconds": sleep_data.get("awakeSleepSeconds", 0),
                    "totalSleepTimeSeconds": sleep_data.get("totalSleepTimeSeconds", 0),
                    "sleepStartTimestampGMT": sleep_data.get("sleepStartTimestampGMT"),
                    "sleepEndTimestampGMT": sleep_data.get("sleepEndTimestampGMT")
                }
            elif isinstance(sleep_data, list) and len(sleep_data) > 0:
                # 如果是列表，取第一个元素
                first_sleep = sleep_data[0]
                return {
                    "deepSleepSeconds": first_sleep.get("deepSleepSeconds", 0),
                    "lightSleepSeconds": first_sleep.get("lightSleepSeconds", 0),
                    "remSleepSeconds": first_sleep.get("remSleepSeconds", 0),
                    "awakeSleepSeconds": first_sleep.get("awakeSleepSeconds", 0),
                    "totalSleepTimeSeconds": first_sleep.get("totalSleepTimeSeconds", 0),
                    "sleepStartTimestampGMT": first_sleep.get("sleepStartTimestampGMT"),
                    "sleepEndTimestampGMT": first_sleep.get("sleepEndTimestampGMT")
                }
            
            return {
                "deepSleepSeconds": 0,
                "lightSleepSeconds": 0,
                "remSleepSeconds": 0,
                "awakeSleepSeconds": 0,
                "totalSleepTimeSeconds": 0,
                "sleepStartTimestampGMT": None,
                "sleepEndTimestampGMT": None
            }
            
        except Exception as e:
            logger.error(f"解析睡眠数据失败: {str(e)}")
            return {
                "deepSleepSeconds": 0,
                "lightSleepSeconds": 0,
                "remSleepSeconds": 0,
                "awakeSleepSeconds": 0,
                "totalSleepTimeSeconds": 0,
                "sleepStartTimestampGMT": None,
                "sleepEndTimestampGMT": None
            }
    
    def parse_steps_data(self, steps_data: Any) -> Dict[str, Any]:
        """解析步数数据"""
        try:
            if not steps_data:
                return {"steps": 0, "distance": 0}
            
            if isinstance(steps_data, dict):
                return {
                    "steps": steps_data.get("totalSteps", 0),
                    "distance": steps_data.get("totalDistance", 0)
                }
            elif isinstance(steps_data, list) and len(steps_data) > 0:
                # 如果是列表，计算总和
                total_steps = sum(item.get("steps", 0) for item in steps_data if isinstance(item, dict))
                total_distance = sum(item.get("distance", 0) for item in steps_data if isinstance(item, dict))
                return {
                    "steps": total_steps,
                    "distance": total_distance
                }
            
            return {"steps": 0, "distance": 0}
            
        except Exception as e:
            logger.error(f"解析步数数据失败: {str(e)}")
            return {"steps": 0, "distance": 0}
    
    def parse_daily_summary(self, daily_summary: Any) -> Dict[str, Any]:
        """解析每日汇总数据"""
        try:
            if not daily_summary:
                return {
                    "calories": 0,
                    "activeCalories": 0,
                    "bmrCalories": 1800,  # 默认基础代谢
                    "totalCalories": 1800
                }
            
            if isinstance(daily_summary, dict):
                active_calories = daily_summary.get("activeKilocalories", 0)
                bmr_calories = daily_summary.get("bmrKilocalories", 1800)
                total_calories = daily_summary.get("totalKilocalories", active_calories + bmr_calories)
                
                return {
                    "calories": total_calories,
                    "activeCalories": active_calories,
                    "bmrCalories": bmr_calories,
                    "totalCalories": total_calories
                }
            
            return {
                "calories": 0,
                "activeCalories": 0,
                "bmrCalories": 1800,
                "totalCalories": 1800
            }
            
        except Exception as e:
            logger.error(f"解析每日汇总数据失败: {str(e)}")
            return {
                "calories": 0,
                "activeCalories": 0,
                "bmrCalories": 1800,
                "totalCalories": 1800
            }
    
    def parse_activities(self, activities: List) -> List[Dict[str, Any]]:
        """解析活动数据"""
        try:
            if not activities:
                return []
            
            parsed_activities = []
            for activity in activities:
                if isinstance(activity, dict):
                    parsed_activities.append({
                        "activityId": activity.get("activityId"),
                        "activityName": activity.get("activityName", ""),
                        "activityType": activity.get("activityType", {}).get("typeKey", ""),
                        "distance": activity.get("distance", 0),
                        "duration": activity.get("duration", 0),
                        "calories": activity.get("calories", 0),
                        "averageHR": activity.get("averageHR"),
                        "maxHR": activity.get("maxHR"),
                        "startTimeLocal": activity.get("startTimeLocal")
                    })
            
            return parsed_activities
            
        except Exception as e:
            logger.error(f"解析活动数据失败: {str(e)}")
            return []
    
    def parse_heart_rate(self, heart_rate: Any) -> Dict[str, Any]:
        """解析心率数据"""
        try:
            if not heart_rate:
                return {"restingHeartRate": None, "maxHeartRate": None}
            
            if isinstance(heart_rate, dict):
                return {
                    "restingHeartRate": heart_rate.get("restingHeartRate"),
                    "maxHeartRate": heart_rate.get("maxHeartRate")
                }
            
            return {"restingHeartRate": None, "maxHeartRate": None}
            
        except Exception as e:
            logger.error(f"解析心率数据失败: {str(e)}")
            return {"restingHeartRate": None, "maxHeartRate": None}
    
    def parse_body_composition(self, body_composition: Any) -> Dict[str, Any]:
        """解析身体成分数据"""
        try:
            if not body_composition:
                return {"weight": None, "bodyFat": None, "bodyWater": None, "muscleMass": None}
            
            if isinstance(body_composition, dict):
                return {
                    "weight": body_composition.get("weight"),
                    "bodyFat": body_composition.get("bodyFat"),
                    "bodyWater": body_composition.get("bodyWater"),
                    "muscleMass": body_composition.get("muscleMass")
                }
            
            return {"weight": None, "bodyFat": None, "bodyWater": None, "muscleMass": None}
            
        except Exception as e:
            logger.error(f"解析身体成分数据失败: {str(e)}")
            return {"weight": None, "bodyFat": None, "bodyWater": None, "muscleMass": None}