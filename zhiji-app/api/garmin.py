#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Garmin Connect API for Vercel Serverless Functions
使用 Python garminconnect 库获取 Garmin 数据
"""

import json
import os
from datetime import datetime, timedelta
import traceback
from http.server import BaseHTTPRequestHandler
import urllib.parse

try:
    from garminconnect import Garmin, GarminConnectConnectionError, GarminConnectTooManyRequestsError, GarminConnectAuthenticationError
except ImportError as e:
    # 如果导入失败，创建一个错误处理器
    class Handler(BaseHTTPRequestHandler):
        def do_POST(self):
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            error_response = {
                'success': False,
                'error': f'garminconnect library not installed: {str(e)}'
            }
            self.wfile.write(json.dumps(error_response).encode())
    
    # 导出handler供Vercel使用
    handler = Handler
    
    # 如果作为脚本运行，也要处理
    if __name__ == '__main__':
        print(json.dumps({
            'success': False,
            'error': f'garminconnect library not installed: {str(e)}'
        }))
        exit(1)

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
        
        # 创建Garmin连接
        garmin = Garmin(email, password)
        garmin.login()
        
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
        email = data.get('email')
        password = data.get('password')
        target_date = data.get('date')
        
        if not email or not password:
            return {
                'success': False,
                'error': 'Email and password are required'
            }
        
        # 创建Garmin连接
        garmin = Garmin(email, password)
        garmin.login()
        
        # 设置目标日期
        if target_date:
            try:
                date_obj = datetime.strptime(target_date, '%Y-%m-%d')
            except ValueError:
                return {
                    'success': False,
                    'error': 'Invalid date format. Use YYYY-MM-DD'
                }
        else:
            date_obj = datetime.now()
        
        # 获取数据
        result_data = []
        
        # 获取过去7天的数据
        for i in range(7):
            current_date = date_obj - timedelta(days=i)
            date_str = current_date.strftime('%Y-%m-%d')
            
            try:
                # 获取每日汇总数据
                daily_summary = garmin.get_daily_summary(current_date.strftime('%Y-%m-%d'))
                
                # 获取活动数据
                activities = garmin.get_activities_by_date(current_date.strftime('%Y-%m-%d'))
                
                # 获取睡眠数据
                sleep_data = None
                try:
                    sleep_data = garmin.get_sleep_data(current_date.strftime('%Y-%m-%d'))
                except:
                    pass  # 睡眠数据可能不存在
                
                day_data = {
                    'date': date_str,
                    'daily_summary': daily_summary,
                    'activities': activities,
                    'sleep': sleep_data
                }
                
                result_data.append(day_data)
                
            except Exception as e:
                # 如果某一天的数据获取失败，继续获取其他天的数据
                day_data = {
                    'date': date_str,
                    'error': str(e),
                    'daily_summary': None,
                    'activities': [],
                    'sleep': None
                }
                result_data.append(day_data)
        
        return {
            'success': True,
            'data': result_data
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
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return {
                'success': False,
                'error': 'Email and password are required'
            }
        
        # 创建Garmin连接
        garmin = Garmin(email, password)
        garmin.login()
        
        # 获取用户信息
        user_profile = garmin.get_user_profile()
        
        return {
            'success': True,
            'data': user_profile
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

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # 读取请求体
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            # 解析JSON数据
            try:
                data = json.loads(post_data.decode('utf-8'))
            except json.JSONDecodeError:
                self.send_error_response(400, 'Invalid JSON')
                return
            
            action = data.get('action')
            
            if action == 'login':
                result = handle_login(data)
            elif action == 'sync':
                result = handle_sync(data)
            elif action == 'user_info':
                result = handle_user_info(data)
            else:
                result = {
                    'success': False,
                    'error': f'Unknown action: {action}'
                }
            
            # 发送响应
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
            
        except Exception as e:
            self.send_error_response(500, f'Server error: {str(e)}')
    
    def send_error_response(self, status_code, message):
        self.send_response(status_code)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        error_response = {
            'success': False,
            'error': message
        }
        self.wfile.write(json.dumps(error_response).encode())

# Vercel Serverless Function handler
handler = Handler

# 如果作为脚本运行（用于本地开发）
if __name__ == '__main__':
    import sys
    
    try:
        # 从stdin读取请求数据
        input_data = sys.stdin.read()
        data = json.loads(input_data)
        
        action = data.get('action')
        
        if action == 'login':
            result = handle_login(data)
        elif action == 'sync':
            result = handle_sync(data)
        elif action == 'user_info':
            result = handle_user_info(data)
        else:
            result = {
                'success': False,
                'error': f'Unknown action: {action}'
            }
        
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            'success': False,
            'error': f'Script error: {str(e)}',
            'traceback': traceback.format_exc()
        }
        print(json.dumps(error_result))