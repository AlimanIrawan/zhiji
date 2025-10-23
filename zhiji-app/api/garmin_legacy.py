#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Garmin Connect API for Vercel Serverless Functions
使用 Python garminconnect 库获取 Garmin 数据
"""

import json
import os
import sys
from datetime import datetime, timedelta
import traceback

try:
    from garminconnect import Garmin, GarminConnectConnectionError, GarminConnectTooManyRequestsError, GarminConnectAuthenticationError
except ImportError:
    # 如果导入失败，返回错误信息
    def handler(request):
        return {
            'statusCode': 500,
            'body': json.dumps({
                'success': False,
                'error': 'garminconnect library not installed'
            })
        }

def main():
    """主函数，处理来自stdin的JSON请求"""
    try:
        # 从stdin读取请求数据
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({
                'success': False,
                'error': 'No input data provided'
            }))
            return
            
        request_data = json.loads(input_data)
        action = request_data.get('action')
        
        if action == 'login':
            result = handle_login(request_data)
        elif action == 'sync':
            result = handle_sync(request_data)
        elif action == 'user_info':
            result = handle_user_info(request_data)
        else:
            result = {
                'success': False,
                'error': f'Unknown action: {action}'
            }
            
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': f'Script error: {str(e)}',
            'traceback': traceback.format_exc()
        }))

def handle_login(data):
    """处理登录请求"""
    try:
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return {
                'success': False,
                'error': 'Email and password are required'
            }
        
        # 创建Garmin客户端并登录
        garmin_client = Garmin(email, password)
        garmin_client.login()
        
        return {
            'success': True,
            'data': {
                'success': True,
                'message': 'Login successful'
            }
        }
        
    except GarminConnectAuthenticationError as e:
        return {
            'success': False,
            'error': f'Authentication failed: {str(e)}'
        }
    except Exception as e:
        return {
            'success': False,
            'error': f'Login error: {str(e)}'
        }

def handle_sync(data):
    """处理数据同步请求"""
    try:
        # 使用环境变量中的凭据
        email = os.getenv('GARMIN_EMAIL')
        password = os.getenv('GARMIN_PASSWORD')
        
        if not email or not password:
            return {
                'success': False,
                'error': 'Garmin credentials not configured in environment variables'
            }
        
        # 创建Garmin客户端并登录
        garmin_client = Garmin(email, password)
        garmin_client.login()
        
        days = data.get('days', 7)
        
        # 获取数据
        sync_data = {}
        
        # 获取最近几天的数据
        for i in range(days):
            date = datetime.now() - timedelta(days=i)
            date_str = date.strftime('%Y-%m-%d')
            
            try:
                # 获取当日数据
                daily_data = {
                    'date': date_str,
                    'steps': 0,
                    'calories': 0,
                    'distance': 0,
                    'sleep': None,
                    'activities': []
                }
                
                # 获取步数等基础数据
                try:
                    steps_data = garmin_client.get_steps_data(date_str)
                    if steps_data:
                        daily_data['steps'] = steps_data.get('totalSteps', 0)
                except:
                    pass
                
                # 获取睡眠数据
                try:
                    sleep_data = garmin_client.get_sleep_data(date_str)
                    if sleep_data:
                        daily_data['sleep'] = {
                            'totalSleepTimeSeconds': sleep_data.get('totalSleepTimeSeconds', 0),
                            'deepSleepSeconds': sleep_data.get('deepSleepSeconds', 0),
                            'lightSleepSeconds': sleep_data.get('lightSleepSeconds', 0),
                            'remSleepSeconds': sleep_data.get('remSleepSeconds', 0),
                            'awakeSleepSeconds': sleep_data.get('awakeSleepSeconds', 0)
                        }
                except:
                    pass
                
                # 获取活动数据
                try:
                    activities = garmin_client.get_activities_by_date(date_str, date_str)
                    if activities:
                        daily_data['activities'] = activities[:5]  # 限制返回前5个活动
                except:
                    pass
                
                sync_data[date_str] = daily_data
                
            except Exception as e:
                print(f"Error getting data for {date_str}: {str(e)}", file=sys.stderr)
                continue
        
        return {
            'success': True,
            'data': {
                'data': sync_data,
                'message': f'Successfully synced {len(sync_data)} days of data'
            }
        }
        
    except GarminConnectAuthenticationError as e:
        return {
            'success': False,
            'error': f'Authentication failed: {str(e)}'
        }
    except Exception as e:
        return {
            'success': False,
            'error': f'Sync error: {str(e)}'
        }

def handle_user_info(data):
    """处理用户信息请求"""
    try:
        # 使用环境变量中的凭据
        email = os.getenv('GARMIN_EMAIL')
        password = os.getenv('GARMIN_PASSWORD')
        
        if not email or not password:
            return {
                'success': False,
                'error': 'Garmin credentials not configured in environment variables'
            }
        
        # 创建Garmin客户端并登录
        garmin_client = Garmin(email, password)
        garmin_client.login()
        
        # 获取用户信息
        user_profile = garmin_client.get_user_profile()
        
        return {
            'success': True,
            'data': {
                'user_info': user_profile,
                'message': 'User info retrieved successfully'
            }
        }
        
    except GarminConnectAuthenticationError as e:
        return {
            'success': False,
            'error': f'Authentication failed: {str(e)}'
        }
    except Exception as e:
        return {
            'success': False,
            'error': f'User info error: {str(e)}'
        }

if __name__ == '__main__':
    main()