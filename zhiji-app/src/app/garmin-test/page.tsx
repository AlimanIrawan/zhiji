'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Calendar, Activity, Heart, Moon, Zap } from 'lucide-react';

interface GarminData {
  // 身体数据
  fitnessAge?: number;
  hrv?: {
    weeklyAvg: number;
    lastNightAvg: number;
    lastNight5MinHigh: number;
    baseline: number;
    status: string;
  };
  
  // 基础数据
  totalCalories: number;
  activeCalories: number;
  bmrCalories: number;
  steps: number;
  
  // 活动数据
  activities: Array<{
    name: string;
    type: string;
    duration: number;
    calories: number;
    distance: number;
  }>;
  
  // 睡眠数据
  sleep?: {
    totalSleepTimeSeconds: number;
    deepSleepSeconds: number;
    lightSleepSeconds: number;
    remSleepSeconds: number;
    awakeDurationSeconds: number;
    sleepScore: number;
  };
  
  syncTime: string;
}

export default function GarminTestPage() {
  const [data, setData] = useState<GarminData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const fetchGarminData = async () => {
    console.log('[Garmin Test] 获取数据，日期:', selectedDate);
    setLoading(true);
    setError(null);
    
    try {
      const apiUrl = `/api/garmin/sync?date=${selectedDate}`;
      console.log('[Garmin Test] 请求URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText}\n详细信息: ${errorText}`);
      }

      const result = await response.json();
      console.log('[Garmin Test] 获取到的数据:', result);
      setData(result.data);
    } catch (err) {
      console.error('[Garmin Test] 获取数据失败:', err);
      const errorMessage = err instanceof Error ? err.message : '获取数据失败';
      setError(`错误详情: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGarminData();
  }, [selectedDate]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}小时${minutes}分钟`;
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return hours > 0 ? `${hours}小时${mins}分钟` : `${mins}分钟`;
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Garmin 健康数据
        </h1>
        <p className="text-gray-600">
          查看您的健康和运动数据，支持按日期查看历史记录
        </p>
      </div>

      {/* 日期选择器 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center gap-4">
          <Calendar className="h-5 w-5 text-blue-600" />
          <label className="text-sm font-medium text-gray-700">
            选择日期
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button 
            onClick={fetchGarminData} 
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? '获取中...' : '刷新数据'}
          </button>
        </div>
      </div>

      {/* 错误显示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
          <div className="text-red-800">
            <strong>错误:</strong> {error}
          </div>
        </div>
      )}

      {/* 数据显示 */}
      {data && (
        <div className="grid gap-6">
          
          {/* 身体数据 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="h-5 w-5 text-red-500" />
              <h2 className="text-lg font-semibold text-gray-900">身体指标</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* 体能年龄 */}
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="font-medium text-red-800 mb-2">体能年龄</h3>
                <div className="text-2xl font-bold text-red-600">
                  {data.fitnessAge ? `${data.fitnessAge} 岁` : '暂无数据'}
                </div>
              </div>

              {/* HRV指标 */}
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="font-medium text-red-800 mb-2">心率变异性 (HRV)</h3>
                {data.hrv ? (
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">周平均:</span> {data.hrv.weeklyAvg} ms</div>
                    <div><span className="font-medium">昨夜平均:</span> {data.hrv.lastNightAvg} ms</div>
                    <div><span className="font-medium">状态:</span> {data.hrv.status}</div>
                  </div>
                ) : (
                  <div className="text-gray-500">暂无数据</div>
                )}
              </div>
            </div>
          </div>

          {/* 基础数据 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-900">基础数据</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <h3 className="font-medium text-blue-800 mb-1">总卡路里</h3>
                <div className="text-2xl font-bold text-blue-600">
                  {data.totalCalories?.toLocaleString() || 0}
                </div>
                <div className="text-xs text-blue-600">kcal</div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <h3 className="font-medium text-blue-800 mb-1">活动卡路里</h3>
                <div className="text-2xl font-bold text-blue-600">
                  {data.activeCalories?.toLocaleString() || 0}
                </div>
                <div className="text-xs text-blue-600">kcal</div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <h3 className="font-medium text-blue-800 mb-1">基础代谢</h3>
                <div className="text-2xl font-bold text-blue-600">
                  {data.bmrCalories?.toLocaleString() || 0}
                </div>
                <div className="text-xs text-blue-600">kcal</div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <h3 className="font-medium text-blue-800 mb-1">步数</h3>
                <div className="text-2xl font-bold text-blue-600">
                  {data.steps?.toLocaleString() || 0}
                </div>
                <div className="text-xs text-blue-600">步</div>
              </div>
            </div>
          </div>

          {/* 活动数据 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-green-500" />
              <h2 className="text-lg font-semibold text-gray-900">活动记录</h2>
              <span className="text-sm text-gray-500">({data.activities?.length || 0} 项活动)</span>
            </div>
            
            {data.activities && data.activities.length > 0 ? (
              <div className="space-y-3">
                {data.activities.map((activity, index) => (
                  <div key={index} className="bg-green-50 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-green-800">{activity.name}</h3>
                      <span className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded">
                        {activity.type}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">持续时间:</span>
                        <div className="font-medium">{formatDuration(activity.duration)}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">消耗卡路里:</span>
                        <div className="font-medium">{activity.calories} kcal</div>
                      </div>
                      <div>
                        <span className="text-gray-600">距离:</span>
                        <div className="font-medium">{activity.distance.toFixed(2)} km</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                今日暂无活动记录
              </div>
            )}
          </div>

          {/* 睡眠数据 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Moon className="h-5 w-5 text-purple-500" />
              <h2 className="text-lg font-semibold text-gray-900">睡眠分析</h2>
            </div>
            
            {data.sleep ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-medium text-purple-800 mb-2">总睡眠时间</h3>
                  <div className="text-2xl font-bold text-purple-600">
                    {formatTime(data.sleep.totalSleepTimeSeconds)}
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-medium text-purple-800 mb-2">深度睡眠</h3>
                  <div className="text-xl font-bold text-purple-600">
                    {formatTime(data.sleep.deepSleepSeconds)}
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-medium text-purple-800 mb-2">浅度睡眠</h3>
                  <div className="text-xl font-bold text-purple-600">
                    {formatTime(data.sleep.lightSleepSeconds)}
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-medium text-purple-800 mb-2">REM睡眠</h3>
                  <div className="text-xl font-bold text-purple-600">
                    {formatTime(data.sleep.remSleepSeconds)}
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-medium text-purple-800 mb-2">清醒时间</h3>
                  <div className="text-xl font-bold text-purple-600">
                    {formatTime(data.sleep.awakeDurationSeconds)}
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-medium text-purple-800 mb-2">睡眠评分</h3>
                  <div className="text-2xl font-bold text-purple-600">
                    {data.sleep.sleepScore}/100
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                暂无睡眠数据
              </div>
            )}
          </div>

          {/* 同步时间 */}
          <div className="text-center text-sm text-gray-500">
            数据同步时间: {new Date(data.syncTime).toLocaleString('zh-CN')}
          </div>
        </div>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-3 text-gray-600">正在获取 Garmin 数据...</span>
          </div>
        </div>
      )}

      {/* 无数据状态 */}
      {!loading && !data && !error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="text-center py-8 text-gray-500">
            选择日期后自动获取数据
          </div>
        </div>
      )}
    </div>
  );
}