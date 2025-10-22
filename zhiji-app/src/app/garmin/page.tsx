'use client';

import { useState, useEffect } from 'react';
import { Activity, RefreshCw, Heart, Footprints, Zap, Clock, Target, TrendingUp, Calendar, AlertCircle, CheckCircle, Flame, Timer, Moon, Battery, Droplets, Wind, Scale, Gauge } from 'lucide-react';
import Navigation from '@/components/layout/navigation';
import { scheduler } from '@/lib/scheduler';

interface GarminData {
  userId?: string;
  syncDate: string;
  totalCalories: number;
  activeCalories: number;
  restingCalories: number;
  bmrCalories?: number;
  steps: number;
  distance?: number;
  floorsClimbed?: number;
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
  sleep?: {
    totalSleepTime: number;
    totalSleepTimeSeconds: number;
    deepSleep: number;
    deepSleepSeconds: number;
    lightSleep: number;
    lightSleepSeconds: number;
    remSleep: number;
    remSleepSeconds: number;
    awakeTime: number;
    awakeTimeSeconds: number;
    sleepScore: number;
  };
  hrv?: {
    weeklyAvg: number;
    lastNightAvg: number;
    lastNight5MinHigh: number;
    baseline: {
      lowUpper: number;
      balancedLower: number;
      balancedUpper: number;
    };
    status: string;
  };
  bodyMetrics?: {
    fitnessAge: number;
    vo2Max: number;
    weight: number;
    bodyFat: number;
  };
  activities: Array<{
    id?: string;
    name: string;
    type: string;
    startTime?: string;
    duration: number;
    calories: number;
    distance: number;
  }>;
  trainingType: 'none' | 'A' | 'S' | 'both';
  syncedAt?: string;
  syncTime?: string;
  isMock?: boolean;
  hasData?: boolean;
}

export default function GarminPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [garminDataList, setGarminDataList] = useState<GarminData[]>([]);
  const [isConfigured, setIsConfigured] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  useEffect(() => {
    console.log('[DEBUG] GarminPage: 组件已挂载');
    loadGarminData();
    
    // 启动自动同步调度器
    scheduler.setupDailySync();
    
    // 组件卸载时清理定时器
    return () => {
      scheduler.clearAllTimers();
    };
  }, []);

  const loadGarminData = async () => {
    try {
      setIsLoading(true);
      console.log('[DEBUG] GarminPage: 开始加载过去7天数据');
      
      // 获取过去7天的 Garmin 数据
      const response = await fetch('/api/garmin/sync?days=7');
      const result = await response.json();
      
      if (result.success && result.data && result.data.length > 0) {
        setGarminDataList(result.data);
        setIsConfigured(true);
        setLastSyncTime(result.last_sync);
        console.log('[DEBUG] GarminPage: 数据加载成功:', result.data);
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
    console.log('[DEBUG] GarminPage: 开始同步过去7天数据');
    setIsSyncing(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/garmin/sync?days=7&force=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setGarminDataList(result.data);
        setSuccess('Garmin 数据同步成功！');
        setIsConfigured(true);
        setLastSyncTime(result.last_sync);
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

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    if (hours > 0) {
      return `${hours}小时${mins}分钟`;
    }
    return `${mins}分钟`;
  };

  const formatSleepTime = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}小时${m}分钟`;
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (dateStr === today.toISOString().split('T')[0]) {
      return '今天';
    } else if (dateStr === yesterday.toISOString().split('T')[0]) {
      return '昨天';
    } else {
      return date.toLocaleDateString('zh-CN', { 
        month: 'long', 
        day: 'numeric',
        weekday: 'short'
      });
    }
  };

  // 获取体能年龄和HRV数据（从最新的数据中获取）
  const getLatestHealthMetrics = () => {
    const latestData = garminDataList.find(data => data.hasData && (data.bodyMetrics?.fitnessAge || data.hrv?.weeklyAvg));
    return {
      fitnessAge: latestData?.bodyMetrics?.fitnessAge || 0,
      hrv: latestData?.hrv || null
    };
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

  const { fitnessAge, hrv } = getLatestHealthMetrics();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="pt-16 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 页面标题 */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Garmin 健康数据
            </h1>
            <p className="text-gray-600">
              查看您的健康和运动数据，支持按日期查看过去7天记录
            </p>
          </div>

          {/* 同步按钮 */}
          <div className="mb-6">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? '同步中...' : '刷新数据'}
            </button>
          </div>

          {/* 错误和成功提示 */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-green-800">{success}</span>
              </div>
            </div>
          )}

          {garminDataList.length > 0 ? (
            <>
              {/* 顶部健康指标 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
                <div className="flex items-center gap-2 mb-6">
                  <Heart className="h-6 w-6 text-red-500" />
                  <h2 className="text-xl font-semibold text-gray-900">核心健康指标</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 体能年龄 */}
                  <div className="bg-red-50 p-6 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-red-800 mb-2">体能年龄</h3>
                        <div className="text-3xl font-bold text-red-600">
                          {fitnessAge > 0 ? `${fitnessAge} 岁` : '暂无数据'}
                        </div>
                      </div>
                      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                        <TrendingUp className="h-6 w-6 text-red-600" />
                      </div>
                    </div>
                  </div>

                  {/* HRV指标 */}
                  <div className="bg-blue-50 p-6 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-blue-800 mb-2">心率变异性 (HRV)</h3>
                        {hrv && hrv.weeklyAvg > 0 ? (
                          <div className="space-y-1">
                            <div className="text-2xl font-bold text-blue-600">
                              {hrv.weeklyAvg} ms
                            </div>
                            <div className="text-sm text-blue-600">
                              周平均 • 状态: {hrv.status}
                            </div>
                          </div>
                        ) : (
                          <div className="text-2xl font-bold text-blue-600">暂无数据</div>
                        )}
                      </div>
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Heart className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 按日期显示数据 */}
              <div className="space-y-6">
                {garminDataList.map((dayData, index) => (
                  <div key={dayData.syncDate} className="bg-white rounded-xl shadow-sm border border-gray-100">
                    {/* 日期标题 */}
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-5 w-5 text-blue-600" />
                          <h3 className="text-lg font-semibold text-gray-900">
                            {formatDate(dayData.syncDate)}
                          </h3>
                          <span className="text-sm text-gray-500">
                            {dayData.syncDate}
                          </span>
                        </div>
                        {dayData.isMock && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                            模拟数据
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-6">
                      {/* 基础数据 */}
                      <div className="mb-8">
                        <h4 className="text-md font-medium text-gray-900 mb-4">基础数据</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-orange-50 p-4 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-orange-600">总卡路里</p>
                                <p className="text-xl font-bold text-orange-700">
                                  {dayData.totalCalories}
                                </p>
                              </div>
                              <Flame className="h-6 w-6 text-orange-600" />
                            </div>
                          </div>

                          <div className="bg-green-50 p-4 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-green-600">步数</p>
                                <p className="text-xl font-bold text-green-700">
                                  {dayData.steps.toLocaleString()}
                                </p>
                              </div>
                              <Footprints className="h-6 w-6 text-green-600" />
                            </div>
                          </div>

                          <div className="bg-red-50 p-4 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-red-600">平均心率</p>
                                <p className="text-xl font-bold text-red-700">
                                  {dayData.heartRate.average || '--'}
                                </p>
                              </div>
                              <Heart className="h-6 w-6 text-red-600" />
                            </div>
                          </div>

                          <div className="bg-purple-50 p-4 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-purple-600">训练类型</p>
                                <p className="text-sm font-bold text-purple-700">
                                  {getTrainingTypeText(dayData.trainingType)}
                                </p>
                              </div>
                              <Target className="h-6 w-6 text-purple-600" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 活动记录 */}
                      <div className="mb-8">
                        <h4 className="text-md font-medium text-gray-900 mb-4">活动记录</h4>
                        {dayData.activities && dayData.activities.length > 0 ? (
                          <div className="grid gap-3">
                            {dayData.activities.map((activity, actIndex) => (
                              <div key={actIndex} className="bg-gray-50 p-4 rounded-lg">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <Activity className="h-5 w-5 text-blue-600" />
                                    <div>
                                      <h5 className="font-medium text-gray-900">{activity.name}</h5>
                                      <p className="text-sm text-gray-600">
                                        {formatDuration(activity.duration)} • {activity.calories} 卡路里
                                        {activity.distance > 0 && ` • ${activity.distance.toFixed(2)} 公里`}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-gray-500">
                            <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p>今天没有活动记录</p>
                          </div>
                        )}
                      </div>

                      {/* 睡眠分析 */}
                      {dayData.sleep && dayData.sleep.totalSleepTime > 0 && (
                        <div>
                          <h4 className="text-md font-medium text-gray-900 mb-4">睡眠分析</h4>
                          <div className="bg-indigo-50 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <Moon className="h-5 w-5 text-indigo-600" />
                                <div>
                                  <h5 className="font-medium text-indigo-800">睡眠质量</h5>
                                  <p className="text-2xl font-bold text-indigo-700">
                                    {formatSleepTime(dayData.sleep.totalSleepTime)}
                                  </p>
                                </div>
                              </div>
                              {dayData.sleep.sleepScore > 0 && (
                                <div className="text-right">
                                  <p className="text-sm text-indigo-600">睡眠评分</p>
                                  <p className="text-xl font-bold text-indigo-700">
                                    {dayData.sleep.sleepScore}/100
                                  </p>
                                </div>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-indigo-600">深度睡眠</p>
                                <p className="font-medium text-indigo-800">
                                  {formatSleepTime(dayData.sleep.deepSleep)}
                                </p>
                              </div>
                              <div>
                                <p className="text-indigo-600">浅度睡眠</p>
                                <p className="font-medium text-indigo-800">
                                  {formatSleepTime(dayData.sleep.lightSleep)}
                                </p>
                              </div>
                              <div>
                                <p className="text-indigo-600">REM睡眠</p>
                                <p className="font-medium text-indigo-800">
                                  {formatSleepTime(dayData.sleep.remSleep)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* 无数据状态 */
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="text-center py-12">
                <Activity className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">暂无同步数据</h3>
                <p className="text-gray-600 mb-6">
                  点击"刷新数据"按钮开始同步您的 Garmin 数据
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}