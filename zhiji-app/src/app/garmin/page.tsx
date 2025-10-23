'use client';

import { useState, useEffect } from 'react';
import { Activity, RefreshCw, Heart, Footprints, Zap, Clock, Target, TrendingUp, Calendar, AlertCircle, CheckCircle, Flame, Timer, Moon, Battery, Droplets, Wind, Scale, Gauge } from 'lucide-react';
import Navigation from '@/components/layout/navigation';
import { scheduler } from '@/lib/scheduler';

// 单日数据接口
interface DayData {
  date: string;
  totalCalories: number;
  activeCalories: number;
  bmrCalories: number;
  steps: number;
  activities: Array<{
    name: string;
    type: string;
    duration: number; // 持续时间（秒）
    calories: number;
    distance: number;
  }>;
  sleep: {
    totalSleepTime: number; // 总睡眠时间（分钟）
    deepSleep: number;
    lightSleep: number;
    remSleep: number;
    awakeTime: number;
    sleepScore: number;
    hrv: {
      lastNightAvg: number; // 昨夜平均HRV
      status: string;
    };
  };
}

interface GarminData {
  userId: string;
  syncDate: string;
  
  // 过去7天的每日汇总数据
  last7Days: Array<{
    date: string;
    totalCalories: number;
    activeCalories: number;
    bmrCalories: number; // 基础代谢卡路里
    steps: number;
  }>;
  
  // 当日活动列表
  activities: Array<{
    name: string;
    type: string;
    duration: number; // 持续时间（秒）
    calories: number; // 消耗卡路里
    distance: number; // 距离（公里）
  }>;
  
  // 当日睡眠数据
  sleep: {
    totalSleepTime: number; // 总睡眠时间（分钟）
    deepSleep: number; // 深度睡眠（分钟）
    lightSleep: number; // 浅度睡眠（分钟）
    remSleep: number; // REM睡眠（分钟）
    awakeTime: number; // 清醒时间（分钟）
    sleepScore: number; // 睡眠评分
    hrv: {
      lastNightAvg: number; // 昨夜平均HRV
      status: string;
    };
  };

  syncedAt: string;
}

export default function GarminPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [garminDataList, setGarminDataList] = useState<GarminData[]>([]);
  const [isConfigured, setIsConfigured] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [dailyData, setDailyData] = useState<DayData[]>([]);

  useEffect(() => {
    const loadExistingData = async () => {
      try {
        setIsLoading(true);
        console.log('[DEBUG] GarminPage: 开始加载已有数据');
        
        // 获取过去7天的已有数据（不强制同步）
        const response = await fetch('/api/garmin/sync?days=7&force=false');
        const result = await response.json();
        
        if (result.success && result.data && result.data.length > 0) {
          setGarminDataList(result.data);
          setIsConfigured(true);
          setLastSyncTime(result.last_sync);
          
          // 重新组织数据为按日期的格式
          const organizedData = organizeDataByDate(result.data);
          setDailyData(organizedData);
          
          console.log('[DEBUG] GarminPage: 已有数据加载成功:', result.data);
        } else {
          console.log('[DEBUG] GarminPage: 暂无已有数据');
          setIsConfigured(false);
        }
      } catch (error) {
        console.error('[ERROR] GarminPage: 数据加载失败:', error);
        setIsConfigured(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadExistingData();
    
    // 设置每日自动同步调度器
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
        
        // 重新组织数据为按日期的格式
        const organizedData = organizeDataByDate(result.data);
        setDailyData(organizedData);
        
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

  const organizeDataByDate = (rawData: GarminData[]): DayData[] => {
    // 生成过去7天的日期
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    return dates.map(date => {
      // 查找该日期的数据
      const dayDataFromRaw = rawData.find(data => 
        data.last7Days?.some(day => day.date === date)
      );
      
      const dayInfo = dayDataFromRaw?.last7Days?.find(day => day.date === date);
      
      // 查找该日期的活动和睡眠数据（通常在当天的数据中）
      const todayData = rawData.find(data => data.syncDate === date);
      
      return {
        date,
        totalCalories: dayInfo?.totalCalories || 0,
        activeCalories: dayInfo?.activeCalories || 0,
        bmrCalories: dayInfo?.bmrCalories || 0,
        steps: dayInfo?.steps || 0,
        activities: todayData?.activities || [],
        sleep: todayData?.sleep || {
          totalSleepTime: 0,
          deepSleep: 0,
          lightSleep: 0,
          remSleep: 0,
          awakeTime: 0,
          sleepScore: 0,
          hrv: {
            lastNightAvg: 0,
            status: 'unknown'
          }
        }
      };
    });
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
        
        // 重新组织数据为按日期的格式
        const organizedData = organizeDataByDate(result.data);
        setDailyData(organizedData);
        
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

  // 基础数据组件
  const BasicDataSection = ({ data }: { data: DayData }) => (
    <div className="mb-6">
      <h4 className="text-md font-medium text-gray-900 mb-4">基础数据</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {data.totalCalories}
              </div>
              <div className="text-sm text-blue-600">总卡路里消耗</div>
            </div>
            <Flame className="h-6 w-6 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {data.activeCalories}
              </div>
              <div className="text-sm text-orange-600">活动卡路里</div>
            </div>
            <Zap className="h-6 w-6 text-orange-600" />
          </div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {data.bmrCalories}
              </div>
              <div className="text-sm text-green-600">基础代谢卡路里</div>
            </div>
            <Battery className="h-6 w-6 text-green-600" />
          </div>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {data.steps.toLocaleString()}
              </div>
              <div className="text-sm text-purple-600">步数</div>
            </div>
            <Footprints className="h-6 w-6 text-purple-600" />
          </div>
        </div>
      </div>
    </div>
  );

  // 活动记录组件
  const ActivitySection = ({ activities }: { activities: DayData['activities'] }) => (
    <div className="mb-6">
      <h4 className="text-md font-medium text-gray-900 mb-4">活动记录</h4>
      {activities.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activities.map((activity, index) => (
            <div key={index} className="bg-indigo-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-medium text-indigo-800">{activity.name}</h5>
                <Activity className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="space-y-2 text-sm text-indigo-600">
                <div className="flex justify-between">
                  <span>活动类型</span>
                  <span>{activity.type}</span>
                </div>
                <div className="flex justify-between">
                  <span>持续时间</span>
                  <span>{Math.round(activity.duration / 60)} 分钟</span>
                </div>
                <div className="flex justify-between">
                  <span>消耗卡路里</span>
                  <span>{activity.calories}</span>
                </div>
                <div className="flex justify-between">
                  <span>距离</span>
                  <span>{activity.distance.toFixed(2)} km</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 p-6 rounded-lg text-center">
          <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">今日暂无活动记录</p>
        </div>
      )}
    </div>
  );

  // 睡眠分析组件
  const SleepSection = ({ sleep }: { sleep: DayData['sleep'] }) => (
    <div className="mb-6">
      <h4 className="text-md font-medium text-gray-900 mb-4">睡眠分析</h4>
      {sleep.totalSleepTime > 0 ? (
        <div className="bg-indigo-50 p-6 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-xl font-bold text-indigo-600">
                {Math.floor(sleep.totalSleepTime / 60)}h {sleep.totalSleepTime % 60}m
              </div>
              <div className="text-sm text-indigo-600">总睡眠时间</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-indigo-600">
                {sleep.deepSleep}m
              </div>
              <div className="text-sm text-indigo-600">深度睡眠时间</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-indigo-600">
                {sleep.lightSleep}m
              </div>
              <div className="text-sm text-indigo-600">浅度睡眠时间</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-indigo-600">
                {sleep.remSleep}m
              </div>
              <div className="text-sm text-indigo-600">REM睡眠时间</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-indigo-600">
                {sleep.awakeTime}m
              </div>
              <div className="text-sm text-indigo-600">清醒时间</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-indigo-600">
                {sleep.sleepScore}
              </div>
              <div className="text-sm text-indigo-600">睡眠评分</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 p-6 rounded-lg text-center">
          <Moon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">今日暂无睡眠数据</p>
        </div>
      )}
    </div>
  );

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

  const getLatestHealthMetrics = () => {
    if (garminDataList.length === 0) {
      return { hrv: null };
    }
    
    const latestData = garminDataList[0];
    return {
      hrv: latestData?.sleep?.hrv || null
    };
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
        weekday: 'long'
      });
    }
  };

  const getDateLabel = (dateStr: string, index: number) => {
    if (index === 0) return '今天';
    if (index === 1) return '昨天';
    if (index === 2) return '前天';
    return `第${index + 1}天前`;
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

  const { hrv } = getLatestHealthMetrics();

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

          {dailyData.length > 0 ? (
            <>
              {/* 顶部健康指标 - HRV */}
              <div className="mb-8">
                <div className="max-w-md">
                  {/* HRV指标 */}
                  <div className="bg-blue-50 p-6 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-blue-800 mb-2">HRV 昨晚平均值</h3>
                        {hrv && hrv.lastNightAvg > 0 ? (
                          <div className="space-y-1">
                            <div className="text-3xl font-bold text-blue-600">
                              {hrv.lastNightAvg} ms
                            </div>
                            <div className="text-sm text-blue-600">
                              状态: {hrv.status}
                            </div>
                          </div>
                        ) : (
                          <div className="text-3xl font-bold text-blue-600">暂无数据</div>
                        )}
                      </div>
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Heart className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 按日期显示7天数据 */}
              <div className="space-y-8">
                {dailyData.map((dayData, index) => (
                  <div key={dayData.date} className="bg-white rounded-xl shadow-sm border border-gray-100">
                    {/* 日期标题 */}
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-5 w-5 text-blue-600" />
                          <h3 className="text-xl font-semibold text-gray-900">
                            {getDateLabel(dayData.date, index)}
                          </h3>
                          <span className="text-sm text-gray-500">
                            {dayData.date}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-6">
                      {/* 基础数据 */}
                      <BasicDataSection data={dayData} />
                      
                      {/* 活动记录 */}
                      <ActivitySection activities={dayData.activities} />
                      
                      {/* 睡眠分析 */}
                      <SleepSection sleep={dayData.sleep} />
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