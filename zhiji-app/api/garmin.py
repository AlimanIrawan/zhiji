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
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
import traceback

try:
    from garminconnect import Garmin, GarminConnectConnectionError, GarminConnectTooManyRequestsError, GarminConnectAuthenticationError
except ImportError:
    # 如果导入失败，返回错误信息
    class BaseHTTPRequestHandler:
        def __init__(self):
            pass
    
    def handler(request):
        return {
            'statusCode': 500,
            'body': json.dumps({
                'success': False,
                'error': 'garminconnect library not installed'
            })
        }

class GarminHandler(BaseHTTPRequestHandler):
    def __init__(self):
        self.garmin_client = None
        
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        
        response = {
            'success': True,
            'message': 'Garmin API is running',
            'endpoints': {
                'POST /api/garmin': 'Main API endpoint',
                'actions': ['login', 'sync', 'user_info']
            }
        }
        
        self.wfile.write(json.dumps(response).encode('utf-8'))
    
    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
            except json.JSONDecodeError:
                self.send_error_response(400, 'Invalid JSON')
                return
            
            action = data.get('action')
            
            if action == 'login':
                self.handle_login(data)
            elif action == 'sync':
                self.handle_sync(data)
            elif action == 'user_info':
                self.handle_user_info(data)
            else:
                self.send_error_response(400, f'Unknown action: {action}')
                
        except Exception as e:
            self.send_error_response(500, f'Server error: {str(e)}')
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def send_success_response(self, data):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        response = {
            'success': True,
            'data': data
        }
        
        self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
    
    def send_error_response(self, status_code, error_message):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        response = {
            'success': False,
            'error': error_message
        }
        
        self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
    
    def handle_login(self, data):
        """处理登录请求"""
        email = data.get('email') or os.getenv('GARMIN_EMAIL')
        password = data.get('password') or os.getenv('GARMIN_PASSWORD')
        
        if not email or not password:
            self.send_error_response(400, 'Email and password are required')
            return
        
        try:
            self.garmin_client = Garmin(email, password)
            self.garmin_client.login()
            
            self.send_success_response({
                'success': True,
                'message': 'Login successful'
            })
            
        except GarminConnectAuthenticationError:
            self.send_error_response(401, 'Invalid credentials')
        except GarminConnectConnectionError:
            self.send_error_response(503, 'Connection error')
        except Exception as e:
            self.send_error_response(500, f'Login failed: {str(e)}')
    
    def handle_sync(self, data):
        """处理数据同步请求"""
        if not self.garmin_client:
            # 尝试使用环境变量登录
            email = os.getenv('GARMIN_EMAIL')
            password = os.getenv('GARMIN_PASSWORD')
            
            if not email or not password:
                self.send_error_response(401, 'Not logged in and no credentials available')
                return
            
            try:
                self.garmin_client = Garmin(email, password)
                self.garmin_client.login()
            except Exception as e:
                self.send_error_response(401, f'Auto-login failed: {str(e)}')
                return
        
        days = data.get('days', 7)
        
        try:
            sync_data = []
            
            for i in range(days):
                date = datetime.now() - timedelta(days=i)
                date_str = date.strftime('%Y-%m-%d')
                
                day_data = {
                    'date': date_str,
                    'steps': 0,
                    'totalCalories': 0,
                    'activeCalories': 0,
                    'bmrCalories': 1800,
                    'activities': [],
                    'sleep': {}
                }
                
                try:
                    # 获取步数
                    steps = self.garmin_client.get_steps_data(date)
                    if steps:
                        day_data['steps'] = steps.get('totalSteps', 0)
                    
                    # 获取活动数据
                    activities = self.garmin_client.get_activities_by_date(date_str, date_str)
                    if activities:
                        parsed_activities = []
                        total_activity_calories = 0
                        
                        for activity in activities:
                            activity_data = {
                                'activityName': activity.get('activityName', 'Unknown'),
                                'activityType': activity.get('activityType', {}).get('typeKey', 'unknown'),
                                'duration': activity.get('duration', 0),
                                'calories': activity.get('calories', 0),
                                'distance': activity.get('distance', 0)
                            }
                            parsed_activities.append(activity_data)
                            total_activity_calories += activity_data['calories']
                        
                        day_data['activities'] = parsed_activities
                        day_data['activeCalories'] = total_activity_calories
                        day_data['totalCalories'] = day_data['bmrCalories'] + total_activity_calories
                    
                    # 获取睡眠数据
                    try:
                        sleep_data = self.garmin_client.get_sleep_data(date)
                        if sleep_data:
                            day_data['sleep'] = {
                                'totalSleepTimeSeconds': sleep_data.get('totalSleepTimeSeconds', 0),
                                'deepSleepSeconds': sleep_data.get('deepSleepSeconds', 0),
                                'lightSleepSeconds': sleep_data.get('lightSleepSeconds', 0),
                                'remSleepSeconds': sleep_data.get('remSleepSeconds', 0),
                                'awakeSleepSeconds': sleep_data.get('awakeSleepSeconds', 0)
                            }
                    except:
                        pass  # 睡眠数据可能不可用
                    
                except Exception as e:
                    print(f"Error getting data for {date_str}: {str(e)}")
                    # 继续处理其他日期
                
                sync_data.append(day_data)
            
            self.send_success_response({
                'data': sync_data,
                'synced_at': datetime.now().isoformat()
            })
            
        except GarminConnectTooManyRequestsError:
            self.send_error_response(429, 'Too many requests')
        except Exception as e:
            self.send_error_response(500, f'Sync failed: {str(e)}')
    
    def handle_user_info(self, data):
        """处理用户信息请求"""
        if not self.garmin_client:
            # 尝试使用环境变量登录
            email = os.getenv('GARMIN_EMAIL')
            password = os.getenv('GARMIN_PASSWORD')
            
            if not email or not password:
                self.send_error_response(401, 'Not logged in and no credentials available')
                return
            
            try:
                self.garmin_client = Garmin(email, password)
                self.garmin_client.login()
            except Exception as e:
                self.send_error_response(401, f'Auto-login failed: {str(e)}')
                return
        
        try:
            user_profile = self.garmin_client.get_user_profile()
            
            self.send_success_response({
                'user_info': {
                    'displayName': user_profile.get('displayName', 'Unknown User'),
                    'email': user_profile.get('email', ''),
                    'profileId': user_profile.get('profileId', '')
                }
            })
            
        except Exception as e:
            self.send_error_response(500, f'Failed to get user info: {str(e)}')

# Vercel handler
handler = GarminHandler()