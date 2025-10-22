'use client';

import { useState, useEffect } from 'react';
import { Activity, RefreshCw, Heart, Footprints, Zap, Clock, Target, TrendingUp, Calendar, AlertCircle, CheckCircle, Flame, Timer } from 'lucide-react';
import Navigation from '@/components/layout/navigation';
import { scheduler } from '@/lib/scheduler';

interface GarminData {
  userId: string;
  syncDate: string;
  totalCalories: number;
  activeCalories: number;
  restingCalories: number;
  bmrCalories?: number;
  steps: number;
  distance: number;
  floorsClimbed: number;
  heartRate: {
    resting: number;
    average: number;
    max: number;
    zones?: {
      zone1: number;
      zone2: number;
      zone3: number;
      zone4: number;
      zone5: number;
    };
  };
  activities: Array<{
    id: string;
    name: string;
    type: string;
    startTime: string;
    duration: number;
    calories: number;
    distance: number;
  }>;
  trainingType: 'none' | 'A' | 'S' | 'both';
  syncedAt: string;
  dailyStats?: any;
  isMock?: boolean;
}

export default function GarminPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [garminData, setGarminData] = useState<GarminData | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [nextSyncTime, setNextSyncTime] = useState<string | null>(null);

  useEffect(() => {
    console.log('[DEBUG] GarminPage: 组件已挂载');
    loadGarminData();
    
    // 启动自动同步调度器
    scheduler.setupDailySync();
    
    // 设置下次同步时间
    const nextSync = scheduler.getNextSyncTime();
    setNextSyncTime(nextSync.toISOString());
    
    // 组件卸载时清理定时器
    return () => {
      scheduler.clearAllTimers();
    };
  }, []);

  const loadGarminData = async () => {
    try {
      setIsLoading(true);
      console.log('[DEBUG] GarminPage: 开始加载数据');
      
      // 获取最近的 Garmin 数据
      const response = await fetch('/api/garmin/sync');
      const result = await response.json();
      
      if (result.success && result.data && result.data.length > 0) {
        setGarminData(result.data[0]); // 获取最新的数据
        setIsConfigured(true);
        setLastSyncTime(result.data[0].syncedAt);
        console.log('[DEBUG] GarminPage: 数据加载成功:', result.data[0]);
      } else {
        console.log('[DEBUG] GarminPage: 暂无数据');
        setIsConfigured(false);
      }
    } catch (error) {
      console.error('[ERROR] GarminPage: 数据加载失败:', error);
      setIsConfigured(false);
    } finally {
      setIsLoading(false);
    }
  };



  const handleSync = async () => {
    console.log('[DEBUG] GarminPage: 开始同步');
    setIsSyncing(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/garmin/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setGarminData(result.data);
        setSuccess('Garmin 数据同步成功！');
        setIsConfigured(true);
        setLastSyncTime(result.data.syncedAt);
        console.log('[DEBUG] GarminPage: 同步成功:', result.data);
      } else {
        setError(result.error || '同步失败');
        console.error('[ERROR] GarminPage: 同步失败:', result.error);
      }
    } catch (error) {
      console.error('[ERROR] GarminPage: 同步异常:', error);
      setError('同步失败，请稍后重试');
    } finally {
      setIsSyncing(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟`;
  };

  const getTrainingTypeText = (type: string) => {
    switch (type) {
      case 'A': return '有氧训练';
      case 'S': return '力量训练';
      case 'both': return '混合训练';
      default: return '无训练';
    }
  };

  const getTrainingTypeColor = (type: string) => {
    switch (type) {
      case 'A': return 'bg-blue-100 text-blue-800';
      case 'S': return 'bg-red-100 text-red-800';
      case 'both': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="pt-16 pb-20 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="pt-16 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">设备同步</h1>
              <p className="text-gray-600 mt-1">通过 Garmin Connect 同步您的运动数据</p>
              {lastSyncTime && (
                <p className="text-sm text-gray-500 mt-1">
                  最后同步: {new Date(lastSyncTime).toLocaleString('zh-CN')}
                </p>
              )}
              {nextSyncTime && (
                <p className="text-sm text-blue-600 mt-1">
                  下次自动同步: {new Date(nextSyncTime).toLocaleString('zh-CN')}
                </p>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="bg-primary-600 text-white px-6 py-3 rounded-lg flex items-center hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`h-5 w-5 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? '同步中...' : '立即同步'}
              </button>
            </div>
          </div>



          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-8">
              <div className="flex">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* 同步状态卡片 */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-12 h-12 ${garminData ? 'bg-green-100' : 'bg-gray-100'} rounded-lg flex items-center justify-center mr-4`}>
                  <Activity className={`h-6 w-6 ${garminData ? 'text-green-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    Garmin Connect
                    {garminData?.isMock && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">模拟数据</span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {garminData ? `数据日期: ${garminData.syncDate}` : '尚未同步'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  garminData ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {garminData ? '已连接' : '未连接'}
                </div>
              </div>
            </div>
          </div>

          {garminData && (
            <>
              {/* 核心数据概览 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* 总卡路里 */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">总消耗卡路里</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {garminData.totalCalories.toLocaleString()}
                      </p>
                      {garminData.activeCalories > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          活动: {garminData.activeCalories} | 基础: {garminData.bmrCalories || garminData.restingCalories}
                        </p>
                      )}
                    </div>
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                      <Flame className="h-6 w-6 text-red-600" />
                    </div>
                  </div>
                </div>

                {/* 步数 */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">步数</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {garminData.steps.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        距离: {garminData.distance.toFixed(1)}km
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Footprints className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                {/* 心率 */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">心率</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {garminData.heartRate.average || '--'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        静息: {garminData.heartRate.resting} | 最高: {garminData.heartRate.max}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
                      <Heart className="h-6 w-6 text-pink-600" />
                    </div>
                  </div>
                </div>

                {/* 训练类型 */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">训练类型</p>
                      <p className="text-lg font-bold text-gray-900 mb-2">
                        {getTrainingTypeText(garminData.trainingType)}
                      </p>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTrainingTypeColor(garminData.trainingType)}`}>
                        {garminData.trainingType.toUpperCase()}
                      </span>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Target className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 详细统计数据 */}
              {garminData.dailyStats && Object.keys(garminData.dailyStats).length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">详细统计</h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {Object.entries(garminData.dailyStats).map(([key, value]) => (
                        <div key={key} className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-xs text-gray-600 uppercase tracking-wide">{key}</p>
                          <p className="text-lg font-semibold text-gray-900 mt-1">
                            {typeof value === 'number' ? value.toLocaleString() : String(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 活动列表 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">今日活动</h3>
                </div>
                <div className="p-6">
                  {garminData.activities && garminData.activities.length > 0 ? (
                    <div className="space-y-4">
                      {garminData.activities.map((activity, index) => (
                        <div key={activity.id || index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-center">
                            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mr-4">
                              <Activity className="h-6 w-6 text-primary-600" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{activity.name}</h4>
                              <p className="text-sm text-gray-600 flex items-center gap-2">
                                <span>{activity.type}</span>
                                {activity.duration > 0 && (
                                  <>
                                    <span>•</span>
                                    <Timer className="h-3 w-3" />
                                    <span>{formatDuration(activity.duration)}</span>
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {activity.distance > 0 && (
                              <p className="text-sm font-medium text-gray-900">
                                {activity.distance.toFixed(1)} km
                              </p>
                            )}
                            {activity.calories > 0 && (
                              <p className="text-sm text-gray-600">
                                {activity.calories} 卡路里
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">暂无活动数据</h3>
                      <p className="text-gray-600 mb-6">
                        今天还没有记录到运动活动
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* 无数据状态 */}
          {!garminData && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="text-center py-12">
                <Activity className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">暂无同步数据</h3>
                <p className="text-gray-600 mb-6">
                  点击"立即同步"按钮开始同步您的 Garmin 数据
                </p>
                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="bg-primary-600 text-white px-6 py-3 rounded-lg flex items-center mx-auto hover:bg-primary-700 disabled:opacity-50"
                >
                  <RefreshCw className={`h-5 w-5 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? '同步中...' : '立即同步'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}