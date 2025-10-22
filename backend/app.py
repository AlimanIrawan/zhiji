"""
脂记 Backend API
使用Flask构建的轻量级后端服务
"""
import os
import json
import logging
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# 导入服务模块
from services.redis_service import RedisService
from services.openai_service import OpenAIService
from services.garmin_service import GarminService
from services.fat_calculator import estimate_fat_change

# 加载环境变量
load_dotenv()

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 创建Flask应用
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')

# 配置CORS
frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:8000')
CORS(app, origins=[frontend_url, 'http://localhost:8000', 'http://127.0.0.1:8000', 'http://localhost:3000', 'http://127.0.0.1:3000'])

# 初始化服务
redis_service = RedisService()
openai_service = OpenAIService()
garmin_service = GarminService()

# ==================== 健康检查 ====================

@app.route('/health', methods=['GET'])
def health_check():
    """健康检查端点"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'services': {
            'redis': redis_service.is_connected(),
            'openai': openai_service.is_configured(),
            'garmin': garmin_service.is_configured()
        }
    })

# ==================== 饮食记录相关 ====================

@app.route('/api/analyze-food', methods=['POST'])
def analyze_food():
    """
    分析食物营养成分
    接收图片（base64）和描述，返回营养数据和AI建议
    """
    try:
        data = request.json
        image_base64 = data.get('image')  # base64格式的图片
        description = data.get('description', '')
        
        logger.info(f"收到食物分析请求: {description[:50]}...")
        
        # 调用OpenAI分析
        result = openai_service.analyze_food(image_base64, description)
        
        logger.info(f"分析完成: {result['calories']} kcal")
        
        return jsonify({
            'success': True,
            'data': result
        })
        
    except Exception as e:
        logger.error(f"食物分析失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/records', methods=['POST'])
def save_record():
    """保存饮食记录"""
    try:
        data = request.json
        user_id = data.get('user_id', 'default_user')
        
        # 生成记录ID
        record_id = f"rec_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # 准备记录数据
        record = {
            'id': record_id,
            'date': data.get('date', datetime.now().strftime('%Y-%m-%d')),
            'time': data.get('time', datetime.now().strftime('%H:%M')),
            'description': data.get('description'),
            'calories': data.get('calories'),
            'protein': data.get('protein'),
            'carbs': data.get('carbs'),
            'fat': data.get('fat'),
            'aiAdvice': data.get('aiAdvice'),
            'imageUrl': data.get('imageUrl'),
            'created_at': datetime.now().isoformat()
        }
        
        # 保存到Redis
        redis_service.save_food_record(user_id, record)
        
        # 更新每日汇总
        update_daily_summary(user_id, record['date'])
        
        logger.info(f"记录已保存: {record_id}")
        
        return jsonify({
            'success': True,
            'data': record
        })
        
    except Exception as e:
        logger.error(f"保存记录失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/records', methods=['GET'])
def get_records():
    """获取饮食记录"""
    try:
        user_id = request.args.get('user_id', 'default_user')
        date = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
        
        records = redis_service.get_food_records(user_id, date)
        
        return jsonify({
            'success': True,
            'data': records
        })
        
    except Exception as e:
        logger.error(f"获取记录失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/records/<record_id>', methods=['DELETE'])
def delete_record(record_id):
    """删除饮食记录"""
    try:
        user_id = request.args.get('user_id', 'default_user')
        date = request.args.get('date')
        
        redis_service.delete_food_record(user_id, record_id)
        
        # 更新每日汇总
        if date:
            update_daily_summary(user_id, date)
        
        logger.info(f"记录已删除: {record_id}")
        
        return jsonify({
            'success': True,
            'message': '记录已删除'
        })
        
    except Exception as e:
        logger.error(f"删除记录失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ==================== Garmin数据同步 ====================

@app.route('/api/garmin/sync', methods=['GET', 'POST'])
def sync_garmin():
    """
    同步Garmin数据
    智能同步：如果距离上次同步<1小时，返回缓存数据
    支持获取过去7天的数据
    """
    try:
        logger.info("[GARMIN SYNC] 开始处理Garmin同步请求")
        
        user_id = request.args.get('user_id', 'default_user')
        force = request.args.get('force', 'false').lower() == 'true'
        date = request.args.get('date')
        days = int(request.args.get('days', '1'))  # 新增：获取天数参数
        
        logger.info(f"[GARMIN SYNC] 请求参数 - user_id: {user_id}, force: {force}, date: {date}, days: {days}")
        
        # 检查Garmin服务配置
        if not garmin_service.is_configured():
            logger.error("[GARMIN SYNC] Garmin服务未配置")
            return jsonify({
                'success': False,
                'error': 'Garmin服务未配置，请检查环境变量GARMIN_EMAIL和GARMIN_PASSWORD'
            }), 400
        
        # 如果请求多天数据
        if days > 1:
            logger.info(f"[GARMIN SYNC] 获取过去{days}天的数据")
            
            # 生成日期列表
            from datetime import timedelta
            end_date = datetime.strptime(date, '%Y-%m-%d') if date else datetime.now()
            date_list = []
            
            for i in range(days):
                target_date = end_date - timedelta(days=i)
                date_list.append(target_date.strftime('%Y-%m-%d'))
            
            # 获取多天数据
            multi_day_data = []
            for target_date in date_list:
                cache_key = f"{user_id}_{target_date}"
                
                # 检查缓存
                cached_data = redis_service.get_garmin_data(cache_key)
                if cached_data and not force:
                    logger.info(f"[GARMIN SYNC] 使用缓存数据: {target_date}")
                    multi_day_data.append(cached_data)
                else:
                    # 同步数据
                    try:
                        logger.info(f"[GARMIN SYNC] 同步数据: {target_date}")
                        garmin_data = garmin_service.sync_data(target_date)
                        
                        # 保存到Redis
                        redis_service.save_garmin_data(cache_key, garmin_data)
                        redis_service.set_last_sync_time(cache_key, datetime.now().isoformat())
                        
                        multi_day_data.append(garmin_data)
                        
                        # 更新汇总
                        update_daily_summary(user_id, target_date, garmin_data)
                        
                    except Exception as e:
                        logger.error(f"[GARMIN SYNC] 同步{target_date}数据失败: {str(e)}")
                        # 添加空数据占位
                        empty_data = garmin_service._get_empty_data_structure()
                        empty_data['syncDate'] = target_date
                        multi_day_data.append(empty_data)
            
            return jsonify({
                'success': True,
                'data': multi_day_data,
                'cached': False,
                'last_sync': datetime.now().isoformat()
            })
        
        # 单天数据处理（原有逻辑）
        # 如果指定了日期，使用日期相关的缓存键
        cache_key = f"{user_id}_{date}" if date else user_id
        
        # 检查上次同步时间
        last_sync = redis_service.get_last_sync_time(cache_key)
        now = datetime.now()
        
        logger.info(f"[GARMIN SYNC] 缓存键: {cache_key}, 上次同步时间: {last_sync}")
        
        # 如果指定了日期且不是今天，直接检查缓存
        if date and date != now.strftime('%Y-%m-%d'):
            cached_data = redis_service.get_garmin_data(cache_key)
            if cached_data:
                logger.info(f"[GARMIN SYNC] 使用历史日期缓存数据: {date}")
                return jsonify({
                    'success': True,
                    'data': [cached_data],
                    'cached': True,
                    'last_sync': last_sync or 'N/A'
                })
        
        # 对于今天的数据，检查同步时间间隔
        if not force and last_sync:
            time_diff = (now - datetime.fromisoformat(last_sync)).total_seconds() / 3600
            if time_diff < 1:  # 小于1小时
                logger.info(f"[GARMIN SYNC] 使用缓存数据 (上次同步: {time_diff:.1f}小时前)")
                cached_data = redis_service.get_garmin_data(cache_key)
                if cached_data:
                    return jsonify({
                        'success': True,
                        'data': [cached_data],
                        'cached': True,
                        'last_sync': last_sync
                    })
        
        # 执行同步
        logger.info("[GARMIN SYNC] 开始从Garmin Connect获取数据...")
        garmin_data = garmin_service.sync_data(date)
        logger.info(f"[GARMIN SYNC] 获取到数据字段: {list(garmin_data.keys()) if garmin_data else 'None'}")
        
        # 保存到Redis
        logger.info("[GARMIN SYNC] 保存数据到Redis...")
        redis_service.save_garmin_data(cache_key, garmin_data)
        redis_service.set_last_sync_time(cache_key, now.isoformat())
        
        # 更新今日汇总
        today = datetime.now().strftime('%Y-%m-%d')
        logger.info(f"[GARMIN SYNC] 更新日期 {today} 的汇总数据...")
        update_daily_summary(user_id, today, garmin_data)
        
        logger.info("[GARMIN SYNC] Garmin数据同步完成")
        
        return jsonify({
            'success': True,
            'data': [garmin_data],
            'cached': False,
            'last_sync': now.isoformat()
        })
        
    except Exception as e:
        logger.error(f"[GARMIN SYNC] 同步失败: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': f'Garmin同步失败: {str(e)}',
            'error_type': type(e).__name__
        }), 500

@app.route('/api/garmin/test', methods=['GET'])
def test_garmin_connection():
    """
    测试Garmin连接和数据读取
    返回可用的数据类型和示例数据
    """
    try:
        logger.info("开始测试Garmin连接...")
        
        # 检查配置
        if not garmin_service.is_configured():
            return jsonify({
                'success': False,
                'error': '未配置Garmin账号信息',
                'configured': False
            })
        
        # 尝试登录
        try:
            garmin_service.login()
            login_success = True
        except Exception as e:
            logger.error(f"Garmin登录失败: {str(e)}")
            return jsonify({
                'success': False,
                'error': f'Garmin登录失败: {str(e)}',
                'configured': True,
                'login_success': False
            })
        
        # 获取测试数据
        test_data = {}
        
        try:
            # 获取用户信息
            user_info = garmin_service.client.get_user_profile()
            test_data['user_info'] = user_info
        except Exception as e:
            test_data['user_info'] = f'获取用户信息失败: {str(e)}'
        
        try:
            # 获取今日活动数据
            today = datetime.now().strftime('%Y-%m-%d')
            activities = garmin_service.client.get_activities_by_date(today, today)
            test_data['today_activities'] = activities
        except Exception as e:
            test_data['today_activities'] = f'获取今日活动失败: {str(e)}'
        
        try:
            # 获取最近7天的活动
            end_date = datetime.now()
            start_date = end_date - timedelta(days=7)
            recent_activities = garmin_service.client.get_activities_by_date(
                start_date.strftime('%Y-%m-%d'), 
                end_date.strftime('%Y-%m-%d')
            )
            test_data['recent_activities'] = recent_activities[:5]  # 只返回最近5个
        except Exception as e:
            test_data['recent_activities'] = f'获取最近活动失败: {str(e)}'
        
        try:
            # 获取今日心率数据
            heart_rate = garmin_service.client.get_heart_rates(today)
            test_data['heart_rate'] = heart_rate
        except Exception as e:
            test_data['heart_rate'] = f'获取心率数据失败: {str(e)}'
        
        try:
            # 获取今日步数
            steps = garmin_service.client.get_steps_data(today)
            test_data['steps'] = steps
        except Exception as e:
            test_data['steps'] = f'获取步数数据失败: {str(e)}'
        
        try:
            # 获取今日卡路里消耗
            calories = garmin_service.client.get_calories_data(today)
            test_data['calories'] = calories
        except Exception as e:
            test_data['calories'] = f'获取卡路里数据失败: {str(e)}'
        
        logger.info("Garmin测试完成")
        
        return jsonify({
            'success': True,
            'configured': True,
            'login_success': True,
            'test_data': test_data,
            'message': 'Garmin连接测试成功'
        })
        
    except Exception as e:
        logger.error(f"Garmin测试失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'configured': garmin_service.is_configured()
        }), 500

# ==================== 每日汇总 ====================

@app.route('/api/summary', methods=['GET'])
def get_daily_summary():
    """获取每日汇总数据"""
    try:
        user_id = request.args.get('user_id', 'default_user')
        date = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
        
        summary = redis_service.get_daily_summary(user_id, date)
        
        if not summary:
            # 如果没有汇总，计算一个
            summary = calculate_daily_summary(user_id, date)
            redis_service.save_daily_summary(user_id, date, summary)
        
        return jsonify({
            'success': True,
            'data': summary
        })
        
    except Exception as e:
        logger.error(f"获取汇总失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/summary/range', methods=['GET'])
def get_summary_range():
    """获取日期范围内的汇总数据（用于日历显示）"""
    try:
        user_id = request.args.get('user_id', 'default_user')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        summaries = redis_service.get_summary_range(user_id, start_date, end_date)
        
        return jsonify({
            'success': True,
            'data': summaries
        })
        
    except Exception as e:
        logger.error(f"获取范围汇总失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ==================== 用户设置 ====================

@app.route('/api/user/profile', methods=['GET', 'POST'])
def user_profile():
    """获取或更新用户配置"""
    try:
        user_id = request.args.get('user_id', 'default_user')
        
        if request.method == 'GET':
            profile = redis_service.get_user_profile(user_id)
            return jsonify({
                'success': True,
                'data': profile
            })
        
        elif request.method == 'POST':
            profile_data = request.json
            redis_service.save_user_profile(user_id, profile_data)
            return jsonify({
                'success': True,
                'data': profile_data
            })
        
    except Exception as e:
        logger.error(f"用户配置操作失败: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ==================== 辅助函数 ====================

def update_daily_summary(user_id, date, garmin_data=None):
    """更新每日汇总数据"""
    try:
        summary = calculate_daily_summary(user_id, date, garmin_data)
        redis_service.save_daily_summary(user_id, date, summary)
        logger.info(f"每日汇总已更新: {date}")
    except Exception as e:
        logger.error(f"更新每日汇总失败: {str(e)}")

def calculate_daily_summary(user_id, date, garmin_data=None):
    """计算每日汇总数据"""
    # 获取当天所有饮食记录
    records = redis_service.get_food_records(user_id, date)
    
    # 计算总摄入
    total_calories_in = sum(r.get('calories', 0) for r in records)
    total_protein = sum(r.get('protein', 0) for r in records)
    total_carbs = sum(r.get('carbs', 0) for r in records)
    total_fat = sum(r.get('fat', 0) for r in records)
    
    # 获取Garmin数据
    if not garmin_data:
        garmin_data = redis_service.get_garmin_data(user_id) or {}
    
    total_calories_out = garmin_data.get('totalCalories', 2000)
    training_type = garmin_data.get('trainingType', 'none')
    
    # 计算脂肪变化
    fat_change_result = estimate_fat_change(
        total_calories_in, 
        total_calories_out, 
        training_type
    )
    
    return {
        'date': date,
        'totalCaloriesIn': total_calories_in,
        'totalProtein': total_protein,
        'totalCarbs': total_carbs,
        'totalFat': total_fat,
        'totalCaloriesOut': total_calories_out,
        'trainingType': training_type,
        'fatChange': fat_change_result['fat_change_g'],
        'updated_at': datetime.now().isoformat()
    }

# ==================== 错误处理 ====================

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': '接口不存在'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': '服务器内部错误'
    }), 500

# ==================== 启动应用 ====================

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=os.getenv('FLASK_ENV') == 'development')

