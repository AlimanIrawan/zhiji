#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
脂记应用 - Garmin Connect 后端服务
独立的Python后端，专门处理Garmin数据同步
部署到Render.com
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
from datetime import datetime, timedelta
import traceback
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    from garminconnect import (
        Garmin, 
        GarminConnectConnectionError, 
        GarminConnectTooManyRequestsError, 
        GarminConnectAuthenticationError
    )
    GARMIN_AVAILABLE = True
except ImportError as e:
    logger.error(f"garminconnect library not available: {e}")
    GARMIN_AVAILABLE = False

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 全局Garmin客户端实例
garmin_client = None

@app.route('/health', methods=['GET'])
def health_check():
    """健康检查端点"""
    return jsonify({
        'status': 'healthy',
        'garmin_available': GARMIN_AVAILABLE,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/garmin/login', methods=['POST'])
def garmin_login():
    """Garmin登录端点"""
    global garmin_client
    
    if not GARMIN_AVAILABLE:
        return jsonify({
            'success': False,
            'error': 'garminconnect library not available'
        }), 500
    
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({
                'success': False,
                'error': 'Email and password are required'
            }), 400
        
        logger.info(f"Attempting Garmin login for user: {email}")
        
        # 创建新的Garmin客户端实例
        garmin_client = Garmin(email, password)
        
        # 尝试登录
        try:
            garmin_client.login()
            logger.info("Garmin login successful")
            
            # 验证登录状态
            try:
                user_info = garmin_client.get_full_name()
                logger.info(f"User info retrieved: {user_info}")
                
                return jsonify({
                    'success': True,
                    'message': 'Login successful',
                    'user_info': user_info
                })
            except Exception as info_error:
                logger.warning(f"Could not retrieve user info: {info_error}")
                return jsonify({
                    'success': True,
                    'message': 'Login successful (user info unavailable)',
                    'user_info': None
                })
                
        except Exception as login_error:
            logger.error(f"Garmin login failed: {login_error}")
            garmin_client = None
            
            # 检查是否是认证错误
            error_msg = str(login_error).lower()
            if "authentication" in error_msg or "login" in error_msg or "password" in error_msg:
                return jsonify({
                    'success': False,
                    'error': 'Invalid email or password'
                }), 401
            elif "privacy" in error_msg or "protected" in error_msg:
                return jsonify({
                    'success': False,
                    'error': 'Account privacy protection activated. Please try again later.'
                }), 429
            else:
                return jsonify({
                    'success': False,
                    'error': f'Authentication failed: {str(login_error)}'
                }), 500
        
    except Exception as e:
        logger.error(f"Garmin login error: {e}")
        logger.error(traceback.format_exc())
        garmin_client = None
        return jsonify({
            'success': False,
            'error': f'Login error: {str(e)}'
        }), 500

@app.route('/api/garmin/sync', methods=['POST'])
def garmin_sync():
    """Garmin数据同步端点"""
    global garmin_client
    
    if not GARMIN_AVAILABLE:
        return jsonify({
            'success': False,
            'error': 'garminconnect library not available'
        }), 500
    
    if not garmin_client:
        return jsonify({
            'success': False,
            'error': 'Not logged in. Please login first.'
        }), 401
    
    try:
        data = request.get_json()
        target_date = data.get('date')
        days_count = data.get('days', 7)  # 默认获取7天数据
        
        # 设置目标日期
        if target_date:
            try:
                date_obj = datetime.strptime(target_date, '%Y-%m-%d')
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Invalid date format. Use YYYY-MM-DD'
                }), 400
        else:
            date_obj = datetime.now()
        
        logger.info(f"Syncing Garmin data for {days_count} days from {date_obj.strftime('%Y-%m-%d')}")
        
        # 获取数据
        result_data = []
        
        for i in range(days_count):
            current_date = date_obj - timedelta(days=i)
            date_str = current_date.strftime('%Y-%m-%d')
            
            try:
                logger.info(f"Fetching data for {date_str}")
                
                # 添加延迟以避免API限制
                import time
                time.sleep(1)
                
                # 获取每日汇总数据
                daily_summary = None
                try:
                    daily_summary = garmin_client.get_stats(date_str)
                    logger.info(f"Daily summary fetched for {date_str}")
                except Exception as stats_error:
                    logger.warning(f"Could not fetch daily stats for {date_str}: {stats_error}")
                
                # 获取活动数据
                activities = []
                try:
                    activities = garmin_client.get_activities_by_date(date_str, date_str)
                    logger.info(f"Activities fetched for {date_str}: {len(activities) if activities else 0} activities")
                except Exception as activities_error:
                    logger.warning(f"Could not fetch activities for {date_str}: {activities_error}")
                
                # 获取睡眠数据
                sleep_data = None
                try:
                    sleep_data = garmin_client.get_sleep_data(date_str)
                    logger.info(f"Sleep data fetched for {date_str}")
                except Exception as sleep_error:
                    logger.warning(f"Could not fetch sleep data for {date_str}: {sleep_error}")
                
                # 获取心率数据
                heart_rate_data = None
                try:
                    heart_rate_data = garmin_client.get_heart_rates(date_str)
                    logger.info(f"Heart rate data fetched for {date_str}")
                except Exception as hr_error:
                    logger.warning(f"Could not fetch heart rate data for {date_str}: {hr_error}")
                
                day_data = {
                    'date': date_str,
                    'daily_summary': daily_summary,
                    'activities': activities or [],
                    'sleep': sleep_data,
                    'heart_rate': heart_rate_data
                }
                
                result_data.append(day_data)
                logger.info(f"Successfully processed data for {date_str}")
                
            except Exception as e:
                logger.error(f"Error fetching data for {date_str}: {e}")
                # 检查是否是认证错误
                if "privacy" in str(e).lower() or "protected" in str(e).lower():
                    logger.error("Privacy protection error - may need re-authentication")
                    return jsonify({
                        'success': False,
                        'error': 'Privacy protection error. Please re-login to Garmin Connect.'
                    }), 401
                
                day_data = {
                    'date': date_str,
                    'error': str(e),
                    'daily_summary': None,
                    'activities': [],
                    'sleep': None,
                    'heart_rate': None
                }
                result_data.append(day_data)
        
        logger.info(f"Sync completed. Retrieved data for {len(result_data)} days")
        
        return jsonify({
            'success': True,
            'data': result_data
        })
        
    except Exception as e:
        logger.error(f"Garmin sync error: {e}")
        logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': f'Sync error: {str(e)}'
        }), 500

@app.route('/api/garmin/user-info', methods=['POST'])
def garmin_user_info():
    """获取Garmin用户信息"""
    global garmin_client
    
    if not GARMIN_AVAILABLE:
        return jsonify({
            'success': False,
            'error': 'garminconnect library not available'
        }), 500
    
    if not garmin_client:
        return jsonify({
            'success': False,
            'error': 'Not logged in. Please login first.'
        }), 401
    
    try:
        logger.info("Fetching Garmin user info")
        
        # 获取用户信息
        user_profile = garmin_client.get_full_name()
        user_settings = garmin_client.get_user_settings()
        
        return jsonify({
            'success': True,
            'data': {
                'profile': user_profile,
                'settings': user_settings
            }
        })
        
    except Exception as e:
        logger.error(f"Error fetching user info: {e}")
        logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': f'Error fetching user info: {str(e)}'
        }), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Endpoint not found'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    logger.info(f"Starting Garmin backend service on port {port}")
    logger.info(f"Debug mode: {debug}")
    logger.info(f"Garmin library available: {GARMIN_AVAILABLE}")
    
    app.run(host='0.0.0.0', port=port, debug=debug)