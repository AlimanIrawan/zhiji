"""
Redis数据存储服务
负责所有数据的持久化操作
"""
import os
import json
import logging
from datetime import datetime
import redis

logger = logging.getLogger(__name__)

class RedisService:
    """Redis数据存储服务类"""
    
    def __init__(self):
        """初始化Redis连接"""
        # 优先使用 REDIS_REDIS_URL（Vercel生成），其次使用 REDIS_URL
        redis_url = os.getenv('REDIS_REDIS_URL') or os.getenv('REDIS_URL')
        if not redis_url:
            logger.warning("未配置Redis URL，使用内存模式（数据不会持久化）")
            self.client = None
            self.memory_store = {}  # 内存存储，用于开发测试
        else:
            try:
                self.client = redis.from_url(
                    redis_url,
                    decode_responses=True,
                    socket_timeout=5,
                    socket_connect_timeout=5
                )
                # 测试连接
                self.client.ping()
                logger.info("Redis连接成功")
            except Exception as e:
                logger.error(f"Redis连接失败: {e}")
                self.client = None
                self.memory_store = {}
    
    def is_connected(self):
        """检查Redis连接状态"""
        if not self.client:
            return False
        try:
            self.client.ping()
            return True
        except:
            return False
    
    # ==================== 饮食记录相关 ====================
    
    def save_food_record(self, user_id, record):
        """保存饮食记录"""
        key = f"user:{user_id}:records:{record['date']}"
        
        if self.client:
            # 使用Redis Hash存储
            self.client.hset(key, record['id'], json.dumps(record))
            # 设置7天过期（可选）
            # self.client.expire(key, 604800)
        else:
            # 内存存储
            if key not in self.memory_store:
                self.memory_store[key] = {}
            self.memory_store[key][record['id']] = record
        
        logger.info(f"记录已保存: {record['id']}")
    
    def get_food_records(self, user_id, date):
        """获取某天的所有饮食记录"""
        key = f"user:{user_id}:records:{date}"
        
        if self.client:
            records_dict = self.client.hgetall(key)
            records = [json.loads(v) for v in records_dict.values()]
        else:
            records_dict = self.memory_store.get(key, {})
            records = list(records_dict.values())
        
        # 按时间排序（最新的在前）
        records.sort(key=lambda x: x.get('time', '00:00'), reverse=True)
        return records
    
    def delete_food_record(self, user_id, record_id):
        """删除饮食记录"""
        # 需要遍历所有日期找到记录（或者前端传递日期）
        # 这里简化处理，假设前端会传递日期
        pattern = f"user:{user_id}:records:*"
        
        if self.client:
            for key in self.client.scan_iter(pattern):
                if self.client.hexists(key, record_id):
                    self.client.hdel(key, record_id)
                    logger.info(f"记录已删除: {record_id}")
                    return True
        else:
            for key in list(self.memory_store.keys()):
                if key.startswith(f"user:{user_id}:records:"):
                    if record_id in self.memory_store[key]:
                        del self.memory_store[key][record_id]
                        logger.info(f"记录已删除: {record_id}")
                        return True
        
        return False
    
    # ==================== Garmin数据相关 ====================
    
    def save_garmin_data(self, user_id, data):
        """保存Garmin数据"""
        key = f"user:{user_id}:garmin:latest"
        
        if self.client:
            self.client.set(key, json.dumps(data))
        else:
            self.memory_store[key] = data
        
        logger.info("Garmin数据已保存")
    
    def get_garmin_data(self, user_id):
        """获取最新的Garmin数据"""
        key = f"user:{user_id}:garmin:latest"
        
        if self.client:
            data = self.client.get(key)
            return json.loads(data) if data else None
        else:
            return self.memory_store.get(key)
    
    def set_last_sync_time(self, user_id, timestamp):
        """设置最后同步时间"""
        key = f"user:{user_id}:garmin:last_sync"
        
        if self.client:
            self.client.set(key, timestamp)
        else:
            self.memory_store[key] = timestamp
    
    def get_last_sync_time(self, user_id):
        """获取最后同步时间"""
        key = f"user:{user_id}:garmin:last_sync"
        
        if self.client:
            return self.client.get(key)
        else:
            return self.memory_store.get(key)
    
    # ==================== 每日汇总相关 ====================
    
    def save_daily_summary(self, user_id, date, summary):
        """保存每日汇总"""
        key = f"user:{user_id}:summary:{date}"
        
        if self.client:
            self.client.set(key, json.dumps(summary))
        else:
            self.memory_store[key] = summary
        
        logger.info(f"每日汇总已保存: {date}")
    
    def get_daily_summary(self, user_id, date):
        """获取每日汇总"""
        key = f"user:{user_id}:summary:{date}"
        
        if self.client:
            data = self.client.get(key)
            return json.loads(data) if data else None
        else:
            return self.memory_store.get(key)
    
    def get_summary_range(self, user_id, start_date, end_date):
        """获取日期范围内的汇总数据"""
        summaries = []
        
        # 生成日期范围
        from datetime import datetime, timedelta
        start = datetime.strptime(start_date, '%Y-%m-%d')
        end = datetime.strptime(end_date, '%Y-%m-%d')
        
        current = start
        while current <= end:
            date_str = current.strftime('%Y-%m-%d')
            summary = self.get_daily_summary(user_id, date_str)
            if summary:
                summaries.append(summary)
            current += timedelta(days=1)
        
        return summaries
    
    # ==================== 用户配置相关 ====================
    
    def save_user_profile(self, user_id, profile):
        """保存用户配置"""
        key = f"user:{user_id}:profile"
        
        if self.client:
            self.client.set(key, json.dumps(profile))
        else:
            self.memory_store[key] = profile
        
        logger.info(f"用户配置已保存: {user_id}")
    
    def get_user_profile(self, user_id):
        """获取用户配置"""
        key = f"user:{user_id}:profile"
        
        if self.client:
            data = self.client.get(key)
            if data:
                return json.loads(data)
        else:
            if key in self.memory_store:
                return self.memory_store[key]
        
        # 返回默认配置
        return {
            'id': user_id,
            'name': '用户名',
            'weightGoal': 5000,
            'currentWeightLoss': 0,
            'startDate': datetime.now().strftime('%Y-%m-%d'),
            'garminConnected': False,
            'lastSync': None
        }

