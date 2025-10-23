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
        
        # 创建Garmin客户端
        garmin_client = Garmin(email, password)
        
        # 尝试登录
        try:
            garmin_client.login()
            logger.info("Garmin login successful")
            
            # 简单验证登录状态 - 只获取基本用户信息
            try:
                # 使用最简单的API调用来验证登录状态
                user_profile = garmin_client.get_full_name()
                if user_profile:
                    logger.info(f"Login verified - user: {user_profile}")
                    return jsonify({
                        'success': True,
                        'message': 'Successfully logged in to Garmin Connect',
                        'user_info': {
                            'name': user_profile,
                            'email': email
                        }
                    })
                else:
                    # 如果获取用户名失败，但登录成功，仍然返回成功
                    logger.warning("Could not retrieve user profile, but login appears successful")
                    return jsonify({
                        'success': True,
                        'message': 'Successfully logged in to Garmin Connect',
                        'user_info': {
                            'email': email
                        }
                    })
                    
            except Exception as profile_error:
                logger.warning(f"Could not retrieve user profile after login: {profile_error}")
                
                # 检查是否是隐私保护问题
                error_msg = str(profile_error).lower()
                if "privacy" in error_msg or "protected" in error_msg:
                    logger.info("Privacy protection detected, but login successful")
                    return jsonify({
                        'success': True,
                        'message': 'Successfully logged in to Garmin Connect (privacy protection active)',
                        'user_info': {
                            'email': email
                        },
                        'warning': 'Some data may be privacy protected. Please check your Garmin Connect privacy settings.'
                    })
                
                # 对于其他错误，仍然认为登录成功（因为login()没有抛出异常）
                return jsonify({
                    'success': True,
                    'message': 'Successfully logged in to Garmin Connect',
                    'user_info': {
                        'email': email
                    },
                    'warning': 'Could not verify user profile, but login appears successful.'
                })
                
        except Exception as login_error:
            logger.error(f"Garmin login failed: {login_error}")
            garmin_client = None
            
            # 分析登录错误类型
            error_msg = str(login_error).lower()
            if "privacy" in error_msg or "protected" in error_msg:
                return jsonify({
                    'success': False,
                    'error': 'Privacy protection is active on your Garmin account. Please check your Garmin Connect privacy settings and try again.',
                    'error_type': 'privacy_protected'
                }), 403
            elif "authentication" in error_msg or "credential" in error_msg or "password" in error_msg:
                return jsonify({
                    'success': False,
                    'error': 'Invalid email or password. Please check your Garmin Connect credentials.',
                    'error_type': 'invalid_credentials'
                }), 401
            elif "too many" in error_msg or "rate limit" in error_msg:
                return jsonify({
                    'success': False,
                    'error': 'Too many login attempts. Please wait a few minutes and try again.',
                    'error_type': 'rate_limited'
                }), 429
            elif "network" in error_msg or "connection" in error_msg:
                return jsonify({
                    'success': False,
                    'error': 'Network connection error. Please check your internet connection and try again.',
                    'error_type': 'network_error'
                }), 503
            else:
                return jsonify({
                    'success': False,
                    'error': f'Login failed: {str(login_error)}',
                    'error_type': 'unknown_error'
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
    """Garmin数据同步端点 - 优化版本，只获取必要数据"""
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
        days_count = min(data.get('days', 3), 7)  # 限制最多7天，默认3天
        
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
        
        # 获取数据 - 只获取核心健康数据
        result_data = []
        
        for i in range(days_count):
            current_date = date_obj - timedelta(days=i)
            date_str = current_date.strftime('%Y-%m-%d')
            
            try:
                logger.info(f"Fetching essential data for {date_str}")
                
                # 添加延迟以避免API限制
                import time
                if i > 0:  # 第一次请求不延迟
                    time.sleep(2)  # 增加到2秒延迟
                
                day_data = {
                    'date': date_str,
                    'steps': None,
                    'heart_rate': None,
                    'sleep': None,
                    'weight': None,
                    'activities_summary': None
                }
                
                # 1. 获取步数数据（最重要的基础数据）
                try:
                    steps_data = garmin_client.get_steps_data(date_str)
                    if steps_data and not (isinstance(steps_data, dict) and steps_data.get('privacyProtected')):
                        # 只提取关键步数信息
                        day_data['steps'] = {
                            'total_steps': steps_data.get('totalSteps', 0),
                            'step_goal': steps_data.get('stepGoal', 0),
                            'distance': steps_data.get('totalDistance', 0)
                        }
                        logger.info(f"Steps data retrieved for {date_str}: {day_data['steps']['total_steps']} steps")
                    else:
                        logger.warning(f"Steps data privacy protected for {date_str}")
                except Exception as steps_error:
                    logger.warning(f"Could not fetch steps data for {date_str}: {steps_error}")
                
                # 2. 获取心率数据（核心健康指标）
                try:
                    hr_data = garmin_client.get_heart_rates(date_str)
                    if hr_data and not (isinstance(hr_data, dict) and hr_data.get('privacyProtected')):
                        # 只提取关键心率信息
                        day_data['heart_rate'] = {
                            'resting_hr': hr_data.get('restingHeartRate'),
                            'max_hr': hr_data.get('maxHeartRate'),
                            'min_hr': hr_data.get('minHeartRate')
                        }
                        logger.info(f"Heart rate data retrieved for {date_str}")
                    else:
                        logger.warning(f"Heart rate data privacy protected for {date_str}")
                except Exception as hr_error:
                    logger.warning(f"Could not fetch heart rate data for {date_str}: {hr_error}")
                
                # 3. 获取睡眠数据（如果可用）
                try:
                    sleep_data = garmin_client.get_sleep_data(date_str)
                    if sleep_data and not (isinstance(sleep_data, dict) and sleep_data.get('privacyProtected')):
                        # 只提取关键睡眠信息
                        daily_sleep = sleep_data.get('dailySleepDTO', {})
                        day_data['sleep'] = {
                            'total_sleep_time': daily_sleep.get('sleepTimeSeconds'),
                            'deep_sleep_time': daily_sleep.get('deepSleepSeconds'),
                            'light_sleep_time': daily_sleep.get('lightSleepSeconds'),
                            'rem_sleep_time': daily_sleep.get('remSleepSeconds'),
                            'sleep_score': daily_sleep.get('overallSleepScore')
                        }
                        logger.info(f"Sleep data retrieved for {date_str}")
                    else:
                        logger.warning(f"Sleep data privacy protected for {date_str}")
                except Exception as sleep_error:
                    logger.warning(f"Could not fetch sleep data for {date_str}: {sleep_error}")
                
                # 4. 获取体重数据（如果有）
                try:
                    weight_data = garmin_client.get_body_composition(date_str)
                    if weight_data and not (isinstance(weight_data, dict) and weight_data.get('privacyProtected')):
                        # 只提取体重信息
                        if weight_data.get('totalAverage'):
                            day_data['weight'] = {
                                'weight': weight_data['totalAverage'].get('weight'),
                                'bmi': weight_data['totalAverage'].get('bmi')
                            }
                            logger.info(f"Weight data retrieved for {date_str}")
                except Exception as weight_error:
                    logger.warning(f"Could not fetch weight data for {date_str}: {weight_error}")
                
                # 5. 获取活动汇总（简化版本）
                try:
                    activities = garmin_client.get_activities_by_date(date_str, date_str)
                    if activities and not (isinstance(activities, dict) and activities.get('privacyProtected')):
                        # 只提取活动数量和类型
                        day_data['activities_summary'] = {
                            'total_activities': len(activities) if activities else 0,
                            'activity_types': list(set([act.get('activityType', {}).get('typeKey', 'unknown') 
                                                      for act in activities[:5]])) if activities else []  # 最多5个活动类型
                        }
                        logger.info(f"Activities summary retrieved for {date_str}: {day_data['activities_summary']['total_activities']} activities")
                    else:
                        logger.warning(f"Activities data privacy protected for {date_str}")
                except Exception as activities_error:
                    logger.warning(f"Could not fetch activities for {date_str}: {activities_error}")
                
                result_data.append(day_data)
                logger.info(f"Successfully processed essential data for {date_str}")
                
            except Exception as e:
                logger.error(f"Error fetching data for {date_str}: {e}")
                
                # 检查是否是隐私保护或认证错误
                error_msg = str(e).lower()
                if "privacy" in error_msg or "protected" in error_msg:
                    logger.error("Privacy protection error - stopping sync")
                    return jsonify({
                        'success': False,
                        'error': 'Privacy protection activated. Please check your Garmin Connect privacy settings or try again later.',
                        'partial_data': result_data if result_data else None
                    }), 403
                elif "authentication" in error_msg or "login" in error_msg:
                    logger.error("Authentication error - need re-login")
                    return jsonify({
                        'success': False,
                        'error': 'Authentication expired. Please re-login to Garmin Connect.',
                        'partial_data': result_data if result_data else None
                    }), 401
                elif "too many" in error_msg or "rate limit" in error_msg:
                    logger.error("Rate limit error - stopping sync")
                    return jsonify({
                        'success': False,
                        'error': 'API rate limit exceeded. Please try again later.',
                        'partial_data': result_data if result_data else None
                    }), 429
                
                # 对于其他错误，记录但继续处理下一天
                day_data = {
                    'date': date_str,
                    'error': str(e),
                    'steps': None,
                    'heart_rate': None,
                    'sleep': None,
                    'weight': None,
                    'activities_summary': None
                }
                result_data.append(day_data)
        
        logger.info(f"Sync completed. Retrieved data for {len(result_data)} days")
        
        return jsonify({
            'success': True,
            'data': result_data,
            'message': f'Successfully synced {len(result_data)} days of essential health data'
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